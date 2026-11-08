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
    if 1 <= ix <= 50 and 1 <= iy <= 50:
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


def fill_layer_pinholes(layer, x0=1, x1=50, y0=1, y1=50, require_3_neighbors=False):
    """
    Fills 1px transparent pinholes/slits inside moved, waved, or rotated pixel layers
    so movement never causes missing interior pixels or torn seams.
    """
    out = layer.copy()
    for _ in range(2):
        prev = out.copy()
        alpha = prev[:, :, 3] > 0
        for y in range(max(1, y0), min(51, y1)):
            for x in range(max(1, x0), min(51, x1)):
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
    Shifts `layer` by `(dx, dy)` inside safe cell bounds `[1..50]` without `np.roll` wrap-around,
    then fills any 1px pinholes.
    """
    out = np.zeros_like(layer)
    for y in range(52):
        ny = y + int(round(dy))
        if 1 <= ny <= 50:
            for x in range(52):
                nx = x + int(round(dx))
                if 1 <= nx <= 50 and layer[y, x, 3] > 0:
                    out[ny, nx] = layer[y, x]
    return fill_layer_pinholes(out)


def ensure_safe_cell(cell, margin=1):
    """
    Guarantees zero pixels touch the 52x52 cell border (x=0, x=51, y=0, y=51) and fills
    any 1px interior pinholes from movement.
    """
    out = fill_layer_pinholes(cell, 1, 50, 1, 50, require_3_neighbors=True)
    ys, xs = np.where(out[:, :, 3] > 0)
    if len(ys) == 0:
        return out
    ymin, ymax = int(ys.min()), int(ys.max())
    xmin, xmax = int(xs.min()), int(xs.max())

    min_b = margin
    max_b = 51 - margin

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
    Completely strips Ignis Sol's baked-in right arm, protruding left hanging sleeve/arm,
    and any bright gold/skin/orange hand or cuff pixels on his chest so that when the
    single Right Staff 2-Bone IK Arm is drawn, Ignis has ONE clean weapon arm and ZERO
    extra limbs or chest-hands.
    """
    out = cell.copy()

    if mode == 'stand':
        # 1. Completely erase protruding right arm (x=29..42, y=17..31) & right staff/ribbon remnants
        out[0:17, 30:52] = 0
        out[17:31, 29:52] = 0
        out[31:50, 31:52] = 0

        # 2. Trim protruding left hanging arm/sleeve outside the cloak silhouette
        out[20:37, 0:16] = 0
        out[37:47, 0:15] = 0

        # 3. Blend the dark left-sleeve interior seam (x=17..20, y=22..35) into the crimson robe
        for y in range(22, 36):
            for x in range(17, 21):
                r, g, b, a = out[y, x]
                if a > 0 and r < 60 and g < 45:
                    out[y, x] = ROBE_DARK

        # 4. Replace any bright gold/skin/orange hand or cuff pixels on chest (y=18..35, x=16..29)
        for y in range(18, 36):
            for x in range(16, 29):
                r, g, b, a = out[y, x]
                if a > 0 and r > 160 and g > 90:
                    out[y, x] = ROBE_MID if 21 <= x <= 26 else ROBE_DARK

    elif mode == 'kneel':
        # Erase protruding right arm and diagonal staff on kneeling templates
        out[0:17, 32:52] = 0
        out[17:34, 30:52] = 0
        out[34:44, 31:52] = 0
        out[22:38, 0:15] = 0
        for y in range(44, 51):
            for x in range(34, 52):
                if x >= 39:
                    out[y, x] = 0
                elif out[y, x, 3] > 0:
                    out[y, x] = CRIMSON_DARK if y < 48 else GOLD_DARK

        # Replace any bright gold/skin/orange hand or cuff pixels on chest
        for y in range(18, 36):
            for x in range(16, 30):
                r, g, b, a = out[y, x]
                if a > 0 and r > 160 and g > 90:
                    out[y, x] = ROBE_MID if 21 <= x <= 27 else ROBE_DARK

    elif mode == 'dash':
        # Erase protruding right arm and staff on dash template
        out[0:18, 35:52] = 0
        out[18:48, 33:52] = 0
        for y in range(20, 35):
            for x in range(22, 33):
                r, g, b, a = out[y, x]
                if a > 0 and r > 160 and g > 90:
                    out[y, x] = ROBE_MID if 25 <= x <= 30 else ROBE_DARK

    return out


def make_clean_templates(src):
    """
    Extracts clean, right-facing (+X) templates from `backups/mage_sheet_before_30fps.png`,
    calling `neutralize_mage_baked_arms` to strip 100% of baked-in arms, chest-hands, and staffs
    so we can animate a single crisp `draw_sun_staff` + Right IK Arm per frame.
    """
    # 1. Clean standing body facing RIGHT (baked left/right arms & chest hands stripped)
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
    leg_back_patch[44:50, 16:23] = stand[44:50, 16:23]
    leg_front_patch[44:50, 24:31] = stand[44:50, 24:31]

    # Upper torso + full robe down to y=44 (without bottom boot tips y >= 45)
    stand_upper = stand.copy()
    stand_upper[45:, :, :] = 0
    stand_upper = fill_layer_pinholes(add_outline_to_layer(stand_upper))

    # 2. Clean forward-leaning casting body (hat & torso leaned +1px right, baked arms neutralized)
    cast_body = np.zeros((52, 52, 4), dtype=np.uint8)
    for y in range(52):
        lean_dx = 1 if y <= 30 else 0
        for x in range(52):
            if stand[y, x, 3] > 0:
                nx = min(50, x + lean_dx)
                cast_body[y, nx] = stand[y, x]
    cast_body = neutralize_mage_baked_arms(cast_body, mode='stand')
    cast_body = fill_layer_pinholes(add_outline_to_layer(cast_body))

    # 3. Clean kneeling bodies (kneel1, kneel2) facing RIGHT without baked-in arms or staff
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

    # 5. Clean aerodynamic Flame-Step Dash body facing RIGHT (baked right arm & staff stripped)
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
    crimson-and-gold left cloak edge without creating detached strips or distorting his hat/boots.
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

    # Gentle left cloak-edge ripple (x = 14..19, y = 20..44) anchored seamlessly to torso
    for y in range(20, 45):
        u = (y - 20) / 24.0
        wave_x = math.sin(phase_rad - u * 3.5) * min(1.2, amplitude * 0.65) * u
        dx = int(round(wave_x))
        if dx < 0:
            # Extend left cloak edge by 1px with dark crimson/mantle shading
            for x in range(15, 20):
                if frame[y, x, 3] > 0 and not np.array_equal(frame[y, x], OUTLINE):
                    nx = max(2, x - 1)
                    out[y, nx] = ROBE_DARK if y >= 26 else MANTLE_DARK
                    break

    out = fill_layer_pinholes(out)
    return add_outline_to_layer(out)


apply_mantle_wave = apply_robe_cloak_wave


def solve_ik_elbow(sx, sy, hx, hy, L1=6.6, L2=6.4, bend_side=1.0):
    """
    2-Bone Inverse Kinematics solver returning the anatomical elbow joint (ex, ey)
    between shoulder (sx, sy) and hand (hx, hy).
    `bend_side = +1.0` bends the elbow naturally downward/back-left for a right-facing mage.
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


def draw_ik_mage_arm(layer, sx, sy, hx, hy, L1=6.6, L2=6.4, bend_side=1.0, is_offhand=False):
    """
    Draws Ignis Sol's single sculpted 2-segment Right Staff Pyromancer Arm:
    - Rotating crimson-and-gold pyromancer mantle shoulder cap at (sx, sy)
    - 3px-thick crimson bell-sleeve upper arm from (sx, sy) to (ex, ey)
    - Golden rune-trimmed elbow fold at (ex, ey)
    - 3px-thick forearm sleeve + ornate gold bracer cuff from (ex, ey) to (hx, hy)
    - 2x2 warm skin/flame-lit hand at (hx, hy)
    """
    ex, ey = solve_ik_elbow(sx, sy, hx, hy, L1=L1, L2=L2, bend_side=bend_side)

    c_hi, c_mid, c_dark = ROBE_LIGHT, ROBE_MID, ROBE_DARK
    c_gold, c_gold_dark = GOLD_BRIGHT, GOLD_MID
    c_skin_hi, c_skin_mid = SKIN_LIGHT, SKIN_MID

    # 1. 3px-thick crimson bell-sleeve upper arm from (sx, sy) to (ex, ey)
    u1x, u1y = ex - sx, ey - sy
    d1 = max(1.0, math.hypot(u1x, u1y))
    n1x, n1y = -u1y / d1, u1x / d1
    draw_line_px(layer, sx + n1x * 0.9, sy + n1y * 0.9, ex + n1x * 0.8, ey + n1y * 0.8, c_hi)
    draw_line_px(layer, sx - n1x * 0.9, sy - n1y * 0.9, ex - n1x * 0.8, ey - n1y * 0.8, c_dark)
    draw_line_px(layer, sx, sy, ex, ey, c_mid)

    # 2. 3px-thick forearm sleeve + ornate gold bracer cuff from (ex, ey) to (hx, hy)
    u2x, u2y = hx - ex, hy - ey
    d2 = max(1.0, math.hypot(u2x, u2y))
    n2x, n2y = -u2y / d2, u2x / d2
    draw_line_px(layer, ex + n2x * 0.9, ey + n2y * 0.9, hx + n2x * 0.7, hy + n2y * 0.7, c_hi)
    draw_line_px(layer, ex - n2x * 0.9, ey - n2y * 0.9, hx - n2x * 0.7, hy - n2y * 0.7, c_dark)
    draw_line_px(layer, ex, ey, hx, hy, c_mid)

    # Ornate gold bracer cuff near wrist
    cx_w = ex + u2x * 0.72
    cy_w = ey + u2y * 0.72
    set_px(layer, cx_w, cy_w, c_gold)
    set_px(layer, cx_w + n2x * 0.8, cy_w + n2y * 0.8, c_gold)
    set_px(layer, cx_w - n2x * 0.8, cy_w - n2y * 0.8, c_gold_dark)

    # 3. Rotating crimson-and-gold pyromancer mantle shoulder cap at (sx, sy)
    ux1, uy1 = u1x / d1, u1y / d1
    for p_step in (-1.3, -0.5, 0.5, 1.3):
        px_s = sx + ux1 * 1.0 + n1x * p_step
        py_s = sy + uy1 * 1.0 + n1y * p_step
        set_px(layer, px_s, py_s, c_gold if abs(p_step) > 0.9 else c_hi)
        set_px(layer, sx + n1x * p_step, sy + n1y * 0.9 * p_step, c_mid)
    set_px(layer, sx, sy - 1, c_gold)

    # 4. Golden rune-trimmed elbow fold at (ex, ey)
    set_px(layer, ex, ey, c_gold)
    set_px(layer, ex + n1x * 0.75, ey + n1y * 0.75, c_hi)
    set_px(layer, ex - n1x * 0.75, ey - n1y * 0.75, c_gold_dark)

    # 5. 2x2 warm skin/flame-lit hand gripping the staff at (hx, hy)
    set_px(layer, hx, hy, c_skin_hi)
    set_px(layer, hx + 1, hy, c_skin_hi)
    set_px(layer, hx, hy + 1, c_skin_mid)
    set_px(layer, hx + 1, hy + 1, c_skin_mid)


def draw_sun_staff(
    base_frame,
    shoulder=(26, 19),
    grip_offset=(8.0, 1.0),
    staff_deg=-80.0,
    top_len=14.5,
    bot_len=24.0,
    phase_rad=0.0,
    charge_level=0,
    release_flash=False,
    left_orb_mode='none',
    left_hand_pos=None,
    solar_wings=0.0,
    ground_shockwave=0.0,
    eclipse_crown=0.0,
    orb_glow=1.0,
):
    """
    Renders Ignis Sol's SINGLE articulated Solar Sun-Staff (`draw_sun_staff`)
    and ONLY ONE clean, unmistakable Right Staff 2-Bone IK Arm (`is_offhand=False`)
    extending from shoulder (26, 19) out in front of his torso to `gx = 33..39`
    (or `gx = 31..34, gy = 11..14` during high overhead windup) — ZERO chest hands or extra limbs!
    """
    staff_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    right_arm_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    fx_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    # Anchor the single Right Staff IK Arm cleanly on Ignis's right shoulder (x=26..28, y=18..22)
    raw_sx = float(shoulder[0])
    raw_sy = float(shoulder[1])
    sx = max(25.0, min(28.0, raw_sx - 3.0 if raw_sx >= 29.0 else raw_sx))
    sy = max(16.0, min(27.0, raw_sy - 1.0 if raw_sy >= 20.0 else raw_sy))

    # Compute target grip (gx, gy) and strictly enforce that gx stays out in front of Ignis's torso:
    # gx in [33..39, gy in 13..24], or gx in [31..39, gy in 11..14] during high overhead windup!
    raw_gx = raw_sx + float(grip_offset[0])
    raw_gy = raw_sy + float(grip_offset[1])
    gy = float(max(11.0, min(25.0, raw_gy)))
    min_gx = 31.5 if gy <= 14.5 else 33.0
    gx = float(max(min_gx, min(39.0, raw_gx)))

    rad = math.radians(staff_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    px, py = -uy, ux

    # 1. Optional Blazing Solar Mantle Wings behind cloak (Ultimate Stage 2..3)
    if solar_wings > 0.05:
        wing_span = int(round(4 + solar_wings * 7))
        for w_i in range(1, wing_span + 1):
            frac = w_i / max(1.0, float(wing_span))
            for branch, by_off in [(-1, -w_i * 0.85), (0, -w_i * 0.35), (1, w_i * 0.45)]:
                wx = max(3.0, min(16.0, 16 - w_i * 1.05))
                wy = max(3.0, min(48.0, sy - 2 + by_off + math.sin(phase_rad * 2.0 + w_i * 0.6 + branch) * 0.8))
                col = SOLAR_YELLOW if frac < 0.35 else (FLAME_ORANGE if frac < 0.75 else FLAME_CRIMSON)
                set_px(fx_layer, wx, wy, col)
                if frac < 0.6:
                    set_px(fx_layer, wx, min(48.0, wy + 1), FLAME_GOLD)

    # 2. Optional Front Flame-Ward Shield Ring (ONLY far in front of staff at x >= 40 during CROUCH)
    if left_orb_mode == 'ward_shield' and left_hand_pos is not None:
        wcx = max(40.0, min(44.0, float(left_hand_pos[0])))
        wcy = max(14.0, min(38.0, float(left_hand_pos[1])))
        rx, ry = 3.0, 6.8
        for s in range(20):
            a = (s / 20.0) * 2.0 * math.pi + phase_rad * 2.5
            wx = max(3.0, min(48.0, wcx + math.cos(a) * rx))
            wy = max(3.0, min(48.0, wcy + math.sin(a) * ry))
            col = SOLAR_WHITE if s % 5 == 0 else (SOLAR_YELLOW if s % 2 == 0 else FLAME_ORANGE)
            set_px(fx_layer, wx, wy, col)
        draw_line_px(fx_layer, wcx, max(3.0, wcy - 4), wcx, min(48.0, wcy + 4), FLAME_GOLD)
        draw_line_px(fx_layer, max(3.0, wcx - 2), wcy, min(48.0, wcx + 2), wcy, SOLAR_YELLOW)
        set_px(fx_layer, wcx, wcy, SOLAR_WHITE)

    # 3. Auto-foreshorten top_len and bot_len dynamically so Sun-Wheel Finial center (fin_cx, fin_cy)
    #    stays inside x in [7.5..43.0], y in [7.5..43.0] and butt stays inside [3.5..47.5, 3.5..48.0]
    max_fin_dist = float(top_len) + 2.2
    if ux > 0.05:
        max_fin_dist = min(max_fin_dist, (43.0 - gx) / ux)
    elif ux < -0.05:
        max_fin_dist = min(max_fin_dist, (7.5 - gx) / ux)
    if uy > 0.05:
        max_fin_dist = min(max_fin_dist, (43.0 - gy) / uy)
    elif uy < -0.05:
        max_fin_dist = min(max_fin_dist, (7.5 - gy) / uy)
    eff_top_len = max(3.8, max_fin_dist - 2.2)

    eff_bot_len = float(bot_len)
    if -ux > 0.05:
        eff_bot_len = min(eff_bot_len, (47.5 - gx) / (-ux))
    elif -ux < -0.05:
        eff_bot_len = min(eff_bot_len, (3.5 - gx) / (-ux))
    if -uy > 0.05:
        eff_bot_len = min(eff_bot_len, (48.0 - gy) / (-uy))
    elif -uy < -0.05:
        eff_bot_len = min(eff_bot_len, (3.5 - gy) / (-uy))
    eff_bot_len = max(3.0, eff_bot_len)

    bx = gx - ux * eff_bot_len
    by = gy - uy * eff_bot_len
    hx = gx + ux * eff_top_len
    hy = gy + uy * eff_top_len

    # Draw 2px-thick sculpted bronze-and-gold staff shaft
    steps = int(max(abs(hx - bx), abs(hy - by), 1) * 1.5)
    for i in range(steps + 1):
        t = i / max(1, steps)
        cx_s = bx + (hx - bx) * t
        cy_s = by + (hy - by) * t
        is_band = abs(t - 0.18) < 0.04 or abs(t - 0.55) < 0.04 or abs(t - 0.84) < 0.05
        col_core = GOLD_BRIGHT if is_band else GOLD_TRIM
        col_edge = GOLD_MID if is_band else WOOD_DARK
        set_px(staff_layer, cx_s, cy_s, col_core)
        set_px(staff_layer, cx_s + px * 0.75, cy_s + py * 0.75, col_edge)

    # Ornate Golden Butt Spike
    set_px(staff_layer, bx, by, GOLD_BRIGHT)
    set_px(staff_layer, max(2.0, min(49.0, bx - ux * 0.8)), max(2.0, min(49.0, by - uy * 0.8)), GOLD_MID)

    # 4. Solar Sun-Wheel Finial at (fin_cx, fin_cy) clamped inside [7.5..43.0]
    fin_cx = max(7.5, min(43.0, hx + ux * 2.2))
    fin_cy = max(7.5, min(43.0, hy + uy * 2.2))
    ring_r = 3.2

    # Golden Sun-Wheel Outer Halo & 8 Radial Sun-Spikes
    for s in range(16):
        a = (s / 16.0) * 2.0 * math.pi + phase_rad
        rx = fin_cx + math.cos(a) * ring_r
        ry = fin_cy + math.sin(a) * ring_r
        set_px(staff_layer, rx, ry, GOLD_BRIGHT if s % 2 == 0 else GOLD_MID)
        if s % 4 == 0:
            sx_tip = fin_cx + math.cos(a) * (ring_r + 1.4)
            sy_tip = fin_cy + math.sin(a) * (ring_r + 1.4)
            set_px(staff_layer, sx_tip, sy_tip, SOLAR_YELLOW if charge_level >= 1 else GOLD_BRIGHT)

    # Finial Cradle Collar
    set_px(staff_layer, hx, hy, GOLD_BRIGHT)
    set_px(staff_layer, hx + px, hy + py, GOLD_MID)
    set_px(staff_layer, hx - px, hy - py, GOLD_MID)

    # 5. SINGLE Right Staff 2-Bone IK Arm (drawn OVER the staff shaft from (sx, sy) to (gx, gy))
    draw_ik_mage_arm(right_arm_layer, sx, sy, gx, gy, L1=6.6, L2=6.4, bend_side=1.0, is_offhand=False)

    # 6. Pulsing Miniature Sun Core inside the Sun-Wheel Finial
    core_pulse = 1 if (charge_level >= 1 or int(round(phase_rad * 3)) % 2 == 0) else 0
    set_px(fx_layer, fin_cx, fin_cy, SOLAR_WHITE)
    for dx_c, dy_c in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        set_px(fx_layer, fin_cx + dx_c, fin_cy + dy_c, SOLAR_YELLOW if core_pulse else FLAME_GOLD)

    # 7. Finial Charge Corona & Muzzle Release Flash (clamped safely inside [2..48])
    if charge_level >= 1:
        for d in range(1, charge_level + 2):
            col = SOLAR_WHITE if d == 1 else (SOLAR_YELLOW if d == 2 else FLAME_ORANGE)
            set_px(
                fx_layer,
                max(2.0, min(48.0, fin_cx + ux * (ring_r + d))),
                max(2.0, min(48.0, fin_cy + uy * (ring_r + d))),
                col,
            )
            set_px(
                fx_layer,
                max(2.0, min(48.0, fin_cx + px * (ring_r + d * 0.7))),
                max(2.0, min(48.0, fin_cy + py * (ring_r + d * 0.7))),
                FLAME_GOLD,
            )
            set_px(
                fx_layer,
                max(2.0, min(48.0, fin_cx - px * (ring_r + d * 0.7))),
                max(2.0, min(48.0, fin_cy - py * (ring_r + d * 0.7))),
                FLAME_GOLD,
            )

    if release_flash:
        fcx = max(4.0, min(45.0, fin_cx + ux * 2.5))
        fcy = max(4.0, min(45.0, fin_cy + uy * 2.5))
        set_px(fx_layer, fcx, fcy, SOLAR_WHITE)
        for d in range(1, 5):
            c_main = SOLAR_WHITE if d <= 2 else (SOLAR_YELLOW if d <= 3 else FLAME_ORANGE)
            set_px(fx_layer, max(2.0, min(48.0, fcx + ux * d)), max(2.0, min(48.0, fcy + uy * d)), c_main)
            if d <= 3:
                set_px(
                    fx_layer,
                    max(2.0, min(48.0, fcx + px * d)),
                    max(2.0, min(48.0, fcy + py * d)),
                    SOLAR_YELLOW if d <= 2 else FLAME_CRIMSON,
                )
                set_px(
                    fx_layer,
                    max(2.0, min(48.0, fcx - px * d)),
                    max(2.0, min(48.0, fcy - py * d)),
                    SOLAR_YELLOW if d <= 2 else FLAME_CRIMSON,
                )
        for dx_f, dy_f in [(-2, -2), (2, -2), (-2, 2), (2, 2)]:
            set_px(fx_layer, max(2.0, min(48.0, fcx + dx_f)), max(2.0, min(48.0, fcy + dy_f)), FLAME_GOLD)

    # 8. Optional Ground Magma Shockwave Ring (Row 3 Phase 1 Staff Slam)
    if ground_shockwave > 0.05:
        ring_rx = int(round(4 + ground_shockwave * 11))
        ring_cx = int(round(max(16.0, min(34.0, bx))))
        ring_cy = 47
        for s in range(28):
            a = (s / 28.0) * 2.0 * math.pi
            mx = max(3.0, min(48.0, ring_cx + math.cos(a) * ring_rx))
            my = max(3.0, min(48.0, ring_cy + math.sin(a) * 1.5))
            col = SOLAR_WHITE if (ground_shockwave < 0.4 and s % 3 == 0) else (
                SOLAR_YELLOW if s % 2 == 0 else FLAME_ORANGE
            )
            set_px(fx_layer, mx, my, col)
            if s % 4 == 0 and ground_shockwave < 0.85:
                gh = int(round((1.0 - ground_shockwave) * 5.0))
                for gy_i in range(1, gh + 1):
                    set_px(fx_layer, mx, max(3.0, my - gy_i), SOLAR_YELLOW if gy_i == 1 else FLAME_CRIMSON)

    # 9. Optional Miniature Black-Gold Eclipse Corona above Crown (Row 4 Ultimate: ecy=8.5, r <= 4.5, y >= 3)
    if eclipse_crown > 0.05:
        ecx, ecy = 25.0, 8.5
        er = min(3.2, 1.8 + eclipse_crown * 1.4)
        for dy_e in range(-5, 6):
            for dx_e in range(-5, 6):
                d = math.hypot(dx_e, dy_e)
                ey_px = max(3.0, min(48.0, ecy + dy_e))
                ex_px = max(3.0, min(48.0, ecx + dx_e))
                if d <= er * 0.62:
                    set_px(fx_layer, ex_px, ey_px, VOID_BLACK)
                elif d <= er:
                    set_px(fx_layer, ex_px, ey_px, SOLAR_WHITE if d < er * 0.78 else SOLAR_YELLOW)
                elif d <= min(4.5, er + 1.2) and (dx_e + dy_e + int(round(phase_rad * 4))) % 2 == 0:
                    set_px(fx_layer, ex_px, ey_px, FLAME_ORANGE if d < er + 0.7 else FLAME_CRIMSON)

    out = composite_over(base_frame, add_outline_to_layer(staff_layer))
    out = composite_over(out, add_outline_to_layer(right_arm_layer))
    out = composite_over(out, fx_layer)
    return fill_layer_pinholes(out, 1, 50, 1, 50, require_3_neighbors=True)


def render_walk_legs(tpl, f):
    """
    Renders a smooth 30-frame 2-step Battle-Mage Stride Cycle (F00..F14 step A, F15..F29 step B)
    keeping Ignis's full-length crimson & gold robe (`y = 0..45`) 100% intact from `tpl['stand']`
    with progressive horizontal stride-sway / pleat-shear (`y = 30..45`) and small animated boot toes
    peeking cleanly at `y = 45..47` — ZERO horizontal cut at y=36 and ZERO extra legs!
    """
    phase = (f / 30.0) * 2.0 * math.pi
    bob_y = int(round(math.cos(phase * 2.0) * 1.0))

    stand = tpl['stand'].copy()
    out = np.zeros((52, 52, 4), dtype=np.uint8)

    # 1. Upper body (y = 0..29): apply vertical bob (`bob_y`) and slight +1px forward stride lean
    for y in range(0, 30):
        ny = y + bob_y
        if not (2 <= ny < 50):
            continue
        lean_dx = 1 if y <= 26 else 0
        for x in range(2, 48):
            if stand[y, x, 3] > 0:
                out[ny, min(49, x + lean_dx)] = stand[y, x]

    # When bob_y == -1, duplicate row 29 so shifting y=0..29 up by 1px never opens a waist slit
    if bob_y < 0:
        for x in range(2, 48):
            if stand[29, x, 3] > 0:
                out[29, x] = stand[29, x]

    # 2. Full-length lower crimson & gold robe (y = 30..44): smooth progressive horizontal stride-sway / pleat-shear
    for y in range(30, 45):
        v = (y - 30) / 15.0
        dx_front = int(round(math.sin(phase) * 2.5 * v))
        dx_back = int(round(math.sin(phase - v * 2.5) * 2.0 * v))

        xs = np.where((stand[y, :, 3] > 0) & ~np.all(stand[y, :, :] == OUTLINE, axis=-1))[0]
        if len(xs) == 0:
            continue
        x0, x1 = int(xs.min()), int(xs.max())
        nx0 = max(4, min(46, x0 + dx_back))
        nx1 = max(nx0 + 4, min(47, x1 + dx_front))

        span_src = max(1.0, float(x1 - x0))
        span_dst = max(1.0, float(nx1 - nx0))
        for nx in range(nx0, nx1 + 1):
            u_x = (nx - nx0) / span_dst
            sx_sample = int(round(x0 + u_x * span_src))
            col = stand[y, sx_sample].copy()
            if col[3] == 0 or np.array_equal(col, OUTLINE):
                col = ROBE_MID if u_x > 0.45 else ROBE_DARK
            out[y, nx] = col

        # Preserve crisp vertical golden center robe trim swaying with the stride
        trim_x = int(round(23.0 + math.sin(phase) * 2.2 * v))
        if nx0 + 1 <= trim_x <= nx1 - 1:
            out[y, trim_x] = GOLD_TRIM if y < 43 else GOLD_BRIGHT
        if y == 44:
            for hx_i in range(nx0 + 1, nx1):
                out[y, hx_i] = GOLD_MID if hx_i % 2 == 0 else GOLD_DARK

    # 3. Small animated boot toes (`GOLD_DARK` / `ROBE_SHADOW`) peeking cleanly at y = 45..46 beneath the hem
    for is_front, leg_phase, base_bx in [(False, phase + math.pi, 19.5), (True, phase, 26.5)]:
        s_val = math.sin(leg_phase)
        c_val = math.cos(leg_phase)
        toe_cx = int(round(base_bx + s_val * 2.2))
        toe_lift = 1 if c_val > 0.35 else 0
        toe_y = 45 - toe_lift
        c_top = GOLD_DARK if is_front else ROBE_SHADOW
        c_bot = WOOD_DARK if is_front else ROBE_SHADOW
        for dx_t in (-1, 0, 1):
            set_px(out, toe_cx + dx_t, toe_y, c_top)
            if toe_y + 1 <= 46:
                set_px(out, toe_cx + dx_t, toe_y + 1, c_bot)
        if is_front:
            set_px(out, toe_cx + 1, toe_y, GOLD_MID)

    out = fill_layer_pinholes(out)
    return add_outline_to_layer(out)


render_walk_robes = render_walk_legs


def make_crouch_body(tpl, crouch_depth):
    """
    Constructs a clean low-profile crouched pyromancer body with `crouch_depth` in [1..7] logical pixels
    by smoothly compressing the intact full-length crimson & gold robe (`y = 0..46`) without slicing at y=36!
    """
    stand = tpl['stand'].copy()
    canvas = np.zeros((52, 52, 4), dtype=np.uint8)
    d = max(0, min(7, int(round(crouch_depth))))
    if d == 0:
        return stand

    # 1. Shift wizard hat, head, and upper torso (y = 0..27) cleanly down by `d` pixels
    for y in range(0, 28):
        ny = y + d
        if 2 <= ny < 49:
            for x in range(2, 50):
                if stand[y, x, 3] > 0 and not np.array_equal(stand[y, x], OUTLINE):
                    canvas[ny, x] = stand[y, x]

    # 2. Smoothly compress and flare the intact lower robe (src y = 28..46) into ny = (28 + d)..46
    dst_top = 28 + d
    dst_bot = 46
    dst_span = max(1.0, float(dst_bot - dst_top))
    for ny in range(dst_top, dst_bot + 1):
        v = (ny - dst_top) / dst_span
        sy = int(round(28 + v * (46 - 28)))
        xs = np.where((stand[sy, :, 3] > 0) & ~np.all(stand[sy, :, :] == OUTLINE, axis=-1))[0]
        if len(xs) == 0:
            continue
        x0, x1 = int(xs.min()), int(xs.max())
        # Slightly widen the pooling robe hem at the bottom as Ignis kneels lower
        flare = int(round((d / 7.0) * 1.5 * v))
        nx0 = max(4, x0 - (1 if flare >= 1 and v > 0.6 else 0))
        nx1 = min(46, x1 + flare)
        span_src = max(1.0, float(x1 - x0))
        span_dst = max(1.0, float(nx1 - nx0))
        for nx in range(nx0, nx1 + 1):
            u_x = (nx - nx0) / span_dst
            sx_sample = int(round(x0 + u_x * span_src))
            col = stand[sy, sx_sample].copy()
            if col[3] == 0 or np.array_equal(col, OUTLINE):
                col = ROBE_MID if u_x > 0.45 else ROBE_DARK
            canvas[ny, nx] = col

    canvas = fill_layer_pinholes(canvas)
    return add_outline_to_layer(canvas)


def make_jump_body(tpl, jump_dy, tuck_amount, torso_lean_dx=0):
    """
    Constructs a clean, full-body aerial Flame-Glide jumping pyromancer pose by smoothly sweeping
    and tucking the intact full-length crimson & gold robe (`y = 0..46`) without a horizontal cut at y=36!
    """
    stand = tpl['stand'].copy()
    torso_dy = max(-2, min(4, int(round(jump_dy))))
    t = max(0.0, min(1.0, float(tuck_amount)))
    out = np.zeros((52, 52, 4), dtype=np.uint8)

    # 1. Wizard hat, head, and upper torso (y = 0..28)
    for y in range(0, 29):
        ny = y + torso_dy
        if not (2 <= ny < 49):
            continue
        dx = torso_lean_dx if y <= 25 else 0
        for x in range(2, 50):
            if stand[y, x, 3] > 0 and not np.array_equal(stand[y, x], OUTLINE):
                out[ny, max(2, min(49, x + dx))] = stand[y, x]

    # 2. Smoothly sweep and tuck the intact lower robe (src y = 29..44) into aerial glide silhouette
    dst_top = 29 + torso_dy
    dst_bot = max(dst_top + 8, min(45, int(round(44 + torso_dy - t * 3.0))))
    dst_span = max(1.0, float(dst_bot - dst_top))
    for ny in range(dst_top, dst_bot + 1):
        if not (2 <= ny < 48):
            continue
        v = (ny - dst_top) / dst_span
        sy = int(round(29 + v * (44 - 29)))
        sweep_dx = -int(round(v * t * 2.5))

        xs = np.where((stand[sy, :, 3] > 0) & ~np.all(stand[sy, :, :] == OUTLINE, axis=-1))[0]
        if len(xs) == 0:
            continue
        x0, x1 = int(xs.min()), int(xs.max())
        nx0 = max(4, x0 + sweep_dx)
        nx1 = max(nx0 + 4, min(46, x1 + int(round(sweep_dx * 0.5))))
        span_src = max(1.0, float(x1 - x0))
        span_dst = max(1.0, float(nx1 - nx0))
        for nx in range(nx0, nx1 + 1):
            u_x = (nx - nx0) / span_dst
            sx_sample = int(round(x0 + u_x * span_src))
            col = stand[sy, sx_sample].copy()
            if col[3] == 0 or np.array_equal(col, OUTLINE):
                col = ROBE_MID if u_x > 0.45 else ROBE_DARK
            out[ny, nx] = col

        trim_x = int(round(23.0 + sweep_dx * 0.7))
        if nx0 + 1 <= trim_x <= nx1 - 1:
            out[ny, trim_x] = GOLD_TRIM if ny < dst_bot else GOLD_BRIGHT

    # 3. Subtle tucked boot tips directly beneath the swept robe hem (within the hem width, zero extra legs)
    hem_shift = -int(round(t * 2.0))
    for bx_t, c_toe in [(19 + hem_shift, ROBE_SHADOW), (25 + hem_shift, GOLD_DARK)]:
        if dst_bot + 1 < 48:
            set_px(out, bx_t, dst_bot + 1, c_toe)
            set_px(out, bx_t + 1, dst_bot + 1, c_toe)

    out = fill_layer_pinholes(out)
    return add_outline_to_layer(out)



def build_row0_idle(tpl):
    """
    Row 0 (`IDLE`, 30 frames):
    Breathing robes (with duplicated row 29 so zero waist slit ever opens),
    gently flickering ember mantle & wizard hat tip,
    and single Right 2-bone IK arm breathing out in front with the Sun-Staff (`gx = 33..36`).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        base = tpl['stand'].copy()

        breathe = -1 if 8 <= f <= 19 else 0
        if breathe == -1:
            upper = base[10:30, 14:38].copy()
            hat_top = base[4:10, 14:38].copy()
            base[3:9, 14:38] = hat_top
            base[9:29, 14:38] = upper
            base[29, 14:38] = upper[19, :]
            base = fill_layer_pinholes(add_outline_to_layer(base))

        base = apply_robe_cloak_wave(base, phase, amplitude=1.5, vertical_flutter=0.6)

        # Flickering ember at pointed wizard hat apex
        hat_ember_y = max(3, 7 + breathe - (f % 3 == 0))
        set_px(base, 24 + (f % 2), hat_ember_y, SOLAR_YELLOW if f % 2 == 0 else FLAME_ORANGE)

        staff_deg = -79.0 + math.sin(phase) * 4.5
        grip_dx = 8.5 + math.sin(phase) * 1.2
        grip_dy = 1.0 + math.cos(phase) * 0.9
        frame = draw_sun_staff(
            base,
            shoulder=(26, 19 + breathe),
            grip_offset=(grip_dx, grip_dy),
            staff_deg=staff_deg,
            top_len=14.0,
            bot_len=23.5,
            phase_rad=phase,
            charge_level=1 if f % 6 in (2, 3) else 0,
        )
        frames.append(ensure_safe_cell(frame, margin=1))
    return frames


def build_row1_walk(tpl):
    """
    Row 1 (`WALK`, 30 frames):
    Smooth 30fps battle-mage stride (F00..F14 step A, F15..F29 step B) keeping full-length
    crimson & gold robe intact with pleat-shear sway, peeking boot toes, and single Right
    2-bone IK Sun-Staff arm swinging out in front (`gx = 33..37`).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        body = render_walk_legs(tpl, f)
        bob_y = int(round(math.cos(phase * 2.0) * 1.0))

        swing = math.sin(phase)
        staff_deg = -72.0 - swing * 14.0
        grip_dx = 9.0 + 2.0 * math.sin(phase)
        grip_dy = 0.5 + 1.2 * math.cos(phase)

        frame = draw_sun_staff(
            body,
            shoulder=(26, 19 + bob_y),
            grip_offset=(grip_dx, grip_dy),
            staff_deg=staff_deg,
            top_len=13.8,
            bot_len=21.5,
            phase_rad=phase,
            charge_level=0,
        )
        frames.append(ensure_safe_cell(frame, margin=1))
    return frames


def build_row2_auto_attack(tpl):
    """
    Row 2 (`AUTO_ATTACK`, 30 frames):
    30fps Pyromantic Fireball Cast with single Right 2-bone IK arm sweep:
    - F00..F09: High overhead windup (`gx = 34.5 -> 32.0, gy = 20.0 -> 13.5`).
    - F10..F18: Forward pyroblast thrust (`gx = 38.5, gy = 20.5`).
    - F19..F29: Follow-through recovery (`gx = 35.5 -> 34.5`).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        use_cast_body = 9 <= f <= 21
        base = (tpl['cast_body'] if use_cast_body else tpl['stand']).copy()

        if f in (11, 12, 13):
            base = shift_layer(base, dx=-1, dy=0)

        base = apply_robe_cloak_wave(
            base, phase * 1.5, amplitude=2.1 if 10 <= f <= 18 else 1.5, vertical_flutter=0.7
        )

        if f <= 9:
            u = f / 9.0
            staff_deg = -81.0 - u * 24.0
            grip_x = 8.5 * (1.0 - u) + 6.0 * u
            grip_y = 1.0 * (1.0 - u) + (-5.5) * u
            charge = 3 if f >= 7 else (2 if f >= 4 else 1)
            frame = draw_sun_staff(
                base,
                shoulder=(26, 19),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=14.0,
                bot_len=21.5,
                phase_rad=phase * 2.0,
                charge_level=charge,
            )
        elif f <= 18:
            k = f - 10
            if k <= 2:
                staff_deg = -45.0 + k * 18.0
            else:
                staff_deg = -9.0 - (k - 2) * 3.0
            if k == 0:
                grip_x, grip_y = 8.5, -1.5
            elif k <= 4:
                grip_x, grip_y = 11.5, 1.5
            else:
                v = (k - 4) / 4.0
                grip_x = 11.5 * (1.0 - v) + 8.5 * v
                grip_y = 1.5 * (1.0 - v) + 3.0 * v
            frame = draw_sun_staff(
                base,
                shoulder=(27, 19),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=14.0,
                bot_len=18.5,
                phase_rad=phase * 2.0,
                charge_level=3 if k <= 3 else 2,
                release_flash=(k in (1, 2, 3)),
            )
        else:
            u = (f - 19) / 10.0
            staff_deg = -27.0 * (1.0 - u) + (-81.0) * u
            grip_x = 9.0 * (1.0 - u) + 8.5 * u
            grip_y = 3.0 * (1.0 - u) + 1.0 * u
            frame = draw_sun_staff(
                base,
                shoulder=(26, 19),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=14.0,
                bot_len=23.0,
                phase_rad=phase,
                charge_level=1 if f <= 21 else 0,
            )

        frames.append(ensure_safe_cell(frame, margin=1))
    return frames


def build_row3_skill(tpl):
    """
    Row 3 (`SKILL` - Hellfire Pillars + Solar Detonation, 30 frames):
    - Phase 1 (F00..F14): Raises Sun-Staff high overhead (`gx = 34.5 -> 32.5, gy = 19 -> 13`) and slams
      butt into the ground (`gx = 35.5, gy = 22`) with a magma shockwave ring.
    - Phase 2 (F15..F29): Sweeps single Right 2-bone IK arm and staff forward (`gx = 38.5, gy = 18`)
      to detonate the pillars, followed by ember recovery.
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
            base = apply_robe_cloak_wave(base, phase * 2.0, amplitude=1.9, vertical_flutter=0.8)
            grip_x = 8.5 * (1.0 - u) + 6.5 * u
            grip_y = 1.0 * (1.0 - u) + (-5.0) * u
            frame = draw_sun_staff(
                base,
                shoulder=(26, 18 + lift_dy),
                grip_offset=(grip_x, grip_y),
                staff_deg=-88.0,
                top_len=12.0,
                bot_len=22.0,
                phase_rad=phase * 2.0,
                charge_level=3 if f >= 4 else 2,
            )
        elif f <= 14:
            k = f - 7
            crouch_seq = [2, 3, 3, 2, 2, 1, 1, 0]
            cd = crouch_seq[k]
            base = make_crouch_body(tpl, cd) if cd > 0 else tpl['stand'].copy()
            base = apply_robe_cloak_wave(base, phase * 2.5, amplitude=2.2, vertical_flutter=0.9)
            if k <= 4:
                grip_x, grip_y = 9.5, 2.5
            else:
                v = (k - 4) / 3.0
                grip_x = 9.5 * (1.0 - v) + 7.5 * v
                grip_y = 2.5 * (1.0 - v) + (-2.0) * v
            frame = draw_sun_staff(
                base,
                shoulder=(26, 19 + cd),
                grip_offset=(grip_x, grip_y),
                staff_deg=-89.0,
                top_len=13.5,
                bot_len=25.0,
                phase_rad=phase * 2.5,
                charge_level=3 if k <= 3 else 2,
                ground_shockwave=min(1.0, (k + 1) / 7.5),
            )
        elif f <= 22:
            k = f - 15
            base = tpl['cast_body'].copy()
            base = apply_robe_cloak_wave(base, phase * 2.0, amplitude=2.3, vertical_flutter=0.9)
            sweep_angles = [-68.0, -42.0, -18.0, -8.0, -6.0, -10.0, -18.0, -28.0]
            staff_deg = sweep_angles[k]
            grip_x = 7.5 + min(1.0, k / 2.0) * 4.0
            grip_y = -2.0 + min(1.0, k / 2.0) * 1.0
            frame = draw_sun_staff(
                base,
                shoulder=(27, 19),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=14.0,
                bot_len=18.5,
                phase_rad=phase * 2.0,
                charge_level=3 if k in (2, 3, 4) else 2,
                release_flash=(k in (2, 3)),
            )
            if 1 <= k <= 5:
                for a_deg in range(int(staff_deg) - 28, int(staff_deg) + 6, 4):
                    ar = math.radians(a_deg)
                    ax = max(3.0, min(48.0, 35.0 + math.cos(ar) * 11.5))
                    ay = max(3.0, min(48.0, 19.0 + math.sin(ar) * 11.5))
                    set_px(frame, ax, ay, SOLAR_YELLOW if a_deg > staff_deg - 12 else FLAME_ORANGE)
                    set_px(frame, max(2.0, ax - 1), ay, FLAME_CRIMSON)
        else:
            u = (f - 23) / 6.0
            base = apply_robe_cloak_wave(tpl['stand'].copy(), phase, amplitude=1.6, vertical_flutter=0.6)
            staff_deg = -28.0 * (1.0 - u) + (-81.0) * u
            grip_x = 11.5 * (1.0 - u) + 8.5 * u
            grip_y = -1.0 * (1.0 - u) + 1.0 * u
            frame = draw_sun_staff(
                base,
                shoulder=(26, 19),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=14.0,
                bot_len=23.0,
                phase_rad=phase,
                charge_level=1 if f <= 25 else 0,
            )

        frames.append(ensure_safe_cell(frame, margin=1))
    return frames


def build_row4_ultimate(tpl):
    """
    Row 4 (`ULTIMATE` - Cataclysm: Eclipse Supernova, 30 frames):
    - Stage 1 (F00..F10): Skyward hoist (`gx = 34.5 -> 32.5, gy = 18.5 -> 12.0`), conjuring black-gold Eclipse corona at ecy=8.5.
    - Stage 2 (F11..F20): Channels full solar overdrive at high hoist (`gx = 31.6..33.4, gy = 11.5..13.0`) with blazing mantle wings.
    - Stage 3 (F21..F29): Sweeps Right 2-bone IK arm and Sun-Staff forward (`gx = 38.5, gy = 19.5`) to unleash Supernova Beam.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi

        if f <= 10:
            u = f / 10.0
            tuck = min(0.55, u * 0.65)
            lev_dy = -int(round(u * 2.0))
            body = make_jump_body(tpl, lev_dy, tuck_amount=tuck) if f >= 2 else tpl['stand'].copy()
            body = apply_robe_cloak_wave(body, phase * 2.0, amplitude=2.0, vertical_flutter=0.9)
            staff_deg = -80.0 - u * 7.0
            grip_x = 8.5 * (1.0 - u) + 6.5 * u
            grip_y = 0.5 * (1.0 - u) + (-4.5) * u
            frame = draw_sun_staff(
                body,
                shoulder=(26, 18 + lev_dy),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=11.5,
                bot_len=21.0,
                phase_rad=phase * 2.0,
                charge_level=2 if f >= 5 else 1,
                solar_wings=u * 0.6,
                eclipse_crown=min(1.0, u * 1.1),
            )
        elif f <= 20:
            lev_dy = -2
            body = make_jump_body(tpl, lev_dy, tuck_amount=0.55)
            body = apply_robe_cloak_wave(body, phase * 3.0, amplitude=2.4, vertical_flutter=1.1)
            grip_x = 6.5 + math.sin(phase * 2.0) * 0.9
            grip_y = -4.2 + math.cos(phase * 2.0) * 0.7
            frame = draw_sun_staff(
                body,
                shoulder=(26, 18 + lev_dy),
                grip_offset=(grip_x, grip_y),
                staff_deg=-86.0 + math.sin(phase * 2.0) * 3.0,
                top_len=11.5,
                bot_len=21.0,
                phase_rad=phase * 3.0,
                charge_level=3,
                solar_wings=1.0,
                eclipse_crown=1.0,
            )
            # 4 Orbiting Fire Runes revolving around Ignis in 3D ellipse (skipping chest interior x=17..29)
            for r_i in range(4):
                ra = phase * 3.0 + r_i * (math.pi * 0.5)
                rx = max(3.0, min(48.0, 25.0 + math.cos(ra) * 14.0))
                ry = max(4.0, min(47.0, 26.0 + math.sin(ra) * 5.0))
                if 16.0 <= rx <= 30.0:
                    continue
                set_px(frame, rx, ry, SOLAR_WHITE)
                set_px(frame, rx, ry - 1, SOLAR_YELLOW)
                set_px(frame, rx, ry + 1, FLAME_ORANGE)
        else:
            k = f - 21
            u = k / 8.0
            tuck = max(0.0, 0.55 * (1.0 - u))
            lev_dy = -2 if k <= 3 else (-1 if k <= 5 else 0)
            body = (
                make_jump_body(tpl, lev_dy, tuck_amount=tuck, torso_lean_dx=1 if k <= 5 else 0)
                if tuck > 0.08
                else tpl['cast_body'].copy()
            )
            body = apply_robe_cloak_wave(body, phase * 2.5, amplitude=2.4, vertical_flutter=1.0)
            staff_deg = -6.0 if k <= 4 else (-6.0 - (k - 4) * 16.0)
            if k <= 5:
                grip_x, grip_y = 11.5, 0.5
            else:
                v = (k - 5) / 3.0
                grip_x = 11.5 * (1.0 - v) + 9.0 * v
                grip_y = 0.5 * (1.0 - v) + 1.0 * v
            frame = draw_sun_staff(
                body,
                shoulder=(27, 19 + lev_dy),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=14.0,
                bot_len=18.5,
                phase_rad=phase * 2.5,
                charge_level=3 if k <= 5 else 2,
                release_flash=(k <= 4),
                solar_wings=max(0.0, 1.0 - u * 0.9),
                eclipse_crown=max(0.0, 1.0 - u * 0.8),
            )

        if 2 <= f <= 25:
            for gx_i in range(4):
                gx_e = 18 + ((f * 3 + gx_i * 4) % 16)
                gy_e = 48 + (gx_i % 2)
                set_px(frame, gx_e, gy_e, SOLAR_YELLOW if gx_i % 2 == 0 else FLAME_ORANGE)

        frames.append(ensure_safe_cell(frame, margin=1))
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
            base = apply_robe_cloak_wave(base, u * math.pi, amplitude=1.7, vertical_flutter=0.6)
            grip_x = 9.0 - math.sin(u * math.pi) * 1.2
            grip_y = 0.5 - math.sin(u * math.pi) * 1.8 + u * 2.0
            frame = draw_sun_staff(
                base,
                shoulder=(26 + dx, 19 + dy),
                grip_offset=(grip_x, grip_y),
                staff_deg=-76.0 + u * 26.0,
                top_len=13.5,
                bot_len=21.5,
                phase_rad=u * math.pi,
                charge_level=0,
            )
            frames.append(ensure_safe_cell(frame, margin=1))

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
            staff_deg = -52.0 + u * 38.0
            grip_x = 7.0 + u * 3.0
            grip_y = 1.0 + u * 2.0
            frame = draw_sun_staff(
                base,
                shoulder=(27, 21 + head_bow),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=12.5,
                bot_len=17.5,
                phase_rad=u * math.pi,
                charge_level=0,
            )
            frames.append(ensure_safe_cell(frame, margin=1))

        else:
            k = f - 18
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
            ember_col = SOLAR_YELLOW if k == 0 else (FLAME_ORANGE if k <= 3 else (CRIMSON_MID if k <= 7 else CRIMSON_DARK))
            set_px(staff_floor, 43, 47, ember_col)
            set_px(staff_floor, 44, 47, GOLD_MID if k <= 4 else GOLD_DARK)
            if k < 11:
                mote_x = 43 - (k % 3)
                mote_y = max(3, 45 - k)
                set_px(staff_floor, mote_x, mote_y, FLAME_ORANGE if k < 5 else CRIMSON_MID)

            frame = composite_over(frame, add_outline_to_layer(staff_floor))
            frames.append(ensure_safe_cell(frame, margin=1))

    return frames


def build_row6_dash(tpl):
    """
    Row 6 (`DASH` - Flame-Step Blink, 30 frames):
    Low aerodynamic forward flame-glide dash wrapped in streaming solar embers and crimson robe trails.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi

        if f <= 3:
            u = f / 3.0
            cd = [1, 2, 2, 1][f]
            base = make_crouch_body(tpl, cd) if f <= 1 else tpl['dash'].copy()
            base = apply_robe_cloak_wave(base, phase * 2.0, amplitude=1.9, is_dash=(f >= 2))
            grip_x = 7.5 + u * 2.5
            grip_y = -1.0 + u * 1.5
            frame = draw_sun_staff(
                base,
                shoulder=(27 if f >= 2 else 26, 19 + (0 if f >= 2 else cd)),
                grip_offset=(grip_x, grip_y),
                staff_deg=-75.0 + u * 55.0,
                top_len=13.5,
                bot_len=19.5,
                phase_rad=phase * 2.0,
                charge_level=2,
            )
        elif f <= 21:
            k = f - 4
            hover_dy = -1 if 3 <= k <= 14 else 0
            base = tpl['dash'].copy()
            if hover_dy != 0:
                base = shift_layer(base, dx=0, dy=hover_dy)
            base = apply_robe_cloak_wave(base, k * 0.85, amplitude=2.3, is_dash=True)

            is_snap_cast = 8 <= k <= 11
            grip_x = 10.5 if is_snap_cast else (7.5 + math.sin(phase * 2.0) * 1.2)
            grip_y = 0.5 if is_snap_cast else (-1.0 + math.cos(phase * 2.0) * 0.8)
            frame = draw_sun_staff(
                base,
                shoulder=(28, 20 + hover_dy),
                grip_offset=(grip_x, grip_y),
                staff_deg=-12.0 if is_snap_cast else -18.0,
                top_len=13.0,
                bot_len=17.5,
                phase_rad=phase * 2.5,
                charge_level=3 if is_snap_cast else 2,
                release_flash=(k in (9, 10)),
            )

            for s_i in range(5):
                sx_e = 3 + ((f * 4 + s_i * 5) % 19)
                sy_e = 24 + s_i * 4 + int(round(math.sin(phase * 2.0 + s_i) * 1.0))
                set_px(frame, sx_e, sy_e, SOLAR_YELLOW if s_i % 2 == 0 else FLAME_ORANGE)
                set_px(frame, max(2, sx_e - 1), sy_e, FLAME_CRIMSON)
        else:
            k = f - 22
            u = k / 7.0
            cd = [2, 2, 1, 1, 0, 0, 0, 0][k]
            base = make_crouch_body(tpl, cd) if cd > 0 else tpl['stand'].copy()
            base = apply_robe_cloak_wave(base, phase * 1.5, amplitude=1.7, vertical_flutter=0.6)
            staff_deg = -22.0 * (1.0 - u) + (-81.0) * u
            grip_x = 10.5 * (1.0 - u) + 8.5 * u
            grip_y = 1.5 * (1.0 - u) + 1.0 * u
            frame = draw_sun_staff(
                base,
                shoulder=(26, 19 + cd),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=14.0,
                bot_len=22.5,
                phase_rad=phase,
                charge_level=1 if k <= 2 else 0,
            )

        frames.append(ensure_safe_cell(frame, margin=1))
    return frames


def build_row7_crouch(tpl):
    """
    Row 7 (`CROUCH`, 30 frames):
    - F00..F06: Drops into a low pyromantic kneeling crouch (7px lower silhouette),
      planting his Sun-Staff diagonally and conjuring a spinning Flame-Ward shield ring out in front.
    - F07..F18: Launches a low skimming Solar Fireball from his crouched stance (F11..F16) with wide IK arm thrust (`gx = 38.0`).
    - F19..F29: Rises smoothly back to standing stance.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi

        if f <= 6:
            depths = [0, 1, 3, 5, 6, 7, 7]
            d = depths[f]
            u = f / 6.0
            base = tpl['stand'].copy() if d == 0 else make_crouch_body(tpl, d)
            base = apply_robe_cloak_wave(base, phase, amplitude=1.3, vertical_flutter=0.4)
            staff_deg = -81.0 * (1.0 - u) + (-52.0) * u
            grip_x = 8.5 * (1.0 - u) + 7.5 * u
            grip_y = 1.0 * (1.0 - u) + (-1.5) * u
            frame = draw_sun_staff(
                base,
                shoulder=(26, 19 + d),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=13.5,
                bot_len=18.5,
                phase_rad=phase * 2.0,
                charge_level=1 if f >= 3 else 0,
                left_orb_mode='ward_shield' if f >= 3 else 'none',
                left_hand_pos=(41, 28) if f >= 3 else None,
            )
        elif f <= 18:
            d = 7
            k = f - 7
            base = make_crouch_body(tpl, d)
            if f in (11, 12):
                base = shift_layer(base, dx=-1, dy=0)
            base = apply_robe_cloak_wave(base, phase * 1.5, amplitude=1.5, vertical_flutter=0.4)

            if k < 4:
                v = k / 3.0
                staff_deg = -52.0 + v * 38.0
                grip_x = 7.5 * (1.0 - v) + 7.0 * v
                grip_y = -1.5 * (1.0 - v) + (-2.5) * v
            elif k <= 8:
                staff_deg = -6.0
                grip_x, grip_y = 11.5, -1.0
            else:
                v = (k - 8) / 3.0
                staff_deg = -6.0 - (k - 8) * 14.0
                grip_x = 11.5 * (1.0 - v) + 8.0 * v
                grip_y = -1.0 * (1.0 - v) + 0.0 * v

            frame = draw_sun_staff(
                base,
                shoulder=(26, 19 + d),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=13.0,
                bot_len=17.0,
                phase_rad=phase * 2.5,
                charge_level=3 if (3 <= k <= 7) else 2,
                release_flash=(f in (11, 12, 13)),
                left_orb_mode='ward_shield',
                left_hand_pos=(41, 28),
            )
        else:
            depths = [7, 6, 6, 5, 4, 3, 2, 2, 1, 1, 0]
            k = f - 19
            d = depths[k]
            u = k / 10.0
            base = tpl['stand'].copy() if d == 0 else make_crouch_body(tpl, d)
            base = apply_robe_cloak_wave(base, phase, amplitude=1.4, vertical_flutter=0.5)
            staff_deg = -48.0 * (1.0 - u) + (-81.0) * u
            grip_x = 8.0 * (1.0 - u) + 8.5 * u
            grip_y = 0.0 * (1.0 - u) + 1.0 * u
            frame = draw_sun_staff(
                base,
                shoulder=(26, 19 + d),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=13.8,
                bot_len=22.0,
                phase_rad=phase,
                charge_level=0,
            )

        frames.append(ensure_safe_cell(frame, margin=1))
    return frames


def build_row8_jump(tpl):
    """
    Row 8 (`JUMP`, 30 frames - ZERO bouncy-ball frames!):
    Full-body Flame-Glide Aerial Vault & mid-air downward Fireball cast with intact full-length robe:
    - F00..F04: Knee-bend launch with ember burst at boots
    - F05..F11: Ascending aerial vault with full-length robe streaming cleanly and high IK arm lift
    - F12..F18: Apex mid-air hover aiming Sun-Staff downward at +35 deg with full IK arm extension (`gx = 38.5`)
    - F19..F24: Descending flame-cushioned glide
    - F25..F29: Soft landing
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi

        if f <= 4:
            crouch_seq = [1, 3, 4, 2, 0]
            cd = crouch_seq[f]
            u = f / 4.0
            body = make_crouch_body(tpl, cd) if cd >= 2 else make_jump_body(tpl, cd, tuck_amount=0.25)
            body = apply_robe_cloak_wave(body, phase * 2.0, amplitude=1.8, vertical_flutter=0.8)
            staff_deg = [-78.0, -68.0, -62.0, -45.0, -28.0][f]
            grip_x = 7.5 + u * 1.5
            grip_y = 1.5 - u * 3.5
            frame = draw_sun_staff(
                body,
                shoulder=(26, 19 + cd),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=13.5,
                bot_len=20.5,
                phase_rad=phase * 2.0,
                charge_level=1 if f >= 3 else 0,
            )
            if f >= 2:
                for ex_b in (18, 22, 27, 31):
                    set_px(frame, ex_b, 48, SOLAR_YELLOW if ex_b % 2 == 0 else FLAME_ORANGE)
                    set_px(frame, ex_b, 49, FLAME_CRIMSON)

        elif f <= 11:
            k = f - 5
            u = k / 6.0
            tuck = 0.45 + 0.50 * math.sin(u * math.pi * 0.65)
            body = make_jump_body(tpl, 0, tuck_amount=tuck, torso_lean_dx=1 if k >= 3 else 0)
            body = apply_robe_cloak_wave(body, phase * 2.0, amplitude=2.3, vertical_flutter=1.0)
            staff_deg = -20.0 * (1.0 - u) + 32.0 * u
            grip_x = 8.5 * (1.0 - u) + 6.5 * u
            grip_y = -2.0 * (1.0 - u) + (-4.5) * u
            frame = draw_sun_staff(
                body,
                shoulder=(27, 19),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=13.0,
                bot_len=18.0,
                phase_rad=phase * 2.0,
                charge_level=2 if k >= 4 else 1,
            )
            for j in range(3):
                jx = 19 + j * 5 + (f % 2)
                jy = 45 + (j % 2)
                set_px(frame, jx, jy, SOLAR_YELLOW if j == 1 else FLAME_ORANGE)
                set_px(frame, jx, jy + 1, FLAME_CRIMSON)

        elif f <= 18:
            k = f - 12
            tuck = 0.92 - k * 0.03
            recoil_dx = -1 if k in (3, 4) else 0
            body = make_jump_body(tpl, 0, tuck_amount=tuck, torso_lean_dx=1 + recoil_dx)
            body = apply_robe_cloak_wave(body, phase * 2.5, amplitude=2.4, vertical_flutter=1.1)
            staff_deg = 35.0 - (3.0 if k in (3, 4) else 0.0)
            if k < 2:
                grip_x, grip_y = 7.5, -2.0
            else:
                grip_x, grip_y = 11.5, 2.0
            frame = draw_sun_staff(
                body,
                shoulder=(27 + recoil_dx, 19),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=13.0,
                bot_len=17.5,
                phase_rad=phase * 2.5,
                charge_level=3 if k <= 4 else 2,
                release_flash=(k in (2, 3, 4)),
            )
            for j in range(3):
                jx = 18 + j * 5 + (f % 2)
                set_px(frame, jx, 45, FLAME_GOLD)

        elif f <= 24:
            k = f - 19
            u = k / 5.0
            tuck = 0.72 * (1.0 - u) + 0.15 * u
            body = make_jump_body(tpl, 0, tuck_amount=tuck)
            body = apply_robe_cloak_wave(body, phase * 2.0, amplitude=2.1, vertical_flutter=1.0)
            staff_deg = 30.0 * (1.0 - u) + (-55.0) * u
            grip_x = 11.0 * (1.0 - u) + 8.0 * u
            grip_y = 2.0 * (1.0 - u) + (-0.5) * u
            frame = draw_sun_staff(
                body,
                shoulder=(26, 19),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=13.5,
                bot_len=20.5,
                phase_rad=phase * 2.0,
                charge_level=1 if k <= 2 else 0,
            )
            for j in range(3):
                jx = 19 + j * 5
                set_px(frame, jx, 46, FLAME_ORANGE)

        else:
            k = f - 25
            crouch_depths = [2, 3, 2, 1, 0]
            cd = crouch_depths[k]
            body = tpl['stand'].copy() if cd == 0 else make_crouch_body(tpl, cd)
            body = apply_robe_cloak_wave(body, phase, amplitude=1.6, vertical_flutter=0.6)
            u = k / 4.0
            staff_deg = -60.0 * (1.0 - u) + (-81.0) * u
            grip_x = 8.0 * (1.0 - u) + 8.5 * u
            grip_y = 1.5 * (1.0 - u) + 1.0 * u
            frame = draw_sun_staff(
                body,
                shoulder=(26, 19 + cd),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=14.0,
                bot_len=23.0,
                phase_rad=phase,
                charge_level=0,
            )

        frames.append(ensure_safe_cell(frame, margin=1))
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
        ('ROW 6: DASH - FLAME-STEP BLINK GLIDE (30 FRAMES)', build_row6_dash(tpl)),
        ('ROW 7: CROUCH - FLAME-WARD & LOW FIREBALL (30 FRAMES)', build_row7_crouch(tpl)),
        ('ROW 8: JUMP - FLAME-GLIDE VAULT & AERIAL SHOT (30 FRAMES)', build_row8_jump(tpl)),
    ]

    num_rows = len(rows)
    cell_px = 208
    sheet = Image.new('RGBA', (30 * cell_px, num_rows * cell_px), (0, 0, 0, 0))

    for r_idx, (r_name, r_frames) in enumerate(rows):
        assert len(r_frames) == 30, f'{r_name} has {len(r_frames)} frames instead of 30'
        for c_idx in range(30):
            r_frames[c_idx] = ensure_safe_cell(r_frames[c_idx], margin=1)
        adj_diffs = sum(1 for i in range(29) if np.any(r_frames[i] != r_frames[i + 1]))
        print(f'{r_name:58s}: 30 frames generated, {adj_diffs}/29 adjacent transitions distinct')
        for c_idx, arr in enumerate(r_frames):
            cell_im = Image.fromarray(arr, mode='RGBA').resize((cell_px, cell_px), Image.NEAREST)
            sheet.paste(cell_im, (c_idx * cell_px, r_idx * cell_px))

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
    left_path = f'{art_dir}/debug_mage_30fps_left_F00_F14.png'
    right_path = f'{art_dir}/debug_mage_30fps_right_F15_F29.png'
    dbg.crop((0, 0, 15 * preview_cell, dbg.height)).save(left_path)
    dbg.crop((15 * preview_cell, 0, 30 * preview_cell, dbg.height)).save(right_path)
    print('Saved debug sheets:', left_path, right_path)


if __name__ == '__main__':
    main()

