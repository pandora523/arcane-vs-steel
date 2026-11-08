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


def build_row0_clock_gear(f):
    """
    Row 0 (F00..F29): CLOCK-GEAR PROJECTILE & ORBITING GEARS
    - 30fps precision-rotating Golden Brass & Cyan Escapement Saw-Gear (12 deg tooth rotation per frame)
    - Counter-rotating inner spokes, glowing turquoise core, and trailing time-spark wake
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    cx, cy = 27.0, 26.0
    rot = math.radians(f * 12.0)  # Exact 12-deg tooth rotation per frame (360 deg across 30 frames)

    # 1. Trailing Time-Spark Wake & Slipstream Arcs (left side x=3..22)
    for w_i in range(5):
        u_w = ((f / 30.0) + w_i / 5.0) % 1.0
        wx = cx - 8.0 - u_w * 16.0
        wy = cy + math.sin(rot * 2.0 + w_i * 1.4) * (3.0 + u_w * 5.0)
        put(px, wx, wy, C_GOLD_LIGHT if w_i % 2 == 0 else C_TEAL_LIGHT)
        put(px, wx - 1, wy, C_TEAL_AURA)

    # 2. Soft Turquoise-Gold Radial Aura Ring
    draw_circle(px, cx, cy, 17.5, C_TEAL_AURA, steps=64)
    draw_circle(px, cx, cy, 16.2, C_GOLD_AURA, steps=56)

    # 3. 12 Precision-Machined Escapement Saw-Gear Teeth (outer radius 14..19)
    num_teeth = 12
    for t_idx in range(num_teeth):
        base_a = rot + t_idx * (2.0 * math.pi / num_teeth)
        # Swept saw-tooth profile
        for r_step in range(13, 19):
            frac = (r_step - 13) / 5.0
            sweep = frac * 0.14
            tx = cx + math.cos(base_a - sweep) * r_step
            ty = cy + math.sin(base_a - sweep) * r_step
            col_t = C_WHITE if r_step == 18 else (C_GOLD_LIGHT if r_step >= 16 else C_GOLD)
            put(px, tx, ty, col_t)
            # Thickened tooth base
            if r_step <= 16:
                tx2 = cx + math.cos(base_a + 0.08 - sweep) * r_step
                ty2 = cy + math.sin(base_a + 0.08 - sweep) * r_step
                put(px, tx2, ty2, C_BRASS_LIGHT if r_step >= 15 else C_BRASS_MID)

    # 4. Concentric Golden-Brass Outer Rim (r = 10..13)
    for r_i, col in [
        (13.2, C_BRASS_DARK),
        (12.2, C_GOLD),
        (11.2, C_GOLD_LIGHT),
        (10.2, C_BRASS_MID),
        (9.2, C_TEAL),
    ]:
        draw_circle(px, cx, cy, r_i, col, steps=56)

    # 5. 6 Inner Clockwork Spokes & Counter-Rotating Escapement Ring
    for s_idx in range(6):
        sa = -rot * 0.5 + s_idx * (math.pi / 3.0)
        draw_line(
            px,
            cx + math.cos(sa) * 4.0,
            cy + math.sin(sa) * 4.0,
            cx + math.cos(sa) * 9.0,
            cy + math.sin(sa) * 9.0,
            C_GOLD_LIGHT if s_idx % 2 == 0 else C_BRASS_LIGHT
        )
        # Turquoise jewel rivet on rim
        rx = cx + math.cos(rot + s_idx * (math.pi / 3.0)) * 11.2
        ry = cy + math.sin(rot + s_idx * (math.pi / 3.0)) * 11.2
        put(px, rx, ry, C_CYAN_CORE)

    # 6. Glowing Turquoise-White Chronomancer Core Hub (r = 0..4.5)
    for dy in range(-4, 5):
        for dx in range(-4, 5):
            d = math.hypot(dx, dy)
            if d <= 1.6:
                put(px, cx + dx, cy + dy, C_WHITE)
            elif d <= 3.0:
                put(px, cx + dx, cy + dy, C_CYAN_CORE)
            elif d <= 4.3:
                put(px, cx + dx, cy + dy, C_TEAL)

    draw_star(px, cx, cy, 4, C_WHITE, C_GOLD_LIGHT, rot=rot)
    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row1_stasis_hourglass(f):
    """
    Row 1 (F00..F29): ASTRAL STASIS HOURGLASS
    - F00..F06: Materializing ornate brass-and-crystal hourglass with golden wings
    - F07..F21: Turquoise time-sand streaming from top bulb to bottom bulb with orbiting Roman numerals
    - F22..F29: Shattering in a cyan-gold rewind burst
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    cx, cy = 26.0, 26.0
    phase = (f / 30.0) * math.pi * 2.0

    if f <= 21:
        scale = min(1.0, (f + 2) / 8.0) if f <= 6 else 1.0
        sand_prog = 0.0 if f <= 6 else (f - 6) / 15.0  # 0.0 -> 1.0 sand transfer

        # 1. Golden Chronomancer Wings on Left & Right of Hourglass (x=4..16 and x=36..48)
        wing_span = int(round(10.0 * scale))
        wing_flap = math.sin(phase * 2.0) * 1.5
        for side in (-1, 1):
            for feather in range(4):
                fy0 = cy - 6 + feather * 3.2
                f_len = wing_span - feather * 1.5
                for d in range(2, int(f_len) + 1):
                    wx = cx + side * (8 + d)
                    wy = fy0 - (d * 0.35) + wing_flap * (d / 10.0) + feather * 0.5
                    col_w = C_WHITE if d == int(f_len) else (C_GOLD_LIGHT if feather <= 1 else C_TEAL_LIGHT)
                    put(px, wx, wy, col_w)
                    put(px, wx, wy + 1, C_GOLD if feather <= 1 else C_TEAL)

        # 2. Orbiting Elliptical Ring & Roman Numeral Motes
        ring_rx = 18.0 * scale
        ring_ry = 5.5 * scale
        for s in range(36):
            a = (s / 36.0) * 2.0 * math.pi + phase * 1.5
            rx = cx + math.cos(a) * ring_rx
            ry = cy + math.sin(a) * ring_ry
            if math.sin(a) < 0:  # behind hourglass
                put(px, rx, ry, C_TEAL_DARK if s % 3 else C_BRASS_MID)

        # 3. Ornate Top & Bottom Brass End-Plates (y = cy - 16 and cy + 16)
        half_h = int(round(15.0 * scale))
        cap_w = int(round(10.0 * scale))
        for side_y in (-half_h, half_h):
            for dx in range(-cap_w, cap_w + 1):
                put(px, cx + dx, cy + side_y, C_GOLD_LIGHT if abs(dx) < cap_w - 1 else C_GOLD)
                put(px, cx + dx, cy + side_y + (1 if side_y < 0 else -1), C_BRASS_MID)
            # Crown finials
            for fx_off in (-cap_w, 0, cap_w):
                put(px, cx + fx_off, cy + side_y + (-1 if side_y < 0 else 1), C_WHITE if fx_off == 0 else C_GOLD_LIGHT)

        # 4. Twin Brass Outer Pillars
        for py in range(int(cy - half_h + 1), int(cy + half_h)):
            put(px, cx - cap_w + 1, py, C_BRASS_MID)
            put(px, cx + cap_w - 1, py, C_BRASS_LIGHT)

        # 5. Crystal Hourglass Bulbs & Streaming Turquoise Time-Sand
        for dy in range(-half_h + 2, half_h - 1):
            if dy == 0:
                continue
            u_b = abs(dy) / float(max(1, half_h - 2))  # 0 at neck -> 1 at cap
            bulb_w = max(1, int(round((1.2 + math.sin(u_b * math.pi * 0.65) * 7.2) * scale)))

            # Determine if sand fills this row in top bulb (dy < 0) or bottom bulb (dy > 0)
            is_sand = False
            if dy < 0:
                # Top bulb drains from top down toward neck
                top_fill = 1.0 - sand_prog * 0.85
                if u_b <= top_fill:
                    is_sand = True
            else:
                # Bottom bulb fills from bottom (u_b=1.0) up toward neck
                bot_fill = 0.20 + sand_prog * 0.78
                if u_b >= (1.0 - bot_fill):
                    is_sand = True

            for dx in range(-bulb_w, bulb_w + 1):
                if abs(dx) == bulb_w:
                    put(px, cx + dx, cy + dy, C_CYAN_CORE if dx < 0 else C_TEAL_LIGHT)
                elif is_sand:
                    col_s = C_WHITE if abs(dx) <= 1 else (C_CYAN_BRIGHT if (dx + dy) % 2 == 0 else C_TEAL)
                    put(px, cx + dx, cy + dy, col_s)
                else:
                    if abs(dx) == bulb_w - 1:
                        put(px, cx + dx, cy + dy, C_TEAL_AURA)

        # Falling sand stream through the central neck (x = cx, y = cy - 2 .. cy + half_h - 2)
        for sy in range(int(cy - 1), int(cy + half_h - 1)):
            put(px, cx, sy, C_WHITE if (sy + f) % 2 == 0 else C_GOLD_LIGHT)

        # Blazing pinch-point nexus at hourglass waist
        draw_star(px, cx, cy, 3, C_WHITE, C_GOLD_LIGHT, rot=phase)

        # 6. Front half of Orbiting Roman Numeral Ring
        for s in range(36):
            a = (s / 36.0) * 2.0 * math.pi + phase * 1.5
            rx = cx + math.cos(a) * ring_rx
            ry = cy + math.sin(a) * ring_ry
            if math.sin(a) >= 0:
                put(px, rx, ry, C_GOLD_LIGHT if s % 6 == 0 else C_CYAN_BRIGHT)
                if s % 9 == 0:
                    # Mini Roman numeral glyph tick
                    put(px, rx, ry - 1, C_WHITE)
                    put(px, rx, ry + 1, C_GOLD)

    else:
        # F22..F29 (8 frames): Shattering in a Cyan-Gold Temporal Rewind Burst!
        u = (f - 22) / 7.0  # 0.0 -> 1.0
        ring_r = 7.0 + u * 16.0
        draw_circle(px, cx, cy, ring_r, C_GOLD_LIGHT if u < 0.6 else C_GOLD, steps=56)
        draw_circle(px, cx, cy, ring_r * 0.72, C_CYAN_BRIGHT if u < 0.7 else C_TEAL, steps=44)

        # Flying shattered Top & Bottom Brass Hourglass End-Plates separating outward
        cap_sep = int(round(14.0 + u * 8.0))
        cap_w = max(3, int(round(9.0 * (1.0 - u * 0.45))))
        for side_y in (-cap_sep, cap_sep):
            for dx in range(-cap_w, cap_w + 1):
                if abs(dx) >= int(u * 4.0):  # Cracked center gap
                    put(px, cx + dx, cy + side_y, C_GOLD_LIGHT if abs(dx) < cap_w else C_BRASS_LIGHT)
                    put(px, cx + dx, cy + side_y + (1 if side_y < 0 else -1), C_BRASS_MID)

        # 12 radially exploding crystal-and-brass hourglass shards & turquoise sand bursts
        for k in range(12):
            sa = k * (math.pi / 6.0) + u * 0.6
            dist = 4.0 + u * 18.0
            sx = cx + math.cos(sa) * dist
            sy = cy + math.sin(sa) * dist
            col_sh = C_WHITE if u < 0.4 else (C_GOLD_LIGHT if k % 2 == 0 else C_CYAN_BRIGHT)
            put(px, sx, sy, col_sh)
            put(px, sx - math.cos(sa), sy - math.sin(sa), C_TEAL if k % 2 else C_BRASS_LIGHT)
            put(px, sx + math.sin(sa), sy - math.cos(sa), C_TEAL_LIGHT)

        draw_star(px, cx, cy, max(2, int(9 * (1.0 - u * 0.65))), C_WHITE, C_CYAN_BRIGHT, rot=u * 3.0)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row2_temporal_rift_portal(f):
    """
    Row 2 (F00..F29): TEMPORAL RIFT PORTAL
    - Swirling turquoise-and-gold space-time wormhole portal
    - Rotating clockwork bezel teeth and dimensional lightning (F00..F29)
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    cx, cy = 26.0, 26.0
    phase = (f / 30.0) * math.pi * 2.0

    # 1. Swirling Logarithmic Space-Time Wormhole Vortex (r = 1..17)
    for y in range(6, 46):
        for x in range(6, 46):
            dx = (x - cx) * 1.15  # Slight vertical portal aspect
            dy = y - cy
            r = math.hypot(dx, dy)
            if r <= 17.5:
                ang = math.atan2(dy, dx)
                spiral = math.sin(ang * 3.0 - r * 0.55 + phase * 2.0)
                if r <= 3.2:
                    put(px, x, y, C_WHITE if r <= 1.8 else C_CYAN_CORE)
                elif spiral > 0.45:
                    put(px, x, y, C_GOLD_LIGHT if spiral > 0.78 else C_CYAN_BRIGHT)
                elif spiral > -0.15:
                    put(px, x, y, C_TEAL if r < 12.0 else C_TEAL_DARK)
                else:
                    put(px, x, y, C_TEAL_DEEP)

    # 2. Rotating Brass Clockwork Bezel Ring & 12 Escapement Teeth
    bezel_rx = 16.5
    bezel_ry = 19.0
    for s in range(60):
        a = (s / 60.0) * 2.0 * math.pi - phase
        bx = cx + math.cos(a) * bezel_rx
        by = cy + math.sin(a) * bezel_ry
        put(px, bx, by, C_GOLD_LIGHT if s % 5 == 0 else C_BRASS_LIGHT if s % 2 == 0 else C_BRASS_MID)

    for k in range(12):
        ta = phase + k * (math.pi / 6.0)
        tx = cx + math.cos(ta) * (bezel_rx + 1.8)
        ty = cy + math.sin(ta) * (bezel_ry + 1.8)
        put(px, tx, ty, C_WHITE if k % 3 == 0 else C_GOLD)

    # 3. Crackling Dimensional Cyan-Gold Lightning Arcs Around Portal Rim
    for bolt in range(4):
        ba = -phase * 2.0 + bolt * (math.pi * 0.5)
        for seg in range(5):
            r_seg = 14.0 + seg * 1.8
            jag = ((f + seg + bolt) % 3 - 1) * 0.08
            lx = cx + math.cos(ba + jag) * (r_seg * 0.9)
            ly = cy + math.sin(ba + jag) * r_seg
            put(px, lx, ly, C_WHITE if seg == 2 else C_CYAN_BRIGHT)

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

    # 1. Outer Cathedral Astrolabe Sunburst Spikes (r = 21..24)
    for k in range(24):
        sa = k * (math.pi / 12.0) + (phase * 0.25 if not is_midnight_burst else burst_u * 0.5)
        max_r = 24 if k % 2 == 0 else 22
        for r_s in range(20, max_r + 1):
            col_s = C_WHITE if (is_midnight_burst and r_s == max_r) else (C_GOLD_LIGHT if k % 2 == 0 else C_TEAL_LIGHT)
            put(px, cx + math.cos(sa) * r_s, cy + math.sin(sa) * r_s, col_s)

    # 2. Concentric Grand Clockwork Bezel Rings (r = 16..20)
    draw_circle(px, cx, cy, 20.0, C_BRASS_DARK, steps=72)
    draw_circle(px, cx, cy, 19.0, C_GOLD_LIGHT if is_midnight_burst else C_GOLD, steps=72)
    draw_circle(px, cx, cy, 18.0, C_BRASS_MID, steps=64)
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

    # 4. 12 Roman Numeral Hour Markers (I..XII) around r = 16.5
    for h_idx in range(12):
        ha = -math.pi * 0.5 + h_idx * (math.pi / 6.0)
        hx = cx + math.cos(ha) * 16.6
        hy = cy + math.sin(ha) * 16.6
        is_cardinal = (h_idx % 3 == 0)
        col_h = C_WHITE if (h_idx == 0 or is_midnight_burst) else (C_GOLD_LIGHT if is_cardinal else C_CYAN_BRIGHT)
        put(px, hx, hy, col_h)
        if is_cardinal:
            # Emphasize XII, III, VI, IX with multi-pixel Roman glyph ticks
            px_perp = -math.sin(ha)
            py_perp = math.cos(ha)
            put(px, hx + px_perp, hy + py_perp, C_GOLD_LIGHT)
            put(px, hx - px_perp, hy - py_perp, C_GOLD_LIGHT)

    # 5. Sweeping Ornate Hour & Minute Hands Approaching XII (F00..F21) -> Locked at XII on F22..F29
    prog = min(1.0, f / 21.0)
    # Hands sweep clockwise to meet vertically at -pi/2 (12 o'clock XII)
    hour_ang = -math.pi * 0.5 - (1.0 - prog) * (math.pi * 0.65)
    min_ang = -math.pi * 0.5 - (1.0 - prog) * (math.pi * 2.0)

    # Hour hand (length 10)
    draw_line(px, cx, cy, cx + math.cos(hour_ang) * 10.0, cy + math.sin(hour_ang) * 10.0, C_GOLD_LIGHT)
    # Minute hand (length 14)
    draw_line(px, cx, cy, cx + math.cos(min_ang) * 14.0, cy + math.sin(min_ang) * 14.0, C_CYAN_CORE)

    # Central Escapement Pivot Hub
    draw_circle(px, cx, cy, 2.5, C_GOLD, steps=16)
    put(px, cx, cy, C_WHITE)

    # 6. Golden-Cyan Midnight Shockwave Eruption (F22..F29)
    if is_midnight_burst:
        wave_r = 4.0 + burst_u * 20.0
        draw_circle(px, cx, cy, wave_r, C_WHITE if burst_u < 0.45 else C_GOLD_LIGHT, steps=64)
        draw_circle(px, cx, cy, max(1.0, wave_r - 1.5), C_CYAN_BRIGHT, steps=64)
        # Midnight XII Crown Ray
        for ry in range(1, 12):
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

    for row_idx, (label, fn) in enumerate(builders):
        for col_idx in range(COLS):
            cell_img = fn(col_idx)
            sheet.paste(cell_img, (col_idx * CELL, row_idx * CELL))

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
