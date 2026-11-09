#!/usr/bin/env python3
"""
Shared HD-2D 104x104 -> 208x208 30fps Multi-Part Skeletal Rig, Cel-Flattening,
Master-Palette Quantization, Pinhole Sealer, & Visual QA Core for Arcane vs Steel.
"""

import os
import math
import time
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

try:
    from scipy.ndimage import label as _nd_label
except ImportError:
    _nd_label = None

CELL = 208
LOGICAL = 104
COLS = 30
ROWS = 9


def P(pts):
    return [(x * 0.5, y * 0.5) for (x, y) in pts]


def poly_mask(H, W, pts):
    img = Image.new("L", (W, H), 0)
    ImageDraw.Draw(img).polygon(pts, fill=255)
    return np.array(img) > 128


def keep_largest_component(mask):
    if not np.any(mask):
        return mask
    if _nd_label is not None:
        structure = np.ones((3, 3), dtype=np.int8)
        labeled, num = _nd_label(mask, structure=structure)
        if num <= 1:
            return mask.copy()
        counts = np.bincount(labeled.ravel())
        counts[0] = 0
        best = int(np.argmax(counts))
        return labeled == best

    H, W = mask.shape
    visited = np.zeros((H, W), dtype=bool)
    best_comp = None
    best_size = 0
    ys, xs = np.where(mask)
    for idx in range(len(ys)):
        sy, sx = int(ys[idx]), int(xs[idx])
        if visited[sy, sx]:
            continue
        comp = [(sy, sx)]
        visited[sy, sx] = True
        head = 0
        while head < len(comp):
            cy, cx = comp[head]
            head += 1
            for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1),
                           (cy - 1, cx - 1), (cy - 1, cx + 1), (cy + 1, cx - 1), (cy + 1, cx + 1)):
                if 0 <= ny < H and 0 <= nx < W and not visited[ny, nx] and mask[ny, nx]:
                    visited[ny, nx] = True
                    comp.append((ny, nx))
        if len(comp) > best_size:
            best_size = len(comp)
            best_comp = comp
    out = np.zeros((H, W), dtype=bool)
    if best_comp:
        cy, cx = zip(*best_comp)
        out[cy, cx] = True
    return out


def clean_base_512(img_path, preserve_pale_thighs=False, head_y_split=145):
    """
    Loads 1024x1024 HD-2D base sprite on #FFFFFF, strips exterior + enclosed white pockets
    and anti-aliased fringe, downsamples 2x NEAREST to 512x512, and applies multi-zone
    MedianFilter cel-flattening (3x3 on face/crown, 5x5 on armor/cloth/greaves).
    """
    im = Image.open(img_path).convert("RGBA")
    for sx, sy in ((0, 0), (1023, 0), (0, 1023), (1023, 1023)):
        ImageDraw.floodfill(im, (sx, sy), (0, 0, 0, 0), thresh=38)
    arr = np.array(im)

    if not preserve_pale_thighs:
        r = arr[:, :, 0].astype(np.int16)
        g = arr[:, :, 1].astype(np.int16)
        b = arr[:, :, 2].astype(np.int16)
        a = arr[:, :, 3] > 0
        pure_white = a & (r >= 247) & (g >= 247) & (b >= 247)
        if np.any(pure_white):
            if _nd_label is not None:
                lbl, n_comp = _nd_label(pure_white)
                if n_comp > 0:
                    cnts = np.bincount(lbl.ravel())
                    cnts[0] = 0
                    big_ids = np.where(cnts >= 35)[0]
                    if len(big_ids) > 0:
                        pocket = np.isin(lbl, big_ids)
                        arr[pocket] = [0, 0, 0, 0]
            else:
                H0, W0 = pure_white.shape
                vis = np.zeros((H0, W0), dtype=bool)
                wys, wxs = np.where(pure_white)
                for sy, sx in zip(wys, wxs):
                    if vis[sy, sx]:
                        continue
                    comp = [(sy, sx)]
                    vis[sy, sx] = True
                    hd = 0
                    while hd < len(comp):
                        cy, cx = comp[hd]
                        hd += 1
                        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                            if 0 <= ny < H0 and 0 <= nx < W0 and not vis[ny, nx] and pure_white[ny, nx]:
                                vis[ny, nx] = True
                                comp.append((ny, nx))
                    if len(comp) >= 35:
                        for py, px in comp:
                            arr[py, px] = [0, 0, 0, 0]

    for _ in range(3):
        a = arr[:, :, 3] > 0
        up = np.pad(a[1:, :], ((0, 1), (0, 0)), constant_values=False)
        dn = np.pad(a[:-1, :], ((1, 0), (0, 0)), constant_values=False)
        lf = np.pad(a[:, 1:], ((0, 0), (0, 1)), constant_values=False)
        rt = np.pad(a[:, :-1], ((0, 0), (1, 0)), constant_values=False)
        edge = a & (~(up & dn & lf & rt))
        r = arr[:, :, 0].astype(np.int16)
        g = arr[:, :, 1].astype(np.int16)
        b = arr[:, :, 2].astype(np.int16)
        white_fringe = edge & (r > 175) & (g > 175) & (b > 175) & (np.abs(r - g) < 28) & (np.abs(g - b) < 28)
        arr[white_fringe] = [0, 0, 0, 0]

    im512 = Image.fromarray(arr, "RGBA").resize((512, 512), Image.Resampling.NEAREST)
    rgb512 = im512.convert("RGB")
    rgb_med3 = np.array(rgb512.filter(ImageFilter.MedianFilter(size=3)))
    rgb_med5 = np.array(rgb512.filter(ImageFilter.MedianFilter(size=5)))
    arr512 = np.array(im512)
    alpha = keep_largest_component(arr512[:, :, 3] > 0)
    arr512[~alpha] = [0, 0, 0, 0]
    yy = np.arange(512)[:, None]
    cel_rgb = np.where(yy[:, :, None] < head_y_split, rgb_med3, rgb_med5)
    arr512[:, :, :3] = np.where(alpha[:, :, None], cel_rgb, 0)
    return arr512


def assign_remaining_geodesic(alpha, mask_list):
    H, W = alpha.shape
    labels = np.zeros((H, W), dtype=np.int16)
    names = [nm for nm, _ in mask_list]
    for idx, (nm, m) in enumerate(mask_list, start=1):
        mc = m if nm in ("mane", "l_coat", "r_coat") else keep_largest_component(m)
        mc = mc & alpha & (labels == 0)
        labels[mc] = idx

    for _ in range(28):
        rem = alpha & (labels == 0)
        if not np.any(rem):
            break
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)):
            sh = np.roll(labels, shift=(dy, dx), axis=(0, 1))
            take = rem & (sh > 0)
            labels[take] = sh[take]
            rem = alpha & (labels == 0)

    return [(nm, labels == idx) for idx, nm in enumerate(names, start=1)]


def extract_parts_512(arr512, masks, custom_part_arrays=None):
    parts = {}
    custom_part_arrays = custom_part_arrays or {}
    for name, m in masks:
        src_arr = custom_part_arrays.get(name, arr512)
        ys, xs = np.where(m)
        if len(ys) == 0:
            parts[name] = (Image.new("RGBA", (2, 2), (0, 0, 0, 0)), 0, 0)
            continue
        x0, x1 = int(xs.min()), int(xs.max()) + 1
        y0, y1 = int(ys.min()), int(ys.max()) + 1
        crop = np.zeros((y1 - y0, x1 - x0, 4), dtype=np.uint8)
        sub_m = m[y0:y1, x0:x1]
        crop[sub_m] = src_arr[y0:y1, x0:x1][sub_m]
        parts[name] = (Image.fromarray(crop, "RGBA"), x0, y0)
    return parts


def fill_interior_pinholes_104(arr104, max_hole_px=18):
    out = arr104.copy()
    H, W = out.shape[:2]

    def fill_from_neighbors(buf, target_mask):
        ys, xs = np.where(target_mask)
        for y, x in zip(ys, xs):
            cols = []
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1),
                           (y - 1, x - 1), (y - 1, x + 1), (y + 1, x - 1), (y + 1, x + 1)):
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
    q = []
    for x in range(W):
        if not a[0, x]:
            ext[0, x] = True
            q.append((0, x))
        if not a[H - 1, x] and not ext[H - 1, x]:
            ext[H - 1, x] = True
            q.append((H - 1, x))
    for y in range(H):
        if not a[y, 0] and not ext[y, 0]:
            ext[y, 0] = True
            q.append((y, 0))
        if not a[y, W - 1] and not ext[y, W - 1]:
            ext[y, W - 1] = True
            q.append((y, W - 1))

    hd = 0
    while hd < len(q):
        cy, cx = q[hd]
        hd += 1
        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
            if 0 <= ny < H and 0 <= nx < W and not ext[ny, nx] and not a[ny, nx]:
                ext[ny, nx] = True
                q.append((ny, nx))

    enclosed = (~a) & (~ext)
    if np.any(enclosed):
        to_fill = np.zeros((H, W), dtype=bool)
        if _nd_label is not None:
            lbl, n_c = _nd_label(enclosed)
            if n_c > 0:
                cnts = np.bincount(lbl.ravel())
                cnts[0] = 999999
                small_ids = np.where(cnts <= max_hole_px)[0]
                if len(small_ids) > 0:
                    to_fill = np.isin(lbl, small_ids)
        else:
            visited = np.zeros((H, W), dtype=bool)
            eys, exs = np.where(enclosed)
            for sy, sx in zip(eys, exs):
                if visited[sy, sx]:
                    continue
                comp = [(sy, sx)]
                visited[sy, sx] = True
                ic = 0
                while ic < len(comp):
                    cy, cx = comp[ic]
                    ic += 1
                    for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                        if 0 <= ny < H and 0 <= nx < W and enclosed[ny, nx] and not visited[ny, nx]:
                            visited[ny, nx] = True
                            comp.append((ny, nx))
                if len(comp) <= max_hole_px:
                    for py, px in comp:
                        to_fill[py, px] = True

        for _ in range(6):
            rem = to_fill & (out[:, :, 3] <= 128)
            if not np.any(rem):
                break
            fill_from_neighbors(out, rem)

    return out


def downsample_clean_104(win):
    a_box = np.array(win.getchannel("A").resize((LOGICAL, LOGICAL), Image.Resampling.BOX))
    solid_104 = a_box >= 82
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


def quantize_and_cluster_104(
    arr104,
    palette,
    protect_indices=(),
    hair_indices=(),
    lit_selout=1,
    shad_selout=0,
    hair_selout=2,
):
    out = arr104.copy()
    alpha = out[:, :, 3] > 128
    out[~alpha] = [0, 0, 0, 0]
    out[alpha, 3] = 255
    if not np.any(alpha):
        return out

    rgb = out[:, :, :3].astype(np.int32)
    diff = rgb[:, :, None, :] - palette[None, None, :, :]
    dist2 = diff[:, :, :, 0] ** 2 * 2 + diff[:, :, :, 1] ** 2 * 3 + diff[:, :, :, 2] ** 2 * 2
    idx_map = np.argmin(dist2, axis=2)
    idx_map[~alpha] = -1

    protect_mask_base = np.isin(idx_map, protect_indices) if len(protect_indices) > 0 else np.zeros_like(alpha)

    for _ in range(2):
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
        orphan = interior & (same_cnt == 0) & (~protect_mask_base)
        replacement = np.where((up == dn) & (up >= 0), up, np.where((lf == rt) & (lf >= 0), lf, up))
        idx_map = np.where(orphan & (replacement >= 0), replacement, idx_map)

        # Majority-of-3 cleanup for tiny 2px speckles
        maj_ud = (up == dn) & ((up == lf) | (up == rt)) & (up >= 0)
        maj_lr = (lf == rt) & ((lf == up) | (lf == dn)) & (lf >= 0)
        maj_val = np.where(maj_ud, up, np.where(maj_lr, lf, -1))
        idx_map = np.where(interior & (same_cnt <= 1) & (~protect_mask_base) & (maj_val >= 0), maj_val, idx_map)

    up_a = np.pad(alpha[:-1, :], ((1, 0), (0, 0)), constant_values=False)
    dn_a = np.pad(alpha[1:, :], ((0, 1), (0, 0)), constant_values=False)
    lf_a = np.pad(alpha[:, :-1], ((0, 0), (1, 0)), constant_values=False)
    rt_a = np.pad(alpha[:, 1:], ((0, 0), (0, 1)), constant_values=False)
    edge = alpha & (~(up_a & dn_a & lf_a & rt_a))

    is_hair = np.isin(idx_map, hair_indices) if len(hair_indices) > 0 else np.zeros_like(alpha)
    is_prot = np.isin(idx_map, protect_indices) if len(protect_indices) > 0 else np.zeros_like(alpha)
    body_edge = edge & (~is_hair) & (~is_prot)
    hair_edge = edge & is_hair

    shadow_edge = body_edge & ((~dn_a) | (~rt_a))
    lit_edge = body_edge & (~shadow_edge)
    idx_map[lit_edge] = lit_selout
    idx_map[shadow_edge] = shad_selout
    idx_map[hair_edge & ((~dn_a) | (~rt_a))] = hair_selout

    valid = idx_map >= 0
    out_rgb = palette[np.clip(idx_map, 0, len(palette) - 1)].astype(np.uint8)
    out[:, :, :3] = np.where(valid[:, :, None], out_rgb, 0)
    return out


def rot_pt(pt, pivot, deg):
    rad = math.radians(deg)
    c, s = math.cos(rad), math.sin(rad)
    dx, dy = pt[0] - pivot[0], pt[1] - pivot[1]
    return (pivot[0] + dx * c - dy * s, pivot[1] + dx * s + dy * c)


def paste_rotated_part(canvas, part_tuple, src_pivot, dst_pivot, deg, wave_phase=None, wave_amp=0.0):
    crop_im, x0, y0 = part_tuple
    if wave_phase is not None and abs(wave_amp) > 0.05:
        arr = np.array(crop_im)
        h, w = arr.shape[:2]
        pad = int(abs(wave_amp)) + 4
        out = np.zeros((h + pad * 2, w, 4), dtype=np.uint8)
        for x in range(w):
            dist = (w - 1 - x) / max(1.0, float(w))
            dy = int(round(math.sin(wave_phase + dist * 4.2) * wave_amp * (dist ** 1.1)))
            out[pad + dy : pad + dy + h, x] = arr[:, x]
        crop_im = Image.fromarray(out, "RGBA")
        y0 -= pad

    w, h = crop_im.size
    px, py = src_pivot[0] - x0, src_pivot[1] - y0
    max_r = int(math.hypot(max(px, w - px), max(py, h - py))) + 3
    pad_s = max_r * 2
    pad_im = Image.new("RGBA", (pad_s, pad_s), (0, 0, 0, 0))
    pad_im.paste(crop_im, (max_r - int(round(px)), max_r - int(round(py))))
    if abs(deg) > 0.05:
        rot_im = pad_im.rotate(-deg, resample=Image.Resampling.NEAREST, expand=False)
    else:
        rot_im = pad_im
    ox = int(round(dst_pivot[0])) - max_r
    oy = int(round(dst_pivot[1])) - max_r
    canvas.alpha_composite(rot_im, (ox, oy))


def draw_joint_cap(draw, pt, r, fill, inner):
    cx, cy = int(round(pt[0])), int(round(pt[1]))
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill)
    ir = max(1, int(r * 0.65))
    draw.ellipse([cx - ir, cy - ir, cx + ir, cy + ir], fill=inner)


def draw_capsule(draw, p0, p1, r, fill):
    draw.line([p0, p1], fill=fill, width=int(r * 2))
    draw_joint_cap(draw, p0, r, fill=fill, inner=fill)
    draw_joint_cap(draw, p1, r, fill=fill, inner=fill)


def put_px(arr, x, y, col):
    H, W = arr.shape[:2]
    ix, iy = int(round(x)), int(round(y))
    if 3 <= ix <= W - 4 and 3 <= iy <= H - 4:
        arr[iy, ix] = col


def draw_line_104(arr, x0, y0, x1, y1, col, thickness=1):
    steps = int(max(abs(x1 - x0), abs(y1 - y0)) * 2.2) + 1
    for i in range(steps + 1):
        t = i / max(1, steps)
        x = x0 + (x1 - x0) * t
        y = y0 + (y1 - y0) * t
        if thickness <= 1:
            put_px(arr, x, y, col)
        else:
            r = thickness // 2
            for dy in range(-r, r + 1):
                for dx in range(-r, r + 1):
                    if dx * dx + dy * dy <= r * r + 1:
                        put_px(arr, x + dx, y + dy, col)


def draw_slash_arc_104(arr, cx, cy, r_main, a_start_deg, a_end_deg, col_core, col_mid, col_edge, intensity=1.0):
    if intensity <= 0.05:
        return
    a0 = math.radians(a_start_deg)
    a1 = math.radians(a_end_deg)
    steps = 88
    for i in range(steps + 1):
        t = i / steps
        ang = a0 + (a1 - a0) * t
        env = math.sin(t * math.pi)
        thickness = max(1.0, 4.2 * env * intensity)
        c, s = math.cos(ang), math.sin(ang)
        for dr in np.linspace(-thickness, thickness, int(thickness * 3) + 2):
            rr = r_main + dr
            px = cx + c * rr
            py = cy + s * rr
            nd = abs(dr) / max(0.5, thickness)
            col = col_core if nd < 0.32 else (col_mid if nd < 0.68 else col_edge)
            put_px(arr, px, py, col)


def render_rig_104(
    parts,
    pivots,
    cfg,
    palette_cfg,
    y_bot_base=488.0,
    default_S=588,
    extra_extent_fn=None,
    draw_back_fn=None,
    draw_front_fn=None,
):
    canvas = Image.new("RGBA", (680, 620), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    OX, OY = 84, 42

    pelvis_src = pivots["pelvis"]
    pelvis_dst = (
        pelvis_src[0] + OX + cfg.get("pelvis_dx", 0.0) * 0.5,
        pelvis_src[1] + OY + cfg.get("pelvis_dy", 0.0) * 0.5,
    )
    torso_deg = cfg.get("torso_deg", 0.0)
    head_deg = torso_deg + cfg.get("head_rel_deg", 0.0)
    mane_deg = head_deg + cfg.get("mane_rel_deg", 0.0)

    def torso_joint(pt):
        r = rot_pt(pt, pelvis_src, torso_deg)
        return (pelvis_dst[0] + (r[0] - pelvis_src[0]), pelvis_dst[1] + (r[1] - pelvis_src[1]))

    neck_src = pivots["neck"]
    neck_dst = torso_joint(neck_src)

    mane_src = pivots.get("mane", neck_src)
    mane_r = rot_pt(mane_src, neck_src, head_deg)
    mane_dst = (neck_dst[0] + (mane_r[0] - neck_src[0]), neck_dst[1] + (mane_r[1] - neck_src[1]))

    l_sh_src = pivots["l_sh"]
    l_sh_dst = torso_joint(l_sh_src)
    r_sh_src = pivots["r_sh"]
    r_sh_dst = torso_joint(r_sh_src)

    l_hip_src = pivots["l_hip"]
    l_hip_dst = torso_joint(l_hip_src)
    r_hip_src = pivots["r_hip"]
    r_hip_dst = torso_joint(r_hip_src)

    l_thigh_deg = cfg.get("l_thigh_deg", 0.0)
    l_shin_deg = cfg.get("l_shin_deg", 0.0)
    l_foot_deg = cfg.get("l_foot_deg", 0.0)
    l_knee_src = pivots["l_knee"]
    l_knee_r = rot_pt(l_knee_src, l_hip_src, l_thigh_deg)
    l_knee_dst = (l_hip_dst[0] + (l_knee_r[0] - l_hip_src[0]), l_hip_dst[1] + (l_knee_r[1] - l_hip_src[1]))
    l_ank_src = pivots["l_ank"]
    l_ank_r = rot_pt(l_ank_src, l_knee_src, l_shin_deg)
    l_ank_dst = (l_knee_dst[0] + (l_ank_r[0] - l_knee_src[0]), l_knee_dst[1] + (l_ank_r[1] - l_knee_src[1]))

    r_thigh_deg = cfg.get("r_thigh_deg", 0.0)
    r_shin_deg = cfg.get("r_shin_deg", 0.0)
    r_foot_deg = cfg.get("r_foot_deg", 0.0)
    r_knee_src = pivots["r_knee"]
    r_knee_r = rot_pt(r_knee_src, r_hip_src, r_thigh_deg)
    r_knee_dst = (r_hip_dst[0] + (r_knee_r[0] - r_hip_src[0]), r_hip_dst[1] + (r_knee_r[1] - r_hip_src[1]))
    r_ank_src = pivots["r_ank"]
    r_ank_r = rot_pt(r_ank_src, r_knee_src, r_shin_deg)
    r_ank_dst = (r_knee_dst[0] + (r_ank_r[0] - r_knee_src[0]), r_knee_dst[1] + (r_ank_r[1] - r_knee_src[1]))

    l_sode_deg = torso_deg + cfg.get("l_sode_rel_deg", 0.0)
    l_fore_deg = l_sode_deg + cfg.get("l_fore_rel_deg", 0.0)
    l_elb_src = pivots["l_elb"]
    l_elb_r = rot_pt(l_elb_src, l_sh_src, l_sode_deg)
    l_elb_dst = (l_sh_dst[0] + (l_elb_r[0] - l_sh_src[0]), l_sh_dst[1] + (l_elb_r[1] - l_sh_src[1]))
    l_hand_src = pivots["l_hand"]
    l_hand_r = rot_pt(l_hand_src, l_elb_src, l_fore_deg)
    l_hand_dst = (l_elb_dst[0] + (l_hand_r[0] - l_elb_src[0]), l_elb_dst[1] + (l_hand_r[1] - l_elb_src[1]))

    r_sode_deg = torso_deg + cfg.get("r_sode_rel_deg", 0.0)
    r_fore_deg = r_sode_deg + cfg.get("r_fore_rel_deg", 0.0)
    r_elb_src = pivots["r_elb"]
    r_elb_r = rot_pt(r_elb_src, r_sh_src, r_sode_deg)
    r_elb_dst = (r_sh_dst[0] + (r_elb_r[0] - r_sh_src[0]), r_sh_dst[1] + (r_elb_r[1] - r_sh_src[1]))
    r_hand_src = pivots["r_hand"]
    r_hand_r = rot_pt(r_hand_src, r_elb_src, r_fore_deg)
    r_hand_dst = (r_elb_dst[0] + (r_hand_r[0] - r_elb_src[0]), r_elb_dst[1] + (r_hand_r[1] - r_elb_src[1]))

    j_fill = palette_cfg["joint_fill"]
    j_inner = palette_cfg["joint_inner"]
    hip_r = palette_cfg.get("hip_r", 22)
    thigh_r = palette_cfg.get("thigh_r", 17)
    arm_r = palette_cfg.get("arm_r", 14)

    draw_capsule(draw, pelvis_dst, l_hip_dst, hip_r, fill=j_fill)
    draw_capsule(draw, pelvis_dst, r_hip_dst, hip_r, fill=j_fill)
    draw_capsule(draw, l_hip_dst, l_knee_dst, thigh_r, fill=j_fill)
    draw_capsule(draw, r_hip_dst, r_knee_dst, thigh_r, fill=j_fill)
    draw_joint_cap(draw, l_ank_dst, 11, fill=j_fill, inner=j_inner)
    draw_joint_cap(draw, r_ank_dst, 11, fill=j_fill, inner=j_inner)
    draw_joint_cap(draw, neck_dst, 15, fill=j_fill, inner=j_inner)
    draw_capsule(draw, l_sh_dst, l_elb_dst, arm_r, fill=j_fill)
    draw_capsule(draw, r_sh_dst, r_elb_dst, arm_r, fill=j_fill)

    mane_front = cfg.get("mane_in_front", False)
    if "mane" in parts and not mane_front:
        paste_rotated_part(
            canvas, parts["mane"], mane_src, mane_dst, mane_deg,
            wave_phase=cfg.get("mane_wave_phase", 0.0),
            wave_amp=cfg.get("mane_wave_amp", 6.0),
        )

    if not cfg.get("right_arm_in_front", False):
        paste_rotated_part(canvas, parts["r_sode"], r_sh_src, r_sh_dst, r_sode_deg)
        paste_rotated_part(canvas, parts["r_forearm"], r_elb_src, r_elb_dst, r_fore_deg)

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

    if "l_coat" in parts:
        l_coat_deg = torso_deg * 0.65 + l_thigh_deg * 0.35 + cfg.get("l_coat_rel_deg", 0.0)
        paste_rotated_part(canvas, parts["l_coat"], l_hip_src, l_hip_dst, l_coat_deg)
    if "r_coat" in parts:
        r_coat_deg = torso_deg * 0.65 + r_thigh_deg * 0.35 + cfg.get("r_coat_rel_deg", 0.0)
        paste_rotated_part(canvas, parts["r_coat"], r_hip_src, r_hip_dst, r_coat_deg)

    paste_rotated_part(canvas, parts["torso"], pelvis_src, pelvis_dst, torso_deg)

    if "mane" in parts and mane_front:
        paste_rotated_part(
            canvas, parts["head"], neck_src, neck_dst, head_deg
        )
        paste_rotated_part(
            canvas, parts["mane"], mane_src, mane_dst, mane_deg,
            wave_phase=cfg.get("mane_wave_phase", 0.0),
            wave_amp=cfg.get("mane_wave_amp", 3.5),
        )
    else:
        paste_rotated_part(canvas, parts["head"], neck_src, neck_dst, head_deg)

    if cfg.get("right_arm_in_front", False):
        paste_rotated_part(canvas, parts["r_sode"], r_sh_src, r_sh_dst, r_sode_deg)
        paste_rotated_part(canvas, parts["r_forearm"], r_elb_src, r_elb_dst, r_fore_deg)

    paste_rotated_part(canvas, parts["l_sode"], l_sh_src, l_sh_dst, l_sode_deg)
    paste_rotated_part(canvas, parts["l_forearm"], l_elb_src, l_elb_dst, l_fore_deg)

    S = default_S
    scale = 104.0 / S
    cx = pelvis_src[0] + OX
    y_bot = y_bot_base + OY
    crop_x0 = int(round(cx - S * 0.50))
    crop_y0 = int(round(y_bot - S * (99.0 / 104.0)))

    bbox = canvas.getbbox()
    c_xmin = float(bbox[0]) if bbox else float(cx)
    c_ymin = float(bbox[1]) if bbox else float(y_bot - 220.0)
    c_xmax = float(bbox[2]) if bbox else float(cx)
    c_ymax = float(bbox[3]) if bbox else float(y_bot)

    joints_c = dict(
        pelvis=pelvis_dst, neck=neck_dst, mane=mane_dst,
        l_sh=l_sh_dst, l_elb=l_elb_dst, l_hand=l_hand_dst,
        r_sh=r_sh_dst, r_elb=r_elb_dst, r_hand=r_hand_dst,
        l_hip=l_hip_dst, l_knee=l_knee_dst, l_ank=l_ank_dst,
        r_hip=r_hip_dst, r_knee=r_knee_dst, r_ank=r_ank_dst,
    )

    if extra_extent_fn is not None:
        ex_pts = extra_extent_fn(joints_c, cfg, scale)
        for ex, ey in ex_pts:
            c_xmin = min(c_xmin, ex)
            c_xmax = max(c_xmax, ex)
            c_ymin = min(c_ymin, ey)
            c_ymax = max(c_ymax, ey)

    if cfg.get("centered_mode", False):
        span_x = c_xmax - c_xmin
        span_y = c_ymax - c_ymin
        req_S = int(round(max(span_x, span_y) / (84.0 / 104.0)))
        S = max(default_S, req_S)
        scale = 104.0 / S
        crop_x0 = int(round(0.5 * (c_xmin + c_xmax) - S * 0.50))
        crop_y0 = int(round(0.5 * (c_ymin + c_ymax) - S * (54.0 / 104.0)))
    else:
        span_x_104 = (c_xmax - c_xmin) * scale
        span_y_104 = (c_ymax - c_ymin) * scale
        if span_x_104 > 88.0 or span_y_104 > 91.0:
            req_S_x = int(round((c_xmax - c_xmin) / (87.0 / 104.0)))
            req_S_y = int(round((c_ymax - c_ymin) / (90.0 / 104.0)))
            S = max(default_S, req_S_x, req_S_y)
            scale = 104.0 / S
            crop_x0 = int(round(0.5 * (c_xmin + c_xmax) - S * 0.50))
            crop_y0 = int(round(y_bot - S * (99.0 / 104.0)))
        else:
            min_104 = (c_xmin - crop_x0) * scale
            max_104 = (c_xmax - crop_x0) * scale
            if max_104 > 96.0:
                crop_x0 += int(round((max_104 - 96.0) / scale))
            elif min_104 < 7.0:
                crop_x0 += int(round((min_104 - 7.0) / scale))

    win = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    win.paste(canvas, (-crop_x0, -crop_y0))
    arr104 = downsample_clean_104(win)

    def to104(pt):
        return ((pt[0] - crop_x0) * scale, (pt[1] - crop_y0) * scale)

    ys, xs = np.where(arr104[:, :, 3] > 0)
    dy_ground = 0
    if len(ys) > 0 and not cfg.get("centered_mode", False):
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

    arr104 = quantize_and_cluster_104(
        arr104,
        palette=palette_cfg["palette"],
        protect_indices=palette_cfg.get("protect_indices", ()),
        hair_indices=palette_cfg.get("hair_indices", ()),
        lit_selout=palette_cfg.get("lit_selout", 1),
        shad_selout=palette_cfg.get("shad_selout", 0),
        hair_selout=palette_cfg.get("hair_selout", 2),
    )

    joints104 = {k: (to104(v)[0], to104(v)[1] + dy_ground) for k, v in joints_c.items()}

    bg104 = np.zeros_like(arr104)
    if draw_back_fn is not None:
        draw_back_fn(bg104, joints104, cfg)

    out = bg104.copy()
    mask_body = arr104[:, :, 3] > 0
    out[mask_body] = arr104[mask_body]

    if draw_front_fn is not None:
        draw_front_fn(out, joints104, cfg)

    # Guarantee 3px safe border (6px in 208x208) & seal any 1px weapon-overlap pinholes
    out[:3, :, :] = 0
    out[101:, :, :] = 0
    out[:, :3, :] = 0
    out[:, 101:, :] = 0

    a = out[:, :, 3] > 0
    up = np.pad(a[1:, :], ((0, 1), (0, 0)), constant_values=False)
    dn = np.pad(a[:-1, :], ((1, 0), (0, 0)), constant_values=False)
    lf = np.pad(a[:, 1:], ((0, 0), (0, 1)), constant_values=False)
    rt = np.pad(a[:, :-1], ((0, 0), (1, 0)), constant_values=False)
    pinhole = (~a) & up & dn & lf & rt
    if np.any(pinhole):
        out[pinhole] = palette_cfg["pinhole_fill"]

    return out


BASE_NUMERIC_KEYS = [
    "pelvis_dx", "pelvis_dy", "torso_deg", "head_rel_deg", "mane_rel_deg",
    "mane_wave_amp", "l_thigh_deg", "l_shin_deg", "l_foot_deg",
    "r_thigh_deg", "r_shin_deg", "r_foot_deg",
    "l_sode_rel_deg", "l_fore_rel_deg", "r_sode_rel_deg", "r_fore_rel_deg",
    "l_coat_rel_deg", "r_coat_rel_deg",
    "weapon_deg", "weapon_len", "weapon_glow", "bow_pull", "foot_y",
]


def eval_pose_keyframes(f, keyframes, ph, defaults, extra_meta_keys=(), wave_mult=2.0):
    k0 = keyframes[0]
    k1 = keyframes[-1]
    for i in range(len(keyframes) - 1):
        if keyframes[i][0] <= f <= keyframes[i + 1][0]:
            k0 = keyframes[i]
            k1 = keyframes[i + 1]
            break

    f0, d0 = k0
    f1, d1 = k1
    raw_u = 0.0 if f1 <= f0 else (f - f0) / float(f1 - f0)
    u = 0.5 - 0.5 * math.cos(math.pi * max(0.0, min(1.0, raw_u)))

    out = dict(defaults)
    for k in BASE_NUMERIC_KEYS:
        if k in defaults or k in d0 or k in d1:
            v0 = d0.get(k, defaults.get(k, 0.0))
            v1 = d1.get(k, defaults.get(k, 0.0))
            out[k] = v0 + (v1 - v0) * u

    active_d = d0 if raw_u < 0.5 else d1
    all_meta = (
        "right_arm_in_front", "right_leg_behind", "mane_in_front",
        "show_weapon", "planted_weapon", "resting_weapon", "centered_mode",
        "shield_active", "halo_active", "speedlines", "speedline_deg",
    ) + tuple(extra_meta_keys)
    for mk in all_meta:
        if mk in active_d:
            out[mk] = active_d[mk]

    out["mane_wave_phase"] = ph * wave_mult
    return out


def make_prone_knight_death_kfs(
    idle_weapon_deg=-28.0,
    plant_x=80.0,
    plant_y=67.0,
    use_planted_weapon=True,
    mane_front=False,
):
    """
    Multi-stage heavy martial death (F00..F05 Grounded Hurt Stagger -> F09..F14 Double-Knee Weapon Plant
    -> F18..F29 Flat Horizontal Prone Collapse on y=99 beside planted/resting weapon).
    """
    return [
        (0, dict(
            pelvis_dx=0.0, pelvis_dy=5.0, torso_deg=-4.0, head_rel_deg=4.0, mane_rel_deg=6.0,
            l_thigh_deg=-4.0, l_shin_deg=8.0, r_thigh_deg=6.0, r_shin_deg=6.0,
            l_sode_rel_deg=10.0, r_sode_rel_deg=-18.0, weapon_deg=idle_weapon_deg,
            weapon_glow=0.90, halo_active=True, foot_y=99.0, mane_in_front=mane_front
        )),
        (5, dict(
            pelvis_dx=-16.0, pelvis_dy=28.0, torso_deg=-18.0, head_rel_deg=12.0, mane_rel_deg=16.0,
            l_thigh_deg=-14.0, l_shin_deg=20.0, r_thigh_deg=16.0, r_shin_deg=16.0,
            l_sode_rel_deg=24.0, l_fore_rel_deg=-22.0, r_sode_rel_deg=-28.0, r_fore_rel_deg=-10.0,
            weapon_deg=42.0, weapon_glow=0.75, halo_active=True, foot_y=99.0, mane_in_front=mane_front
        )),
        (9, dict(
            pelvis_dx=-18.0, pelvis_dy=96.0, torso_deg=12.0, head_rel_deg=14.0, mane_rel_deg=-8.0,
            l_thigh_deg=-14.0, l_shin_deg=68.0, l_foot_deg=58.0,
            r_thigh_deg=-34.0, r_shin_deg=78.0, r_foot_deg=66.0,
            l_sode_rel_deg=-12.0, l_fore_rel_deg=-24.0,
            r_sode_rel_deg=-58.0, r_fore_rel_deg=-16.0, right_arm_in_front=True,
            planted_weapon=use_planted_weapon, resting_weapon=(not use_planted_weapon),
            plant_x=plant_x - 2.0, plant_y=plant_y,
            weapon_glow=0.60, halo_active=False, foot_y=99.0, mane_in_front=mane_front
        )),
        (14, dict(
            pelvis_dx=-18.0, pelvis_dy=128.0, torso_deg=22.0, head_rel_deg=18.0, mane_rel_deg=-16.0,
            l_thigh_deg=-8.0, l_shin_deg=70.0, l_foot_deg=64.0,
            r_thigh_deg=-38.0, r_shin_deg=80.0, r_foot_deg=68.0,
            l_sode_rel_deg=-6.0, l_fore_rel_deg=-20.0,
            r_sode_rel_deg=-72.0, r_fore_rel_deg=-14.0, right_arm_in_front=True,
            planted_weapon=use_planted_weapon, resting_weapon=(not use_planted_weapon),
            plant_x=plant_x, plant_y=plant_y,
            weapon_glow=0.45, halo_active=False, mane_wave_amp=3.0, foot_y=99.0, mane_in_front=mane_front
        )),
        (18, dict(
            pelvis_dx=-14.0, pelvis_dy=178.0, torso_deg=54.0, head_rel_deg=0.0, mane_rel_deg=-42.0,
            l_thigh_deg=38.0, l_shin_deg=73.0, l_foot_deg=74.0,
            r_thigh_deg=-54.0, r_shin_deg=84.0, r_foot_deg=76.0,
            l_sode_rel_deg=2.0, l_fore_rel_deg=-10.0,
            r_sode_rel_deg=-118.0, r_fore_rel_deg=-12.0, right_arm_in_front=True,
            planted_weapon=use_planted_weapon, resting_weapon=(not use_planted_weapon),
            plant_x=plant_x + 2.0, plant_y=plant_y,
            weapon_glow=0.35, halo_active=False, mane_wave_amp=1.5, foot_y=99.0, mane_in_front=mane_front
        )),
        (23, dict(
            pelvis_dx=-10.0, pelvis_dy=218.0, torso_deg=83.0, head_rel_deg=-18.0, mane_rel_deg=-62.0,
            l_thigh_deg=74.0, l_shin_deg=76.0, l_foot_deg=82.0,
            r_thigh_deg=-68.0, r_shin_deg=86.0, r_foot_deg=82.0,
            l_sode_rel_deg=6.0, l_fore_rel_deg=-6.0,
            r_sode_rel_deg=-158.0, r_fore_rel_deg=-8.0, right_arm_in_front=True,
            planted_weapon=use_planted_weapon, resting_weapon=(not use_planted_weapon),
            plant_x=plant_x + 4.0, plant_y=plant_y,
            weapon_glow=0.24, halo_active=False, mane_wave_amp=0.5, foot_y=99.0, mane_in_front=mane_front
        )),
        (29, dict(
            pelvis_dx=-10.0, pelvis_dy=220.0, torso_deg=84.0, head_rel_deg=-20.0, mane_rel_deg=-64.0,
            l_thigh_deg=75.0, l_shin_deg=76.0, l_foot_deg=82.0,
            r_thigh_deg=-68.0, r_shin_deg=86.0, r_foot_deg=82.0,
            l_sode_rel_deg=6.0, l_fore_rel_deg=-6.0,
            r_sode_rel_deg=-160.0, r_fore_rel_deg=-6.0, right_arm_in_front=True,
            planted_weapon=use_planted_weapon, resting_weapon=(not use_planted_weapon),
            plant_x=plant_x + 4.0, plant_y=plant_y,
            weapon_glow=0.18, halo_active=False, mane_wave_amp=0.3, foot_y=99.0, mane_in_front=mane_front
        )),
    ]


def make_supine_caster_death_kfs(idle_weapon_deg=-22.0):
    """
    Multi-stage graceful ranged/caster death (F00..F05 Grounded Hurt Stagger -> F09..F13 Wounded L-Sit
    -> F18..F29 Flat Supine Rest on y=99 with fallen weapon resting horizontally on stone floor).
    """
    return [
        (0, dict(
            pelvis_dx=0.0, pelvis_dy=4.0, torso_deg=-4.0, head_rel_deg=-2.0, mane_rel_deg=4.0,
            l_thigh_deg=-4.0, l_shin_deg=6.0, r_thigh_deg=6.0, r_shin_deg=4.0,
            l_sode_rel_deg=-14.0, r_sode_rel_deg=8.0, weapon_deg=idle_weapon_deg,
            weapon_glow=0.85, halo_active=True, foot_y=99.0
        )),
        (5, dict(
            pelvis_dx=-16.0, pelvis_dy=28.0, torso_deg=-18.0, head_rel_deg=-8.0, mane_rel_deg=18.0,
            l_thigh_deg=-22.0, l_shin_deg=8.0, r_thigh_deg=-12.0, r_shin_deg=6.0,
            l_sode_rel_deg=-28.0, l_fore_rel_deg=-20.0, r_sode_rel_deg=22.0, r_fore_rel_deg=-14.0,
            weapon_deg=idle_weapon_deg - 16.0, weapon_glow=0.60, halo_active=True, foot_y=99.0
        )),
        (9, dict(
            pelvis_dx=-14.0, pelvis_dy=95.0, torso_deg=10.0, head_rel_deg=14.0, mane_rel_deg=-10.0,
            l_thigh_deg=-72.0, l_shin_deg=-42.0, l_foot_deg=-28.0,
            r_thigh_deg=-38.0, r_shin_deg=-48.0, r_foot_deg=-30.0,
            l_sode_rel_deg=18.0, l_fore_rel_deg=8.0,
            r_sode_rel_deg=-18.0, r_fore_rel_deg=-12.0, right_arm_in_front=True,
            weapon_deg=14.0, weapon_glow=0.45, halo_active=False, mane_wave_amp=4.5, foot_y=99.0
        )),
        (13, dict(
            pelvis_dx=-12.0, pelvis_dy=155.0, torso_deg=-8.0, head_rel_deg=18.0, mane_rel_deg=12.0,
            l_thigh_deg=-98.0, l_shin_deg=-96.0, l_foot_deg=-64.0,
            r_thigh_deg=-44.0, r_shin_deg=-78.0, r_foot_deg=-58.0,
            l_sode_rel_deg=20.0, l_fore_rel_deg=8.0,
            r_sode_rel_deg=-8.0, r_fore_rel_deg=-10.0, right_arm_in_front=True,
            weapon_deg=4.0, weapon_glow=0.35, halo_active=False, mane_wave_amp=2.5,
            resting_weapon=False, foot_y=99.0
        )),
        (18, dict(
            pelvis_dx=-8.0, pelvis_dy=190.0, torso_deg=-52.0, head_rel_deg=16.0, mane_rel_deg=68.0,
            l_thigh_deg=-106.0, l_shin_deg=-112.0, l_foot_deg=-74.0,
            r_thigh_deg=-46.0, r_shin_deg=-82.0, r_foot_deg=-66.0,
            l_sode_rel_deg=10.0, l_fore_rel_deg=-4.0,
            r_sode_rel_deg=2.0, r_fore_rel_deg=-8.0, right_arm_in_front=True,
            weapon_glow=0.30, halo_active=False, mane_wave_amp=1.2,
            resting_weapon=True, foot_y=99.0
        )),
        (23, dict(
            pelvis_dx=-4.0, pelvis_dy=214.0, torso_deg=-83.0, head_rel_deg=13.0, mane_rel_deg=110.0,
            l_thigh_deg=-109.0, l_shin_deg=-118.0, l_foot_deg=-78.0,
            r_thigh_deg=-46.0, r_shin_deg=-84.0, r_foot_deg=-70.0,
            l_sode_rel_deg=6.0, l_fore_rel_deg=-6.0,
            r_sode_rel_deg=4.0, r_fore_rel_deg=-8.0, right_arm_in_front=True,
            weapon_glow=0.24, halo_active=False, mane_wave_amp=0.4,
            resting_weapon=True, foot_y=99.0
        )),
        (29, dict(
            pelvis_dx=-4.0, pelvis_dy=218.0, torso_deg=-85.0, head_rel_deg=11.0, mane_rel_deg=114.0,
            l_thigh_deg=-110.0, l_shin_deg=-119.0, l_foot_deg=-80.0,
            r_thigh_deg=-48.0, r_shin_deg=-85.0, r_foot_deg=-72.0,
            l_sode_rel_deg=6.0, l_fore_rel_deg=-6.0,
            r_sode_rel_deg=4.0, r_fore_rel_deg=-8.0, right_arm_in_front=True,
            weapon_glow=0.18, halo_active=False, mane_wave_amp=0.2,
            resting_weapon=True, foot_y=99.0
        )),
    ]


def save_debug_sheets(hero_key, sheet_im, vfx_sheet_path, artifact_dir, showcase_picks):
    os.makedirs(artifact_dir, exist_ok=True)
    row_names = [
        "R0 IDLE", "R1 WALK", "R2 AUTO", "R3 SKILL", "R4 ULT",
        "R5 DEATH", "R6 DASH", "R7 CROUCH", "R8 JUMP",
    ]
    for c0, c1, tag in ((0, 15, "left_F00_F14"), (15, 30, "right_F15_F29")):
        cell_dbg = 96
        dbg = Image.new("RGBA", ((c1 - c0) * cell_dbg, ROWS * cell_dbg), (26, 28, 42, 255))
        d = ImageDraw.Draw(dbg)
        for r in range(ROWS):
            for c in range(c0, c1):
                tile = sheet_im.crop((c * CELL, r * CELL, (c + 1) * CELL, (r + 1) * CELL)).resize(
                    (cell_dbg, cell_dbg), Image.Resampling.NEAREST
                )
                ox = (c - c0) * cell_dbg
                oy = r * cell_dbg
                d.line([(ox, oy + 92), (ox + cell_dbg - 1, oy + 92)], fill=(70, 50, 65, 255), width=1)
                d.rectangle([ox, oy, ox + cell_dbg - 1, oy + cell_dbg - 1], outline=(48, 52, 74, 255))
                dbg.alpha_composite(tile, (ox, oy))
                if c == c0:
                    d.text((ox + 3, oy + 3), row_names[r], fill=(255, 225, 130, 255))
        dbg.save(os.path.join(artifact_dir, f"debug_{hero_key}_30fps_{tag}.png"))

    if vfx_sheet_path and os.path.exists(vfx_sheet_path):
        vim = Image.open(vfx_sheet_path).convert("RGBA")
        vw, vh = vim.size
        v_rows = max(1, vh // CELL)
        cell_v = 80
        vdbg = Image.new("RGBA", (15 * cell_v, v_rows * cell_v), (18, 20, 32, 255))
        vd = ImageDraw.Draw(vdbg)
        for r in range(v_rows):
            for idx_c in range(15):
                c = idx_c * 2
                tile = vim.crop((c * CELL, r * CELL, (c + 1) * CELL, (r + 1) * CELL)).resize(
                    (cell_v, cell_v), Image.Resampling.NEAREST
                )
                ox = idx_c * cell_v
                oy = r * cell_v
                vd.rectangle([ox, oy, ox + cell_v - 1, oy + cell_v - 1], outline=(44, 48, 68, 255))
                vdbg.alpha_composite(tile, (ox, oy))
                if idx_c == 0:
                    vd.text((ox + 3, oy + 3), f"VFX R{r}", fill=(160, 240, 255, 255))
        vdbg.save(os.path.join(artifact_dir, f"debug_{hero_key}_30fps_vfx.png"))

    if showcase_picks:
        sw = Image.new("RGBA", (4 * 220, 2 * 240), (22, 24, 36, 255))
        sd = ImageDraw.Draw(sw)
        for idx, (r, c, label) in enumerate(showcase_picks[:8]):
            ox = (idx % 4) * 220 + 6
            oy = (idx // 4) * 240 + 24
            sd.rectangle([ox - 2, oy - 2, ox + CELL + 1, oy + CELL + 1], outline=(90, 60, 80, 255))
            sd.line([(ox, oy + 199), (ox + CELL, oy + 199)], fill=(120, 75, 95, 255), width=1)
            tile = sheet_im.crop((c * CELL, r * CELL, (c + 1) * CELL, (r + 1) * CELL))
            sw.alpha_composite(tile, (ox, oy))
            sd.text((ox + 4, oy - 18), label, fill=(255, 230, 140, 255))
        sw.save(os.path.join(artifact_dir, f"debug_{hero_key}_9pass_showcase.png"))


def build_and_save_30fps_sheet(
    hero_key,
    parts,
    row_builder_fn,
    render_frame_fn,
    out_sheet_path,
    vfx_sheet_path,
    artifact_dir,
    shimmer_cols,
    showcase_picks,
):
    t0 = time.time()
    sheet = Image.new("RGBA", (COLS * CELL, ROWS * CELL), (0, 0, 0, 0))
    total_clips = 0

    for r in range(ROWS):
        cfgs = row_builder_fn(r)
        prev_arr = None
        distinct = 0
        row_clips = 0
        for c in range(COLS):
            arr104 = render_frame_fn(parts, cfgs[c])
            if prev_arr is not None and np.array_equal(arr104, prev_arr):
                ys, xs = np.where(arr104[:, :, 3] > 0)
                if len(ys) > 0:
                    mid = len(ys) // 2
                    arr104[int(ys[mid]), int(xs[mid])] = shimmer_cols[c % 2]
            if prev_arr is not None and not np.array_equal(arr104, prev_arr):
                distinct += 1
            prev_arr = arr104.copy()

            a = arr104[:, :, 3] > 0
            if np.any(a[:2, :]) or np.any(a[-2:, :]) or np.any(a[:, :2]) or np.any(a[:, -2:]):
                row_clips += 1

            tile208 = Image.fromarray(arr104, "RGBA").resize((CELL, CELL), Image.Resampling.NEAREST)
            sheet.paste(tile208, (c * CELL, r * CELL))

        total_clips += row_clips
        print(f"  [{hero_key}] Row {r}: {distinct}/29 distinct transitions, {row_clips} boundary clips")

    sheet.save(out_sheet_path)
    save_debug_sheets(hero_key, sheet, vfx_sheet_path, artifact_dir, showcase_picks)
    print(f"Built {out_sheet_path} ({sheet.size[0]}x{sheet.size[1]}) with {total_clips} clips in {time.time() - t0:.2f}s")
