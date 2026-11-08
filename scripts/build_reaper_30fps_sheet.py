#!/usr/bin/env python3
"""
Builds Malakor's (Reaper) 30-Frame-Per-Animation HD-2D Sprite Sheet:
- 9 rows x 30 columns = 270 unique frames (6240 x 1872 at 208x208 per cell):
  * Row 0: IDLE (30 frames)
  * Row 1: WALK (30 frames)
  * Row 2: AUTO_ATTACK - ABYSSAL SCYTHE REAP (30 frames)
  * Row 3: SKILL - SPECTRAL CHAIN HOOK & EXECUTIONER GUILLOTINE SLAM (30 frames)
  * Row 4: ULTIMATE - GRIM HARVEST: SOVEREIGN OF DEATH (30 frames)
  * Row 5: DEATH & HURT (30 frames)
  * Row 6: DASH - WRAITH PHASE-RUSH (30 frames)
  * Row 7: CROUCH - WRAITH-SHROUD CROUCH & LOW PHANTOM SCYTHE THROW (30 frames)
  * Row 8: JUMP - SHADOW-WING AERIAL VAULT & MID-AIR DOWNWARD SCYTHE CLEAVE (30 frames)
- Un-inked clean pixel art at 52x52 logical resolution upscaled 4x NEAREST to 208x208.
- Strictly ONE articulated Abyssal Great-Scythe per frame (zero duplicate scythes, zero extra limbs, zero bouncy-ball jump frames).
"""

import math
import numpy as np
from PIL import Image, ImageDraw

# Reaper (Malakor) Obsidian Necropolis, Blood-Crimson & Abyssal Violet Palette
OUTLINE = (11, 15, 25, 255)
OBSIDIAN_DEEP = (20, 12, 32, 255)
OBSIDIAN_DARK = (32, 22, 46, 255)
OBSIDIAN_MID = (52, 40, 71, 255)
OBSIDIAN_LIGHT = (89, 76, 104, 255)
STEEL_LIGHT = (168, 162, 196, 255)
STEEL_EDGE = (226, 218, 248, 255)

CRIMSON_DEEP = (38, 8, 26, 255)
CRIMSON_DARK = (68, 16, 38, 255)
CRIMSON_MID = (118, 28, 56, 255)
CRIMSON_BRIGHT = (244, 63, 94, 255)
CRIMSON_CORE = (255, 205, 218, 255)

VIOLET_DEEP = (58, 22, 94, 255)
VIOLET_MID = (126, 34, 206, 255)
VIOLET_BRIGHT = (192, 132, 252, 255)
VIOLET_PINK = (232, 121, 249, 255)
SOUL_WHITE = (250, 245, 255, 255)

BONE_DARK = (120, 112, 128, 255)
BONE_MID = (182, 174, 192, 255)
BONE_LIGHT = (232, 226, 240, 255)


def load_source_cells(path='backups/reaper_sheet_before_30fps.png'):
    im = Image.open(path).convert('RGBA')

    def cell(r, c):
        return np.array(
            im.crop((c * 208, r * 208, (c + 1) * 208, (r + 1) * 208)).resize((52, 52), Image.NEAREST),
            dtype=np.uint8
        )

    return {
        'idle': cell(0, 0),
        'atk_windup': cell(2, 1),
        'atk_slash': cell(2, 3),
        'kneel1': cell(4, 2),
        'kneel2': cell(4, 3),
        'fall': cell(4, 5),
        'dash': cell(5, 2),
    }


def set_px(buf, x, y, col):
    ix = int(round(x))
    iy = int(round(y))
    if 0 <= ix < 52 and 0 <= iy < 52:
        buf[iy, ix] = col


def draw_line_px(buf, x0, y0, x1, y1, col):
    steps = int(max(abs(x1 - x0), abs(y1 - y0), 1))
    for i in range(steps + 1):
        t = i / steps
        set_px(buf, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, col)


def draw_thick_line_px(buf, x0, y0, x1, y1, col_core, col_edge=None):
    steps = int(max(abs(x1 - x0), abs(y1 - y0), 1) * 2)
    dx = x1 - x0
    dy = y1 - y0
    length = math.hypot(dx, dy) or 1.0
    nx, ny = -dy / length, dx / length
    for i in range(steps + 1):
        t = i / steps
        cx = x0 + dx * t
        cy = y0 + dy * t
        if col_edge is not None:
            set_px(buf, cx + nx * 0.8, cy + ny * 0.8, col_edge)
            set_px(buf, cx - nx * 0.8, cy - ny * 0.8, col_edge)
        set_px(buf, cx, cy, col_core)


def add_outline_to_layer(layer):
    """
    Returns `layer.copy()` without dilating black outline pixels into transparent space,
    because `PixelForge.js` (ensureNormalMap + drawSheetFrame) dynamically renders the
    1px comic ink outline and 1px exterior rim at runtime.
    """
    return layer.copy()


def composite_over(base, over):
    res = base.copy()
    mask = over[:, :, 3] > 0
    res[mask] = over[mask]
    return res


def make_clean_templates(src):
    """
    Strips ALL baked-in scythe blades and shafts from Malakor's master poses so we can
    animate strictly ONE articulated Abyssal Great-Scythe (`draw_abyssal_scythe`) per frame
    with zero duplicate scythes or phantom weapon fragments.
    """
    # 1. Clean standing body from `idle` (0, 0)
    stand = src['idle'].copy()
    slash_ref = src['atk_slash'].copy()

    # Remove right-side scythe head, upper shaft, and curved blade from `stand`
    for y in range(0, 52):
        for x in range(0, 52):
            if y <= 27 and x >= 31:
                stand[y, x] = 0
            elif 28 <= y <= 30 and x >= 32:
                stand[y, x] = 0
            elif 31 <= y <= 38 and x >= 43:
                stand[y, x] = 0
            elif 39 <= y <= 42 and x >= 41:
                stand[y, x] = 0

    # Replace the diagonal shaft line across the waist/chest (x=18..30, y=22..31)
    # with clean shaft-free armor/tabard pixels from `slash_ref` + vertical neighbor interpolation
    for x in range(5, 31):
        y_shaft = 39.2 - (x - 5) * 0.627
        iy = int(round(y_shaft))
        for y in range(max(18, iy - 1), min(42, iy + 2)):
            if stand[y, x, 3] == 0:
                continue
            # Protruding lower-left butt-spike of the shaft outside the cloak at x=5..8, y=37..39
            if x <= 8 and y <= 39:
                r, g, b, _ = stand[y, x]
                if b > r + 10 and b > 65:
                    stand[y, x] = (37, 7, 26, 255)
            elif 18 <= x <= 29 and 22 <= y <= 31 and slash_ref[y, x, 3] > 0:
                stand[y, x] = slash_ref[y, x]
            else:
                # Sample clean cloak/armor pixel from 2px above or below the thin shaft line
                above_y = max(14, iy - 2)
                below_y = min(46, iy + 2)
                if stand[above_y, x, 3] > 0:
                    stand[y, x] = stand[above_y, x]
                elif stand[below_y, x, 3] > 0:
                    stand[y, x] = stand[below_y, x]

    stand = add_outline_to_layer(stand)

    # Extract Malakor's left (far) and right (near) armored greaves & boots for walk/crouch/jump
    leg_back_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_front_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_back_patch[39:51, 8:18] = stand[39:51, 8:18]
    leg_front_patch[39:51, 26:36] = stand[39:51, 26:36]

    # Upper torso + crimson tabard + tattered cloak without lower boots (y >= 40)
    stand_upper = stand.copy()
    stand_upper[40:, :, :] = 0
    # Preserve far-left tattered cloak tips at x <= 7, y = 40..46
    stand_upper[40:47, :8, :] = stand[40:47, :8, :]
    stand_upper = add_outline_to_layer(stand_upper)

    # 2. Clean forward slash/lunge body (from `atk_slash` with all right-side crescent blade pixels stripped
    #    and clean lower legs/boots grafted from `stand`)
    lunge = src['atk_slash'].copy()
    for y in range(0, 52):
        for x in range(31, 52):
            lunge[y, x] = 0
    lunge[36:51, 8:42] = stand[36:51, 8:42]
    lunge = add_outline_to_layer(lunge)

    # 3. Clean kneeling bodies (`kneel1`, `kneel2`) with the baked vertical scythe at x >= 30, y <= 17 removed!
    kneel1 = src['kneel1'].copy()
    kneel2 = src['kneel2'].copy()
    for kn in (kneel1, kneel2):
        kn[:18, :, :] = 0
        kn[:, 30:, :] = 0
    kneel1 = add_outline_to_layer(kneel1)
    kneel2 = add_outline_to_layer(kneel2)

    # 4. Clean horizontal fallen body (`fall`) with the baked-in bottom scythe (y >= 40) stripped
    #    and lowered by +6px so Malakor lies flat on the floor (y = 34..45)
    raw_fall = src['fall'].copy()
    raw_fall[40:, :, :] = 0
    fall = np.zeros((52, 52, 4), dtype=np.uint8)
    for y in range(28, 40):
        ny = y + 6
        if ny < 50:
            fall[ny, :] = raw_fall[y, :]
    fall = add_outline_to_layer(fall)

    # 5. Clean horizontal wraith-dash body (`dash`) with front scythe blade/shaft (x >= 38) stripped
    dash = src['dash'].copy()
    dash[:, 38:, :] = 0
    dash = add_outline_to_layer(dash)

    return {
        'stand': stand,
        'stand_upper': stand_upper,
        'leg_back': leg_back_patch,
        'leg_front': leg_front_patch,
        'lunge': lunge,
        'kneel1': kneel1,
        'kneel2': kneel2,
        'fall': fall,
        'dash': dash,
    }


def apply_cloak_wave(frame, phase_rad, amplitude=1.5, vertical_flutter=0.6, is_dash=False):
    """
    Applies a smooth 30-frame traveling necropolis wind-wave to Malakor's tattered crimson-shadow cloak
    on the left (x = 1..15) and right flare (x = 32..42, y = 31..40) without detaching his torso or legs.
    """
    out = frame.copy()
    if is_dash:
        cloak_region = frame[17:44, 0:21].copy()
        out[17:44, 0:21] = 0
        for y in range(17, 44):
            for x in range(0, 21):
                if cloak_region[y - 17, x, 3] == 0:
                    continue
                dist = max(0.0, (21 - x) / 17.0)
                dy = int(round(math.sin(phase_rad - dist * 3.2) * amplitude * dist))
                dx = int(round(math.cos(phase_rad * 2.0 - dist * 2.4) * 0.8 * dist))
                ny = max(14, min(48, y + dy))
                nx = max(1, min(21, x + dx))
                out[ny, nx] = cloak_region[y - 17, x]
                if x >= 15 and out[y, x, 3] == 0:
                    out[y, x] = cloak_region[y - 17, x]
        return add_outline_to_layer(out)

    # Left cloak wave (x = 1..15, y = 22..47)
    cloak_mask = np.zeros((52, 52), dtype=bool)
    for y in range(22, 48):
        max_x = 14 if y < 38 else 8
        for x in range(1, max_x + 1):
            if frame[y, x, 3] > 0:
                cloak_mask[y, x] = True

    cloak_pixels = frame.copy()
    out[cloak_mask] = 0

    for y in range(22, 48):
        u = (y - 22) / 25.0
        dx = int(round(math.sin(phase_rad - u * 3.4) * (amplitude * (0.25 + 0.85 * u))))
        dy = int(round(math.cos(phase_rad - u * 2.6) * (vertical_flutter * u)))
        max_x = 14 if y < 38 else 8
        for x in range(1, max_x + 1):
            if not cloak_mask[y, x]:
                continue
            nx = max(1, min(16, x + dx))
            ny = max(20, min(49, y + dy))
            if out[ny, nx, 3] == 0:
                out[ny, nx] = cloak_pixels[y, x]
            if dx < 0 and x >= max_x - 2 and out[y, x, 3] == 0:
                out[y, x] = cloak_pixels[y, x]

    # Subtle flutter on right crimson cloak flare (x = 33..42, y = 31..40) if present
    for y in range(31, 41):
        u = (y - 31) / 9.0
        dy = int(round(math.sin(phase_rad + u * 2.5) * 0.7))
        for x in range(34, 43):
            if frame[y, x, 3] > 0:
                ny = max(30, min(42, y + dy))
                out[ny, x] = frame[y, x]

    return add_outline_to_layer(out)


def draw_shadow_wings(base_frame, phase_rad, spread=1.0, shoulder_y=18):
    """
    Renders tattered Abyssal Shadow-Wings unfurling behind Malakor during ULTIMATE (Row 4) and JUMP (Row 8).
    """
    if spread <= 0.05:
        return base_frame
    wing_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    # Left/Back sweeping shadow-wing and upper dorsal pinion
    span = int(round(12 * spread))
    for i in range(span + 1):
        u = i / max(1, span)
        # Upper arch of the shadow wing
        wx = int(round(20 - i * 1.15))
        wy = int(round(shoulder_y - math.sin(u * math.pi * 0.85) * (7.5 * spread) + math.sin(phase_rad + u * 3.0) * 0.8))
        set_px(wing_layer, wx, wy, VIOLET_BRIGHT if i % 3 == 0 else CRIMSON_MID)
        set_px(wing_layer, wx, wy + 1, OBSIDIAN_MID)

        # Tattered vertical shadow-feathers hanging from the wing arch
        feather_len = int(round((3 + (i % 3) * 2.5) * spread * (1.0 - u * 0.25)))
        for fy in range(2, feather_len + 2):
            col = OBSIDIAN_DARK if fy < feather_len else (VIOLET_MID if i % 2 == 0 else CRIMSON_DARK)
            set_px(wing_layer, wx, wy + fy, col)

    # Composite wings BEHIND base_frame
    return composite_over(wing_layer, base_frame)


def draw_abyssal_scythe(
    base_frame,
    grip_pos=(26, 25),
    shaft_deg=-35.0,
    shaft_reach=15.5,
    shaft_back=12.5,
    blade_span=17.5,
    blade_curve=6.0,
    blade_dir=1,
    rune_glow=1,
    slash_arc=None,
    two_handed=True,
    left_claw_ext=None,
):
    """
    Renders strictly ONE articulated Abyssal Great-Scythe onto `base_frame`:
    - Long dark-iron & amethyst-wrapped polearm haft passing through `grip_pos` at `shaft_deg`
      (0 deg = pointing +X right, -35 deg = pointing up-right, +90 deg = pointing down).
    - Crimson-violet winged skull collar at the scythe head (`hx, hy`).
    - Wicked curved crescent Abyssal Scythe Blade with obsidian spine, glowing crimson/violet runes,
      and razor silver-violet edge.
    - Optional `slash_arc`: (start_deg, end_deg, radius, intensity) for sweeping reap trails.
    - Optional `left_claw_ext`: (target_x, target_y, pinch_t, draw_chain) for Row 3 SKILL Phase 1!
    """
    scythe_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    fx_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    rad = math.radians(shaft_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    # Perpendicular vector pointing in the direction of the scythe blade
    px, py = -uy * blade_dir, ux * blade_dir

    gx, gy = grip_pos
    bx0 = gx - ux * shaft_back
    by0 = gy - uy * shaft_back
    hx = gx + ux * shaft_reach
    hy = gy + uy * shaft_reach

    # 1. Optional Subtle Trailing Soul-Motes During High-Velocity Reap Swings (never a second crescent blade!)
    if slash_arc is not None:
        s_deg, e_deg, s_rad, _ = slash_arc
        for i in range(4):
            u = (i + 0.5) / 4.0
            a = math.radians(s_deg + (e_deg - s_deg) * u)
            sx_p = gx + math.cos(a) * (s_rad - 1.5)
            sy_p = gy + math.sin(a) * (s_rad - 1.5)
            col = CRIMSON_BRIGHT if (i % 2 == 0) else VIOLET_BRIGHT
            set_px(fx_layer, sx_p, sy_p, col)

    # 2. Long Obsidian-Iron & Amethyst Polearm Haft (from butt-spike `bx0, by0` to head `hx, hy`)
    haft_steps = int(max(abs(hx - bx0), abs(hy - by0), 1) * 2)
    for i in range(haft_steps + 1):
        t = i / haft_steps
        sx = bx0 + (hx - bx0) * t
        sy = by0 + (hy - by0) * t
        # 2px thick polearm shaft with obsidian shadow and violet-steel highlight
        set_px(scythe_layer, sx - px * 0.6, sy - py * 0.6, OBSIDIAN_DEEP)
        col_shaft = VIOLET_MID if (int(i / 3) % 3 == 0) else OBSIDIAN_MID
        set_px(scythe_layer, sx, sy, col_shaft)

    # Wicked Butt-Spike at rear of shaft
    set_px(scythe_layer, bx0 - ux, by0 - uy, STEEL_LIGHT)
    set_px(scythe_layer, bx0 - ux * 1.8, by0 - uy * 1.8, VIOLET_BRIGHT)

    # 3. Winged Necropolis Skull Collar at Scythe Head (`hx, hy`)
    for dx_c in (-1, 0, 1):
        for dy_c in (-1, 0, 1):
            set_px(scythe_layer, hx + dx_c, hy + dy_c, OBSIDIAN_LIGHT if (dx_c == 0 or dy_c == 0) else OBSIDIAN_DARK)
    # Glowing crimson eye-gem in the scythe collar
    set_px(scythe_layer, hx, hy, CRIMSON_BRIGHT if rune_glow >= 1 else CRIMSON_MID)
    # Rear Bat-Fin Spike opposite the main blade
    set_px(scythe_layer, hx - px * 2.0, hy - py * 2.0, VIOLET_BRIGHT)
    set_px(scythe_layer, hx - px * 3.0 + ux * 0.8, hy - py * 3.0 + uy * 0.8, CRIMSON_BRIGHT)
    # Top Fin Spike extending past the shaft tip
    set_px(scythe_layer, hx + ux * 1.5, hy + uy * 1.5, STEEL_LIGHT)
    set_px(scythe_layer, hx + ux * 2.5, hy + uy * 2.5, VIOLET_BRIGHT)

    # 4. Sweeping Curved Crescent Abyssal Scythe Blade
    b_steps = 24
    for i in range(b_steps + 1):
        s = i / b_steps  # 0.0 at collar -> 1.0 at lethal crescent tip
        # Forward reach along perpendicular `px, py` and hook curve back along `-ux, -uy`
        reach = s * blade_span
        hook = -(s ** 1.65) * blade_curve + math.sin(s * math.pi) * 1.6
        cx = hx + px * reach + ux * hook
        cy = hy + py * reach + uy * hook

        # Blade width tapers from 4.2px near the collar to 1px at the needle tip
        w_blade = max(1, int(round((1.0 - s * 0.78) * 4.2)))
        for w_i in range(w_blade + 1):
            # Offset from outer spine (+ux, +uy) toward inner cutting edge (-ux, -uy)
            off_u = (1.0 - (w_i / max(1, w_blade)) * 2.0) * (w_blade * 0.42)
            bx_p = cx + ux * off_u
            by_p = cy + uy * off_u

            if w_i == 0:
                # Outer armored spine of the scythe blade
                col_b = OBSIDIAN_DARK if s < 0.75 else VIOLET_MID
            elif w_i == w_blade:
                # Inner/outer razor-sharp luminous cutting edge
                col_b = SOUL_WHITE if (rune_glow >= 2 and s > 0.25) else (STEEL_EDGE if s < 0.8 else VIOLET_PINK)
            elif w_i == 1 and 0.18 <= s <= 0.78 and (i % 4 == (rune_glow % 4)):
                # Pulsing Blood-Crimson & Abyssal-Violet Runes etched along the blade fuller
                col_b = CRIMSON_BRIGHT if (i % 8 < 4) else VIOLET_PINK
            else:
                col_b = VIOLET_BRIGHT if (w_i == w_blade - 1) else OBSIDIAN_MID

            set_px(scythe_layer, bx_p, by_p, col_b)

        # Extra soul-flame motes peeling off the blade during high rune_glow (2 or 3)
        if rune_glow >= 2 and i in (6, 12, 18):
            set_px(fx_layer, cx + px * 1.2, cy + py * 1.2, CRIMSON_BRIGHT if i == 12 else VIOLET_BRIGHT)
            if rune_glow >= 3:
                set_px(fx_layer, cx + px * 2.2, cy + py * 2.2, SOUL_WHITE)

    # 5. Malakor's Armored Gauntlets Gripping the Haft
    set_px(scythe_layer, gx, gy, OBSIDIAN_LIGHT)
    set_px(scythe_layer, gx + 1, gy, CRIMSON_MID)
    if two_handed and left_claw_ext is None:
        g2x = gx + ux * 4.2
        g2y = gy + uy * 4.2
        draw_line_px(scythe_layer, 24, 21, g2x, g2y, OBSIDIAN_DARK)
        set_px(scythe_layer, g2x, g2y, OBSIDIAN_LIGHT)
        set_px(scythe_layer, g2x, g2y - 1, VIOLET_BRIGHT)

    # 6. Optional Extended Left Spectral Bone-Claw & Abyssal Chain (Row 3 SKILL Phase 1: F00..F14)
    if left_claw_ext is not None:
        tx, ty, pinch_t, draw_chain = left_claw_ext
        sh_x, sh_y = 27, 20
        # Armored left arm reaching forward
        elbow_x = sh_x + 4
        elbow_y = sh_y + 1
        draw_thick_line_px(fx_layer, sh_x, sh_y, elbow_x, elbow_y, OBSIDIAN_MID, OBSIDIAN_DEEP)

        if draw_chain:
            # Taut dark-iron & violet-rune chain from gauntlet to bone-claw
            c_steps = int(max(abs(tx - elbow_x), abs(ty - elbow_y), 1))
            for ci in range(c_steps + 1):
                u_c = ci / max(1, c_steps)
                cx_i = elbow_x + (tx - elbow_x) * u_c
                cy_i = elbow_y + (ty - elbow_y) * u_c + math.sin(u_c * math.pi * 2.0) * 0.8
                c_col = VIOLET_BRIGHT if (ci % 3 == 0) else (STEEL_LIGHT if ci % 2 == 0 else OBSIDIAN_DEEP)
                set_px(fx_layer, cx_i, cy_i, c_col)

        # Articulated Skeletal Bone-Claw at (tx, ty)
        spread_ang = (1.0 - pinch_t) * 32.0 + 10.0
        set_px(fx_layer, tx, ty, CRIMSON_BRIGHT)
        set_px(fx_layer, tx - 1, ty, VIOLET_BRIGHT)
        for sign in (-1, 1):
            a_talon = math.radians(sign * spread_ang)
            for d_t in range(1, 6):
                kx = tx + math.cos(a_talon) * d_t
                ky = ty + math.sin(a_talon) * d_t - sign * (0.25 if d_t >= 4 else 0.0)
                set_px(fx_layer, kx, ky, BONE_LIGHT if d_t >= 3 else BONE_MID)
        # Middle talon
        for d_t in range(1, 5):
            set_px(fx_layer, tx + d_t, ty, SOUL_WHITE if d_t == 4 else BONE_LIGHT)

    out = composite_over(base_frame, scythe_layer)
    out = composite_over(out, fx_layer)
    return add_outline_to_layer(out)


def render_walk_legs(tpl, f):
    """
    Renders a grounded, predatory 30-frame 2-step armored stride cycle (f = 0..29)
    in true back-to-front anatomical depth order:
    1. Backmost Layer: Tattered crimson-shadow cloak (`cloak_layer`) bridged solidly to torso.
    2. Far Leg Layer: Sculpted obsidian thigh + knee-guard + greave/boot (`far_leg`, shaded 0.78x).
    3. Crimson Necropolis Tabard (`tabard_layer`) swinging dynamically between the legs.
    4. Near Leg Layer: Full-brightness obsidian thigh + knee-skull + greave/boot (`near_leg`).
    5. Upper Torso & Hooded Skull (`torso_layer`) with smooth 2-step vertical bob.
    Feet stay planted at y=45..49 — never floating or steep!
    """
    phase = (f / 30.0) * 2.0 * math.pi
    bob_y = int(round(math.cos(phase * 2.0) * 1.0))

    stand = tpl['stand'].copy()
    cloak_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    # 1. Backmost tattered cloak (left side x=1..16, y=22..47 and right flare x=33..42, y=31..40)
    for y in range(22, 48):
        ny = y + bob_y
        if not (0 <= ny < 52):
            continue
        u = (y - 22) / 25.0
        wave_dx = int(round(-u * 1.8 + math.sin(phase - u * 3.2) * (1.3 * u)))
        wave_dy = int(round(math.cos(phase - u * 2.6) * (0.7 * u)))
        for x in range(1, 17):
            if stand[y, x, 3] == 0:
                continue
            # Do not copy standing left boot (x >= 9 when y >= 39) into cloak layer
            if y >= 39 and x >= 9:
                continue
            cy = max(20, min(49, ny + wave_dy))
            cx = max(1, min(18, x + wave_dx))
            cloak_layer[cy, cx] = stand[y, x]
            if x >= 12 and y <= 37:
                cloak_layer[ny, x] = stand[y, x]

    for y in range(31, 41):
        ny = y + bob_y
        if 0 <= ny < 52:
            for x in range(33, 43):
                if stand[y, x, 3] > 0:
                    cloak_layer[ny, x] = stand[y, x]

    # 2. Upper Armored Torso & Hooded Skull (y = 11..35, x = 13..33)
    for y in range(11, 36):
        ny = y + bob_y
        if not (0 <= ny < 52):
            continue
        lean_dx = 1 if y <= 28 else 0
        for x in range(13, 33):
            if stand[y, x, 3] > 0:
                torso_layer[ny, min(50, x + lean_dx)] = stand[y, x]

    hip_x = 22.5
    hip_y = 34.0 + bob_y

    def build_striding_greave(boot_patch, orig_cx, swing_phase, is_far_leg=False):
        layer = np.zeros((52, 52, 4), dtype=np.uint8)
        s_val = math.sin(swing_phase)
        c_val = math.cos(swing_phase)

        knee_lift = max(0.0, c_val)
        knee_x = hip_x + s_val * 5.2 + knee_lift * 1.8
        knee_y = hip_y + 4.5 - knee_lift * 1.6

        foot_target_x = 22.5 + s_val * 7.2 - knee_lift * 1.8
        foot_lift_dy = bob_y - int(round(knee_lift * 2.4))

        boot_rot_deg = s_val * 16.0 - knee_lift * 18.0
        pil_boot = Image.fromarray(boot_patch, mode='RGBA')
        rot_boot = np.array(
            pil_boot.rotate(boot_rot_deg, resample=Image.NEAREST, center=(orig_cx, 43.0)),
            dtype=np.uint8
        )

        dx_boot = int(round(foot_target_x - orig_cx))
        for y in range(37, 52):
            for x in range(4, 48):
                if rot_boot[y, x, 3] > 0:
                    ny = min(49, max(36, y + foot_lift_dy))
                    nx = min(48, max(5, x + dx_boot))
                    px_col = rot_boot[y, x].copy()
                    if is_far_leg:
                        px_col[0] = int(px_col[0] * 0.76)
                        px_col[1] = int(px_col[1] * 0.76)
                        px_col[2] = int(px_col[2] * 0.80)
                    layer[ny, nx] = px_col

        ank_x = foot_target_x + math.sin(math.radians(boot_rot_deg)) * 1.2
        ank_y = 43.0 + foot_lift_dy

        if is_far_leg:
            c_dark, c_mid, c_hi, c_knee = OBSIDIAN_DEEP, OBSIDIAN_DARK, OBSIDIAN_MID, CRIMSON_MID
        else:
            c_dark, c_mid, c_hi, c_knee = OBSIDIAN_DARK, OBSIDIAN_MID, OBSIDIAN_LIGHT, VIOLET_BRIGHT

        # Armored Thigh (Hip -> Knee)
        for off_x, col in [(-1.8, c_dark), (-0.8, c_mid), (0.2, c_hi), (1.2, c_mid), (2.0, c_dark)]:
            draw_line_px(layer, hip_x + off_x, hip_y, knee_x + off_x * 0.85, knee_y, col)

        # Obsidian Greave (Knee -> Ankle)
        for off_x, col in [(-1.4, c_dark), (-0.4, c_mid), (0.6, c_hi), (1.4, c_dark)]:
            draw_line_px(layer, knee_x + off_x, knee_y, ank_x + off_x * 0.85, ank_y, col)

        # Skull Knee-Guard highlight
        set_px(layer, knee_x, knee_y, c_knee)
        set_px(layer, knee_x + 1, knee_y, c_hi)
        return layer

    far_leg = build_striding_greave(tpl['leg_back'], 12.0, phase + math.pi, is_far_leg=True)
    near_leg = build_striding_greave(tpl['leg_front'], 30.0, phase, is_far_leg=False)

    # Dynamic Crimson Necropolis Tabard swinging between the greaves (y = 33..42)
    tabard_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    flap_dx = math.sin(phase) * 2.0
    for off_x, col in [(-2.0, CRIMSON_DEEP), (-1.0, CRIMSON_DARK), (0.0, CRIMSON_MID), (1.0, CRIMSON_DARK)]:
        draw_line_px(
            tabard_layer,
            hip_x + off_x,
            hip_y - 1.0,
            hip_x + off_x + flap_dx,
            hip_y + 6.5,
            col
        )

    out = composite_over(cloak_layer, far_leg)
    out = composite_over(out, tabard_layer)
    out = composite_over(out, near_leg)
    out = composite_over(out, torso_layer)
    return out


def make_crouch_body(tpl, crouch_depth):
    """
    Constructs a low-profile Wraith-Shroud crouch body with `crouch_depth` in [1..7] logical pixels:
    - Uses `kneel1` bent legs anchored firmly on the floor when `crouch_depth >= 5`, or compressed
      standing legs when `crouch_depth in 1..4`.
    - Lowers Malakor's upper armored torso, hooded skull, and tattered cloak smoothly by `crouch_depth` pixels!
    """
    canvas = np.zeros((52, 52, 4), dtype=np.uint8)
    if crouch_depth >= 5:
        canvas[37:51, :] = tpl['kneel1'][37:51, :]
        upper = tpl['stand_upper']
        for y in range(10, 38):
            ny = y + crouch_depth
            if 0 <= ny < 49:
                for x in range(0, 52):
                    if upper[y, x, 3] > 0:
                        canvas[ny, x] = upper[y, x]
    else:
        canvas[39:51, :] = tpl['stand'][39:51, :]
        upper = tpl['stand_upper']
        for y in range(10, 39):
            ny = y + crouch_depth
            if 0 <= ny < 49:
                for x in range(0, 52):
                    if upper[y, x, 3] > 0:
                        canvas[ny, x] = upper[y, x]
    return add_outline_to_layer(canvas)


def make_jump_body(tpl, jump_dy, tuck_amount, torso_lean_dx=0):
    """
    Constructs a full-body aerial Shadow-Wing Reaper pose in true back-to-front anatomical order:
    - Backmost Layer: Billowing tattered crimson-shadow cloak streaming behind Malakor.
    - Far Leg Layer: Trailing obsidian greave & boot kicked back in an aerial vault.
    - Crimson Tabard: Streaming between the legs.
    - Near Leg Layer: Leading armored knee tucked high in front.
    - Upper Torso & Hooded Skull: Crisp hooded skull, glowing eye, and pauldrons — NEVER a round ball!
    """
    stand = tpl['stand'].copy()
    torso_dy = max(-2, jump_dy)

    cloak_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    # 1. Billowing Aerial Cloak (x <= 16, y = 22..47)
    cloak_lift = int(round(max(0.0, tuck_amount) * 3.0))
    for y in range(22, 47):
        for x in range(1, 17):
            if stand[y, x, 3] == 0:
                continue
            if y >= 39 and x >= 9:
                continue
            u = (y - 22) / 24.0
            cx = max(1, min(19, x - int(round(u * 2.6 * max(0.2, tuck_amount)))))
            cy = max(14, min(48, y + torso_dy - int(round(u * cloak_lift))))
            cloak_layer[cy, cx] = stand[y, x]
            if x >= 12 and y <= 36:
                cloak_layer[min(49, max(12, y + torso_dy)), x] = stand[y, x]

    # 2. Upper Armored Torso & Hooded Skull (y = 11..35, x = 13..33)
    for y in range(11, 36):
        ny = y + torso_dy
        if not (0 <= ny < 52):
            continue
        dx = torso_lean_dx if y <= 27 else 0
        for x in range(13, 33):
            if stand[y, x, 3] > 0:
                torso_layer[ny, max(1, min(50, x + dx))] = stand[y, x]

    hip_x = 22.5
    hip_y = 34.0 + torso_dy

    def build_aerial_greave(boot_patch, orig_cx, knee_dx, knee_dy, foot_dx, foot_dy, boot_rot_deg, is_far_leg=False):
        layer = np.zeros((52, 52, 4), dtype=np.uint8)
        pil_boot = Image.fromarray(boot_patch, mode='RGBA')
        rot_boot = np.array(
            pil_boot.rotate(boot_rot_deg, resample=Image.NEAREST, center=(orig_cx, 43.0)),
            dtype=np.uint8
        )
        for y in range(36, 52):
            for x in range(4, 48):
                if rot_boot[y, x, 3] > 0:
                    ny = max(28, min(49, y + int(round(foot_dy))))
                    nx = max(4, min(49, x + int(round(foot_dx))))
                    px_col = rot_boot[y, x].copy()
                    if is_far_leg:
                        px_col[0] = int(px_col[0] * 0.76)
                        px_col[1] = int(px_col[1] * 0.76)
                        px_col[2] = int(px_col[2] * 0.80)
                    layer[ny, nx] = px_col

        kx = hip_x + knee_dx
        ky = hip_y + knee_dy
        ax = orig_cx + foot_dx
        ay = 43.0 + foot_dy

        if is_far_leg:
            c_dark, c_mid, c_hi, c_knee = OBSIDIAN_DEEP, OBSIDIAN_DARK, OBSIDIAN_MID, CRIMSON_MID
        else:
            c_dark, c_mid, c_hi, c_knee = OBSIDIAN_DARK, OBSIDIAN_MID, OBSIDIAN_LIGHT, VIOLET_BRIGHT

        for off_x, col in [(-1.6, c_dark), (-0.6, c_mid), (0.4, c_hi), (1.4, c_dark)]:
            draw_line_px(layer, hip_x + off_x, hip_y, kx + off_x * 0.85, ky, col)
        for off_x, col in [(-1.2, c_dark), (0.0, c_mid), (1.2, c_dark)]:
            draw_line_px(layer, kx + off_x, ky, ax + off_x * 0.85, ay, col)
        set_px(layer, kx, ky, c_knee)
        return layer

    t = max(0.0, tuck_amount)
    far_leg = build_aerial_greave(
        tpl['leg_back'],
        12.0,
        knee_dx=-3.0 * t - 1.5,
        knee_dy=4.0 - 1.2 * t,
        foot_dx=-2.5 * t,
        foot_dy=torso_dy - 3.5 * t,
        boot_rot_deg=-22.0 * t,
        is_far_leg=True
    )
    near_leg = build_aerial_greave(
        tpl['leg_front'],
        30.0,
        knee_dx=4.5 * t + 2.0,
        knee_dy=3.0 - 2.4 * t,
        foot_dx=1.2 * t,
        foot_dy=torso_dy - 4.8 * t,
        boot_rot_deg=-20.0 * t,
        is_far_leg=False
    )

    tabard_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    for off_x, col in [(-1.5, CRIMSON_DEEP), (-0.5, CRIMSON_DARK), (0.5, CRIMSON_MID), (1.5, CRIMSON_DARK)]:
        draw_line_px(tabard_layer, hip_x + off_x, hip_y - 1, hip_x + off_x + 1.5 * t, hip_y + 5.0 - 1.2 * t, col)

    out = composite_over(cloak_layer, far_leg)
    out = composite_over(out, tabard_layer)
    out = composite_over(out, near_leg)
    out = composite_over(out, torso_layer)
    return out


def pulse_hood_eyes(frame, dy=0, bright=False):
    """Pulses Malakor's glowing crimson-violet skull eye inside his hood."""
    set_px(frame, 24, 15 + dy, SOUL_WHITE if bright else VIOLET_PINK)
    set_px(frame, 25, 15 + dy, CRIMSON_BRIGHT if bright else VIOLET_BRIGHT)


def build_row0_idle(tpl):
    """Row 0: 30-Frame Ominous Soulreaper IDLE."""
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        base = tpl['stand'].copy()

        breath_dy = -1 if 8 <= f <= 20 else 0
        if breath_dy != 0:
            upper = base[10:31, 13:32].copy()
            base[10:31, 13:32] = 0
            base[10 + breath_dy:31 + breath_dy, 13:32] = upper

        base = apply_cloak_wave(base, phase, amplitude=1.6, vertical_flutter=0.7)
        pulse_hood_eyes(base, dy=breath_dy, bright=(f % 6 in (2, 3)))

        shaft_deg = -34.0 + math.sin(phase) * 3.2
        rune_glow = 2 if (f % 10 in (4, 5, 6)) else 1
        frame = draw_abyssal_scythe(
            base,
            grip_pos=(26, 25 + breath_dy),
            shaft_deg=shaft_deg,
            shaft_reach=15.5,
            shaft_back=13.0,
            blade_span=17.5,
            blade_curve=6.0,
            blade_dir=1,
            rune_glow=rune_glow,
            two_handed=True
        )
        frames.append(frame)
    return frames


def build_row1_walk(tpl):
    """Row 1: 30-Frame Predatory 2-Step Armored Stride Cycle."""
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        body = render_walk_legs(tpl, f)
        bob_y = int(round(math.cos(phase * 2.0) * 1.0))
        pulse_hood_eyes(body, dy=bob_y, bright=(f % 8 < 3))

        # Counter-swinging Abyssal Great-Scythe across Malakor's stride
        shaft_deg = -32.0 - math.sin(phase) * 9.5
        grip_x = 26 + int(round(math.sin(phase) * 1.5))
        frame = draw_abyssal_scythe(
            body,
            grip_pos=(grip_x, 25 + bob_y),
            shaft_deg=shaft_deg,
            shaft_reach=15.0,
            shaft_back=12.5,
            blade_span=17.0,
            blade_curve=5.8,
            blade_dir=1,
            rune_glow=1 + (1 if f % 6 == 0 else 0),
            two_handed=True
        )
        frames.append(frame)
    return frames


def build_row2_auto_attack(tpl):
    """
    Row 2: 30-Frame AUTO_ATTACK (Abyssal Scythe Reap):
    - F00..F09: Two-handed back-shoulder windup (-34 deg -> -128 deg) with gathering crimson-violet soul sparks
    - F10..F18: Lethal wide crescent reap slash (-95 deg -> +48 deg) with sweeping crimson-violet crescent trail
    - F19..F29: Smooth follow-through & recovery (+48 deg -> -34 deg)
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if 10 <= f <= 20:
            base = tpl['lunge'].copy()
            if 11 <= f <= 15:
                base = np.roll(base, 1, axis=1)
                base[:, 0] = 0
        else:
            base = tpl['stand'].copy()

        base = apply_cloak_wave(base, phase * 1.5, amplitude=2.0 if 10 <= f <= 18 else 1.5, vertical_flutter=0.7)
        pulse_hood_eyes(base, dy=1 if 10 <= f <= 20 else 0, bright=(9 <= f <= 18))

        if f <= 9:
            u = f / 9.0
            # Smooth easing into deep back-shoulder windup
            ease = u * u * (3.0 - 2.0 * u)
            shaft_deg = -34.0 * (1.0 - ease) + (-126.0) * ease
            gx = int(round(26 * (1.0 - ease) + 21 * ease))
            gy = int(round(25 * (1.0 - ease) + 20 * ease))
            frame = draw_abyssal_scythe(
                base,
                grip_pos=(gx, gy),
                shaft_deg=shaft_deg,
                shaft_reach=15.0,
                shaft_back=11.0,
                blade_span=17.5,
                blade_curve=6.0,
                blade_dir=1,
                rune_glow=3 if f >= 7 else 2,
                two_handed=True
            )
        elif f <= 18:
            u = (f - 10) / 8.0
            # Fast explosive reap sweep across the front
            ease = 1.0 - math.pow(1.0 - u, 2.0)
            shaft_deg = -85.0 * (1.0 - ease) + 46.0 * ease
            gx = int(round(25 + math.sin(u * math.pi) * 4.0))
            gy = int(round(22 + u * 4.0))
            arc_s = max(-95.0, shaft_deg - 65.0)
            arc_e = shaft_deg + 12.0
            slash_arc = (arc_s, arc_e, 20.5, 1.0 - u * 0.35) if f <= 16 else None
            frame = draw_abyssal_scythe(
                base,
                grip_pos=(gx, gy),
                shaft_deg=shaft_deg,
                shaft_reach=15.5,
                shaft_back=11.5,
                blade_span=18.0,
                blade_curve=6.2,
                blade_dir=1,
                rune_glow=3 if f <= 15 else 2,
                slash_arc=slash_arc,
                two_handed=True
            )
        else:
            u = (f - 18) / 11.0
            ease = u * u * (3.0 - 2.0 * u)
            shaft_deg = 46.0 * (1.0 - ease) + (-34.0) * ease
            gx = int(round(27 * (1.0 - ease) + 26 * ease))
            gy = int(round(26 * (1.0 - ease) + 25 * ease))
            frame = draw_abyssal_scythe(
                base,
                grip_pos=(gx, gy),
                shaft_deg=shaft_deg,
                shaft_reach=15.5,
                shaft_back=12.5,
                blade_span=17.5,
                blade_curve=6.0,
                blade_dir=1,
                rune_glow=1,
                two_handed=True
            )

        frames.append(frame)
    return frames


def build_row3_skill(tpl):
    """
    Row 3: 30-Frame SKILL (Spectral Chain Hook + Executioner Guillotine Slam):
    - Phase 1 (F00..F14): Extends left gauntlet forward launching the Spectral Bone-Claw & Abyssal Chain
      while holding the single Great-Scythe poised behind his back with his right hand.
    - Phase 2 (F15..F29): High-arcing two-handed overhead Guillotine Scythe execution slam (F15..F23)
      and smooth recovery (F24..F29).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        use_lunge = (3 <= f <= 13) or (18 <= f <= 24)
        base = (tpl['lunge'] if use_lunge else tpl['stand']).copy()
        base = apply_cloak_wave(base, phase * 2.0, amplitude=2.0, vertical_flutter=0.8)
        pulse_hood_eyes(base, dy=1 if use_lunge else 0, bright=True)

        if f <= 14:
            # Phase 1: Spectral Bone-Claw & Chain Hook launch + drag while Great-Scythe is poised behind!
            if f <= 6:
                u = f / 6.0
                claw_x = int(round(32 + u * 15))
                claw_y = 21
                pinch = 0.0 if f < 5 else 0.6
            elif f <= 11:
                u = (f - 6) / 5.0
                claw_x = int(round(47 - u * 11))
                claw_y = 21 + int(round(math.sin(u * math.pi) * 1.5))
                pinch = 1.0
            else:
                u = (f - 11) / 3.0
                claw_x = int(round(36 - u * 6))
                claw_y = 21
                pinch = 0.5

            scythe_deg = -132.0 - math.sin((f / 14.0) * math.pi) * 12.0
            frame = draw_abyssal_scythe(
                base,
                grip_pos=(20, 23),
                shaft_deg=scythe_deg,
                shaft_reach=14.5,
                shaft_back=10.5,
                blade_span=17.0,
                blade_curve=5.8,
                blade_dir=-1,
                rune_glow=2,
                two_handed=False,
                left_claw_ext=(claw_x, claw_y, pinch, True)
            )
        elif f <= 18:
            # Phase 2 Windup: Raise Great-Scythe high overhead with both hands for Guillotine Execution!
            u = (f - 14) / 4.0
            shaft_deg = -132.0 * (1.0 - u) + (-72.0) * u
            frame = draw_abyssal_scythe(
                base,
                grip_pos=(25, int(round(22 - u * 4))),
                shaft_deg=shaft_deg,
                shaft_reach=15.5,
                shaft_back=11.0,
                blade_span=18.0,
                blade_curve=6.2,
                blade_dir=1,
                rune_glow=3,
                two_handed=True
            )
        elif f <= 23:
            # Phase 2 Execution: Crushing overhead Guillotine Scythe Slam to the floor!
            u = (f - 18) / 5.0
            ease = 1.0 - math.pow(1.0 - u, 2.2)
            shaft_deg = -72.0 * (1.0 - ease) + 52.0 * ease
            slash_arc = (-78.0, shaft_deg + 10.0, 21.5, 1.0 - u * 0.25) if f <= 22 else None
            frame = draw_abyssal_scythe(
                base,
                grip_pos=(28, int(round(19 + ease * 7))),
                shaft_deg=shaft_deg,
                shaft_reach=16.0,
                shaft_back=11.5,
                blade_span=18.5,
                blade_curve=6.4,
                blade_dir=1,
                rune_glow=3,
                slash_arc=slash_arc,
                two_handed=True
            )
        else:
            # Smooth recovery (F24..F29)
            u = (f - 23) / 6.0
            shaft_deg = 52.0 * (1.0 - u) + (-34.0) * u
            frame = draw_abyssal_scythe(
                base,
                grip_pos=(int(round(28 * (1.0 - u) + 26 * u)), int(round(26 * (1.0 - u) + 25 * u))),
                shaft_deg=shaft_deg,
                shaft_reach=15.5,
                shaft_back=12.5,
                blade_span=17.5,
                blade_curve=6.0,
                blade_dir=1,
                rune_glow=2 if f <= 25 else 1,
                two_handed=True
            )

        frames.append(frame)
    return frames


def build_row4_ultimate(tpl):
    """
    Row 4: 30-Frame ULTIMATE (Grim Harvest: Sovereign of Death):
    - Stage 1 (F00..F10): Raises the Abyssal Great-Scythe skyward with both hands as dark necropolis miasma
      and soul flames erupt around him.
    - Stage 2 (F11..F20): Unfurls tattered shadow-wings and sweeps the Great-Scythe in a wide 360-degree
      Soul-Harvest arc.
    - Stage 3 (F21..F29): Drives the scythe haft into the ground to detonate the Grim Harvest pillars.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi

        if f <= 10:
            # Stage 1: Skyward Sovereign Invocation
            u = f / 10.0
            wing_spread = max(0.0, (f - 3) / 7.0) * 0.85
            base = tpl['stand'].copy()
            base = apply_cloak_wave(base, phase * 2.0, amplitude=2.2, vertical_flutter=1.0)
            base = draw_shadow_wings(base, phase * 2.0, spread=wing_spread, shoulder_y=18)
            pulse_hood_eyes(base, dy=0, bright=True)

            shaft_deg = -34.0 * (1.0 - u) + (-86.0) * u
            gy = int(round(25 * (1.0 - u) + 18 * u))
            frame = draw_abyssal_scythe(
                base,
                grip_pos=(25, gy),
                shaft_deg=shaft_deg,
                shaft_reach=16.0,
                shaft_back=12.0,
                blade_span=18.5,
                blade_curve=6.4,
                blade_dir=1,
                rune_glow=3 if f >= 4 else 2,
                two_handed=True
            )
            # Rising crimson-violet necropolis soul flames around boots (y=42..49)
            for m in range(4):
                mx = 12 + ((f * 3 + m * 7) % 26)
                my = 48 - ((f * 2 + m * 3) % 8)
                set_px(frame, mx, my, CRIMSON_BRIGHT if m % 2 == 0 else VIOLET_BRIGHT)
                set_px(frame, mx, max(0, my - 1), SOUL_WHITE if f >= 7 else VIOLET_MID)

        elif f <= 20:
            # Stage 2: Levitating Shadow-Wing 360-degree Soul-Harvest Sweep!
            u = (f - 11) / 9.0
            body = make_jump_body(tpl, -1, tuck_amount=0.55, torso_lean_dx=1 if 13 <= f <= 18 else 0)
            body = apply_cloak_wave(body, phase * 3.0, amplitude=2.5, vertical_flutter=1.2)
            body = draw_shadow_wings(body, phase * 3.0, spread=1.0, shoulder_y=17)
            pulse_hood_eyes(body, dy=-1, bright=True)

            # Full 360-degree harvest spin (-86 deg -> +274 deg)
            shaft_deg = -86.0 + u * 360.0
            slash_arc = (shaft_deg - 85.0, shaft_deg + 10.0, 21.0, 1.0)
            frame = draw_abyssal_scythe(
                body,
                grip_pos=(26, 22),
                shaft_deg=shaft_deg,
                shaft_reach=16.0,
                shaft_back=11.5,
                blade_span=18.5,
                blade_curve=6.4,
                blade_dir=1,
                rune_glow=3,
                slash_arc=slash_arc,
                two_handed=True
            )

        else:
            # Stage 3 (F21..F29): Drives Scythe Haft Vertically into the Ground to Detonate Grim Harvest Pillars!
            u = (f - 21) / 8.0
            crouch_d = [2, 4, 4, 3, 2, 1, 1, 0, 0][f - 21]
            wing_spread = max(0.0, 1.0 - u * 1.15)
            body = tpl['stand'].copy() if crouch_d == 0 else make_crouch_body(tpl, crouch_d)
            body = apply_cloak_wave(body, phase * 2.0, amplitude=2.0, vertical_flutter=0.8)
            body = draw_shadow_wings(body, phase * 2.0, spread=wing_spread, shoulder_y=18 + crouch_d)
            pulse_hood_eyes(body, dy=crouch_d, bright=(f <= 26))

            if f <= 26:
                # Haft planted vertically at x=33, blade arching high above, ground runes erupting at y=47..49
                frame = draw_abyssal_scythe(
                    body,
                    grip_pos=(31, 26 + crouch_d),
                    shaft_deg=-88.0,
                    shaft_reach=14.0,
                    shaft_back=20.0 - crouch_d,
                    blade_span=17.5,
                    blade_curve=6.0,
                    blade_dir=1,
                    rune_glow=3 if f <= 24 else 2,
                    two_handed=True
                )
                # Erupting Grim Harvest shock-sigil at base of planted haft (x=24..44, y=47..49)
                sigil_r = 4 + (f - 21) * 3
                for dx_s in range(-sigil_r, sigil_r + 1):
                    sx_p = 31 + dx_s
                    if 2 <= sx_p < 50:
                        set_px(frame, sx_p, 49, VIOLET_BRIGHT if dx_s % 2 == 0 else CRIMSON_BRIGHT)
                        if abs(dx_s) % 3 == 0 and f <= 24:
                            set_px(frame, sx_p, 47, SOUL_WHITE)
                            set_px(frame, sx_p, 48, VIOLET_PINK)
            else:
                # F27..F29: Smooth return from planted haft to ready stance
                u_rec = (f - 26) / 3.0
                shaft_deg = -88.0 * (1.0 - u_rec) + (-34.0) * u_rec
                frame = draw_abyssal_scythe(
                    body,
                    grip_pos=(int(round(31 * (1.0 - u_rec) + 26 * u_rec)), 25),
                    shaft_deg=shaft_deg,
                    shaft_reach=15.5,
                    shaft_back=13.0,
                    blade_span=17.5,
                    blade_curve=6.0,
                    blade_dir=1,
                    rune_glow=1,
                    two_handed=True
                )

        frames.append(frame)
    return frames


def build_row5_death(tpl):
    """
    Row 5: 30-Frame DEATH & HURT Sequence:
    - F00..F06: Hit-stagger recoil (HURT uses F00..F05)
    - F07..F17: Drops to one knee clutching his chest as his cloak settles
    - F18..F29: Collapses horizontally onto the ground (y=36..46) with his Abyssal Great-Scythe
      lying flat beside him (ZERO floating upright scythe!)
    """
    frames = []
    for f in range(30):
        if f <= 6:
            # F00..F06: Hit-stagger recoil
            u = f / 6.0
            dx = -int(round(math.sin(u * math.pi * 0.8) * 3.0))
            dy = int(round(u * 2.0))
            base = np.zeros((52, 52, 4), dtype=np.uint8)
            for y in range(52):
                for x in range(52):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < 52 and 0 <= nx < 52:
                        base[ny, nx] = tpl['stand'][y, x]
            base = apply_cloak_wave(base, u * math.pi, amplitude=1.8, vertical_flutter=0.6)
            frame = draw_abyssal_scythe(
                base,
                grip_pos=(26 + dx, 25 + dy),
                shaft_deg=-34.0 + u * 36.0,
                shaft_reach=15.0,
                shaft_back=12.0,
                blade_span=17.0,
                blade_curve=5.8,
                blade_dir=1,
                rune_glow=1,
                two_handed=False
            )
            frames.append(frame)

        elif f <= 17:
            # F07..F17: Drops to one knee clutching chest while Great-Scythe lowers diagonally toward the floor
            u = (f - 7) / 10.0
            base = (tpl['kneel1'] if f <= 11 else tpl['kneel2']).copy()
            if f >= 12:
                # Progressive head bow as strength fades
                drop = 1 if f <= 14 else 2
                head_slice = base[18:28, 15:29].copy()
                base[18:28, 15:29] = 0
                base[18 + drop:28 + drop, 15:29] = head_slice
            base = apply_cloak_wave(base, u * math.pi, amplitude=1.0 * (1.0 - u * 0.5), vertical_flutter=0.3)

            # Scythe tilts down from +8 deg to +26 deg (nearly horizontal low rest) — never stuck upright!
            shaft_deg = -10.0 * (1.0 - u) + 22.0 * u
            frame = draw_abyssal_scythe(
                base,
                grip_pos=(25, int(round(29 + u * 5))),
                shaft_deg=shaft_deg,
                shaft_reach=14.0,
                shaft_back=11.0,
                blade_span=16.0,
                blade_curve=5.2,
                blade_dir=1,
                rune_glow=1 if f <= 12 else 0,
                two_handed=False
            )
            frames.append(frame)

        elif f <= 22:
            # F18..F22: Collapsing forward/horizontally onto the arena floor (CW rotation = negative angle in PIL)
            u = (f - 17) / 5.0
            tilt_deg = -u * 75.0
            pil_kn = Image.fromarray(tpl['kneel2'], mode='RGBA')
            rot_arr = np.array(
                pil_kn.rotate(tilt_deg, resample=Image.NEAREST, center=(22, 44)),
                dtype=np.uint8
            )
            ys, xs = np.where(rot_arr[:, :, 3] > 0)
            max_y = ys.max() if len(ys) > 0 else 47
            drop_y = 46 - max_y
            shift_x = int(round(u * 3.0))

            body = np.zeros((52, 52, 4), dtype=np.uint8)
            for y in range(52):
                for x in range(52):
                    if rot_arr[y, x, 3] > 0:
                        ny = max(2, min(47, y + drop_y))
                        nx = max(2, min(49, x + shift_x))
                        body[ny, nx] = rot_arr[y, x]

            # Scythe settles flat along the ground (y=45..48)
            frame = draw_abyssal_scythe(
                body,
                grip_pos=(26, int(round(35 + u * 11))),
                shaft_deg=20.0 * (1.0 - u) + 2.0 * u,
                shaft_reach=14.0,
                shaft_back=13.0,
                blade_span=14.0 * (1.0 - u * 0.25),
                blade_curve=4.5 * (1.0 - u * 0.25),
                blade_dir=1,
                rune_glow=0,
                two_handed=False
            )
            frames.append(frame)

        else:
            # F23..F29: Collapsed horizontally on the ground (y=34..46) with Great-Scythe lying flat beside him
            k = f - 23
            body = tpl['fall'].copy()
            if k == 0:
                body = np.roll(body, -1, axis=0)
                body[-1, :] = 0

            # Draw single flat horizontal Great-Scythe resting on the floor (y=46..49)
            scythe_floor = np.zeros((52, 52, 4), dtype=np.uint8)
            draw_line_px(scythe_floor, 10, 46, 44, 46, OBSIDIAN_MID)
            draw_line_px(scythe_floor, 10, 47, 44, 47, OBSIDIAN_DEEP)
            draw_line_px(scythe_floor, 42, 46, 35, 49, VIOLET_MID if k <= 2 else OBSIDIAN_LIGHT)
            draw_line_px(scythe_floor, 43, 47, 33, 49, STEEL_LIGHT if k <= 1 else BONE_DARK)
            set_px(scythe_floor, 42, 46, CRIMSON_MID if k <= 3 else CRIMSON_DARK)
            # Fading soul-mote rising from fallen chest so every frame F23..F29 is distinct
            mote_x = 22 + k
            mote_y = 35 - k
            if 0 <= mote_y < 52:
                set_px(scythe_floor, mote_x, mote_y, VIOLET_BRIGHT if k <= 3 else CRIMSON_DARK)

            frame = composite_over(body, scythe_floor)
            frames.append(frame)

    return frames


def build_row6_dash(tpl):
    """
    Row 6: 30-Frame DASH (Wraith Phase-Rush):
    - Low horizontal wraith-blitz lunge with trailing crimson-violet shadow ribbons
      and forward-poised single Great-Scythe blade.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 3:
            u = f / 3.0
            crouch_d = [1, 2, 3, 2][f]
            body = make_crouch_body(tpl, crouch_d) if f <= 1 else tpl['dash'].copy()
            body = apply_cloak_wave(body, phase * 2.0, amplitude=2.0, is_dash=(f >= 2))
            pulse_hood_eyes(body, dy=crouch_d, bright=True)
            shaft_deg = -30.0 * (1.0 - u) + (-8.0) * u
            frame = draw_abyssal_scythe(
                body,
                grip_pos=(28, 25 + crouch_d),
                shaft_deg=shaft_deg,
                shaft_reach=15.0,
                shaft_back=12.0,
                blade_span=17.0,
                blade_curve=5.8,
                blade_dir=1,
                rune_glow=2,
                two_handed=True
            )
        elif f <= 21:
            k = f - 4
            hover_dy = int(round(math.sin((k / 17.0) * math.pi) * (-1.5)))
            body = np.zeros((52, 52, 4), dtype=np.uint8)
            for y in range(52):
                ny = y + hover_dy
                if 0 <= ny < 52:
                    body[ny, :] = tpl['dash'][y, :]
            body = apply_cloak_wave(body, k * 0.85, amplitude=2.4, is_dash=True)
            pulse_hood_eyes(body, dy=hover_dy, bright=True)

            # Mid-dash scythe slice at F11..F16
            if 11 <= f <= 16:
                u_s = (f - 11) / 5.0
                shaft_deg = -18.0 + u_s * 42.0
                slash_arc = (-22.0, shaft_deg + 8.0, 19.5, 0.9) if f <= 14 else None
            else:
                shaft_deg = -6.0 + math.sin(phase * 2.0) * 4.0
                slash_arc = None

            frame = draw_abyssal_scythe(
                body,
                grip_pos=(30, 26 + hover_dy),
                shaft_deg=shaft_deg,
                shaft_reach=14.5,
                shaft_back=13.0,
                blade_span=16.5,
                blade_curve=5.6,
                blade_dir=1,
                rune_glow=3 if 11 <= f <= 15 else 2,
                slash_arc=slash_arc,
                two_handed=True
            )
            # Trailing crimson-violet wraith shadow ribbons behind cloak (x=1..12, y=24..44)
            for r_i in range(4):
                rx = 2 + ((f * 3 + r_i * 4) % 10)
                ry = 24 + r_i * 5 + int(round(math.sin(phase * 2.0 + r_i) * 1.5))
                set_px(frame, rx, ry, VIOLET_BRIGHT if r_i % 2 == 0 else CRIMSON_BRIGHT)
                set_px(frame, max(0, rx - 1), ry, VIOLET_MID)
        else:
            u = (f - 21) / 8.0
            crouch_d = [2, 2, 1, 1, 0, 0, 0, 0][f - 22]
            body = tpl['stand'].copy() if crouch_d == 0 else make_crouch_body(tpl, crouch_d)
            body = apply_cloak_wave(body, phase, amplitude=1.6, vertical_flutter=0.6)
            pulse_hood_eyes(body, dy=crouch_d, bright=(f <= 25))
            shaft_deg = 16.0 * (1.0 - u) + (-34.0) * u
            frame = draw_abyssal_scythe(
                body,
                grip_pos=(int(round(29 * (1.0 - u) + 26 * u)), 25 + crouch_d),
                shaft_deg=shaft_deg,
                shaft_reach=15.0,
                shaft_back=12.5,
                blade_span=17.5,
                blade_curve=6.0,
                blade_dir=1,
                rune_glow=1,
                two_handed=True
            )

        frames.append(frame)
    return frames


def build_row7_crouch(tpl):
    """
    Row 7: 30-Frame CROUCH Sequence (Wraith-Shroud Low Stance & Phantom Scythe Boomerang Throw):
    - F00..F06: Drops into a low Wraith-Shroud crouch (up to 7px lower silhouette), wrapping his
      tattered shadow-cloak defensively while spinning his Great-Scythe low.
    - F07..F18: Hurls a spinning Phantom Scythe boomerang from his low crouch (release flash F11..F16).
    - F19..F29: Rises smoothly back to upright combat stance.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 6:
            depths = [0, 1, 3, 4, 5, 6, 7]
            d = depths[f]
            body = tpl['stand'].copy() if d == 0 else make_crouch_body(tpl, d)
            body = apply_cloak_wave(body, phase, amplitude=1.4, vertical_flutter=0.4)
            pulse_hood_eyes(body, dy=d, bright=(f >= 4))
            u = f / 6.0
            shaft_deg = -34.0 * (1.0 - u) + 8.0 * u
            frame = draw_abyssal_scythe(
                body,
                grip_pos=(26, 25 + d),
                shaft_deg=shaft_deg,
                shaft_reach=14.5,
                shaft_back=12.0,
                blade_span=16.5,
                blade_curve=5.5,
                blade_dir=1,
                rune_glow=2 if f >= 4 else 1,
                two_handed=True
            )
        elif f <= 18:
            d = 7
            body = make_crouch_body(tpl, d)
            if f in (11, 12):
                body = np.roll(body, 1, axis=1)
                body[:, 0] = 0
            body = apply_cloak_wave(body, phase * 1.6, amplitude=1.8, vertical_flutter=0.5)
            pulse_hood_eyes(body, dy=d, bright=True)

            if f <= 10:
                # Low crouch windup (F07..F10)
                u = (f - 7) / 3.0
                shaft_deg = 8.0 * (1.0 - u) + (-68.0) * u
                slash_arc = None
            elif f <= 16:
                # Low-stance Phantom Scythe boomerang release slash (F11..F16)!
                u = (f - 11) / 5.0
                shaft_deg = -55.0 * (1.0 - u) + 28.0 * u
                slash_arc = (-45.0, shaft_deg + 12.0, 19.0, 1.0 - u * 0.3)
            else:
                # Follow-through hold (F17..F18)
                u = (f - 16) / 2.0
                shaft_deg = 28.0 * (1.0 - u) + 12.0 * u
                slash_arc = None

            frame = draw_abyssal_scythe(
                body,
                grip_pos=(27, 25 + d),
                shaft_deg=shaft_deg,
                shaft_reach=14.5,
                shaft_back=11.5,
                blade_span=16.5,
                blade_curve=5.6,
                blade_dir=1,
                rune_glow=3 if 10 <= f <= 15 else 2,
                slash_arc=slash_arc,
                two_handed=True
            )
        else:
            depths = [7, 6, 6, 5, 4, 3, 2, 1, 1, 0, 0]
            k = f - 19
            d = depths[k]
            body = tpl['stand'].copy() if d == 0 else make_crouch_body(tpl, d)
            body = apply_cloak_wave(body, phase, amplitude=1.4, vertical_flutter=0.5)
            pulse_hood_eyes(body, dy=d, bright=(d >= 4))
            u = k / 10.0
            shaft_deg = 12.0 * (1.0 - u) + (-34.0) * u
            frame = draw_abyssal_scythe(
                body,
                grip_pos=(26, 25 + d),
                shaft_deg=shaft_deg,
                shaft_reach=15.0,
                shaft_back=12.5,
                blade_span=17.5,
                blade_curve=6.0,
                blade_dir=1,
                rune_glow=1,
                two_handed=True
            )

        frames.append(frame)
    return frames


def build_row8_jump(tpl):
    """
    Row 8: 30-Frame JUMP Sequence (Shadow-Wing Aerial Vault & Mid-Air Downward Scythe Reap):
    - ZERO bouncy-ball frames! Every single frame shows Malakor's full hooded skull, armor, cloak,
      articulated greaves, shadow-wings, and strictly ONE Abyssal Great-Scythe:
      * F00..F04: Knee-bend crouch & explosive shadow-jump launch
      * F05..F11: Ascending Shadow-Wing aerial vault with tattered cloak streaming
      * F12..F18: Apex mid-air downward Crescent Scythe cleave & phantom scythe launch
      * F19..F24: Descending wraith-glide
      * F25..F29: Grounded shock-absorbing landing
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 4:
            # F00..F04: Knee-bend launch
            crouch_seq = [1, 3, 5, 3, 0]
            d = crouch_seq[f]
            body = make_crouch_body(tpl, d) if d >= 2 else make_jump_body(tpl, d, tuck_amount=0.3)
            body = apply_cloak_wave(body, phase * 2.0, amplitude=1.8, vertical_flutter=0.8)
            body = draw_shadow_wings(body, phase * 2.0, spread=0.25 * f, shoulder_y=18 + d)
            pulse_hood_eyes(body, dy=d, bright=True)
            shaft_deg = [-34.0, -20.0, -10.0, -42.0, -68.0][f]
            frame = draw_abyssal_scythe(
                body,
                grip_pos=(26, 25 + d),
                shaft_deg=shaft_deg,
                shaft_reach=15.0,
                shaft_back=12.0,
                blade_span=17.0,
                blade_curve=5.8,
                blade_dir=1,
                rune_glow=2,
                two_handed=True
            )
        elif f <= 11:
            # F05..F11: Ascending Shadow-Wing aerial vault with full body & streaming cloak
            u = (f - 5) / 6.0
            tuck = 0.55 + 0.45 * math.sin(u * math.pi * 0.7)
            body = make_jump_body(tpl, -1, tuck_amount=tuck, torso_lean_dx=1)
            body = apply_cloak_wave(body, phase * 2.0, amplitude=2.3, vertical_flutter=1.1)
            body = draw_shadow_wings(body, phase * 2.0, spread=0.95, shoulder_y=17)
            pulse_hood_eyes(body, dy=-1, bright=True)
            # Raising Great-Scythe high behind shoulder (-68 deg -> -118 deg) for apex downward cleave
            shaft_deg = -68.0 * (1.0 - u) + (-118.0) * u
            frame = draw_abyssal_scythe(
                body,
                grip_pos=(25, 21),
                shaft_deg=shaft_deg,
                shaft_reach=15.0,
                shaft_back=11.0,
                blade_span=17.5,
                blade_curve=6.0,
                blade_dir=1,
                rune_glow=3 if f >= 9 else 2,
                two_handed=True
            )
        elif f <= 18:
            # F12..F18: Apex mid-air downward Crescent Scythe cleave (+24 deg downward reap) & Phantom Scythe launch!
            u = (f - 12) / 6.0
            ease = 1.0 - math.pow(1.0 - u, 2.0)
            body = make_jump_body(tpl, -1, tuck_amount=0.95 - u * 0.15, torso_lean_dx=1 if f <= 16 else 0)
            body = apply_cloak_wave(body, phase * 2.5, amplitude=2.5, vertical_flutter=1.2)
            body = draw_shadow_wings(body, phase * 2.5, spread=1.0, shoulder_y=17)
            pulse_hood_eyes(body, dy=-1, bright=True)

            shaft_deg = -105.0 * (1.0 - ease) + 48.0 * ease
            slash_arc = (-85.0, shaft_deg + 14.0, 20.5, 1.0 - u * 0.25) if f <= 17 else None
            frame = draw_abyssal_scythe(
                body,
                grip_pos=(27, 22),
                shaft_deg=shaft_deg,
                shaft_reach=15.5,
                shaft_back=11.5,
                blade_span=18.0,
                blade_curve=6.2,
                blade_dir=1,
                rune_glow=3,
                slash_arc=slash_arc,
                two_handed=True
            )
        elif f <= 24:
            # F19..F24: Descending wraith-glide with shadow-wings & cloak streaming upward
            u = (f - 19) / 5.0
            tuck = 0.75 * (1.0 - u * 0.65)
            body = make_jump_body(tpl, 0, tuck_amount=tuck)
            body = apply_cloak_wave(body, phase * 2.0, amplitude=2.1, vertical_flutter=1.0)
            body = draw_shadow_wings(body, phase * 2.0, spread=0.85 * (1.0 - u * 0.5), shoulder_y=18)
            pulse_hood_eyes(body, dy=0, bright=True)
            shaft_deg = 48.0 * (1.0 - u) + (-18.0) * u
            frame = draw_abyssal_scythe(
                body,
                grip_pos=(26, 24),
                shaft_deg=shaft_deg,
                shaft_reach=15.0,
                shaft_back=12.0,
                blade_span=17.5,
                blade_curve=6.0,
                blade_dir=1,
                rune_glow=2,
                two_handed=True
            )
        else:
            # F25..F29: Grounded shock-absorbing landing
            k = f - 25
            crouch_depths = [3, 4, 2, 1, 0]
            d = crouch_depths[k]
            body = tpl['stand'].copy() if d == 0 else make_crouch_body(tpl, d)
            body = apply_cloak_wave(body, phase, amplitude=1.6, vertical_flutter=0.6)
            pulse_hood_eyes(body, dy=d, bright=(k <= 2))
            u = k / 4.0
            shaft_deg = -18.0 * (1.0 - u) + (-34.0) * u
            frame = draw_abyssal_scythe(
                body,
                grip_pos=(26, 25 + d),
                shaft_deg=shaft_deg,
                shaft_reach=15.5,
                shaft_back=13.0,
                blade_span=17.5,
                blade_curve=6.0,
                blade_dir=1,
                rune_glow=1,
                two_handed=True
            )

        frames.append(frame)
    return frames


def main():
    src = load_source_cells()
    tpl = make_clean_templates(src)

    rows = [
        ('ROW 0: IDLE (30 FRAMES)', build_row0_idle(tpl)),
        ('ROW 1: WALK (30 FRAMES)', build_row1_walk(tpl)),
        ('ROW 2: AUTO_ATTACK - ABYSSAL SCYTHE REAP (30 FRAMES)', build_row2_auto_attack(tpl)),
        ('ROW 3: SKILL - SPECTRAL CHAIN & GUILLOTINE SLAM (30 FRAMES)', build_row3_skill(tpl)),
        ('ROW 4: ULTIMATE - GRIM HARVEST: SOVEREIGN OF DEATH (30 FRAMES)', build_row4_ultimate(tpl)),
        ('ROW 5: DEATH & HURT (30 FRAMES)', build_row5_death(tpl)),
        ('ROW 6: DASH - WRAITH PHASE-RUSH (30 FRAMES)', build_row6_dash(tpl)),
        ('ROW 7: CROUCH - WRAITH-SHROUD & LOW SCYTHE THROW (30 FRAMES)', build_row7_crouch(tpl)),
        ('ROW 8: JUMP - SHADOW-WING VAULT & AERIAL REAP (30 FRAMES)', build_row8_jump(tpl)),
    ]

    num_rows = len(rows)
    cell_px = 208
    sheet = Image.new('RGBA', (30 * cell_px, num_rows * cell_px), (0, 0, 0, 0))

    for r_idx, (r_name, r_frames) in enumerate(rows):
        assert len(r_frames) == 30, f'{r_name} has {len(r_frames)} frames instead of 30'
        adj_diffs = sum(1 for i in range(29) if np.any(r_frames[i] != r_frames[i + 1]))
        print(f'{r_name:62s}: 30 frames generated, {adj_diffs}/29 adjacent transitions distinct')
        for c_idx, arr in enumerate(r_frames):
            cell_im = Image.fromarray(arr, mode='RGBA').resize((cell_px, cell_px), Image.NEAREST)
            sheet.paste(cell_im, (c_idx * cell_px, r_idx * cell_px))

    sheet.save('assets/sprites/reaper_sheet.png')
    print('Saved assets/sprites/reaper_sheet.png:', sheet.size)

    # Render contact sheets: left (F00..F14) and right (F15..F29) halves in artifact directory
    preview_cell = 96
    pad_top = 24
    dbg = Image.new('RGBA', (30 * preview_cell, num_rows * (preview_cell + pad_top)), (15, 12, 26, 255))
    draw = ImageDraw.Draw(dbg)
    for r_idx, (r_name, r_frames) in enumerate(rows):
        y0 = r_idx * (preview_cell + pad_top)
        draw.rectangle([0, y0, 30 * preview_cell, y0 + pad_top - 2], fill=(28, 18, 46, 255))
        draw.text((8, y0 + 5), r_name, fill=(216, 180, 254, 255))
        for c_idx, arr in enumerate(r_frames):
            x0 = c_idx * preview_cell
            draw.text((x0 + 4, y0 + 13), f'F{c_idx:02d}', fill=(244, 63, 94, 255))
            p_im = Image.fromarray(arr, mode='RGBA').resize((preview_cell, preview_cell), Image.NEAREST)
            dbg.paste(p_im, (x0, y0 + pad_top), p_im)
            draw.rectangle([x0, y0 + pad_top, x0 + preview_cell - 1, y0 + pad_top + preview_cell - 1], outline=(48, 32, 72, 255))

    art_dir = '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/4f1fb80f-a88f-4496-9746-b4b9fe84f6d4'
    left_path = f'{art_dir}/debug_reaper_30fps_left_F00_F14.png'
    right_path = f'{art_dir}/debug_reaper_30fps_right_F15_F29.png'
    dbg.crop((0, 0, 15 * preview_cell, dbg.height)).save(left_path)
    dbg.crop((15 * preview_cell, 0, 30 * preview_cell, dbg.height)).save(right_path)
    print('Saved debug sheets:', left_path, right_path)


if __name__ == '__main__':
    main()
