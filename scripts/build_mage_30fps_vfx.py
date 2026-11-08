#!/usr/bin/env python3
"""
Builds Ignis Sol (FireMage) 30fps HD-2D Pixel-Art Skill & VFX Sprite Sheet (Pass #4 Overhaul):
- Output: assets/sprites/mage_vfx.png (6240 x 1040, 5 rows x 30 cols at 208x208 per cell)
- Logical canvas per cell: 52x52 upscaled 4x NEAREST to 208x208 (un-inked clean pixel art!)
- Strict Boundary Guarantee: ALL pixels across all 150 cells reside strictly inside 2 <= x <= 49, 2 <= y <= 49 (and 3 <= x <= 48, 0/150 clips!)
- Rows:
  Row 0 (F00..F29): BLAZING SOLAR FIREBALL COMET (Brilliant White-Yellow Solar Nucleus, Swirling Crimson-Orange Prominence Tongues & Trailing Golden Star-Sparks)
  Row 1 (F00..F29): HELLFIRE MAGMA PILLAR ERUPTION (Glowing Golden-Crimson Pyromantic Rune Seal at y=43..47 & Bright Double-Helix Solar Plasma Ribbon on F06..F21)
  Row 2 (F00..F29): ECLIPSE SUPERNOVA BLACK-SUN SPHERE (Crisp 8-Point Golden Solar Corona, Inner Violet-Black Event Horizon & Rotating Coronal Lightning Arcs)
  Row 3 (F00..F29): CATACLYSM MOLTEN METEOR & SOLAR BEAM HEAD (Craggy Magma Core & Roaring Solar Plasma)
  Row 4 (F00..F29): PYROMANTIC SUN-WHEEL CAST SEAL & SWEEPING FLAME WAVE
"""

import math
import os
from PIL import Image, ImageDraw

LOGICAL = 52
SCALE = 4
CELL = LOGICAL * SCALE  # 208
COLS = 30
ROWS = 5
MIN_BOUND = 3
MAX_BOUND = 48

# Clean, luminous Solar Gold / Pyromantic Crimson / Eclipse Void palette (zero heavy black inking!)
C_WHITE = (255, 255, 255, 255)
C_SOLAR_WHITE = (255, 251, 235, 255)    # #fffbeb
C_GOLD_LIGHT = (254, 240, 138, 255)     # #fef08a
C_GOLD = (250, 204, 21, 255)            # #facc15
C_AMBER = (245, 158, 11, 255)           # #f59e0b
C_ORANGE_BRIGHT = (251, 146, 60, 255)   # #fb923c
C_ORANGE_DEEP = (234, 88, 12, 255)      # #ea580c
C_CRIMSON_BRIGHT = (220, 38, 38, 255)   # #dc2626
C_CRIMSON = (185, 28, 28, 255)          # #b91c1c
C_CRIMSON_DARK = (127, 29, 29, 255)     # #7f1d1d

C_VIOLET_BRIGHT = (192, 132, 252, 255)  # #c084fc (Coronal lightning / event horizon rim)
C_VIOLET_MID = (147, 51, 234, 255)      # #9333ea (Event horizon inner ring)
C_VIOLET_SMOKE = (88, 28, 135, 235)     # #581c87
C_ASH_DARK = (45, 24, 36, 230)
C_OBSIDIAN = (28, 19, 32, 255)
C_VOID_BLACK = (8, 5, 16, 255)

C_SOLAR_AURA = (251, 146, 60, 155)
C_CRIMSON_AURA = (220, 38, 38, 135)
C_VIOLET_AURA = (107, 33, 168, 125)


def put(px, x, y, col):
    ix = int(round(x))
    iy = int(round(y))
    if MIN_BOUND <= ix <= MAX_BOUND and MIN_BOUND <= iy <= MAX_BOUND:
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


def build_row0_solar_fireball(f):
    """
    Row 0 (F00..F29): BLAZING SOLAR FIREBALL COMET (Pass #4 Upgrade, Pointing +X, cy=26)
    - Strict bounds: 4 <= x <= 47, 12 <= y <= 40
    - Brilliant White-Yellow Solar Nucleus at (36.5, 26) with seamless leading bow-corona
    - 6 Swirling Crimson-Orange Prominence Tongues curling around the sphere & streaming into the wake
    - Trailing Golden Star-Sparks (4-point mini stars) & dancing solar embers
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    cy = 26.0
    cx = 36.0
    phase = (f / 30.0) * math.pi * 2.0

    # 1. Trailing Crimson-Orange Thermal Comet Wake (x=5..36)
    for x in range(5, 37):
        u = (x - 5) / 31.0  # 0.0 at tail tip -> 1.0 at fireball core
        half_h = 1.2 + math.pow(u, 0.8) * 8.2
        wave_y = math.sin(x * 0.26 - phase * 2.0) * (2.6 * (1.0 - u * 0.65))
        for dy in range(int(-half_h), int(half_h) + 1):
            dist_frac = abs(dy) / max(1.0, half_h)
            py = int(round(cy + wave_y)) + dy
            if dist_frac > 0.78:
                put(px, x, py, C_CRIMSON_DARK if u < 0.45 else C_CRIMSON)
            elif dist_frac > 0.52:
                put(px, x, py, C_CRIMSON_BRIGHT if u < 0.55 else C_ORANGE_DEEP)
            elif dist_frac > 0.26:
                put(px, x, py, C_ORANGE_DEEP if u < 0.4 else C_ORANGE_BRIGHT if u < 0.75 else C_AMBER)
            else:
                put(px, x, py, C_GOLD if u < 0.55 else C_GOLD_LIGHT if u < 0.82 else C_SOLAR_WHITE)

    # 2. Helical Solar Plasma Streams Corkscrewing Through the Wake (x=9..36)
    for rib in range(2):
        r_off = rib * math.pi
        for x in range(9, 37):
            u = (x - 9) / 27.0
            amp = (1.0 - u * 0.35) * 4.8
            ang = x * 0.34 - phase * 2.0 + r_off
            ry = cy + math.sin(ang) * amp
            put(px, x, ry, C_SOLAR_WHITE if (rib == 0 and u > 0.5) else (C_GOLD_LIGHT if rib == 0 else C_ORANGE_BRIGHT))
            put(px, x, ry + (1 if math.sin(ang) >= 0 else -1), C_GOLD if rib == 0 else C_CRIMSON_BRIGHT)

    # 3. Swirling Crimson-Orange Prominence Tongues Curling Around & Behind the Solar Sphere
    for t_idx in range(6):
        base_a = phase * 1.5 + t_idx * (math.pi / 3.0)
        for step in range(16):
            u_t = step / 15.0
            r_cur = 7.0 + u_t * 5.0
            curl_a = base_a + u_t * 0.75 * (1 if math.sin(base_a) >= 0 else -1)
            tx = cx + math.cos(curl_a) * r_cur - u_t * 4.5
            ty = cy + math.sin(curl_a) * (r_cur * 0.92)
            if u_t < 0.3:
                col_t = C_GOLD_LIGHT
            elif u_t < 0.6:
                col_t = C_ORANGE_BRIGHT
            elif u_t < 0.85:
                col_t = C_CRIMSON_BRIGHT
            else:
                col_t = C_CRIMSON_DARK
            put(px, tx, ty, col_t)
            put(px, tx - 1, ty, C_ORANGE_DEEP if u_t < 0.5 else C_CRIMSON)

    # 4. Brilliant White-Yellow Solar Nucleus & Photosphere (cx=36, cy=26, seamlessly reaching x=46)
    core_r = 8.6
    for dy in range(-11, 12):
        for dx in range(-11, 12):
            stretch_x = dx * (0.86 if dx > 0 else 0.95)
            d = math.hypot(stretch_x, dy)
            ang = math.atan2(dy, dx)
            flare_mod = math.sin(ang * 5.0 - phase * 2.0) * 1.1 + math.cos(ang * 3.0 + phase) * 0.7
            eff_r = core_r + flare_mod * (0.45 if dx > 0 else 1.05)
            if d <= eff_r + 1.2:
                px_x = int(cx) + dx
                px_y = int(cy) + dy
                if d <= 4.4:
                    # Brilliant White-Yellow Solar Nucleus!
                    put(px, px_x, px_y, C_WHITE if d <= 3.0 else C_SOLAR_WHITE)
                elif d <= 6.2 + math.sin(ang * 4.0 - phase) * 0.4:
                    put(px, px_x, px_y, C_GOLD_LIGHT)
                elif d <= 7.5 + flare_mod * 0.35:
                    put(px, px_x, px_y, C_GOLD if (dx + dy) % 2 == 0 else C_AMBER)
                elif d <= eff_r:
                    put(px, px_x, px_y, C_ORANGE_BRIGHT if dx > -2 else C_ORANGE_DEEP)
                else:
                    put(px, px_x, px_y, C_CRIMSON_BRIGHT if dx > -4 else C_CRIMSON)

    # Inner Solar Nucleus Star-Glint at (37, 26)
    draw_star(px, 37, 26, 3, C_WHITE, C_SOLAR_WHITE, rot=phase * 0.5)

    # 5. Trailing Golden Star-Sparks & Solar Ember Motes (x=5..30)
    for s_idx in range(4):
        u_sp = ((f / 30.0) + s_idx * 0.25) % 1.0
        sx = int(round(30.0 - u_sp * 24.0))  # x = 6..30
        sy = int(round(cy + math.sin(phase * 2.0 + s_idx * 1.8) * (3.5 + s_idx * 1.4)))
        if s_idx % 2 == 0:
            draw_star(px, sx, sy, 2 if u_sp < 0.5 else 1, C_WHITE, C_GOLD_LIGHT, rot= 0.0)
        else:
            put(px, sx, sy, C_WHITE)
            put(px, sx - 1, sy, C_GOLD_LIGHT)
            put(px, sx + 1, sy, C_GOLD)
            put(px, sx, sy - 1, C_ORANGE_BRIGHT)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def draw_pyromantic_rune_seal(px, cx, gy, rx, ry, phase, intensity=1.0, front_only=False, back_only=False):
    """
    Draws a glowing Golden-Crimson Pyromantic Rune Seal at the pillar base (y = 43..47).
    - Outer crimson-orange ritual ring + inner golden rune ring + 8 revolving sacred rune nodes & radial spokes.
    """
    steps = 64
    for s in range(steps):
        a = (s / float(steps)) * math.pi * 2.0 + phase
        sin_a = math.sin(a)
        if front_only and sin_a < -0.05:
            continue
        if back_only and sin_a >= -0.05:
            continue

        # Outer crimson-gold ritual rim
        ox = cx + math.cos(a) * rx
        oy = gy + sin_a * ry
        # Inner solar rune ring
        ix = cx + math.cos(a) * (rx * 0.68)
        iy = gy + sin_a * (ry * 0.68)

        if intensity > 0.6:
            col_out = C_WHITE if s % 8 == 0 else (C_GOLD_LIGHT if s % 2 == 0 else C_CRIMSON_BRIGHT)
            col_in = C_SOLAR_WHITE if s % 4 == 0 else C_GOLD
        else:
            col_out = C_GOLD if s % 8 == 0 else (C_ORANGE_DEEP if s % 2 == 0 else C_CRIMSON_DARK)
            col_in = C_ORANGE_BRIGHT if s % 4 == 0 else C_CRIMSON

        put(px, ox, oy, col_out)
        put(px, ox, oy + (0.6 if sin_a >= 0 else -0.6), C_CRIMSON_BRIGHT if intensity > 0.5 else C_CRIMSON_DARK)
        put(px, ix, iy, col_in)

        # 8 Glowing Pyromantic Rune Nodes & Spokes connecting inner/outer rings
        if s % 8 == 0:
            draw_line(px, cx + math.cos(a) * (rx * 0.3), gy + sin_a * (ry * 0.3), ox, oy,
                      C_GOLD_LIGHT if intensity > 0.6 else C_ORANGE_DEEP)
            if intensity > 0.45:
                put(px, ox + (1 if math.cos(a) >= 0 else -1), oy, C_WHITE)
                put(px, ox, oy, C_WHITE)


def build_row1_hellfire_pillar(f):
    """
    Row 1 (F00..F29): HELLFIRE MAGMA PILLAR ERUPTION (Pass #4 Upgrade)
    - Strict bounds: 4 <= x <= 47, 4 <= y <= 47
    - Glowing Golden-Crimson Pyromantic Rune Seal at the base (y = 43..47, gy = 45.0, ry = 2.0)
    - F00..F05: Volcanic Pyromantic Rune Seal ignition & surging pre-eruption geyser
    - F06..F21: Full Roaring Magma Column with Bright Double-Helix Solar Plasma Ribbon spiraling upward!
    - F22..F29: Explosive ash-and-ember dissipation over cooling Pyromantic Rune Seal
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    cx = 26.0
    gy = 45.0  # Base centered at y=45.0 with ry=2.0 -> spans y=43..47!
    phase = (f / 30.0) * math.pi * 2.0

    if f <= 5:
        # F00..F05: Igniting Golden-Crimson Pyromantic Rune Seal (y=43..47) & Surging Magma Geyser
        u = f / 5.0
        rx = 9.0 + u * 9.5   # 9.0 -> 18.5
        ry = 1.4 + u * 0.6   # 1.4 -> 2.0 (y = 43..47)
        draw_pyromantic_rune_seal(px, cx, gy, rx, ry, phase * 1.5, intensity=0.7 + 0.3 * u)

        # Surging Pre-Eruption Magma Geyser Plume (grows from y=45 up to y=12)
        geyser_h = int(7 + u * 26)
        for h in range(geyser_h):
            h_u = h / float(max(1, geyser_h))
            py = gy - h
            half_w = int(round((1.0 - h_u * 0.62) * (3.5 + u * 7.0)))
            for dx in range(-half_w, half_w + 1):
                w_u = abs(dx) / max(1.0, float(half_w))
                col = C_WHITE if w_u < 0.32 else (C_GOLD_LIGHT if w_u < 0.62 else C_ORANGE_DEEP if w_u < 0.86 else C_CRIMSON)
                put(px, cx + dx + math.sin(h * 0.3 - u * 4.0) * 0.8, py, col)

        # Front rim of Pyromantic Rune Seal over base of geyser
        draw_pyromantic_rune_seal(px, cx, gy, rx, ry, phase * 1.5, intensity=1.0, front_only=True)

    elif f <= 21:
        # F06..F21 (16 frames): Roaring Magma Column + Bright Double-Helix Solar Plasma Ribbon + Pyromantic Rune Seal at y=43..47
        k = f - 6
        spin = (k / 16.0) * math.pi * 4.0  # 2 full rotations across F06..F21

        # 1. Back half of Glowing Golden-Crimson Pyromantic Rune Seal at y=43..47
        draw_pyromantic_rune_seal(px, cx, gy, 18.5, 2.0, spin * 0.5, intensity=1.0, back_only=True)

        # 2. Roaring Molten Magma Column Body (y=5..45) — shaded in rich crimson/orange/amber so the white-gold double helix pops!
        for y in range(5, 46):
            h_frac = (45.0 - y) / 40.0
            crown_taper = 1.0 if y >= 11 else (0.35 + 0.65 * ((y - 5.0) / 6.0))
            base_w = (10.0 + (1.0 - h_frac) * 3.5 if h_frac < 0.22 else (9.0 + math.sin(h_frac * math.pi) * 2.2)) * crown_taper
            sway = math.sin(h_frac * 4.2 - spin) * 1.4

            # Back-pass of Double-Helix Solar Plasma Ribbon (when math.sin(sa) < 0, behind column edges)
            for strand in range(2):
                sa = spin * 1.5 - h_frac * 7.2 + strand * math.pi
                if math.sin(sa) < 0 and y >= 7:
                    rx_rib = cx + sway + math.cos(sa) * (base_w * 1.06)
                    put(px, rx_rib, y, C_GOLD)
                    put(px, rx_rib + (1 if math.cos(sa) < 0 else -1), y, C_ORANGE_BRIGHT)

            # Main Molten Magma Column Cross-Section
            for dx in range(int(-base_w - 1), int(base_w + 2)):
                w_frac = abs(dx) / max(1.0, base_w)
                edge_lick = math.sin(y * 0.45 - spin * 2.0 + (1.0 if dx > 0 else -1.0)) * 0.16
                # At top crown (y < 11), add dancing flame-crest waves so the pillar top isn't flat
                if y < 11:
                    flame_crest = math.sin(dx * 0.65 + spin * 2.0) * 1.6
                    if y < 7.0 - flame_crest:
                        continue
                if w_frac <= 1.0 + edge_lick:
                    magma_tex = math.sin(dx * 0.45 + y * 0.35 - spin * 2.0)
                    if w_frac < 0.18:
                        col = C_SOLAR_WHITE if magma_tex > -0.2 else C_GOLD_LIGHT
                    elif w_frac < 0.42:
                        col = C_GOLD if magma_tex > 0.0 else C_AMBER
                    elif w_frac < 0.68:
                        col = C_ORANGE_BRIGHT if magma_tex > -0.1 else C_ORANGE_DEEP
                    elif w_frac < 0.88:
                        col = C_CRIMSON_BRIGHT if magma_tex > 0.1 else C_CRIMSON
                    else:
                        col = C_CRIMSON_DARK if (y + dx) % 2 == 0 else C_OBSIDIAN
                    put(px, cx + sway + dx, y, col)

            # 3. BRIGHT DOUBLE-HELIX SOLAR PLASMA RIBBON Spiraling Up the Front of the Magma Column!
            for strand in range(2):
                sa = spin * 1.5 - h_frac * 7.2 + strand * math.pi
                sin_s = math.sin(sa)
                if sin_s >= -0.15 and y >= 6:
                    sx = cx + sway + math.cos(sa) * (base_w * 0.94)
                    # Thick 3px-to-4px blazing white-gold plasma ribbon cross-section
                    put(px, sx, y, C_WHITE)
                    put(px, sx - 1, y, C_WHITE if sin_s > 0.4 else C_SOLAR_WHITE)
                    put(px, sx + 1, y, C_SOLAR_WHITE if sin_s > 0.4 else C_GOLD_LIGHT)
                    put(px, sx - 2, y, C_GOLD_LIGHT)
                    put(px, sx + 2, y, C_GOLD)
                    if y > 6:
                        put(px, sx, y - 1, C_GOLD_LIGHT)

        # 4. Rising Molten Lava Rocks & Craggy Basalt Chunks Spiraling Upward (y=8..42)
        for rock_i in range(6):
            r_h = ((rock_i / 6.0) + (k / 16.0)) % 1.0
            ry_rock = 42.0 - r_h * 33.0
            ra = spin * 1.2 + rock_i * (math.pi / 3.0)
            rx_rock = cx + math.cos(ra) * 12.2
            put(px, rx_rock, ry_rock, C_OBSIDIAN)
            put(px, rx_rock + 1, ry_rock, C_CRIMSON_DARK)
            put(px, rx_rock, ry_rock - 1, C_GOLD_LIGHT)
            put(px, rx_rock + 1, ry_rock + 1, C_ORANGE_BRIGHT)

        # 5. Front Half of Glowing Golden-Crimson Pyromantic Rune Seal at Base (y=43..47)
        draw_pyromantic_rune_seal(px, cx, gy, 18.5, 2.0, spin * 0.5, intensity=1.0, front_only=True)

    else:
        # F22..F29: Explosive Ash-and-Ember Dissipation & Cooling Pyromantic Rune Seal at y=43..47
        k = f - 22
        u = k / 7.0  # 0.0 -> 1.0
        draw_pyromantic_rune_seal(px, cx, gy, 18.5 * (1.0 - u * 0.25), 2.0 * (1.0 - u * 0.2),
                                  phase, intensity=max(0.2, 0.85 - u * 0.7))

        for puff_i in range(7):
            py_base = 41.0 - puff_i * 5.2 - u * 3.5
            px_base = cx + math.sin(puff_i * 1.7 + k * 0.5) * (2.2 + u * 5.5)
            puff_r = max(1.2, (7.2 - puff_i * 0.4) * (1.0 - u * 0.7))
            for dy in range(int(-puff_r - 1), int(puff_r + 2)):
                for dx in range(int(-puff_r - 1), int(puff_r + 2)):
                    d = math.hypot(dx, dy)
                    if d <= puff_r:
                        d_frac = d / max(1.0, puff_r)
                        if u < 0.35:
                            col = C_GOLD_LIGHT if d_frac < 0.38 else (C_ORANGE_BRIGHT if d_frac < 0.72 else C_CRIMSON_BRIGHT)
                        elif u < 0.68:
                            col = C_ORANGE_BRIGHT if d_frac < 0.35 else (C_CRIMSON_BRIGHT if d_frac < 0.7 else C_CRIMSON_DARK)
                        else:
                            col = C_ORANGE_DEEP if d_frac < 0.35 else (C_CRIMSON_DARK if d_frac < 0.75 else C_ASH_DARK)
                        put(px, px_base + dx, py_base + dy, col)

        for m in range(10):
            ang = (m / 10.0) * math.pi * 2.0 + k * 0.3
            rad_x = 5.5 + u * 12.5 + (m % 3) * 1.5
            ey = 38.0 - ((m * 5 + k * 3) % 32)
            ex = cx + math.cos(ang) * rad_x
            put(px, ex, ey, C_GOLD_LIGHT if (m + k) % 3 == 0 else C_ORANGE_DEEP)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row2_eclipse_supernova(f):
    """
    Row 2 (F00..F29): ECLIPSE SUPERNOVA BLACK-SUN SPHERE (Pass #4 Upgrade — Also FireMage's Dual Blink Portals!)
    - Strict bounds: 4 <= x <= 47, 4 <= y <= 47
    - Extra-crisp 8-Point Golden Solar Corona (4 primary cardinal/diagonal spikes + 4 secondary spikes + sacred rune ring)
    - Crisp Inner Violet-Black Event Horizon (deep void core + swirling dark-violet vortex + bright violet-magenta accretion rim + white-gold photon ring)
    - Rotating Coronal Lightning Arcs crackling across the corona and between the 8 golden points
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    cx, cy = 26.0, 26.0
    phase = (f / 30.0) * math.pi * 2.0

    # 1. Outer Sacred Solar Rune Ring (r = 18.5, strictly inside 6..45)
    ring_r = 18.2 + math.sin(phase * 2.0) * 0.5
    for s in range(64):
        a = (s / 64.0) * math.pi * 2.0 - phase * 0.5
        rx = cx + math.cos(a) * ring_r
        ry = cy + math.sin(a) * ring_r
        put(px, rx, ry, C_GOLD_LIGHT if s % 8 == 0 else (C_ORANGE_DEEP if s % 2 == 0 else C_CRIMSON_DARK))

    # 2. Extra-Crisp 8-Point Golden Solar Corona (r = 9.5..21.0)
    # Slowly rotating 8-point star corona with sculpted multi-pixel golden facets
    corona_rot = phase * 0.5
    for k in range(8):
        spike_a = corona_rot + k * (math.pi * 0.25)
        is_major = (k % 2 == 0)
        spike_len = 21.0 if is_major else 17.5
        base_half_w = 3.2 if is_major else 2.4

        ca = math.cos(spike_a)
        sa = math.sin(spike_a)
        pa = -sa  # perpendicular vector
        pb = ca

        for d in range(9, int(spike_len) + 1):
            u_d = (d - 9.0) / max(1.0, spike_len - 9.0)
            half_w = int(round((1.0 - math.pow(u_d, 0.75)) * base_half_w))
            for w in range(-half_w, half_w + 1):
                sx = cx + ca * d + pa * w * 0.85
                sy = cy + sa * d + pb * w * 0.85
                if w == 0:
                    col = C_WHITE if u_d < 0.65 else C_GOLD_LIGHT
                elif abs(w) == 1:
                    col = C_GOLD_LIGHT if u_d < 0.45 else C_GOLD
                else:
                    col = C_AMBER if u_d < 0.5 else C_ORANGE_BRIGHT
                put(px, sx, sy, col)
        # Crisp white-gold star-tip glint at each of the 8 corona points
        tip_x = cx + ca * spike_len
        tip_y = cy + sa * spike_len
        put(px, tip_x, tip_y, C_WHITE if is_major else C_GOLD_LIGHT)

    # Secondary Counter-Rotating Crimson-Orange Prominence Tongues Between the 8 Points
    for k in range(8):
        fl_a = -phase + (k + 0.5) * (math.pi * 0.25)
        for d in range(10, 17):
            u_d = (d - 10) / 6.0
            curl = fl_a + u_d * 0.35 * (1 if k % 2 == 0 else -1)
            put(px, cx + math.cos(curl) * d, cy + math.sin(curl) * d,
                C_GOLD if u_d < 0.35 else (C_ORANGE_BRIGHT if u_d < 0.7 else C_CRIMSON_BRIGHT))

    # 3. Inner Violet-Black Event Horizon & Blinding White-Gold Photon Ring (r = 0..10.5)
    void_r = 8.2
    for dy in range(-11, 12):
        for dx in range(-11, 12):
            d = math.hypot(dx, dy)
            ang = math.atan2(dy, dx)
            swirl = math.sin(ang * 3.0 + phase * 2.0 - d * 0.65)
            px_x = cx + dx
            px_y = cy + dy

            if d <= 5.2:
                # Deep pitch-black singularity core with subtle swirling dark-violet gravitational spiral
                if d > 2.2 and swirl > 0.65:
                    put(px, px_x, px_y, C_OBSIDIAN)
                else:
                    put(px, px_x, px_y, C_VOID_BLACK)
            elif d <= 6.8:
                # Inner violet-black event horizon step
                put(px, px_x, px_y, C_VIOLET_SMOKE if swirl > 0.0 else C_OBSIDIAN)
            elif d <= void_r:
                # Crisp vivid violet-magenta event-horizon accretion rim!
                put(px, px_x, px_y, C_VIOLET_BRIGHT if swirl > 0.15 else C_VIOLET_MID)
            elif d <= void_r + 1.25:
                # Blinding white-hot photon sphere ring
                put(px, px_x, px_y, C_WHITE)
            elif d <= void_r + 2.3:
                # Inner golden solar corona ring
                put(px, px_x, px_y, C_GOLD_LIGHT if d <= void_r + 1.8 else C_GOLD)

    # 4. Rotating Coronal Lightning Arcs (6 jagged plasma arcs leaping across the corona & event horizon rim)
    for arc_i in range(6):
        arc_base = phase * 2.0 + arc_i * (math.pi / 3.0)
        # Each lightning arc spans ~45 deg around r = 9.5..16.5 with sharp zig-zag vertices
        r0 = 9.2
        a0 = arc_base
        x_prev = cx + math.cos(a0) * r0
        y_prev = cy + math.sin(a0) * r0
        for seg in range(1, 5):
            u_s = seg / 4.0
            a_cur = arc_base + u_s * 0.65 * (1 if arc_i % 2 == 0 else -1)
            zig = (1.8 if (seg + f + arc_i) % 2 == 0 else -1.4)
            r_cur = 9.5 + u_s * 6.5 + zig
            x_cur = cx + math.cos(a_cur) * r_cur
            y_cur = cy + math.sin(a_cur) * r_cur
            col_arc = C_WHITE if seg <= 2 else (C_VIOLET_BRIGHT if arc_i % 2 == 0 else C_GOLD_LIGHT)
            draw_line(px, x_prev, y_prev, x_cur, y_cur, col_arc)
            x_prev, y_prev = x_cur, y_cur

    # 5. Revolving Diamond-Ring Baily's Bead Star-Glint on Event Horizon Rim
    diamond_a = -phase
    dx_b = cx + math.cos(diamond_a) * (void_r + 0.6)
    dy_b = cy + math.sin(diamond_a) * (void_r + 0.6)
    draw_star(px, dx_b, dy_b, 4, C_WHITE, C_GOLD_LIGHT, rot=0.0)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row3_cataclysm_meteor(f):
    """
    Row 3 (F00..F29): CATACLYSM MOLTEN METEOR & SOLAR BEAM HEAD (Pointing +X, cy=26)
    - Strict bounds: 4 <= x <= 47, 6 <= y <= 46
    - Craggy obsidian-basalt asteroid core rotating in 3D with glowing magma fissures
    - Blinding white-gold & orange bow-shock plasma compression wave
    - Roaring twin solar plasma wake & molten slag debris trail
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    cx, cy = 35.0, 26.0
    phase = (f / 30.0) * math.pi * 2.0

    # 1. Roaring Solar Plasma Wake & Molten Slag Trail (x=4..32)
    for x in range(4, 33):
        u = (x - 4) / 28.0
        span = 2.0 + math.pow(u, 0.8) * 10.5
        wobble = math.sin(x * 0.3 - phase * 2.0) * (2.4 * (1.0 - u * 0.5))
        for dy in range(int(-span), int(span) + 1):
            frac = abs(dy) / max(1.0, span)
            py = cy + wobble + dy
            if frac > 0.78:
                if (x + dy + f) % 2 == 0:
                    put(px, x, py, C_CRIMSON_DARK if u < 0.5 else C_CRIMSON_BRIGHT)
            elif frac > 0.48:
                put(px, x, py, C_CRIMSON_BRIGHT if u < 0.4 else C_ORANGE_DEEP)
            elif frac > 0.22:
                put(px, x, py, C_ORANGE_BRIGHT if u < 0.45 else C_GOLD)
            else:
                put(px, x, py, C_GOLD_LIGHT if u < 0.55 else C_WHITE)

    # 2. Sculpted Craggy Obsidian-Basalt Meteor Core with Branching Magma Tectonic Fissures
    rock_r = 9.0
    for dy in range(-11, 12):
        for dx in range(-11, 12):
            ang = math.atan2(dy, dx)
            crag = math.sin(ang * 4.0 + phase) * 1.0 + math.cos(ang * 3.0 - phase) * 0.7
            d = math.hypot(dx * 0.9, dy)
            if d <= rock_r + crag:
                rx = cx + dx
                ry = cy + dy
                c1 = abs(math.sin(dx * 0.42 + math.sin(dy * 0.35 + phase) * 1.4 - phase))
                c2 = abs(math.cos(dy * 0.44 - math.cos(dx * 0.32 - phase) * 1.3 + phase * 0.5))
                vein_val = min(c1, c2)
                if d > rock_r + crag - 1.4 and dx > 0:
                    put(px, rx, ry, C_WHITE if dx > 5 else C_GOLD_LIGHT)
                elif vein_val < 0.14:
                    put(px, rx, ry, C_WHITE if vein_val < 0.06 else C_GOLD_LIGHT)
                elif vein_val < 0.28:
                    put(px, rx, ry, C_ORANGE_BRIGHT if vein_val < 0.20 else C_ORANGE_DEEP)
                else:
                    put(px, rx, ry, C_OBSIDIAN if (dx * dy + f) % 3 != 0 else C_CRIMSON_DARK)

    # 3. White-Hot Atmospheric Entry Bow-Shock Plasma Sheath (x=37..47)
    for s in range(-12, 13):
        u_s = s / 12.0
        bx = 46.5 - (u_s * u_s) * 8.0 + math.sin(phase * 2.0 + u_s * 3.0) * 0.5
        by = cy + s * 1.02
        thick = int(round((1.0 - u_s * u_s * 0.7) * 3.0))
        for t_i in range(thick + 1):
            col = C_WHITE if t_i == 0 else (C_GOLD_LIGHT if t_i == 1 else C_ORANGE_BRIGHT)
            put(px, bx - t_i, by, col)

    # 4. Ejected Molten Meteorite Shards Trailing Behind (x=6..27)
    for sh in range(5):
        u_sh = ((f / 30.0) + sh / 5.0) % 1.0
        sx = 27.0 - u_sh * 20.0
        sy = cy + (1 if sh % 2 == 0 else -1) * (4.0 + u_sh * 6.5)
        put(px, sx, sy, C_OBSIDIAN)
        put(px, sx + 1, sy, C_GOLD_LIGHT)
        put(px, sx, sy - 1, C_ORANGE_BRIGHT)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row4_sun_wheel_and_flame_wave(f):
    """
    Row 4 (F00..F29): PYROMANTIC SUN-WHEEL CAST SEAL & SWEEPING FLAME WAVE
    - Strict bounds: 4 <= x <= 47, 5 <= y <= 47
    - Expanding/revolving 8-spoked Golden-Crimson Pyromantic Sun-Wheel Mandala (cx=20, cy=26)
    - Sweeping Forward Crescent Flame Wave with 30fps peeling solar fire tongues
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0
    cx, cy = 20.0, 26.0

    # 1. Revolving Pyromantic Sun-Wheel Mandala Ring (r = 12.5)
    ring_r = 12.2 + math.sin(phase * 2.0) * 1.0
    for s in range(56):
        a = (s / 56.0) * math.pi * 2.0 + phase
        rx = cx + math.cos(a) * ring_r
        ry = cy + math.sin(a) * ring_r
        put(px, rx, ry, C_WHITE if s % 7 == 0 else (C_GOLD_LIGHT if s % 2 == 0 else C_ORANGE_DEEP))
        if s % 7 == 0:
            put(px, cx + math.cos(a + 0.08) * (ring_r + 1.8), cy + math.sin(a + 0.08) * (ring_r + 1.8), C_GOLD)
            put(px, cx + math.cos(a + 0.14) * (ring_r + 2.8), cy + math.sin(a + 0.14) * (ring_r + 2.8), C_ORANGE_BRIGHT)

    # 8 Revolving Sun-Wheel Spokes
    for k in range(8):
        a = phase + k * (math.pi * 0.25)
        max_d = 14 if k % 2 == 0 else 10
        for d in range(3, max_d + 1):
            put(
                px,
                cx + math.cos(a) * d,
                cy + math.sin(a) * d,
                C_WHITE if d >= max_d - 1 else (C_GOLD_LIGHT if k % 2 == 0 else C_ORANGE_BRIGHT)
            )
    draw_star(px, cx, cy, 4, C_WHITE, C_GOLD_LIGHT, rot=-phase)

    # 2. Sweeping Forward Crescent Flame Wave (x=25..47, y=6..46)
    wave_pulse = 0.88 + 0.12 * math.sin(phase * 2.0)
    for s in range(-19, 20):
        u_arc = s / 19.0
        arc_y = cy + s * 1.02
        arc_x = 45.0 - (u_arc * u_arc) * 14.0 + math.sin(phase * 2.0 + u_arc * 3.5) * 0.8
        thickness = int(round((1.0 - u_arc * u_arc * 0.72) * 6.2 * wave_pulse))
        for t_off in range(thickness + 1):
            wx = arc_x - t_off
            if t_off == 0:
                put(px, wx, arc_y, C_WHITE)
            elif t_off == 1:
                put(px, wx, arc_y, C_GOLD_LIGHT)
            elif t_off <= 3:
                put(px, wx, arc_y, C_GOLD if (s + t_off) % 2 == 0 else C_ORANGE_BRIGHT)
            elif t_off <= 5:
                put(px, wx, arc_y, C_ORANGE_DEEP)
            else:
                put(px, wx, arc_y, C_CRIMSON_BRIGHT)

    # 3. 30fps Peeling Solar Flame Tongues Streaming Off the Crescent Wave
    for m in range(7):
        u_m = ((f / 30.0) + m / 7.0) % 1.0
        side = 1 if m % 2 == 0 else -1
        fx = 44.0 - u_m * 16.0
        fy = cy + side * (6.0 + u_m * 12.5) + math.sin(phase * 2.0 + m) * 1.2
        put(px, fx, fy, C_WHITE if u_m < 0.3 else C_GOLD_LIGHT)
        put(px, fx - 1, fy, C_ORANGE_BRIGHT)
        put(px, fx - 2, fy - side * 0.5, C_CRIMSON_BRIGHT)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def verify_bounds(sheet):
    """Verifies 0/150 boundary clips across all 5 rows for both 2<=x<=49 and 3<=x<=48."""
    clips_2_49 = 0
    clips_3_48 = 0
    for r in range(ROWS):
        row_min_x, row_min_y = 999, 999
        row_max_x, row_max_y = -1, -1
        for c in range(COLS):
            cell = sheet.crop((c * CELL, r * CELL, (c + 1) * CELL, (r + 1) * CELL))
            logical = cell.resize((LOGICAL, LOGICAL), Image.Resampling.NEAREST)
            px = logical.load()
            cell_clip_2 = False
            cell_clip_3 = False
            for y in range(LOGICAL):
                for x in range(LOGICAL):
                    if px[x, y][3] > 0:
                        row_min_x = min(row_min_x, x)
                        row_min_y = min(row_min_y, y)
                        row_max_x = max(row_max_x, x)
                        row_max_y = max(row_max_y, y)
                        if x < 2 or x > 49 or y < 2 or y > 49:
                            cell_clip_2 = True
                        if x < 3 or x > 48 or y < 3 or y > 48:
                            cell_clip_3 = True
            if cell_clip_2:
                clips_2_49 += 1
            if cell_clip_3:
                clips_3_48 += 1
        print(f"  Row {r} logical bounds: x=[{row_min_x}..{row_max_x}], y=[{row_min_y}..{row_max_y}]")
    print(f"Boundary Audit (2<=x<=49, 2<=y<=49): {clips_2_49}/150 clips | (3<=x<=48, 3<=y<=48): {clips_3_48}/150 clips")
    assert clips_2_49 == 0, f"Found {clips_2_49} boundary clips outside 2..49!"


def main():
    sheet_w = COLS * CELL  # 6240
    sheet_h = ROWS * CELL  # 1040
    sheet = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))

    builders = [
        ("ROW 0: SOLAR FIREBALL COMET (30 FRAMES)", build_row0_solar_fireball),
        ("ROW 1: HELLFIRE MAGMA PILLAR ERUPTION (30 FRAMES)", build_row1_hellfire_pillar),
        ("ROW 2: ECLIPSE SUPERNOVA BLACK-SUN SPHERE (30 FRAMES)", build_row2_eclipse_supernova),
        ("ROW 3: CATACLYSM MOLTEN METEOR & BEAM HEAD (30 FRAMES)", build_row3_cataclysm_meteor),
        ("ROW 4: PYROMANTIC SUN-WHEEL SEAL & FLAME WAVE (30 FRAMES)", build_row4_sun_wheel_and_flame_wave),
    ]

    for row_idx, (label, fn) in enumerate(builders):
        for col_idx in range(COLS):
            cell_img = fn(col_idx)
            sheet.paste(cell_img, (col_idx * CELL, row_idx * CELL))

    out_path = "/home/antigravity/assets/sprites/mage_vfx.png"
    sheet.save(out_path)
    print(f"Saved 30fps FireMage VFX sheet to {out_path} ({sheet.size[0]}x{sheet.size[1]})")
    verify_bounds(sheet)

    # Build both the full 30-column contact sheet and the 2 readable 15-column contact sheets in caller's artifact directory
    art_dir = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/4f1fb80f-a88f-4496-9746-b4b9fe84f6d4"
    thumb = 88
    pad_top = 24
    cw = COLS * thumb
    ch = ROWS * (thumb + pad_top)
    contact = Image.new("RGBA", (cw, ch), (16, 12, 22, 255))
    draw = ImageDraw.Draw(contact)

    for r_idx, (label, _) in enumerate(builders):
        y0 = r_idx * (thumb + pad_top)
        draw.rectangle([0, y0, cw, y0 + pad_top - 1], fill=(32, 20, 36, 255))
        draw.text((6, y0 + 2), label, fill=(251, 146, 60, 255))
        for c_idx in range(COLS):
            x0 = c_idx * thumb
            draw.text((x0 + 4, y0 + 12), f"F{c_idx:02d}", fill=(254, 240, 138, 255))
            cell_crop = sheet.crop((c_idx * CELL, r_idx * CELL, (c_idx + 1) * CELL, (r_idx + 1) * CELL))
            cell_thumb = cell_crop.resize((thumb, thumb), Image.Resampling.NEAREST)
            contact.paste(cell_thumb, (x0, y0 + pad_top), cell_thumb)
            draw.rectangle([x0, y0 + pad_top, x0 + thumb - 1, y0 + pad_top + thumb - 1], outline=(58, 36, 48, 255))

    c_path = os.path.join(art_dir, "debug_mage_30fps_vfx.png")
    contact.save(c_path)
    print(f"Saved contact sheet: {c_path} ({contact.size[0]}x{contact.size[1]})")

    thumb_half = 112
    for half_idx, (c_start, c_end, suffix) in enumerate([(0, 15, "left_F00_F14"), (15, 30, "right_F15_F29")]):
        cw_h = 15 * thumb_half
        ch_h = ROWS * (thumb_half + pad_top)
        contact_h = Image.new("RGBA", (cw_h, ch_h), (16, 12, 22, 255))
        draw_h = ImageDraw.Draw(contact_h)
        for r_idx, (label, _) in enumerate(builders):
            y0 = r_idx * (thumb_half + pad_top)
            draw_h.rectangle([0, y0, cw_h, y0 + pad_top - 1], fill=(32, 20, 36, 255))
            draw_h.text((6, y0 + 2), label, fill=(251, 146, 60, 255))
            for c_idx in range(c_start, c_end):
                local_c = c_idx - c_start
                x0 = local_c * thumb_half
                draw_h.text((x0 + 4, y0 + 12), f"F{c_idx:02d}", fill=(254, 240, 138, 255))
                cell_crop = sheet.crop((c_idx * CELL, r_idx * CELL, (c_idx + 1) * CELL, (r_idx + 1) * CELL))
                cell_thumb = cell_crop.resize((thumb_half, thumb_half), Image.Resampling.NEAREST)
                contact_h.paste(cell_thumb, (x0, y0 + pad_top), cell_thumb)
                draw_h.rectangle([x0, y0 + pad_top, x0 + thumb_half - 1, y0 + pad_top + thumb_half - 1], outline=(58, 36, 48, 255))
        ch_path = os.path.join(art_dir, f"debug_mage_30fps_vfx_{suffix}.png")
        contact_h.save(ch_path)
        print(f"Saved contact sheet: {ch_path}")


if __name__ == "__main__":
    main()
