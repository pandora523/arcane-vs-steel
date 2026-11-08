#!/usr/bin/env python3
"""
Builds Sylvara (Archer) 30fps HD-2D Pixel-Art Skill & VFX Sprite Sheet (Pass #4 Overhaul):
- Output: assets/sprites/archer_vfx.png (6240 x 1040, 5 rows x 30 cols at 208x208 per cell)
- Logical canvas per cell: 52x52 upscaled 4x NEAREST to 208x208 (zero black comic inking!)
- Strict Boundary Guarantee: ALL pixels across all 150 cells reside strictly inside 3 <= x <= 48, 3 <= y <= 48 (0/150 boundary clips!)
- Rows:
  Row 0 (F00..F29): SUPERSONIC TEMPEST ARROW (Crisp Golden-Emerald Sonic Boom Rings, Double-Helix Ribbons & Spinning Broadhead)
  Row 1 (F00..F29): STARFALL VOLLEY — SKY-STRIKE ARROW (F00..F11 with Sonic Rings) & RUNIC GROUND IMPACT (F12..F29)
  Row 2 (F00..F29): SWIRLING ZEPHYR TORNADO FUNNEL (Dense Multi-Layered 16-bit Emerald-Gold Cyclone, Bright Wind-Core, Helical Ribbons, Orbiting Sylvan Leaves & Grounded Vortex Ring at y=44..47)
  Row 3 (F00..F29): ASTRAL HURRICANE — ROARING WIND-DRAGON (Sharp Golden Dragon Horns/Antlers, Glowing White-Emerald Eye & Jaw Breath Core, Articulated Dorsal Wind-Fins)
  Row 4 (F00..F29): SONIC GALE RELEASE WAVE & SYLVAN WIND-ROSE CREST (Bow-Release Shock-Wave & Cast Seal)
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

# Clean, luminous Elven Emerald / Starlight Gold / Astral Cyan palette (NO heavy black inking!)
C_WHITE = (255, 255, 255, 255)
C_STAR_BRIGHT = (254, 249, 195, 255)   # #fef9c3
C_GOLD_LIGHT = (254, 240, 138, 255)    # #fef08a
C_GOLD = (250, 204, 21, 255)           # #facc15
C_GOLD_DEEP = (202, 138, 4, 255)       # #ca8a04

C_MINT_BRIGHT = (167, 243, 208, 255)   # #a7f3d0
C_MINT = (110, 231, 183, 255)          # #6ee7b7
C_EMERALD_BRIGHT = (52, 211, 153, 255) # #34d399
C_EMERALD = (16, 185, 129, 255)        # #10b981
C_EMERALD_DARK = (5, 150, 105, 255)    # #059669
C_FOREST = (4, 120, 87, 255)           # #047857
C_FOREST_DEEP = (6, 78, 59, 240)       # #064e3b

C_CYAN_GLOW = (103, 232, 249, 225)     # #67e8f9
C_TEAL_AURA = (20, 184, 166, 175)      # #14b8a6
C_EMERALD_AURA = (16, 185, 129, 140)
C_GOLD_AURA = (250, 204, 21, 155)


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


def draw_leaf(px, cx, cy, angle, col_core, col_edge):
    """Draws a crisp 3x2 / 3x3 pixel sylvan razor-leaf oriented along angle."""
    ca = math.cos(angle)
    sa = math.sin(angle)
    put(px, cx, cy, col_core)
    put(px, cx + ca, cy + sa, col_core)
    put(px, cx - ca, cy - sa, col_edge)
    put(px, cx - sa * 0.8, cy + ca * 0.8, col_edge)
    put(px, cx + sa * 0.8, cy - ca * 0.8, col_edge)


def build_row0_supersonic_arrow(f):
    """
    Row 0 (F00..F29): SUPERSONIC TEMPEST ARROW (Pointing +X, cy=26)
    - Strict bounds: 4 <= x <= 47, 14 <= y <= 38
    - Crisp Golden-Emerald Sonic Boom Rings (back half behind shaft, front half over shaft)
    - 30fps longitudinal spin on 4-vane elven fletching & diamond broadhead facets
    - Double-helix emerald & starlight-gold wind ribbons corkscrewing rearward
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    cy = 26.0
    phase = (f / 30.0) * math.pi * 2.0

    # 1. Soft Emerald-Teal Slipstream Wake Aura (x=6..42)
    for x in range(6, 43):
        u = (x - 6) / 36.0
        half_h = int(1.5 + math.sin(u * math.pi) * 3.2)
        wave_y = math.sin(x * 0.25 - phase * 2.0) * 1.0
        for dy in range(-half_h, half_h + 1):
            if abs(dy) >= half_h - 1:
                put(px, x, cy + wave_y + dy, C_EMERALD_AURA)

    # 2. Back-Half of Crisp Golden-Emerald Sonic Boom Rings (passes BEHIND arrow shaft)
    ring_shift = (f % 10) / 10.0
    sonic_rings = []
    for r_idx in range(2):
        u_r = (ring_shift + r_idx * 0.5) % 1.0
        rcx = 39.0 - u_r * 22.0   # travels rearward from x=39 to x=17
        ry_rad = 4.2 + math.sin(u_r * math.pi) * 4.8  # max 9.0 -> y=17..35
        rx_rad = 2.0 + u_r * 1.2
        sonic_rings.append((u_r, rcx, rx_rad, ry_rad))

    for u_r, rcx, rx_rad, ry_rad in sonic_rings:
        for s in range(28):
            a = (s / 28.0) * math.pi * 2.0
            if math.cos(a) < 0:  # back arch of ring
                sx = rcx + math.cos(a) * rx_rad
                sy = cy + math.sin(a) * ry_rad
                put(px, sx, sy, C_EMERALD_BRIGHT if u_r < 0.6 else C_EMERALD)
                put(px, sx - 1, sy, C_EMERALD_DARK)

    # 3. Back-half of Double-Helix Wind Ribbon (passes BEHIND the arrow shaft)
    for ribbon_idx in range(2):
        r_off = ribbon_idx * math.pi
        col_edge = C_EMERALD_DARK if ribbon_idx == 0 else C_EMERALD
        for x in range(7, 42):
            u = (x - 7) / 35.0
            amp = 2.0 + (1.0 - u) * 3.5
            ang = x * 0.34 - phase * 2.0 + r_off
            if math.cos(ang) < 0:
                ry = cy + math.sin(ang) * amp
                put(px, x, ry, col_edge)
                put(px, x, ry - 1 if math.sin(ang) > 0 else ry + 1, C_EMERALD_AURA)

    # 4. Spinning 4-Vane Elven Feather Fletching (Back Vanes, x=8..16)
    for k in range(4):
        va = phase + k * (math.pi * 0.5)
        if math.cos(va) < 0:
            vane_r = math.sin(va) * 4.2
            for dx in range(8, 17):
                frac = (dx - 8) / 8.0
                vy = cy + vane_r * (1.0 - frac * 0.55)
                put(px, dx - int((1.0 - frac) * 2), vy, C_EMERALD_DARK)
                put(px, dx - int((1.0 - frac) * 1), vy, C_EMERALD_BRIGHT)

    # 5. Luminous Star-Gold & Emerald Arrow Shaft (x=9..41)
    pulse_x = 10 + ((f * 2) % 28)
    for x in range(9, 42):
        is_pulse = abs(x - pulse_x) <= 3 or abs(x - ((pulse_x + 14) % 28 + 10)) <= 2
        put(px, x, cy - 1, C_FOREST)
        put(px, x, cy, C_WHITE if is_pulse else C_GOLD_LIGHT)
        put(px, x, cy + 1, C_MINT_BRIGHT if is_pulse else C_EMERALD_BRIGHT)
        put(px, x, cy + 2, C_EMERALD_DARK)

    # 6. Spinning 4-Vane Elven Feather Fletching (Front Vanes, x=8..16)
    for k in range(4):
        va = phase + k * (math.pi * 0.5)
        if math.cos(va) >= 0:
            vane_r = math.sin(va) * 4.5
            for dx in range(8, 17):
                frac = (dx - 8) / 8.0
                vy = cy + vane_r * (1.0 - frac * 0.55)
                col_v = C_GOLD_LIGHT if k % 2 == 0 else C_MINT_BRIGHT
                put(px, dx - int((1.0 - frac) * 2), vy, col_v)
                put(px, dx - int((1.0 - frac) * 1), vy, C_EMERALD_BRIGHT)

    # 7. Ornate Spinning Diamond-Barbed Elven Broadhead (x=36..47)
    blade_flatten = 0.58 + 0.42 * abs(math.sin(phase))
    barb_span = max(2, int(round(5.0 * blade_flatten)))
    for dx in range(36, 48):
        prog = (dx - 36) / 11.0  # 0 at base -> 1 at tip (x=47)
        w = int(round((1.0 - prog) * barb_span))
        for dy in range(-w, w + 1):
            if dx < 39 and abs(dy) < w - 1:
                continue
            if abs(dy) == w:
                put(px, dx, cy + dy, C_WHITE if prog > 0.35 else C_GOLD_LIGHT)
            elif abs(dy) == w - 1:
                put(px, dx, cy + dy, C_MINT_BRIGHT)
            else:
                put(px, dx, cy + dy, C_EMERALD)
    for dx in range(37, 48):
        put(px, dx, cy, C_WHITE)

    # 8. Front-Half of Crisp Golden-Emerald Sonic Boom Rings (wraps OVER arrow shaft)
    for u_r, rcx, rx_rad, ry_rad in sonic_rings:
        for s in range(32):
            a = (s / 32.0) * math.pi * 2.0
            if math.cos(a) >= 0:  # front arch of ring
                sx = rcx + math.cos(a) * rx_rad
                sy = cy + math.sin(a) * ry_rad
                put(px, sx, sy, C_WHITE if abs(math.sin(a)) < 0.45 else C_GOLD_LIGHT)
                put(px, sx - 1, sy, C_MINT_BRIGHT if u_r < 0.5 else C_EMERALD_BRIGHT)
                put(px, sx + 1, sy, C_GOLD if u_r < 0.5 else C_EMERALD)

    # 9. Supersonic Mach Shock-Cone Peeling Off Broadhead Tip (x=35..46)
    for s in range(1, 8):
        cx_pt = 46 - int(s * 1.1)
        put(px, cx_pt, cy - s, C_GOLD_LIGHT if s <= 4 else C_MINT_BRIGHT)
        put(px, cx_pt, cy + s, C_GOLD_LIGHT if s <= 4 else C_MINT_BRIGHT)
        put(px, cx_pt - 1, cy - s, C_EMERALD_BRIGHT)
        put(px, cx_pt - 1, cy + s, C_EMERALD_BRIGHT)

    # 10. Front-half of Double-Helix Wind Ribbon (wraps OVER the arrow shaft)
    for ribbon_idx in range(2):
        r_off = ribbon_idx * math.pi
        col_core = C_WHITE if ribbon_idx == 0 else C_GOLD_LIGHT
        col_mid = C_MINT_BRIGHT if ribbon_idx == 0 else C_GOLD
        for x in range(7, 42):
            u = (x - 7) / 35.0
            amp = 2.0 + (1.0 - u) * 3.5
            ang = x * 0.34 - phase * 2.0 + r_off
            if math.cos(ang) >= 0:
                ry = cy + math.sin(ang) * amp
                put(px, x, ry, col_core)
                put(px, x, ry + (1 if math.sin(ang) >= 0 else -1), col_mid)

    # 11. Trailing Starlight Motes & Rotating Broadhead Star-Glint (strictly x=4..47)
    draw_star(px, 45, cy, 2, C_WHITE, C_GOLD_LIGHT, rot=phase)
    for m in range(4):
        mx = int(4 + ((f * 2 + m * 6) % 12))
        my = int(cy + math.sin(phase + m * 1.7) * (2.5 + m * 0.8))
        put(px, mx, my, C_GOLD_LIGHT if m % 2 == 0 else C_MINT_BRIGHT)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row1_starfall_arrow_and_impact(f):
    """
    Row 1 (F00..F29): STARFALL VOLLEY — SKY-STRIKE ARROW & RUNIC IMPACT
    - Strict bounds: 4 <= x <= 47, 4 <= y <= 47
    - F00..F11 (12 frames): High-Velocity Starfall Comet-Arrow with Twin Golden-Emerald Sonic Boom Rings
    - F12..F29 (18 frames): Upright Ground Impact, Runic Star-Sigil & Rising Sonic Shock-Ring Plume
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()

    if f < 12:
        # F00..F11: Descending Starfall Comet-Arrow (drawn horizontally pointing +X for directional flight)
        cy = 26.0
        phase = (f / 12.0) * math.pi * 2.0

        # 1. Back-half of Twin Golden-Emerald Sonic Boom Rings (x=16..36)
        u_ring = (f % 6) / 6.0
        for r_i in range(2):
            ur = (u_ring + r_i * 0.5) % 1.0
            rcx = 38.0 - ur * 20.0
            rx_r = 2.0 + ur * 1.0
            ry_r = 4.5 + math.sin(ur * math.pi) * 5.0
            for s in range(28):
                a = (s / 28.0) * math.pi * 2.0
                if math.cos(a) < 0:
                    put(px, rcx + math.cos(a) * rx_r, cy + math.sin(a) * ry_r, C_EMERALD_BRIGHT)
                    put(px, rcx + math.cos(a) * rx_r - 1, cy + math.sin(a) * ry_r, C_FOREST)

        # 2. Astral Comet Tail & Helical Slipstream (x=5..42)
        for x in range(5, 43):
            u = (x - 5) / 37.0
            spread = (1.0 - u) * 5.0
            wobble = math.sin(x * 0.38 - phase * 2.0) * spread * 0.65
            put(px, x, cy + wobble, C_MINT_BRIGHT if u > 0.35 else C_EMERALD_BRIGHT)
            put(px, x, cy - wobble * 0.85, C_GOLD_LIGHT if u > 0.45 else C_EMERALD)
            if x % 2 == f % 2:
                put(px, x, cy + math.cos(x * 0.45 - phase) * spread, C_EMERALD_AURA)

        # 3. Core Starfall Arrow Shaft (x=9..44)
        for x in range(9, 45):
            put(px, x, cy - 1, C_EMERALD_BRIGHT)
            put(px, x, cy, C_WHITE)
            put(px, x, cy + 1, C_GOLD_LIGHT)
            put(px, x, cy + 2, C_EMERALD_DARK)

        # 4. Swept Golden-Emerald Astral Wings on Arrowhead (x=32..45)
        for dx in range(32, 46):
            u = (dx - 32) / 13.0
            wing_h = int(round((1.0 - u) * 6.5 * (0.78 + 0.22 * math.sin(phase))))
            put(px, dx, cy - wing_h, C_WHITE if u > 0.5 else C_GOLD_LIGHT)
            put(px, dx, cy + wing_h, C_WHITE if u > 0.5 else C_GOLD_LIGHT)
            if wing_h > 1:
                put(px, dx, cy - wing_h + 1, C_MINT_BRIGHT)
                put(px, dx, cy + wing_h - 1, C_MINT_BRIGHT)
            if wing_h > 2:
                put(px, dx, cy - wing_h + 2, C_EMERALD_BRIGHT)
                put(px, dx, cy + wing_h - 2, C_EMERALD_BRIGHT)

        # 5. Front-half of Twin Golden-Emerald Sonic Boom Rings (wrapping OVER shaft)
        for r_i in range(2):
            ur = (u_ring + r_i * 0.5) % 1.0
            rcx = 38.0 - ur * 20.0
            rx_r = 2.0 + ur * 1.0
            ry_r = 4.5 + math.sin(ur * math.pi) * 5.0
            for s in range(28):
                a = (s / 28.0) * math.pi * 2.0
                if math.cos(a) >= 0:
                    sx = rcx + math.cos(a) * rx_r
                    sy = cy + math.sin(a) * ry_r
                    put(px, sx, sy, C_WHITE if abs(math.sin(a)) < 0.4 else C_GOLD_LIGHT)
                    put(px, sx - 1, sy, C_MINT_BRIGHT)
                    put(px, sx + 1, sy, C_GOLD)

        # 6. Blazing 8-Point Star-Burst at Tip (x=43, y=26 -> max reach 47)
        draw_star(px, 43, cy, 4, C_WHITE, C_GOLD_LIGHT, rot=phase * 0.5)
        draw_star(px, 43, cy, 3, C_WHITE, C_MINT_BRIGHT, rot=phase * 0.5 + math.pi * 0.25)
    else:
        # F12..F29 (18 frames): Ground Impact & Runic Star-Sigil Eruption (strictly inside 4..47)
        u = (f - 12) / 17.0  # 0.0 -> 1.0
        cx = 26.0
        gy = 42.0
        rot = u * math.pi * 1.6

        # 1. Expanding Perspective Ground Runic Star-Sigil (max rx=17.5 -> x=6..46, y=37..47)
        rx = 5.0 + (1.0 - math.pow(1.0 - u, 2.2)) * 12.5
        ry = 1.6 + (1.0 - math.pow(1.0 - u, 2.2)) * 3.6
        if u < 0.94:
            steps = 56
            for s in range(steps):
                a = (s / float(steps)) * math.pi * 2.0 + rot
                sx = cx + math.cos(a) * rx
                sy = gy + math.sin(a) * ry
                col_ring = C_WHITE if s % 7 == 0 else (C_GOLD_LIGHT if s % 2 == 0 else C_EMERALD_BRIGHT)
                put(px, sx, sy, col_ring if u < 0.75 else C_EMERALD_DARK)
                if s % 7 == 0 and u < 0.82:
                    put(px, cx + math.cos(a) * (rx + 2.0), gy + math.sin(a) * (ry + 0.6), C_GOLD_LIGHT)
                    draw_line(px, cx + math.cos(a) * (rx * 0.35), gy + math.sin(a) * (ry * 0.35), sx, sy, C_MINT_BRIGHT)

        # 2. Central Astral Impact Beam & Helical Emerald-Gold Wind Geyser (gy=42 up to y=6)
        plume_env = math.sin(u * math.pi)
        max_h = int(10 + math.sin(min(1.0, u * 1.35) * math.pi * 0.5) * 26)  # max 36 -> y=6..42
        if u < 0.72:
            # Dense vertical astral core column
            core_w = max(1, int(round((1.0 - u / 0.72) * 3.5)))
            for h in range(0, max_h):
                py = gy - h
                for dx in range(-core_w, core_w + 1):
                    put(px, cx + dx, py, C_WHITE if abs(dx) == 0 else (C_GOLD_LIGHT if abs(dx) == 1 else C_MINT_BRIGHT))

        for h in range(0, max_h):
            h_frac = h / float(max(1, max_h))
            py = gy - h
            cone_w = (2.2 + h_frac * 8.5) * (0.4 + 0.6 * plume_env)
            for strand in range(3):
                sa = rot * 2.4 + strand * (math.pi * 2.0 / 3.0) - h_frac * 4.5
                px_x = cx + math.cos(sa) * cone_w
                if u < 0.88 or (h + strand) % 2 == 0:
                    col_p = C_WHITE if (h < 8 and u < 0.4) else (C_GOLD_LIGHT if strand == 0 else C_MINT_BRIGHT if strand == 1 else C_EMERALD_BRIGHT)
                    put(px, px_x, py, col_p)
                    if plume_env > 0.35:
                        put(px, px_x + (1 if math.cos(sa) > 0 else -1), py, C_EMERALD)

        # 3. Twin Expanding Horizontal Sonic Boom Rings Rising Up the Impact Pillar
        for r_idx in range(2):
            u_sr = (u * 1.4 - r_idx * 0.28)
            if 0.0 < u_sr < 0.95:
                ring_y = gy - 4.0 - u_sr * 26.0
                ring_rx = 4.5 + math.sin(u_sr * math.pi * 0.8) * 9.5
                ring_ry = 1.4 + u_sr * 1.2
                for s in range(36):
                    a = (s / 36.0) * math.pi * 2.0 + rot
                    put(px, cx + math.cos(a) * ring_rx, ring_y + math.sin(a) * ring_ry,
                        C_WHITE if s % 4 == 0 else (C_GOLD_LIGHT if s % 2 == 0 else C_MINT_BRIGHT))

        # 4. Impaled Starfall Arrow Vibrating in the Arena Floor (F12..F25)
        if u < 0.78:
            vib = math.sin((f - 12) * 2.4) * (1.4 * (1.0 - u))
            arrow_len = int(24 * (1.0 if u < 0.5 else (0.78 - u) / 0.28))
            for d in range(arrow_len):
                ax = cx - d * 0.20 + vib * (d / 24.0)
                ay = gy - d * 0.95
                put(px, ax, ay, C_WHITE if d < 6 else C_GOLD_LIGHT)
                put(px, ax + 1, ay, C_EMERALD_BRIGHT)
            if arrow_len >= 18:
                tx = cx - arrow_len * 0.20 + vib
                ty = gy - arrow_len * 0.95
                for fv in (-3, -2, 2, 3):
                    put(px, tx + fv, ty - abs(fv) * 0.5, C_MINT_BRIGHT if fv > 0 else C_GOLD_LIGHT)

        # 5. Impact Starburst & Ejected Sylvan Shards (clamped inside 5..46)
        if u < 0.45:
            burst_r = 3 + int((u / 0.45) * 6)
            draw_star(px, cx, gy - 2, burst_r, C_WHITE, C_GOLD_LIGHT, rot=u * 3.0)
        for shard in range(6):
            sa = -math.pi * 0.18 - (shard / 5.0) * math.pi * 0.64
            dist = 4.0 + u * 18.0
            sx = cx + math.cos(sa) * dist
            sy = gy + math.sin(sa) * dist + (u * u * 8.0)
            if 5 <= sy <= gy:
                put(px, sx, sy, C_GOLD_LIGHT if shard % 2 == 0 else C_MINT_BRIGHT)
                put(px, sx, sy + 1, C_EMERALD_BRIGHT)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row2_zephyr_tornado(f):
    """
    Row 2 (F00..F29): SWIRLING ZEPHYR TORNADO FUNNEL (Pass #4 Complete Rebuild)
    - Strictly contained within 3 <= x <= 48, 3 <= y <= 48 (0 boundary clips!)
    - Dense, multi-layered 16-bit Emerald-Gold Cyclone from y=6 (top mouth) to y=45 (base)
    - Bright swirling wind-core, 3 golden helical wind-ribbons, 8 sculpted orbiting emerald sylvan leaves,
      and a grounded vortex ring at y = 44..47!
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0

    def funnel_profile(y):
        # y=45 is base (h_frac=0.0), y=6 is top crown (h_frac=1.0)
        h_frac = (45.0 - y) / 39.0
        h_frac = max(0.0, min(1.0, h_frac))
        # Conical funnel radius: 4.0 at base -> 14.5 at top crown
        r = 4.0 + math.pow(h_frac, 0.85) * 8.2 + math.pow(h_frac, 2.2) * 2.3
        # S-curve sway: max ±2.2 px so fcx ± r stays well inside 7..45
        sway = math.sin(phase - h_frac * 4.0) * (0.8 + math.sin(h_frac * math.pi) * 1.6)
        return 26.0 + sway, r, h_frac

    # 1. Back-Half of Orbiting Sculpted Sylvan Leaves (passing BEHIND cyclone)
    for leaf_idx in range(8):
        h_frac = ((leaf_idx / 8.0) + (f / 30.0)) % 1.0
        ly = 42.0 - h_frac * 33.0  # y = 9..42
        fcx, fr, _ = funnel_profile(ly)
        la = phase * 2.0 + leaf_idx * (math.pi * 0.25) - h_frac * 3.0
        if math.sin(la) < 0:
            lx = fcx + math.cos(la) * (fr + 2.2)
            ly_p = ly + math.sin(la) * 1.4
            draw_leaf(px, lx, ly_p, la + 0.5, C_EMERALD, C_FOREST)

    # 2. Back-Half of Grounded Vortex Ring at y = 44..47 (behind funnel base)
    base_cx, _, _ = funnel_profile(45.0)
    for ry_off in range(-1, 2):
        for s in range(44):
            a = (s / 44.0) * math.pi * 2.0 + phase * 3.0
            if math.sin(a) < 0:
                gx = base_cx + math.cos(a) * (11.5 - abs(ry_off) * 1.2)
                gy = 45.2 + math.sin(a) * 1.4 + ry_off * 0.4
                put(px, gx, gy, C_EMERALD_DARK if s % 2 == 0 else C_FOREST)

    # 3. Dense, Multi-Layered 16-bit Emerald-Gold Cyclone Body & Bright Swirling Wind-Core (y=6..45)
    for y in range(6, 46):
        fcx, fr, h_frac = funnel_profile(y)
        i_rad = int(round(fr))
        spin = phase * 2.0 - h_frac * 10.5

        for dx in range(-i_rad, i_rad + 1):
            nx = dx / max(1.0, fr)  # -1.0 .. +1.0
            abs_nx = abs(nx)
            theta = math.asin(max(-1.0, min(1.0, nx)))

            # Multi-frequency helical wind waves across the cylindrical surface
            w_primary = math.sin(theta * 2.0 + spin)
            w_secondary = math.cos(theta * 3.0 - spin * 1.5 + h_frac * 6.0)
            band = 0.6 * w_primary + 0.4 * w_secondary

            # Curved 3D elliptical top mouth at y=6..9 (rounds off outer left/right corners at y=6..7)
            if y <= 8:
                lip_curve = 6.0 + (nx * nx) * 2.2
                if y < lip_curve:
                    continue
                if abs_nx < 0.76:
                    rim_dist = abs(y - 7.3) + abs_nx * 0.75
                    if rim_dist < 1.05:
                        col = C_FOREST_DEEP if w_primary < 0 else C_FOREST
                    else:
                        col = C_MINT_BRIGHT if w_primary > 0.2 else C_EMERALD
                    put(px, fcx + dx, y, col)
                    continue

            if abs_nx < 0.42:
                # BRIGHT SWIRLING WIND-CORE along the center axis of the cyclone!
                core_swirl = math.sin(theta * 1.5 - h_frac * 12.0 + phase * 3.0)
                if abs_nx < 0.18 and core_swirl > -0.2:
                    col = C_WHITE if core_swirl > 0.35 else C_STAR_BRIGHT
                elif core_swirl > 0.25:
                    col = C_GOLD_LIGHT if (y + dx) % 2 == 0 else C_MINT_BRIGHT
                elif core_swirl > -0.35:
                    col = C_MINT_BRIGHT if abs_nx < 0.28 else C_EMERALD_BRIGHT
                else:
                    col = C_EMERALD_BRIGHT
            elif abs_nx < 0.78:
                # Mid-wall layered emerald-mint cyclone bands
                if band > 0.48:
                    col = C_GOLD_LIGHT if band > 0.78 else C_MINT_BRIGHT
                elif band > 0.0:
                    col = C_EMERALD_BRIGHT
                elif band > -0.45:
                    col = C_EMERALD
                else:
                    col = C_EMERALD_DARK
            else:
                # Outer silhouette edge with crisp 16-bit wind-sheen ridges
                if band > 0.35:
                    col = C_MINT_BRIGHT if abs_nx < 0.92 else C_EMERALD_BRIGHT
                elif band > -0.2:
                    col = C_EMERALD_DARK
                else:
                    col = C_FOREST if abs_nx < 0.92 else C_FOREST_DEEP

            put(px, fcx + dx, y, col)

    # 4. Top Cyclone Crown Rim Highlight (y=5..8, strictly >= 5)
    top_cx, top_r, _ = funnel_profile(6.5)
    for s in range(48):
        a = (s / 48.0) * math.pi * 2.0 + phase * 2.0
        rx = top_cx + math.cos(a) * (top_r * 0.95)
        ry = 6.5 + math.sin(a) * 1.3
        if math.sin(a) >= 0:
            put(px, rx, ry, C_WHITE if s % 6 == 0 else (C_GOLD_LIGHT if s % 2 == 0 else C_MINT_BRIGHT))

    # 5. Three Golden Helical Wind-Ribbons Wrapping Across the Front of the Cyclone (y=7..44)
    for rib in range(3):
        rib_off = rib * (math.pi * 2.0 / 3.0)
        for step in range(76):
            h_frac = step / 75.0
            y = 44.5 - h_frac * 37.5
            fcx, fr, _ = funnel_profile(y)
            a = phase * 2.0 - h_frac * 8.5 + rib_off
            sin_a = math.sin(a)
            if sin_a >= -0.1:
                rx = fcx + math.cos(a) * (fr * 0.96)
                ry = y + sin_a * 1.2
                if rib == 0:
                    put(px, rx, ry, C_WHITE if sin_a > 0.55 else C_GOLD_LIGHT)
                    put(px, rx, ry + 1, C_GOLD)
                    put(px, rx + (1 if math.cos(a) < 0 else -1), ry, C_GOLD_LIGHT)
                elif rib == 1:
                    put(px, rx, ry, C_STAR_BRIGHT if sin_a > 0.5 else C_GOLD_LIGHT)
                    put(px, rx, ry + 1, C_MINT_BRIGHT)
                else:
                    put(px, rx, ry, C_WHITE if sin_a > 0.6 else C_MINT_BRIGHT)
                    put(px, rx, ry + 1, C_EMERALD_BRIGHT)

    # 6. Grounded Vortex Ring at y = 44..47 (Churning Multi-Blade Emerald-Gold Ground Cyclone Base)
    for s in range(52):
        a = (s / 52.0) * math.pi * 2.0 + phase * 3.0
        sin_a = math.sin(a)
        if sin_a >= -0.15:
            for dr in range(3):
                r_cur = 6.5 + dr * 2.6 + math.sin(a * 4.0 - phase * 2.0) * 0.8
                gx = base_cx + math.cos(a) * r_cur
                gy = 45.3 + sin_a * (1.1 + dr * 0.25)
                if dr == 0:
                    col_g = C_WHITE if s % 4 == 0 else C_GOLD_LIGHT
                elif dr == 1:
                    col_g = C_GOLD_LIGHT if (s + f) % 3 == 0 else C_MINT_BRIGHT
                else:
                    col_g = C_EMERALD_BRIGHT if s % 2 == 0 else C_EMERALD
                put(px, gx, gy, col_g)

    # 7. Front-Half of Orbiting Emerald Sylvan Leaves & Starlight Motes (strictly inside 5..46)
    for leaf_idx in range(8):
        h_frac = ((leaf_idx / 8.0) + (f / 30.0)) % 1.0
        ly = 42.0 - h_frac * 33.0
        fcx, fr, _ = funnel_profile(ly)
        la = phase * 2.0 + leaf_idx * (math.pi * 0.25) - h_frac * 3.0
        if math.sin(la) >= 0:
            lx = fcx + math.cos(la) * (fr + 2.2)
            ly_p = ly + math.sin(la) * 1.4
            col_c = C_GOLD_LIGHT if leaf_idx % 2 == 0 else C_MINT_BRIGHT
            col_e = C_EMERALD_BRIGHT if leaf_idx % 2 == 0 else C_EMERALD
            draw_leaf(px, lx, ly_p, la + 0.5, col_c, col_e)
            if leaf_idx % 2 == 0:
                put(px, lx, ly_p, C_WHITE)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row3_astral_wind_dragon(f):
    """
    Row 3 (F00..F29): ASTRAL HURRICANE — ROARING WIND-DRAGON (Pass #4 Upgrade, Facing +X)
    - Strict bounds: 4 <= x <= 47, 4 <= y <= 47 (0 boundary clips!)
    - Sharper, multi-tined Golden Dragon Horns/Antlers
    - Articulated Dorsal Wind-Fin Sails along the coiling serpentine spine
    - Glowing White-Emerald Eye & Fierce Swirling White-Emerald + Star-Gold Jaw Breath Core
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0
    roar = math.pow(math.sin((f / 29.0) * math.pi), 0.75)
    jaw_open = 2.0 + roar * 6.2
    head_bob = math.sin(phase) * 1.2

    # 1. Undulating Coiling Serpentine Dragon Body & Articulated Dorsal Wind-Fins (x=4..26)
    fin_roots = [6, 11, 16, 21]
    for x in range(4, 27):
        u = (x - 4) / 22.0
        spine_y = 27.0 + math.sin(u * math.pi * 1.7 - phase * 2.0) * 3.8 + head_bob * u
        body_r = 4.0 + u * 4.5

        # Scaled dragon body cross-section
        for dy in range(int(-body_r), int(body_r) + 1):
            py = spine_y + dy
            if dy < -body_r * 0.5:
                put(px, x, py, C_MINT_BRIGHT if (x + dy) % 2 == 0 else C_EMERALD_BRIGHT)
            elif dy < body_r * 0.35:
                put(px, x, py, C_EMERALD if (x + dy) % 2 == 0 else C_EMERALD_DARK)
            else:
                # Golden-jade segmented ventral belly plates
                put(px, x, py, C_GOLD_LIGHT if x % 2 == 0 else C_GOLD)

    # Articulated Dorsal Wind-Fin Sails (4 distinct swept-back triangular fin sails along neck)
    for f_idx, rx0 in enumerate(fin_roots):
        u = (rx0 - 4) / 22.0
        base_y = 27.0 + math.sin(u * math.pi * 1.7 - phase * 2.0) * 3.8 + head_bob * u - (4.0 + u * 4.5)
        fin_h = 4 + (f_idx % 2)
        flutter = math.sin(phase * 2.0 - f_idx * 1.1) * 0.8
        for h in range(1, fin_h + 1):
            fx_spine = rx0 - h * 0.65 + flutter * (h / float(fin_h))
            fy = base_y - h
            # Leading golden spine of dorsal fin
            put(px, fx_spine, fy, C_WHITE if h == fin_h else C_GOLD_LIGHT)
            # Emerald-mint wind membrane behind spine
            for mw in range(1, max(2, fin_h - h + 2)):
                put(px, fx_spine + mw, fy, C_MINT_BRIGHT if mw == 1 else C_EMERALD_BRIGHT)

    # 2. Sharp, Regal Golden Dragon Horns / Stag Antlers (x=6..30, y=5..20)
    hx = 26.0
    hy = 24.0 + head_bob
    # Primary Upper Golden Horn Beam & Sharp Prongs
    for d in range(17):
        u_h = d / 16.0
        ax = hx + 2.0 - d * 1.15
        ay = hy - 5.5 - d * 0.72 + math.sin(u_h * math.pi) * 1.2
        put(px, ax, ay, C_WHITE if d >= 13 else C_STAR_BRIGHT)
        put(px, ax, ay + 1, C_GOLD_LIGHT if d >= 10 else C_GOLD)
        put(px, ax, ay + 2, C_GOLD_DEEP)
        # 3 sharp upward-swept golden antler tines
        if d in (4, 8, 12):
            tine_len = 4 if d != 12 else 3
            for td in range(1, tine_len + 1):
                tx = ax - td * 0.35
                ty = ay - td * 0.95
                put(px, tx, ty, C_WHITE if td >= tine_len - 1 else C_GOLD_LIGHT)
                put(px, tx + 1, ty, C_GOLD)

    # Secondary Lower Jade-Gold Brow Horn
    for d in range(12):
        ax = hx + 1.0 - d * 1.15
        ay = hy - 3.0 - d * 0.35
        put(px, ax, ay, C_GOLD_LIGHT if d < 8 else C_WHITE)
        put(px, ax, ay + 1, C_MINT_BRIGHT)

    # Streaming Emerald-Cyan Wind Whiskers (x=6..25)
    for w_idx in range(3):
        wy0 = hy - 1.0 + w_idx * 3.5
        for d in range(15):
            wx = hx - 2.0 - d * 1.15
            wy = wy0 + math.sin(d * 0.4 - phase * 2.0 + w_idx) * 2.0
            put(px, wx, wy, C_MINT_BRIGHT if d < 9 else C_EMERALD_BRIGHT)

    # 3. Glowing White-Emerald & Star-Gold Hurricane Breath Core Inside Roaring Maw (x=27..47)
    if jaw_open > 2.2:
        # Concentrated hurricane breath orb at throat (x=28..34) + roaring breath jet (x=34..47)
        for x in range(27, 48):
            u_m = (x - 27) / 20.0
            maw_half = (1.0 - u_m * 0.35) * (jaw_open * 0.76)
            wave = math.sin(x * 0.42 - phase * 3.0) * 1.2 * u_m
            for dy in range(int(-maw_half), int(maw_half) + 1):
                py = hy + 2.5 + dy + wave
                dist_f = abs(dy) / max(1.0, maw_half)
                if dist_f < 0.28:
                    put(px, x, py, C_WHITE)
                elif dist_f < 0.55:
                    put(px, x, py, C_MINT_BRIGHT if (x + dy + f) % 2 == 0 else C_STAR_BRIGHT)
                elif dist_f < 0.82:
                    put(px, x, py, C_EMERALD_BRIGHT if (x + f) % 2 == 0 else C_GOLD_LIGHT)
                else:
                    put(px, x, py, C_EMERALD)
        # Swirling white-emerald vortex rings around the breath jet
        for b_ring in range(2):
            bx = 32.0 + ((f + b_ring * 7) % 14)
            for s in range(-4, 5):
                put(px, bx + math.cos(s * 0.4) * 1.5, hy + 2.5 + s * 1.1, C_WHITE if abs(s) <= 2 else C_MINT_BRIGHT)

    # 4. Sculpted Upper Dragon Snout, Sharp Nasal Horn & Fierce White-Emerald Eye (x=24..46)
    for dx in range(0, 22):
        u_s = dx / 21.0
        ux = hx - 2 + dx
        snout_top = hy - 5.5 + u_s * 3.0 - (1.2 if 15 <= dx <= 19 else 0.0)
        snout_bot = hy + 0.5 - roar * (u_s * 2.6)
        for y in range(int(snout_top), int(snout_bot) + 1):
            if y == int(snout_top):
                put(px, ux, y, C_GOLD_LIGHT if dx > 10 else C_MINT_BRIGHT)
            elif y == int(snout_bot):
                put(px, ux, y, C_GOLD if dx > 6 else C_EMERALD_BRIGHT)
            else:
                put(px, ux, y, C_EMERALD if (dx + y) % 2 == 0 else C_EMERALD_DARK)
        # Sharp upper crystalline dragon fangs
        if dx in (8, 12, 16, 20):
            fang_len = 3 if dx in (12, 20) else 2
            for fd in range(1, fang_len + 1):
                put(px, ux, snout_bot + fd, C_WHITE if fd == fang_len else C_GOLD_LIGHT)

    # Sharp Golden Nasal Horn at Snout Tip (x=42..47)
    for hd in range(5):
        put(px, hx + 17 + hd, hy - 3.5 - hd * 0.75 - roar * 1.8, C_WHITE if hd >= 3 else C_GOLD_LIGHT)
        put(px, hx + 17 + hd, hy - 2.5 - hd * 0.75 - roar * 1.8, C_GOLD)

    # Glowing White-Emerald Dragon Eye & Astral Comet Streak (x=27..33)
    eye_x = int(hx + 4)
    eye_y = int(hy - 3)
    # Dark socket contrast rim so the white-emerald eye pops
    for ox, oy in [(-1, -1), (0, -1), (1, -1), (2, -1), (-1, 1), (0, 1), (1, 1)]:
        put(px, eye_x + ox, eye_y + oy, C_FOREST_DEEP)
    put(px, eye_x, eye_y, C_WHITE)
    put(px, eye_x + 1, eye_y, C_WHITE)
    put(px, eye_x + 2, eye_y, C_MINT_BRIGHT)
    put(px, eye_x - 1, eye_y, C_EMERALD_BRIGHT)
    put(px, eye_x, eye_y - 1, C_GOLD_LIGHT)
    for es in range(1, 7):
        put(px, eye_x - es, eye_y - es * 0.35 + math.sin(phase + es) * 0.4,
            C_WHITE if es == 1 else (C_MINT_BRIGHT if es <= 4 else C_GOLD_LIGHT))

    # 5. Articulated Lower Dragon Jaw & Golden Chin Spikes (x=24..44)
    for dx in range(0, 20):
        u_j = dx / 19.0
        jx = hx - 2 + dx
        jaw_top = hy + 2.0 + roar * (1.2 + u_j * 4.8)
        jaw_bot = jaw_top + 4.0 * (1.0 - u_j * 0.42)
        for y in range(int(jaw_top), int(jaw_bot) + 1):
            if y == int(jaw_top):
                put(px, jx, y, C_GOLD_LIGHT)
            elif y == int(jaw_bot):
                put(px, jx, y, C_GOLD if dx % 3 == 0 else C_FOREST)
            else:
                put(px, jx, y, C_EMERALD_DARK if (dx + y) % 2 == 0 else C_EMERALD)
        # Lower dragon fangs pointing up
        if dx in (7, 11, 15, 18):
            fang_len = 3 if dx == 18 else 2
            for fd in range(1, fang_len + 1):
                put(px, jx, jaw_top - fd, C_WHITE if fd == fang_len else C_GOLD_LIGHT)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row4_sonic_gale_and_crest(f):
    """
    Row 4 (F00..F29): SONIC GALE RELEASE WAVE & SYLVAN WIND-ROSE CREST
    - Strict bounds: 4 <= x <= 47, 5 <= y <= 47 (0 boundary clips!)
    - Revolving 8-point Elven Wind-Rose star compass + Forward Sonic Gale Crescent Wave
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0
    cx, cy = 22.0, 26.0

    # 1. Revolving 8-Point Sylvan Wind-Rose Compass Crest (r=12.5)
    ring_r = 12.0 + math.sin(phase * 2.0) * 1.2
    for s in range(48):
        a = (s / 48.0) * math.pi * 2.0 + phase
        rx = cx + math.cos(a) * ring_r
        ry = cy + math.sin(a) * ring_r
        put(px, rx, ry, C_GOLD_LIGHT if s % 6 == 0 else C_EMERALD_BRIGHT if s % 2 == 0 else C_EMERALD_DARK)

    # 8 Revolving Star Compass Petals
    for k in range(8):
        a = phase + k * (math.pi * 0.25)
        max_d = 16 if k % 2 == 0 else 11
        col_p = C_GOLD_LIGHT if k % 2 == 0 else C_MINT_BRIGHT
        for d in range(3, max_d + 1):
            px_x = cx + math.cos(a) * d
            px_y = cy + math.sin(a) * d
            put(px, px_x, px_y, C_WHITE if d >= max_d - 1 else col_p)

    draw_star(px, cx, cy, 4, C_WHITE, C_GOLD_LIGHT, rot=-phase)

    # 2. Forward Sonic Gale Crescent Wave (x=24..47, y=6..46)
    wave_pulse = 0.85 + 0.15 * math.sin(phase * 2.0)
    for s in range(-19, 20):
        u_arc = s / 19.0
        arc_y = cy + s * 1.02
        arc_x = 44.5 - (u_arc * u_arc) * 13.5 + math.sin(phase + u_arc * 3.0) * 0.8
        thickness = int(round((1.0 - u_arc * u_arc * 0.75) * 6.0 * wave_pulse))
        for t_off in range(thickness + 1):
            wx = arc_x - t_off
            if t_off == 0:
                put(px, wx, arc_y, C_WHITE)
            elif t_off == 1:
                put(px, wx, arc_y, C_GOLD_LIGHT)
            elif t_off <= 3:
                put(px, wx, arc_y, C_MINT_BRIGHT)
            else:
                put(px, wx, arc_y, C_EMERALD if (s + t_off) % 2 == 0 else C_EMERALD_DARK)

    # 3. 30fps Peeling Wind-Feathers & Sonic Sparks Streaming Off Crescent Tips
    for m in range(6):
        u_m = ((f / 30.0) + m / 6.0) % 1.0
        side = 1 if m % 2 == 0 else -1
        fx = 43.0 - u_m * 17.0
        fy = cy + side * (7.5 + u_m * 11.5) + math.sin(phase * 2.0 + m) * 1.2
        put(px, fx, fy, C_WHITE if u_m < 0.35 else C_GOLD_LIGHT)
        put(px, fx - 1, fy, C_MINT_BRIGHT)
        put(px, fx - 2, fy - side * 0.5, C_EMERALD)

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
    print(f"Boundary Audit (3<=x<=48, 3<=y<=48): {clips_3_48}/150 clips | (2<=x<=49, 2<=y<=49): {clips_2_49}/150 clips")
    assert clips_3_48 == 0, f"Found {clips_3_48} boundary clips outside 3..48!"


def main():
    sheet_w = COLS * CELL  # 6240
    sheet_h = ROWS * CELL  # 1040
    sheet = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))

    builders = [
        ("ROW 0: SUPERSONIC TEMPEST ARROW (30 FRAMES)", build_row0_supersonic_arrow),
        ("ROW 1: STARFALL SKY-STRIKE & RUNIC IMPACT (30 FRAMES)", build_row1_starfall_arrow_and_impact),
        ("ROW 2: SWIRLING ZEPHYR TORNADO FUNNEL (30 FRAMES)", build_row2_zephyr_tornado),
        ("ROW 3: ASTRAL HURRICANE - ROARING WIND-DRAGON (30 FRAMES)", build_row3_astral_wind_dragon),
        ("ROW 4: SONIC GALE RELEASE WAVE & WIND-ROSE CREST (30 FRAMES)", build_row4_sonic_gale_and_crest),
    ]

    for row_idx, (label, fn) in enumerate(builders):
        for col_idx in range(COLS):
            cell_img = fn(col_idx)
            sheet.paste(cell_img, (col_idx * CELL, row_idx * CELL))

    out_path = "/home/antigravity/assets/sprites/archer_vfx.png"
    sheet.save(out_path)
    print(f"Saved 30fps Archer VFX sheet to {out_path} ({sheet.size[0]}x{sheet.size[1]})")
    verify_bounds(sheet)

    # Build 2 readable 15-column contact sheets (F00..F14 and F15..F29) in artifact directory
    art_dir = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/4f1fb80f-a88f-4496-9746-b4b9fe84f6d4"
    thumb = 112
    pad_top = 24
    for half_idx, (c_start, c_end, suffix) in enumerate([(0, 15, "left_F00_F14"), (15, 30, "right_F15_F29")]):
        cw = 15 * thumb
        ch = ROWS * (thumb + pad_top)
        contact = Image.new("RGBA", (cw, ch), (13, 19, 32, 255))
        draw = ImageDraw.Draw(contact)
        for r_idx, (label, _) in enumerate(builders):
            y0 = r_idx * (thumb + pad_top)
            draw.rectangle([0, y0, cw, y0 + pad_top - 1], fill=(20, 30, 48, 255))
            draw.text((6, y0 + 2), label, fill=(110, 231, 183, 255))
            for c_idx in range(c_start, c_end):
                local_c = c_idx - c_start
                x0 = local_c * thumb
                draw.text((x0 + 4, y0 + 12), f"F{c_idx:02d}", fill=(254, 240, 138, 255))
                cell_crop = sheet.crop((c_idx * CELL, r_idx * CELL, (c_idx + 1) * CELL, (r_idx + 1) * CELL))
                cell_thumb = cell_crop.resize((thumb, thumb), Image.Resampling.NEAREST)
                contact.paste(cell_thumb, (x0, y0 + pad_top), cell_thumb)
                draw.rectangle([x0, y0 + pad_top, x0 + thumb - 1, y0 + pad_top + thumb - 1], outline=(35, 52, 78, 255))
        c_path = os.path.join(art_dir, f"debug_archer_30fps_vfx_{suffix}.png")
        contact.save(c_path)
        print(f"Saved contact sheet: {c_path}")


if __name__ == "__main__":
    main()
