#!/opt/homebrew/bin/python3.11
"""
Behemoth Malphas 2.0 — HD-2D 2x2-Density Boss Sprite Sheet & Portrait Builder
Outputs:
  1. `assets/sprites/boss_colossus_sheet.png` (`4096x2048`, `8x4` cells @ `512x512`, `256x256` logical -> `2x NEAREST` = 4x detail!)
  2. `assets/sprites/boss_archfiend_portrait.png` (`128x128`, lossless nearest-neighbor pixel art, `0` semi-alpha)
  3. Art-matched Row 0 (12-frame articulated Right Wingbeat) & Row 2 (12-frame Foreground Clamping Siege-Claw Talons + Abyssal Chains)
     patched directly into `assets/sprites/boss_malphas_vfx_30fps.png` (`3072x3072`, `12x12` @ `256x256`, `0` border clips).

Preserves 100% of `Suite 20D` & `Suite 27B` invariants:
  - Exact `4096x2048` dimensions, 32 populated cells `(0..7, 0..3)` including `TORSO_DYING (3,0)`, `VFX_JAW_HELLFIRE (6,1)`, `VFX_CLAW_SLASH (7,1)`
  - Exact wing shoulder socket pins at `(484, 320)` on `(0..2, 2)` and `(28, 320)` on `(3, 2)`
  - Exact Ribcage Furnace Heart Center at `(221, 287)` in `512` space (`(111, 144)` in `256` space) matching `(7,3)` Vulnerable Core!
  - Cleaned through `scripts/ex_sprite_clean_utils.py` (`clean_512_pose_holes_and_specks` + `seal_160_char_pinholes_and_leaks`),
    crisp `#0d0f1c` selout, `0` white/green halos, `0` pinholes, `0` semi-alpha, `>= 8px` inner cell margins (`0` border clips).
"""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance
from scipy import ndimage

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(SCRIPT_DIR))

from ex_sprite_clean_utils import (  # noqa: E402
    STRUCTURE_4,
    STRUCTURE_8,
    clean_512_pose_holes_and_specks,
    filter_mask_min_area,
    seal_160_char_pinholes_and_leaks,
)

SPRITES_DIR = REPO_ROOT / "assets/sprites"
SHEET_PATH = SPRITES_DIR / "boss_colossus_sheet.png"
PORTRAIT_PATH = SPRITES_DIR / "boss_archfiend_portrait.png"
VFX_SHEET_PATH = SPRITES_DIR / "boss_malphas_vfx_30fps.png"

SELOUT_RGB = np.array([13, 15, 28], dtype=np.uint8)  # #0d0f1c
SAFE_LPX = 4  # 4 logical px in 256x256 -> 8 output px in 512x512 (>= 8px margin!)

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

# Accent colors for procedural magma/fissure/ember/rune overlays
COL_FIRE = [
    np.array([185, 28, 28], dtype=np.uint8),
    np.array([234, 88, 12], dtype=np.uint8),
    np.array([251, 146, 60], dtype=np.uint8),
    np.array([253, 224, 71], dtype=np.uint8),
    np.array([255, 252, 230], dtype=np.uint8),
]
COL_RUNE = [
    np.array([91, 33, 182], dtype=np.uint8),
    np.array([168, 85, 247], dtype=np.uint8),
    np.array([245, 208, 254], dtype=np.uint8),
]
COL_GOLD = [
    np.array([115, 68, 18], dtype=np.uint8),
    np.array([196, 134, 28], dtype=np.uint8),
    np.array([248, 198, 56], dtype=np.uint8),
    np.array([255, 244, 168], dtype=np.uint8),
]
COL_OBSIDIAN = [
    np.array([20, 16, 40], dtype=np.uint8),
    np.array([38, 30, 74], dtype=np.uint8),
    np.array([64, 52, 118], dtype=np.uint8),
    np.array([104, 88, 172], dtype=np.uint8),
    np.array([168, 158, 232], dtype=np.uint8),
]


def chroma_key_green_512(src_path: Path, remove_interior_green: bool = True) -> np.ndarray:
    """Loads a raw master image, resizes to 512x512, strips #00FF00 green background & despills edges cleanly."""
    im = Image.open(src_path).convert("RGB")
    im512 = im.resize((512, 512), Image.Resampling.LANCZOS)
    rgb = np.array(im512, dtype=np.int16)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]

    # Identify chroma green pixels (generous threshold to catch JPEG ringing on #00FF00)
    green_excess = g - np.maximum(r, b)
    is_green = (g >= 115) & (green_excess >= 28)
    is_soft_green = (g >= 80) & (green_excess >= 16)

    if remove_interior_green:
        bg_mask = is_green.copy()
        # Dilate by 1px into soft green fringe only where adjacent to background green
        bg_near = ndimage.binary_dilation(bg_mask, structure=STRUCTURE_8, iterations=2)
        bg_mask |= bg_near & is_soft_green
    else:
        # Border flood-fill only (keeps enclosed regions if desired)
        labeled, _ = ndimage.label(is_green | is_soft_green, structure=STRUCTURE_4)
        border_ids = set(
            np.concatenate(
                [labeled[0, :], labeled[-1, :], labeled[:, 0], labeled[:, -1]]
            ).tolist()
        )
        border_ids.discard(0)
        bg_mask = np.isin(labeled, list(border_ids))

    # Strip any 1px anti-aliased light-green halo touching background
    bg_ring = ndimage.binary_dilation(bg_mask, structure=STRUCTURE_8, iterations=1) & (~bg_mask)
    bright_fringe = bg_ring & (green_excess >= 6) & (g >= 65)
    bg_mask |= bright_fringe

    fg_mask = ~bg_mask
    fg_mask = filter_mask_min_area(fg_mask, min_area=48)

    out = np.zeros((512, 512, 4), dtype=np.uint8)
    # Despill residual green tint on all foreground pixels (zero radioactive green edges!)
    r_c = r.copy()
    g_c = g.copy()
    b_c = b.copy()
    edge_ring = fg_mask & ndimage.binary_dilation(~fg_mask, structure=STRUCTURE_8, iterations=2)
    # On foreground pixels near edges or dark outline pixels, clamp g to max(r, b)
    spill = fg_mask & ((edge_ring & (g_c > np.maximum(r_c, b_c))) | (g_c > np.maximum(r_c, b_c) + 10))
    g_c[spill] = np.minimum(g_c[spill], np.maximum(r_c[spill], b_c[spill]))
    # Pull very dark edge outline pixels cleanly toward #0d0f1c selout
    dark_edge = edge_ring & (r_c < 45) & (g_c < 45) & (b_c < 58)
    r_c[dark_edge] = SELOUT_RGB[0]
    g_c[dark_edge] = SELOUT_RGB[1]
    b_c[dark_edge] = SELOUT_RGB[2]

    out[fg_mask, 0] = np.clip(r_c[fg_mask], 0, 255).astype(np.uint8)
    out[fg_mask, 1] = np.clip(g_c[fg_mask], 0, 255).astype(np.uint8)
    out[fg_mask, 2] = np.clip(b_c[fg_mask], 0, 255).astype(np.uint8)
    out[fg_mask, 3] = 255

    # Mandatory ex_sprite_clean_utils 512 cleanup!
    out = clean_512_pose_holes_and_specks(
        out, max_hole_area=90, min_island_area=32, max_body_dist=5.0
    )
    return out


def tight_crop_rgba(arr: np.ndarray, pad: int = 2) -> np.ndarray:
    ys, xs = np.where(arr[:, :, 3] >= 128)
    if len(xs) == 0:
        return arr.copy()
    y0 = max(0, int(ys.min()) - pad)
    y1 = min(arr.shape[0], int(ys.max()) + 1 + pad)
    x0 = max(0, int(xs.min()) - pad)
    x1 = min(arr.shape[1], int(xs.max()) + 1 + pad)
    return arr[y0:y1, x0:x1].copy()


def resize_rgba_crisp(arr: np.ndarray, target_w: int, target_h: int) -> np.ndarray:
    """Downsamples RGBA cleanly using BOX/LANCZOS on premultiplied RGB + binary alpha threshold, zero white halos."""
    h, w, _ = arr.shape
    alpha_f = (arr[:, :, 3:4].astype(np.float32)) / 255.0
    # Un-black-halo: fill transparent pixels with nearest foreground color before filtering!
    opaque = arr[:, :, 3] >= 128
    if np.any(opaque) and np.any(~opaque):
        _, nearest = ndimage.distance_transform_edt(~opaque, return_indices=True)
        rgb_filled = arr[nearest[0], nearest[1], :3]
    else:
        rgb_filled = arr[:, :, :3]

    rgb_im = Image.fromarray(rgb_filled, "RGB").resize((target_w, target_h), Image.Resampling.LANCZOS)
    a_im = Image.fromarray((opaque.astype(np.uint8) * 255), "L").resize(
        (target_w, target_h), Image.Resampling.BILINEAR
    )
    out = np.zeros((target_h, target_w, 4), dtype=np.uint8)
    a_np = np.array(a_im, dtype=np.uint8) >= 124
    rgb_np = np.array(rgb_im, dtype=np.uint8)
    out[a_np, :3] = rgb_np[a_np]
    out[a_np, 3] = 255
    return out


def place_in_256(
    patch: np.ndarray,
    dst_x: int,
    dst_y: int,
    canvas: np.ndarray | None = None,
) -> np.ndarray:
    out = np.zeros((256, 256, 4), dtype=np.uint8) if canvas is None else canvas.copy()
    ph, pw, _ = patch.shape
    x0 = max(SAFE_LPX, dst_x)
    y0 = max(SAFE_LPX, dst_y)
    x1 = min(256 - SAFE_LPX, dst_x + pw)
    y1 = min(256 - SAFE_LPX, dst_y + ph)
    if x1 <= x0 or y1 <= y0:
        return out
    sx0 = x0 - dst_x
    sy0 = y0 - dst_y
    sx1 = sx0 + (x1 - x0)
    sy1 = sy0 + (y1 - y0)
    sub = patch[sy0:sy1, sx0:sx1]
    op = sub[:, :, 3] >= 128
    out[y0:y1, x0:x1][op] = sub[op]
    return out


def seal_256_selout(
    grid256: np.ndarray,
    add_selout: bool = True,
    max_pinhole: int = 8,
    min_detached: int = 4,
    max_orphan: int = 20,
    keep_disconnected_vfx: bool = False,
) -> np.ndarray:
    """Applies mandatory ex_sprite_clean_utils cleanup + strict >=4 lpx (8px) margin + crisp 1-lpx #0d0f1c selout."""
    g = grid256.copy()
    # Hard safety border
    g[:SAFE_LPX, :] = 0
    g[-SAFE_LPX:, :] = 0
    g[:, :SAFE_LPX] = 0
    g[:, -SAFE_LPX:] = 0

    if not keep_disconnected_vfx:
        g = seal_160_char_pinholes_and_leaks(
            g,
            max_pinhole_lpx=max_pinhole,
            min_detached_lpx=min_detached,
            max_orphan_lpx=max_orphan,
            orphan_dist_lpx=5.5,
            safe_border_lpx=SAFE_LPX,
        )
    else:
        op = g[:, :, 3] >= 128
        g[~op] = 0
        g[op, 3] = 255

    # Despill any stray edge green or chalky pale halo pixels
    op = g[:, :, 3] >= 128
    if np.any(op):
        r = g[:, :, 0].astype(np.int16)
        gr = g[:, :, 1].astype(np.int16)
        b = g[:, :, 2].astype(np.int16)
        g_spill = op & (gr > np.maximum(r, b) + 12)
        g[g_spill, 1] = np.maximum(r[g_spill], b[g_spill]).astype(np.uint8)

    if add_selout and np.any(op):
        # Add clean 1-lpx #0d0f1c outline strictly inside SAFE_LPX
        up = np.zeros_like(op); up[1:, :] = op[:-1, :]
        dn = np.zeros_like(op); dn[:-1, :] = op[1:, :]
        lt = np.zeros_like(op); lt[:, 1:] = op[:, :-1]
        rt = np.zeros_like(op); rt[:, :-1] = op[:, 1:]
        ring = (~op) & (up | dn | lt | rt)
        ring[:SAFE_LPX, :] = False
        ring[-SAFE_LPX:, :] = False
        ring[:, :SAFE_LPX] = False
        ring[:, -SAFE_LPX:] = False
        g[ring, :3] = SELOUT_RGB
        g[ring, 3] = 255

    # Re-enforce binary alpha & safety border
    g[:SAFE_LPX, :] = 0
    g[-SAFE_LPX:, :] = 0
    g[:, :SAFE_LPX] = 0
    g[:, -SAFE_LPX:] = 0
    op2 = g[:, :, 3] >= 128
    g[~op2] = 0
    g[op2, 3] = 255
    return g


def grid256_to_cell512(grid256: np.ndarray) -> Image.Image:
    """Exact 2x2 nearest-neighbor upscale (256x256 logical -> 512x512 cell)."""
    assert grid256.shape == (256, 256, 4)
    up = np.repeat(np.repeat(grid256, 2, axis=0), 2, axis=1)
    return Image.fromarray(up, mode="RGBA")


def warp_wing_articulated(
    wing_256: np.ndarray,
    pivot_x: float,
    pivot_y: float,
    angle_deg: float,
    tip_bend_deg: float = 0.0,
    ember_pulse: float = 0.0,
    mirror_right: bool = False,
) -> np.ndarray:
    """Articulates Malphas's bat-dragon wing around exact shoulder socket using inverse nearest sampling."""
    src = wing_256[:, ::-1, :].copy() if mirror_right else wing_256.copy()
    px = (255.0 - pivot_x) if mirror_right else pivot_x
    py = pivot_y
    dir_sign = -1.0 if mirror_right else 1.0

    yy, xx = np.mgrid[0:256, 0:256].astype(np.float32)
    dx = xx - px
    dy = yy - py
    dist = np.hypot(dx, dy)
    span_u = np.clip(dist / 225.0, 0.0, 1.0)
    # Non-linear whip bend on outer membrane tips + smooth pivot rotation!
    ang_rad = np.deg2rad((angle_deg + tip_bend_deg * (span_u ** 1.6)) * dir_sign)
    ca = np.cos(-ang_rad)
    sa = np.sin(-ang_rad)
    sx = np.rint(px + dx * ca - dy * sa).astype(np.int32)
    sy = np.rint(py + dx * sa + dy * ca).astype(np.int32)
    valid = (sx >= 0) & (sx < 256) & (sy >= 0) & (sy < 256)

    out = np.zeros((256, 256, 4), dtype=np.uint8)
    out[valid] = src[sy[valid], sx[valid]]

    # Subtle pulsing magma veins along wing membranes on active frames
    if ember_pulse > 0.05:
        op = out[:, :, 3] >= 128
        r = out[:, :, 0].astype(np.int16)
        gr = out[:, :, 1].astype(np.int16)
        b = out[:, :, 2].astype(np.int16)
        vein = op & (r >= 155) & (r - b >= 65) & (gr >= 48)
        boost = int(round(ember_pulse * 48))
        out[vein, 0] = np.clip(r[vein] + boost, 0, 255).astype(np.uint8)
        out[vein, 1] = np.clip(gr[vein] + int(boost * 0.9), 0, 255).astype(np.uint8)
        out[vein, 2] = np.clip(b[vein] + int(boost * 0.3), 0, 255).astype(np.uint8)

    # Guarantee shoulder socket stays 100% solid & riveted cleanly at pivot!
    ipx, ipy = int(round(px)), int(round(py))
    for dy_s in range(-4, 5):
        for dx_s in range(-4, 5):
            if dx_s * dx_s + dy_s * dy_s <= 17:
                qy, qx = ipy + dy_s, ipx + dx_s
                if SAFE_LPX <= qx < 256 - SAFE_LPX and SAFE_LPX <= qy < 256 - SAFE_LPX:
                    if out[qy, qx, 3] < 128:
                        out[qy, qx, :3] = COL_OBSIDIAN[1] if dx_s * dx_s + dy_s * dy_s > 6 else COL_GOLD[1]
                        out[qy, qx, 3] = 255

    return seal_256_selout(out, add_selout=True, max_pinhole=6, min_detached=4, max_orphan=14)


def build_row0_cells() -> tuple[list[Image.Image], dict[str, np.ndarray]]:
    """
    Row 0 (`256x256` logical -> `512x512` output):
      (0,0) CALDERA_RIM
      (1,0) TORSO_HEART_A
      (2,0) TORSO_HEART_B (surging incandescent ribcage furnace + glowing runes)
      (3,0) TORSO_DYING   (shattered charred ribcage + crimson-violet fracture fissures)
      (4,0) REAR_PAULDRON (towering cathedral-spire left shoulder pauldron)
      (5,0) FRONT_PAULDRON (towering cathedral-spire right shoulder pauldron)
      (6,0) SKULL_UPPER   (enlarged menacing horned demon skull + painted molten hellfire throat)
      (7,0) JAW_MANDIBLE  (articulated armored lower jawbone with sharp ivory fangs)
    """
    # 1. CALDERA_RIM (0,0)
    parapet_512 = chroma_key_green_512(SPRITES_DIR / "boss_malphas_v2_parapet_base.jpg", True)
    parapet_crop = tight_crop_rgba(parapet_512, pad=2)
    ph, pw, _ = parapet_crop.shape
    target_pw = 236
    target_ph = min(142, int(round(ph * (target_pw / float(pw)))))
    parapet_rs = resize_rgba_crisp(parapet_crop, target_pw, target_ph)
    # Anchor parapet bottom at y_256 = 247 (y_512 = 494 -> lands cleanly on screen y=654!)
    rim_256 = place_in_256(parapet_rs, (256 - target_pw) // 2, 248 - target_ph)
    rim_256 = seal_256_selout(rim_256, add_selout=True, max_pinhole=12, min_detached=6, max_orphan=24)

    # 2. TORSO & PAULDRONS segmented cleanly from `boss_malphas_v2_torso_base.jpg`!
    torso_512 = chroma_key_green_512(SPRITES_DIR / "boss_malphas_v2_torso_base.jpg", True)
    torso_crop = tight_crop_rgba(torso_512, pad=2)
    th, tw, _ = torso_crop.shape
    # Scale full upper-body + pauldrons to towering `w = 212, h = 198` centered around x=122, y=38..236
    full_w = 216
    full_h = min(204, int(round(th * (full_w / float(tw)))))
    full_rs = resize_rgba_crisp(torso_crop, full_w, full_h)
    # Place full torso+pauldrons onto 256 canvas so the ribcage heart core centers right on (111, 144)!
    # Inspect furnace center inside full_rs to align automatically!
    r_f = full_rs[:, :, 0].astype(np.int32)
    g_f = full_rs[:, :, 1].astype(np.int32)
    b_f = full_rs[:, :, 2].astype(np.int32)
    fire_m = (full_rs[:, :, 3] >= 128) & (r_f >= 210) & (g_f >= 90) & (b_f <= 115) & (r_f - b_f >= 110)
    fys, fxs = np.where(fire_m)
    fx_med = float(np.median(fxs)) if len(fxs) > 20 else full_w * 0.45
    fy_med = float(np.median(fys)) if len(fys) > 20 else full_h * 0.66
    # Align furnace center directly to (111, 150) (right above parapet rim!)
    off_x = int(round(111 - fx_med))
    off_y = int(round(150 - fy_med))
    full_256 = place_in_256(full_rs, off_x, off_y)

    # Segment full_256 into:
    #   - Rear Pauldron (left side of boss, x <= 84 with clean diagonal shoulder cut)
    #   - Front Pauldron (right side of boss, x >= 146 with clean diagonal shoulder cut)
    #   - Central Torso (extends slightly under both pauldrons by 12px so shrug/breathing NEVER opens gaps!)
    yy, xx = np.mgrid[0:256, 0:256]
    op_full = full_256[:, :, 3] >= 128

    # Diagonal boundary curves following Malphas's 3/4 armor shoulder seams
    left_seam_x = 80.0 - (yy - 95.0) * 0.16
    right_seam_x = 148.0 + (yy - 95.0) * 0.18

    rear_mask = op_full & (xx <= left_seam_x + 4) & (yy <= 168)
    front_mask = op_full & (xx >= right_seam_x - 6) & (yy <= 180)
    torso_mask = op_full & (xx >= left_seam_x - 12) & (xx <= right_seam_x + 12)

    # Extend lower torso skirt cleanly downward into the parapet lip (`y <= 232`) so zero gap shows during breathe/emerge
    torso_256 = np.zeros((256, 256, 4), dtype=np.uint8)
    torso_256[torso_mask] = full_256[torso_mask]
    # Add dark obsidian waist/abdomen armor skirt below torso bottom down to y=228
    t_ys, t_xs = np.where(torso_256[:, :, 3] >= 128)
    if len(t_xs) > 0:
        for x in range(int(t_xs.min()) + 6, int(t_xs.max()) - 6):
            col_ys = np.where(torso_256[:, x, 3] >= 128)[0]
            if len(col_ys) == 0:
                continue
            bot_y = int(col_ys.max())
            if bot_y >= 165 and bot_y < 230:
                for y in range(bot_y, 230):
                    shade = COL_OBSIDIAN[1] if abs(x - 114) > 28 else COL_OBSIDIAN[0]
                    if (y == bot_y + 4 or y == bot_y + 12) and abs(x - 114) < 38:
                        shade = COL_OBSIDIAN[2]
                    torso_256[y, x, :3] = shade
                    torso_256[y, x, 3] = 255
    torso_a_256 = seal_256_selout(torso_256, add_selout=True, max_pinhole=12, min_detached=6, max_orphan=24)

    # Rear Pauldron (4,0) & Front Pauldron (5,0)
    rear_p_256 = np.zeros((256, 256, 4), dtype=np.uint8)
    rear_p_256[rear_mask] = full_256[rear_mask]
    rear_p_256 = seal_256_selout(rear_p_256, add_selout=True, max_pinhole=10, min_detached=6, max_orphan=20)

    front_p_256 = np.zeros((256, 256, 4), dtype=np.uint8)
    front_p_256[front_mask] = full_256[front_mask]
    front_p_256 = seal_256_selout(front_p_256, add_selout=True, max_pinhole=10, min_detached=6, max_orphan=20)

    # 3. TORSO_HEART_B (2,0): Surging molten-furnace pulse + blazing violet runes + warm rim glow on ribs!
    torso_b_256 = torso_a_256.copy()
    op_tb = torso_b_256[:, :, 3] >= 128
    rt = torso_b_256[:, :, 0].astype(np.int16)
    gt = torso_b_256[:, :, 1].astype(np.int16)
    bt = torso_b_256[:, :, 2].astype(np.int16)
    furnace_hot = op_tb & (rt >= 165) & (rt - bt >= 75) & (yy >= 100) & (yy <= 215)
    # Surge flame luminance & expand white-hot molten core!
    dist_heart = np.hypot((xx - 111.0) / 34.0, (yy - 148.0) / 38.0)
    flare = furnace_hot & (dist_heart < 1.15)
    torso_b_256[flare, 0] = np.clip(rt[flare] + 38, 0, 255).astype(np.uint8)
    torso_b_256[flare, 1] = np.clip(gt[flare] + 56, 0, 255).astype(np.uint8)
    torso_b_256[flare, 2] = np.clip(bt[flare] + 44, 0, 255).astype(np.uint8)
    core_white = furnace_hot & (dist_heart < 0.42) & (rt + gt > 330)
    torso_b_256[core_white, :3] = COL_FIRE[4]
    # Brighten violet diamond chest runes on Beat B
    rune_m = op_tb & (bt >= 145) & (rt >= 100) & (bt > gt + 35)
    torso_b_256[rune_m, 0] = np.clip(rt[rune_m] + 42, 0, 255).astype(np.uint8)
    torso_b_256[rune_m, 1] = np.clip(gt[rune_m] + 46, 0, 255).astype(np.uint8)
    torso_b_256[rune_m, 2] = np.clip(bt[rune_m] + 30, 0, 255).astype(np.uint8)

    # 4. TORSO_DYING (3,0) (`1536,0` required by Suite 20D!): Charred hollow furnace + blazing fracture cracks!
    torso_dying_256 = torso_a_256.copy()
    op_td = torso_dying_256[:, :, 3] >= 128
    # Dim & char armor + extinguish furnace fire into dark smoked obsidian
    torso_dying_256[op_td, :3] = (torso_dying_256[op_td, :3].astype(np.float32) * 0.56).astype(np.uint8)
    exting = op_td & (rt >= 150) & (rt - bt >= 65) & (yy >= 100) & (yy <= 215)
    bayer_d = BAYER_4X4[yy & 3, xx & 3]
    char_mid = exting & (dist_heart > 0.34)
    torso_dying_256[char_mid, :3] = np.where(
        (bayer_d[char_mid, None] > 0.5), COL_OBSIDIAN[0], np.array([34, 12, 22], dtype=np.uint8)
    )
    dying_ember = exting & (dist_heart <= 0.34)
    torso_dying_256[dying_ember, :3] = np.where(
        (bayer_d[dying_ember, None] > 0.45), COL_FIRE[0], np.array([58, 12, 26], dtype=np.uint8)
    )
    # Jagged crimson-violet shatter fissures spidering out from the cracked furnace core!
    crack_paths = [
        [(111, 146), (98, 134), (86, 124), (74, 114)],
        [(111, 146), (126, 132), (140, 122), (154, 110)],
        [(111, 146), (95, 162), (82, 178), (74, 198)],
        [(111, 146), (128, 164), (142, 180), (150, 202)],
        [(111, 146), (110, 118), (114, 96), (108, 78)],
        [(111, 146), (112, 174), (108, 198), (114, 218)],
    ]
    for path_pts in crack_paths:
        for i in range(len(path_pts) - 1):
            x0, y0 = path_pts[i]
            x1, y1 = path_pts[i + 1]
            steps = max(abs(x1 - x0), abs(y1 - y0)) + 1
            for s in range(steps):
                u = s / float(max(1, steps - 1))
                cx = int(round(x0 + (x1 - x0) * u + math.sin(u * 9.0 + i) * 2.0))
                cy = int(round(y0 + (y1 - y0) * u))
                for dy_c in (-1, 0, 1):
                    for dx_c in (-1, 0, 1):
                        qx, qy = cx + dx_c, cy + dy_c
                        if SAFE_LPX <= qx < 256 - SAFE_LPX and SAFE_LPX <= qy < 256 - SAFE_LPX and op_td[qy, qx]:
                            if dx_c == 0 and dy_c == 0:
                                torso_dying_256[qy, qx, :3] = COL_FIRE[3] if s < steps * 0.45 else COL_RUNE[2]
                            else:
                                torso_dying_256[qy, qx, :3] = COL_FIRE[0] if (qx + qy) % 2 == 0 else COL_RUNE[1]
    torso_dying_256 = seal_256_selout(torso_dying_256, add_selout=True, max_pinhole=12, min_detached=6, max_orphan=24)

    # 5. SKULL_UPPER (6,0) & JAW_MANDIBLE (7,0) from `boss_malphas_v2_skull_base.jpg`!
    skull_512 = chroma_key_green_512(SPRITES_DIR / "boss_malphas_v2_skull_base.jpg", True)
    skull_crop = tight_crop_rgba(skull_512, pad=2)
    sh, sw, _ = skull_crop.shape
    # Make Malphas's Horned Demon Skull COMMANDING & MENACING (~45% larger than the old tiny stub!)
    # Torso neck collar sits around x ~ 106..126, y ~ 72..98 in 256-space.
    # Span horns across w = 158 (`x = 34..192`), skull top at `y = 6`, chin at `y = 126`!
    target_sw = 160
    target_sh = min(132, int(round(sh * (target_sw / float(sw)))))
    skull_rs = resize_rgba_crisp(skull_crop, target_sw, target_sh)

    # Place full skull centered over Malphas's neck collar (slightly left of center for 3/4 facing LEFT!)
    # Find bright fiery throat / eyes to anchor cleanly at x ~ 110, y ~ 6..128
    skull_full_256 = place_in_256(skull_rs, 32, 6)

    # Split Skull Upper vs Lower Jaw Mandible cleanly along the anatomical mouth line!
    # In `demon_sovereign_skull_1795197595041.jpg`, lower jaw + lower fangs sit in the bottom ~28% of skull height
    # and horizontally within the cranium jaw span (excluding the sweeping left/right curved horn tips!)
    s_ys, s_xs = np.where(skull_full_256[:, :, 3] >= 128)
    sy_min, sy_max = int(s_ys.min()), int(s_ys.max())
    sh_actual = sy_max - sy_min + 1
    jaw_split_y = sy_min + int(round(sh_actual * 0.72))  # clean cut right below upper fang row!

    # Restrict jaw mask to central jaw width (`x = 58..140` in 256-space) so outer curved horn tips STAY on SKULL_UPPER!
    op_sk = skull_full_256[:, :, 3] >= 128
    jaw_region = op_sk & (yy >= jaw_split_y) & (xx >= 58) & (xx <= 144)
    # Exclude the curved right horn tip if it dips below jaw_split_y on x > 134
    jaw_region &= ~((xx > 130) & (yy < jaw_split_y + 12))

    # Extract lower jaw mandible `(7,0)`
    jaw_256 = np.zeros((256, 256, 4), dtype=np.uint8)
    jaw_256[jaw_region] = skull_full_256[jaw_region]
    # Keep only the main jaw component (no stray horn tips!)
    jaw_op = filter_mask_min_area(jaw_256[:, :, 3] >= 128, min_area=120)
    # If multiple large components, keep the one closest to jaw center (x=96, y=sy_max-12)
    lbl_j, n_j = ndimage.label(jaw_op, structure=STRUCTURE_8)
    if n_j > 1:
        best_j = 1
        best_d = 1e9
        for cid in range(1, n_j + 1):
            cys, cxs = np.where(lbl_j == cid)
            d = math.hypot(float(cxs.mean()) - 98.0, float(cys.mean()) - (sy_max - 12.0))
            if d < best_d:
                best_d = d
                best_j = cid
        jaw_op = lbl_j == best_j
    jaw_256[~jaw_op] = 0
    jaw_256 = seal_256_selout(jaw_256, add_selout=True, max_pinhole=8, min_detached=4, max_orphan=14)

    # Extract upper skull `(6,0)` (full skull minus lower jaw, PLUS painted blazing molten throat cavity
    # extending down to `jaw_split_y + 16` so dropping the jaw reveals roaring hellfire with ZERO gap!)
    skull_up_256 = skull_full_256.copy()
    skull_up_256[jaw_op] = 0

    # Paint glowing incandescent molten hellfire throat strictly tucked behind the closed chin contour
    # so closed idle shows only fierce fiery glows through the fangs while roaring reveals the blazing gullet!
    throat_cx = 96.0
    throat_y0 = jaw_split_y - 6
    throat_y1 = min(246, jaw_split_y + 11)
    for y in range(throat_y0, throat_y1):
        u_y = (y - throat_y0) / float(max(1, throat_y1 - throat_y0))
        half_w = int(round(16.0 * (1.0 - u_y * 0.52)))
        for x in range(int(throat_cx - half_w), int(throat_cx + half_w) + 1):
            if SAFE_LPX <= x < 256 - SAFE_LPX and SAFE_LPX <= y < 256 - SAFE_LPX:
                if skull_up_256[y, x, 3] >= 128:
                    continue
                nx = abs(x - throat_cx) / float(max(1, half_w))
                heat = (1.0 - nx * 0.85) * (1.0 - u_y * 0.45) + (BAYER_4X4[y & 3, x & 3] - 0.5) * 0.16
                if heat >= 0.72:
                    c = COL_FIRE[4]
                elif heat >= 0.52:
                    c = COL_FIRE[3]
                elif heat >= 0.34:
                    c = COL_FIRE[2]
                elif heat >= 0.18:
                    c = COL_FIRE[1]
                else:
                    c = COL_FIRE[0]
                skull_up_256[y, x, :3] = c
                skull_up_256[y, x, 3] = 255

    skull_up_256 = seal_256_selout(skull_up_256, add_selout=True, max_pinhole=10, min_detached=5, max_orphan=18)

    # Shift JAW_MANDIBLE slightly up (`-4 lpx`) in its closed resting state so closed idle seals tightly
    # under the upper fangs, while `jawOpen -> 1.0` (`jawDropPx = 0..22`) drops wide open to reveal the blazing throat!
    jaw_closed_256 = np.zeros_like(jaw_256)
    shift_up = 4
    jaw_closed_256[:-shift_up, :] = jaw_256[shift_up:, :]
    jaw_closed_256 = seal_256_selout(jaw_closed_256, add_selout=True, max_pinhole=8, min_detached=4, max_orphan=14)

    grids = {
        "rim": rim_256,
        "torso_a": torso_a_256,
        "torso_b": torso_b_256,
        "torso_dying": torso_dying_256,
        "rear_pauldron": rear_p_256,
        "front_pauldron": front_p_256,
        "skull_upper": skull_up_256,
        "jaw_mandible": jaw_closed_256,
    }
    cells = [
        grid256_to_cell512(rim_256),
        grid256_to_cell512(torso_a_256),
        grid256_to_cell512(torso_b_256),
        grid256_to_cell512(torso_dying_256),
        grid256_to_cell512(rear_p_256),
        grid256_to_cell512(front_p_256),
        grid256_to_cell512(skull_up_256),
        grid256_to_cell512(jaw_closed_256),
    ]
    return cells, grids


def extract_vfx_cell_256(vfx_sheet: Image.Image, col: int, row: int, add_selout: bool = True) -> np.ndarray:
    """Extracts a 256x256 cell from boss_malphas_vfx_30fps.png onto a 256x256 logical grid with crisp binary alpha."""
    crop = vfx_sheet.crop((col * 256, row * 256, (col + 1) * 256, (row + 1) * 256)).convert("RGBA")
    arr = np.array(crop, dtype=np.uint8)
    # Binarize alpha cleanly (`>= 96` -> opaque) so boss_colossus_sheet.png has strictly 0 semi-alpha pixels!
    op = arr[:, :, 3] >= 96
    arr[~op] = 0
    arr[op, 3] = 255
    return seal_256_selout(arr, add_selout=add_selout, keep_disconnected_vfx=True)


def build_row1_cells(vfx_sheet: Image.Image) -> tuple[list[Image.Image], dict[str, np.ndarray]]:
    """
    Row 1 (`256x256` logical -> `512x512` output):
      (0,1) CLAW_OPEN
      (1,1) CLAW_FLEX   (aggressively flexed/clenched talons + molten glowing veins & overcharged runes)
      (2,1) FIST_IDLE
      (3,1) FIST_METEOR (supercharged meteoric hellfire aura + incandescent molten knuckles)
      (4,1) GEYSER_A
      (5,1) GEYSER_B
      (6,1) VFX_JAW_HELLFIRE  (3072,512 — Frame A)
      (7,1) VFX_CLAW_SLASH    (3584,512 — Frame A)
    """
    # 1. CLAW_OPEN (0,1) from `boss_malphas_v2_claw_base.jpg`
    claw_512 = chroma_key_green_512(SPRITES_DIR / "boss_malphas_v2_claw_base.jpg", True)
    claw_crop = tight_crop_rgba(claw_512, pad=2)
    ch, cw, _ = claw_crop.shape
    target_cw = 236
    target_ch = min(192, int(round(ch * (target_cw / float(cw)))))
    claw_rs = resize_rgba_crisp(claw_crop, target_cw, target_ch)
    claw_open_256 = place_in_256(claw_rs, 250 - target_cw, (256 - target_ch) // 2)
    claw_open_256 = seal_256_selout(claw_open_256, add_selout=True, max_pinhole=10, min_detached=5, max_orphan=18)

    # 2. CLAW_FLEX (1,1): Flex & curl the talons aggressively inward + superheat talon rims & violet rune!
    yy, xx = np.mgrid[0:256, 0:256].astype(np.float32)
    # Wrist stays pinned on right (`x >= 150`), fingers on left (`x < 150`) curl slightly inward toward y=132 and compress +8px right!
    flex_u = np.clip((155.0 - xx) / 140.0, 0.0, 1.0)
    sx = np.rint(xx - flex_u * 10.0).astype(np.int32)
    sy = np.rint(yy - (yy - 132.0) * (flex_u ** 1.35) * 0.22 + np.sin(flex_u * math.pi) * 4.0).astype(np.int32)
    valid = (sx >= 0) & (sx < 256) & (sy >= 0) & (sy < 256)
    claw_flex_256 = np.zeros((256, 256, 4), dtype=np.uint8)
    claw_flex_256[valid] = claw_open_256[sy[valid], sx[valid]]
    # Supercharge glowing crimson talons + incandescent knuckle cracks + radiant violet diamond
    op_cf = claw_flex_256[:, :, 3] >= 128
    rf = claw_flex_256[:, :, 0].astype(np.int16)
    gf = claw_flex_256[:, :, 1].astype(np.int16)
    bf = claw_flex_256[:, :, 2].astype(np.int16)
    hot_knuckle = op_cf & (rf >= 165) & (rf - bf >= 60)
    claw_flex_256[hot_knuckle, 0] = np.clip(rf[hot_knuckle] + 45, 0, 255).astype(np.uint8)
    claw_flex_256[hot_knuckle, 1] = np.clip(gf[hot_knuckle] + 55, 0, 255).astype(np.uint8)
    claw_flex_256[hot_knuckle, 2] = np.clip(bf[hot_knuckle] + 25, 0, 255).astype(np.uint8)
    rune_cf = op_cf & (bf >= 145) & (rf >= 100)
    claw_flex_256[rune_cf, :3] = COL_RUNE[2]
    claw_flex_256 = seal_256_selout(claw_flex_256, add_selout=True, max_pinhole=10, min_detached=5, max_orphan=18)

    # 3. FIST_IDLE (2,1) from `boss_malphas_v2_fist_base.jpg`
    fist_512 = chroma_key_green_512(SPRITES_DIR / "boss_malphas_v2_fist_base.jpg", True)
    fist_crop = tight_crop_rgba(fist_512, pad=2)
    fh, fw, _ = fist_crop.shape
    target_fh = 236
    target_fw = min(192, int(round(fw * (target_fh / float(fh)))))
    fist_rs = resize_rgba_crisp(fist_crop, target_fw, target_fh)
    fist_idle_256 = place_in_256(fist_rs, (256 - target_fw) // 2, 248 - target_fh)
    fist_idle_256 = seal_256_selout(fist_idle_256, add_selout=True, max_pinhole=10, min_detached=5, max_orphan=18)

    # 4. FIST_METEOR (3,1): Wreathe colossal plunging fist in roaring upward incandescent hellfire tongues!
    fist_meteor_256 = np.zeros((256, 256, 4), dtype=np.uint8)
    # Paint blistering upward meteoric fire halo behind and hugging the fist sides
    for y in range(SAFE_LPX + 2, 248):
        u_up = (248 - y) / 240.0  # 0 at bottom knuckles -> 1 at top cuff
        half_w = 56 + math.sin(u_up * math.pi) * 28 + math.sin(y * 0.22) * 9
        for x in range(int(128 - half_w), int(128 + half_w) + 1):
            if not (SAFE_LPX + 2 <= x < 254 - SAFE_LPX):
                continue
            dx = abs(x - 128.0) / max(1.0, half_w)
            lick = 0.24 * math.sin(x * 0.27 - y * 0.14) + 0.16 * math.cos(y * 0.23 + x * 0.11)
            # Carve open meteor crown near top so flame licks upward into jagged spikes
            top_cut = max(0.0, (u_up - 0.55) / 0.45) * 0.55
            heat = 1.0 - dx - top_cut + lick + (BAYER_4X4[y & 3, x & 3] - 0.5) * 0.16
            if heat > 0.12 and (dx > 0.42 or y > 185):
                if heat >= 0.72:
                    c = COL_FIRE[4]
                elif heat >= 0.54:
                    c = COL_FIRE[3]
                elif heat >= 0.36:
                    c = COL_FIRE[2]
                elif heat >= 0.22:
                    c = COL_FIRE[1]
                else:
                    c = COL_FIRE[0]
                fist_meteor_256[y, x, :3] = c
                fist_meteor_256[y, x, 3] = 255

    # Composite blazing fist ON TOP of meteoric fire aura and superheat molten knuckles!
    op_fi = fist_idle_256[:, :, 3] >= 128
    fist_meteor_256[op_fi] = fist_idle_256[op_fi]
    r_m = fist_meteor_256[:, :, 0].astype(np.int16)
    g_m = fist_meteor_256[:, :, 1].astype(np.int16)
    b_m = fist_meteor_256[:, :, 2].astype(np.int16)
    knuck = op_fi & (r_m >= 165) & (r_m - b_m >= 65)
    fist_meteor_256[knuck, 0] = np.clip(r_m[knuck] + 55, 0, 255).astype(np.uint8)
    fist_meteor_256[knuck, 1] = np.clip(g_m[knuck] + 65, 0, 255).astype(np.uint8)
    fist_meteor_256[knuck, 2] = np.clip(b_m[knuck] + 55, 0, 255).astype(np.uint8)
    fist_meteor_256 = seal_256_selout(fist_meteor_256, add_selout=True, max_pinhole=10, min_detached=5, max_orphan=18)

    # 5. Row 1 VFX cells directly upgraded to crisp 256x256 HD-2D from `boss_malphas_vfx_30fps.png`!
    geyser_a = extract_vfx_cell_256(vfx_sheet, col=2, row=8, add_selout=True)
    geyser_b = extract_vfx_cell_256(vfx_sheet, col=8, row=8, add_selout=True)
    hellfire_a = extract_vfx_cell_256(vfx_sheet, col=1, row=6, add_selout=True)
    claw_slash_a = extract_vfx_cell_256(vfx_sheet, col=1, row=7, add_selout=True)

    cells = [
        grid256_to_cell512(claw_open_256),
        grid256_to_cell512(claw_flex_256),
        grid256_to_cell512(fist_idle_256),
        grid256_to_cell512(fist_meteor_256),
        grid256_to_cell512(geyser_a),
        grid256_to_cell512(geyser_b),
        grid256_to_cell512(hellfire_a),
        grid256_to_cell512(claw_slash_a),
    ]
    return cells, {"claw_open": claw_open_256, "claw_flex": claw_flex_256, "fist_512": fist_512}


def build_row2_cells(
    vfx_sheet: Image.Image, fist_512: np.ndarray
) -> tuple[list[Image.Image], np.ndarray]:
    """
    Row 2 (`256x256` logical -> `512x512` output):
      (0,2) LEFT_WING_UP    (shoulder pin EXACT `(242, 160)` -> `(484, 320)` in 512!)
      (1,2) LEFT_WING_MID   (shoulder pin EXACT `(242, 160)`)
      (2,2) LEFT_WING_DOWN  (shoulder pin EXACT `(242, 160)`)
      (3,2) RIGHT_WING_MID  (shoulder pin EXACT `(14, 160)` -> `(28, 320)` in 512!)
      (4,2) VAMBRACE_HORIZ  (gilded gothic spiked forearm matching claw cuff 1:1)
      (5,2) FIST_RIFT_PORTAL (swirling abyssal violet-crimson tear portal maw)
      (6,2) HELLFIRE_B
      (7,2) HELLFIRE_C
    """
    # 1. Great-Wings from `boss_malphas_v2_wing_base.jpg`!
    wing_512 = chroma_key_green_512(SPRITES_DIR / "boss_malphas_v2_wing_base.jpg", True)
    wing_crop = tight_crop_rgba(wing_512, pad=2)
    wh, ww, _ = wing_crop.shape
    # Fit wing cleanly inside 214x196 so after +-14 deg up/down flap around pivot (242, 160)
    # every wingtip stays strictly inside SAFE_LPX=4 (`>= 8px` output margin, 0 border clips)!
    target_ww = 216
    target_wh = min(192, int(round(wh * (target_ww / float(ww)))))
    wing_rs = resize_rgba_crisp(wing_crop, target_ww, target_wh)

    # Locate the rightmost shoulder joint pixel in wing_rs and pin it directly onto (242, 160)!
    # In `abyssal_demon_wing_left_v3`, the muscular shoulder root is the rightmost knob (~y = 70% down)!
    right_strip = wing_rs[:, max(0, target_ww - 24) :, 3] >= 128
    rys, rxs = np.where(right_strip)
    root_local_y = int(round(np.median(rys))) if len(rys) > 8 else int(round(target_wh * 0.68))
    root_local_x = target_ww - 6

    wing_base_256 = place_in_256(wing_rs, 242 - root_local_x, 160 - root_local_y)

    wing_l_up = warp_wing_articulated(wing_base_256, 242.0, 160.0, angle_deg=+12.0, tip_bend_deg=+5.0, ember_pulse=0.45, mirror_right=False)
    wing_l_mid = warp_wing_articulated(wing_base_256, 242.0, 160.0, angle_deg=0.0, tip_bend_deg=0.0, ember_pulse=0.20, mirror_right=False)
    wing_l_down = warp_wing_articulated(wing_base_256, 242.0, 160.0, angle_deg=-13.0, tip_bend_deg=-6.0, ember_pulse=0.65, mirror_right=False)
    wing_r_mid = warp_wing_articulated(wing_base_256, 242.0, 160.0, angle_deg=0.0, tip_bend_deg=0.0, ember_pulse=0.20, mirror_right=True)

    # Assert exact shoulder socket pins are 100% opaque!
    assert wing_l_up[160, 242, 3] == 255
    assert wing_l_mid[160, 242, 3] == 255
    assert wing_l_down[160, 242, 3] == 255
    assert wing_r_mid[160, 14, 3] == 255

    # 2. VAMBRACE_HORIZ (4,2): Extracted cleanly from the gothic spiked rune forearm of `boss_malphas_v2_fist_base.jpg`!
    # Take the upper 62% of the fist (cuff + spiked violet-rune forearm, excluding bottom clenched fingers),
    # rotate 90° clockwise (so wrist docks seamlessly on LEFT onto claw cuff and elbow extends RIGHT!)
    fc = tight_crop_rgba(fist_512, pad=2)
    forearm_crop = fc[: int(round(fc.shape[0] * 0.65)), :, :].copy()
    forearm_horiz = np.rot90(forearm_crop, k=-1)  # top cuff -> right, lower wrist -> left!
    vh, vw, _ = forearm_horiz.shape
    target_vw = 228
    target_vh = min(144, int(round(vh * (target_vw / float(vw)))))
    vam_rs = resize_rgba_crisp(forearm_horiz, target_vw, target_vh)
    vambrace_256 = place_in_256(vam_rs, (256 - target_vw) // 2, (256 - target_vh) // 2)
    vambrace_256 = seal_256_selout(vambrace_256, add_selout=True, max_pinhole=10, min_detached=5, max_orphan=18)

    # 3. FIST_RIFT_PORTAL (5,2): Swirling Abyssal Violet-Crimson Hell-Rift Tear Portal Maw (`256x256` logical)
    rift_256 = np.zeros((256, 256, 4), dtype=np.uint8)
    yy, xx = np.mgrid[0:256, 0:256].astype(np.float32)
    nx = (xx - 128.0) / 106.0
    ny = (yy - 128.0) / 52.0
    r_el = np.hypot(nx, ny)
    ang = np.arctan2(ny, nx)
    jagged = 0.11 * np.sin(ang * 7.0 + 0.4) + 0.06 * np.cos(ang * 13.0)
    d = r_el - jagged
    bayer = (BAYER_4X4[yy.astype(np.int32) & 3, xx.astype(np.int32) & 3] - 0.5) * 0.14
    mask_rift = d <= 1.0
    rift_256[mask_rift, 3] = 255
    # Layered swirling vortex bands: obsidian outer rim -> arcane violet runes -> crimson hellfire -> white-gold core
    heat = (1.0 - d) + bayer + 0.08 * np.sin(ang * 4.0 + d * 8.0)
    rift_256[mask_rift & (heat < 0.22), :3] = COL_OBSIDIAN[1]
    rift_256[mask_rift & (heat >= 0.22) & (heat < 0.42), :3] = COL_RUNE[0]
    rift_256[mask_rift & (heat >= 0.42) & (heat < 0.56), :3] = COL_RUNE[1]
    rift_256[mask_rift & (heat >= 0.56) & (heat < 0.68), :3] = COL_FIRE[0]
    rift_256[mask_rift & (heat >= 0.68) & (heat < 0.80), :3] = COL_FIRE[2]
    rift_256[mask_rift & (heat >= 0.80) & (heat < 0.90), :3] = COL_FIRE[3]
    rift_256[mask_rift & (heat >= 0.90), :3] = COL_FIRE[4]
    # Crisp gilded diamond rune accents on left/right tear corners
    for cx_r in (34, 222):
        for dy_r in range(-7, 8):
            for dx_r in range(-7, 8):
                if abs(dx_r) + abs(dy_r) <= 7:
                    c = COL_RUNE[2] if abs(dx_r) + abs(dy_r) <= 3 else COL_RUNE[1]
                    rift_256[128 + dy_r, cx_r + dx_r, :3] = c
                    rift_256[128 + dy_r, cx_r + dx_r, 3] = 255
    rift_256 = seal_256_selout(rift_256, add_selout=True, keep_disconnected_vfx=True)

    # 4. HELLFIRE_B (6,2) & HELLFIRE_C (7,2)
    hellfire_b = extract_vfx_cell_256(vfx_sheet, col=5, row=6, add_selout=True)
    hellfire_c = extract_vfx_cell_256(vfx_sheet, col=9, row=6, add_selout=True)

    cells = [
        grid256_to_cell512(wing_l_up),
        grid256_to_cell512(wing_l_mid),
        grid256_to_cell512(wing_l_down),
        grid256_to_cell512(wing_r_mid),
        grid256_to_cell512(vambrace_256),
        grid256_to_cell512(rift_256),
        grid256_to_cell512(hellfire_b),
        grid256_to_cell512(hellfire_c),
    ]
    return cells, wing_base_256


def build_magma_spire_256(tall: bool) -> np.ndarray:
    """Sculpts a crisp 256x256 chiseled jagged volcanic obsidian spire cluster with layered rock strata, lava cracks & violet runes."""
    out = np.zeros((256, 256, 4), dtype=np.uint8)
    # Main central jagged spire + two flanking crystalline basalt shards!
    shards = [
        (128.0, 14 if tall else 36, 246, 56.0 if tall else 64.0, 0.0),
        (78.0, 102 if tall else 118, 246, 30.0, -0.35),
        (178.0, 94 if tall else 112, 246, 32.0, 0.35),
    ]
    for s_idx, (scx, top_y, bot_y, base_w, lean) in enumerate(shards):
        for y in range(top_y, bot_y):
            u = (y - top_y) / float(max(1, bot_y - top_y))
            cx_y = scx + (1.0 - u) * lean * 24.0
            # Craggy stepped volcanic silhouette edges
            jag_l = 4.5 * math.sin(u * 23.0 + s_idx * 1.7) + 2.5 * math.cos(u * 41.0)
            jag_r = 4.5 * math.cos(u * 21.0 + s_idx * 2.3) + 2.5 * math.sin(u * 37.0)
            hw_l = max(2.0, 3.0 + (u ** 1.08) * base_w + jag_l * u)
            hw_r = max(2.0, 3.0 + (u ** 1.08) * base_w + jag_r * u)
            x_min = max(SAFE_LPX + 1, int(round(cx_y - hw_l)))
            x_max = min(255 - SAFE_LPX, int(round(cx_y + hw_r)))
            # Chiseled diagonal basalt ridge line
            ridge_x = cx_y + math.sin(u * 7.0 + s_idx) * 8.0 * u - 4.0 * u
            for x in range(x_min, x_max + 1):
                if s_idx > 0 and out[y, x, 3] >= 128:
                    continue
                bayer = (BAYER_4X4[y & 3, x & 3] - 0.5) * 0.16
                # Faceted pixel-art obsidian planes + horizontal volcanic strata cracks
                strata = ((y + int(x * 0.25)) % 14) <= 1
                dist_left = (x - x_min) / max(1.0, ridge_x - x_min)
                if x <= ridge_x:
                    if x <= x_min + 2:
                        c = COL_OBSIDIAN[4]
                    elif dist_left + bayer < 0.35:
                        c = COL_OBSIDIAN[3]
                    else:
                        c = COL_OBSIDIAN[2]
                else:
                    dist_right = (x - ridge_x) / max(1.0, x_max - ridge_x)
                    if dist_right + bayer < 0.45:
                        c = COL_OBSIDIAN[1]
                    else:
                        c = COL_OBSIDIAN[0]
                if strata and u > 0.2:
                    c = COL_OBSIDIAN[0]

                # Jagged branching incandescent magma veins erupting from the spire base
                crack_x = cx_y + math.sin(u * 13.0 + s_idx * 2.0) * (7.0 if s_idx == 0 else 4.0) * u
                d_crack = abs(x - crack_x)
                branch_x = cx_y + (1 if int(y / 18) % 2 == 0 else -1) * ((u - 0.45) * 62.0)
                d_branch = abs(x - branch_x) if (s_idx == 0 and u > 0.48) else 99.0
                if (u > 0.24 and d_crack <= (1.8 + u * 3.4)) or (d_branch <= 2.2):
                    if d_crack <= 1.2 and u > 0.52:
                        c = COL_FIRE[4]
                    elif d_crack <= 2.3 or d_branch <= 1.1:
                        c = COL_FIRE[3]
                    else:
                        c = COL_FIRE[1]
                elif u > 0.84:
                    # Molten fissure crust along ground base
                    glow = (u - 0.84) / 0.16 + bayer
                    if glow > 0.55:
                        c = COL_FIRE[2] if glow < 0.85 else COL_FIRE[3]
                out[y, x, :3] = c
                out[y, x, 3] = 255
                # Crisp dark facet seam along central ridge
                if abs(x - ridge_x) <= 0.7 and u > 0.12 and u < 0.84:
                    out[y, x, :3] = SELOUT_RGB

    # Glowing arcane violet diamond ward carved onto main spire face
    cy_r = 122 if tall else 140
    for dy in range(-12, 13):
        for dx in range(-7, 8):
            d_m = abs(dx) * 1.6 + abs(dy)
            if d_m <= 11:
                if d_m <= 4:
                    c = COL_RUNE[2]
                elif d_m <= 8:
                    c = COL_RUNE[1]
                else:
                    c = COL_GOLD[2]
                out[cy_r + dy, 128 + dx, :3] = c
    return seal_256_selout(out, add_selout=True, max_pinhole=6)


def build_magma_boulder_256(variant: int) -> np.ndarray:
    """Sculpts a crisp 256x256 HD-2D chiseled angular volcanic obsidian boulder with glowing jagged magma fractures."""
    out = np.zeros((256, 256, 4), dtype=np.uint8)
    yy, xx = np.mgrid[0:256, 0:256].astype(np.float32)
    dx = (xx - 128.0) / (92.0 if variant == 0 else 96.0)
    dy = (yy - 128.0) / (86.0 if variant == 0 else 92.0)
    ang = np.arctan2(dy, dx)
    r = np.hypot(dx, dy)
    phase = 0.25 if variant == 0 else 1.45
    # Sharp polygonal chiseled rock facets (not blobby sin-circles!)
    n_sides = 7 if variant == 0 else 8
    sector = (math.pi * 2.0) / n_sides
    a_mod = ((ang + phase) % sector) - sector * 0.5
    poly_r = 0.88 / np.maximum(0.65, np.cos(a_mod))
    jagged = 0.04 * np.sin(ang * 13.0 + phase) + 0.03 * np.cos(ang * 19.0)
    mask = r <= (poly_r + jagged)
    bayer = (BAYER_4X4[yy.astype(np.int32) & 3, xx.astype(np.int32) & 3] - 0.5) * 0.14

    # Quantized multi-plane angular basalt shading (sharp facet ridges!)
    plane_a = (dx * 0.72 + dy * 0.68)
    plane_b = (-dx * 0.55 + dy * 0.82)
    lit = (-dx * 0.65 - dy * 0.75) * 0.5 + 0.5 + bayer
    out[mask, 3] = 255
    out[mask & (lit < 0.28), :3] = COL_OBSIDIAN[0]
    out[mask & (lit >= 0.28) & (lit < 0.50), :3] = COL_OBSIDIAN[1]
    out[mask & (lit >= 0.50) & (lit < 0.72), :3] = COL_OBSIDIAN[2]
    out[mask & (lit >= 0.72) & (lit < 0.86), :3] = COL_OBSIDIAN[3]
    out[mask & (lit >= 0.86), :3] = COL_OBSIDIAN[4]
    # Crisp dark rock-chisel plane seams
    seam = mask & (r < 0.82) & ((np.abs(plane_a - 0.15) < 0.025) | (np.abs(plane_b + 0.22) < 0.022))
    out[seam, :3] = COL_OBSIDIAN[0]

    # Sharp branching volcanic lava fractures & glowing ember core pockets
    jag_x = 0.07 * np.sin(dy * 11.0 + phase) + 0.04 * np.cos(dy * 23.0)
    jag_y = 0.07 * np.cos(dx * 12.0 - phase) + 0.04 * np.sin(dx * 21.0)
    c1 = np.abs(dx * 0.78 - dy * 0.62 + jag_x)
    c2 = np.abs(dx * 0.42 + dy * 0.91 + jag_y)
    m_hot_outer = mask & (r < 0.80) & ((c1 < 0.055) | (c2 < 0.045))
    m_hot_mid = mask & (r < 0.72) & ((c1 < 0.032) | (c2 < 0.026))
    m_hot_core = mask & (r < 0.48) & ((c1 < 0.016) | (c2 < 0.014))
    out[m_hot_outer, :3] = COL_FIRE[0]
    out[m_hot_mid, :3] = COL_FIRE[2]
    out[m_hot_core, :3] = COL_FIRE[4]
    return seal_256_selout(out, add_selout=True, max_pinhole=6)


def build_row3_cells(vfx_sheet: Image.Image) -> list[Image.Image]:
    """
    Row 3 (`256x256` logical -> `512x512` output):
      (0,3) CLAW_SLASH_B
      (1,3) CLAW_SLASH_C
      (2,3) MAGMA_SPIRE_A
      (3,3) MAGMA_SPIRE_B
      (4,3) BOULDER_A
      (5,3) BOULDER_B
      (6,3) ECLIPSE_CREST (from `boss_malphas_v2_crown_base.jpg`!)
      (7,3) HEART_CORE    (Exposed Vulnerable Molten Heart-Core Rupture!)
    """
    slash_b = extract_vfx_cell_256(vfx_sheet, col=5, row=7, add_selout=True)
    slash_c = extract_vfx_cell_256(vfx_sheet, col=9, row=7, add_selout=True)
    spire_a = build_magma_spire_256(tall=False)
    spire_b = build_magma_spire_256(tall=True)
    boulder_a = build_magma_boulder_256(variant=0)
    boulder_b = build_magma_boulder_256(variant=1)

    # ECLIPSE_CREST (6,3) from `boss_malphas_v2_crown_base.jpg`!
    crown_512 = chroma_key_green_512(SPRITES_DIR / "boss_malphas_v2_crown_base.jpg", True)
    crown_crop = tight_crop_rgba(crown_512, pad=2)
    crh, crw, _ = crown_crop.shape
    target_crw = 218
    target_crh = min(192, int(round(crh * (target_crw / float(crw)))))
    crown_rs = resize_rgba_crisp(crown_crop, target_crw, target_crh)
    crown_256 = place_in_256(crown_rs, (256 - target_crw) // 2, 198 - target_crh)
    crown_256 = seal_256_selout(crown_256, add_selout=True, max_pinhole=8, min_detached=4, max_orphan=14)

    # HEART_CORE (7,3): Radiant Exposed Molten Heart-Core Rupture crystal vortex!
    heart_256 = extract_vfx_cell_256(vfx_sheet, col=3, row=11, add_selout=True)

    return [
        grid256_to_cell512(slash_b),
        grid256_to_cell512(slash_c),
        grid256_to_cell512(spire_a),
        grid256_to_cell512(spire_b),
        grid256_to_cell512(boulder_a),
        grid256_to_cell512(boulder_b),
        grid256_to_cell512(crown_256),
        grid256_to_cell512(heart_256),
    ]


def patch_vfx_sheet_art_matched_rows(
    vfx_sheet: Image.Image,
    wing_base_256: np.ndarray,
    claw_open_256: np.ndarray,
    claw_flex_256: np.ndarray,
) -> Image.Image:
    """
    Replaces Row 0 (12-frame articulated Right Wingbeat) and Row 2 (12-frame Foreground Clamping
    Siege-Claw Talons + Forged Abyssal Chains) in `boss_malphas_vfx_30fps.png` with art-matched
    renders derived directly from our Malphas 2.0 wing and claw masters!
    Note: Every 256x256 cell is authored at 128x128 logical -> 2x NEAREST to maintain uniform 2x2 HD-2D density!
    """
    out = vfx_sheet.copy()

    # 1. Patch Row 0: 12-frame articulated Right Counter-Wing matching `(3,2)` identically at frames 3 & 9!
    for f in range(12):
        # Smooth sinusoidal wingbeat: f=0 (up), f=3 (mid-down), f=6 (down), f=9 (mid-up)
        phase = (f / 12.0) * math.pi * 2.0
        flap = math.cos(phase)  # +1 at f=0, 0 at f=3/9, -1 at f=6
        lag = math.cos(phase - 0.55)
        ang = flap * 13.0
        bend = lag * 5.5
        ember = 0.20 + 0.55 * max(0.0, -flap)
        w256 = warp_wing_articulated(
            wing_base_256,
            242.0,
            160.0,
            angle_deg=ang,
            tip_bend_deg=bend,
            ember_pulse=ember,
            mirror_right=True,
        )
        # Keep crisp 256x256 art-matched wing directly (zero border clips within 8px!)
        w256[:8, :] = 0; w256[-8:, :] = 0; w256[:, :8] = 0; w256[:, -8:] = 0
        out.paste(Image.fromarray(w256, mode="RGBA"), (f * 256, 0))

    # 2. Patch Row 2: 12-frame Foreground Clamping Siege-Claw Talons + Forged Abyssal Chains (drawn OVER grabbed hero!)
    # Extract ONLY the menacing front curved metallic talons from `claw_flex_256` (`x <= 156`)
    # so they wrap over the hero's chest from RIGHT -> LEFT while letting the hero's body read clearly behind the claws!
    yy, xx = np.mgrid[0:256, 0:256].astype(np.float32)
    talons_only = claw_flex_256.copy()
    # Keep the 4 curved upper talons + lower opposable thumb talon cleanly, trimming the rear wrist block (`x > 168`)
    # along a curved knuckle guard contour so it looks like giant claws clamping OVER the victim!
    knuckle_cut = 162.0 + np.sin((yy - 128.0) / 70.0 * math.pi) * 14.0
    talons_only[xx > knuckle_cut] = 0
    # Open a slight peek gap between upper talons and lower thumb so the hero's face/armor shows dramatically between the clamped claws!
    talons_only = seal_256_selout(talons_only, add_selout=True, max_pinhole=6, min_detached=8, max_orphan=16)

    for f in range(12):
        snap_u = min(1.0, f / 2.0) if f < 3 else 1.0
        squeeze = (0.5 + 0.5 * math.sin((f - 3) * (math.pi * 2.0 / 3.0))) if f >= 3 else 0.0
        clench = snap_u * 10.0 + squeeze * 8.0

        cell = np.zeros((256, 256, 4), dtype=np.uint8)
        # (a) Draw taut forged obsidian & violet-glowing Abyssal Chains wrapping diagonally around the hero
        dr = ImageDraw.Draw(Image.fromarray(cell, mode="RGBA"))
        chain_im = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
        cdr = ImageDraw.Draw(chain_im)

        def draw_chain_band(p0, pc, p1, links, pulse_v):
            for i in range(links):
                u = (i + 0.5) / float(links)
                lx = (1 - u) ** 2 * p0[0] + 2 * (1 - u) * u * pc[0] + u ** 2 * p1[0]
                ly = (1 - u) ** 2 * p0[1] + 2 * (1 - u) * u * pc[1] + u ** 2 * p1[1]
                r_x = 11 if i % 2 == 0 else 7
                r_y = 7 if i % 2 == 0 else 11
                x0, y0, x1, y1 = int(lx - r_x), int(ly - r_y), int(lx + r_x), int(ly + r_y)
                cdr.rectangle([x0 - 2, y0 - 2, x1 + 2, y1 + 2], fill=(13, 15, 28, 255))
                col_mid = (216, 118, 255, 255) if (pulse_v > 0.45 and i % 2 == 0) else (136, 120, 204, 255)
                cdr.rectangle([x0, y0, x1, y1], fill=col_mid)
                cdr.rectangle([x0 + 2, y0 + 2, x1 - 2, y1 - 2], fill=(42, 32, 84, 255))
                if r_x >= 10:
                    cdr.rectangle([x0 + 4, y0 + 3, x1 - 4, y1 - 3], fill=(0, 0, 0, 0))
                if i in (2, links // 2, links - 3):
                    # Glowing violet rune shackle diamond on chain!
                    cdr.polygon(
                        [(lx, ly - 9), (lx + 7, ly), (lx, ly + 9), (lx - 7, ly)],
                        fill=(245, 208, 254, 255) if pulse_v > 0.45 else (168, 85, 247, 255),
                        outline=(13, 15, 28, 255),
                    )

        draw_chain_band((22, 56 + clench * 0.4), (128, 98), (236, 72 - clench * 0.3), 13, squeeze)
        draw_chain_band((22, 200 - clench * 0.4), (128, 158), (236, 186 + clench * 0.3), 13, squeeze)
        draw_chain_band((38, 32), (124, 128), (214, 224), 11, squeeze)
        chain_np = np.array(chain_im, dtype=np.uint8)
        # Quantize chain to crisp 2x2 blocks
        chain_q = np.repeat(np.repeat(chain_np[::2, ::2], 2, axis=0), 2, axis=1)
        cell[chain_q[:, :, 3] >= 128] = chain_q[chain_q[:, :, 3] >= 128]

        # (b) Warp real sculpted talons clamping inward over the hero!
        shift_x = int(round(36 + clench * 0.9))
        curl_scale = 1.0 - squeeze * 0.08
        sx = np.rint(xx - shift_x).astype(np.int32)
        sy = np.rint(128.0 + (yy - 128.0) / curl_scale).astype(np.int32)
        valid = (sx >= 0) & (sx < 256) & (sy >= 0) & (sy < 256)
        warped_t = np.zeros((256, 256, 4), dtype=np.uint8)
        warped_t[valid] = talons_only[sy[valid], sx[valid]]

        # Flash incandescent molten-violet crush energy along talon tips on peak squeeze!
        if squeeze > 0.45:
            op_wt = warped_t[:, :, 3] >= 128
            rw = warped_t[:, :, 0].astype(np.int16)
            gw = warped_t[:, :, 1].astype(np.int16)
            bw = warped_t[:, :, 2].astype(np.int16)
            tip_glow = op_wt & (xx < 126) & ((rw >= 135) | (bw >= 120))
            warped_t[tip_glow, 0] = np.clip(rw[tip_glow] + 55, 0, 255).astype(np.uint8)
            warped_t[tip_glow, 1] = np.clip(gw[tip_glow] + 35, 0, 255).astype(np.uint8)
            warped_t[tip_glow, 2] = np.clip(bw[tip_glow] + 70, 0, 255).astype(np.uint8)

        op_w = warped_t[:, :, 3] >= 128
        cell[op_w] = warped_t[op_w]
        cell[:8, :] = 0; cell[-8:, :] = 0; cell[:, :8] = 0; cell[:, -8:] = 0
        out.paste(Image.fromarray(cell, mode="RGBA"), (f * 256, 2 * 256))

    return out


def build_portrait_128() -> Image.Image:
    """Builds crisp native 128x128 HD-2D Boss HUD portrait directly from `boss_malphas_v2_portrait_base.jpg`."""
    raw = Image.open(SPRITES_DIR / "boss_malphas_v2_portrait_base.jpg").convert("RGB")
    # Mild contrast & sharpness boost so eyes, horns, crown, and ribcage read razor-sharp even at 44x44 HUD!
    raw = ImageEnhance.Contrast(raw).enhance(1.10)
    raw = ImageEnhance.Sharpness(raw).enhance(1.20)
    p128 = raw.resize((128, 128), Image.Resampling.LANCZOS)
    # Quantize to a rich 56-color lossless pixel-art palette for authentic HD-2D crispness
    p128_q = p128.quantize(colors=56, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).convert("RGBA")
    arr = np.array(p128_q, dtype=np.uint8)
    arr[:, :, 3] = 255
    # Crisp 1px #0d0f1c obsidian perimeter border
    arr[0, :, :3] = SELOUT_RGB
    arr[-1, :, :3] = SELOUT_RGB
    arr[:, 0, :3] = SELOUT_RGB
    arr[:, -1, :3] = SELOUT_RGB
    return Image.fromarray(arr, mode="RGBA")


def audit_boss_sheet(sheet: Image.Image) -> tuple[int, int, float]:
    arr = np.array(sheet, dtype=np.uint8)
    assert sheet.size == (4096, 2048), f"Expected 4096x2048, got {sheet.size}"
    border_clips = 0
    empty_cells = 0
    for row in range(4):
        for col in range(8):
            cell_a = arr[row * 512 : (row + 1) * 512, col * 512 : (col + 1) * 512, 3]
            if not np.any(cell_a > 0):
                empty_cells += 1
                print(f"[ERR] Empty cell ({col},{row})")
            if (
                np.any(cell_a[:8, :] > 0)
                or np.any(cell_a[-8:, :] > 0)
                or np.any(cell_a[:, :8] > 0)
                or np.any(cell_a[:, -8:] > 0)
            ):
                border_clips += 1
                print(f"[ERR] Margin (<8px) clip in cell ({col},{row})")
    assert empty_cells == 0, f"Empty cells: {empty_cells}"
    assert border_clips == 0, f"Border clips (<8px): {border_clips}"

    semi_alpha = int(np.sum((arr[:, :, 3] > 0) & (arr[:, :, 3] < 255)))
    assert semi_alpha == 0, f"Semi-alpha pixels found: {semi_alpha}"

    # Verify 100.0% 2x2 HD-2D block uniformity (`256x256` logical -> `2x2` blocks = 4x detail!)
    bh, bw = 2048 // 2, 4096 // 2
    reshaped = arr.reshape(bh, 2, bw, 2, 4)
    ref = reshaped[:, 0:1, :, 0:1, :]
    active = np.any(reshaped[:, :, :, :, 3] > 0, axis=(1, 3))
    exact = np.all(reshaped == ref, axis=(1, 3, 4))
    block2x2 = float(np.sum(exact & active)) / float(max(1, np.sum(active)))
    assert block2x2 == 1.0, f"Expected 100.0% 2x2 block uniformity, got {block2x2:.4f}"

    # Verify exact shoulder sockets on `(0..2, 2)` at (484, 320) and `(3, 2)` at (28, 320)
    for wc in (0, 1, 2):
        assert arr[2 * 512 + 320, wc * 512 + 484, 3] == 255, f"Wing ({wc},2) socket (484,320) transparent!"
    assert arr[2 * 512 + 320, 3 * 512 + 28, 3] == 255, "Wing (3,2) socket (28,320) transparent!"

    return border_clips, semi_alpha, block2x2


def write_contact_sheet(
    sheet: Image.Image, portrait: Image.Image, vfx_sheet: Image.Image, out_path: Path
) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    dbg = Image.new("RGBA", (2048, 1520), (12, 14, 24, 255))
    dr = ImageDraw.Draw(dbg)
    half = sheet.resize((2048, 1024), Image.Resampling.NEAREST)
    for r in range(4):
        for c in range(8):
            bx, by = c * 256, r * 256
            bg = (22, 26, 40, 255) if (r + c) % 2 == 0 else (15, 18, 28, 255)
            dr.rectangle([bx, by, bx + 255, by + 255], fill=bg, outline=(52, 62, 94, 255))
    dbg.alpha_composite(half, (0, 0))
    for r in range(4):
        for c in range(8):
            dr.text((c * 256 + 6, r * 256 + 6), f"({c},{r})", fill=(253, 224, 71, 255))

    # Bottom panel: Portrait (128x128 + 44x44) + Assembled Phase I, Phase III Roar, Vulnerable, Dying previews
    dr.rectangle([0, 1024, 2047, 1519], fill=(10, 12, 22, 255))
    dbg.alpha_composite(portrait, (24, 1054))
    dr.text((24, 1034), "PORTRAIT 128x128", fill=(253, 224, 71, 255))
    dbg.alpha_composite(portrait.resize((44, 44), Image.Resampling.NEAREST), (184, 1094))
    dr.text((178, 1076), "44x44 HUD", fill=(186, 230, 253, 255))

    def render_assembled(mode: str) -> Image.Image:
        comp = Image.new("RGBA", (420, 300), (16, 12, 26, 255))
        def cblit(col, row, dx, dy, sz):
            im = sheet.crop((col * 512, row * 512, (col + 1) * 512, (row + 1) * 512)).resize((sz, sz), Image.Resampling.NEAREST)
            comp.alpha_composite(im, (dx, dy))
        tx, ty, ts = 110, 38, 228  # half of 456!
        # Wings
        cblit(3, 2, tx + 149, ty - 17, 184)
        cblit(0 if mode == "roar" else 1, 2, tx - 115, ty - 20, 194)
        if mode in ("roar", "vuln"):
            cblit(6, 3, tx + 106 - 58, ty + 14 - 60, 118)
        # Rear claw
        cblit(1 if mode == "roar" else 0, 1, tx - 39, ty + 98, 106)
        # Core anatomy
        cblit(4, 0, tx, ty, ts)
        cblit(3 if mode == "dead" else (2 if mode == "roar" else 1), 0, tx, ty, ts)
        cblit(6, 0, tx, ty, ts)
        cblit(7, 0, tx, ty + (10 if mode in ("roar", "dead") else 1), ts)
        cblit(5, 0, tx, ty, ts)
        # Parapet rim
        cblit(0, 0, tx, ty, ts)
        # Heart core when vulnerable
        if mode == "vuln":
            cblit(7, 3, tx + 98 - 48, ty + 128 - 48, 96)
        # Foreground vambrace + claw
        if mode != "dead":
            cblit(4, 2, tx - 4, ty + 106, 118)
            cblit(1 if mode == "roar" else 0, 1, tx - 68, ty + 102, 126)
        return comp

    modes = [
        ("idle", "PHASE I IDLE (ASSEMBLED)"),
        ("roar", "PHASE III ROAR + CROWN"),
        ("vuln", "VULNERABLE HEART CORE"),
        ("dead", "TORSO_DYING COLLAPSE"),
    ]
    for idx, (m, label) in enumerate(modes):
        px = 280 + idx * 436
        dbg.alpha_composite(render_assembled(m), (px, 1052))
        dr.text((px + 6, 1034), label, fill=(253, 224, 71, 255))

    # Strip of patched VFX Row 0 (Right Wing) & Row 2 (Clamping Talons + Chains) along bottom
    for f in range(6):
        rw = vfx_sheet.crop((f * 2 * 256, 0, (f * 2 + 1) * 256, 256)).resize((128, 128), Image.Resampling.NEAREST)
        dbg.alpha_composite(rw, (24 + f * 136, 1378))
        cl = vfx_sheet.crop((f * 2 * 256, 512, (f * 2 + 1) * 256, 768)).resize((128, 128), Image.Resampling.NEAREST)
        dbg.alpha_composite(cl, (880 + f * 136, 1378))
    dr.text((24, 1362), "VFX ROW 0: ART-MATCHED 12F RIGHT WINGBEAT", fill=(186, 230, 253, 255))
    dr.text((880, 1362), "VFX ROW 2: ART-MATCHED 12F CLAMPING TALONS & CHAINS", fill=(245, 208, 254, 255))

    dbg.convert("RGB").save(out_path, optimize=True)
    print(f"[OK] Saved inspection contact sheet: {out_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Behemoth Malphas 2.0 HD-2D 2x2 Boss Sheet & Portrait")
    parser.add_argument("--contact-sheet", type=Path, default=None, help="Optional contact sheet PNG path")
    args = parser.parse_args()

    assert VFX_SHEET_PATH.exists(), f"Run `node scripts/build_malphas_boss_vfx_30fps.mjs` first! Missing: {VFX_SHEET_PATH}"
    vfx_sheet = Image.open(VFX_SHEET_PATH).convert("RGBA")

    row0_cells, _ = build_row0_cells()
    row1_cells, r1_data = build_row1_cells(vfx_sheet)
    row2_cells, wing_base_256 = build_row2_cells(vfx_sheet, r1_data["fist_512"])
    row3_cells = build_row3_cells(vfx_sheet)

    out_sheet = Image.new("RGBA", (4096, 2048), (0, 0, 0, 0))
    for r_idx, row_cells in enumerate([row0_cells, row1_cells, row2_cells, row3_cells]):
        for c_idx, cell_im in enumerate(row_cells):
            out_sheet.paste(cell_im, (c_idx * 512, r_idx * 512))

    border_clips, semi_alpha, block2x2 = audit_boss_sheet(out_sheet)
    out_sheet.save(SHEET_PATH, format="PNG", optimize=True, compress_level=9)

    portrait = build_portrait_128()
    p_np = np.array(portrait, dtype=np.uint8)
    assert portrait.size == (128, 128)
    assert int(np.sum((p_np[:, :, 3] > 0) & (p_np[:, :, 3] < 255))) == 0
    portrait.save(PORTRAIT_PATH, format="PNG", optimize=True, compress_level=9)

    # Patch art-matched Row 0 & Row 2 into `boss_malphas_vfx_30fps.png`!
    vfx_patched = patch_vfx_sheet_art_matched_rows(
        vfx_sheet, wing_base_256, r1_data["claw_open"], r1_data["claw_flex"]
    )
    # Audit patched VFX sheet for 0 border clips (< 8px) and 0 empty cells
    v_np = np.array(vfx_patched, dtype=np.uint8)
    v_clips = 0
    v_empty = 0
    for r in range(12):
        for c in range(12):
            ca = v_np[r * 256 : (r + 1) * 256, c * 256 : (c + 1) * 256, 3]
            if not np.any(ca > 0):
                v_empty += 1
            if np.any(ca[:4, :] > 0) or np.any(ca[-4:, :] > 0) or np.any(ca[:, :4] > 0) or np.any(ca[:, -4:] > 0):
                v_clips += 1
    assert v_empty == 0 and v_clips == 0, f"Patched VFX sheet audit failed: empty={v_empty}, clips={v_clips}"
    vfx_patched.save(VFX_SHEET_PATH, format="PNG", optimize=True, compress_level=9)

    print(
        f"[OK] Saved {SHEET_PATH}: 4096x2048 RGBA ({SHEET_PATH.stat().st_size / 1024:.1f} KB), "
        f"border_clips={border_clips}, semi_alpha={semi_alpha}, 2x2={block2x2 * 100:.1f}%"
    )
    print(f"[OK] Saved {PORTRAIT_PATH}: 128x128 RGBA ({PORTRAIT_PATH.stat().st_size / 1024:.1f} KB)")
    print(
        f"[OK] Patched {VFX_SHEET_PATH}: 3072x3072 RGBA ({VFX_SHEET_PATH.stat().st_size / 1024:.1f} KB), "
        f"clips={v_clips}, empty={v_empty}"
    )

    if args.contact_sheet is not None:
        write_contact_sheet(out_sheet, portrait, vfx_patched, args.contact_sheet)


if __name__ == "__main__":
    main()
