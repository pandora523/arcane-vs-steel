#!/usr/bin/env python3
"""
Builds Glacia (IceMage - Cryo-Prism Sovereign) 30fps HD-2D Pixel-Art Skill & VFX Sprite Sheet:
- Output: assets/sprites/icemage_vfx.png (6240 x 1040, 5 rows x 30 cols at 208x208 per cell)
- Logical canvas per cell: 52x52 upscaled 4x NEAREST to 208x208 (strictly clamped inside 2 <= x <= 49, 2 <= y <= 49)
- ZERO baked black outline in Python (`PixelForge.js` adds runtime outlines).
- Rows:
  Row 0 (F00..F29): SUPERSONIC CRYO-LANCE SPEARHEAD & DOUBLE-HELIX FROST WAVE (x = 6..46, y = 10..42)
  Row 1 (F00..F29): ROTATING HEXAGONAL CRYO-PRISM LENS & REFRACTION STAR-SEAL (x = 6..46, y = 6..46)
  Row 2 (F00..F29): ERUPTING GLACIAL PERMAFROST OBELISK SPIRE & SHATTER (y = 6..47, x = 11..41)
  Row 3 (F00..F29): ABSOLUTE ZERO: BOREALIS SNOWFLAKE CATHEDRAL SEAL (y = 5..46, x = 5..47)
  Row 4 (F00..F29): HOARFROST CRESCENT WAVE & 8-POINT SNOWFLAKE STAR-RING (y = 6..46, x = 6..46)
"""

import math
import os
import numpy as np
from PIL import Image, ImageDraw

LOGICAL = 52
SCALE = 4
CELL = LOGICAL * SCALE  # 208
COLS = 30
ROWS = 5

# Clean, luminous Diamond-White / Frost-Cyan / Glacier-Sapphire / Aurora-Violet palette
C_WHITE = (255, 255, 255, 255)
C_DIAMOND_WHITE = (240, 249, 255, 255)
C_FROST_LIGHT = (186, 230, 253, 255)
C_FROST_BRIGHT = (125, 211, 252, 255)
C_FROST_CYAN = (56, 189, 248, 255)
C_GLACIER_MID = (22, 138, 198, 255)
C_GLACIER_DEEP = (14, 92, 142, 255)

C_AURORA_WHITE = (245, 243, 255, 255)
C_AURORA_LAVENDER = (196, 181, 253, 255)
C_AURORA_VIOLET = (139, 92, 246, 255)
C_AURORA_MINT = (110, 231, 183, 255)

C_SAPPHIRE_BRIGHT = (56, 116, 203, 255)
C_SAPPHIRE_MID = (37, 78, 148, 255)
C_SAPPHIRE_DARK = (26, 49, 102, 255)
C_SAPPHIRE_DEEP = (18, 32, 68, 245)
C_ABYSS_NAVY = (12, 18, 38, 255)

C_FROST_AURA = (56, 189, 248, 150)
C_AURORA_AURA = (139, 92, 246, 145)


def put(px, x, y, col):
    ix = int(round(x))
    iy = int(round(y))
    if 2 <= ix <= 49 and 2 <= iy <= 49:
        if col[3] < 255 and px[ix, iy][3] > 0:
            dst = px[ix, iy]
            a = col[3] / 255.0
            inv = 1.0 - a
            r = int(col[0] * a + dst[0] * inv)
            g = int(col[1] * a + dst[1] * inv)
            b = int(col[2] * a + dst[2] * inv)
            na = max(dst[3], col[3])
            px[ix, iy] = (r, g, b, na)
        else:
            px[ix, iy] = col


def draw_line(px, x0, y0, x1, y1, col):
    steps = int(max(abs(x1 - x0), abs(y1 - y0), 1) * 2)
    for s in range(steps + 1):
        t = s / float(steps)
        put(px, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, col)


def draw_star(px, cx, cy, r, col_core, col_ray, rot=0.0):
    put(px, cx, cy, col_core)
    for k in range(4):
        a = rot + k * (math.pi * 0.5)
        for d in range(1, int(r) + 1):
            c = col_core if d == 1 else col_ray
            put(px, cx + math.cos(a) * d, cy + math.sin(a) * d, c)


def draw_8pt_snowflake_starcross(px, cx, cy, r_main, r_diag, col_core, col_cardinal, col_diag, rot=0.0):
    """Draws a rotating 8-point Borealis Snowflake Star-Cross with cardinal crystal rays and diagonal aurora rays."""
    put(px, cx, cy, C_WHITE)
    for k in range(8):
        a = rot + k * (math.pi * 0.25)
        is_cardinal = k % 2 == 0
        rmax = int(round(r_main if is_cardinal else r_diag))
        for d in range(1, rmax + 1):
            if d == 1:
                col = col_core
            elif is_cardinal:
                col = col_cardinal if d < rmax else C_DIAMOND_WHITE
            else:
                col = col_diag
            put(px, cx + math.cos(a) * d, cy + math.sin(a) * d, col)


def draw_frost_diamond(px, cx, cy, r, col_core, col_edge):
    ir = int(round(r))
    for dy in range(-ir, ir + 1):
        rem = ir - abs(dy)
        for dx in range(-rem, rem + 1):
            if dx == 0 and dy == 0:
                put(px, cx + dx, cy + dy, C_WHITE)
            elif abs(dx) + abs(dy) == ir:
                put(px, cx + dx, cy + dy, col_edge)
            else:
                put(px, cx + dx, cy + dy, col_core)


def build_row0_cryo_lance_frost_wave(f):
    """
    Row 0: Supersonic Cryo-Lance Spearhead & Double-Helix Frost Wave (`x = 6..46, y = 10..42`, 30 frames):
    - Diamond-faceted Frost-Cyan & Glacier-Sapphire Cryo-Lance spearhead facing +X (`x = 14..46, y = 14..38`)
    - Wrapped in a double-helix Borealis frost spiral (`x = 8..44, y = 12..40`) and vertical sub-zero sonic ring (`x = 19..25, y = 10..42`).
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0
    cy = 26.0

    # 1. Background Half of the Sub-Zero Sonic Ring (`x = 19..25, y = 10..42`) & Frost Wake (`x = 6..20`)
    boom_cx = 22.0 + math.sin(phase) * 0.8
    for s in range(44):
        a = (s / 44.0) * math.pi * 2.0 + phase
        if math.cos(a) < 0.0:
            bx = max(6.0, min(46.0, boom_cx + math.cos(a) * 3.2))
            by = max(10.0, min(42.0, cy + math.sin(a) * 15.2))
            put(px, bx, by, C_FROST_CYAN if s % 2 == 0 else C_AURORA_VIOLET)

    for w_i in range(5):
        wy0 = cy + (w_i - 2) * 5.0
        for d in range(14):
            wx = 20.0 - d * 1.0
            wy = max(10.0, min(42.0, wy0 + math.sin(d * 0.45 - phase * 2.0 + w_i) * 1.4))
            if wx >= 6.0 and (d + f + w_i) % 2 == 0:
                put(px, wx, wy, C_FROST_LIGHT if d < 5 else (C_FROST_CYAN if d < 10 else C_SAPPHIRE_MID))

    # 2. Background Pass of Double-Helix Borealis Frost Spiral (x = 8..44, y = 12..40)
    for x in range(8, 45):
        u_x = (x - 8) / 36.0
        env_r = (0.35 + 0.65 * math.sin(u_x * math.pi)) * 11.5
        ang_h = u_x * math.pi * 3.5 - phase * 2.0
        for strand in (0, 1):
            sa = ang_h + strand * math.pi
            if math.cos(sa) < 0.0:
                hy = max(10.0, min(42.0, cy + math.sin(sa) * env_r))
                put(px, x, hy, C_FROST_CYAN if strand == 0 else C_AURORA_VIOLET)
                put(px, x, max(10.0, min(42.0, hy + (1 if hy < cy else -1))), C_FROST_AURA if strand == 0 else C_AURORA_AURA)

    # 3. Crystalline Snowflake Wing-Barbs at Collar (x = 22..32, y = 13..39)
    for side in (-1, 1):
        for dx_w in range(0, 11):
            u_w = dx_w / 10.0
            wx = 31 - dx_w
            wy = cy + side * (3.0 + u_w * 9.5)
            put(px, wx, wy, C_DIAMOND_WHITE if dx_w >= 8 else C_FROST_LIGHT)
            put(px, wx + 1, wy - side, C_FROST_CYAN if dx_w % 2 == 0 else C_GLACIER_MID)
            put(px, wx + 2, wy - side * 2, C_SAPPHIRE_DARK)

    # Tapered Diamond-Faceted Cryo-Lance Spearhead Body & Core (x = 14..46)
    for x in range(14, 47):
        if x < 24:
            half_h = 2
        elif x <= 31:
            half_h = int(round(2.0 + ((x - 24) / 7.0) * 4.5))
        else:
            half_h = int(round((1.0 - (x - 31) / 15.0) * 6.5))

        for dy in range(-half_h, half_h + 1):
            wy = cy + dy
            if dy == 0:
                put(px, x, wy, C_WHITE if x >= 26 else C_DIAMOND_WHITE)
            elif abs(dy) == 1:
                put(px, x, wy, C_DIAMOND_WHITE if (x + f) % 3 == 0 else C_FROST_LIGHT)
            elif abs(dy) == half_h:
                put(px, x, wy, C_DIAMOND_WHITE if x >= 34 else C_FROST_BRIGHT)
            elif abs(dy) == half_h - 1:
                put(px, x, wy, C_FROST_CYAN if dy < 0 else C_AURORA_LAVENDER)
            else:
                put(px, x, wy, C_GLACIER_MID if dy < 0 else C_SAPPHIRE_MID)

    # 4. Foreground Pass of Double-Helix Borealis Frost Spiral & Foreground Sonic Ring
    for x in range(8, 45):
        u_x = (x - 8) / 36.0
        env_r = (0.35 + 0.65 * math.sin(u_x * math.pi)) * 11.5
        ang_h = u_x * math.pi * 3.5 - phase * 2.0
        for strand in (0, 1):
            sa = ang_h + strand * math.pi
            if math.cos(sa) >= 0.0:
                hy = max(10.0, min(42.0, cy + math.sin(sa) * env_r))
                c_main = C_DIAMOND_WHITE if strand == 0 else C_AURORA_WHITE
                c_sub = C_FROST_CYAN if strand == 0 else C_AURORA_LAVENDER
                put(px, x, hy, c_main)
                put(px, x, max(10.0, min(42.0, hy - 1)), c_sub)
                put(px, max(6, x - 1), hy, C_GLACIER_MID if strand == 0 else C_AURORA_VIOLET)

    for s in range(44):
        a = (s / 44.0) * math.pi * 2.0 + phase
        if math.cos(a) >= 0.0:
            bx = max(6.0, min(46.0, boom_cx + math.cos(a) * 3.2))
            by = max(10.0, min(42.0, cy + math.sin(a) * 15.2))
            put(px, bx, by, C_WHITE if s % 4 == 0 else (C_DIAMOND_WHITE if s % 2 == 0 else C_FROST_CYAN))

    draw_star(px, 45, cy, 3, C_WHITE, C_FROST_LIGHT, rot=phase)
    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row1_cryo_prism_lens_turret(f):
    """
    Row 1: Rotating Hexagonal Cryo-Prism Lens & Refraction Star-Seal (`x = 6..46, y = 6..46`, 30 frames):
    - Glacia's signature deployable **Hexagonal Crystalline Snowflake-Prism Turret** that refracts Cryo-Lances
      into a 3-way diamond laser fan and radiates sub-zero frost waves!
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0
    cx, cy = 26.0, 26.0

    # 1. Outer Counter-Rotating Borealis Frost Rune Ring (r = 18.5)
    ring_r = 18.5 + math.sin(phase * 2.0) * 0.6
    for s in range(60):
        a = (s / 60.0) * math.pi * 2.0 - phase
        rx = max(6.0, min(46.0, cx + math.cos(a) * ring_r))
        ry = max(6.0, min(46.0, cy + math.sin(a) * ring_r))
        put(px, rx, ry, C_DIAMOND_WHITE if s % 5 == 0 else (C_FROST_CYAN if s % 2 == 0 else C_SAPPHIRE_BRIGHT))

    # 2. 6 Faceted Hexagonal Snowflake-Prism Spokes & Outer Crystal Nodes
    for k in range(6):
        ang = phase + k * (math.pi / 3.0)
        ca, sa = math.cos(ang), math.sin(ang)
        px_n, py_n = -sa, ca

        # Spoke from center (cx, cy) out to r = 16.5
        for d in range(2, 17):
            u_d = d / 16.0
            sx = cx + ca * d
            sy = cy + sa * d
            half_w = 2 if (4 <= d <= 11) else 1
            for w_i in range(-half_w, half_w + 1):
                wx = sx + px_n * w_i
                wy = sy + py_n * w_i
                if w_i == 0:
                    col = C_WHITE if d <= 8 else C_DIAMOND_WHITE
                elif abs(w_i) == half_w:
                    col = C_FROST_CYAN if k % 2 == 0 else C_AURORA_LAVENDER
                else:
                    col = C_FROST_LIGHT
                put(px, wx, wy, col)

        # Dendritic snowflake side-branches at d = 11
        bx0 = cx + ca * 11.0
        by0 = cy + sa * 11.0
        for side in (-1, 1):
            ba = ang + side * (math.pi / 4.5)
            for bd in range(1, 5):
                put(
                    px,
                    bx0 + math.cos(ba) * bd,
                    by0 + math.sin(ba) * bd,
                    C_DIAMOND_WHITE if bd >= 3 else C_FROST_BRIGHT,
                )

        # Outer diamond crystal node at r = 16.5
        draw_frost_diamond(
            px,
            cx + ca * 16.0,
            cy + sa * 16.0,
            2,
            C_FROST_LIGHT if k % 2 == 0 else C_AURORA_LAVENDER,
            C_GLACIER_MID,
        )

    # 3. Inner Hexagonal Diamond-Faceted Prism Lens Core (r = 6)
    for dy in range(-6, 7):
        for dx in range(-6, 7):
            dist = math.hypot(dx, dy)
            if dist <= 6.2:
                if dist <= 2.2:
                    col = C_WHITE
                elif dist <= 4.2:
                    col = C_DIAMOND_WHITE if (dx + dy + f) % 2 == 0 else C_FROST_LIGHT
                elif dist <= 5.3:
                    col = C_FROST_CYAN if (dx * dy) >= 0 else C_AURORA_LAVENDER
                else:
                    col = C_SAPPHIRE_DARK
                put(px, cx + dx, cy + dy, col)

    draw_star(px, cx, cy, 5, C_WHITE, C_FROST_LIGHT, rot=-phase * 1.5)
    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row2_glacial_permafrost_spire(f):
    """
    Row 2: Erupting Glacial Permafrost Obelisk Spire (`y = 6..47, x = 11..41`, 30 frames):
    - Multi-faceted Frost-Cyan, Aurora-Violet & Abyssal-Sapphire glacier crystal spire (`y = 6..47, x = 11..41`)
      with flanking basal ice-shards and spiraling Borealis frost ribbons (`F00..F21`), shattering on `F22..F29`.
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    cx = 26
    gy = 45
    phase = (f / 30.0) * math.pi * 2.0

    # 1. Persistent Glowing Snowflake Ground Seal (y = 42..47, x = 11..41)
    seal_scale = ((f + 1) / 4.0) if f <= 3 else (1.0 if f <= 21 else max(0.25, 1.0 - (f - 21) / 9.0))
    rx_seal = 15.0 * min(1.0, seal_scale)
    ry_seal = 2.4 * min(1.0, seal_scale)
    for spk in range(8):
        sa = phase + spk * (math.pi * 0.25)
        draw_line(
            px,
            cx,
            gy,
            cx + math.cos(sa) * rx_seal,
            min(47.0, gy + math.sin(sa) * ry_seal),
            C_FROST_LIGHT if spk % 2 == 0 else C_FROST_CYAN,
        )
    for s in range(48):
        a = (s / 48.0) * math.pi * 2.0 + phase
        sx_o = max(11.0, min(41.0, cx + math.cos(a) * rx_seal))
        sy_o = max(42.0, min(47.0, gy + math.sin(a) * ry_seal))
        put(px, sx_o, sy_o, C_DIAMOND_WHITE if s % 6 == 0 else (C_FROST_CYAN if s % 2 == 0 else C_SAPPHIRE_MID))

    if f <= 21:
        grow = ((f + 1) / 6.0) if f <= 5 else 1.0

        # 2. Flanking Basal Glacier Crystal Shards (x = 11..41, y = 24..46)
        basal_shards = [
            (-8.0, -4.5, 14.0, 3.0),
            (-4.8, -4.0, 21.0, 4.0),
            (+4.8, +4.0, 21.0, 4.0),
            (+8.0, +4.5, 14.0, 3.0),
        ]
        for bx_off, tilt_dx, max_sh, base_w in basal_shards:
            sh = int(round(max_sh * grow))
            for h in range(sh + 1):
                u_h = h / float(max(1, sh))
                sy = gy - h
                scx = cx + bx_off + tilt_dx * u_h
                hw = max(0, int(round(base_w * (1.0 - u_h * 0.88))))
                for dx in range(-hw, hw + 1):
                    wx = max(11.0, min(41.0, scx + dx))
                    is_edge = abs(dx) == hw
                    is_ridge = dx == 0 or (h + abs(dx) * 2) % 7 == 0
                    if is_edge:
                        col = C_DIAMOND_WHITE if u_h > 0.6 else C_FROST_LIGHT
                    elif is_ridge:
                        col = C_AURORA_WHITE if u_h > 0.35 else C_FROST_BRIGHT
                    elif dx < 0:
                        col = C_FROST_CYAN if dx == -1 else C_GLACIER_MID
                    else:
                        col = C_SAPPHIRE_MID if dx == 1 else C_SAPPHIRE_DARK
                    put(px, wx, sy, col)

        # 3. Towering Central Multi-Faceted Borealis Glacier Obelisk Spire (y = 6..45)
        main_h = int(round(39.0 * grow))
        for h in range(main_h + 1):
            u_h = h / float(max(1, main_h))
            sy = max(6, gy - h)
            profile = (0.78 + 0.22 * (u_h / 0.25)) if u_h < 0.25 else (1.0 - (u_h - 0.25) / 0.75)
            hw = max(0, int(round(7.2 * profile)))
            for dx in range(-hw, hw + 1):
                diag_facet_1 = (h - abs(dx) * 2 + (f // 2)) % 8 == 0
                diag_facet_2 = abs(dx) == max(1, hw // 2) and h % 2 == 0
                if abs(dx) == hw:
                    col = C_DIAMOND_WHITE if (dx < 0 or u_h > 0.45) else C_FROST_LIGHT
                elif dx == 0:
                    col = C_WHITE if (h + f) % 3 != 0 else C_DIAMOND_WHITE
                elif diag_facet_1 or diag_facet_2:
                    col = C_FROST_BRIGHT if dx <= 0 else C_AURORA_LAVENDER
                elif dx < 0:
                    col = C_FROST_CYAN if dx >= -2 else C_GLACIER_MID
                else:
                    col = C_SAPPHIRE_BRIGHT if dx <= 2 else (C_SAPPHIRE_MID if dx <= 4 else C_SAPPHIRE_DARK)
                put(px, cx + dx, sy, col)

        # 4. Spiraling Borealis Frost Ribbons Wrapping Upward Around the Glacier Spire (y = 8..44, x = 12..40)
        for h in range(2, main_h):
            u_h = h / float(max(1, main_h))
            sy = max(6, gy - h)
            ang_r = h * 0.38 - phase * 2.0
            for strand in (0, 1):
                sa = ang_r + strand * math.pi
                rx_rib = (9.5 * (1.0 - u_h * 0.55)) * math.sin(sa)
                if math.cos(sa) >= -0.15:
                    wx = max(11.0, min(41.0, cx + rx_rib))
                    put(px, wx, sy, C_DIAMOND_WHITE if strand == 0 else C_AURORA_WHITE)
                    put(
                        px,
                        max(11.0, min(41.0, wx + (1 if rx_rib >= 0 else -1))),
                        sy,
                        C_FROST_CYAN if strand == 0 else C_AURORA_LAVENDER,
                    )

        if f >= 5:
            draw_star(px, cx, max(6, gy - main_h), 3, C_WHITE, C_FROST_LIGHT, rot=phase)
    else:
        # F22..F29: Explosive Crystalline Glacier Shatter (within x = 11..41, y = 6..47)
        u = (f - 22) / 7.0
        for shard_i in range(14):
            ang = -math.pi * 0.92 + (shard_i / 13.0) * math.pi * 0.84
            base_y = gy - 6 - (shard_i % 4) * 8
            dist = 3.0 + u * 13.5
            sx = max(12.0, min(40.0, cx + math.cos(ang) * dist))
            sy = max(7.0, min(45.0, base_y + math.sin(ang) * dist * 0.6 + u * u * 5.0))
            r_sh = 2 if (u < 0.55 and shard_i % 2 == 0) else 1
            draw_frost_diamond(
                px,
                sx,
                sy,
                r_sh,
                C_FROST_LIGHT if shard_i % 2 == 0 else C_FROST_CYAN,
                C_SAPPHIRE_MID if u < 0.7 else C_SAPPHIRE_DARK,
            )

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row3_borealis_cathedral_seal(f):
    """
    Row 3: Absolute Zero: Borealis Snowflake Cathedral Seal (`y = 5..46, x = 5..47`, 30 frames):
    - Grand 12-Point Sovereign Snowflake Rose-Window Mandala with counter-rotating Borealis rune rings,
      6 Crystalline Ice-Wing Arches, and a blazing Absolute-Zero Star Core!
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0
    cx, cy = 26.0, 25.5

    # 1. Outer Rotating Borealis Snowflake Cathedral Wheel (x = 5..47, y = 5..46)
    ring_r = 19.8 + math.sin(phase * 2.0) * 0.5
    for s in range(64):
        a = (s / 64.0) * math.pi * 2.0 + phase
        rx = max(5.0, min(47.0, cx + math.cos(a) * ring_r))
        ry = max(5.0, min(46.0, cy + math.sin(a) * ring_r))
        is_rune = s % 8 == 0
        put(px, rx, ry, C_DIAMOND_WHITE if is_rune else (C_FROST_CYAN if s % 2 == 0 else C_SAPPHIRE_BRIGHT))
        if is_rune:
            ix = max(5.0, min(47.0, cx + math.cos(a) * (ring_r - 1.6)))
            iy = max(5.0, min(46.0, cy + math.sin(a) * (ring_r - 1.6)))
            put(px, ix, iy, C_AURORA_LAVENDER)
            draw_line(
                px,
                cx + math.cos(a) * 11.0,
                cy + math.sin(a) * 11.0,
                ix,
                iy,
                C_GLACIER_MID if (s // 8) % 2 == 0 else C_SAPPHIRE_MID,
            )

    # 2. Spread Crystalline Borealis Ice-Seraph Wings (x = 5..47, y = 8..38)
    wing_beat = math.sin(phase * 2.0) * 1.2
    for side in (-1, 1):
        crest_x = cx + side * 14
        crest_y = max(6.0, 9.0 + wing_beat * 0.6)
        draw_line(px, cx + side * 6, 16, crest_x, crest_y, C_FROST_LIGHT)
        draw_line(px, cx + side * 6, 17, crest_x, crest_y + 1, C_FROST_CYAN)
        put(px, crest_x, max(5.0, crest_y - 1), C_WHITE)
        put(px, crest_x + side, crest_y, C_DIAMOND_WHITE)

        for tier in range(4):
            max_span = 20 - tier * 2
            y0 = 15.0 + tier * 3.8
            for d in range(6, max_span + 1):
                u_d = (d - 6) / float(max(1, max_span - 6))
                wx = max(5.0, min(47.0, cx + side * d))
                wy = max(6.0, min(45.0, y0 - (1.0 - tier * 0.35) * u_d * 5.0 + wing_beat * u_d))
                put(px, wx, wy, C_DIAMOND_WHITE if d >= max_span - 1 else (C_FROST_LIGHT if tier <= 1 else C_FROST_CYAN))
                for m_dy in range(1, 4):
                    my = min(45.0, wy + m_dy)
                    col_m = (
                        C_AURORA_LAVENDER
                        if m_dy == 1
                        else (C_GLACIER_MID if (d + m_dy) % 2 == 0 else C_SAPPHIRE_MID)
                    )
                    put(px, wx, my, col_m)

    # 3. Central Sovereign Snowflake Crown Emblem & Prism Core (x = 17..35, y = 8..37)
    for dy_c in range(7, 15):
        put(px, cx, dy_c, C_WHITE if dy_c <= 10 else C_DIAMOND_WHITE)
        put(px, cx - 1, dy_c + 1, C_FROST_CYAN)
        put(px, cx + 1, dy_c + 1, C_FROST_CYAN)

    for k in range(6):
        ang = -phase * 1.5 + k * (math.pi / 3.0)
        draw_line(
            px,
            cx,
            cy,
            cx + math.cos(ang) * 11.5,
            cy + math.sin(ang) * 11.5,
            C_DIAMOND_WHITE if k % 2 == 0 else C_FROST_LIGHT,
        )

    draw_frost_diamond(px, cx, cy, 5, C_FROST_LIGHT, C_SAPPHIRE_MID)
    draw_frost_diamond(px, cx, cy, 3, C_DIAMOND_WHITE, C_FROST_CYAN)
    draw_star(px, cx, cy, 6, C_WHITE, C_FROST_LIGHT, rot=phase * 2.0)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row4_hoarfrost_crescent_starring(f):
    """
    Row 4: Hoarfrost Crescent Wave & 8-Point Snowflake Star-Ring (`y = 6..46, x = 6..46`, 30 frames):
    - Sweeping diamond-white, frost-cyan & aurora-violet scepter crescent arc with 6 rotating 8-point Borealis Star-Crosses (`y = 6..46, x = 6..46`).
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0
    cx, cy = 26.0, 26.0

    # 1. Inner Sacred Borealis Frost Ring (r = 14.5, within x = 11..41, y = 11..41)
    ring_r = 14.5 + math.sin(phase * 2.0) * 0.6
    for s in range(48):
        a = (s / 48.0) * math.pi * 2.0 - phase
        rx = max(6.0, min(46.0, cx + math.cos(a) * ring_r))
        ry = max(6.0, min(46.0, cy + math.sin(a) * ring_r))
        put(px, rx, ry, C_FROST_LIGHT if s % 3 == 0 else (C_FROST_CYAN if s % 2 == 0 else C_SAPPHIRE_BRIGHT))

    # 2. Sweeping Diamond-Frost Crescent Slash Arc (y = 6..46, x = 10..46)
    pulse = 0.85 + 0.15 * math.sin(phase * 2.0)
    lead_x_apex = 44.5 + math.sin(phase) * 1.0
    for dy in range(-19, 20):
        u = dy / 19.0
        wy = max(6.0, min(46.0, cy + dy))
        lead_x = lead_x_apex - (u * u) * 17.5
        thick = max(1, int(round((1.0 - u * u * 0.78) * 8.5 * pulse)))
        for t_off in range(thick + 1):
            wx = max(6.0, min(46.0, lead_x - t_off))
            if t_off == 0:
                put(px, wx, wy, C_WHITE)
            elif t_off == 1:
                put(px, wx, wy, C_DIAMOND_WHITE)
            elif t_off <= 3:
                put(px, wx, wy, C_FROST_LIGHT if (dy + t_off + f) % 2 == 0 else C_FROST_CYAN)
            elif t_off <= 5:
                put(px, wx, wy, C_AURORA_LAVENDER if (dy + f) % 2 == 0 else C_GLACIER_MID)
            else:
                put(px, wx, wy, C_SAPPHIRE_BRIGHT if t_off < thick else C_SAPPHIRE_DARK)

    # 3. Rotating 8-Point Borealis Snowflake Star-Crosses Orbiting in a Ring (`y = 6..46, x = 6..46`)
    num_crosses = 6
    orbit_r = 15.5
    for c_i in range(num_crosses):
        ca = phase + c_i * (math.pi * 2.0 / num_crosses)
        sx = max(9.0, min(43.0, cx + math.cos(ca) * orbit_r))
        sy = max(9.0, min(43.0, cy + math.sin(ca) * orbit_r))
        draw_8pt_snowflake_starcross(
            px,
            sx,
            sy,
            r_main=3.0 if c_i % 2 == 0 else 2.0,
            r_diag=2.0 if c_i % 2 == 0 else 1.5,
            col_core=C_DIAMOND_WHITE,
            col_cardinal=C_FROST_LIGHT if c_i % 2 == 0 else C_AURORA_WHITE,
            col_diag=C_FROST_CYAN,
            rot=-phase * 2.0 + c_i,
        )

    # Central Sovereign 8-Point Borealis Snowflake Star-Cross at (24, 26)
    draw_8pt_snowflake_starcross(
        px,
        24.0,
        cy,
        r_main=4.0,
        r_diag=2.5,
        col_core=C_WHITE,
        col_cardinal=C_DIAMOND_WHITE,
        col_diag=C_FROST_CYAN,
        rot=phase * 1.5,
    )

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def apply_pass11_star_mote_polish(cell_img, row_idx, f):
    """
    Pass #11 HD-2D Specular Star-Mote & Aura Polish:
    Adds orbiting 4-point specular star glints (3x3 white core + themed 1px rays,
    strictly inside [16..191]) that revolve smoothly with frame index f (0..29).
    """
    px = cell_img.load()
    phase = (f / 30.0) * math.pi * 2.0
    for m_idx in range(3):
        ang = phase + m_idx * (math.pi * 2.0 / 3.0) + row_idx * 0.45
        rx = 60.0 + 8.0 * math.sin(phase * 2.0 + m_idx * 1.7 + row_idx)
        ry = 56.0 + 8.0 * math.cos(phase * 2.0 + m_idx * 1.3 + row_idx)
        cx = max(24, min(183, int(round(104.0 + math.cos(ang) * rx))))
        cy = max(24, min(183, int(round(104.0 + math.sin(ang) * ry))))
        ray_col = C_FROST_LIGHT if (m_idx + row_idx) % 2 == 0 else C_AURORA_LAVENDER
        ray_len = 5 + ((f + m_idx) % 3)

        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if abs(dx) + abs(dy) <= 1:
                    x, y = cx + dx, cy + dy
                    if 16 <= x <= 191 and 16 <= y <= 191:
                        px[x, y] = C_WHITE
                elif px[cx + dx, cy + dy][3] == 0:
                    px[cx + dx, cy + dy] = C_FROST_AURA

        for d in range(2, ray_len + 1):
            c_step = C_WHITE if d == 2 else ray_col
            for dx, dy in ((-d, 0), (d, 0), (0, -d), (0, d)):
                x, y = cx + dx, cy + dy
                if 16 <= x <= 191 and 16 <= y <= 191:
                    px[x, y] = c_step

    return cell_img


def main():
    sheet_w = COLS * CELL  # 6240
    sheet_h = ROWS * CELL  # 1040
    sheet = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))

    builders = [
        ("ROW 0: SUPERSONIC CRYO-LANCE & DOUBLE-HELIX FROST WAVE (30 FRAMES)", build_row0_cryo_lance_frost_wave),
        ("ROW 1: ROTATING HEXAGONAL CRYO-PRISM LENS TURRET (30 FRAMES)", build_row1_cryo_prism_lens_turret),
        ("ROW 2: ERUPTING GLACIAL PERMAFROST OBELISK SPIRE (30 FRAMES)", build_row2_glacial_permafrost_spire),
        ("ROW 3: ABSOLUTE ZERO: BOREALIS CATHEDRAL SEAL (30 FRAMES)", build_row3_borealis_cathedral_seal),
        ("ROW 4: HOARFROST CRESCENT WAVE & SNOWFLAKE STAR-RING (30 FRAMES)", build_row4_hoarfrost_crescent_starring),
    ]

    top_clips = bot_clips = left_clips = right_clips = 0
    for row_idx, (label, fn) in enumerate(builders):
        row_frames_208 = []
        for col_idx in range(COLS):
            cell_img = apply_pass11_star_mote_polish(fn(col_idx), row_idx, col_idx)
            arr208 = np.array(cell_img, dtype=np.uint8)
            row_frames_208.append(arr208)
            if np.any(arr208[:8, :, 3] > 0):
                top_clips += 1
            if np.any(arr208[200:, :, 3] > 0):
                bot_clips += 1
            if np.any(arr208[:, :8, 3] > 0):
                left_clips += 1
            if np.any(arr208[:, 200:, 3] > 0):
                right_clips += 1
            sheet.paste(cell_img, (col_idx * CELL, row_idx * CELL))
        adj_diffs = sum(1 for i in range(29) if np.any(row_frames_208[i] != row_frames_208[i + 1]))
        print(f"{label:68s}: 30 frames, {adj_diffs}/29 adjacent transitions distinct")

    print(
        f"VFX boundary clip audit across 150 frames: TOP={top_clips}, BOT={bot_clips}, LEFT={left_clips}, RIGHT={right_clips}"
    )
    out_path = "/home/antigravity/pandora523/arcane-vs-steel/assets/sprites/icemage_vfx.png"
    sheet.save(out_path)
    print(f"Saved 30fps IceMage VFX sheet to {out_path} ({sheet.size[0]}x{sheet.size[1]})")

    art_dir = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/3a4b2cf8-05c2-45a3-bb65-af6f5b5a1088"
    os.makedirs(art_dir, exist_ok=True)
    thumb = 80
    pad_top = 24
    cw = COLS * thumb
    ch = ROWS * (thumb + pad_top)
    contact = Image.new("RGBA", (cw, ch), (13, 19, 32, 255))
    draw = ImageDraw.Draw(contact)

    for r_idx, (label, _) in enumerate(builders):
        y0 = r_idx * (thumb + pad_top)
        draw.rectangle([0, y0, cw, y0 + pad_top - 1], fill=(20, 30, 48, 255))
        draw.text((6, y0 + 2), label, fill=(125, 211, 252, 255))
        for c_idx in range(COLS):
            x0 = c_idx * thumb
            draw.text((x0 + 4, y0 + 12), f"F{c_idx:02d}", fill=(240, 249, 255, 255))
            cell_crop = sheet.crop((c_idx * CELL, r_idx * CELL, (c_idx + 1) * CELL, (r_idx + 1) * CELL))
            cell_thumb = cell_crop.resize((thumb, thumb), Image.Resampling.NEAREST)
            contact.paste(cell_thumb, (x0, y0 + pad_top), cell_thumb)
            draw.rectangle([x0, y0 + pad_top, x0 + thumb - 1, y0 + pad_top + thumb - 1], outline=(35, 52, 78, 255))

    c_path = os.path.join(art_dir, "debug_icemage_30fps_vfx.png")
    contact.save(c_path)
    print(f"Saved VFX contact sheet: {c_path} ({contact.size[0]}x{contact.size[1]})")


if __name__ == "__main__":
    main()
