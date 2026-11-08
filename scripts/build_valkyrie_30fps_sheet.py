#!/usr/bin/env python3
"""
Builds Freyja's (Valkyrie - Crimson-Gold Wyvern Dragoon) 30-Frame-Per-Animation HD-2D Sprite Sheet:
- 9 rows x 30 columns = 270 unique frames (6240 x 1872 at 208x208 per cell, 52x52 logical upscaled 4x NEAREST):
  * Row 0: IDLE (30 frames)
  * Row 1: WALK - VALKYRIE DRAGOON STRIDE (30 frames)
  * Row 2: AUTO_ATTACK - WYVERN LANCE SWEEP & IMPALING THRUST (30 frames)
  * Row 3: SKILL - GUNGNIR SKY-LANCE BARRAGE (30 frames)
  * Row 4: ULTIMATE - VALHALLA: BAHAMUT DRAGONFIRE CATACLYSM (30 frames)
  * Row 5: DEATH & HURT (30 frames)
  * Row 6: DASH - WYVERN SKY-CHARGE (30 frames)
  * Row 7: CROUCH - DRAGON-CREST PHALANX SHIELD & COUNTER-THRUST (30 frames)
  * Row 8: JUMP - DRAGOON HIGH-JUMP & SKY-DIVE IMPACT (30 frames)
- Un-inked clean pixel art: zero white background halo, both lowered side-arms neutralized so there are
  ZERO extra limbs or chest hands, and a true Two-Handed Crimson-Gold Gungnir Dragon-Lance (~24px)
  gripped by BOTH hands via 2-bone IK arms from Rear Shoulder (21, 18) and Lead Shoulder (27, 19).
"""

from collections import deque
import math
import numpy as np
from PIL import Image, ImageDraw

# Palette matching Freyja's Crimson-Gold Wyvern Valkyrie HD-2D aesthetic
OBSIDIAN_DEEP = (15, 18, 28, 255)
OBSIDIAN_DARK = (28, 32, 46, 255)
OBSIDIAN_MID = (45, 52, 68, 255)
IRON_DARK = (45, 52, 68, 255)
IRON_MID = (71, 85, 105, 255)
IRON_LIGHT = (148, 163, 184, 255)

CRIMSON_DEEP = (68, 12, 18, 255)
CRIMSON_DARK = (108, 19, 28, 255)
CRIMSON_MID = (153, 27, 27, 255)
CRIMSON_BRIGHT = (198, 40, 40, 255)
RUBY_BRIGHT = (225, 29, 72, 255)
RUBY_CORE = (244, 63, 94, 255)
ROSE_FLAME = (251, 113, 133, 255)
ROSE_WHITE = (255, 228, 230, 255)

GOLD_DEEP = (146, 64, 14, 255)
GOLD_DARK = (180, 83, 9, 255)
GOLD_MID = (217, 119, 6, 255)
GOLD_BRIGHT = (251, 191, 36, 255)
GOLD_LIGHT = (253, 224, 71, 255)
GOLD_WHITE = (254, 249, 195, 255)
AMBER_FLAME = (245, 158, 11, 255)
DRAGONFIRE_ORANGE = (249, 115, 22, 255)

HAIR_SHADOW = (161, 130, 74, 255)
HAIR_GOLD = (212, 180, 115, 255)
HAIR_PLATINUM = (243, 226, 179, 255)
HAIR_WHITE = (254, 249, 225, 255)

CAPE_DEEP = (68, 12, 18, 255)
CAPE_DARK = (108, 19, 28, 255)
CAPE_MID = (153, 27, 27, 255)
CAPE_HI = (185, 28, 28, 255)


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
    Guarantees zero pixels touch the 52x52 cell border (strictly inside 2 <= x <= 49, 2 <= y <= 49)
    and fills any 1px interior pinholes from movement.
    """
    lo = max(1, int(margin))
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
    path="/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/4f1fb80f-a88f-4496-9746-b4b9fe84f6d4/valkyrie_v1_base_1794151227418.jpg",
):
    """
    Loads `valkyrie_v1_base_1794151227418.jpg` (1024x1024), performs a BFS flood-fill from all 4 image borders
    to strip the white background + 3-pass anti-aliased fringe (ZERO white halo!), crops tight character bounds,
    and scales cleanly into the 52x52 logical cell (`y = 4..45`) with both boots planted firmly at `y = 45`.
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
    scaled = crop.resize((36, 42), Image.Resampling.NEAREST)
    s_arr = np.array(scaled, dtype=np.uint8)

    cell = np.zeros((52, 52, 4), dtype=np.uint8)
    cell[4:46, 2:38] = s_arr

    # Final 52x52 border fringe pass to ensure zero light-gray/white edge pixels survive downsampling
    trans52 = cell[:, :, 3] == 0
    for y in range(52):
        for x in range(52):
            if cell[y, x, 3] > 0:
                r, g, b = int(cell[y, x, 0]), int(cell[y, x, 1]), int(cell[y, x, 2])
                touches_empty = False
                for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                    ny, nx = y + dy, x + dx
                    if not (0 <= ny < 52 and 0 <= nx < 52) or trans52[ny, nx]:
                        touches_empty = True
                        break
                if touches_empty and min(r, g, b) > 180 and (max(r, g, b) - min(r, g, b)) < 40:
                    cell[y, x] = (0, 0, 0, 0)

    # Plant right boot (x=28..38, y=38..44) down +1px so BOTH boots plant firmly on y=45
    right_boot = cell[38:45, 28:38].copy()
    cell[39:46, 28:38] = right_boot
    cell[38, 28:38] = right_boot[0, :]

    # Clear lower cape-tail stub between the legs at y=35..40, x=25..28 so standing legs separate cleanly below the tabard
    cell[35:40, 25:28] = 0
    return fill_layer_pinholes(cell)


def neutralize_baked_side_arms(tpl_img, max_chest_x=31):
    """
    Neutralizes BOTH static lowered side-arms on Freyja's torso on ALL templates so her two-handed
    2-bone IK arms gripping the Gungnir Dragon-Lance are 100% cleanly visible with ZERO extra limbs
    or chest/hip hands:
    - Strips the hanging right arm & gauntlet on the viewer-right (`x > max_chest_x, 18 <= y <= 30`).
    - Neutralizes the hanging left arm & rune-vambrace/gauntlet on the viewer-left (`19 <= x <= 24, 20 <= y <= 30`)
      into seamless crimson cape drapery (`x <= 22`) and crimson-obsidian waist/tasset armor (`x = 23..24`).
    """
    out = tpl_img.copy()
    for y in range(18, 31):
        lim_x = max_chest_x + 1 if y <= 19 else max_chest_x
        for x in range(lim_x + 1, 50):
            out[y, x] = (0, 0, 0, 0)

    for y in range(20, 31):
        for x in range(19, 25):
            if out[y, x, 3] > 0:
                if x <= 22:
                    out[y, x] = CAPE_DARK if (x + y) % 2 == 0 else CAPE_DEEP
                elif y <= 26:
                    out[y, x] = OBSIDIAN_DARK if x == 23 else (CRIMSON_MID if (x + y) % 2 == 0 else CRIMSON_DARK)
                else:
                    # Smooth crimson dragon-scale hip tasset transition at y=27..30, x=23..24
                    out[y, x] = GOLD_MID if y == 27 else (CRIMSON_MID if (x + y) % 2 == 0 else CRIMSON_DARK)

    return fill_layer_pinholes(out)


def make_clean_templates():
    """
    Constructs Freyja's modular anatomical templates from the clean 52x52 base sprite:
    - `stand`: standing Valkyrie Dragoon with both lowered side-arms neutralized and boots planted at y=45
    - `stand_upper`: upper body, winged dragon helm, platinum-gold hair, and hip tassets/tabard (`y=0..35`)
    - `leg_back` (`leg_near`) and `leg_front` (`leg_far`): lower dragon-greave sabaton boots at y=38..46
    - `lunge`: forward-leaning attack body (+2px upper torso lean) with side-arms neutralized
    - `kneel`: dropped to one knee (y+6px) with side-arms neutralized
    - `fall`: 90-degree horizontally collapsed prone body anchored on the floor at y=34..46
    - `dash`: forward-tilted (+14 deg) Wyvern Sky-Charge body with side-arms neutralized
    """
    raw = extract_clean_base_sprite()
    stand = neutralize_baked_side_arms(raw, max_chest_x=31)

    # Extract lower dragon-greave sabaton boots at y=38..46
    leg_back_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_front_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_back_patch[38:47, 18:26] = stand[38:47, 18:26]
    leg_front_patch[38:47, 29:38] = stand[38:47, 29:38]

    # Upper torso, winged helm, hair, and dragon-scale tassets/tabard (y=0..35)
    stand_upper = np.zeros((52, 52, 4), dtype=np.uint8)
    stand_upper[:36, :] = stand[:36, :]
    stand_upper[36:40, :19] = stand[36:40, :19]
    stand_upper = fill_layer_pinholes(stand_upper)

    # Forward-leaning lunge body (+2px upper-body lean)
    lunge = np.zeros((52, 52, 4), dtype=np.uint8)
    lunge[32:46, :] = stand[32:46, :]
    for y in range(4, 32):
        dx = 2 if y <= 25 else 1
        for x in range(2, 47):
            if stand[y, x, 3] > 0 and x + dx <= 49:
                lunge[y, x + dx] = stand[y, x]
    lunge = neutralize_baked_side_arms(lunge, max_chest_x=33)
    lunge = fill_layer_pinholes(lunge)

    # Kneeling body (torso dropped +6px onto bent knees planted at y=45)
    kneel = np.zeros((52, 52, 4), dtype=np.uint8)
    kneel[38:46, 16:38] = stand[38:46, 16:38]
    for y in range(4, 35):
        ny = y + 6
        if ny < 45:
            for x in range(2, 46):
                if stand[y, x, 3] > 0:
                    kneel[ny, x] = stand[y, x]
    kneel = fill_layer_pinholes(kneel)

    # Horizontally collapsed prone body (90-degree rotated flat on the floor at y=36..45)
    body_no_cape = stand.copy()
    body_no_cape[18:41, 2:19] = 0
    pil_body = Image.fromarray(body_no_cape, mode="RGBA")
    rot_90 = np.array(
        pil_body.rotate(-88.0, resample=Image.Resampling.NEAREST, center=(27, 29)),
        dtype=np.uint8,
    )
    # Use the 95th percentile of y so the main prone torso & legs rest flush on y=45
    ys, xs = np.where(rot_90[:, :, 3] > 0)
    fall = np.zeros((52, 52, 4), dtype=np.uint8)
    if len(ys) > 0:
        y_bot_core = int(np.percentile(ys, 92))
        dy_shift = 45 - y_bot_core
        dx_shift = 25 - int((xs.min() + xs.max()) // 2)
        for y in range(52):
            for x in range(52):
                if rot_90[y, x, 3] > 0:
                    ny = max(35, min(45, y + dy_shift))
                    nx = max(4, min(47, x + dx_shift))
                    fall[ny, nx] = rot_90[y, x]
    fall = fill_layer_pinholes(fall)

    # Dash body (+14 deg forward Wyvern Sky-Charge tilt)
    pil_stand = Image.fromarray(stand, mode="RGBA")
    rot_dash = np.array(
        pil_stand.rotate(-13.0, resample=Image.Resampling.NEAREST, center=(26, 35)),
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


def apply_hair_and_cape_wave(
    frame,
    phase_rad,
    amplitude=1.5,
    vertical_flutter=0.6,
    is_dash=False,
    rune_pulse=0.5,
):
    """
    Animates Freyja's flowing platinum-gold hair (`x=14..24, y=10..18`), sweeping crimson-and-gold
    Valkyrie cape (`x=2..19, y=18..38`), glowing golden dragon-helm eyes (`y=10..13, x=26..31`),
    and pulsing ruby-gold dragon armor runes (`y=16..33, x=23..31`).
    """
    out = frame.copy()

    # 1. Flowing Platinum-Gold Hair wave behind neck/pauldron (x=14..24, y=10..18)
    hair_mask = np.zeros((52, 52), dtype=bool)
    for y in range(10, 19):
        for x in range(14, 25):
            if frame[y, x, 3] > 0:
                r, g, b, _ = frame[y, x]
                if r > 150 and g > 120 and b > 65:
                    hair_mask[y, x] = True

    hair_src = frame.copy()
    out[hair_mask] = 0
    for y in range(10, 19):
        u_h = (24 - 16) / 8.0
        dy_h = int(round(math.sin(phase_rad * 1.4 - (y - 10) * 0.45) * 0.7))
        dx_h = int(round((-0.8 if is_dash else 0.0) + math.cos(phase_rad - (y - 10) * 0.4) * 0.6))
        for x in range(14, 25):
            if not hair_mask[y, x]:
                continue
            nx = max(3, min(25, x + dx_h))
            ny = max(6, min(22, y + dy_h))
            out[ny, nx] = hair_src[y, x]
            if x >= 21 and out[y, x, 3] == 0:
                out[y, x] = hair_src[y, x]

    # 2. Crimson-and-Gold Valkyrie Cape wave (left side x=2..19, y=18..38)
    cape_mask = np.zeros((52, 52), dtype=bool)
    for y in range(18, 39):
        max_x = 19 if y < 32 else 17
        for x in range(2, max_x + 1):
            if out[y, x, 3] > 0 and not hair_mask[y, x]:
                cape_mask[y, x] = True

    cape_src = out.copy()
    out[cape_mask] = 0

    for y in range(18, 39):
        u = (y - 18) / 21.0
        if is_dash:
            wave_x = -1.2 * u + math.sin(phase_rad * 2.0 - u * 3.5) * (amplitude * u)
            wave_y = -1.8 * u + math.cos(phase_rad * 2.0 - u * 3.0) * (vertical_flutter * u)
        else:
            wave_x = math.sin(phase_rad - u * 3.2) * (amplitude * (0.2 + 0.8 * u))
            wave_y = math.cos(phase_rad - u * 2.6) * (vertical_flutter * u)
        dx = int(round(wave_x))
        dy = int(round(wave_y))
        max_x = 19 if y < 32 else 17
        for x in range(2, max_x + 1):
            if not cape_mask[y, x]:
                continue
            nx = max(2, min(20, x + dx))
            ny = max(14, min(42, y + dy))
            out[ny, nx] = cape_src[y, x]
            if dx < 0 and x >= max_x - 3 and out[y, x, 3] == 0:
                out[y, x] = cape_src[y, x]

    out = fill_layer_pinholes(out, x0=2, x1=26, y0=8, y1=43, require_3_neighbors=False)

    # 3. Pulsing Golden Visor Eyes (y=10..13, x=26..31) & Ruby-Gold Dragon Armor Runes (y=16..33, x=23..31)
    for y in range(10, 14):
        for x in range(26, 32):
            if out[y, x, 3] == 0:
                continue
            r, g, b, _ = out[y, x]
            if r > 190 and g > 120:
                if rune_pulse > 0.72:
                    out[y, x] = GOLD_WHITE if (x + y) % 2 == 0 else GOLD_BRIGHT
                elif rune_pulse > 0.4:
                    out[y, x] = GOLD_BRIGHT if (x + y) % 2 == 0 else AMBER_FLAME

    # Subtle ruby-gold rune pulse on her dragon breastplate & tasset runes (y=17..33, x=24..31)
    if rune_pulse > 0.65:
        for rx_p, ry_p in [(27, 18), (29, 20), (28, 25), (25, 29)]:
            if out[ry_p, rx_p, 3] > 0:
                out[ry_p, rx_p] = GOLD_WHITE if rune_pulse > 0.85 else GOLD_BRIGHT

    return fill_layer_pinholes(out)


def solve_ik_elbow(sx, sy, hx, hy, L1=5.6, L2=5.4, bend_side=1.0):
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


def draw_ik_valkyrie_arm(layer, sx, sy, hx, hy, L1=5.6, L2=5.4, bend_side=1.0, is_rear=False):
    """
    Draws Freyja's 2-Bone Inverse Kinematics (IK) Crimson-Gold Dragon-Plate Arm extending from
    shoulder `(sx, sy)` to Dragon-Lance shaft grip `(hx, hy)`:
    - When `is_rear=True`: Rear Armored Arm & Gauntlet from Rear Shoulder `(21, 18)` to the rear shaft grip.
    - When `is_rear=False`: Lead Armored Arm & Gauntlet from Lead Shoulder `(27, 19)` to the forward shaft grip
      with a winged crimson-gold dragon pauldron, golden elbow couter, and `3x3` crimson-gold gauntlet.
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
        # 1. Rear upper dragon-scale arm from (sx, sy) to (ex, ey)
        for off, col in [
            (-1.0, OBSIDIAN_DEEP),
            (-0.4, CRIMSON_DARK),
            (0.0, CRIMSON_MID),
            (0.5, GOLD_DARK),
            (1.0, OBSIDIAN_DARK),
        ]:
            draw_line_px(layer, sx + n1x * off, sy + n1y * off, ex + n1x * (off * 0.85), ey + n1y * (off * 0.85), col)

        # 2. Rear crimson-gold vambrace from (ex, ey) to (hx, hy)
        for off, col in [
            (-1.0, OBSIDIAN_DEEP),
            (-0.4, CRIMSON_MID),
            (0.0, GOLD_BRIGHT),
            (0.5, CRIMSON_DARK),
            (1.0, OBSIDIAN_DARK),
        ]:
            draw_line_px(layer, ex + n2x * off, ey + n2y * off, hx + n2x * (off * 0.85), hy + n2y * (off * 0.85), col)

        # 3. Rear shoulder pauldron & golden elbow couter
        for dy_s in (-1, 0, 1):
            for dx_s in (-1, 0, 1):
                set_px(layer, sx + dx_s, sy + dy_s, GOLD_MID if dy_s == -1 else CRIMSON_MID)
        set_px(layer, ex, ey, GOLD_BRIGHT)
    else:
        # 1. Lead upper dragon-plate bicep from (sx, sy) to (ex, ey)
        for off, col in [
            (-1.1, OBSIDIAN_DEEP),
            (-0.5, CRIMSON_MID),
            (0.0, CRIMSON_BRIGHT),
            (0.5, GOLD_MID),
            (1.1, OBSIDIAN_DARK),
        ]:
            draw_line_px(layer, sx + n1x * off, sy + n1y * off, ex + n1x * (off * 0.85), ey + n1y * (off * 0.85), col)

        # 2. Lead ornate rune-etched crimson-gold vambrace from (ex, ey) to (hx, hy)
        for off, col in [
            (-1.1, OBSIDIAN_DARK),
            (-0.5, CRIMSON_BRIGHT),
            (0.0, GOLD_BRIGHT),
            (0.5, CRIMSON_MID),
            (1.1, GOLD_DARK),
        ]:
            draw_line_px(layer, ex + n2x * off, ey + n2y * off, hx + n2x * (off * 0.85), hy + n2y * (off * 0.85), col)

        # 3. Rotating Crimson-Gold Dragon Pauldron at (sx, sy)
        for p_step in (-1.4, -0.7, 0.0, 0.7, 1.4):
            for r_step in (-0.6, 0.2, 0.9):
                px_s = sx + ux1 * r_step + n1x * p_step
                py_s = sy + uy1 * r_step + n1y * p_step
                if abs(p_step) >= 1.2 or r_step >= 0.8:
                    col_p = GOLD_BRIGHT
                elif abs(p_step) >= 0.6:
                    col_p = CRIMSON_BRIGHT
                else:
                    col_p = CRIMSON_MID
                set_px(layer, px_s, py_s, col_p)
        set_px(layer, sx, sy - 1, GOLD_WHITE)

        # 4. Winged Golden Elbow Couter at (ex, ey)
        set_px(layer, ex, ey, GOLD_WHITE)
        set_px(layer, ex + n1x * 0.8, ey + n1y * 0.8, GOLD_BRIGHT)
        set_px(layer, ex - n1x * 0.8, ey - n1y * 0.8, CRIMSON_DARK)

    # 5. 3x3 Crimson-Gold Valkyrie Gauntlet clasping the shaft at (hx, hy)
    for dy_g in (-1, 0, 1):
        for dx_g in (-1, 0, 1):
            if dx_g == 0 and dy_g == -1:
                col_g = GOLD_WHITE if not is_rear else GOLD_BRIGHT
            elif dy_g <= 0:
                col_g = CRIMSON_BRIGHT if not is_rear else CRIMSON_MID
            else:
                col_g = GOLD_MID if not is_rear else OBSIDIAN_DARK
            set_px(layer, hx + dx_g, hy + dy_g, col_g)

    return ex, ey


def draw_two_handed_dragon_lance(
    canvas,
    hand_x,
    hand_y,
    angle_deg,
    glow_intensity=1.0,
    scale=1.0,
    shoulder_rear=(21, 18),
    shoulder_lead=(27, 19),
    draw_arm=True,
    cleave_arc=None,
    drill_cone=False,
    phase=0.0,
):
    """
    Renders Freyja's regal Two-Handed Crimson-Gold Gungnir Dragon-Lance / Wyvern Halberd (`~24px` total length):
    - Dark-iron & gold-ringed polearm shaft (`15px` from ruby-gold pommel butt-spike to crossguard collar)
    - Ornate Golden Dragon-Wing Crossguard Collar with twin flared halberd wing-flukes
    - `9px` tapered Crimson-Ruby & White-Gold Gungnir Spearhead (`15 + 9 = 24px` total length!)
    - Gripped by BOTH hands connected via 2-bone IK arms from Rear Shoulder `(21, 18)` to the rear shaft grip
      and Lead Shoulder `(27, 19)` to the forward shaft grip!
    - Rigidly translated inside `3.5 <= x <= 47.5, 3.5 <= y <= 46.0` so `0/270` boundary clips ever occur.
    """
    rear_arm_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    lance_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    rear_gauntlet_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    lead_arm_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    fx_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    rad = math.radians(angle_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    px, py = -uy, ux  # perpendicular vector for halberd wing-flukes & blade width

    # ~24px total length breakdown:
    # pom_dist (4.0px) + grip_sep (5.5px) + lead_to_collar (5.5px) + spearhead_len (9.0px) = 24.0px!
    pom_dist = 4.0 * scale
    grip_sep = 5.5 * scale
    lead_to_collar = 5.5 * scale
    spearhead_len = 9.0 * scale
    fluke_span = 3.4 * scale

    # Initial Lead Grip and Rear Grip from (hand_x, hand_y)
    lead_gx = float(max(26.0, min(36.0, hand_x)))
    lead_gy = float(max(13.0, min(35.0, hand_y)))
    rear_gx = lead_gx - ux * grip_sep
    rear_gy = lead_gy - uy * grip_sep

    pom_x = rear_gx - ux * pom_dist
    pom_y = rear_gy - uy * pom_dist
    collar_x = lead_gx + ux * lead_to_collar
    collar_y = lead_gy + uy * lead_to_collar
    tip_x = collar_x + ux * spearhead_len
    tip_y = collar_y + uy * spearhead_len

    # Compute exact bounding box of all lance key points (pommel, collar wing-flukes, and spearhead tip)
    pts_x = [
        pom_x,
        tip_x,
        collar_x + px * fluke_span,
        collar_x - px * fluke_span,
        tip_x + px * 1.5,
        tip_x - px * 1.5,
    ]
    pts_y = [
        pom_y,
        tip_y,
        collar_y + py * fluke_span,
        collar_y - py * fluke_span,
        tip_y + py * 1.5,
        tip_y - py * 1.5,
    ]
    min_px, max_px = min(pts_x), max(pts_x)
    min_py, max_py = min(pts_y), max(pts_y)

    dx_fix = 0.0
    if max_px > 47.0:
        dx_fix = 47.0 - max_px
    elif min_px < 4.0:
        dx_fix = 4.0 - min_px

    dy_fix = 0.0
    if max_py > 45.5:
        dy_fix = 45.5 - max_py
    elif min_py < 4.0:
        dy_fix = 4.0 - min_py

    rear_gx += dx_fix
    rear_gy += dy_fix
    lead_gx += dx_fix
    lead_gy += dy_fix
    pom_x += dx_fix
    pom_y += dy_fix
    collar_x += dx_fix
    collar_y += dy_fix
    tip_x += dx_fix
    tip_y += dy_fix

    # 1. Dark-Iron & Gold-Ringed Polearm Shaft (from pommel to crossguard collar = 15px)
    shaft_steps = int(round(math.hypot(collar_x - pom_x, collar_y - pom_y) * 2.8))
    for i in range(shaft_steps + 1):
        u_s = i / float(max(1, shaft_steps))
        sx_p = pom_x + (collar_x - pom_x) * u_s
        sy_p = pom_y + (collar_y - pom_y) * u_s
        ring_band = (i % 5 == 0)
        crimson_wrap = (0.25 <= u_s <= 0.68) and (i % 2 == 1)
        c_core = GOLD_BRIGHT if ring_band else (CRIMSON_MID if crimson_wrap else IRON_MID)
        c_edge = GOLD_MID if ring_band else OBSIDIAN_DARK
        set_px(lance_layer, sx_p, sy_p, c_core)
        set_px(lance_layer, sx_p + px * 0.6, sy_p + py * 0.6, c_edge)
        set_px(lance_layer, sx_p - px * 0.6, sy_p - py * 0.6, OBSIDIAN_DEEP)

    # Ruby-Gold Dragon-Tail Pommel Butt-Spike at (pom_x, pom_y)
    set_px(lance_layer, pom_x, pom_y, GOLD_BRIGHT)
    set_px(lance_layer, pom_x - ux * 0.8, pom_y - uy * 0.8, RUBY_BRIGHT)
    set_px(lance_layer, pom_x + px * 0.7, pom_y + py * 0.7, GOLD_MID)

    # 2. Ornate Golden Dragon-Wing Crossguard Collar & Twin Flared Halberd Wing-Flukes at (collar_x, collar_y)
    for side in (-1.0, 1.0):
        for w_i in range(1, 8):
            u_w = w_i / 7.0
            # Wing-fluke flares outward up to fluke_span and curves gracefully forward & backward like a halberd crescent
            lat = side * u_w * fluke_span
            fwd_curve = math.sin(u_w * math.pi) * 1.4 * scale
            wx = collar_x + px * lat + ux * fwd_curve
            wy = collar_y + py * lat + uy * fwd_curve
            set_px(lance_layer, wx, wy, GOLD_WHITE if u_w > 0.7 else GOLD_BRIGHT)
            # Swept-back crimson-ruby halberd fluke barb
            bx = collar_x + px * (lat * 0.92) - ux * (u_w * 1.5 * scale)
            by = collar_y + py * (lat * 0.92) - uy * (u_w * 1.5 * scale)
            set_px(lance_layer, bx, by, RUBY_BRIGHT if u_w < 0.65 else GOLD_MID)

    # Central Ruby-Diamond Sunburst Gem on Crossguard Collar
    set_px(lance_layer, collar_x, collar_y, GOLD_WHITE)
    set_px(lance_layer, collar_x + ux * 0.7, collar_y + uy * 0.7, RUBY_CORE)

    # 3. 9px Tapered Crimson-Ruby & White-Gold Gungnir Spearhead (from collar_x/y to tip_x/y)
    blade_steps = int(round(spearhead_len * 3.5))
    for bi in range(blade_steps + 1):
        u_b = bi / float(max(1, blade_steps))  # 0.0 at collar -> 1.0 at needle apex
        bx_c = collar_x + ux * (u_b * spearhead_len)
        by_c = collar_y + uy * (u_b * spearhead_len)
        # Diamond flare profile: widens to 2.3px at u_b=0.22 then tapers to 0.0 at u_b=1.0
        if u_b < 0.22:
            half_w = (0.45 + 0.55 * (u_b / 0.22)) * 2.2 * scale
        else:
            half_w = (1.0 - (u_b - 0.22) / 0.78) * 2.2 * scale

        w_steps = max(1, int(round(half_w * 3.0)))
        for wi in range(-w_steps, w_steps + 1):
            w_off = (wi / float(w_steps)) * half_w if half_w > 0.15 else 0.0
            px_b = bx_c + px * w_off
            py_b = by_c + py * w_off
            aw = abs(w_off) / max(0.15, half_w)
            if u_b > 0.84 or abs(w_off) < 0.32:
                # Blazing White-Gold Gungnir fuller spine & needle apex
                col_b = GOLD_WHITE if (glow_intensity >= 0.95 or u_b > 0.88) else GOLD_BRIGHT
            elif aw > 0.72:
                # Razor White-Gold & Amber cutting edges
                col_b = GOLD_WHITE if (glow_intensity >= 1.1 and u_b > 0.45) else GOLD_LIGHT
            else:
                # Crimson-Ruby beveled dragon-lance blade flats
                col_b = RUBY_CORE if (glow_intensity >= 1.15 and wi > 0) else (RUBY_BRIGHT if wi >= 0 else CRIMSON_MID)
            set_px(lance_layer, px_b, py_b, col_b)

    # 4. BOTH Hands Grip the Dragon-Lance Shaft via 2-Bone IK Arms:
    #    - Rear Shoulder (21, 18) -> (rear_gx, rear_gy)
    #    - Lead Shoulder (27, 19) -> (lead_gx, lead_gy)
    if draw_arm and shoulder_rear is not None and shoulder_lead is not None:
        sx_rear = float(max(17.0, min(26.0, shoulder_rear[0])))
        sy_rear = float(max(13.0, min(36.0, shoulder_rear[1])))
        draw_ik_valkyrie_arm(
            rear_arm_layer,
            sx_rear,
            sy_rear,
            rear_gx,
            rear_gy,
            L1=6.0,
            L2=5.8,
            bend_side=1.0,
            is_rear=True,
        )
        # Rear Gauntlet fingers clasping over the shaft at (rear_gx, rear_gy)
        for dy_g in (-1, 0, 1):
            for dx_g in (-1, 0, 1):
                col_rg = GOLD_BRIGHT if (dx_g == 0 and dy_g == -1) else (CRIMSON_BRIGHT if dy_g <= 0 else GOLD_DARK)
                set_px(rear_gauntlet_layer, rear_gx + dx_g, rear_gy + dy_g, col_rg)

        sx_lead = float(max(24.0, min(33.0, shoulder_lead[0])))
        sy_lead = float(max(13.0, min(36.0, shoulder_lead[1])))
        draw_ik_valkyrie_arm(
            lead_arm_layer,
            sx_lead,
            sy_lead,
            lead_gx,
            lead_gy,
            L1=6.0,
            L2=5.8,
            bend_side=1.0,
            is_rear=False,
        )
        # 1px dark silhouette seam around lead_arm_layer so the lead arm & gauntlet pop cleanly against torso & shaft
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
                        lead_arm_layer[y_a, x_a] = OBSIDIAN_DEEP

    # 5. Rising Crimson-Gold Dragonfire Embers at the Spearhead
    if glow_intensity > 0.85:
        num_embers = 5 if glow_intensity >= 1.2 else 3
        for e_i in range(num_embers):
            u_e = (e_i + 1) / float(num_embers + 1)
            bx_e = collar_x + ux * (u_e * spearhead_len)
            by_e = collar_y + uy * (u_e * spearhead_len)
            e_ang = phase * 1.8 + e_i * 2.1
            ex_e = max(4.0, min(47.0, bx_e + math.cos(e_ang) * 2.4))
            ey_e = max(4.0, min(45.5, by_e - 1.5 - (e_i % 2) + math.sin(e_ang) * 1.2))
            set_px(fx_layer, ex_e, ey_e, GOLD_WHITE if e_i % 2 == 0 else RUBY_CORE)
            if glow_intensity >= 1.1:
                set_px(fx_layer, ex_e, max(4.0, ey_e - 1.0), AMBER_FLAME if e_i % 2 == 0 else CRIMSON_BRIGHT)

    # 6. Optional Spiraling Crimson-Gold Dragonfire Drill Cone around the Spearhead (Row 6 Dash & Row 8 Sky-Dive)
    if drill_cone:
        for d_i in range(16):
            u_d = d_i / 15.0  # 0 at collar -> 1 at tip
            cx_d = collar_x - ux * 1.5 + ux * (u_d * (spearhead_len + 2.5))
            cy_d = collar_y - uy * 1.5 + uy * (u_d * (spearhead_len + 2.5))
            cone_r = (1.0 - u_d * 0.78) * 4.2
            spiral_a = phase * 3.0 + u_d * math.pi * 4.0
            for strand in (0, 1):
                sa = spiral_a + strand * math.pi
                off_p = math.sin(sa) * cone_r
                sx_c = max(4.0, min(47.0, cx_d + px * off_p))
                sy_c = max(4.0, min(45.5, cy_d + py * off_p))
                col_c = GOLD_WHITE if strand == 0 and d_i % 2 == 0 else (AMBER_FLAME if strand == 0 else RUBY_CORE)
                set_px(fx_layer, sx_c, sy_c, col_c)
                set_px(
                    fx_layer,
                    max(4.0, min(47.0, sx_c - ux * 0.8)),
                    max(4.0, min(45.5, sy_c - uy * 0.8)),
                    CRIMSON_BRIGHT if strand == 1 else GOLD_BRIGHT,
                )

    # 7. Optional 3-Band White-Gold, Amber-Flame & Crimson-Rose Dragonfire Lance Trail
    if cleave_arc is not None:
        a_start, a_end, arc_r, arc_int = cleave_arc
        arc_steps = 46
        piv_x = float(shoulder_lead[0]) if shoulder_lead is not None else 27.0
        piv_y = max(20.0, float(shoulder_lead[1]) + 2.0 if shoulder_lead is not None else 21.0)
        r_uniform = min(float(arc_r), piv_y - 4.5, 47.0 - piv_x, 45.0 - piv_y)
        r_uniform = max(12.0, r_uniform)
        for k in range(arc_steps + 1):
            u_a = k / float(arc_steps)
            ang = math.radians(a_start + (a_end - a_start) * u_a)
            ca, sa = math.cos(ang), math.sin(ang)
            env = math.sin(u_a * math.pi) * arc_int
            if env <= 0.1:
                continue
            ax = max(4.0, min(47.0, piv_x + ca * r_uniform))
            ay = max(4.0, min(45.5, piv_y + sa * r_uniform))
            # Band 1 (Outer): Blazing White-Gold razor edge
            set_px(fx_layer, ax, ay, GOLD_WHITE if u_a > 0.45 else GOLD_LIGHT)
            # Band 2 (Mid): Molten Amber-Flame dragonfire ribbon
            set_px(
                fx_layer,
                max(4.0, min(47.0, ax - ca * 1.2)),
                max(4.0, min(45.5, ay - sa * 1.2)),
                AMBER_FLAME if k % 2 == 0 else GOLD_BRIGHT,
            )
            # Band 3 (Inner): Crimson-Rose dragonfire wake
            if env > 0.35:
                set_px(
                    fx_layer,
                    max(4.0, min(47.0, ax - ca * 2.4)),
                    max(4.0, min(45.5, ay - sa * 2.4)),
                    RUBY_CORE if k % 3 == 0 else RUBY_BRIGHT,
                )
                set_px(
                    fx_layer,
                    max(4.0, min(47.0, ax - ca * 3.5)),
                    max(4.0, min(45.5, ay - sa * 3.5)),
                    CRIMSON_MID,
                )

    # Painter's Order: Body -> Rear Arm -> 2H Dragon-Lance -> Rear Gauntlet Clasp -> Lead Arm & Gauntlet -> FX
    out = composite_over(canvas, rear_arm_layer)
    out = composite_over(out, lance_layer)
    if angle_deg < -86.0:
        for yh in range(4, 16):
            for xh in range(22, 32):
                if canvas[yh, xh, 3] > 0:
                    out[yh, xh] = canvas[yh, xh]
    out = composite_over(out, rear_gauntlet_layer)
    out = composite_over(out, lead_arm_layer)
    out = composite_over(out, fx_layer)
    return out


def draw_valkyrie_dragon_wings(canvas, attach_xy=(20, 17), wing_span=1.0, flap_phase=0.0, top_min_y=7, bot_max_y=33):
    """
    Unfurls Freyja's 4-Pinion Crimson-Gold Valkyrie Dragon-Wings (`x = 4..18, y = 7..33`) from her back:
    - Golden-armored upper dragon wing-ridge & claw at `y = 7..13, x = 6..18`
    - 4 sweeping primary crimson-ruby & white-gold feathered dragon pinions across `x = 4..18, y = 8..33`
    - Painted BEHIND the character torso so her head, hair, and armor pop cleanly in front.
    """
    wings = np.zeros((52, 52, 4), dtype=np.uint8)
    ax, ay = attach_xy
    flap_dy = math.sin(flap_phase) * 1.6

    # 4 primary pinions fanning from upper (y=8) to lower (y=32) inside x = 4..18
    pinions = [
        # (tip_x, tip_y_base, arch_lift, col_feather)
        (4, max(top_min_y + 1, 9), 3.0, GOLD_WHITE),
        (5, 15, 2.2, GOLD_BRIGHT),
        (6, 22, 1.4, RUBY_CORE),
        (8, min(bot_max_y - 1, 29), 0.6, CRIMSON_BRIGHT),
    ]

    for p_idx, (tx_base, ty_base, arch_lift, col_hi) in enumerate(pinions):
        tx = int(round(ax - (ax - tx_base) * wing_span))
        tx = max(4, min(18, tx))
        ty = int(round(ty_base + flap_dy * (1.0 - p_idx * 0.2)))
        ty = max(top_min_y, min(bot_max_y, ty))

        steps = max(1, int(max(abs(ax - tx), abs(ay - ty)) * 2))
        for s in range(steps + 1):
            u = s / float(steps)
            wx = max(4.0, min(18.0, ax * (1.0 - u) + tx * u))
            wy = max(
                float(top_min_y),
                min(float(bot_max_y), ay * (1.0 - u) + ty * u - math.sin(u * math.pi) * arch_lift),
            )
            # Upper golden pinion quill
            set_px(wings, wx, wy, GOLD_WHITE if (u > 0.75 and p_idx <= 1) else (GOLD_BRIGHT if p_idx <= 1 else col_hi))
            # Crimson-ruby dragon-wing membrane & layered covert feathers below each quill
            for m_dy in range(1, 5 - (p_idx // 2)):
                my = min(float(bot_max_y), wy + m_dy)
                if m_dy == 1:
                    col_m = GOLD_MID if p_idx == 0 else RUBY_BRIGHT
                elif m_dy == 2:
                    col_m = CRIMSON_BRIGHT if (int(wx) + m_dy) % 2 == 0 else CRIMSON_MID
                else:
                    col_m = CRIMSON_DARK if m_dy == 3 else OBSIDIAN_DARK
                set_px(wings, wx, my, col_m)

    # Golden dragon-claw wing joint at upper bend (x=11..13, y=max(top_min_y, 8))
    claw_x = max(5, min(17, int(round(ax - 8 * wing_span))))
    claw_y = max(top_min_y, min(bot_max_y - 4, int(round(9 + flap_dy * 0.7))))
    set_px(wings, claw_x, claw_y, GOLD_WHITE)
    set_px(wings, claw_x - 1, max(top_min_y, claw_y - 1), GOLD_BRIGHT)
    set_px(wings, claw_x + 1, claw_y, RUBY_CORE)

    wings = fill_layer_pinholes(wings, x0=4, x1=19, y0=top_min_y, y1=bot_max_y + 1, require_3_neighbors=False)
    return composite_over(wings, canvas)


def _extract_full_valkyrie_cape(stand, dy_offset=0, phase=0.0, wave_scale=1.0, lift_y=0):
    """
    Extracts Freyja's sweeping crimson-and-gold Valkyrie cape (`x = 2..20` for `y = 18..41`),
    draping solidly behind her striding or jumping legs!
    """
    cape_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    for y in range(18, 41):
        ny = y + dy_offset
        if not (2 <= ny <= 48):
            continue
        u = (y - 18) / 22.0
        wave_dx = int(round((-u * 1.2 + math.sin(phase - u * 3.0) * (1.3 * u)) * wave_scale))
        wave_dy = int(round(math.cos(phase - u * 2.5) * (0.5 * u) * wave_scale + u * lift_y))

        if y <= 33:
            for x in range(2, 21):
                if stand[y, x, 3] == 0:
                    continue
                cx = max(2, min(21, x + wave_dx))
                cy = max(12, min(44, ny + wave_dy))
                cape_layer[cy, cx] = stand[y, x]
                if x >= 15:
                    cape_layer[ny, x] = stand[y, x]
        else:
            left_x = 3 if y <= 35 else min(14, 4 + (y - 34))
            right_x = 20 - max(0, (y - 34))
            for x in range(left_x, right_x + 1):
                if x < 15 and stand[y, x, 3] > 0:
                    col = stand[y, x]
                else:
                    if x == left_x or y >= 39:
                        col = GOLD_MID if (x + y) % 2 == 0 else GOLD_DARK
                    elif x <= left_x + 2:
                        col = CAPE_HI if (x + y) % 3 == 0 else CAPE_MID
                    else:
                        col = CAPE_DARK if (x + y) % 2 == 0 else CAPE_DEEP
                cx = max(2, min(21, x + wave_dx))
                cy = max(14, min(44, ny + wave_dy))
                cape_layer[cy, cx] = col

    return fill_layer_pinholes(cape_layer, x0=2, x1=22, y0=12, y1=45, require_3_neighbors=False)


def _draw_valkyrie_plate_leg(
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
    Draws Freyja's crimson-and-gold dragon-scale cuisse (thigh), winged golden knee poleyn,
    crimson-obsidian shin greave, and rotated armored sabaton boot.
    """
    if is_far_leg:
        c_edge = OBSIDIAN_DEEP
        c_dark = CRIMSON_DEEP
        c_mid = CRIMSON_DARK
        c_hi = CRIMSON_MID
        c_trim = GOLD_DARK
        c_knee = GOLD_MID
    else:
        c_edge = OBSIDIAN_DEEP
        c_dark = CRIMSON_DARK
        c_mid = CRIMSON_MID
        c_hi = CRIMSON_BRIGHT
        c_trim = GOLD_BRIGHT
        c_knee = GOLD_WHITE

    # 1. Dragon-scale thigh cuisse (hip -> knee)
    cuisse_strips = [
        (-2.2, c_edge),
        (-1.5, c_dark),
        (-0.7, c_mid),
        (0.0, c_hi),
        (0.8, c_trim),
        (1.6, c_mid),
        (2.2, c_edge),
    ]
    for off_x, col in cuisse_strips:
        draw_line_px(layer, hip_x + off_x, hip_y, knee_x + off_x * 0.9, knee_y, col)

    # 2. Crimson-and-gold shin greave (knee -> ankle)
    greave_strips = [
        (-2.1, c_edge),
        (-1.4, c_dark),
        (-0.6, c_mid),
        (0.1, c_hi),
        (0.8, c_trim),
        (1.5, c_dark),
        (2.1, c_edge),
    ]
    for off_x, col in greave_strips:
        draw_line_px(layer, knee_x + off_x * 0.9, knee_y, ank_x + off_x * 0.85, ank_y, col)

    # 3. Rotated dragon-greave sabaton boot
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
                    px_col[0] = int(px_col[0] * 0.80)
                    px_col[1] = int(px_col[1] * 0.80)
                    px_col[2] = int(px_col[2] * 0.84)
                layer[ny, nx] = px_col

    # 4. Winged Golden-Crimson Knee Poleyn at (knee_x, knee_y)
    for dy_k in (-1, 0, 1):
        for dx_k in (-2, -1, 0, 1, 2):
            if abs(dx_k) == 2 and dy_k == 1:
                continue
            if dy_k == -1 or abs(dx_k) == 2:
                col_k = c_knee if (dy_k == -1 and dx_k == 0) else c_trim
            else:
                col_k = c_hi if dx_k == 0 else c_mid
            set_px(layer, knee_x + dx_k, knee_y + dy_k, col_k)

    return fill_layer_pinholes(layer, x0=3, x1=49, y0=24, y1=48, require_3_neighbors=False)


def render_walk_valkyrie(tpl, f):
    """
    Row 1 helper: Smooth 30-frame 2-step anatomical Valkyrie Dragoon stride cycle
    (`F00..F14` Step A, `F15..F29` Step B) preserving her full crimson-gold cape,
    flowing platinum-gold hair, dragon-scale hip tassets, and central chainmail tabard.
    """
    phase = (f / 30.0) * 2.0 * math.pi
    bob_y = int(round(math.cos(phase * 2.0) * 1.0))

    stand = tpl["stand"].copy()
    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    tabard_overlay = np.zeros((52, 52, 4), dtype=np.uint8)

    # 1. Full Crimson-and-Gold Valkyrie Cape behind legs
    cape_layer = _extract_full_valkyrie_cape(stand, dy_offset=bob_y, phase=phase, wave_scale=1.0, lift_y=0)

    # 2. Upper Torso, Winged Dragon Helm, Platinum-Gold Hair & Hip Tassets (y = 0..35)
    for y in range(0, 36):
        ny = y + bob_y
        if not (2 <= ny <= 49):
            continue
        min_tx = 14 if y < 20 else 21
        max_tx = 35
        for x in range(min_tx, max_tx):
            if stand[y, x, 3] > 0:
                torso_layer[ny, x] = stand[y, x]
                if (27 <= y <= 32 and 23 <= x <= 32) or (27 <= y <= 35 and 26 <= x <= 31):
                    tabard_overlay[ny, x] = stand[y, x]

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

        return _draw_valkyrie_plate_leg(
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
        tpl["leg_back"], orig_cx=22.0, hip_x=23.5, foot_base_x=22.0, swing_phase=phase + math.pi, is_far_leg=True
    )
    near_leg = build_striding_leg(
        tpl["leg_front"], orig_cx=33.0, hip_x=31.0, foot_base_x=33.0, swing_phase=phase, is_far_leg=False
    )

    out = composite_over(cape_layer, far_leg)
    out = composite_over(out, torso_layer)
    out = composite_over(out, near_leg)
    out = composite_over(out, tabard_overlay)
    out = apply_hair_and_cape_wave(out, phase, amplitude=1.4, vertical_flutter=0.5, rune_pulse=0.7)
    return fill_layer_pinholes(out)


def make_crouch_valkyrie(tpl, crouch_depth):
    """
    Constructs Freyja's deep knee-bend Phalanx crouch (`d = 1..6`) via continuous vertical
    compression warp on `tpl['stand']`, keeping her winged dragon helm, hair, crimson-gold armor,
    and anchored sabatons (`ny = 44..49`) 100% intact.
    """
    stand = tpl["stand"]
    d = max(0, min(6, int(round(crouch_depth))))
    if d <= 0:
        return stand.copy()

    canvas = np.zeros((52, 52, 4), dtype=np.uint8)

    # 1. Shift upper body, winged helm, hair, and waist (`ny <= 28 + d`) down by `d`
    for ny in range(d, 29 + d):
        sy = ny - d
        if 0 <= sy <= 28 and 2 <= ny <= 49:
            canvas[ny, :] = stand[sy, :]

    # 2. Compress hip tassets, cuisses, knee poleyns, and greaves (`ny = 29 + d .. 43`) from `sy = 28 .. 43`
    span = max(1.0, float(43 - (29 + d)))
    for ny in range(29 + d, 44):
        u = (ny - (29 + d)) / span
        sy = int(round(28.0 + u * 15.0))
        sy = max(28, min(43, sy))
        knee_dx = 1 if (d >= 2 and 0.25 <= u <= 0.75) else 0
        for x in range(2, 50):
            if stand[sy, x, 3] > 0:
                nx = x if x <= 17 else min(49, x + knee_dx)
                canvas[ny, nx] = stand[sy, x]

    # 3. Keep dragon-greave sabatons anchored firmly on the floor at `ny = 44..49`
    for ny in range(44, 50):
        canvas[ny, :] = stand[ny, :]

    return fill_layer_pinholes(canvas)


def make_aerial_valkyrie(
    tpl,
    jump_dy,
    body_tilt_deg=0.0,
    leg_tuck=0.5,
    wing_span=0.9,
    phase=0.0,
):
    """
    Row 8 helper: Constructs Freyja's airborne Dragoon vault posture with unfurling
    Crimson-Gold Valkyrie Dragon-Wings (`x = 4..18, y = 8..32`), full crimson-gold cape,
    and articulated dragon-plate legs (ZERO bouncy-ball or curled sphere frames!).
    """
    stand = tpl["stand"].copy()
    dy_i = max(-1, min(3, int(round(jump_dy))))
    t = max(0.0, min(1.0, leg_tuck))

    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    tabard_overlay = np.zeros((52, 52, 4), dtype=np.uint8)

    cape_lift = int(round(-t * 1.5))
    cape_layer = _extract_full_valkyrie_cape(stand, dy_offset=dy_i, phase=phase, wave_scale=1.1, lift_y=cape_lift)

    lean_dx = 1 if body_tilt_deg > 5.0 else (-1 if body_tilt_deg < -5.0 else 0)
    for y in range(0, 36):
        ny = max(3, min(47, y + dy_i))
        dx = lean_dx if y <= 24 else 0
        min_tx = 14 if y < 20 else 21
        max_tx = 35
        for x in range(min_tx, max_tx):
            if stand[y, x, 3] > 0:
                nx = max(3, min(48, x + dx))
                torso_layer[ny, nx] = stand[y, x]
                if (27 <= y <= 32 and 23 <= x <= 32) or (27 <= y <= 35 and 26 <= x <= 31):
                    tabard_overlay[ny, nx] = stand[y, x]

    hip_y = 33.0 + dy_i

    def build_aerial_leg(boot_patch, orig_cx, hip_x, knee_dx, knee_dy, foot_dx, foot_dy, boot_rot_deg, is_far_leg=False):
        layer = np.zeros((52, 52, 4), dtype=np.uint8)
        kx = hip_x + knee_dx
        ky = hip_y + knee_dy
        ax = orig_cx + foot_dx
        ay = 42.0 + foot_dy
        return _draw_valkyrie_plate_leg(
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
        orig_cx=22.0,
        hip_x=23.5,
        knee_dx=-1.0 - 1.0 * t,
        knee_dy=4.5 - 1.8 * t,
        foot_dx=-0.5 - 1.0 * t,
        foot_dy=dy_i - 2.2 * t,
        boot_rot_deg=-10.0 * t,
        is_far_leg=True,
    )
    near_leg = build_aerial_leg(
        tpl["leg_front"],
        orig_cx=33.0,
        hip_x=31.0,
        knee_dx=1.5 + 1.2 * t,
        knee_dy=4.0 - 2.2 * t,
        foot_dx=0.0 + 1.0 * t,
        foot_dy=dy_i - 3.0 * t,
        boot_rot_deg=-14.0 * t,
        is_far_leg=False,
    )

    out = composite_over(cape_layer, far_leg)
    out = composite_over(out, torso_layer)
    out = composite_over(out, near_leg)
    out = composite_over(out, tabard_overlay)
    out = apply_hair_and_cape_wave(out, phase, amplitude=1.4, vertical_flutter=0.6, rune_pulse=0.9)
    if wing_span > 0.05:
        out = draw_valkyrie_dragon_wings(
            out,
            attach_xy=(21, max(15, 18 + dy_i)),
            wing_span=wing_span,
            flap_phase=phase * 2.0,
            top_min_y=8,
            bot_max_y=32,
        )
    return fill_layer_pinholes(out)


def build_row0_idle(tpl):
    """
    Row 0 (`IDLE`, 30 frames):
    - Breathing cycle (1px upper-body rise & fall with solid waist row duplication)
    - Flowing platinum-gold hair & crimson-gold cape wave
    - Pulsing ruby-gold dragon armor runes & golden visor eyes
    - Two-handed diagonal port-arms Dragon-Lance stance (`-48 deg`, gripped by BOTH hands from `(21, 18)` and `(27, 19)`)
    - Rising crimson-gold dragonfire embers at the spearhead.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        base = tpl["stand"].copy()

        breath_dy = -1 if 8 <= f <= 20 else 0
        if breath_dy == -1:
            upper = base[5:31, 14:35].copy()
            base[4:30, 14:35] = upper
            base[30, 14:35] = upper[25, :]
            base = fill_layer_pinholes(base)

        pulse = 0.55 + 0.45 * math.sin(phase)
        base = apply_hair_and_cape_wave(base, phase, amplitude=1.5, vertical_flutter=0.5, rune_pulse=pulse)

        lance_ang = -46.0 + math.sin(phase) * 4.0
        hx = 32
        hy = 23 + breath_dy
        frame = draw_two_handed_dragon_lance(
            base,
            hand_x=hx,
            hand_y=hy,
            angle_deg=lance_ang,
            glow_intensity=0.95 + 0.35 * math.sin(phase),
            scale=1.0,
            shoulder_rear=(21, 18 + breath_dy),
            shoulder_lead=(27, 19 + breath_dy),
            phase=phase,
        )

        # Rising crimson-gold dragonfire ember motes near the Gungnir spearhead
        ember_x = 41 + (f % 4)
        ember_y = max(5, 11 + breath_dy - ((f // 3) % 4))
        set_px(frame, ember_x, ember_y, GOLD_WHITE if f % 2 == 0 else RUBY_CORE)
        set_px(frame, max(4, ember_x - 1), min(46, ember_y + 1), AMBER_FLAME if f % 3 == 0 else CRIMSON_BRIGHT)

        frames.append(frame)
    return frames


def build_row1_walk(tpl):
    """
    Row 1 (`WALK`, 30 frames):
    - Smooth 30-frame 2-step anatomical stride cycle (`F00..F14` Step A, `F15..F29` Step B)
    - Two-handed Dragon-Lance carried at ready port-arms (`-44 deg ± 12 deg`) with both IK arms
    - Grounded heel-strike golden-crimson sparks at `F07..F10` and `F22..F25`.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        body = render_walk_valkyrie(tpl, f)
        bob_y = int(round(math.cos(phase * 2.0) * 1.0))

        swing = math.sin(phase)
        lance_ang = -44.0 + swing * 12.0
        hx = 32 - int(round(swing * 1.5))
        hy = 23 + bob_y

        frame = draw_two_handed_dragon_lance(
            body,
            hand_x=hx,
            hand_y=hy,
            angle_deg=lance_ang,
            glow_intensity=0.95 + 0.25 * math.sin(phase * 2.0),
            scale=1.0,
            shoulder_rear=(21, 18 + bob_y),
            shoulder_lead=(27, 19 + bob_y),
            phase=phase,
        )

        # Grounded heel-strike golden-crimson sparks at F07..F10 (Step A contact) and F22..F25 (Step B contact)
        if 7 <= f <= 10:
            k_sp = f - 7
            for sp_i in range(3):
                sx_p = min(47, 34 + sp_i * 2 + k_sp)
                sy_p = max(41, 45 - ((sp_i + k_sp) % 3))
                set_px(frame, sx_p, sy_p, GOLD_WHITE if sp_i == 0 else (RUBY_CORE if sp_i == 1 else AMBER_FLAME))
        elif 22 <= f <= 25:
            k_sp = f - 22
            for sp_i in range(3):
                sx_p = max(4, 21 - sp_i * 2 - k_sp)
                sy_p = max(41, 45 - ((sp_i + k_sp) % 3))
                set_px(frame, sx_p, sy_p, GOLD_WHITE if sp_i == 0 else (GOLD_BRIGHT if sp_i == 1 else RUBY_BRIGHT))

        frames.append(frame)
    return frames


def build_row2_auto_attack(tpl):
    """
    Row 2 (`AUTO_ATTACK - Wyvern Lance Sweep & Impaling Thrust`, 30 frames):
    - `F00..F09`: Winds up the Two-Handed Dragon-Lance overhead (`-46°` up to `-98°`) with rising dragonfire glow.
    - `F10..F17`: Sweeps & thrusts the Dragon-Lance forward in a wide `115°` arc (`-98°` to `+16°`) with a blazing
      3-band **White-Gold, Amber-Flame & Crimson-Rose Dragonfire Lance Trail** and impaling thrust sparks!
    - `F18..F29`: Smooth two-handed recovery (`+16°` back to `-46°`).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 9:
            u = f / 9.0
            base = tpl["stand"].copy()
            base = apply_hair_and_cape_wave(base, phase, amplitude=1.6, vertical_flutter=0.6, rune_pulse=0.65 + u * 0.35)
            ang = -46.0 * (1.0 - u) + (-98.0) * u
            hx = int(round(32 * (1.0 - u) + 34 * u))
            hy = int(round(23 * (1.0 - u) + 18 * u))
            frame = draw_two_handed_dragon_lance(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=0.95 + u * 0.4,
                scale=1.02,
                shoulder_rear=(21, 18),
                shoulder_lead=(27, 19),
                phase=phase,
            )
            frames.append(frame)

        elif f <= 17:
            k = f - 10  # 0..7
            base = (tpl["lunge"] if k >= 1 else tpl["stand"]).copy()
            base = apply_hair_and_cape_wave(base, phase * 2.0, amplitude=2.0, vertical_flutter=0.8, rune_pulse=1.0)

            ang_seq = [-64.0, -22.0, 4.0, 16.0, 16.0, 12.0, 6.0, -4.0]
            hx_seq = [34, 35, 36, 36, 36, 35, 34, 33]
            hy_seq = [19, 20, 22, 23, 23, 23, 22, 22]

            cleave_arc = None
            if k <= 5:
                arc_int = [0.85, 1.0, 1.0, 0.95, 0.78, 0.55][k]
                a0 = [-98.0, -78.0, -46.0, -18.0, -6.0, 0.0][k]
                cleave_arc = (a0, ang_seq[k] + 3.0, 18.0, arc_int)

            frame = draw_two_handed_dragon_lance(
                base,
                hand_x=hx_seq[k],
                hand_y=hy_seq[k],
                angle_deg=ang_seq[k],
                glow_intensity=1.4 if k <= 5 else 1.1,
                scale=1.04,
                shoulder_rear=(22 if k >= 1 else 21, 18),
                shoulder_lead=(28 if k >= 1 else 27, 19),
                cleave_arc=cleave_arc,
                phase=phase,
            )

            # Blazing impaling thrust burst at spearhead apex on F12..F15 (k=2..5)
            if 2 <= k <= 5:
                for sp in range(5):
                    sx_p = min(47, 41 + (sp % 3) * 2 + (k % 2))
                    sy_p = max(18, min(44, 24 + (sp - 2) * 3))
                    set_px(frame, sx_p, sy_p, GOLD_WHITE if sp == 2 else (RUBY_CORE if sp % 2 == 0 else AMBER_FLAME))
            frames.append(frame)

        else:
            u = (f - 18) / 11.0
            base = (tpl["lunge"] if f <= 20 else tpl["stand"]).copy()
            base = apply_hair_and_cape_wave(base, phase, amplitude=1.5, vertical_flutter=0.5, rune_pulse=0.85 - u * 0.25)
            ang = -4.0 * (1.0 - u) + (-46.0) * u
            hx = int(round(33 * (1.0 - u) + 32 * u))
            hy = int(round(22 * (1.0 - u) + 23 * u))
            frame = draw_two_handed_dragon_lance(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.05 - u * 0.15,
                scale=1.0,
                shoulder_rear=(21, 18),
                shoulder_lead=(27, 19),
                phase=phase,
            )
            frames.append(frame)
    return frames


def draw_floating_valhalla_crest(canvas, f, phase):
    """
    Row 3 helper (F01..F12): Conjures a Floating Golden-Crimson Valhalla Valkyrie Crest
    above Freyja's winged helm (`x = 18..34, y = 3..9`).
    """
    su = min(1.0, f / 8.0)
    cx, cy = 26, 6
    span = int(round(3 + 4 * su))  # reaches x = 19..33

    # Central Golden-Ruby Valkyrie Diamond Star
    set_px(canvas, cx, cy, GOLD_WHITE)
    set_px(canvas, cx, max(3, cy - 1), GOLD_BRIGHT)
    set_px(canvas, cx, min(9, cy + 1), RUBY_CORE)
    set_px(canvas, cx - 1, cy, GOLD_BRIGHT)
    set_px(canvas, cx + 1, cy, GOLD_BRIGHT)

    # Sweeping Golden-Crimson Valkyrie Crest Wings
    for side in (-1, 1):
        for d in range(2, span + 1):
            wx = cx + side * d
            wy = max(3, cy - (d // 3) + int(round(math.sin(phase * 2.0 + d) * 0.4)))
            set_px(canvas, wx, wy, GOLD_WHITE if d == span else (GOLD_BRIGHT if d % 2 == 0 else RUBY_CORE))
            if wy + 1 <= 9 and d <= span - 1:
                set_px(canvas, wx, wy + 1, CRIMSON_BRIGHT if d % 2 == 0 else GOLD_MID)


def draw_valhalla_ground_rune_circle(canvas, f, phase, x_min=12, x_max=44):
    """
    Draws a glowing Golden-Crimson Ground Valhalla Rune Circle at `y = 44..48`.
    """
    cx = (x_min + x_max) * 0.5
    rx = (x_max - x_min) * 0.5
    cy = 46.0
    ry = 1.8
    steps = 36
    for i in range(steps):
        a = (i / float(steps)) * 2.0 * math.pi + phase * 1.6
        px_x = max(4, min(48, int(round(cx + math.cos(a) * rx))))
        px_y = max(44, min(48, int(round(cy + math.sin(a) * ry))))
        if i % 4 == 0:
            col = GOLD_WHITE if (f % 2 == 0) else RUBY_CORE
        elif i % 2 == 0:
            col = GOLD_BRIGHT
        else:
            col = CRIMSON_BRIGHT if (i % 3 == 0) else AMBER_FLAME
        set_px(canvas, px_x, px_y, col)


def draw_dragonfire_ground_spikes(canvas, k):
    """
    Row 3 helper (F13..F22, k = 0..9): Erupts crimson-gold dragonfire ground spikes
    along `x = 28..48, y = 42..48`.
    """
    max_fx = min(48, 33 + k * 3) if k <= 5 else 48
    # Glowing crimson-gold dragonfire fissure bed at y = 45..48, x = 28..max_fx
    for x in range(28, max_fx + 1):
        wave = (x + k) % 3
        set_px(canvas, x, 47, CRIMSON_DARK if x % 2 == 0 else DRAGONFIRE_ORANGE)
        set_px(canvas, x, 46, GOLD_WHITE if wave == 0 else (RUBY_CORE if wave == 1 else GOLD_BRIGHT))
        if (x + k) % 2 == 0:
            set_px(canvas, x, 48, GOLD_MID if wave == 0 else CRIMSON_MID)

    # Erupting Crimson-Gold Dragonfire Ground Spikes (x = 30, 35, 40, 45, y = 42..47)
    for idx, sx_base in enumerate((30, 35, 40, 45)):
        if sx_base <= max_fx:
            spike_h = 4 if (k <= 6 and idx >= 1) else 3
            for dy_s in range(spike_h + 1):
                sy_p = max(42, 46 - dy_s)
                col_s = (
                    GOLD_WHITE
                    if dy_s == spike_h
                    else (GOLD_BRIGHT if dy_s == spike_h - 1 else (RUBY_CORE if dy_s == 1 else CRIMSON_MID))
                )
                set_px(canvas, sx_base, sy_p, col_s)
                if dy_s <= 1 and sx_base + 1 <= 48:
                    set_px(canvas, sx_base + 1, sy_p, AMBER_FLAME if dy_s == 1 else CRIMSON_DARK)


def build_row3_skill(tpl):
    """
    Row 3 (`SKILL - Gungnir Sky-Lance Barrage`, 30 frames):
    - Phase 1 (`F00..F12`): Raises the Two-Handed Dragon-Lance skyward (`-90°`) with a
      **Floating Golden-Crimson Valhalla Valkyrie Crest** above her helm + **Ground Valhalla Rune Circle** (`y = 44..48`).
    - Phase 2 (`F13..F22`): Slams/points the Dragon-Lance forward at `+14°`, erupting crimson-gold
      dragonfire ground spikes (`x = 28..48, y = 42..48`).
    - Phase 3 (`F23..F29`): Smooth two-handed recovery to `-46°`.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 12:
            u = f / 12.0
            base = tpl["stand"].copy()
            base = apply_hair_and_cape_wave(base, phase * 1.5, amplitude=1.6, vertical_flutter=0.6, rune_pulse=0.75 + u * 0.25)
            draw_valhalla_ground_rune_circle(base, f, phase, x_min=14, x_max=40)

            ang = -46.0 * (1.0 - u) + (-90.0) * u
            hx = int(round(32 * (1.0 - u) + 34 * u))
            hy = int(round(23 * (1.0 - u) + 18 * u))
            frame = draw_two_handed_dragon_lance(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.05 + u * 0.35,
                scale=1.0,
                shoulder_rear=(21, 18),
                shoulder_lead=(27, 19),
                phase=phase,
            )
            if f >= 1:
                draw_floating_valhalla_crest(frame, f, phase)
            frames.append(frame)

        elif f <= 22:
            k = f - 13  # 0..9
            base = tpl["lunge"].copy()
            base = apply_hair_and_cape_wave(base, phase * 2.2, amplitude=2.0, vertical_flutter=0.8, rune_pulse=1.0)
            draw_valhalla_ground_rune_circle(base, f, phase, x_min=14, x_max=46)

            ang_seq = [-52.0, -12.0, 10.0, 14.0, 14.0, 14.0, 12.0, 8.0, -2.0, -16.0]
            hx_seq = [34, 35, 36, 36, 36, 36, 35, 35, 34, 33]
            hy_seq = [19, 20, 22, 23, 23, 23, 23, 22, 22, 22]

            cleave_arc = None
            if k <= 4:
                arc_int = [0.85, 1.0, 1.0, 0.85, 0.6][k]
                a0 = [-90.0, -68.0, -35.0, -10.0, 0.0][k]
                cleave_arc = (a0, ang_seq[k] + 3.0, 18.0, arc_int)

            frame = draw_two_handed_dragon_lance(
                base,
                hand_x=hx_seq[k],
                hand_y=hy_seq[k],
                angle_deg=ang_seq[k],
                glow_intensity=1.4 if k <= 6 else 1.1,
                scale=1.02,
                shoulder_rear=(22, 18),
                shoulder_lead=(28, 19),
                cleave_arc=cleave_arc,
                phase=phase,
            )
            draw_dragonfire_ground_spikes(frame, k)
            frames.append(frame)

        else:
            u = (f - 23) / 6.0
            base = (tpl["lunge"] if f <= 24 else tpl["stand"]).copy()
            base = apply_hair_and_cape_wave(base, phase, amplitude=1.5, vertical_flutter=0.5, rune_pulse=0.8 - u * 0.2)
            ang = -16.0 * (1.0 - u) + (-46.0) * u
            frame = draw_two_handed_dragon_lance(
                base,
                hand_x=int(round(33 * (1.0 - u) + 32 * u)),
                hand_y=23,
                angle_deg=ang,
                glow_intensity=1.0,
                scale=1.0,
                shoulder_rear=(21, 18),
                shoulder_lead=(27, 19),
                phase=phase,
            )
            frames.append(frame)
    return frames


def draw_bahamut_dragonfire_geysers(canvas, f):
    """
    Row 4 helper (`F11..F25`): Erupts rising crimson-gold Bahamut dragonfire geysers along the floor
    (`y = 39..48, x = 14..48`) over the blazing Valhalla ground seal (`y = 44..48`).
    """
    is_climax = (f >= 19)
    geyser_xs = [16, 24, 34, 42, 47] if not is_climax else [14, 20, 26, 33, 39, 44, 48]
    for g_idx, gx in enumerate(geyser_xs):
        top_y = max(39, (40 if is_climax else 41) - ((f + g_idx) % 2))
        is_gold = (g_idx % 2 == 0)
        for gy in range(top_y, 48):
            core_c = GOLD_WHITE if is_gold else ROSE_WHITE
            mid_c = GOLD_BRIGHT if is_gold else RUBY_CORE
            edge_c = AMBER_FLAME if is_gold else CRIMSON_BRIGHT
            set_px(canvas, gx, gy, core_c)
            if gx - 1 >= 12:
                set_px(canvas, gx - 1, gy, mid_c if gy <= top_y + 2 else edge_c)
            if gx + 1 <= 48:
                set_px(canvas, gx + 1, gy, mid_c if (gy + f) % 2 == 0 else edge_c)
        set_px(canvas, gx, max(39, top_y - 1), GOLD_WHITE if not is_gold else RUBY_CORE)


def build_row4_ultimate(tpl):
    """
    Row 4 (`ULTIMATE - Valhalla: Bahamut Dragonfire Cataclysm`, 30 frames):
    - Unfurls **4-Pinion Crimson-Gold Valkyrie Dragon-Wings** (`x = 4..18, y = 7..33`) from her back,
      surrounded by a blazing Valhalla ground seal (`y = 44..48`), rising dragonfire geysers (`F11..F25`),
      and a two-handed Gungnir sky-command cleave!
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 9:
            u = f / 9.0
            base = tpl["stand"].copy()
            base = apply_hair_and_cape_wave(base, phase * 2.2, amplitude=1.8, vertical_flutter=0.8, rune_pulse=1.0)
            base = draw_valkyrie_dragon_wings(
                base, attach_xy=(21, 17), wing_span=0.35 + 0.65 * u, flap_phase=phase * 2.0, top_min_y=7, bot_max_y=33
            )
            draw_valhalla_ground_rune_circle(base, f, phase, x_min=10, x_max=46)

            ang = -46.0 * (1.0 - u) + (-98.0) * u
            hx = int(round(32 * (1.0 - u) + 34 * u))
            hy = int(round(23 * (1.0 - u) + 18 * u))
            frame = draw_two_handed_dragon_lance(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.2 + u * 0.3,
                scale=1.04,
                shoulder_rear=(21, 18),
                shoulder_lead=(27, 19),
                phase=phase * 2.0,
            )
            frames.append(frame)

        elif f <= 25:
            k = f - 10  # 0..15
            crouch_d = 2 if (2 <= k <= 6 or 9 <= k <= 13) else 0
            base = make_crouch_valkyrie(tpl, crouch_d) if crouch_d > 0 else tpl["lunge"].copy()
            base = apply_hair_and_cape_wave(base, phase * 3.0, amplitude=2.0, vertical_flutter=0.9, rune_pulse=1.0)
            base = draw_valkyrie_dragon_wings(
                base,
                attach_xy=(21, 17 + crouch_d),
                wing_span=1.0,
                flap_phase=phase * 3.0,
                top_min_y=7,
                bot_max_y=33,
            )
            draw_valhalla_ground_rune_circle(base, f, phase * 1.5, x_min=8, x_max=48)

            ang_table = [
                -68.0, -18.0, 14.0, 24.0, 26.0, 12.0, -45.0, -94.0,
                -42.0, 8.0, 24.0, 28.0, 28.0, 22.0, 12.0, -8.0,
            ]
            ang = ang_table[k]
            hx = 35 if ang > 0 else 34
            hy = (22 if ang > 0 else 18) + crouch_d
            cleave = None
            if k in (1, 2, 3, 4, 8, 9, 10, 11, 12):
                cleave = (-95.0 if k <= 4 else -88.0, ang + 4.0, 18.0, 1.0)

            frame = draw_two_handed_dragon_lance(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.5,
                scale=1.05,
                shoulder_rear=(21, 18 + crouch_d),
                shoulder_lead=(27, 19 + crouch_d),
                cleave_arc=cleave,
                phase=phase * 2.0,
            )
            if f >= 11:
                draw_bahamut_dragonfire_geysers(frame, f)
            frames.append(frame)

        else:
            k = f - 26  # 0..3
            u = (k + 1) / 4.0
            base = tpl["stand"].copy()
            base = apply_hair_and_cape_wave(base, phase, amplitude=1.5, vertical_flutter=0.6, rune_pulse=0.9)
            base = draw_valkyrie_dragon_wings(
                base,
                attach_xy=(21, 17),
                wing_span=max(0.25, 1.0 - u * 0.75),
                flap_phase=phase,
                top_min_y=7,
                bot_max_y=33,
            )
            draw_valhalla_ground_rune_circle(base, f, phase, x_min=14, x_max=42)
            ang = -8.0 * (1.0 - u) + (-46.0) * u
            frame = draw_two_handed_dragon_lance(
                base,
                hand_x=32,
                hand_y=23,
                angle_deg=ang,
                glow_intensity=1.15 - u * 0.2,
                scale=1.0,
                shoulder_rear=(21, 18),
                shoulder_lead=(27, 19),
                phase=phase,
            )
            frames.append(frame)
    return frames


def build_row5_death(tpl):
    """
    Row 5 (`DEATH & HURT`, 30 frames):
    - `F00..F06`: Hurt stagger recoil with crimson-gold hit-sparks.
    - `F07..F17`: Progressive kneeling collapse (`tpl['kneel']`), bracing on her two-handed Dragon-Lance.
    - `F18..F29`: **Grounded horizontal prone collapse** (`y = 33..46`, anchored on the floor at `y = 46`,
      never floating) with the Dragon-Lance resting flat on the floor (`y = 44..46`) and fading golden-crimson feathers.
    """
    frames = []
    for f in range(30):
        if f <= 6:
            u = f / 6.0
            dx = -int(round(math.sin(u * math.pi * 0.85) * 2.0))
            dy = int(round(u * 2.0))
            base = shift_layer(tpl["stand"], dx=dx, dy=dy)
            base = apply_hair_and_cape_wave(base, u * math.pi, amplitude=1.5, vertical_flutter=0.5, rune_pulse=0.4)
            frame = draw_two_handed_dragon_lance(
                base,
                hand_x=max(29, 32 + dx),
                hand_y=23 + dy,
                angle_deg=-46.0 + u * 42.0,
                glow_intensity=0.65,
                scale=1.0,
                shoulder_rear=(21 + dx, 18 + dy),
                shoulder_lead=(27 + dx, 19 + dy),
            )
            # Crimson-gold hit-sparks flying off her dragon breastplate
            for sp in range(4):
                sx_s = min(47, 30 + sp * 2 + f)
                sy_s = max(5, 20 - (sp % 2) * 3 + (f // 2))
                set_px(frame, sx_s, sy_s, GOLD_WHITE if sp == 0 else (RUBY_CORE if sp % 2 == 0 else AMBER_FLAME))
            frames.append(frame)

        elif f <= 17:
            u = (f - 7) / 10.0
            kneel_src = tpl["kneel"].copy()
            extra_drop = 0 if f <= 12 else (f - 12)  # 1..5 on F13..F17
            base = np.zeros((52, 52, 4), dtype=np.uint8)
            for sy in range(8, 46):
                for sx in range(2, 48):
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
            base = apply_hair_and_cape_wave(base, u * math.pi, amplitude=1.0, vertical_flutter=0.3, rune_pulse=flicker)

            frame = draw_two_handed_dragon_lance(
                base,
                hand_x=33,
                hand_y=25 + extra_drop,
                angle_deg=18.0 + u * 20.0,
                glow_intensity=max(0.25, 0.65 * (1.0 - u)),
                scale=0.96,
                shoulder_rear=(21, 22 + extra_drop),
                shoulder_lead=(27, 23 + extra_drop),
            )
            frames.append(frame)

        else:
            # F18..F29: Grounded horizontal prone collapse (y = 33..46, anchored on the floor at y = 46, never floating)
            k = f - 18  # 0..11
            frame = shift_layer(tpl["fall"], dx=0, dy=1)  # anchored firmly at y = 36..46

            # Drape crimson-gold cape & dragon-scale armor smoothly down to y=44..45 so zero gap exists above the floor
            for cx_p in range(10, 32):
                for cy_p in range(41, 45):
                    if frame[cy_p, cx_p, 3] == 0 and (cx_p <= 26 or cy_p <= 43):
                        frame[cy_p, cx_p] = (
                            CAPE_MID if (cx_p + cy_p) % 3 == 0 else (CAPE_DARK if cx_p <= 23 else CRIMSON_DARK)
                        )
            frame = fill_layer_pinholes(frame, x0=6, x1=44, y0=35, y1=47, require_3_neighbors=False)

            # Dragon-Lance resting flat on the floor (y = 44..46, x = 14..45)
            for lx in range(14, 36):
                ring = (lx % 4 == 0)
                set_px(frame, lx, 45, GOLD_BRIGHT if ring else IRON_MID)
                set_px(frame, lx, 46, GOLD_DARK if ring else OBSIDIAN_DARK)
            # Golden Dragon-Wing Crossguard Collar at x = 36..37, y = 44..46
            set_px(frame, 36, 44, GOLD_BRIGHT)
            set_px(frame, 36, 45, GOLD_WHITE)
            set_px(frame, 36, 46, GOLD_MID)
            set_px(frame, 37, 45, RUBY_CORE)
            # 9px Crimson-Ruby & White-Gold Gungnir Spearhead resting flat at x = 37..45, y = 44..46
            for sx_b in range(37, 46):
                set_px(frame, sx_b, 45, GOLD_WHITE if sx_b >= 43 else (GOLD_BRIGHT if sx_b % 2 == 0 else RUBY_CORE))
                if sx_b <= 43:
                    set_px(frame, sx_b, 44, RUBY_BRIGHT if sx_b <= 40 else GOLD_LIGHT)
                    set_px(frame, sx_b, 46, CRIMSON_MID if sx_b <= 40 else GOLD_MID)

            # Fading golden-crimson Valkyrie feathers drifting gently down to y=46 so every frame F18..F29 is unique
            num_feathers = max(1, 5 - (k // 3))
            for f_i in range(num_feathers):
                fx_p = 16 + f_i * 6 + ((k + f_i) % 3)
                fy_p = min(45, 34 + k + f_i * 2)
                set_px(frame, fx_p, fy_p, GOLD_WHITE if (f_i + k) % 2 == 0 else RUBY_CORE)
                set_px(frame, fx_p + 1, fy_p, AMBER_FLAME if f_i % 2 == 0 else CRIMSON_BRIGHT)

            frames.append(frame)

    return frames


def build_row6_dash(tpl):
    """
    Row 6 (`DASH - Wyvern Sky-Charge`, 30 frames):
    - `F00..F02`: Explosive charge windup crouch lowering the Dragon-Lance to couched horizontal level.
    - `F03..F22`: Forward-leaning couched two-handed Dragon-Lance charge (`-12°` to `-4°`) with a
      spiraling **crimson-gold dragonfire drill cone** around the spearhead and trailing
      **crimson-gold slipstream ribbons & valkyrie feathers** (`x = 4..16, y = 14..42`).
    - `F23..F29`: Grounded boot-skid deceleration with golden-crimson sparks returning to `-48°`.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 2:
            u = (f + 1) / 3.0
            crouch_d = [1, 3, 2][f]
            base = make_crouch_valkyrie(tpl, crouch_d)
            base = apply_hair_and_cape_wave(base, phase * 2.0, amplitude=1.6, is_dash=True, rune_pulse=0.85)
            ang = -48.0 * (1.0 - u) + (-12.0) * u
            frame = draw_two_handed_dragon_lance(
                base,
                hand_x=33 + f,
                hand_y=22 + crouch_d,
                angle_deg=ang,
                glow_intensity=1.05 + u * 0.2,
                scale=1.0,
                shoulder_rear=(21, 18 + crouch_d),
                shoulder_lead=(27, 19 + crouch_d),
                drill_cone=(f == 2),
                phase=phase,
            )
            frames.append(frame)

        elif f <= 22:
            k = f - 3  # 0..19
            bob_dy = int(round(math.sin(k * 0.7) * 1.0))
            base = shift_layer(tpl["dash"], dx=0, dy=bob_dy)
            base = apply_hair_and_cape_wave(
                base, k * 0.85, amplitude=1.9, vertical_flutter=0.8, is_dash=True, rune_pulse=1.0
            )

            # Trailing Crimson-Gold Slipstream Ribbons & Valkyrie Feathers (x = 4..16, y = 14..42)
            for r_idx in range(5):
                ry = 15 + r_idx * 6 + ((k + r_idx) % 2)
                rx0 = 4 + ((k * 2 + r_idx * 3) % 7)
                col_rib = GOLD_WHITE if r_idx % 2 == 0 else RUBY_CORE
                col_tail = AMBER_FLAME if r_idx % 2 == 0 else CRIMSON_BRIGHT
                draw_line_px(base, rx0, ry, min(16, rx0 + 5), ry, col_rib)
                set_px(base, max(4, rx0 - 1), max(14, ry - 1), col_tail)
                set_px(base, min(16, rx0 + 2), min(42, ry + 1), GOLD_BRIGHT)

            ang = -8.0 + math.sin(k * 0.65) * 4.0  # strictly in [-12 deg .. -4 deg]
            pump_dx = int(round(math.sin(k * 0.65) * 1.0))
            frame = draw_two_handed_dragon_lance(
                base,
                hand_x=34 + pump_dx,
                hand_y=21 + bob_dy,
                angle_deg=ang,
                glow_intensity=1.35,
                scale=1.0,
                shoulder_rear=(22, 18 + bob_dy),
                shoulder_lead=(28, 19 + bob_dy),
                drill_cone=True,
                phase=k * 0.6,
            )
            frames.append(frame)

        else:
            k = f - 23  # 0..6
            u = k / 6.0
            crouch_d = [3, 3, 2, 2, 1, 1, 0][k]
            base = make_crouch_valkyrie(tpl, crouch_d) if crouch_d > 0 else tpl["stand"].copy()
            base = apply_hair_and_cape_wave(base, phase, amplitude=1.5, vertical_flutter=0.5, rune_pulse=0.85 - u * 0.2)
            ang = -8.0 * (1.0 - u) + (-48.0) * u
            frame = draw_two_handed_dragon_lance(
                base,
                hand_x=int(round(34 * (1.0 - u) + 33 * u)),
                hand_y=22 + crouch_d,
                angle_deg=ang,
                glow_intensity=1.1 - u * 0.15,
                scale=1.0,
                shoulder_rear=(21, 18 + crouch_d),
                shoulder_lead=(27, 19 + crouch_d),
                phase=phase,
            )
            if k <= 3:
                for bx in (22, 34):
                    set_px(frame, min(47, bx + 2 + k), 44, GOLD_WHITE)
                    set_px(frame, min(47, bx + 1 + k), 43, RUBY_CORE)
            frames.append(frame)
    return frames


def draw_dragon_crest_phalanx_greatshield(canvas, f, phase):
    """
    Row 7 helper (`F00..F11`): Renders an ornate **Crimson-and-Gold Dragon-Crest Phalanx Greatshield**
    at `x = 36..42, y = 19..35` (golden winged-dragon emblem on crimson-obsidian shield plate)
    in front of Freyja's lead gauntlet while keeping her crouched Valkyrie body (`x = 5..34`) 100% visible!
    """
    sh = np.zeros((52, 52, 4), dtype=np.uint8)
    y_top = 20 if f == 0 else 19
    y_bot = 34 if f == 0 else 35
    pulse_hi = (f % 2 == 0)

    for y in range(y_top, y_bot + 1):
        is_cap = y in (y_top, y_top + 1, y_bot - 1, y_bot)
        x_lo = 37 if y in (y_top, y_bot) else 36
        x_hi = 41 if y in (y_top, y_bot) else 42
        for x in range(x_lo, x_hi + 1):
            if y in (y_top, y_bot):
                col = GOLD_WHITE if (x == 39 and pulse_hi) else GOLD_BRIGHT
            elif x == 42:
                # Front-facing Golden-Ruby Phalanx Shield Rim
                col = GOLD_WHITE if (25 <= y <= 29 and pulse_hi) else (GOLD_BRIGHT if (y + f) % 2 == 0 else RUBY_CORE)
            elif x == 36:
                col = GOLD_DARK if (y % 3 == 0) else OBSIDIAN_DEEP
            elif x in (37, 41) or is_cap:
                col = GOLD_BRIGHT if (x == 41 or y == y_top + 1) else GOLD_MID
            else:
                # Crimson-Obsidian Shield Plate Interior (x = 38..40, y = 21..33)
                col = CRIMSON_MID if ((x + y) % 2 == 0) else CRIMSON_DARK
            set_px(sh, x, y, col)

    # Golden Winged-Dragon Emblem embossed on the center of the shield plate (x = 38..40, y = 22..32)
    for ry in range(22, 33):
        set_px(sh, 39, ry, GOLD_WHITE if (25 <= ry <= 29 or pulse_hi) else GOLD_BRIGHT)
    # Dragon wings & crest horns at x = 38 and x = 40
    for ry in (23, 25, 27, 29, 31):
        col_w = GOLD_WHITE if (ry == 25 and pulse_hi) else (GOLD_BRIGHT if ry in (25, 27) else RUBY_CORE)
        set_px(sh, 38, ry, col_w)
        set_px(sh, 40, ry, col_w)

    return composite_over(canvas, sh)


def build_row7_crouch(tpl):
    """
    Row 7 (`CROUCH - Dragon-Crest Phalanx Shield & Counter-Thrust`, 30 frames):
    - `F00..F11`: Deep knee-bend crouch (`d = 1..6`) with an ornate **Crimson-and-Gold Dragon-Crest Phalanx
      Greatshield** (`x = 36..42, y = 19..35`, golden winged-dragon emblem on crimson-obsidian shield plate)
      in front of her lead gauntlet.
    - `F12..F19`: Explosive low rising two-handed lance counter-sweep (`+24°` up to `-18°`) with a blazing
      3-band crimson-gold dragonfire trail.
    - `F20..F29`: Smooth rise back to standing stance (`-48°`).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 11:
            depths = [1, 2, 4, 5, 6, 6, 6, 6, 6, 6, 5, 5]
            d = depths[f]
            u = min(1.0, f / 5.0)
            base = make_crouch_valkyrie(tpl, d)
            base = apply_hair_and_cape_wave(
                base, phase * 1.5, amplitude=1.2, vertical_flutter=0.3, rune_pulse=0.8 + 0.2 * math.sin(phase * 2.0)
            )
            ang_seq = [-38.0, -28.0, -18.0, -10.0, -4.0, 0.0, 2.0, 0.0, -2.0, -6.0, -12.0, -18.0]
            hx_seq = [33, 33, 32, 32, 32, 32, 33, 33, 32, 32, 32, 31]
            frame = draw_two_handed_dragon_lance(
                base,
                hand_x=hx_seq[f],
                hand_y=21 + d,
                angle_deg=ang_seq[f],
                glow_intensity=0.95 + u * 0.25,
                scale=1.0,
                shoulder_rear=(21, 18 + d),
                shoulder_lead=(27, 19 + d),
                phase=phase,
            )
            frame = draw_dragon_crest_phalanx_greatshield(frame, f, phase)
            frames.append(frame)

        elif f <= 19:
            k = f - 12  # 0..7
            d = [5, 5, 4, 4, 4, 5, 5, 5][k]
            base = make_crouch_valkyrie(tpl, d)
            base = apply_hair_and_cape_wave(base, phase * 2.0, amplitude=1.6, vertical_flutter=0.5, rune_pulse=1.0)

            ang_seq = [24.0, 12.0, -2.0, -14.0, -18.0, -14.0, -8.0, -4.0]
            hx_seq = [35, 36, 36, 36, 35, 35, 34, 34]
            hy_off = [22, 21, 20, 19, 19, 20, 21, 21]

            cleave_arc = None
            if k <= 5:
                arc_int = [0.85, 1.0, 1.0, 0.9, 0.75, 0.55][k]
                a0 = [32.0, 26.0, 18.0, 8.0, 0.0, -6.0][k]
                cleave_arc = (a0, ang_seq[k] - 4.0, 17.5, arc_int)

            frame = draw_two_handed_dragon_lance(
                base,
                hand_x=hx_seq[k],
                hand_y=hy_off[k] + d,
                angle_deg=ang_seq[k],
                glow_intensity=1.35 if k <= 5 else 1.1,
                scale=1.02,
                shoulder_rear=(21, 18 + d),
                shoulder_lead=(27, 19 + d),
                cleave_arc=cleave_arc,
                phase=phase,
            )
            frames.append(frame)

        else:
            depths = [5, 4, 4, 3, 3, 2, 2, 1, 1, 0]
            k = f - 20
            d = depths[k]
            u = k / 9.0
            base = make_crouch_valkyrie(tpl, d) if d > 0 else tpl["stand"].copy()
            base = apply_hair_and_cape_wave(base, phase, amplitude=1.4, vertical_flutter=0.5, rune_pulse=0.75 - u * 0.2)
            ang = -4.0 * (1.0 - u) + (-48.0) * u
            frame = draw_two_handed_dragon_lance(
                base,
                hand_x=33,
                hand_y=22 + d,
                angle_deg=ang,
                glow_intensity=0.95,
                scale=1.0,
                shoulder_rear=(21, 18 + d),
                shoulder_lead=(27, 19 + d),
                phase=phase,
            )
            frames.append(frame)
    return frames


def build_row8_jump(tpl):
    """
    Row 8 (`JUMP - Dragoon High-Jump & Sky-Dive Impact`, 30 frames):
    - `F00..F03`: Takeoff crouch (`d = 2..5`).
    - `F04..F11`: Ascending Dragoon vault with **unfurling Crimson-Gold Valkyrie Dragon-Wings**
      (`x = 4..18, y = 8..32`, `F04..F19`).
    - `F12..F18`: Apex mid-air two-handed downward diagonal **Dragoon Sky-Dive Lance Thrust**
      (`+28°` to `+48°`, `F12..F18`) with a blazing crimson-gold dive cone & slash trail!
    - `F19..F24`: Controlled winged descent & landing impact with crimson-gold shockwave sparks.
    - `F25..F29`: Grounded landing recovery to standing stance (`-48°`).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 3:
            crouch_seq = [2, 4, 5, 3]
            d = crouch_seq[f]
            u = f / 3.0
            body = make_crouch_valkyrie(tpl, d)
            body = apply_hair_and_cape_wave(body, phase * 2.0, amplitude=1.5, vertical_flutter=0.6, rune_pulse=0.85)
            ang = -46.0 - u * 32.0
            frame = draw_two_handed_dragon_lance(
                body,
                hand_x=33,
                hand_y=21 + d,
                angle_deg=ang,
                glow_intensity=1.0 + u * 0.2,
                scale=1.0,
                shoulder_rear=(21, 18 + d),
                shoulder_lead=(27, 19 + d),
                phase=phase,
            )
            frames.append(frame)

        elif f <= 11:
            k = f - 4  # 0..7
            u = k / 7.0
            jump_dy = -1 if k >= 2 else 0
            body = make_aerial_valkyrie(
                tpl,
                jump_dy=jump_dy,
                body_tilt_deg=-6.0 * (1.0 - u) + 6.0 * u,
                leg_tuck=0.45 + 0.4 * u,
                wing_span=0.45 + 0.55 * u,
                phase=phase * 2.0,
            )
            ang = -78.0 - u * 18.0
            frame = draw_two_handed_dragon_lance(
                body,
                hand_x=34,
                hand_y=18 + jump_dy,
                angle_deg=ang,
                glow_intensity=1.25,
                scale=1.0,
                shoulder_rear=(21, 18 + jump_dy),
                shoulder_lead=(27, 19 + jump_dy),
                phase=phase * 2.0,
            )
            frames.append(frame)

        elif f <= 18:
            # F12..F18: Apex mid-air two-handed downward diagonal Dragoon Sky-Dive Lance Thrust (+28 deg to +48 deg)
            k = f - 12  # 0..6
            u = k / 6.0
            jump_dy = -1 if k <= 3 else 0
            body = make_aerial_valkyrie(
                tpl,
                jump_dy=jump_dy,
                body_tilt_deg=12.0,
                leg_tuck=0.8 - 0.3 * u,
                wing_span=1.0,
                phase=phase * 2.5,
            )
            ang_seq = [28.0, 36.0, 44.0, 48.0, 46.0, 40.0, 32.0]
            hx_seq = [34, 35, 35, 35, 35, 34, 34]
            hy_seq = [20, 21, 22, 22, 22, 21, 21]
            cleave_arc = (-75.0 + k * 12.0, ang_seq[k] + 4.0, 17.5, 1.0 if k <= 4 else 0.7)

            frame = draw_two_handed_dragon_lance(
                body,
                hand_x=hx_seq[k],
                hand_y=hy_seq[k] + jump_dy,
                angle_deg=ang_seq[k],
                glow_intensity=1.45,
                scale=1.02,
                shoulder_rear=(22, 18 + jump_dy),
                shoulder_lead=(28, 19 + jump_dy),
                cleave_arc=cleave_arc,
                drill_cone=True,
                phase=phase * 2.5,
            )
            frames.append(frame)

        elif f <= 24:
            # F19..F24: Descent (F19 retains unfurled wings) and grounded impact crouch
            k = f - 19  # 0..5
            if k == 0:
                body = make_aerial_valkyrie(
                    tpl, jump_dy=0, body_tilt_deg=8.0, leg_tuck=0.35, wing_span=0.75, phase=phase * 2.0
                )
                frame = draw_two_handed_dragon_lance(
                    body,
                    hand_x=34,
                    hand_y=22,
                    angle_deg=26.0,
                    glow_intensity=1.3,
                    scale=1.0,
                    shoulder_rear=(21, 18),
                    shoulder_lead=(27, 19),
                    drill_cone=True,
                    phase=phase,
                )
            else:
                crouch_d = [4, 5, 5, 4, 3][k - 1]
                body = make_crouch_valkyrie(tpl, crouch_d)
                body = apply_hair_and_cape_wave(body, phase * 2.0, amplitude=1.6, vertical_flutter=0.6, rune_pulse=1.0)
                ang = [22.0, 18.0, 12.0, 4.0, -8.0][k - 1]
                frame = draw_two_handed_dragon_lance(
                    body,
                    hand_x=34,
                    hand_y=22 + crouch_d,
                    angle_deg=ang,
                    glow_intensity=1.25,
                    scale=1.0,
                    shoulder_rear=(21, 18 + crouch_d),
                    shoulder_lead=(27, 19 + crouch_d),
                    phase=phase,
                )
                # Sky-dive landing dragonfire sparks along floor (y=44..46)
                for sx_s in range(16, 46, 5):
                    set_px(
                        frame,
                        min(47, sx_s + (k % 3)),
                        45 - (sx_s % 2),
                        GOLD_WHITE if sx_s % 2 == 0 else RUBY_CORE,
                    )
            frames.append(frame)

        else:
            # F25..F29: Grounded landing recovery
            k = f - 25  # 0..4
            u = (k + 1) / 5.0
            crouch_d = [2, 2, 1, 1, 0][k]
            body = make_crouch_valkyrie(tpl, crouch_d) if crouch_d > 0 else tpl["stand"].copy()
            body = apply_hair_and_cape_wave(body, phase, amplitude=1.4, vertical_flutter=0.5, rune_pulse=0.8 - u * 0.2)
            ang = -8.0 * (1.0 - u) + (-48.0) * u
            frame = draw_two_handed_dragon_lance(
                body,
                hand_x=33,
                hand_y=22 + crouch_d,
                angle_deg=ang,
                glow_intensity=1.05 - u * 0.1,
                scale=1.0,
                shoulder_rear=(21, 18 + crouch_d),
                shoulder_lead=(27, 19 + crouch_d),
                phase=phase,
            )
            frames.append(frame)
    return frames


def main():
    tpl = make_clean_templates()

    rows = [
        ("ROW 0: IDLE (30 FRAMES)", build_row0_idle(tpl)),
        ("ROW 1: WALK - VALKYRIE DRAGOON STRIDE (30 FRAMES)", build_row1_walk(tpl)),
        ("ROW 2: AUTO_ATTACK - WYVERN LANCE SWEEP & THRUST (30 FRAMES)", build_row2_auto_attack(tpl)),
        ("ROW 3: SKILL - GUNGNIR SKY-LANCE BARRAGE (30 FRAMES)", build_row3_skill(tpl)),
        ("ROW 4: ULTIMATE - VALHALLA BAHAMUT CATACLYSM (30 FRAMES)", build_row4_ultimate(tpl)),
        ("ROW 5: DEATH & HURT (30 FRAMES)", build_row5_death(tpl)),
        ("ROW 6: DASH - WYVERN SKY-CHARGE (30 FRAMES)", build_row6_dash(tpl)),
        ("ROW 7: CROUCH - DRAGON-CREST PHALANX SHIELD (30 FRAMES)", build_row7_crouch(tpl)),
        ("ROW 8: JUMP - DRAGOON HIGH-JUMP & SKY-DIVE (30 FRAMES)", build_row8_jump(tpl)),
    ]

    num_rows = len(rows)
    cell_px = 208
    sheet = Image.new("RGBA", (30 * cell_px, num_rows * cell_px), (0, 0, 0, 0))

    top_clips = bot_clips = left_clips = right_clips = 0
    for r_idx, (r_name, r_frames) in enumerate(rows):
        assert len(r_frames) == 30, f"{r_name} has {len(r_frames)} frames instead of 30"
        for c_idx in range(30):
            r_frames[c_idx] = ensure_safe_cell(r_frames[c_idx], margin=2)
            arr_c = r_frames[c_idx]
            if np.any(arr_c[:2, :, 3] > 0):
                top_clips += 1
            if np.any(arr_c[50:, :, 3] > 0):
                bot_clips += 1
            if np.any(arr_c[:, :2, 3] > 0):
                left_clips += 1
            if np.any(arr_c[:, 50:, 3] > 0):
                right_clips += 1
        adj_diffs = sum(1 for i in range(29) if np.any(r_frames[i] != r_frames[i + 1]))
        print(f"{r_name:62s}: 30 frames generated, {adj_diffs}/29 adjacent transitions distinct")
        for c_idx, arr in enumerate(r_frames):
            cell_im = Image.fromarray(arr, mode="RGBA").resize((cell_px, cell_px), Image.Resampling.NEAREST)
            sheet.paste(cell_im, (c_idx * cell_px, r_idx * cell_px))

    print(f"Boundary clip audit across 270 frames: TOP={top_clips}, BOT={bot_clips}, LEFT={left_clips}, RIGHT={right_clips}")
    out_path = "/home/antigravity/assets/sprites/valkyrie_sheet.png"
    sheet.save(out_path)
    print("Saved:", out_path, sheet.size)

    # Render zoomed-in left (F00..F14) and right (F15..F29) contact sheets in caller artifact directory
    preview_cell = 96
    pad_top = 24
    dbg = Image.new("RGBA", (30 * preview_cell, num_rows * (preview_cell + pad_top)), (15, 20, 30, 255))
    draw = ImageDraw.Draw(dbg)
    for r_idx, (r_name, r_frames) in enumerate(rows):
        y0 = r_idx * (preview_cell + pad_top)
        draw.rectangle([0, y0, 30 * preview_cell, y0 + pad_top - 2], fill=(26, 34, 50, 255))
        draw.text((8, y0 + 5), r_name, fill=(251, 113, 133, 255))
        for c_idx, arr in enumerate(r_frames):
            x0 = c_idx * preview_cell
            draw.text((x0 + 4, y0 + 13), f"F{c_idx:02d}", fill=(251, 191, 36, 255))
            p_im = Image.fromarray(arr, mode="RGBA").resize((preview_cell, preview_cell), Image.Resampling.NEAREST)
            dbg.paste(p_im, (x0, y0 + pad_top), p_im)
            draw.rectangle(
                [x0, y0 + pad_top, x0 + preview_cell - 1, y0 + pad_top + preview_cell - 1],
                outline=(35, 45, 65, 255),
            )

    art_dir = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/4f1fb80f-a88f-4496-9746-b4b9fe84f6d4"
    dbg.crop((0, 0, 15 * preview_cell, dbg.height)).save(f"{art_dir}/debug_valkyrie_30fps_left_F00_F14.png")
    dbg.crop((15 * preview_cell, 0, 30 * preview_cell, dbg.height)).save(f"{art_dir}/debug_valkyrie_30fps_right_F15_F29.png")
    print("Saved debug contact sheets in:", art_dir)


if __name__ == "__main__":
    main()
