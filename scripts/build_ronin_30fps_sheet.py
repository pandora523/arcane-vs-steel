#!/usr/bin/env python3
"""
Builds Kaze-Maru's (Ronin - Storm-Blade Iaido Master) 30-Frame-Per-Animation HD-2D Sprite Sheet:
- 9 rows x 30 columns = 270 unique frames (6240 x 1872 at 208x208 per cell, 52x52 logical upscaled 4x NEAREST):
  * Row 0: IDLE - LOW COILED IAIDO / WAKIGAMAE STANCE (30 frames)
  * Row 1: WALK - LOW GLIDING SAMURAI SURIASHI FOOTWORK (30 frames)
  * Row 2: AUTO_ATTACK - 3-HIT SANDAN KENDO & IAIDO DRAW-CUT COMBO (30 frames)
  * Row 3: SKILL - ZANTETSUKEN 5-FOLD LIGHTNING ZIG-ZAG & SHEATH CLICK (30 frames)
  * Row 4: ULTIMATE - SUSANOO OMNISLASH STORM (30 frames)
  * Row 5: DEATH & HURT (30 frames)
  * Row 6: DASH - SHUNPO LIGHTNING STEP (30 frames)
  * Row 7: CROUCH - IAIDO SERENE MIND COUNTER-BLINK (30 frames)
  * Row 8: JUMP - TSUBAME GAESHI DOUBLE AIR-SLASH (30 frames)
- 100% Unique Samurai / Iaido Master Silhouette & Animation Set:
  * NO European left-billowing cape (stripped at x < 19, y = 18..40).
  * Waist-Worn Lacquered Katana Scabbard (`Saya`) with Golden `Koiguchi`/`Kojiri` Fittings & Flowing Violet-Cyan `Sageo` Cord (`x = 7..21, y = 26..33`).
  * Floating Ring of 5 Raijin Taiko Thunder-Drums (`Tomoe` drums linked by crackling cyan-violet lightning) hovering behind his shoulders (`cx = 23, cy = 16, rx = 10, ry = 7`).
  * Strictly ONE Two-Handed Thunder-Odachi Great-Katana per frame gripped by BOTH hands via 2-bone IK arms.
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

    out = fill_layer_pinholes(out, lo, hi, lo, hi, require_3_neighbors=True)
    out = fill_layer_pinholes(out, lo, hi, lo, hi, require_3_neighbors=True)

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


def draw_samurai_saya_and_raijin_drums(
    canvas,
    dy_offset=0,
    phase=0.0,
    sageo_wave=1.0,
    show_drums=True,
    koiguchi_glint=0.0,
):
    """
    Renders Kaze-Maru's two iconic Samurai silhouette features (replacing the old left-billowing cape):
    a) Floating Ring of 5 Raijin Taiko Thunder-Drums (`Tomoe` drums linked by crackling cyan-violet lightning)
       hovering behind his shoulders (`cx = 23, cy = 16 + dy_offset, rx = 10, ry = 7`), drawn BEHIND the torso
       so his crescent kabuto & silver topknot mane pop cleanly in front!
    b) Waist-Worn Lacquered Katana Scabbard (`Saya`) with Golden `Koiguchi`/`Kojiri` Fittings & Flowing
       Violet-Cyan `Sageo` Cord extending diagonally behind his left hip (`x = 7..21, y = 26..33`).
    """
    bg_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    fg_saya = np.zeros((52, 52, 4), dtype=np.uint8)

    # --- (b) Floating Ring of 5 Raijin Taiko Thunder-Drums behind shoulders ---
    if show_drums:
        cx = 23.0
        cy = 16.0 + dy_offset
        rx = 10.0
        ry = 7.0
        wobble = math.sin(phase) * 0.08
        drum_angles_deg = [-172.0, -134.0, -92.0, -48.0, -10.0]
        drum_centers = []
        for idx, a_deg in enumerate(drum_angles_deg):
            ang = math.radians(a_deg) + wobble * (1 if idx % 2 == 0 else -1)
            dx = cx + math.cos(ang) * rx
            dy = cy + math.sin(ang) * ry
            drum_centers.append((dx, dy))

        # Crackling cyan-violet lightning arcs linking the 5 Taiko drums around the ring
        for i in range(len(drum_centers) - 1):
            x0, y0 = drum_centers[i]
            x1, y1 = drum_centers[i + 1]
            mx = 0.5 * (x0 + x1) + math.cos(phase + i) * 0.8
            my = 0.5 * (y0 + y1) - 0.8 + math.sin(phase * 2.0 + i) * 0.6
            col_arc1 = CYAN_BRIGHT if (i + int(round(phase * 2))) % 2 == 0 else VIOLET_BRIGHT
            col_arc2 = VIOLET_GLOW if col_arc1 == CYAN_BRIGHT else CYAN_LIGHT
            draw_line_px(bg_layer, x0, y0, mx, my, col_arc1)
            draw_line_px(bg_layer, mx, my, x1, y1, col_arc2)

        # Render each 3x3 Raijin Taiko Drum with golden-brass rim and glowing Tomoe core
        for idx, (dx, dy) in enumerate(drum_centers):
            ix, iy = int(round(dx)), int(round(dy))
            for oy in (-1, 0, 1):
                for ox in (-1, 0, 1):
                    if ox == 0 and oy == 0:
                        col_d = DIAMOND_WHITE if (idx + int(round(phase * 3))) % 2 == 0 else CYAN_LIGHT
                    elif abs(ox) + abs(oy) == 1:
                        col_d = BRASS_BRIGHT if (ox + oy + idx) % 2 == 0 else INDIGO_DEEP
                    else:
                        col_d = BRASS_MID
                    set_px(bg_layer, ix + ox, iy + oy, col_d)

    # --- (a) Waist-Worn Lacquered Katana Scabbard (`Saya`) & Flowing `Sageo` Cord (x = 7..21, y = 26..33) ---
    # Extending diagonally from left waist koiguchi (21, 26 + dy_offset) to kojiri chape (7, 32 + dy_offset)
    kx0, ky0 = 21.0, 26.0 + dy_offset
    kx1, ky1 = 7.0, 32.0 + dy_offset
    steps = 28
    for i in range(steps + 1):
        u = i / float(steps)
        # Subtle curved katana sori profile along the scabbard
        sori = math.sin(u * math.pi) * 0.75
        sx = kx0 + (kx1 - kx0) * u
        sy = ky0 + (ky1 - ky0) * u - sori

        if u <= 0.12:
            # Golden Koiguchi (scabbard mouth collar) at x = 20..21
            c_top = GOLD_WHITE
            c_mid = BRASS_BRIGHT
            c_bot = BRASS_MID
        elif u >= 0.88:
            # Golden Kojiri (scabbard tip chape) at x = 7..8
            c_top = GOLD_WHITE if u >= 0.94 else BRASS_BRIGHT
            c_mid = BRASS_BRIGHT
            c_bot = BRASS_DARK
        elif 0.26 <= u <= 0.34:
            # Golden Kurikata (cord attachment fitting) near x = 16..17
            c_top = BRASS_BRIGHT
            c_mid = GOLD_WHITE
            c_bot = INDIGO_DEEP
        else:
            # Lacquered deep indigo-violet saya with electric-cyan urushi lacquer stripe
            c_top = INDIGO_DEEP
            c_mid = CYAN_MID if (i % 5 == 0) else CAPE_MID
            c_bot = CAPE_DEEP

        target = fg_saya if u <= 0.25 else bg_layer
        set_px(target, sx, sy - 0.5, c_top)
        set_px(target, sx, sy, c_mid)
        set_px(target, sx, sy + 0.6, c_bot)

    # Flowing Violet-Cyan Sageo Cord hanging and waving from Kurikata (x = 16, y = 28 + dy_offset)
    cord_x0 = 16.0
    cord_y0 = 28.0 + dy_offset
    for c_step in range(1, 7):
        u_c = c_step / 6.0
        sway = math.sin(phase - u_c * 2.4) * (1.6 * u_c * sageo_wave)
        cx_p = cord_x0 - u_c * 2.5 + sway
        cy_p = cord_y0 + c_step * 0.85
        col_c = CYAN_LIGHT if c_step % 2 == 0 else VIOLET_BRIGHT
        set_px(bg_layer, cx_p, cy_p, col_c)
        set_px(bg_layer, cx_p + 0.7, cy_p, VIOLET_GLOW if c_step % 2 == 0 else INDIGO_MID)

    # Optional bright Battoujutsu / Noto glint at the hip Koiguchi (x = 21..23, y = 26 + dy_offset)
    if koiguchi_glint > 0.15:
        gx, gy = 22, int(round(26 + dy_offset))
        set_px(fg_saya, gx, gy, DIAMOND_WHITE)
        r_g = 2 if koiguchi_glint < 0.7 else 3
        for d in range(1, r_g + 1):
            col_g = DIAMOND_WHITE if d == 1 else CYAN_LIGHT
            set_px(fg_saya, gx + d, gy, col_g)
            set_px(fg_saya, gx - d, gy, col_g)
            set_px(fg_saya, gx, gy + d, col_g)
            set_px(fg_saya, gx, gy - d, col_g)

    out = composite_over(bg_layer, canvas)
    out = composite_over(out, fg_saya)
    return out


def extract_clean_base_sprite(
    path="/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/4f1fb80f-a88f-4496-9746-b4b9fe84f6d4/ronin_v1_base_1794151225087.jpg",
):
    """
    Loads `ronin_v1_base_1794151225087.jpg` (1024x1024), performs a BFS flood-fill from all 4 image borders
    to strip the white background + 3-pass anti-aliased fringe (ZERO white halo!), crops tight character bounds,
    scales cleanly into the 52x52 logical cell (`y = 5..45`, boots planted firmly at `y = 45`),
    and strips the large left-billowing cape (`x < 19, y = 18..40`) so Kaze-Maru has a 100% distinct
    Samurai silhouette (crescent kabuto, silver topknot mane, glowing cyan eyes, indigo-violet `do` breastplate,
    waist `obi`, and `kusazuri` hip tassets) with ZERO shared cape silhouette!
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

    # Strip the large European left-billowing cape (x < 19, y = 16..41) so Kaze-Maru has a pure Samurai silhouette!
    cell[16:18, :18] = 0
    cell[18:41, :19] = 0
    cell[29:38, :20] = 0

    # Plant right boot (x=29..37, y=38..44) down +1px so BOTH boots plant firmly on y=45
    # while duplicating row 38 so zero horizontal slit opens at y=38!
    right_boot = cell[38:45, 29:38].copy()
    cell[39:46, 29:38] = right_boot
    cell[38, 29:38] = right_boot[0, :]

    return fill_layer_pinholes(cell)


def neutralize_baked_side_arms(tpl_img, max_chest_x=31):
    """
    Neutralizes/strips the lowered static side-arms on Kaze-Maru's torso so the two-handed
    2-bone IK arms gripping the Thunder-Odachi are 100% cleanly visible with ZERO extra limbs or side fists,
    and ensures the left torso/hip edge (x = 19..22) is crisp dark indigo Samurai `do` armor.
    """
    out = tpl_img.copy()
    # 1. Ensure left cape area stays stripped
    out[18:41, :19] = 0
    out[29:38, :20] = 0

    # 2. Strip protruding lowered right arm & fist (y = 17..28, x > max_chest_x)
    for y in range(17, 29):
        lim_x = max_chest_x + 1 if y <= 18 else max_chest_x
        for x in range(lim_x + 1, 50):
            out[y, x] = (0, 0, 0, 0)

    # 3. Neutralize lowered left forearm & fist (y = 20..28, x = 19..23) into clean dark indigo torso armor
    for y in range(20, 29):
        for x in range(19, 24):
            if out[y, x, 3] > 0:
                if x <= 20:
                    out[y, x] = INDIGO_DEEP
                elif x == 21:
                    out[y, x] = INDIGO_DARK if (x + y) % 2 == 0 else INDIGO_DEEP
                else:
                    out[y, x] = INDIGO_MID if (x + y) % 2 == 0 else INDIGO_DARK

    # Ensure clean right chestplate border at x = max_chest_x (y = 19..27)
    for y in range(19, 28):
        if out[y, max_chest_x, 3] > 0:
            out[y, max_chest_x] = INDIGO_DEEP

    return fill_layer_pinholes(out)


def make_clean_templates():
    """
    Constructs Kaze-Maru's modular anatomical templates from the clean 52x52 cape-free Samurai base sprite:
    - `stand`: full standing storm-samurai with static lowered side-arms neutralized and boots planted at y=45
    - `stand_upper`: upper body, kabuto, & kusazuri hip tassets (`y = 0..34`)
    - `leg_back` (`leg_near`) and `leg_front` (`leg_far`): lower suneate shin-greaves & war-boots at `y = 38..46`
    - `lunge`: forward-leaning Kendo lunge body (+2px upper-body lean) with static arms neutralized
    - `kneel`: dropped to one knee (`y + 6px`) with static arms neutralized
    - `fall`: 90-degree horizontally collapsed prone samurai on the floor (`y = 35..46`)
    - `dash`: forward-tilted (+14 deg) Shunpo flash-step body with streaming silver topknot mane
    """
    raw = extract_clean_base_sprite()
    stand = neutralize_baked_side_arms(raw, max_chest_x=31)

    leg_back_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_front_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_back_patch[38:47, 19:27] = stand[38:47, 19:27]
    leg_front_patch[38:47, 29:38] = stand[38:47, 29:38]

    stand_upper = np.zeros((52, 52, 4), dtype=np.uint8)
    stand_upper[:36, :] = stand[:36, :]
    stand_upper = fill_layer_pinholes(stand_upper)

    # Forward-leaning Kendo lunge body (+2px upper-body lean)
    lunge = np.zeros((52, 52, 4), dtype=np.uint8)
    lunge[32:46, :] = stand[32:46, :]
    for y in range(5, 32):
        dx = 2 if y <= 25 else 1
        for x in range(12, 48):
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
            for x in range(12, 46):
                if stand[y, x, 3] > 0:
                    kneel[ny, x] = stand[y, x]
    kneel = neutralize_baked_side_arms(kneel, max_chest_x=31)
    kneel = fill_layer_pinholes(kneel)

    # Horizontally collapsed prone body (90-degree rotated flat on the floor at y=35..46)
    body_no_cape = stand.copy()
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
            col_bot = int(col_ys.max())
            target_bot = 46 if (10 <= nx <= 40) else 45
            dy_col = target_bot - col_bot
            for y in col_ys:
                ny = max(35, min(46, y + dy_col))
                fall[ny, nx] = rot_90[y, x]
    fall = fill_layer_pinholes(fall, x0=5, x1=46, y0=34, y1=47, require_3_neighbors=False)

    # Dash body (+14 deg forward Shunpo flash-step tilt)
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


def _extract_full_haori_cape(
    stand,
    dy_offset=0,
    phase=0.0,
    wave_scale=1.0,
    lift_y=0,
    show_drums=True,
    koiguchi_glint=0.0,
):
    """
    Replaces the old left-billowing cape extraction with Kaze-Maru's pure Samurai back/hip features:
    - Floating Ring of 5 Raijin Taiko Thunder-Drums (`cx = 23, cy = 16 + dy_offset, rx = 10, ry = 7`)
    - Waist-Worn Lacquered Katana Scabbard (`Saya`) with Golden `Koiguchi`/`Kojiri` Fittings & Flowing
      Violet-Cyan `Sageo` Cord (`x = 7..21, y = 26..33`).
    """
    empty = np.zeros((52, 52, 4), dtype=np.uint8)
    return draw_samurai_saya_and_raijin_drums(
        empty,
        dy_offset=dy_offset,
        phase=phase,
        sageo_wave=wave_scale,
        show_drums=show_drums,
        koiguchi_glint=koiguchi_glint,
    )


def apply_cape_and_mane_wave(
    frame,
    phase_rad,
    amplitude=1.5,
    vertical_flutter=0.6,
    is_dash=False,
    rune_pulse=0.6,
    dy_offset=0,
    show_drums=True,
    koiguchi_glint=0.0,
):
    """
    Animates Kaze-Maru's:
    1. Flowing silver kabuto topknot horsehair mane (`x = 12..24, y = 6..14`)
    2. Pulsing electric-cyan & violet armor lightning runes & glowing cyan kabuto eyes (`y = 10..34, x = 22..32`)
    3. Waist-worn lacquered Katana Scabbard (`Saya`) + flowing `Sageo` cord (`x = 7..21, y = 26..33`)
       and Floating Ring of 5 Raijin Taiko Thunder-Drums behind his shoulders (`cx = 23, cy = 16, rx = 10, ry = 7`).
    """
    out = frame.copy()

    # 1. Silver Kabuto Topknot Mane Wave (x = 12..24, y = 6..15)
    mane_mask = np.zeros((52, 52), dtype=bool)
    for y in range(6, 16):
        for x in range(12, 25):
            if out[y, x, 3] > 0:
                r, g, b, _ = out[y, x]
                if r > 120 and g > 120 and b > 135:
                    mane_mask[y, x] = True

    mane_src = out.copy()
    out[mane_mask] = 0
    for y in range(6, 16):
        for x in range(12, 25):
            if not mane_mask[y, x]:
                continue
            u_m = max(0.0, (24 - x) / 11.0)
            m_dy = int(round(math.sin(phase_rad - u_m * 2.5) * (0.85 * u_m)))
            ny = max(4, min(16, y + m_dy))
            out[ny, x] = mane_src[y, x]
            if u_m < 0.35 and out[y, x, 3] == 0:
                out[y, x] = mane_src[y, x]

    # 2. Pulsing Electric-Cyan Kabuto Eyes & Armor Lightning Runes (y = 10..35, x = 22..33)
    for y in range(10, 36):
        for x in range(22, 34):
            if out[y, x, 3] == 0:
                continue
            r, g, b, _ = out[y, x]
            if g > 175 and b > 205:
                if rune_pulse > 0.78:
                    out[y, x] = DIAMOND_WHITE if (x + y) % 2 == 0 else CYAN_LIGHT
                elif rune_pulse > 0.45:
                    out[y, x] = CYAN_LIGHT if (x + y) % 2 == 0 else CYAN_BRIGHT
                else:
                    out[y, x] = CYAN_BRIGHT if (x + y) % 2 == 0 else VIOLET_BRIGHT

    # 3. Composite the 5-Drum Raijin Taiko Ring behind shoulders + Waist-Worn Lacquered Saya & Sageo Cord
    out = draw_samurai_saya_and_raijin_drums(
        out,
        dy_offset=dy_offset,
        phase=phase_rad,
        sageo_wave=amplitude / 1.4,
        show_drums=show_drums,
        koiguchi_glint=koiguchi_glint,
    )
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
        for off, col in [
            (-1.0, INDIGO_DEEP),
            (-0.4, INDIGO_DARK),
            (0.0, INDIGO_MID),
            (0.5, VIOLET_DEEP),
            (1.0, INDIGO_DEEP),
        ]:
            draw_line_px(layer, sx + n1x * off, sy + n1y * off, ex + n1x * (off * 0.85), ey + n1y * (off * 0.85), col)

        for off, col in [
            (-1.0, INDIGO_DEEP),
            (-0.4, INDIGO_MID),
            (0.0, CYAN_MID),
            (0.5, INDIGO_LIGHT),
            (1.0, INDIGO_DARK),
        ]:
            draw_line_px(layer, ex + n2x * off, ey + n2y * off, hx + n2x * (off * 0.85), hy + n2y * (off * 0.85), col)

        for dy_s in (-1, 0, 1):
            for dx_s in (-1, 0, 1):
                set_px(layer, sx + dx_s, sy + dy_s, INDIGO_LIGHT if dy_s <= 0 else INDIGO_DARK)
        set_px(layer, ex, ey, CYAN_BRIGHT)
    else:
        for off, col in [
            (-1.15, INDIGO_DEEP),
            (-0.5, INDIGO_MID),
            (0.0, INDIGO_LIGHT),
            (0.55, VIOLET_GLOW),
            (1.15, INDIGO_DARK),
        ]:
            draw_line_px(layer, sx + n1x * off, sy + n1y * off, ex + n1x * (off * 0.85), ey + n1y * (off * 0.85), col)

        for off, col in [
            (-1.15, INDIGO_DEEP),
            (-0.5, INDIGO_MID),
            (0.0, CYAN_BRIGHT),
            (0.55, INDIGO_LIGHT),
            (1.15, INDIGO_DARK),
        ]:
            draw_line_px(layer, ex + n2x * off, ey + n2y * off, hx + n2x * (off * 0.85), hy + n2y * (off * 0.85), col)

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

        set_px(layer, ex, ey, CYAN_LIGHT)
        set_px(layer, ex + n1x * 0.7, ey + n1y * 0.7, INDIGO_LIGHT)

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
    - Rigidly translates the Odachi if the blade tip (`kissaki`) or pommel approaches `[4..47.5, 4..46]`
      so the `~22px` Odachi is NEVER foreshortened and NEVER clips outside `2 <= x <= 49, 2 <= y <= 49`.
    """
    rear_arm_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    odachi_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    rear_gauntlet_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    lead_arm_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    fx_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    rad = math.radians(angle_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    px, py = -uy, ux

    eff_blade = float(blade_len) * scale
    grip_sep = 3.6 * min(1.0, scale)

    lead_gx = float(hand_x)
    lead_gy = float(hand_y)
    rear_gx = lead_gx - ux * grip_sep
    rear_gy = lead_gy - uy * grip_sep

    pom_x = rear_gx - ux * 1.2
    pom_y = rear_gy - uy * 1.2
    tsuba_x = lead_gx + ux * 1.3
    tsuba_y = lead_gy + uy * 1.3

    sori_sign = -1.0 if math.cos(rad) >= -0.2 else 1.0
    tip_x = tsuba_x + ux * eff_blade + px * (1.3 * sori_sign)
    tip_y = tsuba_y + uy * eff_blade + py * (1.3 * sori_sign)

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

    # 1. 5px Wrapped Tsuka Hilt
    hilt_steps = 14
    for i in range(hilt_steps + 1):
        u_h = i / float(hilt_steps)
        hx_p = pom_x + (tsuba_x - pom_x) * u_h
        hy_p = pom_y + (tsuba_y - pom_y) * u_h
        if i <= 2:
            c_hilt = GOLD_WHITE if i == 0 else BRASS_BRIGHT
        elif i % 3 == 1:
            c_hilt = BRASS_BRIGHT if i % 2 == 0 else CYAN_LIGHT
        else:
            c_hilt = INDIGO_DARK
        set_px(odachi_layer, hx_p, hy_p, c_hilt)
        set_px(odachi_layer, hx_p + px * 0.55, hy_p + py * 0.55, INDIGO_DEEP)
        set_px(odachi_layer, hx_p - px * 0.55, hy_p - py * 0.55, INDIGO_MID)

    # 2. Ornate Circular Brass-and-Cyan Raijin Tsuba Guard
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
    hab_x = tsuba_x + ux * 0.9
    hab_y = tsuba_y + uy * 0.9
    set_px(odachi_layer, hab_x, hab_y, GOLD_WHITE)
    set_px(odachi_layer, hab_x + px * 0.6, hab_y + py * 0.6, BRASS_BRIGHT)

    # 3. Curved 17px Electric Indigo-Cyan & Diamond-White Odachi Katana Blade with Lightning Hamon
    blade_steps = int(round(eff_blade * 3.0))
    for i in range(2, blade_steps + 1):
        u_b = i / float(blade_steps)
        sori_curve = (math.sin(u_b * math.pi * 0.85) * 1.15 + (u_b * u_b) * 0.55) * sori_sign
        bx = tsuba_x + ux * (u_b * eff_blade) + px * sori_curve
        by = tsuba_y + uy * (u_b * eff_blade) + py * sori_curve

        edge_vx = px * sori_sign
        edge_vy = py * sori_sign

        if u_b > 0.88:
            set_px(odachi_layer, bx, by, DIAMOND_WHITE)
            set_px(odachi_layer, bx + edge_vx * 0.5, by + edge_vy * 0.5, CYAN_LIGHT)
        else:
            set_px(
                odachi_layer,
                bx - edge_vx * 0.75,
                by - edge_vy * 0.75,
                INDIGO_MID if (i % 4 == 0) else INDIGO_DARK,
            )
            hamon_wave = ((i + int(round(phase * 3.0))) % 4 == 0)
            c_hamon = (
                DIAMOND_WHITE
                if (hamon_wave and glow_intensity >= 1.1)
                else (CYAN_BRIGHT if (i % 2 == 0) else VIOLET_BRIGHT)
            )
            set_px(odachi_layer, bx, by, c_hamon)
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

    # 5. BOTH Rear IK Arm AND Lead IK Arm
    if draw_arms and rear_shoulder is not None and lead_shoulder is not None:
        sx_r, sy_r = float(rear_shoulder[0]), float(rear_shoulder[1])
        sx_l, sy_l = float(lead_shoulder[0]), float(lead_shoulder[1])

        draw_ik_ronin_arm(
            rear_arm_layer,
            sx_r,
            sy_r,
            rear_gx,
            rear_gy,
            L1=6.2,
            L2=5.8,
            bend_side=1.0,
            is_rear=True,
        )
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
            set_px(fx_layer, ax, ay, DIAMOND_WHITE if u_a > 0.45 else CYAN_LIGHT)
            set_px(
                fx_layer,
                max(4.0, min(47.5, ax - ca * 1.2)),
                max(4.0, min(46.0, ay - sa * 1.2)),
                CYAN_BRIGHT if (k % 3 != 0) else DIAMOND_WHITE,
            )
            if env > 0.38:
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

    out = composite_over(canvas, rear_arm_layer)
    out = composite_over(out, odachi_layer)
    if angle_deg < -88.0:
        for yh in range(5, 16):
            for xh in range(23, 33):
                if canvas[yh, xh, 3] > 0:
                    out[yh, xh] = canvas[yh, xh]
    out = composite_over(out, rear_gauntlet_layer)
    out = composite_over(out, lead_arm_layer)
    out = composite_over(out, fx_layer)
    return out


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
    Row 1 helper: Smooth 30-frame 2-step Suriashi gliding Samurai stride cycle (F00..F14 Step A, F15..F29 Step B)
    preserving Kaze-Maru's 5-Drum Raijin Ring, waist Saya scabbard, waist obi & kusazuri hip tassets (`y = 0..34`),
    and articulated suneate greaves & war-boots!
    """
    phase = (f / 30.0) * 2.0 * math.pi
    bob_y = int(round(math.cos(phase * 2.0) * 1.0))

    stand = tpl["stand"].copy()
    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    tasset_overlay = np.zeros((52, 52, 4), dtype=np.uint8)

    # Upper Torso, Crescent Kabuto, Silver Mane, Obi & Kusazuri Hip Tassets (`y = 0..34`)
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

        knee_lift = max(0.0, c_val) * 0.75  # Low gliding Suriashi footwork
        hip_y = 33.0 + bob_y
        knee_x = hip_x + s_val * 2.6 + knee_lift * 1.1
        knee_y = hip_y + 4.9 - knee_lift * 1.4

        foot_target_x = foot_base_x + s_val * 3.2 - knee_lift * 0.6
        foot_lift_dy = bob_y - int(round(knee_lift * 1.6))
        boot_rot_deg = s_val * 8.0 - knee_lift * 9.0

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

    out = composite_over(far_leg, torso_layer)
    out = composite_over(out, near_leg)
    out = composite_over(out, tasset_overlay)
    out = apply_cape_and_mane_wave(
        out, phase, amplitude=1.4, vertical_flutter=0.5, rune_pulse=0.7, dy_offset=bob_y
    )
    return fill_layer_pinholes(out)


def make_crouch_ronin(tpl, crouch_depth):
    """
    Constructs Kaze-Maru's deep knee-bend Iai-Goshi samurai crouch via a continuous vertical compression warp on `tpl['stand']`:
    - Shifts `ny <= 27 + d` down by `d`
    - Compresses `ny = 28 + d .. 43` from `sy = 27 .. 43` with a 1px forward knee bend
    - Keeps his war-boots anchored firmly on the ground at `ny = 44..49`.
    """
    stand = tpl["stand"]
    d = max(0, min(6, int(round(crouch_depth))))
    if d <= 0:
        return stand.copy()

    canvas = np.zeros((52, 52, 4), dtype=np.uint8)

    for ny in range(d, 28 + d):
        sy = ny - d
        if 0 <= sy <= 27 and 2 <= ny <= 49:
            canvas[ny, :] = stand[sy, :]

    span = max(1.0, float(43 - (28 + d)))
    for ny in range(28 + d, 44):
        u = (ny - (28 + d)) / span
        sy = int(round(27.0 + u * 16.0))
        sy = max(27, min(43, sy))
        knee_dx = 1 if (d >= 2 and 0.25 <= u <= 0.75) else 0
        for x in range(18, 50):
            if stand[sy, x, 3] > 0:
                nx = min(49, x + knee_dx)
                canvas[ny, nx] = stand[sy, x]

    for ny in range(44, 50):
        canvas[ny, :] = stand[ny, :]

    return fill_layer_pinholes(canvas)


def make_aerial_ronin(tpl, jump_dy, body_tilt_deg=0.0, leg_tuck=0.65, thruster_intensity=0.6, phase=0.0):
    """
    Row 8 helper: Constructs a full-body airborne Kaze-Maru posture with tucked knees,
    5-Drum Raijin Ring, waist Saya scabbard, and ZERO ground circle!
    """
    stand = tpl["stand"].copy()
    dy_i = max(-5, min(2, int(round(jump_dy))))
    t = max(0.0, min(1.0, leg_tuck))

    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    tasset_overlay = np.zeros((52, 52, 4), dtype=np.uint8)

    lean_dx = 1 if body_tilt_deg > 5.0 else (-1 if body_tilt_deg < -5.0 else 0)
    for y in range(0, 35):
        ny = max(3, min(46, y + dy_i))
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
        knee_dx=-1.0 - 1.2 * t,
        knee_dy=4.0 - 2.0 * t,
        foot_dx=-0.8 - 1.2 * t,
        foot_dy=dy_i - 3.2 * t,
        boot_rot_deg=-12.0 * t,
        is_far_leg=True,
    )
    near_leg = build_aerial_leg(
        tpl["leg_front"],
        orig_cx=33.0,
        hip_x=30.5,
        knee_dx=1.4 + 1.4 * t,
        knee_dy=3.8 - 2.4 * t,
        foot_dx=0.2 + 1.0 * t,
        foot_dy=dy_i - 3.8 * t,
        boot_rot_deg=-16.0 * t,
        is_far_leg=False,
    )

    out = composite_over(far_leg, torso_layer)
    out = composite_over(out, near_leg)
    out = composite_over(out, tasset_overlay)
    out = apply_cape_and_mane_wave(
        out, phase, amplitude=1.5, vertical_flutter=0.6, rune_pulse=0.95, dy_offset=dy_i
    )
    return fill_layer_pinholes(out)


def build_row0_idle(tpl):
    """
    Row 0 (`IDLE` - Low Coiled Iaido / Wakigamae Stance, 0..29):
    - Instead of holding the blade up at `-48°` like Warrior, Kaze-Maru holds his curved Odachi
      **low and nearly horizontal near his hip scabbard (`hand_x = 29, hand_y = 26 + breath_dy, angle_deg = -10° + 3° * sin(phase)`)**,
      poised for an instant Battoujutsu draw-cut with cyan lightning arcing between his blade and waist scabbard!
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
        glint = 0.45 if (f % 6 in (0, 1)) else 0.0
        base = apply_cape_and_mane_wave(
            base,
            phase,
            amplitude=1.4,
            vertical_flutter=0.5,
            rune_pulse=pulse,
            dy_offset=breath_dy,
            koiguchi_glint=glint,
        )

        # Low Coiled Iaido / Wakigamae Stance near his hip scabbard
        odachi_ang = -10.0 + 3.0 * math.sin(phase)
        hx = 29
        hy = 26 + breath_dy
        frame = draw_two_handed_odachi(
            base,
            hand_x=hx,
            hand_y=hy,
            angle_deg=odachi_ang,
            glow_intensity=0.95 + 0.25 * math.sin(phase),
            scale=1.0,
            blade_len=17.0,
            rear_shoulder=(21, 18 + breath_dy),
            lead_shoulder=(27, 19 + breath_dy),
            draw_arms=True,
            phase=phase,
        )

        # Crackling cyan-violet lightning arcing between his waist Saya koiguchi (21, 26) and the low Odachi blade (35..44, 24..26)
        arc_x0, arc_y0 = 21, 26 + breath_dy
        arc_x1 = 35 + (f % 8)
        arc_y1 = 25 + breath_dy - int(round(math.sin(phase) * 1.0))
        mid_x = (arc_x0 + arc_x1) // 2
        mid_y = arc_y0 - 2 + ((f // 2) % 3)
        draw_line_px(frame, arc_x0, arc_y0, mid_x, mid_y, CYAN_LIGHT if f % 2 == 0 else VIOLET_BRIGHT)
        draw_line_px(frame, mid_x, mid_y, arc_x1, arc_y1, DIAMOND_WHITE if f % 3 == 0 else CYAN_BRIGHT)

        frames.append(frame)
    return frames


def build_row1_walk(tpl):
    """
    Row 1 (`WALK` - Low Gliding Samurai Suriashi Footwork, 30..59):
    - Kaze-Maru glides forward with his Odachi held in a **Low Trailing Side-Guard
      (`hand_x = 28, hand_y = 27 + bob_y, angle_deg = +14° + 6° * sin(phase)`)** —
      completely distinct from every other character!
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        body = render_walk_ronin(tpl, f)
        bob_y = int(round(math.cos(phase * 2.0) * 1.0))

        odachi_ang = 14.0 + 6.0 * math.sin(phase)
        hx = 28
        hy = 27 + bob_y

        frame = draw_two_handed_odachi(
            body,
            hand_x=hx,
            hand_y=hy,
            angle_deg=odachi_ang,
            glow_intensity=0.95 + 0.2 * math.sin(phase * 2.0),
            scale=1.0,
            blade_len=16.5,
            rear_shoulder=(21, 18 + bob_y),
            lead_shoulder=(27, 19 + bob_y),
            draw_arms=True,
            phase=phase,
        )

        # Subtle Suriashi static-lightning sparks trailing from his gliding tabi boots
        if 6 <= f <= 10:
            k = f - 6
            set_px(frame, 33 - k, 45, CYAN_LIGHT if k % 2 == 0 else VIOLET_BRIGHT)
            set_px(frame, 31 - k, 44, DIAMOND_WHITE if k == 1 else CYAN_BRIGHT)
        elif 21 <= f <= 25:
            k = f - 21
            set_px(frame, 21 - k, 45, CYAN_LIGHT if k % 2 == 0 else VIOLET_BRIGHT)
            set_px(frame, 19 - k, 44, DIAMOND_WHITE if k == 1 else VIOLET_BRIGHT)

        frames.append(frame)
    return frames


def build_row2_auto_attack(tpl):
    """
    Row 2 (`AUTO_ATTACK` - 3-Hit Sandan Kendo & Iaido Draw-Cut Combo, 60..89):
    - `F00..F09`: Coiled hip-sheath windup (`F00..F03`) -> blinding horizontal **Battoujutsu Draw-Cut (`angle_deg = -6°`)**
      with a horizontal cyan-white slash streak across `y = 24..28` (`F04..F09`).
    - `F10..F19`: Rising diagonal **Kiriage Upper-Slash (`angle_deg` sweeping from `+35°` up to `-65°`)**.
    - `F20..F29`: **Iaido Judgment-Cut X-Slash** (`cross_slash_arc` + twin diagonal X-cut lines across `x = 28..47, y = 10..40`)
      and smooth return to the `-10°` hip Iaido stance.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi

        if f <= 3:
            # F00..F03: Coiled hip-sheath Battoujutsu windup at left waist koiguchi
            crouch_d = [1, 2, 3, 3][f]
            base = make_crouch_ronin(tpl, crouch_d)
            base = apply_cape_and_mane_wave(
                base,
                phase * 1.5,
                amplitude=1.4,
                rune_pulse=0.85,
                dy_offset=crouch_d,
                koiguchi_glint=0.9,
            )
            ang_seq = [-6.0, 2.0, 8.0, 12.0]
            hx_seq = [28, 26, 25, 24]
            hy_seq = [26 + crouch_d, 26 + crouch_d, 26 + crouch_d, 26 + crouch_d]
            frame = draw_two_handed_odachi(
                base,
                hand_x=hx_seq[f],
                hand_y=hy_seq[f],
                angle_deg=ang_seq[f],
                glow_intensity=1.15,
                scale=0.96,
                blade_len=16.5,
                rear_shoulder=(21, 18 + crouch_d),
                lead_shoulder=(27, 19 + crouch_d),
                draw_arms=True,
                phase=phase,
            )
            frames.append(frame)

        elif f <= 9:
            # F04..F09: Blinding horizontal Battoujutsu Draw-Cut (angle_deg = -6 deg) + horizontal slash streak across y = 24..28
            k = f - 4  # 0..5
            base = tpl["lunge"].copy()
            base = apply_cape_and_mane_wave(
                base,
                phase * 2.0,
                amplitude=1.8,
                rune_pulse=1.0,
                koiguchi_glint=1.0 if k <= 2 else 0.4,
            )
            ang_seq = [-12.0, -6.0, -6.0, -6.0, -2.0, 6.0]
            hx_seq = [33, 35, 36, 35, 34, 33]
            hy_seq = [25, 25, 25, 25, 26, 26]
            slash_arc = (-34.0, 16.0, 18.0, 1.0 if k <= 3 else 0.65) if k <= 4 else None
            frame = draw_two_handed_odachi(
                base,
                hand_x=hx_seq[k],
                hand_y=hy_seq[k],
                angle_deg=ang_seq[k],
                glow_intensity=1.45,
                scale=1.02,
                blade_len=17.0,
                rear_shoulder=(23, 18),
                lead_shoulder=(29, 19),
                draw_arms=True,
                slash_arc=slash_arc,
                phase=phase,
            )
            # Horizontal cyan-white Battoujutsu slash streak across x = 22..48, y = 24..28
            if k <= 4:
                x_end = min(48, 38 + k * 3)
                for sx in range(22, x_end + 1):
                    u_s = (sx - 22) / max(1.0, float(x_end - 22))
                    cy_s = 26 + int(round(math.sin((u_s - 0.5) * math.pi) * 1.2))
                    set_px(frame, sx, cy_s, DIAMOND_WHITE if u_s > 0.35 else CYAN_LIGHT)
                    set_px(frame, sx, cy_s - 1, CYAN_BRIGHT if sx % 2 == 0 else VIOLET_BRIGHT)
                    set_px(frame, sx, cy_s + 1, VIOLET_GLOW if sx % 2 == 0 else CYAN_MID)
            frames.append(frame)

        elif f <= 19:
            # F10..F19: Rising diagonal Kiriage Upper-Slash (angle_deg sweeping from +35 deg up to -65 deg)
            k = f - 10  # 0..9
            crouch_d = 2 if k <= 2 else 0
            base = make_crouch_ronin(tpl, crouch_d) if crouch_d > 0 else tpl["lunge"].copy()
            base = apply_cape_and_mane_wave(
                base, phase * 2.2, amplitude=1.9, rune_pulse=1.0, dy_offset=crouch_d
            )
            ang_seq = [22.0, 35.0, 24.0, -4.0, -28.0, -48.0, -60.0, -65.0, -62.0, -54.0]
            hx_seq = [31, 31, 32, 34, 35, 35, 34, 34, 33, 33]
            hy_seq = [27, 28, 27, 25, 23, 21, 20, 19, 20, 21]
            slash_arc = None
            if 2 <= k <= 8:
                arc_int = [0.85, 1.0, 1.0, 1.0, 0.9, 0.75, 0.55][k - 2]
                slash_arc = (ang_seq[k] - 5.0, 36.0, 18.0, arc_int)

            frame = draw_two_handed_odachi(
                base,
                hand_x=hx_seq[k],
                hand_y=hy_seq[k],
                angle_deg=ang_seq[k],
                glow_intensity=1.45 if 2 <= k <= 7 else 1.15,
                scale=1.03,
                blade_len=17.0,
                rear_shoulder=(22, 18 + crouch_d),
                lead_shoulder=(28, 19 + crouch_d),
                draw_arms=True,
                slash_arc=slash_arc,
                phase=phase,
            )
            # Rising diagonal Kiriage slash streak from lower-left (28, 38) to upper-right (46, 12)
            if 3 <= k <= 7:
                draw_line_px(frame, 29, 36, 46, 13, DIAMOND_WHITE if k <= 5 else CYAN_LIGHT)
                draw_line_px(frame, 28, 36, 45, 13, CYAN_BRIGHT)
                draw_line_px(frame, 30, 37, 47, 14, VIOLET_BRIGHT)
            frames.append(frame)

        else:
            # F20..F29: Iaido Judgment-Cut X-Slash (cross_slash_arc + twin diagonal X-cut lines across x=28..47, y=10..40)
            k = f - 20  # 0..9
            if k <= 5:
                base = tpl["lunge"].copy()
                base = apply_cape_and_mane_wave(base, phase * 2.5, amplitude=2.0, rune_pulse=1.0)
                ang_seq = [-38.0, 14.0, 24.0, -18.0, -14.0, -12.0]
                hx_seq = [35, 36, 36, 35, 34, 33]
                hy_seq = [21, 24, 25, 24, 25, 25]
                slash1 = (-72.0, 30.0, 18.0, 1.0 if k <= 3 else 0.7)
                slash2 = (-36.0, 38.0, 15.5, 0.95 if k <= 3 else 0.65)
                frame = draw_two_handed_odachi(
                    base,
                    hand_x=hx_seq[k],
                    hand_y=hy_seq[k],
                    angle_deg=ang_seq[k],
                    glow_intensity=1.5,
                    scale=1.04,
                    blade_len=17.0,
                    rear_shoulder=(23, 18),
                    lead_shoulder=(29, 19),
                    draw_arms=True,
                    slash_arc=slash1,
                    cross_slash_arc=slash2,
                    phase=phase,
                )
                # Twin intersecting diagonal X-cut energy lines across x = 28..47, y = 10..40
                c_core = DIAMOND_WHITE if k <= 3 else CYAN_LIGHT
                c_edge = CYAN_BRIGHT if k % 2 == 0 else VIOLET_BRIGHT
                draw_line_px(frame, 28, 11, 47, 39, c_core)
                draw_line_px(frame, 29, 11, 47, 38, c_edge)
                draw_line_px(frame, 28, 39, 47, 11, c_core)
                draw_line_px(frame, 29, 40, 47, 12, VIOLET_GLOW)
                # Bright X-intersection star flare at (38, 25)
                for d_f in (-2, -1, 0, 1, 2):
                    set_px(frame, 38 + d_f, 25, DIAMOND_WHITE)
                    set_px(frame, 38, 25 + d_f, DIAMOND_WHITE)
            else:
                # F26..F29 (k = 6..9): Smooth recovery back to -10 deg hip Iaido stance
                u = (k - 5) / 4.0
                base = tpl["stand"].copy()
                base = apply_cape_and_mane_wave(base, phase, amplitude=1.4, rune_pulse=0.8 - u * 0.2)
                ang = -12.0 * (1.0 - u) + (-10.0) * u
                hx = int(round(32 * (1.0 - u) + 29 * u))
                hy = int(round(25 * (1.0 - u) + 26 * u))
                frame = draw_two_handed_odachi(
                    base,
                    hand_x=hx,
                    hand_y=hy,
                    angle_deg=ang,
                    glow_intensity=1.1 - u * 0.15,
                    scale=1.0,
                    blade_len=17.0,
                    rear_shoulder=(21, 18),
                    lead_shoulder=(27, 19),
                    draw_arms=True,
                    phase=phase,
                )
            frames.append(frame)

    return frames


def build_row3_skill(tpl):
    """
    Row 3 (`SKILL` - Zantetsuken 5-Fold Lightning Zig-Zag & Sheath Click, 90..119):
    - `F00..F07`: Deep Iaido sheath crouch (`crouch_depth = 4`, `angle_deg = -4°`).
    - `F08..F20`: High-speed forward Zantetsuken dash-cut (`tpl['dash']`) surrounded by a
      **Web of 4 Criss-Crossing Diagonal Cyan-White Judgment-Cut Slash Lines** across the frame!
    - `F21..F29`: **Chiburi & Noto (Clicking the Odachi back into the hip scabbard)** with a bright
      diamond-white star-glint at his hip `koiguchi` (`x = 24, y = 26`) as the lightning web detonates!
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi

        if f <= 7:
            # F00..F07: Deep Iaido sheath crouch (crouch_depth = 4, angle_deg = -4 deg)
            depths = [1, 2, 3, 4, 4, 4, 4, 4]
            d = depths[f]
            u = f / 7.0
            base = make_crouch_ronin(tpl, d)
            base = apply_cape_and_mane_wave(
                base,
                phase * 1.8,
                amplitude=1.5,
                rune_pulse=0.8 + 0.2 * u,
                dy_offset=d,
                koiguchi_glint=0.6 + 0.4 * u,
            )
            ang = -10.0 * (1.0 - u) + (-4.0) * u
            hx = int(round(28 * (1.0 - u) + 25 * u))
            hy = 25 + d
            frame = draw_two_handed_odachi(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.1 + 0.3 * u,
                scale=0.98,
                blade_len=16.5,
                rear_shoulder=(21, 18 + d),
                lead_shoulder=(27, 19 + d),
                draw_arms=True,
                phase=phase,
            )
            # Crackling cyan-violet concentration arcs converging on the hip koiguchi (22, 26 + d)
            if f >= 3:
                kx, ky = 22, 26 + d
                for a_i in range(3):
                    ox = kx + (a_i - 1) * 5 + (f % 2)
                    oy = ky - 4 + (a_i % 2) * 7
                    draw_line_px(frame, ox, oy, kx, ky, DIAMOND_WHITE if a_i == 1 else CYAN_BRIGHT)
            frames.append(frame)

        elif f <= 20:
            # F08..F20: High-speed forward Zantetsuken dash-cut (tpl['dash']) + Web of 4 Criss-Crossing Judgment-Cut Lines
            k = f - 8  # 0..12
            base = shift_layer(tpl["dash"], dx=1 if k % 2 == 0 else 0, dy=0)
            base = apply_cape_and_mane_wave(
                base, phase * 3.0, amplitude=2.0, vertical_flutter=0.8, is_dash=True, rune_pulse=1.0
            )
            ang_seq = [-28.0, 16.0, 22.0, -38.0, -52.0, 14.0, 24.0, -22.0, 18.0, 12.0, -8.0, -14.0, -6.0]
            hx_seq = [35, 36, 36, 34, 34, 36, 36, 35, 35, 34, 33, 32, 31]
            hy_seq = [22, 24, 24, 20, 19, 24, 24, 21, 24, 24, 24, 24, 25]
            slash_arc = (-64.0, 28.0, 18.0, 0.95) if k <= 9 else None

            frame = draw_two_handed_odachi(
                base,
                hand_x=hx_seq[k],
                hand_y=hy_seq[k],
                angle_deg=ang_seq[k],
                glow_intensity=1.5,
                scale=1.03,
                blade_len=17.0,
                rear_shoulder=(23, 18),
                lead_shoulder=(29, 19),
                draw_arms=True,
                slash_arc=slash_arc,
                phase=phase,
            )

            # Web of 4 Criss-Crossing Diagonal Cyan-White Judgment-Cut Slash Lines across the frame
            web_lines = [
                (6, 12 + (k % 3), 47, 36 - (k % 3)),
                (7, 39 - (k % 2), 47, 10 + (k % 2)),
                (12, 7, 45, 42),
                (14, 43, 46, 8),
            ]
            num_active = min(4, 1 + k // 2)
            for l_idx in range(num_active):
                x0, y0, x1, y1 = web_lines[l_idx]
                c_main = DIAMOND_WHITE if (l_idx + k) % 2 == 0 else CYAN_LIGHT
                c_glow = CYAN_BRIGHT if l_idx % 2 == 0 else VIOLET_BRIGHT
                draw_line_px(frame, x0, y0, x1, y1, c_main)
                draw_line_px(frame, x0, min(46, y0 + 1), x1, min(46, y1 + 1), c_glow)

            frames.append(frame)

        else:
            # F21..F29: Chiburi & Noto (Clicking the Odachi back into the hip scabbard)
            # with a bright diamond-white star-glint at his hip koiguchi (x = 24, y = 26) as the lightning web detonates!
            k = f - 21  # 0..8
            u = k / 8.0
            base = tpl["stand"].copy()
            base = apply_cape_and_mane_wave(
                base,
                phase,
                amplitude=1.4,
                rune_pulse=1.0 - u * 0.3,
                koiguchi_glint=1.0 if k <= 5 else 0.3,
            )
            ang = -6.0 * (1.0 - u) + (-10.0) * u
            hx = int(round(27 * (1.0 - u) + 29 * u))
            hy = 26
            frame = draw_two_handed_odachi(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.3 - u * 0.3,
                scale=1.0,
                blade_len=17.0,
                rear_shoulder=(21, 18),
                lead_shoulder=(27, 19),
                draw_arms=True,
                phase=phase,
            )

            # Bright Diamond-White Star-Glint at his hip koiguchi (x = 24, y = 26) on F21..F26
            if k <= 5:
                gx, gy = 24, 26
                star_r = 4 if k in (1, 2, 3) else 3
                for d_s in range(-star_r, star_r + 1):
                    set_px(frame, gx + d_s, gy, DIAMOND_WHITE if abs(d_s) <= 2 else CYAN_LIGHT)
                    set_px(frame, gx, gy + d_s, DIAMOND_WHITE if abs(d_s) <= 2 else CYAN_LIGHT)
                for dx_d, dy_d in [(-2, -2), (2, -2), (-2, 2), (2, 2), (-1, -1), (1, -1), (-1, 1), (1, 1)]:
                    set_px(frame, gx + dx_d, gy + dy_d, GOLD_WHITE if abs(dx_d) == 1 else CYAN_BRIGHT)

            # Detonating lightning web fragments bursting into cyan-violet sparks (F21..F25)
            if k <= 4:
                burst_pts = [(12, 14), (39, 13), (44, 24), (37, 36), (15, 37), (29, 11)]
                for b_i, (bx, by) in enumerate(burst_pts):
                    sx_b = min(47, max(4, bx + (1 if b_i % 2 == 0 else -1) * k))
                    sy_b = min(45, max(5, by + (1 if b_i >= 3 else -1) * k))
                    set_px(frame, sx_b, sy_b, DIAMOND_WHITE if (b_i + k) % 2 == 0 else CYAN_BRIGHT)
                    set_px(frame, min(47, sx_b + 1), sy_b, VIOLET_BRIGHT)

            frames.append(frame)

    return frames


def draw_susanoo_8drum_wheel(canvas, f, crouch_d=0, phase=0.0):
    """
    Row 4 Ultimate helper:
    Renders Kaze-Maru's blazing **8-Drum Raijin Thunder-Wheel** behind his shoulders (`cx = 24, cy = 16, r = 11.0`)
    linked by crackling cyan-violet lightning arcs (with ZERO vertical ground pillars!).
    """
    bg_wheel = np.zeros((52, 52, 4), dtype=np.uint8)
    cx, cy = 24.0, 16.0 + crouch_d
    r_wheel = 11.0

    for s in range(44):
        ang = (s / 44.0) * 2.0 * math.pi + phase
        rx = max(4, min(47, int(round(cx + math.cos(ang) * r_wheel))))
        ry = max(4, min(45, int(round(cy + math.sin(ang) * r_wheel))))
        set_px(bg_wheel, rx, ry, CYAN_BRIGHT if s % 2 == 0 else VIOLET_GLOW)

    for d_i in range(8):
        da = (d_i / 8.0) * 2.0 * math.pi + phase
        dx_d = max(5, min(46, int(round(cx + math.cos(da) * r_wheel))))
        dy_d = max(5, min(44, int(round(cy + math.sin(da) * r_wheel))))
        for oy in (-1, 0, 1):
            for ox in (-1, 0, 1):
                if ox == 0 and oy == 0:
                    col_d = DIAMOND_WHITE if (d_i + f) % 2 == 0 else CYAN_LIGHT
                elif abs(ox) + abs(oy) == 1:
                    col_d = BRASS_BRIGHT if (d_i % 2 == 0) else CYAN_BRIGHT
                else:
                    col_d = BRASS_MID
                set_px(bg_wheel, dx_d + ox, dy_d + oy, col_d)

    return composite_over(bg_wheel, canvas)


def build_row4_ultimate(tpl):
    """
    Row 4 (`ULTIMATE` - Susanoo Omnislash Storm, 120..149):
    - Kaze-Maru holds his Odachi vertically in front of his chest (`angle_deg = -88°`, `Ken-In` blade seal)
      while his 8-Drum Raijin Thunder-Wheel blazes behind him and **criss-crossing omnidirectional
      cyan-violet sword slashes** fill the air around him!
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi

        if f <= 6:
            # F00..F06: Raising the Odachi from -10 deg hip stance into the vertical -88 deg Ken-In blade seal in front of chest
            u = f / 6.0
            base = tpl["stand"].copy()
            base = apply_cape_and_mane_wave(
                base, phase * 2.0, amplitude=1.6, rune_pulse=0.85 + 0.15 * u, show_drums=False
            )
            base = draw_susanoo_8drum_wheel(base, f, crouch_d=0, phase=phase * 2.0)
            ang = -10.0 * (1.0 - u) + (-88.0) * u
            hx = int(round(29 * (1.0 - u) + 28 * u))
            hy = int(round(26 * (1.0 - u) + 22 * u))
            frame = draw_two_handed_odachi(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.2 + 0.3 * u,
                scale=1.0,
                blade_len=17.0,
                rear_shoulder=(21, 18),
                lead_shoulder=(27, 19),
                draw_arms=True,
                phase=phase * 2.0,
            )
            frames.append(frame)

        elif f <= 24:
            # F07..F24: Kaze-Maru holds the vertical Ken-In Blade Seal (angle_deg = -88 deg) in front of his chest
            # while the 8-Drum Raijin Thunder-Wheel spins behind him and omnidirectional sword slashes fill the air!
            k = f - 7  # 0..17
            hover_dy = -1 if (k % 4 in (1, 2)) else 0
            base = shift_layer(tpl["stand"], dx=0, dy=hover_dy)
            base = apply_cape_and_mane_wave(
                base, phase * 3.0, amplitude=2.0, rune_pulse=1.0, dy_offset=hover_dy, show_drums=False
            )
            base = draw_susanoo_8drum_wheel(base, f, crouch_d=hover_dy, phase=phase * 3.0)

            ang = -88.0 + math.sin(k * 0.8) * 2.0
            frame = draw_two_handed_odachi(
                base,
                hand_x=28,
                hand_y=22 + hover_dy,
                angle_deg=ang,
                glow_intensity=1.5,
                scale=1.02,
                blade_len=17.0,
                rear_shoulder=(21, 18 + hover_dy),
                lead_shoulder=(27, 19 + hover_dy),
                draw_arms=True,
                phase=phase * 3.0,
            )

            # Criss-crossing omnidirectional cyan-violet & diamond-white katana slashes filling the air around him
            omni_slashes = [
                (5, 10, 46, 34),
                (6, 38, 47, 12),
                (10, 6, 44, 42),
                (8, 24, 47, 20),
                (14, 42, 46, 8),
                (4, 18, 42, 40),
                (12, 9, 47, 28),
            ]
            for s_i in range(5):
                idx = (k * 2 + s_i) % len(omni_slashes)
                x0, y0, x1, y1 = omni_slashes[idx]
                # Perturb endpoints slightly with k so every frame has a dynamic storm of omnislashes
                dy_off = ((k + s_i) % 3) - 1
                c_core = DIAMOND_WHITE if s_i % 2 == 0 else CYAN_LIGHT
                c_wake = CYAN_BRIGHT if (s_i + k) % 2 == 0 else VIOLET_BRIGHT
                draw_line_px(frame, x0, y0 + dy_off, x1, y1 - dy_off, c_core)
                draw_line_px(frame, x0, min(46, y0 + dy_off + 1), x1, min(46, y1 - dy_off + 1), c_wake)

            # Re-composite Kaze-Maru's kabuto face & vertical Ken-In blade tip in front of background slashes for crisp readability
            for cy_f in range(8, 26):
                for cx_f in range(22, 31):
                    if base[cy_f, cx_f, 3] > 0:
                        frame[cy_f, cx_f] = base[cy_f, cx_f]
            frame = draw_two_handed_odachi(
                frame,
                hand_x=28,
                hand_y=22 + hover_dy,
                angle_deg=ang,
                glow_intensity=1.5,
                scale=1.02,
                blade_len=17.0,
                rear_shoulder=(21, 18 + hover_dy),
                lead_shoulder=(27, 19 + hover_dy),
                draw_arms=True,
                phase=phase * 3.0,
            )
            frames.append(frame)

        else:
            # F25..F29: Lowering the Odachi from -88 deg Ken-In seal back to the low -10 deg hip Iaido stance
            k = f - 25  # 0..4
            u = (k + 1) / 5.0
            base = tpl["stand"].copy()
            base = apply_cape_and_mane_wave(base, phase, amplitude=1.5, rune_pulse=0.9 - u * 0.2, show_drums=True)
            ang = -88.0 * (1.0 - u) + (-10.0) * u
            hx = int(round(28 * (1.0 - u) + 29 * u))
            hy = int(round(22 * (1.0 - u) + 26 * u))
            frame = draw_two_handed_odachi(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.25 - u * 0.25,
                scale=1.0,
                blade_len=17.0,
                rear_shoulder=(21, 18),
                lead_shoulder=(27, 19),
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
            u = f / 6.0
            dx = -int(round(math.sin(u * math.pi * 0.85) * 2.0))
            dy = int(round(u * 2.0))
            base = shift_layer(tpl["stand"], dx=dx, dy=dy)
            base = apply_cape_and_mane_wave(
                base, u * math.pi, amplitude=1.4, vertical_flutter=0.5, rune_pulse=0.45, dy_offset=dy
            )
            frame = draw_two_handed_odachi(
                base,
                hand_x=max(27, 29 + dx),
                hand_y=25 + dy,
                angle_deg=-10.0 + u * 34.0,
                glow_intensity=0.7,
                scale=1.0,
                blade_len=17.0,
                rear_shoulder=(21 + dx, 18 + dy),
                lead_shoulder=(27 + dx, 19 + dy),
                draw_arms=True,
            )
            for sp in range(4):
                sx_s = min(47, 30 + sp * 2 + f)
                sy_s = max(5, 20 - (sp % 2) * 3 + (f // 2))
                set_px(frame, sx_s, sy_s, DIAMOND_WHITE if sp == 0 else (CYAN_BRIGHT if sp % 2 == 0 else VIOLET_BRIGHT))
            frames.append(frame)

        elif f <= 17:
            u = (f - 7) / 10.0
            kneel_src = tpl["kneel"].copy()
            extra_drop = 0 if f <= 13 else (f - 13)
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
            base = apply_cape_and_mane_wave(
                base,
                u * math.pi,
                amplitude=1.0,
                vertical_flutter=0.3,
                rune_pulse=flicker,
                dy_offset=6 + extra_drop,
                show_drums=(f <= 13),
            )

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
            k = f - 18  # 0..11
            fall_src = tpl["fall"]
            frame = np.zeros((52, 52, 4), dtype=np.uint8)
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

            for hx_p in range(15, 21):
                set_px(frame, hx_p, 45, BRASS_BRIGHT if hx_p in (15, 18) else INDIGO_DARK)
            set_px(frame, 21, 44, BRASS_BRIGHT)
            set_px(frame, 21, 45, GOLD_WHITE if k <= 3 else CYAN_BRIGHT)
            set_px(frame, 21, 46, BRASS_MID)
            for bx_p in range(22, 45):
                set_px(frame, bx_p, 45, DIAMOND_WHITE if (bx_p + k) % 5 == 0 else CYAN_LIGHT)
                set_px(frame, bx_p, 46, INDIGO_MID if bx_p % 2 == 0 else CYAN_DEEP)

            ember_x = 18 + k * 2
            ember_y = 34 + (k % 3)
            set_px(frame, min(44, ember_x), ember_y, DIAMOND_WHITE if k <= 2 else (CYAN_BRIGHT if k <= 7 else VIOLET_GLOW))
            if k <= 6:
                set_px(frame, max(12, 36 - k * 2), 35 - (k % 2), VIOLET_BRIGHT if k % 2 == 0 else CYAN_LIGHT)
            frames.append(frame)

    return frames


def draw_shunpo_branching_lightning(canvas, k):
    """
    Row 6 helper: Draws jagged branching cyan-violet lightning bolts trailing behind Kaze-Maru
    during his Shunpo Lightning Step (NO horizontal bar lines!).
    """
    bolt_roots = [
        (20, 15 + (k % 2)),
        (19, 23 - (k % 2)),
        (21, 32 + (k % 2)),
    ]
    for b_idx, (rx, ry) in enumerate(bolt_roots):
        cx, cy = float(rx), float(ry)
        for seg in range(4):
            nx = max(4.0, cx - 3.4)
            zig_dy = (2.2 if ((seg + b_idx + k) % 2 == 0) else -2.2)
            ny = max(8.0, min(43.0, cy + zig_dy))
            col = DIAMOND_WHITE if seg == 0 else (CYAN_BRIGHT if (seg + b_idx) % 2 == 0 else VIOLET_BRIGHT)
            draw_line_px(canvas, cx, cy, nx, ny, col)
            # Diagonal fork branch off segment 1
            if seg == 1:
                fx = max(4.0, nx - 2.5)
                fy = max(8.0, min(43.0, ny + (2.5 if zig_dy > 0 else -2.5)))
                draw_line_px(canvas, nx, ny, fx, fy, CYAN_LIGHT if b_idx % 2 == 0 else VIOLET_GLOW)
            cx, cy = nx, ny


def build_row6_dash(tpl):
    """
    Row 6 (`DASH` - Shunpo Lightning Step, 180..209):
    - Low forward-leaning Shunpo blur with **jagged branching cyan-violet lightning bolts**
      trailing behind him (NO horizontal bar lines!).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 2:
            crouch_d = [2, 4, 3][f]
            u = f / 2.0
            base = make_crouch_ronin(tpl, crouch_d)
            base = apply_cape_and_mane_wave(
                base, phase * 2.0, amplitude=1.6, is_dash=True, rune_pulse=0.85, dy_offset=crouch_d
            )
            ang = -10.0 * (1.0 - u) + 8.0 * u
            frame = draw_two_handed_odachi(
                base,
                hand_x=29 - f,
                hand_y=26 + crouch_d,
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
            # F03..F22: Low forward-leaning Shunpo blur + jagged branching cyan-violet lightning bolts
            k = f - 3  # 0..19
            bob_dy = 1 + int(round(math.sin(k * 0.7) * 1.0))
            base = shift_layer(tpl["dash"], dx=1, dy=bob_dy)
            base = apply_cape_and_mane_wave(
                base, k * 0.85, amplitude=1.8, vertical_flutter=0.8, is_dash=True, rune_pulse=1.0, dy_offset=bob_dy
            )
            draw_shunpo_branching_lightning(base, k)

            if 10 <= f <= 16:
                sk = f - 10  # 0..6
                ang_seq = [-26.0, -6.0, 10.0, 16.0, 12.0, 4.0, -4.0]
                slash_arc = (-38.0, ang_seq[sk] + 6.0, 17.5, 0.95 if sk <= 4 else 0.65)
                frame = draw_two_handed_odachi(
                    base,
                    hand_x=35,
                    hand_y=23 + bob_dy,
                    angle_deg=ang_seq[sk],
                    glow_intensity=1.45,
                    scale=1.02,
                    blade_len=17.0,
                    rear_shoulder=(23, 18 + bob_dy),
                    lead_shoulder=(29, 19 + bob_dy),
                    draw_arms=True,
                    slash_arc=slash_arc,
                    phase=phase,
                )
            else:
                pump_dx = int(round(math.sin(k * 0.7) * 1.0))
                frame = draw_two_handed_odachi(
                    base,
                    hand_x=30 + pump_dx,
                    hand_y=26 + bob_dy,
                    angle_deg=8.0 + math.sin(k * 0.6) * 5.0,
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
            # F23..F29: Skidding boot-stop & recovery to low -10 deg Iaido stance
            k = f - 23  # 0..6
            u = k / 6.0
            crouch_d = [3, 3, 2, 2, 1, 1, 0][k]
            base = make_crouch_ronin(tpl, crouch_d) if crouch_d > 0 else tpl["stand"].copy()
            base = apply_cape_and_mane_wave(
                base, phase, amplitude=1.5, vertical_flutter=0.5, rune_pulse=0.85 - u * 0.2, dy_offset=crouch_d
            )
            ang = 6.0 * (1.0 - u) + (-10.0) * u
            frame = draw_two_handed_odachi(
                base,
                hand_x=int(round(30 * (1.0 - u) + 29 * u)),
                hand_y=26 + crouch_d,
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


def draw_dragon_lightning_counter_vortex(canvas, f, phase):
    """
    Row 7 helper (`F04..F14`): Renders a **Coiling Cyan-Indigo Dragon-Lightning Counter-Vortex**
    spiraling around Kaze-Maru's waist (`cx = 26, cy = 29, rx = 11.5, ry = 4.5`) with a glowing
    electric dragon-head spark — and ZERO shield wheel or ground spikes!
    """
    back_vortex = np.zeros((52, 52, 4), dtype=np.uint8)
    front_vortex = np.zeros((52, 52, 4), dtype=np.uint8)
    cx = 26.0
    cy = 29.5
    rx = 11.5
    ry = 4.5

    steps = 36
    head_idx = (f * 3) % steps
    for i in range(steps):
        ang = (i / float(steps)) * 2.0 * math.pi + phase * 2.5
        ca, sa = math.cos(ang), math.sin(ang)
        vx = cx + ca * rx
        vy = cy + sa * ry - math.sin(ang * 2.0) * 1.5
        target = front_vortex if sa >= 0.0 else back_vortex

        dist_head = (head_idx - i) % steps
        if dist_head <= 2:
            col = DIAMOND_WHITE
            set_px(target, vx, vy - 1, CYAN_LIGHT)
            set_px(target, vx, vy + 1, VIOLET_BRIGHT)
        elif dist_head <= 14:
            col = CYAN_BRIGHT if i % 2 == 0 else VIOLET_BRIGHT
        elif dist_head <= 24:
            col = CYAN_MID if i % 2 == 0 else VIOLET_GLOW
        else:
            col = INDIGO_LIGHT

        set_px(target, vx, vy, col)

    out = composite_over(back_vortex, canvas)
    out = composite_over(out, front_vortex)
    return out


def build_row7_crouch(tpl):
    """
    Row 7 (`CROUCH` - Iaido Serene Mind Counter-Blink, 210..239):
    - ZERO overhead/front drum shield and ZERO vertical ground spikes at his feet!
    - `F00..F14`: Kaze-Maru drops into a deep **Iai-Goshi Sheath Counter-Stance (`crouch_depth = 5`)**
      holding the Odachi horizontally at his hip scabbard (`hand_x = 26, hand_y = 29, angle_deg = -6°`)
      while a **Coiling Cyan-Indigo Dragon-Lightning Counter-Vortex** spirals around his waist (`F04..F14`)!
    - `F15..F25`: **Instant Lightning Blink-Afterimage & Critical Backstab Slash**!
    - `F26..F29`: Smooth return to the low `-10°` standing Iaido stance.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi

        if f <= 14:
            # F00..F14: Deep Iai-Goshi Sheath Counter-Stance (crouch_depth = 5) + Coiling Dragon-Lightning Counter-Vortex
            depths = [2, 3, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]
            d = depths[f]
            base = make_crouch_ronin(tpl, d)
            base = apply_cape_and_mane_wave(
                base,
                phase * 1.6,
                amplitude=1.3,
                vertical_flutter=0.3,
                rune_pulse=0.9,
                dy_offset=d,
                koiguchi_glint=0.85 if f >= 4 else 0.3,
            )
            ang = -6.0 + math.sin(phase * 2.0) * 1.5
            frame = draw_two_handed_odachi(
                base,
                hand_x=26,
                hand_y=24 + d,  # 29 when d = 5
                angle_deg=ang,
                glow_intensity=1.15,
                scale=0.98,
                blade_len=16.5,
                rear_shoulder=(21, 18 + d),
                lead_shoulder=(27, 19 + d),
                draw_arms=True,
                phase=phase,
            )
            if f >= 4:
                frame = draw_dragon_lightning_counter_vortex(frame, f, phase)
            frames.append(frame)

        elif f <= 25:
            # F15..F25: Instant Lightning Blink-Afterimage & Critical Backstab Slash!
            k = f - 15  # 0..10
            base = shift_layer(tpl["lunge"], dx=2, dy=0)
            base = apply_cape_and_mane_wave(
                base, phase * 2.5, amplitude=1.9, vertical_flutter=0.6, rune_pulse=1.0
            )

            # Shunpo Blink-Afterimage ghost trailing on the left (F15..F20)
            if k <= 5:
                ghost_src = make_crouch_ronin(tpl, 5)
                ghost_layer = np.zeros((52, 52, 4), dtype=np.uint8)
                for gy in range(10, 45):
                    for gx in range(14, 34):
                        if ghost_src[gy, gx, 3] > 0 and (gx + gy + k) % 2 == 0:
                            nx = max(4, gx - 6)
                            ghost_layer[gy, nx] = CYAN_BRIGHT if (gx + gy) % 4 == 0 else VIOLET_DEEP
                # Jagged lightning blink-arc linking the afterimage to Kaze-Maru
                draw_line_px(ghost_layer, 16, 26, 28, 23, DIAMOND_WHITE if k <= 2 else CYAN_LIGHT)
                draw_line_px(ghost_layer, 15, 32, 29, 29, VIOLET_BRIGHT)
                base = composite_over(ghost_layer, base)

            ang_seq = [28.0, 6.0, -18.0, -36.0, -44.0, -42.0, -34.0, -26.0, -20.0, -16.0, -14.0]
            hx_seq = [35, 36, 36, 35, 35, 34, 34, 33, 32, 31, 30]
            hy_seq = [25, 24, 22, 21, 20, 21, 22, 23, 24, 25, 25]
            slash_arc = (ang_seq[k] - 6.0, 34.0, 18.0, 1.0 if k <= 4 else 0.65) if k <= 6 else None

            frame = draw_two_handed_odachi(
                base,
                hand_x=hx_seq[k],
                hand_y=hy_seq[k],
                angle_deg=ang_seq[k],
                glow_intensity=1.45 if k <= 6 else 1.1,
                scale=1.02,
                blade_len=17.0,
                rear_shoulder=(23, 18),
                lead_shoulder=(29, 19),
                draw_arms=True,
                slash_arc=slash_arc,
                phase=phase,
            )

            # Critical Backstab Star-Flare at the strike apex (x = 42, y = 21) on F16..F20
            if 1 <= k <= 5:
                cx_s, cy_s = 42, 21
                for d_s in range(-3, 4):
                    set_px(frame, cx_s + d_s, cy_s, DIAMOND_WHITE if abs(d_s) <= 1 else CYAN_LIGHT)
                    set_px(frame, cx_s, cy_s + d_s, DIAMOND_WHITE if abs(d_s) <= 1 else VIOLET_BRIGHT)
            frames.append(frame)

        else:
            # F26..F29: Smooth return to standing -10 deg Iaido stance
            k = f - 26  # 0..3
            u = (k + 1) / 4.0
            crouch_d = [2, 1, 1, 0][k]
            base = make_crouch_ronin(tpl, crouch_d) if crouch_d > 0 else tpl["stand"].copy()
            base = apply_cape_and_mane_wave(
                base, phase, amplitude=1.4, vertical_flutter=0.5, rune_pulse=0.75, dy_offset=crouch_d
            )
            ang = -14.0 * (1.0 - u) + (-10.0) * u
            frame = draw_two_handed_odachi(
                base,
                hand_x=29,
                hand_y=26 + crouch_d,
                angle_deg=ang,
                glow_intensity=1.0,
                scale=1.0,
                blade_len=17.0,
                rear_shoulder=(21, 18 + crouch_d),
                lead_shoulder=(27, 19 + crouch_d),
                draw_arms=True,
                phase=phase,
            )
            frames.append(frame)

    return frames


def build_row8_jump(tpl):
    """
    Row 8 (`JUMP` - Tsubame Gaeshi Double Air-Slash, 240..269):
    - ZERO ground circle during airborne frames (`F04..F23`)!
    - Kaze-Maru leaps into the air and executes a **Twin X-Shaped Swallow-Turn Aerial Slash (`Tsubame Gaeshi`)**
      with two crossing cyan-white crescent arcs in mid-air (`F11..F20`)!
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 3:
            # F00..F03: Takeoff coil
            crouch_seq = [1, 3, 4, 2]
            d = crouch_seq[f]
            u = f / 3.0
            body = make_crouch_ronin(tpl, d)
            body = apply_cape_and_mane_wave(
                body, phase * 2.0, amplitude=1.5, vertical_flutter=0.6, rune_pulse=0.85, dy_offset=d
            )
            ang = -10.0 * (1.0 - u) + (-52.0) * u
            frame = draw_two_handed_odachi(
                body,
                hand_x=29,
                hand_y=25 + d,
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

        elif f <= 10:
            # F04..F10: Ascending aerial leap (ZERO ground circle!)
            k = f - 4  # 0..6
            u = k / 6.0
            jump_dy = int(round(-2 - math.sin(u * math.pi * 0.85) * 3.0))
            body = make_aerial_ronin(
                tpl, jump_dy=jump_dy, body_tilt_deg=8.0 * (1.0 - u), leg_tuck=0.55 + 0.35 * u, phase=phase * 2.0
            )
            ang = -58.0 * (1.0 - u) + (-86.0) * u
            frame = draw_two_handed_odachi(
                body,
                hand_x=30,
                hand_y=18 + jump_dy,
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

        elif f <= 20:
            # F11..F20: Twin X-Shaped Swallow-Turn Aerial Slash (Tsubame Gaeshi) in mid-air!
            k = f - 11  # 0..9
            jump_dy = -4 if k <= 6 else -3
            body = make_aerial_ronin(
                tpl, jump_dy=jump_dy, body_tilt_deg=10.0 if k <= 4 else -6.0, leg_tuck=0.85, phase=phase * 2.2
            )
            # First downward diagonal swallow-cut (k=0..3) then instant upward reverse swallow-cut (k=4..9)
            ang_seq = [-45.0, 12.0, 34.0, 28.0, -18.0, -52.0, -68.0, -62.0, -44.0, -26.0]
            hx_seq = [33, 35, 36, 35, 35, 34, 34, 33, 32, 31]
            hy_seq = [17, 20, 22, 22, 20, 18, 17, 18, 19, 20]

            slash1 = (-82.0, 34.0, 17.5, 1.0 if k <= 6 else 0.7)
            slash2 = (-64.0, 38.0, 15.0, 1.0 if 3 <= k <= 7 else 0.65) if k >= 2 else None

            frame = draw_two_handed_odachi(
                body,
                hand_x=hx_seq[k],
                hand_y=hy_seq[k] + jump_dy,
                angle_deg=ang_seq[k],
                glow_intensity=1.5,
                scale=1.02,
                blade_len=16.5,
                rear_shoulder=(21, 18 + jump_dy),
                lead_shoulder=(27, 19 + jump_dy),
                draw_arms=True,
                slash_arc=slash1,
                cross_slash_arc=slash2,
                phase=phase * 2.2,
            )

            # Twin crossing X-shaped cyan-white crescent slash streaks in mid-air (x = 27..47, y = 8..34)
            draw_line_px(frame, 28, 9, 47, 33, DIAMOND_WHITE if k <= 5 else CYAN_LIGHT)
            draw_line_px(frame, 29, 9, 47, 32, CYAN_BRIGHT)
            if k >= 2:
                draw_line_px(frame, 28, 33, 47, 9, DIAMOND_WHITE if k <= 7 else CYAN_LIGHT)
                draw_line_px(frame, 29, 34, 47, 10, VIOLET_BRIGHT)
                # Aerial X-cross glint at (38, 21)
                for d_g in (-1, 0, 1):
                    set_px(frame, 38 + d_g, 21, DIAMOND_WHITE)
                    set_px(frame, 38, 21 + d_g, DIAMOND_WHITE)

            frames.append(frame)

        elif f <= 23:
            # F21..F23: Controlled aerial descent (ZERO ground circle!)
            k = f - 21  # 0..2
            u = (k + 1) / 3.0
            jump_dy = int(round(-2 * (1.0 - u)))
            body = make_aerial_ronin(
                tpl, jump_dy=jump_dy, body_tilt_deg=4.0 * (1.0 - u), leg_tuck=0.5 * (1.0 - u * 0.5), phase=phase
            )
            ang = -22.0 * (1.0 - u) + (-12.0) * u
            frame = draw_two_handed_odachi(
                body,
                hand_x=30,
                hand_y=23 + jump_dy,
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
            # F24..F29: Grounded landing absorption & return to -10 deg hip Iaido stance
            k = f - 24  # 0..5
            u = k / 5.0
            crouch_depths = [4, 4, 3, 2, 1, 0]
            d = crouch_depths[k]
            body = make_crouch_ronin(tpl, d) if d > 0 else tpl["stand"].copy()
            body = apply_cape_and_mane_wave(
                body, phase, amplitude=1.4, vertical_flutter=0.5, rune_pulse=0.9 - u * 0.2, dy_offset=d
            )
            ang = -14.0 * (1.0 - u) + (-10.0) * u
            frame = draw_two_handed_odachi(
                body,
                hand_x=29,
                hand_y=26 + d,
                angle_deg=ang,
                glow_intensity=1.05 - u * 0.1,
                scale=1.0,
                blade_len=17.0,
                rear_shoulder=(21, 18 + d),
                lead_shoulder=(27, 19 + d),
                draw_arms=True,
                phase=phase,
            )
            frames.append(frame)
    return frames


def apply_pass12_vanguard_upgrades(cell_208, r_idx, f):
    """
    Applies clean 208x208 safety margin clamping (`[4..203]`) with ZERO shared generic overlays
    (no shared ground rings, no shared vertical aura pillars, no shared strike glints).
    """
    out = cell_208.copy()
    out[:4, :, :] = 0
    out[204:, :, :] = 0
    out[:, :4, :] = 0
    out[:, 204:, :] = 0
    return out


def main():
    tpl = make_clean_templates()

    rows = [
        ("ROW 0: IDLE - LOW COILED IAIDO / WAKIGAMAE STANCE (30 FRAMES)", build_row0_idle(tpl)),
        ("ROW 1: WALK - LOW GLIDING SURIASHI FOOTWORK (30 FRAMES)", build_row1_walk(tpl)),
        ("ROW 2: AUTO_ATTACK - 3-HIT SANDAN IAIDO DRAW-CUT COMBO (30 FRAMES)", build_row2_auto_attack(tpl)),
        ("ROW 3: SKILL - ZANTETSUKEN 5-FOLD LIGHTNING ZIG-ZAG & NOTO (30 FRAMES)", build_row3_skill(tpl)),
        ("ROW 4: ULTIMATE - SUSANOO OMNISLASH STORM (30 FRAMES)", build_row4_ultimate(tpl)),
        ("ROW 5: DEATH & HURT (30 FRAMES)", build_row5_death(tpl)),
        ("ROW 6: DASH - SHUNPO LIGHTNING STEP (30 FRAMES)", build_row6_dash(tpl)),
        ("ROW 7: CROUCH - IAIDO SERENE MIND COUNTER-BLINK (30 FRAMES)", build_row7_crouch(tpl)),
        ("ROW 8: JUMP - TSUBAME GAESHI DOUBLE AIR-SLASH (30 FRAMES)", build_row8_jump(tpl)),
    ]

    num_rows = len(rows)
    cell_px = 208
    sheet = Image.new("RGBA", (30 * cell_px, num_rows * cell_px), (0, 0, 0, 0))

    top_clips = bot_clips = left_clips = right_clips = 0
    pinhole_count = 0
    for r_idx, (r_name, r_frames) in enumerate(rows):
        assert len(r_frames) == 30, f"{r_name} has {len(r_frames)} frames instead of 30"
        cells_208 = []
        for c_idx in range(30):
            r_frames[c_idx] = ensure_safe_cell(r_frames[c_idx], margin=2)
            # Audit 52x52 interior 4-neighbor pinholes inside torso region
            alpha52 = r_frames[c_idx][:, :, 3] > 0
            for py in range(10, 44):
                for px in range(20, 32):
                    if not alpha52[py, px]:
                        if alpha52[py - 1, px] and alpha52[py + 1, px] and alpha52[py, px - 1] and alpha52[py, px + 1]:
                            pinhole_count += 1
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
        print(f"{r_name:70s}: 30 frames generated, {adj_diffs}/29 adjacent transitions distinct")

    print(
        f"Boundary clip audit across 270 frames: TOP={top_clips}, BOT={bot_clips}, LEFT={left_clips}, RIGHT={right_clips}, PINHOLES={pinhole_count}/270"
    )
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
