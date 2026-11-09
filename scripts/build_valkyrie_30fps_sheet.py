#!/usr/bin/env python3
"""
Builds Freyja's (Valkyrie - Winged Aerial Sky-Dragoon) 30-Frame-Per-Animation HD-2D Sprite Sheet:
- 9 rows x 30 columns = 270 unique frames (6240 x 1872 at 208x208 per cell, 52x52 logical upscaled 4x NEAREST):
  * Row 0: IDLE - WINGED HOVER-LANCER (30 frames)
  * Row 1: WALK - VALHALLA WING-GLIDE (30 frames)
  * Row 2: AUTO_ATTACK - TRIPLE VALKYRIE IMPALE & RISING HALBERD LAUNCHER (30 frames)
  * Row 3: SKILL - WYVERN CORKSCREW DRILL-CHARGE (30 frames)
  * Row 4: ULTIMATE - BAHAMUT SKY-ASCENSION & 10-SPEAR RAIN (30 frames)
  * Row 5: DEATH - WINGED VALKYRIE COLLAPSE (30 frames)
  * Row 6: DASH - VALKYRIE SKY-JET FLIGHT (30 frames)
  * Row 7: CROUCH - VALKYRIE WING-BACKSTEP & GOLDEN JAVELIN THROW (30 frames)
  * Row 8: JUMP - HIGH DRAGOON SKY-DIVE IMPALE (30 frames)
- 100% Unique Winged Aerial Sky-Dragoon Silhouette & Animation Set:
  * Ground-length left cape (x < 19, y = 20..41) stripped completely so Freyja shares ZERO cape silhouette with Warrior/Titan.
  * Lush, Articulated 5-Pinion Feathered Crimson-and-Gold Valkyrie Wings (x = 4..20, y = 6..32) rendered on ALL 9 ROWS.
  * Two-Handed 24px Gungnir War-Lance gripped by BOTH hands via 2-bone IK arms from Rear Shoulder (21, 18) and Lead Shoulder (27, 19).
"""

from collections import deque
import math
import numpy as np
from PIL import Image, ImageDraw

# Palette matching Freyja's Crimson-Gold Winged Valkyrie Sky-Dragoon HD-2D aesthetic
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
    path="/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/4f1fb80f-a88f-4496-9746-b4b9fe84f6d4/valkyrie_v1_base_1794151227418.jpg",
):
    """
    Loads `valkyrie_v1_base_1794151227418.jpg` (1024x1024), performs a BFS flood-fill from all 4 image borders
    to strip the white background + 3-pass anti-aliased fringe (ZERO white halo!), crops tight character bounds,
    scales cleanly into the 52x52 logical cell (`y = 4..45`) with both boots planted firmly at `y = 45`,
    and strips the heavy ground-length left cape (`x < 19, y = 20..41`) so Freyja has a sleek winged-dragoon
    silhouette instead of Warrior/Titan's cape!
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

    # Strip the heavy ground-length left cape (x < 19, y = 20..41), upper-left cape overhang (y = 11..19, x < 20),
    # and lower cape remnants so Freyja has zero horizontal cape cut-offs and a pure winged silhouette!
    cell[20:42, :19] = 0
    cell[21:27, 19:21] = 0
    cell[35:40, 25:28] = 0
    for y in range(11, 20):
        for x in range(0, 20):
            if cell[y, x, 3] > 0:
                r, g, b, _ = cell[y, x]
                # Preserve only bright warm platinum-gold hair near neck (x >= 16)
                if not (x >= 16 and r > 165 and g > 125 and b > 65 and (r - b) > 35):
                    cell[y, x] = (0, 0, 0, 0)
    return fill_layer_pinholes(cell)


def neutralize_baked_side_arms(tpl_img, max_chest_x=31):
    """
    Neutralizes BOTH static lowered side-arms on Freyja's torso on ALL templates so her two-handed
    2-bone IK arms gripping the Gungnir Dragon-Lance are 100% cleanly visible with ZERO extra limbs
    or chest/hip hands, and shapes her back/waist cleanly for her 5-Pinion Feathered Valkyrie Wings:
    - Strips the hanging right arm & gauntlet on the viewer-right (`x > max_chest_x, 18 <= y <= 30`).
    - Strips left-side cape/arm overhang (`x <= 20, 20 <= y <= 27`) and turns `x = 21..24, 20 <= y <= 30`
      into sleek crimson-and-gold Valkyrie cuirass & hip tasset armor.
    """
    out = tpl_img.copy()
    out[20:42, :19] = 0
    for y in range(18, 31):
        lim_x = max_chest_x + 1 if y <= 19 else max_chest_x
        for x in range(lim_x + 1, 50):
            out[y, x] = (0, 0, 0, 0)

    for y in range(20, 31):
        for x in range(19, 25):
            if out[y, x, 3] > 0:
                if x <= 20 and y <= 26:
                    out[y, x] = (0, 0, 0, 0)
                elif x <= 21 and y <= 26:
                    out[y, x] = OBSIDIAN_DEEP
                elif y <= 26:
                    out[y, x] = GOLD_MID if x == 22 else (CRIMSON_MID if (x + y) % 2 == 0 else CRIMSON_DARK)
                else:
                    # Smooth crimson dragon-scale hip tasset transition at y=27..30, x=20..24
                    if x == 19:
                        out[y, x] = (0, 0, 0, 0)
                    elif x == 20:
                        out[y, x] = OBSIDIAN_DEEP
                    else:
                        out[y, x] = GOLD_BRIGHT if y == 27 else (CRIMSON_MID if (x + y) % 2 == 0 else CRIMSON_DARK)

    return fill_layer_pinholes(out)


def make_clean_templates():
    """
    Constructs Freyja's modular anatomical templates from the clean 52x52 base sprite
    (with the left ground-length cape completely stripped):
    - `stand`: standing Valkyrie Dragoon with both lowered side-arms neutralized and boots planted at y=45
    - `stand_upper`: upper body, winged dragon helm, platinum-gold hair, and hip tassets/tabard (`y=0..35`)
    - `leg_back` (`leg_near`) and `leg_front` (`leg_far`): lower dragon-greave sabaton boots at y=38..46
    - `lunge`: forward-leaning attack body (+2px upper torso lean) with side-arms neutralized
    - `kneel`: dropped to one knee (y+6px) with side-arms neutralized
    - `fall`: 90-degree horizontally collapsed prone body anchored on the floor at y=35..46
    - `dash`: forward-tilted (+14 deg) Valkyrie Sky-Jet body with side-arms neutralized
    """
    raw = extract_clean_base_sprite()
    stand = neutralize_baked_side_arms(raw, max_chest_x=31)

    # Extract lower dragon-greave sabaton boots at y=38..46
    leg_back_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_front_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_back_patch[38:47, 19:26] = stand[38:47, 19:26]
    leg_front_patch[38:47, 29:38] = stand[38:47, 29:38]

    # Upper torso, winged helm, hair, and dragon-scale tassets/tabard (y=0..35)
    stand_upper = np.zeros((52, 52, 4), dtype=np.uint8)
    stand_upper[:36, :] = stand[:36, :]
    stand_upper = fill_layer_pinholes(stand_upper)

    # Forward-leaning lunge body (+2px upper-body lean)
    lunge = np.zeros((52, 52, 4), dtype=np.uint8)
    lunge[32:46, :] = stand[32:46, :]
    for y in range(4, 32):
        dx = 2 if y <= 25 else 1
        for x in range(14, 47):
            if stand[y, x, 3] > 0 and x + dx <= 49:
                lunge[y, x + dx] = stand[y, x]
    lunge = neutralize_baked_side_arms(lunge, max_chest_x=33)
    lunge = fill_layer_pinholes(lunge)

    # Kneeling body (torso dropped +6px onto bent knees planted at y=45)
    kneel = np.zeros((52, 52, 4), dtype=np.uint8)
    kneel[38:46, 18:38] = stand[38:46, 18:38]
    for y in range(4, 35):
        ny = y + 6
        if ny < 45:
            for x in range(14, 46):
                if stand[y, x, 3] > 0:
                    kneel[ny, x] = stand[y, x]
    kneel = fill_layer_pinholes(kneel)

    # Horizontally collapsed prone body (90-degree rotated flat on the floor at y=36..45)
    body_no_cape = stand.copy()
    body_no_cape[18:42, :19] = 0
    pil_body = Image.fromarray(body_no_cape, mode="RGBA")
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

    # Dash body (+14 deg forward Valkyrie Sky-Jet tilt)
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
                    nx = max(14, min(48, x))
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
    Animates Freyja's flowing platinum-gold hair (`x=14..24, y=10..18`), glowing golden dragon-helm eyes
    (`y=10..13, x=26..31`), and pulsing ruby-gold dragon armor runes (`y=16..33, x=23..31`).
    Does NOT wave or recreate any left cape at `x < 19, y = 20..41`.
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
        dy_h = int(round(math.sin(phase_rad * 1.4 - (y - 10) * 0.45) * 0.7))
        dx_h = int(round((-0.8 if is_dash else 0.0) + math.cos(phase_rad - (y - 10) * 0.4) * 0.6))
        for x in range(14, 25):
            if not hair_mask[y, x]:
                continue
            nx = max(13, min(25, x + dx_h))
            ny = max(6, min(20, y + dy_h))
            out[ny, nx] = hair_src[y, x]
            if x >= 21 and out[y, x, 3] == 0:
                out[y, x] = hair_src[y, x]

    out = fill_layer_pinholes(out, x0=12, x1=36, y0=6, y1=38, require_3_neighbors=False)

    # 2. Pulsing Golden Visor Eyes (y=10..13, x=26..31) & Ruby-Gold Dragon Armor Runes (y=16..33, x=23..31)
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


def draw_valkyrie_dragon_wings(
    canvas,
    attach_xy=(20, 17),
    wing_span=1.0,
    flap_phase=0.0,
    top_min_y=5,
    bot_max_y=32,
    seraph_mode=False,
    swept_back=False,
):
    """
    Renders Freyja's Lush, Articulated Feathered Crimson-and-Gold Valkyrie Wings (`x = 3..20, y = 5..32`)
    with a sweeping curved carpal arch, staggered crescent feather tips, and monotonic `x` Bezier curves
    so every feather terminates in a pointed 1px tip with ZERO vertical or horizontal flat segments!
    """
    wings = np.zeros((52, 52, 4), dtype=np.uint8)
    ax, ay = int(round(attach_xy[0])), int(round(attach_xy[1]))
    flap_dy = math.sin(flap_phase) * 1.5
    span_clamp = max(0.85, min(1.06, wing_span))

    # 1. Curved Upper Golden Wing-Arch (Shoulder -> High Carpal Crest)
    carpal_x = max(12, min(17, int(round(ax - 6.5 * span_clamp))))
    carpal_y = max(top_min_y + 2, min(bot_max_y - 10, int(round(ay - 7.0 + flap_dy * 0.6))))

    if swept_back:
        # Falcon Sky-Jet swept-back 5-pinion configuration with staggered pointed tips
        pinions = [
            # (tx_base, ty_base, arch_lift_y, col_quill, col_vane)
            (7, max(top_min_y + 1, ay - 8), 1.8, GOLD_WHITE, GOLD_BRIGHT),
            (3, max(top_min_y + 4, ay - 4), 2.2, GOLD_WHITE, RUBY_CORE),
            (5, ay + 1, 1.6, GOLD_BRIGHT, CRIMSON_BRIGHT),
            (8, min(bot_max_y - 4, ay + 6), 1.1, RUBY_CORE, CRIMSON_MID),
            (12, min(bot_max_y, ay + 10), 0.6, GOLD_BRIGHT, CRIMSON_DARK),
        ]
    elif seraph_mode:
        # Grand 6-Pinion Golden-Crimson Bahamut Seraph Wings with sweeping crescent profile
        pinions = [
            (7, max(top_min_y, 5), 1.8, GOLD_WHITE, GOLD_LIGHT),
            (3, max(top_min_y + 3, 9), 2.5, GOLD_WHITE, GOLD_BRIGHT),
            (4, 14, 2.2, GOLD_BRIGHT, RUBY_CORE),
            (6, 19, 1.7, RUBY_CORE, CRIMSON_BRIGHT),
            (9, 24, 1.2, CRIMSON_BRIGHT, GOLD_MID),
            (13, min(bot_max_y, 29), 0.7, GOLD_BRIGHT, CRIMSON_MID),
        ]
    else:
        # Standard Lush 6-Pinion Feathered Crimson-and-Gold Valkyrie Wings with organic crescent profile
        pinions = [
            (7, max(top_min_y, 6), 1.8, GOLD_WHITE, GOLD_BRIGHT),
            (3, max(top_min_y + 3, 10), 2.4, GOLD_WHITE, GOLD_LIGHT),
            (4, 15, 2.0, GOLD_BRIGHT, RUBY_CORE),
            (6, 20, 1.5, RUBY_CORE, CRIMSON_BRIGHT),
            (9, 25, 1.0, CRIMSON_BRIGHT, GOLD_MID),
            (13, min(bot_max_y - 1, 29), 0.6, GOLD_BRIGHT, CRIMSON_DARK),
        ]

    # Draw curved humeral wing-arch from shoulder (ax, ay) up to carpal crest (carpal_x, carpal_y)
    arch_steps = 18
    for s in range(arch_steps + 1):
        u_a = s / float(arch_steps)
        ctrl_ax = ax * 0.45 + carpal_x * 0.55
        ctrl_ay = min(ay, carpal_y) - 1.8
        bx = (1.0 - u_a) ** 2 * ax + 2.0 * (1.0 - u_a) * u_a * ctrl_ax + (u_a ** 2) * carpal_x
        by = (1.0 - u_a) ** 2 * (ay - 1) + 2.0 * (1.0 - u_a) * u_a * ctrl_ay + (u_a ** 2) * carpal_y
        set_px(wings, bx, max(top_min_y, by - 1.0), OBSIDIAN_DEEP)
        set_px(wings, bx, by, GOLD_WHITE if u_a > 0.35 else GOLD_BRIGHT)
        set_px(wings, bx, by + 1.0, GOLD_BRIGHT if u_a > 0.5 else RUBY_CORE)
        set_px(wings, bx + 0.8, by + 2.0, CRIMSON_BRIGHT)

    # 2. Render each articulated flight pinion with monotonic X progression so tips are 100% pointed
    num_p = len(pinions)
    for p_idx, (tx_base, ty_base, arch_lift_y, col_quill, col_vane) in enumerate(pinions):
        tx = int(round(ax - (ax - tx_base) * span_clamp))
        min_x_pinion = [6, 3, 4, 6, 9, 12][min(p_idx, 5)]
        tx = max(min_x_pinion, min(18, tx))
        ty = int(round(ty_base + flap_dy * (1.0 - p_idx * 0.15)))
        ty = max(top_min_y, min(bot_max_y - 1, ty))

        t_root = p_idx / float(max(1, num_p - 1))
        orig_x = carpal_x + (ax - carpal_x) * (t_root * 0.82)
        orig_y = carpal_y + (ay - carpal_y + 3.0) * t_root

        # Monotonic X control point strictly between orig_x and tx (NEVER overshoots left!)
        ctrl_x = orig_x * 0.48 + tx * 0.52
        ctrl_y = (orig_y + ty) * 0.5 - arch_lift_y

        steps = max(16, int(max(abs(orig_x - tx), abs(orig_y - ty)) * 2.2))
        for s in range(steps + 1):
            u = s / float(steps)
            wx = (1.0 - u) ** 2 * orig_x + 2.0 * (1.0 - u) * u * ctrl_x + (u ** 2) * tx
            wy = (1.0 - u) ** 2 * orig_y + 2.0 * (1.0 - u) * u * ctrl_y + (u ** 2) * ty
            wx = max(3.0, min(20.0, wx))
            wy = max(float(top_min_y), min(float(bot_max_y - 1), wy))

            # Gleaming leading-edge pinion quill
            if u > 0.72:
                q_col = GOLD_WHITE if p_idx <= 2 else GOLD_BRIGHT
            else:
                q_col = col_quill
            set_px(wings, wx, wy, q_col)
            if p_idx == 0 and u < 0.78 and wy - 1.0 >= top_min_y:
                set_px(wings, wx, wy - 1.0, OBSIDIAN_DEEP)

            # Tapered feather vane depth: lush covert overlap near body (u < 0.42), 1px mid-vane, 0px at pointed tip (u >= 0.72)
            if u < 0.40:
                feather_depth = 2
            elif u < 0.70:
                feather_depth = 1
            else:
                feather_depth = 0

            for m_dy in range(1, feather_depth + 1):
                my = min(float(bot_max_y), wy + m_dy)
                if m_dy == 1:
                    col_m = col_vane if (int(round(wx)) + p_idx) % 2 == 0 else RUBY_CORE
                else:
                    col_m = RUBY_BRIGHT if p_idx <= 1 else CRIMSON_MID
                set_px(wings, wx, my, col_m)

        # Crisp 1px pointed golden-white feather tip at (tx, ty)
        set_px(wings, tx, ty, GOLD_WHITE if p_idx <= 2 else GOLD_BRIGHT)

    # 3. Gleaming Golden Valkyrie Wing-Claw Crest at Carpal Bend (carpal_x, carpal_y)
    set_px(wings, carpal_x, carpal_y, GOLD_WHITE)
    set_px(wings, max(5, carpal_x - 1), max(top_min_y, carpal_y - 1), GOLD_BRIGHT)
    set_px(wings, min(20, carpal_x + 1), carpal_y, RUBY_CORE)
    set_px(wings, carpal_x, min(bot_max_y, carpal_y + 1), GOLD_LIGHT)

    # Only fill pinholes on the inner wing root (x >= 13) so outer feather blades & tips (x = 3..12) remain 100% separated!
    wings = fill_layer_pinholes(wings, x0=13, x1=21, y0=top_min_y, y1=bot_max_y + 1, require_3_neighbors=True)
    return composite_over(wings, canvas)


def _extract_full_valkyrie_cape(stand, dy_offset=0, phase=0.0, wave_scale=1.0, lift_y=0):
    """
    Replaces the old ground-length left cape (`x < 19, y = 20..41` is 100% stripped!)
    with Freyja's Lush 5-Pinion Feathered Crimson-and-Gold Valkyrie Wings (`x = 4..20, y = 6..32`)
    so she never shares the cape silhouette of Warrior or Titan.
    """
    empty = np.zeros((52, 52, 4), dtype=np.uint8)
    wing_span = 1.02 + 0.05 * math.sin(phase) * wave_scale
    return draw_valkyrie_dragon_wings(
        empty,
        attach_xy=(20, max(13, min(24, 17 + dy_offset + lift_y))),
        wing_span=wing_span,
        flap_phase=phase,
        top_min_y=6,
        bot_max_y=32,
    )


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
        for off, col in [
            (-1.0, OBSIDIAN_DEEP),
            (-0.4, CRIMSON_DARK),
            (0.0, CRIMSON_MID),
            (0.5, GOLD_DARK),
            (1.0, OBSIDIAN_DARK),
        ]:
            draw_line_px(layer, sx + n1x * off, sy + n1y * off, ex + n1x * (off * 0.85), ey + n1y * (off * 0.85), col)

        for off, col in [
            (-1.0, OBSIDIAN_DEEP),
            (-0.4, CRIMSON_MID),
            (0.0, GOLD_BRIGHT),
            (0.5, CRIMSON_DARK),
            (1.0, OBSIDIAN_DARK),
        ]:
            draw_line_px(layer, ex + n2x * off, ey + n2y * off, hx + n2x * (off * 0.85), hy + n2y * (off * 0.85), col)

        for dy_s in (-1, 0, 1):
            for dx_s in (-1, 0, 1):
                set_px(layer, sx + dx_s, sy + dy_s, GOLD_MID if dy_s == -1 else CRIMSON_MID)
        set_px(layer, ex, ey, GOLD_BRIGHT)
    else:
        for off, col in [
            (-1.1, OBSIDIAN_DEEP),
            (-0.5, CRIMSON_MID),
            (0.0, CRIMSON_BRIGHT),
            (0.5, GOLD_MID),
            (1.1, OBSIDIAN_DARK),
        ]:
            draw_line_px(layer, sx + n1x * off, sy + n1y * off, ex + n1x * (off * 0.85), ey + n1y * (off * 0.85), col)

        for off, col in [
            (-1.1, OBSIDIAN_DARK),
            (-0.5, CRIMSON_BRIGHT),
            (0.0, GOLD_BRIGHT),
            (0.5, CRIMSON_MID),
            (1.1, GOLD_DARK),
        ]:
            draw_line_px(layer, ex + n2x * off, ey + n2y * off, hx + n2x * (off * 0.85), hy + n2y * (off * 0.85), col)

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

        set_px(layer, ex, ey, GOLD_WHITE)
        set_px(layer, ex + n1x * 0.8, ey + n1y * 0.8, GOLD_BRIGHT)
        set_px(layer, ex - n1x * 0.8, ey - n1y * 0.8, CRIMSON_DARK)

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
    Renders Freyja's regal Two-Handed Crimson-Gold Gungnir War-Lance / Wyvern Halberd (`~24px` total length):
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
    px, py = -uy, ux

    pom_dist = 4.0 * scale
    grip_sep = 5.5 * scale
    lead_to_collar = 5.5 * scale
    spearhead_len = 9.0 * scale
    fluke_span = 3.4 * scale

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
            lat = side * u_w * fluke_span
            fwd_curve = math.sin(u_w * math.pi) * 1.4 * scale
            wx = collar_x + px * lat + ux * fwd_curve
            wy = collar_y + py * lat + uy * fwd_curve
            set_px(lance_layer, wx, wy, GOLD_WHITE if u_w > 0.7 else GOLD_BRIGHT)
            bx = collar_x + px * (lat * 0.92) - ux * (u_w * 1.5 * scale)
            by = collar_y + py * (lat * 0.92) - uy * (u_w * 1.5 * scale)
            set_px(lance_layer, bx, by, RUBY_BRIGHT if u_w < 0.65 else GOLD_MID)

    set_px(lance_layer, collar_x, collar_y, GOLD_WHITE)
    set_px(lance_layer, collar_x + ux * 0.7, collar_y + uy * 0.7, RUBY_CORE)

    # 3. 9px Tapered Crimson-Ruby & White-Gold Gungnir Spearhead (from collar_x/y to tip_x/y)
    blade_steps = int(round(spearhead_len * 3.5))
    for bi in range(blade_steps + 1):
        u_b = bi / float(max(1, blade_steps))
        bx_c = collar_x + ux * (u_b * spearhead_len)
        by_c = collar_y + uy * (u_b * spearhead_len)
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
                col_b = GOLD_WHITE if (glow_intensity >= 0.95 or u_b > 0.88) else GOLD_BRIGHT
            elif aw > 0.72:
                col_b = GOLD_WHITE if (glow_intensity >= 1.1 and u_b > 0.45) else GOLD_LIGHT
            else:
                col_b = RUBY_CORE if (glow_intensity >= 1.15 and wi > 0) else (RUBY_BRIGHT if wi >= 0 else CRIMSON_MID)
            set_px(lance_layer, px_b, py_b, col_b)

    # 4. BOTH Hands Grip the Dragon-Lance Shaft via 2-Bone IK Arms:
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
            ex_e = max(4.0, min(47.0, bx_e + math.cos(e_ang) * 2.2))
            ey_e = max(4.0, min(43.0, by_e - 1.5 - (e_i % 2) + math.sin(e_ang) * 1.2))
            set_px(fx_layer, ex_e, ey_e, GOLD_WHITE if e_i % 2 == 0 else RUBY_CORE)
            if glow_intensity >= 1.1:
                set_px(fx_layer, ex_e, max(4.0, ey_e - 1.0), AMBER_FLAME if e_i % 2 == 0 else CRIMSON_BRIGHT)

    # 6. Spiraling Crimson-Gold Dragonfire Drill Cone around the Spearhead
    if drill_cone:
        for d_i in range(18):
            u_d = d_i / 17.0
            cx_d = collar_x - ux * 2.5 + ux * (u_d * (spearhead_len + 3.5))
            cy_d = collar_y - uy * 2.5 + uy * (u_d * (spearhead_len + 3.5))
            cone_r = (1.0 - u_d * 0.76) * 4.5
            spiral_a = phase * 3.2 + u_d * math.pi * 4.5
            for strand in (0, 1):
                sa = spiral_a + strand * math.pi
                off_p = math.sin(sa) * cone_r
                sx_c = max(4.0, min(47.0, cx_d + px * off_p))
                sy_c = max(4.0, min(43.5, cy_d + py * off_p))
                col_c = GOLD_WHITE if strand == 0 and d_i % 2 == 0 else (AMBER_FLAME if strand == 0 else RUBY_CORE)
                set_px(fx_layer, sx_c, sy_c, col_c)
                set_px(
                    fx_layer,
                    max(4.0, min(47.0, sx_c - ux * 0.8)),
                    max(4.0, min(43.5, sy_c - uy * 0.8)),
                    CRIMSON_BRIGHT if strand == 1 else GOLD_BRIGHT,
                )

    # 7. Optional 3-Band White-Gold, Amber-Flame & Crimson-Rose Halberd Crescent Trail
    if cleave_arc is not None:
        a_start, a_end, arc_r, arc_int = cleave_arc
        arc_steps = 46
        piv_x = float(shoulder_lead[0]) if shoulder_lead is not None else 27.0
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
            set_px(fx_layer, ax, ay, GOLD_WHITE if u_a > 0.45 else GOLD_LIGHT)
            set_px(
                fx_layer,
                max(4.0, min(47.0, ax - ca * 1.2)),
                max(4.0, min(43.5, ay - sa * 1.2)),
                AMBER_FLAME if k % 2 == 0 else GOLD_BRIGHT,
            )
            if env > 0.35:
                set_px(
                    fx_layer,
                    max(4.0, min(47.0, ax - ca * 2.4)),
                    max(4.0, min(43.5, ay - sa * 2.4)),
                    RUBY_CORE if k % 3 == 0 else RUBY_BRIGHT,
                )
                set_px(
                    fx_layer,
                    max(4.0, min(47.0, ax - ca * 3.5)),
                    max(4.0, min(43.5, ay - sa * 3.5)),
                    CRIMSON_MID,
                )

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
                    px_col[1] = int(px_col[1] * 0.80)
                    px_col[2] = int(px_col[2] * 0.84)
                layer[ny, nx] = px_col

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


def render_walk_valkyrie(tpl, f):
    """
    Row 1 helper: Smooth 30-frame Valhalla Wing-Glide stride cycle (`F00..F14` Step A, `F15..F29` Step B)
    with flared 5-Pinion Feathered Crimson-Gold Valkyrie Wings (`wing_span = 1.05`) and zero ground-length cape.
    """
    phase = (f / 30.0) * 2.0 * math.pi
    bob_y = int(round(math.cos(phase * 2.0) * 1.0)) - 1  # slight aerial wing-glide elevation

    stand = tpl["stand"].copy()
    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    tabard_overlay = np.zeros((52, 52, 4), dtype=np.uint8)

    for y in range(0, 36):
        ny = y + bob_y
        if not (2 <= ny <= 49):
            continue
        min_tx = 14 if y < 20 else 20
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
        knee_x = hip_x + s_val * 2.4 + knee_lift * 1.2
        knee_y = hip_y + 4.6 - knee_lift * 1.8

        foot_target_x = foot_base_x + s_val * 2.8 - knee_lift * 0.8
        foot_lift_dy = bob_y - int(round(knee_lift * 2.0))
        boot_rot_deg = s_val * 9.0 - knee_lift * 12.0

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

    out = composite_over(far_leg, torso_layer)
    out = composite_over(out, near_leg)
    out = composite_over(out, tabard_overlay)
    out = apply_hair_and_cape_wave(out, phase, amplitude=1.4, vertical_flutter=0.5, rune_pulse=0.75)
    out = draw_valkyrie_dragon_wings(
        out,
        attach_xy=(20, 17 + bob_y),
        wing_span=1.05 + 0.04 * math.sin(phase * 2.0),
        flap_phase=phase * 2.0,
        top_min_y=6,
        bot_max_y=32,
    )
    return fill_layer_pinholes(out)


def make_crouch_valkyrie(tpl, crouch_depth):
    """
    Constructs Freyja's compressed knee-bend posture (`d = 1..5`) via vertical compression
    on `tpl['stand']` (without any left cape).
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
        for x in range(14, 50):
            if stand[sy, x, 3] > 0:
                nx = min(49, x + knee_dx)
                canvas[ny, nx] = stand[sy, x]

    for ny in range(44, 50):
        canvas[ny, :] = stand[ny, :]

    return fill_layer_pinholes(canvas)


def make_aerial_valkyrie(
    tpl,
    jump_dy,
    body_tilt_deg=0.0,
    leg_tuck=0.5,
    wing_span=1.0,
    phase=0.0,
    seraph_mode=False,
    swept_back=False,
):
    """
    Constructs Freyja's airborne Dragoon posture (`jump_dy = -3..+2`) with unfurling
    5-Pinion (or 6-Pinion Seraph) Feathered Crimson-Gold Valkyrie Wings (`x = 4..20, y = 6..32`)
    and articulated dragon-plate legs (with ZERO ground-length cape).
    """
    stand = tpl["stand"].copy()
    dy_i = max(-3, min(3, int(round(jump_dy))))
    t = max(0.0, min(1.0, leg_tuck))

    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    tabard_overlay = np.zeros((52, 52, 4), dtype=np.uint8)

    lean_dx = 1 if body_tilt_deg > 5.0 else (-1 if body_tilt_deg < -5.0 else 0)
    for y in range(0, 36):
        ny = max(3, min(46, y + dy_i))
        dx = lean_dx if y <= 24 else 0
        min_tx = 14 if y < 20 else 20
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

    out = composite_over(far_leg, torso_layer)
    out = composite_over(out, near_leg)
    out = composite_over(out, tabard_overlay)
    out = apply_hair_and_cape_wave(out, phase, amplitude=1.4, vertical_flutter=0.6, rune_pulse=0.9)
    if wing_span > 0.05:
        out = draw_valkyrie_dragon_wings(
            out,
            attach_xy=(20, max(13, 17 + dy_i)),
            wing_span=wing_span,
            flap_phase=phase * 2.0,
            top_min_y=5 if seraph_mode else 6,
            bot_max_y=32,
            seraph_mode=seraph_mode,
            swept_back=swept_back,
        )
    return fill_layer_pinholes(out)


def build_row0_idle(tpl):
    """
    Row 0 (`IDLE` — `WINGED HOVER-LANCER`, 30 frames):
    - Freyja gently hovers/flutters (`hover_dy = -1` to `-2` on `F05..F24`, with soft golden feather wind-wisps at `y = 45`)
      while her **Crimson-Gold Valkyrie Wings beat rhythmically (`wing_span = 0.92..1.08`)**
    - Holds her **24px Two-Handed Gungnir War-Lance leveled forward (`hand_x = 30, hand_y = 24 + hover_dy, angle_deg = -10° + 4° * sin(phase)`)**!
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
        base = apply_hair_and_cape_wave(base, phase, amplitude=1.4, vertical_flutter=0.5, rune_pulse=pulse)

        wing_span = 1.00 + 0.08 * math.sin(phase)  # beats rhythmically across 0.92..1.08
        base = draw_valkyrie_dragon_wings(
            base,
            attach_xy=(20, 17 + hover_dy),
            wing_span=wing_span,
            flap_phase=phase,
            top_min_y=6,
            bot_max_y=32,
        )

        lance_ang = -10.0 + 4.0 * math.sin(phase)
        hx = 30
        hy = 24 + hover_dy
        frame = draw_two_handed_dragon_lance(
            base,
            hand_x=hx,
            hand_y=hy,
            angle_deg=lance_ang,
            glow_intensity=0.95 + 0.25 * math.sin(phase),
            scale=1.0,
            shoulder_rear=(21, 18 + hover_dy),
            shoulder_lead=(27, 19 + hover_dy),
            phase=phase,
        )

        # Soft golden feather wind-wisps at y = 45 beneath her hovering boots
        wisp_shift = (f // 2) % 4
        for w_i, wx_base in enumerate((19, 25, 31, 36)):
            wx = wx_base + (wisp_shift if w_i >= 2 else -wisp_shift)
            set_px(frame, wx, 45, GOLD_WHITE if (w_i + f) % 2 == 0 else GOLD_BRIGHT)
            set_px(frame, wx + (1 if w_i >= 2 else -1), 45, AMBER_FLAME if w_i % 2 == 0 else RUBY_CORE)

        frames.append(frame)
    return frames


def build_row1_walk(tpl):
    """
    Row 1 (`WALK` — `VALHALLA WING-GLIDE`, 30 frames):
    - Freyja glides swiftly forward with her Valkyrie wings flared (`wing_span = 1.05`)
      and her Gungnir War-Lance couched horizontally like an aerial Dragoon
      (`hand_x = 31, hand_y = 24 + bob_y, angle_deg = -6°`)!
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        body = render_walk_valkyrie(tpl, f)
        bob_y = int(round(math.cos(phase * 2.0) * 1.0)) - 1

        lance_ang = -6.0 + 2.0 * math.sin(phase * 2.0)
        hx = 31
        hy = 24 + bob_y

        frame = draw_two_handed_dragon_lance(
            body,
            hand_x=hx,
            hand_y=hy,
            angle_deg=lance_ang,
            glow_intensity=1.0 + 0.2 * math.sin(phase * 2.0),
            scale=1.0,
            shoulder_rear=(21, 18 + bob_y),
            shoulder_lead=(27, 19 + bob_y),
            phase=phase,
        )

        # Subtle golden-crimson wing-glide slipstream wisps behind her heels (y = 41..44)
        for w_i in range(2):
            wx = 14 + ((f + w_i * 4) % 5)
            wy = 41 + w_i * 2 + (f % 2)
            set_px(frame, wx, wy, GOLD_WHITE if w_i == 0 else RUBY_CORE)
            set_px(frame, wx + 1, wy, GOLD_BRIGHT)

        frames.append(frame)
    return frames


def build_row2_auto_attack(tpl):
    """
    Row 2 (`AUTO_ATTACK` — `RANGED GUNGNIR JAVELIN THROW COMBO`, 30 frames):
    - `F00..F10`: **Overhead Gungnir Javelin Throw #1** (Freyja cocks Gungnir high at `hand_y = 15..18`
      and hurls a blazing golden-crimson javelin forward-upward on `F04..F07`).
    - `F11..F19`: **High-Arc Gungnir Javelin Throw #2** (`angle_deg = -38° .. -16°`, hurling a second
      radiant javelin on a sweeping skyward trajectory).
    - `F20..F29`: **Winged Hover Twin-Javelin Volley Finisher** (Freyja hovers airborne with flared
      Valkyrie wings and hurls twin converging Gungnir Javelins).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 10:
            # F00..F10: Overhead Gungnir Javelin Throw #1
            is_throw = 3 <= f <= 7
            base = (tpl["lunge"] if is_throw else tpl["stand"]).copy()
            base = apply_hair_and_cape_wave(base, phase * 2.0, amplitude=1.6, vertical_flutter=0.6, rune_pulse=0.95)
            wing_span = [0.96, 1.00, 1.04, 1.10, 1.12, 1.10, 1.06, 1.04, 1.00, 0.96, 0.94][f]
            base = draw_valkyrie_dragon_wings(
                base, attach_xy=(21 if is_throw else 20, 17), wing_span=wing_span, flap_phase=phase * 2.0
            )

            hx_seq = [29, 27, 26, 31, 34, 35, 34, 33, 31, 30, 29]
            hy_seq = [21, 17, 15, 16, 17, 18, 19, 20, 21, 22, 23]
            ang_seq = [-16.0, -32.0, -38.0, -24.0, -14.0, -10.0, -12.0, -14.0, -16.0, -14.0, -12.0]

            frame = draw_two_handed_dragon_lance(
                base,
                hand_x=hx_seq[f],
                hand_y=hy_seq[f],
                angle_deg=ang_seq[f],
                glow_intensity=1.40 if 3 <= f <= 7 else 1.08,
                scale=1.02,
                shoulder_rear=(22 if is_throw else 21, 18),
                shoulder_lead=(28 if is_throw else 27, 19),
                phase=phase,
            )

            # Radiant Gungnir Javelin release streak on F04..F07
            if 4 <= f <= 7:
                reach_x = 47 if f in (4, 5, 6) else 45
                draw_line_px(frame, 34, 17, reach_x, 14, GOLD_WHITE)
                draw_line_px(frame, 35, 16, reach_x - 1, 13, GOLD_BRIGHT)
                draw_line_px(frame, 35, 18, reach_x - 1, 15, RUBY_CORE)
                set_px(frame, reach_x, 13, GOLD_WHITE)
                set_px(frame, reach_x, 15, RUBY_CORE)
            frames.append(frame)

        elif f <= 19:
            # F11..F19: High-Arc Gungnir Javelin Throw #2
            k = f - 11  # 0..8
            is_throw = 1 <= k <= 5
            base = (tpl["lunge"] if is_throw else tpl["stand"]).copy()
            base = apply_hair_and_cape_wave(base, phase * 2.4, amplitude=1.8, vertical_flutter=0.7, rune_pulse=1.0)
            wing_span = [1.02, 1.08, 1.14, 1.16, 1.12, 1.08, 1.04, 0.98, 0.95][k]
            base = draw_valkyrie_dragon_wings(
                base, attach_xy=(21 if is_throw else 20, 17), wing_span=wing_span, flap_phase=phase * 2.5
            )

            hx_seq = [27, 31, 34, 35, 35, 34, 32, 30, 29]
            hy_seq = [16, 16, 17, 17, 18, 19, 20, 22, 23]
            ang_seq = [-38.0, -28.0, -20.0, -16.0, -16.0, -18.0, -20.0, -16.0, -12.0]

            frame = draw_two_handed_dragon_lance(
                base,
                hand_x=hx_seq[k],
                hand_y=hy_seq[k],
                angle_deg=ang_seq[k],
                glow_intensity=1.45 if k <= 5 else 1.1,
                scale=1.03,
                shoulder_rear=(22 if is_throw else 21, 18),
                shoulder_lead=(28 if is_throw else 27, 19),
                phase=phase * 2.0,
            )

            if 1 <= k <= 5:
                draw_line_px(frame, 35, 16, 47, 11, GOLD_WHITE)
                draw_line_px(frame, 36, 15, 46, 10, GOLD_BRIGHT)
                draw_line_px(frame, 36, 17, 46, 12, RUBY_CORE)
                set_px(frame, 47, 10, GOLD_WHITE)
                set_px(frame, 47, 12, RUBY_CORE)
            frames.append(frame)

        else:
            # F20..F29: Winged Hover Twin-Javelin Volley Finisher
            k = f - 20  # 0..9
            dy = -2 if 1 <= k <= 7 else -1
            body = make_aerial_valkyrie(
                tpl,
                jump_dy=dy,
                body_tilt_deg=4.0 if k <= 6 else 0.0,
                leg_tuck=0.35 if k <= 6 else 0.15,
                wing_span=[1.04, 1.10, 1.15, 1.16, 1.16, 1.14, 1.10, 1.06, 1.02, 0.98][k],
                phase=phase * 2.2,
            )

            ang_seq = [-46.0, -42.0, -30.0, -20.0, -14.0, -12.0, -14.0, -18.0, -16.0, -12.0]
            hx_seq = [27, 29, 33, 35, 35, 34, 33, 31, 30, 29]
            hy_seq = [15, 15, 16, 17, 17, 18, 19, 20, 21, 22]

            cleave_arc = None
            if 2 <= k <= 6:
                arc_int = [0.85, 1.0, 1.0, 0.92, 0.75][k - 2]
                cleave_arc = (-46.0, ang_seq[k], 17.0, arc_int)

            frame = draw_two_handed_dragon_lance(
                body,
                hand_x=hx_seq[k],
                hand_y=hy_seq[k],
                angle_deg=ang_seq[k],
                glow_intensity=1.48 if k <= 6 else 1.1,
                scale=1.04,
                shoulder_rear=(21, 18 + dy),
                shoulder_lead=(27, 19 + dy),
                cleave_arc=cleave_arc,
                phase=phase,
            )
            frames.append(frame)
    return frames


def draw_corkscrew_drill_vortex(canvas, f, phase):
    """
    Row 3 helper (`F05..F24`): Conjures arcing Golden-Crimson Gungnir Light-Javelins fanning out
    around Freyja during her `GUNGNIR JAVELIN BARRAGE` aerial hover!
    """
    vortex = np.zeros((52, 52, 4), dtype=np.uint8)
    javelin_lanes = [
        (33, 10, 46, 6),
        (34, 15, 47, 12),
        (35, 20, 47, 18),
        (33, 25, 46, 24),
    ]
    for j_idx, (x0, y0, x1, y1) in enumerate(javelin_lanes):
        prog = ((f * 2 + j_idx * 3) % 10) / 9.0
        sx = x0 + (x1 - x0) * max(0.0, prog - 0.35)
        sy = y0 + (y1 - y0) * max(0.0, prog - 0.35)
        tx = x0 + (x1 - x0) * prog
        ty = y0 + (y1 - y0) * prog
        draw_line_px(vortex, sx, sy, tx, ty, GOLD_WHITE if (j_idx + f) % 2 == 0 else GOLD_BRIGHT)
        set_px(vortex, tx, ty, GOLD_WHITE)
        set_px(vortex, max(4.0, tx - 1.0), max(4.0, ty - 1.0), RUBY_CORE if j_idx % 2 == 0 else AMBER_FLAME)

    return composite_over(canvas, vortex)


def build_row3_skill(tpl):
    """
    Row 3 (`SKILL` — `GUNGNIR JAVELIN BARRAGE`, 30 frames):
    - Freyja hovers airborne (`dy = -2`) with her Valkyrie wings unfurled wide, raising Gungnir high
      (`angle_deg = -28° .. -14°`) to conjure and hurl a 6-Javelin Celestial Halo Barrage from afar!
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 4:
            # F00..F04: Airborne hover ascent & overhead Gungnir javelin raise
            u = f / 4.0
            dy = -1 if f in (1, 2) else (-2 if f >= 3 else 0)
            body = make_aerial_valkyrie(
                tpl,
                jump_dy=dy,
                body_tilt_deg=4.0 * u,
                leg_tuck=0.30 + 0.15 * u,
                wing_span=0.98 + 0.16 * u,
                phase=phase * 2.0,
            )
            ang = -10.0 * (1.0 - u) + (-34.0) * u
            hx = int(round(30 * (1.0 - u) + 29 * u))
            hy = int(round(23 * (1.0 - u) + 16 * u)) + dy
            frame = draw_two_handed_dragon_lance(
                body,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.1 + 0.35 * u,
                scale=1.02,
                shoulder_rear=(21, 18 + dy),
                shoulder_lead=(27, 19 + dy),
                phase=phase * 2.0,
            )
            frames.append(frame)

        elif f <= 24:
            # F05..F24: Airborne hover (dy = -2), wings spread wide, hurling rhythmic Gungnir Javelin barrage!
            k = f - 5  # 0..19
            dy = -2
            throw_wave = math.sin(k * 0.95)
            body = make_aerial_valkyrie(
                tpl,
                jump_dy=dy,
                body_tilt_deg=4.0 + 3.0 * throw_wave,
                leg_tuck=0.45,
                wing_span=1.14 + 0.04 * math.sin(k * 0.7),
                phase=k * 0.65,
            )
            hx = int(round(31 + 3.0 * throw_wave))
            hy = int(round(16 + 1.5 * throw_wave))
            ang = -24.0 + 10.0 * throw_wave
            frame = draw_two_handed_dragon_lance(
                body,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.48,
                scale=1.03,
                shoulder_rear=(22, 18 + dy),
                shoulder_lead=(28, 19 + dy),
                phase=k * 0.7,
            )
            frame = draw_corkscrew_drill_vortex(frame, f, k * 0.65)
            frames.append(frame)

        else:
            # F25..F29: Graceful descent back to hover-lancer ready stance
            k = f - 25  # 0..4
            u = (k + 1) / 5.0
            dy = -2 if k <= 1 else -1
            body = make_aerial_valkyrie(
                tpl,
                jump_dy=dy,
                body_tilt_deg=4.0 * (1.0 - u),
                leg_tuck=0.45 * (1.0 - u * 0.7),
                wing_span=1.12 - 0.14 * u,
                phase=phase,
            )
            ang = -20.0 * (1.0 - u) + (-10.0) * u
            hx = int(round(32 * (1.0 - u) + 30 * u))
            frame = draw_two_handed_dragon_lance(
                body,
                hand_x=hx,
                hand_y=18 + int(round(4 * u)),
                angle_deg=ang,
                glow_intensity=1.25 - 0.2 * u,
                scale=1.0,
                shoulder_rear=(21, 18 + dy),
                shoulder_lead=(27, 19 + dy),
                phase=phase,
            )
            frames.append(frame)
    return frames


def draw_gungnir_10_spear_rain(canvas, f):
    """
    Row 4 helper (`F06..F26`): Renders 10 diagonal Golden Gungnir Light-Spears raining downward
    across `x = 34..47, y = 8..44` commanded by Freyja's Bahamut Sky-Ascension!
    """
    rain = np.zeros((52, 52, 4), dtype=np.uint8)
    # 10 staggered diagonal light-spear lanes across x = 34..47, y = 8..44
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

        # Diagonal Golden Light-Spear shaft & crossguard barbs
        draw_line_px(rain, sx0, sy0, tx, ty, GOLD_WHITE if (s_idx + f) % 2 == 0 else GOLD_BRIGHT)
        set_px(rain, tx, ty, GOLD_WHITE)
        set_px(rain, max(34.0, tx - 1.0), max(8.0, ty - 2.0), RUBY_CORE if s_idx % 2 == 0 else AMBER_FLAME)
        set_px(rain, min(47.0, tx + 1.0), max(8.0, ty - 2.0), GOLD_LIGHT)

        # Crisp golden-crimson star burst when a light-spear reaches the lower zone (y >= 40)
        if ty >= 40.0:
            ix, iy = int(round(tx)), int(round(ty))
            set_px(rain, max(34, ix - 1), iy, GOLD_BRIGHT)
            set_px(rain, min(47, ix + 1), iy, RUBY_CORE)
            set_px(rain, ix, max(8, iy - 1), GOLD_WHITE)

    return composite_over(canvas, rain)


def build_row4_ultimate(tpl):
    """
    Row 4 (`ULTIMATE` — `BAHAMUT SKY-ASCENSION & 10-SPEAR RAIN`, 30 frames):
    - Freyja ascends into the upper cell (`dy = -3`) with **Grand 6-Pinion Golden-Crimson Bahamut Seraph Wings**
      unfurled behind her (`wing_span = 1.15`), raising Gungnir to command **diagonal golden Gungnir Light-Spears
      raining downward** (`x = 34..47, y = 8..44`)!
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 5:
            # F00..F05: Bahamut Sky-Ascension to dy = -3, unfurling 6-Pinion Bahamut Seraph Wings (wing_span -> 1.15)
            u = f / 5.0
            dy = -int(round(u * 3.0))
            body = make_aerial_valkyrie(
                tpl,
                jump_dy=dy,
                body_tilt_deg=-4.0 * u,
                leg_tuck=0.45 * u,
                wing_span=0.98 + 0.17 * u,
                phase=phase * 2.0,
                seraph_mode=True,
            )
            ang = -10.0 * (1.0 - u) + (-58.0) * u
            hx = int(round(30 * (1.0 - u) + 32 * u))
            hy = int(round(23 * (1.0 - u) + 18 * u)) + dy
            frame = draw_two_handed_dragon_lance(
                body,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.2 + 0.3 * u,
                scale=1.03,
                shoulder_rear=(21, 18 + dy),
                shoulder_lead=(27, 19 + dy),
                phase=phase * 2.0,
            )
            frames.append(frame)

        elif f <= 25:
            # F06..F25: High-altitude Seraph hover (dy = -3), 6-Pinion Bahamut Seraph Wings (wing_span = 1.15),
            # commanding 10 diagonal golden Gungnir Light-Spears raining downward across x = 34..47, y = 8..44!
            k = f - 6  # 0..19
            dy = -3
            body = make_aerial_valkyrie(
                tpl,
                jump_dy=dy,
                body_tilt_deg=0.0,
                leg_tuck=0.45,
                wing_span=1.15,
                phase=phase * 2.5,
                seraph_mode=True,
            )
            # Seraphic golden halo crest above her winged helm (y = 3..5, x = 23..30)
            for hx_c in range(24, 30):
                set_px(body, hx_c, 4, GOLD_WHITE if (hx_c + f) % 2 == 0 else GOLD_BRIGHT)
            set_px(body, 26, 3, GOLD_WHITE)
            set_px(body, 27, 3, RUBY_CORE)

            ang = -48.0 + 18.0 * math.sin(k * 0.45)
            frame = draw_two_handed_dragon_lance(
                body,
                hand_x=32,
                hand_y=16,
                angle_deg=ang,
                glow_intensity=1.5,
                scale=1.04,
                shoulder_rear=(21, 15),
                shoulder_lead=(27, 16),
                phase=phase * 2.5,
            )
            frame = draw_gungnir_10_spear_rain(frame, f)
            frames.append(frame)

        else:
            # F26..F29: Graceful descent from dy = -3 back to hover-lancer pose
            k = f - 26  # 0..3
            u = (k + 1) / 4.0
            dy = -3 + int(round(u * 2.0))
            body = make_aerial_valkyrie(
                tpl,
                jump_dy=dy,
                body_tilt_deg=0.0,
                leg_tuck=0.45 * (1.0 - u),
                wing_span=1.15 - 0.15 * u,
                phase=phase,
                seraph_mode=(k <= 1),
            )
            ang = -32.0 * (1.0 - u) + (-10.0) * u
            frame = draw_two_handed_dragon_lance(
                body,
                hand_x=int(round(32 * (1.0 - u) + 30 * u)),
                hand_y=int(round(17 * (1.0 - u) + 23 * u)),
                angle_deg=ang,
                glow_intensity=1.3 - 0.25 * u,
                scale=1.0,
                shoulder_rear=(21, 18 + dy),
                shoulder_lead=(27, 19 + dy),
                phase=phase,
            )
            if k == 0:
                frame = draw_gungnir_10_spear_rain(frame, f)
            frames.append(frame)
    return frames


def build_row5_death(tpl):
    """
    Row 5 (`DEATH` — `WINGED VALKYRIE COLLAPSE`, 30 frames):
    - `F00..F06`: Hurt stagger recoil with flared 5-Pinion Crimson-Gold Valkyrie Wings and hit-sparks.
    - `F07..F17`: Progressive kneeling collapse (`tpl['kneel']`) with drooping Valkyrie wings, bracing on her Gungnir War-Lance.
    - `F18..F29`: Grounded horizontal prone collapse (`y = 32..46`, anchored on the floor at `y = 46`)
      with her folded 5-Pinion Crimson-Gold Valkyrie Wing draped across her back, Gungnir resting flat on the floor (`y = 44..46`),
      and fading golden-crimson feathers drifting down.
    """
    frames = []
    for f in range(30):
        if f <= 6:
            u = f / 6.0
            dx = -int(round(math.sin(u * math.pi * 0.85) * 2.0))
            dy = int(round(u * 2.0))
            base = shift_layer(tpl["stand"], dx=dx, dy=dy)
            base = apply_hair_and_cape_wave(base, u * math.pi, amplitude=1.5, vertical_flutter=0.5, rune_pulse=0.4)
            base = draw_valkyrie_dragon_wings(
                base,
                attach_xy=(20 + dx, 17 + dy),
                wing_span=1.04 - 0.14 * u,
                flap_phase=u * math.pi,
                top_min_y=6 + dy,
                bot_max_y=32 + dy,
            )
            frame = draw_two_handed_dragon_lance(
                base,
                hand_x=max(29, 31 + dx),
                hand_y=23 + dy,
                angle_deg=-10.0 + u * 28.0,
                glow_intensity=0.65,
                scale=1.0,
                shoulder_rear=(21 + dx, 18 + dy),
                shoulder_lead=(27 + dx, 19 + dy),
            )
            for sp in range(4):
                sx_s = min(47, 30 + sp * 2 + f)
                sy_s = max(5, 20 - (sp % 2) * 3 + (f // 2))
                set_px(frame, sx_s, sy_s, GOLD_WHITE if sp == 0 else (RUBY_CORE if sp % 2 == 0 else AMBER_FLAME))
            frames.append(frame)

        elif f <= 17:
            u = (f - 7) / 10.0
            kneel_src = tpl["kneel"].copy()
            extra_drop = 0 if f <= 12 else (f - 12)
            base = np.zeros((52, 52, 4), dtype=np.uint8)
            for sy in range(8, 46):
                for sx in range(14, 48):
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
            base = draw_valkyrie_dragon_wings(
                base,
                attach_xy=(20, min(32, 22 + extra_drop)),
                wing_span=0.88 - 0.22 * u,
                flap_phase=u * math.pi,
                top_min_y=min(24, 11 + extra_drop),
                bot_max_y=min(43, 36 + extra_drop),
            )

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
            # F18..F29: Grounded horizontal prone collapse (y = 32..46, anchored on the floor at y = 46)
            k = f - 18  # 0..11
            frame = shift_layer(tpl["fall"], dx=0, dy=1)

            # Folded 5-Pinion Feathered Crimson-Gold Valkyrie Wing draped over her prone back (x = 9..28, y = 32..41)
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
                    GOLD_WHITE if p_i == 0 else (GOLD_BRIGHT if p_i == 1 else (RUBY_CORE if p_i == 2 else CRIMSON_BRIGHT)),
                )
                draw_line_px(frame, px0, py0 + 1, px1 + 1, py0 + 3, CRIMSON_MID if p_i >= 2 else GOLD_MID)

            for cx_p in range(12, 32):
                for cy_p in range(41, 45):
                    if frame[cy_p, cx_p, 3] == 0 and (cx_p <= 26 or cy_p <= 43):
                        frame[cy_p, cx_p] = CRIMSON_MID if (cx_p + cy_p) % 2 == 0 else CRIMSON_DARK
            frame = fill_layer_pinholes(frame, x0=6, x1=44, y0=32, y1=47, require_3_neighbors=False)

            # Gungnir War-Lance resting flat on the floor (y = 44..46, x = 14..45)
            for lx in range(14, 36):
                ring = (lx % 4 == 0)
                set_px(frame, lx, 45, GOLD_BRIGHT if ring else IRON_MID)
                set_px(frame, lx, 46, GOLD_DARK if ring else OBSIDIAN_DARK)
            set_px(frame, 36, 44, GOLD_BRIGHT)
            set_px(frame, 36, 45, GOLD_WHITE)
            set_px(frame, 36, 46, GOLD_MID)
            set_px(frame, 37, 45, RUBY_CORE)
            for sx_b in range(37, 46):
                set_px(frame, sx_b, 45, GOLD_WHITE if sx_b >= 43 else (GOLD_BRIGHT if sx_b % 2 == 0 else RUBY_CORE))
                if sx_b <= 43:
                    set_px(frame, sx_b, 44, RUBY_BRIGHT if sx_b <= 40 else GOLD_LIGHT)
                    set_px(frame, sx_b, 46, CRIMSON_MID if sx_b <= 40 else GOLD_MID)

            # Fading golden-crimson Valkyrie feathers drifting gently down so every frame F18..F29 is distinct
            num_feathers = max(1, 5 - (k // 3))
            for f_i in range(num_feathers):
                fx_p = 15 + f_i * 6 + ((k + f_i) % 3)
                fy_p = min(44, 31 + k + f_i * 2)
                set_px(frame, fx_p, fy_p, GOLD_WHITE if (f_i + k) % 2 == 0 else RUBY_CORE)
                set_px(frame, fx_p + 1, fy_p, AMBER_FLAME if f_i % 2 == 0 else CRIMSON_BRIGHT)

            frames.append(frame)

    return frames


def build_row6_dash(tpl):
    """
    Row 6 (`DASH` — `VALKYRIE SKY-JET FLIGHT`, 30 frames):
    - Airborne winged dash (`dy = -2`) with her Valkyrie wings swept back like a falcon
      and glowing golden-crimson feather pinions streaming behind her!
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 2:
            # F00..F02: Airborne takeoff surge into falcon sky-jet flight
            u = (f + 1) / 3.0
            dy = -f  # 0, -1, -2
            body = make_aerial_valkyrie(
                tpl,
                jump_dy=dy,
                body_tilt_deg=12.0 * u,
                leg_tuck=0.55 * u,
                wing_span=1.08,
                phase=phase * 2.0,
                swept_back=(f == 2),
            )
            ang = -10.0 * (1.0 - u) + (-4.0) * u
            frame = draw_two_handed_dragon_lance(
                body,
                hand_x=31 + f,
                hand_y=23 + dy,
                angle_deg=ang,
                glow_intensity=1.15 + 0.2 * u,
                scale=1.0,
                shoulder_rear=(21, 18 + dy),
                shoulder_lead=(27, 19 + dy),
                phase=phase,
            )
            frames.append(frame)

        elif f <= 23:
            # F03..F23: Airborne winged dash (dy = -2) with falcon swept-back wings & streaming feather pinions
            k = f - 3  # 0..20
            dy = -2
            body = make_aerial_valkyrie(
                tpl,
                jump_dy=dy,
                body_tilt_deg=14.0,
                leg_tuck=0.72,
                wing_span=1.06 + 0.04 * math.sin(k * 0.7),
                phase=k * 0.75,
                swept_back=True,
            )

            # Glowing golden-crimson feather pinions & sky-jet contrails streaming behind her (x = 4..17, y = 10..34)
            for r_idx in range(5):
                ry = 11 + r_idx * 5 + ((k + r_idx) % 2)
                rx0 = 4 + ((k * 2 + r_idx * 3) % 7)
                col_quill = GOLD_WHITE if r_idx % 2 == 0 else GOLD_BRIGHT
                col_vane = RUBY_CORE if r_idx % 2 == 0 else CRIMSON_BRIGHT
                draw_line_px(body, rx0, ry, min(16, rx0 + 4), ry, col_quill)
                draw_line_px(body, rx0 + 1, ry + 1, min(16, rx0 + 3), ry + 1, col_vane)
                set_px(body, max(4, rx0 - 1), ry, AMBER_FLAME)

            ang = -4.0 + math.sin(k * 0.65) * 2.0
            frame = draw_two_handed_dragon_lance(
                body,
                hand_x=34 + (k % 2),
                hand_y=21,
                angle_deg=ang,
                glow_intensity=1.35,
                scale=1.0,
                shoulder_rear=(22, 16),
                shoulder_lead=(28, 17),
                phase=k * 0.6,
            )
            frames.append(frame)

        else:
            # F24..F29: Wing-flare air-braking & return to hover-lancer pose
            k = f - 24  # 0..5
            u = (k + 1) / 6.0
            dy = -2 if k <= 2 else -1
            body = make_aerial_valkyrie(
                tpl,
                jump_dy=dy,
                body_tilt_deg=12.0 * (1.0 - u),
                leg_tuck=0.65 * (1.0 - u),
                wing_span=1.12 - 0.14 * u,
                phase=phase,
                swept_back=False,
            )
            ang = -4.0 * (1.0 - u) + (-10.0) * u
            frame = draw_two_handed_dragon_lance(
                body,
                hand_x=int(round(34 * (1.0 - u) + 30 * u)),
                hand_y=21 - dy - 1,
                angle_deg=ang,
                glow_intensity=1.15 - 0.15 * u,
                scale=1.0,
                shoulder_rear=(21, 18 + dy),
                shoulder_lead=(27, 19 + dy),
                phase=phase,
            )
            frames.append(frame)
    return frames


def draw_golden_valkyrie_javelin_throw(canvas, f, phase):
    """
    Row 7 helper (`F07..F22`): Renders Freyja's Blazing Golden Valkyrie Javelin aimed and hurled
    diagonally downward (`angle = +26°` from `(29, 17)` to `(46, 36)`) with zero shield halo and zero ground spikes!
    """
    jav = np.zeros((52, 52, 4), dtype=np.uint8)
    x0, y0 = 29.0, 17.0
    x1, y1 = 46.0, 36.0
    rad = math.radians(26.0)
    ux, uy = math.cos(rad), math.sin(rad)
    px, py = -uy, ux

    if f <= 10:
        # F07..F10: Cocked & releasing Blazing Golden Valkyrie Javelin at (29, 17) aimed at +26 deg
        u = (f - 7) / 3.0
        jx = x0 + u * 3.0
        jy = y0 + u * 3.2
        draw_line_px(jav, jx - ux * 6.0, jy - uy * 6.0, jx + ux * 9.0, jy + uy * 9.0, GOLD_WHITE)
        draw_line_px(jav, jx - ux * 5.0 + px, jy - uy * 5.0 + py, jx + ux * 8.0 + px, jy + uy * 8.0 + py, GOLD_BRIGHT)
        draw_line_px(jav, jx - ux * 5.0 - px, jy - uy * 5.0 - py, jx + ux * 8.0 - px, jy + uy * 8.0 - py, RUBY_CORE)
        # Golden Valkyrie wing-barbs on javelin collar
        set_px(jav, jx + ux * 5.0 + px * 2.0, jy + uy * 5.0 + py * 2.0, GOLD_WHITE)
        set_px(jav, jx + ux * 5.0 - px * 2.0, jy + uy * 5.0 - py * 2.0, GOLD_LIGHT)
    else:
        # F11..F22: Blazing Golden Valkyrie Javelin streaking diagonally along (29, 17) -> (46, 36)
        u = min(1.0, (f - 10) / 8.0)
        tip_x = x0 + (x1 - x0) * (0.45 + 0.55 * u)
        tip_y = y0 + (y1 - y0) * (0.45 + 0.55 * u)
        tail_x = max(x0, tip_x - (x1 - x0) * 0.55)
        tail_y = max(y0, tip_y - (y1 - y0) * 0.55)

        # Diagonal golden-crimson contrail along (29, 17) -> (46, 36)
        draw_line_px(jav, x0, y0, tip_x, tip_y, AMBER_FLAME if f % 2 == 0 else RUBY_CORE)
        draw_line_px(jav, tail_x, tail_y, tip_x, tip_y, GOLD_WHITE)
        draw_line_px(jav, tail_x + px, tail_y + py, tip_x + px, tip_y + py, GOLD_BRIGHT)
        draw_line_px(jav, tail_x - px, tail_y - py, tip_x - px, tip_y - py, RUBY_CORE)

        # Winged Golden Javelin Spearhead at (tip_x, tip_y)
        set_px(jav, tip_x, tip_y, GOLD_WHITE)
        set_px(jav, tip_x - ux * 2.0 + px * 2.0, tip_y - uy * 2.0 + py * 2.0, GOLD_WHITE)
        set_px(jav, tip_x - ux * 2.0 - px * 2.0, tip_y - uy * 2.0 - py * 2.0, GOLD_BRIGHT)

        # Diagonal javelin impact star at (45..46, 35..36) on F15..F22 (strictly airborne at y=34..38, NOT ground spikes!)
        if f >= 15:
            for d_r in (-2, -1, 1, 2):
                set_px(jav, min(47, 45 + d_r), 35, GOLD_WHITE if abs(d_r) == 1 else GOLD_BRIGHT)
                set_px(jav, 45, 35 + d_r, RUBY_CORE if abs(d_r) == 2 else GOLD_WHITE)

    return composite_over(canvas, jav)


def build_row7_crouch(tpl):
    """
    Row 7 (`CROUCH` — `VALKYRIE WING-BACKSTEP & GOLDEN JAVELIN THROW`, 30 frames):
    - NO shield halo and ZERO vertical ground spikes at her feet!
    - Freyja beats her Valkyrie wings forward (`wing_span = 1.10`) to **evasively backstep (`dx = -2, dy = -2`)**
      while raising and hurling a **Blazing Golden Valkyrie Javelin aimed diagonally downward
      (`angle = +26°` from `(29, 17)` to `(46, 36)`)**!
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 6:
            # F00..F06: Wing-beat evasive backstep to (dx = -2, dy = -2) & cocking Golden Valkyrie Javelin at (29, 17)
            u = f / 6.0
            dx = -int(round(u * 2.0))
            dy = -int(round(u * 2.0))
            body = make_aerial_valkyrie(
                tpl,
                jump_dy=dy,
                body_tilt_deg=-8.0 * u,
                leg_tuck=0.45 * u,
                wing_span=1.00 + 0.10 * u,
                phase=phase * 2.0,
            )
            body = shift_layer(body, dx=dx, dy=0)
            ang = -10.0 * (1.0 - u) + 26.0 * u
            hx = int(round(30 * (1.0 - u) + 29 * u))
            hy = int(round(24 * (1.0 - u) + 17 * u))
            frame = draw_two_handed_dragon_lance(
                body,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.05 + 0.35 * u,
                scale=1.0,
                shoulder_rear=(21 + dx, 18 + dy),
                shoulder_lead=(27 + dx, 19 + dy),
                phase=phase,
            )
            frames.append(frame)

        elif f <= 21:
            # F07..F21: Airborne evasive backstep (dx = -2, dy = -2, wing_span = 1.10) & hurling Golden Valkyrie Javelin at +26 deg
            k = f - 7  # 0..14
            dx, dy = -2, -2
            body = make_aerial_valkyrie(
                tpl,
                jump_dy=dy,
                body_tilt_deg=-6.0 if k <= 3 else 4.0,
                leg_tuck=0.50,
                wing_span=1.10 + 0.03 * math.sin(k * 0.7),
                phase=phase * 2.5,
            )
            body = shift_layer(body, dx=dx, dy=0)

            # Lead arm aims/follows through along +26 deg from (29, 17)
            frame = draw_two_handed_dragon_lance(
                body,
                hand_x=29,
                hand_y=17,
                angle_deg=26.0,
                glow_intensity=1.45 if k <= 8 else 1.2,
                scale=1.0,
                shoulder_rear=(19, 16),
                shoulder_lead=(25, 17),
                phase=phase * 2.0,
            )
            frame = draw_golden_valkyrie_javelin_throw(frame, f, phase)
            frames.append(frame)

        else:
            # F22..F29: Winged glide return from (dx = -2, dy = -2) back to (0, 0) hover-lancer pose
            k = f - 22  # 0..7
            u = (k + 1) / 8.0
            dx = -int(round((1.0 - u) * 2.0))
            dy = -int(round((1.0 - u) * 2.0))
            body = make_aerial_valkyrie(
                tpl,
                jump_dy=dy,
                body_tilt_deg=4.0 * (1.0 - u),
                leg_tuck=0.50 * (1.0 - u),
                wing_span=1.10 - 0.12 * u,
                phase=phase,
            )
            body = shift_layer(body, dx=dx, dy=0)
            ang = 26.0 * (1.0 - u) + (-10.0) * u
            hx = int(round(29 * (1.0 - u) + 30 * u))
            hy = int(round(17 * (1.0 - u) + 24 * u))
            frame = draw_two_handed_dragon_lance(
                body,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.15 - 0.2 * u,
                scale=1.0,
                shoulder_rear=(21 + dx, 18 + dy),
                shoulder_lead=(27 + dx, 19 + dy),
                phase=phase,
            )
            frames.append(frame)
    return frames


def build_row8_jump(tpl):
    """
    Row 8 (`JUMP` — `HIGH DRAGOON SKY-DIVE IMPALE`, 30 frames):
    - ZERO ground ring during mid-air frames (`F04..F23`)!
    - `F00..F11`: **Skyward Dragoon Rocket-Ascent** (`angle_deg = -82°`, wings folded sleekly upward).
    - `F12..F24`: **Supersonic Diagonal Dragoon Sky-Dive Impale** — Freyja angles her Gungnir War-Lance
      **diagonally downward (`angle_deg = +38°`)** wrapped in a blazing **Crimson-Gold Dragonfire Dive Cone
      (`drill_cone=True`)** plunging into a golden-crimson impact burst on `F25..F29`!
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 3:
            # F00..F03: Rocket-ascent coil & skyward launch (-82 deg)
            crouch_seq = [1, 2, 1, 0]
            d = crouch_seq[f]
            u = f / 3.0
            body = make_crouch_valkyrie(tpl, d) if d > 0 else make_aerial_valkyrie(tpl, jump_dy=-1, leg_tuck=0.35, wing_span=0.82, phase=phase)
            if d > 0:
                body = apply_hair_and_cape_wave(body, phase * 2.0, amplitude=1.4, vertical_flutter=0.5, rune_pulse=0.9)
                body = draw_valkyrie_dragon_wings(
                    body, attach_xy=(20, 17 + d), wing_span=0.85, flap_phase=phase * 2.0, top_min_y=6, bot_max_y=30
                )
            ang = -10.0 * (1.0 - u) + (-82.0) * u
            frame = draw_two_handed_dragon_lance(
                body,
                hand_x=32,
                hand_y=21 + d,
                angle_deg=ang,
                glow_intensity=1.1 + 0.25 * u,
                scale=1.0,
                shoulder_rear=(21, 18 + d),
                shoulder_lead=(27, 19 + d),
                phase=phase,
            )
            frames.append(frame)

        elif f <= 11:
            # F04..F11: Skyward Dragoon Rocket-Ascent (angle_deg = -82 deg, wings folded sleekly upward, ZERO ground ring!)
            k = f - 4  # 0..7
            jump_dy = -2 if k <= 1 else -3
            body = make_aerial_valkyrie(
                tpl,
                jump_dy=jump_dy,
                body_tilt_deg=-6.0,
                leg_tuck=0.65,
                wing_span=0.80 + 0.04 * math.sin(k * 0.6),
                phase=phase * 2.2,
            )
            frame = draw_two_handed_dragon_lance(
                body,
                hand_x=32,
                hand_y=18 + jump_dy,
                angle_deg=-82.0,
                glow_intensity=1.35,
                scale=1.0,
                shoulder_rear=(21, 18 + jump_dy),
                shoulder_lead=(27, 19 + jump_dy),
                phase=phase * 2.2,
            )
            # Mid-air vertical rocket-ascent slipstream streaks strictly in y = 34..40 (NEVER touching ground y >= 43!)
            for s_i, sx_p in enumerate((21, 27, 33)):
                sy_top = 34 + ((k + s_i) % 3)
                draw_line_px(frame, sx_p, sy_top, sx_p, min(40, sy_top + 4), GOLD_WHITE if s_i == 1 else RUBY_CORE)
            frame[42:, :, :] = 0  # Guarantee 100% mid-air clearance on F04..F11
            frames.append(frame)

        elif f <= 24:
            # F12..F24: Supersonic Diagonal Dragoon Sky-Dive Impale (angle_deg = +38 deg, drill_cone=True)
            k = f - 12  # 0..12
            u = k / 12.0
            jump_dy = -3 if k <= 4 else (-2 if k <= 8 else (-1 if k <= 11 else 0))
            body = make_aerial_valkyrie(
                tpl,
                jump_dy=jump_dy,
                body_tilt_deg=14.0,
                leg_tuck=0.75 - 0.35 * u,
                wing_span=1.10,
                phase=phase * 2.8,
            )
            frame = draw_two_handed_dragon_lance(
                body,
                hand_x=34,
                hand_y=20 + jump_dy,
                angle_deg=38.0,
                glow_intensity=1.5,
                scale=1.03,
                shoulder_rear=(22, 18 + jump_dy),
                shoulder_lead=(28, 19 + jump_dy),
                drill_cone=True,
                phase=k * 0.75,
            )
            # Diagonal supersonic dive-cone slipstream lines along +38 deg
            draw_line_px(frame, 29, 14 + jump_dy, 45, 27 + jump_dy, GOLD_WHITE if k % 2 == 0 else GOLD_BRIGHT)
            draw_line_px(frame, 27, 18 + jump_dy, 43, 31 + jump_dy, RUBY_CORE)
            if f <= 23:
                frame[43:, :, :] = 0  # Guarantee ZERO ground ring during mid-air frames F04..F23
            frames.append(frame)

        else:
            # F25..F29: Plunging into a golden-crimson impact burst & recovery
            k = f - 25  # 0..4
            u = k / 4.0
            crouch_d = [3, 2, 1, 1, 0][k]
            body = make_crouch_valkyrie(tpl, crouch_d) if crouch_d > 0 else tpl["stand"].copy()
            body = apply_hair_and_cape_wave(body, phase, amplitude=1.6, vertical_flutter=0.6, rune_pulse=1.0 - 0.2 * u)
            body = draw_valkyrie_dragon_wings(
                body,
                attach_xy=(20, 17 + crouch_d),
                wing_span=1.12 - 0.14 * u,
                flap_phase=phase * 2.0,
                top_min_y=6,
                bot_max_y=32,
            )
            ang = [38.0, 22.0, 6.0, -4.0, -10.0][k]
            frame = draw_two_handed_dragon_lance(
                body,
                hand_x=int(round(34 * (1.0 - u) + 30 * u)),
                hand_y=22 + crouch_d,
                angle_deg=ang,
                glow_intensity=1.4 - 0.35 * u,
                scale=1.0,
                shoulder_rear=(21, 18 + crouch_d),
                shoulder_lead=(27, 19 + crouch_d),
                phase=phase,
            )
            # Golden-crimson Sky-Dive impact burst at (36..47, 36..46) on F25..F27
            if k <= 2:
                cx_imp, cy_imp = 42, 44
                for ray_dx, ray_dy, col_r in [
                    (-6 - k, -4 - k, GOLD_WHITE),
                    (-3 - k, -6 - k, RUBY_CORE),
                    (2 + k, -6 - k, GOLD_WHITE),
                    (4 + k, -3 - k, AMBER_FLAME),
                    (-8 - k, -1, GOLD_BRIGHT),
                    (5, -1, RUBY_BRIGHT),
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
    High-resolution 208x208 aerial Sky-Dragoon star-glint & feather-mote accents specific to Freyja:
    - ZERO shared ground sigils on Rows 3 & 7, and ZERO ground rings or vertical pillars on Rows 4 & 8!
    """
    out = cell_208.copy()
    c_white = GOLD_WHITE
    c_prim = ROSE_FLAME
    c_sec = GOLD_BRIGHT

    def p208(x, y, col):
        ix = int(round(x))
        iy = int(round(y))
        if 8 <= ix <= 199 and 8 <= iy <= 199:
            out[iy, ix] = col

    # Spearhead Star-Glint on Row 2 (AUTO_ATTACK, F04..F07 and F13..F17)
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
        ("ROW 0: IDLE - WINGED HOVER-LANCER (30 FRAMES)", build_row0_idle(tpl)),
        ("ROW 1: WALK - VALHALLA WING-GLIDE (30 FRAMES)", build_row1_walk(tpl)),
        ("ROW 2: AUTO_ATTACK - TRIPLE IMPALE & HALBERD LAUNCHER (30 FRAMES)", build_row2_auto_attack(tpl)),
        ("ROW 3: SKILL - WYVERN CORKSCREW DRILL-CHARGE (30 FRAMES)", build_row3_skill(tpl)),
        ("ROW 4: ULTIMATE - BAHAMUT ASCENSION & 10-SPEAR RAIN (30 FRAMES)", build_row4_ultimate(tpl)),
        ("ROW 5: DEATH - WINGED VALKYRIE COLLAPSE (30 FRAMES)", build_row5_death(tpl)),
        ("ROW 6: DASH - VALKYRIE SKY-JET FLIGHT (30 FRAMES)", build_row6_dash(tpl)),
        ("ROW 7: CROUCH - WING-BACKSTEP & GOLDEN JAVELIN THROW (30 FRAMES)", build_row7_crouch(tpl)),
        ("ROW 8: JUMP - HIGH DRAGOON SKY-DIVE IMPALE (30 FRAMES)", build_row8_jump(tpl)),
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
            # Verify 0 interior 4-neighbor pinholes on 52x52 logical cell
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
