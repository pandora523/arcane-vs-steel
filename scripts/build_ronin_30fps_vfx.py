#!/usr/bin/env python3
"""
Builds Kaze-Maru (Ronin - Storm-Blade Samurai) 30fps HD-2D Pixel-Art Skill & VFX Sprite Sheet:
- Output: assets/sprites/ronin_vfx.png (6240 x 1040, 5 rows x 30 cols at 208x208 per cell)
- Logical canvas per cell: 52x52 upscaled 4x NEAREST to 208x208 (un-inked clean pixel art, strictly inside 2..49)
- Rows:
  Row 0 (F00..F29): ELECTRIC THUNDER-KATANA CRESCENT WAVE (`x = 8..45, y = 8..44`)
  Row 1 (F00..F29): RAIJIN SKY-ODACHI & THUNDER-DRUM GROUND SEAL (`F00..F11` Descending Sky-Odachi, `F12..F29` Impaled in 8-Drum Raijin Crater)
  Row 2 (F00..F29): COILING RAIJIN LIGHTNING DRAGON-PILLAR (`y = 6..47, x = 12..40`)
  Row 3 (F00..F29): COLOSSAL SUSANOO STORM-GOD AVATAR & 8-DRUM RAIJIN HALO (`y = 5..46, x = 6..46`)
  Row 4 (F00..F29): THOUSAND-BLADE JUDGMENT SLASH RING (`y = 6..46, x = 6..46`)
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

# Clean, luminous Electric-Cyan / Indigo-Violet / Raijin-Brass / Diamond-White palette
C_WHITE = (255, 255, 255, 255)
C_DIAMOND_WHITE = (240, 253, 255, 255)
C_CYAN_LIGHT = (103, 232, 249, 255)     # #67e8f9
C_CYAN_BRIGHT = (34, 211, 238, 255)     # #22d3ee
C_CYAN_MID = (6, 182, 212, 255)         # #06b6d4
C_CYAN_DEEP = (14, 116, 144, 255)

C_VIOLET_WHITE = (221, 214, 254, 255)
C_VIOLET_BRIGHT = (167, 139, 250, 255)  # #a78bfa
C_VIOLET_GLOW = (139, 92, 246, 255)     # #8b5cf6
C_VIOLET_DEEP = (76, 29, 149, 255)

C_INDIGO_LIGHT = (99, 102, 241, 255)
C_INDIGO_MID = (49, 46, 129, 255)
C_INDIGO_DARK = (30, 27, 75, 255)
C_INDIGO_DEEP = (15, 16, 38, 255)

C_GOLD_WHITE = (254, 240, 138, 255)
C_BRASS_BRIGHT = (234, 179, 8, 255)
C_BRASS_MID = (180, 110, 24, 255)
C_BRASS_DARK = (120, 53, 15, 255)


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


def draw_raijin_drum(px, cx, cy, r=2.5, rot=0.0, bright=True):
    """Draws a circular Brass & Electric-Cyan Raijin Thunder-Drum with a spinning Tomoe symbol."""
    ir = int(round(r))
    for dy in range(-ir, ir + 1):
        for dx in range(-ir, ir + 1):
            dist = math.hypot(dx, dy)
            if dist <= r + 0.35:
                if dist >= r - 0.65:
                    col = C_GOLD_WHITE if (bright and dx + dy < 0) else C_BRASS_BRIGHT
                elif dist <= 0.8:
                    col = C_WHITE if bright else C_CYAN_LIGHT
                else:
                    ang = math.atan2(dy, dx) - rot
                    spoke = int(round((ang / (2.0 * math.pi)) * 3.0)) % 2 == 0
                    col = C_CYAN_BRIGHT if spoke else C_INDIGO_DARK
                put(px, cx + dx, cy + dy, col)


def draw_spectral_odachi(px, cx, cy, angle_rad, length=18.0, glow=True):
    """Draws a curved spectral Thunder-Odachi centered around (cx, cy) along angle_rad."""
    ux, uy = math.cos(angle_rad), math.sin(angle_rad)
    nx, ny = -uy, ux
    # Hilt (-length*0.35 .. -length*0.15)
    h0 = -int(round(length * 0.38))
    h1 = -int(round(length * 0.14))
    for d in range(h0, h1 + 1):
        hx = cx + ux * d
        hy = cy + uy * d
        put(px, hx, hy, C_BRASS_BRIGHT if d % 2 == 0 else C_INDIGO_DARK)
    # Tsuba guard at h1
    tx, ty = cx + ux * h1, cy + uy * h1
    for t_off in (-2, -1, 0, 1, 2):
        put(px, tx + nx * t_off, ty + ny * t_off, C_GOLD_WHITE if abs(t_off) == 2 else C_BRASS_BRIGHT)
    # Curved Odachi Blade (h1+1 .. +length*0.62)
    b_end = int(round(length * 0.62))
    span = max(1.0, float(b_end - h1))
    for d in range(h1 + 1, b_end + 1):
        u = (d - h1) / span
        sori = math.sin(u * math.pi * 0.85) * 1.1
        bx = cx + ux * d + nx * sori
        by = cy + uy * d + ny * sori
        put(px, bx, by, C_WHITE if (glow and d % 3 == 0) else C_CYAN_LIGHT)
        put(px, bx + nx * 0.7, by + ny * 0.7, C_DIAMOND_WHITE)
        put(px, bx - nx * 0.7, by - ny * 0.7, C_VIOLET_GLOW if d % 2 == 0 else C_INDIGO_MID)


def draw_colossal_sky_odachi(px, cx, tip_y, blade_h=24, phase=0.0, supercharged=False):
    """
    Renders the Colossal Descending / Impaled Raijin Sky-Odachi pointing straight down (`tip_y` at bottom):
    - Razor Diamond-White & Electric-Cyan blade (`y = tip_y - blade_h .. tip_y`) with lightning hamon
    - Ornate Circular Brass & Tomoe-Cyan Raijin Tsuba Guard above the blade (`y = tip_y - blade_h - 2`)
    - Wrapped Indigo & Gold Tsuka Hilt & Kashira Pommel (`y = tip_y - blade_h - 8 .. tip_y - blade_h - 3`)
    - Double-helix cyan-violet lightning spiraling around the blade!
    """
    top_blade_y = max(7, tip_y - blade_h)
    # 1. Wrapped Tsuka Hilt & Kashira Pommel Cap above the Tsuba
    hilt_top = max(3, top_blade_y - 7)
    for y in range(hilt_top, max(4, top_blade_y - 1)):
        for dx in (-1, 0, 1):
            if y == hilt_top:
                col = C_GOLD_WHITE if dx == 0 else C_BRASS_BRIGHT
            elif dx == 0:
                col = C_BRASS_BRIGHT if (y % 2 == 0) else C_CYAN_LIGHT
            else:
                col = C_INDIGO_DARK
            put(px, cx + dx, y, col)

    # 2. Ornate Brass & Electric-Cyan Raijin Tsuba Guard (width 11px: dx = -5..+5)
    tsuba_y = max(5, top_blade_y - 1)
    for dy_t in (-1, 0):
        ty = tsuba_y + dy_t
        for dx in range(-5, 6):
            if abs(dx) == 5:
                col = C_GOLD_WHITE
            elif abs(dx) == 3:
                col = C_CYAN_LIGHT if supercharged else C_CYAN_BRIGHT
            elif abs(dx) <= 1:
                col = C_WHITE if dy_t == 0 else C_GOLD_WHITE
            else:
                col = C_BRASS_BRIGHT if dy_t == -1 else C_BRASS_MID
            put(px, cx + dx, ty, col)

    # 3. Colossal Vertical Sky-Odachi Blade (top_blade_y .. tip_y)
    span = max(1.0, float(tip_y - top_blade_y))
    for y in range(top_blade_y, tip_y + 1):
        u = (y - top_blade_y) / span
        # Taper at kissaki tip (u > 0.80)
        hw = 3 if u < 0.78 else (2 if u < 0.92 else 1)
        for dx in range(-hw, hw + 1):
            if abs(dx) == hw:
                col = C_WHITE if (supercharged or y % 2 == 0) else C_DIAMOND_WHITE
            elif dx == 0:
                # Central Lightning Hamon Fuller
                zig = int(round(math.sin(y * 0.7 - phase * 2.0)))
                col = C_WHITE if zig == 0 else (C_CYAN_LIGHT if y % 2 == 0 else C_VIOLET_BRIGHT)
            elif abs(dx) == hw - 1:
                col = C_CYAN_BRIGHT if dx > 0 else C_VIOLET_GLOW
            else:
                col = C_INDIGO_MID
            put(px, cx + dx, y, col)

    # 4. Double-Helix Cyan & Violet Lightning Coiling Around the Sky-Odachi Blade
    for y in range(top_blade_y, tip_y):
        u = (y - top_blade_y) / span
        hx1 = cx + math.sin(u * math.pi * 3.0 - phase * 2.0) * 5.5
        hx2 = cx - math.sin(u * math.pi * 3.0 - phase * 2.0) * 5.5
        put(px, hx1, y, C_DIAMOND_WHITE if y % 3 == 0 else C_CYAN_BRIGHT)
        put(px, hx2, y, C_VIOLET_WHITE if y % 3 == 0 else C_VIOLET_GLOW)


def build_row0_crescent_wave(f):
    """
    Row 0 (`F00..F29`): **Electric Thunder-Katana Crescent Wave** (`x = 8..45, y = 8..44`)
    - Razor-sharp indigo-violet & electric-cyan crescent blade wave with a white-hot leading edge,
      crackling lightning arcs, and trailing thunder-sparks.
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0
    cy = 26.0

    # 1. Trailing Thunder-Sparks & Indigo-Violet Slipstream (x = 8..28, y = 10..42)
    for w_i in range(6):
        wy0 = cy + (w_i - 2.5) * 4.8
        for d in range(12):
            wx = 26.0 - d * 1.5
            wy = wy0 + math.sin(d * 0.55 - phase * 2.0 + w_i) * 1.4
            if 8 <= wx <= 44 and 8 <= wy <= 44 and (d + f + w_i) % 2 == 0:
                col = C_CYAN_LIGHT if d < 4 else (C_VIOLET_BRIGHT if w_i % 2 == 0 else C_INDIGO_LIGHT)
                put(px, wx, wy, col)

    # 2. Inner Spinning Raijin Tomoe Lightning Core inside the Crescent (x = 24..32, y = 20..32)
    draw_raijin_drum(px, 27, 26, r=3.2, rot=-phase * 2.0, bright=True)

    # 3. Razor-Sharp 4-Band Electric Thunder-Katana Crescent Wave (x = 20..44, y = 8..44)
    for dy in range(-18, 19):
        u = dy / 18.0
        y = cy + dy
        lead_x = 44.0 - (u * u) * 15.0 + math.sin(phase + u * 3.0) * 0.5
        thick = max(1, int(round((1.0 - u * u * 0.78) * 8.5)))
        for t_off in range(thick + 1):
            wx = lead_x - t_off
            if wx < 8:
                continue
            if t_off == 0:
                put(px, wx, y, C_WHITE)
            elif t_off == 1:
                put(px, wx, y, C_DIAMOND_WHITE if abs(u) < 0.7 else C_CYAN_LIGHT)
            elif t_off == 2:
                is_spark = (abs(dy + f) % 4 <= 1)
                put(px, wx, y, C_CYAN_LIGHT if is_spark else C_CYAN_BRIGHT)
            elif t_off <= 4:
                put(px, wx, y, C_VIOLET_BRIGHT if (dy + t_off + f) % 2 == 0 else C_VIOLET_GLOW)
            elif t_off <= 6:
                put(px, wx, y, C_VIOLET_DEEP if (dy + t_off) % 2 == 0 else C_INDIGO_MID)
            else:
                put(px, wx, y, C_INDIGO_DARK)

    # 4. Crackling Multi-Segment Lightning Arcs jumping along the Crescent Spine (x = 12..44, y = 9..43)
    for b_i in range(5):
        u_b = -0.75 + b_i * 0.375
        by = cy + u_b * 17.0
        bx = 44.0 - (u_b * u_b) * 15.0 - 2.0
        zig1_x = max(8, bx - 4 - ((f + b_i) % 3))
        zig1_y = max(8, min(44, by + (2 if (f + b_i) % 2 == 0 else -2)))
        zig2_x = max(8, zig1_x - 4 - ((f + b_i * 2) % 3))
        zig2_y = max(8, min(44, by + (-2 if (f + b_i) % 2 == 0 else 2)))
        draw_line(px, bx, by, zig1_x, zig1_y, C_DIAMOND_WHITE if b_i % 2 == 0 else C_CYAN_LIGHT)
        draw_line(px, zig1_x, zig1_y, zig2_x, zig2_y, C_VIOLET_BRIGHT)

    draw_star(px, 44, cy, 2 + (f % 2), C_WHITE, C_CYAN_LIGHT, rot=phase)
    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row1_sky_odachi(f):
    """
    Row 1 (`F00..F29`): **Raijin Sky-Odachi & Thunder-Drum Ground Seal**
    - `F00..F11`: Colossal descending electric-cyan & brass Sky-Odachi wrapped in double-helix lightning.
    - `F12..F29`: Impaled in a rotating 8-drum Raijin Thunder-Wheel impact crater with radial lightning bolts.
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    cx = 26

    if f < 12:
        # F00..F11: Colossal descending electric-cyan & brass Sky-Odachi wrapped in double-helix lightning
        u = f / 11.0
        phase = u * math.pi * 2.0
        tip_y = int(round(24 + u * 19))  # descends from tip_y=24 down to tip_y=43

        # Ground pre-impact Raijin target seal warming up at y = 43..46
        seal_rx = 6.0 + u * 8.0
        for s in range(28):
            a = (s / 28.0) * math.pi * 2.0 + phase
            put(px, cx + math.cos(a) * seal_rx, 44 + math.sin(a) * 2.0, C_CYAN_BRIGHT if s % 2 == 0 else C_VIOLET_GLOW)

        # Descending Colossal Sky-Odachi with double-helix lightning
        draw_colossal_sky_odachi(px, cx, tip_y, blade_h=20, phase=phase, supercharged=(f >= 7))

        # Trailing sky-lightning sparks above pommel
        for sp in range(8):
            sx = cx + int(math.sin(sp * 1.9 + phase) * 9)
            sy = max(4, tip_y - 22 - (sp * 2 + f) % 7)
            put(px, sx, sy, C_DIAMOND_WHITE if sp % 3 == 0 else (C_CYAN_LIGHT if sp % 2 == 0 else C_VIOLET_BRIGHT))

    else:
        # F12..F29: Impaled in a rotating 8-drum Raijin Thunder-Wheel impact crater with radial lightning bolts
        u = (f - 12) / 17.0
        phase = u * math.pi * 2.0
        gy = 42
        vib_y = -1 if f in (12, 14) else 0

        # 1. Rotating 8-Drum Raijin Thunder-Wheel Impact Crater at y = 37..47, x = 6..46
        ring_grow = 1.0 - math.pow(1.0 - min(1.0, (f - 12) / 14.0), 2.0)
        rx_out = 11.0 + ring_grow * 8.5   # up to 19.5 -> x = 6..46
        ry_out = 2.8 + ring_grow * 2.2    # up to 5.0  -> y = 37..47
        rx_in = 6.0 + ring_grow * 5.0
        ry_in = 1.5 + ring_grow * 1.3

        # Radial Lightning Bolts shooting outward across the crater
        for b_i in range(8):
            ba = (b_i / 8.0) * math.pi * 2.0 + phase * 1.5
            x0 = cx + math.cos(ba) * (rx_in * 0.6)
            y0 = gy + math.sin(ba) * (ry_in * 0.6)
            x1 = cx + math.cos(ba) * rx_out
            y1 = gy + math.sin(ba) * ry_out
            draw_line(px, x0, y0, x1, y1, C_DIAMOND_WHITE if b_i % 2 == 0 else C_VIOLET_BRIGHT)

        # Outer & Inner Thunder-Wheel Rings
        for s in range(52):
            a = (s / 52.0) * math.pi * 2.0 + phase * 1.5
            put(px, cx + math.cos(a) * rx_out, gy + math.sin(a) * ry_out, C_CYAN_LIGHT if s % 2 == 0 else C_VIOLET_GLOW)
            if s % 2 == 0:
                put(px, cx + math.cos(-a) * rx_in, gy + math.sin(-a) * ry_in, C_GOLD_WHITE if s % 4 == 0 else C_BRASS_BRIGHT)

        # 8 Rotating Raijin Thunder-Drums around the impact wheel perimeter
        for d_i in range(8):
            da = (d_i / 8.0) * math.pi * 2.0 + phase * 1.5
            dx_d = cx + math.cos(da) * rx_out
            dy_d = gy + math.sin(da) * ry_out
            draw_raijin_drum(px, dx_d, dy_d, r=1.8, rot=phase * 2.0, bright=(d_i % 2 == 0))

        # 2. Impaled Colossal Sky-Odachi standing tall in the center of the crater (tip at y=43)
        draw_colossal_sky_odachi(px, cx, 43 + vib_y, blade_h=24, phase=phase * 2.0, supercharged=(f <= 24))

        # 3. Erupting Radial Lightning Bolts & Thunder-Sparks jumping skyward (F12..F26)
        if f <= 26:
            for l_side in (-1, 1):
                lx0, ly0 = float(cx + l_side * 3), 40.0
                for seg in range(1, 6):
                    zig = ((f + seg) % 3) - 1
                    lx1 = max(5.0, min(46.0, lx0 + l_side * (2.6 + u * 1.0) + zig))
                    ly1 = max(6.0, min(45.0, ly0 - 4.8 + zig))
                    draw_line(
                        px,
                        lx0,
                        ly0,
                        lx1,
                        ly1,
                        C_WHITE if seg == 1 else (C_CYAN_LIGHT if seg % 2 == 0 else C_VIOLET_BRIGHT),
                    )
                    lx0, ly0 = lx1, ly1

        if f <= 20:
            draw_star(px, cx, 14, 3, C_WHITE, C_GOLD_WHITE, rot=phase)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row2_dragon_pillar(f):
    """
    Row 2 (`F00..F29`): **Coiling Raijin Lightning Dragon-Pillar**
    - Erupting vertical column of electric-cyan & indigo-violet plasma (`y = 6..47, x = 12..40`)
      with a coiling horned Lightning Dragon spiraling up the shaft and a Raijin drum seal at the base.
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    cx = 26
    gy = 45
    phase = (f / 30.0) * math.pi * 2.0

    # 1. Base Raijin Drum Seal at (cx=26, gy=44..47, x=12..40)
    seal_rx = 13.0
    seal_ry = 2.2
    for s in range(44):
        a = (s / 44.0) * math.pi * 2.0 + phase * 2.0
        sx = cx + math.cos(a) * seal_rx
        sy = gy + math.sin(a) * seal_ry
        put(px, sx, sy, C_DIAMOND_WHITE if s % 4 == 0 else (C_CYAN_BRIGHT if s % 2 == 0 else C_VIOLET_GLOW))
    for d_i in range(6):
        da = (d_i / 6.0) * math.pi * 2.0 + phase * 2.0
        draw_raijin_drum(px, cx + math.cos(da) * seal_rx, gy + math.sin(da) * seal_ry, r=1.5, rot=phase)

    if f <= 4:
        # F00..F04: Plasma column erupting upward from the Raijin base seal + emerging Dragon Head
        grow = (f + 1) / 5.0
        top_y = int(round(gy - 37 * grow))
    elif f <= 24:
        # F05..F24: Full-height Vertical Plasma Pillar (y = 7..45) with spiraling Horned Lightning Dragon
        grow = 1.0
        top_y = 8
    else:
        # F25..F29: High-voltage plasma dissipation & ascending dragon burst
        grow = 1.0 - (f - 24) * 0.14
        top_y = 7

    # 2. Vertical Column of Electric-Cyan & Indigo-Violet Plasma (y = top_y..45, x = 18..34)
    col_hw = max(2, int(round(6.5 * grow)))
    for y in range(top_y, gy + 1):
        u_y = (gy - y) / max(1.0, float(gy - top_y))
        flare = 2 if (y >= gy - 3 or y <= top_y + 2) else 0
        hw = min(11, col_hw + flare)
        for dx in range(-hw, hw + 1):
            if abs(dx) <= 1:
                col = C_WHITE if (y + f) % 2 == 0 else C_DIAMOND_WHITE
            elif abs(dx) <= 3:
                col = C_CYAN_LIGHT if (y + dx + f) % 2 == 0 else C_CYAN_BRIGHT
            elif abs(dx) == hw:
                col = C_VIOLET_BRIGHT if (y + f) % 3 == 0 else C_INDIGO_LIGHT
            else:
                col = C_VIOLET_GLOW if (dx + y) % 2 == 0 else C_INDIGO_MID
            put(px, cx + dx, y, col)

    # 3. Coiling Horned Lightning Dragon Spiraling Up the Plasma Shaft (x = 12..40, y = 6..45)
    dragon_steps = 56
    head_y = max(7, top_y + 1)
    head_x = cx
    for s in range(dragon_steps + 1):
        u_d = s / float(dragon_steps)
        dy_d = gy - 1 - u_d * (gy - 1 - head_y)
        spiral_ang = u_d * math.pi * 3.5 - phase * 2.5
        dx_d = cx + math.sin(spiral_ang) * 11.0 * min(1.0, grow + 0.2)
        depth_front = math.cos(spiral_ang) >= -0.15
        body_r = 2 if u_d < 0.88 else 3
        if depth_front or abs(dx_d - cx) > col_hw:
            for oy in range(-body_r, body_r + 1):
                for ox in range(-body_r, body_r + 1):
                    if abs(ox) + abs(oy) <= body_r + 1:
                        if ox == 0 and oy == 0:
                            c_dr = C_WHITE if s % 3 == 0 else C_DIAMOND_WHITE
                        elif oy < 0:
                            c_dr = C_CYAN_LIGHT if s % 2 == 0 else C_GOLD_WHITE
                        else:
                            c_dr = C_CYAN_BRIGHT if s % 2 == 0 else C_VIOLET_BRIGHT
                        put(px, dx_d + ox, dy_d + oy, c_dr)
            # Dorsal golden-cyan dragon spine fin spikes along outer curve
            if s % 4 == 0:
                sign_x = 1 if dx_d >= cx else -1
                put(px, dx_d + sign_x * (body_r + 1), dy_d - 1, C_GOLD_WHITE)
                put(px, dx_d + sign_x * (body_r + 2), dy_d - 2, C_CYAN_LIGHT)
        if s == dragon_steps:
            head_x, head_y = int(round(dx_d)), int(round(dy_d))

    # 4. Horned Raijin Dragon Head at the Apex of the Spiral (head_x, head_y, clamped inside y >= 6, x = 14..38)
    hx_c = max(16, min(36, head_x))
    hy_c = max(8, min(38, head_y))
    for dy_h in range(-2, 3):
        for dx_h in range(-4, 5):
            if abs(dx_h) == 4 and abs(dy_h) == 2:
                continue
            if dy_h == -1 and abs(dx_h) == 2:
                col_h = C_GOLD_WHITE  # Blazing dragon eyes
            elif abs(dx_h) <= 1 and dy_h <= 0:
                col_h = C_WHITE
            elif dy_h == 2 and abs(dx_h) <= 2:
                col_h = C_VIOLET_BRIGHT
            else:
                col_h = C_CYAN_LIGHT if dy_h <= 0 else C_CYAN_BRIGHT
            put(px, hx_c + dx_h, hy_c + dy_h, col_h)
    # Twin Golden-Cyan Dragon Antler Horns sweeping upward to y >= 6
    for side in (-1, 1):
        for h_s in range(1, 4):
            put(px, hx_c + side * (2 + h_s), max(6, hy_c - 1 - h_s), C_GOLD_WHITE if h_s == 3 else C_BRASS_BRIGHT)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row3_susanoo_avatar(f):
    """
    Row 3 (`F00..F29`): **Colossal Susanoo Storm-God Avatar & 8-Drum Raijin Halo**
    - Towering horned samurai storm-deity bust (`y = 5..46, x = 6..46`) with glowing cyan eyes,
      8 rotating Raijin thunder-drums with tomoe symbols around his shoulders, and crossed spectral Odachi blades.
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0
    cx, cy = 26.0, 26.0
    bob = int(round(math.sin(phase) * 1.0))

    # 1. Outer Storm-Ring & 8 Rotating Raijin Thunder-Drums with Tomoe Symbols (r = 18.5 -> x = 6..46, y = 6..46)
    halo_r = 18.5
    for s in range(60):
        a = (s / 60.0) * math.pi * 2.0 + phase
        rx = cx + math.cos(a) * halo_r
        ry = cy + math.sin(a) * halo_r
        put(px, rx, ry, C_CYAN_LIGHT if s % 3 == 0 else (C_VIOLET_GLOW if s % 2 == 0 else C_INDIGO_LIGHT))

    for d_i in range(8):
        da = (d_i / 8.0) * math.pi * 2.0 + phase
        dx_d = cx + math.cos(da) * halo_r
        dy_d = cy + math.sin(da) * halo_r
        draw_raijin_drum(px, dx_d, dy_d, r=2.4, rot=-phase * 2.0, bright=(d_i % 2 == 0))
        # Crackling lightning spoke from drum to ring interior
        draw_line(
            px,
            cx + math.cos(da) * (halo_r - 2.5),
            cy + math.sin(da) * (halo_r - 2.5),
            cx + math.cos(da) * (halo_r - 5.5),
            cy + math.sin(da) * (halo_r - 5.5),
            C_CYAN_BRIGHT if d_i % 2 == 0 else C_VIOLET_BRIGHT,
        )

    # 2. Crossed Spectral Odachi Blades Behind the Susanoo Avatar's Shoulders (-45 deg and -135 deg)
    draw_spectral_odachi(px, cx - 7, cy - 3 + bob, math.radians(-132.0), length=21.0, glow=True)
    draw_spectral_odachi(px, cx + 7, cy - 3 + bob, math.radians(-48.0), length=21.0, glow=True)

    # 3. Towering Susanoo Winged Sode Shoulders & Storm-Core Do Breastplate (y = 22..44, x = 11..41)
    for y in range(22 + bob, 44 + bob):
        u_y = (y - (22 + bob)) / 22.0
        hw = int(round(15.0 * (1.0 - u_y * 0.35)))
        for dx in range(-hw, hw + 1):
            if abs(dx) == hw or y == 22 + bob:
                col = C_CYAN_LIGHT if abs(dx) > 10 else C_BRASS_BRIGHT
            elif abs(dx) <= 4 and 28 + bob <= y <= 38 + bob:
                # Blazing Storm-Ribcage / Raijin Core on Chest
                is_rib = ((y - bob) % 2 == 0) or dx == 0
                col = C_WHITE if (dx == 0 and (y + f) % 2 == 0) else (C_CYAN_LIGHT if is_rib else C_VIOLET_GLOW)
            elif abs(dx) in (9, 10, 11) and y <= 31 + bob:
                col = C_VIOLET_BRIGHT if (dx + y) % 2 == 0 else C_CYAN_BRIGHT
            else:
                col = C_INDIGO_DARK if (dx + y) % 2 == 0 else C_INDIGO_DEEP
            put(px, cx + dx, y, col)

    # 4. Fierce Menpo Oni-Mask & Crescent Kabuto Helm (y = 11..22, x = 19..33)
    for y in range(12 + bob, 22 + bob):
        for dx in range(-6, 7):
            if abs(dx) == 6 or y == 12 + bob:
                col = C_CYAN_BRIGHT if y <= 15 + bob else C_INDIGO_LIGHT
            elif y in (16 + bob, 17 + bob) and abs(dx) in (2, 3):
                # Blazing Electric-Cyan Storm-God Eyes
                col = C_WHITE if abs(dx) == 2 else C_CYAN_LIGHT
            elif y == 20 + bob and abs(dx) <= 3:
                # Fierce Oni-Mask Fangs
                col = C_GOLD_WHITE if abs(dx) in (1, 3) else C_INDIGO_DEEP
            elif dx == 0 and y <= 15 + bob:
                col = C_GOLD_WHITE
            else:
                col = C_INDIGO_MID if (dx + y) % 2 == 0 else C_INDIGO_DARK
            put(px, cx + dx, y, col)

    # Towering Golden-Cyan Crescent Maedate Horns sweeping skyward (`y = 6..15`)
    for side in (-1, 1):
        for h_step in range(9):
            hx = cx + side * (3 + h_step * 0.95)
            hy = 14 + bob - h_step * 0.95
            put(px, hx, hy, C_WHITE if h_step >= 7 else (C_GOLD_WHITE if h_step >= 4 else C_BRASS_BRIGHT))
            put(px, hx - side, hy, C_CYAN_LIGHT if h_step >= 5 else C_BRASS_MID)

    # Apex Storm-Crest Star above Susanoo's Kabuto (y = 6..8)
    draw_star(px, cx, 7 + bob, 2, C_WHITE, C_CYAN_LIGHT, rot=-phase)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row4_judgment_slash_ring(f):
    """
    Row 4 (`F00..F29`): **Thousand-Blade Judgment Slash Ring** (`y = 6..46, x = 6..46`)
    - Rotating storm-wheel & crisscrossing high-velocity electric-cyan / violet katana slash arcs (`y = 6..46, x = 6..46`).
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0
    cx, cy = 26.0, 26.0

    # 1. Outer Rotating Raijin Storm-Wheel Ring (`r = 18.5 -> x = 7..45, y = 7..45`)
    wheel_r = 18.0 + math.sin(phase * 2.0) * 0.8
    for s in range(64):
        a = (s / 64.0) * math.pi * 2.0 + phase * 1.5
        rx = cx + math.cos(a) * wheel_r
        ry = cy + math.sin(a) * wheel_r
        if s % 8 == 0:
            put(px, rx, ry, C_GOLD_WHITE)
            put(px, cx + math.cos(a) * (wheel_r - 1.2), cy + math.sin(a) * (wheel_r - 1.2), C_BRASS_BRIGHT)
        else:
            put(px, rx, ry, C_CYAN_LIGHT if s % 2 == 0 else C_VIOLET_GLOW)

    # 8 Storm-Wheel Spokes
    for spk in range(8):
        sa = phase * 1.5 + spk * (math.pi / 4.0)
        draw_line(
            px,
            cx + math.cos(sa) * 4.0,
            cy + math.sin(sa) * 4.0,
            cx + math.cos(sa) * (wheel_r - 1.5),
            cy + math.sin(sa) * (wheel_r - 1.5),
            C_INDIGO_MID if spk % 2 == 0 else C_VIOLET_DEEP,
        )

    # 2. Crisscrossing High-Velocity Electric-Cyan / Violet Katana Slash Chords across the Ring (`x = 6..46, y = 6..46`)
    num_slashes = 7
    for s_i in range(num_slashes):
        ang_mid = phase * 2.0 + s_i * (math.pi * 2.0 / num_slashes)
        chord_off = ((s_i % 3) - 1) * 5.2
        ux, uy = -math.sin(ang_mid), math.cos(ang_mid)
        nx, ny = math.cos(ang_mid), math.sin(ang_mid)
        is_cyan = (s_i + f) % 2 == 0
        for step in range(-17, 18):
            u_s = step / 17.0
            curve = (1.0 - u_s * u_s) * 3.8
            sx = cx + nx * (chord_off + curve) + ux * step
            sy = cy + ny * (chord_off + curve) + uy * step
            if math.hypot(sx - cx, sy - cy) <= 19.5:
                put(px, sx, sy, C_WHITE if abs(step) <= 5 else (C_DIAMOND_WHITE if is_cyan else C_VIOLET_WHITE))
                put(
                    px,
                    sx - nx * 0.9,
                    sy - ny * 0.9,
                    C_CYAN_BRIGHT if is_cyan else C_VIOLET_BRIGHT,
                )
                if abs(step) <= 11:
                    put(
                        px,
                        sx - nx * 1.8,
                        sy - ny * 1.8,
                        C_CYAN_DEEP if is_cyan else C_VIOLET_GLOW,
                    )

    # 3. Central Raijin Tomoe Eye & Intersection Star Flash Sparks
    draw_raijin_drum(px, cx, cy, r=3.0, rot=-phase * 3.0, bright=True)
    for st_i in range(4):
        sta = -phase * 2.0 + st_i * (math.pi * 0.5) + 0.4
        st_r = 11.5 + (st_i % 2) * 3.5
        draw_star(
            px,
            cx + math.cos(sta) * st_r,
            cy + math.sin(sta) * st_r,
            2,
            C_WHITE,
            C_CYAN_LIGHT if st_i % 2 == 0 else C_VIOLET_BRIGHT,
            rot=phase,
        )

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def main():
    sheet_w = COLS * CELL  # 6240
    sheet_h = ROWS * CELL  # 1040
    sheet = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))

    builders = [
        ("ROW 0: ELECTRIC THUNDER-KATANA CRESCENT WAVE (30 FRAMES)", build_row0_crescent_wave),
        ("ROW 1: RAIJIN SKY-ODACHI & THUNDER-DRUM GROUND SEAL (30 FRAMES)", build_row1_sky_odachi),
        ("ROW 2: COILING RAIJIN LIGHTNING DRAGON-PILLAR (30 FRAMES)", build_row2_dragon_pillar),
        ("ROW 3: COLOSSAL SUSANOO STORM-GOD AVATAR & 8-DRUM HALO (30 FRAMES)", build_row3_susanoo_avatar),
        ("ROW 4: THOUSAND-BLADE JUDGMENT SLASH RING (30 FRAMES)", build_row4_judgment_slash_ring),
    ]

    clip_count = 0
    for row_idx, (label, fn) in enumerate(builders):
        row_Logical = []
        for col_idx in range(COLS):
            cell_img = fn(col_idx)
            # Check logical 52x52 bounds (upscaled 4x -> border 2px logical = 8px upscaled)
            arr = np.array(cell_img, dtype=np.uint8)
            if (
                np.any(arr[:8, :, 3] > 0)
                or np.any(arr[200:, :, 3] > 0)
                or np.any(arr[:, :8, 3] > 0)
                or np.any(arr[:, 200:, 3] > 0)
            ):
                clip_count += 1
            row_Logical.append(arr)
            sheet.paste(cell_img, (col_idx * CELL, row_idx * CELL))
        adj_diffs = sum(1 for i in range(29) if np.any(row_Logical[i] != row_Logical[i + 1]))
        print(f"{label:66s}: {adj_diffs}/29 adjacent transitions distinct")

    print(f"VFX Boundary clip audit across 150 frames (outside 2..49 logical): {clip_count}/150")
    out_path = "/home/antigravity/assets/sprites/ronin_vfx.png"
    sheet.save(out_path)
    print(f"Saved 30fps Ronin VFX sheet to {out_path} ({sheet.size[0]}x{sheet.size[1]})")

    # Build contact sheet in artifact directory
    art_dir = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/4f1fb80f-a88f-4496-9746-b4b9fe84f6d4"
    thumb = 80
    pad_top = 24
    cw = COLS * thumb
    ch = ROWS * (thumb + pad_top)
    contact = Image.new("RGBA", (cw, ch), (13, 17, 30, 255))
    draw = ImageDraw.Draw(contact)

    for r_idx, (label, _) in enumerate(builders):
        y0 = r_idx * (thumb + pad_top)
        draw.rectangle([0, y0, cw, y0 + pad_top - 1], fill=(22, 28, 50, 255))
        draw.text((6, y0 + 2), label, fill=(103, 232, 249, 255))
        for c_idx in range(COLS):
            x0 = c_idx * thumb
            draw.text((x0 + 4, y0 + 12), f"F{c_idx:02d}", fill=(167, 139, 250, 255))
            cell_crop = sheet.crop((c_idx * CELL, r_idx * CELL, (c_idx + 1) * CELL, (r_idx + 1) * CELL))
            cell_thumb = cell_crop.resize((thumb, thumb), Image.Resampling.NEAREST)
            contact.paste(cell_thumb, (x0, y0 + pad_top), cell_thumb)
            draw.rectangle([x0, y0 + pad_top, x0 + thumb - 1, y0 + pad_top + thumb - 1], outline=(38, 48, 78, 255))

    c_path = os.path.join(art_dir, "debug_ronin_30fps_vfx.png")
    contact.save(c_path)
    print(f"Saved VFX contact sheet: {c_path} ({contact.size[0]}x{contact.size[1]})")


if __name__ == "__main__":
    main()
