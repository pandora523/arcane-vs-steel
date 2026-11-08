#!/usr/bin/env python3
"""
Builds Zephyros / Vespera (Chronomancer) 30fps HD-2D Pixel-Art Skill & VFX Sprite Sheet:
- Output: assets/sprites/chronomancer_vfx.png (6240 x 1040, 5 rows x 30 cols at 208x208 per cell)
- Logical canvas per cell: 52x52 upscaled 4x NEAREST to 208x208 (un-inked clean pixel art)
- Rows:
  Row 0 (F00..F29): CLOCK-GEAR PROJECTILE & ORBITING GEARS (12-deg tooth rotation per frame, inner spokes, glowing turquoise core, time-spark wake)
  Row 1 (F00..F29): STASIS HOURGLASS (F00..F06 materializing with golden wings, F07..F21 streaming turquoise time-sand & orbiting Roman numerals, F22..F29 cyan-gold rewind shatter burst)
  Row 2 (F00..F29): TEMPORAL RIFT PORTAL (Swirling turquoise-and-gold space-time wormhole portal with rotating clockwork bezel teeth & dimensional lightning)
  Row 3 (F00..F29): DOOMSDAY MIDNIGHT GRAND CELESTIAL CLOCKFACE (Cathedral astrolabe clockface with Roman numerals I..XII, counter-rotating inner brass gears, hands sweeping toward XII F00..F21, Midnight shockwave F22..F29)
  Row 4 (F00..F29): CHRONO-PENDULUM SLASH WAVE & ASTROLABE SEAL (Sweeping cyan-gold pendulum arc wave & clockwork cast seal)
"""

import math
import os
from PIL import Image, ImageDraw

LOGICAL = 52
SCALE = 4
CELL = LOGICAL * SCALE  # 208
COLS = 30
ROWS = 5

# Clean, luminous Chronomancer Brass, Gold, Turquoise & Astral Teal Palette
C_WHITE = (255, 255, 255, 255)
C_GOLD_STAR = (254, 249, 195, 255)     # #fef9c3
C_GOLD_LIGHT = (254, 240, 138, 255)    # #fef08a
C_GOLD = (250, 204, 21, 255)           # #facc15
C_BRASS_LIGHT = (224, 182, 94, 255)
C_BRASS_MID = (176, 134, 68, 255)
C_BRASS_DARK = (120, 86, 38, 255)
C_BRONZE_DEEP = (68, 48, 30, 235)

C_CYAN_CORE = (204, 251, 241, 255)     # #ccfbf1
C_CYAN_BRIGHT = (103, 232, 249, 255)   # #67e8f9
C_TEAL_LIGHT = (94, 234, 212, 255)     # #5eead4
C_TEAL = (45, 212, 191, 255)           # #2dd4bf
C_TEAL_MID = (20, 184, 166, 255)       # #14b8a6
C_TEAL_DARK = (13, 148, 136, 255)      # #0d9488
C_TEAL_DEEP = (17, 94, 89, 235)        # #115e59

C_TEAL_AURA = (45, 212, 191, 140)
C_GOLD_AURA = (250, 204, 21, 145)


def put(px, x, y, col):
    ix = int(round(x))
    iy = int(round(y))
    # Enforce strict 2 <= x <= 49, 2 <= y <= 49 margin across all 52x52 VFX cells
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


def draw_roman_glyph(px, cx, cy, glyph_id, col_main, col_serif):
    """Draws a crisp micro-pixel Roman numeral glyph (XII, III, VI, IX, IV, VIII) with top/bottom serif bars."""
    gx = int(round(cx))
    gy = int(round(cy))
    # Top and bottom Roman numeral serif bars
    for dx in range(-2, 3):
        put(px, gx + dx, gy - 2, col_serif)
        put(px, gx + dx, gy + 2, col_serif)
    if glyph_id == 0:  # XII
        put(px, gx - 2, gy - 1, col_main)
        put(px, gx - 1, gy, col_main)
        put(px, gx - 2, gy + 1, col_main)
        put(px, gx, gy - 1, col_main)
        put(px, gx, gy + 1, col_main)
        for dy in (-1, 0, 1):
            put(px, gx + 1, gy + dy, col_main)
            put(px, gx + 2, gy + dy, col_main)
    elif glyph_id == 1:  # III
        for dx in (-2, 0, 2):
            for dy in (-1, 0, 1):
                put(px, gx + dx, gy + dy, col_main)
    elif glyph_id == 2:  # VI
        put(px, gx - 2, gy - 1, col_main)
        put(px, gx - 1, gy + 1, col_main)
        put(px, gx, gy - 1, col_main)
        for dy in (-1, 0, 1):
            put(px, gx + 2, gy + dy, col_main)
    elif glyph_id == 3:  # IX
        for dy in (-1, 0, 1):
            put(px, gx - 2, gy + dy, col_main)
        put(px, gx, gy - 1, col_main)
        put(px, gx + 1, gy, col_main)
        put(px, gx + 2, gy + 1, col_main)
        put(px, gx + 2, gy - 1, col_main)
        put(px, gx, gy + 1, col_main)
    elif glyph_id == 4:  # IV
        for dy in (-1, 0, 1):
            put(px, gx - 2, gy + dy, col_main)
        put(px, gx, gy - 1, col_main)
        put(px, gx + 1, gy + 1, col_main)
        put(px, gx + 2, gy - 1, col_main)
    else:  # X
        put(px, gx - 1, gy - 1, col_main)
        put(px, gx, gy, col_main)
        put(px, gx + 1, gy + 1, col_main)
        put(px, gx + 1, gy - 1, col_main)
        put(px, gx - 1, gy + 1, col_main)


def build_row0_clock_gear(f):
    """
    Row 0 (F00..F29): CLOCK-GEAR PROJECTILE & ORBITING GEARS (Pass #4)
    - Sharper 3D beveled brass gear teeth (sunlit gold leading bevel, brass crown, bronze shadow bevel)
    - Inner counter-rotating cyan escapement wheel with swept ratchet pawls
    - Golden spark glints & slipstream wake (strictly within 2 <= x <= 49, 2 <= y <= 49)
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    cx, cy = 27.0, 26.0
    rot = math.radians(f * 12.0)  # Exact 12-deg tooth rotation per frame (360 deg across 30 frames)

    # 1. Trailing Time-Spark Wake & Golden Spark Glints (left side x=4..22)
    for w_i in range(6):
        u_w = ((f / 30.0) + w_i / 6.0) % 1.0
        wx = max(4.0, cx - 7.5 - u_w * 15.0)
        wy = cy + math.sin(rot * 2.0 + w_i * 1.3) * (2.5 + u_w * 5.0)
        put(px, wx, wy, C_GOLD_LIGHT if w_i % 2 == 0 else C_TEAL_LIGHT)
        put(px, wx - 1, wy, C_TEAL_AURA)
        if (w_i + f) % 3 == 0 and wx >= 5.0:
            draw_star(px, wx, wy, 2, C_WHITE, C_GOLD_LIGHT, rot=0.0)

    # 2. Soft Turquoise-Gold Radial Aura Ring
    draw_circle(px, cx, cy, 17.5, C_TEAL_AURA, steps=64)
    draw_circle(px, cx, cy, 16.0, C_GOLD_AURA, steps=56)

    # 3. 12 Sharply Beveled Brass Gear Teeth (outer radius 13..18.5)
    num_teeth = 12
    for t_idx in range(num_teeth):
        base_a = rot + t_idx * (2.0 * math.pi / num_teeth)
        # Dark bronze gullet between teeth at root radius 13.2
        gullet_a = base_a + (math.pi / num_teeth)
        put(px, cx + math.cos(gullet_a) * 13.4, cy + math.sin(gullet_a) * 13.4, C_BRONZE_DEEP)
        put(px, cx + math.cos(gullet_a - 0.05) * 13.4, cy + math.sin(gullet_a - 0.05) * 13.4, C_BRASS_DARK)

        # 3-facet beveled tooth profile (leading specular bevel, gold crown, trailing shadow bevel)
        for r_step in range(13, 19):
            frac = (r_step - 13) / 5.0
            sweep = frac * 0.11
            ang_c = base_a - sweep
            # Leading sunlit bevel
            if r_step <= 17:
                lx = cx + math.cos(ang_c - 0.065 * (1.0 - frac * 0.35)) * r_step
                ly = cy + math.sin(ang_c - 0.065 * (1.0 - frac * 0.35)) * r_step
                put(px, lx, ly, C_WHITE if r_step >= 16 else C_GOLD_LIGHT)
            # Trailing dark-brass bevel
            if r_step <= 17:
                rx_b = cx + math.cos(ang_c + 0.075 * (1.0 - frac * 0.35)) * r_step
                ry_b = cy + math.sin(ang_c + 0.075 * (1.0 - frac * 0.35)) * r_step
                put(px, rx_b, ry_b, C_BRASS_DARK if r_step <= 15 else C_BRASS_MID)
            # Central tooth ridge & razor tip
            tx = cx + math.cos(ang_c) * r_step
            ty = cy + math.sin(ang_c) * r_step
            col_t = C_WHITE if r_step == 18 else (C_GOLD_STAR if r_step == 17 else C_GOLD)
            put(px, tx, ty, col_t)

    # 4. Concentric Beveled Golden-Brass Outer Rim (r = 9.8..13.2)
    for r_i, col in [
        (13.0, C_BRASS_DARK),
        (12.2, C_GOLD_LIGHT),
        (11.3, C_GOLD),
        (10.3, C_BRASS_DARK),
    ]:
        draw_circle(px, cx, cy, r_i, col, steps=60)

    # 12 Turquoise & Gold Rivet Studs around the Brass Rim
    for r_idx in range(12):
        ra = rot + r_idx * (math.pi / 6.0)
        rx = cx + math.cos(ra) * 11.5
        ry = cy + math.sin(ra) * 11.5
        put(px, rx, ry, C_CYAN_CORE if r_idx % 2 == 0 else C_WHITE)

    # 5. Inner Counter-Rotating Cyan Escapement Wheel (r = 4.5..9.6)
    esc_rot = -rot * 1.5
    draw_circle(px, cx, cy, 7.6, C_CYAN_BRIGHT, steps=44)
    draw_circle(px, cx, cy, 6.8, C_TEAL_DARK, steps=40)
    # 8 Counter-Rotating Swept Cyan Escapement Ratchet Teeth
    for e_idx in range(8):
        ea = esc_rot + e_idx * (math.pi * 0.25)
        for er in (8.2, 9.0, 9.6):
            sweep_e = (er - 7.6) * 0.14
            ex = cx + math.cos(ea + sweep_e) * er
            ey = cy + math.sin(ea + sweep_e) * er
            put(px, ex, ey, C_WHITE if er >= 9.4 else C_CYAN_CORE if er >= 8.8 else C_CYAN_BRIGHT)
        # Inner escapement spoke
        if e_idx % 2 == 0:
            draw_line(
                px,
                cx + math.cos(ea) * 4.0,
                cy + math.sin(ea) * 4.0,
                cx + math.cos(ea) * 7.5,
                cy + math.sin(ea) * 7.5,
                C_CYAN_CORE,
            )

    # 4 Forward-Rotating Golden Brass Bridge Spokes over the Escapement Wheel
    for s_idx in range(4):
        sa = rot + s_idx * (math.pi * 0.5)
        draw_line(
            px,
            cx + math.cos(sa) * 4.2,
            cy + math.sin(sa) * 4.2,
            cx + math.cos(sa) * 10.2,
            cy + math.sin(sa) * 10.2,
            C_GOLD_LIGHT,
        )

    # 6. Glowing Turquoise-White Chronomancer Core Hub (r = 0..4.2)
    for dy in range(-4, 5):
        for dx in range(-4, 5):
            d = math.hypot(dx, dy)
            if d <= 1.6:
                put(px, cx + dx, cy + dy, C_WHITE)
            elif d <= 2.9:
                put(px, cx + dx, cy + dy, C_CYAN_CORE)
            elif d <= 4.1:
                put(px, cx + dx, cy + dy, C_GOLD)

    draw_star(px, cx, cy, 4, C_WHITE, C_GOLD_LIGHT, rot=rot)

    # 7. Orbiting Golden Spark Glints on the Gear Rim & Teeth
    for g_i in range(3):
        ga = rot * 2.0 + g_i * (2.0 * math.pi / 3.0)
        gx = cx + math.cos(ga) * 14.5
        gy = cy + math.sin(ga) * 14.5
        draw_star(px, gx, gy, 2 if g_i == f % 3 else 1, C_WHITE, C_GOLD_STAR, rot=0.0)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row1_stasis_hourglass(f):
    """
    Row 1 (F00..F29): ASTRAL STASIS HOURGLASS & REWIND SHATTER (Pass #4)
    - F00..F21: Ornate Winged Brass Side-Pillars on the hourglass frame (prominent F04..F21)
      and a brighter swirling cyan-gold time-sand vortex between the upper and lower bulbs!
    - F22..F29: Crisp Roman numeral shatter fragments (XII, III, VI, IX, IV, X) flying outward!
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    cx, cy = 26.0, 26.0
    phase = (f / 30.0) * math.pi * 2.0

    if f <= 21:
        scale = min(1.0, (f + 3) / 7.0) if f <= 4 else 1.0
        sand_prog = 0.0 if f <= 4 else (f - 4) / 17.0  # 0.0 -> 1.0 sand transfer
        half_h = int(round(15.0 * scale))
        cap_w = int(round(10.0 * scale))

        # 1. Back half of Orbiting Elliptical Ring
        ring_rx = 18.0 * scale
        ring_ry = 5.2 * scale
        for s in range(36):
            a = (s / 36.0) * 2.0 * math.pi + phase * 1.5
            rx = cx + math.cos(a) * ring_rx
            ry = cy + math.sin(a) * ring_ry
            if math.sin(a) < 0:
                put(px, rx, ry, C_TEAL_DARK if s % 3 else C_BRASS_MID)

        # 2. Ornate Winged Brass Side-Pillars & Multi-Tiered Golden-Cyan Chrono-Wings (especially rich F04..F21)
        wing_span = int(round(11.0 * scale))
        wing_flap = math.sin(phase * 2.0) * 1.4
        for side in (-1, 1):
            pillar_x = cx + side * (cap_w - 1)

            # Sweeping Golden-Brass Wing Arch & Layered Feathers anchored to the Side-Pillar
            for d in range(1, wing_span + 1):
                u_w = d / max(1.0, float(wing_span))
                wx = pillar_x + side * d
                arch_y = cy - 7.0 - (u_w ** 0.75) * 5.0 + wing_flap * u_w
                # Top golden wing bone & specular leading edge
                put(px, wx, arch_y, C_WHITE if d <= wing_span - 2 else C_GOLD_STAR)
                put(px, wx, arch_y + 1, C_GOLD_LIGHT)
                put(px, wx, arch_y + 2, C_GOLD)

            # 5 Distinct Articulated Primary Feathers fanning from the Winged Side-Pillar
            for feather in range(5):
                fy0 = cy - 5.5 + feather * 2.8
                f_len = max(2, wing_span - feather * 1.4)
                for d in range(1, int(f_len) + 1):
                    wx = pillar_x + side * d
                    wy = fy0 - (d * 0.25) + wing_flap * (d / 10.0) + feather * 0.45
                    is_upper = feather <= 2
                    col_tip = C_WHITE if d == int(f_len) else (C_GOLD_LIGHT if is_upper else C_CYAN_CORE)
                    col_body = C_GOLD if is_upper else C_CYAN_BRIGHT
                    put(px, wx, wy, col_tip)
                    put(px, wx, wy + 1, col_body)

            # Ornate 3px Turned-Brass Side-Pillar Column with Capitals & Central Gear Node
            for py in range(int(cy - half_h + 1), int(cy + half_h)):
                dy_p = abs(py - cy)
                # Fluted brass shaft (outer dark bronze, center bright gold highlight, inner mid-brass)
                put(px, pillar_x + side, py, C_BRASS_DARK if dy_p % 3 != 0 else C_GOLD)
                put(px, pillar_x, py, C_GOLD_LIGHT if dy_p % 2 == 0 else C_GOLD)
                put(px, pillar_x - side, py, C_BRASS_MID)

                # Corinthian / Astrolabe Brass Capitals near top & bottom of pillar
                if dy_p in (half_h - 2, half_h - 3):
                    put(px, pillar_x + side * 2, py, C_GOLD_LIGHT)
                    put(px, pillar_x - side * 2, py, C_BRASS_LIGHT)

            # Central Winged-Pillar Escapement Collar & Cyan Jewel at y = cy
            for dy_c in (-1, 0, 1):
                put(px, pillar_x + side * 2, cy + dy_c, C_GOLD_LIGHT if dy_c == 0 else C_GOLD)
            put(px, pillar_x, cy, C_CYAN_CORE)

        # 3. Ornate Top & Bottom Brass End-Plates & Finials
        for side_y in (-half_h, half_h):
            for dx in range(-cap_w - 1, cap_w + 2):
                put(px, cx + dx, cy + side_y, C_GOLD_LIGHT if abs(dx) < cap_w else C_GOLD)
                put(px, cx + dx, cy + side_y + (1 if side_y < 0 else -1), C_BRASS_MID)
            for fx_off in (-cap_w, -cap_w // 2, 0, cap_w // 2, cap_w):
                put(px, cx + fx_off, cy + side_y + (-1 if side_y < 0 else 1), C_WHITE if fx_off == 0 else C_GOLD_LIGHT)

        # 4. Crystal Hourglass Bulbs & Brighter Swirling Cyan-Gold Time-Sand Vortex
        for dy in range(-half_h + 2, half_h - 1):
            if dy == 0:
                continue
            u_b = abs(dy) / float(max(1, half_h - 2))
            bulb_w = max(1, int(round((1.3 + math.sin(u_b * math.pi * 0.65) * 6.8) * scale)))

            is_sand = False
            if dy < 0:
                # Top bulb drains with a central vortex funnel depression
                top_fill = 0.92 - sand_prog * 0.72
                if u_b <= top_fill:
                    is_sand = True
            else:
                # Bottom bulb fills from base upward
                bot_fill = 0.25 + sand_prog * 0.72
                if u_b >= (1.0 - bot_fill):
                    is_sand = True

            for dx in range(-bulb_w, bulb_w + 1):
                if abs(dx) == bulb_w:
                    put(px, cx + dx, cy + dy, C_CYAN_CORE if dx < 0 else C_TEAL_LIGHT)
                elif is_sand:
                    # Bright swirling Cyan-Gold helical time-sand vortex pattern inside bulbs
                    swirl = math.sin(dy * 0.65 + (dx / max(1.0, float(bulb_w))) * 2.6 - phase * 3.0)
                    if abs(dx) == 0 and abs(dy) <= 6:
                        col_s = C_WHITE
                    elif swirl > 0.42:
                        col_s = C_GOLD_STAR if swirl > 0.75 else C_GOLD_LIGHT
                    elif swirl > -0.15:
                        col_s = C_WHITE if abs(dx) <= 1 else C_CYAN_CORE
                    elif swirl > -0.60:
                        col_s = C_CYAN_BRIGHT
                    else:
                        col_s = C_GOLD if (dx + dy) % 2 == 0 else C_TEAL
                    put(px, cx + dx, cy + dy, col_s)
                else:
                    # Swirling golden-cyan vortex filaments even in the upper air cavity above the neck
                    vortex_x = math.sin(dy * 0.55 - phase * 3.0) * (bulb_w * 0.55)
                    if abs(dx - vortex_x) <= 0.9:
                        put(px, cx + dx, cy + dy, C_GOLD_LIGHT if dy < 0 else C_CYAN_BRIGHT)
                    elif abs(dx) == bulb_w - 1:
                        put(px, cx + dx, cy + dy, C_TEAL_AURA)

        # 5. Blazing Double-Helix Cyan-Gold Time-Sand Vortex Stream between Upper & Lower Bulbs
        for sy in range(int(cy - half_h + 3), int(cy + half_h - 2)):
            dy_s = sy - cy
            if abs(dy_s) <= 7:
                hx1 = cx + math.sin(dy_s * 0.75 - phase * 4.0) * min(2.2, 0.4 + abs(dy_s) * 0.28)
                hx2 = cx - math.sin(dy_s * 0.75 - phase * 4.0) * min(2.2, 0.4 + abs(dy_s) * 0.28)
                put(px, hx1, sy, C_GOLD_STAR if dy_s % 2 == 0 else C_GOLD_LIGHT)
                put(px, hx2, sy, C_CYAN_CORE if dy_s % 2 == 0 else C_CYAN_BRIGHT)
            put(px, cx, sy, C_WHITE if (sy + f) % 2 == 0 else C_GOLD_STAR)

        # Pinch-point nexus starburst at the hourglass waist
        draw_star(px, cx, cy, 4, C_WHITE, C_GOLD_LIGHT, rot=phase)

        # 6. Front half of Orbiting Roman Numeral Ring
        for s in range(36):
            a = (s / 36.0) * 2.0 * math.pi + phase * 1.5
            rx = cx + math.cos(a) * ring_rx
            ry = cy + math.sin(a) * ring_ry
            if math.sin(a) >= 0:
                put(px, rx, ry, C_GOLD_LIGHT if s % 6 == 0 else C_CYAN_BRIGHT)
                if s % 9 == 0:
                    put(px, rx, ry - 1, C_WHITE)
                    put(px, rx, ry + 1, C_GOLD)

    else:
        # F22..F29 (8 frames): Shattering in a Cyan-Gold Temporal Rewind Burst with Crisp Roman Numeral Fragments!
        u = (f - 22) / 7.0  # 0.0 -> 1.0
        ring_r = 7.0 + u * 14.5
        draw_circle(px, cx, cy, ring_r, C_GOLD_LIGHT if u < 0.6 else C_GOLD, steps=56)
        draw_circle(px, cx, cy, ring_r * 0.72, C_CYAN_BRIGHT if u < 0.7 else C_TEAL, steps=44)

        # Flying shattered Top & Bottom Brass Hourglass End-Plates separating outward
        cap_sep = min(20, int(round(13.0 + u * 6.5)))
        cap_w = max(3, int(round(9.0 * (1.0 - u * 0.45))))
        for side_y in (-cap_sep, cap_sep):
            for dx in range(-cap_w, cap_w + 1):
                if abs(dx) >= int(u * 4.0):
                    put(px, cx + dx, cy + side_y, C_GOLD_LIGHT if abs(dx) < cap_w else C_BRASS_LIGHT)
                    put(px, cx + dx, cy + side_y + (1 if side_y < 0 else -1), C_BRASS_MID)

        # 12 radially exploding crystal-and-brass hourglass shards & cyan-gold sand trails
        for k in range(12):
            sa = k * (math.pi / 6.0) + u * 0.5
            dist = 4.0 + u * 16.0
            sx = cx + math.cos(sa) * dist
            sy = cy + math.sin(sa) * dist
            col_sh = C_WHITE if u < 0.35 else (C_GOLD_LIGHT if k % 2 == 0 else C_CYAN_BRIGHT)
            put(px, sx, sy, col_sh)
            put(px, sx - math.cos(sa), sy - math.sin(sa), C_TEAL if k % 2 else C_BRASS_LIGHT)

        # 6 Crisp Exploding Roman Numeral Shatter Fragments (XII, III, VI, IX, IV, X)
        for g_idx in range(6):
            ga = -math.pi * 0.5 + g_idx * (math.pi / 3.0) + u * 0.28
            g_dist = 7.5 + u * 10.5  # stays within radius 18.0 -> 26 +- 18 = 8..44 (strictly inside 2..49)
            gx = cx + math.cos(ga) * g_dist
            gy = cy + math.sin(ga) * g_dist
            draw_roman_glyph(
                px,
                gx,
                gy,
                g_idx,
                C_WHITE if g_idx % 2 == 0 else C_CYAN_CORE,
                C_GOLD_LIGHT if u < 0.7 else C_GOLD,
            )

        draw_star(px, cx, cy, max(2, int(9 * (1.0 - u * 0.65))), C_WHITE, C_CYAN_BRIGHT, rot=u * 3.0)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row2_temporal_rift_portal(f):
    """
    Row 2 (F00..F29): TEMPORAL RIFT WORMHOLE PORTAL (Pass #4)
    - Swirling cyan-teal & gold dimensional wormhole vortex
    - Unmistakable 12-Hour Golden Clockface Rim around the vortex (double golden chapter bezel,
      12 radial hour ticks, cardinal Roman numerals XII / III / VI / IX, external escapement cogs,
      and sweeping chronomantic portal clock hands)
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    cx, cy = 26.0, 26.0
    phase = (f / 30.0) * math.pi * 2.0

    # 1. Swirling Logarithmic Cyan-Teal & Gold Dimensional Vortex (inside r_x=15.0, r_y=16.0)
    for y in range(6, 47):
        for x in range(6, 47):
            dx = (x - cx) * 1.06
            dy = y - cy
            r = math.hypot(dx, dy)
            if r <= 15.6:
                ang = math.atan2(dy, dx)
                spiral = math.sin(ang * 3.0 - r * 0.58 + phase * 2.0)
                if r <= 2.8:
                    put(px, x, y, C_WHITE if r <= 1.5 else C_CYAN_CORE)
                elif spiral > 0.48:
                    put(px, x, y, C_GOLD_LIGHT if spiral > 0.80 else C_CYAN_BRIGHT)
                elif spiral > -0.12:
                    put(px, x, y, C_TEAL if r < 11.0 else C_TEAL_DARK)
                else:
                    put(px, x, y, C_TEAL_DEEP)

    # Sweeping Dimensional Clock Hands inside the Vortex Eye
    hand_h_ang = phase - math.pi * 0.5
    hand_m_ang = -phase * 2.0 - math.pi * 0.5
    draw_line(px, cx, cy, cx + math.cos(hand_h_ang) * 9.5, cy + math.sin(hand_h_ang) * 10.0, C_GOLD_LIGHT)
    draw_line(px, cx, cy, cx + math.cos(hand_m_ang) * 13.0, cy + math.sin(hand_m_ang) * 13.8, C_WHITE)
    put(px, cx, cy, C_WHITE)

    # 2. 12-Hour Golden Clockface Rim & Chapter Track around the Portal (rx=15.2..19.5, ry=16.2..20.5)
    # Dark bronze chapter-ring backing between inner and outer golden bezels for high contrast
    for s in range(96):
        a = (s / 96.0) * 2.0 * math.pi
        ca, sa = math.cos(a), math.sin(a)
        for rr in (16.2, 17.0, 17.8, 18.5):
            put(px, cx + ca * (rr * 0.95), cy + sa * rr, C_BRONZE_DEEP)
        # Inner Golden Bezel Ring
        put(px, cx + ca * 14.8, cy + sa * 15.6, C_BRASS_DARK)
        put(px, cx + ca * 15.4, cy + sa * 16.2, C_GOLD)
        # Outer Golden Clockface Rim (double-stepped gold + specular highlight)
        put(px, cx + ca * 18.6, cy + sa * 19.5, C_GOLD_LIGHT if s % 2 == 0 else C_GOLD)
        put(px, cx + ca * 19.4, cy + sa * 20.3, C_BRASS_MID)

    # 12 Rotating External Brass Escapement Cogs on the outer rim (max radius 21.6 -> 26 +- 21.6 = 4.4..47.6)
    for k in range(12):
        ta = phase * 0.5 + k * (math.pi / 6.0)
        for da in (-0.04, 0.0, 0.04):
            tx = cx + math.cos(ta + da) * 20.4
            ty = cy + math.sin(ta + da) * 21.3
            put(px, tx, ty, C_GOLD_LIGHT if da == 0.0 else C_BRASS_LIGHT)

    # 3. 12-Hour Golden Clockface Markers & Cardinal Roman Numerals (XII, III, VI, IX)
    for h_idx in range(12):
        ha = -math.pi * 0.5 + h_idx * (math.pi / 6.0)
        ca, sa = math.cos(ha), math.sin(ha)
        # Radial golden hour tick spanning across the chapter ring
        x0, y0 = cx + ca * 15.6, cy + sa * 16.4
        x1, y1 = cx + ca * 18.4, cy + sa * 19.3
        is_cardinal = (h_idx % 3 == 0)
        draw_line(px, x0, y0, x1, y1, C_WHITE if is_cardinal else C_GOLD_LIGHT)
        if not is_cardinal:
            # Bright golden-cyan hour jewel at each non-cardinal hour
            mx, my = cx + ca * 17.0, cy + sa * 17.9
            put(px, mx, my, C_GOLD_STAR)
            put(px, mx + ca, my + sa, C_CYAN_CORE)

    # Crisp Cardinal Roman Numeral Hour Plates on the 12-Hour Clockface Rim:
    # XII at 12 o'clock (top: cx, cy - 18), III at 3 o'clock (right: cx + 17, cy),
    # VI at 6 o'clock (bottom: cx, cy + 18), IX at 9 o'clock (left: cx - 17, cy)
    draw_roman_glyph(px, cx, cy - 18.0, 0, C_WHITE, C_GOLD_LIGHT)   # XII
    draw_roman_glyph(px, cx + 17.0, cy, 1, C_WHITE, C_GOLD_LIGHT)   # III
    draw_roman_glyph(px, cx, cy + 18.0, 2, C_WHITE, C_GOLD_LIGHT)   # VI
    draw_roman_glyph(px, cx - 17.0, cy, 3, C_WHITE, C_GOLD_LIGHT)   # IX

    # 4. Crackling Dimensional Cyan-Gold Lightning Arcs Around Portal Rim
    for bolt in range(4):
        ba = -phase * 2.0 + bolt * (math.pi * 0.5) + 0.35
        for seg in range(4):
            r_seg = 13.5 + seg * 1.4
            jag = ((f + seg + bolt) % 3 - 1) * 0.08
            lx = cx + math.cos(ba + jag) * (r_seg * 0.94)
            ly = cy + math.sin(ba + jag) * r_seg
            put(px, lx, ly, C_WHITE if seg == 1 else C_CYAN_BRIGHT)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row3_doomsday_clockface(f):
    """
    Row 3 (F00..F29): DOOMSDAY MIDNIGHT GRAND CELESTIAL CLOCKFACE
    - Grand cathedral astrolabe clockface with Roman numerals I..XII
    - Counter-rotating inner brass gears
    - Ornate minute/hour hands sweeping progressively toward XII (F00..F21)
    - Erupting in a golden-cyan Midnight shockwave (F22..F29)
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    cx, cy = 26.0, 26.0
    phase = (f / 30.0) * math.pi * 2.0

    is_midnight_burst = f >= 22
    burst_u = (f - 22) / 7.0 if is_midnight_burst else 0.0

    # 1. Outer Cathedral Astrolabe Sunburst Spikes (r = 20..22.5, strictly within 2..49)
    for k in range(24):
        sa = k * (math.pi / 12.0) + (phase * 0.25 if not is_midnight_burst else burst_u * 0.5)
        max_r = 22 if k % 2 == 0 else 21
        for r_s in range(19, max_r + 1):
            col_s = C_WHITE if (is_midnight_burst and r_s == max_r) else (C_GOLD_LIGHT if k % 2 == 0 else C_TEAL_LIGHT)
            put(px, cx + math.cos(sa) * r_s, cy + math.sin(sa) * r_s, col_s)

    # 2. Concentric Grand Clockwork Bezel Rings (r = 14..19.5)
    draw_circle(px, cx, cy, 19.5, C_BRASS_DARK, steps=72)
    draw_circle(px, cx, cy, 18.6, C_GOLD_LIGHT if is_midnight_burst else C_GOLD, steps=72)
    draw_circle(px, cx, cy, 17.6, C_BRASS_MID, steps=64)
    draw_circle(px, cx, cy, 15.0, C_TEAL, steps=60)
    draw_circle(px, cx, cy, 14.0, C_BRASS_LIGHT, steps=56)

    # 3. Counter-Rotating Inner Brass Satellite Gears (inside r = 6..13)
    for g_idx in range(4):
        ga = -phase + g_idx * (math.pi * 0.5)
        gcx = cx + math.cos(ga) * 9.0
        gcy = cy + math.sin(ga) * 9.0
        draw_circle(px, gcx, gcy, 3.6, C_BRASS_MID, steps=16)
        put(px, gcx, gcy, C_TEAL_LIGHT)
        for gt in range(6):
            gta = phase * 2.0 + gt * (math.pi / 3.0)
            put(px, gcx + math.cos(gta) * 4.5, gcy + math.sin(gta) * 4.5, C_BRASS_LIGHT)

    # 4. 12 Roman Numeral Hour Markers (I..XII) around r = 16.4
    for h_idx in range(12):
        ha = -math.pi * 0.5 + h_idx * (math.pi / 6.0)
        hx = cx + math.cos(ha) * 16.4
        hy = cy + math.sin(ha) * 16.4
        is_cardinal = (h_idx % 3 == 0)
        col_h = C_WHITE if (h_idx == 0 or is_midnight_burst) else (C_GOLD_LIGHT if is_cardinal else C_CYAN_BRIGHT)
        put(px, hx, hy, col_h)
        if is_cardinal:
            px_perp = -math.sin(ha)
            py_perp = math.cos(ha)
            put(px, hx + px_perp, hy + py_perp, C_GOLD_LIGHT)
            put(px, hx - px_perp, hy - py_perp, C_GOLD_LIGHT)

    # 5. Sweeping Ornate Hour & Minute Hands Approaching XII (F00..F21) -> Locked at XII on F22..F29
    prog = min(1.0, f / 21.0)
    hour_ang = -math.pi * 0.5 - (1.0 - prog) * (math.pi * 0.65)
    min_ang = -math.pi * 0.5 - (1.0 - prog) * (math.pi * 2.0)

    draw_line(px, cx, cy, cx + math.cos(hour_ang) * 10.0, cy + math.sin(hour_ang) * 10.0, C_GOLD_LIGHT)
    draw_line(px, cx, cy, cx + math.cos(min_ang) * 14.0, cy + math.sin(min_ang) * 14.0, C_CYAN_CORE)

    draw_circle(px, cx, cy, 2.5, C_GOLD, steps=16)
    put(px, cx, cy, C_WHITE)

    # 6. Golden-Cyan Midnight Shockwave Eruption (F22..F29)
    if is_midnight_burst:
        wave_r = 4.0 + burst_u * 18.0
        draw_circle(px, cx, cy, wave_r, C_WHITE if burst_u < 0.45 else C_GOLD_LIGHT, steps=64)
        draw_circle(px, cx, cy, max(1.0, wave_r - 1.5), C_CYAN_BRIGHT, steps=64)
        for ry in range(3, 12):
            put(px, cx, ry, C_WHITE)
            put(px, cx - 1, ry, C_GOLD_LIGHT)
            put(px, cx + 1, ry, C_CYAN_BRIGHT)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row4_pendulum_slash_and_seal(f):
    """
    Row 4 (F00..F29): CHRONO-PENDULUM SLASH WAVE & ASTROLABE SEAL
    - Revolving clockwork cast seal (left-center)
    - Sweeping cyan-gold pendulum arc wave & Roman-numeral motes (right side)
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0
    cx, cy = 21.0, 26.0

    # 1. Revolving Clockwork Astrolabe Cast Seal (r = 12)
    seal_r = 11.5 + math.sin(phase * 2.0) * 1.2
    draw_circle(px, cx, cy, seal_r, C_BRASS_LIGHT, steps=48)
    draw_circle(px, cx, cy, seal_r - 2.0, C_TEAL, steps=40)
    for k in range(8):
        a = phase + k * (math.pi * 0.25)
        draw_line(
            px,
            cx + math.cos(a) * 3.0,
            cy + math.sin(a) * 3.0,
            cx + math.cos(a) * (seal_r + 2.0),
            cy + math.sin(a) * (seal_r + 2.0),
            C_GOLD_LIGHT if k % 2 == 0 else C_CYAN_BRIGHT
        )
    draw_star(px, cx, cy, 4, C_WHITE, C_GOLD_LIGHT, rot=-phase)

    # 2. Sweeping Cyan-Gold Chrono-Pendulum Crescent Slash Wave (x = 24..49, y = 5..47)
    pulse = 0.85 + 0.15 * math.sin(phase * 2.0)
    for s in range(-20, 21):
        u_arc = s / 20.0
        arc_y = cy + s * 1.05
        arc_x = 45.0 - (u_arc * u_arc) * 14.0 + math.sin(phase + u_arc * 3.0) * 1.0
        thick = int(round((1.0 - u_arc * u_arc * 0.72) * 6.0 * pulse))
        for t_off in range(thick + 1):
            wx = arc_x - t_off
            if t_off == 0:
                put(px, wx, arc_y, C_WHITE)
            elif t_off == 1:
                put(px, wx, arc_y, C_GOLD_LIGHT)
            elif t_off <= 3:
                put(px, wx, arc_y, C_CYAN_BRIGHT)
            else:
                put(px, wx, arc_y, C_TEAL if (s + t_off) % 2 == 0 else C_BRASS_MID)

        # Clockwork gear teeth along the outer edge of the pendulum crescent
        if s % 4 == 0 and abs(s) <= 16:
            put(px, arc_x + 1, arc_y, C_GOLD_LIGHT)
            put(px, arc_x + 2, arc_y, C_GOLD)

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
        ray_col = C_CYAN_BRIGHT if (m_idx + row_idx) % 2 == 0 else C_GOLD_LIGHT
        ray_len = 5 + ((f + m_idx) % 3)

        for dy in range(-2, 3):
            for dx in range(-2, 3):
                if abs(dx) == 2 or abs(dy) == 2:
                    x, y = cx + dx, cy + dy
                    if 16 <= x <= 191 and 16 <= y <= 191 and px[x, y][3] == 0:
                        px[x, y] = C_TEAL_AURA

        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                x, y = cx + dx, cy + dy
                if 16 <= x <= 191 and 16 <= y <= 191:
                    px[x, y] = C_WHITE

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
        ("ROW 0: CLOCK-GEAR PROJECTILE & ORBITING GEARS (30 FRAMES)", build_row0_clock_gear),
        ("ROW 1: ASTRAL STASIS HOURGLASS & REWIND SHATTER (30 FRAMES)", build_row1_stasis_hourglass),
        ("ROW 2: TEMPORAL RIFT WORMHOLE PORTAL (30 FRAMES)", build_row2_temporal_rift_portal),
        ("ROW 3: DOOMSDAY MIDNIGHT GRAND CELESTIAL CLOCKFACE (30 FRAMES)", build_row3_doomsday_clockface),
        ("ROW 4: CHRONO-PENDULUM SLASH WAVE & ASTROLABE SEAL (30 FRAMES)", build_row4_pendulum_slash_and_seal),
    ]

    boundary_clips = 0
    for row_idx, (label, fn) in enumerate(builders):
        for col_idx in range(COLS):
            cell_img = apply_pass11_star_mote_polish(fn(col_idx), row_idx, col_idx)
            # Check 208x208 cell outer 8px border (equivalent to logical 2px border 2<=x<=49, 2<=y<=49)
            c_px = cell_img.load()
            clipped = False
            for y in range(CELL):
                for x in range(CELL):
                    if x < 8 or x >= CELL - 8 or y < 8 or y >= CELL - 8:
                        if c_px[x, y][3] > 0:
                            clipped = True
                            break
                if clipped:
                    break
            if clipped:
                boundary_clips += 1
            sheet.paste(cell_img, (col_idx * CELL, row_idx * CELL))

    print(f"Chronomancer VFX Boundary Clips (outside 2<=x<=49, 2<=y<=49): {boundary_clips}/150")
    out_path = "/home/antigravity/assets/sprites/chronomancer_vfx.png"
    sheet.save(out_path)
    print(f"Saved 30fps Chronomancer VFX sheet to {out_path} ({sheet.size[0]}x{sheet.size[1]})")

    # Build contact sheet in artifact directory
    art_dir = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/4f1fb80f-a88f-4496-9746-b4b9fe84f6d4"
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
        draw.text((6, y0 + 2), label, fill=(94, 234, 212, 255))
        for c_idx in range(COLS):
            x0 = c_idx * thumb
            draw.text((x0 + 4, y0 + 12), f"F{c_idx:02d}", fill=(254, 240, 138, 255))
            cell_crop = sheet.crop((c_idx * CELL, r_idx * CELL, (c_idx + 1) * CELL, (r_idx + 1) * CELL))
            cell_thumb = cell_crop.resize((thumb, thumb), Image.Resampling.NEAREST)
            contact.paste(cell_thumb, (x0, y0 + pad_top), cell_thumb)
            draw.rectangle([x0, y0 + pad_top, x0 + thumb - 1, y0 + pad_top + thumb - 1], outline=(35, 52, 78, 255))

    vfx_dbg_path = os.path.join(art_dir, "debug_chronomancer_30fps_vfx.png")
    contact.save(vfx_dbg_path)
    print(f"Saved VFX contact sheet: {vfx_dbg_path}")


if __name__ == "__main__":
    main()

