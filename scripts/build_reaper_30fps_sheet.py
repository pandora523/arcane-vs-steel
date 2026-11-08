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

# Named aliases for IK arm, robe seam, and necropolis armor shading
ROBE_DEEP = OBSIDIAN_DEEP
ROBE_DARK = OBSIDIAN_DARK
ROBE_MID = OBSIDIAN_MID
ROBE_LIGHT = OBSIDIAN_LIGHT
VOID_PURPLE = VIOLET_MID
SOUL_CYAN = VIOLET_BRIGHT


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


def ensure_safe_cell(cell, margin=1):
    """
    Guarantees zero pixels touch the 52x52 cell border (x=0, x=51, y=0, y=51) and fills
    any 1px interior pinholes from movement.
    """
    m = max(1, int(margin))
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

    # 2. Clean forward slash/lunge body (from `atk_slash` with all right-side crescent blade pixels stripped,
    #    baked chest arm neutralized, and clean lower legs/boots grafted from `stand`)
    lunge = src['atk_slash'].copy()
    for y in range(0, 52):
        for x in range(31, 52):
            lunge[y, x] = 0
    lunge = neutralize_reaper_chest_arm(lunge)
    lunge[36:50, 8:42] = stand[36:50, 8:42]
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


def draw_shadow_wings(base_frame, phase_rad, spread=1.0, shoulder_y=18):
    """
    Renders tattered Abyssal Shadow-Wings unfurling behind Malakor during ULTIMATE (Row 4) and JUMP (Row 8).
    """
    if spread <= 0.05:
        return base_frame
    wing_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    # Left/Back sweeping shadow-wing and upper dorsal pinion
    span = int(round(12 * spread))
    for i in range(span + 1):
        u = i / max(1, span)
        # Upper arch of the shadow wing
        wx = int(round(20 - i * 1.15))
        wy = int(round(shoulder_y - math.sin(u * math.pi * 0.85) * (7.5 * spread) + math.sin(phase_rad + u * 3.0) * 0.8))
        set_px(wing_layer, wx, wy, VIOLET_BRIGHT if i % 3 == 0 else CRIMSON_MID)
        set_px(wing_layer, wx, wy + 1, OBSIDIAN_MID)

        # Tattered vertical shadow-feathers hanging from the wing arch
        feather_len = int(round((3 + (i % 3) * 2.5) * spread * (1.0 - u * 0.25)))
        for fy in range(2, feather_len + 2):
            col = OBSIDIAN_DARK if fy < feather_len else (VIOLET_MID if i % 2 == 0 else CRIMSON_DARK)
            set_px(wing_layer, wx, wy + fy, col)

    # Composite wings BEHIND base_frame
    return composite_over(wing_layer, base_frame)


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
    Draws Malakor's sculpted 2-segment Necropolis IK weapon arm onto `layer`:
    - Lead arm (`is_rear=False`): rotating spiked bone/necropolis shoulder pauldron at (sx, sy)
      (BONE_LIGHT, BONE_MID, VOID_PURPLE), 3px-thick dark armored upper arm (ROBE_MID, BONE_DARK)
      from (sx, sy) to (ex, ey), bone/soul-cyan elbow couter at (ex, ey), 3px-thick bone-plated
      forearm vambrace (BONE_MID, ROBE_LIGHT) from (ex, ey) to (hx, hy), and 2x2 skeletal gauntlet
      fist (BONE_LIGHT, BONE_MID) at (hx, hy).
    - Rear arm (`is_rear=True`): slightly darker 2-3px upper arm & forearm from rear shoulder
      (sx, sy) to upper haft grip (hx, hy).
    """
    ex, ey = solve_ik_elbow(sx, sy, hx, hy, L1, L2, bend_side=bend_side)

    u1x, u1y = ex - sx, ey - sy
    d1 = max(1.0, math.hypot(u1x, u1y))
    n1x, n1y = -u1y / d1, u1x / d1

    u2x, u2y = hx - ex, hy - ey
    d2 = max(1.0, math.hypot(u2x, u2y))
    n2x, n2y = -u2y / d2, u2x / d2

    if is_rear:
        # 3px-thick bone-plated & violet-trimmed upper-shaft arm (clearly visible against dark backgrounds!)
        draw_line_px(layer, sx + n1x * 0.85, sy + n1y * 0.85, ex + n1x * 0.7, ey + n1y * 0.7, BONE_MID)
        draw_line_px(layer, sx - n1x * 0.85, sy - n1y * 0.85, ex - n1x * 0.7, ey - n1y * 0.7, ROBE_MID)
        draw_line_px(layer, sx, sy, ex, ey, ROBE_LIGHT)

        draw_line_px(layer, ex + n2x * 0.8, ey + n2y * 0.8, hx + n2x * 0.65, hy + n2y * 0.65, BONE_LIGHT)
        draw_line_px(layer, ex - n2x * 0.8, ey - n2y * 0.8, hx - n2x * 0.65, hy - n2y * 0.65, ROBE_MID)
        draw_line_px(layer, ex, ey, hx, hy, BONE_MID)

        # Glowing elbow couter & 2x2 skeletal bone gauntlet fist at (hx, hy)
        set_px(layer, ex, ey, VIOLET_BRIGHT)
        set_px(layer, ex + n1x * 0.6, ey + n1y * 0.6, BONE_LIGHT)
        ix_h, iy_h = int(round(hx)), int(round(hy))
        set_px(layer, ix_h, iy_h, SOUL_WHITE)
        set_px(layer, ix_h + 1, iy_h, BONE_LIGHT)
        set_px(layer, ix_h, iy_h + 1, BONE_LIGHT)
        set_px(layer, ix_h + 1, iy_h + 1, BONE_MID)
        return

    # 1. 3px-thick dark armored upper arm (ROBE_MID, BONE_DARK) from (sx, sy) to (ex, ey)
    draw_line_px(layer, sx + n1x * 0.9, sy + n1y * 0.9, ex + n1x * 0.75, ey + n1y * 0.75, BONE_DARK)
    draw_line_px(layer, sx - n1x * 0.9, sy - n1y * 0.9, ex - n1x * 0.75, ey - n1y * 0.75, ROBE_DARK)
    draw_line_px(layer, sx, sy, ex, ey, ROBE_MID)

    # 2. 3px-thick bone-plated forearm vambrace (BONE_MID, ROBE_LIGHT) from (ex, ey) to (hx, hy)
    draw_line_px(layer, ex + n2x * 0.85, ey + n2y * 0.85, hx + n2x * 0.65, hy + n2y * 0.65, BONE_MID)
    draw_line_px(layer, ex - n2x * 0.85, ey - n2y * 0.85, hx - n2x * 0.65, hy - n2y * 0.65, ROBE_DARK)
    draw_line_px(layer, ex, ey, hx, hy, ROBE_LIGHT)

    # 3. Clean shoulder transition at (sx, sy) under Malakor's existing Near Shoulder Pauldron
    set_px(layer, sx, sy, ROBE_LIGHT)
    set_px(layer, sx + n1x * 0.7, sy + n1y * 0.7, BONE_DARK)

    # 4. Bone/soul-cyan elbow couter at (ex, ey)
    set_px(layer, ex, ey, SOUL_CYAN)
    set_px(layer, ex + n1x * 0.7, ey + n1y * 0.7, BONE_LIGHT)

    # 5. 2x2 skeletal gauntlet fist (SOUL_WHITE, BONE_LIGHT, BONE_MID) at (hx, hy)
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
    Renders Malakor's articulated Abyssal Great-Scythe with an unmistakable WIDE Two-Handed Polearm Grip:
    - Upper / Forward Hand (`(ux_grip, uy_grip)`): Grips `4.5..5.2px` UP the obsidian shaft toward the scythe head,
      driven by the upper 2-Bone IK arm (`upper_arm_layer`, `bend_side=-1.0`, arcing above from `(sx_arm + 2.0, sy_arm - 1.2)`).
    - Lower / Rear Hand (`(lx_grip, ly_grip)`): Grips `2.0..2.5px` DOWN the obsidian shaft toward the butt-spike,
      driven by the lower 2-Bone IK arm (`lower_arm_layer`, `bend_side=+1.0`, arcing below from `(sx_arm - 0.5, sy_arm + 1.0)`).
    - Because the upper arm bends UP (`bend_side=-1.0`) to the upper shaft and the lower arm bends DOWN (`bend_side=+1.0`)
      to the lower shaft (`6.5..7.5px` apart along the pole), BOTH arms and BOTH bright skeletal bone gauntlets are 100%
      visible and separated at every angle!
    """
    scythe_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    upper_arm_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    lower_arm_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    gauntlet_top_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    fx_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    def set_clamped_px(buf, x, y, col):
        ix = max(3, min(48, int(round(x))))
        iy = max(3, min(48, int(round(y))))
        buf[iy, ix] = col

    # Keep shaft angle in [-82.0, 68.0] and blade_dir = 1 so the scythe pole and crescent blade
    # stay cleanly in front of Malakor's body (hx >= 30) and never cut backward across his hood!
    eff_deg = max(-82.0, min(68.0, float(shaft_deg)))
    eff_bdir = 1
    rad = math.radians(eff_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    px, py = -uy * eff_bdir, ux * eff_bdir

    # Center reference grip within [31..40, 11..40] strictly out in front of Malakor's torso
    hx = float(max(31.0, min(40.0, grip_pos[0])))
    hy = float(max(11.0, min(40.0, grip_pos[1])))

    # True shoulder attachment at sx_arm = 25.5 + dx_off, sy_arm = 17.0 + dy_off
    dx_off = float(shoulder_pos[0]) - 26.0
    dy_off = float(shoulder_pos[1]) - 19.0
    sx_arm = float(max(10.0, min(40.0, 25.5 + dx_off)))
    sy_arm = float(max(10.0, min(40.0, 17.0 + dy_off)))

    # Dynamically clamp shaft_up (shaft_reach) so head + top spike stay inside [3..48, 3..48]
    shaft_up = float(shaft_reach)
    if ux > 0.04:
        shaft_up = min(shaft_up, (45.0 - hx) / ux)
    elif ux < -0.04:
        shaft_up = min(shaft_up, (30.0 - hx) / ux)
    if uy > 0.04:
        shaft_up = min(shaft_up, (45.0 - hy) / uy)
    elif uy < -0.04:
        shaft_up = min(shaft_up, (6.0 - hy) / uy)
    shaft_up = max(5.5, shaft_up)

    # Dynamically clamp shaft_back so butt-spike stays in front of body and inside [3..48, 3..48]
    eff_back = float(shaft_back)
    if -ux > 0.04:
        eff_back = min(eff_back, (45.5 - hx) / (-ux))
    elif -ux < -0.04:
        eff_back = min(eff_back, (28.0 - hx) / (-ux))
    if -uy > 0.04:
        eff_back = min(eff_back, (45.5 - hy) / (-uy))
    elif -uy < -0.04:
        eff_back = min(eff_back, (5.5 - hy) / (-uy))
    eff_back = max(4.8, eff_back)

    bx0 = max(27.5, min(46.5, hx - ux * eff_back))
    by0 = max(4.5, min(46.5, hy - uy * eff_back))
    head_x = max(30.0, min(45.5, hx + ux * shaft_up))
    head_y = max(5.5, min(45.5, hy + uy * shaft_up))

    # Dynamically reduce blade_len (blade_span) so head_x + px * b_dist and head_y + py * b_dist
    # and the curved crescent tip stay in front of his body and NEVER exceed [3..48, 3..48]
    blade_len = float(blade_span)
    if px > 0.04:
        blade_len = min(blade_len, (46.0 - head_x) / px)
    elif px < -0.04:
        blade_len = min(blade_len, (30.0 - head_x) / px)
    if py > 0.04:
        blade_len = min(blade_len, (46.0 - head_y) / py)
    elif py < -0.04:
        blade_len = min(blade_len, (5.0 - head_y) / py)
    blade_len = max(5.5, blade_len)
    eff_curve = float(blade_curve) * (blade_len / max(1.0, float(blade_span)))

    # 1. Long Obsidian-Iron & Amethyst Polearm Haft (from butt-spike `bx0, by0` to head `head_x, head_y`)
    haft_steps = int(max(abs(head_x - bx0), abs(head_y - by0), 1) * 2)
    for i in range(haft_steps + 1):
        t = i / haft_steps
        sh_x = bx0 + (head_x - bx0) * t
        sh_y = by0 + (head_y - by0) * t
        set_clamped_px(scythe_layer, sh_x - px * 0.6, sh_y - py * 0.6, OBSIDIAN_DEEP)
        col_shaft = VIOLET_MID if (int(i / 3) % 3 == 0) else OBSIDIAN_MID
        set_clamped_px(scythe_layer, sh_x, sh_y, col_shaft)

    # Wicked Butt-Spike at rear of shaft (clamped inside [27..48, 3..48])
    set_clamped_px(scythe_layer, max(27.0, bx0 - ux), by0 - uy, STEEL_LIGHT)
    set_clamped_px(scythe_layer, max(27.0, bx0 - ux * 1.6), by0 - uy * 1.6, VIOLET_BRIGHT)

    # 2. Winged Necropolis Skull Collar at Scythe Head (`head_x, head_y`)
    for dx_c in (-1, 0, 1):
        for dy_c in (-1, 0, 1):
            set_clamped_px(
                scythe_layer,
                head_x + dx_c,
                head_y + dy_c,
                OBSIDIAN_LIGHT if (dx_c == 0 or dy_c == 0) else OBSIDIAN_DARK
            )
    set_clamped_px(scythe_layer, head_x, head_y, CRIMSON_BRIGHT if rune_glow >= 1 else CRIMSON_MID)
    set_clamped_px(scythe_layer, max(29.0, head_x - px * 1.6), head_y - py * 1.6, VIOLET_BRIGHT)
    set_clamped_px(scythe_layer, head_x + ux * 1.4, head_y + uy * 1.4, STEEL_LIGHT)
    set_clamped_px(scythe_layer, head_x + ux * 2.2, head_y + uy * 2.2, VIOLET_BRIGHT)

    # 3. Sweeping Curved Crescent Abyssal Scythe Blade (strictly in front of body: x >= 29)
    b_steps = 24
    for i in range(b_steps + 1):
        s = i / b_steps  # 0.0 at collar -> 1.0 at lethal crescent tip
        b_dist = s * blade_len
        hook = -(s ** 1.65) * eff_curve + math.sin(s * math.pi) * 1.4
        cx = max(29.5, min(47.5, head_x + px * b_dist + ux * hook))
        cy = max(3.5, min(47.5, head_y + py * b_dist + uy * hook))

        # Blade width tapers from 4.2px near the collar to 1px at the needle tip
        w_blade = max(1, int(round((1.0 - s * 0.78) * 4.2)))
        for w_i in range(w_blade + 1):
            off_u = (1.0 - (w_i / max(1, w_blade)) * 2.0) * (w_blade * 0.42)
            bx_p = max(29.0, cx + ux * off_u)
            by_p = cy + uy * off_u

            if w_i == 0:
                col_b = OBSIDIAN_DARK if s < 0.75 else VIOLET_MID
            elif w_i == w_blade:
                if slash_arc is not None and 0.2 <= s <= 0.85:
                    col_b = CRIMSON_BRIGHT if (i % 4 < 2) else SOUL_WHITE
                else:
                    col_b = SOUL_WHITE if (rune_glow >= 2 and s > 0.25) else (STEEL_EDGE if s < 0.8 else VIOLET_PINK)
            elif w_i == 1 and 0.18 <= s <= 0.78 and (i % 4 == (rune_glow % 4)):
                col_b = CRIMSON_BRIGHT if (i % 8 < 4) else VIOLET_PINK
            else:
                col_b = VIOLET_BRIGHT if (w_i == w_blade - 1) else OBSIDIAN_MID

            set_clamped_px(scythe_layer, bx_p, by_p, col_b)

    # 4. Wide Two-Handed Polearm IK Arms (True 2-Shoulder Open V/Diamond Geometry — NEVER crossing!):
    if two_handed:
        # Grip 1: 4.5px UP the shaft toward `(head_x, head_y)`
        up_dist = min(4.8, max(3.4, shaft_up * 0.45))
        p1 = (
            max(31.0, min(44.0, hx + ux * up_dist)),
            max(7.0, min(42.0, hy + uy * up_dist)),
        )

        # Grip 2: 2.3px DOWN the shaft toward `(bx0, by0)` (~6.8px total hand separation along shaft!)
        dn_dist = min(2.5, max(1.8, eff_back * 0.36))
        p2 = (
            max(29.5, min(42.0, hx - ux * dn_dist)),
            max(10.0, min(43.0, hy - uy * dn_dist)),
        )

        # Sort grip points vertically (`top_grip` higher on screen, `bot_grip` lower on screen)
        # so the Upper Arm (`bend_side=-1.0`) and Lower Across-Chest Arm (`bend_side=+1.0`) NEVER cross in an X
        # even during low downward reaps (`eff_deg > 0`, where `uy > 0`)!
        if p1[1] <= p2[1]:
            top_grip, bot_grip = p1, p2
        else:
            top_grip, bot_grip = p2, p1

        # Far / Upper Arm attaches at Far Shoulder `(sx_arm + 1.5, sy_arm - 1.2)` and arches UP/OUT (`bend_side=-1.0`) to `top_grip`
        sx_u = max(26.0, min(40.0, sx_arm + 1.5))
        sy_u = max(10.0, min(40.0, sy_arm - 1.2))
        draw_ik_reaper_arm(
            upper_arm_layer, sx_u, sy_u, top_grip[0], top_grip[1], L1=7.0, L2=6.8, bend_side=-1.0, is_rear=True
        )

        # Near / Lower Arm attaches directly under the Near Shoulder Pauldron `(19.5 + dx_off, sy_arm + 1.8)`
        # and reaches ACROSS Malakor's chest (`bend_side=+1.0`) to `bot_grip`!
        twist_dx = max(0.0, (bot_grip[0] - 29.0) * 0.38)
        sx_l = max(18.5, min(36.0, 19.5 + dx_off + twist_dx))
        sy_l = max(11.0, min(41.0, sy_arm + 1.8))
        draw_ik_reaper_arm(
            lower_arm_layer, sx_l, sy_l, bot_grip[0], bot_grip[1], L1=7.6, L2=7.4, bend_side=1.0, is_rear=False
        )

        # Draw BOTH 2x2 skeletal bone gauntlets ON TOP of the scythe shaft so both hands are 100% unmistakable!
        for gx_p, gy_p in (top_grip, bot_grip):
            ix_g, iy_g = int(round(gx_p)), int(round(gy_p))
            set_clamped_px(gauntlet_top_layer, ix_g, iy_g, SOUL_WHITE)
            set_clamped_px(gauntlet_top_layer, ix_g + 1, iy_g, BONE_LIGHT)
            set_clamped_px(gauntlet_top_layer, ix_g, iy_g + 1, BONE_LIGHT)
            set_clamped_px(gauntlet_top_layer, ix_g + 1, iy_g + 1, BONE_MID)
        chain_origin_x, chain_origin_y = bot_grip[0] + 1.5, bot_grip[1]
    else:
        draw_ik_reaper_arm(lower_arm_layer, sx_arm, sy_arm, hx, hy, L1=5.4, L2=5.2, bend_side=1.0, is_rear=False)
        chain_origin_x, chain_origin_y = hx, hy

    # 5. Optional Extended Spectral Bone-Claw & Abyssal Chain launched from forward gauntlet (Row 3 SKILL Phase 1: F00..F14)
    if left_claw_ext is not None:
        raw_tx, raw_ty, pinch_t, draw_chain = left_claw_ext
        tx = max(32, min(44, int(round(raw_tx))))
        ty = max(6, min(44, int(round(raw_ty))))

        if draw_chain:
            c_steps = int(max(abs(tx - chain_origin_x), abs(ty - chain_origin_y), 1) * 2)
            for ci in range(c_steps + 1):
                u_c = ci / max(1, c_steps)
                cx_i = chain_origin_x + (tx - chain_origin_x) * u_c
                cy_i = chain_origin_y + (ty - chain_origin_y) * u_c + math.sin(u_c * math.pi * 2.0) * 0.6
                c_col = VIOLET_BRIGHT if (ci % 3 == 0) else (STEEL_LIGHT if ci % 2 == 0 else OBSIDIAN_MID)
                set_clamped_px(fx_layer, cx_i, cy_i, c_col)
                set_clamped_px(fx_layer, cx_i, cy_i + 1, OBSIDIAN_DEEP)

        spread_ang = (1.0 - pinch_t) * 32.0 + 10.0
        set_clamped_px(fx_layer, tx, ty, CRIMSON_BRIGHT)
        set_clamped_px(fx_layer, tx - 1, ty, VIOLET_BRIGHT)
        for sign in (-1, 1):
            a_talon = math.radians(sign * spread_ang)
            for d_t in range(1, 5):
                kx = tx + math.cos(a_talon) * d_t
                ky = ty + math.sin(a_talon) * d_t - sign * (0.25 if d_t >= 3 else 0.0)
                set_clamped_px(fx_layer, kx, ky, BONE_LIGHT if d_t >= 3 else BONE_MID)
        for d_t in range(1, 4):
            set_clamped_px(fx_layer, tx + d_t, ty, SOUL_WHITE if d_t == 3 else BONE_LIGHT)

    out = composite_over(base_frame, upper_arm_layer)
    out = composite_over(out, scythe_layer)
    out = composite_over(out, lower_arm_layer)
    out = composite_over(out, gauntlet_top_layer)
    out = composite_over(out, fx_layer)
    return strip_isolated_pixels(add_outline_to_layer(out))


draw_abyssal_scythe = draw_articulated_scythe


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
        lean_dx = 1 if y <= 27 else 0
        for x in range(14, 32):
            if stand[y, x, 3] > 0:
                col = stand[y, x].copy()
                if y >= 32 and x >= 24:
                    r, g, b, _ = col
                    if r > 70 or g > 70:
                        col = np.array(ROBE_DARK if ((x + y) % 2 == 0) else ROBE_DEEP, dtype=np.uint8)
                torso_layer[ny, min(49, x + lean_dx)] = col

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
    so Malakor's left tattered cloak (`x = 10..20, y = 26..36`) and armor remain 100% solid with zero holes:
    - Shifts `ny <= 27 + d` down by `d` (with `dx = 1` for `d >= 3 and sy <= 25`).
    - Compresses `ny = 28 + d .. 42` from `sy = int(round(27.0 + u * 15.0))` with a subtle forward
      knee bend (`dx = int(round(math.sin(u * math.pi) * d * 0.35))` for `x >= 22`,
      `-int(round(math.sin(u * math.pi) * d * 0.15))` for `x <= 15`).
    - Keeps `ny = 43..49` anchored at the bottom, then calls `fill_layer_pinholes(canvas, require_3_neighbors=False)`.
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
                dx = 1 if (d >= 3 and sy <= 25) else 0
                for x in range(1, 50):
                    if stand[sy, x, 3] > 0:
                        canvas[ny, min(49, x + dx)] = stand[sy, x]
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
    with Malakor's FULL tattered dark cloak behind his legs:
    - Backmost Layer (`cape_layer`): Full width of his tattered dark cloak (`x = 1..25` for `y = 14..42`,
      plus `x = 1..13` for `y = 43..44`), replacing any bright standing-leg bone/metal pixel (`r > 70 or g > 70`)
      in `y = 32..42, x = 14..25` with dark tattered cloak shading (`ROBE_DARK` / `ROBE_DEEP`) so the full
      dark cloak drapes seamlessly behind his two animated leaping skeletal legs!
    - Far Leg Layer: Trailing obsidian greave & boot kicked back in an aerial vault.
    - Crimson Tabard: Streaming between the legs.
    - Near Leg Layer: Leading armored knee tucked high in front.
    - Upper Torso & Hooded Skull (`torso_layer`): Extended down to `y = 33` (`x = 14..31`) so his ribcage,
      soul-fire core, and tattered waist sash are 100% intact!
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
    for y in range(0, 34):
        ny = y + torso_dy
        if not (2 <= ny < 50):
            continue
        dx = torso_lean_dx if y <= 27 else 0
        for x in range(14, 32):
            if stand[y, x, 3] > 0:
                col = stand[y, x].copy()
                if y >= 32 and x >= 24:
                    r, g, b, _ = col
                    if r > 70 or g > 70:
                        col = np.array(ROBE_DARK if ((x + y) % 2 == 0) else ROBE_DEEP, dtype=np.uint8)
                torso_layer[ny, max(2, min(49, x + dx))] = col

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
        frames.append(ensure_safe_cell(frame, margin=1))
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
        frames.append(ensure_safe_cell(frame, margin=1))
    return frames


def build_row2_auto_attack(tpl):
    """
    Row 2: 30-Frame AUTO_ATTACK (Authentic Two-Handed Polearm Reaping Sweep & Pull-Cut):
    - F00..F09 (High Polearm Coil): Both hands lift and cock the scythe shaft high (`upper_hand: (35, 19) -> (33, 12)`,
      `lower_hand: (31.2, 23.6) -> (31.9, 17.9)`, `shaft_deg: -50 deg -> -80 deg`).
    - F10..F18 (Sweeping Reap & Lever Pull-Cut): Upper hand sweeps the heavy crescent head wide out in front
      (`(33, 12) -> (39, 19) -> (35, 23)`) while the lower hand pulls the butt of the shaft back toward the hip,
      whipping `shaft_deg` from `-80 deg` through `0 deg` to `+50 deg` so the inward concave crescent edge hooks and slices through!
    - F19..F29: Smooth two-handed recovery (`(35, 23) -> (35, 19)`, `+50 deg -> -50 deg`).
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
            # Two-handed high polearm coil: upper hand (35, 19) -> (33, 12)
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
            # Explosive wide two-handed reaping sweep & lever pull-cut: (33, 12) -> (39, 19) -> (35, 23)
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
            arc_s = max(-82.0, shaft_deg - 65.0)
            arc_e = shaft_deg + 12.0
            slash_arc = (arc_s, arc_e, 20.5, 1.0 - u * 0.35) if f <= 16 else None
            frame = draw_abyssal_scythe(
                base,
                grip_pos=(gx, gy),
                shaft_deg=shaft_deg,
                shaft_reach=15.0,
                shaft_back=12.0,
                blade_span=17.5,
                blade_curve=6.2,
                blade_dir=1,
                rune_glow=3 if f <= 15 else 2,
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
    - Phase 1 (F00..F14): Extends forward gauntlet `(34..36, 19..21)` launching the Spectral Bone-Claw
      & Abyssal Chain while holding the Great-Scythe poised in front of his body (`hx >= 34`).
    - Phase 2 (F15..F29): High-arcing overhead Guillotine Scythe execution slam
      sweeping from `(31, 13) -> (38, 19) -> (35, 24)` and smooth recovery `(35, 24) -> (33, 21)`.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        use_lunge = (3 <= f <= 13) or (18 <= f <= 24)
        base = (tpl['lunge'] if use_lunge else tpl['stand']).copy()
        base = apply_cloak_wave(base, phase * 2.0, amplitude=0.9, vertical_flutter=0.45)
        pulse_hood_eyes(base, dy=1 if use_lunge else 0, bright=True)

        if f <= 14:
            # Phase 1: Spectral Bone-Claw & Chain Hook launch + drag from forward grip (34..36, 19..21)
            if f <= 6:
                u = f / 6.0
                claw_x = int(round(37 + u * 7))
                claw_y = 20
                pinch = 0.0 if f < 5 else 0.6
            elif f <= 11:
                u = (f - 6) / 5.0
                claw_x = int(round(44 - u * 6))
                claw_y = 20 + int(round(math.sin(u * math.pi) * 1.5))
                pinch = 1.0
            else:
                u = (f - 11) / 3.0
                claw_x = int(round(38 - u * 3))
                claw_y = 20
                pinch = 0.5

            scythe_deg = -64.0 - math.sin((f / 14.0) * math.pi) * 12.0
            gx = 34 + int(round(math.sin((f / 14.0) * math.pi) * 2.0))
            gy = 19 + int(round(math.cos((f / 14.0) * math.pi) * 1.0))
            frame = draw_abyssal_scythe(
                base,
                grip_pos=(gx, gy),
                shaft_deg=scythe_deg,
                shaft_reach=14.5,
                shaft_back=10.5,
                blade_span=16.5,
                blade_curve=5.8,
                blade_dir=1,
                rune_glow=2,
                two_handed=True,
                left_claw_ext=(claw_x, claw_y, pinch, True),
                shoulder_pos=(26, 19),
            )
        elif f <= 18:
            # Phase 2 Windup: Raise Great-Scythe high overhead at (31, 13) for Guillotine Execution!
            u = (f - 14) / 4.0
            shaft_deg = -64.0 * (1.0 - u) + (-80.0) * u
            gx = int(round(34 * (1.0 - u) + 31 * u))
            gy = int(round(19 * (1.0 - u) + 13 * u))
            frame = draw_abyssal_scythe(
                base,
                grip_pos=(gx, gy),
                shaft_deg=shaft_deg,
                shaft_reach=15.0,
                shaft_back=11.0,
                blade_span=17.5,
                blade_curve=6.2,
                blade_dir=1,
                rune_glow=3,
                two_handed=True,
                shoulder_pos=(26, 18),
            )
        elif f <= 23:
            # Phase 2 Execution: Crushing overhead Guillotine Scythe Slam sweeping (31, 13) -> (38, 19) -> (35, 24)!
            u = (f - 18) / 5.0
            ease = 1.0 - math.pow(1.0 - u, 2.2)
            shaft_deg = -80.0 * (1.0 - ease) + 52.0 * ease
            if u <= 0.6:
                w = u / 0.6
                gx = int(round(31 * (1.0 - w) + 38 * w))
                gy = int(round(13 * (1.0 - w) + 19 * w))
            else:
                w = (u - 0.6) / 0.4
                gx = int(round(38 * (1.0 - w) + 35 * w))
                gy = int(round(19 * (1.0 - w) + 24 * w))
            slash_arc = (-78.0, shaft_deg + 10.0, 21.0, 1.0 - u * 0.25) if f <= 22 else None
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
            shaft_deg = 52.0 * (1.0 - u) + (-52.0) * u
            gx = int(round(35 * (1.0 - u) + 33 * u))
            gy = int(round(24 * (1.0 - u) + 21 * u))
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
    - Stage 1 (F00..F10): Raises the Abyssal Great-Scythe skyward to (31, 12) as dark
      necropolis miasma and soul flames erupt around him.
    - Stage 2 (F11..F20): Unfurls tattered shadow-wings and sweeps the Great-Scythe in a wide
      Soul-Harvest cleave out in front (gx = 31..38, gy = 13..24).
    - Stage 3 (F21..F29): Drives the scythe haft into the ground at (35, 21 + crouch_d) to detonate Grim Harvest pillars.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi

        if f <= 10:
            # Stage 1: Skyward Sovereign Invocation -> (33, 21) to (31, 12) overhead raise
            u = f / 10.0
            wing_spread = max(0.0, (f - 3) / 7.0) * 0.85
            base = tpl['stand'].copy()
            base = apply_cloak_wave(base, phase * 2.0, amplitude=0.9, vertical_flutter=0.45)
            base = draw_shadow_wings(base, phase * 2.0, spread=wing_spread, shoulder_y=18)
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
            # Stage 2: Levitating Shadow-Wing Soul-Harvest Cleave sweeping cleanly in front (gx = 31..38)!
            u = (f - 11) / 9.0
            body = make_jump_body(tpl, -1, tuck_amount=0.55, torso_lean_dx=1 if 13 <= f <= 18 else 0)
            body = apply_cloak_wave(body, phase * 3.0, amplitude=0.9, vertical_flutter=0.45)
            body = draw_shadow_wings(body, phase * 3.0, spread=1.0, shoulder_y=17)
            pulse_hood_eyes(body, dy=-1, bright=True)

            if f <= 16:
                u_s = (f - 11) / 5.0
                shaft_deg = -80.0 * (1.0 - u_s) + 58.0 * u_s
                gx = int(round(31 + math.sin(u_s * math.pi) * 7.0))
                gy = int(round(13 + u_s * 11.0))
            else:
                u_s = (f - 16) / 4.0
                shaft_deg = 58.0 * (1.0 - u_s) + (-80.0) * u_s
                gx = int(round(34 + (1.0 - u_s) * 2.0))
                gy = int(round(24 * (1.0 - u_s) + 18 * u_s))

            slash_arc = (shaft_deg - 65.0, shaft_deg + 10.0, 21.0, 1.0)
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
            body = draw_shadow_wings(body, phase * 2.0, spread=wing_spread, shoulder_y=18 + crouch_d)
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
                # Erupting Grim Harvest shock-sigil at base of planted haft (x=24..44, y=48..49)
                sigil_r = 3 + (f - 21) * 2
                for dx_s in range(-sigil_r, sigil_r + 1):
                    sx_p = 35 + dx_s
                    if 3 <= sx_p <= 48:
                        set_px(frame, sx_p, 49, VIOLET_BRIGHT if dx_s % 2 == 0 else CRIMSON_BRIGHT)
                        set_px(frame, sx_p, 48, SOUL_WHITE if abs(dx_s) <= 2 else VIOLET_MID)
            else:
                # F27..F29: Smooth return from planted haft to ready stance (35 -> 33, 21)
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
            # F00..F06: Hit-stagger recoil clamped inside safe bounds via shift_layer
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
            frames.append(ensure_safe_cell(frame, margin=1))

        elif f <= 17:
            # F07..F17: Drops to one knee while Great-Scythe lowers diagonally in front (gx = 34)
            u = (f - 7) / 10.0
            base = (tpl['kneel1'] if f <= 11 else tpl['kneel2']).copy()
            head_bow = 1 if (12 <= f <= 14) else (2 if f >= 15 else 0)
            if head_bow > 0:
                # Copy head cleanly without leaving blank neck/shoulder gaps
                head_slice = base[18:28, 15:29].copy()
                base[18:18 + head_bow, 15:29] = 0
                mask = head_slice[:, :, 3] > 0
                target_view = base[18 + head_bow:28 + head_bow, 15:29]
                target_view[mask] = head_slice[mask]
                base = fill_layer_pinholes(base)
            base = apply_cloak_wave(base, u * math.pi, amplitude=0.8 * (1.0 - u * 0.5), vertical_flutter=0.3)

            shaft_deg = -10.0 * (1.0 - u) + 20.0 * u
            frame = draw_abyssal_scythe(
                base,
                grip_pos=(34, int(round(25 + u * 4))),
                shaft_deg=shaft_deg,
                shaft_reach=14.0,
                shaft_back=11.0,
                blade_span=15.5,
                blade_curve=5.0,
                blade_dir=1,
                rune_glow=1 if f <= 12 else 0,
                two_handed=False,
                shoulder_pos=(25, 23 + head_bow),
            )
            frames.append(ensure_safe_cell(frame, margin=1))

        elif f <= 22:
            # F18..F22: Collapsing forward/horizontally onto the arena floor (clamped above y=48)
            u = (f - 17) / 5.0
            tilt_deg = -u * 75.0
            pil_kn = Image.fromarray(tpl['kneel2'], mode='RGBA')
            rot_arr = np.array(
                pil_kn.rotate(tilt_deg, resample=Image.NEAREST, center=(22, 44)),
                dtype=np.uint8
            )
            ys, xs = np.where(rot_arr[:, :, 3] > 0)
            max_y = int(ys.max()) if len(ys) > 0 else 46
            shift_y = min(46 - max_y, 2)
            shift_x = int(round(u * 3.0))

            body = np.zeros((52, 52, 4), dtype=np.uint8)
            for y in range(52):
                for x in range(52):
                    if rot_arr[y, x, 3] > 0:
                        ny = max(2, min(47, y + shift_y))
                        nx = max(2, min(48, x + shift_x))
                        body[ny, nx] = rot_arr[y, x]
            body = fill_layer_pinholes(body)

            # Scythe settles flat along the ground (clamped safely above y=49)
            frame = draw_abyssal_scythe(
                body,
                grip_pos=(34, int(round(31 + u * 6))),
                shaft_deg=18.0 * (1.0 - u) + 2.0 * u,
                shaft_reach=13.0,
                shaft_back=12.0,
                blade_span=13.0 * (1.0 - u * 0.25),
                blade_curve=4.2 * (1.0 - u * 0.25),
                blade_dir=1,
                rune_glow=0,
                two_handed=False,
                shoulder_pos=(26, int(round(27 + u * 8))),
            )
            frames.append(ensure_safe_cell(frame, margin=1))

        else:
            # F23..F29: Collapsed horizontally on the ground (y=34..46) with Great-Scythe lying flat beside him
            k = f - 23
            body = tpl['fall'].copy()
            if k == 0:
                body = shift_layer(body, dx=0, dy=-1)

            # Draw single flat horizontal Great-Scythe resting on the floor (y=46..48, never touching y=51)
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


def build_row6_dash(tpl):
    """
    Row 6: 30-Frame DASH (Wraith Phase-Rush):
    - Tear-free low horizontal wraith-blitz lunge (`amplitude <= 0.9`, zero torn holes or floating pixels)
      with forward-poised single Great-Scythe blade (`gx = 34..38, gy = 20..23`).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 3:
            u = f / 3.0
            crouch_d = [1, 2, 3, 2][f]
            body = make_crouch_body(tpl, crouch_d) if f <= 1 else make_jump_body(tpl, 1, tuck_amount=0.45, torso_lean_dx=2)
            body = apply_cloak_wave(body, phase * 2.0, amplitude=0.9, is_dash=False)
            pulse_hood_eyes(body, dy=crouch_d, bright=True)
            shaft_deg = -45.0 * (1.0 - u) + (-14.0) * u
            frame = draw_abyssal_scythe(
                body,
                grip_pos=(34, 21 + crouch_d),
                shaft_deg=shaft_deg,
                shaft_reach=14.5,
                shaft_back=12.0,
                blade_span=16.5,
                blade_curve=5.8,
                blade_dir=1,
                rune_glow=2,
                two_handed=True,
                shoulder_pos=(27, 19 + crouch_d),
            )
        elif f <= 21:
            k = f - 4
            hover_dy = int(round(math.sin((k / 17.0) * math.pi) * (-1.0)))
            body = make_jump_body(tpl, 1 + hover_dy, tuck_amount=0.55, torso_lean_dx=2)
            body = apply_cloak_wave(body, k * 0.85, amplitude=0.9, is_dash=False)

            # Mid-dash scythe slice at F11..F16 held well out in front (gx = 35..38)
            if 11 <= f <= 16:
                u_s = (f - 11) / 5.0
                shaft_deg = -22.0 + u_s * 44.0
                slash_arc = (-24.0, shaft_deg + 8.0, 19.5, 0.9) if f <= 14 else None
                gx = 35 + int(round(math.sin(u_s * math.pi) * 3.0))
            elif f < 11:
                shaft_deg = -14.0 - k * 1.2
                slash_arc = None
                gx = 35 + (k % 2)
            else:
                shaft_deg = 22.0 - (f - 16) * 4.5
                slash_arc = None
                gx = 35 + (k % 2)

            frame = draw_abyssal_scythe(
                body,
                grip_pos=(gx, 22 + hover_dy),
                shaft_deg=shaft_deg,
                shaft_reach=14.5,
                shaft_back=13.0,
                blade_span=16.5,
                blade_curve=5.6,
                blade_dir=1,
                rune_glow=3 if 11 <= f <= 15 else 2,
                slash_arc=slash_arc,
                two_handed=True,
                shoulder_pos=(28, 21 + hover_dy),
            )
        else:
            u = (f - 21) / 8.0
            crouch_d = [2, 2, 1, 1, 0, 0, 0, 0][f - 22]
            body = tpl['stand'].copy() if crouch_d == 0 else make_crouch_body(tpl, crouch_d)
            body = apply_cloak_wave(body, phase, amplitude=0.9, vertical_flutter=0.45)
            pulse_hood_eyes(body, dy=crouch_d, bright=(f <= 25))
            shaft_deg = 16.0 * (1.0 - u) + (-52.0) * u
            frame = draw_abyssal_scythe(
                body,
                grip_pos=(int(round(35 * (1.0 - u) + 33 * u)), 21 + crouch_d),
                shaft_deg=shaft_deg,
                shaft_reach=14.5,
                shaft_back=12.5,
                blade_span=17.0,
                blade_curve=6.0,
                blade_dir=1,
                rune_glow=1,
                two_handed=True,
                shoulder_pos=(26, 19 + crouch_d),
            )

        frames.append(ensure_safe_cell( strip_isolated_pixels(frame), margin=1))
    return frames


def build_row7_crouch(tpl):
    """
    Row 7: 30-Frame CROUCH Sequence (Wraith-Shroud Low Two-Handed Polearm Brace & Low Reaping Hook-Slash):
    - F00..F06: Drops into a low Wraith-Shroud crouch (up to 7px lower silhouette), bracing
      the Great-Scythe with a wide two-handed polearm grip (`gx = 35, gy = 19..23`).
    - F07..F18: Coils and sweeps a low two-handed Reaping Hook-Slash from his crouch (`gx = 33 -> 39 -> 35`).
    - F19..F29: Rises smoothly back to upright two-handed polearm stance (`gx = 35, gy = 19`).
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
            if f in (11, 12):
                body = shift_layer(body, dx=1, dy=0)
            body = apply_cloak_wave(body, phase * 1.6, amplitude=0.9, vertical_flutter=0.45)
            pulse_hood_eyes(body, dy=d, bright=True)

            if f <= 10:
                # Low crouch two-handed polearm coil (F07..F10): (35, 23) -> (33, 17)
                u = (f - 7) / 3.0
                shaft_deg = -14.0 * (1.0 - u) + (-66.0) * u
                gx = int(round(35 * (1.0 - u) + 33 * u))
                gy = int(round(23 * (1.0 - u) + 17 * u))
                slash_arc = None
            elif f <= 16:
                # Low-stance two-handed reaping hook-slash (F11..F16): (33, 17) -> (39, 23)!
                u = (f - 11) / 5.0
                shaft_deg = -55.0 * (1.0 - u) + 28.0 * u
                gx = int(round(33 * (1.0 - u) + 39 * u))
                gy = int(round(17 * (1.0 - u) + 23 * u))
                slash_arc = (-45.0, shaft_deg + 12.0, 19.0, 1.0 - u * 0.3)
            else:
                # Follow-through hold (F17..F18): (39, 23) -> (35, 23)
                u = (f - 16) / 2.0
                shaft_deg = 28.0 * (1.0 - u) + 14.0 * u
                gx = int(round(39 * (1.0 - u) + 35 * u))
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
                rune_glow=3 if 10 <= f <= 15 else 2,
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
    - Every single frame shows Malakor's full hooded skull, armor, full tattered dark cloak,
      2 articulated greaves, shadow-wings, and wide Two-Handed Polearm IK Arms gripping the Abyssal Great-Scythe (`gx = 33..39`):
      * F00..F04: Knee-bend crouch & explosive shadow-jump launch (`gx = 35 -> 33`)
      * F05..F11: Ascending Shadow-Wing aerial vault raising upper grip to `(33, 12)`
      * F12..F18: Apex mid-air two-handed downward Crescent Scythe cleave sweeping `(33, 12) -> (39, 19) -> (35, 23)`
      * F19..F24: Descending wraith-glide (`gx = 35`)
      * F25..F29: Grounded shock-absorbing landing (`gx = 35`)
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 4:
            # F00..F04: Knee-bend launch
            crouch_seq = [1, 3, 5, 3, 0]
            d = crouch_seq[f]
            body = make_crouch_body(tpl, d) if d >= 2 else make_jump_body(tpl, d, tuck_amount=0.3)
            body = apply_cloak_wave(body, phase * 2.0, amplitude=0.9, vertical_flutter=0.45)
            body = draw_shadow_wings(body, phase * 2.0, spread=0.25 * f, shoulder_y=18 + d)
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
            body = draw_shadow_wings(body, phase * 2.0, spread=0.95, shoulder_y=17)
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
            # F12..F18: Apex mid-air two-handed downward Crescent Scythe cleave sweeping (33, 12) -> (39, 19) -> (35, 23)!
            u = (f - 12) / 6.0
            ease = 1.0 - math.pow(1.0 - u, 2.0)
            body = make_jump_body(tpl, -1, tuck_amount=0.95 - u * 0.15, torso_lean_dx=1 if f <= 16 else 0)
            body = apply_cloak_wave(body, phase * 2.5, amplitude=0.9, vertical_flutter=0.45)
            body = draw_shadow_wings(body, phase * 2.5, spread=1.0, shoulder_y=17)
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
            slash_arc = (-80.0, shaft_deg + 14.0, 20.5, 1.0 - u * 0.25) if f <= 17 else None
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
            # F19..F24: Descending wraith-glide with shadow-wings & cloak streaming upward
            u = (f - 19) / 5.0
            tuck = 0.75 * (1.0 - u * 0.65)
            body = make_jump_body(tpl, 0, tuck_amount=tuck)
            body = apply_cloak_wave(body, phase * 2.0, amplitude=0.9, vertical_flutter=0.45)
            body = draw_shadow_wings(body, phase * 2.0, spread=0.85 * (1.0 - u * 0.5), shoulder_y=18)
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
        for f in range(30):
            r_frames[f] = ensure_safe_cell(r_frames[f], margin=1)
        adj_diffs = sum(1 for i in range(29) if np.any(r_frames[i] != r_frames[i + 1]))
        print(f'{r_name:62s}: 30 frames generated, {adj_diffs}/29 adjacent transitions distinct')
        for f, cell in enumerate(r_frames):
            cell = ensure_safe_cell(cell, margin=1)
            top_clips += int(np.any(cell[0, :, 3] > 0))
            bot_clips += int(np.any(cell[51, :, 3] > 0))
            left_clips += int(np.any(cell[:, 0, 3] > 0))
            right_clips += int(np.any(cell[:, 51, 3] > 0))
            paste_cell(canvas, r, f, cell, cell_px=cell_px)

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


