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


def make_clean_templates(src):
    """
    Strips 100% of the baked-in staff from every source pose so we can articulate
    EXACTLY ONE crisp Celestial Sun-Staff (`draw_celestial_staff`) per frame with
    zero duplicate staffs or leftover shaft tips.
    """
    # 1. Clean standing body (no baked staff at x >= 30 or bottom tip at y=42..46)
    stand = src['idle'].copy()
    stand[:22, 30:] = 0
    stand[22:32, 30:] = 0
    stand[32:37, 31:] = 0
    stand[42:44, 31:] = 0
    stand[44:47, 29:] = 0
    stand = fill_layer_pinholes(add_outline_to_layer(stand), 1, 50, 1, 50, require_3_neighbors=True)

    # Extract Seraphina's Back Greave/Boot and Front Greave/Boot from `stand`
    leg_back_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_front_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_back_patch[40:49, 15:22] = stand[40:49, 15:22]
    leg_front_patch[40:50, 23:29] = stand[40:50, 23:29]

    # Upper torso + upper vestments (without lower boots y >= 40, keeping left train x <= 14)
    stand_upper = stand.copy()
    stand_upper[40:, 15:] = 0
    stand_upper = fill_layer_pinholes(add_outline_to_layer(stand_upper), 1, 50, 1, 50, require_3_neighbors=True)

    # 2. Clean upward-prayer body (from atk_up)
    cast_up = src['atk_up'].copy()
    cast_up[:14, 31:] = 0
    cast_up[14:19, 32:] = 0
    cast_up[19:26, 30:] = 0
    cast_up[33:36, 31:] = 0
    cast_up[42:44, 31:] = 0
    cast_up[44:46, 29:] = 0
    cast_up = fill_layer_pinholes(add_outline_to_layer(cast_up), 1, 50, 1, 50, require_3_neighbors=True)

    # 3. Clean forward-extension lunging body (from atk_ext, with billowing hair & parted cape)
    cast_ext = src['atk_ext'].copy()
    cast_ext[13:23, 32:] = 0
    cast_ext = fill_layer_pinholes(add_outline_to_layer(cast_ext), 1, 50, 1, 50, require_3_neighbors=True)

    cast_ext_upper = cast_ext.copy()
    cast_ext_upper[40:, 14:] = 0
    cast_ext_upper = fill_layer_pinholes(add_outline_to_layer(cast_ext_upper), 1, 50, 1, 50, require_3_neighbors=True)

    # 4. Clean kneeling prayer body (from kneel1, removing baked staff at x >= 31..33)
    kneel = src['kneel1'].copy()
    kneel[:23, 32:] = 0
    kneel[23:43, 33:] = 0
    kneel[43:48, 31:] = 0
    # Shift kneeling pose up by 1px if it touches y=50 so it never clips at bottom
    ys_k, _ = np.where(kneel[:, :, 3] > 0)
    if len(ys_k) > 0 and ys_k.max() >= 50:
        kn_s = np.zeros_like(kneel)
        kn_s[:51, :] = kneel[1:, :]
        kneel = kn_s
    kneel = fill_layer_pinholes(add_outline_to_layer(kneel), 1, 50, 1, 50, require_3_neighbors=True)

    # 5. Clean horizontal fallen body (from fall, removing baked diagonal staff on her back at y <= 33!)
    fall = src['fall'].copy()
    fall[:33, :, :] = 0
    fall[33, :26] = 0
    fall[33, 35:] = 0
    fall[34, 39:] = 0
    fall = fill_layer_pinholes(add_outline_to_layer(fall), 1, 50, 1, 50, require_3_neighbors=True)

    # 6. Clean forward dash body (from dash, removing horizontal baked staff across waist & front)
    dash = src['dash'].copy()
    dash[18:29, 31:] = 0
    dash[20:29, 19:31] = stand[20:29, 19:31]
    dash[22:32, 30:] = 0
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
            # Keep solid bridge next to torso so shifting left never creates a vertical gap
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
    # Tiara jewel glint on her forehead/crown
    set_px(out, head_cx + 1, max(3, head_top_y + 2), WHITE_PURE if pulse > 0.65 else GOLD_BRIGHT)
    set_px(out, head_cx, max(3, head_top_y + 2), GOLD_BRIGHT)

    # Floating elliptical golden halo arc above her head (hy >= 3 so halo stays >= 2)
    rx = 4 if intensity < 1.3 else 5
    hy = max(3, head_top_y - 1)
    for dx in range(-rx, rx + 1):
        dy = 0 if abs(dx) >= rx - 1 else (-1 if dx % 2 == 0 else 0)
        col = WHITE_PURE if (dx == 0 and pulse > 0.5) else (GOLD_BRIGHT if abs(dx) <= 2 else GOLD_MID)
        set_px(out, head_cx + dx, max(2, hy + dy), col)

    if intensity >= 1.4:
        # Archangel crown star highlight at max(2, hy - 1) so it NEVER touches y=0 or y=1
        star_y = max(2, hy - 1)
        set_px(out, head_cx, star_y, WHITE_PURE)
        set_px(out, head_cx - 1, star_y, GOLD_BRIGHT)
        set_px(out, head_cx + 1, star_y, GOLD_BRIGHT)
    return out


def draw_mini_wings_on_back(frame, shoulder_x=22, shoulder_y=18, unfurl=1.0, phase_rad=0.0):
    """
    Renders luminous golden-white seraphic wing-feathers unfurling from Seraphina's shoulders
    for aerial vault (Row 8 JUMP) and Apotheosis (Row 4 ULTIMATE).
    """
    if unfurl <= 0.05:
        return frame
    wing_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    flap_dy = math.sin(phase_rad * 2.0) * 2.0 * unfurl

    # Upper, middle, and lower feathered pinions sweeping back-left and up
    for pinion_idx, (ang_base, length_scale) in enumerate([(-145.0, 1.0), (-168.0, 0.90), (165.0, 0.78)]):
        ang = math.radians(ang_base + math.sin(phase_rad + pinion_idx * 0.7) * 8.0)
        ux, uy = math.cos(ang), math.sin(ang)
        p_len = int(round((10.5 - pinion_idx * 1.5) * unfurl))
        for d in range(1, p_len + 1):
            wx = max(2.0, min(49.0, shoulder_x + ux * d))
            wy = max(2.0, min(48.0, shoulder_y + pinion_idx * 2.2 + uy * d + flap_dy * (d / max(1, p_len))))
            col = GOLD_BRIGHT if d <= 3 else (WHITE_PURE if d < p_len else STAR_CREAM)
            set_px(wing_layer, wx, wy, col)
            # Secondary covert feathers hanging below each pinion rib
            if d >= 3 and d % 2 == 1:
                set_px(wing_layer, wx, min(49.0, wy + 1), VEST_LIGHT)
                set_px(wing_layer, wx, min(49.0, wy + 2), GOLD_MID if d >= p_len - 1 else STAR_CREAM)

    # Composite BEHIND the character frame so her body and hair stay in front
    return composite_over(wing_layer, frame)


def solve_ik_elbow(sx, sy, hx, hy, L1=4.8, L2=4.5, bend_side=1.0):
    """
    2-Bone Inverse Kinematics solver returning the anatomical elbow joint (ex, ey)
    between shoulder (sx, sy) and hand (hx, hy).
    `bend_side = +1.0` bends the elbow naturally downward/back-left for Seraphina.
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


def draw_ik_priestess_arm(
    layer,
    sx,
    sy,
    hx,
    hy,
    L1=4.8,
    L2=4.5,
    bend_side=1.0,
    is_prayer_hand=False,
    dim_factor=1.0,
):
    """
    Renders Seraphina's 2-Bone IK Cathedral Arm:
    - Rotating gold-and-ivory cathedral shoulder pauldron/cap at `(sx, sy)` (`GOLD_BRIGHT`, `GOLD_MID`, `ROBE_PURE`)
    - 3px-thick white silk upper sleeve (`ROBE_PURE`, `ROBE_CREAM`, `ROBE_SHADOW`) from `(sx, sy)` to `(ex, ey)`
    - Golden elbow trim at `(ex, ey)`
    - 3px-thick cathedral bell-sleeve forearm + ornate gold cuff (`GOLD_BRIGHT`, `GOLD_MID`) from `(ex, ey)` to `(hx, hy)`
    - `2x2` graceful hand (`SKIN_LIGHT`, `SKIN_MID`) at `(hx, hy)`
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

    c_pure = dim_col(ROBE_CREAM if is_prayer_hand else ROBE_PURE)
    c_cream = dim_col(VEST_MID if is_prayer_hand else ROBE_CREAM)
    c_shad = dim_col(VEST_DEEP if is_prayer_hand else ROBE_SHADOW)
    c_gold_hi = dim_col(GOLD_MID if is_prayer_hand else GOLD_BRIGHT)
    c_gold_mid = dim_col(GOLD_DARK if is_prayer_hand else GOLD_MID)

    # 1. 3px-thick white silk upper sleeve from (sx, sy) to (ex, ey)
    u1x, u1y = ex - sx, ey - sy
    d1 = max(1.0, math.hypot(u1x, u1y))
    n1x, n1y = -u1y / d1, u1x / d1
    draw_line_px(layer, sx + n1x * 0.9, sy + n1y * 0.9, ex + n1x * 0.8, ey + n1y * 0.8, c_pure)
    draw_line_px(layer, sx - n1x * 0.9, sy - n1y * 0.9, ex - n1x * 0.8, ey - n1y * 0.8, c_shad)
    draw_line_px(layer, sx, sy, ex, ey, c_cream)

    # 2. 3px-thick cathedral bell-sleeve forearm + ornate gold cuff from (ex, ey) to (hx, hy)
    u2x, u2y = hx - ex, hy - ey
    d2 = max(1.0, math.hypot(u2x, u2y))
    n2x, n2y = -u2y / d2, u2x / d2
    # Bell-sleeve flare near wrist/cuff
    draw_line_px(layer, ex + n2x * 0.85, ey + n2y * 0.85, hx + n2x * 1.0, hy + n2y * 1.0, c_pure)
    draw_line_px(layer, ex - n2x * 0.85, ey - n2y * 0.85, hx - n2x * 1.1, hy - n2y * 1.1, c_shad)
    draw_line_px(layer, ex, ey, hx, hy, c_cream)

    # Ornate gold cathedral cuff just behind the wrist
    cuff_x = hx - (u2x / d2) * 1.2
    cuff_y = hy - (u2y / d2) * 1.2
    for c_step in (-1.0, 0.0, 1.0):
        set_px(
            layer,
            cuff_x + n2x * c_step,
            cuff_y + n2y * c_step,
            c_gold_hi if abs(c_step) < 0.5 else c_gold_mid,
        )

    # 3. Rotating gold-and-ivory cathedral shoulder pauldron/cap at (sx, sy)
    if not is_prayer_hand:
        ux1, uy1 = u1x / d1, u1y / d1
        for p_step in (-1.2, -0.4, 0.4, 1.2):
            px_s = sx + ux1 * 0.9 + n1x * p_step
            py_s = sy + uy1 * 0.9 + n1y * p_step
            set_px(layer, px_s, py_s, c_gold_hi if abs(p_step) > 0.8 else c_pure)
            set_px(layer, sx + n1x * p_step, sy + n1y * p_step, c_gold_mid)
        set_px(layer, sx, sy - 1, c_gold_hi)

    # 4. Golden elbow trim at (ex, ey)
    set_px(layer, ex, ey, c_gold_hi)
    set_px(layer, ex - n1x * 0.7, ey - n1y * 0.7, c_gold_mid)

    # 5. 2x2 graceful hand (SKIN_LIGHT, SKIN_MID) at (hx, hy)
    ix, iy = int(round(hx)), int(round(hy))
    set_px(layer, ix, iy, dim_col(SKIN_LIGHT))
    set_px(layer, ix + 1, iy, dim_col(SKIN_LIGHT))
    set_px(layer, ix, iy + 1, dim_col(SKIN_MID))
    set_px(layer, ix + 1, iy + 1, dim_col(SKIN_MID))


def draw_celestial_staff(
    base_frame,
    shoulder=(28, 19),
    staff_deg=-72.0,
    reach=5.2,
    shaft_up=14.0,
    shaft_down=14.5,
    charge_level=0,
    cast_flash=False,
    dim_factor=1.0,
    hand2_override=None,
    draw_arm=True,
    draw_rose_barrier=False,
    phase_rad=0.0,
):
    """
    Renders Seraphina's single articulated Celestial Sun-Staff AND 2-Bone IK Cathedral Arms:
    - Left Prayer/Blessing IK Arm (`draw_ik_priestess_arm`) drawn BEFORE the staff shaft.
    - Dynamic wide arm-swing trajectory `(gx, gy)` driven by `staff_deg` and `reach`.
    - Auto-foreshortened golden-ivory staff shaft from butt `(bx0, by0)` through `(gx, gy)` to finial `(tx, ty)`
      clamped inside `x in [7..43], y in [7..43]` so the 8-point Starlight Finial rays NEVER clip at cell borders.
    - Right Staff IK Arm (`draw_ik_priestess_arm`) drawn OVER the staff shaft.
    """
    rear_arm_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    staff_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    lead_arm_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    fx_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    rad = math.radians(staff_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    px, py = -uy, ux

    sx, sy = float(shoulder[0]), float(shoulder[1])

    # Expressive arm-swing trajectory driven by staff_deg and reach:
    # Convert screen-space staff_deg (-88..-70 upright windup, -15..+35 forward/downward swing)
    # into tilt from vertical (2..20 deg windup, 75..125 deg forward/downward swing)
    tilt_from_up = (staff_deg + 90.0) if staff_deg <= 5.0 else (staff_deg if staff_deg <= 88.0 else staff_deg + 90.0)
    if staff_deg > 5.0 and staff_deg <= 45.0:
        # Downward aerial smite (+25..+35 deg below horizontal = 115..125 deg from vertical)
        tilt_from_up = staff_deg + 90.0
    swing_rad = math.radians(tilt_from_up - 45.0)

    if draw_arm:
        gx = sx + reach * 0.85 + math.sin(swing_rad) * 4.5
        gy = sy + 0.5 + math.sin(swing_rad) * 4.2 + (reach - 5.5) * 0.4
        gx = max(8.0, min(42.0, gx))
        gy = max(8.0, min(42.0, gy))
    else:
        gx = sx + ux * 1.2 + abs(math.cos(rad)) * reach
        gy = sy + uy * 1.2 + math.sin(rad) * 1.5

    def dim_col(c):
        if dim_factor >= 0.99:
            return c
        return (
            int(c[0] * dim_factor),
            int(c[1] * dim_factor),
            int(c[2] * dim_factor),
            c[3],
        )

    # 1. Left Prayer / Blessing IK Arm (drawn BEFORE the staff)
    if draw_arm:
        if hand2_override is not None:
            lhx, lhy = float(hand2_override[0]), float(hand2_override[1])
        else:
            # Moves smoothly from prayer pose near her chest to an outstretched blessing gesture during casts
            forward_t = max(0.0, min(1.0, (tilt_from_up - 20.0) / 65.0))
            lhx = (sx - 1.5) * (1.0 - forward_t) + (gx - 2.8) * forward_t
            lhy = (sy - 0.5) * (1.0 - forward_t) + (gy - 1.2) * forward_t
        lhx = max(6.0, min(42.0, lhx))
        lhy = max(6.0, min(43.0, lhy))
        draw_ik_priestess_arm(
            rear_arm_layer,
            sx - 3.0,
            sy + 1.0,
            lhx,
            lhy,
            L1=4.3,
            L2=4.0,
            bend_side=1.0,
            is_prayer_hand=True,
            dim_factor=dim_factor,
        )

    # 2. Auto-foreshorten shaft_up and shaft_down dynamically so Finial (tx, ty) stays inside [7..43]
    eff_up = float(shaft_up)
    if ux > 0.05:
        eff_up = min(eff_up, (43.0 - gx) / ux)
    elif ux < -0.05:
        eff_up = min(eff_up, (7.0 - gx) / ux)
    if uy > 0.05:
        eff_up = min(eff_up, (43.0 - gy) / uy)
    elif uy < -0.05:
        eff_up = min(eff_up, (7.0 - gy) / uy)
    eff_up = max(5.5, eff_up)

    eff_down = float(shaft_down)
    if -ux > 0.05:
        eff_down = min(eff_down, (47.0 - gx) / (-ux))
    elif -ux < -0.05:
        eff_down = min(eff_down, (4.0 - gx) / (-ux))
    if -uy > 0.05:
        eff_down = min(eff_down, (47.5 - gy) / (-uy))
    elif -uy < -0.05:
        eff_down = min(eff_down, (4.0 - gy) / (-uy))
    eff_down = max(4.5, eff_down)

    bx0 = max(3.0, min(48.0, gx - ux * eff_down))
    by0 = max(3.0, min(48.0, gy - uy * eff_down))
    tx = max(7.0, min(43.0, gx + ux * eff_up))
    ty = max(7.0, min(43.0, gy + uy * eff_up))

    draw_line_px(staff_layer, bx0, by0, tx, ty, dim_col(GOLD_MID))
    draw_line_px(staff_layer, bx0 - px * 0.6, by0 - py * 0.6, tx - px * 0.6, ty - py * 0.6, dim_col(WOOD_DARK))
    # Golden pommel at bottom butt
    set_px(staff_layer, bx0, by0, dim_col(GOLD_BRIGHT))

    # Ornate cross-guard collar just below finial
    cx_neck = tx - ux * 2.8
    cy_neck = ty - uy * 2.8
    for w in (-2, -1, 0, 1, 2):
        set_px(staff_layer, cx_neck + px * w, cy_neck + py * w, dim_col(GOLD_BRIGHT if abs(w) <= 1 else GOLD_DARK))

    # 3. Ornate Celestial Sun-Ring & 8-Point Starlight Finial centered at (tx, ty)
    ring_r = 3.0
    for step in range(16):
        a = (step / 16.0) * 2.0 * math.pi
        rx = tx + math.cos(a) * ring_r
        ry = ty + math.sin(a) * ring_r
        c_ring = GOLD_BRIGHT if step % 2 == 0 else GOLD_MID
        set_px(staff_layer, rx, ry, dim_col(c_ring))

    # 4 cardinal sun-points + 4 diagonal starlight points around the finial (fits safely inside [3..47])
    for k in range(8):
        a = rad + k * (math.pi * 0.25)
        ray_len = 4.0 if k % 2 == 0 else 3.4
        rx = max(2.0, min(49.0, tx + math.cos(a) * ray_len))
        ry = max(2.0, min(49.0, ty + math.sin(a) * ray_len))
        set_px(
            staff_layer,
            rx,
            ry,
            dim_col(STAR_CREAM if (k % 2 == 0 and charge_level >= 1) else GOLD_BRIGHT)
        )

    # Sacred Teal-Cyan Gem & Luminous Star Core inside the Sun-Ring
    set_px(staff_layer, tx - ux * 1.0, ty - uy * 1.0, dim_col(CYAN_SACRED))
    set_px(staff_layer, tx + px * 1.0, ty + py * 1.0, dim_col(CYAN_SACRED))
    set_px(staff_layer, tx - px * 1.0, ty - py * 1.0, dim_col(GOLD_BRIGHT))
    set_px(staff_layer, tx, ty, dim_col(WHITE_PURE if dim_factor > 0.6 else GOLD_MID))

    # 4. Right Staff IK Arm drawn OVER the staff shaft!
    if draw_arm:
        bend_dir = -1.0 if (gy < sy - 2.5 and gx <= sx + 2.5) else 1.0
        draw_ik_priestess_arm(
            lead_arm_layer,
            sx,
            sy,
            gx,
            gy,
            L1=4.8,
            L2=4.5,
            bend_side=bend_dir,
            is_prayer_hand=False,
            dim_factor=dim_factor,
        )

    # 5. Dynamic Charge Runes & Sacred Starlight Cast Flash at Finial Tip (clamped inside [2..49])
    if charge_level >= 1:
        for d in range(1, charge_level + 2):
            col = WHITE_PURE if d == 1 else (GOLD_BRIGHT if d == 2 else STAR_CREAM)
            set_px(fx_layer, min(49.0, tx + d), ty, col)
            set_px(fx_layer, max(2.0, tx - d), ty, col)
            set_px(fx_layer, tx, min(49.0, ty + d), col)
            set_px(fx_layer, tx, max(2.0, ty - d), col)
        # Orbiting golden rune motes
        for m in range(3):
            ma = phase_rad * 2.0 + m * (2.0 * math.pi / 3.0)
            mx = max(2.0, min(49.0, tx + math.cos(ma) * (3.8 + charge_level * 0.4)))
            my = max(2.0, min(49.0, ty + math.sin(ma) * (3.8 + charge_level * 0.4)))
            set_px(fx_layer, mx, my, GOLD_BRIGHT if m % 2 == 0 else CYAN_SACRED)

    if cast_flash:
        fx_cx = max(5.0, min(46.0, tx + ux * 2.0))
        fx_cy = max(5.0, min(46.0, ty + uy * 2.0))
        set_px(fx_layer, fx_cx, fx_cy, WHITE_PURE)
        for d in range(1, 5):
            col = WHITE_PURE if d <= 2 else (GOLD_BRIGHT if d <= 3 else STAR_CREAM)
            set_px(fx_layer, max(2.0, min(49.0, fx_cx + px * d)), max(2.0, min(49.0, fx_cy + py * d)), col)
            set_px(fx_layer, max(2.0, min(49.0, fx_cx - px * d)), max(2.0, min(49.0, fx_cy - py * d)), col)
            set_px(fx_layer, max(2.0, min(49.0, fx_cx + ux * d)), max(2.0, min(49.0, fx_cy + uy * d)), col)
        for dx_d, dy_d in [(-2, -2), (2, -2), (-2, 2), (2, 2)]:
            set_px(fx_layer, max(2.0, min(49.0, fx_cx + dx_d)), max(2.0, min(49.0, fx_cy + dy_d)), GOLD_BRIGHT)

    # 6. Optional Shimmering Golden Rose-Window Barrier in front of Crouching Seraphina (Row 7)
    if draw_rose_barrier:
        bcx = min(45.0, gx + 7.5)
        bcy = max(10.0, min(41.0, gy + 1.5))
        for step in range(20):
            ba = (step / 20.0) * 2.0 * math.pi + phase_rad
            bx = max(2.0, min(49.0, bcx + math.cos(ba) * 3.0))
            by = max(2.0, min(49.0, bcy + math.sin(ba) * 7.0))
            set_px(fx_layer, bx, by, GOLD_BRIGHT if step % 2 == 0 else CYAN_SACRED)
        # Inner rose cross
        draw_line_px(fx_layer, bcx, max(2.0, bcy - 6), bcx, min(49.0, bcy + 6), STAR_CREAM)
        draw_line_px(fx_layer, max(2.0, bcx - 2), bcy, min(49.0, bcx + 2), bcy, WHITE_PURE)

    out = composite_over(base_frame, rear_arm_layer)
    out = composite_over(out, staff_layer)
    out = composite_over(out, lead_arm_layer)
    out = composite_over(out, fx_layer)
    return out



def render_walk_legs(tpl, f):
    """
    Renders Seraphina's graceful 30-frame 2-step cathedral stride (F00..F14 step A, F15..F29 step B)
    in true anatomical depth order:
    1. Backmost Layer: Flowing blonde hair & cathedral robe train with sacred breeze wave.
    2. Far Leg Layer: Sculpted white-gold thigh + knee + boot (`leg_back`) shaded 0.80x for clear depth separation.
    3. Parted Cathedral Stole / Tabard: Golden-trimmed white stole swaying dynamically at y=31..39.
    4. Near Leg Layer: Full-brightness white-gold greave + boot (`leg_front`) with smooth knee-lift & stride reach.
    5. Upper Torso & Head: Gentle 2-step vertical cadence bob (+1px forward posture).
    """
    phase = (f / 30.0) * 2.0 * math.pi
    bob_y = int(round(math.cos(phase * 2.0) * 1.0))

    stand = tpl['stand'].copy()
    train_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    # 1. Extract Left Hair & Cathedral Robe Train (x <= 18, y = 12..46) with pure horizontal traveling wave
    for y in range(12, 47):
        ny = y + bob_y
        if not (2 <= ny < 50):
            continue
        u = (y - 12) / 34.0
        wave_dx = int(round(-u * 1.8 + math.sin(phase - u * 3.2) * (1.4 * u)))
        for x in range(1, 19):
            if stand[y, x, 3] == 0:
                continue
            if y >= 39 and x > 14:
                continue
            cx = max(2, min(21, x + wave_dx))
            train_layer[ny, cx] = stand[y, x]
            if x >= 11 and y <= 39:
                train_layer[ny, x] = stand[y, x]
                if x + 1 < 21:
                    train_layer[ny, x + 1] = stand[y, x]
    train_layer = fill_layer_pinholes(train_layer, x0=2, x1=22, y0=10, y1=49, require_3_neighbors=False)

    # 2. Extract Upper Torso, Skirt, Halo & Head (keep torso vestments down to y=36..38)
    for y in range(0, 37):
        ny = y + bob_y
        if not (2 <= ny < 50):
            continue
        lean_dx = 1 if y <= 28 else 0
        for x in range(14, 32):
            if stand[y, x, 3] > 0:
                torso_layer[ny, min(49, x + lean_dx)] = stand[y, x]
                if lean_dx > 0 and x >= 15 and torso_layer[ny, x, 3] == 0:
                    torso_layer[ny, x] = stand[y, x]

    # Fill any transparent hip/skirt seam pixels at y=29..35, x=20..31 with ROBE_SHADOW / ROBE_CREAM
    for y in range(29, 36):
        ny = max(2, min(49, y + bob_y))
        for x in range(20, 30):
            if torso_layer[ny, x, 3] == 0:
                torso_layer[ny, x] = ROBE_CREAM if 22 <= x <= 27 else ROBE_SHADOW
    torso_layer = fill_layer_pinholes(torso_layer, x0=12, x1=34, y0=4, y1=40, require_3_neighbors=False)

    hip_x = 23.0
    hip_y = 33.5 + bob_y

    def build_striding_leg(boot_patch, orig_cx, swing_phase, is_far_leg=False):
        layer = np.zeros((52, 52, 4), dtype=np.uint8)
        s_val = math.sin(swing_phase)
        c_val = math.cos(swing_phase)

        knee_lift = max(0.0, c_val)
        knee_x = hip_x + s_val * 4.2 + knee_lift * 1.8
        knee_y = hip_y + 5.0 - knee_lift * 1.6

        foot_target_x = 23.5 + s_val * 5.6 - knee_lift * 1.8
        foot_lift_dy = bob_y - int(round(knee_lift * 2.5))

        boot_rot_deg = s_val * 18.0 - knee_lift * 20.0
        pil_boot = Image.fromarray(boot_patch, mode='RGBA')
        rot_boot = np.array(
            pil_boot.rotate(boot_rot_deg, resample=Image.NEAREST, center=(orig_cx, 42.0)),
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
                        px_col[0] = int(px_col[0] * 0.78)
                        px_col[1] = int(px_col[1] * 0.78)
                        px_col[2] = int(px_col[2] * 0.82)
                    layer[ny, nx] = px_col

        ank_x = foot_target_x + math.sin(math.radians(boot_rot_deg)) * 1.2
        ank_y = 42.0 + foot_lift_dy

        if is_far_leg:
            c_dark = VEST_DEEP
            c_mid = VEST_SHADOW
            c_hi = VEST_MID
            c_greave = GOLD_DARK
            c_gold = GOLD_MID
        else:
            c_dark = VEST_SHADOW
            c_mid = VEST_MID
            c_hi = VEST_LIGHT
            c_greave = VEST_LIGHT
            c_gold = GOLD_BRIGHT

        # Sculpted Cathedral Pleated Skirt / Thigh (Hip -> Knee)
        for off_x, col in [(-2.2, c_dark), (-1.4, c_mid), (-0.6, c_hi), (0.2, c_hi), (1.0, c_hi), (1.7, c_mid), (2.4, c_dark)]:
            draw_line_px(layer, hip_x + off_x, hip_y - 1.5, knee_x + off_x * 0.85, knee_y, col)

        # Sculpted White-and-Gold Greave (Knee -> Boot Top)
        for off_x, col in [(-1.4, c_dark), (-0.6, c_greave), (0.2, c_gold), (0.9, c_greave), (1.4, c_dark)]:
            draw_line_px(layer, knee_x + off_x, knee_y, ank_x + off_x * 0.85, ank_y, col)

        # Golden Winged Knee-Guard highlight
        set_px(layer, knee_x, knee_y, c_gold)
        set_px(layer, knee_x + 1, knee_y, c_gold)
        return fill_layer_pinholes(layer, x0=4, x1=49, y0=30, y1=50, require_3_neighbors=False)

    far_leg = build_striding_leg(tpl['leg_back'], 18.5, phase + math.pi, is_far_leg=True)
    near_leg = build_striding_leg(tpl['leg_front'], 25.5, phase, is_far_leg=False)

    # Dynamic white-and-gold cathedral stole / front tabard swaying between parted vestments
    stole_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    flap_dx = math.sin(phase) * 2.0
    stole_cols = [
        (-4.0, TEAL_DEEP),
        (-3.2, TEAL_LINING),
        (-2.4, VEST_SHADOW),
        (-1.6, VEST_MID),
        (-0.8, VEST_MID),
        (0.0, VEST_LIGHT),
        (0.8, GOLD_BRIGHT),
        (1.6, VEST_LIGHT),
        (2.4, GOLD_MID),
        (3.0, GOLD_MID),
    ]
    for off_x, col in stole_cols:
        draw_line_px(
            stole_layer,
            hip_x + off_x,
            hip_y - 2.0,
            hip_x + off_x + flap_dx * 0.85,
            hip_y + 7.0,
            col
        )
    stole_layer = fill_layer_pinholes(stole_layer, x0=14, x1=34, y0=29, y1=45, require_3_neighbors=False)

    out = composite_over(train_layer, torso_layer)
    out = composite_over(out, far_leg)
    out = composite_over(out, stole_layer)
    out = composite_over(out, near_leg)
    return fill_layer_pinholes(out, 1, 50, 1, 50, require_3_neighbors=True)


def make_crouch_body(tpl, crouch_depth):
    """
    Constructs a clean Benediction Prayer crouch body with `crouch_depth` in [1..7] logical pixels:
    - Anchors Seraphina's kneeling lower vestments (`tpl['kneel']` y=35..49) firmly on the floor when depth >= 4,
      or compressed standing legs when depth in 1..3.
    - Lowers her upper torso, flowing hair, and head smoothly by `crouch_depth` pixels (up to 7px lower!).
    """
    canvas = np.zeros((52, 52, 4), dtype=np.uint8)
    if crouch_depth >= 4:
        canvas[35:50, :33] = tpl['kneel'][35:50, :33]
        upper = tpl['stand_upper']
        for y in range(0, 37):
            ny = y + crouch_depth
            if 2 <= ny < 49:
                for x in range(0, 33):
                    if upper[y, x, 3] > 0:
                        canvas[ny, x] = upper[y, x]
    else:
        canvas[36:50, :32] = tpl['stand'][36:50, :32]
        upper = tpl['stand_upper']
        for y in range(0, 37):
            ny = y + crouch_depth
            if 2 <= ny < 49:
                for x in range(0, 33):
                    if upper[y, x, 3] > 0:
                        canvas[ny, x] = upper[y, x]

    # Fill any transparent hip/skirt seam pixels at y=29..35, x=20..30 with ROBE_SHADOW / ROBE_CREAM
    for y in range(max(29, 29 + crouch_depth - 2), min(46, 36 + crouch_depth)):
        for x in range(20, 30):
            if canvas[y, x, 3] == 0:
                canvas[y, x] = ROBE_CREAM if 22 <= x <= 27 else ROBE_SHADOW

    return fill_layer_pinholes(add_outline_to_layer(canvas), 1, 50, 1, 50, require_3_neighbors=False)


def make_jump_body(tpl, jump_dy, tuck_amount, torso_lean_dx=0, wing_unfurl=0.0, phase_rad=0.0):
    """
    Constructs a full-body Seraphic Wing-Glide Vault pose (NEVER a round ball!):
    - Every frame preserves Seraphina's full head, golden halo crown, flowing blonde hair,
      cathedral vestments, sculpted legs/boots, and optional unfurling golden wing-feathers.
    """
    stand = tpl['stand'].copy()
    torso_dy = max(-2, min(4, jump_dy))

    train_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    # 1. Flowing Blonde Hair & Cathedral Cape lifted by the angelic leap
    for y in range(12, 47):
        for x in range(1, 19):
            if stand[y, x, 3] == 0:
                continue
            if y >= 39 and x > 14:
                continue
            u = (y - 12) / 34.0
            cx = max(2, min(21, x - int(round(u * 2.2 * max(0.2, tuck_amount)))))
            cy = max(10, min(48, y + torso_dy))
            train_layer[cy, cx] = stand[y, x]
            if x >= 11 and y <= 39:
                train_layer[max(2, min(49, y + torso_dy)), x] = stand[y, x]
    train_layer = fill_layer_pinholes(train_layer, x0=2, x1=22, y0=9, y1=49, require_3_neighbors=False)

    # 2. Upper Torso, Skirt, Halo & Head (keep torso vestments down to y=36)
    for y in range(0, 37):
        ny = y + torso_dy
        if not (2 <= ny < 50):
            continue
        dx = torso_lean_dx if y <= 26 else 0
        for x in range(14, 32):
            if stand[y, x, 3] > 0:
                torso_layer[ny, max(2, min(49, x + dx))] = stand[y, x]
                if dx > 0 and x >= 15 and torso_layer[ny, x, 3] == 0:
                    torso_layer[ny, x] = stand[y, x]

    # Fill any transparent hip/skirt seam pixels at y=29..35, x=20..30 with ROBE_SHADOW / ROBE_CREAM
    for y in range(29, 36):
        ny = max(2, min(49, y + torso_dy))
        for x in range(20, 30):
            if torso_layer[ny, x, 3] == 0:
                torso_layer[ny, x] = ROBE_CREAM if 22 <= x <= 27 else ROBE_SHADOW
    torso_layer = fill_layer_pinholes(torso_layer, x0=12, x1=34, y0=4, y1=40, require_3_neighbors=False)

    hip_x = 23.0
    hip_y = 33.5 + torso_dy

    def build_aerial_leg(boot_patch, orig_cx, knee_dx, knee_dy, foot_dx, foot_dy, boot_rot_deg, is_far_leg=False):
        layer = np.zeros((52, 52, 4), dtype=np.uint8)
        pil_boot = Image.fromarray(boot_patch, mode='RGBA')
        rot_boot = np.array(
            pil_boot.rotate(boot_rot_deg, resample=Image.NEAREST, center=(orig_cx, 42.0)),
            dtype=np.uint8
        )
        for y in range(34, 52):
            for x in range(4, 50):
                if rot_boot[y, x, 3] > 0:
                    ny = max(28, min(49, y + int(round(foot_dy))))
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
        ay = 42.0 + foot_dy

        if is_far_leg:
            c_dark, c_mid, c_hi, c_greave, c_gold = VEST_DEEP, VEST_SHADOW, VEST_MID, GOLD_DARK, GOLD_MID
        else:
            c_dark, c_mid, c_hi, c_greave, c_gold = VEST_SHADOW, VEST_MID, VEST_LIGHT, VEST_LIGHT, GOLD_BRIGHT

        for off_x, col in [(-2.0, c_dark), (-1.2, c_mid), (-0.4, c_hi), (0.4, c_hi), (1.1, c_mid), (1.8, c_dark)]:
            draw_line_px(layer, hip_x + off_x, hip_y - 1.5, kx + off_x * 0.85, ky, col)
        for off_x, col in [(-1.2, c_dark), (-0.4, c_greave), (0.4, c_gold), (1.0, c_greave), (1.4, c_dark)]:
            draw_line_px(layer, kx + off_x, ky, ax + off_x * 0.85, ay, col)
        set_px(layer, kx, ky, c_gold)
        set_px(layer, kx + 1, ky, c_gold)
        return fill_layer_pinholes(layer, x0=4, x1=49, y0=28, y1=50, require_3_neighbors=False)

    t = max(0.0, tuck_amount)
    far_leg = build_aerial_leg(
        tpl['leg_back'],
        18.5,
        knee_dx=-2.6 * t - 0.8,
        knee_dy=4.5 - 1.2 * t,
        foot_dx=-3.2 * t,
        foot_dy=torso_dy - 3.0 * t,
        boot_rot_deg=-20.0 * t,
        is_far_leg=True
    )
    near_leg = build_aerial_leg(
        tpl['leg_front'],
        25.5,
        knee_dx=3.8 * t + 1.0,
        knee_dy=3.8 - 2.2 * t,
        foot_dx=1.0 * t,
        foot_dy=torso_dy - 4.4 * t,
        boot_rot_deg=-18.0 * t,
        is_far_leg=False
    )

    stole_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    for off_x, col in [(-3.5, TEAL_DEEP), (-2.7, TEAL_LINING), (-1.9, VEST_SHADOW), (-1.1, VEST_MID), (-0.3, VEST_LIGHT), (0.5, VEST_LIGHT), (1.3, GOLD_BRIGHT), (2.1, VEST_MID), (2.7, GOLD_MID)]:
        draw_line_px(stole_layer, hip_x + off_x, hip_y - 2.0, hip_x + off_x + 1.5 * t, hip_y + 6.5 - 1.0 * t, col)
    stole_layer = fill_layer_pinholes(stole_layer, x0=14, x1=34, y0=27, y1=45, require_3_neighbors=False)

    out = composite_over(train_layer, torso_layer)
    out = composite_over(out, far_leg)
    out = composite_over(out, stole_layer)
    out = composite_over(out, near_leg)
    out = fill_layer_pinholes(out, 1, 50, 1, 50, require_3_neighbors=True)

    if wing_unfurl > 0.05:
        out = draw_mini_wings_on_back(out, shoulder_x=21, shoulder_y=18 + torso_dy, unfurl=wing_unfurl, phase_rad=phase_rad)

    return fill_layer_pinholes(out, 1, 50, 1, 50, require_3_neighbors=True)


def build_row0_idle(tpl):
    """Row 0: 30-Frame Serene Cathedral IDLE."""
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        base = tpl['stand'].copy()

        breathe = -1 if 8 <= f <= 19 else 0
        if breathe == -1:
            head_top = base[6:10, 14:38].copy()
            upper = base[10:30, 14:38].copy()
            base[5:9, 14:38] = head_top
            base[9:29, 14:38] = upper
            # Duplicate row 29 so shifting base[10:30, 14:38] up by 1px never leaves a horizontal slit at the waist!
            base[29, 14:38] = upper[19, :]
            base = fill_layer_pinholes(base)

        base = apply_hair_and_vestment_wave(base, phase, amplitude=1.5, vertical_flutter=0.6)
        base = draw_halo_crown(base, head_cx=24, head_top_y=7 + breathe, phase_rad=phase, intensity=1.0)

        staff_deg = -72.0 + math.sin(phase) * 3.0
        frame = draw_celestial_staff(
            base,
            shoulder=(27, 21 + breathe),
            staff_deg=staff_deg,
            reach=5.2,
            shaft_up=13.5,
            shaft_down=15.0,
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
        body = draw_halo_crown(body, head_cx=25, head_top_y=7 + bob_y, phase_rad=phase, intensity=1.0)

        # Counter-swinging Celestial Sun-Staff & prayer hand
        staff_deg = -68.0 - math.sin(phase) * 10.0
        reach_w = 5.2 - math.sin(phase) * 0.8
        hand2_x = int(round(25.0 - math.sin(phase) * 2.5))
        hand2_y = int(round(21.5 + bob_y + math.cos(phase * 2.0) * 1.0))
        frame = draw_celestial_staff(
            body,
            shoulder=(28, 21 + bob_y),
            staff_deg=staff_deg,
            reach=reach_w,
            shaft_up=13.5,
            shaft_down=14.0,
            hand2_override=(hand2_x, hand2_y),
            phase_rad=phase,
        )
        frames.append(ensure_safe_cell(frame, margin=1))
    return frames


def build_row2_auto_attack(tpl):
    """
    Row 2: 30-Frame AUTO_ATTACK (Sacred Starlight Cast):
    - F00..F09: Prayerful windup drawing the Sun-Staff high & back with golden runes gathering at the tip.
    - F10..F18: Wide forward staff extension unleashing a Sacred Starlight bolt.
    - F19..F29: Serene follow-through back to standing stance.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 9:
            u = f / 9.0
            base = (tpl['stand'] if f <= 3 else tpl['cast_up']).copy()
            base = apply_hair_and_vestment_wave(base, phase, amplitude=1.6, vertical_flutter=0.7)
            base = draw_halo_crown(base, head_cx=24, head_top_y=7, phase_rad=phase, intensity=1.2)
            staff_deg = -72.0 - u * 12.0  # -72 -> -84 (drawn high & back in prayer)
            charge = 2 if f >= 7 else (1 if f >= 4 else 0)
            frame = draw_celestial_staff(
                base,
                shoulder=(27, 20 - int(round(u * 2.0))),
                staff_deg=staff_deg,
                reach=4.2 - u * 0.6,
                shaft_up=13.5,
                shaft_down=14.0,
                charge_level=charge,
                hand2_override=(25, 19 - int(round(u * 2.0))),
                phase_rad=phase,
            )
            frames.append(ensure_safe_cell(frame, margin=1))

        elif f <= 18:
            k = f - 10
            u = k / 8.0
            base = tpl['cast_ext'].copy()
            if f in (11, 12):
                base = shift_layer(base, dx=-1, dy=0)
            base = apply_hair_and_vestment_wave(base, phase * 1.5, amplitude=2.0, vertical_flutter=0.8)
            base = draw_halo_crown(base, head_cx=28, head_top_y=8, phase_rad=phase, intensity=1.4)
            # Sweeps rapidly to horizontal extension at F11..F15, then gentle arc
            if k == 0:
                staff_deg = -32.0
                reach_ext = 6.8
            elif k <= 5:
                staff_deg = -6.0 + (k - 1) * 1.2
                reach_ext = 8.4
            else:
                staff_deg = -10.0 - (k - 5) * 8.0
                reach_ext = 7.4 - (k - 5) * 0.5
            frame = draw_celestial_staff(
                base,
                shoulder=(29, 18),
                staff_deg=staff_deg,
                reach=reach_ext,
                shaft_up=12.5,
                shaft_down=10.5,
                charge_level=3 if k <= 3 else 2,
                cast_flash=(f in (11, 12)),
                phase_rad=phase,
            )
            frames.append(ensure_safe_cell(frame, margin=1))

        else:
            u = (f - 19) / 10.0
            base = (tpl['cast_ext'] if f <= 21 else tpl['stand']).copy()
            base = apply_hair_and_vestment_wave(base, phase, amplitude=1.6, vertical_flutter=0.6)
            base = draw_halo_crown(base, head_cx=25 if f <= 21 else 24, head_top_y=7, phase_rad=phase, intensity=1.1)
            staff_deg = -32.0 * (1.0 - u) + (-72.0) * u
            reach_rec = 6.5 * (1.0 - u) + 5.2 * u
            frame = draw_celestial_staff(
                base,
                shoulder=(28 if f <= 22 else 27, int(round(18 * (1.0 - u) + 21 * u))),
                staff_deg=staff_deg,
                reach=reach_rec,
                shaft_up=13.5,
                shaft_down=14.0,
                charge_level=1 if f <= 21 else 0,
                phase_rad=phase,
            )
            frames.append(ensure_safe_cell(frame, margin=1))

    return frames


def build_row3_skill(tpl):
    """
    Row 3: 30-Frame SKILL (Divine Sanctuary & Valkyrie Spear Rain):
    - Phase 1 (F00..F14): Two-handed prayer elevation raising the Celestial Sun-Staff skyward
      with a radiant golden halo burst to consecrate the sanctuary and call down Valkyrie Spears.
    - Phase 2 (F15..F29): Sweeps the staff far forward in a commanding archangel blessing (F15..F22)
      and settles back to stance (F23..F29).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 14:
            u = f / 14.0
            elev = math.sin(u * math.pi)
            base = tpl['cast_up'].copy()
            base = apply_hair_and_vestment_wave(base, phase * 2.0, amplitude=2.0, vertical_flutter=0.9)
            base = draw_halo_crown(base, head_cx=24, head_top_y=6, phase_rad=phase * 2.0, intensity=1.6)
            sh_y = int(round(19 - elev * 3.0))
            staff_deg = -76.0 - elev * 10.0  # -76 -> -86 skyward elevation!
            charge = 3 if 5 <= f <= 12 else 2
            frame = draw_celestial_staff(
                base,
                shoulder=(27, sh_y),
                staff_deg=staff_deg,
                reach=4.0 - elev * 0.4,
                shaft_up=13.0,
                shaft_down=14.0,
                charge_level=charge,
                cast_flash=(f in (6, 7)),
                hand2_override=(25, sh_y),
                phase_rad=phase * 2.0,
            )
            frames.append(ensure_safe_cell(frame, margin=1))

        elif f <= 22:
            k = f - 15
            u = k / 7.0
            base = tpl['cast_ext'].copy()
            base = apply_hair_and_vestment_wave(base, phase * 2.0, amplitude=2.2, vertical_flutter=0.9)
            base = draw_halo_crown(base, head_cx=28, head_top_y=8, phase_rad=phase * 2.0, intensity=1.5)
            staff_deg = -45.0 * (1.0 - min(1.0, k / 2.0)) + (-8.0) * min(1.0, k / 2.0)
            reach_sk = 6.5 * (1.0 - min(1.0, k / 2.0)) + 8.5 * min(1.0, k / 2.0)
            frame = draw_celestial_staff(
                base,
                shoulder=(29, 18),
                staff_deg=staff_deg,
                reach=reach_sk,
                shaft_up=12.5,
                shaft_down=10.5,
                charge_level=3 if k <= 4 else 2,
                cast_flash=(f in (16, 17)),
                phase_rad=phase * 2.0,
            )
            frames.append(ensure_safe_cell(frame, margin=1))

        else:
            u = (f - 23) / 6.0
            base = tpl['stand'].copy()
            base = apply_hair_and_vestment_wave(base, phase, amplitude=1.6, vertical_flutter=0.6)
            base = draw_halo_crown(base, head_cx=24, head_top_y=7, phase_rad=phase, intensity=1.1)
            staff_deg = -18.0 * (1.0 - u) + (-72.0) * u
            reach_rec = 7.0 * (1.0 - u) + 5.2 * u
            frame = draw_celestial_staff(
                base,
                shoulder=(27, int(round(18 * (1.0 - u) + 21 * u))),
                staff_deg=staff_deg,
                reach=reach_rec,
                shaft_up=13.5,
                shaft_down=14.5,
                charge_level=1 if u < 0.5 else 0,
                phase_rad=phase,
            )
            frames.append(ensure_safe_cell(frame, margin=1))

    return frames


def build_row4_ultimate(tpl):
    """
    Row 4: 30-Frame ULTIMATE (Seraphic Apotheosis):
    - Stage 1 (F00..F10): Ascends in prayer with arms spread and staff held vertically across her heart
      as golden seraphic light radiates outward.
    - Stage 2 (F11..F20): Full Archangel elevation with floating hair, blazing crown halo, unfurled
      golden wing-feathers, and orbiting starlight motes.
    - Stage 3 (F21..F29): Directs the Celestial Sun-Staff far forward to channel Judgment Pillars and
      the Final Absolution Beam.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 10:
            u = f / 10.0
            body = make_jump_body(
                tpl,
                jump_dy=-int(round(u * 2.0)),
                tuck_amount=u * 0.45,
                wing_unfurl=u * 0.85,
                phase_rad=phase * 2.0
            )
            body = apply_hair_and_vestment_wave(body, phase * 2.0, amplitude=2.0, vertical_flutter=0.9)
            body = draw_halo_crown(body, head_cx=24, head_top_y=6 - int(round(u * 1.0)), phase_rad=phase * 2.0, intensity=1.6)
            frame = draw_celestial_staff(
                body,
                shoulder=(26, 18 - int(round(u * 2.0))),
                staff_deg=-86.0,
                reach=3.8,
                shaft_up=12.5,
                shaft_down=14.0,
                charge_level=2 if f >= 5 else 1,
                hand2_override=(23, 18 - int(round(u * 2.0))),
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
            body = apply_hair_and_vestment_wave(body, phase * 2.5, amplitude=2.4, vertical_flutter=1.1)
            body = draw_halo_crown(body, head_cx=24, head_top_y=5, phase_rad=phase * 3.0, intensity=1.8)
            staff_deg = -86.0 + u * 24.0  # -86 -> -62
            frame = draw_celestial_staff(
                body,
                shoulder=(27, 17),
                staff_deg=staff_deg,
                reach=4.5 + u * 1.2,
                shaft_up=13.0,
                shaft_down=13.5,
                charge_level=3,
                cast_flash=(f in (13, 17)),
                hand2_override=(24, 17),
                phase_rad=phase * 3.0,
            )

        else:
            k = f - 21
            u = k / 8.0
            tuck = max(0.0, 0.55 * (1.0 - u))
            wing_u = max(0.2, 1.0 - u * 0.7)
            body = make_jump_body(
                tpl,
                jump_dy=-int(round((1.0 - u) * 2.0)),
                tuck_amount=tuck,
                torso_lean_dx=1 if k <= 5 else 0,
                wing_unfurl=wing_u,
                phase_rad=phase * 2.0
            )
            body = apply_hair_and_vestment_wave(body, phase * 2.0, amplitude=2.2, vertical_flutter=1.0)
            body = draw_halo_crown(body, head_cx=25, head_top_y=6, phase_rad=phase * 2.0, intensity=1.6)
            staff_deg = -6.0 if k <= 5 else (-6.0 - (k - 5) * 20.0)
            reach_ult = 8.4 if k <= 5 else (8.4 - (k - 5) * 1.0)
            frame = draw_celestial_staff(
                body,
                shoulder=(29, 18),
                staff_deg=staff_deg,
                reach=reach_ult,
                shaft_up=12.5,
                shaft_down=10.5,
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
    - F07..F17: Sinks gracefully to her knees in prayer, leaning on her dimming staff.
    - F18..F29: Collapses horizontally onto the ground (y=36..49) with her Celestial Staff
      resting flat beside her (ZERO floating upright staff!).
    """
    frames = []
    for f in range(30):
        if f <= 6:
            u = f / 6.0
            dx = -int(round(math.sin(u * math.pi * 0.8) * 2.0))
            dy = int(round(u * 1.0))
            base = shift_layer(tpl['stand'], dx=dx, dy=dy)
            base = apply_hair_and_vestment_wave(base, u * math.pi, amplitude=1.6, vertical_flutter=0.5)
            frame = draw_celestial_staff(
                base,
                shoulder=(27 + dx, 21 + dy),
                staff_deg=-64.0 + u * 16.0,
                reach=4.8,
                shaft_up=13.0,
                shaft_down=14.0,
                dim_factor=0.95,
            )
            frames.append(ensure_safe_cell(frame, margin=1))

        elif f <= 17:
            u = (f - 7) / 10.0
            base = tpl['kneel'].copy()
            head_bow = 1 if f >= 12 else 0
            if head_bow == 1:
                # Subtle prayer head bow without leaving row 8 empty or cutting neck pixels
                head_slice = base[8:19, 17:32].copy()
                for y in range(8, 19):
                    for x in range(17, 32):
                        if head_slice[y - 8, x - 17, 3] > 0:
                            base[y + 1, x] = head_slice[y - 8, x - 17]
                base = fill_layer_pinholes(base)
            base = apply_hair_and_vestment_wave(base, u * math.pi, amplitude=1.0, vertical_flutter=0.3)
            # Staff tilts progressively downward from -52 deg toward horizontal as she leans on it
            staff_deg = -52.0 + u * 36.0  # -52 -> -16
            frame = draw_celestial_staff(
                base,
                shoulder=(28, 23 + int(round(u * 3.0))),
                staff_deg=staff_deg,
                reach=4.8 + u * 1.2,
                shaft_up=12.5,
                shaft_down=12.0,
                dim_factor=0.90 - u * 0.20,
            )
            frames.append(ensure_safe_cell(frame, margin=1))

        elif f <= 22:
            # F18..F22: Smooth rotational collapse from kneeling onto the ground with staff rotating flat
            u = (f - 17) / 6.0
            tilt_deg = u * 78.0
            kneel_with_staff = draw_celestial_staff(
                tpl['kneel'].copy(),
                shoulder=(28, 26),
                staff_deg=-14.0 + u * 16.0,
                reach=5.5,
                shaft_up=12.0,
                shaft_down=11.0,
                dim_factor=0.70,
            )
            pil_kn = Image.fromarray(kneel_with_staff, mode='RGBA')
            rotated = pil_kn.rotate(-tilt_deg, resample=Image.NEAREST, center=(24, 42))
            rot_arr = np.array(rotated, dtype=np.uint8)

            ys, xs = np.where(rot_arr[:, :, 3] > 0)
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
            # F23..F29: Collapsed horizontally on the ground (y=33..49) with ONE Celestial Staff resting flat inside y <= 49!
            k = f - 23
            frame = tpl['fall'].copy()
            # Draw the single Celestial Sun-Staff lying flat on the floor beside her (shoulder y=43 keeps finial <= 48)
            frame = draw_celestial_staff(
                frame,
                shoulder=(25, 43),
                staff_deg=1.5,
                reach=2.0,
                shaft_up=13.5,
                shaft_down=13.5,
                dim_factor=max(0.55, 0.72 - k * 0.03),
                draw_arm=False,
            )
            frames.append(ensure_safe_cell(frame, margin=1))

    return frames


gen_row5_death = build_row5_death


def build_row6_dash(tpl):
    """
    Row 6: 30-Frame DASH (Angelic Feather-Glide):
    - Forward angelic glide dash with trailing golden-white light feathers and streaming vestments.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 4:
            u = f / 4.0
            crouch_dy = [0, 1, 1, 1, 0][f]
            src_body = tpl['stand'] if f <= 1 else tpl['dash']
            base = shift_layer(src_body, dx=0, dy=crouch_dy)
            base = apply_hair_and_vestment_wave(base, phase * 2.0, amplitude=1.8, is_dash=(f >= 2))
            base = draw_halo_crown(base, head_cx=25, head_top_y=7 + crouch_dy, phase_rad=phase, intensity=1.2)
            frame = draw_celestial_staff(
                base,
                shoulder=(28, 20 + crouch_dy),
                staff_deg=-68.0 + u * 48.0,
                reach=4.8 + u * 2.2,
                shaft_up=13.0,
                shaft_down=12.0,
                charge_level=1,
                phase_rad=phase,
            )

        elif f <= 21:
            k = f - 5
            glide_dy = -1 if 3 <= k <= 12 else 0
            base = shift_layer(tpl['dash'], dx=0, dy=glide_dy)
            base = apply_hair_and_vestment_wave(base, k * 0.8, amplitude=2.3, is_dash=True)
            base = draw_halo_crown(base, head_cx=26, head_top_y=7 + glide_dy, phase_rad=phase * 2.0, intensity=1.4)
            staff_deg = -14.0 + math.sin(k * 0.5) * 4.0
            frame = draw_celestial_staff(
                base,
                shoulder=(28, 19 + glide_dy),
                staff_deg=staff_deg,
                reach=7.2,
                shaft_up=12.5,
                shaft_down=11.5,
                charge_level=2 if 4 <= k <= 11 else 1,
                cast_flash=(f == 12),
                phase_rad=phase * 2.0,
            )
            # Trailing golden-white light feathers streaming behind her glide
            for ft in range(3):
                fx = 4 + ((f * 3 + ft * 4) % 10)
                fy = 18 + ft * 8 + int(round(math.sin(phase * 2.0 + ft) * 2.0))
                set_px(frame, fx, fy, WHITE_PURE if ft == 0 else GOLD_BRIGHT)
                set_px(frame, fx + 1, fy, STAR_CREAM)

        else:
            u = (f - 22) / 7.0
            base = (tpl['dash'] if f <= 24 else tpl['stand']).copy()
            base = apply_hair_and_vestment_wave(base, phase, amplitude=1.6, vertical_flutter=0.6)
            base = draw_halo_crown(base, head_cx=24, head_top_y=7, phase_rad=phase, intensity=1.1)
            staff_deg = -20.0 * (1.0 - u) + (-72.0) * u
            frame = draw_celestial_staff(
                base,
                shoulder=(27, 20),
                staff_deg=staff_deg,
                reach=7.0 * (1.0 - u) + 5.2 * u,
                shaft_up=13.5,
                shaft_down=14.0,
                phase_rad=phase,
            )

        frames.append(ensure_safe_cell(frame, margin=1))
    return frames


def build_row7_crouch(tpl):
    """
    Row 7: 30-Frame CROUCH Sequence (Benediction Prayer Barrier & Counter-Orb):
    - F00..F06: Kneels in a low Benediction Prayer stance (7px lower silhouette), holding her
      Sun-Staff slanted forward with a shimmering golden rose-window barrier in front of her.
    - F07..F18: Fires a low, fast Sacred Starlight counter-orb (F11..F16) while crouched.
    - F19..F29: Rises smoothly back to standing stance.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 6:
            depths = [0, 1, 3, 4, 6, 7, 7]
            d = depths[f]
            base = tpl['stand'].copy() if d == 0 else make_crouch_body(tpl, d)
            base = apply_hair_and_vestment_wave(base, phase, amplitude=1.2, vertical_flutter=0.4)
            base = draw_halo_crown(base, head_cx=24, head_top_y=7 + d, phase_rad=phase, intensity=1.2)
            u = f / 6.0
            staff_deg = -72.0 * (1.0 - u) + (-28.0) * u
            frame = draw_celestial_staff(
                base,
                shoulder=(27, 20 + d),
                staff_deg=staff_deg,
                reach=5.0 + u * 1.4,
                shaft_up=13.0,
                shaft_down=11.0,
                charge_level=1 if f >= 4 else 0,
                draw_rose_barrier=(f >= 3),
                phase_rad=phase * 2.0,
            )
            frames.append(ensure_safe_cell(frame, margin=1))

        elif f <= 18:
            d = 7
            base = make_crouch_body(tpl, d)
            if f in (12, 13):
                base = shift_layer(base, dx=-1, dy=0)
            base = apply_hair_and_vestment_wave(base, phase * 1.5, amplitude=1.4, vertical_flutter=0.4)
            base = draw_halo_crown(base, head_cx=24, head_top_y=7 + d, phase_rad=phase * 2.0, intensity=1.4)
            # Aim staff forward at low crouched level (-6 deg) for F11..F16 counter-orb release
            if f <= 10:
                u_aim = (f - 7) / 3.0
                staff_deg = -28.0 * (1.0 - u_aim) + (-6.0) * u_aim
                reach_cr = 6.4 + u_aim * 1.4
            elif f <= 16:
                staff_deg = -6.0
                reach_cr = 7.8
            else:
                staff_deg = -16.0
                reach_cr = 6.8
            frame = draw_celestial_staff(
                base,
                shoulder=(27, 19 + d),
                staff_deg=staff_deg,
                reach=reach_cr,
                shaft_up=12.5,
                shaft_down=9.5,
                charge_level=3 if 10 <= f <= 15 else 2,
                cast_flash=(f in (12, 13)),
                draw_rose_barrier=True,
                phase_rad=phase * 2.0,
            )
            frames.append(ensure_safe_cell(frame, margin=1))

        else:
            depths = [7, 6, 6, 5, 4, 3, 2, 2, 1, 1, 0]
            k = f - 19
            d = depths[k]
            base = tpl['stand'].copy() if d == 0 else make_crouch_body(tpl, d)
            base = apply_hair_and_vestment_wave(base, phase, amplitude=1.3, vertical_flutter=0.5)
            base = draw_halo_crown(base, head_cx=24, head_top_y=7 + d, phase_rad=phase, intensity=1.0)
            u = k / 10.0
            staff_deg = -22.0 * (1.0 - u) + (-72.0) * u
            frame = draw_celestial_staff(
                base,
                shoulder=(27, 20 + d),
                staff_deg=staff_deg,
                reach=6.5 * (1.0 - u) + 5.2 * u,
                shaft_up=13.2,
                shaft_down=13.5,
                draw_rose_barrier=(k <= 2),
                phase_rad=phase,
            )
            frames.append(ensure_safe_cell(frame, margin=1))

    return frames


def build_row8_jump(tpl):
    """
    Row 8: 30-Frame JUMP Sequence (Seraphic Wing-Glide Vault & Downward Starlight Smite — ZERO bouncy-ball frames!):
    - F00..F04: Graceful knee-bend launch.
    - F05..F11: Ascending angelic vault with luminous golden wing-feathers unfurling from her shoulders.
    - F12..F18: Apex mid-air hover aiming her Celestial Staff downward at +35 deg to fire a Starlight Smite.
    - F19..F24: Feather-cushioned descent.
    - F25..F29: Poised landing.
    Every frame shows Seraphina's full head, hair, vestments, legs, and staff — NEVER a round ball!
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 4:
            crouch_seq = [1, 2, 4, 2, 0]
            dy = crouch_seq[f]
            body = make_crouch_body(tpl, dy) if dy >= 2 else make_jump_body(tpl, dy, tuck_amount=0.25, wing_unfurl=0.25 * f, phase_rad=phase)
            body = apply_hair_and_vestment_wave(body, phase * 1.5, amplitude=1.7, vertical_flutter=0.7)
            body = draw_halo_crown(body, head_cx=24, head_top_y=7 + dy, phase_rad=phase, intensity=1.2)
            staff_deg = [-70.0, -64.0, -58.0, -45.0, -28.0][f]
            frame = draw_celestial_staff(
                body,
                shoulder=(27, 20 + dy),
                staff_deg=staff_deg,
                reach=4.8 + f * 0.3,
                shaft_up=13.0,
                shaft_down=13.0,
                charge_level=1 if f >= 3 else 0,
                phase_rad=phase,
            )
            frames.append(ensure_safe_cell(frame, margin=1))

        elif f <= 11:
            k = f - 5
            u = k / 6.0
            tuck = 0.45 + 0.50 * math.sin(u * math.pi * 0.65)
            wing_u = 0.55 + 0.45 * u
            body = make_jump_body(tpl, jump_dy=-1, tuck_amount=tuck, torso_lean_dx=1 if k >= 3 else 0, wing_unfurl=wing_u, phase_rad=phase * 2.0)
            body = apply_hair_and_vestment_wave(body, phase * 2.0, amplitude=2.2, vertical_flutter=1.0)
            body = draw_halo_crown(body, head_cx=25, head_top_y=6, phase_rad=phase * 2.0, intensity=1.5)
            # Sweeps staff from -20 deg down toward +32 deg downward smite angle
            staff_deg = -20.0 * (1.0 - u) + 32.0 * u
            frame = draw_celestial_staff(
                body,
                shoulder=(28, 18),
                staff_deg=staff_deg,
                reach=5.8 + u * 1.8,
                shaft_up=12.5,
                shaft_down=10.5,
                charge_level=2 if k >= 3 else 1,
                phase_rad=phase * 2.0,
            )
            frames.append(ensure_safe_cell(frame, margin=1))

        elif f <= 18:
            k = f - 12
            body = make_jump_body(
                tpl,
                jump_dy=-2,
                tuck_amount=0.88 - k * 0.04,
                torso_lean_dx=0 if k in (3, 4) else 1,
                wing_unfurl=1.0,
                phase_rad=phase * 2.5
            )
            body = apply_hair_and_vestment_wave(body, phase * 2.2, amplitude=2.4, vertical_flutter=1.1)
            body = draw_halo_crown(body, head_cx=25, head_top_y=5, phase_rad=phase * 2.5, intensity=1.7)
            # Aim Celestial Sun-Staff downward at +35 deg for mid-air Starlight Smite!
            staff_deg = 35.0 - (3.0 if k >= 4 else 0.0)
            frame = draw_celestial_staff(
                body,
                shoulder=(28, 17),
                staff_deg=staff_deg,
                reach=7.8,
                shaft_up=12.0,
                shaft_down=10.0,
                charge_level=3 if k <= 4 else 2,
                cast_flash=(f in (15, 16)),
                phase_rad=phase * 2.5,
            )
            frames.append(ensure_safe_cell(frame, margin=1))

        elif f <= 24:
            k = f - 19
            u = k / 5.0
            tuck = 0.60 * (1.0 - u)
            wing_u = 0.90 - u * 0.55
            body = make_jump_body(tpl, jump_dy=-1 if k <= 2 else 0, tuck_amount=tuck, wing_unfurl=wing_u, phase_rad=phase * 2.0)
            body = apply_hair_and_vestment_wave(body, phase * 2.0, amplitude=2.0, vertical_flutter=1.0)
            body = draw_halo_crown(body, head_cx=24, head_top_y=6, phase_rad=phase * 2.0, intensity=1.3)
            staff_deg = 25.0 * (1.0 - u) + (-52.0) * u
            frame = draw_celestial_staff(
                body,
                shoulder=(28, 19),
                staff_deg=staff_deg,
                reach=7.0 * (1.0 - u) + 5.2 * u,
                shaft_up=13.0,
                shaft_down=12.5,
                charge_level=1 if k <= 1 else 0,
                phase_rad=phase * 2.0,
            )
            frames.append(ensure_safe_cell(frame, margin=1))

        else:
            k = f - 25
            crouch_depths = [2, 3, 2, 1, 0]
            d = crouch_depths[k]
            body = tpl['stand'].copy() if d == 0 else make_crouch_body(tpl, d)
            body = apply_hair_and_vestment_wave(body, phase, amplitude=1.5, vertical_flutter=0.6)
            body = draw_halo_crown(body, head_cx=24, head_top_y=7 + d, phase_rad=phase, intensity=1.0)
            u = k / 4.0
            staff_deg = -56.0 * (1.0 - u) + (-72.0) * u
            frame = draw_celestial_staff(
                body,
                shoulder=(27, 20 + d),
                staff_deg=staff_deg,
                reach=5.2,
                shaft_up=13.5,
                shaft_down=14.0,
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

