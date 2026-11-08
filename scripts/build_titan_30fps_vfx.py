#!/usr/bin/env python3
"""
Builds Torgar (Titan - Runic Titan-Forger) 30fps HD-2D Pixel-Art Skill & VFX Sprite Sheet:
- Output: assets/sprites/titan_vfx.png (6240 x 1040, 5 rows x 30 cols at 208x208 per cell)
- Logical canvas per cell: 52x52 upscaled 4x NEAREST to 208x208 (un-inked clean pixel art)
- Rows:
  Row 0 (F00..F29): TECTONIC FORGE-WAVE / SPINNING RUNIC HAMMER PROJECTILE (`forge_wave`)
  Row 1 (F00..F29): ANVIL OF THE MOUNTAIN KING SKY-STRIKE (`runic_anvil`: F00..F11 Plummeting Anvil & Chains, F12..F29 Earth-Slam & Spectral Hammers)
  Row 2 (F00..F29): VOLCANIC BASALT & JADE-RUNE FORGE MONOLITH ERUPTION (`titan` pillar / spire: F00..F06 Fissure, F07..F21 Hexagonal Monolith, F22..F29 Shatter)
  Row 3 (F00..F29): COLOSSAL RAGNAROK WORLD-FORGE TITAN AVATAR & CROSSED WAR-HAMMERS CREST (`titan` Ultimate Avatar)
  Row 4 (F00..F29): SEISMIC MOLTEN-COPPER HAMMER CLEAVE WAVE & NORDIC FORGE CAST SEAL (`titan` slash & seal)
"""

import math
import os
from PIL import Image, ImageDraw

LOGICAL = 52
SCALE = 4
CELL = LOGICAL * SCALE  # 208
COLS = 30
ROWS = 5

# Clean, luminous Molten-Gold / Copper-Bronze / Emerald-Jade / Volcanic-Basalt palette
C_WHITE = (255, 255, 255, 255)
C_GOLD_WHITE = (254, 240, 138, 255)    # #fef08a
C_GOLD_MOLTEN = (251, 191, 36, 255)    # #fbbf24
C_AMBER = (245, 158, 11, 255)
C_MAGMA_ORANGE = (249, 115, 22, 255)
C_MAGMA_RED = (220, 38, 38, 255)

C_COPPER_HI = (234, 88, 12, 255)
C_BRONZE_BRIGHT = (217, 119, 6, 255)
C_BRONZE_MID = (180, 83, 9, 255)
C_BRONZE_DARK = (120, 53, 15, 255)

C_JADE_WHITE = (209, 250, 229, 255)
C_JADE_LIGHT = (110, 231, 183, 255)    # #6ee7b7
C_JADE_BRIGHT = (16, 185, 129, 255)    # #10b981
C_JADE_DEEP = (4, 120, 87, 255)

C_BASALT_LIGHT = (100, 116, 139, 255)
C_BASALT_MID = (51, 65, 85, 255)
C_BASALT_DARK = (30, 41, 59, 255)
C_BASALT_DEEP = (15, 23, 42, 255)

C_GOLD_AURA = (251, 191, 36, 145)
C_JADE_AURA = (16, 185, 129, 145)


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


def draw_mini_hammer(px, cx, cy, angle_rad, scale=1.0, glow=True):
    """Draws a spinning/flying spectral or runic war-hammer centered at (cx, cy)."""
    ux, uy = math.cos(angle_rad), math.sin(angle_rad)
    px_v, py_v = -uy, ux
    # Haft
    for d in range(-int(6 * scale), int(5 * scale) + 1):
        hx = cx + ux * d
        hy = cy + uy * d
        put(px, hx, hy, C_BRONZE_BRIGHT if d % 2 == 0 else C_BASALT_MID)
    # Hammerhead block at tip (+4*scale)
    hcx = cx + ux * (4.0 * scale)
    hcy = cy + uy * (4.0 * scale)
    for sp in range(-int(5 * scale), int(5 * scale) + 1):
        for ta in range(-int(3 * scale), int(3 * scale) + 1):
            wx = hcx + px_v * sp + ux * ta
            wy = hcy + py_v * sp + uy * ta
            if abs(sp) == int(5 * scale) or abs(ta) == int(3 * scale):
                col = C_GOLD_WHITE if glow else C_BRONZE_BRIGHT
            elif sp == 0 or ta == 0:
                col = C_JADE_LIGHT if glow else C_JADE_BRIGHT
            else:
                col = C_BASALT_DARK
            put(px, wx, wy, col)


def draw_mountain_king_anvil(px, cx, top_y, w=28, h=22, phase=0.0, superheated=False):
    """
    Renders the Colossal Bronze, Dark-Iron & Emerald-Rune Mountain King's Forge Anvil (`28x22` logical px):
    - Top flat striking face + projecting horn on the right & heel on the left (`dy = 0..6`)
    - Tapered heavy waist (`dy = 7..14`) etched with glowing Nordic Emerald-Jade & Molten-Gold runes
    - Wide stepped forged base (`dy = 15..21`)
    """
    half_w = w // 2  # 14
    for dy in range(h):
        y = top_y + dy
        if dy <= 2:
            # Top striking table + superheated golden-jade surface
            x0, x1 = cx - half_w + 2, cx + half_w - 2
        elif dy <= 6:
            # Projecting Anvil Horn (right) and Heel (left)
            horn_ext = half_w - (dy - 3)
            x0, x1 = cx - horn_ext, cx + horn_ext
        elif dy <= 14:
            # Heavy concave forged waist
            waist_w = 8 + abs(dy - 10)
            x0, x1 = cx - waist_w, cx + waist_w
        else:
            # Wide stepped Anvil Base & feet
            base_w = 10 + (dy - 14) // 2
            x0, x1 = cx - base_w, cx + base_w

        for x in range(x0, x1 + 1):
            dx = x - cx
            is_border = (x == x0 or x == x1 or dy == 0 or dy == h - 1 or dy == 6 or dy == 15)
            if dy == 0:
                col = C_GOLD_WHITE if superheated else C_GOLD_MOLTEN
            elif is_border:
                col = C_GOLD_MOLTEN if (superheated and dy <= 6) else C_BRONZE_BRIGHT
            elif 8 <= dy <= 13 and abs(dx) <= 5:
                # Central Carved Nordic Emerald-Jade & Gold Anvil Rune
                if dx == 0 or abs(dx) == 3 or (dy in (8, 13) and abs(dx) <= 3):
                    col = C_JADE_WHITE if superheated else C_JADE_LIGHT
                elif abs(dx) == 1 and dy in (10, 11):
                    col = C_GOLD_WHITE
                else:
                    col = C_BASALT_DEEP
            elif dy <= 5 and abs(dx) % 4 == 0:
                col = C_JADE_BRIGHT if (dx + int(round(phase * 2))) % 2 == 0 else C_GOLD_MOLTEN
            else:
                col = C_BASALT_MID if dx < 0 else C_BASALT_DARK
            put(px, x, y, col)


def build_row0_forge_wave(f):
    """
    Row 0 (`forge_wave` projectile, 0..29):
    - Hurtling molten-copper, gold & emerald-jade runic hammerhead/shockwave tearing up basalt rock shards
      and trailing forge embers (30 frames).
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0
    cy = 26.0

    # 1. Trailing Forge Embers & Jade-Fire Slipstream (x=4..28)
    for w_i in range(6):
        wy0 = cy + (w_i - 2.5) * 4.2
        for d in range(14):
            wx = 26.0 - d * 1.6
            wy = wy0 + math.sin(d * 0.5 - phase * 2.0 + w_i) * 1.5
            if (d + f + w_i) % 2 == 0:
                col = C_GOLD_MOLTEN if d < 5 else (C_JADE_LIGHT if w_i % 2 == 0 else C_MAGMA_ORANGE)
                put(px, wx, wy, col)

    # 2. Tearing Up Basalt Rock Shards along the bottom wake (y=36..47, x=10..42)
    for r_i in range(5):
        u_r = ((f / 30.0) + r_i / 5.0) % 1.0
        rx = int(round(40.0 - u_r * 28.0))
        ry = int(round(44.0 - math.sin(u_r * math.pi) * (5.0 + (r_i % 2) * 3.0)))
        for dy_b in (-1, 0, 1):
            for dx_b in (-1, 0, 1):
                put(px, rx + dx_b, ry + dy_b, C_GOLD_MOLTEN if (dy_b == -1 and dx_b == 0) else C_BASALT_MID)

    # 3. Spinning Runic War-Hammer inside the Shockwave Core (x=27, y=26)
    draw_mini_hammer(px, 27.0, cy, -phase * 2.0, scale=1.25, glow=True)

    # 4. Leading Molten-Copper, Gold & Emerald-Jade Tectonic Shockwave Crescent (apex at x=46)
    for dy in range(-19, 20):
        u = dy / 19.0
        y = cy + dy
        lead_x = 46.0 - (u * u) * 16.5 + math.sin(phase + u * 3.0) * 0.6
        thick = max(1, int(round((1.0 - u * u * 0.75) * 8.0)))
        for t_off in range(thick + 1):
            wx = lead_x - t_off
            if t_off == 0:
                put(px, wx, y, C_GOLD_WHITE)
            elif t_off == 1:
                put(px, wx, y, C_GOLD_MOLTEN)
            elif t_off == 2:
                is_rune = (abs(dy + f) % 4 <= 1) and (abs(u) < 0.75)
                put(px, wx, y, C_JADE_LIGHT if is_rune else C_COPPER_HI)
            elif t_off <= 4:
                put(px, wx, y, C_JADE_BRIGHT if (dy + t_off) % 2 == 0 else C_BRONZE_BRIGHT)
            else:
                put(px, wx, y, C_BRONZE_DARK if t_off < thick else C_BASALT_DARK)

    draw_star(px, 46, cy, 3 + (f % 2), C_WHITE, C_GOLD_MOLTEN, rot=phase)
    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row1_runic_anvil(f):
    """
    Row 1 (`runic_anvil` - Anvil of the Mountain King Sky-Strike, 30..59):
    - F00..F11: Colossal bronze, dark-iron & emerald-rune Mountain King's Forge Anvil (28x22 logical px)
      plummeting from the sky with trailing glowing chains and magma sparks.
    - F12..F29: Anvil slamming into the earth (y=26..46) with a blinding molten-gold & jade runic explosion,
      flying spectral forge hammers, and expanding shockwave rings!
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    cx = 26

    if f < 12:
        # F00..F11: Colossal 28x22 Mountain King's Forge Anvil plummeting from the sky
        u = f / 11.0
        phase = u * math.pi * 2.0
        top_y = int(round(2 + u * 22))  # descends from y=2 down to y=24

        # 1. Trailing Glowing Runic Forge Chains & Magma Sparks above the falling Anvil
        for chain_x in (cx - 7, cx + 7):
            for y_c in range(1, max(2, top_y)):
                link_w = 1 if (y_c + f) % 3 == 0 else 0
                for dx_c in range(-link_w, link_w + 1):
                    put(px, chain_x + dx_c, y_c, C_GOLD_WHITE if (y_c + f) % 4 == 0 else C_JADE_LIGHT)
        for sp in range(8):
            sx = cx + int(math.sin(sp * 1.7 + phase) * 12)
            sy = max(1, top_y - 2 - (sp * 3 + f) % 14)
            put(px, sx, sy, C_GOLD_MOLTEN if sp % 2 == 0 else C_MAGMA_ORANGE)

        # 2. The Colossal 28x22 Mountain King's Forge Anvil
        draw_mountain_king_anvil(px, cx, top_y, w=28, h=22, phase=phase, superheated=(f >= 8))

    else:
        # F12..F29: Anvil slamming into the earth (y=25..46) with blinding molten-gold & jade explosion,
        # flying spectral forge hammers, and expanding shockwave rings!
        u = (f - 12) / 17.0
        phase = u * math.pi * 2.0
        gy = 45
        vib_y = -1 if (f in (12, 14)) else 0

        # 1. Expanding Molten-Gold & Emerald-Jade Runic Shockwave Rings on the ground
        rx = 9.0 + u * 16.0
        ry = 3.0 + u * 4.5
        for s in range(48):
            a = (s / 48.0) * math.pi * 2.0 + u * 2.5
            sx = cx + math.cos(a) * rx
            sy = gy - 2 + math.sin(a) * ry
            put(px, sx, sy, C_GOLD_WHITE if s % 4 == 0 else (C_JADE_LIGHT if s % 2 == 0 else C_MAGMA_ORANGE))

        # 2. Slammed 28x22 Mountain King's Forge Anvil anchored at y=25..46
        draw_mountain_king_anvil(px, cx, 25 + vib_y, w=28, h=22, phase=phase, superheated=(u < 0.65))

        # 3. Flying Spectral Forge Hammers & Blinding Golden-Jade Runic Explosion
        for h_side in (-1, 1):
            ang_launch = -math.pi * 0.5 + h_side * (0.45 + u * 0.75)
            dist = 8.0 + u * 15.0
            hx = cx + math.cos(ang_launch) * dist
            hy = 28.0 + math.sin(ang_launch) * dist * 0.8
            draw_mini_hammer(px, hx, hy, phase * 2.5 * h_side, scale=0.65, glow=True)

        if u < 0.55:
            draw_star(px, cx, 25, 5, C_WHITE, C_GOLD_WHITE, rot=phase)
            draw_star(px, cx - 10, 32, 3, C_JADE_WHITE, C_JADE_LIGHT, rot=-phase)
            draw_star(px, cx + 10, 32, 3, C_JADE_WHITE, C_JADE_LIGHT, rot=-phase)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row2_forge_monolith(f):
    """
    Row 2 (`titan` pillar / spire - Volcanic Basalt & Jade-Rune Forge Monolith Eruption, 60..89):
    - F00..F06: Glowing golden-jade magma fissure & Nordic forge runes on the ground.
    - F07..F21: Towering hexagonal Basalt & Bronze Forge-Monolith (y=6..48) carved with glowing
      emerald-jade and molten-gold runes and topped with an anvil crown.
    - F22..F29: Explosive volcanic shatter into glowing magma fragments and jade sparks.
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    cx = 26
    gy = 47
    phase = (f / 30.0) * math.pi * 2.0

    if f <= 6:
        # F00..F06: Glowing golden-jade magma fissure & Nordic forge runes on the ground + early eruption
        u = f / 6.0
        fissure_w = int(round(8 + u * 10))
        for dx in range(-fissure_w, fissure_w + 1):
            put(px, cx + dx, gy, C_GOLD_WHITE if abs(dx) < 5 else C_MAGMA_ORANGE)
            put(px, cx + dx, gy - 1, C_JADE_LIGHT if dx % 3 == 0 else C_GOLD_MOLTEN)
            if abs(dx) % 4 == 0:
                draw_line(px, cx + dx, gy, cx + dx, gy - int(2 + u * 8), C_GOLD_MOLTEN if dx < 0 else C_JADE_LIGHT)
        # Rising monolith tip emerging from fissure on F03..F06
        if f >= 3:
            emerge_h = int(round((f - 2) * 7.0))
            for h in range(emerge_h):
                sy = gy - h
                for dx in range(-7, 8):
                    put(px, cx + dx, sy, C_BRONZE_BRIGHT if abs(dx) == 7 else (C_JADE_LIGHT if dx == 0 else C_BASALT_DARK))

    elif f <= 21:
        # F07..F21: Towering Hexagonal Basalt & Bronze Forge-Monolith (y=6..48) topped with an Anvil Crown!
        k = f - 7
        grow = min(1.0, (k + 2) / 3.0)
        mon_h = int(round(41.0 * grow))
        top_y = gy - mon_h

        # Ground Magma & Jade Fissure Base (y=45..48)
        for dx in range(-15, 16):
            put(px, cx + dx, gy, C_GOLD_MOLTEN if abs(dx) < 10 else C_MAGMA_ORANGE)
            put(px, cx + dx, gy + 1, C_BRONZE_DARK)

        # Hexagonal Basalt & Bronze Column Shaft
        for h in range(mon_h + 1):
            sy = gy - h
            u_h = h / float(max(1, mon_h))
            # Anvil Crown widening at top 22% of monolith
            if u_h > 0.78:
                hw = 10 if u_h < 0.92 else 8
            else:
                hw = 7 if u_h > 0.12 else 9

            for dx in range(-hw, hw + 1):
                if abs(dx) == hw or h == mon_h:
                    col = C_GOLD_MOLTEN if (u_h > 0.78 and h % 2 == 0) else C_BRONZE_BRIGHT
                elif abs(dx) == 3:
                    # Hexagonal facet ridge
                    col = C_BRONZE_MID if (h + k) % 4 != 0 else C_GOLD_MOLTEN
                elif dx == 0 and 0.15 <= u_h <= 0.85:
                    # Central vertical Nordic Emerald-Jade & Gold rune channel
                    col = C_JADE_WHITE if (h + f) % 5 == 0 else C_JADE_LIGHT
                elif abs(dx) in (1, 2) and (h % 6 in (2, 4)) and (0.2 <= u_h <= 0.75):
                    # Carved horizontal rune cross-bars
                    col = C_GOLD_WHITE if (h + f) % 3 == 0 else C_GOLD_MOLTEN
                else:
                    col = C_BASALT_MID if dx < -3 else (C_BASALT_DARK if abs(dx) <= 3 else C_BASALT_DEEP)
                put(px, cx + dx, sy, col)

        # Rising forge embers & orbiting jade sparks around the monolith
        draw_star(px, cx, top_y, 3, C_WHITE, C_GOLD_WHITE, rot=phase)
        for m in range(4):
            ma = phase * 2.0 + m * (math.pi * 0.5)
            mx = cx + math.cos(ma) * 12.0
            my = gy - 8 - m * 8 + math.sin(ma) * 2.0
            put(px, mx, my, C_JADE_LIGHT if m % 2 == 0 else C_GOLD_MOLTEN)
            put(px, mx, my - 1, C_WHITE)

    else:
        # F22..F29: Explosive volcanic shatter into glowing magma fragments and jade sparks!
        u = (f - 22) / 7.0
        for sh_i in range(14):
            ang = -math.pi * 0.92 + (sh_i / 13.0) * math.pi * 0.84
            base_y = gy - 6 - (sh_i % 5) * 7
            dist = 3.0 + u * 18.0
            sx = int(round(cx + math.cos(ang) * dist))
            sy = int(round(base_y + math.sin(ang) * dist * 0.6 + u * u * 6.0))
            for dy_s in (-1, 0, 1):
                for dx_s in (-1, 0, 1):
                    if abs(dx_s) + abs(dy_s) <= (2 if u < 0.6 else 1):
                        col = (
                            C_GOLD_WHITE
                            if (dx_s == 0 and dy_s == 0 and sh_i % 2 == 0)
                            else (C_JADE_LIGHT if sh_i % 3 == 0 else (C_MAGMA_ORANGE if dx_s == 0 else C_BASALT_DARK))
                        )
                        put(px, sx + dx_s, sy + dy_s, col)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row3_ragnarok_avatar(f):
    """
    Row 3 (Colossal Ragnarok World-Forge Titan Avatar & Crossed War-Hammers Crest, 90..119):
    - Towering horned molten-gold, bronze & emerald-jade Ragnarok Titan-Forger Spirit (46x46 logical px)
      with a blazing beard of fire, crossed runic war-hammers behind his shoulders, and a pulsing
      Nordic World-Forge Halo (30 frames).
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0
    cx, cy = 26.0, 26.0
    bob = int(round(math.sin(phase) * 1.0))

    # 1. Outer Pulsing Nordic World-Forge Halo Ring (r=22.5 -> 46x46 span)
    halo_r = 22.0 + math.sin(phase * 2.0) * 0.7
    for s in range(64):
        a = (s / 64.0) * math.pi * 2.0 + phase
        rx = cx + math.cos(a) * halo_r
        ry = cy + math.sin(a) * halo_r
        is_node = (s % 8 == 0)
        put(px, rx, ry, C_GOLD_WHITE if is_node else (C_JADE_LIGHT if s % 2 == 0 else C_GOLD_MOLTEN))
        if is_node:
            put(px, cx + math.cos(a) * (halo_r - 1.5), cy + math.sin(a) * (halo_r - 1.5), C_MAGMA_ORANGE)

    # 2. Crossed Runic War-Hammers Behind the Titan Avatar's Shoulders (-45 deg and -135 deg)
    draw_mini_hammer(px, cx - 10, cy - 8 + bob, math.radians(-135.0), scale=1.2, glow=True)
    draw_mini_hammer(px, cx + 10, cy - 8 + bob, math.radians(-45.0), scale=1.2, glow=True)
    for sign in (-1, 1):
        draw_line(px, cx, cy + 4 + bob, cx + sign * 14, cy - 10 + bob, C_BRONZE_BRIGHT)

    # 3. Towering Armored Shoulders & Chest Furnace Core (y=22..44, x=10..42)
    for y in range(22 + bob, 44 + bob):
        u_y = (y - (22 + bob)) / 22.0
        hw = int(round(16.0 * (1.0 - u_y * 0.35)))
        for dx in range(-hw, hw + 1):
            if abs(dx) == hw or y == 22 + bob:
                col = C_GOLD_MOLTEN if abs(dx) > 10 else C_BRONZE_BRIGHT
            elif abs(dx) <= 4 and 29 + bob <= y <= 38 + bob:
                # Blazing Chest Furnace Grate
                col = C_GOLD_WHITE if dx % 2 == 0 else C_MAGMA_ORANGE
            elif abs(dx) in (9, 10) and y <= 30 + bob:
                # Shoulder Pauldron Jade Runes
                col = C_JADE_LIGHT
            else:
                col = C_BASALT_DARK if (dx + y) % 2 == 0 else C_BASALT_DEEP
            put(px, cx + dx, y, col)

    # 4. Horned Viking/Forge Helm (y=10..21) & Glowing Molten-Gold Eyes
    for y in range(12 + bob, 22 + bob):
        for dx in range(-6, 7):
            if abs(dx) == 6 or y == 12 + bob or dx == 0:
                col = C_BRONZE_BRIGHT if abs(dx) > 0 else C_GOLD_MOLTEN
            elif y in (17 + bob, 18 + bob) and abs(dx) in (2, 3):
                col = C_GOLD_WHITE  # Blazing eyes
            else:
                col = C_BASALT_MID
            put(px, cx + dx, y, col)

    # Curved Great Horns sweeping upward from helm (`y=5..16`)
    for side in (-1, 1):
        for h_step in range(10):
            hx = cx + side * (6 + h_step * 0.85 - (h_step > 6) * 1.2)
            hy = 15 + bob - h_step * 1.0
            put(px, hx, hy, C_GOLD_WHITE if h_step >= 7 else C_BRONZE_BRIGHT)
            put(px, hx - side, hy, C_GOLD_MOLTEN)

    # 5. Blazing Beard of Fire & Braided Molten Copper (y=20..35, x=19..33)
    for dy_b in range(15):
        by = 20 + bob + dy_b
        bw = max(1, int(round(6.5 * (1.0 - dy_b / 16.0))))
        sway = math.sin(phase * 2.0 - dy_b * 0.4) * 0.8
        for dx_b in range(-bw, bw + 1):
            bx = cx + dx_b + sway
            if abs(dx_b) == bw:
                col = C_MAGMA_RED if dy_b > 8 else C_COPPER_HI
            elif (dx_b + dy_b + f) % 3 == 0:
                col = C_GOLD_WHITE if dy_b < 6 else C_GOLD_MOLTEN
            else:
                col = C_MAGMA_ORANGE
            put(px, bx, by, col)

    # Apex Emerald-Gold Forge Crown Star above Avatar
    draw_star(px, cx, 6 + bob, 3, C_JADE_WHITE, C_JADE_LIGHT, rot=-phase)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row4_cleave_and_seal(f):
    """
    Row 4 (Seismic Molten-Copper Hammer Cleave Wave & Nordic Forge Cast Seal, 120..149):
    - Sweeping crescent wave of liquid gold, copper, and emerald-jade runes paired with a rotating
      Nordic Forge-Wheel runic seal (30 frames).
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0
    cy = 26.0

    # 1. Rotating Nordic Forge-Wheel Runic Seal on the left/center (`cx_seal=19, cy=26`)
    cx_seal = 19.0
    seal_r = 12.0 + math.sin(phase * 2.0) * 1.0
    for s in range(36):
        a = (s / 36.0) * math.pi * 2.0 + phase * 1.5
        rx = cx_seal + math.cos(a) * seal_r
        ry = cy + math.sin(a) * seal_r
        put(px, rx, ry, C_JADE_LIGHT if s % 3 == 0 else C_GOLD_MOLTEN)
    # 6 Forge-Wheel Spokes
    for spk in range(6):
        sa = phase * 1.5 + spk * (math.pi / 3.0)
        draw_line(
            px,
            cx_seal,
            cy,
            cx_seal + math.cos(sa) * (seal_r - 1.0),
            cy + math.sin(sa) * (seal_r - 1.0),
            C_GOLD_WHITE if spk % 2 == 0 else C_JADE_BRIGHT,
        )
    draw_star(px, cx_seal, cy, 3, C_WHITE, C_GOLD_MOLTEN, rot=-phase)

    # 2. Sweeping Crescent Wave of Liquid Gold, Copper & Emerald-Jade Runes (`x=24..48`)
    wave_prog = (f % 15) / 14.0
    lead_x_base = 35.0 + wave_prog * 12.5
    thick_peak = 8.5 * (1.0 - wave_prog * 0.35)

    for dy in range(-20, 21):
        u = dy / 20.0
        y = cy + dy
        ax_lead = lead_x_base - (u * u) * 14.5
        thick = max(1, int(round((1.0 - u * u * 0.78) * thick_peak)))
        for t_off in range(thick + 1):
            wx = ax_lead - t_off
            if t_off == 0:
                put(px, wx, y, C_GOLD_WHITE)
            elif t_off == 1:
                put(px, wx, y, C_GOLD_MOLTEN)
            elif t_off == 2:
                is_rune = (abs(dy + f) % 4 <= 1) and (abs(u) < 0.75)
                put(px, wx, y, C_JADE_WHITE if is_rune else C_COPPER_HI)
            elif t_off <= 4:
                put(px, wx, y, C_JADE_BRIGHT if (dy + t_off) % 2 == 0 else C_MAGMA_ORANGE)
            else:
                put(px, wx, y, C_BRONZE_DARK)

    # Flying forge sparks ahead of the crescent cleave
    for sp in range(5):
        sx = min(50, int(round(lead_x_base - (sp - 2) ** 2 * 2.2 + 2.0)))
        sy = int(round(cy + (sp - 2) * 7.5 + math.sin(phase + sp) * 1.5))
        put(px, sx, sy, C_GOLD_WHITE if sp % 2 == 0 else C_JADE_LIGHT)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def main():
    sheet_w = COLS * CELL  # 6240
    sheet_h = ROWS * CELL  # 1040
    sheet = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))

    builders = [
        ("ROW 0: TECTONIC FORGE-WAVE & RUNIC HAMMER PROJECTILE (30 FRAMES)", build_row0_forge_wave),
        ("ROW 1: ANVIL OF THE MOUNTAIN KING SKY-STRIKE & IMPACT (30 FRAMES)", build_row1_runic_anvil),
        ("ROW 2: VOLCANIC BASALT & JADE-RUNE FORGE MONOLITH (30 FRAMES)", build_row2_forge_monolith),
        ("ROW 3: COLOSSAL RAGNAROK WORLD-FORGE TITAN AVATAR (30 FRAMES)", build_row3_ragnarok_avatar),
        ("ROW 4: SEISMIC HAMMER CLEAVE WAVE & NORDIC FORGE SEAL (30 FRAMES)", build_row4_cleave_and_seal),
    ]

    for row_idx, (label, fn) in enumerate(builders):
        for col_idx in range(COLS):
            cell_img = fn(col_idx)
            sheet.paste(cell_img, (col_idx * CELL, row_idx * CELL))

    out_path = "/home/antigravity/assets/sprites/titan_vfx.png"
    sheet.save(out_path)
    print(f"Saved 30fps Titan VFX sheet to {out_path} ({sheet.size[0]}x{sheet.size[1]})")

    # Build contact sheet in artifact directory
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
        draw.text((6, y0 + 2), label, fill=(110, 231, 183, 255))
        for c_idx in range(COLS):
            x0 = c_idx * thumb
            draw.text((x0 + 4, y0 + 12), f"F{c_idx:02d}", fill=(251, 191, 36, 255))
            cell_crop = sheet.crop((c_idx * CELL, r_idx * CELL, (c_idx + 1) * CELL, (r_idx + 1) * CELL))
            cell_thumb = cell_crop.resize((thumb, thumb), Image.Resampling.NEAREST)
            contact.paste(cell_thumb, (x0, y0 + pad_top), cell_thumb)
            draw.rectangle([x0, y0 + pad_top, x0 + thumb - 1, y0 + pad_top + thumb - 1], outline=(35, 52, 78, 255))

    c_path = os.path.join(art_dir, "debug_titan_30fps_vfx.png")
    contact.save(c_path)
    print(f"Saved VFX contact sheet: {c_path} ({contact.size[0]}x{contact.size[1]})")


if __name__ == "__main__":
    main()
