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
SKIN_SHADOW = (186, 144, 118, 255)
SILVER_LIGHT = (203, 213, 225, 255)
SILVER_MID = (148, 163, 184, 255)
LEATHER_MID = (92, 68, 54, 255)
LEATHER_DARK = (58, 42, 34, 255)
CLOAK_LIGHT = (52, 118, 90, 255)
CLOAK_MID = (34, 78, 62, 255)
CLOAK_DARK = (20, 46, 38, 255)


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
    because `PixelForge.js` (ensureNormalMap + drawSheetFrame) already renders the 1px
    comic ink outline and 1px exterior rim dynamically at runtime—matching all other champions!
    """
    return layer.copy()


def composite_over(base, over):
    res = base.copy()
    mask = over[:, :, 3] > 0
    res[mask] = over[mask]
    return res


def make_clean_templates(src):
    """
    Removes the baked-in bow/arrow from the master poses so we can animate a single
    articulated Elven Greatbow + Bowstring + Arrow + Draw Arm without EVER duplicating weapons or limbs.
    """
    # 1. Clean standing body (no bow, clean waist/hips from atk_rel)
    stand = src['idle'].copy()
    rel = src['atk_rel'].copy()
    stand[18:32, 19:33] = rel[18:32, 19:33]
    for y in range(0, 34):
        for x in range(0, 52):
            if y <= 13 and x >= 31:
                stand[y, x] = 0
            elif 14 <= y <= 33 and x >= 32:
                stand[y, x] = 0
    stand = add_outline_to_layer(stand)

    # Extract Sylvara's actual pixel-art Left Leg/Boot and Right Leg/Boot from `stand`
    leg_back_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_front_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_back_patch[39:50, 16:25] = stand[39:50, 16:25]
    leg_front_patch[39:50, 26:37] = stand[39:50, 26:37]

    # Upper torso + skirt tassets (without lower legs y >= 40) for walk/crouch/jump articulation
    stand_upper = stand.copy()
    stand_upper[40:, :, :] = 0
    stand_upper[40:47, :16, :] = stand[40:47, :16, :]
    stand_upper = add_outline_to_layer(stand_upper)

    # 2. Clean aiming horizontal body (from atk_rel)
    aim_h = rel.copy()
    for y in range(0, 35):
        for x in range(0, 52):
            if y <= 13 and x >= 31:
                aim_h[y, x] = 0
            elif 14 <= y <= 18 and x >= 32:
                aim_h[y, x] = 0
            elif 19 <= y <= 34 and x >= 32:
                aim_h[y, x] = 0
    aim_h = add_outline_to_layer(aim_h)

    # Aiming upper body without lower legs (for aerial jump shots & crouch shots!)
    aim_h_upper = aim_h.copy()
    aim_h_upper[40:, :, :] = 0
    aim_h_upper[40:45, :16, :] = aim_h[40:45, :16, :]
    aim_h_upper = add_outline_to_layer(aim_h_upper)

    # 3. Clean aiming upward body (from skill_up)
    aim_up = src['skill_up'].copy()
    for y in range(0, 35):
        for x in range(0, 52):
            if y <= 10 and x >= 31:
                aim_up[y, x] = 0
            elif 11 <= y <= 16 and x >= 32:
                aim_up[y, x] = 0
            elif 17 <= y <= 34 and x >= 32:
                aim_up[y, x] = 0
    aim_up = add_outline_to_layer(aim_up)

    # 4. Clean kneeling/crouching bodies (kneel1, kneel2) without baked-in right bow limb
    kneel1 = src['kneel1'].copy()
    kneel2 = src['kneel2'].copy()
    for kn in (kneel1, kneel2):
        for y in range(14, 32):
            for x in range(32, 52):
                kn[y, x] = 0
    kneel1 = add_outline_to_layer(kneel1)
    kneel2 = add_outline_to_layer(kneel2)

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

    # 6. Clean dash body (remove front bow limb at x >= 36, y <= 27 so we can articulate it)
    dash = src['dash'].copy()
    for y in range(8, 28):
        for x in range(36, 52):
            dash[y, x] = 0
    dash = add_outline_to_layer(dash)

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


def apply_cloak_wave(frame, phase_rad, amplitude=1.4, vertical_flutter=0.6, is_dash=False):
    """
    Applies a smooth 30-frame traveling wind-wave to Sylvara's emerald cloak (left side of sprite)
    without touching her torso, head, or legs.
    """
    out = frame.copy()
    if is_dash:
        cloak_region = frame[15:38, 0:22].copy()
        out[15:38, 0:22] = 0
        for y in range(15, 38):
            for x in range(0, 22):
                if cloak_region[y - 15, x, 3] == 0:
                    continue
                if y >= 32 and x >= 15:
                    out[y, x] = cloak_region[y - 15, x]
                    continue
                dist_from_shoulder = max(0.0, (22 - x) / 18.0)
                dy = int(round(math.sin(phase_rad - dist_from_shoulder * 3.2) * amplitude * dist_from_shoulder))
                dx = int(round(math.cos(phase_rad * 2.0 - dist_from_shoulder * 2.5) * 0.8 * dist_from_shoulder))
                ny = max(12, min(46, y + dy))
                nx = max(1, min(22, x + dx))
                out[ny, nx] = cloak_region[y - 15, x]
        return add_outline_to_layer(out)

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
        wave_x = math.sin(phase_rad - u * 3.6) * (amplitude * (0.25 + 0.85 * u))
        wave_y = math.cos(phase_rad - u * 2.8) * (vertical_flutter * u)
        dx = int(round(wave_x))
        dy = int(round(wave_y))
        for x in range(1, 19):
            if not cloak_mask[y, x]:
                continue
            nx = max(1, min(20, x + dx))
            ny = max(14, min(49, y + dy))
            if out[ny, nx, 3] == 0:
                out[ny, nx] = cloak_pixels[y, x]
            # If cloak shifted left (dx < 0), keep interior cloak bridge next to torso so no seam opens at x=17..18
            if dx < 0 and x >= 15 and out[y, x, 3] == 0:
                out[y, x] = cloak_pixels[y, x]

    for y in range(15, 48):
        for x in range(2, 19):
            if out[y, x, 3] == 0 and cloak_mask[y, x]:
                neighbors = [out[y - 1, x], out[y + 1, x], out[y, x - 1], out[y, x + 1]]
                solid = [n for n in neighbors if n[3] > 0 and tuple(n) != OUTLINE]
                if len(solid) >= 3:
                    out[y, x] = cloak_pixels[y, x]

    return add_outline_to_layer(out)


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
):
    """
    Renders Sylvara's articulated Bow Arm, Golden Elven Greatbow (with deep arch & dynamic limb flex),
    Luminous Emerald Bowstring, Nocked Arrow(s), and Right Draw-Arm/Hand onto a separate
    52x52 layer, inks its 1px outline, and composites it cleanly onto `base_frame`.
    """
    bow_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    str_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    fx_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    rad = math.radians(aim_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    px, py = -uy, ux

    sx, sy = shoulder
    gx = sx + ux * bow_reach
    gy = sy + uy * bow_reach

    # 1. Extended Left Bow-Arm
    draw_line_px(bow_layer, sx, sy, gx, gy, LEATHER_MID)
    draw_line_px(bow_layer, sx, sy - 1, gx - ux * 2, gy - uy * 2 - 1, SILVER_MID)
    set_px(bow_layer, sx + ux * 2, sy + uy * 2 - 1, SILVER_LIGHT)
    set_px(bow_layer, gx, gy, SKIN_LIGHT)

    # 2. Curved Golden Recurve Bow Limbs with Deep Arch (3.2px rest arch + up to 2.6px extra draw flex!)
    flex_back = 3.2 + draw_t * 2.6
    steps = 14
    top_tip = (gx, gy)
    bot_tip = (gx, gy)

    for sign in (-1, 1):
        for i in range(steps + 1):
            s = i / steps
            span = s * bow_half_span * sign
            bend = -(s ** 1.55) * flex_back
            bx = gx + ux * bend + px * span
            by = gy + uy * bend + py * span

            set_px(bow_layer, bx - ux * 0.7, by - uy * 0.7, WOOD_DARK)
            col = GOLD_BRIGHT if (s < 0.25 or s > 0.82) else GOLD_MID
            set_px(bow_layer, bx, by, col)

            if astral_wings > 0.05 and 0.25 <= s <= 0.95 and i % 2 == 0:
                wing_len = int(round(astral_wings * (4.5 * math.sin(s * math.pi) + 1.5)))
                for w_i in range(1, wing_len + 1):
                    wx = bx + ux * (w_i * 0.9) + px * (sign * w_i * 0.35)
                    wy = by + uy * (w_i * 0.9) + py * (sign * w_i * 0.35)
                    w_col = STAR_GOLD if w_i == 1 else (EMERALD_BRIGHT if w_i < wing_len else EMERALD_MID)
                    set_px(fx_layer, wx, wy, w_col)

            if i == steps:
                if sign == -1:
                    top_tip = (bx, by)
                else:
                    bot_tip = (bx, by)

    set_px(bow_layer, gx + ux * 0.8, gy + uy * 0.8, EMERALD_MID)
    set_px(bow_layer, gx, gy - 1, EMERALD_BRIGHT)

    # 3. Compute Bowstring Nock Point & Right Draw-Hand Position
    mid_tip_x = 0.5 * (top_tip[0] + bot_tip[0])
    mid_tip_y = 0.5 * (top_tip[1] + bot_tip[1])

    cheek_x = sx - ux * 4.2 + px * (-1.2)
    cheek_y = sy - uy * 4.2 + py * (-1.2)

    if draw_t > 0.01:
        nock_x = mid_tip_x * (1.0 - draw_t) + cheek_x * draw_t
        nock_y = mid_tip_y * (1.0 - draw_t) + cheek_y * draw_t
    else:
        nock_x = mid_tip_x + ux * string_vib
        nock_y = mid_tip_y + uy * string_vib

    # 4. Taut Luminous Emerald Bowstring
    draw_line_px(str_layer, top_tip[0], top_tip[1], nock_x, nock_y, EMERALD_BRIGHT)
    draw_line_px(str_layer, bot_tip[0], bot_tip[1], nock_x, nock_y, EMERALD_BRIGHT)

    # 5. Right Draw-Arm & Hand
    if hand_override is not None:
        hx, hy = hand_override
        draw_line_px(bow_layer, sx - 2, sy, hx, hy, LEATHER_MID)
        set_px(bow_layer, hx, hy, SKIN_LIGHT)
        set_px(bow_layer, hx - 1, hy, SILVER_MID)
    elif draw_t > 0.02:
        draw_line_px(bow_layer, sx - 2, sy - 1, nock_x - ux * 1.2, nock_y - uy * 1.2, SILVER_MID)
        set_px(bow_layer, nock_x, nock_y, SKIN_LIGHT)

    bow_outlined = add_outline_to_layer(bow_layer)

    # 6. Nocked Emerald / Astral Arrow(s) or Release Flash
    arrow_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    def render_single_arrow(ax0, ay0, ang_deg, length=18.5, is_astral=False, charge=0):
        arad = math.radians(ang_deg)
        aux, auy = math.cos(arad), math.sin(arad)
        apx, apy = -auy, aux
        ax1 = min(49.0, ax0 + aux * length)
        ay1 = max(2.0, min(49.0, ay0 + auy * length))

        set_px(arrow_layer, ax0 - aux + apx, ay0 - auy + apy, STAR_GOLD if is_astral else EMERALD_BRIGHT)
        set_px(arrow_layer, ax0 - aux - apx, ay0 - auy - apy, STAR_GOLD if is_astral else EMERALD_BRIGHT)

        shaft_col = STAR_GOLD if is_astral else EMERALD_CORE
        draw_line_px(arrow_layer, ax0, ay0, ax1, ay1, shaft_col)
        if is_astral:
            draw_line_px(arrow_layer, ax0 + apx, ay0 + apy, ax1 - aux * 2 + apx, ay1 - auy * 2 + apy, EMERALD_MID)

        set_px(arrow_layer, ax1, ay1, EMERALD_CORE)
        set_px(arrow_layer, ax1 - aux + apx, ay1 - auy + apy, EMERALD_MID)
        set_px(arrow_layer, ax1 - aux - apx, ay1 - auy - apy, EMERALD_MID)
        set_px(arrow_layer, ax1 + aux, ay1 + auy, STAR_GOLD if is_astral else EMERALD_BRIGHT)

        if charge >= 1:
            tx, ty = int(round(ax1 + aux)), int(round(ay1 + auy))
            set_px(fx_layer, tx, ty, (255, 255, 255, 255))
            for d in range(1, charge + 1):
                col = STAR_GOLD if d == 1 else EMERALD_BRIGHT
                set_px(fx_layer, tx + d, ty, col)
                set_px(fx_layer, tx - d, ty, col)
                set_px(fx_layer, tx, ty + d, col)
                set_px(fx_layer, tx, ty - d, col)
            if charge >= 3:
                for dx, dy in [(-1, -1), (1, -1), (-1, 1), (1, 1)]:
                    set_px(fx_layer, tx + dx, ty + dy, STAR_GOLD)

    if arrow_mode == 'single':
        render_single_arrow(nock_x, nock_y, aim_deg, length=18.5, is_astral=False, charge=charge_level)
    elif arrow_mode == 'starfall':
        render_single_arrow(nock_x, nock_y, aim_deg, length=19.0, is_astral=True, charge=charge_level)
    elif arrow_mode == 'astral_dragon':
        render_single_arrow(nock_x, nock_y, aim_deg, length=20.0, is_astral=True, charge=charge_level)
    elif arrow_mode == 'fan3':
        for d_ang in (-13.0, 0.0, 13.0):
            render_single_arrow(
                nock_x, nock_y, aim_deg + d_ang, length=17.5, is_astral=False,
                charge=max(0, charge_level - (0 if d_ang == 0 else 1))
            )

    if release_flash:
        fx_cx = gx + ux * 2.5
        fx_cy = gy + uy * 2.5
        set_px(fx_layer, fx_cx, fx_cy, (255, 255, 255, 255))
        for d in range(1, 5):
            col = STAR_GOLD if d <= 2 else EMERALD_BRIGHT
            set_px(fx_layer, fx_cx + px * d, fx_cy + py * d, col)
            set_px(fx_layer, fx_cx - px * d, fx_cy - py * d, col)
        for d in range(1, 6):
            col = (255, 255, 255, 255) if d <= 2 else (STAR_GOLD if d <= 4 else EMERALD_MID)
            set_px(fx_layer, fx_cx + ux * d, fx_cy + uy * d, col)

    arrow_outlined = add_outline_to_layer(arrow_layer)

    out = composite_over(base_frame, str_layer)
    out = composite_over(out, bow_outlined)
    out = composite_over(out, arrow_outlined)
    out = composite_over(out, fx_layer)
    return out


def render_walk_legs(tpl, f):
    """
    Renders a fluid, wide-striding 30-frame 2-step ranger walk cycle (f = 0..29) in true anatomical depth order:
    1. Backmost Layer: Diagonal wind-swept Emerald Cloak (bridged solidly to the back so zero seam ever opens).
    2. Far Leg Layer: Sylvara's sculpted thigh + knee + pixel-art boot swinging freely in front of the cloak
       (shaded 0.80x for clear depth separation).
    3. Split Tunic Tabard: Sweeps dynamically with the leading thigh at y = 30..36.
    4. Near Leg Layer: Full-brightness sculpted thigh + knee + pixel-art boot with wide horizontal reach
       (x = 14..38, +-30 deg stride angle) and genuine knee-bend lift on the passing swing.
    5. Upper Torso & Head: Smooth 2-step vertical bob and +1px athletic forward ranger posture.
    """
    phase = (f / 30.0) * 2.0 * math.pi
    # Smooth 2-step vertical bob: lowest (+1px) at foot strike, highest (-1px) at mid-stride passing
    bob_y = int(round(math.cos(phase * 2.0) * 1.0))

    stand = tpl['stand'].copy()
    cloak_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    # 1. Extract Cloak (x <= 18, y = 14..47) onto backmost layer with diagonal trailing wind wave,
    #    keeping x = 16..20 bridged so NO vertical slit ever opens between cloak and torso!
    for y in range(14, 48):
        ny = y + bob_y
        if not (0 <= ny < 52):
            continue
        u = (y - 14) / 33.0
        wave_dx = int(round(-u * 2.4 + math.sin(phase - u * 3.2) * (1.4 * u)))
        wave_dy = int(round(math.cos(phase - u * 2.6) * (0.8 * u)))
        for x in range(1, 20):
            if stand[y, x, 3] == 0:
                continue
            # Only treat lower-left cloak tail (x <= 15 when y >= 33) as cloak so we don't copy standing legs
            if y >= 33 and x > 15:
                continue
            cy = max(14, min(49, ny + wave_dy))
            cx = max(1, min(22, x + wave_dx))
            cloak_layer[cy, cx] = stand[y, x]
            # Solid bridge next to back/hips (x = 14..19) so shifting cloak left never opens a gap
            if x >= 13 and y <= 35:
                cloak_layer[ny, x] = stand[y, x]
                if x + 1 < 22:
                    cloak_layer[ny, x + 1] = stand[y, x]

    # 2. Extract Upper Torso & Head (y = 0..32, x >= 15) with +1px forward athletic lean
    for y in range(0, 33):
        ny = y + bob_y
        if not (0 <= ny < 52):
            continue
        lean_dx = 1 if y <= 27 else 0
        for x in range(15, 36):
            if stand[y, x, 3] > 0:
                torso_layer[ny, min(50, x + lean_dx)] = stand[y, x]

    hip_x = 26.0
    hip_y = 31.5 + bob_y

    def build_striding_leg(boot_patch, orig_cx, swing_phase, is_far_leg=False):
        layer = np.zeros((52, 52, 4), dtype=np.uint8)
        s_val = math.sin(swing_phase)   # +1 = extended forward (right), -1 = extended backward (left)
        c_val = math.cos(swing_phase)   # +1 = lifted forward swing (knee bent), -1 = planted ground push

        knee_lift = max(0.0, c_val)
        # Knee leads forward during swing; ankle/foot reaches wide (+8.5px forward to -8.5px backward!)
        knee_x = hip_x + s_val * 4.6 + knee_lift * 2.2
        knee_y = hip_y + 4.8 - knee_lift * 1.8

        foot_target_x = 26.5 + s_val * 6.8 - knee_lift * 2.2
        foot_lift_dy = bob_y - int(round(knee_lift * 3.0))

        # In PIL Image.rotate (Y-down), +deg (CCW) swings the bottom of the boot (y > center_y) to the RIGHT (+x),
        # and -deg (CW) swings the bottom of the boot to the LEFT (-x)!
        # So +s_val * 20.0 swings the foot forward with the stride, and -knee_lift * 22.0 curls the shin back when lifted!
        boot_rot_deg = s_val * 20.0 - knee_lift * 22.0
        pil_boot = Image.fromarray(boot_patch, mode='RGBA')
        rot_boot = np.array(
            pil_boot.rotate(boot_rot_deg, resample=Image.NEAREST, center=(orig_cx, 39.5)),
            dtype=np.uint8
        )

        dx_boot = int(round(foot_target_x - orig_cx))
        for y in range(36, 52):
            for x in range(4, 50):
                if rot_boot[y, x, 3] > 0:
                    ny = min(49, max(34, y + foot_lift_dy))
                    nx = min(49, max(6, x + dx_boot))
                    px_col = rot_boot[y, x].copy()
                    if is_far_leg:
                        px_col[0] = int(px_col[0] * 0.78)
                        px_col[1] = int(px_col[1] * 0.78)
                        px_col[2] = int(px_col[2] * 0.82)
                    layer[ny, nx] = px_col

        ank_x = foot_target_x + math.sin(math.radians(boot_rot_deg)) * 1.5
        ank_y = 40.5 + foot_lift_dy

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

        # Sculpted 4px wide Thigh (Hip -> Knee)
        for off_x, col in [(-1.8, c_dark), (-0.8, c_mid), (0.2, c_hi), (1.2, c_mid), (2.0, c_dark)]:
            draw_line_px(layer, hip_x + off_x, hip_y, knee_x + off_x * 0.85, knee_y, col)

        # Sculpted 3px wide Upper Shin / Greave (Knee -> Boot Top)
        for off_x, col in [(-1.4, c_dark), (-0.4, c_greave), (0.6, c_greave), (1.4, c_dark)]:
            draw_line_px(layer, knee_x + off_x, knee_y, ank_x + off_x * 0.85, ank_y, col)

        # Elven Golden Knee-Guard highlight
        set_px(layer, knee_x, knee_y, c_gold)
        set_px(layer, knee_x + 1, knee_y, c_gold)
        return layer

    # Far leg (phase + pi) and Near leg (phase)
    far_leg = build_striding_leg(tpl['leg_back'], 20.5, phase + math.pi, is_far_leg=True)
    near_leg = build_striding_leg(tpl['leg_front'], 30.5, phase, is_far_leg=False)

    # Dynamic split ranger tunic tabard at y = 31..36 that swings with the stride
    tunic_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    stride_open = abs(math.sin(phase))
    flap_dx = math.sin(phase) * 2.2
    for off_x, col in [(-2.5, CLOAK_DARK), (-1.5, CLOAK_MID), (-0.5, CLOAK_LIGHT), (0.5, CLOAK_MID), (1.5, GOLD_MID)]:
        draw_line_px(
            tunic_layer,
            hip_x + off_x,
            hip_y - 1.0,
            hip_x + off_x + flap_dx + stride_open * 1.2,
            hip_y + 4.2,
            col
        )

    # Composite in true back-to-front anatomical order so far_leg is IN FRONT OF cloak_layer!
    out = composite_over(cloak_layer, far_leg)
    out = composite_over(out, tunic_layer)
    out = composite_over(out, near_leg)
    out = composite_over(out, torso_layer)
    return out


def build_row0_idle(tpl):
    """Row 0: 30-Frame Living Sylvan Ranger IDLE."""
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        base = tpl['stand'].copy()

        breath_dy = -1 if 8 <= f <= 19 else 0
        if breath_dy != 0:
            upper = base[2:29, 18:34].copy()
            base[2:29, 18:34] = 0
            base[2 + breath_dy:29 + breath_dy, 18:34] = upper
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
        if 0 <= gx < 52 and 0 <= gy < 52:
            set_px(frame, gx, gy, STAR_GOLD if f % 5 == 0 else EMERALD_CORE)

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
            base = np.roll(base, -1, axis=1)
            base[:, -1:] = 0

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
    """Row 3: 30-Frame SKILL (STARFALL VOLLEY)."""
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if 15 <= f <= 26:
            base = tpl['aim_up'].copy()
        elif 3 <= f <= 14:
            base = tpl['aim_h'].copy()
        else:
            base = tpl['stand'].copy()

        base = apply_cloak_wave(base, phase * 2.0, amplitude=2.0, vertical_flutter=0.8)

        if f <= 3:
            u = f / 3.0
            aim_deg = 36.0 * (1.0 - u) - 4.0 * u
            hand_pts = [(23, 14), (19, 9), (25, 12), (34, 14)]
            frame = draw_articulated_bow(
                base,
                shoulder=(28, 16),
                aim_deg=aim_deg,
                draw_t=0.0,
                arrow_mode='fan3' if f == 3 else 'none',
                hand_override=hand_pts[f],
                bow_reach=10.0,
                bow_half_span=13.0
            )
        elif f <= 11:
            draw_t = (f - 3) / 8.0
            charge = 2 if f >= 10 else (1 if f >= 8 else 0)
            frame = draw_articulated_bow(
                base,
                shoulder=(28, 15),
                aim_deg=-4.0,
                draw_t=draw_t,
                arrow_mode='fan3',
                charge_level=charge,
                bow_reach=10.5,
                bow_half_span=13.0
            )
        elif f <= 14:
            k = f - 12
            vib = [1.8, -1.1, 0.4][k]
            frame = draw_articulated_bow(
                base,
                shoulder=(27 if k == 0 else 28, 15),
                aim_deg=-8.0 - k * 4.0,
                draw_t=0.0,
                string_vib=vib,
                arrow_mode='none',
                release_flash=(k == 0),
                hand_override=[(21, 13), (20, 10), (26, 12)][k],
                bow_reach=10.5,
                bow_half_span=13.0
            )
        elif f <= 22:
            draw_t = (f - 14) / 8.0
            charge = 3 if f >= 21 else (2 if f >= 19 else 1)
            frame = draw_articulated_bow(
                base,
                shoulder=(28, 14),
                aim_deg=-32.0,
                draw_t=draw_t,
                arrow_mode='starfall',
                charge_level=charge,
                bow_reach=10.2,
                bow_half_span=12.8
            )
        elif f <= 26:
            k = f - 23
            vib = [1.9, -1.2, 0.7, 0.0][k]
            frame = draw_articulated_bow(
                base,
                shoulder=(27 if k <= 1 else 28, 14),
                aim_deg=-35.0 + k * 3.0,
                draw_t=0.0,
                string_vib=vib,
                arrow_mode='none',
                release_flash=(k == 0),
                hand_override=(21, 15),
                bow_reach=10.2,
                bow_half_span=12.8
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
                bow_half_span=12.5
            )
        frames.append(frame)
    return frames


def build_row4_ultimate(tpl):
    """Row 4: 30-Frame Dedicated ULTIMATE (ASTRAL HURRICANE)."""
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        base_src = tpl['aim_h'] if 4 <= f <= 25 else tpl['stand']

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
            shifted = np.zeros((52, 52, 4), dtype=np.uint8)
            for y in range(52):
                for x in range(52):
                    nx = x + recoil_dx
                    if 0 <= nx < 52:
                        shifted[y, nx] = base[y, x]
            base = shifted

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
                bow_half_span=12.5
            )
        elif f <= 17:
            draw_t = min(1.0, (f - 3) / 11.0)
            charge = 3 if f >= 14 else (2 if f >= 10 else 1)
            frame = draw_articulated_bow(
                base,
                shoulder=(sh_x, sh_y),
                aim_deg=-2.0,
                draw_t=draw_t,
                arrow_mode='astral_dragon',
                charge_level=charge,
                astral_wings=wings,
                bow_reach=10.5,
                bow_half_span=12.8
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
                bow_half_span=12.8
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
                bow_half_span=12.4
            )

        if leg_tuck > 0.05:
            for wx_i in range(3):
                wx = 20 + ((f * 3 + wx_i * 5) % 14)
                wy = 48 - (wx_i % 2)
                set_px(frame, wx, wy, STAR_GOLD if wx_i == 0 else EMERALD_BRIGHT)
                set_px(frame, wx + 1, wy, EMERALD_MID)

        frames.append(frame)
    return frames


def build_row5_death(tpl):
    """Row 5: 30-Frame Dedicated DEATH Sequence."""
    frames = []
    for f in range(30):
        if f <= 5:
            u = f / 5.0
            dx = -int(round(u * 2.0))
            dy = int(round(u * 2.0))
            base = np.zeros((52, 52, 4), dtype=np.uint8)
            for y in range(52):
                for x in range(52):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < 52 and 0 <= nx < 52:
                        base[ny, nx] = tpl['stand'][y, x]
            base = apply_cloak_wave(base, u * math.pi, amplitude=1.6, vertical_flutter=0.5)
            frame = draw_articulated_bow(
                base,
                shoulder=(29 + dx, 17 + dy),
                aim_deg=40.0 + u * 24.0,
                draw_t=0.0,
                bow_reach=9.0,
                bow_half_span=11.8
            )
            frames.append(frame)

        elif f <= 13:
            u = (f - 6) / 7.0
            base = (tpl['kneel1'] if f <= 9 else tpl['kneel2']).copy()
            if f in (7, 8):
                head_drop = 1
                head_slice = base[8:19, 20:32].copy()
                base[8:19, 20:32] = 0
                base[8 + head_drop:19 + head_drop, 20:32] = head_slice
                base = add_outline_to_layer(base)

            base = apply_cloak_wave(base, u * math.pi, amplitude=1.0, vertical_flutter=0.3)
            bow_deg = 52.0 + u * 20.0
            frame = draw_articulated_bow(
                base,
                shoulder=(27, 23 + (1 if f >= 10 else 0)),
                aim_deg=bow_deg,
                draw_t=0.0,
                bow_reach=8.0,
                bow_half_span=11.0
            )
            frames.append(frame)

        elif f <= 23:
            u = (f - 13) / 11.0
            tilt_deg = +u * 85.0

            kneel_with_bow = draw_articulated_bow(
                tpl['kneel2'].copy(),
                shoulder=(27, 24),
                aim_deg=72.0 + u * 16.0,
                draw_t=0.0,
                bow_reach=7.5,
                bow_half_span=10.5
            )
            pil_kn = Image.fromarray(kneel_with_bow, mode='RGBA')
            rotated = pil_kn.rotate(tilt_deg, resample=Image.NEAREST, center=(26, 42))
            rot_arr = np.array(rotated, dtype=np.uint8)

            ys, xs = np.where(rot_arr[:, :, 3] > 0)
            max_y = ys.max() if len(ys) > 0 else 48
            drop_y = 48 - max_y
            shift_x = int(round(u * 4.0))

            frame = np.zeros((52, 52, 4), dtype=np.uint8)
            for y in range(52):
                for x in range(52):
                    if rot_arr[y, x, 3] > 0:
                        ny = max(2, min(49, y + drop_y))
                        nx = max(2, min(49, x + shift_x))
                        frame[ny, nx] = rot_arr[y, x]

            frame = add_outline_to_layer(frame)
            frames.append(frame)

        else:
            k = f - 24
            frame = tpl['fall'].copy()
            if k == 0:
                frame = np.roll(frame, -1, axis=0)
                frame[-1, :] = 0

            bow_floor = np.zeros((52, 52, 4), dtype=np.uint8)
            draw_line_px(bow_floor, 30, 47, 38, 45, GOLD_MID)
            draw_line_px(bow_floor, 38, 45, 46, 47, GOLD_MID)
            draw_line_px(bow_floor, 31, 46, 45, 46, WOOD_DARK)
            gem_col = EMERALD_BRIGHT if k <= 1 else (EMERALD_MID if k <= 3 else EMERALD_DEEP)
            set_px(bow_floor, 38, 45, gem_col)
            bow_floor = add_outline_to_layer(bow_floor)
            frame = composite_over(frame, bow_floor)
            frames.append(frame)

    return frames


def build_row6_dash(tpl):
    """Row 6: 30-Frame Dedicated DASH (GALE STRIDE) Sequence."""
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 4:
            u = f / 4.0
            crouch_dy = [0, 1, 2, 2, 1][f]
            base = np.zeros((52, 52, 4), dtype=np.uint8)
            src_body = tpl['stand'] if f <= 2 else tpl['dash']
            for y in range(52):
                ny = min(50, y + crouch_dy)
                base[ny, :] = src_body[y, :]
            base = apply_cloak_wave(base, phase * 2.0, amplitude=1.8, is_dash=(f >= 3))
            frame = draw_articulated_bow(
                base,
                shoulder=(29 + (3 if f >= 3 else 0), 17 + crouch_dy),
                aim_deg=38.0 - u * 18.0,
                draw_t=0.0,
                bow_reach=9.5,
                bow_half_span=12.0
            )
            frames.append(frame)

        elif f <= 18:
            k = f - 5
            vault_arc = -int(round(math.sin((k / 13.0) * math.pi) * 2.0))
            base = np.zeros((52, 52, 4), dtype=np.uint8)
            for y in range(52):
                ny = y + vault_arc
                if 0 <= ny < 52:
                    base[ny, :] = tpl['dash'][y, :]

            base = apply_cloak_wave(base, k * 0.9, amplitude=2.2, is_dash=True)

            if 10 <= f <= 13:
                draw_t = (f - 9) / 4.0
                frame = draw_articulated_bow(
                    base,
                    shoulder=(32, 17 + vault_arc),
                    aim_deg=6.0,
                    draw_t=draw_t,
                    arrow_mode='single',
                    charge_level=2 if f == 13 else 1,
                    bow_reach=9.0,
                    bow_half_span=11.5
                )
            elif f in (14, 15):
                frame = draw_articulated_bow(
                    base,
                    shoulder=(32, 17 + vault_arc),
                    aim_deg=4.0,
                    draw_t=0.0,
                    string_vib=1.6 if f == 14 else -1.0,
                    arrow_mode='none',
                    release_flash=(f == 14),
                    bow_reach=9.0,
                    bow_half_span=11.5
                )
            else:
                frame = draw_articulated_bow(
                    base,
                    shoulder=(32, 17 + vault_arc),
                    aim_deg=20.0,
                    draw_t=0.0,
                    bow_reach=9.0,
                    bow_half_span=11.5
                )
            frames.append(frame)

        elif f <= 24:
            k = f - 19
            slide_dy = [2, 2, 1, 1, 0, 0][k]
            base = np.zeros((52, 52, 4), dtype=np.uint8)
            for y in range(52):
                ny = min(50, y + slide_dy)
                base[ny, :] = tpl['aim_h'][y, :]
            base = apply_cloak_wave(base, phase * 2.0, amplitude=1.9, vertical_flutter=0.8)
            frame = draw_articulated_bow(
                base,
                shoulder=(28, 15 + slide_dy),
                aim_deg=6.0 + k * 4.0,
                draw_t=0.0,
                bow_reach=10.0,
                bow_half_span=12.5
            )
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
    Constructs a clean low-profile crouched ranger body with `crouch_depth` in [1..6] logical pixels:
    - Uses `kneel1` bent legs anchored at the bottom (y=36..50) when crouch_depth >= 5, or compressed
      bent-knee standing legs when crouch_depth in 1..4.
    - Lowers the upper body (`stand_upper`) smoothly by `crouch_depth` pixels so
      Sylvara's head, hood, quiver, shoulders, and bow drop down into a true stealth-ranger crouch!
    """
    canvas = np.zeros((52, 52, 4), dtype=np.uint8)
    if crouch_depth >= 5:
        # Use kneel1's bent-knee lower body (y=36..50) anchored firmly on the floor
        canvas[36:51, :] = tpl['kneel1'][36:51, :]
        upper = tpl['stand_upper']
        for y in range(0, 36):
            ny = y + crouch_depth
            if 0 <= ny < 49:
                for x in range(0, 52):
                    if upper[y, x, 3] > 0:
                        canvas[ny, x] = upper[y, x]
    else:
        # Intermediate knee-bend transition (crouch_depth = 1..4)
        canvas[38:50, :] = tpl['stand'][38:50, :]
        upper = tpl['stand_upper']
        for y in range(0, 38):
            ny = y + crouch_depth
            if 0 <= ny < 49:
                for x in range(0, 52):
                    if upper[y, x, 3] > 0:
                        canvas[ny, x] = upper[y, x]
    return add_outline_to_layer(canvas)


def build_row7_crouch(tpl):
    """
    Row 7: 30-Frame Dedicated CROUCH Sequence (RANGER STEALTH CROUCH & LOW-PROFILE SNIPER SHOT):
    - Frames 0..5:   Smooth knee-bend descent into low stealth crouch (depth: 0 -> 1 -> 2 -> 4 -> 5 -> 6px)
    - Frames 6..17:  Crouched low-profile knee-braced sniper bow draw (draw_t: 0.0 -> 1.0 at y=21!)
    - Frames 18..22: Low-stance sniper arrow release flash, string snap & crouched recoil
    - Frames 23..29: Smooth push-off from bent knee back to upright ready stance (depth: 6 -> 0px)
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 5:
            depths = [0, 1, 2, 4, 5, 6]
            d = depths[f]
            base = tpl['stand'].copy() if d == 0 else make_crouch_body(tpl, d)
            base = apply_cloak_wave(base, phase, amplitude=1.3, vertical_flutter=0.4)
            u = f / 5.0
            aim_deg = 38.0 * (1.0 - u) + 2.0 * u
            frame = draw_articulated_bow(
                base,
                shoulder=(28, 16 + d),
                aim_deg=aim_deg,
                draw_t=0.0,
                arrow_mode='single' if f >= 4 else 'none',
                hand_override=(22, 12 + d) if f in (2, 3) else None,
                bow_reach=10.0,
                bow_half_span=11.5
            )
            frames.append(frame)

        elif f <= 17:
            d = 6
            base = make_crouch_body(tpl, d)
            base = apply_cloak_wave(base, phase, amplitude=1.2, vertical_flutter=0.3)
            draw_t = (f - 5) / 12.0  # 0.08 -> 1.00
            charge = 3 if f >= 16 else (2 if f >= 14 else (1 if f >= 11 else 0))
            frame = draw_articulated_bow(
                base,
                shoulder=(28, 15 + d),
                aim_deg=-2.0,
                draw_t=draw_t,
                arrow_mode='single',
                charge_level=charge,
                bow_reach=10.2,
                bow_half_span=11.5
            )
            frames.append(frame)

        elif f <= 22:
            d = 6
            k = f - 18
            base = make_crouch_body(tpl, d)
            if k in (0, 1):
                base = np.roll(base, -1, axis=1)
                base[:, -1:] = 0
            base = apply_cloak_wave(base, phase * 1.5, amplitude=1.6, vertical_flutter=0.5)
            vib = [1.8, -1.2, 0.8, -0.4, 0.0][k]
            frame = draw_articulated_bow(
                base,
                shoulder=(27 if k <= 1 else 28, 15 + d),
                aim_deg=-5.0 + k * 1.5,
                draw_t=0.0,
                string_vib=vib,
                arrow_mode='none',
                release_flash=(k == 0),
                hand_override=(21, 14 + d),
                bow_reach=10.2,
                bow_half_span=11.5
            )
            frames.append(frame)

        else:
            depths = [6, 5, 4, 3, 2, 1, 0]
            k = f - 23
            d = depths[k]
            base = tpl['stand'].copy() if d == 0 else make_crouch_body(tpl, d)
            base = apply_cloak_wave(base, phase, amplitude=1.4, vertical_flutter=0.5)
            u = k / 6.0
            aim_deg = 4.0 * (1.0 - u) + 38.0 * u
            frame = draw_articulated_bow(
                base,
                shoulder=(28 + (1 if d <= 1 else 0), 16 + d),
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
    - Backmost Layer: Billowing Emerald Cloak streaming behind Sylvara in mid-air.
    - Far Leg Layer: Trailing ranger leg & boot kicked back in an athletic aerial scissor-vault.
    - Split Tunic Tabard: Sweeping between the legs.
    - Near Leg Layer: Leading knee tucked high in front (classic elven ranger mid-air bow stance!).
    - Upper Torso & Hood: Crisp, recognizable face, hood, and quiver with zero round-ball distortion.
    """
    stand = tpl['stand'].copy()
    torso_dy = max(0, jump_dy)

    cloak_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    # 1. Billowing Aerial Cloak (x <= 18, y = 14..46) lifted by the leap
    cloak_lift = int(round(max(0.0, tuck_amount) * 2.5))
    for y in range(14, 47):
        for x in range(1, 19):
            if stand[y, x, 3] == 0:
                continue
            if y >= 33 and x > 15:
                continue
            u = (y - 14) / 32.0
            cx = max(1, min(22, x - int(round(u * 2.8 * max(0.2, tuck_amount)))))
            cy = max(12, min(48, y + torso_dy - int(round(u * cloak_lift))))
            cloak_layer[cy, cx] = stand[y, x]
            if x >= 13 and y <= 34:
                cloak_layer[min(49, y + torso_dy), x] = stand[y, x]

    # 2. Upper Torso & Hood (y = 0..32, x >= 15)
    for y in range(0, 33):
        ny = y + torso_dy
        if not (0 <= ny < 52):
            continue
        dx = torso_lean_dx if y <= 24 else 0
        for x in range(15, 36):
            if stand[y, x, 3] > 0:
                torso_layer[ny, max(1, min(50, x + dx))] = stand[y, x]

    hip_x = 26.0
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
        return layer

    t = max(0.0, tuck_amount)
    # Far leg trails gracefully backward-left; Near leg tucks high forward-right at the knee with shin angled back!
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
    for off_x, col in [(-2.0, CLOAK_DARK), (-1.0, CLOAK_MID), (0.0, CLOAK_LIGHT), (1.0, GOLD_MID)]:
        draw_line_px(tunic_layer, hip_x + off_x, hip_y - 1, hip_x + off_x + 1.5 * t, hip_y + 4.0 - 1.0 * t, col)

    out = composite_over(cloak_layer, far_leg)
    out = composite_over(out, tunic_layer)
    out = composite_over(out, near_leg)
    out = composite_over(out, torso_layer)
    return out


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
            # Frames 0..3: Pre-jump crouch (f=0..2) -> explosive launch push-off (f=3)
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
            # Frames 4..9 (6 frames): Full-body sleek aerial vault & quiver arrow-nock!
            k = f - 4
            u = k / 5.0
            tuck = 0.45 + 0.55 * math.sin(u * math.pi * 0.65)
            lean_dx = -1 if k in (1, 2, 3) else 0
            body = make_jump_body(tpl, 0, tuck_amount=tuck, torso_lean_dx=lean_dx)
            body = apply_cloak_wave(body, phase * 2.0, amplitude=2.4, vertical_flutter=1.1)

            # Bow sweeps from upward vault (-14 deg) down toward aerial target (+22 deg) while right hand nocks arrow
            aim_seq = [-6.0, -14.0, -10.0, +2.0, +14.0, +22.0]
            hand_pts = [(23, 14), (20, 11), (22, 12), (28, 14), (33, 16), (35, 18)]
            frame = draw_articulated_bow(
                body,
                shoulder=(28 + lean_dx, 16),
                aim_deg=aim_seq[k],
                draw_t=0.0,
                arrow_mode='single' if k >= 4 else 'none',
                hand_override=hand_pts[k],
                bow_reach=9.8,
                bow_half_span=12.2
            )
            frames.append(frame)

        elif f <= 17:
            # Frames 10..17 (8 frames): Mid-Air Wind-Glide Hover & Progressive Downward (+24°) Bow Draw!
            k = f - 10
            u = k / 7.0
            tuck = 1.0 - u * 0.12
            body = make_jump_body(tpl, 0, tuck_amount=tuck, torso_lean_dx=1 if k >= 3 else 0)
            body = apply_cloak_wave(body, phase * 2.0, amplitude=2.3, vertical_flutter=1.1)
            draw_t = 0.18 + u * 0.82  # 0.18 -> 1.00 full draw
            charge = 3 if f >= 16 else (2 if f >= 14 else (1 if f >= 12 else 0))
            frame = draw_articulated_bow(
                body,
                shoulder=(29 if k >= 3 else 28, 16),
                aim_deg=+24.0,  # Aimed diagonally DOWNWARD at grounded enemy!
                draw_t=draw_t,
                arrow_mode='single',
                charge_level=charge,
                bow_reach=10.2,
                bow_half_span=12.2
            )
            frames.append(frame)

        elif f <= 23:
            # Frames 18..23 (6 frames): Downward Aerial Shot release flash, string vibration & mid-air recoil!
            k = f - 18
            body = make_jump_body(tpl, 0, tuck_amount=0.85 - k * 0.10, torso_lean_dx=-1 if k <= 2 else 0)
            body = apply_cloak_wave(body, phase * 2.0, amplitude=2.5, vertical_flutter=1.2)
            vib = [1.9, -1.4, 0.9, -0.5, 0.2, 0.0][k]
            frame = draw_articulated_bow(
                body,
                shoulder=(27 if k <= 2 else 28, 16),
                aim_deg=+24.0 - k * 1.8,
                draw_t=0.0,
                string_vib=vib,
                arrow_mode='none',
                release_flash=(k == 0),
                hand_override=(22, 13),
                bow_reach=10.2,
                bow_half_span=12.2
            )
            frames.append(frame)

        else:
            # Frames 24..29 (6 frames): Smooth gliding leg extension (F24..F25) & crouch touchdown (F26..F29)
            k = f - 24
            if k <= 1:
                tuck = [0.32, 0.10][k]
                body = make_jump_body(tpl, 0, tuck_amount=tuck)
                body = apply_cloak_wave(body, phase * 2.0, amplitude=2.0, vertical_flutter=1.1)
                frame = draw_articulated_bow(
                    body,
                    shoulder=(28, 16),
                    aim_deg=20.0 + k * 6.0,
                    draw_t=0.0,
                    bow_reach=9.8,
                    bow_half_span=12.2
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
                    bow_half_span=12.4
                )
            frames.append(frame)

    return frames


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

    for r_idx, (r_name, r_frames) in enumerate(rows):
        assert len(r_frames) == 30, f'{r_name} has {len(r_frames)} frames instead of 30'
        adj_diffs = sum(1 for i in range(29) if np.any(r_frames[i] != r_frames[i + 1]))
        print(f'{r_name:52s}: 30 frames generated, {adj_diffs}/29 adjacent transitions distinct')
        for c_idx, arr in enumerate(r_frames):
            cell_im = Image.fromarray(arr, mode='RGBA').resize((cell_px, cell_px), Image.NEAREST)
            sheet.paste(cell_im, (c_idx * cell_px, r_idx * cell_px))

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
