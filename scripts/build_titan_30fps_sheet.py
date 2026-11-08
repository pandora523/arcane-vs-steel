#!/usr/bin/env python3
"""
Builds Torgar's (Titan - Runic Mountain-Forger Juggernaut) 30-Frame-Per-Animation HD-2D Sprite Sheet:
- 9 rows x 30 columns = 270 unique frames (6240 x 1872 at 208x208 per cell, 52x52 logical upscaled 4x NEAREST):
  * Row 0: IDLE - SHOULDER-RESTED WORLD-BREAKER MAUL (30 frames)
  * Row 1: WALK - HEAVY JUGGERNAUT MARCH (30 frames)
  * Row 2: AUTO_ATTACK - TECTONIC OVERHEAD EARTH-SHAKER SMASH (30 frames)
  * Row 3: SKILL - MOUNTAIN ANVIL SUMMON & CANNONBALL HOME-RUN SMASH (30 frames)
  * Row 4: ULTIMATE - RAGNAROK: WORLD-FORGE ERUPTION (30 frames)
  * Row 5: DEATH & HURT (30 frames)
  * Row 6: DASH - MOLTEN JUGGERNAUT STAMPEDE (30 frames)
  * Row 7: CROUCH - MAGMA ARMOR FORTIFY / IRON-ANVIL BULWARK (30 frames)
  * Row 8: JUMP - TECTONIC BELLY-CRUSH DUNK (30 frames)
- Stocky Horned Dwarven/Giant Runic Mountain-Forger Juggernaut silhouette:
  * Short Heavy Fur-Trimmed Forge-Mantle (y = 14..29) — long lower-left trailing cape trimmed!
  * Glowing Molten Runic Forge-Brazier & Anvil-Pack on Upper Back (x = 11..18, y = 13..25) with rising golden-jade embers!
  * Twin Curved Bull-Horns (y = 6..13) and Thick Braided Copper-Orange Dwarven Beard (x = 24..31, y = 15..26)!
"""

from collections import deque
import math
import numpy as np
from PIL import Image, ImageDraw

# Palette matching Torgar's HD-2D Runic Mountain-Forger Juggernaut aesthetic
OBSIDIAN_DEEP = (15, 23, 42, 255)
OBSIDIAN_DARK = (30, 41, 59, 255)
OBSIDIAN_MID = (51, 65, 85, 255)
OBSIDIAN_LIGHT = (71, 85, 105, 255)
IRON_DARK = (51, 65, 85, 255)
IRON_MID = (71, 85, 105, 255)
IRON_LIGHT = (148, 163, 184, 255)

BRONZE_SHADOW = (120, 53, 15, 255)
BRONZE_DARK = (120, 53, 15, 255)
BRONZE_MID = (180, 83, 9, 255)
BRONZE_BRIGHT = (217, 119, 6, 255)
COPPER_BEARD_DARK = (154, 52, 18, 255)
COPPER_BEARD_MID = (194, 65, 12, 255)
COPPER_BEARD_HI = (234, 88, 12, 255)
COPPER_BEARD_GOLD = (245, 158, 11, 255)

GOLD_WHITE = (254, 240, 138, 255)   # #fef08a
GOLD_MOLTEN = (251, 191, 36, 255)   # #fbbf24
LAVA_GOLD = (251, 191, 36, 255)
AMBER_FLAME = (245, 158, 11, 255)
MAGMA_ORANGE = (249, 115, 22, 255)
LAVA_ORANGE = (249, 115, 22, 255)
MAGMA_RED = (220, 38, 38, 255)

JADE_WHITE = (209, 250, 229, 255)
JADE_LIGHT = (110, 231, 183, 255)   # #6ee7b7
JADE_BRIGHT = (16, 185, 129, 255)   # #10b981
JADE_DEEP = (4, 120, 87, 255)

MANTLE_CHARCOAL = (39, 39, 42, 255)
MANTLE_FUR = (87, 83, 78, 255)
MANTLE_FUR_HI = (120, 113, 108, 255)
MANTLE_CRIMSON_DARK = (127, 29, 29, 255)
MANTLE_CRIMSON_HI = (185, 28, 28, 255)
CAPE_DEEP = (88, 20, 22, 255)
CAPE_DARK = (127, 29, 29, 255)
CAPE_MID = (153, 27, 27, 255)
SKIN_MID = (194, 120, 92, 255)


def set_px(buf, x, y, col):
    ix = int(round(x))
    iy = int(round(y))
    if 1 <= ix <= 50 and 1 <= iy <= 50:
        buf[iy, ix] = col


def draw_line_px(buf, x0, y0, x1, y1, col):
    steps = int(max(abs(x1 - x0), abs(y1 - y0), 1) * 2)
    for i in range(steps + 1):
        t = i / float(steps)
        set_px(buf, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, col)


def add_outline_to_layer(layer):
    """Un-inked clean pixel art pipeline: never dilates black outlines."""
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
    """Shifts a 52x52 layer by (dx, dy) without wrap-around and fills any 1px pinholes."""
    out = np.zeros_like(layer)
    fdx = int(round(dx))
    fdy = int(round(dy))
    for y in range(52):
        ny = y + fdy
        if 1 <= ny <= 50:
            for x in range(52):
                nx = x + fdx
                if 1 <= nx <= 50 and layer[y, x, 3] > 0:
                    out[ny, nx] = layer[y, x]
    return fill_layer_pinholes(out)


def ensure_safe_cell(cell, margin=2):
    """
    Guarantees zero pixels touch the 52x52 cell border (x=0, x=51, y=0, y=51) and fills
    all 1px interior pinholes across multiple passes so 0/270 pinholes remain.
    """
    lo = max(1, int(margin))
    hi = 51 - lo
    out = fill_layer_pinholes(cell, lo, hi, lo, hi, require_3_neighbors=True)
    out = fill_layer_pinholes(out, lo, hi, lo, hi, require_3_neighbors=True)
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

    # Clear extreme perimeter inside margin so NO pixel ever touches 0 or 51
    out[:lo, :, :] = 0
    out[52 - lo :, :, :] = 0
    out[:, :lo, :] = 0
    out[:, 52 - lo :, :] = 0

    # Final pass to guarantee zero 4-neighbor interior pinholes remain anywhere in [2..49]
    for _ in range(3):
        alpha = out[:, :, 3] > 0
        changed = False
        for y in range(2, 50):
            for x in range(2, 50):
                if not alpha[y, x] and alpha[y - 1, x] and alpha[y + 1, x] and alpha[y, x - 1] and alpha[y, x + 1]:
                    out[y, x] = out[y - 1, x]
                    alpha[y, x] = True
                    changed = True
        if not changed:
            break

    return out


def composite_over(base, over):
    res = base.copy()
    mask = over[:, :, 3] > 0
    res[mask] = over[mask]
    return res


def paint_juggernaut_horns_beard_and_brazier(
    buf,
    dy_off=0,
    dx_off=0,
    furnace_pulse=0.7,
    beard_sway_dx=0,
    include_brazier=True,
    include_horns=True,
    include_beard=True,
):
    """
    Sculpts Torgar's unmistakable Stocky Horned Dwarven/Giant Runic Mountain-Forger Juggernaut features:
    1. Short Heavy Fur-Trimmed Forge-Mantle (y = 14..29, x = 7..14) — no long lower-left trailing cape!
    2. Glowing Molten Runic Forge-Brazier & Anvil-Pack on Torgar's Upper Back (x = 11..18, y = 13..25)
    3. Twin Curved Bull-Horns (y = 6..13, x = 20..34) & Glowing Amber-Gold Forge Eyes (y = 13..14, x = 26..30)
    4. Thick Braided Copper-Orange Dwarven Beard (x = 24..31, y = 15..26) with warm copper/molten-gold clasps
    """
    if include_brazier:
        # 1. Short Heavy Fur-Trimmed Forge-Mantle (y = 14..29, x = 7..14)
        for y in range(14, 30):
            ny = y + dy_off
            if not (3 <= ny <= 46):
                continue
            x_left = 7 if 17 <= y <= 26 else (8 if y in (15, 16, 27, 28) else 9)
            for x in range(x_left, 14):
                nx = x + dx_off
                if not (3 <= nx <= 48):
                    continue
                if y <= 17:
                    col = MANTLE_FUR_HI if (x + y) % 2 == 0 else MANTLE_FUR
                elif y >= 27:
                    col = BRONZE_MID if (y == 28 and x % 2 == 0) else (MANTLE_FUR if y == 27 else MANTLE_CHARCOAL)
                elif x == x_left:
                    col = MANTLE_CHARCOAL if y % 2 == 0 else MANTLE_FUR
                else:
                    col = CAPE_DARK if (x + y) % 2 == 0 else CAPE_DEEP
                set_px(buf, nx, ny, col)

        # 2. Glowing Molten Runic Forge-Brazier & Anvil-Pack on Upper Back (x = 11..18, y = 13..25)
        for y in range(13, 26):
            ny = y + dy_off
            if not (3 <= ny <= 46):
                continue
            for x in range(11, 19):
                nx = x + dx_off
                if not (3 <= nx <= 48):
                    continue
                if y == 13:
                    if 13 <= x <= 16:
                        col = GOLD_WHITE if (furnace_pulse > 0.65 and x in (14, 15)) else GOLD_MOLTEN
                    else:
                        col = BRONZE_BRIGHT
                elif y == 14:
                    if 13 <= x <= 16:
                        col = GOLD_MOLTEN if (x + int(round(furnace_pulse * 4))) % 2 == 0 else MAGMA_ORANGE
                    else:
                        col = BRONZE_MID if x in (11, 18) else IRON_LIGHT
                elif y in (15, 22, 25):
                    col = BRONZE_BRIGHT if x in (12, 15, 17) else (OBSIDIAN_DEEP if x in (11, 18) else BRONZE_MID)
                elif 16 <= y <= 21:
                    if x in (11, 18):
                        col = OBSIDIAN_DEEP
                    elif x in (12, 17):
                        col = BRONZE_MID if y % 2 == 0 else IRON_DARK
                    elif x in (14, 15):
                        if y in (17, 19):
                            col = JADE_LIGHT if furnace_pulse > 0.6 else JADE_BRIGHT
                        else:
                            col = GOLD_WHITE if (furnace_pulse > 0.75 and y == 18) else (GOLD_MOLTEN if y % 2 == 0 else MAGMA_ORANGE)
                    else:
                        col = MAGMA_ORANGE if y % 2 == 0 else OBSIDIAN_DARK
                else:
                    col = BRONZE_MID if x in (12, 17) else (GOLD_MOLTEN if (y == 23 and x == 14) else OBSIDIAN_DARK)
                set_px(buf, nx, ny, col)

    if include_horns:
        # 3. Twin Curved Bull-Horns (y = 6..13) & Molten-Gold Runic Helm Brow
        rear_horn_pts = [
            (24, 12, BRONZE_DARK), (23, 12, BRONZE_MID),
            (23, 11, BRONZE_MID), (22, 11, BRONZE_BRIGHT),
            (22, 10, BRONZE_BRIGHT), (21, 10, BRONZE_MID),
            (21, 9, GOLD_MOLTEN), (20, 9, BRONZE_BRIGHT),
            (20, 8, GOLD_MOLTEN), (21, 8, GOLD_WHITE),
            (20, 7, GOLD_WHITE), (21, 6, GOLD_WHITE),
        ]
        front_horn_pts = [
            (29, 12, BRONZE_MID), (30, 12, BRONZE_BRIGHT),
            (30, 11, BRONZE_BRIGHT), (31, 11, BRONZE_MID),
            (31, 10, BRONZE_BRIGHT), (32, 10, GOLD_MOLTEN),
            (32, 9, GOLD_MOLTEN), (33, 9, BRONZE_BRIGHT),
            (33, 8, GOLD_MOLTEN), (34, 8, GOLD_WHITE),
            (34, 7, GOLD_WHITE), (33, 6, GOLD_WHITE),
        ]
        for hx_p, hy_p, hcol in rear_horn_pts + front_horn_pts:
            set_px(buf, hx_p + dx_off, hy_p + dy_off, hcol)

        for x in range(24, 30):
            set_px(buf, x + dx_off, 10 + dy_off, BRONZE_BRIGHT if x in (25, 26, 27) else OBSIDIAN_MID)
            set_px(buf, x + dx_off, 11 + dy_off, GOLD_MOLTEN if x == 26 else BRONZE_MID)
            set_px(buf, x + dx_off, 12 + dy_off, OBSIDIAN_DARK if x not in (26, 27) else BRONZE_BRIGHT)
        eye_hi = GOLD_WHITE if furnace_pulse > 0.65 else GOLD_MOLTEN
        eye_lo = GOLD_MOLTEN if furnace_pulse > 0.5 else AMBER_FLAME
        set_px(buf, 26 + dx_off, 13 + dy_off, eye_hi)
        set_px(buf, 27 + dx_off, 13 + dy_off, eye_lo)
        set_px(buf, 29 + dx_off, 13 + dy_off, eye_hi)
        set_px(buf, 30 + dx_off, 13 + dy_off, eye_lo)
        set_px(buf, 27 + dx_off, 14 + dy_off, AMBER_FLAME)
        set_px(buf, 29 + dx_off, 14 + dy_off, AMBER_FLAME)

    if include_beard:
        # 4. Thick Braided Copper-Orange Dwarven Beard (x = 24..31, y = 15..26)
        for y in range(15, 27):
            ny = y + dy_off
            if not (3 <= ny <= 46):
                continue
            sway = beard_sway_dx if y >= 21 else 0
            if y <= 22:
                x0, x1 = 24, 31
            else:
                x0, x1 = 25, 30
            for x in range(x0, x1 + 1):
                if y == 25 and x == 27:
                    continue
                if y == 26 and x not in (26, 29):
                    continue
                nx = x + dx_off + sway
                if not (3 <= nx <= 48):
                    continue
                if y == 15:
                    col = GOLD_MOLTEN if x in (26, 29) else (COPPER_BEARD_HI if x in (25, 27, 28, 30) else COPPER_BEARD_MID)
                elif y in (19, 23) and x in (25, 26, 29, 30):
                    col = GOLD_MOLTEN if x in (26, 29) else BRONZE_BRIGHT
                else:
                    braid_mod = (x + y) % 3
                    if x in (x0, x1):
                        col = COPPER_BEARD_DARK
                    elif braid_mod == 0:
                        col = COPPER_BEARD_HI
                    elif braid_mod == 1:
                        col = COPPER_BEARD_GOLD if (y % 2 == 0 and x in (26, 29)) else COPPER_BEARD_MID
                    else:
                        col = COPPER_BEARD_DARK
                set_px(buf, nx, ny, col)


def extract_clean_base_sprite(
    path="/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/4f1fb80f-a88f-4496-9746-b4b9fe84f6d4/titan_v1_base_1794101258946.jpg",
):
    """
    Loads `titan_v1_base_1794101258946.jpg` (1024x1024), strips the white background + 1px anti-aliased fringe,
    scales cleanly into the 52x52 logical cell with Torgar's boots planted firmly at y=45 (y=6..45),
    and transforms his silhouette into an unmistakable Stocky Horned Dwarven/Giant Runic Mountain-Forger Juggernaut:
    - Trims the long lower-left trailing cape (`x < 12, y = 27..42`) into a Short Heavy Fur-Trimmed Forge-Mantle (`y = 14..29`).
    - Mounts a Glowing Molten Runic Forge-Brazier & Anvil-Pack on Torgar's Upper Back (`x = 11..18, y = 13..25`).
    - Accentuates Torgar's Twin Curved Bull-Horns (`y = 6..13`) and Thick Braided Copper-Orange Dwarven Beard (`x = 24..31, y = 15..26`).
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
    scaled = crop.resize((41, 40), Image.Resampling.NEAREST)
    s_arr = np.array(scaled, dtype=np.uint8)

    cell = np.zeros((52, 52, 4), dtype=np.uint8)
    cell[6:46, 4:45] = s_arr

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

    right_boot = cell[38:45, 33:44].copy()
    cell[39:46, 33:44] = right_boot
    cell[38, 33:44] = right_boot[0, :]

    centered = np.zeros_like(cell)
    for y in range(52):
        for x in range(52):
            if cell[y, x, 3] > 0:
                if x >= 31 and y >= 31:
                    nx = x - 7
                elif x < 18:
                    nx = max(3, int(round(3 + (x - 4) * (11.0 / 14.0))))
                else:
                    nx = max(3, x - 5)
                centered[y, nx] = cell[y, x]

    for y in range(30, 33):
        for x in range(30, 33):
            if centered[y, x, 3] == 0:
                centered[y, x] = BRONZE_MID if x == 31 else OBSIDIAN_DARK

    # 1. TRIM the long lower-left trailing cape (x < 12, y = 27..42) completely!
    centered[27:45, :12] = 0
    centered[14:30, :7] = 0

    # Clear lower between-leg pixels at y=38..42, x=19..25 so standing legs separate cleanly below the runic tabard
    centered[38:43, 19:26] = 0

    # 2. Paint Short Heavy Fur-Trimmed Forge-Mantle (y=14..29), Glowing Molten Runic Forge-Brazier & Anvil-Pack (x=11..18, y=13..25),
    #    Twin Curved Bull-Horns (y=6..13), and Thick Braided Copper-Orange Dwarven Beard (x=24..31, y=15..26)
    paint_juggernaut_horns_beard_and_brazier(centered, dy_off=0, dx_off=0, furnace_pulse=0.75)

    return fill_layer_pinholes(centered)


def neutralize_baked_front_arm(tpl_img, max_chest_x=29):
    """
    Neutralizes any static baked arm pixels on Torgar's torso while strictly preserving:
    - Glowing Molten Runic Forge-Brazier & Anvil-Pack (`x = 11..18, y = 13..25`)
    - Twin Curved Bull-Horns (`y = 6..13`) & Glowing Amber-Gold Eyes (`y = 13..14`)
    - Thick Braided Copper-Orange Dwarven Beard (`x = 24..31, y = 15..26`)
    """
    out = tpl_img.copy()
    for y in range(15, 30):
        if y >= 16:
            lim_x = max(31, max_chest_x + 2) if y <= 26 else max_chest_x + 2
            for x in range(lim_x + 1, 51):
                out[y, x] = (0, 0, 0, 0)
        for x in range(19, min(24, max_chest_x + 1)):
            if 16 <= y <= 28 and out[y, x, 3] > 0:
                r, g, b, _ = out[y, x]
                if r > 55 or g > 48 or b > 60:
                    out[y, x] = (
                        BRONZE_SHADOW
                        if (x + y) % 4 == 0
                        else (OBSIDIAN_MID if (x + y) % 2 == 0 else OBSIDIAN_DARK)
                    )
    return out


def make_clean_templates():
    """
    Constructs Torgar's modular anatomical templates from the clean 52x52 Juggernaut base sprite.
    """
    raw = extract_clean_base_sprite()

    stand = neutralize_baked_front_arm(raw, max_chest_x=29)
    stand[28, 32:, :] = 0
    stand[29, 33:, :] = 0
    paint_juggernaut_horns_beard_and_brazier(stand, dy_off=0, dx_off=0, furnace_pulse=0.75)
    stand = fill_layer_pinholes(stand)
    stand_punch = stand.copy()

    leg_back_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_front_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_back_patch[39:47, 10:21] = stand[39:47, 10:21]
    leg_front_patch[39:47, 26:37] = stand[39:47, 26:37]

    stand_upper = np.zeros((52, 52, 4), dtype=np.uint8)
    stand_upper[:36, :] = stand[:36, :]
    stand_upper = fill_layer_pinholes(stand_upper)

    lunge = np.zeros((52, 52, 4), dtype=np.uint8)
    lunge[32:46, :] = stand[32:46, :]
    for y in range(5, 32):
        dx = 2 if y <= 25 else 1
        for x in range(3, 49):
            if stand[y, x, 3] > 0 and x + dx < 50:
                lunge[y, x + dx] = stand[y, x]
    lunge = neutralize_baked_front_arm(lunge, max_chest_x=31)
    paint_juggernaut_horns_beard_and_brazier(lunge, dy_off=0, dx_off=2, furnace_pulse=0.85)
    lunge = fill_layer_pinholes(lunge)

    kneel = np.zeros((52, 52, 4), dtype=np.uint8)
    kneel[38:46, 10:38] = stand[38:46, 10:38]
    for y in range(6, 35):
        ny = y + 6
        if ny < 45:
            for x in range(3, 46):
                if stand[y, x, 3] > 0:
                    kneel[ny, x] = stand[y, x]
    kneel = neutralize_baked_front_arm(kneel, max_chest_x=29)
    paint_juggernaut_horns_beard_and_brazier(kneel, dy_off=6, dx_off=0, furnace_pulse=0.5)
    kneel = fill_layer_pinholes(kneel)

    body_no_cape = stand.copy()
    pil_body = Image.fromarray(body_no_cape, mode="RGBA")
    rot_90 = np.array(
        pil_body.rotate(-88.0, resample=Image.Resampling.NEAREST, center=(24, 30)),
        dtype=np.uint8,
    )
    ys, xs = np.where(rot_90[:, :, 3] > 0)
    fall = np.zeros((52, 52, 4), dtype=np.uint8)
    if len(ys) > 0:
        dy_shift = 45 - int(ys.max())
        dx_shift = 25 - int((xs.min() + xs.max()) // 2)
        for y in range(52):
            for x in range(52):
                if rot_90[y, x, 3] > 0:
                    ny = max(32, min(45, y + dy_shift))
                    nx = max(4, min(48, x + dx_shift))
                    fall[ny, nx] = rot_90[y, x]
    fall = fill_layer_pinholes(fall)

    pil_stand = Image.fromarray(stand, mode="RGBA")
    rot_dash = np.array(
        pil_stand.rotate(-14.0, resample=Image.Resampling.NEAREST, center=(24, 36)),
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
                    nx = max(2, min(49, x))
                    dash[ny, nx] = rot_dash[y, x]
    dash = neutralize_baked_front_arm(dash, max_chest_x=31)
    paint_juggernaut_horns_beard_and_brazier(dash, dy_off=1, dx_off=2, furnace_pulse=0.95)
    dash = fill_layer_pinholes(dash)

    return {
        "stand": stand,
        "stand_punch": stand_punch,
        "stand_upper": stand_upper,
        "leg_near": leg_back_patch,
        "leg_far": leg_front_patch,
        "leg_back": leg_back_patch,
        "leg_front": leg_front_patch,
        "lunge": lunge,
        "kneel": kneel,
        "fall": fall,
        "dash": dash,
    }


def apply_mantle_and_beard_sway(frame, phase_rad, amplitude=1.5, vertical_flutter=0.6, is_dash=False, furnace_pulse=0.5):
    """
    Animates Torgar's:
    - Short Heavy Fur-Trimmed Forge-Mantle (`x = 6..14, y = 14..29`) — trims any stray cape pixels below y=29 on x < 12!
    - Glowing Molten Runic Forge-Brazier & Anvil-Pack (`x = 11..18, y = 13..25`) with rising golden-jade forge embers!
    - Twin Curved Bull-Horns (`y = 6..13`), Pulsing Amber-Gold Eyes, and Thick Braided Copper-Orange Dwarven Beard (`x = 24..31, y = 15..26`)!
    """
    out = frame.copy()

    # Strictly ensure no lower-left trailing cape exists at x < 12, y = 30..42
    out[30:43, :12] = 0

    # 1. Short Heavy Fur-Trimmed Forge-Mantle wave (left side x = 5..11, y = 14..29)
    cape_mask = np.zeros((52, 52), dtype=bool)
    for y in range(14, 30):
        for x in range(5, 12):
            if out[y, x, 3] > 0:
                cape_mask[y, x] = True

    cape_src = out.copy()
    out[cape_mask] = 0

    for y in range(14, 30):
        u = (y - 14) / 16.0
        if is_dash:
            wave_x = -1.2 * u + math.sin(phase_rad * 2.0 - u * 3.0) * (amplitude * 0.7 * u)
            wave_y = -1.0 * u + math.cos(phase_rad * 2.0 - u * 2.5) * (vertical_flutter * 0.6 * u)
        else:
            wave_x = math.sin(phase_rad - u * 2.8) * (amplitude * 0.65 * (0.2 + 0.8 * u))
            wave_y = math.cos(phase_rad - u * 2.2) * (vertical_flutter * 0.6 * u)
        dx = int(round(wave_x))
        dy = int(round(wave_y))
        for x in range(5, 12):
            if not cape_mask[y, x]:
                continue
            nx = max(4, min(13, x + dx))
            ny = max(13, min(29, y + dy))
            out[ny, nx] = cape_src[y, x]
            if dx < 0 and x >= 9 and out[y, x, 3] == 0:
                out[y, x] = cape_src[y, x]

    out = fill_layer_pinholes(out, x0=4, x1=16, y0=12, y1=31, require_3_neighbors=False)

    # 2. Detect vertical head/torso offset
    ys_head, _ = np.where(out[:30, 22:34, 3] > 0)
    dy_est = max(-3, min(7, int(ys_head.min()) - 6)) if len(ys_head) > 0 else 0
    dx_est = 2 if is_dash else 0
    beard_sway = 1 if math.sin(phase_rad) > 0.55 else (0 if math.sin(phase_rad) > -0.55 else -1)
    if is_dash:
        beard_sway = -1

    paint_juggernaut_horns_beard_and_brazier(
        out,
        dy_off=dy_est,
        dx_off=dx_est,
        furnace_pulse=furnace_pulse,
        beard_sway_dx=beard_sway,
    )

    # 3. Rising Golden-Jade Forge Embers drifting upward from the Upper-Back Forge-Brazier (x = 12..17, y = 8..13 + dy_est)
    for e_i in range(3):
        u_e = ((phase_rad / (2.0 * math.pi)) + e_i * 0.33) % 1.0
        ex = int(round(12.5 + e_i * 2.0 + dx_est + math.sin(phase_rad + e_i * 1.7) * 0.8))
        ey = int(round(12.5 + dy_est - u_e * 4.5))
        if 4 <= ex <= 47 and 4 <= ey <= 45:
            col_e = GOLD_WHITE if u_e < 0.35 else (JADE_LIGHT if e_i == 1 else (GOLD_MOLTEN if u_e < 0.7 else MAGMA_ORANGE))
            set_px(out, ex, ey, col_e)

    return fill_layer_pinholes(out)


apply_cape_wave = apply_mantle_and_beard_sway


def solve_ik_elbow(sx, sy, hx, hy, L1=5.8, L2=5.5, bend_side=1.0):
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


def draw_ik_titan_arm(layer, sx, sy, hx, hy, L1=5.8, L2=5.5, bend_side=1.0, is_rear=False):
    """
    Draws Torgar's 2-Bone Inverse Kinematics (IK) Titan Arm extending from shoulder `(sx, sy)`
    to shaft grip `(hx, hy)`.
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
        for off, col in [
            (-1.1, OBSIDIAN_DEEP),
            (-0.5, BRONZE_DARK),
            (0.0, BRONZE_MID),
            (0.5, IRON_MID),
            (1.1, OBSIDIAN_DARK),
        ]:
            draw_line_px(layer, sx + n1x * off, sy + n1y * off, ex + n1x * (off * 0.85), ey + n1y * (off * 0.85), col)

        for off, col in [
            (-1.1, OBSIDIAN_DEEP),
            (-0.5, IRON_DARK),
            (0.0, BRONZE_BRIGHT),
            (0.5, BRONZE_MID),
            (1.1, OBSIDIAN_DARK),
        ]:
            draw_line_px(layer, ex + n2x * off, ey + n2y * off, hx + n2x * (off * 0.85), hy + n2y * (off * 0.85), col)

        for dy_s in (-1, 0, 1):
            for dx_s in (-1, 0, 1):
                set_px(layer, sx + dx_s, sy + dy_s, BRONZE_MID if dy_s <= 0 else OBSIDIAN_MID)
        set_px(layer, ex, ey, GOLD_MOLTEN)
        set_px(layer, ex + n1x * 0.7, ey + n1y * 0.7, BRONZE_BRIGHT)
    else:
        for off, col in [
            (-1.25, OBSIDIAN_DEEP),
            (-0.6, BRONZE_MID),
            (0.0, SKIN_MID),
            (0.6, BRONZE_BRIGHT),
            (1.25, OBSIDIAN_DARK),
        ]:
            draw_line_px(layer, sx + n1x * off, sy + n1y * off, ex + n1x * (off * 0.85), ey + n1y * (off * 0.85), col)

        for off, col in [
            (-1.25, OBSIDIAN_DARK),
            (-0.6, OBSIDIAN_MID),
            (0.0, LAVA_GOLD),
            (0.6, BRONZE_BRIGHT),
            (1.25, BRONZE_MID),
        ]:
            draw_line_px(layer, ex + n2x * off, ey + n2y * off, hx + n2x * (off * 0.85), hy + n2y * (off * 0.85), col)

        for p_step in (-1.6, -0.8, 0.0, 0.8, 1.6):
            for r_step in (-0.6, 0.2, 1.0):
                px_s = sx + ux1 * r_step + n1x * p_step
                py_s = sy + uy1 * r_step + n1y * p_step
                if abs(p_step) >= 1.4 or r_step >= 0.9:
                    col_p = BRONZE_BRIGHT
                elif abs(p_step) >= 0.7:
                    col_p = BRONZE_MID
                else:
                    col_p = OBSIDIAN_MID
                set_px(layer, px_s, py_s, col_p)
        set_px(layer, sx, sy - 1, LAVA_ORANGE)
        set_px(layer, sx + ux1 * 0.7, sy + uy1 * 0.7, LAVA_GOLD)

        set_px(layer, ex, ey, LAVA_GOLD)
        set_px(layer, ex + n1x * 0.8, ey + n1y * 0.8, BRONZE_BRIGHT)
        set_px(layer, ex - n1x * 0.8, ey - n1y * 0.8, OBSIDIAN_DARK)

    for dy_g in (-1, 0, 1):
        for dx_g in (-1, 0, 1):
            if dx_g == 0 and dy_g == -1:
                col_g = LAVA_GOLD
            elif dy_g <= 0:
                col_g = BRONZE_BRIGHT if not is_rear else BRONZE_MID
            else:
                col_g = OBSIDIAN_MID if not is_rear else IRON_DARK
            set_px(layer, hx + dx_g, hy + dy_g, col_g)

    return ex, ey


def draw_2h_warhammer_and_arms(
    canvas,
    hand_x,
    hand_y,
    angle_deg,
    glow_intensity=1.0,
    scale=1.0,
    haft_len=21.0,
    shoulder=(27, 17),
    two_handed=True,
    draw_arm=True,
    cleave_arc=None,
    phase=0.0,
    flat_floor_slam=False,
):
    """
    Renders Torgar's Colossal Rectangular World-Breaker War-Hammer and 2-bone IK arms:
    - Shoulder-Rested World-Breaker Maul (`hand_x = 28, angle_deg = -98°..-105°`): rests the colossal
      rectangular anvil-head clearly behind his shoulder (`x = 14..23, y = 5..12`)!
    - High Overhead Windup (`angle_deg <= -115°`): raises the rectangular anvil-head high behind his horned helm!
    - Flat Ground Slam (`flat_floor_slam=True` or `angle_deg == 22°` with `hand_y >= 24`): slams the colossal
      rectangular anvil-head flat onto the stone floor (`y = 38..45, x = 38..47`)!
    - Floor-Planted Bulwark (`hand_x = 31, hand_y = 26, angle_deg = +68°`): plants the rectangular mallet head
      straight down on the stone floor (`y = 39..45, x = 32..41`)!
    """
    rear_arm_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    hammer_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    rear_gauntlet_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    lead_arm_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    fx_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    is_shoulder_rested = (hand_x <= 29 and -112.0 <= angle_deg <= -88.0)
    is_floor_planted = (angle_deg >= 55.0 and hand_y >= 24)
    is_ground_slam = flat_floor_slam or (18.0 <= angle_deg <= 29.0 and hand_x >= 35 and hand_y >= 24)

    if is_shoulder_rested:
        eff_angle = angle_deg - 24.0   # angles shaft back over shoulder so anvil head sits clearly at x=14..23, y=5..12
    elif is_ground_slam:
        eff_angle = 44.0               # drives shaft down so anvil head slams flat onto the stone floor at y=38..45
    else:
        eff_angle = angle_deg

    rad = math.radians(eff_angle)
    ux, uy = math.cos(rad), math.sin(rad)
    px, py = -uy, ux

    half_strike = 4.6 * scale
    half_thick = 2.9 * scale

    rx = abs(px) * (half_strike + 0.5) + abs(ux) * (half_thick + 1.2) + 0.5
    ry = abs(py) * (half_strike + 0.5) + abs(uy) * (half_thick + 1.2) + 0.5
    min_cx = 3.0 + rx
    max_cx = 48.0 - rx
    min_cy = 3.0 + ry
    max_cy = 46.5 - ry

    grip_sep = 4.8 * min(1.0, scale) if is_shoulder_rested else 5.5 * min(1.0, scale)
    pom_dist = 3.6 * min(1.0, scale)
    head_from_rear = 15.0 * min(1.04, scale) if is_shoulder_rested else 16.0 * min(1.04, scale)

    if is_shoulder_rested:
        mid_gx = float(hand_x - 2.0)
        mid_gy = float(hand_y - 1.0)
    elif is_floor_planted:
        mid_gx = float(hand_x + 0.5)
        mid_gy = float(hand_y)
    elif is_ground_slam:
        mid_gx = float(hand_x - 3.5)
        mid_gy = float(hand_y + 2.5)
    else:
        mid_gx = float(max(25.0, min(33.0, hand_x - 3.0)))
        mid_gy = float(max(13.5, min(33.0, hand_y + 1.0)))

    rear_gx = mid_gx - ux * (grip_sep * 0.5)
    rear_gy = mid_gy - uy * (grip_sep * 0.5)
    lead_gx = mid_gx + ux * (grip_sep * 0.5)
    lead_gy = mid_gy + uy * (grip_sep * 0.5)
    head_cx = rear_gx + ux * head_from_rear
    head_cy = rear_gy + uy * head_from_rear

    dx_fix = 0.0
    if head_cx > max_cx:
        dx_fix = max_cx - head_cx
    elif head_cx < min_cx:
        dx_fix = min_cx - head_cx
    dy_fix = 0.0
    if head_cy > max_cy:
        dy_fix = max_cy - head_cy
    elif head_cy < min_cy:
        dy_fix = min_cy - head_cy

    rear_gx += dx_fix
    rear_gy += dy_fix
    lead_gx += dx_fix
    lead_gy += dy_fix
    head_cx += dx_fix
    head_cy += dy_fix

    pom_x = max(3.0, min(48.0, rear_gx - ux * pom_dist))
    pom_y = max(3.0, min(46.0, rear_gy - uy * pom_dist))
    neck_x = head_cx - ux * (1.8 * scale)
    neck_y = head_cy - uy * (1.8 * scale)

    # 1. Long-Hafted Obsidian-Magma Great-Hammer Shaft
    haft_steps = int(round(math.hypot(neck_x - pom_x, neck_y - pom_y) * 2.6))
    for i in range(haft_steps + 1):
        u_s = i / float(max(1, haft_steps))
        sx_p = pom_x + (neck_x - pom_x) * u_s
        sy_p = pom_y + (neck_y - pom_y) * u_s
        ring_band = (i % 5 == 0)
        magma_vein = (i % 7 == 3)
        c_core = GOLD_MOLTEN if ring_band else (MAGMA_ORANGE if magma_vein else IRON_MID)
        c_edge = BRONZE_BRIGHT if ring_band else BRONZE_MID
        set_px(hammer_layer, sx_p, sy_p, c_core)
        set_px(hammer_layer, sx_p + px * 0.68, sy_p + py * 0.68, c_edge)
        set_px(hammer_layer, sx_p - px * 0.68, sy_p - py * 0.68, OBSIDIAN_DEEP)

    # Heavy Runic Magma-Gold & Jade Pommel Counterweight at (pom_x, pom_y)
    set_px(hammer_layer, pom_x, pom_y, GOLD_MOLTEN)
    set_px(hammer_layer, pom_x + px * 0.7, pom_y + py * 0.7, BRONZE_BRIGHT)
    set_px(hammer_layer, pom_x - px * 0.7, pom_y - py * 0.7, BRONZE_MID)
    set_px(
        hammer_layer,
        max(3.0, min(48.0, pom_x - ux * 0.9)),
        max(3.0, min(46.0, pom_y - uy * 0.9)),
        JADE_BRIGHT,
    )

    # 2. Colossal Rectangular World-Breaker Anvil Hammerhead
    if is_ground_slam:
        # Flat-slammed Colossal Rectangular Hammerhead resting directly on the stone floor (x = 38..47, y = 37..44)
        for py_m in range(37, 45):
            for px_m in range(38, 48):
                if py_m in (37, 44) or px_m in (38, 47):
                    col_m = GOLD_WHITE if (py_m == 44 and px_m in (41, 42, 43)) else (GOLD_MOLTEN if py_m == 44 else BRONZE_BRIGHT)
                elif 41 <= px_m <= 44 and 40 <= py_m <= 41:
                    col_m = JADE_WHITE if px_m in (42, 43) else JADE_LIGHT
                elif (px_m + py_m) % 3 == 0:
                    col_m = GOLD_MOLTEN if glow_intensity >= 1.2 else MAGMA_ORANGE
                else:
                    col_m = OBSIDIAN_DARK
                set_px(hammer_layer, px_m, py_m, col_m)
    elif is_floor_planted:
        # Planted Colossal Rectangular Mallet Head resting straight down on the stone floor (x = 32..41, y = 39..45)
        for py_m in range(39, 46):
            for px_m in range(32, 42):
                if py_m in (39, 45) or px_m in (32, 41):
                    col_m = GOLD_MOLTEN if (py_m == 45 and px_m in (34, 37, 39)) else BRONZE_BRIGHT
                elif px_m in (36, 37) and 41 <= py_m <= 43:
                    col_m = JADE_WHITE if py_m == 42 else JADE_LIGHT
                elif (px_m + py_m) % 3 == 0:
                    col_m = MAGMA_ORANGE
                else:
                    col_m = OBSIDIAN_DARK
                set_px(hammer_layer, px_m, py_m, col_m)
    else:
        s_steps = int(round(half_strike * 4))
        t_steps = int(round(half_thick * 4))
        for si in range(-s_steps, s_steps + 1):
            sp = (si / float(max(1, s_steps))) * half_strike
            for ti in range(-t_steps, t_steps + 1):
                ta = (ti / float(max(1, t_steps))) * half_thick
                if abs(sp) > half_strike - 0.25 and abs(ta) > half_thick - 0.25:
                    continue

                wx = max(3.0, min(48.0, head_cx + px * sp + ux * ta))
                wy = max(3.0, min(46.5, head_cy + py * sp + uy * ta))

                asp = abs(sp) / max(0.1, half_strike)
                ata = abs(ta) / max(0.1, half_thick)

                if asp > 0.80:
                    col = GOLD_WHITE if (glow_intensity >= 1.1 and ata < 0.45) else (GOLD_MOLTEN if ata < 0.60 else BRONZE_BRIGHT)
                elif ata > 0.74:
                    col = BRONZE_BRIGHT if ta > 0 else BRONZE_MID
                elif asp < 0.24 and ata < 0.58:
                    col = JADE_LIGHT if glow_intensity >= 0.85 else JADE_BRIGHT
                elif 0.32 <= asp <= 0.68 and (abs(ta - (abs(sp) - 2.0)) < 0.85 or abs(ta) < 0.40):
                    col = GOLD_WHITE if glow_intensity >= 1.05 else (MAGMA_ORANGE if (si + ti) % 2 == 0 else GOLD_MOLTEN)
                else:
                    col = IRON_DARK if (si + ti) % 3 == 0 else OBSIDIAN_DARK

                set_px(hammer_layer, wx, wy, col)

    # 3. BOTH Rear Armored Gauntlet and Lead Armored Gauntlet
    if draw_arm and shoulder is not None:
        dx_s = float(shoulder[0]) - 27.0
        dy_s = float(shoulder[1]) - 17.0

        sx_rear = float(max(17.0, min(24.0, 20.0 + dx_s)))
        sy_rear = float(max(14.0, min(36.0, 22.0 + dy_s)))
        draw_ik_titan_arm(
            rear_arm_layer,
            sx_rear,
            sy_rear,
            rear_gx,
            rear_gy,
            L1=6.2,
            L2=5.8,
            bend_side=1.0,
            is_rear=True,
        )
        for dy_g in (-1, 0, 1):
            for dx_g in (-1, 0, 1):
                if dx_g == 0 and dy_g == -1:
                    col_rg = LAVA_GOLD
                elif dy_g <= 0:
                    col_rg = BRONZE_BRIGHT
                else:
                    col_rg = BRONZE_MID
                set_px(rear_gauntlet_layer, rear_gx + dx_g, rear_gy + dy_g, col_rg)

        sx_lead = float(max(24.0, min(32.0, 27.0 + dx_s)))
        sy_lead = float(max(14.0, min(36.0, 21.5 + dy_s)))
        draw_ik_titan_arm(
            lead_arm_layer,
            sx_lead,
            sy_lead,
            lead_gx,
            lead_gy,
            L1=6.2,
            L2=5.8,
            bend_side=1.0,
            is_rear=False,
        )
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
    else:
        for gx_p, gy_p in [(rear_gx, rear_gy), (lead_gx, lead_gy)]:
            for dy_g in (-1, 0, 1):
                for dx_g in (-1, 0, 1):
                    set_px(lead_arm_layer, gx_p + dx_g, gy_p + dy_g, BRONZE_BRIGHT if (dx_g == 0 and dy_g == -1) else IRON_MID)

    # 4. Trailing Molten-Gold, Magma-Orange & Emerald-Jade Embers around the anvil head
    if glow_intensity > 0.95:
        num_embers = 5 if glow_intensity >= 1.25 else 3
        for e_i in range(num_embers):
            e_ang = phase + e_i * 2.1
            ex_e = max(4.0, min(47.0, head_cx + math.cos(e_ang) * (4.2 + (e_i % 2) * 1.3)))
            ey_e = max(4.0, min(46.0, head_cy + math.sin(e_ang) * (3.2 + (e_i % 2) * 1.1) - 0.6))
            set_px(fx_layer, ex_e, ey_e, GOLD_WHITE if e_i % 2 == 0 else JADE_LIGHT)
            if glow_intensity >= 1.2:
                set_px(fx_layer, ex_e, max(4.0, ey_e - 1.0), MAGMA_ORANGE if e_i % 2 == 0 else JADE_BRIGHT)

    # 5. Optional Molten-Gold & Emerald-Jade Hammer Cleave Arc
    if cleave_arc is not None:
        a_start, a_end, arc_r, arc_int = cleave_arc
        arc_steps = 44
        piv_x = float(shoulder[0]) if shoulder is not None else 27.0
        piv_y = max(21.0, float(shoulder[1]) + 4.0 if shoulder is not None else 21.0)
        r_uniform = min(float(arc_r), piv_y - 4.5, 47.0 - piv_x, 45.0 - piv_y)
        r_uniform = max(11.5, r_uniform)
        for k in range(arc_steps + 1):
            u_a = k / float(arc_steps)
            ang = math.radians(a_start + (a_end - a_start) * u_a)
            ca, sa = math.cos(ang), math.sin(ang)
            env = math.sin(u_a * math.pi) * arc_int
            if env <= 0.1:
                continue
            ax = max(4.0, min(47.0, piv_x + ca * r_uniform))
            ay = max(4.0, min(45.5, piv_y + sa * r_uniform))
            set_px(fx_layer, ax, ay, GOLD_WHITE if u_a > 0.6 else GOLD_MOLTEN)
            set_px(fx_layer, max(4.0, min(47.0, ax - ca * 1.3)), max(4.0, min(45.5, ay - sa * 1.3)), JADE_LIGHT if (k % 3 == 0) else MAGMA_ORANGE)
            if env > 0.45:
                set_px(fx_layer, max(4.0, min(47.0, ax - ca * 2.5)), max(4.0, min(45.5, ay - sa * 2.5)), JADE_BRIGHT)
                set_px(fx_layer, max(4.0, min(47.0, ax - ca * 3.6)), max(4.0, min(45.5, ay - sa * 3.6)), BRONZE_MID)

    out = composite_over(canvas, rear_arm_layer)
    for yb in range(15, 26):
        for xb in range(25, 32):
            if canvas[yb, xb, 3] > 0:
                out[yb, xb] = canvas[yb, xb]

    out = composite_over(out, hammer_layer)
    if angle_deg < -85.0:
        for yh in range(5, 21):
            for xh in range(25, 35):
                if canvas[yh, xh, 3] > 0:
                    out[yh, xh] = canvas[yh, xh]
    out = composite_over(out, rear_gauntlet_layer)
    out = composite_over(out, lead_arm_layer)
    out = composite_over(out, fx_layer)
    return out


draw_warhammer = draw_2h_warhammer_and_arms
draw_hammer_and_arm = draw_2h_warhammer_and_arms
draw_articulated_greathammer = draw_2h_warhammer_and_arms


def _extract_short_forge_mantle_and_brazier(stand, dy_offset=0, phase=0.0, wave_scale=1.0, lift_y=0):
    """
    Extracts Torgar's Short Heavy Fur-Trimmed Forge-Mantle (`y = 14..29, x = 6..15`)
    and Glowing Molten Runic Forge-Brazier & Anvil-Pack (`x = 11..18, y = 13..25`)
    WITHOUT any long lower-left trailing cape (`y = 30..42` is 100% clear!).
    """
    mantle_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    for y in range(13, 30):
        ny = y + dy_offset
        if not (2 <= ny <= 46):
            continue
        u = max(0.0, (y - 14) / 16.0)
        wave_dx = int(round((-u * 1.0 + math.sin(phase - u * 2.8) * (1.0 * u)) * wave_scale))
        wave_dy = int(round(math.cos(phase - u * 2.2) * (0.4 * u) * wave_scale + u * lift_y))
        for x in range(6, 20):
            if stand[y, x, 3] == 0:
                continue
            if x <= 11:
                cx = max(4, min(14, x + wave_dx))
                cy = max(12, min(29 + max(0, dy_offset), ny + wave_dy))
                mantle_layer[cy, cx] = stand[y, x]
            else:
                mantle_layer[ny, x] = stand[y, x]

    return fill_layer_pinholes(mantle_layer, x0=4, x1=21, y0=10, y1=32, require_3_neighbors=False)


_extract_full_crimson_cape = _extract_short_forge_mantle_and_brazier


def _draw_heavy_plate_leg(
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
    Draws Torgar's 6-7px wide heavy obsidian-and-bronze plate cuisse (thigh), rounded bronze
    knee-guard poleyn, heavy plate greave (shin), and rotated armored sabaton.
    """
    if is_far_leg:
        c_edge = OBSIDIAN_DEEP
        c_dark = OBSIDIAN_DEEP
        c_mid = OBSIDIAN_DARK
        c_hi = OBSIDIAN_MID
        c_trim = BRONZE_DARK
        c_knee_hi = BRONZE_MID
    else:
        c_edge = OBSIDIAN_DEEP
        c_dark = OBSIDIAN_DARK
        c_mid = OBSIDIAN_MID
        c_hi = OBSIDIAN_LIGHT
        c_trim = BRONZE_MID
        c_knee_hi = BRONZE_BRIGHT

    cuisse_strips = [
        (-2.8, c_edge),
        (-2.1, c_dark),
        (-1.3, c_mid),
        (-0.5, c_hi),
        (0.3, c_hi),
        (1.1, c_mid),
        (2.0, c_trim),
        (2.8, c_edge),
    ]
    for off_x, col in cuisse_strips:
        draw_line_px(layer, hip_x + off_x, hip_y, knee_x + off_x * 0.92, knee_y, col)

    mid_tx = (hip_x + knee_x) * 0.5
    mid_ty = (hip_y + knee_y) * 0.5
    draw_line_px(layer, mid_tx - 2.2, mid_ty, mid_tx + 2.2, mid_ty, c_trim)

    greave_strips = [
        (-2.8, c_edge),
        (-2.0, c_dark),
        (-1.2, c_mid),
        (-0.4, c_hi),
        (0.4, c_hi),
        (1.2, c_trim),
        (2.0, c_mid),
        (2.8, c_edge),
    ]
    for off_x, col in greave_strips:
        draw_line_px(layer, knee_x + off_x * 0.92, knee_y, ank_x + off_x * 0.88, ank_y, col)

    pil_boot = Image.fromarray(boot_patch, mode="RGBA")
    rot_boot = np.array(
        pil_boot.rotate(boot_rot_deg, resample=Image.Resampling.NEAREST, center=(orig_cx, 42.5)),
        dtype=np.uint8,
    )
    for y in range(37, 50):
        for x in range(3, 50):
            if rot_boot[y, x, 3] > 0:
                ny = min(45, max(25, y + int(round(dy_boot))))
                nx = min(48, max(3, x + int(round(dx_boot))))
                px_col = rot_boot[y, x].copy()
                if is_far_leg:
                    px_col[0] = int(px_col[0] * 0.78)
                    px_col[1] = int(px_col[1] * 0.78)
                    px_col[2] = int(px_col[2] * 0.82)
                layer[ny, nx] = px_col

    for dy_k in (-1, 0, 1):
        for dx_k in (-2, -1, 0, 1, 2):
            if abs(dx_k) == 2 and abs(dy_k) == 1:
                continue
            if dy_k == -1 or abs(dx_k) == 2:
                col_k = c_knee_hi if (dy_k == -1 and dx_k >= 0) else c_trim
            elif dx_k == 0 and dy_k == 0:
                col_k = GOLD_MOLTEN if not is_far_leg else c_hi
            else:
                col_k = c_hi if dx_k >= 0 else c_mid
            set_px(layer, knee_x + dx_k, knee_y + dy_k, col_k)

    return fill_layer_pinholes(layer, x0=3, x1=49, y0=24, y1=48, require_3_neighbors=False)


def render_walk_juggernaut(tpl, f):
    """
    Row 1 helper (`render_walk_legs`): Anatomical 2-step Heavy Juggernaut March (F00..F14 Step 1, F15..F29 Step 2)
    with Short Fur-Trimmed Forge-Mantle (`y = 14..29`), Upper-Back Forge-Brazier & Anvil-Pack (`x = 11..18, y = 13..25`),
    Twin Curved Bull-Horns, Thick Braided Copper-Orange Beard, and 6-7px wide heavy plate legs!
    """
    phase = (f / 30.0) * 2.0 * math.pi
    bob_y = int(round(math.cos(phase * 2.0) * 1.0))

    stand = tpl["stand"].copy()
    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    girdle_overlay = np.zeros((52, 52, 4), dtype=np.uint8)

    cape_layer = _extract_short_forge_mantle_and_brazier(stand, dy_offset=bob_y, phase=phase, wave_scale=1.0, lift_y=0)

    for y in range(0, 36):
        ny = y + bob_y
        if not (2 <= ny <= 49):
            continue
        min_tx = 11 if y < 29 else 16
        max_tx = 36 if y < 29 else 34
        for x in range(min_tx, max_tx):
            if stand[y, x, 3] > 0:
                torso_layer[ny, x] = stand[y, x]
                if (29 <= y <= 33) or (29 <= y <= 35 and 19 <= x <= 25):
                    girdle_overlay[ny, x] = stand[y, x]

    def build_striding_leg(boot_patch, orig_cx, hip_x, foot_base_x, swing_phase, is_far_leg=False):
        layer = np.zeros((52, 52, 4), dtype=np.uint8)
        s_val = math.sin(swing_phase)
        c_val = math.cos(swing_phase)

        knee_lift = max(0.0, c_val)
        hip_y = 33.0 + bob_y
        knee_x = hip_x + s_val * 2.6 + knee_lift * 1.2
        knee_y = hip_y + 4.8 - knee_lift * 1.8

        foot_target_x = foot_base_x + s_val * 3.0 - knee_lift * 0.8
        foot_lift_dy = bob_y - int(round(knee_lift * 2.2))
        boot_rot_deg = s_val * 10.0 - knee_lift * 12.0

        dx_boot = foot_target_x - orig_cx
        ank_x = foot_target_x + math.sin(math.radians(boot_rot_deg)) * 0.6
        ank_y = 42.0 + foot_lift_dy

        return _draw_heavy_plate_leg(
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

    far_leg = build_striding_leg(tpl["leg_back"], orig_cx=15.5, hip_x=16.5, foot_base_x=15.5, swing_phase=phase + math.pi, is_far_leg=True)
    near_leg = build_striding_leg(tpl["leg_front"], orig_cx=29.5, hip_x=29.0, foot_base_x=29.5, swing_phase=phase, is_far_leg=False)

    out = composite_over(cape_layer, far_leg)
    out = composite_over(out, torso_layer)
    out = composite_over(out, near_leg)
    out = composite_over(out, girdle_overlay)
    out = apply_mantle_and_beard_sway(out, phase, amplitude=1.4, vertical_flutter=0.5, furnace_pulse=0.75 + 0.2 * math.sin(phase * 2.0))
    return fill_layer_pinholes(out)


render_walk_legs = render_walk_juggernaut


def make_crouch_juggernaut(tpl, crouch_depth):
    """
    Constructs Torgar's deep fortified crouch (`make_crouch_body`) via a continuous vertical
    compression warp on `tpl['stand']`.
    """
    stand = tpl["stand"]
    d = max(0, min(6, int(round(crouch_depth))))
    if d <= 0:
        return stand.copy()

    canvas = np.zeros((52, 52, 4), dtype=np.uint8)

    for ny in range(d, 29 + d):
        sy = ny - d
        if 0 <= sy <= 28 and 1 <= ny <= 49:
            canvas[ny, :] = stand[sy, :]

    span = max(1.0, float(43 - (29 + d)))
    for ny in range(29 + d, 44):
        u = (ny - (29 + d)) / span
        sy = int(round(28.0 + u * 15.0))
        sy = max(28, min(43, sy))
        knee_dx = 1 if (d >= 2 and 0.25 <= u <= 0.75) else 0
        for x in range(2, 50):
            if stand[sy, x, 3] > 0:
                nx = x if x <= 11 else min(49, x + knee_dx)
                canvas[ny, nx] = stand[sy, x]

    for ny in range(44, 50):
        canvas[ny, :] = stand[ny, :]

    canvas[30:43, :12] = 0
    return fill_layer_pinholes(canvas)


make_crouch_body = make_crouch_juggernaut


def make_aerial_juggernaut(tpl, jump_dy, body_tilt_deg=0.0, leg_tuck=0.5, thruster_intensity=0.8, phase=0.0):
    """
    Row 8 helper (`make_jump_body`): Constructs a heavy, low-arcing unstoppable Juggernaut leap posture
    preserving Torgar's Short Forge-Mantle (`y = 14..29`), Upper-Back Brazier & Anvil-Pack (`x = 11..18, y = 13..25`),
    Twin Curved Bull-Horns, Thick Braided Copper-Orange Beard, and 6-7px wide plate legs!
    """
    stand = tpl["stand"].copy()
    dy_i = max(-3, min(4, int(round(jump_dy))))
    t = max(0.0, min(1.0, leg_tuck))

    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    girdle_overlay = np.zeros((52, 52, 4), dtype=np.uint8)

    cape_lift = int(round(-t * 1.2))
    cape_layer = _extract_short_forge_mantle_and_brazier(stand, dy_offset=dy_i, phase=phase, wave_scale=1.1, lift_y=cape_lift)

    lean_dx = 1 if body_tilt_deg > 5.0 else (-1 if body_tilt_deg < -5.0 else 0)
    for y in range(0, 36):
        ny = max(2, min(47, y + dy_i))
        dx = lean_dx if y <= 24 else 0
        min_tx = 11 if y < 29 else 16
        max_tx = 36 if y < 29 else 34
        for x in range(min_tx, max_tx):
            if stand[y, x, 3] > 0:
                nx = max(2, min(48, x + dx))
                torso_layer[ny, nx] = stand[y, x]
                if (29 <= y <= 33) or (29 <= y <= 35 and 19 <= x <= 25):
                    girdle_overlay[ny, nx] = stand[y, x]

    hip_y = 33.0 + dy_i

    def build_aerial_leg(boot_patch, orig_cx, hip_x, knee_dx, knee_dy, foot_dx, foot_dy, boot_rot_deg, is_far_leg=False):
        layer = np.zeros((52, 52, 4), dtype=np.uint8)
        kx = hip_x + knee_dx
        ky = hip_y + knee_dy
        ax = orig_cx + foot_dx
        ay = 42.0 + foot_dy
        return _draw_heavy_plate_leg(
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
        orig_cx=15.5,
        hip_x=16.5,
        knee_dx=-1.0 - 1.0 * t,
        knee_dy=4.5 - 1.8 * t,
        foot_dx=-0.5 - 1.0 * t,
        foot_dy=dy_i - 2.2 * t,
        boot_rot_deg=-10.0 * t,
        is_far_leg=True,
    )
    near_leg = build_aerial_leg(
        tpl["leg_front"],
        orig_cx=29.5,
        hip_x=29.0,
        knee_dx=1.5 + 1.2 * t,
        knee_dy=4.0 - 2.2 * t,
        foot_dx=0.0 + 1.0 * t,
        foot_dy=dy_i - 3.0 * t,
        boot_rot_deg=-14.0 * t,
        is_far_leg=False,
    )

    fx_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    if thruster_intensity > 0.1:
        jet_len = int(round(3.5 * thruster_intensity))
        near_boot_y = max(30, min(44, int(round(44 + dy_i - 3.0 * t))))
        far_boot_y = max(30, min(44, int(round(44 + dy_i - 2.2 * t))))
        for boot_cx, boot_by in [(15, far_boot_y), (30, near_boot_y)]:
            for d in range(1, jet_len + 1):
                jy = boot_by + d
                if jy <= 48:
                    col = GOLD_WHITE if d == 1 else (GOLD_MOLTEN if d <= 2 else (MAGMA_ORANGE if d <= 3 else MAGMA_RED))
                    set_px(fx_layer, boot_cx, jy, col)
                    if d <= 2:
                        set_px(fx_layer, boot_cx - 1, jy, MAGMA_ORANGE)
                        set_px(fx_layer, boot_cx + 1, jy, GOLD_MOLTEN)

    out = composite_over(fx_layer, cape_layer)
    out = composite_over(out, far_leg)
    out = composite_over(out, torso_layer)
    out = composite_over(out, near_leg)
    out = composite_over(out, girdle_overlay)
    out = apply_mantle_and_beard_sway(out, phase, amplitude=1.4, vertical_flutter=0.6, furnace_pulse=0.9)
    return fill_layer_pinholes(out)


make_jump_body = make_aerial_juggernaut


def draw_ragnarok_crown_and_jets(canvas, head_xy=(28, 9), shoulder_xy=(21, 17), intensity=1.0, phase=0.0):
    """
    Row 4 Ultimate helper: Blazing Molten-Gold & Emerald-Jade Runic Crown/Horns and Furnace Back-Jets!
    """
    fx = np.zeros((52, 52, 4), dtype=np.uint8)
    hx, hy = head_xy
    sx, sy = shoulder_xy

    for side in (-1, 1):
        for d in range(1, 7):
            cx_h = max(3.0, min(48.0, hx + side * (3 + d * 0.7)))
            cy_h = max(3.0, min(46.0, hy - d * 0.85 + math.sin(phase + d) * 0.4))
            set_px(fx, cx_h, cy_h, GOLD_WHITE if d >= 5 else (GOLD_MOLTEN if d % 2 == 0 else JADE_LIGHT))
    set_px(fx, hx, max(3, hy - 4), JADE_WHITE)
    set_px(fx, hx - 1, max(4, hy - 3), GOLD_MOLTEN)
    set_px(fx, hx + 1, max(4, hy - 3), GOLD_MOLTEN)
    set_px(fx, hx, max(5, hy - 2), JADE_BRIGHT)

    jet_spans = [-145.0, -130.0, -115.0, -100.0]
    for idx, deg in enumerate(jet_spans):
        ang = math.radians(deg + math.sin(phase * 2.0 + idx) * 4.0)
        max_d = int(round((10.0 - idx * 1.1) * intensity))
        for d in range(2, max_d + 1):
            jx = max(3.0, min(48.0, sx + math.cos(ang) * d))
            jy = max(3.0, min(46.0, sy + math.sin(ang) * d))
            col = GOLD_WHITE if d <= 3 else (GOLD_MOLTEN if d <= 6 else (MAGMA_ORANGE if idx % 2 == 0 else JADE_BRIGHT))
            set_px(fx, jx, jy, col)

    return composite_over(fx, canvas)


def draw_shoulder_hammer_dripping_lava(frame, f, breath_dy=0):
    """
    Row 0 (`IDLE`) & Row 1 (`WALK`) Shoulder-Rested World-Breaker Maul Lava Drips:
    Renders molten lava embers dripping downward from the rectangular anvil-head resting behind
    Torgar's shoulder (`x = 15..22, y = 11..22`) plus glowing embers rising from his back Forge-Brazier!
    """
    phase = (f / 30.0) * 2.0 * math.pi
    for d_idx in range(3):
        u = ((f + d_idx * 10) % 30) / 30.0
        drip_x = int(round(16.0 + d_idx * 2.2 + math.sin(phase + d_idx) * 0.5))
        drip_y = int(round(11.0 + breath_dy + u * 10.5))
        dx_c = max(14, min(23, drip_x))
        dy_c = max(10, min(22, drip_y))
        if u < 0.35:
            col_core = GOLD_WHITE
            col_tail = GOLD_MOLTEN
        elif u < 0.70:
            col_core = GOLD_MOLTEN
            col_tail = MAGMA_ORANGE
        else:
            col_core = MAGMA_ORANGE
            col_tail = MAGMA_RED
        set_px(frame, dx_c, dy_c, col_core)
        if dy_c - 1 >= 9:
            set_px(frame, dx_c, dy_c - 1, col_tail)
        if u < 0.55 and dx_c + 1 <= 23:
            set_px(frame, dx_c + 1, dy_c, JADE_LIGHT if d_idx == 1 else GOLD_MOLTEN)


draw_idle_hammer_forge_sparks = draw_shoulder_hammer_dripping_lava


def draw_walk_seismic_footstep_sparks(frame, f):
    """
    Row 1 (`WALK`) Grounded Heel-Strike Footstep Sparks / Dust Puffs (`F06..F10` & `F21..F25`).
    """
    if 6 <= f <= 10:
        k = f - 6
        cx = 29 + (k % 2)
        pts = [
            (cx, 46, GOLD_WHITE if k <= 1 else AMBER_FLAME),
            (min(34, cx + 1 + (k // 2)), 45, GOLD_MOLTEN if k <= 2 else MAGMA_ORANGE),
            (max(16, cx - 1 - (k // 2)), 45, BRONZE_BRIGHT if k <= 1 else OBSIDIAN_MID),
        ]
        if k <= 3:
            pts.append((min(34, cx + 2), 44, MAGMA_ORANGE if k <= 1 else BRONZE_MID))
        if k <= 1:
            pts.append((cx, 45, GOLD_MOLTEN))
        for px_x, px_y, col in pts:
            if 16 <= px_x <= 34 and 44 <= px_y <= 46:
                set_px(frame, px_x, px_y, col)

    elif 21 <= f <= 25:
        k = f - 21
        cx = 20 + (k % 2)
        pts = [
            (cx, 46, GOLD_WHITE if k <= 1 else AMBER_FLAME),
            (max(16, cx - 1 - (k // 2)), 45, GOLD_MOLTEN if k <= 2 else MAGMA_ORANGE),
            (min(34, cx + 1 + (k // 2)), 45, BRONZE_BRIGHT if k <= 1 else OBSIDIAN_MID),
        ]
        if k <= 3:
            pts.append((max(16, cx - 2), 44, MAGMA_ORANGE if k <= 1 else BRONZE_MID))
        if k <= 1:
            pts.append((cx, 45, GOLD_MOLTEN))
        for px_x, px_y, col in pts:
            if 16 <= px_x <= 34 and 44 <= px_y <= 46:
                set_px(frame, px_x, px_y, col)


def draw_hurt_impact_burst(frame, f):
    """
    Row 5 (`DEATH F01..F05`) Directional Impact Hit-Burst on Initial Hurt Frames.
    """
    if not (1 <= f <= 5):
        return
    k = f - 1
    cx = 29
    cy = 21 + (1 if k >= 3 else 0)

    def set_burst_px(x, y, col):
        if 26 <= x <= 33 and 18 <= y <= 25:
            set_px(frame, x, y, col)

    if k <= 2:
        set_burst_px(cx, cy, GOLD_WHITE if k <= 1 else JADE_WHITE)
        if k == 0:
            for dx_c, dy_c in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                set_burst_px(cx + dx_c, cy + dy_c, GOLD_MOLTEN)

    r_inner = 1 if k <= 2 else 2
    r_outer = min(3, 1 + (k + 1) // 2)
    for idx, (rx, ry) in enumerate(((-1, -1), (1, -1), (-1, 1), (1, 1))):
        for r_step in range(r_inner, r_outer + 1):
            px_x = cx + rx * r_step
            px_y = cy + ry * r_step
            if r_step == r_outer:
                col = GOLD_MOLTEN if (idx + k) % 2 == 0 else JADE_LIGHT
            else:
                col = GOLD_WHITE if k <= 1 else MAGMA_ORANGE
            set_burst_px(px_x, px_y, col)
    if k <= 3:
        set_burst_px(min(33, cx + 2 + (k // 2)), cy, GOLD_WHITE if k <= 1 else MAGMA_ORANGE)


def build_row0_idle(tpl):
    """
    Row 0 (`IDLE` — `SHOULDER-RESTED WORLD-BREAKER MAUL`, 0..29):
    - Instead of holding his hammer at `-48°` like Warrior's sword, Torgar rests his Colossal
      Rectangular World-Breaker War-Hammer heavily over his shoulder (`hand_x = 28, hand_y = 22 + breath_dy,
      angle_deg = -102° + 3° * sin(phase)`) with molten lava embers dripping from the rectangular
      anvil-head behind his shoulder!
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        base = tpl["stand"].copy()

        breath_dy = -1 if 8 <= f <= 20 else 0
        if breath_dy == -1:
            upper = base[6:32, 7:35].copy()
            base[5:31, 7:35] = upper
            base[31, 12:34] = upper[25, 5:27]
            base = fill_layer_pinholes(base)

        pulse = 0.55 + 0.45 * math.sin(phase)
        base = apply_mantle_and_beard_sway(
            base, phase, amplitude=1.4, vertical_flutter=0.5, furnace_pulse=pulse
        )

        hammer_ang = -102.0 + 3.0 * math.sin(phase)
        hx = 28
        hy = 22 + breath_dy
        frame = draw_warhammer(
            base,
            hand_x=hx,
            hand_y=hy,
            angle_deg=hammer_ang,
            glow_intensity=0.95 + 0.35 * math.sin(phase),
            scale=1.02,
            haft_len=21.0,
            shoulder=(27, 17 + breath_dy),
            two_handed=True,
            phase=phase,
        )

        draw_shoulder_hammer_dripping_lava(frame, f, breath_dy=breath_dy)

        frames.append(frame)
    return frames


def build_row1_walk(tpl):
    """
    Row 1 (`WALK` — `HEAVY JUGGERNAUT MARCH`, 30..59):
    - Torgar marches with heavy earth-shaking stomps while carrying his War-Hammer over his shoulder
      (`hand_x = 28, hand_y = 22 + bob_y, angle_deg = -98° + 6° * sin(phase)`), giving him an
      immediately recognizable Juggernaut silhouette!
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        body = render_walk_juggernaut(tpl, f)
        bob_y = int(round(math.cos(phase * 2.0) * 1.0))

        hammer_ang = -98.0 + 6.0 * math.sin(phase)
        hx = 28
        hy = 22 + bob_y

        frame = draw_warhammer(
            body,
            hand_x=hx,
            hand_y=hy,
            angle_deg=hammer_ang,
            glow_intensity=0.95 + 0.25 * math.sin(phase * 2.0),
            scale=1.02,
            haft_len=21.0,
            shoulder=(27, 17 + bob_y),
            two_handed=True,
            phase=phase,
        )
        draw_shoulder_hammer_dripping_lava(frame, f, breath_dy=bob_y)
        draw_walk_seismic_footstep_sparks(frame, f)
        frames.append(frame)
    return frames


def draw_lava_fissure_and_shockwave_ring(canvas, k, max_k=8):
    """
    Row 2 helper (`F14..F22`, k = 0..8): Cracks a Molten Lava Fissure & Tectonic Shockwave Ring
    (`y = 41..46, x = 26..48`) along the stone floor under the flat-slammed War-Hammer!
    """
    u = k / float(max(1, max_k))
    cx_ring = 38.0
    cy_ring = 43.5
    rx_ring = 5.5 + u * 6.0   # expands across x = 26..48
    ry_ring = 1.6 + u * 0.9   # spans y = 41..46

    max_x = min(48, int(round(38 + k * 1.6)))
    min_x = max(26, int(round(32 - k * 1.0)))
    for x in range(min_x, max_x + 1):
        zig = ((x + k) % 3) - 1
        fy = max(41, min(46, 44 + zig))
        set_px(canvas, x, fy, GOLD_WHITE if (k <= 4 and x % 2 == 0) else GOLD_MOLTEN)
        set_px(canvas, x, min(46, fy + 1), MAGMA_ORANGE if (x + k) % 2 == 0 else MAGMA_RED)
        set_px(canvas, x, max(41, fy - 1), JADE_LIGHT if (x % 4 == 0) else OBSIDIAN_DARK)

    steps = 36
    for i in range(steps):
        ang = (i / float(steps)) * 2.0 * math.pi
        px_x = max(26, min(48, int(round(cx_ring + math.cos(ang) * rx_ring))))
        px_y = max(41, min(46, int(round(cy_ring + math.sin(ang) * ry_ring))))
        col = GOLD_WHITE if (i % 3 == 0 and k <= 5) else (JADE_LIGHT if i % 2 == 0 else GOLD_MOLTEN)
        set_px(canvas, px_x, px_y, col)

    if k <= 6:
        for sp in range(5):
            sx_s = max(26, min(48, 30 + sp * 4 + (k % 3)))
            sy_s = max(38, min(45, 42 - ((sp + k) % 4)))
            set_px(canvas, sx_s, sy_s, GOLD_WHITE if sp == 2 else (JADE_LIGHT if sp % 2 == 0 else MAGMA_ORANGE))


def build_row2_auto_attack(tpl):
    """
    Row 2 (`AUTO_ATTACK` — `TECTONIC OVERHEAD EARTH-SHAKER SMASH`, 60..89):
    - `F00..F11`: Raises the colossal rectangular War-Hammer high behind his head (`angle_deg = -125°` on `F00..F11`).
    - `F12..F13`: Crushing downward earth-shaker whip from `-125°` to flat ground impact with blazing cleave arc.
    - `F14..F22`: Slams the War-Hammer flat onto the stone floor (`angle_deg = +22°` on `F14..F22`), cracking a
      Molten Lava Fissure & Tectonic Shockwave Ring (`y = 41..46, x = 26..48`) along the ground!
    - `F23..F29`: Heaves the War-Hammer back up over his shoulder (`hand_x = 28, hand_y = 22, angle_deg = -102°`).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 11:
            u = min(1.0, (f + 1) / 4.0)
            base = tpl["stand"].copy()
            base = apply_mantle_and_beard_sway(
                base, phase, amplitude=1.5 + u * 0.4, vertical_flutter=0.6, furnace_pulse=0.75 + u * 0.25
            )
            sx, sy = 27, 17
            ang = -112.0 * (1.0 - u) + (-125.0) * u - (1.5 if f in (7, 9, 11) else 0.0)
            hx = int(round(29 * (1.0 - u) + 30 * u))
            hy = int(round(19 * (1.0 - u) + 13 * u)) - (1 if f >= 8 else 0)
            frame = draw_2h_warhammer_and_arms(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.0 + 0.35 * (f / 11.0),
                scale=1.05,
                haft_len=21.0,
                shoulder=(sx, sy),
                two_handed=True,
                phase=phase,
            )
            frames.append(frame)

        elif f <= 13:
            k = f - 12
            base = tpl["lunge"].copy()
            base = apply_mantle_and_beard_sway(
                base, phase * 2.0, amplitude=2.0, vertical_flutter=0.8, furnace_pulse=1.0
            )
            ang = -58.0 if k == 0 else -4.0
            hx = 34 if k == 0 else 35
            hy = 18 if k == 0 else 22
            cleave_arc = (-125.0, ang + 6.0, 18.0, 1.0)
            frame = draw_2h_warhammer_and_arms(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.4,
                scale=1.05,
                haft_len=21.0,
                shoulder=(28, 17),
                two_handed=True,
                cleave_arc=cleave_arc,
                phase=phase,
            )
            frames.append(frame)

        elif f <= 22:
            # F14..F22: Slams the War-Hammer FLAT onto the stone floor (angle_deg = +22 deg on F14..F22)
            # cracking a Molten Lava Fissure & Tectonic Shockwave Ring (y = 41..46, x = 26..48)!
            k = f - 14  # 0..8
            crouch_d = 3 if k <= 4 else (2 if k <= 6 else 1)
            base = make_crouch_juggernaut(tpl, crouch_d)
            base = apply_mantle_and_beard_sway(
                base, phase * 2.0, amplitude=1.8, vertical_flutter=0.7, furnace_pulse=1.0 - k * 0.04
            )
            ang = 22.0
            hx = 36
            hy = 25
            cleave_arc = (-45.0 if k == 0 else -15.0, 26.0, 18.0, 0.95 - k * 0.25) if k <= 2 else None

            frame = draw_2h_warhammer_and_arms(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.4 - k * 0.04,
                scale=1.05,
                haft_len=21.0,
                shoulder=(28, 17 + crouch_d),
                two_handed=True,
                cleave_arc=cleave_arc,
                phase=phase,
                flat_floor_slam=True,
            )
            draw_lava_fissure_and_shockwave_ring(frame, k, max_k=8)
            frames.append(frame)

        else:
            u = (f - 22) / 7.0
            base = (tpl["lunge"] if f <= 24 else tpl["stand"]).copy()
            base = apply_mantle_and_beard_sway(
                base, phase, amplitude=1.4, vertical_flutter=0.5, furnace_pulse=0.8 - u * 0.2
            )
            ang = 22.0 * (1.0 - u) + (-102.0) * u
            hx = int(round(36 * (1.0 - u) + 28 * u))
            hy = int(round(24 * (1.0 - u) + 22 * u))
            frame = draw_2h_warhammer_and_arms(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.0,
                scale=1.02,
                haft_len=21.0,
                shoulder=(27, 17),
                two_handed=True,
                phase=phase,
            )
            frames.append(frame)
    return frames


def draw_runic_iron_forge_anvil(canvas, x0, y0, glow=1.0, flying=False, phase=0.0):
    """
    Row 3 helper: Draws a physical Runic Iron Forge-Anvil spanning 9x9px (`x = x0..x0+8, y = y0..y0+8`):
    - On `F03..F13`: Summoned on the stone floor in front of Torgar at `x = 35..43, y = 37..45`!
    - On `F14..F25`: Smashed horizontally across the frame (`x = 38..48, y = 26..36`) in a trail
      of molten gold & jade sparks!
    """
    ax0 = max(3, min(40, int(round(x0))))
    ay0 = max(4, min(37, int(round(y0))))

    for dy in range(0, 3):
        y = ay0 + dy
        for dx in range(0, 9):
            x = ax0 + dx
            if dy == 0:
                col = GOLD_WHITE if (3 <= dx <= 5 and glow > 0.8) else (GOLD_MOLTEN if 1 <= dx <= 7 else BRONZE_BRIGHT)
            elif dy == 1:
                col = IRON_LIGHT if 1 <= dx <= 6 else (GOLD_MOLTEN if dx >= 7 else BRONZE_MID)
            else:
                if dx == 0:
                    continue
                col = IRON_MID if 2 <= dx <= 6 else OBSIDIAN_DARK
            set_px(canvas, x, y, col)

    for dy in range(3, 6):
        y = ay0 + dy
        for dx in range(2, 7):
            x = ax0 + dx
            if dx == 4 and dy == 4:
                col = JADE_WHITE if glow >= 0.8 else JADE_LIGHT
            elif dx in (3, 4, 5) and dy in (3, 4, 5) and (dx == 4 or dy == 4):
                col = JADE_LIGHT if glow >= 0.7 else JADE_BRIGHT
            elif dx in (2, 6):
                col = BRONZE_MID if dy == 4 else OBSIDIAN_DEEP
            else:
                col = IRON_DARK
            set_px(canvas, x, y, col)

    for dy in range(6, 9):
        y = ay0 + dy
        for dx in range(0, 9):
            if dy == 6 and dx in (0, 8):
                continue
            x = ax0 + dx
            if dy == 8:
                col = GOLD_MOLTEN if dx in (1, 4, 7) else (OBSIDIAN_DEEP if dx in (0, 8) else BRONZE_BRIGHT)
            elif dy == 7:
                col = BRONZE_BRIGHT if dx in (1, 7) else (JADE_BRIGHT if dx == 4 else IRON_MID)
            else:
                col = BRONZE_MID if dx in (1, 7) else OBSIDIAN_DARK
            set_px(canvas, x, y, col)

    if flying:
        for t_i in range(1, 8):
            tx = max(28, ax0 - t_i * 2)
            ty = min(44, ay0 + 4 + (t_i // 2))
            set_px(canvas, tx, ty, GOLD_WHITE if t_i <= 2 else (JADE_LIGHT if t_i % 2 == 0 else GOLD_MOLTEN))
            set_px(canvas, tx, max(4, ty - 1), MAGMA_ORANGE if t_i % 2 == 0 else JADE_BRIGHT)
            if t_i <= 4:
                set_px(canvas, min(48, tx + 1), max(4, ty - 2), GOLD_MOLTEN)


def build_row3_skill(tpl):
    """
    Row 3 (`SKILL` — `MOUNTAIN ANVIL SUMMON & CANNONBALL HOME-RUN SMASH`, 90..119):
    - `F00..F02`: Torgar stamps his sabaton to summon the Mountain Anvil.
    - `F03..F13`: Torgar summons a physical Runic Iron Forge-Anvil (`x = 35..43, y = 37..45`) on the floor
      in front of him while coiling his War-Hammer back (`angle_deg -> -95°`) like a power batter!
    - `F14..F25`: Torgar winds up and swings his War-Hammer horizontally like a batter (`angle_deg` sweeping
      from `-95°` to `+10°` and into high follow-through) to smash the Anvil horizontally across the frame
      (`x = 38..48, y = 26..36`) in a trail of molten gold & jade sparks!
    - `F26..F29`: Returns smoothly to his shoulder-rested Juggernaut stance (`hand_x = 28, hand_y = 22, angle_deg = -102°`).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 2:
            u = f / 2.0
            base = tpl["stand"].copy()
            base = apply_mantle_and_beard_sway(base, phase, amplitude=1.4, vertical_flutter=0.5, furnace_pulse=0.8)
            frame = draw_2h_warhammer_and_arms(
                base,
                hand_x=28,
                hand_y=22,
                angle_deg=-102.0 - u * 6.0,
                glow_intensity=1.0,
                scale=1.02,
                haft_len=21.0,
                shoulder=(27, 17),
                two_handed=True,
                phase=phase,
            )
            frames.append(frame)

        elif f <= 13:
            k = f - 3  # 0..10
            u = k / 10.0
            base = tpl["stand"].copy()
            base = apply_mantle_and_beard_sway(
                base, phase * 1.5, amplitude=1.6, vertical_flutter=0.6, furnace_pulse=0.85 + 0.15 * u
            )

            ang = -108.0 * (1.0 - u) + (-95.0) * u
            hx = int(round(28 * (1.0 - u) + 29 * u))
            hy = int(round(22 * (1.0 - u) + 23 * u))
            frame = draw_2h_warhammer_and_arms(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.05 + 0.25 * u,
                scale=1.02,
                haft_len=21.0,
                shoulder=(27, 17),
                two_handed=True,
                phase=phase,
            )

            anvil_y0 = 35 if f == 3 else (36 if f == 4 else 37)
            draw_runic_iron_forge_anvil(frame, x0=35, y0=anvil_y0, glow=0.85 + 0.3 * u, flying=False, phase=phase)

            for sx_a in range(34, 45, 2):
                set_px(frame, sx_a, 45, JADE_LIGHT if (sx_a + f) % 2 == 0 else GOLD_MOLTEN)
            frames.append(frame)

        elif f <= 25:
            # F14..F25: Swings War-Hammer from -95 deg through +10 deg and into upper-left follow-through
            # so the flying Cannonball Anvil (x = 38..48, y = 26..36) is 100% unobstructed!
            k = f - 14  # 0..11
            base = tpl["lunge"].copy()
            base = apply_mantle_and_beard_sway(
                base, phase * 2.5, amplitude=2.0, vertical_flutter=0.8, furnace_pulse=1.0
            )

            # Sweeps from -95 deg -> -45 deg -> +10 deg at contact, then follows through high (-55 .. -90 deg)
            ang_seq = [-95.0, -35.0, 10.0, 8.0, -38.0, -56.0, -68.0, -76.0, -82.0, -88.0, -92.0, -96.0]
            hx_seq = [30, 34, 36, 35, 32, 31, 30, 30, 29, 29, 29, 28]
            hy_seq = [23, 23, 24, 23, 19, 17, 16, 16, 17, 18, 19, 20]

            cleave_arc = None
            if 1 <= k <= 5:
                arc_int = [1.0, 1.0, 0.95, 0.8, 0.6][k - 1]
                a0 = [-95.0, -55.0, -25.0, -10.0, -45.0][k - 1]
                cleave_arc = (a0, ang_seq[k] + 5.0, 17.5, arc_int)

            frame = draw_2h_warhammer_and_arms(
                base,
                hand_x=hx_seq[k],
                hand_y=hy_seq[k],
                angle_deg=ang_seq[k],
                glow_intensity=1.4 if k <= 6 else 1.1,
                scale=1.04,
                haft_len=21.0,
                shoulder=(28, 17),
                two_handed=True,
                cleave_arc=cleave_arc,
                phase=phase,
            )

            if k == 0:
                draw_runic_iron_forge_anvil(frame, x0=35, y0=37, glow=1.3, flying=False, phase=phase)
            elif k <= 8:
                fly_x0 = min(40, 37 + (k // 2))
                fly_y0 = max(26, 35 - k)
                draw_runic_iron_forge_anvil(frame, x0=fly_x0, y0=fly_y0, glow=1.4, flying=True, phase=phase)
                if k <= 3:
                    for dy_b in (-2, -1, 0, 1, 2):
                        for dx_b in (-2, -1, 0, 1, 2):
                            if abs(dx_b) + abs(dy_b) <= 3:
                                set_px(frame, 37 + dx_b, 36 + dy_b, GOLD_WHITE if (dx_b == 0 or dy_b == 0) else JADE_LIGHT)
            else:
                sh_k = k - 8
                for s_i in range(12):
                    sa = (s_i / 12.0) * 2.0 * math.pi + sh_k * 0.4
                    rx_s = max(38, min(48, int(round(43.0 + math.cos(sa) * (2.0 + sh_k * 1.2)))))
                    ry_s = max(26, min(36, int(round(30.0 + math.sin(sa) * (2.0 + sh_k * 1.1)))))
                    set_px(frame, rx_s, ry_s, GOLD_WHITE if s_i % 3 == 0 else (JADE_LIGHT if s_i % 2 == 0 else MAGMA_ORANGE))

            frames.append(frame)

        else:
            u = (f - 25) / 4.0
            base = tpl["stand"].copy()
            base = apply_mantle_and_beard_sway(
                base, phase, amplitude=1.4, vertical_flutter=0.5, furnace_pulse=0.75
            )
            ang = -96.0 * (1.0 - u) + (-102.0) * u
            frame = draw_2h_warhammer_and_arms(
                base,
                hand_x=28,
                hand_y=22,
                angle_deg=ang,
                glow_intensity=1.0,
                scale=1.02,
                haft_len=21.0,
                shoulder=(27, 17),
                two_handed=True,
                phase=phase,
            )
            frames.append(frame)
    return frames


def draw_ragnarok_lightning_and_mantle(canvas, f, crouch_d=0, intensity=1.0):
    """
    Row 4 helper (F02..F25): Renders crackling Jade-Gold Runic Lightning Arcs & Rising Volcanic
    Embers around Titan's horned helm and pauldrons/mantle.
    """
    for m_i in range(8):
        mx = 9 + m_i * 2
        my = min(36, 16 + crouch_d + abs(m_i - 3) * 2 + ((f + m_i) % 2))
        if 3 <= mx <= 48 and 3 <= my <= 46:
            set_px(canvas, mx, my, MAGMA_ORANGE if (m_i + f) % 2 == 0 else GOLD_MOLTEN)
            if m_i % 2 == 0 and my - 1 >= 3:
                set_px(canvas, mx, my - 1, GOLD_WHITE if (f + m_i) % 3 == 0 else JADE_LIGHT)

    origins = [
        (23, max(5, 9 + crouch_d), -1, -1),
        (31, max(5, 9 + crouch_d), 1, -1),
        (16, max(8, 16 + crouch_d), -1, 0),
        (30, max(8, 16 + crouch_d), 1, -1),
    ]
    for idx, (ox, oy, dir_x, dir_y) in enumerate(origins):
        cx_l, cy_l = float(ox), float(oy)
        steps = 4 if intensity >= 0.85 else 3
        for s in range(1, steps + 1):
            zig = 1 if ((f + idx + s) % 2 == 0) else -1
            nx_l = max(4.0, min(47.0, cx_l + dir_x * 1.6 + zig * 0.8))
            ny_l = max(3.0, min(45.0, cy_l + dir_y * 1.3 - (0.6 if dir_y == 0 else 0.0) + zig * 0.7))
            col_l = (
                JADE_WHITE
                if s == 1
                else (JADE_LIGHT if (s + idx + f) % 2 == 0 else (GOLD_WHITE if s == steps else GOLD_MOLTEN))
            )
            draw_line_px(canvas, cx_l, cy_l, nx_l, ny_l, col_l)
            cx_l, cy_l = nx_l, ny_l
        set_px(canvas, max(4.0, min(47.0, cx_l + dir_x)), max(3.0, min(45.0, cy_l - 1)), JADE_BRIGHT)

    for e_i in range(7):
        ex = 11 + e_i * 4 + ((f + e_i) % 3)
        ey = max(4, 24 + crouch_d - ((f * 2 + e_i * 3) % 18))
        col_e = GOLD_WHITE if e_i % 3 == 0 else (JADE_LIGHT if e_i % 2 == 0 else MAGMA_ORANGE)
        set_px(canvas, ex, ey, col_e)
        if ey + 1 <= 45 and e_i % 2 == 0:
            set_px(canvas, ex, ey + 1, MAGMA_RED if e_i % 4 == 0 else JADE_BRIGHT)


def draw_ragnarok_world_forge_geysers(canvas, f):
    """
    Row 4 helper (F11..F25): Renders a 2-stage World-Forge Lava & Jade Geyser Eruption along the floor.
    """
    is_stage2 = (f >= 20)

    for x in range(14, 49):
        wave = (x + f) % 3
        set_px(canvas, x, 48, OBSIDIAN_DARK if (x % 3 == 0) else MAGMA_RED)
        set_px(canvas, x, 47, MAGMA_ORANGE if wave == 0 else (GOLD_MOLTEN if wave == 1 else JADE_DEEP))
        set_px(
            canvas,
            x,
            46,
            GOLD_WHITE if (is_stage2 and wave == 0) else (JADE_LIGHT if wave == 1 else GOLD_MOLTEN),
        )
        if is_stage2 or (x + f) % 2 == 0:
            set_px(canvas, x, 45, JADE_WHITE if (x + f) % 4 == 0 else (MAGMA_ORANGE if wave == 2 else JADE_BRIGHT))

    if not is_stage2:
        k = f - 11
        geyser_xs = [16, 25, 36, 45]
        for g_idx, gx in enumerate(geyser_xs):
            top_y = max(40, 42 - ((k + g_idx) % 3))
            is_jade = (g_idx % 2 == 1)
            for gy in range(top_y, 47):
                set_px(canvas, gx, gy, JADE_WHITE if is_jade else GOLD_WHITE)
                if gx - 1 >= 14:
                    set_px(canvas, gx - 1, gy, JADE_LIGHT if is_jade else GOLD_MOLTEN)
                if gx + 1 <= 48:
                    set_px(canvas, gx + 1, gy, JADE_BRIGHT if is_jade else MAGMA_ORANGE)
            set_px(canvas, max(14, gx - 1), top_y, GOLD_MOLTEN if is_jade else JADE_LIGHT)
            set_px(canvas, min(48, gx + 1), top_y, MAGMA_ORANGE if is_jade else GOLD_WHITE)
    else:
        k = f - 20
        geyser_xs = [15, 20, 26, 31, 37, 42, 47]
        for g_idx, gx in enumerate(geyser_xs):
            top_y = max(40, 40 + ((k + g_idx) % 2))
            is_jade = (g_idx % 2 == 0)
            for gy in range(top_y, 47):
                core_c = JADE_WHITE if is_jade else GOLD_WHITE
                mid_c = JADE_LIGHT if is_jade else GOLD_MOLTEN
                edge_c = JADE_BRIGHT if is_jade else MAGMA_ORANGE
                set_px(canvas, gx, gy, core_c)
                if gx - 1 >= 14:
                    set_px(canvas, gx - 1, gy, mid_c if gy <= top_y + 2 else edge_c)
                if gx + 1 <= 48:
                    set_px(canvas, gx + 1, gy, mid_c if (gy + k) % 2 == 0 else edge_c)
            set_px(canvas, gx, 40, GOLD_WHITE if is_jade else JADE_WHITE)


def build_row4_ultimate(tpl):
    """
    Row 4 (`ULTIMATE` - Ragnarok: World-Forge Eruption, 120..149).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 9:
            u = f / 9.0
            base = tpl["stand"].copy()
            base = apply_mantle_and_beard_sway(
                base, phase * 2.5, amplitude=1.8, vertical_flutter=0.8, furnace_pulse=1.0
            )
            base = draw_ragnarok_crown_and_jets(
                base, head_xy=(28, 9), shoulder_xy=(21, 17), intensity=0.5 + 0.5 * u, phase=phase * 2.0
            )

            sx, sy = 27, 17
            ang = -102.0 * (1.0 - u) + (-122.0) * u
            hx = int(round(28 * (1.0 - u) + 31 * u))
            hy = int(round(22 * (1.0 - u) + 12 * u))
            frame = draw_warhammer(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.15 + u * 0.3,
                scale=1.05 + u * 0.08,
                haft_len=21.0,
                shoulder=(sx, sy),
                two_handed=True,
                phase=phase * 2.0,
            )
            if f >= 2:
                draw_ragnarok_lightning_and_mantle(frame, f, crouch_d=0, intensity=0.6 + 0.4 * u)
            frames.append(frame)

        elif f <= 20:
            k = f - 10
            is_slam1 = (1 <= k <= 4)
            is_slam2 = (6 <= k <= 10)
            crouch_d = 3 if (is_slam1 or is_slam2) else 0
            base = make_crouch_juggernaut(tpl, crouch_d) if crouch_d > 0 else tpl["lunge"].copy()
            base = apply_mantle_and_beard_sway(
                base, phase * 3.0, amplitude=2.0, vertical_flutter=0.9, furnace_pulse=1.0
            )
            base = draw_ragnarok_crown_and_jets(
                base, head_xy=(28, 9 + crouch_d), shoulder_xy=(21, 17 + crouch_d), intensity=1.0, phase=phase * 3.0
            )

            sx, sy = 27, 17 + crouch_d
            if k == 0 or k == 5:
                ang = -115.0
                hx, hy = 31, sy - 5
                cleave = None
            elif is_slam1:
                ang = [12.0, 26.0, 28.0, 20.0][k - 1]
                hx, hy = 36, sy + 6
                cleave = (-95.0, ang + 5.0, 18.0, 1.0 if k <= 2 else 0.7)
            else:
                ang = [16.0, 26.0, 28.0, 24.0, 10.0][k - 6]
                hx, hy = 36, sy + 7
                cleave = (-95.0, ang + 5.0, 18.5, 1.0 if k <= 8 else 0.75)

            frame = draw_warhammer(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.4,
                scale=1.08,
                haft_len=21.0,
                shoulder=(sx, sy),
                two_handed=True,
                cleave_arc=cleave,
                phase=phase * 2.0,
            )

            draw_ragnarok_lightning_and_mantle(frame, f, crouch_d=crouch_d, intensity=1.0)
            if f >= 11:
                draw_ragnarok_world_forge_geysers(frame, f)

            frames.append(frame)

        elif f <= 26:
            k = f - 21
            if k == 0:
                body = make_aerial_juggernaut(tpl, jump_dy=-2, body_tilt_deg=10.0, leg_tuck=0.7, thruster_intensity=1.0, phase=phase)
                body = draw_ragnarok_crown_and_jets(body, head_xy=(28, 8), shoulder_xy=(21, 15), intensity=1.0, phase=phase)
                frame = draw_warhammer(
                    body,
                    hand_x=31,
                    hand_y=11,
                    angle_deg=-118.0,
                    glow_intensity=1.5,
                    scale=1.08,
                    haft_len=21.0,
                    shoulder=(27, 15),
                    two_handed=True,
                    phase=phase,
                )
                draw_ragnarok_lightning_and_mantle(frame, f, crouch_d=0, intensity=1.0)
                draw_ragnarok_world_forge_geysers(frame, f)
            else:
                crouch_d = [5, 6, 6, 5, 4][k - 1]
                body = make_crouch_juggernaut(tpl, crouch_d)
                body = apply_mantle_and_beard_sway(body, phase * 3.0, amplitude=2.0, vertical_flutter=0.9, furnace_pulse=1.0)
                body = draw_ragnarok_crown_and_jets(
                    body, head_xy=(28, 9 + crouch_d), shoulder_xy=(21, 17 + crouch_d), intensity=1.0, phase=phase
                )
                sx, sy = 27, 17 + crouch_d
                frame = draw_warhammer(
                    body,
                    hand_x=36,
                    hand_y=sy + 6,
                    angle_deg=26.0,
                    glow_intensity=1.5,
                    scale=1.10,
                    haft_len=21.0,
                    shoulder=(sx, sy),
                    two_handed=True,
                    cleave_arc=(-105.0, 28.0, 18.0, 1.0) if k <= 2 else None,
                    phase=phase,
                )
                if f <= 25:
                    draw_ragnarok_lightning_and_mantle(frame, f, crouch_d=crouch_d, intensity=1.0)
                    draw_ragnarok_world_forge_geysers(frame, f)
                ring_rx = min(16, 7 + k * 2)
                for s_i in range(32):
                    sa = (s_i / 32.0) * 2.0 * math.pi
                    rx = max(4.0, min(47.0, 29.0 + math.cos(sa) * ring_rx))
                    ry = max(40.0, min(46.0, 44.0 + math.sin(sa) * 2.5))
                    set_px(frame, rx, ry, GOLD_WHITE if s_i % 3 == 0 else (JADE_LIGHT if s_i % 2 == 0 else GOLD_MOLTEN))

            frames.append(frame)

        else:
            k = f - 27
            u = (k + 1) / 3.0
            crouch_d = [2, 1, 0][k]
            body = make_crouch_juggernaut(tpl, crouch_d) if crouch_d > 0 else tpl["stand"].copy()
            body = apply_mantle_and_beard_sway(body, phase, amplitude=1.5, vertical_flutter=0.6, furnace_pulse=0.9)
            body = draw_ragnarok_crown_and_jets(
                body, head_xy=(28, 9 + crouch_d), shoulder_xy=(21, 17 + crouch_d), intensity=0.7 * (1.0 - u * 0.5), phase=phase
            )
            ang = 24.0 * (1.0 - u) + (-102.0) * u
            frame = draw_warhammer(
                body,
                hand_x=int(round(36 * (1.0 - u) + 28 * u)),
                hand_y=int(round((24 + crouch_d) * (1.0 - u) + 22 * u)),
                angle_deg=ang,
                glow_intensity=1.1,
                scale=1.04,
                haft_len=21.0,
                shoulder=(27, 17 + crouch_d),
                two_handed=True,
                phase=phase,
            )
            frames.append(frame)
    return frames


def build_row5_death(tpl):
    """
    Row 5 (`DEATH` & `HURT`, 150..179).
    """
    frames = []
    for f in range(30):
        if f <= 6:
            u = f / 6.0
            dx = -int(round(math.sin(u * math.pi * 0.85) * 2.0))
            dy = int(round(u * 2.0))
            base = shift_layer(tpl["stand"], dx=dx, dy=dy)
            base = apply_mantle_and_beard_sway(base, u * math.pi, amplitude=1.5, vertical_flutter=0.5, furnace_pulse=0.4)
            frame = draw_2h_warhammer_and_arms(
                base,
                hand_x=max(28, 30 + dx),
                hand_y=22 + dy,
                angle_deg=-95.0 + u * 80.0,
                glow_intensity=0.6,
                scale=1.0,
                haft_len=21.0,
                shoulder=(27 + dx, 17 + dy),
                two_handed=True,
            )
            draw_hurt_impact_burst(frame, f)
            for sp in range(4):
                sx_s = min(47, 30 + sp * 2 + f)
                sy_s = max(5, 21 - (sp % 2) * 3 + (f // 2))
                set_px(frame, sx_s, sy_s, GOLD_WHITE if sp == 0 else MAGMA_ORANGE)
            frames.append(frame)

        elif f <= 17:
            u = (f - 7) / 10.0
            kneel_src = tpl["kneel"].copy()
            extra_drop = 0 if f <= 13 else (f - 13)
            base = np.zeros((52, 52, 4), dtype=np.uint8)
            for sy in range(10, 46):
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
            flicker = 0.65 if (f % 3 == 0) else 0.15
            base = apply_mantle_and_beard_sway(base, u * math.pi, amplitude=1.0, vertical_flutter=0.3, furnace_pulse=flicker)

            frame = draw_2h_warhammer_and_arms(
                base,
                hand_x=34,
                hand_y=26 + extra_drop,
                angle_deg=26.0 + u * 18.0,
                glow_intensity=max(0.2, 0.6 * (1.0 - u)),
                scale=0.96,
                haft_len=21.0,
                shoulder=(27, 22 + extra_drop),
                two_handed=True,
            )
            frames.append(frame)

        elif f <= 22:
            k = f - 18
            v_scales = [0.76, 0.64, 0.52, 0.42, 0.34]
            h_shears = [0.12, 0.19, 0.26, 0.33, 0.40]
            v_sc = v_scales[k]
            h_sh = h_shears[k]

            kneel_src = tpl["kneel"]
            slump = np.zeros((52, 52, 4), dtype=np.uint8)
            for sy in range(10, 46):
                h_above = max(0, 45 - sy)
                ny = max(18, min(46, 46 - int(round(h_above * v_sc))))
                for sx in range(3, 46):
                    if kneel_src[sy, sx, 3] > 0:
                        dx_s = int(round(h_above * h_sh)) if sx >= 14 else int(round(h_above * h_sh * 0.45))
                        nx = max(4, min(46, sx + dx_s))
                        slump[ny, nx] = kneel_src[sy, sx]
                        if ny + 1 <= 46 and slump[ny + 1, nx, 3] == 0:
                            slump[ny + 1, nx] = kneel_src[sy, sx]
            slump = fill_layer_pinholes(slump, x0=3, x1=48, y0=18, y1=47, require_3_neighbors=False)

            ham_ang = [30.0, 22.0, 15.0, 9.0, 4.0][k]
            ham_hy = [30, 32, 34, 36, 38][k]
            sh_y = [26, 28, 30, 32, 34][k]
            frame = draw_2h_warhammer_and_arms(
                slump,
                hand_x=33,
                hand_y=ham_hy,
                angle_deg=ham_ang,
                glow_intensity=0.25,
                scale=0.95,
                haft_len=21.0,
                shoulder=(28, sh_y),
                two_handed=True,
            )
            frames.append(frame)

        else:
            k = f - 23
            frame = shift_layer(tpl["fall"], dx=0, dy=0 if k == 0 else 1)

            for hx_p in range(16, 35):
                ring = (hx_p % 4 == 0)
                set_px(frame, hx_p, 44, GOLD_MOLTEN if ring else IRON_MID)
                set_px(frame, hx_p, 45, BRONZE_MID if ring else OBSIDIAN_DARK)
            set_px(frame, 15, 44, GOLD_MOLTEN)
            set_px(frame, 15, 45, JADE_BRIGHT)
            for gx_c in (20, 26):
                set_px(frame, gx_c, 43, BRONZE_BRIGHT)
                set_px(frame, gx_c + 1, 43, BRONZE_MID)
            for hy_p in range(41, 47):
                for hx_p in range(35, 45):
                    if hy_p in (41, 46) or hx_p in (35, 44):
                        col = BRONZE_BRIGHT if hy_p == 41 else BRONZE_MID
                    elif hy_p in (43, 44) and hx_p in (38, 39, 40):
                        col = JADE_LIGHT if k <= 2 else JADE_BRIGHT
                    elif hy_p in (42, 45) and hx_p in (37, 42):
                        col = GOLD_MOLTEN
                    else:
                        col = OBSIDIAN_DARK
                    set_px(frame, hx_p, hy_p, col)

            ember_x = 24 + k * 2
            set_px(frame, min(44, ember_x), 42 - (k % 2), GOLD_MOLTEN if k <= 3 else JADE_BRIGHT)
            frames.append(frame)

    return frames


def build_row6_dash(tpl):
    """
    Row 6 (`DASH` - Molten Juggernaut Stampede, 180..209).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 4:
            u = f / 4.0
            crouch_d = [1, 2, 4, 4, 3][f]
            base = make_crouch_juggernaut(tpl, crouch_d)
            base = apply_mantle_and_beard_sway(
                base, phase * 2.0, amplitude=1.6, is_dash=(f >= 2), furnace_pulse=0.8 + u * 0.2
            )
            ang = -102.0 * (1.0 - u) + (-12.0) * u
            frame = draw_warhammer(
                base,
                hand_x=int(round(28 * (1.0 - u) + 35 * u)),
                hand_y=22 + crouch_d,
                angle_deg=ang,
                glow_intensity=0.9 + u * 0.3,
                scale=1.0,
                haft_len=15.5,
                shoulder=(27, 17 + crouch_d),
                two_handed=True,
                phase=phase,
            )
            frames.append(frame)

        elif f <= 23:
            k = f - 5
            bob_dy = int(round(math.sin(k * 0.7) * 1.0))
            base = shift_layer(tpl["dash"], dx=0, dy=bob_dy)
            base = apply_mantle_and_beard_sway(
                base, k * 0.85, amplitude=1.8, vertical_flutter=0.8, is_dash=True, furnace_pulse=1.0
            )

            for s_idx in range(5):
                sy = 14 + s_idx * 5 + ((k + s_idx) % 2)
                sx0 = 4 + ((k * 3 + s_idx * 4) % 6)
                col_s = GOLD_MOLTEN if s_idx % 2 == 0 else JADE_LIGHT
                draw_line_px(base, sx0, sy, sx0 + 4, sy, col_s)
                set_px(base, max(3, sx0 - 1), sy - 1, MAGMA_ORANGE)

            pump_dx = int(round(math.sin(k * 0.7) * 1.5))
            frame = draw_warhammer(
                base,
                hand_x=36 + pump_dx,
                hand_y=21 + bob_dy,
                angle_deg=-10.0 + math.sin(k * 0.6) * 5.0,
                glow_intensity=1.25,
                scale=1.0,
                haft_len=14.5,
                shoulder=(28, 17 + bob_dy),
                two_handed=True,
                phase=phase,
            )
            frames.append(frame)

        else:
            k = f - 24
            u = k / 5.0
            crouch_d = [3, 3, 2, 1, 1, 0][k]
            base = make_crouch_juggernaut(tpl, crouch_d) if crouch_d > 0 else tpl["stand"].copy()
            base = apply_mantle_and_beard_sway(
                base, phase, amplitude=1.5, vertical_flutter=0.5, furnace_pulse=0.85 - u * 0.2
            )
            ang = -10.0 * (1.0 - u) + (-102.0) * u
            frame = draw_warhammer(
                base,
                hand_x=int(round(36 * (1.0 - u) + 28 * u)),
                hand_y=22 + crouch_d,
                angle_deg=ang,
                glow_intensity=1.0 - u * 0.15,
                scale=1.0,
                haft_len=16.5,
                shoulder=(27, 17 + crouch_d),
                two_handed=True,
                phase=phase,
            )
            if k <= 3:
                for bx in (18, 35):
                    set_px(frame, bx + 2 + k, 44, GOLD_WHITE)
                    set_px(frame, bx + 1 + k, 43, MAGMA_ORANGE)
            frames.append(frame)
    return frames


def draw_magma_armor_and_360_dome(canvas, f, crouch_d, intensity=1.0, phase=0.0):
    """
    Row 7 (`CROUCH` — `MAGMA ARMOR FORTIFY / IRON-ANVIL BULWARK`):
    1. Encases Torgar's crouched torso (`x = 13..24, y = 18+d .. 35+d`) in Glowing Molten Lava
       Rock-Armor Plates (segmented volcanic basalt plates with glowing molten-gold & magma-orange seams)
       while keeping his Horned Helm and Braided Copper-Orange Beard 100% clear!
    2. Surrounds Torgar in a continuous 360° Magma Dome (`cx = 25.5, cy = 27.0, rx = 17.0, ry = 18.0`,
       spanning `x = 8..43, y = 8..45`) with a solid 2px magma-gold & jade runic perimeter arch and
       grounded magma foundation ring (`y = 44..45, x = 9..42`)!
    """
    out = canvas.copy()
    pulse_hi = (f % 2 == 0)

    # 1. Chunky Interlocking Volcanic Basalt & Molten-Lava Rock-Armor Plates across chest/back/shoulders
    y_top_armor = max(16, 17 + crouch_d)
    y_bot_armor = min(38, 33 + crouch_d)
    for y in range(y_top_armor, y_bot_armor + 1):
        for x in range(13, 25):
            if out[y, x, 3] == 0:
                continue
            rel_y = y - y_top_armor
            if rel_y in (0, 4, 8, 12) or x in (13, 18, 23):
                col_p = GOLD_WHITE if (pulse_hi and (x + rel_y) % 4 == 0) else (GOLD_MOLTEN if (x + f) % 2 == 0 else MAGMA_ORANGE)
                set_px(out, x, y, col_p)
            else:
                set_px(out, x, y, OBSIDIAN_DARK if (x + y) % 2 == 0 else BRONZE_SHADOW)

    # 2. Continuous 2px-Thick 360° Magma Dome Shell around Torgar (cx = 25.5, cy = 27.0, rx = 17.0, ry = 18.0)
    cx_d = 25.5
    cy_d = 27.0
    rx_d = 17.0 * min(1.0, 0.82 + 0.18 * intensity)
    ry_d = 18.0 * min(1.0, 0.82 + 0.18 * intensity)

    steps = 120
    for i in range(steps):
        ang = (i / float(steps)) * 2.0 * math.pi
        ca, sa = math.cos(ang), math.sin(ang)
        dx_out = max(6, min(45, int(round(cx_d + ca * rx_d))))
        dy_out = max(6, min(45, int(round(cy_d + sa * ry_d))))
        dx_in = max(7, min(44, int(round(cx_d + ca * (rx_d - 1.0)))))
        dy_in = max(7, min(45, int(round(cy_d + sa * (ry_d - 1.0)))))

        wave_mod = (i // 3 + f) % 6
        if wave_mod == 0:
            c_outer = GOLD_WHITE
            c_inner = GOLD_MOLTEN
        elif wave_mod in (1, 2):
            c_outer = GOLD_MOLTEN
            c_inner = MAGMA_ORANGE
        elif wave_mod == 3:
            c_outer = JADE_LIGHT
            c_inner = JADE_BRIGHT
        else:
            c_outer = MAGMA_ORANGE
            c_inner = MAGMA_RED
        set_px(out, dx_out, dy_out, c_outer)
        set_px(out, dx_in, dy_in, c_inner)

    # 3. Grounded Magma Dome Foundation Ring at y = 44..45 (x = 9..42)
    for x in range(9, 43):
        set_px(out, x, 45, GOLD_MOLTEN if (x + f) % 3 == 0 else MAGMA_ORANGE)
        set_px(out, x, 44, GOLD_WHITE if (x + f) % 5 == 0 else MAGMA_RED)

    return out


def build_row7_crouch(tpl):
    """
    Row 7 (`CROUCH` — `MAGMA ARMOR FORTIFY / IRON-ANVIL BULWARK`, 210..239):
    - Instead of holding the hammer overhead with vertical spikes, Torgar plants the colossal
      rectangular War-Hammer head straight down onto the stone floor in front of him
      (`hand_x = 31, hand_y = 26, angle_deg = +68°`, mallet head resting at `y = 39..45`)
      while Glowing Molten Lava Rock-Armor Plates & a 360° Magma Dome encase his torso!
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 3:
            depths = [2, 3, 5, 5]
            d = depths[f]
            u = (f + 1) / 4.0
            base = make_crouch_juggernaut(tpl, d)
            base = apply_mantle_and_beard_sway(
                base, phase * 1.5, amplitude=1.2, vertical_flutter=0.3, furnace_pulse=0.8 + 0.2 * u
            )
            ang = 56.0 * (1.0 - u) + 68.0 * u
            hx = 31
            hy = int(round(25 * (1.0 - u) + 26 * u))
            frame = draw_2h_warhammer_and_arms(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.0 + 0.3 * u,
                scale=1.02,
                haft_len=21.0,
                shoulder=(27, 17 + d),
                two_handed=True,
                phase=phase,
            )
            frame = draw_magma_armor_and_360_dome(frame, f, d, intensity=0.65 + 0.35 * u, phase=phase)
            frames.append(frame)

        elif f <= 24:
            k = f - 4
            d = 6 if (4 <= k <= 15) else 5
            base = make_crouch_juggernaut(tpl, d)
            base = apply_mantle_and_beard_sway(
                base, phase * 1.8, amplitude=1.2, vertical_flutter=0.3, furnace_pulse=0.95
            )
            ang = 68.0 + math.sin(phase * 2.0) * 1.8
            frame = draw_2h_warhammer_and_arms(
                base,
                hand_x=31,
                hand_y=26,
                angle_deg=ang,
                glow_intensity=1.35 if (8 <= k <= 14) else 1.2,
                scale=1.02,
                haft_len=21.0,
                shoulder=(27, 17 + d),
                two_handed=True,
                phase=phase,
            )
            frame = draw_magma_armor_and_360_dome(frame, f, d, intensity=1.0, phase=phase)
            frames.append(frame)

        else:
            k = f - 25
            depths = [4, 3, 2, 1, 0]
            d = depths[k]
            u = (k + 1) / 5.0
            base = make_crouch_juggernaut(tpl, d) if d > 0 else tpl["stand"].copy()
            base = apply_mantle_and_beard_sway(
                base, phase, amplitude=1.4, vertical_flutter=0.5, furnace_pulse=0.85 - u * 0.2
            )
            ang = 68.0 * (1.0 - u) + (-102.0) * u
            hx = int(round(31 * (1.0 - u) + 28 * u))
            hy = int(round(26 * (1.0 - u) + 22 * u))
            frame = draw_2h_warhammer_and_arms(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.1 - u * 0.15,
                scale=1.02,
                haft_len=21.0,
                shoulder=(27, 17 + d),
                two_handed=True,
                phase=phase,
            )
            if k <= 1:
                frame = draw_magma_armor_and_360_dome(frame, f, d, intensity=0.55 - k * 0.25, phase=phase)
            frames.append(frame)
    return frames


def draw_wide_molten_crater(canvas, k):
    """
    Row 8 helper (`F17..F26`, k = 0..9): Erupts a Wide Molten Crater (`x = 12..48, y = 41..47`)
    across the floor when Torgar slams straight down in his Tectonic Belly-Crush Dunk!
    """
    span_l = max(12, 24 - k * 3) if k <= 4 else 12
    span_r = min(48, 36 + k * 3) if k <= 4 else 48
    fade = 1.0 if k <= 6 else max(0.4, 1.0 - (k - 6) * 0.2)

    for x in range(span_l, span_r + 1):
        wave = (x + k) % 3
        set_px(canvas, x, 46, OBSIDIAN_DARK if (x % 3 == 0) else MAGMA_RED)
        set_px(canvas, x, 45, GOLD_WHITE if (wave == 0 and fade > 0.7) else (GOLD_MOLTEN if wave == 1 else MAGMA_ORANGE))
        set_px(canvas, x, 44, JADE_LIGHT if (x + k) % 4 == 0 else (GOLD_MOLTEN if wave == 0 else MAGMA_ORANGE))

    for rx_rim in (span_l, span_l + 1, span_r - 1, span_r):
        if 12 <= rx_rim <= 48:
            set_px(canvas, rx_rim, 43, BRONZE_BRIGHT if rx_rim % 2 == 0 else OBSIDIAN_MID)
            set_px(canvas, rx_rim, 42, GOLD_WHITE if k <= 5 else GOLD_MOLTEN)
            if k <= 6:
                set_px(canvas, rx_rim, 41, MAGMA_ORANGE if rx_rim % 2 == 0 else JADE_LIGHT)

    if k <= 7:
        for b_i in range(6):
            bx = max(12, min(48, 15 + b_i * 6 + ((k + b_i) % 3)))
            by = max(38, min(43, 42 - ((k + b_i * 2) % 4)))
            set_px(canvas, bx, by, GOLD_WHITE if b_i % 2 == 0 else JADE_LIGHT)
            set_px(canvas, bx, min(45, by + 1), MAGMA_ORANGE)


def build_row8_jump(tpl):
    """
    Row 8 (`JUMP` — `TECTONIC BELLY-CRUSH DUNK`, 240..269):
    - Heavy, low-arcing unstoppable Juggernaut leap:
      * `F00..F03`: Deep muscular Juggernaut squat windup.
      * `F04..F16`: Low-arcing unstoppable Juggernaut leap raising the colossal rectangular War-Hammer
        with BOTH hands overhead (`two_handed=True`, `angle_deg = -118°..-130°`)!
      * `F17..F26`: Slamming straight down into a Wide Molten Crater on the floor (`x = 12..48, y = 41..47`)!
      * `F27..F29`: Rises from the crater hoisting his War-Hammer back over his shoulder (`-102°`).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 3:
            crouch_seq = [1, 3, 5, 3]
            d = crouch_seq[f]
            u = f / 3.0
            body = make_crouch_juggernaut(tpl, d)
            body = apply_mantle_and_beard_sway(body, phase * 2.0, amplitude=1.5, vertical_flutter=0.6, furnace_pulse=0.85 + u * 0.15)
            ang = -102.0 - u * 16.0
            frame = draw_2h_warhammer_and_arms(
                body,
                hand_x=29,
                hand_y=21 + d - int(round(u * 4)),
                angle_deg=ang,
                glow_intensity=1.0 + u * 0.25,
                scale=1.02,
                haft_len=21.0,
                shoulder=(27, 17 + d),
                two_handed=True,
                phase=phase,
            )
            frames.append(frame)

        elif f <= 16:
            k = f - 4
            u = k / 12.0
            jump_dy = int(round(-1.0 - math.sin(u * math.pi) * 2.0))
            tilt_deg = -6.0 * (1.0 - u) + 8.0 * u
            body = make_aerial_juggernaut(
                tpl, jump_dy=jump_dy, body_tilt_deg=tilt_deg, leg_tuck=0.55 + 0.25 * math.sin(u * math.pi), thruster_intensity=0.95, phase=phase * 2.0
            )
            sx, sy = 27, 17 + jump_dy
            ang = -118.0 - math.sin(u * math.pi) * 10.0
            hx = 30 + (1 if k >= 6 else 0)
            hy = sy - 4 - (1 if 3 <= k <= 9 else 0)
            frame = draw_2h_warhammer_and_arms(
                body,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.3,
                scale=1.04,
                haft_len=21.0,
                shoulder=(sx, sy),
                two_handed=True,
                phase=phase * 2.0,
            )
            frames.append(frame)

        elif f <= 26:
            k = f - 17
            if k == 0:
                body = make_aerial_juggernaut(
                    tpl, jump_dy=-1, body_tilt_deg=12.0, leg_tuck=0.4, thruster_intensity=0.8, phase=phase * 2.0
                )
                frame = draw_2h_warhammer_and_arms(
                    body,
                    hand_x=34,
                    hand_y=19,
                    angle_deg=-35.0,
                    glow_intensity=1.45,
                    scale=1.05,
                    haft_len=21.0,
                    shoulder=(28, 16),
                    two_handed=True,
                    cleave_arc=(-122.0, -25.0, 18.0, 1.0),
                    phase=phase * 2.0,
                )
            else:
                crouch_depths = [5, 6, 6, 5, 5, 4, 4, 3, 2]
                d = crouch_depths[k - 1]
                body = make_crouch_juggernaut(tpl, d)
                body = apply_mantle_and_beard_sway(
                    body, phase * 2.0, amplitude=1.8, vertical_flutter=0.7, furnace_pulse=1.0
                )
                sx, sy = 28, 17 + d
                ang = 22.0
                cleave_arc = (-85.0 if k == 1 else -30.0, 26.0, 18.0, 1.0 if k == 1 else 0.75) if k <= 2 else None
                frame = draw_2h_warhammer_and_arms(
                    body,
                    hand_x=36,
                    hand_y=25,
                    angle_deg=ang,
                    glow_intensity=1.45 - k * 0.04,
                    scale=1.05,
                    haft_len=21.0,
                    shoulder=(sx, sy),
                    two_handed=True,
                    cleave_arc=cleave_arc,
                    phase=phase,
                    flat_floor_slam=True,
                )
                draw_wide_molten_crater(frame, k - 1)
            frames.append(frame)

        else:
            k = f - 27
            u = (k + 1) / 3.0
            d = [2, 1, 0][k]
            body = make_crouch_juggernaut(tpl, d) if d > 0 else tpl["stand"].copy()
            body = apply_mantle_and_beard_sway(
                body, phase, amplitude=1.4, vertical_flutter=0.5, furnace_pulse=0.85 - u * 0.15
            )
            ang = 22.0 * (1.0 - u) + (-102.0) * u
            hx = int(round(36 * (1.0 - u) + 28 * u))
            hy = int(round((24 + d) * (1.0 - u) + 22 * u))
            frame = draw_2h_warhammer_and_arms(
                body,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.05,
                scale=1.02,
                haft_len=21.0,
                shoulder=(27, 17 + d),
                two_handed=True,
                phase=phase,
            )
            frames.append(frame)
    return frames


def apply_pass12_vanguard_upgrades(cell_208, r_idx, f):
    """
    Pass #12 Melee & Vanguard 30fps Character Sheet Refiner (Titan - forge-gold/jade).
    All pixels strictly clamped inside [4..203] in x and y.
    """
    out = cell_208.copy()
    c_white = GOLD_WHITE
    c_prim = GOLD_MOLTEN
    c_sec = JADE_LIGHT

    def p208(x, y, col):
        ix = int(round(x))
        iy = int(round(y))
        if 4 <= ix <= 203 and 4 <= iy <= 203:
            out[iy, ix] = col

    # 1. Row 2 (AUTO_ATTACK, F14..F19) Ground-Slam Strike Apex Impact Glint
    if r_idx == 2 and 14 <= f <= 19:
        gx = 162 + (f - 14) * 3
        gy = 160 + ((f * 5) % 10)
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

    # 2. Row 7 / Row 3 (SKILL / CROUCH, F08..F20) Grounded Cast-Surge Sigil Glow
    if r_idx in (3, 7) and 8 <= f <= 20:
        for x in range(76, 135):
            u = (x - 105.0) / 29.0
            ay = 186 + int(round((u * u) * 2.0))
            ay = max(186, min(188, ay))
            col_top = c_white if (abs(x - 105) <= 10 or (x + f) % 4 == 0) else c_prim
            col_bot = c_sec if abs(x - 105) <= 18 else JADE_BRIGHT
            p208(x, ay, col_top)
            p208(x, ay + 1, col_bot)
        mote_xs = [86 + ((f - 8) % 3), 105 + (((f - 8) + 1) % 3) - 1, 124 - ((f - 8) % 3)]
        for m_i, mx in enumerate(mote_xs):
            my = (182 - ((f - 8) * 3) % 24) if m_i == 0 else (182 - (((f - 8) * 3 + m_i * 7) % 24))
            p208(mx, my, c_white)
            p208(mx + 1, my, c_prim)
            p208(mx, my + 1, c_sec)
            p208(mx + 1, my + 1, JADE_BRIGHT)
            p208(mx, my + 2, MAGMA_ORANGE if (m_i + f) % 2 == 0 else c_prim)

    # 3. Row 4 (ULTIMATE, F03..F26) Overdrive Ascension Lightning / Aura Pillars
    if r_idx == 4 and 3 <= f <= 26:
        for idx, mx in enumerate((68, 88, 122, 140)):
            my = 168 - (((f - 3) * 5 + idx * 19) % 116)
            p208(mx, my - 2, c_sec)
            p208(mx, my - 1, c_white)
            p208(mx, my, c_white)
            p208(mx - 1, my, c_prim)
            p208(mx + 1, my, c_sec)
            zig = 1 if (f + idx) % 2 == 0 else -1
            p208(mx + zig, my + 1, c_prim)
            p208(mx, my + 2, c_sec)
            p208(mx, my + 3, JADE_BRIGHT if idx % 2 == 0 else MAGMA_ORANGE)

    out[:4, :, :] = 0
    out[204:, :, :] = 0
    out[:, :4, :] = 0
    out[:, 204:, :] = 0
    return out


def main():
    tpl = make_clean_templates()

    rows = [
        ("ROW 0: IDLE - SHOULDER-RESTED WORLD-BREAKER MAUL (30F)", build_row0_idle(tpl)),
        ("ROW 1: WALK - HEAVY JUGGERNAUT MARCH (30F)", build_row1_walk(tpl)),
        ("ROW 2: AUTO_ATTACK - TECTONIC OVERHEAD EARTH-SHAKER SMASH (30F)", build_row2_auto_attack(tpl)),
        ("ROW 3: SKILL - MOUNTAIN ANVIL SUMMON & HOME-RUN SMASH (30F)", build_row3_skill(tpl)),
        ("ROW 4: ULTIMATE - RAGNAROK WORLD-FORGE ERUPTION (30F)", build_row4_ultimate(tpl)),
        ("ROW 5: DEATH & HURT (30F)", build_row5_death(tpl)),
        ("ROW 6: DASH - MOLTEN JUGGERNAUT STAMPEDE (30F)", build_row6_dash(tpl)),
        ("ROW 7: CROUCH - MAGMA ARMOR FORTIFY & ANVIL BULWARK (30F)", build_row7_crouch(tpl)),
        ("ROW 8: JUMP - TECTONIC BELLY-CRUSH DUNK (30F)", build_row8_jump(tpl)),
    ]

    num_rows = len(rows)
    cell_px = 208
    sheet = Image.new("RGBA", (30 * cell_px, num_rows * cell_px), (0, 0, 0, 0))

    top_clips = bot_clips = left_clips = right_clips = 0
    pinhole_frames = 0
    for r_idx, (r_name, r_frames) in enumerate(rows):
        assert len(r_frames) == 30, f"{r_name} has {len(r_frames)} frames instead of 30"
        cells_208 = []
        for c_idx in range(30):
            r_frames[c_idx] = ensure_safe_cell(r_frames[c_idx], margin=2)
            alpha52 = r_frames[c_idx][:, :, 3] > 0
            has_pinhole = False
            for py in range(2, 50):
                for px in range(2, 50):
                    if not alpha52[py, px] and alpha52[py - 1, px] and alpha52[py + 1, px] and alpha52[py, px - 1] and alpha52[py, px + 1]:
                        has_pinhole = True
                        break
                if has_pinhole:
                    break
            if has_pinhole:
                pinhole_frames += 1
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
        print(f"{r_name:62s}: 30 frames generated, {adj_diffs}/29 adjacent transitions distinct")

    print(f"Boundary clip audit across 270 frames: TOP={top_clips}, BOT={bot_clips}, LEFT={left_clips}, RIGHT={right_clips}, PINHOLES={pinhole_frames}/270")
    out_path = "/home/antigravity/assets/sprites/titan_sheet.png"
    sheet.save(out_path)
    print("Saved:", out_path, sheet.size)

    # Render zoomed-in left (F00..F14) and right (F15..F29) contact sheets in artifact directory
    preview_cell = 96
    pad_top = 24
    dbg = Image.new("RGBA", (30 * preview_cell, num_rows * (preview_cell + pad_top)), (15, 20, 30, 255))
    draw = ImageDraw.Draw(dbg)
    for r_idx, (r_name, r_frames) in enumerate(rows):
        y0 = r_idx * (preview_cell + pad_top)
        draw.rectangle([0, y0, 30 * preview_cell, y0 + pad_top - 2], fill=(26, 34, 50, 255))
        draw.text((8, y0 + 5), r_name, fill=(110, 231, 183, 255))
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
    dbg.crop((0, 0, 15 * preview_cell, dbg.height)).save(f"{art_dir}/debug_titan_30fps_left_F00_F14.png")
    dbg.crop((15 * preview_cell, 0, 30 * preview_cell, dbg.height)).save(f"{art_dir}/debug_titan_30fps_right_F15_F29.png")
    print("Saved debug contact sheets in:", art_dir)


if __name__ == "__main__":
    main()
