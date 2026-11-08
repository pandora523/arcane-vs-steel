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


def make_clean_templates(src):
    """
    Extracts clean, right-facing (+X) templates from `backups/mage_sheet_before_30fps.png`,
    stripping 100% of the baked-in staff so we can animate a single crisp `draw_sun_staff`
    per frame with zero duplicate staffs or extra limbs.
    """
    # 1. Clean standing body facing RIGHT (cloak on left x=10..18, hat & golden eyes facing right)
    stand = src['idle'].copy()
    for y in range(0, 50):
        for x in range(30, 52):
            if y <= 18 and x >= 31:
                stand[y, x] = 0
            elif 19 <= y <= 25 and x >= 33:
                stand[y, x] = 0
            elif 26 <= y <= 41 and x >= 36:
                stand[y, x] = 0
            elif y >= 42 and x >= 34:
                stand[y, x] = 0

    # Orient Ignis's glowing golden eyes inside the hood (y=16..18) so he gazes clearly RIGHT (+X)
    for y in range(16, 19):
        for x in range(19, 28):
            if stand[y, x, 3] > 0:
                stand[y, x] = MANTLE_DARK
    # Left (rear) eye and Right (front) eye under the right-side wizard hat brim
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
    leg_back_patch[40:50, 15:23] = stand[40:50, 15:23]
    leg_front_patch[40:50, 24:34] = stand[40:50, 24:34]

    # Upper torso + upper robe skirt (without lower legs/boots y >= 41) for walk/crouch/jump articulation
    stand_upper = stand.copy()
    stand_upper[41:, 15:, :] = 0
    stand_upper = fill_layer_pinholes(add_outline_to_layer(stand_upper))

    # 2. Clean forward-leaning casting body (hat & torso leaned +1px right, cloak trailing left)
    cast_body = np.zeros((52, 52, 4), dtype=np.uint8)
    for y in range(52):
        lean_dx = 1 if y <= 30 else 0
        for x in range(52):
            if stand[y, x, 3] > 0:
                nx = min(50, x + lean_dx)
                cast_body[y, nx] = stand[y, x]
    cast_body = fill_layer_pinholes(add_outline_to_layer(cast_body))

    # 3. Clean kneeling bodies (kneel1, kneel2) facing RIGHT without baked-in diagonal staff
    kneel1 = src['kneel1'].copy()
    kneel2 = src['kneel2'].copy()
    for kn in (kneel1, kneel2):
        for y in range(8, 51):
            for x in range(32, 52):
                if y <= 18 and x >= 39:
                    kn[y, x] = 0
                elif 19 <= y <= 25 and x >= 38:
                    kn[y, x] = 0
                elif 26 <= y <= 33 and x >= 37:
                    kn[y, x] = 0
                elif 34 <= y <= 44 and x >= 35:
                    kn[y, x] = 0
                elif y >= 45 and 35 <= x <= 38 and kn[y, x, 3] > 0:
                    # Replace bottom staff pole segment over the pooled robe hem with crimson-gold robe pixels
                    kn[y, x] = CRIMSON_DARK if y < 48 else GOLD_DARK
        # Shift up if kneeling robes touch y >= 49 so DEATH/CROUCH never clip at bottom
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

    # 4. Clean horizontal collapsed body on the ground (flipped so head/hat is on the RIGHT x=33..47,
    #    matching his rightward collapse from kneel2, and stripped of the old staff at y >= 42)
    fall_raw = np.fliplr(src['fall']).copy()
    fall_raw[42:, :, :] = 0
    # Clear the stray staff tip pixels at y=41, x=35..44
    fall_raw[41, 34:, :] = 0
    # Shift down by +6px so the collapsed horizontal body lies directly on the floor at y=34..47 (core y=38..46)
    fall = np.zeros((52, 52, 4), dtype=np.uint8)
    for y in range(25, 42):
        ny = min(48, y + 6)
        fall[ny, :] = fall_raw[y, :]
    fall[0:2, :, :] = 0
    fall[49:, :, :] = 0
    fall[:, 0:2, :] = 0
    fall[:, 50:, :] = 0
    fall = fill_layer_pinholes(add_outline_to_layer(fall))

    # 5. Clean aerodynamic Flame-Step Dash body facing RIGHT (flipped from R5C1 so cloak streams left
    #    at x=3..24 and torso/hat lean right at x=24..36, with baked-in right staff removed)
    dash = np.fliplr(src['dash']).copy()
    for y in range(12, 48):
        for x in range(34, 52):
            if y <= 34 and x >= 37:
                dash[y, x] = 0
            elif y >= 35 and x >= 35:
                dash[y, x] = 0
    # Add bright golden eyes looking right under the dashing wizard hat brim
    set_px(dash, 32, 20, FLAME_ORANGE)
    set_px(dash, 33, 20, SOLAR_YELLOW)
    dash[0:2, :, :] = 0
    dash[49:, :, :] = 0
    dash[:, 0:2, :] = 0
    dash[:, 50:, :] = 0
    dash = fill_layer_pinholes(add_outline_to_layer(dash))

    return {
        'stand': stand,
        'stand_upper': stand_upper,
        'cast_body': cast_body,
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
    crimson-and-gold left cloak/mantle without distorting his wizard hat, face, or boots.
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

    cloak_mask = np.zeros((52, 52), dtype=bool)
    for y in range(20, 46):
        max_cloak_x = 17 if y < 38 else 14
        for x in range(1, max_cloak_x + 1):
            if frame[y, x, 3] > 0:
                cloak_mask[y, x] = True

    cloak_pixels = frame.copy()
    out[cloak_mask] = 0

    for y in range(20, 46):
        u = (y - 20) / 25.0
        wave_x = math.sin(phase_rad - u * 3.5) * (amplitude * (0.25 + 0.85 * u))
        wave_y = math.cos(phase_rad - u * 2.6) * (vertical_flutter * u)
        dx = int(round(wave_x))
        dy = int(round(wave_y))
        for x in range(1, 18):
            if not cloak_mask[y, x]:
                continue
            nx = max(2, min(19, x + dx))
            ny = max(19, min(48, y + dy))
            if out[ny, nx, 3] == 0:
                out[ny, nx] = cloak_pixels[y, x]
            # Keep solid bridge next to torso (x >= 13) so shifting left never opens a seam
            if x >= 13 and out[y, x, 3] == 0:
                out[y, x] = cloak_pixels[y, x]

    out = fill_layer_pinholes(out)
    return add_outline_to_layer(out)


apply_mantle_wave = apply_robe_cloak_wave


def solve_ik_elbow(sx, sy, hx, hy, L1=4.8, L2=4.6, bend_side=1.0):
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


def draw_ik_mage_arm(layer, sx, sy, hx, hy, L1=4.8, L2=4.6, bend_side=1.0, is_offhand=False):
    """
    Draws a sculpted 2-segment pyromancer arm:
    - Rotating crimson-and-gold pyromancer mantle shoulder cap at (sx, sy)
    - 3px-thick crimson bell-sleeve upper arm from (sx, sy) to (ex, ey)
    - Golden rune-trimmed elbow fold at (ex, ey)
    - 3px-thick forearm sleeve + ornate gold bracer cuff from (ex, ey) to (hx, hy)
    - 2x2 warm skin/flame-lit hand at (hx, hy)
    """
    ex, ey = solve_ik_elbow(sx, sy, hx, hy, L1=L1, L2=L2, bend_side=bend_side)

    if is_offhand:
        c_hi, c_mid, c_dark = ROBE_MID, CRIMSON_DEEP, ROBE_DARK
        c_gold, c_gold_dark = GOLD_MID, GOLD_DARK
        c_skin_hi, c_skin_mid = SKIN_MID, GOLD_TRIM
    else:
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
    if not is_offhand:
        ux1, uy1 = u1x / d1, u1y / d1
        for p_step in (-1.4, -0.5, 0.5, 1.4):
            px_s = sx + ux1 * 1.0 + n1x * p_step
            py_s = sy + uy1 * 1.0 + n1y * p_step
            set_px(layer, px_s, py_s, c_gold if abs(p_step) > 0.9 else c_hi)
            set_px(layer, sx + n1x * p_step, sy + n1y * 0.9 * p_step, c_mid)
        set_px(layer, sx, sy - 1, c_gold)

    # 4. Golden rune-trimmed elbow fold at (ex, ey)
    set_px(layer, ex, ey, c_gold)
    set_px(layer, ex + n1x * 0.75, ey + n1y * 0.75, c_hi)
    set_px(layer, ex - n1x * 0.75, ey - n1y * 0.75, c_gold_dark)

    # 5. 2x2 warm skin/flame-lit hand at (hx, hy)
    set_px(layer, hx, hy, c_skin_hi)
    set_px(layer, hx + 1, hy, c_skin_hi)
    set_px(layer, hx, hy + 1, c_skin_mid)
    set_px(layer, hx + 1, hy + 1, c_skin_mid)


def draw_sun_staff(
    base_frame,
    shoulder=(29, 20),
    grip_offset=(6.0, 1.0),
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
    Renders Ignis Sol's SINGLE articulated Solar Sun-Staff (`draw_sun_staff`),
    Left Off-Hand Spellcasting 2-Bone IK Arm (behind staff),
    Auto-Clamped Sun-Staff Shaft & Sun-Wheel Finial,
    and Right Staff 2-Bone IK Arm (over staff shaft).
    """
    offhand_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    staff_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    right_arm_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    fx_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    sx = float(max(8.0, min(42.0, shoulder[0])))
    sy = float(max(8.0, min(42.0, shoulder[1])))

    # Auto-clamp (gx, gy) inside [12..41, 10..40]
    gx = float(max(12.0, min(41.0, sx + float(grip_offset[0]))))
    gy = float(max(10.0, min(40.0, sy + float(grip_offset[1]))))

    rad = math.radians(staff_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    px, py = -uy, ux

    eff_orb_glow = max(float(orb_glow), 1.0 + charge_level * 0.4)

    # 1. Optional Blazing Solar Mantle Wings (Ultimate Stage 2..3)
    if solar_wings > 0.05:
        wing_span = int(round(4 + solar_wings * 7))
        for w_i in range(1, wing_span + 1):
            frac = w_i / max(1.0, float(wing_span))
            for branch, by_off in [(-1, -w_i * 0.85), (0, -w_i * 0.35), (1, w_i * 0.45)]:
                wx = max(3.0, min(48.0, 19 - w_i * 1.05))
                wy = max(3.0, min(48.0, sy - 2 + by_off + math.sin(phase_rad * 2.0 + w_i * 0.6 + branch) * 0.8))
                col = SOLAR_YELLOW if frac < 0.35 else (FLAME_ORANGE if frac < 0.75 else FLAME_CRIMSON)
                set_px(fx_layer, wx, wy, col)
                if frac < 0.6:
                    set_px(fx_layer, wx, min(48.0, wy + 1), FLAME_GOLD)

    # 2. Left Off-Hand Spellcasting 2-Bone IK Arm (drawn BEFORE the staff)
    lhx_ik = sx - 2.0 + int((gx - sx) * 0.55)
    lhy_ik = sy + 2.0 + int((gy - sy) * 0.45)
    if left_hand_pos is not None and left_orb_mode in ('palm_charge', 'forward_cast'):
        lhx_ik = float(max(8.0, min(42.0, left_hand_pos[0])))
        lhy_ik = float(max(8.0, min(42.0, left_hand_pos[1])))
    draw_ik_mage_arm(offhand_layer, sx - 3.0, sy + 1.0, lhx_ik, lhy_ik, L1=4.4, L2=4.2, bend_side=1.0, is_offhand=True)
    if eff_orb_glow >= 1.2:
        set_px(fx_layer, lhx_ik, max(3.0, lhy_ik - 1.0), SOLAR_YELLOW)
        set_px(fx_layer, min(48.0, lhx_ik + 1.0), max(3.0, lhy_ik - 1.0), FLAME_ORANGE)

    # 3. Optional Left-Hand Pyromantic Orb / Flame-Ward Shield / Cast Projection
    if left_orb_mode != 'none':
        if left_hand_pos is not None:
            lhx, lhy = float(left_hand_pos[0]), float(left_hand_pos[1])
        else:
            lhx, lhy = lhx_ik, lhy_ik

        if left_orb_mode == 'idle_orb':
            ox = max(5.0, min(46.0, lhx))
            oy = max(5.0, min(46.0, lhy + math.sin(phase_rad) * 1.0))
            set_px(fx_layer, ox, oy, SOLAR_WHITE)
            for dx_o, dy_o in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                set_px(fx_layer, ox + dx_o, oy + dy_o, SOLAR_YELLOW if (dx_o + dy_o) % 2 == 0 else FLAME_ORANGE)
            mx = max(3.0, min(48.0, ox + math.cos(phase_rad * 2.0) * 2.2))
            my = max(3.0, min(48.0, oy + math.sin(phase_rad * 2.0) * 2.2))
            set_px(fx_layer, mx, my, FLAME_GOLD)

        elif left_orb_mode == 'palm_charge':
            orb_cx = max(6.0, min(45.0, lhx))
            orb_cy = max(6.0, min(45.0, lhy))
            orb_r = 1.5 + charge_level * 0.65
            for dy_o in range(-3, 4):
                for dx_o in range(-3, 4):
                    d = math.hypot(dx_o, dy_o)
                    if d <= orb_r:
                        c = SOLAR_WHITE if d < 1.1 else (SOLAR_YELLOW if d < 2.1 else FLAME_ORANGE)
                        set_px(fx_layer, max(3.0, min(48.0, orb_cx + dx_o)), max(3.0, min(48.0, orb_cy + dy_o)), c)
            for k in range(3):
                a = phase_rad * 2.5 + k * (2.0 * math.pi / 3.0)
                set_px(
                    fx_layer,
                    max(3.0, min(48.0, orb_cx + math.cos(a) * (orb_r + 1.0))),
                    max(3.0, min(48.0, orb_cy + math.sin(a) * (orb_r + 1.0))),
                    FLAME_GOLD,
                )

        elif left_orb_mode == 'forward_cast':
            fc_x = max(5.0, min(44.0, lhx))
            fc_y = max(5.0, min(44.0, lhy))
            set_px(fx_layer, fc_x + 2, fc_y, SOLAR_WHITE)
            for d in range(1, 3 + charge_level):
                set_px(fx_layer, min(48.0, fc_x + 2 + d), fc_y, SOLAR_YELLOW if d == 1 else FLAME_ORANGE)
                set_px(fx_layer, min(48.0, fc_x + 2), max(3.0, fc_y - d), FLAME_GOLD if d == 1 else FLAME_CRIMSON)
                set_px(fx_layer, min(48.0, fc_x + 2), min(48.0, fc_y + d), FLAME_GOLD if d == 1 else FLAME_CRIMSON)

        elif left_orb_mode == 'ward_shield':
            wcx = max(6.0, min(44.0, lhx))
            wcy = max(10.0, min(40.0, lhy))
            rx, ry = 3.2, 7.2
            for s in range(20):
                a = (s / 20.0) * 2.0 * math.pi + phase_rad * 2.5
                wx = max(3.0, min(48.0, wcx + math.cos(a) * rx))
                wy = max(3.0, min(48.0, wcy + math.sin(a) * ry))
                col = SOLAR_WHITE if s % 5 == 0 else (SOLAR_YELLOW if s % 2 == 0 else FLAME_ORANGE)
                set_px(fx_layer, wx, wy, col)
            draw_line_px(fx_layer, wcx, max(3.0, wcy - 4), wcx, min(48.0, wcy + 4), FLAME_GOLD)
            draw_line_px(fx_layer, max(3.0, wcx - 2), wcy, min(48.0, wcx + 2), wcy, SOLAR_YELLOW)
            set_px(fx_layer, wcx, wcy, SOLAR_WHITE)

    # 4. Auto-foreshorten top_len and bot_len dynamically so Sun-Wheel Finial center (fin_cx, fin_cy)
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

    # 5. Solar Sun-Wheel Finial at (fin_cx, fin_cy) clamped inside [7.5..43.0]
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

    # 6. Right Staff 2-Bone IK Arm (drawn OVER the staff shaft!)
    bend_dir = -1.0 if (gy < sy - 3.5 and gx <= sx + 2.5) else 1.0
    draw_ik_mage_arm(right_arm_layer, sx, sy, gx, gy, L1=4.8, L2=4.6, bend_side=bend_dir, is_offhand=False)

    # 7. Pulsing Miniature Sun Core inside the Sun-Wheel Finial
    core_pulse = 1 if (charge_level >= 1 or int(round(phase_rad * 3)) % 2 == 0) else 0
    set_px(fx_layer, fin_cx, fin_cy, SOLAR_WHITE)
    for dx_c, dy_c in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        set_px(fx_layer, fin_cx + dx_c, fin_cy + dy_c, SOLAR_YELLOW if core_pulse else FLAME_GOLD)

    # 8. Finial Charge Corona & Muzzle Release Flash (clamped safely inside [2..48])
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

    # 9. Optional Ground Magma Shockwave Ring (Row 3 Phase 1 Staff Slam)
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

    # 10. Optional Miniature Black-Gold Eclipse Corona above Crown (Row 4 Ultimate: ecy=8.5, r <= 4.5, y >= 3)
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

    out = composite_over(base_frame, add_outline_to_layer(offhand_layer))
    out = composite_over(out, add_outline_to_layer(staff_layer))
    out = composite_over(out, add_outline_to_layer(right_arm_layer))
    out = composite_over(out, fx_layer)
    return fill_layer_pinholes(out, 1, 50, 1, 50, require_3_neighbors=True)


def render_walk_legs(tpl, f):
    """
    Renders a smooth 30-frame 2-step Battle-Mage Stride Cycle (F00..F14 step A, F15..F29 step B)
    in true anatomical depth order, keeping torso robes down to y=36 and filling any
    hip/skirt seam pixels at y=29..35, x=20..31 with ROBE_DARK / ROBE_MID.
    """
    phase = (f / 30.0) * 2.0 * math.pi
    bob_y = int(round(math.cos(phase * 2.0) * 1.0))

    stand = tpl['stand'].copy()
    cloak_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    # 1. Extract Left Cloak (x <= 18, y = 20..46) with diagonal trailing wind wave & solid bridge
    for y in range(20, 47):
        ny = y + bob_y
        if not (2 <= ny < 50):
            continue
        u = (y - 20) / 26.0
        wave_dx = int(round(-u * 2.2 + math.sin(phase - u * 3.2) * (1.4 * u)))
        wave_dy = int(round(math.cos(phase - u * 2.6) * (0.7 * u)))
        for x in range(1, 19):
            if stand[y, x, 3] == 0:
                continue
            if y >= 36 and x > 14:
                continue
            cy = max(18, min(48, ny + wave_dy))
            cx = max(2, min(21, x + wave_dx))
            cloak_layer[cy, cx] = stand[y, x]
            if x >= 12 and y <= 36:
                cloak_layer[ny, x] = stand[y, x]
                if x + 1 < 21:
                    cloak_layer[ny, x + 1] = stand[y, x]
    cloak_layer = fill_layer_pinholes(cloak_layer)

    # 2. Extract Upper Torso, Wizard Hat & Upper Robes down to y=36 (x >= 14) with +1px forward lean
    for y in range(0, 37):
        ny = y + bob_y
        if not (2 <= ny < 50):
            continue
        lean_dx = 1 if y <= 28 else 0
        for x in range(14, 36):
            if stand[y, x, 3] > 0:
                torso_layer[ny, min(49, x + lean_dx)] = stand[y, x]

    hip_x = 24.5
    hip_y = 32.5 + bob_y

    def build_striding_leg(boot_patch, orig_cx, swing_phase, is_far_leg=False):
        layer = np.zeros((52, 52, 4), dtype=np.uint8)
        s_val = math.sin(swing_phase)
        c_val = math.cos(swing_phase)

        knee_lift = max(0.0, c_val)
        knee_x = hip_x + s_val * 4.2 + knee_lift * 2.0
        knee_y = hip_y + 4.6 - knee_lift * 1.8

        foot_target_x = 25.0 + s_val * 6.2 - knee_lift * 2.0
        foot_lift_dy = bob_y - int(round(knee_lift * 2.8))

        boot_rot_deg = s_val * 19.0 - knee_lift * 20.0
        pil_boot = Image.fromarray(boot_patch, mode='RGBA')
        rot_boot = np.array(
            pil_boot.rotate(boot_rot_deg, resample=Image.NEAREST, center=(orig_cx, 41.0)),
            dtype=np.uint8
        )

        dx_boot = int(round(foot_target_x - orig_cx))
        for y in range(37, 52):
            for x in range(4, 50):
                if rot_boot[y, x, 3] > 0:
                    ny = min(49, max(35, y + foot_lift_dy))
                    nx = min(49, max(6, x + dx_boot))
                    px_col = rot_boot[y, x].copy()
                    if is_far_leg:
                        px_col[0] = int(px_col[0] * 0.76)
                        px_col[1] = int(px_col[1] * 0.76)
                        px_col[2] = int(px_col[2] * 0.80)
                    layer[ny, nx] = px_col

        ank_x = foot_target_x + math.sin(math.radians(boot_rot_deg)) * 1.4
        ank_y = 41.5 + foot_lift_dy

        if is_far_leg:
            c_dark = ROBE_SHADOW
            c_mid = CRIMSON_DARK
            c_hi = CRIMSON_DEEP
            c_greave = WOOD_DARK
            c_gold = GOLD_DARK
        else:
            c_dark = CRIMSON_DARK
            c_mid = CRIMSON_MID
            c_hi = CRIMSON_BRIGHT
            c_greave = GOLD_TRIM
            c_gold = GOLD_BRIGHT

        # Sculpted Crimson-Robed Thigh (Hip -> Knee)
        for off_x, col in [(-1.8, c_dark), (-0.8, c_mid), (0.2, c_hi), (1.2, c_mid), (2.0, c_dark)]:
            draw_line_px(layer, hip_x + off_x, hip_y, knee_x + off_x * 0.85, knee_y, col)

        # Sculpted Hemmed Greave / Boot Upper (Knee -> Ankle)
        for off_x, col in [(-1.4, c_dark), (-0.4, c_greave), (0.6, c_greave), (1.4, c_dark)]:
            draw_line_px(layer, knee_x + off_x, knee_y, ank_x + off_x * 0.85, ank_y, col)

        # Golden Sun-Trim Knee Guard
        set_px(layer, knee_x, knee_y, c_gold)
        set_px(layer, knee_x + 1, knee_y, c_gold)
        return fill_layer_pinholes(layer, 3, 49, 31, 50, require_3_neighbors=True)

    far_leg = build_striding_leg(tpl['leg_back'], 19.0, phase + math.pi, is_far_leg=True)
    near_leg = build_striding_leg(tpl['leg_front'], 28.5, phase, is_far_leg=False)

    # Parted Crimson-and-Gold Front Robe Tabard Panels swinging with the stride (y = 32..39)
    robe_tabard_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    stride_open = abs(math.sin(phase))
    flap_dx = math.sin(phase) * 2.2
    for off_x, col in [
        (-3.0, ROBE_SHADOW),
        (-2.0, CRIMSON_DARK),
        (-1.0, CRIMSON_MID),
        (0.0, GOLD_TRIM),
        (1.0, GOLD_MID),
        (2.0, CRIMSON_MID),
    ]:
        draw_line_px(
            robe_tabard_layer,
            hip_x + off_x,
            hip_y - 1.0,
            hip_x + off_x + flap_dx + stride_open * 1.2,
            hip_y + 5.5,
            col
        )

    out = composite_over(cloak_layer, far_leg)
    out = composite_over(out, torso_layer)
    out = composite_over(out, robe_tabard_layer)
    out = composite_over(out, near_leg)
    for y in range(29, 36):
        for x in range(20, 32):
            if out[y, x, 3] == 0:
                out[y, x] = ROBE_MID if 22 <= x <= 29 else ROBE_DARK
    return fill_layer_pinholes(out)


render_walk_robes = render_walk_legs


def make_crouch_body(tpl, crouch_depth):
    """
    Constructs a clean low-profile crouched pyromancer body with `crouch_depth` in [1..7] logical pixels,
    keeping torso robes down to y=36+ and filling any transparent hip/skirt seam pixels at y=29..35, x=20..31.
    """
    canvas = np.zeros((52, 52, 4), dtype=np.uint8)
    if crouch_depth >= 5:
        canvas[36:50, :] = tpl['kneel1'][36:50, :]
        upper = tpl['stand_upper']
        for y in range(0, 37):
            ny = min(49, y + crouch_depth)
            if 2 <= ny < 49:
                for x in range(0, 52):
                    if upper[y, x, 3] > 0:
                        canvas[ny, x] = upper[y, x]
    else:
        canvas[36:50, :] = tpl['stand'][36:50, :]
        upper = tpl['stand_upper']
        for y in range(0, 39):
            ny = min(49, y + crouch_depth)
            if 2 <= ny < 49:
                for x in range(0, 52):
                    if upper[y, x, 3] > 0:
                        canvas[ny, x] = upper[y, x]
    for y in range(29, 36):
        for x in range(20, 32):
            if canvas[y, x, 3] == 0:
                canvas[y, x] = ROBE_MID if 22 <= x <= 29 else ROBE_DARK
    return fill_layer_pinholes(add_outline_to_layer(canvas))


def make_jump_body(tpl, jump_dy, tuck_amount, torso_lean_dx=0):
    """
    Constructs a clean, full-body aerial Flame-Glide jumping pyromancer pose in back-to-front anatomical order,
    keeping torso robes down to y=36 and filling any transparent hip/skirt seam pixels at y=29..35, x=20..31.
    """
    stand = tpl['stand'].copy()
    torso_dy = max(-2, min(4, int(round(jump_dy))))

    cloak_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    cloak_lift = int(round(max(0.0, tuck_amount) * 2.5))
    for y in range(20, 47):
        for x in range(1, 19):
            if stand[y, x, 3] == 0:
                continue
            if y >= 35 and x > 14:
                continue
            u = (y - 20) / 26.0
            cx = max(2, min(21, x - int(round(u * 2.6 * max(0.2, tuck_amount)))))
            cy = max(14, min(48, y + torso_dy - int(round(u * cloak_lift))))
            cloak_layer[cy, cx] = stand[y, x]
            if x >= 12 and y <= 36:
                cloak_layer[max(2, min(48, y + torso_dy)), x] = stand[y, x]
    cloak_layer = fill_layer_pinholes(cloak_layer)

    # Keep torso robes down to y=36 so zero hip/skirt seam opens during aerial tuck
    for y in range(0, 37):
        ny = y + torso_dy
        if not (2 <= ny < 50):
            continue
        dx = torso_lean_dx if y <= 26 else 0
        for x in range(14, 36):
            if stand[y, x, 3] > 0:
                torso_layer[ny, max(2, min(49, x + dx))] = stand[y, x]

    hip_x = 24.5
    hip_y = 32.5 + torso_dy

    def build_aerial_leg(boot_patch, orig_cx, knee_dx, knee_dy, foot_dx, foot_dy, boot_rot_deg, is_far_leg=False):
        layer = np.zeros((52, 52, 4), dtype=np.uint8)
        pil_boot = Image.fromarray(boot_patch, mode='RGBA')
        rot_boot = np.array(
            pil_boot.rotate(boot_rot_deg, resample=Image.NEAREST, center=(orig_cx, 41.0)),
            dtype=np.uint8
        )
        for y in range(34, 52):
            for x in range(4, 50):
                if rot_boot[y, x, 3] > 0:
                    ny = max(28, min(48, y + int(round(foot_dy))))
                    nx = max(4, min(48, x + int(round(foot_dx))))
                    px_col = rot_boot[y, x].copy()
                    if is_far_leg:
                        px_col[0] = int(px_col[0] * 0.76)
                        px_col[1] = int(px_col[1] * 0.76)
                        px_col[2] = int(px_col[2] * 0.80)
                    layer[ny, nx] = px_col

        kx = hip_x + knee_dx
        ky = hip_y + knee_dy
        ax = orig_cx + foot_dx
        ay = 41.5 + foot_dy

        if is_far_leg:
            c_dark, c_mid, c_hi, c_greave, c_gold = ROBE_SHADOW, CRIMSON_DARK, CRIMSON_DEEP, WOOD_DARK, GOLD_DARK
        else:
            c_dark, c_mid, c_hi, c_greave, c_gold = CRIMSON_DARK, CRIMSON_MID, CRIMSON_BRIGHT, GOLD_TRIM, GOLD_BRIGHT

        for off_x, col in [(-1.6, c_dark), (-0.6, c_mid), (0.4, c_hi), (1.4, c_dark)]:
            draw_line_px(layer, hip_x + off_x, hip_y, kx + off_x * 0.85, ky, col)
        for off_x, col in [(-1.2, c_dark), (0.0, c_greave), (1.2, c_dark)]:
            draw_line_px(layer, kx + off_x, ky, ax + off_x * 0.85, ay, col)
        set_px(layer, kx, ky, c_gold)
        set_px(layer, kx + 1, ky, c_gold)
        return fill_layer_pinholes(layer, 3, 49, 25, 49, require_3_neighbors=True)

    t = max(0.0, tuck_amount)
    far_leg = build_aerial_leg(
        tpl['leg_back'],
        19.0,
        knee_dx=-3.0 * t - 0.8,
        knee_dy=4.0 - 1.2 * t,
        foot_dx=-3.5 * t,
        foot_dy=torso_dy - 3.0 * t,
        boot_rot_deg=-22.0 * t,
        is_far_leg=True
    )
    near_leg = build_aerial_leg(
        tpl['leg_front'],
        28.5,
        knee_dx=4.2 * t + 1.0,
        knee_dy=3.2 - 2.2 * t,
        foot_dx=1.2 * t,
        foot_dy=torso_dy - 4.5 * t,
        boot_rot_deg=-20.0 * t,
        is_far_leg=False
    )

    robe_tabard = np.zeros((52, 52, 4), dtype=np.uint8)
    for off_x, col in [(-2.0, CRIMSON_DARK), (-1.0, CRIMSON_MID), (0.0, GOLD_TRIM), (1.0, GOLD_MID)]:
        draw_line_px(robe_tabard, hip_x + off_x, hip_y - 1, hip_x + off_x + 1.5 * t, hip_y + 4.5 - 1.0 * t, col)

    out = composite_over(cloak_layer, far_leg)
    out = composite_over(out, torso_layer)
    out = composite_over(out, robe_tabard)
    out = composite_over(out, near_leg)
    for y in range(29, 36):
        for x in range(20, 32):
            if out[y, x, 3] == 0:
                out[y, x] = ROBE_MID if 22 <= x <= 29 else ROBE_DARK
    return fill_layer_pinholes(out)


def build_row0_idle(tpl):
    """
    Row 0 (`IDLE`, 30 frames):
    Breathing robes (with duplicated row 29 so zero waist slit ever opens),
    gently flickering ember mantle & wizard hat tip,
    hovering left-hand solar orb, and 2-bone IK arm breathing with the Sun-Staff.
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

        # Flickering ember at pointed wizard hat apex & shoulder mantle
        hat_ember_y = max(3, 7 + breathe - (f % 3 == 0))
        set_px(base, 24 + (f % 2), hat_ember_y, SOLAR_YELLOW if f % 2 == 0 else FLAME_ORANGE)

        staff_deg = -79.0 + math.sin(phase) * 4.5
        grip_dx = 5.5 + math.sin(phase) * 1.4
        grip_dy = 0.5 + math.cos(phase) * 0.9
        frame = draw_sun_staff(
            base,
            shoulder=(29, 20 + breathe),
            grip_offset=(grip_dx, grip_dy),
            staff_deg=staff_deg,
            top_len=14.0,
            bot_len=23.5,
            phase_rad=phase,
            charge_level=1 if f % 6 in (2, 3) else 0,
            left_orb_mode='idle_orb',
            left_hand_pos=(14, 21 + breathe),
        )
        frames.append(ensure_safe_cell(frame, margin=1))
    return frames


def build_row1_walk(tpl):
    """
    Row 1 (`WALK`, 30 frames):
    Smooth 30fps battle-mage stride (F00..F14 step A, F15..F29 step B) with back-to-front
    armored/hemmed boot articulation under parted crimson-gold robes, natural forward lean,
    and wide counter-swinging 2-bone IK Sun-Staff arm.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        body = render_walk_legs(tpl, f)
        bob_y = int(round(math.cos(phase * 2.0) * 1.0))

        # Wide counter-swinging Solar Sun-Staff & 2-bone IK arm
        swing = math.sin(phase)
        staff_deg = -70.0 - swing * 15.0
        grip_dx = 4.5 + 2.0 * math.sin(phase)
        grip_dy = -0.5 + 1.2 * math.cos(phase)

        frame = draw_sun_staff(
            body,
            shoulder=(29, 20 + bob_y),
            grip_offset=(grip_dx, grip_dy),
            staff_deg=staff_deg,
            top_len=13.8,
            bot_len=21.5,
            phase_rad=phase,
            charge_level=0,
            left_orb_mode='idle_orb',
            left_hand_pos=(15 + int(round(swing * 2.0)), 22 + bob_y),
        )
        frames.append(ensure_safe_cell(frame, margin=1))
    return frames


def build_row2_auto_attack(tpl):
    """
    Row 2 (`AUTO_ATTACK`, 30 frames):
    30fps Pyromantic Fireball Cast with full 2-bone IK arm sweep:
    - F00..F09: High windup to grip_offset (1.5, -4.5) while igniting swirling solar sphere in left palm.
    - F10..F18: Forward pyroblast thrust to grip_offset (9.0, 1.5) with billowing robe flare.
    - F19..F29: Follow-through recovery through (5.0, 3.0) back to ready stance.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        use_cast_body = 9 <= f <= 21
        base = (tpl['cast_body'] if use_cast_body else tpl['stand']).copy()

        # Recoil shift on fireball projection frames F11..F13
        if f in (11, 12, 13):
            base = shift_layer(base, dx=-1, dy=0)

        base = apply_robe_cloak_wave(
            base, phase * 1.5, amplitude=2.1 if 10 <= f <= 18 else 1.5, vertical_flutter=0.7
        )

        if f <= 9:
            # F00..F09: High windup -> (1.5, -4.5) while igniting swirling solar sphere in left palm
            u = f / 9.0
            staff_deg = -81.0 - u * 24.0
            grip_x = 5.5 * (1.0 - u) + 1.5 * u
            grip_y = 0.5 * (1.0 - u) + (-4.5) * u
            charge = 3 if f >= 7 else (2 if f >= 4 else 1)
            frame = draw_sun_staff(
                base,
                shoulder=(29, 20),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=14.0,
                bot_len=21.5,
                phase_rad=phase * 2.0,
                charge_level=charge,
                left_orb_mode='palm_charge',
                left_hand_pos=(21 - int(round(u * 3.0)), 19 - int(round(u * 2.0))),
            )
        elif f <= 18:
            # F10..F18: Forward pyroblast thrust -> (9.0, 1.5)!
            k = f - 10
            u = k / 8.0
            if k <= 2:
                staff_deg = -45.0 + k * 18.0
            else:
                staff_deg = -9.0 - (k - 2) * 3.0
            if k == 0:
                grip_x, grip_y = 5.5, -1.5
            elif k <= 4:
                grip_x, grip_y = 9.0, 1.5
            else:
                v = (k - 4) / 4.0
                grip_x = 9.0 * (1.0 - v) + 5.0 * v
                grip_y = 1.5 * (1.0 - v) + 3.0 * v
            frame = draw_sun_staff(
                base,
                shoulder=(30, 19),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=14.0,
                bot_len=18.5,
                phase_rad=phase * 2.0,
                charge_level=3 if k <= 3 else 2,
                release_flash=(k in (1, 2, 3)),
                left_orb_mode='forward_cast',
                left_hand_pos=(34 + min(3, k), 18),
            )
        else:
            # F19..F29: Follow-through recovery from (5.0, 3.0) back to (5.5, 0.5)
            u = (f - 19) / 10.0
            staff_deg = -27.0 * (1.0 - u) + (-81.0) * u
            grip_x = 5.0 * (1.0 - u) + 5.5 * u
            grip_y = 3.0 * (1.0 - u) + 0.5 * u
            frame = draw_sun_staff(
                base,
                shoulder=(29, 20),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=14.0,
                bot_len=23.0,
                phase_rad=phase,
                charge_level=1 if f <= 21 else 0,
                left_orb_mode='idle_orb' if f >= 24 else 'none',
                left_hand_pos=(14, 21),
            )

        frames.append(ensure_safe_cell(frame, margin=1))
    return frames


def build_row3_skill(tpl):
    """
    Row 3 (`SKILL` - Hellfire Pillars + Solar Detonation, 30 frames):
    - Phase 1 (F00..F14): Raises the Sun-Staff high overhead to (2.0, -4.0) (F00..F06) and slams
      the butt into the ground (F07..F14) with a magma shockwave ring.
    - Phase 2 (F15..F29): Sweeps his 2-bone IK arm and staff forward to (8.5, -1.5) (F15..F22)
      to detonate the pillars, followed by ember recovery (F23..F29).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi

        if f <= 6:
            # Phase 1A (F00..F06): High overhead raise -> (2.0, -4.0)
            u = f / 6.0
            lift_dy = -1 if f >= 3 else 0
            base = tpl['stand'].copy()
            if lift_dy != 0:
                base = shift_layer(base, dx=0, dy=lift_dy)
            base = apply_robe_cloak_wave(base, phase * 2.0, amplitude=1.9, vertical_flutter=0.8)
            grip_x = 5.5 * (1.0 - u) + 2.0 * u
            grip_y = 0.5 * (1.0 - u) + (-4.0) * u
            frame = draw_sun_staff(
                base,
                shoulder=(29, 19 + lift_dy),
                grip_offset=(grip_x, grip_y),
                staff_deg=-88.0,
                top_len=12.0,
                bot_len=22.0,
                phase_rad=phase * 2.0,
                charge_level=3 if f >= 4 else 2,
                left_orb_mode='palm_charge',
                left_hand_pos=(20, 16 - int(round(u * 2.0))),
            )
        elif f <= 14:
            # Phase 1B (F07..F14): Ground slam -> (6.2, 2.8) then coil toward (3.0, -2.5)
            k = f - 7
            u = k / 7.0
            crouch_seq = [2, 3, 3, 2, 2, 1, 1, 0]
            cd = crouch_seq[k]
            base = make_crouch_body(tpl, cd) if cd > 0 else tpl['stand'].copy()
            base = apply_robe_cloak_wave(base, phase * 2.5, amplitude=2.2, vertical_flutter=0.9)
            if k <= 4:
                grip_x, grip_y = 6.2, 2.8
            else:
                v = (k - 4) / 3.0
                grip_x = 6.2 * (1.0 - v) + 3.0 * v
                grip_y = 2.8 * (1.0 - v) + (-2.5) * v
            frame = draw_sun_staff(
                base,
                shoulder=(29, 20 + cd),
                grip_offset=(grip_x, grip_y),
                staff_deg=-89.0,
                top_len=13.5,
                bot_len=25.0,
                phase_rad=phase * 2.5,
                charge_level=3 if k <= 3 else 2,
                ground_shockwave=min(1.0, (k + 1) / 7.5),
            )
        elif f <= 22:
            # Phase 2A (F15..F22): Wide forward pyromantic staff sweep & pillar raise -> (8.5, -1.5)!
            k = f - 15
            u = k / 7.0
            base = tpl['cast_body'].copy()
            base = apply_robe_cloak_wave(base, phase * 2.0, amplitude=2.3, vertical_flutter=0.9)
            sweep_angles = [-68.0, -42.0, -18.0, -8.0, -6.0, -10.0, -18.0, -28.0]
            staff_deg = sweep_angles[k]
            grip_x = 4.5 + min(1.0, k / 2.0) * 4.0  # -> 8.5
            grip_y = -2.5 + min(1.0, k / 2.0) * 1.0  # -> -1.5
            frame = draw_sun_staff(
                base,
                shoulder=(30, 19),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=14.0,
                bot_len=18.5,
                phase_rad=phase * 2.0,
                charge_level=3 if k in (2, 3, 4) else 2,
                release_flash=(k in (2, 3)),
                left_orb_mode='forward_cast',
                left_hand_pos=(35, 18),
            )
            # Clamped crescent pyromantic flame arc on sweep frames F16..F20
            if 1 <= k <= 5:
                for a_deg in range(int(staff_deg) - 28, int(staff_deg) + 6, 4):
                    ar = math.radians(a_deg)
                    ax = max(3.0, min(48.0, 35.0 + math.cos(ar) * 11.5))
                    ay = max(3.0, min(48.0, 19.0 + math.sin(ar) * 11.5))
                    set_px(frame, ax, ay, SOLAR_YELLOW if a_deg > staff_deg - 12 else FLAME_ORANGE)
                    set_px(frame, max(2.0, ax - 1), ay, FLAME_CRIMSON)
        else:
            # Phase 2B (F23..F29): Ember recovery from (8.5, -1.5) back to (5.5, 0.5)
            u = (f - 23) / 6.0
            base = apply_robe_cloak_wave(tpl['stand'].copy(), phase, amplitude=1.6, vertical_flutter=0.6)
            staff_deg = -28.0 * (1.0 - u) + (-81.0) * u
            grip_x = 8.5 * (1.0 - u) + 5.5 * u
            grip_y = -1.5 * (1.0 - u) + 0.5 * u
            frame = draw_sun_staff(
                base,
                shoulder=(29, 20),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=14.0,
                bot_len=23.0,
                phase_rad=phase,
                charge_level=1 if f <= 25 else 0,
                left_orb_mode='idle_orb',
                left_hand_pos=(14, 21),
            )

        frames.append(ensure_safe_cell(frame, margin=1))
    return frames


def build_row4_ultimate(tpl):
    """
    Row 4 (`ULTIMATE` - Cataclysm: Eclipse Supernova, 30 frames):
    - Stage 1 (F00..F10): Skyward hoist to grip_offset (2.5, -5.0), conjuring black-gold Eclipse corona at ecy=8.5.
    - Stage 2 (F11..F20): Channels full solar overdrive at high hoist with blazing mantle wings & orbiting runes.
    - Stage 3 (F21..F29): Sweeps both hands and Sun-Staff forward to (9.0, 0.5) to unleash Supernova Beam.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi

        if f <= 10:
            # Stage 1 (F00..F10): Ascend into levitation, skyward hoist -> (2.5, -5.0)
            u = f / 10.0
            tuck = min(0.55, u * 0.65)
            lev_dy = -int(round(u * 2.0))
            body = make_jump_body(tpl, lev_dy, tuck_amount=tuck) if f >= 2 else tpl['stand'].copy()
            body = apply_robe_cloak_wave(body, phase * 2.0, amplitude=2.0, vertical_flutter=0.9)
            staff_deg = -80.0 - u * 7.0
            grip_x = 5.5 * (1.0 - u) + 2.5 * u
            grip_y = 0.0 * (1.0 - u) + (-5.0) * u
            frame = draw_sun_staff(
                body,
                shoulder=(29, 19 + lev_dy),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=11.5,
                bot_len=21.0,
                phase_rad=phase * 2.0,
                charge_level=2 if f >= 5 else 1,
                left_orb_mode='palm_charge',
                left_hand_pos=(20, 15 + lev_dy),
                solar_wings=u * 0.6,
                eclipse_crown=min(1.0, u * 1.1),
            )
        elif f <= 20:
            # Stage 2 (F11..F20): Full Solar Overdrive levitation at skyward hoist (2.5, -5.0)
            k = f - 11
            lev_dy = -2
            body = make_jump_body(tpl, lev_dy, tuck_amount=0.55)
            body = apply_robe_cloak_wave(body, phase * 3.0, amplitude=2.4, vertical_flutter=1.1)
            grip_x = 2.5 + math.sin(phase * 2.0) * 0.9
            grip_y = -5.0 + math.cos(phase * 2.0) * 0.7
            frame = draw_sun_staff(
                body,
                shoulder=(29, 19 + lev_dy),
                grip_offset=(grip_x, grip_y),
                staff_deg=-86.0 + math.sin(phase * 2.0) * 3.0,
                top_len=11.5,
                bot_len=21.0,
                phase_rad=phase * 3.0,
                charge_level=3,
                left_orb_mode='palm_charge',
                left_hand_pos=(19, 14 + lev_dy),
                solar_wings=1.0,
                eclipse_crown=1.0,
            )
            # 4 Orbiting Fire Runes revolving around Ignis in 3D ellipse
            for r_i in range(4):
                ra = phase * 3.0 + r_i * (math.pi * 0.5)
                rx = max(3.0, min(48.0, 25.0 + math.cos(ra) * 14.0))
                ry = max(4.0, min(47.0, 26.0 + math.sin(ra) * 5.0))
                set_px(frame, rx, ry, SOLAR_WHITE)
                set_px(frame, rx, ry - 1, SOLAR_YELLOW)
                set_px(frame, rx, ry + 1, FLAME_ORANGE)
        else:
            # Stage 3 (F21..F29): Supernova beam thrust -> (9.0, 0.5)!
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
                grip_x, grip_y = 9.0, 0.5
            else:
                v = (k - 5) / 3.0
                grip_x = 9.0 * (1.0 - v) + 6.0 * v
                grip_y = 0.5 * (1.0 - v) + 1.0 * v
            frame = draw_sun_staff(
                body,
                shoulder=(30, 19 + lev_dy),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=14.0,
                bot_len=18.5,
                phase_rad=phase * 2.5,
                charge_level=3 if k <= 5 else 2,
                release_flash=(k <= 4),
                left_orb_mode='forward_cast' if k <= 5 else 'idle_orb',
                left_hand_pos=(35, 18 + lev_dy) if k <= 5 else (15, 21),
                solar_wings=max(0.0, 1.0 - u * 0.9),
                eclipse_crown=max(0.0, 1.0 - u * 0.8),
            )

        # Ground levitation ember vortex under his boots while airborne (F02..F25)
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
    - F07..F17: Drops to knees, robes pooling on the ground, leaning on his dimming Sun-Staff
      (clean head_bow / slump without leaving row 8 empty, keeping pose inside y <= 49).
    - F18..F29: Collapses horizontally onto the ground (y=38..48) with his Sun-Staff lying flat
      beside him (ZERO floating upright staff!).
    """
    frames = []
    for f in range(30):
        if f <= 6:
            # F00..F06: Hit-stagger recoil backward with dynamic IK arm flinch
            u = f / 6.0
            dx = -int(round(u * 2.0))
            dy = int(round(u * 1.5))
            base = shift_layer(tpl['stand'], dx=dx, dy=dy)
            base = apply_robe_cloak_wave(base, u * math.pi, amplitude=1.7, vertical_flutter=0.6)
            grip_x = 5.5 - math.sin(u * math.pi) * 2.5
            grip_y = 0.5 - math.sin(u * math.pi) * 2.2 + u * 2.0
            frame = draw_sun_staff(
                base,
                shoulder=(29 + dx, 20 + dy),
                grip_offset=(grip_x, grip_y),
                staff_deg=-76.0 + u * 26.0,
                top_len=13.5,
                bot_len=21.5,
                phase_rad=u * math.pi,
                charge_level=0,
            )
            frames.append(ensure_safe_cell(frame, margin=1))

        elif f <= 17:
            # F07..F17: Drops to knees, robes pooling on the ground, leaning on his dimming Sun-Staff
            k = f - 7
            u = k / 10.0
            base = (tpl['kneel1'] if k <= 4 else tpl['kneel2']).copy()
            head_bow = 1 if k >= 6 else 0
            if head_bow == 1:
                # Copy head/hat cleanly down by 1px without leaving row 8 empty, keeping pose inside y <= 49
                head_slice = base[7:22, 14:40].copy()
                base[8:23, 14:40] = head_slice
                base = fill_layer_pinholes(base)

            base = apply_robe_cloak_wave(base, u * math.pi, amplitude=1.0, vertical_flutter=0.3)
            staff_deg = -52.0 + u * 38.0
            grip_x = 4.0 + u * 3.0
            grip_y = 1.0 + u * 2.5
            frame = draw_sun_staff(
                base,
                shoulder=(31, 22 + head_bow),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=12.5,
                bot_len=17.5,
                phase_rad=u * math.pi,
                charge_level=0,
            )
            frames.append(ensure_safe_cell(frame, margin=1))

        else:
            # F18..F29: Collapsed horizontally onto the ground (y=38..48) with Sun-Staff lying FLAT beside him!
            k = f - 18
            frame = tpl['fall'].copy()
            if k == 0:
                frame = shift_layer(frame, dx=0, dy=-1)

            # Draw the Solar Sun-Staff lying flat horizontally on the arena floor (y=46..48, x=14..45)
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
            # F00..F03: Ignition knee-bend launch into Flame-Step Dash
            u = f / 3.0
            cd = [1, 2, 2, 1][f]
            base = make_crouch_body(tpl, cd) if f <= 1 else tpl['dash'].copy()
            base = apply_robe_cloak_wave(base, phase * 2.0, amplitude=1.9, is_dash=(f >= 2))
            grip_x = 3.5 + u * 3.5
            grip_y = -1.5 + u * 1.5
            frame = draw_sun_staff(
                base,
                shoulder=(31 if f >= 2 else 29, 20 + (0 if f >= 2 else cd)),
                grip_offset=(grip_x, grip_y),
                staff_deg=-75.0 + u * 55.0,
                top_len=13.5,
                bot_len=19.5,
                phase_rad=phase * 2.0,
                charge_level=2,
            )
        elif f <= 21:
            # F04..F21: Low aerodynamic forward flame-glide dash wrapped in streaming solar embers!
            k = f - 4
            hover_dy = -1 if 3 <= k <= 14 else 0
            base = tpl['dash'].copy()
            if hover_dy != 0:
                base = shift_layer(base, dx=0, dy=hover_dy)
            base = apply_robe_cloak_wave(base, k * 0.85, amplitude=2.3, is_dash=True)

            is_snap_cast = 8 <= k <= 11
            grip_x = 8.0 if is_snap_cast else (4.2 + math.sin(phase * 2.0) * 1.4)
            grip_y = 0.5 if is_snap_cast else (-1.2 + math.cos(phase * 2.0) * 0.8)
            frame = draw_sun_staff(
                base,
                shoulder=(32, 21 + hover_dy),
                grip_offset=(grip_x, grip_y),
                staff_deg=-12.0 if is_snap_cast else -18.0,
                top_len=13.0,
                bot_len=17.5,
                phase_rad=phase * 2.5,
                charge_level=3 if is_snap_cast else 2,
                release_flash=(k in (9, 10)),
            )

            # Streaming horizontal solar flame streaks & crimson robe embers trailing behind (x=3..24)
            for s_i in range(5):
                sx_e = 3 + ((f * 4 + s_i * 5) % 19)
                sy_e = 24 + s_i * 4 + int(round(math.sin(phase * 2.0 + s_i) * 1.0))
                set_px(frame, sx_e, sy_e, SOLAR_YELLOW if s_i % 2 == 0 else FLAME_ORANGE)
                set_px(frame, max(2, sx_e - 1), sy_e, FLAME_CRIMSON)
        else:
            # F22..F29: Smooth braking slide & recovery to standing stance
            k = f - 22
            u = k / 7.0
            cd = [2, 2, 1, 1, 0, 0, 0, 0][k]
            base = make_crouch_body(tpl, cd) if cd > 0 else tpl['stand'].copy()
            base = apply_robe_cloak_wave(base, phase * 1.5, amplitude=1.7, vertical_flutter=0.6)
            staff_deg = -22.0 * (1.0 - u) + (-81.0) * u
            grip_x = 7.5 * (1.0 - u) + 5.5 * u
            grip_y = 1.8 * (1.0 - u) + 0.5 * u
            frame = draw_sun_staff(
                base,
                shoulder=(29, 20 + cd),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=14.0,
                bot_len=22.5,
                phase_rad=phase,
                charge_level=1 if k <= 2 else 0,
                left_orb_mode='idle_orb' if k >= 4 else 'none',
                left_hand_pos=(14, 21 + cd),
            )

        frames.append(ensure_safe_cell(frame, margin=1))
    return frames


def build_row7_crouch(tpl):
    """
    Row 7 (`CROUCH`, 30 frames):
    - F00..F06: Drops into a low pyromantic kneeling crouch (7px lower silhouette),
      planting his Sun-Staff diagonally and conjuring a spinning Flame-Ward shield ring in front of him.
    - F07..F18: Launches a low skimming Solar Fireball from his crouched stance (F11..F16) with wide IK arm thrust.
    - F19..F29: Rises smoothly back to standing stance.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi

        if f <= 6:
            # F00..F06: Smooth descent into 7px low kneeling crouch + conjuring Flame-Ward shield ring
            depths = [0, 1, 3, 5, 6, 7, 7]
            d = depths[f]
            u = f / 6.0
            base = tpl['stand'].copy() if d == 0 else make_crouch_body(tpl, d)
            base = apply_robe_cloak_wave(base, phase, amplitude=1.3, vertical_flutter=0.4)
            staff_deg = -81.0 * (1.0 - u) + (-52.0) * u
            grip_x = 5.5 * (1.0 - u) + 3.2 * u
            grip_y = 0.5 * (1.0 - u) + (-1.5) * u
            frame = draw_sun_staff(
                base,
                shoulder=(29, 20 + d),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=13.5,
                bot_len=18.5,
                phase_rad=phase * 2.0,
                charge_level=1 if f >= 3 else 0,
                left_orb_mode='ward_shield' if f >= 3 else 'palm_charge',
                left_hand_pos=(41, 28) if f >= 3 else (22, 20 + d),
            )
        elif f <= 18:
            # F07..F18: Low 7px crouch with spinning Flame-Ward shield & low skimming Solar Fireball cast (F11..F16)
            d = 7
            k = f - 7
            base = make_crouch_body(tpl, d)
            if f in (11, 12):
                base = shift_layer(base, dx=-1, dy=0)
            base = apply_robe_cloak_wave(base, phase * 1.5, amplitude=1.5, vertical_flutter=0.4)

            if k < 4:
                v = k / 3.0
                staff_deg = -52.0 + v * 38.0
                grip_x = 3.2 * (1.0 - v) + 2.2 * v
                grip_y = -1.5 * (1.0 - v) + (-2.5) * v
            elif k <= 8:
                staff_deg = -6.0
                grip_x, grip_y = 8.5, 1.0
            else:
                v = (k - 8) / 3.0
                staff_deg = -6.0 - (k - 8) * 14.0
                grip_x = 8.5 * (1.0 - v) + 5.0 * v
                grip_y = 1.0 * (1.0 - v) + 2.0 * v

            frame = draw_sun_staff(
                base,
                shoulder=(29, 20 + d),
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
            # F19..F29: Rise smoothly from 7px crouch back to standing stance
            depths = [7, 6, 6, 5, 4, 3, 2, 2, 1, 1, 0]
            k = f - 19
            d = depths[k]
            u = k / 10.0
            base = tpl['stand'].copy() if d == 0 else make_crouch_body(tpl, d)
            base = apply_robe_cloak_wave(base, phase, amplitude=1.4, vertical_flutter=0.5)
            staff_deg = -48.0 * (1.0 - u) + (-81.0) * u
            grip_x = 5.0 * (1.0 - u) + 5.5 * u
            grip_y = 2.0 * (1.0 - u) + 0.5 * u
            frame = draw_sun_staff(
                base,
                shoulder=(29, 20 + d),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=13.8,
                bot_len=22.0,
                phase_rad=phase,
                charge_level=0,
                left_orb_mode='idle_orb' if d <= 2 else 'none',
                left_hand_pos=(14, 21 + d),
            )

        frames.append(ensure_safe_cell(frame, margin=1))
    return frames


def build_row8_jump(tpl):
    """
    Row 8 (`JUMP`, 30 frames - ZERO bouncy-ball frames!):
    Full-body Flame-Glide Aerial Vault & mid-air downward Fireball cast:
    - F00..F04: Knee-bend launch with ember burst at boots
    - F05..F11: Ascending aerial vault with robes & hat streaming cleanly and high IK arm lift
    - F12..F18: Apex mid-air hover aiming his Sun-Staff downward at +35 deg with full IK arm extension
    - F19..F24: Descending flame-cushioned glide
    - F25..F29: Soft landing
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi

        if f <= 4:
            # F00..F04: Knee-bend launch with ember burst at boots
            crouch_seq = [1, 3, 4, 2, 0]
            cd = crouch_seq[f]
            u = f / 4.0
            body = make_crouch_body(tpl, cd) if cd >= 2 else make_jump_body(tpl, cd, tuck_amount=0.25)
            body = apply_robe_cloak_wave(body, phase * 2.0, amplitude=1.8, vertical_flutter=0.8)
            staff_deg = [-78.0, -68.0, -62.0, -45.0, -28.0][f]
            grip_x = 3.5 + u * 2.0
            grip_y = 2.0 - u * 4.0
            frame = draw_sun_staff(
                body,
                shoulder=(29, 20 + cd),
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
            # F05..F11: Ascending full-body aerial vault with robes & wizard hat streaming cleanly
            k = f - 5
            u = k / 6.0
            tuck = 0.45 + 0.50 * math.sin(u * math.pi * 0.65)
            body = make_jump_body(tpl, 0, tuck_amount=tuck, torso_lean_dx=1 if k >= 3 else 0)
            body = apply_robe_cloak_wave(body, phase * 2.0, amplitude=2.3, vertical_flutter=1.0)
            staff_deg = -20.0 * (1.0 - u) + 32.0 * u
            grip_x = 5.5 * (1.0 - u) + 2.5 * u
            grip_y = -2.0 * (1.0 - u) + (-4.0) * u
            frame = draw_sun_staff(
                body,
                shoulder=(30, 19),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=13.0,
                bot_len=18.0,
                phase_rad=phase * 2.0,
                charge_level=2 if k >= 4 else 1,
                left_orb_mode='palm_charge' if k >= 3 else 'none',
                left_hand_pos=(20, 18),
            )
            for j in range(3):
                jx = 19 + j * 5 + (f % 2)
                jy = 45 + (j % 2)
                set_px(frame, jx, jy, SOLAR_YELLOW if j == 1 else FLAME_ORANGE)
                set_px(frame, jx, jy + 1, FLAME_CRIMSON)

        elif f <= 18:
            # F12..F18: Apex mid-air hover aiming Sun-Staff downward at +35 deg to fire a blazing Solar Fireball!
            k = f - 12
            tuck = 0.92 - k * 0.03
            recoil_dx = -1 if k in (3, 4) else 0
            body = make_jump_body(tpl, 0, tuck_amount=tuck, torso_lean_dx=1 + recoil_dx)
            body = apply_robe_cloak_wave(body, phase * 2.5, amplitude=2.4, vertical_flutter=1.1)
            staff_deg = 35.0 - (3.0 if k in (3, 4) else 0.0)
            if k < 2:
                grip_x, grip_y = 4.0, -2.0
            else:
                grip_x, grip_y = 8.5, 2.0
            frame = draw_sun_staff(
                body,
                shoulder=(30 + recoil_dx, 19),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=13.0,
                bot_len=17.5,
                phase_rad=phase * 2.5,
                charge_level=3 if k <= 4 else 2,
                release_flash=(k in (2, 3, 4)),
                left_orb_mode='forward_cast',
                left_hand_pos=(34, 21),
            )
            for j in range(3):
                jx = 18 + j * 5 + (f % 2)
                set_px(frame, jx, 45, FLAME_GOLD)

        elif f <= 24:
            # F19..F24: Descending flame-cushioned glide
            k = f - 19
            u = k / 5.0
            tuck = 0.72 * (1.0 - u) + 0.15 * u
            body = make_jump_body(tpl, 0, tuck_amount=tuck)
            body = apply_robe_cloak_wave(body, phase * 2.0, amplitude=2.1, vertical_flutter=1.0)
            staff_deg = 30.0 * (1.0 - u) + (-55.0) * u
            grip_x = 8.0 * (1.0 - u) + 4.5 * u
            grip_y = 2.0 * (1.0 - u) + (-1.0) * u
            frame = draw_sun_staff(
                body,
                shoulder=(29, 20),
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
            # F25..F29: Soft knee-flex landing
            k = f - 25
            crouch_depths = [2, 3, 2, 1, 0]
            cd = crouch_depths[k]
            body = tpl['stand'].copy() if cd == 0 else make_crouch_body(tpl, cd)
            body = apply_robe_cloak_wave(body, phase, amplitude=1.6, vertical_flutter=0.6)
            u = k / 4.0
            staff_deg = -60.0 * (1.0 - u) + (-81.0) * u
            grip_x = 4.8 * (1.0 - u) + 5.5 * u
            grip_y = 2.2 * (1.0 - u) + 0.5 * u
            frame = draw_sun_staff(
                body,
                shoulder=(29, 20 + cd),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=14.0,
                bot_len=23.0,
                phase_rad=phase,
                charge_level=0,
                left_orb_mode='idle_orb' if cd <= 1 else 'none',
                left_hand_pos=(14, 21 + cd),
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

