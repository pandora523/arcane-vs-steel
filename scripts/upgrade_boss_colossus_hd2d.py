#!/usr/bin/env python3
"""
Rebuilds ALL 32 cells of `assets/sprites/boss_colossus_sheet.png` (`4096x2048`, `8x4` of `512x512` cells)
into true chunky HD-2D 16-bit pixel art so EVERY single part of `BEHEMOTH MALPHAS` renders at
uniform `~2.9–3.8px` world-space pixel blocks matching Champions (`Warrior`) & Realm Monsters `1:1`!

Key Pixel-Purity & Anatomical Upgrades:
  1. World-Scale-Matched Logical Pixel Grids (`100.0%` `4x4+` block uniformity across all `4096x2048` px):
       - `456px / 388px / 376px` Torso, Skull, Jaw, Pauldrons, Rim, Great-Wings, Geysers, Jaw Hellfire & Slash Waves:
         `128x128` logical grid -> `4x NEAREST` (`512x512`, `~2.9–3.5px` world texels + `3.5px` `#0d0f1c` Selout)
       - `184..256px` Claws, Fists, Siege Vambrace, Abyssal Rift, Magma Spires, Crown Crest & Heart Core:
         `64x64` logical grid -> `8x NEAREST` (`512x512`, `~2.9–3.9px` world texels + `3.5px` `#0d0f1c` Selout)
       - `46..66px` Ballistic Magma Boulders (`(4,3)` & `(5,3)`):
         `32x32` logical grid -> `16x NEAREST` (`512x512`, `~1.8–2.1px` crisp pixel rocks + unbroken `#0d0f1c` Selout)
  2. Heavy pre-downsample cel-flattening (`MedianFilter(9)` -> `MedianFilter(5)` + cel posterization) +
     curated 18-color high-contrast flat cel `MASTER_PALETTE` + 3-pass speckle elimination (`0` AI confetti!).
  3. Replaces the soft AI radial airbrushed sun-blob on `(1,0)` & `(2,0)` (`TORSO_HEART_A/B`) with a
     sculpted 16-bit pixel-art blazing furnace core (`4x4` Bayer stipple + upward flame tongues) clasped by
     3 pairs of dark-obsidian skeletal rib bars!
  4. Preserves 100% `0.0px` positional joint registration on `Row 0`, repaired knuckles on `(3,1)`, and
     pinned shoulder sockets `(484, 320)` / `(28, 320)` on `Cells (0..3, 2)`.
"""

from collections import deque
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

REPO_ROOT = Path("/home/antigravity/pandora523/arcane-vs-steel")
SHEET_PATH = REPO_ROOT / "assets/sprites/boss_colossus_sheet.png"
SCRATCH_DIR = Path(
    "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/"
    "7821d65d-384a-4e26-8167-f32a84e377d8/scratch"
)
TOP1024_BACKUP = SCRATCH_DIR / "boss_colossus_top1024_backup.png"
REF_WINGS_ARMS = Path(
    "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/"
    "7821d65d-384a-4e26-8167-f32a84e377d8/boss_malphas_wings_arms_1794672302136.jpg"
)
REF_HELLFIRE_VFX = Path(
    "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/"
    "7821d65d-384a-4e26-8167-f32a84e377d8/boss_malphas_hellfire_vfx_1794672301643.jpg"
)
DEBUG_OUT = SCRATCH_DIR / "debug_boss_colossus_v108_hd2d.png"

SELOUT_RGB = (13, 15, 28)  # #0d0f1c

BAYER_4X4 = (
    np.array(
        [
            [0, 8, 2, 10],
            [12, 4, 14, 6],
            [3, 11, 1, 9],
            [15, 7, 13, 5],
        ],
        dtype=np.float32,
    )
    / 16.0
)

# Tight 18-color high-contrast flat cel palette (index 0 = #0d0f1c Selout)
MASTER_PALETTE = np.array(
    [
        [13, 15, 28],     # 0: #0d0f1c Selout
        [24, 21, 34],     # 1: Deep obsidian shadow
        [40, 34, 52],     # 2: Dark obsidian armor plate
        [64, 54, 76],     # 3: Mid obsidian slate
        [96, 82, 108],    # 4: Lit obsidian bevel
        [52, 18, 24],     # 5: Dark blood-crimson shadow
        [96, 26, 30],     # 6: Mid abyssal wing membrane
        [148, 36, 34],    # 7: Lit crimson wing / ember
        [204, 52, 30],    # 8: Scarlet hellfire outer
        [244, 104, 32],   # 9: Blazing magma orange
        [252, 166, 44],   # 10: Solar amber flame
        [254, 218, 86],   # 11: Incandescent molten gold
        [255, 250, 214],  # 12: White-hot hellfire core
        [88, 62, 30],     # 13: Dark bronze trim shadow
        [154, 114, 48],   # 14: Warm gilded bronze-gold
        [218, 178, 92],   # 15: Specular gold highlight
        [68, 48, 42],     # 16: Volcanic basalt char dark
        [118, 84, 70],    # 17: Volcanic rock highlight
    ],
    dtype=np.uint8,
)


def remove_white_bg(img_rgb: Image.Image, white_thresh: int = 234) -> Image.Image:
    arr = np.array(img_rgb.convert("RGB"), dtype=np.uint8)
    h, w, _ = arr.shape
    r = arr[:, :, 0].astype(np.int16)
    g = arr[:, :, 1].astype(np.int16)
    b = arr[:, :, 2].astype(np.int16)
    chroma = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
    luma = (r + g + b) // 3
    is_bg_cand = (luma >= white_thresh) & (chroma <= 26)

    visited = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        if is_bg_cand[0, x]:
            visited[0, x] = True
            q.append((0, x))
        if is_bg_cand[h - 1, x]:
            visited[h - 1, x] = True
            q.append((h - 1, x))
    for y in range(h):
        if is_bg_cand[y, 0] and not visited[y, 0]:
            visited[y, 0] = True
            q.append((y, 0))
        if is_bg_cand[y, w - 1] and not visited[y, w - 1]:
            visited[y, w - 1] = True
            q.append((y, w - 1))

    while q:
        cy, cx = q.popleft()
        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and is_bg_cand[ny, nx]:
                visited[ny, nx] = True
                q.append((ny, nx))

    enclosed_white = (luma >= 242) & (chroma <= 14)
    bg_mask = visited | enclosed_white

    dilated_bg = np.zeros_like(bg_mask)
    dilated_bg[1:, :] |= bg_mask[:-1, :]
    dilated_bg[:-1, :] |= bg_mask[1:, :]
    dilated_bg[:, 1:] |= bg_mask[:, :-1]
    dilated_bg[:, :-1] |= bg_mask[:, 1:]
    fringe = dilated_bg & (~bg_mask) & (luma >= 178) & (chroma <= 46)
    bg_mask |= fringe

    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[:, :, :3] = arr
    rgba[:, :, 3] = np.where(bg_mask, 0, 255).astype(np.uint8)
    return Image.fromarray(rgba, mode="RGBA")


def keep_largest_components(rgba: Image.Image, min_area: int = 80, max_components: int = 0) -> Image.Image:
    arr = np.array(rgba, dtype=np.uint8)
    alpha = arr[:, :, 3] > 0
    h, w = alpha.shape
    seen = np.zeros((h, w), dtype=bool)
    comps = []

    for y in range(h):
        for x in range(w):
            if alpha[y, x] and not seen[y, x]:
                comp = []
                q = deque([(y, x)])
                seen[y, x] = True
                while q:
                    cy, cx = q.popleft()
                    comp.append((cy, cx))
                    for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                        if 0 <= ny < h and 0 <= nx < w and alpha[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            q.append((ny, nx))
                if len(comp) >= min_area:
                    comps.append(comp)

    if max_components > 0 and len(comps) > max_components:
        comps.sort(key=len, reverse=True)
        comps = comps[:max_components]

    keep = np.zeros((h, w), dtype=bool)
    for comp in comps:
        for cy, cx in comp:
            keep[cy, cx] = True

    arr[:, :, 3] = np.where(keep, 255, 0).astype(np.uint8)
    arr[~keep, :3] = 0
    return Image.fromarray(arr, mode="RGBA")


def finalize_logical_grid_to_cell512(
    canvas_rgb: np.ndarray,
    canvas_a: np.ndarray,
    min_crumb_area: int = 4,
    despeckle_passes: int = 3,
    post_sculpt_fn=None,
) -> Image.Image:
    """
    Finalizes an arbitrary logical grid (`128x128`, `64x64`, or `32x32`) into a `512x512` cell:
      1. Seals 1px pinholes & strips floating crumbs
      2. Quantizes interior pixels to `MASTER_PALETTE[1:]` (`dither=NONE`)
      3. Runs 3-pass speckle merging so armor/horn/wing planes are crisp flat cel shapes
      4. Optionally runs `post_sculpt_fn(out_grid, canvas_a)` (e.g. sculpted pixel furnace ribcage!)
      5. Wraps with `1px` logical `#0d0f1c` `Selout` (`4px/8px/16px` in `512x512`, `0` border clips)
      6. Upscales `(512 // G)x NEAREST` -> `512x512`!
    """
    G = canvas_a.shape[0]
    assert 512 % G == 0, f"Grid {G} must divide 512 evenly"
    scale = 512 // G
    margin = 2 if G >= 64 else 1

    rgb_f = canvas_rgb.copy().astype(np.float32)
    a_mask = canvas_a.copy().astype(bool)

    for _ in range(2):
        n_up = np.zeros_like(a_mask); n_up[1:, :] = a_mask[:-1, :]
        n_dn = np.zeros_like(a_mask); n_dn[:-1, :] = a_mask[1:, :]
        n_lt = np.zeros_like(a_mask); n_lt[:, 1:] = a_mask[:, :-1]
        n_rt = np.zeros_like(a_mask); n_rt[:, :-1] = a_mask[:, 1:]
        card_cnt = n_up.astype(np.int8) + n_dn.astype(np.int8) + n_lt.astype(np.int8) + n_rt.astype(np.int8)
        pinholes = (~a_mask) & (card_cnt >= 3)
        if np.any(pinholes):
            a_mask[pinholes] = True
            for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                shifted_rgb = np.roll(np.roll(rgb_f, dy, axis=0), dx, axis=1)
                shifted_a = np.roll(np.roll(a_mask, dy, axis=0), dx, axis=1)
                use = pinholes & shifted_a
                rgb_f[use] = shifted_rgb[use]

    if min_crumb_area > 0:
        tmp_rgba = np.zeros((G, G, 4), dtype=np.uint8)
        tmp_rgba[:, :, :3] = np.clip(rgb_f, 0, 255).astype(np.uint8)
        tmp_rgba[:, :, 3] = np.where(a_mask, 255, 0).astype(np.uint8)
        cleaned_img = keep_largest_components(Image.fromarray(tmp_rgba, mode="RGBA"), min_area=min_crumb_area)
        cleaned_np = np.array(cleaned_img, dtype=np.uint8)
        rgb_f = cleaned_np[:, :, :3].astype(np.float32)
        a_mask = cleaned_np[:, :, 3] > 0

    # Enforce `margin + 1` on interior so adding `1px` outer Selout stays strictly inside `margin`!
    m_in = margin + 1
    a_mask[:m_in, :] = False
    a_mask[-m_in:, :] = False
    a_mask[:, :m_in] = False
    a_mask[:, -m_in:] = False

    shade_pal = MASTER_PALETTE[1:].astype(np.float32)
    idx_grid = np.zeros((G, G), dtype=np.int32)
    oy, ox = np.where(a_mask)
    if len(ox) > 0:
        pts = rgb_f[oy, ox]
        diffs = pts[:, None, :] - shade_pal[None, :, :]
        dists = np.sum(diffs * diffs, axis=2)
        idx_grid[oy, ox] = np.argmin(dists, axis=1) + 1

    for pass_i in range(despeckle_passes):
        new_idx = idx_grid.copy()
        for y in range(1, G - 1):
            for x in range(1, G - 1):
                if not a_mask[y, x]:
                    continue
                c = idx_grid[y, x]
                nbrs = []
                same = 0
                for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if a_mask[ny, nx]:
                        nc = idx_grid[ny, nx]
                        nbrs.append(nc)
                        if nc == c:
                            same += 1
                if len(nbrs) >= 2 and same == 0:
                    vals, counts = np.unique(nbrs, return_counts=True)
                    new_idx[y, x] = vals[int(np.argmax(counts))]
                elif pass_i >= 1 and len(nbrs) >= 3 and same <= 1:
                    vals, counts = np.unique(nbrs, return_counts=True)
                    best_i = int(np.argmax(counts))
                    if counts[best_i] >= 3:
                        new_idx[y, x] = vals[best_i]
        idx_grid = new_idx

    out_grid = np.zeros((G, G, 4), dtype=np.uint8)
    out_grid[a_mask, :3] = MASTER_PALETTE[idx_grid[a_mask]]
    out_grid[a_mask, 3] = 255

    if post_sculpt_fn is not None:
        post_sculpt_fn(out_grid, a_mask)

    n_up = np.zeros_like(a_mask); n_up[1:, :] = a_mask[:-1, :]
    n_dn = np.zeros_like(a_mask); n_dn[:-1, :] = a_mask[1:, :]
    n_lt = np.zeros_like(a_mask); n_lt[:, 1:] = a_mask[:, :-1]
    n_rt = np.zeros_like(a_mask); n_rt[:, :-1] = a_mask[:, 1:]
    selout_ring = (~a_mask) & (n_up | n_dn | n_lt | n_rt)
    selout_ring[:margin, :] = False
    selout_ring[-margin:, :] = False
    selout_ring[:, :margin] = False
    selout_ring[:, -margin:] = False

    out_grid[selout_ring, :3] = SELOUT_RGB
    out_grid[selout_ring, 3] = 255
    out_grid[out_grid[:, :, 3] == 0, :3] = 0

    up = np.repeat(np.repeat(out_grid, scale, axis=0), scale, axis=1)
    return Image.fromarray(up, mode="RGBA")


def pixelize_existing_cell512_positional(
    cell512: Image.Image,
    grid_sz: int,
    median_passes: tuple[int, ...] = (9, 5),
    posterize_step: int = 28,
    min_crumb_area: int = 4,
    post_sculpt_fn=None,
) -> Image.Image:
    """
    Converts a pre-registered `512x512` boss cell onto `grid_sz x grid_sz` -> `512x512` NEAREST
    while preserving 100% 1:1 joint/socket positional coordinates!
    """
    arr = np.array(cell512.convert("RGBA"), dtype=np.uint8)
    rgb = arr[:, :, :3].copy()
    a = arr[:, :, 3] > 128

    # Strip old dark #0d0f1c Selout border from RGB before smoothing so Selout doesn't muddy armor edges!
    is_old_sel = a & (rgb[:, :, 0] <= 18) & (rgb[:, :, 1] <= 20) & (rgb[:, :, 2] <= 34)
    core_a = a & (~is_old_sel)
    if np.sum(core_a) < 32:
        core_a = a

    fill_a = core_a.copy()
    for _ in range(8):
        trans = ~fill_a
        if not np.any(trans):
            break
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny_s = np.clip(np.arange(512) + dy, 0, 511)
            nx_s = np.clip(np.arange(512) + dx, 0, 511)
            nbr_a = fill_a[ny_s[:, None], nx_s[None, :]]
            nbr_rgb = rgb[ny_s[:, None], nx_s[None, :]]
            take = trans & nbr_a
            rgb[take] = nbr_rgb[take]
            fill_a[take] = True

    rgb_im = Image.fromarray(rgb, mode="RGB")
    for msz in median_passes:
        rgb_im = rgb_im.filter(ImageFilter.MedianFilter(size=msz))

    rgb_flat = np.array(rgb_im, dtype=np.int32)
    if posterize_step > 1:
        rgb_flat = np.clip((rgb_flat // posterize_step) * posterize_step + (posterize_step // 2), 0, 255)

    small_rgb = np.array(
        Image.fromarray(rgb_flat.astype(np.uint8), mode="RGB").resize((grid_sz, grid_sz), Image.Resampling.BILINEAR),
        dtype=np.float32,
    )
    small_a = (
        np.array(
            Image.fromarray((core_a.astype(np.uint8) * 255), mode="L").resize((grid_sz, grid_sz), Image.Resampling.BOX),
            dtype=np.uint8,
        )
        >= 108
    )

    return finalize_logical_grid_to_cell512(
        small_rgb,
        small_a,
        min_crumb_area=min_crumb_area,
        despeckle_passes=3,
        post_sculpt_fn=post_sculpt_fn,
    )


def make_ribcage_furnace_sculptor(is_beat_b: bool):
    """
    Replaces the soft AI radial airbrushed sun-ball in `(1,0)` & `(2,0)` (`TORSO_HEART_A/B`)
    on the `128x128` grid with a sculpted 16-bit pixel-art blazing furnace core + Bayer stipple +
    3 pairs of overarching dark-obsidian skeletal ribs!
    """
    def _sculpt(grid128: np.ndarray, a_mask: np.ndarray) -> None:
        rgb = grid128[:, :, :3].astype(np.int32)
        hot = a_mask & (rgb[:, :, 0] >= 200) & (rgb[:, :, 1] >= 90)
        hy, hx = np.where(hot)
        cx = float(np.median(hx)) if len(hx) > 12 else 55.0
        cy = float(np.median(hy)) if len(hy) > 12 else 68.0

        rx = 16.5 if is_beat_b else 14.5
        ry = 19.5 if is_beat_b else 17.5

        interior = np.zeros_like(a_mask)
        interior[2:-2, 2:-2] = (
            a_mask[2:-2, 2:-2] & a_mask[1:-3, 2:-2] & a_mask[3:-1, 2:-2] & a_mask[2:-2, 1:-3] & a_mask[2:-2, 3:-1]
        )

        # 1. Stepped 4-tier Bayer-stippled furnace fire inside ribcage cavity
        y0 = max(4, int(cy - ry - 4))
        y1 = min(124, int(cy + ry + 4))
        x0 = max(4, int(cx - rx - 4))
        x1 = min(124, int(cx + rx + 4))
        phase = 1.6 if is_beat_b else 0.0

        for y in range(y0, y1):
            for x in range(x0, x1):
                if not interior[y, x]:
                    continue
                nx = (x - cx) / rx
                ny = (y - cy) / ry
                # Upward flame-tongue modulation so it's a roaring fire, NOT a round circle!
                tongue = 0.16 * np.sin(nx * 9.5 + phase) * max(0.0, -ny + 0.3) + 0.09 * np.cos(ny * 8.0 - phase)
                d = np.hypot(nx, ny) - tongue
                if d > 1.02:
                    continue
                bayer = (BAYER_4X4[y & 3, x & 3] - 0.5) * 0.18
                heat = (1.0 - d) + bayer + (0.08 if is_beat_b else 0.0)
                if heat >= 0.76:
                    c = MASTER_PALETTE[12]  # White-hot
                elif heat >= 0.56:
                    c = MASTER_PALETTE[11]  # Incandescent gold
                elif heat >= 0.38:
                    c = MASTER_PALETTE[10]  # Solar amber
                elif heat >= 0.22:
                    c = MASTER_PALETTE[9]   # Magma orange
                else:
                    c = MASTER_PALETTE[8]   # Scarlet rim
                grid128[y, x, :3] = c

        # 2. 3 pairs of overarching dark-obsidian rib bars clasping across the furnace!
        rib_offsets_y = [-9, -1, 7]
        for r_idx, dy_rib in enumerate(rib_offsets_y):
            span_x = int(rx * (0.95 - r_idx * 0.08))
            cleft = 3 if r_idx == 1 else 2
            for side in (-1, 1):
                for dx_abs in range(cleft, span_x + 2):
                    px = int(round(cx + side * dx_abs))
                    u = dx_abs / float(max(1, span_x))
                    arch_y = int(round(cy + dy_rib + (u * u) * 3.5))
                    if not (4 <= px < 124 and 4 <= arch_y < 123):
                        continue
                    if interior[arch_y, px]:
                        grid128[arch_y, px, :3] = MASTER_PALETTE[2]  # Dark obsidian rib
                    if interior[arch_y - 1, px]:
                        grid128[arch_y - 1, px, :3] = MASTER_PALETTE[9] if dx_abs <= cleft + 2 else MASTER_PALETTE[3]
                    if interior[arch_y + 1, px]:
                        grid128[arch_y + 1, px, :3] = SELOUT_RGB

    return _sculpt


def cel_quantize_part_to_cell512(
    part_rgba: Image.Image,
    grid_sz: int,
    target_w: int,
    target_h: int,
    offset_grid: tuple[int, int] = (0, 0),
    median_passes: tuple[int, ...] = (9, 5),
    bright_boost: float = 1.0,
) -> Image.Image:
    arr = np.array(part_rgba, dtype=np.uint8)
    ys, xs = np.where(arr[:, :, 3] > 128)
    if len(xs) == 0:
        return Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    cropped = part_rgba.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))

    rgb_im = cropped.convert("RGB")
    for msz in median_passes:
        rgb_im = rgb_im.filter(ImageFilter.MedianFilter(size=msz))
    a_chan = cropped.split()[3]

    margin = 3 if grid_sz >= 64 else 2
    max_dim = grid_sz - 2 * margin
    cw, ch = cropped.size
    scale = min(target_w / max(1, cw), target_h / max(1, ch))
    nw = max(4, min(max_dim, int(round(cw * scale))))
    nh = max(4, min(max_dim, int(round(ch * scale))))

    rgb_arr = np.array(rgb_im, dtype=np.int32)
    rgb_arr = np.clip((rgb_arr // 28) * 28 + 14, 0, 255).astype(np.uint8)

    rgb_small = Image.fromarray(rgb_arr, mode="RGB").resize((nw, nh), Image.Resampling.BILINEAR)
    a_small = a_chan.resize((nw, nh), Image.Resampling.NEAREST)

    canvas_rgb = np.zeros((grid_sz, grid_sz, 3), dtype=np.float32)
    canvas_a = np.zeros((grid_sz, grid_sz), dtype=bool)

    px = max(margin, min(grid_sz - margin - nw, (grid_sz - nw) // 2 + offset_grid[0]))
    py = max(margin, min(grid_sz - margin - nh, (grid_sz - nh) // 2 + offset_grid[1]))

    rgb_np = np.clip(np.array(rgb_small, dtype=np.float32) * bright_boost, 0, 255)
    a_np = np.array(a_small, dtype=np.uint8) >= 128

    canvas_rgb[py : py + nh, px : px + nw] = rgb_np
    canvas_a[py : py + nh, px : px + nw] = a_np

    return finalize_logical_grid_to_cell512(
        canvas_rgb,
        canvas_a,
        min_crumb_area=2 if grid_sz <= 32 else 4,
        despeckle_passes=2 if grid_sz <= 32 else 3,
    )


def repair_cell_3_1_fist_meteor_raw(sheet: Image.Image) -> None:
    """Repairs Cell (3, 1) (`FIST_METEOR`) on the raw 512x512 backup before chunky 64x64 pixelization."""
    c21 = np.array(sheet.crop((2 * 512, 512, 3 * 512, 1024)), dtype=np.uint8)
    c31 = np.array(sheet.crop((3 * 512, 512, 4 * 512, 1024)), dtype=np.uint8)

    c31[478:, :, :] = 0
    c31[432:512, 136:376, :] = 0

    src_patch = c21[444:489, 126:386].copy()
    src_op = src_patch[:, :, 3] > 128
    dst_slice = c31[432:477, 126:386]
    warm = src_patch.astype(np.float32)
    is_not_selout = src_op & ((warm[:, :, 0] > 28) | (warm[:, :, 1] > 28) | (warm[:, :, 2] > 38))
    yy_rel = np.linspace(0.0, 1.0, src_patch.shape[0])[:, None]
    glow_mix = (yy_rel ** 1.6) * 0.28
    warm[:, :, 0] = np.clip(warm[:, :, 0] + glow_mix * 70, 0, 255)
    warm[:, :, 1] = np.clip(warm[:, :, 1] + glow_mix * 36, 0, 255)
    patched = src_patch.copy()
    patched[is_not_selout, :3] = warm[is_not_selout, :3].astype(np.uint8)
    dst_slice[src_op] = patched[src_op]
    c31[432:477, 126:386] = dst_slice

    for y in range(452, 480):
        u = (y - 452) / 27.0
        left_outer = int(round(80 + (u ** 1.35) * 44))
        left_inner = int(round(140 - (u ** 1.15) * 26))
        right_inner = int(round(372 + (u ** 1.15) * 26))
        right_outer = int(round(432 - (u ** 1.35) * 44))
        c31[y, :left_outer, :] = 0
        if y >= 458 and left_inner < 138:
            c31[y, left_inner:138, :] = 0
        if y >= 458 and right_inner > 374:
            c31[y, 374:right_inner, :] = 0
        c31[y, right_outer:, :] = 0

    cleaned = np.array(keep_largest_components(Image.fromarray(c31, mode="RGBA"), min_area=40), dtype=np.uint8)
    sheet.paste(Image.fromarray(cleaned, mode="RGBA"), (3 * 512, 512))


def build_locked_wing_cell128(
    wing_raw: Image.Image,
    arch_128: float,
    pinch_w: float,
    scale_h: float,
    is_left_wing: bool,
    root_xy128: tuple[int, int],
) -> Image.Image:
    """
    Builds a `512x512` wing cell on a `128x128` logical grid (`4x NEAREST -> 512x512`)
    with its gilded shoulder-root joint (`u = 0`) PINNED at `root_xy128` (`(121, 80)` -> `(484, 320)`
    or `(7, 80)` -> `(28, 320)`), guaranteeing `0.0px` shoulder-socket jump and `3.0px` world pixels!
    """
    arr = np.array(wing_raw, dtype=np.uint8)
    ys, xs = np.where(arr[:, :, 3] > 128)
    cropped = wing_raw.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))

    c_np = np.array(cropped, dtype=np.uint8)
    ry_pts = np.where(c_np[:, :36, 3] > 128)[0]
    root_v_frac = float(ry_pts.mean()) / max(1.0, float(cropped.height - 1)) if len(ry_pts) > 0 else 0.68

    rgb_im = cropped.convert("RGB").filter(ImageFilter.MedianFilter(size=9)).filter(ImageFilter.MedianFilter(size=5))
    rgb_arr = np.clip((np.array(rgb_im, dtype=np.int32) // 28) * 28 + 14, 0, 255).astype(np.uint8)
    a_chan = cropped.split()[3]

    base_w = 112
    base_h = int(round(base_w * (cropped.height / max(1, cropped.width))))
    nw = max(16, min(116, int(round(base_w * pinch_w))))
    nh = max(16, min(98, int(round(base_h * scale_h))))

    rgb_small = np.array(Image.fromarray(rgb_arr, mode="RGB").resize((nw, nh), Image.Resampling.BILINEAR), dtype=np.float32)
    a_small = np.array(a_chan.resize((nw, nh), Image.Resampling.NEAREST), dtype=np.uint8) >= 128

    root_x, root_y = root_xy128
    root_local_y = int(round(root_v_frac * (nh - 1)))

    canvas_rgb = np.zeros((128, 128, 3), dtype=np.float32)
    canvas_a = np.zeros((128, 128), dtype=bool)

    for sx in range(nw):
        u = sx / max(1, nw - 1)
        dy = int(round(arch_128 * (u ** 1.18)))
        dst_x = (root_x - sx) if is_left_wing else (root_x + sx)
        if dst_x < 3 or dst_x >= 125:
            continue
        dst_y0 = root_y - root_local_y + dy
        for sy in range(nh):
            if not a_small[sy, sx]:
                continue
            dy_pix = dst_y0 + sy
            if 3 <= dy_pix < 125:
                canvas_a[dy_pix, dst_x] = True
                canvas_rgb[dy_pix, dst_x] = rgb_small[sy, sx]

    return finalize_logical_grid_to_cell512(canvas_rgb, canvas_a, min_crumb_area=4, despeckle_passes=3)


def build_horizontal_siege_vambrace_cell64(raw_top: Image.Image) -> Image.Image:
    """Builds Cell `(4, 2)` on `64x64 -> 512x512` (`8x NEAREST`) matching `CLAW_OPEN (0, 1)`'s texel scale!"""
    claw0 = np.array(raw_top.crop((0, 512, 512, 1024)), dtype=np.uint8)
    c256 = claw0[::2, ::2].copy()
    bracer = c256[70:184, 126:244].copy()

    canvas256 = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    dr = ImageDraw.Draw(canvas256)
    dr.ellipse((24, 96, 86, 158), fill=(40, 34, 52, 255))
    dr.ellipse((30, 102, 82, 152), fill=(64, 54, 76, 255))
    dr.polygon([(186, 82), (222, 96), (236, 127), (220, 160), (186, 172)], fill=(40, 34, 52, 255))
    dr.polygon([(192, 90), (218, 102), (229, 127), (216, 152), (192, 164)], fill=(154, 114, 48, 255))
    dr.polygon([(196, 98), (214, 108), (221, 127), (212, 146), (196, 156)], fill=(64, 54, 76, 255))
    work = np.array(canvas256, dtype=np.uint8)

    for dx, dy, sx_sc, sy_sc in ((98, 66, 0.96, 1.08), (40, 71, 0.92, 0.98)):
        im = Image.fromarray(bracer, mode="RGBA")
        sw = max(8, int(round(im.width * sx_sc)))
        sh = max(8, int(round(im.height * sy_sc)))
        seg = np.array(im.resize((sw, sh), Image.Resampling.NEAREST), dtype=np.uint8)
        non_sel = (seg[:, :, 3] > 128) & ((seg[:, :, 0] > 18) | (seg[:, :, 1] > 20) | (seg[:, :, 2] > 34))
        for y in range(sh):
            ty = dy + y
            if 6 <= ty < 250:
                for x in range(sw):
                    tx = dx + x
                    if 6 <= tx < 250 and non_sel[y, x]:
                        work[ty, tx] = seg[y, x]

    hi512 = Image.fromarray(work, mode="RGBA").resize((512, 512), Image.Resampling.NEAREST)
    return pixelize_existing_cell512_positional(hi512, grid_sz=64, median_passes=(7, 5), min_crumb_area=3)


def build_abyssal_fist_rift_cell64(raw_top: Image.Image) -> Image.Image:
    """Builds Cell `(5, 2)` on `64x64 -> 512x512` (`8x NEAREST`) matching airborne fists `(2,1)`/`(3,1)`!"""
    rim256 = np.array(raw_top.crop((0, 0, 512, 512)), dtype=np.uint8)[::2, ::2]
    gey256 = np.array(raw_top.crop((4 * 512, 512, 5 * 512, 1024)), dtype=np.uint8)[::2, ::2]
    rim_inv = rim256[::-1, :, :].copy()
    rim_band = rim_inv[6:126, 16:240]

    work = np.zeros((256, 256, 4), dtype=np.uint8)
    bh, bw, _ = rim_band.shape
    for sx in range(bw):
        u = (sx / max(1, bw - 1)) * 2.0 - 1.0
        env = max(0.0, 1.0 - (u * u) ** 0.85)
        if env <= 0.06:
            continue
        col_h = max(6, int(round(bh * (0.28 + 0.72 * env) * 0.72)))
        arch_dy = int(round((u * u) * 18))
        dst_x = 16 + sx
        if not (8 <= dst_x < 248):
            continue
        for dy_i in range(col_h):
            sy = int(min(bh - 1, round(dy_i * (bh - 1) / max(1, col_h - 1))))
            if rim_band[sy, sx, 3] <= 128:
                continue
            px_rgb = rim_band[sy, sx, :3]
            if px_rgb[0] <= 18 and px_rgb[1] <= 20 and px_rgb[2] <= 34:
                continue
            dst_y = 74 + arch_dy + dy_i
            if 8 <= dst_y < 246:
                work[dst_y, dst_x, :3] = px_rgb
                work[dst_y, dst_x, 3] = 255

    gey_core = gey256[110:210, 68:188]
    gh, gw, _ = gey_core.shape
    for y in range(96, 186):
        for x in range(42, 214):
            nx = (x - 128.0) / 80.0
            ny = (y - 138.0) / 34.0
            r2 = nx * nx + ny * ny
            tooth = 0.14 * np.sin(nx * 19.0) + 0.09 * np.cos(nx * 31.0 + ny * 7.0)
            if r2 + tooth <= 0.92:
                gy = int(min(gh - 1, max(0, round(((y - 96) / 90.0) * (gh - 1)))))
                gx = int(min(gw - 1, max(0, round(((x - 42) / 172.0) * (gw - 1)))))
                work[y, x, 3] = 255
                if r2 <= 0.22:
                    work[y, x, :3] = [255, 250, 214]
                elif r2 <= 0.46:
                    work[y, x, :3] = [254, 218, 86]
                elif r2 <= 0.70:
                    work[y, x, :3] = [244, 104, 32]
                else:
                    src_c = gey_core[gy, gx, :3]
                    work[y, x, :3] = src_c if gey_core[gy, gx, 3] > 128 else [148, 36, 34]

    hi512 = Image.fromarray(work, mode="RGBA").resize((512, 512), Image.Resampling.NEAREST)
    return pixelize_existing_cell512_positional(hi512, grid_sz=64, median_passes=(5, 3), min_crumb_area=3)


def build_animated_hellfire_variant128(raw_top: Image.Image, phase: float, core_pulse: float) -> Image.Image:
    """Builds Frame B `(6,2)` & Frame C `(7,2)` on `128x128 -> 512x512` (`4x NEAREST`) matching `(6,1)`!"""
    hf256 = np.array(raw_top.crop((6 * 512, 512, 7 * 512, 1024)), dtype=np.uint8)[::2, ::2].copy()
    rgb_src = hf256[:, :, :3].astype(np.float32)
    a_src = hf256[:, :, 3] > 128
    non_sel = a_src & ((rgb_src[:, :, 0] > 18) | (rgb_src[:, :, 1] > 20) | (rgb_src[:, :, 2] > 34))

    xs_op = np.where(non_sel)[1]
    x_min, x_max = int(xs_op.min()), int(xs_op.max())
    span_w = max(1, x_max - x_min)

    work = np.zeros((256, 256, 4), dtype=np.uint8)
    for x in range(x_min, x_max + 1):
        u = (x_max - x) / float(span_w)
        dy = int(round(np.sin(u * 8.5 - phase) * 8.5 * (u ** 0.85)))
        pinch = 1.0 + 0.07 * np.cos(u * 6.2 - phase * 1.3) * (u ** 0.6)
        col_ys = np.where(non_sel[:, x])[0]
        for y in col_ys:
            sx = int(np.clip(round(x + np.sin((y / 13.0) + phase) * 4.0 * u), 0, 255))
            c_rgb = rgb_src[y, sx] if non_sel[y, sx] else rgb_src[y, x]
            ty = int(round(128.0 + (y - 128.0) * pinch + dy))
            if 6 <= ty < 250 and 6 <= x < 250:
                work[ty, x, :3] = np.clip(c_rgb * core_pulse, 0, 255).astype(np.uint8)
                work[ty, x, 3] = 255

    hi512 = Image.fromarray(work, mode="RGBA").resize((512, 512), Image.Resampling.NEAREST)
    return pixelize_existing_cell512_positional(hi512, grid_sz=128, median_passes=(7, 5), min_crumb_area=3)


def build_animated_claw_slash_variant128(raw_top: Image.Image, phase: float, flare_boost: float) -> Image.Image:
    """Builds Frame B `(0,3)` & Frame C `(1,3)` on `128x128 -> 512x512` (`4x NEAREST`) matching `(7,1)`!"""
    sl256 = np.array(raw_top.crop((7 * 512, 512, 8 * 512, 1024)), dtype=np.uint8)[::2, ::2].copy()
    rgb_src = sl256[:, :, :3].astype(np.float32)
    a_src = sl256[:, :, 3] > 128
    non_sel = a_src & ((rgb_src[:, :, 0] > 18) | (rgb_src[:, :, 1] > 20) | (rgb_src[:, :, 2] > 34))

    work = np.zeros((256, 256, 4), dtype=np.uint8)
    ys_op, xs_op = np.where(non_sel)
    x_min, x_max = int(xs_op.min()), int(xs_op.max())
    span_w = max(1, x_max - x_min)

    for y, x in zip(ys_op, xs_op):
        u = (x - x_min) / float(span_w)
        wave_dx = int(round(np.sin((y / 16.0) - phase) * (2.0 + 5.0 * u)))
        wave_dy = int(round(np.cos((x / 18.0) + phase) * (1.5 + 4.5 * u)))
        tx = x + wave_dx
        ty = y + wave_dy
        if 6 <= tx < 250 and 6 <= ty < 250:
            work[ty, tx, :3] = np.clip(rgb_src[y, x] * flare_boost, 0, 255).astype(np.uint8)
            work[ty, tx, 3] = 255

    hi512 = Image.fromarray(work, mode="RGBA").resize((512, 512), Image.Resampling.NEAREST)
    return pixelize_existing_cell512_positional(hi512, grid_sz=128, median_passes=(7, 5), min_crumb_area=3)


def build_sovereign_eclipse_crest_cell64(spire_raw: Image.Image) -> Image.Image:
    """Builds Cell `(6, 3)` on `64x64 -> 512x512` (`8x NEAREST`) so crown texels match Malphas's skull!"""
    arr = np.array(spire_raw, dtype=np.uint8)
    ys, xs = np.where(arr[:, :, 3] > 128)
    sp_crop = spire_raw.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
    sp_rgb = sp_crop.convert("RGB").filter(ImageFilter.MedianFilter(size=7))
    sp_a = sp_crop.split()[3]

    work = np.zeros((256, 256, 4), dtype=np.uint8)
    for y in range(74, 156):
        for x in range(38, 218):
            nx = (x - 128.0) / 86.0
            arch_y = 114.0 + (nx * nx) * 26.0
            band = abs(y - arch_y)
            if abs(nx) <= 0.98 and band <= 10.5 * (1.05 - 0.45 * nx * nx):
                work[y, x, 3] = 255
                if band <= 2.4:
                    work[y, x, :3] = [254, 218, 86]
                elif band <= 5.2:
                    work[y, x, :3] = [218, 178, 92]
                elif y < arch_y:
                    work[y, x, :3] = [64, 54, 76]
                else:
                    work[y, x, :3] = [40, 34, 52]

    specs = [
        (-62, 128, 26, 68, -0.28, 1.02),
        (-32, 118, 30, 86, -0.14, 1.08),
        (0,   114, 36, 104, 0.00, 1.16),
        (32,  118, 30, 86,  0.14, 1.08),
        (62,  128, 26, 68,  0.28, 1.02),
    ]
    for dx_off, base_y, sw, sh, tilt, boost in specs:
        s_rgb = np.array(sp_rgb.resize((sw, sh), Image.Resampling.BILINEAR), dtype=np.float32) * boost
        s_a = np.array(sp_a.resize((sw, sh), Image.Resampling.NEAREST), dtype=np.uint8) > 128
        for sy in range(sh):
            h_frac = 1.0 - (sy / max(1, sh - 1))
            taper = 0.55 + 0.45 * np.sin(min(1.0, sy / max(1.0, sh * 0.65)) * (np.pi * 0.5))
            shear_x = int(round(h_frac * sh * tilt))
            ty = base_y - (sh - 1 - sy)
            if not (10 <= ty < 156):
                continue
            for sx in range(sw):
                if not s_a[sy, sx]:
                    continue
                rel_x = (sx - sw * 0.5) / max(1.0, sw * 0.5)
                if abs(rel_x) > taper:
                    continue
                tx = int(round(128 + dx_off + (sx - sw * 0.5) + shear_x))
                if 10 <= tx < 246:
                    work[ty, tx, :3] = np.clip(s_rgb[sy, sx], 0, 255).astype(np.uint8)
                    work[ty, tx, 3] = 255

    hi512 = Image.fromarray(work, mode="RGBA").resize((512, 512), Image.Resampling.NEAREST)
    return pixelize_existing_cell512_positional(hi512, grid_sz=64, median_passes=(5, 3), min_crumb_area=3)


def build_exposed_heart_core_cell64() -> Image.Image:
    """
    Builds Cell `(7, 3)` directly on a `64x64` pixel grid (`8x NEAREST -> 512x512`) as a
    faceted obsidian-shard & Bayer-stippled white-hot magma heart rupture (`0` blurry gradients!).
    """
    canvas_rgb = np.zeros((64, 64, 3), dtype=np.float32)
    canvas_a = np.zeros((64, 64), dtype=bool)
    cx, cy = 31.5, 31.5

    for y in range(12, 52):
        for x in range(12, 52):
            nx = (x - cx) / 16.5
            ny = (y - cy) / 16.5
            r = np.hypot(nx, ny)
            ang = np.arctan2(ny, nx)
            facet = 0.80 + 0.14 * np.cos(ang * 4.0) + 0.08 * np.sin(ang * 7.0 + 0.6)
            if r <= facet:
                canvas_a[y, x] = True
                bayer = (BAYER_4X4[y & 3, x & 3] - 0.5) * 0.18
                heat = (1.0 - r / max(0.2, facet)) + bayer
                if r <= 0.24 or heat >= 0.78:
                    canvas_rgb[y, x] = MASTER_PALETTE[12]
                elif heat >= 0.56:
                    canvas_rgb[y, x] = MASTER_PALETTE[11]
                elif heat >= 0.38:
                    canvas_rgb[y, x] = MASTER_PALETTE[10]
                elif heat >= 0.20:
                    canvas_rgb[y, x] = MASTER_PALETTE[9]
                else:
                    canvas_rgb[y, x] = MASTER_PALETTE[2]

    return finalize_logical_grid_to_cell512(canvas_rgb, canvas_a, min_crumb_area=3, despeckle_passes=2)


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


def main() -> None:
    SCRATCH_DIR.mkdir(parents=True, exist_ok=True)
    assert TOP1024_BACKUP.exists(), f"Missing backup {TOP1024_BACKUP}"
    raw_top = Image.open(TOP1024_BACKUP).convert("RGBA")
    repair_cell_3_1_fist_meteor_raw(raw_top)

    out_sheet = Image.new("RGBA", (4096, 2048), (0, 0, 0, 0))

    # =========================================================================
    # ROW 0 (`y = 0..512`): 128x128 -> 512x512 (`4x NEAREST`) + SCULPTED PIXEL RIBCAGE FURNACE!
    # =========================================================================
    for col in range(8):
        raw_c = raw_top.crop((col * 512, 0, (col + 1) * 512, 512))
        sculpt_fn = None
        if col == 1:
            sculpt_fn = make_ribcage_furnace_sculptor(is_beat_b=False)
        elif col == 2:
            sculpt_fn = make_ribcage_furnace_sculptor(is_beat_b=True)
        c_hd2d = pixelize_existing_cell512_positional(
            raw_c,
            grid_sz=128,
            median_passes=(9, 5),
            posterize_step=28,
            min_crumb_area=4,
            post_sculpt_fn=sculpt_fn,
        )
        out_sheet.paste(c_hd2d, (col * 512, 0))

    # =========================================================================
    # ROW 1 (`y = 512..1024`): CLAWS/FISTS AT `64x64` (`8x`), GEYSERS/HELLFIRE/SLASH AT `128x128` (`4x`)!
    # =========================================================================
    for col in range(8):
        raw_c = raw_top.crop((col * 512, 512, (col + 1) * 512, 1024))
        gsz = 64 if col <= 3 else 128
        c_hd2d = pixelize_existing_cell512_positional(
            raw_c,
            grid_sz=gsz,
            median_passes=(9, 5),
            posterize_step=28,
            min_crumb_area=3 if gsz == 64 else 4,
        )
        out_sheet.paste(c_hd2d, (col * 512, 512))

    wings_arms_rgba = remove_white_bg(Image.open(REF_WINGS_ARMS))
    vfx_rgba = remove_white_bg(Image.open(REF_HELLFIRE_VFX))

    wing_raw = keep_largest_components(wings_arms_rgba.crop((25, 10, 1005, 558)), min_area=400, max_components=1)
    spire_raw = keep_largest_components(vfx_rgba.crop((15, 370, 420, 1005)), min_area=300, max_components=1)
    boulder_a_raw = keep_largest_components(vfx_rgba.crop((822, 600, 998, 790)), min_area=120, max_components=1)
    boulder_b_raw = keep_largest_components(vfx_rgba.crop((804, 795, 1002, 998)), min_area=120, max_components=1)

    # =========================================================================
    # ROW 2 (`y = 1024..1536`): ROOT-LOCKED WINGS (`128x128`), VAMBRACE/RIFT (`64x64`), HELLFIRE (`128x128`)
    # =========================================================================
    wing_up = build_locked_wing_cell128(wing_raw, arch_128=-26.0, pinch_w=0.91, scale_h=1.03, is_left_wing=True, root_xy128=(121, 80))
    wing_mid = build_locked_wing_cell128(wing_raw, arch_128=-3.0, pinch_w=0.98, scale_h=1.00, is_left_wing=True, root_xy128=(121, 80))
    wing_dn = build_locked_wing_cell128(wing_raw, arch_128=22.0, pinch_w=0.91, scale_h=1.03, is_left_wing=True, root_xy128=(121, 80))
    wing_rear = build_locked_wing_cell128(wing_raw, arch_128=-9.0, pinch_w=0.95, scale_h=1.00, is_left_wing=False, root_xy128=(7, 80))

    vambrace_horiz = build_horizontal_siege_vambrace_cell64(raw_top)
    fist_rift_collar = build_abyssal_fist_rift_cell64(raw_top)
    hellfire_b = build_animated_hellfire_variant128(raw_top, phase=2.09, core_pulse=1.04)
    hellfire_c = build_animated_hellfire_variant128(raw_top, phase=4.19, core_pulse=1.09)

    row2_cells = [wing_up, wing_mid, wing_dn, wing_rear, vambrace_horiz, fist_rift_collar, hellfire_b, hellfire_c]
    for col, cimg in enumerate(row2_cells):
        out_sheet.paste(cimg, (col * 512, 1024))

    # =========================================================================
    # ROW 3 (`y = 1536..2048`): SLASH (`128x128`), SPIRES (`64x64`), BOULDERS (`32x32`), CREST/HEART (`64x64`)
    # =========================================================================
    slash_b = build_animated_claw_slash_variant128(raw_top, phase=2.09, flare_boost=1.05)
    slash_c = build_animated_claw_slash_variant128(raw_top, phase=4.19, flare_boost=1.10)
    spire_1 = cel_quantize_part_to_cell512(
        spire_raw.crop((0, int(spire_raw.height * 0.24), spire_raw.width, spire_raw.height)),
        grid_sz=64, target_w=44, target_h=50, offset_grid=(0, 5), median_passes=(9, 5),
    )
    spire_2 = cel_quantize_part_to_cell512(
        spire_raw,
        grid_sz=64, target_w=48, target_h=58, offset_grid=(0, 1), median_passes=(9, 5), bright_boost=1.06,
    )
    boulder_a = cel_quantize_part_to_cell512(
        boulder_a_raw,
        grid_sz=32, target_w=22, target_h=22, offset_grid=(0, 0), median_passes=(9, 5),
    )
    boulder_b = cel_quantize_part_to_cell512(
        boulder_b_raw,
        grid_sz=32, target_w=24, target_h=24, offset_grid=(0, 0), median_passes=(9, 5), bright_boost=1.08,
    )
    crown_crest = build_sovereign_eclipse_crest_cell64(spire_raw)
    heart_core = build_exposed_heart_core_cell64()

    row3_cells = [slash_b, slash_c, spire_1, spire_2, boulder_a, boulder_b, crown_crest, heart_core]
    for col, cimg in enumerate(row3_cells):
        out_sheet.paste(cimg, (col * 512, 1536))

    # Strict Audit across ALL 32 cells!
    full_np = np.array(out_sheet, dtype=np.uint8)
    border_clips = 0
    for row in range(4):
        for col in range(8):
            cell_a = full_np[row * 512 : (row + 1) * 512, col * 512 : (col + 1) * 512, 3]
            if (
                np.any(cell_a[:4, :] > 0)
                or np.any(cell_a[-4:, :] > 0)
                or np.any(cell_a[:, :4] > 0)
                or np.any(cell_a[:, -4:] > 0)
            ):
                border_clips += 1
                print(f"[WARN] Border clip in cell ({col}, {row})!")
    assert border_clips == 0, f"Border clips detected: {border_clips}"

    semi_alpha = int(np.sum((full_np[:, :, 3] > 0) & (full_np[:, :, 3] < 255)))
    assert semi_alpha == 0, f"Semi-transparent pixels detected: {semi_alpha}"

    block4x4 = measure_block_uniformity(full_np, 4)
    assert block4x4 == 1.0, f"Expected 100.0% 4x4 block uniformity on boss_colossus_sheet, got {block4x4:.4f}"

    out_sheet.save(SHEET_PATH, format="PNG", optimize=True, compress_level=9)
    sz_kb = SHEET_PATH.stat().st_size / 1024.0
    print(
        f"[OK] Saved {SHEET_PATH}: 4096x2048 RGBA ({sz_kb:.1f} KB), "
        f"border_clips={border_clips}, 4x4={block4x4*100:.1f}%"
    )

    # Render clean dark-grid contact sheet (`2048x1024` = `0.5x`) for `view_file` visual verification
    dbg = Image.new("RGBA", (2048, 1024), (14, 16, 26, 255))
    dr = ImageDraw.Draw(dbg)
    half_sheet = out_sheet.resize((2048, 1024), Image.Resampling.NEAREST)
    for r in range(4):
        for c in range(8):
            bx, by = c * 256, r * 256
            bg = (22, 26, 40, 255) if (r + c) % 2 == 0 else (15, 18, 28, 255)
            dr.rectangle([bx, by, bx + 255, by + 255], fill=bg, outline=(46, 56, 82, 255))
    dbg.alpha_composite(half_sheet, (0, 0))
    for r in range(4):
        for c in range(8):
            dr.text((c * 256 + 6, r * 256 + 6), f"({c},{r})", fill=(253, 224, 71, 255))
    dbg.convert("RGB").save(DEBUG_OUT, optimize=True)
    print(f"[OK] Saved debug contact sheet: {DEBUG_OUT}")


if __name__ == "__main__":
    main()
