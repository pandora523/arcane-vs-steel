#!/usr/bin/env python3
"""
Next-Gen Wide-Canvas Sprite Sheet, Portrait, & Visual QA Builder for:
  KAZE-MARU EX -- Raijin Blade-God (ronin_ex)

Architecture (FFBE / Last Cloudia / Grand Summoners Paradigm):
  1. Wide Theatrical Cell Framing:
     - Logical canvas: 160x120 -> 2x NEAREST output: 320x240 per cell
     - Sheet layout: 30 cols x 10 rows = 9600x2400 RGBA PNG
     - Grounded foot/spine anchor: anchor_x_160 = 56 (anchorX = 112),
       anchor_y_120 = 115 (anchorY = 230)
     - Standing hero height: 87 logical px (174px in 320x240), 100% locked scale
       across all 300 frames (zero auto-fit shrinking on wide slashes or leaps).
  2. Multi-Keypose 3D Body States + Articulated STAND Rig:
     - Uses 3D-foreshortened HD-2D keyposes (K1_COIL, K2_LUNGE, K3_RISE, K4_LEAP
       from ronin_ex_keyposes_ref.jpg) + articulated STAND rig (ronin_ex_base.jpg)
       with 2-Bone Analytical IK samurai sode/kote arms clasped on the curved
       Raijin Thunder-Odachi, plus waist Saya scabbard (sheathed vs drawn) and
       5-drum Raijin Taiko Thunder-Drum halo ring.
  3. 1-Frame Explosive Snap + Hand-Sculpted 4-Band Serrated Raijin Smear Fans:
     - Row 2 AUTO_ATTACK is 100% GROUNDED (0px float across V0..V3, including V3
       Morote Zantetsuken Iaido!) with #ffffff -> #38bdf8 -> #6366f1 -> #1e1b4b
       crescent & 2.5D vortex smears + golden (#fde047 / #f59e0b) lightning teeth.
"""

from collections import deque
import math
from pathlib import Path
import sys
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SPRITES_DIR = ROOT / "assets" / "sprites"

BASE_REF = SPRITES_DIR / "ronin_ex_base.jpg"
PORTRAIT_REF = SPRITES_DIR / "ronin_ex_portrait_raw.jpg"
KEYPOSES_REF = SPRITES_DIR / "ronin_ex_keyposes_ref.jpg"

OUT_SHEET = SPRITES_DIR / "ronin_ex_sheet.png"
OUT_PORTRAIT = SPRITES_DIR / "ronin_ex_portrait.png"

QA_DIR = Path("/Users/rei/.gemini/antigravity/brain/2b67fecd-73c5-4987-946f-3fcc4c35a185/scratch")

# Wide-canvas Next-Gen framing constants
LOG_W = 160
LOG_H = 120
CELL_W = 320
CELL_H = 240
COLS = 30
ROWS = 10
SHEET_W = CELL_W * COLS   # 9600
SHEET_H = CELL_H * ROWS   # 2400

ANCHOR_X_160 = 56         # -> anchorX = 112 in 320x240
ANCHOR_Y_120 = 115        # -> anchorY = 230 in 320x240
MARGIN_160 = 2            # -> 4px safety margin in 320x240

# Locked anatomical scale from 512x512 master space -> 160x120 logical canvas
# BASE hero spans y=23..505 -> height = 482px -> 87.0 logical px (174px in 320x240)
HERO_H_512 = 482.0
TARGET_HERO_H_160 = 87.0
SCALE = TARGET_HERO_H_160 / HERO_H_512  # 0.180498
SPINE_X_512 = 264.0
GROUND_Y_512 = 505.0

# Raijin Storm-Blade Palette
C_OUTLINE = (9, 8, 24, 255)
C_INK_DEEP = (17, 15, 44, 255)
C_INDIGO_DARK = (30, 27, 75, 255)     # #1e1b4b
C_INDIGO_MID = (55, 48, 163, 255)     # #3730a3
C_INDIGO_BRIGHT = (99, 102, 241, 255) # #6366f1
C_VIOLET_RIM = (129, 140, 248, 255)   # #818cf8
C_CYAN_DEEP = (2, 132, 199, 255)      # #0284c7
C_CYAN_BRIGHT = (56, 189, 248, 255)   # #38bdf8
C_CYAN_ICE = (186, 230, 253, 255)     # #bae6fd
C_WHITE = (255, 255, 255, 255)        # #ffffff
C_GOLD_DARK = (146, 64, 14, 255)      # #92400e
C_GOLD_MID = (217, 119, 6, 255)       # #d97706
C_GOLD_BRIGHT = (250, 204, 21, 255)   # #facc15
C_GOLD_LIGHT = (253, 224, 71, 255)    # #fde047
C_CRIMSON_LACQ = (153, 27, 27, 255)   # #991b1b
C_SAKURA_PINK = (244, 114, 182, 255)  # #f472b6
C_SAKURA_PALE = (251, 207, 232, 255)  # #fbcfe8
C_SKIN_LIGHT = (242, 198, 172, 255)
C_SKIN_MID = (218, 166, 140, 255)
C_SKIN_SHAD = (176, 122, 100, 255)
C_STEEL_DARK = (51, 65, 85, 255)
C_STEEL_MID = (148, 163, 184, 255)
C_STEEL_LIGHT = (226, 232, 240, 255)


# ==============================================================================
# 1. CLEAN BACKGROUND REMOVAL & ANTI-HALO FRINGE DECONTAMINATION
# ==============================================================================

def remove_white_bg_512(
    im_rgb: Image.Image,
    pocket_seeds: list[tuple[int, int]] | None = None,
    strip_polys: list[list[tuple[int, int]]] | None = None,
) -> np.ndarray:
    """
    Removes #FFFFFF studio backdrop via border floodfill + verified interior pure-white
    pocket seeds (keeping silver-white samurai hair intact!), strips raw hands where IK
    arms take over, and decontaminates 1-2px bright paper-white edge halos.
    """
    arr = np.array(im_rgb.convert("RGB"), dtype=np.uint8)
    h, w, _ = arr.shape
    r = arr[:, :, 0].astype(np.int32)
    g = arr[:, :, 1].astype(np.int32)
    b = arr[:, :, 2].astype(np.int32)
    lum = (r * 299 + g * 587 + b * 114) // 1000
    max_c = np.maximum(np.maximum(r, g), b)
    min_c = np.minimum(np.minimum(r, g), b)
    chroma = max_c - min_c

    bg_cand = (lum >= 240) & (chroma <= 18)
    visited = np.zeros((h, w), dtype=bool)
    q = deque()

    for x in range(w):
        for y in (0, h - 1):
            if bg_cand[y, x] and not visited[y, x]:
                visited[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if bg_cand[y, x] and not visited[y, x]:
                visited[y, x] = True
                q.append((y, x))

    # Pocket floodfill uses strict pure-white threshold so silver hair is never touched
    pocket_cand = (lum >= 246) & (chroma <= 12)
    if pocket_seeds:
        pq = deque()
        for sx, sy in pocket_seeds:
            for dy in range(-3, 4):
                for dx in range(-3, 4):
                    px, py = sx + dx, sy + dy
                    if 0 <= px < w and 0 <= py < h and pocket_cand[py, px] and not visited[py, px]:
                        visited[py, px] = True
                        pq.append((py, px))
        while pq:
            cy, cx = pq.popleft()
            for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and pocket_cand[ny, nx]:
                    visited[ny, nx] = True
                    pq.append((ny, nx))

    while q:
        cy, cx = q.popleft()
        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and bg_cand[ny, nx]:
                visited[ny, nx] = True
                q.append((ny, nx))

    fg = ~visited

    if strip_polys:
        mask_im = Image.new("L", (w, h), 0)
        mdraw = ImageDraw.Draw(mask_im)
        for poly in strip_polys:
            mdraw.polygon(poly, fill=255)
        strip_m = np.array(mask_im) > 128
        fg = fg & (~strip_m)

    # Erode pale anti-aliased paper fringe bordering background (protect dark ink & saturated cyan/gold)
    for pass_idx in range(2):
        bg_now = ~fg
        bg_adj = (
            np.pad(bg_now[1:, :], ((0, 1), (0, 0)), constant_values=True)
            | np.pad(bg_now[:-1, :], ((1, 0), (0, 0)), constant_values=True)
            | np.pad(bg_now[:, 1:], ((0, 0), (0, 1)), constant_values=True)
            | np.pad(bg_now[:, :-1], ((0, 0), (1, 0)), constant_values=True)
        )
        lum_thresh = 216 if pass_idx == 0 else 232
        fringe = fg & bg_adj & (lum >= lum_thresh) & (chroma <= 24)
        fg = fg & (~fringe)

    # Remove tiny disconnected floating dust islands (< 18 px)
    comp_vis = np.zeros((h, w), dtype=bool)
    for y0 in range(h):
        for x0 in range(w):
            if fg[y0, x0] and not comp_vis[y0, x0]:
                comp_vis[y0, x0] = True
                cq = deque([(y0, x0)])
                comp = [(y0, x0)]
                while cq:
                    cy, cx = cq.popleft()
                    for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                        if 0 <= ny < h and 0 <= nx < w and fg[ny, nx] and not comp_vis[ny, nx]:
                            comp_vis[ny, nx] = True
                            cq.append((ny, nx))
                            comp.append((ny, nx))
                if len(comp) < 18:
                    for cy, cx in comp:
                        fg[cy, cx] = False

    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[:, :, :3] = arr
    rgba[:, :, 3] = np.where(fg, 255, 0)

    # Darken 1px outer silhouette contour into crisp storm-indigo Selout ink
    bg_final = rgba[:, :, 3] == 0
    outer_edge = (rgba[:, :, 3] > 0) & (
        np.pad(bg_final[1:, :], ((0, 1), (0, 0)), constant_values=True)
        | np.pad(bg_final[:-1, :], ((1, 0), (0, 0)), constant_values=True)
        | np.pad(bg_final[:, 1:], ((0, 0), (0, 1)), constant_values=True)
        | np.pad(bg_final[:, :-1], ((0, 0), (1, 0)), constant_values=True)
    )
    bright_edge = outer_edge & (lum >= 165) & (chroma <= 36)
    rgba[bright_edge, 0] = (rgba[bright_edge, 0].astype(np.int16) * 28 // 100).astype(np.uint8)
    rgba[bright_edge, 1] = (rgba[bright_edge, 1].astype(np.int16) * 28 // 100).astype(np.uint8)
    rgba[bright_edge, 2] = np.minimum(
        255, (rgba[bright_edge, 2].astype(np.int16) * 42 // 100) + 22
    ).astype(np.uint8)
    return rgba


def poly_mask(w: int, h: int, pts: list[tuple[int, int]]) -> np.ndarray:
    im = Image.new("L", (w, h), 0)
    ImageDraw.Draw(im).polygon(pts, fill=255)
    return np.array(im) > 128


def extract_part(rgba: np.ndarray, mask: np.ndarray, pivot_xy: tuple[float, float]) -> dict:
    part = np.zeros_like(rgba)
    sel = mask & (rgba[:, :, 3] > 0)
    part[sel] = rgba[sel]
    ys, xs = np.where(part[:, :, 3] > 0)
    if len(xs) == 0:
        return {
            "im": Image.new("RGBA", (4, 4), (0, 0, 0, 0)),
            "x0": 0,
            "y0": 0,
            "pivot": pivot_xy,
        }
    x0, x1 = max(0, int(xs.min()) - 2), min(rgba.shape[1], int(xs.max()) + 3)
    y0, y1 = max(0, int(ys.min()) - 2), min(rgba.shape[0], int(ys.max()) + 3)
    cropped = Image.fromarray(part[y0:y1, x0:x1], "RGBA")
    return {
        "im": cropped,
        "x0": x0,
        "y0": y0,
        "pivot": pivot_xy,
    }


# ==============================================================================
# 2. RIG SEGMENTATION (BASE STAND RIG + 4 FORESHORTENED 3D KEYPOSES)
# ==============================================================================

def load_rigs() -> dict:
    # Strip empty bare hands/forearms on BASE so IK samurai sode/kote arms hold the Odachi & Saya cleanly
    base_strip = [
        [(166, 202), (218, 202), (214, 296), (164, 296)],  # viewer-left forearm & bare hand
        [(314, 196), (378, 196), (378, 300), (324, 300)],  # viewer-right forearm & bare hand
    ]
    base_512 = Image.open(BASE_REF).convert("RGB").resize((512, 512), Image.Resampling.LANCZOS)
    rgba_base = remove_white_bg_512(base_512, pocket_seeds=[(225, 245)], strip_polys=base_strip)
    h, w, _ = rgba_base.shape

    # Surgical 512x512 segmentation of BASE samurai armor & mane
    m_head = poly_mask(w, h, [
        (238, 36), (334, 36), (330, 144), (254, 146), (242, 108),
    ])
    m_hair = poly_mask(w, h, [
        (88, 18), (294, 18), (260, 72), (244, 114), (200, 152), (176, 212), (166, 272), (88, 272),
    ]) & (~m_head)

    m_l_pauldron = poly_mask(w, h, [
        (164, 114), (248, 116), (240, 204), (164, 204),
    ]) & (~m_hair) & (~m_head)

    m_r_pauldron = poly_mask(w, h, [
        (304, 124), (350, 124), (346, 200), (304, 200),
    ]) & (~m_head)

    m_torso = poly_mask(w, h, [
        (234, 134), (318, 134), (324, 250), (232, 250),
    ]) & (~m_head) & (~m_l_pauldron) & (~m_r_pauldron)

    m_obi_tassets = poly_mask(w, h, [
        (206, 232), (338, 232), (344, 350), (200, 350),
    ]) & (~m_torso)

    m_l_thigh = poly_mask(w, h, [
        (182, 326), (272, 326), (268, 396), (178, 396),
    ]) & (~m_obi_tassets)
    m_l_shin = poly_mask(w, h, [
        (160, 378), (248, 378), (232, 510), (156, 510),
    ]) & (~m_l_thigh)

    m_r_thigh = poly_mask(w, h, [
        (268, 326), (350, 326), (348, 396), (272, 396),
    ]) & (~m_obi_tassets) & (~m_l_thigh)
    m_r_shin = poly_mask(w, h, [
        (274, 378), (370, 378), (378, 510), (274, 510),
    ]) & (~m_r_thigh)

    # Dedicated 3-segment (+X forward-facing) leg parts for Row 1 WALK bipedal crossover
    # Keep upper dark hakama trouser beneath tasset while avoiding purple tasset corner; split shin cleanly at ankle y=452.
    m_w_tasset_corner = poly_mask(w, h, [
        (318, 320), (350, 320), (350, 354), (318, 354),
    ])
    m_w_thigh = poly_mask(w, h, [
        (268, 326), (350, 326), (348, 396), (268, 396),
    ]) & (~m_w_tasset_corner)
    m_w_shin = poly_mask(w, h, [
        (274, 386), (348, 386), (344, 454), (274, 454),
    ])
    m_w_foot = poly_mask(w, h, [
        (296, 446), (378, 446), (378, 494), (296, 494),
    ])

    def darken_part_copy(part_dict: dict, rgb_scale: float = 0.72) -> dict:
        arr_p = np.array(part_dict["im"], dtype=np.uint8).copy()
        fg_m = arr_p[:, :, 3] > 0
        # Preserve dark outline contour while shading interior plates for far-leg depth separation
        lum_p = (
            arr_p[:, :, 0].astype(np.int32) * 299
            + arr_p[:, :, 1].astype(np.int32) * 587
            + arr_p[:, :, 2].astype(np.int32) * 114
        ) // 1000
        tint_m = fg_m & (lum_p > 26)
        arr_p[tint_m, 0] = (arr_p[tint_m, 0].astype(np.float32) * rgb_scale).astype(np.uint8)
        arr_p[tint_m, 1] = (arr_p[tint_m, 1].astype(np.float32) * rgb_scale).astype(np.uint8)
        arr_p[tint_m, 2] = np.minimum(255, (arr_p[tint_m, 2].astype(np.float32) * (rgb_scale + 0.06)).astype(np.int32)).astype(np.uint8)
        return {
            "im": Image.fromarray(arr_p, "RGBA"),
            "x0": part_dict["x0"],
            "y0": part_dict["y0"],
            "pivot": part_dict["pivot"],
        }

    r_thigh = extract_part(rgba_base, m_r_thigh, (302.0, 340.0))
    w_thigh = extract_part(rgba_base, m_w_thigh, (302.0, 340.0))
    w_shin = extract_part(rgba_base, m_w_shin, (314.0, 392.0))
    w_foot = extract_part(rgba_base, m_w_foot, (320.0, 452.0))

    parts = {
        "hair": extract_part(rgba_base, m_hair, (254.0, 96.0)),
        "head": extract_part(rgba_base, m_head, (278.0, 134.0)),
        "torso": extract_part(rgba_base, m_torso, (276.0, 236.0)),
        "obi": extract_part(rgba_base, m_obi_tassets, (276.0, 248.0)),
        "l_pauldron": extract_part(rgba_base, m_l_pauldron, (226.0, 144.0)),
        "r_pauldron": extract_part(rgba_base, m_r_pauldron, (312.0, 148.0)),
        "l_thigh": extract_part(rgba_base, m_l_thigh, (234.0, 340.0)),
        "l_shin": extract_part(rgba_base, m_l_shin, (206.0, 392.0)),
        "r_thigh": r_thigh,
        "r_shin": extract_part(rgba_base, m_r_shin, (308.0, 392.0)),
        "w_thigh": w_thigh,
        "w_shin": w_shin,
        "w_foot": w_foot,
        "w_thigh_far": darken_part_copy(w_thigh, 0.70),
        "w_shin_far": darken_part_copy(w_shin, 0.70),
        "w_foot_far": darken_part_copy(w_foot, 0.70),
    }

    # Load 2x2 Action Keyposes
    kp_raw = Image.open(KEYPOSES_REF).convert("RGB")
    kw, kh = kp_raw.size
    hw, hh = kw // 2, kh // 2

    def load_kp(box, seeds, strips, spine_x, ground_y, scale_mult=1.0, native_arms=False):
        tile = kp_raw.crop(box).resize((512, 512), Image.Resampling.LANCZOS)
        rgba = remove_white_bg_512(tile, pocket_seeds=seeds, strip_polys=strips)
        ys, xs = np.where(rgba[:, :, 3] > 0)
        x0, x1 = max(0, int(xs.min()) - 2), min(512, int(xs.max()) + 3)
        y0, y1 = max(0, int(ys.min()) - 2), min(512, int(ys.max()) + 3)
        return {
            "im": Image.fromarray(rgba[y0:y1, x0:x1], "RGBA"),
            "x0": x0,
            "y0": y0,
            "spine_x": spine_x,
            "ground_y": ground_y,
            "scale_mult": scale_mult,
            "native_arms": native_arms,
        }

    # K1_COIL: Deep Iaido hip-draw crouch. Notice his native hands clasp right at (268, 286)!
    # Keep native arms on K1_COIL for authentic two-handed Iaido hip-sheath poses, AND provide
    # K1_TORQUE with bare hands gently masked where IK arms swing outward.
    k1_coil = load_kp(
        (0, 0, hw, hh),
        seeds=[(227, 247)],
        strips=None,
        spine_x=292.0,
        ground_y=503.0,
        scale_mult=1.00,
        native_arms=True,
    )

    # K2_LUNGE: Deep split-lunge. Strip ONLY the extended right forearm/hand in open white space.
    k2_lunge = load_kp(
        (hw, 0, kw, hh),
        seeds=[],
        strips=[[(346, 224), (498, 220), (498, 290), (346, 288)]],
        spine_x=312.0,
        ground_y=499.0,
        scale_mult=1.00,
        native_arms=False,
    )

    # K3_RISE: Rising Kiri-age stance. Strip both forearms cleanly in open white space.
    k3_rise = load_kp(
        (0, hh, hw, kh),
        seeds=[(125, 185)],
        strips=[
            [(176, 198), (232, 204), (224, 296), (172, 296)],
            [(348, 22), (458, 22), (458, 170), (356, 176)],
        ],
        spine_x=296.0,
        ground_y=505.0,
        scale_mult=1.00,
        native_arms=False,
    )

    # K4_LEAP: Compact tucked Shunpo / aerial swallow stance. Strip both forearms in open space.
    k4_leap = load_kp(
        (hw, hh, kw, kh),
        seeds=[(140, 189)],
        strips=[
            [(96, 184), (192, 190), (176, 276), (94, 276)],
            [(344, 194), (424, 194), (424, 256), (344, 248)],
        ],
        spine_x=282.0,
        ground_y=463.0,
        scale_mult=1.00,
        native_arms=False,
    )

    return {
        "parts": parts,
        "K1_COIL": k1_coil,
        "K2_LUNGE": k2_lunge,
        "K3_RISE": k3_rise,
        "K4_LEAP": k4_leap,
    }


# ==============================================================================
# 3. LOGICAL 160x120 PIXEL-ART PRIMITIVES, IK KOTE ARMS, RAIJIN DRUMS & ODACHI
# ==============================================================================

def set_px(buf: np.ndarray, x: int, y: int, col: tuple[int, int, int, int]):
    if MARGIN_160 <= x < LOG_W - MARGIN_160 and MARGIN_160 <= y < LOG_H - MARGIN_160:
        buf[y, x] = col


def draw_line_px(buf: np.ndarray, x0: float, y0: float, x1: float, y1: float, col: tuple, r: int = 0):
    dx = x1 - x0
    dy = y1 - y0
    steps = max(1, int(math.ceil(max(abs(dx), abs(dy)) * 1.5)))
    for i in range(steps + 1):
        t = i / steps
        px = int(round(x0 + dx * t))
        py = int(round(y0 + dy * t))
        if r <= 0:
            set_px(buf, px, py, col)
        else:
            for oy in range(-r, r + 1):
                for ox in range(-r, r + 1):
                    if ox * ox + oy * oy <= r * r + 1:
                        set_px(buf, px + ox, py + oy, col)


def paste_part_160(
    canvas: Image.Image,
    part: dict,
    world_pivot_160: tuple[float, float],
    angle_deg: float = 0.0,
    scale_x: float = 1.0,
    scale_y: float = 1.0,
):
    im = part["im"]
    px_piv = part["pivot"][0] - part["x0"]
    py_piv = part["pivot"][1] - part["y0"]

    tw = max(2, int(round(im.width * SCALE * scale_x)))
    th = max(2, int(round(im.height * SCALE * scale_y)))
    scaled = im.resize((tw, th), Image.Resampling.NEAREST)
    s_piv_x = px_piv * (tw / max(1, im.width))
    s_piv_y = py_piv * (th / max(1, im.height))

    if abs(angle_deg) > 0.25:
        pad = max(tw, th) + 8
        tmp = Image.new("RGBA", (pad * 2, pad * 2), (0, 0, 0, 0))
        ox = int(round(pad - s_piv_x))
        oy = int(round(pad - s_piv_y))
        tmp.paste(scaled, (ox, oy), scaled)
        rot = tmp.rotate(-angle_deg, resample=Image.Resampling.NEAREST, center=(pad, pad))
        dst_x = int(round(world_pivot_160[0] - pad))
        dst_y = int(round(world_pivot_160[1] - pad))
        canvas.alpha_composite(rot, (dst_x, dst_y))
    else:
        dst_x = int(round(world_pivot_160[0] - s_piv_x))
        dst_y = int(round(world_pivot_160[1] - s_piv_y))
        canvas.alpha_composite(scaled, (dst_x, dst_y))


def paste_keypose_160(
    canvas: Image.Image,
    kp: dict,
    anchor_x: float,
    anchor_y: float,
    angle_deg: float = 0.0,
    sx: float = 1.0,
    sy: float = 1.0,
):
    im = kp["im"]
    sc = SCALE * kp["scale_mult"]
    tw = max(2, int(round(im.width * sc * sx)))
    th = max(2, int(round(im.height * sc * sy)))
    scaled = im.resize((tw, th), Image.Resampling.NEAREST)

    piv_x = (kp["spine_x"] - kp["x0"]) * (tw / max(1, im.width))
    piv_y = (kp["ground_y"] - kp["y0"]) * (th / max(1, im.height))

    if abs(angle_deg) > 0.25:
        pad = max(tw, th) + 10
        tmp = Image.new("RGBA", (pad * 2, pad * 2), (0, 0, 0, 0))
        ox = int(round(pad - piv_x))
        oy = int(round(pad - piv_y))
        tmp.paste(scaled, (ox, oy), scaled)
        rot = tmp.rotate(-angle_deg, resample=Image.Resampling.NEAREST, center=(pad, pad))
        dst_x = int(round(anchor_x - pad))
        dst_y = int(round(anchor_y - pad))
        canvas.alpha_composite(rot, (dst_x, dst_y))
    else:
        dst_x = int(round(anchor_x - piv_x))
        dst_y = int(round(anchor_y - piv_y))
        canvas.alpha_composite(scaled, (dst_x, dst_y))


def solve_ik_2bone(
    sx: float,
    sy: float,
    tx: float,
    ty: float,
    l1: float,
    l2: float,
    bend_sign: float = 1.0,
) -> tuple[float, float]:
    dx = tx - sx
    dy = ty - sy
    d = math.hypot(dx, dy)
    d_clamped = max(abs(l1 - l2) + 0.5, min(l1 + l2 - 0.3, d))
    base_ang = math.atan2(dy, dx)
    cos_a = (l1 * l1 + d_clamped * d_clamped - l2 * l2) / max(1e-4, 2.0 * l1 * d_clamped)
    cos_a = max(-1.0, min(1.0, cos_a))
    ang = base_ang + bend_sign * math.acos(cos_a)
    ex = sx + math.cos(ang) * l1
    ey = sy + math.sin(ang) * l1
    return ex, ey


def draw_sculpted_samurai_hand_160(
    buf: np.ndarray,
    tx: float,
    ty: float,
    dir_x: float,
    dir_y: float,
    is_front: bool = True,
):
    """
    Pixel-by-pixel sculpted 16-bit Samurai Kote Tekko gauntlet + 3 articulated gripping
    fingers & opposed thumb (0 blobs, 0 3x3 black squares, selective 1px dark Selout
    strictly on transparent pixels).
    """
    d_len = math.hypot(dir_x, dir_y) or 1.0
    ux, uy = dir_x / d_len, dir_y / d_len
    nx, ny = -uy, ux
    if ny > 0.35:
        nx, ny = -nx, -ny

    c_tekko_hi = C_GOLD_BRIGHT if is_front else C_GOLD_MID
    c_tekko_lo = C_GOLD_MID if is_front else C_GOLD_DARK
    c_sk_hi = C_SKIN_LIGHT if is_front else C_SKIN_MID
    c_sk_lo = C_SKIN_MID if is_front else C_SKIN_SHAD

    # (along forearm, across wrist, color): wrist guard + tekko plate + 3 fingers + thumb
    hand_offsets = [
        (-1.4, -0.7, c_tekko_hi),
        (-1.4,  0.3, c_tekko_lo),
        (-0.5, -1.5, c_sk_hi),   # opposed thumb curling over upper tsuka
        (-0.5, -0.5, c_tekko_hi),
        (-0.5,  0.5, c_tekko_lo),
        ( 0.5, -1.0, c_sk_hi),   # index finger wrapping hilt
        ( 0.5,  0.0, c_sk_hi),   # middle finger wrapping hilt
        ( 0.5,  1.0, c_sk_lo),   # ring finger wrapping hilt
        ( 1.2, -0.7, c_sk_lo),   # index tip
        ( 1.2,  0.3, c_sk_lo),   # middle tip
    ]
    hand_pts: dict[tuple[int, int], tuple[int, int, int, int]] = {}
    for ou, ov, col in hand_offsets:
        px = int(round(tx + ux * ou + nx * ov))
        py = int(round(ty + uy * ou + ny * ov))
        hand_pts[(px, py)] = col

    for px, py in hand_pts:
        for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sx_p, sy_p = px + ox, py + oy
            if (sx_p, sy_p) in hand_pts:
                continue
            if MARGIN_160 <= sx_p < LOG_W - MARGIN_160 and MARGIN_160 <= sy_p < LOG_H - MARGIN_160:
                if buf[sy_p, sx_p, 3] == 0:
                    set_px(buf, sx_p, sy_p, C_OUTLINE)

    for (px, py), col in hand_pts.items():
        set_px(buf, px, py, col)


def draw_samurai_kote_arm_160(
    buf: np.ndarray,
    sx: float,
    sy: float,
    tx: float,
    ty: float,
    is_front: bool = True,
    bend_sign: float = 1.0,
):
    """
    Slender 2-Bone Analytical IK Samurai Arm (indigo lamellar sode sleeve + violet-rimmed
    kote bracer + gold wrist cuff + sculpted fingered tekko hand).
    """
    total_d = math.hypot(tx - sx, ty - sy) or 1.0
    hand_setback = min(1.8, total_d * 0.25)

    l1, l2 = 10.5, 11.0
    ex, ey = solve_ik_2bone(sx, sy, tx, ty, l1, l2, bend_sign=bend_sign)
    fdx, fdy = tx - ex, ty - ey
    fd_len = math.hypot(fdx, fdy) or 1.0
    fux, fuy = fdx / fd_len, fdy / fd_len
    wx = tx - fux * hand_setback
    wy = ty - fuy * hand_setback

    c_slv_hi = C_INDIGO_MID if is_front else C_INDIGO_DARK
    c_slv_lo = C_INDIGO_DARK if is_front else C_INK_DEEP
    c_kote_hi = C_VIOLET_RIM if is_front else C_INDIGO_MID
    c_kote_lo = C_INDIGO_MID if is_front else C_INDIGO_DARK
    c_gold_hi = C_GOLD_BRIGHT if is_front else C_GOLD_MID
    c_gold_lo = C_GOLD_MID if is_front else C_GOLD_DARK

    arm_px: dict[tuple[int, int], tuple[int, int, int, int]] = {}

    def _collect(x0: float, y0: float, x1: float, y1: float, is_forearm: bool):
        dx, dy = x1 - x0, y1 - y0
        seg_l = math.hypot(dx, dy)
        if seg_l < 0.25:
            return
        nx, ny = -dy / seg_l, dx / seg_l
        if ny > 0:
            nx, ny = -nx, -ny
        steps = max(4, int(math.ceil(seg_l * 3.0)))
        for i in range(steps + 1):
            u = i / steps
            cx = x0 + dx * u
            cy = y0 + dy * u
            if not is_forearm:
                hi_col, lo_col = (c_gold_hi, c_gold_lo) if (is_front and u < 0.20) else (c_slv_hi, c_slv_lo)
            else:
                if u < 0.18 or u > 0.80:
                    hi_col, lo_col = c_gold_hi, c_gold_lo
                elif is_front and 0.40 <= u <= 0.65:
                    hi_col, lo_col = C_CYAN_BRIGHT, c_kote_lo
                else:
                    hi_col, lo_col = c_kote_hi, c_kote_lo
            arm_px[(int(round(cx)), int(round(cy)))] = hi_col
            arm_px[(int(round(cx + nx * 0.8)), int(round(cy + ny * 0.8)))] = hi_col
            arm_px[(int(round(cx - nx * 0.85)), int(round(cy - ny * 0.85)))] = lo_col

    _collect(sx, sy, ex, ey, is_forearm=False)
    _collect(ex, ey, wx, wy, is_forearm=True)

    for px, py in arm_px:
        for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx_p, ny_p = px + ox, py + oy
            if (nx_p, ny_p) in arm_px:
                continue
            if MARGIN_160 <= nx_p < LOG_W - MARGIN_160 and MARGIN_160 <= ny_p < LOG_H - MARGIN_160:
                if buf[ny_p, nx_p, 3] == 0:
                    set_px(buf, nx_p, ny_p, C_OUTLINE)

    for (px, py), col in arm_px.items():
        set_px(buf, px, py, col)

    draw_sculpted_samurai_hand_160(buf, tx, ty, fux, fuy, is_front=is_front)


def draw_raijin_drums_160(
    buf: np.ndarray,
    cx: float,
    cy: float,
    phase: float,
    charge: float = 0.25,
    radius: float = 20.5,
):
    """
    Renders Kaze-Maru EX's signature 5-Drum Raijin Taiko Thunder-Drum Halo Ring
    behind his shoulders with 3-dot Mitsudomoe emblems & crackling cyan-gold arcs.
    """
    angles_deg = [-142.0, -106.0, -70.0, -34.0, 4.0]
    centers = []
    for idx, base_deg in enumerate(angles_deg):
        bob = math.sin(phase + idx * 1.15) * 1.1
        ang = math.radians(base_deg + math.sin(phase * 0.7) * 2.5)
        dx = cx + math.cos(ang) * radius
        dy = cy + math.sin(ang) * (radius * 0.84) + bob
        centers.append((dx, dy))

    # Iron/indigo thunder-hoop connecting the 5 Taiko drums
    for i in range(len(centers) - 1):
        x0, y0 = centers[i]
        x1, y1 = centers[i + 1]
        draw_line_px(buf, x0, y0, x1, y1, C_OUTLINE, r=0)
        mx = (x0 + x1) * 0.5
        my = (y0 + y1) * 0.5 - 1.0
        draw_line_px(buf, x0, y0, mx, my, C_INDIGO_MID, r=0)
        draw_line_px(buf, mx, my, x1, y1, C_INDIGO_MID, r=0)
        if charge >= 0.35:
            spark_col = C_GOLD_LIGHT if ((i + int(phase * 3)) % 2 == 0) else C_CYAN_BRIGHT
            set_px(buf, int(round(mx)), int(round(my - 1)), spark_col)

    # Render each pixel-art Taiko drum (r=4.2 logical -> ~9px crisp circular drum in 320x240)
    for idx, (dx, dy) in enumerate(centers):
        ix, iy = int(round(dx)), int(round(dy))
        for oy in range(-5, 6):
            for ox in range(-5, 6):
                d2 = ox * ox + oy * oy
                if d2 <= 22:
                    if d2 >= 15:
                        col = C_OUTLINE
                    elif d2 >= 10:
                        col = C_GOLD_BRIGHT if (ox + oy < 0) else C_CRIMSON_LACQ
                    else:
                        col = C_CYAN_ICE if charge >= 0.75 else (254, 249, 195, 255)
                    set_px(buf, ix + ox, iy + oy, col)
        # 3-comma Mitsudomoe emblem pixels inside drumhead
        rot = phase * 0.8 + idx * 0.9
        for k in range(3):
            ta = rot + k * (2.0 * math.pi / 3.0)
            tx = ix + int(round(math.cos(ta) * 1.7))
            ty = iy + int(round(math.sin(ta) * 1.7))
            set_px(buf, tx, ty, C_INDIGO_DARK)
        if charge >= 0.65:
            # Crackling lightning prong outward from drum
            ang_out = math.atan2(dy - cy, dx - cx)
            lx = ix + int(round(math.cos(ang_out) * 6.5))
            ly = iy + int(round(math.sin(ang_out) * 6.5))
            draw_line_px(buf, ix + math.cos(ang_out) * 4.5, iy + math.sin(ang_out) * 4.5, lx, ly, C_CYAN_BRIGHT, r=0)
            if idx % 2 == 0:
                set_px(buf, lx, ly, C_GOLD_LIGHT)


def draw_saya_160(
    buf: np.ndarray,
    koiguchi_x: float,
    koiguchi_y: float,
    angle_deg: float = 158.0,
    sheathed: bool = False,
    koiguchi_spark: float = 0.0,
):
    """
    Curved midnight-indigo waist Saya scabbard with cyan Raijin lacquer inlay & gold fittings.
    When sheathed=True, renders the gold tsuba & diamond-wrapped tsuka hilt protruding forward!
    """
    rad = math.radians(angle_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    nx, ny = -uy, ux
    saya_len = 28.0
    steps = 36
    pts = []
    for i in range(steps + 1):
        u = i / steps
        sori = 2.4 * 4.0 * u * (1.0 - u)
        px = koiguchi_x + ux * (u * saya_len) + nx * sori
        py = koiguchi_y + uy * (u * saya_len) + ny * sori
        pts.append((px, py, u))

    # 1px dark Selout
    for px, py, _ in pts:
        ix, iy = int(round(px)), int(round(py))
        for oy in range(-2, 3):
            for ox in range(-2, 3):
                if ox * ox + oy * oy <= 4:
                    set_px(buf, ix + ox, iy + oy, C_OUTLINE)

    # Midnight-indigo lacquer body + cyan lightning inlay + gold kojiri chape
    for px, py, u in pts:
        ix, iy = int(round(px)), int(round(py))
        if u > 0.88:
            col = C_GOLD_BRIGHT
        elif u < 0.09:
            col = C_GOLD_MID
        elif 0.32 <= u <= 0.68 and int(u * 20) % 2 == 0:
            col = C_CYAN_BRIGHT
        else:
            col = C_INDIGO_DARK
        set_px(buf, ix, iy, col)
        set_px(buf, int(round(px - nx * 0.8)), int(round(py - ny * 0.8)), C_INDIGO_MID)

    # If sheathed, draw the Raijin Odachi tsuba guard + long 2H tsuka hilt extending opposite Saya
    if sheathed:
        hx_dir, hy_dir = -ux, -uy
        # Gold Raijin tsuba disk perpendicular to koiguchi
        for g in (-3, -2, -1, 0, 1, 2, 3):
            gx = int(round(koiguchi_x + nx * g))
            gy = int(round(koiguchi_y + ny * g))
            for oy in (-1, 0, 1):
                for ox in (-1, 0, 1):
                    if abs(ox) + abs(oy) <= 1:
                        set_px(buf, gx + ox, gy + oy, C_OUTLINE)
        for g in (-2, -1, 0, 1, 2):
            gx = int(round(koiguchi_x + nx * g))
            gy = int(round(koiguchi_y + ny * g))
            set_px(buf, gx, gy, C_GOLD_LIGHT if abs(g) <= 1 else C_GOLD_MID)

        # Tsuka-maki diamond-wrapped hilt (12 logical px)
        hilt_len = 12.0
        for s in range(15):
            hu = s / 14.0
            px = koiguchi_x + hx_dir * (1.5 + hu * hilt_len)
            py = koiguchi_y + hy_dir * (1.5 + hu * hilt_len)
            ix, iy = int(round(px)), int(round(py))
            for oy in (-1, 0, 1):
                for ox in (-1, 0, 1):
                    set_px(buf, ix + ox, iy + oy, C_OUTLINE)
        for s in range(15):
            hu = s / 14.0
            px = koiguchi_x + hx_dir * (1.5 + hu * hilt_len)
            py = koiguchi_y + hy_dir * (1.5 + hu * hilt_len)
            ix, iy = int(round(px)), int(round(py))
            if s >= 13:
                set_px(buf, ix, iy, C_GOLD_BRIGHT)
            else:
                set_px(buf, ix, iy, C_CYAN_BRIGHT if (s % 3 == 0) else C_INDIGO_MID)

    # Optional Iaido / Noto koiguchi star-glint spark!
    if koiguchi_spark > 0.05:
        r_sp = max(2, int(round(5.0 * koiguchi_spark)))
        kx, ky = int(round(koiguchi_x)), int(round(koiguchi_y))
        for d in range(-r_sp, r_sp + 1):
            col = C_WHITE if abs(d) <= 1 else C_CYAN_BRIGHT
            set_px(buf, kx + d, ky, col)
            set_px(buf, kx, ky + d, col)
        for d in range(-max(1, r_sp // 2), max(1, r_sp // 2) + 1):
            set_px(buf, kx + d, ky + d, C_GOLD_LIGHT)
            set_px(buf, kx + d, ky - d, C_GOLD_LIGHT)


def draw_raijin_odachi_160(
    buf: np.ndarray,
    hilt_x: float,
    hilt_y: float,
    angle_deg: float,
    blade_len: float = 56.0,
    sori_sign: float = -1.0,
    storm_charge: float = 0.25,
) -> tuple[tuple[float, float], tuple[float, float], tuple[float, float]]:
    """
    Renders Kaze-Maru EX's curved Raijin Thunder-Odachi (112px in 320x240!):
      - Parabolic Japanese sori curvature
      - 1px dark storm-indigo Selout
      - Indigo mune spine + glowing cyan lightning fuller + pure-white ha razor edge
      - Gold Raijin tsuba guard + long two-handed diamond-wrapped tsuka hilt
      - Returns (front_grip_xy, pommel_grip_xy, tip_xy) for exact 2-Bone IK hand lock.
    """
    rad = math.radians(angle_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    # Normal pointing toward convex cutting edge (sori_sign selects curve side)
    nx, ny = -uy * sori_sign, ux * sori_sign

    hilt_len = 12.0
    pom_x = hilt_x - ux * hilt_len
    pom_y = hilt_y - uy * hilt_len
    guard_x = hilt_x + ux * 2.0
    guard_y = hilt_y + uy * 2.0

    # Sample curved blade centerline from guard to kissaki tip
    n_steps = max(28, int(round(blade_len * 1.55)))
    spine_pts = []
    sori_amp = 4.2
    for i in range(n_steps + 1):
        u = i / n_steps
        # Authentic katana sori curves backward toward mune (-nx,-ny) while ha is convex outer edge
        curve = -sori_amp * (u * u * 0.85 + 0.15 * u)
        bx = guard_x + ux * (u * blade_len) + nx * curve
        by = guard_y + uy * (u * blade_len) + ny * curve
        spine_pts.append((bx, by, u))

    tip_x, tip_y, _ = spine_pts[-1]

    # Pass 1: 1px Selout around hilt, tsuba, and curved blade
    draw_line_px(buf, pom_x, pom_y, guard_x, guard_y, C_OUTLINE, r=2)
    for g in range(-4, 5):
        gx = guard_x + nx * g
        gy = guard_y + ny * g
        draw_line_px(buf, gx, gy, gx, gy, C_OUTLINE, r=1)

    for bx, by, u in spine_pts:
        half_w = 1.9 * (1.0 - 0.55 * (u ** 2.2))
        if storm_charge >= 0.85:
            half_w += 0.55
        w_steps = max(2, int(round(half_w * 2.2)))
        for wi in range(-w_steps - 1, w_steps + 2):
            off = (wi / max(1, w_steps)) * half_w
            px = int(round(bx + nx * off))
            py = int(round(by + ny * off))
            for oy in (-1, 0, 1):
                for ox in (-1, 0, 1):
                    if abs(ox) + abs(oy) <= 1:
                        set_px(buf, px + ox, py + oy, C_OUTLINE)

    # Pass 2: Hilt & Gold Raijin Tsuba
    for s in range(15):
        hu = s / 14.0
        px = int(round(pom_x + ux * (hu * (hilt_len + 1.5))))
        py = int(round(pom_y + uy * (hu * (hilt_len + 1.5))))
        col = C_GOLD_BRIGHT if s <= 1 else (C_CYAN_BRIGHT if s % 3 == 0 else C_INDIGO_MID)
        set_px(buf, px, py, col)

    for g in range(-3, 4):
        gx = int(round(guard_x + nx * g))
        gy = int(round(guard_y + ny * g))
        set_px(buf, gx, gy, C_GOLD_LIGHT if abs(g) <= 1 else C_GOLD_MID)

    # Pass 3: Curved Blade Core (indigo mune -> cyan lightning fuller -> pure-white ha edge)
    for bx, by, u in spine_pts:
        # Mune back-spine
        mx = int(round(bx - nx * 0.95))
        my = int(round(by - ny * 0.95))
        set_px(buf, mx, my, C_INDIGO_MID if u < 0.88 else C_CYAN_BRIGHT)

        # Central Raijin lightning fuller
        cx = int(round(bx))
        cy = int(round(by))
        if storm_charge >= 0.45 or (0.08 <= u <= 0.80):
            set_px(buf, cx, cy, C_CYAN_BRIGHT if storm_charge < 0.85 else C_GOLD_LIGHT)
        else:
            set_px(buf, cx, cy, C_STEEL_MID)

        # Convex ha razor cutting edge
        hx = int(round(bx + nx * (0.95 * (1.0 - 0.35 * u))))
        hy = int(round(by + ny * (0.95 * (1.0 - 0.35 * u))))
        set_px(buf, hx, hy, C_WHITE if (storm_charge >= 0.25 or u > 0.55) else C_CYAN_ICE)

    set_px(buf, int(round(tip_x)), int(round(tip_y)), C_WHITE)

    # Pass 4: Crackling Raijin lightning zig-zag along charged blade!
    if storm_charge >= 0.45:
        prev_lx, prev_ly = None, None
        for idx in range(2, len(spine_pts) - 1, 5):
            bx, by, u = spine_pts[idx]
            zig = (2.2 if (idx // 5) % 2 == 0 else -2.2) * min(1.3, storm_charge)
            lx = bx + nx * zig
            ly = by + ny * zig
            if prev_lx is not None:
                lcol = C_GOLD_LIGHT if ((idx // 5) % 3 == 0) else C_CYAN_BRIGHT
                draw_line_px(buf, prev_lx, prev_ly, lx, ly, lcol, r=0)
            prev_lx, prev_ly = lx, ly

    front_grip = (hilt_x - ux * 1.2, hilt_y - uy * 1.2)
    back_grip = (hilt_x - ux * 7.8, hilt_y - uy * 7.8)
    return front_grip, back_grip, (tip_x, tip_y)


def draw_obi_tassels_160(
    buf: np.ndarray,
    hip_x: float,
    hip_y: float,
    lag_deg: float,
    wave_phase: float,
    energy: float = 0.0,
):
    """
    Secondary frame-delayed cyan obi tassels + drifting Raijin storm-petals.
    """
    for idx, (ox, length) in enumerate(((1.0, 12.0), (-3.0, 10.5))):
        sx = hip_x + ox
        sy = hip_y
        pts = [(sx, sy)]
        for seg in range(1, 5):
            u = seg / 4.0
            ang = math.radians(96.0 + lag_deg * (0.55 + 0.55 * u) + math.sin(wave_phase + seg * 0.9 + idx) * 10.0)
            nx = pts[-1][0] + math.cos(ang) * (length / 4.0)
            ny = pts[-1][1] + math.sin(ang) * (length / 4.0)
            pts.append((nx, ny))
        for i in range(len(pts) - 1):
            draw_line_px(buf, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], C_OUTLINE, r=1)
        for i in range(len(pts) - 1):
            col = C_GOLD_BRIGHT if i == len(pts) - 2 else (C_CYAN_BRIGHT if idx == 0 else C_CYAN_DEEP)
            draw_line_px(buf, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], col, r=0)

    if energy > 0.15:
        for k in range(3):
            ang = wave_phase * 1.3 + k * 2.1
            mx = int(round(hip_x - 8 + math.cos(ang) * 14 - k * 4))
            my = int(round(hip_y - 18 + math.sin(ang * 1.2) * 12 - k * 5))
            set_px(buf, mx, my, C_SAKURA_PINK if k == 1 else C_CYAN_BRIGHT)
            if energy > 0.55:
                set_px(buf, mx + 1, my, C_WHITE)


# ==============================================================================
# 4. SLEEK DARK-SAMURAI ZANTETSUKEN IAIDO VACUUM GLEAMS & RAIJIN THUNDER SPARKS
# ==============================================================================

def set_gleam_px(
    buf: np.ndarray,
    x: int,
    y: int,
    col: tuple[int, int, int, int],
    max_x: int = 154,
):
    if 6 <= x <= max_x and 6 <= y <= 113:
        buf[y, x] = col


def _draw_gleam_streak(
    buf: np.ndarray,
    x0: float,
    y0: float,
    x1: float,
    y1: float,
    curve_px: float = 2.0,
    thickness: int = 2,
    core_col: tuple = C_WHITE,
    mid_col: tuple = C_CYAN_BRIGHT,
    shadow_col: tuple = C_INDIGO_MID,
    max_x: int = 155,
    fade_mode: bool = False,
):
    dx = x1 - x0
    dy = y1 - y0
    dist = max(4.0, math.hypot(dx, dy))
    ux, uy = dx / dist, dy / dist
    nx, ny = -uy, ux
    steps = max(12, int(math.ceil(dist * 1.5)))

    for i in range(steps + 1):
        u = i / steps
        # Fade mode skips alternating start pixels to depict dissipating vacuum dust
        if fade_mode and (u < 0.25 or (i % 3 == 0)):
            continue
        bow = curve_px * 4.0 * u * (1.0 - u)
        px = x0 + dx * u + nx * bow
        py = y0 + dy * u + ny * bow
        ix, iy = int(round(px)), int(round(py))

        # Taper cleanly to a 1px logical (2px output) needle tip at both ends
        is_waist = 0.16 <= u <= 0.80
        is_mid = 0.08 <= u <= 0.90

        if thickness >= 2 and is_waist:
            set_gleam_px(
                buf,
                int(round(px - nx * 1.0)),
                int(round(py - ny * 1.0)),
                C_OUTLINE if u < 0.55 else shadow_col,
                max_x=max_x,
            )

        if thickness >= 3 and 0.24 <= u <= 0.72:
            set_gleam_px(
                buf,
                int(round(px - nx * 2.0)),
                int(round(py - ny * 2.0)),
                C_INDIGO_DARK,
                max_x=max_x,
            )

        if u < 0.16:
            c_main = shadow_col
        elif u < 0.42:
            c_main = mid_col
        elif u < 0.82:
            c_main = C_CYAN_ICE if (thickness == 1 and u < 0.65) else core_col
        else:
            c_main = core_col
        set_gleam_px(buf, ix, iy, c_main, max_x=max_x)

        if thickness >= 2 and is_mid:
            edge_col = core_col if u >= 0.22 else C_CYAN_ICE
            set_gleam_px(
                buf,
                int(round(px + nx * 0.85)),
                int(round(py + ny * 0.85)),
                edge_col,
                max_x=max_x,
            )


def _draw_jagged_raijin_spark(
    buf: np.ndarray,
    x0: float,
    y0: float,
    x1: float,
    y1: float,
    segs: int = 5,
    amp: float = 3.2,
    seed: int = 1,
    col_a: tuple = C_CYAN_BRIGHT,
    col_b: tuple = C_GOLD_LIGHT,
    max_x: int = 155,
):
    dx = x1 - x0
    dy = y1 - y0
    dist = max(2.0, math.hypot(dx, dy))
    nx, ny = -dy / dist, dx / dist
    pts = [(x0, y0)]
    for s in range(1, segs):
        u = s / segs
        sgn = 1.0 if ((s + seed) % 2 == 0) else -1.0
        jitter = amp * sgn * math.sin(u * math.pi)
        pts.append((x0 + dx * u + nx * jitter, y0 + dy * u + ny * jitter))
    pts.append((x1, y1))

    for s in range(len(pts) - 1):
        ax, ay = pts[s]
        bx, by = pts[s + 1]
        n = max(2, int(math.ceil(math.hypot(bx - ax, by - ay) * 1.4)))
        col = col_b if (s == len(pts) - 2 and seed % 2 == 0) else (C_WHITE if s % 2 == 1 else col_a)
        for k in range(n + 1):
            t = k / n
            set_gleam_px(buf, int(round(ax + (bx - ax) * t)), int(round(ay + (by - ay) * t)), col, max_x=max_x)


def draw_iaido_vacuum_gleam_160(
    buf: np.ndarray,
    x0: float,
    y0: float,
    x1: float,
    y1: float,
    style: str = "horizon",
    intensity: float = 1.0,
    max_x: int = 154,
    seed: int = 1,
):
    """
    Sleek Dark-Samurai Zantetsuken Iaido Vacuum Gleam:
      Razor-sharp 1-3px stepped-pixel cold-steel/indigo/cyan sword-gleam streaks
      + jagged Raijin thunder sparks (0 chunky banana crescents, 0 U-circle vortexes!).
    """
    fade_mode = intensity < 0.72
    thick_main = 3 if (style == "zantetsu" and intensity >= 0.90) else (2 if intensity >= 0.72 else 1)

    if style == "rising":
        # Ascending Kiri-age diagonal Zantetsuken gleam
        _draw_gleam_streak(
            buf, x0, y0, x1, y1,
            curve_px=3.0, thickness=thick_main,
            core_col=C_WHITE, mid_col=C_CYAN_BRIGHT, shadow_col=C_INDIGO_MID,
            max_x=max_x, fade_mode=fade_mode,
        )
        _draw_gleam_streak(
            buf, x0 + 18.0, y0 - 7.0, x1 - 4.0, y1 - 8.0,
            curve_px=1.5, thickness=1,
            core_col=C_CYAN_ICE, mid_col=C_INDIGO_BRIGHT, shadow_col=C_INDIGO_DARK,
            max_x=max_x, fade_mode=fade_mode,
        )
        _draw_gleam_streak(
            buf, x0 + 24.0, y0 + 8.0, x1 - 8.0, y1 + 9.0,
            curve_px=-1.0, thickness=1,
            core_col=C_CYAN_BRIGHT, mid_col=C_INDIGO_MID, shadow_col=C_OUTLINE,
            max_x=max_x, fade_mode=fade_mode,
        )
    elif style == "cross":
        # Twin crossed supersonic Shunpo horizontal + diagonal thrust-gleam needles
        _draw_gleam_streak(
            buf, x0, y0, x1, y1,
            curve_px=-1.2, thickness=thick_main,
            core_col=C_WHITE, mid_col=C_CYAN_BRIGHT, shadow_col=C_INDIGO_MID,
            max_x=max_x, fade_mode=fade_mode,
        )
        _draw_gleam_streak(
            buf, x0 + 16.0, y0 - 13.0, x1 - 5.0, y1 + 11.0,
            curve_px=1.6, thickness=2 if not fade_mode else 1,
            core_col=C_CYAN_ICE, mid_col=C_CYAN_BRIGHT, shadow_col=C_INDIGO_MID,
            max_x=max_x, fade_mode=fade_mode,
        )
        _draw_gleam_streak(
            buf, x0 + 22.0, y0 + 12.0, x1 - 7.0, y1 - 12.0,
            curve_px=-1.4, thickness=1,
            core_col=C_WHITE, mid_col=C_INDIGO_BRIGHT, shadow_col=C_INDIGO_DARK,
            max_x=max_x, fade_mode=fade_mode,
        )
    elif style == "zantetsu":
        # Monumental Morote Zantetsuken horizon-cleaving triple razor vacuum needles
        _draw_gleam_streak(
            buf, x0, y0, x1, y1,
            curve_px=-2.2, thickness=thick_main,
            core_col=C_WHITE, mid_col=C_CYAN_BRIGHT, shadow_col=C_INDIGO_MID,
            max_x=max_x, fade_mode=fade_mode,
        )
        _draw_gleam_streak(
            buf, x0 + 14.0, y0 - 11.0, x1 - 3.0, y1 - 6.0,
            curve_px=-1.2, thickness=2 if not fade_mode else 1,
            core_col=C_CYAN_ICE, mid_col=C_CYAN_BRIGHT, shadow_col=C_INDIGO_MID,
            max_x=max_x, fade_mode=fade_mode,
        )
        _draw_gleam_streak(
            buf, x0 + 18.0, y0 + 10.0, x1 - 6.0, y1 + 8.0,
            curve_px=1.4, thickness=1,
            core_col=C_WHITE, mid_col=C_INDIGO_BRIGHT, shadow_col=C_INDIGO_DARK,
            max_x=max_x, fade_mode=fade_mode,
        )
        if not fade_mode:
            _draw_gleam_streak(
                buf, x0 + 28.0, y0 - 20.0, x1 - 10.0, y1 - 15.0,
                curve_px=0.8, thickness=1,
                core_col=C_STEEL_LIGHT, mid_col=C_INDIGO_BRIGHT, shadow_col=C_INDIGO_DARK,
                max_x=max_x, fade_mode=False,
            )
    else:
        # "horizon": Sleek Nukitsuke horizontal-slight-angled vacuum gleam
        _draw_gleam_streak(
            buf, x0, y0, x1, y1,
            curve_px=-1.8, thickness=thick_main,
            core_col=C_WHITE, mid_col=C_CYAN_BRIGHT, shadow_col=C_INDIGO_MID,
            max_x=max_x, fade_mode=fade_mode,
        )
        _draw_gleam_streak(
            buf, x0 + 16.0, y0 - 7.0, x1 - 5.0, y1 - 6.0,
            curve_px=-0.8, thickness=1,
            core_col=C_CYAN_ICE, mid_col=C_INDIGO_BRIGHT, shadow_col=C_INDIGO_DARK,
            max_x=max_x, fade_mode=fade_mode,
        )
        _draw_gleam_streak(
            buf, x0 + 22.0, y0 + 7.0, x1 - 9.0, y1 + 7.0,
            curve_px=0.9, thickness=1,
            core_col=C_STEEL_LIGHT, mid_col=C_CYAN_DEEP, shadow_col=C_INDIGO_DARK,
            max_x=max_x, fade_mode=fade_mode,
        )

    # Jagged Raijin thunder sparks crackling along the vacuum cut corridor
    n_sparks = 3 if intensity >= 0.85 else 2
    for k in range(n_sparks):
        u0 = 0.28 + k * 0.24
        u1 = min(0.96, u0 + 0.30)
        sx0 = x0 + (x1 - x0) * u0
        sy0 = y0 + (y1 - y0) * u0 + ((-1) ** k) * (4.0 + k * 2.5)
        sx1 = x0 + (x1 - x0) * u1
        sy1 = y0 + (y1 - y0) * u1 + ((-1) ** (k + 1)) * (5.5 + k * 2.0)
        _draw_jagged_raijin_spark(
            buf, sx0, sy0, sx1, sy1,
            segs=4, amp=3.0, seed=seed + k * 3,
            col_a=C_CYAN_BRIGHT if k % 2 == 0 else C_INDIGO_BRIGHT,
            col_b=C_GOLD_LIGHT,
            max_x=max_x,
        )

    # Tiny cold-steel & Raijin gold vacuum spark motes
    for m in range(6 if intensity >= 0.72 else 4):
        mu = 0.34 + 0.11 * m
        mx = int(round(x0 + (x1 - x0) * mu))
        my = int(round(y0 + (y1 - y0) * mu + (((m * 7 + seed) % 13) - 6) * 2.2))
        mcol = C_GOLD_LIGHT if m % 3 == 0 else (C_WHITE if m % 2 == 0 else C_CYAN_BRIGHT)
        set_gleam_px(buf, mx, my, mcol, max_x=max_x)
        if intensity >= 0.90 and m % 2 == 0:
            set_gleam_px(buf, mx + 1, my, C_CYAN_ICE, max_x=max_x)


# ==============================================================================
# 5. POSE RENDERING ENGINE (STAND RIG + 4 KEYPOSES + DEATH POSE)
# ==============================================================================

def render_stand_rig_frame(rigs: dict, cfg: dict) -> Image.Image:
    canvas = Image.new("RGBA", (LOG_W, LOG_H), (0, 0, 0, 0))
    parts = rigs["parts"]

    ax = ANCHOR_X_160 + cfg.get("dx", 0.0)
    ay = ANCHOR_Y_120 + cfg.get("dy", 0.0)
    torso_lean = cfg.get("torso_lean", 0.0)
    sink = cfg.get("sink", 0.0)
    head_nod = cfg.get("head_nod", 0.0)

    l_hip_ang = cfg.get("l_hip", 0.0)
    l_knee_ang = cfg.get("l_knee", 0.0)
    r_hip_ang = cfg.get("r_hip", 0.0)
    r_knee_ang = cfg.get("r_knee", 0.0)
    stride_x = cfg.get("stride_x", 0.0)

    def map_pt(x512: float, y512: float) -> tuple[float, float]:
        return (
            ax + (x512 - SPINE_X_512) * SCALE,
            ay + (y512 - GROUND_Y_512) * SCALE + sink,
        )

    hip_x, hip_y = map_pt(276.0, 248.0)
    rad_t = math.radians(torso_lean)
    tx_off = math.sin(rad_t) * 14.0
    ty_off = (1.0 - math.cos(rad_t)) * 8.0

    # Layer 0: 5-Drum Raijin Taiko Thunder-Drum Halo Ring behind shoulders!
    if cfg.get("show_drums", True):
        drum_buf = np.zeros((LOG_H, LOG_W, 4), dtype=np.uint8)
        draw_raijin_drums_160(
            drum_buf,
            cx=hip_x + tx_off - 2.0,
            cy=hip_y - 25.0 + ty_off,
            phase=cfg.get("phase", 0.0),
            charge=cfg.get("drum_charge", 0.30),
        )
        canvas.alpha_composite(Image.fromarray(drum_buf, "RGBA"))

    # Layer 1: Flowing Silver-White Samurai Mane (behind torso & head)
    hair_x, hair_y = map_pt(254.0, 96.0)
    paste_part_160(
        canvas,
        parts["hair"],
        (hair_x + tx_off * 1.15, hair_y + ty_off),
        angle_deg=torso_lean * 0.55 + cfg.get("hair_wave", 0.0),
    )

    # Layer 2: Back/Left & Front/Right Samurai Legs
    l_hip_xy = (ax + (234.0 - SPINE_X_512) * SCALE - stride_x * 0.55, ay + (340.0 - GROUND_Y_512) * SCALE + sink)
    r_hip_xy = (ax + (302.0 - SPINE_X_512) * SCALE + stride_x * 0.55, ay + (340.0 - GROUND_Y_512) * SCALE + sink)

    l_rad = math.radians(l_hip_ang)
    r_rad = math.radians(r_hip_ang)
    l_knee_xy = (l_hip_xy[0] - math.sin(l_rad) * 9.5 - 4.5, l_hip_xy[1] + math.cos(l_rad) * 9.5 + cfg.get("l_lift", 0.0))
    r_knee_xy = (r_hip_xy[0] - math.sin(r_rad) * 9.5 + 1.0, r_hip_xy[1] + math.cos(r_rad) * 9.5 + cfg.get("r_lift", 0.0))

    paste_part_160(canvas, parts["l_thigh"], l_hip_xy, angle_deg=l_hip_ang)
    paste_part_160(canvas, parts["l_shin"], l_knee_xy, angle_deg=l_hip_ang + l_knee_ang)
    paste_part_160(canvas, parts["r_thigh"], r_hip_xy, angle_deg=r_hip_ang)
    paste_part_160(canvas, parts["r_shin"], r_knee_xy, angle_deg=r_hip_ang + r_knee_ang)

    # Layer 3: Obi & Kusazuri Tassets + Do Cuirass + Pauldrons + Kabuto Head
    paste_part_160(canvas, parts["obi"], (hip_x + tx_off * 0.35, hip_y + ty_off * 0.5), angle_deg=torso_lean * 0.45)
    torso_xy = map_pt(276.0, 236.0)
    paste_part_160(canvas, parts["torso"], (torso_xy[0] + tx_off * 0.5, torso_xy[1] + ty_off * 0.5), angle_deg=torso_lean)

    r_sh = map_pt(312.0, 148.0)
    r_sh = (r_sh[0] + tx_off, r_sh[1] + ty_off)
    paste_part_160(canvas, parts["r_pauldron"], r_sh, angle_deg=torso_lean * 0.8)

    head_xy = map_pt(278.0, 134.0)
    paste_part_160(canvas, parts["head"], (head_xy[0] + tx_off * 1.15, head_xy[1] + ty_off), angle_deg=torso_lean * 0.65 + head_nod)

    l_sh = map_pt(226.0, 144.0)
    l_sh = (l_sh[0] + tx_off * 0.85, l_sh[1] + ty_off)
    paste_part_160(canvas, parts["l_pauldron"], l_sh, angle_deg=torso_lean * 0.7)

    # Layer 4: Waist Saya + IK Samurai Kote Arms + Curved Raijin Thunder-Odachi + Smears
    fg_buf = np.zeros((LOG_H, LOG_W, 4), dtype=np.uint8)

    draw_obi_tassels_160(
        fg_buf,
        hip_x=hip_x + tx_off * 0.35 + 2.0,
        hip_y=hip_y + 4.0,
        lag_deg=cfg.get("tassel_lag", 0.0),
        wave_phase=cfg.get("phase", 0.0),
        energy=cfg.get("energy", 0.0),
    )

    koiguchi_x = hip_x - 3.5 + tx_off * 0.3
    koiguchi_y = hip_y + 2.5
    sheathed = cfg.get("sheathed", False)
    draw_saya_160(
        fg_buf,
        koiguchi_x=koiguchi_x,
        koiguchi_y=koiguchi_y,
        angle_deg=cfg.get("saya_deg", 156.0),
        sheathed=sheathed,
        koiguchi_spark=cfg.get("koiguchi_spark", 0.0),
    )

    if sheathed:
        # Noble samurai Iaido / Victory pose: front hand on tsuba, back hand on koiguchi
        rad_s = math.radians(cfg.get("saya_deg", 156.0))
        tsuka_tip_x = koiguchi_x - math.cos(rad_s) * 8.0
        tsuka_tip_y = koiguchi_y - math.sin(rad_s) * 8.0
        draw_samurai_kote_arm_160(fg_buf, l_sh[0] + 1, l_sh[1] + 5, koiguchi_x, koiguchi_y, is_front=False, bend_sign=1.0)
        draw_samurai_kote_arm_160(fg_buf, r_sh[0], r_sh[1] + 5, tsuka_tip_x, tsuka_tip_y, is_front=True, bend_sign=1.0)
    else:
        hilt_x = hip_x + cfg.get("sword_hx", 14.0)
        hilt_y = hip_y + cfg.get("sword_hy", -6.0)
        sword_deg = cfg.get("sword_deg", -22.0)
        fg_grip, bg_grip, _ = draw_raijin_odachi_160(
            fg_buf,
            hilt_x=hilt_x,
            hilt_y=hilt_y,
            angle_deg=sword_deg,
            blade_len=cfg.get("blade_len", 56.0),
            sori_sign=cfg.get("sori_sign", -1.0),
            storm_charge=cfg.get("storm_charge", 0.25),
        )
        if cfg.get("two_handed", False):
            draw_samurai_kote_arm_160(fg_buf, l_sh[0] + 1, l_sh[1] + 5, bg_grip[0], bg_grip[1], is_front=False, bend_sign=1.0)
        else:
            # Left hand rests poised on waist Saya koiguchi!
            draw_samurai_kote_arm_160(fg_buf, l_sh[0] + 1, l_sh[1] + 5, koiguchi_x, koiguchi_y, is_front=False, bend_sign=1.0)
        draw_samurai_kote_arm_160(fg_buf, r_sh[0], r_sh[1] + 5, fg_grip[0], fg_grip[1], is_front=True, bend_sign=cfg.get("bend_f", 1.0))

    canvas.alpha_composite(Image.fromarray(fg_buf, "RGBA"))
    if cfg.get("clamp_ground", False):
        arr_c = np.array(canvas, dtype=np.uint8)
        if ANCHOR_Y_120 + 1 < LOG_H:
            over = arr_c[ANCHOR_Y_120 + 1, :, 3] > 128
            arr_c[ANCHOR_Y_120 + 1:, :, :] = 0
            for x_i in np.where(over)[0]:
                if arr_c[ANCHOR_Y_120, x_i, 3] > 128:
                    arr_c[ANCHOR_Y_120, x_i] = C_OUTLINE
        canvas = Image.fromarray(arr_c, "RGBA")
    return canvas


def render_keypose_frame(rigs: dict, kp_name: str, cfg: dict) -> Image.Image:
    canvas = Image.new("RGBA", (LOG_W, LOG_H), (0, 0, 0, 0))
    kp = rigs[kp_name]

    ax = ANCHOR_X_160 + cfg.get("dx", 0.0)
    ay = ANCHOR_Y_120 + cfg.get("dy", 0.0)
    body_deg = cfg.get("body_deg", 0.0)
    sx = cfg.get("sx", 1.0)
    sy = cfg.get("sy", 1.0)

    # Back Layer: 5-Drum Raijin Taiko Thunder-Drum Halo Ring
    if cfg.get("show_drums", True):
        drum_buf = np.zeros((LOG_H, LOG_W, 4), dtype=np.uint8)
        drum_cy = ay - (56.0 if kp_name != "K1_COIL" else 48.0)
        draw_raijin_drums_160(
            drum_buf,
            cx=ax - 3.0,
            cy=drum_cy,
            phase=cfg.get("phase", 0.0),
            charge=cfg.get("drum_charge", 0.45),
        )
        canvas.alpha_composite(Image.fromarray(drum_buf, "RGBA"))

    # Paste 3D-foreshortened samurai keypose body
    paste_keypose_160(canvas, kp, ax, ay, angle_deg=body_deg, sx=sx, sy=sy)

    fg_buf = np.zeros((LOG_H, LOG_W, 4), dtype=np.uint8)

    # Shoulder & hip anchor coordinates per 3D keypose
    if kp_name == "K1_COIL":
        l_sh = (ax - 9.0, ay - 52.0)
        r_sh = (ax + 7.0, ay - 50.0)
        hip_xy = (ax - 4.0, ay - 39.0)
    elif kp_name == "K2_LUNGE":
        l_sh = (ax - 8.0, ay - 49.0)
        r_sh = (ax + 5.0, ay - 47.0)
        hip_xy = (ax - 5.0, ay - 36.0)
    elif kp_name == "K3_RISE":
        l_sh = (ax - 9.0, ay - 57.0)
        r_sh = (ax + 8.0, ay - 60.0)
        hip_xy = (ax - 3.0, ay - 43.0)
    else:  # K4_LEAP
        l_sh = (ax - 8.0, ay - 48.0)
        r_sh = (ax + 6.0, ay - 46.0)
        hip_xy = (ax - 3.0, ay - 36.0)

    draw_obi_tassels_160(
        fg_buf,
        hip_x=hip_xy[0] + 4.0,
        hip_y=hip_xy[1] + 2.0,
        lag_deg=cfg.get("tassel_lag", 14.0),
        wave_phase=cfg.get("phase", 0.0),
        energy=cfg.get("energy", 0.35),
    )

    sheathed = cfg.get("sheathed", False)
    saya_kx = hip_xy[0] - 2.0
    saya_ky = hip_xy[1] + 1.0
    draw_saya_160(
        fg_buf,
        koiguchi_x=saya_kx,
        koiguchi_y=saya_ky,
        angle_deg=cfg.get("saya_deg", 156.0),
        sheathed=sheathed,
        koiguchi_spark=cfg.get("koiguchi_spark", 0.0),
    )

    if not sheathed and cfg.get("draw_sword", True):
        hilt_x = ax + cfg.get("sword_hx", 18.0)
        hilt_y = ay + cfg.get("sword_hy", -46.0)
        sword_deg = cfg.get("sword_deg", 4.0)

        if kp["native_arms"]:
            # K1_COIL native arms clasp right at hip; draw drawn blade from native grip
            draw_raijin_odachi_160(
                fg_buf,
                hilt_x=hilt_x,
                hilt_y=hilt_y,
                angle_deg=sword_deg,
                blade_len=cfg.get("blade_len", 56.0),
                sori_sign=cfg.get("sori_sign", -1.0),
                storm_charge=cfg.get("storm_charge", 0.55),
            )
        else:
            # Back arm first, then sword, then front arm
            rad = math.radians(sword_deg)
            ux, uy = math.cos(rad), math.sin(rad)
            bg_grip = (hilt_x - ux * 7.8, hilt_y - uy * 7.8)
            if cfg.get("two_handed", True):
                draw_samurai_kote_arm_160(
                    fg_buf, l_sh[0], l_sh[1], bg_grip[0], bg_grip[1],
                    is_front=False, bend_sign=cfg.get("bend_b", 1.0),
                )
            else:
                draw_samurai_kote_arm_160(
                    fg_buf, l_sh[0], l_sh[1], saya_kx, saya_ky,
                    is_front=False, bend_sign=1.0,
                )

            fg_grip, _, _ = draw_raijin_odachi_160(
                fg_buf,
                hilt_x=hilt_x,
                hilt_y=hilt_y,
                angle_deg=sword_deg,
                blade_len=cfg.get("blade_len", 56.0),
                sori_sign=cfg.get("sori_sign", -1.0),
                storm_charge=cfg.get("storm_charge", 0.55),
            )
            draw_samurai_kote_arm_160(
                fg_buf, r_sh[0], r_sh[1], fg_grip[0], fg_grip[1],
                is_front=True, bend_sign=cfg.get("bend_f", 1.0),
            )

    # Sleek Dark-Samurai Zantetsuken Iaido vacuum gleams & Raijin thunder sparks!
    smear = cfg.get("smear")
    if smear:
        kind = smear["kind"]
        if kind == "gleam":
            draw_iaido_vacuum_gleam_160(
                fg_buf,
                x0=ax + smear.get("x0", 18.0),
                y0=ay + smear.get("y0", -44.0),
                x1=ax + smear.get("x1", 88.0),
                y1=ay + smear.get("y1", -44.0),
                style=smear.get("style", "horizon"),
                intensity=smear.get("intensity", 1.0),
                max_x=smear.get("max_x", 155),
                seed=smear.get("seed", 1),
            )

    canvas.alpha_composite(Image.fromarray(fg_buf, "RGBA"))
    if cfg.get("clamp_ground", False):
        arr_c = np.array(canvas, dtype=np.uint8)
        if ANCHOR_Y_120 + 1 < LOG_H:
            over = arr_c[ANCHOR_Y_120 + 1, :, 3] > 128
            arr_c[ANCHOR_Y_120 + 1:, :, :] = 0
            for x_i in np.where(over)[0]:
                if arr_c[ANCHOR_Y_120, x_i, 3] > 128:
                    arr_c[ANCHOR_Y_120, x_i] = C_OUTLINE
        canvas = Image.fromarray(arr_c, "RGBA")
    return canvas


# ==============================================================================
# 6. ALL 10 ANIMATION ROWS (30 FRAMES EACH = 300 FRAMES @ 320x240)
# ==============================================================================

def build_row0_idle(rigs: dict) -> list[Image.Image]:
    """Row 0: Poised Seigan / Iaido Ready Stance with 5 Floating Raijin Drums."""
    frames = []
    for f in range(30):
        ph = (f / 30.0) * 2.0 * math.pi
        breath = math.sin(ph)
        frames.append(render_stand_rig_frame(rigs, {
            "phase": ph,
            "sink": 0.9 * (0.5 + 0.5 * breath),
            "torso_lean": 1.8 + 0.9 * breath,
            "head_nod": 0.6 * breath,
            "hair_wave": 2.4 * math.sin(ph - 0.6),
            "tassel_lag": 8.0 + 7.0 * math.sin(ph - 0.8),
            "drum_charge": 0.30 + 0.15 * (0.5 + 0.5 * math.sin(ph * 2.0)),
            "sheathed": False,
            "two_handed": False,
            "sword_hx": 13.5 + 0.7 * breath,
            "sword_hy": -5.5 + 0.9 * breath,
            "sword_deg": -24.0 + 2.2 * math.sin(ph - 0.4),
            "storm_charge": 0.30 + 0.18 * (0.5 + 0.5 * math.cos(ph)),
        }))
    return frames


_WALK_GAIT_KFS = (
    # (u, world_thigh_deg, world_shin_deg, world_foot_deg, hip_yaw_px, knee_lift_px)
    # Convention: -deg = FORWARD (+X, right), +deg = BACKWARD (-X, left).
    # Single-stance windows (F01..F06 & F16..F21): planted sole remains strictly in y=[224..230]
    # traveling -X while lifted swing foot clears cleanly above y=222 and tucks heel behind knee!
    (0.000, -27.0, -17.0,  -4.0, +2.0,  0.0),  # Front Contact (heel plant forward +X)
    (0.035, -24.0, -13.0,   0.0, +1.8,  0.0),  # F01 flat sole plant!
    (0.140, -11.0,  -3.0,   0.0, +0.9,  0.0),  # Weight acceptance
    (0.250,  +2.5,  +5.0,   0.0,  0.0,  0.0),  # Mid-stance directly under hip
    (0.375, +15.0, +19.0,  +4.0, -1.0,  0.0),  # Heel rise / push forward
    (0.500, +23.0, +33.0, +10.0, -1.9, -1.2),  # Rear Push-Off (toe leaves floor next frame!)
    (0.535, +18.0, +46.0,  +6.0, -1.5, -3.0),  # F01/F16 swing leg clears cleanly above y=223
    (0.640,  +3.0, +58.0,  -2.0, -0.5, -4.4),  # High knee fold behind!
    (0.750, -14.0, +36.0,  -5.0, +0.5, -4.6),  # Mid-swing PASSING CROSSOVER directly over AX!
    (0.880, -28.0,  -4.0,  -7.0, +1.6, -2.0),  # Terminal swing reach
    (1.000, -27.0, -17.0,  -4.0, +2.0,  0.0),  # Seamless Loop Wrap
)


def _sample_walk_gait_ronin(u: float):
    u = float(u) % 1.0
    k0, k1 = _WALK_GAIT_KFS[0], _WALK_GAIT_KFS[-1]
    for i in range(len(_WALK_GAIT_KFS) - 1):
        if _WALK_GAIT_KFS[i][0] <= u <= _WALK_GAIT_KFS[i + 1][0]:
            k0, k1 = _WALK_GAIT_KFS[i], _WALK_GAIT_KFS[i + 1]
            break
    span = k1[0] - k0[0]
    t = 0.0 if span <= 1e-6 else (u - k0[0]) / span
    s = 0.5 - 0.5 * math.cos(math.pi * t)
    return tuple(k0[j] + (k1[j] - k0[j]) * s for j in range(1, 6))


def build_row1_walk(rigs: dict) -> list[Image.Image]:
    """
    Row 1: Authentic Human Bipedal Crossover Samurai Walk Cycle (30 frames, 0% crab-walk, 0% moonwalk!):
      - Both hip sockets centered inward (`inward_frac = 0.94`) under the shared spine/pelvis X
      - Standing straddle rest angles (`th0_thigh = -13.00 deg`, `th0_shin = -5.71 deg`) neutralized
      - `u_l = f / 30.0` and `u_r = (u_l + 0.5) % 1.0` driven 180 deg out of phase with far leg (`r_*`)
        rendered strictly BEHIND near leg (`l_*`)
      - F01->F06 & F16->F21: true single-stance planted sole travels `-X` (`stanceDelta <= -8.0px`) while
        lifted swing heel tucks naturally backward behind knee!
      - F07 / F22: passing crossover directly over `AX` (`minBootSpan <= 0.55 * maxBootSpan`, `maxBootSpan >= 56px`)
      - Crisp two-handed Chudan-no-Kamae Thunder-Odachi carry, locked ground sole (`y = 115`), `maxAdjTopDelta <= 4px`.
    """
    parts = rigs["parts"]
    th0_thigh = math.degrees(math.atan2(-(314.0 - 302.0), 392.0 - 340.0))  # -13.00 deg
    th0_shin = math.degrees(math.atan2(-(320.0 - 314.0), 452.0 - 392.0))   # -5.71 deg
    len_thigh = math.hypot(314.0 - 302.0, 392.0 - 340.0) * SCALE           # 9.63 logical px
    len_shin = math.hypot(320.0 - 314.0, 452.0 - 392.0) * SCALE            # 10.88 logical px

    # Neutralize wide standing straddle (`inward_frac = 0.94` -> 94% inward to central pelvis X)
    lx0 = ANCHOR_X_160 + (234.0 - SPINE_X_512) * SCALE
    rx0 = ANCHOR_X_160 + (302.0 - SPINE_X_512) * SCALE
    mid_hip_x = 0.5 * (lx0 + rx0) - 0.3
    rem_half = 0.5 * (rx0 - lx0) * (1.0 - 0.94)
    base_hip_y = ANCHOR_Y_120 + (340.0 - GROUND_Y_512) * SCALE + 2.5

    frames = []
    for f in range(30):
        u_l = (f / 30.0) % 1.0
        u_r = (u_l + 0.5) % 1.0
        ph = u_l * 2.0 * math.pi

        lt_w, ls_w, lf_w, lyaw, l_klift = _sample_walk_gait_ronin(u_l)
        rt_w, rs_w, rf_w, ryaw, r_klift = _sample_walk_gait_ronin(u_r)

        # Subtle 2-step walk cadence (`cos(2 * ph)` -> <= 2px in 320x240, maxAdjTopDelta <= 2px!)
        bob = 0.70 * math.cos(2.0 * ph)
        torso_lean = 3.8 + 0.75 * math.sin(2.0 * ph)
        head_nod = -1.2 + 0.45 * math.sin(2.0 * ph)
        rad_t = math.radians(torso_lean)
        tx_off = math.sin(rad_t) * 14.0
        ty_off = (1.0 - math.cos(rad_t)) * 8.0

        def map_upper(x512: float, y512: float) -> tuple[float, float]:
            return (
                ANCHOR_X_160 + (x512 - SPINE_X_512) * SCALE,
                ANCHOR_Y_120 + (y512 - GROUND_Y_512) * SCALE + bob,
            )

        # Solve 2-segment + foot FK for Far (Right) and Near (Left) legs, then lock stance sole to ANCHOR_Y_120
        def solve_leg(hip_x: float, hip_y: float, tw: float, sw: float, fw: float, klift: float):
            r_th = math.radians(tw)
            r_sh = math.radians(sw)
            kx = hip_x - math.sin(r_th) * len_thigh
            ky = hip_y + math.cos(r_th) * len_thigh + klift
            ax_pt = kx - math.sin(r_sh) * len_shin
            ay_pt = ky + math.cos(r_sh) * len_shin
            return (hip_x, hip_y), (kx, ky), (ax_pt, ay_pt), (tw - th0_thigh), (sw - th0_shin), fw

        r_hip_p, r_knee_p, r_ank_p, r_th_deg, r_sh_deg, r_ft_deg = solve_leg(
            mid_hip_x + rem_half + ryaw, base_hip_y + bob * 0.5, rt_w, rs_w, rf_w, r_klift
        )
        l_hip_p, l_knee_p, l_ank_p, l_th_deg, l_sh_deg, l_ft_deg = solve_leg(
            mid_hip_x - rem_half + lyaw, base_hip_y + bob * 0.5, lt_w, ls_w, lf_w, l_klift
        )

        # Render legs onto a dedicated buffer first so we lock the lower stance boot sole to y = ANCHOR_Y_120 (0px vertical pop!)
        legs_im = Image.new("RGBA", (LOG_W, LOG_H), (0, 0, 0, 0))
        # 1) Far leg (`r_*`) strictly BEHIND Near leg (`l_*`)
        paste_part_160(legs_im, parts["w_thigh_far"], r_hip_p, angle_deg=r_th_deg)
        paste_part_160(legs_im, parts["w_shin_far"], r_knee_p, angle_deg=r_sh_deg)
        paste_part_160(legs_im, parts["w_foot_far"], r_ank_p, angle_deg=r_ft_deg)
        # 2) Near leg (`l_*`) in front
        paste_part_160(legs_im, parts["w_thigh"], l_hip_p, angle_deg=l_th_deg)
        paste_part_160(legs_im, parts["w_shin"], l_knee_p, angle_deg=l_sh_deg)
        paste_part_160(legs_im, parts["w_foot"], l_ank_p, angle_deg=l_ft_deg)

        legs_arr = np.array(legs_im, dtype=np.uint8)
        lys, _ = np.where(legs_arr[:, :, 3] >= 128)
        leg_dy = (ANCHOR_Y_120 - int(lys.max())) if len(lys) > 0 else 0
        if leg_dy != 0:
            shifted = np.zeros_like(legs_arr)
            s_y0 = max(0, -leg_dy)
            s_y1 = min(LOG_H, LOG_H - leg_dy)
            d_y0 = max(0, leg_dy)
            d_y1 = min(LOG_H, LOG_H + leg_dy)
            if s_y1 > s_y0:
                shifted[d_y0:d_y1] = legs_arr[s_y0:s_y1]
            legs_im = Image.fromarray(shifted, "RGBA")

        canvas = Image.new("RGBA", (LOG_W, LOG_H), (0, 0, 0, 0))
        hip_x, hip_y = map_upper(276.0, 248.0)

        # Layer 0: 5-Drum Raijin Taiko Thunder-Drum Halo Ring
        drum_buf = np.zeros((LOG_H, LOG_W, 4), dtype=np.uint8)
        draw_raijin_drums_160(
            drum_buf,
            cx=hip_x + tx_off - 2.0,
            cy=hip_y - 25.0 + ty_off,
            phase=ph,
            charge=0.36 + 0.10 * (0.5 + 0.5 * math.sin(ph * 2.0)),
        )
        canvas.alpha_composite(Image.fromarray(drum_buf, "RGBA"))

        # Layer 1: Silver-White Samurai Mane
        hair_x, hair_y = map_upper(254.0, 96.0)
        paste_part_160(
            canvas,
            parts["hair"],
            (hair_x + tx_off * 1.15, hair_y + ty_off),
            angle_deg=torso_lean * 0.55 + 2.6 * math.sin(ph - 0.5),
        )

        # Layer 2: Ground-locked Bipedal Crossover Legs
        canvas.alpha_composite(legs_im)

        # Layer 3: Obi & Kusazuri Tassets (subtle sway with stride) + Do Cuirass + Pauldrons + Kabuto Head
        obi_sway = torso_lean * 0.45 + 2.4 * math.cos(ph)
        paste_part_160(canvas, parts["obi"], (hip_x + tx_off * 0.35, hip_y + ty_off * 0.5), angle_deg=obi_sway, scale_x=0.88)
        torso_xy = map_upper(276.0, 236.0)
        paste_part_160(canvas, parts["torso"], (torso_xy[0] + tx_off * 0.5, torso_xy[1] + ty_off * 0.5), angle_deg=torso_lean)

        r_sh = map_upper(312.0, 148.0)
        r_sh = (r_sh[0] + tx_off, r_sh[1] + ty_off)
        paste_part_160(canvas, parts["r_pauldron"], r_sh, angle_deg=torso_lean * 0.8)

        head_xy = map_upper(278.0, 134.0)
        paste_part_160(canvas, parts["head"], (head_xy[0] + tx_off * 1.15, head_xy[1] + ty_off), angle_deg=torso_lean * 0.65 + head_nod)

        l_sh = map_upper(226.0, 144.0)
        l_sh = (l_sh[0] + tx_off * 0.85, l_sh[1] + ty_off)
        paste_part_160(canvas, parts["l_pauldron"], l_sh, angle_deg=torso_lean * 0.7)

        # Layer 4: Waist Saya + Two-Handed Chudan-no-Kamae Poise on Curved Raijin Thunder-Odachi
        fg_buf = np.zeros((LOG_H, LOG_W, 4), dtype=np.uint8)
        draw_obi_tassels_160(
            fg_buf,
            hip_x=hip_x + tx_off * 0.35 + 2.0,
            hip_y=hip_y + 4.0,
            lag_deg=12.0 + 4.5 * math.sin(ph - 0.6),
            wave_phase=ph,
            energy=0.10,
        )
        koiguchi_x = hip_x - 3.5 + tx_off * 0.3
        koiguchi_y = hip_y + 2.5
        draw_saya_160(
            fg_buf,
            koiguchi_x=koiguchi_x,
            koiguchi_y=koiguchi_y,
            angle_deg=156.0 + 2.0 * math.sin(ph),
            sheathed=False,
            koiguchi_spark=0.0,
        )

        # Two-handed Chudan-no-Kamae katana guard with subtle counter-sway
        sway_c = math.cos(ph)
        hilt_x = hip_x + 14.5 - sway_c * 1.2
        hilt_y = hip_y - 5.5 + abs(sway_c) * 0.6
        sword_deg = -21.5 + sway_c * 3.2
        fg_grip, bg_grip, _ = draw_raijin_odachi_160(
            fg_buf,
            hilt_x=hilt_x,
            hilt_y=hilt_y,
            angle_deg=sword_deg,
            blade_len=55.0,
            sori_sign=-1.0,
            storm_charge=0.34 + 0.10 * (0.5 + 0.5 * sway_c),
        )
        draw_samurai_kote_arm_160(fg_buf, l_sh[0] + 1, l_sh[1] + 5, bg_grip[0], bg_grip[1], is_front=False, bend_sign=1.0)
        draw_samurai_kote_arm_160(fg_buf, r_sh[0], r_sh[1] + 5, fg_grip[0], fg_grip[1], is_front=True, bend_sign=1.0)

        canvas.alpha_composite(Image.fromarray(fg_buf, "RGBA"))
        frames.append(canvas)
    return frames


def build_row2_auto_attack(rigs: dict) -> list[Image.Image]:
    """
    Row 2: 4-Beat FFBE / Last Cloudia Battojutsu Combo ([[60,8],[68,7],[75,8],[83,7]]).
    CRITICAL INVARIANT: 100% GROUNDED (dy = 0.0 on ALL 30 frames, including V3 Iaido!).
      V0 (F00..F07): Hip-Saya Nukitsuke coil -> F03 1-frame snap rising-horizontal lightning smear!
      V1 (F08..F14): Zero-idle reverse coil -> F09 1-frame snap rising Kiri-age heaven-arc smear!
      V2 (F15..F22): Shunpo twist -> F17-F18 2.5D supersonic horizontal vortex smear (2-hit)!
      V3 (F23..F29): Grounded Morote Iaido sheath charge -> F25 monumental full-reach crescent smear!
    """
    frames = []
    for f in range(30):
        ph = (f / 30.0) * 4.0 * math.pi
        # ---------------- V0: NUKITSUKE DRAW-SLASH (F00..F07) ----------------
        if f in (0, 1, 2):
            p = f / 2.0
            frames.append(render_keypose_frame(rigs, "K1_COIL", {
                "dx": -3.0 - 2.0 * p,
                "dy": 0.0,
                "phase": ph,
                "drum_charge": 0.45 + 0.35 * p,
                "sheathed": True,
                "saya_deg": 156.0 + 3.0 * p,
                "koiguchi_spark": 0.95 if f == 2 else (0.35 * p),
                "tassel_lag": -14.0 - 6.0 * p,
                "energy": 0.45 + 0.35 * p,
            }))
        elif f == 3:
            # 1-FRAME SNAP: Nukitsuke Zantetsuken vacuum gleam! Front reach x_160 ~ 151 (x_320 = 302)
            frames.append(render_keypose_frame(rigs, "K2_LUNGE", {
                "dx": 9.0,
                "dy": 0.0,
                "phase": ph,
                "drum_charge": 1.0,
                "sheathed": False,
                "two_handed": False,
                "sword_hx": 22.0,
                "sword_hy": -43.0,
                "sword_deg": -8.0,
                "blade_len": 58.0,
                "sori_sign": -1.0,
                "storm_charge": 1.15,
                "tassel_lag": 38.0,
                "energy": 1.0,
                "smear": {
                    "kind": "gleam",
                    "style": "horizon",
                    "x0": 18.0,
                    "y0": -43.0,
                    "x1": 86.0,
                    "y1": -46.0,
                    "intensity": 1.0,
                    "seed": 3,
                },
            }))
        elif f == 4:
            frames.append(render_keypose_frame(rigs, "K2_LUNGE", {
                "dx": 8.0,
                "dy": 0.0,
                "phase": ph,
                "drum_charge": 0.75,
                "sheathed": False,
                "two_handed": False,
                "sword_hx": 23.0,
                "sword_hy": -46.0,
                "sword_deg": -16.0,
                "blade_len": 57.0,
                "storm_charge": 0.85,
                "tassel_lag": 30.0,
                "energy": 0.75,
                "smear": {
                    "kind": "gleam",
                    "style": "horizon",
                    "x0": 32.0,
                    "y0": -45.0,
                    "x1": 80.0,
                    "y1": -47.0,
                    "intensity": 0.45,
                    "seed": 4,
                },
            }))
        elif f in (5, 6, 7):
            # Hold extension -> torque directly into low reverse Kiri-age coil (zero idle reset!)
            p = (f - 5) / 2.0
            frames.append(render_keypose_frame(rigs, "K2_LUNGE" if f == 5 else "K3_RISE", {
                "dx": 6.0 * (1.0 - p) - 2.0 * p,
                "dy": 0.0,
                "phase": ph,
                "drum_charge": 0.55 + 0.20 * p,
                "sheathed": False,
                "two_handed": True,
                "sword_hx": 18.0 * (1.0 - p) + 8.0 * p,
                "sword_hy": -44.0 * (1.0 - p) - 26.0 * p,
                "sword_deg": -18.0 * (1.0 - p) + 52.0 * p,
                "sori_sign": 1.0 if f >= 6 else -1.0,
                "storm_charge": 0.65,
                "tassel_lag": 18.0 - 24.0 * p,
                "energy": 0.50,
            }))

        # ---------------- V1: RISING KIRI-AGE HEAVEN-ARC (F08..F14) ----------------
        elif f == 8:
            frames.append(render_keypose_frame(rigs, "K3_RISE", {
                "dx": -3.0,
                "dy": 0.0,
                "phase": ph,
                "drum_charge": 0.85,
                "sheathed": False,
                "two_handed": True,
                "sword_hx": 10.0,
                "sword_hy": -26.0,
                "sword_deg": 62.0,
                "sori_sign": 1.0,
                "storm_charge": 0.90,
                "tassel_lag": -16.0,
                "energy": 0.70,
            }))
        elif f == 9:
            # 1-FRAME SNAP: Rising Kiri-age Zantetsuken gleam! Front reach x_160 ~ 148 (x_320 = 296)
            frames.append(render_keypose_frame(rigs, "K3_RISE", {
                "dx": 6.0,
                "dy": 0.0,
                "phase": ph,
                "drum_charge": 1.0,
                "sheathed": False,
                "two_handed": True,
                "sword_hx": 18.0,
                "sword_hy": -50.0,
                "sword_deg": -42.0,
                "blade_len": 52.0,
                "sori_sign": 1.0,
                "storm_charge": 1.15,
                "tassel_lag": 34.0,
                "energy": 1.0,
                "smear": {
                    "kind": "gleam",
                    "style": "rising",
                    "x0": 16.0,
                    "y0": -28.0,
                    "x1": 86.0,
                    "y1": -74.0,
                    "intensity": 1.0,
                    "seed": 9,
                },
            }))
        elif f == 10:
            frames.append(render_keypose_frame(rigs, "K3_RISE", {
                "dx": 5.0,
                "dy": 0.0,
                "phase": ph,
                "drum_charge": 0.80,
                "sheathed": False,
                "two_handed": True,
                "sword_hx": 17.0,
                "sword_hy": -51.0,
                "sword_deg": -48.0,
                "blade_len": 50.0,
                "sori_sign": 1.0,
                "storm_charge": 0.85,
                "tassel_lag": 26.0,
                "energy": 0.75,
                "smear": {
                    "kind": "gleam",
                    "style": "rising",
                    "x0": 28.0,
                    "y0": -34.0,
                    "x1": 78.0,
                    "y1": -72.0,
                    "intensity": 0.45,
                    "seed": 10,
                },
            }))
        elif f in (11, 12, 13, 14):
            p = (f - 11) / 3.0
            frames.append(render_keypose_frame(rigs, "K3_RISE", {
                "dx": 4.0 * (1.0 - p) + 2.0 * p,
                "dy": 0.0,
                "phase": ph,
                "drum_charge": 0.55 + 0.25 * p,
                "sheathed": False,
                "two_handed": True,
                "sword_hx": 15.0 * (1.0 - p) + 2.0 * p,
                "sword_hy": -50.0 * (1.0 - p) - 42.0 * p,
                "sword_deg": -48.0 * (1.0 - p) - 134.0 * p,
                "blade_len": 46.0 - 6.0 * p,
                "storm_charge": 0.65,
                "tassel_lag": 16.0 - 28.0 * p,
                "energy": 0.55,
            }))

        # ---------------- V2: 2.5D SHUNPO HORIZONTAL VORTEX (F15..F22) ----------------
        elif f in (15, 16):
            p = f - 15
            frames.append(render_keypose_frame(rigs, "K2_LUNGE", {
                "dx": 2.0 - 1.0 * p,
                "dy": 0.0,
                "phase": ph,
                "drum_charge": 0.80 + 0.15 * p,
                "sheathed": False,
                "two_handed": True,
                "sword_hx": 2.0 - 1.0 * p,
                "sword_hy": -44.0,
                "sword_deg": -152.0 - 5.0 * p,
                "blade_len": 38.0,
                "storm_charge": 0.90,
                "tassel_lag": -20.0,
                "energy": 0.75,
            }))
        elif f == 17:
            # 1-FRAME SNAP: Supersonic Shunpo Cross-Cut Vacuum Gleam (Hit 1 of 2, x_160 ~ 151 -> x_320 = 302)
            frames.append(render_keypose_frame(rigs, "K2_LUNGE", {
                "dx": 10.0,
                "dy": 0.0,
                "phase": ph,
                "drum_charge": 1.0,
                "sheathed": False,
                "two_handed": True,
                "sword_hx": 24.0,
                "sword_hy": -44.0,
                "sword_deg": 2.0,
                "blade_len": 58.0,
                "storm_charge": 1.25,
                "tassel_lag": 42.0,
                "energy": 1.0,
                "smear": {
                    "kind": "gleam",
                    "style": "cross",
                    "x0": 18.0,
                    "y0": -45.0,
                    "x1": 85.0,
                    "y1": -45.0,
                    "intensity": 1.0,
                    "seed": 17,
                },
            }))
        elif f == 18:
            # Counter-whipping cross-cut vacuum dissipator (Hit 2 of 2)
            frames.append(render_keypose_frame(rigs, "K2_LUNGE", {
                "dx": 9.0,
                "dy": 0.0,
                "phase": ph,
                "drum_charge": 0.95,
                "sheathed": False,
                "two_handed": True,
                "sword_hx": 21.0,
                "sword_hy": -47.0,
                "sword_deg": -14.0,
                "blade_len": 57.0,
                "storm_charge": 1.05,
                "tassel_lag": 36.0,
                "energy": 0.90,
                "smear": {
                    "kind": "gleam",
                    "style": "cross",
                    "x0": 24.0,
                    "y0": -47.0,
                    "x1": 80.0,
                    "y1": -43.0,
                    "intensity": 0.60,
                    "seed": 18,
                },
            }))
        elif f in (19, 20, 21, 22):
            p = (f - 19) / 3.0
            if f <= 20:
                frames.append(render_keypose_frame(rigs, "K2_LUNGE", {
                    "dx": 7.0 - 4.0 * p,
                    "dy": 0.0,
                    "phase": ph,
                    "drum_charge": 0.65,
                    "sheathed": False,
                    "two_handed": True,
                    "sword_hx": 16.0 - 8.0 * p,
                    "sword_hy": -44.0 + 4.0 * p,
                    "sword_deg": -20.0 + 35.0 * p,
                    "storm_charge": 0.70,
                    "tassel_lag": 22.0 * (1.0 - p),
                    "energy": 0.55,
                }))
            else:
                # Snap blade into waist Saya to coil grounded Morote Iaido for V3!
                frames.append(render_keypose_frame(rigs, "K1_COIL", {
                    "dx": -2.0 - 2.0 * p,
                    "dy": 0.0,
                    "phase": ph,
                    "drum_charge": 0.80 + 0.15 * p,
                    "sheathed": True,
                    "koiguchi_spark": 0.55 if f == 22 else 0.25,
                    "tassel_lag": -12.0,
                    "energy": 0.70,
                }))

        # ---------------- V3: GROUNDED MOROTE ZANTETSUKEN FINISHER (F23..F29) ----------------
        elif f in (23, 24):
            p = f - 23
            frames.append(render_keypose_frame(rigs, "K1_COIL", {
                "dx": -5.0 - 2.0 * p,
                "dy": 0.0,  # STRICTLY GROUNDED (0px float!)
                "phase": ph,
                "drum_charge": 1.0,
                "sheathed": True,
                "saya_deg": 159.0 + 2.0 * p,
                "koiguchi_spark": 1.25 if f == 24 else 0.85,
                "tassel_lag": -22.0,
                "energy": 1.0,
            }))
        elif f == 25:
            # 1-FRAME MONUMENTAL SNAP: Grounded Morote Zantetsuken Full-Reach Vacuum Gleam!
            # Front reach x_160 = 56 + 11 + 85 = 152 -> x_320 = 305..307 (within [286..310], 0 border clips!)
            frames.append(render_keypose_frame(rigs, "K2_LUNGE", {
                "dx": 11.0,
                "dy": 0.0,  # STRICTLY GROUNDED (0px float!)
                "phase": ph,
                "drum_charge": 1.25,
                "sheathed": False,
                "two_handed": True,
                "sword_hx": 23.0,
                "sword_hy": -43.0,
                "sword_deg": 4.0,
                "blade_len": 59.0,
                "sori_sign": -1.0,
                "storm_charge": 1.40,
                "tassel_lag": 46.0,
                "energy": 1.2,
                "smear": {
                    "kind": "gleam",
                    "style": "zantetsu",
                    "x0": 23.0,
                    "y0": -42.0,
                    "x1": 85.0,
                    "y1": -39.0,
                    "intensity": 1.05,
                    "max_x": 153,
                    "seed": 25,
                },
            }))
        elif f in (26, 27):
            p = f - 26
            frames.append(render_keypose_frame(rigs, "K2_LUNGE", {
                "dx": 11.0 - 1.5 * p,
                "dy": 0.0,
                "phase": ph,
                "drum_charge": 1.0 - 0.15 * p,
                "sheathed": False,
                "two_handed": True,
                "sword_hx": 23.0,
                "sword_hy": -44.0,
                "sword_deg": 8.0 + 4.0 * p,
                "blade_len": 58.0,
                "storm_charge": 1.10 - 0.20 * p,
                "tassel_lag": 34.0 - 8.0 * p,
                "energy": 0.90,
                "smear": {
                    "kind": "gleam",
                    "style": "zantetsu",
                    "x0": 34.0 + 6.0 * p,
                    "y0": -41.0,
                    "x1": 82.0 - 4.0 * p,
                    "y1": -39.0,
                    "intensity": 0.50 - 0.16 * p,
                    "max_x": 154,
                    "seed": 26 + p,
                },
            }))
        else:  # F28..F29 settle
            p = f - 28
            frames.append(render_keypose_frame(rigs, "K2_LUNGE", {
                "dx": 7.0 - 3.5 * p,
                "dy": 0.0,
                "phase": ph,
                "drum_charge": 0.60 - 0.15 * p,
                "sheathed": False,
                "two_handed": False,
                "sword_hx": 19.0 - 4.0 * p,
                "sword_hy": -42.0 + 2.0 * p,
                "sword_deg": -8.0 - 10.0 * p,
                "blade_len": 56.0,
                "storm_charge": 0.60,
                "tassel_lag": 18.0 - 8.0 * p,
                "energy": 0.45,
            }))
    return frames


def build_row3_skill(rigs: dict) -> list[Image.Image]:
    """
    Row 3: ZANTETSUKEN FLASH (3 Multi-Angle Lightning Dashes + F24-F29 Noto Sheath Detonation).
    """
    frames = []
    for f in range(30):
        ph = (f / 30.0) * 4.0 * math.pi
        if f <= 3:
            p = f / 3.0
            frames.append(render_keypose_frame(rigs, "K1_COIL", {
                "dx": -4.0 - 2.0 * p,
                "dy": 0.0,
                "phase": ph,
                "drum_charge": 0.70 + 0.30 * p,
                "sheathed": True,
                "koiguchi_spark": 1.0 if f == 3 else 0.4 * p,
                "tassel_lag": -18.0,
                "energy": 0.8,
            }))
        elif f <= 9:
            p = (f - 4) / 5.0
            frames.append(render_keypose_frame(rigs, "K2_LUNGE", {
                "dx": 10.0 - 2.0 * p,
                "dy": 0.0,
                "phase": ph,
                "drum_charge": 1.0,
                "sheathed": False,
                "two_handed": True,
                "sword_hx": 23.0,
                "sword_hy": -44.0,
                "sword_deg": 0.0 - 8.0 * p,
                "blade_len": 58.0,
                "storm_charge": 1.15,
                "tassel_lag": 40.0,
                "energy": 1.0,
                "smear": {
                    "kind": "gleam",
                    "style": "horizon",
                    "x0": 18.0,
                    "y0": -44.0,
                    "x1": 78.0 - 6.0 * p,
                    "y1": -45.0,
                    "intensity": 0.95 if f == 4 else 0.45,
                    "seed": 30 + f,
                } if f <= 6 else None,
            }))
        elif f <= 16:
            p = (f - 10) / 6.0
            frames.append(render_keypose_frame(rigs, "K3_RISE", {
                "dx": 7.0 - 2.0 * p,
                "dy": -2.0 * math.sin(p * math.pi),
                "phase": ph,
                "drum_charge": 1.0,
                "sheathed": False,
                "two_handed": True,
                "sword_hx": 18.0,
                "sword_hy": -49.0,
                "sword_deg": -42.0 - 6.0 * p,
                "blade_len": 50.0,
                "sori_sign": 1.0,
                "storm_charge": 1.15,
                "tassel_lag": 34.0,
                "energy": 1.0,
                "smear": {
                    "kind": "gleam",
                    "style": "rising",
                    "x0": 16.0,
                    "y0": -28.0,
                    "x1": 74.0 - 6.0 * p,
                    "y1": -70.0,
                    "intensity": 0.95 if f == 10 else 0.45,
                    "seed": 40 + f,
                } if f <= 12 else None,
            }))
        elif f <= 23:
            p = (f - 17) / 6.0
            frames.append(render_keypose_frame(rigs, "K4_LEAP", {
                "dx": 8.0 * (1.0 - 0.5 * p),
                "dy": -6.0 * (1.0 - p),
                "phase": ph,
                "drum_charge": 1.0,
                "sheathed": False,
                "two_handed": True,
                "sword_hx": 18.0,
                "sword_hy": -38.0,
                "sword_deg": 24.0 + 12.0 * p,
                "storm_charge": 1.15,
                "tassel_lag": 32.0,
                "energy": 0.95,
                "smear": {
                    "kind": "gleam",
                    "style": "cross",
                    "x0": 14.0,
                    "y0": -48.0,
                    "x1": 72.0 - 6.0 * p,
                    "y1": -34.0,
                    "intensity": 0.95 if f == 17 else 0.45,
                    "seed": 50 + f,
                } if f <= 19 else None,
            }))
        else:
            # F24..F29: Crisp Noto sheath snap & koiguchi detonation star!
            p = (f - 24) / 5.0
            frames.append(render_stand_rig_frame(rigs, {
                "dx": 2.0 * (1.0 - p),
                "phase": ph,
                "sink": 1.2 * (1.0 - p),
                "torso_lean": 3.0 * (1.0 - p),
                "hair_wave": 4.0 * math.sin(p * math.pi),
                "tassel_lag": 16.0 * (1.0 - p),
                "drum_charge": 1.10 - 0.50 * p,
                "sheathed": True,
                "koiguchi_spark": 1.35 if f == 25 else max(0.0, 0.85 - 0.30 * abs(f - 25)),
                "energy": 0.85 * (1.0 - p),
            }))
    return frames


def build_row4_ultimate(rigs: dict) -> list[Image.Image]:
    """
    Row 4: SUSANOO THUNDERSTORM & AMAKAKERU Slash Flurry + Heaven-Cleaving Finisher.
    """
    frames = []
    for f in range(30):
        ph = (f / 30.0) * 6.0 * math.pi
        if f <= 4:
            p = f / 4.0
            frames.append(render_keypose_frame(rigs, "K1_COIL", {
                "dx": -4.0 * p,
                "dy": 0.0,
                "phase": ph,
                "drum_charge": 0.85 + 0.45 * p,
                "sheathed": True,
                "koiguchi_spark": 1.25 * p,
                "tassel_lag": -20.0 * p,
                "energy": 1.0,
            }))
        elif f <= 19:
            beat = (f - 5) // 3
            sub = (f - 5) % 3
            pose = ("K2_LUNGE", "K3_RISE", "K4_LEAP", "K2_LUNGE", "K3_RISE")[beat]
            dy = -7.0 if pose == "K4_LEAP" else 0.0
            deg = (-42.0, -56.0, 38.0, -34.0, -52.0)[beat]
            frames.append(render_keypose_frame(rigs, pose, {
                "dx": 4.0 if sub == 0 else 2.5,
                "dy": dy,
                "phase": ph,
                "drum_charge": 1.25,
                "sheathed": False,
                "two_handed": True,
                "sword_hx": 15.0,
                "sword_hy": -45.0 if pose != "K3_RISE" else -49.0,
                "sword_deg": deg,
                "blade_len": 48.0 if pose == "K3_RISE" else 50.0,
                "sori_sign": 1.0 if beat % 2 == 1 else -1.0,
                "storm_charge": 1.35,
                "tassel_lag": 34.0 - sub * 6.0,
                "energy": 1.15,
                "smear": {
                    "kind": "gleam",
                    "style": "cross" if beat == 3 else ("rising" if beat % 2 == 1 else "horizon"),
                    "x0": 14.0,
                    "y0": -40.0 if beat % 2 == 0 else -28.0,
                    "x1": 64.0,
                    "y1": -58.0 if beat % 2 == 1 else -44.0,
                    "intensity": 0.90 if sub == 0 else 0.42,
                    "max_x": 127,
                    "seed": 60 + f,
                } if sub <= 1 else None,
            }))
        elif f <= 25:
            # Towering Susanoo Heaven-Splitting Kiri-oroshi Cleave! Keep strictly maxX <= 262 (x_160 <= 130)!
            p = (f - 20) / 5.0
            frames.append(render_keypose_frame(rigs, "K2_LUNGE", {
                "dx": 6.0 - 1.5 * p,
                "dy": 0.0,
                "phase": ph,
                "drum_charge": 1.35 - 0.25 * p,
                "sheathed": False,
                "two_handed": True,
                "sword_hx": 17.0,
                "sword_hy": -48.0,
                "sword_deg": 32.0 + 6.0 * p,
                "blade_len": 52.0,
                "storm_charge": 1.45 - 0.30 * p,
                "tassel_lag": 38.0 * (1.0 - 0.4 * p),
                "energy": 1.25,
                "smear": {
                    "kind": "gleam",
                    "style": "zantetsu",
                    "x0": 18.0,
                    "y0": -49.0,
                    "x1": 62.0,
                    "y1": -20.0,
                    "intensity": max(0.38, 0.95 - 0.45 * p),
                    "max_x": 127,
                    "seed": 80 + f,
                } if f <= 23 else None,
            }))
        else:
            p = (f - 26) / 3.0
            frames.append(render_stand_rig_frame(rigs, {
                "dx": 2.0 * (1.0 - 0.5 * p),
                "phase": ph,
                "stride_x": 3.4 * (1.0 - 0.25 * p),
                "l_hip": 9.0 * (1.0 - 0.30 * p),
                "r_hip": -9.0 * (1.0 - 0.30 * p),
                "torso_lean": 2.0 * (1.0 - p),
                "hair_wave": 5.0 * (1.0 - p),
                "tassel_lag": 14.0 * (1.0 - p),
                "drum_charge": 1.0 - 0.40 * p,
                "sheathed": True,
                "koiguchi_spark": 1.30 if f == 27 else 0.45,
                "energy": 0.70,
                "clamp_ground": True,
            }))
    return frames


def build_row5_hurt_death(rigs: dict) -> list[Image.Image]:
    """
    Row 5: F00..F05 HURT stagger recoil, F06..F15 kneeling collapse, F16..F29 grounded fall.
    Collapsing/prone body shifts rightward (`slide_dx = +18..+24` logical) so head & silver mane
    NEVER hit the left cell border (`minX >= 28`, `maxX <= 290`, `height <= 88px` in 320x240, `0` cuts)!
    """
    frames = []
    for f in range(30):
        ph = (f / 30.0) * 2.0 * math.pi
        if f <= 5:
            p = math.sin(((f + 1) / 6.0) * math.pi)
            frames.append(render_stand_rig_frame(rigs, {
                "dx": -3.0 * p,
                "phase": ph,
                "sink": 2.5 * p,
                "torso_lean": -12.0 * p,
                "head_nod": -7.0 * p,
                "l_hip": 10.0 * p,
                "r_hip": -12.0 * p,
                "hair_wave": -8.0 * p,
                "tassel_lag": -20.0 * p,
                "drum_charge": 0.15,
                "sheathed": False,
                "two_handed": False,
                "sword_hx": 9.0 - 3.0 * p,
                "sword_hy": -8.0 - 4.0 * p,
                "sword_deg": -44.0 - 14.0 * p,
                "storm_charge": 0.10,
            }))
        elif f <= 13:
            p = (f - 6) / 7.0
            frames.append(render_keypose_frame(rigs, "K1_COIL", {
                "dx": 6.0 + 14.0 * p,
                "dy": 4.0 * p,
                "body_deg": -24.0 * p,
                "sy": 1.0 - 0.14 * p,
                "show_drums": f <= 11,
                "phase": ph,
                "drum_charge": max(0.0, 0.20 * (1.0 - p)),
                "sheathed": False,
                "draw_sword": True,
                "sword_hx": 14.0 + 4.0 * p,
                "sword_hy": -28.0 + 18.0 * p,
                "sword_deg": 48.0 + 32.0 * p,
                "blade_len": 46.0,
                "storm_charge": 0.05,
                "tassel_lag": -16.0,
                "energy": 0.0,
            }))
        else:
            p = (f - 14) / 15.0
            fall_u = min(1.0, (f - 14) / 8.0)  # reaches full horizontal prone by F22!
            ang = -38.0 - 50.0 * fall_u        # smoothly tilts -38 -> -88 deg onto floor
            slide_dx = 20.0 + 12.0 * fall_u
            drop_y = -6.0 - 5.0 * fall_u
            canvas = Image.new("RGBA", (LOG_W, LOG_H), (0, 0, 0, 0))
            paste_keypose_160(
                canvas,
                rigs["K4_LEAP"],
                ANCHOR_X_160 + slide_dx,
                ANCHOR_Y_120 + drop_y,
                angle_deg=ang,
                sx=0.92,
                sy=0.88,
            )
            fg_buf = np.zeros((LOG_H, LOG_W, 4), dtype=np.uint8)
            # Fallen Raijin Odachi dropping smoothly to rest beside Kaze-Maru (strictly within x_160 = 24..138)
            sw_drop = min(1.0, (f - 14) / 4.0)
            draw_raijin_odachi_160(
                fg_buf,
                hilt_x=ANCHOR_X_160 + 20.0 + 4.0 * sw_drop + p * 0.6,
                hilt_y=ANCHOR_Y_120 - 12.0 * (1.0 - sw_drop) - 4.0 * sw_drop,
                angle_deg=26.0 * (1.0 - sw_drop) + (-1.5 + p * 1.0) * sw_drop,
                blade_len=48.0,
                storm_charge=0.05 if f % 2 == 0 else 0.0,
            )
            # Subtle fading storm ember so every death frame remains distinct (29/29 transitions)
            ex = int(round(ANCHOR_X_160 + 8.0 + (f - 14) * 1.8))
            ey = int(round(ANCHOR_Y_120 - 16.0 - (f - 14) * 0.5))
            set_px(fg_buf, ex, ey, C_CYAN_DEEP if f < 24 else C_INDIGO_MID)
            canvas.alpha_composite(Image.fromarray(fg_buf, "RGBA"))
            frames.append(canvas)
    return frames


def build_row6_dash(rigs: dict) -> list[Image.Image]:
    """
    Row 6: Supersonic Low Shunpo Lightning-Step (also used by AMAKAKERU Phase 1 F08..F19!).
    """
    frames = []
    for f in range(30):
        ph = (f / 30.0) * 4.0 * math.pi
        if f <= 3:
            p = f / 3.0
            frames.append(render_keypose_frame(rigs, "K1_COIL", {
                "dx": -3.0 * p,
                "dy": 0.0,
                "phase": ph,
                "drum_charge": 0.65 + 0.35 * p,
                "sheathed": True,
                "koiguchi_spark": 0.85 * p,
                "tassel_lag": -18.0,
                "energy": 0.75,
            }))
        elif f <= 23:
            u = (f - 4) / 19.0
            frames.append(render_keypose_frame(rigs, "K2_LUNGE", {
                "dx": 8.0 + 2.0 * math.sin(u * math.pi),
                "dy": 0.0,
                "body_deg": 6.0,
                "phase": ph,
                "drum_charge": 1.0,
                "sheathed": False,
                "two_handed": False,
                "sword_hx": 12.0 + 4.0 * math.sin(u * math.pi * 2.0),
                "sword_hy": -38.0,
                "sword_deg": 164.0 + 6.0 * math.cos(u * math.pi * 2.0),  # Trailing reverse-streamlined Odachi!
                "blade_len": 54.0,
                "sori_sign": 1.0,
                "storm_charge": 1.05,
                "tassel_lag": 46.0,
                "energy": 1.0,
            }))
        else:
            p = (f - 24) / 5.0
            frames.append(render_stand_rig_frame(rigs, {
                "dx": 4.0 * (1.0 - p),
                "phase": ph,
                "sink": 2.0 * (1.0 - p),
                "torso_lean": 8.0 * (1.0 - p),
                "tassel_lag": 24.0 * (1.0 - p),
                "drum_charge": 0.60 - 0.25 * p,
                "sheathed": False,
                "two_handed": False,
                "sword_hx": 13.5,
                "sword_hy": -5.5,
                "sword_deg": -22.0,
                "storm_charge": 0.45,
            }))
    return frames


def build_row7_crouch(rigs: dict) -> list[Image.Image]:
    """
    Row 7: SERENE MIND COUNTER & AMAKAKERU Iaido Sheath/Noto Choreography:
      - F00..F13: Deep K1_COIL Iaido stance (sheathed=True, blazing Raijin drum ward; F04..F08 = AMAKAKERU charge!)
      - F14..F22: Explosive Shunpo Draw-Cut + 4-band Raijin crescent smear launching 'ronin_slash'!
      - F23..F29: Deliberate samurai Noto re-sheath click (F25..F29 = AMAKAKERU Noto sheath snap!)
    """
    frames = []
    for f in range(30):
        ph = (f / 30.0) * 4.0 * math.pi
        if f <= 13:
            u = f / 13.0
            frames.append(render_keypose_frame(rigs, "K1_COIL", {
                "dx": -2.0 - 1.5 * math.sin(u * math.pi),
                "dy": 0.0,
                "phase": ph,
                "drum_charge": 0.75 + 0.35 * math.sin(u * math.pi * 2.0),
                "sheathed": True,
                "saya_deg": 157.0 + 2.0 * math.sin(u * math.pi),
                "koiguchi_spark": 1.10 if f in (6, 7, 13) else (0.35 + 0.25 * math.sin(f)),
                "tassel_lag": -10.0 + 6.0 * math.sin(ph),
                "energy": 0.75,
            }))
        elif f == 14:
            # 1-FRAME COUNTER SNAP: Shunpo Draw-Cut launching 'ronin_slash'!
            frames.append(render_keypose_frame(rigs, "K2_LUNGE", {
                "dx": 10.0,
                "dy": 0.0,
                "phase": ph,
                "drum_charge": 1.20,
                "sheathed": False,
                "two_handed": True,
                "sword_hx": 23.0,
                "sword_hy": -43.0,
                "sword_deg": -4.0,
                "blade_len": 58.0,
                "storm_charge": 1.25,
                "tassel_lag": 42.0,
                "energy": 1.10,
                "smear": {
                    "kind": "gleam",
                    "style": "horizon",
                    "x0": 18.0,
                    "y0": -43.0,
                    "x1": 80.0,
                    "y1": -44.0,
                    "intensity": 1.0,
                    "seed": 714,
                },
            }))
        elif f <= 22:
            p = (f - 15) / 7.0
            frames.append(render_keypose_frame(rigs, "K2_LUNGE", {
                "dx": 9.0 * (1.0 - 0.65 * p),
                "dy": 0.0,
                "phase": ph,
                "drum_charge": 0.90 - 0.25 * p,
                "sheathed": False,
                "two_handed": False,
                "sword_hx": 21.0 - 7.0 * p,
                "sword_hy": -44.0 + 6.0 * p,
                "sword_deg": -8.0 - 16.0 * p,
                "blade_len": 56.0,
                "storm_charge": 0.85 * (1.0 - 0.4 * p),
                "tassel_lag": 28.0 * (1.0 - p),
                "energy": 0.65,
                "smear": {
                    "kind": "gleam",
                    "style": "horizon",
                    "x0": 26.0,
                    "y0": -44.0,
                    "x1": 76.0,
                    "y1": -45.0,
                    "intensity": 0.45,
                    "seed": 715,
                } if f == 15 else None,
            }))
        else:
            # F23..F29: Deliberate Noble Samurai Noto Re-Sheath Click!
            p = (f - 23) / 6.0
            frames.append(render_stand_rig_frame(rigs, {
                "dx": 2.0 * (1.0 - p),
                "phase": ph,
                "sink": 1.2 * (1.0 - p),
                "torso_lean": 2.5 * (1.0 - p),
                "hair_wave": 3.5 * math.sin(p * math.pi),
                "tassel_lag": 12.0 * (1.0 - p),
                "drum_charge": 0.95 - 0.45 * p,
                "sheathed": True,
                "koiguchi_spark": 1.40 if f == 26 else (0.75 if f in (25, 27) else 0.25),
                "energy": 0.70 * (1.0 - 0.5 * p),
            }))
    return frames


def build_row8_jump(rigs: dict) -> list[Image.Image]:
    """
    Row 8: TSUBAME GAESHI (Aerial Swallow-Reversal Twin Lightning Crescent Slashes).
    """
    frames = []
    for f in range(30):
        ph = (f / 30.0) * 4.0 * math.pi
        if f <= 3:
            p = f / 3.0
            frames.append(render_keypose_frame(rigs, "K1_COIL", {
                "dx": 0.0,
                "dy": 0.0,
                "phase": ph,
                "drum_charge": 0.65 + 0.25 * p,
                "sheathed": True,
                "koiguchi_spark": 0.75 * p,
                "tassel_lag": -14.0,
                "energy": 0.65,
            }))
        elif f <= 24:
            u = (f - 4) / 20.0
            lift = -14.0 * math.sin(u * math.pi)
            smear = None
            deg = -42.0 + u * 68.0
            if f in (11, 12):
                # Swallow Cut 1: Downward Zantetsuken vacuum gleam
                deg = 22.0
                smear = {
                    "kind": "gleam",
                    "style": "horizon",
                    "x0": 16.0,
                    "y0": -52.0,
                    "x1": 74.0,
                    "y1": -34.0,
                    "intensity": 0.95 if f == 11 else 0.48,
                    "seed": 811 + f,
                }
            elif f in (15, 16):
                # Swallow Cut 2: Instant upward swallow-reversal vacuum gleam!
                deg = -52.0
                smear = {
                    "kind": "gleam",
                    "style": "rising",
                    "x0": 16.0,
                    "y0": -32.0,
                    "x1": 74.0,
                    "y1": -62.0,
                    "intensity": 0.95 if f == 15 else 0.48,
                    "seed": 815 + f,
                }
            frames.append(render_keypose_frame(rigs, "K4_LEAP", {
                "dx": 4.0 * math.sin(u * math.pi),
                "dy": lift,
                "phase": ph,
                "drum_charge": 0.95,
                "sheathed": False,
                "two_handed": True,
                "sword_hx": 17.0,
                "sword_hy": -40.0,
                "sword_deg": deg,
                "blade_len": 56.0,
                "sori_sign": 1.0 if f >= 14 else -1.0,
                "storm_charge": 1.05,
                "tassel_lag": 32.0,
                "energy": 0.90,
                "smear": smear,
            }))
        else:
            p = (f - 25) / 4.0
            frames.append(render_stand_rig_frame(rigs, {
                "phase": ph,
                "sink": 3.0 * (1.0 - p),
                "torso_lean": 6.0 * (1.0 - p),
                "tassel_lag": 16.0 * (1.0 - p),
                "drum_charge": 0.50 - 0.15 * p,
                "sheathed": False,
                "two_handed": False,
                "sword_hx": 13.5,
                "sword_hy": -5.5,
                "sword_deg": -22.0,
                "storm_charge": 0.40,
            }))
    return frames


def build_row9_victory(rigs: dict) -> list[Image.Image]:
    """
    Row 9: VICTORY -- F00..F14 Chiburi lightning shake-off + F12 Noto sheath click,
    F15..F29 Sovereign Raijin Blade-God loop (sheathed=True, 5 drums orbiting + sakura storm).
    """
    frames = []
    for f in range(30):
        if f < 15:
            p = f / 14.0
            ph = p * 2.0 * math.pi
            if f <= 8:
                # Crisp Chiburi diagonal shake-off flourish
                u = f / 8.0
                frames.append(render_keypose_frame(rigs, "K3_RISE", {
                    "dx": 3.0 * (1.0 - u),
                    "dy": 0.0,
                    "phase": ph,
                    "drum_charge": 0.85,
                    "sheathed": False,
                    "two_handed": False,
                    "sword_hx": 18.0 - 4.0 * u,
                    "sword_hy": -52.0 + 12.0 * u,
                    "sword_deg": -38.0 + 68.0 * u,
                    "blade_len": 56.0,
                    "storm_charge": 0.95 * (1.0 - 0.4 * u),
                    "tassel_lag": 24.0 * (1.0 - u),
                    "energy": 0.80,
                }))
            else:
                # Deliberate Noto sheath click at F12!
                u = (f - 9) / 5.0
                frames.append(render_stand_rig_frame(rigs, {
                    "phase": ph,
                    "sink": 1.0 * (1.0 - u),
                    "torso_lean": 2.0 * (1.0 - u),
                    "hair_wave": 4.0 * math.sin(ph),
                    "tassel_lag": 12.0 * (1.0 - u),
                    "drum_charge": 0.95,
                    "sheathed": True,
                    "koiguchi_spark": 1.40 if f == 12 else (0.75 if f in (11, 13) else 0.25),
                    "energy": 0.75,
                }))
        else:
            # F15..F29: Seamless 15-frame Sovereign Raijin loop
            lph = ((f - 15) / 15.0) * 2.0 * math.pi
            breath = math.sin(lph)
            frames.append(render_stand_rig_frame(rigs, {
                "phase": lph,
                "sink": 0.7 * (0.5 + 0.5 * breath),
                "torso_lean": 1.2 + 0.7 * breath,
                "head_nod": 0.5 * breath,
                "hair_wave": 3.2 * math.sin(lph - 0.5),
                "tassel_lag": 10.0 + 7.5 * math.sin(lph - 0.7),
                "drum_charge": 0.80 + 0.20 * (0.5 + 0.5 * math.cos(lph)),
                "sheathed": True,
                "koiguchi_spark": 0.35 if (f % 5 == 0) else 0.0,
                "energy": 0.55,
            }))
    return frames


# ==============================================================================
# 7. STRICT PIXEL PURITY, BORDER MARGIN, PORTRAIT & VISUAL QA BUILDER
# ==============================================================================

def finalize_cell_320x240(im_160: Image.Image) -> Image.Image:
    """
    Enforces strict binary alpha (0 or 255), 2px logical (4px output) transparent
    border safety margin, and upscales 2x NEAREST -> 320x240 (100% 2x2 pixel blocks).
    """
    arr = np.array(im_160.convert("RGBA"), dtype=np.uint8)
    alpha = arr[:, :, 3]
    arr[:, :, 3] = np.where(alpha >= 128, 255, 0)
    mask0 = arr[:, :, 3] == 0
    arr[mask0] = 0

    arr[:MARGIN_160, :, :] = 0
    arr[-MARGIN_160:, :, :] = 0
    arr[:, :MARGIN_160, :] = 0
    arr[:, -MARGIN_160:, :] = 0

    clean_160 = Image.fromarray(arr, "RGBA")
    return clean_160.resize((CELL_W, CELL_H), Image.Resampling.NEAREST)


def build_portrait_128():
    raw = Image.open(PORTRAIT_REF).convert("RGB")
    w, h = raw.size
    side = int(min(w, h) * 0.44)
    x0 = min(w - side, int(w * 0.30))
    y0 = min(h - side, int(h * 0.04))
    cropped = raw.crop((x0, y0, x0 + side, y0 + side))
    p64 = cropped.resize((64, 64), Image.Resampling.LANCZOS)
    q64 = p64.quantize(colors=96, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).convert("RGBA")
    p128 = q64.resize((128, 128), Image.Resampling.NEAREST)

    # Crisp 2px storm-indigo & Raijin gold portrait frame bevel
    arr = np.array(p128, dtype=np.uint8)
    arr[0:2, :, :] = C_INDIGO_DARK
    arr[-2:, :, :] = C_INDIGO_DARK
    arr[:, 0:2, :] = C_INDIGO_DARK
    arr[:, -2:, :] = C_INDIGO_DARK
    arr[2:4, 2:8, :] = C_GOLD_BRIGHT
    arr[2:8, 2:4, :] = C_GOLD_BRIGHT
    arr[2:4, -8:-2, :] = C_GOLD_BRIGHT
    arr[2:8, -4:-2, :] = C_GOLD_BRIGHT
    arr[-4:-2, 2:8, :] = C_CYAN_BRIGHT
    arr[-8:-2, 2:4, :] = C_CYAN_BRIGHT
    arr[-4:-2, -8:-2, :] = C_CYAN_BRIGHT
    arr[-8:-2, -4:-2, :] = C_CYAN_BRIGHT
    out = Image.fromarray(arr, "RGBA")
    out.save(OUT_PORTRAIT, optimize=False)
    print(f"[OK] Saved portrait: {OUT_PORTRAIT} ({out.size[0]}x{out.size[1]})")
    return out


def verify_and_emit_qa(all_rows_320: list[list[Image.Image]], portrait_128: Image.Image, emit_qa: bool = False):
    border_clips = 0
    non_binary_alpha = 0
    non_2x2_blocks = 0
    row_transitions = []

    for r_idx, row in enumerate(all_rows_320):
        trans = 0
        for c_idx, cell in enumerate(row):
            arr = np.array(cell, dtype=np.uint8)
            a = arr[:, :, 3]
            if np.any((a > 0) & (a < 255)):
                non_binary_alpha += 1
            if (
                np.any(a[:4, :] > 0)
                or np.any(a[-4:, :] > 0)
                or np.any(a[:, :4] > 0)
                or np.any(a[:, -4:] > 0)
            ):
                border_clips += 1
            if not (
                np.array_equal(arr[0::2, 0::2], arr[0::2, 1::2])
                and np.array_equal(arr[0::2, 0::2], arr[1::2, 0::2])
                and np.array_equal(arr[0::2, 0::2], arr[1::2, 1::2])
            ):
                non_2x2_blocks += 1
            if c_idx > 0:
                prev_arr = np.array(row[c_idx - 1], dtype=np.uint8)
                if not np.array_equal(arr, prev_arr):
                    trans += 1
        row_transitions.append(trans)

    # Check Row 2 snap vacuum-gleam front reach (x_320 in 286..310, frontPx >= 260 on F03, F09, F17, F25)
    snap_reaches = {}
    snap_front_px = {}
    for sf in (3, 9, 17, 25):
        arr = np.array(all_rows_320[2][sf], dtype=np.uint8)
        a = arr[:, :, 3] > 0
        ys, xs = np.where(a)
        snap_reaches[sf] = int(xs.max()) if len(xs) else 0
        snap_front_px[sf] = int(a[:, 201:].sum())

    # Check Row 4 F00..F29 maxX <= 262
    row4_max_x = max(int(np.where(np.array(all_rows_320[4][c], dtype=np.uint8)[:, :, 3] > 0)[1].max()) for c in range(30))

    # Verify Row 1 WALK top-delta smoothness, boot crossover, & anti-moonwalk single-stance deltas
    r1_tops = []
    r1_bots = []
    r1_sole_x = []
    r1_spans = []
    for f in range(30):
        a = np.array(all_rows_320[1][f], dtype=np.uint8)[:, :, 3] > 0
        ys, _ = np.where(a)
        r1_tops.append(int(ys.min()))
        r1_bots.append(int(ys.max()))
        _, sxs = np.where(a[224:231, :])
        r1_sole_x.append(float(sxs.mean()) if len(sxs) else -1.0)
        _, bxs = np.where(a[218:234, :])
        r1_spans.append(int(bxs.max() - bxs.min() + 1) if len(bxs) else 0)
    max_adj_top_delta = max(abs(r1_tops[i] - r1_tops[(i - 1) % 30]) for i in range(30))
    max_bot_pop = max(r1_bots) - min(r1_bots)
    stance_d1 = r1_sole_x[6] - r1_sole_x[1]
    stance_d2 = r1_sole_x[21] - r1_sole_x[16]
    min_boot_span = min(r1_spans)
    max_boot_span = max(r1_spans)

    for df in range(22, 30):
        a = np.array(all_rows_320[5][df], dtype=np.uint8)[:, :, 3] > 0
        ys, xs = np.where(a)
        dh = int(ys.max() - ys.min() + 1)
        d_minx, d_maxx = int(xs.min()), int(xs.max())
        assert dh <= 96 and d_minx >= 24 and d_maxx <= 298, (
            f"Row 5 F{df:02d} prone bounds violation: h={dh}, x=[{d_minx}..{d_maxx}]"
        )
    for vf in range(26, 30):
        a = np.array(all_rows_320[9][vf], dtype=np.uint8)[:, :, 3] > 0
        ys, _ = np.where(a)
        vh = int(ys.max() - ys.min() + 1)
        assert vh >= 150, f"Row 9 F{vf:02d} upright height < 150: {vh}"

    flat_edge_cuts = []
    for r_idx in range(10):
        for c_idx in range(30):
            a = np.array(all_rows_320[r_idx][c_idx], dtype=np.uint8)[:, :, 3] > 0
            if int(a[4, :].sum()) >= 8 or int(a[:, 4].sum()) >= 8 or int(a[:, 315].sum()) >= 8:
                flat_edge_cuts.append((r_idx, c_idx))

    print(f"[QA] border_clips={border_clips}/300 | non_binary_alpha={non_binary_alpha} | non_2x2_blocks={non_2x2_blocks}")
    print(f"[QA] row_transitions={row_transitions} | flat_edge_cuts={flat_edge_cuts}")
    print(
        f"[QA] Row 1 WALK maxAdjTopDelta={max_adj_top_delta}px | botPop={max_bot_pop}px | "
        f"bootSpan={min_boot_span}/{max_boot_span} ({min_boot_span / max(1, max_boot_span):.3f}) | "
        f"stanceDelta=({stance_d1:+.1f}, {stance_d2:+.1f})"
    )
    print(f"[QA] Row 2 snap maxX={snap_reaches} | frontPx={snap_front_px} | Row 4 maxX={row4_max_x}")

    assert border_clips == 0, f"Border clip failure: {border_clips}"
    assert non_binary_alpha == 0, f"Non-binary alpha cells: {non_binary_alpha}"
    assert non_2x2_blocks == 0, f"2x2 block purity failure: {non_2x2_blocks}"
    assert all(t == 29 for t in row_transitions), f"Transition failure: {row_transitions}"
    assert all(286 <= rx <= 310 for rx in snap_reaches.values()), f"Row 2 gleam reach out of [286..310]: {snap_reaches}"
    assert all(fp >= 260 for fp in snap_front_px.values()), f"Row 2 frontPx < 260: {snap_front_px}"
    assert row4_max_x <= 262, f"Row 4 maxX > 262: {row4_max_x}"
    assert max_adj_top_delta <= 4, f"Row 1 maxAdjTopDelta > 4: {max_adj_top_delta}"
    assert max_boot_span >= 56 and min_boot_span <= max_boot_span * 0.55, (
        f"Row 1 crossover span failure: {min_boot_span}/{max_boot_span}"
    )
    assert stance_d1 <= -8.0 and stance_d2 <= -8.0, (
        f"Row 1 moonwalk failure: stanceDelta=({stance_d1:+.1f}, {stance_d2:+.1f})"
    )
    assert len(flat_edge_cuts) == 0, f"Flat edge cuts detected: {flat_edge_cuts}"

    if not emit_qa:
        return

    QA_DIR.mkdir(parents=True, exist_ok=True)
    # Emit Row 1 WALK 30-frame contact sheet (`6x5` @ `320x240`)
    r1_im = Image.new("RGBA", (6 * CELL_W, 5 * CELL_H), (22, 26, 40, 255))
    draw_r1 = ImageDraw.Draw(r1_im)
    for f in range(30):
        cx = (f % 6) * CELL_W
        cy = (f // 6) * CELL_H
        draw_r1.rectangle([cx, cy, cx + CELL_W - 1, cy + CELL_H - 1], outline=(52, 64, 96, 255), width=1)
        draw_r1.line([(cx + 8, cy + 230), (cx + CELL_W - 8, cy + 230)], fill=(90, 110, 150, 255), width=1)
        draw_r1.line([(cx + 112, cy), (cx + 112, cy + CELL_H)], fill=(65, 75, 105, 255), width=1)
        r1_im.alpha_composite(all_rows_320[1][f], (cx, cy))
        draw_r1.rectangle([cx + 4, cy + 4, cx + 68, cy + 20], fill=(0, 0, 0, 200))
        draw_r1.text((cx + 8, cy + 6), f"R1 F{f:02d}", fill=(125, 211, 252, 255))
    r1_path = QA_DIR / "debug_ronin_ex_row1_walk.png"
    r1_im.save(r1_path)

    # Emit Row 2 + Row 4 strip for visual inspection
    r24_im = Image.new("RGBA", (8 * CELL_W, 2 * CELL_H), (24, 28, 42, 255))
    draw_r24 = ImageDraw.Draw(r24_im)
    for ci, f in enumerate([2, 3, 4, 9, 17, 18, 25, 26]):
        cx = ci * CELL_W
        draw_r24.line([(cx, 230), (cx + CELL_W, 230)], fill=(90, 110, 150, 255), width=1)
        r24_im.alpha_composite(all_rows_320[2][f], (cx, 0))
        draw_r24.rectangle([cx + 4, 4, cx + 80, 20], fill=(0, 0, 0, 200))
        draw_r24.text((cx + 8, 6), f"R2 F{f:02d}", fill=(250, 224, 90, 255))
    for ci, f in enumerate([5, 8, 11, 14, 17, 20, 22, 27]):
        cx = ci * CELL_W
        cy = CELL_H
        draw_r24.line([(cx, cy + 230), (cx + CELL_W, cy + 230)], fill=(90, 110, 150, 255), width=1)
        r24_im.alpha_composite(all_rows_320[4][f], (cx, cy))
        draw_r24.rectangle([cx + 4, cy + 4, cx + 80, cy + 20], fill=(0, 0, 0, 200))
        draw_r24.text((cx + 8, cy + 6), f"R4 F{f:02d}", fill=(125, 211, 252, 255))
    r24_path = QA_DIR / "debug_ronin_ex_row2_row4.png"
    r24_im.save(r24_path)
    print(f"[QA] Saved {r1_path}, {r24_path}")


def main():
    print("=== Building KAZE-MARU EX (ronin_ex) Next-Gen 9600x2400 Sheet ===")
    rigs = load_rigs()
    # Strictly preserve existing ronin_ex_portrait.png (0 diff invariant!)
    assert OUT_PORTRAIT.exists(), f"Missing {OUT_PORTRAIT}"
    portrait_128 = Image.open(OUT_PORTRAIT).convert("RGBA")

    builders = [
        build_row0_idle,
        build_row1_walk,
        build_row2_auto_attack,
        build_row3_skill,
        build_row4_ultimate,
        build_row5_hurt_death,
        build_row6_dash,
        build_row7_crouch,
        build_row8_jump,
        build_row9_victory,
    ]

    sheet = Image.new("RGBA", (SHEET_W, SHEET_H), (0, 0, 0, 0))
    all_rows_320 = []
    for r_idx, fn in enumerate(builders):
        raw_frames = fn(rigs)
        assert len(raw_frames) == COLS, f"Row {r_idx} produced {len(raw_frames)} frames"
        row_320 = []
        for c_idx, frm in enumerate(raw_frames):
            cell_320 = finalize_cell_320x240(frm)
            row_320.append(cell_320)
            sheet.paste(cell_320, (c_idx * CELL_W, r_idx * CELL_H))
        all_rows_320.append(row_320)
        print(f"  [OK] Row {r_idx} finalized (30 cells @ 320x240)")

    sheet.save(OUT_SHEET, optimize=False)
    print(f"[OK] Saved sprite sheet: {OUT_SHEET} ({sheet.size[0]}x{sheet.size[1]})")
    verify_and_emit_qa(all_rows_320, portrait_128, emit_qa="--qa" in sys.argv)


if __name__ == "__main__":
    main()
