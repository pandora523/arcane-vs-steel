#!/usr/bin/env python3
"""
Builds Seraphina's (Priestess) 30-Frame-Per-Animation HD-2D Sprite Sheet:
- 9 rows x 30 columns = 270 unique frames (6240 x 1872 at 208x208 per cell):
  * Row 0: IDLE (30 frames)
  * Row 1: WALK (30 frames)
  * Row 2: AUTO_ATTACK - SACRED STARLIGHT CAST (30 frames)
  * Row 3: SKILL - DIVINE SANCTUARY & VALKYRIE SPEAR RAIN (30 frames)
  * Row 4: ULTIMATE - SERAPHIC APOTHEOSIS (30 frames)
  * Row 5: DEATH & HURT (30 frames)
  * Row 6: DASH - ANGELIC FEATHER-GLIDE (30 frames)
  * Row 7: CROUCH - BENEDICTION PRAYER BARRIER & COUNTER-ORB (30 frames)
  * Row 8: JUMP - SERAPHIC WING-GLIDE VAULT & DOWNWARD STARLIGHT SMITE (30 frames)
- Un-inked 52x52 logical pixel art upscaled 4x NEAREST to 208x208 (PixelForge adds dynamic ink at runtime).
- Zero duplicate staffs, zero floating upright staff on death, zero bouncy-ball jump frames.
"""

import math
import numpy as np
from PIL import Image, ImageDraw

OUTLINE = (11, 15, 25, 255)
WHITE_PURE = (255, 255, 255, 255)
STAR_CREAM = (254, 249, 195, 255)
GOLD_BRIGHT = (253, 224, 71, 255)
GOLD_ROYAL = (234, 179, 8, 255)
GOLD_MID = (204, 169, 109, 255)
GOLD_DARK = (143, 113, 87, 255)
WOOD_DARK = (105, 75, 57, 255)

VEST_LIGHT = (241, 232, 202, 255)
VEST_MID = (215, 197, 168, 255)
VEST_SHADOW = (166, 142, 108, 255)
VEST_DEEP = (119, 89, 71, 255)

ROBE_PURE = WHITE_PURE
ROBE_CREAM = VEST_LIGHT
ROBE_SHADOW = VEST_SHADOW

HAIR_LIGHT = (233, 233, 208, 255)
HAIR_MID = (205, 182, 147, 255)
HAIR_SHADOW = (151, 120, 86, 255)

SKIN_LIGHT = (250, 246, 218, 255)
SKIN_SHADOW = (200, 181, 153, 255)
SKIN_MID = SKIN_SHADOW

CYAN_SACRED = (175, 218, 208, 255)
TEAL_LINING = (97, 148, 145, 255)
TEAL_DEEP = (57, 85, 95, 255)
ROSE_GOLD = (251, 191, 36, 255)


def load_source_cells(path='backups/priestess_sheet_before_30fps.png'):
    im = Image.open(path).convert('RGBA')
    def cell(r, c):
        return np.array(
            im.crop((c * 208, r * 208, (c + 1) * 208, (r + 1) * 208)).resize((52, 52), Image.NEAREST),
            dtype=np.uint8
        )
    return {
        'idle': cell(0, 0),
        'atk_up': cell(2, 1),
        'atk_ext': cell(2, 3),
        'kneel1': cell(4, 1),
        'kneel3': cell(4, 3),
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
    because `PixelForge.js` (ensureNormalMap + drawSheetFrame) renders the 1px comic ink
    outline and 1px exterior rim dynamically at runtime.
    """
    return layer.copy()


def fill_layer_pinholes(layer, x0=1, x1=50, y0=1, y1=50, require_3_neighbors=False):
    """
    Fills 1px transparent pinholes/slits inside moved, waved, or rotated pixel layers
    so movement never causes missing interior pixels or torn seams.
    """
    out = layer.copy()
    for _pass in range(2):
        src = out.copy()
        alpha = src[:, :, 3] > 0
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
                            out[y, x] = src[y - 1, x]
                        elif lf:
                            out[y, x] = src[y, x - 1]
                        elif dn:
                            out[y, x] = src[y + 1, x]
                        elif rt:
                            out[y, x] = src[y, x + 1]
    return out


def shift_layer(layer, dx=0, dy=0):
    """
    Shifts a 52x52 RGBA layer by (dx, dy) while keeping pixels inside [1..50] and filling pinholes.
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

    lo = margin
    hi = 51 - margin

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

    # Clear extreme margin perimeter so zero stray pixels ever touch 0 or 51
    out[:lo, :, :] = 0
    out[hi + 1:, :, :] = 0
    out[:, :lo, :] = 0
    out[:, hi + 1:, :] = 0
    return out


def composite_over(base, over):
    res = base.copy()
    mask = over[:, :, 3] > 0
    res[mask] = over[mask]
    return res


def neutralize_priestess_front_arm(cell):
    """
    Preserves Seraphina's original golden hair locks (x = 18..23, y = 14..22),
    blue inner cape trim (x = 11..22, y = 15..45), and bodice shading at x <= 28,
    and ONLY strips the baked staff and extended hand at x >= 30 (for y = 8..34)
    and x >= 33 (for y >= 35), gently softening only any isolated skin-hand pixels
    at x = 28..29, y = 19..23.
    """
    out = cell.copy()
    out[:8, 30:] = 0
    out[8:35, 30:] = 0
    out[35:37, 30:] = 0
    out[35:, 33:] = 0

    for y in range(19, 24):
        for x in (28, 29):
            r, g, b, a = out[y, x]
            if a > 0 and r > 210 and g > 195:
                out[y, x] = VEST_SHADOW
    return fill_layer_pinholes(out, 1, 50, 1, 50, require_3_neighbors=True)


neutralize_priestess_baked_arms = neutralize_priestess_front_arm


def make_clean_templates(src):
    """
    Strips the baked-in staff and extended right hand from each source pose while
    100% preserving Seraphina's natural golden hair locks, blue-lined cape, bodice shading,
    white-and-gold flared gown (down to y = 47), and golden slippers/boots (down to y = 49).
    """
    # 1. Clean standing body preserving her natural hair, blue-lined cape, bodice, gown & boots
    stand = src['idle'].copy()
    stand[43, :11] = 0
    stand = neutralize_priestess_front_arm(stand)
    stand = fill_layer_pinholes(add_outline_to_layer(stand), 1, 50, 1, 50, require_3_neighbors=True)

    # Extract Seraphina's Back Boot and Front Boot patches from `stand`
    leg_back_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_front_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_back_patch[44:50, 14:22] = stand[44:50, 14:22]
    leg_front_patch[44:50, 22:31] = stand[44:50, 22:31]

    stand_upper = stand.copy()
    stand_upper[44:, 14:] = 0
    stand_upper = fill_layer_pinholes(add_outline_to_layer(stand_upper), 1, 50, 1, 50, require_3_neighbors=True)

    # 2. Clean upward-prayer body (from atk_up, preserving natural gown & bodice from stand)
    cast_up = src['atk_up'].copy()
    cast_up[:19, 29:] = 0
    cast_up[19:, :] = stand[19:, :]
    cast_up = neutralize_priestess_front_arm(cast_up)
    cast_up = fill_layer_pinholes(add_outline_to_layer(cast_up), 1, 50, 1, 50, require_3_neighbors=True)

    # 3. Clean forward-extension casting body built from `stand` leaning 1px forward
    # so her white-and-gold gown, blue inner cape, and bodice stay 100% consistent with zero baked horizontal arm!
    cast_ext = shift_layer(stand, 1, 0)
    cast_ext_upper = shift_layer(stand_upper, 1, 0)

    # 4. Clean kneeling prayer bodies (kneel1, kneel2) preserving leaned head (x <= 31) and kneeling gown (x <= 33)
    kneel1 = src['kneel1'].copy()
    kneel2 = src['kneel3'].copy()
    for kn_idx, kn in enumerate((kneel1, kneel2)):
        kn[:23, 32:] = 0
        kn[23:30, 31:] = 0
        kn[30:32, 33:] = 0
        kn[32:43, 34:] = 0
        kn[43:49, 32:] = 0
        for y in range(22, 27):
            for x in (29, 30):
                r, g, b, a = kn[y, x]
                if a > 0 and r > 210 and g > 195:
                    kn[y, x] = VEST_SHADOW
        ys_k, _ = np.where(kn[:, :, 3] > 0)
        if len(ys_k) > 0 and ys_k.max() >= 50:
            kn_s = np.zeros_like(kn)
            kn_s[:51, :] = kn[1:, :]
            kn = kn_s
        kn = fill_layer_pinholes(add_outline_to_layer(kn), 1, 50, 1, 50, require_3_neighbors=True)
        if kn_idx == 0:
            kneel1 = kn
        else:
            kneel2 = kn
    kneel = kneel1.copy()

    # 5. Clean horizontal fallen body (from fall, removing baked diagonal staff on her back at y <= 33)
    fall = src['fall'].copy()
    fall[:33, :, :] = 0
    fall[33, :26] = 0
    fall[33, 35:] = 0
    fall[34, 39:] = 0
    fall = fill_layer_pinholes(add_outline_to_layer(fall), 1, 50, 1, 50, require_3_neighbors=True)

    # 6. Clean forward dash body (preserving her natural dashing cape, gown, and boots while stripping horizontal staff)
    dash = src['dash'].copy()
    dash[17:29, 31:] = 0
    for y in range(23, 30):
        for x in range(18, 30):
            if stand[y, x, 3] > 0:
                dash[y, x] = stand[y, x]
    for y in range(20, 26):
        for x in (29, 30):
            r, g, b, a = dash[y, x]
            if a > 0 and r > 210 and g > 195:
                dash[y, x] = VEST_SHADOW
    dash = fill_layer_pinholes(add_outline_to_layer(dash), 1, 50, 1, 50, require_3_neighbors=True)

    return {
        'stand': stand,
        'stand_upper': stand_upper,
        'leg_back': leg_back_patch,
        'leg_front': leg_front_patch,
        'cast_up': cast_up,
        'cast_ext': cast_ext,
        'cast_ext_upper': cast_ext_upper,
        'kneel': kneel,
        'kneel1': kneel1,
        'kneel2': kneel2,
        'fall': fall,
        'dash': dash,
    }


def apply_hair_and_vestment_wave(frame, phase_rad, amplitude=1.5, vertical_flutter=0.6, is_dash=False):
    """
    Applies a smooth 30-frame traveling sacred breeze wave to Seraphina's long flowing
    blonde hair and left cathedral robe train (x <= 18) without opening any seam along her torso.
    """
    out = frame.copy()
    if is_dash:
        cape_region = frame[11:42, 0:21].copy()
        out[11:42, 0:21] = 0
        for y in range(11, 42):
            for x in range(0, 21):
                if cape_region[y - 11, x, 3] == 0:
                    continue
                if y >= 34 and x >= 15:
                    out[y, x] = cape_region[y - 11, x]
                    continue
                dist_from_back = max(0.0, (21 - x) / 17.0)
                dy = int(round(math.sin(phase_rad - dist_from_back * 3.0) * amplitude * dist_from_back))
                dx = int(round(math.cos(phase_rad * 2.0 - dist_from_back * 2.4) * 0.8 * dist_from_back))
                ny = max(9, min(47, y + dy))
                nx = max(2, min(21, x + dx))
                out[ny, nx] = cape_region[y - 11, x]
                if x >= 13 and out[y, x, 3] == 0:
                    out[y, x] = cape_region[y - 11, x]
        out = fill_layer_pinholes(out)
        return add_outline_to_layer(out)

    wave_mask = np.zeros((52, 52), dtype=bool)
    for y in range(12, 48):
        max_wave_x = 18 if y < 38 else 14
        for x in range(1, max_wave_x + 1):
            if frame[y, x, 3] > 0:
                wave_mask[y, x] = True

    orig_pixels = frame.copy()
    out[wave_mask] = 0

    for y in range(12, 48):
        u = (y - 12) / 35.0
        wave_x = math.sin(phase_rad - u * 3.4) * (amplitude * (0.25 + 0.85 * u))
        dx = int(round(wave_x))
        for x in range(1, 19):
            if not wave_mask[y, x]:
                continue
            nx = max(2, min(20, x + dx))
            ny = y
            if out[ny, nx, 3] == 0:
                out[ny, nx] = orig_pixels[y, x]
            if dx < 0 and x >= 12 and out[y, x, 3] == 0:
                out[y, x] = orig_pixels[y, x]
            if dx > 0 and x >= 12 and nx - 1 >= 2 and out[y, nx - 1, 3] == 0:
                out[y, nx - 1] = orig_pixels[y, x]

    out = fill_layer_pinholes(out)
    return add_outline_to_layer(out)


apply_vestment_wave = apply_hair_and_vestment_wave


def draw_halo_crown(frame, head_cx=25, head_top_y=6, phase_rad=0.0, intensity=1.0):
    """
    Draws a pulsing golden halo crown & tiara shimmer above Seraphina's brow.
    Guaranteed never to touch y=0 or y=1.
    """
    out = frame.copy()
    pulse = 0.5 + 0.5 * math.sin(phase_rad)
    set_px(out, head_cx + 1, max(3, head_top_y + 2), WHITE_PURE if pulse > 0.65 else GOLD_BRIGHT)
    set_px(out, head_cx, max(3, head_top_y + 2), GOLD_BRIGHT)

    rx = 4 if intensity < 1.3 else 5
    hy = max(3, head_top_y - 1)
    for dx in range(-rx, rx + 1):
        dy = 0 if abs(dx) >= rx - 1 else (-1 if dx % 2 == 0 else 0)
        col = WHITE_PURE if (dx == 0 and pulse > 0.5) else (GOLD_BRIGHT if abs(dx) <= 2 else GOLD_MID)
        set_px(out, head_cx + dx, max(2, hy + dy), col)

    if intensity >= 1.4:
        star_y = max(2, hy - 1)
        set_px(out, head_cx, star_y, WHITE_PURE)
        set_px(out, head_cx - 1, star_y, GOLD_BRIGHT)
        set_px(out, head_cx + 1, star_y, GOLD_BRIGHT)
    return out


def draw_mini_wings_on_back(frame, shoulder_x=17, shoulder_y=16, unfurl=1.0, phase_rad=0.0):
    """
    Renders luminous golden-white seraphic wing-feathers unfurling from Seraphina's shoulders
    for aerial vault (Row 8 JUMP) and Apotheosis (Row 4 ULTIMATE).
    """
    if unfurl <= 0.05:
        return frame
    wing_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    flap_dy = math.sin(phase_rad * 2.0) * 1.8 * unfurl

    for pinion_idx, (ang_base, _length_scale) in enumerate([(-148.0, 1.0), (-168.0, 0.90), (168.0, 0.78)]):
        ang = math.radians(ang_base + math.sin(phase_rad + pinion_idx * 0.7) * 7.0)
        ux, uy = math.cos(ang), math.sin(ang)
        p_len = int(round((10.0 - pinion_idx * 1.4) * unfurl))
        for d in range(1, p_len + 1):
            wx = max(2.0, min(49.0, shoulder_x + ux * d))
            wy = max(2.0, min(48.0, shoulder_y + pinion_idx * 2.2 + uy * d + flap_dy * (d / max(1, p_len))))
            col = GOLD_BRIGHT if d <= 3 else (WHITE_PURE if d < p_len else STAR_CREAM)
            set_px(wing_layer, wx, wy, col)
            if d >= 3 and d % 2 == 1:
                set_px(wing_layer, wx, min(49.0, wy + 1), VEST_LIGHT)
                set_px(wing_layer, wx, min(49.0, wy + 2), GOLD_MID if d >= p_len - 1 else STAR_CREAM)

    return composite_over(wing_layer, frame)


def solve_ik_elbow(sx, sy, hx, hy, L1=4.4, L2=4.2, bend_side=1.0):
    """
    2-Bone Inverse Kinematics solver returning the anatomical elbow joint (ex, ey)
    between shoulder (sx, sy) and hand (hx, hy) with L1=4.4, L2=4.2.
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
    px, py = -uy * bend_side, ux * bend_side
    a = (L1 * L1 - L2 * L2 + dist * dist) / (2.0 * dist)
    h = math.sqrt(max(0.0, L1 * L1 - a * a))
    ex = sx + ux * a + px * h
    ey = sy + uy * a + py * h
    return ex, ey


def draw_ik_priestess_arm(
    layer,
    sx,
    sy,
    hx,
    hy,
    L1=4.4,
    L2=4.2,
    bend_side=1.0,
    is_prayer_hand=False,
    dim_factor=1.0,
):
    """
    Renders Seraphina's 2-Bone IK Cathedral Arm attached at her true shoulder
    (sx = 25.0 + dx_off, sy = 17.0 + dy_off) with L1 = 4.4, L2 = 4.2.
    """
    def dim_col(c):
        if dim_factor >= 0.99:
            return c
        return (
            int(c[0] * dim_factor),
            int(c[1] * dim_factor),
            int(c[2] * dim_factor),
            c[3],
        )

    ex, ey = solve_ik_elbow(sx, sy, hx, hy, L1=L1, L2=L2, bend_side=bend_side)

    c_pure = dim_col(ROBE_PURE)
    c_cream = dim_col(ROBE_CREAM)
    c_shad = dim_col(ROBE_SHADOW)
    c_gold_hi = dim_col(GOLD_BRIGHT)
    c_gold_mid = dim_col(GOLD_MID)

    # 1. White silk upper sleeve from (sx, sy) to (ex, ey)
    u1x, u1y = ex - sx, ey - sy
    d1 = max(1.0, math.hypot(u1x, u1y))
    n1x, n1y = -u1y / d1, u1x / d1
    draw_line_px(layer, sx + n1x * 0.8, sy + n1y * 0.8, ex + n1x * 0.75, ey + n1y * 0.75, c_pure)
    draw_line_px(layer, sx - n1x * 0.8, sy - n1y * 0.8, ex - n1x * 0.75, ey - n1y * 0.75, c_shad)
    draw_line_px(layer, sx, sy, ex, ey, c_cream)

    # 2. Cathedral bell-sleeve forearm + ornate gold cuff from (ex, ey) to (hx, hy)
    u2x, u2y = hx - ex, hy - ey
    d2 = max(1.0, math.hypot(u2x, u2y))
    n2x, n2y = -u2y / d2, u2x / d2
    draw_line_px(layer, ex + n2x * 0.8, ey + n2y * 0.8, hx + n2x * 0.95, hy + n2y * 0.95, c_pure)
    draw_line_px(layer, ex - n2x * 0.8, ey - n2y * 0.8, hx - n2x * 1.0, hy - n2y * 1.0, c_shad)
    draw_line_px(layer, ex, ey, hx, hy, c_cream)

    cuff_x = hx - (u2x / d2) * 1.1
    cuff_y = hy - (u2y / d2) * 1.1
    for c_step in (-0.9, 0.0, 0.9):
        set_px(
            layer,
            cuff_x + n2x * c_step,
            cuff_y + n2y * c_step,
            c_gold_hi if abs(c_step) < 0.4 else c_gold_mid,
        )

    # 3. Gold-and-ivory cathedral shoulder pauldron/cap at (sx, sy)
    ux1, uy1 = u1x / d1, u1y / d1
    for p_step in (-0.9, 0.0, 0.9):
        px_s = sx + ux1 * 0.8 + n1x * p_step
        py_s = sy + uy1 * 0.8 + n1y * p_step
        set_px(layer, px_s, py_s, c_gold_hi if abs(p_step) > 0.5 else c_pure)
        set_px(layer, sx + n1x * p_step, sy + n1y * p_step, c_gold_mid)

    # 4. Golden elbow trim at (ex, ey)
    set_px(layer, ex, ey, c_gold_hi)
    set_px(layer, ex - n1x * 0.6, ey - n1y * 0.6, c_gold_mid)

    # 5. 2x2 graceful hand (SKIN_LIGHT, SKIN_MID) at (hx, hy)
    ix, iy = int(round(hx)), int(round(hy))
    set_px(layer, ix, iy, dim_col(SKIN_LIGHT))
    set_px(layer, ix + 1, iy, dim_col(SKIN_LIGHT))
    set_px(layer, ix, iy + 1, dim_col(SKIN_MID))
    set_px(layer, ix + 1, iy + 1, dim_col(SKIN_MID))


def draw_celestial_staff(
    base_frame,
    shoulder=(25.0, 17.0),
    staff_deg=16.0,
    reach=5.2,
    shaft_up=10.0,
    shaft_down=20.0,
    charge_level=0,
    cast_flash=False,
    dim_factor=1.0,
    hand2_override=None,
    draw_arm=True,
    draw_rose_barrier=False,
    phase_rad=0.0,
    allow_horizontal=False,
):
    """
    Renders Seraphina's Celestial Sun-Staff and 2-Bone IK Cathedral Arm:
    - Keeps her Celestial Staff in a graceful vertical-to-diagonal angle range
      (-20 deg to +28 deg from vertical) with a full-length 28..32px shaft across
      IDLE, WALK, AUTO_ATTACK, SKILL, ULTIMATE, DASH, CROUCH, and JUMP
      (only tilting horizontal during DEATH collapse when allow_horizontal=True).
    - Attaches her 2-bone IK arm at her true shoulder (sx = 25.0 + dx_off, sy = 17.0 + dy_off)
      with L1 = 4.4, L2 = 4.2, clamping hx in 30.5..35.0 and hy in 15.0..22.5 so her staff
      is held gracefully in front of her gown with its Sacred Sunburst Halo above (y = 5..14)
      and full golden shaft extending down (y = 15..42).
    """
    staff_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    lead_arm_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    fx_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    def dim_col(c):
        if dim_factor >= 0.99:
            return c
        return (
            int(c[0] * dim_factor),
            int(c[1] * dim_factor),
            int(c[2] * dim_factor),
            c[3],
        )

    if allow_horizontal or not draw_arm:
        # Horizontal fallen staff on the ground during DEATH collapse (F23..F29)
        rad = math.radians(staff_deg)
        ux, uy = math.cos(rad), math.sin(rad)
        px, py = -uy, ux
        gx = float(shoulder[0]) + ux * 1.2 + abs(math.cos(rad)) * reach
        gy = float(shoulder[1]) + uy * 1.2 + math.sin(rad) * 1.5
        bx0 = max(4.0, min(47.0, gx - ux * shaft_down))
        by0 = max(4.0, min(48.0, gy - uy * shaft_down))
        tx = max(7.0, min(43.0, gx + ux * shaft_up))
        ty = max(7.0, min(45.0, gy + uy * shaft_up))
    else:
        # Convert polar angles (e.g. -72 deg) or direct vertical-tilt angles into [-20..+28] deg from vertical
        if staff_deg < -35.0:
            tilt = staff_deg + 90.0
        else:
            tilt = float(staff_deg)
        tilt = max(-20.0, min(28.0, tilt))
        rad = math.radians(-90.0 + tilt)
        ux, uy = math.cos(rad), math.sin(rad)
        px, py = -uy, ux

        sx = float(shoulder[0])
        sy = float(shoulder[1])
        sx = max(23.5, min(28.0, sx))
        sy = max(14.5, min(22.0, sy))

        # Hand position in front of her gown: clamped in hx in [30.5, 35.0], hy in [15.0, 22.5]
        t_norm = (tilt + 20.0) / 48.0
        hx = sx + 5.8 + (t_norm - 0.5) * 2.2 + (reach - 5.2) * 0.45
        hy = sy + 1.8 + (t_norm - 0.5) * 2.6 + (reach - 5.2) * 0.25
        hx = max(30.5, min(35.0, hx))
        hy = max(15.0, min(22.5, hy))

        L1, L2 = 4.4, 4.2
        max_r = L1 + L2 - 0.12
        ddx, ddy = hx - sx, hy - sy
        dist = math.hypot(ddx, ddy)
        if dist > max_r:
            hx = sx + ddx * (max_r / dist)
            hy = sy + ddy * (max_r / dist)
            hx = max(30.5, min(35.0, hx))
            hy = max(15.0, min(22.5, hy))

        gx, gy = hx, hy

        # Full-length 28..32px golden shaft:
        # Sacred Sunburst Halo centered at ty in [8.0..11.8] so halo spans y = 5..14
        # Full golden shaft extending down to by0 in [37.0..42.0] (y = 15..42)
        eff_up = max(9.0, min(11.0, float(shaft_up)))
        if uy < -0.05:
            eff_up = min(eff_up, (gy - 8.2) / (-uy))
        if ux > 0.05:
            eff_up = min(eff_up, (42.5 - gx) / ux)
        elif ux < -0.05:
            eff_up = min(eff_up, (gx - 28.5) / (-ux))
        eff_up = max(8.5, min(11.0, eff_up))

        target_total = 30.0
        eff_down = max(float(shaft_down), target_total - eff_up)
        if -uy > 0.05:
            eff_down = min(eff_down, (42.0 - gy) / (-uy))
        eff_down = max(18.5, min(22.0, eff_down))

        bx0 = max(4.0, min(47.0, gx - ux * eff_down))
        by0 = max(15.0, min(42.5, gy - uy * eff_down))
        tx = max(28.0, min(43.0, gx + ux * eff_up))
        ty = max(7.5, min(12.5, gy + uy * eff_up))

    # 1. Draw full-length golden-ivory staff shaft from (bx0, by0) through (gx, gy) to (tx, ty)
    draw_line_px(staff_layer, bx0, by0, tx, ty, dim_col(GOLD_MID))
    draw_line_px(staff_layer, bx0 - px * 0.6, by0 - py * 0.6, tx - px * 0.6, ty - py * 0.6, dim_col(WOOD_DARK))
    set_px(staff_layer, bx0, by0, dim_col(GOLD_BRIGHT))

    # Ornate cross-guard collar just below finial
    cx_neck = tx - ux * 2.8
    cy_neck = ty - uy * 2.8
    for w in (-2, -1, 0, 1, 2):
        set_px(staff_layer, cx_neck + px * w, cy_neck + py * w, dim_col(GOLD_BRIGHT if abs(w) <= 1 else GOLD_DARK))

    # 2. Sacred Sunburst Halo & 8-Point Starlight Finial centered at (tx, ty) (y = 5..14)
    ring_r = 3.0
    for step in range(16):
        a = (step / 16.0) * 2.0 * math.pi
        rx = tx + math.cos(a) * ring_r
        ry = ty + math.sin(a) * ring_r
        c_ring = GOLD_BRIGHT if step % 2 == 0 else GOLD_MID
        set_px(staff_layer, rx, ry, dim_col(c_ring))

    for k in range(8):
        a = rad + k * (math.pi * 0.25)
        ray_len = 3.8 if k % 2 == 0 else 3.2
        rx = max(2.0, min(49.0, tx + math.cos(a) * ray_len))
        ry = max(2.0, min(49.0, ty + math.sin(a) * ray_len))
        set_px(
            staff_layer,
            rx,
            ry,
            dim_col(STAR_CREAM if (k % 2 == 0 and charge_level >= 1) else GOLD_BRIGHT)
        )

    set_px(staff_layer, tx - ux * 1.0, ty - uy * 1.0, dim_col(CYAN_SACRED))
    set_px(staff_layer, tx + px * 1.0, ty + py * 1.0, dim_col(CYAN_SACRED))
    set_px(staff_layer, tx - px * 1.0, ty - py * 1.0, dim_col(GOLD_BRIGHT))
    set_px(staff_layer, tx, ty, dim_col(WHITE_PURE if dim_factor > 0.6 else GOLD_MID))

    # 3. Single Right 2-Bone IK Arm (L1 = 4.4, L2 = 4.2) drawn OVER the staff shaft
    if draw_arm:
        draw_ik_priestess_arm(
            lead_arm_layer,
            sx,
            sy,
            gx,
            gy,
            L1=4.4,
            L2=4.2,
            bend_side=1.0,
            is_prayer_hand=False,
            dim_factor=dim_factor,
        )

    # 4. Dynamic Charge Runes & Sacred Starlight Cast Flash at Finial Tip
    if charge_level >= 1:
        for d in range(1, charge_level + 2):
            col = WHITE_PURE if d == 1 else (GOLD_BRIGHT if d == 2 else STAR_CREAM)
            set_px(fx_layer, min(49.0, tx + d), ty, col)
            set_px(fx_layer, max(2.0, tx - d), ty, col)
            set_px(fx_layer, tx, min(49.0, ty + d), col)
            set_px(fx_layer, tx, max(2.0, ty - d), col)
        for m in range(3):
            ma = phase_rad * 2.0 + m * (2.0 * math.pi / 3.0)
            mx = max(2.0, min(49.0, tx + math.cos(ma) * (3.8 + charge_level * 0.4)))
            my = max(2.0, min(49.0, ty + math.sin(ma) * (3.8 + charge_level * 0.4)))
            set_px(fx_layer, mx, my, GOLD_BRIGHT if m % 2 == 0 else CYAN_SACRED)

    if cast_flash:
        fx_cx = max(5.0, min(46.0, tx + px * 2.2))
        fx_cy = max(4.0, min(46.0, ty + py * 0.5))
        set_px(fx_layer, fx_cx, fx_cy, WHITE_PURE)
        for d in range(1, 5):
            col = WHITE_PURE if d <= 2 else (GOLD_BRIGHT if d <= 3 else STAR_CREAM)
            set_px(fx_layer, max(2.0, min(49.0, fx_cx + d)), fx_cy, col)
            set_px(fx_layer, max(2.0, min(49.0, fx_cx - d)), fx_cy, col)
            set_px(fx_layer, fx_cx, max(2.0, min(49.0, fx_cy + d)), col)
            set_px(fx_layer, fx_cx, max(2.0, min(49.0, fx_cy - d)), col)
        for dx_d, dy_d in [(-2, -2), (2, -2), (-2, 2), (2, 2)]:
            set_px(fx_layer, max(2.0, min(49.0, fx_cx + dx_d)), max(2.0, min(49.0, fx_cy + dy_d)), GOLD_BRIGHT)

    out = composite_over(base_frame, staff_layer)
    out = composite_over(out, lead_arm_layer)
    out = composite_over(out, fx_layer)
    return out


def render_walk_legs(tpl, f):
    """
    Renders Seraphina's graceful 30-frame 2-step cathedral stride (F00..F14 step A, F15..F29 step B)
    preserving 100% of her natural golden hair, blue-lined cape, white-and-gold gown (y=28..45),
    and counter-striding golden boots (y=45..49).
    """
    phase = (f / 30.0) * 2.0 * math.pi
    bob_y = int(round(math.cos(phase * 2.0) * 1.0))

    stand = tpl['stand'].copy()
    out = np.zeros((52, 52, 4), dtype=np.uint8)

    # 1. Upper Body, Head & Flowing Hair (y = 0..27) with vertical bob_y
    for y in range(0, 28):
        ny = y + bob_y
        if not (2 <= ny < 50):
            continue
        u_hair = max(0.0, (y - 12) / 34.0)
        hair_dx = int(round(math.sin(phase - u_hair * 3.0) * (1.2 * u_hair)))
        for x in range(1, 33):
            if stand[y, x, 3] == 0:
                continue
            if x <= 16 and y >= 12:
                cx = max(2, min(20, x + hair_dx))
                out[ny, cx] = stand[y, x]
                if x >= 12:
                    out[ny, x] = stand[y, x]
            else:
                out[ny, x] = stand[y, x]

    if bob_y < 0:
        out[27, 11:30] = stand[27, 11:30]

    # 2. Full-Length Blue-Lined Cape & White-and-Gold Cathedral Gown (y = 28..45)
    for y in range(28, 46):
        v = (y - 28) / 17.0
        sway_dx = int(round(math.sin(phase) * 1.8 * v))
        wave_dx = int(round(math.cos(phase - v * 2.0) * 1.2 * v))
        for x in range(4, 33):
            if stand[y, x, 3] == 0:
                continue
            if x <= 15:
                nx = max(2, min(49, x + wave_dx))
                out[y, nx] = stand[y, x]
                if x >= 13:
                    out[y, max(2, min(49, x + sway_dx))] = stand[y, x]
            else:
                nx = max(2, min(49, x + sway_dx))
                out[y, nx] = stand[y, x]

    # 3. Natural Golden Boots & Slippers Counter-Striding Beneath the Gown (y = 46..49)
    stride = math.sin(phase)
    hem_sway = int(round(math.sin(phase) * 1.8))
    dx_back = int(round(hem_sway - stride * 1.6))
    dy_back = -1 if stride > 0.35 else 0
    dx_front = int(round(hem_sway + stride * 1.6))
    dy_front = -1 if stride < -0.35 else 0

    for y in range(46, 50):
        for x in range(14, 22):
            if stand[y, x, 3] > 0:
                ny = max(45, min(49, y + dy_back))
                nx = max(2, min(49, x + dx_back))
                out[ny, nx] = stand[y, x]
        for x in range(22, 32):
            if stand[y, x, 3] > 0:
                ny = max(45, min(49, y + dy_front))
                nx = max(2, min(49, x + dx_front))
                out[ny, nx] = stand[y, x]

    return fill_layer_pinholes(out, 1, 50, 1, 50, require_3_neighbors=False)


def make_crouch_body(tpl, crouch_depth):
    """
    Smooth continuous vertical compression warp on `tpl['stand']`:
    - Shifts `ny <= 27 + d` down by `d`
    - Compresses `ny = 28 + d .. 43` from `sy = int(round(27.0 + u * 16.0))`
      with a subtle 1px forward knee bend
    - Keeps her golden slippers/hem anchored at `ny = 44..49`
    """
    stand = tpl['stand'].copy()
    d = max(0, min(6, int(round(crouch_depth))))
    if d == 0:
        return stand

    canvas = np.zeros((52, 52, 4), dtype=np.uint8)

    # 1. Shift upper body, hair, and bodice (sy = 0..27 -> ny = d..27 + d) down by d
    for sy in range(0, 28):
        ny = sy + d
        if 1 <= ny < 50:
            canvas[ny, :] = stand[sy, :]

    # 2. Smoothly compress lower cape & gown (ny = 28 + d .. 43) from sy = int(round(27.0 + u * 16.0))
    y_start = 28 + d
    y_end = 43
    span = max(1.0, float(y_end - y_start))
    for ny in range(y_start, y_end + 1):
        u = (ny - y_start) / span
        sy = min(43, int(round(27.0 + u * 16.0)))
        knee_dx = int(round(math.sin(u * math.pi) * (1.0 if d >= 3 else 0.0)))
        for x in range(1, 34):
            if stand[sy, x, 3] == 0:
                continue
            if x >= 16 and knee_dx > 0:
                nx = min(49, x + knee_dx)
                canvas[ny, nx] = stand[sy, x]
                if x == 16:
                    canvas[ny, x] = stand[sy, x]
            else:
                canvas[ny, x] = stand[sy, x]

    # 3. Keep her golden slippers and lower hem anchored at ny = 44..49
    canvas[44:50, :] = stand[44:50, :]

    return fill_layer_pinholes(add_outline_to_layer(canvas), 1, 50, 1, 50, require_3_neighbors=False)


def make_jump_body(tpl, jump_dy, tuck_amount, torso_lean_dx=0, wing_unfurl=0.0, phase_rad=0.0):
    """
    Constructs a full-body Seraphic Wing-Glide Vault pose preserving Seraphina's natural
    hair, blue-lined cape, white-and-gold gown, and golden boots (y = 0..49).
    """
    stand = tpl['stand'].copy()
    torso_dy = max(-2, min(4, int(round(jump_dy))))
    t = max(0.0, float(tuck_amount))

    out = np.zeros((52, 52, 4), dtype=np.uint8)

    # 1. Upper Body, Head & Flowing Hair (y = 0..27) lifted by torso_dy
    for y in range(0, 28):
        ny = y + torso_dy
        if not (2 <= ny < 50):
            continue
        u_hair = max(0.0, (y - 12) / 34.0)
        hair_dx = -int(round(u_hair * 2.0 * max(0.2, t)))
        lean_dx = torso_lean_dx if y <= 26 else 0
        for x in range(1, 33):
            if stand[y, x, 3] == 0:
                continue
            if x <= 16 and y >= 12:
                cx = max(2, min(21, x + hair_dx))
                out[ny, cx] = stand[y, x]
                if x >= 12:
                    out[ny, max(2, min(49, x + lean_dx))] = stand[y, x]
            else:
                nx = max(2, min(49, x + lean_dx))
                out[ny, nx] = stand[y, x]
                if lean_dx > 0 and x >= 15 and out[ny, x, 3] == 0:
                    out[ny, x] = stand[y, x]

    # 2. Full-Length Cape, Gown & Boots (source y = 28..49) swept smoothly in the aerial vault
    y_start = max(2, 28 + torso_dy)
    hem_lift = int(round(t * 3.0))
    y_end = min(49, max(y_start + 14, 49 + torso_dy - hem_lift))
    span = max(1.0, float(y_end - y_start))

    for ny in range(y_start, y_end + 1):
        v = (ny - y_start) / span
        src_y = min(49, int(round(28.0 + v * 21.0)))
        sweep_dx = int(round(-v * t * 2.0 + math.sin(phase_rad - v * 2.0) * (1.0 * v)))
        for x in range(4, 33):
            if stand[src_y, x, 3] == 0:
                continue
            nx = max(2, min(49, x + sweep_dx))
            out[ny, nx] = stand[src_y, x]
            if sweep_dx < 0 and x >= 15 and nx + 1 < 49 and out[ny, nx + 1, 3] == 0:
                out[ny, nx + 1] = stand[src_y, x]

    out = fill_layer_pinholes(out, 1, 50, 1, 50, require_3_neighbors=False)

    if wing_unfurl > 0.05:
        out = draw_mini_wings_on_back(out, shoulder_x=17, shoulder_y=16 + torso_dy, unfurl=wing_unfurl, phase_rad=phase_rad)

    return fill_layer_pinholes(out, 1, 50, 1, 50, require_3_neighbors=True)


def build_row0_idle(tpl):
    """Row 0: 30-Frame Serene Cathedral IDLE."""
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        base = tpl['stand'].copy()

        breathe = -1 if 8 <= f <= 19 else 0
        if breathe == -1:
            head_top = base[6:10, 14:33].copy()
            upper = base[10:28, 14:33].copy()
            base[5:9, 14:33] = head_top
            base[9:27, 14:33] = upper
            base[27, 14:33] = upper[17, :]
            base = fill_layer_pinholes(base)

        base = apply_hair_and_vestment_wave(base, phase, amplitude=1.4, vertical_flutter=0.5)
        base = draw_halo_crown(base, head_cx=23, head_top_y=7 + breathe, phase_rad=phase, intensity=1.0)

        tilt_deg = 16.0 + math.sin(phase) * 3.0
        frame = draw_celestial_staff(
            base,
            shoulder=(25.0, 17.0 + breathe),
            staff_deg=tilt_deg,
            reach=5.2,
            charge_level=1 if f % 10 in (4, 5) else 0,
            phase_rad=phase,
        )
        frames.append(ensure_safe_cell(frame, margin=1))
    return frames


gen_row0_idle = build_row0_idle


def build_row1_walk(tpl):
    """Row 1: 30-Frame Graceful 2-Step Cathedral Stride (F00..F14 step A, F15..F29 step B)."""
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        bob_y = int(round(math.cos(phase * 2.0) * 1.0))
        body = render_walk_legs(tpl, f)
        body = draw_halo_crown(body, head_cx=23, head_top_y=7 + bob_y, phase_rad=phase, intensity=1.0)

        tilt_deg = 16.0 - math.sin(phase) * 7.0
        reach_w = 5.2 - math.sin(phase) * 0.6
        frame = draw_celestial_staff(
            body,
            shoulder=(25.0, 17.0 + bob_y),
            staff_deg=tilt_deg,
            reach=reach_w,
            charge_level=1 if f % 6 in (2, 3) else 0,
            phase_rad=phase,
        )
        frames.append(ensure_safe_cell(frame, margin=1))
    return frames


def build_row2_auto_attack(tpl):
    """
    Row 2: 30-Frame AUTO_ATTACK (Sacred Starlight Cast):
    - F00..F09: Prayerful windup drawing the Sun-Staff back to -12 deg from vertical with golden runes gathering.
    - F10..F18: Forward diagonal cast (+22..+27 deg from vertical) unleashing a Sacred Starlight bolt with full 30px staff.
    - F19..F29: Serene follow-through back to standing stance (+16 deg).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 9:
            u = f / 9.0
            base = (tpl['stand'] if f <= 3 else tpl['cast_up']).copy()
            base = apply_hair_and_vestment_wave(base, phase, amplitude=1.5, vertical_flutter=0.6)
            base = draw_halo_crown(base, head_cx=23, head_top_y=7, phase_rad=phase, intensity=1.2)
            tilt_deg = 16.0 - u * 28.0  # +16 -> -12 deg from vertical
            charge = 2 if f >= 7 else (1 if f >= 4 else 0)
            frame = draw_celestial_staff(
                base,
                shoulder=(25.0, 17.0 - u * 1.0),
                staff_deg=tilt_deg,
                reach=5.0 - u * 0.6,
                charge_level=charge,
                phase_rad=phase,
            )
            frames.append(ensure_safe_cell(frame, margin=1))

        elif f <= 18:
            k = f - 10
            base = tpl['cast_ext'].copy()
            if f in (11, 12):
                base = shift_layer(base, dx=-1, dy=0)
            base = apply_hair_and_vestment_wave(base, phase * 1.5, amplitude=1.8, vertical_flutter=0.7)
            base = draw_halo_crown(base, head_cx=26, head_top_y=8, phase_rad=phase, intensity=1.4)
            if k == 0:
                tilt_deg = 18.0
                reach_ext = 5.8
            elif k <= 5:
                tilt_deg = 24.0 + (k - 1) * 0.8  # +24..+27.2 deg diagonal cast
                reach_ext = 6.6
            else:
                tilt_deg = 26.0 - (k - 5) * 2.0
                reach_ext = 6.2 - (k - 5) * 0.2
            frame = draw_celestial_staff(
                base,
                shoulder=(27.0, 17.0),
                staff_deg=tilt_deg,
                reach=reach_ext,
                charge_level=3 if k <= 3 else 2,
                cast_flash=(f in (11, 12)),
                phase_rad=phase,
            )
            frames.append(ensure_safe_cell(frame, margin=1))

        else:
            u = (f - 19) / 10.0
            base = (tpl['cast_ext'] if f <= 21 else tpl['stand']).copy()
            base = apply_hair_and_vestment_wave(base, phase, amplitude=1.5, vertical_flutter=0.6)
            base = draw_halo_crown(base, head_cx=25 if f <= 21 else 23, head_top_y=7, phase_rad=phase, intensity=1.1)
            tilt_deg = 22.0 * (1.0 - u) + 16.0 * u
            reach_rec = 6.0 * (1.0 - u) + 5.2 * u
            sx_rec = 26.5 if f <= 21 else 25.0
            frame = draw_celestial_staff(
                base,
                shoulder=(sx_rec, 17.0),
                staff_deg=tilt_deg,
                reach=reach_rec,
                charge_level=1 if f <= 21 else 0,
                phase_rad=phase,
            )
            frames.append(ensure_safe_cell(frame, margin=1))

    return frames


def build_row3_skill(tpl):
    """
    Row 3: 30-Frame SKILL (Divine Sanctuary & Valkyrie Spear Rain):
    - Phase 1 (F00..F14): Prayer elevation raising the Celestial Sun-Staff skyward (-14..+4 deg)
      with a radiant golden halo burst to consecrate the sanctuary and call down Valkyrie Spears.
    - Phase 2 (F15..F22): Sweeps the full-length staff forward in a commanding diagonal archangel
      blessing (+22..+27 deg) and settles back to stance (F23..F29).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 14:
            u = f / 14.0
            elev = math.sin(u * math.pi)
            base = tpl['cast_up'].copy()
            base = apply_hair_and_vestment_wave(base, phase * 2.0, amplitude=1.8, vertical_flutter=0.8)
            base = draw_halo_crown(base, head_cx=23, head_top_y=6, phase_rad=phase * 2.0, intensity=1.6)
            tilt_deg = 12.0 - elev * 24.0  # +12 -> -12 deg skyward elevation
            charge = 3 if 5 <= f <= 12 else 2
            frame = draw_celestial_staff(
                base,
                shoulder=(25.0, 17.0 - elev * 1.5),
                staff_deg=tilt_deg,
                reach=4.8 - elev * 0.4,
                charge_level=charge,
                cast_flash=(f in (6, 7)),
                phase_rad=phase * 2.0,
            )
            frames.append(ensure_safe_cell(frame, margin=1))

        elif f <= 22:
            k = f - 15
            base = tpl['cast_ext'].copy()
            base = apply_hair_and_vestment_wave(base, phase * 2.0, amplitude=2.0, vertical_flutter=0.8)
            base = draw_halo_crown(base, head_cx=26, head_top_y=8, phase_rad=phase * 2.0, intensity=1.5)
            w = min(1.0, k / 2.0)
            tilt_deg = 14.0 * (1.0 - w) + 26.0 * w
            reach_sk = 5.6 * (1.0 - w) + 6.6 * w
            frame = draw_celestial_staff(
                base,
                shoulder=(27.0, 17.0),
                staff_deg=tilt_deg,
                reach=reach_sk,
                charge_level=3 if k <= 4 else 2,
                cast_flash=(f in (16, 17)),
                phase_rad=phase * 2.0,
            )
            frames.append(ensure_safe_cell(frame, margin=1))

        else:
            u = (f - 23) / 6.0
            base = tpl['stand'].copy()
            base = apply_hair_and_vestment_wave(base, phase, amplitude=1.5, vertical_flutter=0.6)
            base = draw_halo_crown(base, head_cx=23, head_top_y=7, phase_rad=phase, intensity=1.1)
            tilt_deg = 25.0 * (1.0 - u) + 16.0 * u
            reach_rec = 6.2 * (1.0 - u) + 5.2 * u
            frame = draw_celestial_staff(
                base,
                shoulder=(25.0, 17.0),
                staff_deg=tilt_deg,
                reach=reach_rec,
                charge_level=1 if u < 0.5 else 0,
                phase_rad=phase,
            )
            frames.append(ensure_safe_cell(frame, margin=1))

    return frames


def build_row4_ultimate(tpl):
    """
    Row 4: 30-Frame ULTIMATE (Seraphic Apotheosis):
    - Stage 1 (F00..F10): Ascends in prayer with staff held vertically (+6..-8 deg) as seraphic wings unfurl.
    - Stage 2 (F11..F20): Full Archangel elevation with floating hair, blazing crown halo, unfurled
      golden wing-feathers, and orbiting starlight motes (-8..+18 deg).
    - Stage 3 (F21..F29): Directs the full-length Celestial Sun-Staff forward at +24..+28 deg to channel
      Judgment Pillars and the Final Absolution Beam.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 10:
            u = f / 10.0
            dy_lift = -int(round(u * 2.0))
            body = make_jump_body(
                tpl,
                jump_dy=dy_lift,
                tuck_amount=u * 0.45,
                wing_unfurl=u * 0.85,
                phase_rad=phase * 2.0
            )
            body = apply_hair_and_vestment_wave(body, phase * 2.0, amplitude=1.8, vertical_flutter=0.8)
            body = draw_halo_crown(body, head_cx=23, head_top_y=6 - int(round(u * 1.0)), phase_rad=phase * 2.0, intensity=1.6)
            tilt_deg = 8.0 - u * 16.0  # +8 -> -8 deg
            frame = draw_celestial_staff(
                body,
                shoulder=(25.0, 17.0 + dy_lift),
                staff_deg=tilt_deg,
                reach=4.8,
                charge_level=2 if f >= 5 else 1,
                phase_rad=phase * 2.0,
            )

        elif f <= 20:
            u = (f - 11) / 9.0
            body = make_jump_body(
                tpl,
                jump_dy=-2,
                tuck_amount=0.55,
                wing_unfurl=1.0,
                phase_rad=phase * 3.0
            )
            body = apply_hair_and_vestment_wave(body, phase * 2.5, amplitude=2.0, vertical_flutter=0.9)
            body = draw_halo_crown(body, head_cx=23, head_top_y=5, phase_rad=phase * 3.0, intensity=1.8)
            tilt_deg = -8.0 + u * 26.0  # -8 -> +18 deg
            frame = draw_celestial_staff(
                body,
                shoulder=(25.0, 15.0),
                staff_deg=tilt_deg,
                reach=5.0 + u * 0.8,
                charge_level=3,
                cast_flash=(f in (13, 17)),
                phase_rad=phase * 3.0,
            )

        else:
            k = f - 21
            u = k / 8.0
            tuck = max(0.0, 0.55 * (1.0 - u))
            wing_u = max(0.2, 1.0 - u * 0.7)
            dy_lift = -int(round((1.0 - u) * 2.0))
            lean_dx = 1 if k <= 5 else 0
            body = make_jump_body(
                tpl,
                jump_dy=dy_lift,
                tuck_amount=tuck,
                torso_lean_dx=lean_dx,
                wing_unfurl=wing_u,
                phase_rad=phase * 2.0
            )
            body = apply_hair_and_vestment_wave(body, phase * 2.0, amplitude=1.8, vertical_flutter=0.8)
            body = draw_halo_crown(body, head_cx=23 + lean_dx, head_top_y=6, phase_rad=phase * 2.0, intensity=1.6)
            tilt_deg = 26.0 if k <= 5 else (26.0 - (k - 5) * 3.3)
            reach_ult = 6.5 if k <= 5 else (6.5 - (k - 5) * 0.4)
            frame = draw_celestial_staff(
                body,
                shoulder=(25.0 + lean_dx, 17.0 + dy_lift),
                staff_deg=tilt_deg,
                reach=reach_ult,
                charge_level=3 if k <= 5 else 1,
                cast_flash=(k in (0, 1, 2)),
                phase_rad=phase * 2.0,
            )

        # Orbiting starlight motes around Seraphina during Apotheosis
        for m in range(4):
            ma = phase * 2.0 + m * (math.pi * 0.5)
            mx = max(2.0, min(48.0, 24.0 + math.cos(ma) * 14.0))
            my = max(2.0, min(48.0, 24.0 + math.sin(ma) * 10.0))
            set_px(frame, mx, my, WHITE_PURE if m % 2 == 0 else GOLD_BRIGHT)
            set_px(frame, mx + 1, my, STAR_CREAM)

        frames.append(ensure_safe_cell(frame, margin=1))
    return frames


def build_row5_death(tpl):
    """
    Row 5: 30-Frame DEATH & HURT Sequence:
    - F00..F06: Hit-stagger recoil (HURT uses F00..F05).
    - F07..F17: Sinks gracefully to her knees in prayer, leaning on her dimming staff (+18..+28 deg).
    - F18..F29: Collapses horizontally onto the ground (y=36..49) with her Celestial Staff
      resting flat beside her.
    """
    frames = []
    for f in range(30):
        if f <= 6:
            u = f / 6.0
            dx = -int(round(math.sin(u * math.pi * 0.8) * 2.0))
            dy = int(round(u * 1.0))
            base = shift_layer(tpl['stand'], dx=dx, dy=dy)
            base = apply_hair_and_vestment_wave(base, u * math.pi, amplitude=1.4, vertical_flutter=0.5)
            frame = draw_celestial_staff(
                base,
                shoulder=(25.0 + dx, 17.0 + dy),
                staff_deg=16.0 + u * 8.0,
                reach=5.0,
                dim_factor=0.95,
            )
            frames.append(ensure_safe_cell(frame, margin=1))

        elif f <= 17:
            u = (f - 7) / 10.0
            base = (tpl['kneel1'] if f <= 11 else tpl['kneel2']).copy()
            base = apply_hair_and_vestment_wave(base, u * math.pi, amplitude=1.0, vertical_flutter=0.3)
            tilt_deg = 18.0 + u * 10.0  # +18 -> +28 deg
            frame = draw_celestial_staff(
                base,
                shoulder=(26.0, 19.0 + u * 2.0),
                staff_deg=tilt_deg,
                reach=5.2 + u * 0.8,
                dim_factor=0.90 - u * 0.20,
            )
            frames.append(ensure_safe_cell(frame, margin=1))

        elif f <= 22:
            u = (f - 17) / 6.0
            tilt_deg = u * 78.0
            kneel_with_staff = draw_celestial_staff(
                tpl['kneel2'].copy(),
                shoulder=(26.0, 21.0),
                staff_deg=28.0,
                reach=5.8,
                dim_factor=0.70,
            )
            pil_kn = Image.fromarray(kneel_with_staff, mode='RGBA')
            rotated = pil_kn.rotate(-tilt_deg, resample=Image.NEAREST, center=(24, 42))
            rot_arr = np.array(rotated, dtype=np.uint8)

            ys, _ = np.where(rot_arr[:, :, 3] > 0)
            max_y = int(ys.max()) if len(ys) > 0 else 48
            drop_y = 48 - max_y
            frame = np.zeros((52, 52, 4), dtype=np.uint8)
            for y in range(52):
                for x in range(52):
                    if rot_arr[y, x, 3] > 0:
                        ny = max(2, min(49, y + drop_y))
                        nx = max(2, min(49, x))
                        frame[ny, nx] = rot_arr[y, x]
            frame = fill_layer_pinholes(frame, 2, 50, 2, 50, require_3_neighbors=True)
            frames.append(ensure_safe_cell(frame, margin=1))

        else:
            k = f - 23
            frame = tpl['fall'].copy()
            frame = draw_celestial_staff(
                frame,
                shoulder=(25.0, 43.0),
                staff_deg=1.5,
                reach=2.0,
                shaft_up=13.5,
                shaft_down=13.5,
                dim_factor=max(0.55, 0.72 - k * 0.03),
                draw_arm=False,
                allow_horizontal=True,
            )
            frames.append(ensure_safe_cell(frame, margin=1))

    return frames


gen_row5_death = build_row5_death


def build_row6_dash(tpl):
    """
    Row 6: 30-Frame DASH (Angelic Feather-Glide):
    - Forward angelic glide dash with full-length Celestial Staff held in a graceful
      diagonal glide angle (+20..+27 deg from vertical) and trailing light feathers.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 4:
            u = f / 4.0
            crouch_dy = [0, 1, 1, 1, 0][f]
            src_body = tpl['stand'] if f <= 1 else tpl['dash']
            base = shift_layer(src_body, dx=0, dy=crouch_dy)
            base = apply_hair_and_vestment_wave(base, phase * 2.0, amplitude=1.6, is_dash=(f >= 2))
            base = draw_halo_crown(base, head_cx=24, head_top_y=7 + crouch_dy, phase_rad=phase, intensity=1.2)
            frame = draw_celestial_staff(
                base,
                shoulder=(25.0 + (1.0 if f >= 2 else 0.0), 17.0 + crouch_dy),
                staff_deg=16.0 + u * 9.0,
                reach=5.2 + u * 1.0,
                charge_level=1,
                phase_rad=phase,
            )

        elif f <= 21:
            k = f - 5
            glide_dy = -1 if 3 <= k <= 12 else 0
            base = shift_layer(tpl['dash'], dx=0, dy=glide_dy)
            base = apply_hair_and_vestment_wave(base, k * 0.8, amplitude=2.0, is_dash=True)
            base = draw_halo_crown(base, head_cx=25, head_top_y=7 + glide_dy, phase_rad=phase * 2.0, intensity=1.4)
            tilt_deg = 24.0 + math.sin(k * 0.5) * 3.0  # +21..+27 deg diagonal glide
            frame = draw_celestial_staff(
                base,
                shoulder=(26.0, 17.0 + glide_dy),
                staff_deg=tilt_deg,
                reach=6.2,
                charge_level=2 if 4 <= k <= 11 else 1,
                cast_flash=(f == 12),
                phase_rad=phase * 2.0,
            )
            for ft in range(3):
                fx = 4 + ((f * 3 + ft * 4) % 10)
                fy = 18 + ft * 8 + int(round(math.sin(phase * 2.0 + ft) * 2.0))
                set_px(frame, fx, fy, WHITE_PURE if ft == 0 else GOLD_BRIGHT)
                set_px(frame, fx + 1, fy, STAR_CREAM)

        else:
            u = (f - 22) / 7.0
            base = (tpl['dash'] if f <= 24 else tpl['stand']).copy()
            base = apply_hair_and_vestment_wave(base, phase, amplitude=1.5, vertical_flutter=0.6)
            base = draw_halo_crown(base, head_cx=23, head_top_y=7, phase_rad=phase, intensity=1.1)
            tilt_deg = 24.0 * (1.0 - u) + 16.0 * u
            frame = draw_celestial_staff(
                base,
                shoulder=(26.0 if f <= 24 else 25.0, 17.0),
                staff_deg=tilt_deg,
                reach=6.2 * (1.0 - u) + 5.2 * u,
                phase_rad=phase,
            )

        frames.append(ensure_safe_cell(frame, margin=1))
    return frames


def build_row7_crouch(tpl):
    """
    Row 7: 30-Frame CROUCH Sequence (Benediction Prayer & Sacred Counter-Cast):
    - Uses smooth continuous vertical compression warp `make_crouch_body(tpl, d)`
      keeping her golden slippers/hem anchored at ny = 44..49.
    - Holds her glowing Celestial Staff at a graceful diagonal prayer angle (15..24 deg)
      with zero boxy pasted-on shield/orb over her body.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 6:
            depths = [0, 1, 2, 3, 4, 5, 6]
            d = depths[f]
            base = tpl['stand'].copy() if d == 0 else make_crouch_body(tpl, d)
            base = apply_hair_and_vestment_wave(base, phase, amplitude=1.2, vertical_flutter=0.4)
            base = draw_halo_crown(base, head_cx=23, head_top_y=7 + d, phase_rad=phase, intensity=1.2)
            u = f / 6.0
            tilt_deg = 15.0 + u * 5.0  # 15 -> 20 deg prayer angle
            frame = draw_celestial_staff(
                base,
                shoulder=(25.0, 17.0 + min(4.0, d * 0.65)),
                staff_deg=tilt_deg,
                reach=5.2 + u * 0.5,
                charge_level=1 if f >= 4 else 0,
                phase_rad=phase * 2.0,
            )
            frames.append(ensure_safe_cell(frame, margin=1))

        elif f <= 18:
            d = 6
            base = make_crouch_body(tpl, d)
            if f in (12, 13):
                base = shift_layer(base, dx=-1, dy=0)
            base = apply_hair_and_vestment_wave(base, phase * 1.5, amplitude=1.3, vertical_flutter=0.4)
            base = draw_halo_crown(base, head_cx=23, head_top_y=7 + d, phase_rad=phase * 2.0, intensity=1.4)
            if f <= 10:
                u_aim = (f - 7) / 3.0
                tilt_deg = 20.0 + u_aim * 4.0  # 20 -> 24 deg
                reach_cr = 5.7 + u_aim * 0.6
            elif f <= 16:
                tilt_deg = 24.0 - (f - 11) * 0.5  # 24 -> 21.5 deg
                reach_cr = 6.3
            else:
                tilt_deg = 21.0 - (f - 16) * 1.0
                reach_cr = 5.8
            frame = draw_celestial_staff(
                base,
                shoulder=(25.0, 17.0 + 4.0),
                staff_deg=tilt_deg,
                reach=reach_cr,
                charge_level=3 if 10 <= f <= 15 else 2,
                cast_flash=(f in (12, 13)),
                phase_rad=phase * 2.0,
            )
            frames.append(ensure_safe_cell(frame, margin=1))

        else:
            depths = [6, 5, 5, 4, 4, 3, 2, 2, 1, 1, 0]
            k = f - 19
            d = depths[k]
            base = tpl['stand'].copy() if d == 0 else make_crouch_body(tpl, d)
            base = apply_hair_and_vestment_wave(base, phase, amplitude=1.3, vertical_flutter=0.5)
            base = draw_halo_crown(base, head_cx=23, head_top_y=7 + d, phase_rad=phase, intensity=1.0)
            u = k / 10.0
            tilt_deg = 20.0 * (1.0 - u) + 16.0 * u
            frame = draw_celestial_staff(
                base,
                shoulder=(25.0, 17.0 + min(4.0, d * 0.65)),
                staff_deg=tilt_deg,
                reach=5.8 * (1.0 - u) + 5.2 * u,
                phase_rad=phase,
            )
            frames.append(ensure_safe_cell(frame, margin=1))

    return frames


def build_row8_jump(tpl):
    """
    Row 8: 30-Frame JUMP Sequence (Seraphic Wing-Glide Vault & Starlight Smite):
    - F00..F04: Graceful knee-bend launch (+16 -> +6 deg).
    - F05..F11: Ascending angelic vault with luminous golden wing-feathers unfurling (+6 -> +24 deg).
    - F12..F18: Apex mid-air hover holding her full-length Celestial Staff at +25..+28 deg for Starlight Smite.
    - F19..F24: Feather-cushioned descent (+24 -> +16 deg).
    - F25..F29: Poised landing.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 4:
            crouch_seq = [1, 2, 4, 2, 0]
            dy = crouch_seq[f]
            body = make_crouch_body(tpl, dy) if dy >= 2 else make_jump_body(tpl, dy, tuck_amount=0.25, wing_unfurl=0.25 * f, phase_rad=phase)
            body = apply_hair_and_vestment_wave(body, phase * 1.5, amplitude=1.5, vertical_flutter=0.6)
            body = draw_halo_crown(body, head_cx=23, head_top_y=7 + dy, phase_rad=phase, intensity=1.2)
            tilt_deg = [16.0, 14.0, 12.0, 8.0, 6.0][f]
            frame = draw_celestial_staff(
                body,
                shoulder=(25.0, 17.0 + min(3.0, dy * 0.7)),
                staff_deg=tilt_deg,
                reach=5.0 + f * 0.15,
                charge_level=1 if f >= 3 else 0,
                phase_rad=phase,
            )
            frames.append(ensure_safe_cell(frame, margin=1))

        elif f <= 11:
            k = f - 5
            u = k / 6.0
            tuck = 0.45 + 0.40 * math.sin(u * math.pi * 0.65)
            wing_u = 0.55 + 0.45 * u
            lean_dx = 1 if k >= 3 else 0
            body = make_jump_body(tpl, jump_dy=-1, tuck_amount=tuck, torso_lean_dx=lean_dx, wing_unfurl=wing_u, phase_rad=phase * 2.0)
            body = apply_hair_and_vestment_wave(body, phase * 2.0, amplitude=1.8, vertical_flutter=0.8)
            body = draw_halo_crown(body, head_cx=23 + lean_dx, head_top_y=6, phase_rad=phase * 2.0, intensity=1.5)
            tilt_deg = 6.0 * (1.0 - u) + 24.0 * u
            frame = draw_celestial_staff(
                body,
                shoulder=(25.0 + lean_dx, 16.0),
                staff_deg=tilt_deg,
                reach=5.4 + u * 1.0,
                charge_level=2 if k >= 3 else 1,
                phase_rad=phase * 2.0,
            )
            frames.append(ensure_safe_cell(frame, margin=1))

        elif f <= 18:
            k = f - 12
            lean_dx = 0 if k in (3, 4) else 1
            body = make_jump_body(
                tpl,
                jump_dy=-2,
                tuck_amount=0.82 - k * 0.04,
                torso_lean_dx=lean_dx,
                wing_unfurl=1.0,
                phase_rad=phase * 2.5
            )
            body = apply_hair_and_vestment_wave(body, phase * 2.2, amplitude=2.0, vertical_flutter=0.9)
            body = draw_halo_crown(body, head_cx=23 + lean_dx, head_top_y=5, phase_rad=phase * 2.5, intensity=1.7)
            tilt_deg = 27.5 - (2.5 if k >= 4 else 0.0)
            frame = draw_celestial_staff(
                body,
                shoulder=(25.0 + lean_dx, 15.5),
                staff_deg=tilt_deg,
                reach=6.5,
                charge_level=3 if k <= 4 else 2,
                cast_flash=(f in (15, 16)),
                phase_rad=phase * 2.5,
            )
            frames.append(ensure_safe_cell(frame, margin=1))

        elif f <= 24:
            k = f - 19
            u = k / 5.0
            tuck = 0.55 * (1.0 - u)
            wing_u = 0.90 - u * 0.55
            dy_lift = -1 if k <= 2 else 0
            body = make_jump_body(tpl, jump_dy=dy_lift, tuck_amount=tuck, wing_unfurl=wing_u, phase_rad=phase * 2.0)
            body = apply_hair_and_vestment_wave(body, phase * 2.0, amplitude=1.7, vertical_flutter=0.8)
            body = draw_halo_crown(body, head_cx=23, head_top_y=6, phase_rad=phase * 2.0, intensity=1.3)
            tilt_deg = 24.0 * (1.0 - u) + 16.0 * u
            frame = draw_celestial_staff(
                body,
                shoulder=(25.0, 17.0 + dy_lift),
                staff_deg=tilt_deg,
                reach=6.2 * (1.0 - u) + 5.2 * u,
                charge_level=1 if k <= 1 else 0,
                phase_rad=phase * 2.0,
            )
            frames.append(ensure_safe_cell(frame, margin=1))

        else:
            k = f - 25
            crouch_depths = [2, 3, 2, 1, 0]
            d = crouch_depths[k]
            body = tpl['stand'].copy() if d == 0 else make_crouch_body(tpl, d)
            body = apply_hair_and_vestment_wave(body, phase, amplitude=1.4, vertical_flutter=0.5)
            body = draw_halo_crown(body, head_cx=23, head_top_y=7 + d, phase_rad=phase, intensity=1.0)
            u = k / 4.0
            tilt_deg = 18.0 * (1.0 - u) + 16.0 * u
            frame = draw_celestial_staff(
                body,
                shoulder=(25.0, 17.0 + min(2.5, d * 0.7)),
                staff_deg=tilt_deg,
                reach=5.2,
                phase_rad=phase,
            )
            frames.append(ensure_safe_cell(frame, margin=1))

    return frames


def paste_cell(canvas, r, f, cell, cell_px=208):
    cell_im = Image.fromarray(cell, mode='RGBA').resize((cell_px, cell_px), Image.NEAREST)
    canvas.paste(cell_im, (f * cell_px, r * cell_px))


def main():
    src = load_source_cells()
    tpl = make_clean_templates(src)

    rows = [
        ('ROW 0: IDLE (30 FRAMES)', build_row0_idle(tpl)),
        ('ROW 1: WALK (30 FRAMES)', build_row1_walk(tpl)),
        ('ROW 2: AUTO_ATTACK - SACRED STARLIGHT CAST (30 FRAMES)', build_row2_auto_attack(tpl)),
        ('ROW 3: SKILL - DIVINE SANCTUARY & SPEAR RAIN (30 FRAMES)', build_row3_skill(tpl)),
        ('ROW 4: ULTIMATE - SERAPHIC APOTHEOSIS (30 FRAMES)', build_row4_ultimate(tpl)),
        ('ROW 5: DEATH & HURT (30 FRAMES)', build_row5_death(tpl)),
        ('ROW 6: DASH - ANGELIC FEATHER-GLIDE (30 FRAMES)', build_row6_dash(tpl)),
        ('ROW 7: CROUCH - BENEDICTION PRAYER & ORB (30 FRAMES)', build_row7_crouch(tpl)),
        ('ROW 8: JUMP - SERAPHIC WING-GLIDE VAULT (30 FRAMES)', build_row8_jump(tpl)),
    ]

    num_rows = len(rows)
    cell_px = 208
    canvas = Image.new('RGBA', (30 * cell_px, num_rows * cell_px), (0, 0, 0, 0))

    for r, (r_name, r_frames) in enumerate(rows):
        assert len(r_frames) == 30, f'{r_name} has {len(r_frames)} frames instead of 30'
        for f in range(30):
            r_frames[f] = ensure_safe_cell(r_frames[f], margin=1)
        adj_diffs = sum(1 for i in range(29) if np.any(r_frames[i] != r_frames[i + 1]))
        print(f'{r_name:56s}: 30 frames generated, {adj_diffs}/29 adjacent transitions distinct')
        for f, cell in enumerate(r_frames):
            cell = ensure_safe_cell(cell, margin=1)
            paste_cell(canvas, r, f, cell, cell_px=cell_px)

    canvas.save('assets/sprites/priestess_sheet.png')
    print('Saved assets/sprites/priestess_sheet.png:', canvas.size)

    # Render full 30-col x 9-row contact sheet + zoomed-in left (F00..F14) and right (F15..F29) halves
    preview_cell = 96
    pad_top = 24
    dbg = Image.new('RGBA', (30 * preview_cell, num_rows * (preview_cell + pad_top)), (15, 20, 30, 255))
    draw = ImageDraw.Draw(dbg)
    for r_idx, (r_name, r_frames) in enumerate(rows):
        y0 = r_idx * (preview_cell + pad_top)
        draw.rectangle([0, y0, 30 * preview_cell, y0 + pad_top - 2], fill=(26, 34, 50, 255))
        draw.text((8, y0 + 5), r_name, fill=(253, 224, 71, 255))
        for c_idx, arr in enumerate(r_frames):
            x0 = c_idx * preview_cell
            draw.text((x0 + 4, y0 + 13), f'F{c_idx:02d}', fill=(148, 163, 184, 255))
            p_im = Image.fromarray(arr, mode='RGBA').resize((preview_cell, preview_cell), Image.NEAREST)
            dbg.paste(p_im, (x0, y0 + pad_top), p_im)
            draw.rectangle([x0, y0 + pad_top, x0 + preview_cell - 1, y0 + pad_top + preview_cell - 1], outline=(35, 45, 65, 255))

    art_dir = '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/4f1fb80f-a88f-4496-9746-b4b9fe84f6d4'
    dbg.crop((0, 0, 15 * preview_cell, dbg.height)).save(f'{art_dir}/debug_priestess_30fps_left_F00_F14.png')
    dbg.crop((15 * preview_cell, 0, 30 * preview_cell, dbg.height)).save(f'{art_dir}/debug_priestess_30fps_right_F15_F29.png')
    print('Saved Priestess contact sheets to:', art_dir)


if __name__ == '__main__':
    main()

