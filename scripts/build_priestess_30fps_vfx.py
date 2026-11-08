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
# F00..F11: Ornate winged golden Valkyrie Spear of Light plummeting point-down.
# F12..F29: Spear planted upright in a glowing stained-glass cathedral
#           rose-window ground sigil (gy=42) with rising golden light pillars
#           and floating feathers.
# ==============================================================================
def draw_valkyrie_spear(canvas, cx, tip_y, length=32, wing_span=9.0, alpha_scale=1.0):
    """Draws an ornate winged golden Valkyrie Spear pointing straight down with tip at tip_y."""
    def sc(col):
        return (col[0], col[1], col[2], int(round(col[3] * alpha_scale)))

    pommel_y = max(1, tip_y - length)
    guard_y = tip_y - 9

    # Glowing aura behind spear shaft
    draw_line(canvas, cx, pommel_y, cx, tip_y, sc(C_GOLD_GLOW), thickness=3)

    # Golden shaft with pearl core highlight
    draw_line(canvas, cx - 1, pommel_y + 2, cx - 1, guard_y, sc(C_GOLD_DEEP), thickness=1)
    draw_line(canvas, cx + 1, pommel_y + 2, cx + 1, guard_y, sc(C_GOLD_MID), thickness=1)
    draw_line(canvas, cx, pommel_y, cx, tip_y - 1, sc(C_CORE_WHITE), thickness=1)

    # Diamond spearhead below guard (guard_y to tip_y)
    for dy in range(0, int(tip_y - guard_y) + 1):
        y = guard_y + dy
        t = 1.0 - (dy / max(1.0, (tip_y - guard_y)))
        half_w = int(round(t * 3.2))
        for dx in range(-half_w, half_w + 1):
            if dx == 0:
                put_px(canvas, cx + dx, y, sc(C_CORE_WHITE))
            elif abs(dx) == half_w:
                put_px(canvas, cx + dx, y, sc(C_GOLD_MID))
            else:
                put_px(canvas, cx + dx, y, sc(C_GOLD_BRIGHT))

    # Valkyrie Winged Crossguard at guard_y
    w_int = int(round(wing_span))
    for s in range(1, w_int + 1):
        wy = guard_y - int(round((s / max(1.0, wing_span)) * 4.5))
        for side in (-1, 1):
            wx = cx + side * s
            put_px(canvas, wx, wy, sc(C_CORE_WHITE))
            put_px(canvas, wx, wy + 1, sc(C_GOLD_BRIGHT))
            if s % 2 == 1 and s >= 3:
                # Primary wing feathers hanging slightly below crossguard arch
                put_px(canvas, wx, wy + 2, sc(C_PEARL_LIGHT))
                put_px(canvas, wx, wy + 3, sc(C_GOLD_MID))

    # Pommel Halo Ring near top of shaft
    if pommel_y >= 3:
        draw_circle(canvas, cx, pommel_y + 2, 3.0, sc(C_GOLD_BRIGHT), fill=False)
        put_px(canvas, cx, pommel_y, sc(C_CORE_WHITE))


def build_row1_holy_spear():
    frames = []
    gy = 42.0
    cx = 26.0
    for f in range(COLS):
        canvas = np.zeros((L, L, 4), dtype=np.uint8)
        if f < 12:
            # F00..F11: Plummeting from heavens toward ground at gy=42
            t = f / 11.0
            # Ease-in acceleration downward
            tip_y = 10.0 + (gy - 10.0) * (t ** 1.25)

            # Target preview rose-sigil expanding on ground as spear approaches
            sigil_rx = 3.0 + t * 11.0
            sigil_ry = 1.2 + t * 3.2
            draw_ellipse_ring(canvas, cx, gy, sigil_rx, sigil_ry, C_GOLD_SOFT, rot_rad=0.0)
            if f >= 6:
                draw_ellipse_ring(canvas, cx, gy, sigil_rx * 0.6, sigil_ry * 0.6, C_ROSE_GLASS, rot_rad=0.0)

            # Speed streaks / descending heaven beam behind spear
            for s_idx in range(5):
                sx = cx + (s_idx - 2) * 3.0
                sy0 = max(0, tip_y - 34 - s_idx * 2)
                sy1 = max(2, tip_y - 6)
                draw_line(canvas, sx, sy0, sx, sy1, C_GOLD_SOFT if s_idx != 2 else C_WHITE_GLOW, thickness=1)

            draw_valkyrie_spear(canvas, cx, tip_y, length=30, wing_span=8.5 + math.sin(t * math.pi) * 2.0)

            # Bright starlight flash at spear tip
            draw_starburst(canvas, cx, tip_y, 6.0 + t * 4.0, 3.0 + t * 2.0, rot_rad=f * 0.4, num_points=4)
        else:
            # F12..F29: Spear planted upright at gy=42 with stained-glass cathedral rose sigil & light pillar
            imp_f = f - 12
            imp_t = imp_f / 17.0
            fade = 1.0 if imp_f < 11 else max(0.18, 1.0 - (imp_f - 10) / 8.0)

            def sc(col):
                return (col[0], col[1], col[2], int(round(col[3] * fade)))

            # Expanding ground stained-glass cathedral rose-window sigil at gy=42
            rx = min(22.0, 14.0 + imp_t * 9.0)
            ry = min(6.5, 4.0 + imp_t * 2.5)
            draw_ellipse_ring(canvas, cx, gy, rx, ry, sc(C_GOLD_BRIGHT), thickness=1.5)
            draw_ellipse_ring(canvas, cx, gy, rx * 0.72, ry * 0.72, sc(C_ROSE_BRIGHT), thickness=1.0)
            draw_ellipse_ring(canvas, cx, gy, rx * 0.42, ry * 0.42, sc(C_CORE_WHITE), thickness=1.0)

            # 8 rotating stained-glass rose spokes on the ground plane
            for sp in range(8):
                ang = imp_f * 0.18 + sp * (math.pi / 4.0)
                sx = cx + math.cos(ang) * rx
                sy = gy + math.sin(ang) * ry
                draw_line(canvas, cx, gy, sx, sy, sc(C_GOLD_MID if sp % 2 == 0 else C_ROSE_GLASS), thickness=1)
                put_px(canvas, sx, sy, sc(C_CORE_WHITE))

            # Rising vertical golden light pillar around planted spear (especially bright F12..F20)
            pillar_w = max(2.0, (10.0 - imp_t * 6.5))
            for py in range(4, int(gy) + 1):
                for dx in range(-int(pillar_w), int(pillar_w) + 1):
                    dist_norm = abs(dx) / pillar_w
                    if dist_norm <= 0.45:
                        put_px(canvas, cx + dx, py, sc(C_WHITE_GLOW))
                    elif dist_norm <= 0.85:
                        put_px(canvas, cx + dx, py, sc(C_GOLD_GLOW))
                    else:
                        put_px(canvas, cx + dx, py, sc(C_GOLD_FAINT))

            # Impact shockwave starburst on F12..F15
            if imp_f <= 4:
                burst_r = 12.0 + imp_f * 3.0
                draw_starburst(canvas, cx, gy - 2, burst_r, burst_r * 0.55, rot_rad=imp_f * 0.3, num_points=8)

            # Planted Valkyrie Spear
            draw_valkyrie_spear(canvas, cx, gy, length=33, wing_span=9.5, alpha_scale=fade)

            # Floating ascending light feathers around the spear
            for m in range(6):
                m_phase = imp_t * 2.5 + m * 1.05
                mx = cx + math.sin(m_phase * 2.0 + m) * (7.0 + (m % 3) * 4.5)
                my = gy - 3.0 - ((imp_f * 1.8 + m * 5.5) % 34.0)
                if fade > 0.3:
                    draw_feather_mote(canvas, mx, my, m_phase, 2, bright=(m % 2 == 0))

        frames.append(canvas)
    return frames


# ==============================================================================
# ROW 2: priestess Cathedral Judgment Pillar & Ophanim Halo (30 frames)
# Towering column of golden-white divine light wrapped in rotating winged
# Ophanim rings and gothic cathedral arches:
# - F00..F05: Eruption from ground rose seal
# - F06..F21: Full rotating pillar with gothic arches & double Ophanim rings
# - F22..F29: Ascension dissolve into rising feathers & halo motes
# ==============================================================================
def build_row2_judgment_pillar():
    frames = []
    cx = 26.0
    base_y = 47.0
    top_y = 3.0
    for f in range(COLS):
        canvas = np.zeros((L, L, 4), dtype=np.uint8)
        phase = 2.0 * math.pi * f / COLS

        if f <= 5:
            # Eruption phase
            erupt_t = (f + 1) / 6.0
            cur_top = base_y - (base_y - top_y) * (erupt_t ** 0.75)
            col_radius = 4.0 + erupt_t * 8.5
            alpha_mult = 0.75 + 0.25 * erupt_t
        elif f <= 21:
            # Full towering rotating pillar
            cur_top = top_y
            pulse = math.sin((f - 6) * math.pi / 4.0)
            col_radius = 12.0 + pulse * 1.5
            alpha_mult = 1.0
        else:
            # Ascension dissolve (F22..F29)
            diss_t = (f - 21) / 8.0
            cur_top = top_y
            col_radius = max(2.5, 12.0 * (1.0 - diss_t * 0.78))
            alpha_mult = max(0.2, 1.0 - diss_t * 0.82)

        def sc(col):
            return (col[0], col[1], col[2], int(round(col[3] * alpha_mult)))

        # 1. Base consecrated cathedral ground seal at base_y
        seal_rx = min(23.0, col_radius * 1.65 + 3.0)
        seal_ry = 4.2
        draw_ellipse_ring(canvas, cx, base_y, seal_rx, seal_ry, sc(C_GOLD_BRIGHT), thickness=1.5)
        draw_ellipse_ring(canvas, cx, base_y, seal_rx * 0.65, seal_ry * 0.65, sc(C_ROSE_BRIGHT), thickness=1.0)

        # 2. Towering vertical divine light column
        r_int = int(math.ceil(col_radius))
        for y in range(int(cur_top), int(base_y) + 1):
            v_ratio = (y - cur_top) / max(1.0, (base_y - cur_top))
            # Slight gothic flare near base and crown
            flare = 1.0 + 0.18 * math.cos(v_ratio * math.pi * 2.0)
            eff_r = col_radius * flare
            for dx in range(-r_int - 2, r_int + 3):
                adx = abs(dx)
                if adx <= eff_r:
                    norm = adx / max(1.0, eff_r)
                    # Vertical stained-glass flutingrib pattern rotating with phase
                    rib = math.sin((dx / max(1.0, eff_r)) * math.pi * 2.0 + phase * 2.0)
                    if norm < 0.32:
                        put_px(canvas, cx + dx, y, sc(C_CORE_WHITE))
                    elif norm < 0.58:
                        put_px(canvas, cx + dx, y, sc(C_PEARL_LIGHT if rib > 0 else C_GOLD_BRIGHT))
                    elif norm < 0.84:
                        put_px(canvas, cx + dx, y, sc(C_GOLD_MID if rib > -0.2 else C_ROSE_GLASS))
                    else:
                        put_px(canvas, cx + dx, y, sc(C_GOLD_GLOW))

        # 3. Gothic Cathedral Tracery Arches inside the pillar (when pillar is tall)
        if base_y - cur_top > 20:
            for arch_i in range(-1, 2):
                arch_cx = cx + math.sin(phase + arch_i * 2.09) * (col_radius * 0.52)
                arch_top = cur_top + 7
                arch_bot = base_y - 3
                draw_line(canvas, arch_cx, arch_top, arch_cx, arch_bot, sc(C_GOLD_DEEP), thickness=1)
                # Pointed gothic lancet arch top
                draw_line(canvas, arch_cx - 3, arch_top + 5, arch_cx, arch_top, sc(C_CORE_WHITE), thickness=1)
                draw_line(canvas, arch_cx + 3, arch_top + 5, arch_cx, arch_top, sc(C_CORE_WHITE), thickness=1)

        # 4. Rotating Winged Ophanim Rings wrapping the pillar at 2 altitudes
        ring_altitudes = [
            cur_top + (base_y - cur_top) * 0.34,
            cur_top + (base_y - cur_top) * 0.68,
        ]
        for idx, ry_pos in enumerate(ring_altitudes):
            if ry_pos < cur_top + 4 or ry_pos > base_y - 3:
                continue
            tilt = 0.22 * math.sin(phase + idx * math.pi)
            orx = min(23.5, col_radius * 1.48 + 3.0)
            ory = 3.8
            draw_ellipse_ring(canvas, cx, ry_pos, orx, ory, sc(C_GOLD_DEEP), rot_rad=tilt, thickness=1.5)
            draw_ellipse_ring(canvas, cx, ry_pos, orx * 0.92, ory * 0.92, sc(C_CORE_WHITE), rot_rad=tilt, thickness=1.0)
            # Orbiting Ophanim eyes / star gems along the ring
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
                wx = cx + side * (orx + 1.5)
                wy = ry_pos - 2.0 + math.sin(phase * 2.0 + idx) * 1.5
                draw_line(canvas, cx + side * (orx - 1), ry_pos, wx, wy - 2, sc(C_PEARL_LIGHT), thickness=1)
                draw_line(canvas, cx + side * (orx - 1), ry_pos + 1, wx, wy + 1, sc(C_GOLD_BRIGHT), thickness=1)

        # 5. Ascending seraphic feathers & crown starburst at top of pillar
        draw_starburst(canvas, cx, cur_top + 2, 7.0, 3.5, rot_rad=phase, num_points=8)
        for m in range(5):
            my = base_y - ((f * 2.1 + m * 9.0) % max(8.0, (base_y - cur_top)))
            mx = cx + math.sin(phase * 2.0 + m * 1.4) * (col_radius + 4.5)
            draw_feather_mote(canvas, mx, my, phase + m, 2, bright=(m % 2 == 0))

        frames.append(canvas)
    return frames


# ==============================================================================
# ROW 3: Seraphic Apotheosis Celestial Gate / 6-Winged Archangel Mandala (30 frames)
# Grand 30fps rotating Stained-Glass Cathedral Rose Mandala & 6-Winged Seraphim Crest
# ==============================================================================
def build_row3_celestial_gate():
    frames = []
    cx, cy = 26.0, 26.0
    for f in range(COLS):
        canvas = np.zeros((L, L, 4), dtype=np.uint8)
        phase = 2.0 * math.pi * f / COLS
        pulse = math.sin(phase * 2.0)

        # 1. Outer soft divine aura
        draw_circle(canvas, cx, cy, 23.5, C_GOLD_FAINT, fill=True)
        draw_circle(canvas, cx, cy, 19.5 + pulse * 0.8, C_GOLD_SOFT, fill=True)

        # 2. 6-Winged Seraphim Crest radiating behind the mandala (3 pairs: upper, mid, lower)
        flap = math.sin(phase * 2.0)
        wing_pairs = [
            (-0.62 + 0.08 * flap, 23.5, C_PEARL_LIGHT),  # Upper Archangel pair
            (0.02 + 0.10 * flap, 24.5, C_GOLD_BRIGHT),   # Middle Seraph pair
            (0.58 - 0.06 * flap, 21.5, C_GOLD_MID),      # Lower Cherub pair
        ]
        for base_ang, span, w_col in wing_pairs:
            for side in (-1, 1):
                ang = base_ang if side == 1 else (math.pi - base_ang)
                tip_x = cx + math.cos(ang) * span
                tip_y = cy + math.sin(ang) * span
                draw_line(canvas, cx, cy, tip_x, tip_y, w_col, thickness=2)
                # 4 primary feathers fanning slightly downward from each wing spine
                for pf in range(1, 5):
                    frac = 0.45 + pf * 0.13
                    bx = cx + math.cos(ang) * (span * frac)
                    by = cy + math.sin(ang) * (span * frac)
                    f_ang = ang + side * (0.28 + pf * 0.06)
                    fx = bx + math.cos(f_ang) * (5.5 - pf * 0.5)
                    fy = by + math.sin(f_ang) * (5.5 - pf * 0.5)
                    draw_line(canvas, bx, by, fx, fy, C_CORE_WHITE if pf % 2 == 0 else C_GOLD_BRIGHT, thickness=1)

        # 3. Stained-Glass Cathedral Rose Window petals (12 rotating gothic petals)
        num_petals = 12
        r_outer = 18.5 + pulse * 0.6
        r_inner = 8.0
        for p in range(num_petals):
            pang = phase + p * (2.0 * math.pi / num_petals)
            pang_next = phase + (p + 1) * (2.0 * math.pi / num_petals)
            pang_mid = 0.5 * (pang + pang_next)

            # Fill stained glass sector lightly with alternating Rose and Azure celestial glass
            glass_col = C_ROSE_GLASS if (p % 2 == 0) else C_AZURE_GLASS
            for rad in (10.5, 13.0, 15.5):
                gx = cx + math.cos(pang_mid) * rad
                gy = cy + math.sin(pang_mid) * rad
                put_px(canvas, gx, gy, glass_col)
                put_px(canvas, gx + 0.6, gy, glass_col)

            # Golden gothic tracery spoke and pointed arch tip
            sx0 = cx + math.cos(pang) * r_inner
            sy0 = cy + math.sin(pang) * r_inner
            sx1 = cx + math.cos(pang) * r_outer
            sy1 = cy + math.sin(pang) * r_outer
            draw_line(canvas, sx0, sy0, sx1, sy1, C_GOLD_MID, thickness=1)

            mx = cx + math.cos(pang_mid) * (r_outer + 1.8)
            my = cy + math.sin(pang_mid) * (r_outer + 1.8)
            draw_line(canvas, sx1, sy1, mx, my, C_GOLD_BRIGHT, thickness=1)
            put_px(canvas, mx, my, C_CORE_WHITE)

        # 4. Concentric Golden Mandala Rings & Counter-Rotating Sacred Geometry Square/Octagram
        draw_circle(canvas, cx, cy, r_outer, C_GOLD_DEEP, fill=False)
        draw_circle(canvas, cx, cy, r_outer - 1.0, C_GOLD_BRIGHT, fill=False)
        draw_circle(canvas, cx, cy, 12.0, C_CORE_WHITE, fill=False)
        draw_circle(canvas, cx, cy, r_inner, C_GOLD_MID, fill=False)

        # Counter-rotating 8-point sacred star at center
        draw_starburst(canvas, cx, cy, 11.5 + pulse, 7.0, rot_rad=-phase * 1.5, num_points=8)
        draw_circle(canvas, cx, cy, 3.8, C_CORE_WHITE, fill=True)
        draw_circle(canvas, cx, cy, 2.0, C_GOLD_BRIGHT, fill=False)

        frames.append(canvas)
    return frames


# ==============================================================================
# ROW 4: priestess Radiant Smite Wave & Sanctuary Rose Seal (30 frames)
# Expanding golden-white crescent smite wave & consecrated rose sigil (F00..F29)
# ==============================================================================
def build_row4_smite_wave():
    frames = []
    for f in range(COLS):
        canvas = np.zeros((L, L, 4), dtype=np.uint8)
        t = f / (COLS - 1.0)
        phase = 2.0 * math.pi * f / COLS

        # Fade out smoothly in the final 7 frames while keeping crisp pixels
        alpha_mult = 1.0 if f < 22 else max(0.22, 1.0 - (f - 21) / 9.0)

        def sc(col):
            return (col[0], col[1], col[2], int(round(col[3] * alpha_mult)))

        # 1. Consecrated Sanctuary Rose Seal on the ground / lower-center
        seal_cx = 23.0 + t * 4.0
        seal_cy = 39.0
        seal_rx = 8.0 + t * 14.0
        seal_ry = 2.5 + t * 3.8
        draw_ellipse_ring(canvas, seal_cx, seal_cy, seal_rx, seal_ry, sc(C_GOLD_MID), thickness=1.5)
        draw_ellipse_ring(canvas, seal_cx, seal_cy, seal_rx * 0.65, seal_ry * 0.65, sc(C_ROSE_BRIGHT), thickness=1.0)
        for sp in range(6):
            ang = phase + sp * (math.pi / 3.0)
            put_px(canvas, seal_cx + math.cos(ang) * seal_rx * 0.85, seal_cy + math.sin(ang) * seal_ry * 0.85, sc(C_CORE_WHITE))

        # 2. Forward-sweeping Golden-White Crescent Smite Wave (advancing from x=16 to x=35)
        arc_cx = 12.0 + t * 14.0
        arc_cy = 24.0
        arc_r = 10.0 + (t ** 0.7) * 14.0
        arc_span = 1.18 + 0.15 * math.sin(phase)

        steps = 64
        for i in range(steps + 1):
            u = (i / steps) * 2.0 - 1.0  # -1..1
            ang = u * arc_span
            w_thick = max(1.0, (1.0 - u * u) * (5.2 - t * 1.6))
            bx = arc_cx + math.cos(ang) * arc_r
            by = arc_cy + math.sin(ang) * (arc_r * 0.92)

            # Outer golden glow to inner diamond-white crescent blade
            for dr in np.linspace(-w_thick, w_thick * 0.6, 7):
                px = arc_cx + math.cos(ang) * (arc_r + dr)
                py = arc_cy + math.sin(ang) * ((arc_r + dr) * 0.92)
                if abs(dr) < w_thick * 0.28:
                    put_px(canvas, px, py, sc(C_CORE_WHITE))
                elif abs(dr) < w_thick * 0.62:
                    put_px(canvas, px, py, sc(C_GOLD_BRIGHT))
                else:
                    put_px(canvas, px, py, sc(C_GOLD_MID if dr < 0 else C_ROSE_GLASS))

            # Radiant filigree spikes projecting from the outer edge of the crescent
            if i % 8 == 0 and abs(u) < 0.85:
                sx = arc_cx + math.cos(ang) * (arc_r + w_thick + 3.5)
                sy = arc_cy + math.sin(ang) * ((arc_r + w_thick + 3.5) * 0.92)
                draw_line(canvas, bx, by, sx, sy, sc(C_CORE_WHITE), thickness=1)

        # 3. Trailing rose-gold starlight motes & feathers behind the crescent
        for m in range(6):
            mang = ((m - 2.5) / 3.0) * (arc_span * 0.8)
            mr = arc_r - 3.5 - ((f * 1.4 + m * 2.7) % 9.0)
            if mr > 3.0:
                mx = arc_cx + math.cos(mang) * mr
                my = arc_cy + math.sin(mang) * (mr * 0.92)
                draw_feather_mote(canvas, mx, my, mang, 2, bright=(m % 2 == 0))

        frames.append(canvas)
    return frames


# ==============================================================================
# 30FPS SERAPHIM WINGS SHEET (9600x232, 30 cols x 1 row at 320x232 per cell)
# Interpolates a silky-smooth 30fps 6-wing Seraphim flap cycle from the base
# 80x58 logical wing template:
#   upstroke -> apex -> power downstroke -> feather ripple -> glide recovery
# with golden-tipped white primary feathers and drifting light motes.
# ==============================================================================
def build_seraphim_wings_30fps():
    raw_bytes = zlib.decompress(base64.b64decode(WING_CELL0_B64))
    base_wing = np.frombuffer(raw_bytes, dtype=np.uint8).reshape((WING_L_H, WING_L_W, 4)).copy()

    # Center of symmetry in logical 80x58 canvas is x_center = 39.5, shoulder anchor y_anchor = 30.0
    xc = 39.5
    ya = 30.0

    sheet = Image.new("RGBA", (WING_CELL_W * COLS, WING_CELL_H), (0, 0, 0, 0))

    for f in range(COLS):
        phase = 2.0 * math.pi * f / COLS
        # Asymmetric natural wing-flap curve:
        # Smooth sweeping upstroke (F00..F10), majestic apex (F11..F14),
        # dynamic power downstroke (F15..F22), feather ripple & glide recovery (F23..F29)
        flap_primary = math.sin(phase) - 0.25 * math.sin(2.0 * phase)
        # Secondary traveling feather wave from inner shoulder out to primary tips
        wave_phase = phase - 0.85

        warped = np.zeros((WING_L_H, WING_L_W, 4), dtype=np.uint8)

        # Inverse-map every pixel for clean, gap-free 30fps wing articulation
        for y in range(WING_L_H):
            for x in range(WING_L_W):
                dx = abs(x - xc)
                dist_norm = dx / 39.5  # 0 at spine center, 1 at wingtips

                # Span stretch during apex/downstroke
                span_scale = 1.0 + 0.065 * math.sin(phase + 0.4) * (dist_norm ** 0.8)
                src_dx = dx / span_scale

                # Vertical flap displacement + traveling primary-feather ripple
                tip_lift = -5.2 * flap_primary * (dist_norm ** 1.25)
                feather_ripple = 1.65 * math.sin(wave_phase - dist_norm * 3.2) * (dist_norm ** 1.4)
                # Slight vertical arching near mid-wing
                arch_dy = -1.2 * math.cos(phase) * math.sin(dist_norm * math.pi)

                src_x = int(round(xc + (1.0 if x >= xc else -1.0) * src_dx))
                src_y = int(round(y - (tip_lift + feather_ripple + arch_dy)))

                if 0 <= src_x < WING_L_W and 0 <= src_y < WING_L_H:
                    px = base_wing[src_y, src_x].copy()
                    if px[3] > 0:
                        # Subtle golden-tipped shimmer on outer primary feathers during power stroke
                        if dist_norm > 0.62 and (px[0] > 210 and px[1] > 210):
                            shimmer = 0.5 + 0.5 * math.sin(phase * 2.0 + dist_norm * 4.0)
                            if shimmer > 0.65:
                                px[0] = 255
                                px[1] = min(255, int(px[1] * 0.96 + 10))
                                px[2] = max(140, int(px[2] * 0.72))
                        warped[y, x] = px

        # Add drifting golden-white seraphic light motes & shedding micro-feathers around wingtips
        for m in range(6):
            side = -1 if (m % 2 == 0) else 1
            m_prog = ((f / float(COLS)) + m * 0.17) % 1.0
            mx = xc + side * (16.0 + m_prog * 21.0)
            my = 14.0 + (m // 2) * 12.0 + math.sin(phase + m * 1.3) * 4.0 + m_prog * 5.0
            alpha = int(round(220 * math.sin(m_prog * math.pi)))
            if alpha > 25:
                put_px(warped, mx, my, (255, 255, 252, alpha))
                put_px(warped, mx + side, my, (255, 232, 136, int(alpha * 0.8)))
                if m % 3 == 0:
                    put_px(warped, mx, my - 1, (242, 198, 78, int(alpha * 0.65)))

        cell_img = Image.fromarray(warped, mode="RGBA").resize(
            (WING_CELL_W, WING_CELL_H), resample=Image.Resampling.NEAREST
        )
        sheet.paste(cell_img, (f * WING_CELL_W, 0))

    os.makedirs(os.path.dirname(WINGS_OUT_PATH), exist_ok=True)
    sheet.save(WINGS_OUT_PATH)
    print(f"Saved {WINGS_OUT_PATH} ({sheet.size[0]}x{sheet.size[1]})")
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
    for r_idx, r_frames in enumerate(all_rows):
        diffs = 0
        for c_idx, frame_arr in enumerate(r_frames):
            if c_idx > 0 and not np.array_equal(r_frames[c_idx - 1], frame_arr):
                diffs += 1
            cell_img = Image.fromarray(frame_arr, mode="RGBA").resize(
                (CELL, CELL), resample=Image.Resampling.NEAREST
            )
            vfx_sheet.paste(cell_img, (c_idx * CELL, r_idx * CELL))
        print(f"VFX Row {r_idx}: {diffs}/29 distinct adjacent frame transitions")

    os.makedirs(os.path.dirname(VFX_OUT_PATH), exist_ok=True)
    vfx_sheet.save(VFX_OUT_PATH)
    print(f"Saved {VFX_OUT_PATH} ({vfx_sheet.size[0]}x{vfx_sheet.size[1]})")

    wings_sheet = build_seraphim_wings_30fps()
    save_vfx_contact_sheet(all_rows, wings_sheet)


if __name__ == "__main__":
    main()
