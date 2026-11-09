#!/usr/bin/env python3
"""
Builds Glacia's (IceMage - Cryo-Prism Sovereign) 30-Frame-Per-Animation HD-2D Sprite Sheet:
- 9 rows x 30 columns = 270 unique frames (6240 x 1872 at 208x208 per cell, 52x52 logical upscaled 4x NEAREST):
  * Row 0: IDLE - CRYO-PRISM SOVEREIGN HOVER (30 frames)
  * Row 1: WALK - GLACIAL SILK-STRIDE & ICE-GLIDE (30 frames)
  * Row 2: AUTO_ATTACK - TRIPLE CRYO-LANCE VOLLEY & PRISM SHATTER (30 frames)
  * Row 3: SKILL - HOARFROST PRISM & GLACIAL SPIKE CASCADE (30 frames)
  * Row 4: ULTIMATE - ABSOLUTE ZERO: BOREALIS CATHEDRAL (30 frames)
  * Row 5: DEATH - SHATTERED CRYO-SOVEREIGN COLLAPSE (30 frames)
  * Row 6: DASH - GLACIAL ICE-SKATE SURGE (30 frames)
  * Row 7: CROUCH - PERMAFROST BACKSTEP & SUB-ZERO RAY (30 frames)
  * Row 8: JUMP - HAILSTORM SKY-ASCENT & GLACIAL METEOR DIVE (30 frames)
- 100% Reference-Driven HD-2D Pipeline from `assets/sprites/icemage_v2_base.jpg`:
  * BFS flood-fill from image borders + enclosed white pockets + 3-pass anti-aliased fringe stripping (ZERO white halo).
  * ZERO baked black outline in Python (`PixelForge.js` adds the 1px comic ink outline + 1px exterior rim dynamically at runtime).
  * Static lowered side-arms neutralized cleanly (`neutralize_baked_side_arms`).
  * Floating 6-Crystal Borealis Snowflake / Cryo-Prism Halo Array (`x = 4..20, y = 6..32`) rendered on ALL 9 ROWS.
  * Two-Handed 23px Crystalline Snowflake-Prism Scepter gripped via 2-bone IK arms from Rear Shoulder (22, 18) and Lead Shoulder (28, 19).
"""

from collections import deque
import math
import os
import numpy as np
from PIL import Image, ImageDraw

# Palette matching Glacia's Cryo-Prism Sovereign HD-2D aesthetic (`icemage_v2_base.jpg`)
ABYSS_NAVY = (12, 18, 38, 255)
SAPPHIRE_DEEP = (18, 32, 68, 255)
SAPPHIRE_DARK = (26, 49, 102, 255)
SAPPHIRE_MID = (37, 78, 148, 255)
SAPPHIRE_BRIGHT = (56, 116, 203, 255)

GLACIER_DEEP = (14, 92, 142, 255)
GLACIER_MID = (22, 138, 198, 255)
FROST_CYAN = (56, 189, 248, 255)
FROST_BRIGHT = (125, 211, 252, 255)
FROST_LIGHT = (186, 230, 253, 255)
DIAMOND_WHITE = (240, 249, 255, 255)
PURE_WHITE = (255, 255, 255, 255)

AURORA_VIOLET = (139, 92, 246, 255)
AURORA_LAVENDER = (196, 181, 253, 255)
AURORA_MINT = (110, 231, 183, 255)

SILVER_DARK = (100, 116, 139, 255)
SILVER_MID = (148, 163, 184, 255)
SILVER_LIGHT = (203, 213, 225, 255)
FUR_SHADOW = (186, 204, 228, 255)
FUR_WHITE = (238, 246, 255, 255)


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
    out = cell.copy()
    for _ in range(3):
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

    out[:lo, :, :] = 0
    out[52 - lo :, :, :] = 0
    out[:, :lo, :] = 0
    out[:, 52 - lo :, :] = 0
    for _ in range(3):
        out = fill_layer_pinholes(out, lo, hi, lo, hi, require_3_neighbors=True)
    return out


def composite_over(base, over):
    res = base.copy()
    mask = over[:, :, 3] > 0
    res[mask] = over[mask]
    return res


def extract_clean_base_sprite(
    path="/home/antigravity/pandora523/arcane-vs-steel/assets/sprites/icemage_v2_base.jpg",
):
    """
    Loads `icemage_v2_base.jpg` (1024x1024), performs a BFS flood-fill from all 4 image borders
    plus enclosed white pockets (`y = 420..620, x = 380..640`) to strip the white background +
    3-pass anti-aliased fringe (ZERO white halo!), crops tight character bounds (`w = 395, h = 950`),
    scales cleanly into the 52x52 logical cell (`cell[4:46, 13:39]`), and plants the back boot
    (`x = 23..28, y = 38..44`) down +1px so BOTH boots plant firmly on `y = 45`.
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
    # Seed enclosed background pockets between arms and skirt/hair (y = 420..620, x = 380..640)
    for y in range(420, 620):
        for x in range(380, 640):
            r, g, b = int(arr[y, x, 0]), int(arr[y, x, 1]), int(arr[y, x, 2])
            if r > 246 and g > 246 and b > 246:
                q.append((y, x))

    def is_exterior_white(r, g, b):
        if r > 215 and g > 215 and b > 215 and (max(r, g, b) - min(r, g, b)) < 25:
            return True
        mn, mx = min(r, g, b), max(r, g, b)
        if mn > 205 and (mx - mn) < 28:
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
                    if min(r, g, b) > 165 and (max(r, g, b) - min(r, g, b)) < 45:
                        arr[y, x] = (0, 0, 0, 0)

    ys, xs = np.where(arr[:, :, 3] > 0)
    crop = Image.fromarray(arr[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1], mode="RGBA")
    scaled = crop.resize((26, 42), Image.Resampling.NEAREST)
    s_arr = np.array(scaled, dtype=np.uint8)

    cell = np.zeros((52, 52, 4), dtype=np.uint8)
    cell[4:46, 13:39] = s_arr

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
                if touches_empty and min(r, g, b) > 185 and (max(r, g, b) - min(r, g, b)) < 35:
                    cell[y, x] = (0, 0, 0, 0)

    # Plant back boot (x=23..28, y=38..44) down +1px so BOTH boots plant firmly on y=45
    back_boot = cell[38:45, 23:29].copy()
    cell[39:46, 23:29] = back_boot
    cell[38, 23:29] = back_boot[0, :]

    return fill_layer_pinholes(cell)


def neutralize_baked_side_arms(tpl_img, max_chest_x=32):
    """
    Neutralizes BOTH static lowered side-arms on Glacia's torso on ALL templates so her two-handed
    2-bone IK arms gripping the Snowflake-Prism Scepter are 100% cleanly visible with ZERO extra limbs
    or leftover hands, while preserving her flowing silver-lavender hair (`y = 10..25, x = 14..24`)
    and plush white arctic fox-fur shoulder stole (`y = 13..20, x = 20..35`):
    - Strips the hanging right arm & hand on viewer-right (`x > max_chest_x, 18 <= y <= 29`).
    - Strips the lowered left hand at `y = 24..28, x = 20..22` and blends `x = 22..24, y = 20..26`
      into her fitted midnight-sapphire & frost-cyan snowflake corset.
    """
    out = tpl_img.copy()
    for y in range(18, 30):
        lim_x = max_chest_x + 2 if y <= 19 else max_chest_x
        for x in range(lim_x + 1, 50):
            out[y, x] = (0, 0, 0, 0)

    # Strip static left hand & forearm below the hair tips (y = 23..28, x = 19..24)
    for y in range(20, 29):
        for x in range(19, 25):
            if out[y, x, 3] == 0:
                continue
            r, g, b, _ = out[y, x]
            # Preserve silver-white hair tips at y <= 24, x <= 21
            if y <= 24 and x <= 21 and b > 175 and r > 150:
                continue
            if x <= 21 and y >= 23:
                out[y, x] = (0, 0, 0, 0)
            elif x == 22 and y >= 21:
                out[y, x] = ABYSS_NAVY if y <= 25 else SAPPHIRE_DEEP
            elif x in (23, 24) and 20 <= y <= 26:
                out[y, x] = SAPPHIRE_MID if (x + y) % 2 == 0 else SAPPHIRE_DARK

    return fill_layer_pinholes(out)


def make_clean_templates():
    """
    Constructs Glacia's modular anatomical templates from the clean 52x52 base sprite:
    - `stand`: standing Cryo-Prism Sovereign with both lowered side-arms neutralized and boots planted at y=45
    - `stand_upper`: upper body, crystalline snowflake tiara, silver-lavender hair, arctic fur stole, and glacial silk skirt (`y=0..37`)
    - `leg_back` (`x=23..28`) and `leg_front` (`x=29..37`): lower silver-blue heeled ice-mage boots at `y=38..46`
    - `lunge`: forward-leaning spellcast body (+2px upper torso lean) with side-arms neutralized
    - `kneel`: dropped to one knee (y+6px) with side-arms neutralized
    - `fall`: 90-degree horizontally collapsed prone body anchored on the floor at y=35..46
    - `dash`: forward-tilted (+13 deg) Glacial Ice-Skate Surge body with side-arms neutralized
    """
    raw = extract_clean_base_sprite()
    stand = neutralize_baked_side_arms(raw, max_chest_x=32)

    # Extract lower silver-blue heeled ice-mage boots at y=38..46
    leg_back_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_front_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_back_patch[38:47, 22:29] = stand[38:47, 22:29]
    leg_front_patch[38:47, 29:37] = stand[38:47, 29:37]

    # Upper torso, tiara, flowing hair, fur stole, and upper glacial silk skirt (y=0..37)
    stand_upper = np.zeros((52, 52, 4), dtype=np.uint8)
    stand_upper[:38, :] = stand[:38, :]
    stand_upper = fill_layer_pinholes(stand_upper)

    # Forward-leaning lunge body (+2px upper-body lean)
    lunge = np.zeros((52, 52, 4), dtype=np.uint8)
    lunge[32:46, :] = stand[32:46, :]
    for y in range(4, 32):
        dx = 2 if y <= 25 else 1
        for x in range(13, 47):
            if stand[y, x, 3] > 0 and x + dx <= 49:
                lunge[y, x + dx] = stand[y, x]
    lunge = neutralize_baked_side_arms(lunge, max_chest_x=34)
    lunge = fill_layer_pinholes(lunge)

    # Kneeling body (torso dropped +6px onto bent knees planted at y=45)
    kneel = np.zeros((52, 52, 4), dtype=np.uint8)
    kneel[38:46, 18:38] = stand[38:46, 18:38]
    for y in range(4, 35):
        ny = y + 6
        if ny < 45:
            for x in range(13, 46):
                if stand[y, x, 3] > 0:
                    kneel[ny, x] = stand[y, x]
    kneel = fill_layer_pinholes(kneel)

    # Horizontally collapsed prone body (90-degree rotated flat on the floor at y=35..45)
    pil_body = Image.fromarray(stand, mode="RGBA")
    rot_90 = np.array(
        pil_body.rotate(-88.0, resample=Image.Resampling.NEAREST, center=(27, 29)),
        dtype=np.uint8,
    )
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

    # Dash body (+13 deg forward Glacial Ice-Skate tilt)
    pil_stand = Image.fromarray(stand, mode="RGBA")
    rot_dash = np.array(
        pil_stand.rotate(-13.0, resample=Image.Resampling.NEAREST, center=(27, 35)),
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
                    nx = max(13, min(48, x))
                    dash[ny, nx] = rot_dash[y, x]
    dash = neutralize_baked_side_arms(dash, max_chest_x=34)
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


def apply_hair_and_skirt_wave(
    frame,
    phase_rad,
    amplitude=1.5,
    vertical_flutter=0.6,
    is_dash=False,
    rune_pulse=0.5,
):
    """
    Animates Glacia's flowing silver-white & icy-lavender hair (`x=13..24, y=9..25`),
    snowflake tiara centerpiece & luminous cyan eyes (`y=5..12, x=26..33`),
    and pulsing frost-cyan snowflake runes on her corset & layered silk skirt (`y=18..37, x=24..33`).
    """
    out = frame.copy()

    # 1. Flowing Silver-White & Icy-Lavender Hair wave behind neck/fur stole (x=13..24, y=9..25)
    hair_mask = np.zeros((52, 52), dtype=bool)
    for y in range(9, 26):
        for x in range(13, 25):
            if frame[y, x, 3] > 0:
                r, g, b, _ = frame[y, x]
                if b > 155 and r > 135 and g > 140:
                    hair_mask[y, x] = True

    hair_src = frame.copy()
    out[hair_mask] = 0
    for y in range(9, 26):
        dy_h = int(round(math.sin(phase_rad * 1.4 - (y - 9) * 0.38) * 0.7))
        dx_h = int(round((-0.8 if is_dash else 0.0) + math.cos(phase_rad - (y - 9) * 0.35) * 0.6))
        for x in range(13, 25):
            if not hair_mask[y, x]:
                continue
            nx = max(12, min(25, x + dx_h))
            ny = max(6, min(27, y + dy_h))
            out[ny, nx] = hair_src[y, x]
            if x >= 21 and out[y, x, 3] == 0:
                out[y, x] = hair_src[y, x]

    out = fill_layer_pinholes(out, x0=12, x1=37, y0=5, y1=39, require_3_neighbors=False)

    # 2. Pulsing Snowflake Tiara Gem (y=5..8, x=27..32) & Luminous Frost-Cyan Eyes (y=10..12, x=28..32)
    if rune_pulse > 0.45:
        set_px(out, 29, 6, PURE_WHITE if rune_pulse > 0.75 else FROST_LIGHT)
        set_px(out, 30, 6, FROST_CYAN if rune_pulse > 0.75 else GLACIER_MID)
        for rx_p, ry_p in [(28, 19), (30, 22), (27, 27), (31, 31), (26, 34)]:
            if out[ry_p, rx_p, 3] > 0:
                out[ry_p, rx_p] = DIAMOND_WHITE if rune_pulse > 0.82 else FROST_BRIGHT

    return fill_layer_pinholes(out)


def draw_borealis_prism_halo(
    canvas,
    attach_xy=(21, 17),
    halo_span=1.0,
    pulse_phase=0.0,
    top_min_y=5,
    bot_max_y=32,
    sovereign_mode=False,
    skate_swept=False,
):
    """
    Renders Glacia's Floating 6-Crystal Borealis Snowflake / Cryo-Prism Halo Array (`x = 4..20, y = 5..32`)
    levitating behind her plush arctic fur stole:
    - Glowing Frost-Cyan & Aurora-Violet Crystalline Halo Ring segment behind her shoulders (`x = 13..20, y = 10..26`)
    - 6 Faceted Diamond Ice-Crystals radiating outward in a crescent snowflake fan (`x = 4..19, y = 5..31`)
      with monotonic X progression so every crystal terminates in a crisp 1px diamond-white tip!
    """
    halo = np.zeros((52, 52, 4), dtype=np.uint8)
    ax, ay = int(round(attach_xy[0])), int(round(attach_xy[1]))
    hover_dy = math.sin(pulse_phase) * 1.3
    span_clamp = max(0.84, min(1.08, halo_span))

    # 1. Crystalline Borealis Halo Arch behind shoulders (ax, ay) -> upper prism nexus (nexus_x, nexus_y)
    nexus_x = max(13, min(18, int(round(ax - 6.0 * span_clamp))))
    nexus_y = max(top_min_y + 2, min(bot_max_y - 10, int(round(ay - 6.5 + hover_dy * 0.5))))

    if skate_swept:
        # Swept-back aerodynamic ice-crystal fins for Row 6 Glacial Ice-Skate Dash
        crystals = [
            (7, max(top_min_y + 1, ay - 8), 1.6, PURE_WHITE, FROST_LIGHT),
            (4, max(top_min_y + 4, ay - 4), 2.0, DIAMOND_WHITE, FROST_CYAN),
            (5, ay + 1, 1.5, FROST_LIGHT, GLACIER_MID),
            (8, min(bot_max_y - 4, ay + 6), 1.0, FROST_CYAN, AURORA_LAVENDER),
            (12, min(bot_max_y, ay + 10), 0.6, FROST_BRIGHT, SAPPHIRE_BRIGHT),
        ]
    elif sovereign_mode:
        # Grand 6-Crystal Absolute Zero Borealis Sovereign Halo
        crystals = [
            (7, max(top_min_y, 5), 1.8, PURE_WHITE, FROST_LIGHT),
            (4, max(top_min_y + 3, 9), 2.3, PURE_WHITE, FROST_CYAN),
            (5, 14, 2.0, DIAMOND_WHITE, AURORA_LAVENDER),
            (6, 19, 1.6, FROST_LIGHT, FROST_CYAN),
            (9, 24, 1.1, FROST_CYAN, GLACIER_MID),
            (13, min(bot_max_y, 29), 0.7, FROST_BRIGHT, SAPPHIRE_BRIGHT),
        ]
    else:
        # Standard 6-Crystal Borealis Snowflake / Cryo-Prism Halo Array
        crystals = [
            (8, max(top_min_y, 6), 1.7, PURE_WHITE, FROST_LIGHT),
            (4, max(top_min_y + 3, 10), 2.2, DIAMOND_WHITE, FROST_CYAN),
            (5, 15, 1.8, FROST_LIGHT, AURORA_LAVENDER),
            (7, 20, 1.4, FROST_CYAN, GLACIER_MID),
            (10, 25, 0.9, FROST_BRIGHT, SAPPHIRE_BRIGHT),
            (13, min(bot_max_y - 1, 29), 0.5, FROST_LIGHT, SAPPHIRE_MID),
        ]

    # Draw glowing crystalline Borealis Halo Ring arc connecting the crystal roots
    arch_steps = 18
    for s in range(arch_steps + 1):
        u_a = s / float(arch_steps)
        ctrl_ax = ax * 0.45 + nexus_x * 0.55
        ctrl_ay = min(ay, nexus_y) - 1.6
        bx = (1.0 - u_a) ** 2 * ax + 2.0 * (1.0 - u_a) * u_a * ctrl_ax + (u_a ** 2) * nexus_x
        by = (1.0 - u_a) ** 2 * (ay - 1) + 2.0 * (1.0 - u_a) * u_a * ctrl_ay + (u_a ** 2) * nexus_y
        set_px(halo, bx, max(top_min_y, by - 1.0), SAPPHIRE_DEEP)
        set_px(halo, bx, by, PURE_WHITE if u_a > 0.35 else FROST_LIGHT)
        set_px(halo, bx, by + 1.0, FROST_CYAN if u_a > 0.5 else AURORA_LAVENDER)
        set_px(halo, bx + 0.8, by + 2.0, GLACIER_MID)

    # 2. Render each faceted Borealis Ice-Crystal Spike with monotonic X progression
    num_c = len(crystals)
    for c_idx, (tx_base, ty_base, arch_lift_y, col_ridge, col_facet) in enumerate(crystals):
        tx = int(round(ax - (ax - tx_base) * span_clamp))
        min_x_cryst = [6, 4, 5, 6, 9, 12][min(c_idx, 5)]
        tx = max(min_x_cryst, min(18, tx))
        ty = int(round(ty_base + hover_dy * (1.0 - c_idx * 0.14)))
        ty = max(top_min_y, min(bot_max_y - 1, ty))

        t_root = c_idx / float(max(1, num_c - 1))
        orig_x = nexus_x + (ax - nexus_x) * (t_root * 0.82)
        orig_y = nexus_y + (ay - nexus_y + 3.0) * t_root

        ctrl_x = orig_x * 0.48 + tx * 0.52
        ctrl_y = (orig_y + ty) * 0.5 - arch_lift_y

        steps = max(16, int(max(abs(orig_x - tx), abs(orig_y - ty)) * 2.2))
        for s in range(steps + 1):
            u = s / float(steps)
            wx = (1.0 - u) ** 2 * orig_x + 2.0 * (1.0 - u) * u * ctrl_x + (u ** 2) * tx
            wy = (1.0 - u) ** 2 * orig_y + 2.0 * (1.0 - u) * u * ctrl_y + (u ** 2) * ty
            wx = max(3.0, min(20.0, wx))
            wy = max(float(top_min_y), min(float(bot_max_y - 1), wy))

            q_col = PURE_WHITE if (u > 0.72 and c_idx <= 2) else col_ridge
            set_px(halo, wx, wy, q_col)
            if c_idx == 0 and u < 0.78 and wy - 1.0 >= top_min_y:
                set_px(halo, wx, wy - 1.0, SAPPHIRE_DEEP)

            # Tapered diamond crystal facet thickness
            facet_depth = 2 if u < 0.40 else (1 if u < 0.70 else 0)
            for m_dy in range(1, facet_depth + 1):
                my = min(float(bot_max_y), wy + m_dy)
                if m_dy == 1:
                    col_m = col_facet if (int(round(wx)) + c_idx) % 2 == 0 else FROST_CYAN
                else:
                    col_m = GLACIER_MID if c_idx <= 1 else SAPPHIRE_MID
                set_px(halo, wx, my, col_m)

        # Crisp 1px pointed diamond-white crystal tip at (tx, ty)
        set_px(halo, tx, ty, PURE_WHITE if c_idx <= 2 else FROST_LIGHT)

    # 3. Gleaming Snowflake Star-Node at Upper Prism Nexus (nexus_x, nexus_y)
    set_px(halo, nexus_x, nexus_y, PURE_WHITE)
    set_px(halo, max(5, nexus_x - 1), max(top_min_y, nexus_y - 1), FROST_LIGHT)
    set_px(halo, min(20, nexus_x + 1), nexus_y, FROST_CYAN)
    set_px(halo, nexus_x, min(bot_max_y, nexus_y + 1), AURORA_LAVENDER)

    halo = fill_layer_pinholes(halo, x0=13, x1=21, y0=top_min_y, y1=bot_max_y + 1, require_3_neighbors=True)
    return composite_over(halo, canvas)


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


def draw_ik_icemage_arm(layer, sx, sy, hx, hy, L1=5.6, L2=5.4, bend_side=1.0, is_rear=False):
    """
    Draws Glacia's 2-Bone Inverse Kinematics (IK) Midnight-Sapphire & Frost-Silk Sleeve Arm extending from
    shoulder `(sx, sy)` to Snowflake-Prism Scepter grip `(hx, hy)`:
    - When `is_rear=True`: Rear Silk-Sleeve Arm & Frost Glove from Rear Shoulder `(22, 18)` to the rear shaft grip.
    - When `is_rear=False`: Lead Silk-Sleeve Arm & Arctic Fur Shoulder Cuff from Lead Shoulder `(28, 19)`
      to the forward shaft grip with silver-frost elbow trim and `3x3` frost-silk glove.
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
            (-1.0, ABYSS_NAVY),
            (-0.4, SAPPHIRE_DARK),
            (0.0, SAPPHIRE_MID),
            (0.5, GLACIER_MID),
            (1.0, SAPPHIRE_DEEP),
        ]:
            draw_line_px(layer, sx + n1x * off, sy + n1y * off, ex + n1x * (off * 0.85), ey + n1y * (off * 0.85), col)

        for off, col in [
            (-1.0, ABYSS_NAVY),
            (-0.4, SAPPHIRE_MID),
            (0.0, FROST_CYAN),
            (0.5, SAPPHIRE_DARK),
            (1.0, SAPPHIRE_DEEP),
        ]:
            draw_line_px(layer, ex + n2x * off, ey + n2y * off, hx + n2x * (off * 0.85), hy + n2y * (off * 0.85), col)

        for dy_s in (-1, 0, 1):
            for dx_s in (-1, 0, 1):
                set_px(layer, sx + dx_s, sy + dy_s, FUR_WHITE if dy_s == -1 else SAPPHIRE_MID)
        set_px(layer, ex, ey, FROST_LIGHT)
    else:
        for off, col in [
            (-1.1, ABYSS_NAVY),
            (-0.5, SAPPHIRE_MID),
            (0.0, SAPPHIRE_BRIGHT),
            (0.5, FROST_CYAN),
            (1.1, SAPPHIRE_DEEP),
        ]:
            draw_line_px(layer, sx + n1x * off, sy + n1y * off, ex + n1x * (off * 0.85), ey + n1y * (off * 0.85), col)

        for off, col in [
            (-1.1, SAPPHIRE_DEEP),
            (-0.5, SAPPHIRE_BRIGHT),
            (0.0, FROST_LIGHT),
            (0.5, GLACIER_MID),
            (1.1, SAPPHIRE_DARK),
        ]:
            draw_line_px(layer, ex + n2x * off, ey + n2y * off, hx + n2x * (off * 0.85), hy + n2y * (off * 0.85), col)

        # Plush white arctic fox-fur shoulder stole cuff over Lead Shoulder (sx, sy)
        for p_step in (-1.4, -0.7, 0.0, 0.7, 1.4):
            for r_step in (-0.6, 0.2, 0.9):
                px_s = sx + ux1 * r_step + n1x * p_step
                py_s = sy + uy1 * r_step + n1y * p_step
                if abs(p_step) >= 1.2 or r_step <= -0.3:
                    col_p = FUR_WHITE
                elif abs(p_step) >= 0.6:
                    col_p = FROST_LIGHT
                else:
                    col_p = FUR_SHADOW
                set_px(layer, px_s, py_s, col_p)
        set_px(layer, sx, sy - 1, PURE_WHITE)

        set_px(layer, ex, ey, DIAMOND_WHITE)
        set_px(layer, ex + n1x * 0.8, ey + n1y * 0.8, FROST_CYAN)
        set_px(layer, ex - n1x * 0.8, ey - n1y * 0.8, SAPPHIRE_DARK)

    # 3x3 Frost-Silk & Silver-Trimmed Spellcaster Glove at (hx, hy)
    for dy_g in (-1, 0, 1):
        for dx_g in (-1, 0, 1):
            if dx_g == 0 and dy_g == -1:
                col_g = PURE_WHITE if not is_rear else FROST_LIGHT
            elif dy_g <= 0:
                col_g = FROST_CYAN if not is_rear else SAPPHIRE_BRIGHT
            else:
                col_g = SILVER_LIGHT if not is_rear else SAPPHIRE_DEEP
            set_px(layer, hx + dx_g, hy + dy_g, col_g)

    return ex, ey


def draw_snowflake_prism_scepter(
    canvas,
    hand_x,
    hand_y,
    angle_deg,
    glow_intensity=1.0,
    scale=1.0,
    shoulder_rear=(22, 18),
    shoulder_lead=(28, 19),
    draw_arm=True,
    cleave_arc=None,
    blizzard_cone=False,
    phase=0.0,
):
    """
    Renders Glacia's regal Two-Handed Crystalline Snowflake-Prism Scepter (`~23px` total length):
    - Silver-sapphire & frost-ringed glacial staff shaft (`14px` from diamond pommel spike to snowflake collar)
    - Ornate Twin-Crescent Snowflake Crossguard Collar (`fluke_span = 3.5px`)
    - `9px` Star-Cut Borealis Diamond-Prism Head & Tapered Glacial Spear-Tip (`14 + 9 = 23px` total length!)
    - Gripped by BOTH hands connected via 2-bone IK arms from Rear Shoulder `(22, 18)` and Lead Shoulder `(28, 19)`!
    - Rigidly clamped inside `4.0 <= x <= 47.0, 4.0 <= y <= 45.5` so `0/270` boundary clips ever occur.
    """
    rear_arm_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    scepter_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    rear_glove_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    lead_arm_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    fx_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    rad = math.radians(angle_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    px, py = -uy, ux

    pom_dist = 3.8 * scale
    grip_sep = 5.2 * scale
    lead_to_collar = 5.2 * scale
    prism_len = 8.8 * scale
    fluke_span = 3.5 * scale

    lead_gx = float(max(26.0, min(36.0, hand_x)))
    lead_gy = float(max(13.0, min(35.0, hand_y)))
    rear_gx = lead_gx - ux * grip_sep
    rear_gy = lead_gy - uy * grip_sep

    pom_x = rear_gx - ux * pom_dist
    pom_y = rear_gy - uy * pom_dist
    collar_x = lead_gx + ux * lead_to_collar
    collar_y = lead_gy + uy * lead_to_collar
    tip_x = collar_x + ux * prism_len
    tip_y = collar_y + uy * prism_len

    pts_x = [
        pom_x,
        tip_x,
        collar_x + px * fluke_span,
        collar_x - px * fluke_span,
        tip_x + px * 1.6,
        tip_x - px * 1.6,
    ]
    pts_y = [
        pom_y,
        tip_y,
        collar_y + py * fluke_span,
        collar_y - py * fluke_span,
        tip_y + py * 1.6,
        tip_y - py * 1.6,
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

    # 1. Silver-Sapphire & Frost-Ringed Glacial Scepter Shaft (pommel -> collar)
    shaft_steps = int(round(math.hypot(collar_x - pom_x, collar_y - pom_y) * 2.8))
    for i in range(shaft_steps + 1):
        u_s = i / float(max(1, shaft_steps))
        sx_p = pom_x + (collar_x - pom_x) * u_s
        sy_p = pom_y + (collar_y - pom_y) * u_s
        ring_band = (i % 5 == 0)
        sapphire_wrap = (0.25 <= u_s <= 0.68) and (i % 2 == 1)
        c_core = DIAMOND_WHITE if ring_band else (SAPPHIRE_BRIGHT if sapphire_wrap else SILVER_LIGHT)
        c_edge = FROST_CYAN if ring_band else SAPPHIRE_DARK
        set_px(scepter_layer, sx_p, sy_p, c_core)
        set_px(scepter_layer, sx_p + px * 0.6, sy_p + py * 0.6, c_edge)
        set_px(scepter_layer, sx_p - px * 0.6, sy_p - py * 0.6, ABYSS_NAVY)

    # Frost-Diamond Pommel Finial at (pom_x, pom_y)
    set_px(scepter_layer, pom_x, pom_y, PURE_WHITE)
    set_px(scepter_layer, pom_x - ux * 0.8, pom_y - uy * 0.8, FROST_CYAN)
    set_px(scepter_layer, pom_x + px * 0.7, pom_y + py * 0.7, AURORA_LAVENDER)

    # 2. Ornate Twin-Crescent Snowflake Crossguard Collar at (collar_x, collar_y)
    for side in (-1.0, 1.0):
        for w_i in range(1, 8):
            u_w = w_i / 7.0
            lat = side * u_w * fluke_span
            fwd_curve = math.sin(u_w * math.pi) * 1.5 * scale
            wx = collar_x + px * lat + ux * fwd_curve
            wy = collar_y + py * lat + uy * fwd_curve
            set_px(scepter_layer, wx, wy, PURE_WHITE if u_w > 0.68 else FROST_LIGHT)
            bx = collar_x + px * (lat * 0.90) - ux * (u_w * 1.4 * scale)
            by = collar_y + py * (lat * 0.90) - uy * (u_w * 1.4 * scale)
            set_px(scepter_layer, bx, by, FROST_CYAN if u_w < 0.65 else AURORA_LAVENDER)

    set_px(scepter_layer, collar_x, collar_y, PURE_WHITE)
    set_px(scepter_layer, collar_x + ux * 0.7, collar_y + uy * 0.7, FROST_CYAN)

    # 3. 9px Star-Cut Borealis Diamond-Prism Head & Tapered Glacial Spear-Tip (collar_x/y -> tip_x/y)
    blade_steps = int(round(prism_len * 3.5))
    for bi in range(blade_steps + 1):
        u_b = bi / float(max(1, blade_steps))
        bx_c = collar_x + ux * (u_b * prism_len)
        by_c = collar_y + uy * (u_b * prism_len)
        if u_b < 0.30:
            half_w = (0.45 + 0.55 * (u_b / 0.30)) * 2.5 * scale
        else:
            half_w = (1.0 - (u_b - 0.30) / 0.70) * 2.5 * scale

        w_steps = max(1, int(round(half_w * 3.0)))
        for wi in range(-w_steps, w_steps + 1):
            w_off = (wi / float(w_steps)) * half_w if half_w > 0.15 else 0.0
            px_b = bx_c + px * w_off
            py_b = by_c + py * w_off
            aw = abs(w_off) / max(0.15, half_w)
            if u_b > 0.84 or abs(w_off) < 0.34:
                col_b = PURE_WHITE if (glow_intensity >= 0.95 or u_b > 0.88) else FROST_LIGHT
            elif aw > 0.72:
                col_b = DIAMOND_WHITE if (glow_intensity >= 1.1 and u_b > 0.45) else FROST_BRIGHT
            else:
                col_b = FROST_CYAN if wi >= 0 else (AURORA_LAVENDER if (bi + wi) % 2 == 0 else GLACIER_MID)
            set_px(scepter_layer, px_b, py_b, col_b)

    # 4. BOTH Hands Grip the Scepter Shaft via 2-Bone IK Arms:
    if draw_arm and shoulder_rear is not None and shoulder_lead is not None:
        sx_rear = float(max(17.0, min(26.0, shoulder_rear[0])))
        sy_rear = float(max(13.0, min(36.0, shoulder_rear[1])))
        draw_ik_icemage_arm(
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
        for dy_g in (-1, 0, 1):
            for dx_g in (-1, 0, 1):
                col_rg = FROST_LIGHT if (dx_g == 0 and dy_g == -1) else (FROST_CYAN if dy_g <= 0 else SAPPHIRE_DARK)
                set_px(rear_glove_layer, rear_gx + dx_g, rear_gy + dy_g, col_rg)

        sx_lead = float(max(24.0, min(34.0, shoulder_lead[0])))
        sy_lead = float(max(13.0, min(36.0, shoulder_lead[1])))
        draw_ik_icemage_arm(
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
                        lead_arm_layer[y_a, x_a] = ABYSS_NAVY

    # 5. Orbiting Diamond Frost-Motes at the Snowflake-Prism Head
    if glow_intensity > 0.85:
        num_motes = 5 if glow_intensity >= 1.2 else 3
        for e_i in range(num_motes):
            u_e = (e_i + 1) / float(num_motes + 1)
            bx_e = collar_x + ux * (u_e * prism_len)
            by_e = collar_y + uy * (u_e * prism_len)
            e_ang = phase * 1.8 + e_i * 2.1
            ex_e = max(4.0, min(47.0, bx_e + math.cos(e_ang) * 2.3))
            ey_e = max(4.0, min(43.0, by_e - 1.5 - (e_i % 2) + math.sin(e_ang) * 1.3))
            set_px(fx_layer, ex_e, ey_e, PURE_WHITE if e_i % 2 == 0 else FROST_CYAN)
            if glow_intensity >= 1.1:
                set_px(fx_layer, ex_e, max(4.0, ey_e - 1.0), FROST_LIGHT if e_i % 2 == 0 else AURORA_LAVENDER)

    # 6. Spiraling Sub-Zero Blizzard Vortex Cone around the Scepter Head
    if blizzard_cone:
        for d_i in range(18):
            u_d = d_i / 17.0
            cx_d = collar_x - ux * 2.5 + ux * (u_d * (prism_len + 3.5))
            cy_d = collar_y - uy * 2.5 + uy * (u_d * (prism_len + 3.5))
            cone_r = (1.0 - u_d * 0.76) * 4.5
            spiral_a = phase * 3.2 + u_d * math.pi * 4.5
            for strand in (0, 1):
                sa = spiral_a + strand * math.pi
                off_p = math.sin(sa) * cone_r
                sx_c = max(4.0, min(47.0, cx_d + px * off_p))
                sy_c = max(4.0, min(43.5, cy_d + py * off_p))
                col_c = PURE_WHITE if strand == 0 and d_i % 2 == 0 else (FROST_LIGHT if strand == 0 else FROST_CYAN)
                set_px(fx_layer, sx_c, sy_c, col_c)
                set_px(
                    fx_layer,
                    max(4.0, min(47.0, sx_c - ux * 0.8)),
                    max(4.0, min(43.5, sy_c - uy * 0.8)),
                    AURORA_LAVENDER if strand == 1 else GLACIER_MID,
                )

    # 7. Optional 3-Band Diamond-White, Frost-Cyan & Aurora-Violet Borealis Crescent Trail
    if cleave_arc is not None:
        a_start, a_end, arc_r, arc_int = cleave_arc
        arc_steps = 46
        piv_x = float(shoulder_lead[0]) if shoulder_lead is not None else 28.0
        piv_y = max(20.0, float(shoulder_lead[1]) + 2.0 if shoulder_lead is not None else 21.0)
        r_uniform = min(float(arc_r), piv_y - 4.5, 47.0 - piv_x, 43.0 - piv_y)
        r_uniform = max(12.0, r_uniform)
        for k in range(arc_steps + 1):
            u_a = k / float(arc_steps)
            ang = math.radians(a_start + (a_end - a_start) * u_a)
            ca, sa = math.cos(ang), math.sin(ang)
            env = math.sin(u_a * math.pi) * arc_int
            if env <= 0.1:
                continue
            ax = max(4.0, min(47.0, piv_x + ca * r_uniform))
            ay = max(4.0, min(43.5, piv_y + sa * r_uniform))
            set_px(fx_layer, ax, ay, PURE_WHITE if u_a > 0.45 else FROST_LIGHT)
            set_px(
                fx_layer,
                max(4.0, min(47.0, ax - ca * 1.2)),
                max(4.0, min(43.5, ay - sa * 1.2)),
                FROST_CYAN if k % 2 == 0 else FROST_BRIGHT,
            )
            if env > 0.35:
                set_px(
                    fx_layer,
                    max(4.0, min(47.0, ax - ca * 2.4)),
                    max(4.0, min(43.5, ay - sa * 2.4)),
                    AURORA_LAVENDER if k % 3 == 0 else GLACIER_MID,
                )
                set_px(
                    fx_layer,
                    max(4.0, min(47.0, ax - ca * 3.5)),
                    max(4.0, min(43.5, ay - sa * 3.5)),
                    SAPPHIRE_MID,
                )

    out = composite_over(canvas, rear_arm_layer)
    out = composite_over(out, scepter_layer)
    if angle_deg < -86.0:
        for yh in range(4, 16):
            for xh in range(23, 33):
                if canvas[yh, xh, 3] > 0:
                    out[yh, xh] = canvas[yh, xh]
    out = composite_over(out, rear_glove_layer)
    out = composite_over(out, lead_arm_layer)
    out = composite_over(out, fx_layer)
    return out


def _draw_icemage_boot_leg(
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
    Draws Glacia's sapphire-silk thigh & knee-high silver-blue heeled ice-mage boot.
    """
    if is_far_leg:
        c_edge = ABYSS_NAVY
        c_dark = SAPPHIRE_DEEP
        c_mid = SAPPHIRE_DARK
        c_hi = SAPPHIRE_MID
        c_trim = GLACIER_MID
        c_knee = FROST_CYAN
    else:
        c_edge = ABYSS_NAVY
        c_dark = SAPPHIRE_DARK
        c_mid = SAPPHIRE_MID
        c_hi = SAPPHIRE_BRIGHT
        c_trim = FROST_BRIGHT
        c_knee = PURE_WHITE

    thigh_strips = [
        (-2.0, c_edge),
        (-1.3, c_dark),
        (-0.6, c_mid),
        (0.0, c_hi),
        (0.7, c_trim),
        (1.4, c_mid),
        (2.0, c_edge),
    ]
    for off_x, col in thigh_strips:
        draw_line_px(layer, hip_x + off_x, hip_y, knee_x + off_x * 0.9, knee_y, col)

    shin_strips = [
        (-1.9, c_edge),
        (-1.2, c_dark),
        (-0.5, c_mid),
        (0.1, c_hi),
        (0.7, c_trim),
        (1.3, c_dark),
        (1.9, c_edge),
    ]
    for off_x, col in shin_strips:
        draw_line_px(layer, knee_x + off_x * 0.9, knee_y, ank_x + off_x * 0.85, ank_y, col)

    pil_boot = Image.fromarray(boot_patch, mode="RGBA")
    rot_boot = np.array(
        pil_boot.rotate(boot_rot_deg, resample=Image.Resampling.NEAREST, center=(orig_cx, 42.5)),
        dtype=np.uint8,
    )
    for y in range(36, 50):
        for x in range(3, 50):
            if rot_boot[y, x, 3] > 0:
                ny = min(45, max(24, y + int(round(dy_boot))))
                nx = min(48, max(3, x + int(round(dx_boot))))
                px_col = rot_boot[y, x].copy()
                if is_far_leg:
                    px_col[0] = int(px_col[0] * 0.80)
                    px_col[1] = int(px_col[1] * 0.82)
                    px_col[2] = int(px_col[2] * 0.86)
                layer[ny, nx] = px_col

    # Crystalline frost knee-gem cuff
    for dy_k in (-1, 0, 1):
        for dx_k in (-2, -1, 0, 1, 2):
            if abs(dx_k) == 2 and dy_k == 1:
                continue
            if dy_k == -1 or abs(dx_k) == 2:
                col_k = c_knee if (dy_k == -1 and dx_k == 0) else c_trim
            else:
                col_k = c_hi if dx_k == 0 else c_mid
            set_px(layer, knee_x + dx_k, knee_y + dy_k, col_k)

    return fill_layer_pinholes(layer, x0=3, x1=49, y0=22, y1=48, require_3_neighbors=False)


def render_walk_icemage(tpl, f):
    """
    Row 1 helper: Smooth 30-frame Glacial Silk-Stride & Ice-Glide cycle (`F00..F14` Step A, `F15..F29` Step B)
    with revolving 6-Crystal Borealis Halo (`halo_span = 1.04`) and flowing silver-lavender hair.
    """
    phase = (f / 30.0) * 2.0 * math.pi
    bob_y = int(round(math.cos(phase * 2.0) * 1.0)) - 1

    stand = tpl["stand"].copy()
    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    skirt_overlay = np.zeros((52, 52, 4), dtype=np.uint8)

    for y in range(0, 38):
        ny = y + bob_y
        if not (2 <= ny <= 49):
            continue
        min_tx = 13 if y < 25 else 20
        max_tx = 37
        for x in range(min_tx, max_tx):
            if stand[y, x, 3] > 0:
                torso_layer[ny, x] = stand[y, x]
                if (27 <= y <= 34 and 22 <= x <= 34) or (27 <= y <= 37 and 25 <= x <= 31):
                    skirt_overlay[ny, x] = stand[y, x]

    def build_striding_leg(boot_patch, orig_cx, hip_x, foot_base_x, swing_phase, is_far_leg=False):
        layer = np.zeros((52, 52, 4), dtype=np.uint8)
        s_val = math.sin(swing_phase)
        c_val = math.cos(swing_phase)

        knee_lift = max(0.0, c_val)
        hip_y = 33.5 + bob_y
        knee_x = hip_x + s_val * 2.3 + knee_lift * 1.1
        knee_y = hip_y + 4.5 - knee_lift * 1.7

        foot_target_x = foot_base_x + s_val * 2.6 - knee_lift * 0.7
        foot_lift_dy = bob_y - int(round(knee_lift * 2.0))
        boot_rot_deg = s_val * 8.5 - knee_lift * 11.0

        dx_boot = foot_target_x - orig_cx
        ank_x = foot_target_x + math.sin(math.radians(boot_rot_deg)) * 0.6
        ank_y = 42.0 + foot_lift_dy

        return _draw_icemage_boot_leg(
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
        tpl["leg_back"], orig_cx=25.0, hip_x=25.5, foot_base_x=25.0, swing_phase=phase + math.pi, is_far_leg=True
    )
    near_leg = build_striding_leg(
        tpl["leg_front"], orig_cx=32.5, hip_x=31.5, foot_base_x=32.5, swing_phase=phase, is_far_leg=False
    )

    out = composite_over(far_leg, torso_layer)
    out = composite_over(out, near_leg)
    out = composite_over(out, skirt_overlay)
    out = apply_hair_and_skirt_wave(out, phase, amplitude=1.4, vertical_flutter=0.5, rune_pulse=0.75)
    out = draw_borealis_prism_halo(
        out,
        attach_xy=(21, 17 + bob_y),
        halo_span=1.04 + 0.04 * math.sin(phase * 2.0),
        pulse_phase=phase * 2.0,
        top_min_y=6,
        bot_max_y=32,
    )
    return fill_layer_pinholes(out)


def make_crouch_icemage(tpl, crouch_depth):
    """
    Constructs Glacia's compressed knee-bend posture (`d = 1..5`) via vertical compression on `tpl['stand']`.
    """
    stand = tpl["stand"]
    d = max(0, min(6, int(round(crouch_depth))))
    if d <= 0:
        return stand.copy()

    canvas = np.zeros((52, 52, 4), dtype=np.uint8)
    for ny in range(d, 29 + d):
        sy = ny - d
        if 0 <= sy <= 28 and 2 <= ny <= 49:
            canvas[ny, :] = stand[sy, :]

    span = max(1.0, float(43 - (29 + d)))
    for ny in range(29 + d, 44):
        u = (ny - (29 + d)) / span
        sy = int(round(28.0 + u * 15.0))
        sy = max(28, min(43, sy))
        knee_dx = 1 if (d >= 2 and 0.25 <= u <= 0.75) else 0
        for x in range(13, 50):
            if stand[sy, x, 3] > 0:
                nx = min(49, x + knee_dx)
                canvas[ny, nx] = stand[sy, x]

    for ny in range(44, 50):
        canvas[ny, :] = stand[ny, :]

    return fill_layer_pinholes(canvas)


def make_aerial_icemage(
    tpl,
    jump_dy,
    body_tilt_deg=0.0,
    leg_tuck=0.5,
    halo_span=1.0,
    phase=0.0,
    sovereign_mode=False,
    skate_swept=False,
):
    """
    Constructs Glacia's airborne Cryo-Sovereign posture (`jump_dy = -3..+2`) with her
    Floating 6-Crystal Borealis Snowflake Halo (`x = 4..20, y = 5..32`) and articulated heeled ice-boots.
    """
    stand = tpl["stand"].copy()
    dy_i = max(-3, min(3, int(round(jump_dy))))
    t = max(0.0, min(1.0, leg_tuck))

    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    skirt_overlay = np.zeros((52, 52, 4), dtype=np.uint8)

    lean_dx = 1 if body_tilt_deg > 5.0 else (-1 if body_tilt_deg < -5.0 else 0)
    for y in range(0, 38):
        ny = max(3, min(46, y + dy_i))
        dx = lean_dx if y <= 24 else 0
        min_tx = 13 if y < 25 else 20
        max_tx = 37
        for x in range(min_tx, max_tx):
            if stand[y, x, 3] > 0:
                nx = max(3, min(48, x + dx))
                torso_layer[ny, nx] = stand[y, x]
                if (27 <= y <= 34 and 22 <= x <= 34) or (27 <= y <= 37 and 25 <= x <= 31):
                    skirt_overlay[ny, nx] = stand[y, x]

    hip_y = 33.5 + dy_i

    def build_aerial_leg(boot_patch, orig_cx, hip_x, knee_dx, knee_dy, foot_dx, foot_dy, boot_rot_deg, is_far_leg=False):
        layer = np.zeros((52, 52, 4), dtype=np.uint8)
        kx = hip_x + knee_dx
        ky = hip_y + knee_dy
        ax = orig_cx + foot_dx
        ay = 42.0 + foot_dy
        return _draw_icemage_boot_leg(
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
        orig_cx=25.0,
        hip_x=25.5,
        knee_dx=-1.0 - 1.0 * t,
        knee_dy=4.5 - 1.8 * t,
        foot_dx=-0.5 - 1.0 * t,
        foot_dy=dy_i - 2.2 * t,
        boot_rot_deg=-10.0 * t,
        is_far_leg=True,
    )
    near_leg = build_aerial_leg(
        tpl["leg_front"],
        orig_cx=32.5,
        hip_x=31.5,
        knee_dx=1.5 + 1.2 * t,
        knee_dy=4.0 - 2.2 * t,
        foot_dx=0.0 + 1.0 * t,
        foot_dy=dy_i - 3.0 * t,
        boot_rot_deg=-14.0 * t,
        is_far_leg=False,
    )

    out = composite_over(far_leg, torso_layer)
    out = composite_over(out, near_leg)
    out = composite_over(out, skirt_overlay)
    out = apply_hair_and_skirt_wave(out, phase, amplitude=1.4, vertical_flutter=0.6, rune_pulse=0.9)
    if halo_span > 0.05:
        out = draw_borealis_prism_halo(
            out,
            attach_xy=(21, max(13, 17 + dy_i)),
            halo_span=halo_span,
            pulse_phase=phase * 2.0,
            top_min_y=5 if sovereign_mode else 6,
            bot_max_y=32,
            sovereign_mode=sovereign_mode,
            skate_swept=skate_swept,
        )
    return fill_layer_pinholes(out)


def build_row0_idle(tpl):
    """
    Row 0 (`IDLE` — `CRYO-PRISM SOVEREIGN HOVER`, 30 frames):
    - Glacia levitates serenely (`hover_dy = -1` to `-2` on `F05..F24`, with shimmering diamond frost-wisps at `y = 45`)
      while her **Floating 6-Crystal Borealis Snowflake Halo pulses rhythmically (`halo_span = 0.92..1.08`)**
    - Cradles her **23px Crystalline Snowflake-Prism Scepter poised forward (`hand_x = 31, hand_y = 24 + hover_dy, angle_deg = -12° + 4° * sin(phase)`)**!
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if 9 <= f <= 20:
            hover_dy = -2
        elif 5 <= f <= 24:
            hover_dy = -1
        else:
            hover_dy = 0

        base = shift_layer(tpl["stand"], dx=0, dy=hover_dy)
        pulse = 0.60 + 0.40 * math.sin(phase)
        base = apply_hair_and_skirt_wave(base, phase, amplitude=1.4, vertical_flutter=0.5, rune_pulse=pulse)

        halo_span = 1.00 + 0.08 * math.sin(phase)
        base = draw_borealis_prism_halo(
            base,
            attach_xy=(21, 17 + hover_dy),
            halo_span=halo_span,
            pulse_phase=phase,
            top_min_y=6,
            bot_max_y=32,
        )

        scepter_ang = -12.0 + 4.0 * math.sin(phase)
        hx = 31
        hy = 24 + hover_dy
        frame = draw_snowflake_prism_scepter(
            base,
            hand_x=hx,
            hand_y=hy,
            angle_deg=scepter_ang,
            glow_intensity=0.95 + 0.25 * math.sin(phase),
            scale=1.0,
            shoulder_rear=(22, 18 + hover_dy),
            shoulder_lead=(28, 19 + hover_dy),
            phase=phase,
        )

        # Shimmering crystalline snowflake frost-wisps at y = 45 beneath her hovering heeled boots
        wisp_shift = (f // 2) % 4
        for w_i, wx_base in enumerate((20, 26, 31, 36)):
            wx = wx_base + (wisp_shift if w_i >= 2 else -wisp_shift)
            set_px(frame, wx, 45, PURE_WHITE if (w_i + f) % 2 == 0 else FROST_LIGHT)
            set_px(frame, wx + (1 if w_i >= 2 else -1), 45, FROST_CYAN if w_i % 2 == 0 else AURORA_LAVENDER)

        frames.append(frame)
    return frames


def build_row1_walk(tpl):
    """
    Row 1 (`WALK` — `GLACIAL SILK-STRIDE & ICE-GLIDE`, 30 frames):
    - Glacia glides forward with her Borealis Snowflake Halo flared (`halo_span = 1.04`)
      and her Crystalline Snowflake-Prism Scepter poised gracefully (`hand_x = 32, hand_y = 24 + bob_y, angle_deg = -8°`)!
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        body = render_walk_icemage(tpl, f)
        bob_y = int(round(math.cos(phase * 2.0) * 1.0)) - 1

        scepter_ang = -8.0 + 2.5 * math.sin(phase * 2.0)
        hx = 32
        hy = 24 + bob_y

        frame = draw_snowflake_prism_scepter(
            body,
            hand_x=hx,
            hand_y=hy,
            angle_deg=scepter_ang,
            glow_intensity=1.0 + 0.2 * math.sin(phase * 2.0),
            scale=1.0,
            shoulder_rear=(22, 18 + bob_y),
            shoulder_lead=(28, 19 + bob_y),
            phase=phase,
        )

        # Subtle frost-crystal skate wisps trailing her heels (y = 41..44)
        for w_i in range(2):
            wx = 15 + ((f + w_i * 4) % 5)
            wy = 41 + w_i * 2 + (f % 2)
            set_px(frame, wx, wy, PURE_WHITE if w_i == 0 else FROST_CYAN)
            set_px(frame, wx + 1, wy, FROST_LIGHT)

        frames.append(frame)
    return frames


def build_row2_auto_attack(tpl):
    """
    Row 2 (`AUTO_ATTACK` — `TRIPLE CRYO-LANCE VOLLEY & PRISM SHATTER`, 30 frames):
    - `F00..F10`: **Cryo-Lance Cast #1** (Glacia levels her Snowflake-Prism Scepter at `hand_y = 16..18`
      and fires a razor diamond-cyan Cryo-Lance beam on `F04..F07`).
    - `F11..F19`: **High-Arc Borealis Shard Volley #2** (`angle_deg = -36° .. -16°`, hurling a twin
      crystalline ice-shard volley).
    - `F20..F29`: **Levitating Sovereign Prism-Shatter Finisher** (Glacia hovers airborne with flared
      Borealis Halo and sweeps a 3-band Frost-Crescent wave!).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 10:
            is_cast = 3 <= f <= 7
            base = (tpl["lunge"] if is_cast else tpl["stand"]).copy()
            base = apply_hair_and_skirt_wave(base, phase * 2.0, amplitude=1.6, vertical_flutter=0.6, rune_pulse=0.95)
            halo_span = [0.96, 1.00, 1.04, 1.10, 1.12, 1.10, 1.06, 1.04, 1.00, 0.96, 0.94][f]
            base = draw_borealis_prism_halo(
                base, attach_xy=(22 if is_cast else 21, 17), halo_span=halo_span, pulse_phase=phase * 2.0
            )

            hx_seq = [30, 28, 27, 32, 35, 35, 34, 33, 32, 31, 30]
            hy_seq = [21, 18, 16, 16, 17, 18, 19, 20, 21, 22, 23]
            ang_seq = [-16.0, -30.0, -36.0, -22.0, -12.0, -8.0, -10.0, -12.0, -14.0, -14.0, -12.0]

            frame = draw_snowflake_prism_scepter(
                base,
                hand_x=hx_seq[f],
                hand_y=hy_seq[f],
                angle_deg=ang_seq[f],
                glow_intensity=1.42 if 3 <= f <= 7 else 1.08,
                scale=1.02,
                shoulder_rear=(23 if is_cast else 22, 18),
                shoulder_lead=(29 if is_cast else 28, 19),
                phase=phase,
            )

            # Razor Diamond-Cyan Cryo-Lance beam on F04..F07
            if 4 <= f <= 7:
                reach_x = 47 if f in (4, 5, 6) else 45
                draw_line_px(frame, 35, 17, reach_x, 14, PURE_WHITE)
                draw_line_px(frame, 36, 16, reach_x - 1, 13, FROST_LIGHT)
                draw_line_px(frame, 36, 18, reach_x - 1, 15, FROST_CYAN)
                set_px(frame, reach_x, 13, PURE_WHITE)
                set_px(frame, reach_x, 15, AURORA_LAVENDER)
            frames.append(frame)

        elif f <= 19:
            k = f - 11  # 0..8
            is_cast = 1 <= k <= 5
            base = (tpl["lunge"] if is_cast else tpl["stand"]).copy()
            base = apply_hair_and_skirt_wave(base, phase * 2.4, amplitude=1.8, vertical_flutter=0.7, rune_pulse=1.0)
            halo_span = [1.02, 1.08, 1.14, 1.16, 1.12, 1.08, 1.04, 0.98, 0.95][k]
            base = draw_borealis_prism_halo(
                base, attach_xy=(22 if is_cast else 21, 17), halo_span=halo_span, pulse_phase=phase * 2.5
            )

            hx_seq = [28, 32, 35, 35, 35, 34, 33, 31, 30]
            hy_seq = [16, 16, 17, 17, 18, 19, 20, 22, 23]
            ang_seq = [-36.0, -26.0, -18.0, -14.0, -14.0, -16.0, -18.0, -16.0, -12.0]

            frame = draw_snowflake_prism_scepter(
                base,
                hand_x=hx_seq[k],
                hand_y=hy_seq[k],
                angle_deg=ang_seq[k],
                glow_intensity=1.45 if k <= 5 else 1.1,
                scale=1.03,
                shoulder_rear=(23 if is_cast else 22, 18),
                shoulder_lead=(29 if is_cast else 28, 19),
                phase=phase * 2.0,
            )

            if 1 <= k <= 5:
                draw_line_px(frame, 35, 16, 47, 11, PURE_WHITE)
                draw_line_px(frame, 36, 15, 46, 10, FROST_LIGHT)
                draw_line_px(frame, 36, 17, 46, 12, FROST_CYAN)
                set_px(frame, 47, 10, PURE_WHITE)
                set_px(frame, 47, 12, AURORA_LAVENDER)
            frames.append(frame)

        else:
            k = f - 20  # 0..9
            dy = -2 if 1 <= k <= 7 else -1
            body = make_aerial_icemage(
                tpl,
                jump_dy=dy,
                body_tilt_deg=4.0 if k <= 6 else 0.0,
                leg_tuck=0.35 if k <= 6 else 0.15,
                halo_span=[1.04, 1.10, 1.15, 1.16, 1.16, 1.14, 1.10, 1.06, 1.02, 0.98][k],
                phase=phase * 2.2,
            )

            ang_seq = [-46.0, -42.0, -30.0, -20.0, -14.0, -12.0, -14.0, -18.0, -16.0, -12.0]
            hx_seq = [28, 30, 34, 35, 35, 34, 33, 32, 31, 30]
            hy_seq = [15, 15, 16, 17, 17, 18, 19, 20, 21, 22]

            cleave_arc = None
            if 2 <= k <= 6:
                arc_int = [0.85, 1.0, 1.0, 0.92, 0.75][k - 2]
                cleave_arc = (-46.0, ang_seq[k], 17.0, arc_int)

            frame = draw_snowflake_prism_scepter(
                body,
                hand_x=hx_seq[k],
                hand_y=hy_seq[k],
                angle_deg=ang_seq[k],
                glow_intensity=1.48 if k <= 6 else 1.1,
                scale=1.04,
                shoulder_rear=(22, 18 + dy),
                shoulder_lead=(28, 19 + dy),
                cleave_arc=cleave_arc,
                phase=phase,
            )
            frames.append(frame)
    return frames


def draw_hoarfrost_prism_cascade(canvas, f, phase):
    """
    Row 3 helper (`F05..F24`): Conjures a spinning Hexagonal Hoarfrost Cryo-Prism (`x = 41, y = 18`)
    that refracts a fan of 4 Diamond-Cyan Glacial Spike Lances across `x = 34..47, y = 6..26`!
    """
    vortex = np.zeros((52, 52, 4), dtype=np.uint8)
    spike_lanes = [
        (34, 10, 46, 6),
        (35, 15, 47, 12),
        (35, 20, 47, 18),
        (34, 25, 46, 24),
    ]
    for j_idx, (x0, y0, x1, y1) in enumerate(spike_lanes):
        prog = ((f * 2 + j_idx * 3) % 10) / 9.0
        sx = x0 + (x1 - x0) * max(0.0, prog - 0.35)
        sy = y0 + (y1 - y0) * max(0.0, prog - 0.35)
        tx = x0 + (x1 - x0) * prog
        ty = y0 + (y1 - y0) * prog
        draw_line_px(vortex, sx, sy, tx, ty, PURE_WHITE if (j_idx + f) % 2 == 0 else FROST_LIGHT)
        set_px(vortex, tx, ty, PURE_WHITE)
        set_px(vortex, max(4.0, tx - 1.0), max(4.0, ty - 1.0), FROST_CYAN if j_idx % 2 == 0 else AURORA_LAVENDER)

    # Spinning diamond Hoarfrost Prism focus node at (42, 16)
    px_c, py_c = 42, 16 + int(round(math.sin(phase) * 1.0))
    set_px(vortex, px_c, py_c, PURE_WHITE)
    for dx_p, dy_p in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        set_px(vortex, px_c + dx_p, py_c + dy_p, FROST_CYAN if (dx_p + f) % 2 == 0 else FROST_LIGHT)
    for dx_p, dy_p in [(-2, 0), (2, 0), (0, -2), (0, 2)]:
        set_px(vortex, px_c + dx_p, py_c + dy_p, AURORA_LAVENDER)

    return composite_over(canvas, vortex)


def build_row3_skill(tpl):
    """
    Row 3 (`SKILL` — `HOARFROST PRISM & GLACIAL SPIKE CASCADE`, 30 frames):
    - Glacia hovers airborne (`dy = -2`) with her 6-Crystal Borealis Halo unfurled wide, raising her
      Snowflake-Prism Scepter (`angle_deg = -28° .. -14°`) to conjure a Spinning Hoarfrost Prism and Glacial Spike Cascade!
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 4:
            u = f / 4.0
            dy = -1 if f in (1, 2) else (-2 if f >= 3 else 0)
            body = make_aerial_icemage(
                tpl,
                jump_dy=dy,
                body_tilt_deg=4.0 * u,
                leg_tuck=0.30 + 0.15 * u,
                halo_span=0.98 + 0.16 * u,
                phase=phase * 2.0,
            )
            ang = -12.0 * (1.0 - u) + (-34.0) * u
            hx = int(round(31 * (1.0 - u) + 30 * u))
            hy = int(round(23 * (1.0 - u) + 16 * u)) + dy
            frame = draw_snowflake_prism_scepter(
                body,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.1 + 0.35 * u,
                scale=1.02,
                shoulder_rear=(22, 18 + dy),
                shoulder_lead=(28, 19 + dy),
                phase=phase * 2.0,
            )
            frames.append(frame)

        elif f <= 24:
            k = f - 5  # 0..19
            dy = -2
            cast_wave = math.sin(k * 0.95)
            body = make_aerial_icemage(
                tpl,
                jump_dy=dy,
                body_tilt_deg=4.0 + 3.0 * cast_wave,
                leg_tuck=0.45,
                halo_span=1.14 + 0.04 * math.sin(k * 0.7),
                phase=k * 0.65,
            )
            hx = int(round(32 + 2.5 * cast_wave))
            hy = int(round(16 + 1.5 * cast_wave))
            ang = -24.0 + 10.0 * cast_wave
            frame = draw_snowflake_prism_scepter(
                body,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.48,
                scale=1.03,
                shoulder_rear=(23, 18 + dy),
                shoulder_lead=(29, 19 + dy),
                phase=k * 0.7,
            )
            frame = draw_hoarfrost_prism_cascade(frame, f, k * 0.65)
            frames.append(frame)

        else:
            k = f - 25  # 0..4
            u = (k + 1) / 5.0
            dy = -2 if k <= 1 else -1
            body = make_aerial_icemage(
                tpl,
                jump_dy=dy,
                body_tilt_deg=4.0 * (1.0 - u),
                leg_tuck=0.45 * (1.0 - u * 0.7),
                halo_span=1.12 - 0.14 * u,
                phase=phase,
            )
            ang = -20.0 * (1.0 - u) + (-12.0) * u
            hx = int(round(32 * (1.0 - u) + 31 * u))
            frame = draw_snowflake_prism_scepter(
                body,
                hand_x=hx,
                hand_y=18 + int(round(4 * u)),
                angle_deg=ang,
                glow_intensity=1.25 - 0.2 * u,
                scale=1.0,
                shoulder_rear=(22, 18 + dy),
                shoulder_lead=(28, 19 + dy),
                phase=phase,
            )
            frames.append(frame)
    return frames


def draw_borealis_10_crystal_rain(canvas, f):
    """
    Row 4 helper (`F06..F26`): Renders 10 diagonal Borealis Diamond Ice-Lances raining downward
    across `x = 34..47, y = 8..44` commanded by Glacia's Absolute Zero: Borealis Cathedral!
    """
    rain = np.zeros((52, 52, 4), dtype=np.uint8)
    spear_slots = [
        (34, 8),
        (36, 14),
        (38, 10),
        (40, 18),
        (42, 12),
        (44, 20),
        (35, 24),
        (38, 28),
        (41, 26),
        (44, 30),
    ]
    for s_idx, (bx0, by0) in enumerate(spear_slots):
        prog = ((f * 3 + s_idx * 4) % 18) / 17.0
        tx = min(47.0, bx0 + prog * 3.0)
        ty = min(44.0, by0 + prog * 13.0)
        sx0 = max(34.0, tx - 2.5)
        sy0 = max(8.0, ty - 6.5)

        draw_line_px(rain, sx0, sy0, tx, ty, PURE_WHITE if (s_idx + f) % 2 == 0 else FROST_LIGHT)
        set_px(rain, tx, ty, PURE_WHITE)
        set_px(rain, max(34.0, tx - 1.0), max(8.0, ty - 2.0), FROST_CYAN if s_idx % 2 == 0 else AURORA_LAVENDER)
        set_px(rain, min(47.0, tx + 1.0), max(8.0, ty - 2.0), FROST_BRIGHT)

        if ty >= 40.0:
            ix, iy = int(round(tx)), int(round(ty))
            set_px(rain, max(34, ix - 1), iy, FROST_LIGHT)
            set_px(rain, min(47, ix + 1), iy, FROST_CYAN)
            set_px(rain, ix, max(8, iy - 1), PURE_WHITE)

    return composite_over(canvas, rain)


def build_row4_ultimate(tpl):
    """
    Row 4 (`ULTIMATE` — `ABSOLUTE ZERO: BOREALIS CATHEDRAL`, 30 frames):
    - Glacia ascends into the upper cell (`dy = -3`) with her **Grand 6-Crystal Sovereign Borealis Halo**
      unfurled behind her (`halo_span = 1.15`), raising her Snowflake-Prism Scepter to command
      **10 diagonal Borealis Ice-Lances raining downward** (`x = 34..47, y = 8..44`)!
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 5:
            u = f / 5.0
            dy = -int(round(u * 3.0))
            body = make_aerial_icemage(
                tpl,
                jump_dy=dy,
                body_tilt_deg=-4.0 * u,
                leg_tuck=0.45 * u,
                halo_span=0.98 + 0.17 * u,
                phase=phase * 2.0,
                sovereign_mode=True,
            )
            ang = -12.0 * (1.0 - u) + (-58.0) * u
            hx = int(round(31 * (1.0 - u) + 33 * u))
            hy = int(round(23 * (1.0 - u) + 18 * u)) + dy
            frame = draw_snowflake_prism_scepter(
                body,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.2 + 0.3 * u,
                scale=1.03,
                shoulder_rear=(22, 18 + dy),
                shoulder_lead=(28, 19 + dy),
                phase=phase * 2.0,
            )
            frames.append(frame)

        elif f <= 25:
            k = f - 6  # 0..19
            dy = -3
            body = make_aerial_icemage(
                tpl,
                jump_dy=dy,
                body_tilt_deg=0.0,
                leg_tuck=0.45,
                halo_span=1.15,
                phase=phase * 2.5,
                sovereign_mode=True,
            )
            # Sovereign Diamond Snowflake Crown Crest above her tiara (y = 3..5, x = 25..32)
            for hx_c in range(26, 32):
                set_px(body, hx_c, 4, PURE_WHITE if (hx_c + f) % 2 == 0 else FROST_LIGHT)
            set_px(body, 28, 3, PURE_WHITE)
            set_px(body, 29, 3, FROST_CYAN)

            ang = -48.0 + 18.0 * math.sin(k * 0.45)
            frame = draw_snowflake_prism_scepter(
                body,
                hand_x=33,
                hand_y=16,
                angle_deg=ang,
                glow_intensity=1.5,
                scale=1.04,
                shoulder_rear=(22, 15),
                shoulder_lead=(28, 16),
                phase=phase * 2.5,
            )
            frame = draw_borealis_10_crystal_rain(frame, f)
            frames.append(frame)

        else:
            k = f - 26  # 0..3
            u = (k + 1) / 4.0
            dy = -3 + int(round(u * 2.0))
            body = make_aerial_icemage(
                tpl,
                jump_dy=dy,
                body_tilt_deg=0.0,
                leg_tuck=0.45 * (1.0 - u),
                halo_span=1.15 - 0.15 * u,
                phase=phase,
                sovereign_mode=(k <= 1),
            )
            ang = -32.0 * (1.0 - u) + (-12.0) * u
            frame = draw_snowflake_prism_scepter(
                body,
                hand_x=int(round(33 * (1.0 - u) + 31 * u)),
                hand_y=int(round(17 * (1.0 - u) + 23 * u)),
                angle_deg=ang,
                glow_intensity=1.3 - 0.25 * u,
                scale=1.0,
                shoulder_rear=(22, 18 + dy),
                shoulder_lead=(28, 19 + dy),
                phase=phase,
            )
            if k == 0:
                frame = draw_borealis_10_crystal_rain(frame, f)
            frames.append(frame)
    return frames


def build_row5_death(tpl):
    """
    Row 5 (`DEATH` — `SHATTERED CRYO-SOVEREIGN COLLAPSE`, 30 frames):
    - `F00..F06`: Hurt stagger recoil with flared Borealis Crystal Halo and shattering frost sparks.
    - `F07..F17`: Progressive kneeling collapse (`tpl['kneel']`) with dimming crystal halo, bracing on her Snowflake-Prism Scepter.
    - `F18..F29`: Grounded horizontal prone collapse (`y = 32..46`, anchored on the floor at `y = 46`)
      with her shattered Borealis ice-crystals draped across her back, scepter resting flat on the floor (`y = 44..46`),
      and fading diamond snowflakes drifting down.
    """
    frames = []
    for f in range(30):
        if f <= 6:
            u = f / 6.0
            dx = -int(round(math.sin(u * math.pi * 0.85) * 2.0))
            dy = int(round(u * 2.0))
            base = shift_layer(tpl["stand"], dx=dx, dy=dy)
            base = apply_hair_and_skirt_wave(base, u * math.pi, amplitude=1.5, vertical_flutter=0.5, rune_pulse=0.4)
            base = draw_borealis_prism_halo(
                base,
                attach_xy=(21 + dx, 17 + dy),
                halo_span=1.04 - 0.14 * u,
                pulse_phase=u * math.pi,
                top_min_y=6 + dy,
                bot_max_y=32 + dy,
            )
            frame = draw_snowflake_prism_scepter(
                base,
                hand_x=max(29, 32 + dx),
                hand_y=23 + dy,
                angle_deg=-12.0 + u * 28.0,
                glow_intensity=0.65,
                scale=1.0,
                shoulder_rear=(22 + dx, 18 + dy),
                shoulder_lead=(28 + dx, 19 + dy),
            )
            for sp in range(4):
                sx_s = min(47, 31 + sp * 2 + f)
                sy_s = max(5, 20 - (sp % 2) * 3 + (f // 2))
                set_px(frame, sx_s, sy_s, PURE_WHITE if sp == 0 else (FROST_CYAN if sp % 2 == 0 else AURORA_LAVENDER))
            frames.append(frame)

        elif f <= 17:
            u = (f - 7) / 10.0
            kneel_src = tpl["kneel"].copy()
            extra_drop = 0 if f <= 12 else (f - 12)
            base = np.zeros((52, 52, 4), dtype=np.uint8)
            for sy in range(8, 46):
                for sx in range(13, 48):
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
            base = apply_hair_and_skirt_wave(base, u * math.pi, amplitude=1.0, vertical_flutter=0.3, rune_pulse=flicker)
            base = draw_borealis_prism_halo(
                base,
                attach_xy=(21, min(32, 22 + extra_drop)),
                halo_span=0.88 - 0.22 * u,
                pulse_phase=u * math.pi,
                top_min_y=min(24, 11 + extra_drop),
                bot_max_y=min(43, 36 + extra_drop),
            )

            frame = draw_snowflake_prism_scepter(
                base,
                hand_x=33,
                hand_y=25 + extra_drop,
                angle_deg=18.0 + u * 20.0,
                glow_intensity=max(0.25, 0.65 * (1.0 - u)),
                scale=0.96,
                shoulder_rear=(22, 22 + extra_drop),
                shoulder_lead=(28, 23 + extra_drop),
            )
            frames.append(frame)

        else:
            k = f - 18  # 0..11
            frame = shift_layer(tpl["fall"], dx=0, dy=1)

            # Draped Borealis Ice-Crystal Shards across her prone back (x = 9..28, y = 32..41)
            for p_i in range(5):
                py0 = 33 + p_i
                px0 = 24 - p_i
                px1 = 10 + p_i * 2
                draw_line_px(
                    frame,
                    px0,
                    py0,
                    px1,
                    py0 + 2,
                    PURE_WHITE if p_i == 0 else (FROST_LIGHT if p_i == 1 else (FROST_CYAN if p_i == 2 else GLACIER_MID)),
                )
                draw_line_px(frame, px0, py0 + 1, px1 + 1, py0 + 3, SAPPHIRE_MID if p_i >= 2 else AURORA_LAVENDER)

            for cx_p in range(12, 32):
                for cy_p in range(41, 45):
                    if frame[cy_p, cx_p, 3] == 0 and (cx_p <= 26 or cy_p <= 43):
                        frame[cy_p, cx_p] = SAPPHIRE_MID if (cx_p + cy_p) % 2 == 0 else SAPPHIRE_DARK
            frame = fill_layer_pinholes(frame, x0=6, x1=44, y0=32, y1=47, require_3_neighbors=False)

            # Crystalline Snowflake-Prism Scepter resting flat on the floor (y = 44..46, x = 14..45)
            for lx in range(14, 36):
                ring = (lx % 4 == 0)
                set_px(frame, lx, 45, FROST_LIGHT if ring else SILVER_MID)
                set_px(frame, lx, 46, SAPPHIRE_DARK if ring else ABYSS_NAVY)
            set_px(frame, 36, 44, FROST_LIGHT)
            set_px(frame, 36, 45, PURE_WHITE)
            set_px(frame, 36, 46, FROST_CYAN)
            set_px(frame, 37, 45, AURORA_LAVENDER)
            for sx_b in range(37, 46):
                set_px(frame, sx_b, 45, PURE_WHITE if sx_b >= 43 else (FROST_LIGHT if sx_b % 2 == 0 else FROST_CYAN))
                if sx_b <= 43:
                    set_px(frame, sx_b, 44, FROST_CYAN if sx_b <= 40 else FROST_LIGHT)
                    set_px(frame, sx_b, 46, SAPPHIRE_BRIGHT if sx_b <= 40 else GLACIER_MID)

            # Fading diamond snowflakes drifting gently down so every frame F18..F29 is distinct
            num_flakes = max(1, 5 - (k // 3))
            for f_i in range(num_flakes):
                fx_p = 15 + f_i * 6 + ((k + f_i) % 3)
                fy_p = min(44, 31 + k + f_i * 2)
                set_px(frame, fx_p, fy_p, PURE_WHITE if (f_i + k) % 2 == 0 else FROST_CYAN)
                set_px(frame, fx_p + 1, fy_p, FROST_LIGHT if f_i % 2 == 0 else AURORA_LAVENDER)

            frames.append(frame)

    return frames


def build_row6_dash(tpl):
    """
    Row 6 (`DASH` — `GLACIAL ICE-SKATE SURGE`, 30 frames):
    - Airborne cryo-jet glide (`dy = -2`) with her Borealis Halo swept back like ice-crystal fins
      and glowing diamond-frost ribbons streaming behind her!
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 2:
            u = (f + 1) / 3.0
            dy = -f
            body = make_aerial_icemage(
                tpl,
                jump_dy=dy,
                body_tilt_deg=12.0 * u,
                leg_tuck=0.55 * u,
                halo_span=1.08,
                phase=phase * 2.0,
                skate_swept=(f == 2),
            )
            ang = -12.0 * (1.0 - u) + (-4.0) * u
            frame = draw_snowflake_prism_scepter(
                body,
                hand_x=32 + f,
                hand_y=23 + dy,
                angle_deg=ang,
                glow_intensity=1.15 + 0.2 * u,
                scale=1.0,
                shoulder_rear=(22, 18 + dy),
                shoulder_lead=(28, 19 + dy),
                phase=phase,
            )
            frames.append(frame)

        elif f <= 23:
            k = f - 3  # 0..20
            dy = -2
            body = make_aerial_icemage(
                tpl,
                jump_dy=dy,
                body_tilt_deg=14.0,
                leg_tuck=0.72,
                halo_span=1.06 + 0.04 * math.sin(k * 0.7),
                phase=k * 0.75,
                skate_swept=True,
            )

            # Streaming diamond-frost & aurora-violet ribbon contrails behind her (x = 4..17, y = 10..34)
            for r_idx in range(5):
                ry = 11 + r_idx * 5 + ((k + r_idx) % 2)
                rx0 = 4 + ((k * 2 + r_idx * 3) % 7)
                col_quill = PURE_WHITE if r_idx % 2 == 0 else FROST_LIGHT
                col_vane = FROST_CYAN if r_idx % 2 == 0 else AURORA_LAVENDER
                draw_line_px(body, rx0, ry, min(16, rx0 + 4), ry, col_quill)
                draw_line_px(body, rx0 + 1, ry + 1, min(16, rx0 + 3), ry + 1, col_vane)
                set_px(body, max(4, rx0 - 1), ry, FROST_BRIGHT)

            ang = -4.0 + math.sin(k * 0.65) * 2.0
            frame = draw_snowflake_prism_scepter(
                body,
                hand_x=34 + (k % 2),
                hand_y=21,
                angle_deg=ang,
                glow_intensity=1.35,
                scale=1.0,
                shoulder_rear=(23, 16),
                shoulder_lead=(29, 17),
                phase=k * 0.6,
            )
            frames.append(frame)

        else:
            k = f - 24  # 0..5
            u = (k + 1) / 6.0
            dy = -2 if k <= 2 else -1
            body = make_aerial_icemage(
                tpl,
                jump_dy=dy,
                body_tilt_deg=12.0 * (1.0 - u),
                leg_tuck=0.65 * (1.0 - u),
                halo_span=1.12 - 0.14 * u,
                phase=phase,
                skate_swept=False,
            )
            ang = -4.0 * (1.0 - u) + (-12.0) * u
            frame = draw_snowflake_prism_scepter(
                body,
                hand_x=int(round(34 * (1.0 - u) + 31 * u)),
                hand_y=21 - dy - 1,
                angle_deg=ang,
                glow_intensity=1.15 - 0.15 * u,
                scale=1.0,
                shoulder_rear=(22, 18 + dy),
                shoulder_lead=(28, 19 + dy),
                phase=phase,
            )
            frames.append(frame)
    return frames


def draw_subzero_freezing_ray(canvas, f, phase):
    """
    Row 7 helper (`F07..F22`): Renders Glacia's Piercing Sub-Zero Freezing Ray aimed diagonally downward
    (`angle = +26°` from `(30, 17)` to `(46, 36)`) with crystalline frost starbursts!
    """
    ray = np.zeros((52, 52, 4), dtype=np.uint8)
    x0, y0 = 30.0, 17.0
    x1, y1 = 46.0, 36.0
    rad = math.radians(26.0)
    ux, uy = math.cos(rad), math.sin(rad)
    px, py = -uy, ux

    if f <= 10:
        u = (f - 7) / 3.0
        jx = x0 + u * 3.0
        jy = y0 + u * 3.2
        draw_line_px(ray, jx - ux * 5.0, jy - uy * 5.0, jx + ux * 9.0, jy + uy * 9.0, PURE_WHITE)
        draw_line_px(ray, jx - ux * 4.0 + px, jy - uy * 4.0 + py, jx + ux * 8.0 + px, jy + uy * 8.0 + py, FROST_LIGHT)
        draw_line_px(ray, jx - ux * 4.0 - px, jy - uy * 4.0 - py, jx + ux * 8.0 - px, jy + uy * 8.0 - py, FROST_CYAN)
        set_px(ray, jx + ux * 5.0 + px * 2.0, jy + uy * 5.0 + py * 2.0, PURE_WHITE)
        set_px(ray, jx + ux * 5.0 - px * 2.0, jy + uy * 5.0 - py * 2.0, AURORA_LAVENDER)
    else:
        u = min(1.0, (f - 10) / 8.0)
        tip_x = x0 + (x1 - x0) * (0.45 + 0.55 * u)
        tip_y = y0 + (y1 - y0) * (0.45 + 0.55 * u)
        tail_x = max(x0, tip_x - (x1 - x0) * 0.55)
        tail_y = max(y0, tip_y - (y1 - y0) * 0.55)

        draw_line_px(ray, x0, y0, tip_x, tip_y, FROST_CYAN if f % 2 == 0 else AURORA_LAVENDER)
        draw_line_px(ray, tail_x, tail_y, tip_x, tip_y, PURE_WHITE)
        draw_line_px(ray, tail_x + px, tail_y + py, tip_x + px, tip_y + py, FROST_LIGHT)
        draw_line_px(ray, tail_x - px, tail_y - py, tip_x - px, tip_y - py, FROST_CYAN)

        set_px(ray, tip_x, tip_y, PURE_WHITE)
        set_px(ray, tip_x - ux * 2.0 + px * 2.0, tip_y - uy * 2.0 + py * 2.0, PURE_WHITE)
        set_px(ray, tip_x - ux * 2.0 - px * 2.0, tip_y - uy * 2.0 - py * 2.0, FROST_LIGHT)

        if f >= 15:
            for d_r in (-2, -1, 1, 2):
                set_px(ray, min(47, 45 + d_r), 35, PURE_WHITE if abs(d_r) == 1 else FROST_LIGHT)
                set_px(ray, 45, 35 + d_r, FROST_CYAN if abs(d_r) == 2 else PURE_WHITE)

    return composite_over(canvas, ray)


def build_row7_crouch(tpl):
    """
    Row 7 (`CROUCH` — `PERMAFROST BACKSTEP & SUB-ZERO RAY`, 30 frames):
    - Glacia flares her Borealis Snowflake Halo (`halo_span = 1.10`) to **evasively backstep (`dx = -2, dy = -2`)**
      while aiming her Snowflake-Prism Scepter diagonally downward (`angle = +26°` from `(30, 17)` to `(46, 36)`)!
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 6:
            u = f / 6.0
            dx = -int(round(u * 2.0))
            dy = -int(round(u * 2.0))
            body = make_aerial_icemage(
                tpl,
                jump_dy=dy,
                body_tilt_deg=-8.0 * u,
                leg_tuck=0.45 * u,
                halo_span=1.00 + 0.10 * u,
                phase=phase * 2.0,
            )
            body = shift_layer(body, dx=dx, dy=0)
            ang = -12.0 * (1.0 - u) + 26.0 * u
            hx = int(round(31 * (1.0 - u) + 30 * u))
            hy = int(round(24 * (1.0 - u) + 17 * u))
            frame = draw_snowflake_prism_scepter(
                body,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.05 + 0.35 * u,
                scale=1.0,
                shoulder_rear=(22 + dx, 18 + dy),
                shoulder_lead=(28 + dx, 19 + dy),
                phase=phase,
            )
            frames.append(frame)

        elif f <= 21:
            k = f - 7  # 0..14
            dx, dy = -2, -2
            body = make_aerial_icemage(
                tpl,
                jump_dy=dy,
                body_tilt_deg=-6.0 if k <= 3 else 4.0,
                leg_tuck=0.50,
                halo_span=1.10 + 0.03 * math.sin(k * 0.7),
                phase=phase * 2.5,
            )
            body = shift_layer(body, dx=dx, dy=0)

            frame = draw_snowflake_prism_scepter(
                body,
                hand_x=30,
                hand_y=17,
                angle_deg=26.0,
                glow_intensity=1.45 if k <= 8 else 1.2,
                scale=1.0,
                shoulder_rear=(20, 16),
                shoulder_lead=(26, 17),
                phase=phase * 2.0,
            )
            frame = draw_subzero_freezing_ray(frame, f, phase)
            frames.append(frame)

        else:
            k = f - 22  # 0..7
            u = (k + 1) / 8.0
            dx = -int(round((1.0 - u) * 2.0))
            dy = -int(round((1.0 - u) * 2.0))
            body = make_aerial_icemage(
                tpl,
                jump_dy=dy,
                body_tilt_deg=4.0 * (1.0 - u),
                leg_tuck=0.50 * (1.0 - u),
                halo_span=1.10 - 0.12 * u,
                phase=phase,
            )
            body = shift_layer(body, dx=dx, dy=0)
            ang = 26.0 * (1.0 - u) + (-12.0) * u
            hx = int(round(30 * (1.0 - u) + 31 * u))
            hy = int(round(17 * (1.0 - u) + 24 * u))
            frame = draw_snowflake_prism_scepter(
                body,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.15 - 0.2 * u,
                scale=1.0,
                shoulder_rear=(22 + dx, 18 + dy),
                shoulder_lead=(28 + dx, 19 + dy),
                phase=phase,
            )
            frames.append(frame)
    return frames


def build_row8_jump(tpl):
    """
    Row 8 (`JUMP` — `HAILSTORM SKY-ASCENT & GLACIAL METEOR DIVE`, 30 frames):
    - ZERO ground ring during mid-air frames (`F04..F23`)!
    - `F00..F11`: **Skyward Hailstorm Ascent** (`angle_deg = -82°`, Borealis Halo sleekly focused).
    - `F12..F24`: **Supersonic Diagonal Glacial Meteor Dive** — Glacia angles her Snowflake-Prism Scepter
      **diagonally downward (`angle_deg = +38°`)** wrapped in a blazing **Sub-Zero Blizzard Cone (`blizzard_cone=True`)**
      plunging into a diamond-frost starburst on `F25..F29`!
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 3:
            crouch_seq = [1, 2, 1, 0]
            d = crouch_seq[f]
            u = f / 3.0
            body = (
                make_crouch_icemage(tpl, d)
                if d > 0
                else make_aerial_icemage(tpl, jump_dy=-1, leg_tuck=0.35, halo_span=0.84, phase=phase)
            )
            if d > 0:
                body = apply_hair_and_skirt_wave(body, phase * 2.0, amplitude=1.4, vertical_flutter=0.5, rune_pulse=0.9)
                body = draw_borealis_prism_halo(
                    body, attach_xy=(21, 17 + d), halo_span=0.86, pulse_phase=phase * 2.0, top_min_y=6, bot_max_y=30
                )
            ang = -12.0 * (1.0 - u) + (-82.0) * u
            frame = draw_snowflake_prism_scepter(
                body,
                hand_x=32,
                hand_y=21 + d,
                angle_deg=ang,
                glow_intensity=1.1 + 0.25 * u,
                scale=1.0,
                shoulder_rear=(22, 18 + d),
                shoulder_lead=(28, 19 + d),
                phase=phase,
            )
            frames.append(frame)

        elif f <= 11:
            k = f - 4  # 0..7
            jump_dy = -2 if k <= 1 else -3
            body = make_aerial_icemage(
                tpl,
                jump_dy=jump_dy,
                body_tilt_deg=-6.0,
                leg_tuck=0.65,
                halo_span=0.82 + 0.04 * math.sin(k * 0.6),
                phase=phase * 2.2,
            )
            frame = draw_snowflake_prism_scepter(
                body,
                hand_x=32,
                hand_y=18 + jump_dy,
                angle_deg=-82.0,
                glow_intensity=1.35,
                scale=1.0,
                shoulder_rear=(22, 18 + jump_dy),
                shoulder_lead=(28, 19 + jump_dy),
                phase=phase * 2.2,
            )
            for s_i, sx_p in enumerate((22, 28, 34)):
                sy_top = 34 + ((k + s_i) % 3)
                draw_line_px(frame, sx_p, sy_top, sx_p, min(40, sy_top + 4), PURE_WHITE if s_i == 1 else FROST_CYAN)
            frame[42:, :, :] = 0
            frames.append(frame)

        elif f <= 24:
            k = f - 12  # 0..12
            u = k / 12.0
            jump_dy = -3 if k <= 4 else (-2 if k <= 8 else (-1 if k <= 11 else 0))
            body = make_aerial_icemage(
                tpl,
                jump_dy=jump_dy,
                body_tilt_deg=14.0,
                leg_tuck=0.75 - 0.35 * u,
                halo_span=1.10,
                phase=phase * 2.8,
            )
            frame = draw_snowflake_prism_scepter(
                body,
                hand_x=34,
                hand_y=20 + jump_dy,
                angle_deg=38.0,
                glow_intensity=1.5,
                scale=1.03,
                shoulder_rear=(23, 18 + jump_dy),
                shoulder_lead=(29, 19 + jump_dy),
                blizzard_cone=True,
                phase=k * 0.75,
            )
            draw_line_px(frame, 30, 14 + jump_dy, 45, 27 + jump_dy, PURE_WHITE if k % 2 == 0 else FROST_LIGHT)
            draw_line_px(frame, 28, 18 + jump_dy, 43, 31 + jump_dy, FROST_CYAN)
            if f <= 23:
                frame[43:, :, :] = 0
            frames.append(frame)

        else:
            k = f - 25  # 0..4
            u = k / 4.0
            crouch_d = [3, 2, 1, 1, 0][k]
            body = make_crouch_icemage(tpl, crouch_d) if crouch_d > 0 else tpl["stand"].copy()
            body = apply_hair_and_skirt_wave(body, phase, amplitude=1.6, vertical_flutter=0.6, rune_pulse=1.0 - 0.2 * u)
            body = draw_borealis_prism_halo(
                body,
                attach_xy=(21, 17 + crouch_d),
                halo_span=1.12 - 0.14 * u,
                pulse_phase=phase * 2.0,
                top_min_y=6,
                bot_max_y=32,
            )
            ang = [38.0, 22.0, 6.0, -4.0, -12.0][k]
            frame = draw_snowflake_prism_scepter(
                body,
                hand_x=int(round(34 * (1.0 - u) + 31 * u)),
                hand_y=22 + crouch_d,
                angle_deg=ang,
                glow_intensity=1.4 - 0.35 * u,
                scale=1.0,
                shoulder_rear=(22, 18 + crouch_d),
                shoulder_lead=(28, 19 + crouch_d),
                phase=phase,
            )
            if k <= 2:
                cx_imp, cy_imp = 42, 44
                for ray_dx, ray_dy, col_r in [
                    (-6 - k, -4 - k, PURE_WHITE),
                    (-3 - k, -6 - k, FROST_CYAN),
                    (2 + k, -6 - k, PURE_WHITE),
                    (4 + k, -3 - k, AURORA_LAVENDER),
                    (-8 - k, -1, FROST_LIGHT),
                    (5, -1, GLACIER_MID),
                ]:
                    draw_line_px(
                        frame,
                        cx_imp,
                        cy_imp,
                        max(28, min(47, cx_imp + ray_dx)),
                        max(34, min(46, cy_imp + ray_dy)),
                        col_r,
                    )
            frames.append(frame)
    return frames


def apply_pass12_vanguard_upgrades(cell_208, r_idx, f):
    """
    High-resolution 208x208 Borealis Diamond Star-Glint accents specific to Glacia:
    - ZERO baked black outline in Python (`PixelForge.js` adds runtime outlines).
    """
    out = cell_208.copy()
    c_white = PURE_WHITE
    c_prim = FROST_CYAN
    c_sec = AURORA_LAVENDER

    def p208(x, y, col):
        ix = int(round(x))
        iy = int(round(y))
        if 8 <= ix <= 199 and 8 <= iy <= 199:
            out[iy, ix] = col

    # Scepter Prism Star-Glint on Row 2 (AUTO_ATTACK, F04..F07 and F13..F17)
    if r_idx == 2 and (4 <= f <= 7 or 13 <= f <= 17):
        gx = 178 + (f % 3) * 2
        gy = 88 if f <= 7 else 68
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                p208(gx + dx, gy + dy, c_white)
        for d in range(2, 6):
            col_ray = c_white if d <= 3 else c_prim
            p208(gx + d, gy, col_ray)
            p208(gx - d, gy, col_ray)
            p208(gx, gy + d, col_ray)
            p208(gx, gy - d, col_ray)
        for dx, dy in ((-2, -2), (2, -2), (-2, 2), (2, 2)):
            p208(gx + dx, gy + dy, c_sec)

    out[:8, :, :] = 0
    out[200:, :, :] = 0
    out[:, :8, :] = 0
    out[:, 200:, :] = 0
    return out


def main():
    tpl = make_clean_templates()

    rows = [
        ("ROW 0: IDLE - CRYO-PRISM SOVEREIGN HOVER (30 FRAMES)", build_row0_idle(tpl)),
        ("ROW 1: WALK - GLACIAL SILK-STRIDE & ICE-GLIDE (30 FRAMES)", build_row1_walk(tpl)),
        ("ROW 2: AUTO_ATTACK - TRIPLE CRYO-LANCE & PRISM SHATTER (30 FRAMES)", build_row2_auto_attack(tpl)),
        ("ROW 3: SKILL - HOARFROST PRISM & SPIKE CASCADE (30 FRAMES)", build_row3_skill(tpl)),
        ("ROW 4: ULTIMATE - ABSOLUTE ZERO: BOREALIS CATHEDRAL (30 FRAMES)", build_row4_ultimate(tpl)),
        ("ROW 5: DEATH - SHATTERED CRYO-SOVEREIGN COLLAPSE (30 FRAMES)", build_row5_death(tpl)),
        ("ROW 6: DASH - GLACIAL ICE-SKATE SURGE (30 FRAMES)", build_row6_dash(tpl)),
        ("ROW 7: CROUCH - PERMAFROST BACKSTEP & SUB-ZERO RAY (30 FRAMES)", build_row7_crouch(tpl)),
        ("ROW 8: JUMP - HAILSTORM ASCENT & GLACIAL METEOR DIVE (30 FRAMES)", build_row8_jump(tpl)),
    ]

    num_rows = len(rows)
    cell_px = 208
    sheet = Image.new("RGBA", (30 * cell_px, num_rows * cell_px), (0, 0, 0, 0))

    top_clips = bot_clips = left_clips = right_clips = 0
    pinholes_total = 0
    for r_idx, (r_name, r_frames) in enumerate(rows):
        assert len(r_frames) == 30, f"{r_name} has {len(r_frames)} frames instead of 30"
        cells_208 = []
        for c_idx in range(30):
            r_frames[c_idx] = ensure_safe_cell(r_frames[c_idx], margin=2)
            alpha = r_frames[c_idx][:, :, 3] > 0
            for py in range(2, 50):
                for px in range(2, 50):
                    if not alpha[py, px] and alpha[py - 1, px] and alpha[py + 1, px] and alpha[py, px - 1] and alpha[py, px + 1]:
                        pinholes_total += 1
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
        print(f"{r_name:66s}: 30 frames generated, {adj_diffs}/29 adjacent transitions distinct")

    print(
        f"Boundary clip audit across 270 frames: TOP={top_clips}, BOT={bot_clips}, LEFT={left_clips}, RIGHT={right_clips}, PINHOLES={pinholes_total}"
    )
    out_path = "/home/antigravity/pandora523/arcane-vs-steel/assets/sprites/icemage_sheet.png"
    sheet.save(out_path)
    print("Saved:", out_path, sheet.size)

    # Render zoomed-in left (F00..F14) and right (F15..F29) contact sheets in caller artifact directory
    preview_cell = 96
    pad_top = 24
    dbg = Image.new("RGBA", (30 * preview_cell, num_rows * (preview_cell + pad_top)), (13, 19, 32, 255))
    draw = ImageDraw.Draw(dbg)
    for r_idx, (r_name, r_frames) in enumerate(rows):
        y0 = r_idx * (preview_cell + pad_top)
        draw.rectangle([0, y0, 30 * preview_cell, y0 + pad_top - 2], fill=(22, 34, 56, 255))
        draw.text((8, y0 + 5), r_name, fill=(125, 211, 252, 255))
        for c_idx, arr in enumerate(r_frames):
            x0 = c_idx * preview_cell
            draw.text((x0 + 4, y0 + 13), f"F{c_idx:02d}", fill=(240, 249, 255, 255))
            p_im = Image.fromarray(arr, mode="RGBA").resize((preview_cell, preview_cell), Image.Resampling.NEAREST)
            dbg.paste(p_im, (x0, y0 + pad_top), p_im)
            draw.rectangle(
                [x0, y0 + pad_top, x0 + preview_cell - 1, y0 + pad_top + preview_cell - 1],
                outline=(35, 52, 78, 255),
            )

    art_dir = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/3a4b2cf8-05c2-45a3-bb65-af6f5b5a1088"
    os.makedirs(art_dir, exist_ok=True)
    dbg.crop((0, 0, 15 * preview_cell, dbg.height)).save(f"{art_dir}/debug_icemage_30fps_left_F00_F14.png")
    dbg.crop((15 * preview_cell, 0, 30 * preview_cell, dbg.height)).save(f"{art_dir}/debug_icemage_30fps_right_F15_F29.png")
    print("Saved debug contact sheets in:", art_dir)


if __name__ == "__main__":
    main()
