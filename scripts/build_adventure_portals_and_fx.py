#!/usr/bin/env python3
"""
Builds `assets/sprites/adv_fx_sheet.png` (`1024 x 640` RGBA = `8 cols x 5 rows` of `128x128` cells)
from generated 16-bit HD-2D reference art (`adv_realm_portals_hd2d` & `adv_stage_fx_hd2d`) using the
mandatory Arcane vs Steel HD-2D pixel-art pipeline:
  1. Border + pastel-halo + enclosed white-pocket BFS flood-fill strip
  2. True 4-frame interior vortex swirl animation (`Cols 0..3`, stationary masonry/root/iron/obsidian arch!)
     & 4-frame flickering/swaying pixel-art stage flame / spirit-wisp animation (`Cols 4..7`)
  3. Pre-downsample `MedianFilter(size=3)` cel-flattening
  4. Curated 24-color per-Realm `MASTER_PALETTE` quantization (`dither=NONE`)
  5. 2-pass cardinal orphan despeckling + crisp `1px` `#0d0f1c` `Selout` (`2px` empty cell margin -> `0` bleed)

Atlas Layout (`1024 x 640`, `128x128` per cell):
  Row 0 (`y = 0..128`):   Zone I   (Eclipse Cathedral): Cols 0..3 Astral Gothic Portal, Cols 4..7 Cyan Sacred Flame
  Row 1 (`y = 128..256`): Zone II  (Cursed Starwood):   Cols 0..3 Briar Root Portal,    Cols 4..7 Sylvan Spirit Wisp
  Row 2 (`y = 256..384`): Zone III (Bone Necropolis):   Cols 0..3 Skull Crypt Portal,   Cols 4..7 Violet Skull Soul-Fire
  Row 3 (`y = 384..512`): Zone IV  (Black Pit Throne):  Cols 0..3 Obsidian Hell-Portal, Cols 4..7 Molten Hellfire Plume
  Row 4 (`y = 512..640`): Cols 0..3: Zone I Solar-Amber Sacred Flame (4-frame loop for dual Eclipse Cathedral braziers!)
                          Cols 4..7: Foreshortened 2.5D Ground Portal Rune Seals (Col 4=Z1, Col 5=Z2, Col 6=Z3, Col 7=Z4)
"""

import math
import os
import numpy as np
from PIL import Image, ImageDraw

from build_adventure_props_sheet import (
    CELL,
    SELOUT_RGB,
    despeckle_and_selout,
    hex_pal,
    pixelize_to_cell,
    strip_white_bg_quadrant,
)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPRITES_DIR = os.path.join(ROOT, "assets", "sprites")
ARTIFACT_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/b9d8130e-8764-4ace-8d4e-40f97049d6f1"

SRC_PORTALS = os.path.join(ARTIFACT_DIR, "adv_realm_portals_hd2d_1794570253987.jpg")
SRC_FX = os.path.join(ARTIFACT_DIR, "adv_stage_fx_hd2d_1794570251563.jpg")


FX_PALETTES = {
    "z0_portal": hex_pal([
        "#0d0f1c", "#121b2e", "#1c2a45", "#293d61", "#3b5582", "#5473a6", "#7898c9",
        "#3b2a12", "#63471c", "#916928", "#bf8f38", "#e8b851", "#fae082", "#fff6bd",
        "#083e5c", "#0f6d99", "#1aa6db", "#47deff", "#99f3ff", "#e0ffff", "#ffffff",
    ]),
    "z1_portal": hex_pal([
        "#0d0f1c", "#1a1714", "#2b231d", "#403329", "#594738", "#755e4b",
        "#1a2421", "#293b36", "#3d574e", "#56786b",
        "#19381f", "#2b5c31", "#428246", "#62ab63",
        "#064742", "#0b756b", "#14ab99", "#2be0c5", "#6efce3", "#bdfff3", "#edfffb", "#ffffff",
    ]),
    "z2_portal": hex_pal([
        "#0d0f1c", "#171626", "#25233b", "#373454", "#4d4970", "#696491", "#8c86b5",
        "#38363d", "#5c5963", "#85808c", "#b0abb8", "#dbd6e3",
        "#290a42", "#4c1275", "#761db0", "#a630eb", "#cf5eff", "#eb9eff", "#f9d9ff", "#ffffff",
    ]),
    "z3_portal": hex_pal([
        "#0d0f1c", "#17141c", "#24202b", "#363040", "#4d4559", "#6b617a",
        "#360a0d", "#631114", "#991b19", "#cf2e1d", "#f5561f", "#ff8424", "#ffb533", "#ffe366", "#fffab8", "#ffffff",
    ]),
    "z0_flame": hex_pal([
        "#0d0f1c", "#081c45", "#0e3378", "#1652b0", "#227be0", "#38abff", "#6bd4ff", "#a8edff", "#defaff", "#ffffff",
    ]),
    "z0_solar": hex_pal([
        "#0d0f1c", "#3b0d0c", "#6e1911", "#a62b14", "#db4c18", "#fc771e", "#ffa62b", "#ffd24d", "#fff099", "#ffffff",
    ]),
    "z1_wisp": hex_pal([
        "#0d0f1c", "#08302c", "#0e524a", "#167a6c", "#21a892", "#35d9ba", "#6bf7da", "#adffec", "#e6fffa", "#ffffff",
        "#124729", "#1e6e3e", "#329c59", "#57cc7e",
    ]),
    "z2_flame": hex_pal([
        "#0d0f1c", "#24083b", "#45106b", "#6e19a3", "#9b26db", "#c94aff", "#e582ff", "#f6bdff", "#fde6ff", "#ffffff",
    ]),
    "z3_flame": hex_pal([
        "#0d0f1c", "#38090c", "#691211", "#9e1f14", "#d43c17", "#f7661c", "#ff9426", "#ffc43d", "#ffed85", "#ffffff",
    ]),
}


def warp_portal_vortex_hi(
    rgba_hi: np.ndarray,
    frame_idx: int,
    cx_rel: float,
    cy_rel: float,
    rx_rel: float,
    ry_rel: float,
) -> np.ndarray:
    """
    Keeps the outer stone/wood/iron/obsidian portal arch 100% stationary while rotating & pulsing
    the interior dimensional vortex across 4 seamless phase steps (`0, 90, 180, 270` deg)!
    """
    if frame_idx == 0:
        return rgba_hi.copy()

    H, W, _ = rgba_hi.shape
    ys, xs = np.where(rgba_hi[:, :, 3] > 128)
    y0, y1 = int(ys.min()), int(ys.max())
    x0, x1 = int(xs.min()), int(xs.max())
    bw = max(16, x1 - x0)
    bh = max(16, y1 - y0)

    cx = x0 + bw * cx_rel
    cy = y0 + bh * cy_rel
    rx = bw * rx_rel
    ry = bh * ry_rel

    angle = (frame_idx / 4.0) * (2.0 * math.pi)
    cos_a = math.cos(angle)
    sin_a = math.sin(angle)

    yy, xx = np.mgrid[0:H, 0:W]
    nx = (xx - cx) / max(1.0, rx)
    ny = (yy - cy) / max(1.0, ry)
    r2 = nx * nx + ny * ny
    inside = r2 < 0.98

    # Smooth feather near arch inner rim (`r = 0.78..0.98`) so arch border stays rock-solid!
    r = np.sqrt(np.minimum(1.0, r2))
    weight = np.clip((0.98 - r) / 0.22, 0.0, 1.0)
    eff_ang = angle * weight + 0.35 * math.sin(angle) * (1.0 - r) * weight
    ca = np.cos(eff_ang)
    sa = np.sin(eff_ang)

    snx = nx * ca + ny * sa
    sny = -nx * sa + ny * ca
    sx = np.clip(np.round(cx + snx * rx).astype(np.int32), 0, W - 1)
    sy = np.clip(np.round(cy + sny * ry).astype(np.int32), 0, H - 1)

    out = rgba_hi.copy()
    valid = inside & (rgba_hi[sy, sx, 3] > 128) & (rgba_hi[:, :, 3] > 128)
    out[valid, :3] = rgba_hi[sy[valid], sx[valid], :3]
    return out


def warp_flame_frame_hi(rgba_hi: np.ndarray, frame_idx: int, is_wisp: bool = False) -> np.ndarray:
    """
    Generates 4 natural rising/flickering animation frames for stage flames & spirit wisps
    in high-res space before cel-flattening, quantization, despeckling & Selout!
    """
    if frame_idx == 0:
        return rgba_hi.copy()

    H, W, _ = rgba_hi.shape
    ys, xs = np.where(rgba_hi[:, :, 3] > 128)
    y0, y1 = int(ys.min()), int(ys.max())
    bh = max(16, y1 - y0)

    phase = (frame_idx / 4.0) * (2.0 * math.pi)
    out = np.zeros_like(rgba_hi)

    yy, xx = np.mgrid[0:H, 0:W]
    # u = 0 at flame base (anchored!), u = 1 at flame tip
    u = np.clip((y1 - yy) / float(bh), 0.0, 1.0)

    if is_wisp:
        bob_y = int(round(math.sin(phase) * (bh * 0.045)))
        sway_x = np.round(np.sin(phase + (1.0 - u) * 3.8) * (bh * 0.035) * (1.0 - u * 0.5)).astype(np.int32)
        sy = np.clip(yy - bob_y, 0, H - 1)
        sx = np.clip(xx - sway_x, 0, W - 1)
    else:
        stretch = 1.0 + 0.055 * math.sin(phase)
        sway_x = np.round(np.sin(phase - u * 4.4) * (bh * 0.058) * (u ** 1.15)).astype(np.int32)
        sy = np.clip(np.round(y1 - (y1 - yy) / stretch).astype(np.int32), 0, H - 1)
        sx = np.clip(xx - sway_x, 0, W - 1)

    out[:, :, :] = rgba_hi[sy, sx, :]
    return out


def recolor_cyan_flame_to_solar(rgba_hi: np.ndarray) -> np.ndarray:
    out = rgba_hi.copy()
    rgb = out[:, :, :3].astype(np.float32)
    luma = 0.2126 * rgb[:, :, 0] + 0.7152 * rgb[:, :, 1] + 0.0722 * rgb[:, :, 2]
    t = np.clip(luma / 255.0, 0.0, 1.0)
    # Map dark indigo -> deep ember crimson -> blazing solar orange -> white-hot gold!
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
    Builds a crisp foreshortened 2.5D elliptical HD-2D Runic Portal Ground Seal (`128x128`, `0` rotation)
    that sits flat on the stone road right beneath each standing Dimensional Portal!
    """
    cell = np.zeros((CELL, CELL, 4), dtype=np.uint8)
    cx, cy = 64.0, 74.0
    rx, ry = 54.0, 20.0
    for y in range(44, 104):
        for x in range(6, 122):
            nx = (x - cx) / rx
            ny = (y - cy) / ry
            d = math.hypot(nx, ny)
            if d > 1.02:
                continue
            ang = math.atan2(ny, nx)
            spoke = abs(math.sin(ang * 4.0)) < 0.14
            if 0.88 <= d <= 1.02:
                cell[y, x] = (*rim_rgb, 255)
            elif 0.76 <= d < 0.88:
                cell[y, x] = (*core_rgb, 255) if int((ang + math.pi) * 5.0) % 2 == 0 else (*mid_rgb, 255)
            elif 0.46 <= d <= 0.56 or (d < 0.76 and spoke):
                cell[y, x] = (*mid_rgb, 255)
            elif d <= 0.24:
                cell[y, x] = (*core_rgb, 255)
    # Quantize & apply crisp 1px Selout
    a = cell[:, :, 3] > 0
    rgb = cell[:, :, :3].astype(np.int32)
    ys, xs = np.where(a)
    for y, x in zip(ys, xs):
        dists = np.sum((pal - rgb[y, x]) ** 2, axis=1)
        cell[y, x, :3] = pal[int(np.argmin(dists))].astype(np.uint8)
    return despeckle_and_selout(cell)


def main():
    im_portals = np.array(Image.open(SRC_PORTALS).convert("RGB"))
    im_fx = np.array(Image.open(SRC_FX).convert("RGB"))

    def quad(arr: np.ndarray, row: int, col: int, pad: int = 14) -> np.ndarray:
        H, W, _ = arr.shape
        mh, mw = H // 2, W // 2
        return arr[row * mh + pad : (row + 1) * mh - pad, col * mw + pad : (col + 1) * mw - pad, :].copy()

    portal_defs = [
        ("z0_portal", quad(im_portals, 0, 0), 0.50, 0.55, 0.25, 0.31),
        ("z1_portal", quad(im_portals, 0, 1), 0.52, 0.50, 0.24, 0.32),
        ("z2_portal", quad(im_portals, 1, 0), 0.50, 0.55, 0.25, 0.31),
        ("z3_portal", quad(im_portals, 1, 1), 0.50, 0.54, 0.23, 0.30),
    ]

    fx_defs = [
        ("z0_flame", quad(im_fx, 0, 0), False, 108, 92, 118),
        ("z1_wisp", quad(im_fx, 0, 1), True, 96, 92, 112),
        ("z2_flame", quad(im_fx, 1, 0), False, 108, 92, 118),
        ("z3_flame", quad(im_fx, 1, 1), False, 108, 92, 118),
    ]

    atlas = np.zeros((5 * CELL, 8 * CELL, 4), dtype=np.uint8)

    # Rows 0..3: 4 Realms x (Cols 0..3 Animated Portal + Cols 4..7 Animated Stage Flame/Wisp)
    z0_cyan_hi = None
    for r_idx in range(4):
        pkey, pq_rgb, cx_r, cy_r, rx_r, ry_r = portal_defs[r_idx]
        p_hi = strip_white_bg_quadrant(pq_rgb, strip_pastel_glow=True)
        for f_idx in range(4):
            warped_p = warp_portal_vortex_hi(p_hi, f_idx, cx_r, cy_r, rx_r, ry_r)
            p_cell = pixelize_to_cell(
                warped_p,
                FX_PALETTES[pkey],
                target_h=116,
                target_max_w=112,
                bottom_y=122,
            )
            atlas[r_idx * CELL : (r_idx + 1) * CELL, f_idx * CELL : (f_idx + 1) * CELL] = p_cell

        fkey, fq_rgb, is_wisp, th, tw, by = fx_defs[r_idx]
        f_hi = strip_white_bg_quadrant(fq_rgb, strip_pastel_glow=True)
        if r_idx == 0:
            z0_cyan_hi = f_hi
        for f_idx in range(4):
            warped_f = warp_flame_frame_hi(f_hi, f_idx, is_wisp=is_wisp)
            f_cell = pixelize_to_cell(
                warped_f,
                FX_PALETTES[fkey],
                target_h=th,
                target_max_w=tw,
                bottom_y=by,
            )
            c_idx = 4 + f_idx
            atlas[r_idx * CELL : (r_idx + 1) * CELL, c_idx * CELL : (c_idx + 1) * CELL] = f_cell

    # Row 4 Cols 0..3: Solar-Amber Sacred Cathedral Flame (4-frame loop)
    solar_hi = recolor_cyan_flame_to_solar(z0_cyan_hi)
    for f_idx in range(4):
        warped_s = warp_flame_frame_hi(solar_hi, f_idx, is_wisp=False)
        s_cell = pixelize_to_cell(
            warped_s,
            FX_PALETTES["z0_solar"],
            target_h=108,
            target_max_w=92,
            bottom_y=118,
        )
        atlas[4 * CELL : 5 * CELL, f_idx * CELL : (f_idx + 1) * CELL] = s_cell

    # Row 4 Cols 4..7: Foreshortened 2.5D Ground Portal Rune Seals per Realm
    seal_specs = [
        ("z0_portal", (26, 166, 219), (232, 184, 81), (224, 255, 255)),
        ("z1_portal", (20, 171, 153), (98, 171, 99), (237, 255, 251)),
        ("z2_portal", (118, 29, 176), (207, 94, 255), (249, 217, 255)),
        ("z3_portal", (153, 27, 25), (255, 132, 36), (255, 250, 184)),
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
            border_bleed += int(np.sum(sub[0, :] > 0) + np.sum(sub[-1, :] > 0) + np.sum(sub[:, 0] > 0) + np.sum(sub[:, -1] > 0))
    assert border_bleed == 0, f"Border bleed in adv_fx_sheet: {border_bleed}"

    out_path = os.path.join(SPRITES_DIR, "adv_fx_sheet.png")
    Image.fromarray(atlas, mode="RGBA").save(out_path, optimize=True)
    sz_kb = os.path.getsize(out_path) / 1024.0
    print(f"[OK] Saved {out_path}: {atlas.shape[1]}x{atlas.shape[0]} RGBA ({sz_kb:.1f} KB), border_bleed={border_bleed}")

    # Build visual audit contact sheet
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

    dbg_path = os.path.join(ARTIFACT_DIR, "debug_adv_portals_and_fx_showcase.png")
    showcase.convert("RGB").save(dbg_path, optimize=True)
    print(f"[OK] Saved showcase: {dbg_path}")


if __name__ == "__main__":
    main()
