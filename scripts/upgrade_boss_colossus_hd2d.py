#!/usr/bin/env python3
"""
Rebuilds and repairs `assets/sprites/boss_colossus_sheet.png` (`4096x2048`, `8x4` of `512x512` cells)
using our mandatory HD-2D Reference-Art -> MedianFilter Cel-Flattening -> Curated Master Palette (`dither=NONE`)
-> 2-Pass Cardinal Despeckle -> `1px` (`2px` @ 512x512) `#0d0f1c` Selout pipeline.

Key Repairs & Cohesive Upgrades:
  1. Preserves `Row 0..1` (`4096x1024`) from backup (`boss_colossus_top1024_backup.png`) and cleanly repairs
     `Cell (3, 1)` (`FIST_METEOR`) using aligned solid knuckles from `Cell (2, 1)` (`dy = -12`), eliminating
     both the bottom rectangular box outline and knuckle checkerboard holes.
  2. Pins the exact gilded wing-shoulder root joint across `Cells (0,2), (1,2), (2,2)` at `(484, 320)`
     and `Cell (3,2)` at `(28, 320)` so wingbeats sweep `+196px` at the wingtips with `0.0px` shoulder jump.
  3. Rebuilds `Cell (4,2)` as a horizontal `-X` Segmented Obsidian-Rune Siege Vambrace (matching `CLAW_OPEN 0,1`,
     `0` flat amputated edges) and `Cell (5,2)` as an Abyssal Hell-Rift Siege Portal Collar for vertical fists.
  4. Derives `Cells (6,2) & (7,2)` directly as authentic pixel-animated Frame B & C variations of `Cell (6,1)`
     (`VFX_JAW_HELLFIRE`), and `Cells (0,3) & (1,3)` directly as Frame B & C variations of `Cell (7,1)`
     (`VFX_CLAW_SLASH`, `0` severed floating crab-claws).
  5. Rebuilds `Cell (6,3)` (`Sovereign Eclipse Crown Crest`) and `Cell (7,3)` (`Exposed Molten Heart-Core Rupture`)
     from authentic HD-2D obsidian/magma pixel art (`0` flat vector ovals or cartoon pinwheels).
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
DEBUG_OUT = SCRATCH_DIR / "debug_boss_colossus_hd2d.png"

SELOUT_RGB = (13, 15, 28)  # #0d0f1c

# Curated 24-color Abyssal Obsidian, Antique Gold, Crimson & White-Hot Magma Master Palette
MASTER_PALETTE = np.array(
    [
        [13, 15, 28],     # 0: #0d0f1c Selout
        [22, 20, 30],     # 1: Deep obsidian shadow
        [34, 29, 42],     # 2: Dark obsidian plate
        [50, 42, 58],     # 3: Mid obsidian slate
        [72, 58, 76],     # 4: Lit obsidian bevel
        [46, 18, 22],     # 5: Dark dried blood-crimson membrane
        [78, 24, 28],     # 6: Deep abyssal wing membrane
        [114, 32, 32],    # 7: Mid crimson wing / rune
        [156, 38, 34],    # 8: Bright crimson ember
        [198, 48, 34],    # 9: Scarlet hellfire outer
        [228, 76, 32],    # 10: Deep molten orange-red
        [246, 114, 34],   # 11: Blazing magma orange
        [252, 158, 44],   # 12: Solar amber flame
        [254, 204, 72],   # 13: Bright molten gold-yellow
        [254, 238, 138],  # 14: Incandescent pale yellow
        [255, 250, 214],  # 15: White-hot hellfire core
        [76, 54, 28],     # 16: Dark bronze trim shadow
        [116, 84, 38],    # 17: Antique bronze mid
        [158, 118, 52],   # 18: Warm gilded gold
        [198, 156, 74],   # 19: Bright gilded highlight
        [228, 192, 112],  # 20: Specular gold rim
        [62, 46, 42],     # 21: Volcanic char rock dark
        [94, 68, 58],     # 22: Volcanic basalt rock mid
        [128, 94, 78],    # 23: Volcanic rock highlight
    ],
    dtype=np.uint8,
)


def remove_white_bg(img_rgb: Image.Image, white_thresh: int = 234) -> Image.Image:
    """Flood-fills background white from edges + removes high-luma neutral gray/white halo pixels."""
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
    """Strips tiny floating crumbs (`< min_area` pixels) and optionally keeps only the `max_components` largest."""
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


def finalize_canvas256_to_cell512(
    canvas_rgb: np.ndarray,
    canvas_a: np.ndarray,
    min_crumb_area: int = 8,
    quantize_palette: bool = True,
) -> Image.Image:
    """Seals pinholes, strips floating crumbs, quantizes to MASTER_PALETTE, despeckles, adds 1px #0d0f1c Selout, and upscales 2x NEAREST -> 512x512."""
    canvas_rgb = canvas_rgb.copy().astype(np.float32)
    canvas_a = canvas_a.copy().astype(bool)

    for _ in range(2):
        n_up = np.zeros_like(canvas_a); n_up[1:, :] = canvas_a[:-1, :]
        n_dn = np.zeros_like(canvas_a); n_dn[:-1, :] = canvas_a[1:, :]
        n_lt = np.zeros_like(canvas_a); n_lt[:, 1:] = canvas_a[:, :-1]
        n_rt = np.zeros_like(canvas_a); n_rt[:, :-1] = canvas_a[:, 1:]
        card_cnt = n_up.astype(np.int8) + n_dn.astype(np.int8) + n_lt.astype(np.int8) + n_rt.astype(np.int8)
        pinholes = (~canvas_a) & (card_cnt >= 3)
        if np.any(pinholes):
            canvas_a[pinholes] = True
            canvas_rgb[pinholes] = np.array(SELOUT_RGB, dtype=np.float32)

    if min_crumb_area > 0:
        tmp_rgba = np.zeros((256, 256, 4), dtype=np.uint8)
        tmp_rgba[:, :, :3] = np.clip(canvas_rgb, 0, 255).astype(np.uint8)
        tmp_rgba[:, :, 3] = np.where(canvas_a, 255, 0).astype(np.uint8)
        cleaned_img = keep_largest_components(Image.fromarray(tmp_rgba, mode="RGBA"), min_area=min_crumb_area)
        cleaned_np = np.array(cleaned_img, dtype=np.uint8)
        canvas_rgb = cleaned_np[:, :, :3].astype(np.float32)
        canvas_a = cleaned_np[:, :, 3] > 0

    # Strictly enforce 3px margin (`6px` @ 512x512) so 0 border clips ever occur!
    canvas_a[:3, :] = False
    canvas_a[-3:, :] = False
    canvas_a[:, :3] = False
    canvas_a[:, -3:] = False

    out_256 = np.zeros((256, 256, 4), dtype=np.uint8)
    if quantize_palette:
        pal_f = MASTER_PALETTE.astype(np.float32)
        idx_grid = np.zeros((256, 256), dtype=np.int32)
        oy, ox = np.where(canvas_a)
        if len(ox) > 0:
            pts = canvas_rgb[oy, ox]
            diffs = pts[:, None, :] - pal_f[None, :, :]
            dists = np.sum(diffs * diffs, axis=2)
            idx_grid[oy, ox] = np.argmin(dists, axis=1)

        for _ in range(2):
            new_idx = idx_grid.copy()
            for y in range(1, 255):
                for x in range(1, 255):
                    if not canvas_a[y, x]:
                        continue
                    c = idx_grid[y, x]
                    nbrs = []
                    for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                        if canvas_a[ny, nx]:
                            nbrs.append(idx_grid[ny, nx])
                    if len(nbrs) >= 3 and c not in nbrs:
                        vals, counts = np.unique(nbrs, return_counts=True)
                        new_idx[y, x] = vals[int(np.argmax(counts))]
            idx_grid = new_idx
        out_256[canvas_a, :3] = MASTER_PALETTE[idx_grid[canvas_a]]
    else:
        out_256[canvas_a, :3] = np.clip(canvas_rgb[canvas_a], 0, 255).astype(np.uint8)

    out_256[canvas_a, 3] = 255

    n_up = np.zeros_like(canvas_a); n_up[1:, :] = canvas_a[:-1, :]
    n_dn = np.zeros_like(canvas_a); n_dn[:-1, :] = canvas_a[1:, :]
    n_lt = np.zeros_like(canvas_a); n_lt[:, 1:] = canvas_a[:, :-1]
    n_rt = np.zeros_like(canvas_a); n_rt[:, :-1] = canvas_a[:, 1:]
    selout_ring = (~canvas_a) & (n_up | n_dn | n_lt | n_rt)
    selout_ring[:2, :] = False
    selout_ring[-2:, :] = False
    selout_ring[:, :2] = False
    selout_ring[:, -2:] = False

    out_256[selout_ring, :3] = SELOUT_RGB
    out_256[selout_ring, 3] = 255

    return Image.fromarray(out_256, mode="RGBA").resize((512, 512), Image.Resampling.NEAREST)


def cel_quantize_to_cell512(
    part_rgba: Image.Image,
    target_w256: int,
    target_h256: int,
    offset_256: tuple[int, int] = (0, 0),
    median_size: int = 3,
    flip_x: bool = False,
    bright_boost: float = 1.0,
) -> Image.Image:
    arr = np.array(part_rgba, dtype=np.uint8)
    ys, xs = np.where(arr[:, :, 3] > 128)
    if len(xs) == 0:
        return Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    cropped = part_rgba.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
    if flip_x:
        cropped = cropped.transpose(Image.Transpose.FLIP_LEFT_RIGHT)

    rgb_flat = cropped.convert("RGB").filter(ImageFilter.MedianFilter(size=median_size))
    a_chan = cropped.split()[3]

    cw, ch = cropped.size
    scale = min(target_w256 / max(1, cw), target_h256 / max(1, ch))
    nw = max(4, min(244, int(round(cw * scale))))
    nh = max(4, min(244, int(round(ch * scale))))

    rgb_small = rgb_flat.resize((nw, nh), Image.Resampling.BILINEAR)
    a_small = a_chan.resize((nw, nh), Image.Resampling.NEAREST)

    canvas_rgb = np.zeros((256, 256, 3), dtype=np.float32)
    canvas_a = np.zeros((256, 256), dtype=bool)

    px = max(4, min(252 - nw, (256 - nw) // 2 + offset_256[0]))
    py = max(4, min(252 - nh, (256 - nh) // 2 + offset_256[1]))

    rgb_np = np.clip(np.array(rgb_small, dtype=np.float32) * bright_boost, 0, 255)
    a_np = np.array(a_small, dtype=np.uint8) >= 128

    canvas_rgb[py : py + nh, px : px + nw] = rgb_np
    canvas_a[py : py + nh, px : px + nw] = a_np

    return finalize_canvas256_to_cell512(canvas_rgb, canvas_a, min_crumb_area=8)


def repair_cell_3_1_fist_meteor(sheet: Image.Image) -> None:
    """
    Repairs Cell (3, 1) (`FIST_METEOR`) using aligned solid knuckles from Cell (2, 1) (`FIST_CRUSH`, shifted `dy = -12`):
      1. Strips the entire bottom rectangular white-box border & transparent hole (`y >= 468`)
      2. Restores solid, non-dithered dark-obsidian & molten-amber knuckles directly from Cell (2, 1)
      3. Tapers the left & right side flames smoothly upward into the outer knuckles with 2px `#0d0f1c` Selout.
    """
    c21 = np.array(sheet.crop((2 * 512, 512, 3 * 512, 1024)), dtype=np.uint8)
    c31 = np.array(sheet.crop((3 * 512, 512, 4 * 512, 1024)), dtype=np.uint8)

    # 1. Clear everything below y=476, and clear the damaged bottom-center box zone (`y=432..512, x=132..382`)
    c31[478:, :, :] = 0
    c31[432:512, 136:376, :] = 0

    # 2. Stamp aligned lower fist & knuckles from `c21` (`y_src = 444..489` -> `y_dst = 432..477`, `dx = 0, dy = -12`)
    src_patch = c21[444:489, 126:386].copy()
    src_op = src_patch[:, :, 3] > 128
    dst_slice = c31[432:477, 126:386]
    # Warm-tint bottom knuckle highlights slightly so they reflect the surrounding meteor flames
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

    # 3. Taper outer & inner side-flames (`x < 146` and `x > 366`) cleanly into organic pointed tongues near `y = 452..478`
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

    # 4. Strip any tiny disconnected crumbs and re-apply clean 2px `#0d0f1c` Selout along the repaired bottom contour (`y >= 446`)
    cleaned = np.array(keep_largest_components(Image.fromarray(c31, mode="RGBA"), min_area=40), dtype=np.uint8)
    alpha = cleaned[:, :, 3] > 0
    # Clear existing bottom selout in y=452..484 only where bordering transparency? Better: add 2px selout outside opaque pixels in y=448..484
    n_up = np.zeros_like(alpha); n_up[1:, :] = alpha[:-1, :]
    n_dn = np.zeros_like(alpha); n_dn[:-1, :] = alpha[1:, :]
    n_lt = np.zeros_like(alpha); n_lt[:, 1:] = alpha[:, :-1]
    n_rt = np.zeros_like(alpha); n_rt[:, :-1] = alpha[:, 1:]
    ring1 = (~alpha) & (n_up | n_dn | n_lt | n_rt)
    ring1[:446, :] = False
    ring1[508:, :] = False
    a2 = alpha | ring1
    n2_up = np.zeros_like(a2); n2_up[1:, :] = a2[:-1, :]
    n2_dn = np.zeros_like(a2); n2_dn[:-1, :] = a2[1:, :]
    n2_lt = np.zeros_like(a2); n2_lt[:, 1:] = a2[:, :-1]
    n2_rt = np.zeros_like(a2); n2_rt[:, :-1] = a2[:, 1:]
    ring2 = (~a2) & (n2_up | n2_dn | n2_lt | n2_rt)
    ring2[:446, :] = False
    ring2[508:, :] = False
    for ring in (ring1, ring2):
        cleaned[ring, 0] = SELOUT_RGB[0]
        cleaned[ring, 1] = SELOUT_RGB[1]
        cleaned[ring, 2] = SELOUT_RGB[2]
        cleaned[ring, 3] = 255

    sheet.paste(Image.fromarray(cleaned, mode="RGBA"), (3 * 512, 512))


def build_locked_wing_cell(
    wing_raw: Image.Image,
    arch_256: float,
    pinch_w: float,
    scale_h: float,
    is_left_wing: bool,
    root_xy256: tuple[int, int],
) -> Image.Image:
    """
    Builds a `512x512` wing cell with its gilded shoulder-root joint (`u = 0`) PINNED to `root_xy256`
    on the `256x256` grid (`2x` -> `512x512`). Eliminates 100% of shoulder-socket jumping across wingbeats!
    """
    arr = np.array(wing_raw, dtype=np.uint8)
    ys, xs = np.where(arr[:, :, 3] > 128)
    cropped = wing_raw.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))

    # Measure exact vertical center of the leftmost shoulder-root cuff (`x < 36`) in `cropped`
    c_np = np.array(cropped, dtype=np.uint8)
    ry_pts = np.where(c_np[:, :36, 3] > 128)[0]
    root_v_frac = float(ry_pts.mean()) / max(1.0, float(cropped.height - 1)) if len(ry_pts) > 0 else 0.68

    rgb_flat = cropped.convert("RGB").filter(ImageFilter.MedianFilter(size=3))
    a_chan = cropped.split()[3]

    base_w = 224
    base_h = int(round(base_w * (cropped.height / max(1, cropped.width))))
    nw = max(32, min(232, int(round(base_w * pinch_w))))
    nh = max(32, min(196, int(round(base_h * scale_h))))

    rgb_small = np.array(rgb_flat.resize((nw, nh), Image.Resampling.BILINEAR), dtype=np.float32)
    a_small = np.array(a_chan.resize((nw, nh), Image.Resampling.NEAREST), dtype=np.uint8) >= 128

    root_x, root_y = root_xy256
    root_local_y = int(round(root_v_frac * (nh - 1)))

    canvas_rgb = np.zeros((256, 256, 3), dtype=np.float32)
    canvas_a = np.zeros((256, 256), dtype=bool)

    for sx in range(nw):
        u = sx / max(1, nw - 1)  # 0.0 at gilded shoulder root, 1.0 at outer wingtip!
        dy = int(round(arch_256 * (u ** 1.18)))
        dst_x = (root_x - sx) if is_left_wing else (root_x + sx)
        if dst_x < 4 or dst_x >= 252:
            continue
        dst_y0 = root_y - root_local_y + dy
        for sy in range(nh):
            if not a_small[sy, sx]:
                continue
            dy_pix = dst_y0 + sy
            if 4 <= dy_pix < 252:
                canvas_a[dy_pix, dst_x] = True
                canvas_rgb[dy_pix, dst_x] = rgb_small[sy, sx]

    return finalize_canvas256_to_cell512(canvas_rgb, canvas_a, min_crumb_area=8)


def build_horizontal_siege_vambrace_cell(top_half: Image.Image) -> Image.Image:
    """
    Builds Cell `(4, 2)`: a 100% horizontal (`-X`) Segmented Obsidian-Rune Siege Vambrace & Elbow Plate
    derived directly from `CLAW_OPEN (0, 1)`'s horizontal rune-gauntlet cuff (`0` flat amputated edges!).
    """
    claw0 = np.array(top_half.crop((0, 512, 512, 1024)), dtype=np.uint8)
    # Downsample 512->256 logical pixels
    c256 = claw0[::2, ::2].copy()
    # Extract the right-side segmented obsidian-gold rune gauntlet (`x = 126..244, y = 70..184`)
    bracer = c256[70:184, 126:244].copy()  # shape (114, 118, 4)

    canvas_rgb = np.zeros((256, 256, 3), dtype=np.float32)
    canvas_a = np.zeros((256, 256), dtype=bool)

    def stamp_segment(seg_rgba: np.ndarray, dx: int, dy: int, scale_x: float = 1.0, scale_y: float = 1.0) -> None:
        im = Image.fromarray(seg_rgba, mode="RGBA")
        sw = max(8, int(round(im.width * scale_x)))
        sh = max(8, int(round(im.height * scale_y)))
        rgb_s = np.array(im.convert("RGB").resize((sw, sh), Image.Resampling.NEAREST), dtype=np.float32)
        a_s = np.array(im.split()[3].resize((sw, sh), Image.Resampling.NEAREST), dtype=np.uint8) > 128
        # Strip old outer #0d0f1c Selout so overlapping segments fuse seamlessly before fresh Selout!
        non_sel = a_s & ((rgb_s[:, :, 0] > 18) | (rgb_s[:, :, 1] > 20) | (rgb_s[:, :, 2] > 34))
        for y in range(sh):
            ty = dy + y
            if not (5 <= ty < 251):
                continue
            for x in range(sw):
                tx = dx + x
                if 5 <= tx < 251 and non_sel[y, x]:
                    canvas_a[ty, tx] = True
                    canvas_rgb[ty, tx] = rgb_s[y, x]

    # Rounded dark-obsidian wrist plug on the left (`x ~ 24..64`) that tucks seamlessly inside the claw's cuff
    plug = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    dr = ImageDraw.Draw(plug)
    dr.ellipse((24, 96, 86, 158), fill=(34, 29, 42, 255))
    dr.ellipse((30, 102, 82, 152), fill=(50, 42, 58, 255))
    # Rear rounded Gothic elbow couter cap on the right (`x ~ 182..234`) so right edge ends in an armored point, NOT a flat cut!
    dr.polygon([(186, 82), (222, 96), (236, 127), (220, 160), (186, 172)], fill=(34, 29, 42, 255))
    dr.polygon([(192, 90), (218, 102), (229, 127), (216, 152), (192, 164)], fill=(158, 118, 52, 255))
    dr.polygon([(196, 98), (214, 108), (221, 127), (212, 146), (196, 156)], fill=(50, 42, 58, 255))
    plug_np = np.array(plug, dtype=np.uint8)
    pm = plug_np[:, :, 3] > 128
    canvas_a[pm] = True
    canvas_rgb[pm] = plug_np[pm, :3].astype(np.float32)

    # Stamp larger upper-forearm plate on the right (`dx = 98`), then front wrist-gauntlet segment on the left (`dx = 40`)
    stamp_segment(bracer, dx=98, dy=66, scale_x=0.96, scale_y=1.08)
    stamp_segment(bracer, dx=40, dy=71, scale_x=0.92, scale_y=0.98)

    return finalize_canvas256_to_cell512(canvas_rgb, canvas_a, min_crumb_area=10)


def build_abyssal_fist_rift_cell(top_half: Image.Image) -> Image.Image:
    """
    Builds Cell `(5, 2)`: an Abyssal Volcanic Hell-Rift Portal Maw out of which Malphas's airborne
    vertical Siege-Fist (`2,1` / `3,1`) plunges onto the road (`0` mid-air floating bicep stumps!).
    Crafted from `CALDERA_RIM (0,0)` inverted obsidian fangs + `GEYSER_A (4,1)` magma flare.
    """
    rim512 = np.array(top_half.crop((0, 0, 512, 512)), dtype=np.uint8)[::2, ::2]
    gey512 = np.array(top_half.crop((4 * 512, 512, 5 * 512, 1024)), dtype=np.uint8)[::2, ::2]

    # Flip caldera rim upside-down so jagged obsidian spikes hang downward around an overhead sky rift!
    rim_inv = rim512[::-1, :, :].copy()
    # Extract the jagged spiked rim band (`y = 6..126, x = 16..240`)
    rim_band = rim_inv[6:126, 16:240]

    canvas_rgb = np.zeros((256, 256, 3), dtype=np.float32)
    canvas_a = np.zeros((256, 256), dtype=bool)

    # Taper `rim_band` vertically along an elliptical portal arch so left/right tips curve smoothly to points!
    bh, bw, _ = rim_band.shape
    for sx in range(bw):
        u = (sx / max(1, bw - 1)) * 2.0 - 1.0  # -1 .. +1
        env = max(0.0, 1.0 - (u * u) ** 0.85)
        if env <= 0.06:
            continue
        col_h = max(6, int(round(bh * (0.28 + 0.72 * env) * 0.72)))
        arch_dy = int(round((u * u) * 18))
        dst_x = 16 + sx
        if not (6 <= dst_x < 250):
            continue
        for dy_i in range(col_h):
            sy = int(min(bh - 1, round(dy_i * (bh - 1) / max(1, col_h - 1))))
            if rim_band[sy, sx, 3] <= 128:
                continue
            px_rgb = rim_band[sy, sx, :3]
            if px_rgb[0] <= 18 and px_rgb[1] <= 20 and px_rgb[2] <= 34:
                continue
            dst_y = 74 + arch_dy + dy_i
            if 6 <= dst_y < 248:
                canvas_a[dst_y, dst_x] = True
                canvas_rgb[dst_y, dst_x] = px_rgb.astype(np.float32)

    # Carve blazing molten portal core along the lower breach mouth (`cx = 128, cy = 140`) using geyser plasma colors
    gey_core = gey512[110:210, 68:188]
    gh, gw, _ = gey_core.shape
    for y in range(96, 186):
        for x in range(42, 214):
            nx = (x - 128.0) / 80.0
            ny = (y - 138.0) / 34.0
            r2 = nx * nx + ny * ny
            # Jagged flame teeth modulation without geometric smooth rings
            tooth = 0.14 * np.sin(nx * 19.0) + 0.09 * np.cos(nx * 31.0 + ny * 7.0)
            if r2 + tooth <= 0.92:
                gy = int(min(gh - 1, max(0, round(((y - 96) / 90.0) * (gh - 1)))))
                gx = int(min(gw - 1, max(0, round(((x - 42) / 172.0) * (gw - 1)))))
                canvas_a[y, x] = True
                if r2 <= 0.22:
                    canvas_rgb[y, x] = [255, 250, 214]
                elif r2 <= 0.46:
                    canvas_rgb[y, x] = [254, 204, 72]
                elif r2 <= 0.70:
                    canvas_rgb[y, x] = [246, 114, 34]
                else:
                    src_c = gey_core[gy, gx, :3]
                    canvas_rgb[y, x] = src_c if gey_core[gy, gx, 3] > 128 else [156, 38, 34]

    return finalize_canvas256_to_cell512(canvas_rgb, canvas_a, min_crumb_area=12)


def build_animated_hellfire_variant(top_half: Image.Image, phase: float, core_pulse: float) -> Image.Image:
    """
    Derives authentic Frame B `(6,2)` and Frame C `(7,2)` directly from `Cell (6,1)` (`VFX_JAW_HELLFIRE`):
      - Right-side mouth blast origin (`x_256 >= 232`) stays 100% locked at Malphas's open jaws!
      - Internal plasma tongues & left-streaming smoke curls scroll leftward (`-X`) via sinusoidal pixel waves.
    """
    hf512 = np.array(top_half.crop((6 * 512, 512, 7 * 512, 1024)), dtype=np.uint8)
    hf256 = hf512[::2, ::2].copy()

    rgb_src = hf256[:, :, :3].astype(np.float32)
    a_src = hf256[:, :, 3] > 128
    # Strip existing outer Selout so wave shift re-contours cleanly
    non_sel = a_src & ((rgb_src[:, :, 0] > 18) | (rgb_src[:, :, 1] > 20) | (rgb_src[:, :, 2] > 34))

    xs_op = np.where(non_sel)[1]
    x_min, x_max = int(xs_op.min()), int(xs_op.max())
    span_w = max(1, x_max - x_min)

    canvas_rgb = np.zeros((256, 256, 3), dtype=np.float32)
    canvas_a = np.zeros((256, 256), dtype=bool)

    for x in range(x_min, x_max + 1):
        # u = 0.0 at right mouth origin (`x_max`), u = 1.0 at left smoke/flame tail (`x_min`)
        u = (x_max - x) / float(span_w)
        dy = int(round(np.sin(u * 8.5 - phase) * 8.5 * (u ** 0.85)))
        pinch = 1.0 + 0.07 * np.cos(u * 6.2 - phase * 1.3) * (u ** 0.6)
        col_ys = np.where(non_sel[:, x])[0]
        if len(col_ys) == 0:
            continue
        cy_mid = 128.0
        for y in col_ys:
            # Horizontal internal tongue surge so bright core licks forward/back inside the torrent!
            sx = int(np.clip(round(x + np.sin((y / 13.0) + phase) * 4.0 * u), 0, 255))
            c_rgb = rgb_src[y, sx] if non_sel[y, sx] else rgb_src[y, x]
            ty = int(round(cy_mid + (y - cy_mid) * pinch + dy))
            if 5 <= ty < 251 and 5 <= x < 251:
                canvas_a[ty, x] = True
                canvas_rgb[ty, x] = np.clip(c_rgb * core_pulse, 0, 255)

    return finalize_canvas256_to_cell512(canvas_rgb, canvas_a, min_crumb_area=4)


def build_animated_claw_slash_variant(top_half: Image.Image, phase: float, flare_boost: float) -> Image.Image:
    """
    Derives authentic Frame B `(0,3)` and Frame C `(1,3)` directly from `Cell (7,1)` (`VFX_CLAW_SLASH`):
      - Preserves the exact sweeping 3-layered molten crescent geometry (`0` severed floating crab-claws!).
      - Animates curling flame-tongues along the arc and advances trailing molten sparks!
    """
    sl512 = np.array(top_half.crop((7 * 512, 512, 8 * 512, 1024)), dtype=np.uint8)
    sl256 = sl512[::2, ::2].copy()

    rgb_src = sl256[:, :, :3].astype(np.float32)
    a_src = sl256[:, :, 3] > 128
    non_sel = a_src & ((rgb_src[:, :, 0] > 18) | (rgb_src[:, :, 1] > 20) | (rgb_src[:, :, 2] > 34))

    canvas_rgb = np.zeros((256, 256, 3), dtype=np.float32)
    canvas_a = np.zeros((256, 256), dtype=bool)

    ys_op, xs_op = np.where(non_sel)
    x_min, x_max = int(xs_op.min()), int(xs_op.max())
    span_w = max(1, x_max - x_min)

    for y, x in zip(ys_op, xs_op):
        # u = 0 along left leading crescent edge, u = 1 toward upper-right trailing flame tips
        u = (x - x_min) / float(span_w)
        wave_dx = int(round(np.sin((y / 16.0) - phase) * (2.0 + 5.0 * u)))
        wave_dy = int(round(np.cos((x / 18.0) + phase) * (1.5 + 4.5 * u)))
        tx = x + wave_dx
        ty = y + wave_dy
        if 5 <= tx < 251 and 5 <= ty < 251:
            canvas_a[ty, tx] = True
            canvas_rgb[ty, tx] = np.clip(rgb_src[y, x] * flare_boost, 0, 255)

    return finalize_canvas256_to_cell512(canvas_rgb, canvas_a, min_crumb_area=3)


def build_sovereign_eclipse_crest_cell(spire_raw: Image.Image) -> Image.Image:
    """
    Builds Cell `(6, 3)`: a sculpted HD-2D Gothic 5-Spire Obsidian & Molten-Gold Eclipse Crown Crest
    using textured volcanic spire art (`spire_raw`) arranged into an upper diadem arc (`y_256: 22..148`,
    open concave underside so it crowns cleanly ABOVE Malphas's horns without crossing his face!).
    """
    arr = np.array(spire_raw, dtype=np.uint8)
    ys, xs = np.where(arr[:, :, 3] > 128)
    sp_crop = spire_raw.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
    sp_rgb = sp_crop.convert("RGB").filter(ImageFilter.MedianFilter(size=3))
    sp_a = sp_crop.split()[3]

    canvas_rgb = np.zeros((256, 256, 3), dtype=np.float32)
    canvas_a = np.zeros((256, 256), dtype=bool)

    # Dark-crimson & gilded-gold arched eclipse diadem bridge (`y ~ 104..144`, concave bottom cut!)
    for y in range(74, 156):
        for x in range(38, 218):
            nx = (x - 128.0) / 86.0
            arch_y = 114.0 + (nx * nx) * 26.0
            band = abs(y - arch_y)
            if abs(nx) <= 0.98 and band <= 10.5 * (1.05 - 0.45 * nx * nx):
                canvas_a[y, x] = True
                if band <= 2.4:
                    canvas_rgb[y, x] = [254, 204, 72]
                elif band <= 5.2:
                    canvas_rgb[y, x] = [198, 156, 74]
                elif y < arch_y:
                    canvas_rgb[y, x] = [72, 58, 76]
                else:
                    canvas_rgb[y, x] = [34, 29, 42]

    # Stamp 5 textured volcanic-obsidian & magma crown spires rising vertically/fanned via column-shear (`0` smooth blur)
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
            h_frac = 1.0 - (sy / max(1, sh - 1))  # 0 at base, 1 at spire tip
            # Taper base narrower so it roots cleanly into the diadem arch
            taper = 0.55 + 0.45 * np.sin(min(1.0, sy / max(1.0, sh * 0.65)) * (np.pi * 0.5))
            shear_x = int(round(h_frac * sh * tilt))
            ty = base_y - (sh - 1 - sy)
            if not (8 <= ty < 156):
                continue
            for sx in range(sw):
                if not s_a[sy, sx]:
                    continue
                rel_x = (sx - sw * 0.5) / max(1.0, sw * 0.5)
                if abs(rel_x) > taper:
                    continue
                tx = int(round(128 + dx_off + (sx - sw * 0.5) + shear_x))
                if 8 <= tx < 248:
                    canvas_a[ty, tx] = True
                    canvas_rgb[ty, tx] = np.clip(s_rgb[sy, sx], 0, 255)

    return finalize_canvas256_to_cell512(canvas_rgb, canvas_a, min_crumb_area=8)


def build_exposed_heart_core_cell(top_half: Image.Image) -> Image.Image:
    """
    Builds Cell `(7, 3)`: a sculpted HD-2D Exposed Molten Heart-Core Rupture extracted & intensified
    from `TORSO_HEART_B (2, 0)`'s actual blazing ribcage heart (`~228x228` in `512x512`, `0` flat cartoon shuriken!).
    """
    tB = np.array(top_half.crop((2 * 512, 0, 3 * 512, 512)), dtype=np.uint8)
    # Extract heart & inner glowing ribs (`x = 148..296, y = 208..356` -> `148x148`)
    heart_patch = Image.fromarray(tB[208:356, 148:296], mode="RGBA")
    hp_rgb = np.array(heart_patch.convert("RGB").resize((124, 124), Image.Resampling.BILINEAR), dtype=np.float32)

    canvas_rgb = np.zeros((256, 256, 3), dtype=np.float32)
    canvas_a = np.zeros((256, 256), dtype=bool)

    for py in range(124):
        for px in range(124):
            nx = (px - 62.0) / 58.0
            ny = (py - 62.0) / 58.0
            r = np.hypot(nx, ny)
            ang = np.arctan2(ny, nx)
            # Jagged crystalline rib-fissure star silhouette (8 uneven facets, NOT a pinwheel!)
            facet = 0.78 + 0.14 * np.cos(ang * 4.0) + 0.08 * np.sin(ang * 7.0 + 0.6)
            if r <= facet:
                tx = 66 + px
                ty = 66 + py
                c = hp_rgb[py, px].copy()
                luma = (c[0] + c[1] + c[2]) / 3.0
                if r <= 0.24:
                    c = np.array([255.0, 250.0, 214.0])
                elif r <= 0.44:
                    c = np.clip(c * 1.28 + np.array([48.0, 28.0, 0.0]), 0, 255)
                elif luma < 45 and r > 0.62:
                    # Outer jagged obsidian rib-shard rim
                    c = np.array([50.0, 42.0, 58.0])
                canvas_a[ty, tx] = True
                canvas_rgb[ty, tx] = c

    return finalize_canvas256_to_cell512(canvas_rgb, canvas_a, min_crumb_area=8)


def main() -> None:
    SCRATCH_DIR.mkdir(parents=True, exist_ok=True)
    if TOP1024_BACKUP.exists():
        top_half = Image.open(TOP1024_BACKUP).convert("RGBA")
    else:
        orig = Image.open(SHEET_PATH).convert("RGBA")
        top_half = orig.crop((0, 0, 4096, 1024))
        top_half.save(TOP1024_BACKUP)

    out_sheet = Image.new("RGBA", (4096, 2048), (0, 0, 0, 0))
    out_sheet.paste(top_half, (0, 0))
    repair_cell_3_1_fist_meteor(out_sheet)

    wings_arms_rgba = remove_white_bg(Image.open(REF_WINGS_ARMS))
    vfx_rgba = remove_white_bg(Image.open(REF_HELLFIRE_VFX))

    wing_raw = keep_largest_components(wings_arms_rgba.crop((25, 10, 1005, 558)), min_area=400, max_components=1)
    spire_raw = keep_largest_components(vfx_rgba.crop((15, 370, 420, 1005)), min_area=300, max_components=1)
    boulder_a_raw = keep_largest_components(vfx_rgba.crop((822, 600, 998, 790)), min_area=120, max_components=1)
    boulder_b_raw = keep_largest_components(vfx_rgba.crop((804, 795, 1002, 998)), min_area=120, max_components=1)

    # =========================================================================
    # ROW 2 (`y = 1024..1536`): ROOT-LOCKED GREAT-WINGS + VAMBRACE/RIFT + COHESIVE HELLFIRE
    # =========================================================================
    # Shoulder root pinned at `(242, 160)` (`(484, 320)` in `512x512`) across ALL 3 Left-Wing poses!
    wing_up = build_locked_wing_cell(wing_raw, arch_256=-52.0, pinch_w=0.91, scale_h=1.03, is_left_wing=True, root_xy256=(242, 160))
    wing_mid = build_locked_wing_cell(wing_raw, arch_256=-6.0, pinch_w=0.98, scale_h=1.00, is_left_wing=True, root_xy256=(242, 160))
    wing_dn = build_locked_wing_cell(wing_raw, arch_256=44.0, pinch_w=0.91, scale_h=1.03, is_left_wing=True, root_xy256=(242, 160))
    # Rear/Right Wing shoulder root pinned at `(14, 160)` (`(28, 320)` in `512x512`), fanning `+X` right!
    wing_rear = build_locked_wing_cell(wing_raw, arch_256=-18.0, pinch_w=0.95, scale_h=1.00, is_left_wing=False, root_xy256=(14, 160))

    vambrace_horiz = build_horizontal_siege_vambrace_cell(out_sheet)
    fist_rift_collar = build_abyssal_fist_rift_cell(out_sheet)
    hellfire_b = build_animated_hellfire_variant(out_sheet, phase=2.09, core_pulse=1.04)
    hellfire_c = build_animated_hellfire_variant(out_sheet, phase=4.19, core_pulse=1.09)

    row2_cells = [wing_up, wing_mid, wing_dn, wing_rear, vambrace_horiz, fist_rift_collar, hellfire_b, hellfire_c]
    for col, cimg in enumerate(row2_cells):
        out_sheet.paste(cimg, (col * 512, 1024))

    # =========================================================================
    # ROW 3 (`y = 1536..2048`): COHESIVE CLAW WAVES + SPIRES + BOULDERS + CREST + HEART CORE
    # =========================================================================
    slash_b = build_animated_claw_slash_variant(out_sheet, phase=2.09, flare_boost=1.05)
    slash_c = build_animated_claw_slash_variant(out_sheet, phase=4.19, flare_boost=1.10)
    spire_1 = cel_quantize_to_cell512(
        spire_raw.crop((0, int(spire_raw.height * 0.24), spire_raw.width, spire_raw.height)),
        176, 196, (0, 22), median_size=3
    )
    spire_2 = cel_quantize_to_cell512(spire_raw, 188, 240, (0, 4), median_size=3, bright_boost=1.06)
    boulder_a = cel_quantize_to_cell512(boulder_a_raw, 168, 168, (0, 0), median_size=3)
    boulder_b = cel_quantize_to_cell512(boulder_b_raw, 176, 176, (0, 0), median_size=3, bright_boost=1.08)
    crown_crest = build_sovereign_eclipse_crest_cell(spire_raw)
    heart_core = build_exposed_heart_core_cell(out_sheet)

    row3_cells = [slash_b, slash_c, spire_1, spire_2, boulder_a, boulder_b, crown_crest, heart_core]
    for col, cimg in enumerate(row3_cells):
        out_sheet.paste(cimg, (col * 512, 1536))

    # Verify 0 border clips across all repaired/rebuilt cells
    full_np = np.array(out_sheet, dtype=np.uint8)
    border_clips = 0
    for row in range(4):
        for col in range(8):
            if row < 2 and (col, row) != (3, 1):
                continue
            cell_a = full_np[row * 512 : (row + 1) * 512, col * 512 : (col + 1) * 512, 3]
            if (
                np.any(cell_a[:2, :] > 0)
                or np.any(cell_a[-2:, :] > 0)
                or np.any(cell_a[:, :2] > 0)
                or np.any(cell_a[:, -2:] > 0)
            ):
                border_clips += 1
                print(f"[WARN] Border clip in cell ({col}, {row})!")

    out_sheet.save(SHEET_PATH, format="PNG", optimize=True, compress_level=9)
    print(f"[OK] Saved repaired & cohesive {SHEET_PATH} ({out_sheet.width}x{out_sheet.height}, border_clips={border_clips})")

    # Render crisp dark-slate debug contact sheet + zoomed Cell (3,1) verification image
    dbg = Image.new("RGBA", (1600, 820), (18, 22, 36, 255))
    thumb = out_sheet.resize((1600, 800), Image.Resampling.NEAREST)
    dbg.alpha_composite(thumb, (0, 20))
    dr = ImageDraw.Draw(dbg)
    for c in range(8):
        for r in range(4):
            x0, y0 = c * 200, 20 + r * 200
            dr.rectangle((x0, y0, x0 + 199, y0 + 199), outline=(56, 189, 248, 110), width=1)
            dr.text((x0 + 5, y0 + 4), f"({c},{r})", fill=(254, 240, 138, 255))
    dbg.save(DEBUG_OUT, format="PNG")

    fist_dbg = Image.new("RGBA", (1060, 540), (28, 20, 38, 255))
    fdr = ImageDraw.Draw(fist_dbg)
    for y in range(14, 526, 16):
        for x in range(534, 1046, 16):
            col_c = (220, 40, 180, 255) if ((x // 16 + y // 16) % 2 == 0) else (90, 20, 90, 255)
            fdr.rectangle((x, y, x + 15, y + 15), fill=col_c)
    fist_dbg.alpha_composite(out_sheet.crop((2 * 512, 512, 3 * 512, 1024)), (10, 14))
    fist_dbg.alpha_composite(out_sheet.crop((3 * 512, 512, 4 * 512, 1024)), (534, 14))
    fdr.text((14, 2), "Cell (2,1) FIST_CRUSH", fill=(255, 255, 255, 255))
    fdr.text((538, 2), "Cell (3,1) FIST_METEOR REPAIRED", fill=(255, 255, 255, 255))
    fist_dbg.save(SCRATCH_DIR / "inspect_fists_after.png", format="PNG")
    print(f"[OK] Rendered {DEBUG_OUT} and {SCRATCH_DIR / 'inspect_fists_after.png'}")


if __name__ == "__main__":
    main()
