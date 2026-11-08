#!/usr/bin/env python3
"""
Builds Freyja (Valkyrie - Crimson-Gold Wyvern Dragoon) 30fps HD-2D Pixel-Art Skill & VFX Sprite Sheet:
- Output: assets/sprites/valkyrie_vfx.png (6240 x 1040, 5 rows x 30 cols at 208x208 per cell)
- Logical canvas per cell: 52x52 upscaled 4x NEAREST to 208x208 (strictly clamped inside 2 <= x <= 49, 2 <= y <= 49)
- Rows:
  Row 0 (F00..F29): CRIMSON-GOLD WYVERN SPIRAL LANCE-WAVE (x = 6..46, y = 10..42)
  Row 1 (F00..F29): DESCENDING GUNGNIR SKY-LANCE & VALHALLA IMPACT CRATER
  Row 2 (F00..F29): ERUPTING DRAGONFIRE RUBY-GOLD OBELISK SPIRE (y = 6..47, x = 11..41)
  Row 3 (F00..F29): COLOSSAL BAHAMUT / ELDER WYVERN SOVEREIGN & VALHALLA SEAL (y = 5..46, x = 5..47)
  Row 4 (F00..F29): VALHALLA DRAGONFIRE CRESCENT & STAR-CROSS RING (y = 6..46, x = 6..46)
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

# Clean, luminous Crimson-Ruby / Molten-Gold / Dragonfire-Amber / Obsidian palette
C_WHITE = (255, 255, 255, 255)
C_GOLD_WHITE = (254, 249, 195, 255)
C_GOLD_LIGHT = (253, 224, 71, 255)
C_GOLD = (251, 191, 36, 255)
C_AMBER = (245, 158, 11, 255)
C_GOLD_DEEP = (180, 83, 9, 255)

C_ROSE_WHITE = (255, 228, 230, 255)
C_ROSE_FLAME = (251, 113, 133, 255)
C_RUBY_CORE = (244, 63, 94, 255)
C_RUBY_BRIGHT = (225, 29, 72, 255)
C_DRAGON_ORANGE = (249, 115, 22, 255)
C_CRIMSON = (185, 28, 28, 255)
C_CRIMSON_DARK = (127, 29, 29, 255)
C_CRIMSON_DEEP = (68, 12, 18, 240)
C_OBSIDIAN = (28, 32, 46, 255)

C_RUBY_AURA = (225, 29, 72, 145)
C_GOLD_AURA = (251, 191, 36, 150)


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


def draw_8pt_valhalla_starcross(px, cx, cy, r_main, r_diag, col_core, col_cardinal, col_diag, rot=0.0):
    """Draws a rotating 8-point Valhalla Star-Cross with cardinal lance-rays and diagonal ruby-gold rays."""
    put(px, cx, cy, C_WHITE)
    for k in range(8):
        a = rot + k * (math.pi * 0.25)
        is_cardinal = (k % 2 == 0)
        rmax = int(round(r_main if is_cardinal else r_diag))
        for d in range(1, rmax + 1):
            if d == 1:
                col = col_core
            elif is_cardinal:
                col = col_cardinal if d < rmax else C_GOLD_WHITE
            else:
                col = col_diag
            put(px, cx + math.cos(a) * d, cy + math.sin(a) * d, col)


def draw_ruby_diamond(px, cx, cy, r, col_core, col_edge):
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


def build_row0_wyvern_spiral_lance_wave(f):
    """
    Row 0: Crimson-Gold Wyvern Spiral Lance-Wave (`x = 6..46, y = 10..42`, 30 frames):
    - Supersonic crimson-ruby & molten-gold spearhead wave facing +X (`x = 14..46, y = 14..38`)
    - Wrapped in a double-helix dragonfire spiral (`x = 8..44, y = 12..40`) and vertical sonic boom ring (`x = 19..25, y = 10..42`).
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0
    cy = 26.0

    # 1. Background Half of the Sonic Boom Ring (`x = 19..25, y = 10..42`) & Slipstream Wake (`x = 6..20`)
    boom_cx = 22.0 + math.sin(phase) * 0.8
    for s in range(44):
        a = (s / 44.0) * math.pi * 2.0 + phase
        if math.cos(a) < 0.0:  # back half of ring
            bx = max(6.0, min(46.0, boom_cx + math.cos(a) * 3.2))
            by = max(10.0, min(42.0, cy + math.sin(a) * 15.2))
            put(px, bx, by, C_GOLD if s % 2 == 0 else C_RUBY_BRIGHT)

    # Trailing supersonic dragonfire wake lines (x = 6..20, y = 14..38)
    for w_i in range(5):
        wy0 = cy + (w_i - 2) * 5.0
        for d in range(14):
            wx = 20.0 - d * 1.0
            wy = max(10.0, min(42.0, wy0 + math.sin(d * 0.45 - phase * 2.0 + w_i) * 1.4))
            if wx >= 6.0 and (d + f + w_i) % 2 == 0:
                put(px, wx, wy, C_GOLD_LIGHT if d < 5 else (C_RUBY_CORE if d < 10 else C_CRIMSON))

    # 2. Background Pass of Double-Helix Dragonfire Spiral (x = 8..44, y = 12..40)
    for x in range(8, 45):
        u_x = (x - 8) / 36.0
        env_r = (0.35 + 0.65 * math.sin(u_x * math.pi)) * 11.5
        ang_h = u_x * math.pi * 3.5 - phase * 2.0
        for strand in (0, 1):
            sa = ang_h + strand * math.pi
            if math.cos(sa) < 0.0:
                hy = max(10.0, min(42.0, cy + math.sin(sa) * env_r))
                put(px, x, hy, C_AMBER if strand == 0 else C_CRIMSON)
                put(px, x, max(10.0, min(42.0, hy + (1 if hy < cy else -1))), C_GOLD_AURA if strand == 0 else C_RUBY_AURA)

    # 3. Supersonic Crimson-Ruby & Molten-Gold Wyvern Spearhead Wave (x = 14..46, y = 14..38)
    # Flared Golden-Crimson Wyvern Wing-Fins at collar (x = 22..32, y = 13..39)
    for side in (-1, 1):
        for dx_w in range(0, 11):
            u_w = dx_w / 10.0
            wx = 31 - dx_w
            wy = cy + side * (3.0 + u_w * 9.5)
            put(px, wx, wy, C_GOLD_WHITE if dx_w >= 8 else C_GOLD)
            put(px, wx + 1, wy - side, C_RUBY_CORE if dx_w % 2 == 0 else C_CRIMSON)
            put(px, wx + 2, wy - side * 2, C_GOLD_DEEP)

    # Tapered Diamond-Faceted Spearhead Body & Fuller Core (x = 14..46)
    for x in range(14, 47):
        if x < 24:
            # Energy shaft tail (x = 14..23)
            half_h = 2
        elif x <= 31:
            # Flaring spearhead base (x = 24..31)
            half_h = int(round(2.0 + ((x - 24) / 7.0) * 4.5))
        else:
            # Razor-tapered Gungnir spearhead cone (x = 32..46 -> apex at x = 46)
            half_h = int(round((1.0 - (x - 31) / 15.0) * 6.5))

        for dy in range(-half_h, half_h + 1):
            wy = cy + dy
            if dy == 0:
                put(px, x, wy, C_WHITE if x >= 26 else C_GOLD_WHITE)
            elif abs(dy) == 1:
                put(px, x, wy, C_GOLD_WHITE if (x + f) % 3 == 0 else C_GOLD)
            elif abs(dy) == half_h:
                put(px, x, wy, C_GOLD_WHITE if x >= 34 else C_GOLD_LIGHT)
            elif abs(dy) == half_h - 1:
                put(px, x, wy, C_AMBER if dy < 0 else C_RUBY_CORE)
            else:
                put(px, x, wy, C_RUBY_BRIGHT if dy < 0 else C_CRIMSON)

    # 4. Foreground Pass of Double-Helix Dragonfire Spiral & Foreground Sonic Boom Ring
    for x in range(8, 45):
        u_x = (x - 8) / 36.0
        env_r = (0.35 + 0.65 * math.sin(u_x * math.pi)) * 11.5
        ang_h = u_x * math.pi * 3.5 - phase * 2.0
        for strand in (0, 1):
            sa = ang_h + strand * math.pi
            if math.cos(sa) >= 0.0:
                hy = max(10.0, min(42.0, cy + math.sin(sa) * env_r))
                c_main = C_GOLD_WHITE if strand == 0 else C_ROSE_WHITE
                c_sub = C_GOLD if strand == 0 else C_RUBY_CORE
                put(px, x, hy, c_main)
                put(px, x, max(10.0, min(42.0, hy - 1)), c_sub)
                put(px, max(6, x - 1), hy, C_AMBER if strand == 0 else C_RUBY_BRIGHT)

    for s in range(44):
        a = (s / 44.0) * math.pi * 2.0 + phase
        if math.cos(a) >= 0.0:
            bx = max(6.0, min(46.0, boom_cx + math.cos(a) * 3.2))
            by = max(10.0, min(42.0, cy + math.sin(a) * 15.2))
            put(px, bx, by, C_WHITE if s % 4 == 0 else (C_GOLD_WHITE if s % 2 == 0 else C_RUBY_CORE))

    # 5. Blazing Spearhead Apex Star at (45, 26)
    draw_star(px, 45, cy, 3, C_WHITE, C_GOLD_LIGHT, rot=phase)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row1_gungnir_skylance_impact(f):
    """
    Row 1: Descending Gungnir Sky-Lance & Valhalla Impact Crater (30 frames):
    - `F00..F11`: Colossal descending Crimson-Gold Winged Gungnir Dragon-Lance plummeting point-down.
    - `F12..F29`: Impaled in a double-ringed golden-crimson Valhalla rune crater with rising dragonfire plumes.
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    cx = 26

    if f < 12:
        phase = (f / 12.0) * math.pi * 2.0

        # 1. Background Spiraling Dragonfire Wake
        for y in range(4, 45):
            u_y = (y - 4) / 41.0
            spiral_bg = -math.sin(y * 0.42 - phase * 2.0) * (5.5 + (1.0 - u_y) * 2.0)
            put(px, cx + spiral_bg, y, C_RUBY_AURA if y % 2 == 0 else C_GOLD_AURA)

        # 2. Ruby-Gold Dragon Pommel & Ringed Polearm Shaft at top (y = 4..12)
        draw_star(px, cx, 5, 3, C_WHITE, C_GOLD, rot=phase)
        for y in range(6, 13):
            put(px, cx - 1, y, C_GOLD_DEEP)
            put(px, cx, y, C_GOLD_WHITE if y % 2 == 0 else C_CRIMSON)
            put(px, cx + 1, y, C_GOLD_DEEP)

        # 3. Sweeping 4-Tiered Crimson-Gold Valkyrie Dragon-Wings on Crossguard Collar (y = 6..17, x = 7..45)
        wing_flap = math.sin(phase) * 0.9
        for side in (-1, 1):
            for tier in range(4):
                max_span = 18 - tier * 3
                base_y = 13 + tier
                for d in range(2, max_span + 1):
                    u_w = d / float(max_span)
                    wx = cx + side * d
                    wy = base_y - int(round((u_w ** 1.15) * (7.0 - tier * 1.1) - wing_flap * u_w))
                    if d >= max_span - 1:
                        col_w = C_WHITE if tier == 0 else C_GOLD_WHITE
                    elif tier % 2 == 0:
                        col_w = C_GOLD_LIGHT if d < max_span * 0.6 else C_GOLD
                    else:
                        col_w = C_RUBY_CORE if d < max_span * 0.6 else C_ROSE_FLAME
                    put(px, wx, wy, col_w)
                    put(px, wx, wy + 1, C_CRIMSON if tier < 3 else C_GOLD_DEEP)

        # Central Crossguard Ruby-Diamond Gem
        draw_ruby_diamond(px, cx, 13, 2, C_RUBY_CORE, C_GOLD_WHITE)

        # 4. Colossal Tapered Crimson-Ruby & White-Gold Gungnir Spearhead (y = 15..47)
        for y in range(15, 48):
            prog = (y - 15) / 32.0
            half_w = 5 if (0.12 <= prog <= 0.42) else (4 if prog < 0.68 else int(round((1.0 - (prog - 0.68) / 0.32) * 4.0)))
            for dx in range(-half_w, half_w + 1):
                if abs(dx) == half_w:
                    put(px, cx + dx, y, C_WHITE if prog > 0.55 else C_GOLD_WHITE)
                elif abs(dx) == half_w - 1:
                    put(px, cx + dx, y, C_GOLD if (y + abs(dx)) % 2 == 0 else C_AMBER)
                elif dx == 0:
                    is_rune = ((y + f) % 3 == 0) and (prog < 0.85)
                    put(px, cx, y, C_WHITE if not is_rune else C_GOLD_LIGHT)
                elif abs(dx) == 1 and ((y + f) % 4 == 0) and (prog < 0.78):
                    put(px, cx + dx, y, C_GOLD)
                else:
                    put(px, cx + dx, y, C_RUBY_CORE if dx < 0 else C_CRIMSON)

        # 5. Foreground Spiraling Crimson-Gold Dragonfire Helix around the Spearhead (y = 15..46)
        for y in range(15, 46):
            u_y = (y - 15) / 31.0
            ang_l = y * 0.46 - phase * 2.0
            for strand in (0, 1):
                sa = ang_l + strand * math.pi
                lx = cx + math.sin(sa) * (6.4 * (1.0 - u_y * 0.35))
                if math.cos(sa) >= -0.25 or abs(lx - cx) > 3.5:
                    put(px, lx, y, C_WHITE if (y + strand) % 3 == 0 else (C_GOLD_WHITE if strand == 0 else C_ROSE_WHITE))
                    put(px, lx + (1 if lx >= cx else -1), y, C_AMBER if strand == 0 else C_RUBY_CORE)

        draw_star(px, cx, 46, 3, C_WHITE, C_GOLD_LIGHT, rot=phase * 0.5)
    else:
        # F12..F29: Impaled in a Double-Ringed Golden-Crimson Valhalla Rune Crater with Rising Dragonfire Plumes
        u = (f - 12) / 17.0
        gy = 41
        vib = int(round(math.sin((f - 12) * 2.2) * (1.5 * (1.0 - u))))

        # 1. Double-Ringed Golden-Crimson Valhalla Rune Crater (x = 5..47, y = 35..47)
        ring_grow = 1.0 - math.pow(1.0 - min(1.0, (f - 12) / 14.0), 2.0)
        rx_outer = 9.0 + ring_grow * 12.0   # up to 21.0 -> x = 5..47
        ry_outer = 2.5 + ring_grow * 3.5    # up to 6.0  -> y = 35..47
        rx_inner = 5.0 + ring_grow * 7.5
        ry_inner = 1.5 + ring_grow * 2.2

        for spk in range(8):
            sa = (spk / 8.0) * math.pi * 2.0 + u * 2.0
            draw_line(
                px,
                cx + math.cos(sa) * rx_inner,
                gy + math.sin(sa) * ry_inner,
                cx + math.cos(sa) * rx_outer,
                gy + math.sin(sa) * ry_outer,
                C_GOLD_LIGHT if spk % 2 == 0 else C_RUBY_CORE,
            )

        for s in range(56):
            a = (s / 56.0) * math.pi * 2.0 + u * 2.5
            sx = cx + math.cos(a) * rx_outer
            sy = gy + math.sin(a) * ry_outer
            put(px, sx, sy, C_GOLD_WHITE if s % 7 == 0 else (C_GOLD if s % 2 == 0 else C_RUBY_CORE))

        for s in range(44):
            a = -(s / 44.0) * math.pi * 2.0 + u * 3.5
            ix_r = cx + math.cos(a) * rx_inner
            iy_r = gy + math.sin(a) * ry_inner
            put(px, ix_r, iy_r, C_WHITE if s % 4 == 0 else (C_ROSE_WHITE if s % 2 == 0 else C_GOLD_LIGHT))

        # 2. Rising Dragonfire Plumes Erupting from the Valhalla Crater (F12..F29)
        plume_offsets = [-13, -7, 7, 13]
        plume_env = max(0.35, math.sin(min(1.0, (f - 11) / 19.0) * math.pi))
        for p_idx, dx_p in enumerate(plume_offsets):
            px_c = cx + int(round(dx_p * (0.65 + 0.35 * ring_grow)))
            plume_h = int(round((16.0 - abs(dx_p) * 0.4) * plume_env))
            for h_p in range(1, max(3, plume_h) + 1):
                py_c = max(6, gy - h_p)
                wobble = int(round(math.sin(h_p * 0.5 - u * 8.0 + p_idx) * 1.0))
                put(px, px_c + wobble, py_c, C_GOLD_WHITE if h_p <= 4 else (C_AMBER if h_p % 2 == 0 else C_RUBY_CORE))
                put(px, px_c + wobble + (1 if dx_p > 0 else -1), py_c, C_CRIMSON)

        # 3. Impaled Winged Gungnir Dragon-Lance in Crater Center (F12..F29)
        bx_c = cx + vib
        for y in range(6, 14):
            put(px, bx_c, y, C_GOLD_WHITE if y % 2 == 0 else C_CRIMSON)
            put(px, bx_c - 1, y, C_GOLD_DEEP)
            put(px, bx_c + 1, y, C_GOLD_DEEP)

        # Golden-Crimson Dragon-Wing Crossguard Collar on Impaled Lance (x = 12..40, y = 9..16)
        for side in (-1, 1):
            for tier in range(3):
                span_w = 13 - tier * 3
                for d in range(2, span_w + 1):
                    wx = bx_c + side * d
                    wy = 14 + tier - int(round((d / float(span_w)) * (5.0 - tier)))
                    put(px, wx, wy, C_GOLD_WHITE if d >= span_w - 1 else (C_GOLD_LIGHT if tier == 0 else C_RUBY_CORE))
                    put(px, wx, wy + 1, C_CRIMSON if tier < 2 else C_GOLD_DEEP)

        # Impaled Gungnir Blade Shaft (y = 15..41)
        for y in range(15, gy + 1):
            for dx in range(-3, 4):
                if abs(dx) == 3:
                    put(px, bx_c + dx, y, C_GOLD_LIGHT)
                elif dx == 0:
                    put(px, bx_c, y, C_GOLD_WHITE if (y + f) % 3 == 0 else C_WHITE)
                else:
                    put(px, bx_c + dx, y, C_RUBY_CORE if dx < 0 else C_CRIMSON)
            lx_imp = bx_c + math.sin(y * 0.5 - u * 10.0) * 4.8
            put(px, lx_imp, y, C_WHITE if y % 2 == 0 else C_GOLD)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row2_dragonfire_obelisk_spire(f):
    """
    Row 2: Erupting Dragonfire Ruby-Gold Obelisk Spire (`y = 6..47, x = 11..41`, 30 frames):
    - Multi-faceted crimson-ruby & golden crystal/obsidian dragon-horn spire (`y = 6..47, x = 11..41`)
      with flanking basal shards and spiraling dragonfire ribbons.
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    cx = 26
    gy = 45
    phase = (f / 30.0) * math.pi * 2.0

    # 1. Persistent Glowing Valhalla Dragon-Rune Ground Seal (y = 42..47, x = 11..41)
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
            C_GOLD_LIGHT if spk % 2 == 0 else C_RUBY_CORE,
        )
    for s in range(48):
        a = (s / 48.0) * math.pi * 2.0 + phase
        sx_o = max(11.0, min(41.0, cx + math.cos(a) * rx_seal))
        sy_o = max(42.0, min(47.0, gy + math.sin(a) * ry_seal))
        put(px, sx_o, sy_o, C_GOLD_WHITE if s % 6 == 0 else (C_RUBY_CORE if s % 2 == 0 else C_CRIMSON))

    if f <= 21:
        grow = ((f + 1) / 6.0) if f <= 5 else 1.0

        # 2. Flanking Basal Ruby-Gold & Obsidian Dragon-Horn Shards (x = 11..41, y = 24..46)
        basal_shards = [
            (-8.0, -4.5, 14.0, 3.0),   # Outer-left shard (reaches x=11..18)
            (-4.8, -4.0, 21.0, 4.0),   # Mid-left shard
            (+4.8, +4.0, 21.0, 4.0),   # Mid-right shard
            (+8.0, +4.5, 14.0, 3.0),   # Outer-right shard (reaches x=34..41)
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
                        col = C_GOLD_WHITE if u_h > 0.6 else C_GOLD
                    elif is_ridge:
                        col = C_ROSE_WHITE if u_h > 0.35 else C_GOLD_LIGHT
                    elif dx < 0:
                        col = C_RUBY_CORE if dx == -1 else C_RUBY_BRIGHT
                    else:
                        col = C_CRIMSON if dx == 1 else C_OBSIDIAN
                    put(px, wx, sy, col)

        # 3. Towering Central Multi-Faceted Crimson-Ruby & Gold Obelisk Spire (y = 6..45)
        main_h = int(round(39.0 * grow))
        for h in range(main_h + 1):
            u_h = h / float(max(1, main_h))
            sy = max(6, gy - h)
            profile = (0.78 + 0.22 * (u_h / 0.25)) if u_h < 0.25 else (1.0 - (u_h - 0.25) / 0.75)
            hw = max(0, int(round(7.2 * profile)))
            for dx in range(-hw, hw + 1):
                diag_facet_1 = ((h - abs(dx) * 2 + (f // 2)) % 8 == 0)
                diag_facet_2 = (abs(dx) == max(1, hw // 2) and h % 2 == 0)
                if abs(dx) == hw:
                    col = C_GOLD_WHITE if (dx < 0 or u_h > 0.45) else C_GOLD
                elif dx == 0:
                    col = C_WHITE if (h + f) % 3 != 0 else C_GOLD_WHITE
                elif diag_facet_1 or diag_facet_2:
                    col = C_GOLD_LIGHT if dx <= 0 else C_ROSE_FLAME
                elif dx < 0:
                    col = C_RUBY_CORE if dx >= -2 else C_RUBY_BRIGHT
                else:
                    col = C_CRIMSON if dx <= 2 else (C_CRIMSON_DARK if dx <= 4 else C_OBSIDIAN)
                put(px, cx + dx, sy, col)

        # 4. Spiraling Dragonfire Ribbons Wrapping Upward Around the Obelisk Spire (y = 8..44, x = 12..40)
        for h in range(2, main_h):
            u_h = h / float(max(1, main_h))
            sy = max(6, gy - h)
            ang_r = h * 0.38 - phase * 2.0
            for strand in (0, 1):
                sa = ang_r + strand * math.pi
                rx_rib = (9.5 * (1.0 - u_h * 0.55)) * math.sin(sa)
                if math.cos(sa) >= -0.15:
                    wx = max(11.0, min(41.0, cx + rx_rib))
                    put(px, wx, sy, C_GOLD_WHITE if strand == 0 else C_ROSE_WHITE)
                    put(px, max(11.0, min(41.0, wx + (1 if rx_rib >= 0 else -1))), sy, C_AMBER if strand == 0 else C_RUBY_CORE)

        if f >= 5:
            draw_star(px, cx, max(6, gy - main_h), 3, C_WHITE, C_GOLD_LIGHT, rot=phase)
    else:
        # F22..F29: Explosive Ruby-Gold Obelisk Shatter (within x = 11..41, y = 6..47)
        u = (f - 22) / 7.0
        for shard_i in range(14):
            ang = -math.pi * 0.92 + (shard_i / 13.0) * math.pi * 0.84
            base_y = gy - 6 - (shard_i % 4) * 8
            dist = 3.0 + u * 13.5
            sx = max(12.0, min(40.0, cx + math.cos(ang) * dist))
            sy = max(7.0, min(45.0, base_y + math.sin(ang) * dist * 0.6 + u * u * 5.0))
            r_sh = 2 if (u < 0.55 and shard_i % 2 == 0) else 1
            draw_ruby_diamond(
                px,
                sx,
                sy,
                r_sh,
                C_GOLD_LIGHT if shard_i % 2 == 0 else C_RUBY_CORE,
                C_CRIMSON if u < 0.7 else C_GOLD_DEEP,
            )

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row3_bahamut_sovereign_seal(f):
    """
    Row 3: Colossal Bahamut / Elder Wyvern Sovereign & Valhalla Seal (`y = 5..46, x = 5..47`, 30 frames):
    - Roaring crimson-and-gold armored Elder Dragon head & spread dragon-wings (`y = 5..46, x = 5..47`)
      framed by a rotating golden Valhalla rune wheel and dragonfire breath core.
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0
    cx, cy = 26.0, 25.5

    # 1. Outer Rotating Golden-Crimson Valhalla Rune Wheel (x = 5..47, y = 5..46)
    ring_r = 19.8 + math.sin(phase * 2.0) * 0.5
    for s in range(64):
        a = (s / 64.0) * math.pi * 2.0 + phase
        rx = max(5.0, min(47.0, cx + math.cos(a) * ring_r))
        ry = max(5.0, min(46.0, cy + math.sin(a) * ring_r))
        is_rune = (s % 8 == 0)
        put(px, rx, ry, C_GOLD_WHITE if is_rune else (C_GOLD if s % 2 == 0 else C_RUBY_BRIGHT))
        if is_rune:
            ix = max(5.0, min(47.0, cx + math.cos(a) * (ring_r - 1.6)))
            iy = max(5.0, min(46.0, cy + math.sin(a) * (ring_r - 1.6)))
            put(px, ix, iy, C_RUBY_CORE)
            # Radial Valhalla spoke toward center
            draw_line(
                px,
                cx + math.cos(a) * 12.0,
                cy + math.sin(a) * 12.0,
                ix,
                iy,
                C_GOLD_DEEP if (s // 8) % 2 == 0 else C_CRIMSON_DARK,
            )

    # 2. Spread Crimson-and-Gold Armored Elder Dragon Wings (x = 5..47, y = 8..38)
    wing_beat = math.sin(phase * 2.0) * 1.3
    for side in (-1, 1):
        # Upper golden dragon wing-arch & thumb claw at (cx + side*14, 9)
        claw_x = cx + side * 14
        claw_y = max(6.0, 9.0 + wing_beat * 0.6)
        draw_line(px, cx + side * 6, 16, claw_x, claw_y, C_GOLD_LIGHT)
        draw_line(px, cx + side * 6, 17, claw_x, claw_y + 1, C_GOLD)
        put(px, claw_x, max(5.0, claw_y - 1), C_WHITE)
        put(px, claw_x + side, claw_y, C_GOLD_WHITE)

        # 4 Sweeping Bahamut Dragon Wing Pinions & Crimson Membrane Webbing
        for tier in range(4):
            max_span = 20 - tier * 2
            y0 = 15.0 + tier * 3.8
            for d in range(6, max_span + 1):
                u_d = (d - 6) / float(max(1, max_span - 6))
                wx = max(5.0, min(47.0, cx + side * d))
                wy = max(6.0, min(45.0, y0 - (1.0 - tier * 0.35) * u_d * 5.0 + wing_beat * u_d))
                # Golden-Ruby pinion bone
                put(px, wx, wy, C_GOLD_WHITE if d >= max_span - 1 else (C_GOLD if tier <= 1 else C_RUBY_CORE))
                # Leathery crimson-ruby dragon wing membrane below each pinion bone
                for m_dy in range(1, 4):
                    my = min(45.0, wy + m_dy)
                    col_m = C_RUBY_BRIGHT if m_dy == 1 else (C_CRIMSON if (d + m_dy) % 2 == 0 else C_CRIMSON_DARK)
                    put(px, wx, my, col_m)

    # 3. Roaring Crimson-and-Gold Armored Elder Dragon (Bahamut) Head in Center (x = 17..35, y = 7..38)
    # Twin Sweeping Curved Golden-Obsidian Dragon Horns (y = 7..16, x = 16..36)
    for side in (-1, 1):
        for h_s in range(10):
            hx = cx + side * (3 + h_s * 0.85)
            hy = 15 - h_s * 0.85
            put(px, hx, hy, C_GOLD_WHITE if h_s >= 7 else (C_GOLD if h_s % 2 == 0 else C_AMBER))
            put(px, hx, hy + 1, C_CRIMSON_DARK if h_s < 6 else C_GOLD_DEEP)

    # Central Ruby-Gold Sovereign Crown Crest (y = 8..15, x = 24..28)
    for dy_c in range(8, 16):
        put(px, cx, dy_c, C_WHITE if dy_c <= 10 else C_GOLD_WHITE)
        put(px, cx - 1, dy_c + 1, C_RUBY_CORE)
        put(px, cx + 1, dy_c + 1, C_RUBY_CORE)

    # Armored Crimson-Gold Dragon Skull, Snout & Brow (y = 15..27, x = 19..33)
    for y in range(15, 28):
        hw = 7 if y <= 21 else max(4, 7 - (y - 21))
        for dx in range(-hw, hw + 1):
            wx = cx + dx
            if abs(dx) == hw:
                col = C_GOLD_LIGHT if y <= 20 else C_GOLD
            elif dx == 0:
                col = C_GOLD_WHITE if y % 2 == 0 else C_GOLD
            elif 18 <= y <= 20 and 2 <= abs(dx) <= 5:
                # Blazing Molten-Gold Slit Dragon Eyes!
                col = C_WHITE if (abs(dx) == 3 and y == 19) else C_GOLD_WHITE
            elif abs(dx) == hw - 1:
                col = C_RUBY_CORE
            else:
                col = C_CRIMSON if (dx + y) % 2 == 0 else C_CRIMSON_DARK
            put(px, wx, y, col)

    # Roaring Lower Dragon Jaw & White-Gold Fangs (y = 28..36, x = 21..31)
    jaw_open = 1 if (f % 6 < 3) else 0
    for y in range(28, 36 + jaw_open):
        hw = max(2, 5 - (y - 28) // 2)
        for dx in range(-hw, hw + 1):
            wx = cx + dx
            if y in (28, 29) and abs(dx) in (2, 4):
                col = C_WHITE  # Upper & lower dragon fangs
            elif abs(dx) == hw or y >= 34:
                col = C_GOLD
            else:
                col = C_CRIMSON_DARK
            put(px, wx, y, col)

    # 4. Blazing Dragonfire Breath Core Roaring in the Open Maw (x = 22..30, y = 26..35)
    breath_r = 3 + (f % 2)
    draw_ruby_diamond(px, cx, 30 + jaw_open, breath_r, C_GOLD_WHITE, C_RUBY_CORE)
    draw_star(px, cx, 30 + jaw_open, breath_r + 2, C_WHITE, C_GOLD_LIGHT, rot=-phase * 2.0)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row4_valhalla_crescent_starcross(f):
    """
    Row 4: Valhalla Dragonfire Crescent & Star-Cross Ring (`y = 6..46, x = 6..46`, 30 frames):
    - Sweeping crimson-gold halberd crescent arc with rotating 8-point Valhalla star-crosses (`y = 6..46, x = 6..46`).
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0
    cx, cy = 26.0, 26.0

    # 1. Inner Sacred Valhalla Dragonfire Ring (r = 14.5, within x = 11..41, y = 11..41)
    ring_r = 14.5 + math.sin(phase * 2.0) * 0.6
    for s in range(48):
        a = (s / 48.0) * math.pi * 2.0 - phase
        rx = max(6.0, min(46.0, cx + math.cos(a) * ring_r))
        ry = max(6.0, min(46.0, cy + math.sin(a) * ring_r))
        put(px, rx, ry, C_GOLD_LIGHT if s % 3 == 0 else (C_RUBY_CORE if s % 2 == 0 else C_CRIMSON))

    # 2. Sweeping Crimson-Gold Halberd Crescent Slash Arc (y = 6..46, x = 10..46)
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
                put(px, wx, wy, C_GOLD_WHITE)
            elif t_off <= 3:
                put(px, wx, wy, C_GOLD if (dy + t_off + f) % 2 == 0 else C_AMBER)
            elif t_off <= 5:
                put(px, wx, wy, C_RUBY_CORE if (dy + f) % 2 == 0 else C_DRAGON_ORANGE)
            else:
                put(px, wx, wy, C_RUBY_BRIGHT if t_off < thick else C_CRIMSON_DARK)

    # 3. Rotating 8-Point Valhalla Star-Crosses Orbiting in a Ring (`y = 6..46, x = 6..46`)
    num_crosses = 6
    orbit_r = 15.5
    for c_i in range(num_crosses):
        ca = phase + c_i * (math.pi * 2.0 / num_crosses)
        sx = max(9.0, min(43.0, cx + math.cos(ca) * orbit_r))
        sy = max(9.0, min(43.0, cy + math.sin(ca) * orbit_r))
        draw_8pt_valhalla_starcross(
            px,
            sx,
            sy,
            r_main=3.0 if c_i % 2 == 0 else 2.0,
            r_diag=2.0 if c_i % 2 == 0 else 1.5,
            col_core=C_GOLD_WHITE,
            col_cardinal=C_GOLD_LIGHT if c_i % 2 == 0 else C_ROSE_WHITE,
            col_diag=C_RUBY_CORE,
            rot=-phase * 2.0 + c_i,
        )

    # Central Sovereign 8-Point Valhalla Star-Cross at (24, 26)
    draw_8pt_valhalla_starcross(
        px,
        24.0,
        cy,
        r_main=4.0,
        r_diag=2.5,
        col_core=C_WHITE,
        col_cardinal=C_GOLD_WHITE,
        col_diag=C_RUBY_CORE,
        rot=phase * 1.5,
    )

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def main():
    sheet_w = COLS * CELL  # 6240
    sheet_h = ROWS * CELL  # 1040
    sheet = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))

    builders = [
        ("ROW 0: CRIMSON-GOLD WYVERN SPIRAL LANCE-WAVE (30 FRAMES)", build_row0_wyvern_spiral_lance_wave),
        ("ROW 1: DESCENDING GUNGNIR SKY-LANCE & VALHALLA CRATER (30 FRAMES)", build_row1_gungnir_skylance_impact),
        ("ROW 2: ERUPTING DRAGONFIRE RUBY-GOLD OBELISK SPIRE (30 FRAMES)", build_row2_dragonfire_obelisk_spire),
        ("ROW 3: COLOSSAL BAHAMUT SOVEREIGN & VALHALLA SEAL (30 FRAMES)", build_row3_bahamut_sovereign_seal),
        ("ROW 4: VALHALLA DRAGONFIRE CRESCENT & STAR-CROSS RING (30 FRAMES)", build_row4_valhalla_crescent_starcross),
    ]

    top_clips = bot_clips = left_clips = right_clips = 0
    for row_idx, (label, fn) in enumerate(builders):
        row_frames_52 = []
        for col_idx in range(COLS):
            cell_img = fn(col_idx)
            # Audit logical 52x52 boundary safety (strictly inside 2 <= x <= 49, 2 <= y <= 49)
            arr52 = np.array(cell_img.resize((LOGICAL, LOGICAL), Image.Resampling.NEAREST), dtype=np.uint8)
            row_frames_52.append(arr52)
            if np.any(arr52[:2, :, 3] > 0):
                top_clips += 1
            if np.any(arr52[50:, :, 3] > 0):
                bot_clips += 1
            if np.any(arr52[:, :2, 3] > 0):
                left_clips += 1
            if np.any(arr52[:, 50:, 3] > 0):
                right_clips += 1
            sheet.paste(cell_img, (col_idx * CELL, row_idx * CELL))
        adj_diffs = sum(1 for i in range(29) if np.any(row_frames_52[i] != row_frames_52[i + 1]))
        print(f"{label:68s}: 30 frames, {adj_diffs}/29 adjacent transitions distinct")

    print(
        f"VFX boundary clip audit across 150 frames: TOP={top_clips}, BOT={bot_clips}, LEFT={left_clips}, RIGHT={right_clips}"
    )
    out_path = "/home/antigravity/assets/sprites/valkyrie_vfx.png"
    sheet.save(out_path)
    print(f"Saved 30fps Valkyrie VFX sheet to {out_path} ({sheet.size[0]}x{sheet.size[1]})")

    # Build contact sheet in caller artifact directory
    art_dir = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/4f1fb80f-a88f-4496-9746-b4b9fe84f6d4"
    thumb = 80
    pad_top = 24
    cw = COLS * thumb
    ch = ROWS * (thumb + pad_top)
    contact = Image.new("RGBA", (cw, ch), (13, 19, 32, 255))
    draw = ImageDraw.Draw(contact)

    for r_idx, (label, _) in enumerate(builders):
        y0 = r_idx * (thumb + pad_top)
        draw.rectangle([0, y0, cw, y0 + pad_top - 1], fill=(20, 30, 48, 255))
        draw.text((6, y0 + 2), label, fill=(251, 113, 133, 255))
        for c_idx in range(COLS):
            x0 = c_idx * thumb
            draw.text((x0 + 4, y0 + 12), f"F{c_idx:02d}", fill=(254, 240, 138, 255))
            cell_crop = sheet.crop((c_idx * CELL, r_idx * CELL, (c_idx + 1) * CELL, (r_idx + 1) * CELL))
            cell_thumb = cell_crop.resize((thumb, thumb), Image.Resampling.NEAREST)
            contact.paste(cell_thumb, (x0, y0 + pad_top), cell_thumb)
            draw.rectangle([x0, y0 + pad_top, x0 + thumb - 1, y0 + pad_top + thumb - 1], outline=(35, 52, 78, 255))

    c_path = os.path.join(art_dir, "debug_valkyrie_30fps_vfx.png")
    contact.save(c_path)
    print(f"Saved VFX contact sheet: {c_path} ({contact.size[0]}x{contact.size[1]})")


if __name__ == "__main__":
    main()
