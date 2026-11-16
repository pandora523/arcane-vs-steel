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
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SPRITES_DIR = ROOT / "assets" / "sprites"

BASE_REF = SPRITES_DIR / "ronin_ex_base.jpg"
PORTRAIT_REF = SPRITES_DIR / "ronin_ex_portrait_raw.jpg"
KEYPOSES_REF = SPRITES_DIR / "ronin_ex_keyposes_ref.jpg"

OUT_SHEET = SPRITES_DIR / "ronin_ex_sheet.png"
OUT_PORTRAIT = SPRITES_DIR / "ronin_ex_portrait.png"

QA_DIR = Path("/Users/rei/.gemini/antigravity/brain/5416474b-0e5f-4471-85c8-b7a88055e218/scratch")

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

    parts = {
        "hair": extract_part(rgba_base, m_hair, (254.0, 96.0)),
        "head": extract_part(rgba_base, m_head, (278.0, 134.0)),
        "torso": extract_part(rgba_base, m_torso, (276.0, 236.0)),
        "obi": extract_part(rgba_base, m_obi_tassets, (276.0, 248.0)),
        "l_pauldron": extract_part(rgba_base, m_l_pauldron, (226.0, 144.0)),
        "r_pauldron": extract_part(rgba_base, m_r_pauldron, (312.0, 148.0)),
        "l_thigh": extract_part(rgba_base, m_l_thigh, (234.0, 340.0)),
        "l_shin": extract_part(rgba_base, m_l_shin, (206.0, 392.0)),
        "r_thigh": extract_part(rgba_base, m_r_thigh, (302.0, 340.0)),
        "r_shin": extract_part(rgba_base, m_r_shin, (308.0, 392.0)),
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
    2-Bone Analytical IK Samurai Arm (indigo lamellar sode sleeve + cyan-veined kote bracer + gold gauntlet).
    """
    l1, l2 = 10.5, 11.0
    ex, ey = solve_ik_2bone(sx, sy, tx, ty, l1, l2, bend_sign=bend_sign)

    c_dark = C_INDIGO_DARK
    c_mid = C_INDIGO_MID if is_front else C_INK_DEEP
    c_hi = C_VIOLET_RIM if is_front else C_INDIGO_MID

    # Outline pass
    draw_line_px(buf, sx, sy, ex, ey, C_OUTLINE, r=2)
    draw_line_px(buf, ex, ey, tx, ty, C_OUTLINE, r=2)

    # Upper arm sode lamellar sleeve
    draw_line_px(buf, sx, sy, ex, ey, c_dark, r=1)
    draw_line_px(buf, sx, sy - 0.7, ex, ey - 0.7, c_mid, r=0)

    # Forearm kote bracer + cyan lightning vein
    draw_line_px(buf, ex, ey, tx, ty, c_mid, r=1)
    draw_line_px(buf, ex, ey - 0.7, tx, ty - 0.7, c_hi, r=0)
    mx = (ex + tx) * 0.5
    my = (ey + ty) * 0.5
    set_px(buf, int(round(mx)), int(round(my)), C_CYAN_BRIGHT)

    # Elbow & wrist gold tekko guard
    set_px(buf, int(round(ex)), int(round(ey)), C_GOLD_MID)
    gx, gy = int(round(tx)), int(round(ty))
    for oy in range(-1, 2):
        for ox in range(-1, 2):
            set_px(buf, gx + ox, gy + oy, C_OUTLINE)
    set_px(buf, gx, gy, C_GOLD_BRIGHT)
    set_px(buf, gx + 1, gy, C_INDIGO_MID)


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
# 4. HAND-SCULPTED 4-BAND SERRATED RAIJIN LIGHTNING SMEARS
# ==============================================================================

def draw_raijin_crescent_smear_160(
    buf: np.ndarray,
    cx: float,
    cy: float,
    r_outer: float,
    r_inner_base: float,
    deg_start: float,
    deg_end: float,
    tilt_y: float = 0.92,
    intensity: float = 1.0,
    tooth_freq: float = 8.0,
):
    """
    4-Band FFBE / Last Cloudia Battojutsu Lightning-Katana Crescent Smear:
      #ffffff outer razor rim -> #38bdf8 vivid sky-cyan -> #6366f1 storm indigo
      -> #1e1b4b deep night-violet + golden (#fde047 / #f59e0b) lightning sawtooth inner teeth!
    """
    a0 = math.radians(deg_start)
    a1 = math.radians(deg_end)
    if a1 < a0:
        a0, a1 = a1, a0
    span = max(0.08, a1 - a0)

    xmin = max(MARGIN_160, int(math.floor(cx - r_outer - 4)))
    xmax = min(LOG_W - MARGIN_160 - 1, int(math.ceil(cx + r_outer + 4)))
    ymin = max(MARGIN_160, int(math.floor(cy - r_outer * tilt_y - 4)))
    ymax = min(LOG_H - MARGIN_160 - 1, int(math.ceil(cy + r_outer * tilt_y + 4)))

    for py in range(ymin, ymax + 1):
        dy = (py - cy) / max(0.22, tilt_y)
        for px in range(xmin, xmax + 1):
            dx = px - cx
            r = math.hypot(dx, dy)
            if r > r_outer + 1.0 or r < r_inner_base * 0.42:
                continue
            ang = math.atan2(dy, dx)
            while ang < a0 - math.pi:
                ang += 2.0 * math.pi
            while ang > a0 + math.pi:
                ang -= 2.0 * math.pi
            if ang < a0 or ang > a1:
                continue

            u = (ang - a0) / span
            taper = math.sin(min(1.0, max(0.0, u)) * math.pi) ** 0.50
            if u > 0.72:
                taper = max(taper, 0.80 * (1.0 - (u - 0.72) / 0.32))

            # Sharp jagged lightning sawtooth inner cutout
            tri = abs(((u * tooth_freq * 2.0) % 2.0) - 1.0)
            tooth = (tri ** 0.75) * 6.2 * (0.35 + 0.65 * (1.0 - u)) * intensity
            r_in = r_inner_base + (r_outer - r_inner_base) * (1.0 - taper * intensity) + tooth
            if r < r_in:
                continue

            band_w = max(1.5, r_outer - r_in)
            v = (r - r_in) / band_w  # 0.0 = inner serrated tooth, 1.0 = outer razor edge

            if v >= 0.94 or r >= r_outer - 0.55:
                col = C_OUTLINE
            elif v >= 0.77:
                col = C_WHITE
            elif v >= 0.52:
                col = C_CYAN_BRIGHT
            elif v >= 0.28:
                col = C_INDIGO_BRIGHT
            elif v >= 0.14:
                col = C_INDIGO_DARK
            else:
                col = C_GOLD_LIGHT if (tri > 0.52 or int((px + py) * 0.5) % 2 == 0) else C_GOLD_MID

            set_px(buf, px, py, col)

    # Trailing storm-feather streaks & golden lightning arcs across the smear fan
    n_arcs = 5 if intensity >= 0.85 else 3
    for k in range(n_arcs):
        au0 = a0 + span * (0.14 + 0.18 * k)
        au1 = min(a1, au0 + span * 0.22)
        rm = (r_outer * 0.82 + r_inner_base * 0.18) - (k % 2) * 4.5
        mx = cx + math.cos((au0 + au1) * 0.5) * (rm + 2.8)
        my = cy + math.sin((au0 + au1) * 0.5) * (rm + 2.8) * tilt_y
        x0 = cx + math.cos(au0) * rm
        y0 = cy + math.sin(au0) * rm * tilt_y
        x1 = cx + math.cos(au1) * (rm - 2.0)
        y1 = cy + math.sin(au1) * (rm - 2.0) * tilt_y
        lcol = C_GOLD_LIGHT if (k % 2 == 0) else C_WHITE
        draw_line_px(buf, x0, y0, mx, my, lcol, r=0)
        draw_line_px(buf, mx, my, x1, y1, C_CYAN_BRIGHT, r=0)


def draw_raijin_vortex_smear_160(
    buf: np.ndarray,
    cx: float,
    cy: float,
    rx: float,
    ry: float,
    intensity: float = 1.0,
    phase_deg: float = 0.0,
):
    """
    2.5D Perspective-Foreshortened Supersonic Shunpo Horizontal Vortex Smear (Row 2 V2 F17-F18).
    """
    xmin = max(MARGIN_160, int(math.floor(cx - rx * 0.65 - 3)))
    xmax = min(LOG_W - MARGIN_160 - 1, int(math.ceil(cx + rx + 3)))
    ymin = max(MARGIN_160, int(math.floor(cy - ry - 4)))
    ymax = min(LOG_H - MARGIN_160 - 1, int(math.ceil(cy + ry + 4)))
    ph = math.radians(phase_deg)

    for py in range(ymin, ymax + 1):
        ny = (py - cy) / max(1.0, ry)
        for px in range(xmin, xmax + 1):
            nx = (px - cx) / max(1.0, rx if px >= cx else rx * 0.60)
            r = math.hypot(nx, ny)
            if r > 1.03 or r < 0.34:
                continue
            ang = math.atan2(ny, nx) + ph
            front_boost = 0.55 + 0.45 * max(0.0, math.cos(ang))
            saw = abs(((ang * 4.5 / math.pi) % 2.0) - 1.0) * 0.14
            r_in = 0.42 + (1.0 - front_boost * intensity) * 0.34 + saw
            if r < r_in:
                continue
            v = (r - r_in) / max(0.08, 1.0 - r_in)
            if v >= 0.93:
                col = C_OUTLINE
            elif v >= 0.74:
                col = C_WHITE
            elif v >= 0.48:
                col = C_CYAN_BRIGHT
            elif v >= 0.24:
                col = C_INDIGO_BRIGHT
            else:
                col = C_GOLD_LIGHT if saw > 0.07 else C_INDIGO_DARK
            set_px(buf, px, py, col)


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

    # Hand-sculpted 4-band serrated Raijin smears!
    smear = cfg.get("smear")
    if smear:
        kind = smear["kind"]
        if kind == "crescent":
            draw_raijin_crescent_smear_160(
                fg_buf,
                cx=ax + smear.get("cx", 14.0),
                cy=ay + smear.get("cy", -46.0),
                r_outer=smear["r_outer"],
                r_inner_base=smear["r_inner"],
                deg_start=smear["deg_start"],
                deg_end=smear["deg_end"],
                tilt_y=smear.get("tilt_y", 0.90),
                intensity=smear.get("intensity", 1.0),
                tooth_freq=smear.get("tooth_freq", 8.0),
            )
        elif kind == "vortex":
            draw_raijin_vortex_smear_160(
                fg_buf,
                cx=ax + smear.get("cx", 18.0),
                cy=ay + smear.get("cy", -45.0),
                rx=smear["rx"],
                ry=smear["ry"],
                intensity=smear.get("intensity", 1.0),
                phase_deg=smear.get("phase_deg", 0.0),
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


def build_row1_walk(rigs: dict) -> list[Image.Image]:
    """Row 1: Grounded Samurai Suriashi Gliding Stride Cycle (continuous Seigan carry with Row 0)."""
    frames = []
    for f in range(30):
        ph = (f / 30.0) * 2.0 * math.pi
        s = math.sin(ph)
        c = math.cos(ph)
        bob = -abs(c) * 0.85
        frames.append(render_stand_rig_frame(rigs, {
            "phase": ph,
            "sink": bob,
            "torso_lean": 2.2 + 0.65 * math.sin(ph * 2.0),
            "head_nod": -0.3 + 0.35 * math.sin(ph * 2.0),
            "stride_x": s * 2.3,
            "l_hip": -s * 8.5,
            "l_knee": max(0.0, s) * 5.5,
            "r_hip": s * 8.5,
            "r_knee": max(0.0, -s) * 5.5,
            "l_lift": -max(0.0, -s) * 1.1,
            "r_lift": -max(0.0, s) * 1.1,
            "hair_wave": 2.8 + 1.8 * math.sin(ph - 0.5),
            "tassel_lag": 10.0 + 4.5 * math.sin(ph - 0.6),
            "drum_charge": 0.34 + 0.10 * (0.5 + 0.5 * math.sin(ph * 2.0)),
            "sheathed": False,
            "two_handed": False,
            "sword_hx": 13.2 - s * 1.1,
            "sword_hy": -5.2 - bob * 0.4,
            "sword_deg": -22.5 + s * 3.8,
            "sori_sign": -1.0,
            "storm_charge": 0.32 + 0.12 * (0.5 + 0.5 * c),
            "clamp_ground": True,
        }))
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
            # 1-FRAME SNAP: Nukitsuke lightning draw-slash! Front reach x_160 ~ 142 (x_320 = 284 > 260)
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
                    "kind": "crescent",
                    "cx": 15.0,
                    "cy": -44.0,
                    "r_outer": 66.0,
                    "r_inner": 28.0,
                    "deg_start": -42.0,
                    "deg_end": 58.0,
                    "tilt_y": 0.72,
                    "intensity": 1.0,
                    "tooth_freq": 8.0,
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
                    "kind": "crescent",
                    "cx": 15.0,
                    "cy": -45.0,
                    "r_outer": 63.0,
                    "r_inner": 38.0,
                    "deg_start": -38.0,
                    "deg_end": 26.0,
                    "tilt_y": 0.72,
                    "intensity": 0.56,
                    "tooth_freq": 7.0,
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
            # 1-FRAME SNAP: Rising Kiri-age heaven-arc smear! Front reach x_160 ~ 140 (x_320 = 280 > 260)
            frames.append(render_keypose_frame(rigs, "K3_RISE", {
                "dx": 6.0,
                "dy": 0.0,
                "phase": ph,
                "drum_charge": 1.0,
                "sheathed": False,
                "two_handed": True,
                "sword_hx": 16.0,
                "sword_hy": -64.0,
                "sword_deg": -62.0,
                "blade_len": 56.0,
                "sori_sign": 1.0,
                "storm_charge": 1.15,
                "tassel_lag": 34.0,
                "energy": 1.0,
                "smear": {
                    "kind": "crescent",
                    "cx": 12.0,
                    "cy": -50.0,
                    "r_outer": 66.0,
                    "r_inner": 28.0,
                    "deg_start": -74.0,
                    "deg_end": 58.0,
                    "tilt_y": 0.88,
                    "intensity": 1.0,
                    "tooth_freq": 9.0,
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
                "sword_hx": 14.0,
                "sword_hy": -66.0,
                "sword_deg": -72.0,
                "blade_len": 54.0,
                "sori_sign": 1.0,
                "storm_charge": 0.85,
                "tassel_lag": 26.0,
                "energy": 0.75,
                "smear": {
                    "kind": "crescent",
                    "cx": 12.0,
                    "cy": -51.0,
                    "r_outer": 64.0,
                    "r_inner": 40.0,
                    "deg_start": -76.0,
                    "deg_end": -8.0,
                    "tilt_y": 0.88,
                    "intensity": 0.56,
                    "tooth_freq": 8.0,
                },
            }))
        elif f in (11, 12, 13, 14):
            p = (f - 11) / 3.0
            frames.append(render_keypose_frame(rigs, "K3_RISE", {
                "dx": 4.0 * (1.0 - p) - 2.0 * p,
                "dy": 0.0,
                "phase": ph,
                "drum_charge": 0.55 + 0.25 * p,
                "sheathed": False,
                "two_handed": True,
                "sword_hx": 13.0 * (1.0 - p) - 4.0 * p,
                "sword_hy": -64.0 * (1.0 - p) - 46.0 * p,
                "sword_deg": -72.0 * (1.0 - p) - 148.0 * p,
                "blade_len": 52.0,
                "storm_charge": 0.65,
                "tassel_lag": 16.0 - 28.0 * p,
                "energy": 0.55,
            }))

        # ---------------- V2: 2.5D SHUNPO HORIZONTAL VORTEX (F15..F22) ----------------
        elif f in (15, 16):
            p = f - 15
            frames.append(render_keypose_frame(rigs, "K2_LUNGE", {
                "dx": -3.0 - 2.0 * p,
                "dy": 0.0,
                "phase": ph,
                "drum_charge": 0.80 + 0.15 * p,
                "sheathed": False,
                "two_handed": True,
                "sword_hx": -4.0 - 2.0 * p,
                "sword_hy": -46.0,
                "sword_deg": -155.0 - 8.0 * p,
                "blade_len": 48.0,
                "storm_charge": 0.90,
                "tassel_lag": -20.0,
                "energy": 0.75,
            }))
        elif f == 17:
            # 1-FRAME SNAP: 2.5D Supersonic Shunpo Horizontal Vortex (Hit 1 of 2, x_160 ~ 149 -> x_320 = 298 > 260!)
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
                    "kind": "vortex",
                    "cx": 14.0,
                    "cy": -44.0,
                    "rx": 69.0,
                    "ry": 21.0,
                    "intensity": 1.0,
                    "phase_deg": 0.0,
                },
            }))
        elif f == 18:
            # Second counter-whipping horizontal lightning ring (Hit 2 of 2)
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
                    "kind": "vortex",
                    "cx": 13.0,
                    "cy": -46.0,
                    "rx": 64.0,
                    "ry": 18.0,
                    "intensity": 0.72,
                    "phase_deg": 65.0,
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
            # 1-FRAME MONUMENTAL SNAP: Grounded Two-Handed Morote Zantetsuken Full-Reach Crescent!
            # Front reach x_160 = 56 + 12 + 16 + 70 = 154 -> x_320 = 308 (> 260, 0 border clips!)
            frames.append(render_keypose_frame(rigs, "K2_LUNGE", {
                "dx": 12.0,
                "dy": 0.0,  # STRICTLY GROUNDED (0px float!)
                "phase": ph,
                "drum_charge": 1.25,
                "sheathed": False,
                "two_handed": True,
                "sword_hx": 24.0,
                "sword_hy": -43.0,
                "sword_deg": 4.0,
                "blade_len": 60.0,
                "sori_sign": -1.0,
                "storm_charge": 1.40,
                "tassel_lag": 46.0,
                "energy": 1.2,
                "smear": {
                    "kind": "crescent",
                    "cx": 16.0,
                    "cy": -47.0,
                    "r_outer": 70.0,
                    "r_inner": 24.0,
                    "deg_start": -68.0,
                    "deg_end": 56.0,
                    "tilt_y": 0.88,
                    "intensity": 1.05,
                    "tooth_freq": 10.0,
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
                    "kind": "crescent",
                    "cx": 16.0,
                    "cy": -47.0,
                    "r_outer": 68.0 - 3.0 * p,
                    "r_inner": 38.0 + 8.0 * p,
                    "deg_start": -44.0 + 14.0 * p,
                    "deg_end": 54.0,
                    "tilt_y": 0.88,
                    "intensity": 0.65 - 0.25 * p,
                    "tooth_freq": 9.0,
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
                    "kind": "crescent",
                    "cx": 15.0,
                    "cy": -44.0,
                    "r_outer": 65.0,
                    "r_inner": 30.0 + 18.0 * p,
                    "deg_start": -36.0,
                    "deg_end": 44.0,
                    "tilt_y": 0.68,
                    "intensity": max(0.35, 1.0 - 0.65 * p),
                } if f <= 6 else None,
            }))
        elif f <= 16:
            p = (f - 10) / 6.0
            frames.append(render_keypose_frame(rigs, "K3_RISE", {
                "dx": 7.0 - 2.0 * p,
                "dy": -3.0 * math.sin(p * math.pi),
                "phase": ph,
                "drum_charge": 1.0,
                "sheathed": False,
                "two_handed": True,
                "sword_hx": 16.0,
                "sword_hy": -62.0,
                "sword_deg": -56.0 - 10.0 * p,
                "sori_sign": 1.0,
                "storm_charge": 1.15,
                "tassel_lag": 34.0,
                "energy": 1.0,
                "smear": {
                    "kind": "crescent",
                    "cx": 12.0,
                    "cy": -50.0,
                    "r_outer": 64.0,
                    "r_inner": 30.0 + 18.0 * p,
                    "deg_start": -74.0,
                    "deg_end": 48.0,
                    "tilt_y": 0.88,
                    "intensity": max(0.35, 1.0 - 0.65 * p),
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
                    "kind": "crescent",
                    "cx": 12.0,
                    "cy": -42.0,
                    "r_outer": 62.0,
                    "r_inner": 28.0 + 18.0 * p,
                    "deg_start": -55.0,
                    "deg_end": 62.0,
                    "tilt_y": 0.86,
                    "intensity": max(0.35, 1.0 - 0.65 * p),
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
            dy = -9.0 if pose == "K4_LEAP" else 0.0
            deg = (6.0, -58.0, 28.0, -14.0, -46.0)[beat]
            frames.append(render_keypose_frame(rigs, pose, {
                "dx": 8.0 if sub == 0 else 6.0,
                "dy": dy,
                "phase": ph,
                "drum_charge": 1.25,
                "sheathed": False,
                "two_handed": True,
                "sword_hx": 20.0,
                "sword_hy": -46.0 if pose != "K3_RISE" else -62.0,
                "sword_deg": deg,
                "blade_len": 58.0,
                "sori_sign": 1.0 if beat % 2 == 1 else -1.0,
                "storm_charge": 1.35,
                "tassel_lag": 38.0 - sub * 6.0,
                "energy": 1.15,
                "smear": {
                    "kind": "vortex" if beat == 3 else "crescent",
                    "cx": 14.0,
                    "cy": -46.0,
                    "rx": 66.0,
                    "ry": 20.0,
                    "r_outer": 66.0,
                    "r_inner": 28.0 + sub * 12.0,
                    "deg_start": -68.0 if beat % 2 == 0 else -80.0,
                    "deg_end": 54.0,
                    "tilt_y": 0.86,
                    "intensity": 1.0 if sub == 0 else 0.55,
                    "phase_deg": beat * 45.0,
                } if sub <= 1 else None,
            }))
        elif f <= 25:
            # Towering Susanoo Heaven-Splitting Kiri-oroshi Cleave!
            p = (f - 20) / 5.0
            frames.append(render_keypose_frame(rigs, "K2_LUNGE", {
                "dx": 11.0 - 2.0 * p,
                "dy": 0.0,
                "phase": ph,
                "drum_charge": 1.35 - 0.25 * p,
                "sheathed": False,
                "two_handed": True,
                "sword_hx": 24.0,
                "sword_hy": -42.0,
                "sword_deg": 10.0 + 6.0 * p,
                "blade_len": 60.0,
                "storm_charge": 1.45 - 0.30 * p,
                "tassel_lag": 44.0 * (1.0 - 0.4 * p),
                "energy": 1.25,
                "smear": {
                    "kind": "crescent",
                    "cx": 16.0,
                    "cy": -48.0,
                    "r_outer": 70.0,
                    "r_inner": 22.0 + 24.0 * p,
                    "deg_start": -78.0,
                    "deg_end": 58.0,
                    "tilt_y": 0.92,
                    "intensity": max(0.30, 1.05 - 0.65 * p),
                    "tooth_freq": 10.0,
                } if f <= 23 else None,
            }))
        else:
            p = (f - 26) / 3.0
            frames.append(render_stand_rig_frame(rigs, {
                "phase": ph,
                "torso_lean": 2.0 * (1.0 - p),
                "hair_wave": 5.0 * (1.0 - p),
                "tassel_lag": 14.0 * (1.0 - p),
                "drum_charge": 1.0 - 0.40 * p,
                "sheathed": True,
                "koiguchi_spark": 1.30 if f == 27 else 0.45,
                "energy": 0.70,
            }))
    return frames


def build_row5_hurt_death(rigs: dict) -> list[Image.Image]:
    """
    Row 5: F00..F05 HURT stagger recoil, F06..F15 kneeling collapse, F16..F29 grounded fall.
    """
    frames = []
    for f in range(30):
        ph = (f / 30.0) * 2.0 * math.pi
        if f <= 5:
            p = math.sin(((f + 1) / 6.0) * math.pi)
            frames.append(render_stand_rig_frame(rigs, {
                "dx": -5.0 * p,
                "phase": ph,
                "sink": 2.5 * p,
                "torso_lean": -14.0 * p,
                "head_nod": -8.0 * p,
                "l_hip": 10.0 * p,
                "r_hip": -12.0 * p,
                "hair_wave": -10.0 * p,
                "tassel_lag": -24.0 * p,
                "drum_charge": 0.15,
                "sheathed": False,
                "two_handed": False,
                "sword_hx": 9.0 - 4.0 * p,
                "sword_hy": -8.0 - 4.0 * p,
                "sword_deg": -48.0 - 18.0 * p,
                "storm_charge": 0.10,
            }))
        elif f <= 15:
            p = (f - 6) / 9.0
            frames.append(render_keypose_frame(rigs, "K1_COIL", {
                "dx": -5.0 - 4.0 * p,
                "dy": 4.0 * p,
                "body_deg": -18.0 * p,
                "sy": 1.0 - 0.14 * p,
                "show_drums": f <= 11,
                "phase": ph,
                "drum_charge": max(0.0, 0.20 * (1.0 - p)),
                "sheathed": False,
                "draw_sword": True,
                "sword_hx": 14.0 + 4.0 * p,
                "sword_hy": -28.0 + 18.0 * p,
                "sword_deg": 48.0 + 32.0 * p,
                "blade_len": 48.0,
                "storm_charge": 0.05,
                "tassel_lag": -18.0,
                "energy": 0.0,
            }))
        else:
            p = (f - 16) / 13.0
            ang = -66.0 - 22.0 * min(1.0, p * 1.35)  # settles horizontally at -88 deg on floor
            canvas = Image.new("RGBA", (LOG_W, LOG_H), (0, 0, 0, 0))
            paste_keypose_160(
                canvas,
                rigs["K4_LEAP"],
                ANCHOR_X_160 + 18.0 + 1.5 * math.sin(p * math.pi),
                ANCHOR_Y_120 - 15.0,
                angle_deg=ang,
                sx=0.94,
                sy=0.90,
            )
            fg_buf = np.zeros((LOG_H, LOG_W, 4), dtype=np.uint8)
            # Fallen Raijin Odachi resting on the ground beside Kaze-Maru
            draw_raijin_odachi_160(
                fg_buf,
                hilt_x=ANCHOR_X_160 + 8.0 + p * 0.8,
                hilt_y=ANCHOR_Y_120 - 4.0,
                angle_deg=-2.0 + p * 1.2,
                blade_len=52.0,
                storm_charge=0.05 if f % 2 == 0 else 0.0,
            )
            # Subtle fading storm ember so every death frame remains distinct (29/29 transitions)
            ex = int(round(ANCHOR_X_160 - 8.0 + (f - 16) * 2.2))
            ey = int(round(ANCHOR_Y_120 - 18.0 - (f - 16) * 0.7))
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
                    "kind": "crescent",
                    "cx": 15.0,
                    "cy": -44.0,
                    "r_outer": 67.0,
                    "r_inner": 26.0,
                    "deg_start": -48.0,
                    "deg_end": 54.0,
                    "tilt_y": 0.78,
                    "intensity": 1.0,
                    "tooth_freq": 9.0,
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
                    "kind": "crescent",
                    "cx": 15.0,
                    "cy": -44.0,
                    "r_outer": 64.0,
                    "r_inner": 40.0,
                    "deg_start": -40.0,
                    "deg_end": 30.0,
                    "tilt_y": 0.78,
                    "intensity": 0.50,
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
                # Swallow Cut 1: Downward crescent
                deg = 22.0
                smear = {
                    "kind": "crescent",
                    "cx": 12.0,
                    "cy": -42.0,
                    "r_outer": 62.0,
                    "r_inner": 28.0 if f == 11 else 40.0,
                    "deg_start": -66.0,
                    "deg_end": 54.0,
                    "tilt_y": 0.88,
                    "intensity": 1.0 if f == 11 else 0.55,
                }
            elif f in (15, 16):
                # Swallow Cut 2: Instant upward swallow-reversal arc!
                deg = -52.0
                smear = {
                    "kind": "crescent",
                    "cx": 13.0,
                    "cy": -45.0,
                    "r_outer": 63.0,
                    "r_inner": 28.0 if f == 15 else 40.0,
                    "deg_start": -72.0,
                    "deg_end": 48.0,
                    "tilt_y": 0.84,
                    "intensity": 1.0 if f == 15 else 0.55,
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
                    "smear": {
                        "kind": "crescent",
                        "cx": 12.0,
                        "cy": -46.0,
                        "r_outer": 60.0,
                        "r_inner": 36.0,
                        "deg_start": -44.0,
                        "deg_end": 34.0,
                        "tilt_y": 0.84,
                        "intensity": 0.65,
                    } if f == 3 else None,
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


def verify_and_emit_qa(all_rows_320: list[list[Image.Image]], portrait_128: Image.Image):
    QA_DIR.mkdir(parents=True, exist_ok=True)
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

    # Check Row 2 snap smear front reach (x_320 > 260 on F03, F09, F17, F25)
    snap_reaches = {}
    for sf in (3, 9, 17, 25):
        arr = np.array(all_rows_320[2][sf], dtype=np.uint8)
        ys, xs = np.where(arr[:, :, 3] > 0)
        snap_reaches[sf] = int(xs.max()) if len(xs) else 0

    print(f"[QA] border_clips={border_clips}/300 | non_binary_alpha={non_binary_alpha} | non_2x2_blocks={non_2x2_blocks}")
    print(f"[QA] row_transitions={row_transitions}")
    print(f"[QA] Row 2 snap front reaches (must be > 260): {snap_reaches}")

    assert border_clips == 0, f"Border clip failure: {border_clips}"
    assert non_binary_alpha == 0, f"Non-binary alpha cells: {non_binary_alpha}"
    assert non_2x2_blocks == 0, f"2x2 block purity failure: {non_2x2_blocks}"
    assert all(t == 29 for t in row_transitions), f"Transition failure: {row_transitions}"
    assert all(rx > 260 for rx in snap_reaches.values()), f"Smear reach < 260: {snap_reaches}"

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

    # Emit Row 2 30-frame contact sheet on neutral slate + white split check
    r2_cols = 6
    r2_rows = 5
    r2_im = Image.new("RGBA", (r2_cols * CELL_W, r2_rows * CELL_H), (28, 32, 48, 255))
    draw_r2 = ImageDraw.Draw(r2_im)
    for f in range(30):
        cx = (f % r2_cols) * CELL_W
        cy = (f // r2_cols) * CELL_H
        # Right strip in light gray to catch dark/white halo issues simultaneously
        draw_r2.rectangle([cx, cy + CELL_H - 10, cx + CELL_W - 1, cy + CELL_H - 9], fill=(90, 110, 150, 255))
        draw_r2.line([(cx + 112, cy), (cx + 112, cy + CELL_H)], fill=(65, 75, 105, 255), width=1)
        r2_im.alpha_composite(all_rows_320[2][f], (cx, cy))
        draw_r2.rectangle([cx + 4, cy + 4, cx + 66, cy + 20], fill=(0, 0, 0, 200))
        draw_r2.text((cx + 8, cy + 6), f"R2 F{f:02d}", fill=(250, 224, 90, 255))
    r2_path = QA_DIR / "debug_ronin_ex_row2.png"
    r2_im.save(r2_path)

    # Emit 10-row keyframe overview sheet (8 representative columns per row)
    sample_cols = [0, 3, 9, 14, 17, 21, 25, 28]
    ov_im = Image.new("RGBA", (len(sample_cols) * CELL_W, 10 * CELL_H), (24, 28, 42, 255))
    draw_ov = ImageDraw.Draw(ov_im)
    row_names = ["R0 IDLE", "R1 WALK", "R2 AUTO", "R3 SKILL", "R4 ULT", "R5 DEATH", "R6 DASH", "R7 CROUCH", "R8 JUMP", "R9 VICTORY"]
    for r_idx in range(10):
        for ci, f in enumerate(sample_cols):
            cx = ci * CELL_W
            cy = r_idx * CELL_H
            draw_ov.line([(cx, cy + 230), (cx + CELL_W, cy + 230)], fill=(70, 85, 120, 255), width=1)
            ov_im.alpha_composite(all_rows_320[r_idx][f], (cx, cy))
            draw_ov.rectangle([cx + 4, cy + 4, cx + 108, cy + 20], fill=(0, 0, 0, 200))
            draw_ov.text((cx + 7, cy + 6), f"{row_names[r_idx]} F{f:02d}", fill=(125, 211, 252, 255))
    ov_path = QA_DIR / "debug_ronin_ex_10rows.png"
    ov_im.resize((ov_im.width // 2, ov_im.height // 2), Image.Resampling.NEAREST).save(ov_path)

    p_qa = QA_DIR / "debug_ronin_ex_portrait.png"
    portrait_128.resize((256, 256), Image.Resampling.NEAREST).save(p_qa)
    print(f"[QA] Saved {r2_path}, {ov_path}, {p_qa}")


def main():
    print("=== Building KAZE-MARU EX (ronin_ex) Next-Gen 9600x2400 Sheet ===")
    rigs = load_rigs()
    portrait_128 = Image.open(OUT_PORTRAIT).convert("RGBA") if OUT_PORTRAIT.exists() else build_portrait_128()

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
    verify_and_emit_qa(all_rows_320, portrait_128)


if __name__ == "__main__":
    main()
