#!/usr/bin/env python3
"""
Builds Sylvara (Archer) 30fps HD-2D Pixel-Art Skill & VFX Sprite Sheet:
- Output: assets/sprites/archer_vfx.png (6240 x 1040, 5 rows x 30 cols at 208x208 per cell)
- Logical canvas per cell: 52x52 upscaled 4x NEAREST to 208x208 (zero black comic inking!)
- Rows:
  Row 0 (F00..F29): SUPERSONIC TEMPEST ARROW (Auto-Attack, Crouch Sniper, Aerial Shot & Fan Volley)
  Row 1 (F00..F29): STARFALL VOLLEY — SKY-STRIKE ARROW (F00..F11) & RUNIC GROUND IMPACT (F12..F29)
  Row 2 (F00..F29): SWIRLING ZEPHYR TORNADO FUNNEL (30fps 3D Helical Funnel & Orbiting Razor Leaves)
  Row 3 (F00..F29): ASTRAL HURRICANE — ROARING WIND-DRAGON (30fps Articulated Jaws, Antlers & Coiling Scales)
  Row 4 (F00..F29): SONIC GALE RELEASE WAVE & SYLVAN WIND-ROSE CREST (Bow-Release Shock-Wave & Cast Seal)
"""

import math
import os
from PIL import Image, ImageDraw, ImageFont

LOGICAL = 52
SCALE = 4
CELL = LOGICAL * SCALE  # 208
COLS = 30
ROWS = 5

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
C_FOREST_DEEP = (6, 78, 59, 235)       # #064e3b

C_CYAN_GLOW = (103, 232, 249, 220)     # #67e8f9
C_TEAL_AURA = (20, 184, 166, 165)      # #14b8a6
C_EMERALD_AURA = (16, 185, 129, 130)
C_GOLD_AURA = (250, 204, 21, 145)


def put(px, x, y, col):
    ix = int(round(x))
    iy = int(round(y))
    if 0 <= ix < LOGICAL and 0 <= iy < LOGICAL:
        if col[3] < 255 and px[ix, iy][3] > 0:
            # Alpha blend over existing pixel
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


def build_row0_supersonic_arrow(f):
    """
    Row 0 (F00..F29): SUPERSONIC TEMPEST ARROW (Pointing +X, cy=26)
    - 30fps longitudinal spin on 4-vane elven fletching & broadhead facets
    - Double-helix emerald & starlight-gold wind ribbons corkscrewing rearward
    - Pulsing supersonic Mach cone & trailing star-motes
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    cy = 26
    phase = (f / 30.0) * math.pi * 2.0

    # 1. Soft Emerald-Teal Slipstream Wake Aura (behind and around shaft)
    for x in range(5, 44):
        u = (x - 5) / 39.0
        half_h = int(1.5 + math.sin(u * math.pi) * 3.5)
        wave_y = math.sin(x * 0.25 - phase * 2.0) * 1.2
        for dy in range(-half_h, half_h + 1):
            if abs(dy) >= half_h - 1:
                put(px, x, cy + wave_y + dy, C_EMERALD_AURA)

    # 2. Back-half of Double-Helix Wind Ribbon (passes BEHIND the arrow shaft)
    for ribbon_idx in range(2):
        r_off = ribbon_idx * math.pi
        col_main = C_MINT if ribbon_idx == 0 else C_GOLD_LIGHT
        col_edge = C_EMERALD_DARK if ribbon_idx == 0 else C_EMERALD
        for x in range(6, 43):
            u = (x - 6) / 37.0
            amp = 2.2 + (1.0 - u) * 3.8
            ang = x * 0.34 - phase * 2.0 + r_off
            if math.cos(ang) < 0:  # behind shaft
                ry = cy + math.sin(ang) * amp
                put(px, x, ry, col_edge)
                put(px, x, ry - 1 if math.sin(ang) > 0 else ry + 1, C_EMERALD_AURA)

    # 3. Spinning 4-Vane Elven Feather Fletching (Back Vanes)
    for k in range(4):
        va = phase + k * (math.pi * 0.5)
        if math.cos(va) < 0:
            vane_r = math.sin(va) * 4.5
            for dx in range(8, 17):
                frac = (dx - 8) / 8.0
                vy = cy + vane_r * (1.0 - frac * 0.55)
                put(px, dx - int((1.0 - frac) * 3), vy, C_EMERALD_DARK)
                put(px, dx - int((1.0 - frac) * 2), vy, C_EMERALD_BRIGHT)

    # 4. Luminous Star-Gold & Emerald Arrow Shaft (x=9..42)
    pulse_x = 10 + ((f * 2) % 30)
    for x in range(9, 43):
        is_pulse = abs(x - pulse_x) <= 3 or abs(x - ((pulse_x + 15) % 30 + 10)) <= 2
        put(px, x, cy - 1, C_FOREST)
        put(px, x, cy, C_WHITE if is_pulse else C_GOLD_LIGHT)
        put(px, x, cy + 1, C_MINT_BRIGHT if is_pulse else C_EMERALD_BRIGHT)
        put(px, x, cy + 2, C_EMERALD_DARK)

    # 5. Spinning 4-Vane Elven Feather Fletching (Front Vanes)
    for k in range(4):
        va = phase + k * (math.pi * 0.5)
        if math.cos(va) >= 0:
            vane_r = math.sin(va) * 4.8
            for dx in range(7, 17):
                frac = (dx - 7) / 9.0
                vy = cy + vane_r * (1.0 - frac * 0.55)
                col_v = C_GOLD_LIGHT if k % 2 == 0 else C_MINT_BRIGHT
                put(px, dx - int((1.0 - frac) * 3), vy, col_v)
                put(px, dx - int((1.0 - frac) * 2), vy, C_EMERALD_BRIGHT)

    # 6. Ornate Spinning Diamond-Barbed Elven Broadhead (x=37..49)
    blade_flatten = 0.55 + 0.45 * abs(math.sin(phase))
    barb_span = max(2, int(round(5.2 * blade_flatten)))
    for dx in range(37, 50):
        prog = (dx - 37) / 12.0  # 0 at base -> 1 at tip
        w = int(round((1.0 - prog) * barb_span))
        for dy in range(-w, w + 1):
            if dx < 40 and abs(dy) < w - 1:
                continue  # swept-back hollow barb notch
            if abs(dy) == w:
                put(px, dx, cy + dy, C_WHITE if prog > 0.4 else C_GOLD_LIGHT)
            elif abs(dy) == w - 1:
                put(px, dx, cy + dy, C_MINT_BRIGHT)
            else:
                put(px, dx, cy + dy, C_EMERALD)
    # Razor Spine Along Broadhead Center
    for dx in range(38, 50):
        put(px, dx, cy, C_WHITE)

    # 7. Supersonic Mach Shock-Cone Peeling Off the Broadhead Tip
    cone_shift = (f % 10) / 10.0
    for c_idx in range(2):
        u_cone = (cone_shift + c_idx * 0.5) % 1.0
        tip_x = int(round(47 - u_cone * 14))
        cone_h = int(round(3 + u_cone * 9))
        col_cone = C_GOLD_LIGHT if u_cone < 0.45 else C_MINT if u_cone < 0.75 else C_EMERALD_AURA
        for s in range(cone_h + 1):
            cx_pt = tip_x - int(s * 0.85)
            put(px, cx_pt, cy - s, col_cone)
            put(px, cx_pt, cy + s, col_cone)

    # 8. Front-half of Double-Helix Wind Ribbon (wraps OVER the arrow shaft)
    for ribbon_idx in range(2):
        r_off = ribbon_idx * math.pi
        col_core = C_WHITE if ribbon_idx == 0 else C_GOLD_LIGHT
        col_mid = C_MINT_BRIGHT if ribbon_idx == 0 else C_GOLD
        for x in range(6, 43):
            u = (x - 6) / 37.0
            amp = 2.2 + (1.0 - u) * 3.8
            ang = x * 0.34 - phase * 2.0 + r_off
            if math.cos(ang) >= 0:  # in front of shaft
                ry = cy + math.sin(ang) * amp
                put(px, x, ry, col_core)
                put(px, x, ry + (1 if math.sin(ang) >= 0 else -1), col_mid)

    # 9. Trailing Starlight Motes & Rotating Broadhead Star-Glint
    draw_star(px, 47, cy, 2 + (f % 2), C_WHITE, C_GOLD_LIGHT, rot=phase)
    for m in range(4):
        mx = int(2 + ((f * 2 + m * 7) % 14))
        my = int(cy + math.sin(phase + m * 1.7) * (3 + m))
        put(px, mx, my, C_GOLD_LIGHT if m % 2 == 0 else C_MINT_BRIGHT)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row1_starfall_arrow_and_impact(f):
    """
    Row 1 (F00..F29): STARFALL VOLLEY — SKY-STRIKE ARROW & RUNIC IMPACT
    - F00..F11 (12 frames): High-Velocity Starfall Comet-Arrow (pointing +X for flight rotation)
    - F12..F29 (18 frames): Upright Ground Impact & Expanding Runic Star-Sigil Eruption (ground line y=42)
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()

    if f < 12:
        # F00..F11: Descending Starfall Comet-Arrow with blazing 8-point astral star-head
        cy = 26
        phase = (f / 12.0) * math.pi * 2.0

        # Comet tail wake (x=3..43)
        for x in range(3, 44):
            u = (x - 3) / 40.0
            spread = (1.0 - u) * 5.2
            wobble = math.sin(x * 0.38 - phase * 2.0) * spread * 0.65
            put(px, x, cy + wobble, C_MINT_BRIGHT if u > 0.4 else C_EMERALD)
            put(px, x, cy - wobble * 0.8, C_GOLD_LIGHT if u > 0.5 else C_EMERALD_DARK)
            if x % 2 == f % 2:
                put(px, x, cy + math.cos(x * 0.45 - phase) * spread, C_EMERALD_AURA)

        # Core Starfall shaft
        for x in range(10, 46):
            put(px, x, cy - 1, C_EMERALD)
            put(px, x, cy, C_WHITE)
            put(px, x, cy + 1, C_GOLD_LIGHT)

        # Swept Astral Wings on the arrow head (x=34..46)
        for dx in range(34, 47):
            u = (dx - 34) / 12.0
            wing_h = int(round((1.0 - u) * 6.5 * (0.75 + 0.25 * math.sin(phase))))
            put(px, dx, cy - wing_h, C_GOLD_LIGHT)
            put(px, dx, cy + wing_h, C_GOLD_LIGHT)
            if wing_h > 1:
                put(px, dx, cy - wing_h + 1, C_MINT_BRIGHT)
                put(px, dx, cy + wing_h - 1, C_MINT_BRIGHT)

        # Blazing 8-point Star-Burst at tip (x=44, y=26)
        draw_star(px, 44, cy, 4, C_WHITE, C_GOLD_LIGHT, rot=phase * 0.5)
        draw_star(px, 44, cy, 3, C_WHITE, C_MINT_BRIGHT, rot=phase * 0.5 + math.pi * 0.25)
    else:
        # F12..F29 (18 frames): Ground Impact & Runic Star-Sigil Eruption (drawn upright, ground at y=42)
        u = (f - 12) / 17.0  # 0.0 -> 1.0
        cx = 26
        gy = 42
        rot = u * math.pi * 1.5

        # 1. Expanding Perspective Ground Runic Star-Sigil (y=36..48)
        rx = 5.0 + (1.0 - math.pow(1.0 - u, 2.2)) * 19.5
        ry = 1.8 + (1.0 - math.pow(1.0 - u, 2.2)) * 5.2
        if u < 0.92:
            steps = 48
            for s in range(steps):
                a = (s / float(steps)) * math.pi * 2.0 + rot
                sx = cx + math.cos(a) * rx
                sy = gy + math.sin(a) * ry
                col_ring = C_GOLD_LIGHT if s % 6 == 0 else C_EMERALD_BRIGHT if u < 0.65 else C_EMERALD_DARK
                put(px, sx, sy, col_ring)
                if s % 6 == 0 and u < 0.8:
                    # 8-point star spikes on ground sigil
                    put(px, cx + math.cos(a) * (rx * 1.18), gy + math.sin(a) * (ry * 1.18), C_WHITE)
                    draw_line(px, cx + math.cos(a) * (rx * 0.4), gy + math.sin(a) * (ry * 0.4), sx, sy, C_MINT)

        # 2. Rising Helical Emerald-Gold Wind Geyser Plume (erupts upward from gy=42 to y=6)
        plume_env = math.sin(u * math.pi)
        max_h = int(10 + math.sin(min(1.0, u * 1.3) * math.pi * 0.5) * 30)
        for h in range(0, max_h):
            h_frac = h / float(max(1, max_h))
            py = gy - h
            cone_w = (2.5 + h_frac * 9.5) * (0.4 + 0.6 * plume_env)
            for strand in range(3):
                sa = rot * 2.2 + strand * (math.pi * 2.0 / 3.0) - h_frac * 4.2
                px_x = cx + math.cos(sa) * cone_w
                if u < 0.85 or (h + strand) % 2 == 0:
                    col_p = C_WHITE if (h < 8 and u < 0.35) else (C_GOLD_LIGHT if strand == 0 else C_MINT_BRIGHT if strand == 1 else C_EMERALD_BRIGHT)
                    put(px, px_x, py, col_p)
                    if plume_env > 0.45:
                        put(px, px_x + (1 if math.cos(sa) > 0 else -1), py, C_EMERALD)

        # 3. Impaled Starfall Arrow Vibrating in the Arena Floor (F12..F25)
        if u < 0.78:
            vib = math.sin((f - 12) * 2.4) * (1.6 * (1.0 - u))
            # Arrow slanted at -76 deg (from ground impact (26, 42) up-left to (20, 16))
            arrow_len = int(26 * (1.0 if u < 0.5 else (0.78 - u) / 0.28))
            for d in range(arrow_len):
                ax = cx - d * 0.22 + vib * (d / 26.0)
                ay = gy - d * 0.96
                put(px, ax, ay, C_WHITE if d < 6 else C_GOLD_LIGHT)
                put(px, ax + 1, ay, C_EMERALD_BRIGHT)
            # Fletching feathers at top of embedded arrow
            if arrow_len >= 20:
                tx = cx - arrow_len * 0.22 + vib
                ty = gy - arrow_len * 0.96
                for fv in (-3, -2, 2, 3):
                    put(px, tx + fv, ty - abs(fv) * 0.5, C_MINT_BRIGHT if fv > 0 else C_GOLD_LIGHT)

        # 4. Impact Starburst & Ejected Razor-Leaf Shards
        if u < 0.45:
            burst_r = 3 + int((u / 0.45) * 8)
            draw_star(px, cx, gy - 2, burst_r, C_WHITE, C_GOLD_LIGHT, rot=u * 3.0)
        for shard in range(6):
            sa = -math.pi * 0.15 - (shard / 5.0) * math.pi * 0.7
            dist = 4.0 + u * 26.0
            sx = cx + math.cos(sa) * dist * 1.15
            sy = gy + math.sin(sa) * dist + (u * u * 10.0)
            if 2 <= sy <= gy:
                put(px, sx, sy, C_GOLD_LIGHT if shard % 2 == 0 else C_MINT_BRIGHT)
                put(px, sx, sy + 1, C_EMERALD)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row2_zephyr_tornado(f):
    """
    Row 2 (F00..F29): SWIRLING ZEPHYR TORNADO FUNNEL (30fps 3D Helical Vortex)
    - Full-height conical S-curving emerald-gold tornado funnel from ground base (y=48) to top mouth (y=4)
    - Back-to-front 3D elliptical wind rings + upward-spiraling helical wind ribbons
    - 8 orbiting razor leaves & star-motes revolving 360 deg around the funnel
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0

    def funnel_center_and_radius(y):
        h_frac = (48.0 - y) / 44.0  # 0.0 at bottom base (y=48) -> 1.0 at top crown (y=4)
        h_frac = max(0.0, min(1.0, h_frac))
        # Tapered conical profile with flaring top lip
        r = 3.2 + math.pow(h_frac, 0.85) * 12.5 + math.pow(h_frac, 2.4) * 5.2
        # Traveling S-curve spine wave
        sway = math.sin(phase - h_frac * 4.2) * (1.2 + math.sin(h_frac * math.pi) * 3.2)
        return 26.0 + sway, r, h_frac

    # 1. Back-Half of Orbiting Razor Leaves (passing BEHIND the tornado funnel)
    for leaf_idx in range(8):
        h_frac = ((leaf_idx / 8.0) + (f / 30.0)) % 1.0
        ly = 47.0 - h_frac * 42.0
        fcx, fr, _ = funnel_center_and_radius(ly)
        la = phase * 2.0 + leaf_idx * (math.pi * 0.25) - h_frac * 3.0
        if math.sin(la) < 0:  # back half
            lx = fcx + math.cos(la) * (fr * 1.18)
            ly_persp = ly + math.sin(la) * 2.2
            put(px, lx, ly_persp, C_FOREST)
            put(px, lx + 1, ly_persp, C_EMERALD_DARK)

    # 2. 3D Conical Tornado Funnel (Back rings -> Inner core wisps -> Front helical bands)
    for y in range(4, 49):
        fcx, fr, h_frac = funnel_center_and_radius(y)
        ring_spin = phase * 2.0 - h_frac * 9.5

        # A. Back-side elliptical wind ring segments
        for seg in range(16):
            a = (seg / 16.0) * math.pi * 2.0 + ring_spin
            if math.sin(a) < 0:
                rx = fcx + math.cos(a) * fr
                if (y + seg) % 2 == 0:
                    put(px, rx, y, C_FOREST_DEEP if abs(math.cos(a)) < 0.7 else C_FOREST)

        # B. Translucent inner vortex eye wall
        inner_r = fr * 0.52
        for ix_off in (-inner_r, inner_r):
            put(px, fcx + ix_off, y, C_EMERALD_AURA)

        # C. Front-side elliptical wind rings & upward-traveling helical wind crests
        for seg in range(20):
            a = (seg / 20.0) * math.pi * 2.0 + ring_spin
            sin_a = math.sin(a)
            if sin_a >= 0:
                rx = fcx + math.cos(a) * fr
                ry = y + sin_a * 1.8
                # Helical highlight band
                band_val = math.sin(a * 2.0 + h_frac * 10.0 - phase * 2.0)
                if band_val > 0.55:
                    col = C_WHITE if (sin_a > 0.75 and band_val > 0.82) else C_GOLD_LIGHT if sin_a > 0.5 else C_MINT_BRIGHT
                    put(px, rx, ry, col)
                elif band_val > -0.15:
                    put(px, rx, ry, C_EMERALD_BRIGHT if sin_a > 0.35 else C_EMERALD)
                elif (y + seg) % 3 == 0:
                    put(px, rx, ry, C_EMERALD_DARK)

    # 3. Outer Helical Wind Ribbons Wrapping Across the Front of the Funnel
    for rib in range(2):
        for step in range(44):
            h_frac = step / 43.0
            y = 48.0 - h_frac * 43.0
            fcx, fr, _ = funnel_center_and_radius(y)
            a = phase * 2.0 - h_frac * 7.5 + rib * math.pi
            if math.sin(a) >= -0.15:
                rx = fcx + math.cos(a) * (fr * 1.05)
                ry = y + math.sin(a) * 2.0
                put(px, rx, ry, C_GOLD_LIGHT if rib == 0 else C_MINT_BRIGHT)
                put(px, rx, ry + 1, C_EMERALD_BRIGHT)

    # 4. Front-Half of Orbiting Razor Leaves & Starlight Motes
    for leaf_idx in range(8):
        h_frac = ((leaf_idx / 8.0) + (f / 30.0)) % 1.0
        ly = 47.0 - h_frac * 42.0
        fcx, fr, _ = funnel_center_and_radius(ly)
        la = phase * 2.0 + leaf_idx * (math.pi * 0.25) - h_frac * 3.0
        if math.sin(la) >= 0:  # front half
            lx = fcx + math.cos(la) * (fr * 1.18)
            ly_persp = ly + math.sin(la) * 2.2
            put(px, lx, ly_persp, C_WHITE if leaf_idx % 2 == 0 else C_GOLD_LIGHT)
            put(px, lx - 1, ly_persp, C_MINT_BRIGHT)
            put(px, lx + 1, ly_persp - 1, C_EMERALD_BRIGHT)

    # 5. Churning Ground Dust-Devil Ring at Funnel Base (y=46..50)
    base_cx, _, _ = funnel_center_and_radius(48)
    for g in range(12):
        ga = phase * 3.0 + (g / 12.0) * math.pi * 2.0
        gx = base_cx + math.cos(ga) * 8.5
        gy = 48.0 + math.sin(ga) * 2.2
        put(px, gx, gy, C_GOLD_LIGHT if g % 3 == 0 else C_MINT_BRIGHT if g % 2 == 0 else C_EMERALD)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row3_astral_wind_dragon(f):
    """
    Row 3 (F00..F29): ASTRAL HURRICANE — ROARING WIND-DRAGON (Facing +X)
    - 30fps coiling emerald-gold dragon neck & scales (x=2..25)
    - Articulated roaring dragon jaws (jaw opens F03..F22 with blazing star-core breath)
    - Swept-back golden-jade stag antlers, comet-eye streak & streaming wind whiskers
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0
    # Smooth roar envelope: sleek at F00..F02, wide roaring jaws F05..F22, snapping shut F23..F29
    roar = math.pow(math.sin((f / 29.0) * math.pi), 0.75)
    jaw_open = 1.5 + roar * 6.5
    head_bob = math.sin(phase) * 1.5

    # 1. Undulating Coiling Serpentine Dragon Body & Dorsal Wind-Fins (x=2..26)
    for x in range(2, 27):
        u = (x - 2) / 24.0
        spine_y = 26.0 + math.sin(u * math.pi * 1.8 - phase * 2.0) * 4.5 + head_bob * u
        body_r = 4.2 + u * 4.8

        # Dorsal wind-fin spikes
        if x % 3 == f % 3:
            fin_h = int(3 + u * 4)
            for fd in range(1, fin_h + 1):
                put(px, x - fd * 0.5, spine_y - body_r - fd, C_GOLD_LIGHT if fd == fin_h else C_MINT_BRIGHT)

        # Scaled body cross-section
        for dy in range(int(-body_r), int(body_r) + 1):
            py = spine_y + dy
            if dy < -body_r * 0.45:
                put(px, x, py, C_MINT_BRIGHT if (x + dy) % 3 == 0 else C_EMERALD_BRIGHT)
            elif dy < body_r * 0.35:
                put(px, x, py, C_EMERALD if (x + dy) % 2 == 0 else C_EMERALD_DARK)
            else:
                # Golden-jade ventral belly plates
                put(px, x, py, C_GOLD_LIGHT if x % 2 == 0 else C_GOLD_DEEP)

    # 2. Swept-Back Elven Stag Antlers & Streaming Emerald Mane (x=8..31, y=5..19)
    hx = 26.0
    hy = 23.0 + head_bob
    for branch in range(2):
        for d in range(16):
            u_b = d / 15.0
            ax = hx + 2 - d * 1.15
            ay = hy - 5 - d * (0.65 + branch * 0.18) + math.sin(u_b * 3.0 - phase) * 1.2
            col_a = C_WHITE if d > 12 else C_GOLD_LIGHT if branch == 0 else C_MINT_BRIGHT
            put(px, ax, ay, col_a)
            put(px, ax, ay + 1, C_GOLD if branch == 0 else C_EMERALD_BRIGHT)
            # Antler tines
            if d in (5, 9, 13) and branch == 0:
                for td in range(1, 5):
                    put(px, ax - td * 0.4, ay - td, C_WHITE if td >= 3 else C_GOLD_LIGHT)

    # Streaming Wind Whiskers / Mane Tendrils
    for w_idx in range(4):
        wy0 = hy - 2 + w_idx * 3.5
        for d in range(18):
            wx = hx - 2 - d * 1.1
            wy = wy0 + math.sin(d * 0.35 - phase * 2.0 + w_idx) * 2.4
            put(px, wx, wy, C_MINT_BRIGHT if d < 10 else C_EMERALD_AURA)

    # 3. Blazing Astral Breath Core Inside Open Dragon Maw (x=27..49)
    if jaw_open > 2.5:
        for x in range(27, 50):
            u_m = (x - 27) / 22.0
            maw_half = (1.0 - u_m * 0.45) * (jaw_open * 0.72)
            wave = math.sin(x * 0.4 - phase * 3.0) * 1.4
            for dy in range(int(-maw_half), int(maw_half) + 1):
                py = hy + 3 + dy + wave * u_m
                if abs(dy) <= 1:
                    put(px, x, py, C_WHITE)
                elif abs(dy) <= 3:
                    put(px, x, py, C_GOLD_LIGHT)
                else:
                    put(px, x, py, C_MINT_BRIGHT if (x + dy) % 2 == 0 else C_EMERALD_BRIGHT)

    # 4. Sculpted Upper Dragon Snout, Nasal Horn & Fierce Star-Gold Eye (x=22..46)
    for dx in range(0, 23):
        u_s = dx / 22.0
        ux = hx - 2 + dx
        snout_top = hy - 6.0 + u_s * 3.5 - (1.2 if 16 <= dx <= 20 else 0.0)
        snout_bot = hy + 1.0 - roar * (u_s * 2.8)
        for y in range(int(snout_top), int(snout_bot) + 1):
            if y == int(snout_top):
                put(px, ux, y, C_GOLD_LIGHT if dx > 12 else C_MINT_BRIGHT)
            elif y == int(snout_bot):
                put(px, ux, y, C_GOLD if dx > 8 else C_EMERALD_BRIGHT)
            else:
                put(px, ux, y, C_EMERALD if (dx + y) % 2 == 0 else C_EMERALD_DARK)
        # Upper crystalline dragon fangs
        if dx in (8, 12, 16, 20):
            fang_len = 3 if dx in (12, 20) else 2
            for fd in range(1, fang_len + 1):
                put(px, ux, snout_bot + fd, C_WHITE if fd == fang_len else C_GOLD_LIGHT)

    # Nasal Horn at Snout Tip (x=42..48)
    for hd in range(6):
        put(px, hx + 18 + hd, hy - 3 - hd * 0.7 - roar * 2.0, C_WHITE if hd >= 4 else C_GOLD_LIGHT)

    # Glowing Star-Gold Dragon Eye & Comet Streak (x=28..33)
    eye_x = int(hx + 4)
    eye_y = int(hy - 3)
    put(px, eye_x, eye_y, C_WHITE)
    put(px, eye_x + 1, eye_y, C_WHITE)
    put(px, eye_x - 1, eye_y, C_GOLD_LIGHT)
    put(px, eye_x, eye_y - 1, C_GOLD)
    for es in range(1, 7):
        put(px, eye_x - es, eye_y - es * 0.4 + math.sin(phase + es) * 0.5, C_GOLD_LIGHT if es < 4 else C_MINT_BRIGHT)

    # 5. Articulated Lower Dragon Jaw & Chin Spikes (x=22..44)
    for dx in range(0, 20):
        u_j = dx / 19.0
        jx = hx - 2 + dx
        jaw_top = hy + 2.0 + roar * (1.2 + u_j * 5.2)
        jaw_bot = jaw_top + 4.2 * (1.0 - u_j * 0.45)
        for y in range(int(jaw_top), int(jaw_bot) + 1):
            if y == int(jaw_top):
                put(px, jx, y, C_GOLD_LIGHT)
            elif y == int(jaw_bot):
                put(px, jx, y, C_FOREST)
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
    - Revolving 8-point Elven Wind-Rose star compass (used by Cast Seal & Release Flash)
    - Expanding forward-arcing Sonic Gale Crescent Wave with 30fps peeling wind-feathers
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0
    cx, cy = 22.0, 26.0

    # 1. Revolving 8-Point Sylvan Wind-Rose Compass Crest (r=14)
    ring_r = 12.5 + math.sin(phase * 2.0) * 1.5
    for s in range(48):
        a = (s / 48.0) * math.pi * 2.0 + phase
        rx = cx + math.cos(a) * ring_r
        ry = cy + math.sin(a) * ring_r
        put(px, rx, ry, C_GOLD_LIGHT if s % 6 == 0 else C_EMERALD_BRIGHT if s % 2 == 0 else C_EMERALD_DARK)

    # 8 Revolving Star Compass Petals
    for k in range(8):
        a = phase + k * (math.pi * 0.25)
        max_d = 17 if k % 2 == 0 else 12
        col_p = C_GOLD_LIGHT if k % 2 == 0 else C_MINT_BRIGHT
        for d in range(3, max_d + 1):
            px_x = cx + math.cos(a) * d
            px_y = cy + math.sin(a) * d
            put(px, px_x, px_y, C_WHITE if d >= max_d - 1 else col_p)

    draw_star(px, cx, cy, 4, C_WHITE, C_GOLD_LIGHT, rot=-phase)

    # 2. Forward Sonic Gale Crescent Wave (x=24..49, y=5..47)
    wave_pulse = 0.85 + 0.15 * math.sin(phase * 2.0)
    for s in range(-20, 21):
        u_arc = s / 20.0  # -1.0 at top tip -> 0.0 at apex -> +1.0 at bottom tip
        arc_y = cy + s * 1.05
        arc_x = 45.0 - (u_arc * u_arc) * 14.0 + math.sin(phase + u_arc * 3.0) * 1.0
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
        fx = 44.0 - u_m * 18.0
        fy = cy + side * (8.0 + u_m * 13.0) + math.sin(phase * 2.0 + m) * 1.5
        put(px, fx, fy, C_WHITE if u_m < 0.35 else C_GOLD_LIGHT)
        put(px, fx - 1, fy, C_MINT_BRIGHT)
        put(px, fx - 2, fy - side * 0.5, C_EMERALD)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


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
