#!/opt/homebrew/bin/python3.11
"""
Builds `assets/sprites/monster_vfx.png` (`6240 x 1664` RGBA = `30 cols x 8 rows` of `208x208` cells)
on a `104x104` logical pixel grid upscaled `2x Image.NEAREST` with `#0d0f1c` 1px Selout outlines,
hole sealing via `ex_sprite_clean_utils`, `0` empty cells, `0/240` 4px border clips, and `0` rotations.

Rows (`208x208` per cell):
  Row 0 (`sy=0`):    Sanctuary Eclipse Astral Star-Comet (`astrologer`)
  Row 1 (`sy=208`):  Sylvan Starwood Briar-Spear Wisp (`dryad`)
  Row 2 (`sy=416`):  Ossuary Void-Wraith Skull Bolt (`cultist` / `Morvath`)
  Row 3 (`sy=624`):  Blackpit Hellfire Brimstone Fireball (`Malphas` / Zone IV)
  Row 4 (`sy=832`):  Sanctuary / Sylvan Wide Crescent Slash Arc (`templar` / `treant`)
  Row 5 (`sy=1040`): Abyssal / Hellfire Wide Twin-Claw & Cleave Arc (`ghoul` / `fiend` / `brute`)
  Row 6 (`sy=1248`): Ground-Hugging Seismic Shockwave Crests (`Cols 0..9` Sanctuary, `10..19` Sylvan, `20..29` Blackpit)
  Row 7 (`sy=1456`): Colossal Abyssal Hellfire Cataclysm Pillar (`Malphas` `CATACLYSM`)
"""

from __future__ import annotations

import math
import os
import sys
import numpy as np
from PIL import Image

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from ex_sprite_clean_utils import seal_160_char_pinholes_and_leaks

L = 104
SCALE = 2
CELL = L * SCALE  # 208
COLS = 30
ROWS = 8
MIN_B = 4  # >= 8px margin at 208x208 (strictly 0/240 4px clips!)
MAX_B = L - 5

SELOUT = (13, 15, 28, 255)  # #0d0f1c


def hex_rgba(h: str) -> tuple[int, int, int, int]:
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)


P_SANCTUARY = {
    "deep": hex_rgba("#0369a1"),
    "mid": hex_rgba("#38bdf8"),
    "bright": hex_rgba("#fde047"),
    "hot": hex_rgba("#fef9c3"),
    "white": hex_rgba("#ffffff"),
}

P_SYLVAN = {
    "deep": hex_rgba("#065f46"),
    "mid": hex_rgba("#10b981"),
    "bright": hex_rgba("#6ee7b7"),
    "hot": hex_rgba("#d1fae5"),
    "white": hex_rgba("#ffffff"),
}

P_ABYSSAL = {
    "deep": hex_rgba("#4c1d95"),
    "mid": hex_rgba("#a855f7"),
    "bright": hex_rgba("#e879f9"),
    "hot": hex_rgba("#fae8ff"),
    "white": hex_rgba("#ffffff"),
}

P_HELLFIRE = {
    "deep": hex_rgba("#7f1d1d"),
    "crimson": hex_rgba("#ef4444"),
    "mid": hex_rgba("#fb923c"),
    "bright": hex_rgba("#fef08a"),
    "white": hex_rgba("#ffffff"),
}

P_CRESCENT_SANC = {
    "deep": hex_rgba("#0284c7"),
    "mid": hex_rgba("#38bdf8"),
    "mint": hex_rgba("#6ee7b7"),
    "bright": hex_rgba("#fef08a"),
    "white": hex_rgba("#ffffff"),
}

P_CRESCENT_ABYSS = {
    "deep": hex_rgba("#7f1d1d"),
    "mid": hex_rgba("#dc2626"),
    "orange": hex_rgba("#fb923c"),
    "purple": hex_rgba("#c084fc"),
    "bright": hex_rgba("#fef08a"),
    "white": hex_rgba("#ffffff"),
}


def new_grid() -> np.ndarray:
    return np.zeros((L, L, 4), dtype=np.uint8)


def put(arr: np.ndarray, x: float, y: float, col: tuple[int, int, int, int]) -> None:
    ix = int(round(x))
    iy = int(round(y))
    if MIN_B <= ix <= MAX_B and MIN_B <= iy <= MAX_B:
        arr[iy, ix] = col


def disc(arr: np.ndarray, cx: float, cy: float, r: float, col: tuple[int, int, int, int]) -> None:
    if r <= 0:
        return
    r2 = r * r
    x0 = max(MIN_B, int(math.floor(cx - r)))
    x1 = min(MAX_B, int(math.ceil(cx + r)))
    y0 = max(MIN_B, int(math.floor(cy - r)))
    y1 = min(MAX_B, int(math.ceil(cy + r)))
    for yy in range(y0, y1 + 1):
        dy = yy - cy
        for xx in range(x0, x1 + 1):
            dx = xx - cx
            if dx * dx + dy * dy <= r2:
                arr[yy, xx] = col


def seg_capsule(
    arr: np.ndarray,
    x0: float,
    y0: float,
    x1: float,
    y1: float,
    r0: float,
    r1: float,
    col: tuple[int, int, int, int],
) -> None:
    dist = math.hypot(x1 - x0, y1 - y0)
    steps = max(2, int(math.ceil(dist * 2.0)))
    for s in range(steps + 1):
        u = s / float(steps)
        disc(arr, x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, r0 + (r1 - r0) * u, col)


def add_selout_1px(arr: np.ndarray) -> np.ndarray:
    """Adds a crisp 1-logical-pixel #0d0f1c Selout border around opaque fill inside safe bounds."""
    opaque = arr[:, :, 3] >= 128
    dil = np.zeros_like(opaque)
    dil[1:, :] |= opaque[:-1, :]
    dil[:-1, :] |= opaque[1:, :]
    dil[:, 1:] |= opaque[:, :-1]
    dil[:, :-1] |= opaque[:, 1:]
    border = dil & (~opaque)
    # Clip border strictly inside MIN_B-1..MAX_B+1 so it still preserves >= 6px sheet padding!
    safe = np.zeros_like(border)
    safe[MIN_B - 1 : MAX_B + 2, MIN_B - 1 : MAX_B + 2] = True
    border &= safe
    out = arr.copy()
    out[border] = SELOUT
    return out


def finalize_cell(arr: np.ndarray) -> np.ndarray:
    arr = add_selout_1px(arr)
    arr = seal_160_char_pinholes_and_leaks(
        arr,
        max_pinhole_lpx=6,
        min_detached_lpx=2,
        max_orphan_lpx=0,
        safe_border_lpx=3,
    )
    return arr


def render_row0_sanctuary_comet(c: int) -> np.ndarray:
    arr = new_grid()
    ph = (c / float(COLS)) * math.pi * 2.0
    hx, hy = 70.0, 52.0 + math.sin(ph) * 1.5

    # Tapered 3-strand starry comet wake flowing from right head to left tail
    for layer, (r_mul, col) in enumerate([
        (1.0, P_SANCTUARY["deep"]),
        (0.68, P_SANCTUARY["mid"]),
        (0.36, P_SANCTUARY["bright"]),
    ]):
        for strand in (-1, 0, 1):
            amp = 2.6 if strand == 0 else 6.0
            phase_off = strand * 1.5
            for step in range(28):
                u = step / 27.0  # 0 at head -> 1 at tail
                x = hx - u * (48.0 - abs(strand) * 6.0)
                y = hy + math.sin(ph * 2.0 - u * 4.8 + phase_off) * amp * u + strand * (1.2 + u * 3.5)
                rad = (3.8 - u * 3.1) * r_mul
                if rad >= 0.9:
                    disc(arr, x, y, rad, col)

    # Spinning 8-point Sanctuary Astral Star-Prism Core
    for pass_scale, col in [
        (1.0, P_SANCTUARY["deep"]),
        (0.78, P_SANCTUARY["mid"]),
        (0.54, P_SANCTUARY["bright"]),
        (0.28, P_SANCTUARY["white"]),
    ]:
        disc(arr, hx, hy, 11.5 * pass_scale, col)
        for ray in range(8):
            ang = ph + ray * (math.pi / 4.0)
            r_len = (20.5 if ray % 2 == 0 else 13.5) * pass_scale
            seg_capsule(
                arr,
                hx,
                hy,
                hx + math.cos(ang) * r_len,
                hy + math.sin(ang) * r_len,
                3.2 * pass_scale,
                0.9,
                col,
            )

    # Orbiting crescent sigil shards & trailing pixel motes (>= 2x2)
    for m in range(3):
        ang = ph * 2.0 + m * (math.pi * 2.0 / 3.0)
        mx = hx - 8.0 + math.cos(ang) * 18.0
        my = hy + math.sin(ang) * 14.0
        disc(arr, mx, my, 2.0, P_SANCTUARY["bright"] if m != 0 else P_SANCTUARY["hot"])
        put(arr, mx, my, P_SANCTUARY["white"])
    return finalize_cell(arr)


def render_row1_sylvan_briar(c: int) -> np.ndarray:
    arr = new_grid()
    ph = (c / float(COLS)) * math.pi * 2.0
    hx, hy = 72.0, 52.0 + math.sin(ph) * 1.4

    # Spiraling twin thorny vine ribbons + leaf barbs
    for vine in (-1, 1):
        for col, rad_mul in [
            (P_SYLVAN["deep"], 1.0),
            (P_SYLVAN["mid"], 0.68),
            (P_SYLVAN["bright"], 0.36),
        ]:
            for step in range(28):
                u = step / 27.0
                x = hx - 6.0 - u * 48.0
                y = hy + math.sin(ph * 2.0 - u * 5.6 + (0 if vine == 1 else math.pi)) * (2.5 + u * 8.5)
                rad = (3.4 - u * 2.4) * rad_mul
                if rad >= 0.9:
                    disc(arr, x, y, rad, col)
                if step % 6 == 3 and rad_mul == 1.0:
                    tx = x - 3.0
                    ty = y + vine * 4.5
                    seg_capsule(arr, x, y, tx, ty, 1.5, 0.8, P_SYLVAN["mid"])
                    put(arr, tx, ty, P_SYLVAN["bright"])

    # Barbed emerald briar-spear arrowhead + bright petal aura
    for scale, col in [
        (1.0, P_SYLVAN["deep"]),
        (0.76, P_SYLVAN["mid"]),
        (0.50, P_SYLVAN["bright"]),
        (0.24, P_SYLVAN["white"]),
    ]:
        tip_x = hx + 16.0 * scale
        seg_capsule(arr, hx - 12.0 * scale, hy, tip_x, hy, 8.5 * scale, 1.6, col)
        for wing in (-1, 1):
            seg_capsule(
                arr,
                hx + 4.0 * scale,
                hy,
                hx - 14.0 * scale,
                hy + wing * 13.5 * scale,
                4.2 * scale,
                1.2,
                col,
            )

    # 3 fluttering briar petals in wake
    for k in range(3):
        u = ((c / float(COLS)) + k * 0.33) % 1.0
        px = hx - 10.0 - u * 44.0
        py = hy + math.sin(ph * 2.0 + k * 2.2 + u * 4.0) * 14.0
        disc(arr, px, py, 2.0, P_SYLVAN["bright"])
        put(arr, px + 1, py, P_SYLVAN["hot"])
    return finalize_cell(arr)


def render_row2_abyssal_skull(c: int) -> np.ndarray:
    arr = new_grid()
    ph = (c / float(COLS)) * math.pi * 2.0
    hx, hy = 70.0, 52.0 + math.sin(ph) * 1.5

    # Flickering void-flame mane & ribbon wisps trailing left
    for col, rmul in [
        (P_ABYSSAL["deep"], 1.0),
        (P_ABYSSAL["mid"], 0.72),
        (P_ABYSSAL["bright"], 0.42),
    ]:
        for t_idx in (-1, 0, 1):
            for step in range(26):
                u = step / 25.0
                x = hx - 4.0 - u * 46.0
                y = (
                    hy
                    + t_idx * (3.5 + u * 5.0)
                    + math.sin(ph * 2.0 - u * 5.2 + t_idx * 1.3) * (2.5 + u * 4.5)
                )
                r = (6.2 - u * 5.0) * rmul
                if r >= 0.9:
                    disc(arr, x, y, r, col)

    # Horned Void-Wraith Skull profile facing +X
    disc(arr, hx, hy - 2.0, 11.5, P_ABYSSAL["deep"])
    disc(arr, hx + 1.0, hy - 2.0, 9.5, P_ABYSSAL["mid"])
    disc(arr, hx + 2.0, hy - 3.0, 7.0, P_ABYSSAL["bright"])
    # Swept-back curved horns + cheekbone/snapping jaw
    for side in (-1, 1):
        seg_capsule(
            arr,
            hx - 2.0,
            hy - 8.0 if side < 0 else hy + 4.0,
            hx - 15.0,
            hy + side * 16.0,
            3.5,
            1.2,
            P_ABYSSAL["mid"] if side < 0 else P_ABYSSAL["deep"],
        )
        seg_capsule(
            arr,
            hx - 3.0,
            hy + side * 6.0,
            hx - 13.0,
            hy + side * 14.0,
            2.0,
            0.9,
            P_ABYSSAL["bright"],
        )
    # Snapping snout/jaw facing +X
    jaw_drop = 2.0 + math.sin(ph * 3.0) * 1.5
    seg_capsule(arr, hx + 2.0, hy - 2.0, hx + 13.0, hy - 1.0, 4.5, 2.5, P_ABYSSAL["bright"])
    seg_capsule(arr, hx + 1.0, hy + 4.0 + jaw_drop, hx + 11.0, hy + 4.0 + jaw_drop, 2.5, 1.5, P_ABYSSAL["mid"])
    # Piercing glowing eye & nasal spark
    disc(arr, hx + 6.0, hy - 4.0, 2.5, P_ABYSSAL["white"])
    disc(arr, hx + 4.0, hy - 5.0, 1.6, P_ABYSSAL["hot"])

    for s in range(3):
        u = ((c / float(COLS)) + s * 0.33) % 1.0
        sx = hx - 12.0 - u * 42.0
        sy = hy + math.cos(ph * 2.0 + s * 2.1) * 13.0
        disc(arr, sx, sy, 2.0, P_ABYSSAL["bright"])
    return finalize_cell(arr)


def render_row3_hellfire_fireball(c: int) -> np.ndarray:
    arr = new_grid()
    ph = (c / float(COLS)) * math.pi * 2.0
    hx, hy = 70.0, 52.0 + math.sin(ph) * 1.5

    # Roaring serpentine hellfire tail + flame tongues
    for col, rmul, xlen in [
        (P_HELLFIRE["deep"], 1.0, 52.0),
        (P_HELLFIRE["crimson"], 0.80, 46.0),
        (P_HELLFIRE["mid"], 0.56, 38.0),
        (P_HELLFIRE["bright"], 0.32, 26.0),
    ]:
        for t_idx in (-1, 0, 1):
            for step in range(28):
                u = step / 27.0
                x = hx - u * xlen
                wave = math.sin(ph * 2.0 - u * 5.8 + t_idx * 1.6) * (3.0 + u * 6.0)
                y = hy + t_idx * (3.2 + u * 4.5) + wave
                r = (9.5 - u * 8.2) * rmul
                if r >= 0.9:
                    disc(arr, x, y, r, col)

    # Asymmetric blazing molten fireball head facing +X
    disc(arr, hx, hy, 13.5, P_HELLFIRE["deep"])
    disc(arr, hx + 1.0, hy, 11.2, P_HELLFIRE["crimson"])
    # Crown flame spikes curving backward
    for sgn in (-1, 1):
        seg_capsule(
            arr,
            hx + 2.0,
            hy + sgn * 8.0,
            hx - 14.0,
            hy + sgn * (15.5 + math.sin(ph * 2.0 + sgn) * 2.5),
            4.5,
            1.2,
            P_HELLFIRE["crimson"],
        )
        seg_capsule(
            arr,
            hx + 2.0,
            hy + sgn * 6.0,
            hx - 10.0,
            hy + sgn * (12.0 + math.sin(ph * 2.0 + sgn) * 2.0),
            2.6,
            0.9,
            P_HELLFIRE["mid"],
        )
    disc(arr, hx + 2.0, hy, 8.2, P_HELLFIRE["mid"])
    disc(arr, hx + 3.0, hy, 5.4, P_HELLFIRE["bright"])
    disc(arr, hx + 4.0, hy, 2.8, P_HELLFIRE["white"])

    # Flying hot cinder embers >= 2x2
    for e in range(4):
        u = ((c / float(COLS)) + e * 0.25) % 1.0
        ex = hx - 8.0 - u * 46.0
        ey = hy + math.sin(ph * 2.0 + e * 1.8) * (10.0 + u * 6.0)
        disc(arr, ex, ey, 2.0, P_HELLFIRE["bright"] if e % 2 == 0 else P_HELLFIRE["mid"])
    return finalize_cell(arr)


def render_crescent_slash(c: int, pal: dict, jagged: bool) -> np.ndarray:
    arr = new_grid()
    u = c / float(COLS - 1)  # 0..1 progression
    cx, cy = 40.0, 52.0
    r_outer = 42.0 + math.sin(u * math.pi) * 4.0

    # Progressive arc window from top-back (-115 deg) sweeping through front (+10..+95 deg)
    head_ang = -1.75 + u * 3.15
    arc_len = 1.15 + math.sin(u * math.pi) * 1.25
    tail_ang = head_ang - arc_len
    n_pts = 44

    # Draw outer-to-inner multi-tone crescent ribbon (4 pure passes, 0 rectangular bars)
    max_thick = 11.5 if jagged else 10.0
    passes = (
        [
            (1.0, pal["deep"]),
            (0.76, pal["mid"]),
            (0.50, pal["orange"] if jagged else pal["mint"]),
            (0.30, pal["bright"]),
            (0.15, pal["white"]),
        ]
        if jagged
        else [
            (1.0, pal["deep"]),
            (0.74, pal["mid"]),
            (0.46, pal["mint"]),
            (0.28, pal["bright"]),
            (0.14, pal["white"]),
        ]
    )

    for scale_t, col in passes:
        for i in range(n_pts):
            frac = i / float(n_pts - 1)  # 0 = tail, 1 = leading blade tip
            ang = tail_ang + (head_ang - tail_ang) * frac
            taper = math.sin(frac * math.pi * 0.88) ** 0.72
            if jagged:
                taper *= 0.86 + 0.24 * abs(math.sin(frac * 18.0 + u * 6.0))
            rad = r_outer - (1.0 - scale_t) * max_thick * 0.38
            px = cx + math.cos(ang) * rad
            py = cy + math.sin(ang) * rad
            thickness = max(1.0, max_thick * taper * scale_t * 0.52)
            disc(arr, px, py, thickness, col)

    # Secondary inner parallel claw talon for jagged Row 5
    if jagged:
        r_inner = r_outer - 13.0
        for scale_t, col in [
            (0.92, pal["purple"]),
            (0.55, pal["orange"]),
            (0.24, pal["white"]),
        ]:
            for i in range(30):
                frac = i / 29.0
                ang = (tail_ang + 0.14) + ((head_ang - tail_ang) * 0.86) * frac
                taper = math.sin(frac * math.pi * 0.85) ** 0.8
                px = cx + math.cos(ang) * r_inner
                py = cy + math.sin(ang) * r_inner
                disc(arr, px, py, max(1.0, 4.2 * taper * scale_t), col)

    # Trailing crescent wind/ember motes
    for s in range(3):
        frac = 0.25 + s * 0.25
        ang = tail_ang + (head_ang - tail_ang) * frac - 0.18
        dist_r = r_outer - 18.0 - s * 3.0
        mx = cx + math.cos(ang) * dist_r
        my = cy + math.sin(ang) * dist_r
        disc(arr, mx, my, 2.0, pal["bright"])
    return finalize_cell(arr)


def render_row6_seismic_wave(c: int) -> np.ndarray:
    arr = new_grid()
    biome = c // 10  # 0 Sanctuary, 1 Sylvan, 2 Blackpit
    sub = c % 10
    ph = (sub / 10.0) * math.pi * 2.0

    if biome == 0:
        pal = P_SANCTUARY
        accent = P_SANCTUARY["bright"]
    elif biome == 1:
        pal = P_SYLVAN
        accent = P_SYLVAN["hot"]
    else:
        pal = {
            "deep": P_HELLFIRE["deep"],
            "mid": P_HELLFIRE["crimson"],
            "bright": P_HELLFIRE["mid"],
            "hot": P_HELLFIRE["bright"],
            "white": P_HELLFIRE["white"],
        }
        accent = P_HELLFIRE["bright"]

    # Ground-hugging crest anchored cleanly at ground baseline y ~ 88..94 facing +X
    base_y = 90.0
    front_x = 68.0 + math.sin(ph) * 4.0

    # Curved forward-leaning shockwave crest spine (4-tone cel steps)
    for col, off_x, r_mul in [
        (pal["deep"], -6.0, 1.0),
        (pal["mid"], -3.0, 0.74),
        (pal["bright"], 0.0, 0.45),
        (pal["white"], 2.0, 0.20),
    ]:
        # Tall main surge crest curving forward (+X)
        for i in range(26):
            u = i / 25.0  # 0 ground -> 1 crest peak
            x = front_x - 10.0 + u * u * 22.0 + off_x * (1.0 - u * 0.4)
            y = base_y - u * 56.0 + math.sin(ph + u * 2.2) * 1.8
            rad = (8.5 - u * 5.2) * r_mul
            disc(arr, x, y, max(1.0, rad), col)

        # Grounded base wake trailing left
        seg_capsule(
            arr,
            front_x - 42.0,
            base_y - 2.0,
            front_x - 2.0 + off_x,
            base_y - 3.0,
            3.5 * r_mul,
            5.5 * r_mul,
            col,
        )

    # Biome-specific jagged crystal/briar/obsidian teeth breaking the floor line
    teeth = 3
    for t in range(teeth):
        tx = front_x - 16.0 - t * 11.0 + math.cos(ph + t) * 2.0
        th = 16.0 + (2 - t) * 5.5 + math.sin(ph * 2.0 + t) * 3.0
        seg_capsule(arr, tx - 3.0, base_y, tx + 6.0, base_y - th, 4.2, 1.3, pal["deep"])
        seg_capsule(arr, tx - 2.0, base_y, tx + 5.0, base_y - th * 0.85, 2.4, 0.9, pal["mid"])
        put(arr, tx + 4.5, base_y - th * 0.82, accent)

    # Flying rock/petal splinters
    for s in range(3):
        u = ((sub / 10.0) + s * 0.33) % 1.0
        sx = front_x - 14.0 - u * 28.0
        sy = base_y - 12.0 - math.sin(u * math.pi) * 26.0 - s * 4.0
        disc(arr, sx, sy, 2.0, accent)
    return finalize_cell(arr)


def render_row7_cataclysm_pillar(c: int) -> np.ndarray:
    arr = new_grid()
    ph = (c / float(COLS)) * math.pi * 2.0
    cx = 52.0
    base_y = 92.0

    # 1. Ground-hugging obsidian/abyssal magma caldera ring
    for i in range(-18, 19):
        nx = i / 18.0
        rx = cx + nx * 28.0
        span_y = 6.5 * math.sqrt(max(0.0, 1.0 - nx * nx))
        disc(arr, rx, base_y - 1.0, max(1.8, span_y), P_ABYSSAL["deep"])
        disc(arr, rx, base_y - 2.0, max(1.2, span_y * 0.68), P_HELLFIRE["crimson"])
        disc(arr, rx, base_y - 2.5, max(0.8, span_y * 0.35), P_HELLFIRE["bright"])

    # 2. Rising erupting helical abyssal-hellfire pillar core (`y: 12..92`)
    for col, rmul in [
        (P_ABYSSAL["deep"], 1.0),
        (P_HELLFIRE["deep"], 0.86),
        (P_HELLFIRE["crimson"], 0.72),
        (P_HELLFIRE["mid"], 0.50),
        (P_HELLFIRE["bright"], 0.30),
        (P_HELLFIRE["white"], 0.14),
    ]:
        for step in range(36):
            u = step / 35.0  # 0 base -> 1 top
            y = base_y - 4.0 - u * 72.0
            sway = math.sin(ph * 2.0 - u * 5.2) * (2.5 + u * 4.0)
            width = (14.5 * (1.0 - u * 0.35) + math.sin(u * math.pi * 3.0 + ph) * 2.0) * rmul
            if width >= 1.0:
                disc(arr, cx + sway, y, width, col)

    # 3. Counter-twisting abyssal violet vortex flame ribbons wrapping pillar
    for helix in (-1, 1):
        for step in range(28):
            u = step / 27.0
            y = base_y - 6.0 - u * 66.0
            ang = ph * 2.0 + u * 6.2 + (0.0 if helix > 0 else math.pi)
            rx = cx + math.sin(ang) * (15.0 - u * 4.5)
            # Emphasize front crossings subtly via thickness/brightness
            is_front = math.cos(ang) > 0
            disc(
                arr,
                rx,
                y,
                3.2 if is_front else 2.2,
                P_ABYSSAL["bright"] if is_front else P_ABYSSAL["mid"],
            )
            if is_front and step % 3 == 0:
                put(arr, rx, y, P_ABYSSAL["hot"])

    # 4. Rising pillar sparks >= 2x2
    for s in range(4):
        u = ((c / float(COLS)) + s * 0.25) % 1.0
        sy = base_y - 12.0 - u * 70.0
        sx = cx + math.cos(ph * 2.0 + s * 1.7 + u * 4.0) * 19.0
        disc(arr, sx, sy, 2.0, P_HELLFIRE["bright"] if s % 2 == 0 else P_ABYSSAL["bright"])
    return finalize_cell(arr)


ROW_RENDERERS = [
    render_row0_sanctuary_comet,
    render_row1_sylvan_briar,
    render_row2_abyssal_skull,
    render_row3_hellfire_fireball,
    lambda c: render_crescent_slash(c, P_CRESCENT_SANC, False),
    lambda c: render_crescent_slash(c, P_CRESCENT_ABYSS, True),
    render_row6_seismic_wave,
    render_row7_cataclysm_pillar,
]


def main() -> None:
    out_path = os.path.join(ROOT_DIR, "assets", "sprites", "monster_vfx.png")
    sheet = np.zeros((ROWS * CELL, COLS * CELL, 4), dtype=np.uint8)

    empty_cells = 0
    clip4_cells = 0
    row_transitions = []

    for r in range(ROWS):
        fn = ROW_RENDERERS[r]
        prev_up = None
        first_up = None
        trans = 0
        for c in range(COLS):
            cell_l = fn(c)
            # 2x Image.NEAREST lossless upscale to 208x208
            up_pil = Image.fromarray(cell_l, "RGBA").resize((CELL, CELL), Image.NEAREST)
            up = np.array(up_pil, dtype=np.uint8)

            # Audit cell non-empty & 4px border margin
            nz = int((up[:, :, 3] >= 128).sum())
            if nz == 0:
                empty_cells += 1
            b_nz = int(
                (up[:4, :, 3] > 0).sum()
                + (up[-4:, :, 3] > 0).sum()
                + (up[:, :4, 3] > 0).sum()
                + (up[:, -4:, 3] > 0).sum()
            )
            if b_nz > 0:
                clip4_cells += 1

            y0, x0 = r * CELL, c * CELL
            sheet[y0 : y0 + CELL, x0 : x0 + CELL] = up

            if prev_up is not None and not np.array_equal(prev_up, up):
                trans += 1
            if c == 0:
                first_up = up
            prev_up = up
        row_transitions.append(trans)

    Image.fromarray(sheet, "RGBA").save(out_path, "PNG", optimize=False)

    # Compact showcase strip (Cols 0, 5, 10, 15, 20, 25 across all 8 rows @ 104x104 -> 624x832)
    sample_cols = [0, 5, 10, 15, 20, 25]
    thumb = 96
    showcase = Image.new("RGBA", (len(sample_cols) * thumb, ROWS * thumb), (14, 18, 30, 255))
    for r in range(ROWS):
        for ci, c in enumerate(sample_cols):
            sub = sheet[r * CELL : (r + 1) * CELL, c * CELL : (c + 1) * CELL]
            tile = Image.fromarray(sub, "RGBA").resize((thumb, thumb), Image.NEAREST)
            showcase.paste(tile, (ci * thumb, r * thumb), tile)
    scratch_dir = os.environ.get(
        "AVS_SCRATCH_DIR",
        "/Users/rei/.gemini/antigravity/brain/a6e950e0-c00f-41c6-9561-e55259e935af/scratch",
    )
    os.makedirs(scratch_dir, exist_ok=True)
    showcase_path = os.path.join(scratch_dir, "debug_monster_vfx_showcase.png")
    showcase.save(showcase_path, "PNG")

    print(
        f"[OK] Built {out_path} ({COLS * CELL}x{ROWS * CELL}): "
        f"empty_cells={empty_cells}, 4px_clips={clip4_cells}/{ROWS * COLS}, transitions={row_transitions}"
    )
    print(f"[OK] Showcase saved to {showcase_path}")
    assert empty_cells == 0, f"Found {empty_cells} empty cells!"
    assert clip4_cells == 0, f"Found {clip4_cells} 4px border clips!"
    assert all(t >= 27 for t in row_transitions), f"Low frame transitions: {row_transitions}"


if __name__ == "__main__":
    main()
