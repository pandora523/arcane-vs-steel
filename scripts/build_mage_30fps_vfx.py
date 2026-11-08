#!/usr/bin/env python3
"""
Builds Ignis Sol (FireMage) 30fps HD-2D Pixel-Art Skill & VFX Sprite Sheet:
- Output: assets/sprites/mage_vfx.png (6240 x 1040, 5 rows x 30 cols at 208x208 per cell)
- Logical canvas per cell: 52x52 upscaled 4x NEAREST to 208x208 (un-inked clean pixel art!)
- Rows:
  Row 0 (F00..F29): BLAZING SOLAR FIREBALL COMET (Auto-Attack, Crouch Shot & Aerial Fireball)
  Row 1 (F00..F29): HELLFIRE MAGMA PILLAR ERUPTION (F00..F06 Fissure, F07..F21 Roaring Column, F22..F29 Dissipation)
  Row 2 (F00..F29): ECLIPSE SUPERNOVA BLACK-SUN SPHERE (Void Core, Diamond-Ring Flare & Sacred Geometry Rings)
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
C_VIOLET_SMOKE = (88, 28, 135, 215)     # #581c87
C_ASH_DARK = (45, 24, 36, 225)
C_OBSIDIAN = (28, 19, 26, 255)
C_VOID_BLACK = (8, 5, 16, 255)

C_SOLAR_AURA = (251, 146, 60, 150)
C_CRIMSON_AURA = (220, 38, 38, 130)
C_VIOLET_AURA = (107, 33, 168, 115)


def put(px, x, y, col):
    ix = int(round(x))
    iy = int(round(y))
    if 0 <= ix < LOGICAL and 0 <= iy < LOGICAL:
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
    Row 0 (F00..F29): BLAZING SOLAR FIREBALL COMET (Pointing +X, cy=26)
    - White-hot solar core at (38, 26)
    - Swirling golden-orange corona prominences rotating at 30fps
    - Trailing crimson-violet smoke & dancing solar ember wake (x=3..35)
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    cy = 26.0
    cx = 37.5
    phase = (f / 30.0) * math.pi * 2.0

    # 1. Trailing Crimson-Violet Smoke & Outer Thermal Wake (x=3..35)
    for x in range(3, 36):
        u = (x - 3) / 32.0  # 0.0 at tail tip -> 1.0 at fireball body
        half_h = 1.5 + math.pow(u, 0.85) * 8.5
        wave_y = math.sin(x * 0.28 - phase * 2.0) * (3.2 * (1.0 - u * 0.6))
        for dy in range(int(-half_h), int(half_h) + 1):
            dist_frac = abs(dy) / max(1.0, half_h)
            py = cy + wave_y + dy
            if dist_frac > 0.78:
                if (x + dy + f) % 2 == 0:
                    put(px, x, py, C_VIOLET_AURA if u < 0.45 else C_CRIMSON_AURA)
            elif dist_frac > 0.52:
                put(px, x, py, C_VIOLET_SMOKE if u < 0.32 else C_CRIMSON_DARK if u < 0.58 else C_CRIMSON_BRIGHT)
            elif dist_frac > 0.28:
                put(px, x, py, C_CRIMSON_BRIGHT if u < 0.38 else C_ORANGE_DEEP if u < 0.68 else C_ORANGE_BRIGHT)
            else:
                put(px, x, py, C_ORANGE_BRIGHT if u < 0.42 else C_GOLD if u < 0.75 else C_GOLD_LIGHT)

    # 2. Helical Solar Flame Ribbons Corkscrewing Rearward (x=8..37)
    for rib in range(2):
        r_off = rib * math.pi
        for x in range(8, 38):
            u = (x - 8) / 29.0
            amp = (1.0 - u * 0.4) * 5.2
            ang = x * 0.35 - phase * 2.0 + r_off
            ry = cy + math.sin(ang) * amp
            put(px, x, ry, C_GOLD_LIGHT if rib == 0 else C_ORANGE_BRIGHT)
            put(px, x, ry + (1 if math.sin(ang) >= 0 else -1), C_GOLD if rib == 0 else C_CRIMSON_BRIGHT)

    # 3. Swirling Golden-Orange Corona Prominences around Fireball Head (cx=37.5, cy=26)
    core_r = 8.4
    for dy in range(-11, 12):
        for dx in range(-11, 12):
            d = math.hypot(dx * 0.92, dy)
            ang = math.atan2(dy, dx)
            # 6 revolving solar prominence waves
            flare_mod = math.sin(ang * 5.0 - phase * 2.0) * 1.5 + math.cos(ang * 3.0 + phase) * 0.9
            eff_r = core_r + flare_mod * (0.65 if dx > 0 else 1.25)
            if d <= eff_r + 1.5:
                px_x = cx + dx
                px_y = cy + dy
                if d <= 3.8:
                    put(px, px_x, px_y, C_WHITE)
                elif d <= 5.6 + math.sin(ang * 4.0 - phase) * 0.5:
                    put(px, px_x, px_y, C_GOLD_LIGHT)
                elif d <= 7.2 + flare_mod * 0.4:
                    put(px, px_x, px_y, C_GOLD)
                elif d <= eff_r:
                    put(px, px_x, px_y, C_ORANGE_BRIGHT if dx > -2 else C_ORANGE_DEEP)
                else:
                    put(px, px_x, px_y, C_CRIMSON_BRIGHT)

    # 4. Leading White-Gold Bow-Shock Arc & Trailing Ember Sparks
    for s in range(-7, 8):
        u_s = s / 7.0
        bx = 47.5 - (u_s * u_s) * 4.5
        by = cy + s * 1.15
        put(px, bx, by, C_WHITE if abs(s) <= 3 else C_GOLD_LIGHT)
        put(px, bx - 1, by, C_GOLD if abs(s) <= 4 else C_ORANGE_BRIGHT)

    for m in range(6):
        mx = int(4 + ((f * 3 + m * 6) % 24))
        my = int(cy + math.sin(phase * 2.0 + m * 1.4) * (4.0 + (m % 3) * 2.0))
        put(px, mx, my, C_GOLD_LIGHT if m % 2 == 0 else C_ORANGE_BRIGHT)
        put(px, mx - 1, my, C_CRIMSON_BRIGHT)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row1_hellfire_pillar(f):
    """
    Row 1 (F00..F29): HELLFIRE MAGMA PILLAR ERUPTION
    - F00..F06: Volcanic ground rune fissure & surging magma geyser
    - F07..F21: Roaring spiraling column of white-gold and crimson hellfire with rising lava rocks
    - F22..F29: Explosive ash-and-ember dissipation
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    cx = 26.0
    gy = 46.0
    phase = (f / 30.0) * math.pi * 2.0

    if f <= 6:
        # F00..F06: Volcanic ground rune fissure & surging magma geyser
        u = f / 6.0
        rx = 6.0 + u * 15.0
        ry = 2.0 + u * 3.8
        # Expanding Volcanic Ground Rune Ring
        for s in range(48):
            a = (s / 48.0) * math.pi * 2.0 + u * 1.8
            sx = cx + math.cos(a) * rx
            sy = gy + math.sin(a) * ry
            put(px, sx, sy, C_WHITE if s % 6 == 0 else (C_GOLD_LIGHT if s % 2 == 0 else C_ORANGE_DEEP))
            if s % 8 == 0:
                draw_line(px, cx + math.cos(a) * 3.0, gy + math.sin(a) * 1.0, sx, sy, C_GOLD)

        # Surging Pre-Eruption Magma Geyser Plume (grows from y=46 up to y=14)
        geyser_h = int(6 + u * 28)
        for h in range(geyser_h):
            h_u = h / float(max(1, geyser_h))
            py = gy - h
            half_w = int(round((1.0 - h_u * 0.65) * (3.5 + u * 7.5)))
            for dx in range(-half_w, half_w + 1):
                w_u = abs(dx) / max(1.0, float(half_w))
                col = C_WHITE if w_u < 0.35 else (C_GOLD_LIGHT if w_u < 0.65 else C_ORANGE_DEEP if w_u < 0.88 else C_CRIMSON)
                put(px, cx + dx + math.sin(h * 0.3 - u * 4.0) * 1.0, py, col)

    elif f <= 21:
        # F07..F21: Full Roaring Spiraling Column of White-Gold & Crimson Hellfire (y=3..47)
        k = f - 7
        spin = k * 0.55

        # 1. Molten Magma Base Pool at y=43..49
        for dy in range(-3, 4):
            rx_pool = 18.0 - abs(dy) * 2.2
            for dx in range(int(-rx_pool), int(rx_pool) + 1):
                r_frac = abs(dx) / max(1.0, rx_pool)
                col_p = C_WHITE if r_frac < 0.3 else (C_GOLD_LIGHT if r_frac < 0.6 else C_ORANGE_DEEP if r_frac < 0.85 else C_CRIMSON_DARK)
                put(px, cx + dx, gy + dy, col_p)

        # 2. Roaring Column Body with 3D Helical Flame Ribbons (y=3..45)
        for y in range(3, 46):
            h_frac = (45.0 - y) / 42.0
            base_w = 10.5 + (1.0 - h_frac) * 4.5 if h_frac < 0.25 else (9.5 + math.sin(h_frac * math.pi) * 2.5)
            sway = math.sin(h_frac * 4.5 - spin) * 1.6
            for dx in range(int(-base_w - 2), int(base_w + 3)):
                w_frac = abs(dx) / max(1.0, base_w)
                edge_lick = math.sin(y * 0.45 - spin * 2.0 + (1.0 if dx > 0 else -1.0)) * 0.18
                if w_frac <= 1.0 + edge_lick:
                    if w_frac < 0.28:
                        col = C_WHITE
                    elif w_frac < 0.52:
                        col = C_GOLD_LIGHT
                    elif w_frac < 0.74:
                        col = C_GOLD if (y + k) % 2 == 0 else C_ORANGE_BRIGHT
                    elif w_frac < 0.92:
                        col = C_ORANGE_DEEP
                    else:
                        col = C_CRIMSON_BRIGHT if (y + dx) % 2 == 0 else C_CRIMSON_DARK
                    put(px, cx + sway + dx, y, col)

            # Helical White-Gold Upward Flame Strands wrapping across the front of the pillar
            for strand in range(2):
                sa = spin * 1.8 - h_frac * 7.5 + strand * math.pi
                if math.sin(sa) >= -0.2:
                    sx = cx + sway + math.cos(sa) * (base_w * 0.88)
                    put(px, sx, y, C_WHITE if math.sin(sa) > 0.5 else C_GOLD_LIGHT)
                    put(px, sx + (1 if math.cos(sa) >= 0 else -1), y, C_GOLD)

        # 3. Rising Molten Lava Rocks & Craggy Basalt Chunks spiraling upward
        for rock_i in range(6):
            r_h = ((rock_i / 6.0) + (k / 15.0)) % 1.0
            ry = 44.0 - r_h * 38.0
            ra = spin * 1.5 + rock_i * (math.pi / 3.0)
            rx = cx + math.cos(ra) * 12.5
            put(px, rx, ry, C_OBSIDIAN)
            put(px, rx + 1, ry, C_CRIMSON_DARK)
            put(px, rx, ry - 1, C_GOLD_LIGHT)
            put(px, rx + 1, ry + 1, C_ORANGE_BRIGHT)

    else:
        # F22..F29: Explosive Ash-and-Ember Dissipation (organic billowing flame clouds & cooling magma chunks)
        k = f - 22
        u = k / 7.0  # 0.0 -> 1.0
        for puff_i in range(7):
            py_base = 42.0 - puff_i * 5.8 - u * 4.5
            px_base = cx + math.sin(puff_i * 1.7 + k * 0.5) * (2.5 + u * 6.5)
            puff_r = max(1.2, (7.8 - puff_i * 0.45) * (1.0 - u * 0.72))
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

        # Ejected glowing embers & volcanic ash motes
        for m in range(10):
            ang = (m / 10.0) * math.pi * 2.0 + k * 0.3
            rad_x = 6.0 + u * 14.0 + (m % 3) * 2.0
            ey = 38.0 - ((m * 5 + k * 3) % 34)
            ex = cx + math.cos(ang) * rad_x
            put(px, ex, ey, C_GOLD_LIGHT if (m + k) % 3 == 0 else C_ORANGE_DEEP)

        # Fading Scorched Ground Sigil
        rx = 19.0 * (1.0 - u * 0.35)
        for s in range(36):
            if (s + k) % 2 == 0:
                a = (s / 36.0) * math.pi * 2.0
                put(px, cx + math.cos(a) * rx, gy + math.sin(a) * 3.2, C_ORANGE_DEEP if u < 0.5 else C_CRIMSON_DARK)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row2_eclipse_supernova(f):
    """
    Row 2 (F00..F29): ECLIPSE SUPERNOVA BLACK-SUN SPHERE
    - Total solar eclipse sphere centered at (26, 26):
      * Pitch-black void core (r=9.0) with deep violet event-horizon rim
      * Blinding white-gold diamond-ring corona (r=9.5..12.0) with revolving Baily's beads burst
      * 8 swirling crimson-orange solar prominence flares rotating across 30 frames
      * Concentric sacred geometry octagram & solar rune rings rotating in opposite directions
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    cx, cy = 26.0, 26.0
    phase = (f / 30.0) * math.pi * 2.0

    # 1. Outer Sacred Geometry Solar Octagram & Rune Ring (r = 19.5..22.5)
    outer_r = 20.5 + math.sin(phase * 2.0) * 0.8
    for s in range(64):
        a = (s / 64.0) * math.pi * 2.0 - phase
        rx = cx + math.cos(a) * outer_r
        ry = cy + math.sin(a) * outer_r
        put(px, rx, ry, C_GOLD_LIGHT if s % 8 == 0 else (C_ORANGE_BRIGHT if s % 2 == 0 else C_CRIMSON_BRIGHT))

    # 2 Intersecting Revolving Squares forming the Sacred Octagram (r = 14..21)
    for sq in range(2):
        sq_rot = phase + sq * (math.pi * 0.25)
        pts = [
            (cx + math.cos(sq_rot + k * math.pi * 0.5) * 20.0, cy + math.sin(sq_rot + k * math.pi * 0.5) * 20.0)
            for k in range(4)
        ]
        for k in range(4):
            p0 = pts[k]
            p1 = pts[(k + 1) % 4]
            draw_line(px, p0[0], p0[1], p1[0], p1[1], C_GOLD if sq == 0 else C_ORANGE_BRIGHT)
            put(px, p0[0], p0[1], C_WHITE)

    # 2. 8 Swirling Crimson-Orange Solar Prominence Flares (r = 11.5..18.5)
    for p_idx in range(8):
        base_a = phase * 1.5 + p_idx * (math.pi * 0.25)
        for d in range(11, 19):
            u_d = (d - 11) / 7.0
            curl_a = base_a + u_d * 0.55 * (1 if p_idx % 2 == 0 else -1)
            fx = cx + math.cos(curl_a) * d
            fy = cy + math.sin(curl_a) * d
            col = C_GOLD_LIGHT if u_d < 0.35 else (C_ORANGE_BRIGHT if u_d < 0.7 else C_CRIMSON_BRIGHT)
            put(px, fx, fy, col)
            put(px, fx - math.sin(curl_a), fy + math.cos(curl_a), C_ORANGE_DEEP if u_d < 0.6 else C_CRIMSON_DARK)

    # 3. Pitch-Black Eclipse Void Core & Blinding White-Gold Corona Ring (r = 0..12)
    void_r = 8.8 + math.sin(phase * 2.0) * 0.4
    corona_r = void_r + 2.6
    for dy in range(-14, 15):
        for dx in range(-14, 15):
            d = math.hypot(dx, dy)
            if d <= void_r - 1.2:
                put(px, cx + dx, cy + dy, C_VOID_BLACK)
            elif d <= void_r:
                put(px, cx + dx, cy + dy, C_OBSIDIAN if (dx + dy) % 2 == 0 else C_VIOLET_SMOKE)
            elif d <= void_r + 1.3:
                put(px, cx + dx, cy + dy, C_WHITE)
            elif d <= corona_r:
                put(px, cx + dx, cy + dy, C_GOLD_LIGHT if d < void_r + 2.0 else C_GOLD)
            elif d <= corona_r + 1.2 and (dx + dy + f) % 2 == 0:
                put(px, cx + dx, cy + dy, C_ORANGE_BRIGHT)

    # 4. Revolving Diamond-Ring Baily's Beads Starburst on the Eclipse Rim
    diamond_a = phase
    dx_b = cx + math.cos(diamond_a) * (void_r + 0.8)
    dy_b = cy + math.sin(diamond_a) * (void_r + 0.8)
    draw_star(px, dx_b, dy_b, 5, C_WHITE, C_GOLD_LIGHT, rot=0.0)
    draw_star(px, dx_b, dy_b, 3, C_WHITE, C_ORANGE_BRIGHT, rot=math.pi * 0.25)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row3_cataclysm_meteor(f):
    """
    Row 3 (F00..F29): CATACLYSM MOLTEN METEOR & SOLAR BEAM HEAD (Pointing +X, cy=26)
    - Craggy obsidian-basalt asteroid core (x=27..45, y=15..37) rotating in 3D with glowing magma fissures
    - Blinding white-gold & orange bow-shock plasma compression wave (x=39..50)
    - Roaring twin solar plasma wake & molten slag debris trail (x=2..28)
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    cx, cy = 36.0, 26.0
    phase = (f / 30.0) * math.pi * 2.0

    # 1. Roaring Solar Plasma Wake & Molten Slag Trail (x=2..32)
    for x in range(2, 33):
        u = (x - 2) / 30.0
        span = 2.0 + math.pow(u, 0.8) * 11.5
        wobble = math.sin(x * 0.3 - phase * 2.0) * (2.8 * (1.0 - u * 0.5))
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
    rock_r = 9.2
    for dy in range(-11, 12):
        for dx in range(-11, 12):
            ang = math.atan2(dy, dx)
            crag = math.sin(ang * 4.0 + phase) * 1.1 + math.cos(ang * 3.0 - phase) * 0.8
            d = math.hypot(dx * 0.9, dy)
            if d <= rock_r + crag:
                rx = cx + dx
                ry = cy + dy
                # Branching 2-network volcanic magma cracks rotating in 3D across the rock surface
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

    # 3. White-Hot Atmospheric Entry Bow-Shock Plasma Sheath (x=38..50)
    for s in range(-13, 14):
        u_s = s / 13.0
        bx = 48.5 - (u_s * u_s) * 8.5 + math.sin(phase * 2.0 + u_s * 3.0) * 0.6
        by = cy + s * 1.05
        thick = int(round((1.0 - u_s * u_s * 0.7) * 3.2))
        for t_i in range(thick + 1):
            col = C_WHITE if t_i == 0 else (C_GOLD_LIGHT if t_i == 1 else C_ORANGE_BRIGHT)
            put(px, bx - t_i, by, col)

    # 4. Ejected Molten Meteorite Shards Trailing Behind
    for sh in range(5):
        u_sh = ((f / 30.0) + sh / 5.0) % 1.0
        sx = 28.0 - u_sh * 22.0
        sy = cy + (1 if sh % 2 == 0 else -1) * (4.0 + u_sh * 7.5)
        put(px, sx, sy, C_OBSIDIAN)
        put(px, sx + 1, sy, C_GOLD_LIGHT)
        put(px, sx, sy - 1, C_ORANGE_BRIGHT)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row4_sun_wheel_and_flame_wave(f):
    """
    Row 4 (F00..F29): PYROMANTIC SUN-WHEEL CAST SEAL & SWEEPING FLAME WAVE
    - Expanding/revolving 8-spoked Golden-Crimson Pyromantic Sun-Wheel Mandala (cx=20, cy=26)
    - Sweeping Forward Crescent Flame Wave (x=24..49, y=5..47) with 30fps peeling solar fire tongues
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0
    cx, cy = 20.0, 26.0

    # 1. Revolving Pyromantic Sun-Wheel Mandala Ring (r = 13.5)
    ring_r = 13.0 + math.sin(phase * 2.0) * 1.2
    for s in range(56):
        a = (s / 56.0) * math.pi * 2.0 + phase
        rx = cx + math.cos(a) * ring_r
        ry = cy + math.sin(a) * ring_r
        put(px, rx, ry, C_WHITE if s % 7 == 0 else (C_GOLD_LIGHT if s % 2 == 0 else C_ORANGE_DEEP))
        if s % 7 == 0:
            # Outer wavy solar flame rays on the mandala rim
            put(px, cx + math.cos(a + 0.08) * (ring_r + 2.0), cy + math.sin(a + 0.08) * (ring_r + 2.0), C_GOLD)
            put(px, cx + math.cos(a + 0.14) * (ring_r + 3.2), cy + math.sin(a + 0.14) * (ring_r + 3.2), C_ORANGE_BRIGHT)

    # 8 Revolving Sun-Wheel Spokes & Inner Hexagram
    for k in range(8):
        a = phase + k * (math.pi * 0.25)
        max_d = 15 if k % 2 == 0 else 11
        for d in range(3, max_d + 1):
            put(
                px,
                cx + math.cos(a) * d,
                cy + math.sin(a) * d,
                C_WHITE if d >= max_d - 1 else (C_GOLD_LIGHT if k % 2 == 0 else C_ORANGE_BRIGHT)
            )
    draw_star(px, cx, cy, 4, C_WHITE, C_GOLD_LIGHT, rot=-phase)

    # 2. Sweeping Forward Crescent Flame Wave (x=25..49, y=5..47)
    wave_pulse = 0.88 + 0.12 * math.sin(phase * 2.0)
    for s in range(-20, 21):
        u_arc = s / 20.0
        arc_y = cy + s * 1.05
        arc_x = 46.0 - (u_arc * u_arc) * 14.5 + math.sin(phase * 2.0 + u_arc * 3.5) * 1.0
        thickness = int(round((1.0 - u_arc * u_arc * 0.72) * 6.5 * wave_pulse))
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
        fx = 45.0 - u_m * 17.0
        fy = cy + side * (6.0 + u_m * 14.0) + math.sin(phase * 2.0 + m) * 1.5
        put(px, fx, fy, C_WHITE if u_m < 0.3 else C_GOLD_LIGHT)
        put(px, fx - 1, fy, C_ORANGE_BRIGHT)
        put(px, fx - 2, fy - side * 0.5, C_CRIMSON_BRIGHT)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


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

    # Build the debug_mage_30fps_vfx.png contact sheet in the caller's artifact directory
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


if __name__ == "__main__":
    main()
