#!/usr/bin/env python3
"""
Builds Zephyros / Vespera's (Chronomancer) 30-Frame-Per-Animation HD-2D Sprite Sheet:
- 9 rows x 30 columns = 270 unique frames (6240 x 1872 at 208x208 per cell, 52x52 logical upscaled 4x NEAREST):
  * Row 0: IDLE (30 frames) - Smooth breathing, swaying teal-and-gold coat tails, rotating brass escapement halo gear, spinning turquoise astrolabe finial
  * Row 1: WALK (30 frames) - Anatomical 30fps stride (F00..F14 step A, F15..F29 step B) with back-to-front brass-trimmed boots and counter-swinging Chrono-Staff
  * Row 2: AUTO_ATTACK (30 frames) - 30fps Clock-Gear Launch (F00..F09 wind-back & spinning saw-gear, F10..F18 forward cast launch with turquoise time-sparks, F19..F29 recovery)
  * Row 3: SKILL - TEMPORAL STASIS HOURGLASS & REWIND SHATTER (30 frames)
  * Row 4: ULTIMATE - DOOMSDAY CLOCK: MIDNIGHT PARADOX (30 frames)
  * Row 5: DEATH & HURT (30 frames) - F00..F06 hit-stagger recoil, F07..F17 kneel & dimming halo, F18..F29 horizontal collapse with flat Chrono-Staff (ZERO upright floating staff!)
  * Row 6: DASH - TEMPORAL RIFT PHASE-STEP (30 frames)
  * Row 7: CROUCH - TEMPORAL CALIBRATION KNEEL, ESCAPEMENT SHIELD & LOW SAW-GEAR SHOT (30 frames)
  * Row 8: JUMP - TIME-GLIDE AERIAL VAULT & DOWNWARD 35-DEG SAW-GEAR VOLLEY (30 frames - ZERO bouncy-ball frames!)
- Zero duplicate weapons, zero extra limbs, un-inked clean pixel art (PixelForge adds runtime 1px outline & rim).
"""

import math
import os
import numpy as np
from PIL import Image, ImageDraw

OUTLINE = (11, 15, 25, 255)

# Luminous Chronomancer Brass, Gold, Turquoise & Astral Teal Palette
WHITE_CORE = (255, 255, 255, 255)
GOLD_STAR = (254, 240, 138, 255)      # #fef08a
GOLD_BRIGHT = (250, 204, 21, 255)     # #facc15
BRASS_BRIGHT = GOLD_BRIGHT
BRASS_LIGHT = (224, 182, 94, 255)
BRASS_MID = (176, 134, 68, 255)
BRASS_DARK = (112, 82, 42, 255)
BRONZE_DEEP = (68, 48, 34, 255)

CYAN_CORE = (204, 251, 241, 255)      # #ccfbf1
CYAN_BRIGHT = (94, 234, 212, 255)     # #5eead4
TIME_CYAN = CYAN_BRIGHT
TEAL_BRIGHT = (45, 212, 191, 255)     # #2dd4bf
TEAL_MID = (20, 184, 166, 255)        # #14b8a6
TEAL_COAT_LIGHT = (74, 157, 151, 255)
TEAL_COAT_MID = (38, 82, 93, 255)
TEAL_COAT_DARK = (24, 48, 66, 255)
TEAL_COAT_DEEP = (16, 28, 48, 255)
COAT_LIGHT = TEAL_COAT_LIGHT
COAT_TEAL = TEAL_COAT_MID
COAT_DARK = TEAL_COAT_DARK

SILVER_LIGHT = (226, 232, 240, 255)
SILVER_MID = (148, 163, 184, 255)
SKIN_LIGHT = (226, 188, 160, 255)
SKIN_SHADOW = (178, 138, 112, 255)
LEATHER_BOOT = (101, 74, 62, 255)
LEATHER_DARK = (61, 44, 40, 255)


def load_source_cells(path='backups/chronomancer_sheet_before_30fps.png'):
    im = Image.open(path).convert('RGBA')

    def cell(r, c):
        return np.array(
            im.crop((c * 208, r * 208, (c + 1) * 208, (r + 1) * 208)).resize((52, 52), Image.NEAREST),
            dtype=np.uint8
        )

    return {
        'idle': cell(0, 0),
        'cast_h': np.roll(cell(2, 3), 3, axis=1),
        'skill_up': cell(3, 5),
        'hurt': cell(4, 0),
        'kneel1': cell(4, 2),
        'kneel2': cell(4, 3),
        'fall': cell(4, 5),
        'dash': cell(5, 1),
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


def draw_circle_px(buf, cx, cy, r, col, steps=24):
    for i in range(steps):
        a = (i / float(steps)) * 2.0 * math.pi
        set_px(buf, cx + math.cos(a) * r, cy + math.sin(a) * r, col)


def add_outline_to_layer(layer):
    """
    Returns `layer.copy()` without baking dark exterior outlines into transparent space,
    because `PixelForge.js` dynamically adds the 1px comic outline and 1px rim at runtime.
    """
    return layer.copy()


def fill_layer_pinholes(layer, x0=1, x1=50, y0=1, y1=50, require_3_neighbors=False):
    """
    Fills 1px transparent pinholes/slits inside moved, waved, or rotated pixel layers
    so movement never causes missing interior pixels or torn seams.
    """
    out = layer.copy()
    alpha = layer[:, :, 3] > 0
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
                        out[y, x] = layer[y - 1, x]
                    elif lf:
                        out[y, x] = layer[y, x - 1]
                    elif dn:
                        out[y, x] = layer[y + 1, x]
                    elif rt:
                        out[y, x] = layer[y, x + 1]
    return out


def shift_layer(layer, dx, dy):
    """
    Shifts `layer` by `(dx, dy)` integer pixels without wrap-around and fills any pinholes.
    """
    out = np.zeros_like(layer)
    ix = int(round(dx))
    iy = int(round(dy))
    for y in range(52):
        ny = y + iy
        if 0 <= ny < 52:
            for x in range(52):
                nx = x + ix
                if 0 <= nx < 52 and layer[y, x, 3] > 0:
                    out[ny, nx] = layer[y, x]
    return fill_layer_pinholes(out)


def ensure_safe_cell(cell, margin=1):
    """
    Guarantees zero pixels touch the 52x52 cell border (x=0, x=51, y=0, y=51) and fills
    any 1px interior pinholes from movement.
    """
    lo = int(margin)
    hi = 51 - lo
    out = fill_layer_pinholes(cell, lo, hi, lo, hi, require_3_neighbors=True)
    ys, xs = np.where(out[:, :, 3] > 0)
    if len(ys) == 0:
        return out
    ymin, ymax = int(ys.min()), int(ys.max())
    xmin, xmax = int(xs.min()), int(xs.max())

    dy = 0
    if ymin < lo and ymax < hi:
        dy = min(lo - ymin, hi - ymax)
    elif ymax > hi and ymin > lo:
        dy = -min(ymax - hi, ymin - lo)

    dx = 0
    if xmin < lo and xmax < hi:
        dx = min(lo - xmin, hi - xmax)
    elif xmax > hi and xmin > lo:
        dx = -min(xmax - hi, xmin - lo)

    if dx != 0 or dy != 0:
        shifted = np.zeros_like(out)
        for y in range(52):
            ny = y + dy
            if lo <= ny <= hi:
                for x in range(52):
                    nx = x + dx
                    if lo <= nx <= hi and out[y, x, 3] > 0:
                        shifted[ny, nx] = out[y, x]
        out = shifted

    out[:lo, :, :] = 0
    out[52 - lo:, :, :] = 0
    out[:, :lo, :] = 0
    out[:, 52 - lo:, :] = 0
    return out


def composite_over(base, over):
    res = base.copy()
    mask = over[:, :, 3] > 0
    res[mask] = over[mask]
    return res


def make_clean_templates(src):
    """
    Strips ALL baked-in hourglass/gear pixels from the backup cells so we can animate
    EXACTLY ONE crisp articulated Chrono-Astrolabe Staff (`draw_chrono_staff`) per frame
    with zero duplicate weapons or extra limbs.
    """
    # 1. Clean standing Chronomancer body (patch uncovered chest/waist from cast_h, strip hourglass at x >= 30, y <= 23)
    stand = src['idle'].copy()
    cast_h = src['cast_h'].copy()
    cast_h[:, :3] = 0
    stand[16:24, 18:31] = cast_h[16:24, 18:31]
    stand[0:24, 30:] = 0
    # Add subtle glowing cyan eye & brass astrolabe crown diadem accent on head
    set_px(stand, 25, 7, CYAN_BRIGHT)
    set_px(stand, 26, 7, CYAN_CORE)
    set_px(stand, 24, 4, BRASS_LIGHT)
    set_px(stand, 26, 4, GOLD_BRIGHT)
    stand = add_outline_to_layer(stand)

    # Extract Zephyros's brass-trimmed pixel-art boots from `stand`
    leg_back_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_front_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_back_patch[39:50, 15:23] = stand[39:50, 15:23]
    leg_front_patch[39:50, 24:34] = stand[39:50, 24:34]

    # Upper torso + upper coat (without lower legs y >= 40) for walk/crouch/jump articulation
    stand_upper = stand.copy()
    stand_upper[40:, :, :] = 0
    stand_upper[40:46, :15, :] = stand[40:46, :15, :]
    stand_upper = add_outline_to_layer(stand_upper)

    # 2. Clean casting body (from cast_h, with extended arm/gear at x >= 30, y <= 21 removed)
    aim_h = cast_h.copy()
    aim_h[0:22, 30:] = 0
    set_px(aim_h, 25, 7, CYAN_BRIGHT)
    set_px(aim_h, 26, 7, CYAN_CORE)
    set_px(aim_h, 24, 4, BRASS_LIGHT)
    set_px(aim_h, 26, 4, GOLD_BRIGHT)
    aim_h = add_outline_to_layer(aim_h)

    # 3. Clean kneeling bodies (kneel1, kneel2) with baked-in floor hourglass & reaching arm removed
    kneel1 = src['kneel1'].copy()
    kneel2 = src['kneel2'].copy()
    for kn in (kneel1, kneel2):
        kn[29:37, 32:] = 0
        kn[37:50, 34:] = 0
        set_px(kn, 34, 15, CYAN_BRIGHT)
        set_px(kn, 34, 12, BRASS_LIGHT)
    kneel1 = add_outline_to_layer(kneel1)
    kneel2 = add_outline_to_layer(kneel2)

    # 4. Clean horizontal fallen body (strip broken hourglass at x >= 44, y=38..42 and x >= 35, y=43..49)
    fall = src['fall'].copy()
    fall[:31, :, :] = 0
    fall[38:43, 44:] = 0
    fall[43:50, 35:] = 0
    fall = add_outline_to_layer(fall)

    # 5. Clean dash lunge body (strip front hourglass at x >= 40, y=14..27 and baked background blobs at x <= 23, y <= 17)
    dash = src['dash'].copy()
    dash[14:28, 40:] = 0
    dash[10:18, 17:25] = 0
    set_px(dash, 43, 8, CYAN_BRIGHT)
    set_px(dash, 42, 5, GOLD_BRIGHT)
    # Recenter dash left by dx = -4 so dashing body sits at x=8..39 with plenty of room for forward staff lunges
    dash = shift_layer(dash, -4, 0)
    dash = add_outline_to_layer(dash)

    return {
        'stand': stand,
        'stand_upper': stand_upper,
        'leg_back': leg_back_patch,
        'leg_front': leg_front_patch,
        'aim_h': aim_h,
        'kneel1': kneel1,
        'kneel2': kneel2,
        'fall': fall,
        'dash': dash,
    }


def apply_coat_wave(frame, phase_rad, amplitude=1.5, vertical_flutter=0.6, is_dash=False):
    """
    Applies a smooth 30-frame traveling wave to Zephyros's teal-and-brass clockwork coat tails
    (left side of sprite) without detaching from the waist/hips, and fills any wave pinholes.
    """
    out = frame.copy()
    if is_dash:
        coat_region = frame[17:38, 0:21].copy()
        out[17:38, 0:21] = 0
        for y in range(17, 38):
            for x in range(0, 21):
                if coat_region[y - 17, x, 3] == 0:
                    continue
                if y >= 33 and x >= 14:
                    out[y, max(2, x)] = coat_region[y - 17, x]
                    continue
                dist = max(0.0, (21 - x) / 18.0)
                dy = int(round(math.sin(phase_rad - dist * 3.0) * amplitude * dist))
                dx = int(round(math.cos(phase_rad * 2.0 - dist * 2.4) * 0.8 * dist))
                ny = max(14, min(46, y + dy))
                nx = max(2, min(21, x + dx))
                out[ny, nx] = coat_region[y - 17, x]
                if x >= 13 and out[y, x, 3] == 0:
                    out[y, x] = coat_region[y - 17, x]
        out = fill_layer_pinholes(out)
        return add_outline_to_layer(out)

    coat_mask = np.zeros((52, 52), dtype=bool)
    for y in range(20, 46):
        max_coat_x = 17 if y < 37 else 14
        for x in range(1, max_coat_x + 1):
            if frame[y, x, 3] > 0:
                coat_mask[y, x] = True

    coat_pixels = frame.copy()
    out[coat_mask] = 0

    for y in range(20, 46):
        u = (y - 20) / 25.0
        wave_x = math.sin(phase_rad - u * 3.4) * (amplitude * (0.25 + 0.85 * u))
        wave_y = math.cos(phase_rad - u * 2.6) * (vertical_flutter * u)
        dx = int(round(wave_x))
        dy = int(round(wave_y))
        for x in range(1, 18):
            if not coat_mask[y, x]:
                continue
            nx = max(2, min(19, x + dx))
            ny = max(19, min(48, y + dy))
            if out[ny, nx, 3] == 0:
                out[ny, nx] = coat_pixels[y, x]
            # Keep solid bridge next to hip/thigh so no vertical gap opens
            if dx < 0 and x >= 13 and out[y, x, 3] == 0:
                out[y, x] = coat_pixels[y, x]

    out = fill_layer_pinholes(out)
    return add_outline_to_layer(out)


def draw_escapement_halo(
    base_frame,
    cx=21.0,
    cy=13.0,
    radius=7.5,
    rot_rad=0.0,
    brightness=1.0,
    roman_clock=False,
    orbit_gears=0,
):
    """
    Renders Zephyros's rotating brass escapement halo gear (and optional Ultimate glowing
    Roman-numeral clock ring + orbiting golden satellite gears) BEHIND the character's shoulders.
    Clamped safely inside [2..49] so halo teeth and clock rings never clip the top/left cell borders.
    """
    halo = np.zeros((52, 52, 4), dtype=np.uint8)
    if brightness <= 0.32:
        return base_frame

    def scale_col(col, b):
        b_clamped = max(0.62, b)
        return (
            int(min(255, col[0] * b_clamped)),
            int(min(255, col[1] * b_clamped)),
            int(min(255, col[2] * b_clamped)),
            col[3]
        )

    c_brass_hi = scale_col(GOLD_BRIGHT if roman_clock else BRASS_LIGHT, brightness)
    c_brass_mid = scale_col(BRASS_MID, brightness)
    c_brass_dark = scale_col(BRASS_DARK, brightness)
    c_cyan = scale_col(CYAN_BRIGHT if roman_clock else TEAL_BRIGHT, brightness)
    c_core = scale_col(GOLD_STAR, brightness)

    cx_safe = max(12.0, min(39.0, float(cx)))
    cy_safe = max(12.0, min(39.0, float(cy)))
    r_safe = min(float(radius), cy_safe - 3.5)

    # Outer escapement gear ring
    steps = 28
    step_stride = 2 if brightness < 0.65 else 1
    for i in range(0, steps, step_stride):
        a = (i / float(steps)) * 2.0 * math.pi + rot_rad
        set_px(halo, cx_safe + math.cos(a) * r_safe, cy_safe + math.sin(a) * r_safe, c_brass_mid if i % 2 else c_brass_hi)
        if i % 4 == 0:
            set_px(halo, cx_safe + math.cos(a) * (r_safe - 1.2), cy_safe + math.sin(a) * (r_safe - 1.2), c_cyan)

    # 8 rotating escapement gear teeth + 4 cardinal spokes
    for k in range(8):
        ta = rot_rad + k * (math.pi * 0.25)
        tx = cx_safe + math.cos(ta) * (r_safe + 1.2)
        ty = cy_safe + math.sin(ta) * (r_safe + 1.2)
        set_px(halo, tx, ty, c_core if k % 2 == 0 else c_brass_hi)
        if k % 2 == 0:
            draw_line_px(
                halo,
                cx_safe + math.cos(ta) * 2.5,
                cy_safe + math.sin(ta) * 2.5,
                cx_safe + math.cos(ta) * (r_safe - 1.0),
                cy_safe + math.sin(ta) * (r_safe - 1.0),
                c_brass_dark
            )

    # Optional Ultimate Grand Roman-Numeral Clock Ring behind the back (clamped inside y >= 2)
    if roman_clock:
        outer_r_x = min(r_safe + 4.2, cx_safe - 3.5)
        outer_r_y = min(r_safe + 3.6, cy_safe - 3.5)
        for s in range(40):
            a = (s / 40.0) * 2.0 * math.pi
            set_px(halo, cx_safe + math.cos(a) * outer_r_x, cy_safe + math.sin(a) * outer_r_y, c_cyan)
        for h_idx in range(12):
            ha = -math.pi * 0.5 + h_idx * (math.pi / 6.0)
            hx = cx_safe + math.cos(ha) * outer_r_x
            hy = cy_safe + math.sin(ha) * outer_r_y
            set_px(halo, hx, hy, WHITE_CORE if h_idx == 0 else GOLD_STAR)
            if h_idx % 3 == 0:
                set_px(
                    halo,
                    cx_safe + math.cos(ha) * (outer_r_x + 1.0),
                    max(2.0, cy_safe + math.sin(ha) * (outer_r_y + 1.0)),
                    GOLD_BRIGHT
                )

    # Optional orbiting golden satellite gears (Stage 2 & 3 of Ultimate)
    for g_i in range(orbit_gears):
        ga = -rot_rad * 1.8 + g_i * (2.0 * math.pi / max(1, orbit_gears))
        gx = max(4.0, min(47.0, cx_safe + math.cos(ga) * (r_safe + 5.5)))
        gy = max(4.0, min(47.0, cy_safe + math.sin(ga) * min(r_safe + 3.5, cy_safe - 4.5)))
        set_px(halo, gx, gy, CYAN_CORE)
        for d_ang in range(4):
            da = rot_rad * 3.0 + d_ang * (math.pi * 0.5)
            set_px(halo, gx + math.cos(da) * 1.8, gy + math.sin(da) * 1.8, GOLD_BRIGHT)
            set_px(halo, gx + math.cos(da + 0.78) * 1.3, gy + math.sin(da + 0.78) * 1.3, BRASS_MID)

    # Composite halo BEHIND base_frame
    return composite_over(halo, base_frame)


def solve_ik_elbow(sx, sy, hx, hy, L1=4.8, L2=4.6, bend_side=1.0):
    """
    2-Bone Inverse Kinematics solver returning the anatomical elbow joint (ex, ey)
    between shoulder (sx, sy) and hand (hx, hy).
    `bend_side = +1.0` bends the elbow naturally downward/back-left for a right-facing Chronomancer.
    """
    dx = float(hx - sx)
    dy = float(hy - sy)
    dist = max(0.8, math.hypot(dx, dy))
    max_reach = float(L1 + L2 - 0.15)
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


def draw_ik_chrono_arm(layer, sx, sy, hx, hy, L1=4.8, L2=4.6, bend_side=1.0, is_offhand=False):
    """
    Draws Zephyros's sculpted 2-bone IK clockwork sleeve & vambrace arm onto `layer`:
    - Rotating brass-and-teal clockwork shoulder pauldron at (sx, sy) (`BRASS_BRIGHT`, `BRASS_MID`, `COAT_TEAL`)
    - 3px-thick teal coat upper sleeve (`COAT_LIGHT`, `COAT_TEAL`, `COAT_DARK`) from (sx, sy) to (ex, ey)
    - Brass gear elbow joint at (ex, ey) (`BRASS_BRIGHT`, `BRASS_MID`)
    - 3px-thick brass-cuffed forearm vambrace (`BRASS_MID`, `COAT_TEAL`, `TIME_CYAN` rune dot) from (ex, ey) to (hx, hy)
    - 2x2 gloved/skin hand (`SKIN_LIGHT`, `BRASS_BRIGHT`) at (hx, hy)
    """
    ex, ey = solve_ik_elbow(sx, sy, hx, hy, L1=L1, L2=L2, bend_side=bend_side)

    c_sleeve_hi = COAT_TEAL if is_offhand else COAT_LIGHT
    c_sleeve_mid = COAT_DARK if is_offhand else COAT_TEAL
    c_sleeve_dark = TEAL_COAT_DEEP if is_offhand else COAT_DARK
    c_brass_hi = BRASS_MID if is_offhand else BRASS_BRIGHT
    c_brass_mid = BRASS_DARK if is_offhand else BRASS_MID

    # 1. 3px-thick Teal Coat Upper Sleeve from (sx, sy) to (ex, ey)
    u1x, u1y = ex - sx, ey - sy
    d1 = max(1.0, math.hypot(u1x, u1y))
    n1x, n1y = -u1y / d1, u1x / d1
    draw_line_px(layer, sx + n1x * 0.85, sy + n1y * 0.85, ex + n1x * 0.7, ey + n1y * 0.7, c_sleeve_hi)
    draw_line_px(layer, sx - n1x * 0.85, sy - n1y * 0.85, ex - n1x * 0.7, ey - n1y * 0.7, c_sleeve_dark)
    draw_line_px(layer, sx, sy, ex, ey, c_sleeve_mid)

    # 2. 3px-thick Brass-Cuffed Forearm Vambrace from (ex, ey) to (hx, hy) with TIME_CYAN rune dot
    u2x, u2y = hx - ex, hy - ey
    d2 = max(1.0, math.hypot(u2x, u2y))
    n2x, n2y = -u2y / d2, u2x / d2
    draw_line_px(layer, ex + n2x * 0.8, ey + n2y * 0.8, hx + n2x * 0.65, hy + n2y * 0.65, c_brass_mid)
    draw_line_px(layer, ex - n2x * 0.8, ey - n2y * 0.8, hx - n2x * 0.65, hy - n2y * 0.65, c_sleeve_dark)
    draw_line_px(layer, ex, ey, hx, hy, COAT_TEAL)
    # Glowing TIME_CYAN clockwork rune dot on forearm vambrace
    set_px(layer, (ex + hx) * 0.5, (ey + hy) * 0.5, TIME_CYAN)

    # 3. Rotating Brass-and-Teal Clockwork Shoulder Pauldron at (sx, sy)
    ux1, uy1 = u1x / d1, u1y / d1
    for p_step in (-1.2, 0.0, 1.2):
        px_s = sx + ux1 * 0.9 + n1x * p_step
        py_s = sy + uy1 * 0.9 + n1y * p_step
        set_px(layer, px_s, py_s, c_brass_hi if abs(p_step) > 0.5 else COAT_TEAL)
        set_px(layer, sx + n1x * p_step, sy + n1y * p_step, c_brass_mid)
    if not is_offhand:
        set_px(layer, sx, sy - 1, BRASS_BRIGHT)

    # 4. Brass Gear Elbow Joint at (ex, ey)
    set_px(layer, ex, ey, c_brass_hi)
    set_px(layer, ex + n1x * 0.7, ey + n1y * 0.7, c_brass_mid)

    # 5. 2x2 Gloved/Skin Hand at (hx, hy)
    set_px(layer, hx, hy, SKIN_LIGHT)
    set_px(layer, hx + 1, hy, SKIN_LIGHT if not is_offhand else SKIN_SHADOW)
    set_px(layer, hx, hy + 1, c_brass_hi)
    set_px(layer, hx - (u2x / d2) * 0.8, hy - (u2y / d2) * 0.8, BRASS_BRIGHT)


def draw_chrono_staff(
    base_frame,
    shoulder=(27, 15),
    grip=(32, 19),
    staff_tilt_deg=15.0,
    finial_spin=0.0,
    left_hand=None,
    conjure_mode='none',
    mode_progress=0.0,
    shield_center=None,
):
    """
    Renders EXACTLY ONE crisp articulated Chrono-Astrolabe Staff (`draw_chrono_staff`) per frame:
    - Full 2-Bone Inverse Kinematics Left Time-Gear Arm & Right Staff-Holding Arm (`draw_ik_chrono_arm`).
    - Auto-clamped `(gx, gy)` inside `[12..41, 10..40]` and auto-foreshortened `top_len` & `bot_len`
      so the Astrolabe Finial `(fcx, fcy)` stays inside `x in [7..43], y in [7..43]` (ZERO edge clipping!).
    - Bespoke Chronomancer spell constructs (`saw_gear`, `gear_launch`, `stasis_hourglass`,
      `rewind_shatter`, `doomsday_clock`, `escapement_shield`).
    """
    offhand_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    staff_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    right_arm_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    fx_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    # Staff direction vector: 0 deg = straight up (0, -1); +90 deg = horizontal right (+1, 0)
    rad = math.radians(staff_tilt_deg)
    ux = math.sin(rad)
    uy = -math.cos(rad)
    px = -uy
    py = ux

    sx = float(max(10.0, min(38.0, shoulder[0])))
    sy = float(max(9.0, min(36.0, shoulder[1])))
    gx = float(max(12.0, min(41.0, grip[0])))
    gy = float(max(10.0, min(40.0, grip[1])))

    # 1. Left Time-Gear IK Arm (ALWAYS animated across all rows; drawn behind staff shaft)
    if left_hand is None:
        lhx = sx - 2.0 + int((gx - sx) * 0.5)
        lhy = sy + 2.0 + int((gy - sy) * 0.4)
    else:
        lhx, lhy = float(left_hand[0]), float(left_hand[1])
    lhx = max(8.0, min(43.0, lhx))
    lhy = max(8.0, min(42.0, lhy))
    draw_ik_chrono_arm(
        offhand_layer,
        sx - 3.0,
        sy + 1.0,
        lhx,
        lhy,
        L1=4.4,
        L2=4.2,
        bend_side=1.0,
        is_offhand=True
    )

    # 2. Ornate Brass-and-Obsidian Chrono-Astrolabe Staff Shaft with Dynamic Foreshortening
    # Astrolabe finial center sits at `gx + ux * (top_len + 3.2), gy + uy * (top_len + 3.2)`.
    # Keep finial center strictly inside x in [7..43], y in [7..43] so ring_r = 3.2 + 1.2 never clips!
    max_finial_dist = 9.5 + 3.2
    if ux > 0.05:
        max_finial_dist = min(max_finial_dist, (43.0 - gx) / ux)
    elif ux < -0.05:
        max_finial_dist = min(max_finial_dist, (7.0 - gx) / ux)
    if uy > 0.05:
        max_finial_dist = min(max_finial_dist, (43.0 - gy) / uy)
    elif uy < -0.05:
        max_finial_dist = min(max_finial_dist, (7.0 - gy) / uy)
    max_finial_dist = max(5.2, max_finial_dist)
    top_len = max(2.2, max_finial_dist - 3.0)

    max_bot_len = 13.5
    if -ux > 0.05:
        max_bot_len = min(max_bot_len, (48.0 - gx) / (-ux))
    elif -ux < -0.05:
        max_bot_len = min(max_bot_len, (3.0 - gx) / (-ux))
    if -uy > 0.05:
        max_bot_len = min(max_bot_len, (48.0 - gy) / (-uy))
    elif -uy < -0.05:
        max_bot_len = min(max_bot_len, (3.0 - gy) / (-uy))
    bot_len = max(4.0, max_bot_len)

    bx0 = gx - ux * bot_len
    by0 = gy - uy * bot_len
    tx0 = gx + ux * top_len
    ty0 = gy + uy * top_len

    draw_line_px(staff_layer, bx0, by0, tx0, ty0, BRONZE_DEEP)
    draw_line_px(staff_layer, bx0 + px * 0.6, by0 + py * 0.6, tx0 + px * 0.6, ty0 + py * 0.6, BRASS_MID)
    # Brass rings along the shaft
    for r_frac in (-0.68, -0.32, 0.35, 0.75):
        r_dist = r_frac * (top_len if r_frac > 0 else bot_len)
        rx = gx + ux * r_dist
        ry = gy + uy * r_dist
        set_px(staff_layer, rx, ry, BRASS_LIGHT)
    # Bottom chrono-pendulum spike
    set_px(staff_layer, bx0, by0, GOLD_BRIGHT)
    set_px(staff_layer, bx0 + ux * 1.2, by0 + uy * 1.2, TEAL_BRIGHT)

    # 3. Spinning Turquoise & Brass Astrolabe Finial at Staff Head (clamped inside [7..43])
    fcx = max(7.0, min(43.0, tx0 + ux * 3.0))
    fcy = max(7.0, min(43.0, ty0 + uy * 3.0))
    finial_r = 3.2

    # Outer brass astrolabe ring + 4 rotating gear teeth
    draw_circle_px(staff_layer, fcx, fcy, finial_r, BRASS_LIGHT, steps=16)
    for k in range(4):
        ta = finial_spin + k * (math.pi * 0.5)
        set_px(
            staff_layer,
            fcx + math.cos(ta) * (finial_r + 1.1),
            fcy + math.sin(ta) * (finial_r + 1.1),
            GOLD_STAR if k % 2 == 0 else GOLD_BRIGHT
        )
        # Inner rotating turquoise astrolabe meridian
        set_px(
            staff_layer,
            fcx + math.cos(-ta * 1.5) * 1.6,
            fcy + math.sin(-ta * 1.5) * 1.6,
            TEAL_BRIGHT
        )

    # Glowing turquoise hourglass core inside the astrolabe finial
    set_px(staff_layer, fcx, fcy, WHITE_CORE)
    set_px(staff_layer, fcx, fcy - 1, CYAN_BRIGHT)
    set_px(staff_layer, fcx, fcy + 1, CYAN_BRIGHT)
    # Crescent cradle horns beneath the astrolabe ring
    set_px(staff_layer, tx0 + px * 2.0, ty0 + py * 2.0, GOLD_BRIGHT)
    set_px(staff_layer, tx0 - px * 2.0, ty0 - py * 2.0, GOLD_BRIGHT)

    # 4. Right Staff-Holding 2-Bone IK Arm (drawn OVER the staff shaft)
    bend_dir = -1.0 if (gy < sy - 2.5 and gx <= sx + 2.5) else 1.0
    draw_ik_chrono_arm(
        right_arm_layer,
        sx,
        sy,
        gx,
        gy,
        L1=4.8,
        L2=4.6,
        bend_side=bend_dir,
        is_offhand=False
    )

    # 5. Bespoke Chronomancer Spell & Projectile Constructs (all safely clamped inside [3..48])
    if conjure_mode == 'saw_gear':
        gcx = max(6.0, min(44.0, fcx + 4.2 + mode_progress * 1.8))
        gcy = max(6.0, min(44.0, fcy + 1.5))
        gr = 2.4 + mode_progress * 1.8
        draw_circle_px(fx_layer, gcx, gcy, gr, GOLD_BRIGHT, steps=16)
        draw_circle_px(fx_layer, gcx, gcy, max(1.0, gr - 1.2), TEAL_BRIGHT, steps=12)
        set_px(fx_layer, gcx, gcy, WHITE_CORE)
        for k in range(8):
            ga = finial_spin * 2.5 + k * (math.pi * 0.25)
            set_px(fx_layer, gcx + math.cos(ga) * (gr + 1.0), gcy + math.sin(ga) * (gr + 1.0), GOLD_STAR)

    elif conjure_mode == 'gear_launch':
        lcx = max(6.0, min(44.0, fcx + 2.8))
        lcy = max(6.0, min(44.0, fcy))
        set_px(fx_layer, lcx, lcy, WHITE_CORE)
        for d in range(1, 6):
            col = GOLD_STAR if d <= 2 else (CYAN_BRIGHT if d <= 4 else TEAL_MID)
            set_px(fx_layer, max(2.0, min(49.0, lcx + ux * d)), max(2.0, min(49.0, lcy + uy * d)), col)
            set_px(fx_layer, max(2.0, min(49.0, lcx + px * d * 0.8)), max(2.0, min(49.0, lcy + py * d * 0.8)), col)
            set_px(fx_layer, max(2.0, min(49.0, lcx - px * d * 0.8)), max(2.0, min(49.0, lcy - py * d * 0.8)), col)
        # Forward crescent time-wave
        for s in range(-5, 6):
            u_s = s / 5.0
            wx = max(3.0, min(48.0, lcx + 3.2 - u_s * u_s * 2.4 + mode_progress * 2.5))
            wy = max(3.0, min(48.0, lcy + s * 1.2))
            set_px(fx_layer, wx, wy, GOLD_BRIGHT if abs(s) <= 2 else CYAN_BRIGHT)
            set_px(fx_layer, wx - 1, wy, TEAL_BRIGHT)

    elif conjure_mode == 'stasis_hourglass':
        hcx = max(8.0, min(43.0, max(fcx + 4.2, 38.0)))
        hcy = max(12.0, min(28.0, fcy + 2.0))
        ring_r = 4.0 + math.sin(mode_progress * math.pi) * 1.4
        for s in range(20):
            a = (s / 20.0) * 2.0 * math.pi + finial_spin * 2.0
            rx = max(2.0, min(49.0, hcx + math.cos(a) * ring_r))
            ry = max(2.0, min(49.0, hcy + math.sin(a) * (ring_r * 0.55)))
            set_px(fx_layer, rx, ry, GOLD_STAR if s % 5 == 0 else CYAN_BRIGHT)
        for dx in range(-3, 4):
            set_px(fx_layer, hcx + dx, hcy - 4, GOLD_BRIGHT)
            set_px(fx_layer, hcx + dx, hcy + 4, GOLD_BRIGHT)
        for dy in (-3, -2, -1, 1, 2, 3):
            w = abs(dy)
            for dx in range(-w, w + 1):
                col = CYAN_CORE if dx == 0 else (CYAN_BRIGHT if abs(dx) < w else BRASS_LIGHT)
                set_px(fx_layer, hcx + dx, hcy + dy, col)
        set_px(fx_layer, hcx, hcy, WHITE_CORE)

    elif conjure_mode == 'rewind_shatter':
        scx = max(8.0, min(43.0, fcx + 2.5))
        scy = max(10.0, min(38.0, fcy + 1.0))
        burst_r = 2.8 + mode_progress * 6.5
        for k in range(10):
            sa = finial_spin + k * (2.0 * math.pi / 10.0)
            sx_pt = max(2.0, min(49.0, scx + math.cos(sa) * burst_r))
            sy_pt = max(2.0, min(49.0, scy + math.sin(sa) * burst_r))
            set_px(fx_layer, sx_pt, sy_pt, GOLD_STAR if k % 2 == 0 else CYAN_BRIGHT)
            set_px(
                fx_layer,
                max(2.0, min(49.0, scx + math.cos(sa) * (burst_r * 0.55))),
                max(2.0, min(49.0, scy + math.sin(sa) * (burst_r * 0.55))),
                TEAL_BRIGHT
            )
        if mode_progress < 0.55:
            set_px(fx_layer, scx, scy, WHITE_CORE)

    elif conjure_mode == 'doomsday_clock':
        # Clamp doomsday_clock center cy >= 10 so radius r <= 7 stays at y >= 3!
        dcx = max(10.0, min(42.0, fcx))
        dcy = max(10.0, min(40.0, fcy))
        set_px(fx_layer, dcx, dcy - 5, GOLD_STAR)
        set_px(fx_layer, dcx, dcy - 6, WHITE_CORE)
        for d in range(1, 6):
            ha = -math.pi * 0.5 + (1.0 - mode_progress) * 1.8
            set_px(fx_layer, dcx + math.cos(ha) * d, max(3.0, dcy + math.sin(ha) * d), GOLD_STAR if d < 4 else WHITE_CORE)
            ma = -math.pi * 0.5 - (1.0 - mode_progress) * 3.4
            set_px(fx_layer, dcx + math.cos(ma) * (d + 1), max(3.0, dcy + math.sin(ma) * (d + 1)), CYAN_BRIGHT)

    # 6. Optional Spinning Brass-and-Cyan Escapement Shield Dial (Row 7 CROUCH)
    if shield_center is not None:
        scx = max(10.0, min(41.0, float(shield_center[0])))
        scy = max(10.0, min(41.0, float(shield_center[1])))
        sr = 5.8
        draw_circle_px(fx_layer, scx, scy, sr, BRASS_LIGHT, steps=24)
        draw_circle_px(fx_layer, scx, scy, sr - 1.5, CYAN_BRIGHT, steps=20)
        set_px(fx_layer, scx, scy, WHITE_CORE)
        for k in range(8):
            ta = finial_spin * 2.0 + k * (math.pi * 0.25)
            set_px(
                fx_layer,
                scx + math.cos(ta) * (sr + 1.0),
                scy + math.sin(ta) * (sr + 1.0),
                GOLD_STAR if k % 2 == 0 else TEAL_BRIGHT
            )
            if k % 2 == 0:
                draw_line_px(
                    fx_layer,
                    scx + math.cos(ta) * 1.5,
                    scy + math.sin(ta) * 1.5,
                    scx + math.cos(ta) * (sr - 1.5),
                    scy + math.sin(ta) * (sr - 1.5),
                    GOLD_BRIGHT
                )

    out = composite_over(base_frame, offhand_layer)
    out = composite_over(out, staff_layer)
    out = composite_over(out, right_arm_layer)
    out = composite_over(out, fx_layer)
    return out


def render_walk_legs(tpl, f):
    """
    Renders a fluid, anatomical 30-frame 2-step Chronomancer stride cycle (f = 0..29, F00..F14 step A, F15..F29 step B):
    1. Backmost Layer: Trailing teal-and-brass clockwork coat tails (bridged solidly to the waist).
    2. Far Leg Layer: Sculpted clockwork trousers & brass-trimmed boot (shaded 0.78x for clear depth separation).
    3. Split Clockwork Coat Front Lapel/Tabard: Sweeps naturally with the leading thigh at y = 30..37.
    4. Near Leg Layer: Full-brightness sculpted leg & brass-trimmed boot articulating cleanly beneath the coat.
    5. Upper Torso & Head: Smooth 2-step vertical bob and +1px natural forward posture down to y=36.
    """
    phase = (f / 30.0) * 2.0 * math.pi
    bob_y = int(round(math.cos(phase * 2.0) * 1.0))

    stand = tpl['stand'].copy()
    coat_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    # 1. Extract trailing clockwork coat tails (x <= 18, y = 18..46) onto backmost layer
    for y in range(18, 46):
        ny = y + bob_y
        if not (0 <= ny < 52):
            continue
        u = (y - 18) / 28.0
        wave_dx = int(round(-u * 2.2 + math.sin(phase - u * 3.2) * (1.3 * u)))
        wave_dy = int(round(math.cos(phase - u * 2.6) * (0.7 * u)))
        for x in range(1, 19):
            if stand[y, x, 3] == 0:
                continue
            if y >= 34 and x > 14:
                continue
            cy = max(18, min(48, ny + wave_dy))
            cx = max(2, min(21, x + wave_dx))
            coat_layer[cy, cx] = stand[y, x]
            if x >= 12 and y <= 35:
                coat_layer[ny, x] = stand[y, x]
                if x + 1 < 21:
                    coat_layer[ny, x + 1] = stand[y, x]

    # 2. Extract Upper Torso & Coat down to y = 36 (x >= 14) with +1px forward lean
    for y in range(0, 36):
        ny = y + bob_y
        if not (0 <= ny < 52):
            continue
        lean_dx = 1 if y <= 26 else 0
        for x in range(14, 34):
            if stand[y, x, 3] > 0:
                torso_layer[ny, min(50, x + lean_dx)] = stand[y, x]

    hip_x = 24.5
    hip_y = 31.5 + bob_y

    def build_striding_leg(boot_patch, orig_cx, swing_phase, is_far_leg=False):
        layer = np.zeros((52, 52, 4), dtype=np.uint8)
        s_val = math.sin(swing_phase)
        c_val = math.cos(swing_phase)

        knee_lift = max(0.0, c_val)
        knee_x = hip_x + s_val * 4.4 + knee_lift * 2.0
        knee_y = hip_y + 4.8 - knee_lift * 1.7

        foot_target_x = 25.0 + s_val * 6.4 - knee_lift * 2.0
        foot_lift_dy = bob_y - int(round(knee_lift * 2.8))

        boot_rot_deg = s_val * 19.0 - knee_lift * 20.0
        pil_boot = Image.fromarray(boot_patch, mode='RGBA')
        rot_boot = np.array(
            pil_boot.rotate(boot_rot_deg, resample=Image.NEAREST, center=(orig_cx, 40.0)),
            dtype=np.uint8
        )

        dx_boot = int(round(foot_target_x - orig_cx))
        for y in range(36, 52):
            for x in range(4, 50):
                if rot_boot[y, x, 3] > 0:
                    ny = min(49, max(35, y + foot_lift_dy))
                    nx = min(49, max(6, x + dx_boot))
                    px_col = rot_boot[y, x].copy()
                    if is_far_leg:
                        px_col[0] = int(px_col[0] * 0.78)
                        px_col[1] = int(px_col[1] * 0.78)
                        px_col[2] = int(px_col[2] * 0.82)
                    layer[ny, nx] = px_col

        ank_x = foot_target_x + math.sin(math.radians(boot_rot_deg)) * 1.4
        ank_y = 40.5 + foot_lift_dy

        if is_far_leg:
            c_dark = TEAL_COAT_DEEP
            c_mid = TEAL_COAT_DARK
            c_hi = TEAL_COAT_MID
            c_greave = LEATHER_DARK
            c_brass = BRASS_DARK
        else:
            c_dark = TEAL_COAT_DARK
            c_mid = TEAL_COAT_MID
            c_hi = TEAL_COAT_LIGHT
            c_greave = LEATHER_BOOT
            c_brass = BRASS_LIGHT

        for off_x, col in [(-1.8, c_dark), (-0.8, c_mid), (0.2, c_hi), (1.2, c_mid), (2.0, c_dark)]:
            draw_line_px(layer, hip_x + off_x, hip_y, knee_x + off_x * 0.85, knee_y, col)

        for off_x, col in [(-1.4, c_dark), (-0.4, c_greave), (0.6, c_greave), (1.4, c_dark)]:
            draw_line_px(layer, knee_x + off_x, knee_y, ank_x + off_x * 0.85, ank_y, col)

        # Brass clockwork knee-buckle highlight
        set_px(layer, knee_x, knee_y, c_brass)
        set_px(layer, knee_x + 1, knee_y, c_brass)
        return layer

    far_leg = build_striding_leg(tpl['leg_back'], 18.5, phase + math.pi, is_far_leg=True)
    near_leg = build_striding_leg(tpl['leg_front'], 28.0, phase, is_far_leg=False)

    # Split teal-and-brass coat front tasset at y = 31..37
    tasset_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    stride_open = abs(math.sin(phase))
    flap_dx = math.sin(phase) * 2.0
    for off_x, col in [
        (-2.5, TEAL_COAT_DARK),
        (-1.5, TEAL_COAT_MID),
        (-0.5, TEAL_COAT_LIGHT),
        (0.5, TEAL_COAT_MID),
        (1.5, BRASS_LIGHT),
    ]:
        draw_line_px(
            tasset_layer,
            hip_x + off_x,
            hip_y - 1.0,
            hip_x + off_x + flap_dx + stride_open * 1.1,
            hip_y + 4.5,
            col
        )

    out = composite_over(coat_layer, far_leg)
    out = composite_over(out, tasset_layer)
    out = composite_over(out, near_leg)
    out = composite_over(out, torso_layer)

    # Fill any transparent hip/coat seam pixels at y=29..35, x=20..31
    for y in range(29, 36):
        for x in range(20, 31):
            if out[y, x, 3] == 0:
                if out[y - 1, x, 3] > 0 or out[y, x - 1, 3] > 0:
                    out[y, x] = COAT_TEAL if (x + y) % 2 == 0 else COAT_DARK

    return fill_layer_pinholes(out)


def make_crouch_body(tpl, crouch_depth):
    """
    Constructs a low-profile Temporal Calibration kneel/crouch with `crouch_depth` in [1..7] logical pixels:
    - Uses `kneel1` bent legs anchored at the bottom (y=36..50) when crouch_depth >= 5, or compressed
      bent-knee standing legs when crouch_depth in 1..4.
    - Lowers the upper body (`stand_upper`) smoothly by `crouch_depth` pixels (up to 7px lower silhouette!).
    """
    canvas = np.zeros((52, 52, 4), dtype=np.uint8)
    if crouch_depth >= 5:
        canvas[36:50, 6:34] = tpl['kneel1'][36:50, 6:34]
        upper = tpl['stand_upper']
        for y in range(0, 36):
            ny = y + crouch_depth
            if 0 <= ny < 49:
                for x in range(0, 52):
                    if upper[y, x, 3] > 0:
                        canvas[ny, x] = upper[y, x]
    else:
        canvas[38:50, :] = tpl['stand'][38:50, :]
        upper = tpl['stand_upper']
        for y in range(0, 38):
            ny = y + crouch_depth
            if 0 <= ny < 49:
                for x in range(0, 52):
                    if upper[y, x, 3] > 0:
                        canvas[ny, x] = upper[y, x]

    # Fill any transparent hip/coat seam pixels at y=29..35, x=20..31
    for y in range(29, 36):
        for x in range(20, 31):
            if canvas[y, x, 3] == 0 and canvas[y - 1, x, 3] > 0 and canvas[y + 1, x, 3] > 0:
                canvas[y, x] = COAT_TEAL if (x + y) % 2 == 0 else COAT_DARK

    canvas = fill_layer_pinholes(canvas)
    return add_outline_to_layer(canvas)


def make_jump_body(tpl, jump_dy, tuck_amount, torso_lean_dx=0, draw_boot_rings=False, phase=0.0):
    """
    Constructs a full-body aerial jumping Chronomancer pose in back-to-front anatomical order:
    - Every frame shows the Chronomancer's full head, silver hair/crown, teal-and-brass coat,
      articulated boots, and Chrono-Staff — NEVER a round ball!
    - Optional glowing cyan clock-rings beneath the boots during aerial ascent/hover.
    """
    stand = tpl['stand'].copy()
    torso_dy = max(0, jump_dy)

    coat_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    # 1. Billowing Aerial Clockwork Coat Tails (x <= 18, y = 18..45)
    coat_lift = int(round(max(0.0, tuck_amount) * 2.5))
    for y in range(18, 46):
        for x in range(1, 19):
            if stand[y, x, 3] == 0:
                continue
            if y >= 34 and x > 14:
                continue
            u = (y - 18) / 27.0
            cx = max(2, min(21, x - int(round(u * 2.6 * max(0.2, tuck_amount)))))
            cy = max(14, min(48, y + torso_dy - int(round(u * coat_lift))))
            coat_layer[cy, cx] = stand[y, x]
            if x >= 12 and y <= 34:
                coat_layer[min(49, y + torso_dy), x] = stand[y, x]

    # 2. Upper Torso & Coat down to y = 36 (x >= 14)
    for y in range(0, 36):
        ny = y + torso_dy
        if not (0 <= ny < 52):
            continue
        dx = torso_lean_dx if y <= 24 else 0
        for x in range(14, 34):
            if stand[y, x, 3] > 0:
                torso_layer[ny, max(2, min(50, x + dx))] = stand[y, x]

    hip_x = 24.5
    hip_y = 31.5 + torso_dy

    def build_aerial_leg(boot_patch, orig_cx, knee_dx, knee_dy, foot_dx, foot_dy, boot_rot_deg, is_far_leg=False):
        layer = np.zeros((52, 52, 4), dtype=np.uint8)
        pil_boot = Image.fromarray(boot_patch, mode='RGBA')
        rot_boot = np.array(
            pil_boot.rotate(boot_rot_deg, resample=Image.NEAREST, center=(orig_cx, 40.0)),
            dtype=np.uint8
        )
        for y in range(34, 52):
            for x in range(4, 50):
                if rot_boot[y, x, 3] > 0:
                    ny = max(28, min(48, y + int(round(foot_dy))))
                    nx = max(4, min(49, x + int(round(foot_dx))))
                    px_col = rot_boot[y, x].copy()
                    if is_far_leg:
                        px_col[0] = int(px_col[0] * 0.78)
                        px_col[1] = int(px_col[1] * 0.78)
                        px_col[2] = int(px_col[2] * 0.82)
                    layer[ny, nx] = px_col

        kx = hip_x + knee_dx
        ky = hip_y + knee_dy
        ax = orig_cx + foot_dx
        ay = 40.5 + foot_dy

        if is_far_leg:
            c_dark, c_mid, c_hi, c_greave, c_brass = TEAL_COAT_DEEP, TEAL_COAT_DARK, TEAL_COAT_MID, LEATHER_DARK, BRASS_DARK
        else:
            c_dark, c_mid, c_hi, c_greave, c_brass = TEAL_COAT_DARK, TEAL_COAT_MID, TEAL_COAT_LIGHT, LEATHER_BOOT, BRASS_LIGHT

        for off_x, col in [(-1.6, c_dark), (-0.6, c_mid), (0.4, c_hi), (1.4, c_dark)]:
            draw_line_px(layer, hip_x + off_x, hip_y, kx + off_x * 0.85, ky, col)
        for off_x, col in [(-1.2, c_dark), (0.0, c_greave), (1.2, c_dark)]:
            draw_line_px(layer, kx + off_x, ky, ax + off_x * 0.85, ay, col)
        set_px(layer, kx, ky, c_brass)
        set_px(layer, kx + 1, ky, c_brass)
        return layer

    t = max(0.0, tuck_amount)
    far_leg = build_aerial_leg(
        tpl['leg_back'],
        18.5,
        knee_dx=-3.0 * t - 1.0,
        knee_dy=4.2 - 1.2 * t,
        foot_dx=-3.5 * t,
        foot_dy=torso_dy - 3.0 * t,
        boot_rot_deg=-22.0 * t,
        is_far_leg=True
    )
    near_leg = build_aerial_leg(
        tpl['leg_front'],
        28.0,
        knee_dx=4.2 * t + 1.0,
        knee_dy=3.2 - 2.2 * t,
        foot_dx=1.2 * t,
        foot_dy=torso_dy - 4.4 * t,
        boot_rot_deg=-20.0 * t,
        is_far_leg=False
    )

    tasset_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    for off_x, col in [(-2.0, TEAL_COAT_DARK), (-1.0, TEAL_COAT_MID), (0.0, TEAL_COAT_LIGHT), (1.0, BRASS_LIGHT)]:
        draw_line_px(tasset_layer, hip_x + off_x, hip_y - 1, hip_x + off_x + 1.4 * t, hip_y + 4.0 - 1.0 * t, col)

    out = composite_over(coat_layer, far_leg)
    out = composite_over(out, tasset_layer)
    out = composite_over(out, near_leg)
    out = composite_over(out, torso_layer)

    # Fill any transparent hip/coat seam pixels at y=29..35, x=20..31
    for y in range(29, 36):
        for x in range(20, 31):
            if out[y, x, 3] == 0:
                if out[y - 1, x, 3] > 0 or out[y, x - 1, 3] > 0:
                    out[y, x] = COAT_TEAL if (x + y) % 2 == 0 else COAT_DARK

    out = fill_layer_pinholes(out)

    # Glowing cyan-and-gold clock-rings beneath the boots during aerial ascent/hover
    if draw_boot_rings:
        ring_y = 47
        ring_cx = 24
        for s in range(16):
            a = (s / 16.0) * 2.0 * math.pi + phase * 2.0
            rx = ring_cx + math.cos(a) * 8.5
            ry = ring_y + math.sin(a) * 1.8
            set_px(out, rx, ry, GOLD_STAR if s % 4 == 0 else CYAN_BRIGHT)

    return out


def build_row0_idle(tpl):
    """
    Row 0 (`IDLE`, 30 frames):
    Smooth breathing, swaying teal-and-gold coat tails (F00..F29), rotating brass escapement
    halo gear behind the shoulders, and a spinning turquoise astrolabe finial on the staff.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        base = tpl['stand'].copy()

        breathe = -1 if 8 <= f <= 19 else 0
        if breathe == -1:
            upper = base[10:30, 14:38].copy()
            head_slice = base[2:10, 14:38].copy()
            base[2:30, 14:38] = 0
            base[1:9, 14:38] = head_slice
            base[9:29, 14:38] = upper
            # Duplicate row 29 so shifting up by 1px NEVER leaves a transparent horizontal slit at the waist!
            base[29, 14:38] = upper[19, :]
            base = fill_layer_pinholes(base)

        base = apply_coat_wave(base, phase, amplitude=1.5, vertical_flutter=0.6)
        base = draw_escapement_halo(base, cx=20.0, cy=13.0 + breathe, radius=7.2, rot_rad=phase)

        tilt_deg = 12.0 + math.sin(phase) * 3.5
        grip_x = 32 + int(round(math.sin(phase) * 1.0))
        grip_y = 19 + breathe + (1 if f in (23, 24, 25) else 0)
        frame = draw_chrono_staff(
            base,
            shoulder=(27, 15 + breathe),
            grip=(grip_x, grip_y),
            staff_tilt_deg=tilt_deg,
            finial_spin=phase * 2.0,
            conjure_mode='none'
        )
        frames.append(frame)
    return frames


def build_row1_walk(tpl):
    """
    Row 1 (`WALK`, 30 frames):
    Anatomical 30fps stride (F00..F14 step A, F15..F29 step B) with back-to-front brass-trimmed boots
    articulating beneath the clockwork coat, natural torso lean, and counter-swinging Chrono-Staff.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        bob_y = int(round(math.cos(phase * 2.0) * 1.0))
        body = render_walk_legs(tpl, f)
        body = draw_escapement_halo(body, cx=20.5, cy=13.0 + bob_y, radius=7.0, rot_rad=phase)

        # Wide counter-swinging Chrono-Staff & natural left hand swing
        staff_tilt = 18.0 - math.sin(phase) * 12.0
        grip_x = int(round(32.0 - math.sin(phase) * 3.8))
        grip_y = int(round(19.5 + bob_y + math.cos(phase) * 1.6))
        lh_x = int(round(25.0 + math.sin(phase) * 3.8))
        lh_y = int(round(20.0 + bob_y - math.sin(phase) * 1.4))

        frame = draw_chrono_staff(
            body,
            shoulder=(28, 15 + bob_y),
            grip=(grip_x, grip_y),
            staff_tilt_deg=staff_tilt,
            finial_spin=phase * 2.0,
            left_hand=(lh_x, lh_y),
            conjure_mode='none'
        )
        frames.append(frame)
    return frames


def build_row2_auto_attack(tpl):
    """
    Row 2 (`AUTO_ATTACK`, 30 frames):
    30fps Clock-Gear Launch with wide 2-Bone IK arm travel:
    - F00..F09: High windup from (31, 19) to (27, 15) while spinning up a golden saw-gear
    - F10..F18: Sharp forward cast sweep from (27, 15) to (36, 22) launching the gear with turquoise time-sparks
    - F19..F29: Follow-through dip to (30, 26) and smooth recovery to (31, 19)
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        base = (tpl['aim_h'] if 8 <= f <= 20 else tpl['stand']).copy()

        # Subtle wind-back lean on F03..F08 and forward cast lunge on F10..F15
        if 3 <= f <= 8:
            base = shift_layer(base, -1, 0)
        elif 10 <= f <= 15:
            base = shift_layer(base, 1, 0)

        base = apply_coat_wave(base, phase * 1.5, amplitude=1.8 if 9 <= f <= 18 else 1.4, vertical_flutter=0.6)
        base = draw_escapement_halo(base, cx=20.0, cy=13.0, radius=7.4, rot_rad=phase * 2.0)

        if f <= 9:
            u = f / 9.0
            tilt_deg = 12.0 - u * 30.0  # Winds staff back from +12 deg to -18 deg
            gx = int(round(31.0 * (1.0 - u) + 27.0 * u))
            gy = int(round(19.0 * (1.0 - u) + 15.0 * u))
            frame = draw_chrono_staff(
                base,
                shoulder=(26, 15),
                grip=(gx, gy),
                staff_tilt_deg=tilt_deg,
                finial_spin=phase * 3.0,
                left_hand=(int(round(29.0 + u * 6.0)), int(round(18.0 - u * 3.0))),
                conjure_mode='saw_gear',
                mode_progress=u
            )
        elif f <= 18:
            u = (f - 10) / 8.0
            u_thrust = min(1.0, (f - 10) / 5.0)
            tilt_deg = -10.0 * (1.0 - u_thrust) + (38.0 + math.sin(u * math.pi) * 8.0) * u_thrust
            gx = int(round(27.0 * (1.0 - u_thrust) + 36.0 * u_thrust))
            gy = int(round(15.0 * (1.0 - u_thrust) + 22.0 * u_thrust))
            frame = draw_chrono_staff(
                base,
                shoulder=(28, 15),
                grip=(gx, gy),
                staff_tilt_deg=tilt_deg,
                finial_spin=phase * 4.0,
                left_hand=(int(round(33.0 + u_thrust * 3.0)), int(round(15.0 + u_thrust * 3.0))),
                conjure_mode='gear_launch' if f <= 15 else 'none',
                mode_progress=u
            )
        else:
            u = (f - 19) / 10.0
            # Follow-through dip through (30, 26) at u=0.4 then back to (31, 19)
            if u <= 0.45:
                w = u / 0.45
                gx = int(round(36.0 * (1.0 - w) + 30.0 * w))
                gy = int(round(22.0 * (1.0 - w) + 26.0 * w))
            else:
                w = (u - 0.45) / 0.55
                gx = int(round(30.0 * (1.0 - w) + 31.0 * w))
                gy = int(round(26.0 * (1.0 - w) + 19.0 * w))
            tilt_deg = 36.0 * (1.0 - u) + 12.0 * u
            frame = draw_chrono_staff(
                base,
                shoulder=(27, 15),
                grip=(gx, gy),
                staff_tilt_deg=tilt_deg,
                finial_spin=phase * 2.0,
                conjure_mode='none'
            )
        frames.append(frame)
    return frames


def build_row3_skill(tpl):
    """
    Row 3 (`SKILL` - Temporal Stasis Hourglass & Rewind Shatter, 30 frames):
    - Phase 1 (F00..F14): Raises the Chrono-Staff to (27, 15) and left hand forward to conjure the
      Stasis Hourglass with swirling cyan clockwork rings.
    - Phase 2 (F15..F29): Snaps the staff downward to (36, 20) (F15..F22) to trigger the Temporal Rewind Shatter
      and settles back to stance (F23..F29).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        base = (tpl['aim_h'] if 2 <= f <= 23 else tpl['stand']).copy()
        base = apply_coat_wave(base, phase * 2.0, amplitude=2.0, vertical_flutter=0.8)
        base = draw_escapement_halo(base, cx=20.0, cy=13.0, radius=7.6, rot_rad=phase * 2.0)

        if f <= 14:
            u = f / 14.0
            # Raises staff high & back toward (27, 15) while left hand projects the Stasis Hourglass
            tilt_deg = 14.0 * (1.0 - u) - 4.0 * u
            gx = int(round(32.0 * (1.0 - u) + 27.0 * u))
            gy = int(round(19.0 * (1.0 - u) + 15.0 * u))
            lh = (int(round(31.0 + u * 6.0)), int(round(17.0 - u * 3.0)))
            frame = draw_chrono_staff(
                base,
                shoulder=(27, 15),
                grip=(gx, gy),
                staff_tilt_deg=tilt_deg,
                finial_spin=phase * 3.0,
                left_hand=lh,
                conjure_mode='stasis_hourglass',
                mode_progress=u
            )
        elif f <= 22:
            u = (f - 15) / 7.0
            u_snap = min(1.0, u * 1.6)
            # Snaps the Chrono-Staff forward & downward from (27, 15) to (36, 20) (+48 deg) to shatter the Stasis Hourglass!
            tilt_deg = -4.0 * (1.0 - u_snap) + 48.0 * u_snap
            gx = int(round(27.0 * (1.0 - u_snap) + 36.0 * u_snap))
            gy = int(round(15.0 * (1.0 - u_snap) + 20.0 * u_snap))
            frame = draw_chrono_staff(
                base,
                shoulder=(28, 15),
                grip=(gx, gy),
                staff_tilt_deg=tilt_deg,
                finial_spin=-phase * 4.0,
                left_hand=(int(round(35.0 - u_snap * 4.0)), int(round(15.0 + u_snap * 4.0))),
                conjure_mode='rewind_shatter',
                mode_progress=u
            )
        else:
            u = (f - 23) / 6.0
            tilt_deg = 48.0 * (1.0 - u) + 12.0 * u
            frame = draw_chrono_staff(
                base,
                shoulder=(27, 15),
                grip=(int(round(36.0 * (1.0 - u) + 32.0 * u)), int(round(20.0 * (1.0 - u) + 19.0 * u))),
                staff_tilt_deg=tilt_deg,
                finial_spin=phase * 2.0,
                conjure_mode='none'
            )
        frames.append(frame)
    return frames


def build_row4_ultimate(tpl):
    """
    Row 4 (`ULTIMATE` - Doomsday Clock: Midnight Paradox, 30 frames):
    - Stage 1 (F00..F10): Ascends slightly, hoisting Chrono-Staff overhead to (28, 13)
      as a glowing Roman-numeral clock ring forms behind the back.
    - Stage 2 (F11..F20): Sweeps both hands like clock hands approaching XII (F11..F20)
      surrounded by orbiting golden gears.
    - Stage 3 (F21..F29): Grand sweep of the Chrono-Staff forward/down to (36, 22) at the stroke of Midnight (F21..F29)
      to detonate the Doomsday Paradox.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi

        if f <= 10:
            u = f / 10.0
            tuck = u * 0.45
            body = make_jump_body(tpl, 0, tuck_amount=tuck, draw_boot_rings=(f >= 3), phase=phase)
            body = apply_coat_wave(body, phase * 2.0, amplitude=2.1, vertical_flutter=0.9)
            body = draw_escapement_halo(
                body, cx=21.0, cy=13.0, radius=7.6, rot_rad=phase * 2.0, roman_clock=True, orbit_gears=1 if f >= 6 else 0
            )
            gx = int(round(32.0 * (1.0 - u) + 28.0 * u))
            gy = int(round(19.0 * (1.0 - u) + 13.0 * u))
            frame = draw_chrono_staff(
                body,
                shoulder=(27, 14),
                grip=(gx, gy),
                staff_tilt_deg=12.0 * (1.0 - u) - 2.0 * u,
                finial_spin=phase * 3.0,
                left_hand=(int(round(22.0 - u * 5.0)), int(round(17.0 - u * 4.0))),
                conjure_mode='doomsday_clock',
                mode_progress=u * 0.5
            )
        elif f <= 20:
            u = (f - 11) / 9.0
            body = make_jump_body(tpl, 0, tuck_amount=0.45, draw_boot_rings=True, phase=phase)
            body = apply_coat_wave(body, phase * 2.5, amplitude=2.3, vertical_flutter=1.0)
            body = draw_escapement_halo(
                body, cx=21.0, cy=13.0, radius=7.8, rot_rad=-phase * 3.0, roman_clock=True, orbit_gears=3
            )
            # Sweeps both hands upward like clock hands approaching XII!
            hand_ang = -math.pi * 0.1 - u * (math.pi * 0.4)
            lh_x = int(round(24.0 + math.cos(hand_ang + math.pi * 0.6) * 7.0))
            lh_y = int(round(14.0 + math.sin(hand_ang + math.pi * 0.6) * 5.0))
            frame = draw_chrono_staff(
                body,
                shoulder=(27, 14),
                grip=(int(round(28.0 + u * 2.0)), int(round(13.0 - u * 1.0))),
                staff_tilt_deg=-4.0 + u * 6.0,
                finial_spin=phase * 4.0,
                left_hand=(lh_x, lh_y),
                conjure_mode='doomsday_clock',
                mode_progress=0.5 + u * 0.5
            )
        else:
            u = (f - 21) / 8.0
            u_sweep = min(1.0, u * 1.6)
            tuck = max(0.0, 0.45 * (1.0 - u))
            body = make_jump_body(tpl, 0, tuck_amount=tuck, torso_lean_dx=1 if u < 0.6 else 0, draw_boot_rings=(u < 0.6), phase=phase)
            body = apply_coat_wave(body, phase * 2.0, amplitude=2.2, vertical_flutter=0.9)
            body = draw_escapement_halo(
                body, cx=21.0, cy=13.0, radius=7.8, rot_rad=phase * 4.0, roman_clock=(u < 0.7), orbit_gears=2 if u < 0.5 else 0
            )
            # Grand sweep from (28, 13) down-forward to (36, 22) at Midnight (F21..F25), then settles (F26..F29)
            if u <= 0.55:
                w = u / 0.55
                gx = int(round(28.0 * (1.0 - w) + 36.0 * w))
                gy = int(round(13.0 * (1.0 - w) + 22.0 * w))
                tilt_deg = 2.0 * (1.0 - w) + 46.0 * w
            else:
                w = (u - 0.55) / 0.45
                gx = int(round(36.0 * (1.0 - w) + 32.0 * w))
                gy = int(round(22.0 * (1.0 - w) + 19.0 * w))
                tilt_deg = 46.0 * (1.0 - w) + 14.0 * w
            frame = draw_chrono_staff(
                body,
                shoulder=(28, 15),
                grip=(gx, gy),
                staff_tilt_deg=tilt_deg,
                finial_spin=phase * 3.0,
                left_hand=(int(round(35.0 - u_sweep * 3.0)), int(round(15.0 + u_sweep * 4.0))) if u < 0.6 else None,
                conjure_mode='gear_launch' if u < 0.55 else 'none',
                mode_progress=u
            )
        frames.append(frame)
    return frames


def build_row5_death(tpl):
    """
    Row 5 (`DEATH` & `HURT`, 30 frames):
    - F00..F06: Hit-stagger recoil (`HURT` uses F00..F05).
    - F07..F17: Drops to knees as the brass halo gears wind down and dim.
    - F18..F29: Collapses horizontally onto the ground (y=38..46) with the Chrono-Staff
      resting flat beside the body (ZERO floating upright staff!).
    """
    frames = []
    for f in range(30):
        if f <= 6:
            u = f / 6.0
            dx = -int(round(math.sin(u * math.pi * 0.75) * 2.0))
            dy = int(round(u * 2.0))
            base = shift_layer(tpl['stand'], dx, dy)
            base = apply_coat_wave(base, u * math.pi, amplitude=1.6, vertical_flutter=0.5)
            base = draw_escapement_halo(base, cx=20.0 + dx, cy=13.0 + dy, radius=7.0, rot_rad=-u * 1.5, brightness=1.0 - u * 0.25)
            frame = draw_chrono_staff(
                base,
                shoulder=(27 + dx, 15 + dy),
                grip=(31 + dx - int(round(u * 2.0)), 19 + dy + int(round(u * 3.0))),
                staff_tilt_deg=16.0 + u * 24.0,
                finial_spin=-u * 2.0
            )
            frames.append(frame)

        elif f <= 17:
            u = (f - 7) / 10.0
            base = (tpl['kneel1'] if f <= 12 else tpl['kneel2']).copy()
            head_bow = 1 if f >= 14 else 0
            if head_bow == 1:
                # Shift entire upper head+torso (y=2..28, x=14..42) down by 1px and keep row 8 filled cleanly
                upper_slice = base[2:28, 14:42].copy()
                row8_backup = base[8, 14:42].copy()
                base[2:28, 14:42] = 0
                base[2 + head_bow:28 + head_bow, 14:42] = upper_slice
                for x_c in range(14, 42):
                    if base[8, x_c, 3] == 0 and row8_backup[x_c - 14, 3] > 0 and base[9, x_c, 3] > 0:
                        base[8, x_c] = row8_backup[x_c - 14]
                base = fill_layer_pinholes(base)
            base = apply_coat_wave(base, u * math.pi, amplitude=1.0, vertical_flutter=0.3)
            halo_b = max(0.0, 0.70 * (1.0 - u))
            base = draw_escapement_halo(base, cx=22.0, cy=19.0, radius=6.5, rot_rad=-1.5 - u * 1.2, brightness=halo_b)

            # Staff tilts progressively toward the ground as Zephyros kneels
            frame = draw_chrono_staff(
                base,
                shoulder=(27, 22 + head_bow),
                grip=(31 + int(round(u * 3.0)), 26 + int(round(u * 5.0))),
                staff_tilt_deg=42.0 + u * 36.0,
                finial_spin=-3.5 - u * 1.0
            )
            frames.append(frame)

        else:
            # F18..F29: Horizontal collapse onto the ground (y=38..48) with the Chrono-Staff resting FLAT beside the body!
            k = f - 18
            u = k / 11.0
            frame = np.zeros((52, 52, 4), dtype=np.uint8)
            fall_src = tpl['fall']
            dy = -1 if f == 18 else 0
            dx = -1 if f <= 19 else 0
            for y in range(30, 50):
                for x in range(0, 52):
                    if fall_src[y, x, 3] > 0:
                        ny = max(31, min(48, y + dy))
                        nx = max(2, min(49, x + dx))
                        frame[ny, nx] = fall_src[y, x]

            # Draw the Chrono-Astrolabe Staff lying 100% FLAT beside the body at y=44..46, x=18..47 (ZERO upright staff!)
            staff_floor = np.zeros((52, 52, 4), dtype=np.uint8)
            staff_y = 45
            draw_line_px(staff_floor, 18 + dx, staff_y, 43 + dx, staff_y, BRONZE_DEEP)
            draw_line_px(staff_floor, 19 + dx, staff_y - 1, 42 + dx, staff_y - 1, BRASS_MID)
            for rx in (22, 28, 35, 40):
                set_px(staff_floor, rx + dx, staff_y - 1, BRASS_LIGHT)
            # Flat Astrolabe Finial resting on the ground at x=45, y=44..46 (progressively dimming turquoise-brass glow)
            fcx = 45 + dx
            fcy = 44
            ring_pts = [(-2, 0), (2, 0), (0, -1), (0, 1), (-1, -1), (1, -1), (-1, 1), (1, 1)]
            for idx_pt, (ox, oy) in enumerate(ring_pts):
                col_r = GOLD_BRIGHT if idx_pt == (k % 8) and k < 8 else (BRASS_LIGHT if (ox + oy) % 2 == 0 else BRASS_MID)
                set_px(staff_floor, fcx + ox, fcy + oy, col_r)
            fade_b = max(0.25, 1.0 - u * 0.72)
            core_col = (
                int(CYAN_BRIGHT[0] * fade_b),
                int(CYAN_BRIGHT[1] * fade_b),
                int(CYAN_BRIGHT[2] * fade_b),
                255
            )
            set_px(staff_floor, fcx, fcy, core_col)

            frame = composite_over(frame, staff_floor)
            frame = fill_layer_pinholes(frame)
            frames.append(frame)

    return frames


def build_row6_dash(tpl):
    """
    Row 6 (`DASH` - Temporal Rift Phase-Step, 30 frames):
    Sleek forward time-skip lunge wrapped in cyan-gold clockwork afterimages and streaming coat tails.
    Uses recentered `tpl['dash']` (shifted left by -4px to x=8..39) so the lunging staff & FX stay 100% inside x <= 48!
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 3:
            u = f / 3.0
            crouch_dy = [0, 1, 2, 1][f]
            base = make_crouch_body(tpl, crouch_dy) if crouch_dy > 0 else tpl['stand'].copy()
            base = apply_coat_wave(base, phase * 2.0, amplitude=1.8)
            base = draw_escapement_halo(base, cx=20.0, cy=13.0 + crouch_dy, radius=7.2, rot_rad=phase * 2.0)
            frame = draw_chrono_staff(
                base,
                shoulder=(28, 15 + crouch_dy),
                grip=(int(round(30.0 + u * 4.0)), 18 + crouch_dy),
                staff_tilt_deg=15.0 + u * 25.0,
                finial_spin=phase * 3.0
            )
            frames.append(frame)

        elif f <= 21:
            k = f - 4
            u = k / 17.0
            bob_dy = -1 if 4 <= k <= 12 else 0
            lunge_dx = int(round(math.sin(u * math.pi) * 2.0))
            base = shift_layer(tpl['dash'], lunge_dx, bob_dy)
            base = apply_coat_wave(base, k * 0.85, amplitude=2.2, is_dash=True)
            base = draw_escapement_halo(base, cx=23.0 + lunge_dx, cy=14.0 + bob_dy, radius=7.0, rot_rad=phase * 3.0)

            # Cyan-gold clockwork phase-step afterimage motes trailing behind coat
            for m in range(3):
                mx = 4 + ((k * 3 + m * 5) % 10)
                my = 20 + m * 6 + int(round(math.sin(phase * 2.0 + m) * 2.0))
                set_px(base, mx, my, GOLD_BRIGHT if m % 2 == 0 else CYAN_BRIGHT)
                set_px(base, mx + 1, my, TEAL_BRIGHT)

            frame = draw_chrono_staff(
                base,
                shoulder=(32 + lunge_dx, 15 + bob_dy),
                grip=(37 + lunge_dx, 18 + bob_dy),
                staff_tilt_deg=44.0 + math.sin(u * math.pi) * 8.0,
                finial_spin=phase * 4.0,
                left_hand=(28 + lunge_dx, 19 + bob_dy),
                conjure_mode='gear_launch' if 8 <= f <= 13 else 'none',
                mode_progress=u
            )
            frames.append(frame)

        else:
            u = (f - 22) / 7.0
            crouch_dy = [2, 2, 1, 1, 0, 0, 0, 0][f - 22]
            base = make_crouch_body(tpl, crouch_dy) if crouch_dy > 0 else tpl['stand'].copy()
            base = apply_coat_wave(base, phase, amplitude=1.6, vertical_flutter=0.6)
            base = draw_escapement_halo(base, cx=20.0, cy=13.0 + crouch_dy, radius=7.2, rot_rad=phase * 2.0)
            frame = draw_chrono_staff(
                base,
                shoulder=(27, 15 + crouch_dy),
                grip=(int(round(35.0 * (1.0 - u) + 32.0 * u)), int(round(21.0 * (1.0 - u) + 19.0 * u)) + crouch_dy),
                staff_tilt_deg=38.0 * (1.0 - u) + 12.0 * u,
                finial_spin=phase * 2.0
            )
            frames.append(frame)

    return frames


def build_row7_crouch(tpl):
    """
    Row 7 (`CROUCH`, 30 frames):
    - F00..F06: Drops into a low Temporal Calibration kneel (7px lower silhouette), projecting a
      spinning brass-and-cyan Escapement Shield dial in front.
    - F07..F18: Fires a high-velocity low Saw-Gear from the crouched stance (F11..F16) with wide IK arm thrust.
    - F19..F29: Rises smoothly back to standing stance.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 6:
            depths = [0, 1, 3, 4, 5, 6, 7]
            d = depths[f]
            u = f / 6.0
            base = tpl['stand'].copy() if d == 0 else make_crouch_body(tpl, d)
            base = apply_coat_wave(base, phase, amplitude=1.2, vertical_flutter=0.4)
            base = draw_escapement_halo(base, cx=20.0, cy=13.0 + d, radius=6.8, rot_rad=phase * 2.0)
            shield_pt = (40.0, 24.0 + d * 0.5) if f >= 2 else None
            frame = draw_chrono_staff(
                base,
                shoulder=(27, 15 + d),
                grip=(int(round(32.0 - u * 3.0)), 19 + d),
                staff_tilt_deg=14.0 + u * 16.0,
                finial_spin=phase * 3.0,
                left_hand=(int(round(32.0 + u * 4.0)), 18 + d),
                shield_center=shield_pt
            )
            frames.append(frame)

        elif f <= 18:
            d = 7
            base = make_crouch_body(tpl, d)
            if f in (11, 12):
                base = shift_layer(base, -1, 0)
            base = apply_coat_wave(base, phase * 1.5, amplitude=1.4, vertical_flutter=0.4)
            base = draw_escapement_halo(base, cx=20.0, cy=13.0 + d, radius=6.8, rot_rad=phase * 3.0)

            if f <= 10:
                mode = 'saw_gear'
                prog = (f - 7) / 3.0
                tilt = 26.0 - prog * 10.0
                gx = int(round(29.0 - prog * 2.0))
                gy = 25 - int(round(prog * 2.0))
            elif f <= 16:
                mode = 'gear_launch'
                prog = (f - 11) / 5.0
                tilt = 40.0
                gx = int(round(28.0 + min(1.0, prog * 1.6) * 8.0))
                gy = 23 + int(round(min(1.0, prog * 1.6) * 3.0))
            else:
                mode = 'none'
                prog = 0.0
                tilt = 26.0
                gx = 32
                gy = 25

            frame = draw_chrono_staff(
                base,
                shoulder=(27, 15 + d),
                grip=(gx, gy),
                staff_tilt_deg=tilt,
                finial_spin=phase * 4.0,
                left_hand=(36, 18 + d),
                conjure_mode=mode,
                mode_progress=prog,
                shield_center=(41.0, 27.0)
            )
            frames.append(frame)

        else:
            depths = [7, 6, 6, 5, 4, 3, 2, 2, 1, 1, 0]
            k = f - 19
            d = depths[k]
            u = k / 10.0
            base = tpl['stand'].copy() if d == 0 else make_crouch_body(tpl, d)
            base = apply_coat_wave(base, phase, amplitude=1.4, vertical_flutter=0.5)
            base = draw_escapement_halo(base, cx=20.0, cy=13.0 + d, radius=7.0, rot_rad=phase * 2.0)
            frame = draw_chrono_staff(
                base,
                shoulder=(27, 15 + d),
                grip=(int(round(30.0 * (1.0 - u) + 32.0 * u)), 19 + d),
                staff_tilt_deg=26.0 * (1.0 - u) + 12.0 * u,
                finial_spin=phase * 2.0,
                shield_center=(41.0, 27.0) if k <= 1 else None
            )
            frames.append(frame)

    return frames


def build_row8_jump(tpl):
    """
    Row 8 (`JUMP`, 30 frames — ZERO bouncy-ball frames!):
    Full-body Time-Glide Aerial Vault & mid-air downward Saw-Gear Volley:
    - F00..F04: Knee-bend launch
    - F05..F11: Ascending aerial vault with glowing cyan clock-rings beneath the boots & high IK staff lift
    - F12..F18: Apex mid-air hover sweeping Chrono-Staff downward at 35 deg to launch a spinning Clock-Gear
    - F19..F24: Time-slowed feather descent
    - F25..F29: Crisp landing
    Every frame shows the Chronomancer's full head, coat, boots, and Chrono-Staff — NEVER a round ball!
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 4:
            # F00..F04: Knee-bend launch
            crouch_seq = [1, 3, 4, 2, 0]
            dy = crouch_seq[f]
            body = make_crouch_body(tpl, dy) if dy >= 2 else make_jump_body(tpl, dy, tuck_amount=0.25, draw_boot_rings=(f == 4), phase=phase)
            body = apply_coat_wave(body, phase * 2.0, amplitude=1.8, vertical_flutter=0.7)
            body = draw_escapement_halo(body, cx=20.0, cy=13.0 + dy, radius=7.2, rot_rad=phase * 2.0)
            frame = draw_chrono_staff(
                body,
                shoulder=(27, 15 + dy),
                grip=(31 - (1 if dy >= 3 else 0), 19 + dy),
                staff_tilt_deg=16.0 + dy * 4.0,
                finial_spin=phase * 2.5
            )
            frames.append(frame)

        elif f <= 11:
            # F05..F11: Ascending aerial vault with glowing cyan clock-rings beneath the boots
            u = (f - 5) / 6.0
            tuck = 0.45 + 0.50 * math.sin(u * math.pi * 0.7)
            body = make_jump_body(tpl, 0, tuck_amount=tuck, torso_lean_dx=1, draw_boot_rings=True, phase=phase)
            body = apply_coat_wave(body, phase * 2.0, amplitude=2.2, vertical_flutter=1.0)
            body = draw_escapement_halo(body, cx=21.0, cy=13.0, radius=7.4, rot_rad=phase * 3.0)
            gx = int(round(28.0 * (1.0 - u) + 34.0 * u))
            gy = int(round(14.0 * (1.0 - u) + 19.0 * u))
            frame = draw_chrono_staff(
                body,
                shoulder=(28, 15),
                grip=(gx, gy),
                staff_tilt_deg=18.0 + u * 85.0,  # Sweeps smoothly toward downward 35-deg aerial aim (90 + 35 = 125 deg)
                finial_spin=phase * 3.0,
                left_hand=(int(round(25.0 + u * 8.0)), int(round(15.0 + u * 2.0))),
                conjure_mode='saw_gear' if f >= 9 else 'none',
                mode_progress=(f - 9) / 3.0 if f >= 9 else 0.0
            )
            frames.append(frame)

        elif f <= 18:
            # F12..F18: Apex mid-air hover aiming the Chrono-Staff downward at 35 deg (125 deg from vertical up) to launch a spinning Clock-Gear!
            u = (f - 12) / 6.0
            tuck = 0.90 - u * 0.15
            recoil_dx = -1 if f in (15, 16) else 0
            body = make_jump_body(tpl, 0, tuck_amount=tuck, torso_lean_dx=1 + recoil_dx, draw_boot_rings=True, phase=phase)
            body = apply_coat_wave(body, phase * 2.5, amplitude=2.4, vertical_flutter=1.1)
            body = draw_escapement_halo(body, cx=21.0 + recoil_dx, cy=13.0, radius=7.5, rot_rad=phase * 4.0)

            mode = 'saw_gear' if f <= 14 else 'gear_launch'
            prog = (f - 12) / 2.0 if f <= 14 else (f - 15) / 3.0
            gx = (30 if f <= 14 else 35) + recoil_dx
            gy = 16 if f <= 14 else 21
            # 125.0 deg from vertical up = 35.0 deg downward below horizontal!
            frame = draw_chrono_staff(
                body,
                shoulder=(28 + recoil_dx, 15),
                grip=(gx, gy),
                staff_tilt_deg=125.0 - (4.0 if f in (15, 16) else 0.0),
                finial_spin=phase * 4.0,
                left_hand=(33 + recoil_dx, 18),
                conjure_mode=mode,
                mode_progress=prog
            )
            frames.append(frame)

        elif f <= 24:
            # F19..F24: Time-slowed feather descent
            u = (f - 19) / 5.0
            tuck = 0.70 * (1.0 - u * 0.75)
            body = make_jump_body(tpl, 0, tuck_amount=tuck, draw_boot_rings=(f <= 22), phase=phase)
            body = apply_coat_wave(body, phase * 2.0, amplitude=2.0, vertical_flutter=0.9)
            body = draw_escapement_halo(body, cx=20.5, cy=13.0, radius=7.2, rot_rad=phase * 2.5)
            frame = draw_chrono_staff(
                body,
                shoulder=(27, 15),
                grip=(int(round(35.0 * (1.0 - u) + 30.0 * u)), int(round(21.0 * (1.0 - u) + 17.0 * u))),
                staff_tilt_deg=110.0 * (1.0 - u) + 18.0 * u,
                finial_spin=phase * 2.5
            )
            frames.append(frame)

        else:
            # F25..F29: Crisp shock-absorbing landing
            crouch_depths = [2, 3, 2, 1, 0]
            k = f - 25
            d = crouch_depths[k]
            body = tpl['stand'].copy() if d == 0 else make_crouch_body(tpl, d)
            body = apply_coat_wave(body, phase, amplitude=1.5, vertical_flutter=0.6)
            body = draw_escapement_halo(body, cx=20.0, cy=13.0 + d, radius=7.2, rot_rad=phase * 2.0)
            frame = draw_chrono_staff(
                body,
                shoulder=(27, 15 + d),
                grip=(32, 19 + d),
                staff_tilt_deg=12.0 + d * 3.0,
                finial_spin=phase * 2.0
            )
            frames.append(frame)

    return frames


def main():
    src = load_source_cells()
    tpl = make_clean_templates(src)

    raw_rows = [
        ('ROW 0: IDLE (30 FRAMES)', build_row0_idle(tpl)),
        ('ROW 1: WALK (30 FRAMES)', build_row1_walk(tpl)),
        ('ROW 2: AUTO_ATTACK - CLOCK-GEAR LAUNCH (30 FRAMES)', build_row2_auto_attack(tpl)),
        ('ROW 3: SKILL - STASIS HOURGLASS & REWIND (30 FRAMES)', build_row3_skill(tpl)),
        ('ROW 4: ULTIMATE - DOOMSDAY CLOCK MIDNIGHT (30 FRAMES)', build_row4_ultimate(tpl)),
        ('ROW 5: DEATH & HURT (30 FRAMES)', build_row5_death(tpl)),
        ('ROW 6: DASH - TEMPORAL RIFT PHASE-STEP (30 FRAMES)', build_row6_dash(tpl)),
        ('ROW 7: CROUCH - ESCAPEMENT SHIELD & LOW GEAR (30 FRAMES)', build_row7_crouch(tpl)),
        ('ROW 8: JUMP - TIME-GLIDE VAULT & AERIAL GEAR (30 FRAMES)', build_row8_jump(tpl)),
    ]

    # Guarantee 0 cell-border clips and fill any movement pinholes across all 270 cells
    rows = [
        (r_name, [ensure_safe_cell(cell, margin=1) for cell in r_frames])
        for r_name, r_frames in raw_rows
    ]

    num_rows = len(rows)
    cell_px = 208
    sheet = Image.new('RGBA', (30 * cell_px, num_rows * cell_px), (0, 0, 0, 0))

    for r_idx, (r_name, r_frames) in enumerate(rows):
        assert len(r_frames) == 30, f'{r_name} has {len(r_frames)} frames instead of 30'
        adj_diffs = sum(1 for i in range(29) if np.any(r_frames[i] != r_frames[i + 1]))
        print(f'{r_name:56s}: 30 frames generated, {adj_diffs}/29 adjacent transitions distinct')
        for c_idx, arr in enumerate(r_frames):
            cell_im = Image.fromarray(arr, mode='RGBA').resize((cell_px, cell_px), Image.NEAREST)
            sheet.paste(cell_im, (c_idx * cell_px, r_idx * cell_px))

    out_path = 'assets/sprites/chronomancer_sheet.png'
    sheet.save(out_path)
    print('Saved', out_path, sheet.size)

    # Render contact sheets: left (F00..F14) and right (F15..F29)
    preview_cell = 96
    pad_top = 24
    dbg = Image.new('RGBA', (30 * preview_cell, num_rows * (preview_cell + pad_top)), (15, 20, 30, 255))
    draw = ImageDraw.Draw(dbg)
    for r_idx, (r_name, r_frames) in enumerate(rows):
        y0 = r_idx * (preview_cell + pad_top)
        draw.rectangle([0, y0, 30 * preview_cell, y0 + pad_top - 2], fill=(26, 34, 50, 255))
        draw.text((8, y0 + 5), r_name, fill=(94, 234, 212, 255))
        for c_idx, arr in enumerate(r_frames):
            x0 = c_idx * preview_cell
            draw.text((x0 + 4, y0 + 13), f'F{c_idx:02d}', fill=(254, 240, 138, 255))
            p_im = Image.fromarray(arr, mode='RGBA').resize((preview_cell, preview_cell), Image.NEAREST)
            dbg.paste(p_im, (x0, y0 + pad_top), p_im)
            draw.rectangle([x0, y0 + pad_top, x0 + preview_cell - 1, y0 + pad_top + preview_cell - 1], outline=(35, 45, 65, 255))

    art_dir = '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/4f1fb80f-a88f-4496-9746-b4b9fe84f6d4'
    os.makedirs(art_dir, exist_ok=True)
    left_path = f'{art_dir}/debug_chronomancer_30fps_left_F00_F14.png'
    right_path = f'{art_dir}/debug_chronomancer_30fps_right_F15_F29.png'
    dbg.crop((0, 0, 15 * preview_cell, dbg.height)).save(left_path)
    dbg.crop((15 * preview_cell, 0, 30 * preview_cell, dbg.height)).save(right_path)
    print('Saved debug sheets:', left_path, right_path)


if __name__ == '__main__':
    main()

