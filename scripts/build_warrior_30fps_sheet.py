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
        'lunge': cell(2, 3),
        'cleave_down': cell(2, 4),
        'kneel1': cell(4, 1),
        'kneel2': cell(4, 3),
        'fall': cell(4, 4),
        'dash': cell(5, 2),
    }


def make_clean_templates(src):
    """
    Strips all baked-in swords/weapons from Aethelgard's master poses so we draw
    EXACTLY ONE crisp articulated Runeblade per frame — zero duplicate swords or ghost blades.
    """
    # 1. Clean standing body (strip the diagonal sword at x >= 30, y = 4..28)
    stand = src['idle'].copy()
    down = src['cleave_down'].copy()
    # Copy clean right chest/pauldron/waist edge from cleave_down where sword was down
    stand[14:27, 26:32] = down[14:27, 26:32]
    for y in range(0, 30):
        for x in range(0, 52):
            if y <= 14 and x >= 30:
                stand[y, x] = 0
            elif 15 <= y <= 21 and x >= 32:
                stand[y, x] = 0
            elif 22 <= y <= 28 and x >= 31:
                stand[y, x] = 0
    stand = add_outline_to_layer(stand)

    # Extract Aethelgard's actual pixel-art Left (Back) Leg/Sabaton and Right (Front) Leg/Sabaton
    leg_back_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_front_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_back_patch[39:50, 9:20] = stand[39:50, 9:20]
    leg_front_patch[39:50, 25:36] = stand[39:50, 25:36]

    # Upper torso + tassets (without lower legs y >= 40) for walk/crouch/jump articulation
    stand_upper = stand.copy()
    stand_upper[40:, :, :] = 0
    stand_upper[40:44, :10, :] = stand[40:44, :10, :]
    stand_upper = add_outline_to_layer(stand_upper)

    # 2. Clean forward-lunging body (from lunge cell(2, 3), stripping baked-in sword)
    lunge = src['lunge'].copy()
    for y in range(0, 31):
        for x in range(0, 52):
            if y <= 13 and x >= 35:
                lunge[y, x] = 0
            elif 14 <= y <= 21 and x >= 36:
                lunge[y, x] = 0
            elif 22 <= y <= 29 and x >= 35:
                lunge[y, x] = 0
    lunge = add_outline_to_layer(lunge)

    # 3. Clean kneeling bodies (kneel1, kneel2) with vertical planted sword on right (x >= 32) removed
    kneel1 = src['kneel1'].copy()
    kneel2 = src['kneel2'].copy()
    for kn in (kneel1, kneel2):
        kn[:, 32:, :] = 0
        for y in range(8, 22):
            for x in range(30, 33):
                if y <= 14 and x >= 31:
                    kn[y, x] = 0
    kneel1 = add_outline_to_layer(kneel1)
    kneel2 = add_outline_to_layer(kneel2)

    # 4. Clean horizontal fallen body (strip floor sword at y >= 45 so we can place our single flat Runeblade cleanly)
    fall = src['fall'].copy()
    fall[45:, :, :] = 0
    fall = add_outline_to_layer(fall)

    # 5. Clean dash body (from cell(5, 2) with high-streaming cape, stripping baked-in sword at x >= 30, y <= 28)
    dash = src['dash'].copy()
    dash[15:27, 26:32] = down[15:27, 26:32]
    for y in range(0, 30):
        for x in range(0, 52):
            if y <= 15 and x >= 30:
                dash[y, x] = 0
            elif 16 <= y <= 22 and x >= 32:
                dash[y, x] = 0
            elif 23 <= y <= 28 and x >= 31:
                dash[y, x] = 0
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
    without disturbing his armored torso, head, or legs.
    """
    out = frame.copy()
    if is_dash:
        cape_region = frame[4:36, 0:21].copy()
        out[4:36, 0:21] = 0
        for y in range(4, 36):
            for x in range(0, 21):
                if cape_region[y - 4, x, 3] == 0:
                    continue
                if y >= 28 and x >= 13:
                    out[y, x] = cape_region[y - 4, x]
                    continue
                dist_from_shoulder = max(0.0, (21 - x) / 17.0)
                dy = int(round(math.sin(phase_rad - dist_from_shoulder * 3.2) * amplitude * dist_from_shoulder))
                dx = int(round(math.cos(phase_rad * 2.0 - dist_from_shoulder * 2.4) * 0.8 * dist_from_shoulder))
                ny = max(2, min(44, y + dy))
                nx = max(1, min(21, x + dx))
                out[ny, nx] = cape_region[y - 4, x]
        return add_outline_to_layer(out)

    cape_mask = np.zeros((52, 52), dtype=bool)
    for y in range(13, 44):
        max_cape_x = 18 if y < 35 else 10
        for x in range(1, max_cape_x + 1):
            if frame[y, x, 3] > 0:
                cape_mask[y, x] = True

    cape_pixels = frame.copy()
    out[cape_mask] = 0

    for y in range(13, 44):
        u = (y - 13) / 30.0
        wave_x = math.sin(phase_rad - u * 3.5) * (amplitude * (0.25 + 0.85 * u))
        wave_y = math.cos(phase_rad - u * 2.8) * (vertical_flutter * u)
        dx = int(round(wave_x))
        dy = int(round(wave_y))
        max_cape_x = 18 if y < 35 else 10
        for x in range(1, max_cape_x + 1):
            if not cape_mask[y, x]:
                continue
            nx = max(1, min(20, x + dx))
            ny = max(13, min(46, y + dy))
            if out[ny, nx, 3] == 0:
                out[ny, nx] = cape_pixels[y, x]
            if dx < 0 and x >= max_cape_x - 3 and out[y, x, 3] == 0:
                out[y, x] = cape_pixels[y, x]

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


def draw_runeblade(
    canvas,
    hand_x,
    hand_y,
    angle_deg,
    glow_intensity=0.5,
    blade_len=21.5,
    shoulder=(26, 19),
    two_handed=False,
    draw_arm=True,
    slash_arc=None,
):
    """
    Renders Aethelgard's single articulated Runeblade (Armored Gauntlet + Winged Golden Crossguard +
    Sapphire-Pommel Hilt + Fullered Frost-Cyan Greatsword Blade with glowing Nordic Runes) onto `canvas`.
    """
    sword_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    fx_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    rad = math.radians(angle_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    px, py = -uy, ux

    hx, hy = float(hand_x), float(hand_y)

    # 1. Articulated Armored Sword-Arm from Shoulder to Gauntlet
    if draw_arm and shoulder is not None:
        sx, sy = shoulder
        draw_line_px(sword_layer, sx, sy, hx, hy, STEEL_DARK)
        draw_line_px(sword_layer, sx, sy - 1, hx - ux * 1.5, hy - uy * 1.5 - 1, STEEL_MID)
        set_px(sword_layer, sx + (hx - sx) * 0.45, sy + (hy - sy) * 0.45 - 1, STEEL_LIGHT)
        if two_handed:
            draw_line_px(sword_layer, sx - 3, sy + 1, hx - ux * 1.8, hy - uy * 1.8, STEEL_MID)

    # 2. Leather-Wrapped Hilt & Golden Pommel behind hand
    pom_x = hx - ux * 3.2
    pom_y = hy - uy * 3.2
    draw_line_px(sword_layer, pom_x, pom_y, hx, hy, LEATHER_DARK)
    set_px(sword_layer, pom_x, pom_y, GOLD_BRIGHT)
    set_px(sword_layer, pom_x - ux * 0.8, pom_y - uy * 0.8, FROST_CYAN)

    # 3. Guard Center & Broad Fullered Runeblade (from guard to diamond point)
    gx = hx + ux * 1.4
    gy = hy + uy * 1.4
    steps = int(round(blade_len * 2))
    for i in range(steps + 1):
        s = i / float(max(1, steps))
        dist = s * blade_len
        bx = gx + ux * dist
        by = gy + uy * dist

        # Taper near tip (s > 0.82)
        half_w = 1.35 * (1.0 - (s - 0.82) / 0.18) if s > 0.82 else 1.35

        # Outer steel/sapphire bevels
        if half_w >= 0.65:
            c_edge_top = FROST_BRIGHT if glow_intensity >= 0.45 else STEEL_BRIGHT
            c_edge_bot = FROST_MID if glow_intensity >= 0.35 else STEEL_MID
            set_px(sword_layer, bx + px * half_w, by + py * half_w, c_edge_top)
            set_px(sword_layer, bx - px * half_w, by - py * half_w, c_edge_bot)
            set_px(sword_layer, bx + px * (half_w * 0.5), by + py * (half_w * 0.5), FROST_CYAN)
            set_px(sword_layer, bx - px * (half_w * 0.5), by - py * (half_w * 0.5), FROST_MID)

        # Central fuller with engraved Nordic frost-gold runes
        is_rune = (int(round(dist)) % 4 == 2) and (0.15 <= s <= 0.78)
        if is_rune and glow_intensity > 0.2:
            core_col = GOLD_WHITE if glow_intensity > 0.75 else (GOLD_BRIGHT if glow_intensity > 0.45 else FROST_WHITE)
        else:
            core_col = FROST_WHITE if glow_intensity > 0.6 else FROST_CORE
        set_px(sword_layer, bx, by, core_col)

    # 4. Ornate Winged Golden Valkyrie Crossguard (drawn over blade base)
    for span in (-3.2, -2.2, -1.2, 0.0, 1.2, 2.2, 3.2):
        wing_f = 0.6 if abs(span) > 2.0 else 0.0
        cx_g = gx + px * span + ux * wing_f
        cy_g = gy + py * span + uy * wing_f
        col_g = GOLD_WHITE if abs(span) < 0.5 else (GOLD_BRIGHT if abs(span) > 2.0 else GOLD_MID)
        set_px(sword_layer, cx_g, cy_g, col_g)
    # Central sapphire rune-gem in crossguard
    set_px(sword_layer, gx, gy, FROST_CYAN if glow_intensity < 0.7 else FROST_WHITE)

    # Armored Gauntlet Fist gripping the hilt
    set_px(sword_layer, hx, hy, STEEL_LIGHT)
    set_px(sword_layer, hx - px * 0.8, hy - py * 0.8, STEEL_MID)

    # 5. High-Intensity Rune Charge Star / Glint
    if glow_intensity >= 0.75:
        tip_x = gx + ux * (blade_len * 0.88)
        tip_y = gy + uy * (blade_len * 0.88)
        set_px(fx_layer, tip_x, tip_y, FROST_WHITE)
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            set_px(fx_layer, tip_x + dx, tip_y + dy, GOLD_BRIGHT if glow_intensity >= 0.9 else FROST_BRIGHT)

    # 6. Optional Dynamic Crescent Slash Trail
    if slash_arc is not None:
        a_start, a_end, arc_r, arc_intensity = slash_arc
        arc_steps = 36
        for k in range(arc_steps + 1):
            u_a = k / float(arc_steps)
            ang = math.radians(a_start + (a_end - a_start) * u_a)
            ca, sa = math.cos(ang), math.sin(ang)
            env = math.sin(u_a * math.pi) * arc_intensity
            if env <= 0.1:
                continue
            ax = shoulder[0] + ca * arc_r
            ay = shoulder[1] + sa * arc_r
            set_px(fx_layer, ax, ay, FROST_WHITE if u_a > 0.65 else GOLD_BRIGHT)
            set_px(fx_layer, ax - ca * 1.2, ay - sa * 1.2, FROST_BRIGHT)
            if env > 0.45:
                set_px(fx_layer, ax - ca * 2.4, ay - sa * 2.4, FROST_CYAN)
                set_px(fx_layer, ax - ca * 3.4, ay - sa * 3.4, FROST_MID)

    out = composite_over(canvas, sword_layer)
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
    # Left (back) sweeping Valkyrie wing + Right (front-upper) wing crest
    for side, base_x, ang_list in [
        (-1, sx - 3, [-162.0, -148.0, -134.0, -120.0, -106.0, -92.0, -78.0]),
        (+1, sx + 3, [-68.0, -54.0, -40.0, -26.0]),
    ]:
        for idx, deg0 in enumerate(ang_list):
            ang = math.radians(deg0 + math.sin(phase + idx * 0.5) * 3.5)
            max_len = (15.5 - idx * 1.3) if side == -1 else (11.5 - idx * 1.4)
            f_len = int(round(max_len * wing_span))
            for d in range(2, f_len + 1):
                wx = base_x + math.cos(ang) * d
                wy = sy + math.sin(ang) * d
                if d >= f_len - 1:
                    col = FROST_WHITE
                elif idx % 2 == 0:
                    col = GOLD_BRIGHT if d < f_len * 0.65 else FROST_BRIGHT
                else:
                    col = FROST_CYAN if d < f_len * 0.65 else FROST_MID
                set_px(wing_layer, wx, wy, col)
                if d < f_len - 2:
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

    # Projected hexagonal frost-gold barrier arc in front of shield when bracing
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
    Renders a grounded, heavy-armored 30-frame 2-step Valkyrie walk cycle (f = 0..29) in true painter's order:
    1. Far Leg Layer (shaded 0.78x for clear depth separation: articulated thigh, knee-guard, greave & sabaton).
    2. Flowing Royal Cape Layer (bridged solidly to back/hips so zero gap ever opens).
    3. Upper Torso & Pelvis + Royal Blue/Gold Split Tabard swinging with the stride.
    4. Near Leg Layer (full-brightness sculpted plate thigh, golden knee-guard, steel greave & sabaton).
    """
    phase = (f / 30.0) * 2.0 * math.pi
    bob_y = int(round(math.cos(phase * 2.0) * 1.0))

    stand = tpl['stand'].copy()
    cape_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    # 1. Extract Flowing Royal Cape (x <= 18, y = 13..43)
    for y in range(13, 44):
        ny = y + bob_y
        if not (0 <= ny < 52):
            continue
        u = (y - 13) / 30.0
        wave_dx = int(round(-u * 2.0 + math.sin(phase - u * 3.2) * (1.4 * u)))
        wave_dy = int(round(math.cos(phase - u * 2.6) * (0.7 * u)))
        for x in range(1, 19):
            if stand[y, x, 3] == 0:
                continue
            if y >= 34 and x > 11:
                continue
            cy = max(13, min(48, ny + wave_dy))
            cx = max(1, min(20, x + wave_dx))
            cape_layer[cy, cx] = stand[y, x]
            if x >= 11 and y <= 34:
                cape_layer[ny, x] = stand[y, x]
                if x + 1 < 20:
                    cape_layer[ny, x + 1] = stand[y, x]

    # 2. Extract Upper Torso, Pauldron & Winged Helm (y = 0..33, x >= 14) with +1px athletic forward lean
    for y in range(0, 34):
        ny = y + bob_y
        if not (0 <= ny < 52):
            continue
        lean_dx = 1 if y <= 26 else 0
        for x in range(14, 34):
            if stand[y, x, 3] > 0:
                torso_layer[ny, min(50, x + lean_dx)] = stand[y, x]

    hip_x = 23.5
    hip_y = 32.0 + bob_y

    def build_armored_leg(boot_patch, orig_cx, swing_phase, is_far_leg=False):
        layer = np.zeros((52, 52, 4), dtype=np.uint8)
        s_val = math.sin(swing_phase)   # +1 = extended forward (+x), -1 = extended backward (-x)
        c_val = math.cos(swing_phase)   # +1 = passing knee lift, -1 = planted ground push

        knee_lift = max(0.0, c_val)
        knee_x = hip_x + s_val * 4.5 + knee_lift * 2.0
        knee_y = hip_y + 5.0 - knee_lift * 1.8

        foot_target_x = 23.5 + s_val * 6.8 - knee_lift * 2.0
        foot_lift_dy = bob_y - int(round(knee_lift * 2.6))

        boot_rot_deg = s_val * 18.0 - knee_lift * 20.0
        pil_boot = Image.fromarray(boot_patch, mode='RGBA')
        rot_boot = np.array(
            pil_boot.rotate(boot_rot_deg, resample=Image.NEAREST, center=(orig_cx, 40.0)),
            dtype=np.uint8
        )

        dx_boot = int(round(foot_target_x - orig_cx))
        for y in range(36, 52):
            for x in range(3, 50):
                if rot_boot[y, x, 3] > 0:
                    ny = min(49, max(35, y + foot_lift_dy))
                    nx = min(49, max(4, x + dx_boot))
                    px_col = rot_boot[y, x].copy()
                    if is_far_leg:
                        px_col[0] = int(px_col[0] * 0.76)
                        px_col[1] = int(px_col[1] * 0.76)
                        px_col[2] = int(px_col[2] * 0.82)
                    layer[ny, nx] = px_col

        ank_x = foot_target_x + math.sin(math.radians(boot_rot_deg)) * 1.4
        ank_y = 41.0 + foot_lift_dy

        if is_far_leg:
            c_dark, c_mid, c_hi, c_gold = STEEL_DEEP, STEEL_DARK, STEEL_MID, GOLD_DARK
        else:
            c_dark, c_mid, c_hi, c_gold = STEEL_DARK, STEEL_MID, STEEL_LIGHT, GOLD_BRIGHT

        # Sculpted Plate Thigh Cuisse (Hip -> Knee)
        for off_x, col in [(-1.8, c_dark), (-0.8, c_mid), (0.2, c_hi), (1.2, c_mid), (2.0, c_dark)]:
            draw_line_px(layer, hip_x + off_x, hip_y, knee_x + off_x * 0.85, knee_y, col)

        # Sculpted Steel Shin Greave (Knee -> Sabaton Boot)
        for off_x, col in [(-1.4, c_dark), (-0.4, c_mid), (0.6, c_hi), (1.4, c_dark)]:
            draw_line_px(layer, knee_x + off_x, knee_y, ank_x + off_x * 0.85, ank_y, col)

        # Winged Golden Knee-Guard Poleyn
        set_px(layer, knee_x, knee_y, c_gold)
        set_px(layer, knee_x + 1, knee_y, c_gold)
        set_px(layer, knee_x, knee_y - 1, c_hi)
        return layer

    # F00..F14: right (near) leg swings forward (sin(phase) >= 0), left (far) leg swings back
    # F15..F29: left (far) leg swings forward, right (near) leg swings back
    far_leg = build_armored_leg(tpl['leg_back'], 13.5, phase + math.pi, is_far_leg=True)
    near_leg = build_armored_leg(tpl['leg_front'], 29.5, phase, is_far_leg=False)

    # Royal Blue & Gold Split Tabard swinging between the legs at y = 32..39
    tabard_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    flap_dx = math.sin(phase) * 2.0
    for off_x, col in [(-2.0, CAPE_ROYAL_DARK), (-1.0, CAPE_ROYAL_MID), (0.0, CAPE_ROYAL_HI), (1.0, GOLD_MID)]:
        draw_line_px(
            tabard_layer,
            hip_x + off_x,
            hip_y - 1.0,
            hip_x + off_x + flap_dx,
            hip_y + 6.2,
            col
        )

    # Back-to-front anatomical composition: Back Leg -> Cape -> Torso/Tabard -> Front Leg
    out = composite_over(far_leg, cape_layer)
    out = composite_over(out, tabard_layer)
    out = composite_over(out, near_leg)
    out = composite_over(out, torso_layer)
    return out


def make_crouch_body(tpl, crouch_depth):
    """
    Constructs a clean low-profile crouched Valkyrie body with `crouch_depth` in [1..7] logical pixels:
    - Uses `kneel1` bent armored legs anchored on the floor (y=36..50) when crouch_depth >= 5,
      or compressed standing legs when crouch_depth in 1..4.
    - Lowers `stand_upper` by `crouch_depth` pixels so Aethelgard drops into a true tactical knee-crouch!
    """
    canvas = np.zeros((52, 52, 4), dtype=np.uint8)
    if crouch_depth >= 5:
        canvas[36:51, :32] = tpl['kneel1'][36:51, :32]
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
    return add_outline_to_layer(canvas)


def make_jump_body(tpl, jump_dy, tuck_amount, torso_lean_dx=0):
    """
    Constructs a clean, full-body aerial jumping Valkyrie pose in back-to-front anatomical order:
    - Every frame preserves Aethelgard's full head, winged helm, chestplate, cape, and articulated legs
      (ZERO bouncy-ball frames!).
    """
    stand = tpl['stand'].copy()
    torso_dy = int(round(jump_dy))

    cape_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    # 1. Billowing Aerial Royal Cape (x <= 18, y = 13..43) streaming behind/below in mid-air
    cape_lift = int(round(max(0.0, tuck_amount) * 2.2))
    for y in range(13, 44):
        for x in range(1, 19):
            if stand[y, x, 3] == 0:
                continue
            if y >= 34 and x > 11:
                continue
            u = (y - 13) / 30.0
            cx = max(1, min(21, x - int(round(u * 2.5 * max(0.2, tuck_amount)))))
            cy = max(8, min(49, y + torso_dy + int(round(u * cape_lift))))
            cape_layer[cy, cx] = stand[y, x]
            if x >= 11 and y <= 33:
                ny_b = max(4, min(49, y + torso_dy))
                cape_layer[ny_b, x] = stand[y, x]

    # 2. Upper Torso & Winged Helm (y = 0..33, x >= 14)
    for y in range(0, 34):
        ny = y + torso_dy
        if not (0 <= ny < 52):
            continue
        dx = torso_lean_dx if y <= 24 else 0
        for x in range(14, 34):
            if stand[y, x, 3] > 0:
                torso_layer[ny, max(1, min(50, x + dx))] = stand[y, x]

    hip_x = 23.5 + (torso_lean_dx * 0.5)
    hip_y = 32.0 + torso_dy

    def build_aerial_armored_leg(boot_patch, orig_cx, knee_dx, knee_dy, foot_dx, foot_dy, boot_rot_deg, is_far_leg=False):
        layer = np.zeros((52, 52, 4), dtype=np.uint8)
        pil_boot = Image.fromarray(boot_patch, mode='RGBA')
        rot_boot = np.array(
            pil_boot.rotate(boot_rot_deg, resample=Image.NEAREST, center=(orig_cx, 40.0)),
            dtype=np.uint8
        )
        for y in range(34, 52):
            for x in range(3, 50):
                if rot_boot[y, x, 3] > 0:
                    ny = max(24, min(49, y + int(round(foot_dy))))
                    nx = max(3, min(49, x + int(round(foot_dx))))
                    px_col = rot_boot[y, x].copy()
                    if is_far_leg:
                        px_col[0] = int(px_col[0] * 0.76)
                        px_col[1] = int(px_col[1] * 0.76)
                        px_col[2] = int(px_col[2] * 0.82)
                    layer[ny, nx] = px_col

        kx = hip_x + knee_dx
        ky = hip_y + knee_dy
        ax = orig_cx + foot_dx
        ay = 41.0 + foot_dy

        if is_far_leg:
            c_dark, c_mid, c_hi, c_gold = STEEL_DEEP, STEEL_DARK, STEEL_MID, GOLD_DARK
        else:
            c_dark, c_mid, c_hi, c_gold = STEEL_DARK, STEEL_MID, STEEL_LIGHT, GOLD_BRIGHT

        for off_x, col in [(-1.6, c_dark), (-0.6, c_mid), (0.4, c_hi), (1.4, c_dark)]:
            draw_line_px(layer, hip_x + off_x, hip_y, kx + off_x * 0.85, ky, col)
        for off_x, col in [(-1.2, c_dark), (0.0, c_mid), (1.0, c_hi)]:
            draw_line_px(layer, kx + off_x, ky, ax + off_x * 0.85, ay, col)
        set_px(layer, kx, ky, c_gold)
        set_px(layer, kx + 1, ky, c_gold)
        return layer

    t = max(0.0, tuck_amount)
    far_leg = build_aerial_armored_leg(
        tpl['leg_back'],
        13.5,
        knee_dx=-3.0 * t - 1.5,
        knee_dy=4.0 - 1.5 * t,
        foot_dx=-2.5 * t,
        foot_dy=torso_dy - 3.5 * t,
        boot_rot_deg=-22.0 * t,
        is_far_leg=True
    )
    near_leg = build_aerial_armored_leg(
        tpl['leg_front'],
        29.5,
        knee_dx=4.8 * t + 1.5,
        knee_dy=3.0 - 2.6 * t,
        foot_dx=1.5 * t,
        foot_dy=torso_dy - 5.0 * t,
        boot_rot_deg=-24.0 * t,
        is_far_leg=False
    )

    tabard_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    for off_x, col in [(-2.0, CAPE_ROYAL_DARK), (-1.0, CAPE_ROYAL_MID), (0.0, CAPE_ROYAL_HI), (1.0, GOLD_MID)]:
        draw_line_px(tabard_layer, hip_x + off_x, hip_y - 1, hip_x + off_x + 1.5 * t, hip_y + 5.0 - 1.0 * t, col)

    out = composite_over(far_leg, cape_layer)
    out = composite_over(out, tabard_layer)
    out = composite_over(out, near_leg)
    out = composite_over(out, torso_layer)
    return out


def build_row0_idle(tpl):
    """
    Row 0 (`IDLE`, 30 frames):
    - Smooth breathing (`0..1px` chest/shoulder rise)
    - Flowing royal cape wave (`F00..F29`) with crimson/gold inner trim glint
    - Subtle helm wing/plume sway
    - Travelling frost-gold rune glint down the single articulated Runeblade
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        base = tpl['stand'].copy()

        breath_dy = -1 if 8 <= f <= 19 else 0
        if breath_dy != 0:
            upper = base[3:29, 17:32].copy()
            base[3:29, 17:32] = 0
            base[3 + breath_dy:29 + breath_dy, 17:32] = upper
            base = add_outline_to_layer(base)

        # Subtle helm wing/plume sway & golden crest glint
        plume_dx = 1 if 12 <= f <= 22 else 0
        if plume_dx != 0:
            set_px(base, 21, 5 + breath_dy, GOLD_BRIGHT)
            set_px(base, 28, 6 + breath_dy, GOLD_BRIGHT)
        elif f % 6 in (1, 2):
            set_px(base, 22, 5 + breath_dy, GOLD_WHITE)

        base = apply_cape_wave(base, phase, amplitude=1.6, vertical_flutter=0.7)

        blade_ang = -45.0 + math.sin(phase) * 2.5
        hx = 29
        hy = 24 + breath_dy
        frame = draw_runeblade(
            base,
            hand_x=hx,
            hand_y=hy,
            angle_deg=blade_ang,
            glow_intensity=0.45 + 0.25 * math.sin(phase),
            blade_len=21.5,
            shoulder=(25, 18 + breath_dy)
        )

        # Travelling frost-gold rune glint running along the Runeblade fuller (F00..F29)
        glint_u = (f / 29.0)
        glint_dist = 2.5 + (glint_u * 17.5 if f < 15 else (1.0 - (f - 15) / 14.0) * 17.5)
        rad = math.radians(blade_ang)
        gx = hx + math.cos(rad) * (1.4 + glint_dist)
        gy = hy + math.sin(rad) * (1.4 + glint_dist)
        set_px(frame, gx, gy, FROST_WHITE)
        set_px(frame, gx + 1, gy, GOLD_BRIGHT)
        set_px(frame, gx, gy - 1, FROST_BRIGHT)

        frames.append(frame)
    return frames


def build_row1_walk(tpl):
    """
    Row 1 (`WALK`, 30 frames):
    - Anatomical 2-step armored walk cycle:
      * F00..F14: right leg forward / left leg back
      * F15..F29: left leg forward / right leg back
    - Back-to-front painter's order with swinging Runeblade & pauldron.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        body = render_walk_legs(tpl, f)
        bob_y = int(round(math.cos(phase * 2.0) * 1.0))

        # Counter-swinging Runeblade carry angle & hand position
        swing = math.sin(phase)
        blade_ang = -38.0 + swing * 10.5
        hx = 29 - int(round(swing * 2.0))
        hy = 24 + bob_y + int(round(abs(swing) * 1.0))

        frame = draw_runeblade(
            body,
            hand_x=hx,
            hand_y=hy,
            angle_deg=blade_ang,
            glow_intensity=0.5,
            blade_len=21.0,
            shoulder=(26, 18 + bob_y)
        )
        frames.append(frame)
    return frames


def build_row2_auto_attack(tpl):
    """
    Row 2 (`AUTO_ATTACK`, 30 frames):
    - F00..F09: Progressive overhead/back-shoulder windup with frost rune charge
    - F10..F18: Explosive forward cleave & frost-gold slash arc with dynamic cape whip
    - F19..F29: Follow-through and smooth stance recovery
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi

        if f <= 9:
            # Progressive overhead/back-shoulder windup with frost rune convergence
            u = f / 9.0
            base = tpl['stand'].copy()
            coil_dx = -1 if f >= 4 else 0
            if coil_dx != 0:
                base = np.roll(base, coil_dx, axis=1)
                base[:, -1:] = 0
            base = apply_cape_wave(base, phase, amplitude=1.6 + u * 0.6, vertical_flutter=0.7)

            ang = -45.0 * (1.0 - u) + (-142.0) * u
            hx = int(round(29 * (1.0 - u) + 23 * u))
            hy = int(round(24 * (1.0 - u) + 12 * u))
            glow = 0.45 + u * 0.55
            frame = draw_runeblade(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=glow,
                blade_len=21.0,
                shoulder=(25 + coil_dx, 17),
                two_handed=(f >= 3)
            )
            frames.append(frame)

        elif f <= 18:
            # Explosive forward cleave & frost-gold crescent slash arc
            k = f - 10
            u = k / 8.0
            base = (tpl['lunge'] if k >= 1 else tpl['stand']).copy()
            if k in (2, 3, 4):
                base = np.roll(base, 1, axis=1)
                base[:, 0:1] = 0
            base = apply_cape_wave(base, phase * 2.0, amplitude=2.3, vertical_flutter=1.0)

            ang_seq = [-85.0, -32.0, +12.0, +34.0, +44.0, +48.0, +46.0, +42.0, +36.0]
            hx_seq = [29, 33, 35, 34, 33, 32, 32, 31, 31]
            hy_seq = [13, 17, 21, 25, 27, 28, 28, 27, 26]
            slash_arc = None
            if k <= 5:
                arc_int = [0.75, 1.0, 1.0, 0.9, 0.65, 0.4][k]
                a0 = [-140.0, -110.0, -75.0, -40.0, -15.0, 0.0][k]
                a1 = ang_seq[k] + 8.0
                slash_arc = (a0, a1, 20.5, arc_int)

            frame = draw_runeblade(
                base,
                hand_x=hx_seq[k],
                hand_y=hy_seq[k],
                angle_deg=ang_seq[k],
                glow_intensity=1.0 if k <= 4 else 0.7,
                blade_len=21.5,
                shoulder=(28, 18),
                two_handed=(k <= 3),
                slash_arc=slash_arc
            )
            frames.append(frame)

        else:
            # F19..F29: Smooth recovery from cleave stance back to idle ready stance
            u = (f - 18) / 11.0
            base = (tpl['lunge'] if f <= 21 else tpl['stand']).copy()
            base = apply_cape_wave(base, phase, amplitude=1.6, vertical_flutter=0.6)
            ang = 36.0 * (1.0 - u) + (-45.0) * u
            hx = int(round(31 * (1.0 - u) + 29 * u))
            hy = int(round(26 * (1.0 - u) + 24 * u))
            frame = draw_runeblade(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=0.65 - u * 0.2,
                blade_len=21.5,
                shoulder=(26, 18)
            )
            frames.append(frame)

    return frames


def render_whirlwind_spin_frame(tpl, f):
    """
    Phase 1 of Row 3 (`F00..F16`): 2-turn high-speed 360-degree Valkyrie Whirlwind spin!
    Alternates Front/Right/Back/Left armored silhouettes with a full 360-degree Frost-Gold Runeblade cyclone ring.
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
        base = apply_cape_wave(base, spin_rad, amplitude=2.2, vertical_flutter=0.9)


    # 3D Perspective Horizontal Cyclone Ring (Back half behind torso, Front half in front of torso)
    back_ring = np.zeros((52, 52, 4), dtype=np.uint8)
    front_ring = np.zeros((52, 52, 4), dtype=np.uint8)
    cx, cy = 26.0, 24.0
    rx, ry = 22.5, 6.5

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
            set_px(target, px_x - ca * 3.0, px_y - sa * 1.0, GOLD_MID)

    # 3D Perspective Horizontal Runeblade sweeping 360 deg in the plane of the cyclone ring
    if cos_s >= 0:
        blade_ang_deg = sin_s * 14.0
    else:
        blade_ang_deg = 180.0 - sin_s * 14.0
    persp_len = 9.0 + 12.0 * abs(cos_s)
    hx = int(round(26 + cos_s * 4.5))
    hy = int(round(23 + sin_s * 2.0))

    if sin_s < 0:
        # Blade is on the back half of the 360-deg orbit (behind Aethelgard's body)
        sword_canvas = draw_runeblade(
            back_ring,
            hand_x=hx,
            hand_y=hy,
            angle_deg=blade_ang_deg,
            glow_intensity=0.9,
            blade_len=persp_len,
            shoulder=(26, 19),
            two_handed=False
        )
        out = composite_over(sword_canvas, base)
        out = composite_over(out, front_ring)
    else:
        # Blade is on the front half of the 360-deg orbit (in front of Aethelgard's body)
        out = composite_over(back_ring, base)
        out = draw_runeblade(
            out,
            hand_x=hx,
            hand_y=hy,
            angle_deg=blade_ang_deg,
            glow_intensity=1.0,
            blade_len=persp_len,
            shoulder=(26, 19),
            two_handed=True
        )
        out = composite_over(out, front_ring)
    return out


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
            jump_dy = [-2, -4, -6, -6, -4][k]
            tuck = [0.4, 0.75, 0.95, 0.9, 0.65][k]
            body = make_jump_body(tpl, jump_dy, tuck_amount=tuck, torso_lean_dx=-1 if k <= 2 else 1)
            body = apply_cape_wave(body, phase * 2.0, amplitude=2.2, vertical_flutter=1.0)

            ang = -115.0 + u * 25.0
            hx = 25 + int(round(u * 3))
            hy = 12 + jump_dy
            frame = draw_runeblade(
                body,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.0,
                blade_len=21.0,
                shoulder=(25, 17 + jump_dy),
                two_handed=True
            )
            frames.append(frame)
        else:
            # F22..F29: Two-handed overhead Thunder-Slam driving the Runeblade into the earth with golden lightning sparks
            k = f - 22
            crouch_d = [2, 5, 6, 5, 4, 3, 1, 0][k]
            body = tpl['stand'].copy() if crouch_d == 0 else make_crouch_body(tpl, crouch_d)
            body = apply_cape_wave(body, phase * 2.0, amplitude=2.0, vertical_flutter=0.8)

            ang_seq = [18.0, 52.0, 58.0, 56.0, 48.0, 24.0, -12.0, -42.0]
            hx_seq = [33, 33, 33, 33, 32, 31, 30, 29]
            hy_seq = [21, 27, 28, 28, 27, 26, 25, 24]
            slash_arc = (-95.0, 54.0, 21.0, 1.0 if k == 0 else 0.7) if k <= 1 else None

            frame = draw_runeblade(
                body,
                hand_x=hx_seq[k],
                hand_y=hy_seq[k],
                angle_deg=ang_seq[k],
                glow_intensity=1.0 if k <= 4 else 0.6,
                blade_len=20.0,
                shoulder=(27, 17 + crouch_d),
                two_handed=(k <= 5),
                slash_arc=slash_arc
            )

            # Erupting golden-cyan ground lightning sparks at impact point (F22..F26)
            if k <= 4:
                ix, iy = 45, 47
                for bolt in range(3):
                    bx0 = ix - 4 + bolt * 3
                    draw_line_px(frame, bx0, iy, bx0 + (bolt - 1) * 3, iy - 6 - (k % 3) * 2, GOLD_BRIGHT if bolt == 1 else FROST_BRIGHT)
                    set_px(frame, bx0, iy - 1, FROST_WHITE)

            frames.append(frame)

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
            # Stage 1A (F00..F04): Low forward omnislash blitz strike
            u = f / 4.0
            body = tpl['dash'].copy()
            body = apply_cape_wave(body, phase * 3.0, amplitude=2.2, is_dash=True)
            ang = -12.0 + u * 24.0
            slash_arc = (-45.0, ang + 10.0, 21.0, 0.9) if f >= 1 else None
            frame = draw_runeblade(
                body,
                hand_x=33,
                hand_y=22,
                angle_deg=ang,
                glow_intensity=0.95,
                blade_len=20.0,
                shoulder=(28, 18),
                slash_arc=slash_arc
            )
            frames.append(frame)

        elif f <= 8:
            # Stage 1B (F05..F08): Upward diagonal cross-cleave
            k = f - 5
            u = k / 3.0
            body = tpl['lunge'].copy()
            body = apply_cape_wave(body, phase * 3.0, amplitude=2.3, vertical_flutter=1.0)
            ang = 32.0 * (1.0 - u) + (-68.0) * u
            slash_arc = (38.0, ang - 8.0, 21.0, 0.95)
            frame = draw_runeblade(
                body,
                hand_x=32,
                hand_y=int(round(24 - u * 8)),
                angle_deg=ang,
                glow_intensity=1.0,
                blade_len=21.0,
                shoulder=(28, 17),
                two_handed=True,
                slash_arc=slash_arc
            )
            frames.append(frame)

        elif f <= 12:
            # Stage 1C (F09..F12): Spinning reverse whirl-slash
            k = f - 9
            u = k / 3.0
            body = tpl['stand'].copy()
            body = apply_cape_wave(body, phase * 3.0, amplitude=2.4, vertical_flutter=1.1)
            ang = -80.0 * (1.0 - u) + 28.0 * u
            slash_arc = (-95.0, ang + 10.0, 21.5, 0.95)
            frame = draw_runeblade(
                body,
                hand_x=31,
                hand_y=21,
                angle_deg=ang,
                glow_intensity=1.0,
                blade_len=21.0,
                shoulder=(26, 17),
                two_handed=True,
                slash_arc=slash_arc
            )
            frames.append(frame)

        elif f <= 20:
            # Stage 2 (F13..F20): Ascending Dragon-Vault skyward uppercut with blazing Golden-Cyan Valkyrie Aura Wings!
            k = f - 13
            u = k / 7.0
            jump_dy = int(round(-2 - math.sin(u * math.pi * 0.8) * 4))
            tuck = 0.55 + 0.4 * math.sin(u * math.pi * 0.85)
            body = make_jump_body(tpl, jump_dy, tuck_amount=tuck, torso_lean_dx=1)
            body = apply_cape_wave(body, phase * 3.0, amplitude=2.5, vertical_flutter=1.2)
            body = draw_valkyrie_aura_wings(body, shoulder=(23, 17 + jump_dy), wing_span=0.65 + 0.35 * math.sin(u * math.pi * 0.8), phase=phase * 2.0)

            ang = -52.0 - u * 28.0
            frame = draw_runeblade(
                body,
                hand_x=31,
                hand_y=15 + jump_dy,
                angle_deg=ang,
                glow_intensity=1.0,
                blade_len=21.0,
                shoulder=(27, 17 + jump_dy),
                two_handed=True,
                slash_arc=(15.0, ang, 20.0, 0.85) if k <= 3 else None
            )
            frames.append(frame)

        elif f <= 26:
            # Stage 3A (F21..F26): Inverted two-handed meteoric Runeblade plunge!
            k = f - 21
            u = k / 5.0
            jump_dy = int(round(-4 + u * 4))
            body = make_jump_body(tpl, jump_dy, tuck_amount=0.85 - u * 0.4, torso_lean_dx=2)
            body = apply_cape_wave(body, phase * 3.0, amplitude=2.6, vertical_flutter=1.3)
            body = draw_valkyrie_aura_wings(body, shoulder=(24, 16 + jump_dy), wing_span=1.0 - u * 0.2, phase=phase * 2.0)

            # Runeblade held two-handed point-down (+78..+86 deg) plunging toward earth
            ang = 76.0 + u * 10.0
            frame = draw_runeblade(
                body,
                hand_x=33,
                hand_y=21 + jump_dy,
                angle_deg=ang,
                glow_intensity=1.0,
                blade_len=21.0,
                shoulder=(28, 17 + jump_dy),
                two_handed=True
            )
            # Vertical meteoric speed streaks around plunging blade
            for s_i in range(3):
                sx = 31 + s_i * 4
                sy = 4 + ((k * 3 + s_i * 4) % 14)
                draw_line_px(frame, sx, sy, sx, sy + 6, GOLD_BRIGHT if s_i == 1 else FROST_BRIGHT)
            frames.append(frame)

        else:
            # Stage 3B (F27..F29): Heroic ground impact stance with Runeblade driven vertically into shattered earth!
            k = f - 27
            crouch_d = [6, 5, 3][k]
            body = make_crouch_body(tpl, crouch_d)
            body = apply_cape_wave(body, phase * 2.0, amplitude=2.0, vertical_flutter=0.8)
            body = draw_valkyrie_aura_wings(body, shoulder=(24, 17 + crouch_d), wing_span=0.6 - k * 0.2, phase=phase)

            frame = draw_runeblade(
                body,
                hand_x=34,
                hand_y=25 + crouch_d,
                angle_deg=86.0 - k * 8.0,
                glow_intensity=1.0,
                blade_len=19.0,
                shoulder=(28, 18 + crouch_d),
                two_handed=True
            )
            # Tectonic ground shockwave sparks at blade impact (x=35, y=48)
            for rx in range(24 - k * 3, 46 + k * 2, 2):
                if 2 <= rx < 50:
                    set_px(frame, rx, 48, GOLD_BRIGHT if rx % 4 == 0 else FROST_BRIGHT)
            frames.append(frame)

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
            # F00..F06: Hit-stagger recoil
            u = f / 6.0
            dx = -int(round(math.sin(u * math.pi * 0.85) * 2.5))
            dy = int(round(u * 2.0))
            base = np.zeros((52, 52, 4), dtype=np.uint8)
            for y in range(52):
                for x in range(52):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < 52 and 0 <= nx < 52:
                        base[ny, nx] = tpl['stand'][y, x]
            base = apply_cape_wave(base, u * math.pi, amplitude=1.8, vertical_flutter=0.6)
            frame = draw_runeblade(
                base,
                hand_x=29 + dx,
                hand_y=25 + dy,
                angle_deg=-35.0 + u * 55.0,
                glow_intensity=0.4,
                blade_len=20.5,
                shoulder=(25 + dx, 18 + dy)
            )
            frames.append(frame)

        elif f <= 17:
            # F07..F17: Drops to one knee clutching chest, planting single Runeblade point-down into the floor
            u = (f - 7) / 10.0
            base = (tpl['kneel1'] if f <= 12 else tpl['kneel2']).copy()
            if f >= 14:
                head_drop = 1 if f <= 15 else 2
                head_slice = base[8:19, 19:31].copy()
                base[8:19, 19:31] = 0
                base[8 + head_drop:19 + head_drop, 19:31] = head_slice

            base = apply_cape_wave(base, u * math.pi, amplitude=1.1, vertical_flutter=0.3)
            # Single Runeblade planted point-down (+88 deg) into ground at x=35, y=28..49
            frame = draw_runeblade(
                base,
                hand_x=35,
                hand_y=28 + (1 if f >= 13 else 0),
                angle_deg=88.0,
                glow_intensity=max(0.15, 0.45 * (1.0 - u)),
                blade_len=19.5,
                shoulder=(28, 22 + (1 if f >= 13 else 0))
            )
            frames.append(frame)

        elif f <= 23:
            # F18..F23: Collapsing forward from knee onto the floor while Runeblade tips down flat onto the ground
            u = (f - 18) / 5.0
            tilt_deg = -u * 78.0  # CW rotation in PIL (tilts kneeling warrior forward-right onto the ground)
            pil_kn = Image.fromarray(tpl['kneel2'], mode='RGBA')
            rot_arr = np.array(
                pil_kn.rotate(tilt_deg, resample=Image.NEAREST, center=(24, 43)),
                dtype=np.uint8
            )

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

            # Runeblade tips smoothly from planted (+82 deg) to horizontal flat on the ground (0 deg at y=47)
            blade_ang = (1.0 - u) * 72.0 + u * 2.0
            hx = int(round(33 * (1.0 - u) + 27 * u))
            hy = int(round(32 * (1.0 - u) + 46 * u))
            frame = draw_runeblade(
                frame,
                hand_x=hx,
                hand_y=hy,
                angle_deg=blade_ang,
                glow_intensity=0.15,
                blade_len=19.0,
                shoulder=None,
                draw_arm=False
            )
            frames.append(frame)

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
                hand_y=47,
                angle_deg=0.0,
                glow_intensity=max(0.02, 0.35 - k * 0.06),
                blade_len=20.0,
                shoulder=None,
                draw_arm=False
            )
            # Fading frost rune ember along the fallen blade so each settling frame F24..F29 is distinct
            ember_x = 30 + k * 3
            if ember_x < 46:
                set_px(frame, ember_x, 47, FROST_BRIGHT if k <= 2 else FROST_CYAN)
            frames.append(frame)

    return frames



def build_row6_dash(tpl):
    """
    Row 6 (`DASH` - Valkyrie Assault Charge, 30 frames):
    - Low aerodynamic Valkyrie assault charge with trailing royal cape, horizontal Runeblade thrust,
      and golden-frost speed afterimages.
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
                ny = min(50, y + crouch_dy)
                base[ny, :] = src_body[y, :]
            base = apply_cape_wave(base, phase * 2.0, amplitude=1.9, is_dash=(f >= 2))
            ang = -45.0 * (1.0 - u) + (-4.0) * u
            frame = draw_runeblade(
                base,
                hand_x=30 + int(round(u * 3)),
                hand_y=23 + crouch_dy,
                angle_deg=ang,
                glow_intensity=0.6 + u * 0.3,
                blade_len=18.5,
                shoulder=(26 + int(round(u * 2)), 18 + crouch_dy)
            )
            frames.append(frame)

        elif f <= 22:
            # F04..F22: Full aerodynamic Valkyrie assault charge + horizontal Runeblade thrust + speed streaks
            k = f - 4
            bob_dy = 1 + int(round(math.sin((k / 18.0) * math.pi * 2.0) * 1.0))
            base = np.zeros((52, 52, 4), dtype=np.uint8)
            for y in range(52):
                ny = min(50, max(0, y + bob_dy))
                base[ny, :] = tpl['dash'][y, :]
            base = apply_cape_wave(base, k * 0.85, amplitude=2.2, is_dash=True)

            # Golden-frost horizontal speed streaks trailing behind cape & boots
            for s_idx in range(4):
                sy = 12 + s_idx * 8 + ((k + s_idx) % 2)
                sx0 = 2 + ((k * 3 + s_idx * 5) % 9)
                draw_line_px(base, sx0, sy, sx0 + 5, sy, GOLD_BRIGHT if s_idx % 2 == 0 else FROST_BRIGHT)

            thrust_dx = 1 if 8 <= f <= 16 else 0
            frame = draw_runeblade(
                base,
                hand_x=33 + thrust_dx,
                hand_y=22 + bob_dy,
                angle_deg=-2.0 + math.sin(k * 0.6) * 2.0,
                glow_intensity=0.95,
                blade_len=16.5,
                shoulder=(28, 18 + bob_dy)
            )
            frames.append(frame)

        else:
            # F23..F29: Armored brake-slide and smooth recovery to ready stance
            u = (f - 23) / 6.0
            crouch_dy = [2, 2, 1, 1, 0, 0, 0][f - 23]
            src_body = tpl['lunge'] if f <= 25 else tpl['stand']
            base = np.zeros((52, 52, 4), dtype=np.uint8)
            for y in range(52):
                ny = min(50, y + crouch_dy)
                base[ny, :] = src_body[y, :]
            base = apply_cape_wave(base, phase, amplitude=1.6, vertical_flutter=0.6)
            ang = -2.0 * (1.0 - u) + (-45.0) * u
            frame = draw_runeblade(
                base,
                hand_x=int(round(32 * (1.0 - u) + 29 * u)),
                hand_y=23 + crouch_dy,
                angle_deg=ang,
                glow_intensity=0.8 - u * 0.3,
                blade_len=19.5,
                shoulder=(26, 18 + crouch_dy)
            )
            frames.append(frame)

    return frames


def build_row7_crouch(tpl):
    """
    Row 7 (`CROUCH`, 30 frames):
    - F00..F06: Drops into a low tactical Aegis knee-crouch (7px lower silhouette), raising an ornate
      Frost-Gold Valkyrie Aegis Greatshield on his left arm while leveling his Runeblade.
    - F07..F18: Braces behind the glowing Aegis barrier (F07..F12) and unleashes a low horizontal
      Frost-Crescent counter-slash (F13..F18).
    - F19..F29: Recovers and rises smoothly back to combat stance.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 6:
            depths = [0, 1, 2, 4, 5, 6, 7]
            d = depths[f]
            u = f / 6.0
            base = tpl['stand'].copy() if d == 0 else make_crouch_body(tpl, d)
            base = apply_cape_wave(base, phase, amplitude=1.3, vertical_flutter=0.4)
            ang = -45.0 * (1.0 - u) + (-14.0) * u
            frame = draw_runeblade(
                base,
                hand_x=29,
                hand_y=23 + d,
                angle_deg=ang,
                glow_intensity=0.5 + u * 0.3,
                blade_len=19.5,
                shoulder=(25, 17 + d)
            )
            if f >= 2:
                frame = draw_aegis_greatshield(frame, cx=31, cy=21 + d, glow=0.4 + u * 0.4)
            frames.append(frame)

        elif f <= 12:
            # F07..F12: Braces behind glowing Aegis Greatshield barrier while coiling Runeblade for counter-slash
            d = 7
            k = f - 7
            u = k / 5.0
            base = make_crouch_body(tpl, d)
            base = apply_cape_wave(base, phase, amplitude=1.2, vertical_flutter=0.3)
            frame = draw_runeblade(
                base,
                hand_x=27 - int(round(u * 2)),
                hand_y=23 + d,
                angle_deg=-16.0 - u * 22.0,
                glow_intensity=0.8 + u * 0.2,
                blade_len=19.0,
                shoulder=(25, 17 + d)
            )
            frame = draw_aegis_greatshield(frame, cx=32, cy=21 + d, glow=0.85 + 0.15 * math.sin(k * 1.2))
            frames.append(frame)

        elif f <= 18:
            # F13..F18: Unleashes low horizontal Frost-Crescent counter-slash from behind the Aegis shield!
            d = 7
            k = f - 13
            u = k / 5.0
            base = make_crouch_body(tpl, d)
            if k in (0, 1, 2):
                base = np.roll(base, 1, axis=1)
                base[:, 0:1] = 0
            base = apply_cape_wave(base, phase * 2.0, amplitude=1.8, vertical_flutter=0.6)
            frame = draw_aegis_greatshield(base, cx=28, cy=21 + d, glow=0.65 - u * 0.2)

            ang_seq = [4.0, 12.0, 16.0, 14.0, 8.0, 0.0]
            slash_arc = (-32.0, 22.0, 20.0, 1.0 - k * 0.22) if k <= 3 else None
            frame = draw_runeblade(
                frame,
                hand_x=33 if k <= 3 else 31,
                hand_y=23 + d,
                angle_deg=ang_seq[k],
                glow_intensity=1.0 if k <= 2 else 0.7,
                blade_len=18.5,
                shoulder=(27, 17 + d),
                slash_arc=slash_arc
            )
            frames.append(frame)

        else:
            # F19..F29: Smoothly rises from 7px crouch back to upright combat stance
            depths = [7, 6, 6, 5, 4, 3, 2, 2, 1, 0, 0]
            k = f - 19
            d = depths[k]
            u = k / 10.0
            base = tpl['stand'].copy() if d == 0 else make_crouch_body(tpl, d)
            base = apply_cape_wave(base, phase, amplitude=1.4, vertical_flutter=0.5)
            if k <= 3:
                base = draw_aegis_greatshield(base, cx=29, cy=21 + d, glow=0.35 - k * 0.08)
            ang = 0.0 * (1.0 - u) + (-45.0) * u
            frame = draw_runeblade(
                base,
                hand_x=int(round(31 * (1.0 - u) + 29 * u)),
                hand_y=24 + d,
                angle_deg=ang,
                glow_intensity=0.65 - u * 0.2,
                blade_len=20.5,
                shoulder=(25, 18 + d)
            )
            frames.append(frame)

    return frames


def build_row8_jump(tpl):
    """
    Row 8 (`JUMP`, 30 frames — ZERO bouncy-ball frames!):
    - F00..F04: Athletic knee-bend crouch launch
    - F05..F11: Powerful ascending Valkyrie vault with knees tucked and cape streaming below, raising Runeblade overhead
    - F12..F18: Apex mid-air two-handed overhead cleave unleashing a downward-angled Frost Crescent
    - F19..F24: Descending armored glide
    - F25..F29: Shock-absorbing knee-bend landing
    Every single frame shows Aethelgard's full head, plumed helm, armor, cape, legs, and Runeblade!
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
            body = apply_cape_wave(body, phase * 2.0, amplitude=1.8, vertical_flutter=0.7)
            ang = -45.0 + (22.0 if f in (1, 2) else -18.0 * u)
            frame = draw_runeblade(
                body,
                hand_x=29,
                hand_y=23 + d,
                angle_deg=ang,
                glow_intensity=0.55 + u * 0.25,
                blade_len=20.5,
                shoulder=(25, 17 + d)
            )
            frames.append(frame)

        elif f <= 11:
            # F05..F11: Ascending Valkyrie vault with tucked armored knees & two-handed overhead windup
            k = f - 5
            u = k / 6.0
            tuck = 0.45 + 0.55 * math.sin(u * math.pi * 0.7)
            body = make_jump_body(tpl, 0, tuck_amount=tuck, torso_lean_dx=-1 if k >= 3 else 0)
            body = apply_cape_wave(body, phase * 2.0, amplitude=2.3, vertical_flutter=1.1)

            ang = -55.0 * (1.0 - u) + (-128.0) * u
            hx = int(round(29 * (1.0 - u) + 25 * u))
            hy = int(round(20 * (1.0 - u) + 12 * u))
            frame = draw_runeblade(
                body,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=0.75 + u * 0.25,
                blade_len=20.5,
                shoulder=(25, 16),
                two_handed=(k >= 2)
            )
            frames.append(frame)

        elif f <= 18:
            # F12..F18: Apex mid-air two-handed overhead cleave unleashing a downward-angled Frost Crescent!
            k = f - 12
            u = k / 6.0
            tuck = 0.95 - u * 0.15
            body = make_jump_body(tpl, 0, tuck_amount=tuck, torso_lean_dx=1 if k >= 1 else 0)
            body = apply_cape_wave(body, phase * 2.0, amplitude=2.5, vertical_flutter=1.2)

            ang_seq = [-65.0, -8.0, 28.0, 42.0, 46.0, 42.0, 36.0]
            hx_seq = [30, 33, 34, 34, 33, 32, 31]
            hy_seq = [13, 17, 21, 24, 25, 25, 24]
            slash_arc = None
            if k <= 4:
                arc_int = [0.8, 1.0, 1.0, 0.85, 0.55][k]
                a0 = [-128.0, -90.0, -45.0, -10.0, 10.0][k]
                slash_arc = (a0, ang_seq[k] + 6.0, 20.5, arc_int)

            frame = draw_runeblade(
                body,
                hand_x=hx_seq[k],
                hand_y=hy_seq[k],
                angle_deg=ang_seq[k],
                glow_intensity=1.0 if k <= 4 else 0.75,
                blade_len=20.5,
                shoulder=(27, 17),
                two_handed=(k <= 3),
                slash_arc=slash_arc
            )
            frames.append(frame)

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
                hand_x=int(round(31 * (1.0 - u) + 29 * u)),
                hand_y=int(round(24 * (1.0 - u) + 22 * u)),
                angle_deg=ang,
                glow_intensity=0.65,
                blade_len=20.5,
                shoulder=(26, 17)
            )
            frames.append(frame)

        else:
            # F25..F29: Shock-absorbing knee-bend touchdown back to ready stance
            k = f - 25
            crouch_depths = [3, 4, 2, 1, 0]
            d = crouch_depths[k]
            u = k / 4.0
            body = tpl['stand'].copy() if d == 0 else make_crouch_body(tpl, d)
            body = apply_cape_wave(body, phase, amplitude=1.6, vertical_flutter=0.7)
            ang = -22.0 * (1.0 - u) + (-45.0) * u
            frame = draw_runeblade(
                body,
                hand_x=29,
                hand_y=24 + d,
                angle_deg=ang,
                glow_intensity=0.55,
                blade_len=21.5,
                shoulder=(25, 18 + d)
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
