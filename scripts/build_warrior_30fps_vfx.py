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
    draw_star(px, 46, cy, 3 + (f % 2), C_WHITE, C_GOLD_LIGHT, rot=phase)
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
      with trailing lightning and frost-fire.
    - F12..F29 (18 frames): Runeblade buried point-down into shattered tectonic earth with erupting golden-cyan
      shockwave rings, lightning arcs, and fading rune embers.
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    cx = 26

    if f < 12:
        # F00..F11: Colossal Heavenly Runeblade plummeting vertically point-down (tip at y=47)
        phase = (f / 12.0) * math.pi * 2.0

        # 1. Trailing Frost-Fire & Golden Lightning Wake above/around blade
        for y in range(2, 44):
            u_y = (y - 2) / 41.0
            flare = math.sin(y * 0.35 + phase * 2.0) * (2.5 + (1.0 - u_y) * 3.5)
            put(px, cx + flare, y, C_FROST_BRIGHT if y % 2 == 0 else C_FROST_AURA)
            put(px, cx - flare, y, C_GOLD_LIGHT if y % 3 == 0 else C_FROST_AURA)

        # 2. Leather Hilt & Sapphire-Gold Pommel at top (y=3..11)
        draw_star(px, cx, 4, 3, C_WHITE, C_GOLD, rot=phase)
        for y in range(6, 12):
            put(px, cx - 1, y, C_GOLD_DEEP)
            put(px, cx, y, C_GOLD_LIGHT if y % 2 == 0 else C_ROYAL_BLUE)
            put(px, cx + 1, y, C_GOLD_DEEP)

        # 3. Swept Winged Golden Valkyrie Crossguard (y=12..15, x=15..37)
        for dx in range(-11, 12):
            wing_y = 13 - abs(dx) // 4
            put(px, cx + dx, wing_y, C_GOLD_WHITE if abs(dx) <= 2 else C_GOLD)
            put(px, cx + dx, wing_y + 1, C_GOLD_DEEP if abs(dx) > 3 else C_FROST_CYAN)
        put(px, cx, 13, C_WHITE)

        # 4. Colossal Fullered Sapphire-Cyan & Gold Runeblade (y=15..47)
        for y in range(15, 48):
            prog = (y - 15) / 32.0
            half_w = 4 if prog < 0.72 else int(round((1.0 - (prog - 0.72) / 0.28) * 4.0))
            for dx in range(-half_w, half_w + 1):
                if abs(dx) == half_w:
                    put(px, cx + dx, y, C_WHITE if prog > 0.6 else C_FROST_BRIGHT)
                elif abs(dx) == half_w - 1:
                    put(px, cx + dx, y, C_FROST_CYAN)
                elif dx == 0:
                    is_rune = ((y + f) % 4 <= 1) and (prog < 0.82)
                    put(px, cx, y, C_GOLD_WHITE if is_rune else C_WHITE)
                else:
                    put(px, cx + dx, y, C_SAPPHIRE if dx < 0 else C_SAPPHIRE_DARK)

        # Blazing tip star at point-down apex (y=47)
        draw_star(px, cx, 47, 4, C_WHITE, C_GOLD_LIGHT, rot=phase * 0.5)
    else:
        # F12..F29 (18 frames): Runeblade buried point-down into shattered tectonic earth (ground gy=42)
        u = (f - 12) / 17.0
        gy = 42
        vib = int(round(math.sin((f - 12) * 2.2) * (1.5 * (1.0 - u))))

        # 1. Expanding Golden-Cyan Tectonic Ground Shockwave Ring (y=37..48)
        rx = 6.0 + (1.0 - math.pow(1.0 - u, 2.0)) * 19.0
        ry = 2.0 + (1.0 - math.pow(1.0 - u, 2.0)) * 5.0
        for s in range(44):
            a = (s / 44.0) * math.pi * 2.0 + u * 3.0
            sx = cx + math.cos(a) * rx
            sy = gy + math.sin(a) * ry
            col_r = C_GOLD_LIGHT if s % 5 == 0 else (C_FROST_BRIGHT if u < 0.6 else C_SAPPHIRE)
            if u < 0.92 or s % 2 == 0:
                put(px, sx, sy, col_r)

        # 2. Buried Colossal Runeblade Impaled in the Earth (y=10..42)
        blade_alpha_fade = 1.0 if u < 0.75 else (1.0 - (u - 0.75) / 0.25)
        if blade_alpha_fade > 0.15:
            bx_c = cx + vib
            # Pommel & Hilt (y=8..14)
            for y in range(8, 14):
                put(px, bx_c, y, C_GOLD_LIGHT)
                put(px, bx_c - 1, y, C_GOLD_DEEP)
                put(px, bx_c + 1, y, C_GOLD_DEEP)
            # Winged Golden Crossguard (y=14..16)
            for dx in range(-9, 10):
                wy = 15 - abs(dx) // 4
                put(px, bx_c + dx, wy, C_GOLD_WHITE if abs(dx) <= 2 else C_GOLD)
                put(px, bx_c + dx, wy + 1, C_GOLD_DEEP)
            # Impaled Blade Shaft (y=16..42)
            for y in range(16, gy + 1):
                for dx in range(-3, 4):
                    if abs(dx) == 3:
                        put(px, bx_c + dx, y, C_FROST_BRIGHT)
                    elif dx == 0:
                        put(px, bx_c, y, C_GOLD_LIGHT if (y + f) % 4 == 0 else C_WHITE)
                    else:
                        put(px, bx_c + dx, y, C_FROST_CYAN if dx < 0 else C_SAPPHIRE)

        # 3. Erupting Golden-Cyan Lightning Arcs & Rising Rune Embers
        if u < 0.65:
            for bolt in (-1, 1):
                bx0 = cx + bolt * (4 + int(u * 12))
                draw_line(px, bx0, gy, bx0 + bolt * 5, gy - 14 + int(u * 10), C_GOLD_LIGHT if bolt > 0 else C_FROST_BRIGHT)
                draw_line(px, bx0 + bolt * 5, gy - 14 + int(u * 10), bx0 + bolt * 2, gy - 26 + int(u * 14), C_WHITE)
        for emb in range(8):
            ang = -math.pi * 0.15 - (emb / 7.0) * math.pi * 0.7
            dist = 4.0 + u * 24.0
            ex = cx + math.cos(ang) * dist
            ey = gy + math.sin(ang) * dist
            if 3 <= ey <= gy:
                put(px, ex, ey, C_GOLD_LIGHT if emb % 2 == 0 else C_FROST_BRIGHT)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row2_glacial_crystal_spire(f):
    """
    Row 2 (`warrior` Glacial Crystal Spire Eruption, 30 frames):
    - F00..F05: Ground frost-crack sigil & erupting jagged sapphire-cyan glacier crystal cluster
    - F06..F21: Towering multi-faceted translucent ice crystal spire pulsing with inner aurora light & orbiting frost motes
    - F22..F29: Explosive crystalline shatter into sparkling ice diamonds
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    cx = 26
    gy = 47
    phase = (f / 30.0) * math.pi * 2.0

    if f <= 21:
        # Growth envelope: erupts rapidly over F00..F05, stands full height pulsing during F06..F21
        grow = ((f + 1) / 6.0) if f <= 5 else 1.0
        aurora_pulse = 0.5 + 0.5 * math.sin(phase * 2.0)

        # 1. Ground Frost-Crack Sigil at Base (y=44..49)
        for rx in range(-14, 15):
            put(px, cx + rx, gy, C_FROST_BRIGHT if abs(rx) < 8 else C_SAPPHIRE)
            if abs(rx) % 4 == 0:
                put(px, cx + rx, gy + 1, C_ICE_CORE)

        # 2. Left & Right Flanking Secondary Glacier Spikes
        for side, tilt_dx, max_sh, base_w in [(-1, -6.5, 24.0, 4.5), (+1, +6.5, 22.0, 4.5)]:
            sh = int(round(max_sh * grow))
            for h in range(sh + 1):
                u_h = h / float(max(1, sh))
                sy = gy - h
                scx = cx + side * 4.5 + tilt_dx * u_h
                hw = max(0, int(round(base_w * (1.0 - u_h))))
                for dx in range(-hw, hw + 1):
                    if dx == -hw or dx == hw:
                        col = C_FROST_BRIGHT if dx * side > 0 else C_SAPPHIRE_DARK
                    elif dx == 0:
                        col = C_ICE_CORE
                    else:
                        col = C_FROST_CYAN if dx < 0 else C_SAPPHIRE
                    put(px, scx + dx, sy, col)

        # 3. Towering Central Multi-Faceted Glacial Crystal Spire (up to 41px tall: y=6..47)
        main_h = int(round(41.0 * grow))
        for h in range(main_h + 1):
            u_h = h / float(max(1, main_h))
            sy = gy - h
            # Faceted hexagonal crystal profile: widens slightly above base, then tapers to razor diamond apex
            profile = (0.75 + 0.25 * (u_h / 0.25)) if u_h < 0.25 else (1.0 - (u_h - 0.25) / 0.75)
            hw = max(0, int(round(7.5 * profile)))
            for dx in range(-hw, hw + 1):
                if abs(dx) == hw:
                    col = C_WHITE if (dx < 0 and u_h > 0.3) else C_FROST_BRIGHT
                elif dx == 0:
                    # Inner pulsing aurora gold-white spine
                    is_aurora = abs(u_h - ((f % 10) / 10.0)) < 0.16
                    col = C_GOLD_WHITE if (is_aurora and aurora_pulse > 0.4) else C_WHITE
                elif dx == -1:
                    col = C_ICE_CORE
                elif dx < 0:
                    col = C_FROST_BRIGHT if (h + dx) % 3 == 0 else C_FROST_CYAN
                else:
                    col = C_SAPPHIRE if dx <= 3 else C_SAPPHIRE_DARK
                put(px, cx + dx, sy, col)

        # 4. Orbiting Frost Motes & Apex Star Glint (F06..F21)
        if f >= 5:
            draw_star(px, cx, gy - main_h, 3, C_WHITE, C_GOLD_LIGHT, rot=phase)
            for m in range(5):
                ma = phase * 2.0 + m * (math.pi * 2.0 / 5.0)
                mx = cx + math.cos(ma) * 12.5
                my = gy - 10 - m * 6 + math.sin(ma) * 2.0
                draw_ice_diamond(px, mx, my, 1, C_WHITE, C_FROST_BRIGHT)
    else:
        # F22..F29 (8 frames): Explosive Crystalline Shatter into sparkling ice diamonds!
        u = (f - 22) / 7.0
        for shard_i in range(12):
            ang = -math.pi * 0.92 + (shard_i / 11.0) * math.pi * 0.84
            base_y = gy - 8 - (shard_i % 4) * 8
            dist = 3.0 + u * 18.0
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
        lead_x_base = 47.5 + u * 2.0
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
            cell_img = fn(col_idx)
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
