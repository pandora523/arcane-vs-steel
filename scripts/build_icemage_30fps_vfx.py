#!/usr/bin/env python3
"""
Builds Glacia (IceMage - Cryo-Prism Sovereign) 30fps HD-2D Pixel-Art Skill & VFX Sprite Sheet (Pass 6 Upgrade):
- Output: assets/sprites/icemage_vfx.png (6240 x 1040, 5 rows x 30 cols at 208x208 per cell)
- Logical canvas per cell: 52x52 upscaled 4x NEAREST to 208x208 (strictly clamped inside 2 <= x <= 49, 2 <= y <= 49)
- ZERO dark navy (`#0c1226`) borders — uses luminous 6-tone crystalline shading + semi-transparent `C_FROST_AURA`
  and `C_AURORA_AURA` envelopes so `VFXManager.drawBloomedSprite` produces breathtaking HD-2D additive bloom!
- Rows:
  Row 0 (F00..F29): FACETED DIAMOND CRYO-PRISM COMET & DOUBLE-HELIX FROST WAVE (x = 6..46, y = 10..42)
  Row 1 (F00..F29): ROTATING HEXAGONAL SNOWFLAKE-PRISM LENS TURRET (x = 6..46, y = 6..46)
  Row 2 (F00..F29): ERUPTING CATHEDRAL GLACIER OBELISK SPIRE & SHATTER (y = 6..47, x = 10..42)
  Row 3 (F00..F29): ABSOLUTE ZERO: 12-POINT BOREALIS SNOWFLAKE ROSE-WINDOW MANDALA (y = 5..47, x = 5..47)
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

# Clean, luminous Diamond-White / Frost-Cyan / Glacier-Sapphire / Aurora-Violet palette (ZERO black/navy borders!)
C_WHITE = (255, 255, 255, 255)
C_DIAMOND_WHITE = (240, 249, 255, 255)
C_FROST_LIGHT = (186, 230, 253, 255)
C_FROST_BRIGHT = (125, 211, 252, 255)
C_FROST_CYAN = (56, 189, 248, 255)
C_GLACIER_MID = (22, 138, 198, 255)
C_GLACIER_DEEP = (14, 92, 142, 240)

C_AURORA_WHITE = (245, 243, 255, 255)
C_AURORA_LAVENDER = (196, 181, 253, 255)
C_AURORA_VIOLET = (139, 92, 246, 255)
C_AURORA_MINT = (110, 231, 183, 255)

C_SAPPHIRE_BRIGHT = (56, 116, 203, 255)
C_SAPPHIRE_MID = (37, 78, 148, 255)
C_SAPPHIRE_DARK = (26, 49, 102, 240)

C_FROST_AURA = (56, 189, 248, 145)
C_AURORA_AURA = (196, 181, 253, 140)


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


def draw_circle(px, cx, cy, r, col, steps=48):
    for s in range(steps):
        a = (s / float(steps)) * math.pi * 2.0
        put(px, cx + math.cos(a) * r, cy + math.sin(a) * r, col)


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
    Row 0: Faceted Diamond Cryo-Prism Comet & Double-Helix Frost Wave (`x = 6..46, y = 10..42`, 30 frames):
    - Multi-faceted hexagonal diamond crystal projectile facing +X with semi-transparent `C_FROST_AURA` halo,
      double-helix frost wake, orbiting vertical crystal ring, and leading 8-point Snowflake Star.
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0
    cy = 26

    # 1. Double-Helix Frost & Aurora Wake + Trailing Diamond Shards (x = 6..23, y = 13..39)
    for x in range(6, 24):
        u_x = (x - 6) / 18.0
        wave_amp = 6.5 * (1.0 - u_x * 0.45)
        y_h1 = cy + math.sin(phase * 2.0 - u_x * 4.5) * wave_amp
        y_h2 = cy - math.sin(phase * 2.0 - u_x * 4.5) * wave_amp
        put(px, x, y_h1, C_FROST_LIGHT if x % 2 == 0 else C_FROST_CYAN)
        put(px, x, y_h1 + 1, C_FROST_AURA)
        put(px, x, y_h2, C_AURORA_LAVENDER if x % 2 == 0 else C_AURORA_VIOLET)
        put(px, x, y_h2 - 1, C_AURORA_AURA)

    for trail_i in range(4):
        tx = 7 + ((trail_i * 4 - f) % 14)
        ty = cy + (trail_i - 1.5) * 4.5 + round(math.sin(phase + trail_i * 1.4) * 1.5)
        draw_frost_diamond(
            px,
            tx,
            ty,
            2 if trail_i % 2 == 0 else 1,
            C_FROST_LIGHT if trail_i % 2 == 0 else C_AURORA_LAVENDER,
            C_FROST_CYAN if trail_i % 2 == 0 else C_SAPPHIRE_BRIGHT,
        )

    # 2. Orbiting Vertical Hexagonal Frost Ring (back pass, x = 20..26, y = 12..40)
    for s in range(28):
        a = (s / 28.0) * math.pi * 2.0 + phase
        rx = round(23.0 + math.cos(a) * 3.0)
        ry = round(cy + math.sin(a) * 12.5)
        if math.cos(a) < 0.0:
            put(px, rx, ry, C_SAPPHIRE_MID if s % 2 == 0 else C_GLACIER_MID)

    # 3. Main Multi-Faceted Hexagonal Diamond Cryo-Prism Body (x = 16..45, y = 16..36)
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
                put(px, x, wy, C_FROST_AURA if dy < 0 else C_AURORA_AURA)
            elif ad == half_h:
                put(px, x, wy, C_DIAMOND_WHITE if dy < 0 else C_SAPPHIRE_BRIGHT)
            elif dy == 0:
                put(px, x, wy, C_WHITE)
            elif ad == 1:
                put(px, x, wy, C_DIAMOND_WHITE if (x + f) % 2 == 0 else C_FROST_LIGHT)
            elif (x - dy) % 6 == 0 or ad == half_h - 2:
                put(px, x, wy, C_FROST_BRIGHT if dy < 0 else C_SAPPHIRE_MID)
            elif dy < 0:
                put(px, x, wy, C_FROST_CYAN if ad <= 4 else C_GLACIER_MID)
            else:
                put(px, x, wy, C_AURORA_LAVENDER if ad <= 3 else C_SAPPHIRE_MID)

    # 4. Foreground Pass of Vertical Hexagonal Frost Ring & Leading 8-Point Snowflake Star
    for s in range(28):
        a = (s / 28.0) * math.pi * 2.0 + phase
        rx = round(23.0 + math.cos(a) * 3.0)
        ry = round(cy + math.sin(a) * 12.5)
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
    Row 1: Rotating Hexagonal Snowflake-Prism Lens Turret (`x = 6..46, y = 6..46`, 30 frames):
    - Glacia's deployable Hexagonal Crystalline Snowflake-Prism Turret with soft `C_FROST_AURA` /
      `C_AURORA_AURA` outer glow rings, 12 beveled crystal prism teeth, 6 dendritic snowflake spokes,
      and a counter-rotating inner hexagonal diamond core!
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0
    cx, cy = 26.0, 26.0

    # 1. Soft Frost-Cyan & Aurora-Lavender Radial Aura Rings
    draw_circle(px, cx, cy, 18.5, C_FROST_AURA, steps=64)
    draw_circle(px, cx, cy, 17.2, C_AURORA_AURA, steps=56)

    # 2. Concentric Beveled Crystalline Outer Rim (r = 14.5..16.8)
    for r_i, col in [
        (16.6, C_SAPPHIRE_BRIGHT),
        (15.8, C_FROST_LIGHT),
        (15.0, C_FROST_CYAN),
    ]:
        draw_circle(px, cx, cy, r_i, col, steps=60)

    # 3. 6 Faceted Hexagonal Snowflake-Prism Spokes & Dendritic Side-Branches
    for k in range(6):
        ang = phase + k * (math.pi / 3.0)
        ca, sa = math.cos(ang), math.sin(ang)
        px_n, py_n = -sa, ca

        for d in range(3, 17):
            sx = cx + ca * d
            sy = cy + sa * d
            half_w = 1
            for w_i in range(-half_w, half_w + 1):
                wx = sx + px_n * w_i
                wy = sy + py_n * w_i
                if w_i == 0:
                    col = C_WHITE if d <= 10 else C_DIAMOND_WHITE
                else:
                    col = C_FROST_CYAN if k % 2 == 0 else C_AURORA_LAVENDER
                put(px, wx, wy, col)

        # Dendritic snowflake side-branches at d = 10.5
        bx0 = cx + ca * 10.5
        by0 = cy + sa * 10.5
        for side in (-1, 1):
            ba = ang + side * (math.pi / 4.2)
            for bd in range(1, 5):
                bx = bx0 + math.cos(ba) * bd
                by = by0 + math.sin(ba) * bd
                put(px, bx, by, C_WHITE if bd == 4 else (C_FROST_LIGHT if bd >= 2 else C_FROST_CYAN))

        # Outer beveled diamond crystal node at r = 16.2
        draw_frost_diamond(
            px,
            cx + ca * 16.2,
            cy + sa * 16.2,
            2,
            C_DIAMOND_WHITE if k % 2 == 0 else C_AURORA_LAVENDER,
            C_FROST_CYAN if k % 2 == 0 else C_SAPPHIRE_BRIGHT,
        )

    # 4. Inner Counter-Rotating Hexagonal Prism Ring (r = 8.5)
    esc_rot = -phase * 1.5
    draw_circle(px, cx, cy, 8.2, C_AURORA_LAVENDER, steps=40)
    for e_i in range(6):
        ea = esc_rot + e_i * (math.pi / 3.0)
        draw_frost_diamond(
            px,
            cx + math.cos(ea) * 8.2,
            cy + math.sin(ea) * 8.2,
            1,
            C_WHITE,
            C_FROST_BRIGHT,
        )

    # 5. Glowing Diamond-White & Frost-Cyan Core Hub (r = 0..4.5)
    for dy in range(-4, 5):
        for dx in range(-4, 5):
            d = math.hypot(dx, dy)
            if d <= 1.8:
                put(px, cx + dx, cy + dy, C_WHITE)
            elif d <= 3.2:
                put(px, cx + dx, cy + dy, C_DIAMOND_WHITE if (dx + dy) % 2 == 0 else C_FROST_LIGHT)
            elif d <= 4.4:
                put(px, cx + dx, cy + dy, C_FROST_CYAN)

    draw_star(px, cx, cy, 5, C_WHITE, C_FROST_LIGHT, rot=-phase * 1.5)
    return img


def build_row2_glacial_permafrost_spire(f):
    """
    Row 2: Erupting 7-Spire Cathedral Glacier Crystal Cluster & Shatter (`y = 6..47, x = 8..44`, 30 frames):
    - Intricate 52x52 -> 4x NEAREST (208x208) multi-spire pixel-art crystal cluster with 6 angled flanking
      diamond-cut crystal shards, 1 central jagged spire with stepped internal chevron facets, dark-sapphire
      pixel facet seams, internal star-glint refraction windows, and 12-shard snowflake shatter on `F22..F29`.
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    cx = 26
    gy = 45
    phase = (f / 30.0) * math.pi * 2.0

    # 1. Persistent Glowing Perspective Snowflake Ground Seal (y = 43..47, x = 9..43)
    seal_scale = ((f + 1) / 4.0) if f <= 3 else (1.0 if f <= 21 else max(0.25, 1.0 - (f - 21) / 9.0))
    rx_seal = int(round(16.0 * min(1.0, seal_scale)))
    for dx in range(-rx_seal - 1, rx_seal + 2):
        wx = max(8, min(44, cx + dx))
        ad = abs(dx)
        if ad == rx_seal + 1:
            put(px, wx, gy, C_FROST_AURA)
        else:
            put(px, wx, gy + 1, C_SAPPHIRE_DARK if ad % 2 == 0 else C_FROST_AURA)
            put(px, wx, gy, C_WHITE if ad % 4 == 0 else (C_FROST_LIGHT if ad % 2 == 0 else C_FROST_CYAN))
            if ad <= rx_seal - 2 and ad % 2 == 0:
                put(px, wx, gy - 1, C_DIAMOND_WHITE if ad % 4 == 0 else C_AURORA_LAVENDER)

    if f <= 21:
        grow = ((f + 1) / 5.0) if f <= 4 else 1.0

        # 2. 6 Angled Flanking Multi-Faceted Crystal Spires (Outer, Mid, Inner pairs)
        # (bx_off, tilt_dx, max_sh, base_w, tint_mode)
        flanking_spires = [
            (-11.0, -4.5, 14.0, 2.2, 0),
            (+11.0, +4.5, 14.0, 2.2, 1),
            (-7.5, -3.5, 22.0, 2.8, 1),
            (+7.5, +3.5, 22.0, 2.8, 0),
            (-3.8, -2.2, 29.0, 3.0, 0),
            (+3.8, +2.2, 29.0, 3.0, 1),
        ]
        for bx_off, tilt_dx, max_sh, base_w, tint_mode in flanking_spires:
            sh = int(round(max_sh * grow))
            for h in range(sh + 1):
                u_h = h / float(max(1, sh))
                sy = gy - h
                scx = cx + bx_off + tilt_dx * u_h
                # Stepped diamond taper: widens slightly at 30% height, then tapers to a 1px needle tip
                taper = (0.75 + 0.25 * (u_h / 0.3)) if u_h < 0.3 else (1.0 - (u_h - 0.3) / 0.7)
                hw = max(0, int(round(base_w * taper)))
                for dx in range(-hw - 1, hw + 2):
                    wx = max(7.0, min(45.0, scx + dx))
                    ad = abs(dx)
                    chevron = (h + ad * 2) % 6 == 0
                    if ad == hw + 1:
                        if h % 2 == 0:
                            put(px, wx, sy, C_FROST_AURA if tint_mode == 0 else C_AURORA_AURA)
                        continue
                    elif ad == hw:
                        # Crisp dark-sapphire outer crystal edge on shadow side, diamond-white on lit side
                        col = C_DIAMOND_WHITE if (dx < 0 or u_h > 0.72) else C_SAPPHIRE_DARK
                    elif dx == 0:
                        col = C_WHITE if (u_h > 0.45 or chevron) else C_FROST_LIGHT
                    elif chevron:
                        col = C_WHITE if dx < 0 else C_FROST_BRIGHT
                    elif dx < 0:
                        col = C_FROST_BRIGHT if tint_mode == 0 else C_AURORA_LAVENDER
                    else:
                        col = C_GLACIER_MID if tint_mode == 0 else C_AURORA_VIOLET
                    put(px, wx, sy, col)
            # Crisp white pixel tip glint on each secondary spire
            tip_x = max(7.0, min(45.0, cx + bx_off + tilt_dx))
            put(px, tip_x, max(6, gy - sh - 1), C_WHITE)

        # 3. Central Jagged Diamond-Cut Sovereign Spire (y = 7..45) with stepped internal facets
        main_h = int(round(37.0 * grow))
        for h in range(main_h + 1):
            u_h = h / float(max(1, main_h))
            sy = max(6, gy - h)
            # Multi-tier stepped crystal silhouette (not a flat pentagon!)
            if u_h < 0.28:
                profile = 0.65 + 0.35 * (u_h / 0.28)
            elif u_h < 0.58:
                profile = 1.0 - 0.28 * ((u_h - 0.28) / 0.30) + (0.08 if (h % 5 == 0) else 0.0)
            else:
                profile = 0.72 * (1.0 - (u_h - 0.58) / 0.42)
            hw = max(0, int(round(5.2 * profile)))
            for dx in range(-hw - 1, hw + 2):
                ad = abs(dx)
                chevron_up = (h - ad * 2) % 6 == 0
                chevron_dn = (h + ad * 2) % 7 == 0
                if ad == hw + 1:
                    if h % 3 == 0:
                        put(px, cx + dx, sy, C_FROST_AURA)
                    continue
                elif ad == hw:
                    col = C_WHITE if (dx < 0 and u_h > 0.35) else (C_FROST_BRIGHT if dx < 0 else C_SAPPHIRE_DARK)
                elif dx == 0:
                    col = C_WHITE if (h + f) % 4 != 0 else C_FROST_BRIGHT
                elif chevron_up:
                    col = C_WHITE if dx < 0 else C_DIAMOND_WHITE
                elif chevron_dn:
                    col = C_SAPPHIRE_BRIGHT if dx > 0 else C_FROST_CYAN
                elif ad == 1 and 0.25 < u_h < 0.68 and (h + f) % 3 == 0:
                    # Shimmering internal Borealis prism core
                    col = C_AURORA_LAVENDER if dx > 0 else C_DIAMOND_WHITE
                elif dx < 0:
                    col = C_FROST_LIGHT if ad == 1 else C_FROST_CYAN
                else:
                    col = C_AURORA_VIOLET if (h % 4 == 0 and ad == 2) else (C_GLACIER_MID if ad <= 2 else C_SAPPHIRE_MID)
                put(px, cx + dx, sy, col)

        put(px, cx, max(6, gy - main_h - 1), C_WHITE)

        # 4. Orbiting 4x4 Pixel Frost Diamonds & Apex Snowflake Star
        if f >= 4:
            draw_8pt_snowflake_starcross(
                px,
                cx,
                max(8, gy - main_h + 2),
                r_main=4.0,
                r_diag=2.5,
                col_core=C_WHITE,
                col_cardinal=C_DIAMOND_WHITE,
                col_diag=C_FROST_CYAN,
                rot=phase,
            )
            for orb_i in range(3):
                oa = phase + orb_i * (math.pi * 2.0 / 3.0)
                ox = cx + math.cos(oa) * 12.5
                oy = gy - 18.0 + math.sin(oa) * 5.0
                draw_frost_diamond(
                    px,
                    ox,
                    oy,
                    1,
                    C_WHITE,
                    C_FROST_CYAN if orb_i % 2 == 0 else C_AURORA_LAVENDER,
                )
    else:
        # F22..F29: Explosive Crystalline Glacier Shatter into 12 Snowflake Stars & Faceted Shards
        u = (f - 22) / 7.0
        for shard_i in range(12):
            ang = -math.pi * 0.94 + (shard_i / 11.0) * math.pi * 0.88
            base_y = gy - 8 - (shard_i % 4) * 7
            dist = 3.5 + u * 13.5
            sx = max(9.0, min(43.0, cx + math.cos(ang) * dist))
            sy = max(8.0, min(44.0, base_y + math.sin(ang) * dist * 0.55 + u * u * 4.5))
            if shard_i % 2 == 0:
                draw_8pt_snowflake_starcross(
                    px,
                    sx,
                    sy,
                    r_main=3.0 if u < 0.6 else 2.0,
                    r_diag=2.0 if u < 0.6 else 1.0,
                    col_core=C_WHITE,
                    col_cardinal=C_FROST_LIGHT,
                    col_diag=C_AURORA_LAVENDER,
                    rot=phase + shard_i,
                )
            else:
                draw_frost_diamond(
                    px,
                    sx,
                    sy,
                    2 if u < 0.65 else 1,
                    C_DIAMOND_WHITE,
                    C_FROST_CYAN if shard_i % 3 == 0 else C_AURORA_VIOLET,
                )

    return img


def build_row3_borealis_cathedral_seal(f):
    """
    Row 3: Absolute Zero: 12-Point Borealis Snowflake Rose-Window Mandala (`y = 5..47, x = 5..47`, 30 frames):
    - Grand 12-Pointed Geometric Snowflake Rose-Window Mandala & Crystalline Astrolabe with soft `C_FROST_AURA`
      and `C_AURORA_AURA` rings, counter-rotating hexagonal crystal lattice, 6 dendritic snowflake arms,
      and a blazing Absolute-Zero Star Core!
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0
    cx, cy = 26.0, 26.0

    # 1. Outer Aura & Rotating Dodecagonal Borealis Snowflake Cathedral Rim (r = 18.0..19.5)
    draw_circle(px, cx, cy, 19.5, C_FROST_AURA, steps=72)
    draw_circle(px, cx, cy, 18.5, C_SAPPHIRE_BRIGHT, steps=64)
    draw_circle(px, cx, cy, 17.5, C_FROST_LIGHT, steps=64)

    # 2. Inner Counter-Rotating Hexagonal Crystal Lattice Ring (r = 11.8)
    for k in range(6):
        a0 = -phase + k * (math.pi / 3.0)
        a1 = -phase + (k + 1) * (math.pi / 3.0)
        x0, y0 = cx + math.cos(a0) * 11.8, cy + math.sin(a0) * 11.8
        x1, y1 = cx + math.cos(a1) * 11.8, cy + math.sin(a1) * 11.8
        draw_line(px, x0, y0, x1, y1, C_AURORA_LAVENDER if k % 2 == 0 else C_FROST_BRIGHT)

    # 3. 12 Geometric Rose-Window Spokes (6 Primary Dendritic Snowflake Arms + 6 Secondary Aurora Spokes)
    for k in range(12):
        ang = phase * 0.5 + k * (math.pi / 6.0)
        ca, sa = math.cos(ang), math.sin(ang)
        px_n, py_n = -sa, ca
        is_primary = k % 2 == 0
        max_d = 18 if is_primary else 15

        for d in range(4, max_d + 1):
            sx = cx + ca * d
            sy = cy + sa * d
            if is_primary:
                for w_i in (-1, 0, 1):
                    col = C_WHITE if w_i == 0 else C_FROST_CYAN
                    put(px, sx + px_n * w_i, sy + py_n * w_i, col)
            else:
                put(px, sx, sy, C_AURORA_LAVENDER if d % 2 == 0 else C_AURORA_VIOLET)

        if is_primary:
            for branch_d, branch_len in ((9.0, 4), (14.0, 3)):
                bx0 = cx + ca * branch_d
                by0 = cy + sa * branch_d
                for side in (-1, 1):
                    ba = ang + side * (math.pi / 3.2)
                    for bd in range(1, branch_len + 1):
                        bx = bx0 + math.cos(ba) * bd
                        by = by0 + math.sin(ba) * bd
                        put(px, bx, by, C_WHITE if bd == branch_len else C_FROST_LIGHT)
            draw_frost_diamond(px, cx + ca * 18.0, cy + sa * 18.0, 2, C_DIAMOND_WHITE, C_FROST_CYAN)

    # 4. Central Sovereign Hexagonal Diamond Rose-Window Core
    draw_frost_diamond(px, cx, cy, 6, C_SAPPHIRE_BRIGHT, C_FROST_LIGHT)
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
    - Sweeping 6-tone diamond-white, frost-cyan & aurora-lavender pixel-art crescent wave with `C_FROST_AURA`
      and 6 rotating 8-point Borealis Star-Crosses (`y = 6..46, x = 6..46`).
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0
    cx, cy = 26.0, 26.0

    # 1. Inner Sacred Borealis Frost Ring (r = 14.5, within x = 11..41, y = 11..41)
    ring_r = 14.5
    draw_circle(px, cx, cy, ring_r + 1.0, C_FROST_AURA, steps=56)
    for s in range(48):
        a = (s / 48.0) * math.pi * 2.0 - phase
        rx = round(cx + math.cos(a) * ring_r)
        ry = round(cy + math.sin(a) * ring_r)
        put(px, rx, ry, C_FROST_LIGHT if s % 3 == 0 else (C_FROST_CYAN if s % 2 == 0 else C_AURORA_LAVENDER))

    # 2. Sweeping 6-Tone Diamond-Frost Crescent Slash Arc (y = 6..46, x = 10..46)
    pulse = 0.85 + 0.15 * math.sin(phase * 2.0)
    lead_x_apex = 44.0 + math.sin(phase) * 1.0
    for dy in range(-18, 19):
        u = dy / 18.0
        wy = round(cy + dy)
        lead_x = int(round(lead_x_apex - (u * u) * 17.0))
        thick = max(2, int(round((1.0 - u * u * 0.75) * 8.0 * pulse)))
        put(px, min(47, lead_x + 1), wy, C_FROST_AURA)
        put(px, max(5, lead_x - thick - 1), wy, C_AURORA_AURA)
        for t_off in range(thick + 1):
            wx = max(6, min(46, lead_x - t_off))
            if abs(dy) == 18:
                put(px, wx, wy, C_FROST_LIGHT)
            elif t_off == 0:
                put(px, wx, wy, C_WHITE)
            elif t_off == 1:
                put(px, wx, wy, C_DIAMOND_WHITE)
            elif t_off <= 3:
                put(px, wx, wy, C_FROST_LIGHT if (dy + t_off + f) % 2 == 0 else C_FROST_CYAN)
            elif t_off <= 5:
                put(px, wx, wy, C_AURORA_LAVENDER if (dy + f) % 2 == 0 else C_GLACIER_MID)
            else:
                put(px, wx, wy, C_SAPPHIRE_BRIGHT if t_off < thick else C_SAPPHIRE_MID)

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
        ("ROW 0: FACETED DIAMOND CRYO-PRISM COMET & FROST WAVE (30 FRAMES)", build_row0_cryo_lance_frost_wave),
        ("ROW 1: ROTATING HEXAGONAL SNOWFLAKE-PRISM LENS TURRET (30 FRAMES)", build_row1_cryo_prism_lens_turret),
        ("ROW 2: ERUPTING CATHEDRAL GLACIER OBELISK SPIRE (30 FRAMES)", build_row2_glacial_permafrost_spire),
        ("ROW 3: ABSOLUTE ZERO: 12-POINT BOREALIS CATHEDRAL SEAL (30 FRAMES)", build_row3_borealis_cathedral_seal),
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
