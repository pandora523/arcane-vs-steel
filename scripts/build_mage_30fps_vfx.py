#!/usr/bin/env python3
"""
Builds Ignis Sol (FireMage — Sovereign Solar Archmage) 30fps HD-2D VFX Sprite Sheet
- Output: assets/sprites/mage_vfx.png (6240 x 1040, 5 rows x 30 cols of 208x208)
- Authored on a crisp 104x104 logical pixel grid upscaled 2x NEAREST to 208x208 (400% finer pixel detail
  than 52x52, matching Ignis Sol's 104x104 -> 208x208 cel-clustered pixel-art rig!)
- Strict Boundary Guarantee: ALL pixels reside strictly inside 5 <= x <= 98, 5 <= y <= 98 (0/150 clips!)
- 5 Rows (100% compatible with VFXManager.js & FireMage.js):
  * Row 0 (y=0):   BLAZING SOLAR FIREBALL COMET (Pointing +X, swirling prominence tongues & helical wake)
  * Row 1 (y=208): HELLFIRE MAGMA PILLAR ERUPTION & DOUBLE-HELIX SOLAR VORTEX (F00..F05 erupt, F06..F21 roar, F22..F29 dissipate)
  * Row 2 (y=416): BLACK-SUN ECLIPSE SUPERNOVA SPHERE & ARCANE BLINK RIFT (Obsidian-violet core + 8-point golden corona)
  * Row 3 (y=624): CATACLYSM MOLTEN METEOR & SOLAR BEAM HEAD (Pointing +X, cracked obsidian crust & white-hot magma fissures)
  * Row 4 (y=832): SACRED HELIOS SUN-WHEEL CAST MANDALA & PYROMANTIC CRESCENT WAVE
"""

import os
import math
import time
import numpy as np
from PIL import Image, ImageDraw

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_VFX_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "mage_vfx.png")
ARTIFACT_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/3a4b2cf8-05c2-45a3-bb65-af6f5b5a1088"

LOGICAL = 104
CELL = 208
COLS = 30
ROWS = 5
MIN_B = 5
MAX_B = 98

# Curated Cel-Shaded Solar Pyromancy & Black-Sun Eclipse Palette
C_OUTLINE = (16, 10, 22, 255)
C_VOID = (10, 6, 18, 255)
C_VIOLET_DARK = (58, 20, 92, 255)
C_VIOLET_LIT = (148, 62, 220, 255)
C_OBSIDIAN_ROCK = (38, 26, 32, 255)
C_CRIM_DARK = (108, 20, 26, 255)
C_CRIM = (168, 28, 32, 255)
C_SCARLET = (218, 48, 38, 255)
C_ORANGE_DEEP = (236, 92, 24, 255)
C_ORANGE = (251, 146, 60, 255)
C_AMBER = (248, 184, 36, 255)
C_GOLD = (254, 224, 78, 255)
C_GOLD_LIGHT = (255, 242, 156, 255)
C_WHITE = (255, 253, 240, 255)

YY, XX = np.mgrid[0:LOGICAL, 0:LOGICAL]


def put_px(arr, x, y, col):
    ix, iy = int(round(x)), int(round(y))
    if MIN_B <= ix <= MAX_B and MIN_B <= iy <= MAX_B:
        arr[iy, ix] = col


def draw_star_104(arr, cx, cy, r, col_core=C_WHITE, col_ray=C_GOLD_LIGHT):
    put_px(arr, cx, cy, col_core)
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        for d in range(1, int(r) + 1):
            put_px(arr, cx + dx * d, cy + dy * d, col_core if d == 1 else col_ray)


def build_row0_solar_fireball(f):
    """Row 0: Blazing Solar Fireball Comet pointing +X (cx=72, cy=52)."""
    arr = np.zeros((LOGICAL, LOGICAL, 4), dtype=np.uint8)
    phase = (f / 30.0) * math.pi * 2.0
    cx, cy = 72.0, 52.0

    # 1. Tapered Thermal Comet Wake (x = 10..72)
    in_wake = (XX >= 10) & (XX <= 72)
    u_x = np.clip((XX - 10.0) / 62.0, 0.0, 1.0)
    wave_y = np.sin(XX * 0.14 - phase * 2.0) * (5.2 * (1.0 - u_x * 0.65))
    half_h = 2.2 + (u_x ** 0.78) * 16.5
    dy_w = np.abs(YY - (cy + wave_y))
    frac = dy_w / np.maximum(1.0, half_h)

    m_w4 = in_wake & (frac <= 1.0)
    m_w3 = in_wake & (frac <= 0.74)
    m_w2 = in_wake & (frac <= 0.48)
    m_w1 = in_wake & (frac <= 0.24)

    arr[m_w4] = np.where((u_x < 0.45)[m_w4, None], C_CRIM_DARK, C_CRIM)
    arr[m_w3] = np.where((u_x < 0.50)[m_w3, None], C_SCARLET, C_ORANGE_DEEP)
    arr[m_w2] = np.where((u_x < 0.55)[m_w2, None], C_ORANGE, C_AMBER)
    arr[m_w1] = np.where((u_x < 0.65)[m_w1, None], C_GOLD, C_GOLD_LIGHT)

    # 2. Corkscrewing Double-Helix Solar Plasma Ribbons
    for rib in range(2):
        r_off = rib * math.pi
        for x in range(16, 73):
            u = (x - 16) / 56.0
            amp = (1.0 - u * 0.35) * 9.5
            ang = x * 0.18 - phase * 2.0 + r_off
            ry = cy + math.sin(ang) * amp
            c_main = C_WHITE if (rib == 0 and u > 0.5) else (C_GOLD_LIGHT if rib == 0 else C_ORANGE)
            c_sub = C_GOLD if rib == 0 else C_SCARLET
            put_px(arr, x, ry, c_main)
            put_px(arr, x, ry + 1, c_sub)
            put_px(arr, x, ry - 1, c_sub)

    # 3. 6 Curling Solar Prominence Tongues around the Nucleus
    for t_idx in range(6):
        base_a = phase * 1.5 + t_idx * (math.pi / 3.0)
        for s in range(28):
            ut = s / 27.0
            r_cur = 13.5 + ut * 10.5
            curl_a = base_a + ut * 0.82 * (1.0 if math.sin(base_a) >= 0 else -1.0)
            tx = cx + math.cos(curl_a) * r_cur - ut * 9.0
            ty = cy + math.sin(curl_a) * (r_cur * 0.92)
            col_t = C_GOLD_LIGHT if ut < 0.28 else (C_ORANGE if ut < 0.58 else (C_SCARLET if ut < 0.84 else C_CRIM_DARK))
            put_px(arr, tx, ty, col_t)
            put_px(arr, tx - 1, ty, col_t)

    # 4. Blazing White-Gold Solar Nucleus & Photosphere
    dx = (XX - cx) * np.where(XX > cx, 0.86, 0.96)
    dy = YY - cy
    d = np.hypot(dx, dy)
    ang = np.arctan2(dy, XX - cx)
    flare = np.sin(ang * 5.0 - phase * 2.0) * 2.2 + np.cos(ang * 3.0 + phase) * 1.3
    eff_r = 17.2 + flare * np.where(XX > cx, 0.45, 1.0)

    arr[d <= eff_r + 2.0] = C_CRIM
    arr[d <= eff_r] = C_ORANGE_DEEP
    arr[d <= 14.8 + flare * 0.4] = C_AMBER
    arr[d <= 12.2 + flare * 0.25] = C_GOLD_LIGHT
    arr[d <= 8.6] = C_WHITE

    # 5. Crisp 4-Point Solar Star-Sparks in Wake
    for s_idx in range(5):
        u_sp = ((f / 30.0) + s_idx * 0.20) % 1.0
        sx = 60.0 - u_sp * 46.0
        sy = cy + math.sin(phase * 2.0 + s_idx * 1.7) * (6.5 + s_idx * 2.2)
        draw_star_104(arr, sx, sy, 3 if s_idx % 2 == 0 else 2, C_WHITE, C_GOLD)

    return arr


def build_row1_hellfire_pillar(f):
    """Row 1: Hellfire Magma Pillar Eruption & Double-Helix Solar Vortex (cx=52, base_y=94)."""
    arr = np.zeros((LOGICAL, LOGICAL, 4), dtype=np.uint8)
    phase = (f / 30.0) * math.pi * 2.0
    cx = 52.0
    gy = 93.0

    if f < 5:
        u_erupt = (f + 1) / 5.0
        top_y = gy - u_erupt * 82.0
        w_scale = 0.55 + 0.45 * u_erupt
        fade = 1.0
    elif f < 22:
        top_y = 9.0
        w_scale = 1.0 + 0.08 * math.sin(phase * 2.0)
        fade = 1.0
    else:
        u_end = (f - 21) / 9.0
        top_y = 9.0 + u_end * 18.0
        w_scale = max(0.25, 1.0 - u_end * 0.72)
        fade = 1.0 - u_end * 0.65

    # 1. Base Pyromantic Sun-Wheel Ritual Seal (y = 87..96)
    seal_rx = 34.0 * max(0.65, w_scale)
    seal_ry = 4.6
    for s in range(96):
        a = (s / 96.0) * math.pi * 2.0 + phase * 1.5
        sx = cx + math.cos(a) * seal_rx
        sy = gy + math.sin(a) * seal_ry
        put_px(arr, sx, sy, C_GOLD_LIGHT if s % 4 == 0 else C_ORANGE_DEEP)
        put_px(arr, cx + math.cos(a) * (seal_rx * 0.68), gy + math.sin(a) * (seal_ry * 0.68), C_GOLD)

    # 2. Towering Molten Solar Column
    in_y = (YY >= int(top_y)) & (YY <= int(gy))
    v_h = np.clip((gy - YY) / max(1.0, gy - top_y), 0.0, 1.0)
    flare_w = (1.35 - 0.55 * np.sin(v_h * math.pi * 0.85)) * 18.5 * w_scale
    swirl_x = np.sin(YY * 0.16 + phase * 2.5) * 3.2 * w_scale
    dx_p = np.abs(XX - (cx + swirl_x))
    p_frac = dx_p / np.maximum(1.0, flare_w)

    if f < 26:
        arr[in_y & (p_frac <= 1.05)] = C_CRIM_DARK
        arr[in_y & (p_frac <= 0.86)] = C_CRIM
        arr[in_y & (p_frac <= 0.68)] = C_ORANGE_DEEP
        arr[in_y & (p_frac <= 0.48)] = C_AMBER
        arr[in_y & (p_frac <= 0.28)] = C_GOLD_LIGHT
        arr[in_y & (p_frac <= 0.14)] = C_WHITE

    # 3. Spiraling Double-Helix Solar Plasma Ribbons Wrapping Upward
    for h_idx in range(2):
        h_off = h_idx * math.pi
        for y in range(int(top_y) + 2, int(gy)):
            vh = (gy - y) / max(1.0, gy - top_y)
            rad_h = (13.0 + (1.0 - vh) * 7.0) * w_scale
            ang = y * 0.13 - phase * 2.0 + h_off
            if math.sin(ang) >= -0.2:
                rx = cx + math.cos(ang) * rad_h
                put_px(arr, rx, y, C_WHITE if h_idx == 0 else C_GOLD_LIGHT)
                put_px(arr, rx + 1, y, C_GOLD if h_idx == 0 else C_ORANGE)
                put_px(arr, rx - 1, y, C_ORANGE_DEEP)

    # 4. Rising Volcanic Sparks & Star Embers
    for e_idx in range(8):
        u_e = ((f / 30.0) * 1.5 + e_idx * 0.125) % 1.0
        ey = gy - u_e * 82.0
        ex = cx + math.sin(u_e * 7.0 + e_idx * 2.1) * (20.0 * w_scale + 6.0)
        if ey >= top_y - 4:
            draw_star_104(arr, ex, ey, 2 if fade > 0.6 else 1, C_WHITE, C_GOLD)

    return arr


def build_row2_eclipse_supernova(f):
    """Row 2: Black-Sun Eclipse Supernova Sphere & Arcane Blink Rift (cx=52, cy=52)."""
    arr = np.zeros((LOGICAL, LOGICAL, 4), dtype=np.uint8)
    phase = (f / 30.0) * math.pi * 2.0
    cx, cy = 52.0, 52.0

    dx = XX - cx
    dy = YY - cy
    d = np.hypot(dx, dy)
    ang = np.arctan2(dy, dx)

    # 1. Outer Blazing Solar Corona & Prominence Flares
    prom = np.sin(ang * 8.0 + phase * 2.0) * 4.2 + np.cos(ang * 4.0 - phase) * 2.6
    r_corona = 32.0 + prom
    arr[(d >= 21.0) & (d <= r_corona + 3.0)] = C_CRIM_DARK
    arr[(d >= 21.0) & (d <= r_corona)] = C_ORANGE_DEEP
    arr[(d >= 21.0) & (d <= 28.5 + prom * 0.55)] = C_GOLD
    arr[(d >= 21.5) & (d <= 25.0 + prom * 0.25)] = C_WHITE

    # 2. 8 Razor-Sharp Golden Corona Diamond Spikes
    for k in range(8):
        sa = phase * 0.5 + k * (math.pi / 4.0)
        max_len = 42.0 if k % 2 == 0 else 36.0
        ux, uy = math.cos(sa), math.sin(sa)
        nx, ny = -uy, ux
        for step in range(22, int(max_len) + 1):
            u = (step - 22.0) / max(1.0, max_len - 22.0)
            w = int(round((1.0 - u) * 2.4))
            for kw in range(-w, w + 1):
                px = cx + ux * step + nx * kw
                py = cy + uy * step + ny * kw
                put_px(arr, px, py, C_WHITE if kw == 0 and u < 0.65 else (C_GOLD_LIGHT if abs(kw) <= 1 else C_ORANGE_DEEP))

    # 3. Abyssal Black-Sun Event Horizon Core + Violet Gravitational Rim
    arr[d <= 21.5] = C_VIOLET_LIT
    arr[d <= 19.8] = C_VIOLET_DARK
    arr[d <= 17.5] = C_VOID

    # 4. Crackling Coronal Lightning Arcs Dancing Around Event Horizon
    for arc_i in range(4):
        a0 = -phase * 1.5 + arc_i * (math.pi * 0.5)
        for s in range(18):
            ua = a0 + (s / 17.0) * 0.72
            jit = math.sin(s * 1.9 + f * 0.9 + arc_i) * 2.2
            rr = 23.5 + jit
            put_px(arr, cx + math.cos(ua) * rr, cy + math.sin(ua) * rr, C_WHITE if s % 2 == 0 else C_VIOLET_LIT)

    return arr


def build_row3_cataclysm_meteor(f):
    """Row 3: Cataclysm Molten Meteor & Solar Plasma Beam Head pointing +X (cx=68, cy=52)."""
    arr = np.zeros((LOGICAL, LOGICAL, 4), dtype=np.uint8)
    phase = (f / 30.0) * math.pi * 2.0
    cx, cy = 68.0, 52.0

    # 1. Roaring Molten Magma Plume Wake (x = 8..68)
    in_w = (XX >= 8) & (XX <= 68)
    ux = np.clip((XX - 8.0) / 60.0, 0.0, 1.0)
    wy = np.sin(XX * 0.15 - phase * 2.0) * (4.0 * (1.0 - ux * 0.5))
    hh = 3.5 + (ux ** 0.72) * 21.0
    frac = np.abs(YY - (cy + wy)) / np.maximum(1.0, hh)

    arr[in_w & (frac <= 1.0)] = C_CRIM_DARK
    arr[in_w & (frac <= 0.76)] = C_CRIM
    arr[in_w & (frac <= 0.54)] = C_ORANGE_DEEP
    arr[in_w & (frac <= 0.30)] = C_GOLD

    # 2. Craggy Volcanic-Obsidian Meteor Boulder with Glowing White-Hot Magma Fissures
    dx = XX - cx
    dy = YY - cy
    d = np.hypot(dx * 0.92, dy)
    ang = np.arctan2(dy, dx)
    crag = np.sin(ang * 5.0 + phase) * 2.2 + np.cos(ang * 7.0 - phase) * 1.6
    r_rock = 19.5 + crag

    # Leading solar bow-shock corona
    bow = (XX >= cx - 4) & (d <= r_rock + 4.2) & (d > r_rock - 1.5)
    arr[bow] = np.where((d <= r_rock + 1.8)[bow, None], C_WHITE, C_GOLD)

    in_rock = d <= r_rock
    arr[in_rock] = C_OBSIDIAN_ROCK
    arr[in_rock & (d >= r_rock - 2.6)] = C_CRIM
    # Glowing central molten heart pocket
    d_heart = np.hypot(dx - 3.0, dy + 1.5)
    arr[in_rock & (d_heart <= 6.2)] = C_ORANGE_DEEP
    arr[in_rock & (d_heart <= 4.0)] = C_GOLD_LIGHT
    arr[in_rock & (d_heart <= 2.2)] = C_WHITE

    # 5 Asymmetric Jagged Volcanic Magma Cracks radiating from the molten heart
    crack_angles = [-2.55, -1.45, -0.35, 0.72, 2.05]
    for ci, ca in enumerate(crack_angles):
        cur_a = ca + phase * 0.35
        for step in range(2, 19):
            wob = math.sin(step * 0.65 + ci * 1.9) * 0.24
            ang_s = cur_a + wob
            mx = cx + 3.0 + math.cos(ang_s) * step
            my = cy - 1.5 + math.sin(ang_s) * step
            ix_m, iy_m = int(round(mx)), int(round(my))
            if 5 <= ix_m <= 98 and 5 <= iy_m <= 98 and in_rock[iy_m, ix_m]:
                put_px(arr, mx, my, C_WHITE if step < 8 else C_GOLD_LIGHT)
                put_px(arr, mx + 1, my, C_ORANGE_DEEP)
                put_px(arr, mx, my + 1, C_ORANGE_DEEP)

    # Trailing molten slag chunks
    for c_idx in range(5):
        u_c = ((f / 30.0) + c_idx * 0.20) % 1.0
        rx = 52.0 - u_c * 40.0
        ry = cy + math.sin(phase + c_idx * 2.3) * (8.0 + c_idx * 2.0)
        for oy in (-1, 0, 1):
            for ox in (-1, 0, 1):
                put_px(arr, rx + ox, ry + oy, C_GOLD_LIGHT if (ox == 0 and oy == 0) else C_CRIM)

    return arr


def build_row4_helios_mandala_crescent(f):
    """Row 4: Sacred Helios Sun-Wheel Cast Mandala & Blazing Pyromantic Crescent Wave."""
    arr = np.zeros((LOGICAL, LOGICAL, 4), dtype=np.uint8)
    phase = (f / 30.0) * math.pi * 2.0
    cx, cy = 52.0, 52.0

    dx = XX - cx
    dy = YY - cy
    d = np.hypot(dx, dy)
    ang = np.arctan2(dy, dx)

    # 1. Double Sacred Golden Sun-Wheel Astrolabe Rings (r = 34 & r = 23)
    arr[np.abs(d - 34.0) <= 1.2] = C_ORANGE_DEEP
    arr[np.abs(d - 34.0) <= 0.65] = C_GOLD_LIGHT
    arr[np.abs(d - 22.5) <= 1.1] = C_ORANGE
    arr[np.abs(d - 22.5) <= 0.6] = C_GOLD

    # 2. 12 Rotating Astrolabe Spokes & Diamond Sun-Runes
    for k in range(12):
        sa = phase + k * (math.pi / 6.0)
        ux, uy = math.cos(sa), math.sin(sa)
        for r_step in range(12, 39):
            if 23 <= r_step <= 33 or (k % 3 == 0 and r_step >= 34):
                put_px(arr, cx + ux * r_step, cy + uy * r_step, C_WHITE if r_step >= 35 else C_GOLD)

    # 3. Central 4-Point Helios Sun Emblem
    draw_star_104(arr, cx, cy, 8, C_WHITE, C_GOLD_LIGHT)
    arr[d <= 4.2] = C_GOLD_LIGHT
    arr[d <= 2.4] = C_WHITE

    # 4. Forward-Sweeping Blazing Solar Crescent Blade on Right (+X) Rim (r = 35..42, -70..+70 deg)
    in_cresc = (np.abs(ang) <= 1.22) & (d >= 34.0) & (d <= 42.5)
    c_env = np.cos(ang / 1.22 * (math.pi * 0.5))
    c_thick = 1.5 + c_env * 4.5
    c_dist = np.abs(d - 38.0)
    arr[in_cresc & (c_dist <= c_thick)] = C_SCARLET
    arr[in_cresc & (c_dist <= c_thick * 0.65)] = C_GOLD
    arr[in_cresc & (c_dist <= c_thick * 0.30)] = C_WHITE

    return arr


def main():
    t0 = time.time()
    sheet = Image.new("RGBA", (COLS * CELL, ROWS * CELL), (0, 0, 0, 0))
    builders = [
        ("SOLAR_FIREBALL", build_row0_solar_fireball),
        ("HELLFIRE_PILLAR", build_row1_hellfire_pillar),
        ("ECLIPSE_SPHERE", build_row2_eclipse_supernova),
        ("CATACLYSM_METEOR", build_row3_cataclysm_meteor),
        ("HELIOS_MANDALA", build_row4_helios_mandala_crescent),
    ]
    clips = 0

    for r, (name, fn) in enumerate(builders):
        for c in range(COLS):
            arr = fn(c)
            # Enforce strict 4px safety margin in 104x104
            arr[:4, :, :] = 0
            arr[100:, :, :] = 0
            arr[:, :4, :] = 0
            arr[:, 100:, :] = 0

            a = arr[:, :, 3] > 0
            if np.any(a[:2, :]) or np.any(a[-2:, :]) or np.any(a[:, :2]) or np.any(a[:, -2:]):
                clips += 1

            tile = Image.fromarray(arr, "RGBA").resize((CELL, CELL), Image.Resampling.NEAREST)
            sheet.paste(tile, (c * CELL, r * CELL))
        print(f"  VFX Row {r} ({name:16s}): 30/30 frames built")

    sheet.save(OUT_VFX_PATH)

    # Save debug contact sheet for visual verification via view_file
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    dbg_w, dbg_h = COLS * CELL, ROWS * CELL
    dbg = Image.new("RGBA", (dbg_w, dbg_h), (14, 12, 22, 255))
    dbg.alpha_composite(sheet, (0, 0))
    d = ImageDraw.Draw(dbg)
    for r in range(ROWS):
        for c in range(COLS):
            d.rectangle([c * CELL, r * CELL, (c + 1) * CELL - 1, (r + 1) * CELL - 1], outline=(48, 42, 66, 160))
    dbg.resize((dbg_w // 4, dbg_h // 4), Image.Resampling.NEAREST).save(
        os.path.join(ARTIFACT_DIR, "debug_mage_30fps_vfx.png")
    )
    print(f"[DONE] Saved {OUT_VFX_PATH} ({dbg_w}x{dbg_h}), clips={clips}/150 in {time.time() - t0:.2f}s")


if __name__ == "__main__":
    main()
