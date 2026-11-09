#!/usr/bin/env python3
"""
Builds Glacia's (IceMage - Telekinetic Cryo-Prism & Figure-Skating Sorceress) 30-Frame-Per-Animation HD-2D Sprite Sheet:
- 100% Original Silhouette & Animation Set (ZERO Valkyrie wings/pinions, ZERO horizontal spear/polearm, ZERO staff!):
  * Extracted from `assets/sprites/icemage_v2_base.jpg` (Snowflake Tiara, flowing silver-lavender hair, plush white
    arctic fox-fur shoulder stole, midnight-sapphire & frost-cyan snowflake corset dress, front-slit glacial silk skirt,
    and silver-blue heeled figure-skating ice boots).
  * Back Silhouette (`x = 11..24`): Natural flowing silver-white & icy-lavender hair (`y = 9..26`) plus a billowing
    translucent Aurora-Silk Frost Veil (`y = 18..42, x = 11..22`) — NO wings or feather pinions!
  * Weapon / Arcane Focus: HANDS-FREE TELEKINETIC SPELLCASTER! Both 2-bone IK arms end in graceful open conjuring hands
    with glowing cyan fingertips that telekinetically command **3 Levitating Faceted Diamond Cryo-Prism Mirrors & a
    Spinning 6-Pointed Snowflake Astrolabe Orb** floating around her in mid-air!
- 9 rows x 30 columns = 270 unique frames (6240 x 1872 at 208x208 per cell, 52x52 logical upscaled 4x NEAREST):
  * Row 0: IDLE - TELEKINETIC CRYO-PRISM SOVEREIGN (30 frames)
  * Row 1: WALK - FIGURE-SKATING ICE-GLIDE & ORBITING PRISMS (30 frames)
  * Row 2: AUTO_ATTACK - TELEKINETIC PRISM-SHARD & REFRACTION BEAM COMBO (30 frames)
  * Row 3: SKILL - TRI-PRISM LASER MATRIX CONJURATION & IMPLOSION (30 frames)
  * Row 4: ULTIMATE - ABSOLUTE ZERO: SNOWFLAKE ROSE-WINDOW & GLACIER MONOLITH (30 frames)
  * Row 5: DEATH - SHATTERED CRYO-PRISMS & FROZEN COLLAPSE (30 frames)
  * Row 6: DASH - FIGURE-SKATER PIROUETTE GLIDE & ORBITAL PRISM RING (30 frames)
  * Row 7: CROUCH - KNEELING HEXAGONAL ICE-WALL MONOLITH & FROST PULSE (30 frames)
  * Row 8: JUMP - AXEL FIGURE-SKATE VAULT & AERIAL PRISM REFRACTION (30 frames)
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
AURORA_MAGENTA = (232, 121, 249, 255)
AURORA_MINT = (110, 231, 183, 255)

SILVER_DARK = (100, 116, 139, 255)
SILVER_MID = (148, 163, 184, 255)
SILVER_LIGHT = (203, 213, 225, 255)
FUR_SHADOW = (186, 204, 228, 255)
FUR_WHITE = (238, 246, 255, 255)
SKIN_IVORY = (248, 234, 228, 255)
SKIN_ROSE = (224, 198, 196, 255)


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
    scales cleanly into the 52x52 logical cell (`cell[4:46, 12:38]`), and plants the back boot
    (`x = 22..27, y = 38..44`) down +1px so BOTH boots plant firmly on `y = 45`.
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
    cell[4:46, 12:38] = s_arr

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

    # Plant back boot (x=22..27, y=38..44) down +1px so BOTH boots plant firmly on y=45
    back_boot = cell[38:45, 22:28].copy()
    cell[39:46, 22:28] = back_boot
    cell[38, 22:28] = back_boot[0, :]

    return fill_layer_pinholes(cell)


def neutralize_baked_side_arms(tpl_img, max_chest_x=31):
    """
    Neutralizes BOTH static lowered side-arms on Glacia's torso on ALL templates so her
    open telekinetic spellcasting arms are 100% cleanly visible with ZERO extra limbs or
    leftover hands, while preserving her flowing silver-lavender hair (`y = 9..25, x = 12..23`)
    and plush white arctic fox-fur shoulder stole (`y = 13..20, x = 19..34`).
    """
    out = tpl_img.copy()
    for y in range(18, 30):
        lim_x = max_chest_x + 2 if y <= 19 else max_chest_x
        for x in range(lim_x + 1, 50):
            out[y, x] = (0, 0, 0, 0)

    for y in range(20, 29):
        for x in range(18, 24):
            if out[y, x, 3] == 0:
                continue
            r, g, b, _ = out[y, x]
            if y <= 24 and x <= 20 and b > 175 and r > 150:
                continue
            if x <= 20 and y >= 23:
                out[y, x] = (0, 0, 0, 0)
            elif x == 21 and y >= 21:
                out[y, x] = ABYSS_NAVY if y <= 25 else SAPPHIRE_DEEP
            elif x in (22, 23) and 20 <= y <= 26:
                out[y, x] = SAPPHIRE_MID if (x + y) % 2 == 0 else SAPPHIRE_DARK

    return fill_layer_pinholes(out)


def make_clean_templates():
    """
    Constructs Glacia's modular anatomical templates from the clean 52x52 base sprite:
    - `stand`: standing Cryo-Prism Sovereign with lowered side-arms neutralized and boots planted at y=45
    - `stand_upper`: upper body, snowflake tiara, silver-lavender hair, arctic fur stole, and glacial silk skirt (`y=0..37`)
    - `leg_back` (`x=21..28`) and `leg_front` (`x=28..36`): lower silver-blue heeled figure-skating boots at `y=38..46`
    - `lunge`: forward-leaning spellcast body (+2px upper torso lean)
    - `kneel`: dropped to one knee (y+6px)
    - `fall`: 90-degree horizontally collapsed prone body anchored on the floor at y=35..46
    - `dash`: forward-tilted (+12 deg) Figure-Skater Pirouette Glide body
    """
    raw = extract_clean_base_sprite()
    stand = neutralize_baked_side_arms(raw, max_chest_x=31)

    leg_back_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_front_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_back_patch[38:47, 21:28] = stand[38:47, 21:28]
    leg_front_patch[38:47, 28:36] = stand[38:47, 28:36]

    stand_upper = np.zeros((52, 52, 4), dtype=np.uint8)
    stand_upper[:38, :] = stand[:38, :]
    stand_upper = fill_layer_pinholes(stand_upper)

    lunge = np.zeros((52, 52, 4), dtype=np.uint8)
    lunge[32:46, :] = stand[32:46, :]
    for y in range(4, 32):
        dx = 2 if y <= 25 else 1
        for x in range(12, 47):
            if stand[y, x, 3] > 0 and x + dx <= 49:
                lunge[y, x + dx] = stand[y, x]
    lunge = neutralize_baked_side_arms(lunge, max_chest_x=33)
    lunge = fill_layer_pinholes(lunge)

    kneel = np.zeros((52, 52, 4), dtype=np.uint8)
    kneel[38:46, 17:37] = stand[38:46, 17:37]
    for y in range(4, 35):
        ny = y + 6
        if ny < 45:
            for x in range(12, 46):
                if stand[y, x, 3] > 0:
                    kneel[ny, x] = stand[y, x]
    kneel = fill_layer_pinholes(kneel)

    pil_body = Image.fromarray(stand, mode="RGBA")
    rot_90 = np.array(
        pil_body.rotate(-88.0, resample=Image.Resampling.NEAREST, center=(26, 29)),
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

    pil_stand = Image.fromarray(stand, mode="RGBA")
    rot_dash = np.array(
        pil_stand.rotate(-12.0, resample=Image.Resampling.NEAREST, center=(26, 35)),
        dtype=np.uint8,
    )
    dash = np.zeros((52, 52, 4), dtype=np.uint8)
    dys, _ = np.where(rot_dash[:, :, 3] > 0)
    if len(dys) > 0:
        d_shift = 45 - int(dys.max())
        for y in range(52):
            for x in range(52):
                if rot_dash[y, x, 3] > 0:
                    ny = max(4, min(45, y + d_shift))
                    nx = max(12, min(48, x))
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


def apply_hair_and_aurora_veil_wave(
    frame,
    phase_rad,
    amplitude=1.5,
    is_dash=False,
    rune_pulse=0.5,
):
    """
    Animates Glacia's flowing silver-white & icy-lavender hair (`x=12..23, y=9..25`),
    a billowing translucent Aurora-Silk Frost Ribbon Veil (`x=11..21, y=22..41`, NOT wings!),
    snowflake tiara centerpiece & luminous cyan eyes (`y=5..12, x=26..32`),
    and pulsing frost-cyan snowflake embroidery on her corset & layered silk skirt (`y=18..37, x=23..32`).
    """
    out = frame.copy()

    # 1. Flowing Silver-White & Icy-Lavender Hair wave behind neck/fur stole (x=12..23, y=9..25)
    hair_mask = np.zeros((52, 52), dtype=bool)
    for y in range(9, 26):
        for x in range(12, 24):
            if frame[y, x, 3] > 0:
                r, g, b, _ = frame[y, x]
                if b > 155 and r > 135 and g > 140:
                    hair_mask[y, x] = True

    hair_src = frame.copy()
    out[hair_mask] = 0
    for y in range(9, 26):
        dy_h = int(round(math.sin(phase_rad * 1.4 - (y - 9) * 0.38) * 0.7))
        dx_h = int(round((-0.9 if is_dash else 0.0) + math.cos(phase_rad - (y - 9) * 0.35) * 0.7))
        for x in range(12, 24):
            if not hair_mask[y, x]:
                continue
            nx = max(10, min(24, x + dx_h))
            ny = max(6, min(27, y + dy_h))
            out[ny, nx] = hair_src[y, x]
            if x >= 20 and out[y, x, 3] == 0:
                out[y, x] = hair_src[y, x]

    # 2. Flowing Ankle-Length Aurora-Silk Frost Veil Ribbon behind her gown (y=23..41, x=12..20)
    veil_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    for y in range(23, 41):
        u_v = (y - 23) / 18.0
        wave_dx = math.sin(phase_rad * 1.5 - u_v * 3.2) * (amplitude * (0.4 + 0.6 * u_v)) - (1.5 if is_dash else 0.0)
        vx_center = int(round(19.0 - u_v * 4.5 + wave_dx))
        vx_center = max(10, min(21, vx_center))
        set_px(veil_layer, vx_center - 1, y, FROST_LIGHT if y % 3 == 0 else AURORA_LAVENDER)
        set_px(veil_layer, vx_center, y, FROST_CYAN if (y + int(phase_rad * 3)) % 2 == 0 else SAPPHIRE_BRIGHT)
        if u_v < 0.75:
            set_px(veil_layer, vx_center + 1, y, SAPPHIRE_MID)

    out = composite_over(veil_layer, out)
    out = fill_layer_pinholes(out, x0=10, x1=37, y0=5, y1=42, require_3_neighbors=False)

    # 3. Pulsing Snowflake Tiara Gem (y=5..8, x=26..31) & Corset Snowflake Embroidery
    if rune_pulse > 0.45:
        set_px(out, 28, 6, PURE_WHITE if rune_pulse > 0.75 else FROST_LIGHT)
        set_px(out, 29, 6, FROST_CYAN if rune_pulse > 0.75 else GLACIER_MID)
        for rx_p, ry_p in [(27, 19), (29, 22), (26, 27), (30, 31), (25, 34)]:
            if out[ry_p, rx_p, 3] > 0:
                out[ry_p, rx_p] = DIAMOND_WHITE if rune_pulse > 0.82 else FROST_BRIGHT

    return fill_layer_pinholes(out)


def solve_ik_elbow(sx, sy, hx, hy, L1=4.8, L2=4.6, bend_side=1.0):
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


def draw_ik_spellcaster_arm(
    layer,
    sx,
    sy,
    hx,
    hy,
    L1=4.8,
    L2=4.6,
    bend_side=1.0,
    is_rear=False,
    spell_glow=1.0,
):
    """
    Draws Glacia's graceful 2-Bone IK Sapphire-Silk & Arctic-Fur Sleeve Arm ending in an
    OPEN TELEKINETIC SPELLCASTING HAND (NO weapon shaft in hand!) with luminous frost-cyan
    magic motes dancing at her fingertips.
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
            (-0.9, ABYSS_NAVY),
            (-0.3, SAPPHIRE_DARK),
            (0.2, SAPPHIRE_MID),
            (0.8, SAPPHIRE_DEEP),
        ]:
            draw_line_px(layer, sx + n1x * off, sy + n1y * off, ex + n1x * (off * 0.85), ey + n1y * (off * 0.85), col)

        for off, col in [
            (-0.9, ABYSS_NAVY),
            (-0.3, SAPPHIRE_MID),
            (0.2, FROST_CYAN),
            (0.8, SAPPHIRE_DARK),
        ]:
            draw_line_px(layer, ex + n2x * off, ey + n2y * off, hx + n2x * (off * 0.85), hy + n2y * (off * 0.85), col)
        set_px(layer, ex, ey, FROST_LIGHT)
    else:
        for off, col in [
            (-1.0, ABYSS_NAVY),
            (-0.4, SAPPHIRE_MID),
            (0.1, SAPPHIRE_BRIGHT),
            (0.6, FROST_CYAN),
            (1.0, SAPPHIRE_DEEP),
        ]:
            draw_line_px(layer, sx + n1x * off, sy + n1y * off, ex + n1x * (off * 0.85), ey + n1y * (off * 0.85), col)

        for off, col in [
            (-1.0, SAPPHIRE_DEEP),
            (-0.4, SAPPHIRE_BRIGHT),
            (0.1, FROST_LIGHT),
            (0.6, GLACIER_MID),
            (1.0, SAPPHIRE_DARK),
        ]:
            draw_line_px(layer, ex + n2x * off, ey + n2y * off, hx + n2x * (off * 0.85), hy + n2y * (off * 0.85), col)

        # Plush white arctic fox-fur shoulder stole cuff over Lead Shoulder (sx, sy)
        for p_step in (-1.2, -0.5, 0.2, 0.9):
            for r_step in (-0.5, 0.2):
                px_s = sx + ux1 * r_step + n1x * p_step
                py_s = sy + uy1 * r_step + n1y * p_step
                set_px(layer, px_s, py_s, FUR_WHITE if abs(p_step) >= 0.8 else FROST_LIGHT)

        set_px(layer, ex, ey, DIAMOND_WHITE)

    # Graceful 2x2 open ivory hand + glowing cyan spell-fingertip at (hx, hy)
    ix, iy = int(round(hx)), int(round(hy))
    set_px(layer, ix, iy, SKIN_IVORY)
    set_px(layer, ix - 1, iy, FROST_LIGHT if not is_rear else SAPPHIRE_BRIGHT)
    set_px(layer, ix, iy + 1, SKIN_ROSE)
    set_px(layer, ix + 1, iy, PURE_WHITE if spell_glow >= 0.8 else SKIN_IVORY)
    if spell_glow >= 0.6:
        set_px(layer, ix + 1, iy - 1, FROST_CYAN if not is_rear else AURORA_LAVENDER)
    return ex, ey


def draw_pixel_diamond_prism(buf, cx, cy, r=2, col_core=PURE_WHITE, col_mid=FROST_CYAN, col_edge=SAPPHIRE_DARK):
    """
    Draws a crisp stepped pixel-art faceted diamond Cryo-Prism at `(cx, cy)` with radius `r`.
    """
    icx, icy = int(round(cx)), int(round(cy))
    ir = int(round(r))
    for dy in range(-ir - 1, ir + 2):
        rem = ir - abs(dy)
        if rem < 0:
            if abs(dy) == ir + 1:
                set_px(buf, icx, icy + dy, col_mid)
            continue
        for dx in range(-rem, rem + 1):
            if dx == 0 and dy == 0:
                set_px(buf, icx, icy, col_core)
            elif abs(dx) + abs(dy) == ir:
                set_px(buf, icx + dx, icy + dy, col_edge if (dx > 0 and dy > 0) else col_mid)
            else:
                set_px(buf, icx + dx, icy + dy, DIAMOND_WHITE if (dx <= 0 and dy <= 0) else FROST_LIGHT)


def draw_pixel_snowflake_orb(buf, cx, cy, r=3, phase=0.0):
    """
    Draws a spinning 6-pointed pixel-art Snowflake Astrolabe Orb at `(cx, cy)`.
    """
    icx, icy = int(round(cx)), int(round(cy))
    set_px(buf, icx, icy, PURE_WHITE)
    for k in range(6):
        a = phase + k * (math.pi / 3.0)
        for d in range(1, int(round(r)) + 1):
            px_s = icx + int(round(math.cos(a) * d))
            py_s = icy + int(round(math.sin(a) * d))
            col = DIAMOND_WHITE if d == 1 else (FROST_CYAN if k % 2 == 0 else AURORA_LAVENDER)
            set_px(buf, px_s, py_s, col)


def draw_telekinetic_arms_and_prisms(
    canvas,
    rear_shoulder=(23, 18),
    rear_hand=(32, 20),
    lead_shoulder=(28, 19),
    lead_hand=(34, 23),
    prisms=None,
    connect_lasers=False,
    snowflake_orb=None,
    phase=0.0,
    spell_glow=1.0,
):
    """
    Composites Glacia's Rear Spellcasting Arm, Lead Spellcasting Arm, and her
    Levitating Faceted Diamond Cryo-Prisms + Optional Stepped Pixel Refraction Lasers!
    """
    rear_arm = np.zeros((52, 52, 4), dtype=np.uint8)
    lead_arm = np.zeros((52, 52, 4), dtype=np.uint8)
    prism_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    if rear_shoulder is not None and rear_hand is not None:
        draw_ik_spellcaster_arm(
            rear_arm,
            rear_shoulder[0],
            rear_shoulder[1],
            rear_hand[0],
            rear_hand[1],
            L1=4.8,
            L2=4.6,
            bend_side=1.0,
            is_rear=True,
            spell_glow=spell_glow,
        )

    if lead_shoulder is not None and lead_hand is not None:
        draw_ik_spellcaster_arm(
            lead_arm,
            lead_shoulder[0],
            lead_shoulder[1],
            lead_hand[0],
            lead_hand[1],
            L1=5.0,
            L2=4.8,
            bend_side=1.0,
            is_rear=False,
            spell_glow=spell_glow,
        )

    if connect_lasers and prisms and len(prisms) >= 2:
        for i in range(len(prisms)):
            p0 = prisms[i]
            p1 = prisms[(i + 1) % len(prisms)]
            if i == len(prisms) - 1 and len(prisms) == 2:
                break
            draw_line_px(prism_layer, p0[0], p0[1], p1[0], p1[1], FROST_CYAN if i % 2 == 0 else AURORA_LAVENDER)

    if prisms:
        for idx, p_spec in enumerate(prisms):
            px_c, py_c = p_spec[0], p_spec[1]
            pr = p_spec[2] if len(p_spec) > 2 else 2
            c_mid = FROST_CYAN if idx % 2 == 0 else AURORA_LAVENDER
            draw_pixel_diamond_prism(prism_layer, px_c, py_c, r=pr, col_core=PURE_WHITE, col_mid=c_mid, col_edge=SAPPHIRE_DARK)

    if snowflake_orb is not None:
        ox, oy, orad = snowflake_orb
        draw_pixel_snowflake_orb(prism_layer, ox, oy, r=orad, phase=phase)

    out = composite_over(canvas, rear_arm)
    out = composite_over(out, lead_arm)
    out = composite_over(out, prism_layer)
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
    Draws Glacia's sapphire-silk thigh & knee-high silver-blue heeled figure-skating ice boot.
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

    for off_x, col in [
        (-1.8, c_edge),
        (-1.1, c_dark),
        (-0.5, c_mid),
        (0.1, c_hi),
        (0.7, c_trim),
        (1.3, c_mid),
        (1.8, c_edge),
    ]:
        draw_line_px(layer, hip_x + off_x, hip_y, knee_x + off_x * 0.9, knee_y, col)
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

    for dy_k in (-1, 0, 1):
        for dx_k in (-1, 0, 1):
            col_k = c_knee if (dy_k == -1 and dx_k == 0) else c_trim
            set_px(layer, knee_x + dx_k, knee_y + dy_k, col_k)

    return fill_layer_pinholes(layer, x0=3, x1=49, y0=22, y1=48, require_3_neighbors=False)


def render_walk_icemage(tpl, f):
    """
    Row 1 helper: Smooth 30-frame Figure-Skating Ice-Glide stride cycle (`F00..F14` Step A, `F15..F29` Step B)
    with flowing silver-lavender hair and Aurora-Silk Veil (ZERO wings!).
    """
    phase = (f / 30.0) * 2.0 * math.pi
    bob_y = int(round(math.cos(phase * 2.0) * 1.0))

    stand = tpl["stand"].copy()
    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    skirt_overlay = np.zeros((52, 52, 4), dtype=np.uint8)

    for y in range(0, 38):
        ny = y + bob_y
        if not (2 <= ny <= 49):
            continue
        min_tx = 12 if y < 25 else 19
        max_tx = 36
        for x in range(min_tx, max_tx):
            if stand[y, x, 3] > 0:
                torso_layer[ny, x] = stand[y, x]
                if (27 <= y <= 34 and 21 <= x <= 33) or (27 <= y <= 37 and 24 <= x <= 30):
                    skirt_overlay[ny, x] = stand[y, x]

    def build_striding_leg(boot_patch, orig_cx, hip_x, foot_base_x, swing_phase, is_far_leg=False):
        layer = np.zeros((52, 52, 4), dtype=np.uint8)
        s_val = math.sin(swing_phase)
        c_val = math.cos(swing_phase)

        knee_lift = max(0.0, c_val)
        hip_y = 33.5 + bob_y
        knee_x = hip_x + s_val * 2.2 + knee_lift * 1.1
        knee_y = hip_y + 4.5 - knee_lift * 1.6

        foot_target_x = foot_base_x + s_val * 2.5 - knee_lift * 0.7
        foot_lift_dy = bob_y - int(round(knee_lift * 1.8))
        boot_rot_deg = s_val * 8.0 - knee_lift * 10.0

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
        tpl["leg_back"], orig_cx=24.0, hip_x=24.5, foot_base_x=24.0, swing_phase=phase + math.pi, is_far_leg=True
    )
    near_leg = build_striding_leg(
        tpl["leg_front"], orig_cx=31.5, hip_x=30.5, foot_base_x=31.5, swing_phase=phase, is_far_leg=False
    )

    out = composite_over(far_leg, torso_layer)
    out = composite_over(out, near_leg)
    out = composite_over(out, skirt_overlay)
    out = apply_hair_and_aurora_veil_wave(out, phase, amplitude=1.4, rune_pulse=0.75)
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
        for x in range(12, 50):
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
    phase=0.0,
):
    """
    Constructs Glacia's airborne Figure-Skater / Cryo-Sovereign posture (`jump_dy = -3..+2`)
    with ZERO wings and graceful figure-skating tucked legs.
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
        min_tx = 12 if y < 25 else 19
        max_tx = 36
        for x in range(min_tx, max_tx):
            if stand[y, x, 3] > 0:
                nx = max(3, min(48, x + dx))
                torso_layer[ny, nx] = stand[y, x]
                if (27 <= y <= 34 and 21 <= x <= 33) or (27 <= y <= 37 and 24 <= x <= 30):
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
        orig_cx=24.0,
        hip_x=24.5,
        knee_dx=-1.0 - 1.0 * t,
        knee_dy=4.5 - 1.8 * t,
        foot_dx=-0.5 - 1.0 * t,
        foot_dy=dy_i - 2.2 * t,
        boot_rot_deg=-10.0 * t,
        is_far_leg=True,
    )
    near_leg = build_aerial_leg(
        tpl["leg_front"],
        orig_cx=31.5,
        hip_x=30.5,
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
    out = apply_hair_and_aurora_veil_wave(out, phase, amplitude=1.4, rune_pulse=0.9)
    return fill_layer_pinholes(out)


def build_row0_idle(tpl):
    """
    Row 0 (`IDLE` — `TELEKINETIC CRYO-PRISM SOVEREIGN`, 30 frames):
    - Grounded regal Sorceress stance (`y = 4..45`, with a subtle 1px breathing rise on `F08..F21`).
    - NO wings, NO spear, NO staff!
    - Her open spellcasting hands (`rear_hand=(32, 19)`, `lead_hand=(34, 23)`) telekinetically levitate
      **3 Orbiting Faceted Diamond Cryo-Prisms** (`(16, 12)`, `(39, 15)`, `(42, 26)`) and a **Spinning
      Snowflake Astrolabe Orb** (`(37, 20)`) that refract subtle cyan-lavender pixel light threads!
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        breath_dy = -1 if 9 <= f <= 20 else 0

        base = shift_layer(tpl["stand"], dx=0, dy=breath_dy)
        pulse = 0.60 + 0.40 * math.sin(phase)
        base = apply_hair_and_aurora_veil_wave(base, phase, amplitude=1.3, rune_pulse=pulse)

        rh_x = 32
        rh_y = 19 + breath_dy + int(round(math.sin(phase) * 0.8))
        lh_x = 34
        lh_y = 23 + breath_dy + int(round(math.cos(phase) * 0.8))

        p1 = (16, 11 + int(round(math.sin(phase) * 1.5)), 2)
        p2 = (39 + int(round(math.cos(phase) * 1.2)), 14 + int(round(math.sin(phase * 2.0) * 1.2)), 2)
        p3 = (42 + int(round(math.sin(phase) * 1.2)), 26 + int(round(math.cos(phase * 2.0) * 1.2)), 2)

        frame = draw_telekinetic_arms_and_prisms(
            base,
            rear_shoulder=(23, 18 + breath_dy),
            rear_hand=(rh_x, rh_y),
            lead_shoulder=(28, 19 + breath_dy),
            lead_hand=(lh_x, lh_y),
            prisms=[p1, p2, p3],
            connect_lasers=False,
            snowflake_orb=(37, 20 + breath_dy, 2),
            phase=phase,
            spell_glow=0.95,
        )
        frames.append(frame)
    return frames


def build_row1_walk(tpl):
    """
    Row 1 (`WALK` — `FIGURE-SKATING ICE-GLIDE & ORBITING PRISMS`, 30 frames):
    - Glacia glides across the ice with an expressive figure-skater stride (`render_walk_icemage`),
      arms poised gracefully while her 3 levitating Cryo-Prisms orbit in formation ahead of her
      and frost-blade skate ribbons trail behind her heels (`y = 44..45`).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        body = render_walk_icemage(tpl, f)
        bob_y = int(round(math.cos(phase * 2.0) * 1.0))

        swing = math.sin(phase)
        rh_x = int(round(32 + swing * 1.5))
        rh_y = int(round(19 + bob_y - swing * 1.0))
        lh_x = int(round(34 - swing * 1.5))
        lh_y = int(round(23 + bob_y + swing * 1.0))

        p1 = (15, 12 + bob_y + int(round(math.sin(phase * 2.0) * 1.2)), 2)
        p2 = (39, 15 + bob_y + int(round(math.cos(phase * 2.0) * 1.5)), 2)
        p3 = (42, 25 + bob_y - int(round(math.sin(phase * 2.0) * 1.5)), 2)

        frame = draw_telekinetic_arms_and_prisms(
            body,
            rear_shoulder=(23, 18 + bob_y),
            rear_hand=(rh_x, rh_y),
            lead_shoulder=(28, 19 + bob_y),
            lead_hand=(lh_x, lh_y),
            prisms=[p1, p2, p3],
            connect_lasers=False,
            snowflake_orb=(37, 20 + bob_y, 2),
            phase=phase * 2.0,
            spell_glow=1.0,
        )

        # Figure-skating ice-blade frost trail behind her heels (y = 44..45, x = 14..21)
        for w_i in range(3):
            wx = 14 + ((f + w_i * 3) % 7)
            wy = 44 + (w_i % 2)
            set_px(frame, wx, wy, PURE_WHITE if w_i == 0 else FROST_CYAN)
            set_px(frame, wx + 1, wy, FROST_LIGHT)

        frames.append(frame)
    return frames


def build_row2_auto_attack(tpl):
    """
    Row 2 (`AUTO_ATTACK` — `TELEKINETIC PRISM-SHARD & REFRACTION BEAM COMBO`, 30 frames):
    - `F00..F09`: **Left-Hand Telekinetic Prism Snap** — Glacia snaps her left spell-hand forward (`(36, 18)`),
      aligning two Cryo-Prisms (`x = 39, 44`) in front of her to fire a stepped pixel-art Cryo-Shard!
    - `F10..F19`: **Right-Hand Rising Snowflake Sweep** — Glacia sweeps her right spell-hand upward (`(35, 14)`),
      spinning the Snowflake Astrolabe Orb (`(41, 14)`) and launching a twin diamond shard fan in front of her!
    - `F20..F29`: **Dual-Palm Tri-Prism Lens Convergence** — Glacia presses both palms forward (`(35, 19), (35, 23)`),
      locking all 3 Cryo-Prisms into a vertical lens array (`x = 41, y = 12, 20, 28`) that fires a 3-way pixel laser fan!
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 9:
            is_cast = 3 <= f <= 7
            base = (tpl["lunge"] if is_cast else tpl["stand"]).copy()
            base = apply_hair_and_aurora_veil_wave(base, phase * 2.0, amplitude=1.6, rune_pulse=0.95)

            rh_x = [32, 30, 29, 34, 36, 36, 35, 34, 33, 32][f]
            rh_y = [19, 18, 17, 17, 18, 18, 19, 19, 20, 20][f]
            lh_x = [34, 33, 32, 33, 34, 34, 34, 34, 34, 34][f]
            lh_y = [23, 24, 24, 23, 22, 22, 23, 23, 23, 23][f]

            p1 = (39, 14, 2) if is_cast else (16, 12, 2)
            p2 = (44, 18, 2) if is_cast else (38, 16, 2)
            p3 = (39, 25, 2)

            frame = draw_telekinetic_arms_and_prisms(
                base,
                rear_shoulder=(24 if is_cast else 23, 18),
                rear_hand=(rh_x, rh_y),
                lead_shoulder=(29 if is_cast else 28, 19),
                lead_hand=(lh_x, lh_y),
                prisms=[p1, p2, p3],
                connect_lasers=False,
                phase=phase,
                spell_glow=1.2,
            )
            if 4 <= f <= 7:
                draw_pixel_diamond_prism(frame, 45, 17, r=2, col_core=PURE_WHITE, col_mid=FROST_CYAN, col_edge=SAPPHIRE_DARK)
            frames.append(frame)

        elif f <= 19:
            k = f - 10  # 0..9
            is_cast = 2 <= k <= 6
            base = (tpl["lunge"] if is_cast else tpl["stand"]).copy()
            base = apply_hair_and_aurora_veil_wave(base, phase * 2.4, amplitude=1.7, rune_pulse=1.0)

            rh_x = [31, 31, 32, 33, 33, 33, 32, 32, 32, 32][k]
            rh_y = [20, 21, 21, 20, 20, 20, 20, 20, 19, 19][k]
            lh_x = [33, 31, 34, 36, 36, 35, 34, 34, 34, 34][k]
            lh_y = [22, 25, 19, 15, 14, 15, 17, 19, 21, 22][k]

            p1 = (38, 11, 2) if is_cast else (16, 11, 2)
            p2 = (44, 15, 2) if is_cast else (40, 14, 2)
            p3 = (41, 24, 2)

            frame = draw_telekinetic_arms_and_prisms(
                base,
                rear_shoulder=(24 if is_cast else 23, 18),
                rear_hand=(rh_x, rh_y),
                lead_shoulder=(29 if is_cast else 28, 19),
                lead_hand=(lh_x, lh_y),
                prisms=[p1, p2, p3],
                connect_lasers=False,
                snowflake_orb=(40, 17, 3) if is_cast else (37, 19, 2),
                phase=phase * 2.5,
                spell_glow=1.3,
            )
            if 2 <= k <= 6:
                draw_pixel_diamond_prism(frame, 46, 11, r=2, col_core=PURE_WHITE, col_mid=FROST_CYAN, col_edge=SAPPHIRE_DARK)
                draw_pixel_diamond_prism(frame, 46, 22, r=2, col_core=PURE_WHITE, col_mid=AURORA_LAVENDER, col_edge=SAPPHIRE_DARK)
            frames.append(frame)

        else:
            k = f - 20  # 0..9
            is_cast = 2 <= k <= 6
            base = (tpl["lunge"] if is_cast else tpl["stand"]).copy()
            base = apply_hair_and_aurora_veil_wave(base, phase * 2.6, amplitude=1.8, rune_pulse=1.0)

            rh_x = 35 if is_cast else 32
            rh_y = 18 if is_cast else 19
            lh_x = 36 if is_cast else 34
            lh_y = 22 if is_cast else 23

            # Vertical Tri-Prism Lens Array in front of Glacia at x = 41, y = 12, 20, 28
            p1 = (41, 12, 2) if is_cast else (18, 12, 2)
            p2 = (42, 20, 3) if is_cast else (38, 17, 2)
            p3 = (41, 28, 2) if is_cast else (40, 26, 2)

            frame = draw_telekinetic_arms_and_prisms(
                base,
                rear_shoulder=(24 if is_cast else 23, 18),
                rear_hand=(rh_x, rh_y),
                lead_shoulder=(29 if is_cast else 28, 19),
                lead_hand=(lh_x, lh_y),
                prisms=[p1, p2, p3],
                connect_lasers=is_cast,
                phase=phase * 3.0,
                spell_glow=1.4,
            )
            if is_cast:
                for ly in (12, 20, 28):
                    draw_line_px(frame, 42, ly, 47, ly, PURE_WHITE)
                    draw_line_px(frame, 42, ly - 1, 47, ly - 1, FROST_CYAN if ly != 20 else AURORA_MAGENTA)
            frames.append(frame)
    return frames


def build_row3_skill(tpl):
    """
    Row 3 (`SKILL` — `TRI-PRISM LASER MATRIX CONJURATION & IMPLOSION`, 30 frames):
    - Glacia conducts with both spellcasting hands (`F00..F05`), deploying **3 Large Faceted Cryo-Prisms
      in a geometric triangle (`(35, 10), (45, 20), (35, 30)`)** connected by stepped pixel-art cyan-violet
      laser beams (`F06..F20`), then claps her hands (`F21..F25`) to implode the triangle into a diamond starburst!
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 5:
            u = f / 5.0
            base = tpl["stand"].copy()
            base = apply_hair_and_aurora_veil_wave(base, phase * 2.0, amplitude=1.5, rune_pulse=0.9)
            rh = (int(round(32 + 2 * u)), int(round(19 - 5 * u)))
            lh = (int(round(34 + 2 * u)), int(round(23 + 3 * u)))
            p1 = (int(round(35)), int(round(12 - 2 * u)), 2)
            p2 = (int(round(39 + 6 * u)), 20, 2)
            p3 = (int(round(35)), int(round(26 + 4 * u)), 2)
            frame = draw_telekinetic_arms_and_prisms(
                base,
                rear_shoulder=(23, 18),
                rear_hand=rh,
                lead_shoulder=(28, 19),
                lead_hand=lh,
                prisms=[p1, p2, p3],
                connect_lasers=(f >= 3),
                phase=phase,
                spell_glow=1.2,
            )
            frames.append(frame)

        elif f <= 20:
            k = f - 6  # 0..14
            base = tpl["lunge"].copy()
            base = apply_hair_and_aurora_veil_wave(base, phase * 2.5, amplitude=1.7, rune_pulse=1.0)
            p1 = (35, 10, 3)
            p2 = (45, 20, 3)
            p3 = (35, 30, 3)
            frame = draw_telekinetic_arms_and_prisms(
                base,
                rear_shoulder=(24, 18),
                rear_hand=(33, 14 + (k % 2)),
                lead_shoulder=(29, 19),
                lead_hand=(34, 25 - (k % 2)),
                prisms=[p1, p2, p3],
                connect_lasers=True,
                snowflake_orb=(39, 20, 3),
                phase=k * 0.6,
                spell_glow=1.45,
            )
            # Converging laser lines from the 3 triangle vertices to the central Snowflake Orb at (39, 20)
            if k >= 7:
                for vx_p, vy_p in [(35, 10), (45, 20), (35, 30)]:
                    draw_line_px(frame, vx_p, vy_p, 39, 20, PURE_WHITE if k % 2 == 0 else AURORA_MAGENTA)
            frames.append(frame)

        else:
            k = f - 21  # 0..8
            u = k / 8.0
            base = tpl["stand"].copy()
            base = apply_hair_and_aurora_veil_wave(base, phase, amplitude=1.4, rune_pulse=0.9 - 0.2 * u)
            p1 = (int(round(39 * (1.0 - u) + 16 * u)), int(round(20 * (1.0 - u) + 12 * u)), 2)
            p2 = (int(round(39 * (1.0 - u) + 39 * u)), int(round(20 * (1.0 - u) + 15 * u)), 2)
            p3 = (int(round(39 * (1.0 - u) + 42 * u)), int(round(20 * (1.0 - u) + 26 * u)), 2)
            frame = draw_telekinetic_arms_and_prisms(
                base,
                rear_shoulder=(23, 18),
                rear_hand=(33, 20),
                lead_shoulder=(28, 19),
                lead_hand=(34, 21),
                prisms=[p1, p2, p3],
                connect_lasers=False,
                snowflake_orb=(39, 20, 4 if k <= 3 else 2),
                phase=phase * 3.0,
                spell_glow=1.3 - 0.3 * u,
            )
            frames.append(frame)
    return frames


def draw_snowflake_rose_window_halo(canvas, cx=24, cy=18, r=11, phase=0.0):
    """
    Row 4 Ultimate backdrop: Renders a Circular 8-Pointed Snowflake Rose-Window Mandala
    centered behind Glacia's torso (`cx = 24, cy = 18, r = 11`) — a true geometric crystal mandala
    (NOT wings!).
    """
    halo = np.zeros((52, 52, 4), dtype=np.uint8)
    for s in range(36):
        a = (s / 36.0) * 2.0 * math.pi + phase
        rx = cx + math.cos(a) * r
        ry = cy + math.sin(a) * r
        set_px(halo, rx, ry, DIAMOND_WHITE if s % 3 == 0 else FROST_CYAN)

    for k in range(8):
        a = phase * 0.5 + k * (math.pi * 0.25)
        draw_line_px(
            halo,
            cx + math.cos(a) * 3.0,
            cy + math.sin(a) * 3.0,
            cx + math.cos(a) * (r + 1.5),
            cy + math.sin(a) * (r + 1.5),
            PURE_WHITE if k % 2 == 0 else AURORA_LAVENDER,
        )
    return composite_over(halo, canvas)


def draw_mini_glacier_monolith(canvas, f, phase):
    """
    Row 4 Ultimate foreground (`F06..F25`): Conjures a Faceted Pixel-Art Diamond Iceberg Monolith
    (`x = 38..46, y = 10..44`) in front of Glacia that shatters into pixel snowflakes on `F20..F25`!
    """
    out = canvas.copy()
    cx = 42
    if f <= 19:
        grow = min(1.0, (f - 5) / 5.0)
        top_y = int(round(44 - 32 * grow))
        for y in range(top_y, 45):
            u_y = (44 - y) / max(1.0, float(44 - top_y))
            hw = int(round(4.0 * (1.0 - max(0.0, u_y - 0.35) / 0.65)))
            for dx in range(-hw, hw + 1):
                if abs(dx) == hw:
                    col = PURE_WHITE if dx <= 0 else SAPPHIRE_DARK
                elif dx == 0:
                    col = PURE_WHITE if (y + f) % 2 == 0 else FROST_LIGHT
                elif dx < 0:
                    col = FROST_CYAN
                else:
                    col = AURORA_LAVENDER if (y + dx) % 3 == 0 else SAPPHIRE_MID
                set_px(out, cx + dx, y, col)
    else:
        # F20..F25: Shatter into diamond frost stars
        u = (f - 20) / 5.0
        for s_i in range(6):
            ang = s_i * (math.pi / 3.0) + phase
            sx = max(35, min(47, int(round(cx + math.cos(ang) * (2.0 + u * 5.0)))))
            sy = max(8, min(44, int(round(26 + math.sin(ang) * (4.0 + u * 12.0)))))
            draw_pixel_diamond_prism(out, sx, sy, r=1, col_core=PURE_WHITE, col_mid=FROST_CYAN, col_edge=AURORA_VIOLET)
    return out


def build_row4_ultimate(tpl):
    """
    Row 4 (`ULTIMATE` — `ABSOLUTE ZERO: SNOWFLAKE ROSE-WINDOW & GLACIER MONOLITH`, 30 frames):
    - NO wings and ZERO falling Valkyrie spears!
    - Glacia levitates (`dy = -2`) in front of a **Circular 8-Pointed Snowflake Rose-Window Mandala**,
      raising both hands to her crown (`(25, 12), (32, 12)`) to summon and shatter a **Faceted Diamond
      Glacier Monolith (`x = 38..46, y = 10..44`)**!
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 5:
            u = f / 5.0
            dy = -int(round(u * 2.0))
            body = make_aerial_icemage(tpl, jump_dy=dy, body_tilt_deg=0.0, leg_tuck=0.35 * u, phase=phase * 2.0)
            body = draw_snowflake_rose_window_halo(body, cx=24, cy=18 + dy, r=int(round(6 + 5 * u)), phase=phase)
            frame = draw_telekinetic_arms_and_prisms(
                body,
                rear_shoulder=(23, 18 + dy),
                rear_hand=(int(round(32 - 5 * u)), int(round(19 - 7 * u))),
                lead_shoulder=(28, 19 + dy),
                lead_hand=(33, int(round(22 - 9 * u))),
                prisms=[(16, 9, 2), (38, 12, 2), (42, 24, 2)],
                connect_lasers=False,
                phase=phase * 2.0,
                spell_glow=1.4,
            )
            frames.append(frame)

        elif f <= 25:
            dy = -2
            body = make_aerial_icemage(tpl, jump_dy=dy, body_tilt_deg=0.0, leg_tuck=0.35, phase=phase * 2.5)
            body = draw_snowflake_rose_window_halo(body, cx=24, cy=16, r=11, phase=phase * 2.0)
            frame = draw_telekinetic_arms_and_prisms(
                body,
                rear_shoulder=(23, 16),
                rear_hand=(26, 11 if f <= 19 else 17),
                lead_shoulder=(28, 17),
                lead_hand=(34, 12 if f <= 19 else 19),
                prisms=[(14, 8, 2), (35, 9, 2)],
                connect_lasers=False,
                snowflake_orb=(29, 4, 2),
                phase=phase * 3.0,
                spell_glow=1.5,
            )
            frame = draw_mini_glacier_monolith(frame, f, phase)
            frames.append(frame)

        else:
            k = f - 26  # 0..3
            u = (k + 1) / 4.0
            dy = -2 + int(round(u * 2.0))
            body = make_aerial_icemage(tpl, jump_dy=dy, body_tilt_deg=0.0, leg_tuck=0.35 * (1.0 - u), phase=phase)
            frame = draw_telekinetic_arms_and_prisms(
                body,
                rear_shoulder=(23, 18 + dy),
                rear_hand=(32, 19),
                lead_shoulder=(28, 19 + dy),
                lead_hand=(34, 23),
                prisms=[(16, 12, 2), (39, 15, 2), (42, 26, 2)],
                phase=phase,
                spell_glow=1.1,
            )
            frames.append(frame)
    return frames


def build_row5_death(tpl):
    """
    Row 5 (`DEATH` — `SHATTERED CRYO-PRISMS & FROZEN COLLAPSE`, 30 frames):
    - `F00..F06`: Hurt stagger recoil as her 3 levitating Cryo-Prisms crack and scatter outward.
    - `F07..F17`: Progressive kneeling collapse (`tpl['kneel']`), clutching her chest as her prisms fall toward the floor.
    - `F18..F29`: Grounded horizontal prone collapse (`tpl['fall']`, `y = 35..46`) with shattered diamond prism shards
      resting on the ground (`y = 44..46`) and drifting pixel snowflakes.
    """
    frames = []
    for f in range(30):
        if f <= 6:
            u = f / 6.0
            dx = -int(round(math.sin(u * math.pi * 0.85) * 2.0))
            dy = int(round(u * 2.0))
            base = shift_layer(tpl["stand"], dx=dx, dy=dy)
            base = apply_hair_and_aurora_veil_wave(base, u * math.pi, amplitude=1.4, rune_pulse=0.4)
            frame = draw_telekinetic_arms_and_prisms(
                base,
                rear_shoulder=(23 + dx, 18 + dy),
                rear_hand=(30 + dx, 20 + dy),
                lead_shoulder=(28 + dx, 19 + dy),
                lead_hand=(32 + dx, 22 + dy),
                prisms=[(15, 13 + f, 2), (39 + (f // 2), 16 + f, 2), (42, 27 + f, 2)],
                spell_glow=0.5,
            )
            frames.append(frame)

        elif f <= 17:
            u = (f - 7) / 10.0
            kneel_src = tpl["kneel"].copy()
            extra_drop = 0 if f <= 12 else (f - 12)
            base = np.zeros((52, 52, 4), dtype=np.uint8)
            for sy in range(8, 46):
                for sx in range(12, 48):
                    if kneel_src[sy, sx, 3] > 0:
                        if sy <= 34:
                            ny = min(45, sy + 1 + extra_drop)
                            nx = min(48, sx + (1 if (extra_drop >= 2 and sy <= 24) else 0))
                        else:
                            ny = min(46, sy + 1)
                            nx = sx
                        base[ny, nx] = kneel_src[sy, sx]
            base = fill_layer_pinholes(base)
            base = apply_hair_and_aurora_veil_wave(base, u * math.pi, amplitude=0.9, rune_pulse=0.2)
            frame = draw_telekinetic_arms_and_prisms(
                base,
                rear_shoulder=(23, 22 + extra_drop),
                rear_hand=(30, 26 + extra_drop),
                lead_shoulder=(28, 23 + extra_drop),
                lead_hand=(32, 29 + extra_drop),
                prisms=[(16, min(44, 24 + f), 1), (38, min(44, 26 + f), 2), (43, min(44, 32 + f), 1)],
                spell_glow=0.3,
            )
            frames.append(frame)

        else:
            k = f - 18  # 0..11
            frame = shift_layer(tpl["fall"], dx=0, dy=1)
            for cx_p in range(12, 32):
                for cy_p in range(41, 45):
                    if frame[cy_p, cx_p, 3] == 0 and (cx_p <= 26 or cy_p <= 43):
                        frame[cy_p, cx_p] = SAPPHIRE_MID if (cx_p + cy_p) % 2 == 0 else SAPPHIRE_DARK
            frame = fill_layer_pinholes(frame, x0=6, x1=44, y0=34, y1=47, require_3_neighbors=False)

            # Shattered diamond Cryo-Prism fragments resting on the floor (y = 44..45)
            for px_s, col_s in [(15, FROST_LIGHT), (36, FROST_CYAN), (41, AURORA_LAVENDER), (44, PURE_WHITE)]:
                set_px(frame, px_s, 45, col_s)
                set_px(frame, px_s + 1, 45, SAPPHIRE_MID)
                set_px(frame, px_s, 44, PURE_WHITE)

            # Fading pixel snowflakes drifting gently down so every frame F18..F29 is distinct
            num_flakes = max(1, 5 - (k // 3))
            for f_i in range(num_flakes):
                fx_p = 15 + f_i * 6 + ((k + f_i) % 3)
                fy_p = min(43, 31 + k + f_i * 2)
                set_px(frame, fx_p, fy_p, PURE_WHITE if (f_i + k) % 2 == 0 else FROST_CYAN)
                set_px(frame, fx_p + 1, fy_p, FROST_LIGHT if f_i % 2 == 0 else AURORA_LAVENDER)

            frames.append(frame)

    return frames


def build_row6_dash(tpl):
    """
    Row 6 (`DASH` — `FIGURE-SKATER PIROUETTE GLIDE & ORBITAL PRISM RING`, 30 frames):
    - Glacia leans forward in a low figure-skating glide (`tpl['dash']`) with one hand extended ahead (`(36, 20)`),
      frost-blade skate ribbons streaming along the ice (`y = 44..45`), and her **3 Cryo-Prisms orbiting in a
      3D horizontal ring around her waist (`y = 22..28`)**!
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        base = tpl["dash"].copy() if 2 <= f <= 25 else tpl["stand"].copy()
        base = apply_hair_and_aurora_veil_wave(base, phase * 2.0, amplitude=1.8, is_dash=(2 <= f <= 25), rune_pulse=0.95)

        prisms = []
        for k in range(3):
            oa = phase * 3.0 + k * (2.0 * math.pi / 3.0)
            px_o = int(round(28 + math.cos(oa) * 11.0))
            py_o = int(round(24 + math.sin(oa) * 3.5))
            prisms.append((px_o, py_o, 2))

        frame = draw_telekinetic_arms_and_prisms(
            base,
            rear_shoulder=(23, 18),
            rear_hand=(18, 22) if 2 <= f <= 25 else (32, 19),
            lead_shoulder=(29, 19),
            lead_hand=(37, 20) if 2 <= f <= 25 else (34, 23),
            prisms=prisms,
            connect_lasers=False,
            snowflake_orb=(42, 20, 2) if 2 <= f <= 25 else None,
            phase=phase * 3.0,
            spell_glow=1.3,
        )

        # Streaming figure-skating ice-blade ribbons along the floor (y = 44..45, x = 8..28)
        if 2 <= f <= 25:
            for r_i in range(4):
                rx0 = 8 + ((f * 2 + r_i * 4) % 14)
                ry0 = 44 + (r_i % 2)
                draw_line_px(frame, rx0, ry0, min(26, rx0 + 4), ry0, PURE_WHITE if r_i % 2 == 0 else FROST_CYAN)

        frames.append(frame)
    return frames


def draw_kneeling_ice_wall_monolith(canvas, f, phase):
    """
    Row 7 Crouch helper (`F05..F23`): Renders a towering Hexagonal Pixel-Art Ice-Wall Monolith
    (`x = 39..45, y = 14..45`) erected directly in front of Glacia's kneeling palms!
    """
    out = canvas.copy()
    grow = min(1.0, (f - 4) / 4.0) if f <= 19 else max(0.2, 1.0 - (f - 19) / 5.0)
    top_y = int(round(45 - 30 * grow))
    for y in range(top_y, 46):
        hw = 3 if y > top_y + 3 else max(1, y - top_y)
        for dx in range(-hw, hw + 1):
            wx = 42 + dx
            if abs(dx) == hw or y == top_y:
                col = PURE_WHITE if dx <= 0 else SAPPHIRE_DARK
            elif dx == 0:
                col = PURE_WHITE if (y + f) % 3 == 0 else FROST_LIGHT
            elif dx < 0:
                col = FROST_CYAN
            else:
                col = GLACIER_MID if (y + dx) % 2 == 0 else SAPPHIRE_MID
            set_px(out, wx, y, col)

    # Horizontal refractive frost pulse firing through the Ice-Wall on F10..F17
    if 10 <= f <= 17:
        draw_line_px(out, 35, 25, 47, 25, PURE_WHITE)
        draw_line_px(out, 35, 24, 47, 24, FROST_CYAN)
        draw_line_px(out, 35, 26, 47, 26, AURORA_LAVENDER)
    return out


def build_row7_crouch(tpl):
    """
    Row 7 (`CROUCH` — `KNEELING HEXAGONAL ICE-WALL MONOLITH & FROST PULSE`, 30 frames):
    - Glacia drops into a low kneeling spell-guard (`make_crouch_icemage(tpl, d=4)`), pressing both palms
      forward (`(34, 24), (35, 26)`) to erect a **Hexagonal Pixel-Art Ice-Wall Monolith (`x = 39..45, y = 14..45`)**!
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 4:
            d = min(4, f + 1)
        elif f <= 22:
            d = 4
        else:
            d = max(0, 4 - (f - 22))

        body = make_crouch_icemage(tpl, d)
        body = apply_hair_and_aurora_veil_wave(body, phase, amplitude=1.2, rune_pulse=0.9)

        frame = draw_telekinetic_arms_and_prisms(
            body,
            rear_shoulder=(23, 18 + d),
            rear_hand=(34, 21 + d),
            lead_shoulder=(28, 19 + d),
            lead_hand=(35, 23 + d),
            prisms=[(16, 13 + d, 2), (37, 16 + d, 2)],
            phase=phase * 2.0,
            spell_glow=1.3,
        )
        if 5 <= f <= 23:
            frame = draw_kneeling_ice_wall_monolith(frame, f, phase)
        frames.append(frame)
    return frames


def build_row8_jump(tpl):
    """
    Row 8 (`JUMP` — `AXEL FIGURE-SKATE VAULT & AERIAL PRISM REFRACTION`, 30 frames):
    - ZERO ground pixels during mid-air frames (`F04..F23`)!
    - `F00..F03`: Skater knee-bend takeoff (`d = 2..0`).
    - `F04..F13`: Mid-air figure-skating Axel leap (`jump_dy = -3`), arms arched gracefully overhead (`(28, 11), (33, 12)`)
      with a spinning Snowflake Orb at `(31, 7)` and orbiting Cryo-Prisms.
    - `F14..F23`: Mid-air downward telekinetic refraction cast (`(34, 20), (35, 22)`), deploying 2 Cryo-Prisms below her
      (`(38, 30), (43, 34)`) that fire stepped pixel-art frost rays downward (`y <= 41`, zero ground contact).
    - `F24..F29`: Skater landing with a frost-crystal ground ring at `y = 45`.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 3:
            d = [1, 2, 1, 0][f]
            body = make_crouch_icemage(tpl, d) if d > 0 else make_aerial_icemage(tpl, jump_dy=-1, leg_tuck=0.35, phase=phase)
            frame = draw_telekinetic_arms_and_prisms(
                body,
                rear_shoulder=(23, 18 + d),
                rear_hand=(32, 18 + d),
                lead_shoulder=(28, 19 + d),
                lead_hand=(34, 21 + d),
                prisms=[(16, 12 + d, 2), (39, 15 + d, 2), (42, 25 + d, 2)],
                phase=phase,
                spell_glow=1.1,
            )
            frames.append(frame)

        elif f <= 13:
            k = f - 4  # 0..9
            jump_dy = -2 if k <= 1 else -3
            body = make_aerial_icemage(tpl, jump_dy=jump_dy, body_tilt_deg=-4.0, leg_tuck=0.65, phase=phase * 2.2)
            frame = draw_telekinetic_arms_and_prisms(
                body,
                rear_shoulder=(23, 18 + jump_dy),
                rear_hand=(28, 11 + jump_dy),
                lead_shoulder=(28, 19 + jump_dy),
                lead_hand=(33, 12 + jump_dy),
                prisms=[(15, 11, 2), (38, 13, 2), (41, 23, 2)],
                snowflake_orb=(31, 7, 2),
                phase=phase * 2.5,
                spell_glow=1.35,
            )
            frame[42:, :, :] = 0
            frames.append(frame)

        elif f <= 23:
            k = f - 14  # 0..9
            jump_dy = -3 if k <= 4 else -2
            body = make_aerial_icemage(tpl, jump_dy=jump_dy, body_tilt_deg=8.0, leg_tuck=0.55, phase=phase * 2.5)
            frame = draw_telekinetic_arms_and_prisms(
                body,
                rear_shoulder=(23, 18 + jump_dy),
                rear_hand=(34, 19 + jump_dy),
                lead_shoulder=(28, 19 + jump_dy),
                lead_hand=(35, 22 + jump_dy),
                prisms=[(16, 12, 2), (38, 28, 2), (43, 33, 2)],
                connect_lasers=False,
                snowflake_orb=(39, 23, 2),
                phase=phase * 3.0,
                spell_glow=1.45,
            )
            draw_pixel_diamond_prism(frame, 45, 37, r=2, col_core=PURE_WHITE, col_mid=FROST_CYAN, col_edge=SAPPHIRE_DARK)
            frame[42:, :, :] = 0
            frames.append(frame)

        else:
            k = f - 24  # 0..5
            crouch_d = [3, 2, 1, 1, 0, 0][k]
            body = make_crouch_icemage(tpl, crouch_d) if crouch_d > 0 else tpl["stand"].copy()
            body = apply_hair_and_aurora_veil_wave(body, phase, amplitude=1.4, rune_pulse=0.9)
            frame = draw_telekinetic_arms_and_prisms(
                body,
                rear_shoulder=(23, 18 + crouch_d),
                rear_hand=(32, 19 + crouch_d),
                lead_shoulder=(28, 19 + crouch_d),
                lead_hand=(34, 23 + crouch_d),
                prisms=[(16, 12 + crouch_d, 2), (39, 15 + crouch_d, 2), (42, 26 + crouch_d, 2)],
                phase=phase,
                spell_glow=1.1,
            )
            if k <= 2:
                for gx in range(18, 40, 2):
                    set_px(frame, gx, 45, PURE_WHITE if (gx + k) % 4 == 0 else FROST_CYAN)
            frames.append(frame)
    return frames


def main():
    tpl = make_clean_templates()

    rows = [
        ("ROW 0: IDLE - TELEKINETIC CRYO-PRISM SOVEREIGN (30 FRAMES)", build_row0_idle(tpl)),
        ("ROW 1: WALK - FIGURE-SKATING ICE-GLIDE & PRISMS (30 FRAMES)", build_row1_walk(tpl)),
        ("ROW 2: AUTO_ATTACK - TELEKINETIC PRISM-SHARD COMBO (30 FRAMES)", build_row2_auto_attack(tpl)),
        ("ROW 3: SKILL - TRI-PRISM LASER MATRIX CONJURATION (30 FRAMES)", build_row3_skill(tpl)),
        ("ROW 4: ULTIMATE - SNOWFLAKE ROSE-WINDOW & MONOLITH (30 FRAMES)", build_row4_ultimate(tpl)),
        ("ROW 5: DEATH - SHATTERED CRYO-PRISMS & COLLAPSE (30 FRAMES)", build_row5_death(tpl)),
        ("ROW 6: DASH - FIGURE-SKATER PIROUETTE & PRISM RING (30 FRAMES)", build_row6_dash(tpl)),
        ("ROW 7: CROUCH - KNEELING HEXAGONAL ICE-WALL MONOLITH (30 FRAMES)", build_row7_crouch(tpl)),
        ("ROW 8: JUMP - AXEL SKATE VAULT & AERIAL REFRACTION (30 FRAMES)", build_row8_jump(tpl)),
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
            cell_208 = np.array(cell_im, dtype=np.uint8)
            cell_208[:8, :, :] = 0
            cell_208[200:, :, :] = 0
            cell_208[:, :8, :] = 0
            cell_208[:, 200:, :] = 0
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
