#!/usr/bin/env python3
"""
Builds Kaze-Maru's (Ronin - Storm-Blade Samurai) 30-Frame-Per-Animation HD-2D Sprite Sheet:
- 9 rows x 30 columns = 270 unique frames (6240 x 1872 at 208x208 per cell, 52x52 logical upscaled 4x NEAREST):
  * Row 0: IDLE (30 frames)
  * Row 1: WALK (30 frames)
  * Row 2: AUTO_ATTACK - THUNDER IAIDO & JODAN CLEAVE (30 frames)
  * Row 3: SKILL - RAIJIN THUNDER-PILLAR & FLASH-CUT (30 frames)
  * Row 4: ULTIMATE - SUSANOO: THOUSAND-BLADE THUNDERSTORM (30 frames)
  * Row 5: DEATH & HURT (30 frames)
  * Row 6: DASH - IAIDO LIGHTNING FLASH-STEP (30 frames)
  * Row 7: CROUCH - RAIJIN THUNDER-DRUM PARRY & IAIDO COUNTER (30 frames)
  * Row 8: JUMP - RAIJIN SKY-VAULT & AERIAL CLEAVE (30 frames)
- Un-inked clean pixel art: zero white background halo, strictly ONE Two-Handed Thunder-Odachi Great-Katana per frame
  gripped by BOTH hands via 2-bone IK arms from Rear Shoulder (21, 18) and Lead Shoulder (27, 19),
  grounded horizontal prone body & flat Odachi on Death F18..F29, and zero bouncy-ball frames in Jump.
"""

from collections import deque
import math
import numpy as np
from PIL import Image, ImageDraw

# Palette matching Kaze-Maru's HD-2D Raijin Storm-Samurai aesthetic
INDIGO_DEEP = (14, 16, 36, 255)
INDIGO_DARK = (26, 28, 60, 255)
INDIGO_MID = (45, 48, 98, 255)
INDIGO_LIGHT = (76, 82, 148, 255)

CAPE_DEEP = (24, 16, 48, 255)
CAPE_DARK = (40, 26, 74, 255)
CAPE_MID = (64, 42, 112, 255)
CAPE_LIGHT = (91, 58, 150, 255)

VIOLET_DEEP = (76, 29, 149, 255)
VIOLET_GLOW = (139, 92, 246, 255)
VIOLET_BRIGHT = (167, 139, 250, 255)
VIOLET_WHITE = (221, 214, 254, 255)

CYAN_DEEP = (14, 116, 144, 255)
CYAN_MID = (6, 182, 212, 255)
CYAN_BRIGHT = (34, 211, 238, 255)
CYAN_LIGHT = (103, 232, 249, 255)
DIAMOND_WHITE = (240, 253, 255, 255)

SILVER_DARK = (100, 116, 139, 255)
SILVER_MID = (148, 163, 184, 255)
SILVER_LIGHT = (203, 213, 225, 255)
SILVER_WHITE = (241, 245, 249, 255)

BRASS_DARK = (120, 53, 15, 255)
BRASS_MID = (180, 110, 24, 255)
BRASS_BRIGHT = (234, 179, 8, 255)
GOLD_WHITE = (254, 240, 138, 255)


def set_px(buf, x, y, col):
    ix = int(round(x))
    iy = int(round(y))
    if 2 <= ix <= 49 and 2 <= iy <= 49:
        buf[iy, ix] = col


def draw_line_px(buf, x0, y0, x1, y1, col):
    steps = int(max(abs(x1 - x0), abs(y1 - y0), 1) * 2)
    for i in range(steps + 1):
        t = i / float(steps)
        set_px(buf, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, col)


def fill_layer_pinholes(layer, x0=2, x1=49, y0=2, y1=49, require_3_neighbors=False):
    """
    Fills 1px transparent pinholes/slits inside moved, waved, or rotated pixel layers
    so movement never causes missing interior pixels or torn seams.
    """
    out = layer.copy()
    alpha = layer[:, :, 3] > 0
    for y in range(max(2, y0), min(50, y1)):
        for x in range(max(2, x0), min(50, x1)):
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
    """Shifts a 52x52 layer by (dx, dy) without wrap-around and fills any 1px pinholes."""
    out = np.zeros_like(layer)
    fdx = int(round(dx))
    fdy = int(round(dy))
    for y in range(52):
        ny = y + fdy
        if 2 <= ny <= 49:
            for x in range(52):
                nx = x + fdx
                if 2 <= nx <= 49 and layer[y, x, 3] > 0:
                    out[ny, nx] = layer[y, x]
    return fill_layer_pinholes(out)


def ensure_safe_cell(cell, margin=2):
    """
    Guarantees zero pixels fall outside [2..49, 2..49] (so 0/270 boundary clips occur)
    and fills any 1px interior pinholes from movement.
    """
    lo = max(2, int(margin))
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

    # Strictly clear perimeter outside [2..49, 2..49]
    out[:lo, :, :] = 0
    out[52 - lo :, :, :] = 0
    out[:, :lo, :] = 0
    out[:, 52 - lo :, :] = 0
    return out


def composite_over(base, over):
    res = base.copy()
    mask = over[:, :, 3] > 0
    res[mask] = over[mask]
    return res


def extract_clean_base_sprite(
    path="/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/4f1fb80f-a88f-4496-9746-b4b9fe84f6d4/ronin_v1_base_1794151225087.jpg",
):
    """
    Loads `ronin_v1_base_1794151225087.jpg` (1024x1024), performs a BFS flood-fill from all 4 image borders
    to strip the white background + 3-pass anti-aliased fringe (ZERO white halo!), crops tight character bounds,
    and scales cleanly into the 52x52 logical cell (`y = 5..45`, boots planted firmly at `y = 45`),
    preserving Kaze-Maru's crescent kabuto, silver mane, glowing cyan eyes, indigo-violet breastplate (`do`),
    waist sash (`obi`), kusazuri hip tassets (`y = 26..34, x = 20..33`), and billowing haori cape (`x = 5..20, y = 18..38`).
    """
    im = Image.open(path).convert("RGBA")
    arr = np.array(im, dtype=np.uint8)
    h, w, _ = arr.shape

    visited = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        q.append((0, x))
        q.append((h - 1, x))
    for y in range(h):
        q.append((y, 0))
        q.append((y, w - 1))

    def is_exterior_white(r, g, b):
        if r > 210 and g > 210 and b > 210:
            return True
        mn, mx = min(r, g, b), max(r, g, b)
        if mn > 200 and (mx - mn) < 35:
            return True
        return False

    while q:
        cy, cx = q.popleft()
        if not (0 <= cy < h and 0 <= cx < w) or visited[cy, cx]:
            continue
        r, g, b = int(arr[cy, cx, 0]), int(arr[cy, cx, 1]), int(arr[cy, cx, 2])
        if is_exterior_white(r, g, b):
            visited[cy, cx] = True
            arr[cy, cx] = (0, 0, 0, 0)
            for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]:
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx]:
                    q.append((ny, nx))

    # Strip near-white anti-aliased fringe touching transparent exterior pixels (ZERO white halo!)
    for _ in range(3):
        trans = arr[:, :, 3] == 0
        fringe = np.zeros((h, w), dtype=bool)
        for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]:
            fringe |= np.roll(np.roll(trans, dy, axis=0), dx, axis=1)
        fringe &= ~trans
        for y in range(h):
            for x in range(w):
                if fringe[y, x]:
                    r, g, b = int(arr[y, x, 0]), int(arr[y, x, 1]), int(arr[y, x, 2])
                    if min(r, g, b) > 165 and (max(r, g, b) - min(r, g, b)) < 48:
                        arr[y, x] = (0, 0, 0, 0)

    ys, xs = np.where(arr[:, :, 3] > 0)
    crop = Image.fromarray(arr[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1], mode="RGBA")
    scaled = crop.resize((33, 41), Image.Resampling.NEAREST)
    s_arr = np.array(scaled, dtype=np.uint8)

    cell = np.zeros((52, 52, 4), dtype=np.uint8)
    cell[5:46, 5:38] = s_arr

    # Final 52x52 border fringe pass to ensure zero light-gray/white edge pixels survive downsampling
    # while preserving the silver kabuto mane & crescent horns (y <= 13)
    trans52 = cell[:, :, 3] == 0
    for y in range(14, 52):
        for x in range(52):
            if cell[y, x, 3] > 0:
                r, g, b = int(cell[y, x, 0]), int(cell[y, x, 1]), int(cell[y, x, 2])
                touches_empty = False
                for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                    ny, nx = y + dy, x + dx
                    if not (0 <= ny < 52 and 0 <= nx < 52) or trans52[ny, nx]:
                        touches_empty = True
                        break
                if touches_empty and min(r, g, b) > 175 and (max(r, g, b) - min(r, g, b)) < 38:
                    cell[y, x] = (0, 0, 0, 0)

    # Plant right boot (x=29..37, y=38..44) down +1px so BOTH boots plant firmly on y=45
    # while duplicating row 38 so zero horizontal slit opens at y=38!
    right_boot = cell[38:45, 29:38].copy()
    cell[39:46, 29:38] = right_boot
    cell[38, 29:38] = right_boot[0, :]

    return fill_layer_pinholes(cell)


def neutralize_baked_side_arms(tpl_img, max_chest_x=31):
    """
    Neutralizes/strips the lowered static side-arms on Kaze-Maru's torso so the two-handed
    2-bone IK arms gripping the Thunder-Odachi are 100% cleanly visible with ZERO extra limbs or side fists:
    1. Erases the protruding lowered right arm & fist on the right side (`x > max_chest_x` for `18 <= y <= 28`).
    2. Repaints the lowered left forearm & fist (`19 <= x <= 23, 20 <= y <= 28`) into clean dark indigo/violet
       haori cape & waist armor shading (`CAPE_DARK`, `CAPE_DEEP`, `INDIGO_DARK`), while preserving his
       upper shoulder `sode` pauldron (`y <= 19`), central lightning chestplate `do` (`24 <= x <= 31, 17 <= y <= 24`),
       waist `obi` (`y = 24..25`), and `kusazuri` hip tassets (`y >= 26, x = 22..33`).
    """
    out = tpl_img.copy()
    # 1. Strip protruding lowered right arm & fist (y = 17..28, x > max_chest_x)
    for y in range(17, 29):
        lim_x = max_chest_x + 1 if y <= 18 else max_chest_x
        for x in range(lim_x + 1, 50):
            out[y, x] = (0, 0, 0, 0)

    # 2. Neutralize lowered left forearm & fist (y = 20..28, x = 19..23) into haori cape & torso side
    for y in range(20, 29):
        for x in range(19, 24):
            if out[y, x, 3] > 0:
                if x == 19:
                    out[y, x] = CAPE_DEEP
                elif x <= 21:
                    out[y, x] = CAPE_DARK if (x + y) % 2 == 0 else CAPE_DEEP
                else:
                    out[y, x] = INDIGO_DARK if (x + y) % 2 == 0 else INDIGO_DEEP

    # Ensure clean right chestplate border at x = max_chest_x (y = 19..27)
    for y in range(19, 28):
        if out[y, max_chest_x, 3] > 0:
            out[y, max_chest_x] = INDIGO_DEEP

    return fill_layer_pinholes(out)


def make_clean_templates():
    """
    Constructs Kaze-Maru's modular anatomical templates from the clean 52x52 base sprite:
    - `stand`: full standing storm-samurai with static lowered side-arms neutralized and boots planted at y=45
    - `stand_upper`: upper body, kabuto, haori cape & kusazuri hip tassets (`y = 0..34`)
    - `leg_back` (`leg_near`) and `leg_front` (`leg_far`): lower suneate shin-greaves & war-boots at `y = 38..46`
    - `lunge`: forward-leaning Kendo lunge body (+2px upper-body lean) with static arms neutralized
    - `kneel`: dropped to one knee (`y + 6px`) with static arms neutralized
    - `fall`: 90-degree horizontally collapsed prone samurai on the floor (`y = 35..46`)
    - `dash`: forward-tilted (+14 deg) Iaido flash-step body with streaming silver mane & haori cape
    """
    raw = extract_clean_base_sprite()
    stand = neutralize_baked_side_arms(raw, max_chest_x=31)

    # Extract lower suneate shin-greaves & war-boots at y=38..46
    # - leg_back (viewer left): 19 <= x <= 26, 38 <= y <= 46
    # - leg_front (viewer right): 29 <= x <= 38, 38 <= y <= 46
    leg_back_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_front_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_back_patch[38:47, 19:27] = stand[38:47, 19:27]
    leg_front_patch[38:47, 29:38] = stand[38:47, 29:38]

    # Upper torso, kabuto & kusazuri tassets (y = 0..35)
    stand_upper = np.zeros((52, 52, 4), dtype=np.uint8)
    stand_upper[:36, :] = stand[:36, :]
    stand_upper[36:40, :20] = stand[36:40, :20]
    stand_upper = fill_layer_pinholes(stand_upper)

    # Forward-leaning Kendo lunge body (+2px upper-body lean)
    lunge = np.zeros((52, 52, 4), dtype=np.uint8)
    lunge[32:46, :] = stand[32:46, :]
    for y in range(5, 32):
        dx = 2 if y <= 25 else 1
        for x in range(3, 48):
            if stand[y, x, 3] > 0 and x + dx <= 49:
                lunge[y, x + dx] = stand[y, x]
    lunge = neutralize_baked_side_arms(lunge, max_chest_x=33)
    lunge = fill_layer_pinholes(lunge)

    # Kneeling body (torso dropped +6px onto bent knees planted at y=45)
    kneel = np.zeros((52, 52, 4), dtype=np.uint8)
    kneel[38:46, 18:38] = stand[38:46, 18:38]
    for y in range(5, 35):
        ny = y + 6
        if ny < 45:
            for x in range(3, 46):
                if stand[y, x, 3] > 0:
                    kneel[ny, x] = stand[y, x]
    kneel = neutralize_baked_side_arms(kneel, max_chest_x=31)
    kneel = fill_layer_pinholes(kneel)

    # Horizontally collapsed prone body (90-degree rotated flat on the floor at y=35..46)
    body_no_cape = stand.copy()
    body_no_cape[18:39, 4:18] = 0
    # Trim protruding lower horn tip during 90-deg rotation so torso/legs rest flush on the floor
    body_no_cape[5:13, 31:38] = 0
    pil_body = Image.fromarray(body_no_cape, mode="RGBA")
    rot_90 = np.array(
        pil_body.rotate(-88.0, resample=Image.Resampling.NEAREST, center=(26, 29)),
        dtype=np.uint8,
    )
    ys, xs = np.where(rot_90[:, :, 3] > 0)
    fall = np.zeros((52, 52, 4), dtype=np.uint8)
    if len(ys) > 0:
        dx_shift = 25 - int((xs.min() + xs.max()) // 2)
        for x in range(52):
            col_ys = np.where(rot_90[:, x, 3] > 0)[0]
            if len(col_ys) == 0:
                continue
            nx = max(6, min(45, x + dx_shift))
            # Settle each column of the prone samurai so its bottom rests firmly on y=45..46 (never floating!)
            col_bot = int(col_ys.max())
            target_bot = 46 if (10 <= nx <= 40) else 45
            dy_col = target_bot - col_bot
            for y in col_ys:
                ny = max(35, min(46, y + dy_col))
                fall[ny, nx] = rot_90[y, x]
    fall = fill_layer_pinholes(fall, x0=5, x1=46, y0=34, y1=47, require_3_neighbors=False)

    # Dash body (+14 deg forward Iaido flash-step tilt)
    pil_stand = Image.fromarray(stand, mode="RGBA")
    rot_dash = np.array(
        pil_stand.rotate(-13.0, resample=Image.Resampling.NEAREST, center=(26, 36)),
        dtype=np.uint8,
    )
    dash = np.zeros((52, 52, 4), dtype=np.uint8)
    dys, dxs = np.where(rot_dash[:, :, 3] > 0)
    if len(dys) > 0:
        d_shift = 45 - int(dys.max())
        for y in range(52):
            for x in range(52):
                if rot_dash[y, x, 3] > 0:
                    ny = max(4, min(45, y + d_shift))
                    nx = max(3, min(48, x))
                    dash[ny, nx] = rot_dash[y, x]
    dash = neutralize_baked_side_arms(dash, max_chest_x=33)
    dash = fill_layer_pinholes(dash)

    return {
        "stand": stand,
        "stand_upper": stand_upper,
        "leg_back": leg_back_patch,
        "leg_front": leg_front_patch,
        "lunge": lunge,
        "kneel": kneel,
        "fall": fall,
        "dash": dash,
    }


def apply_cape_and_mane_wave(frame, phase_rad, amplitude=1.5, vertical_flutter=0.6, is_dash=False, rune_pulse=0.6):
    """
    Animates Kaze-Maru's:
    1. Billowing indigo-violet haori cape (`x = 3..18, y = 18..38`) with crackling cyan lightning veins
    2. Flowing silver kabuto horsehair mane (`x = 12..24, y = 6..13`)
    3. Pulsing electric-cyan & violet armor lightning runes & glowing cyan kabuto eyes (`y = 10..25, x = 23..32`).
    """
    out = frame.copy()

    # 1. Billowing Indigo-Violet Haori Cape Wave (x = 3..18, y = 18..38)
    cape_mask = np.zeros((52, 52), dtype=bool)
    for y in range(18, 39):
        max_x = 18 if y < 30 else 16
        for x in range(3, max_x + 1):
            if frame[y, x, 3] > 0:
                cape_mask[y, x] = True

    cape_src = frame.copy()
    out[cape_mask] = 0

    for y in range(18, 39):
        u = (y - 18) / 21.0
        if is_dash:
            wave_x = -1.4 * u + math.sin(phase_rad * 2.0 - u * 3.5) * (amplitude * u)
            wave_y = -1.8 * u + math.cos(phase_rad * 2.0 - u * 3.0) * (vertical_flutter * u)
        else:
            wave_x = math.sin(phase_rad - u * 3.2) * (amplitude * (0.25 + 0.75 * u))
            wave_y = math.cos(phase_rad - u * 2.6) * (vertical_flutter * u)
        dx = int(round(wave_x))
        dy = int(round(wave_y))
        max_x = 18 if y < 30 else 16
        for x in range(3, max_x + 1):
            if not cape_mask[y, x]:
                continue
            nx = max(3, min(19, x + dx))
            ny = max(15, min(42, y + dy))
            out[ny, nx] = cape_src[y, x]
            if dx < 0 and x >= max_x - 3 and out[y, x, 3] == 0:
                out[y, x] = cape_src[y, x]

    out = fill_layer_pinholes(out, x0=3, x1=20, y0=15, y1=43, require_3_neighbors=False)

    # 2. Silver Kabuto Mane Wave (x = 12..24, y = 6..13)
    mane_mask = np.zeros((52, 52), dtype=bool)
    for y in range(6, 14):
        for x in range(12, 25):
            if out[y, x, 3] > 0:
                r, g, b, _ = out[y, x]
                if r > 120 and g > 120 and b > 135:
                    mane_mask[y, x] = True

    mane_src = out.copy()
    out[mane_mask] = 0
    for y in range(6, 14):
        for x in range(12, 25):
            if not mane_mask[y, x]:
                continue
            u_m = max(0.0, (24 - x) / 11.0)
            m_dy = int(round(math.sin(phase_rad - u_m * 2.5) * (0.8 * u_m)))
            ny = max(4, min(15, y + m_dy))
            out[ny, x] = mane_src[y, x]
            if u_m < 0.35 and out[y, x, 3] == 0:
                out[y, x] = mane_src[y, x]

    # 3. Pulsing Electric-Cyan Kabuto Eyes & Armor Lightning Runes (y = 10..34, x = 22..32)
    for y in range(10, 35):
        for x in range(22, 33):
            if out[y, x, 3] == 0:
                continue
            r, g, b, _ = out[y, x]
            # Bright cyan lightning or eye pixels
            if g > 175 and b > 205:
                if rune_pulse > 0.78:
                    out[y, x] = DIAMOND_WHITE if (x + y) % 2 == 0 else CYAN_LIGHT
                elif rune_pulse > 0.45:
                    out[y, x] = CYAN_LIGHT if (x + y) % 2 == 0 else CYAN_BRIGHT
                else:
                    out[y, x] = CYAN_BRIGHT if (x + y) % 2 == 0 else VIOLET_BRIGHT

    return fill_layer_pinholes(out)


def solve_ik_elbow(sx, sy, hx, hy, L1=5.4, L2=5.2, bend_side=1.0):
    """
    2-Bone Inverse Kinematics solver returning the anatomical elbow joint (ex, ey)
    between shoulder (sx, sy) and hand (hx, hy).
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


def draw_ik_ronin_arm(layer, sx, sy, hx, hy, L1=5.6, L2=5.4, bend_side=1.0, is_rear=False):
    """
    Draws Kaze-Maru's 2-Bone Inverse Kinematics (IK) Samurai Arm extending from shoulder `(sx, sy)`
    to Odachi tsuka grip `(hx, hy)`:
    - When `is_rear=True`: Rear Armored Arm & Tekko Gauntlet extending from Rear Shoulder `(21, 18)`
      to the rear pommel grip with indigo-violet `sode` plates and cyan-inlaid `kote` vambrace.
    - When `is_rear=False`: Lead Armored Arm & Tekko Gauntlet extending from Lead Shoulder `(27, 19)`
      to the upper grip just behind the Raijin tsuba guard with layered `sode` shoulder armor,
      crackling cyan-lightning `kote` forearm bracer, and `3x3` Lead Gauntlet.
    """
    ex, ey = solve_ik_elbow(sx, sy, hx, hy, L1=L1, L2=L2, bend_side=bend_side)

    u1x, u1y = ex - sx, ey - sy
    d1 = max(1.0, math.hypot(u1x, u1y))
    n1x, n1y = -u1y / d1, u1x / d1
    ux1, uy1 = u1x / d1, u1y / d1

    u2x, u2y = hx - ex, hy - ey
    d2 = max(1.0, math.hypot(u2x, u2y))
    n2x, n2y = -u2y / d2, u2x / d2

    if is_rear:
        # 1. Rear upper arm & sode shoulder guard from (sx, sy) to (ex, ey)
        for off, col in [
            (-1.0, INDIGO_DEEP),
            (-0.4, INDIGO_DARK),
            (0.0, INDIGO_MID),
            (0.5, VIOLET_DEEP),
            (1.0, INDIGO_DEEP),
        ]:
            draw_line_px(layer, sx + n1x * off, sy + n1y * off, ex + n1x * (off * 0.85), ey + n1y * (off * 0.85), col)

        # 2. Rear kote forearm vambrace from (ex, ey) to (hx, hy)
        for off, col in [
            (-1.0, INDIGO_DEEP),
            (-0.4, INDIGO_MID),
            (0.0, CYAN_MID),
            (0.5, INDIGO_LIGHT),
            (1.0, INDIGO_DARK),
        ]:
            draw_line_px(layer, ex + n2x * off, ey + n2y * off, hx + n2x * (off * 0.85), hy + n2y * (off * 0.85), col)

        # Rear sode shoulder cap & elbow couter
        for dy_s in (-1, 0, 1):
            for dx_s in (-1, 0, 1):
                set_px(layer, sx + dx_s, sy + dy_s, INDIGO_LIGHT if dy_s <= 0 else INDIGO_DARK)
        set_px(layer, ex, ey, CYAN_BRIGHT)
    else:
        # 1. Lead upper arm from (sx, sy) to (ex, ey)
        for off, col in [
            (-1.15, INDIGO_DEEP),
            (-0.5, INDIGO_MID),
            (0.0, INDIGO_LIGHT),
            (0.55, VIOLET_GLOW),
            (1.15, INDIGO_DARK),
        ]:
            draw_line_px(layer, sx + n1x * off, sy + n1y * off, ex + n1x * (off * 0.85), ey + n1y * (off * 0.85), col)

        # 2. Lead kote vambrace with crackling cyan lightning inlay from (ex, ey) to (hx, hy)
        for off, col in [
            (-1.15, INDIGO_DEEP),
            (-0.5, INDIGO_MID),
            (0.0, CYAN_BRIGHT),
            (0.55, INDIGO_LIGHT),
            (1.15, INDIGO_DARK),
        ]:
            draw_line_px(layer, ex + n2x * off, ey + n2y * off, hx + n2x * (off * 0.85), hy + n2y * (off * 0.85), col)

        # 3. Layered Samurai Sode Shoulder Pauldron at (sx, sy)
        for p_step in (-1.4, -0.7, 0.0, 0.7, 1.4):
            for r_step in (-0.5, 0.2, 0.9):
                px_s = sx + ux1 * r_step + n1x * p_step
                py_s = sy + uy1 * r_step + n1y * p_step
                if abs(p_step) >= 1.2 or r_step >= 0.8:
                    col_p = INDIGO_LIGHT
                elif abs(p_step) <= 0.4 and r_step <= 0.3:
                    col_p = CYAN_BRIGHT
                else:
                    col_p = INDIGO_MID
                set_px(layer, px_s, py_s, col_p)

        # 4. Glowing cyan elbow couter (`hiji-gane`) at (ex, ey)
        set_px(layer, ex, ey, CYAN_LIGHT)
        set_px(layer, ex + n1x * 0.7, ey + n1y * 0.7, INDIGO_LIGHT)

    # 5. 3x3 Armored Tekko Gauntlet fist clasping the tsuka hilt at (hx, hy)
    for dy_g in (-1, 0, 1):
        for dx_g in (-1, 0, 1):
            if dx_g == 0 and dy_g == 0:
                col_g = CYAN_BRIGHT if not is_rear else CYAN_MID
            elif dy_g <= 0:
                col_g = INDIGO_LIGHT if not is_rear else INDIGO_MID
            else:
                col_g = INDIGO_DARK
            set_px(layer, hx + dx_g, hy + dy_g, col_g)

    return ex, ey


def draw_two_handed_odachi(
    canvas,
    hand_x,
    hand_y,
    angle_deg,
    glow_intensity=1.0,
    scale=1.0,
    blade_len=17.0,
    rear_shoulder=(21, 18),
    lead_shoulder=(27, 19),
    draw_arms=True,
    slash_arc=None,
    cross_slash_arc=None,
    phase=0.0,
):
    """
    Renders Kaze-Maru's curved **Two-Handed Thunder-Odachi Great-Katana** (`~22px` total length:
    `5px` wrapped `tsuka` hilt with golden `menuki` & `kashira` pommel cap, ornate circular brass-and-cyan
    Raijin `tsuba` guard, and a curved `17px` electric indigo-cyan & diamond-white katana blade with
    crackling lightning `hamon`):
    - **BOTH hands grip the Odachi hilt (`tsuka`)** connected via 2-bone IK arms from
      Rear Shoulder `(21, 18)` to the rear pommel grip and Lead Shoulder `(27, 19)` to the upper grip
      just behind the tsuba guard!
    - Rigidly translates the Odachi if the blade tip (`kissaki`) or pommel approaches `[3..48, 3..46]`
      so the `~22px` Odachi is NEVER foreshortened and NEVER clips outside `2 <= x <= 49, 2 <= y <= 49`.
    """
    rear_arm_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    odachi_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    rear_gauntlet_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    lead_arm_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    fx_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    rad = math.radians(angle_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    # Normal vector pointing toward the back spine (mune) / curve direction of the katana
    px, py = -uy, ux

    eff_blade = float(blade_len) * scale  # ~17.0px blade
    grip_sep = 3.6 * min(1.0, scale)      # 3.6px spacing between rear hand and lead hand on the 5px tsuka

    # Lead hand grips just behind the tsuba; rear hand grips near the kashira pommel
    lead_gx = float(hand_x)
    lead_gy = float(hand_y)
    rear_gx = lead_gx - ux * grip_sep
    rear_gy = lead_gy - uy * grip_sep

    pom_x = rear_gx - ux * 1.2
    pom_y = rear_gy - uy * 1.2
    tsuba_x = lead_gx + ux * 1.3
    tsuba_y = lead_gy + uy * 1.3

    # Blade tip (kissaki) including subtle sori curve (~1.5px perpendicular offset at tip)
    sori_sign = -1.0 if math.cos(rad) >= -0.2 else 1.0
    tip_x = tsuba_x + ux * eff_blade + px * (1.3 * sori_sign)
    tip_y = tsuba_y + uy * eff_blade + py * (1.3 * sori_sign)

    # Rigidly keep both pommel and tip inside [4.0..47.5, 4.0..46.0] so the 22px Odachi never clips
    min_x = min(pom_x, tip_x, tsuba_x)
    max_x = max(pom_x, tip_x, tsuba_x)
    min_y = min(pom_y, tip_y, tsuba_y)
    max_y = max(pom_y, tip_y, tsuba_y)

    dx_fix = 0.0
    if max_x > 47.5:
        dx_fix = 47.5 - max_x
    elif min_x < 4.0:
        dx_fix = 4.0 - min_x

    dy_fix = 0.0
    if max_y > 46.0:
        dy_fix = 46.0 - max_y
    elif min_y < 4.0:
        dy_fix = 4.0 - min_y

    lead_gx += dx_fix
    lead_gy += dy_fix
    rear_gx += dx_fix
    rear_gy += dy_fix
    pom_x += dx_fix
    pom_y += dy_fix
    tsuba_x += dx_fix
    tsuba_y += dy_fix

    # 1. 5px Wrapped Tsuka Hilt (from pom_x, pom_y to tsuba_x, tsuba_y) with diamond silk wrap & golden menuki
    hilt_steps = 14
    for i in range(hilt_steps + 1):
        u_h = i / float(hilt_steps)
        hx_p = pom_x + (tsuba_x - pom_x) * u_h
        hy_p = pom_y + (tsuba_y - pom_y) * u_h
        if i <= 2:
            # Golden Kashira Pommel Cap
            c_hilt = GOLD_WHITE if i == 0 else BRASS_BRIGHT
        elif i % 3 == 1:
            # Golden Menuki & Silk Tsuka-ito Diamond Node
            c_hilt = BRASS_BRIGHT if i % 2 == 0 else CYAN_LIGHT
        else:
            c_hilt = INDIGO_DARK
        set_px(odachi_layer, hx_p, hy_p, c_hilt)
        set_px(odachi_layer, hx_p + px * 0.55, hy_p + py * 0.55, INDIGO_DEEP)
        set_px(odachi_layer, hx_p - px * 0.55, hy_p - py * 0.55, INDIGO_MID)

    # 2. Ornate Circular Brass-and-Cyan Raijin Tsuba Guard at (tsuba_x, tsuba_y)
    for t_off in (-2.1, -1.4, -0.7, 0.0, 0.7, 1.4, 2.1):
        gx_t = tsuba_x + px * t_off
        gy_t = tsuba_y + py * t_off
        if abs(t_off) >= 1.8:
            col_t = GOLD_WHITE if glow_intensity >= 1.1 else BRASS_BRIGHT
        elif abs(t_off) >= 0.6:
            col_t = CYAN_BRIGHT if glow_intensity >= 0.95 else BRASS_MID
        else:
            col_t = BRASS_BRIGHT
        set_px(odachi_layer, gx_t, gy_t, col_t)
    # Golden Habaki Blade Collar just ahead of the tsuba
    hab_x = tsuba_x + ux * 0.9
    hab_y = tsuba_y + uy * 0.9
    set_px(odachi_layer, hab_x, hab_y, GOLD_WHITE)
    set_px(odachi_layer, hab_x + px * 0.6, hab_y + py * 0.6, BRASS_BRIGHT)

    # 3. Curved 17px Electric Indigo-Cyan & Diamond-White Odachi Katana Blade with Lightning Hamon
    blade_steps = int(round(eff_blade * 3.0))
    for i in range(2, blade_steps + 1):
        u_b = i / float(blade_steps)
        # Authentic Japanese Odachi Sori curvature: gentle arc along the blade peaking near u_b = 0.65
        sori_curve = (math.sin(u_b * math.pi * 0.85) * 1.15 + (u_b * u_b) * 0.55) * sori_sign
        bx = tsuba_x + ux * (u_b * eff_blade) + px * sori_curve
        by = tsuba_y + uy * (u_b * eff_blade) + py * sori_curve

        # Cutting edge (ha) on the outer curve (sori_sign), dark spine (mune) on the inner curve (-sori_sign)
        edge_vx = px * sori_sign
        edge_vy = py * sori_sign

        # Razor-sharp Diamond-White & Ice-Cyan Cutting Edge (ha) + Kissaki point
        if u_b > 0.88:
            set_px(odachi_layer, bx, by, DIAMOND_WHITE)
            set_px(odachi_layer, bx + edge_vx * 0.5, by + edge_vy * 0.5, CYAN_LIGHT)
        else:
            # Spine (mune): deep indigo-violet steel
            set_px(
                odachi_layer,
                bx - edge_vx * 0.75,
                by - edge_vy * 0.75,
                INDIGO_MID if (i % 4 == 0) else INDIGO_DARK,
            )
            # Core Lightning Hamon temper wave: alternating electric-cyan & violet-glow zig-zag
            hamon_wave = ((i + int(round(phase * 3.0))) % 4 == 0)
            c_hamon = (
                DIAMOND_WHITE
                if (hamon_wave and glow_intensity >= 1.1)
                else (CYAN_BRIGHT if (i % 2 == 0) else VIOLET_BRIGHT)
            )
            set_px(odachi_layer, bx, by, c_hamon)
            # Razor Cutting Edge (ha): diamond-white & ice-cyan
            c_edge = DIAMOND_WHITE if (i % 3 != 0 or glow_intensity >= 1.05) else CYAN_LIGHT
            set_px(odachi_layer, bx + edge_vx * 0.72, by + edge_vy * 0.72, c_edge)

    # 4. Crackling Electric Cyan-Violet Sparks along the Odachi Blade & Tip
    if glow_intensity >= 0.8:
        num_sparks = 4 if glow_intensity >= 1.15 else 2
        for s_i in range(num_sparks):
            u_sp = ((s_i * 0.29 + phase / (2.0 * math.pi)) % 0.85) + 0.12
            sori_c = (math.sin(u_sp * math.pi * 0.85) * 1.15 + (u_sp * u_sp) * 0.55) * sori_sign
            spx = tsuba_x + ux * (u_sp * eff_blade) + px * (sori_c + (1.4 if s_i % 2 == 0 else -1.4))
            spy = tsuba_y + uy * (u_sp * eff_blade) + py * (sori_c + (1.4 if s_i % 2 == 0 else -1.4))
            set_px(fx_layer, spx, spy, DIAMOND_WHITE if s_i == 0 else (CYAN_LIGHT if s_i % 2 == 0 else VIOLET_BRIGHT))

    # 5. BOTH Rear IK Arm ((21, 18) -> rear_gx, rear_gy) AND Lead IK Arm ((27, 19) -> lead_gx, lead_gy)
    if draw_arms and rear_shoulder is not None and lead_shoulder is not None:
        sx_r, sy_r = float(rear_shoulder[0]), float(rear_shoulder[1])
        sx_l, sy_l = float(lead_shoulder[0]), float(lead_shoulder[1])

        draw_ik_ronin_arm(
            rear_arm_layer,
            sx_r,
            sy_r,
            rear_gx,
            rear_gy,
            L1=5.8,
            L2=5.5,
            bend_side=1.0,
            is_rear=True,
        )
        # Rear Tekko Gauntlet fingers wrapped over the tsuka at (rear_gx, rear_gy)
        for dy_g in (-1, 0, 1):
            for dx_g in (-1, 0, 1):
                if dx_g == 0 and dy_g == 0:
                    col_rg = CYAN_BRIGHT
                elif dy_g <= 0:
                    col_rg = INDIGO_LIGHT
                else:
                    col_rg = INDIGO_MID
                set_px(rear_gauntlet_layer, rear_gx + dx_g, rear_gy + dy_g, col_rg)

        draw_ik_ronin_arm(
            lead_arm_layer,
            sx_l,
            sy_l,
            lead_gx,
            lead_gy,
            L1=5.8,
            L2=5.5,
            bend_side=1.0,
            is_rear=False,
        )
        # 1px dark indigo silhouette seam around lead_arm_layer so the lead arm & gauntlet pop cleanly against torso
        arm_mask = lead_arm_layer[:, :, 3] > 0
        for y_a in range(3, 48):
            for x_a in range(3, 48):
                if not arm_mask[y_a, x_a]:
                    if (
                        arm_mask[y_a - 1, x_a]
                        or arm_mask[y_a + 1, x_a]
                        or arm_mask[y_a, x_a - 1]
                        or arm_mask[y_a, x_a + 1]
                    ):
                        lead_arm_layer[y_a, x_a] = INDIGO_DEEP

    # 6. Optional 3-Band Electric White, Thunder-Cyan & Indigo-Violet Crescent Katana Slash Trail
    def render_3band_slash_arc(arc_tuple):
        a_start, a_end, _arc_r, arc_int = arc_tuple
        arc_steps = 48
        piv_x = tsuba_x
        piv_y = tsuba_y
        r_uniform = eff_blade
        for k in range(arc_steps + 1):
            u_a = k / float(arc_steps)
            ang = math.radians(a_start + (a_end - a_start) * u_a)
            ca, sa = math.cos(ang), math.sin(ang)
            env = math.sin(u_a * math.pi) * arc_int
            if env <= 0.08:
                continue
            ax = max(4.0, min(47.5, piv_x + ca * r_uniform))
            ay = max(4.0, min(46.0, piv_y + sa * r_uniform))
            # Outer Band 1: Razor Diamond-White & Electric Ice-Cyan leading edge
            set_px(fx_layer, ax, ay, DIAMOND_WHITE if u_a > 0.45 else CYAN_LIGHT)
            # Mid Band 2: Blazing Thunder-Cyan core + jagged lightning teeth
            set_px(
                fx_layer,
                max(4.0, min(47.5, ax - ca * 1.2)),
                max(4.0, min(46.0, ay - sa * 1.2)),
                CYAN_BRIGHT if (k % 3 != 0) else DIAMOND_WHITE,
            )
            if env > 0.38:
                # Inner Band 3: Deep Indigo-Violet Storm Plasma wake
                set_px(
                    fx_layer,
                    max(4.0, min(47.5, ax - ca * 2.4)),
                    max(4.0, min(46.0, ay - sa * 2.4)),
                    VIOLET_BRIGHT if (k % 2 == 0) else VIOLET_GLOW,
                )
                set_px(
                    fx_layer,
                    max(4.0, min(47.5, ax - ca * 3.5)),
                    max(4.0, min(46.0, ay - sa * 3.5)),
                    VIOLET_DEEP if (k % 2 == 0) else INDIGO_MID,
                )

    if slash_arc is not None:
        render_3band_slash_arc(slash_arc)
    if cross_slash_arc is not None:
        render_3band_slash_arc(cross_slash_arc)

    # Painter's Order: Body -> Rear Arm -> Two-Handed Odachi -> Rear Gauntlet Clasp -> Lead Arm & Gauntlet -> Slash FX
    out = composite_over(canvas, rear_arm_layer)
    out = composite_over(out, odachi_layer)
    # When Odachi is raised in high Jodan-no-kamae overhead (angle_deg < -88 deg), keep kabuto crescent & eyes in front of hilt/blade base
    if angle_deg < -88.0:
        for yh in range(5, 16):
            for xh in range(23, 33):
                if canvas[yh, xh, 3] > 0:
                    out[yh, xh] = canvas[yh, xh]
    out = composite_over(out, rear_gauntlet_layer)
    out = composite_over(out, lead_arm_layer)
    out = composite_over(out, fx_layer)
    return out


def _extract_full_haori_cape(stand, dy_offset=0, phase=0.0, wave_scale=1.0, lift_y=0):
    """
    Extracts Kaze-Maru's billowing indigo-violet haori cape (`x = 4..21` for `y = 18..40`),
    filling the lower drape behind his legs (`y = 32..40, x = 14..21`) with `CAPE_DARK` / `CAPE_DEEP`
    so the haori cape sweeps continuously behind his striding or airborne legs!
    """
    cape_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    for y in range(18, 41):
        ny = y + dy_offset
        if not (3 <= ny <= 47):
            continue
        u = (y - 18) / 22.0
        wave_dx = int(round((-u * 1.2 + math.sin(phase - u * 3.0) * (1.3 * u)) * wave_scale))
        wave_dy = int(round(math.cos(phase - u * 2.5) * (0.5 * u) * wave_scale + u * lift_y))

        if y <= 32:
            for x in range(4, 22):
                if stand[y, x, 3] == 0:
                    continue
                cx = max(3, min(22, x + wave_dx))
                cy = max(10, min(44, ny + wave_dy))
                cape_layer[cy, cx] = stand[y, x]
                if x >= 15:
                    cape_layer[ny, x] = stand[y, x]
        else:
            left_x = min(15, 7 + (y - 32))
            right_x = 21 - max(0, (y - 34) // 2)
            for x in range(left_x, right_x + 1):
                if x < 15 and stand[y, x, 3] > 0:
                    col = stand[y, x]
                else:
                    if x == left_x or y >= 39 or x == right_x:
                        col = INDIGO_DEEP
                    elif (x + y) % 5 == 0:
                        col = VIOLET_DEEP
                    else:
                        col = CAPE_DARK if (x + y) % 2 == 0 else CAPE_DEEP
                cx = max(3, min(22, x + wave_dx))
                cy = max(14, min(44, ny + wave_dy))
                cape_layer[cy, cx] = col
                if 15 <= x <= right_x and y <= 38:
                    cape_layer[ny, x] = col

    return fill_layer_pinholes(cape_layer, x0=3, x1=23, y0=10, y1=45, require_3_neighbors=False)


def _draw_samurai_armored_leg(
    layer,
    boot_patch,
    orig_cx,
    hip_x,
    hip_y,
    knee_x,
    knee_y,
    ank_x,
    ank_y,
    dx_boot,
    dy_boot,
    boot_rot_deg,
    is_far_leg=False,
):
    """
    Draws Kaze-Maru's pleated indigo `hakama` thigh, cyan-lightning `kikko` knee guard,
    plated `suneate` shin greave, and rotated armored war-boot (`waraji/tabi`).
    """
    if is_far_leg:
        c_edge = INDIGO_DEEP
        c_dark = INDIGO_DEEP
        c_mid = INDIGO_DARK
        c_hi = INDIGO_MID
        c_lightning = CYAN_MID
    else:
        c_edge = INDIGO_DEEP
        c_dark = INDIGO_DARK
        c_mid = INDIGO_MID
        c_hi = INDIGO_LIGHT
        c_lightning = CYAN_BRIGHT

    # 1. Hakama pleated thigh (hip -> knee)
    thigh_strips = [
        (-2.2, c_edge),
        (-1.4, c_dark),
        (-0.6, c_mid),
        (0.2, c_hi),
        (1.0, c_mid),
        (1.8, c_dark),
        (2.3, c_edge),
    ]
    for off_x, col in thigh_strips:
        draw_line_px(layer, hip_x + off_x, hip_y, knee_x + off_x * 0.9, knee_y, col)

    # 2. Suneate armored shin greave with cyan lightning streak (knee -> ankle)
    greave_strips = [
        (-2.0, c_edge),
        (-1.2, c_dark),
        (-0.4, c_mid),
        (0.2, c_lightning),
        (0.9, c_hi),
        (1.6, c_dark),
        (2.1, c_edge),
    ]
    for off_x, col in greave_strips:
        draw_line_px(layer, knee_x + off_x * 0.9, knee_y, ank_x + off_x * 0.85, ank_y, col)

    # 3. Rotated samurai war-boot
    pil_boot = Image.fromarray(boot_patch, mode="RGBA")
    rot_boot = np.array(
        pil_boot.rotate(boot_rot_deg, resample=Image.Resampling.NEAREST, center=(orig_cx, 42.5)),
        dtype=np.uint8,
    )
    for y in range(36, 50):
        for x in range(3, 50):
            if rot_boot[y, x, 3] > 0:
                ny = min(45, max(25, y + int(round(dy_boot))))
                nx = min(48, max(3, x + int(round(dx_boot))))
                px_col = rot_boot[y, x].copy()
                if is_far_leg:
                    px_col[0] = int(px_col[0] * 0.78)
                    px_col[1] = int(px_col[1] * 0.78)
                    px_col[2] = int(px_col[2] * 0.84)
                layer[ny, nx] = px_col

    # 4. Pointed Samurai Knee-Guard (`tate-age`) with cyan lightning rune at (knee_x, knee_y)
    for dy_k in (-1, 0, 1):
        for dx_k in (-2, -1, 0, 1, 2):
            if abs(dx_k) == 2 and abs(dy_k) == 1:
                continue
            if dx_k == 0 and dy_k <= 0:
                col_k = CYAN_LIGHT if not is_far_leg else CYAN_MID
            elif dy_k == -1 or abs(dx_k) == 2:
                col_k = c_hi
            else:
                col_k = c_mid
            set_px(layer, knee_x + dx_k, knee_y + dy_k, col_k)

    return fill_layer_pinholes(layer, x0=3, x1=49, y0=24, y1=48, require_3_neighbors=False)


def render_walk_ronin(tpl, f):
    """
    Row 1 helper: Smooth 30-frame 2-step anatomical samurai stride cycle (F00..F14 Step A, F15..F29 Step B)
    preserving Kaze-Maru's billowing indigo-violet haori cape, waist obi & kusazuri hip tassets (`y = 0..34`),
    and articulated suneate greaves & war-boots!
    """
    phase = (f / 30.0) * 2.0 * math.pi
    bob_y = int(round(math.cos(phase * 2.0) * 1.0))

    stand = tpl["stand"].copy()
    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    tasset_overlay = np.zeros((52, 52, 4), dtype=np.uint8)

    # 1. Full Billowing Indigo-Violet Haori Cape behind legs
    cape_layer = _extract_full_haori_cape(stand, dy_offset=bob_y, phase=phase, wave_scale=1.0, lift_y=0)

    # 2. Upper Torso, Crescent Kabuto, Silver Mane, Obi & Kusazuri Hip Tassets (`y = 0..34`)
    for y in range(0, 35):
        ny = y + bob_y
        if not (2 <= ny <= 49):
            continue
        min_tx = 12 if y < 16 else (18 if y < 27 else 20)
        max_tx = 35
        for x in range(min_tx, max_tx):
            if stand[y, x, 3] > 0:
                torso_layer[ny, x] = stand[y, x]
                if 26 <= y <= 33 and 21 <= x <= 33:
                    tasset_overlay[ny, x] = stand[y, x]

    def build_striding_leg(boot_patch, orig_cx, hip_x, foot_base_x, swing_phase, is_far_leg=False):
        layer = np.zeros((52, 52, 4), dtype=np.uint8)
        s_val = math.sin(swing_phase)
        c_val = math.cos(swing_phase)

        knee_lift = max(0.0, c_val)
        hip_y = 33.0 + bob_y
        knee_x = hip_x + s_val * 2.5 + knee_lift * 1.2
        knee_y = hip_y + 4.8 - knee_lift * 1.8

        foot_target_x = foot_base_x + s_val * 3.0 - knee_lift * 0.8
        foot_lift_dy = bob_y - int(round(knee_lift * 2.2))
        boot_rot_deg = s_val * 10.0 - knee_lift * 12.0

        dx_boot = foot_target_x - orig_cx
        ank_x = foot_target_x + math.sin(math.radians(boot_rot_deg)) * 0.6
        ank_y = 42.0 + foot_lift_dy

        return _draw_samurai_armored_leg(
            layer,
            boot_patch=boot_patch,
            orig_cx=orig_cx,
            hip_x=hip_x,
            hip_y=hip_y,
            knee_x=knee_x,
            knee_y=knee_y,
            ank_x=ank_x,
            ank_y=ank_y,
            dx_boot=dx_boot,
            dy_boot=foot_lift_dy,
            boot_rot_deg=boot_rot_deg,
            is_far_leg=is_far_leg,
        )

    far_leg = build_striding_leg(
        tpl["leg_back"], orig_cx=22.5, hip_x=22.5, foot_base_x=22.0, swing_phase=phase + math.pi, is_far_leg=True
    )
    near_leg = build_striding_leg(
        tpl["leg_front"], orig_cx=33.0, hip_x=30.5, foot_base_x=32.5, swing_phase=phase, is_far_leg=False
    )

    out = composite_over(cape_layer, far_leg)
    out = composite_over(out, torso_layer)
    out = composite_over(out, near_leg)
    out = composite_over(out, tasset_overlay)
    out = apply_cape_and_mane_wave(out, phase, amplitude=1.4, vertical_flutter=0.5, rune_pulse=0.7)
    return fill_layer_pinholes(out)


def make_crouch_ronin(tpl, crouch_depth):
    """
    Constructs Kaze-Maru's deep knee-bend samurai crouch via a continuous vertical compression warp on `tpl['stand']`:
    - Shifts `ny <= 27 + d` down by `d`
    - Compresses `ny = 28 + d .. 43` from `sy = 27 .. 43` with a 1px forward knee bend
    - Keeps his war-boots anchored firmly on the ground at `ny = 44..49`.
    """
    stand = tpl["stand"]
    d = max(0, min(6, int(round(crouch_depth))))
    if d <= 0:
        return stand.copy()

    canvas = np.zeros((52, 52, 4), dtype=np.uint8)

    # 1. Shift upper body, crescent kabuto, sode pauldrons, and obi (`ny <= 27 + d`) down by `d`
    for ny in range(d, 28 + d):
        sy = ny - d
        if 0 <= sy <= 27 and 2 <= ny <= 49:
            canvas[ny, :] = stand[sy, :]

    # 2. Compress kusazuri tassets, hakama thighs, knee guards, and suneate greaves (`ny = 28 + d .. 43`)
    span = max(1.0, float(43 - (28 + d)))
    for ny in range(28 + d, 44):
        u = (ny - (28 + d)) / span
        sy = int(round(27.0 + u * 16.0))
        sy = max(27, min(43, sy))
        knee_dx = 1 if (d >= 2 and 0.25 <= u <= 0.75) else 0
        for x in range(2, 50):
            if stand[sy, x, 3] > 0:
                nx = x if x <= 16 else min(49, x + knee_dx)
                canvas[ny, nx] = stand[sy, x]

    # 3. Keep war-boots anchored firmly on the ground at `ny = 44..49`
    for ny in range(44, 50):
        canvas[ny, :] = stand[ny, :]

    return fill_layer_pinholes(canvas)


def make_aerial_ronin(tpl, jump_dy, body_tilt_deg=0.0, leg_tuck=0.5, thruster_intensity=0.8, phase=0.0):
    """
    Row 8 helper: Constructs a full-body airborne Kaze-Maru posture with tucked knees and
    **crackling electric cloud/lightning thrusters** beneath his boots, preserving his crescent kabuto,
    silver mane, billowing haori cape, kusazuri hip tassets, and articulated suneate legs!
    """
    stand = tpl["stand"].copy()
    dy_i = max(-3, min(4, int(round(jump_dy))))
    t = max(0.0, min(1.0, leg_tuck))

    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    tasset_overlay = np.zeros((52, 52, 4), dtype=np.uint8)

    cape_lift = int(round(-t * 1.5))
    cape_layer = _extract_full_haori_cape(stand, dy_offset=dy_i, phase=phase, wave_scale=1.1, lift_y=cape_lift)

    lean_dx = 1 if body_tilt_deg > 5.0 else (-1 if body_tilt_deg < -5.0 else 0)
    for y in range(0, 35):
        ny = max(2, min(47, y + dy_i))
        dx = lean_dx if y <= 24 else 0
        min_tx = 12 if y < 16 else (18 if y < 27 else 20)
        max_tx = 35
        for x in range(min_tx, max_tx):
            if stand[y, x, 3] > 0:
                nx = max(2, min(48, x + dx))
                torso_layer[ny, nx] = stand[y, x]
                if 26 <= y <= 33 and 21 <= x <= 33:
                    tasset_overlay[ny, nx] = stand[y, x]

    hip_y = 33.0 + dy_i

    def build_aerial_leg(boot_patch, orig_cx, hip_x, knee_dx, knee_dy, foot_dx, foot_dy, boot_rot_deg, is_far_leg=False):
        layer = np.zeros((52, 52, 4), dtype=np.uint8)
        kx = hip_x + knee_dx
        ky = hip_y + knee_dy
        ax = orig_cx + foot_dx
        ay = 42.0 + foot_dy
        return _draw_samurai_armored_leg(
            layer,
            boot_patch=boot_patch,
            orig_cx=orig_cx,
            hip_x=hip_x,
            hip_y=hip_y,
            knee_x=kx,
            knee_y=ky,
            ank_x=ax,
            ank_y=ay,
            dx_boot=foot_dx,
            dy_boot=foot_dy,
            boot_rot_deg=boot_rot_deg,
            is_far_leg=is_far_leg,
        )

    far_leg = build_aerial_leg(
        tpl["leg_back"],
        orig_cx=22.5,
        hip_x=22.5,
        knee_dx=-1.0 - 1.0 * t,
        knee_dy=4.4 - 1.8 * t,
        foot_dx=-0.5 - 1.0 * t,
        foot_dy=dy_i - 2.2 * t,
        boot_rot_deg=-10.0 * t,
        is_far_leg=True,
    )
    near_leg = build_aerial_leg(
        tpl["leg_front"],
        orig_cx=33.0,
        hip_x=30.5,
        knee_dx=1.4 + 1.2 * t,
        knee_dy=4.0 - 2.2 * t,
        foot_dx=0.0 + 1.0 * t,
        foot_dy=dy_i - 3.0 * t,
        boot_rot_deg=-14.0 * t,
        is_far_leg=False,
    )

    # Crackling Electric Cloud / Lightning Thrusters beneath both boots when airborne
    fx_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    if thruster_intensity > 0.1:
        jet_len = int(round(4.5 * thruster_intensity))
        near_boot_y = max(30, min(43, int(round(44 + dy_i - 3.0 * t))))
        far_boot_y = max(30, min(43, int(round(44 + dy_i - 2.2 * t))))
        for boot_cx, boot_by in [(21, far_boot_y), (33, near_boot_y)]:
            # Swirling electric storm cloud puff directly under boot sole
            for dx_c in (-2, -1, 0, 1, 2):
                set_px(
                    fx_layer,
                    boot_cx + dx_c,
                    boot_by + 1,
                    DIAMOND_WHITE if dx_c == 0 else (CYAN_LIGHT if abs(dx_c) == 1 else VIOLET_BRIGHT),
                )
            # Jagged downward lightning thruster arcs
            for d in range(1, jet_len + 1):
                jy = boot_by + 1 + d
                if jy <= 48:
                    zig = 1 if ((d + int(round(phase * 3))) % 2 == 0) else -1
                    col = DIAMOND_WHITE if d == 1 else (CYAN_BRIGHT if d <= 2 else (VIOLET_BRIGHT if d <= 3 else VIOLET_GLOW))
                    set_px(fx_layer, boot_cx + zig, jy, col)
                    if d <= 2:
                        set_px(fx_layer, boot_cx, jy, CYAN_LIGHT)

    out = composite_over(fx_layer, cape_layer)
    out = composite_over(out, far_leg)
    out = composite_over(out, torso_layer)
    out = composite_over(out, near_leg)
    out = composite_over(out, tasset_overlay)
    out = apply_cape_and_mane_wave(out, phase, amplitude=1.5, vertical_flutter=0.6, rune_pulse=0.95)
    return fill_layer_pinholes(out)


def draw_raijin_8drum_wheel_sigil(canvas, cx, cy, rx, ry, phase, num_drums=8, is_ground=False):
    """
    Renders a Rotating 8-Drum Raijin Thunder-Wheel Sigil (overhead at y=4..10 or behind shoulders)
    or a Ground Raijin Lightning Circle (`y = 44..48`).
    """
    # 1. Crackling Electric-Cyan & Violet Ring Perimeter
    steps = 32
    for i in range(steps):
        ang = (i / float(steps)) * 2.0 * math.pi + phase
        px_x = max(3, min(48, int(round(cx + math.cos(ang) * rx))))
        px_y = max(3, min(48, int(round(cy + math.sin(ang) * ry))))
        col = DIAMOND_WHITE if i % 4 == 0 else (CYAN_BRIGHT if i % 2 == 0 else VIOLET_BRIGHT)
        set_px(canvas, px_x, px_y, col)

    # 2. 8 Rotating Brass-and-Cyan Raijin Thunder-Drums with Tomoe Cores around the ring
    for d_i in range(num_drums):
        da = (d_i / float(num_drums)) * 2.0 * math.pi + phase
        dx_d = max(4, min(47, int(round(cx + math.cos(da) * rx))))
        dy_d = max(4, min(47, int(round(cy + math.sin(da) * ry))))
        set_px(canvas, dx_d, dy_d, DIAMOND_WHITE if (d_i % 2 == 0) else CYAN_LIGHT)
        if not is_ground:
            for ox, oy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                set_px(canvas, dx_d + ox, dy_d + oy, BRASS_BRIGHT if (ox + oy) % 2 == 0 else VIOLET_GLOW)
        else:
            set_px(canvas, dx_d - 1, dy_d, BRASS_BRIGHT)
            set_px(canvas, dx_d + 1, dy_d, CYAN_BRIGHT)


def build_row0_idle(tpl):
    """
    Row 0 (`IDLE`, 0..29):
    - Breathing cycle (`1px` chest/shoulder rise on `F08..F20` with solid waist row duplication)
    - Billowing indigo-violet haori cape & silver kabuto mane wave (`F00..F29`)
    - Pulsing cyan-violet armor lightning runes
    - Two-handed `Chudan-no-kamae` guard (`hand_x = 31, hand_y = 23 + breath_dy, angle_deg = -48°`)
    - Subtle rising electric cyan-violet sparks along the Odachi blade & tip.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        base = tpl["stand"].copy()

        # 1px breathing rise on F08..F20 with waist row duplication so zero horizontal slit opens
        breath_dy = -1 if 8 <= f <= 20 else 0
        if breath_dy == -1:
            upper = base[5:31, 12:35].copy()
            base[4:30, 12:35] = upper
            base[30, 12:35] = upper[25, :]
            base = fill_layer_pinholes(base)

        pulse = 0.55 + 0.45 * math.sin(phase)
        base = apply_cape_and_mane_wave(
            base, phase, amplitude=1.5, vertical_flutter=0.5, rune_pulse=pulse
        )

        # Two-handed Chudan-no-kamae guard in front of Kaze-Maru's torso
        odachi_ang = -48.0 + math.sin(phase) * 3.5
        hx = 31
        hy = 23 + breath_dy
        frame = draw_two_handed_odachi(
            base,
            hand_x=hx,
            hand_y=hy,
            angle_deg=odachi_ang,
            glow_intensity=0.9 + 0.3 * math.sin(phase),
            scale=1.0,
            blade_len=17.0,
            rear_shoulder=(21, 18 + breath_dy),
            lead_shoulder=(27, 19 + breath_dy),
            draw_arms=True,
            phase=phase,
        )

        # Rising electric cyan-violet spark drifting near the Odachi kissaki tip
        spark_x = 42 + (f % 4)
        spark_y = max(6, 11 + breath_dy - ((f // 3) % 4))
        set_px(frame, spark_x, spark_y, DIAMOND_WHITE if f % 3 == 0 else (CYAN_LIGHT if f % 2 == 0 else VIOLET_BRIGHT))

        frames.append(frame)
    return frames


def build_row1_walk(tpl):
    """
    Row 1 (`WALK`, 30..59):
    - Smooth 30-frame 2-step anatomical stride cycle (`F00..F14` Step A, `F15..F29` Step B)
    - Grounded heel-strike lightning/dust motes at `F07..F10` and `F22..F25`
    - Two-handed Thunder-Odachi carried in mobile Chudan guard with both IK arms connected.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        body = render_walk_ronin(tpl, f)
        bob_y = int(round(math.cos(phase * 2.0) * 1.0))

        swing = math.sin(phase)
        odachi_ang = -44.0 + swing * 12.0
        hx = 31 - int(round(swing * 1.5))
        hy = 23 + bob_y

        frame = draw_two_handed_odachi(
            body,
            hand_x=hx,
            hand_y=hy,
            angle_deg=odachi_ang,
            glow_intensity=0.95 + 0.2 * math.sin(phase * 2.0),
            scale=1.0,
            blade_len=17.0,
            rear_shoulder=(21, 18 + bob_y),
            lead_shoulder=(27, 19 + bob_y),
            draw_arms=True,
            phase=phase,
        )

        # Grounded heel-strike lightning/dust motes at F07..F10 (Step A plant) and F22..F25 (Step B plant)
        if 7 <= f <= 10:
            k = f - 7
            for m_i in range(3):
                mx = min(47, 34 + k + m_i * 2)
                my = max(41, 45 - m_i - (k % 2))
                set_px(frame, mx, my, DIAMOND_WHITE if m_i == 0 else (CYAN_BRIGHT if m_i == 1 else VIOLET_BRIGHT))
        elif 22 <= f <= 25:
            k = f - 22
            for m_i in range(3):
                mx = max(14, 21 - k - m_i * 2)
                my = max(41, 45 - m_i - (k % 2))
                set_px(frame, mx, my, DIAMOND_WHITE if m_i == 0 else (CYAN_BRIGHT if m_i == 1 else VIOLET_BRIGHT))

        frames.append(frame)
    return frames


def build_row2_auto_attack(tpl):
    """
    Row 2 (`AUTO_ATTACK - Thunder Iaido & Jodan Cleave`, 60..89):
    - `F00..F09`: Raises Odachi with both hands to `-118°` (`Jodan-no-kamae` high overhead guard).
    - `F10..F17`: Unleashes a supersonic `145°` two-handed downward lightning cleave from `-118°` to `+26°`
      with a blazing 3-band **Electric White, Thunder-Cyan & Indigo-Violet Crescent Katana Slash Trail**
      and ground-skimming lightning sparks.
    - `F18..F29`: Smooth two-handed Kendo `zanshin` recovery back to `-48°`.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 9:
            # F00..F09: Two-handed Jodan-no-kamae overhead windup from -48 deg to -118 deg
            u = f / 9.0
            base = tpl["stand"].copy()
            base = apply_cape_and_mane_wave(
                base, phase, amplitude=1.5 + u * 0.5, vertical_flutter=0.6, rune_pulse=0.65 + u * 0.35
            )
            ang = -48.0 * (1.0 - u) + (-118.0) * u
            hx = int(round(31 * (1.0 - u) + 29 * u))
            hy = int(round(23 * (1.0 - u) + 14 * u))
            frame = draw_two_handed_odachi(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=0.95 + u * 0.4,
                scale=1.02,
                blade_len=17.0,
                rear_shoulder=(21, 18),
                lead_shoulder=(27, 18),
                draw_arms=True,
                phase=phase,
            )
            frames.append(frame)

        elif f <= 17:
            # F10..F17: Supersonic 145 deg two-handed downward lightning cleave (-118 deg -> +26 deg)
            k = f - 10  # 0..7
            base = (tpl["lunge"] if k >= 1 else tpl["stand"]).copy()
            base = apply_cape_and_mane_wave(
                base, phase * 2.2, amplitude=2.0, vertical_flutter=0.8, rune_pulse=1.0
            )
            ang_seq = [-68.0, -18.0, 12.0, 26.0, 26.0, 22.0, 14.0, 4.0]
            hx_seq = [32, 34, 35, 35, 35, 34, 34, 33]
            hy_seq = [16, 19, 22, 24, 24, 24, 23, 23]

            slash_arc = None
            if k <= 5:
                arc_int = [0.9, 1.0, 1.0, 0.95, 0.8, 0.55][k]
                a0 = [-118.0, -108.0, -96.0, -82.0, -68.0, -52.0][k]
                slash_arc = (a0, ang_seq[k] + 5.0, 18.5, arc_int)

            frame = draw_two_handed_odachi(
                base,
                hand_x=hx_seq[k],
                hand_y=hy_seq[k],
                angle_deg=ang_seq[k],
                glow_intensity=1.4 if k <= 5 else 1.1,
                scale=1.04,
                blade_len=17.0,
                rear_shoulder=(23, 18),
                lead_shoulder=(29, 19),
                draw_arms=True,
                slash_arc=slash_arc,
                phase=phase,
            )

            # Crackling electric ground-cleave sparks at blade tip impact zone (k=1..6)
            if 1 <= k <= 6:
                imp_x, imp_y = 43, 44
                for sp in range(5):
                    sx_s = min(48, imp_x - 4 + sp * 2 + (k % 2))
                    sy_s = max(38, imp_y - ((sp + k) % 4) * 2)
                    set_px(frame, sx_s, sy_s, DIAMOND_WHITE if sp == 2 else (CYAN_LIGHT if sp % 2 == 0 else VIOLET_BRIGHT))
                draw_line_px(frame, imp_x - 5, 45, min(48, imp_x + 4), 45, CYAN_BRIGHT if k <= 3 else VIOLET_GLOW)

            frames.append(frame)

        else:
            # F18..F29: Smooth two-handed recovery from 4 deg back to -48 deg Chudan guard
            u = (f - 18) / 11.0
            base = (tpl["lunge"] if f <= 20 else tpl["stand"]).copy()
            base = apply_cape_and_mane_wave(
                base, phase, amplitude=1.5, vertical_flutter=0.5, rune_pulse=0.85 - u * 0.25
            )
            ang = 4.0 * (1.0 - u) + (-48.0) * u
            hx = int(round(33 * (1.0 - u) + 31 * u))
            hy = 23
            frame = draw_two_handed_odachi(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.05 - u * 0.15,
                scale=1.0,
                blade_len=17.0,
                rear_shoulder=(21, 18),
                lead_shoulder=(27, 19),
                draw_arms=True,
                phase=phase,
            )
            frames.append(frame)
    return frames


def draw_raijin_ground_fissures(canvas, k):
    """
    Row 3 helper (F13..F22, k = 0..9): Erupts crackling electric-cyan & indigo-violet
    ground lightning fissures and rising plasma sparks along `x = 24..48, y = 42..48`.
    """
    max_fx = min(48, 30 + k * 3) if k <= 6 else 48
    fade = 1.0 if k <= 6 else max(0.35, 1.0 - (k - 6) * 0.22)

    for x in range(24, max_fx + 1):
        zig = ((x + k) % 3) - 1
        core_y = max(44, min(47, 46 + zig))
        set_px(canvas, x, min(48, core_y + 1), INDIGO_DARK if (x % 2 == 0) else VIOLET_DEEP)
        set_px(canvas, x, max(43, core_y - 1), VIOLET_GLOW if (x % 3 == 0) else CYAN_DEEP)
        if fade > 0.65:
            core_col = DIAMOND_WHITE if (x + k) % 4 == 0 else (CYAN_LIGHT if (x + k) % 2 == 0 else VIOLET_BRIGHT)
        else:
            core_col = CYAN_BRIGHT if (x + k) % 2 == 0 else VIOLET_GLOW
        set_px(canvas, x, core_y, core_col)

    # Mini vertical lightning arcs jumping off the ground fissure at x = 31, 37, 43, 47
    for lx in (31, 37, 43, 47):
        if lx <= max_fx:
            arc_h = 4 if (k <= 5 and lx >= 37) else 2
            for dy_a in range(arc_h):
                ly = max(41, 45 - dy_a)
                zig_x = min(48, lx + ((dy_a + k) % 2))
                set_px(
                    canvas,
                    zig_x,
                    ly,
                    DIAMOND_WHITE if dy_a == arc_h - 1 else (CYAN_LIGHT if dy_a % 2 == 0 else VIOLET_BRIGHT),
                )


def build_row3_skill(tpl):
    """
    Row 3 (`SKILL - Raijin Thunder-Pillar & Flash-Cut`, 90..119):
    - **Phase 1 (`F00..F12`)**: Overhead two-handed lightning convergence with a
      **Rotating 8-Drum Raijin Thunder-Wheel Sigil** above his kabuto (`x = 18..32, y = 4..10`)
      + **Ground Raijin Lightning Circle** (`y = 44..48, x = 14..38`).
    - **Phase 2 (`F13..F22`)**: Explosive horizontal/diagonal Iaido flash-cut with crackling ground lightning fissures.
    - **Phase 3 (`F23..F29`)**: Smooth recovery to two-handed Chudan guard.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 12:
            # Phase 1 (F00..F12): Overhead two-handed lightning convergence + 8-Drum Raijin Sigil + Ground Circle
            u = f / 12.0
            base = tpl["stand"].copy()
            base = apply_cape_and_mane_wave(
                base, phase * 1.6, amplitude=1.6, vertical_flutter=0.6, rune_pulse=0.75 + u * 0.25
            )
            # Ground Raijin Lightning Circle (y = 44..48, x = 14..38)
            draw_raijin_8drum_wheel_sigil(
                base, cx=26.0, cy=46.0, rx=8.0 + u * 4.5, ry=1.8, phase=phase * 2.0, num_drums=8, is_ground=True
            )

            ang = -48.0 * (1.0 - u) + (-115.0) * u
            hx = int(round(31 * (1.0 - u) + 29 * u))
            hy = int(round(23 * (1.0 - u) + 14 * u))
            frame = draw_two_handed_odachi(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.05 + u * 0.35,
                scale=1.02,
                blade_len=17.0,
                rear_shoulder=(21, 18),
                lead_shoulder=(27, 18),
                draw_arms=True,
                phase=phase,
            )

            # Rotating 8-Drum Raijin Thunder-Wheel Sigil above his kabuto (x = 18..32, y = 4..10)
            if f >= 2:
                su = min(1.0, (f - 1) / 9.0)
                draw_raijin_8drum_wheel_sigil(
                    frame, cx=25.0, cy=7.0, rx=3.5 + 3.5 * su, ry=1.5 + 1.2 * su, phase=phase * 2.2, num_drums=8, is_ground=False
                )
            frames.append(frame)

        elif f <= 22:
            # Phase 2 (F13..F22): Explosive horizontal/diagonal Iaido flash-cut + ground lightning fissures
            k = f - 13  # 0..9
            base = tpl["lunge"].copy()
            base = apply_cape_and_mane_wave(
                base, phase * 2.5, amplitude=2.0, vertical_flutter=0.8, rune_pulse=1.0
            )
            ang_seq = [-66.0, -18.0, 8.0, 18.0, 20.0, 18.0, 12.0, 4.0, -8.0, -22.0]
            hx_seq = [32, 34, 35, 35, 35, 35, 34, 34, 33, 32]
            hy_seq = [16, 19, 21, 23, 23, 23, 22, 22, 22, 22]

            slash_arc = None
            if k <= 5:
                arc_int = [0.9, 1.0, 1.0, 0.95, 0.8, 0.55][k]
                a0 = [-115.0, -104.0, -90.0, -76.0, -64.0, -48.0][k]
                slash_arc = (a0, ang_seq[k] + 5.0, 18.5, arc_int)

            frame = draw_two_handed_odachi(
                base,
                hand_x=hx_seq[k],
                hand_y=hy_seq[k],
                angle_deg=ang_seq[k],
                glow_intensity=1.4 if k <= 6 else 1.05,
                scale=1.03,
                blade_len=17.0,
                rear_shoulder=(23, 18),
                lead_shoulder=(29, 19),
                draw_arms=True,
                slash_arc=slash_arc,
                phase=phase,
            )

            # Explosive horizontal Iaido flash-cut beam across x = 24..48, y = 21..25 (k = 1..6)
            if 1 <= k <= 6:
                for rx_i in range(18):
                    ua = rx_i / 17.0
                    arc_x = int(round(25 + ua * 22))
                    arc_y = 23 + int(round(math.sin((ua - 0.5) * math.pi) * 3.0))
                    set_px(frame, arc_x, arc_y, DIAMOND_WHITE if ua > 0.55 else CYAN_LIGHT)
                    set_px(frame, arc_x, arc_y - 1, CYAN_BRIGHT if rx_i % 2 == 0 else VIOLET_BRIGHT)
                    set_px(frame, arc_x, arc_y + 1, VIOLET_GLOW)

            # Crackling ground lightning fissures (x = 24..48, y = 42..48)
            draw_raijin_ground_fissures(frame, k)
            frames.append(frame)

        else:
            # Phase 3 (F23..F29): Smooth recovery to Chudan guard
            u = (f - 23) / 6.0
            base = (tpl["lunge"] if f <= 24 else tpl["stand"]).copy()
            base = apply_cape_and_mane_wave(
                base, phase, amplitude=1.5, vertical_flutter=0.5, rune_pulse=0.75 - u * 0.2
            )
            ang = -22.0 * (1.0 - u) + (-48.0) * u
            hx = int(round(32 * (1.0 - u) + 31 * u))
            frame = draw_two_handed_odachi(
                base,
                hand_x=hx,
                hand_y=23,
                angle_deg=ang,
                glow_intensity=0.95,
                scale=1.0,
                blade_len=17.0,
                rear_shoulder=(21, 18),
                lead_shoulder=(27, 19),
                draw_arms=True,
                phase=phase,
            )
            frames.append(frame)
    return frames


def draw_susanoo_8drum_halo_and_arcs(canvas, f, crouch_d=0, intensity=1.0, phase=0.0):
    """
    Row 4 Ultimate helper:
    1. **Floating 8-Drum Raijin Halo Ring** behind Kaze-Maru's shoulders (`cx = 25, cy = 16 + crouch_d, r = 10.5`)
    2. Crackling multi-branch cyan-violet lightning arcs around his kabuto & pauldrons
    3. Blazing ground storm seal (`y = 44..48, x = 12..48`).
    """
    bg_halo = np.zeros((52, 52, 4), dtype=np.uint8)
    cx, cy = 25.0, 16.5 + crouch_d
    r_halo = 10.5

    # 1. Floating 8-Drum Raijin Halo Ring behind shoulders
    for s in range(40):
        ang = (s / 40.0) * 2.0 * math.pi + phase
        rx = max(4, min(47, int(round(cx + math.cos(ang) * r_halo))))
        ry = max(4, min(45, int(round(cy + math.sin(ang) * r_halo))))
        set_px(bg_halo, rx, ry, CYAN_BRIGHT if s % 2 == 0 else VIOLET_GLOW)

    for d_i in range(8):
        da = (d_i / 8.0) * 2.0 * math.pi + phase
        dx_d = max(5, min(46, int(round(cx + math.cos(da) * r_halo))))
        dy_d = max(5, min(44, int(round(cy + math.sin(da) * r_halo))))
        for oy in (-1, 0, 1):
            for ox in (-1, 0, 1):
                if ox == 0 and oy == 0:
                    col_d = DIAMOND_WHITE if (d_i + f) % 2 == 0 else CYAN_LIGHT
                elif abs(ox) + abs(oy) == 1:
                    col_d = BRASS_BRIGHT if (d_i % 2 == 0) else CYAN_BRIGHT
                else:
                    col_d = BRASS_MID
                set_px(bg_halo, dx_d + ox, dy_d + oy, col_d)

    # Composite character over the Halo Ring so the 8-drum ring floats behind his shoulders
    out = composite_over(bg_halo, canvas)

    # 2. Crackling multi-branch cyan-violet lightning arcs around kabuto & pauldrons
    origins = [
        (22, max(5, 8 + crouch_d), -1, -1),
        (31, max(5, 8 + crouch_d), 1, -1),
        (15, max(8, 16 + crouch_d), -1, 0),
        (32, max(8, 16 + crouch_d), 1, -1),
    ]
    for idx, (ox, oy, dir_x, dir_y) in enumerate(origins):
        cx_l, cy_l = float(ox), float(oy)
        steps = 4 if intensity >= 0.85 else 3
        for s in range(1, steps + 1):
            zig = 1 if ((f + idx + s) % 2 == 0) else -1
            nx_l = max(4.0, min(47.0, cx_l + dir_x * 1.6 + zig * 0.8))
            ny_l = max(3.0, min(45.0, cy_l + dir_y * 1.2 - (0.5 if dir_y == 0 else 0.0) + zig * 0.7))
            col_l = DIAMOND_WHITE if s == 1 else (CYAN_LIGHT if (s + idx + f) % 2 == 0 else VIOLET_BRIGHT)
            draw_line_px(out, cx_l, cy_l, nx_l, ny_l, col_l)
            cx_l, cy_l = nx_l, ny_l

    # 3. Blazing Ground Storm Seal (y = 44..48, x = 12..48)
    max_sx = 48 if f >= 11 else int(round(36 + (f / 10.0) * 10))
    for x in range(12, max_sx + 1):
        wave = (x + f) % 3
        set_px(out, x, 48, INDIGO_DARK if x % 3 == 0 else VIOLET_DEEP)
        set_px(out, x, 47, VIOLET_GLOW if wave == 0 else (CYAN_MID if wave == 1 else INDIGO_MID))
        set_px(out, x, 46, DIAMOND_WHITE if (f >= 11 and wave == 0) else (CYAN_LIGHT if wave == 1 else CYAN_BRIGHT))
        if (x + f) % 4 == 0:
            set_px(out, x, 45, VIOLET_BRIGHT if wave == 2 else CYAN_LIGHT)

    # Erupting ground storm lightning pillars during overdrive (F11..F25)
    if 11 <= f <= 25:
        pillar_xs = [15, 24, 35, 45] if f < 20 else [14, 20, 27, 34, 41, 47]
        for p_idx, px_p in enumerate(pillar_xs):
            top_y = max(39, 41 - ((f + p_idx) % 3))
            is_cyan = (p_idx % 2 == 0)
            for py_p in range(top_y, 47):
                set_px(out, px_p, py_p, DIAMOND_WHITE if is_cyan else VIOLET_WHITE)
                if px_p - 1 >= 12:
                    set_px(out, px_p - 1, py_p, CYAN_LIGHT if is_cyan else VIOLET_BRIGHT)
                if px_p + 1 <= 48:
                    set_px(out, px_p + 1, py_p, CYAN_BRIGHT if is_cyan else VIOLET_GLOW)

    return out


def build_row4_ultimate(tpl):
    """
    Row 4 (`ULTIMATE - Susanoo: Thousand-Blade Thunderstorm`, 120..149):
    - Surrounded by a **Floating 8-Drum Raijin Halo Ring** behind his shoulders, crackling multi-branch
      cyan-violet lightning arcs, a blazing ground storm seal (`y = 44..48`), and a multi-slash
      cross-cleave overdrive (`F11..F24`).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 10:
            # F00..F10: Skyward Susanoo awakening & overhead Thunder-Odachi hoist (-48 deg -> -116 deg)
            u = f / 10.0
            base = tpl["stand"].copy()
            base = apply_cape_and_mane_wave(
                base, phase * 2.5, amplitude=1.8, vertical_flutter=0.8, rune_pulse=1.0
            )
            base = draw_susanoo_8drum_halo_and_arcs(base, f, crouch_d=0, intensity=0.5 + 0.5 * u, phase=phase * 2.0)

            ang = -48.0 * (1.0 - u) + (-116.0) * u
            hx = int(round(31 * (1.0 - u) + 29 * u))
            hy = int(round(23 * (1.0 - u) + 13 * u))
            frame = draw_two_handed_odachi(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.2 + u * 0.3,
                scale=1.04,
                blade_len=17.0,
                rear_shoulder=(21, 18),
                lead_shoulder=(27, 18),
                draw_arms=True,
                phase=phase * 2.0,
            )
            frames.append(frame)

        elif f <= 24:
            # F11..F24: Multi-slash cross-cleave overdrive (Slash 1: F11..F15, Slash 2: F16..F20, Final X-Cleave: F21..F24)
            k = f - 11  # 0..13
            crouch_d = 2 if (k in (1, 2, 6, 7)) else (4 if k >= 10 else 0)
            base = make_crouch_ronin(tpl, crouch_d) if crouch_d > 0 else tpl["lunge"].copy()
            base = apply_cape_and_mane_wave(
                base, phase * 3.0, amplitude=2.0, vertical_flutter=0.9, rune_pulse=1.0
            )
            base = draw_susanoo_8drum_halo_and_arcs(
                base, f, crouch_d=crouch_d, intensity=1.0, phase=phase * 3.0
            )

            sy_r, sy_l = 18 + crouch_d, 19 + crouch_d
            if k <= 4:
                # Slash 1 (F11..F15): High-to-low downward diagonal thunder cleave
                ang = [-45.0, 10.0, 26.0, 20.0, -15.0][k]
                hx, hy = 35, sy_l + 4
                slash1 = (-110.0, ang + 6.0, 18.5, 1.0 if k <= 3 else 0.7)
                slash2 = None
            elif k <= 9:
                # Slash 2 (F16..F20): Rising reverse-diagonal lightning flash-cut
                sk = k - 5
                ang = [30.0, -12.0, -52.0, -76.0, -92.0][sk]
                hx, hy = 34, sy_l + 1
                slash1 = (ang - 6.0, 32.0, 18.5, 1.0 if sk <= 3 else 0.75)
                slash2 = None
            else:
                # Final X-Cleave Overdrive (F21..F24): Simultaneous intersecting X-slash arcs!
                sk = k - 10
                ang = [-20.0, 22.0, 28.0, 24.0][sk]
                hx, hy = 35, sy_l + 4
                slash1 = (-108.0, 30.0, 18.5, 1.0)
                slash2 = (-68.0, 34.0, 15.5, 0.95)

            frame = draw_two_handed_odachi(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.5,
                scale=1.06,
                blade_len=17.0,
                rear_shoulder=(22, sy_r),
                lead_shoulder=(28, sy_l),
                draw_arms=True,
                slash_arc=slash1,
                cross_slash_arc=slash2,
                phase=phase * 2.5,
            )
            frames.append(frame)

        else:
            # F25..F29: Triumphant recovery to Chudan guard as Raijin halo & storm seal subside
            k = f - 25  # 0..4
            u = (k + 1) / 5.0
            crouch_d = [3, 2, 1, 0, 0][k]
            base = make_crouch_ronin(tpl, crouch_d) if crouch_d > 0 else tpl["stand"].copy()
            base = apply_cape_and_mane_wave(base, phase, amplitude=1.5, vertical_flutter=0.6, rune_pulse=0.9)
            base = draw_susanoo_8drum_halo_and_arcs(
                base, f, crouch_d=crouch_d, intensity=max(0.3, 1.0 - u * 0.7), phase=phase * 2.0
            )
            ang = 20.0 * (1.0 - u) + (-48.0) * u
            frame = draw_two_handed_odachi(
                base,
                hand_x=int(round(34 * (1.0 - u) + 31 * u)),
                hand_y=23 + crouch_d,
                angle_deg=ang,
                glow_intensity=1.2 - u * 0.25,
                scale=1.02,
                blade_len=17.0,
                rear_shoulder=(21, 18 + crouch_d),
                lead_shoulder=(27, 19 + crouch_d),
                draw_arms=True,
                phase=phase,
            )
            frames.append(frame)
    return frames


def build_row5_death(tpl):
    """
    Row 5 (`DEATH & HURT`, 150..179):
    - `F00..F06`: Hurt stagger with electric hit-sparks.
    - `F07..F17`: Progressive kneeling collapse (`F07..F13` drops to knee bracing on Odachi, `F14..F17` sinks lower).
    - `F18..F29`: **Grounded horizontal prone collapse** (`y = 33..46`, anchored on the floor at `y = 46`, never floating)
      with the Odachi resting flat on the floor (`y = 44..46`) and fading cyan-violet soul embers.
    """
    frames = []
    for f in range(30):
        if f <= 6:
            # F00..F06: Hurt stagger recoil with electric cyan-violet hit-sparks
            u = f / 6.0
            dx = -int(round(math.sin(u * math.pi * 0.85) * 2.0))
            dy = int(round(u * 2.0))
            base = shift_layer(tpl["stand"], dx=dx, dy=dy)
            base = apply_cape_and_mane_wave(base, u * math.pi, amplitude=1.5, vertical_flutter=0.5, rune_pulse=0.45)
            frame = draw_two_handed_odachi(
                base,
                hand_x=max(29, 31 + dx),
                hand_y=23 + dy,
                angle_deg=-48.0 + u * 42.0,
                glow_intensity=0.7,
                scale=1.0,
                blade_len=17.0,
                rear_shoulder=(21 + dx, 18 + dy),
                lead_shoulder=(27 + dx, 19 + dy),
                draw_arms=True,
            )
            # Electric hit-sparks bursting off breastplate
            for sp in range(4):
                sx_s = min(47, 30 + sp * 2 + f)
                sy_s = max(5, 20 - (sp % 2) * 3 + (f // 2))
                set_px(frame, sx_s, sy_s, DIAMOND_WHITE if sp == 0 else (CYAN_BRIGHT if sp % 2 == 0 else VIOLET_BRIGHT))
            frames.append(frame)

        elif f <= 17:
            # F07..F17: Progressive kneeling collapse
            u = (f - 7) / 10.0
            kneel_src = tpl["kneel"].copy()
            extra_drop = 0 if f <= 13 else (f - 13)  # 1, 2, 3, 4 on F14..F17
            base = np.zeros((52, 52, 4), dtype=np.uint8)
            for sy in range(8, 46):
                for sx in range(3, 48):
                    if kneel_src[sy, sx, 3] > 0:
                        if sy <= 34:
                            ny = min(45, sy + 1 + extra_drop)
                            nx = min(48, sx + (1 if (extra_drop >= 2 and sy <= 24) else 0))
                        else:
                            ny = min(46, sy + 1)
                            nx = sx
                        base[ny, nx] = kneel_src[sy, sx]
            base = fill_layer_pinholes(base)
            flicker = 0.65 if (f % 3 == 0) else 0.2
            base = apply_cape_and_mane_wave(base, u * math.pi, amplitude=1.0, vertical_flutter=0.3, rune_pulse=flicker)

            frame = draw_two_handed_odachi(
                base,
                hand_x=32,
                hand_y=26 + extra_drop,
                angle_deg=24.0 + u * 20.0,
                glow_intensity=max(0.25, 0.65 * (1.0 - u)),
                scale=0.96,
                blade_len=17.0,
                rear_shoulder=(21, 22 + extra_drop),
                lead_shoulder=(27, 23 + extra_drop),
                draw_arms=True,
            )
            frames.append(frame)

        else:
            # F18..F29: Grounded horizontal prone collapse (y = 33..46, anchored on the floor at y = 46, never floating!)
            # with the Two-Handed Thunder-Odachi resting flat on the floor (y = 44..46) and fading cyan-violet soul embers.
            k = f - 18  # 0..11
            fall_src = tpl["fall"]
            frame = np.zeros((52, 52, 4), dtype=np.uint8)
            # Subtle settling of upper armor/haori from y=33..46 on F18..F20 to y=35..46 on F21..F29 while bottom stays locked at y=46
            v_stretch = [1.15, 1.10, 1.05, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0][k]
            for sy in range(34, 47):
                h_from_floor = 46 - sy
                ny = max(33, min(46, 46 - int(round(h_from_floor * v_stretch))))
                for sx in range(5, 47):
                    if fall_src[sy, sx, 3] > 0:
                        frame[ny, sx] = fall_src[sy, sx]
                        if ny + 1 <= 46 and frame[ny + 1, sx, 3] == 0:
                            frame[ny + 1, sx] = fall_src[sy, sx]
            frame = fill_layer_pinholes(frame, x0=5, x1=47, y0=33, y1=47, require_3_neighbors=False)

            # Draw the Two-Handed Thunder-Odachi resting flat on the floor (y = 44..46, x = 15..45)
            for hx_p in range(15, 21):
                set_px(frame, hx_p, 45, BRASS_BRIGHT if hx_p in (15, 18) else INDIGO_DARK)
            # Circular Raijin Tsuba at x = 21, y = 44..46
            set_px(frame, 21, 44, BRASS_BRIGHT)
            set_px(frame, 21, 45, GOLD_WHITE if k <= 3 else CYAN_BRIGHT)
            set_px(frame, 21, 46, BRASS_MID)
            # Curved 17px Odachi blade resting flat along x = 22..44, y = 45..46
            for bx_p in range(22, 45):
                set_px(frame, bx_p, 45, DIAMOND_WHITE if (bx_p + k) % 5 == 0 else CYAN_LIGHT)
                set_px(frame, bx_p, 46, INDIGO_MID if bx_p % 2 == 0 else CYAN_DEEP)

            # Fading cyan-violet soul embers drifting upward from the fallen samurai so every frame F18..F29 is unique
            ember_x = 18 + k * 2
            ember_y = 34 + (k % 3)
            set_px(frame, min(44, ember_x), ember_y, DIAMOND_WHITE if k <= 2 else (CYAN_BRIGHT if k <= 7 else VIOLET_GLOW))
            if k <= 6:
                set_px(frame, max(12, 36 - k * 2), 35 - (k % 2), VIOLET_BRIGHT if k % 2 == 0 else CYAN_LIGHT)
            frames.append(frame)

    return frames


def build_row6_dash(tpl):
    """
    Row 6 (`DASH - Iaido Lightning Flash-Step`, 180..209):
    - `F00..F02`: Quick Iaido coil crouch (`d = 2..4`).
    - `F03..F22`: Forward-leaning two-handed Iaido sprint/lunge with trailing
      **electric cyan-violet lightning ribbons & afterimage streaks** (`x = 4..16, y = 14..42`)
      and a mid-dash horizontal slash (`F10..F16`).
    - `F23..F29`: Skidding boot-stop with electric ground sparks and recovery to Chudan guard.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 2:
            # F00..F02: Quick Iaido coil crouch
            crouch_d = [2, 4, 3][f]
            u = f / 2.0
            base = make_crouch_ronin(tpl, crouch_d)
            base = apply_cape_and_mane_wave(base, phase * 2.0, amplitude=1.6, is_dash=True, rune_pulse=0.85)
            ang = -48.0 * (1.0 - u) + (-18.0) * u
            frame = draw_two_handed_odachi(
                base,
                hand_x=31 + f,
                hand_y=23 + crouch_d,
                angle_deg=ang,
                glow_intensity=1.0 + u * 0.25,
                scale=1.0,
                blade_len=17.0,
                rear_shoulder=(21, 18 + crouch_d),
                lead_shoulder=(27, 19 + crouch_d),
                draw_arms=True,
                phase=phase,
            )
            frames.append(frame)

        elif f <= 22:
            # F03..F22: Forward-leaning two-handed Iaido sprint/lunge + lightning ribbons + mid-dash horizontal slash (F10..F16)
            k = f - 3  # 0..19
            bob_dy = int(round(math.sin(k * 0.7) * 1.0))
            base = shift_layer(tpl["dash"], dx=0, dy=bob_dy)
            base = apply_cape_and_mane_wave(
                base, k * 0.85, amplitude=1.8, vertical_flutter=0.8, is_dash=True, rune_pulse=1.0
            )

            # Trailing electric cyan-violet lightning ribbons & afterimage streaks (x = 4..16, y = 14..42)
            for r_idx in range(5):
                ry = 15 + r_idx * 6 + ((k + r_idx) % 2)
                rx0 = 4 + ((k * 2 + r_idx * 3) % 6)
                col_r = CYAN_BRIGHT if r_idx % 2 == 0 else VIOLET_BRIGHT
                draw_line_px(base, rx0, ry, min(16, rx0 + 5), ry, col_r)
                set_px(base, min(16, rx0 + 2), ry - 1, DIAMOND_WHITE if (r_idx + k) % 3 == 0 else CYAN_LIGHT)

            # Mid-dash horizontal slash on F10..F16
            if 10 <= f <= 16:
                sk = f - 10  # 0..6
                ang_seq = [-32.0, -8.0, 12.0, 18.0, 14.0, 6.0, -6.0]
                hx_d = 35
                hy_d = 21 + bob_dy
                slash_arc = (-45.0, ang_seq[sk] + 5.0, 17.5, 0.95 if sk <= 4 else 0.65)
                frame = draw_two_handed_odachi(
                    base,
                    hand_x=hx_d,
                    hand_y=hy_d,
                    angle_deg=ang_seq[sk],
                    glow_intensity=1.4,
                    scale=1.02,
                    blade_len=17.0,
                    rear_shoulder=(23, 18 + bob_dy),
                    lead_shoulder=(29, 19 + bob_dy),
                    draw_arms=True,
                    slash_arc=slash_arc,
                    phase=phase,
                )
                # Horizontal electric slash streak across mid-torso height (x = 26..47, y = 22..24)
                for sx_h in range(28, 48):
                    set_px(frame, sx_h, 23 + bob_dy, DIAMOND_WHITE if sx_h > 38 else CYAN_LIGHT)
                    if sx_h % 2 == 0:
                        set_px(frame, sx_h, 22 + bob_dy, VIOLET_BRIGHT)
            else:
                pump_dx = int(round(math.sin(k * 0.7) * 1.0))
                frame = draw_two_handed_odachi(
                    base,
                    hand_x=33 + pump_dx,
                    hand_y=22 + bob_dy,
                    angle_deg=-14.0 + math.sin(k * 0.6) * 5.0,
                    glow_intensity=1.25,
                    scale=1.0,
                    blade_len=16.5,
                    rear_shoulder=(22, 18 + bob_dy),
                    lead_shoulder=(28, 19 + bob_dy),
                    draw_arms=True,
                    phase=phase,
                )
            frames.append(frame)

        else:
            # F23..F29: Skidding boot-stop with electric sparks & recovery to Chudan guard
            k = f - 23  # 0..6
            u = k / 6.0
            crouch_d = [3, 3, 2, 2, 1, 1, 0][k]
            base = make_crouch_ronin(tpl, crouch_d) if crouch_d > 0 else tpl["stand"].copy()
            base = apply_cape_and_mane_wave(
                base, phase, amplitude=1.5, vertical_flutter=0.5, rune_pulse=0.85 - u * 0.2
            )
            ang = -14.0 * (1.0 - u) + (-48.0) * u
            frame = draw_two_handed_odachi(
                base,
                hand_x=int(round(33 * (1.0 - u) + 31 * u)),
                hand_y=23 + crouch_d,
                angle_deg=ang,
                glow_intensity=1.05 - u * 0.15,
                scale=1.0,
                blade_len=17.0,
                rear_shoulder=(21, 18 + crouch_d),
                lead_shoulder=(27, 19 + crouch_d),
                draw_arms=True,
                phase=phase,
            )
            if k <= 3:
                for bx in (22, 34):
                    set_px(frame, bx + 2 + k, 44, DIAMOND_WHITE)
                    set_px(frame, bx + 1 + k, 43, CYAN_BRIGHT)
            frames.append(frame)
    return frames


def draw_raijin_thunder_drum_shield(canvas, f, phase):
    """
    Row 7 helper (F00..F11): Renders a spinning **Brass & Electric-Cyan Raijin Thunder-Drum Wheel Shield**
    at `x = 36..42, y = 19..34` in front of Kaze-Maru's lead gauntlet while keeping his crouched body
    (`x = 5..34`) 100% visible!
    """
    sh = np.zeros((52, 52, 4), dtype=np.uint8)
    cx, cy = 39.0, 26.5
    rx = 3.0
    ry = 7.0 if 1 <= f <= 10 else 6.0
    pulse_hi = (f % 2 == 0)

    # 1. Elliptical Brass & Indigo-Steel Thunder-Drum Shield Rim & Tomoe Core (x = 36..42, y = 19..34)
    for y in range(int(cy - ry), int(cy + ry) + 1):
        dy_n = (y - cy) / max(1.0, ry)
        half_x = int(round(rx * math.sqrt(max(0.0, 1.0 - dy_n * dy_n))))
        for dx in range(-half_x, half_x + 1):
            x = int(round(cx + dx))
            if not (36 <= x <= 42 and 19 <= y <= 34):
                continue
            is_rim = (abs(dx) == half_x or abs(y - cy) >= ry - 1.0)
            if is_rim:
                col = GOLD_WHITE if (dx > 0 and pulse_hi) else (BRASS_BRIGHT if (y + f) % 2 == 0 else CYAN_BRIGHT)
            elif dx == 0 and abs(y - cy) <= 2.5:
                # Spinning Three-Tomoe Electric Core at (39, 25..28)
                col = DIAMOND_WHITE if pulse_hi else CYAN_LIGHT
            else:
                # Rotating Lightning Spokes inside the drum shield
                ang = math.atan2(dy_n, dx / max(1.0, rx)) + phase * 2.5
                spoke = int(round((ang / (2.0 * math.pi)) * 6.0)) % 2 == 0
                col = CYAN_BRIGHT if spoke else (VIOLET_GLOW if (x + y) % 2 == 0 else INDIGO_DARK)
            set_px(sh, x, y, col)

    # 2. Orbiting Raijin Drum Nodes around the shield perimeter
    for d_i in range(6):
        da = (d_i / 6.0) * 2.0 * math.pi + phase * 2.0
        nx = int(round(cx + math.cos(da) * rx))
        ny = int(round(cy + math.sin(da) * ry))
        if 36 <= nx <= 42 and 19 <= ny <= 34:
            set_px(sh, nx, ny, DIAMOND_WHITE if d_i % 2 == 0 else GOLD_WHITE)

    return composite_over(canvas, sh)


def build_row7_crouch(tpl):
    """
    Row 7 (`CROUCH - Raijin Thunder-Drum Parry & Iaido Counter`, 210..239):
    - `F00..F11`: Deep knee-bend crouch (`d = 1..6`) with a spinning **Brass & Electric-Cyan Raijin Thunder-Drum
      Wheel Shield** (`x = 36..42, y = 19..34`) in front of his lead gauntlet.
    - `F12..F19`: Explosive low rising Iaido counter-slash (`+32°` to `-45°`) with a cyan-violet crescent slash trail.
    - `F20..F29`: Smooth rise back to standing Chudan guard.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 11:
            # F00..F11: Deep knee-bend crouch + spinning Raijin Thunder-Drum Wheel Shield (x = 36..42, y = 19..34)
            depths = [1, 2, 4, 5, 6, 6, 6, 6, 6, 6, 5, 5]
            d = depths[f]
            base = make_crouch_ronin(tpl, d)
            base = apply_cape_and_mane_wave(
                base, phase * 1.5, amplitude=1.2, vertical_flutter=0.3, rune_pulse=0.85
            )
            ang_seq = [-42.0, -32.0, -22.0, -14.0, -8.0, -4.0, -2.0, -4.0, -8.0, -14.0, -22.0, -30.0]
            frame = draw_two_handed_odachi(
                base,
                hand_x=31,
                hand_y=21 + d,
                angle_deg=ang_seq[f],
                glow_intensity=1.05,
                scale=0.98,
                blade_len=16.5,
                rear_shoulder=(21, 18 + d),
                lead_shoulder=(27, 19 + d),
                draw_arms=True,
                phase=phase,
            )
            frame = draw_raijin_thunder_drum_shield(frame, f, phase)
            frames.append(frame)

        elif f <= 19:
            # F12..F19: Explosive low rising Iaido counter-slash (+32 deg sweeping up to -45 deg)
            # with a blazing 3-band cyan-violet crescent slash trail
            k = f - 12  # 0..7
            d = 5 if k in (2, 3, 4) else 6
            base = make_crouch_ronin(tpl, d)
            base = apply_cape_and_mane_wave(
                base, phase * 2.0, amplitude=1.5, vertical_flutter=0.4, rune_pulse=1.0
            )
            ang_seq = [32.0, 12.0, -12.0, -32.0, -45.0, -44.0, -38.0, -32.0]
            hx_seq = [34, 35, 35, 34, 33, 33, 32, 32]
            hy_off = [22, 21, 20, 19, 19, 19, 20, 20]

            slash_arc = None
            if k <= 5:
                arc_int = [0.85, 1.0, 1.0, 0.95, 0.8, 0.6][k]
                a1 = [36.0, 34.0, 32.0, 28.0, 22.0, 14.0][k]
                slash_arc = (ang_seq[k] - 4.0, a1, 18.0, arc_int)

            frame = draw_two_handed_odachi(
                base,
                hand_x=hx_seq[k],
                hand_y=hy_off[k] + d,
                angle_deg=ang_seq[k],
                glow_intensity=1.4 if k <= 5 else 1.1,
                scale=1.02,
                blade_len=17.0,
                rear_shoulder=(21, 18 + d),
                lead_shoulder=(27, 19 + d),
                draw_arms=True,
                slash_arc=slash_arc,
                phase=phase,
            )

            # Ground-skimming electric cyan-violet wave along y = 43..47, x = 32..48
            wave_x = min(48, 36 + k * 2)
            for wx in range(32, wave_x + 1):
                wy = 45 - ((wx + k) % 2)
                set_px(frame, wx, wy, DIAMOND_WHITE if wx >= wave_x - 1 else (CYAN_LIGHT if wx % 2 == 0 else VIOLET_BRIGHT))
                set_px(frame, wx, 46, CYAN_BRIGHT if (wx + k) % 2 == 0 else VIOLET_GLOW)
            frames.append(frame)

        else:
            # F20..F29: Smooth rise back to standing Chudan guard
            depths = [5, 5, 4, 4, 3, 3, 2, 1, 1, 0]
            k = f - 20
            d = depths[k]
            u = k / 9.0
            base = make_crouch_ronin(tpl, d) if d > 0 else tpl["stand"].copy()
            base = apply_cape_and_mane_wave(
                base, phase, amplitude=1.4, vertical_flutter=0.5, rune_pulse=0.75 - u * 0.2
            )
            ang = -32.0 * (1.0 - u) + (-48.0) * u
            frame = draw_two_handed_odachi(
                base,
                hand_x=31,
                hand_y=23 + d,
                angle_deg=ang,
                glow_intensity=0.95,
                scale=1.0,
                blade_len=17.0,
                rear_shoulder=(21, 18 + d),
                lead_shoulder=(27, 19 + d),
                draw_arms=True,
                phase=phase,
            )
            frames.append(frame)
    return frames


def build_row8_jump(tpl):
    """
    Row 8 (`JUMP - Raijin Sky-Vault & Aerial Cleave`, 240..269):
    - Takeoff crouch (`F00..F03`), ascending aerial vault with tucked knees and
      **crackling electric cloud/lightning thrusters** beneath his boots (`F04..F11`),
      apex mid-air two-handed downward Odachi cleave (`-95°` to `+45°`, `F12..F18`) with a 3-band
      lightning slash trail, descent (`F19..F24`), and grounded landing (`F25..F29`).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 3:
            # F00..F03: Takeoff crouch
            crouch_seq = [1, 3, 5, 3]
            d = crouch_seq[f]
            u = f / 3.0
            body = make_crouch_ronin(tpl, d)
            body = apply_cape_and_mane_wave(body, phase * 2.0, amplitude=1.5, vertical_flutter=0.6, rune_pulse=0.85)
            ang = -48.0 - u * 28.0
            frame = draw_two_handed_odachi(
                body,
                hand_x=31,
                hand_y=22 + d,
                angle_deg=ang,
                glow_intensity=1.0 + u * 0.2,
                scale=1.0,
                blade_len=17.0,
                rear_shoulder=(21, 18 + d),
                lead_shoulder=(27, 19 + d),
                draw_arms=True,
                phase=phase,
            )
            frames.append(frame)

        elif f <= 11:
            # F04..F11: Ascending aerial vault with tucked knees & crackling electric cloud/lightning thrusters
            k = f - 4  # 0..7
            u = k / 7.0
            jump_dy = int(round(-1 - math.sin(u * math.pi * 0.85) * 2.5))
            tilt_deg = 12.0 * (1.0 - u) + (-6.0) * u
            body = make_aerial_ronin(
                tpl, jump_dy=jump_dy, body_tilt_deg=tilt_deg, leg_tuck=0.45 + 0.4 * u, thruster_intensity=1.0, phase=phase * 2.0
            )
            ang = -76.0 * (1.0 - u) + (-95.0) * u
            hx = int(round(31 * (1.0 - u) + 30 * u))
            hy = 18 + jump_dy
            frame = draw_two_handed_odachi(
                body,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.25,
                scale=1.0,
                blade_len=16.5,
                rear_shoulder=(21, 18 + jump_dy),
                lead_shoulder=(27, 19 + jump_dy),
                draw_arms=True,
                phase=phase * 2.0,
            )
            frames.append(frame)

        elif f <= 18:
            # F12..F18: Apex mid-air two-handed downward Odachi cleave (-95 deg to +45 deg) with 3-band lightning slash trail
            k = f - 12  # 0..6
            u = k / 6.0
            jump_dy = int(round(-3 + u * 1.5))
            tilt_deg = -4.0 * (1.0 - u) + 12.0 * u
            body = make_aerial_ronin(
                tpl, jump_dy=jump_dy, body_tilt_deg=tilt_deg, leg_tuck=0.8 - 0.25 * u, thruster_intensity=0.95, phase=phase * 2.0
            )
            ang_seq = [-95.0, -42.0, 6.0, 32.0, 45.0, 42.0, 34.0]
            hx_seq = [30, 33, 35, 36, 36, 35, 34]
            hy_seq = [16 + jump_dy, 19 + jump_dy, 21 + jump_dy, 23 + jump_dy, 24 + jump_dy, 24 + jump_dy, 23 + jump_dy]

            slash_arc = None
            if 1 <= k <= 5:
                arc_int = [0.95, 1.0, 1.0, 0.85, 0.65][k - 1]
                a0 = [-95.0, -86.0, -74.0, -58.0, -42.0][k - 1]
                slash_arc = (a0, ang_seq[k] + 5.0, 18.0, arc_int)

            frame = draw_two_handed_odachi(
                body,
                hand_x=hx_seq[k],
                hand_y=hy_seq[k],
                angle_deg=ang_seq[k],
                glow_intensity=1.45 if k <= 5 else 1.15,
                scale=1.03,
                blade_len=16.5,
                rear_shoulder=(21, 18 + jump_dy),
                lead_shoulder=(27, 19 + jump_dy),
                draw_arms=True,
                slash_arc=slash_arc,
                phase=phase * 2.0,
            )
            frames.append(frame)

        elif f <= 24:
            # F19..F24: Controlled aerial descent
            k = f - 19  # 0..5
            u = k / 5.0
            jump_dy = int(round(-1 + u * 1.0))
            body = make_aerial_ronin(
                tpl, jump_dy=jump_dy, body_tilt_deg=8.0 * (1.0 - u), leg_tuck=0.5 * (1.0 - u * 0.6), thruster_intensity=0.6 * (1.0 - u), phase=phase
            )
            ang = 30.0 * (1.0 - u) + (-18.0) * u
            frame = draw_two_handed_odachi(
                body,
                hand_x=int(round(34 * (1.0 - u) + 32 * u)),
                hand_y=22 + jump_dy,
                angle_deg=ang,
                glow_intensity=1.1,
                scale=1.0,
                blade_len=17.0,
                rear_shoulder=(21, 18 + jump_dy),
                lead_shoulder=(27, 19 + jump_dy),
                draw_arms=True,
                phase=phase,
            )
            frames.append(frame)

        else:
            # F25..F29: Grounded landing absorption & recovery
            k = f - 25  # 0..4
            u = k / 4.0
            crouch_depths = [5, 4, 3, 1, 0]
            d = crouch_depths[k]
            body = make_crouch_ronin(tpl, d) if d > 0 else tpl["stand"].copy()
            body = apply_cape_and_mane_wave(
                body, phase, amplitude=1.5, vertical_flutter=0.5, rune_pulse=0.95 - u * 0.25
            )
            ang = -18.0 * (1.0 - u) + (-48.0) * u
            frame = draw_two_handed_odachi(
                body,
                hand_x=31,
                hand_y=23 + d,
                angle_deg=ang,
                glow_intensity=1.1 - u * 0.2,
                scale=1.0,
                blade_len=17.0,
                rear_shoulder=(21, 18 + d),
                lead_shoulder=(27, 19 + d),
                draw_arms=True,
                phase=phase,
            )
            if k <= 2:
                for sx_s in range(16, 44, 4):
                    set_px(
                        frame,
                        sx_s + (k % 2),
                        45 - (sx_s % 3),
                        DIAMOND_WHITE if sx_s % 8 == 0 else (CYAN_LIGHT if sx_s % 4 == 0 else VIOLET_BRIGHT),
                    )
            frames.append(frame)
    return frames


def apply_pass12_vanguard_upgrades(cell_208, r_idx, f):
    """
    Pass #12 Melee & Vanguard 30fps Character Sheet Refiner (Ronin - storm-indigo/cyan):
    1. Row 2 (AUTO_ATTACK, F14..F19) Strike Apex Impact Glint at (x = 152 + (f - 14) * 3, y = 92 + ((f * 7) % 18)).
    2. Row 7 / Row 3 (SKILL / CROUCH, F08..F20) Grounded Cast-Surge Sigil Glow at y = 186..189, x = 76..134 + 3 rising motes.
    3. Row 8 / Row 4 (ULTIMATE / JUMP, F03..F26) Overdrive Ascension Lightning / Aura Pillars at x = 68, 88, 122, 140.
    All pixels strictly clamped inside [4..203] in x and y.
    """
    out = cell_208.copy()
    c_white = DIAMOND_WHITE
    c_prim = CYAN_BRIGHT
    c_sec = VIOLET_GLOW

    def p208(x, y, col):
        ix = int(round(x))
        iy = int(round(y))
        if 4 <= ix <= 203 and 4 <= iy <= 203:
            out[iy, ix] = col

    # 1. Row 2 (AUTO_ATTACK, F14..F19) Strike Apex Impact Glint
    if r_idx == 2 and 14 <= f <= 19:
        gx = 152 + (f - 14) * 3
        gy = 92 + ((f * 7) % 18)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                p208(gx + dx, gy + dy, c_white)
        r_arm = 6 - ((f - 14) % 2)
        for d in range(2, r_arm + 1):
            col_ray = c_white if d <= 3 else c_prim
            p208(gx + d, gy, col_ray)
            p208(gx - d, gy, col_ray)
            p208(gx, gy + d, col_ray)
            p208(gx, gy - d, col_ray)
            if d <= 3:
                p208(gx + d, gy - 1, c_sec)
                p208(gx - d, gy + 1, c_sec)
                p208(gx - 1, gy + d, c_sec)
                p208(gx + 1, gy - d, c_sec)
        for dx, dy in ((-2, -2), (2, -2), (-2, 2), (2, 2)):
            p208(gx + dx, gy + dy, c_sec)
        e1x = gx - 6 - (f - 14)
        e1y = gy - 4 + ((f - 14) % 3) * 2
        e2x = gx - 11 - ((f - 14) % 3) * 2
        e2y = gy + 4 - ((f - 14) % 2) * 2
        for ex, ey, c_hi, c_lo in ((e1x, e1y, c_white, c_prim), (e2x, e2y, c_sec, INDIGO_LIGHT)):
            p208(ex, ey, c_hi)
            p208(ex + 1, ey, c_hi)
            p208(ex, ey + 1, c_lo)
            p208(ex + 1, ey + 1, c_lo)

    # 2. Row 7 / Row 3 (SKILL, F08..F20) Grounded Cast-Surge Sigil Glow
    if r_idx in (3, 7) and 8 <= f <= 20:
        for x in range(76, 135):
            u = (x - 105.0) / 29.0
            ay = 186 + int(round((u * u) * 2.0))
            ay = max(186, min(188, ay))
            col_top = c_white if (abs(x - 105) <= 10 or (x + f) % 4 == 0) else c_prim
            col_bot = c_sec if abs(x - 105) <= 18 else INDIGO_LIGHT
            p208(x, ay, col_top)
            p208(x, ay + 1, col_bot)
        mote_xs = [86 + ((f - 8) % 3), 105 + (((f - 8) + 1) % 3) - 1, 124 - ((f - 8) % 3)]
        for m_i, mx in enumerate(mote_xs):
            my = (182 - ((f - 8) * 3) % 24) if m_i == 0 else (182 - (((f - 8) * 3 + m_i * 7) % 24))
            p208(mx, my, c_white)
            p208(mx + 1, my, c_prim)
            p208(mx, my + 1, c_sec)
            p208(mx + 1, my + 1, INDIGO_LIGHT)
            p208(mx, my + 2, VIOLET_BRIGHT if (m_i + f) % 2 == 0 else c_prim)

    # 3. Row 8 / Row 4 (ULTIMATE, F03..F26) Overdrive Ascension Lightning / Aura Pillars
    if r_idx in (4, 8) and 3 <= f <= 26:
        for idx, mx in enumerate((68, 88, 122, 140)):
            my = 168 - (((f - 3) * 5 + idx * 19) % 116)
            p208(mx, my - 2, c_prim)
            p208(mx, my - 1, c_white)
            p208(mx, my, c_white)
            p208(mx - 1, my, c_prim)
            p208(mx + 1, my, c_sec)
            zig = 1 if (f + idx) % 2 == 0 else -1
            p208(mx + zig, my + 1, c_prim)
            p208(mx, my + 2, c_sec)
            p208(mx, my + 3, INDIGO_LIGHT if idx % 2 == 0 else VIOLET_BRIGHT)

    out[:4, :, :] = 0
    out[204:, :, :] = 0
    out[:, :4, :] = 0
    out[:, 204:, :] = 0
    return out


def main():
    tpl = make_clean_templates()

    rows = [
        ("ROW 0: IDLE (30 FRAMES)", build_row0_idle(tpl)),
        ("ROW 1: WALK - SAMURAI STRIDE (30 FRAMES)", build_row1_walk(tpl)),
        ("ROW 2: AUTO_ATTACK - THUNDER IAIDO & JODAN CLEAVE (30 FRAMES)", build_row2_auto_attack(tpl)),
        ("ROW 3: SKILL - RAIJIN THUNDER-PILLAR & FLASH-CUT (30 FRAMES)", build_row3_skill(tpl)),
        ("ROW 4: ULTIMATE - SUSANOO: THOUSAND-BLADE THUNDERSTORM (30 FRAMES)", build_row4_ultimate(tpl)),
        ("ROW 5: DEATH & HURT (30 FRAMES)", build_row5_death(tpl)),
        ("ROW 6: DASH - IAIDO LIGHTNING FLASH-STEP (30 FRAMES)", build_row6_dash(tpl)),
        ("ROW 7: CROUCH - RAIJIN THUNDER-DRUM PARRY & COUNTER (30 FRAMES)", build_row7_crouch(tpl)),
        ("ROW 8: JUMP - RAIJIN SKY-VAULT & AERIAL CLEAVE (30 FRAMES)", build_row8_jump(tpl)),
    ]

    num_rows = len(rows)
    cell_px = 208
    sheet = Image.new("RGBA", (30 * cell_px, num_rows * cell_px), (0, 0, 0, 0))

    top_clips = bot_clips = left_clips = right_clips = 0
    for r_idx, (r_name, r_frames) in enumerate(rows):
        assert len(r_frames) == 30, f"{r_name} has {len(r_frames)} frames instead of 30"
        cells_208 = []
        for c_idx in range(30):
            r_frames[c_idx] = ensure_safe_cell(r_frames[c_idx], margin=2)
            cell_im = Image.fromarray(r_frames[c_idx], mode="RGBA").resize((cell_px, cell_px), Image.Resampling.NEAREST)
            cell_208 = apply_pass12_vanguard_upgrades(np.array(cell_im, dtype=np.uint8), r_idx, c_idx)
            cells_208.append(cell_208)
            if np.any(cell_208[:2, :, 3] > 0):
                top_clips += 1
            if np.any(cell_208[206:, :, 3] > 0):
                bot_clips += 1
            if np.any(cell_208[:, :2, 3] > 0):
                left_clips += 1
            if np.any(cell_208[:, 206:, 3] > 0):
                right_clips += 1
            sheet.paste(Image.fromarray(cell_208, mode="RGBA"), (c_idx * cell_px, r_idx * cell_px))
        adj_diffs = sum(1 for i in range(29) if np.any(cells_208[i] != cells_208[i + 1]))
        print(f"{r_name:68s}: 30 frames generated, {adj_diffs}/29 adjacent transitions distinct")

    print(f"Boundary clip audit across 270 frames: TOP={top_clips}, BOT={bot_clips}, LEFT={left_clips}, RIGHT={right_clips}")
    out_path = "/home/antigravity/assets/sprites/ronin_sheet.png"
    sheet.save(out_path)
    print("Saved:", out_path, sheet.size)

    # Render zoomed-in left (F00..F14) and right (F15..F29) contact sheets in artifact directory
    preview_cell = 96
    pad_top = 24
    dbg = Image.new("RGBA", (30 * preview_cell, num_rows * (preview_cell + pad_top)), (14, 18, 32, 255))
    draw = ImageDraw.Draw(dbg)
    for r_idx, (r_name, r_frames) in enumerate(rows):
        y0 = r_idx * (preview_cell + pad_top)
        draw.rectangle([0, y0, 30 * preview_cell, y0 + pad_top - 2], fill=(24, 30, 54, 255))
        draw.text((8, y0 + 5), r_name, fill=(103, 232, 249, 255))
        for c_idx, arr in enumerate(r_frames):
            x0 = c_idx * preview_cell
            draw.text((x0 + 4, y0 + 13), f"F{c_idx:02d}", fill=(167, 139, 250, 255))
            p_im = Image.fromarray(arr, mode="RGBA").resize((preview_cell, preview_cell), Image.Resampling.NEAREST)
            dbg.paste(p_im, (x0, y0 + pad_top), p_im)
            draw.rectangle(
                [x0, y0 + pad_top, x0 + preview_cell - 1, y0 + pad_top + preview_cell - 1],
                outline=(38, 46, 76, 255),
            )

    art_dir = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/4f1fb80f-a88f-4496-9746-b4b9fe84f6d4"
    dbg.crop((0, 0, 15 * preview_cell, dbg.height)).save(f"{art_dir}/debug_ronin_30fps_left_F00_F14.png")
    dbg.crop((15 * preview_cell, 0, 30 * preview_cell, dbg.height)).save(f"{art_dir}/debug_ronin_30fps_right_F15_F29.png")
    print("Saved debug contact sheets in:", art_dir)


if __name__ == "__main__":
    main()
