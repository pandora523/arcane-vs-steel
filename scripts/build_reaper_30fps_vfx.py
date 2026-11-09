#!/usr/bin/env python3
"""
Builds Malakor (Reaper) 30fps HD-2D Pixel-Art Skill & VFX Sprite Sheet:
- Output: assets/sprites/reaper_vfx.png (6240 x 1040, 5 rows x 30 cols at 208x208 per cell)
- Logical canvas per cell: 52x52 upscaled 4x NEAREST to 208x208 (un-inked clean pixel art!)
- Rows:
  Row 0 (F00..F29): PHANTOM SCYTHE BOOMERANG (30fps 360-deg spinning twin-crescent scythe + blood-moon wake)
  Row 1 (F00..F29): SPECTRAL BONE-CLAW & ABYSSAL CHAIN HOOK (F00..F09 open lunge, F10..F19 clamp burst, F20..F29 locked drag)
  Row 2 (F00..F29): GOTHIC NECROPOLIS TOMBSTONE & SOUL VORTEX (F00..F06 erupting monolith, F07..F21 pulsing runes & skulls, F22..F29 crumbling ascension)
  Row 3 (F00..F29): GRIM HARVEST - COLOSSAL SOVEREIGN OF DEATH AVATAR (F00..F07 materializing, F08..F21 roaring sovereign + sweeping colossal scythe, F22..F29 blood-moon vortex dissolution)
  Row 4 (F00..F29): BLOOD-MOON SCYTHE CLEAVE WAVE & NECROMANTIC SKULL SEAL (30fps sweeping crescent slash wave & revolving necropolis sigil)
"""

import math
import os
from PIL import Image, ImageDraw

LOGICAL = 52
SCALE = 4
CELL = LOGICAL * SCALE  # 208
COLS = 30
ROWS = 5

# Clean, luminous Necropolis Violet / Blood-Moon Crimson / Spectral Cyan-Mint / Bone Palette
C_WHITE = (255, 255, 255, 255)
C_SOUL_CORE = (250, 232, 255, 255)      # #fae8ff
C_VIOLET_PINK = (232, 121, 249, 255)    # #e879f9
C_VIOLET_BRIGHT = (192, 132, 252, 255)  # #c084fc
C_VIOLET = (147, 51, 234, 255)          # #9333ea
C_VIOLET_DARK = (107, 33, 168, 255)     # #6b21a8
C_ABYSS_DEEP = (46, 16, 101, 240)       # #2e1065

C_CRIMSON_LIGHT = (253, 164, 175, 255)  # #fda4af
C_CRIMSON_BRIGHT = (244, 63, 94, 255)   # #f43f5e
C_CRIMSON = (225, 29, 72, 255)          # #e11d48
C_CRIMSON_DARK = (136, 19, 55, 255)     # #881337
C_BLOOD_DEEP = (76, 5, 25, 240)         # #4c0519

C_SPECTRAL_MINT = (110, 231, 183, 255)  # #6ee7b7
C_SPECTRAL_TEAL = (20, 184, 166, 255)   # #14b8a6

C_BONE_WHITE = (241, 245, 249, 255)     # #f1f5f9
C_BONE_LIGHT = (203, 213, 225, 255)     # #cbd5e1
C_BONE_MID = (148, 163, 184, 255)       # #94a3b8
C_BONE_DARK = (71, 85, 105, 255)        # #475569
C_OBSIDIAN_MID = (51, 38, 74, 255)
C_OBSIDIAN_DARK = (27, 18, 44, 255)

C_VIOLET_AURA = (168, 85, 247, 135)
C_CRIMSON_AURA = (244, 63, 94, 135)


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


def draw_circle(px, cx, cy, r, col, fill=False):
    r_int = int(math.ceil(r + 1))
    for dy in range(-r_int, r_int + 1):
        for dx in range(-r_int, r_int + 1):
            d = math.hypot(dx, dy)
            if fill and d <= r + 0.35:
                put(px, cx + dx, cy + dy, col)
            elif not fill and abs(d - r) <= 0.65:
                put(px, cx + dx, cy + dy, col)


def draw_star(px, cx, cy, r, col_core, col_ray, rot=0.0):
    put(px, cx, cy, col_core)
    for k in range(4):
        a = rot + k * (math.pi * 0.5)
        for d in range(1, int(r) + 1):
            c = col_core if d == 1 else col_ray
            put(px, cx + math.cos(a) * d, cy + math.sin(a) * d, c)


def build_row0_phantom_scythe(f):
    """
    Row 0 (F00..F29): 30fps 360-degree Spinning Crimson-Violet Phantom Scythe Boomerang
    - 12 deg rotation per frame (full 360 deg revolution over 30 frames)
    - Twin symmetric curved Abyssal Scythe blades locked around a blazing Blood-Moon Soul Core
    - Swirling crimson-violet crescent wake and orbiting soul embers
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    cx, cy = 26.0, 26.0
    rot = (f / 30.0) * math.pi * 2.0  # 12 deg per frame

    # 1. Outer Trailing Blood-Moon & Violet Vortex Ring Wake
    for s in range(60):
        a = (s / 60.0) * math.pi * 2.0
        r_wake = 18.5 + math.sin(a * 2.0 - rot * 2.0) * 2.2
        put(px, cx + math.cos(a) * r_wake, cy + math.sin(a) * r_wake, C_VIOLET_AURA if s % 2 == 0 else C_CRIMSON_AURA)

    # 2. Twin Curved Crescent Phantom Scythe Blades + Trailing Wake Ribbons
    for blade_idx in range(2):
        base_a = rot + blade_idx * math.pi
        ux, uy = math.cos(base_a), math.sin(base_a)
        px_v, py_v = -uy, ux

        # Trailing spectral wake arc behind each spinning blade
        for w_s in range(1, 18):
            wa = base_a - (w_s / 18.0) * 1.35
            wr = 11.0 + (w_s / 18.0) * 9.5
            wx = cx + math.cos(wa) * wr
            wy = cy + math.sin(wa) * wr
            w_col = C_CRIMSON_BRIGHT if w_s < 6 else (C_VIOLET_BRIGHT if w_s < 12 else C_VIOLET_DARK)
            put(px, wx, wy, w_col)
            if w_s < 10:
                put(px, cx + math.cos(wa) * (wr - 1.5), cy + math.sin(wa) * (wr - 1.5), C_SPECTRAL_MINT if w_s < 5 else C_VIOLET)

        # Diagonal haft arm from hub out to blade collar (r = 3..13)
        for d in range(3, 14):
            hx = cx + ux * d
            hy = cy + uy * d
            put(px, hx, hy, C_OBSIDIAN_MID)
            put(px, hx + px_v, hy + py_v, C_VIOLET_BRIGHT if d % 3 == 0 else C_BONE_DARK)

        # Curved Crescent Scythe Blade sweeping from collar (hx0, hy0)
        hx0 = cx + ux * 12.5
        hy0 = cy + uy * 12.5
        steps = 24
        for i in range(steps + 1):
            u = i / float(steps)
            reach = u * 16.5
            hook = -(u ** 1.55) * 9.5 + math.sin(u * math.pi) * 2.0
            bx = hx0 + px_v * reach + ux * hook
            by = hy0 + py_v * reach + uy * hook
            w_b = max(1, int(round((1.0 - u * 0.72) * 4.2)))
            for wi in range(w_b + 1):
                off = (1.0 - (wi / max(1, w_b)) * 2.0) * (w_b * 0.45)
                bpx = bx + ux * off
                bpy = by + uy * off
                if wi == w_b:
                    col = C_WHITE if u > 0.25 else C_SOUL_CORE
                elif wi == w_b - 1:
                    col = C_CRIMSON_BRIGHT if blade_idx == 0 else C_VIOLET_PINK
                elif wi == 1 and i % 4 == f % 4:
                    col = C_SPECTRAL_MINT
                else:
                    col = C_VIOLET if blade_idx == 0 else C_CRIMSON_DARK
                put(px, bpx, bpy, col)

    # 3. Central Blood-Moon Eye Hub & Revolving Star Glint
    draw_circle(px, cx, cy, 4.5, C_ABYSS_DEEP, fill=True)
    draw_circle(px, cx, cy, 4.2, C_CRIMSON_BRIGHT, fill=False)
    draw_circle(px, cx, cy, 2.5, C_VIOLET_PINK, fill=True)
    draw_star(px, cx, cy, 4, C_WHITE, C_CRIMSON_LIGHT, rot=-rot)

    # 4. Orbiting Soul Embers
    for m in range(6):
        ma = -rot * 1.5 + m * (math.pi / 3.0)
        mr = 20.5 + math.sin(rot * 2.0 + m) * 2.0
        put(px, cx + math.cos(ma) * mr, cy + math.sin(ma) * mr, C_CRIMSON_BRIGHT if m % 2 == 0 else C_VIOLET_BRIGHT)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row1_spectral_bone_claw(f):
    """
    Row 1 (F00..F29): SPECTRAL BONE-CLAW & ABYSSAL CHAIN HOOK (Pointing +X)
    - F00..F09: Open grasping skeletal dragon/bone talons lunging forward with trailing dark-iron chain
    - F10..F19: Clamping shut with a blazing crimson-violet soul-fire burst & shock ring
    - F20..F29: Locked dragging death-grip with pulsing purple runes & taut iron chain
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0

    if f <= 9:
        u = f / 9.0
        jaw_deg = 36.0 - u * 6.0  # Wide open grasping talons (36 deg -> 30 deg)
        wrist_x = 16.0 + u * 4.0
        burst_int = 0.0
    elif f <= 19:
        u = (f - 10) / 9.0
        # Rapid snap shut F10..F13, then crushed lock
        snap = min(1.0, (f - 10) / 3.0)
        jaw_deg = 30.0 * (1.0 - snap) + 9.0 * snap
        wrist_x = 20.0
        burst_int = math.sin(u * math.pi)
    else:
        u = (f - 20) / 9.0
        jaw_deg = 9.0 + math.sin(u * math.pi * 2.0) * 2.0
        wrist_x = 20.0 - u * 3.0  # Dragging backward
        burst_int = 0.0

    cy = 26.0 + math.sin(phase * 2.0) * 1.0

    # 1. Trailing Interlocking Dark-Iron & Amethyst Chain Links (x = 4..wrist_x)
    link_idx = 0
    for lx in range(4, int(wrist_x) - 1, 4):
        ly = cy + math.sin(lx * 0.45 - phase * 3.0) * 1.8
        # Outer obsidian iron link
        for dx_l in range(-2, 3):
            for dy_l in range(-2, 3):
                if abs(dx_l) == 2 or abs(dy_l) == 2:
                    put(px, lx + dx_l, ly + dy_l, C_OBSIDIAN_DARK)
                elif link_idx % 2 == 0:
                    put(px, lx + dx_l, ly + dy_l, C_VIOLET_BRIGHT if dy_l == -1 else C_BONE_MID)
                else:
                    put(px, lx + dx_l, ly + dy_l, C_CRIMSON_BRIGHT if dy_l == 0 else C_VIOLET_DARK)
        link_idx += 1

    # 2. Abyssal Soul-Fire Aura Behind Skeletal Wrist Cuff
    for dy_a in range(-8, 9):
        for dx_a in range(-6, 8):
            if math.hypot(dx_a, dy_a) <= 7.5:
                put(px, wrist_x + dx_a, cy + dy_a, C_VIOLET_AURA if (dx_a + dy_a + f) % 2 == 0 else C_CRIMSON_AURA)

    # 3. Articulated 4-Talon Skeletal Bone-Gauntlet (Upper 2 Talons, Central Palm Eye, Lower 2 Talons)
    for sign in (-1, 1):
        for inner_idx in (0, 1):
            ang_scale = 1.0 if inner_idx == 0 else 0.52
            base_ang = math.radians(sign * jaw_deg * ang_scale)
            len_seg1 = 11.5 if inner_idx == 0 else 9.5
            len_seg2 = 10.5 if inner_idx == 0 else 8.5

            # Proximal phalanx bone (wrist -> knuckle)
            kx = wrist_x + 4 + math.cos(base_ang) * len_seg1
            ky = cy + sign * 2 + math.sin(base_ang) * len_seg1

            # Distal curved talon tip (knuckle -> sharp hooked claw point)
            hook_ang = base_ang - math.radians(sign * (28.0 + (1.0 - jaw_deg / 36.0) * 18.0))
            tx = kx + math.cos(hook_ang) * len_seg2
            ty = ky + math.sin(hook_ang) * len_seg2

            col_bone = C_BONE_WHITE if inner_idx == 0 else C_BONE_LIGHT
            col_shade = C_BONE_MID if inner_idx == 0 else C_BONE_DARK

            # Draw thick sculpted phalanx
            for off_y in (-1, 0, 1):
                c_seg = col_bone if off_y == -sign else col_shade
                draw_line(px, wrist_x + 3, cy + sign * 2 + off_y, kx, ky + off_y, c_seg)
                draw_line(px, kx, ky + off_y * 0.6, tx, ty, C_WHITE if off_y == 0 else col_bone)

            # Knuckle spike & rune glow
            put(px, kx, ky, C_VIOLET_PINK if f >= 10 else C_SPECTRAL_MINT)
            put(px, tx, ty, C_CRIMSON_BRIGHT if f >= 10 else C_WHITE)

    # 4. Armored Bone-Gauntlet Wrist Cuff & Blazing Soul-Eye Socket
    for dx_w in range(-3, 6):
        for dy_w in range(-5, 6):
            if abs(dx_w) + abs(dy_w) <= 7:
                if abs(dy_w) >= 4:
                    put(px, wrist_x + dx_w, cy + dy_w, C_OBSIDIAN_MID)
                else:
                    put(px, wrist_x + dx_w, cy + dy_w, C_BONE_LIGHT if dx_w > 0 else C_BONE_MID)
    # Glowing crimson-violet eye gem in palm/wrist
    draw_circle(px, wrist_x + 2, cy, 2.2, C_CRIMSON_BRIGHT, fill=True)
    put(px, wrist_x + 2, cy, C_WHITE)

    # 5. Clamping Soul-Fire Impact Burst (F10..F19) or Locked Rune Vortex (F20..F29)
    grip_cx = wrist_x + 16.5
    if burst_int > 0.05:
        r_b = 3.0 + (1.0 - burst_int) * 8.5
        draw_circle(px, grip_cx, cy, r_b, C_CRIMSON_BRIGHT if f % 2 == 0 else C_VIOLET_PINK, fill=False)
        draw_star(px, grip_cx, cy, 4 + int(burst_int * 4), C_WHITE, C_CRIMSON_BRIGHT, rot=phase)
    elif f >= 20:
        draw_circle(px, grip_cx - 2, cy, 4.0 + math.sin(phase * 3.0), C_VIOLET_BRIGHT, fill=False)
        draw_star(px, grip_cx - 2, cy, 3, C_WHITE, C_VIOLET_PINK, rot=-phase)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row2_necropolis_tombstone(f):
    """
    Row 2 (F00..F29): GOTHIC NECROPOLIS TOMBSTONE & SOUL VORTEX
    - Towering 35px-tall Ornate Gothic Cathedral Gargoyle Obelisk / Tombstone (y = 10..45, x = 14..38)
    - Tiered gothic spires, sculpted gargoyle wings/shoulders, blazing crimson-magenta rune cross in the center,
      cracked obsidian-slate stone bevels, and orbiting emerald-violet soul wisps that erupt when the obelisk shatters (F22..F29)!
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0
    cx = 26
    gy = 45

    if f <= 6:
        rise_u = (f + 1) / 7.0
        crumble_u = 0.0
    elif f <= 21:
        rise_u = 1.0
        crumble_u = 0.0
    else:
        rise_u = 1.0
        crumble_u = (f - 21) / 8.0

    # 1. Haunted Necropolis Ground Miasma Pool & Runic Fissure at Base (y = 42..48, x = 8..44)
    pool_rx = int(round(17.0 * min(1.0, rise_u * 1.35) * (1.0 - crumble_u * 0.25)))
    for dx in range(-pool_rx, pool_rx + 1):
        for dy in range(-2, 4):
            if (dx * dx) / max(1.0, pool_rx * pool_rx) + (dy * dy) / 7.5 <= 1.0:
                if dy == 0 and abs(dx) < pool_rx * 0.7:
                    col_p = C_SPECTRAL_MINT if (dx + f) % 4 == 0 else C_VIOLET_PINK
                elif dy <= 0:
                    col_p = C_VIOLET_BRIGHT if abs(dx) % 3 == 0 else C_CRIMSON_DARK
                else:
                    col_p = C_VIOLET_DARK if (dx + dy) % 2 == 0 else C_ABYSS_DEEP
                put(px, cx + dx, gy + dy, col_p)

    # 2. Towering 35px Ornate Gothic Cathedral Gargoyle Obelisk / Tombstone (y = 10..45, x = 14..38)
    full_h = 35  # Top of central spire at y = 10 when gy = 45
    vis_h = int(round(full_h * rise_u))
    top_y = gy - vis_h

    if crumble_u < 0.92:
        for local_y in range(vis_h + 1):
            y = top_y + local_y
            if not (4 <= y <= gy):
                continue

            # During F22..F29, fracture the obelisk into exploding stone & rune blocks
            if crumble_u > 0.0:
                frag_id = local_y // 3
                if crumble_u > 0.55 and (frag_id + f) % 3 == 0:
                    continue
                dir_sign = -1 if (frag_id % 2 == 0) else 1
                x_jit = int(round(dir_sign * (1.5 + (frag_id % 3)) * crumble_u * 4.5))
                y_jit = int(round(( (frag_id % 4) - 1.5 ) * crumble_u * 5.0))
            else:
                x_jit, y_jit = 0, 0

            # Compute tiered Gothic Cathedral Silhouette width (`x = 14..38` -> `half_w` up to 12)
            if local_y <= 2:
                half_w = local_y  # Central finial spike tip (0..2)
            elif local_y in (3, 4):
                half_w = 4  # Upper finial cross-bar
            elif local_y <= 7:
                half_w = 2 + (local_y - 5)  # Spire neck (2..4)
            elif local_y <= 13:
                # Gargoyle shoulder wings & flanking mini-spires (half_w = 11..12 -> x = 14..38)
                half_w = 12 if local_y in (9, 10, 11) else 10
            elif local_y <= 28:
                # Cathedral Obelisk main buttressed body (half_w = 9..10)
                half_w = 10 if local_y % 5 == 0 else 9
            else:
                # Wide Stepped Gothic Plinth Base (local_y = 29..35, half_w = 11..12 -> x = 14..38)
                half_w = 11 if local_y < 32 else 12

            for dx in range(-half_w, half_w + 1):
                # Carve gaps between central spire and flanking gargoyle mini-spires at local_y = 8..10
                if 8 <= local_y <= 10 and 5 <= abs(dx) <= 7:
                    continue

                px_x = cx + dx + x_jit
                px_y = y + y_jit

                # Default stone shading: High-contrast carved bone-slate & obsidian bevels
                is_outer_rim = (abs(dx) == half_w or local_y == 0 or local_y in (8, 14, 29, 35))
                is_inner_rib = (abs(dx) == half_w - 1 or abs(dx) == 6)

                if is_outer_rim:
                    col_t = C_BONE_WHITE if (dx < 0 and local_y < 15) else (C_BONE_LIGHT if dx <= 0 else C_VIOLET_BRIGHT)
                elif is_inner_rib:
                    col_t = C_BONE_MID if dx < 0 else C_VIOLET_DARK
                else:
                    col_t = C_BONE_DARK if (dx + local_y) % 4 == 0 else C_OBSIDIAN_MID

                # Sculpted Gargoyle Wing Feathers & Glowing Gargoyle Eyes on shoulders (local_y = 9..13)
                if 9 <= local_y <= 13 and abs(dx) >= 7:
                    if local_y == 10 and abs(dx) == 9:
                        col_t = C_CRIMSON_BRIGHT  # Blazing gargoyle eye
                    elif (abs(dx) + local_y) % 2 == 0:
                        col_t = C_BONE_LIGHT
                    else:
                        col_t = C_OBSIDIAN_DARK

                # Cracked Obsidian Stone Bevels / Glowing Necrotic Fissure Veins
                crack_1 = (local_y >= 14 and abs((dx + 5) - (local_y - 14) * 0.55) < 0.65)
                crack_2 = (local_y >= 18 and abs((dx - 6) + (local_y - 18) * 0.5) < 0.65)
                if crack_1 or crack_2:
                    col_t = C_SPECTRAL_MINT if (local_y + f) % 3 == 0 else C_VIOLET_BRIGHT

                # Blazing Crimson-Magenta Rune Cross in the Center (local_y = 11..28, dx = -6..+6)
                in_vert_shaft = (11 <= local_y <= 28 and abs(dx) <= 1)
                in_horiz_arm = (16 <= local_y <= 18 and abs(dx) <= 6)
                in_cross_flare = (
                    (local_y in (11, 28) and abs(dx) <= 2)
                    or (local_y in (15, 19) and abs(dx) in (5, 6))
                )
                if in_vert_shaft or in_horiz_arm or in_cross_flare:
                    if (dx == 0 and 12 <= local_y <= 27) or (local_y == 17 and abs(dx) <= 5):
                        col_t = C_WHITE if (local_y + f) % 3 == 0 else C_CRIMSON_LIGHT
                    elif abs(dx) + abs(local_y - 17) <= 2:
                        col_t = C_WHITE  # Blazing cross nexus core
                    else:
                        col_t = C_CRIMSON_BRIGHT if (local_y + dx + f) % 2 == 0 else C_VIOLET_PINK

                put(px, px_x, px_y, col_t)

        # Flanking Gothic Mini-Spire Finial Tips at local_y = 6..8, abs(dx) == 9
        if vis_h >= 12 and crumble_u < 0.4:
            for side in (-1, 1):
                sx_sp = cx + side * 9
                for dy_sp in range(3):
                    put(px, sx_sp, top_y + 6 + dy_sp, C_BONE_WHITE if dy_sp == 0 else C_BONE_LIGHT)
            draw_star(px, cx, max(5, top_y), 2, C_WHITE, C_CRIMSON_BRIGHT, rot=phase)

    # 3. Orbiting Emerald-Violet Soul Wisps (F03..F21) that Erupt Skyward on Shatter (F22..F29)
    if f >= 3:
        num_wisps = 4 if crumble_u == 0.0 else 8
        for w_idx in range(num_wisps):
            wa = phase * 2.0 + w_idx * (math.pi * 2.0 / num_wisps)
            if crumble_u == 0.0:
                rx_w = 14.5 + math.sin(phase + w_idx) * 1.5
                wx = cx + math.cos(wa) * rx_w
                wy = (gy - 8 - (w_idx * 6)) + math.sin(wa * 2.0) * 2.5
            else:
                # Erupting outward & skyward when the obelisk shatters (F22..F29)
                erupt_r = 4.0 + crumble_u * (14.0 + (w_idx % 3) * 3.0)
                wx = cx + math.cos(wa) * erupt_r
                wy = (gy - 14) - crumble_u * (16.0 + (w_idx % 4) * 3.5) + math.sin(wa) * 4.0

            col_w = C_SPECTRAL_MINT if w_idx % 2 == 0 else (C_VIOLET_PINK if w_idx % 3 == 0 else C_CRIMSON_BRIGHT)
            draw_circle(px, wx, wy, 1.8, col_w, fill=True)
            put(px, wx, wy, C_WHITE)
            # Trailing soul wisp tail
            for t_s in range(1, 4):
                tx_w = wx - math.cos(wa) * t_s * 1.2
                ty_w = wy + t_s * 1.1
                put(px, tx_w, ty_w, C_SPECTRAL_TEAL if w_idx % 2 == 0 else C_VIOLET_BRIGHT)

    # 4. Erupting Emerald-Violet & Crimson Soul-Fire Geyser during Shatter (F22..F29)
    if crumble_u > 0.0:
        draw_star(px, cx, gy - 18 - int(crumble_u * 10), 4, C_WHITE, C_CRIMSON_BRIGHT, rot=phase)
        for h in range(3, int(33 * (1.0 - crumble_u * 0.15))):
            py = gy - 2 - h
            for strand in (-1, 1):
                wx = cx + strand * math.sin(h * 0.35 - phase * 3.0) * (3.0 + crumble_u * 5.0)
                put(px, wx, py, C_WHITE if h % 3 == 0 else (C_SPECTRAL_MINT if strand > 0 else C_VIOLET_PINK))
                put(px, wx + strand, py, C_CRIMSON_BRIGHT if h % 2 == 0 else C_VIOLET_BRIGHT)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row3_sovereign_of_death_avatar(f):
    """
    Row 3 (F00..F29): GRIM HARVEST - COLOSSAL SOVEREIGN OF DEATH AVATAR
    - Enriched with taller jagged abyssal crown horns, brighter crimson-violet eye sockets,
      blazing ribcage soul-fire core, and wider crossed spectral scythe blades (strictly within 2 <= x <= 49, 2 <= y <= 49).
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0
    cx = 26.0

    if f <= 7:
        mat_u = (f + 1) / 8.0
        diss_u = 0.0
        roar_u = 0.25
    elif f <= 21:
        mat_u = 1.0
        diss_u = 0.0
        roar_u = 0.35 + 0.65 * math.sin(((f - 8) / 13.0) * math.pi)
    else:
        mat_u = 1.0
        diss_u = (f - 21) / 8.0
        roar_u = 0.2

    # 1. Volumetric Blood-Moon & Violet Halo Behind the Sovereign (r <= 20, strictly inside 4..48)
    halo_r = 19.5 * mat_u * (1.0 - diss_u * 0.3)
    for s in range(64):
        a = (s / 64.0) * math.pi * 2.0 + phase * 1.5
        rx = cx + math.cos(a) * halo_r
        ry = 26.0 + math.sin(a) * halo_r
        put(px, rx, ry, C_CRIMSON_BRIGHT if s % 4 == 0 else (C_VIOLET_PINK if s % 2 == 0 else C_VIOLET_DARK))

    if diss_u < 0.90:
        bob_y = math.sin(phase) * 1.0 - diss_u * 3.0
        head_y = 14.5 + (1.0 - mat_u) * 5.0 + bob_y

        # 2. Wider Crossed Spectral Scythe Blades & Hafts Behind the Sovereign (strictly inside 3..48)
        sweep_off = math.sin(phase * 1.5) * 1.5
        for side in (-1, 1):
            # Long diagonal dark-bone & rune scythe haft crossing behind the chest
            haft_x0 = cx - side * 10.0
            haft_y0 = min(46.0, head_y + 27.0)
            haft_x1 = cx + side * 14.0
            haft_y1 = max(7.0, head_y - 4.0 + sweep_off * side)
            draw_line(px, haft_x0, haft_y0, haft_x1, haft_y1, C_BONE_LIGHT)
            draw_line(px, haft_x0, haft_y0 + 1, haft_x1, haft_y1 + 1, C_VIOLET_BRIGHT)

            # Wide Sweeping Crescent Spectral Scythe Blade arcing outward from collar (haft_x1, haft_y1)
            # Sweeps across x = 4..20 (left) and x = 32..48 (right), y = 6..30
            steps_b = 24
            for bi in range(steps_b + 1):
                bu = bi / float(steps_b)
                # Blade curves outward to the side then hooks sharply down and inward
                bx_s = haft_x1 + side * (math.sin(bu * math.pi * 0.82) * 7.5 - (bu ** 2.2) * 3.5)
                by_s = haft_y1 - math.sin(bu * math.pi * 0.5) * 2.0 + (bu ** 1.35) * 20.5
                w_blade = max(1, int(round((1.0 - bu * 0.55) * 3.8)))
                for bw in range(w_blade + 1):
                    px_b = bx_s - side * bw
                    if bw == 0:
                        col_b = C_WHITE
                    elif bw == 1:
                        col_b = C_CRIMSON_BRIGHT if (bi + f) % 4 != 0 else C_SOUL_CORE
                    elif bw == 2:
                        col_b = C_VIOLET_PINK if side == -1 else C_SPECTRAL_MINT
                    else:
                        col_b = C_VIOLET
                    put(px, px_b, by_s, col_b)

        # 3. Towering Tattered Abyssal Shroud & Ribcage Soul-Fire Core (y = head_y+5 .. 47)
        max_body_y = int(min(47, head_y + 5 + 27 * mat_u))
        for y in range(int(head_y + 5), max_body_y + 1):
            u_b = (y - (head_y + 5)) / 27.0
            if diss_u > 0.45 and ((y + f) % 3 == 0):
                continue
            shroud_w = int(round((12.0 - u_b * 2.5 + math.sin(u_b * 5.0 - phase * 2.0) * 1.8) * (1.0 - diss_u * 0.4)))
            sway_x = math.sin(u_b * 3.5 - phase * 2.0) * (1.2 + diss_u * 3.0)

            for dx in range(-shroud_w, shroud_w + 1):
                px_x = cx + sway_x + dx
                if abs(dx) == shroud_w:
                    put(px, px_x, y, C_VIOLET_PINK if (y + dx) % 3 == 0 else C_CRIMSON_BRIGHT)
                elif abs(dx) >= shroud_w - 2:
                    put(px, px_x, y, C_VIOLET_DARK if (dx + y) % 2 == 0 else C_OBSIDIAN_MID)
                else:
                    put(px, px_x, y, C_OBSIDIAN_DARK)

            # Blazing Ribcage Soul-Fire Core & High-Contrast Articulated Skeletal Ribs (u_b = 0.08..0.68)
            if 0.08 <= u_b <= 0.68:
                rib_rel = y - int(head_y + 5)
                core_w = int(round(4.5 * math.sin(((u_b - 0.08) / 0.60) * math.pi)))
                # Glowing Soul-Fire Core inside the chest cavity
                for cdx in range(-core_w, core_w + 1):
                    dist_c = abs(cdx)
                    if dist_c == 0:
                        col_c = C_WHITE
                    elif dist_c == 1:
                        col_c = C_CRIMSON_BRIGHT if (y + f) % 2 == 0 else C_SOUL_CORE
                    elif dist_c == 2:
                        col_c = C_VIOLET_PINK if (y + cdx + f) % 2 == 0 else C_SPECTRAL_MINT
                    else:
                        col_c = C_CRIMSON
                    put(px, cx + sway_x + cdx, y, col_c)

                # Sculpted Bone Ribs arching over the Soul-Fire Core every 3 pixels
                if rib_rel % 3 == 0:
                    rib_w = int(round(7.5 * (1.0 - (u_b - 0.08) * 0.55)))
                    for rdx in range(-rib_w, rib_w + 1):
                        if abs(rdx) >= 2:
                            put(px, cx + sway_x + rdx, y, C_BONE_WHITE if abs(rdx) < rib_w - 1 else C_BONE_MID)
                        elif rdx == 0:
                            # Sternum bone nexus with spectral gem
                            put(px, cx + sway_x, y, C_SPECTRAL_MINT if (rib_rel // 3) % 2 == 0 else C_WHITE)

        # 4. Hooded Skeletal Sovereign Skull, Taller Jagged Abyssal Crown Horns & Brighter Eye Sockets
        for dy in range(-5, 6):
            hood_w = int(round(7.0 - abs(dy) * 0.5))
            for dx in range(-hood_w, hood_w + 1):
                if abs(dx) == hood_w or dy == -5:
                    put(px, cx + dx, head_y + dy, C_VIOLET_PINK if dy < 0 else C_VIOLET_BRIGHT)
                elif abs(dx) <= 4 and -3 <= dy <= 3:
                    put(px, cx + dx, head_y + dy, C_BONE_WHITE if dy <= 0 else C_BONE_LIGHT)
                else:
                    put(px, cx + dx, head_y + dy, C_OBSIDIAN_DARK)

        # Taller Jagged Abyssal Crown Horns (sweeping up to y = head_y - 10 >= 4)
        for sign in (-1, 1):
            # Outer jagged great-horn with stepped abyssal barbs
            for hd in range(1, 10):
                jag = (1.0 if hd in (4, 7) else 0.0) * sign
                hx_c = cx + sign * (3.5 + hd * 0.9) + jag
                hy_c = max(3, head_y - 2.5 - hd * 0.85)
                col_h = C_WHITE if hd == 9 else (C_CRIMSON_BRIGHT if hd >= 6 else (C_VIOLET_PINK if hd >= 4 else C_BONE_WHITE))
                put(px, hx_c, hy_c, col_h)
                put(px, hx_c - sign, hy_c, C_BONE_LIGHT if hd < 5 else C_CRIMSON)
            # Inner secondary abyssal crown tine
            for hd2 in range(1, 7):
                put(px, cx + sign * (2.0 + hd2 * 0.35), max(3, head_y - 4.0 - hd2 * 0.9), C_VIOLET_PINK if hd2 >= 4 else C_BONE_WHITE)

        # Towering Central Abyssal Crown Spike & Blood-Moon Star
        for cd in range(1, 8):
            put(px, cx, max(3, head_y - 4 - cd), C_WHITE if cd >= 6 else C_CRIMSON_BRIGHT)
            if cd in (3, 5):
                put(px, cx - 1, max(3, head_y - 4 - cd), C_VIOLET_PINK)
                put(px, cx + 1, max(3, head_y - 4 - cd), C_VIOLET_PINK)

        # Brighter Crimson-Violet Eye Sockets & Trailing Eye-Flame Wisps
        for sign in (-1, 1):
            # 3x2 Blazing eye socket
            put(px, cx + sign * 2, head_y, C_WHITE)
            put(px, cx + sign * 3, head_y, C_CRIMSON_BRIGHT)
            put(px, cx + sign * 1, head_y, C_CRIMSON_LIGHT)
            put(px, cx + sign * 2, head_y - 1, C_CRIMSON_BRIGHT)
            put(px, cx + sign * 3, head_y - 1, C_VIOLET_PINK)
            put(px, cx + sign * 4, head_y - 2, C_VIOLET_PINK if f % 2 == 0 else C_SPECTRAL_MINT)

        # Roaring Skeletal Jaw with Soul-Fire Breath
        jaw_drop = int(round(1 + roar_u * 2.5))
        for dx in range(-3, 4):
            put(px, cx + dx, head_y + 3 + jaw_drop, C_BONE_WHITE if abs(dx) % 2 == 0 else C_BONE_MID)
            if abs(dx) <= 2:
                put(px, cx + dx, head_y + 2 + jaw_drop, C_WHITE if dx == 0 else C_CRIMSON_BRIGHT)

    # 5. Blood-Moon Soul Vortex Dissolution (F22..F29)
    if diss_u > 0.0:
        for v_i in range(28):
            u_v = v_i / 27.0
            va = phase * 3.0 + u_v * math.pi * 4.0
            vr = (1.0 - diss_u * 0.65) * 18.0 * math.sin(u_v * math.pi)
            vx = cx + math.cos(va) * vr
            vy = 26.0 + (u_v - 0.5) * 34.0 * (1.0 - diss_u * 0.35)
            put(px, vx, vy, C_WHITE if v_i % 4 == 0 else (C_CRIMSON_BRIGHT if v_i % 2 == 0 else C_VIOLET_PINK))

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row4_blood_moon_cleave_and_seal(f):
    """
    Row 4 (F00..F29): BLOOD-MOON SCYTHE CLEAVE WAVE & NECROMANTIC SEAL
    - Revolving 8-point Necropolis Skull & Runic Compass Seal
    - Wide sweeping Crimson-Violet & Spectral-Mint Crescent Scythe Slash Wave (pointing +X)
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0
    cx, cy = 21.0, 26.0

    # 1. Revolving Necromantic Runic Circle & 8-Point Death Star Seal
    ring_r = 12.0 + math.sin(phase * 2.0) * 1.2
    for s in range(48):
        a = (s / 48.0) * math.pi * 2.0 + phase
        rx = cx + math.cos(a) * ring_r
        ry = cy + math.sin(a) * ring_r
        put(px, rx, ry, C_CRIMSON_BRIGHT if s % 6 == 0 else (C_VIOLET_BRIGHT if s % 2 == 0 else C_VIOLET_DARK))

    for k in range(8):
        a = -phase + k * (math.pi * 0.25)
        max_d = 16 if k % 2 == 0 else 11
        col_p = C_CRIMSON_BRIGHT if k % 2 == 0 else C_VIOLET_PINK
        for d in range(3, max_d + 1):
            put(px, cx + math.cos(a) * d, cy + math.sin(a) * d, C_WHITE if d == max_d else col_p)

    draw_star(px, cx, cy, 4, C_WHITE, C_CRIMSON_BRIGHT, rot=phase)

    # 2. Wide Sweeping Blood-Moon Crescent Scythe Slash Wave (x = 24..49, y = 4..48)
    wave_pulse = 0.85 + 0.15 * math.sin(phase * 2.0)
    for s in range(-21, 22):
        u_arc = s / 21.0  # -1.0 at top tip -> 0.0 at apex -> +1.0 at bottom tip
        arc_y = cy + s * 1.02
        arc_x = 46.0 - (u_arc * u_arc) * 15.0 + math.sin(phase + u_arc * 3.0) * 1.0
        thickness = int(round((1.0 - u_arc * u_arc * 0.72) * 7.0 * wave_pulse))
        for t_off in range(thickness + 1):
            wx = arc_x - t_off
            if t_off == 0:
                put(px, wx, arc_y, C_WHITE)
            elif t_off == 1:
                put(px, wx, arc_y, C_CRIMSON_BRIGHT)
            elif t_off == 2:
                put(px, wx, arc_y, C_VIOLET_PINK)
            elif t_off <= 4:
                put(px, wx, arc_y, C_SPECTRAL_MINT if (s + f) % 3 == 0 else C_VIOLET_BRIGHT)
            else:
                put(px, wx, arc_y, C_VIOLET if (s + t_off) % 2 == 0 else C_CRIMSON_DARK)

    # 3. 30fps Peeling Soul-Thorns & Crimson Sparks Streaming Off Crescent Tips
    for m in range(6):
        u_m = ((f / 30.0) + m / 6.0) % 1.0
        side = 1 if m % 2 == 0 else -1
        fx = 45.0 - u_m * 18.0
        fy = cy + side * (7.0 + u_m * 14.0) + math.sin(phase * 2.0 + m) * 1.5
        put(px, fx, fy, C_WHITE if u_m < 0.35 else C_CRIMSON_BRIGHT)
        put(px, fx - 1, fy, C_VIOLET_PINK)
        put(px, fx - 2, fy - side * 0.5, C_VIOLET)

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
        ray_col = C_CRIMSON_BRIGHT if (m_idx + row_idx) % 2 == 0 else C_VIOLET_PINK
        ray_len = 5 + ((f + m_idx) % 3)

        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if abs(dx) + abs(dy) <= 1:
                    x, y = cx + dx, cy + dy
                    if 16 <= x <= 191 and 16 <= y <= 191:
                        px[x, y] = C_WHITE
                elif px[cx + dx, cy + dy][3] == 0:
                    px[cx + dx, cy + dy] = C_VIOLET_AURA

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
        ("ROW 0: PHANTOM SCYTHE BOOMERANG (30 FRAMES)", build_row0_phantom_scythe),
        ("ROW 1: SPECTRAL BONE-CLAW & ABYSSAL CHAIN HOOK (30 FRAMES)", build_row1_spectral_bone_claw),
        ("ROW 2: GOTHIC NECROPOLIS TOMBSTONE & SOUL VORTEX (30 FRAMES)", build_row2_necropolis_tombstone),
        ("ROW 3: GRIM HARVEST - COLOSSAL SOVEREIGN OF DEATH (30 FRAMES)", build_row3_sovereign_of_death_avatar),
        ("ROW 4: BLOOD-MOON SCYTHE CLEAVE WAVE & NECROMANTIC SEAL (30 FRAMES)", build_row4_blood_moon_cleave_and_seal),
    ]

    for row_idx, (label, fn) in enumerate(builders):
        for col_idx in range(COLS):
            cell_img = apply_pass11_star_mote_polish(fn(col_idx), row_idx, col_idx)
            sheet.paste(cell_img, (col_idx * CELL, row_idx * CELL))

    out_path = "/home/antigravity/assets/sprites/reaper_vfx.png"
    sheet.save(out_path)
    print(f"Saved 30fps Reaper VFX sheet to {out_path} ({sheet.size[0]}x{sheet.size[1]})")

    # Build contact sheet debug_reaper_30fps_vfx.png in artifact directory
    art_dir = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/4f1fb80f-a88f-4496-9746-b4b9fe84f6d4"
    thumb = 80
    pad_top = 24
    cw = COLS * thumb
    ch = ROWS * (thumb + pad_top)
    contact = Image.new("RGBA", (cw, ch), (15, 12, 26, 255))
    draw = ImageDraw.Draw(contact)
    for r_idx, (label, _) in enumerate(builders):
        y0 = r_idx * (thumb + pad_top)
        draw.rectangle([0, y0, cw, y0 + pad_top - 1], fill=(28, 18, 46, 255))
        draw.text((6, y0 + 2), label, fill=(216, 180, 254, 255))
        for c_idx in range(COLS):
            x0 = c_idx * thumb
            draw.text((x0 + 4, y0 + 12), f"F{c_idx:02d}", fill=(244, 63, 94, 255))
            cell_crop = sheet.crop((c_idx * CELL, r_idx * CELL, (c_idx + 1) * CELL, (r_idx + 1) * CELL))
            cell_thumb = cell_crop.resize((thumb, thumb), Image.Resampling.NEAREST)
            contact.paste(cell_thumb, (x0, y0 + pad_top), cell_thumb)
            draw.rectangle([x0, y0 + pad_top, x0 + thumb - 1, y0 + pad_top + thumb - 1], outline=(48, 32, 72, 255))

    c_path = os.path.join(art_dir, "debug_reaper_30fps_vfx.png")
    contact.save(c_path)
    print(f"Saved VFX contact sheet: {c_path} ({contact.size[0]}x{contact.size[1]})")


if __name__ == "__main__":
    main()
