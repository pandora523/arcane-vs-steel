#!/usr/bin/env python3
"""
Builds `assets/sprites/adv_fx_sheet.png` (`1024 x 640` RGBA = `8 cols x 5 rows` of `128x128` cells)
from generated 16-bit HD-2D reference art (`adv_realm_portals_hd2d` & `adv_stage_fx_hd2d`) using the
true chunky `64x64 -> 128x128` (`2x NEAREST`, `100.0%` `2x2` pixel blocks) HD-2D pipeline:

  1. Border + pastel-halo + enclosed white-pocket BFS flood-fill strip
  2. Heavy pre-downsample cel-flattening (`MedianFilter(7, 5)` + cel posterization) onto a `64x64`
     logical grid (`1px` logical = `2px` sheet = `~3.2px` world texels matching Champions `1:1`!)
  3. Stationary flat-cel stone/briar/skull/obsidian portal arches (`Cols 0..3`) paired with a
     4-frame stepped pixel-art spiral vortex + `4x4` Bayer ordered stipple + pixel `+` glints
     (replacing the soft AI-painted interior swirl!)
  4. `64x64 -> 128x128` (`2x NEAREST`) stage flames/wisps (`Cols 4..7`, `Row 4 Cols 0..3`) and
     foreshortened 2.5D Ground Portal Rune Seals (`Row 4 Cols 4..7`)
  5. Strict `0` border bleed, `0` semi-alpha, and `100.0%` `2x2` pixel block uniformity!
"""

import math
import os
import numpy as np
from PIL import Image, ImageDraw

from build_adventure_props_sheet import (
    CELL,
    SELOUT_RGB,
    despeckle_and_selout_grid,
    hex_pal,
    measure_block_uniformity,
    pixelize_to_logical_grid,
    strip_white_bg_quadrant,
    upscale_nearest_rgba,
)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPRITES_DIR = os.path.join(ROOT, "assets", "sprites")
ARTIFACT_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/b9d8130e-8764-4ace-8d4e-40f97049d6f1"
SCRATCH_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/7821d65d-384a-4e26-8167-f32a84e377d8/scratch"

SRC_PORTALS = os.path.join(ARTIFACT_DIR, "adv_realm_portals_hd2d_1794570253987.jpg")
SRC_FX = os.path.join(ARTIFACT_DIR, "adv_stage_fx_hd2d_1794570251563.jpg")

LOGICAL_FX = 64

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

# Tight high-contrast 12–14 color cel palettes per Realm portal & FX
FX_PALETTES = {
    "z0_portal": hex_pal([
        "#0d0f1c", "#17243d", "#2b4166", "#4b6a99", "#7d9ec9",
        "#543b18", "#9e722b", "#e6b44c", "#fff2a6",
        "#0a476b", "#178ec2", "#4ce0ff", "#bff8ff", "#ffffff",
    ]),
    "z1_portal": hex_pal([
        "#0d0f1c", "#241d17", "#45362a", "#6e5643",
        "#1f362c", "#3b6352",
        "#21522a", "#4b8f52",
        "#08524b", "#139c8c", "#35e8cc", "#9effef", "#ffffff",
    ]),
    "z2_portal": hex_pal([
        "#0d0f1c", "#1d1b30", "#383457", "#5e5887", "#8f89ba",
        "#524e59", "#8c8696", "#cfc9db",
        "#2e0b4a", "#68199e", "#ab38f0", "#df82ff", "#fae0ff", "#ffffff",
    ]),
    "z3_portal": hex_pal([
        "#0d0f1c", "#1c1824", "#342d40", "#574d69", "#807494",
        "#470c10", "#8c1818", "#cf331d", "#fa6b20", "#ffa82e", "#ffe366", "#ffffff",
    ]),
    "z0_flame": hex_pal([
        "#0d0f1c", "#0b2659", "#154fa3", "#2484e6", "#4cc2ff", "#9ef0ff", "#ffffff",
    ]),
    "z0_solar": hex_pal([
        "#0d0f1c", "#4d110e", "#992414", "#de4f18", "#ff8f24", "#ffd24d", "#ffffff",
    ]),
    "z1_wisp": hex_pal([
        "#0d0f1c", "#0a3d38", "#157568", "#24b59e", "#57f2d6", "#b8fff0", "#ffffff",
        "#1c5e36", "#45ab68",
    ]),
    "z2_flame": hex_pal([
        "#0d0f1c", "#300a4d", "#631699", "#9e2be0", "#d466ff", "#f5bdff", "#ffffff",
    ]),
    "z3_flame": hex_pal([
        "#0d0f1c", "#4a0c0e", "#941c14", "#d94218", "#ff8221", "#ffc942", "#ffffff",
    ]),
}

# 5-step cel vortex ramps (`[void_rim, deep_band, mid_spiral, bright_arm, core_eye]`)
VORTEX_RAMPS = {
    "z0_portal": [
        (10, 42, 74),
        (14, 92, 138),
        (28, 162, 214),
        (92, 232, 255),
        (240, 252, 255),
    ],
    "z1_portal": [
        (8, 52, 48),
        (14, 104, 92),
        (32, 178, 156),
        (88, 242, 212),
        (232, 255, 246),
    ],
    "z2_portal": [
        (34, 10, 58),
        (78, 22, 126),
        (142, 46, 216),
        (214, 112, 255),
        (250, 224, 255),
    ],
    "z3_portal": [
        (52, 10, 14),
        (118, 22, 20),
        (204, 52, 26),
        (252, 134, 34),
        (255, 240, 138),
    ],
}


def stamp_pixel_vortex_on_grid64(
    base_arch64: np.ndarray,
    vortex_ramp: list[tuple[int, int, int]],
    accent_spark_rgb: tuple[int, int, int],
    frame_idx: int,
    cx_rel: float,
    cy_rel: float,
    rx_rel: float,
    ry_rel: float,
) -> np.ndarray:
    """
    Replaces the smooth AI-painted portal center with an authentic 16-bit stepped pixel-art
    2-arm spiral vortex + `4x4` Bayer ordered stipple dither + crisp pixel `+` sparks on `64x64`,
    keeping the carved outer arch 100% rock-solid stationary across all 4 frames!
    """
    out = base_arch64.copy()
    a = out[:, :, 3] > 0
    ys, xs = np.where(a)
    y0, y1 = int(ys.min()), int(ys.max())
    x0, x1 = int(xs.min()), int(xs.max())
    bw = max(12, x1 - x0)
    bh = max(12, y1 - y0)

    cx = x0 + bw * cx_rel
    cy = y0 + bh * cy_rel
    rx = max(5.0, bw * rx_rel)
    ry = max(7.0, bh * ry_rel)
    phase = (frame_idx / 4.0) * (2.0 * math.pi)

    # Interior mask so we never overwrite the outer `#0d0f1c` Selout contour
    interior = np.zeros_like(a)
    interior[2:-2, 2:-2] = (
        a[2:-2, 2:-2] & a[1:-3, 2:-2] & a[3:-1, 2:-2] & a[2:-2, 1:-3] & a[2:-2, 3:-1]
    )

    for y in range(max(2, int(cy - ry - 2)), min(LOGICAL_FX - 2, int(cy + ry + 3))):
        for x in range(max(2, int(cx - rx - 2)), min(LOGICAL_FX - 2, int(cx + rx + 3))):
            if not interior[y, x]:
                continue
            nx = (x - cx) / rx
            ny = (y - cy) / ry
            r = math.hypot(nx, ny)
            if r > 1.02:
                continue
            if r >= 0.90:
                # Crisp dark inner arch bevel separating carved stone/root/bone from vortex energy
                out[y, x, :3] = SELOUT_RGB if r >= 0.96 else vortex_ramp[0]
                continue

            theta = math.atan2(ny, nx)
            # 2-arm logarithmic pixel spiral + stepped radial energy + 4x4 Bayer stipple
            arm = 0.5 + 0.5 * math.sin(2.0 * theta + r * 6.8 - phase)
            sub_ripple = 0.5 + 0.5 * math.cos(3.0 * theta - r * 4.2 + phase)
            bayer = BAYER_4X4[y & 3, x & 3] - 0.5
            energy = (1.0 - r * 0.80) * 0.58 + arm * 0.34 + sub_ripple * 0.10 + bayer * 0.17

            if r <= 0.17:
                col = vortex_ramp[4]
            elif energy >= 0.78:
                col = vortex_ramp[4]
            elif energy >= 0.58:
                col = vortex_ramp[3]
            elif energy >= 0.38:
                col = vortex_ramp[2]
            elif energy >= 0.22:
                col = vortex_ramp[1]
            else:
                col = vortex_ramp[0]
            out[y, x, :3] = col

    # Stamp 2 orbiting crisp pixel glints inside the vortex
    for sp in range(2):
        ang = phase + sp * math.pi + 0.55
        rad = 0.48 if sp == 0 else 0.64
        sx = int(round(cx + math.cos(ang) * rx * rad))
        sy = int(round(cy + math.sin(ang) * ry * rad))
        if 3 <= sx < LOGICAL_FX - 3 and 3 <= sy < LOGICAL_FX - 3 and interior[sy, sx]:
            out[sy, sx, :3] = (255, 255, 255)
            if sp == 0:
                for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    if interior[sy + dy, sx + dx]:
                        out[sy + dy, sx + dx, :3] = accent_spark_rgb

    return out


def warp_flame_frame_hi(rgba_hi: np.ndarray, frame_idx: int, is_wisp: bool = False) -> np.ndarray:
    if frame_idx == 0:
        return rgba_hi.copy()

    H, W, _ = rgba_hi.shape
    ys, xs = np.where(rgba_hi[:, :, 3] > 128)
    y0, y1 = int(ys.min()), int(ys.max())
    bh = max(16, y1 - y0)

    phase = (frame_idx / 4.0) * (2.0 * math.pi)
    out = np.zeros_like(rgba_hi)

    yy, xx = np.mgrid[0:H, 0:W]
    u = np.clip((y1 - yy) / float(bh), 0.0, 1.0)

    if is_wisp:
        bob_y = int(round(math.sin(phase) * (bh * 0.05)))
        sway_x = np.round(np.sin(phase + (1.0 - u) * 3.8) * (bh * 0.04) * (1.0 - u * 0.5)).astype(np.int32)
        sy = np.clip(yy - bob_y, 0, H - 1)
        sx = np.clip(xx - sway_x, 0, W - 1)
    else:
        stretch = 1.0 + 0.065 * math.sin(phase)
        sway_x = np.round(np.sin(phase - u * 4.4) * (bh * 0.065) * (u ** 1.15)).astype(np.int32)
        sy = np.clip(np.round(y1 - (y1 - yy) / stretch).astype(np.int32), 0, H - 1)
        sx = np.clip(xx - sway_x, 0, W - 1)

    out[:, :, :] = rgba_hi[sy, sx, :]
    return out


def recolor_cyan_flame_to_solar(rgba_hi: np.ndarray) -> np.ndarray:
    out = rgba_hi.copy()
    rgb = out[:, :, :3].astype(np.float32)
    luma = 0.2126 * rgb[:, :, 0] + 0.7152 * rgb[:, :, 1] + 0.0722 * rgb[:, :, 2]
    t = np.clip(luma / 255.0, 0.0, 1.0)
    r = np.clip(28.0 + 340.0 * (t ** 0.72), 0, 255)
    g = np.clip(8.0 + 265.0 * (t ** 1.35), 0, 255)
    b = np.clip(14.0 + 220.0 * (t ** 2.8), 0, 255)
    mask = out[:, :, 3] > 0
    out[mask, 0] = r[mask].astype(np.uint8)
    out[mask, 1] = g[mask].astype(np.uint8)
    out[mask, 2] = b[mask].astype(np.uint8)
    return out


def build_ground_portal_seal_cell(pal: np.ndarray, rim_rgb, mid_rgb, core_rgb) -> np.ndarray:
    """
    Builds a crisp foreshortened 2.5D elliptical HD-2D Runic Portal Ground Seal on `64x64`
    and upscales `2x NEAREST -> 128x128` (`100%` `2x2` chunky pixel blocks!).
    """
    grid = np.zeros((LOGICAL_FX, LOGICAL_FX, 4), dtype=np.uint8)
    cx, cy = 32.0, 37.0
    rx, ry = 27.0, 10.0
    for y in range(21, 53):
        for x in range(3, 61):
            nx = (x - cx) / rx
            ny = (y - cy) / ry
            d = math.hypot(nx, ny)
            if d > 1.04:
                continue
            ang = math.atan2(ny, nx)
            spoke = abs(math.sin(ang * 4.0)) < 0.19
            if 0.84 <= d <= 1.04:
                grid[y, x] = (*rim_rgb, 255)
            elif 0.70 <= d < 0.84:
                grid[y, x] = (*core_rgb, 255) if int((ang + math.pi) * 4.0) % 2 == 0 else (*mid_rgb, 255)
            elif 0.44 <= d <= 0.58 or (d < 0.70 and spoke):
                grid[y, x] = (*mid_rgb, 255)
            elif d <= 0.26:
                grid[y, x] = (*core_rgb, 255)

    shade_pal = pal[1:] if len(pal) > 2 else pal
    a = grid[:, :, 3] > 0
    rgb = grid[:, :, :3].astype(np.int32)
    ys, xs = np.where(a)
    for y, x in zip(ys, xs):
        dists = np.sum((shade_pal - rgb[y, x]) ** 2, axis=1)
        grid[y, x, :3] = shade_pal[int(np.argmin(dists))].astype(np.uint8)

    grid = despeckle_and_selout_grid(grid, margin=2, despeckle_passes=1, min_comp=3)
    return upscale_nearest_rgba(grid, 2)


def main():
    os.makedirs(SCRATCH_DIR, exist_ok=True)
    im_portals = np.array(Image.open(SRC_PORTALS).convert("RGB"))
    im_fx = np.array(Image.open(SRC_FX).convert("RGB"))

    def quad(arr: np.ndarray, row: int, col: int, pad: int = 14) -> np.ndarray:
        H, W, _ = arr.shape
        mh, mw = H // 2, W // 2
        return arr[row * mh + pad : (row + 1) * mh - pad, col * mw + pad : (col + 1) * mw - pad, :].copy()

    portal_defs = [
        ("z0_portal", quad(im_portals, 0, 0), 0.50, 0.55, 0.25, 0.31, (255, 242, 166)),
        ("z1_portal", quad(im_portals, 0, 1), 0.51, 0.52, 0.24, 0.31, (158, 255, 239)),
        ("z2_portal", quad(im_portals, 1, 0), 0.50, 0.55, 0.25, 0.31, (250, 224, 255)),
        ("z3_portal", quad(im_portals, 1, 1), 0.50, 0.54, 0.23, 0.30, (255, 227, 102)),
    ]

    fx_defs = [
        ("z0_flame", quad(im_fx, 0, 0), False, 54, 46, 59),
        ("z1_wisp", quad(im_fx, 0, 1), True, 48, 46, 56),
        ("z2_flame", quad(im_fx, 1, 0), False, 54, 46, 59),
        ("z3_flame", quad(im_fx, 1, 1), False, 54, 46, 59),
    ]

    atlas = np.zeros((5 * CELL, 8 * CELL, 4), dtype=np.uint8)

    z0_cyan_hi = None
    for r_idx in range(4):
        pkey, pq_rgb, cx_r, cy_r, rx_r, ry_r, spark_rgb = portal_defs[r_idx]
        p_hi = strip_white_bg_quadrant(pq_rgb, strip_pastel_glow=True)
        base_arch64 = pixelize_to_logical_grid(
            p_hi,
            FX_PALETTES[pkey],
            grid_sz=LOGICAL_FX,
            target_h=58,
            target_max_w=55,
            bottom_y=61,
            median_passes=(7, 5),
            posterize_step=28,
            margin=2,
            despeckle_passes=3,
        )
        for f_idx in range(4):
            p_grid64 = stamp_pixel_vortex_on_grid64(
                base_arch64,
                VORTEX_RAMPS[pkey],
                spark_rgb,
                f_idx,
                cx_r,
                cy_r,
                rx_r,
                ry_r,
            )
            p_cell = upscale_nearest_rgba(p_grid64, 2)
            atlas[r_idx * CELL : (r_idx + 1) * CELL, f_idx * CELL : (f_idx + 1) * CELL] = p_cell

        fkey, fq_rgb, is_wisp, th64, tw64, by64 = fx_defs[r_idx]
        f_hi = strip_white_bg_quadrant(fq_rgb, strip_pastel_glow=True)
        if r_idx == 0:
            z0_cyan_hi = f_hi
        for f_idx in range(4):
            warped_f = warp_flame_frame_hi(f_hi, f_idx, is_wisp=is_wisp)
            f_grid64 = pixelize_to_logical_grid(
                warped_f,
                FX_PALETTES[fkey],
                grid_sz=LOGICAL_FX,
                target_h=th64,
                target_max_w=tw64,
                bottom_y=by64,
                median_passes=(7, 5),
                posterize_step=28,
                margin=2,
                despeckle_passes=2,
            )
            c_idx = 4 + f_idx
            atlas[r_idx * CELL : (r_idx + 1) * CELL, c_idx * CELL : (c_idx + 1) * CELL] = upscale_nearest_rgba(f_grid64, 2)

    solar_hi = recolor_cyan_flame_to_solar(z0_cyan_hi)
    for f_idx in range(4):
        warped_s = warp_flame_frame_hi(solar_hi, f_idx, is_wisp=False)
        s_grid64 = pixelize_to_logical_grid(
            warped_s,
            FX_PALETTES["z0_solar"],
            grid_sz=LOGICAL_FX,
            target_h=54,
            target_max_w=46,
            bottom_y=59,
            median_passes=(7, 5),
            posterize_step=28,
            margin=2,
            despeckle_passes=2,
        )
        atlas[4 * CELL : 5 * CELL, f_idx * CELL : (f_idx + 1) * CELL] = upscale_nearest_rgba(s_grid64, 2)

    seal_specs = [
        ("z0_portal", (23, 142, 194), (230, 180, 76), (224, 255, 255)),
        ("z1_portal", (19, 156, 140), (75, 143, 82), (237, 255, 251)),
        ("z2_portal", (104, 25, 158), (223, 130, 255), (250, 224, 255)),
        ("z3_portal", (140, 24, 24), (250, 107, 32), (255, 227, 102)),
    ]
    for s_i, (spal, rim_c, mid_c, core_c) in enumerate(seal_specs):
        c_idx = 4 + s_i
        atlas[4 * CELL : 5 * CELL, c_idx * CELL : (c_idx + 1) * CELL] = build_ground_portal_seal_cell(
            FX_PALETTES[spal], rim_c, mid_c, core_c
        )

    border_bleed = 0
    for r in range(5):
        for c in range(8):
            sub = atlas[r * CELL : (r + 1) * CELL, c * CELL : (c + 1) * CELL, 3]
            border_bleed += int(
                np.sum(sub[:2, :] > 0) + np.sum(sub[-2:, :] > 0) + np.sum(sub[:, :2] > 0) + np.sum(sub[:, -2:] > 0)
            )
    assert border_bleed == 0, f"Border bleed in adv_fx_sheet: {border_bleed}"

    semi_alpha = int(np.sum((atlas[:, :, 3] > 0) & (atlas[:, :, 3] < 255)))
    assert semi_alpha == 0, f"Semi-transparent pixels in adv_fx_sheet: {semi_alpha}"

    block2x2 = measure_block_uniformity(atlas, 2)
    assert block2x2 == 1.0, f"Expected 100% 2x2 pixel block uniformity on adv_fx_sheet, got {block2x2:.4f}"

    out_path = os.path.join(SPRITES_DIR, "adv_fx_sheet.png")
    Image.fromarray(atlas, mode="RGBA").save(out_path, optimize=True)
    sz_kb = os.path.getsize(out_path) / 1024.0
    print(
        f"[OK] Saved {out_path}: {atlas.shape[1]}x{atlas.shape[0]} RGBA ({sz_kb:.1f} KB), "
        f"border_bleed={border_bleed}, 2x2={block2x2*100:.1f}%"
    )

    pad_top = 46
    pad_left = 148
    cw_vis = CELL * 2
    showcase = Image.new("RGBA", (pad_left + 8 * cw_vis + 24, pad_top + 5 * cw_vis + 24), (16, 20, 32, 255))
    dr = ImageDraw.Draw(showcase)
    row_titles = ["R0 ZONE I ECLIPSE", "R1 ZONE II STARWOOD", "R2 ZONE III OSSUARY", "R3 ZONE IV BLACKPIT", "R4 SOLAR + SEALS"]
    col_titles = ["PORTAL F0", "PORTAL F1", "PORTAL F2", "PORTAL F3", "STAGE FX F0", "STAGE FX F1", "STAGE FX F2", "STAGE FX F3"]
    for c, ct in enumerate(col_titles):
        dr.text((pad_left + c * cw_vis + 14, 16), ct, fill=(248, 250, 252, 255))
    for r, rt in enumerate(row_titles):
        dr.text((10, pad_top + r * cw_vis + cw_vis // 2 - 6), rt, fill=(253, 224, 71, 255))
        for c in range(8):
            bx = pad_left + c * cw_vis
            by = pad_top + r * cw_vis
            bg_c = (24, 30, 46, 255) if (r + c) % 2 == 0 else (16, 20, 32, 255)
            dr.rectangle([bx, by, bx + cw_vis - 1, by + cw_vis - 1], fill=bg_c, outline=(42, 53, 78, 255))
            cim = Image.fromarray(atlas[r * CELL : (r + 1) * CELL, c * CELL : (c + 1) * CELL], mode="RGBA")
            showcase.alpha_composite(cim.resize((cw_vis, cw_vis), Image.Resampling.NEAREST), (bx, by))

    dbg_path = os.path.join(SCRATCH_DIR, "debug_adv_portals_v108_showcase.png")
    showcase.convert("RGB").save(dbg_path, optimize=True)
    print(f"[OK] Saved showcase: {dbg_path}")


if __name__ == "__main__":
    main()
