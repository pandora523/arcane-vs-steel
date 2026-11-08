#!/usr/bin/env python3
"""
Build the Priestess (Seraphina) 30fps VFX Sprite Sheet (5 rows x 30 columns = 150 frames)
and 30fps Seraphim Wings Sprite Sheet (1 row x 30 columns = 30 frames).

Outputs:
1. /home/antigravity/assets/sprites/priestess_vfx.png (6240x1040, 208x208 per cell, 52x52 logical upscaled 4x NEAREST)
   - Row 0 (holy_light projectile & orbiting Ultimate stars, 30 frames):
     Sacred 8-Point Starlight Orb with rotating golden filigree points, diamond-white core, and trailing feather sparkles.
   - Row 1 (holy_spear Valkyrie Spear Sky-Strike, 30 frames):
     F00..F11: Ornate winged golden Valkyrie Spear of Light plummeting point-down from the heavens.
     F12..F29: Spear planted upright in a glowing stained-glass cathedral rose-window ground sigil with rising golden light pillars and floating feathers.
   - Row 2 (priestess Cathedral Judgment Pillar & Ophanim Halo, 30 frames):
     Towering column of golden-white divine light wrapped in rotating winged Ophanim rings and gothic cathedral arches (F00..F05 eruption, F06..F21 full rotating pillar, F22..F29 ascension dissolve).
   - Row 3 (Seraphic Apotheosis Celestial Gate / 6-Winged Archangel Mandala, 30 frames):
     Grand 30fps rotating Stained-Glass Cathedral Rose Mandala & 6-Winged Seraphim Crest (F00..F29).
   - Row 4 (priestess Radiant Smite Wave & Sanctuary Rose Seal, 30 frames):
     Expanding golden-white crescent smite wave & consecrated rose sigil (F00..F29).
2. /home/antigravity/assets/sprites/seraphim_wings.png (9600x232, 30 cols x 1 row at 320x232 per cell, 80x58 logical upscaled 4x NEAREST)
   - Silky-smooth 30fps 6-wing Seraphim flap cycle (upstroke -> apex -> power downstroke -> feather ripple -> glide recovery) with golden-tipped white primary feathers and drifting light motes.
3. Contact sheet in /home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/4f1fb80f-a88f-4496-9746-b4b9fe84f6d4/debug_priestess_30fps_vfx.png
"""

import base64
import math
import os
import zlib
import numpy as np
from PIL import Image, ImageDraw

VFX_OUT_PATH = "/home/antigravity/assets/sprites/priestess_vfx.png"
WINGS_OUT_PATH = "/home/antigravity/assets/sprites/seraphim_wings.png"
ARTIFACT_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/4f1fb80f-a88f-4496-9746-b4b9fe84f6d4"

CELL = 208
L = 52
SCALE = 4
COLS = 30
ROWS = 5

WING_L_W = 80
WING_L_H = 58
WING_CELL_W = 320
WING_CELL_H = 232

# Base64-compressed original 80x58 RGBA cell 0 of seraphim_wings.png for idempotent 30fps generation
WING_CELL0_B64 = (
    "eNrt27+rLWcVxvH0FqnzBwj2ASNiYytJKss02lhYpNBGsLIRbmUgRot0VxQEbTSkSClaXC2CjaYOhNsYQiBVimO+w/0cluO+"
    "Nzn7zMw5uZwNw+w9e/a7nnf9fNY7737mmbvX3evudfe6e9297l5P8+srzz53sT5ucpwvk95e/vrzF6+/+vLFu/dfuXj/3d8s"
    "R++7fpWxfvidF/5vjMbt+tOmx+Zjvh8++NHlfHvf+Q/3vr98f1X9sYNxGtf7p0WP/C0d/f2tX/6Pr7z2vW8u8+yeq86VTToa"
    "Z/o0m3Ttqn59233O3JqXuV8n/00bNC4ZHz38x5fWF0/pzlyW+X73xUvdXdc/+j0dNm7vp1x2u46djtad2HTwid6/8ZMfLIeY"
    "u+6c+OB67CnTsYW8o+rr9Dt1sfOffvXTSz+5as14Ui2hn8af8tY4zsm1R8bsH+//4tL2M+els9/e+/Fy8M+tcvs3vvq1S/2R"
    "kbxTOMJ3G/Mhv5v6y+a4SXH11ps/W/xDfG01h8ZR0xu/I3nJTb7cS3+3rS5nfxxFDVz7nnk9+PMbu+rvn+/8epGTrZK7xgPj"
    "bdFh2KfesnXc4ZIXfzaHfCG879z/+cIBcbUt8x/9/eX39xY5asnU4eQ0MN90HIsRvpZ+pi/QX+/zPfXDPVtguLTHIz9PTgf7"
    "9X7mw8lDt7LhuTlvcpGl7n2Gs9jJ1sUM+3dfftEx/XUL/kIX1Y3pf/T3wb/eXvCIaVhxnvLPTcRtWMOUz/GvcL73t99dfPrJ"
    "v5fr6kZzS5/NrfvC3+ct+HPjNF7jNn6fk5fc5Hc9POH6z/t/XT6Hd+I/Mo6TRQf0Fr6Js7N6GMZ8oevNzW/5zXX6N37ceOkh"
    "GR30hw+GJ9kTJz3S/RE6zP+zcXZPdrHREZ6PHz5Yztm4s9zXvJoL3+uzOlw+775zc2+/b5ywGDc5/EoNKS7gghP27ms+/e6l"
    "b337Yk+/K1fo0cieOoOts3zeXPhdv+l9Zz54Ti1uvn4Li3GT03ucif4mTufwwzLnt3f8hi8drXMenGFSO7q3XJOP9NkccZn8"
    "Rw57Un81+8PuV7f4XTppfLmte6b/TXzhDX+/7dxvjsqB4WFrdpw1gz7Fr9qBU/Rd9/CTyS3mmtPj1pun3zUWmZ0bn58nl/7E"
    "iTO86Y7vnptHzqkdyQ0r/bFrsQof/eEr4czObB/m5lPesabQfX1Oj/wBR8F9rIHJp2KhceVkuqM/NoMP3n5XjKsne/tg8cPe"
    "yRWL6bGjOal15sjn6L3fzPv45uRmXcPLOovvyYnV2pnHxGTX2UK8sK9awk+7zxh79nTZJnvmC+FgezlQ7WNX/IUOzc+86R0v"
    "kzPX/fHsb/Hh5E4+1zV+zf+Si7+oa3y234kFMZCM5reXD5pH2Nm2Y/qguhDW2Xc0H7xM7NIlvfce157rxdZIu54+uo8eZi6Q"
    "U/Dn2YeITzjFUPdUa+Y6zV76m30rLPIK+4ZLTmytKGxd64xP4NH0N2Ou49Q6Mc40OTgf1CvSf0fyHOHAWWbdUOfUa3xqq758"
    "vUY119jMdfLndV3DJ/KF9NM5rM2PL5oDLim/PS73eo7n/uSse8MpL6zhYF/4Jn8OU78PFx1u2RPrkzyjIW/mL5jWPLr4aQ58"
    "gd+KGz0/3tH7J/G/ubYyf49fGoO/i911b7Tuh5uP9SJrSlvEMc5qLGtR/GetP7jwA7WSjzjzl8bCq3GeJ+kPF8GTO6wZGB+2"
    "fLD78RU1eK0/suE4Ne8tud+UJXdP/5s2F5P8ge/oSfQJepXPw9v3yzOMR5xkjiE/8He9N99j76k/NWdyiT3rL98LIzzr9YPw"
    "zJoiZ6qJ/FG8wPxFcbsXZ8QH1Cl5L/3BRU/r9QP5U07fs4/T9871Ndjm+kb+geeL4bm+Yf2mexrz3DUPsW4/g3HJEbt4M0zh"
    "VP/DHd6ZV47gf8lLrjyHt/RZvOqPYTLfyeu2wjX9kpzkig81ip1xVPEipxzB/6wNTR+TC3svH/U9HR79rCv/U9usn83eKPvD"
    "jpeeu5fuqmtu6REvhiE88uDkhuHyzPVI/Xnep0fHu+W9qT+8CvfbS3/6UmvPc+0IJxYbYRI7N/GcMHlsGg725pNz7UPd4B97"
    "2Fru05fi0DiCugfTui85On5n7Zjr0nyPPuU9ddc649b2rp/hR1N/XZM78sGu6zf1WeZwlA+qHWptusIL9I94orpLf7Oeb4ln"
    "7nfw7JL++H8HXoP/4Viehxzle+TjKdauwue5mz7GOi77ekawJT+Yc5/PDdU264Gzdlgz6vvZz+29vqtfE7NqBmzpasaMPRNT"
    "X3vuc+OPycTb1Q+1ZG133LR42hMXvrnmK/Oz+uGsZhxZ4+TZzmLXGtxcH558C3fc43l/48396ZOP0idc8t3SP455HL33BZeR"
    "CzvTmXVpcYwDzmdsW+9fM659iHONb/qenBLeOY+j+RW5c8189kzT3nLf3Ju8BS+cuXjuT5+8xSG24VVn9+zZPg/35EzyXHGh"
    "ZxdPsze33/K6eWfmYfuB5xoHuZNPqRnzfw03we/TgZwx91J4Vn1qj4Ycvuf/3+Y6ADzrfS6+s0bfPI7ewzb3iUw/4Iv05Znu"
    "3F+wVy9sv/3cn5D8eW32aBP/TewBPLm28Oi/QOs6sdbh1vUumVNP+sy539R/nm6iXnzRfAj3rLXy0tThHvV3+p3nF/N/T54j"
    "34Z9z4/zAbE55zSvzfjeev/z+r9u87prW/7vZA8fDN+aY5/qjbbe/7z+P8K038wVt/l/cGLm1BxO7SfA1a7re6d0MveVH9XX"
    "7rnmegrzWt/n5ozHjX1kX/Zfa3QP8A=="
)

# Sacred Celestial Palette (un-inked divine gold, cathedral white, stained-glass rose/amber)
C_CORE_WHITE  = (255, 255, 252, 255)
C_PEARL_LIGHT = (255, 252, 232, 255)
C_GOLD_BRIGHT = (255, 236, 148, 255)
C_GOLD_MID    = (242, 198, 78, 255)
C_GOLD_DEEP   = (204, 148, 42, 255)
C_AMBER_SHADOW= (158, 102, 28, 255)
C_ROSE_BRIGHT = (255, 196, 212, 255)
C_ROSE_GLASS  = (232, 132, 164, 215)
C_AZURE_GLASS = (168, 224, 255, 210)
C_GOLD_GLOW   = (255, 228, 128, 155)
C_GOLD_SOFT   = (245, 204, 96, 95)
C_GOLD_FAINT  = (230, 178, 72, 50)
C_WHITE_GLOW  = (255, 252, 235, 185)


def put_px(canvas, x, y, rgba):
    x = int(round(x))
    y = int(round(y))
    h, w = canvas.shape[:2]
    # Enforce strict 2 <= x <= 49, 2 <= y <= 49 margin for 52x52 VFX cells
    if w == L and h == L:
        if not (2 <= x <= 49 and 2 <= y <= 49):
            return
    if 0 <= x < w and 0 <= y < h:
        sa = rgba[3] / 255.0
        if sa <= 0:
            return
        if sa >= 0.999 or canvas[y, x, 3] == 0:
            canvas[y, x] = rgba
        else:
            da = canvas[y, x, 3] / 255.0
            out_a = sa + da * (1.0 - sa)
            for c in range(3):
                canvas[y, x, c] = int(round((rgba[c] * sa + canvas[y, x, c] * da * (1.0 - sa)) / out_a))
            canvas[y, x, 3] = int(round(out_a * 255))


def draw_line(canvas, x0, y0, x1, y1, rgba, thickness=1):
    steps = max(abs(int(round(x1 - x0))), abs(int(round(y1 - y0))), 1) * 2
    for i in range(steps + 1):
        t = i / steps
        x = x0 + (x1 - x0) * t
        y = y0 + (y1 - y0) * t
        if thickness <= 1:
            put_px(canvas, x, y, rgba)
        else:
            r = thickness / 2.0
            for dy in range(int(-r - 1), int(r + 2)):
                for dx in range(int(-r - 1), int(r + 2)):
                    if dx * dx + dy * dy <= r * r + 0.35:
                        put_px(canvas, x + dx, y + dy, rgba)


def draw_circle(canvas, cx, cy, radius, rgba, fill=False):
    r_int = int(math.ceil(radius + 1))
    for dy in range(-r_int, r_int + 1):
        for dx in range(-r_int, r_int + 1):
            d = math.hypot(dx, dy)
            if fill:
                if d <= radius:
                    put_px(canvas, cx + dx, cy + dy, rgba)
            else:
                if abs(d - radius) <= 0.65:
                    put_px(canvas, cx + dx, cy + dy, rgba)


def draw_ellipse_ring(canvas, cx, cy, rx, ry, rgba, rot_rad=0.0, thickness=0.75):
    steps = max(36, int((rx + ry) * 6))
    for i in range(steps):
        ang = 2.0 * math.pi * i / steps
        ex = math.cos(ang) * rx
        ey = math.sin(ang) * ry
        rx_p = ex * math.cos(rot_rad) - ey * math.sin(rot_rad)
        ry_p = ex * math.sin(rot_rad) + ey * math.cos(rot_rad)
        put_px(canvas, cx + rx_p, cy + ry_p, rgba)
        if thickness > 1.0:
            put_px(canvas, cx + rx_p * 0.94, cy + ry_p * 0.94, rgba)


def draw_feather_mote(canvas, cx, cy, angle_rad, size, bright=True):
    """Draws a tiny angelic light feather / sparkle mote."""
    dx = math.cos(angle_rad)
    dy = math.sin(angle_rad)
    px = -dy
    py = dx
    c_main = C_CORE_WHITE if bright else C_GOLD_BRIGHT
    c_edge = C_GOLD_BRIGHT if bright else C_GOLD_MID
    for s in range(-size, size + 1):
        put_px(canvas, cx + dx * s, cy + dy * s, c_main if abs(s) <= 1 else c_edge)
        if abs(s) < size - 1:
            put_px(canvas, cx + dx * s + px, cy + dy * s + py, C_GOLD_GLOW)


def draw_angel_feather(canvas, cx, cy, tilt_rad=0.3, alpha_scale=1.0, bright=True):
    """Draws an ornate ascending Golden Angel Feather with pearl quill and golden barbs."""
    def sc(col):
        return (col[0], col[1], col[2], int(round(col[3] * alpha_scale)))

    dx = math.cos(tilt_rad)
    dy = math.sin(tilt_rad)
    nx = -dy
    ny = dx
    # Quill shaft (-3..+3) and asymmetric golden feather barbs
    for s in range(-3, 4):
        qx = cx + dx * s
        qy = cy + dy * s
        put_px(canvas, qx, qy, sc(C_CORE_WHITE if s <= 1 else C_GOLD_BRIGHT))
        if -2 <= s <= 2:
            put_px(canvas, qx + nx, qy + ny, sc(C_GOLD_BRIGHT if bright else C_GOLD_MID))
            put_px(canvas, qx - nx, qy - ny, sc(C_PEARL_LIGHT if s <= 0 else C_GOLD_DEEP))
        if -1 <= s <= 1:
            put_px(canvas, qx + nx * 2, qy + ny * 2, sc(C_GOLD_GLOW))


def draw_four_point_star_mote(canvas, cx, cy, size=2, rot_rad=0.0, rose_tint=False):
    """Draws a crisp 4-point starlight mote."""
    put_px(canvas, cx, cy, C_CORE_WHITE)
    c_ray = C_ROSE_BRIGHT if rose_tint else C_GOLD_BRIGHT
    c_tip = C_ROSE_GLASS if rose_tint else C_GOLD_MID
    for k in range(4):
        ang = rot_rad + k * (math.pi / 2.0)
        for d in range(1, size + 1):
            px = cx + math.cos(ang) * d
            py = cy + math.sin(ang) * d
            put_px(canvas, px, py, c_ray if d < size else c_tip)


def draw_starburst(canvas, cx, cy, r_long, r_short, rot_rad=0.0, num_points=8):
    """Draws an 8-point sacred starburst with golden filigree and diamond-white core."""
    for i in range(num_points):
        ang = rot_rad + i * (2.0 * math.pi / num_points)
        r = r_long if (i % 2 == 0) else r_short
        col = C_CORE_WHITE if (i % 2 == 0) else C_GOLD_BRIGHT
        draw_line(canvas, cx, cy, cx + math.cos(ang) * r, cy + math.sin(ang) * r, C_GOLD_MID, thickness=1.5 if i % 2 == 0 else 1)
        draw_line(canvas, cx, cy, cx + math.cos(ang) * (r * 0.85), cy + math.sin(ang) * (r * 0.85), col, thickness=1)


# ==============================================================================
# ROW 0: holy_light projectile & orbiting Ultimate stars (30 frames)
# Sacred 8-Point Starlight Orb with rotating golden filigree points,
# diamond-white core, and trailing feather sparkles.
# ==============================================================================
def build_row0_holy_light():
    frames = []
    for f in range(COLS):
        canvas = np.zeros((L, L, 4), dtype=np.uint8)
        phase = 2.0 * math.pi * f / COLS
        cx, cy = 28.0 + math.sin(phase) * 1.0, 26.0 + math.cos(phase * 2) * 1.0

        # Trailing sacred light wake & feather sparkles to the left (x=4..22)
        for t_idx in range(6):
            tx = cx - 4.0 - t_idx * 3.4 - ((f * 0.9) % 3.4)
            if tx < 3:
                tx += 20.4
            ty = cy + math.sin(phase * 2.0 + t_idx * 1.3) * (1.5 + t_idx * 0.35)
            alpha = max(35, int(215 - (cx - tx) * 8))
            put_px(canvas, tx, ty, (255, 236, 148, alpha))
            put_px(canvas, tx + 1, ty, (255, 255, 252, min(255, alpha + 30)))
            if t_idx % 2 == 0:
                put_px(canvas, tx, ty - 1, (242, 198, 78, alpha // 2))
                put_px(canvas, tx, ty + 1, (242, 198, 78, alpha // 2))

        # Soft radial halo
        r_pulse = 10.5 + 1.5 * math.sin(phase * 2.0)
        draw_circle(canvas, cx, cy, r_pulse + 2.5, C_GOLD_FAINT, fill=True)
        draw_circle(canvas, cx, cy, r_pulse, C_GOLD_SOFT, fill=True)
        draw_circle(canvas, cx, cy, r_pulse * 0.68, C_GOLD_GLOW, fill=True)

        # Rotating filigree outer ring with 4 cardinal beads
        draw_circle(canvas, cx, cy, 8.5 + 0.6 * math.cos(phase), C_GOLD_MID, fill=False)
        for b in range(8):
            bang = -phase + b * (math.pi / 4.0)
            bx = cx + math.cos(bang) * 8.8
            by = cy + math.sin(bang) * 8.8
            put_px(canvas, bx, by, C_PEARL_LIGHT if b % 2 == 0 else C_GOLD_DEEP)

        # Rotating 8-point sacred starlight spikes
        r_major = 15.0 + 2.0 * math.sin(phase * 2.0)
        r_minor = 9.5 + 1.2 * math.cos(phase * 2.0)
        draw_starburst(canvas, cx, cy, r_major, r_minor, rot_rad=phase, num_points=8)

        # Counter-rotating inner stained-glass rose diamond
        for d_idx in range(4):
            dang = -phase * 1.5 + d_idx * (math.pi / 2.0)
            put_px(canvas, cx + math.cos(dang) * 5.0, cy + math.sin(dang) * 5.0, C_ROSE_BRIGHT)

        # Diamond-white core
        draw_circle(canvas, cx, cy, 4.2, C_GOLD_BRIGHT, fill=True)
        draw_circle(canvas, cx, cy, 2.8, C_CORE_WHITE, fill=True)

        # Orbiting feather sparkles
        for m in range(3):
            mang = phase * 2.0 + m * (2.0 * math.pi / 3.0)
            mx = cx + math.cos(mang) * 12.5
            my = cy + math.sin(mang) * 10.5
            draw_feather_mote(canvas, mx, my, mang + math.pi / 2, 2, bright=(m == f % 3))

        frames.append(canvas)
    return frames


# ==============================================================================
# ROW 1: holy_spear Valkyrie Spear Sky-Strike (30 frames)
# Pass #4 Upgrade:
# - F00..F11: Descending Valkyrie Spear with wider Golden Seraphim Winged Crossguards
#             and trailing helical starlight ribbons.
# - F12..F29: Impact beam (especially F12..F25) enriched with ascending golden
#             angel feathers and a double cathedral ground halo!
# ==============================================================================
def draw_valkyrie_spear(canvas, cx, tip_y, length=31, wing_span=13.5, alpha_scale=1.0):
    """Draws an ornate Valkyrie Spear with wide Golden Seraphim Winged Crossguards."""
    def sc(col):
        return (col[0], col[1], col[2], int(round(col[3] * alpha_scale)))

    pommel_y = max(3, tip_y - length)
    guard_y = max(7, tip_y - 10)

    # Glowing aura behind spear shaft
    draw_line(canvas, cx, pommel_y, cx, tip_y, sc(C_GOLD_GLOW), thickness=3)

    # Golden shaft with pearl core highlight and rose-gold ring bands
    draw_line(canvas, cx - 1, pommel_y + 2, cx - 1, guard_y, sc(C_GOLD_DEEP), thickness=1)
    draw_line(canvas, cx + 1, pommel_y + 2, cx + 1, guard_y, sc(C_GOLD_MID), thickness=1)
    draw_line(canvas, cx, pommel_y, cx, tip_y - 1, sc(C_CORE_WHITE), thickness=1)

    # Diamond Valkyrie spearhead below guard (guard_y to tip_y)
    for dy in range(0, int(tip_y - guard_y) + 1):
        y = guard_y + dy
        t = 1.0 - (dy / max(1.0, (tip_y - guard_y)))
        half_w = int(round(t * 3.6))
        for dx in range(-half_w, half_w + 1):
            if dx == 0:
                put_px(canvas, cx + dx, y, sc(C_CORE_WHITE))
            elif abs(dx) == half_w:
                put_px(canvas, cx + dx, y, sc(C_GOLD_MID))
            else:
                put_px(canvas, cx + dx, y, sc(C_GOLD_BRIGHT))

    # Wide Multi-Tiered Golden Seraphim Winged Crossguard at guard_y
    w_int = int(round(wing_span))
    for s in range(1, w_int + 1):
        u_w = s / max(1.0, float(wing_span))
        # Sweeping Seraphim wing arch curving upward then flaring out
        arch_lift = int(round((u_w ** 0.8) * 6.5 - (u_w ** 2.2) * 1.5))
        wy = max(3, guard_y - arch_lift)
        for side in (-1, 1):
            wx = cx + side * s
            # Leading white-gold wing ridge
            put_px(canvas, wx, wy, sc(C_CORE_WHITE if s <= w_int - 2 else C_GOLD_BRIGHT))
            # Secondary golden covert layer
            put_px(canvas, wx, wy + 1, sc(C_GOLD_BRIGHT if s % 2 == 0 else C_PEARL_LIGHT))
            put_px(canvas, wx, wy + 2, sc(C_GOLD_MID))

            # Distinct layered primary Seraphim feathers hanging & fanning from the crossguard
            if s in (3, 5, 7, 9, 11, 13):
                f_len = 5 - (s // 4)
                for fd in range(1, f_len + 1):
                    fx = wx + side * (fd // 2)
                    fy = wy + 2 + fd
                    col_f = C_CORE_WHITE if fd == f_len else (C_GOLD_BRIGHT if fd == 1 else C_PEARL_LIGHT)
                    put_px(canvas, fx, fy, sc(col_f))
                    put_px(canvas, fx - side, fy, sc(C_GOLD_DEEP))

    # Central Cathedral Rose Jewel at the Crossguard Nexus
    for dy in range(-2, 3):
        for dx in range(-2, 3):
            if abs(dx) + abs(dy) <= 2:
                col_g = C_CORE_WHITE if (dx == 0 and dy == 0) else (C_ROSE_BRIGHT if abs(dx) + abs(dy) == 1 else C_GOLD_BRIGHT)
                put_px(canvas, cx + dx, guard_y + dy, sc(col_g))

    # Pommel Halo Ring near top of shaft
    if pommel_y >= 4:
        draw_circle(canvas, cx, pommel_y + 2, 3.2, sc(C_GOLD_BRIGHT), fill=False)
        put_px(canvas, cx, pommel_y, sc(C_CORE_WHITE))


def build_row1_holy_spear():
    frames = []
    gy = 43.0
    cx = 26.0
    for f in range(COLS):
        canvas = np.zeros((L, L, 4), dtype=np.uint8)
        if f < 12:
            # F00..F11: Plummeting from heavens toward ground at gy=43
            t = f / 11.0
            tip_y = 14.0 + (gy - 14.0) * (t ** 1.2)
            guard_y = max(7.0, tip_y - 10.0)

            # Target preview double cathedral rose-sigil expanding on ground as spear approaches
            sigil_rx = 4.0 + t * 12.0
            sigil_ry = 1.4 + t * 3.0
            draw_ellipse_ring(canvas, cx, gy, sigil_rx, sigil_ry, C_GOLD_SOFT, rot_rad=0.0)
            draw_ellipse_ring(canvas, cx, gy, sigil_rx * 0.62, sigil_ry * 0.62, C_ROSE_GLASS, rot_rad=0.0)

            # Trailing Helical Starlight Ribbons streaming upward from the winged crossguard (y = 3..guard_y)
            for ry in range(3, int(guard_y) + 1):
                u_rib = (guard_y - ry) / max(1.0, guard_y - 3.0)
                amp = 4.5 + u_rib * 7.5
                ang_r = ry * 0.28 - f * 0.65
                rx_a = cx + math.sin(ang_r) * amp
                rx_b = cx - math.sin(ang_r) * amp
                # Ribbon A: Golden-White Starlight Ribbon
                put_px(canvas, rx_a, ry, C_CORE_WHITE)
                put_px(canvas, rx_a - 1, ry, C_GOLD_BRIGHT)
                put_px(canvas, rx_a + 1, ry, C_GOLD_GLOW)
                # Ribbon B: Rose-Gold Celestial Ribbon
                put_px(canvas, rx_b, ry, C_ROSE_BRIGHT)
                put_px(canvas, rx_b + 1, ry, C_GOLD_MID)
                # Periodic 4-point starlight motes along the ribbons
                if (ry + f) % 6 == 0 and ry >= 5:
                    draw_four_point_star_mote(canvas, rx_a, ry, size=2, rot_rad=0.0, rose_tint=False)

            # Speed streaks / descending heaven beam behind spear
            for s_idx in range(5):
                sx = cx + (s_idx - 2) * 3.0
                sy0 = max(3, tip_y - 32 - s_idx * 2)
                sy1 = max(4, tip_y - 6)
                draw_line(canvas, sx, sy0, sx, sy1, C_GOLD_SOFT if s_idx != 2 else C_WHITE_GLOW, thickness=1)

            # Wider Golden Seraphim Winged Crossguard (wing_span = 13.5..15.0)
            draw_valkyrie_spear(canvas, cx, tip_y, length=29, wing_span=13.0 + math.sin(t * math.pi) * 2.0)

            # Bright starlight flash at spear tip
            draw_starburst(canvas, cx, tip_y, 5.5 + t * 3.5, 2.8 + t * 1.8, rot_rad=f * 0.4, num_points=8)
        else:
            # F12..F29: Impact beam (F12..F25) + Double Cathedral Ground Halo + Ascending Golden Angel Feathers
            imp_f = f - 12
            imp_t = imp_f / 17.0
            fade = 1.0 if imp_f <= 13 else max(0.22, 1.0 - (imp_f - 13) / 5.0)

            def sc(col):
                return (col[0], col[1], col[2], int(round(col[3] * fade)))

            # 1. Double Cathedral Ground Halo at gy=43 (strictly within y <= 49)
            rx_outer = min(21.5, 15.0 + imp_t * 6.5)
            ry_outer = min(5.2, 3.8 + imp_t * 1.4)
            rx_inner = rx_outer * 0.62
            ry_inner = ry_outer * 0.62

            # Outer Cathedral Halo (beveled gold + rose glass cusps)
            draw_ellipse_ring(canvas, cx, gy, rx_outer + 0.8, ry_outer + 0.4, sc(C_GOLD_DEEP), thickness=1.0)
            draw_ellipse_ring(canvas, cx, gy, rx_outer, ry_outer, sc(C_GOLD_BRIGHT), thickness=1.5)
            for cusp in range(12):
                c_ang = imp_f * 0.14 + cusp * (math.pi / 6.0)
                cx_p = cx + math.cos(c_ang) * (rx_outer + 1.2)
                cy_p = gy + math.sin(c_ang) * (ry_outer + 0.6)
                put_px(canvas, cx_p, cy_p, sc(C_CORE_WHITE if cusp % 3 == 0 else C_ROSE_BRIGHT))

            # Inner Cathedral Sanctuary Halo (counter-rotating rose-white ring + 8 gothic spokes)
            draw_ellipse_ring(canvas, cx, gy, rx_inner, ry_inner, sc(C_ROSE_BRIGHT), thickness=1.5)
            draw_ellipse_ring(canvas, cx, gy, rx_inner * 0.58, ry_inner * 0.58, sc(C_CORE_WHITE), thickness=1.0)
            for sp in range(8):
                ang = -imp_f * 0.18 + sp * (math.pi / 4.0)
                sx0 = cx + math.cos(ang) * (rx_inner * 0.55)
                sy0 = gy + math.sin(ang) * (ry_inner * 0.55)
                sx1 = cx + math.cos(ang) * rx_outer
                sy1 = gy + math.sin(ang) * ry_outer
                draw_line(canvas, sx0, sy0, sx1, sy1, sc(C_GOLD_BRIGHT if sp % 2 == 0 else C_ROSE_GLASS), thickness=1)
                put_px(canvas, sx1, sy1, sc(C_CORE_WHITE))

            # 2. Enriched Impact Beam (F12..F25 prominent cathedral light shaft with ascending ring pulses)
            pillar_w = max(2.5, (11.5 - imp_t * 6.5))
            for py in range(3, int(gy) + 1):
                flute = math.cos((py - imp_f * 2.2) * 0.35)
                for dx in range(-int(pillar_w) - 1, int(pillar_w) + 2):
                    dist_norm = abs(dx) / pillar_w
                    if dist_norm <= 0.38:
                        put_px(canvas, cx + dx, py, sc(C_CORE_WHITE if flute > -0.2 else C_PEARL_LIGHT))
                    elif dist_norm <= 0.72:
                        put_px(canvas, cx + dx, py, sc(C_GOLD_BRIGHT if dx % 2 == 0 else C_ROSE_GLASS))
                    elif dist_norm <= 1.0:
                        put_px(canvas, cx + dx, py, sc(C_GOLD_GLOW))
                    else:
                        put_px(canvas, cx + dx, py, sc(C_GOLD_FAINT))

            # Ascending ring pulses up the impact beam during F12..F25
            if imp_f <= 13:
                for p_idx in range(2):
                    ring_y = gy - ((imp_f * 2.8 + p_idx * 16.0) % 36.0)
                    if 5 <= ring_y <= gy - 2:
                        draw_ellipse_ring(canvas, cx, ring_y, pillar_w + 3.0, 2.2, sc(C_CORE_WHITE), thickness=1.0)
                        draw_ellipse_ring(canvas, cx, ring_y + 1, pillar_w + 3.5, 2.4, sc(C_GOLD_BRIGHT), thickness=1.0)

            # Impact shockwave starburst on F12..F16
            if imp_f <= 4:
                burst_r = 11.0 + imp_f * 2.5
                draw_starburst(canvas, cx, gy - 3, burst_r, burst_r * 0.55, rot_rad=imp_f * 0.3, num_points=8)

            # 3. Planted Valkyrie Spear with wide Golden Seraphim Winged Crossguard
            draw_valkyrie_spear(canvas, cx, gy, length=33, wing_span=14.0, alpha_scale=fade)

            # 4. Ascending Golden Angel Feathers spiraling around the impact beam
            for m in range(8):
                m_phase = imp_t * 2.6 + m * 0.785
                rad_m = 7.5 + (m % 3) * 4.2
                mx = cx + math.sin(m_phase * 1.8 + m) * rad_m
                my = gy - 4.0 - ((imp_f * 2.0 + m * 4.5) % 34.0)
                if 6 <= my <= gy - 3:
                    draw_angel_feather(canvas, mx, my, tilt_rad=-0.9 + 0.3 * math.sin(m_phase), alpha_scale=fade, bright=(m % 2 == 0))

        frames.append(canvas)
    return frames


# ==============================================================================
# ROW 2: priestess Cathedral Judgment Pillar & Ophanim Halo (30 frames)
# Pass #4 Upgrade:
# - Vertical rose-gold & pure-white stained-glass light fluting inside the pillar core
# - Spiraling golden seraphim ribbons wrapping the column
# - Ornate 8-point Cathedral Sanctuary Seal at the base (y = 43..47)
# ==============================================================================
def build_row2_judgment_pillar():
    frames = []
    cx = 26.0
    base_y = 45.0  # Base seal spans y = 42..48 (centered on y = 45, covering y = 43..47 cleanly)
    top_y = 3.0
    for f in range(COLS):
        canvas = np.zeros((L, L, 4), dtype=np.uint8)
        phase = 2.0 * math.pi * f / COLS

        if f <= 5:
            erupt_t = (f + 1) / 6.0
            cur_top = base_y - (base_y - top_y) * (erupt_t ** 0.75)
            col_radius = 4.5 + erupt_t * 8.0
            alpha_mult = 0.78 + 0.22 * erupt_t
        elif f <= 21:
            cur_top = top_y
            pulse = math.sin((f - 6) * math.pi / 4.0)
            col_radius = 12.0 + pulse * 1.3
            alpha_mult = 1.0
        else:
            diss_t = (f - 21) / 8.0
            cur_top = top_y
            col_radius = max(3.0, 12.0 * (1.0 - diss_t * 0.75))
            alpha_mult = max(0.24, 1.0 - diss_t * 0.78)

        def sc(col):
            return (col[0], col[1], col[2], int(round(col[3] * alpha_mult)))

        # 1. Ornate 8-Point Cathedral Sanctuary Seal at the Base (y = 43..47, centered at base_y = 45.0)
        seal_rx = min(21.0, col_radius * 1.52 + 3.5)
        seal_ry = 3.5  # spans y = 41.5 .. 48.5 (strictly <= 49)
        draw_ellipse_ring(canvas, cx, base_y, seal_rx + 0.8, seal_ry + 0.4, sc(C_GOLD_DEEP), thickness=1.0)
        draw_ellipse_ring(canvas, cx, base_y, seal_rx, seal_ry, sc(C_GOLD_BRIGHT), thickness=1.5)
        draw_ellipse_ring(canvas, cx, base_y, seal_rx * 0.68, seal_ry * 0.68, sc(C_ROSE_BRIGHT), thickness=1.0)
        draw_ellipse_ring(canvas, cx, base_y, seal_rx * 0.38, seal_ry * 0.38, sc(C_CORE_WHITE), thickness=1.0)

        # 8-Point Star-Octagram & Cathedral Spokes on the ground plane (y = 42..48)
        pts_8 = []
        for sp in range(8):
            ang = phase + sp * (math.pi / 4.0)
            px_s = cx + math.cos(ang) * (seal_rx * 1.04)
            py_s = base_y + math.sin(ang) * (seal_ry * 1.04)
            pts_8.append((px_s, py_s))

        # Octagram star chords connecting every 3rd vertex
        for sp in range(8):
            x0, y0 = pts_8[sp]
            x1, y1 = pts_8[(sp + 3) % 8]
            draw_line(canvas, x0, y0, x1, y1, sc(C_GOLD_MID if sp % 2 == 0 else C_ROSE_GLASS), thickness=1)

        # 8 radial spokes & diamond star tips
        for sp, (px_s, py_s) in enumerate(pts_8):
            draw_line(canvas, cx, base_y, px_s, py_s, sc(C_CORE_WHITE if sp % 2 == 0 else C_GOLD_BRIGHT), thickness=1)
            put_px(canvas, px_s, py_s, sc(C_CORE_WHITE))
            put_px(canvas, px_s, py_s - 1, sc(C_ROSE_BRIGHT if sp % 2 == 0 else C_GOLD_BRIGHT))

        # 2. Towering Vertical Column with Rose-Gold & Pure-White Stained-Glass Light Fluting
        r_int = int(math.ceil(col_radius))
        for y in range(int(cur_top), int(base_y) + 1):
            v_ratio = (y - cur_top) / max(1.0, (base_y - cur_top))
            flare = 1.0 + 0.16 * math.cos(v_ratio * math.pi * 2.0)
            eff_r = col_radius * flare
            for dx in range(-r_int - 2, r_int + 3):
                adx = abs(dx)
                if adx <= eff_r:
                    norm = adx / max(1.0, eff_r)
                    # Multi-channel vertical cathedral stained-glass fluting rotating smoothly
                    flute_angle = (dx / max(1.0, eff_r)) * math.pi * 3.0 + phase * 2.0
                    flute_val = math.cos(flute_angle)
                    is_mullion = abs(math.sin(flute_angle)) < 0.22
                    if norm < 0.26:
                        put_px(canvas, cx + dx, y, sc(C_CORE_WHITE))
                    elif is_mullion and norm < 0.85:
                        # Golden lead-came mullion separating the vertical stained-glass flutes
                        put_px(canvas, cx + dx, y, sc(C_GOLD_BRIGHT if (y % 4 != 0) else C_CORE_WHITE))
                    elif norm < 0.56:
                        # Alternating Pure-White and Rose-Gold inner stained-glass flutes
                        col_flute = C_CORE_WHITE if flute_val > 0 else C_ROSE_BRIGHT
                        put_px(canvas, cx + dx, y, sc(col_flute))
                    elif norm < 0.86:
                        # Outer stained-glass flutes (Rose-Gold & Celestial Gold-Pearl)
                        col_outer = C_ROSE_GLASS if flute_val > 0 else C_PEARL_LIGHT
                        put_px(canvas, cx + dx, y, sc(col_outer))
                    else:
                        put_px(canvas, cx + dx, y, sc(C_GOLD_MID if y % 2 == 0 else C_GOLD_GLOW))

        # 3. Gothic Cathedral Tracery Lancet Arches inside the pillar
        if base_y - cur_top > 20:
            for arch_i in range(-1, 2):
                arch_cx = cx + math.sin(phase + arch_i * 2.09) * (col_radius * 0.52)
                arch_top = cur_top + 6
                arch_bot = base_y - 3
                draw_line(canvas, arch_cx, arch_top, arch_cx, arch_bot, sc(C_GOLD_DEEP), thickness=1)
                draw_line(canvas, arch_cx - 3, arch_top + 5, arch_cx, arch_top, sc(C_CORE_WHITE), thickness=1)
                draw_line(canvas, arch_cx + 3, arch_top + 5, arch_cx, arch_top, sc(C_CORE_WHITE), thickness=1)

        # 4. Double Spiraling Golden Seraphim Ribbons helically wrapping the pillar
        if base_y - cur_top > 10:
            for y in range(int(cur_top + 2), int(base_y - 1)):
                v_ratio = (y - cur_top) / max(1.0, (base_y - cur_top))
                eff_r = col_radius * (1.0 + 0.16 * math.cos(v_ratio * math.pi * 2.0))
                rib_span = min(21.0, eff_r * 1.18 + 1.5)
                for strand in (0, 1):
                    r_ang = (y - base_y) * 0.24 - phase * 2.0 + strand * math.pi
                    rx_rib = cx + math.sin(r_ang) * rib_span
                    front = math.cos(r_ang) >= -0.15
                    if front:
                        put_px(canvas, rx_rib, y, sc(C_CORE_WHITE if strand == 0 else C_ROSE_BRIGHT))
                        put_px(canvas, rx_rib - 1, y, sc(C_GOLD_BRIGHT))
                        put_px(canvas, rx_rib + 1, y, sc(C_GOLD_BRIGHT))
                        put_px(canvas, rx_rib - 2, y, sc(C_GOLD_DEEP))
                        put_px(canvas, rx_rib + 2, y, sc(C_GOLD_MID))
                    else:
                        # Subtle edge glimpse when ribbon passes behind column
                        if abs(rx_rib - cx) > eff_r * 0.9:
                            put_px(canvas, rx_rib, y, sc(C_GOLD_MID))

        # 5. Rotating Winged Ophanim Rings wrapping the pillar at 2 altitudes
        ring_altitudes = [
            cur_top + (base_y - cur_top) * 0.33,
            cur_top + (base_y - cur_top) * 0.66,
        ]
        for idx, ry_pos in enumerate(ring_altitudes):
            if ry_pos < cur_top + 4 or ry_pos > base_y - 3:
                continue
            tilt = 0.20 * math.sin(phase + idx * math.pi)
            orx = min(20.5, col_radius * 1.38 + 2.5)
            ory = 3.5
            draw_ellipse_ring(canvas, cx, ry_pos, orx, ory, sc(C_GOLD_DEEP), rot_rad=tilt, thickness=1.5)
            draw_ellipse_ring(canvas, cx, ry_pos, orx * 0.92, ory * 0.92, sc(C_CORE_WHITE), rot_rad=tilt, thickness=1.0)
            for e_i in range(6):
                e_ang = phase * (1.5 if idx == 0 else -1.5) + e_i * (math.pi / 3.0)
                ex = math.cos(e_ang) * orx
                ey = math.sin(e_ang) * ory
                rx_p = ex * math.cos(tilt) - ey * math.sin(tilt)
                ry_p = ex * math.sin(tilt) + ey * math.cos(tilt)
                put_px(canvas, cx + rx_p, ry_pos + ry_p, sc(C_CORE_WHITE))
                put_px(canvas, cx + rx_p, ry_pos + ry_p - 1, sc(C_ROSE_BRIGHT if e_i % 2 == 0 else C_GOLD_BRIGHT))

            # Mini cherubim wing tips flanking each Ophanim ring
            for side in (-1, 1):
                wx = min(48, max(3, cx + side * (orx + 1.5)))
                wy = ry_pos - 2.0 + math.sin(phase * 2.0 + idx) * 1.5
                draw_line(canvas, cx + side * (orx - 1), ry_pos, wx, wy - 2, sc(C_PEARL_LIGHT), thickness=1)
                draw_line(canvas, cx + side * (orx - 1), ry_pos + 1, wx, wy + 1, sc(C_GOLD_BRIGHT), thickness=1)

        # 6. Crown starburst & ascending golden angel feathers
        draw_starburst(canvas, cx, max(5.0, cur_top + 2.5), 6.0, 3.2, rot_rad=phase, num_points=8)
        for m in range(5):
            my = base_y - 2.0 - ((f * 2.1 + m * 8.0) % max(8.0, (base_y - cur_top - 4.0)))
            mx = cx + math.sin(phase * 2.0 + m * 1.4) * min(19.0, col_radius + 4.0)
            draw_angel_feather(canvas, mx, my, tilt_rad=phase * 0.5 + m, alpha_scale=alpha_mult, bright=(m % 2 == 0))

        frames.append(canvas)
    return frames


# ==============================================================================
# ROW 3: Seraphic Apotheosis Celestial Gate / 6-Winged Archangel Mandala (30 frames)
# Pass #4 Upgrade:
# - Intricate 12-spoke gothic cathedral rose-window tracery (pointed trefoil arches,
#   rosette mullions, alternating rose/azure stained glass)
# - Orbiting 4-point starlight motes
# - Strictly within 2 <= x <= 49, 2 <= y <= 49
# ==============================================================================
def build_row3_celestial_gate():
    frames = []
    cx, cy = 26.0, 26.0
    for f in range(COLS):
        canvas = np.zeros((L, L, 4), dtype=np.uint8)
        phase = 2.0 * math.pi * f / COLS
        pulse = math.sin(phase * 2.0)

        # 1. Outer soft divine aura (max radius 21.5 -> 26 +- 21.5 = 4.5..47.5, strictly inside 2..49)
        draw_circle(canvas, cx, cy, 21.5, C_GOLD_FAINT, fill=True)
        draw_circle(canvas, cx, cy, 18.5 + pulse * 0.6, C_GOLD_SOFT, fill=True)

        # 2. 6-Winged Seraphim Crest radiating behind the mandala (3 pairs: upper, mid, lower; max span 21.5)
        flap = math.sin(phase * 2.0)
        wing_pairs = [
            (-0.62 + 0.08 * flap, 21.0, C_PEARL_LIGHT),  # Upper Archangel pair
            (0.02 + 0.10 * flap, 21.5, C_GOLD_BRIGHT),   # Middle Seraph pair
            (0.58 - 0.06 * flap, 19.5, C_GOLD_MID),      # Lower Cherub pair
        ]
        for base_ang, span, w_col in wing_pairs:
            for side in (-1, 1):
                ang = base_ang if side == 1 else (math.pi - base_ang)
                tip_x = cx + math.cos(ang) * span
                tip_y = cy + math.sin(ang) * span
                draw_line(canvas, cx, cy, tip_x, tip_y, w_col, thickness=2)
                for pf in range(1, 5):
                    frac = 0.42 + pf * 0.12
                    bx = cx + math.cos(ang) * (span * frac)
                    by = cy + math.sin(ang) * (span * frac)
                    f_ang = ang + side * (0.28 + pf * 0.06)
                    fx = bx + math.cos(f_ang) * (4.5 - pf * 0.4)
                    fy = by + math.sin(f_ang) * (4.5 - pf * 0.4)
                    draw_line(canvas, bx, by, fx, fy, C_CORE_WHITE if pf % 2 == 0 else C_GOLD_BRIGHT, thickness=1)

        # 3. Intricate 12-Spoke Gothic Cathedral Rose-Window Tracery
        num_petals = 12
        r_outer = 17.2 + pulse * 0.4
        r_mid_arch = 13.0
        r_inner = 7.2
        for p in range(num_petals):
            pang = phase + p * (2.0 * math.pi / num_petals)
            pang_next = phase + (p + 1) * (2.0 * math.pi / num_petals)
            pang_mid = 0.5 * (pang + pang_next)

            # Rich stained-glass lancet & trefoil fill (alternating Cathedral Rose and Celestial Azure)
            glass_col = C_ROSE_GLASS if (p % 2 == 0) else C_AZURE_GLASS
            glass_hi = C_ROSE_BRIGHT if (p % 2 == 0) else C_CORE_WHITE
            for rad in (9.2, 11.2, 14.2, 15.8):
                gx = cx + math.cos(pang_mid) * rad
                gy = cy + math.sin(pang_mid) * rad
                put_px(canvas, gx, gy, glass_col)
                if rad in (11.2, 14.2):
                    # Trefoil rosette jewel inside each stained-glass bay
                    put_px(canvas, gx, gy, glass_hi if rad == 14.2 else glass_col)

            # 12 Primary Golden Gothic Tracery Spokes (r_inner -> r_outer)
            sx0 = cx + math.cos(pang) * r_inner
            sy0 = cy + math.sin(pang) * r_inner
            sx_mid = cx + math.cos(pang) * r_mid_arch
            sy_mid = cy + math.sin(pang) * r_mid_arch
            sx1 = cx + math.cos(pang) * r_outer
            sy1 = cy + math.sin(pang) * r_outer
            draw_line(canvas, sx0, sy0, sx1, sy1, C_GOLD_BRIGHT if p % 2 == 0 else C_GOLD_MID, thickness=1)
            # Spoke mullion boss node
            put_px(canvas, sx_mid, sy_mid, C_CORE_WHITE)

            # Inner Gothic Pointed Trefoil Arch connecting adjacent spokes at r_mid_arch
            sx_mid_next = cx + math.cos(pang_next) * r_mid_arch
            sy_mid_next = cy + math.sin(pang_next) * r_mid_arch
            arch_apex_in_x = cx + math.cos(pang_mid) * (r_mid_arch + 1.6)
            arch_apex_in_y = cy + math.sin(pang_mid) * (r_mid_arch + 1.6)
            draw_line(canvas, sx_mid, sy_mid, arch_apex_in_x, arch_apex_in_y, C_GOLD_MID, thickness=1)
            draw_line(canvas, sx_mid_next, sy_mid_next, arch_apex_in_x, arch_apex_in_y, C_GOLD_MID, thickness=1)

            # Outer Pointed Cathedral Lancet Arch & Finial Cusp
            sx1_next = cx + math.cos(pang_next) * r_outer
            sy1_next = cy + math.sin(pang_next) * r_outer
            mx = cx + math.cos(pang_mid) * (r_outer + 1.8)
            my = cy + math.sin(pang_mid) * (r_outer + 1.8)
            draw_line(canvas, sx1, sy1, mx, my, C_GOLD_BRIGHT, thickness=1)
            draw_line(canvas, sx1_next, sy1_next, mx, my, C_GOLD_BRIGHT, thickness=1)
            put_px(canvas, mx, my, C_CORE_WHITE)

        # 4. Concentric Golden Mandala Rings & Counter-Rotating Central Sacred Star
        draw_circle(canvas, cx, cy, r_outer + 0.8, C_GOLD_DEEP, fill=False)
        draw_circle(canvas, cx, cy, r_outer, C_GOLD_BRIGHT, fill=False)
        draw_circle(canvas, cx, cy, r_mid_arch, C_PEARL_LIGHT, fill=False)
        draw_circle(canvas, cx, cy, r_inner, C_GOLD_MID, fill=False)

        draw_starburst(canvas, cx, cy, 10.5 + pulse * 0.6, 6.5, rot_rad=-phase * 1.5, num_points=8)
        draw_circle(canvas, cx, cy, 3.6, C_CORE_WHITE, fill=True)
        draw_circle(canvas, cx, cy, 2.0, C_GOLD_BRIGHT, fill=False)

        # 5. Orbiting 4-Point Starlight Motes (strictly inside 2 <= x <= 49, 2 <= y <= 49)
        for m in range(8):
            m_ang = -phase * 1.25 + m * (math.pi / 4.0)
            m_rad = 20.0 + 0.6 * math.sin(phase * 2.0 + m)
            mx = cx + math.cos(m_ang) * m_rad
            my = cy + math.sin(m_ang) * m_rad
            draw_four_point_star_mote(
                canvas,
                mx,
                my,
                size=2 if (m + f) % 2 == 0 else 1,
                rot_rad=0.0,
                rose_tint=(m % 2 == 1),
            )

        frames.append(canvas)
    return frames


# ==============================================================================
# ROW 4: priestess Radiant Smite Wave & Sanctuary Rose Seal (30 frames)
# Expanding golden-white crescent smite wave & consecrated rose sigil (F00..F29)
# Strictly within 2 <= x <= 49, 2 <= y <= 49
# ==============================================================================
def build_row4_smite_wave():
    frames = []
    for f in range(COLS):
        canvas = np.zeros((L, L, 4), dtype=np.uint8)
        t = f / (COLS - 1.0)
        phase = 2.0 * math.pi * f / COLS

        alpha_mult = 1.0 if f < 22 else max(0.22, 1.0 - (f - 21) / 9.0)

        def sc(col):
            return (col[0], col[1], col[2], int(round(col[3] * alpha_mult)))

        # 1. Consecrated Sanctuary Rose Seal on the ground / lower-center
        seal_cx = 22.0 + t * 3.0
        seal_cy = 40.0
        seal_rx = 7.5 + t * 12.5
        seal_ry = 2.4 + t * 3.4
        draw_ellipse_ring(canvas, seal_cx, seal_cy, seal_rx, seal_ry, sc(C_GOLD_MID), thickness=1.5)
        draw_ellipse_ring(canvas, seal_cx, seal_cy, seal_rx * 0.65, seal_ry * 0.65, sc(C_ROSE_BRIGHT), thickness=1.0)
        for sp in range(6):
            ang = phase + sp * (math.pi / 3.0)
            put_px(canvas, seal_cx + math.cos(ang) * seal_rx * 0.85, seal_cy + math.sin(ang) * seal_ry * 0.85, sc(C_CORE_WHITE))

        # 2. Forward-sweeping Golden-White Crescent Smite Wave (strictly within x <= 48)
        arc_cx = 11.0 + t * 11.0
        arc_cy = 24.0
        arc_r = 9.5 + (t ** 0.7) * 11.5
        arc_span = 1.15 + 0.12 * math.sin(phase)

        steps = 64
        for i in range(steps + 1):
            u = (i / steps) * 2.0 - 1.0
            ang = u * arc_span
            w_thick = max(1.0, (1.0 - u * u) * (4.8 - t * 1.4))
            bx = arc_cx + math.cos(ang) * arc_r
            by = arc_cy + math.sin(ang) * (arc_r * 0.90)

            for dr in np.linspace(-w_thick, w_thick * 0.6, 7):
                px = arc_cx + math.cos(ang) * (arc_r + dr)
                py = arc_cy + math.sin(ang) * ((arc_r + dr) * 0.90)
                if abs(dr) < w_thick * 0.28:
                    put_px(canvas, px, py, sc(C_CORE_WHITE))
                elif abs(dr) < w_thick * 0.62:
                    put_px(canvas, px, py, sc(C_GOLD_BRIGHT))
                else:
                    put_px(canvas, px, py, sc(C_GOLD_MID if dr < 0 else C_ROSE_GLASS))

            if i % 8 == 0 and abs(u) < 0.85:
                sx = arc_cx + math.cos(ang) * (arc_r + w_thick + 3.0)
                sy = arc_cy + math.sin(ang) * ((arc_r + w_thick + 3.0) * 0.90)
                draw_line(canvas, bx, by, sx, sy, sc(C_CORE_WHITE), thickness=1)

        # 3. Trailing rose-gold starlight motes & feathers behind the crescent
        for m in range(6):
            mang = ((m - 2.5) / 3.0) * (arc_span * 0.8)
            mr = arc_r - 3.5 - ((f * 1.4 + m * 2.7) % 8.5)
            if mr > 3.0:
                mx = arc_cx + math.cos(mang) * mr
                my = arc_cy + math.sin(mang) * (mr * 0.90)
                draw_feather_mote(canvas, mx, my, mang, 2, bright=(m % 2 == 0))

        frames.append(canvas)
    return frames


# ==============================================================================
# 30FPS SERAPHIM WINGS PREVIEW FOR CONTACT SHEET (in-memory or loaded from disk)
# ==============================================================================
def build_seraphim_wings_30fps():
    if os.path.exists(WINGS_OUT_PATH):
        return Image.open(WINGS_OUT_PATH).convert("RGBA")
    raw_bytes = zlib.decompress(base64.b64decode(WING_CELL0_B64))
    base_wing = np.frombuffer(raw_bytes, dtype=np.uint8).reshape((WING_L_H, WING_L_W, 4)).copy()
    xc = 39.5
    sheet = Image.new("RGBA", (WING_CELL_W * COLS, WING_CELL_H), (0, 0, 0, 0))
    for f in range(COLS):
        phase = 2.0 * math.pi * f / COLS
        flap_primary = math.sin(phase) - 0.25 * math.sin(2.0 * phase)
        wave_phase = phase - 0.85
        warped = np.zeros((WING_L_H, WING_L_W, 4), dtype=np.uint8)
        for y in range(WING_L_H):
            for x in range(WING_L_W):
                dx = abs(x - xc)
                dist_norm = dx / 39.5
                span_scale = 1.0 + 0.065 * math.sin(phase + 0.4) * (dist_norm ** 0.8)
                src_dx = dx / span_scale
                tip_lift = -5.2 * flap_primary * (dist_norm ** 1.25)
                feather_ripple = 1.65 * math.sin(wave_phase - dist_norm * 3.2) * (dist_norm ** 1.4)
                arch_dy = -1.2 * math.cos(phase) * math.sin(dist_norm * math.pi)
                src_x = int(round(xc + (1.0 if x >= xc else -1.0) * src_dx))
                src_y = int(round(y - (tip_lift + feather_ripple + arch_dy)))
                if 0 <= src_x < WING_L_W and 0 <= src_y < WING_L_H:
                    warped[y, x] = base_wing[src_y, src_x]
        cell_img = Image.fromarray(warped, mode="RGBA").resize(
            (WING_CELL_W, WING_CELL_H), resample=Image.Resampling.NEAREST
        )
        sheet.paste(cell_img, (f * WING_CELL_W, 0))
    return sheet


def save_vfx_contact_sheet(all_rows, wings_sheet):
    """Creates a comprehensive contact sheet showing all 5 VFX rows (F00..F29) plus Seraphim Wings."""
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    thumb = 64
    pad_left = 190
    pad_top = 42
    row_h = thumb + 16
    total_rows = ROWS + 1  # 5 VFX rows + 1 Seraphim Wings preview row
    width = pad_left + COLS * thumb + 16
    height = pad_top + total_rows * row_h + 16

    contact = Image.new("RGBA", (width, height), (18, 20, 28, 255))
    draw = ImageDraw.Draw(contact)

    draw.text(
        (12, 12),
        "Priestess 30fps VFX Sheet (5x30 @ 208x208) + Seraphim Wings (1x30 @ 320x232)",
        fill=(255, 235, 160, 255),
    )

    for c in range(COLS):
        draw.text((pad_left + c * thumb + 18, 26), f"F{c:02d}", fill=(190, 205, 230, 255))

    row_labels = [
        "R0: holy_light (Star)",
        "R1: holy_spear (Sky)",
        "R2: Judgment Pillar",
        "R3: Celestial Gate",
        "R4: Smite Wave & Seal",
        "Wings: 6-Wing Flap",
    ]

    for r_idx, r_frames in enumerate(all_rows):
        y0 = pad_top + r_idx * row_h
        draw.text((10, y0 + 22), row_labels[r_idx], fill=(255, 230, 150, 255))
        for c_idx in range(COLS):
            x0 = pad_left + c_idx * thumb
            draw.rectangle([x0, y0, x0 + thumb - 2, y0 + thumb - 2], fill=(28, 32, 44, 255), outline=(62, 68, 88, 255))
            cell_pil = Image.fromarray(r_frames[c_idx], mode="RGBA").resize((thumb - 4, thumb - 4), resample=Image.Resampling.NEAREST)
            contact.alpha_composite(cell_pil, (x0 + 2, y0 + 2))

    # Row 5 in contact sheet: Seraphim Wings 30fps
    y_w = pad_top + ROWS * row_h
    draw.text((10, y_w + 22), row_labels[5], fill=(255, 230, 150, 255))
    w_thumb_w = thumb - 4
    w_thumb_h = int(round(w_thumb_w * (WING_CELL_H / float(WING_CELL_W))))
    for c_idx in range(COLS):
        x0 = pad_left + c_idx * thumb
        draw.rectangle([x0, y_w, x0 + thumb - 2, y_w + thumb - 2], fill=(28, 32, 44, 255), outline=(62, 68, 88, 255))
        w_crop = wings_sheet.crop((c_idx * WING_CELL_W, 0, (c_idx + 1) * WING_CELL_W, WING_CELL_H))
        w_small = w_crop.resize((w_thumb_w, w_thumb_h), resample=Image.Resampling.NEAREST)
        contact.alpha_composite(w_small, (x0 + 2, y_w + (thumb - w_thumb_h) // 2))

    out_debug = os.path.join(ARTIFACT_DIR, "debug_priestess_30fps_vfx.png")
    contact.save(out_debug)
    print(f"Saved contact sheet: {out_debug} ({contact.size[0]}x{contact.size[1]})")


def main():
    all_rows = [
        build_row0_holy_light(),
        build_row1_holy_spear(),
        build_row2_judgment_pillar(),
        build_row3_celestial_gate(),
        build_row4_smite_wave(),
    ]

    vfx_sheet = Image.new("RGBA", (CELL * COLS, CELL * ROWS), (0, 0, 0, 0))
    boundary_clips = 0
    for r_idx, r_frames in enumerate(all_rows):
        diffs = 0
        for c_idx, frame_arr in enumerate(r_frames):
            if c_idx > 0 and not np.array_equal(r_frames[c_idx - 1], frame_arr):
                diffs += 1
            # Verify 2 <= x <= 49, 2 <= y <= 49 (no non-zero alpha on outer 2px border)
            alpha = frame_arr[:, :, 3]
            if (
                np.any(alpha[:2, :] > 0)
                or np.any(alpha[50:, :] > 0)
                or np.any(alpha[:, :2] > 0)
                or np.any(alpha[:, 50:] > 0)
            ):
                boundary_clips += 1
            cell_img = Image.fromarray(frame_arr, mode="RGBA").resize(
                (CELL, CELL), resample=Image.Resampling.NEAREST
            )
            vfx_sheet.paste(cell_img, (c_idx * CELL, r_idx * CELL))
        print(f"VFX Row {r_idx}: {diffs}/29 distinct adjacent frame transitions")

    print(f"Priestess VFX Boundary Clips (outside 2<=x<=49, 2<=y<=49): {boundary_clips}/150")
    os.makedirs(os.path.dirname(VFX_OUT_PATH), exist_ok=True)
    vfx_sheet.save(VFX_OUT_PATH)
    print(f"Saved {VFX_OUT_PATH} ({vfx_sheet.size[0]}x{vfx_sheet.size[1]})")

    wings_sheet = build_seraphim_wings_30fps()
    save_vfx_contact_sheet(all_rows, wings_sheet)


if __name__ == "__main__":
    main()

