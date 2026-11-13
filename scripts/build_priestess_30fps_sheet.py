#!/usr/bin/env python3
"""
Builds Seraphina (Priestess — Radiant High Priestess of the Dawn) 30fps HD-2D Sprite Sheet
(6240x1872, 30 cols x 9 rows of 208x208, facing RIGHT +X) using:
- Limb-separated 16-bit HD-2D reference base model: assets/sprites/priestess_v2_base.jpg
- Clean 16-part single-component skeletal segmentation (mane [champagne-blonde flowing hair],
  head [golden sunburst tiara-coronet + forehead circlet + serene face], torso [ivory-and-sapphire
  High Priestess corset-bodice + sapphire brooch], stole [royal-sapphire & gold front stole],
  l_coat, r_coat, l_sode, l_forearm, r_sode, r_forearm, l_thigh, l_shin, l_foot, r_thigh, r_shin, r_foot)
  with inner-leg dark-navy back-cape lining cleanly removed -> ZERO floating scraps between legs!
- Full anatomical joint/limb/coat/stole under-capsules + Area-coverage BOX alpha downsampling
  (downsample_clean_104) + Topological Pinhole Sealer (fill_interior_pinholes_104) ->
  ZERO 1-2px interior pixel holes across all 270 frames (verified automatically at build time)!
- Multi-zone cel-flattening + Strict 20-Color Hand-Crafted Radiant Sanctuary Master Palette +
  2-Pass Cardinal Orphan Despeckle + 1px Selout + Crisp Turquoise-Emerald Eye Reinforcement
- Solid cel-shaded 8-Ray Sacred Ophanim Halo, Portrait-Matched Golden Sunburst Cathedral Scepter,
  and Stained-Glass Benediction Rose Barrier
"""

import os
import sys
import math
import time
from collections import deque
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)
from hd2d_rig_core import compute_bipedal_walk_pose, splice_row2_auto_surgically

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BASE_IMG_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "priestess_v2_base.jpg")
OUT_SHEET_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "priestess_sheet.png")
ARTIFACT_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/3a4b2cf8-05c2-45a3-bb65-af6f5b5a1088"

PRIESTESS_PIVOTS = dict(
    l_hip=(250.0, 250.0), l_knee=(234.0, 344.0), l_ank=(216.0, 454.0),
    r_hip=(286.0, 252.0), r_knee=(286.0, 344.0), r_ank=(283.0, 450.0),
)

CELL = 208
LOGICAL = 104
COLS = 30
ROWS = 9

# Strict 20-Color Hand-Crafted Radiant High Priestess Master Palette
MASTER_PALETTE = np.array([
    # 0-1: Crisp Sanctuary Selective Outlines (Selout) & Eyelash Ink
    [16, 15, 28],     # 0: Deep Sanctuary Indigo-Obsidian Outline & Upper Eyelash
    [54, 38, 36],     # 1: Warm Sepia-Gold Lit Selout
    # 2-4: 3-Step Royal Sapphire Stole, Collar Brooch & Sleeve Trim Ramp
    [26, 48, 128],    # 2: Deep Cathedral Sapphire Shadow
    [42, 86, 188],    # 3: Vivid Royal Sapphire Stole & Bodice Base
    [82, 142, 236],   # 4: Luminous Celestial Azure Highlight
    # 5-8: 4-Step Alabaster-Ivory Vestments, Corset, Coat & Armored Greaves Ramp
    [156, 142, 124],  # 5: Warm Taupe-Alabaster Fold Shadow
    [198, 184, 162],  # 6: Soft Parchment-Ivory Midtone
    [232, 222, 198],  # 7: Lit Alabaster-Cream Sanctuary Vestment
    [250, 246, 228],  # 8: Pure Sunlit Pearl Vestment Highlight
    # 9-11: 3-Step Warm Rose-Porcelain Skin Ramp
    [178, 126, 102],  # 9: Warm Rose-Terracotta Skin Shadow
    [224, 174, 144],  # 10: Smooth Porcelain Skin Midtone
    [248, 212, 186],  # 11: Lit Peach-Porcelain Skin Highlight
    # 12-14: 3-Step Flowing Champagne-Blonde Hair Ramp
    [152, 116, 80],   # 12: Golden-Fawn Hair Shadow
    [206, 174, 132],  # 13: Warm Champagne-Blonde Hair Midtone
    [242, 220, 182],  # 14: Sunlit Platinum-Champagne Hair Highlight
    # 15-17: 3-Step Burnished Sacred-Gold Tiara, Sun-Pauldrons, Filigree & Scepter Ramp
    [134, 88, 26],    # 15: Antique Bronze-Gold Shadow
    [198, 144, 34],   # 16: Rich Imperial Sacred Gold Midtone
    [246, 200, 54],   # 17: Bright Sunburst Tiara & Scepter Gold
    # 18-19: Protected Luminous Eye & Starlight Gleam Accents
    [58, 188, 192],   # 18: Luminous Celestial Turquoise-Emerald Eye Iris
    [255, 252, 224],  # 19: Radiant Diamond-Starlight Nucleus
], dtype=np.int32)

# Pre-bound RGBA tuples for crisp 104x104 Halo, Sunburst Scepter, and Sanctuary FX
P_OUTLINE     = (16, 15, 28, 255)
P_SELOUT      = (54, 38, 36, 255)
P_SAPPH_DARK  = (26, 48, 128, 255)
P_SAPPH_MID   = (42, 86, 188, 255)
P_AZURE_LIT   = (82, 142, 236, 255)
P_IVORY_SHAD  = (156, 142, 124, 255)
P_IVORY_MID   = (198, 184, 162, 255)
P_IVORY_LIT   = (232, 222, 198, 255)
P_PEARL_WHITE = (250, 246, 228, 255)
P_SKIN_SHAD   = (178, 126, 102, 255)
P_SKIN_MID    = (224, 174, 144, 255)
P_HAIR_MID    = (206, 174, 132, 255)
P_GOLD_DARK   = (134, 88, 26, 255)
P_GOLD_MID    = (198, 144, 34, 255)
P_GOLD_LIT    = (246, 200, 54, 255)
P_EYE_AQUA    = (58, 188, 192, 255)
P_STARLIGHT   = (255, 252, 224, 255)


def count_interior_pinholes_104(arr104, max_hole_px=20):
    """Counts any enclosed interior transparent pinholes <= max_hole_px inside the 104x104 silhouette."""
    H, W = arr104.shape[:2]
    a = arr104[:, :, 3] > 128
    ext = np.zeros((H, W), dtype=bool)
    q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if not a[y, x] and not ext[y, x]:
                ext[y, x] = True
                q.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if not a[y, x] and not ext[y, x]:
                ext[y, x] = True
                q.append((y, x))
    while q:
        cy, cx = q.popleft()
        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
            if 0 <= ny < H and 0 <= nx < W and not ext[ny, nx] and not a[ny, nx]:
                ext[ny, nx] = True
                q.append((ny, nx))
    enclosed = (~a) & (~ext)
    if not np.any(enclosed):
        return 0
    vis = np.zeros((H, W), dtype=bool)
    eys, exs = np.where(enclosed)
    pinhole_px = 0
    for sy, sx in zip(eys, exs):
        if vis[sy, sx]:
            continue
        comp = [(sy, sx)]
        vis[sy, sx] = True
        hd = 0
        while hd < len(comp):
            cy, cx = comp[hd]
            hd += 1
            for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                if 0 <= ny < H and 0 <= nx < W and enclosed[ny, nx] and not vis[ny, nx]:
                    vis[ny, nx] = True
                    comp.append((ny, nx))
        if len(comp) <= max_hole_px:
            pinhole_px += len(comp)
    return pinhole_px


def fill_interior_pinholes_104(arr104):
    """
    Seals 100% of 1-2px transparent pinholes, seam tears, and diagonal stair-step slits
    inside Seraphina's 104x104 character body while preserving open spaces between limbs:
    1. Three passes filling any transparent pixel with >= 3 opaque cardinal neighbors.
    2. BFS from border to find true exterior background; fills all enclosed interior pockets <= 22 px!
    """
    out = arr104.copy()
    H, W = out.shape[:2]

    def fill_from_neighbors(buf, target_mask):
        ys, xs = np.where(target_mask)
        for y, x in zip(ys, xs):
            cols = []
            for ny, nx in (
                (y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1),
                (y - 1, x - 1), (y - 1, x + 1), (y + 1, x - 1), (y + 1, x + 1),
            ):
                if 0 <= ny < H and 0 <= nx < W and buf[ny, nx, 3] > 128:
                    cols.append(buf[ny, nx, :3])
            if cols:
                med = np.median(np.array(cols, dtype=np.int32), axis=0).astype(np.uint8)
                buf[y, x] = [med[0], med[1], med[2], 255]

    for _ in range(3):
        a = out[:, :, 3] > 128
        up = np.pad(a[:-1, :], ((1, 0), (0, 0)), constant_values=False)
        dn = np.pad(a[1:, :], ((0, 1), (0, 0)), constant_values=False)
        lf = np.pad(a[:, :-1], ((0, 0), (1, 0)), constant_values=False)
        rt = np.pad(a[:, 1:], ((0, 0), (0, 1)), constant_values=False)
        cnt = up.astype(np.int8) + dn.astype(np.int8) + lf.astype(np.int8) + rt.astype(np.int8)
        slits = (~a) & (cnt >= 3)
        if not np.any(slits):
            break
        fill_from_neighbors(out, slits)

    a = out[:, :, 3] > 128
    ext = np.zeros((H, W), dtype=bool)
    q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if not a[y, x] and not ext[y, x]:
                ext[y, x] = True
                q.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if not a[y, x] and not ext[y, x]:
                ext[y, x] = True
                q.append((y, x))
    while q:
        cy, cx = q.popleft()
        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
            if 0 <= ny < H and 0 <= nx < W and not ext[ny, nx] and not a[ny, nx]:
                ext[ny, nx] = True
                q.append((ny, nx))

    enclosed = (~a) & (~ext)
    if np.any(enclosed):
        visited = np.zeros((H, W), dtype=bool)
        eys, exs = np.where(enclosed)
        to_fill = np.zeros((H, W), dtype=bool)
        for sy, sx in zip(eys, exs):
            if visited[sy, sx]:
                continue
            comp = [(sy, sx)]
            visited[sy, sx] = True
            idx_c = 0
            while idx_c < len(comp):
                cy, cx = comp[idx_c]
                idx_c += 1
                for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                    if 0 <= ny < H and 0 <= nx < W and enclosed[ny, nx] and not visited[ny, nx]:
                        visited[ny, nx] = True
                        comp.append((ny, nx))
            if len(comp) <= 22:
                for py, px in comp:
                    to_fill[py, px] = True

        for _ in range(6):
            rem = to_fill & (out[:, :, 3] <= 128)
            if not np.any(rem):
                break
            fill_from_neighbors(out, rem)

    return out


def downsample_clean_104(win):
    """
    Downsamples the S x S posed RGBA window to 104x104 with ZERO dropped thin tiara spikes/wrists/heels
    and ZERO blurred RGB colors:
    - Uses area-coverage BOX alpha (>= 80) so thin rotated parts never develop pinholes.
    - Uses crisp NEAREST RGB from the closest opaque source pixel.
    """
    a_box = np.array(win.getchannel("A").resize((LOGICAL, LOGICAL), Image.Resampling.BOX))
    solid_104 = a_box >= 80

    near_rgba = np.array(win.resize((LOGICAL, LOGICAL), Image.Resampling.NEAREST))
    out = np.zeros((LOGICAL, LOGICAL, 4), dtype=np.uint8)

    direct = solid_104 & (near_rgba[:, :, 3] > 128)
    out[direct, :3] = near_rgba[direct, :3]
    out[direct, 3] = 255

    need_rgb = solid_104 & (~direct)
    if np.any(need_rgb):
        src = np.array(win)
        for _ in range(2):
            sa = src[:, :, 3] > 128
            for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                shifted = np.roll(src, shift=(dy, dx), axis=(0, 1))
                take = (~sa) & (shifted[:, :, 3] > 128)
                src[take] = shifted[take]
                sa = src[:, :, 3] > 128
        dil_near = np.array(Image.fromarray(src, "RGBA").resize((LOGICAL, LOGICAL), Image.Resampling.NEAREST))
        out[need_rgb, :3] = dil_near[need_rgb, :3]
        out[need_rgb, 3] = 255

    return fill_interior_pinholes_104(out)


def quantize_and_cluster_104(arr104):
    """
    Quantizes all opaque pixels to MASTER_PALETTE, runs 2-pass cardinal orphan despeckling
    (while protecting turquoise eye & starlight gleam indices >= 18), strips tiny exterior crumbs,
    reseals any 1px notches, and applies a crisp 1px Selective Outline (Selout).
    """
    out = fill_interior_pinholes_104(arr104)
    alpha = out[:, :, 3] > 128

    H, W = alpha.shape
    visited = np.zeros((H, W), dtype=bool)
    ys, xs = np.where(alpha)
    for sy, sx in zip(ys, xs):
        if visited[sy, sx]:
            continue
        comp = [(sy, sx)]
        visited[sy, sx] = True
        head = 0
        while head < len(comp):
            cy, cx = comp[head]
            head += 1
            for ny, nx in (
                (cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1),
                (cy - 1, cx - 1), (cy - 1, cx + 1), (cy + 1, cx - 1), (cy + 1, cx + 1),
            ):
                if 0 <= ny < H and 0 <= nx < W and alpha[ny, nx] and not visited[ny, nx]:
                    visited[ny, nx] = True
                    comp.append((ny, nx))
        if len(comp) <= 6:
            for py, px in comp:
                alpha[py, px] = False

    out[~alpha] = [0, 0, 0, 0]
    out[alpha, 3] = 255
    if not np.any(alpha):
        return out

    rgb = out[:, :, :3].astype(np.int32)
    diff = rgb[:, :, None, :] - MASTER_PALETTE[None, None, :, :]
    dist2 = diff[:, :, :, 0] ** 2 * 2 + diff[:, :, :, 1] ** 2 * 3 + diff[:, :, :, 2] ** 2 * 2
    idx_map = np.argmin(dist2, axis=2)
    idx_map[~alpha] = -1

    for pass_i in range(2):
        up = np.pad(idx_map[:-1, :], ((1, 0), (0, 0)), constant_values=-1)
        dn = np.pad(idx_map[1:, :], ((0, 1), (0, 0)), constant_values=-1)
        lf = np.pad(idx_map[:, :-1], ((0, 0), (1, 0)), constant_values=-1)
        rt = np.pad(idx_map[:, 1:], ((0, 0), (0, 1)), constant_values=-1)

        same_cnt = (
            (idx_map == up).astype(np.int8)
            + (idx_map == dn).astype(np.int8)
            + (idx_map == lf).astype(np.int8)
            + (idx_map == rt).astype(np.int8)
        )
        interior = alpha & (up >= 0) & (dn >= 0) & (lf >= 0) & (rt >= 0)
        protect = idx_map >= 17
        orphan = interior & (same_cnt == 0) & (~protect)

        replacement = np.where((up == dn) & (up >= 0), up, np.where((lf == rt) & (lf >= 0), lf, up))
        idx_map = np.where(orphan & (replacement >= 0), replacement, idx_map)

        if pass_i == 1:
            maj_ud = (up == dn) & ((up == lf) | (up == rt)) & (up >= 0)
            maj_lr = (lf == rt) & ((lf == up) | (lf == dn)) & (lf >= 0)
            maj_val = np.where(maj_ud, up, np.where(maj_lr, lf, -1))
            idx_map = np.where(interior & (same_cnt <= 1) & (~protect) & (maj_val >= 0), maj_val, idx_map)

    # Crisp 1px Selective Outline (Selout) on silhouette edges
    up_a = np.pad(alpha[:-1, :], ((1, 0), (0, 0)), constant_values=False)
    dn_a = np.pad(alpha[1:, :], ((0, 1), (0, 0)), constant_values=False)
    lf_a = np.pad(alpha[:, :-1], ((0, 0), (1, 0)), constant_values=False)
    rt_a = np.pad(alpha[:, 1:], ((0, 0), (0, 1)), constant_values=False)
    edge = alpha & (~(up_a & dn_a & lf_a & rt_a))

    is_gleam = idx_map >= 19
    body_edge = edge & (~is_gleam)
    shadow_edge = body_edge & ((~dn_a) | (~rt_a))
    lit_edge = body_edge & (~shadow_edge)
    idx_map[lit_edge] = 1
    idx_map[shadow_edge] = 0

    valid = idx_map >= 0
    out_rgb = MASTER_PALETTE[np.clip(idx_map, 0, len(MASTER_PALETTE) - 1)].astype(np.uint8)
    out[:, :, :3] = np.where(valid[:, :, None], out_rgb, 0)
    return out


def keep_largest_component(mask):
    H, W = mask.shape
    visited = np.zeros((H, W), dtype=bool)
    best_comp = []
    ys, xs = np.where(mask)
    for sy, sx in zip(ys, xs):
        if visited[sy, sx]:
            continue
        comp = [(sy, sx)]
        visited[sy, sx] = True
        head = 0
        while head < len(comp):
            cy, cx = comp[head]
            head += 1
            for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                if 0 <= ny < H and 0 <= nx < W and not visited[ny, nx] and mask[ny, nx]:
                    visited[ny, nx] = True
                    comp.append((ny, nx))
        if len(comp) > len(best_comp):
            best_comp = comp
    out = np.zeros((H, W), dtype=bool)
    if best_comp:
        cy, cx = zip(*best_comp)
        out[cy, cx] = True
    return out


def poly_mask(H, W, pts):
    img = Image.new("L", (W, H), 0)
    ImageDraw.Draw(img).polygon(pts, fill=255)
    return np.array(img) > 128


def load_and_segment_512():
    """
    Loads priestess_v2_base.jpg (1024x1024), removes pure-white exterior & enclosed white pockets
    (without touching warm ivory B<=232 cloth!), strips inner-leg dark-navy back-cape bridges,
    applies multi-zone cel-flattening (MedianFilter size=5 on robes/greaves, size=3 on bodice/tiara),
    and extracts 16 clean single-component parts.
    """
    im = Image.open(BASE_IMG_PATH).convert("RGBA")
    arr = np.array(im)
    H, W = arr.shape[:2]

    r, g, b = arr[:, :, 0].astype(int), arr[:, :, 1].astype(int), arr[:, :, 2].astype(int)
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    white_cand = (r >= 235) & (g >= 235) & (b >= 235) & ((mx - mn) <= 13)
    pure_white = (r >= 250) & (g >= 250) & (b >= 250)

    bg = np.zeros((H, W), dtype=bool)
    q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if white_cand[y, x] and not bg[y, x]:
                bg[y, x] = True
                q.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if white_cand[y, x] and not bg[y, x]:
                bg[y, x] = True
                q.append((y, x))

    vis_pw = np.zeros((H, W), dtype=bool)
    pys, pxs = np.where(pure_white & (~bg))
    for sy, sx in zip(pys, pxs):
        if vis_pw[sy, sx]:
            continue
        comp = [(sy, sx)]
        vis_pw[sy, sx] = True
        hd = 0
        while hd < len(comp):
            cy, cx = comp[hd]
            hd += 1
            for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                if 0 <= ny < H and 0 <= nx < W and not vis_pw[ny, nx] and pure_white[ny, nx]:
                    vis_pw[ny, nx] = True
                    comp.append((ny, nx))
        if len(comp) >= 24:
            for cy, cx in comp:
                if not bg[cy, cx]:
                    bg[cy, cx] = True
                    q.append((cy, cx))

    while q:
        cy, cx = q.popleft()
        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
            if 0 <= ny < H and 0 <= nx < W and not bg[ny, nx] and white_cand[ny, nx]:
                bg[ny, nx] = True
                q.append((ny, nx))

    arr[bg] = [0, 0, 0, 0]

    # 2-pass neutral AA fringe strip on exterior boundary
    for _ in range(2):
        trans = arr[:, :, 3] == 0
        adj = np.zeros_like(trans)
        adj[1:, :] |= trans[:-1, :]
        adj[:-1, :] |= trans[1:, :]
        adj[:, 1:] |= trans[:, :-1]
        adj[:, :-1] |= trans[:, 1:]
        r, g, b = arr[:, :, 0].astype(int), arr[:, :, 1].astype(int), arr[:, :, 2].astype(int)
        fringe = (
            adj
            & (arr[:, :, 3] > 0)
            & (np.minimum(np.minimum(r, g), b) > 215)
            & ((np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)) <= 14)
        )
        arr[fringe] = [0, 0, 0, 0]

    im512 = Image.fromarray(arr, "RGBA").resize((512, 512), Image.Resampling.BILINEAR)
    raw512 = np.array(im512)
    fg = raw512[:, :, 3] > 110
    raw512[~fg] = [0, 0, 0, 0]
    raw512[fg, 3] = 255

    # Multi-zone Cel-Flattening (eliminates AI micro-gradients while keeping face & tiara crisp)
    rgb_pil = Image.fromarray(raw512[:, :, :3], "RGB")
    med3 = np.array(rgb_pil.filter(ImageFilter.MedianFilter(size=3)))
    med5 = np.array(rgb_pil.filter(ImageFilter.MedianFilter(size=5)))

    yy, xx = np.mgrid[0:512, 0:512]
    flat_rgb = med3.copy()
    lower_zone = yy >= 188
    flat_rgb[lower_zone] = med5[lower_zone]
    face_zone = (yy >= 54) & (yy <= 108) & (xx >= 246) & (xx <= 296)
    flat_rgb[face_zone] = raw512[:, :, :3][face_zone]
    raw512[:, :, :3] = np.where(fg[:, :, None], flat_rgb, 0)

    # Strip inner-leg dark-navy back-cape lining between the shins/thighs -> ZERO floating scraps!
    r5, g5, b5 = raw512[:, :, 0].astype(int), raw512[:, :, 1].astype(int), raw512[:, :, 2].astype(int)
    navy_lining = (b5 > r5 + 14) & (r5 < 78) & (g5 < 95)
    inner_gap_navy = (
        fg
        & (xx >= 204)
        & (xx <= 294)
        & (yy >= 260)
        & (yy <= 430)
        & navy_lining
        & (~((xx >= 263) & (xx <= 285) & (yy <= 372)))
    )
    below_stole_dark = (
        fg
        & (xx >= 236)
        & (xx <= 269)
        & (yy >= 371)
        & (yy <= 425)
        & (np.maximum(np.maximum(r5, g5), b5) < 75)
    )
    fg = fg & (~inner_gap_navy) & (~below_stole_dark)
    raw512[~fg] = [0, 0, 0, 0]

    H5, W5 = 512, 512
    part_specs = [
        ("head", [(208, 8), (304, 8), (304, 110), (286, 114), (262, 113), (247, 126), (235, 112), (208, 100)]),
        ("l_sode", [(198, 108), (238, 108), (249, 134), (242, 164), (228, 192), (199, 188)]),
        ("l_forearm", [(198, 186), (223, 190), (217, 238), (219, 266), (208, 282), (195, 272), (196, 240)]),
        ("r_sode", [(284, 114), (306, 118), (309, 145), (313, 190), (296, 194), (296, 174), (303, 162), (294, 140)]),
        ("r_forearm", [(296, 188), (317, 184), (346, 255), (346, 286), (320, 286), (313, 246), (299, 206)]),
        ("torso", [(236, 108), (288, 108), (296, 140), (306, 158), (304, 176), (295, 198), (293, 235), (272, 253), (232, 235), (236, 174)]),
        ("mane", [(130, 68), (242, 68), (236, 108), (204, 118), (201, 190), (200, 265), (130, 265)]),
        ("stole", [(263, 232), (285, 232), (285, 348), (274, 374), (264, 348)]),
        ("l_foot", [(196, 452), (236, 452), (238, 510), (196, 510)]),
        ("l_shin", [(203, 365), (236, 326), (251, 345), (239, 408), (230, 454), (203, 454)]),
        ("l_thigh", [(222, 336), (256, 240), (264, 244), (264, 338), (248, 355), (222, 352)]),
        ("r_foot", [(264, 446), (302, 446), (326, 506), (264, 506)]),
        ("r_shin", [(266, 366), (284, 332), (299, 336), (298, 405), (296, 450), (268, 450)]),
        ("r_thigh", [(284, 244), (295, 268), (297, 348), (284, 352)]),
        ("l_coat", [(216, 204), (258, 234), (255, 250), (222, 345), (206, 424), (182, 464), (138, 412), (176, 320), (212, 240)]),
        ("r_coat", [(288, 218), (300, 210), (326, 305), (352, 432), (328, 466), (318, 426), (296, 412), (297, 336), (293, 266)]),
    ]

    claimed = np.zeros((H5, W5), dtype=bool)
    parts = {}
    for name, pts in part_specs:
        raw_m = fg & poly_mask(H5, W5, pts) & (~claimed)
        m = keep_largest_component(raw_m)
        claimed |= m
        ys, xs = np.where(m)
        if len(ys) == 0:
            parts[name] = (Image.new("RGBA", (1, 1), (0, 0, 0, 0)), 0, 0)
            continue
        y0, y1 = int(ys.min()), int(ys.max()) + 1
        x0, x1 = int(xs.min()), int(xs.max()) + 1
        buf = np.zeros((y1 - y0, x1 - x0, 4), dtype=np.uint8)
        sub_m = m[y0:y1, x0:x1]
        buf[sub_m] = raw512[y0:y1, x0:x1][sub_m]
        parts[name] = (Image.fromarray(buf, "RGBA"), x0, y0)

    # Upgrade r_thigh (occluded behind stole in 3/4 base stance) using shaded l_thigh contour
    # so forward/backward rear-leg strides have full cel-shaded volume matching l_thigh!
    lt_im, lt_x0, lt_y0 = parts["l_thigh"]
    if lt_im.size != (1, 1):
        lt_rot = lt_im.rotate(13.0, resample=Image.Resampling.BICUBIC, expand=True)
        rt_arr = np.array(lt_rot)
        rt_m = rt_arr[:, :, 3] > 128
        rt_arr[~rt_m] = [0, 0, 0, 0]
        # Subtle 0.91x warm depth shade so rear thigh reads naturally behind front thigh
        rt_arr[rt_m, 0] = np.clip(rt_arr[rt_m, 0].astype(np.float32) * 0.92, 0, 255).astype(np.uint8)
        rt_arr[rt_m, 1] = np.clip(rt_arr[rt_m, 1].astype(np.float32) * 0.90, 0, 255).astype(np.uint8)
        rt_arr[rt_m, 2] = np.clip(rt_arr[rt_m, 2].astype(np.float32) * 0.89, 0, 255).astype(np.uint8)
        rt_ys, rt_xs = np.where(rt_m)
        if len(rt_ys) > 0:
            ry0, ry1 = int(rt_ys.min()), int(rt_ys.max()) + 1
            rx0, rx1 = int(rt_xs.min()), int(rt_xs.max()) + 1
            rt_crop = Image.fromarray(rt_arr[ry0:ry1, rx0:rx1], "RGBA")
            parts["r_thigh"] = (rt_crop, 286 - rt_crop.size[0] // 2, 246)

    dropped = int((fg & (~claimed)).sum())
    print(f"[Seraphina 512x512 Segmentation] {len(parts)} clean 1-component parts extracted, dropped stray pixels: {dropped}")

    # Save debug parts inspection sheet
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    psheet = Image.new("RGBA", (4 * 160, 4 * 180), (20, 18, 30, 255))
    pd = ImageDraw.Draw(psheet)
    for idx, (name, _) in enumerate(part_specs):
        im_p, _, _ = parts[name]
        gx, gy = (idx % 4) * 160, (idx // 4) * 180
        pd.rectangle([gx, gy, gx + 158, gy + 178], outline=(68, 66, 94, 255))
        pd.text((gx + 6, gy + 4), name, fill=(254, 240, 138, 255))
        cw, ch = im_p.size
        sc = min(140.0 / max(1, cw), 145.0 / max(1, ch), 1.0)
        thumb = im_p.resize((max(1, int(cw * sc)), max(1, int(ch * sc))), Image.Resampling.NEAREST)
        psheet.alpha_composite(thumb, (gx + (160 - thumb.size[0]) // 2, gy + 24 + (150 - thumb.size[1]) // 2))
    psheet.save(os.path.join(ARTIFACT_DIR, "debug_priestess_v2_parts.png"))
    return parts


def rot_pt(pt, pivot, deg):
    rad = math.radians(deg)
    c, s = math.cos(rad), math.sin(rad)
    dx, dy = pt[0] - pivot[0], pt[1] - pivot[1]
    return (pivot[0] + dx * c - dy * s, pivot[1] + dx * s + dy * c)


def paste_rotated_part(canvas, part_tuple, src_pivot, dst_pivot, deg):
    im_p, x0, y0 = part_tuple
    if im_p.size == (1, 1):
        return
    pad = int(math.ceil(math.hypot(im_p.size[0], im_p.size[1]))) + 8
    tmp = Image.new("RGBA", (pad * 2, pad * 2), (0, 0, 0, 0))
    loc_x = int(round(pad - (src_pivot[0] - x0)))
    loc_y = int(round(pad - (src_pivot[1] - y0)))
    tmp.paste(im_p, (loc_x, loc_y))
    if abs(deg) > 0.05:
        tmp = tmp.rotate(-deg, resample=Image.Resampling.BICUBIC, center=(pad, pad))
    dst_x = int(round(dst_pivot[0] - pad))
    dst_y = int(round(dst_pivot[1] - pad))
    canvas.alpha_composite(tmp, (dst_x, dst_y))


def draw_joint_cap(draw, pt, r, fill, inner=None):
    x, y = pt
    draw.ellipse([x - r, y - r, x + r, y + r], fill=fill)
    if inner is not None and r > 3:
        ir = r * 0.65
        draw.ellipse([x - ir, y - ir, x + ir, y + ir], fill=inner)


def draw_capsule(draw, p0, p1, r, fill):
    draw.line([p0, p1], fill=fill, width=int(round(r * 2)))
    draw.ellipse([p0[0] - r, p0[1] - r, p0[0] + r, p0[1] + r], fill=fill)
    draw.ellipse([p1[0] - r, p1[1] - r, p1[0] + r, p1[1] + r], fill=fill)


def put_px(arr, x, y, col):
    ix, iy = int(round(x)), int(round(y))
    if 4 <= ix < LOGICAL - 4 and 4 <= iy < LOGICAL - 4:
        arr[iy, ix] = col


def stamp_seraphina_eyes_104(arr, l_eye_104, r_eye_104, head_deg, blink=False):
    """
    Reinforces Seraphina's serene, luminous turquoise-emerald eyes (with delicate dark upper lash)
    at exact transformed head coordinates in 104x104 so 5.54x downsampling never loses facial clarity.
    """
    if abs(head_deg) > 58.0:
        return

    for idx, (ex, ey) in enumerate((l_eye_104, r_eye_104)):
        ix, iy = int(round(ex)), int(round(ey))
        if not (8 <= ix <= 95 and 6 <= iy <= 95):
            continue
        # Only stamp inside opaque head region
        if arr[iy, ix, 3] == 0:
            continue
        if blink:
            # Serene closed prayer eyelashes
            put_px(arr, ix, iy, P_OUTLINE)
            if idx == 0:
                put_px(arr, ix - 1, iy, P_SELOUT)
        else:
            # Crisp dark upper lash + luminous celestial turquoise-emerald iris
            put_px(arr, ix, iy - 1, P_OUTLINE)
            put_px(arr, ix, iy, P_EYE_AQUA)
            if idx == 0:
                put_px(arr, ix - 1, iy - 1, P_OUTLINE)


def draw_sacred_ophanim_halo_104(arr, cx, cy, phase=0.0, mode="off"):
    """
    Renders a centered Celestial Sapphire-and-Gold Nimbus symmetrically behind Seraphina's
    Sunburst Crown during peak consecration ('flare') and Ultimate ('apotheosis') moments,
    without competing cog-spikes or offset shoulder rings during normal stances.
    """
    if mode in ("off", "normal", "swept"):
        return

    is_ult = mode == "apotheosis"
    r_ring = 13.6 if is_ult else 11.8
    x_min = max(5, int(math.floor(cx - (r_ring + 3.0))))
    x_max = min(98, int(math.ceil(cx + (r_ring + 3.0))))
    y_min = max(5, int(math.floor(cy - (r_ring + 3.0))))
    y_max = min(98, int(math.ceil(cy + (r_ring + 3.0))))

    for yy in range(y_min, y_max + 1):
        for xx in range(x_min, x_max + 1):
            dx = xx - cx
            dy = yy - cy
            d = math.hypot(dx, dy)
            if abs(d - r_ring) <= 1.25:
                if abs(d - r_ring) <= 0.55:
                    arr[yy, xx] = P_STARLIGHT if is_ult else P_GOLD_LIT
                else:
                    arr[yy, xx] = P_GOLD_MID if d < r_ring else P_OUTLINE
            elif is_ult and abs(d - (r_ring - 2.4)) <= 0.85:
                arr[yy, xx] = P_AZURE_LIT


def draw_sunburst_scepter_104(arr, hand_x, hand_y, scepter_deg, staff_len=26.0, pom_len=14.0, glow=1.0, phase=0.0):
    """
    Renders Seraphina's Portrait-Matched Sacred Sunburst Cathedral Scepter:
    - Solid 3px cel-shaded burnished-gold shaft with royal-sapphire grip rings (1px Selout + 1px gold core)
    - Golden Cathedral Calyx + 8-Ray Sunburst Head + Glowing Diamond-Starlight Nucleus!
    Returns (hcx, hcy) coordinates of the Sunburst Scepter Head nucleus.
    """
    rad = math.radians(scepter_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    nx, ny = -uy, ux

    # Clamp scepter head inside safe frame [9..94]
    head_pad = 6.0
    max_fwd = staff_len
    if ux > 0.05:
        max_fwd = min(max_fwd, (94.0 - head_pad - hand_x) / ux)
    elif ux < -0.05:
        max_fwd = min(max_fwd, (9.0 + head_pad - hand_x) / ux)
    if uy > 0.05:
        max_fwd = min(max_fwd, (96.0 - head_pad - hand_y) / uy)
    elif uy < -0.05:
        max_fwd = min(max_fwd, (9.0 + head_pad - hand_y) / uy)
    eff_len = max(12.0, max_fwd)

    max_back = pom_len
    if -ux > 0.05:
        max_back = min(max_back, (94.0 - hand_x) / (-ux))
    elif -ux < -0.05:
        max_back = min(max_back, (9.0 - hand_x) / (-ux))
    if -uy > 0.05:
        max_back = min(max_back, (98.0 - hand_y) / (-uy))
    elif -uy < -0.05:
        max_back = min(max_back, (9.0 - hand_y) / (-uy))
    eff_pom = max(4.0, max_back)

    steps = int(round((eff_len + eff_pom) * 2.5))
    # Pass 1: Crisp dark shaft border
    for i in range(steps + 1):
        d = -eff_pom + (eff_len + eff_pom) * (i / float(max(1, steps)))
        if d > eff_len - 4.2:
            continue
        px = hand_x + ux * d
        py = hand_y + uy * d
        put_px(arr, px + nx * 1.0, py + ny * 1.0, P_OUTLINE)
        put_px(arr, px - nx * 1.0, py - ny * 1.0, P_GOLD_DARK)
    # Pass 2: Bright golden shaft core with sapphire grip accents
    for i in range(steps + 1):
        d = -eff_pom + (eff_len + eff_pom) * (i / float(max(1, steps)))
        if d > eff_len - 4.2:
            continue
        px = hand_x + ux * d
        py = hand_y + uy * d
        if abs(d) < 1.8:
            put_px(arr, px, py, P_SAPPH_MID)
        elif int(round(d)) % 6 == 0:
            put_px(arr, px, py, P_STARLIGHT)
        else:
            put_px(arr, px, py, P_GOLD_LIT)

    # Pommel sapphire jewel
    bx = hand_x - ux * eff_pom
    by = hand_y - uy * eff_pom
    for dy_p in (-1, 0, 1):
        for dx_p in (-1, 0, 1):
            if abs(dx_p) + abs(dy_p) <= 1:
                put_px(arr, bx + dx_p, by + dy_p, P_AZURE_LIT if (dx_p == 0 and dy_p == 0) else P_OUTLINE)

    # Ornate 8-Ray Sunburst Scepter Head (matching portrait_hd2d_priestess_v2!)
    hcx = hand_x + ux * (eff_len - 0.8)
    hcy = hand_y + uy * (eff_len - 0.8)
    r_head = 4.2
    ray_len = 3.2 if glow > 1.15 else 2.5

    # 8 Sunburst Spikes around scepter ring
    for k in range(8):
        ang = rad + k * (math.pi / 4.0)
        rl = ray_len if k % 2 == 0 else ray_len * 0.68
        ca, sa = math.cos(ang), math.sin(ang)
        for st in range(1, int(math.ceil(rl * 2.5)) + 1):
            rr = r_head - 0.5 + (st / 2.5)
            rx_p = hcx + ca * rr
            ry_p = hcy + sa * rr
            for ox, oy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                ix, iy = int(round(rx_p)) + ox, int(round(ry_p)) + oy
                if 5 <= ix <= 98 and 5 <= iy <= 98 and arr[iy, ix, 3] == 0:
                    arr[iy, ix] = P_OUTLINE
            put_px(arr, rx_p, ry_p, P_STARLIGHT if st == 1 else P_GOLD_LIT)

    # Sunburst Ring & Glowing Starlight Core
    for dy_h in range(-5, 6):
        for dx_h in range(-5, 6):
            d = math.hypot(dx_h, dy_h)
            if abs(d - r_head) <= 1.25:
                put_px(arr, hcx + dx_h, hcy + dy_h, P_GOLD_LIT if abs(d - r_head) <= 0.65 else P_GOLD_DARK)
            elif d < r_head - 1.0:
                if d <= 1.5:
                    put_px(arr, hcx + dx_h, hcy + dy_h, P_STARLIGHT)
                elif d <= 2.6 and glow > 0.7:
                    put_px(arr, hcx + dx_h, hcy + dy_h, P_GOLD_LIT)

    return (hcx, hcy)


def draw_prayer_orb_104(arr, hx, hy, radius=2.6, phase=0.0):
    if radius <= 0.4:
        return
    r_int = int(math.ceil(radius + 1.5))
    for dy in range(-r_int, r_int + 1):
        for dx in range(-r_int, r_int + 1):
            d = math.hypot(dx, dy)
            if d <= radius * 0.48:
                put_px(arr, hx + dx, hy + dy, P_STARLIGHT)
            elif d <= radius * 0.85:
                put_px(arr, hx + dx, hy + dy, P_GOLD_LIT)
            elif d <= radius + 0.55:
                put_px(arr, hx + dx, hy + dy, P_AZURE_LIT if (dx + dy) % 2 == 0 else P_GOLD_MID)


def draw_scepter_starburst_flare_104(arr, hcx, hcy, intensity=1.0, phase=0.0):
    """
    Renders a crisp, unmistakable 4-Point Cathedral Cross-Star Flare + Celestial Ring
    radiating directly from the Sunburst Scepter's jewel nucleus during active Holy Casts
    (reads purely as Radiant Divine Magic rather than a melee crescent blade!).
    """
    if intensity <= 0.08:
        return

    # Luminous sapphire-gold outer nimbus ring around the scepter head
    r_aura = 6.2 + 2.2 * intensity
    for yy in range(max(5, int(hcy - r_aura - 2)), min(98, int(hcy + r_aura + 3))):
        for xx in range(max(5, int(hcx - r_aura - 2)), min(98, int(hcx + r_aura + 3))):
            d = math.hypot(xx - hcx, yy - hcy)
            if abs(d - r_aura) <= 0.75:
                if arr[yy, xx, 3] == 0:
                    arr[yy, xx] = P_AZURE_LIT if ((xx + yy) % 2 == 0) else P_GOLD_LIT

    # Crisp 4-Point Cardinal Cathedral Cross-Star + 4 shorter diagonal glints
    arm_card = int(round(6.0 + 5.5 * intensity))
    arm_diag = int(round(3.0 + 3.0 * intensity))
    for dx, dy, length in (
        (1, 0, arm_card), (-1, 0, arm_card), (0, -1, arm_card), (0, 1, arm_card),
        (1, 1, arm_diag), (1, -1, arm_diag), (-1, 1, arm_diag), (-1, -1, arm_diag),
    ):
        for s in range(1, length + 1):
            px = int(round(hcx)) + dx * s
            py = int(round(hcy)) + dy * s
            if not (6 <= px <= 97 and 6 <= py <= 97):
                continue
            u = s / float(max(1, length))
            col = P_STARLIGHT if u < 0.55 else (P_GOLD_LIT if u < 0.85 else P_AZURE_LIT)
            arr[py, px] = col
            if s <= 2 and (dx == 0 or dy == 0):
                # Slight 3px diamond waist near center
                if dx != 0:
                    put_px(arr, px, py - 1, P_GOLD_LIT)
                    put_px(arr, px, py + 1, P_GOLD_LIT)
                else:
                    put_px(arr, px - 1, py, P_GOLD_LIT)
                    put_px(arr, px + 1, py, P_GOLD_LIT)


def render_pose_104(parts, cfg):
    """
    Renders a single 104x104 logical frame from Seraphina's 512x512 16-part rig
    with full anatomical under-capsules, area-coverage anti-pinhole downsampling,
    and crisp 20-color cel clustering. Returns (final_comp_104, body_pinhole_count).
    """
    canvas = Image.new("RGBA", (650, 600), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    OX, OY = 48, 44

    pelvis_src = (268.0, 236.0)
    pelvis_dst = (268.0 + OX + cfg.get("pelvis_dx", 0.0) * 0.5, 236.0 + OY + cfg.get("pelvis_dy", 0.0) * 0.5)
    torso_deg = cfg.get("torso_deg", 0.0)
    head_deg = torso_deg + cfg.get("head_rel_deg", 0.0)
    mane_deg = head_deg + cfg.get("mane_rel_deg", 0.0)

    def torso_joint(pt):
        r = rot_pt(pt, pelvis_src, torso_deg)
        return (pelvis_dst[0] + (r[0] - pelvis_src[0]), pelvis_dst[1] + (r[1] - pelvis_src[1]))

    neck_src = (264.0, 114.0)
    neck_dst = torso_joint(neck_src)

    def head_joint(pt):
        r = rot_pt(pt, neck_src, head_deg)
        return (neck_dst[0] + (r[0] - neck_src[0]), neck_dst[1] + (r[1] - neck_src[1]))

    mane_src = (224.0, 92.0)
    mane_dst = head_joint(mane_src)
    l_eye_dst = head_joint((267.5, 80.8))
    r_eye_dst = head_joint((283.0, 81.2))

    back_halo_dst = head_joint((262.0, 68.0))

    stole_src = (273.0, 240.0)
    stole_dst = torso_joint(stole_src)
    l_coat_src = (242.0, 228.0)
    l_coat_dst = torso_joint(l_coat_src)
    r_coat_src = (292.0, 228.0)
    r_coat_dst = torso_joint(r_coat_src)

    l_sh_src = (222.0, 134.0)
    l_sh_dst = torso_joint(l_sh_src)
    r_sh_src = (296.0, 138.0)
    r_sh_dst = torso_joint(r_sh_src)

    l_hip_src = (250.0, 250.0)
    l_hip_base = torso_joint(l_hip_src)
    l_hip_dst = (
        l_hip_base[0] + cfg.get("l_hip_dx", 0.0),
        l_hip_base[1] + cfg.get("l_hip_dy", 0.0),
    )
    r_hip_src = (286.0, 252.0)
    r_hip_base = torso_joint(r_hip_src)
    r_hip_dst = (
        r_hip_base[0] + cfg.get("r_hip_dx", 0.0),
        r_hip_base[1] + cfg.get("r_hip_dy", 0.0),
    )

    l_thigh_deg = cfg.get("l_thigh_deg", 0.0)
    l_shin_deg = cfg.get("l_shin_deg", 0.0)
    l_foot_deg = cfg.get("l_foot_deg", 0.0)
    l_knee_src = (234.0, 344.0)
    l_knee_r = rot_pt(l_knee_src, l_hip_src, l_thigh_deg)
    l_knee_dst = (l_hip_dst[0] + (l_knee_r[0] - l_hip_src[0]), l_hip_dst[1] + (l_knee_r[1] - l_hip_src[1]))
    l_ank_src = (216.0, 454.0)
    l_ank_r = rot_pt(l_ank_src, l_knee_src, l_shin_deg)
    l_ank_dst = (l_knee_dst[0] + (l_ank_r[0] - l_knee_src[0]), l_knee_dst[1] + (l_ank_r[1] - l_knee_src[1]))

    r_thigh_deg = cfg.get("r_thigh_deg", 0.0)
    r_shin_deg = cfg.get("r_shin_deg", 0.0)
    r_foot_deg = cfg.get("r_foot_deg", 0.0)
    r_knee_src = (286.0, 344.0)
    r_knee_r = rot_pt(r_knee_src, r_hip_src, r_thigh_deg)
    r_knee_dst = (r_hip_dst[0] + (r_knee_r[0] - r_hip_src[0]), r_hip_dst[1] + (r_knee_r[1] - r_hip_src[1]))
    r_ank_src = (283.0, 450.0)
    r_ank_r = rot_pt(r_ank_src, r_knee_src, r_shin_deg)
    r_ank_dst = (r_knee_dst[0] + (r_ank_r[0] - r_knee_src[0]), r_knee_dst[1] + (r_ank_r[1] - r_knee_src[1]))

    l_sode_deg = torso_deg + cfg.get("l_sode_rel_deg", 0.0)
    l_fore_deg = l_sode_deg + cfg.get("l_fore_rel_deg", 0.0)
    l_elb_src = (211.0, 190.0)
    l_elb_r = rot_pt(l_elb_src, l_sh_src, l_sode_deg)
    l_elb_dst = (l_sh_dst[0] + (l_elb_r[0] - l_sh_src[0]), l_sh_dst[1] + (l_elb_r[1] - l_sh_src[1]))
    l_hand_src = (206.0, 260.0)
    l_hand_r = rot_pt(l_hand_src, l_elb_src, l_fore_deg)
    l_hand_dst = (l_elb_dst[0] + (l_hand_r[0] - l_elb_src[0]), l_elb_dst[1] + (l_hand_r[1] - l_elb_src[1]))

    r_sode_deg = torso_deg + cfg.get("r_sode_rel_deg", 0.0)
    r_fore_deg = r_sode_deg + cfg.get("r_fore_rel_deg", 0.0)
    r_elb_src = (306.0, 192.0)
    r_elb_r = rot_pt(r_elb_src, r_sh_src, r_sode_deg)
    r_elb_dst = (r_sh_dst[0] + (r_elb_r[0] - r_sh_src[0]), r_sh_dst[1] + (r_elb_r[1] - r_sh_src[1]))
    r_hand_src = (330.0, 260.0)
    r_hand_r = rot_pt(r_hand_src, r_elb_src, r_fore_deg)
    r_hand_dst = (r_elb_dst[0] + (r_hand_r[0] - r_elb_src[0]), r_elb_dst[1] + (r_hand_r[1] - r_elb_src[1]))

    l_coat_deg = cfg.get("l_coat_deg")
    if l_coat_deg is None:
        l_coat_deg = torso_deg * 0.65 + max(0.0, l_thigh_deg) * 0.70 - min(0.0, l_thigh_deg) * 0.25 + (cfg.get("coat_billow") or 0.0)
    r_coat_deg = cfg.get("r_coat_deg")
    if r_coat_deg is None:
        r_coat_deg = torso_deg * 0.65 + min(0.0, r_thigh_deg) * 0.68 + max(0.0, r_thigh_deg) * 0.35 - (cfg.get("coat_billow") or 0.0) * 0.72
    stole_deg = cfg.get("stole_deg")
    if stole_deg is None:
        stole_deg = torso_deg * 0.60 + 0.45 * (l_thigh_deg + r_thigh_deg) + (cfg.get("coat_billow") or 0.0) * 0.25

    l_coat_mid_r = rot_pt((196.0, 360.0), l_coat_src, l_coat_deg)
    l_coat_mid_dst = (l_coat_dst[0] + (l_coat_mid_r[0] - l_coat_src[0]), l_coat_dst[1] + (l_coat_mid_r[1] - l_coat_src[1]))
    r_coat_mid_r = rot_pt((322.0, 366.0), r_coat_src, r_coat_deg)
    r_coat_mid_dst = (r_coat_dst[0] + (r_coat_mid_r[0] - r_coat_src[0]), r_coat_dst[1] + (r_coat_mid_r[1] - r_coat_src[1]))
    stole_mid_r = rot_pt((274.0, 336.0), stole_src, stole_deg)
    stole_mid_dst = (stole_dst[0] + (stole_mid_r[0] - stole_src[0]), stole_dst[1] + (stole_mid_r[1] - stole_src[1]))
    mane_mid_r = rot_pt((182.0, 186.0), mane_src, mane_deg)
    mane_mid_dst = (mane_dst[0] + (mane_mid_r[0] - mane_src[0]), mane_dst[1] + (mane_mid_r[1] - mane_src[1]))

    # 0. Hair under-bridge BEHIND torso/shoulders
    draw_capsule(draw, head_joint((232.0, 88.0)), mane_dst, 12, fill=P_HAIR_MID)
    draw_capsule(draw, mane_dst, mane_mid_dst, 11, fill=P_HAIR_MID)
    paste_rotated_part(canvas, parts["mane"], mane_src, mane_dst, mane_deg)

    # Complete anatomical joint & limb under-capsules (seals 100% of joint rotation seams!)
    draw_capsule(draw, neck_dst, pelvis_dst, 22, fill=P_IVORY_LIT)
    draw_capsule(draw, pelvis_dst, l_hip_dst, 18, fill=P_IVORY_MID)
    draw_capsule(draw, pelvis_dst, r_hip_dst, 18, fill=P_IVORY_MID)
    draw_capsule(draw, l_hip_dst, l_knee_dst, 14, fill=P_SKIN_MID)
    draw_capsule(draw, r_hip_dst, r_knee_dst, 13, fill=P_SKIN_MID)
    draw_capsule(draw, l_knee_dst, l_ank_dst, 12, fill=P_IVORY_LIT)
    draw_capsule(draw, r_knee_dst, r_ank_dst, 12, fill=P_IVORY_LIT)
    draw_joint_cap(draw, l_knee_dst, 13, fill=P_GOLD_MID, inner=P_IVORY_LIT)
    draw_joint_cap(draw, r_knee_dst, 13, fill=P_GOLD_MID, inner=P_IVORY_LIT)
    draw_joint_cap(draw, l_ank_dst, 10, fill=P_IVORY_MID, inner=P_IVORY_LIT)
    draw_joint_cap(draw, r_ank_dst, 10, fill=P_IVORY_MID, inner=P_IVORY_LIT)
    draw_joint_cap(draw, neck_dst, 15, fill=P_SKIN_MID, inner=P_SKIN_MID)

    draw_capsule(draw, l_coat_dst, l_coat_mid_dst, 11, fill=P_IVORY_LIT)
    draw_capsule(draw, r_coat_dst, r_coat_mid_dst, 9, fill=P_IVORY_LIT)
    draw_capsule(draw, stole_dst, stole_mid_dst, 8, fill=P_SAPPH_MID)

    draw_joint_cap(draw, r_sh_dst, 13, fill=P_GOLD_MID, inner=P_GOLD_LIT)
    draw_capsule(draw, r_sh_dst, r_elb_dst, 11, fill=P_SKIN_MID)
    draw_capsule(draw, r_elb_dst, r_hand_dst, 9, fill=P_IVORY_LIT)
    draw_joint_cap(draw, r_elb_dst, 10, fill=P_GOLD_MID, inner=P_IVORY_LIT)

    # 1. Right arm (when behind torso)
    if not cfg.get("right_arm_in_front", False):
        paste_rotated_part(canvas, parts["r_sode"], r_sh_src, r_sh_dst, r_sode_deg)
        paste_rotated_part(canvas, parts["r_forearm"], r_elb_src, r_elb_dst, r_fore_deg)

    # 2. Back coat panel + Articulated 3-segment legs + Front Sapphire Stole + Left Coat Panel
    paste_rotated_part(canvas, parts["r_coat"], r_coat_src, r_coat_dst, r_coat_deg)

    if cfg.get("right_leg_behind", False):
        paste_rotated_part(canvas, parts["r_thigh"], r_hip_src, r_hip_dst, r_thigh_deg)
        paste_rotated_part(canvas, parts["r_foot"], r_ank_src, r_ank_dst, r_foot_deg)
        paste_rotated_part(canvas, parts["r_shin"], r_knee_src, r_knee_dst, r_shin_deg)

        paste_rotated_part(canvas, parts["l_thigh"], l_hip_src, l_hip_dst, l_thigh_deg)
        paste_rotated_part(canvas, parts["l_foot"], l_ank_src, l_ank_dst, l_foot_deg)
        paste_rotated_part(canvas, parts["l_shin"], l_knee_src, l_knee_dst, l_shin_deg)
    else:
        paste_rotated_part(canvas, parts["l_thigh"], l_hip_src, l_hip_dst, l_thigh_deg)
        paste_rotated_part(canvas, parts["l_foot"], l_ank_src, l_ank_dst, l_foot_deg)
        paste_rotated_part(canvas, parts["l_shin"], l_knee_src, l_knee_dst, l_shin_deg)

        paste_rotated_part(canvas, parts["r_thigh"], r_hip_src, r_hip_dst, r_thigh_deg)
        paste_rotated_part(canvas, parts["r_foot"], r_ank_src, r_ank_dst, r_foot_deg)
        paste_rotated_part(canvas, parts["r_shin"], r_knee_src, r_knee_dst, r_shin_deg)

    paste_rotated_part(canvas, parts["stole"], stole_src, stole_dst, stole_deg)
    paste_rotated_part(canvas, parts["l_coat"], l_coat_src, l_coat_dst, l_coat_deg)

    # 3. Fitted Ivory-and-Sapphire Corset Torso + Sunburst Tiara Head
    paste_rotated_part(canvas, parts["torso"], pelvis_src, pelvis_dst, torso_deg)
    paste_rotated_part(canvas, parts["head"], neck_src, neck_dst, head_deg)

    # 4. Right arm (when in front of torso for forward Sunburst Scepter thrusts / Sanctuary slams)
    if cfg.get("right_arm_in_front", False):
        draw_joint_cap(draw, r_sh_dst, 13, fill=P_GOLD_MID, inner=P_GOLD_LIT)
        draw_capsule(draw, r_sh_dst, r_elb_dst, 10, fill=P_SKIN_MID)
        draw_capsule(draw, r_elb_dst, r_hand_dst, 9, fill=P_IVORY_LIT)
        paste_rotated_part(canvas, parts["r_sode"], r_sh_src, r_sh_dst, r_sode_deg)
        paste_rotated_part(canvas, parts["r_forearm"], r_elb_src, r_elb_dst, r_fore_deg)

    # 5. Left Sun-Pauldron, Upper Arm & Prayer Bracer
    draw_capsule(draw, l_sh_dst, l_elb_dst, 11, fill=P_SKIN_MID)
    draw_capsule(draw, l_elb_dst, l_hand_dst, 9, fill=P_IVORY_LIT)
    draw_joint_cap(draw, l_elb_dst, 10, fill=P_GOLD_MID, inner=P_IVORY_LIT)
    paste_rotated_part(canvas, parts["l_sode"], l_sh_src, l_sh_dst, l_sode_deg)
    paste_rotated_part(canvas, parts["l_forearm"], l_elb_src, l_elb_dst, l_fore_deg)

    # Constant-scale framing from 650x600 canvas to 104x104
    S = 576
    scale = 104.0 / S
    cx = 268.0 + OX
    y_bot = 507.0 + OY
    crop_x0 = int(round(cx - S * 0.50))
    crop_y0 = int(round(y_bot - S * (99.0 / 104.0)))

    bbox = canvas.getbbox()
    c_xmin = float(bbox[0]) if bbox else float(cx)
    c_ymin = float(bbox[1]) if bbox else float(y_bot - 200.0)
    c_xmax = float(bbox[2]) if bbox else float(cx)
    c_ymax = float(bbox[3]) if bbox else float(y_bot)

    halo_mode = cfg.get("halo_mode", "off")
    if halo_mode in ("flare", "apotheosis"):
        h_pad = 86.0
        c_xmin = min(c_xmin, back_halo_dst[0] - h_pad)
        c_ymin = min(c_ymin, back_halo_dst[1] - h_pad)

    if cfg.get("show_staff", True):
        hand_c = r_hand_dst if cfg.get("staff_hand", "right") == "right" else l_hand_dst
        s_rad = math.radians(cfg.get("staff_deg", -52.0))
        s_len = cfg.get("staff_len", 26.0)
        p_len = cfg.get("staff_pom_len", 14.0)
        tip_cx = hand_c[0] + math.cos(s_rad) * ((s_len + 5.0) / scale)
        tip_cy = hand_c[1] + math.sin(s_rad) * ((s_len + 5.0) / scale)
        pom_cx = hand_c[0] - math.cos(s_rad) * ((p_len + 1.0) / scale)
        pom_cy = hand_c[1] - math.sin(s_rad) * ((p_len + 1.0) / scale)
        c_xmin = min(c_xmin, tip_cx - 16.0, pom_cx - 12.0)
        c_xmax = max(c_xmax, tip_cx + 16.0, pom_cx + 12.0)
        c_ymin = min(c_ymin, tip_cy - 16.0, pom_cy - 12.0)
        c_ymax = max(c_ymax, tip_cy + 16.0, pom_cy + 12.0)

    min_104 = (c_xmin - crop_x0) * scale
    max_104 = (c_xmax - crop_x0) * scale
    span_104 = max_104 - min_104
    if span_104 > 90.0:
        S = int(round((c_xmax - c_xmin) / (89.0 / 104.0)))
        scale = 104.0 / S
        crop_x0 = int(round(0.5 * (c_xmin + c_xmax) - S * 0.50))
        crop_y0 = int(round(y_bot - S * (99.0 / 104.0)))
    elif max_104 > 97.0:
        crop_x0 += int(round((max_104 - 97.0) / scale))
    elif min_104 < 6.0:
        crop_x0 += int(round((min_104 - 6.0) / scale))

    win = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    win.paste(canvas, (-crop_x0, -crop_y0))
    arr104 = downsample_clean_104(win)

    def to104(pt):
        return ((pt[0] - crop_x0) * scale, (pt[1] - crop_y0) * scale)

    neck_104 = to104(neck_dst)
    back_halo_104 = to104(back_halo_dst)
    l_hand_104 = to104(l_hand_dst)
    r_hand_104 = to104(r_hand_dst)
    l_eye_104 = to104(l_eye_dst)
    r_eye_104 = to104(r_eye_dst)

    ys, xs = np.where(arr104[:, :, 3] > 0)
    dy_ground = 0
    if len(ys) > 0:
        cur_bot = int(ys.max())
        cur_top = int(ys.min())
        target_bot = int(round(cfg.get("foot_y", 99.0)))
        dy_ground = target_bot - cur_bot
        if cur_top + dy_ground < 5:
            dy_ground = 5 - cur_top
        if dy_ground != 0:
            shifted = np.zeros_like(arr104)
            y_src0 = max(0, -dy_ground)
            y_src1 = min(104, 104 - dy_ground)
            y_dst0 = max(0, dy_ground)
            y_dst1 = min(104, 104 + dy_ground)
            if y_src1 > y_src0:
                shifted[y_dst0:y_dst1] = arr104[y_src0:y_src1]
            arr104 = shifted

    arr104 = quantize_and_cluster_104(arr104)
    body_holes = count_interior_pinholes_104(arr104)

    neck_104 = (neck_104[0], neck_104[1] + dy_ground)
    back_halo_104 = (back_halo_104[0], back_halo_104[1] + dy_ground)
    l_hand_104 = (l_hand_104[0], l_hand_104[1] + dy_ground)
    r_hand_104 = (r_hand_104[0], r_hand_104[1] + dy_ground)
    l_eye_104 = (l_eye_104[0], l_eye_104[1] + dy_ground)
    r_eye_104 = (r_eye_104[0], r_eye_104[1] + dy_ground)

    stamp_seraphina_eyes_104(arr104, l_eye_104, r_eye_104, head_deg, blink=cfg.get("blink", False))

    halo_layer = np.zeros_like(arr104)
    draw_sacred_ophanim_halo_104(
        halo_layer,
        back_halo_104[0],
        back_halo_104[1],
        phase=cfg.get("halo_phase", 0.0),
        mode=halo_mode,
    )

    fg_layer = np.zeros_like(arr104)
    scepter_head_pt = None

    if cfg.get("resting_staff", False):
        scepter_head_pt = draw_sunburst_scepter_104(
            fg_layer,
            54.0,
            94.0,
            2.0,
            staff_len=25.0,
            pom_len=14.0,
            glow=cfg.get("staff_glow", 0.24),
            phase=cfg.get("fx_phase", 0.0),
        )
    elif cfg.get("show_staff", True):
        sh_pt = r_hand_104 if cfg.get("staff_hand", "right") == "right" else l_hand_104
        sx = max(8.0, min(95.0, sh_pt[0] + (cfg.get("staff_dx") or 0.0)))
        sy = max(8.0, min(97.0, sh_pt[1] + (cfg.get("staff_dy") or 0.0)))
        target_buf = halo_layer if cfg.get("staff_behind", False) else fg_layer
        scepter_head_pt = draw_sunburst_scepter_104(
            target_buf,
            sx,
            sy,
            cfg.get("staff_deg", -52.0),
            staff_len=cfg.get("staff_len", 26.0),
            pom_len=cfg.get("staff_pom_len", 14.0),
            glow=cfg.get("staff_glow", 1.0),
            phase=cfg.get("fx_phase", 0.0),
        )

    orb_r = cfg.get("hand_orb_r") or 0.0
    if orb_r > 0.2:
        oh_pt = l_hand_104 if cfg.get("orb_hand", "left") == "left" else r_hand_104
        draw_prayer_orb_104(
            fg_layer,
            oh_pt[0] + (cfg.get("orb_dx") or 2.0),
            oh_pt[1] + (cfg.get("orb_dy") or -2.0),
            radius=orb_r,
            phase=cfg.get("fx_phase", 0.0),
        )

    if cfg.get("ward_ring", False) and scepter_head_pt is not None:
        draw_scepter_starburst_flare_104(
            fg_layer,
            scepter_head_pt[0],
            scepter_head_pt[1],
            intensity=0.85,
            phase=cfg.get("fx_phase", 0.0),
        )

    # Skill Ground-Consecration Sanctuary Floor Pulse & Rising Starlight Sparks (Row 3 F07..F12)
    slam_int = cfg.get("ground_slam") or 0.0
    if slam_int > 0.05:
        sh_pt = r_hand_104
        rad_s = math.radians(cfg.get("staff_deg", -88.0))
        ux_s, uy_s = math.cos(rad_s), math.sin(rad_s)
        sx_s = sh_pt[0] + (cfg.get("staff_dx") or 0.0)
        sy_s = sh_pt[1] + (cfg.get("staff_dy") or 0.0)
        p_len = cfg.get("staff_pom_len", 25.0)
        butt_x = max(14.0, min(90.0, sx_s - ux_s * min(p_len, max(4.0, (98.0 - sy_s) / max(0.2, -uy_s)))))
        ring_rx = 10.0 + slam_int * 7.5
        for dx_r in range(-int(ring_rx), int(ring_rx) + 1):
            rx_p = butt_x + dx_r
            if 5 <= rx_p <= 98:
                u_r = abs(dx_r) / max(1.0, ring_rx)
                col_m = P_STARLIGHT if u_r < 0.30 else (P_GOLD_LIT if u_r < 0.68 else P_AZURE_LIT)
                put_px(fg_layer, rx_p, 98, col_m)
                put_px(fg_layer, rx_p, 99, P_GOLD_DARK if u_r > 0.5 else P_GOLD_MID)
                if abs(dx_r) % 3 == 0 and u_r < 0.85:
                    sp_h = int((1.0 - u_r) * 4.0 * slam_int)
                    for dy_sp in range(1, sp_h + 1):
                        put_px(fg_layer, rx_p, 98 - dy_sp, P_STARLIGHT if dy_sp == 1 else P_GOLD_LIT)

    if cfg.get("slash_arc") is not None and scepter_head_pt is not None:
        _, _, _, sint = cfg["slash_arc"]
        draw_scepter_starburst_flare_104(
            fg_layer,
            scepter_head_pt[0],
            scepter_head_pt[1],
            intensity=sint,
            phase=cfg.get("fx_phase", 0.0),
        )

    comp = halo_layer.copy()
    body_m = arr104[:, :, 3] > 0
    comp[body_m] = arr104[body_m]
    fg_m = fg_layer[:, :, 3] > 0
    comp[fg_m] = fg_layer[fg_m]

    comp[:4, :, :] = 0
    comp[100:, :, :] = 0
    comp[:, :4, :] = 0
    comp[:, 100:, :] = 0
    return comp, body_holes


def smooth_u(f, f0, f1):
    if f1 <= f0:
        return 1.0
    u = max(0.0, min(1.0, (f - f0) / float(f1 - f0)))
    return 0.5 - 0.5 * math.cos(u * math.pi)


def eval_pose_keyframes(f, keyframes):
    if f <= keyframes[0][0]:
        return dict(keyframes[0][1])
    if f >= keyframes[-1][0]:
        return dict(keyframes[-1][1])

    for i in range(len(keyframes) - 1):
        f0, k0 = keyframes[i]
        f1, k1 = keyframes[i + 1]
        if f0 <= f <= f1:
            u = smooth_u(f, f0, f1)
            out = {}
            all_keys = set(k0.keys()) | set(k1.keys())
            for k in all_keys:
                v0 = k0.get(k)
                v1 = k1.get(k)
                if isinstance(v0, bool) or isinstance(v1, bool) or isinstance(v0, str) or isinstance(v1, str):
                    out[k] = v1 if u >= 0.5 else v0
                elif v0 is None and isinstance(v1, (int, float)):
                    out[k] = 0.0 + (v1 - 0.0) * u
                elif v1 is None and isinstance(v0, (int, float)):
                    out[k] = v0 + (0.0 - v0) * u
                elif v0 is None or v1 is None:
                    out[k] = v1 if u >= 0.5 else v0
                elif isinstance(v0, (int, float)) and isinstance(v1, (int, float)):
                    out[k] = v0 + (v1 - v0) * u
                else:
                    out[k] = v1 if u >= 0.5 else v0
            return out
    return dict(keyframes[-1][1])


def build_row_configs(row_idx):
    cfgs = []
    for f in range(COLS):
        p = 2.0 * math.pi * f / COLS
        cfg = {
            "pelvis_dx": 0.0,
            "pelvis_dy": 0.0,
            "torso_deg": 0.0,
            "head_rel_deg": 0.0,
            "mane_rel_deg": 0.0,
            "l_thigh_deg": 0.0,
            "l_shin_deg": 0.0,
            "l_foot_deg": 0.0,
            "r_thigh_deg": 0.0,
            "r_shin_deg": 0.0,
            "r_foot_deg": 0.0,
            "l_sode_rel_deg": 0.0,
            "l_fore_rel_deg": 0.0,
            "r_sode_rel_deg": 0.0,
            "r_fore_rel_deg": 0.0,
            "coat_billow": 0.0,
            "right_arm_in_front": True,
            "right_leg_behind": False,
            "foot_y": 99.0,
            "halo_mode": "normal",
            "halo_phase": p,
            "fx_phase": p,
            "show_staff": True,
            "staff_hand": "right",
            "staff_behind": False,
            "staff_deg": -52.0,
            "staff_len": 26.0,
            "staff_pom_len": 14.0,
            "staff_glow": 1.0,
            "hand_orb_r": 0.0,
            "orb_hand": "left",
            "orb_dx": 2.0,
            "orb_dy": -2.0,
            "ward_ring": False,
            "ground_slam": 0.0,
            "slash_arc": None,
            "blink": False,
        }

        if row_idx == 0:
            # ROW 0: IDLE — Serene High Priestess sanctuary stance, flowing champagne hair & revolving Ophanim Halo
            breath = math.sin(p)
            sway = math.sin(p - 0.65)
            cfg["pelvis_dy"] = breath * 2.2
            cfg["torso_deg"] = breath * 1.4
            cfg["head_rel_deg"] = -breath * 0.9
            cfg["mane_rel_deg"] = sway * 3.8 + 1.5
            cfg["coat_billow"] = 2.2 + sway * 2.4
            cfg["r_sode_rel_deg"] = -10.0 + breath * 2.2
            cfg["r_fore_rel_deg"] = -22.0 + breath * 2.6
            cfg["l_sode_rel_deg"] = -14.0 - breath * 2.2
            cfg["l_fore_rel_deg"] = -32.0 - breath * 3.0
            cfg["staff_deg"] = -52.0 + sway * 2.8
            cfg["staff_glow"] = 1.0 + 0.16 * math.sin(p * 2.0)
            cfg["hand_orb_r"] = 1.7 + 0.35 * math.sin(p * 2.0)

        elif row_idx == 1:
            # ROW 1: WALK — True Bipedal Crossover Cathedral Stride + Contralateral Scepter & Flowing Stole
            gait = compute_bipedal_walk_pose(PRIESTESS_PIVOTS, f, cols=COLS, stride_scale=0.80)
            c_step = math.cos(p)
            s_step = math.sin(p)
            cfg.update(gait)
            cfg["pelvis_dx"] = s_step * 1.4
            cfg["pelvis_dy"] = 1.5 + abs(c_step) * 2.5
            cfg["torso_deg"] = 3.5 - math.cos(p * 2.0) * 1.1
            cfg["head_rel_deg"] = -2.2 + math.cos(p * 2.0) * 0.7
            cfg["mane_rel_deg"] = -4.0 + math.sin(p - 0.55) * 4.5
            cfg["l_coat_deg"] = 8.5 + max(0.0, c_step) * 5.0 + abs(s_step) * 2.2
            cfg["r_coat_deg"] = -7.0 - max(0.0, -c_step) * 4.5 - abs(s_step) * 1.8
            cfg["stole_deg"] = 4.5 + math.sin(p * 2.0 - 0.5) * 3.2 - c_step * 1.5
            cfg["l_sode_rel_deg"] = -12.0 - c_step * 13.5
            cfg["l_fore_rel_deg"] = -28.0 - c_step * 7.0
            cfg["r_sode_rel_deg"] = -9.0 + c_step * 11.5
            cfg["r_fore_rel_deg"] = -21.0 + c_step * 5.5
            cfg["right_arm_in_front"] = True
            cfg["staff_deg"] = -49.0 - c_step * 6.0
            cfg["staff_glow"] = 1.0 + 0.14 * math.sin(p * 2.0)
            cfg["hand_orb_r"] = 1.5 + 0.25 * math.sin(p * 2.0)
            cfg["halo_mode"] = "normal"
            cfg["halo_phase"] = p
            cfg["foot_y"] = 99.0

        elif row_idx == 2:
            # ROW 2: 4 DISTINCT 100% GROUNDED (`foot_y = 99.0` ON ALL 30 FRAMES, ZERO WINGS!) AUTO_ATTACK VARIANTS
            if f <= 7:
                # V0 (F00..F07): Sunburst Scepter Radiance — grounded forward step, right-hand Scepter thrust + left prayer hand at chest
                kfs = [
                    (0, {
                        "pelvis_dx": -2.0, "pelvis_dy": 1.0, "torso_deg": -2.0, "head_rel_deg": 1.5, "mane_rel_deg": 3.0,
                        "l_thigh_deg": 3.0, "l_shin_deg": 1.5, "l_foot_deg": 0.0,
                        "r_thigh_deg": -3.0, "r_shin_deg": 2.0, "r_foot_deg": 0.0,
                        "r_sode_rel_deg": 6.0, "r_fore_rel_deg": -28.0,
                        "l_sode_rel_deg": -26.0, "l_fore_rel_deg": -40.0, "coat_billow": 4.5,
                        "right_arm_in_front": False, "right_leg_behind": False, "staff_behind": False,
                        "staff_deg": -64.0, "staff_len": 23.5, "staff_glow": 1.20,
                        "foot_y": 99.0, "halo_mode": "flare", "hand_orb_r": 2.4, "orb_dx": 2.5, "orb_dy": -2.5,
                    }),
                    (4, {
                        "pelvis_dx": 7.5, "pelvis_dy": 3.0, "torso_deg": 6.5, "head_rel_deg": -5.0, "mane_rel_deg": -7.5,
                        "l_thigh_deg": 8.0, "l_shin_deg": 4.0, "l_foot_deg": 0.0,
                        "r_thigh_deg": -10.0, "r_shin_deg": 8.0, "r_foot_deg": 0.0,
                        "r_sode_rel_deg": -38.0, "r_fore_rel_deg": -20.0,
                        "l_sode_rel_deg": -18.0, "l_fore_rel_deg": -44.0, "coat_billow": 10.5,
                        "right_arm_in_front": True, "right_leg_behind": False, "staff_behind": False,
                        "staff_deg": -18.0, "staff_len": 22.5, "staff_glow": 1.55,
                        "foot_y": 99.0, "halo_mode": "flare", "hand_orb_r": 2.2, "orb_dx": 2.0, "orb_dy": -2.5,
                    }),
                    (7, {
                        "pelvis_dx": 2.0, "pelvis_dy": 1.0, "torso_deg": 2.0, "head_rel_deg": -1.5, "mane_rel_deg": -2.5,
                        "l_thigh_deg": 3.0, "l_shin_deg": 1.5, "l_foot_deg": 0.0,
                        "r_thigh_deg": -4.0, "r_shin_deg": 3.0, "r_foot_deg": 0.0,
                        "r_sode_rel_deg": -16.0, "r_fore_rel_deg": -22.0,
                        "l_sode_rel_deg": -14.0, "l_fore_rel_deg": -34.0, "coat_billow": 4.0,
                        "right_arm_in_front": True, "right_leg_behind": False, "staff_behind": False,
                        "staff_deg": -42.0, "staff_len": 24.0, "staff_glow": 1.15,
                        "foot_y": 99.0, "halo_mode": "normal", "hand_orb_r": 1.8, "orb_dx": 2.0, "orb_dy": -2.0,
                    }),
                ]
                cfg.update(eval_pose_keyframes(f, kfs))
                if 3 <= f <= 5:
                    cfg["slash_arc"] = (-40.0, 40.0, 28.0, 1.0 - abs(f - 4.0) * 0.22)

            elif f <= 14:
                # V1 (F08..F14): Benediction Twin-Chord Sweep — grounded stance swap (right_leg_behind=True), wide lateral scepter + left blessing palm
                kfs = [
                    (8, {
                        "pelvis_dx": -3.0, "pelvis_dy": 2.5, "torso_deg": -3.5, "head_rel_deg": 2.5, "mane_rel_deg": 5.0,
                        "l_thigh_deg": -8.0, "l_shin_deg": 6.0, "l_foot_deg": 0.0,
                        "r_thigh_deg": 7.0, "r_shin_deg": 4.0, "r_foot_deg": 0.0,
                        "r_sode_rel_deg": 16.0, "r_fore_rel_deg": -18.0,
                        "l_sode_rel_deg": 10.0, "l_fore_rel_deg": -26.0, "coat_billow": 7.5,
                        "right_arm_in_front": False, "right_leg_behind": True, "staff_behind": False,
                        "staff_deg": -62.0, "staff_len": 22.5, "staff_glow": 1.25,
                        "foot_y": 99.0, "halo_mode": "flare", "hand_orb_r": 2.6, "orb_dx": 3.5, "orb_dy": -2.5,
                    }),
                    (11, {
                        "pelvis_dx": 6.0, "pelvis_dy": 4.0, "torso_deg": 5.5, "head_rel_deg": -4.0, "mane_rel_deg": -6.5,
                        "l_thigh_deg": -12.0, "l_shin_deg": 10.0, "l_foot_deg": 0.0,
                        "r_thigh_deg": 10.0, "r_shin_deg": 6.0, "r_foot_deg": 0.0,
                        "r_sode_rel_deg": -28.0, "r_fore_rel_deg": -16.0,
                        "l_sode_rel_deg": -42.0, "l_fore_rel_deg": -16.0, "coat_billow": 11.5,
                        "right_arm_in_front": True, "right_leg_behind": True, "staff_behind": False,
                        "staff_deg": -30.0, "staff_len": 22.5, "staff_glow": 1.55,
                        "foot_y": 99.0, "halo_mode": "flare", "hand_orb_r": 3.3, "orb_dx": 6.0, "orb_dy": -2.0,
                    }),
                    (14, {
                        "pelvis_dx": 1.5, "pelvis_dy": 2.0, "torso_deg": 1.5, "head_rel_deg": -1.0, "mane_rel_deg": -2.0,
                        "l_thigh_deg": -5.0, "l_shin_deg": 4.0, "l_foot_deg": 0.0,
                        "r_thigh_deg": 4.0, "r_shin_deg": 3.0, "r_foot_deg": 0.0,
                        "r_sode_rel_deg": -14.0, "r_fore_rel_deg": -20.0,
                        "l_sode_rel_deg": -20.0, "l_fore_rel_deg": -28.0, "coat_billow": 5.0,
                        "right_arm_in_front": True, "right_leg_behind": True, "staff_behind": False,
                        "staff_deg": -46.0, "staff_len": 23.5, "staff_glow": 1.15,
                        "foot_y": 99.0, "halo_mode": "normal", "hand_orb_r": 2.0, "orb_dx": 3.0, "orb_dy": -2.0,
                    }),
                ]
                cfg.update(eval_pose_keyframes(f, kfs))
                if 10 <= f <= 12:
                    cfg["slash_arc"] = (-44.0, 42.0, 28.0, 1.0 - abs(f - 11.0) * 0.22)

            elif f <= 22:
                # V2 (F15..F22): Cathedral Sky-Pillar Invocation — grounded 2H high scepter elevation (tip strictly inside y >= 6!)
                kfs = [
                    (15, {
                        "pelvis_dx": -1.5, "pelvis_dy": 1.5, "torso_deg": -2.0, "head_rel_deg": -2.0, "mane_rel_deg": 3.5,
                        "l_thigh_deg": 3.5, "l_shin_deg": 2.0, "l_foot_deg": 0.0,
                        "r_thigh_deg": -4.0, "r_shin_deg": 3.0, "r_foot_deg": 0.0,
                        "r_sode_rel_deg": -34.0, "r_fore_rel_deg": -24.0,
                        "l_sode_rel_deg": -32.0, "l_fore_rel_deg": -32.0, "coat_billow": 6.5,
                        "right_arm_in_front": True, "right_leg_behind": False, "staff_behind": False,
                        "staff_deg": -66.0, "staff_len": 20.5, "staff_glow": 1.35,
                        "foot_y": 99.0, "halo_mode": "flare", "hand_orb_r": 2.6,
                    }),
                    (18, {
                        "pelvis_dx": -3.0, "pelvis_dy": 2.5, "torso_deg": -4.0, "head_rel_deg": -4.5, "mane_rel_deg": 6.5,
                        "l_thigh_deg": 5.5, "l_shin_deg": 3.0, "l_foot_deg": 0.0,
                        "r_thigh_deg": -6.5, "r_shin_deg": 5.0, "r_foot_deg": 0.0,
                        "r_sode_rel_deg": -48.0, "r_fore_rel_deg": -22.0,
                        "l_sode_rel_deg": -44.0, "l_fore_rel_deg": -34.0, "coat_billow": 10.5,
                        "right_arm_in_front": True, "right_leg_behind": False, "staff_behind": False,
                        "staff_deg": -74.0, "staff_len": 19.5, "staff_glow": 1.60,
                        "foot_y": 99.0, "halo_mode": "apotheosis", "hand_orb_r": 3.2,
                    }),
                    (20, {
                        "pelvis_dx": 2.0, "pelvis_dy": 2.5, "torso_deg": 2.5, "head_rel_deg": -3.0, "mane_rel_deg": 3.0,
                        "l_thigh_deg": 4.5, "l_shin_deg": 2.5, "l_foot_deg": 0.0,
                        "r_thigh_deg": -5.5, "r_shin_deg": 4.0, "r_foot_deg": 0.0,
                        "r_sode_rel_deg": -40.0, "r_fore_rel_deg": -22.0,
                        "l_sode_rel_deg": -36.0, "l_fore_rel_deg": -32.0, "coat_billow": 9.0,
                        "right_arm_in_front": True, "right_leg_behind": False, "staff_behind": False,
                        "staff_deg": -68.0, "staff_len": 20.0, "staff_glow": 1.50,
                        "foot_y": 99.0, "halo_mode": "flare", "hand_orb_r": 2.6,
                    }),
                    (22, {
                        "pelvis_dx": 0.0, "pelvis_dy": 1.0, "torso_deg": 0.5, "head_rel_deg": -0.5, "mane_rel_deg": 0.5,
                        "l_thigh_deg": 2.0, "l_shin_deg": 1.0, "l_foot_deg": 0.0,
                        "r_thigh_deg": -2.5, "r_shin_deg": 2.0, "r_foot_deg": 0.0,
                        "r_sode_rel_deg": -16.0, "r_fore_rel_deg": -22.0,
                        "l_sode_rel_deg": -18.0, "l_fore_rel_deg": -32.0, "coat_billow": 4.0,
                        "right_arm_in_front": True, "right_leg_behind": False, "staff_behind": False,
                        "staff_deg": -52.0, "staff_len": 23.5, "staff_glow": 1.15,
                        "foot_y": 99.0, "halo_mode": "normal", "hand_orb_r": 1.8,
                    }),
                ]
                cfg.update(eval_pose_keyframes(f, kfs))
                cfg["blink"] = 17 <= f <= 19
                if 18 <= f <= 20:
                    cfg["slash_arc"] = (-40.0, 40.0, 27.0, 0.95 - abs(f - 19.0) * 0.20)

            else:
                # V3 (F23..F29): Dawn Grace Sanctuary Curtsy — deep grounded reverent knee-bend (`pelvis_dy=+14`, `foot_y=99.0`), arms opening in radiant cross-blessing
                kfs = [
                    (23, {
                        "pelvis_dx": 1.0, "pelvis_dy": 5.0, "torso_deg": 3.0, "head_rel_deg": -2.0, "mane_rel_deg": -2.0,
                        "l_thigh_deg": 4.5, "l_shin_deg": 10.0, "l_foot_deg": 0.0,
                        "r_thigh_deg": -9.0, "r_shin_deg": 9.0, "r_foot_deg": 0.0,
                        "l_coat_deg": 8.0, "r_coat_deg": -8.0,
                        "r_sode_rel_deg": -18.0, "r_fore_rel_deg": -18.0,
                        "l_sode_rel_deg": -6.0, "l_fore_rel_deg": -18.0, "coat_billow": 6.0,
                        "right_arm_in_front": True, "right_leg_behind": False, "staff_behind": False,
                        "staff_deg": -44.0, "staff_len": 23.0, "staff_glow": 1.25,
                        "foot_y": 99.0, "halo_mode": "flare", "hand_orb_r": 2.2, "ground_slam": 0.0,
                    }),
                    (26, {
                        "pelvis_dx": 3.0, "pelvis_dy": 14.0, "torso_deg": 7.0, "head_rel_deg": -4.5, "mane_rel_deg": -4.5,
                        "l_thigh_deg": 9.0, "l_shin_deg": 20.0, "l_foot_deg": 0.0,
                        "r_thigh_deg": -17.0, "r_shin_deg": 17.0, "r_foot_deg": 0.0,
                        "l_coat_deg": 14.0, "r_coat_deg": -14.0,
                        "r_sode_rel_deg": -28.0, "r_fore_rel_deg": -12.0,
                        "l_sode_rel_deg": 18.0, "l_fore_rel_deg": 8.0, "coat_billow": 11.5,
                        "right_arm_in_front": True, "right_leg_behind": False, "staff_behind": False,
                        "staff_deg": -28.0, "staff_len": 22.0, "staff_glow": 1.60,
                        "foot_y": 99.0, "halo_mode": "apotheosis", "hand_orb_r": 3.1, "orb_dx": -3.0, "orb_dy": -1.5,
                        "ground_slam": 0.78,
                    }),
                    (29, {
                        "pelvis_dx": 0.0, "pelvis_dy": 0.0, "torso_deg": 0.0, "head_rel_deg": 0.0, "mane_rel_deg": 0.0,
                        "l_thigh_deg": 0.0, "l_shin_deg": 0.0, "l_foot_deg": 0.0,
                        "r_thigh_deg": 0.0, "r_shin_deg": 0.0, "r_foot_deg": 0.0,
                        "l_coat_deg": 2.0, "r_coat_deg": -1.5,
                        "r_sode_rel_deg": -10.0, "r_fore_rel_deg": -22.0,
                        "l_sode_rel_deg": -14.0, "l_fore_rel_deg": -32.0, "coat_billow": 2.0,
                        "right_arm_in_front": True, "right_leg_behind": False, "staff_behind": False,
                        "staff_deg": -52.0, "staff_len": 25.0, "staff_glow": 1.0,
                        "foot_y": 99.0, "halo_mode": "normal", "hand_orb_r": 1.8, "orb_dx": 2.0, "orb_dy": -2.0,
                        "ground_slam": 0.0,
                    }),
                ]
                cfg.update(eval_pose_keyframes(f, kfs))
                cfg["blink"] = 25 <= f <= 27
                if 25 <= f <= 27:
                    cfg["slash_arc"] = (-42.0, 42.0, 28.0, 0.98 - abs(f - 26.0) * 0.20)

        elif row_idx == 3:
            # ROW 3: SKILL — Firmly Grounded Sanctuary Scepter Floor-Consecration & Judgment Sweep (both boots planted at foot_y=99.0!)
            kfs = [
                (0, {
                    "pelvis_dx": 0.0, "pelvis_dy": 0.0, "torso_deg": 0.0, "head_rel_deg": 0.0, "mane_rel_deg": 0.0,
                    "l_thigh_deg": 0.0, "l_shin_deg": 0.0, "l_foot_deg": 0.0,
                    "r_thigh_deg": 0.0, "r_shin_deg": 0.0, "r_foot_deg": 0.0,
                    "r_sode_rel_deg": -10.0, "r_fore_rel_deg": -22.0,
                    "l_sode_rel_deg": -14.0, "l_fore_rel_deg": -32.0, "coat_billow": 2.0,
                    "right_arm_in_front": True, "staff_deg": -52.0, "staff_pom_len": 14.0, "staff_glow": 1.0,
                    "foot_y": 99.0, "halo_mode": "normal", "hand_orb_r": 1.8, "ground_slam": 0.0,
                }),
                (5, {
                    "pelvis_dx": -2.0, "pelvis_dy": 1.0, "torso_deg": -3.0, "head_rel_deg": -2.5, "mane_rel_deg": 5.0,
                    "l_thigh_deg": 3.5, "l_shin_deg": 2.0, "l_foot_deg": 0.0,
                    "r_thigh_deg": -4.0, "r_shin_deg": 3.0, "r_foot_deg": 0.0,
                    "r_sode_rel_deg": -56.0, "r_fore_rel_deg": -26.0,
                    "l_sode_rel_deg": -46.0, "l_fore_rel_deg": -36.0, "coat_billow": 8.0,
                    "right_arm_in_front": True, "staff_deg": -86.0, "staff_pom_len": 22.0, "staff_glow": 1.45,
                    "foot_y": 99.0, "halo_mode": "flare", "hand_orb_r": 3.2, "ground_slam": 0.0,
                }),
                (10, {
                    "pelvis_dx": 2.0, "pelvis_dy": 2.5, "torso_deg": 2.5, "head_rel_deg": -2.0, "mane_rel_deg": 4.0,
                    "l_thigh_deg": 4.0, "l_shin_deg": 2.5, "l_foot_deg": 0.0,
                    "r_thigh_deg": -6.5, "r_shin_deg": 5.5, "r_foot_deg": 0.0,
                    "r_sode_rel_deg": -34.0, "r_fore_rel_deg": -18.0,
                    "l_sode_rel_deg": -38.0, "l_fore_rel_deg": -34.0, "coat_billow": 10.5,
                    "right_arm_in_front": True, "staff_deg": -88.0, "staff_pom_len": 25.0, "staff_glow": 1.55,
                    "foot_y": 99.0, "halo_mode": "flare", "hand_orb_r": 3.4, "ground_slam": 1.0,
                }),
                (15, {
                    "pelvis_dx": 6.5, "pelvis_dy": 2.5, "torso_deg": 5.0, "head_rel_deg": -4.5, "mane_rel_deg": -7.5,
                    "l_thigh_deg": 4.5, "l_shin_deg": 1.5, "l_foot_deg": 0.0,
                    "r_thigh_deg": -7.0, "r_shin_deg": 5.5, "r_foot_deg": 0.0,
                    "r_sode_rel_deg": -40.0, "r_fore_rel_deg": -22.0,
                    "l_sode_rel_deg": -20.0, "l_fore_rel_deg": -16.0, "coat_billow": 12.0,
                    "right_arm_in_front": True, "staff_deg": -22.0, "staff_pom_len": 14.0, "staff_glow": 1.55,
                    "foot_y": 99.0, "halo_mode": "flare", "hand_orb_r": 0.0, "ground_slam": 0.35,
                }),
                (21, {
                    "pelvis_dx": 4.0, "pelvis_dy": 1.5, "torso_deg": 3.5, "head_rel_deg": -3.0, "mane_rel_deg": -4.5,
                    "l_thigh_deg": 3.0, "l_shin_deg": 1.0, "l_foot_deg": 0.0,
                    "r_thigh_deg": -4.5, "r_shin_deg": 3.5, "r_foot_deg": 0.0,
                    "r_sode_rel_deg": -28.0, "r_fore_rel_deg": -22.0,
                    "l_sode_rel_deg": -16.0, "l_fore_rel_deg": -22.0, "coat_billow": 8.5,
                    "right_arm_in_front": True, "staff_deg": -34.0, "staff_pom_len": 14.0, "staff_glow": 1.3,
                    "foot_y": 99.0, "halo_mode": "normal", "hand_orb_r": 0.0, "ground_slam": 0.0,
                }),
                (29, {
                    "pelvis_dx": 0.0, "pelvis_dy": 0.0, "torso_deg": 0.0, "head_rel_deg": 0.0, "mane_rel_deg": 0.0,
                    "l_thigh_deg": 0.0, "l_shin_deg": 0.0, "l_foot_deg": 0.0,
                    "r_thigh_deg": 0.0, "r_shin_deg": 0.0, "r_foot_deg": 0.0,
                    "r_sode_rel_deg": -10.0, "r_fore_rel_deg": -22.0,
                    "l_sode_rel_deg": -14.0, "l_fore_rel_deg": -32.0, "coat_billow": 2.0,
                    "right_arm_in_front": True, "staff_deg": -52.0, "staff_pom_len": 14.0, "staff_glow": 1.0,
                    "foot_y": 99.0, "halo_mode": "normal", "hand_orb_r": 1.8, "ground_slam": 0.0,
                }),
            ]
            cfg.update(eval_pose_keyframes(f, kfs))
            cfg["blink"] = 6 <= f <= 10
            if 13 <= f <= 20:
                cfg["slash_arc"] = (-46.0, 44.0, 31.0, 1.0 - (f - 13) * 0.11)

        elif row_idx == 4:
            # ROW 4: ULTIMATE / SUPREME "FINAL GRACE" — Winged Archangel Ascension (F00..F04 takeoff, F05..F09 channeling, F10..F13 aim, F14..F19 horizontal beam fire, F24..F29 landing)
            kfs = [
                (0, {
                    "pelvis_dx": 0.0, "pelvis_dy": 0.0, "torso_deg": 0.0, "head_rel_deg": 0.0, "mane_rel_deg": 0.0,
                    "l_thigh_deg": 0.0, "l_shin_deg": 0.0, "l_foot_deg": 0.0,
                    "r_thigh_deg": 0.0, "r_shin_deg": 0.0, "r_foot_deg": 0.0,
                    "r_sode_rel_deg": -10.0, "r_fore_rel_deg": -22.0,
                    "l_sode_rel_deg": -14.0, "l_fore_rel_deg": -32.0, "coat_billow": 3.0,
                    "right_arm_in_front": True, "staff_deg": -52.0, "staff_glow": 1.1,
                    "foot_y": 99.0, "halo_mode": "apotheosis", "hand_orb_r": 2.0,
                }),
                (5, {
                    "pelvis_dx": -2.5, "pelvis_dy": 0.0, "torso_deg": -3.0, "head_rel_deg": -2.5, "mane_rel_deg": 7.5,
                    "l_thigh_deg": 14.0, "l_shin_deg": 24.0, "l_foot_deg": 16.0,
                    "r_thigh_deg": 5.0, "r_shin_deg": 18.0, "r_foot_deg": 14.0,
                    "r_sode_rel_deg": -56.0, "r_fore_rel_deg": -24.0,
                    "l_sode_rel_deg": -46.0, "l_fore_rel_deg": -36.0, "coat_billow": 13.5,
                    "right_arm_in_front": True, "staff_deg": -68.0, "staff_glow": 1.5,
                    "foot_y": 95.5, "halo_mode": "apotheosis", "hand_orb_r": 3.5,
                }),
                (9, {
                    "pelvis_dx": -1.5, "pelvis_dy": 0.5, "torso_deg": -1.5, "head_rel_deg": -2.0, "mane_rel_deg": 9.0,
                    "l_thigh_deg": 15.0, "l_shin_deg": 26.0, "l_foot_deg": 18.0,
                    "r_thigh_deg": 6.0, "r_shin_deg": 20.0, "r_foot_deg": 16.0,
                    "r_sode_rel_deg": -52.0, "r_fore_rel_deg": -22.0,
                    "l_sode_rel_deg": -42.0, "l_fore_rel_deg": -34.0, "coat_billow": 15.0,
                    "right_arm_in_front": True, "staff_deg": -62.0, "staff_glow": 1.55,
                    "foot_y": 95.5, "halo_mode": "apotheosis", "hand_orb_r": 3.8,
                }),
                (13, {
                    "pelvis_dx": 6.5, "pelvis_dy": 1.0, "torso_deg": 7.5, "head_rel_deg": -5.0, "mane_rel_deg": -7.5,
                    "l_thigh_deg": 15.0, "l_shin_deg": 26.0, "l_foot_deg": 18.0,
                    "r_thigh_deg": 6.0, "r_shin_deg": 20.0, "r_foot_deg": 16.0,
                    "r_sode_rel_deg": -40.0, "r_fore_rel_deg": -20.0,
                    "l_sode_rel_deg": -26.0, "l_fore_rel_deg": -18.0, "coat_billow": 15.5,
                    "right_arm_in_front": True, "staff_deg": -12.0, "staff_glow": 1.6,
                    "foot_y": 95.5, "halo_mode": "apotheosis", "hand_orb_r": 2.8,
                }),
                (19, {
                    "pelvis_dx": 8.0, "pelvis_dy": 1.5, "torso_deg": 8.5, "head_rel_deg": -5.5, "mane_rel_deg": -8.5,
                    "l_thigh_deg": 16.0, "l_shin_deg": 28.0, "l_foot_deg": 18.0,
                    "r_thigh_deg": 6.5, "r_shin_deg": 21.0, "r_foot_deg": 16.0,
                    "r_sode_rel_deg": -38.0, "r_fore_rel_deg": -18.0,
                    "l_sode_rel_deg": -22.0, "l_fore_rel_deg": -16.0, "coat_billow": 16.5,
                    "right_arm_in_front": True, "staff_deg": -6.0, "staff_glow": 1.65,
                    "foot_y": 95.5, "halo_mode": "apotheosis", "hand_orb_r": 2.2,
                }),
                (24, {
                    "pelvis_dx": 4.0, "pelvis_dy": 2.0, "torso_deg": 4.5, "head_rel_deg": -3.0, "mane_rel_deg": -4.0,
                    "l_thigh_deg": 10.0, "l_shin_deg": 18.0, "l_foot_deg": 10.0,
                    "r_thigh_deg": 3.0, "r_shin_deg": 12.0, "r_foot_deg": 8.0,
                    "r_sode_rel_deg": -24.0, "r_fore_rel_deg": -20.0,
                    "l_sode_rel_deg": -18.0, "l_fore_rel_deg": -24.0, "coat_billow": 10.0,
                    "right_arm_in_front": True, "staff_deg": -28.0, "staff_glow": 1.35,
                    "foot_y": 97.5, "halo_mode": "apotheosis", "hand_orb_r": 1.8,
                }),
                (29, {
                    "pelvis_dx": 0.0, "pelvis_dy": 0.0, "torso_deg": 0.0, "head_rel_deg": 0.0, "mane_rel_deg": 0.0,
                    "l_thigh_deg": 0.0, "l_shin_deg": 0.0, "l_foot_deg": 0.0,
                    "r_thigh_deg": 0.0, "r_shin_deg": 0.0, "r_foot_deg": 0.0,
                    "r_sode_rel_deg": -10.0, "r_fore_rel_deg": -22.0,
                    "l_sode_rel_deg": -14.0, "l_fore_rel_deg": -32.0, "coat_billow": 2.0,
                    "right_arm_in_front": True, "staff_deg": -52.0, "staff_glow": 1.0,
                    "foot_y": 99.0, "halo_mode": "normal", "hand_orb_r": 1.8,
                }),
            ]
            cfg.update(eval_pose_keyframes(f, kfs))
            cfg["blink"] = 5 <= f <= 9
            if 11 <= f <= 23:
                pulse_i = 0.92 + 0.08 * math.sin((f - 11) * 1.1)
                cfg["slash_arc"] = (-48.0, 46.0, 31.0, pulse_i * (1.0 if f <= 20 else 1.0 - (f - 20) * 0.22))

        elif row_idx == 5:
            # ROW 5: DEATH & HURT — F00..F05 Hurt Recoil (uncrossed!) -> F09..F13 Wounded Prayer L-Sit -> F18..F29 Serene Supine Rest + Resting Sunburst Scepter
            kfs = [
                (0, {
                    "pelvis_dx": -2.0, "pelvis_dy": 2.0, "torso_deg": -4.0, "head_rel_deg": -2.0, "mane_rel_deg": 6.0,
                    "l_thigh_deg": 2.0, "l_shin_deg": 4.0, "l_foot_deg": 0.0,
                    "r_thigh_deg": -2.0, "r_shin_deg": 4.0, "r_foot_deg": 0.0,
                    "l_coat_deg": -4.0, "r_coat_deg": 4.0, "stole_deg": -4.0,
                    "l_sode_rel_deg": -16.0, "l_fore_rel_deg": -20.0,
                    "r_sode_rel_deg": 4.0, "r_fore_rel_deg": -18.0, "right_arm_in_front": True,
                    "staff_deg": -46.0, "staff_dy": 0.0, "staff_glow": 1.0,
                    "halo_mode": "normal", "resting_staff": False, "blink": False,
                }),
                (5, {
                    "pelvis_dx": -14.0, "pelvis_dy": 8.0, "torso_deg": -16.0, "head_rel_deg": -7.0, "mane_rel_deg": 18.0,
                    "l_thigh_deg": 7.0, "l_shin_deg": 8.0, "l_foot_deg": 0.0,
                    "r_thigh_deg": -8.0, "r_shin_deg": 8.0, "r_foot_deg": 0.0,
                    "l_coat_deg": -12.0, "r_coat_deg": -10.0, "stole_deg": -12.0,
                    "l_sode_rel_deg": -30.0, "l_fore_rel_deg": -34.0,
                    "r_sode_rel_deg": 18.0, "r_fore_rel_deg": -14.0, "right_arm_in_front": True,
                    "staff_deg": -30.0, "staff_dy": 0.0, "staff_glow": 0.85,
                    "halo_mode": "normal", "resting_staff": False, "blink": True,
                }),
                (9, {
                    "pelvis_dx": -14.0, "pelvis_dy": 45.0, "torso_deg": 10.0, "head_rel_deg": 14.0, "mane_rel_deg": -8.0,
                    "l_thigh_deg": -68.0, "l_shin_deg": -38.0, "l_foot_deg": -24.0,
                    "r_thigh_deg": -42.0, "r_shin_deg": -46.0, "r_foot_deg": -28.0,
                    "l_coat_deg": -48.0, "r_coat_deg": -44.0, "stole_deg": -48.0,
                    "l_sode_rel_deg": -18.0, "l_fore_rel_deg": -48.0,
                    "r_sode_rel_deg": -14.0, "r_fore_rel_deg": -16.0, "right_arm_in_front": True,
                    "staff_deg": 12.0, "staff_dy": 1.5, "staff_glow": 0.60,
                    "halo_mode": "off", "resting_staff": False, "blink": True,
                }),
                (13, {
                    "pelvis_dx": -12.0, "pelvis_dy": 72.0, "torso_deg": -6.0, "head_rel_deg": 18.0, "mane_rel_deg": 22.0,
                    "l_thigh_deg": -88.0, "l_shin_deg": -82.0, "l_foot_deg": -56.0,
                    "r_thigh_deg": -54.0, "r_shin_deg": -76.0, "r_foot_deg": -54.0,
                    "l_coat_deg": -72.0, "r_coat_deg": -68.0, "stole_deg": -74.0,
                    "l_sode_rel_deg": 18.0, "l_fore_rel_deg": 8.0,
                    "r_sode_rel_deg": -10.0, "r_fore_rel_deg": -14.0, "right_arm_in_front": True,
                    "staff_deg": 4.0, "staff_dy": 3.0, "staff_glow": 0.40,
                    "halo_mode": "off", "resting_staff": False, "blink": True,
                }),
                (18, {
                    "pelvis_dx": -8.0, "pelvis_dy": 88.0, "torso_deg": -52.0, "head_rel_deg": 16.0, "mane_rel_deg": 82.0,
                    "l_thigh_deg": -94.0, "l_shin_deg": -88.0, "l_foot_deg": -64.0,
                    "r_thigh_deg": -58.0, "r_shin_deg": -82.0, "r_foot_deg": -60.0,
                    "l_coat_deg": -80.0, "r_coat_deg": -76.0, "stole_deg": -82.0,
                    "l_sode_rel_deg": 8.0, "l_fore_rel_deg": -8.0,
                    "r_sode_rel_deg": 2.0, "r_fore_rel_deg": -10.0, "right_arm_in_front": True,
                    "staff_deg": 2.0, "staff_dy": 3.0, "staff_glow": 0.30,
                    "halo_mode": "off", "resting_staff": True, "blink": True,
                }),
                (23, {
                    "pelvis_dx": -4.0, "pelvis_dy": 98.0, "torso_deg": -83.0, "head_rel_deg": 14.0, "mane_rel_deg": 134.0,
                    "l_thigh_deg": -97.0, "l_shin_deg": -90.0, "l_foot_deg": -68.0,
                    "r_thigh_deg": -60.0, "r_shin_deg": -85.0, "r_foot_deg": -64.0,
                    "l_coat_deg": -86.0, "r_coat_deg": -84.0, "stole_deg": -88.0,
                    "l_sode_rel_deg": 6.0, "l_fore_rel_deg": -8.0,
                    "r_sode_rel_deg": 4.0, "r_fore_rel_deg": -8.0, "right_arm_in_front": True,
                    "staff_deg": 2.0, "staff_dy": 3.0, "staff_glow": 0.24,
                    "halo_mode": "off", "resting_staff": True, "blink": True,
                }),
                (29, {
                    "pelvis_dx": -4.0, "pelvis_dy": 100.0, "torso_deg": -85.0, "head_rel_deg": 13.0, "mane_rel_deg": 138.0,
                    "l_thigh_deg": -98.0, "l_shin_deg": -91.0, "l_foot_deg": -70.0,
                    "r_thigh_deg": -62.0, "r_shin_deg": -86.0, "r_foot_deg": -66.0,
                    "l_coat_deg": -88.0, "r_coat_deg": -86.0, "stole_deg": -89.0,
                    "l_sode_rel_deg": 6.0, "l_fore_rel_deg": -8.0,
                    "r_sode_rel_deg": 4.0, "r_fore_rel_deg": -8.0, "right_arm_in_front": True,
                    "staff_deg": 2.0, "staff_dy": 3.0, "staff_glow": 0.20,
                    "halo_mode": "off", "resting_staff": True, "blink": True,
                }),
            ]
            cfg.update(eval_pose_keyframes(f, kfs))
            cfg["blink"] = f >= 3
            if f >= 23:
                cfg["staff_glow"] = 0.30 + 0.22 * math.sin(p * 3.0)
                cfg["mane_rel_deg"] += 1.4 * math.sin(p * 2.0)

        elif row_idx == 6:
            # ROW 6: DASH — Sleek Winged Radiant Glide across stage (clean parallel swept-back legs, zero knee-crossing!)
            kfs = [
                (0, {
                    "pelvis_dx": 0.0, "pelvis_dy": 3.0, "torso_deg": 5.0, "head_rel_deg": -3.0, "mane_rel_deg": -4.0,
                    "l_thigh_deg": 6.0, "l_shin_deg": 12.0, "l_foot_deg": 8.0,
                    "r_thigh_deg": 0.0, "r_shin_deg": 10.0, "r_foot_deg": 6.0,
                    "r_sode_rel_deg": 4.0, "r_fore_rel_deg": -18.0,
                    "l_sode_rel_deg": -14.0, "l_fore_rel_deg": -24.0, "coat_billow": 6.0,
                    "right_arm_in_front": True, "staff_deg": -46.0, "staff_glow": 1.1,
                    "foot_y": 99.0, "halo_mode": "swept",
                }),
                (5, {
                    "pelvis_dx": 10.0, "pelvis_dy": 4.0, "torso_deg": 14.0, "head_rel_deg": -9.0, "mane_rel_deg": -10.0,
                    "l_thigh_deg": 14.0, "l_shin_deg": 24.0, "l_foot_deg": 16.0,
                    "r_thigh_deg": 6.0, "r_shin_deg": 18.0, "r_foot_deg": 14.0,
                    "r_sode_rel_deg": 12.0, "r_fore_rel_deg": -16.0,
                    "l_sode_rel_deg": -26.0, "l_fore_rel_deg": -24.0, "coat_billow": 14.0,
                    "right_arm_in_front": True, "staff_deg": -40.0, "staff_glow": 1.25,
                    "foot_y": 96.0, "halo_mode": "swept", "hand_orb_r": 2.2,
                }),
                (10, {
                    "pelvis_dx": 14.0, "pelvis_dy": 4.0, "torso_deg": 16.0, "head_rel_deg": -10.5, "mane_rel_deg": -12.0,
                    "l_thigh_deg": 16.0, "l_shin_deg": 28.0, "l_foot_deg": 18.0,
                    "r_thigh_deg": 8.0, "r_shin_deg": 20.0, "r_foot_deg": 16.0,
                    "r_sode_rel_deg": -18.0, "r_fore_rel_deg": -20.0,
                    "l_sode_rel_deg": -12.0, "l_fore_rel_deg": -16.0, "coat_billow": 16.0,
                    "right_arm_in_front": True, "staff_deg": -32.0, "staff_glow": 1.4,
                    "foot_y": 95.5, "halo_mode": "off", "hand_orb_r": 1.6,
                }),
                (15, {
                    "pelvis_dx": 16.0, "pelvis_dy": 4.0, "torso_deg": 15.5, "head_rel_deg": -10.0, "mane_rel_deg": -10.0,
                    "l_thigh_deg": 15.0, "l_shin_deg": 26.0, "l_foot_deg": 16.0,
                    "r_thigh_deg": 7.0, "r_shin_deg": 18.0, "r_foot_deg": 14.0,
                    "r_sode_rel_deg": -36.0, "r_fore_rel_deg": -24.0,
                    "l_sode_rel_deg": 14.0, "l_fore_rel_deg": 6.0, "coat_billow": 15.0,
                    "right_arm_in_front": True, "staff_deg": -26.0, "staff_glow": 1.48,
                    "foot_y": 95.5, "halo_mode": "off", "hand_orb_r": 0.0,
                }),
                (29, {
                    "pelvis_dx": 0.0, "pelvis_dy": 0.0, "torso_deg": 0.0, "head_rel_deg": 0.0, "mane_rel_deg": 0.0,
                    "l_thigh_deg": 0.0, "l_shin_deg": 0.0, "l_foot_deg": 0.0,
                    "r_thigh_deg": 0.0, "r_shin_deg": 0.0, "r_foot_deg": 0.0,
                    "r_sode_rel_deg": -10.0, "r_fore_rel_deg": -22.0,
                    "l_sode_rel_deg": -14.0, "l_fore_rel_deg": -32.0, "coat_billow": 2.0,
                    "right_arm_in_front": True, "staff_deg": -52.0, "staff_glow": 1.0,
                    "foot_y": 99.0, "halo_mode": "normal", "hand_orb_r": 1.8,
                }),
            ]
            cfg.update(eval_pose_keyframes(f, kfs))
            if 13 <= f <= 17:
                cfg["slash_arc"] = (-32.0, 36.0, 28.0, 0.95 - (f - 13) * 0.16)

        elif row_idx == 7:
            # ROW 7: CROUCH — Clean Grounded Benediction Brace (F03..F10) & Low Counter-Cast (F12..F16), zero knee-crossing!
            kfs = [
                (0, {
                    "pelvis_dx": 0.0, "pelvis_dy": 0.0, "torso_deg": 0.0, "head_rel_deg": 0.0, "mane_rel_deg": 0.0,
                    "l_thigh_deg": 0.0, "l_shin_deg": 0.0, "r_thigh_deg": 0.0, "r_shin_deg": 0.0,
                    "l_coat_deg": 2.0, "r_coat_deg": -1.5,
                    "r_sode_rel_deg": -10.0, "r_fore_rel_deg": -22.0,
                    "l_sode_rel_deg": -14.0, "l_fore_rel_deg": -32.0,
                    "right_arm_in_front": True, "staff_deg": -52.0, "staff_glow": 1.0,
                    "foot_y": 99.0, "halo_mode": "normal", "hand_orb_r": 1.8,
                }),
                (4, {
                    "pelvis_dx": 3.0, "pelvis_dy": 15.0, "torso_deg": 7.5, "head_rel_deg": -4.5, "mane_rel_deg": -4.0,
                    "l_thigh_deg": 8.0, "l_shin_deg": 20.0, "r_thigh_deg": -16.0, "r_shin_deg": 16.0,
                    "l_coat_deg": 13.0, "r_coat_deg": -13.0,
                    "r_sode_rel_deg": -22.0, "r_fore_rel_deg": -28.0,
                    "l_sode_rel_deg": -32.0, "l_fore_rel_deg": -42.0,
                    "right_arm_in_front": True, "staff_deg": -78.0, "staff_glow": 1.4,
                    "foot_y": 99.0, "halo_mode": "off", "hand_orb_r": 2.6,
                }),
                (10, {
                    "pelvis_dx": 3.0, "pelvis_dy": 16.0, "torso_deg": 8.0, "head_rel_deg": -5.0, "mane_rel_deg": -4.0,
                    "l_thigh_deg": 8.5, "l_shin_deg": 21.0, "r_thigh_deg": -17.0, "r_shin_deg": 17.0,
                    "l_coat_deg": 14.0, "r_coat_deg": -14.0,
                    "r_sode_rel_deg": -22.0, "r_fore_rel_deg": -26.0,
                    "l_sode_rel_deg": -34.0, "l_fore_rel_deg": -40.0,
                    "right_arm_in_front": True, "staff_deg": -72.0, "staff_glow": 1.45,
                    "foot_y": 99.0, "halo_mode": "off", "hand_orb_r": 2.8,
                }),
                (14, {
                    "pelvis_dx": 8.0, "pelvis_dy": 14.0, "torso_deg": 10.0, "head_rel_deg": -7.5, "mane_rel_deg": -6.5,
                    "l_thigh_deg": 8.0, "l_shin_deg": 19.0, "r_thigh_deg": -16.0, "r_shin_deg": 16.0,
                    "l_coat_deg": 13.0, "r_coat_deg": -13.0,
                    "r_sode_rel_deg": -36.0, "r_fore_rel_deg": -24.0,
                    "l_sode_rel_deg": 12.0, "l_fore_rel_deg": 4.0,
                    "right_arm_in_front": True, "staff_deg": -26.0, "staff_glow": 1.5,
                    "foot_y": 99.0, "halo_mode": "off", "hand_orb_r": 0.0,
                }),
                (20, {
                    "pelvis_dx": 6.0, "pelvis_dy": 11.0, "torso_deg": 8.0, "head_rel_deg": -6.0, "mane_rel_deg": -4.5,
                    "l_thigh_deg": 6.5, "l_shin_deg": 15.0, "r_thigh_deg": -13.0, "r_shin_deg": 13.0,
                    "l_coat_deg": 11.0, "r_coat_deg": -11.0,
                    "r_sode_rel_deg": -26.0, "r_fore_rel_deg": -22.0,
                    "l_sode_rel_deg": 6.0, "l_fore_rel_deg": -8.0,
                    "right_arm_in_front": True, "staff_deg": -34.0, "staff_glow": 1.25,
                    "foot_y": 99.0, "halo_mode": "normal", "hand_orb_r": 0.0,
                }),
                (29, {
                    "pelvis_dx": 0.0, "pelvis_dy": 0.0, "torso_deg": 0.0, "head_rel_deg": 0.0, "mane_rel_deg": 0.0,
                    "l_thigh_deg": 0.0, "l_shin_deg": 0.0, "r_thigh_deg": 0.0, "r_shin_deg": 0.0,
                    "l_coat_deg": 2.0, "r_coat_deg": -1.5,
                    "r_sode_rel_deg": -10.0, "r_fore_rel_deg": -22.0,
                    "l_sode_rel_deg": -14.0, "l_fore_rel_deg": -32.0,
                    "right_arm_in_front": True, "staff_deg": -52.0, "staff_glow": 1.0,
                    "foot_y": 99.0, "halo_mode": "normal", "hand_orb_r": 1.8,
                }),
            ]
            cfg.update(eval_pose_keyframes(f, kfs))
            cfg["ward_ring"] = 3 <= f <= 10
            cfg["blink"] = 4 <= f <= 9
            if 12 <= f <= 16:
                cfg["slash_arc"] = (-35.0, 38.0, 27.0, 1.0 - (f - 12) * 0.16)

        elif row_idx == 8:
            # ROW 8: JUMP / DODGE — Soaring 86px Seraphic Wing Vault with graceful parallel tucked aerial legs (zero splaying/crossing!)
            kfs = [
                (0, {
                    "pelvis_dx": 0.0, "pelvis_dy": 8.0, "torso_deg": 7.0, "head_rel_deg": -4.0, "mane_rel_deg": -4.0,
                    "l_thigh_deg": 12.0, "l_shin_deg": 22.0, "l_foot_deg": 8.0,
                    "r_thigh_deg": 3.0, "r_shin_deg": 16.0, "r_foot_deg": 6.0,
                    "r_sode_rel_deg": 6.0, "r_fore_rel_deg": -8.0,
                    "l_sode_rel_deg": -16.0, "l_fore_rel_deg": -24.0, "coat_billow": 7.0,
                    "right_arm_in_front": True, "staff_deg": -44.0, "staff_glow": 1.1,
                    "foot_y": 99.0, "halo_mode": "normal",
                }),
                (8, {
                    "pelvis_dx": 6.0, "pelvis_dy": 0.0, "torso_deg": 11.0, "head_rel_deg": -7.0, "mane_rel_deg": -9.0,
                    "l_thigh_deg": 16.0, "l_shin_deg": 32.0, "l_foot_deg": 20.0,
                    "r_thigh_deg": 6.0, "r_shin_deg": 22.0, "r_foot_deg": 18.0,
                    "r_sode_rel_deg": -36.0, "r_fore_rel_deg": -22.0,
                    "l_sode_rel_deg": -36.0, "l_fore_rel_deg": -30.0, "coat_billow": 15.0,
                    "right_arm_in_front": True, "staff_deg": -44.0, "staff_glow": 1.4,
                    "foot_y": 94.5, "halo_mode": "flare", "hand_orb_r": 3.0,
                }),
                (15, {
                    "pelvis_dx": 12.0, "pelvis_dy": 1.0, "torso_deg": 14.0, "head_rel_deg": -8.0, "mane_rel_deg": -10.0,
                    "l_thigh_deg": 18.0, "l_shin_deg": 34.0, "l_foot_deg": 22.0,
                    "r_thigh_deg": 8.0, "r_shin_deg": 24.0, "r_foot_deg": 20.0,
                    "r_sode_rel_deg": -28.0, "r_fore_rel_deg": -18.0,
                    "l_sode_rel_deg": 16.0, "l_fore_rel_deg": 8.0, "coat_billow": 16.0,
                    "right_arm_in_front": True, "staff_deg": -8.0, "staff_glow": 1.55,
                    "foot_y": 94.5, "halo_mode": "flare", "hand_orb_r": 0.0,
                }),
                (21, {
                    "pelvis_dx": 8.0, "pelvis_dy": 2.0, "torso_deg": 10.0, "head_rel_deg": -6.0, "mane_rel_deg": -6.0,
                    "l_thigh_deg": 14.0, "l_shin_deg": 28.0, "l_foot_deg": 16.0,
                    "r_thigh_deg": 4.0, "r_shin_deg": 20.0, "r_foot_deg": 14.0,
                    "r_sode_rel_deg": -20.0, "r_fore_rel_deg": -18.0,
                    "l_sode_rel_deg": 6.0, "l_fore_rel_deg": -10.0, "coat_billow": 11.0,
                    "right_arm_in_front": True, "staff_deg": -22.0, "staff_glow": 1.3,
                    "foot_y": 96.5, "halo_mode": "normal", "hand_orb_r": 0.0,
                }),
                (26, {
                    "pelvis_dx": 3.0, "pelvis_dy": 8.0, "torso_deg": 6.0, "head_rel_deg": -3.5, "mane_rel_deg": -3.0,
                    "l_thigh_deg": 10.0, "l_shin_deg": 18.0, "l_foot_deg": 6.0,
                    "r_thigh_deg": 2.0, "r_shin_deg": 12.0, "r_foot_deg": 4.0,
                    "r_sode_rel_deg": -8.0, "r_fore_rel_deg": -18.0,
                    "l_sode_rel_deg": -12.0, "l_fore_rel_deg": -24.0, "coat_billow": 6.0,
                    "right_arm_in_front": True, "staff_deg": -38.0, "staff_glow": 1.05,
                    "foot_y": 99.0, "halo_mode": "normal", "hand_orb_r": 1.2,
                }),
                (29, {
                    "pelvis_dx": 0.0, "pelvis_dy": 0.0, "torso_deg": 0.0, "head_rel_deg": 0.0, "mane_rel_deg": 0.0,
                    "l_thigh_deg": 0.0, "l_shin_deg": 0.0, "l_foot_deg": 0.0,
                    "r_thigh_deg": 0.0, "r_shin_deg": 0.0, "r_foot_deg": 0.0,
                    "r_sode_rel_deg": -10.0, "r_fore_rel_deg": -22.0,
                    "l_sode_rel_deg": -14.0, "l_fore_rel_deg": -32.0, "coat_billow": 2.0,
                    "right_arm_in_front": True, "staff_deg": -52.0, "staff_glow": 1.0,
                    "foot_y": 99.0, "halo_mode": "normal", "hand_orb_r": 1.8,
                }),
            ]
            cfg.update(eval_pose_keyframes(f, kfs))
            if 14 <= f <= 18:
                cfg["slash_arc"] = (-16.0, 52.0, 28.0, 0.95 - (f - 14) * 0.16)

        cfgs.append(cfg)
    return cfgs


def save_debug_sheets(sheet_im):
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    half_w = 15 * CELL
    full_h = ROWS * CELL
    for tag, x_off in (("left_F00_F14", 0), ("right_F15_F29", half_w)):
        bg = Image.new("RGBA", (half_w, full_h), (18, 16, 28, 255))
        crop = sheet_im.crop((x_off, 0, x_off + half_w, full_h))
        bg.alpha_composite(crop, (0, 0))
        d = ImageDraw.Draw(bg)
        for r in range(ROWS):
            for c in range(15):
                d.rectangle([c * CELL, r * CELL, (c + 1) * CELL - 1, (r + 1) * CELL - 1], outline=(52, 48, 74, 180))
        out_p = os.path.join(ARTIFACT_DIR, f"debug_priestess_30fps_{tag}.png")
        bg.resize((half_w // 2, full_h // 2), Image.Resampling.NEAREST).save(out_p)

    picks = [
        (0, 0, "IDLE F00"),
        (1, 7, "WALK F07"),
        (2, 7, "ATK WINDUP"),
        (2, 12, "ATK CAST"),
        (3, 10, "SKILL SLAM"),
        (3, 15, "SKILL SMITE"),
        (4, 7, "GRACE CHARGE"),
        (4, 16, "GRACE BEAM"),
        (7, 6, "CROUCH WARD"),
        (8, 15, "WING VAULT"),
    ]
    sw = len(picks) * CELL
    sh = CELL + 30
    strip = Image.new("RGBA", (sw, sh), (18, 16, 28, 255))
    sd = ImageDraw.Draw(strip)
    for idx, (r, c, lbl) in enumerate(picks):
        tile = sheet_im.crop((c * CELL, r * CELL, (c + 1) * CELL, (r + 1) * CELL))
        strip.alpha_composite(tile, (idx * CELL, 26))
        sd.line([(idx * CELL, 26 + 199), ((idx + 1) * CELL - 1, 26 + 199)], fill=(253, 224, 71, 130), width=1)
        sd.text((idx * CELL + 8, 6), lbl, fill=(254, 240, 138, 255))
    strip.save(os.path.join(ARTIFACT_DIR, "debug_priestess_9pass_showcase.png"))


def main():
    t0 = time.time()
    parts = load_and_segment_512()
    sheet = Image.new("RGBA", (COLS * CELL, ROWS * CELL), (0, 0, 0, 0))
    row_names = ["IDLE", "WALK", "AUTO_ATTACK", "SKILL", "ULTIMATE", "DEATH", "DASH", "CROUCH", "JUMP"]

    total_clips = 0
    total_body_holes = 0
    for r in range(ROWS):
        cfgs = build_row_configs(r)
        prev_arr = None
        distinct_transitions = 0
        row_holes = 0
        for c in range(COLS):
            arr104, b_holes = render_pose_104(parts, cfgs[c])
            row_holes += b_holes
            total_body_holes += b_holes
            border_alpha = (
                arr104[:2, :, 3].sum()
                + arr104[-2:, :, 3].sum()
                + arr104[:, :2, 3].sum()
                + arr104[:, -2:, 3].sum()
            )
            if border_alpha > 0:
                total_clips += 1
            if prev_arr is not None and not np.array_equal(arr104, prev_arr):
                distinct_transitions += 1
            prev_arr = arr104

            cell208 = Image.fromarray(arr104, "RGBA").resize((CELL, CELL), Image.Resampling.NEAREST)
            sheet.paste(cell208, (c * CELL, r * CELL))
        print(f"  Row {r} ({row_names[r]:11s}): 30/30 frames | {distinct_transitions}/29 transitions | body_pinholes={row_holes}")

    os.makedirs(os.path.dirname(OUT_SHEET_PATH), exist_ok=True)
    sheet.save(OUT_SHEET_PATH)
    save_debug_sheets(sheet)
    print(
        f"[SUCCESS] Saved {OUT_SHEET_PATH} ({sheet.size[0]}x{sheet.size[1]}) in {time.time() - t0:.2f}s | "
        f"clips={total_clips}/270 | interior_body_pinholes={total_body_holes}"
    )


def build_row2_auto_only():
    parts = load_and_segment_512()
    cfgs = build_row_configs(2)
    frames_104 = []
    min_x, max_x, min_y, max_y = 104, -1, 104, -1
    for c in range(COLS):
        arr104, b_holes = render_pose_104(parts, cfgs[c])
        assert b_holes == 0, f"priestess Row 2 frame {c} has {b_holes} interior body pinholes"
        ys, xs = np.where(arr104[:, :, 3] > 0)
        assert len(ys) > 0, f"Empty priestess Row 2 frame {c}"
        assert int(ys.max()) == 99, f"Seraphina Row 2 frame {c} NOT grounded at y=99 (got ys.max()={ys.max()})"
        min_x = min(min_x, int(xs.min()))
        max_x = max(max_x, int(xs.max()))
        min_y = min(min_y, int(ys.min()))
        max_y = max(max_y, int(ys.max()))
        assert 4 <= int(xs.min()) and int(xs.max()) <= 99 and 4 <= int(ys.min()) and int(ys.max()) <= 99, (
            f"priestess Row 2 frame {c} out of 4..99 bounds: x={xs.min()}..{xs.max()}, y={ys.min()}..{ys.max()}"
        )
        frames_104.append(arr104)
    print(f"[priestess Row 2 bounds] x={min_x}..{max_x}, y={min_y}..{max_y} (all 30 frames grounded at y=99, 0 holes)")
    splice_row2_auto_surgically("priestess", OUT_SHEET_PATH, frames_104, (P_STARLIGHT, P_GOLD_LIT))


if __name__ == "__main__":
    if "--auto-only" in sys.argv:
        build_row2_auto_only()
    else:
        main()

