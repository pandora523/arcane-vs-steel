#!/usr/bin/env python3
"""
Builds Ignis Sol's (FireMage) 30-Frame-Per-Animation HD-2D Sprite Sheet:
- 9 rows x 30 columns = 270 unique frames (6240 x 1872 at 208x208 per cell):
  * Row 0: IDLE (30 frames)
  * Row 1: WALK (30 frames)
  * Row 2: AUTO_ATTACK (30 frames)
  * Row 3: SKILL - HELLFIRE PILLARS & SOLAR DETONATION (30 frames)
  * Row 4: ULTIMATE - CATACLYSM: ECLIPSE SUPERNOVA (30 frames)
  * Row 5: DEATH & HURT (30 frames)
  * Row 6: DASH - FLAME-STEP BLINK (30 frames)
  * Row 7: CROUCH - FLAME-WARD CROUCH & LOW FIREBALL (30 frames)
  * Row 8: JUMP - FLAME-GLIDE VAULT & DOWNWARD FIREBALL (30 frames)
- All 270 frames face RIGHT (+X) to match Archer and Warrior.
- Single articulated Solar Sun-Staff (draw_sun_staff) per frame, zero duplicate weapons or extra limbs,
  zero bouncy-ball jump frames, zero floating upright staff on death.
"""

import math
import numpy as np
from PIL import Image, ImageDraw

OUTLINE = (11, 15, 25, 255)

# Pyromancer Crimson & Dark Mantle Palette (extracted from backups/mage_sheet_before_30fps.png)
CRIMSON_BRIGHT = (185, 44, 46, 255)
CRIMSON_MID = (154, 38, 40, 255)
CRIMSON_DEEP = (120, 21, 37, 255)
CRIMSON_DARK = (90, 34, 37, 255)
ROBE_SHADOW = (50, 29, 37, 255)
MANTLE_DARK = (25, 24, 34, 255)

ROBE_LIGHT = CRIMSON_BRIGHT
ROBE_MID = CRIMSON_MID
ROBE_DARK = CRIMSON_DARK
SKIN_LIGHT = (252, 211, 167, 255)
SKIN_MID = (217, 155, 108, 255)

# Burnished Sun-Gold & Bronze Trim Palette
GOLD_BRIGHT = (242, 198, 108, 255)
GOLD_MID = (207, 158, 85, 255)
GOLD_TRIM = (157, 93, 51, 255)
GOLD_DARK = (107, 75, 48, 255)
WOOD_DARK = (69, 43, 38, 255)
WOOD_DEEP = (39, 24, 27, 255)

# Solar Fire & Eclipse Palette
SOLAR_WHITE = (255, 252, 235, 255)
SOLAR_YELLOW = (254, 240, 138, 255)
FLAME_GOLD = (250, 204, 21, 255)
FLAME_ORANGE = (251, 146, 60, 255)
FLAME_CRIMSON = (234, 88, 12, 255)
FLAME_DEEP = (185, 28, 28, 255)
VOID_BLACK = (10, 6, 18, 255)
VOID_VIOLET = (88, 28, 135, 255)


def load_source_cells(path='backups/mage_sheet_before_30fps.png'):
    im = Image.open(path).convert('RGBA')

    def cell(r, c):
        return np.array(
            im.crop((c * 208, r * 208, (c + 1) * 208, (r + 1) * 208)).resize((52, 52), Image.NEAREST),
            dtype=np.uint8
        )

    return {
        'idle': cell(0, 0),
        'walk1': cell(1, 1),
        'atk_prep': cell(2, 0),
        'atk_cast': cell(2, 3),
        'kneel1': cell(4, 1),
        'kneel2': cell(4, 3),
        'fall': cell(4, 4),
        'dash': cell(5, 1),
    }


def set_px(buf, x, y, col):
    ix = int(round(x))
    iy = int(round(y))
    if 2 <= ix <= 49 and 2 <= iy <= 49:
        buf[iy, ix] = col


def draw_line_px(buf, x0, y0, x1, y1, col):
    steps = int(max(abs(x1 - x0), abs(y1 - y0), 1))
    for i in range(steps + 1):
        t = i / steps
        set_px(buf, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, col)


def add_outline_to_layer(layer):
    """
    Returns `layer.copy()` without dilating opaque black pixels into transparent space,
    because `PixelForge.js` (ensureNormalMap + drawSheetFrame) renders the 1px
    comic ink outline and 1px exterior rim dynamically at runtime.
    """
    return layer.copy()


def fill_layer_pinholes(layer, x0=2, x1=49, y0=2, y1=49, require_3_neighbors=False):
    """
    Fills 1px transparent pinholes/slits inside moved, waved, or rotated pixel layers
    so movement never causes missing interior pixels or torn seams.
    """
    out = layer.copy()
    for _ in range(2):
        prev = out.copy()
        alpha = prev[:, :, 3] > 0
        for y in range(max(2, y0), min(50, y1)):
            for x in range(max(2, x0), min(50, x1)):
                if alpha[y, x]:
                    continue
                up = alpha[y - 1, x]
                dn = alpha[y + 1, x]
                lf = alpha[y, x - 1]
                rt = alpha[y, x + 1]
                if (up and dn) or (lf and rt):
                    n_cnt = int(up) + int(dn) + int(lf) + int(rt)
                    if not require_3_neighbors or n_cnt >= 3:
                        if up:
                            out[y, x] = prev[y - 1, x]
                        elif lf:
                            out[y, x] = prev[y, x - 1]
                        elif dn:
                            out[y, x] = prev[y + 1, x]
                        elif rt:
                            out[y, x] = prev[y, x + 1]
    return out


def shift_layer(layer, dx=0, dy=0):
    """
    Shifts `layer` by `(dx, dy)` inside safe cell bounds `[2..49]` without `np.roll` wrap-around,
    then fills any 1px pinholes.
    """
    out = np.zeros_like(layer)
    for y in range(52):
        ny = y + int(round(dy))
        if 2 <= ny <= 49:
            for x in range(52):
                nx = x + int(round(dx))
                if 2 <= nx <= 49 and layer[y, x, 3] > 0:
                    out[ny, nx] = layer[y, x]
    return fill_layer_pinholes(out)


def ensure_safe_cell(cell, margin=2):
    """
    Guarantees zero pixels touch the outer 2px border (keeping all pixels strictly inside
    2 <= x <= 49 and 2 <= y <= 49) and fills any 1px interior pinholes from movement.
    """
    min_b = max(2, int(margin))
    max_b = 51 - min_b
    out = fill_layer_pinholes(cell, min_b, max_b, min_b, max_b, require_3_neighbors=True)
    ys, xs = np.where(out[:, :, 3] > 0)
    if len(ys) == 0:
        return out
    ymin, ymax = int(ys.min()), int(ys.max())
    xmin, xmax = int(xs.min()), int(xs.max())

    dy = 0
    if ymin < min_b and ymax < max_b:
        dy = min(min_b - ymin, max_b - ymax)
    elif ymax > max_b and ymin > min_b:
        dy = -min(ymax - max_b, ymin - min_b)

    dx = 0
    if xmin < min_b and xmax < max_b:
        dx = min(min_b - xmin, max_b - xmax)
    elif xmax > max_b and xmin > min_b:
        dx = -min(xmax - max_b, xmin - min_b)

    if dx != 0 or dy != 0:
        shifted = np.zeros_like(out)
        for y in range(52):
            ny = y + dy
            if min_b <= ny <= max_b:
                for x in range(52):
                    nx = x + dx
                    if min_b <= nx <= max_b and out[y, x, 3] > 0:
                        shifted[ny, nx] = out[y, x]
        out = shifted

    out[:min_b, :, :] = 0
    out[max_b + 1:, :, :] = 0
    out[:, :min_b, :] = 0
    out[:, max_b + 1:, :] = 0
    return out


def composite_over(base, over):
    res = base.copy()
    mask = over[:, :, 3] > 0
    res[mask] = over[mask]
    return res


def neutralize_mage_baked_arms(cell, mode='stand'):
    """
    Preserves Ignis Sol's full A-line crimson robe (`x = 28..34` on the right) and left hanging
    cloak/sleeve (`x = 10..16` on the left), while cleanly stripping ONLY his baked-in Sun Staff
    and extended right hand so a single articulated `draw_sun_staff` + Right IK Arm can be animated.
    """
    out = cell.copy()

    if mode == 'stand':
        # 1. Strip ONLY the right-side Sun Staff and extended hand while preserving the full A-line robe:
        #    - y < 16: strip x >= 28 (Sun-Staff head above shoulder)
        #    - 16 <= y <= 26: strip x >= 30 (where the staff hand reaches out)
        #    - 27 <= y <= 34: strip x >= 33 (preserving right hip/robe flare at x = 28..32)
        #    - y >= 35: strip x >= 35 (preserving full A-line lower crimson robe flare at x = 28..34)
        out[0:16, 28:52] = 0
        out[16:27, 30:52] = 0
        out[27:35, 33:52] = 0
        out[35:52, 35:52] = 0

        # 2. Gently shade only overly bright skin/gold hand pixels in x = 24..29, y = 18..25
        #    without flattening his shoulder pad (y = 14..17), left sleeve (x = 10..23), or waist belt (y = 26..29)
        for y in range(18, 26):
            for x in range(24, 30):
                r, g, b, a = out[y, x]
                if a > 0 and r > 190 and g > 130:
                    out[y, x] = GOLD_TRIM if x <= 25 else ROBE_MID

    elif mode == 'kneel':
        # Erase protruding right staff and hand on kneeling templates while preserving left cloak and robe
        out[0:17, 32:52] = 0
        out[17:30, 31:52] = 0
        out[30:52, 35:52] = 0

        for y in range(18, 26):
            for x in range(24, 31):
                r, g, b, a = out[y, x]
                if a > 0 and r > 190 and g > 130:
                    out[y, x] = GOLD_TRIM if x <= 25 else ROBE_MID

    elif mode == 'dash':
        # Erase protruding right staff on dash template while preserving full streaming cloak and robe
        out[0:18, 35:52] = 0
        out[18:48, 34:52] = 0
        for y in range(20, 27):
            for x in range(28, 34):
                r, g, b, a = out[y, x]
                if a > 0 and r > 190 and g > 130:
                    out[y, x] = ROBE_MID

    return out


def make_clean_templates(src):
    """
    Extracts clean, right-facing (+X) templates from `backups/mage_sheet_before_30fps.png`,
    preserving Ignis's full A-line crimson robe and left cloak while stripping the baked-in staff.
    """
    # 1. Clean standing body facing RIGHT (full A-line crimson robe & left cloak intact)
    stand = neutralize_mage_baked_arms(src['idle'], mode='stand')

    # Orient Ignis's glowing golden eyes inside the hood (y=16..18) so he gazes clearly RIGHT (+X)
    for y in range(16, 19):
        for x in range(19, 28):
            if stand[y, x, 3] > 0:
                stand[y, x] = MANTLE_DARK
    set_px(stand, 23, 17, FLAME_ORANGE)
    set_px(stand, 24, 17, SOLAR_YELLOW)
    set_px(stand, 26, 17, FLAME_ORANGE)
    set_px(stand, 27, 17, SOLAR_YELLOW)
    set_px(stand, 24, 16, GOLD_TRIM)
    set_px(stand, 27, 16, GOLD_TRIM)
    stand[0:2, :, :] = 0
    stand[50:, :, :] = 0
    stand[:, 0:2, :] = 0
    stand[:, 50:, :] = 0
    stand = fill_layer_pinholes(add_outline_to_layer(stand))

    # Extract Ignis's Left/Back Boot and Right/Front Boot from `stand`
    leg_back_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_front_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_back_patch[44:50, 15:23] = stand[44:50, 15:23]
    leg_front_patch[44:50, 24:32] = stand[44:50, 24:32]

    # Upper torso + full robe down to y=44 (without bottom boot tips y >= 45)
    stand_upper = stand.copy()
    stand_upper[45:, :, :] = 0
    stand_upper = fill_layer_pinholes(add_outline_to_layer(stand_upper))

    # 2. Clean forward-leaning casting body (hat & upper torso leaned +1px right, full robe preserved)
    cast_body = np.zeros((52, 52, 4), dtype=np.uint8)
    for y in range(52):
        lean_dx = 1 if y <= 27 else 0
        for x in range(52):
            if stand[y, x, 3] > 0:
                nx = min(50, x + lean_dx)
                cast_body[y, nx] = stand[y, x]
    cast_body = fill_layer_pinholes(add_outline_to_layer(cast_body))

    # 3. Clean kneeling bodies (kneel1, kneel2) facing RIGHT without baked-in staff
    kneel1 = neutralize_mage_baked_arms(src['kneel1'], mode='kneel')
    kneel2 = neutralize_mage_baked_arms(src['kneel2'], mode='kneel')
    for kn in (kneel1, kneel2):
        ys_k, _ = np.where(kn[:, :, 3] > 0)
        if len(ys_k) > 0 and ys_k.max() >= 49:
            shift_up = int(ys_k.max() - 48)
            kn_s = np.zeros_like(kn)
            kn_s[:52 - shift_up, :] = kn[shift_up:, :]
            kn[:, :, :] = kn_s
        kn[0:2, :, :] = 0
        kn[49:, :, :] = 0
        kn[:, 0:2, :] = 0
        kn[:, 50:, :] = 0
    kneel1 = fill_layer_pinholes(add_outline_to_layer(kneel1))
    kneel2 = fill_layer_pinholes(add_outline_to_layer(kneel2))

    # 4. Clean horizontal collapsed body on the ground
    fall_raw = np.fliplr(src['fall']).copy()
    fall_raw[42:, :, :] = 0
    fall_raw[41, 34:, :] = 0
    fall = np.zeros((52, 52, 4), dtype=np.uint8)
    for y in range(25, 42):
        ny = min(48, y + 6)
        fall[ny, :] = fall_raw[y, :]
    fall[0:2, :, :] = 0
    fall[49:, :, :] = 0
    fall[:, 0:2, :] = 0
    fall[:, 50:, :] = 0
    fall = fill_layer_pinholes(add_outline_to_layer(fall))

    # 5. Clean aerodynamic Flame-Step Dash body facing RIGHT (baked right staff stripped)
    dash = neutralize_mage_baked_arms(np.fliplr(src['dash']).copy(), mode='dash')
    set_px(dash, 31, 20, FLAME_ORANGE)
    set_px(dash, 32, 20, SOLAR_YELLOW)
    dash[0:2, :, :] = 0
    dash[49:, :, :] = 0
    dash[:, 0:2, :] = 0
    dash[:, 50:, :] = 0
    dash = fill_layer_pinholes(add_outline_to_layer(dash))

    return {
        'stand': stand,
        'stand_upper': stand_upper,
        'cast_body': cast_body,
        'glide1': stand,
        'glide2': cast_body,
        'leg_back': leg_back_patch,
        'leg_front': leg_front_patch,
        'kneel1': kneel1,
        'kneel2': kneel2,
        'fall': fall,
        'dash': dash,
    }


def apply_robe_cloak_wave(frame, phase_rad, amplitude=1.5, vertical_flutter=0.6, is_dash=False):
    """
    Applies a smooth 30-frame traveling pyromantic wind/heat wave to Ignis Sol's
    crimson-and-gold left cloak edge (`x = 10..16`) without chopping or detaching his cloak.
    """
    out = frame.copy()
    if is_dash:
        cloak_region = frame[21:41, 0:24].copy()
        out[21:41, 0:24] = 0
        for y in range(21, 41):
            for x in range(0, 24):
                if cloak_region[y - 21, x, 3] == 0:
                    continue
                if y >= 35 and x >= 17:
                    out[y, max(2, x)] = cloak_region[y - 21, x]
                    continue
                dist_from_shoulder = max(0.0, (24 - x) / 20.0)
                dy = int(round(math.sin(phase_rad - dist_from_shoulder * 3.2) * amplitude * dist_from_shoulder))
                dx = int(round(math.cos(phase_rad * 2.0 - dist_from_shoulder * 2.4) * 0.8 * dist_from_shoulder))
                ny = max(16, min(46, y + dy))
                nx = max(2, min(24, x + dx))
                out[ny, nx] = cloak_region[y - 21, x]
                if x >= 15 and out[y, x, 3] == 0:
                    out[y, x] = cloak_region[y - 21, x]
        out = fill_layer_pinholes(out)
        return add_outline_to_layer(out)

    # Gentle left cloak-edge ripple (x = 9..17, y = 20..44) anchored seamlessly to cloak
    for y in range(20, 45):
        u = (y - 20) / 24.0
        wave_x = math.sin(phase_rad - u * 3.5) * min(1.2, amplitude * 0.65) * u
        dx = int(round(wave_x))
        if dx < 0:
            for x in range(9, 18):
                if frame[y, x, 3] > 0 and not np.array_equal(frame[y, x], OUTLINE):
                    nx = max(2, x - 1)
                    out[y, nx] = frame[y, x]
                    break

    out = fill_layer_pinholes(out)
    return add_outline_to_layer(out)


apply_mantle_wave = apply_robe_cloak_wave


def solve_ik_elbow(sx, sy, hx, hy, L1=4.5, L2=4.3, bend_side=1.0):
    """
    2-Bone Inverse Kinematics solver returning the anatomical elbow joint (ex, ey)
    between shoulder (sx, sy) and hand (hx, hy) with compact natural proportions L1=4.5, L2=4.3.
    """
    dx = float(hx - sx)
    dy = float(hy - sy)
    dist = max(0.8, math.hypot(dx, dy))
    max_reach = L1 + L2 - 0.15
    if dist > max_reach:
        dx *= max_reach / dist
        dy *= max_reach / dist
        dist = max_reach
    ux, uy = dx / dist, dy / dist
    px, py = -uy * bend_side, ux * bend_side
    a = (L1 * L1 - L2 * L2 + dist * dist) / (2.0 * dist)
    h = math.sqrt(max(0.0, L1 * L1 - a * a))
    ex = sx + ux * a + px * h
    ey = sy + uy * a + py * h
    return ex, ey


def draw_ik_mage_arm(layer, sx, sy, hx, hy, L1=4.5, L2=4.3, bend_side=1.0, is_offhand=False):
    """
    Draws Ignis Sol's single sculpted 2-segment Right Staff Pyromancer Arm from his true
    shoulder `(sx = 25 + dx_off, sy = 17 + dy_off)` to hand `(hx, hy)` with `L1 = 4.5, L2 = 4.3`.
    """
    ex, ey = solve_ik_elbow(sx, sy, hx, hy, L1=L1, L2=L2, bend_side=bend_side)

    c_hi, c_mid, c_dark = ROBE_LIGHT, ROBE_MID, ROBE_DARK
    c_gold, c_gold_dark = GOLD_BRIGHT, GOLD_MID
    c_skin_hi, c_skin_mid = SKIN_LIGHT, SKIN_MID

    # 1. 3px-thick crimson bell-sleeve upper arm from (sx, sy) to (ex, ey)
    u1x, u1y = ex - sx, ey - sy
    d1 = max(1.0, math.hypot(u1x, u1y))
    n1x, n1y = -u1y / d1, u1x / d1
    draw_line_px(layer, sx + n1x * 0.85, sy + n1y * 0.85, ex + n1x * 0.75, ey + n1y * 0.75, c_hi)
    draw_line_px(layer, sx - n1x * 0.85, sy - n1y * 0.85, ex - n1x * 0.75, ey - n1y * 0.75, c_dark)
    draw_line_px(layer, sx, sy, ex, ey, c_mid)

    # 2. 3px-thick forearm sleeve + ornate gold bracer cuff from (ex, ey) to (hx, hy)
    u2x, u2y = hx - ex, hy - ey
    d2 = max(1.0, math.hypot(u2x, u2y))
    n2x, n2y = -u2y / d2, u2x / d2
    draw_line_px(layer, ex + n2x * 0.85, ey + n2y * 0.85, hx + n2x * 0.65, hy + n2y * 0.65, c_hi)
    draw_line_px(layer, ex - n2x * 0.85, ey - n2y * 0.85, hx - n2x * 0.65, hy - n2y * 0.65, c_dark)
    draw_line_px(layer, ex, ey, hx, hy, c_mid)

    # Ornate gold bracer cuff near wrist
    cx_w = ex + u2x * 0.68
    cy_w = ey + u2y * 0.68
    set_px(layer, cx_w, cy_w, c_gold)
    set_px(layer, cx_w + n2x * 0.75, cy_w + n2y * 0.75, c_gold)
    set_px(layer, cx_w - n2x * 0.75, cy_w - n2y * 0.75, c_gold_dark)

    # 3. Rotating crimson-and-gold pyromancer mantle shoulder cap at (sx, sy)
    ux1, uy1 = u1x / d1, u1y / d1
    for p_step in (-1.0, -0.4, 0.4, 1.0):
        px_s = sx + ux1 * 0.8 + n1x * p_step
        py_s = sy + uy1 * 0.8 + n1y * p_step
        set_px(layer, px_s, py_s, c_gold if abs(p_step) > 0.8 else c_hi)
        set_px(layer, sx + n1x * p_step, sy + n1y * 0.85 * p_step, c_mid)
    set_px(layer, sx, sy - 1, c_gold)

    # 4. Golden rune-trimmed elbow fold at (ex, ey)
    set_px(layer, ex, ey, c_gold)
    set_px(layer, ex + n1x * 0.7, ey + n1y * 0.7, c_hi)
    set_px(layer, ex - n1x * 0.7, ey - n1y * 0.7, c_gold_dark)

    # 5. 2x2 warm skin/flame-lit hand gripping the staff at (hx, hy)
    set_px(layer, hx, hy, c_skin_hi)
    set_px(layer, hx + 1, hy, c_skin_hi)
    set_px(layer, hx, hy + 1, c_skin_mid)
    set_px(layer, hx + 1, hy + 1, c_skin_mid)


def draw_left_spell_arm(c, sh_x, sh_y, hand_x, hand_y, orb_radius=0, flare=0.0, mode='orb', phase_rad=0.0):
    """
    Draws Ignis Sol's articulated Left Spellcasting Arm from off-hand shoulder `(sh_x, sh_y)`
    to spellcasting hand `(hand_x, hand_y)` with optional glowing Solar Fireball Orb (`orb_radius`),
    blazing Solar Sigil (`mode='sigil'`), Eclipse channeling arcs (`mode='eclipse'`),
    spinning Flame-Ward shield ring (`mode='ward'`), and forward solar projection (`flare`).
    """
    arm_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    fx_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    sx = max(21.0, min(28.0, float(sh_x)))
    sy = max(13.0, min(27.0, float(sh_y)))
    hx = max(25.0, min(38.0, float(hand_x)))
    hy = max(11.0, min(32.0, float(hand_y)))

    bend_dir = -1.0 if hy < sy - 1.5 else 1.0
    ex, ey = solve_ik_elbow(sx, sy, hx, hy, L1=4.2, L2=4.0, bend_side=bend_dir)

    # 1. Sculpted crimson & dark-gold off-hand spellcaster sleeve
    u1x, u1y = ex - sx, ey - sy
    d1 = max(1.0, math.hypot(u1x, u1y))
    n1x, n1y = -u1y / d1, u1x / d1
    draw_line_px(arm_layer, sx + n1x * 0.75, sy + n1y * 0.75, ex + n1x * 0.65, ey + n1y * 0.65, CRIMSON_BRIGHT)
    draw_line_px(arm_layer, sx - n1x * 0.75, sy - n1y * 0.75, ex - n1x * 0.65, ey - n1y * 0.65, CRIMSON_DARK)
    draw_line_px(arm_layer, sx, sy, ex, ey, CRIMSON_MID)

    u2x, u2y = hx - ex, hy - ey
    d2 = max(1.0, math.hypot(u2x, u2y))
    n2x, n2y = -u2y / d2, u2x / d2
    draw_line_px(arm_layer, ex + n2x * 0.75, ey + n2y * 0.75, hx + n2x * 0.55, hy + n2y * 0.55, CRIMSON_BRIGHT)
    draw_line_px(arm_layer, ex - n2x * 0.75, ey - n2y * 0.75, hx - n2x * 0.55, hy - n2y * 0.55, CRIMSON_DARK)
    draw_line_px(arm_layer, ex, ey, hx, hy, CRIMSON_MID)

    # Ornate gold spell-bracer cuff near wrist
    cx_w = ex + u2x * 0.68
    cy_w = ey + u2y * 0.68
    set_px(arm_layer, cx_w, cy_w, GOLD_BRIGHT)
    set_px(arm_layer, cx_w + n2x * 0.65, cy_w + n2y * 0.65, GOLD_MID)
    set_px(arm_layer, ex, ey, GOLD_TRIM)

    # 2x2 warm flame-lit left spellcasting hand at (hx, hy)
    hand_lit = SOLAR_YELLOW if (orb_radius > 0 or flare > 0.15) else SKIN_LIGHT
    set_px(arm_layer, hx, hy, hand_lit)
    set_px(arm_layer, hx + 1, hy, hand_lit)
    set_px(arm_layer, hx, hy + 1, SKIN_LIGHT)
    set_px(arm_layer, hx + 1, hy + 1, SKIN_MID)

    # 2. Off-hand Spell VFX (Solar Fireball Orb, Solar Sigil, Eclipse Channel, or Flame-Ward Ring)
    eff_r = float(orb_radius)
    eff_flare = float(flare)

    if mode == 'ward' and eff_r > 0:
        # Spinning vertical elliptical Flame-Ward shield ring in front of extended left hand
        wcx = min(44.0, hx + 3.0)
        wcy = max(18.0, min(35.0, hy))
        rx_w = 2.4
        ry_w = min(6.0, eff_r + 2.0)
        for s in range(20):
            a = (s / 20.0) * 2.0 * math.pi + phase_rad * 2.5
            px_w = max(3.0, min(48.0, wcx + math.cos(a) * rx_w))
            py_w = max(3.0, min(48.0, wcy + math.sin(a) * ry_w))
            if s % 5 == 0:
                col_w = SOLAR_WHITE
            elif s % 2 == 0:
                col_w = SOLAR_YELLOW
            else:
                col_w = FLAME_ORANGE if s % 3 == 0 else FLAME_CRIMSON
            set_px(fx_layer, px_w, py_w, col_w)
        # Inner ward nexus & spoken rune bars
        set_px(fx_layer, wcx, wcy, SOLAR_WHITE)
        set_px(fx_layer, wcx - 1, wcy, SOLAR_YELLOW)
        set_px(fx_layer, wcx, wcy - 2, FLAME_GOLD)
        set_px(fx_layer, wcx, wcy + 2, FLAME_GOLD)

    elif mode == 'sigil' and eff_r > 0:
        # Blazing 8-point geometric Solar Sigil conjured in front of left hand
        scx = min(43.0, hx + 3.0)
        scy = max(10.0, min(34.0, hy - 0.5))
        sr = max(2.5, min(3.8, eff_r))
        set_px(fx_layer, scx, scy, SOLAR_WHITE)
        for s in range(12):
            a = (s / 12.0) * 2.0 * math.pi + phase_rad * 2.0
            rx_s = max(3.0, min(48.0, scx + math.cos(a) * sr))
            ry_s = max(3.0, min(48.0, scy + math.sin(a) * sr))
            set_px(fx_layer, rx_s, ry_s, SOLAR_YELLOW if s % 2 == 0 else FLAME_ORANGE)
            if s % 3 == 0:
                tx_s = max(3.0, min(48.0, scx + math.cos(a) * (sr + 1.4)))
                ty_s = max(3.0, min(48.0, scy + math.sin(a) * (sr + 1.4)))
                set_px(fx_layer, tx_s, ty_s, SOLAR_WHITE if s == 0 else FLAME_CRIMSON)

    elif mode == 'eclipse' and eff_r > 0:
        # Skyward channeling arcs from raised left hand (30, 14) into the Solar Eclipse orb above crown
        set_px(fx_layer, hx, max(3.0, hy - 1), SOLAR_WHITE)
        set_px(fx_layer, hx + 1, max(3.0, hy - 2), SOLAR_YELLOW)
        set_px(fx_layer, hx - 1, max(3.0, hy - 2), FLAME_ORANGE)
        draw_line_px(fx_layer, hx, max(4.0, hy - 1), 26, 9, SOLAR_YELLOW)
        set_px(fx_layer, 27, 11, VOID_VIOLET)

    elif eff_r > 0:
        # Glowing Solar Fireball Orb held in front of left hand
        ox = min(43.5, hx + 2.5)
        oy = max(6.0, min(42.0, hy - 0.8))
        ir = int(math.ceil(eff_r)) + 1
        for dy_o in range(-ir, ir + 1):
            for dx_o in range(-ir, ir + 1):
                d = math.hypot(dx_o, dy_o)
                if d <= eff_r:
                    px_o = max(3.0, min(48.0, ox + dx_o))
                    py_o = max(3.0, min(48.0, oy + dy_o))
                    if d <= eff_r * 0.42:
                        set_px(fx_layer, px_o, py_o, SOLAR_WHITE)
                    elif d <= eff_r * 0.76:
                        set_px(fx_layer, px_o, py_o, SOLAR_YELLOW)
                    else:
                        is_alt = (dx_o + dy_o + int(round(phase_rad * 3.0))) % 2 == 0
                        set_px(fx_layer, px_o, py_o, FLAME_ORANGE if is_alt else FLAME_CRIMSON)

    # 3. Forward Spell Projection Flare (when casting / thrusting)
    if eff_flare > 0.05:
        fox = min(43.0, hx + 2.5)
        foy = max(6.0, min(42.0, hy - 0.5))
        reach = int(round(2 + eff_flare * 4.0))
        set_px(fx_layer, fox, foy, SOLAR_WHITE)
        for step_f in range(1, reach + 1):
            fx_px = min(48.0, fox + step_f)
            c_jet = SOLAR_WHITE if step_f <= 2 else (SOLAR_YELLOW if step_f <= 4 else FLAME_ORANGE)
            set_px(fx_layer, fx_px, foy, c_jet)
            if step_f <= reach - 1:
                wing_col = SOLAR_YELLOW if step_f <= 2 else FLAME_CRIMSON
                set_px(fx_layer, fx_px, max(3.0, foy - 1), wing_col)
                set_px(fx_layer, fx_px, min(48.0, foy + 1), wing_col)
            if step_f == 2 and eff_flare >= 0.8:
                set_px(fx_layer, fx_px, max(3.0, foy - 2), FLAME_GOLD)
                set_px(fx_layer, fx_px, min(48.0, foy + 2), FLAME_GOLD)

    res = composite_over(c, add_outline_to_layer(arm_layer))
    res = composite_over(res, fx_layer)
    c[:, :, :] = res
    return c


def draw_sun_staff(
    base_frame,
    shoulder=(25, 17),
    grip_offset=(7.5, 1.5),
    staff_deg=-69.0,
    top_len=9.5,
    bot_len=20.5,
    phase_rad=0.0,
    charge_level=0,
    release_flash=False,
    flare=0.0,
    left_orb_mode='none',
    left_hand_pos=None,
    solar_wings=0.0,
    ground_shockwave=0.0,
    eclipse_crown=0.0,
    orb_glow=1.0,
    allow_horizontal=False,
):
    """
    Renders Ignis Sol's articulated Solar Sun-Staff (`draw_sun_staff`) across a wide,
    expressive caster arc (`-108°` overhead/windup to `-32°` forward slash/thrust)
    while keeping the shaft 100% collinear and straight within the safe `[2..49]` canvas.
    """
    staff_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    right_arm_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    fx_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    # 1. Attach IK arm at Ignis's right shoulder
    sx = max(23.0, min(28.5, float(shoulder[0])))
    sy = max(13.0, min(27.0, float(shoulder[1])))

    # 2. Hand grip position (supports vertical staff slams grip_y + 4 and 7px crouches)
    raw_gx = sx + float(grip_offset[0])
    raw_gy = sy + float(grip_offset[1])
    hx_grip = float(max(29.5, min(35.5, raw_gx)))
    hy_grip = float(max(13.5, min(28.0, raw_gy)))

    # 3. Wide expressive Sun-Staff arc (-112° windup/overhead to -28° forward slash/thrust)
    if not allow_horizontal:
        eff_deg = max(-112.0, min(-28.0, float(staff_deg)))
    else:
        eff_deg = float(staff_deg)

    rad = math.radians(eff_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    px, py = -uy, ux

    # 4. Optional Blazing Solar Mantle Wings behind cloak (Ultimate)
    if solar_wings > 0.05:
        wing_span = int(round(4 + solar_wings * 6))
        for w_i in range(1, wing_span + 1):
            frac = w_i / max(1.0, float(wing_span))
            for branch, by_off in [(-1, -w_i * 0.85), (0, -w_i * 0.35), (1, w_i * 0.45)]:
                wx = max(3.0, min(14.0, 14 - w_i * 1.0))
                wy = max(3.0, min(48.0, sy + by_off + math.sin(phase_rad * 2.0 + w_i * 0.6 + branch) * 0.8))
                col = SOLAR_YELLOW if frac < 0.35 else (FLAME_ORANGE if frac < 0.75 else FLAME_CRIMSON)
                set_px(fx_layer, wx, wy, col)
                if frac < 0.6:
                    set_px(fx_layer, wx, min(48.0, wy + 1), FLAME_GOLD)

    # 5. Collinear full-length shaft bounded strictly along ray (ux, uy) so it never kinks or clips
    eff_top_len = max(6.5, min(10.5, float(top_len)))
    if uy < -0.05 and hy_grip + uy * (eff_top_len + 2.0) < 7.0:
        eff_top_len = max(5.5, (7.0 - hy_grip) / uy - 2.0)
    if ux > 0.05 and hx_grip + ux * (eff_top_len + 2.0) > 42.5:
        eff_top_len = max(5.5, (42.5 - hx_grip) / ux - 2.0)
    if ux < -0.05 and hx_grip + ux * (eff_top_len + 2.0) < 7.5:
        eff_top_len = max(5.5, (7.5 - hx_grip) / ux - 2.0)

    eff_bot_len = max(16.0, min(22.5, float(bot_len)))
    if -uy > 0.05 and hy_grip - uy * eff_bot_len > 45.5:
        eff_bot_len = max(13.5, (45.5 - hy_grip) / (-uy))
    if ux > 0.05 and hx_grip - ux * eff_bot_len < 4.5:
        eff_bot_len = max(13.5, (hx_grip - 4.5) / ux)

    bx = hx_grip - ux * eff_bot_len
    by = hy_grip - uy * eff_bot_len
    hx = hx_grip + ux * eff_top_len
    hy = hy_grip + uy * eff_top_len

    # Draw 2px-thick sculpted bronze-and-gold staff shaft
    steps = int(max(abs(hx - bx), abs(hy - by), 1) * 2.0)
    for i in range(steps + 1):
        t = i / max(1, steps)
        cx_s = bx + (hx - bx) * t
        cy_s = by + (hy - by) * t
        is_band = abs(t - 0.18) < 0.04 or abs(t - 0.55) < 0.04 or abs(t - 0.84) < 0.05
        col_core = GOLD_BRIGHT if is_band else GOLD_TRIM
        col_edge = GOLD_MID if is_band else WOOD_DARK
        set_px(staff_layer, cx_s, cy_s, col_core)
        set_px(staff_layer, cx_s + px * 0.8, cy_s + py * 0.8, col_edge)

    # Ornate Golden Butt Spike
    set_px(staff_layer, bx, by, GOLD_BRIGHT)
    set_px(staff_layer, max(3.0, min(48.0, bx - ux * 0.8)), max(3.0, min(48.0, by - uy * 0.8)), GOLD_MID)

    # 6. Solar Sun-Wheel Finial at (fin_cx, fin_cy)
    fin_cx = max(7.0, min(43.0, hx + ux * 2.0))
    fin_cy = max(6.5, min(43.0, hy + uy * 2.0))
    ring_r = 3.0
    eff_flare = max(float(flare), 1.0 if release_flash else 0.0)

    # Golden Sun-Wheel Outer Halo & 8 Radial Sun-Spikes
    for s in range(16):
        a = (s / 16.0) * 2.0 * math.pi + phase_rad
        rx = fin_cx + math.cos(a) * ring_r
        ry = fin_cy + math.sin(a) * ring_r
        set_px(staff_layer, rx, ry, GOLD_BRIGHT if s % 2 == 0 else GOLD_MID)
        if s % 4 == 0:
            spike_len = ring_r + 1.2 + (0.6 if eff_flare > 0.3 else 0.0)
            sx_tip = max(3.0, min(48.0, fin_cx + math.cos(a) * spike_len))
            sy_tip = max(3.0, min(48.0, fin_cy + math.sin(a) * spike_len))
            set_px(
                staff_layer,
                sx_tip,
                sy_tip,
                SOLAR_WHITE if eff_flare >= 0.8 else (SOLAR_YELLOW if charge_level >= 1 else GOLD_BRIGHT),
            )

    # Finial Cradle Collar
    set_px(staff_layer, hx, hy, GOLD_BRIGHT)
    set_px(staff_layer, hx + px, hy + py, GOLD_MID)
    set_px(staff_layer, hx - px, hy - py, GOLD_MID)

    # 7. Right Staff 2-Bone IK Arm (drawn OVER the staff shaft from (sx, sy) to (hx_grip, hy_grip))
    draw_ik_mage_arm(right_arm_layer, sx, sy, hx_grip, hy_grip, L1=4.5, L2=4.3, bend_side=1.0, is_offhand=False)

    # 8. Pulsing Miniature Sun Core inside the Sun-Wheel Finial
    core_pulse = 1 if (charge_level >= 1 or eff_flare > 0.2 or int(round(phase_rad * 3)) % 2 == 0) else 0
    set_px(fx_layer, fin_cx, fin_cy, SOLAR_WHITE)
    for dx_c, dy_c in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        set_px(fx_layer, fin_cx + dx_c, fin_cy + dy_c, SOLAR_WHITE if eff_flare >= 0.8 else (SOLAR_YELLOW if core_pulse else FLAME_GOLD))

    # 9. Finial Charge Corona & Directional Solar Flare Burst
    if charge_level >= 1:
        for d in range(1, charge_level + 2):
            col = SOLAR_WHITE if d == 1 else (SOLAR_YELLOW if d == 2 else FLAME_ORANGE)
            set_px(
                fx_layer,
                max(3.0, min(48.0, fin_cx + ux * (ring_r + d * 0.8))),
                max(3.0, min(48.0, fin_cy + uy * (ring_r + d * 0.8))),
                col,
            )
            set_px(
                fx_layer,
                max(3.0, min(48.0, fin_cx + px * (ring_r + d * 0.65))),
                max(3.0, min(48.0, fin_cy + py * (ring_r + d * 0.65))),
                FLAME_GOLD,
            )
            set_px(
                fx_layer,
                max(3.0, min(48.0, fin_cx - px * (ring_r + d * 0.65))),
                max(3.0, min(48.0, fin_cy - py * (ring_r + d * 0.65))),
                FLAME_GOLD,
            )

    if eff_flare > 0.05:
        fcx = max(4.0, min(44.5, fin_cx + ux * 1.8))
        fcy = max(4.0, min(44.5, fin_cy + uy * 1.8))
        set_px(fx_layer, fcx, fcy, SOLAR_WHITE)
        flare_steps = int(round(2 + eff_flare * 3.0))
        for d in range(1, flare_steps + 1):
            c_main = SOLAR_WHITE if d <= 2 else (SOLAR_YELLOW if d <= 3 else FLAME_ORANGE)
            # Project forward along staff tip & +X cast direction
            set_px(fx_layer, max(3.0, min(48.0, fcx + d)), max(3.0, min(48.0, fcy)), c_main)
            set_px(fx_layer, max(3.0, min(48.0, fcx + ux * d)), max(3.0, min(48.0, fcy + uy * d)), c_main)
            if d <= 3:
                set_px(
                    fx_layer,
                    max(3.0, min(48.0, fcx + px * d)),
                    max(3.0, min(48.0, fcy + py * d)),
                    SOLAR_YELLOW if d <= 2 else FLAME_CRIMSON,
                )
                set_px(
                    fx_layer,
                    max(3.0, min(48.0, fcx - px * d)),
                    max(3.0, min(48.0, fcy - py * d)),
                    SOLAR_YELLOW if d <= 2 else FLAME_CRIMSON,
                )
        for dx_f, dy_f in [(-2, -2), (2, -2), (-2, 2), (2, 2)]:
            set_px(fx_layer, max(3.0, min(48.0, fcx + dx_f)), max(3.0, min(48.0, fcy + dy_f)), FLAME_GOLD)

    # 10. Optional Ground Magma Shockwave Ring & Magma Runes (Row 3 Phase 2 Staff Slam)
    if ground_shockwave > 0.05:
        ring_rx = int(round(4 + ground_shockwave * 12))
        ring_cx = int(round(max(16.0, min(34.0, bx))))
        ring_cy = 47
        for s in range(28):
            a = (s / 28.0) * 2.0 * math.pi
            mx = max(3.0, min(48.0, ring_cx + math.cos(a) * ring_rx))
            my = max(3.0, min(48.0, ring_cy + math.sin(a) * 1.5))
            col = SOLAR_WHITE if (ground_shockwave < 0.45 and s % 3 == 0) else (
                SOLAR_YELLOW if s % 2 == 0 else FLAME_ORANGE
            )
            set_px(fx_layer, mx, my, col)
            if s % 4 == 0 and ground_shockwave < 0.9:
                gh = int(round((1.0 - ground_shockwave * 0.7) * 5.0))
                for gy_i in range(1, gh + 1):
                    set_px(fx_layer, mx, max(3.0, my - gy_i), SOLAR_YELLOW if gy_i == 1 else FLAME_CRIMSON)

    # 11. Optional Miniature Black-Gold Eclipse Corona above Crown (Row 4 Ultimate)
    if eclipse_crown > 0.05:
        ecx, ecy = 25.0, 8.0
        er = min(3.2, 1.6 + eclipse_crown * 1.5)
        for dy_e in range(-5, 6):
            for dx_e in range(-5, 6):
                d = math.hypot(dx_e, dy_e)
                ey_px = max(3.0, min(48.0, ecy + dy_e))
                ex_px = max(3.0, min(48.0, ecx + dx_e))
                if d <= er * 0.60:
                    set_px(fx_layer, ex_px, ey_px, VOID_BLACK)
                elif d <= er:
                    set_px(fx_layer, ex_px, ey_px, SOLAR_WHITE if d < er * 0.78 else SOLAR_YELLOW)
                elif d <= min(4.3, er + 1.1) and (dx_e + dy_e + int(round(phase_rad * 4))) % 2 == 0:
                    set_px(fx_layer, ex_px, ey_px, FLAME_ORANGE if d < er + 0.6 else FLAME_CRIMSON)

    out = composite_over(base_frame, add_outline_to_layer(staff_layer))
    out = composite_over(out, add_outline_to_layer(right_arm_layer))
    out = composite_over(out, fx_layer)
    return fill_layer_pinholes(out, 2, 49, 2, 49, require_3_neighbors=True)


draw_arm_and_staff = draw_sun_staff


def render_walk_legs(tpl, f):
    """
    Renders a smooth 30-frame 2-step Battle-Mage Stride Cycle (F00..F14 step A, F15..F29 step B)
    preserving Ignis's full flowing A-line crimson & gold robe (`x = 10..34`) down to `y = 40..44`
    with animated hem sway and striding boots beneath (`y = 45..49`), never chopping `x >= 29` or `x <= 15`!
    """
    phase = (f / 30.0) * 2.0 * math.pi
    bob_y = int(round(math.cos(phase * 2.0) * 1.0))

    stand = tpl['stand'].copy()
    out = np.zeros((52, 52, 4), dtype=np.uint8)

    # 1. Upper body & upper cloak (y = 0..28): apply vertical bob (`bob_y`)
    for y in range(0, 29):
        ny = y + bob_y
        if not (2 <= ny < 50):
            continue
        for x in range(2, 48):
            if stand[y, x, 3] > 0:
                out[ny, x] = stand[y, x]

    # When bob_y == -1, duplicate row 28 so shifting y=0..28 up by 1px never opens a waist slit
    if bob_y < 0:
        for x in range(2, 48):
            if stand[28, x, 3] > 0:
                out[28, x] = stand[28, x]

    # 2. Full flowing A-line crimson robe & left cloak (y = 29..44): animated hem sway preserving full width x = 10..34
    for y in range(29, 45):
        v = (y - 29) / 15.0
        sway_dx = int(round(math.sin(phase - v * 1.6) * 1.8 * v))
        for x in range(2, 48):
            if stand[y, x, 3] > 0:
                nx = max(2, min(49, x + sway_dx))
                out[y, nx] = stand[y, x]

    # 3. Striding boots beneath the robe hem (y = 45..49): back boot (x=15..22) and front boot (x=24..32)
    for is_front, leg_phase, x_min, x_max in [(False, phase + math.pi, 15, 23), (True, phase, 24, 33)]:
        dx_b = int(round(math.sin(leg_phase) * 2.0))
        dy_b = -1 if math.cos(leg_phase) > 0.35 else 0
        for y in range(45, 50):
            ny = max(44, min(49, y + dy_b))
            for x in range(x_min, x_max):
                if stand[y, x, 3] > 0:
                    nx = max(2, min(49, x + dx_b))
                    out[ny, nx] = stand[y, x]

    out = fill_layer_pinholes(out)
    return add_outline_to_layer(out)


render_walk_robes = render_walk_legs


def make_crouch_body(tpl, crouch_depth):
    """
    Constructs a smooth continuous knee-bend crouched pyromancer body on `tpl['stand']`
    supporting up to `7px` deep Flame-Ward crouch (`crouch_depth = 0..7`):
    - Shifts `ny <= 27 + d` down by `d`
    - Compresses `ny = 28 + d .. 43` from `sy = int(round(27.0 + u * 16.0))` with a subtle 1px forward knee bend
    - Keeps boots/hem anchored at `ny = 44..49`
    """
    stand = tpl['stand'].copy()
    d = max(0, min(7, int(round(crouch_depth))))
    if d == 0:
        return stand

    canvas = np.zeros((52, 52, 4), dtype=np.uint8)

    # 1. Shift wizard hat, head, and upper torso (y = 0..27 -> ny = d .. 27 + d) down by `d`
    for y in range(0, 28):
        ny = y + d
        if 2 <= ny <= 49:
            canvas[ny, :] = stand[y, :]

    # 2. Continuous vertical compression on ny = 28 + d .. 43 from sy = int(round(27.0 + u * 16.0))
    #    with a subtle 1px forward knee bend
    denom = max(1.0, float(43 - (27 + d)))
    for ny in range(28 + d, 44):
        u = (ny - (27.0 + d)) / denom
        sy = int(round(27.0 + u * 16.0))
        knee_dx = 1 if (d >= 2 and 0.25 <= u <= 0.75) else 0
        for x in range(2, 48):
            if stand[sy, x, 3] > 0:
                nx = min(49, x + knee_dx)
                canvas[ny, nx] = stand[sy, x]
                if knee_dx > 0 and x >= 15 and canvas[ny, x, 3] == 0:
                    canvas[ny, x] = stand[sy, x]

    # 3. Keep boots and lower hem anchored at ny = 44..49
    canvas[44:50, :] = stand[44:50, :]

    canvas = fill_layer_pinholes(canvas)
    return add_outline_to_layer(canvas)


def make_jump_body(tpl, jump_dy, tuck_amount, torso_lean_dx=0):
    """
    Constructs a full-body aerial Flame-Glide jumping pyromancer pose preserving Ignis's
    full flowing A-line crimson robe (`x = 10..34`) down to `y = 40..43` with animated hem
    sway and tucked boots beneath, never chopping `x >= 29` or `x <= 15`!
    """
    stand = tpl['stand'].copy()
    torso_dy = max(-2, min(4, int(round(jump_dy))))
    t = max(0.0, min(1.0, float(tuck_amount)))
    out = np.zeros((52, 52, 4), dtype=np.uint8)

    # 1. Wizard hat, head, and upper torso (y = 0..27)
    for y in range(0, 28):
        ny = y + torso_dy
        if not (2 <= ny < 49):
            continue
        dx = torso_lean_dx if y <= 24 else 0
        for x in range(2, 48):
            if stand[y, x, 3] > 0:
                out[ny, max(2, min(49, x + dx))] = stand[y, x]

    # 2. Full A-line lower crimson robe & left cloak (src y = 28..44) preserved across x = 10..34
    dst_top = 28 + torso_dy
    hem_lift = int(round(t * 2.0))
    dst_bot = max(dst_top + 10, min(44, 44 + torso_dy - hem_lift))
    dst_span = max(1.0, float(dst_bot - dst_top))
    for ny in range(dst_top, dst_bot + 1):
        if not (2 <= ny < 48):
            continue
        v = (ny - dst_top) / dst_span
        sy = int(round(28.0 + v * 16.0))
        sweep_dx = -int(round(v * t * 1.5))
        for x in range(2, 48):
            if stand[sy, x, 3] > 0:
                nx = max(2, min(49, x + sweep_dx))
                out[ny, nx] = stand[sy, x]
                if sweep_dx < 0 and x >= 15 and nx + 1 < 49 and out[ny, nx + 1, 3] == 0:
                    out[ny, nx + 1] = stand[sy, x]

    # 3. Tucked boots beneath the flowing robe hem (from stand[45:49, :])
    boot_lift = torso_dy - int(round(t * 2.5))
    boot_dx = -int(round(t * 1.5))
    for y in range(45, 49):
        ny = max(dst_bot, min(48, y + boot_lift))
        for x in range(15, 33):
            if stand[y, x, 3] > 0:
                nx = max(2, min(49, x + boot_dx))
                out[ny, nx] = stand[y, x]

    out = fill_layer_pinholes(out)
    return add_outline_to_layer(out)


def draw_solar_rift_ring(frame, cx, cy, rx, ry, phase_rad, intensity=1.0):
    """
    Draws a vertical golden-orange Solar Rift portal ring (`#fef08a` / `#fb923c`)
    around `(cx, cy)` for Ignis Sol's Row 6 Arcane Blink Teleport.
    """
    steps = 28
    for s in range(steps):
        a = (s / float(steps)) * 2.0 * math.pi + phase_rad
        px_r = max(3.0, min(48.0, cx + math.cos(a) * rx))
        py_r = max(3.0, min(48.0, cy + math.sin(a) * ry))
        if s % 4 == 0 and intensity >= 0.6:
            col = SOLAR_WHITE
        elif s % 2 == 0:
            col = SOLAR_YELLOW
        else:
            col = FLAME_ORANGE if s % 3 == 0 else FLAME_CRIMSON
        set_px(frame, px_r, py_r, col)
        # Radial rift arcs on cardinal/diagonal portal nodes
        if s % 7 == 0 and intensity >= 0.5:
            ox_r = max(3.0, min(48.0, cx + math.cos(a) * (rx + 1.4)))
            oy_r = max(3.0, min(48.0, cy + math.sin(a) * (ry + 1.0)))
            set_px(frame, ox_r, oy_r, SOLAR_YELLOW if s % 2 == 0 else FLAME_ORANGE)


def apply_solar_plasma_tint(frame, amount, phase_rad, f_idx):
    """
    Tints and brightens Ignis's silhouette with golden-white solar plasma (`#fef08a` / `#fb923c`)
    and vertical solar lightning streaks during Row 6 Arcane Blink Phase-Out / Phase-In.
    """
    out = frame.copy()
    amt = max(0.0, min(1.0, float(amount)))
    if amt <= 0.02:
        return out

    # 1. Tint silhouette pixels toward golden-white solar plasma (#fef08a = SOLAR_YELLOW, #fb923c = FLAME_ORANGE)
    for y in range(2, 50):
        scan_boost = 0.18 if ((y + f_idx * 2) % 4 == 0) else 0.0
        eff_a = min(0.95, amt + scan_boost)
        for x in range(2, 50):
            r, g, b, a = out[y, x]
            if a == 0:
                continue
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            if lum > 145 or (eff_a > 0.78 and (x + y + f_idx) % 5 == 0):
                target = SOLAR_WHITE if eff_a > 0.75 else SOLAR_YELLOW
            elif lum > 75:
                target = SOLAR_YELLOW
            else:
                target = FLAME_ORANGE
            out[y, x, 0] = int(round(r * (1.0 - eff_a) + target[0] * eff_a))
            out[y, x, 1] = int(round(g * (1.0 - eff_a) + target[1] * eff_a))
            out[y, x, 2] = int(round(b * (1.0 - eff_a) + target[2] * eff_a))

    # 2. Vertical solar lightning streaks streaking up/down Ignis's dematerializing silhouette
    bolt_cols = [17 + (f_idx * 3) % 5, 23 + (f_idx * 2) % 5, 29 + (f_idx * 3) % 5]
    if amt >= 0.55:
        bolt_cols.append(20 + (f_idx * 5) % 9)
    for b_idx, bx_base in enumerate(bolt_cols):
        y_start = max(4, 7 + ((f_idx * 3 + b_idx * 4) % 6))
        y_end = min(47, 42 + ((f_idx * 2 + b_idx * 3) % 6))
        for by_s in range(y_start, y_end + 1):
            jag = int(round(math.sin(by_s * 0.65 + phase_rad * 2.0 + b_idx) * 1.0))
            lx = max(3, min(48, bx_base + jag))
            if (by_s + f_idx) % 5 != 0:
                col_l = SOLAR_WHITE if (by_s + b_idx) % 3 == 0 else (
                    SOLAR_YELLOW if (by_s + b_idx) % 2 == 0 else FLAME_ORANGE
                )
                set_px(out, lx, by_s, col_l)

    return out


def build_row0_idle(tpl):
    """
    Row 0 (`IDLE`, 30 frames):
    - Gentle breathing sway with Sun-Staff oscillating smoothly from `-74°` to `-64°` (`-69° ± 5°`).
    - Articulated Left Spellcasting Arm poised at caster guard with subtle warm ember pulse.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        base = tpl['stand'].copy()

        breathe = -1 if 8 <= f <= 19 else 0
        if breathe == -1:
            upper = base[10:29, 10:36].copy()
            hat_top = base[4:10, 10:36].copy()
            base[3:9, 10:36] = hat_top
            base[9:28, 10:36] = upper
            base[28, 10:36] = upper[18, :]
            base = fill_layer_pinholes(add_outline_to_layer(base))

        base = apply_robe_cloak_wave(base, phase, amplitude=1.4, vertical_flutter=0.5)

        # Flickering ember at pointed wizard hat apex
        hat_ember_y = max(3, 7 + breathe - (f % 3 == 0))
        set_px(base, 24 + (f % 2), hat_ember_y, SOLAR_YELLOW if f % 2 == 0 else FLAME_ORANGE)

        # Gentle breathing sway between -74° and -64°
        staff_deg = -69.0 - math.sin(phase) * 5.0
        grip_dx = 7.4 + math.sin(phase) * 0.8
        grip_dy = 1.5 + math.cos(phase) * 0.6
        frame = draw_sun_staff(
            base,
            shoulder=(25, 17 + breathe),
            grip_offset=(grip_dx, grip_dy),
            staff_deg=staff_deg,
            top_len=9.5,
            bot_len=21.0,
            phase_rad=phase,
            charge_level=1 if f % 6 in (2, 3) else 0,
        )
        # Left spellcasting arm breathing gently at front chest/waist guard
        lh_x = 29.5 + math.sin(phase) * 0.8
        lh_y = 24.0 + breathe + math.cos(phase) * 0.6
        draw_left_spell_arm(
            frame,
            sh_x=23,
            sh_y=18 + breathe,
            hand_x=lh_x,
            hand_y=lh_y,
            orb_radius=1.2 if f % 10 in (4, 5) else 0,
            flare=0.0,
            phase_rad=phase,
        )
        frames.append(ensure_safe_cell(frame, margin=2))
    return frames


def build_row1_walk(tpl):
    """
    Row 1 (`WALK`, 30 frames):
    - Counter-swinging battle-mage stride with Sun-Staff swinging across `-78°` to `-58°` (`-68° ± 10°`),
      paired with counter-swinging Left Spellcasting Arm and flowing A-line crimson robe.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        body = render_walk_legs(tpl, f)
        bob_y = int(round(math.cos(phase * 2.0) * 1.0))

        swing = math.sin(phase)
        # Counter-swinging staff stride from -78° to -58°
        staff_deg = -68.0 - swing * 10.0
        grip_dx = 7.4 + 1.2 * swing
        grip_dy = 1.5 + 0.8 * math.cos(phase)

        frame = draw_sun_staff(
            body,
            shoulder=(25, 17 + bob_y),
            grip_offset=(grip_dx, grip_dy),
            staff_deg=staff_deg,
            top_len=9.5,
            bot_len=21.0,
            phase_rad=phase,
            charge_level=0,
        )
        # Off-hand spellcasting arm counter-swings naturally opposite the staff
        lh_x = 29.5 - swing * 1.6
        lh_y = 23.5 + bob_y - math.cos(phase) * 0.8
        draw_left_spell_arm(
            frame,
            sh_x=23,
            sh_y=18 + bob_y,
            hand_x=lh_x,
            hand_y=lh_y,
            orb_radius=0,
            flare=0.0,
            phase_rad=phase,
        )
        frames.append(ensure_safe_cell(frame, margin=2))
    return frames


def build_row2_auto_attack(tpl):
    """
    Row 2 (`AUTO_ATTACK`, 30 frames):
    - F00..F09 (Windup): Draws Sun-Staff back to `-102°` while Left Spellcasting Arm raises a glowing
      Solar Fireball Orb (`orb_radius=3`) in front of his chest (`hand_x = 31..34, hand_y = 22..25`).
    - F10..F18 (Thrust & Cast): Thrusts Sun-Staff forward to `-36°` with `flare=1.0` as both hands
      project the blazing Solar Fireball!
    - F19..F29 (Recovery): Smooth follow-through recovery to `-68°` caster stance.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        use_cast_body = 9 <= f <= 21
        base = (tpl['cast_body'] if use_cast_body else tpl['stand']).copy()

        if f in (11, 12, 13):
            base = shift_layer(base, dx=-1, dy=0)

        base = apply_robe_cloak_wave(
            base, phase * 1.5, amplitude=2.0 if 10 <= f <= 18 else 1.4, vertical_flutter=0.6
        )

        if f <= 9:
            u = f / 9.0
            # Windup from -68° back to -102°
            staff_deg = -68.0 * (1.0 - u) + (-102.0) * u
            grip_x = 7.2 * (1.0 - u) + 5.8 * u
            grip_y = 1.5 * (1.0 - u) + (-1.2) * u
            charge = 3 if f >= 6 else (2 if f >= 3 else 1)
            frame = draw_sun_staff(
                base,
                shoulder=(25, 17),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=9.2,
                bot_len=20.5,
                phase_rad=phase * 2.0,
                charge_level=charge,
                flare=0.25 if f >= 7 else 0.0,
            )
            # Left Spellcasting Arm raises Solar Fireball Orb (orb_radius=3) in front of chest (hand_x=31..34, hand_y=22..25)
            lh_x = 31.0 + u * 3.0
            lh_y = 25.0 - u * 3.0
            orb_r = 2.0 if f <= 2 else 3.0
            draw_left_spell_arm(
                frame,
                sh_x=23,
                sh_y=18,
                hand_x=lh_x,
                hand_y=lh_y,
                orb_radius=orb_r,
                flare=0.3 if f >= 8 else 0.0,
                mode='orb',
                phase_rad=phase * 2.0,
            )
        elif f <= 18:
            k = f - 10
            # Thrusts Sun-Staff forward to -36° with flare=1.0
            cast_angles = [-64.0, -44.0, -36.0, -36.0, -37.0, -40.0, -45.0, -51.0, -57.0]
            staff_deg = cast_angles[k]
            grip_x = 7.2 if k == 0 else (7.8 if k <= 4 else 7.5)
            grip_y = 0.8 if k == 0 else 1.5
            flare_val = 1.0 if k <= 5 else (0.7 if k == 6 else 0.4)
            frame = draw_sun_staff(
                base,
                shoulder=(26, 17),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=8.5,
                bot_len=19.5,
                phase_rad=phase * 2.5,
                charge_level=3 if k <= 5 else 2,
                release_flash=(k <= 4),
                flare=flare_val,
            )
            # Left hand projects the Solar Fireball alongside the forward-thrusting staff
            lh_x = 34.0 if k <= 5 else (34.0 - (k - 5) * 0.5)
            lh_y = 22.0 + (0.0 if k <= 4 else (k - 4) * 0.4)
            draw_left_spell_arm(
                frame,
                sh_x=24,
                sh_y=18,
                hand_x=lh_x,
                hand_y=lh_y,
                orb_radius=3.0 if k <= 5 else 2.0,
                flare=flare_val,
                mode='orb',
                phase_rad=phase * 2.5,
            )
        else:
            u = (f - 19) / 10.0
            staff_deg = -57.0 * (1.0 - u) + (-68.0) * u
            grip_x = 7.5 * (1.0 - u) + 7.4 * u
            grip_y = 1.5
            frame = draw_sun_staff(
                base,
                shoulder=(25, 17),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=9.5,
                bot_len=21.0,
                phase_rad=phase,
                charge_level=1 if f <= 21 else 0,
            )
            lh_x = 32.5 * (1.0 - u) + 29.5 * u
            lh_y = 23.5 * (1.0 - u) + 24.0 * u
            draw_left_spell_arm(
                frame,
                sh_x=23,
                sh_y=18,
                hand_x=lh_x,
                hand_y=lh_y,
                orb_radius=1.2 if f == 19 else 0,
                flare=0.0,
                phase_rad=phase,
            )

        frames.append(ensure_safe_cell(frame, margin=2))
    return frames


def build_row3_skill(tpl):
    """
    Row 3 (`SKILL` - Solar Pillar, 30 frames):
    - F00..F06: Raises Sun-Staff high overhead (`-98°`).
    - F07..F14: Slams Sun-Staff vertically (`-88°`, `grip_y + 4`) into the ground with magma runes & shockwave.
    - F15..F22: Sweeps Sun-Staff forward (`-34°`) with Left Spellcasting Arm conjuring a blazing solar sigil!
    - F23..F29: Smooth recovery back to `-68°` stance.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi

        if f <= 6:
            u = f / 6.0
            lift_dy = -1 if f >= 3 else 0
            base = tpl['stand'].copy()
            if lift_dy != 0:
                base = shift_layer(base, dx=0, dy=lift_dy)
            base = apply_robe_cloak_wave(base, phase * 2.0, amplitude=1.8, vertical_flutter=0.7)
            overhead_angles = [-74.0, -82.0, -90.0, -95.0, -98.0, -98.0, -98.0]
            staff_deg = overhead_angles[f]
            grip_x = 7.2 * (1.0 - u) + 6.0 * u
            grip_y = 1.0 * (1.0 - u) + (-1.5) * u
            frame = draw_sun_staff(
                base,
                shoulder=(25, 17 + lift_dy),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=9.0,
                bot_len=20.5,
                phase_rad=phase * 2.0,
                charge_level=3 if f >= 3 else 2,
                flare=0.35 if f >= 4 else 0.0,
            )
            draw_left_spell_arm(
                frame,
                sh_x=23,
                sh_y=18 + lift_dy,
                hand_x=30.0 + u * 2.0,
                hand_y=23.0 - u * 4.0,
                orb_radius=2.0 if f >= 2 else 1.2,
                flare=0.0,
                mode='orb',
                phase_rad=phase * 2.0,
            )
        elif f <= 14:
            k = f - 7
            crouch_seq = [2, 3, 3, 3, 2, 2, 1, 1]
            cd = crouch_seq[k]
            base = make_crouch_body(tpl, cd)
            base = apply_robe_cloak_wave(base, phase * 2.5, amplitude=2.0, vertical_flutter=0.8)
            # Slams vertically (-88°) with grip_y + 4 into the ground with magma runes
            if k <= 4:
                grip_x, grip_y = 7.8, 1.5 + 4.0
            else:
                v = (k - 4) / 3.0
                grip_x = 7.8 * (1.0 - v) + 7.0 * v
                grip_y = 5.5 * (1.0 - v) + 2.0 * v
            frame = draw_sun_staff(
                base,
                shoulder=(25, 17 + cd),
                grip_offset=(grip_x, grip_y),
                staff_deg=-88.0,
                top_len=9.5,
                bot_len=21.5,
                phase_rad=phase * 2.5,
                charge_level=3 if k <= 4 else 2,
                ground_shockwave=min(1.0, (k + 1) / 7.5),
            )
            draw_left_spell_arm(
                frame,
                sh_x=23,
                sh_y=18 + cd,
                hand_x=32.0,
                hand_y=22.0 + cd,
                orb_radius=2.2,
                flare=0.3 if k <= 3 else 0.0,
                mode='sigil',
                phase_rad=phase * 2.5,
            )
        elif f <= 22:
            k = f - 15
            base = tpl['cast_body'].copy()
            base = apply_robe_cloak_wave(base, phase * 2.0, amplitude=2.1, vertical_flutter=0.8)
            # Sweeps forward to -34° with left hand conjuring a blazing solar sigil
            sweep_angles = [-68.0, -46.0, -34.0, -34.0, -35.0, -38.0, -44.0, -52.0]
            staff_deg = sweep_angles[k]
            grip_x = 7.2 + min(1.0, k / 2.0) * 0.8
            grip_y = 1.2
            flare_val = 1.0 if k in (1, 2, 3, 4) else 0.65
            frame = draw_sun_staff(
                base,
                shoulder=(26, 17),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=8.5,
                bot_len=19.5,
                phase_rad=phase * 2.0,
                charge_level=3 if k <= 5 else 2,
                release_flash=(k in (1, 2, 3, 4)),
                flare=flare_val,
            )
            draw_left_spell_arm(
                frame,
                sh_x=24,
                sh_y=18,
                hand_x=34.0,
                hand_y=21.5,
                orb_radius=3.2,
                flare=flare_val,
                mode='sigil',
                phase_rad=phase * 2.5,
            )
        else:
            u = (f - 23) / 6.0
            base = apply_robe_cloak_wave(tpl['stand'].copy(), phase, amplitude=1.5, vertical_flutter=0.5)
            staff_deg = -52.0 * (1.0 - u) + (-68.0) * u
            grip_x = 7.8 * (1.0 - u) + 7.4 * u
            grip_y = 1.5
            frame = draw_sun_staff(
                base,
                shoulder=(25, 17),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=9.5,
                bot_len=21.0,
                phase_rad=phase,
                charge_level=1 if f <= 25 else 0,
            )
            draw_left_spell_arm(
                frame,
                sh_x=23,
                sh_y=18,
                hand_x=33.0 * (1.0 - u) + 29.5 * u,
                hand_y=22.0 * (1.0 - u) + 24.0 * u,
                orb_radius=1.5 if f == 23 else 0,
                flare=0.0,
                phase_rad=phase,
            )

        frames.append(ensure_safe_cell(frame, margin=2))
    return frames


def build_row4_ultimate(tpl):
    """
    Row 4 (`ULTIMATE` - Cataclysm: Eclipse Supernova, 30 frames):
    - F00..F12: Raises BOTH arms skyward (`staff angle -92°`, left arm raised high to `(30, 14)`)
      channeling a miniature black-gold Solar Eclipse orb above his crown.
    - F13..F22: Slashes the Sun-Staff forward (`-32°`) to command the heaven-to-earth Solar Beam!
    - F23..F29: Smooth recovery to `-68°` stance.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi

        if f <= 12:
            u = f / 12.0
            tuck = min(0.50, u * 0.55)
            lev_dy = -2 if f >= 5 else (-1 if f >= 2 else 0)
            body = make_jump_body(tpl, lev_dy, tuck_amount=tuck) if f >= 2 else tpl['stand'].copy()
            body = apply_robe_cloak_wave(body, phase * 2.5, amplitude=2.1, vertical_flutter=0.85)
            # Both arms raised skyward: staff at -92°, left hand raised high to (30, 14)
            staff_deg = -78.0 * (1.0 - min(1.0, f / 3.0)) + (-92.0) * min(1.0, f / 3.0) + math.sin(phase * 2.0) * 1.5
            grip_x = 6.2 + math.sin(phase * 2.0) * 0.4
            grip_y = -1.2 + math.cos(phase * 2.0) * 0.4
            frame = draw_sun_staff(
                body,
                shoulder=(25, 17 + lev_dy),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=8.8,
                bot_len=20.5,
                phase_rad=phase * 2.5,
                charge_level=3 if f >= 4 else 2,
                solar_wings=min(1.0, (f + 1) / 7.0),
                eclipse_crown=min(1.0, (f + 1) / 5.0),
            )
            r_u = min(1.0, f / 3.0)
            lh_x = 30.0
            lh_y = 20.0 * (1.0 - r_u) + 14.0 * r_u
            draw_left_spell_arm(
                frame,
                sh_x=24,
                sh_y=17 + lev_dy,
                hand_x=lh_x,
                hand_y=lh_y,
                orb_radius=2.5,
                flare=0.4 if f >= 6 else 0.0,
                mode='eclipse',
                phase_rad=phase * 2.5,
            )
            # Orbiting Fire Runes around Ignis
            if f >= 4:
                for r_i in range(4):
                    ra = phase * 3.0 + r_i * (math.pi * 0.5)
                    rx = max(3.0, min(48.0, 24.0 + math.cos(ra) * 14.5))
                    ry = max(4.0, min(47.0, 26.0 + math.sin(ra) * 5.0))
                    if 13.0 <= rx <= 33.0:
                        continue
                    set_px(frame, rx, ry, SOLAR_WHITE)
                    set_px(frame, rx, ry - 1, SOLAR_YELLOW)
                    set_px(frame, rx, ry + 1, FLAME_ORANGE)

        elif f <= 22:
            k = f - 13
            lev_dy = -2 if k <= 4 else -1
            tuck = 0.45 if k <= 5 else 0.25
            body = make_jump_body(tpl, lev_dy, tuck_amount=tuck, torso_lean_dx=1)
            body = apply_robe_cloak_wave(body, phase * 3.0, amplitude=2.2, vertical_flutter=0.9)
            # Slashes Sun-Staff forward to -32° to command the heaven-to-earth Solar Beam!
            slash_angles = [-64.0, -40.0, -32.0, -32.0, -32.0, -34.0, -36.0, -40.0, -45.0, -50.0]
            staff_deg = slash_angles[k]
            grip_x = 7.8 if k >= 1 else 7.0
            grip_y = 1.2
            flare_val = 1.0 if 1 <= k <= 7 else 0.7
            frame = draw_sun_staff(
                body,
                shoulder=(26, 17 + lev_dy),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=8.2,
                bot_len=19.0,
                phase_rad=phase * 3.0,
                charge_level=3,
                release_flash=(1 <= k <= 6),
                flare=flare_val,
                solar_wings=1.0 - k * 0.05,
                eclipse_crown=1.0 - k * 0.06,
            )
            draw_left_spell_arm(
                frame,
                sh_x=24,
                sh_y=18 + lev_dy,
                hand_x=34.0,
                hand_y=20.0,
                orb_radius=3.2,
                flare=flare_val,
                mode='orb',
                phase_rad=phase * 3.0,
            )
            # Heaven-to-earth diagonal Solar Beam rays streaking at x=43..48
            if 1 <= k <= 7:
                for by_b in range(5, 46, 2):
                    bx_b = min(48, 42 + ((by_b + k * 2) % 6))
                    set_px(frame, bx_b, by_b, SOLAR_WHITE if (by_b + k) % 4 == 0 else SOLAR_YELLOW)
                    if bx_b + 1 <= 48:
                        set_px(frame, bx_b + 1, by_b, FLAME_ORANGE)
        else:
            k = f - 23
            u = k / 6.0
            base = apply_robe_cloak_wave(tpl['stand'].copy(), phase * 1.5, amplitude=1.6, vertical_flutter=0.6)
            staff_deg = -50.0 * (1.0 - u) + (-68.0) * u
            grip_x = 7.8 * (1.0 - u) + 7.4 * u
            grip_y = 1.5
            frame = draw_sun_staff(
                base,
                shoulder=(25, 17),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=9.5,
                bot_len=21.0,
                phase_rad=phase,
                charge_level=1 if k <= 2 else 0,
                solar_wings=max(0.0, 0.4 * (1.0 - u)),
                eclipse_crown=max(0.0, 0.3 * (1.0 - u)),
            )
            draw_left_spell_arm(
                frame,
                sh_x=23,
                sh_y=18,
                hand_x=33.0 * (1.0 - u) + 29.5 * u,
                hand_y=20.5 * (1.0 - u) + 24.0 * u,
                orb_radius=0,
                flare=0.0,
                phase_rad=phase,
            )

        if 2 <= f <= 25:
            for gx_i in range(4):
                gx_e = 16 + ((f * 3 + gx_i * 4) % 16)
                gy_e = 48 + (gx_i % 2)
                set_px(frame, gx_e, gy_e, SOLAR_YELLOW if gx_i % 2 == 0 else FLAME_ORANGE)

        frames.append(ensure_safe_cell(frame, margin=2))
    return frames


def build_row5_death(tpl):
    """
    Row 5 (`DEATH` & `HURT`, 30 frames):
    - F00..F06: Hit-stagger recoil (`HURT` uses F00..F05).
    - F07..F17: Drops to knees, robes pooling on the ground, leaning on his dimming Sun-Staff.
    - F18..F29: Collapses horizontally onto the ground (y=38..48) with his Sun-Staff lying flat beside him.
    """
    frames = []
    for f in range(30):
        if f <= 6:
            u = f / 6.0
            dx = -int(round(u * 2.0))
            dy = int(round(u * 1.5))
            base = shift_layer(tpl['stand'], dx=dx, dy=dy)
            base = apply_robe_cloak_wave(base, u * math.pi, amplitude=1.6, vertical_flutter=0.5)
            grip_x = 7.5 - math.sin(u * math.pi) * 0.8
            grip_y = 1.5 + u * 1.5
            frame = draw_sun_staff(
                base,
                shoulder=(25 + dx, 17 + dy),
                grip_offset=(grip_x, grip_y),
                staff_deg=-74.0 + u * 18.0,
                top_len=9.5,
                bot_len=20.5,
                phase_rad=u * math.pi,
                charge_level=0,
            )
            draw_left_spell_arm(
                frame,
                sh_x=23 + dx,
                sh_y=18 + dy,
                hand_x=29.0 - u * 1.5,
                hand_y=23.0 - u * 2.0,
                orb_radius=0,
                flare=0.0,
            )
            frames.append(ensure_safe_cell(frame, margin=2))

        elif f <= 17:
            k = f - 7
            u = k / 10.0
            base = (tpl['kneel1'] if k <= 4 else tpl['kneel2']).copy()
            head_bow = 1 if k >= 6 else 0
            if head_bow == 1:
                head_slice = base[7:22, 14:40].copy()
                base[8:23, 14:40] = head_slice
                base = fill_layer_pinholes(base)

            base = apply_robe_cloak_wave(base, u * math.pi, amplitude=1.0, vertical_flutter=0.3)
            staff_deg = -68.0 + u * 22.0
            grip_x = 7.0 + u * 1.5
            grip_y = 1.5 + u * 1.5
            frame = draw_sun_staff(
                base,
                shoulder=(26, 19 + head_bow),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=9.0,
                bot_len=19.0,
                phase_rad=u * math.pi,
                charge_level=0,
                allow_horizontal=True,
            )
            frames.append(ensure_safe_cell(frame, margin=2))

        elif f <= 22:
            # F18..F22: Grounded floor collapse anchored at y = 46 (smoothly transitioning from kneel2 to fall)
            u = (f - 17) / 5.0
            kn = tpl['kneel2']
            fall_tpl = tpl['fall']
            body = np.zeros((52, 52, 4), dtype=np.uint8)

            for sy in range(8, 49):
                rel_h = max(0, 46 - sy)
                comp = 1.0 - u * 0.56
                ny = min(47, max(14, int(round(46.0 - rel_h * comp))))
                dx_slump = int(round((rel_h / 28.0) * u * 7.5))
                for sx in range(2, 46):
                    if kn[sy, sx, 3] > 0:
                        nx = max(3, min(47, sx + dx_slump))
                        body[ny, nx] = kn[sy, sx]
                        if ny + 1 <= 46 and body[ny + 1, nx, 3] == 0:
                            body[ny + 1, nx] = kn[sy, sx]

            if f >= 20:
                w_fall = (f - 19) / 4.0
                max_fall_x = int(round(34 + w_fall * 10))
                for fy in range(36, 48):
                    for fx in range(8, min(48, max_fall_x)):
                        if fall_tpl[fy, fx, 3] > 0 and body[fy, fx, 3] == 0:
                            body[fy, fx] = fall_tpl[fy, fx]

            body = fill_layer_pinholes(add_outline_to_layer(body))
            staff_slump_degs = [-46.0, -34.0, -22.0, -10.0, -3.0]
            s_deg = staff_slump_degs[f - 18]
            sy_slump = int(round(20 + u * 18.0))
            sx_slump = int(round(26 + u * 2.0))
            frame = draw_sun_staff(
                body,
                shoulder=(sx_slump, sy_slump),
                grip_offset=(7.5, 2.0 + u * 3.0),
                staff_deg=s_deg,
                top_len=8.5,
                bot_len=max(12.0, 18.0 - u * 5.0),
                phase_rad=u * math.pi,
                charge_level=0,
                allow_horizontal=True,
            )
            frames.append(ensure_safe_cell(frame, margin=2))

        else:
            k = f - 23
            frame = tpl['fall'].copy()
            if k == 0:
                frame = shift_layer(frame, dx=0, dy=-1)

            staff_floor = np.zeros((52, 52, 4), dtype=np.uint8)
            draw_line_px(staff_floor, 14, 47, 41, 47, GOLD_TRIM)
            draw_line_px(staff_floor, 14, 48, 41, 48, WOOD_DARK)
            for bx_band in (18, 28, 37):
                set_px(staff_floor, bx_band, 47, GOLD_BRIGHT)
            for dx_f in (-1, 0, 1, 2):
                set_px(staff_floor, 43 + dx_f, 46, GOLD_MID)
                set_px(staff_floor, 43 + dx_f, 48, GOLD_DARK)
            set_px(staff_floor, 45, 47, GOLD_BRIGHT)
            ember_col = SOLAR_YELLOW if k == 0 else (FLAME_ORANGE if k <= 2 else (CRIMSON_MID if k <= 4 else CRIMSON_DARK))
            set_px(staff_floor, 43, 47, ember_col)
            set_px(staff_floor, 44, 47, GOLD_MID if k <= 3 else GOLD_DARK)
            if k < 6:
                mote_x = 43 - (k % 3)
                mote_y = max(3, 45 - k)
                set_px(staff_floor, mote_x, mote_y, FLAME_ORANGE if k < 3 else CRIMSON_MID)

            frame = composite_over(frame, add_outline_to_layer(staff_floor))
            frames.append(ensure_safe_cell(frame, margin=2))

    return frames


def build_row6_dash(tpl):
    """
    Row 6 (`DASH` - Solar Rift Arcane Blink Teleport, 30 frames):
    - F00..F03: Ignis compresses and raises his Sun-Staff as a golden-orange vertical Solar Rift ring opens around him.
    - F04..F09 (Blink Phase-Out): Tints/brightens Ignis's silhouette with golden-white solar plasma (`#fef08a` / `#fb923c`)
      and vertical solar lightning streaks + rift rings as he steps into the Solar Rift!
    - F10..F18 (Blink Phase-In + Snap Solar Bolt): Ignis materializes out of an arrival Solar Rift ring while
      thrusting his Sun-Staff forward (`-38°`, `flare=1.0`) to fire his arrival Snap Solar Bolt!
    - F19..F29: Smooth recovery to `-68°` battle stance.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi

        if f <= 3:
            # F00..F03: Compress and raise Sun-Staff as vertical golden-orange Solar Rift ring opens
            u = f / 3.0
            cd = [1, 2, 3, 2][f]
            base = make_crouch_body(tpl, cd)
            base = apply_robe_cloak_wave(base, phase * 2.0, amplitude=1.9, is_dash=(f >= 2))
            staff_deg = [-74.0, -82.0, -90.0, -96.0][f]
            grip_x = 7.2 - u * 0.8
            grip_y = 1.2 - u * 1.6
            frame = draw_sun_staff(
                base,
                shoulder=(25, 17 + cd),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=9.0,
                bot_len=20.0,
                phase_rad=phase * 2.0,
                charge_level=3 if f >= 2 else 2,
                flare=0.4 if f >= 2 else 0.0,
            )
            draw_left_spell_arm(
                frame,
                sh_x=23,
                sh_y=18 + cd,
                hand_x=31.0 + f * 0.8,
                hand_y=24.0 - f * 1.2,
                orb_radius=2.2,
                flare=0.3 if f >= 2 else 0.0,
                mode='orb',
                phase_rad=phase * 2.0,
            )
            # Opening vertical Solar Rift ring around Ignis
            draw_solar_rift_ring(
                frame,
                cx=24.0,
                cy=27.0,
                rx=4.2 + f * 1.1,
                ry=11.0 + f * 2.0,
                phase_rad=phase * 2.5,
                intensity=0.5 + u * 0.5,
            )

        elif f <= 9:
            # F04..F09 (Blink Phase-Out): Solar plasma silhouette tint (#fef08a / #fb923c) + vertical lightning + rift rings
            k = f - 4
            base = tpl['dash'].copy()
            base = shift_layer(base, dx=1 if k >= 2 else 0, dy=-1)
            base = apply_robe_cloak_wave(base, k * 0.9, amplitude=2.2, is_dash=True)

            phase_out_angles = [-92.0, -86.0, -80.0, -74.0, -68.0, -62.0]
            staff_deg = phase_out_angles[k]
            frame = draw_sun_staff(
                base,
                shoulder=(26, 17),
                grip_offset=(7.2, 0.5),
                staff_deg=staff_deg,
                top_len=9.0,
                bot_len=19.5,
                phase_rad=phase * 3.0,
                charge_level=3,
                flare=0.6,
            )
            draw_left_spell_arm(
                frame,
                sh_x=24,
                sh_y=18,
                hand_x=33.0,
                hand_y=21.0,
                orb_radius=2.5,
                flare=0.5,
                mode='orb',
                phase_rad=phase * 3.0,
            )
            # Tint/brighten Ignis's silhouette with golden-white solar plasma & vertical solar lightning streaks
            plasma_levels = [0.48, 0.68, 0.85, 0.92, 0.78, 0.58]
            frame = apply_solar_plasma_tint(frame, plasma_levels[k], phase * 3.0, f)
            # Dual concentric Solar Rift rings enveloping Ignis as he steps through the rift
            draw_solar_rift_ring(
                frame,
                cx=24.0 - k * 0.6,
                cy=26.5,
                rx=7.5 - abs(k - 2.5) * 0.5,
                ry=17.5,
                phase_rad=phase * 3.0,
                intensity=1.0,
            )
            draw_solar_rift_ring(
                frame,
                cx=25.0,
                cy=26.5,
                rx=4.5,
                ry=12.5,
                phase_rad=-phase * 3.0,
                intensity=0.85,
            )

        elif f <= 18:
            # F10..F18 (Blink Phase-In + Snap Solar Bolt at -38°, flare=1.0)
            k = f - 10
            hover_dy = -1 if k <= 5 else 0
            base = (tpl['dash'] if k <= 6 else tpl['cast_body']).copy()
            if hover_dy != 0:
                base = shift_layer(base, dx=0, dy=hover_dy)
            base = apply_robe_cloak_wave(base, phase * 2.5, amplitude=2.2, is_dash=(k <= 6))

            blink_cast_angles = [-52.0, -42.0, -38.0, -38.0, -38.0, -40.0, -44.0, -49.0, -54.0]
            staff_deg = blink_cast_angles[k]
            flare_val = 1.0 if k <= 5 else (0.75 if k == 6 else 0.45)
            frame = draw_sun_staff(
                base,
                shoulder=(26, 17 + hover_dy),
                grip_offset=(7.8, 1.2),
                staff_deg=staff_deg,
                top_len=8.4,
                bot_len=19.5,
                phase_rad=phase * 2.5,
                charge_level=3 if k <= 6 else 2,
                release_flash=(k <= 5),
                flare=flare_val,
            )
            draw_left_spell_arm(
                frame,
                sh_x=24,
                sh_y=18 + hover_dy,
                hand_x=34.0,
                hand_y=21.5 + hover_dy,
                orb_radius=3.0 if k <= 5 else 2.0,
                flare=flare_val,
                mode='orb',
                phase_rad=phase * 2.5,
            )
            # Residual golden-white solar plasma phase-in glow on F10..F12
            if k <= 2:
                frame = apply_solar_plasma_tint(frame, [0.42, 0.24, 0.12][k], phase * 2.5, f)
            # Arrival Solar Rift ring behind Ignis as he emerges forward firing the Snap Solar Bolt
            if k <= 6:
                draw_solar_rift_ring(
                    frame,
                    cx=max(10.0, 20.0 - k * 1.4),
                    cy=26.5,
                    rx=max(3.0, 6.5 - k * 0.6),
                    ry=max(9.0, 16.5 - k * 1.1),
                    phase_rad=phase * 2.5,
                    intensity=max(0.35, 1.0 - k * 0.12),
                )

        else:
            # F19..F29: Smooth recovery to -68° battle stance
            k = f - 19
            u = k / 10.0
            cd = [2, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0][k]
            base = make_crouch_body(tpl, cd) if cd > 0 else tpl['stand'].copy()
            base = apply_robe_cloak_wave(base, phase * 1.5, amplitude=1.6, vertical_flutter=0.5)
            staff_deg = -54.0 * (1.0 - u) + (-68.0) * u
            grip_x = 7.8 * (1.0 - u) + 7.4 * u
            grip_y = 1.5
            frame = draw_sun_staff(
                base,
                shoulder=(25, 17 + cd),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=9.5,
                bot_len=21.0,
                phase_rad=phase,
                charge_level=1 if k <= 2 else 0,
            )
            draw_left_spell_arm(
                frame,
                sh_x=23,
                sh_y=18 + cd,
                hand_x=33.0 * (1.0 - u) + 29.5 * u,
                hand_y=(22.0 + cd) * (1.0 - u) + 24.0 * u,
                orb_radius=0,
                flare=0.0,
                phase_rad=phase,
            )

        frames.append(ensure_safe_cell(frame, margin=2))
    return frames


def build_row7_crouch(tpl):
    """
    Row 7 (`CROUCH` - Flame Ward & Low Skimming Fireball, 30 frames):
    - F00..F10: While crouched (`7px`), extends his left hand forward (`hand_x = 34, hand_y = 27`)
      behind the spinning Flame-Ward shield ring!
    - F11..F18: Thrusts the Sun-Staff forward to `-38°` (`flare=1.0`) for the low skimming fireball!
    - F19..F29: Smooth recovery back to standing `-68°` stance.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi

        if f <= 10:
            depths = [1, 3, 5, 6, 7, 7, 7, 7, 7, 7, 7]
            d = depths[f]
            u = f / 10.0
            base = make_crouch_body(tpl, d)
            base = apply_robe_cloak_wave(base, phase * 1.5, amplitude=1.4, vertical_flutter=0.4)
            # Braced Sun-Staff draws back slightly (-72° -> -84°) preparing for low fireball thrust
            staff_deg = -72.0 * (1.0 - u) + (-84.0) * u
            grip_x = 7.2
            grip_y = 1.2
            frame = draw_sun_staff(
                base,
                shoulder=(25, 17 + d),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=9.0,
                bot_len=18.5,
                phase_rad=phase * 2.0,
                charge_level=2 if f >= 3 else 1,
            )
            # Extends left hand forward to (hand_x = 34, hand_y = 27) behind spinning Flame-Ward shield ring
            w_u = min(1.0, f / 3.0)
            lh_x = 31.0 * (1.0 - w_u) + 34.0 * w_u
            lh_y = 24.0 * (1.0 - w_u) + 27.0 * w_u
            draw_left_spell_arm(
                frame,
                sh_x=23,
                sh_y=18 + d,
                hand_x=lh_x,
                hand_y=lh_y,
                orb_radius=3.5,
                flare=0.45 if f >= 3 else 0.2,
                mode='ward',
                phase_rad=phase * 2.0,
            )
        elif f <= 18:
            d = 7
            k = f - 11
            base = make_crouch_body(tpl, d)
            if k in (1, 2):
                base = shift_layer(base, dx=-1, dy=0)
            base = apply_robe_cloak_wave(base, phase * 2.0, amplitude=1.6, vertical_flutter=0.5)

            # Thrusts Sun-Staff forward to -38° for the low skimming fireball!
            crouch_thrust_angles = [-58.0, -42.0, -38.0, -38.0, -39.0, -43.0, -48.0, -54.0]
            staff_deg = crouch_thrust_angles[k]
            flare_val = 1.0 if k <= 5 else 0.6
            frame = draw_sun_staff(
                base,
                shoulder=(26, 17 + d),
                grip_offset=(7.8, 1.5),
                staff_deg=staff_deg,
                top_len=8.2,
                bot_len=17.5,
                phase_rad=phase * 2.5,
                charge_level=3 if k <= 5 else 2,
                release_flash=(k <= 4),
                flare=flare_val,
            )
            draw_left_spell_arm(
                frame,
                sh_x=24,
                sh_y=18 + d,
                hand_x=34.0,
                hand_y=27.0,
                orb_radius=3.0 if k <= 5 else 2.2,
                flare=flare_val,
                mode='orb',
                phase_rad=phase * 2.5,
            )
        else:
            depths = [7, 6, 6, 5, 4, 3, 3, 2, 1, 1, 0]
            k = f - 19
            d = depths[k]
            u = k / 10.0
            base = tpl['stand'].copy() if d == 0 else make_crouch_body(tpl, d)
            base = apply_robe_cloak_wave(base, phase, amplitude=1.3, vertical_flutter=0.4)
            staff_deg = -54.0 * (1.0 - u) + (-68.0) * u
            grip_x = 7.8 * (1.0 - u) + 7.4 * u
            grip_y = 1.5
            frame = draw_sun_staff(
                base,
                shoulder=(25, 17 + d),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=9.5,
                bot_len=19.5,
                phase_rad=phase,
                charge_level=1 if k <= 2 else 0,
            )
            draw_left_spell_arm(
                frame,
                sh_x=23,
                sh_y=18 + d,
                hand_x=34.0 * (1.0 - u) + 29.5 * u,
                hand_y=27.0 * (1.0 - u) + 24.0 * u,
                orb_radius=0,
                flare=0.0,
                phase_rad=phase,
            )

        frames.append(ensure_safe_cell(frame, margin=2))
    return frames


def build_row8_jump(tpl):
    """
    Row 8 (`JUMP`, 30 frames):
    Full-body Flame-Glide Aerial Vault & mid-air Fireball cast with expressive Sun-Staff arc (`-104°` to `-38°`):
    - F00..F04: Knee-bend launch with ember burst at boots (`staff_deg = -72° -> -104°`).
    - F05..F11: Ascending aerial vault with full-length robe streaming (`staff_deg = -104° -> -58°`).
    - F12..F18: Apex mid-air hover thrusting Sun-Staff forward (`-38°`, `flare=1.0`) with Left Spellcasting Arm!
    - F19..F24: Descending flame-cushioned glide (`staff_deg = -46° -> -64°`).
    - F25..F29: Soft landing (`staff_deg = -64° -> -68°`).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi

        if f <= 4:
            crouch_seq = [1, 3, 4, 2, 0]
            cd = crouch_seq[f]
            u = f / 4.0
            body = make_crouch_body(tpl, cd) if cd >= 2 else make_jump_body(tpl, cd, tuck_amount=0.25)
            body = apply_robe_cloak_wave(body, phase * 2.0, amplitude=1.7, vertical_flutter=0.7)
            staff_deg = [-72.0, -82.0, -92.0, -100.0, -104.0][f]
            grip_x = 7.4 - u * 1.0
            grip_y = 1.5 - u * 1.5
            frame = draw_sun_staff(
                body,
                shoulder=(25, 17 + cd),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=9.2,
                bot_len=20.5,
                phase_rad=phase * 2.0,
                charge_level=1 if f >= 3 else 0,
            )
            draw_left_spell_arm(
                frame,
                sh_x=23,
                sh_y=18 + cd,
                hand_x=30.0 + u * 2.0,
                hand_y=24.0 - u * 2.0,
                orb_radius=1.8 if f >= 2 else 0,
                flare=0.0,
                phase_rad=phase * 2.0,
            )
            if f >= 2:
                for ex_b in (18, 22, 27, 31):
                    set_px(frame, ex_b, 48, SOLAR_YELLOW if ex_b % 2 == 0 else FLAME_ORANGE)
                    set_px(frame, ex_b, 49, FLAME_CRIMSON)

        elif f <= 11:
            k = f - 5
            u = k / 6.0
            tuck = 0.45 + 0.45 * math.sin(u * math.pi * 0.65)
            body = make_jump_body(tpl, -1, tuck_amount=tuck, torso_lean_dx=1 if k >= 3 else 0)
            body = apply_robe_cloak_wave(body, phase * 2.0, amplitude=2.0, vertical_flutter=0.8)
            staff_deg = -104.0 * (1.0 - u) + (-58.0) * u
            grip_x = 6.4 * (1.0 - u) + 7.8 * u
            grip_y = 0.0 * (1.0 - u) + 1.0 * u
            frame = draw_sun_staff(
                body,
                shoulder=(26 if k >= 3 else 25, 16),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=9.0,
                bot_len=20.0,
                phase_rad=phase * 2.0,
                charge_level=2 if k >= 4 else 1,
            )
            draw_left_spell_arm(
                frame,
                sh_x=23,
                sh_y=17,
                hand_x=32.0 + u * 1.5,
                hand_y=21.5 - u * 1.0,
                orb_radius=2.5,
                flare=0.3 if k >= 5 else 0.0,
                phase_rad=phase * 2.0,
            )
            for j in range(3):
                jx = 18 + j * 5 + (f % 2)
                jy = 47 + (j % 2)
                set_px(frame, jx, jy, SOLAR_YELLOW if j == 1 else FLAME_ORANGE)
                set_px(frame, jx, min(49, jy + 1), FLAME_CRIMSON)

        elif f <= 18:
            k = f - 12
            tuck = 0.85 - k * 0.03
            recoil_dx = -1 if k in (2, 3) else 0
            body = make_jump_body(tpl, -1, tuck_amount=tuck, torso_lean_dx=1 + recoil_dx)
            body = apply_robe_cloak_wave(body, phase * 2.5, amplitude=2.1, vertical_flutter=0.9)
            apex_angles = [-48.0, -40.0, -38.0, -38.0, -40.0, -43.0, -46.0]
            staff_deg = apex_angles[k]
            flare_val = 1.0 if 1 <= k <= 4 else 0.65
            frame = draw_sun_staff(
                body,
                shoulder=(26 + recoil_dx, 16),
                grip_offset=(7.8, 1.2),
                staff_deg=staff_deg,
                top_len=8.4,
                bot_len=19.5,
                phase_rad=phase * 2.5,
                charge_level=3 if k <= 4 else 2,
                release_flash=(1 <= k <= 4),
                flare=flare_val,
            )
            draw_left_spell_arm(
                frame,
                sh_x=24 + recoil_dx,
                sh_y=17,
                hand_x=34.0,
                hand_y=20.5,
                orb_radius=3.0 if k <= 4 else 2.2,
                flare=flare_val,
                phase_rad=phase * 2.5,
            )
            for j in range(3):
                jx = 18 + j * 5 + (f % 2)
                set_px(frame, jx, 47, FLAME_GOLD)

        elif f <= 24:
            k = f - 19
            u = k / 5.0
            tuck = 0.65 * (1.0 - u) + 0.15 * u
            body = make_jump_body(tpl, 0, tuck_amount=tuck)
            body = apply_robe_cloak_wave(body, phase * 2.0, amplitude=1.9, vertical_flutter=0.8)
            staff_deg = -46.0 * (1.0 - u) + (-64.0) * u
            grip_x = 7.8 * (1.0 - u) + 7.5 * u
            grip_y = 1.5
            frame = draw_sun_staff(
                body,
                shoulder=(25, 17),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=9.2,
                bot_len=20.5,
                phase_rad=phase * 2.0,
                charge_level=1 if k <= 2 else 0,
            )
            draw_left_spell_arm(
                frame,
                sh_x=23,
                sh_y=18,
                hand_x=33.0 * (1.0 - u) + 30.0 * u,
                hand_y=21.5 * (1.0 - u) + 23.5 * u,
                orb_radius=0,
                flare=0.0,
                phase_rad=phase * 2.0,
            )
            for j in range(3):
                jx = 18 + j * 5
                set_px(frame, jx, 48, FLAME_ORANGE)

        else:
            k = f - 25
            crouch_depths = [2, 3, 2, 1, 0]
            cd = crouch_depths[k]
            body = tpl['stand'].copy() if cd == 0 else make_crouch_body(tpl, cd)
            body = apply_robe_cloak_wave(body, phase, amplitude=1.5, vertical_flutter=0.5)
            u = k / 4.0
            staff_deg = -64.0 * (1.0 - u) + (-68.0) * u
            grip_x = 7.5 * (1.0 - u) + 7.4 * u
            grip_y = 1.5
            frame = draw_sun_staff(
                body,
                shoulder=(25, 17 + cd),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=9.5,
                bot_len=21.0,
                phase_rad=phase,
                charge_level=0,
            )
            draw_left_spell_arm(
                frame,
                sh_x=23,
                sh_y=18 + cd,
                hand_x=29.5,
                hand_y=24.0 + cd,
                orb_radius=0,
                flare=0.0,
                phase_rad=phase,
            )

        frames.append(ensure_safe_cell(frame, margin=2))
    return frames


gen_row0_idle = build_row0_idle
gen_row1_walk = build_row1_walk
gen_row2_auto_attack = build_row2_auto_attack
gen_row3_skill = build_row3_skill
gen_row4_ult = build_row4_ultimate
gen_row5_death = build_row5_death
gen_row6_dash = build_row6_dash
gen_row7_crouch = build_row7_crouch
gen_row8_jump = build_row8_jump


def main():
    src = load_source_cells()
    tpl = make_clean_templates(src)

    rows = [
        ('ROW 0: IDLE - SOLAR PYROMANCER BREATHING (30 FRAMES)', build_row0_idle(tpl)),
        ('ROW 1: WALK - BATTLE-MAGE STRIDE CYCLE (30 FRAMES)', build_row1_walk(tpl)),
        ('ROW 2: AUTO_ATTACK - PYROMANTIC FIREBALL CAST (30 FRAMES)', build_row2_auto_attack(tpl)),
        ('ROW 3: SKILL - HELLFIRE PILLARS & DETONATION (30 FRAMES)', build_row3_skill(tpl)),
        ('ROW 4: ULTIMATE - CATACLYSM ECLIPSE SUPERNOVA (30 FRAMES)', build_row4_ultimate(tpl)),
        ('ROW 5: DEATH & HURT - COLLAPSE & FLAT STAFF (30 FRAMES)', build_row5_death(tpl)),
        ('ROW 6: DASH - SOLAR RIFT ARCANE BLINK (30 FRAMES)', build_row6_dash(tpl)),
        ('ROW 7: CROUCH - FLAME-WARD & LOW FIREBALL (30 FRAMES)', build_row7_crouch(tpl)),
        ('ROW 8: JUMP - FLAME-GLIDE VAULT & AERIAL SHOT (30 FRAMES)', build_row8_jump(tpl)),
    ]

    num_rows = len(rows)
    cell_px = 208
    sheet = Image.new('RGBA', (30 * cell_px, num_rows * cell_px), (0, 0, 0, 0))

    clipped_frames = 0
    for r_idx, (r_name, r_frames) in enumerate(rows):
        assert len(r_frames) == 30, f'{r_name} has {len(r_frames)} frames instead of 30'
        for c_idx in range(30):
            r_frames[c_idx] = ensure_safe_cell(r_frames[c_idx], margin=2)
            arr = r_frames[c_idx]
            left_edge = int(np.sum(arr[:, :2, 3] > 0))
            right_edge = int(np.sum(arr[:, 50:, 3] > 0))
            top_edge = int(np.sum(arr[:2, :, 3] > 0))
            bottom_edge = int(np.sum(arr[50:, :, 3] > 0))
            if left_edge > 0 or right_edge > 0 or top_edge > 0 or bottom_edge > 0:
                clipped_frames += 1
        adj_diffs = sum(1 for i in range(29) if np.any(r_frames[i] != r_frames[i + 1]))
        assert adj_diffs == 29, f'{r_name} has only {adj_diffs}/29 distinct adjacent transitions'
        print(f'{r_name:58s}: 30 frames generated, {adj_diffs}/29 adjacent transitions distinct')
        for c_idx, arr in enumerate(r_frames):
            cell_im = Image.fromarray(arr, mode='RGBA').resize((cell_px, cell_px), Image.NEAREST)
            sheet.paste(cell_im, (c_idx * cell_px, r_idx * cell_px))

    assert clipped_frames == 0, f'Found {clipped_frames}/270 boundary-clipped frames!'
    print(f'Boundary verification: {clipped_frames}/270 clipped frames (all pixels strictly in 2..49)')

    sheet.save('assets/sprites/mage_sheet.png')
    print('Saved assets/sprites/mage_sheet.png:', sheet.size)

    # Render zoomed-in left (F00..F14) and right (F15..F29) contact sheets in caller's artifact directory
    preview_cell = 96
    pad_top = 24
    dbg = Image.new('RGBA', (30 * preview_cell, num_rows * (preview_cell + pad_top)), (15, 20, 30, 255))
    draw = ImageDraw.Draw(dbg)
    for r_idx, (r_name, r_frames) in enumerate(rows):
        y0 = r_idx * (preview_cell + pad_top)
        draw.rectangle([0, y0, 30 * preview_cell, y0 + pad_top - 2], fill=(28, 22, 34, 255))
        draw.text((8, y0 + 5), r_name, fill=(251, 146, 60, 255))
        for c_idx, arr in enumerate(r_frames):
            x0 = c_idx * preview_cell
            draw.text((x0 + 4, y0 + 13), f'F{c_idx:02d}', fill=(254, 240, 138, 255))
            p_im = Image.fromarray(arr, mode='RGBA').resize((preview_cell, preview_cell), Image.NEAREST)
            dbg.paste(p_im, (x0, y0 + pad_top), p_im)
            draw.rectangle(
                [x0, y0 + pad_top, x0 + preview_cell - 1, y0 + pad_top + preview_cell - 1],
                outline=(55, 38, 48, 255)
            )

    art_dir = '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/4f1fb80f-a88f-4496-9746-b4b9fe84f6d4'
    left_im = dbg.crop((0, 0, 15 * preview_cell, dbg.height))
    right_im = dbg.crop((15 * preview_cell, 0, 30 * preview_cell, dbg.height))
    left_im.save(f'{art_dir}/debug_mage_30fps_left_F00_F14.png')
    right_im.save(f'{art_dir}/debug_mage_30fps_right_F15_F29.png')
    print('Saved debug sheets in:', art_dir)


if __name__ == '__main__':
    main()


