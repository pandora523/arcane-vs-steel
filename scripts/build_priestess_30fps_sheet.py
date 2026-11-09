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


C_OUTLINE = OUTLINE
C_WING_WHITE = WHITE_PURE
C_WING_CREAM = STAR_CREAM
C_WING_GOLD = GOLD_BRIGHT


def draw_seraphim_wings(c, cx=18, cy=17, span_phase=0.0, alpha_scale=1.0):
    """
    Renders Seraphina's majestic, multi-feathered golden-white Archangel Wings behind her back
    (x = 4..18, y = 7..35, safely inside x >= 3, y >= 3) with 4 distinct sweeping primary feather
    pinions (C_WING_WHITE, C_WING_CREAM, C_WING_GOLD, and dark outline C_OUTLINE) that flap
    gracefully with `span_phase`.
    """
    scale = max(0.0, min(1.0, float(alpha_scale)))
    if scale <= 0.05:
        return c

    wing_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    flap = math.sin(span_phase)
    rx = int(round(cx))
    ry = int(round(cy))

    # 1. Golden Archangel Wing Covert Arch & Inner Feather Mantle (x = 9..18, y = 9..28)
    arch_span = max(3, int(round(7.0 * scale)))
    for i in range(arch_span + 1):
        u = i / max(1, arch_span)
        ax = max(5, min(18, int(round(rx - i * 1.1))))
        ay_top = max(7, min(33, int(round(ry - 3.0 - math.sin(u * math.pi * 0.75) * (4.5 * scale) + flap * 1.2 * u))))
        ay_bot = max(ay_top + 2, min(34, int(round(ry + 6.0 + (1.0 - u) * 4.0 * scale))))
        set_px(wing_layer, ax, max(7, ay_top - 1), C_OUTLINE)
        set_px(wing_layer, ax, ay_top, C_WING_GOLD)
        set_px(wing_layer, ax, ay_top + 1, C_WING_GOLD if i % 2 == 0 else C_WING_WHITE)
        for fy in range(ay_top + 2, ay_bot + 1):
            col = C_WING_WHITE if (fy - ay_top) <= 4 else (C_WING_CREAM if (fy + i) % 2 == 0 else C_WING_GOLD)
            set_px(wing_layer, ax, fy, col)

    # 2. Four Distinct Sweeping Primary Feather Pinions (x = 4..18, y = 7..35)
    # Drawn from lowest (Pinion 4) to highest (Pinion 1) so upper feathers layer cleanly over lower ones
    pinion_specs = [
        # (p_idx, root_dy, mid_dx, mid_dy, tip_x_full, tip_dy, flap_mult)
        (3, 5.0, -6.5, 8.5, 6.0, 15.0, 0.9),   # Pinion 4: Long trailing lower seraph pinion (y = 22..34)
        (2, 2.0, -7.5, 3.0, 5.0, 4.5, 1.3),    # Pinion 3: Sweeping lower-mid primary pinion (y = 18..24)
        (1, -1.0, -7.8, -2.5, 4.0, -2.5, 1.7), # Pinion 2: Grand upper-mid primary pinion (y = 13..18)
        (0, -3.5, -7.0, -7.0, 4.0, -8.5, 2.1), # Pinion 1: High Archangel crown pinion (y = 7..13)
    ]

    for p_idx, root_dy, mid_dx, mid_dy, tip_x_full, tip_dy, flap_mult in pinion_specs:
        sx_p = float(rx - 1)
        sy_p = float(ry) + root_dy * scale
        mx_p = float(rx) + mid_dx * (0.45 + 0.55 * scale)
        my_p = float(ry) + mid_dy * scale + flap * flap_mult * 0.65
        # Even when partially folded (scale = 0.6 in SKILL), tips reach x = 7..8 beyond her hair
        tx_p = tip_x_full * scale + (rx - 6.0) * (1.0 - scale)
        ty_p = float(ry) + tip_dy * scale + flap * flap_mult

        steps = 18
        for s in range(steps + 1):
            t = s / float(steps)
            omt = 1.0 - t
            bx = omt * omt * sx_p + 2.0 * omt * t * mx_p + t * t * tx_p
            by = omt * omt * sy_p + 2.0 * omt * t * my_p + t * t * ty_p
            ix = max(4, min(18, int(round(bx))))
            iy = max(7, min(34, int(round(by))))

            # Top feather edge (dark outline on outer vane, bright gold on inner covert)
            if t >= 0.30:
                set_px(wing_layer, ix, max(7, iy - 1), C_OUTLINE if t >= 0.45 else C_WING_GOLD)
            else:
                set_px(wing_layer, ix, max(7, iy - 1), C_WING_GOLD)

            # Primary feather shaft & bright white upper vane
            shaft_col = C_WING_GOLD if (t <= 0.28 or t >= 0.88) else C_WING_WHITE
            set_px(wing_layer, ix, iy, shaft_col)

            # Luminous cream/white mid vane
            vane_col = C_WING_WHITE if t <= 0.72 else (C_WING_CREAM if t <= 0.90 else C_WING_GOLD)
            set_px(wing_layer, ix, min(35, iy + 1), vane_col)

            # Golden-cream lower barb
            if t <= 0.85:
                barb_col = C_WING_CREAM if t <= 0.62 else C_WING_GOLD
                set_px(wing_layer, ix, min(35, iy + 2), barb_col)

            # Crisp dark feather-separation slot between the 4 primary pinions
            if 0.28 <= t <= 0.82:
                set_px(wing_layer, ix, min(35, iy + 3), C_OUTLINE)

    return composite_over(wing_layer, c)


def draw_mini_wings_on_back(frame, shoulder_x=18, shoulder_y=17, unfurl=1.0, phase_rad=0.0):
    """Wrapper forwarding to `draw_seraphim_wings`."""
    return draw_seraphim_wings(frame, cx=shoulder_x, cy=shoulder_y, span_phase=phase_rad * 2.0, alpha_scale=unfurl)


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
    set_px(layer, ix + 1, iy, dim_col(GOLD_BRIGHT if is_prayer_hand else SKIN_LIGHT))
    set_px(layer, ix, iy + 1, dim_col(SKIN_MID))
    set_px(layer, ix + 1, iy + 1, dim_col(SKIN_LIGHT if is_prayer_hand else SKIN_MID))


def draw_left_prayer_arm(
    base_frame,
    shoulder=(24.0, 18.0),
    hand=(31.0, 23.0),
    mote_glow=1.0,
    aegis_shield=False,
    phase_rad=0.0,
):
    """
    Renders Seraphina's Left Prayer/Blessing Arm & Golden Halo Mote (and optional
    golden hexagonal Aegis prayer barrier in Row 7 CROUCH F00..F10).
    """
    arm_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    sx, sy = float(shoulder[0]), float(shoulder[1])
    hx, hy = float(hand[0]), float(hand[1])

    draw_ik_priestess_arm(
        arm_layer,
        sx,
        sy,
        hx,
        hy,
        L1=4.4,
        L2=4.2,
        bend_side=1.0,
        is_prayer_hand=True,
        dim_factor=0.96,
    )

    # Luminous Golden Halo Mote hovering at her prayer/blessing hand
    if mote_glow > 0.05:
        mx = max(4.0, min(46.0, hx + 1.5))
        my = max(4.0, min(46.0, hy - 1.0 + math.sin(phase_rad * 2.0) * 0.5))
        set_px(arm_layer, mx, my, WHITE_PURE)
        set_px(arm_layer, mx + 1, my, GOLD_BRIGHT)
        set_px(arm_layer, mx - 1, my, GOLD_BRIGHT)
        set_px(arm_layer, mx, my - 1, GOLD_BRIGHT)
        set_px(arm_layer, mx, my + 1, STAR_CREAM)
        if mote_glow >= 1.1:
            set_px(arm_layer, mx + 2, my, STAR_CREAM)
            set_px(arm_layer, mx, my - 2, CYAN_SACRED)
            set_px(arm_layer, mx + 1, my - 1, CYAN_SACRED)

    # Golden Hexagonal Aegis Shield projected forward in Row 7 CROUCH (F00..F10)
    if aegis_shield:
        acx = max(33, min(43, int(round(hx + 5.0))))
        acy = max(16, min(34, int(round(hy + 1.0))))
        # Hexagonal perimeter (width 5px, height 11px) in front of her kneeling prayer hand
        for dy_s in range(-5, 6):
            abs_y = abs(dy_s)
            rx_s = 3 if abs_y <= 2 else (2 if abs_y <= 4 else 1)
            py_s = max(4, min(47, acy + dy_s))
            if abs_y == 5:
                for dx_s in (-1, 0, 1):
                    set_px(arm_layer, acx + dx_s, py_s, GOLD_BRIGHT if dx_s == 0 else GOLD_MID)
            else:
                set_px(arm_layer, acx - rx_s, py_s, GOLD_BRIGHT if abs_y <= 2 else GOLD_MID)
                set_px(arm_layer, acx + rx_s, py_s, WHITE_PURE if abs_y <= 1 else GOLD_BRIGHT)
                if abs_y in (0, 2):
                    set_px(arm_layer, acx, py_s, WHITE_PURE if abs_y == 0 else CYAN_SACRED)
        # Sacred cross-facet inside the hexagonal Aegis shield
        set_px(arm_layer, acx - 1, acy, STAR_CREAM)
        set_px(arm_layer, acx + 1, acy, STAR_CREAM)
        set_px(arm_layer, acx, acy - 1, STAR_CREAM)
        set_px(arm_layer, acx, acy + 1, STAR_CREAM)

    return composite_over(base_frame, arm_layer)


def draw_celestial_staff(
    base_frame,
    shoulder=(25.0, 17.0),
    staff_deg=-74.0,
    reach=5.2,
    shaft_up=10.0,
    shaft_down=19.5,
    charge_level=0,
    cast_flash=False,
    flare=0.0,
    dim_factor=1.0,
    hand2_override=None,
    draw_arm=True,
    draw_rose_barrier=False,
    phase_rad=0.0,
    allow_horizontal=False,
    grip_override=None,
):
    """
    Renders Seraphina's Celestial Sun-Staff and 2-Bone IK Cathedral Arm across the full
    expressive polar angle range (-102 deg prayer windup/skyward elevation to -36 deg
    forward Sacred Starlight thrust, plus planted -88 deg and fallen horizontal).
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
        # Support both polar angles (-105..-25 deg, where -90 is straight up)
        # and relative-to-vertical tilt angles (-20..+56 deg)
        if staff_deg <= -25.0:
            tilt = float(staff_deg) + 90.0
        else:
            tilt = float(staff_deg)
        tilt = max(-18.0, min(56.0, tilt))
        rad = math.radians(-90.0 + tilt)
        ux, uy = math.cos(rad), math.sin(rad)
        px, py = -uy, ux

        sx = max(23.0, min(28.5, float(shoulder[0])))
        sy = max(12.5, min(26.0, float(shoulder[1])))

        if grip_override is not None:
            hx, hy = float(grip_override[0]), float(grip_override[1])
        else:
            if tilt <= 0.0:
                u_back = max(0.0, min(1.0, -tilt / 12.0))
                hx = sx + 4.8 - u_back * 1.2 + (reach - 5.2) * 0.4
                hy = sy + 0.4 - u_back * 1.2
            else:
                u_fwd = max(0.0, min(1.0, tilt / 54.0))
                hx = sx + 5.0 + u_fwd * 3.2 + (reach - 5.2) * 0.55
                hy = sy + 1.0 + u_fwd * 2.4 + (reach - 5.2) * 0.25
            hx = max(28.5, min(36.5, hx))
            hy = max(12.5, min(29.0, hy))

        L1, L2 = 4.6, 4.4
        max_r = L1 + L2 - 0.12
        ddx, ddy = hx - sx, hy - sy
        dist = math.hypot(ddx, ddy)
        if dist > max_r:
            hx = sx + ddx * (max_r / dist)
            hy = sy + ddy * (max_r / dist)

        gx, gy = hx, hy

        # Compute upper shaft length (eff_up) so finial swings freely across x = 25..43, y = 6.5..18
        eff_up = float(shaft_up)
        if uy < -0.05:
            eff_up = min(eff_up, max(5.5, (gy - 6.8) / (-uy)))
        if ux > 0.05:
            eff_up = min(eff_up, max(5.5, (42.8 - gx) / ux))
        elif ux < -0.05:
            eff_up = min(eff_up, max(5.5, (gx - 7.0) / (-ux)))
        eff_up = max(6.0, min(11.5, eff_up))

        # Compute lower shaft length (eff_down) so staff extends naturally down to y <= 46
        eff_down = float(shaft_down)
        if -uy > 0.05:
            eff_down = min(eff_down, max(8.0, (46.0 - gy) / (-uy)))
        if -ux < -0.05:
            eff_down = min(eff_down, max(8.0, (gx - 5.0) / ux))
        eff_down = max(11.0, min(23.0, eff_down))

        bx0 = max(4.0, min(47.0, gx - ux * eff_down))
        by0 = max(14.0, min(46.5, gy - uy * eff_down))
        tx = max(7.0, min(43.0, gx + ux * eff_up))
        ty = max(6.8, min(44.0, gy + uy * eff_up))

    # 1. Draw full-length golden-ivory staff shaft from (bx0, by0) through (gx, gy) to (tx, ty)
    draw_line_px(staff_layer, bx0, by0, tx, ty, dim_col(GOLD_MID))
    draw_line_px(staff_layer, bx0 - px * 0.6, by0 - py * 0.6, tx - px * 0.6, ty - py * 0.6, dim_col(WOOD_DARK))
    set_px(staff_layer, bx0, by0, dim_col(GOLD_BRIGHT))

    # Ornate cross-guard collar just below finial
    cx_neck = tx - ux * 2.8
    cy_neck = ty - uy * 2.8
    for w in (-2, -1, 0, 1, 2):
        set_px(staff_layer, cx_neck + px * w, cy_neck + py * w, dim_col(GOLD_BRIGHT if abs(w) <= 1 else GOLD_DARK))

    # 2. Sacred Sunburst Halo & 8-Point Starlight Finial centered at (tx, ty)
    ring_r = 3.0
    for step in range(16):
        a = (step / 16.0) * 2.0 * math.pi
        rx = tx + math.cos(a) * ring_r
        ry = ty + math.sin(a) * ring_r
        c_ring = GOLD_BRIGHT if step % 2 == 0 else GOLD_MID
        set_px(staff_layer, max(3.0, min(48.0, rx)), max(3.0, min(48.0, ry)), dim_col(c_ring))

    for k in range(8):
        a = rad + k * (math.pi * 0.25)
        ray_len = 3.8 if k % 2 == 0 else 3.2
        rx = max(3.0, min(48.0, tx + math.cos(a) * ray_len))
        ry = max(3.0, min(48.0, ty + math.sin(a) * ray_len))
        set_px(
            staff_layer,
            rx,
            ry,
            dim_col(STAR_CREAM if (k % 2 == 0 and charge_level >= 1) else GOLD_BRIGHT)
        )

    set_px(staff_layer, max(3.0, min(48.0, tx - ux * 1.0)), max(3.0, min(48.0, ty - uy * 1.0)), dim_col(CYAN_SACRED))
    set_px(staff_layer, max(3.0, min(48.0, tx + px * 1.0)), max(3.0, min(48.0, ty + py * 1.0)), dim_col(CYAN_SACRED))
    set_px(staff_layer, max(3.0, min(48.0, tx - px * 1.0)), max(3.0, min(48.0, ty - py * 1.0)), dim_col(GOLD_BRIGHT))
    set_px(staff_layer, max(3.0, min(48.0, tx)), max(3.0, min(48.0, ty)), dim_col(WHITE_PURE if dim_factor > 0.6 else GOLD_MID))

    # 3. Single Right 2-Bone IK Arm drawn OVER the staff shaft
    if draw_arm:
        draw_ik_priestess_arm(
            lead_arm_layer,
            sx,
            sy,
            gx,
            gy,
            L1=4.6,
            L2=4.4,
            bend_side=1.0,
            is_prayer_hand=False,
            dim_factor=dim_factor,
        )

    # 4. Dynamic Charge Runes & Sacred Starlight Cast Flash / Flare at Finial Tip
    eff_flare = max(float(flare), 1.0 if cast_flash else 0.0)
    if charge_level >= 1 or eff_flare > 0.1:
        max_d = max(charge_level + 1, int(round(eff_flare * 4.0)))
        for d in range(1, max_d + 1):
            col = WHITE_PURE if d == 1 else (GOLD_BRIGHT if d <= 2 else STAR_CREAM)
            set_px(fx_layer, min(48.0, tx + d), ty, col)
            set_px(fx_layer, max(3.0, tx - d), ty, col)
            set_px(fx_layer, tx, min(48.0, ty + d), col)
            set_px(fx_layer, tx, max(3.0, ty - d), col)
        for m in range(3):
            ma = phase_rad * 2.0 + m * (2.0 * math.pi / 3.0)
            mx = max(3.0, min(48.0, tx + math.cos(ma) * (3.8 + charge_level * 0.4)))
            my = max(3.0, min(48.0, ty + math.sin(ma) * (3.8 + charge_level * 0.4)))
            set_px(fx_layer, mx, my, GOLD_BRIGHT if m % 2 == 0 else CYAN_SACRED)

    if eff_flare >= 0.4:
        fx_cx = max(5.0, min(45.0, tx + ux * 2.4))
        fx_cy = max(5.0, min(45.0, ty + uy * 2.4))
        set_px(fx_layer, fx_cx, fx_cy, WHITE_PURE)
        span_f = int(round(2 + eff_flare * 2.5))
        for d in range(1, span_f + 1):
            col = WHITE_PURE if d <= 2 else (GOLD_BRIGHT if d <= 3 else STAR_CREAM)
            set_px(fx_layer, max(3.0, min(48.0, fx_cx + d)), fx_cy, col)
            set_px(fx_layer, max(3.0, min(48.0, fx_cx - d)), fx_cy, col)
            set_px(fx_layer, fx_cx, max(3.0, min(48.0, fx_cy + d)), col)
            set_px(fx_layer, fx_cx, max(3.0, min(48.0, fx_cy - d)), col)
        for dx_d, dy_d in [(-2, -2), (2, -2), (-2, 2), (2, 2)]:
            set_px(fx_layer, max(3.0, min(48.0, fx_cx + dx_d)), max(3.0, min(48.0, fx_cy + dy_d)), CYAN_SACRED if eff_flare >= 0.8 else GOLD_BRIGHT)

    out = composite_over(base_frame, staff_layer)
    out = composite_over(out, lead_arm_layer)
    out = composite_over(out, fx_layer)
    return out


def draw_sacred_smite_trail(c, cx, cy, start_deg, end_deg, intensity=1.0):
    """
    Renders a radiant 3-band Pure-White, Star-Cream & Cathedral-Gold Crescent Cast Arc
    (WHITE_PURE, STAR_CREAM, GOLD_BRIGHT, strictly inside 3 <= x <= 48, 3 <= y <= 48)
    tracing the path of Seraphina's Sacred Staff finial during:
    - Row 2 (AUTO_ATTACK) F10..F16
    - Row 3 (SKILL) F14..F21
    - Row 4 (ULTIMATE) F14..F22
    """
    scale = max(0.0, min(1.2, float(intensity)))
    if scale <= 0.05:
        return c

    out = c.copy()
    a0 = math.radians(min(float(start_deg), float(end_deg)))
    a1 = math.radians(max(float(start_deg), float(end_deg)))
    span = max(0.08, a1 - a0)

    # Elliptical radii matching the true trajectory of the Sacred Staff finial tip
    rx_base = 16.0
    ry_base = 13.0
    protected = {WOOD_DARK, SKIN_LIGHT, SKIN_MID, OUTLINE}

    def put_trail_px(px, py, col, overwrite=True):
        ix = max(3, min(48, int(round(px))))
        iy = max(3, min(48, int(round(py))))
        cur = tuple(int(v) for v in out[iy, ix])
        if cur in protected:
            return
        if overwrite or out[iy, ix, 3] == 0:
            out[iy, ix] = col

    steps = max(24, int(round(math.degrees(span) * 0.9)))
    for s in range(steps + 1):
        u = s / float(steps)
        ang = a0 + u * span
        ca, sa = math.cos(ang), math.sin(ang)

        # Band 1 (Inner Cathedral-Gold band, dr = -1.0)
        if u >= 0.08:
            x_in = cx + ca * (rx_base - 1.2)
            y_in = cy + sa * (ry_base - 1.0)
            col_in = STAR_CREAM if (u >= 0.80 and scale >= 0.9) else GOLD_BRIGHT
            put_trail_px(x_in, y_in, col_in, overwrite=(u >= 0.25))

        # Band 2 (Middle Star-Cream & Pure-White core band, dr = 0.0)
        x_mid = cx + ca * rx_base
        y_mid = cy + sa * ry_base
        if u >= 0.58 and scale >= 0.75:
            col_mid = WHITE_PURE
        elif u >= 0.22:
            col_mid = STAR_CREAM
        else:
            col_mid = GOLD_BRIGHT
        put_trail_px(x_mid, y_mid, col_mid, overwrite=True)

        # Band 3 (Outer Pure-White & Star-Cream crescent edge, dr = +1.0)
        if u >= 0.16:
            x_out = cx + ca * (rx_base + 1.2)
            y_out = cy + sa * (ry_base + 1.0)
            col_out = WHITE_PURE if u >= 0.38 else (STAR_CREAM if u >= 0.24 else GOLD_BRIGHT)
            put_trail_px(x_out, y_out, col_out, overwrite=True)

    # Radiant 4-point starlight sparkles along the crescent arc
    spark_u_list = (0.32, 0.65, 0.94) if scale >= 0.8 else (0.50, 0.90)
    for idx_s, su in enumerate(spark_u_list):
        sang = a0 + su * span
        sx = max(4, min(47, int(round(cx + math.cos(sang) * (rx_base + 1.8)))))
        sy = max(4, min(47, int(round(cy + math.sin(sang) * (ry_base + 1.4)))))
        put_trail_px(sx, sy, WHITE_PURE, overwrite=True)
        arm_col = GOLD_BRIGHT if idx_s % 2 == 0 else STAR_CREAM
        put_trail_px(sx - 1, sy, arm_col, overwrite=False)
        put_trail_px(sx + 1, sy, arm_col, overwrite=False)
        put_trail_px(sx, sy - 1, arm_col, overwrite=False)
        put_trail_px(sx, sy + 1, arm_col, overwrite=False)

    return out


def draw_sanctuary_ground_circle(c, cx=25.0, cy=46.0, phase_rad=0.0, intensity=1.0):
    """
    Renders a perspective-flattened Golden Cathedral Rose-Window Sanctuary Circle &
    Rising Star-Cross Motes (y = 44..48, x = 12..38) beneath Seraphina's hem during
    Row 3 (SKILL - Divine Sanctuary & Spear Rain) F02..F23 and
    Row 4 (ULTIMATE - Seraphim Apotheosis) F01..F26.
    """
    scale = max(0.0, min(1.2, float(intensity)))
    if scale <= 0.05:
        return c

    out = c.copy()
    rx = min(13.0, 10.5 + 2.5 * min(1.0, scale))
    ry = 2.0

    def put_rune_px(px, py, col, front_arc=False):
        ix = max(12, min(38, int(round(px))))
        iy = max(44, min(48, int(round(py))))
        if front_arc or out[iy, ix, 3] == 0:
            out[iy, ix] = col

    # 1. Outer & Inner Perspective-Flattened Cathedral Rose-Window Rings (x = 12..38, y = 44..48)
    steps = 36
    for s in range(steps):
        a = (s / float(steps)) * 2.0 * math.pi
        a_rot = a + phase_rad
        ca, sa = math.cos(a), math.sin(a)
        is_front = sa >= 0.15

        # Outer sanctuary ring
        ox = cx + ca * rx
        oy = cy + sa * ry
        if s % 9 == 0:
            col_o = WHITE_PURE
        elif s % 3 == 0:
            col_o = STAR_CREAM if math.sin(a_rot * 4.0) >= 0.0 else GOLD_BRIGHT
        else:
            col_o = GOLD_BRIGHT if s % 2 == 0 else GOLD_ROYAL
        put_rune_px(ox, oy, col_o, front_arc=is_front)

        # Inner rose-window filigree ring
        if s % 2 == 0:
            ix_r = cx + ca * (rx * 0.62)
            iy_r = cy + sa * (ry * 0.55)
            col_i = CYAN_SACRED if s % 6 == 0 else (STAR_CREAM if s % 4 == 0 else GOLD_BRIGHT)
            put_rune_px(ix_r, iy_r, col_i, front_arc=(sa >= 0.35))

    # 2. Rotating 8-Fold Rose-Window Spokes & Left/Right Gothic Finial Tips (x = 12..38, y = 45..47)
    for k in range(8):
        ang_k = phase_rad * 0.8 + k * (math.pi * 0.25)
        ck, sk = math.cos(ang_k), math.sin(ang_k)
        for r_frac in (0.35, 0.68, 0.92):
            sx_k = cx + ck * (rx * r_frac)
            sy_k = cy + sk * (ry * r_frac)
            put_rune_px(
                sx_k,
                sy_k,
                WHITE_PURE if r_frac > 0.8 else GOLD_BRIGHT,
                front_arc=(sk >= 0.25),
            )

    # Left & right rose-window cardinal tips at x = 12..14 and x = 36..38
    put_rune_px(12, 46, GOLD_BRIGHT, front_arc=True)
    put_rune_px(13, 46, WHITE_PURE, front_arc=True)
    put_rune_px(37, 46, WHITE_PURE, front_arc=True)
    put_rune_px(38, 46, GOLD_BRIGHT, front_arc=True)

    # 3. Rising Star-Cross Motes (y = 44..48, x = 12..38) ascending from the sanctuary perimeter
    mote_anchors = (14, 18, 25, 32, 36)
    for m_idx, mx_base in enumerate(mote_anchors):
        drift_x = int(round(math.sin(phase_rad + m_idx * 1.3) * 1.0))
        mx = max(13, min(37, mx_base + drift_x))
        # Cycle upward from y = 47 to y = 44
        rise_u = ((phase_rad / (2.0 * math.pi)) * 2.0 + m_idx * 0.27) % 1.0
        my = max(44, min(47, int(round(47.0 - rise_u * 3.0))))
        is_flank = (mx <= 18 or mx >= 31 or my >= 47)
        put_rune_px(mx, my, WHITE_PURE, front_arc=is_flank)
        arm_c = GOLD_BRIGHT if m_idx % 2 == 0 else STAR_CREAM
        put_rune_px(mx - 1, my, arm_c, front_arc=is_flank)
        put_rune_px(mx + 1, my, arm_c, front_arc=is_flank)
        put_rune_px(mx, max(44, my - 1), arm_c, front_arc=is_flank)
        put_rune_px(mx, min(48, my + 1), CYAN_SACRED if m_idx % 2 == 1 else GOLD_BRIGHT, front_arc=is_flank)

    return out


def draw_angel_feather_slipstream(c, f, phase_rad=0.0, intensity=1.0):
    """
    Renders drifting Golden-White Angel Feathers & Twinkling 4-Point Starlight Motes
    (x = 4..16, y = 12..42) trailing behind Seraphina's flapping Seraphim wings
    during Row 6 (DASH) and Row 8 (JUMP) F04..F20.
    """
    scale = max(0.0, min(1.2, float(intensity)))
    if scale <= 0.05:
        return c

    out = c.copy()

    def put_wake_px(px, py, col, allow_over_wing=False):
        ix = max(4, min(16, int(round(px))))
        iy = max(12, min(42, int(round(py))))
        if out[iy, ix, 3] == 0 or (allow_over_wing and ix <= 11 and tuple(int(v) for v in out[iy, ix]) != OUTLINE):
            out[iy, ix] = col

    # 1. Four drifting Golden-White Angel Feathers across y = 13..40, x = 4..16
    feather_lanes = (14, 21, 29, 37)
    for ft_idx, y_lane in enumerate(feather_lanes):
        fx = 4 + ((20 - f) * 2 + ft_idx * 3) % 10  # 4..13 so fx + 2 <= 15
        fy = max(13, min(40, y_lane + int(round(math.sin(phase_rad * 2.0 + ft_idx * 1.5) * 1.5))))
        # 4-pixel swept angel feather plume (WHITE_PURE shaft, STAR_CREAM vane, GOLD_BRIGHT tip)
        put_wake_px(fx, fy, GOLD_BRIGHT, allow_over_wing=True)
        put_wake_px(fx + 1, fy, WHITE_PURE, allow_over_wing=True)
        put_wake_px(fx + 2, max(12, fy - 1), STAR_CREAM, allow_over_wing=True)
        put_wake_px(fx + 1, min(42, fy + 1), STAR_CREAM, allow_over_wing=False)

    # 2. Twinkling 4-Point Starlight Motes across x = 4..16, y = 12..42
    star_lanes = (16, 26, 35)
    for st_idx, sy_lane in enumerate(star_lanes):
        sx = 5 + ((f * 3 + st_idx * 4) % 10)  # 5..14 so sx +- 1 stays inside 4..15
        sy = max(13, min(41, sy_lane + int(round(math.cos(phase_rad * 2.0 + st_idx * 1.7) * 1.5))))
        put_wake_px(sx, sy, WHITE_PURE, allow_over_wing=True)
        arm_col = GOLD_BRIGHT if (f + st_idx) % 2 == 0 else STAR_CREAM
        put_wake_px(sx - 1, sy, arm_col, allow_over_wing=True)
        put_wake_px(sx + 1, sy, arm_col, allow_over_wing=True)
        put_wake_px(sx, sy - 1, arm_col, allow_over_wing=True)
        put_wake_px(sx, sy + 1, CYAN_SACRED if st_idx == 1 else arm_col, allow_over_wing=True)

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
    - Supports up to 7px kneeling depth (`d = 0..7`)
    - Shifts `ny <= 27 + d` down by `d`
    - Compresses `ny = 28 + d .. 43` from `sy = int(round(27.0 + u * 16.0))`
      with a subtle 1px forward knee bend
    - Keeps her golden slippers/hem anchored at `ny = 44..49`
    """
    stand = tpl['stand'].copy()
    d = max(0, min(7, int(round(crouch_depth))))
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
    return fill_layer_pinholes(out, 1, 50, 1, 50, require_3_neighbors=True)


def draw_priestess_idle_finial_motes(frame, staff_deg, breathe, phase):
    """
    Pass #8: 3 phase-looping twinkling 4-point star-cream & rose-gold motes
    orbiting her Sacred Cathedral Staff finial (x = 31..42, y = 7..18) across Row 0 (IDLE).
    """
    rad = math.radians(staff_deg)
    sx, sy = 25.0, 17.0 + breathe
    reach = 5.2
    gx = sx + math.cos(rad * 0.45 + 0.1) * reach + 5.2
    gy = sy + math.sin(rad * 0.45 + 0.1) * reach * 0.45 + 3.8
    finial_cx = max(33.0, min(40.0, gx + math.cos(rad) * 14.2))
    finial_cy = max(9.0, min(16.0, gy + math.sin(rad) * 14.2))

    for m_idx in range(3):
        m_ang = phase + m_idx * (2.0 * math.pi / 3.0)
        mx = int(round(max(32.0, min(41.0, finial_cx + math.cos(m_ang) * 3.8))))
        my = int(round(max(8.0, min(17.0, finial_cy + math.sin(m_ang) * 3.0))))
        core_col = STAR_CREAM if m_idx % 2 == 0 else WHITE_PURE
        arm_col = ROSE_GOLD if (m_idx + int(round(phase * 3))) % 2 == 0 else STAR_CREAM
        set_px(frame, mx, my, core_col)
        # 4-point twinkling star arms clamped strictly within x = 31..42, y = 7..18
        if mx - 1 >= 31:
            set_px(frame, mx - 1, my, arm_col)
        if mx + 1 <= 42:
            set_px(frame, mx + 1, my, arm_col)
        if my - 1 >= 7:
            set_px(frame, mx, my - 1, arm_col)
        if my + 1 <= 18:
            set_px(frame, mx, my + 1, GOLD_BRIGHT if m_idx == 1 else arm_col)


def draw_priestess_walk_footstep_motes(frame, f):
    """
    Pass #8: During the two stride contact windows of Row 1 (WALK) (F06..F10 and F21..F25),
    draw crisp Grounded Footstep / Hem Trail Motes at y = 44..46, x = 16..33:
    Golden-white starlight & rose-petal motes at hem level.
    """
    if 6 <= f <= 10:
        u = (f - 6) / 4.0
        base_x = 26
    elif 21 <= f <= 25:
        u = (f - 21) / 4.0
        base_x = 20
    else:
        return

    drift = int(round(u * 4.0))
    # Mote 1: Golden-white starlight puff trailing behind hem
    m1_x = max(16, min(33, base_x - drift))
    m1_y = 46 - (1 if f % 2 == 0 else 0)
    set_px(frame, m1_x, m1_y, WHITE_PURE if u < 0.5 else STAR_CREAM)
    if m1_x - 1 >= 16 and u < 0.8:
        set_px(frame, m1_x - 1, max(44, m1_y - 1), GOLD_BRIGHT)

    # Mote 2: Rose-petal mote floating near hem contact
    m2_x = max(16, min(33, base_x + 3 - int(round(u * 2.0))))
    m2_y = 45 - int(round(u * 1.0))
    set_px(frame, m2_x, max(44, min(46, m2_y)), ROSE_GOLD)
    if m2_x + 1 <= 33 and u < 0.75:
        set_px(frame, m2_x + 1, 46, STAR_CREAM)

    # Mote 3: Secondary starlight-rose shimmer mote
    m3_x = max(16, min(33, base_x - 2 - drift))
    m3_y = 44 + (1 if u > 0.5 else 0)
    set_px(frame, m3_x, m3_y, GOLD_BRIGHT if f % 2 == 0 else ROSE_GOLD)


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

        staff_deg = -74.0 + math.sin(phase) * 4.0
        frame = draw_celestial_staff(
            base,
            shoulder=(25.0, 17.0 + breathe),
            staff_deg=staff_deg,
            reach=5.2,
            charge_level=1 if f % 10 in (4, 5) else 0,
            phase_rad=phase,
        )
        draw_priestess_idle_finial_motes(frame, staff_deg, breathe, phase)
        frames.append(ensure_safe_cell(frame, margin=2))
    return frames


gen_row0_idle = build_row0_idle


def build_row1_walk(tpl):
    """Row 1: 30-Frame Graceful 2-Step Cathedral Stride (F00..F14 step A, F15..F29 step B)."""
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        bob_y = int(round(math.cos(phase * 2.0 + 0.18) * 1.0))
        body = render_walk_legs(tpl, f)
        body = draw_halo_crown(body, head_cx=23, head_top_y=7 + bob_y, phase_rad=phase + 0.25, intensity=1.0 + (0.4 if f % 2 == 1 else 0.0))

        staff_deg = -74.0 - math.sin(phase + 0.2) * 9.0 + (1.2 if f % 2 == 1 else -1.2)
        reach_w = 5.2 - math.sin(phase + 0.2) * 0.7
        frame = draw_celestial_staff(
            body,
            shoulder=(25.0, 17.0 + bob_y),
            staff_deg=staff_deg,
            reach=reach_w,
            charge_level=(f % 3),
            phase_rad=phase + f * 0.35,
        )
        draw_priestess_walk_footstep_motes(frame, f)
        frames.append(ensure_safe_cell(frame, margin=2))
    return frames


def build_row2_auto_attack(tpl):
    """
    Row 2: 30-Frame AUTO_ATTACK (Sacred Starlight Cast):
    - F00..F09: Raises the Sacred Staff back to -100 deg during prayer windup while her left hand
      forms a luminous golden prayer gesture (hand_x = 30..33, hand_y = 22..24).
    - F10..F18: Thrusts the Sacred Staff forward to -38 deg (flare=1.0) to project Sacred Starlight!
    - F19..F29: Serene follow-through back to standing stance (-74 deg).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 9:
            u = f / 9.0
            base = (tpl['stand'] if f <= 3 else tpl['cast_up']).copy()
            base = apply_hair_and_vestment_wave(base, phase, amplitude=1.5, vertical_flutter=0.6)
            base = draw_halo_crown(base, head_cx=23, head_top_y=7, phase_rad=phase, intensity=1.3)
            # Left hand forms a luminous golden prayer gesture (hand_x = 30..33, hand_y = 22..24)
            lh_x = 30.0 + u * 2.5
            lh_y = 24.0 - u * 2.0
            base = draw_left_prayer_arm(
                base,
                shoulder=(24.0, 18.0),
                hand=(lh_x, lh_y),
                mote_glow=0.8 + u * 0.5,
                phase_rad=phase * 2.0,
            )
            # Raises Sacred Staff back to -100 deg
            staff_deg = -74.0 * (1.0 - u) + (-100.0) * u
            charge = 2 if f >= 6 else (1 if f >= 3 else 0)
            frame = draw_celestial_staff(
                base,
                shoulder=(25.0, 17.0 - u * 1.5),
                staff_deg=staff_deg,
                reach=5.0 - u * 0.8,
                charge_level=charge,
                grip_override=(29.8 - u * 1.0, 17.5 - u * 2.5),
                phase_rad=phase,
            )
            frames.append(ensure_safe_cell(frame, margin=2))

        elif f <= 18:
            k = f - 10
            u_cast = k / 8.0
            base = tpl['cast_ext'].copy()
            if f in (11, 12):
                base = shift_layer(base, dx=1, dy=0)
            base = apply_hair_and_vestment_wave(base, phase * 1.5, amplitude=1.8, vertical_flutter=0.7)
            base = draw_seraphim_wings(base, cx=18, cy=17, span_phase=phase * 2.0, alpha_scale=0.48 * (1.0 - u_cast * 0.45))
            base = draw_halo_crown(base, head_cx=25, head_top_y=7, phase_rad=phase, intensity=1.5)
            base = draw_left_prayer_arm(
                base,
                shoulder=(25.0, 18.0),
                hand=(31.0 - u_cast * 1.0, 22.0 + u_cast * 1.5),
                mote_glow=1.1 if k <= 4 else 0.6,
                phase_rad=phase * 2.0,
            )
            if k == 0:
                staff_deg = -56.0
                flare_v = 0.7
            elif k <= 5:
                staff_deg = -38.0 - (k - 1) * 0.6  # Thrust forward to -38 deg!
                flare_v = 1.0
            else:
                staff_deg = -40.0 - (k - 5) * 4.5
                flare_v = 0.65
            frame = draw_celestial_staff(
                base,
                shoulder=(26.5, 17.0),
                staff_deg=staff_deg,
                reach=6.5,
                charge_level=3 if k <= 5 else 2,
                cast_flash=(f in (11, 12, 13)),
                flare=flare_v,
                grip_override=(34.5 if k >= 1 else 32.5, 18.5 + (k % 2) * 0.4),
                phase_rad=phase,
            )
            if 10 <= f <= 16:
                trail_starts = [-98.0, -94.0, -88.0, -80.0, -72.0, -64.0, -56.0]
                trail_ends = [-54.0, -36.0, -34.0, -35.0, -36.0, -38.0, -40.0]
                trail_int = [0.85, 1.0, 1.0, 0.95, 0.90, 0.80, 0.65][k]
                frame = draw_sacred_smite_trail(
                    frame,
                    cx=28.5,
                    cy=19.0,
                    start_deg=trail_starts[k],
                    end_deg=trail_ends[k],
                    intensity=trail_int,
                )
            frames.append(ensure_safe_cell(frame, margin=2))

        else:
            u = (f - 19) / 10.0
            base = (tpl['cast_ext'] if f <= 21 else tpl['stand']).copy()
            base = apply_hair_and_vestment_wave(base, phase, amplitude=1.5, vertical_flutter=0.6)
            base = draw_halo_crown(base, head_cx=24 if f <= 21 else 23, head_top_y=7, phase_rad=phase, intensity=1.1)
            if f <= 23:
                base = draw_left_prayer_arm(
                    base,
                    shoulder=(24.5, 18.0),
                    hand=(30.0, 23.5),
                    mote_glow=max(0.0, 0.5 * (1.0 - u * 2.0)),
                    phase_rad=phase,
                )
            staff_deg = -52.0 * (1.0 - u) + (-74.0) * u
            reach_rec = 6.0 * (1.0 - u) + 5.2 * u
            sx_rec = 26.0 if f <= 21 else 25.0
            frame = draw_celestial_staff(
                base,
                shoulder=(sx_rec, 17.0),
                staff_deg=staff_deg,
                reach=reach_rec,
                charge_level=1 if f <= 21 else 0,
                phase_rad=phase,
            )
            frames.append(ensure_safe_cell(frame, margin=2))

    return frames


def build_row3_skill(tpl):
    """
    Row 3: 30-Frame SKILL (Celestial Benediction & Valkyrie Spears):
    - Unfurls subtle folded/glowing Seraphim wing pinions behind her back.
    - F00..F13: Raises the Sacred Staff skyward (-94 deg, raised high grip_y - 4) with a glowing
      golden halo above her head and Left Prayer/Blessing Arm raised in benediction.
    - F14..F22: Sweeps the Sacred Staff forward (-36 deg, flare=1.0) to launch the 3 Valkyrie Light-Spears!
    - F23..F29: Smooth recovery back to standing stance (-74 deg).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 13:
            u = f / 13.0
            elev = math.sin(u * math.pi * 0.85)
            base = tpl['cast_up'].copy()
            base = apply_hair_and_vestment_wave(base, phase * 2.0, amplitude=1.7, vertical_flutter=0.7)
            # Subtle folded/glowing Seraphim wing pinions during Divine Sanctuary & Valkyrie Spears
            wing_scale = 0.45 + 0.35 * elev
            base = draw_seraphim_wings(base, cx=18, cy=17, span_phase=phase * 2.0, alpha_scale=wing_scale)
            base = draw_halo_crown(base, head_cx=23, head_top_y=5, phase_rad=phase * 2.0, intensity=1.8)
            base = draw_left_prayer_arm(
                base,
                shoulder=(24.0, 17.5 - elev * 1.0),
                hand=(30.5 + elev * 1.5, 22.0 - elev * 4.5),
                mote_glow=1.3,
                phase_rad=phase * 2.0,
            )
            staff_deg = -76.0 * (1.0 - elev) + (-94.0) * elev
            grip_y = 18.0 - elev * 4.0  # grip_y - 4 at peak skyward raise!
            frame = draw_celestial_staff(
                base,
                shoulder=(25.0, 16.5 - elev * 2.0),
                staff_deg=staff_deg,
                reach=4.8,
                shaft_up=8.5,
                charge_level=3 if f >= 4 else 2,
                cast_flash=(f in (6, 7, 11)),
                flare=0.85 if f >= 5 else 0.4,
                grip_override=(29.5, grip_y),
                phase_rad=phase * 2.0,
            )
            if f >= 2:
                sanc_int = min(1.0, 0.55 + (f - 2) * 0.15)
                frame = draw_sanctuary_ground_circle(frame, cx=25.0, cy=46.0, phase_rad=phase * 2.0, intensity=sanc_int)
            frames.append(ensure_safe_cell(frame, margin=2))

        elif f <= 22:
            k = f - 14
            u_sw = k / 8.0
            base = tpl['cast_ext'].copy()
            if k in (1, 2):
                base = shift_layer(base, dx=1, dy=0)
            base = apply_hair_and_vestment_wave(base, phase * 2.0, amplitude=1.9, vertical_flutter=0.8)
            base = draw_seraphim_wings(base, cx=18, cy=17, span_phase=phase * 2.5, alpha_scale=0.80 - u_sw * 0.20)
            base = draw_halo_crown(base, head_cx=25, head_top_y=6, phase_rad=phase * 2.0, intensity=1.7)
            base = draw_left_prayer_arm(
                base,
                shoulder=(25.0, 18.0),
                hand=(32.0 - u_sw * 1.5, 19.5 + u_sw * 2.5),
                mote_glow=1.2,
                phase_rad=phase * 2.0,
            )
            if k == 0:
                staff_deg = -58.0
                gx_sk, gy_sk = 32.5, 16.5
            elif k <= 6:
                staff_deg = -36.0 - (k - 1) * 0.5  # Sweeps forward to -36 deg!
                gx_sk, gy_sk = 34.8, 18.5
            else:
                staff_deg = -40.0 - (k - 6) * 5.0
                gx_sk, gy_sk = 33.8, 18.8
            frame = draw_celestial_staff(
                base,
                shoulder=(26.5, 17.0),
                staff_deg=staff_deg,
                reach=6.6,
                charge_level=3,
                cast_flash=(k in (1, 2, 3)),
                flare=1.0 if k <= 6 else 0.7,
                grip_override=(gx_sk, gy_sk),
                phase_rad=phase * 2.0,
            )
            if 14 <= f <= 21:
                sk_starts = [-96.0, -94.0, -88.0, -82.0, -75.0, -68.0, -60.0, -54.0]
                sk_ends = [-54.0, -34.0, -32.0, -33.0, -35.0, -36.0, -38.0, -42.0]
                sk_ints = [0.90, 1.0, 1.0, 1.0, 0.95, 0.85, 0.75, 0.60]
                frame = draw_sacred_smite_trail(
                    frame,
                    cx=28.5,
                    cy=18.5,
                    start_deg=sk_starts[k],
                    end_deg=sk_ends[k],
                    intensity=sk_ints[k],
                )
            # Three Valkyrie Light-Spear tips projecting at the right edge during F15..F20
            if 1 <= k <= 6:
                for sp_i, sp_y in enumerate((9 + k, 15 + k, 21 + k)):
                    sx_sp = min(46, 42 + ((k + sp_i) % 3))
                    sy_sp = max(4, min(46, sp_y))
                    set_px(frame, sx_sp, sy_sp, GOLD_BRIGHT)
                    set_px(frame, min(48, sx_sp + 1), sy_sp, WHITE_PURE)
                    set_px(frame, max(3, sx_sp - 1), sy_sp, CYAN_SACRED)
            frame = draw_sanctuary_ground_circle(
                frame,
                cx=25.0,
                cy=46.0,
                phase_rad=phase * 2.0,
                intensity=1.0 if f <= 20 else (0.85 if f == 21 else 0.70),
            )
            frames.append(ensure_safe_cell(frame, margin=2))

        else:
            u = (f - 23) / 6.0
            base = tpl['stand'].copy()
            base = apply_hair_and_vestment_wave(base, phase, amplitude=1.5, vertical_flutter=0.6)
            wing_sc = max(0.0, 0.55 * (1.0 - u))
            if wing_sc > 0.08:
                base = draw_seraphim_wings(base, cx=18, cy=17, span_phase=phase * 2.0, alpha_scale=wing_sc)
            base = draw_halo_crown(base, head_cx=23, head_top_y=7, phase_rad=phase, intensity=1.2)
            staff_deg = -50.0 * (1.0 - u) + (-74.0) * u
            reach_rec = 6.2 * (1.0 - u) + 5.2 * u
            frame = draw_celestial_staff(
                base,
                shoulder=(25.0, 17.0),
                staff_deg=staff_deg,
                reach=reach_rec,
                charge_level=1 if u < 0.5 else 0,
                phase_rad=phase,
            )
            if f <= 23:
                frame = draw_sanctuary_ground_circle(frame, cx=25.0, cy=46.0, phase_rad=phase * 2.0, intensity=0.55)
            frames.append(ensure_safe_cell(frame, margin=2))

    return frames


def build_row4_ultimate(tpl):
    """
    Row 4: 30-Frame ULTIMATE (Seraphim Archangel Ascension):
    - F00..F13: Spreads her grand Archangel Wings wide (x = 4..18, y = 7..35) while raising both
      her Sacred Staff (-92 deg) and Left Blessing Arm skyward.
    - F14..F23: Thrusts the Sacred Staff forward (-40 deg, flare=1.0) to command the Cathedral
      Judgment Pillars!
    - F24..F29: Graceful descent and recovery back to stance (-74 deg).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 13:
            u = f / 13.0
            dy_lift = -1 if f >= 3 else 0
            body = make_jump_body(
                tpl,
                jump_dy=dy_lift,
                tuck_amount=u * 0.45,
                phase_rad=phase * 2.0,
            )
            body = apply_hair_and_vestment_wave(body, phase * 2.0, amplitude=1.8, vertical_flutter=0.8)
            wing_scale = min(1.0, 0.65 + u * 0.35)
            body = draw_seraphim_wings(body, cx=18, cy=17 + dy_lift, span_phase=phase * 3.0, alpha_scale=wing_scale)
            body = draw_halo_crown(body, head_cx=23, head_top_y=5, phase_rad=phase * 2.5, intensity=1.8)
            # Left Blessing Arm raised skyward (hand_x = 29..32, hand_y = 13..16)
            body = draw_left_prayer_arm(
                body,
                shoulder=(24.0, 17.0 + dy_lift),
                hand=(29.5 + u * 2.0, 18.5 - u * 4.5),
                mote_glow=1.5,
                phase_rad=phase * 2.5,
            )
            staff_deg = -78.0 * (1.0 - u) + (-92.0) * u
            frame = draw_celestial_staff(
                body,
                shoulder=(25.0, 16.0 + dy_lift),
                staff_deg=staff_deg,
                reach=4.8,
                shaft_up=8.5,
                charge_level=3 if f >= 5 else 2,
                cast_flash=(f in (8, 12)),
                flare=0.9 if f >= 6 else 0.4,
                grip_override=(30.0, 16.5 - u * 2.5),
                phase_rad=phase * 2.5,
            )

        elif f <= 23:
            k = f - 14
            u = k / 9.0
            lean_dx = 1 if k <= 6 else 0
            body = make_jump_body(
                tpl,
                jump_dy=-1,
                tuck_amount=0.50,
                torso_lean_dx=lean_dx,
                phase_rad=phase * 3.0,
            )
            body = apply_hair_and_vestment_wave(body, phase * 2.5, amplitude=2.0, vertical_flutter=0.9)
            body = draw_seraphim_wings(body, cx=18 + lean_dx, cy=16, span_phase=phase * 4.0, alpha_scale=1.0)
            body = draw_halo_crown(body, head_cx=23 + lean_dx, head_top_y=5, phase_rad=phase * 3.0, intensity=1.9)
            body = draw_left_prayer_arm(
                body,
                shoulder=(24.5 + lean_dx, 17.0),
                hand=(31.5 + (k % 2) * 0.5, 19.0 + u * 2.0),
                mote_glow=1.4,
                phase_rad=phase * 3.0,
            )
            if k == 0:
                staff_deg = -60.0
                gx_u, gy_u = 32.5, 16.5
            else:
                staff_deg = -40.0 + math.sin(u * math.pi) * 2.5  # Thrusts forward to -40 deg!
                gx_u, gy_u = 34.8, 18.0 + (k % 2) * 0.4
            frame = draw_celestial_staff(
                body,
                shoulder=(26.0 + lean_dx, 16.0),
                staff_deg=staff_deg,
                reach=6.5,
                charge_level=3,
                cast_flash=(k in (1, 2, 5, 6)),
                flare=1.0,
                grip_override=(gx_u, gy_u),
                phase_rad=phase * 3.0,
            )
            if 14 <= f <= 22:
                ult_starts = [-96.0, -94.0, -90.0, -84.0, -78.0, -72.0, -66.0, -60.0, -54.0]
                ult_ends = [-56.0, -36.0, -34.0, -35.0, -36.0, -37.0, -38.0, -40.0, -42.0]
                ult_ints = [0.90, 1.0, 1.0, 1.0, 0.95, 0.90, 0.85, 0.75, 0.65]
                frame = draw_sacred_smite_trail(
                    frame,
                    cx=28.5,
                    cy=18.0,
                    start_deg=ult_starts[k],
                    end_deg=ult_ends[k],
                    intensity=ult_ints[k],
                )

        else:
            k = f - 24
            u = k / 5.0
            tuck = max(0.0, 0.45 * (1.0 - u))
            wing_u = max(0.45, 1.0 - u * 0.50)
            dy_lift = -1 if k <= 2 else 0
            body = make_jump_body(
                tpl,
                jump_dy=dy_lift,
                tuck_amount=tuck,
                phase_rad=phase * 2.0,
            )
            body = apply_hair_and_vestment_wave(body, phase * 2.0, amplitude=1.7, vertical_flutter=0.7)
            body = draw_seraphim_wings(body, cx=18, cy=17 + dy_lift, span_phase=phase * 2.5, alpha_scale=wing_u)
            body = draw_halo_crown(body, head_cx=23, head_top_y=6, phase_rad=phase * 2.0, intensity=1.5)
            staff_deg = -42.0 * (1.0 - u) + (-74.0) * u
            reach_ult = 6.4 * (1.0 - u) + 5.2 * u
            frame = draw_celestial_staff(
                body,
                shoulder=(25.0, 17.0 + dy_lift),
                staff_deg=staff_deg,
                reach=reach_ult,
                charge_level=2 if k <= 2 else 1,
                flare=max(0.0, 0.6 * (1.0 - u)),
                phase_rad=phase * 2.0,
            )

        if 1 <= f <= 26:
            if f <= 3:
                ult_sanc_int = 0.50 + f * 0.16
            elif f <= 23:
                ult_sanc_int = 1.0
            else:
                ult_sanc_int = 0.85 - (f - 24) * 0.15
            frame = draw_sanctuary_ground_circle(
                frame,
                cx=25.0,
                cy=46.0,
                phase_rad=phase * 2.5,
                intensity=ult_sanc_int,
            )

        # Orbiting starlight motes around Seraphina during Apotheosis
        for m in range(4):
            ma = phase * 2.0 + m * (math.pi * 0.5)
            mx = max(3.0, min(47.0, 24.0 + math.cos(ma) * 13.5))
            my = max(3.0, min(47.0, 24.0 + math.sin(ma) * 9.5))
            set_px(frame, mx, my, WHITE_PURE if m % 2 == 0 else GOLD_BRIGHT)
            set_px(frame, min(48.0, mx + 1), my, STAR_CREAM)

        frames.append(ensure_safe_cell(frame, margin=2))
    return frames


def draw_priestess_ward_shatter_sparks(frame, f):
    """
    Pass #8: On F01..F05 of Row 5 (DEATH & HURT), draw a crisp 4-ray
    Elemental Ward-Shatter Spark Burst at chest height (x = 26..33, y = 18..25)
    that expands and fades across F01..F05.
    """
    if not (1 <= f <= 5):
        return
    u = (f - 1) / 4.0
    cx, cy = 29, 21
    ray_len = 1 + int(round(u * 2.5))  # 1..3 px

    if f <= 3:
        set_px(frame, cx, cy, WHITE_PURE if f == 1 else STAR_CREAM)

    rays = [(-1, -1), (1, -1), (-1, 1), (1, 1)]
    for r_idx, (rx, ry) in enumerate(rays):
        start_step = 1 if f <= 2 else 2
        for step in range(start_step, ray_len + 1):
            px = max(26, min(33, cx + rx * step))
            py = max(18, min(25, cy + ry * step))
            if step == ray_len:
                col = ROSE_GOLD if (r_idx + f) % 2 == 0 else CYAN_SACRED
            else:
                col = WHITE_PURE if f <= 2 else (STAR_CREAM if f <= 4 else GOLD_BRIGHT)
            set_px(frame, px, py, col)

    # Cross ward-shatter flecks on F01..F04
    if f <= 4:
        span = 1 + (1 if f >= 3 else 0)
        set_px(frame, max(26, cx - span), cy, STAR_CREAM if f <= 2 else ROSE_GOLD)
        set_px(frame, min(33, cx + span), cy, STAR_CREAM if f <= 2 else GOLD_BRIGHT)
        set_px(frame, cx, max(18, cy - span), WHITE_PURE if f == 1 else CYAN_SACRED)
        set_px(frame, cx, min(25, cy + span), GOLD_BRIGHT if f <= 2 else ROSE_GOLD)


def build_row5_death(tpl):
    """
    Row 5: 30-Frame DEATH & HURT Sequence:
    - F00..F06: Hit-stagger recoil (HURT uses F00..F05).
    - F07..F17: Sinks gracefully to her knees in prayer, planting her Sacred Staff upright at -88 deg
      beside her at F14..F17.
    - F18..F22: Grounded floor collapse anchored at y = 46 (smoothly transitioning from kneel at F14..F17
      to fall at F23..F29, planting her Sacred Staff upright at -88 deg beside her as she slumps onto
      the cathedral floor, with zero floating rotated blobs).
    - F23..F29: Collapsed horizontally on the cathedral floor with her dimmed Sacred Staff resting flat beside her.
    """
    frames = []
    for f in range(30):
        if f <= 6:
            u = f / 6.0
            dx = -int(round(math.sin(u * math.pi * 0.8) * 2.0))
            dy = int(round(u * 1.0))
            base = shift_layer(tpl['stand'], dx=dx, dy=dy)
            base = apply_hair_and_vestment_wave(base, u * math.pi, amplitude=1.4, vertical_flutter=0.5)
            staff_deg = -74.0 - u * 8.0
            frame = draw_celestial_staff(
                base,
                shoulder=(25.0 + dx, 17.0 + dy),
                staff_deg=staff_deg,
                reach=5.0,
                dim_factor=0.95 - u * 0.04,
            )
            if 1 <= f <= 5:
                draw_priestess_ward_shatter_sparks(frame, f)
            frames.append(ensure_safe_cell(frame, margin=2))

        elif f <= 17:
            u = (f - 7) / 10.0
            base = (tpl['kneel1'] if f <= 12 else tpl['kneel2']).copy()
            head_bow = 1 if f >= 15 else 0
            if head_bow > 0:
                head_slice = base[10:22, 14:31].copy()
                base[10:11, 14:31] = 0
                mask = head_slice[:, :, 3] > 0
                target_view = base[11:23, 14:31]
                target_view[mask] = head_slice[mask]
                base = fill_layer_pinholes(base)
            base = apply_hair_and_vestment_wave(base, u * math.pi, amplitude=1.0 * (1.0 - u * 0.4), vertical_flutter=0.3)
            # Plants Sacred Staff upright at -88 deg beside her at F14..F17
            staff_deg = -78.0 * (1.0 - u) + (-88.0) * u if f < 14 else -88.0
            gy_kn = 20.5 + u * 2.5 + head_bow * 0.5
            frame = draw_celestial_staff(
                base,
                shoulder=(25.5, 19.5 + u * 2.0 + head_bow),
                staff_deg=staff_deg,
                reach=5.4,
                shaft_up=9.5,
                shaft_down=23.0,
                grip_override=(33.0, gy_kn),
                dim_factor=0.90 - u * 0.16,
            )
            frames.append(ensure_safe_cell(frame, margin=2))

        elif f <= 22:
            # F18..F22: Grounded floor collapse anchored at y = 46 (smoothly transitioning from kneel2 to fall)
            u = (f - 17) / 5.0
            kn = tpl['kneel2']
            fall_tpl = tpl['fall']
            body = np.zeros((52, 52, 4), dtype=np.uint8)

            for sy in range(10, 49):
                rel_h = max(0, 46 - sy)
                # Compress vertical height above y = 46 down toward the floor and slump forward
                comp = 1.0 - u * 0.56
                ny = min(47, max(16, int(round(46.0 - rel_h * comp))))
                dx_slump = int(round((rel_h / 28.0) * u * 7.5))
                for sx in range(2, 46):
                    if kn[sy, sx, 3] > 0:
                        nx = max(3, min(47, sx + dx_slump))
                        body[ny, nx] = kn[sy, sx]
                        if ny + 1 <= 46 and body[ny + 1, nx, 3] == 0:
                            body[ny + 1, nx] = kn[sy, sx]

            # Blend lower gown skirt along the floor (y = 38..47) toward `fall` at F21..F22 for a seamless transition
            if f >= 20:
                w_fall = (f - 19) / 4.0
                max_fall_x = int(round(34 + w_fall * 10))
                for fy in range(36, 48):
                    for fx in range(8, min(48, max_fall_x)):
                        if fall_tpl[fy, fx, 3] > 0 and body[fy, fx, 3] == 0:
                            body[fy, fx] = fall_tpl[fy, fx]

            body = fill_layer_pinholes(add_outline_to_layer(body), 2, 49, 2, 49, require_3_neighbors=False)

            # Sacred Staff is planted upright at -88 deg beside her as she begins slumping (F18),
            # then tips smoothly forward-down toward the cathedral floor (F19..F22) to meet F23
            staff_slump_degs = [-88.0, -72.0, -50.0, -26.0, -10.0]
            s_deg = staff_slump_degs[f - 18]
            gy_slump = 24.0 + u * 14.0
            sy_slump = 22.0 + u * 13.0
            sx_slump = 26.0 + u * 3.0
            if f <= 20:
                frame = draw_celestial_staff(
                    body,
                    shoulder=(sx_slump, sy_slump),
                    staff_deg=s_deg,
                    reach=5.4,
                    shaft_up=9.5,
                    shaft_down=max(14.0, 46.0 - gy_slump),
                    grip_override=(34.0, gy_slump),
                    dim_factor=0.72 - u * 0.08,
                )
            else:
                frame = draw_celestial_staff(
                    body,
                    shoulder=(25.0, 38.0 + (f - 20) * 2.2),
                    staff_deg=s_deg,
                    reach=2.2,
                    shaft_up=12.5,
                    shaft_down=13.0,
                    dim_factor=0.70 - u * 0.08,
                    draw_arm=False,
                    allow_horizontal=True,
                )
            frames.append(ensure_safe_cell(frame, margin=2))

        else:
            k = f - 23
            frame = tpl['fall'].copy()
            frame = draw_celestial_staff(
                frame,
                shoulder=(25.0, 43.0 + (0.3 if k % 2 == 1 else 0.0)),
                staff_deg=1.5 + k * 0.2,
                reach=2.0,
                shaft_up=13.5,
                shaft_down=13.5,
                dim_factor=max(0.50, 0.68 - k * 0.025),
                draw_arm=False,
                allow_horizontal=True,
            )
            frames.append(ensure_safe_cell(frame, margin=2))

    return frames


gen_row5_death = build_row5_death


def build_row6_dash(tpl):
    """
    Row 6: 30-Frame DASH (Angelic Feather-Glide):
    - Unfurls majestic multi-feathered Seraphim Wings (x = 4..18, y = 7..35) behind her back.
    - Forward angelic glide dash with full-length Celestial Staff swept forward (-58..-46 deg)
      and trailing golden-white feathers.
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
            wing_sc = 0.45 + u * 0.45
            base = draw_seraphim_wings(base, cx=18, cy=17 + crouch_dy, span_phase=phase * 2.5, alpha_scale=wing_sc)
            base = draw_halo_crown(base, head_cx=24, head_top_y=7 + crouch_dy, phase_rad=phase, intensity=1.2)
            staff_deg = -74.0 * (1.0 - u) + (-54.0) * u
            frame = draw_celestial_staff(
                base,
                shoulder=(25.0 + (1.0 if f >= 2 else 0.0), 17.0 + crouch_dy),
                staff_deg=staff_deg,
                reach=5.2 + u * 1.0,
                charge_level=1,
                phase_rad=phase,
            )
            if f == 4:
                frame = draw_angel_feather_slipstream(frame, f, phase_rad=phase * 2.0, intensity=0.8)

        elif f <= 21:
            k = f - 5
            glide_dy = -1 if 3 <= k <= 12 else 0
            base = shift_layer(tpl['dash'], dx=0, dy=glide_dy)
            base = apply_hair_and_vestment_wave(base, k * 0.8, amplitude=1.8, is_dash=True)
            base = draw_seraphim_wings(base, cx=18, cy=17 + glide_dy, span_phase=phase * 3.0, alpha_scale=0.95)
            base = draw_halo_crown(base, head_cx=25, head_top_y=7 + glide_dy, phase_rad=phase * 2.0, intensity=1.4)
            staff_deg = -50.0 + math.sin(k * 0.5) * 4.0  # -54..-46 deg diagonal glide
            frame = draw_celestial_staff(
                base,
                shoulder=(26.0, 17.0 + glide_dy),
                staff_deg=staff_deg,
                reach=6.2,
                charge_level=2 if 4 <= k <= 11 else 1,
                cast_flash=(f == 12),
                flare=0.7 if 5 <= k <= 10 else 0.3,
                phase_rad=phase * 2.0,
            )
            if f <= 20:
                frame = draw_angel_feather_slipstream(frame, f, phase_rad=phase * 2.0, intensity=1.0)

        else:
            u = (f - 22) / 7.0
            base = (tpl['dash'] if f <= 24 else tpl['stand']).copy()
            base = apply_hair_and_vestment_wave(base, phase, amplitude=1.5, vertical_flutter=0.6)
            wing_sc = max(0.0, 0.85 * (1.0 - u))
            if wing_sc > 0.08:
                base = draw_seraphim_wings(base, cx=18, cy=17, span_phase=phase * 2.0, alpha_scale=wing_sc)
            base = draw_halo_crown(base, head_cx=23, head_top_y=7, phase_rad=phase, intensity=1.1)
            staff_deg = -50.0 * (1.0 - u) + (-74.0) * u
            frame = draw_celestial_staff(
                base,
                shoulder=(26.0 if f <= 24 else 25.0, 17.0),
                staff_deg=staff_deg,
                reach=6.2 * (1.0 - u) + 5.2 * u,
                phase_rad=phase,
            )

        frames.append(ensure_safe_cell(frame, margin=2))
    return frames


def build_row7_crouch(tpl):
    """
    Row 7: 30-Frame CROUCH Sequence (Aegis Prayer):
    - Kneels down 7px (make_crouch_body(tpl, 7)) keeping her golden slippers anchored at ny = 44..49.
    - F00..F10: Holds her left hand forward projecting the golden hexagonal Aegis shield while
      holding her Sacred Staff in a guarded prayer angle (-78..-86 deg).
    - F11..F18: Thrusts her Sacred Staff forward to -40 deg (flare=1.0) for the low Sacred Starbolt!
    - F19..F29: Smoothly rises from kneeling back to standing stance (-40 -> -74 deg).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 10:
            depths = [1, 2, 4, 5, 6, 7, 7, 7, 7, 7, 7]
            d = depths[f]
            u = f / 10.0
            base = make_crouch_body(tpl, d)
            base = apply_hair_and_vestment_wave(base, phase, amplitude=1.2, vertical_flutter=0.4)
            base = draw_halo_crown(base, head_cx=23, head_top_y=7 + d, phase_rad=phase * 2.0, intensity=1.3)
            # Left hand forward projecting the golden hexagonal Aegis shield (F00..F10)
            lh_x = 31.0 + min(2.0, f * 0.25)
            lh_y = 19.0 + min(4.5, d * 0.65)
            base = draw_left_prayer_arm(
                base,
                shoulder=(24.0, 17.5 + min(4.5, d * 0.65)),
                hand=(lh_x, lh_y),
                mote_glow=1.2,
                aegis_shield=True,
                phase_rad=phase * 2.0,
            )
            staff_deg = -76.0 - math.sin(u * math.pi) * 10.0  # Guarded prayer staff (-76..-86 deg)
            frame = draw_celestial_staff(
                base,
                shoulder=(25.0, 17.0 + min(4.5, d * 0.65)),
                staff_deg=staff_deg,
                reach=5.0,
                charge_level=2 if f >= 5 else 1,
                grip_override=(30.0, 18.5 + min(4.0, d * 0.55)),
                phase_rad=phase * 2.0,
            )
            frames.append(ensure_safe_cell(frame, margin=2))

        elif f <= 18:
            d = 7
            k = f - 11
            u_bolt = k / 7.0
            base = make_crouch_body(tpl, d)
            if f in (12, 13):
                base = shift_layer(base, dx=1, dy=0)
            base = apply_hair_and_vestment_wave(base, phase * 1.5, amplitude=1.4, vertical_flutter=0.4)
            base = draw_halo_crown(base, head_cx=23, head_top_y=7 + d, phase_rad=phase * 2.0, intensity=1.5)
            base = draw_left_prayer_arm(
                base,
                shoulder=(24.5, 21.5),
                hand=(31.0, 24.5),
                mote_glow=1.0 if k <= 4 else 0.5,
                aegis_shield=(k == 0),
                phase_rad=phase * 2.0,
            )
            # Thrusts Sacred Staff forward to -40 deg for the low Sacred Starbolt!
            if k == 0:
                staff_deg = -56.0
                gx_cr, gy_cr = 32.5, 21.5
            elif k <= 5:
                staff_deg = -40.0 - (k - 1) * 0.6
                gx_cr, gy_cr = 34.5, 22.0 + (k % 2) * 0.4
            else:
                staff_deg = -43.0 - (k - 5) * 4.0
                gx_cr, gy_cr = 33.5, 22.0
            frame = draw_celestial_staff(
                base,
                shoulder=(25.5, 21.5),
                staff_deg=staff_deg,
                reach=6.3,
                charge_level=3 if k <= 5 else 2,
                cast_flash=(f in (12, 13, 14)),
                flare=1.0 if k <= 5 else 0.65,
                grip_override=(gx_cr, gy_cr),
                phase_rad=phase * 2.0,
            )
            frames.append(ensure_safe_cell(frame, margin=2))

        else:
            depths = [7, 6, 6, 5, 4, 3, 3, 2, 1, 1, 0]
            k = f - 19
            d = depths[k]
            base = tpl['stand'].copy() if d == 0 else make_crouch_body(tpl, d)
            base = apply_hair_and_vestment_wave(base, phase, amplitude=1.3, vertical_flutter=0.5)
            base = draw_halo_crown(base, head_cx=23, head_top_y=7 + d, phase_rad=phase, intensity=1.0)
            u = k / 10.0
            staff_deg = -48.0 * (1.0 - u) + (-74.0) * u
            frame = draw_celestial_staff(
                base,
                shoulder=(25.0, 17.0 + min(4.5, d * 0.65)),
                staff_deg=staff_deg,
                reach=5.8 * (1.0 - u) + 5.2 * u,
                phase_rad=phase,
            )
            frames.append(ensure_safe_cell(frame, margin=2))

    return frames


def build_row8_jump(tpl):
    """
    Row 8: 30-Frame JUMP Sequence (Seraphic Wing-Glide Vault & Starlight Smite):
    - F00..F04: Graceful knee-bend launch (-74 -> -88 deg) as Seraphim wings begin to unfurl.
    - F05..F11: Ascending angelic vault with full majestic Archangel Wings (x = 4..18, y = 7..35)
      flapping gracefully (-88 -> -52 deg).
    - F12..F18: Apex mid-air hover thrusting her Sacred Staff forward at -42 deg (flare=1.0) for Starlight Smite!
    - F19..F24: Feather-cushioned descent (-44 -> -70 deg).
    - F25..F29: Poised landing (-70 -> -74 deg).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 4:
            crouch_seq = [1, 2, 4, 2, 0]
            dy = crouch_seq[f]
            body = make_crouch_body(tpl, dy) if dy >= 2 else make_jump_body(tpl, dy, tuck_amount=0.25, phase_rad=phase)
            body = apply_hair_and_vestment_wave(body, phase * 1.5, amplitude=1.5, vertical_flutter=0.6)
            if f >= 1:
                body = draw_seraphim_wings(body, cx=18, cy=17 + dy, span_phase=phase * 2.0, alpha_scale=0.35 + f * 0.14)
            body = draw_halo_crown(body, head_cx=23, head_top_y=7 + dy, phase_rad=phase, intensity=1.2)
            staff_deg = [-74.0, -78.0, -82.0, -86.0, -88.0][f]
            frame = draw_celestial_staff(
                body,
                shoulder=(25.0, 17.0 + min(3.0, dy * 0.7)),
                staff_deg=staff_deg,
                reach=5.0 + f * 0.1,
                charge_level=1 if f >= 3 else 0,
                phase_rad=phase,
            )
            if f == 4:
                frame = draw_angel_feather_slipstream(frame, f, phase_rad=phase * 2.0, intensity=0.8)
            frames.append(ensure_safe_cell(frame, margin=2))

        elif f <= 11:
            k = f - 5
            u = k / 6.0
            tuck = 0.45 + 0.40 * math.sin(u * math.pi * 0.65)
            wing_u = 0.85 + 0.15 * u
            lean_dx = 1 if k >= 3 else 0
            body = make_jump_body(tpl, jump_dy=-1, tuck_amount=tuck, torso_lean_dx=lean_dx, phase_rad=phase * 2.0)
            body = apply_hair_and_vestment_wave(body, phase * 2.0, amplitude=1.8, vertical_flutter=0.8)
            body = draw_seraphim_wings(body, cx=18 + lean_dx, cy=16, span_phase=phase * 3.0, alpha_scale=wing_u)
            body = draw_halo_crown(body, head_cx=23 + lean_dx, head_top_y=6, phase_rad=phase * 2.0, intensity=1.5)
            body = draw_left_prayer_arm(
                body,
                shoulder=(24.0 + lean_dx, 17.0),
                hand=(30.5 + u * 1.5, 20.5 - u * 2.0),
                mote_glow=1.1,
                phase_rad=phase * 2.0,
            )
            staff_deg = -88.0 * (1.0 - u) + (-52.0) * u
            frame = draw_celestial_staff(
                body,
                shoulder=(25.0 + lean_dx, 16.0),
                staff_deg=staff_deg,
                reach=5.4 + u * 1.0,
                charge_level=2 if k >= 3 else 1,
                phase_rad=phase * 2.0,
            )
            frame = draw_angel_feather_slipstream(frame, f, phase_rad=phase * 2.0, intensity=1.0)
            frames.append(ensure_safe_cell(frame, margin=2))

        elif f <= 18:
            k = f - 12
            lean_dx = 0 if k in (3, 4) else 1
            body = make_jump_body(
                tpl,
                jump_dy=-2,
                tuck_amount=0.82 - k * 0.04,
                torso_lean_dx=lean_dx,
                phase_rad=phase * 2.5,
            )
            body = apply_hair_and_vestment_wave(body, phase * 2.2, amplitude=2.0, vertical_flutter=0.9)
            body = draw_seraphim_wings(body, cx=18 + lean_dx, cy=16, span_phase=phase * 3.5, alpha_scale=1.0)
            body = draw_halo_crown(body, head_cx=23 + lean_dx, head_top_y=5, phase_rad=phase * 2.5, intensity=1.7)
            body = draw_left_prayer_arm(
                body,
                shoulder=(24.5 + lean_dx, 16.5),
                hand=(31.5, 19.0 + (k % 2) * 0.5),
                mote_glow=1.3,
                phase_rad=phase * 2.5,
            )
            staff_deg = -42.0 - (2.5 if k >= 4 else 0.0)
            frame = draw_celestial_staff(
                body,
                shoulder=(25.5 + lean_dx, 15.5),
                staff_deg=staff_deg,
                reach=6.5,
                charge_level=3 if k <= 4 else 2,
                cast_flash=(f in (14, 15, 16)),
                flare=1.0 if k <= 4 else 0.65,
                grip_override=(34.5, 17.5 + (k % 2) * 0.4),
                phase_rad=phase * 2.5,
            )
            frame = draw_angel_feather_slipstream(frame, f, phase_rad=phase * 2.5, intensity=1.0)
            frames.append(ensure_safe_cell(frame, margin=2))

        elif f <= 24:
            k = f - 19
            u = k / 5.0
            tuck = 0.55 * (1.0 - u)
            wing_u = 0.95 - u * 0.50
            dy_lift = -1 if k <= 2 else 0
            body = make_jump_body(tpl, jump_dy=dy_lift, tuck_amount=tuck, phase_rad=phase * 2.0)
            body = apply_hair_and_vestment_wave(body, phase * 2.0, amplitude=1.7, vertical_flutter=0.8)
            body = draw_seraphim_wings(body, cx=18, cy=17 + dy_lift, span_phase=phase * 2.5, alpha_scale=wing_u)
            body = draw_halo_crown(body, head_cx=23, head_top_y=6, phase_rad=phase * 2.0, intensity=1.3)
            staff_deg = -46.0 * (1.0 - u) + (-70.0) * u
            frame = draw_celestial_staff(
                body,
                shoulder=(25.0, 17.0 + dy_lift),
                staff_deg=staff_deg,
                reach=6.2 * (1.0 - u) + 5.2 * u,
                charge_level=1 if k <= 1 else 0,
                phase_rad=phase * 2.0,
            )
            if f <= 20:
                frame = draw_angel_feather_slipstream(frame, f, phase_rad=phase * 2.0, intensity=0.85)
            frames.append(ensure_safe_cell(frame, margin=2))

        else:
            k = f - 25
            crouch_depths = [2, 3, 2, 1, 0]
            d = crouch_depths[k]
            body = tpl['stand'].copy() if d == 0 else make_crouch_body(tpl, d)
            body = apply_hair_and_vestment_wave(body, phase, amplitude=1.4, vertical_flutter=0.5)
            if k <= 1:
                body = draw_seraphim_wings(body, cx=18, cy=17 + d, span_phase=phase * 2.0, alpha_scale=0.35 - k * 0.15)
            body = draw_halo_crown(body, head_cx=23, head_top_y=7 + d, phase_rad=phase, intensity=1.0)
            u = k / 4.0
            staff_deg = -70.0 * (1.0 - u) + (-74.0) * u
            frame = draw_celestial_staff(
                body,
                shoulder=(25.0, 17.0 + min(2.5, d * 0.7)),
                staff_deg=staff_deg,
                reach=5.2,
                phase_rad=phase,
            )
            frames.append(ensure_safe_cell(frame, margin=2))

    return frames


def apply_pass12_postprocess(cell_arr, r_idx, f):
    """
    Pass #12 Post-Processing Upgrade (applied on 208x208 cell_arr with all pixels strictly inside [4..203]):
    1. Row 2 (AUTO_ATTACK, F13..F19): Crisp 4-point elemental release star + 2 orbiting motes
       at (x = 148 + (f - 13) * 2, y = 88 + ((f * 5) % 14)) in sacred-gold/white palette.
    2. Row 7 & Row 3 (SKILL, F08..F20): Glowing elemental floor rune-bar at y = 186..189, x = 76..134
       with 3 rising rune motes (y = 182 - ((f - 8) * 3) % 24).
    3. Row 8 & Row 4 (ULTIMATE, F03..F26): 4 ascending overdrive starlight motes around the caster
       (x = 68, 88, 122, 140, y cycling upward with f).
    """
    out = cell_arr.copy()

    def put208(px, py, col):
        ix = max(4, min(203, int(round(px))))
        iy = max(4, min(203, int(round(py))))
        out[iy, ix] = col

    # 1. Row 2 (AUTO_ATTACK, F13..F19) Muzzle / Cast-Release Flash Star
    if r_idx == 2 and 13 <= f <= 19:
        cx = 148 + (f - 13) * 2
        cy = 88 + ((f * 5) % 14)
        # 4-point elemental release star (sacred-gold/white)
        for d in range(-6, 7):
            col_h = WHITE_PURE if abs(d) <= 1 else (GOLD_BRIGHT if abs(d) <= 3 else STAR_CREAM)
            put208(cx + d, cy, col_h)
            put208(cx, cy + d, col_h)
            if abs(d) <= 3:
                put208(cx + d, cy - 1, STAR_CREAM if abs(d) <= 1 else GOLD_ROYAL)
                put208(cx + d, cy + 1, STAR_CREAM if abs(d) <= 1 else GOLD_ROYAL)
                put208(cx - 1, cy + d, STAR_CREAM if abs(d) <= 1 else GOLD_ROYAL)
                put208(cx + 1, cy + d, STAR_CREAM if abs(d) <= 1 else GOLD_ROYAL)
        for dx_d, dy_d in [(-2, -2), (2, -2), (-2, 2), (2, 2)]:
            put208(cx + dx_d, cy + dy_d, GOLD_BRIGHT)
        # 2 orbiting motes
        ang = (f - 13) * 0.95
        for m_idx in range(2):
            ma = ang + m_idx * math.pi
            mx = cx + int(round(math.cos(ma) * 8.0))
            my = cy + int(round(math.sin(ma) * 6.0))
            m_col = GOLD_BRIGHT if m_idx == 0 else STAR_CREAM
            put208(mx, my, WHITE_PURE)
            put208(mx + 1, my, m_col)
            put208(mx - 1, my, m_col)
            put208(mx, my + 1, m_col)
            put208(mx, my - 1, m_col)

    # 2. Row 7 & Row 3 (SKILL, F08..F20) Curved Perspective Sanctuary Rune-Floor Arch
    if r_idx in (3, 7) and 8 <= f <= 20:
        for x_bar in range(78, 133):
            norm_dx = (x_bar - 105.0) / 27.5
            arch_curve = int(round((1.0 - norm_dx * norm_dx) * 3.0))
            ay = 185 + arch_curve
            is_glyph = ((x_bar + (f - 8) * 3) % 9) == 0
            if abs(norm_dx) < 0.88:
                put208(x_bar, ay, WHITE_PURE if is_glyph else GOLD_BRIGHT)
                put208(x_bar, ay + 1, STAR_CREAM if is_glyph else GOLD_ROYAL)
        # 3 rising diamond rune motes (y = 182 - ((f - 8) * 3) % 24)
        base_mote_y = 182 - ((f - 8) * 3) % 24
        for m_i, mx_base in enumerate((86, 105, 124)):
            mx = mx_base + (((f - 8) + m_i) % 3) - 1
            my = max(4, min(203, base_mote_y - m_i * 2))
            put208(mx, my, WHITE_PURE)
            put208(mx - 1, my, GOLD_BRIGHT if m_i % 2 == 0 else STAR_CREAM)
            put208(mx + 1, my, GOLD_BRIGHT if m_i % 2 == 0 else STAR_CREAM)
            put208(mx, my - 1, WHITE_PURE)
            put208(mx, my + 1, STAR_CREAM)

    # 3. Row 8 & Row 4 (ULTIMATE, F03..F26) Overdrive Ascension Energy Motes
    if r_idx in (4, 8) and 3 <= f <= 26:
        for m_i, mx in enumerate((68, 88, 122, 140)):
            my = 172 - ((f - 3) * 4 + m_i * 18) % 108
            put208(mx, my, WHITE_PURE)
            for d in (1, 2):
                c_arm = GOLD_BRIGHT if d == 1 else STAR_CREAM
                put208(mx - d, my, c_arm)
                put208(mx + d, my, c_arm)
                put208(mx, my - d, c_arm)
            for t_dy in range(1, 5):
                put208(mx, my + t_dy, STAR_CREAM if t_dy == 1 else (GOLD_BRIGHT if t_dy <= 2 else GOLD_ROYAL))

    return out


def paste_cell(canvas, r, f, cell_arr_208, cell_px=208):
    cell_im = Image.fromarray(cell_arr_208, mode='RGBA')
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

    clipped_total = 0
    cell_rows_208 = []
    for r, (r_name, r_frames) in enumerate(rows):
        assert len(r_frames) == 30, f'{r_name} has {len(r_frames)} frames instead of 30'
        row_208 = []
        for f in range(30):
            r_frames[f] = ensure_safe_cell(r_frames[f], margin=2)
            cell_im = Image.fromarray(r_frames[f], mode='RGBA').resize((cell_px, cell_px), Image.NEAREST)
            cell_arr = apply_pass12_postprocess(np.array(cell_im, dtype=np.uint8), r, f)
            if (
                np.any(cell_arr[:2, :, 3] > 0)
                or np.any(cell_arr[206:, :, 3] > 0)
                or np.any(cell_arr[:, :2, 3] > 0)
                or np.any(cell_arr[:, 206:, 3] > 0)
            ):
                clipped_total += 1
            row_208.append(cell_arr)
            paste_cell(canvas, r, f, cell_arr, cell_px=cell_px)
        adj_diffs = sum(1 for i in range(29) if np.any(row_208[i] != row_208[i + 1]))
        print(f'{r_name:56s}: 30 frames generated, {adj_diffs}/29 adjacent transitions distinct')
        assert adj_diffs == 29, f'{r_name} has duplicate adjacent frames ({adj_diffs}/29)'
        cell_rows_208.append(row_208)

    print(f'Boundary-clipped frames on outer 2px border [0, 1, 206, 207]: {clipped_total}/270')
    assert clipped_total == 0, f'Expected 0/270 boundary-clipped frames, got {clipped_total}'

    canvas.save('assets/sprites/priestess_sheet.png')
    print('Saved assets/sprites/priestess_sheet.png:', canvas.size)

    # Render full 30-col x 9-row contact sheet + zoomed-in left (F00..F14) and right (F15..F29) halves
    preview_cell = 96
    pad_top = 24
    dbg = Image.new('RGBA', (30 * preview_cell, num_rows * (preview_cell + pad_top)), (15, 20, 30, 255))
    draw = ImageDraw.Draw(dbg)
    for r_idx, (r_name, _) in enumerate(rows):
        y0 = r_idx * (preview_cell + pad_top)
        draw.rectangle([0, y0, 30 * preview_cell, y0 + pad_top - 2], fill=(26, 34, 50, 255))
        draw.text((8, y0 + 5), r_name, fill=(253, 224, 71, 255))
        for c_idx, cell_arr in enumerate(cell_rows_208[r_idx]):
            x0 = c_idx * preview_cell
            draw.text((x0 + 4, y0 + 13), f'F{c_idx:02d}', fill=(148, 163, 184, 255))
            p_im = Image.fromarray(cell_arr, mode='RGBA').resize((preview_cell, preview_cell), Image.NEAREST)
            dbg.paste(p_im, (x0, y0 + pad_top), p_im)
            draw.rectangle([x0, y0 + pad_top, x0 + preview_cell - 1, y0 + pad_top + preview_cell - 1], outline=(35, 45, 65, 255))

    art_dir = '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/4f1fb80f-a88f-4496-9746-b4b9fe84f6d4'
    dbg.crop((0, 0, 15 * preview_cell, dbg.height)).save(f'{art_dir}/debug_priestess_30fps_left_F00_F14.png')
    dbg.crop((15 * preview_cell, 0, 30 * preview_cell, dbg.height)).save(f'{art_dir}/debug_priestess_30fps_right_F15_F29.png')
    print('Saved Priestess contact sheets to:', art_dir)


if __name__ == '__main__':
    main()



