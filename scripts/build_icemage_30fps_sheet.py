#!/usr/bin/env python3
"""
Builds Glacia's (IceMage - Cryo-Prism Sovereign) 30-Frame-Per-Animation HD-2D Sprite Sheet
with 9-Pass Hand-Refined Pixel Cluster Polish:
- 9 rows x 30 columns = 270 unique frames (6240 x 1872 at 208x208 per cell, 52x52 logical upscaled 4x NEAREST):
  * Row 0: IDLE - CRYO-PRISM SOVEREIGN & ROTATING BOREALIS HALO (30 frames)
  * Row 1: WALK - FIGURE-SKATING ICE-GLIDE & SWAYING SCEPTER-WAND (30 frames)
  * Row 2: AUTO_ATTACK - 30FPS CRYO-PRISM LANCE & REFRACTION ARC CAST (30 frames)
  * Row 3: SKILL - TRI-PRISM MATRIX CONJURATION & IMPLOSION (30 frames)
  * Row 4: ULTIMATE - ABSOLUTE ZERO: BOREALIS CATHEDRAL APOTHEOSIS (30 frames)
  * Row 5: DEATH & HURT - SHATTERED PRISMS, KNEEL & HORIZONTAL COLLAPSE (30 frames)
  * Row 6: DASH - AURORA RIFT FIGURE-SKATE GLIDE & ICE-STATUE ECHO (30 frames)
  * Row 7: CROUCH - KNEELING HEXAGONAL FROST-AEGIS MIRROR & LOW PRISM SHOT (30 frames)
  * Row 8: JUMP - AXEL FIGURE-SKATE VAULT & AERIAL PRISM REFRACTION (30 frames)
- 100% Original Silhouette & Design (ZERO Valkyrie wings, ZERO horizontal spear, ZERO traffic-cone/gravestone boxes):
  * Pass 1: 45px tall (`y = 4..48`) de-noised & cluster-refined pixel model (`refine_glacia_pixel_model`) with porcelain
    anime face, luminous 2px cyan-white eye, 5-spire diamond snowflake tiara, plush arctic fox-fur shoulder stole,
    snowflake-laced midnight-sapphire corset, asymmetric glacial silk train, and heeled silver-blue figure skates.
  * Pass 2: Crescent Borealis Snowflake Halo (`draw_borealis_snowflake_halo`) behind her head & shoulders.
  * Pass 3: Articulated Crystalline Borealis Scepter-Wand (`draw_borealis_scepter_wand`) with rotating 6-point Snowflake
    Prism Finial + Left Telekinetic Conjuring Arm (`draw_left_frost_arm`) with tailored floating cryo-relics.
  * Pass 4: Sweeping 3-band Borealis Pendulum Arcs (`draw_borealis_pendulum_trail`), Perspective 12-Point Snowflake
    Floor Sigils (`draw_permafrost_ground_sigil`), and Aurora Portal Rifts (`draw_aurora_portal_rift`).
  * Pass 5: 208x208 Sub-Pixel Star-Mote & Overdrive Polish (`apply_pass12_postprocess`).
"""

from collections import deque
import math
import os
import numpy as np
from PIL import Image, ImageDraw

# Luminous Cryo-Prism Sovereign Palette (Diamond-White, Frost-Cyan, Glacier-Sapphire, Aurora-Violet & Silver)
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


def draw_circle_px(buf, cx, cy, r, col, steps=24):
    for i in range(steps):
        a = (i / float(steps)) * 2.0 * math.pi
        set_px(buf, cx + math.cos(a) * r, cy + math.sin(a) * r, col)


def fill_layer_pinholes(layer, x0=2, x1=49, y0=2, y1=49, require_3_neighbors=False):
    """
    Fills 1px transparent pinholes/slits inside moved, waved, or rotated pixel layers
    so movement never causes missing interior pixels or torn seams.
    """
    out = layer.copy()
    for _ in range(2):
        prev = out.copy()
        alpha = prev[:, :, 3] > 0
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
                            out[y, x] = prev[y - 1, x]
                        elif lf:
                            out[y, x] = prev[y, x - 1]
                        elif dn:
                            out[y, x] = prev[y + 1, x]
                        elif rt:
                            out[y, x] = prev[y, x + 1]
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
    lo = max(2, int(margin))
    hi = 51 - lo
    out = cell.copy()
    for _ in range(2):
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
    return fill_layer_pinholes(out, lo, hi, lo, hi, require_3_neighbors=True)


def composite_over(base, over):
    res = base.copy()
    mask = over[:, :, 3] > 0
    res[mask] = over[mask]
    return res


def extract_clean_base_sprite(
    path="/home/antigravity/pandora523/arcane-vs-steel/assets/sprites/icemage_v2_base.jpg",
):
    """
    Pass 1A: Extracts `icemage_v2_base.jpg` (1024x1024), strips all exterior white background +
    enclosed pockets via BFS flood-fill, scales into a graceful 45px tall silhouette (`y = 4..48, x = 12..37`,
    matching Priestess, Chronomancer, and FireMage!), and plants both heeled figure-skating boots on `y = 48`.
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
    # Scale to 26x45 so Glacia stands 45px tall (y = 4..48), matching Chronomancer/Priestess/FireMage!
    scaled = crop.resize((26, 45), Image.Resampling.NEAREST)
    s_arr = np.array(scaled, dtype=np.uint8)

    cell = np.zeros((52, 52, 4), dtype=np.uint8)
    cell[4:49, 12:38] = s_arr

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

    # Plant back figure-skating boot (x=22..27, y=40..47) down +1px so BOTH boots plant firmly on y=48
    back_boot = cell[40:48, 22:28].copy()
    cell[41:49, 22:28] = back_boot
    cell[40, 22:28] = back_boot[0, :]

    return fill_layer_pinholes(cell)


def refine_glacia_pixel_model(cell):
    """
    Pass 1B: Hand-Refined 16-Bit HD-2D Pixel Cluster Upgrade on Glacia's 52x52 Base Character Model:
    1. Strips static lowered side-arms & stray skin blobs at the waist.
    2. De-noises isolated black/dark line-art speckles inside her silver-lavender hair, white fur stole,
       and sapphire-cyan gown caused by downsampling the 1024x1024 illustration.
    3. Hand-sculpts her 5-spire Crystalline Snowflake Tiara (`y = 4..8, x = 24..31`), porcelain anime face
       (`y = 9..13, x = 26..30`), luminous 2px Frost-Cyan & Pure-White eye (`(28, 10), (29, 10)`),
       plush Arctic Fox-Fur Shoulder Stole (`y = 14..18, x = 20..31`) with a Diamond Snowflake Brooch (`(28, 16)`),
       hourglass Snowflake Corset & Crystal Belt (`y = 19..26, x = 23..30`), flowing glacial gown pleats,
       and silver-blue heeled figure skates with glowing diamond-white ice blades at `y = 48`!
    """
    out = cell.copy()

    # 1. Strip static lowered right side-arm (x >= 31 for y = 18..31) and left side-hand (x = 18..22, y = 24..30)
    for y in range(18, 32):
        lim_x = 32 if y <= 19 else 30
        for x in range(lim_x + 1, 50):
            out[y, x] = (0, 0, 0, 0)

    for y in range(21, 31):
        for x in range(18, 24):
            if out[y, x, 3] == 0:
                continue
            r, g, b, _ = out[y, x]
            # Preserve flowing hair at y <= 24, x <= 20
            if y <= 24 and x <= 20 and b > 175 and r > 150:
                continue
            if x <= 20 and y >= 24:
                out[y, x] = (0, 0, 0, 0)
            elif x == 21 and y >= 22:
                out[y, x] = SAPPHIRE_DEEP
            elif x in (22, 23) and 21 <= y <= 28:
                out[y, x] = SAPPHIRE_MID if (x + y) % 2 == 0 else SAPPHIRE_DARK

    # 2. De-noise isolated black line-art speckles inside hair (y = 8..25, x = 13..24) and gown (y = 20..44, x = 13..34)
    #    where NEAREST sampling grabbed 1px dark ink lines surrounded by bright hair/fabric pixels.
    for _pass in range(2):
        src = out.copy()
        for y in range(8, 45):
            for x in range(13, 35):
                r, g, b, a = src[y, x]
                if a == 0:
                    continue
                lum = 0.299 * r + 0.587 * g + 0.114 * b
                # Check 4-connected neighbors
                nbrs = []
                for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                    nr, ng, nb, na = src[y + dy, x + dx]
                    if na > 0:
                        nbrs.append((nr, ng, nb, 0.299 * nr + 0.587 * ng + 0.114 * nb))
                if len(nbrs) >= 3:
                    avg_lum = sum(n[3] for n in nbrs) / len(nbrs)
                    # If this pixel is an isolated dark speckle inside a bright cluster, harmonize it!
                    if lum < 65 and avg_lum > 125:
                        if y <= 24 and x <= 23:
                            out[y, x] = AURORA_LAVENDER if (x + y) % 2 == 0 else SILVER_LIGHT
                        elif y <= 18:
                            out[y, x] = FUR_SHADOW
                        else:
                            out[y, x] = SAPPHIRE_MID if (x + y) % 2 == 0 else GLACIER_MID
                    elif lum < 45 and avg_lum > 85 and 18 <= y <= 39:
                        out[y, x] = SAPPHIRE_DARK if x <= 25 else SAPPHIRE_MID

    # 3. Hand-Sculpt 5-Spire Crystalline Snowflake Tiara & Crown Hair (y = 4..9, x = 23..31)
    #    Center diamond spire at x = 28, flanking cyan spires at x = 26 and x = 30
    set_px(out, 28, 4, PURE_WHITE)
    set_px(out, 28, 5, DIAMOND_WHITE)
    set_px(out, 26, 5, FROST_BRIGHT)
    set_px(out, 30, 5, FROST_BRIGHT)
    for tx, col in [(25, SILVER_LIGHT), (26, FROST_LIGHT), (27, DIAMOND_WHITE), (28, PURE_WHITE), (29, FROST_LIGHT), (30, FROST_CYAN)]:
        set_px(out, tx, 6, col)
    for tx, col in [(24, SILVER_MID), (25, SILVER_LIGHT), (26, FROST_CYAN), (27, FROST_LIGHT), (28, PURE_WHITE), (29, FROST_CYAN), (30, SAPPHIRE_BRIGHT)]:
        set_px(out, tx, 7, col)
    # Silver-white crown hair band under tiara (y = 8..9)
    for tx, col in [(23, SILVER_MID), (24, SILVER_LIGHT), (25, FUR_WHITE), (26, FUR_WHITE), (27, FROST_LIGHT), (28, FROST_CYAN), (29, FUR_WHITE), (30, SILVER_LIGHT)]:
        set_px(out, tx, 8, col)
    for tx, col in [(22, SILVER_MID), (23, FUR_WHITE), (24, FUR_WHITE), (25, SILVER_LIGHT), (26, SKIN_IVORY), (27, SKIN_IVORY), (28, SAPPHIRE_DARK), (29, SAPPHIRE_MID), (30, SILVER_LIGHT)]:
        set_px(out, tx, 9, col)

    # 4. Hand-Sculpt Crisp 16-Bit Anime Face & Luminous 2px Cyan-White Eye (y = 10..13, x = 25..30)
    #    y = 10: eye row gazing right (+X)
    set_px(out, 25, 10, SILVER_LIGHT)
    set_px(out, 26, 10, SKIN_IVORY)
    set_px(out, 27, 10, SKIN_IVORY)
    set_px(out, 28, 10, FROST_CYAN)
    set_px(out, 29, 10, PURE_WHITE)
    set_px(out, 30, 10, SILVER_MID)
    #    y = 11..12: porcelain cheek & nose profile
    for tx, col in [(25, SILVER_LIGHT), (26, SKIN_ROSE), (27, SKIN_IVORY), (28, SKIN_IVORY), (29, SKIN_IVORY), (30, SKIN_ROSE)]:
        set_px(out, tx, 11, col)
    for tx, col in [(25, SILVER_MID), (26, SKIN_ROSE), (27, SKIN_IVORY), (28, SKIN_ROSE), (29, SKIN_IVORY)]:
        set_px(out, tx, 12, col)
    #    y = 13: slender ivory neck & sapphire choker
    for tx, col in [(25, SILVER_MID), (26, SAPPHIRE_MID), (27, SKIN_ROSE), (28, SKIN_IVORY), (29, FROST_CYAN)]:
        set_px(out, tx, 13, col)

    # 5. Plush Clustered Arctic Fox-Fur Shoulder Stole & Diamond Snowflake Brooch (y = 14..18, x = 20..31)
    for y_f in range(14, 19):
        for x_f in range(20, 32):
            if y_f == 14 and 21 <= x_f <= 30:
                out[y_f, x_f] = FUR_WHITE if x_f >= 23 else SILVER_LIGHT
            elif y_f == 15 and 20 <= x_f <= 31:
                out[y_f, x_f] = PURE_WHITE if 24 <= x_f <= 29 else FUR_WHITE
            elif y_f == 16 and 20 <= x_f <= 31:
                out[y_f, x_f] = FUR_WHITE if (x_f % 2 == 0) else FROST_LIGHT
            elif y_f == 17 and 21 <= x_f <= 31:
                out[y_f, x_f] = FROST_LIGHT if 24 <= x_f <= 29 else FUR_SHADOW
            elif y_f == 18 and 22 <= x_f <= 30:
                out[y_f, x_f] = FUR_SHADOW if x_f != 28 else FROST_CYAN
    # Diamond Snowflake Collar Brooch at (28, 16)
    set_px(out, 28, 16, PURE_WHITE)
    for dx_b, dy_b in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        set_px(out, 28 + dx_b, 16 + dy_b, FROST_CYAN)

    # 6. Sculpted Midnight-Sapphire & Frost-Cyan Snowflake Corset & Crystal Waist Belt (y = 19..26, x = 23..30)
    for y_c in range(19, 26):
        for x_c in range(23, 31):
            if x_c == 23:
                out[y_c, x_c] = SAPPHIRE_DEEP
            elif x_c == 24:
                out[y_c, x_c] = SAPPHIRE_DARK
            elif x_c in (25, 26):
                out[y_c, x_c] = SAPPHIRE_MID if (x_c + y_c) % 2 == 0 else SAPPHIRE_BRIGHT
            elif x_c == 27:
                out[y_c, x_c] = GLACIER_MID
            elif x_c == 28:
                # Central snowflake corset lacing
                out[y_c, x_c] = PURE_WHITE if y_c in (20, 23, 25) else FROST_CYAN
            elif x_c == 29:
                out[y_c, x_c] = SAPPHIRE_BRIGHT if y_c % 2 == 0 else GLACIER_MID
            elif x_c == 30:
                out[y_c, x_c] = SAPPHIRE_DARK
    # Crystal Snowflake Waist Belt at y = 25..26
    for x_b, col_b in [(24, SAPPHIRE_BRIGHT), (25, FROST_CYAN), (26, FROST_LIGHT), (27, DIAMOND_WHITE), (28, PURE_WHITE), (29, FROST_LIGHT), (30, FROST_CYAN)]:
        set_px(out, x_b, 25, col_b)
    set_px(out, 28, 26, DIAMOND_WHITE)

    # 7. Clean Front-Slit Glacial Silk Skirt & Heeled Silver-Blue Figure Skates (y = 27..48)
    #    Remove any warm/pink skin pixels on the lower skirt/train (x <= 26 or x >= 31) so only the subtle thigh slit (x=27..29, y=30..33) has ivory
    for y_s in range(27, 45):
        for x_s in range(12, 36):
            r, g, b, a = out[y_s, x_s]
            if a == 0:
                continue
            if r > b and not (30 <= y_s <= 33 and 27 <= x_s <= 29):
                out[y_s, x_s] = FROST_LIGHT if r > 210 else SAPPHIRE_MID

    # Highlight the front figure-skating boot (x = 29..34, y = 41..48) and back boot (x = 23..27, y = 41..48)
    # with crisp silver-white ice-skate blades along the bottom row y = 48!
    for bx in range(23, 28):
        if out[47, bx, 3] > 0 or out[48, bx, 3] > 0:
            set_px(out, bx, 47, SAPPHIRE_MID if bx < 26 else FROST_CYAN)
            set_px(out, bx, 48, FROST_LIGHT if bx < 26 else DIAMOND_WHITE)
    for bx in range(29, 35):
        if out[47, bx, 3] > 0 or out[48, bx, 3] > 0:
            set_px(out, bx, 47, FROST_CYAN if bx < 32 else FROST_BRIGHT)
            set_px(out, bx, 48, PURE_WHITE if bx >= 31 else DIAMOND_WHITE)

    return fill_layer_pinholes(out)


def make_clean_templates():
    """
    Constructs Glacia's modular 52x52 anatomical templates from the Pass-1 refined model:
    - `stand`: 45px tall (`y = 4..48`) Cryo-Prism Sovereign with boots planted at `y = 48`
    - `stand_upper`: upper body, tiara, hair, fur stole, and glacial silk skirt (`y = 0..40`)
    - `leg_back` (`x = 21..28, y = 40..49`) and `leg_front` (`x = 28..36, y = 40..49`)
    - `lunge`: forward-leaning spellcast body (+2px upper torso lean)
    - `kneel`: dropped to one knee (`y + 5px`)
    - `fall`: 90-degree horizontally collapsed prone body anchored on the floor at `y = 38..48`
    - `dash`: forward-tilted (+11 deg) Figure-Skater Glide body
    """
    raw = extract_clean_base_sprite()
    stand = refine_glacia_pixel_model(raw)

    leg_back_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_front_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_back_patch[40:49, 21:28] = stand[40:49, 21:28]
    leg_front_patch[40:49, 28:36] = stand[40:49, 28:36]

    stand_upper = np.zeros((52, 52, 4), dtype=np.uint8)
    stand_upper[:40, :] = stand[:40, :]
    stand_upper[40:44, :22] = stand[40:44, :22]
    stand_upper = fill_layer_pinholes(stand_upper)

    lunge = np.zeros((52, 52, 4), dtype=np.uint8)
    lunge[34:49, :] = stand[34:49, :]
    for y in range(4, 34):
        dx = 2 if y <= 26 else 1
        for x in range(12, 47):
            if stand[y, x, 3] > 0 and x + dx <= 49:
                lunge[y, x + dx] = stand[y, x]
    lunge = fill_layer_pinholes(lunge)

    kneel = np.zeros((52, 52, 4), dtype=np.uint8)
    kneel[40:49, 17:37] = stand[40:49, 17:37]
    for y in range(4, 37):
        ny = y + 5
        if ny < 48:
            for x in range(12, 46):
                if stand[y, x, 3] > 0:
                    kneel[ny, x] = stand[y, x]
    kneel = fill_layer_pinholes(kneel)

    pil_body = Image.fromarray(stand, mode="RGBA")
    rot_90 = np.array(
        pil_body.rotate(-88.0, resample=Image.Resampling.NEAREST, center=(26, 31)),
        dtype=np.uint8,
    )
    ys, xs = np.where(rot_90[:, :, 3] > 0)
    fall = np.zeros((52, 52, 4), dtype=np.uint8)
    if len(ys) > 0:
        y_bot_core = int(np.percentile(ys, 92))
        dy_shift = 48 - y_bot_core
        dx_shift = 25 - int((xs.min() + xs.max()) // 2)
        for y in range(52):
            for x in range(52):
                if rot_90[y, x, 3] > 0:
                    ny = max(37, min(48, y + dy_shift))
                    nx = max(4, min(47, x + dx_shift))
                    fall[ny, nx] = rot_90[y, x]
    fall = fill_layer_pinholes(fall)

    pil_stand = Image.fromarray(stand, mode="RGBA")
    rot_dash = np.array(
        pil_stand.rotate(-11.0, resample=Image.Resampling.NEAREST, center=(26, 37)),
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
                    nx = max(12, min(48, x))
                    dash[ny, nx] = rot_dash[y, x]
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


def apply_hair_and_gown_wave(
    frame,
    phase_rad,
    amplitude=1.5,
    is_dash=False,
    rune_pulse=0.5,
):
    """
    Pass 2A: Animates Glacia's natural silver-white & icy-lavender hair (`x = 12..23, y = 9..25`)
    and her flowing asymmetric glacial gown train (`x = 11..23, y = 26..44`) with a smooth
    traveling sine wave (and ZERO artificial vertical blue pipe line!).
    """
    out = frame.copy()

    # 1. Flowing Silver-White & Icy-Lavender Hair wave behind neck/fur stole (x = 12..23, y = 9..25)
    hair_mask = np.zeros((52, 52), dtype=bool)
    for y in range(9, 26):
        for x in range(12, 24):
            if frame[y, x, 3] > 0:
                r, g, b, _ = frame[y, x]
                if b > 150 and r > 125 and g > 130:
                    hair_mask[y, x] = True

    hair_src = frame.copy()
    out[hair_mask] = 0
    for y in range(9, 26):
        dy_h = int(round(math.sin(phase_rad * 1.4 - (y - 9) * 0.35) * 0.6))
        dx_h = int(round((-0.8 if is_dash else 0.0) + math.cos(phase_rad - (y - 9) * 0.35) * 0.65))
        for x in range(12, 24):
            if not hair_mask[y, x]:
                continue
            nx = max(10, min(24, x + dx_h))
            ny = max(6, min(27, y + dy_h))
            out[ny, nx] = hair_src[y, x]
            if x >= 19 and out[y, x, 3] == 0:
                out[y, x] = hair_src[y, x]

    # 2. Flowing Glacial Gown Train wave (x = 11..22, y = 26..44) — natural fabric wave like Chronomancer's coat
    train_mask = np.zeros((52, 52), dtype=bool)
    for y in range(26, 45):
        for x in range(11, 22):
            if out[y, x, 3] > 0:
                train_mask[y, x] = True

    train_src = out.copy()
    out[train_mask] = 0
    for y in range(26, 45):
        u_t = (y - 26) / 18.0
        wave_x = (-1.2 * u_t if is_dash else 0.0) + math.sin(phase_rad - u_t * 2.6) * (amplitude * (0.25 + 0.75 * u_t))
        wave_y = math.cos(phase_rad * 1.2 - u_t * 2.2) * (0.5 * u_t)
        dx_t = int(round(wave_x))
        dy_t = int(round(wave_y))
        for x in range(11, 22):
            if not train_mask[y, x]:
                continue
            nx = max(9, min(23, x + dx_t))
            ny = max(25, min(46, y + dy_t))
            out[ny, nx] = train_src[y, x]
            if dx_t < 0 and x >= 18 and out[y, x, 3] == 0:
                out[y, x] = train_src[y, x]

    out = fill_layer_pinholes(out, x0=9, x1=37, y0=5, y1=47, require_3_neighbors=False)

    # 3. Pulsing Snowflake Tiara Gem & Corset Snowflake Embroidery
    if rune_pulse > 0.45:
        set_px(out, 28, 4, PURE_WHITE if rune_pulse > 0.75 else DIAMOND_WHITE)
        set_px(out, 28, 7, PURE_WHITE if rune_pulse > 0.70 else FROST_LIGHT)
        for rx_p, ry_p in [(28, 16), (28, 20), (28, 25), (26, 30), (24, 35), (21, 39)]:
            if out[ry_p, rx_p, 3] > 0:
                out[ry_p, rx_p] = PURE_WHITE if rune_pulse > 0.80 else FROST_BRIGHT

    return fill_layer_pinholes(out)


def draw_borealis_snowflake_halo(
    base_frame,
    cx=21.5,
    cy=13.5,
    radius=7.5,
    rot_rad=0.0,
    brightness=1.0,
    cathedral_crown=False,
    orbit_prisms=0,
):
    """
    Pass 2B: Renders Glacia's rotating Crescent Borealis Snowflake Halo (and optional Ultimate
    12-point Cathedral Rose-Window Ring + orbiting diamond Cryo-Prisms) BEHIND her head & shoulders
    (`composite_over(halo, base_frame)`), matching Chronomancer's delicate `draw_escapement_halo`!
    """
    halo = np.zeros((52, 52, 4), dtype=np.uint8)
    if brightness <= 0.30:
        return base_frame

    def scale_col(col, b):
        b_c = max(0.60, min(1.15, b))
        return (
            int(min(255, col[0] * b_c)),
            int(min(255, col[1] * b_c)),
            int(min(255, col[2] * b_c)),
            col[3],
        )

    c_hi = scale_col(PURE_WHITE if cathedral_crown else DIAMOND_WHITE, brightness)
    c_cyan = scale_col(FROST_BRIGHT if cathedral_crown else FROST_CYAN, brightness)
    c_lav = scale_col(AURORA_LAVENDER, brightness)
    c_sap = scale_col(SAPPHIRE_BRIGHT, brightness)

    cx_s = max(12.0, min(38.0, float(cx)))
    cy_s = max(12.0, min(38.0, float(cy)))
    r_s = min(float(radius), cy_s - 3.5)

    # 1. Delicate 1px Crystalline Snowflake Ring behind shoulders
    steps = 28
    step_stride = 2 if brightness < 0.65 else 1
    for i in range(0, steps, step_stride):
        a = (i / float(steps)) * 2.0 * math.pi + rot_rad
        set_px(halo, cx_s + math.cos(a) * r_s, cy_s + math.sin(a) * r_s, c_cyan if i % 2 == 0 else c_sap)
        if i % 4 == 0:
            set_px(halo, cx_s + math.cos(a) * (r_s - 1.2), cy_s + math.sin(a) * (r_s - 1.2), c_lav)

    # 2. 8 Rotating Snowflake Crystal Tips + 4 Inner Dendritic Spokes
    for k in range(8):
        ta = rot_rad + k * (math.pi * 0.25)
        tx = cx_s + math.cos(ta) * (r_s + 1.2)
        ty = cy_s + math.sin(ta) * (r_s + 1.2)
        set_px(halo, tx, ty, c_hi if k % 2 == 0 else c_cyan)
        if k % 2 == 0:
            draw_line_px(
                halo,
                cx_s + math.cos(ta) * 2.5,
                cy_s + math.sin(ta) * 2.5,
                cx_s + math.cos(ta) * (r_s - 1.0),
                cy_s + math.sin(ta) * (r_s - 1.0),
                c_sap,
            )

    # 3. Optional Ultimate Grand 12-Point Borealis Rose-Window Outer Ring behind the back
    if cathedral_crown:
        outer_rx = min(r_s + 4.2, cx_s - 3.5)
        outer_ry = min(r_s + 3.6, cy_s - 3.5)
        for s in range(40):
            a = (s / 40.0) * 2.0 * math.pi - rot_rad * 0.5
            set_px(halo, cx_s + math.cos(a) * outer_rx, cy_s + math.sin(a) * outer_ry, c_lav if s % 2 == 0 else c_cyan)
        for h_idx in range(12):
            ha = -math.pi * 0.5 + h_idx * (math.pi / 6.0) + rot_rad * 0.25
            hx = cx_s + math.cos(ha) * outer_rx
            hy = cy_s + math.sin(ha) * outer_ry
            set_px(halo, hx, hy, PURE_WHITE if h_idx % 2 == 0 else FROST_LIGHT)
            if h_idx % 3 == 0:
                set_px(
                    halo,
                    cx_s + math.cos(ha) * (outer_rx + 1.0),
                    max(2.0, cy_s + math.sin(ha) * (outer_ry + 1.0)),
                    FROST_BRIGHT,
                )

    # 4. Optional Orbiting Diamond Cryo-Prisms around the Halo
    for p_i in range(orbit_prisms):
        pa = -rot_rad * 1.8 + p_i * (2.0 * math.pi / max(1, orbit_prisms))
        gx = max(4.0, min(47.0, cx_s + math.cos(pa) * (r_s + 5.2)))
        gy = max(4.0, min(47.0, cy_s + math.sin(pa) * min(r_s + 3.5, cy_s - 4.5)))
        set_px(halo, gx, gy, PURE_WHITE)
        for dx_d, dy_d in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            set_px(halo, gx + dx_d, gy + dy_d, FROST_CYAN if p_i % 2 == 0 else AURORA_LAVENDER)

    return composite_over(halo, base_frame)


def solve_ik_elbow(sx, sy, hx, hy, L1=5.0, L2=4.8, bend_side=1.0):
    dx = float(hx - sx)
    dy = float(hy - sy)
    dist = max(0.8, math.hypot(dx, dy))
    max_reach = float(L1 + L2 - 0.15)
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


def draw_ik_glacia_arm(layer, sx, sy, hx, hy, L1=5.0, L2=4.8, bend_side=1.0):
    """
    Pass 3A: Draws Glacia's slender 2-bone IK Sapphire-Silk & Silver-Frost Sleeve Arm onto `layer`:
    - Plush white Arctic Fox-Fur shoulder cuff at `(sx, sy)` (`FUR_WHITE`, `FROST_LIGHT`)
    - Slender 3-tone sapphire-and-cyan sleeve (`SAPPHIRE_BRIGHT`, `SAPPHIRE_MID`, `SAPPHIRE_DARK`)
    - Diamond elbow jewel at `(ex, ey)` (`FROST_LIGHT`)
    - Graceful 2x2 porcelain hand (`SKIN_IVORY`, `FROST_BRIGHT` cuff) at `(hx, hy)`
    """
    ex, ey = solve_ik_elbow(sx, sy, hx, hy, L1=L1, L2=L2, bend_side=bend_side)

    u1x, u1y = ex - sx, ey - sy
    d1 = max(1.0, math.hypot(u1x, u1y))
    n1x, n1y = -u1y / d1, u1x / d1
    draw_line_px(layer, sx + n1x * 0.85, sy + n1y * 0.85, ex + n1x * 0.75, ey + n1y * 0.75, SAPPHIRE_DEEP)
    draw_line_px(layer, sx - n1x * 0.85, sy - n1y * 0.85, ex - n1x * 0.75, ey - n1y * 0.75, SAPPHIRE_DEEP)
    draw_line_px(layer, sx + n1x * 0.45, sy + n1y * 0.45, ex + n1x * 0.45, ey + n1y * 0.45, FROST_LIGHT)
    draw_line_px(layer, sx, sy, ex, ey, SAPPHIRE_MID)

    u2x, u2y = hx - ex, hy - ey
    d2 = max(1.0, math.hypot(u2x, u2y))
    n2x, n2y = -u2y / d2, u2x / d2
    draw_line_px(layer, ex + n2x * 0.85, ey + n2y * 0.85, hx + n2x * 0.75, hy + n2y * 0.75, SAPPHIRE_DEEP)
    draw_line_px(layer, ex - n2x * 0.85, ey - n2y * 0.85, hx - n2x * 0.75, hy - n2y * 0.75, SAPPHIRE_DEEP)
    draw_line_px(layer, ex + n2x * 0.45, ey + n2y * 0.45, hx + n2x * 0.45, hy + n2y * 0.45, FROST_CYAN)
    draw_line_px(layer, ex, ey, hx, hy, SAPPHIRE_BRIGHT)
    set_px(layer, (ex + hx) * 0.5, (ey + hy) * 0.5, FROST_LIGHT)

    # Plush Arctic Fox-Fur Shoulder Cuff at (sx, sy)
    ux1, uy1 = u1x / d1, u1y / d1
    for p_step in (-1.0, 0.0, 1.0):
        px_s = sx + ux1 * 0.7 + n1x * p_step
        py_s = sy + uy1 * 0.7 + n1y * p_step
        set_px(layer, px_s, py_s, FUR_WHITE if abs(p_step) > 0.4 else FROST_LIGHT)
        set_px(layer, sx + n1x * p_step, sy + n1y * p_step, FUR_SHADOW)
    set_px(layer, sx, sy - 1, PURE_WHITE)

    # Elbow crystal & 2x2 porcelain hand
    set_px(layer, ex, ey, FROST_LIGHT)
    set_px(layer, hx, hy, SKIN_IVORY)
    set_px(layer, hx + 1, hy, SKIN_IVORY)
    set_px(layer, hx, hy + 1, FROST_BRIGHT)
    set_px(layer, hx - (u2x / d2) * 0.8, hy - (u2y / d2) * 0.8, DIAMOND_WHITE)


def draw_left_frost_arm(
    base_frame,
    shoulder=(27.0, 18.0),
    hand=(31.0, 23.5),
    spin_rad=0.0,
    relic_mode="snowflake_ring",
    relic_progress=0.0,
    return_layers=False,
):
    """
    Pass 3B: Renders Glacia's articulated Left Telekinetic Conjuring Arm & Floating Cryo-Relic:
    - `snowflake_ring`: Delicate 3x3 rotating diamond snowflake ring at her fingertips (Idle/Walk)
    - `cryo_prism_shard`: Spinning faceted diamond Cryo-Prism lens (Auto-Attack)
    - `tri_prism_matrix`: Miniature triangular 3-prism laser matrix (Skill)
    - `skyward_glacier_star`: Ascending 6-point Borealis Star-Crystal (Ultimate)
    - `hex_frost_aegis`: Curved hexagonal diamond mirror-shield (Crouch)
    """
    arm_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    relic_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    sx = float(max(20.0, min(35.0, shoulder[0])))
    sy = float(max(12.0, min(33.0, shoulder[1])))
    hx = float(max(26.0, min(38.0, hand[0])))
    hy = float(max(9.0, min(36.0, hand[1])))

    ex, ey = solve_ik_elbow(sx, sy, hx, hy, L1=4.8, L2=4.6, bend_side=1.0)

    u1x, u1y = ex - sx, ey - sy
    d1 = max(1.0, math.hypot(u1x, u1y))
    n1x, n1y = -u1y / d1, u1x / d1
    draw_line_px(arm_layer, sx + n1x * 0.8, sy + n1y * 0.8, ex + n1x * 0.75, ey + n1y * 0.75, SAPPHIRE_DEEP)
    draw_line_px(arm_layer, sx - n1x * 0.8, sy - n1y * 0.8, ex - n1x * 0.75, ey - n1y * 0.75, SAPPHIRE_DEEP)
    draw_line_px(arm_layer, sx + n1x * 0.4, sy + n1y * 0.4, ex + n1x * 0.4, ey + n1y * 0.4, SAPPHIRE_MID)
    draw_line_px(arm_layer, sx, sy, ex, ey, SAPPHIRE_DARK)

    u2x, u2y = hx - ex, hy - ey
    d2 = max(1.0, math.hypot(u2x, u2y))
    n2x, n2y = -u2y / d2, u2x / d2
    draw_line_px(arm_layer, ex + n2x * 0.85, ey + n2y * 0.85, hx + n2x * 0.75, hy + n2y * 0.75, SAPPHIRE_DEEP)
    draw_line_px(arm_layer, ex - n2x * 0.85, ey - n2y * 0.85, hx - n2x * 0.75, hy - n2y * 0.75, SAPPHIRE_DEEP)
    draw_line_px(arm_layer, ex + n2x * 0.45, ey + n2y * 0.45, hx + n2x * 0.45, hy + n2y * 0.45, FROST_LIGHT)
    draw_line_px(arm_layer, ex, ey, hx, hy, GLACIER_MID)

    set_px(arm_layer, ex, ey, FROST_LIGHT)
    set_px(arm_layer, hx, hy, SKIN_IVORY)
    set_px(arm_layer, hx + 1, hy, SKIN_IVORY)
    set_px(arm_layer, hx, hy + 1, FROST_CYAN)

    # Off-Hand Telekinetic Cryo-Relic
    if relic_mode == "snowflake_ring":
        rcx = max(6.0, min(46.0, hx + 2.4))
        rcy = max(6.0, min(46.0, hy - 0.5))
        set_px(relic_layer, rcx, rcy, PURE_WHITE)
        for k in range(4):
            a_c = spin_rad + k * (math.pi * 0.5)
            set_px(
                relic_layer,
                rcx + math.cos(a_c) * 1.8,
                rcy + math.sin(a_c) * 1.8,
                DIAMOND_WHITE if k % 2 == 0 else FROST_CYAN,
            )
            a_l = a_c + math.pi * 0.25
            set_px(
                relic_layer,
                rcx + math.cos(a_l) * 1.4,
                rcy + math.sin(a_l) * 1.4,
                AURORA_LAVENDER,
            )

    elif relic_mode == "cryo_prism_shard":
        gcx = max(7.0, min(44.5, hx + 3.5 + relic_progress * 1.0))
        gcy = max(7.0, min(44.5, hy - 0.5))
        gr = 2.0 + relic_progress * 1.2
        draw_circle_px(relic_layer, gcx, gcy, gr, FROST_CYAN, steps=16)
        draw_circle_px(relic_layer, gcx, gcy, max(1.0, gr - 1.0), AURORA_LAVENDER, steps=12)
        set_px(relic_layer, gcx, gcy, PURE_WHITE)
        for k in range(6):
            ga = spin_rad * 2.5 + k * (math.pi / 3.0)
            set_px(
                relic_layer,
                gcx + math.cos(ga) * (gr + 0.9),
                gcy + math.sin(ga) * (gr + 0.9),
                PURE_WHITE if k % 2 == 0 else FROST_BRIGHT,
            )

    elif relic_mode == "tri_prism_matrix":
        hcx = max(8.0, min(43.5, hx + 4.4))
        hcy = max(9.0, min(41.0, hy - 0.5))
        tri_r = 3.2 + math.sin(relic_progress * math.pi) * 0.8
        pts = []
        for k in range(3):
            ta = spin_rad * 1.5 + k * (2.0 * math.pi / 3.0)
            pts.append((hcx + math.cos(ta) * tri_r, hcy + math.sin(ta) * tri_r))
        for k in range(3):
            p0 = pts[k]
            p1 = pts[(k + 1) % 3]
            draw_line_px(relic_layer, p0[0], p0[1], p1[0], p1[1], FROST_CYAN if k % 2 == 0 else AURORA_LAVENDER)
            set_px(relic_layer, p0[0], p0[1], PURE_WHITE)
        set_px(relic_layer, hcx, hcy, DIAMOND_WHITE)

    elif relic_mode == "skyward_glacier_star":
        pcx = max(7.0, min(44.0, hx + 0.5))
        pcy = max(5.5, min(42.0, hy - 2.8))
        pr = 2.0 + relic_progress * 0.8
        draw_circle_px(relic_layer, pcx, pcy, pr, FROST_CYAN, steps=12)
        set_px(relic_layer, pcx, pcy, PURE_WHITE)
        for k in range(6):
            pa = spin_rad * 2.0 + k * (math.pi / 3.0)
            set_px(
                relic_layer,
                pcx + math.cos(pa) * (pr + 1.0),
                pcy + math.sin(pa) * (pr + 1.0),
                PURE_WHITE if k % 2 == 0 else AURORA_LAVENDER,
            )

    elif relic_mode == "hex_frost_aegis":
        scx = max(8.0, min(43.5, hx + 4.4))
        scy = max(10.0, min(42.0, hy - 0.5))
        rx_s = 2.6 + 0.3 * math.sin(relic_progress * math.pi)
        ry_s = 5.2 + 0.4 * math.sin(relic_progress * math.pi)
        for s in range(24):
            a = (s / 24.0) * 2.0 * math.pi + spin_rad * 1.5
            set_px(
                relic_layer,
                scx + math.cos(a) * rx_s,
                scy + math.sin(a) * ry_s,
                FROST_CYAN if s % 2 == 0 else DIAMOND_WHITE,
            )
            set_px(
                relic_layer,
                scx + math.cos(a) * (rx_s * 0.65),
                scy + math.sin(a) * (ry_s * 0.65),
                AURORA_LAVENDER if s % 2 == 0 else SAPPHIRE_BRIGHT,
            )
        for k in range(6):
            ta = spin_rad * 2.0 + k * (math.pi / 3.0)
            set_px(
                relic_layer,
                scx + math.cos(ta) * (rx_s + 1.0),
                scy + math.sin(ta) * (ry_s + 0.9),
                PURE_WHITE if k % 2 == 0 else FROST_LIGHT,
            )
        set_px(relic_layer, scx, scy, PURE_WHITE)
        set_px(relic_layer, scx, scy - 1, FROST_LIGHT)
        set_px(relic_layer, scx, scy + 1, FROST_LIGHT)

    if return_layers:
        return arm_layer, relic_layer
    out = composite_over(base_frame, arm_layer)
    out = composite_over(out, relic_layer)
    return out


def draw_borealis_scepter_wand(
    base_frame,
    shoulder=(26.0, 17.0),
    grip=(35.5, 19.0),
    staff_tilt_deg=18.0,
    staff_angle_deg=None,
    finial_spin=0.0,
    flare=0.0,
    left_shoulder=None,
    left_hand=None,
    left_relic_mode="snowflake_ring",
    left_relic_progress=0.0,
    conjure_mode="none",
    mode_progress=0.0,
    shield_center=None,
):
    """
    Pass 3C: Renders Glacia's iconic **Crystalline Borealis Scepter-Wand** (`draw_borealis_scepter_wand`)
    AND her articulated Left Telekinetic Conjuring Arm (`draw_left_frost_arm`):
    - Slender silver-platinum, midnight-sapphire & frost-cyan scepter (`9.5px` upper stem, `8.0px` lower counter-shaft)
    - Hollow jewel-set **6-Pointed Snowflake Astrolabe Finial** (`SAPPHIRE_DEEP` inner aperture so the spinning
      cyan-white diamond star core pops with razor-sharp contrast like Chronomancer's astrolabe!)
    """
    wand_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    right_arm_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    fx_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    if staff_angle_deg is not None:
        angle_deg = float(staff_angle_deg)
    elif float(staff_tilt_deg) < -25.0:
        angle_deg = float(staff_tilt_deg)
    else:
        angle_deg = float(staff_tilt_deg) - 90.0

    rad = math.radians(angle_deg)
    ux = math.cos(rad)
    uy = math.sin(rad)
    px = -uy
    py = ux

    sx = float(max(20.0, min(35.0, shoulder[0])))
    sy = float(max(12.0, min(32.0, shoulder[1])))
    # Keep grip well in front of Glacia's face (x >= 35 on standing frames)
    gx = float(max(29.0, min(40.0, grip[0] + 1.2)))
    gy = float(max(13.0, min(34.0, grip[1])))

    if left_hand is None:
        left_hand = (max(30.0, min(34.0, gx - 3.0)), min(32.0, gy + 5.0))
    if left_shoulder is None:
        left_shoulder = (sx + 1.5, sy + 1.0)

    left_arm_layer, left_relic_layer = draw_left_frost_arm(
        base_frame,
        shoulder=left_shoulder,
        hand=left_hand,
        spin_rad=-finial_spin * 1.2,
        relic_mode=left_relic_mode,
        relic_progress=left_relic_progress,
        return_layers=True,
    )

    low_len = 8.5
    high_len = 9.5
    head_r = 3.6

    head_cx = gx + ux * high_len
    head_cy = gy + uy * high_len
    if head_cx > 44.5:
        scale_h = max(3.5, (44.5 - gx) / max(0.15, ux))
        high_len = min(high_len, scale_h)
    if head_cy < 6.5:
        scale_v = max(3.5, (gy - 6.5) / max(0.15, -uy))
        high_len = min(high_len, scale_v)
    if head_cy > 44.5:
        scale_v = max(3.5, (44.5 - gy) / max(0.15, uy))
        high_len = min(high_len, scale_v)

    head_cx = gx + ux * high_len
    head_cy = gy + uy * high_len
    bx = max(4.0, min(47.0, gx - ux * low_len))
    by = max(4.0, min(47.0, gy - uy * low_len))
    neck_x = gx + ux * max(2.0, high_len - head_r - 0.5)
    neck_y = gy + uy * max(2.0, high_len - head_r - 0.5)

    # 1. Beveled Silver-Sapphire & Frost-Cyan Scepter Shaft (dark sapphire shadow edge + bright silver/frost spine)
    steps = int(max(abs(neck_x - bx), abs(neck_y - by), 1) * 2)
    for i in range(steps + 1):
        t = i / float(steps)
        cx_s = bx + (neck_x - bx) * t
        cy_s = by + (neck_y - by) * t
        set_px(wand_layer, cx_s + px * 0.85, cy_s + py * 0.85, SAPPHIRE_DEEP)
        set_px(wand_layer, cx_s - px * 0.55, cy_s - py * 0.55, SAPPHIRE_DARK)
        set_px(wand_layer, cx_s, cy_s, DIAMOND_WHITE if i % 3 == 0 else FROST_CYAN)

    # Bottom Diamond Pommel & Cross-Guard Rings
    set_px(wand_layer, bx, by, FROST_CYAN)
    set_px(wand_layer, bx - ux * 0.8, by - uy * 0.8, PURE_WHITE)
    for r_dist in (-1.8, 2.2):
        rx_g = gx + ux * r_dist
        ry_g = gy + uy * r_dist
        set_px(wand_layer, rx_g + px * 0.9, ry_g + py * 0.9, FROST_LIGHT)
        set_px(wand_layer, rx_g - px * 0.9, ry_g - py * 0.9, SAPPHIRE_BRIGHT)

    # 2. Hollow Jewel-Set 6-Pointed Snowflake Astrolabe Finial at (head_cx, head_cy)
    #    Fill inner aperture with SAPPHIRE_DEEP so the cyan-white star core pops with high contrast!
    for dy_a in range(-3, 4):
        for dx_a in range(-3, 4):
            if dx_a * dx_a + dy_a * dy_a <= 8:
                set_px(wand_layer, head_cx + dx_a, head_cy + dy_a, SAPPHIRE_DEEP)

    ring_steps = 24
    for s in range(ring_steps):
        a = (s / float(ring_steps)) * 2.0 * math.pi
        rx = head_cx + math.cos(a) * head_r
        ry = head_cy + math.sin(a) * head_r
        set_px(wand_layer, rx, ry, DIAMOND_WHITE if s % 3 == 0 else (FROST_CYAN if s % 2 == 0 else SAPPHIRE_BRIGHT))

    # 4 Rotating Inner Snowflake Spokes + 6 Outer Crystal Points
    for k in range(6):
        ang = finial_spin + k * (math.pi / 3.0)
        set_px(
            wand_layer,
            head_cx + math.cos(ang) * 1.6,
            head_cy + math.sin(ang) * 1.6,
            FROST_CYAN if k % 2 == 0 else AURORA_LAVENDER,
        )
        tip_r = head_r + (1.3 if k % 2 == 0 else 0.9)
        tx = head_cx + math.cos(ang) * tip_r
        ty = head_cy + math.sin(ang) * tip_r
        set_px(wand_layer, tx, ty, PURE_WHITE if k % 2 == 0 else FROST_LIGHT)

    # Crisp 2x2 Cyan-White Core Jewel inside the dark-sapphire aperture
    set_px(wand_layer, head_cx, head_cy, PURE_WHITE)
    set_px(wand_layer, head_cx + 1, head_cy, FROST_CYAN)
    set_px(wand_layer, head_cx, head_cy - 1, FROST_LIGHT)

    # 3. Optional Radiant Snowflake Sunburst Flare at the Scepter Head
    if flare > 0.0:
        flare_r = head_r + 1.4 + flare * 1.8
        for k in range(6):
            fa = finial_spin * 0.5 + k * (math.pi / 3.0)
            r_cur = head_r + 1.0
            while r_cur <= flare_r:
                fx_p = max(3.0, min(48.0, head_cx + math.cos(fa) * r_cur))
                fy_p = max(3.0, min(48.0, head_cy + math.sin(fa) * r_cur))
                col = PURE_WHITE if r_cur < head_r + 1.6 else (FROST_BRIGHT if k % 2 == 0 else AURORA_LAVENDER)
                set_px(fx_layer, fx_p, fy_p, col)
                r_cur += 1.0

    # 4. Optional Conjured Spell Relics in front of the Scepter Head (`tri_matrix_seal` or `frost_aegis_shield`)
    if conjure_mode == "tri_matrix_seal":
        h_scale = max(0.25, min(1.0, float(mode_progress)))
        hcx = min(45.0, head_cx + 3.8)
        hcy = max(10.0, min(39.0, head_cy + 1.2))
        ring_r = 3.4 * h_scale
        for s in range(16):
            a = (s / 16.0) * 2.0 * math.pi + finial_spin * 1.5
            set_px(
                fx_layer,
                hcx + math.cos(a) * ring_r,
                hcy + math.sin(a) * ring_r,
                PURE_WHITE if s % 4 == 0 else (FROST_CYAN if s % 2 == 0 else AURORA_LAVENDER),
            )
        set_px(fx_layer, hcx, hcy, PURE_WHITE)

    elif conjure_mode == "frost_aegis_shield":
        s_scale = max(0.3, min(1.0, float(mode_progress)))
        if shield_center is not None:
            scx, scy = float(shield_center[0]), float(shield_center[1])
        else:
            scx = min(44.5, gx + 6.0)
            scy = max(14.0, min(40.0, gy + 1.5))
        rx_s = 2.8 * s_scale
        ry_s = 6.2 * s_scale
        for s in range(24):
            a = (s / 24.0) * 2.0 * math.pi + finial_spin
            set_px(
                fx_layer,
                scx + math.cos(a) * rx_s,
                scy + math.sin(a) * ry_s,
                DIAMOND_WHITE if s % 3 == 0 else (FROST_CYAN if s % 2 == 0 else SAPPHIRE_BRIGHT),
            )
            set_px(
                fx_layer,
                scx + math.cos(-a) * (rx_s * 0.58),
                scy + math.sin(-a) * (ry_s * 0.58),
                AURORA_LAVENDER if s % 2 == 0 else SAPPHIRE_MID,
            )
        set_px(fx_layer, scx, scy, PURE_WHITE)

    # 5. Right 2-Bone IK Arm gripping the Scepter-Wand at (gx, gy)
    draw_ik_glacia_arm(right_arm_layer, sx, sy, gx, gy, L1=5.2, L2=5.0, bend_side=1.0)

    out = composite_over(base_frame, left_arm_layer)
    out = composite_over(out, left_relic_layer)
    out = composite_over(out, wand_layer)
    out = composite_over(out, right_arm_layer)
    out = composite_over(out, fx_layer)
    return fill_layer_pinholes(out)


def draw_borealis_pendulum_trail(c, cx, cy, start_deg, end_deg, intensity=1.0):
    """
    Pass 4A: Renders a crisp 3-band Diamond-White, Frost-Cyan & Aurora-Lavender Crescent Arc + Snowflake Ticks
    tracing the sweeping path of Glacia's Borealis Scepter-Wand finial during `AUTO_ATTACK`, `SKILL`, and `ULTIMATE`.
    """
    if intensity <= 0.05:
        return c

    def set_arc_px(buf, px_x, px_y, col):
        ix = max(3, min(48, int(round(px_x))))
        iy = max(3, min(48, int(round(px_y))))
        buf[iy, ix] = col

    trail = np.zeros((52, 52, 4), dtype=np.uint8)
    a0 = float(start_deg)
    a1 = float(end_deg)
    if a1 < a0:
        a0, a1 = a1, a0
    span = max(8.0, a1 - a0)

    cx_f = float(cx) + 1.5
    r_outer = 9.4
    r_mid = 8.4
    r_inner = 7.4

    steps = max(18, int(round(span * 0.75)))
    for i in range(steps + 1):
        u = i / float(steps)
        deg = a0 + u * (a1 - a0)
        rad = math.radians(deg)
        ca = math.cos(rad)
        sa = math.sin(rad)

        if u >= 0.15:
            col_in = AURORA_LAVENDER if (u >= 0.68 and intensity >= 0.55) else SAPPHIRE_BRIGHT
            set_arc_px(trail, cx_f + ca * r_inner, cy + sa * r_inner, col_in)

        if u >= 0.08:
            col_mid = FROST_LIGHT if (u >= 0.80 and intensity >= 0.65) else (FROST_CYAN if u >= 0.25 else GLACIER_MID)
            set_arc_px(trail, cx_f + ca * r_mid, cy + sa * r_mid, col_mid)

        if u >= 0.78 and intensity >= 0.6:
            col_out = PURE_WHITE
        elif u >= 0.45:
            col_out = DIAMOND_WHITE if i % 2 == 0 else FROST_BRIGHT
        else:
            col_out = FROST_CYAN if i % 2 == 0 else AURORA_LAVENDER
        set_arc_px(trail, cx_f + ca * r_outer, cy + sa * r_outer, col_out)

    num_ticks = max(4, int(round(span / 16.0)))
    for t_i in range(num_ticks + 1):
        u_t = t_i / float(max(1, num_ticks))
        t_deg = a0 + u_t * (a1 - a0)
        t_rad = math.radians(t_deg)
        ca = math.cos(t_rad)
        sa = math.sin(t_rad)
        tick_col = PURE_WHITE if u_t >= 0.82 else (DIAMOND_WHITE if t_i % 2 == 0 else FROST_CYAN)
        set_arc_px(trail, cx_f + ca * (r_outer + 0.9), cy + sa * (r_outer + 0.9), tick_col)

    mask = trail[:, :, 3] > 0
    c[mask] = trail[mask]
    return c


def draw_permafrost_ground_sigil(
    base_frame,
    cx=26.0,
    cy=47.0,
    rx=12.5,
    ry=1.8,
    rot_rad=0.0,
    intensity=1.0,
    phase=0.0,
):
    """
    Pass 4B: Renders a perspective-flattened 12-Point Crystalline Snowflake Floor Sigil (`y = 45..48, x = 12..38`)
    beneath Glacia's figure skates with rotating snowflake spokes and rising diamond frost motes during
    Row 3 (`SKILL`), Row 4 (`ULTIMATE`), and Row 7 (`CROUCH`).
    """
    if intensity <= 0.05:
        return base_frame

    back_sigil = np.zeros((52, 52, 4), dtype=np.uint8)
    front_sigil = np.zeros((52, 52, 4), dtype=np.uint8)

    def set_sigil_px(buf, px_x, px_y, col, y_min=45, y_max=48):
        ix = max(12, min(39, int(round(px_x))))
        iy = max(y_min, min(y_max, int(round(px_y))))
        buf[iy, ix] = col

    rx_eff = min(12.5, float(rx) * (0.78 + 0.22 * min(1.0, intensity)))
    ry_eff = min(1.9, float(ry))

    steps = 36
    for s in range(steps):
        a = (s / float(steps)) * 2.0 * math.pi + rot_rad * 0.5
        ca = math.cos(a)
        sa = math.sin(a)
        target = front_sigil if sa >= 0.0 else back_sigil

        ox = cx + ca * rx_eff
        oy = cy + sa * ry_eff
        col_out = DIAMOND_WHITE if s % 3 == 0 else (FROST_CYAN if s % 3 == 1 else AURORA_LAVENDER)
        set_sigil_px(target, ox, oy, col_out)

        ix_r = cx + math.cos(-a * 1.4) * (rx_eff * 0.62)
        iy_r = cy + math.sin(-a * 1.4) * (ry_eff * 0.62)
        col_in = SAPPHIRE_BRIGHT if s % 2 == 0 else FROST_LIGHT
        set_sigil_px(target, ix_r, iy_r, col_in)

    for h_i in range(12):
        ha = rot_rad * 0.35 + h_i * (2.0 * math.pi / 12.0)
        ca = math.cos(ha)
        sa = math.sin(ha)
        target = front_sigil if sa >= -0.05 else back_sigil
        tx = cx + ca * (rx_eff + 0.9)
        ty = cy + sa * (ry_eff + 0.45)
        t_col = PURE_WHITE if h_i % 3 == 0 else (FROST_BRIGHT if h_i % 2 == 0 else AURORA_LAVENDER)
        set_sigil_px(target, tx, ty, t_col)

    set_sigil_px(front_sigil, cx, cy, PURE_WHITE)

    # Rising diamond frost motes above the Snowflake Sigil perimeter (x = 13..38, y = 39..47)
    num_motes = 6 if intensity >= 0.65 else 4
    for m_i in range(num_motes):
        m_ang = phase * 1.5 + m_i * (2.0 * math.pi / float(num_motes))
        mx = max(13, min(38, int(round(cx + math.cos(m_ang) * (rx_eff * 0.82)))))
        rise_u = (phase * 1.8 + m_i * 0.37) % 1.0
        my = max(39, min(47, int(round(47.0 - rise_u * 6.5))))
        m_col = PURE_WHITE if m_i % 3 == 0 else (FROST_CYAN if m_i % 3 == 1 else AURORA_LAVENDER)
        if base_frame[my, mx, 3] == 0:
            front_sigil[my, mx] = m_col
            if my + 1 <= 48 and base_frame[my + 1, mx, 3] == 0 and m_i % 2 == 0:
                front_sigil[my + 1, mx] = SAPPHIRE_BRIGHT

    out = composite_over(back_sigil, base_frame)
    out = composite_over(out, front_sigil)
    return out


def draw_aurora_portal_rift(
    base_frame,
    rcx=33.0,
    rcy=25.0,
    rx=3.6,
    ry=12.0,
    rot_rad=0.0,
):
    """
    Pass 4C: Renders a vertical Crystalline Borealis Portal Rift for Row 6 (`DASH`),
    split into `rift_back` and `rift_front` so Glacia's figure-skating glide passes cleanly through it!
    """
    rift_back = np.zeros((52, 52, 4), dtype=np.uint8)
    rift_front = np.zeros((52, 52, 4), dtype=np.uint8)
    cx = max(6.5, min(44.5, float(rcx)))
    cy = max(15.0, min(35.0, float(rcy)))
    rx_s = min(float(rx), cx - 3.0, 48.0 - cx)
    ry_s = min(float(ry), cy - 3.0, 48.0 - cy)

    for dy_i in range(int(-ry_s * 0.75), int(ry_s * 0.75) + 1):
        u_y = dy_i / max(1.0, ry_s * 0.75)
        half_w = int(round(rx_s * 0.65 * math.sqrt(max(0.0, 1.0 - u_y * u_y))))
        for dx_i in range(-half_w, half_w + 1):
            col = SAPPHIRE_DEEP if abs(dx_i) > 0 else GLACIER_MID
            set_px(rift_back, cx + dx_i, cy + dy_i, col)

    set_px(rift_back, cx, cy, PURE_WHITE)

    steps = 36
    for s in range(steps):
        a = (s / float(steps)) * 2.0 * math.pi + rot_rad
        ox = cx + math.cos(a) * rx_s
        oy = cy + math.sin(a) * ry_s
        ix = cx + math.cos(-a * 1.5) * (rx_s * 0.72)
        iy = cy + math.sin(-a * 1.5) * (ry_s * 0.78)
        target = rift_front if math.cos(a) > 0.15 else rift_back
        set_px(target, ox, oy, PURE_WHITE if s % 3 == 0 else (FROST_CYAN if s % 2 == 0 else AURORA_LAVENDER))
        set_px(target, ix, iy, FROST_LIGHT if s % 4 == 0 else (GLACIER_MID if s % 2 == 0 else SAPPHIRE_BRIGHT))

    for h_i in range(12):
        ha = -math.pi * 0.5 + h_i * (math.pi / 6.0)
        tx = cx + math.cos(ha) * (rx_s + 0.9)
        ty = cy + math.sin(ha) * (ry_s + 0.9)
        target = rift_front if math.cos(ha) > 0.0 else rift_back
        set_px(target, tx, ty, PURE_WHITE if h_i % 3 == 0 else FROST_BRIGHT)

    return rift_back, rift_front


def draw_frost_afterimage(base_frame, body_layer, dx_trail=-6, phase=0.0):
    """Renders a crystalline frost-statue afterimage echo behind Glacia during Row 6 (`DASH`)."""
    ghost = np.zeros((52, 52, 4), dtype=np.uint8)
    ix_off = int(round(dx_trail))
    for y in range(4, 49):
        for x in range(4, 46):
            if body_layer[y, x, 3] == 0:
                continue
            nx = x + ix_off
            if not (3 <= nx <= 48):
                continue
            is_edge = (
                x == 0
                or x == 51
                or body_layer[y, max(0, x - 1), 3] == 0
                or body_layer[y, min(51, x + 1), 3] == 0
                or body_layer[max(0, y - 1), x, 3] == 0
            )
            if is_edge:
                ghost[y, nx] = FROST_LIGHT if (y + nx) % 3 == 0 else FROST_CYAN
            elif (y + int(round(phase * 3.0))) % 2 == 0 and (x + y) % 2 == 0:
                ghost[y, nx] = AURORA_LAVENDER if y < 26 else SAPPHIRE_BRIGHT
    return composite_over(ghost, base_frame)


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
    """Draws Glacia's sapphire-silk thigh & knee-high silver-blue heeled figure-skating boot."""
    if is_far_leg:
        c_edge = SAPPHIRE_DEEP
        c_dark = SAPPHIRE_DARK
        c_mid = SAPPHIRE_MID
        c_hi = GLACIER_MID
        c_trim = FROST_CYAN
        c_knee = FROST_LIGHT
    else:
        c_edge = SAPPHIRE_DEEP
        c_dark = SAPPHIRE_MID
        c_mid = SAPPHIRE_BRIGHT
        c_hi = FROST_CYAN
        c_trim = FROST_LIGHT
        c_knee = PURE_WHITE

    for off_x, col in [
        (-1.6, c_edge),
        (-1.0, c_dark),
        (-0.4, c_mid),
        (0.2, c_hi),
        (0.8, c_trim),
        (1.4, c_edge),
    ]:
        draw_line_px(layer, hip_x + off_x, hip_y, knee_x + off_x * 0.9, knee_y, col)
        draw_line_px(layer, knee_x + off_x * 0.9, knee_y, ank_x + off_x * 0.85, ank_y, col)

    pil_boot = Image.fromarray(boot_patch, mode="RGBA")
    rot_boot = np.array(
        pil_boot.rotate(boot_rot_deg, resample=Image.Resampling.NEAREST, center=(orig_cx, 44.5)),
        dtype=np.uint8,
    )
    for y in range(38, 50):
        for x in range(3, 50):
            if rot_boot[y, x, 3] > 0:
                ny = min(48, max(24, y + int(round(dy_boot))))
                nx = min(48, max(3, x + int(round(dx_boot))))
                px_col = rot_boot[y, x].copy()
                if is_far_leg:
                    px_col[0] = int(px_col[0] * 0.82)
                    px_col[1] = int(px_col[1] * 0.84)
                    px_col[2] = int(px_col[2] * 0.88)
                layer[ny, nx] = px_col

    for dy_k in (-1, 0, 1):
        for dx_k in (-1, 0, 1):
            col_k = c_knee if (dy_k == -1 and dx_k == 0) else c_trim
            set_px(layer, knee_x + dx_k, knee_y + dy_k, col_k)

    return fill_layer_pinholes(layer, x0=3, x1=49, y0=22, y1=49, require_3_neighbors=False)


def render_walk_icemage(tpl, f):
    """Row 1 helper: Smooth 30-frame Figure-Skating Ice-Glide stride cycle (`F00..F14` Step A, `F15..F29` Step B)."""
    phase = (f / 30.0) * 2.0 * math.pi
    bob_y = int(round(math.cos(phase * 2.0) * 1.0))

    stand = tpl["stand"].copy()
    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    skirt_overlay = np.zeros((52, 52, 4), dtype=np.uint8)

    for y in range(0, 41):
        ny = y + bob_y
        if not (2 <= ny <= 49):
            continue
        min_tx = 12 if y < 26 else 18
        max_tx = 36
        for x in range(min_tx, max_tx):
            if stand[y, x, 3] > 0:
                torso_layer[ny, x] = stand[y, x]
                if (28 <= y <= 36 and 20 <= x <= 33) or (28 <= y <= 39 and 24 <= x <= 30):
                    skirt_overlay[ny, x] = stand[y, x]

    def build_striding_leg(boot_patch, orig_cx, hip_x, foot_base_x, swing_phase, is_far_leg=False):
        layer = np.zeros((52, 52, 4), dtype=np.uint8)
        s_val = math.sin(swing_phase)
        c_val = math.cos(swing_phase)

        knee_lift = max(0.0, c_val)
        hip_y = 35.5 + bob_y
        knee_x = hip_x + s_val * 2.2 + knee_lift * 1.1
        knee_y = hip_y + 4.5 - knee_lift * 1.6

        foot_target_x = foot_base_x + s_val * 2.5 - knee_lift * 0.7
        foot_lift_dy = bob_y - int(round(knee_lift * 1.8))
        boot_rot_deg = s_val * 8.0 - knee_lift * 10.0

        dx_boot = foot_target_x - orig_cx
        ank_x = foot_target_x + math.sin(math.radians(boot_rot_deg)) * 0.6
        ank_y = 44.5 + foot_lift_dy

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
        tpl["leg_back"], orig_cx=24.5, hip_x=24.5, foot_base_x=24.5, swing_phase=phase + math.pi, is_far_leg=True
    )
    near_leg = build_striding_leg(
        tpl["leg_front"], orig_cx=31.5, hip_x=30.5, foot_base_x=31.5, swing_phase=phase, is_far_leg=False
    )

    out = composite_over(far_leg, torso_layer)
    out = composite_over(out, near_leg)
    out = composite_over(out, skirt_overlay)
    out = apply_hair_and_gown_wave(out, phase, amplitude=1.4, rune_pulse=0.75)
    return fill_layer_pinholes(out)


def make_crouch_icemage(tpl, crouch_depth):
    """Constructs Glacia's compressed knee-bend posture (`d = 1..5`) via vertical compression on `tpl['stand']`."""
    stand = tpl["stand"]
    d = max(0, min(6, int(round(crouch_depth))))
    if d <= 0:
        return stand.copy()

    canvas = np.zeros((52, 52, 4), dtype=np.uint8)
    for ny in range(d, 31 + d):
        sy = ny - d
        if 0 <= sy <= 30 and 2 <= ny <= 49:
            canvas[ny, :] = stand[sy, :]

    span = max(1.0, float(46 - (31 + d)))
    for ny in range(31 + d, 46):
        u = (ny - (31 + d)) / span
        sy = int(round(30.0 + u * 16.0))
        sy = max(30, min(46, sy))
        knee_dx = 1 if (d >= 2 and 0.25 <= u <= 0.75) else 0
        for x in range(12, 50):
            if stand[sy, x, 3] > 0:
                nx = min(49, x + knee_dx)
                canvas[ny, nx] = stand[sy, x]

    for ny in range(46, 50):
        canvas[ny, :] = stand[ny, :]

    return fill_layer_pinholes(canvas)


def make_aerial_icemage(
    tpl,
    jump_dy,
    body_tilt_deg=0.0,
    leg_tuck=0.5,
    phase=0.0,
):
    """Constructs Glacia's airborne Figure-Skater posture (`jump_dy = -3..+2`) with tucked figure-skating legs."""
    stand = tpl["stand"].copy()
    dy_i = max(-3, min(3, int(round(jump_dy))))
    t = max(0.0, min(1.0, leg_tuck))

    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    skirt_overlay = np.zeros((52, 52, 4), dtype=np.uint8)

    lean_dx = 1 if body_tilt_deg > 5.0 else (-1 if body_tilt_deg < -5.0 else 0)
    for y in range(0, 40):
        ny = max(3, min(46, y + dy_i))
        dx = lean_dx if y <= 26 else 0
        min_tx = 12 if y < 26 else 18
        max_tx = 36
        for x in range(min_tx, max_tx):
            if stand[y, x, 3] > 0:
                nx = max(3, min(48, x + dx))
                torso_layer[ny, nx] = stand[y, x]
                if (28 <= y <= 36 and 20 <= x <= 33) or (28 <= y <= 39 and 24 <= x <= 30):
                    skirt_overlay[ny, nx] = stand[y, x]

    hip_y = 35.0 + dy_i

    def build_aerial_leg(boot_patch, orig_cx, hip_x, knee_dx, knee_dy, foot_dx, foot_dy, boot_rot_deg, is_far_leg=False):
        layer = np.zeros((52, 52, 4), dtype=np.uint8)
        kx = hip_x + knee_dx
        ky = hip_y + knee_dy
        ax = orig_cx + foot_dx
        ay = 44.0 + foot_dy
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
        orig_cx=24.5,
        hip_x=24.5,
        knee_dx=-1.0 - 1.0 * t,
        knee_dy=4.2 - 1.8 * t,
        foot_dx=-0.5 - 1.0 * t,
        foot_dy=dy_i - 3.5 - 2.2 * t,
        boot_rot_deg=-10.0 * t,
        is_far_leg=True,
    )
    near_leg = build_aerial_leg(
        tpl["leg_front"],
        orig_cx=31.5,
        hip_x=30.5,
        knee_dx=1.5 + 1.2 * t,
        knee_dy=3.8 - 2.2 * t,
        foot_dx=0.0 + 1.0 * t,
        foot_dy=dy_i - 3.5 - 3.0 * t,
        boot_rot_deg=-14.0 * t,
        is_far_leg=False,
    )

    out = composite_over(far_leg, torso_layer)
    out = composite_over(out, near_leg)
    out = composite_over(out, skirt_overlay)
    out = apply_hair_and_gown_wave(out, phase, amplitude=1.4, rune_pulse=0.9)
    return fill_layer_pinholes(out)


def build_row0_idle(tpl):
    """
    Row 0 (`IDLE` — `CRYO-PRISM SOVEREIGN & ROTATING BOREALIS HALO`, 30 frames):
    - Smooth breathing cycle (`dy = -1` on `F09..F20`), swaying silver-lavender hair & glacial gown train,
      rotating Crescent Borealis Snowflake Halo behind her shoulders (`draw_borealis_snowflake_halo`),
      and her Crystalline Borealis Scepter-Wand + off-hand Snowflake Ring (`draw_borealis_scepter_wand`).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        breath_dy = -1 if 9 <= f <= 20 else 0

        base = shift_layer(tpl["stand"], dx=0, dy=breath_dy)
        pulse = 0.60 + 0.40 * math.sin(phase)
        base = apply_hair_and_gown_wave(base, phase, amplitude=1.3, rune_pulse=pulse)
        base = draw_borealis_snowflake_halo(
            base, cx=21.5, cy=13.5 + breath_dy, radius=7.5, rot_rad=phase, brightness=0.95
        )

        gx = 34
        gy = 19 + breath_dy + (1 if f >= 22 else 0)
        tilt = 14.0 + math.sin(phase) * 3.5

        frame = draw_borealis_scepter_wand(
            base,
            shoulder=(25.5, 17.0 + breath_dy),
            grip=(gx, gy),
            staff_tilt_deg=tilt,
            finial_spin=phase,
            flare=0.25 if 12 <= f <= 18 else 0.0,
            left_shoulder=(27.0, 18.0 + breath_dy),
            left_hand=(31.0, 23.5 + breath_dy + math.cos(phase) * 0.6),
            left_relic_mode="snowflake_ring",
        )
        frames.append(frame)
    return frames


def build_row1_walk(tpl):
    """
    Row 1 (`WALK` — `FIGURE-SKATING ICE-GLIDE & SWAYING SCEPTER-WAND`, 30 frames):
    - Anatomical 30fps figure-skating stride (`render_walk_icemage`) with rotating Borealis Snowflake Halo,
      counter-swinging Crystalline Borealis Scepter-Wand, and shimmering ice-blade glints behind her heels.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        bob_y = int(round(math.cos(phase * 2.0) * 1.0))
        swing = math.sin(phase)

        body = render_walk_icemage(tpl, f)
        body = draw_borealis_snowflake_halo(
            body, cx=21.5, cy=13.5 + bob_y, radius=7.5, rot_rad=phase * 1.5, brightness=0.95
        )

        gx = int(round(34.0 - swing * 1.5))
        gy = int(round(19.0 + bob_y + swing * 0.8))
        tilt = 15.0 - swing * 10.0

        frame = draw_borealis_scepter_wand(
            body,
            shoulder=(25.5, 17.0 + bob_y),
            grip=(gx, gy),
            staff_tilt_deg=tilt,
            finial_spin=phase * 2.0,
            left_shoulder=(27.0, 18.0 + bob_y),
            left_hand=(31.0 + swing * 1.2, 23.5 + bob_y - swing * 0.8),
            left_relic_mode="snowflake_ring",
        )
        frames.append(frame)
    return frames


def build_row2_auto_attack(tpl):
    """
    Row 2 (`AUTO_ATTACK` — `30FPS CRYO-PRISM LANCE & REFRACTION ARC CAST`, 30 frames):
    - `F00..F09`: Wind-up & Cryo-Prism Charge (`staff_angle_deg` winds back from `-74°` to `-100°` while
      her left hand spins up a faceted `cryo_prism_shard`).
    - `F10..F18`: Forward Borealis Slash & Refraction Launch (`staff_angle_deg` sweeps forward to `-34°`
      with a 3-band `draw_borealis_pendulum_trail` crescent arc and radiant Snowflake Finial flare!).
    - `F19..F29`: Smooth recovery back to her regal idle stance.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 9:
            u = f / 9.0
            base = shift_layer(tpl["stand"], dx=-1 if f >= 4 else 0, dy=0)
            base = apply_hair_and_gown_wave(base, phase * 1.8, amplitude=1.5, rune_pulse=0.75 + 0.25 * u)
            base = draw_borealis_snowflake_halo(
                base, cx=21.0, cy=13.5, radius=7.5, rot_rad=-phase * 2.0, brightness=0.95 + 0.15 * u
            )
            ang = -74.0 - 26.0 * math.sin(u * math.pi * 0.5)
            frame = draw_borealis_scepter_wand(
                base,
                shoulder=(25.0, 17.0),
                grip=(33.0 - 1.5 * u, 18.5 - 2.0 * u),
                staff_angle_deg=ang,
                finial_spin=phase * 2.5,
                flare=0.45 * u,
                left_shoulder=(27.0, 18.0),
                left_hand=(33.0 + 1.5 * u, 21.0 - 2.0 * u),
                left_relic_mode="cryo_prism_shard",
                left_relic_progress=u,
            )
            frames.append(frame)

        elif f <= 18:
            u = (f - 10) / 8.0
            base = tpl["lunge"].copy()
            base = apply_hair_and_gown_wave(base, phase * 2.5, amplitude=1.8, rune_pulse=1.0)
            base = draw_borealis_snowflake_halo(
                base, cx=23.0, cy=13.5, radius=7.5, rot_rad=phase * 3.0, brightness=1.15
            )
            ang = -96.0 + 62.0 * math.sin(min(1.0, u * 1.25) * math.pi * 0.5)
            frame = draw_borealis_scepter_wand(
                base,
                shoulder=(27.0, 17.0),
                grip=(35.5, 18.0),
                staff_angle_deg=ang,
                finial_spin=phase * 3.5,
                flare=1.0 if f <= 15 else 0.55,
                left_shoulder=(28.5, 18.0),
                left_hand=(36.0, 20.0),
                left_relic_mode="cryo_prism_shard",
                left_relic_progress=1.0 - 0.5 * u,
            )
            frame = draw_borealis_pendulum_trail(
                frame, cx=33.0, cy=18.5, start_deg=-88.0, end_deg=ang + 18.0, intensity=1.0 - 0.35 * u
            )
            frames.append(frame)

        else:
            u = (f - 19) / 10.0
            base = (tpl["lunge"] if u < 0.35 else tpl["stand"]).copy()
            base = apply_hair_and_gown_wave(base, phase * 1.5, amplitude=1.4, rune_pulse=0.9 - 0.25 * u)
            base = draw_borealis_snowflake_halo(
                base, cx=21.5, cy=13.5, radius=7.5, rot_rad=phase, brightness=1.0
            )
            ang = -34.0 * (1.0 - u) + (-76.0) * u
            frame = draw_borealis_scepter_wand(
                base,
                shoulder=(25.5, 17.0),
                grip=(35.5 * (1.0 - u) + 34.0 * u, 18.5),
                staff_angle_deg=ang,
                finial_spin=phase * 1.5,
                flare=max(0.0, 0.35 * (1.0 - u)),
                left_shoulder=(27.0, 18.0),
                left_hand=(35.0 * (1.0 - u) + 31.0 * u, 20.5 * (1.0 - u) + 23.5 * u),
                left_relic_mode="snowflake_ring",
            )
            frames.append(frame)
    return frames


def build_row3_skill(tpl):
    """
    Row 3 (`SKILL` — `TRI-PRISM MATRIX CONJURATION & IMPLOSION`, 30 frames):
    - `F00..F06`: Glacia raises her Borealis Scepter-Wand (`-95°`) while a perspective 12-point
      Snowflake Floor Sigil (`draw_permafrost_ground_sigil`) blooms beneath her boots.
    - `F07..F20`: She conducts the Tri-Prism Laser Matrix (`conjure_mode='tri_matrix_seal'` + left-hand
      `tri_prism_matrix`) with sweeping Borealis Pendulum Arcs (`draw_borealis_pendulum_trail`).
    - `F21..F29`: Matrix implosion flash and graceful recovery.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 6:
            u = f / 6.0
            base = tpl["stand"].copy()
            base = apply_hair_and_gown_wave(base, phase * 2.0, amplitude=1.5, rune_pulse=0.85 + 0.15 * u)
            base = draw_borealis_snowflake_halo(
                base, cx=21.5, cy=13.5, radius=7.5, rot_rad=phase * 2.0, brightness=1.05
            )
            frame = draw_borealis_scepter_wand(
                base,
                shoulder=(25.5, 17.0),
                grip=(34.0, 18.0 - 2.0 * u),
                staff_angle_deg=-76.0 - 18.0 * u,
                finial_spin=phase * 2.5,
                flare=0.5 * u,
                left_shoulder=(27.0, 18.0),
                left_hand=(33.0 + 2.0 * u, 22.0 - 3.0 * u),
                left_relic_mode="tri_prism_matrix",
                left_relic_progress=u,
            )
            if f >= 2:
                frame = draw_permafrost_ground_sigil(
                    frame, cx=26.0, cy=47.0, rx=12.0, ry=1.8, rot_rad=phase, intensity=u, phase=phase
                )
            frames.append(frame)

        elif f <= 20:
            u = (f - 7) / 13.0
            base = tpl["lunge"].copy()
            base = apply_hair_and_gown_wave(base, phase * 2.5, amplitude=1.8, rune_pulse=1.0)
            base = draw_borealis_snowflake_halo(
                base, cx=23.0, cy=13.5, radius=7.5, rot_rad=phase * 3.0, brightness=1.15
            )
            ang = -94.0 + 52.0 * math.sin(u * math.pi * 0.85)
            frame = draw_borealis_scepter_wand(
                base,
                shoulder=(27.0, 17.0),
                grip=(35.5, 17.5),
                staff_angle_deg=ang,
                finial_spin=phase * 3.5,
                flare=0.95,
                left_shoulder=(28.5, 18.0),
                left_hand=(35.5, 19.5),
                left_relic_mode="tri_prism_matrix",
                left_relic_progress=1.0,
                conjure_mode="tri_matrix_seal",
                mode_progress=min(1.0, 0.5 + u * 0.8),
            )
            if f >= 10:
                frame = draw_borealis_pendulum_trail(
                    frame, cx=33.5, cy=18.0, start_deg=-84.0, end_deg=ang + 15.0, intensity=0.9
                )
            frame = draw_permafrost_ground_sigil(
                frame, cx=26.5, cy=47.0, rx=12.5, ry=1.8, rot_rad=phase * 1.5, intensity=1.0, phase=phase
            )
            frames.append(frame)

        else:
            u = (f - 21) / 8.0
            base = tpl["stand"].copy()
            base = apply_hair_and_gown_wave(base, phase * 1.5, amplitude=1.4, rune_pulse=0.95 - 0.25 * u)
            base = draw_borealis_snowflake_halo(
                base, cx=21.5, cy=13.5, radius=7.5, rot_rad=phase, brightness=1.0
            )
            frame = draw_borealis_scepter_wand(
                base,
                shoulder=(25.5, 17.0),
                grip=(34.5 * (1.0 - u) + 34.0 * u, 18.5),
                staff_angle_deg=-52.0 * (1.0 - u) + (-76.0) * u,
                finial_spin=phase * 2.0,
                flare=max(0.0, 0.6 * (1.0 - u)),
                left_shoulder=(27.0, 18.0),
                left_hand=(34.0 * (1.0 - u) + 31.0 * u, 20.5 * (1.0 - u) + 23.5 * u),
                left_relic_mode="snowflake_ring",
            )
            if f <= 23:
                frame = draw_permafrost_ground_sigil(
                    frame, cx=26.0, cy=47.0, rx=12.0, ry=1.8, rot_rad=phase, intensity=1.0 - u, phase=phase
                )
            frames.append(frame)
    return frames


def build_row4_ultimate(tpl):
    """
    Row 4 (`ULTIMATE` — `ABSOLUTE ZERO: BOREALIS CATHEDRAL APOTHEOSIS`, 30 frames):
    - ZERO traffic-cone triangle in the character cell! Instead, matches Chronomancer's Doomsday Clock:
      * Glacia invokes the Grand 12-Point Borealis Cathedral Rose-Window Halo (`cathedral_crown=True`,
        `orbit_prisms=3`) behind her shoulders while a radiant 12-Point Snowflake Sigil (`draw_permafrost_ground_sigil`)
        spins beneath her feet and her Borealis Scepter-Wand channels the Absolute Zero star-core overhead!
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 6:
            u = f / 6.0
            dy = -1 if f >= 3 else 0
            base = shift_layer(tpl["stand"], dx=0, dy=dy)
            base = apply_hair_and_gown_wave(base, phase * 2.2, amplitude=1.7, rune_pulse=0.95)
            base = draw_borealis_snowflake_halo(
                base,
                cx=21.5,
                cy=13.5 + dy,
                radius=7.5,
                rot_rad=phase * 2.5,
                brightness=1.15,
                cathedral_crown=True,
                orbit_prisms=2 if f >= 3 else 0,
            )
            frame = draw_borealis_scepter_wand(
                base,
                shoulder=(25.5, 17.0 + dy),
                grip=(34.0, 17.0 + dy - 2.0 * u),
                staff_angle_deg=-78.0 - 12.0 * u,
                finial_spin=phase * 3.0,
                flare=0.7 * u,
                left_shoulder=(27.0, 18.0 + dy),
                left_hand=(32.0, 18.0 + dy - 4.0 * u),
                left_relic_mode="skyward_glacier_star",
                left_relic_progress=u,
            )
            frame = draw_permafrost_ground_sigil(
                frame, cx=26.0, cy=47.0, rx=12.5, ry=1.9, rot_rad=phase * 2.0, intensity=0.5 + 0.5 * u, phase=phase
            )
            frames.append(frame)

        elif f <= 24:
            u = (f - 7) / 17.0
            dy = -1 if f <= 21 else 0
            base = shift_layer(tpl["lunge"] if 15 <= f <= 22 else tpl["stand"], dx=0, dy=dy)
            base = apply_hair_and_gown_wave(base, phase * 3.0, amplitude=1.9, rune_pulse=1.0)
            base = draw_borealis_snowflake_halo(
                base,
                cx=22.0,
                cy=13.5 + dy,
                radius=7.5,
                rot_rad=phase * 3.5,
                brightness=1.2,
                cathedral_crown=True,
                orbit_prisms=3,
            )
            ang = -92.0 if f <= 15 else (-92.0 + ((f - 15) / 9.0) * 56.0)
            frame = draw_borealis_scepter_wand(
                base,
                shoulder=(26.0, 17.0 + dy),
                grip=(35.0, 15.5 + dy if f <= 15 else 17.5 + dy),
                staff_angle_deg=ang,
                finial_spin=phase * 4.0,
                flare=1.0,
                left_shoulder=(27.5, 18.0 + dy),
                left_hand=(33.0 if f <= 15 else 35.5, 14.0 + dy if f <= 15 else 19.0 + dy),
                left_relic_mode="skyward_glacier_star" if f <= 15 else "tri_prism_matrix",
                left_relic_progress=1.0,
                conjure_mode="tri_matrix_seal" if 16 <= f <= 22 else "none",
                mode_progress=1.0,
            )
            if 16 <= f <= 23:
                frame = draw_borealis_pendulum_trail(
                    frame, cx=33.5, cy=17.5, start_deg=-88.0, end_deg=ang + 16.0, intensity=1.0
                )
            frame = draw_permafrost_ground_sigil(
                frame, cx=26.0, cy=47.0, rx=12.5, ry=1.9, rot_rad=phase * 2.5, intensity=1.0, phase=phase
            )
            frames.append(frame)

        else:
            u = (f - 25) / 4.0
            base = tpl["stand"].copy()
            base = apply_hair_and_gown_wave(base, phase, amplitude=1.4, rune_pulse=0.85)
            base = draw_borealis_snowflake_halo(
                base, cx=21.5, cy=13.5, radius=7.5, rot_rad=phase, brightness=1.0
            )
            frame = draw_borealis_scepter_wand(
                base,
                shoulder=(25.5, 17.0),
                grip=(34.0, 19.0),
                staff_angle_deg=-45.0 * (1.0 - u) + (-76.0) * u,
                finial_spin=phase,
                flare=0.3 * (1.0 - u),
                left_shoulder=(27.0, 18.0),
                left_hand=(31.0, 23.5),
                left_relic_mode="snowflake_ring",
            )
            if f <= 26:
                frame = draw_permafrost_ground_sigil(
                    frame, cx=26.0, cy=47.0, rx=11.5, ry=1.8, rot_rad=phase, intensity=0.5 * (1.0 - u), phase=phase
                )
            frames.append(frame)
    return frames


def build_row5_death(tpl):
    """
    Row 5 (`DEATH` — `SHATTERED PRISMS, KNEEL & HORIZONTAL COLLAPSE`, 30 frames):
    - `F00..F06`: Hit-stagger recoil with dimming Borealis Halo.
    - `F07..F17`: Progressive kneeling collapse (`tpl['kneel']`) as her Scepter-Wand lowers toward the floor.
    - `F18..F29`: Grounded horizontal collapse (`tpl['fall']`, `y = 37..48`) with her Crystalline Borealis
      Scepter-Wand lying flat on the floor (`y = 47..48`) and drifting pixel snowflakes (`29/29` distinct).
    """
    frames = []
    for f in range(30):
        if f <= 6:
            u = f / 6.0
            dx = -int(round(math.sin(u * math.pi * 0.85) * 2.0))
            dy = int(round(u * 2.0))
            base = shift_layer(tpl["stand"], dx=dx, dy=dy)
            base = apply_hair_and_gown_wave(base, u * math.pi, amplitude=1.4, rune_pulse=0.45)
            base = draw_borealis_snowflake_halo(
                base, cx=21.5 + dx, cy=13.5 + dy, radius=7.5, rot_rad=u * 2.0, brightness=0.85 - 0.35 * u
            )
            frame = draw_borealis_scepter_wand(
                base,
                shoulder=(25.5 + dx, 17.0 + dy),
                grip=(33.0 + dx, 20.0 + dy),
                staff_angle_deg=-65.0 + 25.0 * u,
                finial_spin=u * 2.0,
                left_shoulder=(27.0 + dx, 18.0 + dy),
                left_hand=(30.0 + dx, 23.0 + dy),
                left_relic_mode="snowflake_ring",
            )
            frames.append(frame)

        elif f <= 17:
            u = (f - 7) / 10.0
            kneel_src = tpl["kneel"].copy()
            extra_drop = 0 if f <= 12 else (f - 12)
            base = np.zeros((52, 52, 4), dtype=np.uint8)
            for sy in range(8, 49):
                for sx in range(12, 48):
                    if kneel_src[sy, sx, 3] > 0:
                        if sy <= 36:
                            ny = min(47, sy + 1 + extra_drop)
                            nx = min(48, sx + (1 if (extra_drop >= 2 and sy <= 26) else 0))
                        else:
                            ny = min(48, sy + 1)
                            nx = sx
                        base[ny, nx] = kneel_src[sy, sx]
            base = fill_layer_pinholes(base)
            base = apply_hair_and_gown_wave(base, u * math.pi, amplitude=0.9, rune_pulse=0.25)
            frame = draw_borealis_scepter_wand(
                base,
                shoulder=(25.5, 21.0 + extra_drop),
                grip=(33.0, 25.0 + extra_drop),
                staff_angle_deg=-35.0 + 32.0 * u,
                finial_spin=u,
                left_shoulder=(27.0, 22.0 + extra_drop),
                left_hand=(30.0, 27.0 + extra_drop),
                left_relic_mode="snowflake_ring",
            )
            frames.append(frame)

        else:
            k = f - 18  # 0..11
            frame = tpl["fall"].copy()
            for cx_p in range(12, 32):
                for cy_p in range(43, 48):
                    if frame[cy_p, cx_p, 3] == 0 and (cx_p <= 26 or cy_p <= 46):
                        frame[cy_p, cx_p] = SAPPHIRE_MID if (cx_p + cy_p) % 2 == 0 else SAPPHIRE_DARK
            frame = fill_layer_pinholes(frame, x0=6, x1=44, y0=36, y1=49, require_3_neighbors=False)

            # Horizontal fallen Borealis Scepter-Wand resting flat on the floor (x = 30..44, y = 47..48)
            draw_line_px(frame, 30, 47, 42, 47, FROST_LIGHT)
            draw_line_px(frame, 30, 48, 42, 48, SAPPHIRE_MID)
            set_px(frame, 43, 47, PURE_WHITE)
            set_px(frame, 44, 47, FROST_CYAN)
            set_px(frame, 43, 46, AURORA_LAVENDER)

            # Fading pixel snowflakes drifting gently down so every frame F18..F29 is distinct
            num_flakes = max(1, 5 - (k // 3))
            for f_i in range(num_flakes):
                fx_p = 15 + f_i * 6 + ((k + f_i) % 3)
                fy_p = min(45, 33 + k + f_i * 2)
                set_px(frame, fx_p, fy_p, PURE_WHITE if (f_i + k) % 2 == 0 else FROST_CYAN)
                set_px(frame, fx_p + 1, fy_p, FROST_LIGHT if f_i % 2 == 0 else AURORA_LAVENDER)

            frames.append(frame)

    return frames


def build_row6_dash(tpl):
    """
    Row 6 (`DASH` — `AURORA RIFT FIGURE-SKATE GLIDE & ICE-STATUE ECHO`, 30 frames):
    - Glacia glides through a vertical Crystalline Borealis Portal Rift (`draw_aurora_portal_rift`)
      with a shimmering frost-statue afterimage echo (`draw_frost_afterimage`) behind her!
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        is_glide = 2 <= f <= 25
        base = tpl["dash"].copy() if is_glide else tpl["stand"].copy()
        base = apply_hair_and_gown_wave(base, phase * 2.2, amplitude=1.8, is_dash=is_glide, rune_pulse=0.95)
        base = draw_borealis_snowflake_halo(
            base, cx=22.5 if is_glide else 21.5, cy=14.0, radius=7.5, rot_rad=phase * 3.0, brightness=1.1
        )

        frame = draw_borealis_scepter_wand(
            base,
            shoulder=(26.5 if is_glide else 25.5, 17.5),
            grip=(36.0 if is_glide else 34.0, 19.0),
            staff_angle_deg=-38.0 if is_glide else -76.0,
            finial_spin=phase * 3.0,
            flare=0.65 if is_glide else 0.0,
            left_shoulder=(28.0 if is_glide else 27.0, 18.5),
            left_hand=(34.5 if is_glide else 31.0, 21.5 if is_glide else 23.5),
            left_relic_mode="cryo_prism_shard" if is_glide else "snowflake_ring",
            left_relic_progress=0.8,
        )

        if is_glide:
            frame = draw_frost_afterimage(frame, base, dx_trail=-6, phase=phase)
            rift_x = 35.0 - ((f - 2) / 23.0) * 14.0
            rift_back, rift_front = draw_aurora_portal_rift(
                frame, rcx=rift_x, rcy=26.0, rx=3.5, ry=12.0, rot_rad=phase * 2.0
            )
            frame = composite_over(rift_back, frame)
            frame = composite_over(frame, rift_front)

        frames.append(frame)
    return frames


def build_row7_crouch(tpl):
    """
    Row 7 (`CROUCH` — `KNEELING HEXAGONAL FROST-AEGIS MIRROR & LOW PRISM SHOT`, 30 frames):
    - ZERO gravestone/cross monolith! Instead, Glacia drops into a graceful knee-bend guard
      (`make_crouch_icemage(tpl, d=4)`), conjuring a delicate rotating **Hexagonal Frost-Aegis Mirror**
      (`conjure_mode='frost_aegis_shield'` + `left_relic_mode='hex_frost_aegis'`) in front of her Scepter-Wand
      with a subtle Permafrost floor sigil (`draw_permafrost_ground_sigil`) at `y = 46..48`!
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
        body = apply_hair_and_gown_wave(body, phase, amplitude=1.2, rune_pulse=0.9)
        body = draw_borealis_snowflake_halo(
            body, cx=21.5, cy=13.5 + d, radius=7.0, rot_rad=phase * 2.0, brightness=1.0
        )

        is_guard = 4 <= f <= 23
        frame = draw_borealis_scepter_wand(
            body,
            shoulder=(25.5, 17.0 + d),
            grip=(34.5, 18.5 + d),
            staff_angle_deg=-58.0 if is_guard else -74.0,
            finial_spin=phase * 2.5,
            flare=0.6 if (10 <= f <= 17) else 0.2,
            left_shoulder=(27.0, 18.0 + d),
            left_hand=(33.5, 21.0 + d),
            left_relic_mode="hex_frost_aegis" if is_guard else "snowflake_ring",
            left_relic_progress=1.0 if is_guard else 0.0,
            conjure_mode="frost_aegis_shield" if is_guard else "none",
            mode_progress=min(1.0, (f - 3) / 4.0) if f <= 19 else max(0.3, 1.0 - (f - 19) / 5.0),
            shield_center=(41.5, 22.0 + d),
        )
        if is_guard:
            frame = draw_permafrost_ground_sigil(
                frame, cx=26.5, cy=47.5, rx=10.5, ry=1.5, rot_rad=phase * 1.5, intensity=0.85, phase=phase
            )
        frames.append(frame)
    return frames


def build_row8_jump(tpl):
    """
    Row 8 (`JUMP` — `AXEL FIGURE-SKATE VAULT & AERIAL PRISM REFRACTION`, 30 frames):
    - ZERO ground pixels (`y >= 44`) during mid-air frames (`F04..F23`)!
    - `F00..F03`: Skater knee-bend takeoff (`d = 2..0`).
    - `F04..F13`: Mid-air Axel figure-skating vault (`jump_dy = -3`), scepter poised high (`-85°`).
    - `F14..F23`: Mid-air downward 35-deg Borealis Prism Volley (`staff_angle_deg = -38°`, `conjure_mode='tri_matrix_seal'`).
    - `F24..F29`: Skater landing with a frost-crystal ground sigil at `y = 47..48`.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 3:
            d = [1, 2, 1, 0][f]
            body = make_crouch_icemage(tpl, d) if d > 0 else make_aerial_icemage(tpl, jump_dy=-1, leg_tuck=0.35, phase=phase)
            body = draw_borealis_snowflake_halo(body, cx=21.5, cy=13.5 + d, radius=7.5, rot_rad=phase, brightness=1.0)
            frame = draw_borealis_scepter_wand(
                body,
                shoulder=(25.5, 17.0 + d),
                grip=(34.0, 18.5 + d),
                staff_angle_deg=-76.0,
                finial_spin=phase,
                left_shoulder=(27.0, 18.0 + d),
                left_hand=(31.5, 22.5 + d),
                left_relic_mode="snowflake_ring",
            )
            frames.append(frame)

        elif f <= 13:
            k = f - 4  # 0..9
            jump_dy = -2 if k <= 1 else -3
            body = make_aerial_icemage(tpl, jump_dy=jump_dy, body_tilt_deg=-4.0, leg_tuck=0.65, phase=phase * 2.2)
            body = draw_borealis_snowflake_halo(
                body, cx=21.5, cy=13.5 + jump_dy, radius=7.5, rot_rad=phase * 2.5, brightness=1.1
            )
            frame = draw_borealis_scepter_wand(
                body,
                shoulder=(25.5, 17.0 + jump_dy),
                grip=(34.5, 17.0 + jump_dy),
                staff_angle_deg=-86.0 + k * 1.5,
                finial_spin=phase * 2.5,
                flare=0.5,
                left_shoulder=(27.0, 18.0 + jump_dy),
                left_hand=(32.5, 19.5 + jump_dy),
                left_relic_mode="cryo_prism_shard",
                left_relic_progress=0.7,
            )
            frame[44:, :, :] = 0
            frames.append(frame)

        elif f <= 23:
            k = f - 14  # 0..9
            jump_dy = -3 if k <= 4 else -2
            body = make_aerial_icemage(tpl, jump_dy=jump_dy, body_tilt_deg=8.0, leg_tuck=0.55, phase=phase * 2.5)
            body = draw_borealis_snowflake_halo(
                body, cx=22.5, cy=13.5 + jump_dy, radius=7.5, rot_rad=phase * 3.0, brightness=1.15
            )
            frame = draw_borealis_scepter_wand(
                body,
                shoulder=(26.5, 17.0 + jump_dy),
                grip=(35.5, 18.5 + jump_dy),
                staff_angle_deg=-42.0,
                finial_spin=phase * 3.5,
                flare=0.95 if k <= 5 else 0.4,
                left_shoulder=(28.0, 18.0 + jump_dy),
                left_hand=(35.0, 21.0 + jump_dy),
                left_relic_mode="tri_prism_matrix",
                left_relic_progress=1.0,
                conjure_mode="tri_matrix_seal" if k <= 5 else "none",
                mode_progress=0.85,
            )
            frame[44:, :, :] = 0
            frames.append(frame)

        else:
            k = f - 24  # 0..5
            crouch_d = [3, 2, 1, 1, 0, 0][k]
            body = make_crouch_icemage(tpl, crouch_d) if crouch_d > 0 else tpl["stand"].copy()
            body = apply_hair_and_gown_wave(body, phase, amplitude=1.4, rune_pulse=0.9)
            body = draw_borealis_snowflake_halo(
                body, cx=21.5, cy=13.5 + crouch_d, radius=7.5, rot_rad=phase, brightness=1.0
            )
            frame = draw_borealis_scepter_wand(
                body,
                shoulder=(25.5, 17.0 + crouch_d),
                grip=(34.0, 19.0 + crouch_d),
                staff_angle_deg=-68.0 - k * 1.5,
                finial_spin=phase,
                left_shoulder=(27.0, 18.0 + crouch_d),
                left_hand=(31.0, 23.5 + crouch_d),
                left_relic_mode="snowflake_ring",
            )
            if k <= 2:
                frame = draw_permafrost_ground_sigil(
                    frame, cx=26.0, cy=47.5, rx=10.5, ry=1.5, rot_rad=phase, intensity=0.8 - k * 0.25, phase=phase
                )
            frames.append(frame)
    return frames


def apply_pass12_postprocess(cell_arr, r_idx, f):
    """
    Pass 5 (`208x208` Sub-Pixel Star-Mote & Overdrive Polish, matching `Priestess` and `Chronomancer`):
    1. Row 2 (`AUTO_ATTACK`, `F11..F17`): Crisp 4-point diamond release star + 2 orbiting frost motes.
    2. Row 3 (`SKILL`, `F07..F20`) & Row 7 (`CROUCH`, `F06..F21`): Curved perspective Permafrost floor
       arch at `y = 186..190, x = 76..134` with 3 rising diamond snow-motes.
    3. Row 4 (`ULTIMATE`, `F03..F26`) & Row 8 (`JUMP`, `F05..F22`): 4 ascending Borealis starlight motes.
    """
    out = cell_arr.copy()

    def put208(px, py, col):
        ix = max(8, min(199, int(round(px))))
        iy = max(8, min(199, int(round(py))))
        out[iy, ix] = col

    # 1. Row 2 (AUTO_ATTACK, F11..F17) Muzzle / Cast-Release Diamond Star
    if r_idx == 2 and 11 <= f <= 17:
        cx = 152 + (f - 11) * 2
        cy = 76 + ((f * 5) % 14)
        for d in range(-6, 7):
            col_h = PURE_WHITE if abs(d) <= 1 else (FROST_BRIGHT if abs(d) <= 3 else AURORA_LAVENDER)
            put208(cx + d, cy, col_h)
            put208(cx, cy + d, col_h)
            if abs(d) <= 3:
                put208(cx + d, cy - 1, FROST_LIGHT if abs(d) <= 1 else FROST_CYAN)
                put208(cx + d, cy + 1, FROST_LIGHT if abs(d) <= 1 else FROST_CYAN)
                put208(cx - 1, cy + d, FROST_LIGHT if abs(d) <= 1 else FROST_CYAN)
                put208(cx + 1, cy + d, FROST_LIGHT if abs(d) <= 1 else FROST_CYAN)
        for dx_d, dy_d in [(-2, -2), (2, -2), (-2, 2), (2, 2)]:
            put208(cx + dx_d, cy + dy_d, FROST_CYAN)
        ang = (f - 11) * 0.95
        for m_idx in range(2):
            ma = ang + m_idx * math.pi
            mx = cx + int(round(math.cos(ma) * 8.0))
            my = cy + int(round(math.sin(ma) * 6.0))
            m_col = FROST_CYAN if m_idx == 0 else AURORA_LAVENDER
            put208(mx, my, PURE_WHITE)
            put208(mx + 1, my, m_col)
            put208(mx - 1, my, m_col)
            put208(mx, my + 1, m_col)
            put208(mx, my - 1, m_col)

    # 2. Row 3 (SKILL) & Row 7 (CROUCH) Rising Diamond Frost Motes
    if r_idx in (3, 7) and 7 <= f <= 20:
        base_mote_y = 182 - ((f - 7) * 3) % 24
        for m_i, mx_base in enumerate((84, 106, 128)):
            mx = mx_base + (((f - 7) + m_i) % 3) - 1
            my = max(8, min(195, base_mote_y - m_i * 2))
            put208(mx, my, PURE_WHITE)
            put208(mx - 1, my, FROST_CYAN if m_i % 2 == 0 else AURORA_LAVENDER)
            put208(mx + 1, my, FROST_CYAN if m_i % 2 == 0 else AURORA_LAVENDER)
            put208(mx, my - 1, PURE_WHITE)
            put208(mx, my + 1, FROST_LIGHT)

    # 3. Row 4 (ULTIMATE) & Row 8 (JUMP) Ascending Borealis Starlight Motes
    if (r_idx == 4 and 3 <= f <= 26) or (r_idx == 8 and 5 <= f <= 22):
        for m_i, mx in enumerate((66, 88, 124, 142)):
            my = 164 - ((f - 3) * 4 + m_i * 18) % 104
            put208(mx, my, PURE_WHITE)
            for d in (1, 2):
                c_arm = FROST_CYAN if d == 1 else AURORA_LAVENDER
                put208(mx - d, my, c_arm)
                put208(mx + d, my, c_arm)
                put208(mx, my - d, c_arm)
            for t_dy in range(1, 5):
                put208(mx, my + t_dy, FROST_LIGHT if t_dy == 1 else (FROST_CYAN if t_dy <= 2 else SAPPHIRE_BRIGHT))

    return out


def main():
    tpl = make_clean_templates()

    rows = [
        ("ROW 0: IDLE - CRYO-PRISM SOVEREIGN & BOREALIS HALO (30 FRAMES)", build_row0_idle(tpl)),
        ("ROW 1: WALK - FIGURE-SKATING ICE-GLIDE & SCEPTER (30 FRAMES)", build_row1_walk(tpl)),
        ("ROW 2: AUTO_ATTACK - CRYO-PRISM LANCE & ARC CAST (30 FRAMES)", build_row2_auto_attack(tpl)),
        ("ROW 3: SKILL - TRI-PRISM MATRIX CONJURATION (30 FRAMES)", build_row3_skill(tpl)),
        ("ROW 4: ULTIMATE - BOREALIS CATHEDRAL APOTHEOSIS (30 FRAMES)", build_row4_ultimate(tpl)),
        ("ROW 5: DEATH - SHATTERED PRISMS & COLLAPSE (30 FRAMES)", build_row5_death(tpl)),
        ("ROW 6: DASH - AURORA RIFT GLIDE & ICE-STATUE ECHO (30 FRAMES)", build_row6_dash(tpl)),
        ("ROW 7: CROUCH - KNEELING FROST-AEGIS MIRROR (30 FRAMES)", build_row7_crouch(tpl)),
        ("ROW 8: JUMP - AXEL SKATE VAULT & AERIAL REFRACTION (30 FRAMES)", build_row8_jump(tpl)),
    ]

    num_rows = len(rows)
    cell_px = 208
    sheet = Image.new("RGBA", (30 * cell_px, num_rows * cell_px), (0, 0, 0, 0))

    top_clips = bot_clips = left_clips = right_clips = 0
    pinholes_total = 0
    cell_rows_208 = []
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
            cell_208 = apply_pass12_postprocess(np.array(cell_im, dtype=np.uint8), r_idx, c_idx)
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
        cell_rows_208.append(cells_208)

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
    for r_idx, (r_name, _) in enumerate(rows):
        y0 = r_idx * (preview_cell + pad_top)
        draw.rectangle([0, y0, 30 * preview_cell, y0 + pad_top - 2], fill=(22, 34, 56, 255))
        draw.text((8, y0 + 5), r_name, fill=(125, 211, 252, 255))
        for c_idx, cell_arr in enumerate(cell_rows_208[r_idx]):
            x0 = c_idx * preview_cell
            draw.text((x0 + 4, y0 + 13), f"F{c_idx:02d}", fill=(240, 249, 255, 255))
            p_im = Image.fromarray(cell_arr, mode="RGBA").resize((preview_cell, preview_cell), Image.Resampling.NEAREST)
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
