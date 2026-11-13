# Arcane vs Steel — Project Memory & Session Handoff

> **IMPORTANT FOR ANY NEW CHAT / AGENT**: Read this file alongside `docs/CHAMPION_DEVELOPMENT_PLAYBOOK.md` and `docs/champion_pipeline_db.json` at the start of a new conversation so full project context, user preferences, protected champions, and recent reworks are preserved seamlessly.

### 1. Current Live Baseline (`main`, Cache-Bust `?v=30fps90`)
- **All 11 HD-2D 30fps Champions (`208x208` cells, `10 rows x 30 frames = 6240x2080` incl. Row 9 `VICTORY` Pose + `vfx` sheets + `128x128` portraits)** are live and verified on `main`.
- **11-Champion 4-Variant Main-Model Auto-Attack & Dynamic Visuals Overhaul (`?v=30fps90`)**:
  - **Unified 4-Animation `Row 2 AUTO_ATTACK` (`[[60, 8], [68, 7], [75, 8], [83, 7]]`) Across All 11 Champions (`scripts/hd2d_rig_core.py`, `scripts/build_*_30fps_sheet.py`, `assets/sprites/*_sheet.png`, `src/entities/*.js`)**:
    - Surgically rebuilt **ONLY `Row 2` (`AUTO_ATTACK`, `y = 416..624`)** via `splice_row2_auto_surgically` across the 10 remaining champions (`warrior`, `mage`, `ronin`, `valkyrie`, `reaper`, `priestess`, `archer`, `chronomancer`, `titan`, `android`) to match `icemage` (`Lyra`), giving **all 11 champions** 4 genuinely distinct full-body skeletal animations on their main character model (`F00..F07` [8f], `F08..F14` [7f], `F15..F22` [8f], `F23..F29` [7f]) while keeping `Rows 0..1` (incl. bipedal crossover `WALK`) and `Rows 3..9` **100% byte-for-byte identical** (`0/30` border clips, `29/29` distinct transitions, Seraphina strictly grounded `foot_y=99.0`, Torgar 100% slash-crescent-free).
    - Paired every main-model animation slice with deterministic `setState('AUTO_ATTACK')` variant latching (`_autoVariant = comboStep % 4`) and 4 distinct dynamic visual/combat payoffs (slashes, twin arcs, sky-pillars/javelins, piercing waves, phantom pincers, Fin-Funnel lasers, and ground-shattering finishers, `0` `ctx.rotate`) across both VS Mode and Adventure Mode.
- **11-Champion Bipedal Left/Right Crossover Walk Overhaul + Non-Blocking In-Game Pause Menu & 100% VS/Adventure UI Isolation (`?v=30fps89`)**:
  - **True Alternating Left+Right Bipedal Crossover `Row 1 WALK` Across All 11 Champions (`scripts/hd2d_rig_core.py`, `scripts/build_*_30fps_sheet.py`, `assets/sprites/*_sheet.png`, `src/engine/PixelForge.js`, `src/entities/Fighter.js`)**:
    - Surgically rebuilt **ONLY `Row 1` (`WALK`, `y = 208..416`)** across all 11 champions (`Row 0` and `Rows 2..9` verified 100% byte-for-byte identical to prior `HEAD`; `29/29` distinct transitions, `0/30` border clips, grounded stance soles at `y_208 = 199`).
    - Replaced wide split-stance crab-scuttling with `compute_bipedal_walk_pose`: neutralizes each hero's wide-stance rest bone angles, centers pelvic hip sockets with natural pelvic yaw while keeping waist coats/skirts/tassets anchored at full waist width, lifts & crosses the swinging leg (`F07` Left-Pass, `F22` Right-Pass) cleanly past the vertical planted stance leg (`F00` Right-Step -> `F15` Left-Step), and drives contralateral arm/weapon sway.
    - Reversed `Row 1` frame playback (`(30 - rawStep) % 30`) in `PixelForge.getFrameIndex` when `fighter.moveDir < 0` (eliminating backward moonwalking in VS Mode), removed duplicate pre-`super.update()` backward slides on `FireMage`/`Priestess`/`Archer`, and normalized walk cadence (`~30–34fps`) + step-synced `headBob` across VS & Adventure Mode.
  - **Compact In-Game Pause Button (`#btn-game-pause`) + Mode-Isolated Pause Modal (`#pause-modal`) & Zero Cross-Mode UI Leaks (`index.html`, `style.css`, `src/main.js`, `src/adventure/AdventureManager.js`)**:
    - Removed live view-blocking utility bars (`footer.hud-bottom` in VS Mode and floating `#adv-utility-bar` in Adventure Mode) from active gameplay and consolidated them inside a mode-isolated `#pause-modal` triggered via the compact top-crest `#btn-game-pause` (`⏸ PAUSE` + `#pause-sp-badge` unspent-SP pip) or `Escape`, freezing simulation (`this.isPaused = true`) while paused.
    - Strictly isolated `#pause-vs-section` (VS modes only) and `#pause-adv-section` (Adventure mode only), separated `vsTestModeUnlimitedHp` from Adventure Mode, isolated Step 02 (`#adv-stage-lock-banner`), Step 03 (`drawBossThreatIcon` + slot locking), and `#victory-overlay` (`onPlayerDeath()` telemetry + hidden `#btn-next-challenger`), and reset `renderer.camX = 600` on `stopCampaign()` / VS `resetMatch()`.
- **Adventure Mode v4 Streamlined 5-Orb Pure-Evade Controls & v2 Overhaul (`?v=30fps85..88`, ZERO Edits to VS Stats!)**:
  - **Simultaneous Multi-Touch Move-While-Attacking & Smooth Non-Steep 2.5D Joystick (`src/main.js`, `src/adventure/AdventureManager.js`, `style.css`)**:
    - Dedicated per-finger `TouchEvent` (`changedTouches` tracked by `touch.identifier`) + `PointerEvent` handling across `#adv-joystick-zone`, `#adv-btn-attack` (no premature `pointerleave` release), and `.adv-orb-btn` (`touch-action: none` on `#game-canvas` & `#adventure-controls`) so dragging the left joystick NEVER blocks right-side Attack/Skill taps or holds.
    - Ignis Sol strafes smoothly in 3D (`X` & `Z`) while casting `AUTO_ATTACK` (`0.78x` strafe speed) and seamlessly chains held basic attacks without locking movement for `0.96s`.
    - Replaced linear/steep joystick displacement with a progressive quadratic response curve (`deadzone = 0.15`, `curved = 0.20*u + 0.80*u*u`), subtle horizontal lane-keeping assist, exponential velocity smoothing, and foreshortened 2.5D Z-speed (`maxSpeedZ = 112 px/s` vs `maxSpeedX = 208 px/s`).
  - **Mobile Portrait Default (`mobileLandscapeEnabled = false`, `manifest.json` `"orientation": "any"`)**:
    - Mobile devices start in natural Portrait/device orientation by default (`⟳ LANDSCAPE: OFF`); full-bleed / CSS-rotated Landscape (`844x390`) remains one-tap opt-in via `#btn-mobile-landscape`, `#adv-btn-landscape`, or `?landscape=1`.
  - **Giant Left-Side Colossal Boss (`BEHEMOTH MALPHAS`, `assets/sprites/boss_colossus_sheet.png`, `src/entities/Monster.js`, `src/engine/Renderer.js`, `scripts/build_colossal_boss.py`)**:
    - Replaced the right-side humanoid boss with a screen-filling Colossal Abyssal Titan (`2048x512` = `4 × 512x512` HD-2D cells + `128x128` `boss_archfiend_portrait.png`, `0` `ctx.rotate`) anchored on the **LEFT side of Zone IV** (`x = 3865`, `facing = 1` RIGHT while Sol fights on the right `x >= 3990`, framed with `[0.44..0.68]` colossal boss camera zoom).
    - Features articulated Twin Siege-Claws raking upper/lower 3D lanes left-to-right, a falling Runic Siege-Fist sky-crush, Abyssal Jaw Hellfire fans, 3 escalating phases (`3900 HP`), and an **Exposed Molten Heart-Core (`+45% DMG`)** slump window.
  - **Isolated Adventure RPG Stats, Resource Charging & 3-Branch Skill Tree (`src/adventure/AdventureProgression.js`, `index.html`, `style.css`)**:
    - **100% VS Isolation**: `attachToFighter` / `detachFromFighter` leaves all VS (`1v1`, `2v2_brawl`, `2v2_tag`) stats (`FireMage` `3700 HP`, mana, finisher, cooldowns) completely untouched.
    - **Grounded Adventure Stats & Economy**: Starts at `Lv.1` (`1040 HP`, `50%` ATK / `54%` SKILL scaling, `4%` Ward DR, `1 SP`). **Skills (`PILLAR`)** spend **Solar Spirit** (`32` cost, generated by Basic hits `+12`, Wards/Dodges `+18`, Soul Embers `+14`, plus `-0.35s` Basic-hit CD shave); **Ultimate (`NOVA`)** starts at `0%` and charges ONLY via magnetic **`Soul Ember`** drops & Hit-Combos; **Super-Ultimate (`METEOR`)** starts at `0%` (`0/3 Seals`) and charges ONLY via **`Astral Relic Shards`** (`+34%` from Realm Clears, Elites, Boss Phase Breaks, and `+18%` Ultimate Resonance).
    - **XP Leveling (`Lv.1..10`) & Interactive Skill Tree Modal (`#adv-skill-tree-modal`, `[T]` hotkey)**: 3 branches × 3 tiers (`Solar Wrath` incl. Rank-2 Homing Seeker bolt, `Astral Awakening`, `Phoenix Aegis`) with live SP upgrades and full respec (`RESET SP`).
- **Ignis Sol 64×64 HD-2D Icon Remake (`assets/sprites/mage_icons.png`, `src/engine/PixelForge.js`, `scripts/build_sol_icons.py`)**:
  - Replaced old `28x28` blocky procedural `fillRect` icons across both Adventure Mode's 7 right-side orbs (`FIRE`, `PILLAR`, `NOVA`, `METEOR`, `BLINK`, `VAULT`, `WARD`) and Champion Select's 4 profile cards (`p1/p2-skill-icon-0..3`) with cel-flattened, curated 28-color Master Palette quantized, 2-pass despeckled `64x64` 16-bit RPG illustrations (`PixelForge.drawMageSheetIcon`, zero `ctx.rotate`).
- **Seamless 3D / 2.5D `4800px` 4-Realm Adventure Map + 360° Multi-Directional Movement (`src/adventure/AdventureMapRenderer.js`, `src/adventure/AdventureManager.js`, `src/entities/Monster.js`, `src/engine/PixelForge.js`)**:
  - **100% Seamless Infinite-Bleed 2.5D Adventure Map (`AdventureMapRenderer.js`, ZERO Stitched PNGs, ZERO Image Edges/Seams)**: Replaces stitched duel-stage PNGs (`0` `arena_*` blits) with a continuous 2.5D walkable causeway (`roadY: 436..686`), `640px` `smoothstep` + pixel-clustered biome cross-grading across all 4 realms, and molten *Laywaste of Inferno* transformation (`infernoAlpha`).
  - **Normal-Monster Visibility Guarantee (`Monster.js` + `Fighter.js` + `Suite 17`)**: `Monster` (`208x208` `ghoul`, `cultist`, `brute`) and `ArchfiendBoss` (`512x512` `archfiend`) preserve `this.heroId` so all wave enemies and the Left-Side Colossal Boss render from frame 0 (`Suite 17` enforces `>= 20` sprite blits per archetype and `0` `ctx.rotate`).
- **Stage Effects Overhaul & Ignis Sol `LAYWASTE OF INFERNO` Stage**:
  - All 6 stages (`cathedral`, `sylvan`, `boneyard`, `clocktower`, `sanctuary`, and Ignis Sol's `inferno` `LAYWASTE OF INFERNO`) feature parallax volumetric god-rays, near-camera `1.22x` foreground bokeh/ash/petal/feather depth layers, stage-aware floor reflections & seams, and bespoke phenomena (plus seamless 4-zone scrolling transitions in Adventure Mode).
  - Ignis Sol's `LAYWASTE OF INFERNO` (`src/engine/Renderer.js`, zero edits to protected `FireMage.js`) features a cached `640x360` animated magma/lava-river pixel overlay (`getInfernoMagmaLayer`), solar-corona caldera flares, pyroclastic ash plumes, branching molten floor fissures, and 52 rising spiral embers.
- **Per-Character Post-KO Victory Poses (`Row 9`, frames `270..299`)**:
  - Every surviving winner (plus unbenched `2v2_tag` teammates and Campaign Clear heroes) transitions into `state === 'VICTORY'`, playing a bespoke 15-frame entry flourish (`F00..F14`) into a seamless 15-frame sovereign loop (`F15..F29`) during the `1.35s` post-KO hold with zoomed victory camera framing.
- **Epic Battle HP Inflation & Ultimate Pacing**:
  - Champion HP pools are inflated (`3600–4160 HP`) so fights last ~`50–80s` in 1v1 (`~58s` in 2v2 Brawl, `~120s` in 2v2 Tag) and champions reliably cast **3 Overdrives (`ULTIMATE`)** to unlock and cast their **Supreme Ultimate (`TRUE_ULTIMATE`)** (`99.8%+` `TRUE_ULTIMATE` rate in 1v1 benchmarks).
  - Test Mode (`testModeUnlimitedHp`) supports infinite HP & rapid testing of Overdrives and Supreme Ultimates while excluding `isMonster` enemies so Adventure Mode monsters & bosses always take mortal damage.

---

## 2. User-Confirmed Protected Champions (DO NOT ALTER UNLESS EXPLICITLY ASKED)
The user explicitly confirmed that the following **6 champions are doing fine** — **do NOT modify their particles, VFX, Rows 0..8 animations, kits, or stats** unless the user specifically asks for a change to one of them (only global `?v=30fpsXX` cache-bust query bumps are allowed; their Row 9 `VICTORY` poses were appended at `y = 1872..2080` keeping `Rows 0..8` 100% byte-identical):
1. **Ignis Sol** (`src/entities/FireMage.js`, `heroId: 'mage'`) — switches stage to `LAYWASTE OF INFERNO` strictly on meteor ground impact (`t >= 3.22s`).
2. **Aethelgard** (`src/entities/Warrior.js`, `heroId: 'warrior'`) — `v4` 2H Greatsword rig + High-Sky Sacred Vow & Cathedral Pillar Supreme Ultimate.
3. **Freyja** (`src/entities/Valkyrie.js`, `heroId: 'valkyrie'`) — articulated multi-angle spear dives (`make_spear_dive_cfg`, zero canvas rotation/shear) + `TWILIGHT OF RAGNAROK: GUNGNIR`.
4. **Seraphina** (`src/entities/Priestess.js`, `heroId: 'priestess'`) — grounded Auto/Skill rig (Wing Vault `86px` preserved) + `FINAL GRACE` (`+30%` max HP heal + instant `740`-dmg holy beam at `t = 3.03s`).
5. **Kaze-Maru / Ronin** (`src/entities/Ronin.js`, `heroId: 'ronin'`) — `AMAKAKERU: THOUSAND THUNDER JUDGMENTS`.
6. **Chronos** (`src/entities/Chronomancer.js`, `heroId: 'chronomancer'`) — Twin Clock-Blade/Clone combo, Chrono-Schism Rewind, Mid-Air Time-Stop + `ETERNAL ZERO` Twelfth Bell Shatter (`680` dmg at `t = 3.53s`).

---

## 3. Recent Champion Reworks & Visual Clarity Rules

### Torgar (`src/entities/Titan.js`, `heroId: 'titan'`, v7 Slash-Free Symmetric Mjolnir, Horizontal Baseball-Bat Overdrive & Fast-Jump Soil/Rock Crater Splash Supreme Ultimate)
- **Symmetric Double-Faced Dwarven Warhammer (`Mjolnir`) & Zero Green-Orange Sword-Slash Crescents (`0/300` & `0/240` clips)**:
  - Rebuilt `draw_2h_worldbreaker_maul_104` (`scripts/build_titan_30fps_sheet.py`) and `drawColossalDwarvenWarhammer` (`src/engine/shaders/forgeShaders.js`) with a symmetric pinched anvil waist (`abs(dp)`), twin flared beveled striking faces, twin jade cheek runes, and radial outward handle-to-head geometry (`da` from inner grip to outer head).
  - Completely removed ALL green-orange sword-slash crescents (`slash_arc`, `horiz_bat_arc`, `forge_aegis`, `drawMultiLayerCrescentArc`, and `forgeHammerArc`) from `titan_sheet.png`, `titan_vfx.png` (`Row 0` now erupts 3 grounded Volcanic Basalt & Molten-Gold Earth-Spire Crags), `forgeShaders.js`, and `Titan.js` so blunt warhammer impacts read through grounded shockwave craters, molten anvil sparks, and shattered earth/rock splashes rather than blade slashes.
- **4-Animation Dynamic Normal Attack (`QUARTET OF THE WORLD-MAUL`, `Row 2 F00..F29`)**:
  - **4 genuinely distinct full-body martial animations** on Torgar's character model (with physical windup step-in, zero slash crescents):
    1. `F00..F07` (`OVERHEAD EARTH-SPLITTER SLAM`): Tall `-78°` vertical 2H hoist above his horned helm into a deep split-knee `+14°` floor smash + traveling `Row 0` Volcanic Earth-Spire Fissure Wave.
    2. `F08..F14` (`LEAPING SKY-BREAKER UPPERCUT`): Deep crouch `+20°` floor scoop into an airborne high-knee (`foot_y = 91`) `-68°` skyward uppercut + grounded `Row 2` Magma-Jade Pillar (`+1` Crucible Core).
    3. `F15..F22` (`POMMEL-RAM SEISMIC JAB`): Lead-leg swap & compact anvil-pommel gut/chest ram + focused molten anvil concussion shockwave & granite shrapnel burst.
    4. `F23..F29` (`BATTERING-RAM BACKSPIN FINISHER`): Twisted torso coil into a wide split-lunge horizontal battering-ram punch + `khazadForgeAncestorAvatar` Guaranteed Crit + World-Breaker Temper + Seismic Altar Resonance.
- **Horizontal Baseball-Bat Overdrive (`WORLD-BREAKER HOME RUN`, `Row 4 F00..F14`, `1.46s`)**:
  - Unobstructed rear-shoulder Baseball-Bat coil (`F00..F05`, cocked behind Torgar's helm so his face stays completely clear) into a slash-free chest-high horizontal Home-Run Grand-Slam (`F06..F10` + warm gold/white sonic air-compression wake), launching the enemy in a fast line-drive comet (`38px` arc) to the **farthest stage wall** and **stunning for `0.80s`**.
- **Supreme Ultimate (`GOD-HAMMER MJOLNIR: CONTINENTAL SUNDER`, `Row 4 F15..F29`, `3.80s` 4-Beat Choreography)**:
  - **Beat 1 (`0.00..0.62s`)**: Swells into his **HUGE `2.15x` Colossus Form** with an unobstructed silhouette (`F15..F16` deep floor-scoop coil, zero flanking crystal spikes).
  - **Beat 2 (`0.62..1.10s`)**: Planted firmly on `groundY`, rips a 2H Rising Sky-Uppercut (`F17..F19`, `cameraAirLift = 680`), **hammering and launching all active enemies UP into the sky** (`groundY - 210px`, `0` chip ticks).
  - **Beat 3 (`1.10..1.96s`)**: Compresses into a brief deep squat (`1.10..1.20s`, `F16`) and **explosively fast-jumps (`Super-Leap`, `1.20..1.56s`, `F20..F21`)** continuously from `groundY` up to `groundY - 380..390px` (`0` blink-teleport snapping, soil/pebble kickoff splash + crisp 2-ghost motion trail) cleanly ABOVE the airborne enemy before hoisting Mjolnir overhead (`1.56..1.96s`, `F22..F23`).
  - **Beat 4 (`1.96..2.36s`)**: Jackknifes downward (`F24..F26`), physically intercepts the airborne enemy mid-sky (`plungeU = 0.34`), and **meteor-spikes them straight into the arena floor** (`t = 2.36s`) for ONE `735`-Crit Continental Sunder + `+9%` Max HP heal + wide 2.5D **Soil, Dirt & Shattered Bedrock Crater Splash** (`Row 7` `continentalSunderGeyserCell` with `glowColor: 'none'` + `32` ballistic bouncing granite boulders & wet soil clods + `16` rolling dust plumes, zero vertical spike columns) + **`1.85s` Stun**.

### Sylvara (`src/entities/Archer.js`, `heroId: 'archer'`, v4 Ultimate & Supreme Ultimate Rework)
- **Baked 30fps `Row 4` Acrobatic Somersault & Far-Stage Yggdrasil Choreography (`scripts/build_archer_30fps_sheet.py`, `0/300` clips, `0` pinholes, `20/20` palette)**:
  - `F00..F02` (`120..122`): Explosive Gale Charge-In sprint + Twin Bow-Blade slash + Vault-Kick launch.
  - `F03..F13` (`123..133`): Full articulated `-48° -> -186° (true upside-down apex) -> -336°` airborne somersault (`centered_mode=True`, `shoulder_aim_ik=True`, `wing_follow_torso=True`, zero `ctx.rotate`) aiming her Celestial Greatbow downward around the 180° arc.
  - `F14..F15` (`134..135`): Agile opposite-side touchdown (`foot_y=99.0`).
  - `F16..F17` (`136..137`): Grounded Bow-Stave Earth-Root invocation (`bow_deg=+62°`) + `F18..F29` (`138..149`) Far-Stage Sovereign Winged Yggdrasil Greatbow Draw & Supernova Release.
- **Overdrive Ultimate (`ZEPHYR VAULT: 180° STARLOCK BARRAGE`)**:
  - Charges straight into the enemy (`0.00..0.32s`), delivers a `36`-dmg Gale Vault-Kick snapping `yggdrasilLockReticle` onto the foe, leaps and flips **180 degrees** overhead (`theta = 0 .. Math.PI`, `194px` height, flipping `facing` 180° at apex to land on the opposite side), and fires **7 radial Lock-On Homing Arrows** (`starlockHomingArrow`, `22°..158°`, `234` total dmg) inward around the 180° arc.
- **Supreme Ultimate (`ARROW OF YGGDRASIL: SUPERNOVA PIERCE`, `4.55s`)**:
  - Erupts 2.5D Elder-Wood Yggdrasil Thorn-Root Cages (`yggdrasilRootPrison` + Bramble Snare + Yggdrasil Seal) beneath all enemies (`0.03s`), hard-rooting them in place (`0.0px` drift, `0` pre-ticks).
  - Performs a high acrobatic flip-jump (`0.42..1.28s`, `188px` height) all the way to the **farthest edge of the stage** (`x = 108` or `ww - 108`, `492px–984px` away from the rooted enemy), turns across the arena, draws the colossal `280x280` `Row 6` Celestial Greatbow with a cross-stage Sagittarius aiming sightline, and fires the full-stage `Row 7` Supernova Dragon-Arrow Pierce (`700` Crit + `+14%` Max HP heal) at `t = 3.15s`.

### VEX-09 (`src/entities/Android.js`, `heroId: 'android'`, v3) & Roster-Wide Fighting Style AI Director (`src/entities/Fighter.js`)
- **Coiled Athletic Cyber-Valkyrie Rig (`scripts/build_android_30fps_sheet.py`, `0/300` clips, `29/29` transitions)**:
  - Deep hip/knee/ankle skeletal stances across all 10 rows (`IDLE` coiled Kamae, low-center thruster `WALK`/`DASH`, kneeling `CROUCH` Hex-Matrix Deflect, airborne `JUMP` Guillotine, `Row 9 VICTORY` Odachi salute) — zero rod-straight or stiff poses.
  - **4-Variant Dynamic `Row 2` Melee Combo + Real Point-Blank Model Gap-Close**:
    1. `F00..F07`: Deep Split-Lunge Horizontal Plasma Cleave (`60..67`)
    2. `F08..F14`: Martial High-Knee Kick + Rising Dragon Upper-Slash (`68..74`)
    3. `F15..F22`: Reverse-Grip Thruster Thrust + Dual Fin-Funnel Cross-Laser (`75..82`)
    4. `F23..F29`: Crashing Split-Stance Overhead Fang Slam + Chakram Disc + Funnel Convergence (`83..89`)
    - During windup (`u < 0.35`, before `didActionFrame`), VEX-09 physically thruster-glides her real `this.x` model right up to true point-blank blade contact (`~108px` from `enemy.x`) so she never swings into empty air.
- **Backward-Evade Visor Hyper-Laser Overdrive (`VALKYRIE VISOR HYPER-LASER`, `Row 4`)**:
  - **Phase 1 (`0.00..0.44s`, `F00..F07`)**: Physically thruster-leaps backward away from the enemy (`~215px` retreat + 3 holographic afterimages).
  - **Phase 2 (`0.44..0.72s`, `F08..F13`)**: Plants into a wide split-stance, touches her left fingers to her Visor temple, and locks her 4 Fin-Funnels into a **Quad Optical Amplifier Ring** framing her head.
  - **Phase 3 (`0.72..1.54s`, `F14..F24`)**: Fires searing `visorHyperLaserBeam` blasts directly from her **Face / Visor** `(this.x + facing*20, groundY - 134)` across the arena into the target, culminating in an overcharged Visor Supernova detonation.
- **Roster-Wide Fighting Style AI Director (`src/entities/Fighter.js`)**:
  - Gives all 11 champions (including the 6 protected champions via `super.update`, with zero edits to their class files) distinct `getAiStyleProfile()` martial personalities: reactive counter-reads (`CROUCH` parries/shields/hex-deflects/frost-mirrors/shadow-burrows & `JUMP` aerial escapes), full combo-string discipline, combo-finisher/whiff-punish `SKILL` windows, post-combo signature maneuvers, mid-range aerial engages, and expressive neutral footsies.

### Lyra (`src/entities/IceMage.js`, `heroId: 'icemage'`, v7 Low Coiled Figure-Skating Rig, 4-Variant Normal Attack & Crystal-Clear Supreme Ultimate)
- **Coiled Athletic Figure-Skating Rig (`scripts/build_icemage_30fps_sheet.py`, `6240x2080`, `0/300` clips, `0` inverted knees)**:
  - Eliminated steep vertical postures across `IDLE` (coiled skater Kamae), `WALK` (sweeping `±38°` cross-glide with `21°` lean), `DASH` (aerodynamic speed-skater), `CROUCH` (deep kneeling Mirror Wall), `JUMP` (Triple-Axel), and `Row 9 VICTORY` (pirouette into skyward Scepter salute), paired with sustained frictionless skate-glide velocity in `IceMage.js`.
- **Passive (`HOARFROST RIME & SOLID CRYSTAL STASIS`)**: Frost hits stack Hoarfrost Rime `[1..4]`; at `4` stacks triggers **`★ SOLID CRYSTAL FREEZE! ★`** — encasing the target inside a translucent `Row 6` Ice-Crystal Block (`0.40s` solid freeze stun), dealing crit shatter damage, and granting Lyra a Cryo Mirror Shield (`+12 HP`).
- **4-Variant Royal Figure-Skating Normal Attack (`Row 2`, `[[60, 8], [68, 7], [75, 8], [83, 7]]`)**:
  1. `F00..F07` (`60..67`, `RIME-LANCE SKATE LUNGE`): Deep fencing skate-lunge + Borealis `cryo_shard` comet & `cryoPrismMachCone`.
  2. `F08..F14` (`68..74`, `ARABESQUE HALO BOOMERANG`): High rear-leg Arabesque cross-glide + curved returning 6-bladed `Row 1` Snowflake Chakram (`+7 HP` on catch) + `snowflakeChakramBurst`.
  3. `F15..F22` (`75..82`, `GLACIER STALAGMITE SLAM`): 2H overhead hoist & wide-stance floor slam erupting `3` sequential ground-marching `Row 2` Glacier Spires (`spawnGlacierStalagmiteMarch`).
  4. `F23..F29` (`83..89`, `BOREALIS SKY-ICICLE HAIL`): Agile backward skate-hop & skyward Scepter command opening `borealisIcicleHail` overhead and raining `3` staggered diagonal Crystalline Sky-Icicle Lances (`activeSkyIcicles`, `0` `ctx.rotate` calls).
- **Signature Skill (`GLACIAL JAWS: TWIN ICEBERG CRUSH`, `Row 3`)**: Erupts TWO towering flanking `Row 2` Glacier Iceberg Walls (`±136px`) around the enemy and slams both icebergs inward together (`spread -> 16px`, `+2` Rime).
- **Overdrive Ultimate (`WINTER CORONATION: SEVEN CELESTIAL ICE-SWORDS`, `Row 4`)**: Summons `7` Giant Celestial Ice-Claymores (`Row 4`) in a Coronation Halo; `6` outer swords plunge down sequentially to impale the floor in a hexagonal sword palisade before a colossal `7th` Sovereign Crown-Sword shatters all `7` swords.
- **Supreme Ultimate (`ABSOLUTE ZERO: DIAMOND DUST ETERNITY`, `4.60s`, Zero Dark-Bluish Artifacts)**: Uses a viewport-seamless translucent Borealis sky wash (`-2400..ww+2400`, `alpha <= 0.18`), edge-tapered Northern Lights ribbons, feathered Crystal Frost-Mirror floor, grounded `absoluteZeroAuroraVeil`, refractive translucent crystal `Row 5/6/7` VFX cells (`glacialShaders.js` & `icemage_vfx.png`), frameless `0.00 K • -273.15°C` crystal readout, and **`28` faceted crystal glass shards** (`0` `ctx.rotate` calls) for a single instantaneous **`675` Crit execution** + **`+12%` Max HP heal**.

### Malakor (`src/entities/Reaper.js`, `heroId: 'reaper'`, v6)
- **Shadow-Burrow Ambush (`CROUCH`)**: Malakor sinks completely underground for ~`1.27s` (`1–2s` window) leaving a dark abyssal ground indicator vortex (`abyssalRiftGroundPortal` + dark tell ring) before erupting upward in a surprise scythe ambush.
- **High-Impact Overdrive (`ULTIMATE`)**: Sky-Lock ambush combo + `Thanatos Stand` & `4` Wraith Clones.
- **Supreme Ultimate (`MEMENTO MORI: OBLIVION GUILLOTINE` + Death Covenant Companions)**:
  - Delivers the `720`-crit Oblivion Guillotine execution and summons **two targetable Death Companions** (`assets/sprites/reaper_companions.png`) for **`12.5s`** with fortified survivability:
    1. **Herald of Oblivion (Death-Mage)**: `480 HP + 60 Soul Ward`, casts homing dark-magic orbs at enemies.
    2. **Soul-Weaver (Healer)**: `420 HP + 50 Soul Ward`, channels an emerald-necrotic mend tether healing the Death-Mage (and granting Covenant Grace sustain to Malakor).

### Combat Particle & VFX Readability (`?v=30fps73`)
- Avoid excessive particle spam, per-frame walk/idle dust, or stacked high-alpha `globalCompositeOperation = 'lighter'` passes (`keep additive bloom <= 0.16–0.22`) so pixel-art silhouettes and combat telegraphs remain sharp.
- `Fighter.js` and `VFXManager.js` include `isDeclutteredHero` (`titan`, `reaper`, `archer`, `icemage`, `android`) gates so those 5 heroes stay visually clean while leaving the 6 protected heroes 100% untouched.

### Adventure Mode v6 (`?v=30fps88` — Streamlined 5-Button Action Cluster, 100% Pure Non-Attacking 360° 3D Evade Dash, Authentic Champion Themes & Brisk 3D Walk Speed)
- **Streamlined 5-Button Right-Side Action Cluster (`index.html`, `style.css`, `src/main.js`, `src/adventure/AdventureManager.js`)**:
  - Removed `#adv-btn-crouch` and `#adv-btn-jump` from Adventure Mode, keeping **5 spacious, non-crowded circular orbs** in `#adv-skill-cluster`: `#adv-btn-attack` (`76x76` primary anchor), `#adv-btn-dodge` (`56x56` pure 3D evade `[L / Shift / Space]`), `#adv-btn-skill` (`58x58` Spirit skill `[K / X]`), `#adv-btn-overdrive` (`58x58` Soul Ember Overdrive `[U / Q]`), and `#adv-btn-ultimate` (`60x60` Astral Relic Supreme Ultimate `[I / E]`).
- **100% Pure Non-Attacking 360° 3D Evade Dash in Adventure Mode (`src/adventure/AdventureManager.js`, `src/entities/Fighter.js`, `src/entities/IceMage.js`)**:
  - Pressing Dodge in Adventure Mode triggers `player._advPureDodge = true` (`0.28s` invulnerable `Row 8` `DODGE` dash along any 360° joystick/WASD `X`/`Z` vector or away from nearby monsters, `+18` Solar Spirit, instant reactive cancel out of `AUTO_ATTACK`), bypassing `onStartDodge` and `updateDashOrDodge` so **ZERO** projectiles, **ZERO** explosive decoys/traps, and **ZERO** damage are ever emitted by Dodge (`Suite 17E` enforces `0` projectiles, `0` decoys, and `0` damage across all 11 champions, while VS Mode dodges/jumps/crouches stay 100% untouched).
- **100% Authentic VS Mode Champion Themes, Shaders & Choreography in Adventure Mode (`src/adventure/AdventureSkillSets.js`, `src/entities/Monster.js`, `src/engine/VFXManager.js`, `src/entities/Titan.js`, `src/entities/Archer.js`, `src/entities/Android.js`, `src/entities/Reaper.js`, `src/entities/IceMage.js`)**:
  - **NEVER replace champion combat methods (`updateAutoAttack`, `updateSkill`, `updateUltimate`, `updateTrueUltimate`) with generic Adventure moves** — the user explicitly rejected generic replacement kits because they kill each champion's theme and fighting identity.
  - `AdventureSkillSets` operates as a **100% non-invasive external 2.5D Adventure Combat Adapter** (`0` method overrides on `Fighter`, `0` gameplay edits to the 6 Protected Champions):
    - Every champion executes 100% of their real VS animations, `ArcaneShaderFX` (`this.fx`) shaders (`overrideCenterWorldX` synced to camera/player X), and signature constructs on Attack, Skill, Overdrive, and Super Ultimate.
    - **Frame-Deduplicated 2.5D Multi-Lane Pack Cleave (`Monster.takeDamage` -> `skillSets.onDirectMonsterHit`)**: Any direct hit from a champion's authentic attack, projectile, stand, companion, funnel, or shader strike splashes nearby multi-lane pack monsters (`75%–90%` cleave across `X` & `Z` lanes) without affecting VS Mode.
    - **Active Zone Bounds & Left-Side Colossal Boss (`BEHEMOTH MALPHAS`, `x = 3865`) Adaptation**: Clamps hero movement waypoints and ricochet/vault/coffin/altar coordinates inside `adventure.getActiveStageBounds()`, guards `!isColossalBoss` on displacement/pull/sky-hoist effects, widens Colossal Boss melee reach (`minWalkX = 3945`, `bossEntryX = 3985`), and temporarily aligns `boss.y = player.groundY` during `player.update` so all 11 champions connect cleanly from any 3D lane (`groundY: 442..680`).
- **Brisk 3D Obstacle-Dodging Walk Speed & Proportional Stride Cadence (`src/adventure/AdventureManager.js`, `src/entities/Fighter.js`)**:
  - Manual 3D horizontal walk speed (`maxSpeedX = 276 * moveSpeedMult`), 2.5D depth-lane dodge speed (`maxSpeedZ = 156 * moveSpeedMult`), and acceleration responsiveness (`smoothAlpha = dt * 20..28`) pair with matched `walkPhase` cadence (`2.2 + 3.6 * spdRatio`), enabling crisp dodging of monster floor telegraphs and Colossal Boss Siege Corridors while keeping gentle micro-tilts smooth.
- **Zero Camera Zoom on Mobile Landscape (`src/engine/Renderer.js`) & All-11-Champion Roster Select (`src/main.js`)**:
  - `renderer.isMobileLandscape` locks `this.zoom = this.getMobileLandscapeFixedZoom(false)` (`~0.55x` wide fit on `844x390`) with zero dynamic zoom drift; Champion Select displays each champion's authentic kit on `#profile-left` and `BEHEMOTH MALPHAS` on `#profile-right`.

---

## 4. Automated Verification Suites (`scripts/tests/`)
Always run all 3 suites from `/home/antigravity/pandora523/arcane-vs-steel` before committing gameplay or VFX changes:
```bash
node scripts/tests/check_all_ult_shader_boxes.mjs
node scripts/tests/test_all_heroes_gameloop.mjs
node scripts/tests/benchmark_roster_balance.mjs
```
And whenever modifying `.js` / `.png` / `.css` / `index.html` assets, bump the cache-bust query string (`?v=30fps85` -> `?v=30fps86`, etc.) across `index.html`, `src/`, and `scripts/`.

## 5. Persistent Prior Session Reference
- Full prior session debug renders and logs are stored in the persistent `~/.gemini` volume at:
  `/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/3a4b2cf8-05c2-45a3-bb65-af6f5b5a1088/`
