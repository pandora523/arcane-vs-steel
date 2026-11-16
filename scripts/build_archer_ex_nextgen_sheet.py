#!/usr/bin/env python3
"""
Next-Gen Wide-Canvas Sprite Sheet, Portrait, & Visual QA Builder for:
  SYLVARA EX -- Yggdrasil Sovereign (archer_ex)

Architecture (FFBE / Last Cloudia / Grand Summoners Paradigm):
  1. Wide Theatrical Cell Framing:
     - Logical canvas: 160x120 -> 2x NEAREST output: 320x240 per cell
     - Sheet layout: 30 cols x 10 rows = 9600x2400 RGBA PNG
     - Grounded foot/spine anchor: anchor_x_160 = 56 (anchorX = 112),
       anchor_y_120 = 115 (anchorY = 230)
     - Standing hero height: 87 logical px (174px in 320x240), 100% locked scale
       across all 300 frames.
  2. Multi-Keypose 3D Body States + Articulated STAND Rig:
     - Uses 3D-foreshortened HD-2D keyposes (K1_COIL, K2_CROUCH, K2_SNIPE, K3_AIM,
       and inverted 180-deg K4_SOMERSAULT from archer_ex_keyposes_ref.jpg) +
       articulated STAND rig (from archer_ex_base.jpg) with 2-Bone Analytical IK
       elven bracer arms holding the luminous Yggdrasil Astral Recurve Greatbow
       (doubling as a bladed Elven Twin-Arc Bow-Glaive!), Back Quiver, and
       6-Pinion Astral Light-Wings on Row 4 & Row 9.
  3. 1-Frame Explosive Snap + 4-Band Serrated Emerald-Gold Astral Smear Fans:
     - Palette: #ffffff -> #fde047 -> #34d399 -> #065f46 + Mach shock-rings &
       1/2/3 streaking Astral Arrows (x_320 > 260 on Row 2 F03, F09, F17, F25).
"""

from collections import deque
import math
from pathlib import Path
import sys
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SPRITES_DIR = ROOT / "assets" / "sprites"

BASE_REF = SPRITES_DIR / "archer_ex_base.jpg"
PORTRAIT_REF = SPRITES_DIR / "archer_ex_portrait_raw.jpg"
KEYPOSES_REF = SPRITES_DIR / "archer_ex_keyposes_ref.jpg"

OUT_SHEET = SPRITES_DIR / "archer_ex_sheet.png"
OUT_PORTRAIT = SPRITES_DIR / "archer_ex_portrait.png"

QA_DIR = Path("/Users/rei/.gemini/antigravity/brain/5416474b-0e5f-4471-85c8-b7a88055e218/scratch")

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

# BASE spans y=30..478 -> 448px -> locked 87.0 logical px (174px in 320x240)
HERO_H_512 = 448.0
TARGET_HERO_H_160 = 87.0
SCALE = TARGET_HERO_H_160 / HERO_H_512  # 0.194196
SPINE_X_512 = 258.0
GROUND_Y_512 = 478.0

# Yggdrasil Astral Star-Huntress Palette
C_OUTLINE = (6, 20, 16, 255)
C_FOREST_DARK = (6, 95, 70, 255)      # #065f46
C_EMERALD_MID = (16, 185, 129, 255)   # #10b981
C_EMERALD_BRIGHT = (52, 211, 153, 255)# #34d399
C_MINT_LIGHT = (167, 243, 208, 255)   # #a7f3d0
C_WHITE = (255, 255, 255, 255)        # #ffffff
C_GOLD_DARK = (146, 64, 14, 255)      # #92400e
C_GOLD_MID = (217, 119, 6, 255)       # #d97706
C_GOLD_BRIGHT = (250, 204, 21, 255)   # #facc15
C_GOLD_LIGHT = (253, 224, 71, 255)    # #fde047
C_IVORY_LIMB = (254, 249, 195, 255)   # #fef9c3
C_SILVER_MID = (148, 163, 184, 255)
C_LEATHER = (92, 54, 24, 255)


# ==============================================================================
# 1. CLEAN BACKGROUND REMOVAL & ANTI-HALO FRINGE DECONTAMINATION
# ==============================================================================

def remove_white_bg_512(
    im_rgb: Image.Image,
    pocket_seeds: list[tuple[int, int]] | None = None,
    strip_polys: list[list[tuple[int, int]]] | None = None,
) -> np.ndarray:
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

    for pass_idx in range(2):
        bg_now = ~fg
        bg_adj = (
            np.pad(bg_now[1:, :], ((0, 1), (0, 0)), constant_values=True)
            | np.pad(bg_now[:-1, :], ((1, 0), (0, 0)), constant_values=True)
            | np.pad(bg_now[:, 1:], ((0, 0), (0, 1)), constant_values=True)
            | np.pad(bg_now[:, :-1], ((0, 0), (1, 0)), constant_values=True)
        )
        lum_thresh = 218 if pass_idx == 0 else 234
        fringe = fg & bg_adj & (lum >= lum_thresh) & (chroma <= 24)
        fg = fg & (~fringe)

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

    bg_final = rgba[:, :, 3] == 0
    outer_edge = (rgba[:, :, 3] > 0) & (
        np.pad(bg_final[1:, :], ((0, 1), (0, 0)), constant_values=True)
        | np.pad(bg_final[:-1, :], ((1, 0), (0, 0)), constant_values=True)
        | np.pad(bg_final[:, 1:], ((0, 0), (0, 1)), constant_values=True)
        | np.pad(bg_final[:, :-1], ((0, 0), (1, 0)), constant_values=True)
    )
    bright_edge = outer_edge & (lum >= 170) & (chroma <= 34)
    rgba[bright_edge, 0] = (rgba[bright_edge, 0].astype(np.int32) * 24 // 100).astype(np.uint8)
    rgba[bright_edge, 1] = np.minimum(
        255, (rgba[bright_edge, 1].astype(np.int32) * 38 // 100) + 14
    ).astype(np.uint8)
    rgba[bright_edge, 2] = (rgba[bright_edge, 2].astype(np.int32) * 28 // 100).astype(np.uint8)
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
# 2. RIG SEGMENTATION (BASE STAND RIG + 5 KEYPOSE VARIANTS)
# ==============================================================================

def load_rigs() -> dict:
    base_strip = [
        [(122, 176), (214, 182), (218, 224), (122, 224)],  # viewer-left open hand/forearm
        [(308, 98), (408, 98), (408, 190), (304, 188)],    # viewer-right extended open arm/hand
    ]
    base_512 = Image.open(BASE_REF).convert("RGB").resize((512, 512), Image.Resampling.LANCZOS)
    rgba_base = remove_white_bg_512(base_512, pocket_seeds=[(182, 190)], strip_polys=base_strip)
    h, w, _ = rgba_base.shape

    m_head = poly_mask(w, h, [
        (206, 26), (314, 26), (308, 130), (222, 130),
    ])
    m_hair = poly_mask(w, h, [
        (134, 62), (232, 62), (226, 134), (214, 206), (134, 206),
    ]) & (~m_head)

    m_torso = poly_mask(w, h, [
        (196, 122), (318, 122), (304, 232), (206, 232),
    ]) & (~m_head) & (~m_hair)

    m_skirt_tabard = poly_mask(w, h, [
        (114, 214), (402, 214), (404, 382), (334, 344), (294, 286),
        (278, 372), (226, 372), (214, 286), (174, 344), (114, 382),
    ]) & (~m_torso)

    m_l_thigh = poly_mask(w, h, [
        (168, 270), (238, 270), (224, 368), (168, 368),
    ]) & (~m_skirt_tabard)
    m_l_shin = poly_mask(w, h, [
        (144, 354), (228, 354), (208, 484), (144, 484),
    ]) & (~m_l_thigh) & (~m_skirt_tabard)

    m_r_thigh = poly_mask(w, h, [
        (270, 270), (344, 270), (350, 368), (274, 368),
    ]) & (~m_skirt_tabard)
    m_r_shin = poly_mask(w, h, [
        (286, 354), (376, 354), (380, 484), (292, 484),
    ]) & (~m_r_thigh) & (~m_skirt_tabard)

    def darken_part(p: dict, factor: float = 0.84) -> dict:
        arr_p = np.array(p["im"], dtype=np.float32)
        m_a = arr_p[:, :, 3] > 0
        arr_p[m_a, :3] = np.clip(arr_p[m_a, :3] * factor, 0, 255)
        return {
            "im": Image.fromarray(arr_p.astype(np.uint8), "RGBA"),
            "x0": p["x0"],
            "y0": p["y0"],
            "pivot": p["pivot"],
        }

    parts = {
        "hair": extract_part(rgba_base, m_hair, (214.0, 102.0)),
        "head": extract_part(rgba_base, m_head, (258.0, 118.0)),
        "torso": extract_part(rgba_base, m_torso, (256.0, 214.0)),
        "skirts": extract_part(rgba_base, m_skirt_tabard, (256.0, 226.0)),
        "l_thigh": extract_part(rgba_base, m_l_thigh, (212.0, 294.0)),
        "l_shin": extract_part(rgba_base, m_l_shin, (194.0, 364.0)),
        "r_thigh": extract_part(rgba_base, m_r_thigh, (296.0, 294.0)),
        "r_shin": extract_part(rgba_base, m_r_shin, (324.0, 364.0)),
    }
    parts["l_thigh_dark"] = darken_part(parts["l_thigh"], 0.84)
    parts["l_shin_dark"] = darken_part(parts["l_shin"], 0.84)

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

    k1_coil = load_kp(
        (0, 0, hw, hh),
        seeds=[(201, 187), (169, 193)],
        strips=[[(154, 182), (206, 186), (206, 226), (154, 226)]],
        spine_x=268.0,
        ground_y=486.0,
        scale_mult=0.98,
    )

    # K2_CROUCH keeps her badass native ground-touching ranger hand for Leaf-Veil Parry & Root Snare!
    k2_crouch = load_kp(
        (hw, 0, kw, hh),
        seeds=[(245, 258), (353, 242)],
        strips=None,
        spine_x=292.0,
        ground_y=484.0,
        scale_mult=0.98,
        native_arms=True,
    )

    # K2_SNIPE strips the planted lower forearm so IK bow-arm fires kneeling sniper shots cleanly!
    k2_snipe = load_kp(
        (hw, 0, kw, hh),
        seeds=[(245, 258), (353, 242)],
        strips=[[(304, 344), (358, 344), (364, 486), (298, 486)]],
        spine_x=292.0,
        ground_y=484.0,
        scale_mult=0.98,
        native_arms=False,
    )

    # K3_AIM: Wide-stance elevated archer aim (front arm stripped in open space; cheek draw-hand intact!)
    k3_aim = load_kp(
        (0, hh, hw, kh),
        seeds=[(192, 210)],
        strips=[[(308, 36), (444, 36), (444, 154), (312, 158)]],
        spine_x=256.0,
        ground_y=491.0,
        scale_mult=0.97,
    )

    # K4_SOMERSAULT: Inverted 180-deg upside-down Zephyr Vault somersault!
    k4_somersault = load_kp(
        (hw, hh, kw, kh),
        seeds=[(291, 236), (284, 182), (264, 165), (185, 173)],
        strips=[[(344, 108), (398, 108), (398, 184), (342, 184)]],
        spine_x=252.0,
        ground_y=396.0,
        scale_mult=0.96,
    )

    return {
        "parts": parts,
        "K1_COIL": k1_coil,
        "K2_CROUCH": k2_crouch,
        "K2_SNIPE": k2_snipe,
        "K3_AIM": k3_aim,
        "K4_SOMERSAULT": k4_somersault,
    }


# ==============================================================================
# 3. LOGICAL 160x120 PIXEL-ART PRIMITIVES, WINGS, QUIVER & YGGDRASIL GREATBOW
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
):
    im = part["im"]
    px_piv = part["pivot"][0] - part["x0"]
    py_piv = part["pivot"][1] - part["y0"]
    tw = max(2, int(round(im.width * SCALE)))
    th = max(2, int(round(im.height * SCALE)))
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
        canvas.alpha_composite(rot, (int(round(world_pivot_160[0] - pad)), int(round(world_pivot_160[1] - pad))))
    else:
        canvas.alpha_composite(
            scaled,
            (int(round(world_pivot_160[0] - s_piv_x)), int(round(world_pivot_160[1] - s_piv_y))),
        )


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
        tmp.paste(scaled, (int(round(pad - piv_x)), int(round(pad - piv_y))), scaled)
        rot = tmp.rotate(-angle_deg, resample=Image.Resampling.NEAREST, center=(pad, pad))
        canvas.alpha_composite(rot, (int(round(anchor_x - pad)), int(round(anchor_y - pad))))
    else:
        canvas.alpha_composite(
            scaled,
            (int(round(anchor_x - piv_x)), int(round(anchor_y - piv_y))),
        )


def solve_ik_2bone(sx: float, sy: float, tx: float, ty: float, l1: float, l2: float, bend_sign: float = 1.0):
    dx = tx - sx
    dy = ty - sy
    d = math.hypot(dx, dy)
    d_clamped = max(abs(l1 - l2) + 0.5, min(l1 + l2 - 0.3, d))
    base_ang = math.atan2(dy, dx)
    cos_a = max(-1.0, min(1.0, (l1 * l1 + d_clamped * d_clamped - l2 * l2) / max(1e-4, 2.0 * l1 * d_clamped)))
    ang = base_ang + bend_sign * math.acos(cos_a)
    return sx + math.cos(ang) * l1, sy + math.sin(ang) * l1


def draw_elven_bracer_arm_160(
    buf: np.ndarray,
    sx: float,
    sy: float,
    tx: float,
    ty: float,
    is_front: bool = True,
    bend_sign: float = 1.0,
):
    l1, l2 = 10.0, 10.5
    ex, ey = solve_ik_2bone(sx, sy, tx, ty, l1, l2, bend_sign=bend_sign)
    c_sleeve = C_EMERALD_MID if is_front else C_FOREST_DARK
    c_trim = C_GOLD_BRIGHT if is_front else C_GOLD_MID

    draw_line_px(buf, sx, sy, ex, ey, C_OUTLINE, r=2)
    draw_line_px(buf, ex, ey, tx, ty, C_OUTLINE, r=2)
    draw_line_px(buf, sx, sy, ex, ey, C_FOREST_DARK, r=1)
    draw_line_px(buf, sx, sy - 0.6, ex, ey - 0.6, c_sleeve, r=0)
    draw_line_px(buf, ex, ey, tx, ty, c_sleeve, r=1)
    draw_line_px(buf, ex, ey - 0.7, tx, ty - 0.7, c_trim, r=0)

    gx, gy = int(round(tx)), int(round(ty))
    for oy in range(-1, 2):
        for ox in range(-1, 2):
            set_px(buf, gx + ox, gy + oy, C_OUTLINE)
    set_px(buf, gx, gy, C_GOLD_LIGHT)
    set_px(buf, gx + 1, gy, C_EMERALD_BRIGHT)


def draw_quiver_160(buf: np.ndarray, qx: float, qy: float, tilt_deg: float = -36.0):
    """Elven Emerald & Gold Back Quiver + 3 glowing emerald-fletched arrows."""
    rad = math.radians(tilt_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    x0, y0 = qx, qy
    x1, y1 = qx - ux * 13.0, qy - uy * 13.0
    draw_line_px(buf, x0, y0, x1, y1, C_OUTLINE, r=2)
    draw_line_px(buf, x0, y0, x1, y1, C_FOREST_DARK, r=1)
    draw_line_px(buf, x0, y0, x0 - ux * 3.0, y0 - uy * 3.0, C_GOLD_BRIGHT, r=0)
    # 3 protruding emerald-fletched arrow tails
    for k in (-1, 0, 1):
        ax = x0 + ux * 4.5 + k * 1.4
        ay = y0 + uy * 4.5 - abs(k) * 0.8
        draw_line_px(buf, x0, y0, ax, ay, C_OUTLINE, r=1)
        draw_line_px(buf, x0, y0, ax, ay, C_GOLD_LIGHT, r=0)
        set_px(buf, int(round(ax)), int(round(ay)), C_EMERALD_BRIGHT)


def draw_yggdrasil_wings_160(buf: np.ndarray, cx: float, cy: float, span_scale: float = 1.0, phase: float = 0.0):
    """
    6-Pinion Astral Yggdrasil Light-Wings (3 emerald-gold luminous feather blades per side).
    Rendered on Row 4 (ULTIMATE / TRUE_ULTIMATE Supernova) and Row 9 Victory flourish!
    """
    flap = math.sin(phase) * 5.0
    pinions = [
        (-146.0 - flap, 28.0 * span_scale, 3.2),
        (-168.0 - flap * 0.7, 24.0 * span_scale, 2.7),
        (168.0 + flap * 0.5, 19.0 * span_scale, 2.2),
        (-34.0 + flap, 24.0 * span_scale, 3.0),
        (-14.0 + flap * 0.7, 20.0 * span_scale, 2.5),
        (8.0 - flap * 0.5, 16.0 * span_scale, 2.0),
    ]
    for deg, length, width in pinions:
        rad = math.radians(deg)
        ux, uy = math.cos(rad), math.sin(rad)
        nx, ny = -uy, ux
        steps = max(10, int(round(length * 1.4)))
        for i in range(steps + 1):
            u = i / steps
            hw = width * (1.0 - 0.75 * (u ** 1.6))
            px = cx + ux * (4.0 + u * length)
            py = cy + uy * (4.0 + u * length)
            draw_line_px(buf, px - nx * hw, py - ny * hw, px + nx * hw, py + ny * hw, C_OUTLINE, r=1)
        for i in range(steps + 1):
            u = i / steps
            hw = width * (1.0 - 0.75 * (u ** 1.6))
            px = cx + ux * (4.0 + u * length)
            py = cy + uy * (4.0 + u * length)
            if u > 0.72:
                col = C_WHITE
            elif u > 0.42:
                col = C_GOLD_LIGHT
            else:
                col = C_EMERALD_BRIGHT
            draw_line_px(buf, px - nx * hw * 0.65, py - ny * hw * 0.65, px + nx * hw * 0.65, py + ny * hw * 0.65, col, r=0)
            set_px(buf, int(round(px)), int(round(py)), C_WHITE if u > 0.35 else C_GOLD_BRIGHT)


def draw_bow_charge_star_160(
    buf: np.ndarray,
    cx: float,
    cy: float,
    arm: float = 5.0,
    phase: float = 0.0,
    max_x: int = 151,
):
    """Crisp 16-bit emerald-gold 4-point starlight charge core on bow/arrow tip."""
    ix, iy = int(round(cx)), int(round(cy))
    r_main = max(3, int(round(arm + 0.6 * math.sin(phase * 2.0))))
    r_diag = max(1, r_main // 2)

    def _p(px: int, py: int, col: tuple[int, int, int, int]):
        if MARGIN_160 <= px <= max_x and MARGIN_160 <= py < LOG_H - MARGIN_160:
            set_px(buf, px, py, col)

    # Subtle dark emerald edge anchoring diagonal glint tips
    for sx, sy in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
        _p(ix + sx * (r_diag + 1), iy + sy * (r_diag + 1), C_FOREST_DARK)

    # Cross starlight rays
    for d in range(-r_main, r_main + 1):
        ad = abs(d)
        col = C_WHITE if ad <= 1 else (C_GOLD_LIGHT if ad <= max(2, r_main - 2) else C_EMERALD_BRIGHT)
        _p(ix + d, iy, col)
        _p(ix, iy + d, col)

    # Diagonal starlight rays
    for d in range(1, r_diag + 1):
        col = C_GOLD_LIGHT if d == 1 else C_MINT_LIGHT
        for sx, sy in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
            _p(ix + sx * d, iy + sy * d, col)

    # Intense white-gold diamond center
    _p(ix, iy, C_WHITE)
    _p(ix + 1, iy, C_WHITE)
    _p(ix - 1, iy, C_WHITE)
    _p(ix, iy + 1, C_WHITE)
    _p(ix, iy - 1, C_WHITE)


def draw_yggdrasil_greatbow_160(
    buf: np.ndarray,
    riser_x: float,
    riser_y: float,
    aim_deg: float = 0.0,
    bow_half_h: float = 23.0,
    draw_pull: float = 0.0,
    arrow_count: int = 0,
    astral_charge: float = 0.35,
    charge_star: float = 0.0,
    star_phase: float = 0.0,
    max_star_x: int = 151,
) -> tuple[tuple[float, float], tuple[float, float]]:
    """
    Renders Sylvara EX's luminous Yggdrasil Astral Recurve Greatbow / Twin-Arc Bow-Glaive:
      - Symmetrical recurve ivory-gold limbs with bladed emerald-cyan Glaive edges at tips
      - Dynamic flexing astral bowstring (draw_pull > 0 pulls string back; < 0 vibrates forward)
      - Optional 1, 2, or 3 fan-nocked glowing Astral Arrows + emerald-gold charge star!
      - Returns (riser_grip_xy, string_grip_xy) for 2-Bone IK hand lock.
    """
    rad = math.radians(aim_deg)
    ux, uy = math.cos(rad), math.sin(rad)  # forward aim vector (+X when aim_deg=0)
    nx, ny = -uy, ux                       # perpendicular limb vector (+Y down when aim_deg=0)

    # Sample symmetrical recurve limbs: s in [-1..+1]
    limb_pts = []
    n_samples = 36
    for i in range(n_samples + 1):
        s = -1.0 + 2.0 * (i / n_samples)
        ab = abs(s)
        # Recurve S-profile: sweeps back (-ux) then hooks forward (+ux) at bladed tips!
        back_sweep = -7.5 * (ab ** 1.25) + 4.2 * (ab ** 3.2) - draw_pull * 2.2 * (ab ** 1.6)
        lx = riser_x + nx * (s * bow_half_h) + ux * back_sweep
        ly = riser_y + ny * (s * bow_half_h) + uy * back_sweep
        limb_pts.append((lx, ly, s, ab))

    top_tip = (limb_pts[0][0], limb_pts[0][1])
    bot_tip = (limb_pts[-1][0], limb_pts[-1][1])

    # String nock midpoint
    base_str_x = (top_tip[0] + bot_tip[0]) * 0.5
    base_str_y = (top_tip[1] + bot_tip[1]) * 0.5
    nock_x = base_str_x - ux * (draw_pull * 15.0)
    nock_y = base_str_y - uy * (draw_pull * 15.0)

    # 1. Astral Bowstring (drawn behind limb tips)
    str_col = C_WHITE if astral_charge >= 0.75 else C_MINT_LIGHT
    draw_line_px(buf, top_tip[0], top_tip[1], nock_x, nock_y, C_FOREST_DARK, r=0)
    draw_line_px(buf, bot_tip[0], bot_tip[1], nock_x, nock_y, C_FOREST_DARK, r=0)
    draw_line_px(buf, top_tip[0], top_tip[1], nock_x, nock_y, str_col, r=0)
    draw_line_px(buf, bot_tip[0], bot_tip[1], nock_x, nock_y, str_col, r=0)

    # 2. Greatbow Limbs & Bladed Twin-Arc Glaive Edges (Selout pass -> Core pass)
    for lx, ly, _, ab in limb_pts:
        r_sel = 2 if (ab < 0.22 or ab > 0.68) else 1
        draw_line_px(buf, lx, ly, lx, ly, C_OUTLINE, r=r_sel)

    for lx, ly, _, ab in limb_pts:
        ix, iy = int(round(lx)), int(round(ly))
        if ab < 0.16:
            set_px(buf, ix, iy, C_EMERALD_BRIGHT)
            set_px(buf, int(round(lx + ux)), int(round(ly + uy)), C_GOLD_LIGHT)
        elif ab > 0.66:
            # Bladed Elven Twin-Arc Bow-Glaive cutting edge!
            set_px(buf, ix, iy, C_GOLD_BRIGHT)
            set_px(buf, int(round(lx + ux * 1.1)), int(round(ly + uy * 1.1)), C_EMERALD_BRIGHT)
            set_px(buf, int(round(lx + ux * 1.9)), int(round(ly + uy * 1.9)), C_WHITE)
        else:
            set_px(buf, ix, iy, C_IVORY_LIMB)
            set_px(buf, int(round(lx - ux * 0.9)), int(round(ly - uy * 0.9)), C_GOLD_MID)

    # 3. Nocked Luminous Astral Arrow(s) (1, 2, or 3 fan-spread arrows!)
    tip_pts = []
    if arrow_count > 0:
        spreads = [0.0] if arrow_count == 1 else ([-5.5, 5.5] if arrow_count == 2 else [-9.0, 0.0, 9.0])
        arr_len = 25.0 + draw_pull * 7.0
        for sp_deg in spreads:
            ar = math.radians(aim_deg + sp_deg)
            aux, auy = math.cos(ar), math.sin(ar)
            anx, any_ = -auy, aux
            ax1 = nock_x + aux * arr_len
            ay1 = nock_y + auy * arr_len
            draw_line_px(buf, nock_x, nock_y, ax1, ay1, C_OUTLINE, r=1)
            draw_line_px(buf, nock_x, nock_y, ax1, ay1, C_EMERALD_BRIGHT, r=0)
            draw_line_px(buf, nock_x + aux * 5.0, nock_y + auy * 5.0, ax1, ay1, C_WHITE, r=0)
            # Broadhead astral star-tip
            draw_line_px(buf, ax1 - aux * 3.5 + anx * 2.2, ay1 - auy * 3.5 + any_ * 2.2, ax1 + aux * 1.5, ay1 + auy * 1.5, C_GOLD_LIGHT, r=0)
            draw_line_px(buf, ax1 - aux * 3.5 - anx * 2.2, ay1 - auy * 3.5 - any_ * 2.2, ax1 + aux * 1.5, ay1 + auy * 1.5, C_GOLD_LIGHT, r=0)
            tip_x = ax1 + aux * 1.5
            tip_y = ay1 + auy * 1.5
            set_px(buf, int(round(tip_x)), int(round(tip_y)), C_WHITE)
            tip_pts.append((tip_x, tip_y))

    if charge_star > 0.05:
        if tip_pts:
            center_tip = tip_pts[len(tip_pts) // 2]
            draw_bow_charge_star_160(
                buf,
                center_tip[0],
                center_tip[1],
                arm=3.5 + charge_star * 2.2,
                phase=star_phase,
                max_x=max_star_x,
            )
        else:
            draw_bow_charge_star_160(
                buf,
                riser_x + ux * 5.0,
                riser_y + uy * 5.0,
                arm=3.5 + charge_star * 2.0,
                phase=star_phase,
                max_x=max_star_x,
            )

    return (riser_x, riser_y), (nock_x, nock_y)


# ==============================================================================
# 4. CRISP 16-BIT ELVEN STAR-COMPASS BOW-SHOT SIGIL (ROW 2 SNAP/FOLLOW ONLY)
# ==============================================================================

def draw_yggdrasil_shot_sigil_160(
    buf: np.ndarray,
    origin_x: float,
    origin_y: float,
    variant: int = 0,
    fade: float = 1.0,
):
    """
    Crisp 16-bit pixel Yggdrasil Bow-Discharge Star-Compass Sigil (Row 2 ONLY):
      - Strictly confined in front of the bow (`x_160 = 104..151`, `x_320 = 208..302`),
        never touching Sylvara EX's body/face and staying <= 151 in 160-space for 0 border clips.
      - Foreshortened vertical Elven Star-Compass ring (`rx = 8..10, ry = 20..24`)
        + 4-point star-glint + crisp pixel wind-sparks & astral arrow-wake glints.
    """
    is_snap = fade >= 0.80
    rx = (8.0 + (variant % 2) * 1.0) if is_snap else (9.5 + (variant % 2) * 0.5)
    ry = (20.0 + min(4.0, variant * 1.3)) if is_snap else (21.5 + min(2.5, variant * 0.8))

    def _spx(px: int, py: int, col: tuple[int, int, int, int]):
        if 104 <= px <= 150 and 5 <= py <= 114:
            set_px(buf, px, py, col)

    def _sline(x0: float, y0: float, x1: float, y1: float, col: tuple[int, int, int, int]):
        dx = x1 - x0
        dy = y1 - y0
        steps = max(1, int(math.ceil(max(abs(dx), abs(dy)) * 1.6)))
        for i in range(steps + 1):
            u = i / steps
            _spx(int(round(x0 + dx * u)), int(round(y0 + dy * u)), col)

    # 1. Foreshortened Vertical Elven Star-Compass Ring (outer + inner + 4-node diamond spokes)
    ring_steps = 96
    for i in range(ring_steps):
        if not is_snap and i % 2 == 1:
            continue
        ang = (i / ring_steps) * 2.0 * math.pi
        ca = math.cos(ang)
        sa = math.sin(ang)
        px = int(round(origin_x + ca * rx))
        py = int(round(origin_y + sa * ry))
        if is_snap and i % 3 != 0:
            _spx(px - 1, py, C_OUTLINE)
        if ca > 0.55 and abs(sa) < 0.45:
            col = C_WHITE if is_snap else C_GOLD_LIGHT
        elif i % 8 < 2:
            col = C_GOLD_LIGHT if is_snap else C_GOLD_MID
        else:
            col = C_EMERALD_BRIGHT if is_snap else C_EMERALD_MID
        _spx(px, py, col)

        # Inner concentric compass ring
        if i % 2 == 0 and (is_snap or i % 4 == 0):
            ix = int(round(origin_x + ca * (rx * 0.64)))
            iy = int(round(origin_y + sa * (ry * 0.64)))
            _spx(ix, iy, C_GOLD_LIGHT if (i % 6 == 0 and is_snap) else (C_MINT_LIGHT if is_snap else C_FOREST_DARK))

    # Inscribed 4-point Elven Star-Compass diamond & cross-ticks
    compass_pts = [
        (origin_x, origin_y - ry * 0.92),
        (origin_x + rx * 0.92, origin_y),
        (origin_x, origin_y + ry * 0.92),
        (origin_x - rx * 0.92, origin_y),
    ]
    spoke_col = C_GOLD_LIGHT if is_snap else C_EMERALD_MID
    for k in range(4):
        p0 = compass_pts[k]
        p1 = compass_pts[(k + 1) % 4]
        _sline(p0[0], p0[1], p1[0], p1[1], spoke_col)
        if is_snap or k % 2 == 0:
            _spx(int(round(p0[0])), int(round(p0[1])), C_WHITE if is_snap else C_GOLD_LIGHT)
            _spx(int(round(p0[0])) + 1, int(round(p0[1])), C_GOLD_LIGHT if is_snap else C_EMERALD_BRIGHT)

    # 2. Central 4-Point Star-Glint right at bow discharge muzzle
    glint_cx = int(round(origin_x + 2.0))
    glint_cy = int(round(origin_y))
    arm_h = 12 if is_snap else 7
    arm_v = 10 if is_snap else 6
    for dx in range(-6 if is_snap else -4, arm_h + 1):
        u = abs(dx) / max(1, arm_h)
        col = C_WHITE if abs(dx) <= 2 else (C_GOLD_LIGHT if u < 0.65 else C_EMERALD_BRIGHT)
        _spx(glint_cx + dx, glint_cy, col)
    for dy in range(-arm_v, arm_v + 1):
        u = abs(dy) / max(1, arm_v)
        col = C_WHITE if abs(dy) <= 2 else (C_GOLD_LIGHT if u < 0.65 else C_EMERALD_BRIGHT)
        _spx(glint_cx, glint_cy + dy, col)
    for s in (-1, 1):
        for t_s in (-1, 1):
            _spx(glint_cx + s, glint_cy + t_s, C_WHITE if is_snap else C_GOLD_LIGHT)
            if is_snap:
                _spx(glint_cx + s * 2, glint_cy + t_s * 2, C_GOLD_LIGHT)

    # 3. Crisp Pixel Astral Arrow-Jet Streaks & Wind-Sparks (`variant = 0..3`, zero oval/U-claws!)
    if variant == 0:
        ray_degs = [0.0]
    elif variant == 1:
        ray_degs = [-14.0, -3.0]
    elif variant == 2:
        ray_degs = [-4.0, 4.0]
    else:
        ray_degs = [-11.0, 2.0, 12.0]

    for idx, r_deg in enumerate(ray_degs):
        rr = math.radians(r_deg)
        ux, uy = math.cos(rr), math.sin(rr)
        ny_off = (idx - (len(ray_degs) - 1) * 0.5) * 4.0
        sx0 = origin_x + 4.0
        sy0 = origin_y + ny_off * 0.65
        reach = (31.0 + variant * 1.0) if is_snap else (25.0 + variant * 0.8)
        sx1 = min(149.0, origin_x + ux * reach)
        sy1 = origin_y + ny_off + uy * reach * 0.62

        # Crisp 1px arrow-jet needle with subtle dark selout tip
        if is_snap:
            _sline(sx0 + 2.0, sy0 - 1.0, sx1 - 2.0, sy1 - 1.0, C_EMERALD_BRIGHT)
            _sline(sx0 + 2.0, sy0 + 1.0, sx1 - 2.0, sy1 + 1.0, C_FOREST_DARK)
            _sline(sx0, sy0, sx1, sy1, C_GOLD_LIGHT if idx % 2 == 1 else C_WHITE)
        else:
            # Fading follow-frame needle sparks
            for step_i in range(0, 16, 2):
                uu = step_i / 15.0
                _spx(
                    int(round(sx0 + (sx1 - sx0) * uu)),
                    int(round(sy0 + (sy1 - sy0) * uu)),
                    C_GOLD_LIGHT if step_i >= 10 else C_EMERALD_BRIGHT,
                )

        # Tiny crisp diamond arrowhead glint at tip
        tx_i, ty_i = int(round(sx1)), int(round(sy1))
        _spx(tx_i, ty_i, C_WHITE if is_snap else C_GOLD_LIGHT)
        _spx(tx_i - 1, ty_i - 1, C_GOLD_LIGHT if is_snap else C_EMERALD_BRIGHT)
        _spx(tx_i - 1, ty_i + 1, C_GOLD_LIGHT if is_snap else C_EMERALD_BRIGHT)

    # 4. Crisp Floating Pixel Wind-Sparks & Mini Diamond Glints in front of ring
    sparks = [
        (origin_x + 15, origin_y - 16, C_GOLD_LIGHT),
        (origin_x + 21, origin_y - 9, C_EMERALD_BRIGHT),
        (origin_x + 26, origin_y - 13, C_MINT_LIGHT),
        (origin_x + 17, origin_y + 15, C_GOLD_LIGHT),
        (origin_x + 23, origin_y + 10, C_EMERALD_BRIGHT),
        (origin_x + 29, origin_y + 5, C_WHITE if is_snap else C_GOLD_LIGHT),
        (origin_x + 32, origin_y - 4, C_EMERALD_BRIGHT),
    ]
    for sp_idx, (kx, ky, kcol) in enumerate(sparks):
        if not is_snap and sp_idx % 2 == 1:
            continue
        ikx, iky = int(round(kx)), int(round(ky))
        _spx(ikx, iky, kcol)
        if is_snap and sp_idx % 2 == 0:
            _spx(ikx + 1, iky, C_WHITE)
            _spx(ikx - 1, iky, C_EMERALD_MID)
            _spx(ikx, iky - 1, C_GOLD_LIGHT)
            _spx(ikx, iky + 1, C_GOLD_LIGHT)


# ==============================================================================
# 5. POSE RENDERING ENGINE (STAND RIG + 5 KEYPOSE VARIANTS)
# ==============================================================================

def render_stand_rig_frame(rigs: dict, cfg: dict) -> Image.Image:
    canvas = Image.new("RGBA", (LOG_W, LOG_H), (0, 0, 0, 0))
    parts = rigs["parts"]

    ax = ANCHOR_X_160 + cfg.get("dx", 0.0)
    ay = ANCHOR_Y_120 + cfg.get("dy", 0.0)
    torso_lean = cfg.get("torso_lean", 0.0)
    sink = cfg.get("sink", 0.0)
    head_nod = cfg.get("head_nod", 0.0)
    stride_x = cfg.get("stride_x", 0.0)
    l_hip_ang = cfg.get("l_hip", 0.0)
    l_knee_ang = cfg.get("l_knee", 0.0)
    r_hip_ang = cfg.get("r_hip", 0.0)
    r_knee_ang = cfg.get("r_knee", 0.0)

    def map_pt(x512: float, y512: float) -> tuple[float, float]:
        return (
            ax + (x512 - SPINE_X_512) * SCALE,
            ay + (y512 - GROUND_Y_512) * SCALE + sink,
        )

    hip_x, hip_y = map_pt(256.0, 226.0)
    rad_t = math.radians(torso_lean)
    tx_off = math.sin(rad_t) * 13.0
    ty_off = (1.0 - math.cos(rad_t)) * 7.0

    # Back Layer: Optional 6-Pinion Astral Light-Wings + Quiver
    back_buf = np.zeros((LOG_H, LOG_W, 4), dtype=np.uint8)
    if cfg.get("wings", 0.0) > 0.05:
        draw_yggdrasil_wings_160(
            back_buf,
            cx=hip_x + tx_off - 2.0,
            cy=hip_y - 16.0 + ty_off,
            span_scale=cfg["wings"],
            phase=cfg.get("phase", 0.0),
        )
    draw_quiver_160(back_buf, hip_x - 6.0 + tx_off, hip_y - 18.0 + ty_off)
    canvas.alpha_composite(Image.fromarray(back_buf, "RGBA"))

    # Hair behind torso
    hair_xy = map_pt(214.0, 102.0)
    paste_part_160(
        canvas,
        parts["hair"],
        (hair_xy[0] + tx_off, hair_xy[1] + ty_off),
        angle_deg=torso_lean * 0.5 + cfg.get("hair_wave", 0.0),
    )

    # Legs
    if cfg.get("walk_mode", False) or cfg.get("hover_mode", False):
        hover_mode = bool(cfg.get("hover_mode", False))
        inward_frac = 0.92 if cfg.get("walk_mode", False) else 0.78
        l_hip_xy = (
            ax + (212.0 - SPINE_X_512) * SCALE * (1.0 - inward_frac) + cfg.get("l_hip_dx", 0.0),
            ay + (294.0 - GROUND_Y_512) * SCALE + sink + cfg.get("l_hip_dy", 0.0),
        )
        r_hip_xy = (
            ax + (296.0 - SPINE_X_512) * SCALE * (1.0 - inward_frac) + cfg.get("r_hip_dx", 0.0),
            ay + (294.0 - GROUND_Y_512) * SCALE + sink + cfg.get("r_hip_dy", 0.0),
        )
        # True anatomical target angles (0 deg = straight vertical down, -deg = forward +X, +deg = trailing -X)
        l_th_tgt = cfg.get("l_thigh_tgt", 0.0)
        l_sh_tgt = cfg.get("l_shin_tgt", 0.0)
        r_th_tgt = cfg.get("r_thigh_tgt", 0.0)
        r_sh_tgt = cfg.get("r_shin_tgt", 0.0)

        # Exact rest-angle neutralization from 512x512 A-stance (pivot -> boot toe center)
        l_th_rest, l_sh_rest = 14.42, 13.20
        r_th_rest, r_sh_rest = -21.80, -13.80

        l_th_rad = math.radians(l_th_tgt)
        r_th_rad = math.radians(r_th_tgt)
        l_len_160 = math.hypot(194.0 - 212.0, 364.0 - 294.0) * SCALE  # ~14.03
        r_len_160 = math.hypot(324.0 - 296.0, 364.0 - 294.0) * SCALE  # ~14.64

        l_knee_xy = (
            l_hip_xy[0] - math.sin(l_th_rad) * l_len_160,
            l_hip_xy[1] + math.cos(l_th_rad) * l_len_160,
        )
        r_knee_xy = (
            r_hip_xy[0] - math.sin(r_th_rad) * r_len_160,
            r_hip_xy[1] + math.cos(r_th_rad) * r_len_160,
        )

        # Draw far/left leg darkened behind; in hover_mode draw billowing coat-skirts BEHIND raised front leg
        paste_part_160(canvas, parts["l_thigh_dark"], l_hip_xy, angle_deg=l_th_tgt - l_th_rest)
        paste_part_160(canvas, parts["l_shin_dark"], l_knee_xy, angle_deg=l_sh_tgt - l_sh_rest)
        if hover_mode:
            paste_part_160(
                canvas,
                parts["skirts"],
                (hip_x + tx_off * 0.4 - 1.5, hip_y + ty_off * 0.5),
                angle_deg=torso_lean * 0.5 + cfg.get("skirt_wave", 0.0),
            )
        paste_part_160(canvas, parts["r_thigh"], r_hip_xy, angle_deg=r_th_tgt - r_th_rest)
        paste_part_160(canvas, parts["r_shin"], r_knee_xy, angle_deg=r_sh_tgt - r_sh_rest)
    else:
        hover_mode = False
        l_hip_xy = (ax + (212.0 - SPINE_X_512) * SCALE - stride_x * 0.55, ay + (294.0 - GROUND_Y_512) * SCALE + sink)
        r_hip_xy = (ax + (296.0 - SPINE_X_512) * SCALE + stride_x * 0.55, ay + (294.0 - GROUND_Y_512) * SCALE + sink)
        l_rad = math.radians(l_hip_ang)
        r_rad = math.radians(r_hip_ang)
        l_knee_xy = (l_hip_xy[0] - math.sin(l_rad) * 13.0 - 3.0, l_hip_xy[1] + math.cos(l_rad) * 13.5 + cfg.get("l_lift", 0.0))
        r_knee_xy = (r_hip_xy[0] - math.sin(r_rad) * 13.0 + 4.5, r_hip_xy[1] + math.cos(r_rad) * 13.5 + cfg.get("r_lift", 0.0))

        paste_part_160(canvas, parts["l_thigh"], l_hip_xy, angle_deg=l_hip_ang)
        paste_part_160(canvas, parts["l_shin"], l_knee_xy, angle_deg=l_hip_ang + l_knee_ang)
        paste_part_160(canvas, parts["r_thigh"], r_hip_xy, angle_deg=r_hip_ang)
        paste_part_160(canvas, parts["r_shin"], r_knee_xy, angle_deg=r_hip_ang + r_knee_ang)

    # Coat skirts & tabard + Torso + Head
    if not hover_mode:
        paste_part_160(
            canvas,
            parts["skirts"],
            (hip_x + tx_off * 0.4, hip_y + ty_off * 0.5),
            angle_deg=torso_lean * 0.5 + cfg.get("skirt_wave", 0.0),
        )
    torso_xy = map_pt(256.0, 214.0)
    paste_part_160(canvas, parts["torso"], (torso_xy[0] + tx_off * 0.5, torso_xy[1] + ty_off * 0.5), angle_deg=torso_lean)
    head_xy = map_pt(258.0, 118.0)
    paste_part_160(canvas, parts["head"], (head_xy[0] + tx_off * 1.1, head_xy[1] + ty_off), angle_deg=torso_lean * 0.65 + head_nod)

    # Foreground: IK Elven Bracer Arms + Luminous Yggdrasil Recurve Greatbow
    fg_buf = np.zeros((LOG_H, LOG_W, 4), dtype=np.uint8)
    l_sh = (hip_x - 6.5 + tx_off, hip_y - 16.5 + ty_off)
    r_sh = (hip_x + 7.5 + tx_off, hip_y - 16.5 + ty_off)

    riser_x = hip_x + cfg.get("bow_dx", 16.0)
    riser_y = hip_y + cfg.get("bow_dy", -10.0)
    riser_grip, str_grip = draw_yggdrasil_greatbow_160(
        fg_buf,
        riser_x=riser_x,
        riser_y=riser_y,
        aim_deg=cfg.get("aim_deg", 12.0),
        bow_half_h=cfg.get("bow_h", 22.0),
        draw_pull=cfg.get("draw_pull", 0.0),
        arrow_count=cfg.get("arrows", 0),
        astral_charge=cfg.get("charge", 0.35),
        charge_star=cfg.get("charge_star", 0.0),
        star_phase=cfg.get("phase", 0.0),
        max_star_x=cfg.get("max_star_x", 151),
    )
    draw_elven_bracer_arm_160(fg_buf, l_sh[0], l_sh[1], str_grip[0], str_grip[1], is_front=False, bend_sign=1.0)
    draw_elven_bracer_arm_160(fg_buf, r_sh[0], r_sh[1], riser_grip[0], riser_grip[1], is_front=True, bend_sign=1.0)

    # Drifting Yggdrasil starlight motes on active/victory frames
    if cfg.get("motes", False):
        ph = cfg.get("phase", 0.0)
        max_mx = cfg.get("max_star_x", 151)
        for k in range(3):
            mx = min(max_mx, int(round(ax - 12 + math.cos(ph + k * 2.1) * 16 + k * 8)))
            my = int(round(ay - 44 + math.sin(ph * 1.3 + k * 1.7) * 18))
            set_px(fg_buf, mx, my, C_GOLD_LIGHT if k % 2 == 0 else C_EMERALD_BRIGHT)

    canvas.alpha_composite(Image.fromarray(fg_buf, "RGBA"))
    if cfg.get("clamp_ground", False):
        arr_c = np.array(canvas, dtype=np.uint8)
        arr_c[ANCHOR_Y_120 + 1 :, :, :] = 0
        return Image.fromarray(arr_c, "RGBA")
    return canvas


def render_keypose_frame(rigs: dict, kp_name: str, cfg: dict) -> Image.Image:
    canvas = Image.new("RGBA", (LOG_W, LOG_H), (0, 0, 0, 0))
    kp = rigs[kp_name]

    ax = ANCHOR_X_160 + cfg.get("dx", 0.0)
    ay = ANCHOR_Y_120 + cfg.get("dy", 0.0)
    body_deg = cfg.get("body_deg", 0.0)

    # Back Layer: Optional 6-Pinion Astral Light-Wings + Back Quiver
    back_buf = np.zeros((LOG_H, LOG_W, 4), dtype=np.uint8)
    wing_cy = ay - (23.0 if kp_name == "K4_SOMERSAULT" else 56.0)
    if cfg.get("wings", 0.0) > 0.05:
        draw_yggdrasil_wings_160(
            back_buf,
            cx=ax - 3.0,
            cy=wing_cy,
            span_scale=cfg["wings"],
            phase=cfg.get("phase", 0.0),
        )
    if kp_name != "K4_SOMERSAULT":
        draw_quiver_160(back_buf, ax - 8.0, ay - (44.0 if kp_name == "K2_CROUCH" else 58.0))
    canvas.alpha_composite(Image.fromarray(back_buf, "RGBA"))

    paste_keypose_160(canvas, kp, ax, ay, angle_deg=body_deg, sx=cfg.get("sx", 1.0), sy=cfg.get("sy", 1.0))

    fg_buf = np.zeros((LOG_H, LOG_W, 4), dtype=np.uint8)

    if cfg.get("draw_bow", True):
        riser_x = ax + cfg.get("bow_dx", 22.0)
        riser_y = ay + cfg.get("bow_dy", -54.0)
        riser_grip, str_grip = draw_yggdrasil_greatbow_160(
            fg_buf,
            riser_x=riser_x,
            riser_y=riser_y,
            aim_deg=cfg.get("aim_deg", 0.0),
            bow_half_h=cfg.get("bow_h", 23.0),
            draw_pull=cfg.get("draw_pull", 0.0),
            arrow_count=cfg.get("arrows", 0),
            astral_charge=cfg.get("charge", 0.65),
            charge_star=cfg.get("charge_star", 0.0),
            star_phase=cfg.get("phase", 0.0),
            max_star_x=cfg.get("max_star_x", 151),
        )

        if kp_name == "K3_AIM":
            # Native draw-hand is at cheek; IK front bow-arm holds riser!
            r_sh = (ax + 8.0, ay - 61.0)
            draw_elven_bracer_arm_160(fg_buf, r_sh[0], r_sh[1], riser_grip[0], riser_grip[1], is_front=True, bend_sign=1.0)
        elif kp_name == "K1_COIL":
            l_sh = (ax - 8.0, ay - 56.0)
            r_sh = (ax + 7.0, ay - 56.0)
            draw_elven_bracer_arm_160(fg_buf, l_sh[0], l_sh[1], str_grip[0], str_grip[1], is_front=False, bend_sign=1.0)
            draw_elven_bracer_arm_160(fg_buf, r_sh[0], r_sh[1], riser_grip[0], riser_grip[1], is_front=True, bend_sign=1.0)
        elif kp_name == "K2_SNIPE":
            r_sh = (ax + 5.0, ay - 44.0)
            draw_elven_bracer_arm_160(fg_buf, r_sh[0], r_sh[1], riser_grip[0], riser_grip[1], is_front=True, bend_sign=1.0)
        elif kp_name == "K4_SOMERSAULT":
            # Inverted upside-down shoulder attaches cleanly to inverted bow grip!
            inv_sh = (ax + 12.0, ay - 36.0)
            draw_elven_bracer_arm_160(fg_buf, inv_sh[0], inv_sh[1], riser_grip[0], riser_grip[1], is_front=True, bend_sign=-1.0)

    sigil = cfg.get("shot_sigil")
    if sigil:
        draw_yggdrasil_shot_sigil_160(
            fg_buf,
            origin_x=sigil["origin_x"],
            origin_y=sigil["origin_y"],
            variant=sigil.get("variant", 0),
            fade=sigil.get("fade", 1.0),
        )

    if cfg.get("ground_sparks", False):
        ph = cfg.get("phase", 0.0)
        for s_i in range(4):
            sx = int(round(ax + 10.0 + math.cos(ph * 1.4 + s_i * 1.6) * 5.0))
            sy = int(round(ay - 4.0 - abs(math.sin(ph + s_i * 1.3)) * 5.0))
            set_px(fg_buf, sx, sy, C_GOLD_LIGHT if s_i % 2 == 0 else C_EMERALD_BRIGHT)

    # Living Yggdrasil emerald/gold star-leaf motes so every 30fps frame breathes organically
    if cfg.get("motes", True):
        ph = cfg.get("phase", 0.0)
        max_mx = cfg.get("max_star_x", 151)
        for k in range(3):
            mx = min(max_mx, int(round(ax - 14.0 + math.cos(ph * 1.25 + k * 2.1) * 18.0 + k * 9.0)))
            my = int(round(ay - 36.0 + math.sin(ph * 1.5 + k * 1.9) * 16.0))
            set_px(fg_buf, mx, my, C_GOLD_LIGHT if (k + int(ph * 4)) % 2 == 0 else C_EMERALD_BRIGHT)

    canvas.alpha_composite(Image.fromarray(fg_buf, "RGBA"))
    if cfg.get("clamp_ground", False):
        arr_c = np.array(canvas, dtype=np.uint8)
        arr_c[ANCHOR_Y_120 + 1 :, :, :] = 0
        return Image.fromarray(arr_c, "RGBA")
    return canvas


# ==============================================================================
# 6. ALL 10 ANIMATION ROWS (30 FRAMES EACH = 300 FRAMES @ 320x240)
# ==============================================================================

def build_row0_idle(rigs: dict) -> list[Image.Image]:
    frames = []
    for f in range(30):
        ph = (f / 30.0) * 2.0 * math.pi
        b = math.sin(ph)
        frames.append(render_stand_rig_frame(rigs, {
            "phase": ph,
            "sink": 0.9 * (0.5 + 0.5 * b),
            "torso_lean": 1.6 + 0.9 * b,
            "head_nod": 0.6 * b,
            "hair_wave": 2.6 * math.sin(ph - 0.5),
            "skirt_wave": 1.8 * math.sin(ph - 0.8),
            "bow_dx": 15.5 + 0.8 * b,
            "bow_dy": -9.0 + 0.9 * b,
            "aim_deg": 14.0 + 2.2 * math.sin(ph - 0.4),
            "draw_pull": 0.08 + 0.05 * (0.5 + 0.5 * math.cos(ph)),
            "arrows": 1,
            "charge": 0.40 + 0.15 * (0.5 + 0.5 * b),
            "motes": True,
        }))
    return frames


_BIPEDAL_WALK_KFS = [
    # (u, thigh_tgt_deg, shin_tgt_deg, hip_dx_160, hip_dy_160)
    # 0 deg = straight vertical down; -deg = forward (+X); +deg = trailing (-X)
    (0.000, -22.5, -20.0,  1.8,  0.0),   # Front heel contact (+X)
    (0.085, -14.5,  -7.0,  1.0,  0.4),   # Weight absorption
    (0.233,   0.0,   0.0,  0.0,  0.0),   # Mid-stance dead vertical under AX (F07 / F22!)
    (0.380,  13.5,  18.0, -1.0,  0.0),   # Late stance roll-off
    (0.500,  21.5,  26.5, -1.8, -0.4),   # Rear toe push-off (-X, F15 / F00!)
    (0.620,   6.0,  39.0, -0.6, -2.0),   # Initial swing knee bend & toe clearance
    (0.733, -17.0,  18.5, -0.2, -3.2),   # Mid-swing passing crossover over AX (knee high, boot lifted & centered!)
    (0.875, -24.5, -11.0,  1.2, -1.2),   # Forward swing reach into heel strike
    (1.000, -22.5, -20.0,  1.8,  0.0),
]


def sample_bipedal_walk_leg(u: float) -> tuple[float, float, float, float]:
    u = u % 1.0
    for i in range(len(_BIPEDAL_WALK_KFS) - 1):
        u0, th0, sh0, dx0, dy0 = _BIPEDAL_WALK_KFS[i]
        u1, th1, sh1, dx1, dy1 = _BIPEDAL_WALK_KFS[i + 1]
        if u <= u1 or i == len(_BIPEDAL_WALK_KFS) - 2:
            t = (u - u0) / max(1e-6, u1 - u0)
            s = t * t * (3.0 - 2.0 * t)
            return (
                th0 + (th1 - th0) * s,
                sh0 + (sh1 - sh0) * s,
                dx0 + (dx1 - dx0) * s,
                dy0 + (dy1 - dy0) * s,
            )
    return _BIPEDAL_WALK_KFS[0][1:]


def build_row1_walk(rigs: dict) -> list[Image.Image]:
    """
    Row 1: Authentic Bipedal Crossover Ranger Stride (Zero Crab Straddle, Continuous Bow Carry!):
      - F00: Left foot planted forward (+X), Right foot trailing (-X) -> footSpan320 >= 38px
      - F07: Right knee lifted & crossing directly over AX -> footSpan320 <= 18px
      - F15: Right foot planted forward (+X), Left foot trailing (-X) -> footSpan320 >= 38px
      - F22: Left knee lifted & crossing directly over AX -> footSpan320 <= 18px
    """
    frames = []
    for f in range(30):
        u_l = (f / 30.0) % 1.0
        u_r = (u_l + 0.5) % 1.0
        ph = u_l * 2.0 * math.pi
        s = math.cos(ph)
        # Double-frequency walk bob: slightly lower at contact (F00/F15), rises smoothly at mid-stance (F07/F22)
        bob = 0.65 * math.cos(2.0 * ph)
        l_th, l_sh, l_dx, l_dy = sample_bipedal_walk_leg(u_l)
        r_th, r_sh, r_dx, r_dy = sample_bipedal_walk_leg(u_r)

        frames.append(render_stand_rig_frame(rigs, {
            "walk_mode": True,
            "phase": ph,
            "sink": bob,
            "torso_lean": 2.4 + 0.75 * math.cos(2.0 * ph),
            "head_nod": 0.45 * math.sin(ph + 0.3),
            "l_thigh_tgt": l_th,
            "l_shin_tgt": l_sh,
            "l_hip_dx": l_dx,
            "l_hip_dy": l_dy,
            "r_thigh_tgt": r_th,
            "r_shin_tgt": r_sh,
            "r_hip_dx": r_dx,
            "r_hip_dy": r_dy,
            "hair_wave": 2.6 + 1.8 * math.sin(ph - 0.5),
            "skirt_wave": 1.6 * s,
            "bow_dx": 15.6 - s * 1.1,
            "bow_dy": -9.2 + bob * 0.45,
            "aim_deg": 14.5 - s * 3.0,
            "draw_pull": 0.08 + 0.04 * abs(s),
            "arrows": 1,
            "charge": 0.42 + 0.12 * (0.5 + 0.5 * s),
            "motes": False,
            "clamp_ground": True,
        }))
    return frames


def build_row2_auto_attack(rigs: dict) -> list[Image.Image]:
    """
    Row 2: Dynamic FFBE / Last Cloudia Ranged-Acrobat 4-Beat Flow ([[60,8],[68,7],[75,8],[83,7]]):
      V0 (F00..F07): F03..F04 Yggdrasil Bow-Discharge Star-Compass Sigil + Astral Starlight Shot!
      V1 (F08..F14): F09..F10 Rising Twin-Star (2-arrow) Star-Compass Volley!
      V2 (F15..F22): F17..F18 Rapid 2-Arrow Emerald Streak Star-Compass Sigil!
      V3 (F23..F29): Airborne backstep/hop apex F25..F26 3-Arrow Astral Dragon-Piercer Star-Compass Sigil!
    """
    frames = []
    for f in range(30):
        ph = (f / 30.0) * 4.0 * math.pi
        # ---------------- V0: STARLIGHT SHOT (F00..F07) ----------------
        if f in (0, 1, 2):
            p = f / 2.0
            frames.append(render_keypose_frame(rigs, "K1_COIL" if f < 2 else "K3_AIM", {
                "dx": -2.0 * p,
                "dy": 0.0,
                "phase": ph,
                "bow_dx": 18.0 + 3.0 * p,
                "bow_dy": -54.0,
                "aim_deg": -2.0,
                "draw_pull": 0.45 + 0.55 * p,
                "arrows": 1,
                "charge": 0.55 + 0.40 * p,
                "charge_star": 0.35 + 0.35 * p,
            }))
        elif f == 3:
            # 1-FRAME SNAP: Yggdrasil Bow-Discharge Star-Compass Sigil (`x_160 = 104..151`)
            frames.append(render_keypose_frame(rigs, "K3_AIM", {
                "dx": 5.0,
                "dy": 0.0,
                "phase": ph,
                "bow_dx": 23.0,
                "bow_dy": -55.0,
                "aim_deg": 0.0,
                "draw_pull": -0.22,
                "arrows": 0,
                "charge": 1.15,
                "charge_star": 0.85,
                "shot_sigil": {
                    "origin_x": 116.0,
                    "origin_y": 60.0,
                    "variant": 0,
                    "fade": 1.0,
                },
            }))
        elif f == 4:
            frames.append(render_keypose_frame(rigs, "K3_AIM", {
                "dx": 4.0,
                "dy": 0.0,
                "phase": ph,
                "bow_dx": 22.0,
                "bow_dy": -55.0,
                "aim_deg": -2.0,
                "draw_pull": 0.0,
                "arrows": 0,
                "charge": 0.80,
                "shot_sigil": {
                    "origin_x": 116.0,
                    "origin_y": 60.0,
                    "variant": 0,
                    "fade": 0.58,
                },
            }))
        elif f in (5, 6, 7):
            p = (f - 5) / 2.0
            frames.append(render_keypose_frame(rigs, "K3_AIM", {
                "dx": 3.0 * (1.0 - p) - 2.0 * p,
                "dy": 0.0,
                "phase": ph,
                "bow_dx": 21.0 - 2.0 * p,
                "bow_dy": -55.0 - 3.0 * p,
                "aim_deg": -4.0 - 16.0 * p,
                "draw_pull": 0.65 * p,
                "arrows": 2 if f >= 6 else 0,
                "charge": 0.65,
                "charge_star": 0.45 if f >= 6 else 0.0,
            }))

        # ---------------- V1: RISING TWIN-STAR 2-ARROW VOLLEY (F08..F14) ----------------
        elif f == 8:
            frames.append(render_keypose_frame(rigs, "K3_AIM", {
                "dx": -3.0,
                "dy": 0.0,
                "phase": ph,
                "bow_dx": 19.0,
                "bow_dy": -59.0,
                "aim_deg": -22.0,
                "draw_pull": 1.0,
                "arrows": 2,
                "charge": 0.95,
                "charge_star": 0.65,
            }))
        elif f == 9:
            # 1-FRAME SNAP: Rising upward Twin-Star 2-arrow Star-Compass Sigil
            frames.append(render_keypose_frame(rigs, "K3_AIM", {
                "dx": 4.0,
                "dy": 0.0,
                "phase": ph,
                "bow_dx": 22.0,
                "bow_dy": -60.0,
                "aim_deg": -18.0,
                "draw_pull": -0.20,
                "arrows": 0,
                "charge": 1.15,
                "charge_star": 0.90,
                "shot_sigil": {
                    "origin_x": 116.0,
                    "origin_y": 51.0,
                    "variant": 1,
                    "fade": 1.0,
                },
            }))
        elif f == 10:
            frames.append(render_keypose_frame(rigs, "K3_AIM", {
                "dx": 3.0,
                "dy": 0.0,
                "phase": ph,
                "bow_dx": 21.0,
                "bow_dy": -60.0,
                "aim_deg": -20.0,
                "draw_pull": 0.0,
                "arrows": 0,
                "charge": 0.75,
                "shot_sigil": {
                    "origin_x": 116.0,
                    "origin_y": 51.0,
                    "variant": 1,
                    "fade": 0.58,
                },
            }))
        elif f in (11, 12, 13, 14):
            p = (f - 11) / 3.0
            frames.append(render_keypose_frame(rigs, "K1_COIL", {
                "dx": 2.0 * (1.0 - p) - 3.0 * p,
                "dy": 0.0,
                "phase": ph,
                "bow_dx": 19.0 - 5.0 * p,
                "bow_dy": -56.0 + 4.0 * p,
                "aim_deg": -16.0 * (1.0 - p) + 8.0 * p,
                "draw_pull": 0.75 * p,
                "arrows": 2 if f >= 13 else 0,
                "charge": 0.70,
                "charge_star": 0.45 if f >= 13 else 0.0,
            }))

        # ---------------- V2: RAPID 2-ARROW EMERALD STREAK (F15..F22) ----------------
        elif f in (15, 16):
            p = f - 15
            frames.append(render_keypose_frame(rigs, "K1_COIL", {
                "dx": -4.0 - 1.5 * p,
                "dy": 0.0,
                "phase": ph,
                "bow_dx": 14.0,
                "bow_dy": -52.0,
                "aim_deg": 6.0,
                "draw_pull": 0.95 + 0.15 * p,
                "arrows": 2,
                "charge": 0.95,
                "charge_star": 0.65,
            }))
        elif f == 17:
            # 1-FRAME SNAP: Star-Compass Bow-Discharge Sigil + rapid 2-arrow emerald jet!
            frames.append(render_keypose_frame(rigs, "K3_AIM", {
                "dx": 6.0,
                "dy": 0.0,
                "phase": ph,
                "bow_dx": 23.0,
                "bow_dy": -53.0,
                "aim_deg": 0.0,
                "draw_pull": -0.22,
                "arrows": 0,
                "charge": 1.20,
                "charge_star": 0.95,
                "shot_sigil": {
                    "origin_x": 118.0,
                    "origin_y": 61.0,
                    "variant": 2,
                    "fade": 1.0,
                },
            }))
        elif f == 18:
            frames.append(render_keypose_frame(rigs, "K3_AIM", {
                "dx": 5.0,
                "dy": 0.0,
                "phase": ph,
                "bow_dx": 22.0,
                "bow_dy": -54.0,
                "aim_deg": -2.0,
                "draw_pull": 0.05,
                "arrows": 0,
                "charge": 0.95,
                "shot_sigil": {
                    "origin_x": 118.0,
                    "origin_y": 61.0,
                    "variant": 2,
                    "fade": 0.58,
                },
            }))
        elif f in (19, 20, 21, 22):
            p = (f - 19) / 3.0
            frames.append(render_keypose_frame(rigs, "K2_SNIPE" if f >= 21 else "K3_AIM", {
                "dx": 4.0 * (1.0 - p) - 3.0 * p,
                "dy": 0.0,
                "phase": ph,
                "bow_dx": 20.0 - 2.0 * p,
                "bow_dy": -52.0 + 8.0 * p,
                "aim_deg": 0.0,
                "draw_pull": 0.65 * p,
                "arrows": 3 if f == 22 else 0,
                "charge": 0.75,
                "charge_star": 0.55 if f == 22 else 0.0,
            }))

        # ---------------- V3: AIRBORNE HOP APEX 3-ARROW ASTRAL DRAGON-PIERCER (F23..F29) ----------------
        elif f in (23, 24):
            p = f - 23
            frames.append(render_keypose_frame(rigs, "K3_AIM", {
                "dx": -4.0 - 2.0 * p,
                "dy": -6.0 - 5.0 * p,  # Crisp airborne backstep hop into apex!
                "wings": 0.55 + 0.25 * p,
                "phase": ph,
                "bow_dx": 19.0,
                "bow_dy": -54.0,
                "aim_deg": 4.0,
                "draw_pull": 1.05 + 0.15 * p,
                "arrows": 3,
                "charge": 1.15,
                "charge_star": 0.85 + 0.15 * p,
            }))
        elif f == 25:
            # 1-FRAME APEX SNAP: 3-Arrow Astral Dragon-Piercer Star-Compass Sigil!
            frames.append(render_keypose_frame(rigs, "K3_AIM", {
                "dx": -3.0,
                "dy": -11.0,
                "wings": 0.90,
                "phase": ph,
                "bow_dx": 23.0,
                "bow_dy": -53.0,
                "aim_deg": 5.0,
                "draw_pull": -0.25,
                "arrows": 0,
                "charge": 1.35,
                "charge_star": 1.05,
                "shot_sigil": {
                    "origin_x": 117.0,
                    "origin_y": 53.0,
                    "variant": 3,
                    "fade": 1.0,
                },
            }))
        elif f == 26:
            frames.append(render_keypose_frame(rigs, "K3_AIM", {
                "dx": -2.0,
                "dy": -8.0,
                "wings": 0.65,
                "phase": ph,
                "bow_dx": 22.0,
                "bow_dy": -53.0,
                "aim_deg": 5.0,
                "draw_pull": 0.0,
                "arrows": 0,
                "charge": 0.95,
                "shot_sigil": {
                    "origin_x": 117.0,
                    "origin_y": 53.0,
                    "variant": 3,
                    "fade": 0.58,
                },
            }))
        elif f == 27:
            frames.append(render_keypose_frame(rigs, "K3_AIM", {
                "dx": -1.0,
                "dy": -4.0,
                "wings": 0.40,
                "phase": ph,
                "bow_dx": 20.5,
                "bow_dy": -53.0,
                "aim_deg": 6.0,
                "draw_pull": 0.08,
                "arrows": 0,
                "charge": 0.72,
            }))
        else:  # F28..F29 agile ranger landing settle
            p = f - 28
            frames.append(render_keypose_frame(rigs, "K2_CROUCH" if p == 0 else "K3_AIM", {
                "dx": 0.0,
                "dy": 0.0,
                "phase": ph,
                "draw_bow": p == 1,
                "bow_dx": 18.0,
                "bow_dy": -52.0,
                "aim_deg": 8.0,
                "draw_pull": 0.10,
                "arrows": 1,
                "charge": 0.45,
            }))
    return frames


def build_row3_skill(rigs: dict) -> list[Image.Image]:
    """Row 3: VERDANT SNARE & SEEKERS (Ground Root-Cast F00..F11 + 3-Seeker Volley F12..F29)."""
    frames = []
    for f in range(30):
        ph = (f / 30.0) * 4.0 * math.pi
        if f <= 11:
            u = f / 11.0
            frames.append(render_keypose_frame(rigs, "K2_CROUCH", {
                "dx": 2.0 * math.sin(u * math.pi),
                "dy": 0.0,
                "phase": ph,
                "draw_bow": False,
                "ground_sparks": 3 <= f <= 9,
            }))
        elif f <= 15:
            p = (f - 12) / 3.0
            frames.append(render_keypose_frame(rigs, "K3_AIM", {
                "dx": -2.0 * p,
                "dy": 0.0,
                "phase": ph,
                "bow_dx": 20.0,
                "bow_dy": -55.0,
                "aim_deg": -8.0,
                "draw_pull": 0.55 + 0.45 * p,
                "arrows": 3,
                "charge": 0.85 + 0.25 * p,
                "charge_star": 0.5 + 0.4 * p,
            }))
        elif f == 16:
            frames.append(render_keypose_frame(rigs, "K3_AIM", {
                "dx": 4.0,
                "dy": 0.0,
                "phase": ph,
                "bow_dx": 23.0,
                "bow_dy": -55.0,
                "aim_deg": -6.0,
                "draw_pull": -0.22,
                "arrows": 0,
                "charge": 1.25,
                "charge_star": 0.95,
            }))
        else:
            p = (f - 17) / 12.0
            frames.append(render_stand_rig_frame(rigs, {
                "dx": 3.0 * (1.0 - p),
                "phase": ph,
                "sink": 1.2 * (1.0 - p),
                "torso_lean": 4.0 * (1.0 - p),
                "bow_dx": 18.0 - 2.5 * p,
                "bow_dy": -10.0,
                "aim_deg": 6.0 + 8.0 * p,
                "draw_pull": 0.08 * p,
                "arrows": 1 if p > 0.5 else 0,
                "charge": 0.65 - 0.25 * p,
                "motes": True,
            }))
    return frames


def build_row4_ultimate(rigs: dict) -> list[Image.Image]:
    """
    Row 4: Dual-Window Neo-Vision Somersault Bow-Charge & Airborne Hover Overdraw (`maxX <= 258`, 0 smears!):
      - F00..F02 (120..122): Winged leap-off coil (`dy = -2..-6`, `wings = 0.55..0.82`) + nocked arrow & bow charge star
      - F03..F14 (123..134): 30fps acrobatic airborne somersault with unfolded 6-pinion wings (`0.75..0.96`)
                             AND brightly charging Yggdrasil bow + glowing emerald-gold starlight core on arrow tip
      - F15..F16 (135..136): Smooth airborne/touchdown transition (`wings = 0.78..0.88`)
      - F17..F26 (137..146): Airborne Sovereign Overdraw & Release — graceful mid-air hovering Elven Ranger legs
                             (front knee bent/tucked in mid-air, rear leg extended with pointed boot, flowing
                             skirt & hair, `wings = 0.95..1.08`, full overdrawn Yggdrasil Greatbow, `0` smears)
      - F27..F29 (147..149): Winged Supernova descent & follow-through settle
    """
    frames = []
    for f in range(30):
        ph = (f / 30.0) * 6.0 * math.pi
        if f <= 2:
            p = f / 2.0
            frames.append(render_keypose_frame(rigs, "K1_COIL", {
                "dx": -1.0 + 3.0 * p,
                "dy": -2.0 - 4.0 * p,
                "wings": 0.55 + 0.27 * p,
                "phase": ph,
                "draw_bow": True,
                "bow_dx": 17.0 + 1.5 * p,
                "bow_dy": -50.0 + 2.0 * p,
                "aim_deg": -14.0 - 10.0 * p,
                "bow_h": 20.0,
                "draw_pull": 0.45 + 0.35 * p,
                "arrows": 1,
                "charge": 1.05 + 0.15 * p,
                "charge_star": 0.85 + 0.30 * p,
                "max_star_x": 128,
            }))
        elif f in (3, 4, 5):
            # Rising backward somersault launch (-42 -> -92 -> -136 deg) with unfolded wings & glowing bow-charge core!
            idx = f - 3
            rot_deg = (-42.0, -92.0, -136.0)[idx]
            base_im = render_keypose_frame(rigs, "K1_COIL", {
                "dx": 0.0,
                "dy": -4.0,
                "wings": 0.76 + 0.06 * idx,
                "phase": ph,
                "bow_dx": 15.0,
                "bow_dy": -48.0,
                "aim_deg": 20.0,
                "bow_h": 19.0,
                "draw_pull": 0.65 + 0.10 * idx,
                "arrows": 1,
                "charge": 1.22,
                "charge_star": 1.05 + 0.12 * idx,
                "max_star_x": 128,
                "motes": False,
            })
            rot_im = base_im.rotate(-rot_deg, resample=Image.Resampling.NEAREST, center=(ANCHOR_X_160 + 2, 68))
            cell = Image.new("RGBA", (LOG_W, LOG_H), (0, 0, 0, 0))
            cell.paste(rot_im, (4, -6 - idx * 2))
            fg = np.zeros((LOG_H, LOG_W, 4), dtype=np.uint8)
            for k in range(3):
                mx = min(127, int(round(ANCHOR_X_160 - 6.0 + math.cos(ph * 1.4 + k * 2.1) * 18.0)))
                my = int(round(58.0 + math.sin(ph * 1.6 + k * 1.9) * 16.0))
                set_px(fg, mx, my, C_GOLD_LIGHT if (k + idx) % 2 == 0 else C_EMERALD_BRIGHT)
            cell.alpha_composite(Image.fromarray(fg, "RGBA"))
            frames.append(cell)
        elif f <= 11:
            # Inverted 180-deg upside-down mid-air bow-charge & aim with unfolded Astral Light-Wings (`0` smears!)
            u = (f - 6) / 5.0
            frames.append(render_keypose_frame(rigs, "K4_SOMERSAULT", {
                "dx": 1.5 + 1.5 * math.sin(u * math.pi),
                "dy": -14.0 - 3.0 * math.sin(u * math.pi),
                "body_deg": -16.0 + 32.0 * u,
                "wings": 0.88 + 0.08 * math.sin(u * math.pi),
                "phase": ph,
                "bow_dx": 17.0,
                "bow_dy": -33.0,
                "aim_deg": 44.0 + 10.0 * u,
                "bow_h": 19.5,
                "draw_pull": 0.72 + 0.28 * math.sin(u * math.pi),
                "arrows": 1,
                "charge": 1.32,
                "charge_star": 1.05 + 0.25 * math.sin(ph),
                "max_star_x": 128,
            }))
        elif f in (12, 13, 14):
            # Descending backflip completion (+116 -> +58 -> +18 deg) with charging bow & starlight core!
            idx = f - 12
            rot_deg = (116.0, 58.0, 18.0)[idx]
            base_im = render_keypose_frame(rigs, "K1_COIL", {
                "dx": 0.0,
                "dy": -2.0,
                "wings": 0.88 - idx * 0.04,
                "phase": ph,
                "bow_dx": 16.0,
                "bow_dy": -50.0,
                "aim_deg": 14.0,
                "bow_h": 20.0,
                "draw_pull": 0.65 + 0.10 * idx,
                "arrows": 1,
                "charge": 1.25,
                "charge_star": 1.15 - 0.06 * idx,
                "max_star_x": 128,
                "motes": False,
            })
            rot_im = base_im.rotate(-rot_deg, resample=Image.Resampling.NEAREST, center=(ANCHOR_X_160 + 2, 68))
            cell = Image.new("RGBA", (LOG_W, LOG_H), (0, 0, 0, 0))
            cell.paste(rot_im, (2, -7 + idx * 3))
            fg = np.zeros((LOG_H, LOG_W, 4), dtype=np.uint8)
            for k in range(3):
                mx = min(127, int(round(ANCHOR_X_160 - 4.0 + math.cos(ph * 1.3 + k * 2.1) * 18.0)))
                my = int(round(62.0 + math.sin(ph * 1.5 + k * 1.9) * 16.0))
                set_px(fg, mx, my, C_GOLD_LIGHT if (k + idx) % 2 == 0 else C_EMERALD_BRIGHT)
            cell.alpha_composite(Image.fromarray(fg, "RGBA"))
            frames.append(cell)
        elif f in (15, 16):
            # Smooth airborne / touchdown transition (`wings = 0.78..0.88`)
            p = f - 15
            frames.append(render_stand_rig_frame(rigs, {
                "hover_mode": True,
                "dx": 1.0 - 1.0 * p,
                "dy": -2.0 - 3.5 * p,
                "wings": 0.78 + 0.10 * p,
                "phase": ph,
                "torso_lean": 7.0 - 2.5 * p,
                "head_nod": 1.0 * (1.0 - p),
                "hair_wave": 12.0 + 1.5 * p,
                "skirt_wave": 11.0 + 1.5 * p,
                "l_hip_dx": -1.5,
                "l_thigh_tgt": 20.0,
                "l_shin_tgt": 30.0 - 2.0 * p,
                "r_hip_dx": 2.0,
                "r_hip_dy": -1.0,
                "r_thigh_tgt": -52.0 - 10.0 * p,
                "r_shin_tgt": 8.0 + 6.0 * p,
                "bow_dx": 17.5 + 1.5 * p,
                "bow_dy": -12.5 - 1.0 * p,
                "aim_deg": 8.0 - 6.0 * p,
                "bow_h": 22.0 + 1.5 * p,
                "draw_pull": 0.40 + 0.20 * p,
                "arrows": 1,
                "charge": 1.10 + 0.08 * p,
                "charge_star": 0.90 + 0.10 * p,
                "max_star_x": 128,
                "motes": True,
            }))
        elif f <= 24:
            # F17..F24: Airborne Sovereign Overdraw (`wings = 0.95..1.08`, graceful hovering legs, flowing hair & skirt!)
            u = (f - 17) / 7.0
            sway = math.sin(u * math.pi)
            frames.append(render_stand_rig_frame(rigs, {
                "hover_mode": True,
                "dx": -2.0 * u,
                "dy": -7.5 - 2.0 * sway,
                "wings": 0.95 + 0.13 * u,
                "phase": ph,
                "torso_lean": 4.0 - 3.0 * u,
                "head_nod": -0.5 + 0.8 * u,
                "hair_wave": 14.0 + 3.5 * math.sin(u * math.pi * 2.0),
                "skirt_wave": 13.0 + 3.0 * math.cos(u * math.pi * 1.5),
                "l_hip_dx": -2.0,
                "l_thigh_tgt": 21.0 + 3.0 * sway,
                "l_shin_tgt": 29.0 + 4.0 * sway,
                "r_hip_dx": 2.5,
                "r_hip_dy": -1.5,
                "r_thigh_tgt": -66.0 - 4.0 * u,
                "r_shin_tgt": 14.0 + 4.0 * u,
                "bow_dx": 19.5 - 1.5 * u,
                "bow_dy": -13.5,
                "aim_deg": 0.0,
                "bow_h": 24.0,
                "draw_pull": 0.65 + 0.55 * u,
                "arrows": 1,
                "charge": 1.20 + 0.25 * u,
                "charge_star": 1.00 + 0.35 * u,
                "max_star_x": 128,
                "motes": True,
            }))
        elif f in (25, 26):
            # F25..F26: Airborne Sovereign Overdraw Release (0 smears, poised hover recoil!)
            p = f - 25
            frames.append(render_stand_rig_frame(rigs, {
                "hover_mode": True,
                "dx": -4.0 + 1.2 * p,
                "dy": -8.0 + 1.5 * p,
                "wings": 1.08 - 0.06 * p,
                "phase": ph,
                "torso_lean": -4.5 + 2.0 * p,
                "head_nod": 0.5,
                "hair_wave": 16.5 - 2.0 * p,
                "skirt_wave": 14.5 - 1.5 * p,
                "l_hip_dx": -2.0,
                "l_thigh_tgt": 23.0 - 2.0 * p,
                "l_shin_tgt": 31.0 - 2.0 * p,
                "r_hip_dx": 2.5,
                "r_hip_dy": -1.5,
                "r_thigh_tgt": -68.0 + 5.0 * p,
                "r_shin_tgt": 17.0 - 3.0 * p,
                "bow_dx": 21.0,
                "bow_dy": -13.5,
                "aim_deg": 0.0,
                "bow_h": 24.0,
                "draw_pull": -0.22 + 0.16 * p,
                "arrows": 0,
                "charge": 1.40 - 0.25 * p,
                "charge_star": 1.15 - 0.45 * p,
                "max_star_x": 128,
                "motes": True,
            }))
        else:
            # F27..F29: Winged Supernova descent & follow-through settle cleanly to ground
            p = (f - 27) / 2.0
            frames.append(render_stand_rig_frame(rigs, {
                "hover_mode": True,
                "dx": -2.0 * (1.0 - p),
                "dy": -4.5 * (1.0 - p),
                "wings": 0.94 - 0.26 * p,
                "phase": ph,
                "torso_lean": 0.5 + 1.5 * p,
                "head_nod": 0.3 * p,
                "hair_wave": 11.5 - 7.5 * p,
                "skirt_wave": 10.5 - 7.5 * p,
                "l_hip_dx": -1.5 * (1.0 - p),
                "l_thigh_tgt": 19.0 - 4.6 * p,
                "l_shin_tgt": 26.0 - 12.8 * p,
                "r_hip_dx": 1.5 * (1.0 - p),
                "r_hip_dy": -1.0 * (1.0 - p),
                "r_thigh_tgt": -54.0 + 32.2 * p,
                "r_shin_tgt": 12.0 - 25.8 * p,
                "bow_dx": 19.5 - 3.5 * p,
                "bow_dy": -12.5 + 3.0 * p,
                "aim_deg": 4.0 + 8.0 * p,
                "bow_h": 23.0 - 1.0 * p,
                "draw_pull": 0.05 + 0.07 * p,
                "arrows": 1 if f == 29 else 0,
                "charge": 0.95 - 0.40 * p,
                "charge_star": 0.45 * (1.0 - p),
                "max_star_x": 128,
                "motes": True,
            }))
    return frames


def build_row5_hurt_death(rigs: dict) -> list[Image.Image]:
    frames = []
    for f in range(30):
        ph = (f / 30.0) * 2.0 * math.pi
        if f <= 5:
            p = math.sin(((f + 1) / 6.0) * math.pi)
            frames.append(render_stand_rig_frame(rigs, {
                "dx": -3.5 * p,
                "phase": ph,
                "sink": 2.2 * p,
                "torso_lean": -12.0 * p,
                "head_nod": -7.0 * p,
                "l_hip": 9.0 * p,
                "r_hip": -10.0 * p,
                "hair_wave": -8.0 * p,
                "bow_dx": 11.0 - 3.0 * p,
                "bow_dy": -8.0 + 2.5 * p,
                "aim_deg": 42.0 + 16.0 * p,
                "arrows": 0,
                "charge": 0.15,
                "clamp_ground": True,
            }))
        elif f <= 15:
            p = (f - 6) / 9.0
            frames.append(render_keypose_frame(rigs, "K2_CROUCH", {
                "dx": 2.0 + 6.0 * p,
                "dy": 0.0,
                "body_deg": -18.0 * p,
                "sy": 1.0 - 0.12 * p,
                "phase": ph,
                "draw_bow": False,
                "clamp_ground": True,
            }))
        else:
            p = (f - 16) / 13.0
            # Smooth collapse onto floor, shifted +18px rightward so head stays >= x_320=36 (0 left-edge cut!)
            ang = -66.0 - 23.0 * min(1.0, p * 1.45)  # Reaches -89.0 deg flat prone by F22!
            canvas = Image.new("RGBA", (LOG_W, LOG_H), (0, 0, 0, 0))
            paste_keypose_160(
                canvas,
                rigs["K1_COIL"],
                ANCHOR_X_160 + 38.0 + 1.0 * math.sin(p * math.pi),
                ANCHOR_Y_120 - 15.0,
                angle_deg=ang,
                sx=0.74,
                sy=0.86,
            )
            fg_buf = np.zeros((LOG_H, LOG_W, 4), dtype=np.uint8)
            draw_yggdrasil_greatbow_160(
                fg_buf,
                riser_x=ANCHOR_X_160 + 30.0 + p * 0.8,
                riser_y=ANCHOR_Y_120 - 9.0,
                aim_deg=92.0,
                bow_half_h=15.0,
                draw_pull=0.0,
                arrow_count=0,
                astral_charge=0.10,
            )
            ex = int(round(ANCHOR_X_160 + 8.0 + (f - 16) * 2.0))
            ey = int(round(ANCHOR_Y_120 - 18.0 - (f - 16) * 0.6))
            set_px(fg_buf, ex, ey, C_EMERALD_MID if f < 24 else C_FOREST_DARK)
            canvas.alpha_composite(Image.fromarray(fg_buf, "RGBA"))
            arr_c = np.array(canvas, dtype=np.uint8)
            arr_c[ANCHOR_Y_120 :, :, :] = 0
            frames.append(Image.fromarray(arr_c, "RGBA"))
    return frames


def build_row6_dash(rigs: dict) -> list[Image.Image]:
    frames = []
    for f in range(30):
        ph = (f / 30.0) * 4.0 * math.pi
        if f <= 3:
            p = f / 3.0
            frames.append(render_keypose_frame(rigs, "K2_SNIPE", {
                "dx": -2.0 * p,
                "dy": 0.0,
                "phase": ph,
                "bow_dx": 16.0,
                "bow_dy": -40.0,
                "aim_deg": 24.0,
                "arrows": 1,
                "charge": 0.65,
            }))
        elif f <= 23:
            u = (f - 4) / 19.0
            frames.append(render_keypose_frame(rigs, "K3_AIM", {
                "dx": 7.0 + 2.0 * math.sin(u * math.pi),
                "dy": -2.0 * math.sin(u * math.pi),
                "body_deg": 9.0,
                "wings": 0.45,
                "phase": ph,
                "bow_dx": 18.0 + 2.0 * math.sin(u * math.pi * 2.0),
                "bow_dy": -48.0,
                "aim_deg": 28.0 + 4.0 * math.cos(u * math.pi * 2.0),
                "draw_pull": 0.15,
                "arrows": 1,
                "charge": 0.85,
                "clamp_ground": True,
            }))
        else:
            p = (f - 24) / 5.0
            frames.append(render_stand_rig_frame(rigs, {
                "dx": 4.0 * (1.0 - p),
                "phase": ph,
                "sink": 1.8 * (1.0 - p),
                "torso_lean": 7.0 * (1.0 - p),
                "bow_dx": 15.5,
                "bow_dy": -9.0,
                "aim_deg": 14.0,
                "arrows": 1,
                "charge": 0.45,
            }))
    return frames


def build_row7_crouch(rigs: dict) -> list[Image.Image]:
    """Row 7: LEAF-VEIL PARRY (Low Ranger Crouch F00..F13 -> Kneeling Sniper Shot F14..F23 -> Rise)."""
    frames = []
    for f in range(30):
        ph = (f / 30.0) * 4.0 * math.pi
        if f <= 13:
            u = f / 13.0
            frames.append(render_keypose_frame(rigs, "K2_CROUCH", {
                "dx": -1.5 * math.sin(u * math.pi),
                "dy": 0.0,
                "phase": ph,
                "draw_bow": False,
                "ground_sparks": 4 <= f <= 10,
            }))
        elif f == 14:
            frames.append(render_keypose_frame(rigs, "K2_SNIPE", {
                "dx": 5.0,
                "dy": 0.0,
                "phase": ph,
                "bow_dx": 22.0,
                "bow_dy": -42.0,
                "aim_deg": -4.0,
                "bow_h": 20.0,
                "draw_pull": -0.22,
                "arrows": 0,
                "charge": 1.20,
                "charge_star": 0.95,
            }))
        elif f <= 23:
            p = (f - 15) / 8.0
            frames.append(render_keypose_frame(rigs, "K2_SNIPE", {
                "dx": 4.0 * (1.0 - p),
                "dy": 0.0,
                "phase": ph,
                "bow_dx": 21.0 - 3.0 * p,
                "bow_dy": -42.0,
                "aim_deg": -4.0 + 10.0 * p,
                "bow_h": 20.0,
                "draw_pull": 0.10 * p,
                "arrows": 1 if p > 0.5 else 0,
                "charge": 0.85 * (1.0 - 0.4 * p),
                "charge_star": 0.45 if f == 15 else 0.0,
            }))
        else:
            p = (f - 24) / 5.0
            frames.append(render_stand_rig_frame(rigs, {
                "phase": ph,
                "sink": 2.4 * (1.0 - p),
                "torso_lean": 4.5 * (1.0 - p),
                "bow_dx": 15.5,
                "bow_dy": -9.0,
                "aim_deg": 14.0,
                "arrows": 1,
                "charge": 0.40,
            }))
    return frames


def build_row8_jump(rigs: dict) -> list[Image.Image]:
    """Row 8: ZEPHYR VAULT (Acrobatic Aerial Vault + Inverted 180-deg Somersault Twin-Shot!)."""
    frames = []
    for f in range(30):
        ph = (f / 30.0) * 4.0 * math.pi
        if f <= 3:
            frames.append(render_keypose_frame(rigs, "K2_CROUCH", {
                "dx": 0.0,
                "dy": 0.0,
                "phase": ph,
                "draw_bow": False,
            }))
        elif f <= 11:
            u = (f - 4) / 7.0
            frames.append(render_keypose_frame(rigs, "K3_AIM", {
                "dx": 2.0 * u,
                "dy": -14.0 * math.sin(u * math.pi * 0.5),
                "wings": 0.45 * u,
                "phase": ph,
                "bow_dx": 19.0,
                "bow_dy": -52.0,
                "aim_deg": 18.0,
                "draw_pull": 0.85 * u,
                "arrows": 2,
                "charge": 0.90,
            }))
        elif f <= 20:
            # Inverted 180-deg Somersault Apex Shot!
            u = (f - 12) / 8.0
            snap = f in (14, 15)
            frames.append(render_keypose_frame(rigs, "K4_SOMERSAULT", {
                "dx": 2.0 * (1.0 - u),
                "dy": -16.0 + 4.0 * u,
                "wings": 0.55,
                "phase": ph,
                "bow_dx": 18.0,
                "bow_dy": -34.0,
                "aim_deg": 36.0,
                "bow_h": 20.0,
                "draw_pull": -0.20 if f == 14 else (-0.05 if f == 15 else 0.45),
                "arrows": 0 if snap else 1,
                "charge": 1.10,
                "charge_star": 0.90 if f == 14 else (0.50 if f == 15 else 0.35),
            }))
        else:
            p = (f - 21) / 8.0
            frames.append(render_stand_rig_frame(rigs, {
                "dy": -6.0 * max(0.0, 1.0 - p * 1.6),
                "phase": ph,
                "sink": 2.2 * math.sin(p * math.pi),
                "torso_lean": 5.0 * (1.0 - p),
                "bow_dx": 15.5,
                "bow_dy": -9.0,
                "aim_deg": 14.0,
                "arrows": 1,
                "charge": 0.45,
            }))
    return frames


def build_row9_victory(rigs: dict) -> list[Image.Image]:
    """Row 9: Skyward Starlight Flourish (F00..F14) + Winged Yggdrasil Sovereign Loop (F15..F29)."""
    frames = []
    for f in range(30):
        if f < 15:
            u = f / 14.0
            ph = u * 2.0 * math.pi
            frames.append(render_keypose_frame(rigs, "K3_AIM", {
                "dx": 2.0 * (1.0 - u),
                "dy": 0.0,
                "wings": 0.55 + 0.45 * math.sin(u * math.pi),
                "phase": ph,
                "bow_dx": 19.0,
                "bow_dy": -60.0 + 4.0 * u,
                "aim_deg": -38.0 + 24.0 * u,
                "draw_pull": 0.35 * (1.0 - u),
                "arrows": 1,
                "charge": 0.95,
                "charge_star": 0.75 if f == 4 else 0.35,
            }))
        else:
            lph = ((f - 15) / 15.0) * 2.0 * math.pi
            b = math.sin(lph)
            frames.append(render_stand_rig_frame(rigs, {
                "phase": lph,
                "wings": 0.82 + 0.10 * (0.5 + 0.5 * b),
                "sink": 0.7 * (0.5 + 0.5 * b),
                "torso_lean": 1.2 + 0.7 * b,
                "head_nod": 0.5 * b,
                "hair_wave": 3.0 * math.sin(lph - 0.5),
                "skirt_wave": 2.2 * math.sin(lph - 0.8),
                "bow_dx": 16.0 + 0.6 * b,
                "bow_dy": -10.5 + 0.7 * b,
                "aim_deg": 8.0 + 2.0 * math.cos(lph),
                "draw_pull": 0.12,
                "arrows": 1,
                "charge": 0.85,
                "motes": True,
            }))
    return frames


# ==============================================================================
# 7. PIXEL PURITY, PORTRAIT & MANDATORY VISUAL QA CONTACT SHEETS
# ==============================================================================

def finalize_cell_320x240(im_160: Image.Image) -> Image.Image:
    arr = np.array(im_160.convert("RGBA"), dtype=np.uint8)
    alpha = arr[:, :, 3]
    arr[:, :, 3] = np.where(alpha >= 128, 255, 0)
    arr[arr[:, :, 3] == 0] = 0

    arr[:MARGIN_160, :, :] = 0
    arr[-MARGIN_160:, :, :] = 0
    arr[:, :MARGIN_160, :] = 0
    arr[:, -MARGIN_160:, :] = 0

    return Image.fromarray(arr, "RGBA").resize((CELL_W, CELL_H), Image.Resampling.NEAREST)


def build_portrait_128():
    # Disabled during sheet-only overhaul to guarantee zero git diff on archer_ex_portrait.png
    return Image.open(OUT_PORTRAIT)


def verify_and_emit_qa(all_rows_320: list[list[Image.Image]], portrait_128: Image.Image):
    QA_DIR.mkdir(parents=True, exist_ok=True)
    border_clips = 0
    non_binary_alpha = 0
    non_2x2_blocks = 0
    row_transitions = []

    for row in all_rows_320:
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
            if c_idx > 0 and not np.array_equal(arr, np.array(row[c_idx - 1], dtype=np.uint8)):
                trans += 1
        row_transitions.append(trans)

    snap_reaches = {}
    snap_front_px = {}
    for sf in (3, 9, 17, 25):
        arr = np.array(all_rows_320[2][sf], dtype=np.uint8)
        ys, xs = np.where(arr[:, :, 3] > 0)
        snap_reaches[sf] = int(xs.max()) if len(xs) else 0
        snap_front_px[sf] = int(np.sum(arr[:, 201:, 3] > 0))

    row4_max_x = []
    for f in range(30):
        arr = np.array(all_rows_320[4][f], dtype=np.uint8)
        _, xs_r4 = np.where(arr[:, :, 3] > 0)
        mx4 = int(xs_r4.max()) if len(xs_r4) else 0
        row4_max_x.append(mx4)
        assert mx4 <= 258, f"Row 4 F{f:02d} exceeded maxX <= 258: {mx4}"

    # Quantitative Row 1 Walk Crossover Gate (#124)
    foot_spans = []
    top_ys = []
    for f in range(30):
        arr = np.array(all_rows_320[1][f], dtype=np.uint8)
        a = arr[:, :, 3] > 0
        ys_all, _ = np.where(a)
        top_ys.append(int(ys_all.min()))
        band = a[206:233, :]
        _, xs_b = np.where(band)
        span = int(xs_b.max() - xs_b.min()) if len(xs_b) else 0
        foot_spans.append(span)
    max_foot_span = max(foot_spans)
    min_foot_span = min(foot_spans)
    max_adj_top = max(abs(top_ys[i] - top_ys[(i + 1) % 30]) for i in range(30))
    print(f"[QA] Row 1 footSpan320: F00={foot_spans[0]} F07={foot_spans[7]} F15={foot_spans[15]} F22={foot_spans[22]} | min={min_foot_span} max={max_foot_span} ratio={min_foot_span/max(1,max_foot_span):.2f} | maxAdjTopDelta={max_adj_top}")
    assert foot_spans[0] >= 34 and foot_spans[15] >= 34, f"Walk contact stride too narrow: F00={foot_spans[0]}, F15={foot_spans[15]}"
    assert foot_spans[7] <= max_foot_span * 0.55 and foot_spans[22] <= max_foot_span * 0.55, (
        f"Walk crossover failed: F07={foot_spans[7]}, F22={foot_spans[22]}, max={max_foot_span}"
    )
    assert max_adj_top <= 4, f"Walk head bob jump > 4px: {max_adj_top}"

    # Quantitative Row 5 Prone Death Gate (F22..F29)
    for df in range(22, 30):
        arr = np.array(all_rows_320[5][df], dtype=np.uint8)
        ys_d, xs_d = np.where(arr[:, :, 3] > 0)
        dh = int(ys_d.max() - ys_d.min() + 1)
        dmin_x, dmax_x, dmax_y = int(xs_d.min()), int(xs_d.max()), int(ys_d.max())
        assert dh <= 96 and dmin_x >= 24 and dmax_x <= 298 and dmax_y <= 230, (
            f"Row 5 F{df:02d} prone bounds fail: h={dh}, x={dmin_x}..{dmax_x}, maxY={dmax_y}"
        )

    print(f"[QA] border_clips={border_clips}/300 | non_binary_alpha={non_binary_alpha} | non_2x2_blocks={non_2x2_blocks}")
    print(f"[QA] row_transitions={row_transitions}")
    print(f"[QA] Row 2 snap front reaches (261..303): {snap_reaches} | frontPx (>=240): {snap_front_px}")
    print(f"[QA] Row 4 F00..F29 maxX (must be <= 258): max={max(row4_max_x)}, min={min(row4_max_x)}")

    assert border_clips == 0, f"Border clip failure: {border_clips}"
    assert non_binary_alpha == 0, f"Non-binary alpha cells: {non_binary_alpha}"
    assert non_2x2_blocks == 0, f"2x2 block purity failure: {non_2x2_blocks}"
    assert all(t == 29 for t in row_transitions), f"Transition failure: {row_transitions}"
    assert all(260 < rx <= 303 for rx in snap_reaches.values()), f"Row 2 sigil reach out of bounds: {snap_reaches}"
    assert all(px >= 240 for px in snap_front_px.values()), f"Row 2 sigil frontPx < 240: {snap_front_px}"

    def save_row_strip(row_idx: int, label_prefix: str, out_name: str):
        rc, rr = 6, 5
        im_s = Image.new("RGBA", (rc * CELL_W, rr * CELL_H), (22, 34, 30, 255))
        dr_s = ImageDraw.Draw(im_s)
        for f in range(30):
            cx = (f % rc) * CELL_W
            cy = (f // rc) * CELL_H
            dr_s.rectangle([cx, cy + CELL_H - 10, cx + CELL_W - 1, cy + CELL_H - 9], fill=(70, 120, 100, 255))
            dr_s.line([(cx + 112, cy), (cx + 112, cy + CELL_H)], fill=(55, 90, 75, 255), width=1)
            im_s.alpha_composite(all_rows_320[row_idx][f], (cx, cy))
            dr_s.rectangle([cx + 4, cy + 4, cx + 66, cy + 20], fill=(0, 0, 0, 200))
            dr_s.text((cx + 8, cy + 6), f"{label_prefix} F{f:02d}", fill=(253, 224, 71, 255))
        out_p = QA_DIR / out_name
        im_s.save(out_p)
        return out_p

    r1_path = save_row_strip(1, "R1", "debug_archer_ex_row1_walk.png")
    r2_path = save_row_strip(2, "R2", "debug_archer_ex_row2.png")
    r4_path = save_row_strip(4, "R4", "debug_archer_ex_row4_flip.png")
    r5_path = save_row_strip(5, "R5", "debug_archer_ex_row5_death.png")

    sample_cols = [0, 3, 9, 14, 17, 21, 25, 28]
    ov_im = Image.new("RGBA", (len(sample_cols) * CELL_W, 10 * CELL_H), (20, 30, 28, 255))
    draw_ov = ImageDraw.Draw(ov_im)
    row_names = ["R0 IDLE", "R1 WALK", "R2 AUTO", "R3 SKILL", "R4 ULT", "R5 DEATH", "R6 DASH", "R7 CROUCH", "R8 JUMP", "R9 VICTORY"]
    for r_idx in range(10):
        for ci, f in enumerate(sample_cols):
            cx = ci * CELL_W
            cy = r_idx * CELL_H
            draw_ov.line([(cx, cy + 230), (cx + CELL_W, cy + 230)], fill=(60, 105, 88, 255), width=1)
            ov_im.alpha_composite(all_rows_320[r_idx][f], (cx, cy))
            draw_ov.rectangle([cx + 4, cy + 4, cx + 108, cy + 20], fill=(0, 0, 0, 200))
            draw_ov.text((cx + 7, cy + 6), f"{row_names[r_idx]} F{f:02d}", fill=(110, 231, 183, 255))
    ov_path = QA_DIR / "debug_archer_ex_10rows.png"
    ov_im.resize((ov_im.width // 2, ov_im.height // 2), Image.Resampling.NEAREST).save(ov_path)

    p_qa = QA_DIR / "debug_archer_ex_portrait.png"
    portrait_128.resize((256, 256), Image.Resampling.NEAREST).save(p_qa)
    print(f"[QA] Saved {r2_path}, {r4_path}, {ov_path}, {p_qa}")


def main():
    print("=== Building SYLVARA EX (archer_ex) Next-Gen 9600x2400 Sheet (Portrait Preserved) ===")
    rigs = load_rigs()
    portrait_128 = Image.open(OUT_PORTRAIT)

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

    import struct
    import zlib
    arr_rgba = np.asarray(sheet, dtype=np.uint8)
    raw_scan = np.hstack([np.zeros((SHEET_H, 1), dtype=np.uint8), arr_rgba.reshape(SHEET_H, SHEET_W * 4)]).tobytes()
    def _png_chunk(tag: bytes, payload: bytes) -> bytes:
        return struct.pack(">I", len(payload)) + tag + payload + struct.pack(">I", zlib.crc32(tag + payload) & 0xFFFFFFFF)
    png_bytes = (
        b"\x89PNG\r\n\x1a\n"
        + _png_chunk(b"IHDR", struct.pack(">IIBBBBB", SHEET_W, SHEET_H, 8, 6, 0, 0, 0))
        + _png_chunk(b"IDAT", zlib.compress(raw_scan, level=3))
        + _png_chunk(b"IEND", b"")
    )
    OUT_SHEET.write_bytes(png_bytes)
    print(f"[OK] Saved sprite sheet: {OUT_SHEET} ({sheet.size[0]}x{sheet.size[1]})")
    verify_and_emit_qa(all_rows_320, portrait_128)


if __name__ == "__main__":
    main()
