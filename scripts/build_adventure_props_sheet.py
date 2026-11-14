#!/usr/bin/env python3
"""
Builds `assets/sprites/adv_props_sheet.png` (`1152 x 640` RGBA = `9 cols x 5 rows` of `128x128` cells)
using 100% biome-matched architectural reference art (`adv_env_fixtures_hd2d`, `adv_props_pack_a`,
`adv_props_pack_b`, `adv_pickups_and_pylon`) converted through the true chunky HD-2D pixel pipeline
so world-space texel density (`~3.1px`) matches Champions & Realm Monsters `1:1`:

  1. Border + pastel-halo + enclosed white-pocket BFS flood-fill background strip + 3-pass fringe strip
  2. Heavy pre-downsample cel-flattening (`MedianFilter(7)` -> `MedianFilter(5)` + cel posterization)
     eliminating 100% of soft AI airbrush gradients before downsampling
  3. True Chunky Logical Pixel Grids:
       - `Rows 0..3` (`9` Realm Monuments): `64x64` logical grid -> `2x NEAREST` (`128x128`, `100%` `2x2` blocks)
       - `Row 4 Cols 0..5` (`RPG Pickups`): `32x32` logical grid -> `4x NEAREST` (`128x128`, `100%` `4x4` blocks)
       - `Row 4 Cols 6..8` (`64x64` Shards): `16x16` logical grid -> `4x NEAREST` (`64x64`, `100%` `4x4` blocks)
  4. Tight `11–14` color high-contrast flat cel palettes (`dither=NONE`, `0` semi-alpha)
  5. Pinhole sealing + 3-pass speckle elimination + crisp `1px` logical `#0d0f1c` `Selout` (`0` border bleed)
"""

import os
from collections import deque
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPRITES_DIR = os.path.join(ROOT, "assets", "sprites")
ARTIFACT_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/b9d8130e-8764-4ace-8d4e-40f97049d6f1"
SCRATCH_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/7821d65d-384a-4e26-8167-f32a84e377d8/scratch"

PACK_ENV = os.path.join(ARTIFACT_DIR, "adv_env_fixtures_hd2d_1794569718892.jpg")
PACK_A = os.path.join(ARTIFACT_DIR, "adv_props_pack_a_1794565153347.jpg")
PACK_B = os.path.join(ARTIFACT_DIR, "adv_props_pack_b_1794565153714.jpg")
PACK_C = os.path.join(ARTIFACT_DIR, "adv_pickups_and_pylon_1794565154064.jpg")

CELL = 128
LOGICAL_PROP = 64
LOGICAL_PICKUP = 32
LOGICAL_SHARD = 16
SELOUT_RGB = (13, 15, 28)  # #0d0f1c


def hex_pal(hex_list: list[str]) -> np.ndarray:
    out = []
    for h in hex_list:
        s = h.lstrip("#")
        out.append((int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16)))
    return np.array(out, dtype=np.int32)


# Tight 12–14 color stepped flat cel palettes (zero soft gradient ramps!)
PALETTES = {
    "eclipse_brazier": hex_pal([
        "#0d0f1c", "#182238", "#2b3d5e", "#49648f", "#7a98c4",
        "#4d371b", "#966d2e", "#e0ab48", "#fae078",
        "#0d5c80", "#1ba8cf", "#5ce8ff", "#d9ffff", "#ffffff",
    ]),
    "eclipse_reliquary": hex_pal([
        "#0d0f1c", "#172136", "#293b5c", "#46608c", "#7896c2",
        "#4f3919", "#99702c", "#e0ad46", "#fff09e",
        "#0d5980", "#1fa6d4", "#63ebff", "#ffffff",
    ]),
    "eclipse_astrolabe": hex_pal([
        "#0d0f1c", "#19243b", "#2e4163", "#506a96", "#809cc7",
        "#4d3616", "#8c6526", "#cf9c3e", "#f7d368", "#fff6b8",
        "#0e5e85", "#20b2db", "#73f0ff", "#ffffff",
    ]),
    "starwood_lantern": hex_pal([
        "#0d0f1c", "#1d2830", "#344954", "#587882",
        "#291d15", "#4f3827", "#7d5b40",
        "#19452b", "#367d4b",
        "#0b5e58", "#19b8a6", "#5efce3", "#d9fffa", "#ffffff",
    ]),
    "starwood_crystal": hex_pal([
        "#0d0f1c", "#211f1c", "#42392e", "#6e5d49",
        "#18472e", "#347d52",
        "#0d474d", "#167d78", "#26bfab", "#5ef7dc", "#b5fff0", "#ffffff",
        "#1b7ca3", "#6ee7ff",
    ]),
    "soul_brazier": hex_pal([
        "#0d0f1c", "#1d2033", "#343954", "#565f82", "#8792b8",
        "#361054", "#6e1fa3", "#ad38eb", "#dc75ff", "#f6c7ff", "#ffffff",
        "#9e1f6e", "#f25cc4",
    ]),
    "ossuary_obelisk": hex_pal([
        "#0d0f1c", "#1c1f30", "#323752", "#535b7d", "#828cb0",
        "#453c35", "#7a6b5e", "#b5a492", "#e3d6c5",
        "#3b125c", "#7c28b8", "#c45cff", "#f5c7ff", "#ffffff",
    ]),
    "blackpit_brazier": hex_pal([
        "#0d0f1c", "#1c1724", "#332b3d", "#544963", "#7d708f",
        "#471d16", "#85331e",
        "#6e1114", "#ba2218", "#f0541c", "#ff9426", "#ffd454", "#fff7b8", "#ffffff",
    ]),
    "hellfire_pylon": hex_pal([
        "#0d0f1c", "#1e1724", "#362b40", "#594866", "#857094",
        "#4a2618", "#874823",
        "#691114", "#b52118", "#ed4f1c", "#ff8f26", "#ffd152", "#ffffb8", "#ffffff",
    ]),
    "pickup_hp": hex_pal([
        "#0d0f1c", "#4a3214", "#8f6422", "#db9f39", "#fae078",
        "#0b472c", "#147d4b", "#22bf6e", "#57f29c", "#c9ffe0", "#ffffff",
    ]),
    "pickup_ember": hex_pal([
        "#0d0f1c", "#420f14", "#851a1b", "#c9331e", "#f7631e",
        "#ff9c29", "#ffd44f", "#fff59e", "#ffffff",
    ]),
    "pickup_relic": hex_pal([
        "#0d0f1c", "#453114", "#8a6423", "#d4a03b", "#fae075",
        "#0c3d6b", "#1875b8", "#36bcf7", "#8fedff", "#ffffff",
    ]),
}


def strip_white_bg_quadrant(quad_rgb: np.ndarray, strip_pastel_glow: bool = False) -> np.ndarray:
    """
    Removes pure white background + soft outer pastel airbrush halos
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


def upscale_nearest_rgba(grid_rgba: np.ndarray, scale: int) -> np.ndarray:
    return np.repeat(np.repeat(grid_rgba, scale, axis=0), scale, axis=1)


def despeckle_and_selout_grid(
    cell_in: np.ndarray,
    margin: int = 2,
    despeckle_passes: int = 3,
    min_comp: int = 4,
) -> np.ndarray:
    """
    Cleans a logical pixel grid (`64x64`, `32x32`, or `16x16`):
      - Seals 1px interior pinholes
      - Strips tiny disconnected floating crumbs
      - Merges single-pixel & 2-pixel noisy speckles into clean flat cel regions
      - Applies crisp `1px` logical `#0d0f1c` `Selout` along the outer contour
      - Enforces strict empty border margin (`0` UV bleed after NEAREST upscale!)
    """
    H, W, _ = cell_in.shape
    cell = cell_in.copy()
    m = max(1, margin)
    cell[:m, :, 3] = 0
    cell[-m:, :, 3] = 0
    cell[:, :m, 3] = 0
    cell[:, -m:, 3] = 0

    # 1. Seal 1px interior pinholes surrounded by >= 3 opaque cardinal neighbors
    a = cell[:, :, 3] > 0
    for y in range(m, H - m):
        for x in range(m, W - m):
            if not a[y, x]:
                nbr_cols = []
                for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if a[ny, nx]:
                        nbr_cols.append(cell[ny, nx, :3])
                if len(nbr_cols) >= 3:
                    cell[y, x, :3] = nbr_cols[0]
                    cell[y, x, 3] = 255
    a = cell[:, :, 3] > 0

    # 2. Strip tiny floating crumbs (`< min_comp` pixels)
    if min_comp > 1:
        seen = np.zeros((H, W), dtype=bool)
        comps = []
        for sy in range(H):
            for sx in range(W):
                if a[sy, sx] and not seen[sy, sx]:
                    comp = []
                    q = deque([(sy, sx)])
                    seen[sy, sx] = True
                    while q:
                        cy, cx = q.popleft()
                        comp.append((cy, cx))
                        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                            if 0 <= ny < H and 0 <= nx < W and a[ny, nx] and not seen[ny, nx]:
                                seen[ny, nx] = True
                                q.append((ny, nx))
                    comps.append(comp)
        if comps:
            largest = max(len(c) for c in comps)
            for comp in comps:
                if len(comp) < min_comp and len(comp) < largest:
                    for cy, cx in comp:
                        cell[cy, cx, :] = 0

    # 3. Multi-pass cardinal speckle elimination -> broad flat 16-bit cel regions
    for pass_i in range(despeckle_passes):
        rgb = cell[:, :, :3].copy()
        a = cell[:, :, 3] > 0
        for y in range(m, H - m):
            for x in range(m, W - m):
                if not a[y, x]:
                    continue
                c = tuple(int(v) for v in rgb[y, x])
                if c == SELOUT_RGB:
                    continue
                nbrs = []
                same = 0
                for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if a[ny, nx]:
                        nc = tuple(int(v) for v in rgb[ny, nx])
                        if nc != SELOUT_RGB:
                            nbrs.append(nc)
                        if nc == c:
                            same += 1
                if len(nbrs) >= 2 and same == 0:
                    counts = {}
                    for nc in nbrs:
                        counts[nc] = counts.get(nc, 0) + 1
                    best_c = max(counts.items(), key=lambda kv: kv[1])[0]
                    cell[y, x, :3] = best_c
                elif pass_i >= 1 and len(nbrs) >= 3 and same <= 1:
                    counts = {}
                    for nc in nbrs:
                        counts[nc] = counts.get(nc, 0) + 1
                    best_c, cnt = max(counts.items(), key=lambda kv: kv[1])
                    if cnt >= 3:
                        cell[y, x, :3] = best_c

    # 4. Crisp 1px logical `#0d0f1c` Selout along the outer boundary of opaque pixels
    a = cell[:, :, 3] > 0
    out = cell.copy()
    for y in range(m, H - m):
        for x in range(m, W - m):
            if a[y, x]:
                if not (a[y - 1, x] and a[y + 1, x] and a[y, x - 1] and a[y, x + 1]):
                    out[y, x, :3] = SELOUT_RGB
                    out[y, x, 3] = 255
    out[:m, :, :] = 0
    out[-m:, :, :] = 0
    out[:, :m, :] = 0
    out[:, -m:, :] = 0
    out[out[:, :, 3] == 0, :3] = 0
    out[out[:, :, 3] > 0, 3] = 255
    return out


def pixelize_to_logical_grid(
    rgba_hi: np.ndarray,
    pal: np.ndarray,
    grid_sz: int,
    target_h: int,
    target_max_w: int,
    bottom_y: int | None = None,
    center_y: int | None = None,
    median_passes: tuple[int, ...] = (7, 5),
    posterize_step: int = 26,
    margin: int = 2,
    despeckle_passes: int = 3,
) -> np.ndarray:
    """
    Converts high-res reference art into an authentic flat-cel logical pixel grid (`64x64` or `32x32`):
      1. Heavy `MedianFilter` + cel-band posterization on high-res art to destroy AI gradients
      2. Edge-color bleed into transparent pixels so downsampling never creates gray fringes
      3. Nearest-palette quantization (`dither=NONE`) + multi-pass despeckle + `1px` `#0d0f1c` `Selout`
    """
    alpha_mask = rgba_hi[:, :, 3] > 128
    ys, xs = np.where(alpha_mask)
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    x0, x1 = int(xs.min()), int(xs.max()) + 1

    crop_im = Image.fromarray(rgba_hi[y0:y1, x0:x1, :3], mode="RGB")
    for msz in median_passes:
        crop_im = crop_im.filter(ImageFilter.MedianFilter(size=msz))
    crop_a = Image.fromarray(rgba_hi[y0:y1, x0:x1, 3], mode="L")

    bw, bh = crop_im.size
    scale = min(target_h / float(max(1, bh)), target_max_w / float(max(1, bw)))
    nw = max(6, min(grid_sz - 2 * margin, int(round(bw * scale))))
    nh = max(6, min(grid_sz - 2 * margin, int(round(bh * scale))))

    rgb_arr = np.array(crop_im, dtype=np.int32)
    if posterize_step > 1:
        rgb_arr = np.clip((rgb_arr // posterize_step) * posterize_step + (posterize_step // 2), 0, 255)
    rgb_arr = rgb_arr.astype(np.uint8)

    a_arr = np.array(crop_a, dtype=np.uint8)
    for _ in range(4):
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
        crop_a.resize((nw, nh), resample=Image.Resampling.NEAREST),
        dtype=np.uint8,
    )
    solid = small_a >= 120

    # Exclude index 0 (`#0d0f1c` Selout) from interior shading so Selout stays crisp on contours!
    shade_pal = pal[1:] if len(pal) > 2 else pal
    flat_rgb = small_rgb.reshape(-1, 3)
    dists = np.sum((flat_rgb[:, None, :] - shade_pal[None, :, :]) ** 2, axis=2)
    nearest_idx = np.argmin(dists, axis=1)
    q_rgb = shade_pal[nearest_idx].reshape(nh, nw, 3).astype(np.uint8)

    cell = np.zeros((grid_sz, grid_sz, 4), dtype=np.uint8)
    ox = (grid_sz - nw) // 2
    oy = (center_y - nh // 2) if center_y is not None else ((bottom_y if bottom_y is not None else grid_sz - 4) - nh)
    oy = max(margin, min(grid_sz - margin - nh, oy))
    ox = max(margin, min(grid_sz - margin - nw, ox))

    cell[oy : oy + nh, ox : ox + nw, :3] = q_rgb
    cell[oy : oy + nh, ox : ox + nw, 3] = np.where(solid, 255, 0).astype(np.uint8)

    return despeckle_and_selout_grid(cell, margin=margin, despeckle_passes=despeckle_passes)


# Backwards-compatible wrapper (quantizes at `64x64` -> upscales `2x NEAREST` -> `128x128`)
def pixelize_to_cell(
    rgba_hi: np.ndarray,
    pal: np.ndarray,
    target_h: int,
    target_max_w: int = 110,
    bottom_y: int = 121,
    center_y: int | None = None,
) -> np.ndarray:
    grid64 = pixelize_to_logical_grid(
        rgba_hi,
        pal,
        grid_sz=64,
        target_h=max(8, target_h // 2),
        target_max_w=max(8, target_max_w // 2),
        bottom_y=(bottom_y // 2) if center_y is None else None,
        center_y=(center_y // 2) if center_y is not None else None,
    )
    return upscale_nearest_rgba(grid64, 2)


def despeckle_and_selout(cell_in: np.ndarray) -> np.ndarray:
    if cell_in.shape[0] == 128:
        g64 = despeckle_and_selout_grid(cell_in[::2, ::2].copy(), margin=2, despeckle_passes=2)
        return upscale_nearest_rgba(g64, 2)
    return despeckle_and_selout_grid(cell_in, margin=2, despeckle_passes=2)


def make_gleam_grid(
    intact_grid: np.ndarray,
    pal: np.ndarray,
    accent_rgb: tuple[int, int, int],
    core_rgb: tuple[int, int, int],
) -> np.ndarray:
    H, W, _ = intact_grid.shape
    out = intact_grid.copy()
    rgb = out[:, :, :3].astype(np.int32)
    a = out[:, :, 3] > 0

    acc = np.array(accent_rgb, dtype=np.int32)
    dist_acc = np.sqrt(np.sum((rgb - acc[None, None, :]) ** 2, axis=2))
    chroma = np.max(rgb, axis=2) - np.min(rgb, axis=2)
    luma = (rgb[:, :, 0] * 299 + rgb[:, :, 1] * 587 + rgb[:, :, 2] * 114) // 1000

    glow_px = a & ((dist_acc < 92) | ((chroma > 62) & (luma > 130)))
    interior = np.zeros_like(a)
    interior[1:-1, 1:-1] = (
        a[1:-1, 1:-1] & a[:-2, 1:-1] & a[2:, 1:-1] & a[1:-1, :-2] & a[1:-1, 2:]
    )
    target = glow_px & interior
    if np.any(target):
        core_arr = np.array(core_rgb, dtype=np.int32)
        boosted = np.clip((rgb[target] * 2 + core_arr[None, :]) // 3, 0, 255)
        shade_pal = pal[1:] if len(pal) > 2 else pal
        dists = np.sum((boosted[:, None, :] - shade_pal[None, :, :]) ** 2, axis=2)
        out[target, :3] = shade_pal[np.argmin(dists, axis=1)].astype(np.uint8)

    cand_ys, cand_xs = np.where(target & (luma > 155))
    if len(cand_ys) > 0:
        idx = len(cand_ys) // 3
        gy, gx = int(cand_ys[idx]), int(cand_xs[idx])
        if 3 <= gy <= H - 4 and 3 <= gx <= W - 4:
            out[gy, gx, :3] = (255, 255, 255)
            for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                if interior[gy + dy, gx + dx]:
                    out[gy + dy, gx + dx, :3] = core_rgb
    return out


def make_cracked_grid64(
    intact_grid: np.ndarray,
    crack_glow_rgb: tuple[int, int, int],
    seed: int,
) -> np.ndarray:
    rng = np.random.default_rng(seed)
    G = intact_grid.shape[0]
    a = intact_grid[:, :, 3] > 0
    ys, xs = np.where(a)
    y_min, y_max = int(ys.min()), int(ys.max())
    x_min, x_max = int(xs.min()), int(xs.max())
    h = max(8, y_max - y_min)
    mid_y = y_min + int(h * 0.48)

    work = np.zeros_like(intact_grid)
    work[mid_y:, :, :] = intact_grid[mid_y:, :, :]
    shift_x = 1 if (seed % 2 == 0) else -1
    src_top = intact_grid[y_min:mid_y, :, :]
    dst_y0 = min(G - 3, y_min + 1)
    dst_h = min(mid_y - y_min, G - 2 - dst_y0)
    if shift_x > 0:
        work[dst_y0 : dst_y0 + dst_h, 2:, :] = src_top[:dst_h, 1:-1, :]
    else:
        work[dst_y0 : dst_y0 + dst_h, 1:-1, :] = src_top[:dst_h, 2:, :]

    notch_specs = [
        (dst_y0 + 2, x_min + 1, 5, 4),
        (dst_y0 + int(h * 0.18), x_max - 4, 5, 5),
        (mid_y - 2, x_min + 1, 4, 3),
    ]
    for ny, nx, nw, nh in notch_specs:
        for yy in range(max(2, ny), min(G - 2, ny + nh)):
            span = max(1, nw - abs(yy - (ny + nh // 2)))
            if nx < G // 2:
                work[yy, max(2, nx) : min(G - 2, nx + span), 3] = 0
            else:
                work[yy, max(2, nx + nw - span) : min(G - 2, nx + nw), 3] = 0

    work = despeckle_and_selout_grid(work, margin=2, despeckle_passes=2)

    interior = np.zeros((G, G), dtype=bool)
    wa = work[:, :, 3] > 0
    interior[2:-2, 2:-2] = (
        wa[2:-2, 2:-2] & wa[1:-3, 2:-2] & wa[3:-1, 2:-2] & wa[2:-2, 1:-3] & wa[2:-2, 3:-1]
    )

    cx = (x_min + x_max) // 2
    cur_x = cx - 2
    for yy in range(dst_y0 + int(h * 0.18), y_max - 4):
        if rng.random() < 0.45:
            cur_x += int(rng.choice([-1, 1]))
        cur_x = max(x_min + 2, min(x_max - 3, cur_x))
        if interior[yy, cur_x]:
            work[yy, cur_x, :3] = crack_glow_rgb
            if interior[yy, cur_x + 1]:
                work[yy, cur_x + 1, :3] = SELOUT_RGB
        if abs(yy - mid_y) <= 1:
            for bx in range(cur_x - 3, cur_x + 4):
                by = yy + ((bx - cur_x) // 2)
                if 2 <= by < G - 2 and 2 <= bx < G - 2 and interior[by, bx]:
                    work[by, bx, :3] = crack_glow_rgb if abs(bx - cur_x) <= 1 else SELOUT_RGB

    work[work[:, :, 3] == 0, :3] = 0
    return work


def make_rubble_grid64(
    intact_grid: np.ndarray,
    ember_rgb: tuple[int, int, int],
    seed: int,
) -> np.ndarray:
    rng = np.random.default_rng(seed + 100)
    G = intact_grid.shape[0]
    a = intact_grid[:, :, 3] > 0
    ys, xs = np.where(a)
    y_min, y_max = int(ys.min()), int(ys.max())
    x_min, x_max = int(xs.min()), int(xs.max())
    h = max(10, y_max - y_min)
    w = max(10, x_max - x_min)

    out = np.zeros_like(intact_grid)

    base_h = max(8, min(14, int(h * 0.27)))
    cut_top = y_max - base_h
    for x in range(x_min, x_max + 1):
        jag = int(round(np.sin(x * 0.65 + seed) * 1.6 + np.cos(x * 1.3) * 1.0))
        col_top = max(cut_top - 2, min(y_max - 3, cut_top + jag))
        out[col_top : y_max + 1, x, :] = intact_grid[col_top : y_max + 1, x, :]

    mid_y0 = y_min + int(h * 0.28)
    chunk_offsets = [(-int(w * 0.42), 0), (-int(w * 0.18), 1), (int(w * 0.22), 1), (int(w * 0.40), 0)]
    cx_mid = (x_min + x_max) // 2
    for idx, (dx_off, dy_off) in enumerate(chunk_offsets):
        cw = 5 + (idx % 2) * 2
        ch = 4 + ((idx + 1) % 2) * 2
        sx = max(x_min, min(x_max - cw, cx_mid - cw // 2 + ((idx - 1) * 3)))
        sy = max(y_min, min(y_max - ch, mid_y0 + idx * 2))
        patch = intact_grid[sy : sy + ch, sx : sx + cw, :].copy()
        if np.sum(patch[:, :, 3] > 0) < 5:
            continue
        patch[0, 0, 3] = 0
        patch[0, -1, 3] = 0
        dx = max(2, min(G - 2 - cw, cx_mid + dx_off - cw // 2))
        dy = max(2, min(G - 2 - ch, y_max - ch + dy_off))
        mask = patch[:, :, 3] > 0
        out[dy : dy + ch, dx : dx + cw][mask] = patch[mask]

    out = despeckle_and_selout_grid(out, margin=2, despeckle_passes=2, min_comp=3)

    ra = out[:, :, 3] > 0
    interior = np.zeros((G, G), dtype=bool)
    interior[2:-2, 2:-2] = (
        ra[2:-2, 2:-2] & ra[1:-3, 2:-2] & ra[3:-1, 2:-2] & ra[2:-2, 1:-3] & ra[2:-2, 3:-1]
    )
    iy, ix = np.where(interior)
    if len(iy) >= 4:
        for _ in range(2):
            pick = int(rng.integers(0, len(iy)))
            out[iy[pick], ix[pick], :3] = ember_rgb

    out[out[:, :, 3] == 0, :3] = 0
    return out


def make_shard_quad_cell(source_grids64: list[np.ndarray]) -> np.ndarray:
    """
    Builds 4 chunky `64x64` debris shard quadrants inside a `128x128` cell, where each `64x64`
    quadrant is authored on a `16x16` logical grid upscaled `4x NEAREST -> 64x64`!
    """
    cell = np.zeros((CELL, CELL, 4), dtype=np.uint8)
    quads = [(0, 0), (64, 0), (0, 64), (64, 64)]
    shapes16 = [(8, 6), (7, 8), (9, 6), (7, 7)]
    for q_idx, (qx, qy) in enumerate(quads):
        src = source_grids64[q_idx % len(source_grids64)]
        a = src[:, :, 3] > 0
        ys, xs = np.where(a)
        cy = int(np.median(ys))
        cx = int(np.median(xs))
        sw, sh = shapes16[q_idx]
        y0 = max(2, min(LOGICAL_PROP - 2 - sh, cy - sh // 2))
        x0 = max(2, min(LOGICAL_PROP - 2 - sw, cx - sw // 2))
        patch = src[y0 : y0 + sh, x0 : x0 + sw, :].copy()
        yy, xx = np.mgrid[0:sh, 0:sw]
        ny = (yy - sh / 2.0) / max(1.0, sh / 2.0)
        nx = (xx - sw / 2.0) / max(1.0, sw / 2.0)
        poly = (np.abs(nx) * 0.85 + np.abs(ny) * 0.95) <= 1.12
        patch[~poly, 3] = 0

        sub16 = np.zeros((LOGICAL_SHARD, LOGICAL_SHARD, 4), dtype=np.uint8)
        px = 8 - sw // 2
        py = 8 - sh // 2
        sub16[py : py + sh, px : px + sw] = patch
        sub16 = despeckle_and_selout_grid(sub16, margin=1, despeckle_passes=1, min_comp=2)
        sub64 = upscale_nearest_rgba(sub16, 4)
        cell[qy : qy + 64, qx : qx + 64] = sub64
    return cell


def measure_block_uniformity(arr_rgba: np.ndarray, block: int) -> float:
    h, w, _ = arr_rgba.shape
    bh, bw = h // block, w // block
    reshaped = arr_rgba[: bh * block, : bw * block].reshape(bh, block, bw, block, 4)
    ref = reshaped[:, 0:1, :, 0:1, :]
    active = np.any(reshaped[:, :, :, :, 3] > 0, axis=(1, 3))
    if not np.any(active):
        return 1.0
    exact = np.all(reshaped == ref, axis=(1, 3, 4))
    return float(np.sum(exact & active)) / float(np.sum(active))


def main():
    os.makedirs(SCRATCH_DIR, exist_ok=True)
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
        ("eclipse_brazier", quad(im_env, 0, 0, 16), True, 57, 48, (27, 168, 207), (217, 255, 255)),
        ("eclipse_reliquary", quad(im_env, 1, 1, 16), False, 57, 48, (99, 235, 255), (255, 240, 158)),
        ("eclipse_astrolabe", quad(im_a, 1, 1, 12), False, 56, 51, (115, 240, 255), (255, 246, 184)),
        ("starwood_lantern", quad(im_env, 0, 1, 16), True, 57, 51, (94, 252, 227), (217, 255, 250)),
        ("starwood_crystal", quad(im_b, 0, 1, 12), False, 57, 52, (94, 247, 220), (255, 255, 255)),
        ("soul_brazier", quad(im_b, 1, 1, 12), False, 56, 49, (220, 117, 255), (255, 255, 255)),
        ("ossuary_obelisk", quad(im_b, 1, 0, 12), False, 57, 46, (196, 92, 255), (245, 199, 255)),
        ("blackpit_brazier", quad(im_env, 1, 0, 16), True, 56, 52, (255, 148, 38), (255, 247, 184)),
        ("hellfire_pylon", quad(im_c, 0, 0, 12), False, 57, 51, (255, 143, 38), (255, 255, 184)),
    ]

    pickup_specs = [
        ("pickup_hp", quad(im_c, 0, 1, 12), 24, 23, (87, 242, 156), (255, 255, 255)),
        ("pickup_ember", quad(im_c, 1, 0, 12), 24, 24, (255, 212, 79), (255, 255, 255)),
        ("pickup_relic", quad(im_c, 1, 1, 12), 24, 25, (54, 188, 247), (255, 255, 255)),
    ]

    atlas = np.zeros((5 * CELL, 9 * CELL, 4), dtype=np.uint8)
    intact_grids64 = []

    for col_idx, (key, q_rgb, strip_glow, th64, tw64, acc_rgb, core_rgb) in enumerate(prop_specs):
        rgba_hi = strip_white_bg_quadrant(q_rgb, strip_pastel_glow=strip_glow)
        g_intact = pixelize_to_logical_grid(
            rgba_hi,
            PALETTES[key],
            grid_sz=LOGICAL_PROP,
            target_h=th64,
            target_max_w=tw64,
            bottom_y=60,
            median_passes=(7, 5),
            posterize_step=28,
            margin=2,
            despeckle_passes=3,
        )
        g_gleam = make_gleam_grid(g_intact, PALETTES[key], acc_rgb, core_rgb)
        g_cracked = make_cracked_grid64(g_intact, acc_rgb, seed=10 + col_idx * 7)
        g_rubble = make_rubble_grid64(g_intact, acc_rgb, seed=50 + col_idx * 11)

        intact_grids64.append(g_intact)
        x0 = col_idx * CELL
        atlas[0 * CELL : 1 * CELL, x0 : x0 + CELL] = upscale_nearest_rgba(g_intact, 2)
        atlas[1 * CELL : 2 * CELL, x0 : x0 + CELL] = upscale_nearest_rgba(g_gleam, 2)
        atlas[2 * CELL : 3 * CELL, x0 : x0 + CELL] = upscale_nearest_rgba(g_cracked, 2)
        atlas[3 * CELL : 4 * CELL, x0 : x0 + CELL] = upscale_nearest_rgba(g_rubble, 2)

    for p_idx, (pkey, q_rgb, th32, tw32, acc_rgb, core_rgb) in enumerate(pickup_specs):
        rgba_hi = strip_white_bg_quadrant(q_rgb, strip_pastel_glow=False)
        g_pk_a = pixelize_to_logical_grid(
            rgba_hi,
            PALETTES[pkey],
            grid_sz=LOGICAL_PICKUP,
            target_h=th32,
            target_max_w=tw32,
            center_y=16,
            median_passes=(9, 5),
            posterize_step=30,
            margin=2,
            despeckle_passes=2,
        )
        g_pk_b = make_gleam_grid(g_pk_a, PALETTES[pkey], acc_rgb, core_rgb)
        c0 = (p_idx * 2) * CELL
        c1 = (p_idx * 2 + 1) * CELL
        atlas[4 * CELL : 5 * CELL, c0 : c0 + CELL] = upscale_nearest_rgba(g_pk_a, 4)
        atlas[4 * CELL : 5 * CELL, c1 : c1 + CELL] = upscale_nearest_rgba(g_pk_b, 4)

    atlas[4 * CELL : 5 * CELL, 6 * CELL : 7 * CELL] = make_shard_quad_cell([intact_grids64[0], intact_grids64[1], intact_grids64[2]])
    atlas[4 * CELL : 5 * CELL, 7 * CELL : 8 * CELL] = make_shard_quad_cell([intact_grids64[3], intact_grids64[4], intact_grids64[5], intact_grids64[6]])
    atlas[4 * CELL : 5 * CELL, 8 * CELL : 9 * CELL] = make_shard_quad_cell([intact_grids64[7], intact_grids64[8]])

    border_bleed = 0
    for r in range(5):
        for c in range(9):
            sub = atlas[r * CELL : (r + 1) * CELL, c * CELL : (c + 1) * CELL, 3]
            border_bleed += int(
                np.sum(sub[:2, :] > 0) + np.sum(sub[-2:, :] > 0) + np.sum(sub[:, :2] > 0) + np.sum(sub[:, -2:] > 0)
            )
    for c in (6, 7, 8):
        for qy in (0, 64):
            for qx in (0, 64):
                subq = atlas[4 * CELL + qy : 4 * CELL + qy + 64, c * CELL + qx : c * CELL + qx + 64, 3]
                border_bleed += int(
                    np.sum(subq[:2, :] > 0) + np.sum(subq[-2:, :] > 0) + np.sum(subq[:, :2] > 0) + np.sum(subq[:, -2:] > 0)
                )
    assert border_bleed == 0, f"Border bleed detected: {border_bleed}"

    semi_alpha = int(np.sum((atlas[:, :, 3] > 0) & (atlas[:, :, 3] < 255)))
    assert semi_alpha == 0, f"Semi-transparent pixels detected: {semi_alpha}"

    block2x2 = measure_block_uniformity(atlas, 2)
    row4_block4x4 = measure_block_uniformity(atlas[4 * CELL : 5 * CELL], 4)
    assert block2x2 == 1.0, f"Expected 100% 2x2 pixel block uniformity, got {block2x2:.4f}"
    assert row4_block4x4 == 1.0, f"Expected 100% 4x4 pickup/shard pixel block uniformity, got {row4_block4x4:.4f}"

    out_path = os.path.join(SPRITES_DIR, "adv_props_sheet.png")
    Image.fromarray(atlas, mode="RGBA").save(out_path, optimize=True)
    sz_kb = os.path.getsize(out_path) / 1024.0
    print(
        f"[OK] Saved {out_path}: {atlas.shape[1]}x{atlas.shape[0]} RGBA ({sz_kb:.1f} KB), "
        f"border_bleed={border_bleed}, 2x2={block2x2*100:.1f}%, row4_4x4={row4_block4x4*100:.1f}%"
    )

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

    pickup_labels = [
        "+HP Elixir A", "+HP Elixir B", "Soul Ember A", "Soul Ember B",
        "Astral Seal A", "Astral Seal B", "Z1 Shards", "Z2/Z3 Shards", "Z4 Shards",
    ]
    for c, plab in enumerate(pickup_labels):
        draw.text((pad_left + c * cw_vis + 14, pad_top + 4 * cw_vis + 8), plab, fill=(125, 211, 252, 255))

    dbg_path = os.path.join(SCRATCH_DIR, "debug_adv_props_v108_showcase.png")
    showcase.convert("RGB").save(dbg_path, optimize=True)
    print(f"[OK] Saved showcase: {dbg_path}")


if __name__ == "__main__":
    main()
