#!/usr/bin/env python3
"""
Upgrades `assets/sprites/boss_colossus_sheet.png` from `4096x1024` (8x2) to `4096x2048` (8x4 of 512x512 cells)
using our mandatory HD-2D Reference-Art -> MedianFilter Cel-Flattening -> Curated Master Palette (`dither=NONE`)
-> 2-Pass Cardinal Despeckle -> `1px` (`2px` @ 512x512) `#0d0f1c` Selout pipeline.

Also cleans the rectangular bottom-edge white artifact in existing Cell (3, 1) while keeping all 16 existing
Row 0..1 cells (`512x512` each) 100% layout-compatible with `Suite 20`.
"""

from collections import deque
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

REPO_ROOT = Path("/home/antigravity/pandora523/arcane-vs-steel")
SHEET_PATH = REPO_ROOT / "assets/sprites/boss_colossus_sheet.png"
REF_WINGS_ARMS = Path(
    "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/"
    "7821d65d-384a-4e26-8167-f32a84e377d8/boss_malphas_wings_arms_1794672302136.jpg"
)
REF_HELLFIRE_VFX = Path(
    "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/"
    "7821d65d-384a-4e26-8167-f32a84e377d8/boss_malphas_hellfire_vfx_1794672301643.jpg"
)
DEBUG_OUT = Path(
    "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/"
    "7821d65d-384a-4e26-8167-f32a84e377d8/scratch/debug_boss_colossus_hd2d.png"
)

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

    # Also knock out enclosed pure-white background holes (e.g. wing tatters) that are neutral white (`chroma <= 14`, `luma >= 242`)
    enclosed_white = (luma >= 242) & (chroma <= 14)
    bg_mask = visited | enclosed_white

    # Strip 1px JPEG anti-alias fringe bordering background if pale & low-saturation (`luma >= 205`, `chroma <= 32`)
    dilated_bg = np.zeros_like(bg_mask)
    dilated_bg[1:, :] |= bg_mask[:-1, :]
    dilated_bg[:-1, :] |= bg_mask[1:, :]
    dilated_bg[:, 1:] |= bg_mask[:, :-1]
    dilated_bg[:, :-1] |= bg_mask[:, 1:]
    fringe = dilated_bg & (~bg_mask) & (luma >= 198) & (chroma <= 36)
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


def cel_quantize_to_cell512(
    part_rgba: Image.Image,
    target_w256: int,
    target_h256: int,
    offset_256: tuple[int, int] = (0, 0),
    median_size: int = 3,
    flip_x: bool = False,
    bright_boost: float = 1.0,
) -> Image.Image:
    """
    Converts a cropped reference sprite into a crisp 256x256 logical cell (upscaled 2x NEAREST -> 512x512):
      1. Crop tight bbox
      2. MedianFilter cel-flattening on RGB
      3. Resize to `(target_w256, target_h256)` inside `256x256` with `4px` safe border (`8px` @ 512x512)
      4. Nearest-color Master Palette quantization (`dither=NONE`)
      5. 2-pass cardinal orphan despeckle + pinhole seal
      6. Crisp `1px` `#0d0f1c` Selout (`2px` @ 512x512)
      7. `2x NEAREST` upscale to `512x512`
    """
    arr = np.array(part_rgba, dtype=np.uint8)
    ys, xs = np.where(arr[:, :, 3] > 128)
    if len(xs) == 0:
        return Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    cropped = part_rgba.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
    if flip_x:
        cropped = cropped.transpose(Image.Transpose.FLIP_LEFT_RIGHT)

    rgb_flat = cropped.convert("RGB").filter(ImageFilter.MedianFilter(size=median_size))
    a_chan = cropped.split()[3]

    # Fit aspect-preserving inside (target_w256, target_h256)
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

    rgb_np = np.array(rgb_small, dtype=np.float32) * bright_boost
    rgb_np = np.clip(rgb_np, 0, 255)
    a_np = np.array(a_small, dtype=np.uint8) >= 128

    canvas_rgb[py : py + nh, px : px + nw] = rgb_np
    canvas_a[py : py + nh, px : px + nw] = a_np

    # Seal 1px interior alpha pinholes surrounded by >= 3 cardinal opaque neighbors
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

    # Strip tiny floating crumbs (`< 8` pixels on 256x256 grid)
    tmp_rgba = np.zeros((256, 256, 4), dtype=np.uint8)
    tmp_rgba[:, :, :3] = canvas_rgb.astype(np.uint8)
    tmp_rgba[:, :, 3] = np.where(canvas_a, 255, 0).astype(np.uint8)
    cleaned_img = keep_largest_components(Image.fromarray(tmp_rgba, mode="RGBA"), min_area=8)
    cleaned_np = np.array(cleaned_img, dtype=np.uint8)
    canvas_rgb = cleaned_np[:, :, :3].astype(np.float32)
    canvas_a = cleaned_np[:, :, 3] > 0

    # Quantize opaque pixels to MASTER_PALETTE (`dither=NONE`)
    pal_f = MASTER_PALETTE.astype(np.float32)
    idx_grid = np.zeros((256, 256), dtype=np.int32)
    oy, ox = np.where(canvas_a)
    if len(ox) > 0:
        pts = canvas_rgb[oy, ox]  # (N, 3)
        diffs = pts[:, None, :] - pal_f[None, :, :]
        dists = np.sum(diffs * diffs, axis=2)
        best = np.argmin(dists, axis=1)
        idx_grid[oy, ox] = best

    # 2-pass cardinal orphan pixel despeckling (eliminates noisy single-pixel AI speckles)
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
                    # Replace isolated single-pixel speckle with majority neighbor
                    vals, counts = np.unique(nbrs, return_counts=True)
                    new_idx[y, x] = vals[int(np.argmax(counts))]
        idx_grid = new_idx

    # Enforce 1px `#0d0f1c` Selout perimeter (strictly inside 3px margin so 0 border clips!)
    canvas_a[:3, :] = False
    canvas_a[-3:, :] = False
    canvas_a[:, :3] = False
    canvas_a[:, -3:] = False

    n_up = np.zeros_like(canvas_a); n_up[1:, :] = canvas_a[:-1, :]
    n_dn = np.zeros_like(canvas_a); n_dn[:-1, :] = canvas_a[1:, :]
    n_lt = np.zeros_like(canvas_a); n_lt[:, 1:] = canvas_a[:, :-1]
    n_rt = np.zeros_like(canvas_a); n_rt[:, :-1] = canvas_a[:, 1:]
    selout_ring = (~canvas_a) & (n_up | n_dn | n_lt | n_rt)
    selout_ring[:2, :] = False
    selout_ring[-2:, :] = False
    selout_ring[:, :2] = False
    selout_ring[:, -2:] = False

    out_256 = np.zeros((256, 256, 4), dtype=np.uint8)
    out_256[canvas_a, :3] = MASTER_PALETTE[idx_grid[canvas_a]]
    out_256[canvas_a, 3] = 255
    out_256[selout_ring, :3] = SELOUT_RGB
    out_256[selout_ring, 3] = 255

    img_256 = Image.fromarray(out_256, mode="RGBA")
    return img_256.resize((512, 512), Image.Resampling.NEAREST)


def clean_cell_3_1_bottom_artifact(sheet: Image.Image) -> None:
    """Removes the rectangular bottom-edge box & corner flame-block artifacts in Cell (3, 1) (`x:1536..2048, y:512..1024`)."""
    cell = np.array(sheet.crop((1536, 512, 2048, 1024)), dtype=np.uint8)
    for y in range(460, 512):
        row = cell[y]
        opaque = row[:, 3] > 0
        if not np.any(opaque):
            continue
        r = row[:, 0].astype(np.int16)
        g = row[:, 1].astype(np.int16)
        b = row[:, 2].astype(np.int16)
        pale = opaque & (r > 215) & (g > 205) & (b > 135)
        if y >= 502 or np.sum(pale) > 60:
            cell[y, pale, :] = 0
            if y >= 502:
                cell[y, :, :] = 0
        # Trim the flat rectangular orange flame corners outside the fist knuckles (`x < 135` or `x > 375` near `y >= 474`)
        if y >= 474:
            left_trim = int(105 + (y - 474) * 1.6)
            right_trim = int(407 - (y - 474) * 1.6)
            cell[y, :left_trim, :] = 0
            cell[y, right_trim:, :] = 0

    # Re-seal bottom edge of fist with 2px `#0d0f1c` Selout so knuckles end cleanly
    alpha = cell[:, :, 3] > 0
    for y in range(456, 509):
        for x in range(2, 510):
            if not alpha[y, x] and alpha[y - 1, x]:
                cell[y, x] = [13, 15, 28, 255]
                if y + 1 < 510 and not alpha[y + 1, x]:
                    cell[y + 1, x] = [13, 15, 28, 255]

    sheet.paste(Image.fromarray(cell, mode="RGBA"), (1536, 512))


def warp_vertical_arch(rgba: Image.Image, arch_px: int, pinch_w: float = 1.0, scale_h: float = 1.0) -> Image.Image:
    """Creates authentic pixel-clean wingstroke / flame phase variants by column vertical shifting before quantization."""
    w, h = rgba.size
    nw = max(16, int(round(w * pinch_w)))
    nh = max(16, int(round(h * scale_h)))
    scaled = rgba.resize((nw, nh), Image.Resampling.BILINEAR)
    arr = np.array(scaled, dtype=np.uint8)
    pad = abs(arch_px) + 24
    out = np.zeros((nh + pad * 2, nw, 4), dtype=np.uint8)
    for x in range(nw):
        u = x / max(1, nw - 1)
        # Wing root is on the left (`u=0`); arch curve grows strongly toward wingtip (`u=1`)!
        dy = int(round(arch_px * (u ** 1.25)))
        y0 = pad + dy
        out[y0 : y0 + nh, x] = arr[:, x]
    return Image.fromarray(out, mode="RGBA")


def warp_flame_wave(rgba: Image.Image, phase: float, amp_px: int, stretch_w: float = 1.0) -> Image.Image:
    """Creates multi-frame scrolling hellfire plasma tongues before cel-quantization."""
    w, h = rgba.size
    nw = max(16, int(round(w * stretch_w)))
    scaled = rgba.resize((nw, h), Image.Resampling.BILINEAR)
    arr = np.array(scaled, dtype=np.uint8)
    pad = abs(amp_px) + 18
    out = np.zeros((h + pad * 2, nw, 4), dtype=np.uint8)
    for x in range(nw):
        u = 1.0 - (x / max(1, nw - 1))  # 0 at mouth (right), 1 at flame tail (left)
        dy = int(round(np.sin(u * 7.5 + phase) * amp_px * (0.25 + 0.75 * u)))
        y0 = pad + dy
        out[y0 : y0 + h, x] = arr[:, x]
    return Image.fromarray(out, mode="RGBA")


def build_sovereign_halo_crown_cell() -> Image.Image:
    """Builds a crisp 256x256 -> 512x512 HD-2D Burning Obsidian-Gold Sovereign Halo Crown for Phase II/III."""
    img = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    dr = ImageDraw.Draw(img)
    cx, cy = 128, 134

    # Outer jagged obsidian-gold eclipse ring
    for r_out, col in ((96, (156, 38, 34, 255)), (88, (246, 114, 34, 255)), (80, (34, 29, 42, 255))):
        dr.ellipse((cx - r_out, cy - int(r_out * 0.56), cx + r_out, cy + int(r_out * 0.56)), fill=col)
    # Hollow center
    dr.ellipse((cx - 64, cy - 34, cx + 64, cy + 34), fill=(0, 0, 0, 0))

    # 7 Jagged Sovereign Obsidian-Gold Crown Spires radiating upward along the upper arc
    spire_angles = [-2.55, -2.15, -1.82, -1.57, -1.32, -0.99, -0.59]
    spire_lens = [36, 48, 60, 76, 60, 48, 36]
    for ang, slen in zip(spire_angles, spire_lens):
        bx = cx + np.cos(ang) * 76
        by = cy + np.sin(ang) * 42
        tx = cx + np.cos(ang) * (76 + slen)
        ty = cy + np.sin(ang) * (42 + slen * 0.92)
        px = -np.sin(ang) * 9
        py = np.cos(ang) * 9
        dr.polygon(
            [(bx - px, by - py), (tx, ty), (bx + px, by + py)],
            fill=(50, 42, 58, 255),
        )
        dr.polygon(
            [(bx - px * 0.45, by - py * 0.45), (tx, ty + 4), (bx + px * 0.45, by + py * 0.45)],
            fill=(252, 158, 44, 255),
        )
        dr.line([(bx, by), (tx, ty)], fill=(254, 238, 138, 255), width=2)

    return cel_quantize_to_cell512(img, 232, 212, (0, -6), median_size=3)


def build_core_overdrive_vortex_cell() -> Image.Image:
    """Builds a crisp 256x256 -> 512x512 HD-2D Abyssal Magma Throat/Heart Vortex for Roar & Punish states."""
    arr = np.zeros((256, 256, 4), dtype=np.uint8)
    yy, xx = np.mgrid[0:256, 0:256]
    dx = (xx - 128) / 96.0
    dy = (yy - 128) / 96.0
    r = np.hypot(dx, dy)
    ang = np.arctan2(dy, dx)
    swirl = np.sin(ang * 5.0 - r * 9.5)
    mask = (r <= 0.92) & ((r + swirl * 0.14) <= 0.86)

    arr[mask] = [156, 38, 34, 255]
    m2 = mask & ((r + swirl * 0.11) <= 0.68)
    arr[m2] = [246, 114, 34, 255]
    m3 = mask & ((r + swirl * 0.09) <= 0.46)
    arr[m3] = [254, 204, 72, 255]
    m4 = mask & (r <= 0.24)
    arr[m4] = [255, 250, 214, 255]

    return cel_quantize_to_cell512(Image.fromarray(arr, mode="RGBA"), 216, 216, (0, 0), median_size=3)


def isolate_forearm_cuff(forearm_img: Image.Image) -> Image.Image:
    """Masks out the upper-right finger claws from the forearm bracer reference so `(5,2)` is a pure arm-bracer segment."""
    arr = np.array(forearm_img, dtype=np.uint8)
    h, w, _ = arr.shape
    yy, xx = np.mgrid[0:h, 0:w]
    # In `forearm_raw` (cropped `(535, 505, 995, 995)` = `460x490`), the rune-engraved spiked cuff occupies
    # the lower-left (`x + (h - y) < 625`), while the open fingers extend into the upper-right (`x > 210` & `y < 215`).
    finger_zone = (yy < 205) & ((xx - yy * 0.72) > 135)
    arr[finger_zone, :] = 0
    return keep_largest_components(Image.fromarray(arr, mode="RGBA"), min_area=300, max_components=1)


def main() -> None:
    orig = Image.open(SHEET_PATH).convert("RGBA")
    # Preserve existing 4096x1024 top half (even if re-run on already-expanded 4096x2048 sheet!)
    top_half = orig.crop((0, 0, 4096, 1024))

    out_sheet = Image.new("RGBA", (4096, 2048), (0, 0, 0, 0))
    out_sheet.paste(top_half, (0, 0))
    clean_cell_3_1_bottom_artifact(out_sheet)

    wings_arms_rgba = remove_white_bg(Image.open(REF_WINGS_ARMS))
    vfx_rgba = remove_white_bg(Image.open(REF_HELLFIRE_VFX))

    # --- Crop reference sub-sprites cleanly (`max_components=1` eliminates any neighboring crop overlap!) ---
    wing_raw = keep_largest_components(wings_arms_rgba.crop((25, 10, 1005, 558)), min_area=400, max_components=1)
    bicep_raw = keep_largest_components(wings_arms_rgba.crop((15, 505, 345, 890)), min_area=300, max_components=1)
    forearm_raw = isolate_forearm_cuff(wings_arms_rgba.crop((535, 505, 995, 995)))

    hellfire_raw = keep_largest_components(vfx_rgba.crop((35, 25, 985, 405)), min_area=200, max_components=1)
    spire_raw = keep_largest_components(vfx_rgba.crop((15, 370, 420, 1005)), min_area=300, max_components=1)
    claw_wave_raw = keep_largest_components(vfx_rgba.crop((418, 535, 815, 985)), min_area=80)
    boulder_a_raw = keep_largest_components(vfx_rgba.crop((822, 600, 998, 790)), min_area=120, max_components=1)
    boulder_b_raw = keep_largest_components(vfx_rgba.crop((804, 795, 1002, 998)), min_area=120, max_components=1)

    # =========================================================================
    # ROW 2 (`y = 1024..1536`): WINGS + ARTICULATED ARM SEGMENTS + HELLFIRE FRAMES
    # =========================================================================
    # (0, 2): Front/Left Abyssal Great-Wing — UPSTROKE (high dramatic arch)
    wing_up = cel_quantize_to_cell512(
        warp_vertical_arch(wing_raw, arch_px=-175, pinch_w=0.88, scale_h=1.08),
        236, 232, (6, -10), median_size=3, flip_x=True
    )
    # (1, 2): Front/Left Abyssal Great-Wing — SPREAD (wide sovereign span)
    wing_mid = cel_quantize_to_cell512(
        wing_raw, 242, 208, (4, 0), median_size=3, flip_x=True
    )
    # (2, 2): Front/Left Abyssal Great-Wing — DOWNSTROKE (deep power-flap downward)
    wing_dn = cel_quantize_to_cell512(
        warp_vertical_arch(wing_raw, arch_px=185, pinch_w=0.86, scale_h=1.10),
        236, 234, (6, 12), median_size=3, flip_x=True
    )
    # (3, 2): Rear/Right Abyssal Great-Wing — Counter-Span (`+X`)
    wing_rear = cel_quantize_to_cell512(
        warp_vertical_arch(wing_raw, arch_px=-55, pinch_w=0.94, scale_h=1.04),
        238, 218, (-4, -4), median_size=3, flip_x=False
    )
    # (4, 2): Segmented Obsidian-Gold Upper-Arm Bicep Connector
    bicep_cell = cel_quantize_to_cell512(bicep_raw, 198, 214, (0, 0), median_size=3, flip_x=True)
    # (5, 2): Spiked Rune-Engraved Forearm Gauntlet Bracer Connector (cuff only, zero duplicate hand!)
    forearm_cell = cel_quantize_to_cell512(forearm_raw, 204, 204, (0, 0), median_size=3, flip_x=True)
    # (6, 2): Roaring Hellfire Torrent — Frame B (Surging Plasma Crest)
    hellfire_b = cel_quantize_to_cell512(
        warp_flame_wave(hellfire_raw, phase=0.0, amp_px=14, stretch_w=1.0),
        244, 178, (0, 0), median_size=3, bright_boost=1.04
    )
    # (7, 2): Roaring Hellfire Torrent — Frame C (Expanding White-Hot Inferno Wave)
    hellfire_c = cel_quantize_to_cell512(
        warp_flame_wave(hellfire_raw, phase=2.2, amp_px=22, stretch_w=1.06),
        244, 194, (0, 0), median_size=3, bright_boost=1.10
    )

    row2_cells = [wing_up, wing_mid, wing_dn, wing_rear, bicep_cell, forearm_cell, hellfire_b, hellfire_c]
    for col, cimg in enumerate(row2_cells):
        out_sheet.paste(cimg, (col * 512, 1024))

    # =========================================================================
    # ROW 3 (`y = 1536..2048`): CLAW WAVES + MAGMA SPIRES + BOULDERS + OVERDRIVE
    # =========================================================================
    # (0, 3): 3-Talon Molten Claw Slash Wave — Frame B
    slash_b = cel_quantize_to_cell512(claw_wave_raw, 232, 224, (0, 0), median_size=3, flip_x=True)
    # (1, 3): 3-Talon Molten Claw Slash Wave — Frame C (Peak Ignition Surge)
    slash_c = cel_quantize_to_cell512(
        warp_flame_wave(claw_wave_raw, phase=1.6, amp_px=14, stretch_w=1.08),
        238, 232, (0, 0), median_size=3, flip_x=True, bright_boost=1.12
    )
    # (2, 3): Erupting Obsidian-Magma Spire — Stage 1 (Emerging Jagged Fang)
    spire_1 = cel_quantize_to_cell512(
        spire_raw.crop((0, int(spire_raw.height * 0.24), spire_raw.width, spire_raw.height)),
        176, 196, (0, 22), median_size=3
    )
    # (3, 3): Erupting Obsidian-Magma Spire — Stage 2 (Full Towering Volcanic Spire)
    spire_2 = cel_quantize_to_cell512(spire_raw, 188, 240, (0, 4), median_size=3, bright_boost=1.06)
    # (4, 3): 3D Faceted Volcanic Magma Boulder A
    boulder_a = cel_quantize_to_cell512(boulder_a_raw, 168, 168, (0, 0), median_size=3)
    # (5, 3): 3D Faceted Volcanic Magma Boulder B
    boulder_b = cel_quantize_to_cell512(boulder_b_raw, 176, 176, (0, 0), median_size=3, bright_boost=1.08)
    # (6, 3): Sovereign Burning Abyssal Halo-Crown (Phase II / III)
    crown_cell = build_sovereign_halo_crown_cell()
    # (7, 3): Abyssal Magma Throat/Heart Overdrive Vortex
    vortex_cell = build_core_overdrive_vortex_cell()

    row3_cells = [slash_b, slash_c, spire_1, spire_2, boulder_a, boulder_b, crown_cell, vortex_cell]
    for col, cimg in enumerate(row3_cells):
        out_sheet.paste(cimg, (col * 512, 1536))

    # Verify 0 border clips on all 16 newly built cells (`Rows 2..3`) + repaired Cell `(3, 1)`
    full_np = np.array(out_sheet, dtype=np.uint8)
    border_clips = 0
    for row in (2, 3):
        for col in range(8):
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
    print(f"[OK] Saved upgraded {SHEET_PATH} ({out_sheet.width}x{out_sheet.height}, new_border_clips={border_clips})")

    # Render crisp dark-slate debug contact sheet (`1600x800`) for mandatory visual inspection via `view_file`
    DEBUG_OUT.parent.mkdir(parents=True, exist_ok=True)
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
    print(f"[OK] Rendered debug contact sheet: {DEBUG_OUT}")


if __name__ == "__main__":
    main()
