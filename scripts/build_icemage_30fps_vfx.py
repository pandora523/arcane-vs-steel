#!/usr/bin/env python3
"""
Builds a dedicated 5-row x 30-frame (6240x1040, 208x208 per cell) 30fps HD-2D VFX sprite sheet
for the Ice Mage / Cryo-Prism Sovereign (`assets/sprites/icemage_vfx.png`).

Row Layout (matches VFXManager conventions):
- Row 0 (y=0):   Spinning Hexagonal Cryo-Prism Bolt & Refracted Borealis Ray Projectile (30 frames)
- Row 1 (y=208): Floating Hexagonal Cryo-Prism Mirror Node & Frost-Statue Decoy Shatter (30 frames)
- Row 2 (y=416): Erupting Glacial Iceberg Monolith & Refractive Ice-Wall Crystal (30 frames)
- Row 3 (y=624): Sacred Borealis Snowflake Cast Seal & Hexagonal Prism Matrix Halo (30 frames, used at y=624 by renderBackgroundCastSeals)
- Row 4 (y=832): Absolute Zero Diamond Shatter Nova & 6-Point Frost Starburst Ring (30 frames)
"""

import math
import os
from PIL import Image

CELL_LOGICAL = 52
SCALE = 4
CELL_PX = CELL_LOGICAL * SCALE  # 208
COLS = 30
ROWS = 5

# Cryo-Prism / Borealis Aurora Palette
VOID_NAVY     = (10, 18, 38, 255)
DEEP_GLACIER  = (14, 58, 106, 255)
COBALT_ICE    = (2, 132, 199, 255)
SAPPHIRE_FROST= (56, 189, 248, 255)
CRYO_CYAN     = (103, 232, 249, 255)
DIAMOND_MINT  = (165, 243, 252, 255)
PURE_WHITE    = (248, 250, 252, 255)
AURORA_VIOLET = (168, 85, 247, 255)
AURORA_LILAC  = (216, 180, 254, 255)
AURORA_TEAL   = (45, 212, 191, 255)


def new_grid():
    return [[(0, 0, 0, 0) for _ in range(CELL_LOGICAL)] for _ in range(CELL_LOGICAL)]


def put_px(g, x, y, col):
    ix, iy = int(round(x)), int(round(y))
    if 2 <= ix <= CELL_LOGICAL - 3 and 2 <= iy <= CELL_LOGICAL - 3:
        g[iy][ix] = col


def draw_disc(g, cx, cy, r, col):
    r2 = r * r
    x0 = max(2, int(math.floor(cx - r)))
    x1 = min(CELL_LOGICAL - 3, int(math.ceil(cx + r)))
    y0 = max(2, int(math.floor(cy - r)))
    y1 = min(CELL_LOGICAL - 3, int(math.ceil(cy + r)))
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r2:
                g[y][x] = col


def draw_ring(g, cx, cy, r_in, r_out, col):
    ri2 = r_in * r_in
    ro2 = r_out * r_out
    x0 = max(2, int(math.floor(cx - r_out)))
    x1 = min(CELL_LOGICAL - 3, int(math.ceil(cx + r_out)))
    y0 = max(2, int(math.floor(cy - r_out)))
    y1 = min(CELL_LOGICAL - 3, int(math.ceil(cy + r_out)))
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            d2 = (x - cx) ** 2 + (y - cy) ** 2
            if ri2 <= d2 <= ro2:
                g[y][x] = col


def draw_line(g, x0, y0, x1, y1, col, thick=1):
    steps = int(max(abs(x1 - x0), abs(y1 - y0)) * 2) + 1
    for i in range(steps + 1):
        t = i / max(1, steps)
        x = x0 + (x1 - x0) * t
        y = y0 + (y1 - y0) * t
        if thick <= 1:
            put_px(g, x, y, col)
        else:
            draw_disc(g, x, y, thick * 0.5, col)


def draw_polygon(g, pts, fill_col=None, outline_col=None):
    if fill_col is not None and len(pts) >= 3:
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        x0 = max(2, int(math.floor(min(xs))))
        x1 = min(CELL_LOGICAL - 3, int(math.ceil(max(xs))))
        y0 = max(2, int(math.floor(min(ys))))
        y1 = min(CELL_LOGICAL - 3, int(math.ceil(max(ys))))
        n = len(pts)
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                inside = False
                j = n - 1
                for i in range(n):
                    xi, yi = pts[i]
                    xj, yj = pts[j]
                    if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / ((yj - yi) + 1e-9) + xi):
                        inside = not inside
                    j = i
                if inside:
                    g[y][x] = fill_col
    if outline_col is not None:
        for i in range(len(pts)):
            p0 = pts[i]
            p1 = pts[(i + 1) % len(pts)]
            draw_line(g, p0[0], p0[1], p1[0], p1[1], outline_col, 1)


def fill_pinholes(g):
    out = [row[:] for row in g]
    for y in range(3, CELL_LOGICAL - 3):
        for x in range(3, CELL_LOGICAL - 3):
            if g[y][x][3] == 0:
                neighbors = [g[y - 1][x], g[y + 1][x], g[y][x - 1], g[y][x + 1]]
                solid = [c for c in neighbors if c[3] > 0]
                if len(solid) >= 3:
                    out[y][x] = solid[0]
    return out


def build_row0_cryo_prism_bolt(f):
    """Row 0: Spinning Hexagonal Cryo-Prism Shard & Refracted Borealis Ray Projectile."""
    g = new_grid()
    phase = (f / COLS) * math.tau
    cx, cy = 29.0, 26.0 + math.sin(phase * 2.0) * 1.2

    # Refracted aurora contrail ribbons behind the prism spearhead
    for t_idx in range(18):
        tx = cx - 4.0 - t_idx * 1.25
        ty_top = cy - 2.5 + math.sin(phase * 2.0 + t_idx * 0.45) * 2.0
        ty_bot = cy + 2.5 + math.cos(phase * 2.0 + t_idx * 0.45) * 2.0
        col_top = AURORA_LILAC if t_idx % 3 == 0 else CRYO_CYAN
        col_bot = AURORA_TEAL if t_idx % 2 == 0 else SAPPHIRE_FROST
        put_px(g, tx, ty_top, col_top)
        put_px(g, tx, ty_bot, col_bot)
        if t_idx < 12:
            put_px(g, tx, cy + math.sin(phase + t_idx * 0.3) * 0.8, DIAMOND_MINT)

    # Outer refracted diamond halo
    draw_ring(g, cx, cy, 8.2, 9.8, DEEP_GLACIER)
    draw_ring(g, cx, cy, 6.8, 8.2, COBALT_ICE)

    # Rotating 6-point hexagonal crystal prism + forward lance tip
    for k in range(6):
        ang = phase + k * (math.tau / 6.0)
        px = cx + math.cos(ang) * 7.5
        py = cy + math.sin(ang) * 5.5
        draw_line(g, cx, cy, px, py, CRYO_CYAN, 2)
        draw_line(g, cx, cy, px, py, PURE_WHITE, 1)

    # Forward faceted diamond spearhead
    spear_pts = [
        (cx + 15.0, cy),
        (cx + 3.0, cy - 6.5),
        (cx - 9.0, cy - 3.5),
        (cx - 13.0, cy),
        (cx - 9.0, cy + 3.5),
        (cx + 3.0, cy + 6.5),
    ]
    draw_polygon(g, spear_pts, fill_col=COBALT_ICE, outline_col=VOID_NAVY)

    inner_pts = [
        (cx + 12.0, cy),
        (cx + 2.5, cy - 4.2),
        (cx - 6.5, cy - 2.0),
        (cx - 6.5, cy + 2.0),
        (cx + 2.5, cy + 4.2),
    ]
    draw_polygon(g, inner_pts, fill_col=CRYO_CYAN, outline_col=SAPPHIRE_FROST)
    draw_line(g, cx - 7.0, cy, cx + 12.5, cy, PURE_WHITE, 2)
    draw_disc(g, cx + 2.0, cy, 2.2, PURE_WHITE)
    return fill_pinholes(g)


def build_row1_cryo_prism_mirror_node(f):
    """Row 1: Floating Hexagonal Cryo-Prism Mirror Node & Refracting Laser Core."""
    g = new_grid()
    phase = (f / COLS) * math.tau
    cx, cy = 26.0, 26.0 + math.sin(phase) * 1.5
    pulse = 1.0 + 0.12 * math.sin(phase * 2.0)

    # Orbiting mini frost-satellites
    for k in range(3):
        ang = -phase * 1.5 + k * (math.tau / 3.0)
        sx = cx + math.cos(ang) * 15.5
        sy = cy + math.sin(ang) * 15.5
        draw_disc(g, sx, sy, 2.6, VOID_NAVY)
        draw_disc(g, sx, sy, 1.8, AURORA_LILAC if k == 0 else CRYO_CYAN)
        put_px(g, sx, sy, PURE_WHITE)

    # Hexagonal Cryo-Prism Mirror body
    hex_outer = []
    hex_mid = []
    hex_inner = []
    for k in range(6):
        ang = phase * 0.5 + k * (math.tau / 6.0)
        hex_outer.append((cx + math.cos(ang) * 12.5 * pulse, cy + math.sin(ang) * 12.5 * pulse))
        hex_mid.append((cx + math.cos(ang) * 9.8 * pulse, cy + math.sin(ang) * 9.8 * pulse))
        hex_inner.append((cx + math.cos(ang) * 6.2 * pulse, cy + math.sin(ang) * 6.2 * pulse))

    draw_polygon(g, hex_outer, fill_col=DEEP_GLACIER, outline_col=VOID_NAVY)
    draw_polygon(g, hex_mid, fill_col=SAPPHIRE_FROST, outline_col=COBALT_ICE)
    draw_polygon(g, hex_inner, fill_col=DIAMOND_MINT, outline_col=CRYO_CYAN)

    # Facet refraction lines from center to vertices
    for vx, vy in hex_outer:
        draw_line(g, cx, cy, vx, vy, PURE_WHITE, 1)

    draw_disc(g, cx, cy, 3.0, PURE_WHITE)
    return fill_pinholes(g)


def build_row2_glacial_monolith(f):
    """Row 2: Erupting Glacial Iceberg Monolith & Refractive Ice-Wall Crystal."""
    g = new_grid()
    t = f / (COLS - 1)
    cx = 26.0
    base_y = 46.0

    # Eruption height curve: rapid rise (0..0.25), crystalline resonance hold (0.25..0.75), shatter fade (0.75..1.0)
    if t < 0.22:
        h_scale = t / 0.22
    elif t < 0.78:
        h_scale = 1.0 + 0.04 * math.sin((t - 0.22) * 18.0)
    else:
        h_scale = max(0.18, 1.0 - (t - 0.78) / 0.22)

    top_y = base_y - 36.0 * h_scale

    # Side crystal spires flanking the main iceberg monolith
    for side in (-1, 1):
        s_top_y = base_y - 23.0 * h_scale
        s_pts = [
            (cx + side * 15.0, s_top_y),
            (cx + side * 19.0, base_y - 8.0 * h_scale),
            (cx + side * 11.0, base_y),
            (cx + side * 6.0, base_y),
        ]
        draw_polygon(g, s_pts, fill_col=COBALT_ICE, outline_col=VOID_NAVY)
        draw_line(g, cx + side * 14.0, s_top_y + 2.0, cx + side * 9.0, base_y - 2.0, CRYO_CYAN, 1)

    # Central towering faceted iceberg prism
    main_pts = [
        (cx, top_y),
        (cx + 10.5, base_y - 22.0 * h_scale),
        (cx + 8.5, base_y),
        (cx - 8.5, base_y),
        (cx - 10.5, base_y - 22.0 * h_scale),
    ]
    draw_polygon(g, main_pts, fill_col=SAPPHIRE_FROST, outline_col=VOID_NAVY)

    # Left bright highlight facet & right aurora shadow facet
    left_facet = [
        (cx, top_y + 1.5),
        (cx, base_y - 1.0),
        (cx - 7.5, base_y - 1.0),
        (cx - 9.0, base_y - 21.0 * h_scale),
    ]
    draw_polygon(g, left_facet, fill_col=DIAMOND_MINT, outline_col=CRYO_CYAN)
    draw_line(g, cx, top_y + 1.0, cx, base_y - 1.0, PURE_WHITE, 2)

    # Base permafrost rim
    draw_line(g, cx - 18.0, base_y, cx + 18.0, base_y, VOID_NAVY, 3)
    draw_line(g, cx - 16.0, base_y - 1.0, cx + 16.0, base_y - 1.0, PURE_WHITE, 1)
    return fill_pinholes(g)


def build_row3_borealis_cast_seal(f):
    """Row 3 (y=624): Sacred Borealis Snowflake Cast Seal & Hexagonal Prism Matrix Halo."""
    g = new_grid()
    phase = (f / COLS) * math.tau
    cx, cy = 26.0, 26.0

    # Outer concentric rune circle
    draw_ring(g, cx, cy, 19.0, 21.2, DEEP_GLACIER)
    draw_ring(g, cx, cy, 19.6, 20.6, CRYO_CYAN)

    # Counter-rotating interlocking hexagonal prism stars (12-point sacred snowflake geometry)
    for layer in range(2):
        rot = phase * (1.0 if layer == 0 else -1.0)
        pts = []
        for k in range(6):
            ang = rot + k * (math.tau / 6.0)
            pts.append((cx + math.cos(ang) * 18.5, cy + math.sin(ang) * 18.5))
        col = AURORA_LILAC if layer == 1 else DIAMOND_MINT
        for k in range(6):
            p0 = pts[k]
            p1 = pts[(k + 2) % 6]
            draw_line(g, p0[0], p0[1], p1[0], p1[1], col, 1)

    # 6 Primary Snowflake Dendrite Arms with crystalline branches
    for k in range(6):
        ang = phase * 0.5 + k * (math.tau / 6.0)
        x1 = cx + math.cos(ang) * 20.0
        y1 = cy + math.sin(ang) * 20.0
        draw_line(g, cx, cy, x1, y1, PURE_WHITE, 1)
        # Dendrite V-branches at r=12
        bx = cx + math.cos(ang) * 12.0
        by = cy + math.sin(ang) * 12.0
        for b_dir in (-0.55, 0.55):
            b_ang = ang + b_dir
            draw_line(g, bx, by, bx + math.cos(b_ang) * 5.0, by + math.sin(b_ang) * 5.0, CRYO_CYAN, 1)

    draw_ring(g, cx, cy, 5.5, 7.5, SAPPHIRE_FROST)
    draw_disc(g, cx, cy, 3.2, PURE_WHITE)
    return fill_pinholes(g)


def build_row4_absolute_zero_shatter_nova(f):
    """Row 4 (y=832): Absolute Zero Diamond Shatter Nova & 6-Point Frost Starburst Ring."""
    g = new_grid()
    t = f / (COLS - 1)
    cx, cy = 26.0, 26.0

    # Expanding shockwave ring + flying diamond splinters
    r_main = 4.0 + t * 17.5
    thick = max(1.2, 4.2 * (1.0 - t * 0.65))
    draw_ring(g, cx, cy, max(1.0, r_main - thick * 0.6), min(22.0, r_main + thick * 0.6), DEEP_GLACIER)
    draw_ring(g, cx, cy, max(1.0, r_main - thick * 0.35), min(21.5, r_main + thick * 0.35), CRYO_CYAN)

    # 6 Refracted Starburst Spikes + 6 Secondary Aurora Rays
    for k in range(12):
        ang = k * (math.tau / 12.0) + t * 0.8
        is_major = (k % 2 == 0)
        r0 = max(2.0, r_main * 0.35)
        r1 = min(22.0, r_main * (1.18 if is_major else 0.92))
        col = PURE_WHITE if is_major else AURORA_LILAC
        draw_line(
            g,
            cx + math.cos(ang) * r0,
            cy + math.sin(ang) * r0,
            cx + math.cos(ang) * r1,
            cy + math.sin(ang) * r1,
            col,
            2 if is_major else 1,
        )

    if t < 0.55:
        draw_disc(g, cx, cy, max(1.5, (0.55 - t) * 11.0), PURE_WHITE)

    return fill_pinholes(g)


def grid_to_cell_image(g):
    cell = Image.new("RGBA", (CELL_LOGICAL, CELL_LOGICAL), (0, 0, 0, 0))
    px = cell.load()
    for y in range(CELL_LOGICAL):
        for x in range(CELL_LOGICAL):
            px[x, y] = g[y][x]
    return cell.resize((CELL_PX, CELL_PX), Image.Resampling.NEAREST)


def main():
    sheet = Image.new("RGBA", (COLS * CELL_PX, ROWS * CELL_PX), (0, 0, 0, 0))
    builders = [
        build_row0_cryo_prism_bolt,
        build_row1_cryo_prism_mirror_node,
        build_row2_glacial_monolith,
        build_row3_borealis_cast_seal,
        build_row4_absolute_zero_shatter_nova,
    ]
    for r, fn in enumerate(builders):
        for f in range(COLS):
            g = fn(f)
            cell_img = grid_to_cell_image(g)
            sheet.paste(cell_img, (f * CELL_PX, r * CELL_PX))

    out_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "assets",
        "sprites",
        "icemage_vfx.png",
    )
    sheet.save(out_path, "PNG")
    print(f"Saved {out_path} ({sheet.size[0]}x{sheet.size[1]})")


if __name__ == "__main__":
    main()
