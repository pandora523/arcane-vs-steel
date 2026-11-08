#!/usr/bin/env python3
"""
Builds Sylvara's (Archer) 30-Frame-Per-Animation HD-2D Sprite Sheet:
- 9 rows x 30 columns = 270 unique frames (6240 x 1872 at 208x208 per cell):
  * Row 0: IDLE (30 frames)
  * Row 1: WALK (30 frames)
  * Row 2: AUTO_ATTACK (30 frames)
  * Row 3: SKILL - STARFALL VOLLEY (30 frames)
  * Row 4: ULTIMATE - ASTRAL HURRICANE (30 frames)
  * Row 5: DEATH (30 frames)
  * Row 6: DASH - GALE STRIDE (30 frames)
  * Row 7: CROUCH - RANGER STEALTH CROUCH & SNIPER SHOT (30 frames)
  * Row 8: JUMP - ZEPHYR LEAP & DOWNWARD AERIAL SHOT (30 frames)
- Zero AI morphing artifacts, zero extra limbs, zero extra bows/swords, zero alpha-blend ghosting.
"""

import math
import numpy as np
from PIL import Image, ImageDraw

OUTLINE = (13, 13, 21, 255)
GOLD_BRIGHT = (236, 204, 120, 255)
GOLD_MID = (182, 146, 78, 255)
GOLD_DARK = (112, 86, 48, 255)
WOOD_DARK = (74, 54, 40, 255)
EMERALD_CORE = (236, 253, 245, 255)
EMERALD_BRIGHT = (110, 231, 183, 255)
EMERALD_MID = (16, 185, 129, 255)
EMERALD_DEEP = (6, 95, 70, 255)
STAR_GOLD = (254, 240, 138, 255)
SKIN_LIGHT = (226, 188, 160, 255)
SKIN_MID = (206, 166, 138, 255)
SKIN_SHADOW = (186, 144, 118, 255)
SILVER_BRIGHT = (226, 232, 240, 255)
SILVER_LIGHT = (203, 213, 225, 255)
SILVER_MID = (148, 163, 184, 255)
LEATHER_LIGHT = (124, 94, 74, 255)
LEATHER_MID = (92, 68, 54, 255)
LEATHER_DARK = (58, 42, 34, 255)
CLOAK_LIGHT = (52, 118, 90, 255)
CLOAK_MID = (34, 78, 62, 255)
CLOAK_DARK = (20, 46, 38, 255)
CLOAK_DEEP = (12, 28, 22, 255)


def load_source_cells(path='backups/archer_sheet_before_30fps.png'):
    im = Image.open(path).convert('RGBA')
    def cell(r, c):
        return np.array(
            im.crop((c * 208, r * 208, (c + 1) * 208, (r + 1) * 208)).resize((52, 52), Image.NEAREST),
            dtype=np.uint8
        )
    return {
        'idle': cell(0, 0),
        'walk1': cell(1, 1),
        'walk_pass': cell(1, 5),
        'walk_alt': cell(1, 6),
        'atk_draw': cell(2, 0),
        'atk_rel': np.roll(cell(2, 3), -1, axis=1),
        'skill_up': cell(3, 1),
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
    because `PixelForge.js` (ensureNormalMap + drawSheetFrame) already renders the 1px
    comic ink outline and 1px exterior rim dynamically at runtime—matching all other champions!
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


def shift_layer(layer, dx=0, dy=0):
    """
    Shifts a 52x52 layer by (dx, dy), clamping inside the safe cell interior and filling any pinholes.
    """
    out = np.zeros_like(layer)
    idx = int(round(dx))
    idy = int(round(dy))
    for y in range(52):
        ny = y + idy
        if 1 <= ny <= 50:
            for x in range(52):
                nx = x + idx
                if 1 <= nx <= 50 and layer[y, x, 3] > 0:
                    out[ny, nx] = layer[y, x]
    return fill_layer_pinholes(out)


def ensure_safe_cell(cell, margin=2):
    """
    Guarantees zero pixels touch the 52x52 cell border (x=0, x=51, y=0, y=51) and fills
    any 1px interior pinholes from movement.
    """
    m = max(1, int(margin))
    hi = 51 - m
    out = fill_layer_pinholes(cell, m, hi, m, hi, require_3_neighbors=True)
    ys, xs = np.where(out[:, :, 3] > 0)
    if len(ys) == 0:
        return out
    ymin, ymax = int(ys.min()), int(ys.max())
    xmin, xmax = int(xs.min()), int(xs.max())

    dy = 0
    if ymin < m and ymax < hi:
        dy = min(m - ymin, hi - ymax)
    elif ymax > hi and ymin > m:
        dy = -min(ymax - hi, ymin - m)

    dx = 0
    if xmin < m and xmax < hi:
        dx = min(m - xmin, hi - xmax)
    elif xmax > hi and xmin > m:
        dx = -min(xmax - hi, xmin - m)

    if dx != 0 or dy != 0:
        shifted = np.zeros_like(out)
        for y in range(52):
            ny = y + dy
            if m <= ny <= hi:
                for x in range(52):
                    nx = x + dx
                    if m <= nx <= hi and out[y, x, 3] > 0:
                        shifted[ny, nx] = out[y, x]
        out = shifted

    out[:m, :, :] = 0
    out[52 - m:, :, :] = 0
    out[:, :m, :] = 0
    out[:, 52 - m:, :] = 0
    return out


def composite_over(base, over):
    res = base.copy()
    mask = over[:, :, 3] > 0
    res[mask] = over[mask]
    return res


def strip_isolated_pixels(layer):
    """Removes 1px isolated floating pixels that have 0 or 1 orthogonal opaque neighbors."""
    out = layer.copy()
    alpha = out[:, :, 3] > 0
    for y in range(1, 51):
        for x in range(1, 51):
            if not alpha[y, x]:
                continue
            n = int(alpha[y - 1, x]) + int(alpha[y + 1, x]) + int(alpha[y, x - 1]) + int(alpha[y, x + 1])
            if n <= 1:
                out[y, x] = 0
    return out


def make_clean_templates(src):
    """
    Removes ONLY the baked-in bow and arrow outside Sylvara's body while preserving 100% of her
    emerald tunic, silver shoulder pauldron, emerald belt gem, front hip/thigh (x=28..33, y=24..35),
    and flowing cloak so she NEVER looks like she is missing a piece of her body!
    """
    # 1. Clean standing body:
    # Take head & upper shoulders (y=0..17, x=0..29) from `idle`, and take the 100% unobstructed,
    # bow-free torso, emerald belt buckle, front hip, cloak, and legs (y=18..49, x=0..33) from `atk_rel`!
    stand = src['idle'].copy()
    rel = src['atk_rel'].copy()
    stand[18:49, 0:34] = rel[18:49, 0:34]
    # Zero only the baked bow & extended horizontal arm outside her body silhouette:
    for y in range(0, 50):
        for x in range(0, 52):
            if y <= 17 and x >= 30:
                stand[y, x] = 0
            elif 18 <= y <= 23 and x >= 29:
                stand[y, x] = 0
            elif 24 <= y <= 35 and x >= 34:
                stand[y, x] = 0
            elif y >= 36 and x >= 36:
                stand[y, x] = 0
    stand = strip_isolated_pixels(add_outline_to_layer(stand))

    # Extract Sylvara's actual pixel-art Left Boot and Right Boot (y=39..49)
    leg_back_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_front_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_back_patch[39:50, 16:25] = stand[39:50, 16:25]
    leg_front_patch[39:50, 26:36] = stand[39:50, 26:36]

    # Upper torso + waist/tunic hip (y=0..33) + full left emerald cloak (y=34..44, x <= 16)
    stand_upper = np.zeros((52, 52, 4), dtype=np.uint8)
    stand_upper[:34, :] = stand[:34, :]
    stand_upper[34:45, :17] = stand[34:45, :17]
    stand_upper = add_outline_to_layer(stand_upper)

    # 2. Clean aiming horizontal body (from atk_rel):
    # Keep her entire torso, waist, hips, cloak, and legs (x <= 33 for y=24..35) intact; only strip the bow & extended arm!
    aim_h = rel.copy()
    for y in range(0, 50):
        for x in range(0, 52):
            if y <= 18 and x >= 29:
                aim_h[y, x] = 0
            elif 19 <= y <= 23 and x >= 29:
                aim_h[y, x] = 0
            elif 24 <= y <= 35 and x >= 34:
                aim_h[y, x] = 0
            elif y >= 36 and x >= 36:
                aim_h[y, x] = 0
    aim_h = strip_isolated_pixels(add_outline_to_layer(aim_h))

    aim_h_upper = np.zeros((52, 52, 4), dtype=np.uint8)
    aim_h_upper[:34, :] = aim_h[:34, :]
    aim_h_upper[34:45, :17] = aim_h[34:45, :17]
    aim_h_upper = add_outline_to_layer(aim_h_upper)

    # 3. Clean aiming upward body (from skill_up)
    aim_up = src['skill_up'].copy()
    # Restore clean bow-free lower torso & hips from `stand` (y=19..35, x=18..34)
    aim_up[19:35, 18:34] = stand[19:35, 18:34]
    for y in range(0, 50):
        for x in range(0, 52):
            if y <= 18 and x >= 29:
                aim_up[y, x] = 0
            elif 19 <= y <= 23 and x >= 29:
                aim_up[y, x] = 0
            elif 24 <= y <= 35 and x >= 34:
                aim_up[y, x] = 0
    aim_up = strip_isolated_pixels(add_outline_to_layer(aim_up))

    # 4. Clean kneeling bodies (kneel1, kneel2) for Row 5 DEATH only:
    # Remove only the baked right bow limb (x >= 31, y=14..33) while keeping her kneeling body intact
    kneel1 = src['kneel1'].copy()
    kneel2 = src['kneel2'].copy()
    for kn in (kneel1, kneel2):
        for y in range(14, 34):
            for x in range(31, 52):
                kn[y, x] = 0
    kneel1 = strip_isolated_pixels(add_outline_to_layer(kneel1))
    kneel2 = strip_isolated_pixels(add_outline_to_layer(kneel2))

    # 5. Clean fallen body (remove the sticking-up bowstring at y <= 36!)
    fall = src['fall'].copy()
    fall[:37, :, :] = 0
    for y in range(37, 40):
        for x in range(25, 52):
            R, G, B, A = fall[y, x]
            if A > 0 and G > R + 25 and G > 110 and x >= 28:
                fall[y, x] = 0
            if y == 37 and x >= 32:
                fall[y, x] = 0
    fall = add_outline_to_layer(fall)

    # 6. Clean dash body: remove ONLY the baked front bow limb (x >= 35 for y=12..29, x >= 32 for y=26..31)
    # while keeping her entire leaning torso, head, quiver, and legs 100% intact!
    dash = src['dash'].copy()
    for y in range(10, 32):
        for x in range(0, 52):
            if y <= 24 and x >= 34:
                dash[y, x] = 0
            elif 25 <= y <= 31 and x >= 32:
                r, g, b, a = dash[y, x]
                if a > 0 and (r > 130 or g > 130):
                    dash[y, x] = 0
    dash = strip_isolated_pixels(add_outline_to_layer(dash))

    return {
        'stand': stand,
        'stand_upper': stand_upper,
        'leg_back': leg_back_patch,
        'leg_front': leg_front_patch,
        'aim_h': aim_h,
        'aim_h_upper': aim_h_upper,
        'aim_up': aim_up,
        'kneel1': kneel1,
        'kneel2': kneel2,
        'fall': fall,
        'dash': dash,
    }


def apply_cloak_wave(frame, phase_rad, amplitude=1.2, vertical_flutter=0.5, is_dash=False):
    """
    Applies a smooth, tear-free 30-frame traveling wind-wave to Sylvara's emerald cloak (left side of sprite)
    without detaching floating pixels above her back or tearing seams.
    """
    out = frame.copy()
    if is_dash:
        cloak_region = frame[16:36, 0:21].copy()
        out[16:36, 0:21] = 0
        for y in range(16, 36):
            for x in range(0, 21):
                if cloak_region[y - 16, x, 3] == 0:
                    continue
                if y >= 31 and x >= 14:
                    out[y, max(2, x)] = cloak_region[y - 16, x]
                    continue
                dist_from_shoulder = max(0.0, (21 - x) / 18.0)
                dy = int(round(math.sin(phase_rad - dist_from_shoulder * 2.8) * min(1.0, amplitude * 0.5) * dist_from_shoulder))
                dx = int(round(math.cos(phase_rad * 2.0 - dist_from_shoulder * 2.2) * 0.6 * dist_from_shoulder))
                ny = max(16, min(36, y + dy))
                nx = max(2, min(21, x + dx))
                out[ny, nx] = cloak_region[y - 16, x]
                if x >= 13 and out[y, x, 3] == 0:
                    out[y, x] = cloak_region[y - 16, x]
        out = fill_layer_pinholes(out, x0=2, x1=22, y0=15, y1=37, require_3_neighbors=False)
        return strip_isolated_pixels(add_outline_to_layer(out))

    cloak_mask = np.zeros((52, 52), dtype=bool)
    for y in range(14, 48):
        max_cloak_x = 18 if y < 38 else 15
        for x in range(1, max_cloak_x + 1):
            if frame[y, x, 3] > 0:
                cloak_mask[y, x] = True

    cloak_pixels = frame.copy()
    out[cloak_mask] = 0

    for y in range(14, 48):
        u = (y - 14) / 33.0
        wave_x = math.sin(phase_rad - u * 3.4) * (min(1.3, amplitude) * (0.2 + 0.75 * u))
        wave_y = math.cos(phase_rad - u * 2.6) * (min(0.6, vertical_flutter) * u)
        dx = int(round(wave_x))
        dy = int(round(wave_y))
        max_cloak_x = 18 if y < 38 else 15
        for x in range(1, max_cloak_x + 1):
            if not cloak_mask[y, x]:
                continue
            nx = max(2, min(20, x + dx))
            ny = max(14, min(48, y + dy))
            if out[ny, nx, 3] == 0:
                out[ny, nx] = cloak_pixels[y, x]
            if x >= max_cloak_x - 3 and out[y, x, 3] == 0:
                out[y, x] = cloak_pixels[y, x]

    out = fill_layer_pinholes(out, x0=2, x1=21, y0=13, y1=49, require_3_neighbors=False)
    return strip_isolated_pixels(add_outline_to_layer(out))


def solve_ik_elbow(sx, sy, hx, hy, L1=4.8, L2=4.6, bend_side=1.0):
    """
    2-Bone Inverse Kinematics solver returning the anatomical elbow joint (ex, ey)
    between shoulder (sx, sy) and hand (hx, hy).
    - `bend_side >= 0`: natural downward elbow bend for the extended left bow-arm.
    - `bend_side < 0`: high raised archer's back-elbow (up and behind shoulder) for the right draw-arm!
    """
    dx = float(hx - sx)
    dy = float(hy - sy)
    dist = max(0.8, math.hypot(dx, dy))
    max_reach = L1 + L2 - 0.12
    if dist > max_reach:
        dx *= max_reach / dist
        dy *= max_reach / dist
        dist = max_reach
    ux, uy = dx / dist, dy / dist
    a = (L1 * L1 - L2 * L2 + dist * dist) / (2.0 * dist)
    h = math.sqrt(max(0.0, L1 * L1 - a * a))

    p1x, p1y = -uy, ux
    p2x, p2y = uy, -ux
    e1x, e1y = sx + ux * a + p1x * h, sy + uy * a + p1y * h
    e2x, e2y = sx + ux * a + p2x * h, sy + uy * a + p2y * h

    if bend_side < 0.0:
        score1 = e1y + 0.45 * e1x
        score2 = e2y + 0.45 * e2x
        ex, ey = (e1x, e1y) if score1 <= score2 else (e2x, e2y)
    else:
        ex, ey = (e1x, e1y) if e1y >= e2y else (e2x, e2y)

    ex = max(3.0, min(48.0, ex))
    ey = max(3.0, min(48.0, ey))
    return ex, ey


def draw_ik_ranger_arm(layer, sx, sy, hx, hy, L1=4.6, L2=4.4, bend_side=1.0, is_draw_arm=False, is_rear=False):
    """
    Draws a sleek, anatomically proportioned 3px-thick elven ranger bow-arm onto `layer`
    from `(sx, sy)` (just in front of Sylvara's master-painted silver shoulder pauldron)
    to the bow grip `(hx, hy)`:
    - 3px-thick emerald sleeve upper arm (`+0.75` highlight, `0.0` core, `-0.75` dark shadow)
    - 3px-thick leather/silver archer's bracer forearm
    - Subtle silver elbow guard at `(ex, ey)`
    - 2x2 archer's glove/skin hand at `(hx, hy)`
    """
    sx = max(4.0, min(47.0, float(sx)))
    sy = max(4.0, min(47.0, float(sy)))
    hx = max(3.5, min(47.5, float(hx)))
    hy = max(3.5, min(47.5, float(hy)))

    ex, ey = solve_ik_elbow(sx, sy, hx, hy, L1=L1, L2=L2, bend_side=bend_side)

    # 1. Sleek 3px Upper Arm (Shoulder -> Elbow)
    u1x, u1y = ex - sx, ey - sy
    d1 = max(1.0, math.hypot(u1x, u1y))
    n1x, n1y = -u1y / d1, u1x / d1
    draw_line_px(layer, sx - n1x * 0.75, sy - n1y * 0.75, ex - n1x * 0.75, ey - n1y * 0.75, CLOAK_DEEP)
    draw_line_px(layer, sx + n1x * 0.75, sy + n1y * 0.75, ex + n1x * 0.75, ey + n1y * 0.75, CLOAK_LIGHT)
    draw_line_px(layer, sx, sy, ex, ey, CLOAK_MID)

    # 2. Sleek 3px Forearm Bracer (Elbow -> Hand)
    u2x, u2y = hx - ex, hy - ey
    d2 = max(1.0, math.hypot(u2x, u2y))
    n2x, n2y = -u2y / d2, u2x / d2
    draw_line_px(layer, ex - n2x * 0.75, ey - n2y * 0.75, hx - n2x * 0.75, hy - n2y * 0.75, CLOAK_DEEP)
    draw_line_px(layer, ex + n2x * 0.75, ey + n2y * 0.75, hx + n2x * 0.75, hy + n2y * 0.75, SILVER_MID)
    draw_line_px(layer, ex, ey, hx, hy, LEATHER_LIGHT)

    # 3. Subtle Silver Elbow Guard at (ex, ey)
    set_px(layer, ex, ey, SILVER_BRIGHT if is_draw_arm else SILVER_MID)

    # 4. 2x2 Archer's Glove / Skin Hand at (hx, hy)
    ihx = max(3, min(47, int(round(hx))))
    ihy = max(3, min(47, int(round(hy))))
    set_px(layer, ihx, ihy, SKIN_LIGHT)
    set_px(layer, ihx + 1, ihy, SKIN_LIGHT)
    set_px(layer, ihx, ihy + 1, SKIN_MID)
    set_px(layer, ihx + 1, ihy + 1, SKIN_MID)
    return ex, ey


draw_ik_archer_arm = draw_ik_ranger_arm


def draw_astral_wings(fx_layer, bx, by, ux, uy, px, py, sign, s, astral_wings):
    """
    Renders luminous emerald-and-gold astral wing feathers along the bow limbs during ULTIMATE,
    clamped strictly inside [3..48, 3..48] so wing tips never touch cell borders.
    """
    wing_len = int(round(astral_wings * (4.5 * math.sin(s * math.pi) + 1.5)))
    for w_i in range(1, wing_len + 1):
        wx = max(3.0, min(48.0, bx + ux * (w_i * 0.9) + px * (sign * w_i * 0.35)))
        wy = max(3.0, min(48.0, by + uy * (w_i * 0.9) + py * (sign * w_i * 0.35)))
        w_col = STAR_GOLD if w_i == 1 else (EMERALD_BRIGHT if w_i < wing_len else EMERALD_MID)
        set_px(fx_layer, wx, wy, w_col)


def draw_articulated_bow(
    base_frame,
    shoulder=(28, 16),
    aim_deg=0.0,
    draw_t=0.0,
    string_vib=0.0,
    arrow_mode='none',
    release_flash=False,
    charge_level=0,
    astral_wings=0.0,
    hand_override=None,
    bow_reach=10.5,
    bow_half_span=13.0,
    bow_flare=0.0,
):
    """
    Renders Sylvara's sleek 2-Bone IK Left Bow-Arm at her true anatomical shoulder height (`sy_bow = 15.5 + dy_off`)
    right in front of her existing silver shoulder pauldron (`x = 20..25, y = 13..16`), holding the Golden Elven
    Greatbow well IN FRONT of her torso (`gx = 33..37, gy = 15..20` in forward stances; `gx = 30..33, gy = 11..15`
    in skyward stances), and renders a compact drawing hand + bracer at `(nock_x, nock_y)` when `draw_t >= 0.20`
    without covering her silver pauldron or putting extra limbs on her chest.
    """
    bow_arm_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    bow_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    str_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    draw_arm_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    fx_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    rad = math.radians(aim_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    px, py = -uy, ux

    dx_off = float(shoulder[0]) - 28.0
    dy_off = float(shoulder[1]) - 16.0

    sx_bow = 27.0 + dx_off
    sy_bow = 15.5 + dy_off

    # Keep bow grip gx well out IN FRONT of her torso at natural shoulder/chest level (gy = 15..20)
    eff_reach = max(7.5, bow_reach - 2.0 + 1.0 * draw_t)
    raw_gx = sx_bow + ux * eff_reach
    raw_gy = sy_bow + uy * eff_reach
    if aim_deg < -18.0:
        gx = max(30.5, min(33.5, raw_gx))
        gy = max(11.5, min(15.0, raw_gy))
    else:
        gx = max(33.0, min(37.5, raw_gx))
        gy = max(14.5 + max(0.0, dy_off * 0.8), min(20.5 + max(0.0, dy_off), raw_gy))

    # 1. Left Bow-Arm (sleek 3px 2-Bone IK holding the bow out in front of her shoulder)
    draw_ik_ranger_arm(
        bow_arm_layer,
        sx_bow,
        sy_bow,
        gx,
        gy,
        L1=4.6,
        L2=4.4,
        bend_side=1.0,
        is_draw_arm=False,
        is_rear=True,
    )

    # 2. Curved Golden Recurve Bow Limbs with Deep Arch (auto-clamped inside [3..48, 3..48])
    flex_back = 3.2 + draw_t * 2.6
    steps = 14
    top_tip = (gx, gy)
    bot_tip = (gx, gy)

    for sign in (-1, 1):
        for i in range(steps + 1):
            s = i / steps
            span = s * bow_half_span * sign
            bend = -(s ** 1.55) * flex_back
            bx = max(3.0, min(48.0, gx + ux * bend + px * span))
            by = max(3.0, min(48.0, gy + uy * bend + py * span))

            set_px(bow_layer, max(3.0, min(48.0, bx - ux * 0.7)), max(3.0, min(48.0, by - uy * 0.7)), WOOD_DARK)
            col = STAR_GOLD if (bow_flare > 0.0 and (s < 0.28 or s > 0.80)) else (GOLD_BRIGHT if (s < 0.25 or s > 0.82) else GOLD_MID)
            set_px(bow_layer, bx, by, col)

            if astral_wings > 0.05 and 0.25 <= s <= 0.95 and i % 2 == 0:
                draw_astral_wings(fx_layer, bx, by, ux, uy, px, py, sign, s, astral_wings)

            if i == steps:
                if sign == -1:
                    top_tip = (bx, by)
                else:
                    bot_tip = (bx, by)

    set_px(bow_layer, max(3.0, min(48.0, gx + ux * 0.8)), max(3.0, min(48.0, gy + uy * 0.8)), STAR_GOLD if bow_flare > 0.0 else EMERALD_MID)
    set_px(bow_layer, gx, max(3.0, min(48.0, gy - 1.0)), (255, 255, 255, 255) if bow_flare > 0.0 else EMERALD_BRIGHT)

    # 3. Compute Bowstring Nock Point anchored to her cheek/pauldron (x = 26, y = 15 + dy_off)
    mid_tip_x = 0.5 * (top_tip[0] + bot_tip[0])
    mid_tip_y = 0.5 * (top_tip[1] + bot_tip[1])

    cheek_x = max(4.0, min(46.0, sx_bow - ux * 1.0 + px * (-0.4)))
    cheek_y = max(4.0, min(46.0, sy_bow - uy * 0.5 + py * (-0.4)))

    if draw_t > 0.01:
        nock_x = max(3.5, min(47.5, mid_tip_x * (1.0 - draw_t) + cheek_x * draw_t))
        nock_y = max(3.5, min(47.5, mid_tip_y * (1.0 - draw_t) + cheek_y * draw_t))
    else:
        nock_x = max(3.5, min(47.5, mid_tip_x + ux * string_vib))
        nock_y = max(3.5, min(47.5, mid_tip_y + uy * string_vib))

    # 4. Taut Luminous Emerald-Gold Astral Bowstring
    if bow_flare > 0.0:
        # Outer emerald astral string glow + inner star-gold core string
        draw_line_px(
            str_layer,
            max(3.0, min(48.0, top_tip[0] - ux * 0.6)),
            max(3.0, min(48.0, top_tip[1] - uy * 0.6)),
            max(3.0, min(48.0, nock_x - ux * 0.6)),
            max(3.0, min(48.0, nock_y - uy * 0.6)),
            EMERALD_BRIGHT,
        )
        draw_line_px(
            str_layer,
            max(3.0, min(48.0, bot_tip[0] - ux * 0.6)),
            max(3.0, min(48.0, bot_tip[1] - uy * 0.6)),
            max(3.0, min(48.0, nock_x - ux * 0.6)),
            max(3.0, min(48.0, nock_y - uy * 0.6)),
            EMERALD_BRIGHT,
        )
        draw_line_px(str_layer, top_tip[0], top_tip[1], nock_x, nock_y, STAR_GOLD)
        draw_line_px(str_layer, bot_tip[0], bot_tip[1], nock_x, nock_y, STAR_GOLD)
        # Astral limb-tip & nock star glints
        for lx_t, ly_t in [top_tip, bot_tip]:
            set_px(fx_layer, max(3.0, min(48.0, lx_t)), max(3.0, min(48.0, ly_t)), (255, 255, 255, 255))
            set_px(fx_layer, max(3.0, min(48.0, lx_t + ux)), max(3.0, min(48.0, ly_t + uy)), STAR_GOLD)
            set_px(fx_layer, max(3.0, min(48.0, lx_t - ux)), max(3.0, min(48.0, ly_t - uy)), EMERALD_BRIGHT)
        set_px(fx_layer, max(3.0, min(48.0, nock_x)), max(3.0, min(48.0, nock_y - 1.0)), STAR_GOLD)
        set_px(fx_layer, max(3.0, min(48.0, nock_x - 1.0)), max(3.0, min(48.0, nock_y)), EMERALD_BRIGHT)
    else:
        draw_line_px(str_layer, top_tip[0], top_tip[1], nock_x, nock_y, EMERALD_BRIGHT)
        draw_line_px(str_layer, bot_tip[0], bot_tip[1], nock_x, nock_y, EMERALD_BRIGHT)

    # 5. Right Draw-Hand & Bracer at (nock_x, nock_y) when draw_t >= 0.20 (preserving her silver shoulder pauldron!)
    if draw_t >= 0.20:
        ihx = max(3, min(47, int(round(nock_x))))
        ihy = max(3, min(47, int(round(nock_y))))
        set_px(draw_arm_layer, ihx - 1, ihy, SILVER_MID)
        set_px(draw_arm_layer, ihx - 1, ihy + 1, LEATHER_LIGHT)
        set_px(draw_arm_layer, ihx, ihy, SKIN_LIGHT)
        set_px(draw_arm_layer, ihx + 1, ihy, SKIN_LIGHT)
        set_px(draw_arm_layer, ihx, ihy + 1, SKIN_MID)
        set_px(draw_arm_layer, ihx + 1, ihy + 1, SKIN_MID)

    # 6. Nocked Emerald / Astral Arrow(s) or Release Flash (auto-clamped inside [3..48, 3..48])
    arrow_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    def render_single_arrow(ax0, ay0, ang_deg, length=18.5, is_astral=False, charge=0, extra_flare=0.0):
        arad = math.radians(ang_deg)
        aux, auy = math.cos(arad), math.sin(arad)
        apx, apy = -auy, aux

        margin_tip = 4.5 + max(charge, 2 if extra_flare > 0.0 else 0)
        max_len = float(length)
        if aux > 0.05:
            max_len = min(max_len, (51.0 - margin_tip - ax0) / aux)
        elif aux < -0.05:
            max_len = min(max_len, (margin_tip - ax0) / aux)
        if auy > 0.05:
            max_len = min(max_len, (51.0 - margin_tip - ay0) / auy)
        elif auy < -0.05:
            max_len = min(max_len, (margin_tip - ay0) / auy)
        eff_len = max(5.5, max_len)

        ax1 = max(3.5, min(47.5, ax0 + aux * eff_len))
        ay1 = max(3.5, min(47.5, ay0 + auy * eff_len))

        set_px(arrow_layer, max(3.0, min(48.0, ax0 - aux + apx)), max(3.0, min(48.0, ay0 - auy + apy)), STAR_GOLD if (is_astral or extra_flare > 0.0) else EMERALD_BRIGHT)
        set_px(arrow_layer, max(3.0, min(48.0, ax0 - aux - apx)), max(3.0, min(48.0, ay0 - auy - apy)), STAR_GOLD if (is_astral or extra_flare > 0.0) else EMERALD_BRIGHT)

        shaft_col = STAR_GOLD if (is_astral or extra_flare > 0.0) else EMERALD_CORE
        draw_line_px(arrow_layer, ax0, ay0, ax1, ay1, shaft_col)
        if is_astral or extra_flare > 0.0:
            draw_line_px(
                arrow_layer,
                max(3.0, min(48.0, ax0 + apx * 0.85)),
                max(3.0, min(48.0, ay0 + apy * 0.85)),
                max(3.0, min(48.0, ax1 - aux * 1.5 + apx * 0.85)),
                max(3.0, min(48.0, ay1 - auy * 1.5 + apy * 0.85)),
                EMERALD_BRIGHT if extra_flare > 0.0 else EMERALD_MID,
            )

        set_px(arrow_layer, ax1, ay1, (255, 255, 255, 255) if extra_flare > 0.0 else EMERALD_CORE)
        set_px(arrow_layer, max(3.0, min(48.0, ax1 - aux + apx)), max(3.0, min(48.0, ay1 - auy + apy)), EMERALD_BRIGHT if extra_flare > 0.0 else EMERALD_MID)
        set_px(arrow_layer, max(3.0, min(48.0, ax1 - aux - apx)), max(3.0, min(48.0, ay1 - auy - apy)), EMERALD_BRIGHT if extra_flare > 0.0 else EMERALD_MID)
        set_px(arrow_layer, max(3.0, min(48.0, ax1 + aux)), max(3.0, min(48.0, ay1 + auy)), STAR_GOLD if (is_astral or extra_flare > 0.0) else EMERALD_BRIGHT)

        eff_charge = max(charge, 2 if extra_flare > 0.0 else 0)
        if eff_charge >= 1:
            tx = max(4, min(46, int(round(ax1 + aux))))
            ty = max(4, min(46, int(round(ay1 + auy))))
            set_px(fx_layer, tx, ty, (255, 255, 255, 255))
            for d in range(1, eff_charge + 1):
                col = STAR_GOLD if d == 1 else (EMERALD_BRIGHT if d == 2 else EMERALD_MID)
                set_px(fx_layer, min(48, tx + d), ty, col)
                set_px(fx_layer, max(3, tx - d), ty, col)
                set_px(fx_layer, tx, min(48, ty + d), col)
                set_px(fx_layer, tx, max(3, ty - d), col)
            if eff_charge >= 2 or extra_flare > 0.0:
                for dx_c, dy_c in [(-1, -1), (1, -1), (-1, 1), (1, 1)]:
                    set_px(
                        fx_layer,
                        max(3, min(48, tx + dx_c)),
                        max(3, min(48, ty + dy_c)),
                        STAR_GOLD if (dx_c + dy_c) % 2 == 0 else EMERALD_BRIGHT,
                    )

    if arrow_mode == 'single':
        render_single_arrow(nock_x, nock_y, aim_deg, length=18.5, is_astral=False, charge=charge_level, extra_flare=bow_flare)
    elif arrow_mode == 'starfall':
        render_single_arrow(nock_x, nock_y, aim_deg, length=19.0, is_astral=True, charge=charge_level, extra_flare=bow_flare)
    elif arrow_mode == 'astral_dragon':
        render_single_arrow(nock_x, nock_y, aim_deg, length=20.0, is_astral=True, charge=charge_level, extra_flare=bow_flare)
    elif arrow_mode == 'fan3':
        for d_ang in (-13.0, 0.0, 13.0):
            render_single_arrow(
                nock_x,
                nock_y,
                aim_deg + d_ang,
                length=17.5,
                is_astral=(bow_flare > 0.0),
                charge=max(0, charge_level - (0 if d_ang == 0 else 1)),
                extra_flare=bow_flare,
            )

    if release_flash:
        fx_cx = max(4.0, min(47.0, gx + ux * 2.5))
        fx_cy = max(4.0, min(47.0, gy + uy * 2.5))
        set_px(fx_layer, fx_cx, fx_cy, (255, 255, 255, 255))
        for d in range(1, 5):
            col = STAR_GOLD if d <= 2 else EMERALD_BRIGHT
            set_px(fx_layer, max(3.0, min(48.0, fx_cx + px * d)), max(3.0, min(48.0, fx_cy + py * d)), col)
            set_px(fx_layer, max(3.0, min(48.0, fx_cx - px * d)), max(3.0, min(48.0, fx_cy - py * d)), col)
        for d in range(1, 6):
            col = (255, 255, 255, 255) if d <= 2 else (STAR_GOLD if d <= 4 else EMERALD_MID)
            set_px(fx_layer, max(3.0, min(48.0, fx_cx + ux * d)), max(3.0, min(48.0, fx_cy + uy * d)), col)

    out = composite_over(base_frame, bow_arm_layer)
    out = composite_over(out, str_layer)
    out = composite_over(out, add_outline_to_layer(bow_layer))
    out = composite_over(out, add_outline_to_layer(arrow_layer))
    out = composite_over(out, draw_arm_layer)
    out = composite_over(out, fx_layer)
    return fill_layer_pinholes(out, require_3_neighbors=True)


def render_walk_legs(tpl, f):
    """
    Renders a fluid, wide-striding 30-frame 2-step ranger walk cycle (f = 0..29) in true painter's order
    with ZERO standing thigh remnants (no extra legs!) and full flowing emerald cloak down to y = 43.
    """
    phase = (f / 30.0) * 2.0 * math.pi
    bob_y = int(round(math.cos(phase * 2.0) * 1.0))

    stand = tpl['stand'].copy()
    cape_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    # 1. Extract Flowing Emerald Cloak (x <= 18 for y < 31, x <= 12 for 31 <= y <= 43 so back leg is NEVER copied!)
    for y in range(14, 44):
        ny = y + bob_y
        if not (2 <= ny < 50):
            continue
        u = (y - 14) / 29.0
        wave_dx = int(round(-u * 1.6 + math.sin(phase - u * 3.2) * (1.2 * u)))
        wave_dy = int(round(math.cos(phase - u * 2.6) * (0.6 * u)))
        max_cx = 18 if y < 31 else 12
        for x in range(1, max_cx + 1):
            if stand[y, x, 3] == 0:
                continue
            cy = max(14, min(48, ny + wave_dy))
            cx = max(2, min(20, x + wave_dx))
            cape_layer[cy, cx] = stand[y, x]
            if x >= max_cx - 3 and y <= 35:
                cape_layer[ny, x] = stand[y, x]
    cape_layer = fill_layer_pinholes(cape_layer, x0=2, x1=21, y0=13, y1=48, require_3_neighbors=False)

    # 2. Extract Upper Torso, Head, Waist Belt & Emerald Tunic Skirt (y = 0..33)
    for y in range(0, 34):
        ny = y + bob_y
        if not (2 <= ny < 50):
            continue
        lean_dx = 1 if y <= 26 else 0
        min_tx = 16 if y < 29 else 19
        max_tx = 31 if y < 29 else 30
        for x in range(min_tx, max_tx):
            if stand[y, x, 3] > 0:
                torso_layer[ny, min(49, x + lean_dx)] = stand[y, x]

    hip_x = 25.0
    hip_y = 31.0 + bob_y

    def build_striding_leg(boot_patch, orig_cx, swing_phase, is_far_leg=False):
        layer = np.zeros((52, 52, 4), dtype=np.uint8)
        s_val = math.sin(swing_phase)
        c_val = math.cos(swing_phase)

        knee_lift = max(0.0, c_val)
        knee_x = hip_x + s_val * 4.4 + knee_lift * 2.0
        knee_y = hip_y + 5.2 - knee_lift * 1.8

        foot_target_x = 25.5 + s_val * 6.2 - knee_lift * 1.8
        foot_lift_dy = bob_y - int(round(knee_lift * 2.5))

        boot_rot_deg = s_val * 18.0 - knee_lift * 18.0
        pil_boot = Image.fromarray(boot_patch, mode='RGBA')
        rot_boot = np.array(
            pil_boot.rotate(boot_rot_deg, resample=Image.NEAREST, center=(orig_cx, 42.0)),
            dtype=np.uint8
        )

        dx_boot = int(round(foot_target_x - orig_cx))
        for y in range(38, 52):
            for x in range(4, 50):
                if rot_boot[y, x, 3] > 0:
                    ny = min(49, max(36, y + foot_lift_dy))
                    nx = min(48, max(6, x + dx_boot))
                    px_col = rot_boot[y, x].copy()
                    if is_far_leg:
                        px_col[0] = int(px_col[0] * 0.78)
                        px_col[1] = int(px_col[1] * 0.78)
                        px_col[2] = int(px_col[2] * 0.82)
                    layer[ny, nx] = px_col

        ank_x = foot_target_x + math.sin(math.radians(boot_rot_deg)) * 1.4
        ank_y = 41.5 + foot_lift_dy

        if is_far_leg:
            c_dark = (14, 34, 28, 255)
            c_mid = (24, 58, 46, 255)
            c_hi = (36, 82, 64, 255)
            c_greave = (48, 34, 26, 255)
            c_gold = GOLD_DARK
        else:
            c_dark = CLOAK_DARK
            c_mid = CLOAK_MID
            c_hi = CLOAK_LIGHT
            c_greave = LEATHER_MID
            c_gold = GOLD_BRIGHT

        for off_x, col in [(-1.8, c_dark), (-0.8, c_mid), (0.2, c_hi), (1.2, c_mid), (2.0, c_dark)]:
            draw_line_px(layer, hip_x + off_x, hip_y, knee_x + off_x * 0.85, knee_y, col)

        for off_x, col in [(-1.4, c_dark), (-0.4, c_greave), (0.6, c_greave), (1.4, c_dark)]:
            draw_line_px(layer, knee_x + off_x, knee_y, ank_x + off_x * 0.85, ank_y, col)

        set_px(layer, knee_x, knee_y, c_gold)
        set_px(layer, knee_x + 1, knee_y, c_gold)
        return fill_layer_pinholes(layer, x0=3, x1=49, y0=30, y1=50, require_3_neighbors=True)

    far_leg = build_striding_leg(tpl['leg_back'], 20.5, phase + math.pi, is_far_leg=True)
    near_leg = build_striding_leg(tpl['leg_front'], 30.5, phase, is_far_leg=False)

    # Dynamic split ranger tunic tabard at y = 31..36 swinging between the legs
    tunic_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    flap_dx = math.sin(phase) * 1.8
    for off_x, col in [(-2.0, CLOAK_DARK), (-1.0, CLOAK_MID), (0.0, CLOAK_LIGHT), (1.0, GOLD_MID)]:
        draw_line_px(
            tunic_layer,
            hip_x + off_x,
            hip_y - 1.0,
            hip_x + off_x + flap_dx,
            hip_y + 5.0,
            col
        )

    out = composite_over(far_leg, cape_layer)
    out = composite_over(out, torso_layer)
    out = composite_over(out, tunic_layer)
    out = composite_over(out, near_leg)
    return out


def draw_archer_idle_bow_tip_motes(frame, aim_deg, breath_dy, phase):
    """
    Pass #8: 3 phase-looping ((f / 30.0) * 2 * math.pi) emerald-mint & starlight-gold
    wind-motes orbiting Sylvara's upper and lower Astral Longbow tips across all 30 IDLE frames.
    """
    rad = math.radians(aim_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    px, py = -uy, ux
    gx = 33.9
    gy = 21.1 + breath_dy
    top_cx = gx - ux * 3.2 - px * 12.5
    top_cy = gy - uy * 3.2 - py * 12.5
    bot_cx = gx - ux * 3.2 + px * 12.5
    bot_cy = gy - uy * 3.2 + py * 12.5

    mote_anchors = [
        (top_cx, top_cy, 2.6, 2.2, 0.0),
        (top_cx - 1.2, top_cy + 2.2, 2.8, 2.2, (2.0 * math.pi) / 3.0),
        (bot_cx, bot_cy, 2.5, 2.0, (4.0 * math.pi) / 3.0),
    ]
    for m_idx, (cx, cy, rx, ry, phase_off) in enumerate(mote_anchors):
        ang = phase + phase_off
        mx = max(3, min(48, int(round(cx + math.cos(ang) * rx))))
        my = max(3, min(48, int(round(cy + math.sin(ang) * ry))))
        tx = max(3, min(48, int(round(cx + math.cos(ang - 0.55) * (rx * 0.85)))))
        ty = max(3, min(48, int(round(cy + math.sin(ang - 0.55) * (ry * 0.85)))))
        lead_col = STAR_GOLD if (m_idx == 0 or math.sin(ang * 2.0) > 0.25) else EMERALD_CORE
        tail_col = EMERALD_BRIGHT if m_idx % 2 == 0 else EMERALD_MID
        set_px(frame, tx, ty, tail_col)
        set_px(frame, mx, my, lead_col)


def draw_archer_walk_footstep_motes(frame, f):
    """
    Pass #8: Grounded emerald wind-leaf & star-dust footstep puffs at y = 44..46, x = 16..33
    during the two stride contact windows of Row 1 WALK (F06..F10 and F21..F25).
    """
    if 6 <= f <= 10:
        k = f - 6
        step_offset = 0
    elif 21 <= f <= 25:
        k = f - 21
        step_offset = 2
    else:
        return

    # 3 crisp wind-leaf & star-dust puffs drifting backward and upward inside x = 16..33, y = 44..46
    base_xs = [29 - k * 2 - step_offset, 24 - k - (step_offset // 2), 20 - k + step_offset]
    for p_idx, bx in enumerate(base_xs):
        px = max(16, min(33, bx))
        py = max(44, min(46, 46 - ((k + p_idx) % 3)))
        lead_col = STAR_GOLD if (p_idx + k) % 2 == 0 else EMERALD_CORE
        leaf_col = EMERALD_BRIGHT if k <= 2 else EMERALD_MID
        set_px(frame, px, py, lead_col)
        set_px(frame, max(16, min(33, px - 1)), max(44, min(46, py + (1 if py < 46 else -1))), leaf_col)
        if k <= 3:
            set_px(frame, max(16, min(33, px + 1)), py, EMERALD_MID if p_idx == 2 else EMERALD_BRIGHT)


def build_row0_idle(tpl):
    """Row 0: 30-Frame Living Sylvan Ranger IDLE."""
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        base = tpl['stand'].copy()

        breath_dy = -1 if 8 <= f <= 19 else 0
        if breath_dy == -1:
            # Duplicate row 29 when shifting upper torso (y=11..30, x=14..38) up by 1px so zero waist slit ever opens!
            upper = base[11:30, 14:38].copy()
            base[10:29, 14:38] = upper
            base[29, 14:38] = upper[18, :]
            head_slice = tpl['stand'][2:12, 14:38].copy()
            base[2:12, 14:38] = 0
            base[1:11, 14:38] = head_slice
            base[11, 14:38] = upper[0, :]
            base = fill_layer_pinholes(base)
            base = add_outline_to_layer(base)

        base = apply_cloak_wave(base, phase, amplitude=1.6, vertical_flutter=0.7)

        if f % 6 in (2, 3):
            set_px(base, 15, 5 + breath_dy, EMERALD_BRIGHT)

        aim_deg = 38.0 + math.sin(phase) * 2.8
        frame = draw_articulated_bow(
            base,
            shoulder=(29, 17 + breath_dy),
            aim_deg=aim_deg,
            draw_t=0.0,
            arrow_mode='none',
            bow_reach=9.5,
            bow_half_span=12.5
        )

        glint_t = (math.sin(phase) + 1.0) * 0.5
        gx = int(round(33 + glint_t * 9))
        gy = int(round(20 + breath_dy - glint_t * 7))
        if 2 <= gx <= 49 and 2 <= gy <= 49:
            set_px(frame, gx, gy, STAR_GOLD if f % 5 == 0 else EMERALD_CORE)

        draw_archer_idle_bow_tip_motes(frame, aim_deg, breath_dy, phase)
        frames.append(frame)
    return frames


def build_row1_walk(tpl):
    """Row 1: 30-Frame Articulated 2-Step Ranger Stride Cycle."""
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        body = render_walk_legs(tpl, f)

        bob_y = int(round(math.cos(phase * 2.0) * 1.0))
        # Natural bow arm carry swing & counter-swinging right ranger hand
        aim_deg = 30.0 - math.sin(phase) * 8.5
        hand_swing_x = int(round(26.0 - math.sin(phase) * 3.2))
        hand_swing_y = int(round(22.0 + bob_y + math.cos(phase * 2.0) * 1.0))
        frame = draw_articulated_bow(
            body,
            shoulder=(30, 17 + bob_y),
            aim_deg=aim_deg,
            draw_t=0.0,
            arrow_mode='none',
            hand_override=(hand_swing_x, hand_swing_y),
            bow_reach=9.5,
            bow_half_span=12.2
        )
        draw_archer_walk_footstep_motes(frame, f)
        frames.append(frame)
    return frames


def build_row2_auto_attack(tpl):
    """Row 2: 30-Frame Master Bowyer AUTO_ATTACK Sequence."""
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        use_aim_body = 3 <= f <= 24
        base = (tpl['aim_h'] if use_aim_body else tpl['stand']).copy()

        if f in (19, 20, 21):
            base = shift_layer(base, -1, 0)

        base = apply_cloak_wave(base, phase, amplitude=1.8 if 18 <= f <= 23 else 1.4, vertical_flutter=0.6)

        if f <= 4:
            u = f / 4.0
            aim_deg = 38.0 * (1.0 - u)
            hand_pts = [(24, 15), (20, 10), (22, 11), (31, 14), (35, 15)]
            frame = draw_articulated_bow(
                base,
                shoulder=(28, int(round(17 * (1.0 - u) + 15 * u))),
                aim_deg=aim_deg,
                draw_t=0.0,
                arrow_mode='single' if f >= 3 else 'none',
                hand_override=hand_pts[f],
                bow_reach=9.5 + u * 1.0,
                bow_half_span=12.8
            )
        elif f <= 15:
            draw_t = (f - 4) / 11.0
            charge = 1 if f >= 13 else 0
            frame = draw_articulated_bow(
                base,
                shoulder=(28, 15),
                aim_deg=0.0,
                draw_t=draw_t,
                arrow_mode='single',
                charge_level=charge,
                bow_reach=10.5,
                bow_half_span=13.0
            )
        elif f <= 18:
            charge = f - 15
            frame = draw_articulated_bow(
                base,
                shoulder=(28, 15),
                aim_deg=0.0,
                draw_t=1.0,
                arrow_mode='single',
                charge_level=charge,
                bow_reach=10.5,
                bow_half_span=13.0
            )
        elif f <= 23:
            k = f - 19
            vib_seq = [1.8, -1.2, 0.9, -0.5, 0.0]
            kick_deg = [-2.0, -6.5, -5.0, -3.0, -1.0][k]
            rel_hands = [(22, 14), (21, 13), (21, 13), (22, 14), (24, 15)]
            frame = draw_articulated_bow(
                base,
                shoulder=(27 if f <= 21 else 28, 15),
                aim_deg=kick_deg,
                draw_t=0.0,
                string_vib=vib_seq[k],
                arrow_mode='none',
                release_flash=(f == 19),
                hand_override=rel_hands[k],
                bow_reach=10.5,
                bow_half_span=13.0
            )
        else:
            u = (f - 23) / 6.0
            aim_deg = 38.0 * u
            frame = draw_articulated_bow(
                base,
                shoulder=(28 + (1 if f >= 27 else 0), int(round(15 * (1.0 - u) + 17 * u))),
                aim_deg=aim_deg,
                draw_t=0.0,
                arrow_mode='none',
                bow_reach=10.5 - u * 1.0,
                bow_half_span=12.6
            )

        frames.append(frame)
    return frames


def build_row3_skill(tpl):
    """Row 3: 30-Frame SKILL (STARFALL VOLLEY / HEAVENS' ARROW RAIN)."""
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if 4 <= f <= 25:
            base = tpl['aim_up'].copy()
        elif f == 3:
            base = tpl['aim_h'].copy()
        else:
            base = tpl['stand'].copy()

        base = apply_cloak_wave(base, phase * 2.0, amplitude=2.0, vertical_flutter=0.8)

        if f <= 3:
            u = f / 3.0
            aim_deg = 36.0 * (1.0 - u) + (-14.0) * u
            hand_pts = [(23, 14), (19, 9), (25, 12), (34, 14)]
            frame = draw_articulated_bow(
                base,
                shoulder=(28, 16),
                aim_deg=aim_deg,
                draw_t=0.0,
                arrow_mode='fan3' if f == 3 else 'none',
                hand_override=hand_pts[f],
                bow_reach=10.0,
                bow_half_span=13.0,
            )
        elif f <= 14:
            # F04..F14: Skyward 3-arrow fan draw with crisp emerald-gold astral bowstring & arrow tip star-flare on F06..F14!
            u = (f - 3) / 11.0
            draw_t = min(1.0, u)
            charge = 3 if f >= 10 else (2 if f >= 6 else 1)
            flare = 1.0 if f >= 6 else 0.0
            frame = draw_articulated_bow(
                base,
                shoulder=(28, 15),
                aim_deg=-14.0 - u * 4.0,
                draw_t=draw_t,
                arrow_mode='fan3',
                charge_level=charge,
                bow_reach=10.4,
                bow_half_span=12.8,
                bow_flare=flare,
            )
        elif f <= 17:
            # F15..F17: Skyward 3-arrow fan release flash & bowstring snap
            k = f - 15
            vib = [1.8, -1.1, 0.4][k]
            frame = draw_articulated_bow(
                base,
                shoulder=(27 if k == 0 else 28, 15),
                aim_deg=-18.0 - k * 4.0,
                draw_t=0.0,
                string_vib=vib,
                arrow_mode='none',
                release_flash=(k == 0),
                hand_override=[(21, 13), (20, 10), (26, 12)][k],
                bow_reach=10.4,
                bow_half_span=12.8,
            )
        elif f <= 23:
            # F18..F23: High-angle (-32 deg) Starfall Astral Arrow finisher draw & release
            if f <= 22:
                draw_t = (f - 17) / 5.0
                charge = 3 if f >= 21 else 2
                frame = draw_articulated_bow(
                    base,
                    shoulder=(28, 14),
                    aim_deg=-32.0,
                    draw_t=draw_t,
                    arrow_mode='starfall',
                    charge_level=charge,
                    bow_reach=10.2,
                    bow_half_span=12.8,
                    bow_flare=1.0 if f >= 19 else 0.0,
                )
            else:
                frame = draw_articulated_bow(
                    base,
                    shoulder=(27, 14),
                    aim_deg=-34.0,
                    draw_t=0.0,
                    string_vib=1.9,
                    arrow_mode='none',
                    release_flash=True,
                    hand_override=(21, 15),
                    bow_reach=10.2,
                    bow_half_span=12.8,
                )
        elif f <= 26:
            k = f - 24
            vib = [-1.2, 0.7, 0.0][k]
            frame = draw_articulated_bow(
                base,
                shoulder=(28, 14),
                aim_deg=-32.0 + (k + 1) * 3.0,
                draw_t=0.0,
                string_vib=vib,
                arrow_mode='none',
                hand_override=(22, 15),
                bow_reach=10.2,
                bow_half_span=12.8,
            )
        else:
            u = (f - 26) / 3.0
            aim_deg = -23.0 * (1.0 - u) + 38.0 * u
            frame = draw_articulated_bow(
                base,
                shoulder=(29, 16),
                aim_deg=aim_deg,
                draw_t=0.0,
                arrow_mode='none',
                bow_reach=9.8,
                bow_half_span=12.5,
            )
        frames.append(frame)
    return frames


EMERALD_CYAN = (103, 232, 249, 255)


def draw_row4_tempest_vfx(frame, f):
    """
    Renders Row 4 (ULTIMATE - Astral Hurricane) signature VFX onto `frame`:
    1. Swirling Emerald-Gold Tempest Vortex Ring at Lyra's feet (`y = 44..48, x = 12..34`) during `F02..F25`.
    2. Spiraling emerald wind-leaves & starlight motes rising around her cloak (`x = 6..18, y = 12..40`) during `F02..F24`.
    3. Coiled Emerald Wind-Dragon Crest forming around the tip of her nocked Dragon-Arrow (`F08..F17`, strictly `x <= 48, y >= 3`).
    4. Explosive Sonic Gale Shockwave upon release (`F18..F22`, strictly `x <= 48, y >= 3`).
    """
    out = frame.copy()

    # 1. Swirling Emerald-Gold Tempest Vortex Ring at feet (y = 44..48, x = 12..34)
    if 2 <= f <= 25:
        vortex_scale = min(1.0, (f - 1) / 3.0) if f <= 4 else (max(0.3, (26 - f) / 4.0) if f >= 23 else 1.0)
        cx, cy = 23.0, 46.0
        rx = 10.5 * vortex_scale
        ry = 1.8 * vortex_scale
        steps_v = 36
        for i in range(steps_v):
            ang = (i / float(steps_v)) * 2.0 * math.pi
            vx = max(12.0, min(34.0, cx + math.cos(ang) * rx))
            vy = max(44.0, min(48.0, cy + math.sin(ang) * ry))
            sw = (i + f * 3) % 8
            if sw in (0, 1):
                col = STAR_GOLD
            elif sw in (2, 3):
                col = EMERALD_CORE
            elif sw in (4, 5):
                col = EMERALD_BRIGHT
            else:
                col = EMERALD_MID
            set_px(out, vx, vy, col)
            # Inner counter-rotating vortex ring
            vx_in = max(14.0, min(32.0, cx + math.cos(ang - f * 0.4) * (rx * 0.62)))
            vy_in = max(45.0, min(48.0, cy + math.sin(ang - f * 0.4) * (ry * 0.55)))
            if (i + f * 2) % 3 == 0:
                set_px(out, vx_in, vy_in, STAR_GOLD if (i + f) % 2 == 0 else EMERALD_BRIGHT)

        # Upward-curling vortex rim wind-tongues & updraft spirals (x=12..34, y=40..46) cradling her boots
        if 4 <= f <= 22:
            curl_h = 3 + (f % 2)
            for dy_c in range(curl_h + 1):
                set_px(out, 12 + (dy_c // 2), 46 - dy_c, EMERALD_BRIGHT if dy_c < curl_h else STAR_GOLD)
                set_px(out, 13 + (dy_c // 2), 46 - dy_c, EMERALD_MID)
                set_px(out, 34 - (dy_c // 2), 46 - dy_c, EMERALD_BRIGHT if dy_c < curl_h else STAR_GOLD)
                set_px(out, 33 - (dy_c // 2), 46 - dy_c, EMERALD_MID)
            for u_i in range(3):
                ux_p = 17 + ((f * 2 + u_i * 5) % 13)
                uy_p = 42 + ((f + u_i) % 3)
                set_px(out, ux_p, uy_p, STAR_GOLD if u_i == 0 else EMERALD_BRIGHT)
                set_px(out, ux_p + 1, uy_p + 1, EMERALD_MID)

    # 2. Spiraling emerald wind-leaves & starlight motes rising around her cloak (x = 6..18, y = 12..40)
    if 2 <= f <= 24:
        for y in range(13, 40):
            u = (39.0 - y) / 26.0
            sx1 = 12.0 + math.sin(u * 5.2 - f * 0.55) * 4.5
            sx1 = max(6.0, min(18.0, sx1))
            if (y + f * 2) % 3 != 0:
                c1 = STAR_GOLD if (y + f) % 5 == 0 else (EMERALD_BRIGHT if (y + f) % 2 == 0 else EMERALD_MID)
                set_px(out, sx1, y, c1)
                set_px(out, max(6.0, sx1 - 1.0), y, EMERALD_MID)

        # 4 ascending sylvan wind-leaves & starlight motes (x = 6..18, y = 12..40)
        for leaf_i in range(4):
            ly = 39 - ((f * 2 + leaf_i * 7) % 27)
            lx = 7 + int(round((math.sin(f * 0.45 + leaf_i * 1.6) + 1.0) * 4.5))
            lx = max(6, min(17, lx))
            ly = max(12, min(39, ly))
            set_px(out, lx, ly, EMERALD_BRIGHT)
            set_px(out, min(18, lx + 1), max(12, ly - 1), STAR_GOLD if leaf_i % 2 == 0 else EMERALD_CORE)
            set_px(out, max(6, lx - 1), min(40, ly + 1), EMERALD_MID)

    # 3. Coiled Emerald Wind-Dragon Crest around nocked Dragon-Arrow (F08..F17, strictly x <= 48, y >= 3)
    if 8 <= f <= 17:
        g = min(1.0, (f - 7) / 3.0)
        # Coiled serpentine wind-dragon body spiraling along the arrow shaft (x = 31..43)
        for sx in range(31, 44):
            wave = math.sin((sx - 31) * 0.7 - f * 0.65)
            sy = max(4, min(47, int(round(14.5 + wave * (3.2 * g)))))
            set_px(out, sx, sy, EMERALD_BRIGHT if wave >= 0 else EMERALD_MID)
            set_px(out, sx, max(3, sy - 1), STAR_GOLD if wave > 0.25 else EMERALD_CORE)

        # Coiled Wind-Dragon Head & Jaws at arrow tip (x = 39..48, y = 6..22)
        horn_top_y = max(5, int(round(12 - 5.0 * g)))
        jaw_bot_y = min(22, int(round(16 + 5.0 * g)))
        # Swept-back upper dragon horn & emerald mane crest
        draw_line_px(out, 45, 12, 39, horn_top_y, STAR_GOLD)
        draw_line_px(out, 45, 13, 40, min(47, horn_top_y + 1), EMERALD_BRIGHT)
        draw_line_px(out, 42, 11, 37, max(5, horn_top_y + 1), EMERALD_MID)
        # Upper dragon snout & glowing eye
        draw_line_px(out, 43, 13, 48, 13, EMERALD_CORE)
        draw_line_px(out, 44, 14, 48, 14, STAR_GOLD)
        set_px(out, 44, 12, (255, 255, 255, 255))
        set_px(out, 43, 12, STAR_GOLD)
        # Lower roaring dragon jaw & beard crest
        draw_line_px(out, 43, 16, 47, 16, EMERALD_BRIGHT)
        draw_line_px(out, 44, 16, 39, jaw_bot_y, STAR_GOLD)
        draw_line_px(out, 45, 17, 40, max(3, jaw_bot_y - 1), EMERALD_MID)
        # Swirling dragon vortex halo around tip
        for i in range(12):
            ang = (i / 12.0) * 2.0 * math.pi + f * 0.5
            hx = max(36.0, min(48.0, 43.0 + math.cos(ang) * (4.5 * g)))
            hy = max(5.0, min(23.0, 14.5 + math.sin(ang) * (5.5 * g)))
            set_px(out, hx, hy, STAR_GOLD if i % 3 == 0 else EMERALD_BRIGHT)

    # 4. Explosive Sonic Gale Shockwave upon release (F18..F22, strictly x <= 48, y >= 3)
    elif 18 <= f <= 22:
        k = f - 18  # 0..4
        cx_sw = min(46.0, 39.0 + k * 1.8)
        cy_sw = 15.0
        rx_sw = 2.2
        ry_sw = min(11.0, 6.5 + k * 1.1)
        steps_s = 32
        for i in range(steps_s):
            ang = (i / float(steps_s)) * 2.0 * math.pi
            sx = max(3.0, min(48.0, cx_sw + math.cos(ang) * rx_sw))
            sy = max(3.0, min(48.0, cy_sw + math.sin(ang) * ry_sw))
            col = (255, 255, 255, 255) if (i + k) % 4 == 0 else (STAR_GOLD if (i + k) % 2 == 0 else EMERALD_BRIGHT)
            set_px(out, sx, sy, col)
            set_px(out, max(3.0, sx - 1.0), sy, EMERALD_MID if (i % 2 == 0) else EMERALD_BRIGHT)

        # Secondary inner sonic ring
        cx_in = max(34.0, cx_sw - 3.5)
        ry_in = max(3.5, ry_sw - 2.5)
        for i in range(20):
            ang = (i / 20.0) * 2.0 * math.pi
            sx = max(3.0, min(48.0, cx_in + math.cos(ang) * 1.5))
            sy = max(3.0, min(48.0, cy_sw + math.sin(ang) * ry_in))
            set_px(out, sx, sy, STAR_GOLD if i % 2 == 0 else EMERALD_CORE)

        # Horizontal sonic gale blast streaks (x = 34..48)
        for by, bcol in [(8, EMERALD_BRIGHT), (11, STAR_GOLD), (15, (255, 255, 255, 255)), (19, STAR_GOLD), (22, EMERALD_BRIGHT)]:
            x0_b = min(45, 34 + k * 2)
            draw_line_px(out, x0_b, by, 48, by, bcol)

    return out


def build_row4_ultimate(tpl):
    """Row 4: 30-Frame Dedicated ULTIMATE (ASTRAL HURRICANE / TEMPEST DRAGON SHOT)."""
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi

        if f <= 3:
            crouch_dy = [0, 1, 2, 1][f]
            leg_tuck = 0.0
        elif f <= 9:
            crouch_dy = 0
            leg_tuck = ((f - 3) / 6.0) * 0.55
        elif f <= 22:
            crouch_dy = 0
            leg_tuck = 0.55
        else:
            crouch_dy = [0, 0, 1, 2, 1, 0, 0][f - 23]
            leg_tuck = max(0.0, (1.0 - (f - 22) / 5.0) * 0.55)

        recoil_dx = -1 if 18 <= f <= 21 else 0

        if leg_tuck > 0.05:
            base = make_jump_body(tpl, 0, leg_tuck)
        elif crouch_dy > 0:
            base = make_crouch_body(tpl, crouch_dy)
        else:
            base = tpl['stand'].copy()

        if recoil_dx != 0:
            base = shift_layer(base, recoil_dx, 0)

        base = apply_cloak_wave(base, phase * 2.0, amplitude=2.3, vertical_flutter=1.1)

        if f <= 3:
            wings = f * 0.15
        elif f <= 22:
            wings = min(1.0, 0.5 + (f - 3) * 0.08)
        else:
            wings = max(0.0, 1.0 - (f - 22) / 7.0)

        sh_x = 28 + recoil_dx
        sh_y = 16 + crouch_dy

        if f <= 3:
            aim_deg = 36.0 - f * 9.0
            frame = draw_articulated_bow(
                base,
                shoulder=(sh_x, sh_y),
                aim_deg=aim_deg,
                draw_t=0.0,
                astral_wings=wings,
                hand_override=(20, 11 + crouch_dy),
                bow_reach=10.0,
                bow_half_span=12.5,
            )
        elif f <= 17:
            # F04..F17: Full horizontal Dragon-Arrow draw with crisp emerald-gold astral bowstring & arrow tip star-flare!
            draw_t = min(1.0, (f - 3) / 11.0)
            charge = 3 if f >= 10 else (2 if f >= 6 else 1)
            flare = 1.0 if f >= 6 else 0.0
            frame = draw_articulated_bow(
                base,
                shoulder=(sh_x, sh_y),
                aim_deg=-2.0,
                draw_t=draw_t,
                arrow_mode='astral_dragon',
                charge_level=charge,
                astral_wings=wings,
                bow_reach=10.5,
                bow_half_span=12.8,
                bow_flare=flare,
            )
        elif f <= 23:
            k = f - 18
            vib = [2.2, -1.5, 1.1, -0.7, 0.3, 0.0][k]
            frame = draw_articulated_bow(
                base,
                shoulder=(sh_x, sh_y),
                aim_deg=-4.0 + k * 0.8,
                draw_t=0.0,
                string_vib=vib,
                arrow_mode='none',
                release_flash=(k == 0),
                astral_wings=wings,
                hand_override=(20, 14),
                bow_reach=10.5,
                bow_half_span=12.8,
            )
        else:
            u = (f - 23) / 6.0
            aim_deg = 38.0 * u
            frame = draw_articulated_bow(
                base,
                shoulder=(sh_x + (1 if f >= 27 else 0), sh_y),
                aim_deg=aim_deg,
                draw_t=0.0,
                astral_wings=wings,
                bow_reach=10.0,
                bow_half_span=12.4,
            )

        frame = draw_row4_tempest_vfx(frame, f)
        frames.append(frame)
    return frames


def draw_archer_ward_shatter_sparks(frame, f):
    """
    Pass #8: Crisp 4-ray Elemental Ward-Shatter Spark Burst at chest height (x = 26..33, y = 18..25)
    on F01..F05 of Row 5 (DEATH & HURT) that expands and fades across F01..F05.
    """
    if not (1 <= f <= 5):
        return
    k = f - 1  # 0..4
    cx, cy = 29.5, 21.5

    # Central impact flash on F01..F02
    if k <= 1:
        core_col = (255, 255, 255, 255) if k == 0 else STAR_GOLD
        for dx_c in (0, 1):
            for dy_c in (0, 1):
                set_px(frame, 29 + dx_c, 21 + dy_c, core_col)
    elif k == 2:
        set_px(frame, 29, 21, STAR_GOLD)
        set_px(frame, 30, 22, EMERALD_BRIGHT)

    # 4 expanding diagonal/cardinal ward-shatter rays strictly inside x = 26..33, y = 18..25
    r_in = max(0.5, k * 0.7)
    r_out = min(3.5, 1.4 + k * 0.6)
    ray_dirs = [(-1.0, -1.0), (1.0, -1.0), (-1.0, 1.0), (1.0, 1.0)]
    for r_idx, (rx_d, ry_d) in enumerate(ray_dirs):
        x0 = max(26, min(33, int(round(cx + rx_d * r_in))))
        y0 = max(18, min(25, int(round(cy + ry_d * r_in))))
        x1 = max(26, min(33, int(round(cx + rx_d * r_out))))
        y1 = max(18, min(25, int(round(cy + ry_d * r_out))))
        ray_col = STAR_GOLD if k <= 1 else (EMERALD_BRIGHT if k <= 3 else EMERALD_MID)
        tip_col = (255, 255, 255, 255) if k == 0 else (STAR_GOLD if k <= 2 else EMERALD_BRIGHT)
        draw_line_px(frame, x0, y0, x1, y1, ray_col)
        set_px(frame, x1, y1, tip_col)
        if k <= 2:
            # Secondary cardinal ward-ring glint inside 26..33, 18..25
            cx_card = max(26, min(33, int(round(cx + (rx_d if r_idx % 2 == 0 else 0.0) * (1.2 + k * 0.6)))))
            cy_card = max(18, min(25, int(round(cy + (ry_d if r_idx % 2 == 1 else 0.0) * (1.2 + k * 0.6)))))
            set_px(frame, cx_card, cy_card, EMERALD_CORE if k == 0 else EMERALD_BRIGHT)


def build_row5_death(tpl):
    """
    Row 5: 30-Frame Dedicated DEATH Sequence:
    - F00..F05: Hit-stagger recoil
    - F06..F13: Drops to her knees (`make_crouch_body`)
    - F14..F17: Kneeling stagger (`kneel` anchored at `y = 46..47`), torso and bow sinking lower
    - F18..F23: Grounded floor collapse anchored at `y = 46` (smoothly lowering her torso, cloak,
      and bow onto the floor with ZERO mid-air floating rotation!)
    - F24..F29: Fallen ranger pose (`fall` anchored at `y = 46..47`) with golden bow resting beside her.
    """
    frames = []
    for f in range(30):
        if f <= 5:
            u = f / 5.0
            dx = -int(round(u * 2.0))
            dy = int(round(u * 2.0))
            base = shift_layer(tpl['stand'], dx, dy)
            base = apply_cloak_wave(base, u * math.pi, amplitude=1.6, vertical_flutter=0.5)
            frame = draw_articulated_bow(
                base,
                shoulder=(29 + dx, 17 + dy),
                aim_deg=40.0 + u * 24.0,
                draw_t=0.0,
                bow_reach=9.0,
                bow_half_span=11.8,
            )
            draw_archer_ward_shatter_sparks(frame, f)
            frames.append(frame)

        elif f <= 13:
            u = (f - 6) / 7.0
            base = make_crouch_body(tpl, 5 if f <= 9 else 6)
            base = apply_cloak_wave(base, u * math.pi, amplitude=0.9, vertical_flutter=0.25)
            bow_deg = 52.0 + u * 16.0
            frame = draw_articulated_bow(
                base,
                shoulder=(28, 21 + (1 if f >= 10 else 0)),
                aim_deg=bow_deg,
                draw_t=0.0,
                bow_reach=8.5,
                bow_half_span=11.0,
            )
            frames.append(frame)

        elif f <= 17:
            # F14..F17: Deep kneeling stagger anchored on the floor (lowering torso & bow prior to floor collapse)
            k = f - 14  # 0..3
            extra_drop = k + 1  # 1..4
            crouch6 = make_crouch_body(tpl, 6)
            base = np.zeros((52, 52, 4), dtype=np.uint8)
            for sy in range(8, 50):
                for sx in range(2, 48):
                    if crouch6[sy, sx, 3] > 0:
                        if sy <= 34:
                            ny = min(45, sy + extra_drop)
                            nx = min(48, sx + (1 if (extra_drop >= 2 and sy <= 24) else 0))
                        else:
                            ny = min(46, int(round(34 + extra_drop + (sy - 34) * ((46.0 - (34 + extra_drop)) / 15.0))))
                            nx = sx
                        base[ny, nx] = crouch6[sy, sx]
            base = fill_layer_pinholes(base, require_3_neighbors=False)
            base = apply_cloak_wave(base, (k / 4.0) * math.pi, amplitude=0.7, vertical_flutter=0.2)
            frame = draw_articulated_bow(
                base,
                shoulder=(28 + (1 if k >= 2 else 0), 22 + extra_drop),
                aim_deg=68.0 + k * 4.0,
                draw_t=0.0,
                bow_reach=8.0,
                bow_half_span=10.2,
            )
            frames.append(frame)

        elif f <= 23:
            # F18..F23: Grounded floor collapse anchored at y = 46 (ZERO mid-air floating rotation!)
            k = f - 18  # 0..5
            v_scales = [0.72, 0.58, 0.46, 0.36, 0.28, 0.22]
            h_shears = [0.14, 0.21, 0.28, 0.35, 0.41, 0.46]
            v_sc = v_scales[k]
            h_sh = h_shears[k]

            crouch6 = make_crouch_body(tpl, 6)
            frame = np.zeros((52, 52, 4), dtype=np.uint8)
            for sy in range(8, 50):
                h_above = max(0, 48 - sy)
                ny = max(18, min(46, 46 - int(round(h_above * v_sc))))
                for sx in range(2, 46):
                    if crouch6[sy, sx, 3] > 0:
                        dx_s = int(round(h_above * h_sh)) if sx >= 15 else int(round(h_above * h_sh * 0.42))
                        nx = max(3, min(46, sx + dx_s))
                        frame[ny, nx] = crouch6[sy, sx]
                        if ny + 1 <= 46 and frame[ny + 1, nx, 3] == 0:
                            frame[ny + 1, nx] = crouch6[sy, sx]

            # On F22..F23 (k=4..5), blend in the grounded horizontal fallen cloak/body contours at y=36..46
            if k >= 4:
                fall_anchored = shift_layer(tpl['fall'], 0, -2 if k == 4 else -1)
                for fy in range(35, 48):
                    for fx in range(2, 48):
                        if fall_anchored[fy, fx, 3] > 0 and frame[fy, fx, 3] == 0:
                            frame[min(46, fy), fx] = fall_anchored[fy, fx]

            frame = fill_layer_pinholes(frame, x0=2, x1=48, y0=18, y1=47, require_3_neighbors=False)

            # Lower her Golden Elven Greatbow onto the floor in front of her (y=42..46, x=28..45)
            bow_y = min(46, 41 + k)
            bow_floor = np.zeros((52, 52, 4), dtype=np.uint8)
            draw_line_px(bow_floor, 29, min(46, bow_y + 1), 37, max(38, bow_y - 1), GOLD_MID)
            draw_line_px(bow_floor, 37, max(38, bow_y - 1), 45, min(46, bow_y + 1), GOLD_MID)
            draw_line_px(bow_floor, 30, bow_y, 44, bow_y, WOOD_DARK)
            set_px(bow_floor, 37, max(38, bow_y - 1), EMERALD_BRIGHT if k <= 2 else EMERALD_MID)
            frame = composite_over(frame, bow_floor)
            frames.append(frame)

        else:
            # F24..F29: Fallen ranger pose anchored at y = 46..47 with golden bow resting on the floor
            k = f - 24
            frame = shift_layer(tpl['fall'], 0, -2 if k == 0 else -1)

            bow_floor = np.zeros((52, 52, 4), dtype=np.uint8)
            draw_line_px(bow_floor, 30, 46, 38, 44, GOLD_MID)
            draw_line_px(bow_floor, 38, 44, 46, 46, GOLD_MID)
            draw_line_px(bow_floor, 31, 45, 45, 45, WOOD_DARK)
            gem_col = EMERALD_BRIGHT if k <= 1 else (EMERALD_MID if k <= 3 else EMERALD_DEEP)
            set_px(bow_floor, 38, 44, gem_col)
            # Fading emerald spirit-mote drifting along the fallen bow so every frame F24..F29 is unique
            set_px(bow_floor, 35 + k, 43 - (k % 2), STAR_GOLD if k <= 1 else EMERALD_MID)
            bow_floor = add_outline_to_layer(bow_floor)
            frame = composite_over(frame, bow_floor)
            frames.append(frame)

    return frames


def draw_row6_dash_slipstream(frame, f, vault_arc=0):
    """
    Renders Row 6 (DASH - Gale Stride) VFX onto `frame`:
    - During `F03..F20`: Horizontal Emerald-Cyan & Star-Gold Gale Slipstream Streaks + Floating Sylvan
      Feather/Leaf Motes (`x = 4..16, y = 14..42`) trailing behind her billowing cloak.
    - During `F11..F15`: Crisp mid-dash snap-arrow release flash & forward sonic gale ring (`x = 37..48, y = 10..24`).
    """
    out = frame.copy()

    if 3 <= f <= 20:
        # 1. Horizontal Emerald-Cyan & Star-Gold Gale Slipstream Streaks (x = 4..16, y = 14..42)
        streak_rows = [16, 21, 27, 33, 39]
        for idx, base_y in enumerate(streak_rows):
            if f >= 19 and idx % 2 == 1:
                continue
            sy = max(14, min(42, base_y + ((f + idx) % 3) - 1 + vault_arc))
            x0 = max(4, min(11, 4 + ((f * 2 + idx * 3) % 6)))
            x1 = max(x0 + 3, min(16, x0 + 5 + ((f + idx) % 3)))
            lead_col = STAR_GOLD if (idx + f) % 2 == 0 else EMERALD_CYAN
            mid_col = EMERALD_BRIGHT if (idx + f) % 2 == 0 else EMERALD_CYAN
            draw_line_px(out, x0, sy, x1, sy, mid_col)
            set_px(out, x1, sy, lead_col)
            set_px(out, max(4, x1 - 1), sy, lead_col)
            set_px(out, x0, sy, EMERALD_MID)
            if sy + 1 <= 42:
                set_px(out, max(4, min(16, (x0 + x1) // 2)), sy + 1, EMERALD_DEEP)

        # 2. Floating Sylvan Feather/Leaf Motes trailing behind cloak (x = 4..16, y = 14..42)
        for m_i in range(3):
            mx = 5 + ((f * 3 + m_i * 4) % 10)  # 5..14
            my = 15 + ((f * 2 + m_i * 9) % 25)  # 15..39
            mx = max(4, min(15, mx))
            my = max(15, min(41, my))
            set_px(out, mx, my, EMERALD_BRIGHT)
            set_px(out, min(16, mx + 1), max(14, my - 1), STAR_GOLD if (m_i + f) % 2 == 0 else EMERALD_CYAN)
            set_px(out, max(4, mx - 1), min(42, my + 1), EMERALD_MID)

    # 3. Crisp Mid-Dash Snap-Arrow Release Flash at F11..F15 (strictly inside x <= 48, y >= 3)
    if 11 <= f <= 15:
        k_rel = f - 11  # 0..4
        cy_f = max(12, min(24, 17 + vault_arc))
        cx_ring = min(46, 39 + k_rel * 2)
        ry_ring = max(3.0, 5.5 - k_rel * 0.5)
        for i in range(18):
            ang = (i / 18.0) * 2.0 * math.pi
            rx_p = max(36.0, min(48.0, cx_ring + math.cos(ang) * 1.6))
            ry_p = max(6.0, min(30.0, cy_f + math.sin(ang) * ry_ring))
            set_px(out, rx_p, ry_p, STAR_GOLD if (i + k_rel) % 2 == 0 else EMERALD_CYAN)

        # High-velocity snap-arrow bolt & muzzle star flash
        if k_rel <= 2:
            fx_x = 38 + k_rel
            set_px(out, fx_x, cy_f, (255, 255, 255, 255))
            for d in range(1, 4 - k_rel):
                set_px(out, fx_x, max(4, cy_f - d), STAR_GOLD if d == 1 else EMERALD_BRIGHT)
                set_px(out, fx_x, min(47, cy_f + d), STAR_GOLD if d == 1 else EMERALD_BRIGHT)
        bolt_x0 = min(44, 38 + k_rel * 2)
        draw_line_px(out, bolt_x0, cy_f, 48, cy_f, (255, 255, 255, 255) if k_rel <= 1 else STAR_GOLD)
        draw_line_px(out, max(36, bolt_x0 - 1), cy_f - 1, 47, cy_f - 1, EMERALD_CYAN)
        draw_line_px(out, max(36, bolt_x0 - 1), cy_f + 1, 47, cy_f + 1, EMERALD_BRIGHT)

    return out


def build_row6_dash(tpl):
    """Row 6: 30-Frame Dedicated DASH (GALE STRIDE) Sequence."""
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 4:
            u = f / 4.0
            crouch_dy = [0, 1, 2, 2, 1][f]
            src_body = tpl['stand'] if f <= 2 else tpl['dash']
            base = shift_layer(src_body, 0, crouch_dy)
            base = apply_cloak_wave(base, phase * 2.0, amplitude=1.8, is_dash=(f >= 3))
            frame = draw_articulated_bow(
                base,
                shoulder=(29 + (3 if f >= 3 else 0), 17 + crouch_dy),
                aim_deg=38.0 - u * 18.0,
                draw_t=0.0,
                bow_reach=9.5,
                bow_half_span=12.0
            )
            frame = draw_row6_dash_slipstream(frame, f, vault_arc=crouch_dy)
            frames.append(frame)

        elif f <= 18:
            k = f - 5
            vault_arc = -int(round(math.sin((k / 13.0) * math.pi) * 2.0))
            base = shift_layer(tpl['dash'], 0, vault_arc)
            base = apply_cloak_wave(base, k * 0.9, amplitude=2.2, is_dash=True)

            if 6 <= f <= 10:
                draw_t = (f - 5) / 5.0
                frame = draw_articulated_bow(
                    base,
                    shoulder=(32, 17 + vault_arc),
                    aim_deg=6.0,
                    draw_t=draw_t,
                    arrow_mode='single',
                    charge_level=3 if f == 10 else (2 if f >= 8 else 1),
                    bow_reach=9.0,
                    bow_half_span=11.5,
                    bow_flare=1.0 if f >= 8 else 0.0,
                )
            elif 11 <= f <= 15:
                k_rel = f - 11
                vib_seq = [1.8, -1.3, 0.9, -0.5, 0.2]
                frame = draw_articulated_bow(
                    base,
                    shoulder=(32, 17 + vault_arc),
                    aim_deg=4.0 + k_rel * 1.5,
                    draw_t=0.0,
                    string_vib=vib_seq[k_rel],
                    arrow_mode='none',
                    release_flash=(k_rel <= 1),
                    bow_reach=9.0,
                    bow_half_span=11.5,
                    bow_flare=1.0 if k_rel <= 1 else 0.0,
                )
            else:
                frame = draw_articulated_bow(
                    base,
                    shoulder=(32, 17 + vault_arc),
                    aim_deg=16.0,
                    draw_t=0.0,
                    bow_reach=9.0,
                    bow_half_span=11.5
                )
            frame = draw_row6_dash_slipstream(frame, f, vault_arc=vault_arc)
            frames.append(frame)

        elif f <= 24:
            k = f - 19
            slide_dy = [2, 2, 1, 1, 0, 0][k]
            base = shift_layer(tpl['aim_h'], 0, slide_dy)
            base = apply_cloak_wave(base, phase * 2.0, amplitude=1.9, vertical_flutter=0.8)
            frame = draw_articulated_bow(
                base,
                shoulder=(28, 15 + slide_dy),
                aim_deg=6.0 + k * 4.0,
                draw_t=0.0,
                bow_reach=10.0,
                bow_half_span=12.5
            )
            frame = draw_row6_dash_slipstream(frame, f, vault_arc=slide_dy)
            frames.append(frame)

        else:
            u = (f - 24) / 5.0
            base = apply_cloak_wave(tpl['stand'].copy(), phase, amplitude=1.5, vertical_flutter=0.6)
            frame = draw_articulated_bow(
                base,
                shoulder=(29, 17),
                aim_deg=26.0 + u * 12.0,
                draw_t=0.0,
                bow_reach=9.5,
                bow_half_span=12.5
            )
            frames.append(frame)

    return frames


def make_crouch_body(tpl, crouch_depth):
    """
    Constructs a seamless, continuous knee-bend crouched ranger body from `tpl['stand']`
    with `crouch_depth` in [1..6] logical pixels:
    - Shifts upper torso, hood, and cloak (ny <= 27 + d) down by `d` with a subtle 1px forward athletic lean.
    - Compresses the thighs and knees (ny = 28 + d .. 42) via inverse-mapped vertical warp with a forward knee bend.
    - Keeps boots anchored cleanly at the ground line (ny = 43..49).
    """
    stand = tpl['stand']
    d = max(0, min(6, int(round(crouch_depth))))
    if d == 0:
        return stand.copy()

    canvas = np.zeros((52, 52, 4), dtype=np.uint8)
    for ny in range(1, 50):
        if ny <= 27 + d:
            sy = ny - d
            if 1 <= sy < 50:
                dx = 1 if (d >= 3 and sy <= 25) else 0
                for x in range(1, 50):
                    if stand[sy, x, 3] > 0:
                        canvas[ny, min(49, x + dx)] = stand[sy, x]
        elif ny <= 42:
            u = (ny - (27 + d)) / float(max(1, 42 - (27 + d)))
            sy = min(42, max(28, int(round(27.0 + u * 15.0))))
            knee_bend = math.sin(u * math.pi) * (d * 0.35)
            for x in range(1, 50):
                if stand[sy, x, 3] > 0:
                    if x >= 23:
                        dx = int(round(knee_bend))
                    elif x <= 16:
                        dx = -int(round(knee_bend * 0.35))
                    else:
                        dx = 0
                    canvas[ny, max(2, min(49, x + dx))] = stand[sy, x]
        else:
            for x in range(1, 50):
                if stand[ny, x, 3] > 0:
                    canvas[ny, x] = stand[ny, x]

    canvas = fill_layer_pinholes(canvas, require_3_neighbors=False)
    return strip_isolated_pixels(canvas)


def draw_row7_gale_ward_ring(frame, f):
    """
    Renders Row 7 (CROUCH - Stealth & Sniper Aim) Gale-Ward Ring VFX onto `frame`:
    - During `F00..F10`: Spinning vertical Emerald-Gold Wind-Rose / Gale-Ward Deflection Ring
      (`cx = 36, cy = 26, rx = 3, ry = 8`) in front of her crouched bow with 4 rotating Wind-Rose petals.
    - During `F11..F17`: Shatters into a forward-surging sonic ring + wind-rose shards & sniper arrow trail!
    """
    out = frame.copy()

    if 0 <= f <= 10:
        cx, cy = 36.0, 26.0
        rx, ry = 3.0, 8.0
        steps_r = 28
        for i in range(steps_r):
            ang = (i / float(steps_r)) * 2.0 * math.pi
            px = max(3.0, min(48.0, cx + math.cos(ang) * rx))
            py = max(3.0, min(48.0, cy + math.sin(ang) * ry))
            sw = (i + f * 3) % 8
            if sw in (0, 1):
                col = STAR_GOLD
            elif sw in (2, 3):
                col = EMERALD_CORE
            elif sw in (4, 5):
                col = EMERALD_BRIGHT
            else:
                col = EMERALD_MID
            set_px(out, px, py, col)

        # 4 rotating Wind-Rose compass petals / spokes inside and crowning the ring
        for p in range(4):
            ang_p = f * 0.55 + p * (math.pi * 0.5)
            ix0 = cx + math.cos(ang_p) * 1.0
            iy0 = cy + math.sin(ang_p) * 2.5
            ix1 = cx + math.cos(ang_p) * (rx + 0.8)
            iy1 = cy + math.sin(ang_p) * (ry + 0.8)
            draw_line_px(out, ix0, iy0, ix1, iy1, STAR_GOLD if p % 2 == 0 else EMERALD_BRIGHT)
        set_px(out, cx, cy, (255, 255, 255, 255) if f >= 6 else STAR_GOLD)
        set_px(out, cx, max(3.0, cy - ry - 1.0), STAR_GOLD)
        set_px(out, cx, min(48.0, cy + ry + 1.0), STAR_GOLD)

    elif 11 <= f <= 17:
        k = f - 11  # 0..6
        # Forward-surging shattered sonic ring
        cx_s = min(46.0, 38.0 + k * 1.35)
        cy_s = 24.0
        rx_s = 2.4
        ry_s = max(4.5, 8.0 - k * 0.45)
        steps_s = 24
        for i in range(steps_s):
            # Shatter gaps open as k increases
            if k >= 3 and (i + k) % 4 == 0:
                continue
            ang = (i / float(steps_s)) * 2.0 * math.pi
            px = max(3.0, min(48.0, cx_s + math.cos(ang) * rx_s))
            py = max(3.0, min(48.0, cy_s + math.sin(ang) * ry_s))
            col = (255, 255, 255, 255) if (i + k) % 4 == 0 else (STAR_GOLD if (i + k) % 2 == 0 else EMERALD_BRIGHT)
            set_px(out, px, py, col)

        # Outward-bursting Wind-Rose shards & piercing low sniper arrow laser trail
        for sh_i, sh_y in enumerate([16, 20, 24, 28, 32]):
            sx0 = min(45, 36 + k * 2 + (sh_i % 2))
            sx1 = min(48, sx0 + 2)
            draw_line_px(out, sx0, sh_y, sx1, sh_y, STAR_GOLD if sh_i % 2 == 0 else EMERALD_BRIGHT)
        if k <= 3:
            draw_line_px(out, 36 + k * 2, 22, 48, 22, (255, 255, 255, 255) if k <= 1 else STAR_GOLD)
            draw_line_px(out, 35 + k * 2, 23, 47, 23, EMERALD_BRIGHT)

    return out


def build_row7_crouch(tpl):
    """
    Row 7: 30-Frame Dedicated CROUCH Sequence (RANGER STEALTH CROUCH & LOW-PROFILE SNIPER SHOT):
    - Frames 0..10:  Low stealth crouch & knee-braced sniper bow draw with spinning vertical
                     Emerald-Gold Wind-Rose / Gale-Ward Deflection Ring (`cx=36, cy=26, rx=3, ry=8`)
    - Frames 11..17: Low sniper arrow release flash, string snap & Gale-Ward Ring shattering into a forward sonic ring!
    - Frames 18..22: Crouched stealth camouflage shimmer & overwatch recovery
    - Frames 23..29: Smooth push-off from bent knee back to upright ready stance (depth: 5 -> 0px)
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 2:
            depths = [3, 4, 5]
            d = depths[f]
            base = make_crouch_body(tpl, d)
            base = apply_cloak_wave(base, phase, amplitude=1.1, vertical_flutter=0.3)
            aim_deg = [14.0, 6.0, 0.0][f]
            draw_t = [0.15, 0.30, 0.45][f]
            frame = draw_articulated_bow(
                base,
                shoulder=(29, 16 + d),
                aim_deg=aim_deg,
                draw_t=draw_t,
                arrow_mode='single',
                charge_level=1 if f == 2 else 0,
                bow_reach=10.2,
                bow_half_span=11.5
            )
            frame = draw_row7_gale_ward_ring(frame, f)
            frames.append(frame)

        elif f <= 10:
            d = 5
            base = make_crouch_body(tpl, d)
            base = apply_cloak_wave(base, phase, amplitude=1.0, vertical_flutter=0.25)
            draw_t = 0.50 + ((f - 3) / 7.0) * 0.50  # 0.50 -> 1.00
            charge = 3 if f >= 8 else (2 if f >= 5 else 1)
            frame = draw_articulated_bow(
                base,
                shoulder=(29, 16 + d),
                aim_deg=0.0,
                draw_t=draw_t,
                arrow_mode='single',
                charge_level=charge,
                bow_reach=10.2,
                bow_half_span=11.5,
                bow_flare=1.0 if f >= 6 else 0.0,
            )
            frame = draw_row7_gale_ward_ring(frame, f)
            frames.append(frame)

        elif f <= 17:
            d = 5
            k = f - 11  # 0..6
            base = make_crouch_body(tpl, d)
            if k in (0, 1):
                base = shift_layer(base, -1, 0)
            base = apply_cloak_wave(base, phase * 1.5, amplitude=1.2, vertical_flutter=0.35)
            vib = [1.9, -1.3, 0.9, -0.6, 0.3, -0.1, 0.0][k]
            frame = draw_articulated_bow(
                base,
                shoulder=(28 if k <= 1 else 29, 16 + d),
                aim_deg=-3.0 + k * 0.8,
                draw_t=0.0,
                string_vib=vib,
                arrow_mode='none',
                release_flash=(k <= 1),
                bow_reach=10.2,
                bow_half_span=11.5,
                bow_flare=1.0 if k <= 1 else 0.0,
            )
            frame = draw_row7_gale_ward_ring(frame, f)
            frames.append(frame)

        elif f <= 22:
            d = 5
            k = f - 18
            base = make_crouch_body(tpl, d)
            base = apply_cloak_wave(base, phase, amplitude=1.0, vertical_flutter=0.3)
            frame = draw_articulated_bow(
                base,
                shoulder=(29, 16 + d),
                aim_deg=2.0 + k * 1.5,
                draw_t=0.0,
                arrow_mode='none',
                bow_reach=10.0,
                bow_half_span=11.5
            )
            # Subtle sylvan stealth leaf-mote drifting behind cloak during overwatch hold
            lx = 9 + ((f * 2) % 7)
            ly = 24 + ((f * 3) % 14)
            set_px(frame, lx, ly, EMERALD_BRIGHT)
            set_px(frame, lx + 1, ly - 1, STAR_GOLD if f % 2 == 0 else EMERALD_MID)
            frames.append(frame)

        else:
            depths = [5, 4, 3, 2, 1, 1, 0]
            k = f - 23
            d = depths[k]
            base = tpl['stand'].copy() if d == 0 else make_crouch_body(tpl, d)
            base = apply_cloak_wave(base, phase, amplitude=1.1, vertical_flutter=0.3)
            u = k / 6.0
            aim_deg = 8.0 * (1.0 - u) + 34.0 * u
            frame = draw_articulated_bow(
                base,
                shoulder=(28 + (1 if d >= 3 else 0), 16 + d),
                aim_deg=aim_deg,
                draw_t=0.0,
                arrow_mode='none',
                bow_reach=9.8,
                bow_half_span=12.2
            )
            frames.append(frame)

    return frames


def make_jump_body(tpl, jump_dy, tuck_amount, torso_lean_dx=0):
    """
    Constructs a clean, full-body aerial jumping ranger pose in back-to-front anatomical order:
    - Backmost Layer: Billowing Emerald Cloak streaming behind Sylvara down to y=43 (x <= 18 for y < 35, x <= 14 for 35 <= y <= 43).
    - Far Leg Layer: Trailing ranger leg & boot kicked back in an athletic aerial scissor-vault.
    - Upper Torso, Hood & Tunic Hip: (y=0..33, with x in 18..31 for y=28..33) so her waist and hips are never pinched!
    - Split Tunic Tabard: Sweeping between the legs.
    - Near Leg Layer: Leading knee tucked high in front (classic elven ranger mid-air bow stance!).
    """
    stand = tpl['stand'].copy()
    torso_dy = max(0, int(jump_dy))
    lean_dx = max(-4, min(4, int(round(torso_lean_dx))))

    cape_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    # 1. Billowing Aerial Cloak (x <= 18 for y < 35, x <= 14 for 35 <= y <= 43) lifted by the leap
    cloak_lift = int(round(max(0.0, tuck_amount) * 2.2))
    for y in range(14, 44):
        max_cx = 18 if y < 35 else 14
        for x in range(1, max_cx + 1):
            if stand[y, x, 3] == 0:
                continue
            u = (y - 14) / 29.0
            cx = max(2, min(22, x - int(round(u * 2.0 * max(0.2, tuck_amount)))))
            cy = max(12, min(48, y + torso_dy - int(round(u * cloak_lift))))
            cape_layer[cy, cx] = stand[y, x]
            if x >= 11 and y < 35:
                cape_layer[min(49, y + torso_dy), x] = stand[y, x]
    cape_layer = fill_layer_pinholes(cape_layer, x0=2, x1=23, y0=11, y1=49, require_3_neighbors=False)

    # 2. Upper Torso, Hood & Tunic Hip (y = 0..33, with 18 <= x <= 31 for y = 28..33)
    for y in range(0, 34):
        ny = y + torso_dy
        if not (1 <= ny <= 50):
            continue
        dx = lean_dx if y <= 24 else int(round(lean_dx * 0.5))
        if y < 28:
            x_min, x_max = 15, 34
        else:
            x_min, x_max = 18, 31
        for x in range(x_min, x_max + 1):
            if stand[y, x, 3] > 0:
                torso_layer[ny, max(2, min(49, x + dx))] = stand[y, x]

    hip_x = 25.0 + lean_dx * 0.5
    hip_y = 31.0 + torso_dy

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
                    ny = max(28, min(49, y + int(round(foot_dy))))
                    nx = max(4, min(48, x + int(round(foot_dx))))
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
            c_dark, c_mid, c_hi, c_greave, c_gold = (14, 34, 28, 255), (24, 58, 46, 255), (36, 82, 64, 255), (48, 34, 26, 255), GOLD_DARK
        else:
            c_dark, c_mid, c_hi, c_greave, c_gold = CLOAK_DARK, CLOAK_MID, CLOAK_LIGHT, LEATHER_MID, GOLD_BRIGHT

        for off_x, col in [(-1.6, c_dark), (-0.6, c_mid), (0.4, c_hi), (1.4, c_dark)]:
            draw_line_px(layer, hip_x + off_x, hip_y, kx + off_x * 0.85, ky, col)
        for off_x, col in [(-1.2, c_dark), (0.0, c_greave), (1.2, c_dark)]:
            draw_line_px(layer, kx + off_x, ky, ax + off_x * 0.85, ay, col)
        set_px(layer, kx, ky, c_gold)
        set_px(layer, kx + 1, ky, c_gold)
        return fill_layer_pinholes(layer, require_3_neighbors=False)

    t = max(0.0, tuck_amount)
    far_leg = build_aerial_leg(
        tpl['leg_back'],
        20.5,
        knee_dx=-3.2 * t - 1.0,
        knee_dy=4.2 - 1.2 * t,
        foot_dx=-3.8 * t,
        foot_dy=torso_dy - 3.2 * t,
        boot_rot_deg=-24.0 * t,
        is_far_leg=True
    )
    near_leg = build_aerial_leg(
        tpl['leg_front'],
        30.5,
        knee_dx=4.5 * t + 1.2,
        knee_dy=3.2 - 2.4 * t,
        foot_dx=1.2 * t,
        foot_dy=torso_dy - 4.8 * t,
        boot_rot_deg=-22.0 * t,
        is_far_leg=False
    )

    tunic_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    for off_x, col in [(-1.8, CLOAK_DARK), (-0.8, CLOAK_MID), (0.2, CLOAK_LIGHT), (1.2, GOLD_MID)]:
        draw_line_px(tunic_layer, hip_x + off_x, hip_y - 1.5, hip_x + off_x + 1.5 * t, hip_y + 4.0 - 1.0 * t, col)

    out = composite_over(far_leg, cape_layer)
    out = composite_over(out, torso_layer)
    out = composite_over(out, tunic_layer)
    out = composite_over(out, near_leg)
    return strip_isolated_pixels(fill_layer_pinholes(out, require_3_neighbors=False))


def build_row8_jump(tpl):
    """
    Row 8: 30-Frame Dedicated JUMP Sequence (ZEPHYR VAULT & MID-AIR COUNTER-SHOT):
    - Frames 0..3:   Pre-jump athletic knee-bend crouch & wind-spring launch (4 frames)
    - Frames 4..9:   Sleek Full-Body Aerial Scissor-Vault & Quiver Reach (6 frames — zero round ball!)
    - Frames 10..17: Mid-Air Wind-Glide Hover & Progressive Downward (+24°) Bow Draw (8 frames)
    - Frames 18..23: Downward Aerial Counter-Shot Release Flash, String Snap & Recoil (6 frames)
    - Frames 24..29: Smooth Gliding Descent & Shock-Absorbing Ranger Landing (6 frames)
    """
    frames = []

    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 3:
            crouch_seq = [1, 3, 4, 1]
            dy = crouch_seq[f]
            body = make_crouch_body(tpl, dy) if dy >= 2 else make_jump_body(tpl, dy, tuck_amount=0.25)
            body = apply_cloak_wave(body, phase * 2.0, amplitude=1.8, vertical_flutter=0.8)
            aim_deg = [36.0, 42.0, 46.0, 18.0][f]
            frame = draw_articulated_bow(
                body,
                shoulder=(28, 16 + dy),
                aim_deg=aim_deg,
                draw_t=0.0,
                bow_reach=9.5,
                bow_half_span=12.0
            )
            frames.append(frame)

        elif f <= 9:
            k = f - 4
            u = k / 5.0
            tuck = 0.45 + 0.55 * math.sin(u * math.pi * 0.65)
            dx = max(-4, min(4, -1 if k in (1, 2, 3) else 0))
            body = make_jump_body(tpl, 0, tuck_amount=tuck, torso_lean_dx=dx)
            body = apply_cloak_wave(body, phase * 2.0, amplitude=2.2, vertical_flutter=1.0)

            aim_seq = [-6.0, -14.0, -10.0, +2.0, +14.0, +22.0]
            hand_pts = [(23, 14), (20, 11), (22, 12), (28, 14), (33, 16), (35, 18)]
            frame = draw_articulated_bow(
                body,
                shoulder=(28 + dx, 16),
                aim_deg=aim_seq[k],
                draw_t=0.0,
                arrow_mode='single' if k >= 4 else 'none',
                hand_override=hand_pts[k],
                bow_reach=9.8,
                bow_half_span=12.0
            )
            frames.append(frame)

        elif f <= 17:
            k = f - 10
            u = k / 7.0
            tuck = 1.0 - u * 0.12
            dx = max(-4, min(4, 1 if k >= 3 else 0))
            body = make_jump_body(tpl, 0, tuck_amount=tuck, torso_lean_dx=dx)
            body = apply_cloak_wave(body, phase * 2.0, amplitude=2.2, vertical_flutter=1.0)
            draw_t = 0.18 + u * 0.82
            charge = 3 if f >= 16 else (2 if f >= 14 else (1 if f >= 12 else 0))
            frame = draw_articulated_bow(
                body,
                shoulder=(28 + dx, 16),
                aim_deg=+24.0,
                draw_t=draw_t,
                arrow_mode='single',
                charge_level=charge,
                bow_reach=10.0,
                bow_half_span=12.0
            )
            frames.append(frame)

        elif f <= 23:
            k = f - 18
            dx = max(-4, min(4, -1 if k <= 2 else 0))
            body = make_jump_body(tpl, 0, tuck_amount=0.85 - k * 0.10, torso_lean_dx=dx)
            body = apply_cloak_wave(body, phase * 2.0, amplitude=2.3, vertical_flutter=1.1)
            vib = [1.9, -1.4, 0.9, -0.5, 0.2, 0.0][k]
            frame = draw_articulated_bow(
                body,
                shoulder=(28 + dx, 16),
                aim_deg=+24.0 - k * 1.8,
                draw_t=0.0,
                string_vib=vib,
                arrow_mode='none',
                release_flash=(k == 0),
                hand_override=(22, 13),
                bow_reach=10.0,
                bow_half_span=12.0
            )
            frames.append(frame)

        else:
            k = f - 24
            if k <= 1:
                tuck = [0.32, 0.10][k]
                body = make_jump_body(tpl, 0, tuck_amount=tuck)
                body = apply_cloak_wave(body, phase * 2.0, amplitude=2.0, vertical_flutter=1.0)
                frame = draw_articulated_bow(
                    body,
                    shoulder=(28, 16),
                    aim_deg=20.0 + k * 6.0,
                    draw_t=0.0,
                    bow_reach=9.8,
                    bow_half_span=12.0
                )
            else:
                crouch_depths = [2, 3, 1, 0]
                d = crouch_depths[k - 2]
                body = tpl['stand'].copy() if d == 0 else make_crouch_body(tpl, d)
                body = apply_cloak_wave(body, phase, amplitude=1.6, vertical_flutter=0.7)
                frame = draw_articulated_bow(
                    body,
                    shoulder=(29, 17 + d),
                    aim_deg=38.0 + (4.0 if d >= 3 else 0.0),
                    draw_t=0.0,
                    bow_reach=9.5,
                    bow_half_span=12.2
                )
            frames.append(frame)

    return frames


# Standard row generator aliases
gen_row0_idle = build_row0_idle
gen_row1_walk = build_row1_walk
gen_row2_atk = build_row2_auto_attack
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
        ('ROW 0: IDLE (30 FRAMES)', build_row0_idle(tpl)),
        ('ROW 1: WALK (30 FRAMES)', build_row1_walk(tpl)),
        ('ROW 2: AUTO_ATTACK (30 FRAMES)', build_row2_auto_attack(tpl)),
        ('ROW 3: SKILL - STARFALL VOLLEY (30 FRAMES)', build_row3_skill(tpl)),
        ('ROW 4: ULTIMATE - ASTRAL HURRICANE (30 FRAMES)', build_row4_ultimate(tpl)),
        ('ROW 5: DEATH (30 FRAMES)', build_row5_death(tpl)),
        ('ROW 6: DASH - GALE STRIDE (30 FRAMES)', build_row6_dash(tpl)),
        ('ROW 7: CROUCH - STEALTH & SNIPER AIM (30 FRAMES)', build_row7_crouch(tpl)),
        ('ROW 8: JUMP - ZEPHYR LEAP & AERIAL SHOT (30 FRAMES)', build_row8_jump(tpl)),
    ]

    num_rows = len(rows)
    cell_px = 208
    sheet = Image.new('RGBA', (30 * cell_px, num_rows * cell_px), (0, 0, 0, 0))

    clipped_frames = 0
    for r_idx, (r_name, r_frames) in enumerate(rows):
        assert len(r_frames) == 30, f'{r_name} has {len(r_frames)} frames instead of 30'
        for c_idx in range(30):
            r_frames[c_idx] = ensure_safe_cell(r_frames[c_idx], margin=2)
            ys, xs = np.where(r_frames[c_idx][:, :, 3] > 0)
            if len(ys) > 0 and (xs.min() < 2 or xs.max() > 49 or ys.min() < 2 or ys.max() > 49):
                clipped_frames += 1
        adj_diffs = sum(1 for i in range(29) if np.any(r_frames[i] != r_frames[i + 1]))
        assert adj_diffs == 29, f'{r_name} has {adj_diffs}/29 distinct transitions!'
        print(f'{r_name:52s}: 30 frames generated, {adj_diffs}/29 adjacent transitions distinct')
        for c_idx, arr in enumerate(r_frames):
            cell_im = Image.fromarray(arr, mode='RGBA').resize((cell_px, cell_px), Image.NEAREST)
            sheet.paste(cell_im, (c_idx * cell_px, r_idx * cell_px))

    print(f'Boundary-clipped frames outside [2..49]: {clipped_frames}/270')
    assert clipped_frames == 0, f'Found {clipped_frames}/270 boundary-clipped frames!'

    sheet.save('assets/sprites/archer_sheet.png')
    print('Saved assets/sprites/archer_sheet.png:', sheet.size)

    # Render full 30-col x 9-row contact sheet + zoomed-in left (F00..F14) and right (F15..F29) halves
    preview_cell = 96
    pad_top = 24
    dbg = Image.new('RGBA', (30 * preview_cell, num_rows * (preview_cell + pad_top)), (15, 20, 30, 255))
    draw = ImageDraw.Draw(dbg)
    for r_idx, (r_name, r_frames) in enumerate(rows):
        y0 = r_idx * (preview_cell + pad_top)
        draw.rectangle([0, y0, 30 * preview_cell, y0 + pad_top - 2], fill=(26, 34, 50, 255))
        draw.text((8, y0 + 5), r_name, fill=(110, 231, 183, 255))
        for c_idx, arr in enumerate(r_frames):
            x0 = c_idx * preview_cell
            draw.text((x0 + 4, y0 + 13), f'F{c_idx:02d}', fill=(148, 163, 184, 255))
            p_im = Image.fromarray(arr, mode='RGBA').resize((preview_cell, preview_cell), Image.NEAREST)
            dbg.paste(p_im, (x0, y0 + pad_top), p_im)
            draw.rectangle([x0, y0 + pad_top, x0 + preview_cell - 1, y0 + pad_top + preview_cell - 1], outline=(35, 45, 65, 255))

    art_dir = '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/4f1fb80f-a88f-4496-9746-b4b9fe84f6d4'
    dbg_path = f'{art_dir}/debug_archer_30fps_9row.png'
    dbg.save(dbg_path)
    dbg.crop((0, 0, 15 * preview_cell, dbg.height)).save(f'{art_dir}/debug_archer_30fps_left_F00_F14.png')
    dbg.crop((15 * preview_cell, 0, 30 * preview_cell, dbg.height)).save(f'{art_dir}/debug_archer_30fps_right_F15_F29.png')
    print('Saved debug sheets:', dbg_path, dbg.size)


if __name__ == '__main__':
    main()
