#!/usr/bin/env python3
"""
Builds Kaze-Maru's (Ronin - Storm-Blade Iaido Master) 9-Pass Upgraded 30fps HD-2D Sprite Sheet:
- 9 rows x 30 columns = 270 unique frames (6240 x 1872 at 208x208 per cell, 52x52 logical upscaled 4x NEAREST):
  * Row 0: IDLE - LOW COILED IAIDO / WAKIGAMAE STANCE (30 frames)
  * Row 1: WALK - SMOOTH GLIDING SAMURAI SURIASHI & HAYAGAKE STRIDE (30 frames)
  * Row 2: AUTO_ATTACK - 3-HIT SANDAN BATTOUJUTSU & CRESCENT X-SLASH COMBO (30 frames)
  * Row 3: SKILL - ZANTETSUKEN AERODYNAMIC SPEAR-LUNGE & NOTO SHEATH CLICK (30 frames)
  * Row 4: ULTIMATE - SUSANOO OMNISLASH & RAZOR-SHARP HEAVEN-SPLIT DIVE (30 frames)
  * Row 5: DEATH & HURT (30 frames)
  * Row 6: DASH - SHUNPO LIGHTNING STEP (30 frames)
  * Row 7: CROUCH - IAIDO SERENE MIND COUNTER-BLINK (30 frames)
  * Row 8: JUMP - TSUBAME GAESHI DOUBLE AIR-SLASH (30 frames)
"""

from collections import deque
import math
import os
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
PURE_WHITE = (255, 255, 255, 255)

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
    """Fills 1px transparent pinholes/slits inside moved, waved, or rotated pixel layers."""
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
    """Guarantees zero pixels fall outside [2..49, 2..49] and fills any 1px interior pinholes."""
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


def refine_ronin_pixel_model(cell):
    """
    Pass 10 HD-2D Pixel Refinement & De-Noising of Kaze-Maru's 45px Samurai Model (y = 4..48):
    - Strips the noisy AI upper-left drum/hook remnant (y = 4..16, x = 4..23) and replaces it with a
      clean, hand-sculpted, wind-swept Silver Samurai Wolf-Mane (y = 6..15, x = 15..24).
    - Hand-sculpts his:
      1) Gleaming Silver-Gold Crescent Moon `Maedate` Kabuto Horns (y = 4..9, x = 23..32)
      2) Fierce Indigo-Steel `Menpo` Oni-Mask & Luminous 2px Electric-Cyan Samurai Eyes (y = 9..14, x = 24..31)
      3) Layered `O-Yoroi` `Do` Breastplate & `Sode` Pauldrons with Crackling Cyan-Violet Lightning Veins (y = 15..25, x = 20..32)
      4) Silk Violet-Gold `Obi` Waist Sash & `Kusazuri` Hip Tassets (y = 25..35, x = 20..33)
      5) High-Contrast Armored `Haidate` Thighs, `Kikko` Knee-Guards, `Suneate` Shin-Greaves & `Waraji` Battle-Boots planted at y = 48.
    """
    out = cell.copy()

    # 1. Strip the noisy AI upper-left orange/white drum-hook artifact (y = 4..18, x = 4..24)
    out[4:18, 4:24] = 0

    # Hand-sculpt compact Indigo-Steel `Shikoro` (tiered Kabuto neck-guard plates, x = 22..25, y = 7..13)
    # plus two slender wind-swept silver hair strands (y = 10..13, x = 18..22) so the Raijin Drum Halo is 100% clear
    for sy in range(7, 14):
        set_px(out, 23, sy, INDIGO_MID if sy % 2 == 0 else BRASS_BRIGHT)
        set_px(out, 24, sy, INDIGO_LIGHT if sy % 2 == 0 else INDIGO_DARK)
    # Two crisp 1px silver-white hair strands streaming behind the Menpo mask
    set_px(out, 22, 9, SILVER_LIGHT)
    set_px(out, 21, 9, SILVER_WHITE)
    set_px(out, 20, 10, SILVER_LIGHT)
    set_px(out, 19, 10, SILVER_MID)
    set_px(out, 22, 11, SILVER_WHITE)
    set_px(out, 21, 11, SILVER_LIGHT)
    set_px(out, 20, 12, SILVER_MID)
    set_px(out, 19, 12, INDIGO_LIGHT)

    # 2. De-noise pure-black interior speckles inside the torso/tassets/legs (y = 14..47, x = 19..36)
    for y in range(14, 47):
        for x in range(19, 37):
            if out[y, x, 3] == 0:
                continue
            r, g, b, _ = [int(v) for v in out[y, x]]
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            if lum < 28:
                out[y, x] = INDIGO_DARK if (x + y) % 2 == 0 else INDIGO_MID

    # 3. Hand-sculpt Gleaming Crescent Moon `Maedate` Kabuto Horns & Kabuto Dome (y = 4..10, x = 23..32)
    horn_pixels = [
        (23, 4, GOLD_WHITE),
        (24, 5, GOLD_WHITE),
        (24, 6, BRASS_BRIGHT),
        (25, 7, BRASS_BRIGHT),
        (26, 8, GOLD_WHITE),
        (27, 8, PURE_WHITE),
        (28, 8, GOLD_WHITE),
        (29, 8, BRASS_BRIGHT),
        (30, 7, BRASS_BRIGHT),
        (31, 6, GOLD_WHITE),
        (31, 5, GOLD_WHITE),
        (32, 4, PURE_WHITE),
    ]
    for hx, hy, hcol in horn_pixels:
        set_px(out, hx, hy, hcol)

    # Kabuto crown, Shikoro neck plates & visor brim (y = 6..9, x = 24..31)
    for x in range(25, 30):
        set_px(out, x, 6, INDIGO_LIGHT if x == 27 else INDIGO_MID)
        set_px(out, x, 7, INDIGO_MID)
    for x in range(24, 31):
        set_px(out, x, 9, CYAN_MID if x in (26, 29) else INDIGO_DARK)

    # 4. Luminous 2px Electric-Cyan Samurai Eyes & Fierce Menpo Oni-Mask (y = 10..14, x = 24..30)
    set_px(out, 25, 10, INDIGO_DEEP)
    set_px(out, 26, 10, PURE_WHITE)
    set_px(out, 27, 10, CYAN_LIGHT)
    set_px(out, 28, 10, INDIGO_DEEP)
    set_px(out, 29, 10, PURE_WHITE)
    set_px(out, 30, 10, CYAN_BRIGHT)
    for x in range(25, 31):
        set_px(out, x, 11, INDIGO_MID if x in (26, 29) else INDIGO_DARK)
        set_px(out, x, 13, INDIGO_DEEP)
    set_px(out, 25, 12, INDIGO_DARK)
    set_px(out, 26, 12, SILVER_LIGHT)
    set_px(out, 27, 12, GOLD_WHITE)
    set_px(out, 28, 12, INDIGO_DEEP)
    set_px(out, 29, 12, GOLD_WHITE)
    set_px(out, 30, 12, INDIGO_DARK)

    # 5. Layered `Sode` Shoulder Pauldrons & Crackling Cyan-Violet Lightning Veins across `Do` Breastplate (y = 15..24, x = 20..32)
    for sy in range(16, 21):
        set_px(out, 20, sy, BRASS_BRIGHT if sy == 16 else INDIGO_LIGHT)
        set_px(out, 21, sy, CYAN_BRIGHT if sy == 18 else INDIGO_MID)
        set_px(out, 31, sy, CYAN_BRIGHT if sy == 18 else INDIGO_MID)
        set_px(out, 32, sy, BRASS_BRIGHT if sy == 16 else INDIGO_LIGHT)

    lightning_veins = [
        (25, 16, CYAN_LIGHT),
        (26, 17, PURE_WHITE),
        (27, 18, CYAN_BRIGHT),
        (28, 17, VIOLET_BRIGHT),
        (26, 19, CYAN_LIGHT),
        (25, 20, VIOLET_BRIGHT),
        (27, 20, PURE_WHITE),
        (28, 21, CYAN_LIGHT),
        (26, 22, CYAN_BRIGHT),
        (29, 22, VIOLET_BRIGHT),
        (27, 23, CYAN_LIGHT),
    ]
    for lx, ly, lcol in lightning_veins:
        set_px(out, lx, ly, lcol)

    # 6. Silk Violet-Gold `Obi` Waist Sash & Knot (y = 25..26, x = 21..31)
    for x in range(21, 31):
        set_px(out, x, 25, CAPE_LIGHT if x % 2 == 0 else VIOLET_GLOW)
        set_px(out, x, 26, CAPE_MID if x % 2 == 0 else INDIGO_DARK)
    set_px(out, 27, 25, GOLD_WHITE)
    set_px(out, 28, 25, BRASS_BRIGHT)
    set_px(out, 27, 26, BRASS_BRIGHT)

    # 7. Crisp Gold & Cyan-Trimmed `Kusazuri` Hip Tasset Plates (y = 27..35, x = 20..33)
    for ty in range(27, 36):
        for tx in range(20, 34):
            if out[ty, tx, 3] > 0:
                if ty in (28, 31, 34):
                    if tx in (22, 25, 28, 31):
                        set_px(out, tx, ty, CYAN_BRIGHT if ty != 31 else BRASS_BRIGHT)
                    else:
                        set_px(out, tx, ty, INDIGO_LIGHT)
                elif tx in (20, 33):
                    set_px(out, tx, ty, INDIGO_DEEP)

    # 8. High-Contrast Armored `Haidate` Thighs, `Kikko` Knees, `Suneate` Shin-Greaves & `Waraji` Boots (y = 36..48)
    # Back leg (left on screen: center x = 22..25) & Front leg (right on screen: center x = 31..34)
    for ly in range(36, 49):
        # Back leg (x = 20..25)
        for lx in range(20, 26):
            if ly <= 39:
                # Haidate thigh plate
                col = INDIGO_DEEP if lx in (20, 25) else (INDIGO_LIGHT if lx == 22 else INDIGO_MID)
            elif ly in (40, 41):
                # Kikko knee guard with brass/cyan rivet
                col = GOLD_WHITE if (lx == 22 and ly == 40) else (INDIGO_LIGHT if lx in (21, 23) else INDIGO_DARK)
            elif ly <= 46:
                # Suneate shin greave with cyan lightning ridge
                col = INDIGO_DEEP if lx in (20, 25) else (CYAN_MID if lx == 22 else (INDIGO_LIGHT if lx == 23 else INDIGO_DARK))
            else:
                # Waraji battle-boot & gold strap at y = 47..48
                col = BRASS_BRIGHT if (ly == 47 and lx in (22, 24)) else (INDIGO_MID if ly == 47 else INDIGO_DEEP)
            set_px(out, lx, ly, col)

        # Front leg (x = 30..35)
        for rx in range(30, 36):
            if ly <= 39:
                col = INDIGO_DEEP if rx in (30, 35) else (INDIGO_LIGHT if rx in (32, 33) else INDIGO_MID)
            elif ly in (40, 41):
                col = PURE_WHITE if (rx == 33 and ly == 40) else (CYAN_BRIGHT if rx == 32 else INDIGO_LIGHT)
            elif ly <= 46:
                col = INDIGO_DEEP if rx in (30, 35) else (CYAN_BRIGHT if rx == 33 else (INDIGO_LIGHT if rx == 32 else INDIGO_MID))
            else:
                col = GOLD_WHITE if (ly == 47 and rx in (32, 34)) else (INDIGO_LIGHT if ly == 47 else INDIGO_DEEP)
            set_px(out, rx, ly, col)

    # Clear between-legs gap (x = 26..29, y = 37..48) so the two legs have a crisp athletic stance separation
    out[37:49, 26:30] = 0

    return fill_layer_pinholes(out)


def draw_samurai_saya_and_raijin_drums(
    canvas,
    dy_offset=0,
    phase=0.0,
    sageo_wave=1.0,
    show_drums=True,
    koiguchi_glint=0.0,
):
    """
    Pass 2: Renders Kaze-Maru's two iconic Samurai silhouette features:
    a) Symmetric Floating Halo Ring of 5 Raijin Taiko Thunder-Drums (`Tomoe` drums linked by crackling
       cyan-violet lightning) framing both shoulders and Kabuto (`cx = 26.5, cy = 14.5 + dy_offset, rx = 10.5, ry = 8.5`).
    b) Waist-Worn Lacquered Katana Scabbard (`Saya`) with Golden `Koiguchi`/`Kojiri` Fittings & Flowing
       Violet-Cyan `Sageo` Cord extending diagonally behind his left hip (`x = 7..21, y = 26..33`).
    """
    bg_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    fg_saya = np.zeros((52, 52, 4), dtype=np.uint8)

    if show_drums:
        cx = 26.5
        cy = 14.5 + dy_offset
        rx = 10.5
        ry = 8.5
        wobble = math.sin(phase) * 0.08
        drum_angles_deg = [-168.0, -132.0, -90.0, -48.0, -12.0]
        drum_centers = []
        for idx, a_deg in enumerate(drum_angles_deg):
            ang = math.radians(a_deg) + wobble * (1 if idx % 2 == 0 else -1)
            dx = cx + math.cos(ang) * rx
            dy = cy + math.sin(ang) * ry
            drum_centers.append((dx, dy))

        for i in range(len(drum_centers) - 1):
            x0, y0 = drum_centers[i]
            x1, y1 = drum_centers[i + 1]
            mx = 0.5 * (x0 + x1) + math.cos(phase + i) * 0.65
            my = 0.5 * (y0 + y1) - 0.65 + math.sin(phase * 2.0 + i) * 0.45
            col_arc1 = CYAN_BRIGHT if (i + int(round(phase * 2))) % 2 == 0 else VIOLET_BRIGHT
            col_arc2 = VIOLET_GLOW if col_arc1 == CYAN_BRIGHT else CYAN_LIGHT
            draw_line_px(bg_layer, x0, y0, mx, my, col_arc1)
            draw_line_px(bg_layer, mx, my, x1, y1, col_arc2)

        for idx, (dx, dy) in enumerate(drum_centers):
            ix, iy = int(round(dx)), int(round(dy))
            for oy in (-1, 0, 1):
                for ox in (-1, 0, 1):
                    if ox == 0 and oy == 0:
                        col_d = PURE_WHITE if (idx + int(round(phase * 3))) % 2 == 0 else CYAN_LIGHT
                    elif abs(ox) + abs(oy) == 1:
                        col_d = GOLD_WHITE if (ox + oy < 0) else BRASS_BRIGHT
                    else:
                        col_d = BRASS_MID
                    set_px(bg_layer, ix + ox, iy + oy, col_d)

    kx0, ky0 = 21.0, 26.5 + dy_offset
    kx1, ky1 = 7.0, 32.5 + dy_offset
    steps = 28
    for i in range(steps + 1):
        u = i / float(steps)
        sori = math.sin(u * math.pi) * 0.8
        sx = kx0 + (kx1 - kx0) * u
        sy = ky0 + (ky1 - ky0) * u - sori

        if u <= 0.12:
            c_top = GOLD_WHITE
            c_mid = BRASS_BRIGHT
            c_bot = BRASS_MID
        elif u >= 0.88:
            c_top = GOLD_WHITE if u >= 0.94 else BRASS_BRIGHT
            c_mid = BRASS_BRIGHT
            c_bot = BRASS_DARK
        elif 0.26 <= u <= 0.34:
            c_top = BRASS_BRIGHT
            c_mid = GOLD_WHITE
            c_bot = INDIGO_DEEP
        else:
            c_top = INDIGO_DEEP
            c_mid = CYAN_MID if (i % 4 == 0) else CAPE_MID
            c_bot = CAPE_DEEP

        target = fg_saya if u <= 0.25 else bg_layer
        set_px(target, sx, sy - 0.5, c_top)
        set_px(target, sx, sy, c_mid)
        set_px(target, sx, sy + 0.6, c_bot)

    cord_x0 = 16.0
    cord_y0 = 28.5 + dy_offset
    for c_step in range(1, 7):
        u_c = c_step / 6.0
        sway = math.sin(phase - u_c * 2.4) * (1.7 * u_c * sageo_wave)
        cx_p = cord_x0 - u_c * 2.5 + sway
        cy_p = cord_y0 + c_step * 0.85
        col_c = CYAN_LIGHT if c_step % 2 == 0 else VIOLET_BRIGHT
        set_px(bg_layer, cx_p, cy_p, col_c)
        set_px(bg_layer, cx_p + 0.7, cy_p, VIOLET_GLOW if c_step % 2 == 0 else INDIGO_MID)

    if koiguchi_glint > 0.15:
        gx, gy = 22, int(round(26.5 + dy_offset))
        set_px(fg_saya, gx, gy, PURE_WHITE)
        r_g = 2 if koiguchi_glint < 0.7 else 3
        for d in range(1, r_g + 1):
            col_g = PURE_WHITE if d == 1 else CYAN_LIGHT
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
    Loads `ronin_v1_base_1794151225087.jpg` (1024x1024), strips the white background + 3-pass anti-aliased fringe,
    scales Kaze-Maru to full 45px HD-2D height (`y = 4..48`, boots planted firmly at `y = 48` matching `IceMage`
    and `Chronomancer`), strips the left cape, and runs `refine_ronin_pixel_model`!
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
    # Scale to 35x45 (y = 4..48, full 45px HD-2D height matching IceMage, Chronomancer, Priestess & FireMage!)
    scaled = crop.resize((35, 45), Image.Resampling.NEAREST)
    s_arr = np.array(scaled, dtype=np.uint8)

    cell = np.zeros((52, 52, 4), dtype=np.uint8)
    cell[4:49, 4:39] = s_arr

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

    # Strip the European left-billowing cape (x < 19, y = 16..44) so Kaze-Maru has a pure Samurai silhouette
    cell[16:18, :18] = 0
    cell[18:44, :19] = 0
    cell[30:41, :20] = 0

    # Plant right boot (x=29..38, y=40..47) down +1px so BOTH boots plant firmly on y=48
    right_boot = cell[40:48, 29:39].copy()
    cell[41:49, 29:39] = right_boot
    cell[40, 29:39] = right_boot[0, :]

    cell = fill_layer_pinholes(cell)
    return refine_ronin_pixel_model(cell)


def neutralize_baked_side_arms(tpl_img, max_chest_x=32):
    """
    Neutralizes/strips the lowered static side-arms on Kaze-Maru's torso so the two-handed
    2-bone IK arms gripping the Thunder-Odachi are 100% cleanly visible with ZERO extra limbs.
    """
    out = tpl_img.copy()
    out[18:44, :19] = 0
    out[30:41, :20] = 0

    for y in range(17, 31):
        lim_x = max_chest_x + 1 if y <= 18 else max_chest_x
        for x in range(lim_x + 1, 50):
            out[y, x] = (0, 0, 0, 0)

    for y in range(20, 31):
        for x in range(19, 24):
            if out[y, x, 3] > 0:
                if x <= 20:
                    out[y, x] = INDIGO_DEEP
                elif x == 21:
                    out[y, x] = INDIGO_DARK if (x + y) % 2 == 0 else INDIGO_DEEP
                else:
                    out[y, x] = INDIGO_MID if (x + y) % 2 == 0 else INDIGO_DARK

    for y in range(19, 29):
        if out[y, max_chest_x, 3] > 0:
            out[y, max_chest_x] = INDIGO_DEEP

    return fill_layer_pinholes(out)


def make_clean_templates():
    """
    Constructs Kaze-Maru's modular 45px HD-2D anatomical templates (boots planted at y = 48):
    - `stand`: full standing storm-samurai with static lowered side-arms neutralized
    - `stand_upper`: upper body, kabuto, & kusazuri hip tassets (`y = 0..36`)
    - `leg_back` and `leg_front`: lower suneate shin-greaves & war-boots at `y = 39..49`
    - `lunge`: forward-leaning Kendo lunge body (+2px upper-body lean)
    - `kneel`: dropped to one knee (`y + 6px`)
    - `fall`: 90-degree horizontally collapsed prone samurai on the floor (`y = 37..48`)
    - `dash`: forward-tilted (+14 deg) Shunpo flash-step body
    """
    raw = extract_clean_base_sprite()
    stand = neutralize_baked_side_arms(raw, max_chest_x=32)

    leg_back_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_front_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_back_patch[43:49, 19:27] = stand[43:49, 19:27]
    leg_front_patch[43:49, 29:37] = stand[43:49, 29:37]

    stand_upper = np.zeros((52, 52, 4), dtype=np.uint8)
    stand_upper[:37, :] = stand[:37, :]
    stand_upper = fill_layer_pinholes(stand_upper)

    lunge = np.zeros((52, 52, 4), dtype=np.uint8)
    lunge[34:49, :] = stand[34:49, :]
    for y in range(4, 34):
        dx = 2 if y <= 26 else 1
        for x in range(10, 48):
            if stand[y, x, 3] > 0 and x + dx <= 49:
                lunge[y, x + dx] = stand[y, x]
    lunge = neutralize_baked_side_arms(lunge, max_chest_x=34)
    lunge = fill_layer_pinholes(lunge)

    kneel = np.zeros((52, 52, 4), dtype=np.uint8)
    kneel[40:49, 18:39] = stand[40:49, 18:39]
    for y in range(4, 37):
        ny = y + 6
        if ny < 48:
            for x in range(10, 46):
                if stand[y, x, 3] > 0:
                    kneel[ny, x] = stand[y, x]
    kneel = neutralize_baked_side_arms(kneel, max_chest_x=32)
    kneel = fill_layer_pinholes(kneel)

    body_no_cape = stand.copy()
    pil_body = Image.fromarray(body_no_cape, mode="RGBA")
    rot_90 = np.array(
        pil_body.rotate(-82.0, resample=Image.Resampling.NEAREST, center=(26, 28)),
        dtype=np.uint8,
    )
    ys, xs = np.where(rot_90[:, :, 3] > 0)
    fall = np.zeros((52, 52, 4), dtype=np.uint8)
    if len(ys) > 0:
        dx_shift = 25 - int((xs.min() + xs.max()) // 2)
        dy_shift = 48 - int(ys.max())
        for y in range(52):
            for x in range(52):
                if rot_90[y, x, 3] > 0:
                    ny = max(30, min(48, y + dy_shift))
                    nx = max(5, min(46, x + dx_shift))
                    fall[ny, nx] = rot_90[y, x]
    fall = fill_layer_pinholes(fall, x0=5, x1=46, y0=30, y1=49, require_3_neighbors=True)

    pil_stand = Image.fromarray(stand, mode="RGBA")
    rot_dash = np.array(
        pil_stand.rotate(-14.0, resample=Image.Resampling.NEAREST, center=(26, 38)),
        dtype=np.uint8,
    )
    dash = np.zeros((52, 52, 4), dtype=np.uint8)
    dys, _ = np.where(rot_dash[:, :, 3] > 0)
    if len(dys) > 0:
        d_shift = 48 - int(dys.max())
        for y in range(52):
            for x in range(52):
                if rot_dash[y, x, 3] > 0:
                    ny = max(4, min(48, y + d_shift))
                    nx = max(10, min(48, x))
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


def render_hand_sculpted_spear_dive(
    dive_angle_deg=16.0,
    cx=24.0,
    cy=25.0,
    phase=0.0,
    is_steep_dive=False,
    supercharged=True,
):
    """
    Pass 11: Hand-Sculpted Parametric Supersonic Diving Spear Samurai (`>--->>`):
    Instead of rotating a standing sprite with NEAREST (which breaks 1px lines and leaves an upright circular
    drum ring), this function hand-sculpts Kaze-Maru's ENTIRE body, pressed-together legs, billowing wolf-mane,
    swept-back V-chevron Raijin drums, forward-tucked horned Kabuto, locked gauntlets, 15px Thunder-Odachi
    spearhead, and Supersonic Mach-Cone V-Shockwings directly along `dive_angle_deg`!
    """
    canvas = np.zeros((52, 52, 4), dtype=np.uint8)
    rad = math.radians(dive_angle_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    # Normal vector pointing "up-back" perpendicular to the dive axis
    nx, ny = uy, -ux

    def to_xy(s, n):
        return cx + ux * s + nx * n, cy + uy * s + ny * n

    # 1. Swept-Back V-Chevron Raijin Taiko Drums & Slipstream Lightning Contrails (s = -18 .. -8)
    chevron_drums = [(-9.5, 6.2), (-9.5, -6.2), (-15.0, 8.2), (-15.0, -8.2)]
    for d_idx, (ds, dn) in enumerate(chevron_drums):
        dx_d, dy_d = to_xy(ds, dn)
        # Trailing contrail streak behind each drum
        for st in range(1, 7):
            sx_t, sy_t = to_xy(ds - st * 1.1, dn + math.sin(phase + st + d_idx) * 0.4)
            col_t = CYAN_LIGHT if st <= 2 else (VIOLET_BRIGHT if st % 2 == 0 else INDIGO_LIGHT)
            set_px(canvas, sx_t, sy_t, col_t)
        # 3x3 Raijin Drum with gold rim & white-cyan Tomoe core
        ix, iy = int(round(dx_d)), int(round(dy_d))
        for oy in (-1, 0, 1):
            for ox in (-1, 0, 1):
                if ox == 0 and oy == 0:
                    c_d = PURE_WHITE if (d_idx + int(round(phase * 2))) % 2 == 0 else CYAN_LIGHT
                elif abs(ox) + abs(oy) == 1:
                    c_d = GOLD_WHITE if ox + oy < 0 else BRASS_BRIGHT
                else:
                    c_d = BRASS_MID
                set_px(canvas, ix + ox, iy + oy, c_d)

    # 2. Tapered Aerodynamic Boots & Pressed-Together `Suneate` Shin-Greaves (s = -19 .. -7)
    for s_step in range(-38, -13):
        s = s_step * 0.5  # -19.0 .. -7.0
        u_leg = (s - (-19.0)) / 12.0  # 0 at boot tip -> 1 at hip
        hw = 1.0 + u_leg * 1.8
        n_steps = int(round(hw * 2.0)) + 1
        for ni in range(-n_steps, n_steps + 1):
            n = ni * 0.5
            if abs(n) > hw:
                continue
            px_l, py_l = to_xy(s, n)
            if abs(n) >= hw - 0.45:
                col_l = INDIGO_DEEP
            elif abs(s - (-17.5)) < 0.6:
                col_l = GOLD_WHITE if abs(n) < 0.6 else BRASS_BRIGHT  # Waraji gold boot strap
            elif abs(s - (-12.5)) < 0.7:
                col_l = PURE_WHITE if abs(n) < 0.5 else CYAN_BRIGHT   # Kikko knee guard glint
            elif abs(n) <= 0.45:
                col_l = CYAN_BRIGHT if s_step % 3 != 0 else CYAN_LIGHT  # Suneate lightning shin ridge
            elif n > 0:
                col_l = INDIGO_LIGHT
            else:
                col_l = INDIGO_DARK
            set_px(canvas, px_l, py_l, col_l)

    # 3. Streamlined `Kusazuri` Tassets, Golden `Obi` Sash & Storm-Core `Do` Breastplate (s = -7.0 .. +2.5)
    for s_step in range(-14, 6):
        s = s_step * 0.5  # -7.0 .. +2.5
        hw = 3.2 if s < -3.5 else (2.8 if s < -2.0 else 3.6)
        n_steps = int(round(hw * 2.0)) + 1
        for ni in range(-n_steps, n_steps + 1):
            n = ni * 0.5
            if abs(n) > hw:
                continue
            px_b, py_b = to_xy(s, n)
            if abs(n) >= hw - 0.45:
                col_b = BRASS_BRIGHT if (-1.0 <= s <= 2.0) else INDIGO_DEEP
            elif -3.2 <= s <= -2.0:
                # Golden-Violet Obi Waist Sash
                col_b = GOLD_WHITE if abs(n) <= 0.8 else (CAPE_LIGHT if ni % 2 == 0 else VIOLET_GLOW)
            elif s < -3.2:
                # Kusazuri Hip Tassets with cyan/gold lacing
                col_b = CYAN_BRIGHT if (s_step % 3 == 0 and abs(n) < 1.8) else (INDIGO_LIGHT if n > 0 else INDIGO_MID)
            else:
                # Storm-Core Do Breastplate with blazing white-cyan lightning veins
                is_vein = abs(n - math.sin(s * 1.2 + phase) * 1.1) < 0.65
                if is_vein:
                    col_b = PURE_WHITE if supercharged else CYAN_LIGHT
                elif abs(n) >= hw - 1.1:
                    col_b = CYAN_BRIGHT if n > 0 else VIOLET_BRIGHT  # Sode shoulder pauldron trim
                else:
                    col_b = INDIGO_MID if n > 0 else INDIGO_DARK
            set_px(canvas, px_b, py_b, col_b)

    # 4. Wind-Swept Silver Wolf-Mane Streaming Back from Kabuto (s = -9.0 .. +2.0, n = +2.2 .. +5.0)
    for m_step in range(22):
        u_m = m_step / 21.0
        ms = 2.0 - u_m * 11.0
        wave = math.sin(phase * 2.0 - u_m * 3.5) * (0.9 * u_m)
        mn_center = 2.6 + u_m * 1.6 + wave
        m_thick = (1.0 - u_m * 0.65) * 1.4
        for m_off in (-0.8, -0.3, 0.2, 0.7):
            if abs(m_off) <= m_thick:
                mx_p, my_p = to_xy(ms, mn_center + m_off)
                c_m = SILVER_WHITE if m_off > 0.1 else (SILVER_LIGHT if u_m < 0.6 else SILVER_MID)
                set_px(canvas, mx_p, my_p, c_m)

    # 5. Forward-Tucked Horned Kabuto Helm, Blazing Cyan Eye-Streak & Swept-Back Golden Crescent Horns (s = +1.5 .. +7.0)
    for s_step in range(3, 15):
        s = s_step * 0.5  # +1.5 .. +7.0
        hw = 2.6 * (1.0 - max(0.0, (s - 4.5) / 3.5) * 0.5)
        for ni in range(-5, 6):
            n = ni * 0.5
            if abs(n) > hw:
                continue
            hx_p, hy_p = to_xy(s, n)
            if 4.0 <= s <= 5.8 and -1.2 <= n <= 0.8:
                # Blazing Electric-Cyan Samurai Eyes & Visor Slit
                col_h = PURE_WHITE if abs(n) <= 0.4 else CYAN_LIGHT
            elif s >= 5.5:
                col_h = GOLD_WHITE if abs(n) <= 0.6 else INDIGO_LIGHT
            elif abs(n) >= hw - 0.5:
                col_h = INDIGO_DEEP
            else:
                col_h = INDIGO_LIGHT if n > 0 else INDIGO_DARK
            set_px(canvas, hx_p, hy_p, col_h)

    # Swept-Back Golden-Brass Crescent `Maedate` Kabuto Horns (sweeping from s = +6.5 back to s = -0.5, n = ±3.4)
    for h_i in range(15):
        u_h = h_i / 14.0
        hs = 6.5 - u_h * 7.0
        for side in (-1.0, 1.0):
            hn = side * (1.0 + u_h * 2.8)
            hx_c, hy_c = to_xy(hs, hn)
            col_hc = PURE_WHITE if u_h > 0.75 else (GOLD_WHITE if u_h > 0.35 else BRASS_BRIGHT)
            set_px(canvas, hx_c, hy_c, col_hc)

    # 6. Locked Two-Handed Gauntlets, Circular Raijin `Tsuba` & 15px Razor-Sharp Thunder-Odachi Spearhead (s = +5.5 .. +23.5)
    # Hilt & Gauntlets (s = +5.5 .. +8.5)
    for s_h in range(11, 18):
        s = s_h * 0.5
        for n_h in (-1.0, -0.5, 0.0, 0.5, 1.0):
            gx_p, gy_p = to_xy(s, n_h)
            col_g = CYAN_BRIGHT if abs(n_h) <= 0.3 else (BRASS_BRIGHT if s_h % 2 == 0 else INDIGO_DARK)
            set_px(canvas, gx_p, gy_p, col_g)

    # Ornate Circular Raijin Tsuba Guard at s = +8.5 (n = -2.5 .. +2.5)
    for n_t in (-2.5, -2.0, -1.5, -1.0, -0.5, 0.0, 0.5, 1.0, 1.5, 2.0, 2.5):
        tx_p, ty_p = to_xy(8.5, n_t)
        col_ts = GOLD_WHITE if abs(n_t) >= 2.0 else (CYAN_LIGHT if abs(n_t) >= 1.0 else BRASS_BRIGHT)
        set_px(canvas, tx_p, ty_p, col_ts)

    # 15px Razor-Sharp Diamond-White & Electric-Cyan Odachi Spear Blade (s = +9.0 .. +23.5)
    for b_step in range(18, 48):
        s = b_step * 0.5  # +9.0 .. +23.5
        u_b = (s - 9.0) / 14.5
        # Taper from hw = 1.5 down to a 1px needle kissaki tip at s = +23.5
        hw_b = max(0.0, 1.45 * (1.0 - u_b * 0.85))
        if u_b >= 0.82:
            bx_p, by_p = to_xy(s, 0.0)
            set_px(canvas, bx_p, by_p, PURE_WHITE)
            if u_b < 0.93:
                for side in (-0.5, 0.5):
                    sx_p, sy_p = to_xy(s, side)
                    set_px(canvas, sx_p, sy_p, CYAN_LIGHT)
        else:
            for nb in (-1.2, -0.6, 0.0, 0.6, 1.2):
                if abs(nb) <= hw_b + 0.2:
                    bx_p, by_p = to_xy(s, nb)
                    if abs(nb) <= 0.3:
                        col_bl = PURE_WHITE
                    elif nb > 0:
                        col_bl = CYAN_LIGHT if b_step % 2 == 0 else PURE_WHITE
                    else:
                        col_bl = CYAN_BRIGHT if b_step % 2 == 0 else VIOLET_BRIGHT
                    set_px(canvas, bx_p, by_p, col_bl)

    # 7. Supersonic Mach-Cone V-Shockwings & Twin Helical Lightning Ribbons Peeling Off the Spear Tip!
    wing_len = 22.0 if is_steep_dive else 19.0
    for w_step in range(int(wing_len * 2) + 1):
        d_back = w_step * 0.5
        u_w = d_back / wing_len
        ws = 23.5 - d_back
        spread = 0.4 + u_w * (6.2 if is_steep_dive else 5.2)
        for side in (-1.0, 1.0):
            wx_p, wy_p = to_xy(ws, side * spread)
            if d_back <= 4.0:
                col_w = PURE_WHITE
            elif d_back <= 11.0:
                col_w = CYAN_LIGHT if w_step % 2 == 0 else CYAN_BRIGHT
            else:
                col_w = VIOLET_BRIGHT if (w_step + int(side)) % 2 == 0 else VIOLET_GLOW
            set_px(canvas, wx_p, wy_p, col_w)
            # Inner glow band on shockwing
            if d_back >= 2.5 and w_step % 2 == 0:
                wx_in, wy_in = to_xy(ws, side * (spread - 0.7))
                set_px(canvas, wx_in, wy_in, CYAN_BRIGHT if side > 0 else VIOLET_GLOW)

    # Double-helix lightning spiraling down the length of the spear & body (s = -12 .. +21)
    for h_step in range(-24, 42):
        hs = h_step * 0.5
        u_h = (hs + 12.0) / 33.0
        amp = 2.2 + (1.0 - abs(u_h - 0.5) * 1.4) * 2.2
        hn1 = math.sin(u_h * math.pi * 4.0 - phase * 2.5) * amp
        hn2 = -hn1
        if h_step % 2 == 0:
            x1, y1 = to_xy(hs, hn1)
            set_px(canvas, x1, y1, PURE_WHITE if h_step % 6 == 0 else CYAN_LIGHT)
        else:
            x2, y2 = to_xy(hs, hn2)
            set_px(canvas, x2, y2, VIOLET_BRIGHT if h_step % 3 == 0 else CYAN_BRIGHT)

    # Piercing 4-point star glint at the needle tip (s = +23.5, n = 0)
    tip_x, tip_y = to_xy(23.5, 0.0)
    for d_star in (-2, -1, 0, 1, 2):
        set_px(canvas, tip_x + d_star, tip_y, PURE_WHITE if abs(d_star) <= 1 else CYAN_LIGHT)
        set_px(canvas, tip_x, tip_y + d_star, PURE_WHITE if abs(d_star) <= 1 else CYAN_LIGHT)

    return ensure_safe_cell(fill_layer_pinholes(canvas))


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
    1. Flowing silver kabuto topknot horsehair mane (`x = 10..24, y = 4..15`)
    2. Pulsing electric-cyan & violet armor lightning runes & glowing cyan kabuto eyes (`y = 9..36, x = 21..33`)
    3. Waist-worn lacquered Katana Scabbard (`Saya`) + flowing `Sageo` cord and 5-Drum Raijin Taiko Ring.
    """
    out = frame.copy()

    mane_mask = np.zeros((52, 52), dtype=bool)
    for y in range(4, 16):
        for x in range(10, 25):
            if out[y, x, 3] > 0:
                r, g, b, _ = out[y, x]
                if r > 115 and g > 115 and b > 130:
                    mane_mask[y, x] = True

    mane_src = out.copy()
    out[mane_mask] = 0
    for y in range(4, 16):
        for x in range(10, 25):
            if not mane_mask[y, x]:
                continue
            u_m = max(0.0, (24 - x) / 12.0)
            m_dy = int(round(math.sin(phase_rad - u_m * 2.5) * (0.9 * u_m)))
            ny = max(4, min(16, y + m_dy))
            out[ny, x] = mane_src[y, x]
            if u_m < 0.35 and out[y, x, 3] == 0:
                out[y, x] = mane_src[y, x]

    for y in range(9, 37):
        for x in range(21, 34):
            if out[y, x, 3] == 0:
                continue
            r, g, b, _ = out[y, x]
            if g > 175 and b > 205:
                if rune_pulse > 0.78:
                    out[y, x] = PURE_WHITE if (x + y) % 2 == 0 else CYAN_LIGHT
                elif rune_pulse > 0.45:
                    out[y, x] = CYAN_LIGHT if (x + y) % 2 == 0 else CYAN_BRIGHT
                else:
                    out[y, x] = CYAN_BRIGHT if (x + y) % 2 == 0 else VIOLET_BRIGHT

    out = draw_samurai_saya_and_raijin_drums(
        out,
        dy_offset=dy_offset,
        phase=phase_rad,
        sageo_wave=amplitude / 1.4,
        show_drums=show_drums,
        koiguchi_glint=koiguchi_glint,
    )
    return fill_layer_pinholes(out)


def solve_ik_elbow(sx, sy, hx, hy, L1=5.6, L2=5.4, bend_side=1.0):
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


def draw_ik_ronin_arm(layer, sx, sy, hx, hy, L1=5.8, L2=5.6, bend_side=1.0, is_rear=False):
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
    blade_len=17.5,
    rear_shoulder=(21, 18),
    lead_shoulder=(27, 19),
    draw_arms=True,
    slash_arc=None,
    cross_slash_arc=None,
    mach_cone=False,
    phase=0.0,
):
    """
    Pass 3: Renders Kaze-Maru's curved **Two-Handed Thunder-Odachi Great-Katana** (`~22.5px` total length):
    - `5px` wrapped `tsuka` hilt with golden `menuki` & `kashira` pommel cap
    - Ornate circular brass-and-cyan Raijin `tsuba` guard
    - Curved `17.5px` electric indigo-cyan & diamond-white katana blade with crackling lightning `hamon`
    - Optional 4-band curved crescent slash wave (`slash_arc`, `cross_slash_arc`) and aerodynamic
      V-shaped Supersonic Raijin Mach-Cone (`mach_cone=True` during diving Ultimate/Skill!).
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
    tip_x = tsuba_x + ux * eff_blade + px * (1.35 * sori_sign)
    tip_y = tsuba_y + uy * eff_blade + py * (1.35 * sori_sign)

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
    if max_y > 47.0:
        dy_fix = 47.0 - max_y
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
    tip_x += dx_fix
    tip_y += dy_fix

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

    # 3. Curved 17.5px Electric Indigo-Cyan & Pure-White Odachi Katana Blade with Lightning Hamon
    blade_steps = int(round(eff_blade * 3.0))
    for i in range(2, blade_steps + 1):
        u_b = i / float(blade_steps)
        sori_curve = (math.sin(u_b * math.pi * 0.85) * 1.15 + (u_b * u_b) * 0.55) * sori_sign
        bx = tsuba_x + ux * (u_b * eff_blade) + px * sori_curve
        by = tsuba_y + uy * (u_b * eff_blade) + py * sori_curve

        edge_vx = px * sori_sign
        edge_vy = py * sori_sign

        if u_b > 0.86:
            set_px(odachi_layer, bx, by, PURE_WHITE)
            set_px(odachi_layer, bx + edge_vx * 0.55, by + edge_vy * 0.55, CYAN_LIGHT)
        else:
            set_px(
                odachi_layer,
                bx - edge_vx * 0.75,
                by - edge_vy * 0.75,
                INDIGO_MID if (i % 4 == 0) else INDIGO_DARK,
            )
            hamon_wave = ((i + int(round(phase * 3.0))) % 4 == 0)
            c_hamon = (
                PURE_WHITE
                if (hamon_wave and glow_intensity >= 1.1)
                else (CYAN_BRIGHT if (i % 2 == 0) else VIOLET_BRIGHT)
            )
            set_px(odachi_layer, bx, by, c_hamon)
            c_edge = PURE_WHITE if (i % 3 != 0 or glow_intensity >= 1.05) else CYAN_LIGHT
            set_px(odachi_layer, bx + edge_vx * 0.75, by + edge_vy * 0.75, c_edge)

    # 4. Crackling Electric Cyan-Violet Sparks along the Odachi Blade & Tip
    if glow_intensity >= 0.8:
        num_sparks = 5 if glow_intensity >= 1.25 else 3
        for s_i in range(num_sparks):
            u_sp = ((s_i * 0.25 + phase / (2.0 * math.pi)) % 0.85) + 0.12
            sori_c = (math.sin(u_sp * math.pi * 0.85) * 1.15 + (u_sp * u_sp) * 0.55) * sori_sign
            spx = tsuba_x + ux * (u_sp * eff_blade) + px * (sori_c + (1.5 if s_i % 2 == 0 else -1.5))
            spy = tsuba_y + uy * (u_sp * eff_blade) + py * (sori_c + (1.5 if s_i % 2 == 0 else -1.5))
            set_px(fx_layer, spx, spy, PURE_WHITE if s_i == 0 else (CYAN_LIGHT if s_i % 2 == 0 else VIOLET_BRIGHT))

    # 5. Optional Supersonic V-Shaped Raijin Lightning Mach-Cone around the Diving Odachi Spearhead!
    if mach_cone:
        cone_steps = 16
        for c_i in range(cone_steps + 1):
            u_c = c_i / float(cone_steps)
            # Sweeps backward from the blade tip along two diverging shock-wings
            dist_back = u_c * 15.5
            spread = 1.2 + u_c * 6.8 + math.sin(u_c * math.pi * 2.0 - phase * 2.0) * 0.7
            cx_base = tip_x - ux * dist_back
            cy_base = tip_y - uy * dist_back
            for side in (-1.0, 1.0):
                wx = cx_base + px * (spread * side)
                wy = cy_base + py * (spread * side)
                if 3 <= wx <= 48 and 3 <= wy <= 47:
                    col_w = PURE_WHITE if u_c < 0.28 else (CYAN_LIGHT if c_i % 2 == 0 else VIOLET_BRIGHT)
                    set_px(fx_layer, wx, wy, col_w)
                    set_px(
                        fx_layer,
                        wx - px * (0.8 * side),
                        wy - py * (0.8 * side),
                        CYAN_BRIGHT if side > 0 else VIOLET_GLOW,
                    )
        # Bright 4-point diamond star at the piercing Kissaki tip
        for d_s in (-2, -1, 0, 1, 2):
            set_px(fx_layer, tip_x + d_s, tip_y, PURE_WHITE if abs(d_s) <= 1 else CYAN_LIGHT)
            set_px(fx_layer, tip_x, tip_y + d_s, PURE_WHITE if abs(d_s) <= 1 else CYAN_LIGHT)

    # 6. BOTH Rear IK Arm AND Lead IK Arm
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

    # 7. Curved 4-Band Electric White, Thunder-Cyan & Indigo-Violet Crescent Katana Slash Trail
    def render_4band_slash_arc(arc_tuple):
        a_start, a_end, _arc_r, arc_int = arc_tuple
        arc_steps = 52
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
            ay = max(4.0, min(47.0, piv_y + sa * r_uniform))
            set_px(fx_layer, ax, ay, PURE_WHITE if u_a > 0.4 else CYAN_LIGHT)
            set_px(
                fx_layer,
                max(4.0, min(47.5, ax - ca * 1.1)),
                max(4.0, min(47.0, ay - sa * 1.1)),
                CYAN_LIGHT if (k % 3 != 0) else PURE_WHITE,
            )
            if env > 0.32:
                set_px(
                    fx_layer,
                    max(4.0, min(47.5, ax - ca * 2.2)),
                    max(4.0, min(47.0, ay - sa * 2.2)),
                    CYAN_BRIGHT if (k % 2 == 0) else VIOLET_BRIGHT,
                )
                set_px(
                    fx_layer,
                    max(4.0, min(47.5, ax - ca * 3.3)),
                    max(4.0, min(47.0, ay - sa * 3.3)),
                    VIOLET_GLOW if (k % 2 == 0) else INDIGO_MID,
                )
            # Outer crackling lightning teeth along the crescent arc
            if k % 7 == 0 and env > 0.45:
                tx_out = max(3.5, min(48.0, ax + ca * 1.4))
                ty_out = max(3.5, min(47.5, ay + sa * 1.4))
                set_px(fx_layer, tx_out, ty_out, PURE_WHITE if k % 14 == 0 else CYAN_LIGHT)

    if slash_arc is not None:
        render_4band_slash_arc(slash_arc)
    if cross_slash_arc is not None:
        render_4band_slash_arc(cross_slash_arc)

    out = composite_over(canvas, rear_arm_layer)
    out = composite_over(out, odachi_layer)
    if angle_deg < -88.0:
        for yh in range(4, 16):
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
    if is_far_leg:
        c_edge = INDIGO_DEEP
        c_dark = INDIGO_DARK
        c_mid = INDIGO_MID
        c_hi = INDIGO_LIGHT
        c_lightning = CYAN_LIGHT
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
        pil_boot.rotate(boot_rot_deg, resample=Image.Resampling.NEAREST, center=(orig_cx, 45.0)),
        dtype=np.uint8,
    )
    for y in range(38, 50):
        for x in range(3, 50):
            if rot_boot[y, x, 3] > 0:
                ny = min(48, max(25, y + int(round(dy_boot))))
                nx = min(48, max(3, x + int(round(dx_boot))))
                px_col = rot_boot[y, x].copy()
                if is_far_leg:
                    px_col[0] = int(px_col[0] * 0.88)
                    px_col[1] = int(px_col[1] * 0.88)
                    px_col[2] = int(px_col[2] * 0.92)
                layer[ny, nx] = px_col

    for dy_k in (-1, 0, 1):
        for dx_k in (-2, -1, 0, 1, 2):
            if abs(dx_k) == 2 and abs(dy_k) == 1:
                continue
            if dx_k == 0 and dy_k <= 0:
                col_k = CYAN_LIGHT if not is_far_leg else GOLD_WHITE
            elif dy_k == -1 or abs(dx_k) == 2:
                col_k = c_hi
            else:
                col_k = c_mid
            set_px(layer, knee_x + dx_k, knee_y + dy_k, col_k)

    return fill_layer_pinholes(layer, x0=3, x1=49, y0=24, y1=49, require_3_neighbors=False)


def render_walk_ronin(tpl, f):
    """
    Row 1 helper: Smooth 30-frame 2-step Suriashi & Okuri-Ashi Samurai combat stride cycle:
    - Step A (`F00..F14`): Lead leg (`near_leg`) lifts and drives forward (`x = 31.5 -> 36.2 -> 32.5`) while
      rear leg (`far_leg`) braces and pushes back (`x = 22.0 -> 18.2 -> 20.5`).
    - Step B (`F15..F29`): Rear leg (`far_leg`) lifts its knee and glides forward (`x = 20.5 -> 24.5 -> 22.0`)
      while lead leg (`near_leg`) anchors in a strong Kendo front stance (`x = 32.5 -> 34.2 -> 31.5`),
      preserving a crisp wide athletic gap between both legs on every single frame (`F00..F29`)!
    """
    phase = (f / 30.0) * 2.0 * math.pi
    bob_y = int(round(math.cos(phase * 2.0) * 1.0))
    lean_dx = 1 if math.sin(phase * 2.0) > 0.25 else 0

    stand = tpl["stand"].copy()
    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    tasset_overlay = np.zeros((52, 52, 4), dtype=np.uint8)

    for y in range(0, 37):
        ny = y + bob_y
        if not (2 <= ny <= 49):
            continue
        min_tx = 10 if y < 16 else (18 if y < 28 else 20)
        max_tx = 36
        dx_row = lean_dx if y <= 26 else 0
        for x in range(min_tx, max_tx):
            if stand[y, x, 3] > 0:
                nx = min(48, x + dx_row)
                torso_layer[ny, nx] = stand[y, x]
                if 27 <= y <= 35 and 21 <= x <= 34:
                    tasset_overlay[ny, nx] = stand[y, x]

    # Continuous C-infinity Suriashi / Hayagake 2-step cycle across all 30 frames:
    # - F00..F14 (sin > 0): Lead leg (near_leg) glides forward (30.8 -> 35.6) with 1px knee/boot lift while rear leg pushes back (23.2 -> 18.8)
    # - F15..F29 (sin < 0): Rear leg (far_leg) glides forward (18.8 -> 23.2) with 1px knee/boot lift while lead leg pulls back (35.6 -> 30.8)
    stride = -math.cos(phase)
    s1 = math.sin(phase)

    near_lift = max(0.0, s1)
    far_lift = max(0.0, -s1)

    near_foot_x = 33.2 + stride * 2.4
    near_knee_x = 32.2 + stride * 2.0 + near_lift * 1.0
    far_foot_x = 21.0 - stride * 2.2
    far_knee_x = 21.8 - stride * 1.8 + far_lift * 1.0

    hip_y = 35.0 + bob_y

    far_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    far_lift_dy = -1 if far_lift > 0.35 else 0
    far_rot = (far_foot_x - 21.0) * 2.5 - far_lift * 6.0
    far_leg = _draw_samurai_armored_leg(
        far_layer,
        boot_patch=tpl["leg_back"],
        orig_cx=22.5,
        hip_x=22.5,
        hip_y=hip_y,
        knee_x=far_knee_x,
        knee_y=hip_y + 5.2 - far_lift * 1.0,
        ank_x=far_foot_x,
        ank_y=45.0 + far_lift_dy,
        dx_boot=far_foot_x - 22.5,
        dy_boot=far_lift_dy,
        boot_rot_deg=far_rot,
        is_far_leg=True,
    )

    near_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    near_lift_dy = -1 if near_lift > 0.35 else 0
    near_rot = (near_foot_x - 33.2) * 2.5 - near_lift * 6.0
    near_leg = _draw_samurai_armored_leg(
        near_layer,
        boot_patch=tpl["leg_front"],
        orig_cx=32.5,
        hip_x=31.5,
        hip_y=hip_y,
        knee_x=near_knee_x,
        knee_y=hip_y + 5.2 - near_lift * 1.0,
        ank_x=near_foot_x,
        ank_y=45.0 + near_lift_dy,
        dx_boot=near_foot_x - 32.5,
        dy_boot=near_lift_dy,
        boot_rot_deg=near_rot,
        is_far_leg=False,
    )

    out = composite_over(far_leg, torso_layer)
    out = composite_over(out, near_leg)
    out = composite_over(out, tasset_overlay)
    out = apply_cape_and_mane_wave(
        out, phase, amplitude=1.5, vertical_flutter=0.5, rune_pulse=0.75 + 0.15 * abs(s1), dy_offset=bob_y
    )
    return fill_layer_pinholes(out)


def make_crouch_ronin(tpl, crouch_depth):
    """Constructs Kaze-Maru's deep knee-bend Iai-Goshi samurai crouch anchored at y = 48."""
    stand = tpl["stand"]
    d = max(0, min(6, int(round(crouch_depth))))
    if d <= 0:
        return stand.copy()

    canvas = np.zeros((52, 52, 4), dtype=np.uint8)

    for ny in range(d, 29 + d):
        sy = ny - d
        if 0 <= sy <= 28 and 2 <= ny <= 49:
            canvas[ny, :] = stand[sy, :]

    span = max(1.0, float(45 - (29 + d)))
    for ny in range(29 + d, 46):
        u = (ny - (29 + d)) / span
        sy = int(round(28.0 + u * 17.0))
        sy = max(28, min(45, sy))
        knee_dx = 1 if (d >= 2 and 0.25 <= u <= 0.75) else 0
        for x in range(18, 50):
            if stand[sy, x, 3] > 0:
                nx = min(49, x + knee_dx)
                canvas[ny, nx] = stand[sy, x]

    for ny in range(46, 50):
        canvas[ny, :] = stand[ny, :]

    return fill_layer_pinholes(canvas)


def make_aerial_ronin(tpl, jump_dy, body_tilt_deg=0.0, leg_tuck=0.65, phase=0.0):
    """Row 8 helper: Constructs a full-body airborne Kaze-Maru posture with tucked knees."""
    stand = tpl["stand"].copy()
    dy_i = max(-5, min(2, int(round(jump_dy))))
    t = max(0.0, min(1.0, leg_tuck))

    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    tasset_overlay = np.zeros((52, 52, 4), dtype=np.uint8)

    lean_dx = 1 if body_tilt_deg > 5.0 else (-1 if body_tilt_deg < -5.0 else 0)
    for y in range(0, 37):
        ny = max(3, min(47, y + dy_i))
        dx = lean_dx if y <= 26 else 0
        min_tx = 10 if y < 16 else (18 if y < 28 else 20)
        max_tx = 36
        for x in range(min_tx, max_tx):
            if stand[y, x, 3] > 0:
                nx = max(2, min(48, x + dx))
                torso_layer[ny, nx] = stand[y, x]
                if 27 <= y <= 35 and 21 <= x <= 34:
                    tasset_overlay[ny, nx] = stand[y, x]

    hip_y = 35.0 + dy_i

    def build_aerial_leg(boot_patch, orig_cx, hip_x, knee_dx, knee_dy, foot_dx, foot_dy, boot_rot_deg, is_far_leg=False):
        layer = np.zeros((52, 52, 4), dtype=np.uint8)
        kx = hip_x + knee_dx
        ky = hip_y + knee_dy
        ax = orig_cx + foot_dx
        ay = 44.5 + foot_dy
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
        orig_cx=23.0,
        hip_x=23.0,
        knee_dx=-1.0 - 1.2 * t,
        knee_dy=4.0 - 2.0 * t,
        foot_dx=-0.8 - 1.2 * t,
        foot_dy=dy_i - 3.2 * t,
        boot_rot_deg=-12.0 * t,
        is_far_leg=True,
    )
    near_leg = build_aerial_leg(
        tpl["leg_front"],
        orig_cx=33.5,
        hip_x=31.0,
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


def draw_raijin_ground_sigil(canvas, f, intensity=1.0):
    """
    Draws a perspective-foreshortened Rotating 8-Point Raijin Lightning Floor Sigil (`y = 45..48, x = 11..41`)
    during Kaze-Maru's Ultimate Awakening & Impact frames.
    """
    sigil = np.zeros((52, 52, 4), dtype=np.uint8)
    cx, cy = 26.5, 46.8
    rx = 13.5 * min(1.0, 0.75 + 0.25 * intensity)
    ry = 1.65
    rot = (f / 30.0) * math.pi * 2.0

    for s in range(36):
        ang = (s / 36.0) * math.pi * 2.0 + rot
        px = int(round(cx + math.cos(ang) * rx))
        py = int(round(cy + math.sin(ang) * ry))
        if 4 <= px <= 48 and 44 <= py <= 49:
            col = PURE_WHITE if s % 6 == 0 else (CYAN_LIGHT if s % 2 == 0 else VIOLET_BRIGHT)
            sigil[py, px] = col

    for k in range(8):
        ang = rot + k * (math.pi / 4.0)
        vx = int(round(cx + math.cos(ang) * (rx + 1.2)))
        vy = int(round(cy + math.sin(ang) * (ry + 0.4)))
        if 4 <= vx <= 48 and 44 <= vy <= 49:
            sigil[vy, vx] = GOLD_WHITE if k % 2 == 0 else PURE_WHITE

    return composite_over(sigil, canvas)


def build_row0_idle(tpl):
    """
    Row 0 (`IDLE` - Low Coiled Iaido / Wakigamae Stance, 0..29):
    - Kaze-Maru holds his curved Odachi low and nearly horizontal near his hip scabbard (`angle_deg = -10° + 3° * sin(phase)`),
      poised for an instant Battoujutsu draw-cut with cyan lightning arcing between his blade and waist scabbard.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        base = tpl["stand"].copy()

        breath_dy = -1 if 8 <= f <= 20 else 0
        if breath_dy == -1:
            upper = base[4:32, 10:36].copy()
            base[3:31, 10:36] = upper
            base[31, 10:36] = upper[27, :]
            base = fill_layer_pinholes(base)

        pulse = 0.55 + 0.45 * math.sin(phase)
        glint = 0.55 if (f % 6 in (0, 1)) else 0.0
        base = apply_cape_and_mane_wave(
            base,
            phase,
            amplitude=1.4,
            vertical_flutter=0.5,
            rune_pulse=pulse,
            dy_offset=breath_dy,
            koiguchi_glint=glint,
        )

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
            blade_len=17.5,
            rear_shoulder=(21, 18 + breath_dy),
            lead_shoulder=(27, 19 + breath_dy),
            draw_arms=True,
            phase=phase,
        )

        arc_x0, arc_y0 = 21, 26 + breath_dy
        arc_x1 = 35 + (f % 8)
        arc_y1 = 25 + breath_dy - int(round(math.sin(phase) * 1.0))
        mid_x = (arc_x0 + arc_x1) // 2
        mid_y = arc_y0 - 2 + ((f // 2) % 3)
        draw_line_px(frame, arc_x0, arc_y0, mid_x, mid_y, CYAN_LIGHT if f % 2 == 0 else VIOLET_BRIGHT)
        draw_line_px(frame, mid_x, mid_y, arc_x1, arc_y1, PURE_WHITE if f % 3 == 0 else CYAN_BRIGHT)

        frames.append(frame)
    return frames


def build_row1_walk(tpl):
    """
    Row 1 (`WALK` - Smooth Gliding Samurai Suriashi & Hayagake Footwork, 30..59):
    - Smooth 30-frame 2-step stride with his Odachi held in a Low Trailing Side-Guard (`angle_deg = +14° + 6° * sin(phase)`).
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
            blade_len=17.0,
            rear_shoulder=(21, 18 + bob_y),
            lead_shoulder=(27, 19 + bob_y),
            draw_arms=True,
            phase=phase,
        )

        if 6 <= f <= 10:
            k = f - 6
            set_px(frame, 33 - k, 48, CYAN_LIGHT if k % 2 == 0 else VIOLET_BRIGHT)
            set_px(frame, 31 - k, 47, PURE_WHITE if k == 1 else CYAN_BRIGHT)
        elif 21 <= f <= 25:
            k = f - 21
            set_px(frame, 21 - k, 48, CYAN_LIGHT if k % 2 == 0 else VIOLET_BRIGHT)
            set_px(frame, 19 - k, 47, PURE_WHITE if k == 1 else VIOLET_BRIGHT)

        frames.append(frame)
    return frames


def build_row2_auto_attack(tpl):
    """
    Row 2 (`AUTO_ATTACK` - 3-Hit Sandan Battoujutsu & Crescent X-Slash Combo, 60..89):
    - `F00..F09`: Coiled hip-sheath windup -> blinding horizontal **Battoujutsu Draw-Cut (`angle_deg = -6°`)**
      with a curved 4-band electric crescent blade wave.
    - `F10..F19`: Rising diagonal **Kiriage Upper-Slash (`angle_deg` sweeping from `+35°` up to `-65°`)**.
    - `F20..F29`: **Iaido Judgment-Cut Crescent X-Slash** (`slash_arc` + `cross_slash_arc` + star flare, ZERO straight stick lines!).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi

        if f <= 3:
            crouch_d = [1, 2, 3, 3][f]
            base = make_crouch_ronin(tpl, crouch_d)
            base = apply_cape_and_mane_wave(
                base,
                phase * 1.5,
                amplitude=1.4,
                rune_pulse=0.85,
                dy_offset=crouch_d,
                koiguchi_glint=0.95,
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
                blade_len=17.0,
                rear_shoulder=(21, 18 + crouch_d),
                lead_shoulder=(27, 19 + crouch_d),
                draw_arms=True,
                phase=phase,
            )
            frames.append(frame)

        elif f <= 9:
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
            slash_arc = (-42.0, 22.0, 18.0, 1.0 if k <= 3 else 0.68) if k <= 4 else None
            frame = draw_two_handed_odachi(
                base,
                hand_x=hx_seq[k],
                hand_y=hy_seq[k],
                angle_deg=ang_seq[k],
                glow_intensity=1.45,
                scale=1.02,
                blade_len=17.5,
                rear_shoulder=(23, 18),
                lead_shoulder=(29, 19),
                draw_arms=True,
                slash_arc=slash_arc,
                phase=phase,
            )
            frames.append(frame)

        elif f <= 19:
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
                slash_arc = (ang_seq[k] - 8.0, 38.0, 18.0, arc_int)

            frame = draw_two_handed_odachi(
                base,
                hand_x=hx_seq[k],
                hand_y=hy_seq[k],
                angle_deg=ang_seq[k],
                glow_intensity=1.45 if 2 <= k <= 7 else 1.15,
                scale=1.03,
                blade_len=17.5,
                rear_shoulder=(22, 18 + crouch_d),
                lead_shoulder=(28, 19 + crouch_d),
                draw_arms=True,
                slash_arc=slash_arc,
                phase=phase,
            )
            frames.append(frame)

        else:
            k = f - 20  # 0..9
            if k <= 5:
                base = tpl["lunge"].copy()
                base = apply_cape_and_mane_wave(base, phase * 2.5, amplitude=2.0, rune_pulse=1.0)
                ang_seq = [-38.0, 14.0, 24.0, -18.0, -14.0, -12.0]
                hx_seq = [35, 36, 36, 35, 34, 33]
                hy_seq = [21, 24, 25, 24, 25, 25]
                slash1 = (-74.0, 32.0, 18.0, 1.0 if k <= 3 else 0.72)
                slash2 = (-38.0, 42.0, 16.0, 0.95 if k <= 3 else 0.68)
                frame = draw_two_handed_odachi(
                    base,
                    hand_x=hx_seq[k],
                    hand_y=hy_seq[k],
                    angle_deg=ang_seq[k],
                    glow_intensity=1.5,
                    scale=1.04,
                    blade_len=17.5,
                    rear_shoulder=(23, 18),
                    lead_shoulder=(29, 19),
                    draw_arms=True,
                    slash_arc=slash1,
                    cross_slash_arc=slash2,
                    phase=phase,
                )
                for d_f in (-2, -1, 0, 1, 2):
                    set_px(frame, 42 + d_f, 24, PURE_WHITE if abs(d_f) <= 1 else CYAN_LIGHT)
                    set_px(frame, 42, 24 + d_f, PURE_WHITE if abs(d_f) <= 1 else VIOLET_BRIGHT)
            else:
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
                    blade_len=17.5,
                    rear_shoulder=(21, 18),
                    lead_shoulder=(27, 19),
                    draw_arms=True,
                    phase=phase,
                )
            frames.append(frame)

    return frames


def build_row3_skill(tpl):
    """
    Row 3 (`SKILL` - Zantetsuken Aerodynamic Spear-Lunge & Noto Sheath Click, 90..119):
    - `F00..F06`: Deep Iaido sheath crouch (`crouch_depth = 4`, `angle_deg = -4°`) with lightning converging on his hip scabbard.
    - `F07..F20`: **Razor-Sharp Aerodynamic Zantetsuken Spear-Lunge** (`make_sharp_diving_ronin` / `tpl['dash']`)
      with a blazing Supersonic Mach-Cone & Crescent Slash Arc ahead of his blade and branching lightning behind his back
      (ZERO straight stick lines obscuring his chest!).
    - `F21..F29`: **Chiburi & Noto (Clicking the Odachi back into the hip scabbard)** with a blazing
      diamond-white star-glint at his hip `koiguchi` (`x = 22, y = 26`).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi

        if f <= 6:
            depths = [1, 2, 3, 4, 4, 4, 4]
            d = depths[f]
            u = f / 6.0
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
                blade_len=17.0,
                rear_shoulder=(21, 18 + d),
                lead_shoulder=(27, 19 + d),
                draw_arms=True,
                phase=phase,
            )
            if f >= 3:
                kx, ky = 22, 26 + d
                for a_i in range(3):
                    ox = kx + (a_i - 1) * 5 + (f % 2)
                    oy = ky - 4 + (a_i % 2) * 7
                    draw_line_px(frame, ox, oy, kx, ky, PURE_WHITE if a_i == 1 else CYAN_BRIGHT)
            frames.append(frame)

        elif f <= 20:
            k = f - 7  # 0..13
            if k <= 8:
                # F07..F15: Hand-Sculpted Supersonic Horizontal/Diagonal Spear-Lunge (`>--->>`)
                ang_seq = [6.0, 8.0, 11.0, 14.0, 12.0, 9.0, 12.0, 14.0, 8.0]
                cx_seq = [23.0, 24.0, 24.5, 25.0, 24.5, 24.0, 24.5, 24.5, 23.5]
                cy_seq = [26.0, 25.5, 25.0, 25.0, 25.5, 26.0, 25.0, 25.0, 26.0]
                frame = render_hand_sculpted_spear_dive(
                    dive_angle_deg=ang_seq[k],
                    cx=cx_seq[k],
                    cy=cy_seq[k],
                    phase=phase * 3.0,
                    is_steep_dive=False,
                    supercharged=True,
                )
            else:
                sk = k - 9  # 0..4
                base = shift_layer(tpl["dash"], dx=1, dy=0)
                base = apply_cape_and_mane_wave(
                    base, phase * 3.0, amplitude=2.0, vertical_flutter=0.8, is_dash=True, rune_pulse=1.0
                )
                draw_shunpo_branching_lightning(base, k)
                ang_seq = [-28.0, 12.0, 6.0, -4.0, -6.0]
                slash_arc = (-58.0, 32.0, 18.0, 0.92 if sk <= 2 else 0.65)
                frame = draw_two_handed_odachi(
                    base,
                    hand_x=34 - sk,
                    hand_y=24,
                    angle_deg=ang_seq[sk],
                    glow_intensity=1.45,
                    scale=1.02,
                    blade_len=17.5,
                    rear_shoulder=(23, 18),
                    lead_shoulder=(29, 19),
                    draw_arms=True,
                    slash_arc=slash_arc,
                    phase=phase,
                )
            frames.append(frame)

        else:
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
                blade_len=17.5,
                rear_shoulder=(21, 18),
                lead_shoulder=(27, 19),
                draw_arms=True,
                phase=phase,
            )

            if k <= 5:
                gx, gy = 23, 26
                star_r = 4 if k in (1, 2, 3) else 3
                for d_s in range(-star_r, star_r + 1):
                    set_px(frame, gx + d_s, gy, PURE_WHITE if abs(d_s) <= 2 else CYAN_LIGHT)
                    set_px(frame, gx, gy + d_s, PURE_WHITE if abs(d_s) <= 2 else CYAN_LIGHT)
                for dx_d, dy_d in [(-2, -2), (2, -2), (-2, 2), (2, 2), (-1, -1), (1, -1), (-1, 1), (1, 1)]:
                    set_px(frame, gx + dx_d, gy + dy_d, GOLD_WHITE if abs(dx_d) == 1 else CYAN_BRIGHT)

            frames.append(frame)

    return frames


def draw_susanoo_8drum_wheel(canvas, f, cx=24.0, cy=16.0, phase=0.0):
    """
    Row 4 Ultimate helper:
    Renders Kaze-Maru's blazing **8-Drum Raijin Thunder-Wheel** behind his shoulders
    linked by crackling cyan-violet lightning arcs.
    """
    bg_wheel = np.zeros((52, 52, 4), dtype=np.uint8)
    r_wheel = 11.2

    for s in range(48):
        ang = (s / 48.0) * 2.0 * math.pi + phase
        rx = max(4, min(47, int(round(cx + math.cos(ang) * r_wheel))))
        ry = max(4, min(46, int(round(cy + math.sin(ang) * r_wheel))))
        set_px(bg_wheel, rx, ry, CYAN_LIGHT if s % 3 == 0 else (CYAN_BRIGHT if s % 2 == 0 else VIOLET_GLOW))

    for d_i in range(8):
        da = (d_i / 8.0) * 2.0 * math.pi + phase
        dx_d = max(5, min(46, int(round(cx + math.cos(da) * r_wheel))))
        dy_d = max(5, min(45, int(round(cy + math.sin(da) * r_wheel))))
        for oy in (-1, 0, 1):
            for ox in (-1, 0, 1):
                if ox == 0 and oy == 0:
                    col_d = PURE_WHITE if (d_i + f) % 2 == 0 else CYAN_LIGHT
                elif abs(ox) + abs(oy) == 1:
                    col_d = GOLD_WHITE if (d_i % 2 == 0) else CYAN_BRIGHT
                else:
                    col_d = BRASS_BRIGHT
                set_px(bg_wheel, dx_d + ox, dy_d + oy, col_d)

    return composite_over(bg_wheel, canvas)


def build_row4_ultimate(tpl):
    """
    Row 4 (`ULTIMATE` - Susanoo Omnislash & Razor-Sharp Heaven-Split Dive, 120..149):
    Specifically designed so Kaze-Maru's WHOLE BODY transforms into a razor-sharp diving lightning spear (`>--->>`):
    - `F00..F04` (Phase 1 - Raijin Awakening & Skyward Launch Coil):
      Coils low (`crouch_d = 3 -> 4`) with his 8-Drum Raijin Thunder-Wheel & Floor Sigil blazing, then leaps skyward!
    - `F05..F13` (Phase 2 - Razor-Sharp Supersonic Diagonal Omnislash Dives):
      Hand-sculpted aerodynamic diving spear posture (`render_hand_sculpted_spear_dive`, `dive_angle_deg = +18°..+28°`)
      with swept-back V-chevron drums, pressed-together legs, forward-tucked horned Kabuto, locked two-handed
      15px Thunder-Odachi spearhead, and Supersonic Mach-Cone V-Shockwings!
    - `F14..F21` (Phase 3 - Steep `+34°..+42°` Heaven-Split Meteor Dive - `Amaterasu Plunge`):
      Pitches steeper into a razor-sharp downward Heaven-Split Dive (`is_steep_dive=True`), his whole body and
      two-handed Odachi pointed diagonally down-right like a thunderbolt javelin from the heavens!
    - `F22..F25` (Phase 4 - Thunder-Crater Impact Lunge & Shockwave Eruption):
      Lands in a deep forward Kendo split-lunge on the Rotating Raijin Lightning Floor Sigil (`y = 45..48`) as a
      massive crescent thunder-wave erupts!
    - `F26..F29` (Phase 5 - Grand `Noto` Scabbard Click & Return to Iaido Stance):
      Rises smoothly and clicks his Odachi into his waist `Saya` with a blazing diamond-white star flash!
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi

        if f <= 4:
            crouch_seq = [2, 3, 4, 2, 0]
            d = crouch_seq[f]
            u = f / 4.0
            base = make_crouch_ronin(tpl, d) if d > 0 else shift_layer(tpl["stand"], dx=1, dy=-2)
            base = apply_cape_and_mane_wave(
                base, phase * 2.5, amplitude=1.8, rune_pulse=1.0, dy_offset=d, show_drums=False
            )
            base = draw_susanoo_8drum_wheel(base, f, cx=24.0, cy=16.0 + d, phase=phase * 2.5)
            base = draw_raijin_ground_sigil(base, f, intensity=0.8 + 0.2 * u)

            ang_seq = [-10.0, -28.0, -52.0, -68.0, -24.0]
            hx_seq = [29, 28, 28, 30, 33]
            hy_seq = [26 + d, 24 + d, 22 + d, 19, 18]
            frame = draw_two_handed_odachi(
                base,
                hand_x=hx_seq[f],
                hand_y=hy_seq[f],
                angle_deg=ang_seq[f],
                glow_intensity=1.35 + 0.15 * u,
                scale=1.02,
                blade_len=17.5,
                rear_shoulder=(21, 18 + d),
                lead_shoulder=(27, 19 + d),
                draw_arms=True,
                phase=phase * 2.5,
            )
            frames.append(frame)

        elif f <= 13:
            # Phase 2 (F05..F13): Hand-Sculpted Razor-Sharp Supersonic Diagonal Omnislash Dives (`>--->>`)
            k = f - 5  # 0..8
            ang_seq = [18.0, 22.0, 26.0, 24.0, 20.0, 24.0, 28.0, 24.0, 20.0]
            cx_seq = [23.5, 24.0, 24.5, 24.0, 23.5, 24.0, 24.5, 24.0, 23.5]
            cy_seq = [24.0, 24.5, 25.0, 24.5, 24.0, 24.5, 25.0, 24.5, 24.0]
            frame = render_hand_sculpted_spear_dive(
                dive_angle_deg=ang_seq[k],
                cx=cx_seq[k],
                cy=cy_seq[k],
                phase=phase * 3.2,
                is_steep_dive=False,
                supercharged=True,
            )
            frames.append(frame)

        elif f <= 21:
            # Phase 3 (F14..F21): Hand-Sculpted Steep +34..+42 deg Heaven-Split Meteor Dive (`Susanoo Amaterasu Plunge`)!
            k = f - 14  # 0..7
            ang_seq = [32.0, 36.0, 40.0, 42.0, 42.0, 38.0, 34.0, 30.0]
            cx_seq = [23.0, 23.5, 24.0, 24.5, 24.5, 24.0, 23.5, 23.5]
            cy_seq = [23.0, 23.5, 24.0, 24.5, 24.5, 24.5, 24.0, 24.0]
            frame = render_hand_sculpted_spear_dive(
                dive_angle_deg=ang_seq[k],
                cx=cx_seq[k],
                cy=cy_seq[k],
                phase=phase * 3.6,
                is_steep_dive=True,
                supercharged=True,
            )
            frames.append(frame)

        elif f <= 25:
            # Phase 4 (F22..F25): Thunder-Crater Impact Lunge & Radial Lightning Shockwave Eruption
            k = f - 22  # 0..3
            crouch_d = [3, 3, 2, 1][k]
            base = make_crouch_ronin(tpl, crouch_d)
            base = apply_cape_and_mane_wave(
                base, phase * 2.5, amplitude=1.8, rune_pulse=1.0, dy_offset=crouch_d, show_drums=False
            )
            base = draw_susanoo_8drum_wheel(base, f, cx=24.0, cy=16.0 + crouch_d, phase=phase * 2.5)
            base = draw_raijin_ground_sigil(base, f, intensity=1.0)

            ang_seq = [18.0, 12.0, 4.0, -4.0]
            slash1 = (-64.0, 36.0, 18.0, 1.0 if k <= 2 else 0.7)
            slash2 = (-28.0, 44.0, 16.0, 0.9 if k <= 1 else 0.55)
            frame = draw_two_handed_odachi(
                base,
                hand_x=34 - k,
                hand_y=25 + crouch_d,
                angle_deg=ang_seq[k],
                glow_intensity=1.55,
                scale=1.02,
                blade_len=17.5,
                rear_shoulder=(22, 18 + crouch_d),
                lead_shoulder=(28, 19 + crouch_d),
                draw_arms=True,
                slash_arc=slash1,
                cross_slash_arc=slash2,
                phase=phase * 2.5,
            )
            frames.append(frame)

        else:
            # Phase 5 (F26..F29): Grand `Noto` Scabbard Click & Return to Coiled Iaido Stance
            k = f - 26  # 0..3
            u = (k + 1) / 4.0
            base = tpl["stand"].copy()
            base = apply_cape_and_mane_wave(
                base,
                phase,
                amplitude=1.5,
                rune_pulse=1.0 - u * 0.25,
                show_drums=True,
                koiguchi_glint=1.0 if k <= 2 else 0.4,
            )
            ang = -6.0 * (1.0 - u) + (-10.0) * u
            hx = int(round(27 * (1.0 - u) + 29 * u))
            hy = 26
            frame = draw_two_handed_odachi(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.3 - u * 0.25,
                scale=1.0,
                blade_len=17.5,
                rear_shoulder=(21, 18),
                lead_shoulder=(27, 19),
                draw_arms=True,
                phase=phase,
            )
            if k <= 2:
                gx, gy = 23, 26
                for d_s in range(-3, 4):
                    set_px(frame, gx + d_s, gy, PURE_WHITE if abs(d_s) <= 1 else CYAN_LIGHT)
                    set_px(frame, gx, gy + d_s, PURE_WHITE if abs(d_s) <= 1 else GOLD_WHITE)
            frames.append(frame)

    return frames


def build_row5_death(tpl):
    """
    Row 5 (`DEATH & HURT`, 150..179):
    - `F00..F06`: Hurt stagger with electric hit-sparks.
    - `F07..F17`: Progressive kneeling collapse bracing on Odachi.
    - `F18..F29`: Grounded horizontal prone collapse (`y = 30..48`, anchored on the floor at `y = 48`).
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
                set_px(frame, sx_s, sy_s, PURE_WHITE if sp == 0 else (CYAN_BRIGHT if sp % 2 == 0 else VIOLET_BRIGHT))
            frames.append(frame)

        elif f <= 17:
            u = (f - 7) / 10.0
            kneel_src = tpl["kneel"].copy()
            extra_drop = 0 if f <= 13 else (f - 13)
            base = np.zeros((52, 52, 4), dtype=np.uint8)
            for sy in range(8, 49):
                for sx in range(3, 48):
                    if kneel_src[sy, sx, 3] > 0:
                        if sy <= 36:
                            ny = min(47, sy + 1 + extra_drop)
                            nx = min(48, sx + (1 if (extra_drop >= 2 and sy <= 25) else 0))
                        else:
                            ny = min(48, sy + 1)
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
            fall_src = tpl["fall"].copy()
            frame = fall_src.copy()
            if k <= 2:
                frame = shift_layer(frame, dx=0, dy=-(2 - k))

            for hx_p in range(15, 21):
                set_px(frame, hx_p, 47, BRASS_BRIGHT if hx_p in (15, 18) else INDIGO_DARK)
            set_px(frame, 21, 46, BRASS_BRIGHT)
            set_px(frame, 21, 47, GOLD_WHITE if k <= 3 else CYAN_BRIGHT)
            set_px(frame, 21, 48, BRASS_MID)
            for bx_p in range(22, 45):
                set_px(frame, bx_p, 47, PURE_WHITE if (bx_p + k) % 5 == 0 else CYAN_LIGHT)
                set_px(frame, bx_p, 48, INDIGO_MID if bx_p % 2 == 0 else CYAN_DEEP)

            ember_x = 18 + k * 2
            ember_y = 33 + (k % 3)
            set_px(frame, min(44, ember_x), ember_y, PURE_WHITE if k <= 2 else (CYAN_BRIGHT if k <= 7 else VIOLET_GLOW))
            if k <= 6:
                set_px(frame, max(12, 36 - k * 2), 34 - (k % 2), VIOLET_BRIGHT if k % 2 == 0 else CYAN_LIGHT)
            frames.append(frame)

    return frames


def draw_shunpo_branching_lightning(canvas, k):
    """Row 6 helper: Draws jagged branching cyan-violet lightning bolts trailing behind Kaze-Maru."""
    bolt_roots = [
        (20, 15 + (k % 2)),
        (19, 23 - (k % 2)),
        (21, 32 + (k % 2)),
    ]
    for b_idx, (rx, ry) in enumerate(bolt_roots):
        cx, cy = float(rx), float(ry)
        for seg in range(4):
            nx = max(4.0, cx - 3.4)
            zig_dy = 2.2 if ((seg + b_idx + k) % 2 == 0) else -2.2
            ny = max(8.0, min(44.0, cy + zig_dy))
            col = PURE_WHITE if seg == 0 else (CYAN_BRIGHT if (seg + b_idx) % 2 == 0 else VIOLET_BRIGHT)
            draw_line_px(canvas, cx, cy, nx, ny, col)
            if seg == 1:
                fx = max(4.0, nx - 2.5)
                fy = max(8.0, min(44.0, ny + (2.5 if zig_dy > 0 else -2.5)))
                draw_line_px(canvas, nx, ny, fx, fy, CYAN_LIGHT if b_idx % 2 == 0 else VIOLET_GLOW)
            cx, cy = nx, ny


def build_row6_dash(tpl):
    """
    Row 6 (`DASH` - Shunpo Lightning Step, 180..209):
    - Low forward-leaning Shunpo blur with jagged branching cyan-violet lightning bolts trailing behind him.
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
                blade_len=17.5,
                rear_shoulder=(21, 18 + crouch_d),
                lead_shoulder=(27, 19 + crouch_d),
                draw_arms=True,
                phase=phase,
            )
            frames.append(frame)

        elif f <= 22:
            k = f - 3  # 0..19
            bob_dy = int(round(math.sin(k * 0.7) * 1.0))
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
                    blade_len=17.5,
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
                    blade_len=17.0,
                    rear_shoulder=(22, 18 + bob_dy),
                    lead_shoulder=(28, 19 + bob_dy),
                    draw_arms=True,
                    phase=phase,
                )
            frames.append(frame)

        else:
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
                blade_len=17.5,
                rear_shoulder=(21, 18 + crouch_d),
                lead_shoulder=(27, 19 + crouch_d),
                draw_arms=True,
                phase=phase,
            )
            if k <= 3:
                for bx in (22, 34):
                    set_px(frame, bx + 2 + k, 47, PURE_WHITE)
                    set_px(frame, bx + 1 + k, 46, CYAN_BRIGHT)
            frames.append(frame)
    return frames


def draw_dragon_lightning_counter_vortex(canvas, f, phase):
    """Row 7 helper (`F04..F14`): Renders a Coiling Cyan-Indigo Dragon-Lightning Counter-Vortex around Kaze-Maru's waist."""
    back_vortex = np.zeros((52, 52, 4), dtype=np.uint8)
    front_vortex = np.zeros((52, 52, 4), dtype=np.uint8)
    cx = 26.0
    cy = 30.5
    rx = 12.0
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
            col = PURE_WHITE
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
    - `F00..F14`: Deep Iai-Goshi Sheath Counter-Stance (`crouch_depth = 5`) + Coiling Dragon-Lightning Counter-Vortex.
    - `F15..F25`: Instant Lightning Blink-Afterimage & Critical Backstab Slash.
    - `F26..F29`: Smooth return to the low `-10°` standing Iaido stance.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi

        if f <= 14:
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
                hand_y=24 + d,
                angle_deg=ang,
                glow_intensity=1.15,
                scale=0.98,
                blade_len=17.0,
                rear_shoulder=(21, 18 + d),
                lead_shoulder=(27, 19 + d),
                draw_arms=True,
                phase=phase,
            )
            if f >= 4:
                frame = draw_dragon_lightning_counter_vortex(frame, f, phase)
            frames.append(frame)

        elif f <= 25:
            k = f - 15  # 0..10
            base = shift_layer(tpl["lunge"], dx=2, dy=0)
            base = apply_cape_and_mane_wave(
                base, phase * 2.5, amplitude=1.9, vertical_flutter=0.6, rune_pulse=1.0
            )

            if k <= 4:
                draw_shunpo_branching_lightning(base, k)

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
                blade_len=17.5,
                rear_shoulder=(23, 18),
                lead_shoulder=(29, 19),
                draw_arms=True,
                slash_arc=slash_arc,
                phase=phase,
            )

            if 1 <= k <= 5:
                cx_s, cy_s = 42, 21
                for d_s in range(-3, 4):
                    set_px(frame, cx_s + d_s, cy_s, PURE_WHITE if abs(d_s) <= 1 else CYAN_LIGHT)
                    set_px(frame, cx_s, cy_s + d_s, PURE_WHITE if abs(d_s) <= 1 else VIOLET_BRIGHT)
            frames.append(frame)

        else:
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
                blade_len=17.5,
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
    - Kaze-Maru leaps into the air and executes a Twin X-Shaped Swallow-Turn Aerial Slash (`Tsubame Gaeshi`)
      using two intersecting curved crescent blade waves (`slash_arc` + `cross_slash_arc`, ZERO straight sticks!).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 3:
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
                blade_len=17.5,
                rear_shoulder=(21, 18 + d),
                lead_shoulder=(27, 19 + d),
                draw_arms=True,
                phase=phase,
            )
            frames.append(frame)

        elif f <= 10:
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
                blade_len=17.0,
                rear_shoulder=(21, 18 + jump_dy),
                lead_shoulder=(27, 19 + jump_dy),
                draw_arms=True,
                phase=phase * 2.0,
            )
            frames.append(frame)

        elif f <= 20:
            k = f - 11  # 0..9
            jump_dy = -4 if k <= 6 else -3
            body = make_aerial_ronin(
                tpl, jump_dy=jump_dy, body_tilt_deg=10.0 if k <= 4 else -6.0, leg_tuck=0.85, phase=phase * 2.2
            )
            ang_seq = [-45.0, 12.0, 34.0, 28.0, -18.0, -52.0, -68.0, -62.0, -44.0, -26.0]
            hx_seq = [33, 35, 36, 35, 35, 34, 34, 33, 32, 31]
            hy_seq = [17, 20, 22, 22, 20, 18, 17, 18, 19, 20]

            slash1 = (-82.0, 34.0, 17.5, 1.0 if k <= 6 else 0.7)
            slash2 = (-64.0, 38.0, 15.5, 1.0 if 3 <= k <= 7 else 0.65) if k >= 2 else None

            frame = draw_two_handed_odachi(
                body,
                hand_x=hx_seq[k],
                hand_y=hy_seq[k] + jump_dy,
                angle_deg=ang_seq[k],
                glow_intensity=1.5,
                scale=1.02,
                blade_len=17.0,
                rear_shoulder=(21, 18 + jump_dy),
                lead_shoulder=(27, 19 + jump_dy),
                draw_arms=True,
                slash_arc=slash1,
                cross_slash_arc=slash2,
                phase=phase * 2.2,
            )

            if k >= 2:
                for d_g in (-1, 0, 1):
                    set_px(frame, 41 + d_g, 21, PURE_WHITE)
                    set_px(frame, 41, 21 + d_g, PURE_WHITE)

            frames.append(frame)

        elif f <= 23:
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
                blade_len=17.5,
                rear_shoulder=(21, 18 + jump_dy),
                lead_shoulder=(27, 19 + jump_dy),
                draw_arms=True,
                phase=phase,
            )
            frames.append(frame)

        else:
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
                blade_len=17.5,
                rear_shoulder=(21, 18 + d),
                lead_shoulder=(27, 19 + d),
                draw_arms=True,
                phase=phase,
            )
            frames.append(frame)
    return frames


def apply_pass12_vanguard_upgrades(cell_208, r_idx, f):
    """
    Pass 5 HD-2D 208x208 Sub-Pixel Star-Glint & Storm-Mote Polish:
    - Adds crisp 208x208 sub-pixel 4-point diamond release stars and ascending Raijin storm motes
      on active combat frames while enforcing the `[4..203]` safety margin.
    """
    out = cell_208.copy()

    def put208(x, y, col):
        if 8 <= x <= 199 and 8 <= y <= 199:
            out[y, x] = col

    def draw_star208(cx, cy, radius, core_col, ray_col):
        for dy in range(-1, 2):
            for dx in range(-1, 2):
                put208(cx + dx, cy + dy, core_col)
        for r in range(2, radius + 1):
            c = core_col if r <= 2 else ray_col
            put208(cx + r, cy, c)
            put208(cx - r, cy, c)
            put208(cx, cy + r, c)
            put208(cx, cy - r, c)

    # Sub-pixel release star glints on peak slash/dive frames
    if r_idx == 2 and f in (5, 6, 15, 16, 21, 22):
        draw_star208(168, 96, 6, PURE_WHITE, CYAN_LIGHT)
    elif r_idx == 3 and (8 <= f <= 24):
        sx = 156 if f <= 19 else 92
        sy = 92 if f <= 19 else 104
        draw_star208(sx + (f % 3) * 4, sy, 6, PURE_WHITE, GOLD_WHITE if f >= 21 else CYAN_LIGHT)
    elif r_idx == 4:
        # Ascending/diving Raijin storm-light motes across Ultimate frames
        for m in range(3):
            mx = 52 + ((f * 13 + m * 41) % 108)
            my = 164 - ((f * 9 + m * 37) % 128)
            col_m = PURE_WHITE if m == 0 else (CYAN_LIGHT if m == 1 else VIOLET_BRIGHT)
            draw_star208(mx, my, 4 + (m % 2), PURE_WHITE, col_m)

    out[:4, :, :] = 0
    out[204:, :, :] = 0
    out[:, :4, :] = 0
    out[:, 204:, :] = 0
    return out


def main():
    tpl = make_clean_templates()

    rows = [
        ("ROW 0: IDLE - LOW COILED IAIDO / WAKIGAMAE STANCE (30 FRAMES)", build_row0_idle(tpl)),
        ("ROW 1: WALK - SMOOTH GLIDING SURIASHI & HAYAGAKE STRIDE (30 FRAMES)", build_row1_walk(tpl)),
        ("ROW 2: AUTO_ATTACK - 3-HIT SANDAN BATTOUJUTSU & CRESCENT X-SLASH (30 FRAMES)", build_row2_auto_attack(tpl)),
        ("ROW 3: SKILL - ZANTETSUKEN AERODYNAMIC SPEAR-LUNGE & NOTO (30 FRAMES)", build_row3_skill(tpl)),
        ("ROW 4: ULTIMATE - SUSANOO OMNISLASH & RAZOR-SHARP HEAVEN-SPLIT DIVE (30 FRAMES)", build_row4_ultimate(tpl)),
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
        print(f"{r_name:76s}: 30 frames generated, {adj_diffs}/29 adjacent transitions distinct")

    print(
        f"Boundary clip audit across 270 frames: TOP={top_clips}, BOT={bot_clips}, LEFT={left_clips}, RIGHT={right_clips}, PINHOLES={pinhole_count}/270"
    )
    out_path = "/home/antigravity/pandora523/arcane-vs-steel/assets/sprites/ronin_sheet.png"
    sheet.save(out_path)
    print("Saved:", out_path, sheet.size)

    preview_cell = 96
    pad_top = 24
    dbg = Image.new("RGBA", (30 * preview_cell, num_rows * (preview_cell + pad_top)), (14, 18, 32, 255))
    draw = ImageDraw.Draw(dbg)
    for r_idx, (r_name, _) in enumerate(rows):
        y0 = r_idx * (preview_cell + pad_top)
        draw.rectangle([0, y0, 30 * preview_cell, y0 + pad_top - 2], fill=(24, 30, 54, 255))
        draw.text((8, y0 + 5), r_name, fill=(103, 232, 249, 255))
        for c_idx in range(30):
            x0 = c_idx * preview_cell
            draw.text((x0 + 4, y0 + 13), f"F{c_idx:02d}", fill=(167, 139, 250, 255))
            cell_crop = sheet.crop((c_idx * cell_px, r_idx * cell_px, (c_idx + 1) * cell_px, (r_idx + 1) * cell_px))
            p_im = cell_crop.resize((preview_cell, preview_cell), Image.Resampling.NEAREST)
            dbg.paste(p_im, (x0, y0 + pad_top), p_im)
            draw.rectangle(
                [x0, y0 + pad_top, x0 + preview_cell - 1, y0 + pad_top + preview_cell - 1],
                outline=(38, 46, 76, 255),
            )

    art_dir = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/3a4b2cf8-05c2-45a3-bb65-af6f5b5a1088"
    os.makedirs(art_dir, exist_ok=True)
    dbg.crop((0, 0, 15 * preview_cell, dbg.height)).save(f"{art_dir}/debug_ronin_30fps_left_F00_F14.png")
    dbg.crop((15 * preview_cell, 0, 30 * preview_cell, dbg.height)).save(f"{art_dir}/debug_ronin_30fps_right_F15_F29.png")
    print("Saved debug contact sheets in:", art_dir)


if __name__ == "__main__":
    main()
