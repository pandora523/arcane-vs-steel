#!/usr/bin/env python3
"""
Builds `assets/sprites/adv_props_sheet.png` (`1152 x 640` RGBA = `9 cols x 5 rows` of `128x128` cells)
using 100% biome-matched architectural fixtures (`adv_env_fixtures_hd2d`, `adv_props_pack_a`,
`adv_props_pack_b`, `adv_pickups_and_pylon`) converted through the Arcane vs Steel HD-2D pipeline:
  1. Border + pastel-halo + enclosed white-pocket BFS flood-fill background strip + 3-pass fringe strip
  2. Pre-downsample `MedianFilter(size=3)` cel-flattening
  3. Generous full-cell sizing (`target_h = 110..115`, `bottom_y = 121`, `2px` border safety -> `0` UV bleed)
  4. Curated 24-color per-realm architectural `MASTER_PALETTE` quantization (`dither=NONE`)
  5. 2-pass cardinal orphan despeckling + crisp `1px` `#0d0f1c` `Selout` outline

Atlas Layout (`1152 x 640`, `128x128` per cell):
  Cols `0..8` correspond to the 9 Realm-Matched Architectural Fixtures:
    0: `eclipse_brazier`    (Zone I Dark Blue-Slate Gothic Sacred Cyan-Flame Brazier)
    1: `eclipse_reliquary`  (Zone I Dark Blue-Slate Pointed-Arch Eclipse Stele Shrine)
    2: `eclipse_astrolabe`  (Zone I Dark Blue-Slate & Brass Astral Eclipse Orrery Artifact)
    3: `starwood_lantern`   (Zone II Mossy Root-Wrapped Elven Spirit-Lantern Pillar)
    4: `starwood_crystal`   (Zone II Root-Wrapped Bioluminescent Cyan-Emerald Runestone Artifact)
    5: `soul_brazier`       (Zone III Wrought-Iron Gargoyle Violet Soul-Fire Brazier)
    6: `ossuary_obelisk`    (Zone III Skull-Ringed Violet-Slate Necropolis Obelisk)
    7: `blackpit_brazier`   (Zone IV Spiked Dark-Iron & Chained Obsidian Hellfire Brazier)
    8: `hellfire_pylon`     (Zone IV Chained Black-Obsidian Molten Hellfire Monolith)

  Row 0 (`y = 0..128`):   INTACT Frame A
  Row 1 (`y = 128..256`): INTACT Frame B (live rune/crystal/flame pulse & glint!)
  Row 2 (`y = 256..384`): CRACKED / DAMAGED State (chipped silhouette + glowing fracture fissures!)
  Row 3 (`y = 384..512`): SHATTERED RUBBLE BASE State (low grounded broken plinth & fragments!)
  Row 4 (`y = 512..640`): HD-2D RPG Pickups (`HP`, `EMBER`, `RELIC`) + `64x64` Shatter Shards (`Cols 6..8`)
"""

import os
from collections import deque
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPRITES_DIR = os.path.join(ROOT, "assets", "sprites")
ARTIFACT_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/b9d8130e-8764-4ace-8d4e-40f97049d6f1"

PACK_ENV = os.path.join(ARTIFACT_DIR, "adv_env_fixtures_hd2d_1794569718892.jpg")
PACK_A = os.path.join(ARTIFACT_DIR, "adv_props_pack_a_1794565153347.jpg")
PACK_B = os.path.join(ARTIFACT_DIR, "adv_props_pack_b_1794565153714.jpg")
PACK_C = os.path.join(ARTIFACT_DIR, "adv_pickups_and_pylon_1794565154064.jpg")

CELL = 128
SELOUT_RGB = (13, 15, 28)  # #0d0f1c


def hex_pal(hex_list: list[str]) -> np.ndarray:
    out = []
    for h in hex_list:
        s = h.lstrip("#")
        out.append((int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16)))
    return np.array(out, dtype=np.int32)


PALETTES = {
    "eclipse_brazier": hex_pal([
        "#0d0f1c", "#121a2b", "#1b263d", "#263654", "#34496e", "#47608a", "#647ea8", "#8aa3c7",
        "#2b2116", "#4a371f", "#735429", "#a37836", "#d4a24c", "#f5cd70",
        "#0b4f6c", "#127ea1", "#1fb8d9", "#52e3f7", "#9ef7ff", "#e6ffff", "#ffffff",
        "#d97706", "#fbbf24", "#fef08a",
    ]),
    "eclipse_reliquary": hex_pal([
        "#0d0f1c", "#11192b", "#1a253d", "#243454", "#32476e", "#455e8c", "#5e7ba8", "#829ec7",
        "#2e2212", "#4f3a1b", "#785926", "#a67d34", "#d4a64a", "#f2cc6b", "#fff2ad",
        "#083c59", "#0f6a94", "#1ba6d4", "#4ce0ff", "#a3f5ff", "#ffffff",
    ]),
    "eclipse_astrolabe": hex_pal([
        "#0d0f1c", "#121a2b", "#1c2840", "#293959", "#3b4f75", "#526994", "#7189b5",
        "#3b2a12", "#5e441b", "#856226", "#ad8334", "#d4a84a", "#f2cc6b", "#fff0a6",
        "#0a3c59", "#11698f", "#1da4cc", "#47d9f7", "#99f3ff", "#ebffff", "#ffffff",
    ]),
    "starwood_lantern": hex_pal([
        "#0d0f1c", "#161d24", "#222e36", "#31444d", "#445d66", "#5c7a82", "#7c9ca3",
        "#1f1712", "#36271d", "#4f3929", "#6b4e37", "#876548",
        "#143322", "#204f32", "#317043", "#499157",
        "#084c4a", "#0e7d75", "#19b5a6", "#3fe8d1", "#87fff0", "#dbfffa", "#ffffff",
    ]),
    "starwood_crystal": hex_pal([
        "#0d0f1c", "#171c1f", "#262824", "#3b362c", "#544838", "#705f48", "#8c775c",
        "#153626", "#23573b", "#357a52",
        "#0c3338", "#125254", "#197570", "#229c8e", "#2fc4ad", "#4ce3c8", "#80f7df", "#bdfcf0", "#edfffa", "#ffffff",
        "#114a63", "#1e7da1", "#3bb6db", "#85ebff",
    ]),
    "soul_brazier": hex_pal([
        "#0d0f1c", "#191b29", "#282c40", "#3a4059", "#505875", "#6c7696", "#8e99ba", "#b8c2de",
        "#290d42", "#4a1570", "#7320a6", "#9f32db", "#c852ff", "#e285ff", "#f6bdff", "#ffffff",
        "#781658", "#b32480", "#eb4bb3", "#ff99dd",
    ]),
    "ossuary_obelisk": hex_pal([
        "#0d0f1c", "#181a29", "#26293d", "#373c54", "#4b526e", "#656d8c", "#848dab", "#a7b0cc",
        "#362f2a", "#544940", "#75675a", "#998877", "#bfb09d", "#ded2c1",
        "#2d1047", "#521b7d", "#7e2bb8", "#ad47eb", "#d87aff", "#f5c2ff", "#ffffff",
    ]),
    "blackpit_brazier": hex_pal([
        "#0d0f1c", "#17141c", "#24202b", "#342e3d", "#484054", "#625870", "#827791",
        "#2b1512", "#4a2218", "#73301d", "#a14220",
        "#590d12", "#8c1616", "#c4281a", "#ed531c", "#ff8224", "#ffb338", "#ffdf6b", "#fff7b8", "#ffffff",
    ]),
    "hellfire_pylon": hex_pal([
        "#0d0f1c", "#1a141c", "#29202b", "#3b2e3d", "#524154", "#6c586e", "#8a738c",
        "#2b1a12", "#4a2b19", "#6e3e1f", "#915327",
        "#4d0f14", "#801818", "#b8251a", "#e6481c", "#ff7724", "#ffa938", "#ffd966", "#ffffb8", "#ffffff",
    ]),
    "pickup_hp": hex_pal([
        "#0d0f1c", "#1d2421", "#3b2812", "#634419", "#8f6524", "#bd8a33", "#e3b44c", "#fae078", "#fff8bf",
        "#093824", "#0f5e3a", "#178a52", "#22ba6c", "#3fe088", "#7af7b0", "#beffd8", "#f2fff7",
    ]),
    "pickup_ember": hex_pal([
        "#0d0f1c", "#2b0c12", "#521318", "#801c1c", "#b0291e", "#de441f", "#fc6a21", "#ff952b",
        "#ffbe42", "#ffe270", "#ffffad", "#ffffff",
        "#6e2a1a", "#a34624", "#d97236",
    ]),
    "pickup_relic": hex_pal([
        "#0d0f1c", "#211c17", "#3d2d14", "#61471c", "#8a6627", "#b58936", "#deb14b", "#f7d774", "#fff4b3",
        "#092d4f", "#10538a", "#1b82c7", "#36b8f5", "#7be0ff", "#c7f6ff", "#ffffff",
    ]),
}


def strip_white_bg_quadrant(quad_rgb: np.ndarray, strip_pastel_glow: bool = False) -> np.ndarray:
    """
    Removes pure white background + soft outer pastel airbrush halos (around glowing lanterns/flames)
    + enclosed white pockets + anti-aliased bright fringes cleanly.
    """
    H, W, _ = quad_rgb.shape
    rgb = quad_rgb.astype(np.int32)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    max_c = np.maximum(np.maximum(r, g), b)
    min_c = np.minimum(np.minimum(r, g), b)
    chroma = max_c - min_c
    luma = (r * 299 + g * 587 + b * 114) // 1000

    bg_cand = ((r >= 238) & (g >= 238) & (b >= 238) & (chroma <= 24)) | ((luma >= 245) & (chroma <= 32))
    if strip_pastel_glow:
        # Strip pale cyan/mint airbrush bloom floating on #FFFFFF outside the dark pixel outline!
        bg_cand = bg_cand | ((luma >= 205) & (min_c >= 158) & (max_c >= 232))

    visited = np.zeros((H, W), dtype=bool)
    q = deque()

    for x in range(W):
        for y in (0, H - 1):
            if bg_cand[y, x] and not visited[y, x]:
                visited[y, x] = True
                q.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if bg_cand[y, x] and not visited[y, x]:
                visited[y, x] = True
                q.append((y, x))

    pure_white = (r >= 248) & (g >= 248) & (b >= 248) & (chroma <= 12)
    seen_hole = np.zeros((H, W), dtype=bool)
    for sy in range(4, H - 4):
        for sx in range(4, W - 4):
            if pure_white[sy, sx] and not seen_hole[sy, sx] and not visited[sy, sx]:
                comp = []
                hq = deque([(sy, sx)])
                seen_hole[sy, sx] = True
                while hq:
                    cy, cx = hq.popleft()
                    comp.append((cy, cx))
                    for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                        if 0 <= ny < H and 0 <= nx < W and pure_white[ny, nx] and not seen_hole[ny, nx]:
                            seen_hole[ny, nx] = True
                            hq.append((ny, nx))
                glow_neighbors = 0
                dark_neighbors = 0
                for cy, cx in comp:
                    for ny, nx in ((cy - 2, cx), (cy + 2, cx), (cy, cx - 2), (cy, cx + 2)):
                        if 0 <= ny < H and 0 <= nx < W and not pure_white[ny, nx]:
                            if chroma[ny, nx] >= 55 and luma[ny, nx] >= 165:
                                glow_neighbors += 1
                            elif luma[ny, nx] <= 115:
                                dark_neighbors += 1
                if len(comp) >= 12 and dark_neighbors > glow_neighbors * 2:
                    for cy, cx in comp:
                        visited[cy, cx] = True
                        q.append((cy, cx))

    while q:
        cy, cx = q.popleft()
        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
            if 0 <= ny < H and 0 <= nx < W and not visited[ny, nx] and bg_cand[ny, nx]:
                visited[ny, nx] = True
                q.append((ny, nx))

    alpha = (~visited).astype(np.uint8) * 255

    for pass_idx in range(3):
        eroded = alpha.copy()
        thresh_luma = 224 if pass_idx == 0 else (208 if pass_idx == 1 else 196)
        thresh_chr = 30 if pass_idx < 2 else 22
        for y in range(1, H - 1):
            for x in range(1, W - 1):
                if alpha[y, x] == 0:
                    continue
                if (
                    alpha[y - 1, x] == 0
                    or alpha[y + 1, x] == 0
                    or alpha[y, x - 1] == 0
                    or alpha[y, x + 1] == 0
                ):
                    if (luma[y, x] >= thresh_luma and chroma[y, x] <= thresh_chr) or (
                        strip_pastel_glow and luma[y, x] >= 192 and min_c[y, x] >= 135
                    ):
                        eroded[y, x] = 0
        alpha = eroded

    comp_seen = np.zeros((H, W), dtype=bool)
    for sy in range(H):
        for sx in range(W):
            if alpha[sy, sx] > 0 and not comp_seen[sy, sx]:
                comp = []
                cq = deque([(sy, sx)])
                comp_seen[sy, sx] = True
                while cq:
                    cy, cx = cq.popleft()
                    comp.append((cy, cx))
                    for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                        if 0 <= ny < H and 0 <= nx < W and alpha[ny, nx] > 0 and not comp_seen[ny, nx]:
                            comp_seen[ny, nx] = True
                            cq.append((ny, nx))
                if len(comp) < 28:
                    for cy, cx in comp:
                        alpha[cy, cx] = 0

    out = np.zeros((H, W, 4), dtype=np.uint8)
    out[:, :, :3] = quad_rgb
    out[:, :, 3] = alpha
    return out


def pixelize_to_cell(
    rgba_hi: np.ndarray,
    pal: np.ndarray,
    target_h: int,
    target_max_w: int = 110,
    bottom_y: int = 121,
    center_y: int | None = None,
) -> np.ndarray:
    alpha_mask = rgba_hi[:, :, 3] > 128
    ys, xs = np.where(alpha_mask)
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    x0, x1 = int(xs.min()), int(xs.max()) + 1

    crop_rgb = Image.fromarray(rgba_hi[y0:y1, x0:x1, :3], mode="RGB").filter(ImageFilter.MedianFilter(size=3))
    crop_a = Image.fromarray(rgba_hi[y0:y1, x0:x1, 3], mode="L")

    bw, bh = crop_rgb.size
    scale = min(target_h / float(bh), target_max_w / float(bw))
    nw = max(8, int(round(bw * scale)))
    nh = max(8, int(round(bh * scale)))

    rgb_arr = np.array(crop_rgb, dtype=np.uint8)
    a_arr = np.array(crop_a, dtype=np.uint8)
    for _ in range(3):
        trans = a_arr == 0
        if not np.any(trans):
            break
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny_s = np.clip(np.arange(bh) + dy, 0, bh - 1)
            nx_s = np.clip(np.arange(bw) + dx, 0, bw - 1)
            nbr_a = a_arr[ny_s[:, None], nx_s[None, :]]
            nbr_rgb = rgb_arr[ny_s[:, None], nx_s[None, :]]
            fill = trans & (nbr_a > 0)
            rgb_arr[fill] = nbr_rgb[fill]
            a_arr[fill] = 1

    small_rgb = np.array(
        Image.fromarray(rgb_arr, mode="RGB").resize((nw, nh), resample=Image.Resampling.BILINEAR),
        dtype=np.int32,
    )
    small_a = np.array(
        crop_a.resize((nw, nh), resample=Image.Resampling.BILINEAR),
        dtype=np.uint8,
    )
    solid = small_a >= 118

    flat_rgb = small_rgb.reshape(-1, 3)
    dists = np.sum((flat_rgb[:, None, :] - pal[None, :, :]) ** 2, axis=2)
    nearest_idx = np.argmin(dists, axis=1)
    q_rgb = pal[nearest_idx].reshape(nh, nw, 3).astype(np.uint8)

    cell = np.zeros((CELL, CELL, 4), dtype=np.uint8)
    ox = (CELL - nw) // 2
    oy = (center_y - nh // 2) if center_y is not None else (bottom_y - nh)
    oy = max(3, min(CELL - 4 - nh, oy))
    ox = max(3, min(CELL - 4 - nw, ox))

    cell[oy : oy + nh, ox : ox + nw, :3] = q_rgb
    cell[oy : oy + nh, ox : ox + nw, 3] = np.where(solid, 255, 0).astype(np.uint8)

    return despeckle_and_selout(cell)


def despeckle_and_selout(cell_in: np.ndarray) -> np.ndarray:
    cell = cell_in.copy()
    cell[:2, :, 3] = 0
    cell[-2:, :, 3] = 0
    cell[:, :2, 3] = 0
    cell[:, -2:, 3] = 0

    for pass_i in range(2):
        rgb = cell[:, :, :3].copy()
        a = cell[:, :, 3] > 0
        for y in range(2, CELL - 2):
            for x in range(2, CELL - 2):
                if not a[y, x]:
                    continue
                c = tuple(int(v) for v in rgb[y, x])
                nbrs = []
                same = 0
                for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if a[ny, nx]:
                        nc = tuple(int(v) for v in rgb[ny, nx])
                        nbrs.append(nc)
                        if nc == c:
                            same += 1
                if len(nbrs) >= 3 and same == 0:
                    counts = {}
                    for nc in nbrs:
                        counts[nc] = counts.get(nc, 0) + 1
                    best_c = max(counts.items(), key=lambda kv: kv[1])[0]
                    cell[y, x, :3] = best_c
                elif pass_i == 1 and len(nbrs) == 4 and same <= 1:
                    counts = {}
                    for nc in nbrs:
                        counts[nc] = counts.get(nc, 0) + 1
                    best_c, cnt = max(counts.items(), key=lambda kv: kv[1])
                    if cnt >= 3 and best_c != SELOUT_RGB:
                        cell[y, x, :3] = best_c

    a = cell[:, :, 3] > 0
    out = cell.copy()
    for y in range(2, CELL - 2):
        for x in range(2, CELL - 2):
            if a[y, x]:
                if not (a[y - 1, x] and a[y + 1, x] and a[y, x - 1] and a[y, x + 1]):
                    out[y, x, :3] = SELOUT_RGB
                    out[y, x, 3] = 255
    out[out[:, :, 3] == 0, :3] = 0
    return out


def make_gleam_frame(intact_cell: np.ndarray, accent_rgb: tuple[int, int, int], core_rgb: tuple[int, int, int]) -> np.ndarray:
    out = intact_cell.copy()
    rgb = out[:, :, :3].astype(np.int32)
    a = out[:, :, 3] > 0

    acc = np.array(accent_rgb, dtype=np.int32)
    dist_acc = np.sqrt(np.sum((rgb - acc[None, None, :]) ** 2, axis=2))
    chroma = np.max(rgb, axis=2) - np.min(rgb, axis=2)
    luma = (rgb[:, :, 0] * 299 + rgb[:, :, 1] * 587 + rgb[:, :, 2] * 114) // 1000

    glow_px = a & ((dist_acc < 88) | ((chroma > 65) & (luma > 135)))
    interior = np.zeros_like(a)
    interior[2:-2, 2:-2] = (
        a[2:-2, 2:-2] & a[1:-3, 2:-2] & a[3:-1, 2:-2] & a[2:-2, 1:-3] & a[2:-2, 3:-1]
    )
    target = glow_px & interior
    core_arr = np.array(core_rgb, dtype=np.int32)
    out[target, :3] = np.clip((rgb[target] * 2 + core_arr[None, :]) // 3, 0, 255).astype(np.uint8)

    cand_ys, cand_xs = np.where(target & (luma > 165))
    if len(cand_ys) > 0:
        idx = len(cand_ys) // 3
        gy, gx = int(cand_ys[idx]), int(cand_xs[idx])
        if 6 <= gy <= CELL - 7 and 6 <= gx <= CELL - 7:
            out[gy, gx, :3] = (255, 255, 255)
            for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                if interior[gy + dy, gx + dx]:
                    out[gy + dy, gx + dx, :3] = core_rgb
    return out


def make_cracked_cell(
    intact_cell: np.ndarray,
    crack_glow_rgb: tuple[int, int, int],
    seed: int,
) -> np.ndarray:
    rng = np.random.default_rng(seed)
    a = intact_cell[:, :, 3] > 0
    ys, xs = np.where(a)
    y_min, y_max = int(ys.min()), int(ys.max())
    x_min, x_max = int(xs.min()), int(xs.max())
    h = max(12, y_max - y_min)
    mid_y = y_min + int(h * 0.48)

    work = np.zeros_like(intact_cell)
    work[mid_y:, :, :] = intact_cell[mid_y:, :, :]
    shift_x = 1 if (seed % 2 == 0) else -1
    src_top = intact_cell[y_min:mid_y, :, :]
    dst_y0 = min(CELL - 4, y_min + 2)
    dst_h = min(mid_y - y_min, CELL - 3 - dst_y0)
    if shift_x > 0:
        work[dst_y0 : dst_y0 + dst_h, 3:, :] = src_top[:dst_h, 2:-1, :]
    else:
        work[dst_y0 : dst_y0 + dst_h, 2:-1, :] = src_top[:dst_h, 3:, :]

    notch_specs = [
        (dst_y0 + 3, x_min + 2, 9, 8),
        (dst_y0 + int(h * 0.16), x_max - 8, 10, 9),
        (mid_y - 4, x_min + 1, 7, 6),
    ]
    for ny, nx, nw, nh in notch_specs:
        for yy in range(max(2, ny), min(CELL - 2, ny + nh)):
            span = max(1, nw - abs(yy - (ny + nh // 2)) * 2)
            if nx < CELL // 2:
                work[yy, max(2, nx) : min(CELL - 2, nx + span), 3] = 0
            else:
                work[yy, max(2, nx + nw - span) : min(CELL - 2, nx + nw), 3] = 0

    work = despeckle_and_selout(work)

    interior = np.zeros((CELL, CELL), dtype=bool)
    wa = work[:, :, 3] > 0
    interior[3:-3, 3:-3] = (
        wa[3:-3, 3:-3] & wa[2:-4, 3:-3] & wa[4:-2, 3:-3] & wa[3:-3, 2:-4] & wa[3:-3, 4:-2]
    )

    cx = (x_min + x_max) // 2
    cur_x = cx - 4
    for yy in range(dst_y0 + int(h * 0.18), y_max - 7):
        if rng.random() < 0.45:
            cur_x += int(rng.choice([-1, 1]))
        cur_x = max(x_min + 4, min(x_max - 5, cur_x))
        if interior[yy, cur_x]:
            work[yy, cur_x, :3] = crack_glow_rgb
            if interior[yy, cur_x + 1]:
                work[yy, cur_x + 1, :3] = SELOUT_RGB
        if abs(yy - mid_y) <= 2:
            for bx in range(cur_x - 6, cur_x + 7):
                by = yy + ((bx - cur_x) // 2)
                if 3 <= by < CELL - 3 and 3 <= bx < CELL - 3 and interior[by, bx]:
                    work[by, bx, :3] = crack_glow_rgb if abs(bx - cur_x) <= 3 else SELOUT_RGB

    work[work[:, :, 3] == 0, :3] = 0
    return work


def make_rubble_cell(
    intact_cell: np.ndarray,
    ember_rgb: tuple[int, int, int],
    seed: int,
) -> np.ndarray:
    rng = np.random.default_rng(seed + 100)
    a = intact_cell[:, :, 3] > 0
    ys, xs = np.where(a)
    y_min, y_max = int(ys.min()), int(ys.max())
    x_min, x_max = int(xs.min()), int(xs.max())
    h = max(16, y_max - y_min)
    w = max(16, x_max - x_min)

    out = np.zeros_like(intact_cell)

    base_h = max(14, min(26, int(h * 0.27)))
    cut_top = y_max - base_h
    for x in range(x_min, x_max + 1):
        jag = int(round(np.sin(x * 0.42 + seed) * 3.0 + np.cos(x * 0.91) * 2.0))
        col_top = max(cut_top - 3, min(y_max - 5, cut_top + jag))
        out[col_top : y_max + 1, x, :] = intact_cell[col_top : y_max + 1, x, :]

    mid_y0 = y_min + int(h * 0.28)
    chunk_offsets = [(-int(w * 0.42), 1), (-int(w * 0.18), 3), (int(w * 0.22), 2), (int(w * 0.40), 0)]
    cx_mid = (x_min + x_max) // 2
    for idx, (dx_off, dy_off) in enumerate(chunk_offsets):
        cw = 9 + (idx % 2) * 3
        ch = 7 + ((idx + 1) % 2) * 2
        sx = max(x_min, min(x_max - cw, cx_mid - cw // 2 + ((idx - 1) * 5)))
        sy = max(y_min, min(y_max - ch, mid_y0 + idx * 4))
        patch = intact_cell[sy : sy + ch, sx : sx + cw, :].copy()
        if np.sum(patch[:, :, 3] > 0) < 12:
            continue
        patch[0, 0, 3] = 0
        patch[0, -1, 3] = 0
        dx = max(4, min(CELL - 4 - cw, cx_mid + dx_off - cw // 2))
        dy = max(4, min(CELL - 4 - ch, y_max - ch + dy_off))
        mask = patch[:, :, 3] > 0
        out[dy : dy + ch, dx : dx + cw][mask] = patch[mask]

    out = despeckle_and_selout(out)

    ra = out[:, :, 3] > 0
    interior = np.zeros((CELL, CELL), dtype=bool)
    interior[3:-3, 3:-3] = (
        ra[3:-3, 3:-3] & ra[2:-4, 3:-3] & ra[4:-2, 3:-3] & ra[3:-3, 2:-4] & ra[3:-3, 4:-2]
    )
    iy, ix = np.where(interior)
    if len(iy) >= 6:
        for _ in range(3):
            pick = int(rng.integers(0, len(iy)))
            out[iy[pick], ix[pick], :3] = ember_rgb

    out[out[:, :, 3] == 0, :3] = 0
    return out


def make_shard_quad_cell(source_cells: list[np.ndarray]) -> np.ndarray:
    cell = np.zeros((CELL, CELL, 4), dtype=np.uint8)
    quads = [(0, 0), (64, 0), (0, 64), (64, 64)]
    shapes = [(16, 12), (13, 15), (17, 11), (12, 12)]
    for q_idx, (qx, qy) in enumerate(quads):
        src = source_cells[q_idx % len(source_cells)]
        a = src[:, :, 3] > 0
        ys, xs = np.where(a)
        cy = int(np.median(ys))
        cx = int(np.median(xs))
        sw, sh = shapes[q_idx]
        y0 = max(4, min(CELL - 4 - sh, cy - sh // 2))
        x0 = max(4, min(CELL - 4 - sw, cx - sw // 2))
        patch = src[y0 : y0 + sh, x0 : x0 + sw, :].copy()
        yy, xx = np.mgrid[0:sh, 0:sw]
        ny = (yy - sh / 2.0) / (sh / 2.0)
        nx = (xx - sw / 2.0) / (sw / 2.0)
        poly = (np.abs(nx) * 0.85 + np.abs(ny) * 0.95) <= 1.08
        patch[~poly, 3] = 0

        sub = np.zeros((CELL, CELL, 4), dtype=np.uint8)
        px = qx + 32 - sw // 2
        py = qy + 32 - sh // 2
        sub[py : py + sh, px : px + sw] = patch
        sub = despeckle_and_selout(sub)
        cell[qy + 2 : qy + 62, qx + 2 : qx + 62] = sub[qy + 2 : qy + 62, qx + 2 : qx + 62]
    return cell


def main():
    im_env = np.array(Image.open(PACK_ENV).convert("RGB"))
    im_a = np.array(Image.open(PACK_A).convert("RGB"))
    im_b = np.array(Image.open(PACK_B).convert("RGB"))
    im_c = np.array(Image.open(PACK_C).convert("RGB"))

    def quad(arr: np.ndarray, row: int, col: int, pad: int = 16) -> np.ndarray:
        H, W, _ = arr.shape
        mh, mw = H // 2, W // 2
        y0 = row * mh + pad
        y1 = (row + 1) * mh - pad
        x0 = col * mw + pad
        x1 = (col + 1) * mw - pad
        return arr[y0:y1, x0:x1, :].copy()

    prop_specs = [
        ("eclipse_brazier", quad(im_env, 0, 0, 16), True, 114, 96, (31, 184, 217), (230, 255, 255)),
        ("eclipse_reliquary", quad(im_env, 1, 1, 16), False, 114, 96, (76, 224, 255), (255, 242, 173)),
        ("eclipse_astrolabe", quad(im_a, 1, 1, 12), False, 112, 102, (71, 217, 247), (235, 255, 255)),
        ("starwood_lantern", quad(im_env, 0, 1, 16), True, 115, 102, (63, 232, 209), (219, 255, 250)),
        ("starwood_crystal", quad(im_b, 0, 1, 12), False, 114, 104, (76, 227, 200), (237, 255, 250)),
        ("soul_brazier", quad(im_b, 1, 1, 12), False, 112, 98, (200, 82, 255), (255, 255, 255)),
        ("ossuary_obelisk", quad(im_b, 1, 0, 12), False, 115, 92, (173, 71, 235), (245, 194, 255)),
        ("blackpit_brazier", quad(im_env, 1, 0, 16), True, 113, 104, (255, 130, 36), (255, 247, 184)),
        ("hellfire_pylon", quad(im_c, 0, 0, 12), False, 115, 102, (255, 169, 56), (255, 255, 184)),
    ]

    pickup_specs = [
        ("pickup_hp", quad(im_c, 0, 1, 12), 82, 78, (63, 224, 136), (242, 255, 247)),
        ("pickup_ember", quad(im_c, 1, 0, 12), 82, 80, (255, 190, 66), (255, 255, 255)),
        ("pickup_relic", quad(im_c, 1, 1, 12), 80, 88, (54, 184, 245), (255, 255, 255)),
    ]

    atlas = np.zeros((5 * CELL, 9 * CELL, 4), dtype=np.uint8)
    intact_cells = []

    for col_idx, (key, q_rgb, strip_glow, th, tw, acc_rgb, core_rgb) in enumerate(prop_specs):
        rgba_hi = strip_white_bg_quadrant(q_rgb, strip_pastel_glow=strip_glow)
        c_intact = pixelize_to_cell(rgba_hi, PALETTES[key], target_h=th, target_max_w=tw, bottom_y=121)
        c_gleam = make_gleam_frame(c_intact, acc_rgb, core_rgb)
        c_cracked = make_cracked_cell(c_intact, acc_rgb, seed=10 + col_idx * 7)
        c_rubble = make_rubble_cell(c_intact, acc_rgb, seed=50 + col_idx * 11)

        intact_cells.append(c_intact)
        x0 = col_idx * CELL
        atlas[0 * CELL : 1 * CELL, x0 : x0 + CELL] = c_intact
        atlas[1 * CELL : 2 * CELL, x0 : x0 + CELL] = c_gleam
        atlas[2 * CELL : 3 * CELL, x0 : x0 + CELL] = c_cracked
        atlas[3 * CELL : 4 * CELL, x0 : x0 + CELL] = c_rubble

    for p_idx, (pkey, q_rgb, th, tw, acc_rgb, core_rgb) in enumerate(pickup_specs):
        rgba_hi = strip_white_bg_quadrant(q_rgb, strip_pastel_glow=False)
        c_pk_a = pixelize_to_cell(rgba_hi, PALETTES[pkey], target_h=th, target_max_w=tw, center_y=64)
        c_pk_b = make_gleam_frame(c_pk_a, acc_rgb, core_rgb)
        c0 = (p_idx * 2) * CELL
        c1 = (p_idx * 2 + 1) * CELL
        atlas[4 * CELL : 5 * CELL, c0 : c0 + CELL] = c_pk_a
        atlas[4 * CELL : 5 * CELL, c1 : c1 + CELL] = c_pk_b

    atlas[4 * CELL : 5 * CELL, 6 * CELL : 7 * CELL] = make_shard_quad_cell([intact_cells[0], intact_cells[1], intact_cells[2]])
    atlas[4 * CELL : 5 * CELL, 7 * CELL : 8 * CELL] = make_shard_quad_cell([intact_cells[3], intact_cells[4], intact_cells[5], intact_cells[6]])
    atlas[4 * CELL : 5 * CELL, 8 * CELL : 9 * CELL] = make_shard_quad_cell([intact_cells[7], intact_cells[8]])

    border_bleed = 0
    for r in range(5):
        for c in range(9):
            sub = atlas[r * CELL : (r + 1) * CELL, c * CELL : (c + 1) * CELL, 3]
            border_bleed += int(np.sum(sub[0, :] > 0) + np.sum(sub[-1, :] > 0) + np.sum(sub[:, 0] > 0) + np.sum(sub[:, -1] > 0))
    assert border_bleed == 0, f"Border bleed detected: {border_bleed}"

    out_path = os.path.join(SPRITES_DIR, "adv_props_sheet.png")
    Image.fromarray(atlas, mode="RGBA").save(out_path, optimize=True)
    sz_kb = os.path.getsize(out_path) / 1024.0
    print(f"[OK] Saved {out_path}: {atlas.shape[1]}x{atlas.shape[0]} RGBA ({sz_kb:.1f} KB), border_bleed={border_bleed}")

    pad_top = 48
    pad_left = 136
    scale_vis = 2
    cw_vis = CELL * scale_vis
    vis_w = pad_left + 9 * cw_vis + 24
    vis_h = pad_top + 5 * cw_vis + 24
    showcase = Image.new("RGBA", (vis_w, vis_h), (20, 25, 38, 255))
    draw = ImageDraw.Draw(showcase)

    for r in range(5):
        for c in range(9):
            bx = pad_left + c * cw_vis
            by = pad_top + r * cw_vis
            bg_c = (26, 33, 50, 255) if (r + c) % 2 == 0 else (20, 25, 38, 255)
            draw.rectangle([bx, by, bx + cw_vis - 1, by + cw_vis - 1], fill=bg_c, outline=(42, 53, 78, 255))
            cell_im = Image.fromarray(atlas[r * CELL : (r + 1) * CELL, c * CELL : (c + 1) * CELL], mode="RGBA")
            cell_up = cell_im.resize((cw_vis, cw_vis), resample=Image.Resampling.NEAREST)
            showcase.alpha_composite(cell_up, (bx, by))

    col_names = [
        "0:Z1 Brazier", "1:Z1 Stele", "2:Z1 Orrery*", "3:Z2 Lantern",
        "4:Z2 Crystal*", "5:Z3 Brazier", "6:Z3 Obelisk*", "7:Z4 Brazier", "8:Z4 Pylon*",
    ]
    row_names = ["R0 INTACT A", "R1 INTACT B", "R2 CRACKED", "R3 RUBBLE", "R4 PICKUPS"]
    for c, name in enumerate(col_names):
        draw.text((pad_left + c * cw_vis + 14, 16), name, fill=(248, 250, 252, 255))
    for r, rname in enumerate(row_names):
        draw.text((12, pad_top + r * cw_vis + cw_vis // 2 - 6), rname, fill=(253, 224, 71, 255))

    pickup_labels = ["+HP Elixir A", "+HP Elixir B", "Soul Ember A", "Soul Ember B", "Astral Seal A", "Astral Seal B", "Z1 Shards", "Z2/Z3 Shards", "Z4 Shards"]
    for c, plab in enumerate(pickup_labels):
        draw.text((pad_left + c * cw_vis + 14, pad_top + 4 * cw_vis + 8), plab, fill=(125, 211, 252, 255))

    dbg_path = os.path.join(ARTIFACT_DIR, "debug_adv_props_and_pickups_showcase.png")
    showcase.convert("RGB").save(dbg_path, optimize=True)
    print(f"[OK] Saved showcase: {dbg_path}")


if __name__ == "__main__":
    main()
