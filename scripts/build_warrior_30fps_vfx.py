#!/usr/bin/env python3
"""
Builds Aethelgard (Warrior) 30fps HD-2D Pixel-Art Skill & VFX Sprite Sheet:
- Output: assets/sprites/warrior_vfx.png (6240 x 1040, 5 rows x 30 cols at 208x208 per cell)
- Logical canvas per cell: 52x52 upscaled 4x NEAREST to 208x208 (un-inked clean pixel art)
- Rows:
  Row 0 (F00..F29): FROST-GOLD CRESCENT BLADE-WAVE PROJECTILE (Spinning Ice Crystals, Runes & Frost Shards)
  Row 1 (F00..F29): HEAVENLY RUNEBLADE SKY-STRIKE (F00..F11 Descending Blade, F12..F29 Tectonic Ground Impact)
  Row 2 (F00..F29): GLACIAL CRYSTAL SPIRE ERUPTION (F00..F05 Eruption, F06..F21 Pulsing Spire, F22..F29 Shatter)
  Row 3 (F00..F29): VALKYRIE AEGIS CREST & CROSSED RUNEBLADES EMBLEM (Winged Shield & Rotating Rune Ring)
  Row 4 (F00..F29): MELEE SLASH WAVE & THUNDER-SLAM SHOCKWAVE (F00..F14 Expanding Razor Arc, F15..F29 Sparks)
"""

import math
import os
from PIL import Image, ImageDraw

LOGICAL = 52
SCALE = 4
CELL = LOGICAL * SCALE  # 208
COLS = 30
ROWS = 5

# Clean, luminous Frost-Sapphire / Starlight-Gold / Glacial-Cyan palette (zero heavy black inking)
C_WHITE = (255, 255, 255, 255)
C_GOLD_WHITE = (254, 249, 195, 255)
C_GOLD_LIGHT = (254, 240, 138, 255)
C_GOLD = (250, 204, 21, 255)
C_GOLD_DEEP = (202, 138, 4, 255)

C_ICE_CORE = (224, 242, 254, 255)
C_FROST_BRIGHT = (125, 211, 252, 255)
C_FROST_CYAN = (56, 189, 248, 255)
C_SAPPHIRE = (2, 132, 199, 255)
C_SAPPHIRE_DARK = (3, 105, 161, 255)
C_SAPPHIRE_DEEP = (12, 74, 110, 235)
C_ROYAL_BLUE = (29, 78, 216, 255)

C_FROST_AURA = (56, 189, 248, 135)
C_GOLD_AURA = (250, 204, 21, 145)


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


def draw_ice_diamond(px, cx, cy, r, col_core, col_edge):
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


def build_row0_blade_wave(f):
    """
    Row 0 (`blade_wave` projectile, 30 frames):
    - Razor-sharp Frost-Gold Crescent Blade-Wave facing +X
    - Spinning inner ice crystals, glowing Nordic runes, and trailing frost shards
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0
    cy = 26.0

    # 1. Trailing Frost-Aura Slipstream & Swept Ice Wake (x=5..32)
    for w_idx in range(5):
        wy0 = cy + (w_idx - 2) * 5.5
        for d in range(16):
            u_d = d / 15.0
            wx = 28.0 - d * 1.5
            wy = wy0 + math.sin(d * 0.45 - phase * 2.0 + w_idx) * 1.8
            col_w = C_FROST_BRIGHT if d < 6 else (C_FROST_CYAN if d < 11 else C_FROST_AURA)
            if (d + f + w_idx) % 2 == 0:
                put(px, wx, wy, col_w)

    # 2. Spinning Inner Ice Crystal Cluster inside the crescent hollow (x=22..33, y=18..34)
    for c_i in range(3):
        ca = phase + c_i * (math.pi * 2.0 / 3.0)
        cx_i = 27.5 + math.cos(ca) * 4.5
        cy_i = cy + math.sin(ca) * 6.5
        draw_ice_diamond(px, cx_i, cy_i, 2, C_ICE_CORE if c_i == 0 else C_FROST_BRIGHT, C_SAPPHIRE)

    # 3. Main Razor-Sharp Frost-Gold Crescent Blade-Wave (y=5..47, apex at x=46)
    pulse = 0.9 + 0.1 * math.sin(phase * 2.0)
    for dy in range(-21, 22):
        u = dy / 21.0  # -1.0 at top horn -> 0.0 at center apex -> +1.0 at bottom horn
        y = cy + dy
        lead_x = 46.5 - (u * u) * 19.5 + math.sin(phase + u * 3.0) * 0.6
        thick = max(1, int(round((1.0 - u * u * 0.78) * 9.5 * pulse)))

        for t_off in range(thick + 1):
            wx = lead_x - t_off
            if t_off == 0:
                put(px, wx, y, C_WHITE)
            elif t_off == 1:
                put(px, wx, y, C_GOLD_WHITE if abs(dy) % 5 == (f % 5) else C_ICE_CORE)
            elif t_off == 2:
                # Glowing Nordic Gold Runes along the crescent bevel
                is_rune = (abs(dy + f) % 4 <= 1) and (abs(u) < 0.72)
                put(px, wx, y, C_GOLD if is_rune else C_FROST_BRIGHT)
            elif t_off <= 5:
                put(px, wx, y, C_FROST_CYAN if (dy + t_off) % 2 == 0 else C_SAPPHIRE)
            else:
                put(px, wx, y, C_SAPPHIRE_DARK if t_off < thick else C_SAPPHIRE_DEEP)

    # 4. Blazing Starlight-Gold & Frost Glint at Crescent Apex & Horns
    draw_star(px, 45, cy, 3 + (f % 2), C_WHITE, C_GOLD_LIGHT, rot=phase)
    draw_star(px, 27, cy - 20, 2, C_WHITE, C_FROST_BRIGHT, rot=-phase)
    draw_star(px, 27, cy + 20, 2, C_WHITE, C_FROST_BRIGHT, rot=-phase)

    # 5. Trailing Detached Frost Shards (x=4..20)
    for s_i in range(6):
        u_s = ((f / 30.0) + s_i / 6.0) % 1.0
        sx = 25.0 - u_s * 21.0
        sy = cy + ((s_i % 3) - 1) * (7.0 + u_s * 6.0) + math.sin(phase + s_i) * 1.5
        put(px, sx, sy, C_WHITE if u_s < 0.35 else C_GOLD_LIGHT if s_i % 2 == 0 else C_FROST_BRIGHT)
        put(px, sx - 1, sy, C_FROST_CYAN)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row1_runeblade_skystrike(f):
    """
    Row 1 (`runeblade` Sky-Strike, 30 frames):
    - F00..F11 (12 frames): Colossal heavenly gold-and-Sapphire Runeblade plummeting point-down from the heavens
      with sweeping Golden Valkyrie Wings on the crossguard and spiraling frost-cyan lightning around the blade fuller!
    - F12..F29 (18 frames): Runeblade buried point-down into a double-ringed golden-frost impact crater (F12..F26)
      with erupting frost-lightning arcs and rising rune embers.
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    cx = 26

    if f < 12:
        # F00..F11: Colossal Heavenly Runeblade plummeting vertically point-down (tip at y=47)
        phase = (f / 12.0) * math.pi * 2.0

        # 1. Background Spiraling Frost-Fire & Golden Slipstream Wake
        for y in range(4, 45):
            u_y = (y - 4) / 41.0
            spiral_bg = -math.sin(y * 0.42 - phase * 2.0) * (5.5 + (1.0 - u_y) * 2.0)
            put(px, cx + spiral_bg, y, C_FROST_AURA if y % 2 == 0 else C_GOLD_AURA)

        # 2. Ornate Sapphire-Gold Pommel & Grip at top (y=4..12)
        draw_star(px, cx, 5, 3, C_WHITE, C_GOLD, rot=phase)
        for y in range(6, 13):
            put(px, cx - 1, y, C_GOLD_DEEP)
            put(px, cx, y, C_GOLD_WHITE if y % 2 == 0 else C_ROYAL_BLUE)
            put(px, cx + 1, y, C_GOLD_DEEP)

        # 3. Sweeping Multi-Tiered Golden Valkyrie Wings on Crossguard (y=6..17, x=7..45)
        wing_flap = math.sin(phase) * 0.8
        for side in (-1, 1):
            for tier in range(4):
                # Tier 0 is longest upper primary pinion (reaches dx=18), Tier 3 is inner lower covert
                max_span = 18 - tier * 3
                base_y = 13 + tier
                for d in range(2, max_span + 1):
                    u_w = d / float(max_span)
                    wx = cx + side * d
                    # Sweeps gracefully upward and outward like Valkyrie pinions
                    wy = base_y - int(round((u_w ** 1.15) * (7.0 - tier * 1.1) - wing_flap * u_w))
                    if d >= max_span - 1:
                        col_w = C_WHITE if tier == 0 else C_GOLD_WHITE
                    elif tier % 2 == 0:
                        col_w = C_GOLD_LIGHT if d < max_span * 0.6 else C_GOLD
                    else:
                        col_w = C_GOLD if d < max_span * 0.5 else C_FROST_BRIGHT
                    put(px, wx, wy, col_w)
                    # Under-feather shading & sapphire trim
                    put(px, wx, wy + 1, C_GOLD_DEEP if tier < 3 else C_SAPPHIRE)
        # Central Crossguard Valkyrie Sapphire-Diamond Sunburst Gem (x=24..28, y=12..15)
        draw_ice_diamond(px, cx, 13, 2, C_FROST_BRIGHT, C_GOLD_WHITE)

        # 4. Colossal Fullered Sapphire-Cyan & Gold Runeblade (y=15..47)
        for y in range(15, 48):
            prog = (y - 15) / 32.0
            half_w = 4 if prog < 0.72 else int(round((1.0 - (prog - 0.72) / 0.28) * 4.0))
            for dx in range(-half_w, half_w + 1):
                if abs(dx) == half_w:
                    put(px, cx + dx, y, C_WHITE if prog > 0.55 else C_FROST_BRIGHT)
                elif abs(dx) == half_w - 1:
                    put(px, cx + dx, y, C_FROST_CYAN)
                elif dx == 0:
                    # Central fuller etched with glowing Nordic gold runes
                    is_rune = ((y + f) % 3 == 0) and (prog < 0.85)
                    put(px, cx, y, C_GOLD_WHITE if is_rune else C_WHITE)
                elif abs(dx) == 1 and ((y + f) % 5 == 0) and (prog < 0.78):
                    put(px, cx + dx, y, C_GOLD)
                else:
                    put(px, cx + dx, y, C_SAPPHIRE if dx < 0 else C_SAPPHIRE_DARK)

        # 5. Foreground Spiraling Frost-Cyan & White-Gold Lightning Helix around the Blade Fuller (y=15..46)
        for y in range(15, 46):
            u_y = (y - 15) / 31.0
            ang_l = y * 0.46 - phase * 2.0
            for strand in (0, 1):
                sa = ang_l + strand * math.pi
                # Only draw the foreground pass or wide lateral arcs so it wraps convincingly around the blade
                lx = cx + math.sin(sa) * (6.2 * (1.0 - u_y * 0.35))
                if math.cos(sa) >= -0.25 or abs(lx - cx) > 3.5:
                    put(px, lx, y, C_WHITE if (y + strand) % 3 == 0 else C_FROST_BRIGHT)
                    put(px, lx + (1 if lx >= cx else -1), y, C_FROST_CYAN if strand == 0 else C_GOLD_LIGHT)
                    if (y + f + strand * 2) % 6 == 0:
                        # Crackling lateral lightning spur
                        spur_dir = 1 if lx >= cx else -1
                        put(px, lx + spur_dir * 2, y - 1, C_ICE_CORE)

        # Blazing tip star at point-down apex (y=46)
        draw_star(px, cx, 46, 3, C_WHITE, C_GOLD_LIGHT, rot=phase * 0.5)
    else:
        # F12..F29 (18 frames): Runeblade buried point-down into a Double-Ringed Golden-Frost Impact Crater (F12..F26)
        u = (f - 12) / 17.0
        gy = 41
        vib = int(round(math.sin((f - 12) * 2.2) * (1.5 * (1.0 - u))))

        # 1. Double-Ringed Golden-Frost Impact Crater (prominent across F12..F26, fading F27..F29)
        ring_grow = 1.0 - math.pow(1.0 - min(1.0, (f - 12) / 14.0), 2.0)
        rx_outer = 9.0 + ring_grow * 12.5   # up to 21.5 -> x = 4..48
        ry_outer = 2.5 + ring_grow * 3.5    # up to 6.0  -> y = 35..47
        rx_inner = 5.0 + ring_grow * 8.0    # up to 13.0
        ry_inner = 1.5 + ring_grow * 2.2    # up to 3.7

        # Radial Frost-Gold Runic Crater Spokes connecting inner and outer rings (F12..F26)
        if f <= 26:
            for spk in range(8):
                sa = (spk / 8.0) * math.pi * 2.0 + u * 2.0
                x0_s = cx + math.cos(sa) * rx_inner
                y0_s = gy + math.sin(sa) * ry_inner
                x1_s = cx + math.cos(sa) * rx_outer
                y1_s = gy + math.sin(sa) * ry_outer
                draw_line(px, x0_s, y0_s, x1_s, y1_s, C_GOLD_LIGHT if spk % 2 == 0 else C_FROST_CYAN)

        # Outer Golden-Frost Crater Ring + Jagged Ice Rim Teeth
        for s in range(56):
            if f > 26 and (s + f) % 2 != 0:
                continue
            a = (s / 56.0) * math.pi * 2.0 + u * 2.5
            sx = cx + math.cos(a) * rx_outer
            sy = gy + math.sin(a) * ry_outer
            col_out = C_GOLD_WHITE if s % 7 == 0 else (C_GOLD if s % 2 == 0 else C_FROST_BRIGHT)
            put(px, sx, sy, col_out)
            if f <= 24 and s % 7 == 0:
                # Mini jagged frost-gold tooth rising from outer crater rim
                put(px, sx, sy - 1, C_WHITE)
                put(px, sx, sy - 2, C_FROST_CYAN)

        # Inner Blazing Frost-Cyan & Gold-White Shockwave Ring (F12..F26)
        if f <= 26:
            for s in range(44):
                a = -(s / 44.0) * math.pi * 2.0 + u * 3.5
                ix_r = cx + math.cos(a) * rx_inner
                iy_r = gy + math.sin(a) * ry_inner
                col_in = C_WHITE if s % 4 == 0 else (C_ICE_CORE if s % 2 == 0 else C_GOLD_LIGHT)
                put(px, ix_r, iy_r, col_in)

        # 2. Buried Colossal Winged Runeblade Impaled in the Crater Center (F12..F26, fading by F28)
        if f <= 27:
            bx_c = cx + vib
            # Pommel & Hilt (y=7..13)
            for y in range(7, 14):
                put(px, bx_c, y, C_GOLD_WHITE if y % 2 == 0 else C_GOLD_LIGHT)
                put(px, bx_c - 1, y, C_GOLD_DEEP)
                put(px, bx_c + 1, y, C_GOLD_DEEP)

            # Sweeping Golden Valkyrie Wings on the Impaled Crossguard (x=12..40, y=9..16)
            for side in (-1, 1):
                for tier in range(3):
                    span_w = 13 - tier * 3
                    for d in range(2, span_w + 1):
                        wx = bx_c + side * d
                        wy = 14 + tier - int(round((d / float(span_w)) * (5.0 - tier)))
                        put(px, wx, wy, C_GOLD_WHITE if d >= span_w - 1 else (C_GOLD_LIGHT if tier == 0 else C_GOLD))
                        put(px, wx, wy + 1, C_GOLD_DEEP if tier < 2 else C_FROST_CYAN)

            # Impaled Blade Shaft with Spiraling Frost-Cyan Lightning (y=15..41)
            for y in range(15, gy + 1):
                for dx in range(-3, 4):
                    if abs(dx) == 3:
                        put(px, bx_c + dx, y, C_FROST_BRIGHT)
                    elif dx == 0:
                        put(px, bx_c, y, C_GOLD_WHITE if (y + f) % 3 == 0 else C_WHITE)
                    else:
                        put(px, bx_c + dx, y, C_FROST_CYAN if dx < 0 else C_SAPPHIRE)
                # Spiraling frost-cyan lightning along the impaled blade
                if f <= 24:
                    lx_imp = bx_c + math.sin(y * 0.5 - u * 10.0) * 4.8
                    put(px, lx_imp, y, C_WHITE if y % 2 == 0 else C_FROST_BRIGHT)

        # 3. Erupting Golden-Cyan Lightning Arcs & Rising Rune Embers
        if f <= 23:
            for bolt in (-1, 1):
                bx0 = cx + bolt * (5 + int(u * 10))
                draw_line(px, bx0, gy, bx0 + bolt * 4, gy - 12 + int(u * 8), C_GOLD_LIGHT if bolt > 0 else C_FROST_BRIGHT)
                draw_line(px, bx0 + bolt * 4, gy - 12 + int(u * 8), bx0 + bolt * 2, gy - 23 + int(u * 11), C_WHITE)
        for emb in range(8):
            ang = -math.pi * 0.18 - (emb / 7.0) * math.pi * 0.64
            dist = 4.0 + u * 21.0
            ex = cx + math.cos(ang) * dist
            ey = gy + math.sin(ang) * dist
            if 4 <= ey <= gy:
                put(px, ex, ey, C_GOLD_LIGHT if emb % 2 == 0 else C_FROST_BRIGHT)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row2_glacial_crystal_spire(f):
    """
    Row 2 (`warrior` Glacial Crystal Spire Eruption, 30 frames):
    - Frost-rune ground seal at base (y = 41..47, x = 9..43)
    - Flanking secondary crystal shards at the base (x = 12..39, y = 30..45)
    - Towering central glacial crystal spire with brighter diamond-white specular facet lines!
    - Explosive crystalline shatter in F22..F29
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    cx = 26
    gy = 45
    phase = (f / 30.0) * math.pi * 2.0

    # 1. Persistent Glowing Nordic Frost-Rune Ground Seal (y = 41..48, x = 9..43)
    seal_scale = ((f + 1) / 4.0) if f <= 3 else (1.0 if f <= 21 else max(0.25, 1.0 - (f - 21) / 9.0))
    rx_seal = 16.5 * min(1.0, seal_scale)
    ry_seal = 3.2 * min(1.0, seal_scale)
    # 8 Radial Frost-Rune Seal Spokes
    for spk in range(8):
        sa = phase + spk * (math.pi * 0.25)
        draw_line(
            px,
            cx,
            gy,
            cx + math.cos(sa) * rx_seal,
            gy + math.sin(sa) * ry_seal,
            C_GOLD_LIGHT if spk % 2 == 0 else C_FROST_CYAN,
        )
    # Outer & Inner Frost-Rune Ground Seal Rings
    for s in range(48):
        a = (s / 48.0) * math.pi * 2.0 + phase
        sx_o = cx + math.cos(a) * rx_seal
        sy_o = gy + math.sin(a) * ry_seal
        put(px, sx_o, sy_o, C_WHITE if s % 6 == 0 else (C_FROST_BRIGHT if s % 2 == 0 else C_SAPPHIRE))
        sx_i = cx + math.cos(a) * (rx_seal * 0.58)
        sy_i = gy + math.sin(a) * (ry_seal * 0.58)
        put(px, sx_i, sy_i, C_GOLD_WHITE if s % 4 == 0 else C_ICE_CORE)

    if f <= 21:
        # Growth envelope: erupts rapidly over F00..F05, stands full height pulsing during F06..F21
        grow = ((f + 1) / 6.0) if f <= 5 else 1.0

        # 2. Outer Basal Secondary Crystal Shards at Base (`x = 12..39, y = 30..45`)
        # Four distinct angled basal shards (2 left, 2 right) spanning x = 12..39, y = 30..45
        basal_shards = [
            # (base_x_off, tilt_dx, max_h, base_hw)
            (-8.5, -5.0, 14.0, 3.2),   # Outer-left shard reaching x=12..18, y=31..45
            (-5.0, -4.5, 22.0, 4.2),   # Mid-left spire shard reaching x=14..22, y=23..45
            (+5.0, +4.5, 21.0, 4.2),   # Mid-right spire shard reaching x=30..38, y=24..45
            (+8.5, +4.8, 15.0, 3.2),   # Outer-right shard reaching x=34..39, y=30..45
        ]
        for bx_off, tilt_dx, max_sh, base_w in basal_shards:
            sh = int(round(max_sh * grow))
            for h in range(sh + 1):
                u_h = h / float(max(1, sh))
                sy = gy - h
                scx = cx + bx_off + tilt_dx * u_h
                hw = max(0, int(round(base_w * (1.0 - u_h * 0.88))))
                for dx in range(-hw, hw + 1):
                    # Bright diamond-white specular facet ridges on every secondary shard
                    is_edge = (abs(dx) == hw)
                    is_ridge = (dx == 0 or (h + abs(dx) * 2) % 7 == 0)
                    if is_edge:
                        col = C_WHITE if (dx * bx_off < 0 or u_h > 0.65) else C_FROST_BRIGHT
                    elif is_ridge:
                        col = C_WHITE if u_h > 0.3 else C_GOLD_WHITE
                    elif dx < 0:
                        col = C_ICE_CORE if dx == -1 else C_FROST_CYAN
                    else:
                        col = C_FROST_BRIGHT if dx == 1 else C_SAPPHIRE
                    put(px, scx + dx, sy, col)

        # 3. Towering Central Multi-Faceted Glacial Crystal Spire (40px tall: y = 5..45)
        main_h = int(round(40.0 * grow))
        for h in range(main_h + 1):
            u_h = h / float(max(1, main_h))
            sy = gy - h
            profile = (0.78 + 0.22 * (u_h / 0.25)) if u_h < 0.25 else (1.0 - (u_h - 0.25) / 0.75)
            hw = max(0, int(round(7.5 * profile)))
            for dx in range(-hw, hw + 1):
                # Diagonal diamond-white internal specular facet lines + central prism spine + razor edges
                diag_facet_1 = ((h - abs(dx) * 2 + (f // 2)) % 9 == 0)
                diag_facet_2 = (abs(dx) == max(1, hw // 2) and h % 2 == 0)
                if abs(dx) == hw:
                    col = C_WHITE if (dx < 0 or u_h > 0.45) else C_FROST_BRIGHT
                elif dx == 0:
                    col = C_WHITE if (h + f) % 3 != 0 else C_GOLD_WHITE
                elif diag_facet_1 or diag_facet_2:
                    col = C_WHITE if dx <= 0 else C_ICE_CORE
                elif dx < 0:
                    col = C_ICE_CORE if dx >= -2 else C_FROST_BRIGHT
                else:
                    col = C_FROST_CYAN if dx <= 2 else (C_SAPPHIRE if dx <= 4 else C_SAPPHIRE_DARK)
                put(px, cx + dx, sy, col)

        # 4. Shimmering Diamond-White Facet Star Glints & Orbiting Frost Motes (F05..F21)
        if f >= 5:
            draw_star(px, cx, gy - main_h, 3, C_WHITE, C_GOLD_LIGHT, rot=phase)
            # Specular glints dancing along the crystal facet vertices
            glint_y = gy - 12 - ((f * 2) % 22)
            draw_star(px, cx - 2, glint_y, 2, C_WHITE, C_ICE_CORE, rot=-phase)
            for m in range(5):
                ma = phase * 2.0 + m * (math.pi * 2.0 / 5.0)
                mx = cx + math.cos(ma) * 13.5
                my = gy - 9 - m * 6 + math.sin(ma) * 2.0
                draw_ice_diamond(px, mx, my, 1, C_WHITE, C_FROST_BRIGHT)
    else:
        # F22..F29 (8 frames): Explosive Crystalline Shatter into sparkling ice diamonds!
        u = (f - 22) / 7.0
        for shard_i in range(14):
            ang = -math.pi * 0.92 + (shard_i / 13.0) * math.pi * 0.84
            base_y = gy - 6 - (shard_i % 4) * 8
            dist = 3.0 + u * 17.5
            sx = cx + math.cos(ang) * dist
            sy = base_y + math.sin(ang) * dist * 0.6 + u * u * 6.0
            r_sh = 2 if (u < 0.55 and shard_i % 2 == 0) else 1
            draw_ice_diamond(
                px,
                sx,
                sy,
                r_sh,
                C_GOLD_LIGHT if shard_i % 3 == 0 else C_ICE_CORE,
                C_FROST_CYAN if u < 0.7 else C_SAPPHIRE
            )

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row3_valkyrie_aegis_crest(f):
    """
    Row 3 (Valkyrie Aegis Crest & Crossed Runeblades Emblem, 30 frames):
    - Ornate golden-sapphire winged Valkyrie shield crest with crossed Runeblades and rotating Nordic rune ring
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0
    cx, cy = 26.0, 26.0

    # 1. Outer Rotating Nordic Rune Ring (r=21.5)
    ring_r = 21.0 + math.sin(phase * 2.0) * 0.8
    for s in range(60):
        a = (s / 60.0) * math.pi * 2.0 + phase
        rx = cx + math.cos(a) * ring_r
        ry = cy + math.sin(a) * ring_r
        is_rune_node = (s % 5 == 0)
        put(px, rx, ry, C_GOLD_WHITE if is_rune_node else (C_FROST_BRIGHT if s % 2 == 0 else C_SAPPHIRE))
        if is_rune_node:
            put(px, cx + math.cos(a) * (ring_r - 1.5), cy + math.sin(a) * (ring_r - 1.5), C_GOLD)

    # 2. Crossed Diagonal Frost-Gold Runeblades Behind the Shield (-45 deg and -135 deg)
    for sign in (-1, 1):
        for d in range(-19, 20):
            bx = cx + sign * d * 0.72
            by = cy + d * 0.72
            put(px, bx, by, C_WHITE)
            put(px, bx - sign, by, C_FROST_BRIGHT)
            put(px, bx + sign, by, C_GOLD if abs(d) > 12 else C_SAPPHIRE)

    # 3. Sweeping Golden Valkyrie Feathered Wings Flanking the Shield
    wing_Beat = math.sin(phase * 2.0) * 1.2
    for side in (-1, 1):
        for tier in range(4):
            w_len = 16 - tier * 2
            y0 = cy - 6 + tier * 3.5
            for d in range(6, w_len + 1):
                wx = cx + side * d
                wy = y0 - (d - 6) * 0.45 + wing_Beat * (d / 16.0)
                put(px, wx, wy, C_GOLD_WHITE if d >= w_len - 1 else (C_GOLD if tier % 2 == 0 else C_FROST_BRIGHT))
                put(px, wx, wy + 1, C_GOLD_DEEP if tier % 2 == 0 else C_SAPPHIRE)

    # 4. Central Heirloom Valkyrie Heater Shield (x=18..34, y=14..38)
    for dy in range(-12, 13):
        u_y = (dy + 12) / 24.0
        half_w = 8 if u_y < 0.45 else int(round(8.0 * (1.0 - (u_y - 0.45) / 0.55)))
        for dx in range(-half_w, half_w + 1):
            sx, sy = cx + dx, cy + dy
            if abs(dx) == half_w or dy == -12:
                put(px, sx, sy, C_GOLD_LIGHT if dy < 0 else C_GOLD)
            elif abs(dx) == half_w - 1:
                put(px, sx, sy, C_GOLD_DEEP)
            elif dx == 0 or dy == -1:
                put(px, sx, sy, C_WHITE if abs(dx) + abs(dy) <= 3 else C_GOLD_LIGHT)
            else:
                put(px, sx, sy, C_SAPPHIRE if (dx * dy > 0) else C_ROYAL_BLUE)

    # 5. Pulsing Starburst Core at Center of Aegis Crest
    draw_star(px, cx, cy - 1, 4 + (f % 2), C_WHITE, C_FROST_BRIGHT, rot=-phase)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row4_slash_wave_and_shockwave(f):
    """
    Row 4 (`warrior` Melee Slash Wave & Thunder-Slam Shockwave, 30 frames):
    - Wide sweeping frost-gold crescent sword-slash wave:
      * F00..F14: Expanding razor arc with trailing frost-gold lightning ribbons
      * F15..F29: Dissipating frost-lightning sparks and shockwave rings
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0
    cx, cy = 22.0, 26.0

    if f <= 14:
        # F00..F14: Expanding wide sweeping frost-gold crescent sword-slash wave
        u = f / 14.0
        arc_span = 0.55 + 0.45 * math.sin(min(1.0, u * 1.3) * math.pi * 0.5)
        max_s = int(round(21 * arc_span))
        lead_x_base = 34.0 + u * 13.5
        thick_peak = 8.5 * (1.0 - u * 0.25)

        for s in range(-max_s, max_s + 1):
            u_s = s / float(max(1, max_s))
            ay = cy + s * 1.05
            ax_lead = lead_x_base - (u_s * u_s) * 16.0
            thick = max(1, int(round((1.0 - u_s * u_s * 0.8) * thick_peak)))
            for t_off in range(thick + 1):
                wx = ax_lead - t_off
                if t_off == 0:
                    put(px, wx, ay, C_WHITE)
                elif t_off == 1:
                    put(px, wx, ay, C_GOLD_LIGHT)
                elif t_off <= 3:
                    put(px, wx, ay, C_FROST_BRIGHT)
                elif t_off <= 5:
                    put(px, wx, ay, C_FROST_CYAN)
                else:
                    put(px, wx, ay, C_SAPPHIRE)

        # Crackling golden lightning bolts along the slash wave crest
        for k in range(-3, 4):
            ly = cy + k * 5.5
            lx = lead_x_base - ((k / 3.5) ** 2) * 15.0 - 2.0
            draw_line(px, lx - 5, ly + math.sin(phase + k) * 2, lx + 1, ly, C_GOLD_WHITE if k == 0 else C_GOLD)
    else:
        # F15..F29: Dissipating frost-lightning sparks & aftershock wave
        u = (f - 15) / 14.0
        lead_x_base = 46.5 + u * 2.0
        thick_rem = max(0, int(round(5.0 * (1.0 - u))))

        if thick_rem >= 1:
            for s in range(-20, 21):
                if u > 0.55 and (s + f) % 2 != 0:
                    continue
                u_s = s / 20.0
                ay = cy + s * 1.05
                ax_lead = lead_x_base - (u_s * u_s) * 16.0
                for t_off in range(thick_rem):
                    put(px, ax_lead - t_off, ay, C_GOLD_LIGHT if t_off == 0 else C_FROST_BRIGHT)

        # Dissipating frost-lightning arcs & diamond sparks
        for sp in range(9):
            u_sp = (sp - 4) / 4.0
            sy = cy + u_sp * (19.0 + u * 4.0)
            sx = 38.0 - (u_sp * u_sp) * 13.0 + math.cos(phase + sp * 1.3) * (4.0 + u * 6.0)
            if u < 0.75:
                draw_star(px, sx, sy, 2 if sp % 2 == 0 else 1, C_WHITE, C_GOLD_LIGHT if sp % 2 == 0 else C_FROST_BRIGHT, rot=phase)
            else:
                put(px, sx, sy, C_FROST_BRIGHT if sp % 2 == 0 else C_GOLD)

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
        ray_col = C_GOLD_LIGHT if (m_idx + row_idx) % 2 == 0 else C_FROST_BRIGHT
        ray_len = 5 + ((f + m_idx) % 3)

        # Soft aura halo around the 3x3 core
        for dy in range(-2, 3):
            for dx in range(-2, 3):
                if abs(dx) == 2 or abs(dy) == 2:
                    x, y = cx + dx, cy + dy
                    if 16 <= x <= 191 and 16 <= y <= 191 and px[x, y][3] == 0:
                        px[x, y] = C_FROST_AURA

        # 3x3 Pure White Specular Core
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                x, y = cx + dx, cy + dy
                if 16 <= x <= 191 and 16 <= y <= 191:
                    px[x, y] = C_WHITE

        # 4-Point Themed 1px Specular Rays
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
        ("ROW 0: FROST-GOLD CRESCENT BLADE-WAVE (30 FRAMES)", build_row0_blade_wave),
        ("ROW 1: HEAVENLY RUNEBLADE SKY-STRIKE & IMPACT (30 FRAMES)", build_row1_runeblade_skystrike),
        ("ROW 2: GLACIAL CRYSTAL SPIRE ERUPTION (30 FRAMES)", build_row2_glacial_crystal_spire),
        ("ROW 3: VALKYRIE AEGIS CREST & CROSSED RUNEBLADES (30 FRAMES)", build_row3_valkyrie_aegis_crest),
        ("ROW 4: MELEE SLASH WAVE & THUNDER-SLAM SHOCKWAVE (30 FRAMES)", build_row4_slash_wave_and_shockwave),
    ]

    for row_idx, (label, fn) in enumerate(builders):
        for col_idx in range(COLS):
            cell_img = apply_pass11_star_mote_polish(fn(col_idx), row_idx, col_idx)
            sheet.paste(cell_img, (col_idx * CELL, row_idx * CELL))

    out_path = "/home/antigravity/assets/sprites/warrior_vfx.png"
    sheet.save(out_path)
    print(f"Saved 30fps Warrior VFX sheet to {out_path} ({sheet.size[0]}x{sheet.size[1]})")

    # Build contact sheet in artifact directory (using only ASCII characters in ImageDraw.text)
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
        draw.text((6, y0 + 2), label, fill=(125, 211, 252, 255))
        for c_idx in range(COLS):
            x0 = c_idx * thumb
            draw.text((x0 + 4, y0 + 12), f"F{c_idx:02d}", fill=(254, 240, 138, 255))
            cell_crop = sheet.crop((c_idx * CELL, r_idx * CELL, (c_idx + 1) * CELL, (r_idx + 1) * CELL))
            cell_thumb = cell_crop.resize((thumb, thumb), Image.Resampling.NEAREST)
            contact.paste(cell_thumb, (x0, y0 + pad_top), cell_thumb)
            draw.rectangle([x0, y0 + pad_top, x0 + thumb - 1, y0 + pad_top + thumb - 1], outline=(35, 52, 78, 255))

    c_path = os.path.join(art_dir, "debug_warrior_30fps_vfx.png")
    contact.save(c_path)
    print(f"Saved VFX contact sheet: {c_path} ({contact.size[0]}x{contact.size[1]})")


if __name__ == "__main__":
    main()
