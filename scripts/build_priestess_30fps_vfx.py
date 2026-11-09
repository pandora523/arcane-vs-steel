#!/usr/bin/env python3
"""
Builds Seraphina's (Priestess) High-Precision 104x104 -> 208x208 30fps VFX Sprite Sheet
(assets/sprites/priestess_vfx.png, 6240x1040, 5 rows x 30 cols) AND 30fps Seraphim Wings Sheet
(assets/sprites/seraphim_wings.png, 9600x232, 1 row x 30 cols @ 320x232):

- Row 0 (holy_light): Sacred 8-Point Sunburst Starlight Orb & Orbiting Ultimate Chakrams
- Row 1 (holy_spear): Descending Winged Cathedral Light-Spear (F00..F11) + Tapered Spire Impact Beam (F12..F29)
- Row 2 (Judgment Pillar): Towering Cathedral Sanctum Pillar with 7-Spire Organic Gothic Light Crown (ZERO flat top cutoff!)
- Row 3 (Celestial Gate): 12-Spoke Stained-Glass Cathedral Rose Mandala & 6-Winged Seraphim Crest
- Row 4 (Smite Wave & Sanctuary Rose Seal): Consecrated Sanctuary Seal & Crescent Starlight Wave
- seraphim_wings.png: Pinhole-free 160x116 -> 320x232 6-Wing Golden-Alabaster Seraphim Flap Cycle with 1px Selout
"""

import math
import os
import time
import numpy as np
from PIL import Image, ImageDraw

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
VFX_OUT_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "priestess_vfx.png")
WINGS_OUT_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "seraphim_wings.png")
ARTIFACT_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/3a4b2cf8-05c2-45a3-bb65-af6f5b5a1088"

CELL = 208
L = 104
COLS = 30
ROWS = 5

WING_L_W = 160
WING_L_H = 116
WING_CELL_W = 320
WING_CELL_H = 232

# Crisp Cel-Shaded Radiant Sanctuary VFX Palette
C_SELOUT       = (24, 18, 34, 255)
C_BRONZE_RIM   = (124, 78, 22, 255)
C_GOLD_DEEP    = (184, 124, 28, 255)
C_GOLD_MID     = (234, 179, 38, 255)
C_GOLD_BRIGHT  = (253, 224, 71, 255)
C_PEARL_LIGHT  = (255, 248, 214, 255)
C_CORE_WHITE   = (255, 255, 252, 255)
C_ROSE_BRIGHT  = (251, 182, 206, 245)
C_ROSE_GLASS   = (224, 112, 152, 225)
C_AZURE_BRIGHT = (147, 218, 255, 245)
C_AZURE_GLASS  = (59, 130, 246, 225)
C_SAPPHIRE_SHAD= (30, 64, 175, 235)
C_GOLD_GLOW    = (253, 224, 71, 175)
C_GOLD_SOFT    = (234, 179, 38, 110)

YY, XX = np.mgrid[0:L, 0:L].astype(np.float32)


def put_px(canvas, x, y, rgba):
    ix = int(round(x))
    iy = int(round(y))
    h, w = canvas.shape[:2]
    margin = 4 if (w == L and h == L) else 2
    if not (margin <= ix < w - margin and margin <= iy < h - margin):
        return
    sa = rgba[3] / 255.0
    if sa <= 0.0:
        return
    if sa >= 0.999 or canvas[iy, ix, 3] == 0:
        canvas[iy, ix] = rgba
    else:
        da = canvas[iy, ix, 3] / 255.0
        out_a = sa + da * (1.0 - sa)
        for c in range(3):
            canvas[iy, ix, c] = int(round((rgba[c] * sa + canvas[iy, ix, c] * da * (1.0 - sa)) / out_a))
        canvas[iy, ix, 3] = int(round(out_a * 255))


def draw_line(canvas, x0, y0, x1, y1, rgba, thickness=1.0):
    steps = max(int(math.hypot(x1 - x0, y1 - y0) * 2.2), 1)
    r = thickness * 0.5
    r_int = int(math.ceil(r))
    for i in range(steps + 1):
        t = i / float(steps)
        cx = x0 + (x1 - x0) * t
        cy = y0 + (y1 - y0) * t
        if thickness <= 1.05:
            put_px(canvas, cx, cy, rgba)
        else:
            for dy in range(-r_int, r_int + 1):
                for dx in range(-r_int, r_int + 1):
                    if dx * dx + dy * dy <= r * r + 0.25:
                        put_px(canvas, cx + dx, cy + dy, rgba)


def draw_circle(canvas, cx, cy, radius, rgba, fill=False, ring_w=1.2):
    r_int = int(math.ceil(radius + ring_w + 1))
    for dy in range(-r_int, r_int + 1):
        for dx in range(-r_int, r_int + 1):
            d = math.hypot(dx, dy)
            if fill:
                if d <= radius:
                    put_px(canvas, cx + dx, cy + dy, rgba)
            else:
                if abs(d - radius) <= ring_w * 0.5:
                    put_px(canvas, cx + dx, cy + dy, rgba)


def draw_ellipse_ring(canvas, cx, cy, rx, ry, rgba, rot_rad=0.0, thickness=1.4):
    if rx < 0.8 or ry < 0.5:
        return
    steps = max(72, int((rx + ry) * 5.0))
    c_r, s_r = math.cos(rot_rad), math.sin(rot_rad)
    for i in range(steps):
        ang = 2.0 * math.pi * i / float(steps)
        ex = math.cos(ang) * rx
        ey = math.sin(ang) * ry
        px = cx + ex * c_r - ey * s_r
        py = cy + ex * s_r + ey * c_r
        draw_line(canvas, px, py, px, py, rgba, thickness=thickness)


def draw_star_glint(canvas, cx, cy, arm_len=4, ray_col=C_GOLD_BRIGHT, alpha_scale=1.0):
    def sc(col):
        return (col[0], col[1], col[2], int(round(col[3] * alpha_scale)))

    put_px(canvas, cx, cy, sc(C_CORE_WHITE))
    for d in range(1, arm_len + 1):
        col = sc(C_CORE_WHITE if d == 1 else (C_PEARL_LIGHT if d == 2 else ray_col))
        put_px(canvas, cx - d, cy, col)
        put_px(canvas, cx + d, cy, col)
        put_px(canvas, cx, cy - d, col)
        put_px(canvas, cx, cy + d, col)
    for dx, dy in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
        put_px(canvas, cx + dx, cy + dy, sc(C_GOLD_BRIGHT))


def draw_angel_feather_104(canvas, cx, cy, tilt_rad=-0.8, length=5.5, alpha_scale=1.0):
    def sc(col):
        return (col[0], col[1], col[2], int(round(col[3] * alpha_scale)))

    ux, uy = math.cos(tilt_rad), math.sin(tilt_rad)
    nx, ny = -uy, ux
    steps = int(round(length * 2))
    for i in range(-steps, steps + 1):
        u = i / float(max(1, steps))
        px = cx + ux * (u * length)
        py = cy + uy * (u * length)
        w = max(0.0, (1.0 - u * u) * 2.1)
        put_px(canvas, px, py, sc(C_CORE_WHITE if u < 0.3 else C_PEARL_LIGHT))
        if w >= 0.8:
            put_px(canvas, px + nx, py + ny, sc(C_PEARL_LIGHT if u < 0.0 else C_GOLD_BRIGHT))
            put_px(canvas, px - nx, py - ny, sc(C_GOLD_MID if u > 0.1 else C_GOLD_BRIGHT))
        if w >= 1.6:
            put_px(canvas, px + nx * 2, py + ny * 2, sc(C_GOLD_DEEP))


def draw_starburst_104(canvas, cx, cy, r_long, r_short, rot_rad=0.0, num_points=8, alpha_scale=1.0):
    def sc(col):
        return (col[0], col[1], col[2], int(round(col[3] * alpha_scale)))

    for i in range(num_points):
        ang = rot_rad + i * (2.0 * math.pi / num_points)
        r = r_long if (i % 2 == 0) else r_short
        tx = cx + math.cos(ang) * r
        ty = cy + math.sin(ang) * r
        draw_line(canvas, cx, cy, tx, ty, sc(C_GOLD_DEEP), thickness=2.6 if i % 2 == 0 else 1.8)
        draw_line(canvas, cx, cy, cx + math.cos(ang) * (r * 0.90), cy + math.sin(ang) * (r * 0.90), sc(C_GOLD_BRIGHT), thickness=1.6 if i % 2 == 0 else 1.0)
        draw_line(canvas, cx, cy, cx + math.cos(ang) * (r * 0.68), cy + math.sin(ang) * (r * 0.68), sc(C_CORE_WHITE), thickness=1.0)


def enforce_safe_104(canvas):
    canvas[:4, :, :] = 0
    canvas[L - 4 :, :, :] = 0
    canvas[:, :4, :] = 0
    canvas[:, L - 4 :, :] = 0
    return canvas


# ==============================================================================
# ROW 0: holy_light — Sacred 8-Point Sunburst Starlight Orb & Orbiting Chakrams
# ==============================================================================
def build_row0_holy_light():
    frames = []
    for f in range(COLS):
        canvas = np.zeros((L, L, 4), dtype=np.uint8)
        phase = 2.0 * math.pi * f / COLS
        cx = 58.0 + math.sin(phase) * 1.5
        cy = 52.0 + math.cos(phase * 2.0) * 1.2

        # Tapered sacred comet wake streaming left (-X)
        wake_len = 42.0
        for step in range(44):
            u = step / 43.0
            wx = cx - 6.0 - u * wake_len
            wy = cy + math.sin(phase * 2.0 + u * 5.2) * (1.5 + u * 3.2)
            half_h = max(0.6, (1.0 - u) ** 1.25 * 9.5)
            ih = int(math.ceil(half_h))
            for dy in range(-ih, ih + 1):
                frac = abs(dy) / max(0.5, half_h)
                if frac <= 1.0:
                    if frac < 0.32 and u < 0.55:
                        col = C_CORE_WHITE
                    elif frac < 0.65 and u < 0.78:
                        col = C_PEARL_LIGHT if u < 0.35 else C_GOLD_BRIGHT
                    else:
                        col = C_GOLD_MID if u < 0.65 else C_GOLD_DEEP
                    alpha = int(round(245 * ((1.0 - u) ** 0.85) * (1.0 - frac * 0.45)))
                    put_px(canvas, wx, wy + dy, (col[0], col[1], col[2], alpha))

        # Outer sacred filigree halo ring
        r_ring = 17.5 + 1.0 * math.cos(phase * 2.0)
        draw_circle(canvas, cx, cy, r_ring + 1.0, C_BRONZE_RIM, fill=False, ring_w=1.4)
        draw_circle(canvas, cx, cy, r_ring, C_GOLD_BRIGHT, fill=False, ring_w=1.8)
        for b in range(8):
            bang = -phase + b * (math.pi / 4.0)
            bx = cx + math.cos(bang) * r_ring
            by = cy + math.sin(bang) * r_ring
            draw_circle(canvas, bx, by, 2.1, C_CORE_WHITE if b % 2 == 0 else C_AZURE_BRIGHT, fill=True)

        # Rotating 8-point sunburst starlight spikes
        r_major = 29.5 + 2.5 * math.sin(phase * 2.0)
        r_minor = 19.0 + 1.8 * math.cos(phase * 2.0)
        draw_starburst_104(canvas, cx, cy, r_major, r_minor, rot_rad=phase, num_points=8)

        # Counter-rotating inner stained-glass sapphire/rose prism
        for d_idx in range(4):
            dang = -phase * 1.5 + d_idx * (math.pi / 2.0)
            px = cx + math.cos(dang) * 10.5
            py = cy + math.sin(dang) * 10.5
            draw_circle(canvas, px, py, 2.4, C_ROSE_BRIGHT if d_idx % 2 == 0 else C_AZURE_BRIGHT, fill=True)

        # Solid diamond-white & sunlit-gold nucleus
        draw_circle(canvas, cx, cy, 10.5, C_GOLD_MID, fill=True)
        draw_circle(canvas, cx, cy, 8.2, C_GOLD_BRIGHT, fill=True)
        draw_circle(canvas, cx, cy, 5.6, C_CORE_WHITE, fill=True)

        # Trailing golden angel feathers
        for m in range(3):
            u_m = ((f / float(COLS)) + m / 3.0) % 1.0
            fx = cx - 12.0 - u_m * 34.0
            fy = cy + math.sin(phase * 2.0 + m * 2.1) * 9.0
            draw_angel_feather_104(canvas, fx, fy, tilt_rad=-0.25 + 0.2 * math.sin(phase + m), length=4.5, alpha_scale=1.0 - u_m * 0.65)

        frames.append(enforce_safe_104(canvas))
    return frames


# ==============================================================================
# ROW 1: holy_spear — Winged Cathedral Light-Spear Sky-Strike & Tapered Spire Impact
# ==============================================================================
def draw_cathedral_spear_104(canvas, cx, tip_y, length=58.0, wing_span=25.0, alpha_scale=1.0):
    def sc(col):
        return (col[0], col[1], col[2], int(round(col[3] * alpha_scale)))

    pommel_y = max(7.0, tip_y - length)
    guard_y = max(15.0, tip_y - 20.0)

    # Shaft with bronze-gold contrast rim & diamond-white core
    draw_line(canvas, cx, pommel_y + 3, cx, guard_y, sc(C_BRONZE_RIM), thickness=4.2)
    draw_line(canvas, cx, pommel_y + 2, cx, guard_y, sc(C_GOLD_BRIGHT), thickness=2.4)
    draw_line(canvas, cx, pommel_y, cx, tip_y - 1, sc(C_CORE_WHITE), thickness=1.2)

    # Tapered diamond spearhead below guard_y
    blade_h = max(2.0, tip_y - guard_y)
    for dy in range(int(round(blade_h)) + 1):
        y = guard_y + dy
        u = 1.0 - (dy / blade_h)
        hw = int(round((u ** 0.85) * 6.8))
        for dx in range(-hw, hw + 1):
            if dx == 0:
                put_px(canvas, cx + dx, y, sc(C_CORE_WHITE))
            elif abs(dx) == hw:
                put_px(canvas, cx + dx, y, sc(C_BRONZE_RIM))
            elif abs(dx) == hw - 1:
                put_px(canvas, cx + dx, y, sc(C_GOLD_MID))
            else:
                put_px(canvas, cx + dx, y, sc(C_PEARL_LIGHT if abs(dx) <= 2 else C_GOLD_BRIGHT))

    # Sweeping 6-Pinion Golden Seraphim Winged Crossguard
    w_int = int(round(wing_span))
    for s in range(1, w_int + 1):
        u_w = s / float(max(1, w_int))
        arch_lift = (u_w ** 0.78) * 13.0 - (u_w ** 2.1) * 3.0
        wy = max(7.0, guard_y - arch_lift)
        for side in (-1, 1):
            wx = cx + side * s
            put_px(canvas, wx, wy - 1, sc(C_BRONZE_RIM))
            put_px(canvas, wx, wy, sc(C_CORE_WHITE if u_w < 0.75 else C_GOLD_BRIGHT))
            put_px(canvas, wx, wy + 1, sc(C_PEARL_LIGHT))
            put_px(canvas, wx, wy + 2, sc(C_GOLD_MID))
            if s in (5, 9, 13, 17, 21, 24):
                flen = 9 - (s // 4)
                for fd in range(1, flen + 1):
                    fx = wx + side * (fd * 0.35)
                    fy = wy + 2 + fd
                    put_px(canvas, fx, fy, sc(C_CORE_WHITE if fd >= flen - 1 else C_PEARL_LIGHT))
                    put_px(canvas, fx - side, fy, sc(C_GOLD_DEEP))

    # Sapphire-and-Rose Cathedral Nexus Gem
    draw_circle(canvas, cx, guard_y, 4.2, sc(C_GOLD_DEEP), fill=True)
    draw_circle(canvas, cx, guard_y, 2.8, sc(C_AZURE_BRIGHT), fill=True)
    put_px(canvas, cx, guard_y, sc(C_CORE_WHITE))

    if pommel_y >= 8.0:
        draw_circle(canvas, cx, pommel_y + 4.0, 5.2, sc(C_GOLD_BRIGHT), fill=False, ring_w=1.5)
        draw_star_glint(canvas, cx, pommel_y + 1.0, arm_len=3, alpha_scale=alpha_scale)


def build_row1_holy_spear():
    frames = []
    gy = 86.0
    cx = 52.0
    for f in range(COLS):
        canvas = np.zeros((L, L, 4), dtype=np.uint8)
        if f < 12:
            t = f / 11.0
            tip_y = 28.0 + (gy - 28.0) * (t ** 1.18)
            guard_y = max(14.0, tip_y - 20.0)

            sigil_rx = 9.0 + t * 24.0
            sigil_ry = 2.6 + t * 5.6
            draw_ellipse_ring(canvas, cx, gy, sigil_rx, sigil_ry, C_GOLD_SOFT, thickness=1.5)
            draw_ellipse_ring(canvas, cx, gy, sigil_rx * 0.62, sigil_ry * 0.62, C_AZURE_GLASS, thickness=1.2)

            # Tapered helical starlight ribbons above crossguard (tapers cleanly to 0 at y = 8!)
            top_rib = max(8, int(round(tip_y - 58.0)))
            for ry in range(top_rib, int(round(guard_y)) + 1):
                u_top = (ry - top_rib) / max(1.0, float(guard_y - top_rib))
                taper = min(1.0, u_top * 2.4)
                amp = (6.0 + (1.0 - u_top) * 12.0) * taper
                ang_r = ry * 0.16 - f * 0.65
                for sgn, col_a, col_b in ((1.0, C_CORE_WHITE, C_GOLD_BRIGHT), (-1.0, C_ROSE_BRIGHT, C_GOLD_MID)):
                    rx_s = cx + sgn * math.sin(ang_r) * amp
                    a_s = int(round(240 * taper))
                    put_px(canvas, rx_s, ry, (col_a[0], col_a[1], col_a[2], a_s))
                    put_px(canvas, rx_s + 1, ry, (col_b[0], col_b[1], col_b[2], a_s))

            draw_cathedral_spear_104(canvas, cx, tip_y, length=54.0, wing_span=24.0 + math.sin(t * math.pi) * 3.0)
            draw_starburst_104(canvas, cx, tip_y, 10.0 + t * 6.0, 5.0 + t * 3.0, rot_rad=f * 0.4, num_points=8)
        else:
            imp_f = f - 12
            imp_t = imp_f / 17.0
            fade = 1.0 if imp_f <= 12 else max(0.20, 1.0 - (imp_f - 12) / 5.5)

            def sc(col):
                return (col[0], col[1], col[2], int(round(col[3] * fade)))

            rx_outer = min(41.0, 28.0 + imp_t * 13.0)
            ry_outer = min(9.5, 6.8 + imp_t * 2.7)
            draw_ellipse_ring(canvas, cx, gy, rx_outer + 1.2, ry_outer + 0.6, sc(C_BRONZE_RIM), thickness=1.5)
            draw_ellipse_ring(canvas, cx, gy, rx_outer, ry_outer, sc(C_GOLD_BRIGHT), thickness=2.2)
            draw_ellipse_ring(canvas, cx, gy, rx_outer * 0.62, ry_outer * 0.62, sc(C_ROSE_BRIGHT), thickness=1.6)
            draw_ellipse_ring(canvas, cx, gy, rx_outer * 0.35, ry_outer * 0.35, sc(C_CORE_WHITE), thickness=1.4)

            # Tapered Gothic Light Spire Impact Beam (NO flat cutoff at top — tapers to pointed spire at y=8..24!)
            max_w = max(3.5, 20.0 - imp_t * 12.5)
            spire_top = 8 + int(imp_t * 12.0)
            for py in range(spire_top, int(gy) + 1):
                v_up = (gy - py) / max(1.0, gy - spire_top)  # 0 at base -> 1 at apex
                crown_taper = 1.0 if v_up < 0.55 else max(0.0, (1.0 - (v_up - 0.55) / 0.45) ** 1.35)
                ray_mod = 1.0 + 0.22 * math.cos((py - imp_f * 3.5) * 0.22)
                w_here = max_w * crown_taper * ray_mod
                iw = int(math.ceil(w_here))
                for dx in range(-iw, iw + 1):
                    dn = abs(dx) / max(0.5, w_here)
                    if dn <= 0.36:
                        put_px(canvas, cx + dx, py, sc(C_CORE_WHITE))
                    elif dn <= 0.68:
                        put_px(canvas, cx + dx, py, sc(C_PEARL_LIGHT if dx % 2 == 0 else C_GOLD_BRIGHT))
                    elif dn <= 1.0:
                        put_px(canvas, cx + dx, py, sc(C_GOLD_MID))

            draw_cathedral_spear_104(canvas, cx, gy, length=62.0, wing_span=26.0, alpha_scale=fade)
            for m in range(7):
                m_ang = imp_t * 3.0 + m * 0.9
                mx = cx + math.sin(m_ang * 1.6 + m) * (13.0 + (m % 3) * 7.5)
                my = gy - 8.0 - ((imp_f * 3.8 + m * 9.5) % 66.0)
                if 10 <= my <= gy - 6:
                    draw_angel_feather_104(canvas, mx, my, tilt_rad=-1.1 + 0.3 * math.sin(m_ang), length=5.0, alpha_scale=fade)

        frames.append(enforce_safe_104(canvas))
    return frames


# ==============================================================================
# ROW 2: Judgment Pillar — Towering Cathedral Sanctum Pillar with Organic 7-Spire Light Crown
# ZERO flat horizontal top cutoff on any frame F00..F29!
# ==============================================================================
def build_row2_judgment_pillar():
    frames = []
    cx = 52.0
    base_y = 90.0
    max_erupt_h = 81.0  # Reaches up to y ~ 9 with pointed gothic light spires (strictly inside y >= 4!)

    spire_specs = [
        (-0.74, 0.48, 2.0, 0.4),
        (-0.48, 0.72, 2.0, 1.5),
        (-0.22, 0.90, 2.0, 2.7),
        ( 0.00, 1.04, 1.0, 0.9),
        ( 0.23, 0.88, 2.0, 3.8),
        ( 0.49, 0.70, 2.0, 5.0),
        ( 0.75, 0.46, 2.0, 2.1),
    ]

    for f in range(COLS):
        canvas = np.zeros((L, L, 4), dtype=np.uint8)
        phase = 2.0 * math.pi * f / COLS

        if f <= 5:
            erupt_t = (f + 1) / 6.0
            erupt_h = max_erupt_h * (0.34 + 0.66 * (erupt_t ** 0.72))
            base_r = 10.0 + erupt_t * 13.5
            alpha_mult = 0.82 + 0.18 * erupt_t
        elif f <= 21:
            erupt_h = max_erupt_h
            pulse = math.sin((f - 6) * math.pi / 4.0)
            base_r = 23.0 + pulse * 2.0
            alpha_mult = 1.0
        else:
            diss_t = (f - 21) / 8.0
            erupt_h = max_erupt_h * (1.0 - diss_t * 0.18)
            base_r = max(6.5, 23.0 * (1.0 - diss_t * 0.74))
            alpha_mult = max(0.24, 1.0 - diss_t * 0.76)

        def sc(col):
            return (col[0], col[1], col[2], int(round(col[3] * alpha_mult)))

        # 1. Unified Radiant Thermal/Light Field (Fluted Trunk + 7 Soaring Gothic Light-Spires)
        trunk_h = erupt_h * 0.82
        dy_up = base_y - YY
        in_vert = (dy_up >= -2.0) & (dy_up <= erupt_h + 4.0)
        v_trunk = np.clip(dy_up / max(1.0, trunk_h), 0.0, 1.5)
        upper_frac = np.clip((v_trunk - 0.54) / 0.46, 0.0, 1.0)
        flute_sway = np.sin(v_trunk * 6.0 - phase * 2.0) * 1.4 * np.clip(v_trunk, 0.0, 1.0)
        trunk_w = base_r * (1.08 - 0.20 * np.clip(v_trunk, 0.0, 1.0) - 0.76 * (upper_frac ** 1.35))
        trunk_w = np.maximum(0.5, trunk_w)

        dx_c = XX - (cx + flute_sway)
        flute_rib = 0.10 * np.cos((dx_c / np.maximum(3.0, trunk_w)) * math.pi * 4.0 + phase * 2.0)
        trunk_field = np.where(
            (dy_up >= -1.0) & (dy_up <= trunk_h),
            1.16 - (np.abs(dx_c) / trunk_w) + flute_rib,
            0.0,
        )

        # Superimpose 7 soaring pointed Gothic Cathedral Light-Spires crowning the top!
        spire_base_y = base_y - trunk_h * 0.52
        spire_span = max(8.0, erupt_h - trunk_h * 0.52)
        crown_field = np.zeros_like(trunk_field)
        for x_frac, h_mul, freq, p_off in spire_specs:
            sh = spire_span * h_mul * (0.90 + 0.10 * math.sin(phase * freq + p_off))
            sv = (spire_base_y - YY) / max(1.0, sh)
            valid_s = (sv >= 0.0) & (sv <= 1.0)
            sx_c = (
                cx
                + x_frac * base_r * (0.92 - 0.18 * np.clip(sv, 0.0, 1.0))
                + np.sin(sv * 4.5 - phase * 2.0 + p_off) * 1.3 * np.clip(sv, 0.0, 1.0)
            )
            sw = max(1.6, base_r * 0.30) * ((1.0 - np.clip(sv, 0.0, 1.0)) ** 1.25) + 0.45
            s_val = np.where(valid_s, (1.14 - np.abs(XX - sx_c) / sw) * (1.0 - 0.14 * sv), 0.0)
            crown_field = np.maximum(crown_field, s_val)

        field = np.where(in_vert, np.maximum(trunk_field, crown_field), 0.0)

        # Crisp Cel-Quantized Stained-Glass & Sacred Gold Bands (with dark bronze-gold outer definition!)
        m_rim   = field >= 0.16
        m_deep  = field >= 0.30
        m_mid   = field >= 0.48
        m_lit   = field >= 0.68
        m_pearl = field >= 0.88
        m_core  = field >= 1.04

        # Subtle stained-glass rose/azure vertical lancet tint in mid/lit zones
        lancet_rose = (np.sin((XX - cx) * 0.38 + phase * 2.0) > 0.35) & (dy_up < trunk_h * 0.78)
        canvas[m_rim]   = sc(C_BRONZE_RIM)
        canvas[m_deep]  = sc(C_GOLD_DEEP)
        canvas[m_mid]   = sc(C_GOLD_MID)
        canvas[m_mid & lancet_rose] = sc(C_ROSE_GLASS)
        canvas[m_lit]   = sc(C_GOLD_BRIGHT)
        canvas[m_lit & lancet_rose] = sc(C_ROSE_BRIGHT)
        canvas[m_pearl] = sc(C_PEARL_LIGHT)
        canvas[m_core]  = sc(C_CORE_WHITE)

        # 2. Ornate 8-Point Cathedral Sanctuary Base Seal (centered at base_y = 90.0)
        seal_rx = min(42.0, base_r * 1.62 + 5.0)
        seal_ry = 6.2
        draw_ellipse_ring(canvas, cx, base_y, seal_rx + 1.2, seal_ry + 0.5, sc(C_BRONZE_RIM), thickness=1.5)
        draw_ellipse_ring(canvas, cx, base_y, seal_rx, seal_ry, sc(C_GOLD_BRIGHT), thickness=2.2)
        draw_ellipse_ring(canvas, cx, base_y, seal_rx * 0.66, seal_ry * 0.66, sc(C_AZURE_BRIGHT), thickness=1.5)
        draw_ellipse_ring(canvas, cx, base_y, seal_rx * 0.36, seal_ry * 0.36, sc(C_CORE_WHITE), thickness=1.4)
        for sp in range(8):
            ang = phase + sp * (math.pi / 4.0)
            px_s = cx + math.cos(ang) * seal_rx
            py_s = base_y + math.sin(ang) * seal_ry
            draw_line(canvas, cx, base_y, px_s, py_s, sc(C_CORE_WHITE if sp % 2 == 0 else C_GOLD_BRIGHT), thickness=1.2)
            draw_circle(canvas, px_s, py_s, 1.8, sc(C_CORE_WHITE), fill=True)

        # 3. Double Helical Seraphim Light Ribbons wrapping the lower/mid trunk
        rib_top = int(round(base_y - trunk_h * 0.85))
        for y in range(max(12, rib_top), int(base_y) - 2):
            v_r = (base_y - y) / max(1.0, trunk_h)
            taper_r = min(1.0, (1.0 - v_r) * 2.2)
            span_r = (base_r * (1.12 - 0.35 * v_r) + 2.5) * taper_r
            for strand in (0, 1):
                r_ang = (base_y - y) * 0.13 - phase * 2.0 + strand * math.pi
                if math.cos(r_ang) >= -0.15:
                    rx_rib = cx + math.sin(r_ang) * span_r
                    put_px(canvas, rx_rib - 2, y, sc(C_BRONZE_RIM))
                    put_px(canvas, rx_rib + 2, y, sc(C_BRONZE_RIM))
                    put_px(canvas, rx_rib - 1, y, sc(C_GOLD_BRIGHT))
                    put_px(canvas, rx_rib + 1, y, sc(C_GOLD_BRIGHT))
                    put_px(canvas, rx_rib, y, sc(C_CORE_WHITE if strand == 0 else C_AZURE_BRIGHT))

        # 4. Rotating Winged Ophanim Ring at mid-altitude + Ascending Angel Feathers & Star Glints
        if trunk_h > 26.0:
            ry_oph = base_y - trunk_h * 0.48
            orx = min(40.0, base_r * 1.36 + 3.5)
            ory = 5.4
            tilt = 0.18 * math.sin(phase)
            draw_ellipse_ring(canvas, cx, ry_oph, orx + 1.0, ory + 0.5, sc(C_BRONZE_RIM), rot_rad=tilt, thickness=1.6)
            draw_ellipse_ring(canvas, cx, ry_oph, orx, ory, sc(C_CORE_WHITE), rot_rad=tilt, thickness=1.8)

        for m in range(6):
            u_f = ((f / float(COLS)) * 1.5 + m / 6.0) % 1.0
            fy = base_y - 8.0 - u_f * (erupt_h * 0.90)
            fx = cx + math.sin(phase * 2.0 + m * 1.35) * min(38.0, base_r * (1.05 - 0.45 * u_f) + 5.0)
            if 9.0 <= fy <= base_y - 5.0:
                draw_angel_feather_104(canvas, fx, fy, tilt_rad=-1.15 + 0.25 * math.sin(phase + m), length=5.0, alpha_scale=alpha_mult * (1.0 - 0.35 * u_f))

        for s_i in range(5):
            u_s = ((f / float(COLS)) * 2.0 + s_i / 5.0) % 1.0
            sy = base_y - trunk_h * 0.58 - u_s * (erupt_h * 0.42)
            sx = cx + math.sin(phase + s_i * 1.9) * (base_r * 0.55 * (1.0 - u_s * 0.5))
            if 8.0 <= sy <= 84.0:
                draw_star_glint(canvas, sx, sy, arm_len=3 if u_s < 0.6 else 2, alpha_scale=alpha_mult * (1.0 - u_s * 0.5))

        frames.append(enforce_safe_104(canvas))
    return frames


# ==============================================================================
# ROW 3: Celestial Gate — 12-Spoke Stained-Glass Cathedral Rose Mandala & 6 Wings
# ==============================================================================
def build_row3_celestial_gate():
    frames = []
    cx, cy = 52.0, 52.0
    for f in range(COLS):
        canvas = np.zeros((L, L, 4), dtype=np.uint8)
        phase = 2.0 * math.pi * f / COLS
        pulse = math.sin(phase * 2.0)

        # 6-Winged Seraphim Crest behind mandala
        flap = math.sin(phase * 2.0)
        wing_pairs = [
            (-0.62 + 0.08 * flap, 42.0, C_PEARL_LIGHT),
            ( 0.02 + 0.10 * flap, 43.0, C_GOLD_BRIGHT),
            ( 0.58 - 0.06 * flap, 39.0, C_GOLD_MID),
        ]
        for base_ang, span, w_col in wing_pairs:
            for side in (-1, 1):
                ang = base_ang if side == 1 else (math.pi - base_ang)
                tx = cx + math.cos(ang) * span
                ty = cy + math.sin(ang) * span
                draw_line(canvas, cx, cy, tx, ty, C_BRONZE_RIM, thickness=4.2)
                draw_line(canvas, cx, cy, tx, ty, w_col, thickness=2.4)
                for pf in range(1, 6):
                    frac = 0.38 + pf * 0.11
                    bx = cx + math.cos(ang) * (span * frac)
                    by = cy + math.sin(ang) * (span * frac)
                    f_ang = ang + side * (0.30 + pf * 0.05)
                    fx = bx + math.cos(f_ang) * (9.5 - pf * 0.8)
                    fy = by + math.sin(f_ang) * (9.5 - pf * 0.8)
                    draw_line(canvas, bx, by, fx, fy, C_BRONZE_RIM, thickness=2.4)
                    draw_line(canvas, bx, by, fx, fy, C_CORE_WHITE if pf % 2 == 0 else C_GOLD_BRIGHT, thickness=1.2)

        # 12-Spoke Gothic Cathedral Rose-Window Mandala
        r_outer = 34.0 + pulse * 0.8
        r_mid = 25.0
        r_inner = 14.0
        draw_circle(canvas, cx, cy, r_outer + 1.5, C_BRONZE_RIM, fill=False, ring_w=2.0)
        draw_circle(canvas, cx, cy, r_outer, C_GOLD_BRIGHT, fill=False, ring_w=2.2)
        draw_circle(canvas, cx, cy, r_mid, C_PEARL_LIGHT, fill=False, ring_w=1.8)
        draw_circle(canvas, cx, cy, r_inner, C_GOLD_MID, fill=False, ring_w=1.8)

        num_petals = 12
        for p in range(num_petals):
            pang = phase + p * (2.0 * math.pi / num_petals)
            pang_next = phase + (p + 1) * (2.0 * math.pi / num_petals)
            pang_mid = 0.5 * (pang + pang_next)

            glass_col = C_ROSE_GLASS if (p % 2 == 0) else C_AZURE_GLASS
            glass_hi = C_ROSE_BRIGHT if (p % 2 == 0) else C_AZURE_BRIGHT
            for rad in (18.5, 22.0, 28.5, 31.5):
                gx = cx + math.cos(pang_mid) * rad
                gy = cy + math.sin(pang_mid) * rad
                draw_circle(canvas, gx, gy, 2.2 if rad < 25 else 2.6, glass_hi if rad in (22.0, 31.5) else glass_col, fill=True)

            sx0, sy0 = cx + math.cos(pang) * r_inner, cy + math.sin(pang) * r_inner
            sx1, sy1 = cx + math.cos(pang) * r_outer, cy + math.sin(pang) * r_outer
            draw_line(canvas, sx0, sy0, sx1, sy1, C_GOLD_BRIGHT if p % 2 == 0 else C_GOLD_MID, thickness=1.6)

            sx1_n, sy1_n = cx + math.cos(pang_next) * r_outer, cy + math.sin(pang_next) * r_outer
            mx, my = cx + math.cos(pang_mid) * (r_outer + 3.8), cy + math.sin(pang_mid) * (r_outer + 3.8)
            draw_line(canvas, sx1, sy1, mx, my, C_GOLD_BRIGHT, thickness=1.5)
            draw_line(canvas, sx1_n, sy1_n, mx, my, C_GOLD_BRIGHT, thickness=1.5)
            put_px(canvas, mx, my, C_CORE_WHITE)

        draw_starburst_104(canvas, cx, cy, 21.0 + pulse * 1.2, 13.0, rot_rad=-phase * 1.5, num_points=8)
        draw_circle(canvas, cx, cy, 7.2, C_CORE_WHITE, fill=True)
        draw_circle(canvas, cx, cy, 4.2, C_GOLD_BRIGHT, fill=False, ring_w=1.4)

        for m in range(8):
            m_ang = -phase * 1.25 + m * (math.pi / 4.0)
            m_rad = 40.5 + 1.0 * math.sin(phase * 2.0 + m)
            draw_star_glint(canvas, cx + math.cos(m_ang) * m_rad, cy + math.sin(m_ang) * m_rad, arm_len=2, ray_col=C_ROSE_BRIGHT if m % 2 else C_GOLD_BRIGHT)

        frames.append(enforce_safe_104(canvas))
    return frames


# ==============================================================================
# ROW 4: Smite Wave & Consecrated Cathedral Sanctuary Rose Seal
# ==============================================================================
def build_row4_smite_wave():
    frames = []
    cx, cy = 52.0, 52.0
    for f in range(COLS):
        canvas = np.zeros((L, L, 4), dtype=np.uint8)
        phase = 2.0 * math.pi * f / COLS
        pulse = math.sin(phase * 2.0)

        # Full symmetric rotating Cathedral Sanctuary Seal (used as floor seal & smite burst!)
        r_out = 39.0 + pulse * 1.2
        r_mid = 27.5 - pulse * 0.8
        r_in = 15.0
        draw_circle(canvas, cx, cy, r_out + 1.4, C_BRONZE_RIM, fill=False, ring_w=1.8)
        draw_circle(canvas, cx, cy, r_out, C_GOLD_BRIGHT, fill=False, ring_w=2.4)
        draw_circle(canvas, cx, cy, r_mid, C_AZURE_BRIGHT, fill=False, ring_w=1.8)
        draw_circle(canvas, cx, cy, r_in, C_ROSE_BRIGHT, fill=False, ring_w=1.6)

        pts8 = []
        for sp in range(8):
            ang = phase + sp * (math.pi / 4.0)
            pts8.append((cx + math.cos(ang) * r_out, cy + math.sin(ang) * r_out))
        for sp in range(8):
            x0, y0 = pts8[sp]
            x1, y1 = pts8[(sp + 3) % 8]
            draw_line(canvas, x0, y0, x1, y1, C_GOLD_MID if sp % 2 == 0 else C_ROSE_GLASS, thickness=1.3)
        for sp, (px_s, py_s) in enumerate(pts8):
            draw_line(canvas, cx, cy, px_s, py_s, C_PEARL_LIGHT if sp % 2 == 0 else C_GOLD_BRIGHT, thickness=1.3)
            draw_star_glint(canvas, px_s, py_s, arm_len=2, ray_col=C_GOLD_BRIGHT)

        # Forward-sweeping luminous Seraphim Crescent Arc on right side
        arc_span = 1.18
        for i in range(96):
            u = (i / 95.0) * 2.0 - 1.0
            ang = u * arc_span
            w_th = max(1.0, (1.0 - u * u) * 5.2)
            bx = cx + math.cos(ang) * r_out
            by = cy + math.sin(ang) * r_out
            draw_circle(canvas, bx, by, w_th, C_GOLD_BRIGHT, fill=True)
            draw_circle(canvas, bx, by, w_th * 0.55, C_CORE_WHITE, fill=True)

        draw_circle(canvas, cx, cy, 5.0, C_CORE_WHITE, fill=True)
        frames.append(enforce_safe_104(canvas))
    return frames


# ==============================================================================
# 30FPS SERAPHIM WINGS SHEET (9600x232, 30 cols @ 320x232 from 160x116 logical)
# Crisp Cel-Clustered 6-Pinion Alabaster-Gold Seraphim Angel Wings with 1px Selout
# ==============================================================================
def build_seraphim_wings_30fps():
    sheet = Image.new("RGBA", (WING_CELL_W * COLS, WING_CELL_H), (0, 0, 0, 0))
    W, H = WING_L_W, WING_L_H
    cx, cy = 80.0, 68.0

    W_SELOUT = np.array([22, 18, 34, 255], dtype=np.uint8)
    W_BRONZE = np.array([154, 104, 30, 255], dtype=np.uint8)
    W_GOLD   = np.array([238, 186, 46, 255], dtype=np.uint8)
    W_GLEAM  = np.array([254, 234, 118, 255], dtype=np.uint8)
    W_SHAD   = np.array([196, 206, 232, 255], dtype=np.uint8)
    W_CREAM  = np.array([244, 240, 224, 255], dtype=np.uint8)
    W_WHITE  = np.array([255, 253, 246, 255], dtype=np.uint8)

    for f in range(COLS):
        phase = 2.0 * math.pi * f / COLS
        flap = math.sin(phase) - 0.22 * math.sin(2.0 * phase)
        ripple = math.sin(phase - 0.85)

        buf = np.zeros((H, W, 4), dtype=np.uint8)
        pil_im = Image.fromarray(buf, "RGBA")
        draw = ImageDraw.Draw(pil_im)

        # 3 Tiers of Seraphim Wings (Upper Archangel, Mid Seraph, Lower Cherub) x Left/Right
        tiers = [
            # (shoulder_dx, shoulder_dy, span_x, lift_y, num_primaries, flap_mul)
            (8.0, -10.0, 66.0, -34.0, 7, 1.00),
            (7.0,  -2.0, 56.0,  -6.0, 6, 0.82),
            (6.0,   6.0, 40.0,  18.0, 5, 0.62),
        ]

        for side in (-1, 1):
            for t_idx, (sdx, sdy, span_x, lift_y, n_prim, f_mul) in enumerate(tiers):
                sx = cx + side * sdx
                sy = cy + sdy
                cur_lift = lift_y - flap * 15.0 * f_mul
                cur_span = span_x * (0.94 + 0.06 * math.cos(phase))
                elbow_x = sx + side * (cur_span * 0.44)
                elbow_y = sy + cur_lift * 0.68 - 7.0
                tip_x = sx + side * cur_span
                tip_y = sy + cur_lift + ripple * 4.5 * f_mul

                # Individual layered primary feathers fanning from covert ridge
                for p_i in range(n_prim):
                    u = p_i / float(max(1, n_prim - 1))
                    # Root along shoulder -> elbow -> tip arch
                    if u < 0.5:
                        ru = u * 2.0
                        rx = sx + (elbow_x - sx) * ru
                        ry = sy + (elbow_y - sy) * ru
                    else:
                        ru = (u - 0.5) * 2.0
                        rx = elbow_x + (tip_x - elbow_x) * (ru * 0.72)
                        ry = elbow_y + (tip_y - elbow_y) * (ru * 0.72)

                    f_len = (22.0 + u * 24.0) * (1.0 - t_idx * 0.16)
                    fan_ang = math.atan2(
                        (tip_y - sy) + (1.0 - u) * 26.0 + t_idx * 8.0,
                        side * (cur_span * (0.55 + 0.45 * u)),
                    )
                    fx = rx + math.cos(fan_ang) * f_len
                    fy = ry + math.sin(fan_ang) * f_len + math.sin(phase - u * 2.2) * 2.5

                    # Outer golden-tipped feather silhouette -> alabaster body -> pearl quill
                    w_px = 5 if t_idx == 0 else 4
                    draw.line([(rx, ry), (fx, fy)], fill=tuple(W_SHAD if t_idx == 2 else W_CREAM), width=w_px)
                    draw.line([(rx, ry - 1), (rx + (fx - rx) * 0.78, ry - 1 + (fy - ry) * 0.78)], fill=tuple(W_WHITE), width=max(2, w_px - 2))
                    # Golden-gleam primary feather tips!
                    tx0 = rx + (fx - rx) * 0.76
                    ty0 = ry + (fy - ry) * 0.76
                    draw.line([(tx0, ty0), (fx, fy)], fill=tuple(W_GOLD), width=max(2, w_px - 1))
                    draw.line([( rx + (fx - rx) * 0.88, ry + (fy - ry) * 0.88), (fx, fy)], fill=tuple(W_GLEAM), width=2)

                # Golden-armored Seraphim Wing Leading-Edge Covert Arch
                draw.line([(sx, sy), (elbow_x, elbow_y), ( sx + (tip_x - sx) * 0.78, sy + (tip_y - sy) * 0.78)], fill=tuple(W_BRONZE), width=5)
                draw.line([(sx, sy - 1), (elbow_x, elbow_y - 1), ( sx + (tip_x - sx) * 0.76, sy - 1 + (tip_y - sy) * 0.76)], fill=tuple(W_GOLD), width=3)
                draw.line([(sx, sy - 1), (elbow_x, elbow_y - 1)], fill=tuple(W_GLEAM), width=1)

        arr = np.array(pil_im)
        # Seal any 1px interior pinholes inside wing plumage
        alpha = arr[:, :, 3] > 128
        for _ in range(2):
            up = np.pad(alpha[:-1, :], ((1, 0), (0, 0)), constant_values=False)
            dn = np.pad(alpha[1:, :], ((0, 1), (0, 0)), constant_values=False)
            lf = np.pad(alpha[:, :-1], ((0, 0), (1, 0)), constant_values=False)
            rt = np.pad(alpha[:, 1:], ((0, 0), (0, 1)), constant_values=False)
            slits = (~alpha) & ((up.astype(int) + dn.astype(int) + lf.astype(int) + rt.astype(int)) >= 3)
            if np.any(slits):
                arr[slits] = W_CREAM
                alpha = arr[:, :, 3] > 128

        # Crisp 1px Selective Outline (Selout) around wing silhouette
        up_a = np.pad(alpha[:-1, :], ((1, 0), (0, 0)), constant_values=False)
        dn_a = np.pad(alpha[1:, :], ((0, 1), (0, 0)), constant_values=False)
        lf_a = np.pad(alpha[:, :-1], ((0, 0), (1, 0)), constant_values=False)
        rt_a = np.pad(alpha[:, 1:], ((0, 0), (0, 1)), constant_values=False)
        edge = alpha & (~(up_a & dn_a & lf_a & rt_a))
        arr[edge] = W_SELOUT

        arr[:2, :, :] = 0
        arr[-2:, :, :] = 0
        arr[:, :2, :] = 0
        arr[:, -2:, :] = 0

        cell_img = Image.fromarray(arr, "RGBA").resize((WING_CELL_W, WING_CELL_H), Image.Resampling.NEAREST)
        sheet.paste(cell_img, (f * WING_CELL_W, 0))

    os.makedirs(os.path.dirname(WINGS_OUT_PATH), exist_ok=True)
    sheet.save(WINGS_OUT_PATH)
    print(f"[SUCCESS] Saved {WINGS_OUT_PATH} ({sheet.size[0]}x{sheet.size[1]})")
    return sheet


def save_vfx_contact_sheet(vfx_sheet, wings_sheet):
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    thumb = 68
    pad_left = 185
    pad_top = 36
    row_h = thumb + 10
    total_rows = ROWS + 1
    w = pad_left + COLS * thumb + 16
    h = pad_top + total_rows * row_h + 16

    contact = Image.new("RGBA", (w, h), (16, 16, 26, 255))
    draw = ImageDraw.Draw(contact)
    draw.text((12, 10), "Seraphina (Priestess) 104x104->208x208 30fps VFX + 6-Pinion Seraphim Wings", fill=(254, 240, 138, 255))

    labels = [
        "R0: holy_light (Star)",
        "R1: holy_spear (Sky)",
        "R2: Judgment Pillar",
        "R3: Celestial Gate",
        "R4: Sanctuary Seal",
        "Wings: 6-Pinion Flap",
    ]
    for c in range(COLS):
        draw.text((pad_left + c * thumb + 20, 20), f"F{c:02d}", fill=(185, 200, 230, 255))

    for r in range(ROWS):
        y0 = pad_top + r * row_h
        draw.text((10, y0 + 24), labels[r], fill=(254, 240, 138, 255))
        for c in range(COLS):
            x0 = pad_left + c * thumb
            draw.rectangle([x0, y0, x0 + thumb - 2, y0 + thumb - 2], fill=(24, 24, 38, 255), outline=(58, 62, 86, 255))
            tile = vfx_sheet.crop((c * CELL, r * CELL, (c + 1) * CELL, (r + 1) * CELL)).resize((thumb - 4, thumb - 4), Image.Resampling.NEAREST)
            contact.alpha_composite(tile, (x0 + 2, y0 + 2))

    yw = pad_top + ROWS * row_h
    draw.text((10, yw + 24), labels[5], fill=(254, 240, 138, 255))
    wt_w = thumb - 4
    wt_h = int(round(wt_w * (WING_CELL_H / float(WING_CELL_W))))
    for c in range(COLS):
        x0 = pad_left + c * thumb
        draw.rectangle([x0, yw, x0 + thumb - 2, yw + thumb - 2], fill=(24, 24, 38, 255), outline=(58, 62, 86, 255))
        wc = wings_sheet.crop((c * WING_CELL_W, 0, (c + 1) * WING_CELL_W, WING_CELL_H)).resize((wt_w, wt_h), Image.Resampling.NEAREST)
        contact.alpha_composite(wc, (x0 + 2, yw + (thumb - wt_h) // 2))

    out_p = os.path.join(ARTIFACT_DIR, "debug_priestess_30fps_vfx.png")
    contact.save(out_p)
    print(f"[SUCCESS] Saved debug VFX contact sheet: {out_p}")


def main():
    t0 = time.time()
    all_rows = [
        build_row0_holy_light(),
        build_row1_holy_spear(),
        build_row2_judgment_pillar(),
        build_row3_celestial_gate(),
        build_row4_smite_wave(),
    ]

    vfx_sheet = Image.new("RGBA", (CELL * COLS, CELL * ROWS), (0, 0, 0, 0))
    clips = 0
    for r_idx, r_frames in enumerate(all_rows):
        diffs = 0
        prev = None
        for c_idx, arr104 in enumerate(r_frames):
            if prev is not None and not np.array_equal(prev, arr104):
                diffs += 1
            prev = arr104
            a = arr104[:, :, 3]
            if a[:2, :].sum() + a[-2:, :].sum() + a[:, :2].sum() + a[:, -2:].sum() > 0:
                clips += 1
            cell208 = Image.fromarray(arr104, "RGBA").resize((CELL, CELL), Image.Resampling.NEAREST)
            vfx_sheet.paste(cell208, (c_idx * CELL, r_idx * CELL))
        print(f"  VFX Row {r_idx}: {diffs}/29 distinct transitions")

    os.makedirs(os.path.dirname(VFX_OUT_PATH), exist_ok=True)
    vfx_sheet.save(VFX_OUT_PATH)
    print(f"[SUCCESS] Saved {VFX_OUT_PATH} ({vfx_sheet.size[0]}x{vfx_sheet.size[1]}) in {time.time() - t0:.2f}s | clips={clips}/150")

    wings_sheet = build_seraphim_wings_30fps()
    save_vfx_contact_sheet(vfx_sheet, wings_sheet)


if __name__ == "__main__":
    main()
