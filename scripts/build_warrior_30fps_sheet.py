#!/usr/bin/env python3
"""
Builds Aethelgard's (Warrior) 30-Frame-Per-Animation HD-2D Sprite Sheet:
- 9 rows x 30 columns = 270 unique frames (6240 x 1872 at 208x208 per cell, 52x52 logical upscaled 4x NEAREST):
  * Row 0: IDLE (30 frames)
  * Row 1: WALK (30 frames)
  * Row 2: AUTO_ATTACK (30 frames)
  * Row 3: SKILL - TEMPEST VANGUARD / VALKYRIE WHIRLWIND + THUNDER-SLAM (30 frames)
  * Row 4: ULTIMATE - HEAVENLY EARTHSHATTER / OMNISLASH + DRAGON VAULT + PLUNGE (30 frames)
  * Row 5: DEATH & HURT (30 frames)
  * Row 6: DASH - VALKYRIE CHARGE (30 frames)
  * Row 7: CROUCH - AEGIS GREATSHIELD BRACE & FROST-CRESCENT COUNTER-SLASH (30 frames)
  * Row 8: JUMP - VALKYRIE AERIAL VAULT & MID-AIR DOWNWARD FROST CLEAVE (30 frames)
- Un-inked clean pixel art: zero duplicate swords, zero extra limbs, zero morphing blobs, zero bouncy-ball frames.
"""

import math
import numpy as np
from PIL import Image, ImageDraw

# Palette matching Aethelgard's HD-2D pixel art (Frost-Sapphire, Starlight-Gold, Steel-Plate & Royal Cape)
STEEL_BRIGHT = (203, 213, 225, 255)
STEEL_LIGHT = (148, 163, 184, 255)
STEEL_MID = (100, 116, 139, 255)
STEEL_DARK = (51, 65, 85, 255)
STEEL_DEEP = (30, 41, 59, 255)

GOLD_WHITE = (254, 249, 195, 255)
GOLD_BRIGHT = (250, 204, 21, 255)
GOLD_MID = (202, 138, 4, 255)
GOLD_DARK = (133, 77, 14, 255)

FROST_WHITE = (255, 255, 255, 255)
FROST_CORE = (224, 242, 254, 255)
FROST_BRIGHT = (125, 211, 252, 255)
FROST_CYAN = (56, 189, 248, 255)
FROST_MID = (2, 132, 199, 255)
FROST_DEEP = (12, 74, 110, 255)

CAPE_ROYAL_HI = (59, 130, 246, 255)
CAPE_ROYAL_MID = (29, 78, 216, 255)
CAPE_ROYAL_DARK = (23, 37, 84, 255)
CAPE_CRIMSON_HI = (225, 29, 72, 255)
CAPE_CRIMSON_MID = (159, 18, 57, 255)
LEATHER_DARK = (68, 46, 36, 255)
LEATHER_LIGHT = (110, 75, 58, 255)


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


def add_outline_to_layer(layer):
    """
    Returns `layer.copy()` without dilating opaque black pixels into transparent space,
    matching Archer's clean un-inked 30fps pixel art pipeline.
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


def ensure_safe_cell(frame):
    """
    Guarantees zero pixels touch the 52x52 cell border (x=0, x=51, y=0, y=51) and fills
    any 1px interior pinholes from movement.
    """
    out = fill_layer_pinholes(frame, 1, 50, 1, 50, require_3_neighbors=True)
    ys, xs = np.where(out[:, :, 3] > 0)
    if len(ys) == 0:
        return out
    ymin, ymax = int(ys.min()), int(ys.max())
    xmin, xmax = int(xs.min()), int(xs.max())

    dy = 0
    if ymin < 1 and ymax < 50:
        dy = min(1 - ymin, 50 - ymax)
    elif ymax > 50 and ymin > 1:
        dy = -min(ymax - 50, ymin - 1)

    dx = 0
    if xmin < 1 and xmax < 50:
        dx = min(1 - xmin, 50 - xmax)
    elif xmax > 50 and xmin > 1:
        dx = -min(xmax - 50, xmin - 1)

    if dx != 0 or dy != 0:
        shifted = np.zeros_like(out)
        for y in range(52):
            ny = y + dy
            if 1 <= ny <= 50:
                for x in range(52):
                    nx = x + dx
                    if 1 <= nx <= 50 and out[y, x, 3] > 0:
                        shifted[ny, nx] = out[y, x]
        out = shifted

    # Clear extreme 1px perimeter if any single stray spark remained on 0 or 51
    out[0, :, :] = 0
    out[51, :, :] = 0
    out[:, 0, :] = 0
    out[:, 51, :] = 0
    return out


def composite_over(base, over):
    res = base.copy()
    mask = over[:, :, 3] > 0
    res[mask] = over[mask]
    return res


def load_source_cells(path='backups/warrior_sheet_before_30fps.png'):
    im = Image.open(path).convert('RGBA')

    def cell(r, c):
        return np.array(
            im.crop((c * 208, r * 208, (c + 1) * 208, (r + 1) * 208)).resize((52, 52), Image.NEAREST),
            dtype=np.uint8
        )

    return {
        'idle': cell(0, 0),
        'windup': cell(2, 0),
        'lunge': cell(2, 3),
        'cleave_down': cell(2, 4),
        'kneel1': cell(4, 1),
        'kneel2': cell(4, 3),
        'fall': cell(4, 4),
        'dash': cell(5, 2),
    }


def neutralize_warrior_chest_arm(arr, max_chest_x=29):
    """
    Removes the static baked forearm/gauntlet across Aethelgard's chest (y=19..27, x=21..max_chest_x)
    and clears any arm pixels protruding past `max_chest_x` at y=15..29 so only the dynamic IK arm is visible.
    """
    for y in range(15, 30):
        for x in range(20, 52):
            if x > max_chest_x:
                arr[y, x] = 0
            elif 19 <= y <= 27 and x >= 21 and arr[y, x, 3] > 0:
                r, g, b, _ = arr[y, x]
                # Replace bright gauntlet/elbow/hilt highlights on the chest with dark steel/tabard shading
                if int(r) + int(g) + int(b) > 290 or r > 120 or g > 120:
                    arr[y, x] = STEEL_MID if (x + y) % 2 == 0 else STEEL_DARK


def make_clean_templates(src):
    """
    Strips all baked-in swords AND restores Aethelgard's unobstructed steel chest plate, golden cross-trim,
    and waist belt from `src['windup'][18:33, 18:30]` so we draw EXACTLY ONE crisp articulated IK arm + Runeblade per frame.
    """
    windup = src['windup']
    down = src['cleave_down']

    # 1. Clean standing body (restore unobstructed chest/waist from windup and strip diagonal sword at x >= 30)
    stand = src['idle'].copy()
    stand[14:27, 26:30] = down[14:27, 26:30]
    for y in range(18, 33):
        for x in range(18, 30):
            if windup[y, x, 3] > 0:
                stand[y, x] = windup[y, x]
    for y in range(0, 31):
        for x in range(0, 52):
            if y <= 14 and x >= 29:
                stand[y, x] = 0
            elif 15 <= y <= 30 and x >= 30:
                stand[y, x] = 0
    stand[0:2, :, :] = 0
    stand[50:, :, :] = 0
    stand[:, 0:2, :] = 0
    stand[:, 50:, :] = 0
    stand = add_outline_to_layer(stand)

    # Extract Aethelgard's actual pixel-art Left (Back) Sabaton and Right (Front) Sabaton (y=40..49 only, no upper thighs)
    leg_back_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_front_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_back_patch[40:50, 9:19] = stand[40:50, 9:19]
    leg_front_patch[40:50, 26:36] = stand[40:50, 26:36]

    stand_upper = np.zeros((52, 52, 4), dtype=np.uint8)
    stand_upper[:34, :] = stand[:34, :]
    stand_upper[34:44, :15] = stand[34:44, :15]
    stand_upper = add_outline_to_layer(stand_upper)

    # 2. Clean forward-lunging body (from lunge cell(2, 3), stripping baked-in sword at x >= 31)
    lunge = src['lunge'].copy()
    for y in range(19, 32):
        for x in range(19, 30):
            if windup[y, x, 3] > 0:
                lunge[y, min(50, x + 1)] = windup[y, x]
    for y in range(0, 31):
        for x in range(0, 52):
            if y <= 14 and x >= 31:
                lunge[y, x] = 0
            elif 15 <= y <= 30 and x >= 31:
                lunge[y, x] = 0
    lunge[0:2, :, :] = 0
    lunge[50:, :, :] = 0
    lunge[:, 0:2, :] = 0
    lunge[:, 50:, :] = 0
    lunge = add_outline_to_layer(lunge)

    # 3. Clean kneeling bodies (kneel1, kneel2) with vertical planted sword on right (x >= 31) removed
    kneel1 = src['kneel1'].copy()
    kneel2 = src['kneel2'].copy()
    for kn in (kneel1, kneel2):
        kn[:, 31:, :] = 0
        ys_k, _ = np.where(kn[:, :, 3] > 0)
        if len(ys_k) > 0 and ys_k.max() >= 49:
            shift_up = int(ys_k.max() - 48)
            kn_s = np.zeros_like(kn)
            kn_s[:52 - shift_up, :] = kn[shift_up:, :]
            kn[:, :, :] = kn_s
        kn[:, 0:2, :] = 0
    kneel1 = add_outline_to_layer(kneel1)
    kneel2 = add_outline_to_layer(kneel2)

    # 4. Clean horizontal fallen body (strip floor sword at y >= 45 so we can place our single flat Runeblade cleanly)
    fall = src['fall'].copy()
    fall[45:, :, :] = 0
    fall[:, 0:2, :] = 0
    fall[:, 50:, :] = 0
    fall = add_outline_to_layer(fall)

    # 5. Clean dash body (from cell(5, 2) with high-streaming cape, restoring unobstructed chest/waist)
    dash = src['dash'].copy()
    dash[15:27, 26:30] = down[15:27, 26:30]
    for y in range(18, 32):
        for x in range(18, 30):
            if windup[y, x, 3] > 0:
                dash[y, x] = windup[y, x]
    for y in range(0, 31):
        for x in range(0, 52):
            if y <= 15 and x >= 29:
                dash[y, x] = 0
            elif 16 <= y <= 30 and x >= 30:
                dash[y, x] = 0
    dash[0:2, :, :] = 0
    dash[50:, :, :] = 0
    dash[:, 0:2, :] = 0
    dash[:, 50:, :] = 0
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


def apply_cape_wave(frame, phase_rad, amplitude=1.5, vertical_flutter=0.6, is_dash=False, crimson_trim=True):
    """
    Applies a smooth 30-frame traveling wind-wave to Aethelgard's royal cape (left side of sprite)
    without disturbing his armored torso, head, or legs, and fills all wave pinholes/seams.
    """
    out = frame.copy()
    if is_dash:
        cape_region = frame[4:36, 0:21].copy()
        out[4:36, 0:18] = 0
        for y in range(4, 36):
            for x in range(0, 21):
                if cape_region[y - 4, x, 3] == 0:
                    continue
                if (y >= 26 and x >= 12) or x >= 16:
                    out[y, max(2, x)] = cape_region[y - 4, x]
                    continue
                dist_from_shoulder = max(0.0, (20 - x) / 17.0)
                dy = int(round(math.sin(phase_rad - dist_from_shoulder * 3.2) * (amplitude * 0.65) * dist_from_shoulder))
                dx = int(round(math.cos(phase_rad * 2.0 - dist_from_shoulder * 2.4) * 0.6 * dist_from_shoulder))
                ny = max(3, min(44, y + dy))
                nx = max(2, min(20, x + dx))
                out[ny, nx] = cape_region[y - 4, x]
                if x >= 12 and out[y, x, 3] == 0:
                    out[y, x] = cape_region[y - 4, x]
        out = fill_layer_pinholes(out, x0=2, x1=22, y0=3, y1=45, require_3_neighbors=False)
        return add_outline_to_layer(out)

    cape_mask = np.zeros((52, 52), dtype=bool)
    for y in range(13, 44):
        max_cape_x = 18 if y < 36 else 13
        for x in range(1, max_cape_x + 1):
            if frame[y, x, 3] > 0:
                cape_mask[y, x] = True

    cape_pixels = frame.copy()
    out[cape_mask] = 0

    for y in range(13, 44):
        u = (y - 13) / 30.0
        wave_x = math.sin(phase_rad - u * 3.5) * (amplitude * (0.25 + 0.75 * u))
        wave_y = math.cos(phase_rad - u * 2.8) * (vertical_flutter * 0.75 * u)
        dx = int(round(wave_x))
        dy = int(round(wave_y))
        max_cape_x = 18 if y < 36 else 13
        for x in range(1, max_cape_x + 1):
            if not cape_mask[y, x]:
                continue
            nx = max(2, min(20, x + dx))
            ny = max(13, min(46, y + dy))
            if out[ny, nx, 3] == 0:
                out[ny, nx] = cape_pixels[y, x]
            # Anchor inner seam to torso/hips so zero gap ever opens when cape waves left or vertically
            if x >= max_cape_x - 4 and out[y, x, 3] == 0:
                out[y, x] = cape_pixels[y, x]

    out = fill_layer_pinholes(out, x0=2, x1=21, y0=12, y1=46, require_3_neighbors=False)

    # Subtle royal crimson-and-gold inner lining glint along the undulating cape edge
    if crimson_trim:
        for y in range(22, 38):
            for x in range(2, 14):
                if out[y, x, 3] > 0 and out[y, x - 1, 3] == 0:
                    if (y + int(round(phase_rad * 2))) % 5 == 0:
                        out[y, x] = GOLD_MID
                    elif (y + int(round(phase_rad * 2))) % 3 == 0:
                        out[y, x] = CAPE_CRIMSON_MID
                    break

    return add_outline_to_layer(out)


def solve_ik_elbow(sx, sy, hx, hy, l1=5.2, l2=5.2, bend_side=1.0):
    """
    2-Bone Inverse Kinematics solver returning the anatomical elbow joint (ex, ey)
    between shoulder (sx, sy) and hand (hx, hy).
    `bend_side = +1.0` bends the elbow naturally downward/back-left for a right-facing warrior.
    """
    dx = float(hx - sx)
    dy = float(hy - sy)
    dist = max(0.8, math.hypot(dx, dy))
    max_reach = l1 + l2 - 0.15
    if dist > max_reach:
        dx *= max_reach / dist
        dy *= max_reach / dist
        dist = max_reach
    ux, uy = dx / dist, dy / dist
    px, py = -uy * bend_side, ux * bend_side
    a = (l1 * l1 - l2 * l2 + dist * dist) / (2.0 * dist)
    h = math.sqrt(max(0.0, l1 * l1 - a * a))
    ex = sx + ux * a + px * h
    ey = sy + uy * a + py * h
    return ex, ey


def draw_ik_armored_arm(layer, sx, sy, ex, ey, hx, hy, is_rear=False, draw_pauldron=True):
    """
    Draws a sculpted 2-segment armored arm (Rotating Pauldron -> Upper Arm Rerebrace ->
    Golden Elbow Couter -> Forearm Vambrace -> Gauntlet Fist) onto `layer` with a 1px dark
    silhouette crease so the arm never blends into the torso armor.
    When `is_rear=True`, uses darker depth-shaded steel (`STEEL_MID`, `STEEL_DARK`, `STEEL_DEEP`)
    for the rear pommel-gripping arm behind the sword hilt.
    """
    if is_rear:
        c_hi, c_mid, c_dark, c_out, c_gold = STEEL_LIGHT, STEEL_MID, STEEL_DARK, STEEL_DEEP, GOLD_MID
        thick = 0.85
    else:
        c_hi, c_mid, c_dark, c_out, c_gold = STEEL_BRIGHT, STEEL_LIGHT, STEEL_DARK, STEEL_DEEP, GOLD_BRIGHT
        thick = 1.0

    # 1. Upper Arm (Shoulder -> Elbow) with 1px dark outer seam + steel bevel
    u1x, u1y = ex - sx, ey - sy
    d1 = max(1.0, math.hypot(u1x, u1y))
    n1x, n1y = -u1y / d1, u1x / d1
    draw_line_px(layer, sx + n1x * (1.25 * thick), sy + n1y * (1.25 * thick), ex + n1x * (1.05 * thick), ey + n1y * (1.05 * thick), c_out)
    draw_line_px(layer, sx - n1x * (1.25 * thick), sy - n1y * (1.25 * thick), ex - n1x * (1.05 * thick), ey - n1y * (1.05 * thick), c_out)
    draw_line_px(layer, sx + n1x * (0.65 * thick), sy + n1y * (0.65 * thick), ex + n1x * (0.55 * thick), ey + n1y * (0.55 * thick), c_hi)
    draw_line_px(layer, sx - n1x * (0.65 * thick), sy - n1y * (0.65 * thick), ex - n1x * (0.55 * thick), ey - n1y * (0.55 * thick), c_dark)
    draw_line_px(layer, sx, sy, ex, ey, c_mid)

    # 2. Forearm Vambrace (Elbow -> Hand) with 1px dark outer seam + steel bevel
    u2x, u2y = hx - ex, hy - ey
    d2 = max(1.0, math.hypot(u2x, u2y))
    n2x, n2y = -u2y / d2, u2x / d2
    draw_line_px(layer, ex + n2x * (1.15 * thick), ey + n2y * (1.15 * thick), hx + n2x * (0.95 * thick), hy + n2y * (0.95 * thick), c_out)
    draw_line_px(layer, ex - n2x * (1.15 * thick), ey - n2y * (1.15 * thick), hx - n2x * (0.95 * thick), hy - n2y * (0.95 * thick), c_out)
    draw_line_px(layer, ex + n2x * (0.6 * thick), ey + n2y * (0.6 * thick), hx + n2x * (0.5 * thick), hy + n2y * (0.5 * thick), c_hi)
    draw_line_px(layer, ex - n2x * (0.6 * thick), ey - n2y * (0.6 * thick), hx - n2x * (0.5 * thick), hy - n2y * (0.5 * thick), c_dark)
    draw_line_px(layer, ex, ey, hx, hy, c_mid)

    # 3. Articulated Shoulder Pauldron rotating with the upper arm (only on lead near shoulder)
    if draw_pauldron and not is_rear:
        ux1, uy1 = u1x / d1, u1y / d1
        for p_step in (-1.4, -0.5, 0.5, 1.4):
            px_s = sx + ux1 * 1.0 + n1x * p_step
            py_s = sy + uy1 * 1.0 + n1y * p_step
            set_px(layer, px_s, py_s, c_gold if abs(p_step) > 1.0 else c_hi)
            set_px(layer, sx + n1x * p_step, sy + n1y * p_step, c_mid)
        set_px(layer, sx, sy - 1, c_gold)

    # 4. Golden Elbow Couter Joint at (ex, ey)
    set_px(layer, ex, ey, c_gold)
    set_px(layer, ex + n1x * 0.6, ey + n1y * 0.6, c_hi)

    # 5. Armored Gauntlet Fist at (hx, hy)
    set_px(layer, hx, hy, c_hi)
    set_px(layer, hx - (u2x / d2) * 0.9, hy - (u2y / d2) * 0.9, c_gold)
    set_px(layer, hx + n2x * 0.7, hy + n2y * 0.7, c_mid)
    set_px(layer, hx - n2x * 0.7, hy - n2y * 0.7, c_dark)


def draw_runeblade(
    canvas,
    hand_x,
    hand_y,
    angle_deg,
    glow_intensity=0.5,
    blade_len=21.5,
    shoulder=(26, 18),
    two_handed=True,
    draw_arm=True,
    slash_arc=None,
):
    """
    Renders Aethelgard's two-handed Greatsword (`Runeblade`) with an authentic long two-handed
    leather-wrapped hilt (`5.2px` from crossguard to heavy golden pommel) and TWO articulated
    2-Bone IK Gauntlet Arms gripping the hilt:
    - Lead Hand (`(hx, hy)`): Right gauntlet gripping directly below the winged crossguard (`lead_arm_layer`).
    - Rear Pommel Hand (`(pom_hx, pom_hy)`): Left gauntlet gripping the lower hilt above the golden pommel
      (`rear_arm_layer`, rendered behind the hilt and lead arm so both hands visibly lever the greatsword
      out in front of the torso without ever sitting on the chest plate!).
    """
    rear_arm_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    sword_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    lead_arm_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    fx_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    rad = math.radians(angle_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    px, py = -uy, ux

    hx = float(max(6.0, min(45.0, hand_x)))
    hy = float(max(6.0, min(47.0, hand_y)))

    # 1. Long Two-Handed Leather-Wrapped Greatsword Hilt & Heavy Golden Pommel behind lead hand
    hilt_len = 5.6 if two_handed else 3.0
    pom_x = max(2.5, min(48.5, hx - ux * hilt_len))
    pom_y = max(2.5, min(48.5, hy - uy * hilt_len))
    draw_line_px(sword_layer, pom_x, pom_y, hx, hy, LEATHER_DARK)
    draw_line_px(sword_layer, pom_x + px * 0.5, pom_y + py * 0.5, hx + px * 0.5, hy + py * 0.5, LEATHER_LIGHT)
    # Heavy Golden Counterweight Pommel (2x2 starlight-gold pommel cap)
    set_px(sword_layer, pom_x, pom_y, GOLD_BRIGHT)
    set_px(sword_layer, pom_x - ux * 0.7, pom_y - uy * 0.7, GOLD_WHITE)
    set_px(sword_layer, pom_x + px * 0.6, pom_y + py * 0.6, GOLD_MID)

    # Rear (Left) Hand Grip Position on the lower half of the greatsword hilt (3.6px behind lead hand, right above pommel)
    pom_hx = max(29.5, min(47.0, hx - ux * 3.6))
    pom_hy = max(6.0, min(47.0, hy - uy * 3.6))

    # 2. Guard Center & Broad Fullered Runeblade (auto-clamped to stay 100% inside [3..48])
    gx = hx + ux * 1.4
    gy = hy + uy * 1.4
    max_len = float(blade_len)
    if ux > 0.05:
        max_len = min(max_len, (47.5 - gx) / ux)
    elif ux < -0.05:
        max_len = min(max_len, (3.5 - gx) / ux)
    if uy > 0.05:
        max_len = min(max_len, (47.5 - gy) / uy)
    elif uy < -0.05:
        max_len = min(max_len, (3.5 - gy) / uy)
    eff_blade_len = max(7.5, max_len)

    steps = int(round(eff_blade_len * 2))
    for i in range(steps + 1):
        s = i / float(max(1, steps))
        dist = s * eff_blade_len
        bx = gx + ux * dist
        by = gy + uy * dist

        half_w = 1.35 * (1.0 - (s - 0.82) / 0.18) if s > 0.82 else 1.35

        if half_w >= 0.65:
            c_edge_top = FROST_BRIGHT if glow_intensity >= 0.45 else STEEL_BRIGHT
            c_edge_bot = FROST_MID if glow_intensity >= 0.35 else STEEL_MID
            set_px(sword_layer, bx + px * half_w, by + py * half_w, c_edge_top)
            set_px(sword_layer, bx - px * half_w, by - py * half_w, c_edge_bot)
            set_px(sword_layer, bx + px * (half_w * 0.5), by + py * (half_w * 0.5), FROST_CYAN)
            set_px(sword_layer, bx - px * (half_w * 0.5), by - py * (half_w * 0.5), FROST_MID)

        is_rune = (int(round(dist)) % 4 == 2) and (0.15 <= s <= 0.78)
        if is_rune and glow_intensity > 0.2:
            core_col = GOLD_WHITE if glow_intensity > 0.75 else (GOLD_BRIGHT if glow_intensity > 0.45 else FROST_WHITE)
        else:
            core_col = FROST_WHITE if glow_intensity > 0.6 else FROST_CORE
        set_px(sword_layer, bx, by, core_col)

    # 3. Ornate Winged Golden Valkyrie Crossguard (drawn over blade base)
    for span in (-3.0, -2.0, -1.0, 0.0, 1.0, 2.0, 3.0):
        wing_f = 0.5 if abs(span) > 1.8 else 0.0
        cx_g = max(2.0, min(49.0, gx + px * span + ux * wing_f))
        cy_g = max(2.0, min(49.0, gy + py * span + uy * wing_f))
        col_g = GOLD_WHITE if abs(span) < 0.5 else (GOLD_BRIGHT if abs(span) > 1.8 else GOLD_MID)
        set_px(sword_layer, cx_g, cy_g, col_g)
    set_px(sword_layer, gx, gy, FROST_CYAN if glow_intensity < 0.7 else FROST_WHITE)

    # 4. Two-Handed 2-Bone IK Sword-Arms (True 2-Shoulder Open V-Frame — Near Pauldron Arm + Far Shoulder Arm)
    if draw_arm and shoulder is not None:
        sx = max(5.0, min(45.0, float(shoulder[0])))
        sy = max(5.0, min(45.0, float(shoulder[1])))

        if two_handed:
            p1 = (hx, hy)
            p2 = (pom_hx, pom_hy)
            if p1[1] <= p2[1]:
                top_grip, bot_grip = p1, p2
            else:
                top_grip, bot_grip = p2, p1

            # Far / Upper Arm from Far Shoulder `(sx + 1.0, sy - 1.0)` arching UP/OUT (`bend_side=-1.0`) to `top_grip`
            sx_u = max(25.5, min(45.0, sx + 1.0))
            sy_u = max(5.0, min(45.0, sy - 1.0))
            ex_u, ey_u = solve_ik_elbow(sx_u, sy_u, top_grip[0], top_grip[1], l1=6.6, l2=6.4, bend_side=-1.0)
            draw_ik_armored_arm(
                rear_arm_layer, sx_u, sy_u, ex_u, ey_u, top_grip[0], top_grip[1], is_rear=True, draw_pauldron=False
            )

            # Near / Lower Arm from directly under Warrior's Silver Shoulder Pauldron `(20.5 + dx_off, sy + 0.6)`
            # reaching ACROSS his chest (`bend_side=+1.0`) to `bot_grip`!
            dx_off = sx - 26.0
            twist_dx = max(0.0, (bot_grip[0] - 28.5) * 0.38)
            sx_l = max(19.5, min(38.0, 20.5 + dx_off + twist_dx))
            sy_l = max(6.0, min(45.0, sy + 0.6))
            ex_l, ey_l = solve_ik_elbow(sx_l, sy_l, bot_grip[0], bot_grip[1], l1=7.4, l2=7.2, bend_side=1.0)
            draw_ik_armored_arm(
                lead_arm_layer, sx_l, sy_l, ex_l, ey_l, bot_grip[0], bot_grip[1], is_rear=False, draw_pauldron=False
            )

            # Render BOTH steel-and-gold gauntlets on top of the greatsword hilt so both hands are 100% visible!
            for gx_p, gy_p in (top_grip, bot_grip):
                set_px(lead_arm_layer, gx_p, gy_p, STEEL_BRIGHT)
                set_px(lead_arm_layer, gx_p + 1, gy_p, STEEL_LIGHT)
                set_px(lead_arm_layer, gx_p, gy_p + 1, GOLD_BRIGHT)
        else:
            ex, ey = solve_ik_elbow(sx, sy, hx, hy, l1=5.6, l2=5.6, bend_side=1.0)
            draw_ik_armored_arm(lead_arm_layer, sx, sy, ex, ey, hx, hy, is_rear=False, draw_pauldron=False)
    else:
        set_px(lead_arm_layer, hx, hy, STEEL_LIGHT)
        set_px(lead_arm_layer, hx - px * 0.8, hy - py * 0.8, STEEL_MID)

    # 5. High-Intensity Rune Charge Star / Glint
    if glow_intensity >= 0.75:
        tip_x = max(3.0, min(48.0, gx + ux * (eff_blade_len * 0.88)))
        tip_y = max(3.0, min(48.0, gy + uy * (eff_blade_len * 0.88)))
        set_px(fx_layer, tip_x, tip_y, FROST_WHITE)
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            set_px(fx_layer, tip_x + dx, tip_y + dy, GOLD_BRIGHT if glow_intensity >= 0.9 else FROST_BRIGHT)

    # 6. Optional Dynamic Crescent Slash Trail (clamped smoothly inside [2..49])
    if slash_arc is not None and shoulder is not None:
        a_start, a_end, arc_r, arc_intensity = slash_arc
        arc_steps = 36
        for k in range(arc_steps + 1):
            u_a = k / float(arc_steps)
            ang = math.radians(a_start + (a_end - a_start) * u_a)
            ca, sa = math.cos(ang), math.sin(ang)
            env = math.sin(u_a * math.pi) * arc_intensity
            if env <= 0.1:
                continue
            r_eff = float(arc_r)
            if ca > 0.05:
                r_eff = min(r_eff, (48.0 - shoulder[0]) / ca)
            elif ca < -0.05:
                r_eff = min(r_eff, (3.0 - shoulder[0]) / ca)
            if sa > 0.05:
                r_eff = min(r_eff, (48.0 - shoulder[1]) / sa)
            elif sa < -0.05:
                r_eff = min(r_eff, (3.0 - shoulder[1]) / sa)
            r_eff = max(6.0, r_eff)
            ax = shoulder[0] + ca * r_eff
            ay = shoulder[1] + sa * r_eff
            set_px(fx_layer, ax, ay, FROST_WHITE if u_a > 0.65 else GOLD_BRIGHT)
            set_px(fx_layer, ax - ca * 1.2, ay - sa * 1.2, FROST_BRIGHT)
            if env > 0.45:
                set_px(fx_layer, ax - ca * 2.4, ay - sa * 2.4, FROST_CYAN)
                set_px(fx_layer, ax - ca * 3.4, ay - sa * 3.4, FROST_MID)

    out = composite_over(canvas, rear_arm_layer)
    out = composite_over(out, sword_layer)
    out = composite_over(out, lead_arm_layer)
    out = composite_over(out, fx_layer)
    return out


def draw_valkyrie_aura_wings(canvas, shoulder=(24, 17), wing_span=1.0, phase=0.0):
    """
    Renders grand, sweeping Golden-Cyan Valkyrie Aura Wings behind Aethelgard during Ultimate Dragon-Vault & Plunge.
    """
    if wing_span <= 0.05:
        return canvas
    wing_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    sx, sy = shoulder
    for side, base_x, ang_list in [
        (-1, sx - 3, [-162.0, -148.0, -134.0, -120.0, -106.0, -92.0, -78.0]),
        (+1, sx + 3, [-68.0, -54.0, -40.0, -26.0]),
    ]:
        for idx, deg0 in enumerate(ang_list):
            ang = math.radians(deg0 + math.sin(phase + idx * 0.5) * 3.5)
            ca, sa = math.cos(ang), math.sin(ang)
            max_len = (14.5 - idx * 1.2) if side == -1 else (10.5 - idx * 1.3)
            f_len = float(max_len * wing_span)
            if ca < -0.05:
                f_len = min(f_len, (2.5 - base_x) / ca)
            elif ca > 0.05:
                f_len = min(f_len, (48.5 - base_x) / ca)
            if sa < -0.05:
                f_len = min(f_len, (2.5 - sy) / sa)
            f_len_i = max(2, int(round(f_len)))
            for d in range(2, f_len_i + 1):
                wx = base_x + ca * d
                wy = sy + sa * d
                if d >= f_len_i - 1:
                    col = FROST_WHITE
                elif idx % 2 == 0:
                    col = GOLD_BRIGHT if d < f_len_i * 0.65 else FROST_BRIGHT
                else:
                    col = FROST_CYAN if d < f_len_i * 0.65 else FROST_MID
                set_px(wing_layer, wx, wy, col)
                if d < f_len_i - 2:
                    set_px(wing_layer, wx, wy + 1, GOLD_MID if idx % 2 == 0 else FROST_DEEP)
    return composite_over(wing_layer, canvas)


def draw_aegis_greatshield(canvas, cx, cy, glow=0.5):
    """
    Renders Aethelgard's ornate Frost-Gold Valkyrie Aegis Greatshield on his left arm during CROUCH.
    """
    sh = np.zeros((52, 52, 4), dtype=np.uint8)
    for dy in range(-8, 9):
        half_w = 4 if abs(dy) <= 4 else (3 if abs(dy) <= 6 else 2)
        for dx in range(-half_w, half_w + 1):
            px_x = cx + dx
            px_y = cy + dy
            if abs(dx) == half_w or abs(dy) == 8:
                col = GOLD_WHITE if (glow > 0.7 and dy < 0) else GOLD_BRIGHT
            elif abs(dx) == half_w - 1:
                col = GOLD_MID
            elif dx == 0 or dy == 0:
                col = FROST_WHITE if glow > 0.6 else GOLD_BRIGHT
            else:
                col = FROST_BRIGHT if (glow > 0.5 and abs(dx) + abs(dy) <= 3) else CAPE_ROYAL_MID
            set_px(sh, px_x, px_y, col)

    if glow > 0.55:
        for dy in range(-9, 10):
            bx = cx + 5 - (dy * dy) // 22
            if abs(dy) % 2 == 0 or glow > 0.8:
                set_px(sh, bx, cy + dy, FROST_WHITE if abs(dy) <= 3 else FROST_BRIGHT)
                if glow > 0.75:
                    set_px(sh, bx + 1, cy + dy, FROST_CYAN)

    return composite_over(canvas, sh)


def render_walk_legs(tpl, f):
    """
    Renders a grounded, heavy-armored 30-frame 2-step Valkyrie walk cycle (f = 0..29) in true painter's order
    with ZERO standing thigh remnants (no extra legs!) and full flowing cape.
    """
    phase = (f / 30.0) * 2.0 * math.pi
    bob_y = int(round(math.cos(phase * 2.0) * 1.0))

    stand = tpl['stand'].copy()
    cape_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    # 1. Extract Flowing Royal Cape (x <= 19 for y < 35, x <= 14 for y >= 35, shading any leg steel at y >= 32 into royal cape)
    for y in range(13, 44):
        ny = y + bob_y
        if not (2 <= ny < 50):
            continue
        u = (y - 13) / 30.0
        wave_dx = int(round(-u * 1.4 + math.sin(phase - u * 3.0) * (1.0 * u)))
        wave_dy = int(round(math.cos(phase - u * 2.4) * (0.4 * u)))
        max_cx = 19 if y < 35 else 14
        for x in range(1, max_cx + 1):
            if stand[y, x, 3] == 0:
                continue
            px_c = stand[y, x].copy()
            if y >= 32 and x >= 12 and (int(px_c[0]) > 90 or int(px_c[1]) > 90):
                px_c = np.array(CAPE_ROYAL_DARK, dtype=np.uint8)
            cy = max(13, min(48, ny + wave_dy))
            cx = max(2, min(20, x + wave_dx))
            cape_layer[cy, cx] = px_c
            if x >= max_cx - 4 and y <= 36:
                cape_layer[ny, x] = px_c
    cape_layer = fill_layer_pinholes(cape_layer, x0=2, x1=21, y0=12, y1=48, require_3_neighbors=False)

    # 2. Extract Upper Torso, Pauldron, Winged Helm, Waist Belt & Tassets (y = 0..33)
    for y in range(0, 34):
        ny = y + bob_y
        if not (2 <= ny < 50):
            continue
        lean_dx = 1 if y <= 26 else 0
        min_tx = 15 if y < 29 else 18
        max_tx = 31 if y < 29 else 30
        for x in range(min_tx, max_tx):
            if stand[y, x, 3] > 0:
                torso_layer[ny, min(49, x + lean_dx)] = stand[y, x]

    hip_x = 24.0
    hip_y = 31.0 + bob_y

    def build_armored_leg(boot_patch, orig_cx, swing_phase, is_far_leg=False):
        layer = np.zeros((52, 52, 4), dtype=np.uint8)
        s_val = math.sin(swing_phase)
        c_val = math.cos(swing_phase)

        knee_lift = max(0.0, c_val)
        knee_x = hip_x + s_val * 4.2 + knee_lift * 1.8
        knee_y = hip_y + 5.5 - knee_lift * 1.8

        foot_target_x = 24.0 + s_val * 6.0 - knee_lift * 1.5
        foot_lift_dy = bob_y - int(round(knee_lift * 2.2))

        boot_rot_deg = s_val * 15.0 - knee_lift * 16.0
        pil_boot = Image.fromarray(boot_patch, mode='RGBA')
        rot_boot = np.array(
            pil_boot.rotate(boot_rot_deg, resample=Image.NEAREST, center=(orig_cx, 43.0)),
            dtype=np.uint8
        )

        dx_boot = int(round(foot_target_x - orig_cx))
        for y in range(38, 52):
            for x in range(3, 50):
                if rot_boot[y, x, 3] > 0:
                    ny = min(49, max(37, y + foot_lift_dy))
                    nx = min(49, max(4, x + dx_boot))
                    px_col = rot_boot[y, x].copy()
                    if is_far_leg:
                        px_col[0] = int(px_col[0] * 0.76)
                        px_col[1] = int(px_col[1] * 0.76)
                        px_col[2] = int(px_col[2] * 0.82)
                    layer[ny, nx] = px_col

        ank_x = foot_target_x + math.sin(math.radians(boot_rot_deg)) * 1.2
        ank_y = 42.0 + foot_lift_dy

        if is_far_leg:
            c_dark, c_mid, c_hi, c_gold = STEEL_DEEP, STEEL_DARK, STEEL_MID, GOLD_DARK
        else:
            c_dark, c_mid, c_hi, c_gold = STEEL_DARK, STEEL_MID, STEEL_LIGHT, GOLD_BRIGHT

        # Sculpted Plate Thigh Cuisse (Hip -> Knee)
        for off_x, col in [(-2.0, c_dark), (-1.0, c_mid), (0.0, c_hi), (1.0, c_mid), (2.0, c_dark)]:
            draw_line_px(layer, hip_x + off_x, hip_y, knee_x + off_x * 0.85, knee_y, col)

        # Sculpted Steel Shin Greave (Knee -> Sabaton Boot)
        for off_x, col in [(-1.5, c_dark), (-0.5, c_mid), (0.5, c_hi), (1.5, c_dark)]:
            draw_line_px(layer, knee_x + off_x, knee_y, ank_x + off_x * 0.85, ank_y, col)

        # Winged Golden Knee-Guard Poleyn
        set_px(layer, knee_x, knee_y, c_gold)
        set_px(layer, knee_x + 1, knee_y, c_gold)
        set_px(layer, knee_x, knee_y - 1, c_hi)
        return fill_layer_pinholes(layer, x0=3, x1=49, y0=30, y1=50, require_3_neighbors=True)

    far_leg = build_armored_leg(tpl['leg_back'], 13.5, phase + math.pi, is_far_leg=True)
    near_leg = build_armored_leg(tpl['leg_front'], 29.5, phase, is_far_leg=False)

    # Royal Blue & Gold Split Tabard swinging between the legs at y = 31..38
    tabard_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    flap_dx = math.sin(phase) * 1.8
    for off_x, col in [
        (-2.0, CAPE_ROYAL_DARK),
        (-1.0, CAPE_ROYAL_MID),
        (0.0, CAPE_ROYAL_HI),
        (1.0, GOLD_MID),
    ]:
        draw_line_px(
            tabard_layer,
            hip_x + off_x,
            hip_y - 1.0,
            hip_x + off_x + flap_dx,
            hip_y + 6.0,
            col
        )

    out = composite_over(far_leg, cape_layer)
    out = composite_over(out, torso_layer)
    out = composite_over(out, tabard_layer)
    out = composite_over(out, near_leg)
    return out


def make_crouch_body(tpl, crouch_depth):
    """
    Constructs a seamless, continuous knee-bend crouched Valkyrie body from `tpl['stand']`
    with `crouch_depth` in [1..6] logical pixels:
    - Shifts upper torso, helm, and cape (ny <= 27 + d) down by `d` with a subtle 1px forward athletic lean.
    - Compresses the armored thighs and knees (ny = 28 + d .. 42) via inverse-mapped vertical warp with a forward knee bend.
    - Keeps sabatons anchored cleanly at the ground line (ny = 43..49).
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
                    if x >= 22:
                        dx = int(round(knee_bend))
                    elif x <= 15:
                        dx = -int(round(knee_bend * 0.35))
                    else:
                        dx = 0
                    canvas[ny, max(2, min(49, x + dx))] = stand[sy, x]
        else:
            for x in range(1, 50):
                if stand[ny, x, 3] > 0:
                    canvas[ny, x] = stand[ny, x]

    return fill_layer_pinholes(add_outline_to_layer(canvas), 2, 50, 2, 50, require_3_neighbors=False)


def make_jump_body(tpl, jump_dy, tuck_amount, torso_lean_dx=0):
    """
    Constructs a clean, full-body aerial jumping Valkyrie pose in back-to-front anatomical order
    with full royal cape and waist tassets.
    """
    stand = tpl['stand'].copy()
    torso_dy = max(-2, min(4, int(round(jump_dy))))

    cape_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    # 1. Billowing Aerial Royal Cape (x <= 19 for y < 35, x <= 14 for y >= 35, shading any leg steel into royal cape)
    cape_lift = int(round(max(0.0, tuck_amount) * 1.8))
    for y in range(13, 44):
        max_cx = 19 if y < 35 else 14
        for x in range(1, max_cx + 1):
            if stand[y, x, 3] == 0:
                continue
            px_c = stand[y, x].copy()
            if y >= 32 and x >= 12 and (int(px_c[0]) > 90 or int(px_c[1]) > 90):
                px_c = np.array(CAPE_ROYAL_DARK, dtype=np.uint8)
            u = (y - 13) / 30.0
            cx = max(2, min(20, x - int(round(u * 1.8 * max(0.2, tuck_amount)))))
            cy = max(8, min(48, y + torso_dy + int(round(u * cape_lift))))
            cape_layer[cy, cx] = px_c
            if x >= max_cx - 4 and y <= 35:
                ny_b = max(4, min(48, y + torso_dy))
                cape_layer[ny_b, x] = px_c
    cape_layer = fill_layer_pinholes(cape_layer, x0=2, x1=21, y0=8, y1=49, require_3_neighbors=False)

    # 2. Upper Torso, Winged Helm, Belt & Tassets (y = 0..33)
    for y in range(0, 34):
        ny = max(2, min(49, y + torso_dy))
        dx = torso_lean_dx if y <= 24 else 0
        min_tx = 15 if y < 29 else 18
        max_tx = 31 if y < 29 else 30
        for x in range(min_tx, max_tx):
            if stand[y, x, 3] > 0:
                torso_layer[ny, max(2, min(49, x + dx))] = stand[y, x]

    hip_x = 24.0 + (torso_lean_dx * 0.5)
    hip_y = 31.0 + torso_dy

    def build_aerial_armored_leg(boot_patch, orig_cx, knee_dx, knee_dy, foot_dx, foot_dy, boot_rot_deg, is_far_leg=False):
        layer = np.zeros((52, 52, 4), dtype=np.uint8)
        pil_boot = Image.fromarray(boot_patch, mode='RGBA')
        rot_boot = np.array(
            pil_boot.rotate(boot_rot_deg, resample=Image.NEAREST, center=(orig_cx, 43.0)),
            dtype=np.uint8
        )
        for y in range(38, 52):
            for x in range(3, 50):
                if rot_boot[y, x, 3] > 0:
                    ny = max(24, min(48, y + int(round(foot_dy))))
                    nx = max(3, min(48, x + int(round(foot_dx))))
                    px_col = rot_boot[y, x].copy()
                    if is_far_leg:
                        px_col[0] = int(px_col[0] * 0.76)
                        px_col[1] = int(px_col[1] * 0.76)
                        px_col[2] = int(px_col[2] * 0.82)
                    layer[ny, nx] = px_col

        kx = hip_x + knee_dx
        ky = hip_y + knee_dy
        ax = orig_cx + foot_dx
        ay = 42.0 + foot_dy

        if is_far_leg:
            c_dark, c_mid, c_hi, c_gold = STEEL_DEEP, STEEL_DARK, STEEL_MID, GOLD_DARK
        else:
            c_dark, c_mid, c_hi, c_gold = STEEL_DARK, STEEL_MID, STEEL_LIGHT, GOLD_BRIGHT

        for off_x, col in [(-1.8, c_dark), (-0.8, c_mid), (0.2, c_hi), (1.2, c_mid), (2.0, c_dark)]:
            draw_line_px(layer, hip_x + off_x, hip_y, kx + off_x * 0.85, ky, col)
        for off_x, col in [(-1.4, c_dark), (-0.4, c_mid), (0.6, c_hi), (1.4, c_dark)]:
            draw_line_px(layer, kx + off_x, ky, ax + off_x * 0.85, ay, col)
        set_px(layer, kx, ky, c_gold)
        set_px(layer, kx + 1, ky, c_gold)
        return fill_layer_pinholes(layer, x0=3, x1=49, y0=24, y1=49, require_3_neighbors=True)

    t = max(0.0, tuck_amount)
    far_leg = build_aerial_armored_leg(
        tpl['leg_back'],
        13.5,
        knee_dx=-2.8 * t - 1.5,
        knee_dy=4.5 - 1.5 * t,
        foot_dx=-2.0 * t,
        foot_dy=torso_dy - 3.5 * t,
        boot_rot_deg=-22.0 * t,
        is_far_leg=True
    )
    near_leg = build_aerial_armored_leg(
        tpl['leg_front'],
        29.5,
        knee_dx=4.5 * t + 1.5,
        knee_dy=3.5 - 2.4 * t,
        foot_dx=1.5 * t,
        foot_dy=torso_dy - 4.5 * t,
        boot_rot_deg=-24.0 * t,
        is_far_leg=False
    )

    tabard_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    for off_x, col in [(-2.0, CAPE_ROYAL_DARK), (-1.0, CAPE_ROYAL_MID), (0.0, CAPE_ROYAL_HI), (1.0, GOLD_MID)]:
        draw_line_px(tabard_layer, hip_x + off_x, hip_y - 1, hip_x + off_x + 1.5 * t, hip_y + 5.5 - 1.0 * t, col)

    out = composite_over(far_leg, cape_layer)
    out = composite_over(out, torso_layer)
    out = composite_over(out, tabard_layer)
    out = composite_over(out, near_leg)
    return out


def build_row0_idle(tpl):
    """
    Row 0 (`IDLE`, 30 frames):
    - Authentic HEMA Two-Handed *Halb-Vom-Tag / Pflug* Greatsword Guard:
      Lead right gauntlet at `(35, 20)` beneath the crossguard, rear left gauntlet at `(32.8, 22.4)` on the lower
      leather-wrapped grip above the golden counterweight pommel — both hands & IK arms cleanly in front of the torso!
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        base = tpl['stand'].copy()

        breath_dy = -1 if 8 <= f <= 19 else 0
        if breath_dy != 0:
            upper = base[3:29, 17:31].copy()
            base[3:28, 17:31] = 0
            base[3 + breath_dy:29 + breath_dy, 17:31] = upper
            base[28, 17:31] = upper[-1, :]
            base = add_outline_to_layer(base)

        plume_dx = 1 if 12 <= f <= 22 else 0
        if plume_dx != 0:
            set_px(base, 21, 5 + breath_dy, GOLD_BRIGHT)
            set_px(base, 28, 6 + breath_dy, GOLD_BRIGHT)
        elif f % 6 in (1, 2):
            set_px(base, 22, 5 + breath_dy, GOLD_WHITE)

        base = apply_cape_wave(base, phase, amplitude=1.4, vertical_flutter=0.5)

        blade_ang = -48.0 + math.sin(phase) * 4.5
        hx = 35 + int(round(math.sin(phase) * 1.0))
        hy = 20 + breath_dy + int(round(math.cos(phase) * 0.8))
        frame = draw_runeblade(
            base,
            hand_x=hx,
            hand_y=hy,
            angle_deg=blade_ang,
            glow_intensity=0.45 + 0.25 * math.sin(phase),
            blade_len=18.5,
            shoulder=(26, 17 + breath_dy),
            two_handed=True
        )

        glint_u = (f / 29.0)
        glint_dist = 2.5 + (glint_u * 14.0 if f < 15 else (1.0 - (f - 15) / 14.0) * 14.0)
        rad = math.radians(blade_ang)
        gx = min(48, max(3, hx + math.cos(rad) * (1.4 + glint_dist)))
        gy = min(48, max(3, hy + math.sin(rad) * (1.4 + glint_dist)))
        set_px(frame, gx, gy, FROST_WHITE)
        set_px(frame, gx + 1, gy, GOLD_BRIGHT)
        set_px(frame, gx, gy - 1, FROST_BRIGHT)

        frames.append(ensure_safe_cell(frame))
    return frames


def build_row1_walk(tpl):
    """
    Row 1 (`WALK`, 30 frames):
    - Grounded 2-leg armored stride carrying the Runeblade in a balanced two-handed greatsword guard (`hx = 34..36`).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        body = render_walk_legs(tpl, f)
        bob_y = int(round(math.cos(phase * 2.0) * 1.0))

        swing = math.sin(phase)
        blade_ang = -46.0 + swing * 12.0
        hx = 35 - int(round(swing * 1.2))
        hy = 20 + bob_y + int(round(abs(swing) * 1.0))

        frame = draw_runeblade(
            body,
            hand_x=hx,
            hand_y=hy,
            angle_deg=blade_ang,
            glow_intensity=0.5,
            blade_len=18.0,
            shoulder=(26, 17 + bob_y),
            two_handed=True
        )
        frames.append(ensure_safe_cell(frame))
    return frames


def build_row2_auto_attack(tpl):
    """
    Row 2 (`AUTO_ATTACK`, 30 frames — HEMA High *Vom Tag* Roof Guard into Two-Handed *Zornhau* Lever Cleave):
    - F00..F09: Raises both hands into High *Vom Tag* (Roof Guard) above/in front of the shoulder (`hx=35->32, hy=20->11, ang=-48->-106`)
    - F10..F18: Explosive Two-Handed *Zornhau* (Wrath Strike) where the lead hand casts forward as the fulcrum
      (`hx=34->38->34, hy=13->19->24`) while the rear hand pulls the pommel to lever the blade through `-106 -> +48 deg`!
    - F19..F29: Smooth two-handed recovery back to forward *Halb-Vom-Tag* guard (`hx=35, hy=20`)
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi

        if f <= 9:
            u = f / 9.0
            base = tpl['stand'].copy()
            coil_dx = -1 if f >= 4 else 0
            if coil_dx != 0:
                base = np.roll(base, coil_dx, axis=1)
                base[:, -1:] = 0
            base = apply_cape_wave(base, phase, amplitude=1.4 + u * 0.4, vertical_flutter=0.5)

            ang = -48.0 * (1.0 - u) + (-106.0) * u
            hx = int(round(35 * (1.0 - u) + 32 * u))
            hy = int(round(20 * (1.0 - u) + 11 * u))
            glow = 0.45 + u * 0.55
            frame = draw_runeblade(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=glow,
                blade_len=18.0,
                shoulder=(26 + coil_dx, 17),
                two_handed=True
            )
            frames.append(ensure_safe_cell(frame))

        elif f <= 18:
            k = f - 10
            base = (tpl['lunge'] if k >= 1 else tpl['stand']).copy()
            if k in (2, 3, 4):
                base = np.roll(base, 1, axis=1)
                base[:, 0:1] = 0
            base = apply_cape_wave(base, phase * 2.0, amplitude=1.8, vertical_flutter=0.8)

            ang_seq = [-68.0, -24.0, +12.0, +34.0, +46.0, +48.0, +45.0, +38.0, +30.0]
            hx_seq = [34, 36, 38, 38, 37, 36, 35, 34, 34]
            hy_seq = [13, 16, 19, 22, 24, 25, 25, 24, 23]
            slash_arc = None
            if k <= 5:
                arc_int = [0.75, 1.0, 1.0, 0.9, 0.65, 0.4][k]
                a0 = [-104.0, -88.0, -60.0, -30.0, -5.0, 8.0][k]
                a1 = ang_seq[k] + 8.0
                slash_arc = (a0, a1, 19.0, arc_int)

            frame = draw_runeblade(
                base,
                hand_x=hx_seq[k],
                hand_y=hy_seq[k],
                angle_deg=ang_seq[k],
                glow_intensity=1.0 if k <= 4 else 0.7,
                blade_len=18.0,
                shoulder=(27, 17),
                two_handed=True,
                slash_arc=slash_arc
            )
            frames.append(ensure_safe_cell(frame))

        else:
            u = (f - 18) / 11.0
            base = (tpl['lunge'] if f <= 21 else tpl['stand']).copy()
            base = apply_cape_wave(base, phase, amplitude=1.4, vertical_flutter=0.5)
            ang = 30.0 * (1.0 - u) + (-48.0) * u
            hx = int(round(34 * (1.0 - u) + 35 * u))
            hy = int(round(23 * (1.0 - u) + 20 * u))
            frame = draw_runeblade(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=0.65 - u * 0.2,
                blade_len=18.5,
                shoulder=(26, 17),
                two_handed=True
            )
            frames.append(ensure_safe_cell(frame))

    return frames


def render_whirlwind_spin_frame(tpl, f):
    """
    Phase 1 of Row 3 (`F00..F16`): 2-turn high-speed 360-degree Valkyrie Whirlwind spin!
    Alternates Front/Right/Back/Left armored silhouettes with a full 360-degree Frost-Gold Runeblade cyclone ring
    and orbiting 2-joint IK sword-arms.
    """
    u = f / 16.0
    spin_rad = u * 4.0 * math.pi  # 2 complete 360-degree rotations across F00..F16
    cos_s = math.cos(spin_rad)
    sin_s = math.sin(spin_rad)

    base = tpl['stand'].copy()
    if sin_s < -0.25:
        # Back-facing half of spin: flip horizontally and shade face/visor as back of winged helm!
        base = np.fliplr(base).copy()
        for y in range(7, 13):
            for x in range(22, 30):
                if base[y, x, 3] > 0:
                    base[y, x] = STEEL_MID if (x + y) % 2 == 0 else STEEL_DARK
    else:
        base = apply_cape_wave(base, spin_rad, amplitude=1.8, vertical_flutter=0.7)

    # 3D Perspective Horizontal Cyclone Ring (Back half behind torso, Front half in front of torso)
    back_ring = np.zeros((52, 52, 4), dtype=np.uint8)
    front_ring = np.zeros((52, 52, 4), dtype=np.uint8)
    cx, cy = 26.0, 24.0
    rx, ry = 20.5, 6.0

    for s_idx in range(48):
        a = (s_idx / 48.0) * 2.0 * math.pi + spin_rad
        ca, sa = math.cos(a), math.sin(a)
        px_x = cx + ca * rx
        px_y = cy + sa * ry
        trail_t = ((a - spin_rad) % (2.0 * math.pi)) / (2.0 * math.pi)
        col = FROST_WHITE if trail_t > 0.78 else (GOLD_BRIGHT if trail_t > 0.55 else (FROST_BRIGHT if trail_t > 0.25 else FROST_CYAN))
        target = front_ring if sa >= 0 else back_ring
        set_px(target, px_x, px_y, col)
        set_px(target, px_x - ca * 1.5, px_y - sa * 0.6, FROST_CYAN if trail_t > 0.4 else FROST_MID)
        if trail_t > 0.6:
            set_px(target, px_x - ca * 2.8, px_y - sa * 1.0, GOLD_MID)

    # 3D Perspective Horizontal Runeblade sweeping 360 deg in the plane of the cyclone ring
    if cos_s >= 0:
        blade_ang_deg = sin_s * 14.0
    else:
        blade_ang_deg = 180.0 - sin_s * 14.0
    persp_len = 8.5 + 10.5 * abs(cos_s)
    hx = int(round(26 + cos_s * 6.5))
    hy = int(round(22 + sin_s * 2.5))

    if sin_s < 0:
        sword_canvas = draw_runeblade(
            back_ring,
            hand_x=hx,
            hand_y=hy,
            angle_deg=blade_ang_deg,
            glow_intensity=0.9,
            blade_len=persp_len,
            shoulder=(25, 18),
            two_handed=False
        )
        out = composite_over(sword_canvas, base)
        out = composite_over(out, front_ring)
    else:
        out = composite_over(back_ring, base)
        out = draw_runeblade(
            out,
            hand_x=hx,
            hand_y=hy,
            angle_deg=blade_ang_deg,
            glow_intensity=1.0,
            blade_len=persp_len,
            shoulder=(25, 18),
            two_handed=True
        )
        out = composite_over(out, front_ring)
    return ensure_safe_cell(out)


def build_row3_skill(tpl):
    """
    Row 3 (`SKILL` - Valkyrie Whirlwind + Thunder-Slam, 30 frames):
    - Phase 1 (F00..F16): 2-turn high-speed 360-degree Valkyrie Whirlwind spin with sweeping frost-gold cyclone rings
    - Phase 2 (F17..F29): High-altitude leap windup (F17..F21) into two-handed overhead Thunder-Slam (F22..F29)
      driving the Runeblade into the earth with golden lightning sparks.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 16:
            frames.append(render_whirlwind_spin_frame(tpl, f))
        elif f <= 21:
            # F17..F21: High-altitude athletic leap windup with two-handed overhead Runeblade & lightning charge
            k = f - 17
            u = k / 4.0
            jump_dy = [-1, -2, -2, -2, -1][k]
            tuck = [0.4, 0.75, 0.95, 0.9, 0.65][k]
            body = make_jump_body(tpl, jump_dy, tuck_amount=tuck, torso_lean_dx=-1 if k <= 2 else 1)
            body = apply_cape_wave(body, phase * 2.0, amplitude=1.8, vertical_flutter=0.8)

            ang = -98.0 + u * 28.0
            hx = 32 + int(round(u * 2))
            hy = 12 + jump_dy
            frame = draw_runeblade(
                body,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.0,
                blade_len=18.5,
                shoulder=(26, 17 + jump_dy),
                two_handed=True
            )
            frames.append(ensure_safe_cell(frame))
        else:
            # F22..F29: Two-handed overhead Thunder-Slam driving the Runeblade into the earth with golden lightning sparks
            k = f - 22
            crouch_d = [2, 5, 6, 5, 4, 3, 1, 0][k]
            body = tpl['stand'].copy() if crouch_d == 0 else make_crouch_body(tpl, crouch_d)
            body = apply_cape_wave(body, phase * 2.0, amplitude=1.6, vertical_flutter=0.6)

            ang_seq = [18.0, 52.0, 58.0, 56.0, 48.0, 24.0, -12.0, -48.0]
            hx_seq = [36, 36, 35, 35, 35, 35, 35, 35]
            hy_seq = [19, 27, 29, 29, 27, 25, 22, 20]
            slash_arc = (-95.0, 54.0, 19.0, 1.0 if k == 0 else 0.7) if k <= 1 else None

            frame = draw_runeblade(
                body,
                hand_x=hx_seq[k],
                hand_y=hy_seq[k],
                angle_deg=ang_seq[k],
                glow_intensity=1.0 if k <= 4 else 0.6,
                blade_len=18.5,
                shoulder=(26, 17 + crouch_d),
                two_handed=True,
                slash_arc=slash_arc
            )

            # Erupting golden-cyan ground lightning sparks at impact point (F22..F26)
            if k <= 4:
                ix, iy = 44, 47
                for bolt in range(3):
                    bx0 = ix - 4 + bolt * 3
                    draw_line_px(frame, bx0, iy, bx0 + (bolt - 1) * 3, iy - 6 - (k % 3) * 2, GOLD_BRIGHT if bolt == 1 else FROST_BRIGHT)
                    set_px(frame, bx0, iy - 1, FROST_WHITE)

            frames.append(ensure_safe_cell(frame))

    return frames


def build_row4_ultimate(tpl):
    """
    Row 4 (`ULTIMATE` - Heavenly Earthshatter / Omnislash + Dragon Vault + Plunge, 30 frames):
    - Stage 1 (F00..F12): Rapid omnislash dash strikes (low forward blitz F00..F04, upward cross-cleave F05..F08, spinning reverse slash F09..F12)
    - Stage 2 (F13..F20): Ascending Dragon-Vault skyward uppercut with blazing golden-cyan Valkyrie aura wings
    - Stage 3 (F21..F29): Inverted two-handed meteoric Runeblade plunge (F21..F26) and heroic ground impact stance (F27..F29)
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi

        if f <= 4:
            # Stage 1A (F00..F04): Low forward omnislash blitz strike with dynamic arm extension
            u = f / 4.0
            body = tpl['dash'].copy()
            body = apply_cape_wave(body, phase * 3.0, amplitude=1.6, is_dash=True)
            ang = -18.0 + u * 34.0
            hx = int(round(33 + u * 4))
            hy = int(round(20 + u * 4))
            slash_arc = (-45.0, ang + 10.0, 19.0, 0.9) if f >= 1 else None
            frame = draw_runeblade(
                body,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=0.95,
                blade_len=18.0,
                shoulder=(26, 17),
                two_handed=True,
                slash_arc=slash_arc
            )
            frames.append(ensure_safe_cell(frame))

        elif f <= 8:
            # Stage 1B (F05..F08): Upward diagonal cross-cleave with arms sweeping from low-front to high-overhead
            k = f - 5
            u = k / 3.0
            body = tpl['lunge'].copy()
            body = apply_cape_wave(body, phase * 3.0, amplitude=1.8, vertical_flutter=0.8)
            ang = 32.0 * (1.0 - u) + (-68.0) * u
            hx = int(round(36 * (1.0 - u) + 32 * u))
            hy = int(round(25 * (1.0 - u) + 13 * u))
            slash_arc = (38.0, ang - 8.0, 19.0, 0.95)
            frame = draw_runeblade(
                body,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.0,
                blade_len=18.5,
                shoulder=(26, 17),
                two_handed=True,
                slash_arc=slash_arc
            )
            frames.append(ensure_safe_cell(frame))

        elif f <= 12:
            # Stage 1C (F09..F12): Spinning reverse whirl-slash with full arm follow-through
            k = f - 9
            u = k / 3.0
            body = tpl['stand'].copy()
            body = apply_cape_wave(body, phase * 3.0, amplitude=1.8, vertical_flutter=0.8)
            ang = -80.0 * (1.0 - u) + 28.0 * u
            hx = int(round(32 * (1.0 - u) + 36 * u))
            hy = int(round(13 * (1.0 - u) + 23 * u))
            slash_arc = (-95.0, ang + 10.0, 19.0, 0.95)
            frame = draw_runeblade(
                body,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.0,
                blade_len=18.5,
                shoulder=(26, 17),
                two_handed=True,
                slash_arc=slash_arc
            )
            frames.append(ensure_safe_cell(frame))

        elif f <= 20:
            # Stage 2 (F13..F20): Ascending Dragon-Vault skyward uppercut with blazing Golden-Cyan Valkyrie Aura Wings!
            k = f - 13
            u = k / 7.0
            jump_dy = int(round(-1 - math.sin(u * math.pi * 0.8) * 1))
            tuck = 0.55 + 0.4 * math.sin(u * math.pi * 0.85)
            body = make_jump_body(tpl, jump_dy, tuck_amount=tuck, torso_lean_dx=1)
            body = apply_cape_wave(body, phase * 3.0, amplitude=1.8, vertical_flutter=0.8)
            body = draw_valkyrie_aura_wings(body, shoulder=(23, 17 + jump_dy), wing_span=0.65 + 0.35 * math.sin(u * math.pi * 0.8), phase=phase * 2.0)

            ang = -45.0 - u * 35.0
            hx = int(round(35 - u * 3))
            hy = int(round(20 - u * 7)) + jump_dy
            frame = draw_runeblade(
                body,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.0,
                blade_len=18.5,
                shoulder=(26, 17 + jump_dy),
                two_handed=True,
                slash_arc=(15.0, ang, 18.5, 0.85) if k <= 3 else None
            )
            frames.append(ensure_safe_cell(frame))

        elif f <= 26:
            # Stage 3A (F21..F26): Inverted two-handed meteoric Runeblade plunge!
            k = f - 21
            u = k / 5.0
            jump_dy = int(round(-2 + u * 2))
            body = make_jump_body(tpl, jump_dy, tuck_amount=0.85 - u * 0.4, torso_lean_dx=2)
            body = apply_cape_wave(body, phase * 3.0, amplitude=1.8, vertical_flutter=0.8)
            body = draw_valkyrie_aura_wings(body, shoulder=(24, 16 + jump_dy), wing_span=1.0 - u * 0.2, phase=phase * 2.0)

            # Runeblade held two-handed point-down (+76..+86 deg) plunging toward earth as arms drive downward
            ang = 76.0 + u * 10.0
            hx = int(round(33 + u * 3))
            hy = int(round(17 + u * 7)) + jump_dy
            frame = draw_runeblade(
                body,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.0,
                blade_len=18.5,
                shoulder=(27, 17 + jump_dy),
                two_handed=True
            )
            # Vertical meteoric speed streaks around plunging blade
            for s_i in range(3):
                sx = 31 + s_i * 4
                sy = 4 + ((k * 3 + s_i * 4) % 14)
                draw_line_px(frame, sx, sy, sx, sy + 6, GOLD_BRIGHT if s_i == 1 else FROST_BRIGHT)
            frames.append(ensure_safe_cell(frame))

        else:
            # Stage 3B (F27..F29): Heroic ground impact stance with Runeblade driven vertically into shattered earth!
            k = f - 27
            crouch_d = [6, 5, 3][k]
            body = make_crouch_body(tpl, crouch_d)
            body = apply_cape_wave(body, phase * 2.0, amplitude=1.6, vertical_flutter=0.6)
            body = draw_valkyrie_aura_wings(body, shoulder=(24, 17 + crouch_d), wing_span=0.6 - k * 0.2, phase=phase)

            frame = draw_runeblade(
                body,
                hand_x=35,
                hand_y=24 + crouch_d,
                angle_deg=86.0 - k * 8.0,
                glow_intensity=1.0,
                blade_len=17.5,
                shoulder=(27, 17 + crouch_d),
                two_handed=True
            )
            # Tectonic ground shockwave sparks at blade impact (x=35, y=48)
            for rx in range(24 - k * 3, 46 + k * 2, 2):
                if 2 <= rx < 49:
                    set_px(frame, rx, 48, GOLD_BRIGHT if rx % 4 == 0 else FROST_BRIGHT)
            frames.append(ensure_safe_cell(frame))

    return frames


def build_row5_death(tpl):
    """
    Row 5 (`DEATH` & `HURT`, 30 frames):
    - F00..F06: Hit-stagger recoil (used by HURT state F00..F05)
    - F07..F17: Drops to one knee clutching chest, planting single Runeblade point-down into the ground
    - F18..F29: Collapses forward onto the ground horizontally (y=38..46) with his Runeblade resting flat
      beside him on the ground (ZERO floating upright weapons!).
    """
    frames = []
    for f in range(30):
        if f <= 6:
            # F00..F06: Hit-stagger recoil with arm thrown back
            u = f / 6.0
            dx = -int(round(math.sin(u * math.pi * 0.85) * 2.0))
            dy = int(round(u * 2.0))
            base = np.zeros((52, 52, 4), dtype=np.uint8)
            for y in range(52):
                for x in range(52):
                    if tpl['stand'][y, x, 3] > 0:
                        ny = max(2, min(49, y + dy))
                        nx = max(2, min(49, x + dx))
                        base[ny, nx] = tpl['stand'][y, x]
            base = apply_cape_wave(base, u * math.pi, amplitude=1.4, vertical_flutter=0.4)
            frame = draw_runeblade(
                base,
                hand_x=34 + dx + int(round(u * 1)),
                hand_y=22 + dy + int(round(u * 2)),
                angle_deg=-35.0 + u * 65.0,
                glow_intensity=0.4,
                blade_len=18.5,
                shoulder=(25 + dx, 17 + dy),
                two_handed=True
            )
            frames.append(ensure_safe_cell(frame))

        elif f <= 17:
            # F07..F17: Drops to one knee using continuous crouch warp, planting single Runeblade point-down into the floor
            u = (f - 7) / 10.0
            d = 5 if f <= 12 else 6
            base = make_crouch_body(tpl, d)
            base = apply_cape_wave(base, u * math.pi, amplitude=1.0, vertical_flutter=0.25)
            # Single Runeblade planted point-down (+88 deg) into ground at x=34, y=27..47
            frame = draw_runeblade(
                base,
                hand_x=34,
                hand_y=26 + (1 if f >= 13 else 0),
                angle_deg=88.0,
                glow_intensity=max(0.15, 0.45 * (1.0 - u)),
                blade_len=17.5,
                shoulder=(27, 21 + (1 if f >= 13 else 0)),
                two_handed=True
            )
            frames.append(ensure_safe_cell(frame))

        elif f <= 23:
            # F18..F23: Collapsing forward from knee onto the floor while Runeblade tips down flat onto the ground
            u = (f - 18) / 5.0
            tilt_deg = -u * 78.0  # CW rotation in PIL (tilts kneeling warrior forward-right onto the ground)
            pil_kn = Image.fromarray(make_crouch_body(tpl, 6), mode='RGBA')
            rot_arr = np.array(
                pil_kn.rotate(tilt_deg, resample=Image.NEAREST, center=(24, 43)),
                dtype=np.uint8
            )
            rot_arr = fill_layer_pinholes(rot_arr, 1, 50, 1, 50, require_3_neighbors=True)

            ys, xs = np.where(rot_arr[:, :, 3] > 0)
            max_y = ys.max() if len(ys) > 0 else 47
            drop_y = 46 - max_y
            shift_x = int(round(u * 3.0))

            frame = np.zeros((52, 52, 4), dtype=np.uint8)
            for y in range(52):
                for x in range(52):
                    if rot_arr[y, x, 3] > 0:
                        ny = max(2, min(48, y + drop_y))
                        nx = max(2, min(49, x + shift_x))
                        frame[ny, nx] = rot_arr[y, x]

            # Runeblade tips smoothly from planted (+72 deg) to horizontal flat on the ground (0 deg at y=47)
            blade_ang = (1.0 - u) * 72.0 + u * 2.0
            hx = int(round(33 * (1.0 - u) + 27 * u))
            hy = int(round(31 * (1.0 - u) + 46 * u))
            frame = draw_runeblade(
                frame,
                hand_x=hx,
                hand_y=hy,
                angle_deg=blade_ang,
                glow_intensity=0.15,
                blade_len=17.5,
                shoulder=None,
                draw_arm=False
            )
            frames.append(ensure_safe_cell(frame))

        else:
            # F24..F29: Collapsed horizontally on the ground (y=35..46) with Runeblade resting flat beside him!
            k = f - 24
            frame = tpl['fall'].copy()
            if k == 0:
                frame = np.roll(frame, -1, axis=0)
                frame[-1, :] = 0

            # Single Runeblade lying flat horizontally on the ground at y=46..48 (ZERO upright weapons!)
            frame = draw_runeblade(
                frame,
                hand_x=26,
                hand_y=46,
                angle_deg=0.0,
                glow_intensity=max(0.02, 0.35 - k * 0.06),
                blade_len=18.5,
                shoulder=None,
                draw_arm=False
            )
            # Fading frost rune ember along the fallen blade so each settling frame F24..F29 is distinct
            ember_x = 30 + k * 3
            if ember_x < 46:
                set_px(frame, ember_x, 46, FROST_BRIGHT if k <= 2 else FROST_CYAN)
            frames.append(ensure_safe_cell(frame))

    return frames


def build_row6_dash(tpl):
    """
    Row 6 (`DASH` - Valkyrie Assault Charge, 30 frames):
    - Low aerodynamic Valkyrie assault charge with trailing royal cape, two-handed horizontal Runeblade thrust
      (*Ochs / Pflug* couched charge), and golden-frost speed afterimages.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 3:
            # F00..F03: Explosive launch into low charge posture
            u = f / 3.0
            crouch_dy = [0, 1, 2, 2][f]
            src_body = tpl['stand'] if f <= 1 else tpl['dash']
            base = np.zeros((52, 52, 4), dtype=np.uint8)
            for y in range(52):
                ny = min(49, y + crouch_dy)
                base[ny, :] = src_body[y, :]
            base = apply_cape_wave(base, phase * 2.0, amplitude=1.4, is_dash=(f >= 2))
            ang = -48.0 * (1.0 - u) + (-4.0) * u
            frame = draw_runeblade(
                base,
                hand_x=35,
                hand_y=20 + crouch_dy,
                angle_deg=ang,
                glow_intensity=0.6 + u * 0.3,
                blade_len=16.5,
                shoulder=(26 + int(round(u * 1)), 17 + crouch_dy),
                two_handed=True
            )
            frames.append(ensure_safe_cell(frame))

        elif f <= 22:
            # F04..F22: Full aerodynamic Valkyrie assault charge + two-handed horizontal Runeblade thrust + speed streaks
            k = f - 4
            bob_dy = 1 + int(round(math.sin((k / 18.0) * math.pi * 2.0) * 1.0))
            base = np.zeros((52, 52, 4), dtype=np.uint8)
            for y in range(52):
                ny = min(49, max(2, y + bob_dy))
                base[ny, :] = tpl['dash'][y, :]
            base = apply_cape_wave(base, k * 0.85, amplitude=1.5, is_dash=True)

            # Golden-frost horizontal speed streaks trailing behind cape & boots
            for s_idx in range(4):
                sy = 12 + s_idx * 8 + ((k + s_idx) % 2)
                sx0 = 2 + ((k * 3 + s_idx * 5) % 9)
                draw_line_px(base, sx0, sy, sx0 + 5, sy, GOLD_BRIGHT if s_idx % 2 == 0 else FROST_BRIGHT)

            thrust_dx = int(round(math.sin((k / 18.0) * math.pi) * 2.0))
            frame = draw_runeblade(
                base,
                hand_x=35 + thrust_dx,
                hand_y=21 + bob_dy,
                angle_deg=-2.0 + math.sin(k * 0.6) * 3.0,
                glow_intensity=0.95,
                blade_len=15.0,
                shoulder=(27, 17 + bob_dy),
                two_handed=True
            )
            frames.append(ensure_safe_cell(frame))

        else:
            # F23..F29: Armored brake-slide and smooth recovery to two-handed ready stance
            u = (f - 23) / 6.0
            crouch_dy = [2, 2, 1, 1, 0, 0, 0][f - 23]
            src_body = tpl['lunge'] if f <= 25 else tpl['stand']
            base = np.zeros((52, 52, 4), dtype=np.uint8)
            for y in range(52):
                ny = min(49, y + crouch_dy)
                base[ny, :] = src_body[y, :]
            base = apply_cape_wave(base, phase, amplitude=1.4, vertical_flutter=0.5)
            ang = -2.0 * (1.0 - u) + (-48.0) * u
            frame = draw_runeblade(
                base,
                hand_x=35,
                hand_y=20 + crouch_dy,
                angle_deg=ang,
                glow_intensity=0.8 - u * 0.3,
                blade_len=18.0,
                shoulder=(26, 17 + crouch_dy),
                two_handed=True
            )
            frames.append(ensure_safe_cell(frame))

    return frames


def build_row7_crouch(tpl):
    """
    Row 7 (`CROUCH`, 30 frames — HEMA Low *Pflug* Guard into Two-Handed Rising *Unterhau* Cleave):
    - F00..F06: Drops into a low bent-knee *Pflug* (Plow) guard (`d = 5`), bracing the greatsword with both hands near his forward hip (`hx = 35, hy = 20 + d, ang = -48 -> -22 deg`).
    - F07..F12: Coils the blade down into low *Wechsel / Alber* guard (`ang = -22 -> +22 deg`) as frost runes charge.
    - F13..F18: Drives both hands upward in an explosive two-handed rising *Unterhau* (upward diagonal cleave) from `+22 deg` up to `-46 deg` (`hx = 36..38, hy = 21+d -> 16+d`).
    - F19..F29: Rises smoothly from crouch back to upright two-handed *Halb-Vom-Tag* stance.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 6:
            depths = [0, 1, 2, 3, 4, 5, 5]
            d = depths[f]
            u = f / 6.0
            base = tpl['stand'].copy() if d == 0 else make_crouch_body(tpl, d)
            base = apply_cape_wave(base, phase, amplitude=1.2, vertical_flutter=0.35)
            ang = -48.0 * (1.0 - u) + (-22.0) * u
            frame = draw_runeblade(
                base,
                hand_x=35,
                hand_y=20 + d,
                angle_deg=ang,
                glow_intensity=0.5 + u * 0.3,
                blade_len=17.5,
                shoulder=(27, 17 + d),
                two_handed=True
            )
            frames.append(ensure_safe_cell(frame))

        elif f <= 12:
            # F07..F12: Coils down into low Wechsel/Alber guard (+22 deg) preparing for rising Unterhau cut
            d = 5
            k = f - 7
            u = k / 5.0
            base = make_crouch_body(tpl, d)
            base = apply_cape_wave(base, phase, amplitude=1.1, vertical_flutter=0.3)
            frame = draw_runeblade(
                base,
                hand_x=35 - int(round(u * 1)),
                hand_y=20 + d + int(round(u * 2)),
                angle_deg=-22.0 * (1.0 - u) + 22.0 * u,
                glow_intensity=0.8 + u * 0.2,
                blade_len=17.5,
                shoulder=(27, 17 + d),
                two_handed=True
            )
            frames.append(ensure_safe_cell(frame))

        elif f <= 18:
            # F13..F18: Unleashes two-handed rising Unterhau (upward diagonal cleave) from low hip to high guard!
            d = 5
            k = f - 13
            base = make_crouch_body(tpl, d)
            if k in (0, 1, 2):
                base = np.roll(base, 1, axis=1)
                base[:, 0:1] = 0
            base = apply_cape_wave(base, phase * 2.0, amplitude=1.5, vertical_flutter=0.5)

            ang_seq = [4.0, -18.0, -38.0, -46.0, -42.0, -36.0]
            hx_seq = [36, 38, 38, 37, 36, 35]
            hy_seq = [21 + d, 19 + d, 17 + d, 16 + d, 17 + d, 18 + d]
            slash_arc = (26.0, ang_seq[k] - 8.0, 18.5, 1.0 - k * 0.22) if k <= 3 else None
            frame = draw_runeblade(
                base,
                hand_x=hx_seq[k],
                hand_y=hy_seq[k],
                angle_deg=ang_seq[k],
                glow_intensity=1.0 if k <= 2 else 0.7,
                blade_len=16.5,
                shoulder=(27, 17 + d),
                two_handed=True,
                slash_arc=slash_arc
            )
            frames.append(ensure_safe_cell(frame))

        else:
            # F19..F29: Smoothly rises from 5px crouch back to upright two-handed combat stance
            depths = [5, 5, 4, 4, 3, 3, 2, 2, 1, 0, 0]
            k = f - 19
            d = depths[k]
            u = k / 10.0
            base = tpl['stand'].copy() if d == 0 else make_crouch_body(tpl, d)
            base = apply_cape_wave(base, phase, amplitude=1.2, vertical_flutter=0.4)
            ang = -36.0 * (1.0 - u) + (-48.0) * u
            frame = draw_runeblade(
                base,
                hand_x=35,
                hand_y=20 + d,
                angle_deg=ang,
                glow_intensity=0.65 - u * 0.2,
                blade_len=18.5,
                shoulder=(26 + (1 if d >= 3 else 0), 17 + d),
                two_handed=True
            )
            frames.append(ensure_safe_cell(frame))

    return frames


def build_row8_jump(tpl):
    """
    Row 8 (`JUMP`, 30 frames — ZERO bouncy-ball frames!):
    - F00..F04: Athletic knee-bend crouch launch with two-handed greatsword grip
    - F05..F11: Powerful ascending Valkyrie vault with knees tucked and cape streaming below, raising Runeblade into High *Vom Tag* with two-handed IK arms
    - F12..F18: Apex mid-air two-handed overhead *Oberhau* cleave unleashing a downward-angled Frost Crescent
    - F19..F24: Descending armored glide
    - F25..F29: Shock-absorbing knee-bend landing
    Every single frame shows Aethelgard's full head, plumed helm, armor, cape, legs, two-handed IK arms, and Runeblade!
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 4:
            # F00..F04: Pre-jump athletic knee-bend launch
            crouch_seq = [1, 3, 5, 3, 1]
            d = crouch_seq[f]
            u = f / 4.0
            body = make_crouch_body(tpl, d) if d >= 2 else make_jump_body(tpl, d, tuck_amount=0.25)
            body = apply_cape_wave(body, phase * 2.0, amplitude=1.5, vertical_flutter=0.5)
            ang = -48.0 + (22.0 if f in (1, 2) else -18.0 * u)
            frame = draw_runeblade(
                body,
                hand_x=35 - int(round(u * 1)),
                hand_y=20 + d,
                angle_deg=ang,
                glow_intensity=0.55 + u * 0.25,
                blade_len=18.5,
                shoulder=(26, 17 + d),
                two_handed=True
            )
            frames.append(ensure_safe_cell(frame))

        elif f <= 11:
            # F05..F11: Ascending Valkyrie vault with tucked armored knees & two-handed High Vom Tag windup
            k = f - 5
            u = k / 6.0
            tuck = 0.45 + 0.55 * math.sin(u * math.pi * 0.7)
            body = make_jump_body(tpl, 0, tuck_amount=tuck, torso_lean_dx=-1 if k >= 3 else 0)
            body = apply_cape_wave(body, phase * 2.0, amplitude=1.8, vertical_flutter=0.8)

            ang = -55.0 * (1.0 - u) + (-102.0) * u
            hx = int(round(34 * (1.0 - u) + 32 * u))
            hy = int(round(20 * (1.0 - u) + 12 * u))
            frame = draw_runeblade(
                body,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=0.75 + u * 0.25,
                blade_len=18.5,
                shoulder=(26, 16),
                two_handed=True
            )
            frames.append(ensure_safe_cell(frame))

        elif f <= 18:
            # F12..F18: Apex mid-air two-handed overhead Oberhau cleave unleashing a downward-angled Frost Crescent!
            k = f - 12
            u = k / 6.0
            tuck = 0.95 - u * 0.15
            body = make_jump_body(tpl, 0, tuck_amount=tuck, torso_lean_dx=1 if k >= 1 else 0)
            body = apply_cape_wave(body, phase * 2.0, amplitude=2.5, vertical_flutter=1.2)

            ang_seq = [-65.0, -8.0, 28.0, 42.0, 46.0, 42.0, 36.0]
            hx_seq = [33, 36, 38, 38, 36, 35, 35]
            hy_seq = [12, 16, 20, 23, 25, 25, 23]
            slash_arc = None
            if k <= 4:
                arc_int = [0.8, 1.0, 1.0, 0.85, 0.55][k]
                a0 = [-128.0, -90.0, -45.0, -10.0, 10.0][k]
                slash_arc = (a0, ang_seq[k] + 6.0, 19.0, arc_int)

            frame = draw_runeblade(
                body,
                hand_x=hx_seq[k],
                hand_y=hy_seq[k],
                angle_deg=ang_seq[k],
                glow_intensity=1.0 if k <= 4 else 0.75,
                blade_len=18.5,
                shoulder=(26, 17),
                two_handed=True,
                slash_arc=slash_arc
            )
            frames.append(ensure_safe_cell(frame))

        elif f <= 24:
            # F19..F24: Descending armored glide as legs extend toward the arena floor
            k = f - 19
            u = k / 5.0
            tuck = 0.75 * (1.0 - u) + 0.15 * u
            body = make_jump_body(tpl, 0, tuck_amount=tuck, torso_lean_dx=0)
            body = apply_cape_wave(body, phase * 2.0, amplitude=2.1, vertical_flutter=1.0)
            ang = 32.0 * (1.0 - u) + (-22.0) * u
            frame = draw_runeblade(
                body,
                hand_x=35,
                hand_y=int(round(23 * (1.0 - u) + 20 * u)),
                angle_deg=ang,
                glow_intensity=0.65,
                blade_len=19.0,
                shoulder=(26, 17),
                two_handed=True
            )
            frames.append(ensure_safe_cell(frame))

        else:
            # F25..F29: Shock-absorbing knee-bend touchdown back to two-handed ready stance
            k = f - 25
            crouch_depths = [3, 4, 2, 1, 0]
            d = crouch_depths[k]
            u = k / 4.0
            body = tpl['stand'].copy() if d == 0 else make_crouch_body(tpl, d)
            body = apply_cape_wave(body, phase, amplitude=1.6, vertical_flutter=0.7)
            ang = -22.0 * (1.0 - u) + (-48.0) * u
            frame = draw_runeblade(
                body,
                hand_x=35,
                hand_y=20 + d,
                angle_deg=ang,
                glow_intensity=0.55,
                blade_len=19.5,
                shoulder=(26, 18 + d),
                two_handed=True
            )
            frames.append(ensure_safe_cell(frame))

    return frames


def main():
    src = load_source_cells()
    tpl = make_clean_templates(src)

    rows = [
        ('ROW 0: IDLE (30 FRAMES)', build_row0_idle(tpl)),
        ('ROW 1: WALK (30 FRAMES)', build_row1_walk(tpl)),
        ('ROW 2: AUTO_ATTACK (30 FRAMES)', build_row2_auto_attack(tpl)),
        ('ROW 3: SKILL - VALKYRIE WHIRLWIND & SLAM (30 FRAMES)', build_row3_skill(tpl)),
        ('ROW 4: ULTIMATE - OMNISLASH & DRAGON VAULT (30 FRAMES)', build_row4_ultimate(tpl)),
        ('ROW 5: DEATH & HURT (30 FRAMES)', build_row5_death(tpl)),
        ('ROW 6: DASH - VALKYRIE CHARGE (30 FRAMES)', build_row6_dash(tpl)),
        ('ROW 7: CROUCH - AEGIS SHIELD & COUNTER (30 FRAMES)', build_row7_crouch(tpl)),
        ('ROW 8: JUMP - AERIAL VAULT & FROST CLEAVE (30 FRAMES)', build_row8_jump(tpl)),
    ]

    num_rows = len(rows)
    cell_px = 208
    sheet = Image.new('RGBA', (30 * cell_px, num_rows * cell_px), (0, 0, 0, 0))

    for r_idx, (r_name, r_frames) in enumerate(rows):
        assert len(r_frames) == 30, f'{r_name} has {len(r_frames)} frames instead of 30'
        adj_diffs = sum(1 for i in range(29) if np.any(r_frames[i] != r_frames[i + 1]))
        print(f'{r_name:54s}: 30 frames generated, {adj_diffs}/29 adjacent transitions distinct')
        for c_idx, arr in enumerate(r_frames):
            cell_im = Image.fromarray(arr, mode='RGBA').resize((cell_px, cell_px), Image.NEAREST)
            sheet.paste(cell_im, (c_idx * cell_px, r_idx * cell_px))

    sheet.save('assets/sprites/warrior_sheet.png')
    print('Saved assets/sprites/warrior_sheet.png:', sheet.size)

    # Render zoomed-in left (F00..F14) and right (F15..F29) contact sheets in artifact directory
    preview_cell = 96
    pad_top = 24
    dbg = Image.new('RGBA', (30 * preview_cell, num_rows * (preview_cell + pad_top)), (15, 20, 30, 255))
    draw = ImageDraw.Draw(dbg)
    for r_idx, (r_name, r_frames) in enumerate(rows):
        y0 = r_idx * (preview_cell + pad_top)
        draw.rectangle([0, y0, 30 * preview_cell, y0 + pad_top - 2], fill=(26, 34, 50, 255))
        draw.text((8, y0 + 5), r_name, fill=(125, 211, 252, 255))
        for c_idx, arr in enumerate(r_frames):
            x0 = c_idx * preview_cell
            draw.text((x0 + 4, y0 + 13), f'F{c_idx:02d}', fill=(250, 204, 21, 255))
            p_im = Image.fromarray(arr, mode='RGBA').resize((preview_cell, preview_cell), Image.NEAREST)
            dbg.paste(p_im, (x0, y0 + pad_top), p_im)
            draw.rectangle([x0, y0 + pad_top, x0 + preview_cell - 1, y0 + pad_top + preview_cell - 1], outline=(35, 45, 65, 255))

    art_dir = '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/4f1fb80f-a88f-4496-9746-b4b9fe84f6d4'
    dbg.crop((0, 0, 15 * preview_cell, dbg.height)).save(f'{art_dir}/debug_warrior_30fps_left_F00_F14.png')
    dbg.crop((15 * preview_cell, 0, 30 * preview_cell, dbg.height)).save(f'{art_dir}/debug_warrior_30fps_right_F15_F29.png')
    print('Saved debug contact sheets in:', art_dir)


if __name__ == '__main__':
    main()
