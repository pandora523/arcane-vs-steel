#!/usr/bin/env python3
"""
Builds Malakor's (Reaper) 30-Frame-Per-Animation HD-2D Sprite Sheet:
- 9 rows x 30 columns = 270 unique frames (6240 x 1872 at 208x208 per cell):
  * Row 0: IDLE (30 frames)
  * Row 1: WALK (30 frames)
  * Row 2: AUTO_ATTACK - ABYSSAL SCYTHE REAP (30 frames)
  * Row 3: SKILL - SPECTRAL CHAIN HOOK & EXECUTIONER GUILLOTINE SLAM (30 frames)
  * Row 4: ULTIMATE - GRIM HARVEST: SOVEREIGN OF DEATH (30 frames)
  * Row 5: DEATH & HURT (30 frames)
  * Row 6: DASH - WRAITH PHASE-RUSH (30 frames)
  * Row 7: CROUCH - WRAITH-SHROUD CROUCH & LOW PHANTOM SCYTHE THROW (30 frames)
  * Row 8: JUMP - SHADOW-WING AERIAL VAULT & MID-AIR DOWNWARD SCYTHE CLEAVE (30 frames)
- Un-inked clean pixel art at 52x52 logical resolution upscaled 4x NEAREST to 208x208.
- Strictly ONE articulated Abyssal Great-Scythe per frame (zero duplicate scythes, zero extra limbs, zero bouncy-ball jump frames).
"""

import math
import numpy as np
from PIL import Image, ImageDraw

# Reaper (Malakor) Obsidian Necropolis, Blood-Crimson & Abyssal Violet Palette
OUTLINE = (11, 15, 25, 255)
OBSIDIAN_DEEP = (20, 12, 32, 255)
OBSIDIAN_DARK = (32, 22, 46, 255)
OBSIDIAN_MID = (52, 40, 71, 255)
OBSIDIAN_LIGHT = (89, 76, 104, 255)
STEEL_LIGHT = (168, 162, 196, 255)
STEEL_EDGE = (226, 218, 248, 255)

CRIMSON_DEEP = (38, 8, 26, 255)
CRIMSON_DARK = (68, 16, 38, 255)
CRIMSON_MID = (118, 28, 56, 255)
CRIMSON_BRIGHT = (244, 63, 94, 255)
CRIMSON_CORE = (255, 205, 218, 255)

VIOLET_DEEP = (58, 22, 94, 255)
VIOLET_MID = (126, 34, 206, 255)
VIOLET_BRIGHT = (192, 132, 252, 255)
VIOLET_PINK = (232, 121, 249, 255)
SOUL_WHITE = (250, 245, 255, 255)

BONE_DARK = (120, 112, 128, 255)
BONE_MID = (182, 174, 192, 255)
BONE_LIGHT = (232, 226, 240, 255)

# Named aliases for IK arm, robe seam, necropolis armor shading, slash trails & shadow-wings
ROBE_DEEP = OBSIDIAN_DEEP
ROBE_DARK = OBSIDIAN_DARK
ROBE_MID = OBSIDIAN_MID
ROBE_LIGHT = OBSIDIAN_LIGHT
VOID_PURPLE = VIOLET_MID
SOUL_CYAN = VIOLET_BRIGHT

C_SOUL_WHITE = SOUL_WHITE
C_BLADE_MAGENTA = VIOLET_PINK
C_CRIMSON_GLOW = CRIMSON_BRIGHT
C_CLOAK_DARK = OBSIDIAN_DARK
C_CRIMSON_DARK = CRIMSON_DARK
C_BLADE_VIOLET = VIOLET_BRIGHT
C_SPECTRAL_CYAN = (140, 235, 255, 255)


def load_source_cells(path='backups/reaper_sheet_before_30fps.png'):
    im = Image.open(path).convert('RGBA')

    def cell(r, c):
        return np.array(
            im.crop((c * 208, r * 208, (c + 1) * 208, (r + 1) * 208)).resize((52, 52), Image.NEAREST),
            dtype=np.uint8
        )

    return {
        'idle': cell(0, 0),
        'atk_windup': cell(2, 1),
        'atk_slash': cell(2, 3),
        'kneel1': cell(4, 2),
        'kneel2': cell(4, 3),
        'fall': cell(4, 5),
        'dash': cell(5, 2),
    }


def set_px(buf, x, y, col):
    ix = int(round(x))
    iy = int(round(y))
    if 1 <= ix <= 50 and 1 <= iy <= 50:
        buf[iy, ix] = col


def draw_line_px(buf, x0, y0, x1, y1, col):
    steps = int(max(abs(x1 - x0), abs(y1 - y0), 1))
    for i in range(steps + 1):
        t = i / steps
        set_px(buf, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, col)


def draw_thick_line_px(buf, x0, y0, x1, y1, col_core, col_edge=None):
    steps = int(max(abs(x1 - x0), abs(y1 - y0), 1) * 2)
    dx = x1 - x0
    dy = y1 - y0
    length = math.hypot(dx, dy) or 1.0
    nx, ny = -dy / length, dx / length
    for i in range(steps + 1):
        t = i / steps
        cx = x0 + dx * t
        cy = y0 + dy * t
        if col_edge is not None:
            set_px(buf, cx + nx * 0.8, cy + ny * 0.8, col_edge)
            set_px(buf, cx - nx * 0.8, cy - ny * 0.8, col_edge)
        set_px(buf, cx, cy, col_core)


def add_outline_to_layer(layer):
    """
    Returns `layer.copy()` without dilating black outline pixels into transparent space,
    because `PixelForge.js` (ensureNormalMap + drawSheetFrame) dynamically renders the
    1px comic ink outline and 1px exterior rim at runtime.
    """
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


def strip_isolated_pixels(layer):
    """Removes 1px isolated floating speckles that have 0 or 1 orthogonal opaque neighbors."""
    out = layer.copy()
    for _ in range(2):
        alpha = out[:, :, 3] > 0
        for y in range(1, 51):
            for x in range(1, 51):
                if not alpha[y, x]:
                    continue
                n = int(alpha[y - 1, x]) + int(alpha[y + 1, x]) + int(alpha[y, x - 1]) + int(alpha[y, x + 1])
                if n <= 1:
                    out[y, x] = 0
    return out


def shift_layer(layer, dx=0, dy=0):
    """
    Shifts a 52x52 layer by (dx, dy), clamping inside the safe cell interior and filling any pinholes.
    """
    out = np.zeros_like(layer)
    idx = int(round(dx))
    idy = int(round(dy))
    for y in range(52):
        ny = y + idy
        if 1 <= ny <= 50:
            for x in range(52):
                nx = x + idx
                if 1 <= nx <= 50 and layer[y, x, 3] > 0:
                    out[ny, nx] = layer[y, x]
    return fill_layer_pinholes(out)


def ensure_safe_cell(cell, margin=2):
    """
    Guarantees zero pixels touch the 2px 52x52 cell border (2 <= x <= 49, 2 <= y <= 49) and fills
    any 1px interior pinholes from movement.
    """
    m = max(2, int(margin))
    hi = 51 - m
    out = fill_layer_pinholes(cell, m, hi, m, hi, require_3_neighbors=True)
    ys, xs = np.where(out[:, :, 3] > 0)
    if len(ys) == 0:
        return out
    ymin, ymax = int(ys.min()), int(ys.max())
    xmin, xmax = int(xs.min()), int(xs.max())

    dy = 0
    if ymin < m and ymax < hi:
        dy = min(m - ymin, hi - ymax)
    elif ymax > hi and ymin > m:
        dy = -min(ymax - hi, ymin - m)

    dx = 0
    if xmin < m and xmax < hi:
        dx = min(m - xmin, hi - xmax)
    elif xmax > hi and xmin > m:
        dx = -min(xmax - hi, xmin - m)

    if dx != 0 or dy != 0:
        shifted = np.zeros_like(out)
        for y in range(52):
            ny = y + dy
            if m <= ny <= hi:
                for x in range(52):
                    nx = x + dx
                    if m <= nx <= hi and out[y, x, 3] > 0:
                        shifted[ny, nx] = out[y, x]
        out = shifted

    out[:m, :, :] = 0
    out[52 - m:, :, :] = 0
    out[:, :m, :] = 0
    out[:, 52 - m:, :] = 0
    return out


def paste_cell(canvas, r, f, cell, cell_px=208):
    """Upscales a 52x52 logical cell 4x NEAREST and pastes it into `canvas` at (r, f)."""
    cell_im = Image.fromarray(cell, mode='RGBA').resize((cell_px, cell_px), Image.NEAREST)
    canvas.paste(cell_im, (f * cell_px, r * cell_px))


def composite_over(base, over):
    res = base.copy()
    mask = over[:, :, 3] > 0
    res[mask] = over[mask]
    return res


def make_clean_templates(src):
    """
    Strips ALL baked-in scythe blades, shafts, protruding arms, and baked chest bone-hands
    from Malakor's master poses so we can animate strictly ONE articulated Abyssal Great-Scythe
    (`draw_articulated_scythe`) and ONE clean Lead IK Arm per frame with zero duplicate limbs or chest hands.
    """
    def neutralize_reaper_chest_arm(cell):
        """
        Erases any protruding baked arm pixels at x >= 29 for 16 <= y <= 29, and replaces
        any bright bone/necrotic/gold hand or forearm pixels (r > 95 or g > 95) across
        Malakor's chest (18 <= y <= 28, 21 <= x <= 28) with clean dark abyssal robe/ribcage
        shading (ROBE_DARK / ROBE_MID) so his chest has ZERO baked bone-hands!
        """
        cell[16:30, 29:44] = 0
        for y in range(18, 29):
            for x in range(21, 29):
                if cell[y, x, 3] > 0:
                    r, g, b, _ = cell[y, x]
                    if r > 95 or g > 95:
                        cell[y, x] = ROBE_MID if ((x + y) % 2 == 0) else ROBE_DARK
        return cell

    # 1. Clean standing body from `idle` (0, 0)
    stand = src['idle'].copy()
    slash_ref = src['atk_slash'].copy()

    # Remove right-side scythe head, upper shaft, and curved blade from `stand`
    for y in range(0, 52):
        for x in range(0, 52):
            if y <= 27 and x >= 31:
                stand[y, x] = 0
            elif 28 <= y <= 30 and x >= 32:
                stand[y, x] = 0
            elif 31 <= y <= 38 and x >= 43:
                stand[y, x] = 0
            elif 39 <= y <= 42 and x >= 41:
                stand[y, x] = 0

    # Replace the diagonal shaft line across the waist/chest (x=18..30, y=22..31)
    # with clean shaft-free armor/tabard pixels from `slash_ref` + vertical neighbor interpolation
    for x in range(5, 31):
        y_shaft = 39.2 - (x - 5) * 0.627
        iy = int(round(y_shaft))
        for y in range(max(18, iy - 1), min(42, iy + 2)):
            if stand[y, x, 3] == 0:
                continue
            # Protruding lower-left butt-spike of the shaft outside the cloak at x=5..8, y=37..39
            if x <= 8 and y <= 39:
                r, g, b, _ = stand[y, x]
                if b > r + 10 and b > 65:
                    stand[y, x] = (37, 7, 26, 255)
            elif 18 <= x <= 29 and 22 <= y <= 31 and slash_ref[y, x, 3] > 0:
                stand[y, x] = slash_ref[y, x]
            else:
                # Sample clean cloak/armor pixel from 2px above or below the thin shaft line
                above_y = max(14, iy - 2)
                below_y = min(46, iy + 2)
                if stand[above_y, x, 3] > 0:
                    stand[y, x] = stand[above_y, x]
                elif stand[below_y, x, 3] > 0:
                    stand[y, x] = stand[below_y, x]

    # Erase baked protruding arm and neutralize baked bone-hands on chest
    stand = neutralize_reaper_chest_arm(stand)

    # Strip the baked-in left-side hanging arm & pale bone hand (x=11..18, y=20..33) from `stand`
    # while preserving the Near Shoulder Pauldron (y=15..19, x=15..20) and lower cloak (y>=25),
    # so Malakor NEVER has a third/idle arm hanging down at his left side while wielding the scythe 2-handed!
    for y in range(21, 25):
        for x in range(11, 15):
            if y == 21 and x >= 14:
                continue
            stand[y, x] = 0
    for y in range(20, 34):
        for x in range(13, 19):
            if stand[y, x, 3] == 0:
                continue
            r, g, b, _ = stand[y, x]
            if int(r) + int(g) + int(b) > 85 or b > 45 or r > 45:
                if (x + y) % 3 == 0:
                    stand[y, x] = CRIMSON_DEEP
                elif (x + y) % 2 == 0:
                    stand[y, x] = OBSIDIAN_DEEP
                else:
                    stand[y, x] = (28, 10, 24, 255)

    # Keep boots ending at y=49 and left cloak at x>=2 so 2px margin remains around templates
    for x in range(52):
        if stand[50, x, 3] > 0 and stand[49, x, 3] == 0:
            stand[49, x] = stand[50, x]
    stand[50:, :, :] = 0
    for y in range(52):
        if stand[y, 1, 3] > 0 and stand[y, 2, 3] == 0:
            stand[y, 2] = stand[y, 1]
    stand[:, :2, :] = 0
    stand = strip_isolated_pixels(fill_layer_pinholes(add_outline_to_layer(stand)))

    # Extract Malakor's left (far) and right (near) armored greaves & boots for walk/crouch/jump
    leg_back_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_front_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_back_patch[39:50, 8:18] = stand[39:50, 8:18]
    leg_front_patch[39:50, 26:36] = stand[39:50, 26:36]

    # Upper torso + waist belt + left tattered cloak with ALL standing thigh pixels (y >= 32, x >= 15) stripped!
    stand_upper = np.zeros((52, 52, 4), dtype=np.uint8)
    stand_upper[:32, :] = stand[:32, :]
    stand_upper[32:45, :15] = stand[32:45, :15]
    stand_upper = fill_layer_pinholes(add_outline_to_layer(stand_upper))

    # 2. Clean forward slash/lunge body: combines `atk_slash`'s billowing crimson battle-cloak on the left
    #    (y = 19..44, x = 2..22, with the back gap filled) with `stand`'s crisp hooded skull, glowing eyes,
    #    shoulder pauldron, and ribcage armor shifted (+1, +1) into an aggressive forward slash lean!
    lunge = np.zeros((52, 52, 4), dtype=np.uint8)
    raw_slash = src['atk_slash'].copy()
    for y in range(19, 45):
        for x in range(2, 23):
            if raw_slash[y, x, 3] > 0:
                lunge[y, x] = raw_slash[y, x]
    for y in range(21, 33):
        for x in range(13, 22):
            if lunge[y, x, 3] == 0:
                lunge[y, x] = np.array(CRIMSON_DARK if ((x + y) % 2 == 0) else ROBE_DEEP, dtype=np.uint8)
    lunge[32:50, 8:40] = stand[32:50, 8:40]
    for y in range(9, 33):
        for x in range(15, 30):
            if stand[y, x, 3] > 0:
                ny = min(49, y + 1)
                nx = min(49, x + 1)
                lunge[ny, nx] = stand[y, x]
    lunge = neutralize_reaper_chest_arm(lunge)
    lunge[50:, :, :] = 0
    lunge[:, :2, :] = 0
    lunge = strip_isolated_pixels(fill_layer_pinholes(add_outline_to_layer(lunge)))

    # 3. Clean kneeling bodies (`kneel1`, `kneel2`) with baked vertical scythe & chest bone-hands removed!
    kneel1 = src['kneel1'].copy()
    kneel2 = src['kneel2'].copy()
    for kn in (kneel1, kneel2):
        kn[:18, :, :] = 0
        kn[:, 30:, :] = 0
        neutralize_reaper_chest_arm(kn)
        for x in range(52):
            if kn[50, x, 3] > 0 and kn[49, x, 3] == 0:
                kn[49, x] = kn[50, x]
        kn[50:, :, :] = 0
        kn[:, :2, :] = 0
    kneel1 = strip_isolated_pixels(fill_layer_pinholes(add_outline_to_layer(kneel1)))
    kneel2 = strip_isolated_pixels(fill_layer_pinholes(add_outline_to_layer(kneel2)))

    # 4. Clean horizontal fallen body (`fall`) with the baked-in bottom scythe (y >= 40) stripped
    #    and lowered by +6px so Malakor lies flat on the floor (y = 34..45)
    raw_fall = src['fall'].copy()
    raw_fall[40:, :, :] = 0
    fall = np.zeros((52, 52, 4), dtype=np.uint8)
    for y in range(28, 40):
        ny = y + 6
        if ny < 49:
            fall[ny, :] = raw_fall[y, :]
    fall = strip_isolated_pixels(fill_layer_pinholes(add_outline_to_layer(fall)))

    # 5. Clean horizontal wraith-dash body (`dash`) with front scythe blade/shaft (x >= 38)
    #    and baked chest arm/bone-hand removed!
    dash = src['dash'].copy()
    dash[:, 38:, :] = 0
    dash = neutralize_reaper_chest_arm(dash)
    dash[50:, :, :] = 0
    dash[:, :2, :] = 0
    dash = fill_layer_pinholes(dash, require_3_neighbors=False)
    dash = strip_isolated_pixels(fill_layer_pinholes(add_outline_to_layer(dash), require_3_neighbors=False))

    return {
        'stand': stand,
        'stand_upper': stand_upper,
        'leg_back': leg_back_patch,
        'leg_front': leg_front_patch,
        'lunge': lunge,
        'kneel1': kneel1,
        'kneel2': kneel2,
        'fall': fall,
        'dash': dash,
    }


def apply_cloak_wave(frame, phase_rad, amplitude=0.9, vertical_flutter=0.45, is_dash=False):
    """
    Applies a smooth, tear-free 30-frame traveling necropolis wind-wave to Malakor's tattered
    crimson-shadow cloak using `amplitude <= 0.9`, filling all pinholes and stripping any isolated
    1px speckles so `DASH` and standing poses have zero torn holes or floating pixels.
    """
    eff_amp = min(0.9, max(0.0, float(amplitude)))
    eff_v = min(0.5, max(0.0, float(vertical_flutter)))
    out = frame.copy()

    if is_dash:
        cloak_mask = np.zeros((52, 52), dtype=bool)
        for y in range(18, 38):
            max_x = 13 if y < 35 else 9
            for x in range(1, max_x + 1):
                if frame[y, x, 3] > 0:
                    cloak_mask[y, x] = True

        cloak_pixels = frame.copy()
        for y in range(18, 38):
            u = (y - 18) / 19.0
            dx = min(0, int(round(math.sin(phase_rad - u * 3.0) * eff_amp * (0.25 + 0.75 * u))))
            dy = int(round(math.cos(phase_rad - u * 2.4) * (eff_amp * 0.45) * u))
            max_x = 13 if y < 35 else 9
            for x in range(1, max_x + 1):
                if not cloak_mask[y, x]:
                    continue
                nx = max(2, min(max_x, x + dx))
                ny = max(17, min(46, y + dy))
                out[ny, nx] = cloak_pixels[y, x]
                if x >= max_x - 3 and out[y, x, 3] == 0:
                    out[y, x] = cloak_pixels[y, x]

        out = fill_layer_pinholes(out, x0=2, x1=28, y0=16, y1=47, require_3_neighbors=False)
        return strip_isolated_pixels(add_outline_to_layer(out))

    # Left cloak wave (x <= 18, y = 21..47) with dx <= 0 and eff_amp <= 0.9 so it never tears from the back seam
    cloak_mask = np.zeros((52, 52), dtype=bool)
    for y in range(21, 48):
        max_x = 18 if y < 31 else (14 if y < 38 else 8)
        for x in range(1, max_x + 1):
            if frame[y, x, 3] > 0:
                cloak_mask[y, x] = True

    cloak_pixels = frame.copy()
    for y in range(21, 48):
        max_x = 18 if y < 31 else (14 if y < 38 else 8)
        for x in range(1, max(2, max_x - 3)):
            if cloak_mask[y, x]:
                out[y, x] = 0

    for y in range(21, 48):
        u = (y - 21) / 26.0
        raw_dx = int(round(math.sin(phase_rad - u * 3.4) * (eff_amp * (0.25 + 0.75 * u))))
        dx = min(0, raw_dx)
        dy = int(round(math.cos(phase_rad - u * 2.6) * (eff_v * 0.7 * u)))
        max_x = 18 if y < 31 else (14 if y < 38 else 8)
        for x in range(1, max_x + 1):
            if not cloak_mask[y, x]:
                continue
            nx = max(2, min(max_x, x + dx))
            ny = max(20, min(48, y + dy))
            if out[ny, nx, 3] == 0:
                out[ny, nx] = cloak_pixels[y, x]
            # Anchor inner seam so zero gap ever opens when cape waves left or vertically
            if x >= max_x - 4 and out[y, x, 3] == 0:
                out[y, x] = cloak_pixels[y, x]
            if dx < 0 and x + 1 <= max_x and out[ny, x, 3] == 0:
                out[ny, x] = cloak_pixels[y, x]

    out = fill_layer_pinholes(out, x0=2, x1=26, y0=19, y1=48, require_3_neighbors=False)
    return strip_isolated_pixels(add_outline_to_layer(out))


def draw_abyssal_shadow_wings(c, cx, cy, span_phase):
    """
    Renders dark tattered Abyssal Raven/Bat Shadow-Wings (`x = 4..17, y = 8..32`,
    `C_CLOAK_DARK`, `C_CRIMSON_DARK`, `C_BLADE_VIOLET` membrane & bone spurs) unfurling
    from Malakor's shoulders (`cx, cy`) during his aerial vault & downward reap (Row 8 F03..F19)
    and Sovereign of Death Ultimate (Row 4).
    """
    if span_phase <= 0.05:
        return c

    spread = max(0.32, min(1.0, float(span_phase)))
    flap_dy = int(round(math.sin(float(span_phase) * math.pi * 2.5) * 1.0))

    rx = max(16, min(20, int(round(cx))))
    ry = max(14, min(22, int(round(cy))))

    # Wing wrist peak (upper bone-spur arch)
    wx = max(8, int(round(rx - 7.0 * spread)))
    wy = max(8, min(16, int(round(ry - 8.5 * spread + flap_dy * 0.5))))

    # 3 primary bat/raven wing-rib tips clamped inside x = 4..17, y = 8..32
    tx0 = max(4, int(round(rx - 14.0 * spread)))
    ty0 = max(9, min(20, int(round(ry - 5.0 * spread + flap_dy))))

    tx1 = max(4, int(round(rx - 13.0 * spread)))
    ty1 = max(14, min(26, int(round(ry + 3.0 * spread + flap_dy * 0.7))))

    tx2 = max(6, int(round(rx - 10.0 * spread)))
    ty2 = max(19, min(32, int(round(ry + 11.0 * spread + flap_dy * 0.4))))

    bx = max(14, rx - 1)
    by = max(21, min(31, int(round(ry + 9.0 * spread))))

    wing_im = Image.new('RGBA', (52, 52), (0, 0, 0, 0))
    wdraw = ImageDraw.Draw(wing_im)

    # Filled dark tattered bat/raven membranes (3 overlapping web panels)
    wdraw.polygon([(rx, ry + 1), (wx, wy + 1), (tx0, ty0), (tx1, ty1)], fill=C_CRIMSON_DARK)
    wdraw.polygon([(rx, ry + 3), (wx + 1, wy + 2), (tx1, ty1), (tx2, ty2)], fill=C_CLOAK_DARK)
    wdraw.polygon([(rx, ry + 4), (tx2, ty2), (bx, by)], fill=OBSIDIAN_DEEP)

    wing_arr = np.array(wing_im, dtype=np.uint8)

    # Interior shading & tattered trailing scallops inside x = 4..17, y = 8..32
    for y in range(8, 33):
        for x in range(4, 18):
            if wing_arr[y, x, 3] > 0:
                if (x + y) % 3 == 0:
                    wing_arr[y, x] = C_CRIMSON_DARK
                elif (x + y) % 2 == 0:
                    wing_arr[y, x] = C_CLOAK_DARK
                else:
                    wing_arr[y, x] = OBSIDIAN_MID

    def set_wing_px(x, y, col):
        ix = max(4, min(17, int(round(x))))
        iy = max(8, min(32, int(round(y))))
        wing_arr[iy, ix] = col

    def draw_wing_strut(x0, y0, x1, y1, col_main, col_sub=None):
        steps = int(max(abs(x1 - x0), abs(y1 - y0), 1) * 2)
        for s_i in range(steps + 1):
            t = s_i / max(1, steps)
            px_i = x0 + (x1 - x0) * t
            py_i = y0 + (y1 - y0) * t
            set_wing_px(px_i, py_i, col_main)
            if col_sub is not None:
                set_wing_px(px_i, py_i + 1, col_sub)

    # 1. Thick Upper Wing-Bone Arch: shoulder (rx, ry) -> wrist (wx, wy) -> outer tip (tx0, ty0)
    draw_wing_strut(rx, ry, wx, wy, C_BLADE_VIOLET, C_CRIMSON_DARK)
    draw_wing_strut(rx, ry - 1, wx, wy - 1, BONE_MID, C_BLADE_VIOLET)
    draw_wing_strut(wx, wy, tx0, ty0, C_BLADE_VIOLET, CRIMSON_MID)

    # 2. Prominent Wrist Alula Bone-Spur at (wx, wy)
    set_wing_px(wx, wy - 1, C_SOUL_WHITE)
    set_wing_px(wx - 1, wy - 2, BONE_LIGHT)
    set_wing_px(wx - 1, wy - 1, C_BLADE_VIOLET)
    set_wing_px(wx, wy, BONE_LIGHT)

    # 3. Articulated Bat/Raven Wing-Ribs & Trailing Tattered Pinion Feathers
    draw_wing_strut(wx, wy + 1, tx1, ty1, VIOLET_MID, C_CLOAK_DARK)
    draw_wing_strut(wx + 1, wy + 2, tx2, ty2, CRIMSON_MID, C_CLOAK_DARK)
    draw_wing_strut(tx0, ty0, tx1, ty1, C_CRIMSON_DARK, C_CLOAK_DARK)
    draw_wing_strut(tx1, ty1, tx2, ty2, C_CLOAK_DARK, OBSIDIAN_DEEP)

    # Sharp bone spurs at wingtip rib ends
    for tip_x, tip_y in ((tx0, ty0), (tx1, ty1), (tx2, ty2)):
        set_wing_px(tip_x, tip_y, BONE_LIGHT)
        set_wing_px(tip_x + 1, tip_y, C_BLADE_VIOLET)

    # Enforce strict wing bounding box (4 <= x <= 17, 8 <= y <= 32)
    wing_arr[:8, :, :] = 0
    wing_arr[33:, :, :] = 0
    wing_arr[:, :4, :] = 0
    wing_arr[:, 18:, :] = 0

    # Stamp wing over the outer-left cloak edge (x <= 15) and behind the hood/shoulder (x >= 16)
    for y in range(8, 33):
        for x in range(4, 18):
            if wing_arr[y, x, 3] > 0:
                if x <= 15 or y <= 16 or c[y, x, 3] == 0:
                    c[y, x] = wing_arr[y, x]
    return c


def draw_shadow_wings(base_frame, phase_rad, spread=1.0, shoulder_y=18):
    """Compatibility wrapper around draw_abyssal_shadow_wings."""
    if spread <= 0.05:
        return base_frame
    out = base_frame.copy()
    return draw_abyssal_shadow_wings(out, 18, shoulder_y, spread)


def draw_scythe_slash_trail(c, pivot_x, pivot_y, start_deg, end_deg, intensity=1.0):
    """
    Renders a dramatic 3-band Abyssal Crimson-Violet & Soul-Magenta Crescent Reap Trail
    (`C_SOUL_WHITE`, `C_BLADE_MAGENTA`, `C_CRIMSON_GLOW`) sweeping along the outer path
    of Malakor's scythe blade (`strictly clamped inside 3 <= x <= 48, 3 <= y <= 48`)
    during active cleave frames.
    """
    eff_deg = float(end_deg)
    eff_int = max(0.5, min(1.25, float(intensity)))
    rad = math.radians(eff_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    px, py = -uy, ux

    head_x = pivot_x + ux * 13.0
    head_y = pivot_y + uy * 13.0
    eff_blade = 21.0
    eff_curve = 12.0

    def set_trail_px(x, y, col):
        ix = max(3, min(48, int(round(x))))
        iy = max(3, min(48, int(round(y))))
        if ix <= 26 and 10 <= iy <= 22:
            return
        c[iy, ix] = col

    # Part A: Upper/Trailing Crescent Arc Tail behind the Scythe Collar (sweeping 64 deg behind eff_deg)
    tail_span = 64.0 * eff_int
    for t_i in range(41):
        u_t = t_i / 40.0  # 0.0 = tail tip, 1.0 = joins scythe collar at head_x, head_y
        ang_t = eff_deg - (1.0 - u_t) * tail_span
        rad_t = math.radians(ang_t)
        ca, sa = math.cos(rad_t), math.sin(rad_t)
        thick_t = max(2.0, math.sin(math.pow(u_t, 0.65) * math.pi * 0.85) * 6.4 * eff_int)
        r_mid = 13.4 + (1.0 - u_t) * 1.4
        w_steps = max(4, int(round(thick_t * 2.2)))
        for k in range(w_steps + 1):
            v = k / float(w_steps)
            r_cur = (r_mid - thick_t * 0.60) + v * thick_t
            tx = pivot_x + ca * r_cur
            ty = pivot_y + sa * r_cur
            if v >= 0.66 and u_t >= 0.35:
                col = C_SOUL_WHITE if u_t >= 0.60 else C_BLADE_MAGENTA
            elif v >= 0.34 or u_t >= 0.45:
                col = C_BLADE_MAGENTA if ((t_i + k) % 2 == 0) else C_CRIMSON_GLOW
            else:
                col = C_CRIMSON_GLOW if u_t >= 0.22 else CRIMSON_MID
            set_trail_px(tx, ty, col)


    # Part B: Broad 3-Band Sweeping Crescent Wake directly behind the 21px Curved Scythe Blade
    for i in range(41):
        s = i / 40.0
        if s < 0.03:
            continue
        b_dist = s * eff_blade
        hook = -(s ** 1.50) * eff_curve
        cx_b = head_x + px * b_dist + ux * hook
        cy_b = head_y + py * b_dist + uy * hook

        wake_w = int(round((math.sin(s * math.pi * 0.92) * 8.5 + 2.5) * eff_int))
        for w_k in range(1, wake_w + 1):
            wx = cx_b - ux * (w_k * 0.85) - px * (w_k * 0.28)
            wy = cy_b - uy * (w_k * 0.85) - py * (w_k * 0.28)
            u_w = w_k / max(1.0, float(wake_w))
            # 3-Band Abyssal Crimson-Violet & Soul-Magenta Crescent Reap Trail:
            if u_w < 0.34:
                w_col = C_SOUL_WHITE
            elif u_w < 0.68:
                w_col = C_BLADE_MAGENTA if ((i + w_k) % 3 != 0) else C_BLADE_VIOLET
            else:
                w_col = C_CRIMSON_GLOW if (w_k < wake_w) else CRIMSON_MID
            set_trail_px(wx, wy, w_col)

    return c



def solve_ik_elbow(sx, sy, hx, hy, L1=5.2, L2=5.0, bend_side=1.0):
    """
    2-Bone Inverse Kinematics solver returning the anatomical elbow joint (ex, ey)
    between shoulder (sx, sy) and hand (hx, hy).
    `bend_side = +1.0` bends the elbow naturally downward/back-left for a right-facing reaper.
    """
    dx = float(hx - sx)
    dy = float(hy - sy)
    dist = max(0.8, math.hypot(dx, dy))
    max_reach = float(L1 + L2) - 0.15
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


def draw_ik_reaper_arm(layer, sx, sy, hx, hy, L1=5.2, L2=5.0, bend_side=1.0, is_rear=False):
    """
    Draws Malakor's sculpted 2-segment Necropolis IK weapon arm onto `layer`.
    """
    ex, ey = solve_ik_elbow(sx, sy, hx, hy, L1, L2, bend_side=bend_side)

    u1x, u1y = ex - sx, ey - sy
    d1 = max(1.0, math.hypot(u1x, u1y))
    n1x, n1y = -u1y / d1, u1x / d1

    u2x, u2y = hx - ex, hy - ey
    d2 = max(1.0, math.hypot(u2x, u2y))
    n2x, n2y = -u2y / d2, u2x / d2

    if is_rear:
        draw_line_px(layer, sx + n1x * 0.85, sy + n1y * 0.85, ex + n1x * 0.7, ey + n1y * 0.7, BONE_MID)
        draw_line_px(layer, sx - n1x * 0.85, sy - n1y * 0.85, ex - n1x * 0.7, ey - n1y * 0.7, ROBE_MID)
        draw_line_px(layer, sx, sy, ex, ey, ROBE_LIGHT)

        draw_line_px(layer, ex + n2x * 0.8, ey + n2y * 0.8, hx + n2x * 0.65, hy + n2y * 0.65, BONE_LIGHT)
        draw_line_px(layer, ex - n2x * 0.8, ey - n2y * 0.8, hx - n2x * 0.65, hy - n2y * 0.65, ROBE_MID)
        draw_line_px(layer, ex, ey, hx, hy, BONE_MID)

        set_px(layer, ex, ey, VIOLET_BRIGHT)
        set_px(layer, ex + n1x * 0.6, ey + n1y * 0.6, BONE_LIGHT)
        ix_h, iy_h = int(round(hx)), int(round(hy))
        set_px(layer, ix_h, iy_h, SOUL_WHITE)
        set_px(layer, ix_h + 1, iy_h, BONE_LIGHT)
        set_px(layer, ix_h, iy_h + 1, BONE_LIGHT)
        set_px(layer, ix_h + 1, iy_h + 1, BONE_MID)
        return

    draw_line_px(layer, sx + n1x * 0.9, sy + n1y * 0.9, ex + n1x * 0.75, ey + n1y * 0.75, BONE_DARK)
    draw_line_px(layer, sx - n1x * 0.9, sy - n1y * 0.9, ex - n1x * 0.75, ey - n1y * 0.75, ROBE_DARK)
    draw_line_px(layer, sx, sy, ex, ey, ROBE_MID)

    draw_line_px(layer, ex + n2x * 0.85, ey + n2y * 0.85, hx + n2x * 0.65, hy + n2y * 0.65, BONE_MID)
    draw_line_px(layer, ex - n2x * 0.85, ey - n2y * 0.85, hx - n2x * 0.65, hy - n2y * 0.65, ROBE_DARK)
    draw_line_px(layer, ex, ey, hx, hy, ROBE_LIGHT)

    set_px(layer, sx, sy, ROBE_LIGHT)
    set_px(layer, sx + n1x * 0.7, sy + n1y * 0.7, BONE_DARK)

    set_px(layer, ex, ey, SOUL_CYAN)
    set_px(layer, ex + n1x * 0.7, ey + n1y * 0.7, BONE_LIGHT)

    ix_h, iy_h = int(round(hx)), int(round(hy))
    set_px(layer, ix_h, iy_h, SOUL_WHITE)
    set_px(layer, ix_h + 1, iy_h, BONE_LIGHT)
    set_px(layer, ix_h, iy_h + 1, BONE_LIGHT)
    set_px(layer, ix_h + 1, iy_h + 1, BONE_MID)


def draw_articulated_scythe(
    base_frame,
    grip_pos=(34, 20),
    shaft_deg=-50.0,
    shaft_reach=15.0,
    shaft_back=12.0,
    blade_span=17.0,
    blade_curve=6.0,
    blade_dir=1,
    rune_glow=1,
    slash_arc=None,
    two_handed=True,
    left_claw_ext=None,
    shoulder_pos=(26, 19),
):
    """
    Renders Malakor's full-scale Abyssal Great-Scythe with an authentic Wide Two-Handed Polearm Grip
    across his body (or Right-Hand High Guard when whipping the Left Spectral Chain & Bone-Claw in Row 3 Phase 1).
    """
    scythe_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    far_arm_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    near_arm_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    gauntlet_top_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    fx_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    def set_clamped_px(buf, x, y, col):
        ix = max(2, min(49, int(round(x))))
        iy = max(2, min(49, int(round(y))))
        buf[iy, ix] = col

    in_deg = float(shaft_deg)
    dy_off = float(shoulder_pos[1]) - 19.0
    dx_off = float(shoulder_pos[0]) - 26.0
    crouch_dy = max(0.0, dy_off)

    # Check if this is a vertical ground-plant pose (Row 4 Ult Stage 3 or Row 5 Kneeling):
    is_vertical_plant = (
        left_claw_ext is None
        and ((float(shaft_back) >= 15.0 and in_deg <= -78.0) or (not two_handed and in_deg <= -75.0))
    )

    if left_claw_ext is not None:
        # Row 3 Phase 1 (F00..F14): Right-hand High Guard (-68 deg -> -78 deg) holding the scythe blade
        # high overhead (y = 4..14) so the Left Spectral Chain & Bone-Claw whips cleanly across y = 21..25!
        eff_deg = max(-82.0, min(-72.0, in_deg - 4.0))
        rad = math.radians(eff_deg)
        ux, uy = math.cos(rad), math.sin(rad)
        px, py = -uy, ux
        cx = 23.0 + max(-1.0, min(1.0, dx_off * 0.5))
        cy = 14.5 + crouch_dy * 0.5
        rx = cx + ux * 1.5
        ry = cy + uy * 1.5
        # Left hand is extended forward at (28.5, 22.0) to whip the Spectral Chain & 3-Prong Bone-Claw!
        hx = 28.5
        hy = 22.0 + crouch_dy * 0.5
        head_x = cx + ux * 10.0
        head_y = max(4.5, cy + uy * 10.0)
        bx0 = max(6.0, cx - ux * 14.5)
        by0 = min(44.0, cy - uy * 14.5)
        eff_blade = 18.0
        eff_curve = 11.5
        norm_u = 0.0
    elif is_vertical_plant:
        eff_deg = -88.0
        rad = math.radians(eff_deg)
        ux, uy = math.cos(rad), math.sin(rad)
        px, py = -uy, ux
        plant_x = 33.5 if not two_handed else 34.5
        hx = plant_x
        hy = 22.0 + crouch_dy * 0.65
        rx = plant_x - 0.5
        ry = min(42.0, hy + 6.5)
        head_x = plant_x + 0.5
        head_y = max(7.0, 11.5 + crouch_dy * 0.45)
        bx0 = plant_x - 0.5
        by0 = 46.5
        eff_blade = 17.5
        eff_curve = 9.5
        norm_u = 0.0
    else:
        if in_deg <= -50.0:
            u_a = max(0.0, (in_deg - (-80.0)) / 30.0)
            eff_deg = -75.0 + u_a * 27.0
        elif in_deg <= -14.0:
            u_a = (in_deg - (-50.0)) / 36.0
            eff_deg = -48.0 + u_a * 32.0
        else:
            u_a = min(1.0, (in_deg - (-14.0)) / 69.0)
            eff_deg = -16.0 + u_a * 28.0

        norm_u = max(0.0, min(1.0, (eff_deg - (-75.0)) / 87.0))
        rad = math.radians(eff_deg)
        ux, uy = math.cos(rad), math.sin(rad)
        px, py = -uy, ux

        if eff_deg <= -48.0:
            w = (eff_deg - (-75.0)) / 27.0
            cx = 26.5 * (1.0 - w) + 26.2 * w
            cy = 18.2 * (1.0 - w) + 21.8 * w + crouch_dy * 0.65
        elif eff_deg <= -16.0:
            w = (eff_deg - (-48.0)) / 32.0
            cx = 26.2 * (1.0 - w) + 27.6 * w
            cy = 21.8 * (1.0 - w) + 23.0 * w + crouch_dy * 0.65
        else:
            w = (eff_deg - (-16.0)) / 28.0
            cx = 27.6 * (1.0 - w) + 26.4 * w
            cy = 23.0 * (1.0 - w) + 24.2 * w + crouch_dy * 0.65

        cx += max(-1.5, min(1.5, dx_off * 0.5))
        hx = cx + ux * 4.5
        hy = cy + uy * 4.5
        rx = cx - ux * 4.5
        ry = cy - uy * 4.5
        head_x = cx + ux * 13.0
        head_y = cy + uy * 13.0
        bx0 = max(6.0, min(45.0, cx - ux * 13.0))
        by0 = max(6.0, min(46.0, cy - uy * 13.0))
        eff_blade = 21.0
        eff_curve = 12.0

    # 1. Sweeping 3-Band Crimson-Violet & Soul-Magenta Crescent Scythe Slash Arc Trail
    #    anchored directly to the scythe's true rotational sweep (trail_start -> eff_deg)
    if slash_arc is not None:
        arc_s, arc_e, _, arc_int = slash_arc
        # Sweep from behind the blade (eff_deg - 42 deg) right up to eff_deg so zero gap/double-blade ever appears!
        if arc_e >= arc_s:
            trail_start = max(-76.0, eff_deg - (34.0 + norm_u * 18.0))
        else:
            trail_start = min(14.0, eff_deg + 38.0)
        draw_scythe_slash_trail(scythe_layer, cx, cy, trail_start, eff_deg, intensity=arc_int)


    # 2. Full-Length Diagonal Obsidian-Iron & Amethyst Polearm Haft (bx0, by0 -> head_x, head_y)
    haft_steps = int(max(abs(head_x - bx0), abs(head_y - by0), 1) * 2.5)
    for i in range(haft_steps + 1):
        t = i / max(1, haft_steps)
        sh_x = bx0 + (head_x - bx0) * t
        sh_y = by0 + (head_y - by0) * t
        set_clamped_px(scythe_layer, sh_x - px * 0.65, sh_y - py * 0.65, OBSIDIAN_DEEP)
        set_clamped_px(scythe_layer, sh_x + px * 0.55, sh_y + py * 0.55, OBSIDIAN_DARK)
        col_shaft = VIOLET_MID if (int(i / 4) % 3 == 0) else OBSIDIAN_LIGHT
        set_clamped_px(scythe_layer, sh_x, sh_y, col_shaft)

    # Wicked Butt-Spike at bottom-left of polearm shaft
    set_clamped_px(scythe_layer, bx0 - ux * 0.9, by0 - uy * 0.9, STEEL_LIGHT)
    set_clamped_px(scythe_layer, bx0 - ux * 1.7, by0 - uy * 1.7, VIOLET_BRIGHT)

    # 3. Ornate Winged Necropolis Skull Collar + Upper Horn Spikes at Scythe Head
    for dx_c in (-2, -1, 0, 1, 2):
        for dy_c in (-2, -1, 0, 1, 2):
            if abs(dx_c) + abs(dy_c) <= 3:
                set_clamped_px(
                    scythe_layer,
                    head_x + dx_c,
                    head_y + dy_c,
                    OBSIDIAN_LIGHT if (abs(dx_c) <= 1 and abs(dy_c) <= 1) else OBSIDIAN_DARK
                )
    for h_i in range(1, 5):
        set_clamped_px(
            scythe_layer,
            head_x - px * (h_i * 0.9) - ux * (h_i * 0.3),
            head_y - py * (h_i * 0.9) - uy * (h_i * 0.3),
            VIOLET_BRIGHT if h_i == 2 else OBSIDIAN_LIGHT
        )
    set_clamped_px(scythe_layer, head_x, head_y, CRIMSON_BRIGHT if rune_glow >= 1 else CRIMSON_MID)
    set_clamped_px(scythe_layer, head_x + ux * 1.5, head_y + uy * 1.5, STEEL_LIGHT)
    set_clamped_px(scythe_layer, head_x + ux * 2.4, head_y + uy * 2.4, VIOLET_BRIGHT)

    # 4. Massive 21px Curved Crescent Abyssal Scythe Blade
    b_steps = 40
    for i in range(b_steps + 1):
        s = i / b_steps
        b_dist = s * eff_blade
        hook = -(s ** 1.50) * eff_curve
        cx_b = head_x + px * b_dist + ux * hook
        cy_b = head_y + py * b_dist + uy * hook

        w_blade = max(1, int(round((1.0 - s * 0.78) * 5.0)))
        for w_i in range(w_blade + 1):
            off_u = (1.0 - (w_i / max(1, w_blade)) * 2.0) * (w_blade * 0.45)
            bx_p = cx_b + ux * off_u
            by_p = cy_b + uy * off_u

            if w_i == 0:
                col_b = OBSIDIAN_DARK if s < 0.75 else VIOLET_MID
            elif w_i == w_blade:
                if slash_arc is not None and 0.12 <= s <= 0.92:
                    col_b = C_SOUL_WHITE
                elif rune_glow >= 3 and 0.15 <= s <= 0.90:
                    col_b = C_BLADE_MAGENTA if (i % 3 != 0) else C_SOUL_WHITE
                else:
                    col_b = C_SOUL_WHITE if (rune_glow >= 2 and s > 0.25) else (STEEL_EDGE if s < 0.8 else C_BLADE_MAGENTA)
            elif w_i == 1 and 0.12 <= s <= 0.78 and (i % 6 == (rune_glow % 6)):
                col_b = CRIMSON_BRIGHT if (i % 12 < 6) else C_BLADE_MAGENTA
            else:
                col_b = VIOLET_BRIGHT if (w_i >= w_blade - 2) else OBSIDIAN_MID

            set_clamped_px(scythe_layer, bx_p, by_p, col_b)

    # 5. Authentic Two-Handed Polearm Arms (or Right-Hand High Guard + Left Chain-Whip Arm):
    sx_far = max(14.0, min(40.0, 26.0 + dx_off))
    sy_far = max(10.0, min(40.0, 17.5 + dy_off))
    ex_f, ey_f = solve_ik_elbow(sx_far, sy_far, hx, hy, 5.8, 5.8, bend_side=1.0)
    draw_thick_line_px(far_arm_layer, sx_far, sy_far, ex_f, ey_f, OBSIDIAN_MID, OBSIDIAN_DEEP)
    draw_thick_line_px(far_arm_layer, ex_f, ey_f, hx, hy, OBSIDIAN_LIGHT, OBSIDIAN_DARK)
    set_clamped_px(far_arm_layer, ex_f, ey_f, VIOLET_MID)

    if two_handed or left_claw_ext is not None:
        sx_near = max(12.0, min(36.0, 18.0 + dx_off))
        sy_near = max(10.0, min(42.0, 18.5 + dy_off))
        ex_n, ey_n = solve_ik_elbow(sx_near, sy_near, rx, ry, 6.4, 6.4, bend_side=1.0)
        draw_thick_line_px(near_arm_layer, sx_near, sy_near, ex_n, ey_n, OBSIDIAN_MID, OBSIDIAN_DEEP)
        draw_thick_line_px(near_arm_layer, ex_n, ey_n, rx, ry, OBSIDIAN_LIGHT, OBSIDIAN_DARK)
        set_clamped_px(near_arm_layer, ex_n, ey_n, VIOLET_BRIGHT)
        set_clamped_px(near_arm_layer, (ex_n + rx) * 0.5, (ey_n + ry) * 0.5, BONE_MID)

        for gx_p, gy_p in ((hx, hy), (rx, ry)):
            ix_g, iy_g = int(round(gx_p)), int(round(gy_p))
            set_clamped_px(gauntlet_top_layer, ix_g, iy_g, BONE_LIGHT)
            set_clamped_px(gauntlet_top_layer, ix_g + 1, iy_g, BONE_MID)
            set_clamped_px(gauntlet_top_layer, ix_g, iy_g + 1, BONE_MID)
            set_clamped_px(gauntlet_top_layer, ix_g + 1, iy_g + 1, BONE_DARK)
    else:
        ix_g, iy_g = int(round(hx)), int(round(hy))
        set_clamped_px(gauntlet_top_layer, ix_g, iy_g, BONE_LIGHT)
        set_clamped_px(gauntlet_top_layer, ix_g + 1, iy_g, BONE_MID)
        set_clamped_px(gauntlet_top_layer, ix_g, iy_g + 1, BONE_MID)
        set_clamped_px(gauntlet_top_layer, ix_g + 1, iy_g + 1, BONE_DARK)

    # 6. Left Spectral Chain & 3-Prong Bone-Claw Whip (Row 3 SKILL Phase 1: F00..F14)
    if left_claw_ext is not None:
        raw_tx, raw_ty, pinch_t, draw_chain = left_claw_ext
        tx = max(28, min(46, int(round(raw_tx))))
        ty = max(18, min(30, int(round(raw_ty))))
        chain_origin_x, chain_origin_y = 28.0, 22.5 + crouch_dy * 0.5

        if draw_chain and tx > chain_origin_x:
            c_steps = int(max(abs(tx - chain_origin_x), abs(ty - chain_origin_y), 1) * 2)
            whip_amp = 1.15 * (1.0 - float(pinch_t) * 0.75)
            for ci in range(c_steps + 1):
                u_c = ci / max(1, c_steps)
                cx_i = chain_origin_x + (tx - chain_origin_x) * u_c
                cy_i = chain_origin_y + (ty - chain_origin_y) * u_c + math.sin(u_c * math.pi * 2.5) * whip_amp
                # Alternating glowing magenta-cyan spectral chain links
                link_idx = int(ci // 2)
                if link_idx % 2 == 0:
                    c_core = C_SPECTRAL_CYAN if (ci % 2 == 0) else C_SOUL_WHITE
                    c_rim = C_BLADE_MAGENTA
                else:
                    c_core = C_BLADE_MAGENTA
                    c_rim = C_CRIMSON_GLOW
                set_clamped_px(fx_layer, cx_i, cy_i, c_core)
                set_clamped_px(fx_layer, cx_i, cy_i - 1, c_rim if (link_idx % 2 == 0) else OBSIDIAN_MID)
                set_clamped_px(fx_layer, cx_i, cy_i + 1, OBSIDIAN_DEEP if (link_idx % 2 == 0) else c_rim)

        # 3-Prong Spectral Bone-Claw at (tx, ty)
        set_clamped_px(fx_layer, tx - 1, ty, C_BLADE_MAGENTA)
        set_clamped_px(fx_layer, tx - 1, ty - 1, C_SPECTRAL_CYAN)
        set_clamped_px(fx_layer, tx - 1, ty + 1, C_CRIMSON_GLOW)
        set_clamped_px(fx_layer, tx, ty, C_CRIMSON_GLOW)
        set_clamped_px(fx_layer, tx, ty - 1, BONE_LIGHT)
        set_clamped_px(fx_layer, tx, ty + 1, BONE_LIGHT)

        spread_y = 2.6 if float(pinch_t) < 0.6 else 1.6
        # Top, Middle, and Bottom Bone Prongs (3-prong claw!)
        for d_t in range(1, 5):
            u_t = d_t / 4.0
            p_col = C_SOUL_WHITE if d_t >= 3 else BONE_LIGHT
            # Top curved bone talon
            top_y = ty - 1.0 - u_t * spread_y + (0.6 if d_t == 4 else 0.0)
            set_clamped_px(fx_layer, tx + d_t, top_y, p_col)
            set_clamped_px(fx_layer, tx + d_t, top_y + 0.7, BONE_MID if d_t <= 2 else C_BLADE_MAGENTA)
            # Center piercing bone talon
            set_clamped_px(fx_layer, tx + d_t, ty, p_col)
            # Bottom curved bone talon
            bot_y = ty + 1.0 + u_t * spread_y - (0.6 if d_t == 4 else 0.0)
            set_clamped_px(fx_layer, tx + d_t, bot_y, p_col)
            set_clamped_px(fx_layer, tx + d_t, bot_y - 0.7, BONE_MID if d_t <= 2 else C_BLADE_MAGENTA)

        # Hook snare burst when the 3-prong bone-claw clamps onto the enemy at max extension
        if float(pinch_t) >= 0.85 and tx >= 40:
            for sx_b, sy_b, b_col in (
                (tx + 2, ty - 4, C_SPECTRAL_CYAN),
                (tx + 3, ty - 4, C_SOUL_WHITE),
                (tx + 2, ty + 4, C_SPECTRAL_CYAN),
                (tx + 3, ty + 4, C_BLADE_MAGENTA),
                (tx + 4, ty - 1, C_CRIMSON_GLOW),
                (tx + 4, ty + 1, C_CRIMSON_GLOW),
            ):
                if 3 <= sx_b <= 48 and 3 <= sy_b <= 48:
                    set_clamped_px(fx_layer, sx_b, sy_b, b_col)

    out = composite_over(base_frame, far_arm_layer)
    out = composite_over(out, scythe_layer)
    out = composite_over(out, near_arm_layer)
    out = composite_over(out, gauntlet_top_layer)
    out = composite_over(out, fx_layer)
    return strip_isolated_pixels(add_outline_to_layer(out))


draw_abyssal_scythe = draw_articulated_scythe
draw_reaper_scythe_and_arm = draw_articulated_scythe



def render_walk_legs(tpl, f):
    """
    Renders a grounded, predatory 30-frame 2-step armored stride cycle (f = 0..29)
    in true back-to-front anatomical depth order with Malakor's FULL tattered dark cloak behind his legs:
    1. Backmost Layer (`cape_layer`): Full width of his tattered dark cloak (`x = 1..25` for `y = 14..42`,
       plus `x = 1..13` for `y = 43..44`), replacing any bright standing-leg bone/metal pixel (`r > 70 or g > 70`)
       in `y = 32..42, x = 14..25` with dark tattered cloak shading (`ROBE_DARK` / `ROBE_DEEP`) so the full
       dark cloak drapes seamlessly behind his two animated striding skeletal legs!
    2. Far Leg Layer: Sculpted obsidian thigh + knee-guard + greave/boot (`far_leg`, shaded 0.78x).
    3. Crimson Necropolis Tabard (`tabard_layer`) swinging dynamically between the legs.
    4. Near Leg Layer: Full-brightness obsidian thigh + knee-skull + greave/boot (`near_leg`).
    5. Upper Torso & Hooded Skull (`torso_layer`): Extended down to `y = 33` (`x = 14..31`) so his ribcage,
       soul-fire core, and tattered waist sash are 100% intact!
    """
    phase = (f / 30.0) * 2.0 * math.pi
    bob_y = int(round(math.cos(phase * 2.0) * 1.0))

    stand = tpl['stand'].copy()
    cape_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    # 1. Backmost full tattered dark cloak: x = 1..25 for y = 14..42 (and x = 1..13 for y = 43..44)
    for y in range(14, 45):
        ny = y + bob_y
        if not (2 <= ny < 50):
            continue
        u = max(0.0, (y - 14) / 28.0)
        wave_dx = min(0, int(round(-u * 1.0 + math.sin(phase - u * 3.2) * (0.8 * u))))
        wave_dy = int(round(math.cos(phase - u * 2.6) * (0.45 * u)))
        max_cx = 25 if y <= 42 else 13
        for x in range(1, max_cx + 1):
            if stand[y, x, 3] == 0:
                continue
            col = stand[y, x].copy()
            if 32 <= y <= 42 and 14 <= x <= 25:
                r, g, b, _ = col
                if r > 70 or g > 70:
                    col = np.array(ROBE_DARK if ((x + y) % 2 == 0) else ROBE_DEEP, dtype=np.uint8)
            cy = max(14, min(48, ny + wave_dy))
            cx = max(2, min(max_cx, x + (wave_dx if x <= 16 else 0)))
            cape_layer[cy, cx] = col
            if x >= 14:
                cape_layer[ny, x] = col
    cape_layer = fill_layer_pinholes(cape_layer, x0=2, x1=26, y0=13, y1=48, require_3_neighbors=False)

    # 2. Upper Armored Torso, Ribcage, Soul-Fire Core & Tattered Waist Sash extended down to y = 33 (x = 14..31)
    for y in range(0, 34):
        ny = y + bob_y
        if not (2 <= ny < 50):
            continue
        for x in range(14, 32):
            if stand[y, x, 3] > 0:
                col = stand[y, x].copy()
                if y >= 32 and x >= 24:
                    r, g, b, _ = col
                    if r > 70 or g > 70:
                        col = np.array(ROBE_DARK if ((x + y) % 2 == 0) else ROBE_DEEP, dtype=np.uint8)
                torso_layer[ny, min(49, x)] = col

    torso_layer = fill_layer_pinholes(torso_layer, require_3_neighbors=False)

    hip_x = 24.0
    hip_y = 31.0 + bob_y

    def build_striding_greave(boot_patch, orig_cx, swing_phase, is_far_leg=False):
        layer = np.zeros((52, 52, 4), dtype=np.uint8)
        s_val = math.sin(swing_phase)
        c_val = math.cos(swing_phase)

        knee_lift = max(0.0, c_val)
        knee_x = hip_x + s_val * 5.2 + knee_lift * 1.8
        knee_y = hip_y + 6.5 - knee_lift * 1.8

        foot_target_x = 24.0 + s_val * 7.0 - knee_lift * 1.6
        foot_lift_dy = bob_y - int(round(knee_lift * 2.4))

        boot_rot_deg = s_val * 16.0 - knee_lift * 18.0
        pil_boot = Image.fromarray(boot_patch, mode='RGBA')
        rot_boot = np.array(
            pil_boot.rotate(boot_rot_deg, resample=Image.NEAREST, center=(orig_cx, 43.0)),
            dtype=np.uint8
        )

        dx_boot = int(round(foot_target_x - orig_cx))
        for y in range(37, 52):
            for x in range(4, 48):
                if rot_boot[y, x, 3] > 0:
                    ny = min(49, max(35, y + foot_lift_dy))
                    nx = min(48, max(5, x + dx_boot))
                    px_col = rot_boot[y, x].copy()
                    if is_far_leg:
                        px_col[0] = int(px_col[0] * 0.76)
                        px_col[1] = int(px_col[1] * 0.76)
                        px_col[2] = int(px_col[2] * 0.80)
                    layer[ny, nx] = px_col

        ank_x = foot_target_x + math.sin(math.radians(boot_rot_deg)) * 1.2
        ank_y = 43.0 + foot_lift_dy

        if is_far_leg:
            c_dark, c_mid, c_hi, c_knee = OBSIDIAN_DEEP, OBSIDIAN_DARK, OBSIDIAN_MID, CRIMSON_MID
        else:
            c_dark, c_mid, c_hi, c_knee = OBSIDIAN_DARK, OBSIDIAN_MID, OBSIDIAN_LIGHT, VIOLET_BRIGHT

        # Armored Thigh (Hip -> Knee)
        for off_x, col in [(-1.8, c_dark), (-0.8, c_mid), (0.2, c_hi), (1.2, c_mid), (2.0, c_dark)]:
            draw_line_px(layer, hip_x + off_x, hip_y, knee_x + off_x * 0.85, knee_y, col)

        # Obsidian Greave (Knee -> Ankle)
        for off_x, col in [(-1.4, c_dark), (-0.4, c_mid), (0.6, c_hi), (1.4, c_dark)]:
            draw_line_px(layer, knee_x + off_x, knee_y, ank_x + off_x * 0.85, ank_y, col)

        # Skull Knee-Guard highlight
        set_px(layer, knee_x, knee_y, c_knee)
        set_px(layer, knee_x + 1, knee_y, c_hi)
        return fill_layer_pinholes(layer)

    far_leg = build_striding_greave(tpl['leg_back'], 12.0, phase + math.pi, is_far_leg=True)
    near_leg = build_striding_greave(tpl['leg_front'], 30.0, phase, is_far_leg=False)

    # Dynamic Crimson Necropolis Tabard swinging between the greaves (y = 31..40)
    tabard_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    flap_dx = math.sin(phase) * 2.0
    for off_x, col in [(-2.0, CRIMSON_DEEP), (-1.0, CRIMSON_DARK), (0.0, CRIMSON_MID), (1.0, CRIMSON_DARK)]:
        draw_line_px(
            tabard_layer,
            hip_x + off_x,
            hip_y,
            hip_x + off_x + flap_dx,
            hip_y + 8.0,
            col
        )

    out = composite_over(cape_layer, far_leg)
    out = composite_over(out, tabard_layer)
    out = composite_over(out, near_leg)
    out = composite_over(out, torso_layer)
    return strip_isolated_pixels(fill_layer_pinholes(out))


def make_crouch_body(tpl, crouch_depth):
    """
    Constructs a continuous vertical compression warp on `tpl['stand']` with `crouch_depth` in [1..7]
    so Malakor's left tattered cloak (`x = 10..20, y = 26..36`) and armor remain 100% solid with zero holes.
    """
    stand = tpl['stand']
    d = max(0, min(7, int(round(crouch_depth))))
    if d == 0:
        return stand.copy()

    canvas = np.zeros((52, 52, 4), dtype=np.uint8)
    for ny in range(1, 50):
        if ny <= 27 + d:
            sy = ny - d
            if 1 <= sy < 50:
                for x in range(1, 50):
                    if stand[sy, x, 3] > 0:
                        canvas[ny, x] = stand[sy, x]
        elif ny <= 42:
            u = (ny - (27 + d)) / float(max(1, 42 - (27 + d)))
            sy = min(42, max(27, int(round(27.0 + u * 15.0))))
            for x in range(1, 50):
                if stand[sy, x, 3] > 0:
                    if x >= 22:
                        dx = int(round(math.sin(u * math.pi) * d * 0.35))
                    elif x <= 15:
                        dx = -int(round(math.sin(u * math.pi) * d * 0.15))
                    else:
                        dx = 0
                    canvas[ny, max(2, min(49, x + dx))] = stand[sy, x]
        else:
            for x in range(1, 50):
                if stand[ny, x, 3] > 0:
                    canvas[ny, x] = stand[ny, x]

    canvas = fill_layer_pinholes(canvas, require_3_neighbors=False)
    return strip_isolated_pixels(add_outline_to_layer(canvas))


def make_jump_body(tpl, jump_dy, tuck_amount, torso_lean_dx=0):
    """
    Constructs a full-body aerial Shadow-Wing Reaper pose in true back-to-front anatomical order
    with Malakor's FULL tattered dark cloak behind his legs.
    """
    stand = tpl['stand'].copy()
    torso_dy = max(-2, min(4, int(round(jump_dy))))

    cape_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    # 1. Billowing Full Aerial Cloak: x = 1..25 for y = 14..42 (and x = 1..13 for y = 43..44)
    cloak_lift = int(round(max(0.0, tuck_amount) * 2.2))
    for y in range(14, 45):
        max_cx = 25 if y <= 42 else 13
        for x in range(1, max_cx + 1):
            if stand[y, x, 3] == 0:
                continue
            col = stand[y, x].copy()
            if 32 <= y <= 42 and 14 <= x <= 25:
                r, g, b, _ = col
                if r > 70 or g > 70:
                    col = np.array(ROBE_DARK if ((x + y) % 2 == 0) else ROBE_DEEP, dtype=np.uint8)
            u = max(0.0, (y - 14) / 28.0)
            shift_left = int(round(u * 1.5 * max(0.2, tuck_amount))) if x <= 16 else 0
            cx = max(2, min(max_cx, x - shift_left))
            cy = max(14, min(48, y + torso_dy - int(round(u * cloak_lift))))
            cape_layer[cy, cx] = col
            if x >= 14:
                ny_b = max(12, min(48, y + torso_dy))
                cape_layer[ny_b, x] = col
    cape_layer = fill_layer_pinholes(cape_layer, x0=2, x1=26, y0=12, y1=48, require_3_neighbors=False)

    # 2. Upper Armored Torso, Ribcage, Soul-Fire Core & Tattered Waist Sash extended down to y = 33 (x = 14..31)
    dx_torso = min(1, max(0, int(torso_lean_dx)))
    for y in range(0, 34):
        ny = y + torso_dy
        if not (2 <= ny < 50):
            continue
        for x in range(14, 32):
            if stand[y, x, 3] > 0:
                col = stand[y, x].copy()
                if y >= 32 and x >= 24:
                    r, g, b, _ = col
                    if r > 70 or g > 70:
                        col = np.array(ROBE_DARK if ((x + y) % 2 == 0) else ROBE_DEEP, dtype=np.uint8)
                torso_layer[ny, max(2, min(49, x + dx_torso))] = col

    torso_layer = fill_layer_pinholes(torso_layer, require_3_neighbors=False)

    hip_x = 24.0
    hip_y = 31.0 + torso_dy

    def build_aerial_greave(boot_patch, orig_cx, knee_dx, knee_dy, foot_dx, foot_dy, boot_rot_deg, is_far_leg=False):
        layer = np.zeros((52, 52, 4), dtype=np.uint8)
        pil_boot = Image.fromarray(boot_patch, mode='RGBA')
        rot_boot = np.array(
            pil_boot.rotate(boot_rot_deg, resample=Image.NEAREST, center=(orig_cx, 43.0)),
            dtype=np.uint8
        )
        for y in range(36, 52):
            for x in range(4, 48):
                if rot_boot[y, x, 3] > 0:
                    ny = max(28, min(48, y + int(round(foot_dy))))
                    nx = max(4, min(48, x + int(round(foot_dx))))
                    px_col = rot_boot[y, x].copy()
                    if is_far_leg:
                        px_col[0] = int(px_col[0] * 0.76)
                        px_col[1] = int(px_col[1] * 0.76)
                        px_col[2] = int(px_col[2] * 0.80)
                    layer[ny, nx] = px_col

        kx = hip_x + knee_dx
        ky = hip_y + knee_dy
        ax = orig_cx + foot_dx
        ay = 43.0 + foot_dy

        if is_far_leg:
            c_dark, c_mid, c_hi, c_knee = OBSIDIAN_DEEP, OBSIDIAN_DARK, OBSIDIAN_MID, CRIMSON_MID
        else:
            c_dark, c_mid, c_hi, c_knee = OBSIDIAN_DARK, OBSIDIAN_MID, OBSIDIAN_LIGHT, VIOLET_BRIGHT

        for off_x, col in [(-1.6, c_dark), (-0.6, c_mid), (0.4, c_hi), (1.4, c_dark)]:
            draw_line_px(layer, hip_x + off_x, hip_y, kx + off_x * 0.85, ky, col)
        for off_x, col in [(-1.2, c_dark), (0.0, c_mid), (1.2, c_dark)]:
            draw_line_px(layer, kx + off_x, ky, ax + off_x * 0.85, ay, col)
        set_px(layer, kx, ky, c_knee)
        return fill_layer_pinholes(layer)

    t = max(0.0, tuck_amount)
    far_leg = build_aerial_greave(
        tpl['leg_back'],
        12.0,
        knee_dx=-3.0 * t - 2.0,
        knee_dy=6.0 - 1.5 * t,
        foot_dx=-2.5 * t,
        foot_dy=torso_dy - 3.5 * t,
        boot_rot_deg=-22.0 * t,
        is_far_leg=True
    )
    near_leg = build_aerial_greave(
        tpl['leg_front'],
        30.0,
        knee_dx=4.5 * t + 2.0,
        knee_dy=5.0 - 2.6 * t,
        foot_dx=1.2 * t,
        foot_dy=torso_dy - 4.8 * t,
        boot_rot_deg=-20.0 * t,
        is_far_leg=False
    )

    tabard_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    for off_x, col in [(-1.5, CRIMSON_DEEP), (-0.5, CRIMSON_DARK), (0.5, CRIMSON_MID), (1.5, CRIMSON_DARK)]:
        draw_line_px(tabard_layer, hip_x + off_x, hip_y, hip_x + off_x + 1.5 * t, hip_y + 7.0 - 1.2 * t, col)

    out = composite_over(cape_layer, far_leg)
    out = composite_over(out, tabard_layer)
    out = composite_over(out, near_leg)
    out = composite_over(out, torso_layer)
    return strip_isolated_pixels(fill_layer_pinholes(out))


def pulse_hood_eyes(frame, dy=0, bright=False):
    """Pulses Malakor's glowing crimson-violet skull eye ONLY when inside his opaque hood."""
    ey = 15 + int(round(dy))
    if 2 <= ey <= 48 and frame[ey, 24, 3] > 0 and frame[ey, 25, 3] > 0:
        set_px(frame, 24, ey, SOUL_WHITE if bright else VIOLET_PINK)
        set_px(frame, 25, ey, CRIMSON_BRIGHT if bright else VIOLET_BRIGHT)


def draw_idle_scythe_soul_wisps(frame, f, breath_dy=0):
    """
    Pass #8 Row 0 (`IDLE`) Living Weapon Rune-Mote Ascension:
    Renders 3 slowly ascending, phase-animated crimson-magenta & abyssal-violet soul wisps
    curling upward from the Great-Scythe skull collar and curved crescent blade (`x = 28..45, y = 6..22`)
    across all 30 frames (`f = 0..29`, looping seamlessly via `(f / 30.0) * 2 * math.pi`).
    """
    phase = (f / 30.0) * 2.0 * math.pi
    # Base anchors along the skull collar (x~34, y~14) and curved crescent blade (x~39..43, y~16..21)
    base_anchors = [
        (33.5, 16.5),
        (38.5, 18.0),
        (42.5, 20.5),
    ]
    for w_idx in range(3):
        u = ((f + w_idx * 10) % 30) / 30.0
        w_phase = phase + w_idx * (2.0 * math.pi / 3.0)
        ax0, ay0 = base_anchors[(w_idx + (f // 10)) % 3] if False else (
            32.0 + u * 9.5 + math.sin(w_phase) * 1.4,
            20.0 - u * 12.2 + breath_dy * 0.5,
        )
        wx = max(29, min(44, int(round(ax0))))
        wy = max(7, min(20, int(round(ay0))))
        curl_dx = 1 if math.cos(w_phase) >= 0.0 else -1

        is_crimson = ((f + w_idx) % 2 == 0)
        head_col = SOUL_WHITE if (0.25 <= u <= 0.75 and (f + w_idx) % 3 == 0) else (C_BLADE_MAGENTA if is_crimson else VIOLET_BRIGHT)
        mid_col = CRIMSON_BRIGHT if is_crimson else C_BLADE_MAGENTA
        tail_col = VIOLET_MID if is_crimson else CRIMSON_MID

        # Connected 3-to-4px curling soul wisp inside x = 28..45, y = 6..22
        set_px(frame, wx, wy, head_col)
        set_px(frame, wx, min(22, wy + 1), mid_col)
        set_px(frame, max(28, min(45, wx + curl_dx)), min(22, wy + 1), tail_col)
        if 0.15 <= u <= 0.85:
            set_px(frame, max(28, min(45, wx + curl_dx)), max(6, wy - 1), C_BLADE_MAGENTA if is_crimson else CRIMSON_BRIGHT)


def draw_walk_shadow_mist_puffs(frame, f):
    """
    Pass #8 Row 1 (`WALK`) Grounded Heel-Strike Footstep Sparks / Dust Puffs (`F06..F10` & `F21..F25`):
    Draws small, crisp 3-to-5 pixel dark violet-crimson shadow-mist puffs at boot/hem level
    (`y = 44..46, x = 16..34`) during both foot-plant windows.
    """
    if 6 <= f <= 10:
        k = f - 6  # Step 1 front greave plant (x = 27..33, y = 44..46)
        cx = 29 + (k % 2)
        pts = [
            (cx, 46, CRIMSON_BRIGHT if k <= 1 else VIOLET_MID),
            (cx, 45, VIOLET_BRIGHT if k <= 2 else CRIMSON_DARK),
            (min(34, cx + 1), 45, C_BLADE_MAGENTA if k <= 1 else VIOLET_DEEP),
            (max(16, cx - 1), 46, CRIMSON_DARK),
        ]
        if k <= 2:
            pts.append((min(34, cx + 1 + (k // 2)), 44, VIOLET_BRIGHT if k == 0 else CRIMSON_MID))
        for px_x, px_y, col in pts:
            if 16 <= px_x <= 34 and 44 <= px_y <= 46:
                set_px(frame, px_x, px_y, col)

    elif 21 <= f <= 25:
        k = f - 21  # Step 2 rear/opposite greave plant (x = 17..24, y = 44..46)
        cx = 20 + (k % 2)
        pts = [
            (cx, 46, CRIMSON_BRIGHT if k <= 1 else VIOLET_MID),
            (cx, 45, VIOLET_BRIGHT if k <= 2 else CRIMSON_DARK),
            (max(16, cx - 1), 45, C_BLADE_MAGENTA if k <= 1 else VIOLET_DEEP),
            (min(34, cx + 1), 46, CRIMSON_DARK),
        ]
        if k <= 2:
            pts.append((max(16, cx - 1 - (k // 2)), 44, VIOLET_BRIGHT if k == 0 else CRIMSON_MID))
        for px_x, px_y, col in pts:
            if 16 <= px_x <= 34 and 44 <= px_y <= 46:
                set_px(frame, px_x, px_y, col)


def draw_hurt_impact_burst(frame, f):
    """
    Pass #8 Row 5 (`DEATH F01..F05`) Directional Impact Hit-Burst on Initial Hurt Frames:
    Draws a crisp 4-ray Directional Hit-Spark / Armor Impact Glint at chest height
    (`x = 26..33, y = 18..25`) that expands and fades across `F01..F05`.
    """
    if not (1 <= f <= 5):
        return
    k = f - 1  # 0..4
    cx = 29
    cy = 21 + (1 if k >= 3 else 0)

    def set_burst_px(x, y, col):
        if 26 <= x <= 33 and 18 <= y <= 25:
            set_px(frame, x, y, col)

    # Connected central core + cardinal bridge so strip_isolated_pixels never removes any ray pixel
    set_burst_px(cx, cy, SOUL_WHITE if k <= 2 else C_BLADE_MAGENTA)
    for dx_c, dy_c in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        set_burst_px(cx + dx_c, cy + dy_c, CRIMSON_BRIGHT if k <= 1 else VIOLET_MID)

    # 4 directional diagonal rays expanding across F01..F05 within x=26..33, y=18..25
    r_max = min(3, 1 + (k + 1) // 2)
    for idx, (rx, ry) in enumerate(((-1, -1), (1, -1), (-1, 1), (1, 1))):
        for r_step in range(1, r_max + 1):
            px_x = cx + rx * r_step
            px_y = cy + ry * r_step
            if r_step == r_max:
                col = SOUL_WHITE if k == 0 else (CRIMSON_BRIGHT if (idx + k) % 2 == 0 else VIOLET_BRIGHT)
            else:
                col = C_BLADE_MAGENTA if k <= 2 else CRIMSON_MID
            set_burst_px(px_x, px_y, col)


def build_row0_idle(tpl):
    """
    Row 0: 30-Frame Ominous Soulreaper IDLE with wide Two-Handed Polearm Carry:
    - Upper right gauntlet at `(35, 19)` guiding the upper shaft, lower left gauntlet at `(31.2, 23.6)`
      gripping the lower shaft near the forward hip (`6.0px` spacing along the `-50 deg` obsidian shaft).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        base = tpl['stand'].copy()

        breath_dy = -1 if 8 <= f <= 20 else 0
        if breath_dy == -1:
            # Duplicate row 29 instead of erasing it so zero horizontal waist gap opens!
            upper = base[11:30, 14:38].copy()
            base[10:29, 14:38] = upper
            base[29, 14:38] = upper[18, :]
            base = fill_layer_pinholes(base)

        base = apply_cloak_wave(base, phase, amplitude=1.6, vertical_flutter=0.7)
        pulse_hood_eyes(base, dy=breath_dy, bright=(f % 6 in (2, 3)))

        shaft_deg = -50.0 + math.sin(phase) * 4.5 + (0.8 if (f % 2 == 1) else -0.8)
        rune_glow = (f % 3) + 1
        grip_x = 35 + int(round(math.sin(phase) * 1.0))
        frame = draw_abyssal_scythe(
            base,
            grip_pos=(grip_x, 19 + breath_dy),
            shaft_deg=shaft_deg,
            shaft_reach=15.0,
            shaft_back=13.0,
            blade_span=17.0,
            blade_curve=6.0,
            blade_dir=1,
            rune_glow=rune_glow,
            two_handed=True,
            shoulder_pos=(26, 19 + breath_dy),
        )
        # Pass #8: 3 crimson-magenta & abyssal-violet soul wisps curling upward from skull collar & crescent blade (x=28..45, y=6..22)
        draw_idle_scythe_soul_wisps(frame, f, breath_dy=breath_dy)
        frames.append(ensure_safe_cell(frame, margin=2))
    return frames


def build_row1_walk(tpl):
    """Row 1: 30-Frame Predatory 2-Step Armored Stride Cycle with wide two-handed polearm carry (`gx = 34..36, gy = 18..20`)."""
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        body = render_walk_legs(tpl, f)
        bob_y = int(round(math.cos(phase * 2.0) * 1.0))
        pulse_hood_eyes(body, dy=bob_y, bright=(f % 8 < 3))

        # Subtle counter-swinging Abyssal Great-Scythe held in wide two-handed polearm grip (gx = 34..36)
        shaft_deg = -48.0 - math.sin(phase) * 9.5
        grip_x = 35 - int(round(math.sin(phase) * 1.0))
        grip_y = 19 + bob_y + int(round(math.cos(phase) * 1.0))
        frame = draw_abyssal_scythe(
            body,
            grip_pos=(grip_x, grip_y),
            shaft_deg=shaft_deg,
            shaft_reach=14.5,
            shaft_back=12.5,
            blade_span=16.5,
            blade_curve=5.8,
            blade_dir=1,
            rune_glow=1 + (1 if f % 6 == 0 else 0),
            two_handed=True,
            shoulder_pos=(26, 19 + bob_y),
        )
        # Pass #8: Dark violet-crimson shadow-mist puffs at boot/hem level on F06..F10 & F21..F25
        draw_walk_shadow_mist_puffs(frame, f)
        frames.append(ensure_safe_cell(frame, margin=2))
    return frames


def build_row2_auto_attack(tpl):
    """
    Row 2: 30-Frame AUTO_ATTACK (Authentic Two-Handed Polearm Reaping Sweep & Pull-Cut):
    - F00..F09 (High Polearm Coil): Both hands lift and cock the scythe shaft high (`shaft_deg: -50 deg -> -80 deg`).
    - F10..F17 (Sweeping Reap & Lever Pull-Cut): Sweeps the heavy crescent head wide out in front with a
      3-band Abyssal Crimson-Violet & Soul-Magenta Crescent Reap Trail (`draw_scythe_slash_trail`), plus F18 follow-through.
    - F19..F29: Smooth two-handed recovery (`+50 deg -> -50 deg`).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if 10 <= f <= 20:
            base = tpl['lunge'].copy()
            if 11 <= f <= 15:
                base = shift_layer(base, dx=1, dy=0)
        else:
            base = tpl['stand'].copy()

        base = apply_cloak_wave(base, phase * 1.5, amplitude=2.0 if 10 <= f <= 18 else 1.5, vertical_flutter=0.7)
        pulse_hood_eyes(base, dy=1 if 10 <= f <= 20 else 0, bright=(9 <= f <= 18))

        if f <= 9:
            u = f / 9.0
            ease = u * u * (3.0 - 2.0 * u)
            shaft_deg = -50.0 * (1.0 - ease) + (-80.0) * ease
            gx = int(round(35 * (1.0 - ease) + 33 * ease))
            gy = int(round(19 * (1.0 - ease) + 12 * ease))
            frame = draw_abyssal_scythe(
                base,
                grip_pos=(gx, gy),
                shaft_deg=shaft_deg,
                shaft_reach=15.0,
                shaft_back=11.5,
                blade_span=17.0,
                blade_curve=6.0,
                blade_dir=1,
                rune_glow=3 if f >= 7 else 2,
                two_handed=True,
                shoulder_pos=(26, 19),
            )
        elif f <= 18:
            u = (f - 10) / 8.0
            ease = 1.0 - math.pow(1.0 - u, 2.0)
            shaft_deg = -80.0 * (1.0 - ease) + 50.0 * ease
            if u <= 0.55:
                w = u / 0.55
                gx = int(round(33 * (1.0 - w) + 39 * w))
                gy = int(round(12 * (1.0 - w) + 19 * w))
            else:
                w = (u - 0.55) / 0.45
                gx = int(round(39 * (1.0 - w) + 35 * w))
                gy = int(round(19 * (1.0 - w) + 23 * w))

            if f <= 17:
                u_tr = (f - 10) / 7.0
                arc_s = -78.0 + u_tr * 92.0
                arc_e = -18.0 + u_tr * 102.0
                slash_arc = (arc_s, arc_e, 20.5, 1.05 - u_tr * 0.25)
            else:
                slash_arc = None

            frame = draw_abyssal_scythe(
                base,
                grip_pos=(gx, gy),
                shaft_deg=shaft_deg,
                shaft_reach=15.0,
                shaft_back=12.0,
                blade_span=17.5,
                blade_curve=6.2,
                blade_dir=1,
                rune_glow=3 if f <= 16 else 2,
                slash_arc=slash_arc,
                two_handed=True,
                shoulder_pos=(27, 19),
            )
        else:
            u = (f - 18) / 11.0
            ease = u * u * (3.0 - 2.0 * u)
            shaft_deg = 50.0 * (1.0 - ease) + (-50.0) * ease
            gx = 35
            gy = int(round(23 * (1.0 - ease) + 19 * ease))
            frame = draw_abyssal_scythe(
                base,
                grip_pos=(gx, gy),
                shaft_deg=shaft_deg,
                shaft_reach=15.0,
                shaft_back=13.0,
                blade_span=17.0,
                blade_curve=6.0,
                blade_dir=1,
                rune_glow=1,
                two_handed=True,
                shoulder_pos=(26, 19),
            )

        frames.append(ensure_safe_cell(frame, margin=1))
    return frames


def build_row3_skill(tpl):
    """
    Row 3: 30-Frame SKILL (Spectral Chain Hook + Executioner Guillotine Slam):
    - Phase 1 (F00..F14): Reaper holds his scythe in a high guard (`-68 deg -> -78 deg`) with his right hand
      while whipping his Left Spectral Chain & 3-Prong Bone-Claw forward (`x = 28 -> 46, y = 22..24`) with
      glowing magenta-cyan chain links to hook and yank the enemy!
    - Phase 2 (F15..F23): Grabs the scythe with both hands for the crushing two-handed Guillotine Slam
      (`-78 deg -> +12 deg` effective angle, active crescent slash trail on `F18..F22`), followed by recovery (`F24..F29`).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        use_lunge = (3 <= f <= 13) or (18 <= f <= 24)
        base = (tpl['lunge'] if use_lunge else tpl['stand']).copy()
        if 4 <= f <= 10 or 18 <= f <= 22:
            base = shift_layer(base, dx=1, dy=0)
        base = apply_cloak_wave(base, phase * 2.0, amplitude=0.9, vertical_flutter=0.45)
        pulse_hood_eyes(base, dy=1 if use_lunge else 0, bright=True)

        if f <= 14:
            # Phase 1: High right-hand scythe guard (-68 deg -> -78 deg) + Left Spectral Chain & 3-Prong Bone-Claw Whip!
            if f <= 2:
                # F00..F02: Coiling left claw at x=28..29, y=22 while lifting scythe to -68 deg
                u = f / 2.0
                claw_x = 28 + int(round(u * 1.0))
                claw_y = 22
                pinch = 0.2
                scythe_deg = -60.0 - u * 8.0
                draw_chain = f >= 2
            elif f <= 7:
                # F03..F07: Whipping Left Spectral Chain & Bone-Claw forward (x = 28 -> 46, y = 22..24)
                whip_xs = [28, 33, 38, 43, 46]
                whip_ys = [22, 22, 23, 23, 24]
                idx = f - 3
                claw_x = whip_xs[idx]
                claw_y = whip_ys[idx]
                pinch = 0.0 if f <= 5 else (0.5 if f == 6 else 0.9)
                scythe_deg = -68.0 - (idx / 4.0) * 5.0
                draw_chain = True
            elif f <= 9:
                # F08..F09: 3-Prong Bone-Claw clamps shut on target at x=46..45, y=24 with soul-snare burst!
                claw_x = 46 if f == 8 else 45
                claw_y = 24
                pinch = 1.0
                scythe_deg = -74.0 - (f - 8) * 1.0
                draw_chain = True
            else:
                # F10..F14: Violently yanking the hooked enemy back (x = 42 -> 29, y = 23..22) as scythe cocks to -78 deg!
                yank_xs = [42, 39, 35, 32, 29]
                yank_ys = [24, 23, 23, 22, 22]
                idx = f - 10
                claw_x = yank_xs[idx]
                claw_y = yank_ys[idx]
                pinch = 0.85
                scythe_deg = -75.0 - (idx / 4.0) * 3.0
                draw_chain = True

            frame = draw_abyssal_scythe(
                base,
                grip_pos=(25, 16),
                shaft_deg=scythe_deg,
                shaft_reach=14.5,
                shaft_back=10.5,
                blade_span=17.0,
                blade_curve=6.0,
                blade_dir=1,
                rune_glow=2 if f <= 7 else 3,
                two_handed=False,
                left_claw_ext=(claw_x, claw_y, pinch, draw_chain),
                shoulder_pos=(26, 19),
            )
        elif f <= 17:
            # F15..F17: Grabs the scythe with BOTH hands high overhead (-78 deg -> -80 deg) for Guillotine Execution!
            u = (f - 15) / 2.0
            shaft_deg = -78.0 * (1.0 - u) + (-80.0) * u
            gx = int(round(33 * (1.0 - u) + 31 * u))
            gy = int(round(15 * (1.0 - u) + 12 * u))
            frame = draw_abyssal_scythe(
                base,
                grip_pos=(gx, gy),
                shaft_deg=shaft_deg,
                shaft_reach=15.0,
                shaft_back=11.5,
                blade_span=17.5,
                blade_curve=6.2,
                blade_dir=1,
                rune_glow=3,
                two_handed=True,
                shoulder_pos=(26, 18),
            )
        elif f <= 23:
            # F18..F23: Crushing two-handed Guillotine Slam (-78 deg -> +12 deg effective angle, active trail F18..F22)!
            u = (f - 18) / 5.0
            ease = 1.0 - math.pow(1.0 - u, 2.1)
            shaft_deg = -80.0 * (1.0 - ease) + 52.0 * ease
            if u <= 0.6:
                w = u / 0.6
                gx = int(round(31 * (1.0 - w) + 38 * w))
                gy = int(round(12 * (1.0 - w) + 19 * w))
            else:
                w = (u - 0.6) / 0.4
                gx = int(round(38 * (1.0 - w) + 35 * w))
                gy = int(round(19 * (1.0 - w) + 24 * w))

            if f <= 22:
                u_tr = (f - 18) / 4.0
                arc_s = -80.0 + u_tr * 82.0
                arc_e = -16.0 + u_tr * 100.0
                slash_arc = (arc_s, arc_e, 21.0, 1.1 - u_tr * 0.2)
            else:
                slash_arc = None

            frame = draw_abyssal_scythe(
                base,
                grip_pos=(gx, gy),
                shaft_deg=shaft_deg,
                shaft_reach=15.5,
                shaft_back=11.5,
                blade_span=18.0,
                blade_curve=6.4,
                blade_dir=1,
                rune_glow=3,
                slash_arc=slash_arc,
                two_handed=True,
                shoulder_pos=(27, 19),
            )
        else:
            # Smooth recovery (F24..F29): (35, 24) -> (33, 21)
            u = (f - 23) / 6.0
            shaft_deg = 52.0 * (1.0 - u) + (-50.0) * u
            gx = int(round(35 * (1.0 - u) + 33 * u))
            gy = int(round(24 * (1.0 - u) + 20 * u))
            frame = draw_abyssal_scythe(
                base,
                grip_pos=(gx, gy),
                shaft_deg=shaft_deg,
                shaft_reach=15.0,
                shaft_back=12.5,
                blade_span=17.0,
                blade_curve=6.0,
                blade_dir=1,
                rune_glow=2 if f <= 25 else 1,
                two_handed=True,
                shoulder_pos=(26, 19),
            )

        frames.append(ensure_safe_cell(frame, margin=1))
    return frames


def build_row4_ultimate(tpl):
    """
    Row 4: 30-Frame ULTIMATE (Grim Harvest: Sovereign of Death):
    - Stage 1 (F00..F10): Raises the Abyssal Great-Scythe skyward to (31, 12) as Abyssal Shadow-Wings unfurl.
    - Stage 2 (F11..F20): Levitates on unfurled Abyssal Shadow-Wings and sweeps the Great-Scythe in a wide
      Soul-Harvest cleave with a 3-band Crimson-Violet & Soul-Magenta Crescent Reap Trail (`draw_scythe_slash_trail`).
    - Stage 3 (F21..F29): Drives the scythe haft into the ground at (35, 21 + crouch_d) to detonate Grim Harvest pillars.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi

        if f <= 10:
            u = f / 10.0
            wing_spread = max(0.0, (f - 3) / 7.0) * 0.90
            base = tpl['stand'].copy()
            base = apply_cloak_wave(base, phase * 2.0, amplitude=0.9, vertical_flutter=0.45)
            draw_abyssal_shadow_wings(base, 18, 18, wing_spread)
            pulse_hood_eyes(base, dy=0, bright=True)

            shaft_deg = -52.0 * (1.0 - u) + (-80.0) * u
            gx = int(round(33 * (1.0 - u) + 31 * u))
            gy = int(round(21 * (1.0 - u) + 12 * u))
            frame = draw_abyssal_scythe(
                base,
                grip_pos=(gx, gy),
                shaft_deg=shaft_deg,
                shaft_reach=15.5,
                shaft_back=12.0,
                blade_span=18.0,
                blade_curve=6.4,
                blade_dir=1,
                rune_glow=3 if f >= 4 else 2,
                two_handed=True,
                shoulder_pos=(26, 18),
            )

        elif f <= 20:
            # Stage 2 (F11..F20): Levitating Shadow-Wing Soul-Harvest Cleave with 3-band Crescent Slash Trail!
            body = make_jump_body(tpl, -1, tuck_amount=0.55, torso_lean_dx=1 if 12 <= f <= 18 else 0)
            body = apply_cloak_wave(body, phase * 3.0, amplitude=0.9, vertical_flutter=0.45)
            draw_abyssal_shadow_wings(body, 18, 17, 1.0)
            pulse_hood_eyes(body, dy=-1, bright=True)

            if f <= 16:
                u_s = (f - 11) / 5.0
                shaft_deg = -80.0 * (1.0 - u_s) + 58.0 * u_s
                gx = int(round(31 + math.sin(u_s * math.pi) * 7.0))
                gy = int(round(13 + u_s * 11.0))
                arc_s = -80.0 + u_s * 90.0
                arc_e = -18.0 + u_s * 102.0
            else:
                u_s = (f - 16) / 4.0
                shaft_deg = 58.0 * (1.0 - u_s) + (-80.0) * u_s
                gx = int(round(34 + (1.0 - u_s) * 2.0))
                gy = int(round(24 * (1.0 - u_s) + 18 * u_s))
                arc_s = -10.0 - u_s * 70.0
                arc_e = 74.0 - u_s * 90.0

            slash_arc = (arc_s, arc_e, 21.0, 1.05)
            frame = draw_abyssal_scythe(
                body,
                grip_pos=(gx, gy),
                shaft_deg=shaft_deg,
                shaft_reach=15.5,
                shaft_back=11.5,
                blade_span=18.0,
                blade_curve=6.4,
                blade_dir=1,
                rune_glow=3,
                slash_arc=slash_arc,
                two_handed=True,
                shoulder_pos=(26, 18),
            )

        else:
            # Stage 3 (F21..F29): Drives Scythe Haft Vertically into the Ground to Detonate Grim Harvest Pillars!
            u = (f - 21) / 8.0
            crouch_d = [2, 4, 4, 3, 2, 1, 1, 0, 0][f - 21]
            wing_spread = max(0.0, 1.0 - u * 1.15)
            body = tpl['stand'].copy() if crouch_d == 0 else make_crouch_body(tpl, crouch_d)
            body = apply_cloak_wave(body, phase * 2.0, amplitude=0.9, vertical_flutter=0.45)
            draw_abyssal_shadow_wings(body, 18, 18 + crouch_d, wing_spread)
            pulse_hood_eyes(body, dy=crouch_d, bright=(f <= 26))

            if f <= 26:
                frame = draw_abyssal_scythe(
                    body,
                    grip_pos=(35, 21 + crouch_d),
                    shaft_deg=-80.0,
                    shaft_reach=14.0,
                    shaft_back=19.0 - crouch_d,
                    blade_span=17.0,
                    blade_curve=6.0,
                    blade_dir=1,
                    rune_glow=3 if f <= 24 else 2,
                    two_handed=True,
                    shoulder_pos=(26, 19 + crouch_d),
                )
                sigil_r = 3 + (f - 21) * 2
                for dx_s in range(-sigil_r, sigil_r + 1):
                    sx_p = 35 + dx_s
                    if 3 <= sx_p <= 48:
                        set_px(frame, sx_p, 49, VIOLET_BRIGHT if dx_s % 2 == 0 else CRIMSON_BRIGHT)
                        set_px(frame, sx_p, 48, SOUL_WHITE if abs(dx_s) <= 2 else VIOLET_MID)
            else:
                u_rec = (f - 26) / 3.0
                shaft_deg = -80.0 * (1.0 - u_rec) + (-52.0) * u_rec
                frame = draw_abyssal_scythe(
                    body,
                    grip_pos=(int(round(35 * (1.0 - u_rec) + 33 * u_rec)), 21),
                    shaft_deg=shaft_deg,
                    shaft_reach=15.0,
                    shaft_back=13.0,
                    blade_span=17.0,
                    blade_curve=6.0,
                    blade_dir=1,
                    rune_glow=1,
                    two_handed=True,
                    shoulder_pos=(26, 19),
                )

        frames.append(ensure_safe_cell(frame, margin=1))
    return frames


def build_row5_death(tpl):
    """
    Row 5: 30-Frame DEATH & HURT Sequence:
    - F00..F06: Hit-stagger recoil (HURT uses F00..F05) with scythe held out in front (gx = 33..34)
    - F07..F17: Drops to one knee as Great-Scythe lowers out in front (gx = 34)
    - F18..F29: Collapses horizontally onto the ground (y=36..46) with his Abyssal Great-Scythe
      lying flat beside him (ZERO floating upright scythe and ZERO y=51 clips!)
    """
    frames = []
    for f in range(30):
        if f <= 6:
            u = f / 6.0
            dx = -int(round(math.sin(u * math.pi * 0.8) * 2.0))
            dy = int(round(u * 1.0))
            base = shift_layer(tpl['stand'], dx=dx, dy=dy)
            base = apply_cloak_wave(base, u * math.pi, amplitude=0.9, vertical_flutter=0.4)
            frame = draw_abyssal_scythe(
                base,
                grip_pos=(33, 21 + dy),
                shaft_deg=-48.0 + u * 36.0,
                shaft_reach=14.5,
                shaft_back=12.0,
                blade_span=16.5,
                blade_curve=5.8,
                blade_dir=1,
                rune_glow=1,
                two_handed=True,
                shoulder_pos=(26 + dx, 19 + dy),
            )
            # Pass #8: Crisp 4-ray Directional Hit-Spark / Armor Impact Glint at chest height (x=26..33, y=18..25) on F01..F05
            draw_hurt_impact_burst(frame, f)
            frames.append(ensure_safe_cell(frame, margin=2))

        elif f <= 17:
            u = (f - 7) / 10.0
            base = (tpl['kneel1'] if f <= 11 else tpl['kneel2']).copy()
            head_bow = 1 if (12 <= f <= 14) else (2 if f >= 15 else 0)
            if head_bow > 0:
                head_slice = base[18:28, 15:29].copy()
                base[18:18 + head_bow, 15:29] = 0
                mask = head_slice[:, :, 3] > 0
                target_view = base[18 + head_bow:28 + head_bow, 15:29]
                target_view[mask] = head_slice[mask]
                base = fill_layer_pinholes(base)
            base = apply_cloak_wave(base, u * math.pi, amplitude=0.8 * (1.0 - u * 0.5), vertical_flutter=0.3)

            frame = draw_abyssal_scythe(
                base,
                grip_pos=(34, 24 + head_bow),
                shaft_deg=-88.0,
                shaft_reach=14.0,
                shaft_back=16.0,
                blade_span=15.5,
                blade_curve=5.0,
                blade_dir=1,
                rune_glow=(f % 3) + 1,
                two_handed=False,
                shoulder_pos=(25, 21 + head_bow),
            )
            frames.append(ensure_safe_cell(frame, margin=1))

        elif f <= 22:
            u = (f - 17) / 5.0
            kn = tpl['kneel2']
            body = np.zeros((52, 52, 4), dtype=np.uint8)
            for sy in range(18, 49):
                rel_h = max(0, 46 - sy)
                ny = min(47, max(20, int(round(46.0 - rel_h * (1.0 - u * 0.52)))))
                dx_slump = int(round((rel_h / 28.0) * u * 5.0))
                for sx in range(2, 48):
                    if kn[sy, sx, 3] > 0:
                        nx = max(2, min(48, sx + dx_slump))
                        body[ny, nx] = kn[sy, sx]
                        if ny + 1 <= 46 and body[ny + 1, nx, 3] == 0:
                            body[ny + 1, nx] = kn[sy, sx]
            body = strip_isolated_pixels(fill_layer_pinholes(add_outline_to_layer(body), require_3_neighbors=False))

            frame = draw_abyssal_scythe(
                body,
                grip_pos=(34, int(round(26 + u * 6))),
                shaft_deg=-35.0 * (1.0 - u) + 50.0 * u,
                shaft_reach=13.0,
                shaft_back=12.0,
                blade_span=15.0,
                blade_curve=5.0,
                blade_dir=1,
                rune_glow=0,
                two_handed=False,
                shoulder_pos=(26 + int(round(u * 2.0)), int(round(23 + u * 7))),
            )
            frames.append(ensure_safe_cell(frame, margin=1))

        else:
            k = f - 23
            body = tpl['fall'].copy()
            if k == 0:
                body = shift_layer(body, dx=0, dy=-1)

            scythe_floor = np.zeros((52, 52, 4), dtype=np.uint8)
            draw_line_px(scythe_floor, 10, 46, 44, 46, OBSIDIAN_MID)
            draw_line_px(scythe_floor, 10, 47, 44, 47, OBSIDIAN_DEEP)
            draw_line_px(scythe_floor, 42, 46, 35, 48, VIOLET_MID if k <= 2 else OBSIDIAN_LIGHT)
            draw_line_px(scythe_floor, 43, 47, 33, 49, STEEL_LIGHT if k <= 1 else BONE_DARK)
            set_px(scythe_floor, 42 - k, 46, CRIMSON_BRIGHT if k <= 3 else CRIMSON_MID)
            set_px(scythe_floor, 41 - k, 46, VIOLET_BRIGHT if k <= 3 else VIOLET_MID)

            frame = composite_over(body, scythe_floor)
            frames.append(ensure_safe_cell(frame, margin=1))

    return frames


def draw_wraith_dash_ribbons(c, f, intensity=1.0):
    """
    Renders organic tapered abyssal purple-crimson cloak wisps & shadow motes
    trailing naturally from Malakor's cloak edge during Row 6 (DASH).
    """
    orig = c.copy()
    for y in range(18, 42):
        row_xs = np.where(orig[y, :, 3] > 0)[0]
        if len(row_xs) == 0:
            continue
        body_edge_x = int(row_xs[0])
        u_y = (y - 18) / 24.0
        wave = math.sin(u_y * math.pi * 3.5 - f * 0.65)
        if wave < -0.15:
            continue
        wisp_len = max(1, int(round((2.5 + wave * 3.5) * float(intensity))))
        x_start = max(6, body_edge_x - wisp_len)
        for x in range(x_start, body_edge_x):
            if orig[y, x, 3] > 0:
                continue
            u_x = (x - x_start) / max(1.0, float(body_edge_x - x_start))
            if u_x > 0.68:
                col = C_BLADE_VIOLET if ((x + y) % 2 == 0) else C_CRIMSON_DARK
            elif u_x > 0.35:
                col = VIOLET_DEEP if ((y + f) % 2 == 0) else C_CLOAK_DARK
            else:
                if (x + y + f) % 2 == 0:
                    continue
                col = OBSIDIAN_DEEP
            c[y, x] = col
    return c





def build_row6_dash(tpl):
    """
    Row 6: 30-Frame DASH (Wraith Phase-Rush):
    - F00..F02: Quick coil into phase-rush lunge (`-46 deg -> -26 deg`).
    - F03..F22: Uses `tpl['lunge']` (shifted `dx = +1`) with trailing abyssal purple-crimson
      shadow-mist ribbons & wraith afterimage streaks (`x = 4..14, y = 14..42`) behind his cloak,
      while couching his two-handed scythe forward (`-24 deg` to `-14 deg` with a glowing magenta reap edge)!
    - F23..F29: Decelerating recovery back to ready guard (`-50 deg`).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 2:
            u = f / 2.0
            crouch_d = [1, 2, 1][f]
            body = make_crouch_body(tpl, crouch_d) if f <= 1 else shift_layer(tpl['lunge'], dx=1, dy=0)
            body = apply_cloak_wave(body, phase * 2.0, amplitude=0.9, is_dash=False)
            pulse_hood_eyes(body, dy=crouch_d, bright=True)
            shaft_deg = -46.0 * (1.0 - u) + (-26.0) * u
            frame = draw_abyssal_scythe(
                body,
                grip_pos=(35, 20 + crouch_d),
                shaft_deg=shaft_deg,
                shaft_reach=14.5,
                shaft_back=12.0,
                blade_span=17.0,
                blade_curve=6.0,
                blade_dir=1,
                rune_glow=2 if f < 2 else 3,
                two_handed=True,
                shoulder_pos=(27, 19 + crouch_d),
            )
        elif f <= 22:
            # F03..F22: Active Wraith Phase-Rush using tpl['lunge'] shifted dx=+1 + trailing shadow-mist ribbons!
            k = f - 3
            u_rush = k / 19.0
            body = shift_layer(tpl['lunge'], dx=1, dy=0)
            body = apply_cloak_wave(body, k * 0.75, amplitude=0.9, vertical_flutter=0.45, is_dash=False)
            draw_wraith_dash_ribbons(body, f, intensity=1.0)
            pulse_hood_eyes(body, dy=1, bright=True)

            # Couches his two-handed scythe forward (-24 deg to -14 deg) with a blazing magenta reap edge!
            shaft_deg = -19.0 + math.sin(u_rush * math.pi * 2.0) * 5.0 + (0.6 if (f % 2 == 0) else -0.6)
            gx = 36 + (1 if (6 <= f <= 18 and f % 3 != 0) else 0)
            gy = 21 + (1 if (f % 4 in (1, 2)) else 0)
            frame = draw_abyssal_scythe(
                body,
                grip_pos=(gx, gy),
                shaft_deg=shaft_deg,
                shaft_reach=15.0,
                shaft_back=12.5,
                blade_span=17.5,
                blade_curve=6.0,
                blade_dir=1,
                rune_glow=3,
                two_handed=True,
                shoulder_pos=(27, 20),
            )
        else:
            u = (f - 22) / 7.0
            crouch_d = [1, 1, 1, 0, 0, 0, 0][f - 23]
            body = shift_layer(tpl['lunge'], dx=1, dy=0) if f <= 24 else tpl['stand'].copy()
            body = apply_cloak_wave(body, phase, amplitude=0.9, vertical_flutter=0.45)
            if f <= 24:
                draw_wraith_dash_ribbons(body, f, intensity=0.5)
            pulse_hood_eyes(body, dy=crouch_d, bright=(f <= 25))
            shaft_deg = -18.0 * (1.0 - u) + (-50.0) * u
            frame = draw_abyssal_scythe(
                body,
                grip_pos=(int(round(36 * (1.0 - u) + 35 * u)), 20 + crouch_d),
                shaft_deg=shaft_deg,
                shaft_reach=14.5,
                shaft_back=12.5,
                blade_span=17.0,
                blade_curve=6.0,
                blade_dir=1,
                rune_glow=2 if f <= 25 else 1,
                two_handed=True,
                shoulder_pos=(26, 19 + crouch_d),
            )

        frames.append(ensure_safe_cell(strip_isolated_pixels(frame), margin=1))
    return frames


def build_row7_crouch(tpl):
    """
    Row 7: 30-Frame CROUCH Sequence (Wraith-Shroud Low Two-Handed Polearm Brace & Low Reaping Hook-Slash):
    - F00..F06: Drops into a low Wraith-Shroud crouch (up to 7px lower silhouette).
    - F07..F10: Coils the two-handed scythe in low crouch.
    - F11..F17: Sweeps a low two-handed Reaping Hook-Slash with a 3-band Crimson-Violet & Soul-Magenta
      Crescent Reap Trail (`draw_scythe_slash_trail`), plus F18 follow-through hold.
    - F19..F29: Rises smoothly back to upright two-handed polearm stance.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 6:
            depths = [0, 1, 3, 4, 5, 6, 7]
            d = depths[f]
            body = tpl['stand'].copy() if d == 0 else make_crouch_body(tpl, d)
            body = apply_cloak_wave(body, phase, amplitude=0.9, vertical_flutter=0.4)
            pulse_hood_eyes(body, dy=d, bright=(f >= 4))
            u = f / 6.0
            shaft_deg = -50.0 * (1.0 - u) + (-14.0) * u
            gx = 35
            gy = int(round(19 + d * 0.55))
            frame = draw_abyssal_scythe(
                body,
                grip_pos=(gx, gy),
                shaft_deg=shaft_deg,
                shaft_reach=14.5,
                shaft_back=12.0,
                blade_span=16.5,
                blade_curve=5.5,
                blade_dir=1,
                rune_glow=2 if f >= 4 else 1,
                two_handed=True,
                shoulder_pos=(26, 19 + d),
            )
        elif f <= 18:
            d = 7
            body = make_crouch_body(tpl, d)
            if 11 <= f <= 15:
                body = shift_layer(body, dx=1, dy=0)
            body = apply_cloak_wave(body, phase * 1.6, amplitude=0.9, vertical_flutter=0.45)
            pulse_hood_eyes(body, dy=d, bright=True)

            if f <= 10:
                u = (f - 7) / 3.0
                shaft_deg = -14.0 * (1.0 - u) + (-66.0) * u
                gx = int(round(35 * (1.0 - u) + 33 * u))
                gy = int(round(23 * (1.0 - u) + 17 * u))
                slash_arc = None
            elif f <= 17:
                u = (f - 11) / 6.0
                shaft_deg = -60.0 * (1.0 - u) + 32.0 * u
                gx = int(round(33 * (1.0 - u) + 38 * u))
                gy = int(round(17 * (1.0 - u) + 23 * u))
                arc_s = -62.0 + u * 78.0
                arc_e = -10.0 + u * 88.0
                slash_arc = (arc_s, arc_e, 19.5, 1.0 - u * 0.22)
            else:
                shaft_deg = 22.0
                gx = 35
                gy = 23
                slash_arc = None

            frame = draw_abyssal_scythe(
                body,
                grip_pos=(gx, gy),
                shaft_deg=shaft_deg,
                shaft_reach=14.5,
                shaft_back=12.0,
                blade_span=16.5,
                blade_curve=5.6,
                blade_dir=1,
                rune_glow=3 if 10 <= f <= 17 else 2,
                slash_arc=slash_arc,
                two_handed=True,
                shoulder_pos=(26, 24),
            )
        else:
            depths = [7, 6, 6, 5, 4, 3, 2, 1, 1, 0, 0]
            k = f - 19
            d = depths[k]
            body = tpl['stand'].copy() if d == 0 else make_crouch_body(tpl, d)
            body = apply_cloak_wave(body, phase, amplitude=0.9, vertical_flutter=0.4)
            pulse_hood_eyes(body, dy=d, bright=(d >= 4))
            u = k / 10.0
            shaft_deg = 14.0 * (1.0 - u) + (-50.0) * u
            gx = 35
            gy = int(round((19 + int(d * 0.5)) * (1.0 - u) + 19 * u))
            frame = draw_abyssal_scythe(
                body,
                grip_pos=(gx, gy),
                shaft_deg=shaft_deg,
                shaft_reach=14.5,
                shaft_back=12.5,
                blade_span=17.0,
                blade_curve=6.0,
                blade_dir=1,
                rune_glow=1,
                two_handed=True,
                shoulder_pos=(26, 19 + d),
            )

        frames.append(ensure_safe_cell(frame, margin=1))
    return frames


def build_row8_jump(tpl):
    """
    Row 8: 30-Frame JUMP Sequence (Shadow-Wing Aerial Vault & Mid-Air Two-Handed Downward Scythe Reap):
    - F03..F19: Dark tattered Abyssal Raven/Bat Shadow-Wings (`draw_abyssal_shadow_wings`, `x = 4..17, y = 8..32`)
      unfurl from Malakor's shoulders during his aerial vault & downward reap!
    - F12..F17: Apex mid-air two-handed downward Crescent Scythe cleave with a 3-band Crimson-Violet &
      Soul-Magenta Crescent Reap Trail (`draw_scythe_slash_trail`), plus F18 follow-through.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 4:
            crouch_seq = [1, 3, 5, 3, 0]
            d = crouch_seq[f]
            body = make_crouch_body(tpl, d) if d >= 2 else make_jump_body(tpl, d, tuck_amount=0.35)
            body = apply_cloak_wave(body, phase * 2.0, amplitude=0.9, vertical_flutter=0.45)
            if f >= 3:
                span_phase = 0.55 if f == 3 else 0.80
                draw_abyssal_shadow_wings(body, 18, 18 + d, span_phase)
            pulse_hood_eyes(body, dy=d, bright=True)
            shaft_deg = [-50.0, -36.0, -24.0, -50.0, -64.0][f]
            gx = [35, 35, 35, 34, 33][f]
            gy = [20, 21, 22, 19, 16][f]
            frame = draw_abyssal_scythe(
                body,
                grip_pos=(gx, gy),
                shaft_deg=shaft_deg,
                shaft_reach=14.5,
                shaft_back=12.0,
                blade_span=16.5,
                blade_curve=5.8,
                blade_dir=1,
                rune_glow=2,
                two_handed=True,
                shoulder_pos=(26, 19 + d),
            )
        elif f <= 11:
            # F05..F11: Ascending Shadow-Wing aerial vault raising Great-Scythe to (33, 12)
            u = (f - 5) / 6.0
            tuck = 0.55 + 0.45 * math.sin(u * math.pi * 0.7)
            body = make_jump_body(tpl, -1, tuck_amount=tuck, torso_lean_dx=1)
            body = apply_cloak_wave(body, phase * 2.0, amplitude=0.9, vertical_flutter=0.45)
            span_phase = 0.88 + 0.12 * math.sin(u * math.pi)
            draw_abyssal_shadow_wings(body, 18, 17, span_phase)
            pulse_hood_eyes(body, dy=-1, bright=True)
            shaft_deg = -64.0 * (1.0 - u) + (-80.0) * u
            gx = 33
            gy = int(round(16 * (1.0 - u) + 12 * u))
            frame = draw_abyssal_scythe(
                body,
                grip_pos=(gx, gy),
                shaft_deg=shaft_deg,
                shaft_reach=15.0,
                shaft_back=11.5,
                blade_span=17.0,
                blade_curve=6.0,
                blade_dir=1,
                rune_glow=3 if f >= 9 else 2,
                two_handed=True,
                shoulder_pos=(26, 18),
            )
        elif f <= 18:
            # F12..F18: Apex mid-air two-handed downward Crescent Scythe cleave (trail active on F12..F17)!
            u = (f - 12) / 6.0
            ease = 1.0 - math.pow(1.0 - u, 2.0)
            body = make_jump_body(tpl, -1, tuck_amount=0.95 - u * 0.15, torso_lean_dx=1 if f <= 16 else 0)
            body = apply_cloak_wave(body, phase * 2.5, amplitude=0.9, vertical_flutter=0.45)
            draw_abyssal_shadow_wings(body, 18, 17, 1.0 - u * 0.08)
            pulse_hood_eyes(body, dy=-1, bright=True)

            shaft_deg = -80.0 * (1.0 - ease) + 48.0 * ease
            if u <= 0.6:
                w = u / 0.6
                gx = int(round(33 * (1.0 - w) + 39 * w))
                gy = int(round(12 * (1.0 - w) + 19 * w))
            else:
                w = (u - 0.6) / 0.4
                gx = int(round(39 * (1.0 - w) + 35 * w))
                gy = int(round(19 * (1.0 - w) + 23 * w))

            if f <= 17:
                u_tr = (f - 12) / 5.0
                arc_s = -80.0 + u_tr * 86.0
                arc_e = -18.0 + u_tr * 100.0
                slash_arc = (arc_s, arc_e, 20.5, 1.05 - u_tr * 0.2)
            else:
                slash_arc = None

            frame = draw_abyssal_scythe(
                body,
                grip_pos=(gx, gy),
                shaft_deg=shaft_deg,
                shaft_reach=15.0,
                shaft_back=12.0,
                blade_span=17.5,
                blade_curve=6.2,
                blade_dir=1,
                rune_glow=3,
                slash_arc=slash_arc,
                two_handed=True,
                shoulder_pos=(27, 18),
            )
        elif f <= 24:
            # F19..F24: Descending wraith-glide with shadow-wings folding after F19
            u = (f - 19) / 5.0
            tuck = 0.75 * (1.0 - u * 0.65)
            body = make_jump_body(tpl, 0, tuck_amount=tuck)
            body = apply_cloak_wave(body, phase * 2.0, amplitude=0.9, vertical_flutter=0.45)
            if f == 19:
                draw_abyssal_shadow_wings(body, 18, 18, 0.72)
            elif f == 20:
                draw_abyssal_shadow_wings(body, 18, 18, 0.42)
            pulse_hood_eyes(body, dy=0, bright=True)
            shaft_deg = 48.0 * (1.0 - u) + (-32.0) * u
            gx = 35
            gy = int(round(23 * (1.0 - u) + 19 * u))
            frame = draw_abyssal_scythe(
                body,
                grip_pos=(gx, gy),
                shaft_deg=shaft_deg,
                shaft_reach=14.5,
                shaft_back=12.5,
                blade_span=17.0,
                blade_curve=6.0,
                blade_dir=1,
                rune_glow=2,
                two_handed=True,
                shoulder_pos=(26, 18),
            )
        else:
            # F25..F29: Grounded shock-absorbing landing
            k = f - 25
            crouch_depths = [3, 4, 2, 1, 0]
            d = crouch_depths[k]
            body = tpl['stand'].copy() if d == 0 else make_crouch_body(tpl, d)
            body = apply_cloak_wave(body, phase, amplitude=0.9, vertical_flutter=0.45)
            pulse_hood_eyes(body, dy=d, bright=(k <= 2))
            u = k / 4.0
            shaft_deg = -32.0 * (1.0 - u) + (-50.0) * u
            frame = draw_abyssal_scythe(
                body,
                grip_pos=(35, 19 + int(d * 0.5)),
                shaft_deg=shaft_deg,
                shaft_reach=15.0,
                shaft_back=13.0,
                blade_span=17.0,
                blade_curve=6.0,
                blade_dir=1,
                rune_glow=1,
                two_handed=True,
                shoulder_pos=(26, 19 + d),
            )

        frames.append(ensure_safe_cell(frame, margin=1))
    return frames



def apply_pass12_vanguard_upgrades(cell_208, r_idx, f):
    """
    Pass #12 Melee & Vanguard 30fps Character Sheet Refiner (Reaper - abyssal-magenta/white):
    1. Row 2 (AUTO_ATTACK, F14..F19) Strike Apex Impact Glint at (x = 152 + (f - 14) * 3, y = 92 + ((f * 7) % 18)).
    2. Row 7 / Row 3 (SKILL / CROUCH, F08..F20) Grounded Cast-Surge Sigil Glow at y = 186..189, x = 76..134 + 3 rising motes.
    3. Row 8 / Row 4 (ULTIMATE / JUMP, F03..F26) Overdrive Ascension Lightning / Aura Pillars at x = 68, 88, 122, 140.
    All pixels strictly clamped inside [4..203] in x and y.
    """
    out = cell_208.copy()
    c_white = SOUL_WHITE
    c_prim = VIOLET_PINK
    c_sec = VIOLET_BRIGHT

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
            p208(gx + dx, gy + dy, c_prim)
        e1x = gx - 6 - (f - 14)
        e1y = gy - 4 + ((f - 14) % 3) * 2
        e2x = gx - 11 - ((f - 14) % 3) * 2
        e2y = gy + 4 - ((f - 14) % 2) * 2
        for ex, ey, c_hi, c_lo in ((e1x, e1y, c_white, c_prim), (e2x, e2y, c_sec, c_prim)):
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
            col_bot = c_sec if abs(x - 105) <= 18 else CRIMSON_BRIGHT
            p208(x, ay, col_top)
            p208(x, ay + 1, col_bot)
        mote_xs = [86 + ((f - 8) % 3), 105 + (((f - 8) + 1) % 3) - 1, 124 - ((f - 8) % 3)]
        for m_i, mx in enumerate(mote_xs):
            my = (182 - ((f - 8) * 3) % 24) if m_i == 0 else (182 - (((f - 8) * 3 + m_i * 7) % 24))
            p208(mx, my, c_white)
            p208(mx + 1, my, c_prim)
            p208(mx, my + 1, c_prim)
            p208(mx + 1, my + 1, c_sec)
            p208(mx, my + 2, CRIMSON_BRIGHT if (m_i + f) % 2 == 0 else c_sec)

    # 3. Row 8 / Row 4 (ULTIMATE, F03..F26) Overdrive Ascension Lightning / Aura Pillars
    if r_idx in (4, 8) and 3 <= f <= 26:
        for idx, mx in enumerate((68, 88, 122, 140)):
            my = 168 - (((f - 3) * 5 + idx * 19) % 116)
            p208(mx, my - 2, c_prim)
            p208(mx, my - 1, c_white)
            p208(mx, my, c_white)
            p208(mx - 1, my, c_prim)
            p208(mx + 1, my, c_prim)
            zig = 1 if (f + idx) % 2 == 0 else -1
            p208(mx + zig, my + 1, c_sec)
            p208(mx, my + 2, c_sec)
            p208(mx, my + 3, CRIMSON_BRIGHT if idx % 2 == 0 else c_prim)

    out[:4, :, :] = 0
    out[204:, :, :] = 0
    out[:, :4, :] = 0
    out[:, 204:, :] = 0
    return out


def main():
    src = load_source_cells()
    tpl = make_clean_templates(src)

    rows = [
        ('ROW 0: IDLE (30 FRAMES)', build_row0_idle(tpl)),
        ('ROW 1: WALK (30 FRAMES)', build_row1_walk(tpl)),
        ('ROW 2: AUTO_ATTACK - ABYSSAL SCYTHE REAP (30 FRAMES)', build_row2_auto_attack(tpl)),
        ('ROW 3: SKILL - SPECTRAL CHAIN & GUILLOTINE SLAM (30 FRAMES)', build_row3_skill(tpl)),
        ('ROW 4: ULTIMATE - GRIM HARVEST: SOVEREIGN OF DEATH (30 FRAMES)', build_row4_ultimate(tpl)),
        ('ROW 5: DEATH & HURT (30 FRAMES)', build_row5_death(tpl)),
        ('ROW 6: DASH - WRAITH PHASE-RUSH (30 FRAMES)', build_row6_dash(tpl)),
        ('ROW 7: CROUCH - WRAITH-SHROUD & LOW SCYTHE THROW (30 FRAMES)', build_row7_crouch(tpl)),
        ('ROW 8: JUMP - SHADOW-WING VAULT & AERIAL REAP (30 FRAMES)', build_row8_jump(tpl)),
    ]

    num_rows = len(rows)
    cell_px = 208
    canvas = Image.new('RGBA', (30 * cell_px, num_rows * cell_px), (0, 0, 0, 0))

    top_clips = bot_clips = left_clips = right_clips = 0
    for r, (r_name, r_frames) in enumerate(rows):
        assert len(r_frames) == 30, f'{r_name} has {len(r_frames)} frames instead of 30'
        cells_208 = []
        for f in range(30):
            r_frames[f] = ensure_safe_cell(r_frames[f], margin=1)
            cell_im = Image.fromarray(r_frames[f], mode='RGBA').resize((cell_px, cell_px), Image.NEAREST)
            cell_208 = apply_pass12_vanguard_upgrades(np.array(cell_im, dtype=np.uint8), r, f)
            cells_208.append(cell_208)
            top_clips += int(np.any(cell_208[:2, :, 3] > 0))
            bot_clips += int(np.any(cell_208[206:, :, 3] > 0))
            left_clips += int(np.any(cell_208[:, :2, 3] > 0))
            right_clips += int(np.any(cell_208[:, 206:, 3] > 0))
            canvas.paste(Image.fromarray(cell_208, mode='RGBA'), (f * cell_px, r * cell_px))
        adj_diffs = sum(1 for i in range(29) if np.any(cells_208[i] != cells_208[i + 1]))
        print(f'{r_name:62s}: 30 frames generated, {adj_diffs}/29 adjacent transitions distinct')

    print(f'Boundary clips: TOP={top_clips}, BOT={bot_clips}, LEFT={left_clips}, RIGHT={right_clips}')
    canvas.save('assets/sprites/reaper_sheet.png')
    print('Saved assets/sprites/reaper_sheet.png:', canvas.size)

    # Render contact sheets: left (F00..F14) and right (F15..F29) halves in artifact directory
    preview_cell = 96
    pad_top = 24
    dbg = Image.new('RGBA', (30 * preview_cell, num_rows * (preview_cell + pad_top)), (15, 12, 26, 255))
    draw = ImageDraw.Draw(dbg)
    for r_idx, (r_name, r_frames) in enumerate(rows):
        y0 = r_idx * (preview_cell + pad_top)
        draw.rectangle([0, y0, 30 * preview_cell, y0 + pad_top - 2], fill=(28, 18, 46, 255))
        draw.text((8, y0 + 5), r_name, fill=(216, 180, 254, 255))
        for c_idx, arr in enumerate(r_frames):
            x0 = c_idx * preview_cell
            draw.text((x0 + 4, y0 + 13), f'F{c_idx:02d}', fill=(244, 63, 94, 255))
            p_im = Image.fromarray(arr, mode='RGBA').resize((preview_cell, preview_cell), Image.NEAREST)
            dbg.paste(p_im, (x0, y0 + pad_top), p_im)
            draw.rectangle([x0, y0 + pad_top, x0 + preview_cell - 1, y0 + pad_top + preview_cell - 1], outline=(48, 32, 72, 255))

    for art_dir in (
        '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/4f1fb80f-a88f-4496-9746-b4b9fe84f6d4',
        '/home/antigravity/.gemini/jetski/brain/cff4cf959f57f3ed83254419d3daacf5',
    ):
        left_path = f'{art_dir}/debug_reaper_30fps_left_F00_F14.png'
        right_path = f'{art_dir}/debug_reaper_30fps_right_F15_F29.png'
        dbg.crop((0, 0, 15 * preview_cell, dbg.height)).save(left_path)
        dbg.crop((15 * preview_cell, 0, 30 * preview_cell, dbg.height)).save(right_path)
        print('Saved debug sheets:', left_path, right_path)


if __name__ == '__main__':
    main()


