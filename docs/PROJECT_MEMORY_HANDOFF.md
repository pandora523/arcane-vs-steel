# Arcane vs Steel — Project Memory & Session Handoff

> **IMPORTANT FOR ANY NEW CHAT / AGENT**: Read this file alongside `docs/CHAMPION_DEVELOPMENT_PLAYBOOK.md` and `docs/champion_pipeline_db.json` at the start of a new conversation so full project context, user preferences, protected champions, and recent reworks are preserved seamlessly.

## 1. Current Live Baseline (`main`, Cache-Bust `?v=30fps83`)
- **All 11 HD-2D 30fps Champions (`208x208` cells, `10 rows x 30 frames = 6240x2080` incl. Row 9 `VICTORY` Pose + `vfx` sheets + `128x128` portraits)** are live and verified on `main`.
- **Seamless 3D / 2.5D `4800px` 4-Realm Adventure Map + 360° Multi-Directional Movement (`src/adventure/AdventureMapRenderer.js`, `src/adventure/AdventureManager.js`, `src/entities/Monster.js`, `src/engine/PixelForge.js`)**:
  - **100% Seamless Infinite-Bleed 2.5D Adventure Map (`AdventureMapRenderer.js`, ZERO Stitched PNGs, ZERO Image Edges/Seams)**: Replaces stitched duel-stage PNGs (`0` `arena_*` blits) with a continuous 2.5D walkable causeway (`roadY: 436..686`, `10` perspective-foreshortened stone courses, upper retaining wall/balustrade, parallax mountain & realm silhouettes, live roadside braziers/lanterns, Zone IV Boss Sanctuary seal, and foreground abyssal escarpment) featuring `640px` `smoothstep` + pixel-clustered biome cross-grading across all 4 realms (*Grand Eclipse Causeway* -> *Whispering Starwood Crossing* -> *Sunken Bone-Bridge Necropolis* -> *Caldera Throne of the Black Pit*) plus full molten *Laywaste of Inferno* transformation (`infernoAlpha`).
  - **Full 360° 3D Movement (`UP / DOWN / LEFT / RIGHT`, `X: 80..4720`, `Z` / `groundY: 442..680`)**: Player, all monsters, pickups, telegraphs, pillars, decals, shadows, and per-entity floor reflections operate in true 2.5D space with `groundY` depth sorting, `0.93x..1.05x` perspective scaling, 3D monster pack flanking AI, 3D Z-lane melee/wave dodging, and smooth 2D `(camX, camY)` camera tracking.
  - **Mobile Touch-Screen Virtual Analog Joystick + Right-Side 7-Orb Skill Icon & Cooldown Cluster (`#adventure-controls`)**:
    - **Bottom-Left**: Full 360° 2D multi-touch virtual analog thumb joystick (`#adv-joystick-zone`, `#adv-joystick-base`, `#adv-joystick-knob`, `touch-action: none`) with 2D `(dx, dy)` knob translation, lit `.adv-joy-n/s/w/e` directional arrows, and desktop `WASD` / Arrow 3D movement (`Space` -> `Solar Vault`, `V / H` -> `Flame Ward`).
    - **Bottom-Right**: Non-overlapping circular Action-RPG orb cluster (`#adv-skill-cluster`) placing **all 7 hero actions** (`attack`, `dodge`, `skill`, `overdrive`, `ultimate`, `crouch`, `jump`) on the right side with crisp 28×28 selective-outlined 16-bit pixel-art `<canvas>` icons (`PixelForge.drawAdventureActionIcon`), radial `conic-gradient` cooldown/charge sweeps (`--cd-deg`), live countdown timers (`"3.2s"`), gauge readouts (`"45%"` -> `"MAX"` / `"ULT"`), hold-to-attack comboing, and independent `Vault` (`jumpCd`) vs `Blink` (`dodgeCooldown`) timers.
    - **Clean Mobile Viewport**: Hides the spectator `.hud-bottom` iron bar during active Adventure gameplay on mobile/touch (`#app.is-adventure-active .hud-bottom`) and provides a compact top utility pill (`AI: OFF/ON`, `RETRY`, `ROSTER`).
  - **Normal-Monster Visibility Guarantee (`Monster.js` + `Fighter.js` + `Suite 17`)**: `Monster` and `Fighter` explicitly preserve `this.heroId` (`'ghoul'`, `'cultist'`, `'brute'`, `'archfiend'`) so all normal wave enemies and overhead HP plates render immediately from frame 0 (`Suite 17` enforces `>= 20` finite `208x208` `drawImage` sprite blits per monster archetype and `0` stitched stage PNG blits).
  - **Test Hero Ignis Sol (`FireMage`, zero gameplay edits to `FireMage.js`)**: Full 360° manual touch joystick + right-side 7-orb cluster + 3D `WASD` keyboard controls + optional `[P]` Auto-Play AI toggle; `ArcaneShaderFX.overrideCenterWorldX` keeps 120Hz Solar Shaders crisp across all `4800px`.
  - **4 New HD-2D 30fps Monster & Boss Assets (`6240x1456`, `7x30 @ 208x208`, zero `ctx.rotate`)**: *Ashfang Ghoul* (`monster_ghoul_sheet.png`), *Void Cultist* (`monster_cultist_sheet.png`), *Obsidian Juggernaut* (`monster_brute_sheet.png`), and 3-phase Final Boss *Malphas, Archfiend of the Black Pit* (`boss_archfiend_sheet.png` + `128x128` `boss_archfiend_portrait.png`).
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
- **3-Animation Dynamic Normal Attack (`TRINITY OF THE WORLD-MAUL`, `Row 2 F00..F29`)**:
  - **3 genuinely distinct full-body martial animations** on Torgar's character model (with physical windup step-in):
    1. `F00..F09` (`OVERHEAD EARTH-SPLITTER SLAM`): Tall `-78°` vertical 2H hoist above his horned helm into a deep split-knee `+14°` floor smash + traveling `Row 0` Volcanic Earth-Spire Fissure Wave.
    2. `F10..F19` (`LEAPING SKY-BREAKER UPPERCUT`): Deep crouch `+20°` floor scoop into an airborne high-knee (`foot_y = 91`) `-68°` skyward uppercut + grounded `Row 2` Magma-Jade Pillar (`+1` Crucible Core).
    3. `F20..F29` (`BATTERING-RAM BACKSPIN FINISHER`): Lead-leg swap (`right_leg_behind = True`) & twisted torso coil into a wide split-lunge horizontal battering-ram punch + `khazadForgeAncestorAvatar` Guaranteed Crit + World-Breaker Temper + Seismic Altar Resonance.
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
  - **3-Variant Dynamic `Row 2` Melee Combo + Real Point-Blank Model Gap-Close**:
    1. `F00..F09`: Deep Split-Lunge Horizontal Plasma Cleave (`60..69`)
    2. `F10..F19`: Martial High-Knee Kick + Rising Dragon Upper-Slash (`70..79`)
    3. `F20..F29`: Crashing Split-Stance Overhead Fang Slam + Chakram Disc + Dual Funnel Convergence (`80..89`)
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

---

## 4. Automated Verification Suites (`scripts/tests/`)
Always run all 3 suites from `/home/antigravity/pandora523/arcane-vs-steel` before committing gameplay or VFX changes:
```bash
node scripts/tests/check_all_ult_shader_boxes.mjs
node scripts/tests/test_all_heroes_gameloop.mjs
node scripts/tests/benchmark_roster_balance.mjs
```
And whenever modifying `.js` / `.png` / `.css` / `index.html` assets, bump the cache-bust query string (`?v=30fps71` -> `?v=30fps72`, etc.) across `index.html`, `src/`, and `scripts/`.

## 5. Persistent Prior Session Reference
- Full prior session debug renders and logs are stored in the persistent `~/.gemini` volume at:
  `/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/3a4b2cf8-05c2-45a3-bb65-af6f5b5a1088/`
