# Next-Gen 2D Action-RPG Sprite & Hack-and-Slash Animation R&D Specification

**Status**: Authoritative R&D Reference & Production Pipeline Specification (`v30fps113+`)  
**Scope**: Quantitative Reverse-Engineering of Master-Tier 2D Pixel Action-RPGs (*Final Fantasy Brave Exvius*, *Last Cloudia*, *Grand Summoners*, *BlazBlue / Guilty Gear / Valkyrie Profile*) and Concrete Specification for the **Wide-Canvas (`320x240`) Multi-Keypose + 1-Frame Snap Smear + Hit-Stop Chaining Pipeline** (Debuting on `warrior_ex` — **AETHELGARD EX**).  
**Coexistence Policy**: Preserves `docs/CHAMPION_DEVELOPMENT_PLAYBOOK.md`, `scripts/hd2d_rig_core.py`, and all 11 existing `208x208` champions (`warrior` / `Aethelgard` included) 100% intact. Zero Unicode emojis or dingbats anywhere.

---

## 1. Quantitative Pixel-by-Pixel Breakdown of the Reference *Final Fantasy Brave Exvius* (`FFBE`) Greatsword Combo Sheet

A direct RGBA byte-level inspection was performed on the 15-frame *Final Fantasy Brave Exvius* (`FFBE`, Alim / Square Enix) Crimson Saber Rain two-hit greatsword combo sheet (`461 x 534 px`, `PNG color_type = 6` RGBA).

### 1.1 Grid Geometry, Aspect Ratio, and Asymmetric Anchor Placement

* **Sheet Layout**: `3 columns x 5 rows = 15 frames` separated by `1px` black grid lines at `x = [153, 307]` and `y = [105, 211, 317, 423]`.
* **Cell Dimensions**:
  * Rows 0..3 (`Frames 1..12`): **`153 x 105 px`** (`1.457 : 1` wide landscape aspect ratio).
  * Row 4 (`Frames 13..15`): **`153 x 110 px`** (`1.391 : 1` wide landscape aspect ratio).
* **Facing & Anchor Asymmetry**:
  * In *FFBE*, player party units stand on the right side of the screen facing **Left (`-X`)**, meaning forward attack reach extends toward `x = 0` and rear windup coil extends toward `x = 152`.
  * Ground shadow center (`anchorX` in `-X` cell coordinates): **`cx = 100.4..104.3 px`** on `Frames 1..8` and **`cx = 94.1..96.1 px`** on `Frames 9..15` (stepping `~8 px` forward into the second slash).
  * Planted boot baseline (`anchorY`): **`y = 82..90 px`** (`~82.9%` down from the top of the `105 px` cell).
  * **Horizontal Space Allocation**: **`~100 px` (`65.4%` of cell width)** is reserved **in front** of the character's spine for greatsword extension and crescent smears, while **`~53 px` (`34.6%` of cell width)** sits **behind** the spine for rear sword cocking and flaring coattails.
  * **Standing Body-to-Cell Ratio**:
    * Coiled upright head-to-boot height (`Frames 1..4`): **`48 px`** (`hair_top = 34`, `boot_bot = 81`) = **`45.7%` of cell height**, leaving **`34 px` (`32.4%`)** of open sky above the character's head and **`23 px`** below/around the ground plane for low-sweeping blade tips (`y = 101..102`).
    * Compressed forward-lunge height (`Frames 5..8`): **`35 px`** (`hair_top = 48`, `boot_bot = 82`) = **`33.3%` of cell height** — an explosive **`-27.1%` vertical spine drop (`+14 px` downward head compression)** in a single frame.

### 1.2 Exact 15-Frame Quantitative Metrics Table

*(Note: `FG` = all non-shadow foreground character + weapon + smear pixels; `FrontSmearPx` = warm gold/amber/ivory smear + blade pixels in the forward zone `x < 95`; `LeftZone(x<85)` separates fully opaque `alpha >= 245` pixels from graded-alpha `alpha < 245` smear trail pixels.)*

| Frame | Grid `(R,C)` | Cell (`WxH`) | Phase & Anatomical Action | `FG` BBox (`x0..x1`, `y0..y1`) | `FG` Size (`WxH`) | Total `FG` Pixels | Body Height (`px`) | Stance Width (`px`) | `LeftZone (x<85)` Opaque / Graded | Dominant Forward Smear / Blade Hex Colors |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F01** | `(0,0)` | `153x105` | **Beat 1 Windup Hold 1**: Coiled spring, chest open, greatsword cocked `~138 deg` behind back | `78..147`, `31..86` | `70x56` | `1,917` | `48` | `8` (coiled) | `68` / `0` | `#fcd670`, `#f9edd6` (coat/trim) |
| **F02** | `(0,1)` | `153x105` | **Beat 1 Windup Hold 2**: Living tension boil (`+7 px` micro-shift in coat/hilt) | `78..147`, `31..86` | `70x56` | `1,924` | `48` | `8` (coiled) | `75` / `0` | `#fcd670`, `#f9edd6` |
| **F03** | `(0,2)` | `153x105` | **Beat 1 Windup Hold 3**: Peak coil (`x0` shifts `1px` forward, rear blade primed) | `77..147`, `31..86` | `71x56` | `1,932` | `48` | `8` (coiled) | `69` / `0` | `#fcd670`, `#f9edd6` |
| **F04** | `(1,0)` | `153x105` | **Beat 1 Pre-Snap Compression**: `1px` downward sink (`y: 31->32`, `86->87`) right before release | `78..147`, `32..87` | `70x56` | `1,895` | `48` | `8` (coiled) | `65` / `0` | `#fcd670`, `#f9edd6` |
| **F05** | `(1,1)` | `153x105` | **Beat 1 1-FRAME SNAP + SMEAR**: Zero intermediate sword tween; `-27%` crouch-lunge + `~220 deg` crescent smear fan (`x0 = 11`, `y = 10..101`) | `11..123`, `10..101` | **`113x92`** | **`5,214`** (`2.75x`) | **`35`** | `15` -> `37` | `271` / **`3,958`** | `#f1a446`, `#e6ab47`, `#e4c472`, `#ffc554`, `#d69149` |
| **F06** | `(1,2)` | `153x105` | **Beat 1 Smear Erosion 1**: Upper smear tail (`y: 10..44`) evaporates; lower-belly crescent hugs planted blade | `15..125`, `45..101` | `111x57` | `2,620` | `35` | `37` (planted) | `173` / `1,215` | `#fdef8c`, `#fcd670`, `#fed063`, `#ecb9b9` |
| **F07** | `(2,0)` | `153x105` | **Beat 1 Smear Erosion 2 + Overshoot**: Blade tip dips to `y = 102` (heavy steel weight); thin tip wisps trail | `38..128`, `47..102` | `91x56` | `1,656` | `39` | `37` (planted) | `175` / `387` | `#fcd670`, `#f0caca`, `#ffc554`, `#fcea96` |
| **F08** | `(2,1)` | `153x105` | **Beat 1 Clean Follow-Through Hold**: Zero smear (`FG = 1,318 px`); blade locked low-front (`y = 94..102`) | `63..127`, `47..102` | `65x56` | `1,318` | `35` | `39` (planted) | `182` / `120` | `#ecb9b9`, `#e3b1b9` (solid blade) |
| **F09** | `(2,2)` | `153x105` | **Beat 2 1-FRAME REVERSE SNAP**: Instant upward cleave from `F08` (`0` reset to idle!) + `x0 = 5` upper-hemisphere smear (`3.47x` pixel jump) | `5..121`, `21..90` | **`117x70`** | **`4,568`** (`3.47x`) | `37` (head) | `37` (`-8px` step) | `744` / **`3,248`** | `#e19841`, `#dba142`, `#f0b84d`, `#fef18b`, `#ffd162` |
| **F10** | `(3,0)` | `153x105` | **Beat 2 Smear Erosion 1**: Lower smear belly clears; fierce high-arching golden crest trails overhead blade | `7..122`, `22..89` | `116x68` | `2,103` | `37` | `37` (planted) | `658` / `807` | `#e29c41`, `#fed063`, `#fdef8c`, `#ecb9b9` |
| **F11** | `(3,1)` | `153x105` | **Beat 2 Smear Erosion 2**: Thin golden-ivory tip ribbon peels off blade tip; coattails hit max rear whip | `11..122`, `22..89` | `112x68` | `1,944` | `37` | `37` (planted) | `635` / `562` | `#ffc554`, `#f9df8b`, `#f1a446`, `#fef18c` |
| **F12** | `(3,2)` | `153x105` | **Beat 2 Heroic High-Guard Settle 1**: Smear cleared; solid greatsword held diagonally skyward (`y = 22`) | `40..121`, `22..89` | `82x68` | `1,649` | `37` | `37` (planted) | `629` / `209` | `#ecb9b9`, `#e3b1b9` (solid blade) |
| **F13** | `(4,0)` | `153x110` | **Beat 2 Settle 2 (Cloth Overlap)**: Coat hem & waist sash decelerate downward (`1px` settle) | `40..121`, `23..90` | `82x68` | `1,638` | `37` | `37` (planted) | `626` / `209` | `#ecb9b9`, `#e3b1b9` |
| **F14** | `(4,1)` | `153x110` | **Beat 2 Settle 3 (Blade Shimmer)**: Runic fuller pulse (`#ecb9b9 -> #f0caca`) across motionless stance | `40..122`, `23..90` | `83x68` | `1,670` | `37` | `37` (planted) | `632` / `207` | `#f0caca`, `#e5c1c9` |
| **F15** | `(4,2)` | `153x110` | **Beat 2 Settle 4 (Peak Specular Gleam)**: Brightest fuller pulse (`#f4dada`) ready to cancel or return to idle | `41..122`, `23..90` | `82x68` | `1,664` | `37` | `37` (planted) | `631` / `209` | `#f4dada`, `#e8d0d9` |

### 1.3 Five Core Visual Laws Extracted from the *FFBE* Sheet

1. **Zero Linear Sword In-Betweens on Strike Release (`F04 -> F05` and `F08 -> F09`)**:
   * Between `F04` (`+138 deg` rear-cocked sword) and `F05` (`-150 deg` low-front cleave), there are **zero intermediate frames showing an unblurred sword halfway through the air**. The blade teleports across `~220 deg` in **1 single frame (`33.3 ms` at 30fps)**, and the massive crescent smear fan bridges the two extremes so the human visual cortex perceives blinding speed and colossal mass simultaneously.
2. **Whole-Body Anatomical Pose Swap (3D Torso Twist + `-27%` Spine Drop)**:
   * `F04 -> F05` is not an arm rotation on a static torso. Rain's head drops `+14 px`, his torso twists `~90 deg` from chest-open windup into rear-shoulder-forward lunge, his stance widens from `8 px` coiled legs to `37 px` planted split-lunge, and his crimson coattails whip in the opposite direction (`x = 123`) as counter-balance.
3. **Asymmetric 4-Band Serrated Smear Anatomy (Not a Uniform Geometric Ring)**:
   * **Outer Perimeter Rim**: High-saturation sun-gold and warm amber (`#ffc554`, `#f1a446`, `#e6ab47`) hugging the convex outer arc where tangential velocity $v = \omega r$ is highest.
   * **Sweet-Spot Belly**: Thickest radial chord (`~32–40%` of cell width) directly in front of the character (`x = 11..48` on `F05`, `x = 5..46` on `F09`), shaded in honey-ivory (`#e4c472`, `#f9edd6`).
   * **Concave Serrated Inner Edge**: Sawtooth wind-rip cutouts biting along the inner chord rather than a smooth compass circle, conveying violent air shear.
   * **Tail-to-Tip Erosion (`3` Frames)**: Instead of fading the entire smear uniformly in opacity, the smear **shortens angularly from tail to tip** (`220 deg` on `F05` -> `95 deg` on `F06` -> `35 deg` tip wisps on `F07` -> `0 deg` crisp solid sword on `F08`).
4. **Zero-Idle Posture Chaining (`F08 -> F09`)**:
   * `F08` holds the heavy sword low in front (`y = 94..102`) with zero smear for `1` frame so the eye registers the completed downward weight. `F09` then fires the reverse upward cleave **directly from `F08`'s low sword position** without ever passing through neutral `IDLE`.
5. **Planted Boots During Active Slash & Erosion (`F05..F08` and `F09..F15`)**:
   * Once the snap lands (`F05` and `F09`), the character's boots lock firmly to the ground (`stance x = 84..120` across `F06..F08`; `stance x = 76..112` across `F09..F15`). Forward translation happens **before/into** the snap (`cx: 103.3 -> 95.8`), never as floaty ice-skating after the blade has already swung.

---

## 2. Industry Architecture & Master Pixel-Art Reference Survey

### 2.1 *Final Fantasy Brave Exvius* (Alim / Square Enix) — `.cgg` / `.cgs` Modular Keypose & Smear Architecture

* **Primary Reference Archives**:
  * *The Spriters Resource — Final Fantasy Brave Exvius Archive*: `https://www.spriters-resource.com/mobile/finalfantasybraveexvius/`
  * *Rain (Base / Awakened / Neo Vision Sheets)*: `https://www.spriters-resource.com/mobile/finalfantasybraveexvius/sheet/98136/`
  * *Lasswell (Base / Awakened / Neo Vision Sheets)*: `https://www.spriters-resource.com/mobile/finalfantasybraveexvius/sheet/98144/`
  * *Community `.cgg`/`.cgs` Format Documentation & Assemblers (`FFBETool` / `ffbetool`)*: `https://www.vg-resource.com/` and `https://luminest.io/`
* **Technical Architecture**:
  * Alim's 2D unit engine packs discrete hand-pixelled body stances, multi-angle weapon sprites, capes, and dedicated hand-drawn slash-smear crescents into `*-anime-.png` atlases indexed by **`.cgg` (Character Graphics Grid)** part coordinate/pivot CSV tables and sequenced by **`.cgs` (Character Graphics Script)** frame-by-frame timeline scripts (one `.cgs` per state: `idle`, `move`, `atk`, `limit`, `win`).
  * Crucially, Alim **does not** rotate a single standing torso sprite across `180 deg` with linear bone interpolation. Instead, `.cgs` scripts **swap discrete redrawn torso/limb stances** at key posture inflection points (coiled windup torso -> deep crouched forward torso -> high-follow-through torso) while compositing **bespoke wide-arc smear sprites** on the exact 1-frame strike transitions.

### 2.2 *Last Cloudia* (AIDIS) — High-Tempo 2.5D Hack-and-Slash Feel, Multi-Hit Rhythm & Hit-Stop

* **Primary Reference Sources**:
  * *AIDIS Official Behind-the-Scenes ("Pixel Art Production!" & Developer Artist Breakdowns)*: `https://www.lastcloudia.com/` and official AIDIS developer production features on YouTube/Reddit (`r/lastcloudia`).
* **How *Last Cloudia* (`Kyle`, `Beyland`, `Roland`) Achieves Visceral Action-RPG Slash Weight**:
  1. **4-Stage Pixel Production Discipline**: AIDIS establishes a strict Base Sprite benchmark (palette, silhouette, light direction), storyboards **Sprite Roughs** strictly around extreme momentum silhouettes and frame counts before touching armor details, enforces **"Bright Foreground / Dark Background"** contrast so flat 2D sprites pop with 3D volume against dark/atmospheric stages, and pairs baked pixel smears with additive/cel VFX bursts.
  2. **Impulse-Step -> Planted Multi-Hit Flurry**: Units like *Kyle* (ardent greatsword wide sweeps), *Beyland* (razor single-katana iai & cross-cuts), and *Roland* (authoritative paladin greatsword/holy plunges) close melee gap with a rapid dash-step (`vx` impulse burst), **plant their boots**, and unleash multi-stage slash chains where a single attack/skill chains downward cleave -> reverse uppercut -> spinning vortex -> airborne plunge.
  3. **Tactile Hit-Stop (`Hit-Freeze`) + Cascading Damage Ticks**: On blade-to-hurtbox contact, *Last Cloudia* briefly freezes animation advancement (`~2–4 frames` / `35–60 ms` hit-stop) while applying micro-shake (`+-2..4 px`) to the struck enemy and staggering multi-hit damage numbers (`2–3` rapid cascading ticks on heavy cleaves/plunges) so heavy greatswords feel like they tear through armor rather than passing through ghosts.

### 2.3 *Grand Summoners* (NextNinja) — Oversized Canvas Framing & True Arts Slash Crescents

* **Primary Reference Archive**:
  * *The Spriters Resource — Grand Summoners Mobile Archive*: `https://www.spriters-resource.com/mobile/grandsummoners/`
* **Technical Takeaways**:
  * *Grand Summoners* isolates character bodies at compact pixel dimensions (`~48–64` logical px tall) inside generous wide bounding regions so **Skill / Arts / True Arts** greatsword swings, cross-slashes, and shockwave crescents extend `2.0x–2.8x` the character's standing body width in front of the unit without clipping at cell walls.
  * Heavy slashes pair **opaque cel-banded pixel smears** inside the unit animation with **persistent diagonal slash-scars** across the enemy's torso.

### 2.4 Master Pixel-Art Sword Slash & Anime Fighting-Game Frame-Data Principles

* **Primary Tutorials & Frame-Data References**:
  * **Pedro Medeiros (*Saint11*, *Celeste* / *TowerFall*) — *Motion Blur* & *Simple Attack Animation* Pixel Tutorials**: `https://saint11.art/` and `https://lospec.com/pixel-art-tutorials/motion-blur` (`https://lospec.com/pixel-art-tutorials/author/pedro-medeiros`)
  * **Adam C. Younis — *Pixel Art Sword Combo: Keyframes, Smears, Overshoot & Recovery*** (Insignia Action-Platformer Pipeline)
  * **Arc System Works (*Guilty Gear* / *BlazBlue*) & tri-Ace (*Valkyrie Profile*) 2D Slash Frame Structure** (`Sugata` keypose clarity + `Kime` impact lock)
* **Synthesized Laws of Master-Tier 2D Slash Timing**:
  1. **Startup / Anticipation (`2–3` frames = `66–100 ms` @ 30fps)**: Cock the weapon into the opposite quadrant, twist shoulders, and compress legs like a loaded spring. Add `1–2 px` "boil" (subtle cape/plume/hilt tension shift) so anticipation never looks paused.
  2. **The 1-Frame Strike Snap (`1` frame = `33.3 ms` @ 30fps)**: As Pedro Medeiros (*Saint11*) demonstrates, **never tween the weapon linearly across the strike**. Jump straight to the post-impact extreme pose on the very first active frame and connect the previous frame's weapon tip to the new weapon tip with a **hand-shaped pixel smear crescent** drawn strictly from the sprite's cel palette ramp (no muddy Gaussian blur).
  3. **Overshoot (`1–2` frames = `33–67 ms`)**: Heavy weapons carry past the target (`+6..12 deg` deeper blade dip and `+2..4 px` pelvis compression) before settling back into the follow-through guard, selling real steel inertia.
  4. **Tail-to-Tip Smear Erosion (`2` frames = `67 ms`)**: Peel the smear away from its trailing end while secondary appendages (plume, cape, sash) lag behind and whip past the body (`overlapping action`).
  5. **Combo Routing via Recovery Cancel**: Chained slashes (`Beat 1 -> Beat 2 -> Beat 3 -> Beat 4`) **skip returning to `IDLE`**; each beat's settled overshoot posture serves directly as the coiled anticipation of the next beat along an alternating or escalating trajectory (`Down-Forward Cleave -> Reverse Upward Heaven-Slash -> Horizontal Spinning Cross-Rip -> Airborne Heavensplitter Slam`).

---

## 3. Root-Cause Diagnosis: Why Legacy `hd2d_rig_core.py` + `Warrior.js` Auto-Attacks Looked Stiff

Inspecting `scripts/hd2d_rig_core.py`, `scripts/build_warrior_30fps_sheet.py`, `src/entities/Fighter.js`, and `src/entities/Warrior.js` reveals **six compounding architectural bottlenecks** that prevented legacy `208x208` auto-attacks from achieving *FFBE* / *Last Cloudia* fluidity:

### 3.1 Quantitative Framing Bottleneck (`208x208` Centered Square vs *FFBE* vs Next-Gen `320x240`)

| Metric | Legacy `warrior_sheet.png` (`208x208`) | Uploaded *FFBE* Rain (`153x105` native -> `2x` = `306x210`) | **Next-Gen `warrior_ex_sheet.png` (`320x240`)** |
| :--- | :--- | :--- | :--- |
| **Logical Grid -> Final Cell (`2x NEAREST`)** | `104 x 104` -> `208 x 208` (`1.00 : 1`) | `153 x 105` (`1.46 : 1` landscape) | **`160 x 120` -> `320 x 240` (`1.33 : 1` landscape)** |
| **Full 10-Row x 30-Col Atlas Size** | `6240 x 2080` | Modular `.cgg`/`.cgs` strip | **`9600 x 2400`** |
| **Standing Character Height** | `168–174 px` (`84–87` logical px) | `48 px` (`96 px` @ `2x`, `45.7%` of cell H) | **`172–176 px` (`86–88` logical px — `1:1` match!)** |
| **Foot Anchor `(anchorX, anchorY)`** | `(104, 199)` (`50.0%` centered X) | `(100, 87)` facing `-X` (`34.6%` rear / `65.4%` front) | **`(112, 230)` (`35.0%` rear / `65.0%` front!)** |
| **Forward Reach Ahead of Spine** | `104 px` raw / **`85–87 px` usable** | `100 px` (`200 px` @ `2x`) | **`208 px` raw / `200 px` usable (`+130%` gain!)** |
| **Rear Windup Space Behind Spine** | `104 px` raw / `92 px` usable | `53 px` (`106 px` @ `2x`) | **`112 px` raw / `104 px` usable** |
| **Overhead Sky Room Above Standing Helm** | **`24–30 px`** (`y_min = 24..32`) | `34 px` (`68 px` @ `2x`) | **`54–58 px` (`+26..34 px` overhead gain!)** |
| **Max Greatsword Length Without Shrink** | `62–69 px` (`weapon_len = 31..34.5`) | `~108 px` @ `2x` (`1.12x` body height) | **`108–124 px` (`54–62` logical px)** |

### 3.2 Six Specific Failure Modes in Legacy `hd2d_rig_core.py` & `Warrior.js`

1. **Dynamic Auto-Zoom Shrink & Horizontal Crop Drift (`hd2d_rig_core.py:688-702`)**:
   * Whenever a greatsword swing exceeded `span_x_104 > 88.0` or `span_y_104 > 91.0`, `render_rig_104` dynamically inflated the crop window `S = max(default_S, req_S_x, req_S_y)` (shrinking the character's body pixel scale mid-swing!) or shifted `crop_x0` horizontally (causing the character's planted boots to slide backward inside the cell whenever the sword reached forward).
2. **Cosine-Tweened Rigid Midpoint Stick (`build_warrior_30fps_sheet.py:266-290` & `817-843`)**:
   * `eval_2h_keyframes` interpolated `weapon_deg` with `u = 0.5 - 0.5 * cos(pi * raw_u)`. On `Row 2` `Slice 0`, `F02` (`weapon_deg = -128 deg`) -> `F03` (`weapon_deg = -54 deg` rigid unblurred sword stick!) -> `F04` (`weapon_deg = +20 deg`). Rendering that clean, unblurred intermediate sword at `F03` killed all snap velocity and made the greatsword look like a slow mechanical pendulum.
3. **Single In-Plane 3/4 Cutout Rotation (`paste_rotated_part`)**:
   * Rotating one static `3/4` chest cutout (`parts["torso"]`) in 2D image space by `torso_deg = -12 deg .. +28 deg` could not express 3D shoulder yaw (chest opening toward camera during rear coil -> dorsal/rear shoulder twisting across the chest on follow-through) or real vertical torso foreshortening (`-27%` crouch-lunge compression).
4. **Resetting to `IDLE` High-Guard After Every Beat (`F07`, `F14`, `F22`, `F29`)**:
   * Every 7–8 frame slice in `build_warrior_30fps_sheet.py` ended by interpolating `grip_x=56, grip_y=-14, weapon_deg=-36..-38 deg` back to `Row 0` `IDLE`, then jarring into a completely different quadrant 1 frame later (`F07 -36 deg -> F08 +148 deg`), breaking posture continuity.
5. **Detached Late VFX Arcs (`t = 0.20s` = `50%` Startup Delay in `Warrior.js:916-939`)**:
   * Because `warrior_sheet.png` baked zero smears into `Row 2`, `Warrior.js` waited `200 ms` (`t >= 0.20s` of a `0.42s` swing) before spawning a generic `radius: 28..34` shader ring at `(x + facing * 42, y - 96)` — disconnected from the actual windup-to-impact blade path.
6. **Post-Impact `vx` Ice-Skating, Chest-Crowding Spacing (`86 px`), & Missing Fighter Hit-Stop (`Warrior.js:895-1003`)**:
   * `updateHackAndSlashMotion` drove `Aethelgard` inward to `contactDist: 86` (`minCloseDist: 78`, jamming foes into his chest rather than at greatsword smear range) across `40%` of the animation, and then `Warrior.js:921` injected `this.vx = this.facing * 34..62` *after* impact so his planted sprite slid across the stone floor. Nor did `Fighter.js` freeze `stateTimer` on the active smear frame during hit-stop.

---

## 4. Next-Gen `Arcane vs Steel` Sprite & Combat Pipeline Specification (`warrior_ex` & Future Heroes)

### 4.1 Wide-Canvas Sheet Geometry & Renderer Anchor Contract (`9600x2400`)

1. **Master Character Sheet Dimensions**:
   * **Logical Canvas per Cell**: **`160 x 120 px`** (authored with crisp cel-shaded `1px` logical pixels and directional `#0a0e1c` / `#141c34` `Selout`).
   * **Final Lossless PNG Cell (`2x NEAREST` Integer Upscale)**: **`320 x 240 px`** (`100%` exact `2x2` pixel blocks, `0` bilinear blur, `imageSmoothingEnabled = false` on Web Canvas and `.nearest` `MTLSamplerMinMagFilter` on Native Swift/Metal).
   * **10-Row x 30-Column Atlas Layout**: **`9600 x 2400 px`** (`300` cells total), preserving the exact 10-row state contract (`Row 0 IDLE`, `Row 1 WALK`, `Row 2 AUTO_ATTACK [[60,8],[68,7],[75,8],[83,7]]`, `Row 3 SKILL`, `Row 4 ULTIMATE / TRUE_ULTIMATE`, `Row 5 DEATH & HURT`, `Row 6 DASH`, `Row 7 CROUCH`, `Row 8 JUMP / DODGE`, `Row 9 VICTORY`).
2. **Fixed Asymmetric Spine/Boot Anchor (`Zero Dynamic Crop Drift`)**:
   * **Logical Foot Anchor**: **`anchor_x_160 = 56.0`**, **`anchor_y_120 = 115.0`**.
   * **Upscaled `320x240` Foot Anchor**: **`anchorX = 112`**, **`anchorY = 230`** (with `groundPlantOffset = 14` relative to bottom edge `240 - 230 = 10` + `4px` perspective ground seat so boots plant identically on `y = groundY` alongside `208x208` heroes).
   * **1:1 Character World Scale Lock**: Standing head-to-heel height MUST stay locked at **`86–88` logical px (`172–176 px` in `320x240`)** with **fixed `scale` across all 300 cells** (NEVER auto-shrinking `S` when the sword extends!).
   * **Safe Border Invariant**: Minimum **`2` logical px (`4 px` in `320x240`)** transparent border on all 4 edges (`x_320 in [4..315]`, `y_320 in [4..235]`, `0/300` border clips).
3. **Engine Per-Hero Metadata Contract (`PixelForge.js` & `Renderer.js`)**:
   * Per-hero descriptor in `PixelForge`: `{ cellW: 320, cellH: 240, anchorX: 112, anchorY: 230 }` (defaulting to `{ cellW: 208, cellH: 208, anchorX: 104, anchorY: 199 }` for all 11 classic `208x208` heroes so zero existing heroes change by even `1 px`).
   * **Mirror-Safe Horizontal Blit Formula**: When `Renderer` translates to `(fighter.x, drawY)` and applies `ctx.scale(fighter.facing, 1)`, drawing the `320x240` cell at local X offset **`-anchorX` (`-112`)** places the `112 px` rear space behind `fighter.x` and the **`208 px` forward slash reach** directly in front of `fighter.x` for BOTH `facing = +1` and `facing = -1`, with **`0.0 px` pivot shift** on turnarounds, afterimages, and floor reflections!

### 4.2 Multi-Keypose + 3D Torso Twist + Spine Compression Rigging Architecture

Instead of rotating a single rigid 3/4 cutout with continuous cosine interpolation, `scripts/build_warrior_ex_nextgen_sheet.py` MUST synthesize animations from **four distinct anatomical body states** paired with a **Step-Hold + 1-Frame Snap** pose evaluator:

1. **Keypose State A — Open-Chest Rear-Loaded Windup Coil**:
   * Torso opens `~25–35 deg` toward camera (wider chest plate & visible front tabard/pauldrons), rear knee bends deeply to load weight, lead boot cocks lightly, and both gauntlets hoist the `112–122 px` Dawn-Breaker Celestial Greatsword `~135–148 deg` behind the back/shoulder.
2. **Keypose State B — Deep Compressed Forward Lunge (`-18%..-25%` Vertical Spine Drop)**:
   * Pelvis drops `+16..+22 px` (`y_320`), torso pitches aggressively forward (`+26..+34 deg`) with foreshortened vertical chest height, stance widens into a **`68–84 px` (`34–42` logical px) split lunge**, rear leg drives straight back, and cape/plume whip violently backward (`counter-overlap`).
3. **Keypose State C — Cross-Body / Dorsal Shoulder-Twist Stance**:
   * Rear/dorsal shoulder plate rotates across the midline for reverse rising slashes (`Beat 2`) and horizontal 360-deg vortex cross-rips (`Beat 3`), selling authentic 3D axial spine torque without `ctx.rotate`.
4. **Keypose State D — Airborne Arched Ascent & Meteoric Plunge**:
   * Tucked asymmetric knee-drive ascent (`F23..F24`) snapping in `1` frame into a full downward-extended Heavensplitter slam (`F25`).

### 4.3 4-Band Serrated Pixel Smear Crescent Specification

Every primary strike snap frame (`Row 2` `F03`, `F09`, `F17`, `F25`, plus `Row 3` & `Row 4` slashes) MUST bake a **connected, cel-stepped HD-2D crescent smear fan** directly into the `160x120` logical frame before `2x NEAREST` upscaling:

1. **Exact Geometric Span**:
   * Starts at the **previous frame's windup blade-tip angle** $\theta_{\text{start}}$ and terminates flush along the **current snap frame's solid blade spine** $\theta_{\text{end}}$ (`|\Delta\theta| = 175^\circ..225^\circ`), extending out to `x_160 = 148..156` (`x_320 = 296..312`, utilizing the full `200 px` forward reach!).
2. **Variable Radial Chord Profile**:
   * Outer radius $R_{\text{outer}}(u)$ follows an elliptical/parabolic forward projection peaking in the sweet-spot (`+90..+142` logical px ahead of spine).
   * Radial thickness $W(u) = W_{\text{max}} \cdot \sin(\pi u)^{0.72}$ tapers from `1–2` logical px at the rear wake tail ($u = 0$) to a colossal **`26–38` logical px (`52–76 px` in `320x240`)** across the front impact belly ($u \approx 0.58..0.78$).
3. **4-Band Opaque Pixel-Pure Cel Ramp (Zero Muddy Semi-Transparent Grey Blur)**:
   * **Band 1 — Razor Specular Outer Rim (`1–2` logical px)**: Pure White-Gold / Celestial Ice Specular (`#fffef2` / `#e8fcff`) along the extreme outer perimeter.
   * **Band 2 — High-Velocity Sun-Gold Crest (`35%` outer chord)**: Radiant Exvius Gold (`#fde047` -> `#f59e0b`).
   * **Band 3 — Celestial Ice-Cyan / Royal Azure Core Belly (`40%` mid chord)**: Luminous Astral Cyan (`#7dd3fc` -> `#38bdf8`).
   * **Band 4 — Serrated Inner Wind-Rip Edge (`25%` inner chord)**: Deep Sapphire-Indigo (`#1d4ed8` -> `#141c34`) carved with **3–5 procedural sawtooth wind-rip notches** + `4x4` Bayer ordered stipple cutouts near the wake tail ($u < 0.28$), maintaining `100%` binary alpha (`0` or `255`) pixel purity!
4. **2-Frame Tail-to-Tip Erosion**:
   * `Snap + 1f`: Advance $\theta_{\text{start}}$ forward by `~60%` of the arc and narrow $W_{\text{max}}$ by `45%` so the upper/rear wake evaporates cleanly.
   * `Snap + 2f`: Leave only `2–3` razor golden-cyan tip ribbons (`|\Delta\theta| \approx 28^\circ`) hugging the overshot greatsword tip.
   * `Snap + 3f`: **Zero smear** — crisp solid runeblade held in planted follow-through stance.

### 4.4 Exact 30-Frame `Row 2` (`AUTO_ATTACK`) Timing Chart (`[[60, 8], [68, 7], [75, 8], [83, 7]]`)

| Beat & Slice | Row 2 Local Cols (Global Indices) | Frame-by-Frame Choreography & Smear Specification | Duration & Combat Timing |
| :--- | :--- | :--- | :--- |
| **Beat 1 (`V0`)**: *Coiled Downward Dawn-Cleave* | `F00..F07` (`60..67`, `8f`) | **`F00..F02`** (`3f` Anticipation Hold w/ `1–2px` cape/plume boil): Keypose A chest-open rear coil, greatsword cocked `-138 deg` behind shoulder.<br>**`F03`** (**`1f` SNAP + SMEAR**): Instant `-22%` spine drop into Keypose B wide split-lunge (`+28 deg` low-front blade) + colossal **`210 deg` overhead-to-floor Dawn-Breaker crescent smear** reaching `x_320 = 304`!<br>**`F04`** (`1f` Erosion 1 + Overshoot): Blade dips to `+34 deg` (`y_320 = 228`); upper smear wake peels away.<br>**`F05`** (`1f` Erosion 2): Thin golden-cyan tip wisps trail low blade.<br>**`F06..F07`** (`2f` Clean Low Planted Hold): Zero smear; blade stays locked low-forward (`+30 deg`) priming Beat 2! | `0.36s` total<br>Pre-snap lunge: `0.03..0.09s`<br>**Impact + `42ms` Hit-Stop**: `F03` (`t = 0.09s`, `1` heavy slash + torso scar) |
| **Beat 2 (`V1`)**: *Instant Reverse Rising Heaven-Slash* | `F08..F14` (`68..74`, `7f`) | **`F08`** (`1f` Micro-Torque Coil): Directly from `F07`'s low `+30 deg` blade (**ZERO reset to idle!**), drop knees `+4px` and torque rear shoulder.<br>**`F09`** (**`1f` REVERSE SNAP + SMEAR**): Step lead boot forward, snap greatsword skyward to `-68 deg` overhead guard + massive **`195 deg` floor-to-sky reverse upper-hemisphere smear** (`x_320 = 308`, `y_320 = 12..224`)!<br>**`F10`** (`1f` Erosion 1): Lower belly clears; high golden-cyan crest arches overhead (`-74 deg` overshoot).<br>**`F11`** (`1f` Erosion 2): Tip ribbons peel upward; cape hits max backward whip.<br>**`F12..F14`** (`3f` Heroic High-Guard Settle): Clean overhead-forward stance priming Beat 3! | `0.34s` total<br>Chain link: `0.015s`<br>**Impact + `42ms` Hit-Stop**: `F09` (`t = 0.055s`, rising shockwave + enemy pop) |
| **Beat 3 (`V2`)**: *Last Cloudia Spinning Vortex Cross-Rip* | `F15..F22` (`75..82`, `8f`) | **`F15..F16`** (`2f` Axial Torque Coil): Keypose C cross-body twist from `F14` high guard, blade tucked horizontally across rear hip (`+165 deg`).<br>**`F17`** (**`1f` HORIZONTAL SNAP + WIDE FORESHORTENED SMEAR**): Explosive horizontal 360-deg cleave (`-4 deg` full forward reach `x_320 = 310`) + wide foreshortened **elliptical horizontal smear disc** slicing across chest height!<br>**`F18`** (`1f` Second Cross-Edge Snap): Secondary reverse-edge horizontal twin-streak (`+12 deg`) for rapid **2-hit cross-rip**!<br>**`F19..F20`** (`2f` Vortex Erosion): Twin horizontal wake ribbons dissolve.<br>**`F21..F22`** (`2f` Low Coiled Spring Settle): Deep crouch-coil priming Beat 4's skyward leap! | `0.38s` total<br>**2-Hit Rapid Impact**:<br>Hit 1 @ `F17` (`t = 0.08s`, `32ms` hit-stop)<br>Hit 2 @ `F18` (`t = 0.14s`, `38ms` hit-stop + twin X-scars) |
| **Beat 4 (`V3`)**: *Airborne Heavensplitter Execution* | `F23..F29` (`83..89`, `7f`) | **`F23..F24`** (`2f` Keypose D Skyward Vault Coil): Athletic leap (`y_lift = 46..58 px`), knees tucked asymmetrically, both gauntlets hoisting greatsword `-145 deg` high above crown (`y_320 = 8`).<br>**`F25`** (**`1f` METEORIC SLAM SNAP + VERTICAL CATHEDRAL SMEAR**): Crashes onto stone floor in deep split-kneel (`+42 deg` earth-cleave) + colossal **top-to-bottom `220 deg` vertical Guillotine smear** (`y_320 = 6..232`, `x_320 = 312`)!<br>**`F26..F27`** (`2f` Impact Shock & Smear Peel): Ground-hugging golden-cyan shock-plume + cascading blade-wave release.<br>**`F28..F29`** (`2f` Sovereign Recovery Rise): Rises with cape settle back toward `Row 0` High-Guard. | `0.52s` total<br>Airborne: `0.02..0.15s`<br>**Impact + `58ms` Heavy Hit-Stop**: `F25` (`t = 0.16s`, **3 rapid cascading ticks** + piercing `'blade_wave'` + camera shake) |

### 4.5 Next-Gen Combat-Feel & Engine Rules (`WarriorEx.js` + Opt-In `Fighter.js`)

1. **Impulse-Then-Plant Footwork (`Zero Ice-Skating`)**:
   * Forward translation occurs **strictly during the pre-snap windup-to-release window** (`t = 0.03..0.10s`). When `dist > 155 px`, Beat 1 closes the gap into the **`108–122 px` greatsword sweet-spot** (putting the enemy's hurtbox squarely inside the `52–76 px` thick front belly of the `208 px` smear crescent, never overlapping inside Aethelgard EX's chest at `78 px` and never whiffing air).
   * At the exact millisecond of the 1-frame smear snap (`F03`, `F09`, `F17`, `F25`), **`this.vx = 0` is hard-locked** so the planted boots do not slide a single pixel while the smear blazes and erodes.
2. **Opt-In Fighter-Level Hit-Stop (`_hitStopTimer`) + Target Micro-Shake**:
   * When an attack connects in `WarriorEx.js`, both attacker (`this._hitStopTimer = 0.042..0.058`) and struck target (`foe._hitShakeTimer = 0.045..0.060`, `+-3 px` horizontal render jitter without altering world `foe.x`) freeze `stateTimer` right on the **active smear snap frame** (`F03`, `F09`, `F17`, `F25`). Freezing on the giant smear crescent for `2.5–3.5` display frames at 60Hz lets the player's eye drink in the full hand-crafted *FFBE* crescent arc while delivering unmistakable heavy steel resistance.
3. **Cascading Multi-Hit Greatsword Bite**:
   * Instead of flat single-number pokes (`1-1-1-1`), the 4-beat chain escalates in rhythmic density (**`1 hit -> 1 rising launcher hit -> 2 rapid vortex cross-hits -> 3 cascading Heavensplitter execution ticks + piercing runic blade_wave`** = **`7+` total hits per 4-beat combo**), matching *Last Cloudia*'s signature kinetic damage-number fountain.
4. **Zero-Idle `15 ms` Intra-Combo Chaining**:
   * Both Versus AI (`_postFlurryInterval` applied only *after* Beat 4) and Adventure Mode (`Hold-to-Slash` & `AUTO`) chain `V0 -> V1 -> V2 -> V3` across a `0.015s` (`< 1` frame) transition window, preserving continuous forward martial pressure without flickering through `Row 0` `IDLE`.

---

## 5. Citations & Technical Sources

1. **Alim / Square Enix — *Final Fantasy Brave Exvius* Unit Sprite Sheets & `.cgg`/`.cgs` Modular Animation System**:
   * *The Spriters Resource — Final Fantasy: Brave Exvius Mobile Archive*: `https://www.spriters-resource.com/mobile/finalfantasybraveexvius/`
   * *Rain (Base / Awakened / Neo Vision Sheets)*: `https://www.spriters-resource.com/mobile/finalfantasybraveexvius/sheet/98136/`
   * *Lasswell (Base / Awakened / Neo Vision Sheets)*: `https://www.spriters-resource.com/mobile/finalfantasybraveexvius/sheet/98144/`
   * *VG Resource & Luminest `.cgg` (Character Graphics Grid) / `.cgs` (Character Graphics Script) Technical Specifications*: `https://www.vg-resource.com/` and `https://luminest.io/`
2. **AIDIS — *Last Cloudia* 2.5D Pixel Art Combat & Animation Production**:
   * *Official Last Cloudia Portal & AIDIS "Behind the Scenes: Pixel Art Production!" Developer Features*: `https://www.lastcloudia.com/`
3. **NextNinja — *Grand Summoners* Wide-Canvas Unit & True Arts Sprite Sheets**:
   * *The Spriters Resource — Grand Summoners Mobile Archive*: `https://www.spriters-resource.com/mobile/grandsummoners/`
4. **Pedro Medeiros (*Saint11*) — Pixel-Art Motion Blur, Smears & Attack Timing Tutorials**:
   * *Saint11 Pixel Art Tutorials Archive*: `https://saint11.art/`
   * *Lospec Pixel Art Tutorial — "Motion Blur" & Attack Animation Series by Pedro Medeiros*: `https://lospec.com/pixel-art-tutorials/motion-blur` and `https://lospec.com/pixel-art-tutorials/author/pedro-medeiros`
5. **Fighting-Game & Action-Platformer Keypose, Smear, Overshoot & Hit-Stop Craft**:
   * *Adam C. Younis — Pixel Art Sword Combo Design (Keyframes, Smears, Overshoot & Combo Routing)*
   * *Arc System Works (Guilty Gear / BlazBlue) & tri-Ace (Valkyrie Profile) 2D Slash Frame-Data Structure (`Sugata` Silhouette Contrast, `Kime` Hit-Freeze, and Cancel Windows)*
