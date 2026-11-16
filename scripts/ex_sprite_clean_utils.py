#!/opt/homebrew/bin/python3.11
"""Shared HD-2D EX sprite cleanup utilities for 512x512 keyposes & 160x120 frames.

Eliminates isolated alpha dust/leaks, detached tiny coat/hair islands, and
interior body/weapon pinholes while keeping binary nearest-neighbor pixel edges
and preserving the outer 2-logical-pixel (4px output) cell safety border.
"""

from __future__ import annotations

import numpy as np
from PIL import Image
from scipy import ndimage

STRUCTURE_4 = np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]], dtype=bool)
STRUCTURE_8 = np.ones((3, 3), dtype=bool)


def filter_mask_min_area(mask: np.ndarray, min_area: int = 40) -> np.ndarray:
    """Keeps all 8-connected components with area >= min_area (or largest if none)."""
    if not np.any(mask):
        return mask.copy()
    labeled, num = ndimage.label(mask, structure=STRUCTURE_8)
    if num <= 1:
        return mask.copy()
    sizes = np.bincount(labeled.ravel())
    sizes[0] = 0
    keep_ids = np.where(sizes >= min_area)[0]
    if len(keep_ids) == 0:
        best = int(np.argmax(sizes))
        return labeled == best
    return np.isin(labeled, keep_ids)


def _fill_enclosed_holes_rgba(
    arr: np.ndarray,
    max_hole_area: int,
    safe_border: int,
    preserve_transparent_mask: np.ndarray | None = None,
) -> np.ndarray:
    """Seals enclosed alpha==0 holes up to max_hole_area inside safe_border."""
    if max_hole_area <= 0:
        return arr

    h, w, _ = arr.shape
    opaque = arr[:, :, 3] >= 128
    filled = ndimage.binary_fill_holes(opaque, structure=STRUCTURE_4)
    hole_mask = filled & (~opaque)
    if preserve_transparent_mask is not None:
        hole_mask &= ~preserve_transparent_mask

    if not np.any(hole_mask):
        return arr

    labeled_holes, n_holes = ndimage.label(hole_mask, structure=STRUCTURE_4)
    if n_holes == 0:
        return arr

    sizes = np.bincount(labeled_holes.ravel())
    slices = ndimage.find_objects(labeled_holes)
    to_seal = np.zeros((h, w), dtype=bool)

    y_min_safe = safe_border
    y_max_safe = h - safe_border
    x_min_safe = safe_border
    x_max_safe = w - safe_border

    for hid in range(1, n_holes + 1):
        area = int(sizes[hid])
        if area <= 0 or area > max_hole_area:
            continue
        sl = slices[hid - 1]
        if sl is None:
            continue
        ys, xs = sl
        if (
            ys.start < y_min_safe
            or ys.stop > y_max_safe
            or xs.start < x_min_safe
            or xs.stop > x_max_safe
        ):
            continue
        sub = labeled_holes[ys, xs] == hid
        to_seal[ys, xs] |= sub

    if not np.any(to_seal):
        return arr

    out = arr.copy()
    cur_opaque = out[:, :, 3] >= 128
    remaining = to_seal.copy()

    # Iterative 8-neighbor perimeter fill so multi-pixel holes seal smoothly inward
    for _ in range(max(4, min(16, max_hole_area))):
        if not np.any(remaining):
            break
        dilated = ndimage.binary_dilation(cur_opaque, structure=STRUCTURE_8)
        frontier = remaining & dilated
        if not np.any(frontier):
            break

        ys, xs = np.where(frontier)
        for y, x in zip(ys.tolist(), xs.tolist()):
            y0 = max(0, y - 1)
            y1 = min(h, y + 2)
            x0 = max(0, x - 1)
            x1 = min(w, x + 2)
            nbr_op = cur_opaque[y0:y1, x0:x1]
            if not np.any(nbr_op):
                continue
            nbr_rgb = out[y0:y1, x0:x1, :3][nbr_op]
            out[y, x, :3] = np.clip(np.rint(nbr_rgb.mean(axis=0)), 0, 255).astype(np.uint8)
            out[y, x, 3] = 255

        cur_opaque |= frontier
        remaining &= ~frontier

    return out


def clean_512_pose_holes_and_specks(
    rgba_512: Image.Image | np.ndarray,
    max_hole_area: int = 180,
    min_island_area: int = 36,
    max_body_dist: float = 6.0,
) -> Image.Image | np.ndarray:
    """Cleans high-res 512x512 keypose cutouts of alpha specks and interior holes.

    Preserves crisp silhouette edges (binary alpha threshold at 128), deletes tiny
    detached background haze islands further than `max_body_dist` from the main
    character components, and seals enclosed interior alpha==0 pinholes.
    """
    is_pil = isinstance(rgba_512, Image.Image)
    arr = np.array(rgba_512.convert("RGBA") if is_pil else rgba_512, dtype=np.uint8, copy=True)

    opaque = arr[:, :, 3] >= 128
    arr[~opaque] = 0
    arr[opaque, 3] = 255

    if np.any(opaque) and min_island_area > 1:
        labeled, n_comp = ndimage.label(opaque, structure=STRUCTURE_8)
        if n_comp > 1:
            sizes = np.bincount(labeled.ravel())
            large_ids = np.where(sizes >= min_island_area)[0]
            large_ids = large_ids[large_ids > 0]
            if len(large_ids) > 0:
                large_mask = np.isin(labeled, large_ids)
                dist_map = ndimage.distance_transform_edt(~large_mask)
                slices = ndimage.find_objects(labeled)
                remove_mask = np.zeros_like(opaque)
                for cid in range(1, n_comp + 1):
                    area = int(sizes[cid])
                    if area >= min_island_area or area <= 0:
                        continue
                    sl = slices[cid - 1]
                    if sl is None:
                        continue
                    cm = labeled[sl] == cid
                    min_dist = float(dist_map[sl][cm].min())
                    if min_dist > max_body_dist:
                        remove_mask[sl] |= cm
                if np.any(remove_mask):
                    arr[remove_mask] = 0

    if max_hole_area > 0:
        arr = _fill_enclosed_holes_rgba(arr, max_hole_area=max_hole_area, safe_border=4)

    return Image.fromarray(arr, "RGBA") if is_pil else arr


def _bridge_near_components_rgba(
    arr: np.ndarray,
    max_bridge_lpx: int,
    max_gap_lpx: float,
    safe_border_lpx: int,
    preserve_mask: np.ndarray | None = None,
) -> np.ndarray:
    """Bridges near-touching detached cloth/limb islands back into main body."""
    if max_bridge_lpx <= 0 or max_gap_lpx <= 0:
        return arr

    h, w, _ = arr.shape
    opaque = arr[:, :, 3] >= 128
    labeled, n_comp = ndimage.label(opaque, structure=STRUCTURE_8)
    if n_comp <= 1:
        return arr

    sizes = np.bincount(labeled.ravel())
    sizes[0] = 0
    main_id = int(np.argmax(sizes))
    if sizes[main_id] <= 0:
        return arr

    out = arr.copy()
    main_mask = labeled == main_id
    dist_map, nearest_idx = ndimage.distance_transform_edt(
        ~main_mask, return_distances=True, return_indices=True
    )
    slices = ndimage.find_objects(labeled)

    for cid in range(1, n_comp + 1):
        if cid == main_id:
            continue
        area = int(sizes[cid])
        if area <= 0 or area > max_bridge_lpx:
            continue
        sl = slices[cid - 1]
        if sl is None:
            continue
        ys_off = sl[0].start
        xs_off = sl[1].start
        cm = labeled[sl] == cid
        if preserve_mask is not None and np.any(preserve_mask[sl] & cm):
            continue
        sub_dists = dist_map[sl][cm]
        min_d = float(sub_dists.min())
        if min_d <= 1.45 or min_d > max_gap_lpx + 0.5:
            continue

        cy_rel, cx_rel = np.where(cm)
        min_pos = int(np.argmin(sub_dists))
        py = int(ys_off + cy_rel[min_pos])
        px = int(xs_off + cx_rel[min_pos])
        my = int(nearest_idx[0, py, px])
        mx = int(nearest_idx[1, py, px])

        color = np.clip(
            np.rint((out[py, px, :3].astype(np.float32) + out[my, mx, :3].astype(np.float32)) * 0.5),
            0,
            255,
        ).astype(np.uint8)

        steps = max(2, int(np.ceil(max(abs(py - my), abs(px - mx)))))
        for s in range(1, steps):
            t = s / float(steps)
            by = int(round(my + (py - my) * t))
            bx = int(round(mx + (px - mx) * t))
            if (
                safe_border_lpx <= by < h - safe_border_lpx
                and safe_border_lpx <= bx < w - safe_border_lpx
            ):
                if out[by, bx, 3] < 128:
                    out[by, bx, :3] = color
                    out[by, bx, 3] = 255

    return out


def seal_160_char_pinholes_and_leaks(
    frame_160: Image.Image | np.ndarray,
    max_pinhole_lpx: int = 6,
    min_detached_lpx: int = 4,
    max_orphan_lpx: int = 18,
    orphan_dist_lpx: float = 5.0,
    bridge_max_lpx: int = 0,
    bridge_gap_lpx: float = 2.0,
    preserve_mask: np.ndarray | None = None,
    safe_border_lpx: int = 2,
) -> Image.Image | np.ndarray:
    """Sanitizes a 160x120 logical RGBA character+weapon layer before VFX overlays.

    1. Binarizes alpha (<128 -> transparent, >=128 -> opaque 255).
    2. Bridges optional near-touching cloth/limb segments (if `bridge_max_lpx > 0`).
    3. Strips stray <=3 lpx pixel crumbs and distant small floating leaks (`<=max_orphan_lpx`)
       outside any `preserve_mask`.
    4. Seals enclosed interior pinholes (`<=max_pinhole_lpx`) strictly inside `safe_border_lpx`.
    """
    is_pil = isinstance(frame_160, Image.Image)
    arr = np.array(frame_160.convert("RGBA") if is_pil else frame_160, dtype=np.uint8, copy=True)

    opaque = arr[:, :, 3] >= 128
    arr[~opaque] = 0
    arr[opaque, 3] = 255

    if not np.any(opaque):
        return Image.fromarray(arr, "RGBA") if is_pil else arr

    if bridge_max_lpx > 0:
        arr = _bridge_near_components_rgba(
            arr,
            max_bridge_lpx=bridge_max_lpx,
            max_gap_lpx=bridge_gap_lpx,
            safe_border_lpx=safe_border_lpx,
            preserve_mask=preserve_mask,
        )
        opaque = arr[:, :, 3] >= 128

    labeled, n_comp = ndimage.label(opaque, structure=STRUCTURE_8)
    if n_comp > 1:
        sizes = np.bincount(labeled.ravel())
        sizes[0] = 0
        main_id = int(np.argmax(sizes))
        body_thresh = max(40, max_orphan_lpx + 1)
        body_ids = np.where(sizes >= body_thresh)[0]
        body_ids = body_ids[body_ids > 0]
        if len(body_ids) == 0:
            body_ids = np.array([main_id], dtype=np.int64)
        body_mask = np.isin(labeled, body_ids)
        dist_map = ndimage.distance_transform_edt(~body_mask)
        slices = ndimage.find_objects(labeled)

        remove_mask = np.zeros_like(opaque)
        for cid in range(1, n_comp + 1):
            if cid == main_id:
                continue
            area = int(sizes[cid])
            if area <= 0:
                continue
            sl = slices[cid - 1]
            if sl is None:
                continue
            cm = labeled[sl] == cid
            if preserve_mask is not None and np.any(preserve_mask[sl] & cm):
                continue
            min_dist = float(dist_map[sl][cm].min())
            if area < min_detached_lpx:
                remove_mask[sl] |= cm
            elif max_orphan_lpx > 0 and area <= max_orphan_lpx and min_dist > orphan_dist_lpx:
                remove_mask[sl] |= cm

        if np.any(remove_mask):
            arr[remove_mask] = 0

    if max_pinhole_lpx > 0:
        arr = _fill_enclosed_holes_rgba(
            arr,
            max_hole_area=max_pinhole_lpx,
            safe_border=safe_border_lpx,
        )

    return Image.fromarray(arr, "RGBA") if is_pil else arr
