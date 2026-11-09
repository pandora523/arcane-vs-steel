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
    Row 0: Faceted Diamond Cryo-Prism Shard & Snowflake Comet (`x = 6..46, y = 10..42`, 30 frames):
    - Pure 52x52 pixel-art Faceted Hexagonal Diamond Prism Shard & Spinning 6-Pointed Snowflake Comet facing +X,
      with crisp #0c1226 dark interior crystal bevels and trailing pixel-art diamond ice crystals (zero spear wings).
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0
    cy = 26

    # 1. Trailing Stepped Pixel-Art Frost Wake & Mini Diamond Shards (x = 6..22, y = 14..38)
    for trail_i in range(4):
        tx = 8 + ((trail_i * 4 - f) % 14)
        ty = cy + (trail_i - 1.5) * 5.0 + round(math.sin(phase + trail_i * 1.4) * 1.5)
        draw_frost_diamond(
            px,
            tx,
            ty,
            2 if trail_i % 2 == 0 else 1,
            C_FROST_LIGHT if trail_i % 2 == 0 else C_AURORA_LAVENDER,
            C_ABYSS_NAVY,
        )

    # Stepped pixel slipstream bars behind the crystal shard
    for lane in (-6, -3, 0, 3, 6):
        ly = cy + lane
        x_start = 7 + ((abs(lane) + f) % 4)
        for x in range(x_start, 22, 2):
            col = C_FROST_CYAN if lane <= 0 else C_AURORA_VIOLET
            put(px, x, ly, C_DIAMOND_WHITE if x >= 17 else col)
            put(px, x, ly + (1 if lane >= 0 else -1), C_ABYSS_NAVY)

    # 2. Orbiting Vertical Pixel-Art Hexagonal Frost Ring (x = 20..26, y = 11..41)
    for s in range(28):
        a = (s / 28.0) * math.pi * 2.0 + phase
        rx = round(23.0 + math.cos(a) * 3.0)
        ry = round(cy + math.sin(a) * 13.0)
        if math.cos(a) < 0.0:
            put(px, rx, ry, C_SAPPHIRE_DARK if s % 2 == 0 else C_GLACIER_MID)

    # 3. Main Multi-Faceted Hexagonal Diamond Cryo-Prism Body (x = 16..45, y = 16..36)
    # Crisp dark #0c1226 pixel border + stepped cyan/sapphire/lavender crystal bevels + white pixel spine
    for x in range(16, 46):
        if x < 24:
            half_h = int(round(1.0 + ((x - 16) / 8.0) * 7.0))
        elif x <= 32:
            half_h = 8
        else:
            half_h = int(round((1.0 - (x - 32) / 13.0) * 8.0))

        for dy in range(-half_h - 1, half_h + 2):
            wy = cy + dy
            ad = abs(dy)
            if ad == half_h + 1:
                put(px, x, wy, C_ABYSS_NAVY)
            elif ad == half_h:
                put(px, x, wy, C_DIAMOND_WHITE if dy < 0 else C_FROST_BRIGHT)
            elif dy == 0:
                put(px, x, wy, C_WHITE)
            elif ad == 1:
                put(px, x, wy, C_DIAMOND_WHITE if (x + f) % 2 == 0 else C_FROST_LIGHT)
            elif (x - dy) % 6 == 0 or ad == half_h - 2:
                # Internal stepped dark/bright crystal facet seam
                put(px, x, wy, C_SAPPHIRE_DARK if dy > 0 else C_FROST_BRIGHT)
            elif dy < 0:
                put(px, x, wy, C_FROST_CYAN if ad <= 4 else C_GLACIER_MID)
            else:
                put(px, x, wy, C_AURORA_LAVENDER if ad <= 3 else C_SAPPHIRE_MID)

    # 4. Foreground Pass of Vertical Hexagonal Frost Ring & Leading 8-Point Pixel Snowflake Star
    for s in range(28):
        a = (s / 28.0) * math.pi * 2.0 + phase
        rx = round(23.0 + math.cos(a) * 3.0)
        ry = round(cy + math.sin(a) * 13.0)
        if math.cos(a) >= 0.0:
            put(px, rx, ry, C_WHITE if s % 4 == 0 else C_FROST_LIGHT)

    draw_8pt_snowflake_starcross(
        px,
        36,
        cy,
        r_main=6.0,
        r_diag=4.0,
        col_core=C_WHITE,
        col_cardinal=C_DIAMOND_WHITE,
        col_diag=C_FROST_CYAN,
        rot=phase,
    )
    return img


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

    # 1. Outer Counter-Rotating Stepped Octagonal/Hexagonal Frost Frame (r = 18.5)
    ring_r = 18.0
    for s in range(64):
        a = (s / 64.0) * math.pi * 2.0 - phase
        rx = round(cx + math.cos(a) * ring_r)
        ry = round(cy + math.sin(a) * ring_r)
        put(px, rx, ry, C_ABYSS_NAVY)
        ix = round(cx + math.cos(a) * (ring_r - 1.2))
        iy = round(cy + math.sin(a) * (ring_r - 1.2))
        put(px, ix, iy, C_DIAMOND_WHITE if s % 8 == 0 else (C_FROST_CYAN if s % 2 == 0 else C_SAPPHIRE_BRIGHT))

    # 2. 6 Faceted Hexagonal Snowflake-Prism Spokes & Outer Crystal Nodes
    for k in range(6):
        ang = phase + k * (math.pi / 3.0)
        ca, sa = math.cos(ang), math.sin(ang)
        px_n, py_n = -sa, ca

        for d in range(2, 17):
            sx = cx + ca * d
            sy = cy + sa * d
            half_w = 2 if (4 <= d <= 11) else 1
            for w_i in range(-half_w - 1, half_w + 2):
                wx = sx + px_n * w_i
                wy = sy + py_n * w_i
                if abs(w_i) == half_w + 1:
                    col = C_ABYSS_NAVY
                elif w_i == 0:
                    col = C_WHITE if d <= 9 else C_DIAMOND_WHITE
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
                bx = bx0 + math.cos(ba) * bd
                by = by0 + math.sin(ba) * bd
                put(px, bx, by, C_DIAMOND_WHITE if bd >= 3 else C_FROST_BRIGHT)

        # Outer diamond crystal node at r = 16.0
        draw_frost_diamond(
            px,
            cx + ca * 16.0,
            cy + sa * 16.0,
            3,
            C_FROST_LIGHT if k % 2 == 0 else C_AURORA_LAVENDER,
            C_ABYSS_NAVY,
        )

    # 3. Inner Hexagonal Diamond-Faceted Prism Lens Core (r = 7)
    for dy in range(-7, 8):
        for dx in range(-7, 8):
            dist = abs(dx) * 0.85 + abs(dy) * 0.85
            if dist <= 7.2:
                if dist >= 6.0:
                    col = C_ABYSS_NAVY
                elif dist <= 2.0:
                    col = C_WHITE
                elif dist <= 3.8:
                    col = C_DIAMOND_WHITE if (dx + dy + f) % 2 == 0 else C_FROST_LIGHT
                elif dist <= 5.0:
                    col = C_FROST_CYAN if (dx * dy) >= 0 else C_AURORA_LAVENDER
                else:
                    col = C_SAPPHIRE_MID
                put(px, cx + dx, cy + dy, col)

    draw_star(px, cx, cy, 5, C_WHITE, C_FROST_LIGHT, rot=-phase * 1.5)
    return img


def build_row2_glacial_permafrost_spire(f):
    """
    Row 2: Erupting Glacial Permafrost Obelisk Spire (`y = 6..47, x = 11..41`, 30 frames):
    - Multi-faceted Frost-Cyan, Aurora-Violet & Abyssal-Sapphire glacier crystal spire (`y = 6..47, x = 11..41`)
      with crisp #0c1226 pixel borders, flanking basal ice-shards, and shattering diamond blocks on `F22..F29`.
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    cx = 26
    gy = 45
    phase = (f / 30.0) * math.pi * 2.0

    # 1. Persistent Glowing Snowflake Ground Seal (y = 42..47, x = 11..41)
    seal_scale = ((f + 1) / 4.0) if f <= 3 else (1.0 if f <= 21 else max(0.25, 1.0 - (f - 21) / 9.0))
    rx_seal = int(round(15.0 * min(1.0, seal_scale)))
    for dx in range(-rx_seal - 1, rx_seal + 2):
        wx = max(10, min(42, cx + dx))
        ad = abs(dx)
        if ad == rx_seal + 1:
            put(px, wx, gy, C_ABYSS_NAVY)
        else:
            put(px, wx, gy + 1, C_ABYSS_NAVY)
            put(px, wx, gy, C_DIAMOND_WHITE if ad % 4 == 0 else C_FROST_CYAN)
            if ad <= rx_seal - 2:
                put(px, wx, gy - 1, C_FROST_LIGHT if ad % 3 == 0 else C_SAPPHIRE_MID)

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
                for dx in range(-hw - 1, hw + 2):
                    wx = max(10.0, min(42.0, scx + dx))
                    if abs(dx) == hw + 1:
                        col = C_ABYSS_NAVY
                    elif abs(dx) == hw:
                        col = C_DIAMOND_WHITE if u_h > 0.5 else C_FROST_LIGHT
                    elif dx == 0:
                        col = C_WHITE if u_h > 0.4 else C_FROST_BRIGHT
                    elif dx < 0:
                        col = C_FROST_CYAN if dx == -1 else C_GLACIER_MID
                    else:
                        col = C_SAPPHIRE_MID if dx == 1 else C_SAPPHIRE_DARK
                    put(px, wx, sy, col)

        # 3. Towering Central Multi-Faceted Borealis Glacier Obelisk Spire (y = 6..45)
        main_h = int(round(38.0 * grow))
        for h in range(main_h + 1):
            u_h = h / float(max(1, main_h))
            sy = max(6, gy - h)
            profile = (0.78 + 0.22 * (u_h / 0.25)) if u_h < 0.25 else (1.0 - (u_h - 0.25) / 0.75)
            hw = max(0, int(round(7.2 * profile)))
            for dx in range(-hw - 1, hw + 2):
                diag_seam = (h - abs(dx) * 2) % 7 == 0
                if abs(dx) == hw + 1:
                    col = C_ABYSS_NAVY
                elif abs(dx) == hw:
                    col = C_DIAMOND_WHITE if (dx < 0 or u_h > 0.45) else C_FROST_LIGHT
                elif dx == 0:
                    col = C_WHITE if (h + f) % 3 != 0 else C_DIAMOND_WHITE
                elif diag_seam:
                    col = C_ABYSS_NAVY if dx > 1 else C_FROST_BRIGHT
                elif dx < 0:
                    col = C_FROST_CYAN if dx >= -2 else C_GLACIER_MID
                else:
                    col = C_AURORA_LAVENDER if dx <= 2 else (C_SAPPHIRE_MID if dx <= 4 else C_SAPPHIRE_DARK)
                put(px, cx + dx, sy, col)
        put(px, cx, max(5, gy - main_h - 1), C_ABYSS_NAVY)

        if f >= 5:
            draw_star(px, cx, max(7, gy - main_h + 1), 3, C_WHITE, C_FROST_LIGHT, rot=phase)
    else:
        # F22..F29: Explosive Crystalline Glacier Shatter (within x = 11..41, y = 6..47)
        u = (f - 22) / 7.0
        for shard_i in range(12):
            ang = -math.pi * 0.92 + (shard_i / 11.0) * math.pi * 0.84
            base_y = gy - 6 - (shard_i % 4) * 8
            dist = 3.0 + u * 13.0
            sx = max(12.0, min(40.0, cx + math.cos(ang) * dist))
            sy = max(7.0, min(45.0, base_y + math.sin(ang) * dist * 0.6 + u * u * 5.0))
            r_sh = 3 if (u < 0.55 and shard_i % 2 == 0) else 2
            draw_frost_diamond(
                px,
                sx,
                sy,
                r_sh,
                C_FROST_LIGHT if shard_i % 2 == 0 else C_FROST_CYAN,
                C_ABYSS_NAVY,
            )

    return img


def build_row3_borealis_cathedral_seal(f):
    """
    Row 3: Absolute Zero: Borealis Snowflake Cathedral Rose-Window Mandala (`y = 5..47, x = 5..47`, 30 frames):
    - 100% Wingless Grand 12-Pointed Geometric Snowflake Rose-Window Mandala & Crystalline Astrolabe
      with counter-rotating Borealis pixel-rune rings, 6 dendritic snowflake crystal arms, 6 Aurora-Violet
      diamond spokes, and a blazing Absolute-Zero Star Core!
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0
    cx, cy = 26.0, 26.0

    # 1. Outer Rotating Dodecagonal Borealis Snowflake Cathedral Ring (r = 19.5)
    ring_r = 19.5
    for s in range(72):
        a = (s / 72.0) * math.pi * 2.0 + phase * 0.5
        rx = round(cx + math.cos(a) * ring_r)
        ry = round(cy + math.sin(a) * ring_r)
        put(px, rx, ry, C_ABYSS_NAVY)
        ix = round(cx + math.cos(a) * (ring_r - 1.2))
        iy = round(cy + math.sin(a) * (ring_r - 1.2))
        is_node = s % 6 == 0
        put(px, ix, iy, C_WHITE if is_node else (C_FROST_CYAN if s % 2 == 0 else C_SAPPHIRE_BRIGHT))

    # 2. Inner Counter-Rotating Hexagonal Lattice Ring (r = 12.0)
    for k in range(6):
        a0 = -phase + k * (math.pi / 3.0)
        a1 = -phase + (k + 1) * (math.pi / 3.0)
        x0, y0 = cx + math.cos(a0) * 12.0, cy + math.sin(a0) * 12.0
        x1, y1 = cx + math.cos(a1) * 12.0, cy + math.sin(a1) * 12.0
        draw_line(px, x0, y0, x1, y1, C_AURORA_LAVENDER if k % 2 == 0 else C_FROST_LIGHT)

    # 3. 12 Geometric Rose-Window Spokes (6 Primary Dendritic Snowflake Arms + 6 Secondary Aurora Spokes)
    for k in range(12):
        ang = phase * 0.5 + k * (math.pi / 6.0)
        ca, sa = math.cos(ang), math.sin(ang)
        px_n, py_n = -sa, ca
        is_primary = k % 2 == 0
        max_d = 19 if is_primary else 15

        for d in range(4, max_d + 1):
            sx = cx + ca * d
            sy = cy + sa * d
            if is_primary:
                for w_i in (-1, 0, 1):
                    col = C_WHITE if w_i == 0 else C_FROST_CYAN
                    put(px, sx + px_n * w_i, sy + py_n * w_i, col)
                put(px, sx + px_n * 2, sy + py_n * 2, C_ABYSS_NAVY)
                put(px, sx - px_n * 2, sy - py_n * 2, C_ABYSS_NAVY)
            else:
                put(px, sx, sy, C_AURORA_LAVENDER if d % 2 == 0 else C_AURORA_VIOLET)

        # Dendritic snowflake crystal chevrons on the 6 primary arms at d = 9 and d = 14
        if is_primary:
            for branch_d, branch_len in ((9.0, 4), (14.0, 3)):
                bx0 = cx + ca * branch_d
                by0 = cy + sa * branch_d
                for side in (-1, 1):
                    ba = ang + side * (math.pi / 3.2)
                    for bd in range(1, branch_len + 1):
                        bx = bx0 + math.cos(ba) * bd
                        by = by0 + math.sin(ba) * bd
                        put(px, bx, by, C_DIAMOND_WHITE if bd == branch_len else C_FROST_LIGHT)
            draw_frost_diamond(px, cx + ca * 18.5, cy + sa * 18.5, 2, C_DIAMOND_WHITE, C_ABYSS_NAVY)

    # 4. Central Sovereign Hexagonal Diamond Rose-Window Core
    draw_frost_diamond(px, cx, cy, 6, C_SAPPHIRE_MID, C_ABYSS_NAVY)
    draw_frost_diamond(px, cx, cy, 4, C_FROST_CYAN, C_DIAMOND_WHITE)
    draw_8pt_snowflake_starcross(
        px,
        cx,
        cy,
        r_main=5.0,
        r_diag=3.0,
        col_core=C_WHITE,
        col_cardinal=C_DIAMOND_WHITE,
        col_diag=C_FROST_LIGHT,
        rot=-phase * 1.5,
    )

    return img


def build_row4_hoarfrost_crescent_starring(f):
    """
    Row 4: Hoarfrost Crescent Wave & 8-Point Snowflake Star-Ring (`y = 6..46, x = 6..46`, 30 frames):
    - Sweeping diamond-white, frost-cyan & aurora-violet pixel-art crescent wave with #0c1226 dark crystal border
      and 6 rotating 8-point Borealis Star-Crosses (`y = 6..46, x = 6..46`).
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0
    cx, cy = 26.0, 26.0

    # 1. Inner Sacred Borealis Frost Ring (r = 14.5, within x = 11..41, y = 11..41)
    ring_r = 14.5
    for s in range(48):
        a = (s / 48.0) * math.pi * 2.0 - phase
        rx = round(cx + math.cos(a) * ring_r)
        ry = round(cy + math.sin(a) * ring_r)
        put(px, rx, ry, C_FROST_LIGHT if s % 3 == 0 else (C_FROST_CYAN if s % 2 == 0 else C_SAPPHIRE_BRIGHT))

    # 2. Sweeping Diamond-Frost Crescent Slash Arc with #0c1226 Dark Crystal Edge (y = 6..46, x = 10..46)
    pulse = 0.85 + 0.15 * math.sin(phase * 2.0)
    lead_x_apex = 44.0 + math.sin(phase) * 1.0
    for dy in range(-18, 19):
        u = dy / 18.0
        wy = round(cy + dy)
        lead_x = int(round(lead_x_apex - (u * u) * 17.0))
        thick = max(2, int(round((1.0 - u * u * 0.75) * 8.0 * pulse)))
        put(px, min(47, lead_x + 1), wy, C_ABYSS_NAVY)
        put(px, max(5, lead_x - thick - 1), wy, C_ABYSS_NAVY)
        for t_off in range(thick + 1):
            wx = max(6, min(46, lead_x - t_off))
            if abs(dy) == 18:
                put(px, wx, wy, C_ABYSS_NAVY)
            elif t_off == 0:
                put(px, wx, wy, C_WHITE)
            elif t_off == 1:
                put(px, wx, wy, C_DIAMOND_WHITE)
            elif t_off <= 3:
                put(px, wx, wy, C_FROST_LIGHT if (dy + t_off + f) % 2 == 0 else C_FROST_CYAN)
            elif t_off <= 5:
                put(px, wx, wy, C_AURORA_LAVENDER if (dy + f) % 2 == 0 else C_GLACIER_MID)
            else:
                put(px, wx, wy, C_SAPPHIRE_MID if t_off < thick else C_SAPPHIRE_DARK)

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

    return img


def apply_pass11_star_mote_polish(logical_img, row_idx, f):
    """
    Pass #11 HD-2D Specular Star-Mote & Aura Polish on the 52x52 logical canvas BEFORE 4x NEAREST upscale:
    Ensures every single star glint and crystal pixel is a pure 4x4 16-bit pixel block!
    """
    px = logical_img.load()
    phase = (f / 30.0) * math.pi * 2.0
    for m_idx in range(3):
        ang = phase + m_idx * (math.pi * 2.0 / 3.0) + row_idx * 0.45
        rx = 15.0 + 2.0 * math.sin(phase * 2.0 + m_idx * 1.7 + row_idx)
        ry = 14.0 + 2.0 * math.cos(phase * 2.0 + m_idx * 1.3 + row_idx)
        cx = max(6, min(45, int(round(26.0 + math.cos(ang) * rx))))
        cy = max(6, min(45, int(round(26.0 + math.sin(ang) * ry))))
        ray_col = C_FROST_LIGHT if (m_idx + row_idx) % 2 == 0 else C_AURORA_LAVENDER
        put(px, cx, cy, C_WHITE)
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            put(px, cx + dx, cy + dy, ray_col)

    return logical_img.resize((CELL, CELL), Image.Resampling.NEAREST)


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
