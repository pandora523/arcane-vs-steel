#!/opt/homebrew/bin/python3.11
"""Builds HD-2D Adventure Mode Dimensional Summoning Portals (v2) & Runic Ground Seals.

Replaces:
  - Rows 0..3, Cols 0..3 of `assets/sprites/adv_fx_sheet.png`:
      4 biome-matched 128x128 native HD-2D animated summoning portals (4-frame churning
      vortex + bobbing floating runes/shards/lanterns + pulsing arch gems/flames),
      built from the bespoke 1024x1024 HD-2D portal masters (`adv_portal_v2_z{0..3}_base.jpg`).
  - Row 4, Cols 4..7 of `assets/sprites/adv_fx_sheet.png`:
      4 intricate native 128x128 circular HD-2D Arcane Summoning Seals (projected into
      crisp 2.5D foreshortened floor ovals by AdventureManager.js & Monster.js).

Preserves:
  - Exact 1024x640 sheet geometry (8 cols x 5 rows @ 128x128).
  - Existing Cols 4..7 of Rows 0..3 (biome flames/wisps) and Cols 0..3 of Row 4 untouched.
  - 100% binary alpha (0 or 255) on all newly generated cells, >= 4px inner safety borders,
    and base foot alignment at y = 122 inside each 128x128 portal cell.
"""

from __future__ import annotations

import math
import os
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance
from scipy import ndimage

REPO_ROOT = Path(__file__).resolve().parent.parent
SPRITES_DIR = REPO_ROOT / "assets" / "sprites"
FX_SHEET_PATH = SPRITES_DIR / "adv_fx_sheet.png"
CONTACT_PATH = Path(
    "/Users/rei/.gemini/antigravity/brain/9bd035a8-765f-4369-a5cd-043a4a43b870/scratch/adv_portals_v2_contact.png"
)

STRUCT4 = np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]], dtype=bool)
STRUCT8 = np.ones((3, 3), dtype=bool)

OUTLINE_RGB = np.array([13, 15, 28], dtype=np.uint8)  # #0d0f1c


def hex_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


ZONE_CONFIGS = [
    {
        "zone": 0,
        "name": "Zone I — Astral Cathedral Rift",
        "src": SPRITES_DIR / "adv_portal_v2_z0_base.jpg",
        # Interior archway vortex bounds in normalized sprite bbox coords (0..1)
        "vortex_roi": (0.31, 0.36, 0.69, 0.94),
        "vortex_center": (0.50, 0.68),
        "vortex_palette": [
            hex_rgb("#071c47"),
            hex_rgb("#0284c7"),
            hex_rgb("#38bdf8"),
            hex_rgb("#7dd3fc"),
            hex_rgb("#e0f2fe"),
            hex_rgb("#ffffff"),
        ],
        "spark_colors": [hex_rgb("#ffffff"), hex_rgb("#fef08a"), hex_rgb("#bae6fd")],
        "seal_palette": {
            "rim_dark": hex_rgb("#1e3a5f"),
            "rim_mid": hex_rgb("#d4a438"),
            "rim_hi": hex_rgb("#fef08a"),
            "glow_deep": hex_rgb("#0c4a6e"),
            "glow_mid": hex_rgb("#0ea5e9"),
            "glow_bright": hex_rgb("#7dd3fc"),
            "core": hex_rgb("#f0f9ff"),
            "star_mode": "octagram",
        },
        "vortex_fn": "astral",
    },
    {
        "zone": 1,
        "name": "Zone II — Starwood Sylvan Rift",
        "src": SPRITES_DIR / "adv_portal_v2_z1_base.jpg",
        "vortex_roi": (0.29, 0.27, 0.71, 0.95),
        "vortex_center": (0.50, 0.60),
        "vortex_palette": [
            hex_rgb("#064e3b"),
            hex_rgb("#0d9488"),
            hex_rgb("#10b981"),
            hex_rgb("#34d399"),
            hex_rgb("#99f6e4"),
            hex_rgb("#ecfdf5"),
        ],
        "spark_colors": [hex_rgb("#ecfdf5"), hex_rgb("#fde047"), hex_rgb("#5eead4")],
        "seal_palette": {
            "rim_dark": hex_rgb("#143628"),
            "rim_mid": hex_rgb("#10b981"),
            "rim_hi": hex_rgb("#a7f3d0"),
            "glow_deep": hex_rgb("#064e3b"),
            "glow_mid": hex_rgb("#14b8a6"),
            "glow_bright": hex_rgb("#5eead4"),
            "core": hex_rgb("#f0fdfa"),
            "star_mode": "hexagram",
        },
        "vortex_fn": "sylvan",
    },
    {
        "zone": 2,
        "name": "Zone III — Ossuary Necropolis Rift",
        "src": SPRITES_DIR / "adv_portal_v2_z2_base.jpg",
        "vortex_roi": (0.34, 0.31, 0.66, 0.91),
        "vortex_center": (0.50, 0.63),
        "vortex_palette": [
            hex_rgb("#2e1065"),
            hex_rgb("#6d28d9"),
            hex_rgb("#9333ea"),
            hex_rgb("#c084fc"),
            hex_rgb("#f0abfc"),
            hex_rgb("#fdf4ff"),
        ],
        "spark_colors": [hex_rgb("#fdf4ff"), hex_rgb("#e879f9"), hex_rgb("#a5f3fc")],
        "seal_palette": {
            "rim_dark": hex_rgb("#261a3b"),
            "rim_mid": hex_rgb("#94a3b8"),
            "rim_hi": hex_rgb("#e2e8f0"),
            "glow_deep": hex_rgb("#3b0764"),
            "glow_mid": hex_rgb("#a855f7"),
            "glow_bright": hex_rgb("#e879f9"),
            "core": hex_rgb("#fdf4ff"),
            "star_mode": "crypt",
        },
        "vortex_fn": "ossuary",
    },
    {
        "zone": 3,
        "name": "Zone IV — Black Pit Hell-Maw Rift",
        "src": SPRITES_DIR / "adv_portal_v2_z3_base.jpg",
        "vortex_roi": (0.32, 0.34, 0.68, 0.95),
        "vortex_center": (0.50, 0.67),
        "vortex_palette": [
            hex_rgb("#450a0a"),
            hex_rgb("#b91c1c"),
            hex_rgb("#ea580c"),
            hex_rgb("#f97316"),
            hex_rgb("#facc15"),
            hex_rgb("#fef9c3"),
        ],
        "spark_colors": [hex_rgb("#fef9c3"), hex_rgb("#fb923c"), hex_rgb("#d8b4fe")],
        "seal_palette": {
            "rim_dark": hex_rgb("#291018"),
            "rim_mid": hex_rgb("#c2852c"),
            "rim_hi": hex_rgb("#fde047"),
            "glow_deep": hex_rgb("#5c0b0b"),
            "glow_mid": hex_rgb("#dc2626"),
            "glow_bright": hex_rgb("#fb923c"),
            "core": hex_rgb("#fef9c3"),
            "star_mode": "infernal",
        },
        "vortex_fn": "abyss",
    },
]


def extract_chroma_rgba(img_path: Path, zone: int) -> np.ndarray:
    """Extracts crisp RGBA from 1024x1024 #00FF00 green-screen master."""
    rgb = np.array(Image.open(img_path).convert("RGB"), dtype=np.int16)
    h, w, _ = rgb.shape
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    max_rb = np.maximum(r, b)

    # Candidate green-screen pixels (generous enough for JPEG chroma bleed near borders)
    if zone == 1:
        # Zone 1 has dark olive moss (g < 165) and aqua-mint vortex (b >= 110).
        # Pure neon #00FF00 background has high G and very low R & B.
        bg_cand = (g >= 150) & (r <= 115) & (b <= 115) & ((g - max_rb) >= 58)
        inner_neon = (g >= 188) & (r <= 85) & (b <= 92) & ((g - max_rb) >= 102)
    else:
        bg_cand = (g >= 130) & ((g - max_rb) >= 42)
        inner_neon = (g >= 175) & (r <= 110) & (b <= 115) & ((g - max_rb) >= 75)

    # Flood-fill outer green screen from all 4 image edges
    seed = np.zeros((h, w), dtype=bool)
    seed[0, :] = bg_cand[0, :]
    seed[-1, :] = bg_cand[-1, :]
    seed[:, 0] = bg_cand[:, 0]
    seed[:, -1] = bg_cand[:, -1]
    outer_bg = ndimage.binary_propagation(seed, structure=STRUCT4, mask=bg_cand)

    # Include interior pure-neon cutouts (e.g. gothic arch windows, lantern scrollwork, spire gaps)
    # Remove tiny false-positive single-pixel speckles by requiring area >= 18 at 1024x1024
    inner_only = inner_neon & (~outer_bg)
    if np.any(inner_only):
        lbl, n = ndimage.label(inner_only, structure=STRUCT4)
        sizes = np.bincount(lbl.ravel())
        sizes[0] = 0
        valid_inner = np.isin(lbl, np.where(sizes >= 18)[0])
        # Dilate 1px into JPEG fringe of interior cutouts where bg_cand holds
        inner_bg = ndimage.binary_dilation(valid_inner, structure=STRUCT8, iterations=2) & bg_cand
    else:
        inner_bg = np.zeros((h, w), dtype=bool)

    bg_mask = outer_bg | inner_bg

    # Catch 1px-2px green JPEG anti-alias fringe bordering bg_mask
    near_bg = ndimage.binary_dilation(bg_mask, structure=STRUCT8, iterations=2) & (~bg_mask)
    if zone == 1:
        fringe_cut = near_bg & (g >= 155) & (r <= 110) & (b <= 105) & ((g - max_rb) >= 52)
    else:
        fringe_cut = near_bg & (g >= 115) & ((g - max_rb) >= 28)
    bg_mask |= fringe_cut

    # Despill residual green tint on remaining boundary pixels (up to 3px inside opaque edge)
    out_rgb = rgb.copy()
    edge_band = ndimage.binary_dilation(bg_mask, structure=STRUCT8, iterations=3) & (~bg_mask)
    if zone == 1:
        # Only despill bright neon spillover on dark outlines/roots, never touch teal vortex
        despill = edge_band & (b < 110) & (g > max_rb + 18)
    else:
        despill = edge_band & (g > max_rb + 12)
    if np.any(despill):
        ys, xs = np.where(despill)
        cap = np.maximum(out_rgb[ys, xs, 0], out_rgb[ys, xs, 2]) + 4
        out_rgb[ys, xs, 1] = np.minimum(out_rgb[ys, xs, 1], cap)
        # Slightly darken bright desaturated fringe near outline so selout stays crisp
        luma = (out_rgb[ys, xs, 0] + out_rgb[ys, xs, 1] + out_rgb[ys, xs, 2]) / 3.0
        dark_edge = luma < 95
        out_rgb[ys[dark_edge], xs[dark_edge]] = (out_rgb[ys[dark_edge], xs[dark_edge]] * 0.72).astype(np.int16)

    alpha = np.where(bg_mask, 0, 255).astype(np.uint8)
    # Remove tiny isolated dust speckles (< 35px at 1024x1024)
    lbl, n = ndimage.label(alpha > 0, structure=STRUCT8)
    if n > 1:
        sizes = np.bincount(lbl.ravel())
        sizes[0] = 0
        keep = np.isin(lbl, np.where(sizes >= 35)[0])
        alpha = np.where(keep, 255, 0).astype(np.uint8)

    rgba = np.dstack([np.clip(out_rgb, 0, 255).astype(np.uint8), alpha])
    return rgba


def fit_portal_to_128(rgba_hi: np.ndarray, zone: int) -> tuple[np.ndarray, tuple[int, int, int, int]]:
    """Crops tight bbox, resamples crisply into 128x128 cell with base at y=122 & >= 6px margins."""
    ys, xs = np.where(rgba_hi[:, :, 3] >= 128)
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    crop = rgba_hi[y0:y1, x0:x1]
    ch, cw = crop.shape[:2]

    # Target interior dimensions leaving >= 7px side margin (for floating bob) and base at y=122 (6px bottom)
    max_w = 112
    max_h = 114
    scale = min(max_w / cw, max_h / ch)
    nw = max(16, int(round(cw * scale)))
    nh = max(16, int(round(ch * scale)))

    # Premultiplied resize prevents dark halo bleeding
    crop_f = crop.astype(np.float32)
    a_f = crop_f[:, :, 3:4] / 255.0
    premul = np.concatenate([crop_f[:, :, :3] * a_f, crop_f[:, :, 3:4]], axis=2)
    # Resize each channel via LANCZOS
    chans = []
    for c in range(4):
        im_c = Image.fromarray(np.clip(np.rint(premul[:, :, c]), 0, 255).astype(np.uint8), mode="L")
        chans.append(np.array(im_c.resize((nw, nh), Image.Resampling.LANCZOS), dtype=np.float32))
    a_small = chans[3] / 255.0
    opaque = a_small >= 0.48
    rgb_small = np.zeros((nh, nw, 3), dtype=np.float32)
    safe_a = np.where(a_small > 0.05, a_small, 1.0)
    for c in range(3):
        rgb_small[:, :, c] = np.where(opaque, np.clip(chans[c] / safe_a, 0, 255), 0)

    # Mild crispness/saturation polish for HD-2D readability
    im_rgb = Image.fromarray(np.clip(np.rint(rgb_small), 0, 255).astype(np.uint8), mode="RGB")
    im_rgb = ImageEnhance.Contrast(im_rgb).enhance(1.08)
    im_rgb = ImageEnhance.Color(im_rgb).enhance(1.06)
    im_rgb = ImageEnhance.Sharpness(im_rgb).enhance(1.25)
    rgb_arr = np.array(im_rgb, dtype=np.uint8)

    # Quantize opaque colors to crisp 56-color pixel-art palette (eliminates JPEG fuzz)
    op_mask = opaque
    op_pixels = rgb_arr[op_mask]
    if len(op_pixels) > 0:
        # Pack opaque pixels into temporary image for PIL median-cut quantization
        n_op = len(op_pixels)
        side = int(math.ceil(math.sqrt(n_op)))
        pad = np.zeros((side * side, 3), dtype=np.uint8)
        pad[:n_op] = op_pixels
        pad[n_op:] = op_pixels[0]
        pal_im = Image.fromarray(pad.reshape(side, side, 3), mode="RGB").quantize(
            colors=56, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE
        )
        q_rgb = np.array(pal_im.convert("RGB"), dtype=np.uint8).reshape(-1, 3)[:n_op]
        rgb_arr[op_mask] = q_rgb

    # Clean tiny 1-2px detached alpha specks
    lbl, n = ndimage.label(op_mask, structure=STRUCT8)
    if n > 1:
        sizes = np.bincount(lbl.ravel())
        sizes[0] = 0
        op_mask = np.isin(lbl, np.where(sizes >= 3)[0])

    # Place onto 128x128 cell, horizontally centered, bottom grounded at y = 122
    cell = np.zeros((128, 128, 4), dtype=np.uint8)
    ox = (128 - nw) // 2
    oy = 122 - nh
    cell[oy : oy + nh, ox : ox + nw, :3] = np.where(op_mask[:, :, None], rgb_arr, 0)
    cell[oy : oy + nh, ox : ox + nw, 3] = np.where(op_mask, 255, 0).astype(np.uint8)

    # Crisp 1px #0d0f1c outer selout pass ONLY where outer silhouette pixel is overly bright
    # (the masters already have crisp dark ink outlines; darken any overly green-ish edge pixel)
    op_cell = cell[:, :, 3] >= 128
    eroded = ndimage.binary_erosion(op_cell, structure=STRUCT4)
    perimeter = op_cell & (~eroded)
    if np.any(perimeter):
        pr, pg, pb = (
            cell[:, :, 0].astype(np.int16),
            cell[:, :, 1].astype(np.int16),
            cell[:, :, 2].astype(np.int16),
        )
        # Kill any stray bright-green fringe pixel that survived resize
        bad_green = perimeter & (pg > np.maximum(pr, pb) + 28) & (pb < 120)
        if np.any(bad_green):
            cell[bad_green, :3] = OUTLINE_RGB

    return cell, (ox, oy, nw, nh)


def detect_vortex_mask(cell: np.ndarray, bbox: tuple[int, int, int, int], cfg: dict) -> np.ndarray:
    """Identifies the interior portal energy vortex pixels, preserving foreground stonework & chains."""
    ox, oy, nw, nh = bbox
    rx0, ry0, rx1, ry1 = cfg["vortex_roi"]
    x0 = max(4, int(round(ox + rx0 * nw)))
    x1 = min(124, int(round(ox + rx1 * nw)))
    y0 = max(4, int(round(oy + ry0 * nh)))
    y1 = min(122, int(round(oy + ry1 * nh)))

    yy, xx = np.mgrid[0:128, 0:128]
    in_roi = (xx >= x0) & (xx <= x1) & (yy >= y0) & (yy <= y1) & (cell[:, :, 3] >= 128)

    r = cell[:, :, 0].astype(np.int16)
    g = cell[:, :, 1].astype(np.int16)
    b = cell[:, :, 2].astype(np.int16)
    luma = 0.299 * r + 0.587 * g + 0.114 * b

    mode = cfg["vortex_fn"]
    if mode == "astral":
        # Bright cyan/blue/white spiral; exclude gold arch trim (r > b + 15) & dark slate pendant
        cand = in_roi & (
            ((b >= 115) & (b >= r + 15))
            | ((b >= 185) & (g >= 180) & (r >= 165))
            | ((b >= 70) & (r <= 48) & (g <= 90))
        ) & ~((r > b + 12) & (g > b - 5))
    elif mode == "sylvan":
        # Bright aqua/mint/cyan/white vortex; exclude dark bark & dark olive moss
        cand = in_roi & (
            ((b >= 125) & (g >= 125) & (luma >= 105))
            | ((g >= 175) & (b >= 145))
            | ((luma >= 195) & (g >= 175))
        )
    elif mode == "ossuary":
        # Purple/violet/magenta/lavender vortex; exclude neutral gray iron & bone & dark shadows
        sat = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
        cand = in_roi & (
            ((b >= 110) & (r >= 75) & (b > g + 12) & (sat >= 22))
            | ((r >= 170) & (b >= 185) & (luma >= 155))
        )
    else:  # abyss (Zone 3)
        # Fiery red/orange/yellow/dark-crimson magma vortex; EXCLUDE dark charcoal chains/hooks & purple gems!
        cand = in_roi & (
            ((r >= 125) & (r >= b + 45) & (b <= 115))
            | ((r >= 195) & (g >= 145) & (b <= 155))
            | ((r >= 75) & (r > g + 35) & (r > b + 35) & (luma >= 32))
        ) & ~((b > g + 10) & (b > 75))  # exclude purple rift gems

    # Keep only main connected vortex components inside archway (drop stray 1-3px stone reflections)
    lbl, n = ndimage.label(cand, structure=STRUCT8)
    if n > 0:
        sizes = np.bincount(lbl.ravel())
        sizes[0] = 0
        # Keep components >= 12px (allows chains in Z3 to split vortex into contiguous pockets cleanly!)
        min_comp = 10 if mode == "abyss" else 18
        cand = np.isin(lbl, np.where(sizes >= min_comp)[0])

    # Erode 1px only where adjacent to dark outline? No, keep crisp pixel fill right up to arch frame!
    return cand


def sample_palette(palette: list[tuple[int, int, int]], t: np.ndarray) -> np.ndarray:
    """Maps scalar array t in [0, 1] to quantized discrete biome palette stops (pixel-art crisp)."""
    n = len(palette)
    idx = np.clip((t * n).astype(np.int32), 0, n - 1)
    pal_arr = np.array(palette, dtype=np.uint8)
    return pal_arr[idx]


def animate_portal_frames(base_cell: np.ndarray, bbox: tuple[int, int, int, int], cfg: dict) -> list[np.ndarray]:
    """Generates 4 seamless looping HD-2D animation frames for a portal cell."""
    ox, oy, nw, nh = bbox
    vortex_mask = detect_vortex_mask(base_cell, bbox, cfg)

    # Detect floating detached ornaments (crystals, floating runestones, floating obsidian shards)
    op = base_cell[:, :, 3] >= 128
    lbl, n_comp = ndimage.label(op, structure=STRUCT8)
    comp_sizes = np.bincount(lbl.ravel())
    comp_sizes[0] = 0
    main_id = int(np.argmax(comp_sizes)) if n_comp > 0 else 0

    floating_masks: list[tuple[np.ndarray, int]] = []
    for cid in range(1, n_comp + 1):
        if cid == main_id or comp_sizes[cid] < 3:
            continue
        cmask = lbl == cid
        ys, xs = np.where(cmask)
        # Left vs right phase offset so floating stones bob organically
        phase_sign = 0 if int(xs.mean()) < 64 else 2
        floating_masks.append((cmask, phase_sign))

    # Build static base (without detached floating pieces so we can re-composite them bobbing!)
    static_base = base_cell.copy()
    for cmask, _ in floating_masks:
        static_base[cmask] = 0

    # Vortex center & polar coords
    cx = ox + cfg["vortex_center"][0] * nw
    cy = oy + cfg["vortex_center"][1] * nh
    vys, vxs = np.where(vortex_mask)
    if len(vxs) > 20:
        # Refine center slightly toward actual vortex centroid
        cx = 0.5 * cx + 0.5 * float(vxs.mean())
        cy = 0.5 * cy + 0.5 * float(vys.mean())
    vx_span = max(12.0, (float(vxs.max() - vxs.min()) * 0.5) if len(vxs) else 18.0)
    vy_span = max(16.0, (float(vys.max() - vys.min()) * 0.5) if len(vys) else 28.0)

    # Detect glowing accents ON the archway (gems, carved runes, lantern flames) outside the vortex
    r0 = static_base[:, :, 0].astype(np.int16)
    g0 = static_base[:, :, 1].astype(np.int16)
    b0 = static_base[:, :, 2].astype(np.int16)
    non_vortex = (static_base[:, :, 3] >= 128) & (~vortex_mask)
    z = cfg["zone"]
    if z == 0:
        # Glowing star/moon gold filigree & cyan rune sparkles
        accent_mask = non_vortex & ((r0 >= 210) & (g0 >= 180) & (b0 <= 125))
    elif z == 1:
        # Glowing cyan/aqua crystals & carved runes on oak pillars
        accent_mask = non_vortex & (b0 >= 145) & (g0 >= 160)
    elif z == 2:
        # Hanging spectral lantern flames (bright cyan-white & violet fire)
        accent_mask = non_vortex & (((b0 >= 175) & (g0 >= 150)) | ((r0 >= 165) & (b0 >= 200) & (g0 < 155)))
    else:
        # Glowing violet rift-gems & bright gold crest tips
        accent_mask = non_vortex & (((b0 >= 140) & (r0 >= 100) & (g0 <= 120)) | ((r0 >= 215) & (g0 >= 175) & (b0 <= 100)))

    # Precompute base vortex luminance map for texture richness
    base_luma = (
        0.299 * static_base[:, :, 0].astype(np.float32)
        + 0.587 * static_base[:, :, 1].astype(np.float32)
        + 0.114 * static_base[:, :, 2].astype(np.float32)
    ) / 255.0

    # Bayer 4x4 matrix for crisp retro HD-2D swirl dithering
    bayer4 = (
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
        - 0.5
    )

    yy, xx = np.mgrid[0:128, 0:128]
    nx = (xx - cx) / vx_span
    ny = (yy - cy) / vy_span
    rad = np.sqrt(nx * nx + ny * ny)
    ang = np.arctan2(ny, nx)

    frames: list[np.ndarray] = []
    bob_cycle = [0, -1, -2, -1]
    pulse_cycle = [1.00, 1.12, 1.22, 1.10]

    for f in range(4):
        frame = static_base.copy()
        phase = f * (math.pi * 0.5)  # 0, 90, 180, 270 deg seamless 4-frame spin!

        # 1. Animate churning dimensional vortex inside vortex_mask
        if len(vxs) > 0:
            # Rotate original vortex image around (cx, cy) with elliptical aspect compensation
            cos_p = math.cos(-phase)
            sin_p = math.sin(-phase)
            # Sample original vortex with gentle inward spiral pull
            rot_nx = nx * cos_p - ny * sin_p
            rot_ny = nx * sin_p + ny * cos_p
            sx = np.clip(np.rint(cx + rot_nx * vx_span).astype(np.int32), 0, 127)
            sy = np.clip(np.rint(cy + rot_ny * vy_span).astype(np.int32), 0, 127)
            src_valid = vortex_mask[sy, sx]

            # Procedural 3-arm logarithmic pixel-art vortex wave matching the biome palette
            arms = 3.0 if z != 3 else 4.0
            twist = 5.4 if z != 1 else 6.2
            spiral_val = 0.5 + 0.5 * np.sin(arms * ang - rad * twist + phase)
            # Secondary counter-ripple for rich fluid energy depth
            ripple = 0.5 + 0.5 * np.cos(2.0 * ang + rad * 7.5 - phase)
            core_glow = np.exp(-((rad * 1.45) ** 2))
            rim_darken = np.clip(1.0 - np.maximum(0.0, rad - 0.62) * 0.85, 0.22, 1.0)
            core_pulse = 0.94 + 0.14 * math.sin(phase)

            # Blend original sampled vortex luminance (where valid) with crisp spinning spiral energy
            orig_l = np.where(src_valid, base_luma[sy, sx], base_luma)
            energy = (
                0.38 * orig_l
                + 0.42 * (0.72 * spiral_val + 0.28 * ripple) * rim_darken
                + 0.42 * core_glow * core_pulse
            )
            # Subtle 4x4 Bayer ordered dither before quantizing to biome ramp
            dither = bayer4[yy & 3, xx & 3] * 0.11
            energy = np.clip(energy + dither, 0.0, 0.999)

            vortex_rgb = sample_palette(cfg["vortex_palette"], energy)

            # Keep bright crisp central hot-spot pulsing
            hot_r = 0.19 + 0.04 * math.sin(phase)
            hot_core = vortex_mask & (rad < hot_r)
            vortex_rgb[hot_core] = cfg["vortex_palette"][-1]

            # Apply ONLY inside vortex_mask so stone archways & dangling chains stay 100% razor-sharp!
            frame[vortex_mask, :3] = vortex_rgb[vortex_mask]
            frame[vortex_mask, 3] = 255

            # Add 6 orbiting luminous pixel sparks / runes inside the vortex!
            sparks = cfg["spark_colors"]
            for s_idx in range(6):
                a_s = phase + s_idx * (math.pi / 3.0) + 0.35
                r_s = 0.30 + 0.44 * (((s_idx * 0.37 + f * 0.25) % 1.0))
                px = int(round(cx + math.cos(a_s) * vx_span * r_s))
                py = int(round(cy + math.sin(a_s) * vy_span * r_s))
                if 4 <= px < 124 and 4 <= py < 122 and vortex_mask[py, px]:
                    col = sparks[s_idx % len(sparks)]
                    frame[py, px, :3] = col
                    # Cross glint on every other spark
                    if (s_idx + f) % 2 == 0:
                        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                            if vortex_mask[py + dy, px + dx]:
                                frame[py + dy, px + dx, :3] = sparks[(s_idx + 1) % len(sparks)]

        # 2. Pulse glowing arch runes, gems, and spectral lantern flames
        if np.any(accent_mask):
            boost = pulse_cycle[f]
            if boost != 1.0:
                acc = frame[accent_mask, :3].astype(np.float32) * boost
                frame[accent_mask, :3] = np.clip(np.rint(acc), 0, 255).astype(np.uint8)

        # 3. Re-composite floating runes/crystals/shards with smooth vertical bob!
        for cmask, p_off in floating_masks:
            dy = bob_cycle[(f + p_off) & 3]
            ys, xs = np.where(cmask)
            nys = ys + dy
            # Guarantee >= 4px inner margin safety
            if nys.min() < 4 or nys.max() > 123:
                nys = ys
            frame[nys, xs] = base_cell[ys, xs]

        # Enforce hard 4px safety perimeter & binary alpha
        frame[:4, :, :] = 0
        frame[124:, :, :] = 0
        frame[:, :4, :] = 0
        frame[:, 124:, :] = 0
        frame[:, :, 3] = np.where(frame[:, :, 3] >= 128, 255, 0).astype(np.uint8)
        frames.append(frame)

    return frames


def draw_pixel_line(buf: np.ndarray, x0: int, y0: int, x1: int, y1: int, col: tuple[int, int, int], thick: int = 1):
    """Crisp Bresenham pixel line with optional thickness onto 128x128 RGBA buffer."""
    steps = max(abs(x1 - x0), abs(y1 - y0), 1)
    for i in range(steps + 1):
        t = i / steps
        x = int(round(x0 + (x1 - x0) * t))
        y = int(round(y0 + (y1 - y0) * t))
        r0 = -(thick // 2)
        r1 = r0 + thick
        for dy in range(r0, r1):
            for dx in range(r0, r1):
                px, py = x + dx, y + dy
                if 5 <= px < 123 and 5 <= py < 123:
                    buf[py, px, :3] = col
                    buf[py, px, 3] = 255


def build_ground_rune_seal(cfg: dict) -> np.ndarray:
    """Builds a razor-sharp 128x128 circular top-down HD-2D Arcane Summoning Seal.

    When projected by AdventureManager.js (176x74..196x82) & Monster.js (116x40..148x52),
    this full circular seal transforms into a crisp, richly detailed 2.5D foreshortened
    summoning circle with zero double-squashing!
    """
    pal = cfg["seal_palette"]
    buf = np.zeros((128, 128, 4), dtype=np.uint8)
    cx, cy = 63.5, 63.5
    yy, xx = np.mgrid[0:128, 0:128]
    dx = xx - cx
    dy = yy - cy
    dist = np.sqrt(dx * dx + dy * dy)
    ang = np.arctan2(dy, dx)

    bayer4 = (
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
    checker = ((xx + yy) & 1) == 0

    def paint(mask: np.ndarray, col: tuple[int, int, int]):
        buf[mask, :3] = col
        buf[mask, 3] = 255

    # 1. Subtle dithered inner arcane basin (pixel checkerboard/Bayer so floor shows cleanly through!)
    basin_deep = (dist >= 16.0) & (dist <= 47.0) & (bayer4[yy & 3, xx & 3] < 0.36)
    paint(basin_deep, pal["glow_deep"])
    basin_mid = (dist >= 12.0) & (dist <= 34.0) & (bayer4[yy & 3, xx & 3] < 0.44)
    paint(basin_mid, pal["glow_mid"])

    # 2. Concentric outer beveled ring (r = 50..56) with crisp #0d0f1c double border
    paint((dist >= 55.2) & (dist <= 57.5), tuple(OUTLINE_RGB))
    paint((dist >= 50.5) & (dist < 55.2), pal["rim_dark"])
    # Upper-left highlight bevel vs lower-right shade on ring
    bevel_hi = (dist >= 51.6) & (dist <= 54.4) & (dx + dy < 14)
    bevel_mid = (dist >= 51.6) & (dist <= 54.4) & (dx + dy >= 14)
    paint(bevel_mid, pal["rim_mid"])
    paint(bevel_hi, pal["rim_hi"])
    paint((dist >= 48.8) & (dist < 50.5), tuple(OUTLINE_RGB))

    # 3. Inner runic channel ring (r = 38.5..42.0)
    paint((dist >= 41.2) & (dist <= 42.8), tuple(OUTLINE_RGB))
    paint((dist >= 38.6) & (dist < 41.2), pal["glow_bright"])
    paint((dist >= 37.2) & (dist < 38.6), tuple(OUTLINE_RGB))

    # 4. Carved runic glyphs spaced around the outer arcane band (r = 43.2..48.2, 16 glyphs)
    for k in range(16):
        theta = k * (2.0 * math.pi / 16.0)
        gx = int(round(cx + math.cos(theta) * 45.4))
        gy = int(round(cy + math.sin(theta) * 45.4))
        col = pal["rim_hi"] if (k % 2 == 0) else pal["glow_bright"]
        # Crisp 3x3 runic notch or diamond
        for oy in range(-1, 2):
            for ox in range(-1, 2):
                if abs(ox) + abs(oy) <= 1 or (k % 2 == 0 and abs(ox) == 1 and oy == 0):
                    buf[gy + oy, gx + ox, :3] = col
                    buf[gy + oy, gx + ox, 3] = 255

    # 5. Biome-specific inscribed Sacred Geometry Star inside r = 38
    mode = pal["star_mode"]
    star_r = 37.5
    if mode == "octagram":
        # Two interlocking rotated squares (8-point celestial star)
        for offset in (0.0, math.pi / 4.0):
            pts = [
                (int(round(cx + math.cos(offset + i * math.pi / 2.0) * star_r)),
                 int(round(cy + math.sin(offset + i * math.pi / 2.0) * star_r)))
                for i in range(4)
            ]
            for i in range(4):
                x0, y0 = pts[i]
                x1, y1 = pts[(i + 1) % 4]
                draw_pixel_line(buf, x0, y0, x1, y1, tuple(OUTLINE_RGB), thick=4)
                draw_pixel_line(buf, x0, y0, x1, y1, pal["rim_mid"], thick=2)
                draw_pixel_line(buf, x0, y0, x1, y1, pal["rim_hi"], thick=1)
    elif mode == "hexagram":
        # Interlocking emerald hexagram + 6 radiant petal spokes
        for offset in (-math.pi / 2.0, math.pi / 2.0):
            pts = [
                (int(round(cx + math.cos(offset + i * 2.0 * math.pi / 3.0) * star_r)),
                 int(round(cy + math.sin(offset + i * 2.0 * math.pi / 3.0) * star_r)))
                for i in range(3)
            ]
            for i in range(3):
                x0, y0 = pts[i]
                x1, y1 = pts[(i + 1) % 3]
                draw_pixel_line(buf, x0, y0, x1, y1, tuple(OUTLINE_RGB), thick=4)
                draw_pixel_line(buf, x0, y0, x1, y1, pal["glow_mid"], thick=2)
                draw_pixel_line(buf, x0, y0, x1, y1, pal["rim_hi"], thick=1)
    elif mode == "crypt":
        # Gothic 6-point inverted seal + cross-spokes
        for offset in (math.pi / 6.0, math.pi / 2.0):
            pts = [
                (int(round(cx + math.cos(offset + i * 2.0 * math.pi / 3.0) * star_r)),
                 int(round(cy + math.sin(offset + i * 2.0 * math.pi / 3.0) * star_r)))
                for i in range(3)
            ]
            for i in range(3):
                x0, y0 = pts[i]
                x1, y1 = pts[(i + 1) % 3]
                draw_pixel_line(buf, x0, y0, x1, y1, tuple(OUTLINE_RGB), thick=4)
                draw_pixel_line(buf, x0, y0, x1, y1, pal["glow_mid"], thick=2)
                draw_pixel_line(buf, x0, y0, x1, y1, pal["glow_bright"], thick=1)
        # Cardinal iron crossbars
        for k in range(4):
            a = k * math.pi / 2.0
            draw_pixel_line(
                buf,
                int(round(cx + math.cos(a) * 14)),
                int(round(cy + math.sin(a) * 14)),
                int(round(cx + math.cos(a) * 38)),
                int(round(cy + math.sin(a) * 38)),
                pal["rim_hi"],
                thick=2,
            )
    else:  # infernal
        # Sharp 8-pointed chaos star (connecting every 3rd vertex of octagon!)
        pts = [
            (int(round(cx + math.cos(i * math.pi / 4.0) * star_r)),
             int(round(cy + math.sin(i * math.pi / 4.0) * star_r)))
            for i in range(8)
        ]
        for i in range(8):
            x0, y0 = pts[i]
            x1, y1 = pts[(i + 3) % 8]
            draw_pixel_line(buf, x0, y0, x1, y1, tuple(OUTLINE_RGB), thick=4)
            draw_pixel_line(buf, x0, y0, x1, y1, pal["glow_mid"], thick=2)
            draw_pixel_line(buf, x0, y0, x1, y1, pal["rim_hi"], thick=1)

    # 6. Inner core ring & luminous center vortex jewel (r = 0..16)
    paint((dist >= 15.0) & (dist <= 16.8), tuple(OUTLINE_RGB))
    paint((dist >= 12.2) & (dist < 15.0), pal["rim_mid"])
    paint((dist >= 12.8) & (dist <= 14.2) & (dx + dy < 4), pal["rim_hi"])
    paint((dist >= 10.6) & (dist < 12.2), tuple(OUTLINE_RGB))
    paint((dist >= 6.0) & (dist < 10.6), pal["glow_bright"])
    paint(dist < 6.0, pal["core"])
    # Subtle inner spiral arms inside core
    swirl_in = (dist >= 4.0) & (dist < 10.6) & (np.sin(3.0 * ang - dist * 0.65) > 0.35)
    paint(swirl_in, pal["core"])

    # 7. 8 Cardinal & Ordinal Beveled Medallion Gems anchored on outer ring (r = 53)
    for k in range(8):
        theta = k * (math.pi / 4.0)
        mx = int(round(cx + math.cos(theta) * 53.0))
        my = int(round(cy + math.sin(theta) * 53.0))
        rad_g = 4 if (k % 2 == 0) else 3
        for oy in range(-rad_g, rad_g + 1):
            for ox in range(-rad_g, rad_g + 1):
                md = abs(ox) + abs(oy)
                px, py = mx + ox, my + oy
                if not (4 <= px < 124 and 4 <= py < 124):
                    continue
                if md == rad_g:
                    buf[py, px, :3] = OUTLINE_RGB
                    buf[py, px, 3] = 255
                elif md == rad_g - 1:
                    buf[py, px, :3] = pal["glow_mid"] if (k % 2 == 0) else pal["rim_mid"]
                    buf[py, px, 3] = 255
                elif md < rad_g - 1:
                    buf[py, px, :3] = pal["core"] if (ox <= 0 and oy <= 0) else pal["glow_bright"]
                    buf[py, px, 3] = 255

    # Hard 4px perimeter clear + strict binary alpha
    buf[:4, :, :] = 0
    buf[124:, :, :] = 0
    buf[:, :4, :] = 0
    buf[:, 124:, :] = 0
    buf[:, :, 3] = np.where(buf[:, :, 3] >= 128, 255, 0).astype(np.uint8)
    return buf


def main() -> None:
    if not FX_SHEET_PATH.exists():
        raise FileNotFoundError(f"Missing existing sheet: {FX_SHEET_PATH}")

    sheet_im = Image.open(FX_SHEET_PATH).convert("RGBA")
    if sheet_im.size != (1024, 640):
        raise RuntimeError(f"Expected adv_fx_sheet.png to be 1024x640, got {sheet_im.size}")
    sheet = np.array(sheet_im, dtype=np.uint8)

    contact_rows = []
    for cfg in ZONE_CONFIGS:
        z = cfg["zone"]
        print(f"[Portals v2] Processing {cfg['name']}...")
        rgba_hi = extract_chroma_rgba(cfg["src"], z)
        base_cell, bbox = fit_portal_to_128(rgba_hi, z)
        frames = animate_portal_frames(base_cell, bbox, cfg)
        seal = build_ground_rune_seal(cfg)

        # Audit each portal frame
        for f_idx, fr in enumerate(frames):
            a = fr[:, :, 3]
            semi = int(np.sum((a > 0) & (a < 255)))
            border_px = int(
                np.sum(a[:4, :] > 0)
                + np.sum(a[124:, :] > 0)
                + np.sum(a[:, :4] > 0)
                + np.sum(a[:, 124:] > 0)
            )
            op_cnt = int(np.sum(a == 255))
            if semi != 0 or border_px != 0 or op_cnt < 1500:
                raise RuntimeError(
                    f"Audit failed on Z{z} F{f_idx}: semi={semi}, border={border_px}, op={op_cnt}"
                )
            y0 = z * 128
            x0 = f_idx * 128
            sheet[y0 : y0 + 128, x0 : x0 + 128] = fr

        # Audit ground seal
        sa = seal[:, :, 3]
        s_semi = int(np.sum((sa > 0) & (sa < 255)))
        s_border = int(
            np.sum(sa[:4, :] > 0)
            + np.sum(sa[124:, :] > 0)
            + np.sum(sa[:, :4] > 0)
            + np.sum(sa[:, 124:] > 0)
        )
        s_op = int(np.sum(sa == 255))
        if s_semi != 0 or s_border != 0 or s_op < 2000:
            raise RuntimeError(f"Audit failed on Z{z} Seal: semi={s_semi}, border={s_border}, op={s_op}")
        sheet[512:640, (4 + z) * 128 : (5 + z) * 128] = seal

        # Build 2x contact row (4 frames + circular seal + 2.4:1 foreshortened seal preview)
        row_strip = np.zeros((128, 128 * 6, 4), dtype=np.uint8)
        for f_idx, fr in enumerate(frames):
            row_strip[:, f_idx * 128 : (f_idx + 1) * 128] = fr
        row_strip[:, 4 * 128 : 5 * 128] = seal
        # Foreshortened seal preview (matches AdventureManager 176x74 aspect!)
        seal_iso = np.array(
            Image.fromarray(seal, mode="RGBA").resize((120, 50), Image.Resampling.NEAREST),
            dtype=np.uint8,
        )
        row_strip[39:89, 5 * 128 + 4 : 5 * 128 + 124] = seal_iso
        contact_rows.append(row_strip)
        print(f"  -> Z{z} OK: bbox={bbox}, seal_op={s_op}")

    out_im = Image.fromarray(sheet, mode="RGBA")
    out_im.save(FX_SHEET_PATH, format="PNG", optimize=True)
    print(f"[Portals v2] Saved lossless 1024x640 sheet -> {FX_SHEET_PATH}")

    # Save 2x contact preview over dark slate background for quick visual inspection
    CONTACT_PATH.parent.mkdir(parents=True, exist_ok=True)
    contact_rgba = np.vstack(contact_rows)
    ch, cw = contact_rgba.shape[:2]
    bg = Image.new("RGBA", (cw, ch), (20, 24, 38, 255))
    bg.alpha_composite(Image.fromarray(contact_rgba, mode="RGBA"))
    bg = bg.resize((cw * 2, ch * 2), Image.Resampling.NEAREST)
    bg.save(CONTACT_PATH, format="PNG")
    print(f"[Portals v2] Saved 2x contact preview -> {CONTACT_PATH}")


if __name__ == "__main__":
    main()
