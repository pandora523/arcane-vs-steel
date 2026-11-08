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

    # 1. Trailing Interlocking Dark-Iron & Amethyst Chain Links (x = 2..wrist_x)
    link_idx = 0
    for lx in range(3, int(wrist_x) - 1, 4):
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
    grip_cx = wrist_x + 17.0
    if burst_int > 0.05:
        r_b = 3.0 + (1.0 - burst_int) * 11.0
        draw_circle(px, grip_cx, cy, r_b, C_CRIMSON_BRIGHT if f % 2 == 0 else C_VIOLET_PINK, fill=False)
        draw_star(px, grip_cx, cy, 4 + int(burst_int * 4), C_WHITE, C_CRIMSON_BRIGHT, rot=phase)
    elif f >= 20:
        draw_circle(px, grip_cx - 2, cy, 4.0 + math.sin(phase * 3.0), C_VIOLET_BRIGHT, fill=False)
        draw_star(px, grip_cx - 2, cy, 3, C_WHITE, C_VIOLET_PINK, rot=-phase)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row2_necropolis_tombstone(f):
    """
    Row 2 (F00..F29): GOTHIC NECROPOLIS TOMBSTONE & SOUL VORTEX
    - F00..F06: Ground fissure & erupting carved gothic skull-cross tombstone monolith
    - F07..F21: Pulsing obsidian tombstone with swirling emerald-violet spectral skulls & crimson rune glow
    - F22..F29: Crumbling stone & soul-spirit ascension
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0
    cx = 26
    gy = 46

    if f <= 6:
        rise_u = (f + 1) / 7.0
        crumble_u = 0.0
    elif f <= 21:
        rise_u = 1.0
        crumble_u = 0.0
    else:
        rise_u = 1.0
        crumble_u = (f - 21) / 8.0

    # 1. Haunted Necropolis Ground Miasma Pool & Fissure at Base (y = 43..49)
    pool_rx = int(round(16.0 * min(1.0, rise_u * 1.3) * (1.0 - crumble_u * 0.4)))
    for dx in range(-pool_rx, pool_rx + 1):
        for dy in range(-2, 3):
            if (dx * dx) / max(1.0, pool_rx * pool_rx) + (dy * dy) / 6.0 <= 1.0:
                col_p = C_VIOLET_BRIGHT if dy == 0 and abs(dx) < pool_rx * 0.6 else (C_VIOLET_DARK if dy <= 0 else C_ABYSS_DEEP)
                put(px, cx + dx, gy + dy, col_p)

    # 2. Carved Gothic Skull-Cross Tombstone Monolith
    full_h = 32  # Top of cross at y = 14 when fully risen
    vis_h = int(round(full_h * rise_u))
    top_y = gy - vis_h

    if crumble_u < 0.85:
        for local_y in range(vis_h):
            y = top_y + local_y
            if not (4 <= y < gy):
                continue
            # If crumbling (F22..F29), break monolith into rising/falling fragments
            if crumble_u > 0.0:
                frag_id = (local_y // 4)
                if (frag_id + int(crumble_u * 6)) % 3 == 0 and crumble_u > 0.35:
                    continue
                x_jit = int(round(math.sin(frag_id * 2.7) * crumble_u * 6.0))
                y_jit = int(round((crumble_u * crumble_u) * 8.0 * (1 if frag_id % 2 == 0 else -1)))
            else:
                x_jit, y_jit = 0, 0

            # Gothic finial cross at local_y = 0..7, arched shoulder at 8..13, plinth slab at 14..31
            if local_y < 3:
                half_w = 1
            elif local_y < 6:
                half_w = 4
            elif local_y < 8:
                half_w = 2
            elif local_y < 14:
                u_arch = (local_y - 8) / 6.0
                half_w = int(round(5 + math.sin(u_arch * math.pi * 0.5) * 5))
            elif local_y >= 28:
                half_w = 12
            else:
                half_w = 10

            for dx in range(-half_w, half_w + 1):
                px_x = cx + dx + x_jit
                px_y = y + y_jit
                if abs(dx) == half_w or local_y in (0, 8, 28):
                    col_t = C_BONE_MID if dx < 0 else C_OBSIDIAN_DARK
                elif abs(dx) == half_w - 1:
                    col_t = C_OBSIDIAN_MID
                else:
                    col_t = C_OBSIDIAN_DARK

                # Glowing carved Skull & Runic Cross inside the tombstone face (local_y = 12..26)
                if 12 <= local_y <= 17 and abs(dx) <= 3:
                    # Carved skull face in upper arch
                    if local_y in (14, 15) and abs(dx) == 2:
                        col_t = C_CRIMSON_BRIGHT if (f % 4 != 0) else C_WHITE
                    elif abs(dx) + abs(local_y - 14) <= 3:
                        col_t = C_BONE_LIGHT
                elif 19 <= local_y <= 26 and (dx == 0 or (local_y == 22 and abs(dx) <= 4)):
                    # Glowing crimson-violet necropolis rune cross on slab
                    pulse = math.sin(phase * 2.0 - local_y * 0.4) > 0
                    col_t = C_CRIMSON_BRIGHT if pulse else C_VIOLET_BRIGHT

                put(px, px_x, px_y, col_t)

    # 3. Swirling Emerald-Mint & Violet Spectral Skulls / Soul Wisps Orbiting the Tombstone (F05..F29)
    if f >= 4:
        for w_idx in range(3):
            wa = phase * 1.8 + w_idx * (math.pi * 2.0 / 3.0)
            wx = cx + math.cos(wa) * (13.5 + crumble_u * 4.0)
            wy = (gy - 14 - w_idx * 5) - crumble_u * 12.0 + math.sin(wa * 2.0) * 2.5
            if math.sin(wa) >= -0.3 or crumble_u > 0.0:
                col_w = C_SPECTRAL_MINT if w_idx == 0 else (C_VIOLET_PINK if w_idx == 1 else C_CRIMSON_BRIGHT)
                draw_circle(px, wx, wy, 1.8, col_w, fill=True)
                put(px, wx, wy, C_WHITE)
                put(px, wx - math.cos(wa) * 2.0, wy + 1.5, col_w)

    # 4. Ascending Soul-Spirit Pillar during Crumble (F22..F29)
    if crumble_u > 0.0:
        for h in range(4, int(36 * (1.0 - crumble_u * 0.3))):
            py = gy - 4 - h
            wx = cx + math.sin(h * 0.35 - phase * 3.0) * (3.5 * (1.0 - crumble_u * 0.5))
            put(px, wx, py, C_WHITE if h % 3 == 0 else C_VIOLET_PINK)
            put(px, wx + 1, py, C_SPECTRAL_MINT if h % 2 == 0 else C_CRIMSON_BRIGHT)

    return img.resize((CELL, CELL), Image.Resampling.NEAREST)


def build_row3_sovereign_of_death_avatar(f):
    """
    Row 3 (F00..F29): GRIM HARVEST - COLOSSAL SOVEREIGN OF DEATH AVATAR
    - F00..F07: Materializing from abyssal ribs, necrotic miasma & tattered dark shroud
    - F08..F21: Towering horned skeletal Sovereign of Death roaring with blazing crimson eye sockets
      and sweeping a colossal twin-crescent phantom scythe
    - F22..F29: Dissolving into a swirling blood-moon & violet soul vortex
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    phase = (f / 30.0) * math.pi * 2.0
    cx = 26.0

    if f <= 7:
        mat_u = (f + 1) / 8.0
        diss_u = 0.0
        roar_u = 0.0
    elif f <= 21:
        mat_u = 1.0
        diss_u = 0.0
        roar_u = math.sin(((f - 8) / 13.0) * math.pi)
    else:
        mat_u = 1.0
        diss_u = (f - 21) / 8.0
        roar_u = 0.0

    # 1. Volumetric Blood-Moon & Violet Halo Behind the Sovereign (y = 6..46)
    halo_r = 19.0 * mat_u * (1.0 - diss_u * 0.35)
    for s in range(56):
        a = (s / 56.0) * math.pi * 2.0 + phase * 1.5
        rx = cx + math.cos(a) * halo_r
        ry = 25.0 + math.sin(a) * halo_r
        put(px, rx, ry, C_CRIMSON_BRIGHT if s % 4 == 0 else (C_VIOLET_BRIGHT if s % 2 == 0 else C_VIOLET_AURA))

    if diss_u < 0.88:
        bob_y = math.sin(phase) * 1.2 - diss_u * 6.0
        head_y = 14.0 + (1.0 - mat_u) * 10.0 + bob_y

        # 2. Towering Tattered Abyssal Shroud &Exposed Ribcage Torso (y = head_y+6 .. 47)
        max_body_y = int(min(48, head_y + 6 + 28 * mat_u))
        for y in range(int(head_y + 5), max_body_y):
            u_b = (y - (head_y + 5)) / 28.0
            if diss_u > 0.0 and ((y + f) % 3 == 0) and diss_u > 0.4:
                continue
            shroud_w = int(round((11.0 - u_b * 3.0 + math.sin(u_b * 5.0 - phase * 2.0) * 2.0) * (1.0 - diss_u * 0.5)))
            sway_x = math.sin(u_b * 3.5 - phase * 2.0) * (1.5 + diss_u * 4.0)
            for dx in range(-shroud_w, shroud_w + 1):
                px_x = cx + sway_x + dx
                if abs(dx) == shroud_w:
                    put(px, px_x, y, C_VIOLET_BRIGHT if (y + dx) % 3 == 0 else C_CRIMSON_DARK)
                elif abs(dx) >= shroud_w - 2:
                    put(px, px_x, y, C_OBSIDIAN_MID)
                else:
                    put(px, px_x, y, C_OBSIDIAN_DARK)

            # Sculpted Skeletal Ribcage & Blazing Soul-Heart inside Chest (u_b = 0.12..0.55)
            if 0.12 <= u_b <= 0.55:
                rib_y = int(y - head_y - 5)
                if rib_y % 3 == 0:
                    rib_w = int(round(5.5 * (1.0 - (u_b - 0.12) * 0.8)))
                    for rdx in range(-rib_w, rib_w + 1):
                        if abs(rdx) >= 1:
                            put(px, cx + sway_x + rdx, y, C_BONE_LIGHT if abs(rdx) < rib_w else C_BONE_MID)
                # Blazing Crimson-Violet Soul Heart inside ribcage
                if 0.22 <= u_b <= 0.42:
                    put(px, cx + sway_x, y, C_WHITE if roar_u > 0.4 else C_CRIMSON_BRIGHT)
                    put(px, cx + sway_x - 1, y, C_VIOLET_PINK)
                    put(px, cx + sway_x + 1, y, C_SPECTRAL_MINT)

        # 3. Hooded Skeletal Sovereign Skull, Horned Crown & Roaring Jaw
        for dy in range(-5, 6):
            hood_w = int(round(6.5 - abs(dy) * 0.55))
            for dx in range(-hood_w, hood_w + 1):
                if abs(dx) == hood_w or dy == -5:
                    put(px, cx + dx, head_y + dy, C_VIOLET_BRIGHT if dy < 0 else C_OBSIDIAN_MID)
                elif abs(dx) <= 3 and -2 <= dy <= 3:
                    # Inner skull face
                    put(px, cx + dx, head_y + dy, C_BONE_WHITE if dy <= 0 else C_BONE_LIGHT)
                else:
                    put(px, cx + dx, head_y + dy, C_OBSIDIAN_DARK)

        # Swept Horned Sovereign Crown atop Hood
        for sign in (-1, 1):
            for hd in range(1, 7):
                put(px, cx + sign * (3 + hd * 0.85), head_y - 3 - hd * 0.85, C_CRIMSON_BRIGHT if hd >= 5 else C_BONE_WHITE)
        put(px, cx, head_y - 6, C_WHITE)
        put(px, cx, head_y - 7, C_CRIMSON_BRIGHT)

        # Blazing Crimson Eye Sockets & Roaring Lower Jaw
        for sign in (-1, 1):
            put(px, cx + sign * 2, head_y, C_WHITE)
            put(px, cx + sign * 3, head_y, C_CRIMSON_BRIGHT)
            put(px, cx + sign * 2, head_y - 1, C_VIOLET_PINK)

        jaw_drop = int(round(1 + roar_u * 2.5))
        for dx in range(-2, 3):
            put(px, cx + dx, head_y + 3 + jaw_drop, C_BONE_LIGHT)
            if roar_u > 0.3 and abs(dx) <= 1:
                put(px, cx + dx, head_y + 2 + jaw_drop, C_CRIMSON_BRIGHT)

        # 4. Colossal Sweeping Sovereign Scythes (Crossed / Sweeping Arc across F08..F21)
        scythe_sweep = -35.0 + (f / 29.0) * 110.0
        for side in (-1, 1):
            ang = math.radians(scythe_sweep * side - 90.0)
            hx_s = cx + side * 14.0
            hy_s = head_y + 4.0 + math.sin(phase + side) * 2.0
            # Diagonal haft from Sovereign's gauntlets to top corners
            draw_line(px, cx + side * 6, head_y + 11, hx_s, hy_s - 8, C_BONE_MID)
            # Giant glowing crescent blade at top left & top right
            for bi in range(16):
                bu = bi / 15.0
                bx_s = hx_s + side * (bu * 10.0)
                by_s = (hy_s - 8) + (bu * bu) * 12.0
                put(px, bx_s, by_s, C_WHITE if bi < 10 else C_VIOLET_PINK)
                put(px, bx_s - side, by_s, C_CRIMSON_BRIGHT if side == -1 else C_SPECTRAL_MINT)
                put(px, bx_s - side * 2, by_s + 1, C_VIOLET)

    # 5. Blood-Moon Soul Vortex Dissolution (F22..F29)
    if diss_u > 0.0:
        for v_i in range(28):
            u_v = v_i / 27.0
            va = phase * 3.0 + u_v * math.pi * 4.0
            vr = (1.0 - diss_u * 0.7) * 18.0 * math.sin(u_v * math.pi)
            vx = cx + math.cos(va) * vr
            vy = 26.0 + (u_v - 0.5) * 34.0 * (1.0 - diss_u * 0.4)
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
            cell_img = fn(col_idx)
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
