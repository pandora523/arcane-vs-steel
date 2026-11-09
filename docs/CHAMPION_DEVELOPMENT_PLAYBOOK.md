# Arcane vs Steel — HD-2D Champion & 30fps Animation Development Playbook

> **CRITICAL RULE FOR ALL FUTURE SESSIONS / CHATS**:
> **NEVER** draw procedural geometric stick-figure or polygon-from-scratch character sprites in Python.
> Every champion in *Arcane vs Steel* MUST be built using the **7-Stage Reference-Driven HD-2D Pipeline** documented below.

---

## Stage 1: Generate 16-Bit HD-2D Base Sprite & Portrait (`generate_image`)

Before writing any sprite-sheet generator code, use `generate_image` (Gemini 3.1 Flash Image) to generate two high-resolution (`1024x1024`, `1:1`) reference assets:

1. **Base Character Sprite (`<hero>_v1_base.jpg` -> saved to `assets/sprites/<hero>_v1_base.jpg`)**:
   - **Pose & Orientation**: Full-body 16-bit HD-2D pixel-art sprite standing in a **three-quarters profile facing RIGHT (`+X`)**.
   - **Background**: **100% pure solid flat white (`#FFFFFF`)** with **ZERO ground shadow** and **ZERO background scenery**.
   - **Arms & Hands**: Arms relaxed at sides with **empty hands** (NO weapon or staff held in the base image!) so the Python script can cleanly neutralize the static side-arms and articulate dynamic **2-Bone Inverse Kinematics (IK) arms** + custom weapon across all 270 frames without duplicate weapons or extra hands.
   - **Distinct Silhouette**: Do NOT pass another champion's base sprite in `ImagePaths` when generating a new champion's body (passing `valkyrie_v1_base.jpg` causes the image generator to recolor Valkyrie's exact armor/pose). Generate a 100% original outfit and silhouette first, then pass that new base sprite in `ImagePaths` when generating the matching portrait!

2. **HUD Bust Portrait (`portrait_hd2d_<hero>.jpg` -> downsampled `128x128 NEAREST` to `assets/sprites/<hero>_portrait.png`)**:
   - Pass `<hero>_v1_base.jpg` in `ImagePaths` so the portrait's crown/helm, hair, eyes, collar, and armor match the in-game sprite 1-to-1.
   - Frame the character facing directly forward in a dark atmospheric HD-2D cathedral/sanctuary background, holding their signature weapon/scepter on the left side of the frame.
   - Downsample to `128x128` using `Image.Resampling.NEAREST` and save to `assets/sprites/<hero>_portrait.png`.

---

## Stage 2: Clean 52x52 Base Extraction (`extract_clean_base_sprite`)

Every cell in a champion's `6240x1872` sheet (`9 rows x 30 cols` at `208x208` per cell) is authored on a **`52x52` logical pixel grid** and upscaled `4x` (`Image.Resampling.NEAREST`) to `208x208`.

1. **BFS Flood-Fill Exterior & Enclosed White Removal**:
   - Seed a BFS queue (`collections.deque`) from all 4 borders of the `1024x1024` base image AND any enclosed pure-white pockets (`r > 246, g > 246, b > 246`) between the arms and torso/skirt.
   - Strip all connected white/near-white background pixels (`r > 225 and g > 225 and b > 225`, or `min(r,g,b) > 210 and max(r,g,b)-min(r,g,b) < 25`).
2. **3-Pass Anti-Aliased Fringe Stripping (Zero White Halo)**:
   - Run 3 morphological passes on pixels adjacent to transparency (`arr[:, :, 3] == 0`) to strip gray/white anti-aliased fringe pixels (`min(r,g,b) > 170 and (max-min) < 40`).
3. **Crop & Downsample into `52x52` Logical Cell**:
   - Crop tight non-transparent bounds `(xmin..xmax, ymin..ymax)` and resize with `Image.Resampling.NEAREST` to `height = 41..42px` (`y = 4..45`), placing both boots firmly on the floor line at **`y = 45`**.
   - **DO NOT BAKE A BLACK OUTLINE IN PYTHON**: `PixelForge.js` (`ensureNormalMap` + `drawSheetFrame`) dynamically renders the 1px dark comic ink outline and 1px exterior rim highlight at runtime. Baking an outline in Python produces muddy double-outlines.

---

## Stage 3: Neutralize Baked Side-Arms & Build Anatomical Templates

1. **`neutralize_baked_side_arms(tpl_img)`**:
   - Strip the protruding right-side hanging arm/hand (`x > max_chest_x, y = 18..29`).
   - Neutralize the left-side hanging hand/forearm skin pixels (`x = 19..24, y = 19..28`) into matching torso/corset/armor shading so that when the 2-bone IK arms move, there are **zero leftover hands on the hips/chest** and **zero extra limbs**.
2. **`make_clean_templates()`**:
   - `stand`: Clean standing character with both boots planted at `y = 45` and static side-arms neutralized.
   - `stand_upper`: Upper body, head/crown/hair, and waist/tassets (`y = 0..35`).
   - `leg_back` & `leg_front`: Lower greave/boot patches (`y = 38..46`) for independent stride/glide articulation.
   - `lunge`: Forward-leaning attack body (`+2px` upper-body lean for `y = 4..31`).
   - `kneel`: Dropped onto bent knees (`y + 6px` upper-body drop anchored at `y = 45`).
   - `fall`: 90-degree horizontally rotated prone body resting flat on the floor (`y = 35..45`) for `Row 5 (DEATH F18..F29)`.
   - `dash`: Forward-tilted (`-13 deg`) aerodynamic dash body anchored above `y = 45`.

---

## Stage 4: 2-Bone IK Arms, Articulated Weapon & Back Attachment

1. **2-Bone Inverse Kinematics (`solve_ik_elbow` & `draw_ik_<hero>_arm`)**:
   - Compute the anatomical elbow joint `(ex, ey)` from shoulder `(sx, sy)` to weapon grip `(hx, hy)` with upper-arm length `L1 = 5.6..6.0` and forearm length `L2 = 5.4..5.8`.
   - Draw shaded multi-strip upper arm, elbow couter/bracer, forearm, and `3x3` hand/gauntlet.
2. **Articulated Weapon / Scepter (`draw_<weapon>`)**:
   - Render the champion's weapon dynamically at `(hand_x, hand_y, angle_deg)` with rigid clamping inside `4.0 <= x <= 47.0, 4.0 <= y <= 45.5` so the weapon never clips the cell border at any angle.
   - On `Row 5 (DEATH F18..F29)`, lay the weapon horizontally along the floor (`angle_deg = -4..0 deg`) — **never leave a floating upright weapon on death**.
3. **Unique Back Silhouette Attachment**:
   - Every champion has a signature animated back silhouette rendered behind the torso (`y = 6..32, x = 4..21`):
     * `Valkyrie`: 6-Pinion Crimson-Gold Feathered Dragon Wings
     * `Ronin`: 5 Raijin Taiko Thunder-Drums + Waist Katana Scabbard (`Saya`)
     * `Titan`: Molten World-Forge Anvil Backpack & Exhaust Vents
     * `Chronomancer`: Twin Counter-Rotating Brass Escapement Gears
     * `IceMage`: 6-Crystal Borealis Snowflake / Cryo-Prism Halo Array

---

## Stage 5: 9-Row x 30-Frame Animation Layout (`6240 x 1872`)

All 270 frames face **RIGHT (`+X`)** and must pass `ensure_safe_cell(cell, margin=2)` (`0/270` pixels touching `x < 2, x > 49, y < 2, y > 49` and `fill_layer_pinholes` removing any 1px interior slits):

| Row | State | Frame Count | Required Motion Arc |
| :--- | :--- | :--- | :--- |
| **Row 0** | `IDLE` | 30 (`F00..F29`) | Breathing torso bob, flowing hair/mantle wave, pulsing runes/eyes, animated back halo/wings, poised weapon sway. |
| **Row 1** | `WALK` | 30 (`F00..F29`) | Full two-step stride/glide cycle (`F00..F14` Step A, `F15..F29` Step B) articulating `leg_back` and `leg_front` with counter-swinging weapon. |
| **Row 2** | `AUTO_ATTACK` | 30 (`F00..F29`) | `F00..F08` windup coil, `F09..F17` forward lunge + weapon strike/cast release + crescent/beam flare, `F18..F29` follow-through recovery. |
| **Row 3** | `SKILL` | 30 (`F00..F29`) | Signature special skill choreography with multi-stage weapon/catalyst articulation and elemental aura bursts. |
| **Row 4** | `ULTIMATE` | 30 (`F00..F29`) | Grand Overdrive ascension (`bob_y = -2..-4`), flared back halo/wings, overhead/converging weapon channeling, and cataclysmic release. |
| **Row 5** | `DEATH & HURT` | 30 (`F00..F29`) | `F00..F06` hurt stagger recoil, `F07..F17` drop to knees (`kneel`), `F18..F29` horizontal collapse on floor (`fall`) with horizontal resting weapon. |
| **Row 6** | `DASH` | 30 (`F00..F29`) | Forward-tilted `dash` posture (`-13 deg`), swept-back hair/halo, trailing elemental slipstream motes. |
| **Row 7** | `CROUCH` | 30 (`F00..F29`) | Compressed knee-bend posture (`make_crouch_<hero>`), defensive barrier/guard (`F02..F10`), and low counter-shot (`F11..F22`). |
| **Row 8** | `JUMP` | 30 (`F00..F29`) | `F00..F03` crouch coil, `F04..F13` airborne ascent, `F14..F21` apex downward angled strike/cast (`+32..38 deg`), `F22..F29` landing absorption. |

---

## Stage 6: 5-Row x 30-Frame 30fps VFX Sprite Sheet (`6240 x 1040`)

Built by `scripts/build_<hero>_30fps_vfx.py` -> `assets/sprites/<hero>_vfx.png` (`5 rows x 30 cols` at `208x208`, authored on `52x52` logical cells upscaled `4x NEAREST`):
- **Row 0 (`y = 0`)**: Primary Projectile & Orbiting Satellites (30-frame rotation/spiral + wake).
- **Row 1 (`y = 208`)**: Secondary Construct / Sky-Strike / Floating Prism / Hourglass Cage (30 frames).
- **Row 2 (`y = 416`)**: Erupting Pillar / Obelisk Spire / Rift Portal / Refractive Monolith (`F00..F06` eruption, `F07..F21` active, `F22..F29` shatter).
- **Row 3 (`y = 624`)**: Ultimate Colossal Avatar / Grand Cathedral Seal / Astral Clockface (30 frames).
- **Row 4 (`y = 832`)**: Hit Impact Crescent / Star-Cross Shatter Ring (30 frames).

---

## Stage 7: Mandatory Debug Contact Sheet Visual Inspection (`view_file`)

Every `build_<hero>_30fps_sheet.py` and `build_<hero>_30fps_vfx.py` script MUST output labeled debug contact sheets and you MUST inspect them using `view_file` before finishing:
1. `debug_<hero>_30fps_left_F00_F14.png` (Rows `0..8`, Columns `F00..F14`)
2. `debug_<hero>_30fps_right_F15_F29.png` (Rows `0..8`, Columns `F15..F29`)
3. `debug_<hero>_30fps_vfx.png` (Rows `0..4`, Columns `F00..F29`)

Verify visually:
- Zero white halos or background artifacts.
- Zero extra limbs or duplicate hands on torso/hips.
- Zero border clipping (`0/270` frames touching the 2px safety margin).
- Smooth, readable 16-bit HD-2D silhouette across all 9 rows.

---

## Stage 8: High-Precision `104x104 -> 208x208` 13-Part Skeletal Articulation & Zero-Shear Rules

When upgrading champions that require intricate armor filigree, non-boxy silhouettes, and full-body martial articulation (such as **Kaze-Maru (`Ronin`)** in `scripts/build_ronin_30fps_sheet.py`):
1. **Generate Cape-Free Full-Stance Base Art (`assets/sprites/<hero>_v2_base.jpg`)**:
   - Avoid giant horizontal capes in the `1024x1024` reference image that crush the character's horizontal width when downsampled.
   - Generate the character in a clear three-quarter `Kamae` martial stance with separated limbs so all 13 anatomical parts (`mane`, `head`, `torso`, `l_sode`, `l_forearm`, `r_sode`, `r_forearm`, `l_thigh`, `l_shin`, `l_foot`, `r_thigh`, `r_shin`, `r_foot`) segment cleanly.
2. **Assemble & Rotate in `512x512` Space -> Downsample `NEAREST` to `104x104` Logical Grid (`2x NEAREST` -> `208x208`)**:
   - Rendering at `104x104` logical resolution (`2x2` pixel blocks in `208x208`) provides **400% (4x) finer detail** than `52x52` (`4x4` pixel blocks), preserving crescent `Kabuto` horns, `Menpo` Oni-mask tusks, glowing eyes, chest lightning filigree, braided `Obi` waist ropes, `Kusazuri` tassets, and diamond `Kikko` knee-guards without boxiness.
   - Draw dark-navy cloth joint capsules (`draw_capsule`, `draw_joint_cap`) underneath rotated armor plates and layer `torso` (`Kusazuri` tassets) over hip joints and `shin` (`Kikko` knee-guards) over knee joints so bending up to `±90°` never opens a seam.
3. **Never Shear or Skew Sprites (`ctx.transform` / Scanline Shifting)**:
   - Never apply horizontal scanline shifts (`lunge[y, x + dx] = stand[y, x]`) in Python or `ctx.transform(1, 0, -fwdSign * lean, 1, 0, 0)` in `PixelForge.js` — both pull the sprite sideways like rubber. All leaning, lunging, crouching, and supersonic spear-diving postures must come from genuine multi-joint skeletal rotation (`torso_deg`, `head_rel_deg`, `l_thigh_deg`, `l_shin_deg`, `r_thigh_deg`, `r_shin_deg`, `l_sode_rel_deg`, `r_sode_rel_deg`).

