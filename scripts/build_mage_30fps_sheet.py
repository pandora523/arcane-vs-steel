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
    because `PixelForge.js` (ensureNormalMap + drawSheetFrame) renders the 1px
    comic ink outline and 1px exterior rim dynamically at runtime.
    """
    return layer.copy()


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
    stand = add_outline_to_layer(stand)

    # Extract Ignis's Left/Back Boot and Right/Front Boot from `stand`
    leg_back_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_front_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_back_patch[40:50, 15:23] = stand[40:50, 15:23]
    leg_front_patch[40:50, 24:34] = stand[40:50, 24:34]

    # Upper torso + upper robe skirt (without lower legs/boots y >= 41) for walk/crouch/jump articulation
    stand_upper = stand.copy()
    stand_upper[41:, 15:, :] = 0
    stand_upper = add_outline_to_layer(stand_upper)

    # 2. Clean forward-leaning casting body (hat & torso leaned +1px right, cloak trailing left)
    cast_body = np.zeros((52, 52, 4), dtype=np.uint8)
    for y in range(52):
        lean_dx = 1 if y <= 30 else 0
        for x in range(52):
            if stand[y, x, 3] > 0:
                nx = min(50, x + lean_dx)
                cast_body[y, nx] = stand[y, x]
    cast_body = add_outline_to_layer(cast_body)

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
                elif y >= 45 and 35 <= x <= 38:
                    # Replace bottom staff pole segment over the pooled robe hem with crimson-gold robe pixels
                    kn[y, x] = CRIMSON_DARK if y < 48 else GOLD_DARK
    kneel1 = add_outline_to_layer(kneel1)
    kneel2 = add_outline_to_layer(kneel2)

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
    fall = add_outline_to_layer(fall)

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
    dash = add_outline_to_layer(dash)

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
                    out[y, x] = cloak_region[y - 21, x]
                    continue
                dist_from_shoulder = max(0.0, (24 - x) / 20.0)
                dy = int(round(math.sin(phase_rad - dist_from_shoulder * 3.2) * amplitude * dist_from_shoulder))
                dx = int(round(math.cos(phase_rad * 2.0 - dist_from_shoulder * 2.4) * 0.8 * dist_from_shoulder))
                ny = max(16, min(46, y + dy))
                nx = max(1, min(24, x + dx))
                out[ny, nx] = cloak_region[y - 21, x]
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
            nx = max(1, min(19, x + dx))
            ny = max(19, min(48, y + dy))
            if out[ny, nx, 3] == 0:
                out[ny, nx] = cloak_pixels[y, x]
            # Keep solid bridge next to torso (x >= 14) so shifting left never opens a seam
            if dx < 0 and x >= 14 and out[y, x, 3] == 0:
                out[y, x] = cloak_pixels[y, x]

    for y in range(21, 46):
        for x in range(2, 18):
            if out[y, x, 3] == 0 and cloak_mask[y, x]:
                neighbors = [out[y - 1, x], out[y + 1, x], out[y, x - 1], out[y, x + 1]]
                solid = [n for n in neighbors if n[3] > 0 and tuple(n) != OUTLINE]
                if len(solid) >= 3:
                    out[y, x] = cloak_pixels[y, x]

    return add_outline_to_layer(out)


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
):
    """
    Renders Ignis Sol's SINGLE articulated Solar Sun-Staff (`draw_sun_staff`),
    Right Pyromancer Sleeve & Grip Hand, Sun-Wheel Finial with pulsing Solar Core,
    and optional Left-Hand Solar Orb / Flame-Ward / Eclipse Crown onto clean layers.
    - `staff_deg`: angle in degrees of the staff finial relative to the grip:
      * -90 deg = straight UP (vertical staff)
      * -78 deg = upright ready stance tilted slightly forward (+X)
      *   0 deg = pointed straight RIGHT (+X) toward the enemy
      * +35 deg = aimed diagonally DOWN-RIGHT (+35 deg) for aerial jump fireball shots
    """
    staff_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    fx_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    sx, sy = shoulder
    gx = sx + grip_offset[0]
    gy = sy + grip_offset[1]

    rad = math.radians(staff_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    px, py = -uy, ux

    # 1. Optional Blazing Solar Mantle Wings (Ultimate Stage 2..3)
    if solar_wings > 0.05:
        wing_span = int(round(4 + solar_wings * 7))
        for w_i in range(1, wing_span + 1):
            frac = w_i / max(1.0, float(wing_span))
            # Upper and lower solar flame pinions fanning behind shoulders (x=10..21, y=10..28)
            for branch, by_off in [(-1, -w_i * 0.85), (0, -w_i * 0.35), (1, w_i * 0.45)]:
                wx = 19 - w_i * 1.05
                wy = sy - 2 + by_off + math.sin(phase_rad * 2.0 + w_i * 0.6 + branch) * 0.8
                col = SOLAR_YELLOW if frac < 0.35 else (FLAME_ORANGE if frac < 0.75 else FLAME_CRIMSON)
                set_px(fx_layer, wx, wy, col)
                if frac < 0.6:
                    set_px(fx_layer, wx, wy + 1, FLAME_GOLD)

    # 2. Optional Left-Hand Pyromantic Orb / Flame-Ward Shield / Cast Projection
    if left_orb_mode != 'none':
        if left_hand_pos is not None:
            lhx, lhy = left_hand_pos
        else:
            lhx, lhy = sx - 13, sy + 1

        if left_orb_mode == 'idle_orb':
            # Gently hovering left-hand solar orb on the left side (x=14..17, y=19..23)
            ox = lhx
            oy = lhy + math.sin(phase_rad) * 1.0
            set_px(fx_layer, ox, oy, SOLAR_WHITE)
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                set_px(fx_layer, ox + dx, oy + dy, SOLAR_YELLOW if (dx + dy) % 2 == 0 else FLAME_ORANGE)
            # Orbiting ember mote
            mx = ox + math.cos(phase_rad * 2.0) * 2.2
            my = oy + math.sin(phase_rad * 2.0) * 2.2
            set_px(fx_layer, mx, my, FLAME_GOLD)

        elif left_orb_mode == 'palm_charge':
            # Swirling solar sphere ignited in left palm before fireball thrust
            draw_line_px(staff_layer, sx - 6, sy, lhx, lhy, CRIMSON_MID)
            set_px(staff_layer, lhx, lhy, GOLD_BRIGHT)
            orb_r = 1.5 + charge_level * 0.7
            for dy in range(-3, 4):
                for dx in range(-3, 4):
                    d = math.hypot(dx, dy)
                    if d <= orb_r:
                        c = SOLAR_WHITE if d < 1.1 else (SOLAR_YELLOW if d < 2.1 else FLAME_ORANGE)
                        set_px(fx_layer, lhx + dx, lhy + dy, c)
            for k in range(3):
                a = phase_rad * 2.5 + k * (2.0 * math.pi / 3.0)
                set_px(fx_layer, lhx + math.cos(a) * (orb_r + 1.2), lhy + math.sin(a) * (orb_r + 1.2), FLAME_GOLD)

        elif left_orb_mode == 'forward_cast':
            # Extended left arm projecting solar energy forward (+X) alongside the staff
            draw_line_px(staff_layer, sx, sy - 1, lhx, lhy, CRIMSON_MID)
            draw_line_px(staff_layer, sx, sy, lhx - 1, lhy + 1, GOLD_TRIM)
            set_px(staff_layer, lhx, lhy, GOLD_BRIGHT)
            set_px(fx_layer, lhx + 2, lhy, SOLAR_WHITE)
            for d in range(1, 3 + charge_level):
                set_px(fx_layer, lhx + 2 + d, lhy, SOLAR_YELLOW if d == 1 else FLAME_ORANGE)
                set_px(fx_layer, lhx + 2, lhy - d, FLAME_GOLD if d == 1 else FLAME_CRIMSON)
                set_px(fx_layer, lhx + 2, lhy + d, FLAME_GOLD if d == 1 else FLAME_CRIMSON)

        elif left_orb_mode == 'ward_shield':
            # Spinning golden-crimson Flame-Ward shield ring in front of crouched Ignis (Row 7 CROUCH)
            wcx, wcy = lhx, lhy
            rx, ry = 3.2, 7.5
            for s in range(20):
                a = (s / 20.0) * 2.0 * math.pi + phase_rad * 2.5
                wx = wcx + math.cos(a) * rx
                wy = wcy + math.sin(a) * ry
                col = SOLAR_WHITE if s % 5 == 0 else (SOLAR_YELLOW if s % 2 == 0 else FLAME_ORANGE)
                set_px(fx_layer, wx, wy, col)
            # Inner sun-cross inside the Flame-Ward
            draw_line_px(fx_layer, wcx, wcy - 4, wcx, wcy + 4, FLAME_GOLD)
            draw_line_px(fx_layer, wcx - 2, wcy, wcx + 2, wcy, SOLAR_YELLOW)
            set_px(fx_layer, wcx, wcy, SOLAR_WHITE)

    # 3. Right Pyromancer Sleeve & Grip Hand (shoulder -> grip)
    draw_line_px(staff_layer, sx, sy, gx, gy, CRIMSON_MID)
    draw_line_px(staff_layer, sx, sy + 1, gx, gy + 1, CRIMSON_DARK)
    set_px(staff_layer, gx - ux * 1.0, gy - uy * 1.0, GOLD_MID)
    set_px(staff_layer, gx, gy, GOLD_BRIGHT)

    # 4. Solar Sun-Staff Shaft (from butt end to finial neck)
    bx = gx - ux * bot_len
    by = gy - uy * bot_len
    hx = gx + ux * top_len
    hy = gy + uy * top_len

    # Clamp butt so it never penetrates below y=49 floor
    if by > 49.0 and abs(uy) > 0.05:
        scale_b = (49.0 - gy) / (-uy)
        bx = gx - ux * scale_b
        by = 49.0

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
    set_px(staff_layer, bx - ux * 0.8, by - uy * 0.8, GOLD_MID)

    # 5. Solar Sun-Wheel Finial at (hx, hy)
    fin_cx = hx + ux * 2.2
    fin_cy = hy + uy * 2.2
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

    # Pulsing Miniature Sun Core inside the Sun-Wheel Finial
    core_pulse = 1 if (charge_level >= 1 or int(round(phase_rad * 3)) % 2 == 0) else 0
    set_px(fx_layer, fin_cx, fin_cy, SOLAR_WHITE)
    for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        set_px(fx_layer, fin_cx + dx, fin_cy + dy, SOLAR_YELLOW if core_pulse else FLAME_GOLD)

    # 6. Finial Charge Corona & Muzzle Release Flash
    if charge_level >= 1:
        for d in range(1, charge_level + 2):
            col = SOLAR_WHITE if d == 1 else (SOLAR_YELLOW if d == 2 else FLAME_ORANGE)
            set_px(fx_layer, fin_cx + ux * (ring_r + d), fin_cy + uy * (ring_r + d), col)
            set_px(fx_layer, fin_cx + px * (ring_r + d * 0.7), fin_cy + py * (ring_r + d * 0.7), FLAME_GOLD)
            set_px(fx_layer, fin_cx - px * (ring_r + d * 0.7), fin_cy - py * (ring_r + d * 0.7), FLAME_GOLD)

    if release_flash:
        fcx = fin_cx + ux * 3.0
        fcy = fin_cy + uy * 3.0
        set_px(fx_layer, fcx, fcy, SOLAR_WHITE)
        for d in range(1, 6):
            c_main = SOLAR_WHITE if d <= 2 else (SOLAR_YELLOW if d <= 4 else FLAME_ORANGE)
            set_px(fx_layer, fcx + ux * d, fcy + uy * d, c_main)
            if d <= 4:
                set_px(fx_layer, fcx + px * d, fcy + py * d, SOLAR_YELLOW if d <= 2 else FLAME_CRIMSON)
                set_px(fx_layer, fcx - px * d, fcy - py * d, SOLAR_YELLOW if d <= 2 else FLAME_CRIMSON)
        for dx, dy in [(-2, -2), (2, -2), (-2, 2), (2, 2)]:
            set_px(fx_layer, fcx + dx, fcy + dy, FLAME_GOLD)

    # 7. Optional Ground Magma Shockwave Ring (Row 3 Phase 1 Staff Slam)
    if ground_shockwave > 0.05:
        ring_rx = int(round(4 + ground_shockwave * 18))
        ring_cx = int(round(bx))
        ring_cy = 48
        for s in range(28):
            a = (s / 28.0) * 2.0 * math.pi
            mx = ring_cx + math.cos(a) * ring_rx
            my = ring_cy + math.sin(a) * 1.8
            col = SOLAR_WHITE if (ground_shockwave < 0.4 and s % 3 == 0) else (
                SOLAR_YELLOW if s % 2 == 0 else FLAME_ORANGE
            )
            set_px(fx_layer, mx, my, col)
            if s % 4 == 0 and ground_shockwave < 0.85:
                # Mini magma geyser tongues rising from the shockwave ring
                gh = int(round((1.0 - ground_shockwave) * 5.0))
                for gy_i in range(1, gh + 1):
                    set_px(fx_layer, mx, my - gy_i, SOLAR_YELLOW if gy_i == 1 else FLAME_CRIMSON)

    # 8. Optional Miniature Black-Gold Eclipse Corona above Crown (Row 4 Ultimate)
    if eclipse_crown > 0.05:
        ecx, ecy = 25.0, 5.0
        er = 2.0 + eclipse_crown * 2.2
        for dy in range(-6, 7):
            for dx in range(-6, 7):
                d = math.hypot(dx, dy)
                if d <= er * 0.62:
                    set_px(fx_layer, ecx + dx, ecy + dy, VOID_BLACK)
                elif d <= er:
                    set_px(fx_layer, ecx + dx, ecy + dy, SOLAR_WHITE if d < er * 0.78 else SOLAR_YELLOW)
                elif d <= er + 1.4 and (dx + dy + int(round(phase_rad * 4))) % 2 == 0:
                    set_px(fx_layer, ecx + dx, ecy + dy, FLAME_ORANGE if d < er + 0.8 else FLAME_CRIMSON)

    out = composite_over(base_frame, add_outline_to_layer(staff_layer))
    out = composite_over(out, fx_layer)
    return out


def render_walk_legs(tpl, f):
    """
    Renders a smooth 30-frame 2-step Battle-Mage Stride Cycle (F00..F14 step A, F15..F29 step B)
    in true anatomical depth order:
    1. Backmost Layer: Flowing Crimson-Gold Cloak (`cloak_layer`) solidly bridged to the torso.
    2. Far Leg Layer: Sculpted crimson-robed leg + armored/hemmed boot (`leg_back`) shaded 0.78x.
    3. Parted Crimson-Gold Robe Panels (`robe_tabard_layer`) swinging dynamically with the stride.
    4. Near Leg Layer: Full-brightness sculpted crimson-gold leg + front boot (`leg_front`) with knee-lift.
    5. Upper Torso & Wizard Hat (`torso_layer`) with smooth 2-step vertical bob and +1px forward lean.
    """
    phase = (f / 30.0) * 2.0 * math.pi
    bob_y = int(round(math.cos(phase * 2.0) * 1.0))

    stand = tpl['stand'].copy()
    cloak_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    # 1. Extract Left Cloak (x <= 18, y = 20..46) with diagonal trailing wind wave & solid bridge
    for y in range(20, 47):
        ny = y + bob_y
        if not (0 <= ny < 52):
            continue
        u = (y - 20) / 26.0
        wave_dx = int(round(-u * 2.2 + math.sin(phase - u * 3.2) * (1.4 * u)))
        wave_dy = int(round(math.cos(phase - u * 2.6) * (0.7 * u)))
        for x in range(1, 19):
            if stand[y, x, 3] == 0:
                continue
            if y >= 36 and x > 14:
                continue
            cy = max(18, min(49, ny + wave_dy))
            cx = max(1, min(21, x + wave_dx))
            cloak_layer[cy, cx] = stand[y, x]
            if x >= 13 and y <= 36:
                cloak_layer[ny, x] = stand[y, x]
                if x + 1 < 21:
                    cloak_layer[ny, x + 1] = stand[y, x]

    # 2. Extract Upper Torso & Pointed Wizard Hat (y = 0..33, x >= 14) with +1px forward lean
    for y in range(0, 34):
        ny = y + bob_y
        if not (0 <= ny < 52):
            continue
        lean_dx = 1 if y <= 28 else 0
        for x in range(14, 36):
            if stand[y, x, 3] > 0:
                torso_layer[ny, min(50, x + lean_dx)] = stand[y, x]

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
        return layer

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
    out = composite_over(out, robe_tabard_layer)
    out = composite_over(out, near_leg)
    out = composite_over(out, torso_layer)
    return out


def make_crouch_body(tpl, crouch_depth):
    """
    Constructs a clean low-profile crouched pyromancer body with `crouch_depth` in [1..7] logical pixels:
    - Uses `kneel1` pooled lower robes/knees anchored at the floor (y=36..50) when crouch_depth >= 5,
      or compressed standing robes when crouch_depth in 1..4.
    - Lowers `stand_upper` smoothly by `crouch_depth` pixels (up to 7px lower silhouette!).
    """
    canvas = np.zeros((52, 52, 4), dtype=np.uint8)
    if crouch_depth >= 5:
        canvas[36:50, :] = tpl['kneel1'][36:50, :]
        upper = tpl['stand_upper']
        for y in range(0, 36):
            ny = y + crouch_depth
            if 0 <= ny < 49:
                for x in range(0, 52):
                    if upper[y, x, 3] > 0:
                        canvas[ny, x] = upper[y, x]
    else:
        canvas[39:50, :] = tpl['stand'][39:50, :]
        upper = tpl['stand_upper']
        for y in range(0, 39):
            ny = y + crouch_depth
            if 0 <= ny < 49:
                for x in range(0, 52):
                    if upper[y, x, 3] > 0:
                        canvas[ny, x] = upper[y, x]
    return add_outline_to_layer(canvas)


def make_jump_body(tpl, jump_dy, tuck_amount, torso_lean_dx=0):
    """
    Constructs a clean, full-body aerial Flame-Glide jumping pyromancer pose in back-to-front anatomical order:
    - Backmost Layer: Billowing Crimson-Gold Cloak streaming behind Ignis in mid-air.
    - Far Leg Layer: Trailing crimson-robed leg & boot angled back in an athletic aerial glide.
    - Parted Robe Hem: Sweeping between the legs with warm flame trim.
    - Near Leg Layer: Leading knee tucked forward in a battle-mage aerial hover stance.
    - Upper Torso & Pointed Wizard Hat: Crisp, unmistakable hat, glowing golden eyes, and robes (ZERO round ball!).
    """
    stand = tpl['stand'].copy()
    torso_dy = jump_dy

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
            cx = max(1, min(21, x - int(round(u * 2.6 * max(0.2, tuck_amount)))))
            cy = max(14, min(48, y + torso_dy - int(round(u * cloak_lift))))
            cloak_layer[cy, cx] = stand[y, x]
            if x >= 13 and y <= 35:
                cloak_layer[max(0, min(49, y + torso_dy)), x] = stand[y, x]

    for y in range(0, 34):
        ny = y + torso_dy
        if not (0 <= ny < 52):
            continue
        dx = torso_lean_dx if y <= 26 else 0
        for x in range(14, 36):
            if stand[y, x, 3] > 0:
                torso_layer[ny, max(1, min(50, x + dx))] = stand[y, x]

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
                    ny = max(28, min(49, y + int(round(foot_dy))))
                    nx = max(4, min(49, x + int(round(foot_dx))))
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
        return layer

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
    out = composite_over(out, robe_tabard)
    out = composite_over(out, near_leg)
    out = composite_over(out, torso_layer)
    return out


def build_row0_idle(tpl):
    """
    Row 0 (`IDLE`, 30 frames):
    Breathing robes, gently flickering ember mantle & wizard hat tip,
    hovering left-hand solar orb, and pulsing sun-wheel finial on his staff.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        base = tpl['stand'].copy()

        breath_dy = -1 if 8 <= f <= 19 else 0
        if breath_dy != 0:
            upper = base[4:30, 15:33].copy()
            base[4:30, 15:33] = 0
            base[4 + breath_dy:30 + breath_dy, 15:33] = upper
            base = add_outline_to_layer(base)

        base = apply_robe_cloak_wave(base, phase, amplitude=1.5, vertical_flutter=0.6)

        # Flickering ember at pointed wizard hat apex & shoulder mantle
        hat_ember_y = 7 + breath_dy - (f % 3 == 0)
        set_px(base, 24 + (f % 2), hat_ember_y, SOLAR_YELLOW if f % 2 == 0 else FLAME_ORANGE)

        staff_deg = -81.0 + math.sin(phase) * 2.8
        frame = draw_sun_staff(
            base,
            shoulder=(29, 20 + breath_dy),
            grip_offset=(6.0, 0.5),
            staff_deg=staff_deg,
            top_len=14.5,
            bot_len=24.0,
            phase_rad=phase,
            charge_level=1 if f % 6 in (2, 3) else 0,
            left_orb_mode='idle_orb',
            left_hand_pos=(14, 21 + breath_dy),
        )
        frames.append(frame)
    return frames


def build_row1_walk(tpl):
    """
    Row 1 (`WALK`, 30 frames):
    Smooth 30fps battle-mage stride (F00..F14 step A, F15..F29 step B) with back-to-front
    armored/hemmed boot articulation under parted crimson-gold robes, natural forward lean,
    and counter-swinging Sun-Staff.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        body = render_walk_legs(tpl, f)
        bob_y = int(round(math.cos(phase * 2.0) * 1.0))

        # Counter-swinging Solar Sun-Staff & trailing left-hand solar ember
        swing = math.sin(phase)
        staff_deg = -72.0 - swing * 11.0
        grip_dx = 5.8 - swing * 1.4
        grip_dy = 0.8 + math.cos(phase * 2.0) * 0.8

        frame = draw_sun_staff(
            body,
            shoulder=(30, 20 + bob_y),
            grip_offset=(grip_dx, grip_dy),
            staff_deg=staff_deg,
            top_len=14.0,
            bot_len=21.5,
            phase_rad=phase,
            charge_level=0,
            left_orb_mode='idle_orb',
            left_hand_pos=(15 + int(round(swing * 2.0)), 22 + bob_y),
        )
        frames.append(frame)
    return frames


def build_row2_auto_attack(tpl):
    """
    Row 2 (`AUTO_ATTACK`, 30 frames):
    30fps Pyromantic Fireball Cast:
    - F00..F09: Drawing the Sun-Staff back while igniting a swirling solar sphere in his left palm.
    - F10..F18: Forward staff thrust & fireball projection with billowing robe flare.
    - F19..F29: Follow-through recovery.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        use_cast_body = 9 <= f <= 21
        base = (tpl['cast_body'] if use_cast_body else tpl['stand']).copy()

        # Recoil shift on fireball projection frames F11..F13
        if f in (11, 12, 13):
            base = np.roll(base, -1, axis=1)
            base[:, -1:] = 0

        base = apply_robe_cloak_wave(
            base, phase * 1.5, amplitude=2.1 if 10 <= f <= 18 else 1.5, vertical_flutter=0.7
        )

        if f <= 9:
            # F00..F09: Draw Sun-Staff back while igniting swirling solar sphere in left palm
            u = f / 9.0
            staff_deg = -81.0 - u * 20.0  # Tilts back to -101 deg
            grip_x = 6.0 - u * 2.2
            grip_y = 0.5 - u * 1.5
            charge = 3 if f >= 7 else (2 if f >= 4 else 1)
            frame = draw_sun_staff(
                base,
                shoulder=(29, 20),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=14.5,
                bot_len=22.0,
                phase_rad=phase * 2.0,
                charge_level=charge,
                left_orb_mode='palm_charge',
                left_hand_pos=(19 - int(round(u * 2.0)), 19 - int(round(u * 1.5))),
            )
        elif f <= 18:
            # F10..F18: Forward staff thrust & fireball projection toward +X!
            k = f - 10
            u = k / 8.0
            if k <= 2:
                staff_deg = -45.0 + k * 18.0  # -45 -> -27 -> -9 deg forward thrust!
            else:
                staff_deg = -9.0 - (k - 2) * 2.0
            grip_x = 7.5 + (1.0 if k in (1, 2, 3) else 0.0)
            frame = draw_sun_staff(
                base,
                shoulder=(30, 19),
                grip_offset=(grip_x, -1.0),
                staff_deg=staff_deg,
                top_len=14.5,
                bot_len=18.5,
                phase_rad=phase * 2.0,
                charge_level=3 if k <= 3 else 2,
                release_flash=(k in (1, 2, 3)),
                left_orb_mode='forward_cast',
                left_hand_pos=(35 + min(3, k), 18),
            )
        else:
            # F19..F29: Smooth follow-through recovery back to -81 deg
            u = (f - 18) / 11.0
            staff_deg = -21.0 * (1.0 - u) + (-81.0) * u
            grip_x = 7.0 * (1.0 - u) + 6.0 * u
            grip_y = -1.0 * (1.0 - u) + 0.5 * u
            frame = draw_sun_staff(
                base,
                shoulder=(29, 20),
                grip_offset=(grip_x, grip_y),
                staff_deg=staff_deg,
                top_len=14.5,
                bot_len=23.5,
                phase_rad=phase,
                charge_level=1 if f <= 21 else 0,
                left_orb_mode='idle_orb' if f >= 24 else 'none',
                left_hand_pos=(14, 21),
            )

        frames.append(frame)
    return frames


def build_row3_skill(tpl):
    """
    Row 3 (`SKILL` - Hellfire Pillars + Solar Detonation, 30 frames):
    - Phase 1 (F00..F14): Raises the Sun-Staff high overhead (F00..F06) and slams the butt of the staff
      into the ground (F07..F14) with a magma shockwave ring at his feet to erupt Hellfire Pillars.
    - Phase 2 (F15..F29): Sweeps his arm and staff forward in a wide pyromantic arc (F15..F22)
      to detonate the pillars, followed by ember recovery (F23..F29).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi

        if f <= 6:
            # Phase 1A (F00..F06): Raise Sun-Staff high overhead with blazing solar corona (unclipped inside y>=2)
            u = f / 6.0
            lift_dy = -1 if f >= 3 else 0
            base = tpl['stand'].copy()
            if lift_dy != 0:
                base = np.roll(base, lift_dy, axis=0)
                base[-1:, :] = 0
            base = apply_robe_cloak_wave(base, phase * 2.0, amplitude=1.9, vertical_flutter=0.8)
            frame = draw_sun_staff(
                base,
                shoulder=(29, 19 + lift_dy),
                grip_offset=(5.5, -u * 2.2),
                staff_deg=-88.0,
                top_len=12.0,
                bot_len=23.0,
                phase_rad=phase * 2.0,
                charge_level=3 if f >= 4 else 2,
                left_orb_mode='palm_charge',
                left_hand_pos=(18, 15 - int(round(u * 2.5))),
            )
        elif f <= 14:
            # Phase 1B (F07..F14): Slam staff butt into the ground with expanding magma shockwave ring!
            k = f - 7
            u = k / 7.0
            crouch_seq = [2, 3, 3, 2, 2, 1, 1, 0]
            cd = crouch_seq[k]
            base = make_crouch_body(tpl, cd) if cd > 0 else tpl['stand'].copy()
            base = apply_robe_cloak_wave(base, phase * 2.5, amplitude=2.2, vertical_flutter=0.9)
            frame = draw_sun_staff(
                base,
                shoulder=(29, 20 + cd),
                grip_offset=(6.2, 2.5),  # Slammed down so butt strikes y=48 ground!
                staff_deg=-89.0,
                top_len=14.0,
                bot_len=26.0,
                phase_rad=phase * 2.5,
                charge_level=3 if k <= 3 else 2,
                ground_shockwave=min(1.0, (k + 1) / 7.5),
            )
        elif f <= 22:
            # Phase 2A (F15..F22): Wide forward pyromantic staff sweep & pillar detonation!
            k = f - 15
            u = k / 7.0
            base = tpl['cast_body'].copy()
            base = apply_robe_cloak_wave(base, phase * 2.0, amplitude=2.3, vertical_flutter=0.9)
            # Sweeps from -72 deg down to -8 deg forward!
            sweep_angles = [-68.0, -42.0, -18.0, -8.0, -6.0, -10.0, -18.0, -28.0]
            staff_deg = sweep_angles[k]
            frame = draw_sun_staff(
                base,
                shoulder=(30, 19),
                grip_offset=(7.2, -0.5),
                staff_deg=staff_deg,
                top_len=14.5,
                bot_len=18.5,
                phase_rad=phase * 2.0,
                charge_level=3 if k in (2, 3, 4) else 2,
                release_flash=(k in (2, 3)),
                left_orb_mode='forward_cast',
                left_hand_pos=(36, 18),
            )
            # Add wide crescent pyromantic flame arc on sweep frames F16..F20
            if 1 <= k <= 5:
                for a_deg in range(int(staff_deg) - 28, int(staff_deg) + 6, 4):
                    ar = math.radians(a_deg)
                    ax = 37 + math.cos(ar) * 13.5
                    ay = 19 + math.sin(ar) * 13.5
                    set_px(frame, ax, ay, SOLAR_YELLOW if a_deg > staff_deg - 12 else FLAME_ORANGE)
                    set_px(frame, ax - 1, ay, FLAME_CRIMSON)
        else:
            # Phase 2B (F23..F29): Ember recovery back to standing stance
            u = (f - 22) / 7.0
            base = apply_robe_cloak_wave(tpl['stand'].copy(), phase, amplitude=1.6, vertical_flutter=0.6)
            staff_deg = -28.0 * (1.0 - u) + (-81.0) * u
            frame = draw_sun_staff(
                base,
                shoulder=(29, 20),
                grip_offset=(6.0, 0.5),
                staff_deg=staff_deg,
                top_len=14.5,
                bot_len=23.5,
                phase_rad=phase,
                charge_level=1 if f <= 25 else 0,
                left_orb_mode='idle_orb',
                left_hand_pos=(14, 21),
            )

        frames.append(frame)
    return frames


def build_row4_ultimate(tpl):
    """
    Row 4 (`ULTIMATE` - Cataclysm: Eclipse Supernova, 30 frames):
    - Stage 1 (F00..F10): Levitates slightly with arms and Sun-Staff raised toward the heavens,
      conjuring a miniature black-gold Eclipse corona above his crown.
    - Stage 2 (F11..F20): Channels full solar overdrive with blazing golden-crimson mantle flames
      and orbiting fire runes.
    - Stage 3 (F21..F29): Sweeps both hands and the Sun-Staff forward to unleash the Cataclysm Solar Beam.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi

        if f <= 10:
            # Stage 1 (F00..F10): Ascend into levitation, raise Sun-Staff skyward, conjure Eclipse above crown
            u = f / 10.0
            tuck = min(0.55, u * 0.65)
            lev_dy = -int(round(u * 2.0))
            body = make_jump_body(tpl, lev_dy, tuck_amount=tuck) if f >= 2 else tpl['stand'].copy()
            body = apply_robe_cloak_wave(body, phase * 2.0, amplitude=2.0, vertical_flutter=0.9)
            staff_deg = -80.0 - u * 7.0
            frame = draw_sun_staff(
                body,
                shoulder=(29, 19 + lev_dy),
                grip_offset=(5.5, -u * 1.2),
                staff_deg=staff_deg,
                top_len=11.8,
                bot_len=21.0,
                phase_rad=phase * 2.0,
                charge_level=2 if f >= 5 else 1,
                left_orb_mode='palm_charge',
                left_hand_pos=(17, 14 + lev_dy),
                solar_wings=u * 0.6,
                eclipse_crown=min(1.0, u * 1.1),
            )
        elif f <= 20:
            # Stage 2 (F11..F20): Full Solar Overdrive levitation with blazing mantle wings & orbiting fire runes!
            k = f - 11
            u = k / 9.0
            lev_dy = -2
            body = make_jump_body(tpl, lev_dy, tuck_amount=0.55)
            body = apply_robe_cloak_wave(body, phase * 3.0, amplitude=2.4, vertical_flutter=1.1)
            frame = draw_sun_staff(
                body,
                shoulder=(29, 19 + lev_dy),
                grip_offset=(5.5, -1.2),
                staff_deg=-86.0 + math.sin(phase * 2.0) * 3.0,
                top_len=11.8,
                bot_len=21.0,
                phase_rad=phase * 3.0,
                charge_level=3,
                left_orb_mode='palm_charge',
                left_hand_pos=(16, 13 + lev_dy),
                solar_wings=1.0,
                eclipse_crown=1.0,
            )
            # 4 Orbiting Fire Runes revolving around Ignis in 3D ellipse
            for r_i in range(4):
                ra = phase * 3.0 + r_i * (math.pi * 0.5)
                rx = 25.0 + math.cos(ra) * 14.0
                ry = 26.0 + math.sin(ra) * 5.0
                set_px(frame, rx, ry, SOLAR_WHITE)
                set_px(frame, rx, ry - 1, SOLAR_YELLOW)
                set_px(frame, rx, ry + 1, FLAME_ORANGE)
        else:
            # Stage 3 (F21..F29): Sweep both hands and Sun-Staff forward to unleash Cataclysm Solar Beam!
            k = f - 21
            u = k / 8.0
            tuck = max(0.0, 0.55 * (1.0 - u))
            lev_dy = -2 if k <= 3 else (-1 if k <= 5 else 0)
            body = make_jump_body(tpl, lev_dy, tuck_amount=tuck, torso_lean_dx=1 if k <= 5 else 0) if tuck > 0.08 else tpl['cast_body'].copy()
            body = apply_robe_cloak_wave(body, phase * 2.5, amplitude=2.4, vertical_flutter=1.0)
            staff_deg = -6.0 if k <= 4 else (-6.0 - (k - 4) * 16.0)
            frame = draw_sun_staff(
                body,
                shoulder=(30, 19 + lev_dy),
                grip_offset=(7.2, -0.5),
                staff_deg=staff_deg,
                top_len=14.5,
                bot_len=18.5,
                phase_rad=phase * 2.5,
                charge_level=3 if k <= 5 else 2,
                release_flash=(k <= 4),
                left_orb_mode='forward_cast' if k <= 5 else 'idle_orb',
                left_hand_pos=(36, 18 + lev_dy) if k <= 5 else (15, 21),
                solar_wings=max(0.0, 1.0 - u * 0.9),
                eclipse_crown=max(0.0, 1.0 - u * 0.8),
            )

        # Ground levitation ember vortex under his boots while airborne (F02..F25)
        if 2 <= f <= 25:
            for gx_i in range(4):
                gx = 18 + ((f * 3 + gx_i * 4) % 16)
                gy = 48 + (gx_i % 2)
                set_px(frame, gx, gy, SOLAR_YELLOW if gx_i % 2 == 0 else FLAME_ORANGE)

        frames.append(frame)
    return frames


def build_row5_death(tpl):
    """
    Row 5 (`DEATH` & `HURT`, 30 frames):
    - F00..F06: Hit-stagger recoil (`HURT` uses F00..F05).
    - F07..F17: Drops to knees, robes pooling on the ground, leaning on his dimming Sun-Staff.
    - F18..F29: Collapses horizontally onto the ground (y=38..46) with his Sun-Staff lying flat
      beside him (ZERO floating upright staff!).
    """
    frames = []
    for f in range(30):
        if f <= 6:
            # F00..F06: Hit-stagger recoil backward
            u = f / 6.0
            dx = -int(round(u * 2.0))
            dy = int(round(u * 2.0))
            base = np.zeros((52, 52, 4), dtype=np.uint8)
            for y in range(52):
                for x in range(52):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < 52 and 0 <= nx < 52:
                        base[ny, nx] = tpl['stand'][y, x]
            base = apply_robe_cloak_wave(base, u * math.pi, amplitude=1.7, vertical_flutter=0.6)
            frame = draw_sun_staff(
                base,
                shoulder=(29 + dx, 20 + dy),
                grip_offset=(5.5, 1.0),
                staff_deg=-76.0 + u * 26.0,  # Tilts forward as he staggers
                top_len=14.0,
                bot_len=22.0,
                phase_rad=u * math.pi,
                charge_level=0,
            )
            frames.append(frame)

        elif f <= 17:
            # F07..F17: Drops to knees, robes pooling on the ground, leaning on his dimming Sun-Staff
            k = f - 7
            u = k / 10.0
            base = (tpl['kneel1'] if k <= 4 else tpl['kneel2']).copy()
            # Progressive downward slump during final kneeling frames F14..F17
            slump_dy = 1 if k in (7, 8) else (2 if k >= 9 else 0)
            if slump_dy > 0:
                shifted = np.zeros((52, 52, 4), dtype=np.uint8)
                for y in range(52):
                    ny = min(49, y + slump_dy)
                    shifted[ny, :] = base[y, :]
                base = shifted

            base = apply_robe_cloak_wave(base, u * math.pi, amplitude=1.0, vertical_flutter=0.3)
            # Staff tilts progressively down toward horizontal (-52 deg -> -14 deg) as he collapses
            staff_deg = -52.0 + u * 38.0
            frame = draw_sun_staff(
                base,
                shoulder=(32, 22 + slump_dy),
                grip_offset=(4.5, 2.0),
                staff_deg=staff_deg,
                top_len=12.5,
                bot_len=18.0,
                phase_rad=u * math.pi,
                charge_level=0,
            )
            frames.append(frame)

        else:
            # F18..F29: Collapsed horizontally onto the ground (y=38..46) with Sun-Staff lying FLAT beside him!
            # ZERO floating upright staff!
            k = f - 18
            frame = tpl['fall'].copy()
            if k == 0:
                # Slight 1px settle on initial impact frame F18
                frame = np.roll(frame, -1, axis=0)
                frame[-1, :] = 0

            # Draw the Solar Sun-Staff lying flat horizontally on the arena floor (y=46..48, x=14..45)
            staff_floor = np.zeros((52, 52, 4), dtype=np.uint8)
            draw_line_px(staff_floor, 14, 47, 41, 47, GOLD_TRIM)
            draw_line_px(staff_floor, 14, 48, 41, 48, WOOD_DARK)
            # Golden bands on fallen shaft
            for bx_band in (18, 28, 37):
                set_px(staff_floor, bx_band, 47, GOLD_BRIGHT)
            # Horizontal Sun-Wheel Finial lying flat on the right at (43, 47)
            for dx in (-1, 0, 1, 2):
                set_px(staff_floor, 43 + dx, 46, GOLD_MID)
                set_px(staff_floor, 43 + dx, 48, GOLD_DARK)
            set_px(staff_floor, 45, 47, GOLD_BRIGHT)
            # Dimming solar ember inside the fallen finial + rising dying ember mote
            ember_col = SOLAR_YELLOW if k == 0 else (FLAME_ORANGE if k <= 3 else (CRIMSON_MID if k <= 7 else CRIMSON_DARK))
            set_px(staff_floor, 43, 47, ember_col)
            set_px(staff_floor, 44, 47, GOLD_MID if k <= 4 else GOLD_DARK)
            if k < 11:
                mote_x = 43 - (k % 3)
                mote_y = 45 - k
                set_px(staff_floor, mote_x, mote_y, FLAME_ORANGE if k < 5 else CRIMSON_MID)

            frame = composite_over(frame, add_outline_to_layer(staff_floor))
            frames.append(frame)

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
            frame = draw_sun_staff(
                base,
                shoulder=(31 if f >= 2 else 29, 20 + (0 if f >= 2 else cd)),
                grip_offset=(6.0, 0.0),
                staff_deg=-75.0 + u * 55.0,
                top_len=14.0,
                bot_len=20.0,
                phase_rad=phase * 2.0,
                charge_level=2,
            )
        elif f <= 21:
            # F04..F21: Low aerodynamic forward flame-glide dash wrapped in streaming solar embers!
            k = f - 4
            hover_dy = -1 if 3 <= k <= 14 else 0
            base = tpl['dash'].copy()
            if hover_dy != 0:
                base = np.roll(base, hover_dy, axis=0)
                base[-1:, :] = 0
            base = apply_robe_cloak_wave(base, k * 0.85, amplitude=2.3, is_dash=True)

            is_snap_cast = 8 <= k <= 11
            frame = draw_sun_staff(
                base,
                shoulder=(33, 21 + hover_dy),
                grip_offset=(5.5, -0.5),
                staff_deg=-12.0 if is_snap_cast else -18.0,
                top_len=13.5,
                bot_len=18.0,
                phase_rad=phase * 2.5,
                charge_level=3 if is_snap_cast else 2,
                release_flash=(k in (9, 10)),
            )

            # Streaming horizontal solar flame streaks & crimson robe embers trailing behind (x=2..24)
            for s_i in range(5):
                sx = 3 + ((f * 4 + s_i * 5) % 19)
                sy = 24 + s_i * 4 + int(round(math.sin(phase * 2.0 + s_i) * 1.0))
                set_px(frame, sx, sy, SOLAR_YELLOW if s_i % 2 == 0 else FLAME_ORANGE)
                set_px(frame, max(1, sx - 1), sy, FLAME_CRIMSON)
        else:
            # F22..F29: Smooth braking slide & recovery to standing stance
            k = f - 22
            u = k / 7.0
            cd = [2, 2, 1, 1, 0, 0, 0, 0][k]
            base = make_crouch_body(tpl, cd) if cd > 0 else tpl['stand'].copy()
            base = apply_robe_cloak_wave(base, phase * 1.5, amplitude=1.7, vertical_flutter=0.6)
            staff_deg = -22.0 * (1.0 - u) + (-81.0) * u
            frame = draw_sun_staff(
                base,
                shoulder=(29, 20 + cd),
                grip_offset=(6.0, 0.5),
                staff_deg=staff_deg,
                top_len=14.5,
                bot_len=23.0,
                phase_rad=phase,
                charge_level=1 if k <= 2 else 0,
                left_orb_mode='idle_orb' if k >= 4 else 'none',
                left_hand_pos=(14, 21 + cd),
            )

        frames.append(frame)
    return frames


def build_row7_crouch(tpl):
    """
    Row 7 (`CROUCH`, 30 frames):
    - F00..F06: Drops into a low pyromantic kneeling crouch (7px lower silhouette),
      planting his Sun-Staff diagonally and conjuring a spinning Flame-Ward shield ring in front of him.
    - F07..F18: Launches a low skimming Solar Fireball from his crouched stance (F11..F16).
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
            frame = draw_sun_staff(
                base,
                shoulder=(29, 20 + d),
                grip_offset=(5.5, 0.5),
                staff_deg=staff_deg,
                top_len=13.5,
                bot_len=19.0,
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
                base = np.roll(base, -1, axis=1)
                base[:, -1:] = 0
            base = apply_robe_cloak_wave(base, phase * 1.5, amplitude=1.5, vertical_flutter=0.4)

            is_firing = 4 <= k <= 9  # F11..F16
            if k < 4:
                staff_deg = -52.0 + (k / 4.0) * 38.0  # Lowers staff to horizontal crouched aim (-14 deg)
            elif k <= 8:
                staff_deg = -6.0  # Aimed horizontally from crouched stance!
            else:
                staff_deg = -6.0 - (k - 8) * 14.0

            frame = draw_sun_staff(
                base,
                shoulder=(29, 20 + d),
                grip_offset=(6.5 if is_firing else 5.8, 0.0),
                staff_deg=staff_deg,
                top_len=13.5,
                bot_len=17.5,
                phase_rad=phase * 2.5,
                charge_level=3 if (3 <= k <= 7) else 2,
                release_flash=(f in (11, 12, 13)),
                left_orb_mode='ward_shield',
                left_hand_pos=(42, 28),
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
            frame = draw_sun_staff(
                base,
                shoulder=(29, 20 + d),
                grip_offset=(6.0, 0.5),
                staff_deg=staff_deg,
                top_len=14.0,
                bot_len=22.5,
                phase_rad=phase,
                charge_level=0,
                left_orb_mode='idle_orb' if d <= 2 else 'none',
                left_hand_pos=(14, 21 + d),
            )

        frames.append(frame)
    return frames


def build_row8_jump(tpl):
    """
    Row 8 (`JUMP`, 30 frames - ZERO bouncy-ball frames!):
    Full-body Flame-Glide Aerial Vault & mid-air downward Fireball cast:
    - F00..F04: Knee-bend launch with ember burst at boots
    - F05..F11: Ascending aerial vault with robes & hat streaming cleanly
    - F12..F18: Apex mid-air hover aiming his Sun-Staff downward at +35 deg to fire a blazing Solar Fireball
    - F19..F24: Descending flame-cushioned glide
    - F25..F29: Soft landing
    Every frame shows Ignis's full wizard hat, robes, boots, and Sun-Staff - NEVER a round ball!
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi

        if f <= 4:
            # F00..F04: Knee-bend launch with ember burst at boots
            crouch_seq = [1, 3, 4, 2, 0]
            cd = crouch_seq[f]
            body = make_crouch_body(tpl, cd) if cd >= 2 else make_jump_body(tpl, cd, tuck_amount=0.25)
            body = apply_robe_cloak_wave(body, phase * 2.0, amplitude=1.8, vertical_flutter=0.8)
            staff_deg = [-78.0, -68.0, -62.0, -45.0, -28.0][f]
            frame = draw_sun_staff(
                body,
                shoulder=(29, 20 + cd),
                grip_offset=(6.0, 0.5),
                staff_deg=staff_deg,
                top_len=14.0,
                bot_len=21.0,
                phase_rad=phase * 2.0,
                charge_level=1 if f >= 3 else 0,
            )
            if f >= 2:
                for ex in (18, 22, 27, 31):
                    set_px(frame, ex, 48, SOLAR_YELLOW if ex % 2 == 0 else FLAME_ORANGE)
                    set_px(frame, ex, 49, FLAME_CRIMSON)

        elif f <= 11:
            # F05..F11: Ascending full-body aerial vault with robes & wizard hat streaming cleanly
            k = f - 5
            u = k / 6.0
            tuck = 0.45 + 0.50 * math.sin(u * math.pi * 0.65)
            body = make_jump_body(tpl, 0, tuck_amount=tuck, torso_lean_dx=1 if k >= 3 else 0)
            body = apply_robe_cloak_wave(body, phase * 2.0, amplitude=2.3, vertical_flutter=1.0)
            # Sweeps Sun-Staff from -20 deg down toward +35 deg aerial aim
            staff_deg = -20.0 * (1.0 - u) + 32.0 * u
            frame = draw_sun_staff(
                body,
                shoulder=(30, 19),
                grip_offset=(6.2, 0.0),
                staff_deg=staff_deg,
                top_len=13.5,
                bot_len=18.5,
                phase_rad=phase * 2.0,
                charge_level=2 if k >= 4 else 1,
                left_orb_mode='palm_charge' if k >= 3 else 'none',
                left_hand_pos=(20, 18),
            )
            # Flame propulsion embers beneath his aerial boots
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
            frame = draw_sun_staff(
                body,
                shoulder=(30 + recoil_dx, 19),
                grip_offset=(6.5, 0.5),
                staff_deg=staff_deg,
                top_len=13.5,
                bot_len=18.0,
                phase_rad=phase * 2.5,
                charge_level=3 if k <= 4 else 2,
                release_flash=(k in (2, 3, 4)),  # Fires downward fireball on F14..F16!
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
            frame = draw_sun_staff(
                body,
                shoulder=(29, 20),
                grip_offset=(6.0, 0.5),
                staff_deg=staff_deg,
                top_len=14.0,
                bot_len=21.0,
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
            frame = draw_sun_staff(
                body,
                shoulder=(29, 20 + cd),
                grip_offset=(6.0, 0.5),
                staff_deg=staff_deg,
                top_len=14.5,
                bot_len=23.5,
                phase_rad=phase,
                charge_level=0,
                left_orb_mode='idle_orb' if cd <= 1 else 'none',
                left_hand_pos=(14, 21 + cd),
            )

        frames.append(frame)
    return frames


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
