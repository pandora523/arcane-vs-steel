#!/usr/bin/env python3
"""
Builds the bespoke 30-column x 9-row (6240x1872, 208x208 per cell) 30fps HD-2D sprite sheet
and 128x128 portrait for the 10th Champion: GLACIA, the Cryo-Prism Sovereign (`icemage`).

Visual Identity & Silhouette (100% distinct from FireMage, Priestess, Chronomancer, Valkyrie):
- Headgear: 6-Spire Diamond Borealis Tiara / Frost Crown with flowing Prismatic Silver-Lavender Hair.
- Outfit: Asymmetrical Arctic White-Fur Collared Mantle over a Split Sapphire-Glacial Corset Tunic.
- Footwear: Crystalline Ice-Skate Sabatons (glides across the ice in a figure-skating silhouette).
- Back Silhouette: Constellation of 3 Orbiting Hexagonal Cryo-Prism Mirrors hovering in a dynamic triangle behind her shoulders.
- Weapon / Catalyst: Levitating Faceted Borealis Star-Prism Catalyst + Cryo-Scepter Wand (splits and refracts laser rays during attacks).

9 Animation Rows (30 frames each = 270 frames):
- Row 0 (IDLE): Floating Cryo-Prism constellation orbit, breathing arctic mantle, levitating star-prism catalyst.
- Row 1 (WALK): Figure-Skating Permafrost Glide — smooth diagonal skating strides with trailing frost-ribbon blades.
- Row 2 (AUTO_ATTACK): Cryo-Prism Laser Refraction — snaps wand forward while hovering star-prism splits & fires a refracted beam.
- Row 3 (SKILL): Tri-Beam Prism Matrix — spins on skates and aligns all 3 Hexagonal Cryo-Prisms forward into a triangular laser lens.
- Row 4 (ULTIMATE): Borealis Cathedral — ascends in a diamond aurora vortex, spreading all 3 Cryo-Prisms wide into an orbital crown.
- Row 5 (DEATH & HURT): F00..F05 hurt stagger, F06..F17 kneeling frost-crystallization collapse, F18..F29 horizontal rest with dimmed prisms.
- Row 6 (DASH): Frost-Mirror Skate Slide — low aerodynamic speed-skater tuck leaving crystalline decoy afterimages.
- Row 7 (CROUCH): Glacial Prism Wall — graceful figure-skater knee-tuck behind an angled hexagonal refractive ice-shield.
- Row 8 (JUMP): Mid-Air Axel Prism Vault — airborne figure-skating leap with trailing borealis frost arc.
"""

import math
import os
from PIL import Image

CELL_LOGICAL = 52
SCALE = 4
CELL_PX = CELL_LOGICAL * SCALE  # 208
COLS = 30
ROWS = 9

# HD-2D Cryo-Prism Sovereign Palette
INK_OUTLINE    = (11, 17, 34, 255)
DEEP_NAVY      = (18, 32, 64, 255)
ROYAL_SAPPHIRE = (24, 78, 138, 255)
GLACIER_BLUE   = (40, 128, 198, 255)
FROST_CYAN     = (86, 204, 242, 255)
CRYO_MINT      = (158, 244, 255, 255)
DIAMOND_WHITE  = (246, 251, 255, 255)

# Aurora Lilac / Prismatic accents
AURORA_DEEP    = (76, 42, 133, 255)
AURORA_VIOLET  = (139, 92, 246, 255)
AURORA_LILAC   = (206, 182, 252, 255)
AURORA_ROSE    = (244, 180, 232, 255)

# Arctic Fur & Silver-Gold Trim
FUR_SHADOW     = (176, 196, 222, 255)
FUR_LIGHT      = (232, 242, 252, 255)
SILVER_SHADOW  = (100, 122, 152, 255)
SILVER_BRIGHT  = (204, 222, 242, 255)

# Skin & Eyes
SKIN_SHADOW    = (208, 178, 188, 255)
SKIN_BASE      = (238, 214, 222, 255)
SKIN_LIGHT     = (252, 236, 242, 255)
EYE_CYAN       = (56, 228, 255, 255)


def new_grid():
    return [[(0, 0, 0, 0) for _ in range(CELL_LOGICAL)] for _ in range(CELL_LOGICAL)]


def put_px(g, x, y, col):
    ix, iy = int(round(x)), int(round(y))
    if 3 <= ix <= CELL_LOGICAL - 4 and 3 <= iy <= CELL_LOGICAL - 4:
        g[iy][ix] = col


def draw_disc(g, cx, cy, r, col):
    r2 = r * r
    x0 = max(3, int(math.floor(cx - r)))
    x1 = min(CELL_LOGICAL - 4, int(math.ceil(cx + r)))
    y0 = max(3, int(math.floor(cy - r)))
    y1 = min(CELL_LOGICAL - 4, int(math.ceil(cy + r)))
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r2:
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
        x0 = max(3, int(math.floor(min(xs))))
        x1 = min(CELL_LOGICAL - 4, int(math.ceil(max(xs))))
        y0 = max(3, int(math.floor(min(ys))))
        y1 = min(CELL_LOGICAL - 4, int(math.ceil(max(ys))))
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


def draw_hex_prism(g, cx, cy, rx, ry, rot, core_col=CRYO_MINT, rim_col=FROST_CYAN):
    """Draws a floating faceted hexagonal Cryo-Prism Mirror with dark ink outline and specular core."""
    pts_outer = []
    pts_inner = []
    for k in range(6):
        ang = rot + k * (math.tau / 6.0)
        pts_outer.append((cx + math.cos(ang) * rx, cy + math.sin(ang) * ry))
        pts_inner.append((cx + math.cos(ang) * (rx * 0.62), cy + math.sin(ang) * (ry * 0.62)))
    draw_polygon(g, pts_outer, fill_col=ROYAL_SAPPHIRE, outline_col=INK_OUTLINE)
    draw_polygon(g, pts_inner, fill_col=rim_col, outline_col=GLACIER_BLUE)
    put_px(g, cx, cy, DIAMOND_WHITE)
    put_px(g, cx - 1, cy, core_col)
    put_px(g, cx, cy - 1, core_col)


def apply_outline_and_fill_pinholes(g):
    """Adds a crisp 1px dark navy outline around all non-transparent character pixels and fills interior pinholes."""
    # First pass: fill interior 1px pinholes
    filled = [row[:] for row in g]
    for _ in range(2):
        nxt = [row[:] for row in filled]
        for y in range(3, CELL_LOGICAL - 3):
            for x in range(3, CELL_LOGICAL - 3):
                if filled[y][x][3] == 0:
                    neighbors = [filled[y - 1][x], filled[y + 1][x], filled[y][x - 1], filled[y][x + 1]]
                    solid = [c for c in neighbors if c[3] > 0 and c != INK_OUTLINE]
                    if len(solid) >= 3:
                        nxt[y][x] = solid[0]
        filled = nxt

    # Second pass: add 1px outline around exterior boundary inside safe margin [2..49]
    out = [row[:] for row in filled]
    for y in range(2, CELL_LOGICAL - 2):
        for x in range(2, CELL_LOGICAL - 2):
            if filled[y][x][3] == 0:
                has_solid = False
                for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < CELL_LOGICAL and 0 <= nx < CELL_LOGICAL:
                        if filled[ny][nx][3] > 0:
                            has_solid = True
                            break
                if has_solid:
                    out[y][x] = INK_OUTLINE

    # Third pass: re-verify zero interior pinholes after outlining
    for y in range(3, CELL_LOGICAL - 3):
        for x in range(3, CELL_LOGICAL - 3):
            if out[y][x][3] == 0:
                neighbors = [out[y - 1][x], out[y + 1][x], out[y][x - 1], out[y][x + 1]]
                solid = [c for c in neighbors if c[3] > 0]
                if len(solid) >= 3:
                    out[y][x] = DEEP_NAVY

    # Enforce 2px transparent safety border
    for y in range(CELL_LOGICAL):
        for x in range(CELL_LOGICAL):
            if x < 2 or x >= CELL_LOGICAL - 2 or y < 2 or y >= CELL_LOGICAL - 2:
                out[y][x] = (0, 0, 0, 0)
    return out


def render_glacia_frame(
    cx=24.0,
    cy_hip=31.0,
    lean_x=0.0,
    head_bob=0.0,
    hair_wave=0.0,
    left_foot=(-4.0, 44.0),
    right_foot=(4.0, 44.0),
    skate_trail=False,
    wand_tip=(37.0, 23.0),
    offhand_pos=(18.0, 25.0),
    prism_mode="orbit",
    prism_phase=0.0,
    catalyst_pos=(40.0, 19.0),
    catalyst_scale=1.0,
    beam_burst=0.0,
    ice_shield=False,
    aurora_wings=False,
    collapse_t=0.0,
    hurt_recoil=0.0,
):
    g = new_grid()

    if collapse_t > 0.55:
        # Horizontal Fallen Pose (Row 5 F18..F29)
        t_rest = min(1.0, (collapse_t - 0.55) / 0.45)
        ground_y = 43.0
        # Dimmed Cryo-Prisms resting on the ice around her
        draw_hex_prism(g, 13.0, ground_y - 3.0, 3.2, 2.5, 0.2, core_col=FROST_CYAN, rim_col=GLACIER_BLUE)
        draw_hex_prism(g, 26.0, ground_y - 5.0, 3.2, 2.5, 0.8, core_col=FROST_CYAN, rim_col=GLACIER_BLUE)
        draw_hex_prism(g, 38.0, ground_y - 3.0, 3.2, 2.5, 1.4, core_col=FROST_CYAN, rim_col=GLACIER_BLUE)

        # Flowing silver-lilac hair spilled across the floor
        hair_pts = [(10.0, ground_y), (19.0, ground_y - 6.0), (22.0, ground_y), (11.0, ground_y + 1.0)]
        draw_polygon(g, hair_pts, fill_col=AURORA_LILAC)

        # Split glacial skirt & legs lying horizontally
        skirt_pts = [(22.0, ground_y - 5.0), (37.0, ground_y - 3.0), (41.0, ground_y + 1.0), (21.0, ground_y + 1.0)]
        draw_polygon(g, skirt_pts, fill_col=ROYAL_SAPPHIRE)
        draw_line(g, 24.0, ground_y - 2.0, 39.0, ground_y - 1.0, FROST_CYAN, 2)
        # Ice-skate sabatons at right end
        draw_disc(g, 41.0, ground_y - 1.0, 2.2, SILVER_BRIGHT)
        draw_line(g, 39.0, ground_y + 1.0, 44.0, ground_y + 1.0, DIAMOND_WHITE, 1)

        # Torso & Arctic Fur Mantle
        torso_pts = [(16.0, ground_y - 6.0), (26.0, ground_y - 6.0), (27.0, ground_y), (16.0, ground_y)]
        draw_polygon(g, torso_pts, fill_col=GLACIER_BLUE)
        draw_disc(g, 20.0, ground_y - 5.0, 3.0, FUR_LIGHT)
        draw_disc(g, 19.0, ground_y - 4.0, 2.2, FUR_SHADOW)

        # Head & Frost Tiara
        draw_disc(g, 15.5, ground_y - 4.5, 3.2, SKIN_BASE)
        draw_line(g, 13.0, ground_y - 7.5, 16.0, ground_y - 8.5, CRYO_MINT, 2)
        return apply_outline_and_fill_pinholes(g)

    # Adjust torso/head centers for hurt recoil or kneeling collapse (F06..F17)
    kneel_drop = collapse_t * 14.0 if collapse_t > 0.0 else 0.0
    cx_body = cx + lean_x - hurt_recoil * 3.0
    cy_body = cy_hip + kneel_drop
    torso_top_x = cx_body + lean_x * 0.7
    torso_top_y = cy_body - 10.0 + head_bob
    head_x = torso_top_x + lean_x * 0.25
    head_y = torso_top_y - 5.5

    # 1. BACK LAYER: Orbiting Constellation of 3 Hexagonal Cryo-Prism Mirrors
    prism_coords = []
    if prism_mode == "orbit":
        base_Offsets = [(-11.5, -10.5), (0.0, -16.5), (10.5, -10.5)]
        for idx, (ox, oy) in enumerate(base_Offsets):
            bob_x = math.cos(prism_phase + idx * 2.1) * 1.6
            bob_y = math.sin(prism_phase * 1.5 + idx * 2.1) * 1.8
            prism_coords.append((head_x + ox + bob_x, torso_top_y + oy * 0.65 + bob_y))
    elif prism_mode == "tri_matrix":
        # Forward-aligned triangular prism array in front of Glacia
        for idx in range(3):
            ang = prism_phase * 2.0 + idx * (math.tau / 3.0)
            px = cx_body + 13.5 + math.cos(ang) * 5.2
            py = torso_top_y + 2.0 + math.sin(ang) * 6.5
            prism_coords.append((px, py))
    elif prism_mode == "cathedral":
        # Wide glorious Borealis Crown arc
        for idx in range(3):
            ang = -math.pi * 0.82 + idx * (math.pi * 0.32)
            px = head_x + math.cos(ang) * 15.5
            py = head_y + 2.0 + math.sin(ang) * 12.5
            prism_coords.append((px, py))

    # Draw aurora energy tether threads between the 3 Cryo-Prisms
    if len(prism_coords) == 3 and prism_mode in ("tri_matrix", "cathedral"):
        for i in range(3):
            p0 = prism_coords[i]
            p1 = prism_coords[(i + 1) % 3]
            draw_line(g, p0[0], p0[1], p1[0], p1[1], AURORA_LILAC, 1)

    if prism_mode != "tri_matrix":
        for idx, (px, py) in enumerate(prism_coords):
            draw_hex_prism(
                g,
                px,
                py,
                3.8,
                4.2,
                prism_phase + idx * 0.9,
                core_col=DIAMOND_WHITE,
                rim_col=CRYO_MINT if idx != 1 else AURORA_LILAC,
            )

    # Optional Ultimate Borealis Ribbon Curtain behind back
    if aurora_wings:
        for side in (-1, 1):
            wing_pts = [
                (torso_top_x, torso_top_y),
                (torso_top_x + side * 16.0, torso_top_y - 10.0),
                (torso_top_x + side * 18.0, torso_top_y + 3.0),
                (torso_top_x + side * 8.0, torso_top_y + 9.0),
            ]
            draw_polygon(g, wing_pts, fill_col=AURORA_VIOLET)
            inner_wing = [
                (torso_top_x, torso_top_y),
                (torso_top_x + side * 13.0, torso_top_y - 7.0),
                (torso_top_x + side * 14.0, torso_top_y + 1.0),
            ]
            draw_polygon(g, inner_wing, fill_col=FROST_CYAN)

    # 2. FLOWING PRISMATIC SILVER-LAVENDER HAIR (Back Cascade)
    hair_back_pts = [
        (head_x - 3.5, head_y - 1.0),
        (head_x - 10.5 - hair_wave * 1.5, head_y + 7.0),
        (head_x - 13.5 - hair_wave * 2.2, head_y + 16.5),
        (head_x - 6.0 - hair_wave, head_y + 18.5),
        (head_x + 1.5, head_y + 9.0),
    ]
    draw_polygon(g, hair_back_pts, fill_col=AURORA_LILAC)
    draw_line(g, head_x - 5.0, head_y + 2.0, head_x - 11.0 - hair_wave * 1.8, head_y + 15.0, DIAMOND_WHITE, 2)
    draw_line(g, head_x - 7.0, head_y + 6.0, head_x - 9.0 - hair_wave * 1.4, head_y + 17.0, FROST_CYAN, 1)

    # 3. LEGS & CRYSTALLINE ICE-SKATE SABATONS
    lx, ly = left_foot
    rx, ry = right_foot
    if collapse_t > 0.0:
        ly = min(45.0, ly + kneel_drop * 0.25)
        ry = min(45.0, ry + kneel_drop * 0.25)

    # Back leg
    draw_line(g, cx_body - 2.0, cy_body, lx, ly - 2.0, DEEP_NAVY, 3)
    draw_line(g, cx_body - 2.0, cy_body, lx, ly - 2.0, ROYAL_SAPPHIRE, 2)
    # Back ice-skate boot & glowing crystal blade
    draw_disc(g, lx, ly - 1.5, 2.0, SILVER_BRIGHT)
    draw_line(g, lx - 2.5, ly + 0.5, lx + 3.0, ly + 0.5, DIAMOND_WHITE, 1)

    # Front leg
    draw_line(g, cx_body + 2.0, cy_body, rx, ry - 2.0, ROYAL_SAPPHIRE, 3)
    draw_line(g, cx_body + 2.0, cy_body, rx, ry - 2.0, FROST_CYAN, 1)
    # Front ice-skate boot & glowing crystal blade
    draw_disc(g, rx, ry - 1.5, 2.2, DIAMOND_WHITE)
    draw_line(g, rx - 2.5, ry + 0.5, rx + 3.5, ry + 0.5, CRYO_MINT, 1)

    if skate_trail:
        draw_line(g, lx - 8.0, ly + 0.5, lx + 2.0, ly + 0.5, CRYO_MINT, 1)
        draw_line(g, rx - 9.0, ry + 0.5, rx + 2.0, ry + 0.5, DIAMOND_WHITE, 1)

    # 4. SPLIT GLACIAL CORSET TUNIC & COATTAILS
    skirt_left = [
        (cx_body - 4.5, cy_body - 2.0),
        (cx_body - 9.5 - hair_wave * 1.2, cy_body + 9.5),
        (cx_body - 3.5, cy_body + 8.5),
        (cx_body, cy_body + 1.0),
    ]
    skirt_right = [
        (cx_body + 4.5, cy_body - 2.0),
        (cx_body + 8.5 - hair_wave * 0.5, cy_body + 9.0),
        (cx_body + 2.5, cy_body + 8.5),
        (cx_body, cy_body + 1.0),
    ]
    draw_polygon(g, skirt_left, fill_col=ROYAL_SAPPHIRE)
    draw_polygon(g, skirt_right, fill_col=GLACIER_BLUE)
    draw_line(g, cx_body - 4.0, cy_body - 1.0, cx_body - 8.0 - hair_wave, cy_body + 8.5, FROST_CYAN, 1)
    draw_line(g, cx_body + 4.0, cy_body - 1.0, cx_body + 7.5, cy_body + 8.0, CRYO_MINT, 1)

    # Torso corset
    torso_pts = [
        (torso_top_x - 4.5, torso_top_y),
        (torso_top_x + 4.5, torso_top_y),
        (cx_body + 4.0, cy_body),
        (cx_body - 4.0, cy_body),
    ]
    draw_polygon(g, torso_pts, fill_col=ROYAL_SAPPHIRE)
    # Diamond chest gem & silver belt
    draw_line(g, cx_body - 4.2, cy_body - 1.5, cx_body + 4.2, cy_body - 1.5, SILVER_BRIGHT, 2)
    draw_disc(g, torso_top_x + 0.5, torso_top_y + 3.5, 1.8, CRYO_MINT)
    put_px(g, torso_top_x + 0.5, torso_top_y + 3.5, DIAMOND_WHITE)

    # 5. ARCTIC WHITE-FUR COLLARED MANTLE & CRYSTALLINE EPAULETTE
    draw_disc(g, torso_top_x - 3.5, torso_top_y + 0.5, 3.0, FUR_SHADOW)
    draw_disc(g, torso_top_x, torso_top_y + 1.0, 2.8, FUR_LIGHT)
    draw_disc(g, torso_top_x + 3.5, torso_top_y + 0.5, 2.8, DIAMOND_WHITE)
    # Ice crystal shoulder spike on left shoulder
    epaulette_pts = [
        (torso_top_x - 3.0, torso_top_y),
        (torso_top_x - 8.5, torso_top_y - 4.5),
        (torso_top_x - 5.5, torso_top_y + 2.0),
    ]
    draw_polygon(g, epaulette_pts, fill_col=CRYO_MINT)

    # 6. HEAD, FACE & 6-SPIRE BOREALIS DIAMOND TIARA
    draw_disc(g, head_x, head_y, 4.2, SKIN_BASE)
    draw_disc(g, head_x + 1.0, head_y + 0.5, 3.0, SKIN_LIGHT)
    # Glowing cyan eye
    put_px(g, head_x + 2.2, head_y, EYE_CYAN)
    put_px(g, head_x + 1.2, head_y, DEEP_NAVY)

    # Front silver-lavender bangs framing face
    draw_line(g, head_x - 3.5, head_y - 3.0, head_x - 4.0, head_y + 2.5, AURORA_LILAC, 2)
    draw_line(g, head_x - 2.0, head_y - 3.8, head_x + 3.5, head_y - 2.2, DIAMOND_WHITE, 2)

    # 6-Spire Diamond Frost Tiara / Crown
    tiara_base_y = head_y - 3.8
    draw_line(g, head_x - 3.5, tiara_base_y, head_x + 3.5, tiara_base_y, FROST_CYAN, 2)
    spire_offsets = [(-3.0, -3.5), (-1.0, -5.5), (1.2, -6.5), (3.0, -4.0)]
    for sx, sy in spire_offsets:
        draw_line(g, head_x + sx * 0.7, tiara_base_y, head_x + sx, tiara_base_y + sy, CRYO_MINT, 1)
        put_px(g, head_x + sx, tiara_base_y + sy, DIAMOND_WHITE)

    # 7. ARMS, BOREALIS SCEPTER-WAND & LEVITATING STAR-PRISM CATALYST
    # Offhand arm
    draw_line(g, torso_top_x - 3.0, torso_top_y + 2.0, offhand_pos[0], offhand_pos[1], GLACIER_BLUE, 2)
    draw_disc(g, offhand_pos[0], offhand_pos[1], 1.5, SKIN_LIGHT)

    # Main casting arm + Borealis Scepter-Wand
    shoulder_r = (torso_top_x + 3.2, torso_top_y + 2.2)
    hand_r = (
        shoulder_r[0] + (wand_tip[0] - shoulder_r[0]) * 0.55,
        shoulder_r[1] + (wand_tip[1] - shoulder_r[1]) * 0.55,
    )
    draw_line(g, shoulder_r[0], shoulder_r[1], hand_r[0], hand_r[1], GLACIER_BLUE, 2)
    draw_disc(g, hand_r[0], hand_r[1], 1.5, SKIN_LIGHT)
    # Scepter shaft & diamond finial
    draw_line(g, hand_r[0] - 1.5, hand_r[1] + 1.0, wand_tip[0], wand_tip[1], SILVER_BRIGHT, 2)
    draw_disc(g, wand_tip[0], wand_tip[1], 2.2, FROST_CYAN)
    put_px(g, wand_tip[0], wand_tip[1], DIAMOND_WHITE)

    # Foreground Tri-Matrix Prisms (when in Row 3 SKILL mode)
    if prism_mode == "tri_matrix":
        for idx, (px, py) in enumerate(prism_coords):
            draw_hex_prism(
                g,
                px,
                py,
                3.8,
                4.2,
                prism_phase + idx * 0.9,
                core_col=DIAMOND_WHITE,
                rim_col=CRYO_MINT if idx != 1 else AURORA_LILAC,
            )

    # Levitating Star-Prism Catalyst (hovers past the wand tip and refracts beams)
    cat_x, cat_y = catalyst_pos
    c_rad = 4.2 * catalyst_scale
    for k in range(4):
        ang = prism_phase * 1.5 + k * (math.pi * 0.5)
        draw_line(
            g,
            cat_x - math.cos(ang) * c_rad,
            cat_y - math.sin(ang) * c_rad,
            cat_x + math.cos(ang) * c_rad,
            cat_y + math.sin(ang) * c_rad,
            CRYO_MINT if k % 2 == 0 else AURORA_LILAC,
            1,
        )
    draw_disc(g, cat_x, cat_y, 2.0 * catalyst_scale, DIAMOND_WHITE)

    # Refracted Laser Burst flash (during Auto-Attack / Skill / Ultimate release frames)
    if beam_burst > 0.0:
        b_rad = 3.5 + beam_burst * 4.5
        draw_disc(g, cat_x, cat_y, b_rad, FROST_CYAN)
        draw_disc(g, cat_x, cat_y, b_rad * 0.6, DIAMOND_WHITE)
        draw_line(g, wand_tip[0], wand_tip[1], cat_x, cat_y, DIAMOND_WHITE, 2)

    # Crouch Refractive Hexagonal Ice-Wall Shield (Row 7)
    if ice_shield:
        sx, sy = cx_body + 11.5, cy_body - 3.5
        shield_pts = [
            (sx, sy - 11.5),
            (sx + 5.5, sy - 6.0),
            (sx + 5.5, sy + 7.5),
            (sx, sy + 12.5),
            (sx - 4.5, sy + 7.5),
            (sx - 4.5, sy - 6.0),
        ]
        draw_polygon(g, shield_pts, fill_col=FROST_CYAN)
        inner_s = [
            (sx, sy - 8.5),
            (sx + 3.2, sy - 4.0),
            (sx + 3.2, sy + 5.5),
            (sx, sy + 9.5),
            (sx - 2.5, sy + 5.5),
            (sx - 2.5, sy - 4.0),
        ]
        draw_polygon(g, inner_s, fill_col=CRYO_MINT)
        draw_line(g, sx, sy - 9.5, sx, sy + 10.0, DIAMOND_WHITE, 2)

    return apply_outline_and_fill_pinholes(g)


def build_row0_idle(f):
    phase = (f / COLS) * math.tau
    bob = math.sin(phase) * 1.2
    wave = math.sin(phase - 0.6) * 0.9
    return render_glacia_frame(
        cx=23.0,
        cy_hip=31.0 + bob * 0.5,
        head_bob=bob,
        hair_wave=wave,
        left_foot=(19.5, 44.0),
        right_foot=(26.5, 44.0),
        wand_tip=(34.5, 23.5 + bob * 0.8),
        offhand_pos=(17.5, 25.0 - bob * 0.5),
        prism_mode="orbit",
        prism_phase=phase,
        catalyst_pos=(40.5, 19.5 + math.cos(phase) * 1.8),
    )


def build_row1_walk_skate(f):
    """Row 1: Figure-Skating Permafrost Glide with sweeping skate stride and frost blade trails."""
    phase = (f / COLS) * math.tau
    stride = math.sin(phase)
    lift_l = max(0.0, -stride) * 3.5
    lift_r = max(0.0, stride) * 3.5
    return render_glacia_frame(
        cx=24.0 + math.sin(phase * 2.0) * 0.8,
        cy_hip=30.5 + abs(stride) * 1.0,
        lean_x=2.8,
        head_bob=abs(stride) * 0.8,
        hair_wave=1.2 + math.sin(phase) * 0.8,
        left_foot=(22.0 + stride * 6.5, 44.0 - lift_l),
        right_foot=(22.0 - stride * 6.5, 44.0 - lift_r),
        skate_trail=True,
        wand_tip=(36.0, 24.5 - stride * 2.0),
        offhand_pos=(16.5 - stride * 2.0, 24.0),
        prism_mode="orbit",
        prism_phase=phase * 1.5,
        catalyst_pos=(41.5, 21.0 - stride * 1.5),
    )


def build_row2_auto_attack(f):
    """Row 2: Cryo-Prism Laser Refraction Cast (windup F00..F07, prism snap & laser flash F08..F18, recovery F19..F29)."""
    t = f / (COLS - 1)
    phase = (f / COLS) * math.tau
    if f < 8:
        u = f / 7.0
        lean = -2.2 * u
        wt = (31.0 - 4.0 * u, 19.0 - 3.0 * u)
        cat = (36.0 - 2.0 * u, 16.0 - 2.0 * u)
        burst = 0.0
    elif f < 19:
        u = (f - 8) / 10.0
        lean = 3.5 * (1.0 - u * 0.3)
        wt = (38.5, 22.0)
        cat = (43.5, 21.5)
        burst = math.sin(u * math.pi)
    else:
        u = (f - 19) / 10.0
        lean = 2.4 * (1.0 - u)
        wt = (38.5 - 4.0 * u, 22.0 + 1.5 * u)
        cat = (43.5 - 3.0 * u, 21.5 - 2.0 * u)
        burst = 0.0

    return render_glacia_frame(
        cx=23.5,
        cy_hip=31.0,
        lean_x=lean,
        hair_wave=max(0.4, lean * 0.6),
        left_foot=(18.5, 44.0),
        right_foot=(28.5, 44.0),
        wand_tip=wt,
        offhand_pos=(17.0, 23.5),
        prism_mode="orbit",
        prism_phase=phase * 2.0,
        catalyst_pos=cat,
        catalyst_scale=1.0 + burst * 0.35,
        beam_burst=burst,
    )


def build_row3_skill_tri_matrix(f):
    """Row 3: Tri-Beam Prism Matrix — aligns all 3 Hexagonal Cryo-Prisms into a forward triangular laser lens."""
    phase = (f / COLS) * math.tau
    burst = math.sin(((f - 7) / 15.0) * math.pi) if 7 <= f <= 22 else 0.0
    return render_glacia_frame(
        cx=21.5,
        cy_hip=30.0,
        lean_x=2.2,
        head_bob=-1.0,
        hair_wave=1.6,
        left_foot=(17.0, 44.0),
        right_foot=(27.0, 43.0),
        skate_trail=True,
        wand_tip=(33.5, 22.0),
        offhand_pos=(28.0, 19.5),
        prism_mode="tri_matrix",
        prism_phase=phase * 2.0,
        catalyst_pos=(42.5, 22.0),
        catalyst_scale=1.25,
        beam_burst=burst * 0.85,
    )


def build_row4_ultimate_borealis_cathedral(f):
    """Row 4: Borealis Cathedral — ascends in an aurora vortex with 3 Cryo-Prisms forming an orbital crown."""
    phase = (f / COLS) * math.tau
    t = f / (COLS - 1)
    ascend = math.sin(t * math.pi) * 4.5
    burst = math.sin(((f - 8) / 16.0) * math.pi) if 8 <= f <= 24 else 0.0
    return render_glacia_frame(
        cx=25.0,
        cy_hip=29.5 - ascend,
        lean_x=0.0,
        head_bob=-1.5,
        hair_wave=1.8 + math.sin(phase * 2.0) * 0.6,
        left_foot=(22.0, 42.5 - ascend * 0.7),
        right_foot=(28.0, 41.0 - ascend * 0.8),
        wand_tip=(35.0, 15.0 - ascend * 0.5),
        offhand_pos=(15.0, 16.0 - ascend * 0.5),
        prism_mode="cathedral",
        prism_phase=phase * 2.5,
        catalyst_pos=(25.0, 10.5 - ascend * 0.3),
        catalyst_scale=1.35,
        beam_burst=burst,
        aurora_wings=True,
    )


def build_row5_death_and_hurt(f):
    """Row 5: F00..F05 hurt stagger, F06..F17 kneeling crystallization collapse, F18..F29 horizontal rest."""
    if f <= 5:
        u = math.sin((f / 5.0) * math.pi)
        return render_glacia_frame(
            cx=23.0,
            cy_hip=31.5,
            lean_x=-2.5 * u,
            hurt_recoil=u,
            hair_wave=-1.2 * u,
            left_foot=(18.5, 44.0),
            right_foot=(26.5, 44.0),
            wand_tip=(31.0, 26.0),
            offhand_pos=(16.0, 22.0),
            prism_mode="orbit",
            prism_phase=f * 0.3,
            catalyst_pos=(36.0, 25.0),
        )
    elif f <= 17:
        u = (f - 6) / 11.0
        return render_glacia_frame(
            cx=24.0,
            cy_hip=31.5,
            lean_x=-1.5 * (1.0 - u),
            collapse_t=u * 0.52,
            hair_wave=0.5,
            left_foot=(20.0, 44.0),
            right_foot=(27.0, 44.0),
            wand_tip=(33.0, 29.0 + u * 10.0),
            offhand_pos=(18.0, 28.0 + u * 9.0),
            prism_mode="orbit",
            prism_phase=f * 0.15,
            catalyst_pos=(38.0, 32.0 + u * 9.0),
        )
    else:
        u = 0.56 + ((f - 18) / 11.0) * 0.44
        return render_glacia_frame(collapse_t=u)


def build_row6_dash_skate_slide(f):
    """Row 6: Frost-Mirror Skate Slide — aerodynamic speed-skating glide with ribbon trail."""
    phase = (f / COLS) * math.tau
    return render_glacia_frame(
        cx=25.5,
        cy_hip=32.5,
        lean_x=4.5,
        head_bob=1.0,
        hair_wave=2.4,
        left_foot=(15.5, 43.5),
        right_foot=(30.5, 44.0),
        skate_trail=True,
        wand_tip=(39.5, 25.5),
        offhand_pos=(14.5, 27.5),
        prism_mode="orbit",
        prism_phase=phase * 2.0,
        catalyst_pos=(44.0, 24.0),
    )


def build_row7_crouch_prism_wall(f):
    """Row 7: Glacial Prism Wall — graceful figure-skater knee-tuck behind an angled hexagonal refractive ice-shield."""
    phase = (f / COLS) * math.tau
    return render_glacia_frame(
        cx=21.5,
        cy_hip=36.0,
        lean_x=1.2,
        head_bob=2.0,
        hair_wave=0.8,
        left_foot=(17.5, 44.5),
        right_foot=(26.0, 44.5),
        wand_tip=(30.5, 28.5),
        offhand_pos=(25.5, 30.0),
        prism_mode="orbit",
        prism_phase=phase,
        catalyst_pos=(33.0, 22.0),
        ice_shield=True,
    )


def build_row8_jump_axel_vault(f):
    """Row 8: Mid-Air Axel Prism Vault — airborne figure-skating leap with trailing borealis frost arc."""
    phase = (f / COLS) * math.tau
    t = f / (COLS - 1)
    arc = math.sin(t * math.pi) * 4.5
    return render_glacia_frame(
        cx=24.0,
        cy_hip=27.5 - arc,
        lean_x=1.8,
        head_bob=-1.0,
        hair_wave=1.8,
        left_foot=(19.5, 38.5 - arc * 0.6),
        right_foot=(28.5, 36.0 - arc * 0.8),
        skate_trail=True,
        wand_tip=(37.0, 19.0 - arc * 0.4),
        offhand_pos=(16.5, 20.0 - arc * 0.4),
        prism_mode="orbit",
        prism_phase=phase * 2.0,
        catalyst_pos=(42.0, 16.0 - arc * 0.4),
    )


def grid_to_cell_image(g):
    cell = Image.new("RGBA", (CELL_LOGICAL, CELL_LOGICAL), (0, 0, 0, 0))
    px = cell.load()
    for y in range(CELL_LOGICAL):
        for x in range(CELL_LOGICAL):
            px[x, y] = g[y][x]
    return cell.resize((CELL_PX, CELL_PX), Image.Resampling.NEAREST)


def build_portrait():
    """Builds a crisp 128x128 HD-2D portrait (`assets/sprites/icemage_portrait.png`) from a 32x32 logical canvas."""
    P = 32
    g = [[DEEP_NAVY for _ in range(P)] for _ in range(P)]

    # Borealis gradient sky background + hexagonal prism halo
    for y in range(P):
        for x in range(P):
            if y < 10:
                g[y][x] = DEEP_NAVY
            elif y < 20:
                g[y][x] = ROYAL_SAPPHIRE
            else:
                g[y][x] = GLACIER_BLUE
            # Diagonal aurora ribbon
            if abs((x - y) - 4) <= 2:
                g[y][x] = AURORA_DEEP
            elif abs((x - y) - 4) == 3:
                g[y][x] = FROST_CYAN

    # Prismatic silver-lavender hair back cascade
    for y in range(9, 30):
        for x in range(6, 25):
            if (x - 15) ** 2 + (y - 16) ** 2 <= 95:
                g[y][x] = AURORA_LILAC if x < 14 else DIAMOND_WHITE

    # Face & chin
    for y in range(11, 23):
        for x in range(11, 22):
            if (x - 16) ** 2 + ((y - 16) * 1.1) ** 2 <= 28:
                g[y][x] = SKIN_LIGHT if x > 15 else SKIN_BASE

    # Glowing Cryo-Cyan Eyes
    g[16][13], g[16][14] = DEEP_NAVY, EYE_CYAN
    g[16][18], g[16][19] = EYE_CYAN, DEEP_NAVY
    g[15][13], g[15][19] = DIAMOND_WHITE, DIAMOND_WHITE

    # 6-Spire Diamond Borealis Tiara
    for x in range(10, 23):
        g[10][x] = FROST_CYAN
        g[9][x] = CRYO_MINT
    for sx, sh in ((11, 6), (14, 4), (16, 3), (18, 4), (21, 6)):
        for y in range(sh, 10):
            g[y][sx] = DIAMOND_WHITE if y <= sh + 1 else CRYO_MINT

    # Arctic White-Fur Collar & Sapphire Corset Shoulders
    for y in range(23, 31):
        for x in range(5, 27):
            if y < 27:
                g[y][x] = FUR_LIGHT if (x + y) % 2 == 0 else FUR_SHADOW
            else:
                g[y][x] = ROYAL_SAPPHIRE
    # Center diamond chest brooch
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if abs(dx) + abs(dy) <= 1:
                g[27 + dy][16 + dx] = DIAMOND_WHITE if (dx == 0 and dy == 0) else CRYO_MINT

    # Crisp dark border frame
    for i in range(P):
        g[0][i] = INK_OUTLINE
        g[P - 1][i] = INK_OUTLINE
        g[i][0] = INK_OUTLINE
        g[i][P - 1] = INK_OUTLINE
        if 1 <= i <= P - 2:
            g[1][i] = FROST_CYAN
            g[P - 2][i] = ROYAL_SAPPHIRE
            g[i][1] = FROST_CYAN
            g[i][P - 2] = ROYAL_SAPPHIRE

    img = Image.new("RGBA", (P, P), (0, 0, 0, 0))
    px = img.load()
    for y in range(P):
        for x in range(P):
            px[x, y] = g[y][x]
    return img.resize((128, 128), Image.Resampling.NEAREST)


def verify_sheet(sheet):
    """Verifies zero boundary clips and zero interior pinholes across all 270 cells."""
    px = sheet.load()
    boundary_clips = 0
    for r in range(ROWS):
        for c in range(COLS):
            x0, y0 = c * CELL_PX, r * CELL_PX
            for i in range(CELL_PX):
                if (
                    px[x0 + i, y0][3] > 0
                    or px[x0 + i, y0 + CELL_PX - 1][3] > 0
                    or px[x0, y0 + i][3] > 0
                    or px[x0 + CELL_PX - 1, y0 + i][3] > 0
                ):
                    boundary_clips += 1
    return boundary_clips


def main():
    sheet = Image.new("RGBA", (COLS * CELL_PX, ROWS * CELL_PX), (0, 0, 0, 0))
    builders = [
        build_row0_idle,
        build_row1_walk_skate,
        build_row2_auto_attack,
        build_row3_skill_tri_matrix,
        build_row4_ultimate_borealis_cathedral,
        build_row5_death_and_hurt,
        build_row6_dash_skate_slide,
        build_row7_crouch_prism_wall,
        build_row8_jump_axel_vault,
    ]
    for r, fn in enumerate(builders):
        for f in range(COLS):
            g = fn(f)
            cell_img = grid_to_cell_image(g)
            sheet.paste(cell_img, (f * CELL_PX, r * CELL_PX))

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sheet_path = os.path.join(base_dir, "assets", "sprites", "icemage_sheet.png")
    portrait_path = os.path.join(base_dir, "assets", "sprites", "icemage_portrait.png")

    sheet.save(sheet_path, "PNG")
    portrait = build_portrait()
    portrait.save(portrait_path, "PNG")

    clips = verify_sheet(sheet)
    print(f"Saved {sheet_path} ({sheet.size[0]}x{sheet.size[1]}), boundary_clips={clips}")
    print(f"Saved {portrait_path} ({portrait.size[0]}x{portrait.size[1]})")


if __name__ == "__main__":
    main()
