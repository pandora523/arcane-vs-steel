#!/usr/bin/env python3
"""
Builds Torgar's (Titan - Runic Titan-Forger) 30-Frame-Per-Animation HD-2D Sprite Sheet:
- 9 rows x 30 columns = 270 unique frames (6240 x 1872 at 208x208 per cell, 52x52 logical upscaled 4x NEAREST):
  * Row 0: IDLE (30 frames)
  * Row 1: WALK (30 frames)
  * Row 2: AUTO_ATTACK - TECTONIC HAMMER QUAKE (30 frames)
  * Row 3: SKILL - ANVIL OF THE MOUNTAIN KING (30 frames)
  * Row 4: ULTIMATE - RAGNAROK: WORLD-FORGE ERUPTION (30 frames)
  * Row 5: DEATH & HURT (30 frames)
  * Row 6: DASH - MOLTEN JUGGERNAUT STAMPEDE (30 frames)
  * Row 7: CROUCH - IRON-ANVIL BULWARK & MAGMA COUNTER (30 frames)
  * Row 8: JUMP - METEOR FORGE-LEAP & AERIAL HAMMER DUNK (30 frames)
- Un-inked clean pixel art: zero white background halo, strictly ONE Colossal World-Breaker Runic War-Hammer per frame,
  horizontal fallen body & flat horizontal hammer on Death F18..F29, and zero bouncy-ball frames in Jump.
"""

from collections import deque
import math
import numpy as np
from PIL import Image, ImageDraw

# Palette matching Torgar's HD-2D Runic Titan-Forger aesthetic
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


def ensure_safe_cell(cell, margin=1):
    """
    Guarantees zero pixels touch the 52x52 cell border (x=0, x=51, y=0, y=51) and fills
    any 1px interior pinholes from movement.
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

    # Clear extreme perimeter inside margin so NO pixel ever touches 0 or 51
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
    path="/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/4f1fb80f-a88f-4496-9746-b4b9fe84f6d4/titan_v1_base_1794101258946.jpg",
):
    """
    Loads `titan_v1_base_1794101258946.jpg` (1024x1024), performs a BFS flood-fill from all 4 image borders
    to strip the white background + 1px anti-aliased fringe (ZERO white halo!), crops tight character bounds,
    and scales cleanly into the 52x52 logical cell with Torgar's boots planted firmly at y=45 (y=6..45),
    preserving his full bronze battle-girdle, runic loin-tabard, hip tassets (`y=29..36, x=15..33`),
    and sweeping crimson cape (`x=5..22, y=15..42`).
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
    scaled = crop.resize((41, 40), Image.Resampling.NEAREST)
    s_arr = np.array(scaled, dtype=np.uint8)

    cell = np.zeros((52, 52, 4), dtype=np.uint8)
    cell[6:46, 4:45] = s_arr

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

    # Plant right boot (x=33..43, y=38..44) down +1px so BOTH boots plant firmly on y=45
    # while duplicating row 38 so zero horizontal slit opens at y=38!
    right_boot = cell[38:45, 33:44].copy()
    cell[39:46, 33:44] = right_boot
    cell[38, 33:44] = right_boot[0, :]

    # Re-center Torgar's torso while preserving his wide bronze battle-girdle/tassets (y=29..36, x=15..33)
    # and full crimson cape (x=5..22, y=15..42)
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

    # Ensure smooth right hip tasset transition at y=30..32 (x=30..32) so the waist/pelvis is never pinched
    for y in range(30, 33):
        for x in range(30, 33):
            if centered[y, x, 3] == 0:
                centered[y, x] = BRONZE_MID if x == 31 else OBSIDIAN_DARK

    # Preserve central runic loin-tabard at y=29..36 (x=19..25), and fill crimson cape backdrop
    # behind the legs at y=31..40 (x=6..12) so the cape sweeps continuously behind his back leg
    for y in range(31, 40):
        x_left = max(5, 5 + (y - 31))
        for x in range(x_left, 13):
            if centered[y, x, 3] == 0:
                centered[y, x] = MANTLE_CHARCOAL if (x == x_left or y == 39) else (CAPE_DARK if (x + y) % 2 == 0 else CAPE_DEEP)

    # Clear only lower between-leg pixels at y=38..42, x=19..25 so standing legs separate cleanly below the runic tabard
    centered[38:43, 19:26] = 0
    return fill_layer_pinholes(centered)


def neutralize_baked_front_arm(tpl_img, max_chest_x=29):
    """
    Neutralizes the static baked arms/hands on Torgar's torso on ALL templates so the single
    dynamic 2-bone IK arm is 100% cleanly visible without a frozen duplicate arm or chest hand:
    - Erases any protruding right arm pixels (`x > max_chest_x, 16 <= y <= 29`).
    - Repaints any bright bronze/skin/magma pixels on his chest & upper shoulder (`15 <= x <= max_chest_x, 15 <= y <= 28`)
      to clean dark obsidian breastplate shading (`OBSIDIAN_DARK`, `OBSIDIAN_MID`, `BRONZE_SHADOW`),
      while preserving his wide bronze battle-girdle and armored tassets (`y >= 29`).
    """
    out = tpl_img.copy()
    for y in range(15, 30):
        if y >= 16:
            lim_x = max_chest_x if y <= 28 else max_chest_x + 2
            for x in range(lim_x + 1, 51):
                # Preserve lower horn/helm tip at y == 16, x <= max_chest_x + 2
                if y == 16 and x <= max_chest_x + 2:
                    continue
                out[y, x] = (0, 0, 0, 0)
        for x in range(15, min(51, max_chest_x + 1)):
            # Preserve horned helm & glowing amber eyes at y <= 16, x >= 24
            if y <= 16 and x >= 24:
                continue
            if 15 <= y <= 28 and out[y, x, 3] > 0:
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
    Constructs Torgar's modular anatomical templates from the clean 52x52 base sprite:
    - `stand`: full standing juggernaut with static baked arms neutralized and full battle-girdle/tassets preserved
    - `stand_punch`: standing juggernaut with static baked arms neutralized
    - `stand_upper`: upper body & armored pelvis/tassets (`y=0..35`)
    - `leg_back` (`leg_near`) and `leg_front` (`leg_far`): lower greave/sabaton boots ONLY at y=39..46
    - `lunge`: forward-leaning attack body with static baked arms neutralized
    - `kneel`: dropped to one knee (y+6px) with static baked arms neutralized
    - `fall`: 90-degree horizontally collapsed body on the ground (y=36..45)
    - `dash`: forward-tilted (+16 deg) Molten Juggernaut Stampede body with static baked arms neutralized
    """
    raw = extract_clean_base_sprite()

    # 1. Neutralize static baked front/chest arms on stand AND stand_punch while preserving pelvis/tassets (y >= 29)
    stand = neutralize_baked_front_arm(raw, max_chest_x=29)
    stand[28, 31:, :] = 0
    stand[29, 32:, :] = 0
    stand = fill_layer_pinholes(stand)
    stand_punch = stand.copy()

    # 2. Extract ONLY the lower greave/sabaton boots at y=39..46 (y < 39 strictly 0!)
    # - leg_back (viewer left): 10 <= x <= 20, 39 <= y <= 46
    # - leg_front (viewer right): 26 <= x <= 36, 39 <= y <= 46
    leg_back_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_front_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_back_patch[39:47, 10:21] = stand[39:47, 10:21]
    leg_front_patch[39:47, 26:37] = stand[39:47, 26:37]

    # 3. Upper torso & armored battle-girdle/tassets (y=0..35)
    stand_upper = np.zeros((52, 52, 4), dtype=np.uint8)
    stand_upper[:36, :] = stand[:36, :]
    stand_upper[36:41, :13] = stand[36:41, :13]
    stand_upper = fill_layer_pinholes(stand_upper)

    # 4. Forward-leaning lunge body (+2px upper-body lean) with baked arms neutralized
    lunge = np.zeros((52, 52, 4), dtype=np.uint8)
    lunge[32:46, :] = stand[32:46, :]
    for y in range(5, 32):
        dx = 2 if y <= 25 else 1
        for x in range(3, 49):
            if stand[y, x, 3] > 0 and x + dx < 50:
                lunge[y, x + dx] = stand[y, x]
    lunge = neutralize_baked_front_arm(lunge, max_chest_x=31)
    lunge = fill_layer_pinholes(lunge)

    # 5. Kneeling body (torso dropped +6px onto bent knees planted at y=45) with baked arms neutralized
    kneel = np.zeros((52, 52, 4), dtype=np.uint8)
    kneel[38:46, 10:38] = stand[38:46, 10:38]
    for y in range(6, 35):
        ny = y + 6
        if ny < 45:
            for x in range(3, 46):
                if stand[y, x, 3] > 0:
                    kneel[ny, x] = stand[y, x]
    kneel = neutralize_baked_front_arm(kneel, max_chest_x=29)
    kneel = fill_layer_pinholes(kneel)

    # 6. Horizontally collapsed body (90-degree rotated flat on the ground at y=36..45)
    body_no_cape = stand.copy()
    body_no_cape[20:40, 3:12] = 0
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

    # 7. Dash body (+16 deg forward juggernaut bull-rush tilt with streaming fur mantle)
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
    Animates Torgar's fur-lined crimson-charcoal forge mantle (`x=3..16, y=15..38`)
    and pulsing amber-gold helm eyes (`y=14..16, x=25..31`), while keeping the chestplate
    (`20 <= x <= 29, 18 <= y <= 28`) clean dark obsidian!
    """
    out = frame.copy()

    # 1. Fur-lined crimson-charcoal forge mantle wave (left side x=2..15, y=15..38)
    cape_mask = np.zeros((52, 52), dtype=bool)
    for y in range(15, 39):
        max_x = 15 if y < 31 else 10
        for x in range(2, max_x + 1):
            if frame[y, x, 3] > 0:
                cape_mask[y, x] = True

    cape_src = frame.copy()
    out[cape_mask] = 0

    for y in range(15, 39):
        u = (y - 15) / 24.0
        if is_dash:
            wave_x = -1.5 * u + math.sin(phase_rad * 2.0 - u * 3.5) * (amplitude * u)
            wave_y = -2.0 * u + math.cos(phase_rad * 2.0 - u * 3.0) * (vertical_flutter * u)
        else:
            wave_x = math.sin(phase_rad - u * 3.2) * (amplitude * (0.2 + 0.8 * u))
            wave_y = math.cos(phase_rad - u * 2.6) * (vertical_flutter * u)
        dx = int(round(wave_x))
        dy = int(round(wave_y))
        max_x = 15 if y < 31 else 10
        for x in range(2, max_x + 1):
            if not cape_mask[y, x]:
                continue
            nx = max(2, min(17, x + dx))
            ny = max(12, min(42, y + dy))
            out[ny, nx] = cape_src[y, x]
            # Fill interior seam near shoulder/back so zero gap opens
            if dx < 0 and x >= max_x - 3 and out[y, x, 3] == 0:
                out[y, x] = cape_src[y, x]

    out = fill_layer_pinholes(out, x0=2, x1=18, y0=12, y1=43, require_3_neighbors=False)

    # 2. Pulsing Amber-Gold Helm Eyes (y=13..16, x=24..32)
    for y in range(13, 17):
        for x in range(24, 33):
            if out[y, x, 3] == 0:
                continue
            r, g, b, _ = out[y, x]
            if r > 200 and g > 115 and b < 95:
                if furnace_pulse > 0.75:
                    out[y, x] = GOLD_WHITE if (x + y) % 2 == 0 else GOLD_MOLTEN
                elif furnace_pulse > 0.4:
                    out[y, x] = GOLD_MOLTEN if (x + y) % 2 == 0 else AMBER_FLAME

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
    Draws Torgar's single colossal 2-Bone Inverse Kinematics (IK) Titan Arm extending from
    shoulder `(sx, sy)` out in front of his torso to `(hx, hy)`:
    - Rotating bronze-and-obsidian shoulder pauldron at `(sx, sy)`
    - 3.5px-thick muscular/armored bicep from `(sx, sy)` to `(ex, ey)`
    - Glowing molten-gold elbow couter at `(ex, ey)`
    - 3.5px-thick heavy forge vambrace from `(ex, ey)` to `(hx, hy)`
    - `3x3` heavy Titan gauntlet fist at `(hx, hy)`
    """
    ex, ey = solve_ik_elbow(sx, sy, hx, hy, L1=L1, L2=L2, bend_side=bend_side)

    u1x, u1y = ex - sx, ey - sy
    d1 = max(1.0, math.hypot(u1x, u1y))
    n1x, n1y = -u1y / d1, u1x / d1
    ux1, uy1 = u1x / d1, u1y / d1

    u2x, u2y = hx - ex, hy - ey
    d2 = max(1.0, math.hypot(u2x, u2y))
    n2x, n2y = -u2y / d2, u2x / d2

    # 1. 3.5px-thick muscular/armored bicep from (sx, sy) to (ex, ey)
    for off, col in [
        (-1.25, OBSIDIAN_DEEP),
        (-0.6, BRONZE_MID),
        (0.0, SKIN_MID),
        (0.6, BRONZE_BRIGHT),
        (1.25, OBSIDIAN_DARK),
    ]:
        draw_line_px(layer, sx + n1x * off, sy + n1y * off, ex + n1x * (off * 0.85), ey + n1y * (off * 0.85), col)

    # 2. 3.5px-thick heavy forge vambrace (BRONZE_MID, OBSIDIAN_MID, LAVA_GOLD) from (ex, ey) to (hx, hy)
    for off, col in [
        (-1.25, OBSIDIAN_DARK),
        (-0.6, OBSIDIAN_MID),
        (0.0, LAVA_GOLD),
        (0.6, BRONZE_BRIGHT),
        (1.25, BRONZE_MID),
    ]:
        draw_line_px(layer, ex + n2x * off, ey + n2y * off, hx + n2x * (off * 0.85), hy + n2y * (off * 0.85), col)

    # 3. Rotating bronze-and-obsidian shoulder pauldron at (sx, sy)
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

    # 4. Glowing molten-gold elbow couter at (ex, ey)
    set_px(layer, ex, ey, LAVA_GOLD)
    set_px(layer, ex + n1x * 0.8, ey + n1y * 0.8, BRONZE_BRIGHT)
    set_px(layer, ex - n1x * 0.8, ey - n1y * 0.8, OBSIDIAN_DARK)

    # 5. 3x3 heavy Titan gauntlet fist at (hx, hy)
    for dy_g in (-1, 0, 1):
        for dx_g in (-1, 0, 1):
            if dx_g == 0 and dy_g == -1:
                col_g = LAVA_GOLD
            elif dy_g <= 0:
                col_g = BRONZE_BRIGHT
            else:
                col_g = OBSIDIAN_MID
            set_px(layer, hx + dx_g, hy + dy_g, col_g)

    return ex, ey


def draw_warhammer(
    canvas,
    hand_x,
    hand_y,
    angle_deg,
    glow_intensity=1.0,
    scale=1.0,
    haft_len=16.5,
    shoulder=(27, 17),
    two_handed=False,
    draw_arm=True,
    cleave_arc=None,
    phase=0.0,
):
    """
    Renders Torgar's Colossal World-Breaker Runic War-Hammer AND a SINGLE clean, colossal
    Lead 2-Bone IK Arm extending from shoulder `(27, 17)` out in front of his body to `(gx, gy)`:
    - ZERO secondary `is_rear=True` arm (no extra limbs or hands on the chest!).
    - Keeps `(gx, gy)` cleanly out in front of Torgar's torso (`gx = 31..40`) while auto-foreshortening
      `haft_len` so the warhammer head NEVER goes outside `[5..46, 5..46]`.
    """
    hammer_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    lead_arm_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    fx_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    rad = math.radians(angle_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    px, py = -uy, ux  # perpendicular vector (striking axis of hammerhead)

    # Keep grip (gx, gy) cleanly in front of the torso inside [31..40, 10..40]
    gx = float(max(31.0, min(40.0, hand_x)))
    gy = float(max(10.0, min(40.0, hand_y)))

    half_strike = 4.2 * scale   # 8.5px across striking faces
    half_thick = 2.5 * scale    # 5.0px along haft axis

    # Exact directional bounding radii (rx, ry) of the rotated hammerhead + finial spike
    rx = abs(px) * half_strike + abs(ux) * (half_thick + 1.5) + 0.4
    ry = abs(py) * half_strike + abs(uy) * (half_thick + 1.5) + 0.4
    min_cx = 2.5 + rx
    max_cx = 48.5 - rx
    min_cy = 2.5 + ry
    max_cy = 46.5 - ry

    # Auto-foreshorten haft_len along (ux, uy) so hammerhead stays 100% inside [2..49, 2..47] without distorting angle!
    max_len = float(haft_len * scale)
    if ux > 0.05:
        max_len = min(max_len, (max_cx - gx) / ux)
    elif ux < -0.05:
        max_len = min(max_len, (min_cx - gx) / ux)
    if uy > 0.05:
        max_len = min(max_len, (max_cy - gy) / uy)
    elif uy < -0.05:
        max_len = min(max_len, (min_cy - gy) / uy)
    eff_len = max(5.5, max_len)

    # 1. Heavy Dark-Iron & Bronze Haft (from pommel `-3.5px` behind hand to hammerhead neck `+eff_len`)
    pom_x = max(3.0, min(48.0, gx - ux * (3.5 * scale)))
    pom_y = max(3.0, min(46.0, gy - uy * (3.5 * scale)))
    neck_x = gx + ux * (eff_len - 2.0 * scale)
    neck_y = gy + uy * (eff_len - 2.0 * scale)

    haft_steps = int(round((eff_len + 3.5 * scale) * 2.5))
    for i in range(haft_steps + 1):
        u_s = i / float(max(1, haft_steps))
        sx_p = pom_x + (neck_x - pom_x) * u_s
        sy_p = pom_y + (neck_y - pom_y) * u_s
        ring_band = (i % 6 == 0)
        c_core = BRONZE_BRIGHT if ring_band else IRON_MID
        c_edge = BRONZE_MID if ring_band else OBSIDIAN_DARK
        set_px(hammer_layer, sx_p, sy_p, c_core)
        set_px(hammer_layer, sx_p + px * 0.65, sy_p + py * 0.65, c_edge)
        set_px(hammer_layer, sx_p - px * 0.65, sy_p - py * 0.65, OBSIDIAN_DEEP)

    # Runic Emerald/Gold Pommel Cap
    set_px(hammer_layer, pom_x, pom_y, GOLD_MOLTEN)
    set_px(
        hammer_layer,
        max(3.0, min(48.0, pom_x - ux * 0.9)),
        max(3.0, min(46.0, pom_y - uy * 0.9)),
        JADE_BRIGHT,
    )

    # 2. Massive Rectangular/Beveled Obsidian & Bronze Runic Hammerhead at tip of haft
    head_cx = max(min_cx, min(max_cx, gx + ux * eff_len))
    head_cy = max(min_cy, min(max_cy, gy + uy * eff_len))

    s_steps = int(round(half_strike * 4))
    t_steps = int(round(half_thick * 4))
    for si in range(-s_steps, s_steps + 1):
        sp = (si / float(max(1, s_steps))) * half_strike
        for ti in range(-t_steps, t_steps + 1):
            ta = (ti / float(max(1, t_steps))) * half_thick
            if abs(sp) > half_strike - 0.7 and abs(ta) > half_thick - 0.7:
                continue

            wx = max(2.0, min(49.0, head_cx + px * sp + ux * ta))
            wy = max(2.0, min(47.0, head_cy + py * sp + uy * ta))

            asp = abs(sp) / max(0.1, half_strike)
            ata = abs(ta) / max(0.1, half_thick)

            if asp > 0.80:
                col = GOLD_WHITE if (glow_intensity >= 1.1 and ata < 0.45) else (GOLD_MOLTEN if ata < 0.55 else BRONZE_BRIGHT)
            elif ata > 0.74:
                col = BRONZE_BRIGHT if ta > 0 else BRONZE_MID
            elif asp < 0.22 and ata < 0.58:
                col = JADE_LIGHT if glow_intensity >= 0.85 else JADE_BRIGHT
            elif 0.36 <= asp <= 0.64 and (abs(ta - (abs(sp) - 2.0)) < 0.75 or abs(ta) < 0.35):
                col = GOLD_WHITE if glow_intensity >= 1.0 else GOLD_MOLTEN
            else:
                col = IRON_DARK if (si + ti) % 3 == 0 else OBSIDIAN_DARK

            set_px(hammer_layer, wx, wy, col)

    # Top Finial Spike protruding beyond the hammerhead (clamped within [4..47])
    set_px(
        hammer_layer,
        max(4.0, min(47.0, head_cx + ux * (half_thick + 0.8))),
        max(4.0, min(46.0, head_cy + uy * (half_thick + 0.8))),
        BRONZE_BRIGHT,
    )
    set_px(
        hammer_layer,
        max(4.0, min(47.0, head_cx + ux * (half_thick + 1.5))),
        max(4.0, min(46.0, head_cy + uy * (half_thick + 1.5))),
        GOLD_MOLTEN,
    )

    # 3. Single Colossal Lead 2-Bone IK Titan Arm ((sx, sy) -> elbow -> (gx, gy))
    if draw_arm and shoulder is not None:
        sx = float(max(24.0, min(32.0, shoulder[0])))
        sy = float(max(12.0, min(36.0, shoulder[1])))
        draw_ik_titan_arm(lead_arm_layer, sx, sy, gx, gy, L1=6.2, L2=5.8, bend_side=1.0, is_rear=False)
        # 1px dark silhouette seam around lead_arm_layer so the arm pops cleanly against torso & haft
        arm_mask = lead_arm_layer[:, :, 3] > 0
        for y_a in range(3, 49):
            for x_a in range(3, 49):
                if not arm_mask[y_a, x_a]:
                    if (
                        arm_mask[y_a - 1, x_a]
                        or arm_mask[y_a + 1, x_a]
                        or arm_mask[y_a, x_a - 1]
                        or arm_mask[y_a, x_a + 1]
                    ):
                        lead_arm_layer[y_a, x_a] = OBSIDIAN_DEEP
    else:
        for dy_g in (-1, 0, 1):
            for dx_g in (-1, 0, 1):
                set_px(lead_arm_layer, gx + dx_g, gy + dy_g, BRONZE_BRIGHT if (dx_g == 0 and dy_g == -1) else IRON_MID)

    # 4. Trailing Molten-Gold & Emerald-Jade Embers when glow_intensity > 1.0
    if glow_intensity > 1.0:
        num_embers = 5 if glow_intensity >= 1.25 else 3
        for e_i in range(num_embers):
            e_ang = phase + e_i * 2.1
            ex_e = max(5.0, min(46.0, head_cx + math.cos(e_ang) * (4.2 + (e_i % 2) * 1.5)))
            ey_e = max(5.0, min(46.0, head_cy + math.sin(e_ang) * (3.2 + (e_i % 2) * 1.2) - 0.8))
            set_px(fx_layer, ex_e, ey_e, GOLD_WHITE if e_i % 2 == 0 else JADE_LIGHT)
            if glow_intensity >= 1.2:
                set_px(fx_layer, ex_e, max(5.0, ey_e - 1.0), MAGMA_ORANGE if e_i % 2 == 0 else JADE_BRIGHT)

    # 5. Optional Molten-Gold & Emerald-Jade Hammer Cleave Arc (true circular arc inside [5..46, 5..45])
    if cleave_arc is not None:
        a_start, a_end, arc_r, arc_int = cleave_arc
        arc_steps = 40
        piv_x = float(shoulder[0]) if shoulder is not None else 27.0
        piv_y = max(21.0, float(shoulder[1]) if shoulder is not None else 21.0)
        r_uniform = min(float(arc_r), piv_y - 5.0, 46.5 - piv_x, 45.0 - piv_y)
        r_uniform = max(11.0, r_uniform)
        for k in range(arc_steps + 1):
            u_a = k / float(arc_steps)
            ang = math.radians(a_start + (a_end - a_start) * u_a)
            ca, sa = math.cos(ang), math.sin(ang)
            env = math.sin(u_a * math.pi) * arc_int
            if env <= 0.1:
                continue
            ax = piv_x + ca * r_uniform
            ay = piv_y + sa * r_uniform
            set_px(fx_layer, ax, ay, GOLD_WHITE if u_a > 0.6 else GOLD_MOLTEN)
            set_px(fx_layer, ax - ca * 1.3, ay - sa * 1.3, JADE_LIGHT if (k % 3 == 0) else MAGMA_ORANGE)
            if env > 0.45:
                set_px(fx_layer, ax - ca * 2.5, ay - sa * 2.5, JADE_BRIGHT)
                set_px(fx_layer, ax - ca * 3.6, ay - sa * 3.6, BRONZE_MID)

    out = composite_over(canvas, hammer_layer)
    # When the warhammer is cocked back overhead (angle_deg < -85 deg), keep Torgar's horned helm & eyes in front of the hammerhead!
    if angle_deg < -85.0:
        for yh in range(5, 17):
            for xh in range(24, 33):
                if canvas[yh, xh, 3] > 0:
                    out[yh, xh] = canvas[yh, xh]
    out = composite_over(out, lead_arm_layer)
    out = composite_over(out, fx_layer)
    return out


draw_articulated_greathammer = draw_warhammer


def _extract_full_crimson_cape(stand, dy_offset=0, phase=0.0, wave_scale=1.0, lift_y=0):
    """
    Extracts Torgar's full fur-lined crimson cape (`x = 3..22` for `y = 15..42`),
    replacing any non-cape leg pixels in `y = 33..42, x = 12..22` with `CAPE_DARK` / `CAPE_DEEP`
    so his full crimson cape drapes solidly behind his legs!
    """
    cape_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    for y in range(14, 43):
        ny = y + dy_offset
        if not (2 <= ny <= 48):
            continue
        u = (y - 14) / 28.0
        wave_dx = int(round((-u * 1.4 + math.sin(phase - u * 3.0) * (1.3 * u)) * wave_scale))
        wave_dy = int(round(math.cos(phase - u * 2.5) * (0.5 * u) * wave_scale + u * lift_y))

        if y <= 32:
            for x in range(3, 23):
                if stand[y, x, 3] == 0:
                    continue
                cx = max(2, min(23, x + wave_dx))
                cy = max(8, min(44, ny + wave_dy))
                cape_layer[cy, cx] = stand[y, x]
                if x >= 13:
                    cape_layer[ny, x] = stand[y, x]
        else:
            # Full lower crimson cape drape behind the legs (y = 33..42, x = 5..22)
            left_x = 4 if y <= 34 else min(13, 5 + (y - 32))
            right_x = 22 - max(0, (y - 34) // 2)
            for x in range(left_x, right_x + 1):
                if x < 12 and stand[y, x, 3] > 0:
                    col = stand[y, x]
                else:
                    # Replace any non-cape leg pixels in y = 33..42, x = 12..22 with CAPE_DARK / CAPE_DEEP
                    # (and dark charcoal fur border at outer/bottom hem)
                    if x == left_x or y >= 41 or x == right_x:
                        col = MANTLE_CHARCOAL if (x + y) % 2 == 0 else MANTLE_FUR
                    elif x <= left_x + 2:
                        col = CAPE_MID if (x + y) % 3 == 0 else CAPE_DARK
                    else:
                        col = CAPE_DARK if (x + y) % 2 == 0 else CAPE_DEEP
                cx = max(2, min(23, x + wave_dx))
                cy = max(12, min(44, ny + wave_dy))
                cape_layer[cy, cx] = col
                if 13 <= x <= right_x and y <= 40:
                    cape_layer[ny, x] = col

    return fill_layer_pinholes(cape_layer, x0=2, x1=24, y0=8, y1=45, require_3_neighbors=False)


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
    knee-guard poleyn, heavy plate greave (shin), and rotated armored sabaton (`off_x` spanning
    `-2.8` to `+2.8` with `OBSIDIAN_DARK`, `OBSIDIAN_MID`, `OBSIDIAN_LIGHT`, and `BRONZE_MID` trim).
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

    # 1. 6-7px wide heavy obsidian-and-bronze plate cuisse (hip -> knee, off_x -2.8 .. +2.8)
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

    # Horizontal bronze tasset-cuisse band across upper thigh
    mid_tx = (hip_x + knee_x) * 0.5
    mid_ty = (hip_y + knee_y) * 0.5
    draw_line_px(layer, mid_tx - 2.2, mid_ty, mid_tx + 2.2, mid_ty, c_trim)

    # 2. 6-7px wide heavy obsidian-and-bronze shin greave (knee -> ankle, off_x -2.8 .. +2.8)
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

    # 3. Rotated heavy armored sabaton boot
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

    # 4. Rounded Bronze-and-Obsidian Knee-Guard Poleyn at (knee_x, knee_y)
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
    Row 1 helper (`render_walk_legs`): Anatomical 2-step heavy juggernaut stride (F00..F14 Step 1, F15..F29 Step 2)
    preserving Titan's full crimson cape (`x = 5..22, y = 15..42`), wide bronze battle-girdle/tassets
    (`y = 0..35, x = 14..35 / 16..33`), and 6-7px wide heavy obsidian-and-bronze plate cuisses & greaves!
    """
    phase = (f / 30.0) * 2.0 * math.pi
    bob_y = int(round(math.cos(phase * 2.0) * 1.0))

    stand = tpl["stand"].copy()
    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    girdle_overlay = np.zeros((52, 52, 4), dtype=np.uint8)

    # 1. Full Crimson Cape (`x = 5..22` for `y = 15..42`) with non-cape leg pixels in y=33..42, x=15..22
    # replaced by CAPE_DARK / CAPE_DEEP so his crimson cape drapes solidly behind his legs!
    cape_layer = _extract_full_crimson_cape(stand, dy_offset=bob_y, phase=phase, wave_scale=1.0, lift_y=0)

    # 2. Upper Torso, Horned Helm, Bronze Battle-Girdle & Armored Tassets (`y = 0..35`:
    # `x = 14..35` for `y < 29`, `x = 16..33` for `29 <= y <= 35`)
    for y in range(0, 36):
        ny = y + bob_y
        if not (2 <= ny <= 49):
            continue
        min_tx = 14 if y < 29 else 16
        max_tx = 36 if y < 29 else 34
        for x in range(min_tx, max_tx):
            if stand[y, x, 3] > 0:
                torso_layer[ny, x] = stand[y, x]
                # Keep belt buckle, hip tasset upper plates (y=29..33), and central runic tabard (x=19..25, y=29..35)
                if (29 <= y <= 33) or (29 <= y <= 35 and 19 <= x <= 25):
                    girdle_overlay[ny, x] = stand[y, x]

    def build_striding_leg(boot_patch, orig_cx, hip_x, foot_base_x, swing_phase, is_far_leg=False):
        layer = np.zeros((52, 52, 4), dtype=np.uint8)
        s_val = math.sin(swing_phase)   # +1 = forward, -1 = backward
        c_val = math.cos(swing_phase)   # +1 = passing knee lift

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

    # Back-to-Front Painter's Order: Full Crimson Cape -> Far Leg -> Torso/Tassets -> Near Leg -> Battle-Girdle/Tabard Overlay
    out = composite_over(cape_layer, far_leg)
    out = composite_over(out, torso_layer)
    out = composite_over(out, near_leg)
    out = composite_over(out, girdle_overlay)
    return fill_layer_pinholes(out)


render_walk_legs = render_walk_juggernaut


def make_crouch_juggernaut(tpl, crouch_depth):
    """
    Constructs Torgar's deep fortified crouch (`make_crouch_body`) via a continuous vertical
    compression warp on `tpl['stand']`:
    - Shifts `ny <= 28 + d` down by `d`
    - Compresses `ny = 29 + d .. 43` from `sy = int(round(28.0 + u * 15.0))` with a subtle 1px forward knee bend
    - Keeps his heavy sabatons anchored firmly at `ny = 44..49`
    """
    stand = tpl["stand"]
    d = max(0, min(6, int(round(crouch_depth))))
    if d <= 0:
        return stand.copy()

    canvas = np.zeros((52, 52, 4), dtype=np.uint8)

    # 1. Shift upper body, horned helm, pauldrons, and belt (`ny <= 28 + d`) down by `d`
    for ny in range(d, 29 + d):
        sy = ny - d
        if 0 <= sy <= 28 and 1 <= ny <= 49:
            canvas[ny, :] = stand[sy, :]

    # 2. Compress tassets, cuisses, knee poleyns, and greaves (`ny = 29 + d .. 43`) from `sy = 28 .. 43`
    span = max(1.0, float(43 - (29 + d)))
    for ny in range(29 + d, 44):
        u = (ny - (29 + d)) / span
        sy = int(round(28.0 + u * 15.0))
        sy = max(28, min(43, sy))
        # Subtle 1px forward knee bend across the mid-leg knee zone
        knee_dx = 1 if (d >= 2 and 0.25 <= u <= 0.75) else 0
        for x in range(2, 50):
            if stand[sy, x, 3] > 0:
                nx = x if x <= 11 else min(49, x + knee_dx)
                canvas[ny, nx] = stand[sy, x]

    # 3. Keep heavy sabatons anchored firmly on the ground at `ny = 44..49`
    for ny in range(44, 50):
        canvas[ny, :] = stand[ny, :]

    return fill_layer_pinholes(canvas)


make_crouch_body = make_crouch_juggernaut


def make_aerial_juggernaut(tpl, jump_dy, body_tilt_deg=0.0, leg_tuck=0.5, thruster_intensity=0.8, phase=0.0):
    """
    Row 8 helper (`make_jump_body`): Constructs a full-body heroic aerial Torgar posture preserving
    his full crimson cape (`x = 5..22, y = 15..42`), wide bronze battle-girdle/tassets
    (`y = 0..35, x = 14..35 / 16..33`), and 6-7px wide heavy obsidian-and-bronze plate cuisses & greaves!
    """
    stand = tpl["stand"].copy()
    dy_i = max(-3, min(4, int(round(jump_dy))))
    t = max(0.0, min(1.0, leg_tuck))

    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    girdle_overlay = np.zeros((52, 52, 4), dtype=np.uint8)

    # 1. Full Billowing Crimson Cape (`x = 5..22` for `y = 15..42`) with CAPE_DARK / CAPE_DEEP behind legs
    cape_lift = int(round(-t * 1.5))
    cape_layer = _extract_full_crimson_cape(stand, dy_offset=dy_i, phase=phase, wave_scale=1.1, lift_y=cape_lift)

    # 2. Upper Torso, Horned Helm, Bronze Battle-Girdle & Armored Tassets (`y = 0..35`:
    # `x = 14..35` for `y < 29`, `x = 16..33` for `29 <= y <= 35`)
    lean_dx = 1 if body_tilt_deg > 5.0 else (-1 if body_tilt_deg < -5.0 else 0)
    for y in range(0, 36):
        ny = max(2, min(47, y + dy_i))
        dx = lean_dx if y <= 24 else 0
        min_tx = 14 if y < 29 else 16
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

    # Downward Orange/Gold Furnace Thruster Flames under both boots when airborne
    fx_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    if thruster_intensity > 0.1:
        jet_len = int(round(4.0 * thruster_intensity))
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


def draw_anvil_shield_bulwark(canvas, x_front=38, y_top=16, y_bot=45, glow=0.8, phase=0.0):
    """
    Row 7 helper: Projects a glowing Bronze & Emerald-Jade Runic Anvil-Shield Bulwark
    in front of Torgar (`x=32..44, y=16..45`) while crouched.
    """
    sh = np.zeros((52, 52, 4), dtype=np.uint8)
    ymid = (y_top + y_bot) * 0.5
    for y in range(max(4, y_top), min(47, y_bot + 1)):
        u = abs(y - ymid) / max(1.0, (y_bot - y_top) * 0.5)
        half_w = 5 if (u > 0.65 or u < 0.25) else 4
        for dx in range(-half_w, half_w + 1):
            px_x = max(4, min(47, x_front + dx))
            if abs(dx) == half_w or y in (y_top, y_bot):
                col = GOLD_WHITE if (glow > 0.85 and dx > 0) else BRONZE_BRIGHT
            elif abs(dx) == half_w - 1:
                col = BRONZE_MID
            elif dx == 0 or abs(y - int(ymid)) <= 1:
                col = JADE_LIGHT if glow > 0.7 else JADE_BRIGHT
            elif (x_front + dx + y + int(round(phase * 2))) % 5 == 0:
                col = GOLD_MOLTEN
            else:
                col = OBSIDIAN_DARK
            set_px(sh, px_x, y, col)

    # Outer projected Emerald-Jade & Gold hexagonal energy barrier arc at x=43..45
    if glow > 0.5:
        for y in range(max(4, y_top - 1), min(47, y_bot + 1)):
            curve_x = max(4, min(47, x_front + 6 - int(((y - ymid) / 9.0) ** 2)))
            if (y + int(round(phase * 3))) % 2 == 0 or glow > 0.8:
                set_px(sh, curve_x, y, JADE_LIGHT if abs(y - ymid) < 6 else JADE_BRIGHT)
                set_px(sh, curve_x - 1, y, GOLD_MOLTEN if int(y) % 4 == 0 else JADE_DEEP)

    return composite_over(canvas, sh)


def draw_ragnarok_crown_and_jets(canvas, head_xy=(28, 9), shoulder_xy=(21, 17), intensity=1.0, phase=0.0):
    """
    Row 4 Ultimate helper: Blazing Molten-Gold & Emerald-Jade Runic Crown/Horns and Furnace Back-Jets!
    All coordinates are safely clamped inside [3..48, 3..47] so zero top/side clips occur.
    """
    fx = np.zeros((52, 52, 4), dtype=np.uint8)
    hx, hy = head_xy
    sx, sy = shoulder_xy

    # 1. Blazing Molten-Gold & Jade Runic Horn Aura & Nordic Crown Sigil above helm
    for side in (-1, 1):
        for d in range(1, 7):
            cx_h = max(3.0, min(48.0, hx + side * (3 + d * 0.7)))
            cy_h = max(3.0, min(46.0, hy - d * 0.85 + math.sin(phase + d) * 0.4))
            set_px(fx, cx_h, cy_h, GOLD_WHITE if d >= 5 else (GOLD_MOLTEN if d % 2 == 0 else JADE_LIGHT))
    # Floating Emerald-Gold Crown Rune at apex (safely inside y >= 3)
    set_px(fx, hx, max(3, hy - 4), JADE_WHITE)
    set_px(fx, hx - 1, max(4, hy - 3), GOLD_MOLTEN)
    set_px(fx, hx + 1, max(4, hy - 3), GOLD_MOLTEN)
    set_px(fx, hx, max(5, hy - 2), JADE_BRIGHT)

    # 2. Twin Roaring Furnace Back-Jets behind pauldrons
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


def build_row0_idle(tpl):
    """
    Row 0 (`IDLE`, 0..29):
    - Heavy furnace-core chest breathing (1px chest/shoulder rise & fall with solid waist row duplication)
    - Fur-lined crimson-charcoal forge mantle swaying (F00..F29) & glowing amber-gold eyes pulsing
    - Holding the World-Breaker War-Hammer OUT IN FRONT OF HIS BODY (`gx = 34, gy = 22`)
      angled forward-upward (`-52 deg`) with a single colossal 2-bone IK arm from `(27, 17)` to `(34, 22)`.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        base = tpl["stand"].copy()

        # 1px heavy furnace-core chest/shoulder breathing rise on F08..F20
        breath_dy = -1 if 8 <= f <= 20 else 0
        if breath_dy == -1:
            upper = base[8:32, 12:34].copy()
            base[7:31, 12:34] = upper
            # Duplicate bottom row of upper into row 31 so shifting up 1px never leaves a horizontal waist slit!
            base[31, 12:34] = upper[23, :]
            base = fill_layer_pinholes(base)

        pulse = 0.55 + 0.45 * math.sin(phase)
        base = apply_mantle_and_beard_sway(
            base, phase, amplitude=1.5, vertical_flutter=0.5, furnace_pulse=pulse
        )

        # Hold War-Hammer out in front of Torgar's body at gx=34, gy=22, angled forward-upward (-52 deg)
        hammer_ang = -52.0 + math.sin(phase) * 4.0
        hx = 34
        hy = 22 + breath_dy
        frame = draw_warhammer(
            base,
            hand_x=hx,
            hand_y=hy,
            angle_deg=hammer_ang,
            glow_intensity=0.85 + 0.35 * math.sin(phase),
            scale=1.0,
            haft_len=17.0,
            shoulder=(27, 17 + breath_dy),
            two_handed=False,
            phase=phase,
        )

        # Travelling molten-gold & emerald-jade rune spark near the raised warhammer head
        spark_x = 39 + (f % 4)
        spark_y = max(6, 10 + breath_dy + ((f // 5) % 3) - 1)
        set_px(frame, spark_x, spark_y, JADE_LIGHT if f % 2 == 0 else GOLD_WHITE)

        frames.append(frame)
    return frames


def build_row1_walk(tpl):
    """
    Row 1 (`WALK`, 30..59):
    - Anatomical 2-step heavy juggernaut stride (F00..F14 Step 1, F15..F29 Step 2)
    - Preserves full crimson cape (`x = 5..22, y = 15..42`), wide bronze battle-girdle/tassets (`y = 0..35`),
      and 6-7px wide heavy obsidian-and-bronze plate cuisses & greaves
    - Swings the War-Hammer in front of his body (`gx = 34 - int(round(swing * 2.0)), gy = 22 + bob_y`,
      `angle_deg = -46.0 + swing * 16.0`) with a single colossal 2-bone IK arm from `(27, 17 + bob_y)`.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        body = render_walk_juggernaut(tpl, f)
        bob_y = int(round(math.cos(phase * 2.0) * 1.0))

        swing = math.sin(phase)
        hammer_ang = -46.0 + swing * 16.0
        hx = 34 - int(round(swing * 2.0))
        hy = 22 + bob_y

        frame = draw_warhammer(
            body,
            hand_x=hx,
            hand_y=hy,
            angle_deg=hammer_ang,
            glow_intensity=0.9 + 0.2 * math.sin(phase * 2.0),
            scale=1.0,
            haft_len=17.0,
            shoulder=(27, 17 + bob_y),
            two_handed=False,
            phase=phase,
        )
        frames.append(frame)
    return frames


def build_row2_auto_attack(tpl):
    """
    Row 2 (`AUTO_ATTACK` - Tectonic Hammer Quake, 60..89):
    - F00..F10: Raises the War-Hammer high above his front shoulder from `(34, 22, -52 deg)`
      to `(31, 12, -125 deg)` — NEVER pulling the grip onto his chest (`x <= 28`)!
    - F11..F19: Drives the War-Hammer forward and down through `(35, 15, -45 deg) -> (39, 21, +18 deg) -> (37, 27, +48 deg)`
      with a wide multi-frame molten-gold & emerald-jade hammer cleave arc and ground-shatter magma sparks.
    - F20..F29: Returns smoothly from `(37, 27, +48 deg)` to `(34, 22, -52 deg)`.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 10:
            # F00..F10: Raise War-Hammer high above front shoulder from (34, 22, -52 deg) to (31, 12, -125 deg)
            u = f / 10.0
            base = tpl["stand"].copy()
            base = apply_mantle_and_beard_sway(
                base, phase, amplitude=1.5 + u * 0.5, vertical_flutter=0.6, furnace_pulse=0.6 + u * 0.4
            )
            sx, sy = 27, 17
            ang = -52.0 * (1.0 - u) + (-125.0) * u
            hx = int(round(34 * (1.0 - u) + 31 * u))
            hy = int(round(22 * (1.0 - u) + 12 * u))
            frame = draw_warhammer(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=0.85 + u * 0.45,
                scale=1.04,
                haft_len=16.5,
                shoulder=(sx, sy),
                two_handed=False,
                phase=phase,
            )
            frames.append(frame)

        elif f <= 19:
            # F11..F19: Drive War-Hammer forward and down through (35, 15, -45 deg) -> (39, 21, +18 deg) -> (37, 27, +48 deg)
            k = f - 11
            base = (tpl["lunge"] if k >= 1 else tpl["stand"]).copy()
            base = apply_mantle_and_beard_sway(
                base, phase * 2.0, amplitude=2.0, vertical_flutter=0.8, furnace_pulse=1.0
            )

            sx, sy = 28, 17
            ang_seq = [-45.0, -8.0, 18.0, 36.0, 48.0, 48.0, 44.0, 38.0, 28.0]
            hx_seq = [35, 38, 39, 38, 37, 37, 37, 36, 36]
            hy_seq = [15, 18, 21, 25, 27, 27, 26, 25, 24]

            cleave_arc = None
            if k <= 5:
                arc_int = [0.85, 1.0, 1.0, 0.9, 0.7, 0.45][k]
                a0 = [-120.0, -90.0, -55.0, -25.0, -5.0, 10.0][k]
                cleave_arc = (a0, ang_seq[k] + 6.0, 18.0, arc_int)

            frame = draw_warhammer(
                base,
                hand_x=hx_seq[k],
                hand_y=hy_seq[k],
                angle_deg=ang_seq[k],
                glow_intensity=1.35 if k <= 5 else 1.0,
                scale=1.05,
                haft_len=16.0,
                shoulder=(sx, sy),
                two_handed=False,
                cleave_arc=cleave_arc,
                phase=phase,
            )

            # Ground-shatter magma & emerald-jade sparks at impact (F12..F16 -> k=1..5)
            if 1 <= k <= 5:
                imp_x, imp_y = 43, 44
                for sp in range(5):
                    sx_s = imp_x - 4 + sp * 2 + (k % 2)
                    sy_s = imp_y - ((sp + k) % 4) * 2
                    set_px(frame, sx_s, sy_s, GOLD_WHITE if sp == 2 else (JADE_LIGHT if sp % 2 == 0 else MAGMA_ORANGE))
                    draw_line_px(frame, imp_x - 4, 45, imp_x + 3, 45, GOLD_MOLTEN if k <= 3 else MAGMA_ORANGE)

            frames.append(frame)

        else:
            # F20..F29: Return smoothly from (37, 27, +48 deg) to (34, 22, -52 deg)
            u = (f - 20) / 9.0
            base = (tpl["lunge"] if f <= 22 else tpl["stand"]).copy()
            base = apply_mantle_and_beard_sway(
                base, phase, amplitude=1.5, vertical_flutter=0.5, furnace_pulse=0.8 - u * 0.25
            )
            ang = 48.0 * (1.0 - u) + (-52.0) * u
            hx = int(round(37 * (1.0 - u) + 34 * u))
            hy = int(round(27 * (1.0 - u) + 22 * u))
            frame = draw_warhammer(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.05 - u * 0.2,
                scale=1.0,
                haft_len=16.5,
                shoulder=(27, 17),
                two_handed=False,
                phase=phase,
            )
            frames.append(frame)
    return frames


def build_row3_skill(tpl):
    """
    Row 3 (`SKILL` - Anvil of the Mountain King, 90..119):
    - F00..F12: Raises the War-Hammer high in front of his shoulder from `(34, 22, -52 deg)` to `(32, 13, -118 deg)`
      as an Emerald-Jade & Molten-Gold Forge Seal flares around the raised gauntlet/hammer!
    - F13..F22: Full-body horizontal War-Hammer anvil slam driving grip forward through `(35, 16) -> (39, 21) -> (37, 25)`
      with an explosive horizontal amber-gold & jade shockwave arc.
    - F23..F29: Smooth recovery to `(34, 22, -52 deg)`.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 12:
            # F00..F12: Raise War-Hammer high in front of shoulder from (34, 22, -52 deg) to (32, 13, -118 deg)
            u = f / 12.0
            base = tpl["stand"].copy()
            base = apply_mantle_and_beard_sway(
                base, phase * 1.5, amplitude=1.6, vertical_flutter=0.6, furnace_pulse=0.75 + u * 0.25
            )

            sx, sy = 27, 17
            hammer_ang = -52.0 * (1.0 - u) + (-118.0) * u
            hx = int(round(34 * (1.0 - u) + 32 * u))
            hy = int(round(22 * (1.0 - u) + 13 * u))
            frame = draw_warhammer(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=hammer_ang,
                glow_intensity=1.0 + u * 0.3,
                scale=1.0,
                haft_len=16.0,
                shoulder=(sx, sy),
                two_handed=False,
                phase=phase,
            )

            # Flaring Emerald-Jade & Molten-Gold Forge Seal around the raised gauntlet
            seal_r = 2.5 + u * 2.5
            seal_cx = min(44, hx + 4)
            seal_cy = max(6, hy - 2)
            for s_i in range(16):
                sa = (s_i / 16.0) * 2.0 * math.pi + phase * 2.0
                sx_f = max(4.0, min(47.0, seal_cx + math.cos(sa) * seal_r))
                sy_f = max(4.0, min(46.0, seal_cy + math.sin(sa) * (seal_r * 0.6)))
                set_px(frame, sx_f, sy_f, JADE_LIGHT if s_i % 2 == 0 else GOLD_MOLTEN)
            set_px(frame, seal_cx, seal_cy, GOLD_WHITE)
            set_px(frame, seal_cx - 1, seal_cy, JADE_BRIGHT)
            set_px(frame, seal_cx + 1, seal_cy, JADE_BRIGHT)

            frames.append(frame)

        elif f <= 22:
            # F13..F22: Full-body War-Hammer anvil slam driving grip forward through (35, 16) -> (39, 21) -> (37, 25)
            k = f - 13
            base = tpl["lunge"].copy()
            base = apply_mantle_and_beard_sway(
                base, phase * 2.5, amplitude=2.0, vertical_flutter=0.8, furnace_pulse=1.0
            )

            sx, sy = 28, 17
            ang_seq = [-65.0, -20.0, 4.0, 14.0, 20.0, 22.0, 18.0, 10.0, -5.0, -22.0]
            hx_seq = [35, 37, 39, 39, 38, 37, 37, 36, 36, 35]
            hy_seq = [16, 19, 21, 23, 24, 25, 25, 24, 24, 23]

            frame = draw_warhammer(
                base,
                hand_x=hx_seq[k],
                hand_y=hy_seq[k],
                angle_deg=ang_seq[k],
                glow_intensity=1.35 if 1 <= k <= 6 else 1.0,
                scale=1.0,
                haft_len=15.5,
                shoulder=(sx, sy),
                two_handed=False,
                phase=phase,
            )

            # F14..F19 (k=1..6): Explosive horizontal amber-gold & emerald-jade 3D shockwave arc!
            if 1 <= k <= 6:
                for rx_i in range(16):
                    ua = rx_i / 15.0
                    arc_x = int(round(26 + ua * 20))
                    arc_y = 24 + int(round(math.sin((ua - 0.5) * math.pi) * 4.0))
                    set_px(frame, arc_x, arc_y, GOLD_WHITE if ua > 0.6 else GOLD_MOLTEN)
                    set_px(frame, arc_x, arc_y - 1, JADE_LIGHT if rx_i % 2 == 0 else MAGMA_ORANGE)
                    set_px(frame, arc_x, arc_y + 1, JADE_BRIGHT)

            frames.append(frame)

        else:
            # F23..F29: Recovery to fighting stance (34, 22, -52 deg)
            u = (f - 23) / 6.0
            base = (tpl["lunge"] if f <= 24 else tpl["stand"]).copy()
            base = apply_mantle_and_beard_sway(
                base, phase, amplitude=1.5, vertical_flutter=0.5, furnace_pulse=0.75 - u * 0.2
            )
            ang = -22.0 * (1.0 - u) + (-52.0) * u
            hx = int(round(35 * (1.0 - u) + 34 * u))
            hy = int(round(23 * (1.0 - u) + 22 * u))
            frame = draw_warhammer(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=0.95,
                scale=1.0,
                haft_len=16.5,
                shoulder=(27, 17),
                two_handed=False,
                phase=phase,
            )
            frames.append(frame)
    return frames


def build_row4_ultimate(tpl):
    """
    Row 4 (`ULTIMATE` - Ragnarok: World-Forge Eruption, 120..149):
    - F00..F09: Torgar roars as a blazing Molten-Gold & Jade Runic Crown/Horns and furnace back-jets ignite,
      hoisting the superheated World-Breaker War-Hammer skyward in front of his shoulder `(34, 22) -> (31, 12)`.
    - F10..F20: Two consecutive seismic earth-slams (`(38, 24 + crouch_d)`) with volcanic cracks
      and magma plumes erupting under his boots.
    - F21..F29: Cataclysmic final overhead World-Breaker plunge (`(38, 24 + crouch_d)`) with blinding
      golden-jade forge nova & shockwave rings (F22..F26) and triumphant recovery (F27..F29).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 9:
            # F00..F09: Skyward hoist above front shoulder from (34, 22, -52 deg) to (31, 12, -112 deg)
            u = f / 9.0
            base = tpl["stand"].copy()
            base = apply_mantle_and_beard_sway(
                base, phase * 2.5, amplitude=1.8, vertical_flutter=0.8, furnace_pulse=1.0
            )
            base = draw_ragnarok_crown_and_jets(
                base, head_xy=(28, 9), shoulder_xy=(21, 17), intensity=0.5 + 0.5 * u, phase=phase * 2.0
            )

            sx, sy = 27, 17
            ang = -52.0 * (1.0 - u) + (-112.0) * u
            hx = int(round(34 * (1.0 - u) + 31 * u))
            hy = int(round(22 * (1.0 - u) + 12 * u))
            frame = draw_warhammer(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.15 + u * 0.3,
                scale=1.05 + u * 0.08,
                haft_len=15.5,
                shoulder=(sx, sy),
                two_handed=False,
                phase=phase * 2.0,
            )
            frames.append(frame)

        elif f <= 20:
            # F10..F20: Two consecutive seismic earth-slams driving grip out in front to (38, 24 + crouch_d)
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
                ang = -95.0
                hx, hy = 31, sy - 5
                cleave = None
            elif is_slam1:
                ang = [12.0, 30.0, 34.0, 20.0][k - 1]
                hx, hy = 38, sy + 6
                cleave = (-85.0, ang + 5.0, 18.0, 1.0 if k <= 2 else 0.7)
            else:
                ang = [16.0, 32.0, 35.0, 30.0, 10.0][k - 6]
                hx, hy = 38, sy + 7
                cleave = (-85.0, ang + 5.0, 18.5, 1.0 if k <= 8 else 0.75)

            frame = draw_warhammer(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.4,
                scale=1.08,
                haft_len=15.0,
                shoulder=(sx, sy),
                two_handed=False,
                cleave_arc=cleave,
                phase=phase * 2.0,
            )

            # Volcanic cracks and magma/jade plumes erupting under boots during Slam 1 & Slam 2
            if is_slam1 or is_slam2:
                for cx_p in (14, 28, 42):
                    plume_h = 6 + ((k * 3 + cx_p) % 5)
                    draw_line_px(frame, cx_p, 45, cx_p, 45 - plume_h, GOLD_WHITE if cx_p == 42 else MAGMA_ORANGE)
                    set_px(frame, cx_p - 1, 45 - plume_h // 2, JADE_LIGHT)
                    set_px(frame, cx_p + 1, 45 - plume_h // 2, GOLD_MOLTEN)
                draw_line_px(frame, 10, 45, 46, 45, GOLD_MOLTEN if k % 2 == 0 else JADE_BRIGHT)

            frames.append(frame)

        elif f <= 26:
            # F21..F26: Cataclysmic final overhead World-Breaker plunge & blinding golden-jade forge nova!
            k = f - 21
            if k == 0:
                body = make_aerial_juggernaut(tpl, jump_dy=-2, body_tilt_deg=10.0, leg_tuck=0.7, thruster_intensity=1.0, phase=phase)
                body = draw_ragnarok_crown_and_jets(body, head_xy=(28, 8), shoulder_xy=(21, 15), intensity=1.0, phase=phase)
                frame = draw_warhammer(
                    body,
                    hand_x=31,
                    hand_y=11,
                    angle_deg=-102.0,
                    glow_intensity=1.5,
                    scale=1.08,
                    haft_len=14.5,
                    shoulder=(27, 15),
                    two_handed=False,
                    phase=phase,
                )
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
                    hand_x=38,
                    hand_y=sy + 6,
                    angle_deg=34.0,
                    glow_intensity=1.5,
                    scale=1.10,
                    haft_len=15.0,
                    shoulder=(sx, sy),
                    two_handed=False,
                    cleave_arc=(-95.0, 36.0, 18.0, 1.0) if k <= 2 else None,
                    phase=phase,
                )
                # Blinding golden-jade forge nova & expanding shockwave rings at ground level (clamped inside [4..47])
                ring_rx = min(16, 7 + k * 2)
                for s_i in range(32):
                    sa = (s_i / 32.0) * 2.0 * math.pi
                    rx = max(4.0, min(47.0, 29.0 + math.cos(sa) * ring_rx))
                    ry = max(40.0, min(46.0, 44.0 + math.sin(sa) * 2.5))
                    set_px(frame, rx, ry, GOLD_WHITE if s_i % 3 == 0 else (JADE_LIGHT if s_i % 2 == 0 else GOLD_MOLTEN))

            frames.append(frame)

        else:
            # F27..F29: Triumphant recovery to (34, 22, -52 deg)
            k = f - 27
            u = (k + 1) / 3.0
            crouch_d = [2, 1, 0][k]
            body = make_crouch_juggernaut(tpl, crouch_d) if crouch_d > 0 else tpl["stand"].copy()
            body = apply_mantle_and_beard_sway(body, phase, amplitude=1.5, vertical_flutter=0.6, furnace_pulse=0.9)
            body = draw_ragnarok_crown_and_jets(
                body, head_xy=(28, 9 + crouch_d), shoulder_xy=(21, 17 + crouch_d), intensity=0.7 * (1.0 - u * 0.5), phase=phase
            )
            ang = 24.0 * (1.0 - u) + (-52.0) * u
            frame = draw_warhammer(
                body,
                hand_x=int(round(37 * (1.0 - u) + 34 * u)),
                hand_y=int(round((24 + crouch_d) * (1.0 - u) + 22 * u)),
                angle_deg=ang,
                glow_intensity=1.1,
                scale=1.04,
                haft_len=16.5,
                shoulder=(27, 17 + crouch_d),
                two_handed=False,
                phase=phase,
            )
            frames.append(frame)
    return frames


def build_row5_death(tpl):
    """
    Row 5 (`DEATH` & `HURT`, 150..179):
    - F00..F06: Hit-stagger recoil (`HURT` uses F00..F06) with sparks flying off his breastplate.
    - F07..F17: Drops heavy to one knee (y+6px), leaning on his War-Hammer shaft in front of him (`gx = 34`).
    - F18..F29: Collapses horizontally (90 deg rotated body lying flat on the ground at y=37..46)
      with his War-Hammer lying flat (0 deg horizontal) on the ground beside him (y=43..46)
      — ZERO upright or floating hammer!
    """
    frames = []
    for f in range(30):
        if f <= 6:
            # F00..F06: Hit-stagger recoil with sparks flying off his breastplate
            u = f / 6.0
            dx = -int(round(math.sin(u * math.pi * 0.85) * 2.0))
            dy = int(round(u * 2.0))
            base = shift_layer(tpl["stand"], dx=dx, dy=dy)
            base = apply_mantle_and_beard_sway(base, u * math.pi, amplitude=1.5, vertical_flutter=0.5, furnace_pulse=0.4)
            frame = draw_warhammer(
                base,
                hand_x=max(31, 34 + dx),
                hand_y=22 + dy,
                angle_deg=-52.0 + u * 45.0,
                glow_intensity=0.6,
                scale=1.0,
                haft_len=16.0,
                shoulder=(27 + dx, 17 + dy),
                two_handed=False,
            )
            # Breastplate hit sparks flying outward
            for sp in range(4):
                sx_s = min(47, 30 + sp * 2 + f)
                sy_s = max(5, 21 - (sp % 2) * 3 + (f // 2))
                set_px(frame, sx_s, sy_s, GOLD_WHITE if sp == 0 else MAGMA_ORANGE)
            frames.append(frame)

        elif f <= 17:
            # F07..F17: Drops heavy to one knee (y+6px), leaning on his War-Hammer shaft in front of him
            u = (f - 7) / 10.0
            base = tpl["kneel"].copy()
            if f >= 13:
                head_drop = 1 if f <= 15 else 2
                head_slice = base[12:24, 22:34].copy()
                base[12 + head_drop : 24 + head_drop, 22:34] = head_slice
                base = fill_layer_pinholes(base)
            flicker = 0.65 if (f % 3 == 0) else 0.15
            base = apply_mantle_and_beard_sway(base, u * math.pi, amplitude=1.0, vertical_flutter=0.3, furnace_pulse=flicker)

            frame = draw_warhammer(
                base,
                hand_x=34,
                hand_y=27 + (1 if f >= 14 else 0),
                angle_deg=48.0 - u * 8.0,
                glow_intensity=max(0.2, 0.6 * (1.0 - u)),
                scale=0.95,
                haft_len=14.5,
                shoulder=(27, 23 + (1 if f >= 14 else 0)),
                two_handed=False,
            )
            frames.append(frame)

        else:
            # F18..F29: Collapses horizontally (90 deg rotated body lying flat on the ground at y=37..46)
            # with his War-Hammer lying flat (0 deg horizontal) on the ground beside him (y=43..46)!
            k = f - 18
            frame = tpl["fall"].copy()
            if k == 0:
                frame = shift_layer(frame, dx=0, dy=-1)

            # Draw the War-Hammer lying flat on its broad face horizontally at y=43..46, x=18..43
            for hx_p in range(18, 35):
                set_px(frame, hx_p, 44, BRONZE_BRIGHT if hx_p % 3 == 0 else IRON_MID)
                set_px(frame, hx_p, 45, OBSIDIAN_DARK)
            set_px(frame, 17, 44, GOLD_MOLTEN)
            # Flat-lying Hammerhead block (x=34..43, y=42..46)
            for hy_p in range(42, 47):
                for hx_p in range(34, 44):
                    if hy_p in (42, 46) or hx_p in (34, 43):
                        col = BRONZE_BRIGHT if hy_p == 42 else BRONZE_MID
                    elif hy_p == 44 and hx_p in (37, 38, 39):
                        col = JADE_LIGHT if k <= 4 else JADE_BRIGHT
                    elif hy_p in (43, 45) and hx_p in (36, 41):
                        col = GOLD_MOLTEN
                    else:
                        col = OBSIDIAN_DARK
                    set_px(frame, hx_p, hy_p, col)

            # Cooling forge ember drifting along the fallen hammer so every frame F18..F29 is unique
            ember_x = 24 + k
            set_px(frame, min(43, ember_x), 43 - (k % 2), GOLD_MOLTEN if k <= 5 else JADE_BRIGHT)
            frames.append(frame)

    return frames


def build_row6_dash(tpl):
    """
    Row 6 (`DASH` - Molten Juggernaut Stampede, 180..209):
    - F00..F04: Low explosive charge crouch holding War-Hammer out in front (`gx = 34..36`).
    - F05..F23: Full-speed horizontal shoulder-and-hammer bull-rush (`gx = 36 + pump_dx`)
      with trailing molten-gold & jade speed-afterimages, flying coal embers, and billowing fur mantle.
    - F24..F29: Heavy skidding boot-stop with sparks returning to `(34, 22, -52 deg)`.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 4:
            # F00..F04: Low explosive charge crouch
            u = f / 4.0
            crouch_d = [1, 2, 4, 4, 3][f]
            base = make_crouch_juggernaut(tpl, crouch_d)
            base = apply_mantle_and_beard_sway(
                base, phase * 2.0, amplitude=1.6, is_dash=(f >= 2), furnace_pulse=0.8 + u * 0.2
            )
            ang = -52.0 * (1.0 - u) + (-12.0) * u
            frame = draw_warhammer(
                base,
                hand_x=34 + int(round(u * 2)),
                hand_y=22 + crouch_d,
                angle_deg=ang,
                glow_intensity=0.9 + u * 0.3,
                scale=1.0,
                haft_len=15.5,
                shoulder=(27, 17 + crouch_d),
                two_handed=False,
                phase=phase,
            )
            frames.append(frame)

        elif f <= 23:
            # F05..F23: Full-speed horizontal shoulder-and-hammer bull-rush
            k = f - 5
            bob_dy = int(round(math.sin(k * 0.7) * 1.0))
            base = shift_layer(tpl["dash"], dx=0, dy=bob_dy)
            base = apply_mantle_and_beard_sway(
                base, k * 0.85, amplitude=1.8, vertical_flutter=0.8, is_dash=True, furnace_pulse=1.0
            )

            # Trailing Molten-Gold & Emerald-Jade speed-afterimages & flying coal embers behind cape (safely inside x >= 3)
            for s_idx in range(5):
                sy = 14 + s_idx * 6 + ((k + s_idx) % 2)
                sx0 = 4 + ((k * 3 + s_idx * 4) % 7)
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
                two_handed=False,
                phase=phase,
            )
            frames.append(frame)

        else:
            # F24..F29: Heavy skidding boot-stop with sparks
            k = f - 24
            u = k / 5.0
            crouch_d = [3, 3, 2, 1, 1, 0][k]
            base = make_crouch_juggernaut(tpl, crouch_d) if crouch_d > 0 else tpl["stand"].copy()
            base = apply_mantle_and_beard_sway(
                base, phase, amplitude=1.5, vertical_flutter=0.5, furnace_pulse=0.85 - u * 0.2
            )
            ang = -10.0 * (1.0 - u) + (-52.0) * u
            frame = draw_warhammer(
                base,
                hand_x=int(round(36 * (1.0 - u) + 34 * u)),
                hand_y=22 + crouch_d,
                angle_deg=ang,
                glow_intensity=1.0 - u * 0.15,
                scale=1.0,
                haft_len=16.5,
                shoulder=(27, 17 + crouch_d),
                two_handed=False,
                phase=phase,
            )
            # Boot-skid sparks at y=44..45
            if k <= 3:
                for bx in (18, 35):
                    set_px(frame, bx + 2 + k, 44, GOLD_WHITE)
                    set_px(frame, bx + 1 + k, 43, MAGMA_ORANGE)
            frames.append(frame)
    return frames


def build_row7_crouch(tpl):
    """
    Row 7 (`CROUCH` - Braced Earthbreaker Stance & Magma Quake, 210..239):
    - ZERO boxy `draw_anvil_shield` door covering Titan's body!
    - Uses continuous vertical compression `make_crouch_juggernaut` on `tpl['stand']` so his horned helm,
      beard, obsidian breastplate, wide bronze battle-girdle/tassets, bent knees, and anchored sabatons
      remain 100% visible and complete.
    - F00..F06: Drops into a powerhouse braced earthbreaker crouch (`d = 1..6`), lowering his
      Earthbreaker Greathammer diagonally (`angle_deg = -45 deg -> +26 deg`) in front of him.
    - F07..F18: Holds a deep braced earthbreaker crouch (`d = 5..6`) holding and sweeping his
      Earthbreaker Greathammer diagonally (`angle_deg = 25°..38°`) in front of him (`hx = 34..37`),
      unleashing low ground-hugging magma fissures & forge embers along the floor (`y = 43..45`).
    - F19..F29: Rises smoothly back to standing stance `(34, 22, -52 deg)`.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 6:
            # F00..F06: Drops into deep fortified crouch & lowers Greathammer into diagonal braced guard
            depths = [1, 2, 3, 4, 5, 6, 6]
            d = depths[f]
            u = f / 6.0
            base = make_crouch_juggernaut(tpl, d)
            base = apply_mantle_and_beard_sway(
                base, phase, amplitude=1.2, vertical_flutter=0.3, furnace_pulse=0.75 + u * 0.25
            )
            ang = -45.0 * (1.0 - u) + 26.0 * u
            frame = draw_warhammer(
                base,
                hand_x=34 + (1 if f >= 4 else 0),
                hand_y=21 + d,
                angle_deg=ang,
                glow_intensity=0.9 + u * 0.25,
                scale=1.0,
                haft_len=15.0,
                shoulder=(27, 17 + d),
                two_handed=False,
                phase=phase,
            )
            frames.append(frame)

        elif f <= 18:
            # F07..F18: Powerhouse braced earthbreaker crouch holding Greathammer diagonally (25°..38°) in front of him!
            k = f - 7  # 0..11
            d = 5 if k in (4, 5, 6) else 6
            base = make_crouch_juggernaut(tpl, d)
            base = apply_mantle_and_beard_sway(
                base, phase * 2.0, amplitude=1.4, vertical_flutter=0.4, furnace_pulse=1.0
            )

            ang_seq = [26.0, 28.0, 31.0, 34.0, 37.0, 38.0, 36.0, 34.0, 31.0, 29.0, 27.0, 25.0]
            hx_seq = [35, 35, 36, 36, 37, 37, 36, 36, 35, 35, 34, 34]
            hy_off = [21, 21, 21, 22, 22, 22, 22, 21, 21, 21, 21, 21]

            frame = draw_warhammer(
                base,
                hand_x=hx_seq[k],
                hand_y=hy_off[k] + d,
                angle_deg=ang_seq[k],
                glow_intensity=1.25 if 2 <= k <= 8 else 1.05,
                scale=1.0,
                haft_len=14.5,
                shoulder=(27, 17 + d),
                two_handed=False,
                phase=phase,
            )

            # Low ground-hugging Molten Magma & Emerald-Jade Quake Fissure along the floor (y=43..45, x=32..46)
            if 2 <= k <= 9:
                sk = k - 2
                wave_x = min(46, 36 + sk * 2)
                for wx in range(32, wave_x + 1):
                    wy = 45 - ((wx + sk) % 2)
                    set_px(
                        frame,
                        wx,
                        wy,
                        GOLD_WHITE if wx >= wave_x - 1 else (JADE_LIGHT if wx % 3 == 0 else MAGMA_ORANGE),
                    )
                    set_px(frame, wx, 45, GOLD_MOLTEN)

            frames.append(frame)

        else:
            # F19..F29: Rises smoothly from crouch back to standing stance (34, 22, -52 deg)
            depths = [6, 5, 5, 4, 4, 3, 3, 2, 1, 1, 0]
            k = f - 19
            d = depths[k]
            u = k / 10.0
            base = make_crouch_juggernaut(tpl, d) if d > 0 else tpl["stand"].copy()
            base = apply_mantle_and_beard_sway(
                base, phase, amplitude=1.4, vertical_flutter=0.5, furnace_pulse=0.75 - u * 0.2
            )
            ang = 25.0 * (1.0 - u) + (-52.0) * u
            frame = draw_warhammer(
                base,
                hand_x=34,
                hand_y=22 + d,
                angle_deg=ang,
                glow_intensity=0.95 - u * 0.1,
                scale=1.0,
                haft_len=16.5,
                shoulder=(27, 17 + d),
                two_handed=False,
                phase=phase,
            )
            frames.append(frame)
    return frames


def build_row8_jump(tpl):
    """
    Row 8 (`JUMP` - Meteor Forge-Leap & Aerial Hammer Dunk, 240..269):
    - CRITICAL: ZERO bouncy-ball or curled sphere frames! Torgar's full horned head,
      armored torso, full crimson cape, wide bronze battle-girdle/tassets, 6-7px plate legs,
      and War-Hammer remain 100% distinct on every single frame!
    - F00..F04: Deep squat windup with furnace back-jets igniting (`gx = 34 -> 32`).
    - F05..F13: Powerful ascending Meteor Forge-Leap hoisting War-Hammer above his front shoulder (`gx = 32 -> 31`).
    - F14..F21: Apex Aerial World-Breaker Hammer Dunk — swings the blazing War-Hammer forward/down (`gx = 31 -> 39`)
      from -120 deg overhead down to +40 deg beneath him in a massive golden-jade crescent arc!
    - F22..F29: Heavy meteoric 3-point landing impact with volcanic sparks and rising recovery to `(34, 22, -52 deg)`.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 4:
            # F00..F04: Deep squat windup with furnace back-jets igniting
            crouch_seq = [1, 3, 5, 4, 2]
            d = crouch_seq[f]
            u = f / 4.0
            body = make_crouch_juggernaut(tpl, d)
            body = apply_mantle_and_beard_sway(body, phase * 2.0, amplitude=1.5, vertical_flutter=0.6, furnace_pulse=0.8 + u * 0.2)
            body = draw_ragnarok_crown_and_jets(body, head_xy=(28, 9 + d), shoulder_xy=(21, 17 + d), intensity=0.4 + u * 0.5, phase=phase)
            ang = -52.0 - u * 48.0
            frame = draw_warhammer(
                body,
                hand_x=34 - int(round(u * 2)),
                hand_y=21 + d - int(round(u * 3)),
                angle_deg=ang,
                glow_intensity=0.95 + u * 0.25,
                scale=1.0,
                haft_len=16.0,
                shoulder=(27, 17 + d),
                two_handed=False,
                phase=phase,
            )
            frames.append(frame)

        elif f <= 13:
            # F05..F13: Ascending Meteor Forge-Leap hoisting grip above front shoulder (gx = 32 -> 31)
            k = f - 5
            u = k / 8.0
            jump_dy = int(round(-1 - math.sin(u * math.pi * 0.85) * 2.5))
            tilt_deg = 14.0 * (1.0 - u) + (-8.0) * u
            body = make_aerial_juggernaut(
                tpl, jump_dy=jump_dy, body_tilt_deg=tilt_deg, leg_tuck=0.45 + 0.35 * u, thruster_intensity=1.0, phase=phase * 2.0
            )
            sx, sy = 27, 17 + jump_dy
            ang = -100.0 - u * 22.0
            hx = int(round(32 * (1.0 - u) + 31 * u))
            hy = int(round((sy - 3) * (1.0 - u) + (sy - 5) * u))
            frame = draw_warhammer(
                body,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.25,
                scale=1.0,
                haft_len=15.5,
                shoulder=(sx, sy),
                two_handed=False,
                phase=phase * 2.0,
            )
            frames.append(frame)

        elif f <= 21:
            # F14..F21: Apex Aerial World-Breaker Hammer Dunk driving grip forward/down from (31, sy-5) to (39, sy+5)!
            k = f - 14
            u = k / 7.0
            jump_dy = int(round(-2 + u * 2.0))
            tilt_deg = -6.0 * (1.0 - u) + 12.0 * u
            body = make_aerial_juggernaut(
                tpl, jump_dy=jump_dy, body_tilt_deg=tilt_deg, leg_tuck=0.75 - 0.35 * u, thruster_intensity=0.9 - 0.3 * u, phase=phase * 2.0
            )

            sx, sy = 27, 17 + jump_dy
            ang_seq = [-120.0, -55.0, -5.0, 24.0, 36.0, 40.0, 36.0, 28.0]
            hx_seq = [31, 34, 37, 39, 39, 38, 37, 36]
            hy_seq = [sy - 4, sy - 1, sy + 2, sy + 4, sy + 6, sy + 6, sy + 6, sy + 5]
            cleave_arc = None
            if 1 <= k <= 5:
                arc_int = [0.9, 1.0, 1.0, 0.85, 0.6][k - 1]
                a0 = [-115.0, -80.0, -42.0, -10.0, 10.0][k - 1]
                cleave_arc = (a0, ang_seq[k] + 5.0, 17.5, arc_int)

            frame = draw_warhammer(
                body,
                hand_x=hx_seq[k],
                hand_y=hy_seq[k],
                angle_deg=ang_seq[k],
                glow_intensity=1.4 if k <= 5 else 1.1,
                scale=1.04,
                haft_len=15.5,
                shoulder=(sx, sy),
                two_handed=False,
                cleave_arc=cleave_arc,
                phase=phase * 2.0,
            )
            frames.append(frame)

        else:
            # F22..F29: Heavy meteoric 3-point landing impact with volcanic sparks and rising recovery
            k = f - 22
            u = k / 7.0
            crouch_depths = [5, 6, 5, 4, 3, 2, 1, 0]
            d = crouch_depths[k]
            body = make_crouch_juggernaut(tpl, d) if d > 0 else tpl["stand"].copy()
            body = apply_mantle_and_beard_sway(
                body, phase, amplitude=1.5, vertical_flutter=0.6, furnace_pulse=1.0 - u * 0.35
            )
            ang = 28.0 * (1.0 - u) + (-52.0) * u
            frame = draw_warhammer(
                body,
                hand_x=int(round(36 * (1.0 - u) + 34 * u)),
                hand_y=22 + d,
                angle_deg=ang,
                glow_intensity=1.2 - u * 0.3,
                scale=1.0,
                haft_len=16.5,
                shoulder=(27, 17 + d),
                two_handed=False,
                phase=phase,
            )
            # Volcanic impact sparks at landing (F22..F25)
            if k <= 3:
                for sx_s in range(14, 46, 4):
                    set_px(
                        frame,
                        sx_s + (k % 2),
                        45 - (sx_s % 3),
                        GOLD_WHITE if sx_s % 8 == 0 else (JADE_LIGHT if sx_s % 4 == 0 else MAGMA_ORANGE),
                    )
            frames.append(frame)
    return frames


def main():
    tpl = make_clean_templates()

    rows = [
        ("ROW 0: IDLE (30 FRAMES)", build_row0_idle(tpl)),
        ("ROW 1: WALK - JUGGERNAUT STRIDE (30 FRAMES)", build_row1_walk(tpl)),
        ("ROW 2: AUTO_ATTACK - TECTONIC HAMMER QUAKE (30 FRAMES)", build_row2_auto_attack(tpl)),
        ("ROW 3: SKILL - ANVIL OF THE MOUNTAIN KING (30 FRAMES)", build_row3_skill(tpl)),
        ("ROW 4: ULTIMATE - RAGNAROK WORLD-FORGE ERUPTION (30 FRAMES)", build_row4_ultimate(tpl)),
        ("ROW 5: DEATH & HURT (30 FRAMES)", build_row5_death(tpl)),
        ("ROW 6: DASH - MOLTEN JUGGERNAUT STAMPEDE (30 FRAMES)", build_row6_dash(tpl)),
        ("ROW 7: CROUCH - BRACED EARTHBREAKER STANCE (30 FRAMES)", build_row7_crouch(tpl)),
        ("ROW 8: JUMP - METEOR FORGE-LEAP & HAMMER DUNK (30 FRAMES)", build_row8_jump(tpl)),
    ]

    num_rows = len(rows)
    cell_px = 208
    sheet = Image.new("RGBA", (30 * cell_px, num_rows * cell_px), (0, 0, 0, 0))

    top_clips = bot_clips = left_clips = right_clips = 0
    for r_idx, (r_name, r_frames) in enumerate(rows):
        assert len(r_frames) == 30, f"{r_name} has {len(r_frames)} frames instead of 30"
        for c_idx in range(30):
            r_frames[c_idx] = ensure_safe_cell(r_frames[c_idx], margin=1)
            arr_c = r_frames[c_idx]
            if np.any(arr_c[0, :, 3] > 0):
                top_clips += 1
            if np.any(arr_c[51, :, 3] > 0):
                bot_clips += 1
            if np.any(arr_c[:, 0, 3] > 0):
                left_clips += 1
            if np.any(arr_c[:, 51, 3] > 0):
                right_clips += 1
        adj_diffs = sum(1 for i in range(29) if np.any(r_frames[i] != r_frames[i + 1]))
        print(f"{r_name:62s}: 30 frames generated, {adj_diffs}/29 adjacent transitions distinct")
        for c_idx, arr in enumerate(r_frames):
            cell_im = Image.fromarray(arr, mode="RGBA").resize((cell_px, cell_px), Image.Resampling.NEAREST)
            sheet.paste(cell_im, (c_idx * cell_px, r_idx * cell_px))

    print(f"Boundary clip audit across 270 frames: TOP={top_clips}, BOT={bot_clips}, LEFT={left_clips}, RIGHT={right_clips}")
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
