#!/usr/bin/env python3
"""
Next-Gen 30fps Wide-Canvas (320x240) Sprite Sheet & Portrait Builder for
FREYJA EX (`valkyrie_ex` -> `ValkyrieEx`).

Architecture (FFBE / Last Cloudia Next-Gen Pipeline):
  1. Multi-Keypose Full-Body Base Switching (`STAND`, `K1_COIL`, `K2_LUNGE`, `K3_RISE`, `K4_LEAP`)
     from `assets/sprites/valkyrie_ex_base.jpg` + `assets/sprites/valkyrie_ex_keyposes_ref.jpg`,
     with strict pure-white enclosed-pocket floodfill (preserving rose-platinum hair & silver armor!)
     and AI open-hand/arm stripping (`0` white halos, `0` extra hands).
  2. Bespoke Pixel-Art Attachments on `160x120` logical canvas (`2x NEAREST` -> `320x240`):
     - **6-Pinion Crimson-Gold Feathered Dragon/Valkyrie Wings** (`poised` swept battle-wings +
       `sovereign` wide twin-wing spread on `Row 4`, `Row 2 V3`, `Row 3`, `Row 9`)
     - Flowing **Rose-Platinum Valkyrie Hair Plume** (30fps secondary motion)
     - 2-Bone IK **Crimson-Gold Winged Gungnir War-Lance** (`62` logical px / `124px` world polearm)
  3. 1-Frame Pose Snap + 4-Band Serrated Crimson-Gold Gungnir Smears on `Row 2 AUTO_ATTACK`:
     - `V0 (F03)`: 1-frame snap wide Gungnir halberd crescent cleave (`#ffffff -> #fef08a -> #fb7185 -> #be123c`)
     - `V1 (F09)`: 1-frame snap reverse rising Dragon-Fang lance sweep
     - `V2 (F17..F18)`: Supersonic multi-thrust Mach-cone (`F17`) + 2.5D crimson-gold vortex (`F18`)
     - `V3 (F23..F25)`: High Valkyrie winged leap (`F24`) -> steep plunging Gungnir crescent slam (`F25`)
  4. Articulated `-360 deg` Valkyrie Aerial Backflip on `Row 7` (`0` runtime `ctx.rotate`!) &
     exact `Row 4` frame alignment (`120..149`) for `TWILIGHT OF RAGNAROK: GUNGNIR`.

Outputs:
  - `assets/sprites/valkyrie_ex_sheet.png` (`9600x2400`, `10x30 @ 320x240`, `anchorX=112, anchorY=230`)
  - `assets/sprites/valkyrie_ex_portrait.png` (`128x128`, frameless 16-bit HD-2D bust)
  - Untracked visual QA contact sheets in `<brain>/scratch/debug_valkyrie_ex_*.png`
"""

from collections import deque
import math
from pathlib import Path
import sys
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ex_sprite_clean_utils import clean_512_pose_holes_and_specks, seal_160_char_pinholes_and_leaks

REPO_ROOT = Path(__file__).resolve().parent.parent
SPRITES_DIR = REPO_ROOT / "assets" / "sprites"
SCRATCH_DIR = Path("/Users/rei/.gemini/antigravity/brain/5416474b-0e5f-4471-85c8-b7a88055e218/scratch")

BASE_JPG = SPRITES_DIR / "valkyrie_ex_base.jpg"
KEYPOSES_JPG = SPRITES_DIR / "valkyrie_ex_keyposes_ref.jpg"
PORTRAIT_RAW_JPG = SPRITES_DIR / "valkyrie_ex_portrait_raw.jpg"

OUT_SHEET = SPRITES_DIR / "valkyrie_ex_sheet.png"
OUT_PORTRAIT = SPRITES_DIR / "valkyrie_ex_portrait.png"

LW, LH = 160, 120
CELL_W, CELL_H = 320, 240
AX, AY = 56, 115  # 2x -> anchorX = 112, anchorY = 230
COLS = 30
ROWS = 10
SHEET_W = CELL_W * COLS
SHEET_H = CELL_H * ROWS

OUTLINE = (10, 6, 16, 255)

# Valkyrie Crimson, Gold & Rose-Platinum Palettes
CRIMSON_DARK = (76, 5, 25, 255)
CRIMSON_DEEP = (136, 19, 55, 255)
CRIMSON_MID = (190, 18, 60, 255)
CRIMSON_ROSE = (251, 113, 133, 255)

GOLD_DARK = (120, 53, 15, 255)
GOLD_MID = (217, 119, 6, 255)
GOLD_BRIGHT = (250, 204, 21, 255)
GOLD_SPEC = (254, 240, 138, 255)
PURE_WHITE = (255, 255, 255, 255)

SKIN_LIGHT = (246, 204, 178, 255)
SKIN_MID = (224, 168, 144, 255)
SKIN_SHAD = (176, 118, 98, 255)

HAIR_DARK = (118, 62, 78, 255)
HAIR_MID = (196, 134, 150, 255)
HAIR_BRIGHT = (242, 208, 216, 255)


# ==============================================================================
# 1. Background Removal (Strict Pure-White Pocket Threshold Preserving Rose Hair!)
# ==============================================================================
def defringe_and_remove_bg_512(
    img_rgb: Image.Image,
    pocket_seeds=(),
    strip_polys=(),
    skin_cleanup_boxes=(),
    fill_rgba=(108, 26, 42, 255),
) -> np.ndarray:
    arr = np.array(img_rgb.convert("RGBA"), dtype=np.uint8)
    h, w, _ = arr.shape
    rgb = arr[:, :, :3].astype(np.int16)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    sat = mx - mn

    # Outer background floodfill: neutral white/near-white (`sat <= 16` or very bright `>=242` with `sat <= 22`)
    # Note: Rose-pink hair has `r >= 245, g ~ 225..232` (`r - g >= 14`), so `sat <= 12` protects 100% of hair!
    outer_white = ((r >= 232) & (g >= 232) & (b >= 232) & (sat <= 14)) | (
        (r >= 246) & (g >= 246) & (b >= 246) & (sat <= 20)
    )

    bg = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if outer_white[y, x] and not bg[y, x]:
                bg[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if outer_white[y, x] and not bg[y, x]:
                bg[y, x] = True
                q.append((y, x))

    while q:
        cy, cx = q.popleft()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and not bg[ny, nx] and outer_white[ny, nx]:
                bg[ny, nx] = True
                q.append((ny, nx))

    # Strict pure-white floodfill for verified enclosed background pockets (`sat <= 10`, `mn >= 244`)
    pocket_white = (mn >= 244) & (sat <= 10)
    pq = deque()
    for sx, sy in pocket_seeds:
        if 0 <= sx < w and 0 <= sy < h and not bg[sy, sx] and pocket_white[sy, sx]:
            bg[sy, sx] = True
            pq.append((sy, sx))
    while pq:
        cy, cx = pq.popleft()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and not bg[ny, nx] and pocket_white[ny, nx]:
                bg[ny, nx] = True
                pq.append((ny, nx))

    # Neutral bright JPEG halo strip adjacent to background (`sat <= 24`, `mn >= 205`)
    for _ in range(2):
        adj = np.zeros((h, w), dtype=bool)
        adj[1:, :] |= bg[:-1, :]
        adj[:-1, :] |= bg[1:, :]
        adj[:, 1:] |= bg[:, :-1]
        adj[:, :-1] |= bg[:, 1:]
        fringe = adj & (~bg) & (mn >= 205) & (sat <= 24)
        if not fringe.any():
            break
        bg |= fringe

    arr[bg, 3] = 0

    if strip_polys:
        mask_im = Image.new("L", (w, h), 0)
        mdraw = ImageDraw.Draw(mask_im)
        for poly in strip_polys:
            mdraw.polygon(poly, fill=255)
        smask = np.array(mask_im) > 128
        arr[smask, 3] = 0

    for x0, y0, x1, y1, box_rgba in skin_cleanup_boxes:
        sub = arr[y0:y1, x0:x1]
        sr = sub[:, :, 0].astype(np.int16)
        sg = sub[:, :, 1].astype(np.int16)
        sb = sub[:, :, 2].astype(np.int16)
        sa = sub[:, :, 3]
        # Warm peach skin (`sr > sg > sb`, `sr - sb >= 38`, `sg - sb >= 14`) vs rose hair (`sb >= sg`)
        is_peach = (sa > 0) & (sr >= 150) & ((sr - sb) >= 38) & ((sg - sb) >= 12)
        sub[is_peach, 0] = box_rgba[0]
        sub[is_peach, 1] = box_rgba[1]
        sub[is_peach, 2] = box_rgba[2]
        sub[is_peach, 3] = box_rgba[3]

    alpha = arr[:, :, 3] > 0
    trans = ~alpha
    edge = alpha & (
        np.pad(trans[1:, :], ((0, 1), (0, 0)), constant_values=True)
        | np.pad(trans[:-1, :], ((1, 0), (0, 0)), constant_values=True)
        | np.pad(trans[:, 1:], ((0, 0), (0, 1)), constant_values=True)
        | np.pad(trans[:, :-1], ((0, 0), (1, 0)), constant_values=True)
    )
    bright_edge = edge & (mn >= 185) & (sat <= 26)
    arr[bright_edge, 0] = 20
    arr[bright_edge, 1] = 10
    arr[bright_edge, 2] = 18
    arr[bright_edge, 3] = 255
    return clean_512_pose_holes_and_specks(arr, max_hole_area=220, min_island_area=36)


def extract_poly_512(src_rgba: np.ndarray, poly):
    h, w, _ = src_rgba.shape
    mask_im = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask_im).polygon(poly, fill=255)
    mask = np.array(mask_im) > 128
    out = np.zeros_like(src_rgba)
    keep = mask & (src_rgba[:, :, 3] > 0)
    out[keep] = src_rgba[keep]
    return out


# ==============================================================================
# 2. Load Segmented STAND Rig + 4 Action Keyposes (`K1_COIL..K4_LEAP`)
# ==============================================================================
class PartSprite:
    def __init__(self, name: str, rgba_logical: np.ndarray, pivot_x: float, pivot_y: float):
        self.name = name
        self.rgba = rgba_logical
        self.im = Image.fromarray(rgba_logical, mode="RGBA")
        self.pivot_x = pivot_x
        self.pivot_y = pivot_y


def load_stand_and_keyposes():
    base_rgb = Image.open(BASE_JPG).convert("RGB").resize((512, 512), Image.Resampling.LANCZOS)
    stand_512 = defringe_and_remove_bg_512(
        base_rgb,
        pocket_seeds=[(144, 158), (298, 235), (196, 258), (277, 176)],
        strip_polys=[
            # Strip extended right-side empty arm outside shoulder pauldron
            [(306, 152), (398, 152), (398, 228), (306, 228)],
        ],
        skin_cleanup_boxes=[
            (180, 184, 226, 224, (112, 34, 50, 255)),
        ],
    )

    ys, xs = np.where(stand_512[:, :, 3] > 0)
    stand_top, stand_bot = int(ys.min()), int(ys.max())
    stand_h_512 = stand_bot - stand_top + 1  # ~454
    target_stand_h = 87.0
    scale = target_stand_h / stand_h_512
    stand_cx_512 = 256.0

    def to_logical_coords(x512, y512):
        lx = AX + (x512 - stand_cx_512) * scale
        ly = AY - (stand_bot - y512) * scale
        return lx, ly

    part_specs = {
        "back_hair": (
            [(114, 102), (236, 102), (232, 286), (114, 286)],
            (226, 134),
        ),
        "back_leg": (
            [(264, 266), (344, 266), (364, 396), (276, 396)],
            (290, 282),
        ),
        "back_foot": (
            [(298, 386), (384, 386), (388, 492), (298, 492)],
            (324, 398),
        ),
        "pelvis": (
            [(182, 232), (336, 232), (344, 346), (174, 346)],
            (256, 254),
        ),
        "front_leg": (
            [(168, 268), (248, 268), (232, 396), (162, 396)],
            (218, 284),
        ),
        "front_foot": (
            [(146, 386), (226, 386), (222, 488), (142, 488)],
            (194, 396),
        ),
        "torso": (
            [(202, 142), (314, 142), (308, 252), (206, 252)],
            (256, 228),
        ),
        "head": (
            [(182, 32), (314, 32), (314, 154), (218, 154), (182, 112)],
            (258, 138),
        ),
        "front_pauldron": (
            [(198, 142), (244, 142), (244, 188), (198, 188)],
            (222, 160),
        ),
    }

    stand_parts = {}
    lw_512 = max(1, int(round(512 * scale)))
    lh_512 = max(1, int(round(512 * scale)))

    for name, (poly, piv512) in part_specs.items():
        p512 = extract_poly_512(stand_512, poly)
        im_scaled = Image.fromarray(p512, mode="RGBA").resize((lw_512, lh_512), Image.Resampling.LANCZOS)
        arr = np.array(im_scaled, dtype=np.uint8)
        arr[:, :, 3] = np.where(arr[:, :, 3] >= 118, 255, 0)

        canvas = np.zeros((LH, LW, 4), dtype=np.uint8)
        ox = int(round(AX - stand_cx_512 * scale))
        oy = int(round(AY - stand_bot * scale))
        for sy in range(lh_512):
            dy = oy + sy
            if not (0 <= dy < LH):
                continue
            for sx in range(lw_512):
                dx = ox + sx
                if not (0 <= dx < LW):
                    continue
                if arr[sy, sx, 3] > 0:
                    canvas[dy, dx] = arr[sy, sx]

        px, py = to_logical_coords(*piv512)
        stand_parts[name] = PartSprite(name, canvas, px, py)

    for leg_nm in ("back_leg", "back_foot"):
        src_p = stand_parts[leg_nm]
        dark_c = src_p.rgba.copy().astype(np.float32)
        m_a = dark_c[:, :, 3] > 0
        dark_c[m_a, :3] = np.clip(dark_c[m_a, :3] * 0.84, 0, 255)
        stand_parts[f"{leg_nm}_dark"] = PartSprite(f"{leg_nm}_dark", dark_c.astype(np.uint8), src_p.pivot_x, src_p.pivot_y)

    kp_sheet = Image.open(KEYPOSES_JPG).convert("RGB")
    kp_configs = {
        "K1_COIL": {
            "crop": (0, 0, 512, 512),
            "pockets": [(135, 123)],
            "strip": [
                [(314, 160), (380, 160), (380, 218), (314, 218)],
            ],
            "skin_boxes": [
                (172, 200, 216, 248, (158, 98, 114, 255)),
            ],
            "x_ref": 285.0,
            "y_bot": 481.0,
            "sh_front": (244, 166),
            "sh_back": (308, 168),
            "wing_anchor": (262, 172),
            "hair_anchor": (236, 138),
        },
        "K2_LUNGE": {
            "crop": (512, 0, 1024, 512),
            "pockets": [(135, 224)],
            "strip": [
                [(326, 228), (378, 228), (378, 290), (326, 290)],
            ],
            "skin_boxes": [
                (208, 246, 256, 294, (112, 26, 42, 255)),
            ],
            "x_ref": 248.0,
            "y_bot": 491.0,
            "sh_front": (244, 206),
            "sh_back": (306, 214),
            "wing_anchor": (252, 212),
            "hair_anchor": (228, 174),
        },
        "K3_RISE": {
            "crop": (0, 512, 512, 1024),
            "pockets": [(144, 135)],
            "strip": [
                [(318, 142), (442, 142), (442, 244), (318, 244)],
            ],
            "skin_boxes": [
                (194, 198, 236, 240, (112, 30, 46, 255)),
            ],
            "x_ref": 258.0,
            "y_bot": 496.0,
            "sh_front": (232, 168),
            "sh_back": (308, 168),
            "wing_anchor": (264, 174),
            "hair_anchor": (228, 132),
        },
        "K4_LEAP": {
            "crop": (512, 512, 1024, 1024),
            "pockets": [(250, 324)],
            "strip": [
                [(70, 150), (272, 146), (276, 194), (210, 236), (70, 236)],
            ],
            "skin_boxes": [],
            "x_ref": 285.0,
            "y_bot": 481.0,
            "sh_front": (294, 166),
            "sh_back": (342, 174),
            "wing_anchor": (292, 172),
            "hair_anchor": (282, 118),
        },
    }

    keyposes = {}
    for kname, cfg in kp_configs.items():
        tile = kp_sheet.crop(cfg["crop"])
        clean512 = defringe_and_remove_bg_512(
            tile,
            pocket_seeds=cfg["pockets"],
            strip_polys=cfg["strip"],
            skin_cleanup_boxes=cfg["skin_boxes"],
        )
        im_scaled = Image.fromarray(clean512, mode="RGBA").resize((lw_512, lh_512), Image.Resampling.LANCZOS)
        arr = np.array(im_scaled, dtype=np.uint8)
        arr[:, :, 3] = np.where(arr[:, :, 3] >= 118, 255, 0)

        ox = int(round(AX - cfg["x_ref"] * scale))
        oy = int(round(AY - cfg["y_bot"] * scale))
        canvas = np.zeros((LH, LW, 4), dtype=np.uint8)
        for sy in range(lh_512):
            dy = oy + sy
            if not (0 <= dy < LH):
                continue
            for sx in range(lw_512):
                dx = ox + sx
                if not (0 <= dx < LW):
                    continue
                if arr[sy, sx, 3] > 0:
                    canvas[dy, dx] = arr[sy, sx]

        def map_pt(pt):
            return (
                AX + (pt[0] - cfg["x_ref"]) * scale,
                AY - (cfg["y_bot"] - pt[1]) * scale,
            )

        keyposes[kname] = {
            "im": Image.fromarray(canvas, mode="RGBA"),
            "rgba": canvas,
            "sh_front": map_pt(cfg["sh_front"]),
            "sh_back": map_pt(cfg["sh_back"]),
            "wing_anchor": map_pt(cfg["wing_anchor"]),
            "hair_anchor": map_pt(cfg["hair_anchor"]),
        }

    stand_meta = {
        "sh_front": to_logical_coords(222, 164),
        "sh_back": to_logical_coords(296, 164),
        "wing_anchor": to_logical_coords(254, 168),
        "hair_anchor": to_logical_coords(224, 128),
    }
    return stand_parts, stand_meta, keyposes


# ==============================================================================
# 3. Crisp Pixel-Art Primitives: 6-Pinion Crimson-Gold Wings, Gungnir & Smears
# ==============================================================================
def put_px(canvas: np.ndarray, x: int, y: int, rgba):
    if 0 <= x < LW and 0 <= y < LH:
        canvas[y, x] = rgba


def draw_thick_line(canvas: np.ndarray, x0, y0, x1, y1, r: float, rgba):
    dx = x1 - x0
    dy = y1 - y0
    steps = max(1, int(math.hypot(dx, dy) * 2.5))
    ri = int(math.ceil(r))
    r2 = r * r
    for i in range(steps + 1):
        t = i / steps
        cx = x0 + dx * t
        cy = y0 + dy * t
        ix, iy = int(round(cx)), int(round(cy))
        for oy in range(-ri, ri + 1):
            for ox in range(-ri, ri + 1):
                if ox * ox + oy * oy <= r2 + 0.35:
                    put_px(canvas, ix + ox, iy + oy, rgba)


def outline_layer(layer: np.ndarray, outline_rgba=OUTLINE) -> np.ndarray:
    out = layer.copy()
    a = layer[:, :, 3] > 0
    dil = np.zeros_like(a)
    dil[1:, :] |= a[:-1, :]
    dil[:-1, :] |= a[1:, :]
    dil[:, 1:] |= a[:, :-1]
    dil[:, :-1] |= a[:, 1:]
    ring = dil & (~a)
    out[ring] = outline_rgba
    return out


def composite_np(dst: np.ndarray, src: np.ndarray):
    mask = src[:, :, 3] > 0
    dst[mask] = src[mask]


def transform_part(part: PartSprite, dx=0.0, dy=0.0, rot_deg=0.0, sx=1.0, sy=1.0) -> Image.Image:
    im = part.im
    if abs(sx - 1.0) > 1e-3 or abs(sy - 1.0) > 1e-3:
        nw = max(1, int(round(LW * sx)))
        nh = max(1, int(round(LH * sy)))
        scaled = im.resize((nw, nh), Image.Resampling.NEAREST)
        canvas = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
        ox = int(round(part.pivot_x - part.pivot_x * sx))
        oy = int(round(part.pivot_y - part.pivot_y * sy))
        canvas.paste(scaled, (ox, oy))
        im = canvas
    if abs(rot_deg) > 0.05:
        im = im.rotate(-rot_deg, resample=Image.Resampling.NEAREST, center=(part.pivot_x, part.pivot_y))
    if abs(dx) > 0.05 or abs(dy) > 0.05:
        canvas = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
        canvas.paste(im, (int(round(dx)), int(round(dy))))
        im = canvas
    return im


def draw_valkyrie_wings(
    canvas: np.ndarray,
    wx: float,
    wy: float,
    flap_deg: float = 0.0,
    sovereign: bool = False,
    delta_dive: bool = False,
):
    """
    Majestic Symmetrical Twin 6-Pinion Crimson-Gold Feathered Dragon/Valkyrie Wings behind Freyja EX's torso!
      - Always draws BOTH `-X` (rear) and `+X` (foreshortened front-right) 6-pinion wings on EVERY row.
      - `poised` (`sovereign=False`): 3/4-depth symmetrical battle-wings clearly flanking both shoulders.
      - `sovereign` (`sovereign=True`): Grand full-span twin-wing spread (`Row 4`, `Row 2 V3`, `Row 3`, `Row 9`).
      - `delta_dive` (`delta_dive=True`): Sleek swept-back Delta-V wingfold for supersonic Falcon Dive (`Row 4 F21..F24`).
    """
    layer = np.zeros((LH, LW, 4), dtype=np.uint8)

    for side in (-1, 1):
        if delta_dive:
            arch_len = 20.5
            arch_ang = math.radians((-118.0 - flap_deg * 0.4) if side < 0 else (-62.0 + flap_deg * 0.4))
            pinion_scale = 0.92
        elif sovereign:
            arch_len = 24.5
            arch_ang = math.radians((-136.0 - flap_deg * 0.7) if side < 0 else (-44.0 + flap_deg * 0.7))
            pinion_scale = 1.0
        else:
            arch_len = 19.5 if side < 0 else 17.5
            arch_ang = math.radians((-138.0 - flap_deg * 0.7) if side < 0 else (-38.0 + flap_deg * 0.7))
            pinion_scale = 1.0 if side < 0 else 0.86

        kx = wx + math.cos(arch_ang) * arch_len
        ky = (wy - 3.0) + math.sin(arch_ang) * arch_len
        draw_thick_line(layer, wx, wy - 2.0, kx, ky, 1.65, GOLD_BRIGHT)
        draw_thick_line(layer, wx, wy - 2.5, kx, ky - 0.5, 0.85, GOLD_SPEC)
        put_px(layer, int(round(kx)), int(round(ky)), PURE_WHITE)

        # 6 Bold Feathered Pinions radiating from the golden Valkyrie wing-arch
        pinion_specs = [
            (1.00, (27.5 if sovereign else 22.0) * pinion_scale, -14.0),
            (0.86, (25.0 if sovereign else 20.0) * pinion_scale, 0.0),
            (0.72, (22.5 if sovereign else 18.0) * pinion_scale, 14.0),
            (0.58, (19.5 if sovereign else 15.5) * pinion_scale, 28.0),
            (0.44, (16.5 if sovereign else 13.0) * pinion_scale, 42.0),
            (0.30, (13.5 if sovereign else 10.5) * pinion_scale, 56.0),
        ]
        for t_arch, plen, rel_deg in pinion_specs:
            bx = wx + (kx - wx) * t_arch
            by = (wy - 2.5) + (ky - (wy - 2.5)) * t_arch
            if delta_dive:
                base_deg = (-116.0 + rel_deg * 0.45) if side < 0 else (-64.0 - rel_deg * 0.45)
            else:
                base_deg = (-166.0 - flap_deg * 0.9 + rel_deg) if side < 0 else (-14.0 + flap_deg * 0.9 - rel_deg)
            rad = math.radians(base_deg)
            ux, uy = math.cos(rad), math.sin(rad)
            nx, ny = -uy, ux

            steps = int(max(16, plen * 2.1))
            for i in range(steps + 1):
                u = i / steps
                px = bx + ux * (u * plen)
                py = by + uy * (u * plen)
                hw = 1.75 * (1.0 - 0.72 * (u ** 1.6))
                for s in np.linspace(-hw, hw, 5):
                    if u > 0.82:
                        col = PURE_WHITE if (sovereign and u > 0.92) else (GOLD_SPEC if sovereign else GOLD_BRIGHT)
                    elif u > 0.54:
                        col = CRIMSON_ROSE
                    elif u > 0.22:
                        col = CRIMSON_MID
                    else:
                        col = CRIMSON_DEEP
                    put_px(layer, int(round(px + nx * s)), int(round(py + ny * s)), col)

    layer = outline_layer(layer, OUTLINE)
    composite_np(canvas, layer)


def draw_valkyrie_hair_waves(canvas: np.ndarray, hx: float, hy: float, phase: float, billow: float = 1.0):
    """Secondary 30fps flowing rose-platinum hair locks behind shoulders."""
    layer = np.zeros((LH, LW, 4), dtype=np.uint8)
    for strand in range(2):
        steps = 30
        length = 16.0 + strand * 3.0 + billow * 2.0
        for i in range(steps + 1):
            u = i / steps
            wave = math.sin(phase - u * 3.1 + strand * 1.1) * (1.6 + 1.5 * billow) * u
            px = hx - u * length
            py = hy + strand * 3.2 + u * 7.0 + wave
            r = max(0.85, 2.0 * (1.0 - 0.55 * u))
            col = HAIR_BRIGHT if u < 0.45 else (HAIR_MID if u < 0.8 else HAIR_DARK)
            draw_thick_line(layer, px, py, px - 0.6, py + 0.3, r, col)
    layer = outline_layer(layer, OUTLINE)
    composite_np(canvas, layer)


def solve_2bone_ik(sx, sy, tx, ty, l1, l2, bend_sign=1.0):
    dx, dy = tx - sx, ty - sy
    d = max(1.0, min(l1 + l2 - 0.25, math.hypot(dx, dy)))
    ux, uy = dx / max(1e-5, math.hypot(dx, dy)), dy / max(1e-5, math.hypot(dx, dy))
    cos_a = max(-1.0, min(1.0, (l1 * l1 + d * d - l2 * l2) / (2.0 * l1 * d)))
    ang_a = math.acos(cos_a) * bend_sign
    ca, sa = math.cos(ang_a), math.sin(ang_a)
    ex = sx + (ux * ca - uy * sa) * l1
    ey = sy + (ux * sa + uy * ca) * l1
    hx = sx + ux * d
    hy = sy + uy * d
    return (ex, ey), (hx, hy)


def draw_sculpted_valkyrie_hand(
    layer: np.ndarray,
    hx: float,
    hy: float,
    dir_x: float,
    dir_y: float,
    is_back: bool = False,
    role: str = "lance_grip",
):
    """
    Pixel-by-pixel sculpted Valkyrie crimson-gold half-gauntlet hand & 3 fingers
    (0 round 5x5 circle blobs, 0 sausage tubes).
    """
    d_len = math.hypot(dir_x, dir_y) or 1.0
    ux, uy = dir_x / d_len, dir_y / d_len
    nx, ny = -uy, ux
    if ny > 0.35:
        nx, ny = -nx, -ny

    trim = GOLD_MID if is_back else GOLD_BRIGHT
    knuckle = GOLD_BRIGHT if is_back else GOLD_SPEC
    plate = CRIMSON_DEEP if is_back else CRIMSON_MID
    sk_hi = SKIN_MID if is_back else SKIN_LIGHT
    sk_lo = SKIN_SHAD if is_back else SKIN_MID

    if role == "open":
        pts = [
            (-1.1, -0.5, trim),
            (-1.1,  0.4, plate),
            (-0.3, -1.2, sk_hi),   # open thumb
            (-0.3,  0.0, trim),
            ( 0.6, -0.8, sk_hi),   # index finger
            ( 0.7,  0.0, sk_hi),   # middle finger
            ( 0.5,  0.8, sk_lo),   # ring finger
            ( 1.4, -0.7, sk_hi),
            ( 1.5,  0.0, sk_lo),
        ]
    else:
        pts = [
            (-1.2, -0.5, trim),
            (-1.2,  0.4, trim),
            (-0.4, -1.3, sk_hi),   # opposed thumb along upper Gungnir shaft
            (-0.4,  0.0, knuckle), # gold Valkyrie knuckle dorsal plate
            ( 0.5, -0.9, sk_hi),   # index finger curling over war-lance
            ( 0.5,  0.0, sk_hi),   # middle finger
            ( 0.5,  0.9, sk_lo),   # ring finger
            ( 1.1, -0.5, sk_lo),
            ( 1.1,  0.3, sk_lo),
        ]
    for ou, ov, col in pts:
        put_px(layer, int(round(hx + ux * ou + nx * ov)), int(round(hy + uy * ou + ny * ov)), col)


def draw_sculpted_valkyrie_hand_clasp(
    canvas: np.ndarray,
    hx: float,
    hy: float,
    lance_deg: float,
    is_back: bool = False,
):
    """Stamps articulated Valkyrie gauntlet fingers cleanly over Gungnir shaft after lance draw."""
    rad = math.radians(lance_deg)
    ux, uy = -math.sin(rad), math.cos(rad)
    layer = np.zeros((LH, LW, 4), dtype=np.uint8)
    draw_sculpted_valkyrie_hand(layer, hx, hy, ux, uy, is_back=is_back, role="lance_grip")
    layer = outline_layer(layer, OUTLINE)
    composite_np(canvas, layer)


def draw_valkyrie_ik_arm(canvas: np.ndarray, sx, sy, tx, ty, bend_sign=1.0, is_back=False, hand_role="lance_grip"):
    (ex, ey), (hx, hy) = solve_2bone_ik(sx, sy, tx, ty, 8.5, 8.5, bend_sign=bend_sign)
    layer = np.zeros((LH, LW, 4), dtype=np.uint8)
    plate = CRIMSON_DEEP if is_back else CRIMSON_MID
    trim = GOLD_MID if is_back else GOLD_BRIGHT
    fdx, fdy = hx - ex, hy - ey
    fd_len = math.hypot(fdx, fdy) or 1.0
    fux, fuy = fdx / fd_len, fdy / fd_len
    wx, wy = hx - fux * 1.7, hy - fuy * 1.7

    draw_thick_line(layer, sx, sy, ex, ey, 1.35, plate)
    draw_thick_line(layer, sx, sy - 0.3, ex, ey - 0.3, 0.70, CRIMSON_ROSE if not is_back else CRIMSON_MID)
    draw_thick_line(layer, ex, ey, wx, wy, 1.15, plate)
    draw_thick_line(layer, ex + (wx - ex) * 0.55, ey + (wy - ey) * 0.55, wx, wy, 1.0, trim)
    draw_sculpted_valkyrie_hand(layer, hx, hy, fux, fuy, is_back=is_back, role=hand_role)
    layer = outline_layer(layer, OUTLINE)
    composite_np(canvas, layer)
    return hx, hy


def draw_gungnir_war_lance(
    canvas: np.ndarray,
    hx: float,
    hy: float,
    angle_deg: float,
    fore_len: float = 45.0,
    back_len: float = 17.0,
    blazing: bool = True,
):
    """
    Long Crimson-Gold Winged Gungnir War-Lance (`~62` logical px / `124px` world polearm!):
      - Ornate gold counter-weight butt-spike (`-back_len`)
      - Crimson-lacquered war-shaft with golden rune bands
      - Twin Golden Valkyrie-Wing Cross-Lugs at the collar
      - Broad leaf/halberd-tipped Crimson-Gold & Pure-White Gungnir Spearhead!
    """
    rad = math.radians(angle_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    nx, ny = -uy, ux

    layer = np.zeros((LH, LW, 4), dtype=np.uint8)

    # Rear shaft & golden butt-spike
    bx0, by0 = hx - ux * back_len, hy - uy * back_len
    shaft_end_x, shaft_end_y = hx + ux * (fore_len * 0.62), hy + uy * (fore_len * 0.62)
    draw_thick_line(layer, bx0, by0, shaft_end_x, shaft_end_y, 1.15, CRIMSON_MID)
    draw_thick_line(layer, bx0 + ux * 2.0, by0 + uy * 2.0, shaft_end_x, shaft_end_y, 0.55, GOLD_BRIGHT)
    # Butt-spike jewel
    draw_thick_line(layer, bx0 - ux * 2.5, by0 - uy * 2.5, bx0 + ux * 1.5, by0 + uy * 1.5, 1.25, GOLD_BRIGHT)
    put_px(layer, int(round(bx0 - ux * 2.5)), int(round(by0 - uy * 2.5)), GOLD_SPEC)

    # Winged Valkyrie Cross-Lug Collar at `0.58 * fore_len`
    cx, cy = hx + ux * (fore_len * 0.58), hy + uy * (fore_len * 0.58)
    for wing_s in (-1, 1):
        wx1 = cx + nx * (wing_s * 5.6) - ux * 2.6
        wy1 = cy + ny * (wing_s * 5.6) - uy * 2.6
        draw_thick_line(layer, cx, cy, wx1, wy1, 1.2, GOLD_BRIGHT)
        put_px(layer, int(round(wx1)), int(round(wy1)), GOLD_SPEC)
        wx2 = cx + nx * (wing_s * 3.8) + ux * 1.2
        wy2 = cy + ny * (wing_s * 3.8) + uy * 1.2
        draw_thick_line(layer, cx, cy, wx2, wy2, 0.9, CRIMSON_ROSE)

    # Broad Leaf-Shaped Blazing Gungnir Spearhead (`0.58 .. 1.00 * fore_len`)
    head_len = fore_len * 0.44
    steps = int(max(18, head_len * 2.4))
    for i in range(steps + 1):
        u = i / steps
        px = cx + ux * (u * head_len)
        py = cy + uy * (u * head_len)
        # Flared halberd/dragon-lance leaf blade
        flare = math.sin(min(1.0, u * 1.08) * math.pi * 0.78)
        hw = (3.4 * flare + 0.8 * (1.0 - u)) * (1.0 - 0.76 * (u ** 2.3))
        for s in np.linspace(-hw, hw, 7):
            ad = abs(s) / max(0.35, hw)
            if ad > 0.70 or u > 0.86:
                col = PURE_WHITE if (blazing and (u > 0.78 or ad > 0.82)) else GOLD_SPEC
            elif ad > 0.36:
                col = GOLD_BRIGHT if u < 0.45 else CRIMSON_ROSE
            else:
                col = CRIMSON_MID
            put_px(layer, int(round(px + nx * s)), int(round(py + ny * s)), col)

    put_px(layer, int(round(cx)), int(round(cy)), PURE_WHITE)
    layer = outline_layer(layer, OUTLINE)
    composite_np(canvas, layer)
    return cx + ux * head_len, cy + uy * head_len


def draw_valhalla_target_rune_seal(
    canvas: np.ndarray,
    cx: float,
    cy: float,
    rx: float,
    ry: float,
    rot_deg: float = 0.0,
    intensity: float = 1.0,
):
    """
    3D Foreshortened Crimson-Gold & Pure-White Valhalla Valknut / Odin Target-Rune Seal:
      - Outer + inner runic rings with 8 Odin-spear crosshairs & diamond star-glint nodes.
    """
    layer = np.zeros((LH, LW, 4), dtype=np.uint8)
    rot = math.radians(rot_deg)

    # Outer & inner runic ellipses
    steps = max(48, int((rx + ry) * 3.4))
    for ring_idx, scale_r in enumerate((1.0, 0.66)):
        col = PURE_WHITE if (ring_idx == 0 and intensity >= 0.85) else (GOLD_SPEC if ring_idx == 0 else CRIMSON_ROSE)
        for i in range(steps):
            ang = (i / steps) * math.tau
            px = int(round(cx + math.cos(ang) * rx * scale_r))
            py = int(round(cy + math.sin(ang) * ry * scale_r))
            if ring_idx == 1 and (i % 3 == 1):
                continue
            put_px(layer, px, py, col)

    # 8 radial Odin-spear rune spokes + cardinal diamond nodes
    n_spokes = 8
    for k in range(n_spokes):
        ang = rot + (k / n_spokes) * math.tau
        ca, sa = math.cos(ang), math.sin(ang)
        r0 = 0.22 if (k % 2 == 0) else 0.52
        r1 = 1.18 if (k % 2 == 0) else 0.96
        x0, y0 = cx + ca * rx * r0, cy + sa * ry * r0
        x1, y1 = cx + ca * rx * r1, cy + sa * ry * r1
        spoke_col = PURE_WHITE if (k % 2 == 0 and intensity >= 0.8) else GOLD_BRIGHT
        draw_thick_line(layer, x0, y0, x1, y1, 0.55, spoke_col)
        if k % 2 == 0:
            nx, ny = int(round(x1)), int(round(y1))
            put_px(layer, nx, ny, PURE_WHITE)
            put_px(layer, nx + 1, ny, GOLD_SPEC)
            put_px(layer, nx - 1, ny, GOLD_SPEC)
            put_px(layer, nx, ny + 1, CRIMSON_ROSE)
            put_px(layer, nx, ny - 1, CRIMSON_ROSE)

    # Central crimson-gold target core
    put_px(layer, int(round(cx)), int(round(cy)), PURE_WHITE)
    for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        put_px(layer, int(round(cx)) + dx, int(round(cy)) + dy, GOLD_SPEC if intensity >= 0.75 else CRIMSON_ROSE)

    layer = outline_layer(layer, OUTLINE)
    composite_np(canvas, layer)


def draw_stepped_valkyrie_lightning(
    layer: np.ndarray,
    x0: float,
    y0: float,
    x1: float,
    y1: float,
    amp: float = 3.5,
    freq: float = 3.0,
    phase: float = 0.0,
    bright: bool = True,
):
    """Crisp pixel-stepped Valkyrie lightning ribbon wrapping or linking Gungnir javelins."""
    dx, dy = x1 - x0, y1 - y0
    dist = max(1.0, math.hypot(dx, dy))
    ux, uy = dx / dist, dy / dist
    nx, ny = -uy, ux
    segs = max(6, int(dist / 3.5))
    prev_x, prev_y = x0, y0
    for i in range(1, segs + 1):
        u = i / segs
        env = math.sin(u * math.pi)
        zag = (1.0 if ((i + int(phase * 3)) % 2 == 0) else -1.0) * amp * env
        cx = x0 + dx * u + nx * zag
        cy = y0 + dy * u + ny * zag
        draw_thick_line(layer, prev_x, prev_y, cx, cy, 0.65, GOLD_SPEC if bright else CRIMSON_ROSE)
        if bright and (i % 2 == 1):
            put_px(layer, int(round(cx)), int(round(cy)), PURE_WHITE)
        prev_x, prev_y = cx, cy


def draw_gungnir_lightning_javelin_cone(
    canvas: np.ndarray,
    x0: float,
    y0: float,
    x1: float,
    y1: float,
    cone_half_h: float = 11.0,
    intensity: float = 1.0,
    phase: float = 0.0,
    draw_spearhead: bool = True,
):
    """
    Sleek Needle-Sharp Aerodynamic Gungnir Lightning-Javelin Smear (`x_320 = 190..308`):
      - Solid-core white-gold -> crimson-rose tapered energy lance leading into a razor spearhead at `(x1, y1)`
      - Twin swept-back aerodynamic flame/lightning streamers tapering cleanly to 1px needle tails (zero jagged lobster teeth!)
      - Tight hugging stepped lightning filament + compact foreshortened Mach shock-crescent
    """
    layer = np.zeros((LH, LW, 4), dtype=np.uint8)
    dx, dy = x1 - x0, y1 - y0
    length = max(4.0, math.hypot(dx, dy))
    ux, uy = dx / length, dy / length
    nx, ny = -uy, ux

    max_r = max(2.1, min(4.2, cone_half_h * 0.34)) * (0.65 + 0.35 * intensity)

    def _lance_hw(u_val: float) -> float:
        if u_val >= 0.72:
            t_tip = max(0.0, (1.0 - u_val) / 0.28)
            return 0.45 + max_r * (t_tip ** 0.72)
        t_tail = max(0.0, u_val / 0.72)
        return max_r * (0.14 + 0.86 * (t_tail ** 0.85))

    # 1. Solid-core needle-tapered aerodynamic energy lance body (`0 -> 1`)
    steps = max(28, int(length * 2.2))
    for i in range(steps + 1):
        u = i / steps
        px = x0 + dx * u
        py = y0 + dy * u
        hw = _lance_hw(u)
        n_samples = max(5, int(math.ceil(hw * 3.5)))
        for s in np.linspace(-hw, hw, n_samples):
            ad = abs(s) / max(0.25, hw)
            if (ad < 0.34 and u > 0.20) or u > 0.84:
                col = PURE_WHITE if intensity >= 0.72 else GOLD_SPEC
            elif ad < 0.68 or u > 0.64:
                col = GOLD_SPEC if u > 0.42 else GOLD_BRIGHT
            else:
                col = CRIMSON_ROSE if u > 0.28 else CRIMSON_MID
            put_px(layer, int(round(px + nx * s)), int(round(py + ny * s)), col)

    # 2. Twin swept-back aerodynamic flame/lightning streamers tapering to razor needle tails
    streamer_reach = max(3.2, min(8.2, cone_half_h * 0.62)) * (0.68 + 0.32 * intensity)
    s_steps = max(22, int(length * 1.4))
    for side in (-1, 1):
        for i in range(s_steps + 1):
            t = i / s_steps  # 0 at spearhead collar -> 1 at trailing needle tip
            u = 0.78 - 0.74 * t
            env = math.sin(min(1.0, t * 1.15) * math.pi * 0.62) * (1.0 - 0.58 * (t ** 1.1))
            ripple = math.sin(t * 7.5 + phase + side * 1.1) * 0.55 * (1.0 - t)
            lat = side * (_lance_hw(u) * 0.85 + streamer_reach * env + ripple)
            px = x0 + dx * u + nx * lat
            py = y0 + dy * u + ny * lat
            sw = max(0.35, 1.25 * (1.0 - (t ** 0.85)))
            col = (
                PURE_WHITE
                if t < 0.14
                else (GOLD_SPEC if t < 0.40 else (CRIMSON_ROSE if t < 0.75 else CRIMSON_MID))
            )
            draw_thick_line(layer, px, py, px - ux * 0.7, py - uy * 0.7, sw, col)

    # 3. Compact foreshortened Mach shock-crescent hugging the lance mid-flight
    if intensity >= 0.70:
        mx, my = x0 + dx * 0.54, y0 + dy * 0.54
        ring_ry = max(3.2, min(6.6, cone_half_h * 0.54))
        for k in range(20):
            ang = math.radians(-78.0 + (k / 19.0) * 156.0)
            rx_p = mx + ux * (math.cos(ang) * 2.2) + nx * (math.sin(ang) * ring_ry)
            ry_p = my + uy * (math.cos(ang) * 2.2) + ny * (math.sin(ang) * ring_ry)
            put_px(layer, int(round(rx_p)), int(round(ry_p)), PURE_WHITE if abs(ang) < 0.5 else GOLD_SPEC)

    # 4. Tight hugging stepped Valkyrie lightning filament along the core
    draw_stepped_valkyrie_lightning(
        layer,
        x0 + ux * 4.0,
        y0 + uy * 4.0,
        x1 - ux * 6.0,
        y1 - uy * 6.0,
        amp=min(3.0, cone_half_h * 0.28),
        phase=phase,
        bright=(intensity >= 0.72),
    )

    # 5. Swept-back Winged Gungnir Javelin Spearhead at `(x1, y1)`
    if draw_spearhead:
        collar_x, collar_y = x1 - ux * 10.5, y1 - uy * 10.5
        wing_span = max(3.4, min(5.0, max_r + 1.8))
        for s in (-1, 1):
            wx = collar_x - ux * 3.8 + nx * (s * wing_span)
            wy = collar_y - uy * 3.8 + ny * (s * wing_span)
            draw_thick_line(layer, collar_x + ux * 1.0, collar_y + uy * 1.0, wx, wy, 0.9, GOLD_BRIGHT)
            put_px(layer, int(round(wx)), int(round(wy)), GOLD_SPEC)
        for j in range(18):
            v = j / 17.0
            bx = collar_x + ux * (v * 11.0)
            by = collar_y + uy * (v * 11.0)
            hw = 2.6 * (1.0 - 0.85 * (v ** 1.5))
            draw_thick_line(
                layer,
                bx - nx * hw,
                by - ny * hw,
                bx + nx * hw,
                by + ny * hw,
                0.65,
                GOLD_SPEC if v < 0.45 else PURE_WHITE,
            )
        put_px(layer, int(round(x1)), int(round(y1)), PURE_WHITE)

    layer = outline_layer(layer, OUTLINE)
    composite_np(canvas, layer)


def draw_valkyrie_vortex_smear(canvas: np.ndarray, cx: float, cy: float, rx: float, ry: float):
    """2.5D Foreshortened Crimson-Gold Gungnir Vortex Ring (`Row 2 V2 F18`)."""
    layer = np.zeros((LH, LW, 4), dtype=np.uint8)
    steps = 155
    for i in range(steps + 1):
        u = i / steps
        ang = math.radians(-165.0 + 325.0 * u)
        ca, sa = math.cos(ang), math.sin(ang)
        env = math.sin(u * math.pi) ** 0.55
        saw = abs(((u * 12.0) % 1.0) * 2.0 - 1.0) * 4.8 * env
        for b_idx, frac in enumerate(np.linspace(0.58, 1.0, 9)):
            px = int(round(cx + ca * (rx + saw) * frac))
            py = int(round(cy + sa * (ry + saw * 0.28) * frac))
            col = PURE_WHITE if b_idx >= 7 else (GOLD_SPEC if b_idx >= 5 else (CRIMSON_ROSE if b_idx >= 2 else CRIMSON_MID))
            put_px(layer, px, py, col)
    layer = outline_layer(layer, OUTLINE)
    composite_np(canvas, layer)


# ==============================================================================
# 4. Pose Composers (`compose_stand_rig` + `compose_keypose`)
# ==============================================================================
def compose_stand_rig(
    stand_parts,
    stand_meta,
    *,
    body_dx=0.0,
    body_dy=0.0,
    torso_rot=0.0,
    head_rot=0.0,
    front_leg_rot=0.0,
    front_foot_rot=0.0,
    back_leg_rot=0.0,
    back_foot_rot=0.0,
    front_leg_dx=0.0,
    back_leg_dx=0.0,
    front_leg_dy=0.0,
    back_leg_dy=0.0,
    walk_mode=False,
    hair_phase=0.0,
    hair_billow=0.7,
    wing_flap=0.0,
    sovereign_wings=False,
    lance_hand_offset=(15.0, 4.0),
    off_hand_offset=(6.0, 2.0),
    lance_angle=16.0,
    lance_fore=45.0,
    lance_back=17.0,
    lance_behind=False,
    clamp_ground=False,
) -> np.ndarray:
    canvas = np.zeros((LH, LW, 4), dtype=np.uint8)
    sh_fx, sh_fy = stand_meta["sh_front"][0] + body_dx, stand_meta["sh_front"][1] + body_dy
    sh_bx, sh_by = stand_meta["sh_back"][0] + body_dx, stand_meta["sh_back"][1] + body_dy
    wx, wy = stand_meta["wing_anchor"][0] + body_dx, stand_meta["wing_anchor"][1] + body_dy
    hx, hy = stand_meta["hair_anchor"][0] + body_dx, stand_meta["hair_anchor"][1] + body_dy

    # 1. 6-Pinion Crimson-Gold Feathered Valkyrie Wings behind everything
    draw_valkyrie_wings(canvas, wx, wy, flap_deg=wing_flap, sovereign=sovereign_wings)
    draw_valkyrie_hair_waves(canvas, hx, hy, phase=hair_phase, billow=hair_billow)

    # 2. Off-hand IK arm behind torso
    draw_valkyrie_ik_arm(canvas, sh_bx, sh_by, sh_fx + off_hand_offset[0], sh_fy + off_hand_offset[1], bend_sign=1.0, is_back=True, hand_role="open")

    if lance_behind:
        lhx, lhy = draw_valkyrie_ik_arm(canvas, sh_fx, sh_fy, sh_fx + lance_hand_offset[0], sh_fy + lance_hand_offset[1], bend_sign=1.0, is_back=True)
        draw_gungnir_war_lance(canvas, lhx, lhy, lance_angle, fore_len=lance_fore, back_len=lance_back)
        draw_sculpted_valkyrie_hand_clasp(canvas, lhx, lhy, lance_angle, is_back=True)

    # Exact knee-joint tracking so sabaton feet stay 100% locked to rotated thighs!
    def knee_delta(leg_part: PartSprite, foot_part: PartSprite, leg_rot_deg: float):
        vx = foot_part.pivot_x - leg_part.pivot_x
        vy = foot_part.pivot_y - leg_part.pivot_y
        rad = math.radians(leg_rot_deg)
        ca, sa = math.cos(rad), math.sin(rad)
        return (vx * ca - vy * sa) - vx, (vx * sa + vy * ca) - vy

    # 3. Segmented STAND parts
    im_layer = Image.fromarray(canvas, mode="RGBA")
    if walk_mode:
        inward_frac = 0.92
        # Use symmetric forward-facing +X Valkyrie greaves/sabatons on both legs (far darkened)
        # so both stride halves match ground height and forward toe orientation cleanly.
        bk_leg_p = stand_parts["back_leg_dark"]
        bk_foot_p = stand_parts["back_foot_dark"]
        fr_leg_p = stand_parts["back_leg"]
        fr_foot_p = stand_parts["back_foot"]

        # Exact rest-angle neutralization for back_leg / back_foot in 512x512 stand pose
        bk_leg_rest, bk_foot_rest = -16.33, -18.50
        fr_leg_rest, fr_foot_rest = -16.33, -18.50

        bk_rot = back_leg_rot - bk_leg_rest
        bk_f_rot = back_foot_rot - bk_foot_rest
        fr_rot = front_leg_rot - fr_leg_rest
        fr_f_rot = front_foot_rot - fr_foot_rest

        bk_center_dx = (AX - bk_leg_p.pivot_x) * 0.94
        fr_center_dx = (AX - fr_leg_p.pivot_x) * 0.88

        bk_dx, bk_dy = knee_delta(bk_leg_p, bk_foot_p, bk_rot)
        fr_dx, fr_dy = knee_delta(fr_leg_p, fr_foot_p, fr_rot)

        # Render far leg darkened behind near leg
        order = [
            ("back_hair", body_dx, body_dy, head_rot * 0.7),
            ("back_leg_dark", body_dx + bk_center_dx + back_leg_dx, body_dy + back_leg_dy, bk_rot),
            ("back_foot_dark", body_dx + bk_center_dx + back_leg_dx + bk_dx, body_dy + back_leg_dy + bk_dy, bk_f_rot),
            ("back_leg", body_dx + fr_center_dx + front_leg_dx, body_dy + front_leg_dy, fr_rot),
            ("back_foot", body_dx + fr_center_dx + front_leg_dx + fr_dx, body_dy + front_leg_dy + fr_dy, fr_f_rot),
            ("pelvis", body_dx, body_dy, torso_rot * 0.35),
            ("torso", body_dx, body_dy, torso_rot),
            ("head", body_dx, body_dy, head_rot),
        ]
    else:
        bk_dx, bk_dy = knee_delta(stand_parts["back_leg"], stand_parts["back_foot"], back_leg_rot)
        fr_dx, fr_dy = knee_delta(stand_parts["front_leg"], stand_parts["front_foot"], front_leg_rot)
        order = [
            ("back_hair", body_dx, body_dy, head_rot * 0.7),
            ("back_leg", body_dx + back_leg_dx, body_dy, back_leg_rot),
            ("back_foot", body_dx + back_leg_dx + bk_dx, body_dy + bk_dy, back_foot_rot),
            ("pelvis", body_dx, body_dy, torso_rot * 0.35),
            ("front_leg", body_dx + front_leg_dx, body_dy, front_leg_rot),
            ("front_foot", body_dx + front_leg_dx + fr_dx, body_dy + fr_dy, front_foot_rot),
            ("torso", body_dx, body_dy, torso_rot),
            ("head", body_dx, body_dy, head_rot),
        ]
    for pname, dx, dy, rot in order:
        im_layer.alpha_composite(transform_part(stand_parts[pname], dx=dx, dy=dy, rot_deg=rot))
    canvas = np.array(im_layer, dtype=np.uint8)

    # 4. Foreground Lead IK Arm + Gungnir War-Lance + Sculpted Clasp + Pauldron
    if not lance_behind:
        lhx, lhy = draw_valkyrie_ik_arm(canvas, sh_fx, sh_fy, sh_fx + lance_hand_offset[0], sh_fy + lance_hand_offset[1], bend_sign=1.0, is_back=False)
        draw_gungnir_war_lance(canvas, lhx, lhy, lance_angle, fore_len=lance_fore, back_len=lance_back)
        draw_sculpted_valkyrie_hand_clasp(canvas, lhx, lhy, lance_angle, is_back=False)

    im_layer = Image.fromarray(canvas, mode="RGBA")
    im_layer.alpha_composite(transform_part(stand_parts["front_pauldron"], dx=body_dx, dy=body_dy, rot_deg=torso_rot))
    out = np.array(im_layer, dtype=np.uint8)
    if walk_mode:
        ys_b, _ = np.where(out[:, :, 3] > 0)
        if len(ys_b) > 0:
            cur_bot = int(ys_b.max())
            shift_y = AY - cur_bot
            if shift_y != 0:
                shifted = np.zeros_like(out)
                for y in range(LH):
                    ny = y + shift_y
                    if 2 <= ny < LH - 2:
                        shifted[ny] = out[y]
                out = shifted
    elif clamp_ground:
        out[AY + 1 :, :, :] = 0
    return seal_160_char_pinholes_and_leaks(
        out,
        max_pinhole_lpx=8,
        min_detached_lpx=4,
        max_orphan_lpx=18,
        orphan_dist_lpx=4.0,
        bridge_max_lpx=56,
        bridge_gap_lpx=2.5,
    )


def compose_keypose(
    keyposes,
    kname: str,
    *,
    dx=0.0,
    dy=0.0,
    rot_deg=0.0,
    hair_phase=0.0,
    hair_billow=1.0,
    wing_flap=0.0,
    sovereign_wings=False,
    delta_dive_wings=False,
    lance_hand_offset=(18.0, 3.0),
    off_hand_offset=(8.0, 2.0),
    lance_angle=12.0,
    lance_fore=46.0,
    lance_back=17.0,
    lance_in_front=True,
) -> np.ndarray:
    kp = keyposes[kname]
    canvas = np.zeros((LH, LW, 4), dtype=np.uint8)

    sh_fx, sh_fy = kp["sh_front"][0] + dx, kp["sh_front"][1] + dy
    sh_bx, sh_by = kp["sh_back"][0] + dx, kp["sh_back"][1] + dy
    wx, wy = kp["wing_anchor"][0] + dx, kp["wing_anchor"][1] + dy
    hx, hy = kp["hair_anchor"][0] + dx, kp["hair_anchor"][1] + dy

    draw_valkyrie_wings(canvas, wx, wy, flap_deg=wing_flap, sovereign=sovereign_wings, delta_dive=delta_dive_wings)
    draw_valkyrie_hair_waves(canvas, hx, hy, phase=hair_phase, billow=hair_billow)

    draw_valkyrie_ik_arm(canvas, sh_bx, sh_by, sh_fx + off_hand_offset[0], sh_fy + off_hand_offset[1], bend_sign=1.0, is_back=True, hand_role="open")
    if not lance_in_front:
        lhx, lhy = draw_valkyrie_ik_arm(canvas, sh_fx, sh_fy, sh_fx + lance_hand_offset[0], sh_fy + lance_hand_offset[1], bend_sign=1.0, is_back=True)
        draw_gungnir_war_lance(canvas, lhx, lhy, lance_angle, fore_len=lance_fore, back_len=lance_back)
        draw_sculpted_valkyrie_hand_clasp(canvas, lhx, lhy, lance_angle, is_back=True)

    im_kp = kp["im"]
    if abs(rot_deg) > 0.05:
        im_kp = im_kp.rotate(-rot_deg, resample=Image.Resampling.NEAREST, center=(AX, AY - 35))
    im_layer = Image.fromarray(canvas, mode="RGBA")
    body_layer = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
    body_layer.paste(im_kp, (int(round(dx)), int(round(dy))))
    im_layer.alpha_composite(body_layer)
    canvas = np.array(im_layer, dtype=np.uint8)

    if lance_in_front:
        lhx, lhy = draw_valkyrie_ik_arm(canvas, sh_fx, sh_fy, sh_fx + lance_hand_offset[0], sh_fy + lance_hand_offset[1], bend_sign=1.0, is_back=False)
        draw_gungnir_war_lance(canvas, lhx, lhy, lance_angle, fore_len=lance_fore, back_len=lance_back)
        draw_sculpted_valkyrie_hand_clasp(canvas, lhx, lhy, lance_angle, is_back=False)
    canvas = seal_160_char_pinholes_and_leaks(
        canvas,
        max_pinhole_lpx=8,
        min_detached_lpx=4,
        max_orphan_lpx=18,
        orphan_dist_lpx=4.0,
        bridge_max_lpx=56,
        bridge_gap_lpx=2.5,
    )
    return canvas


_VALKYRIE_WALK_KFS = [
    # (u, thigh_tgt_deg, shin_tgt_deg, foot_tgt_deg, hip_dx_160, hip_dy_160)
    # 0 deg = straight vertical down; -deg = forward (+X); +deg = trailing (-X)
    (0.000, -21.5, -18.5,  -4.0,  1.8,  2.2),   # Front heel contact (+X)
    (0.033, -19.5, -16.0,   0.0,  1.5,  1.9),   # Flat-foot stance load
    (0.100, -13.5,  -6.5,   0.0,  1.0,  1.1),   # Weight absorption
    (0.233,   0.0,   0.0,   0.0,  0.0,  0.2),   # Mid-stance vertical under AX (F07 / F22!)
    (0.380,  13.5,  16.5,   3.0, -1.0,  1.0),   # Late stance roll-off
    (0.500,  20.5,  23.5,  10.0, -1.8,  2.1),   # Rear toe push-off (-X, F15 / F00!)
    (0.533,  15.5,  35.0,  14.0, -1.2, -4.6),   # Immediate crisp toe clearance above y=224!
    (0.620,   4.0,  45.0,  16.0, -0.6, -6.2),   # Mid-early swing knee drive (+X) & heel tuck (-X)
    (0.733, -17.0,  22.0,  10.0, -0.2, -6.4),   # Mid-swing passing crossover over AX!
    (0.867, -23.5,  -8.0,  -4.0,  1.2, -4.2),   # Forward swing reach above ground
    (0.950, -22.5, -15.5,  -4.0,  1.6, -0.6),   # Controlled heel descent
    (1.000, -21.5, -18.5,  -4.0,  1.8,  2.2),
]


def _sample_valkyrie_walk_leg(u: float):
    u = u % 1.0
    for i in range(len(_VALKYRIE_WALK_KFS) - 1):
        u0, th0, sh0, ft0, dx0, dy0 = _VALKYRIE_WALK_KFS[i]
        u1, th1, sh1, ft1, dx1, dy1 = _VALKYRIE_WALK_KFS[i + 1]
        if u <= u1 or i == len(_VALKYRIE_WALK_KFS) - 2:
            t = (u - u0) / max(1e-6, u1 - u0)
            s = t * t * (3.0 - 2.0 * t)
            return (
                th0 + (th1 - th0) * s,
                sh0 + (sh1 - sh0) * s,
                ft0 + (ft1 - ft0) * s,
                dx0 + (dx1 - dx0) * s,
                dy0 + (dy1 - dy0) * s,
            )
    return _VALKYRIE_WALK_KFS[0][1:]


# ==============================================================================
# 5. 10-Row x 30-Frame Next-Gen Choreography (`0..9`)
# ==============================================================================
def render_frame(row: int, f: int, stand_parts, stand_meta, keyposes) -> np.ndarray:
    tau_f = (f / 30.0) * math.tau
    flap = math.sin(tau_f) * 8.5

    # --------------------------------------------------------------------------
    # ROW 0: IDLE — Ragnarok Sky-Sovereign Poised Stance
    # --------------------------------------------------------------------------
    if row == 0:
        breath = math.sin(tau_f) * 1.15
        sway = math.cos(tau_f) * 0.75
        return compose_stand_rig(
            stand_parts,
            stand_meta,
            body_dx=sway,
            body_dy=breath * 0.6,
            torso_rot=math.sin(tau_f) * 1.4,
            head_rot=math.sin(tau_f + 0.4) * 1.1,
            hair_phase=tau_f,
            hair_billow=0.7,
            wing_flap=flap,
            lance_hand_offset=(15.5, 4.5 + breath * 0.6),
            lance_angle=16.0 + math.sin(tau_f) * 3.0,
        )

    # --------------------------------------------------------------------------
    # ROW 1: WALK — Authentic Bipedal Valkyrie Crossover Stride (Zero Crab Straddle!)
    #   F00: Left (back_leg) forward (+X), Right (front_leg) trailing (-X)
    #   F07: Right knee lifted & crossing directly over AX
    #   F15: Right (front_leg) forward (+X), Left (back_leg) trailing (-X)
    #   F22: Left knee lifted & crossing directly over AX
    # --------------------------------------------------------------------------
    if row == 1:
        u_l = (f / 30.0) % 1.0
        u_r = (u_l + 0.5) % 1.0
        stride = math.cos(tau_f)
        bob = 0.45 * math.cos(tau_f * 2.0)
        bk_th, bk_sh, bk_ft, bk_dx, bk_dy = _sample_valkyrie_walk_leg(u_l)
        fr_th, fr_sh, fr_ft, fr_dx, fr_dy = _sample_valkyrie_walk_leg(u_r)
        return compose_stand_rig(
            stand_parts,
            stand_meta,
            body_dx=0.5 + stride * 0.40,
            body_dy=bob,
            torso_rot=2.2 + math.cos(tau_f * 2.0) * 0.75,
            head_rot=0.8 + math.sin(tau_f + 0.35) * 0.65,
            back_leg_rot=bk_th,
            back_foot_rot=bk_ft,
            back_leg_dx=bk_dx,
            back_leg_dy=bk_dy,
            front_leg_rot=fr_th,
            front_foot_rot=fr_ft,
            front_leg_dx=fr_dx,
            front_leg_dy=fr_dy,
            walk_mode=True,
            hair_phase=tau_f * 2.0,
            hair_billow=0.85,
            wing_flap=math.sin(tau_f * 2.0) * 5.0,
            lance_hand_offset=(15.2 - stride * 1.1, 4.5 + abs(stride) * 0.5),
            lance_angle=16.0 - stride * 3.0,
            clamp_ground=True,
        )

    # --------------------------------------------------------------------------
    # ROW 2: AUTO_ATTACK — Newly Born 520px Valhalla Sky-Javelin Sovereign Chain!
    #   V0 (`F00..F07`): Supersonic Gungnir Lightning-Javelin Cone + Valhalla Rune Seal (`F03`)
    #   V1 (`F08..F14`): Twin Angled Valkyrie Lightning-Javelin Volley (`F09`)
    #   V2 (`F15..F22`): Coaxial Double Valhalla Target-Seals + Supersonic Mach-Cone Lance (`F17`)
    #   V3 (`F23..F29`): 6-Winged Backstep-Vault (`F24`) -> Sky-Gate Triple Javelin Rain (`F25`)
    # --------------------------------------------------------------------------
    if row == 2:
        # === V0: F00..F07 (Supersonic Gungnir Lightning-Javelin Hurl) ===
        if f <= 2:
            u = f / 2.0
            return compose_keypose(
                keyposes,
                "K1_COIL" if f < 2 else "K3_RISE",
                dx=-2.0 - u * 2.0,
                dy=0.5,
                hair_phase=f * 0.45,
                hair_billow=1.15,
                wing_flap=-8.0 + u * 10.0,
                lance_hand_offset=(8.0 - u * 2.0, 5.5 - u * 0.5),
                lance_angle=3.0 + u * 2.0,
                lance_fore=44.0,
                lance_back=13.0,
            )
        if f == 3:
            return compose_keypose(
                keyposes,
                "K2_LUNGE",
                dx=8.0,
                dy=0.0,
                hair_phase=1.8,
                hair_billow=1.55,
                wing_flap=16.0,
                lance_hand_offset=(20.0, 4.0),
                lance_angle=2.0,
                lance_fore=34.0,
                lance_back=10.0,
            )
        if f == 4:
            return compose_keypose(
                keyposes,
                "K2_LUNGE",
                dx=7.0,
                dy=0.0,
                hair_phase=2.3,
                hair_billow=1.35,
                wing_flap=12.0,
                lance_hand_offset=(19.0, 5.0),
                lance_angle=4.0,
                lance_fore=38.0,
                lance_back=12.0,
            )
        if f <= 7:
            u = (f - 4) / 3.0
            return compose_keypose(
                keyposes,
                "K3_RISE",
                dx=6.0 * (1.0 - u),
                dy=0.0,
                hair_phase=2.6 + u * 1.2,
                hair_billow=1.1 - 0.25 * u,
                wing_flap=8.0 * (1.0 - u),
                lance_hand_offset=(17.0 - u * 3.0, 4.5 + u * 1.5),
                lance_angle=8.0 + u * 6.0,
                lance_fore=42.0 + u * 3.0,
            )

        # === V1: F08..F14 (Twin Angled Valkyrie Lightning-Javelin Volley) ===
        if f == 8:
            return compose_keypose(
                keyposes,
                "K3_RISE",
                dx=-1.0,
                dy=-1.0,
                hair_phase=3.9,
                hair_billow=1.2,
                wing_flap=-10.0,
                lance_hand_offset=(8.0, 5.0),
                lance_angle=-3.0,
                lance_fore=43.0,
                lance_back=13.0,
            )
        if f == 9:
            return compose_keypose(
                keyposes,
                "K3_RISE",
                dx=7.0,
                dy=-1.0,
                hair_phase=4.4,
                hair_billow=1.55,
                wing_flap=18.0,
                lance_hand_offset=(19.0, 2.0),
                lance_angle=-3.0,
                lance_fore=35.0,
                lance_back=11.0,
            )
        if f == 10:
            return compose_keypose(
                keyposes,
                "K3_RISE",
                dx=6.0,
                dy=-1.0,
                hair_phase=4.9,
                hair_billow=1.35,
                wing_flap=14.0,
                lance_hand_offset=(18.0, 2.5),
                lance_angle=-2.0,
                lance_fore=40.0,
            )
        if f <= 14:
            u = (f - 10) / 4.0
            return compose_keypose(
                keyposes,
                "K3_RISE",
                dx=5.0 * (1.0 - u),
                dy=0.0,
                hair_phase=5.2 + u * 1.4,
                hair_billow=1.1 - 0.3 * u,
                wing_flap=10.0 * (1.0 - u),
                lance_hand_offset=(17.0 - u * 2.5, 3.0 + u * 2.5),
                lance_angle=2.0 + u * 12.0,
            )

        # === V2: F15..F22 (Clean Supersonic Gungnir Lance Thrust) ===
        if f <= 16:
            u = f - 15
            return compose_keypose(
                keyposes,
                "K1_COIL",
                dx=-3.0 - u * 2.5,
                dy=1.0,
                hair_phase=6.8 + u * 0.5,
                hair_billow=1.25,
                wing_flap=-12.0,
                lance_hand_offset=(-4.0, 4.5),
                lance_angle=4.0,
                lance_fore=42.0,
                lance_back=12.0,
            )
        if f == 17:
            return compose_keypose(
                keyposes,
                "K2_LUNGE",
                dx=10.0,
                dy=0.0,
                hair_phase=7.8,
                hair_billow=1.6,
                wing_flap=18.0,
                lance_hand_offset=(21.0, 5.0),
                lance_angle=2.0,
                lance_fore=38.0,
            )
        if f == 18:
            return compose_keypose(
                keyposes,
                "K3_RISE",
                dx=8.0,
                dy=0.0,
                hair_phase=8.5,
                hair_billow=1.5,
                wing_flap=15.0,
                lance_hand_offset=(19.0, 4.5),
                lance_angle=0.0,
                lance_fore=43.0,
            )
        if f <= 22:
            u = (f - 18) / 4.0
            return compose_keypose(
                keyposes,
                "K3_RISE",
                dx=7.0 * (1.0 - u),
                dy=0.0,
                hair_phase=9.0 + u * 1.4,
                hair_billow=1.2 - 0.4 * u,
                wing_flap=10.0 * (1.0 - u),
                lance_hand_offset=(16.0, 5.0 + u * 1.5),
                lance_angle=8.0 + u * 8.0,
            )

        # === V3: F23..F29 (6-Winged Backstep-Vault Cast Pose; Sky-Gate 3-Spear Rain renders on enemy.x via VFX sheet) ===
        if f == 23:
            return compose_keypose(
                keyposes,
                "K1_COIL",
                dx=-2.0,
                dy=-3.0,
                hair_phase=10.8,
                hair_billow=1.3,
                wing_flap=12.0,
                sovereign_wings=True,
                lance_hand_offset=(8.0, 1.0),
                lance_angle=-12.0,
                lance_fore=42.0,
                lance_back=13.0,
            )
        if f == 24:
            # High airborne K4_LEAP backstep-vault with SOVEREIGN Twin Crimson-Gold Wings!
            return compose_keypose(
                keyposes,
                "K4_LEAP",
                dx=-4.0,
                dy=-11.0,
                hair_phase=11.4,
                hair_billow=1.6,
                wing_flap=18.0,
                sovereign_wings=True,
                lance_hand_offset=(10.0, -2.0),
                lance_angle=-14.0,
                lance_fore=43.0,
                lance_back=13.0,
            )
        if f == 25:
            return compose_keypose(
                keyposes,
                "K4_LEAP",
                dx=-3.0,
                dy=-9.0,
                hair_phase=12.2,
                hair_billow=1.65,
                wing_flap=21.0,
                sovereign_wings=True,
                lance_hand_offset=(18.0, 4.0),
                lance_angle=20.0,
                lance_fore=38.0,
            )
        if f == 26:
            return compose_keypose(
                keyposes,
                "K4_LEAP",
                dx=-2.0,
                dy=-5.0,
                hair_phase=12.8,
                hair_billow=1.45,
                wing_flap=14.0,
                sovereign_wings=True,
                lance_hand_offset=(17.0, 5.0),
                lance_angle=18.0,
            )
        u = (f - 26) / 3.0
        return compose_keypose(
            keyposes,
            "K3_RISE",
            dx=2.0 * (1.0 - u),
            dy=-2.0 * (1.0 - u),
            hair_phase=13.2 + u * 1.2,
            hair_billow=1.1 - 0.35 * u,
            wing_flap=8.0 * (1.0 - u),
            lance_hand_offset=(16.5 - u * 1.0, 5.0 - u * 0.5),
            lance_angle=18.0 - u * 2.0,
        )

    # --------------------------------------------------------------------------
    # ROW 3: SKILL — GUNGNIR SKY-LANCE (`F00..F08` Ascent, `F09..F17` Overhead Hurl, `F18..F29` Land)
    # --------------------------------------------------------------------------
    if row == 3:
        if f <= 8:
            u = f / 8.0
            return compose_keypose(
                keyposes,
                "K1_COIL" if f < 3 else "K4_LEAP",
                dx=2.0 * u,
                dy=-9.0 * u if f >= 3 else 2.0,
                hair_phase=tau_f * 2.0,
                hair_billow=1.4,
                wing_flap=16.0 * u,
                sovereign_wings=(f >= 4),
                lance_hand_offset=(-4.0 + u * 10.0, -4.0 - u * 2.0),
                lance_angle=-135.0 + u * 95.0,
                lance_fore=42.0,
                lance_back=12.0,
                lance_in_front=False,
            )
        if f <= 17:
            u = (f - 9) / 8.0
            return compose_keypose(
                keyposes,
                "K4_LEAP",
                dx=6.0,
                dy=-9.0 * (1.0 - u * 0.5),
                hair_phase=tau_f * 2.0,
                hair_billow=1.55,
                wing_flap=18.0 - u * 8.0,
                sovereign_wings=(f <= 14),
                lance_hand_offset=(19.0, 9.0 + u * 2.5),
                lance_angle=32.0 + u * 8.0,
                lance_fore=47.0,
                lance_back=12.0,
            )
        u = (f - 18) / 11.0
        return compose_stand_rig(
            stand_parts,
            stand_meta,
            body_dx=4.0 * (1.0 - u),
            body_dy=2.0 * math.sin(u * math.pi),
            hair_phase=tau_f * 2.0,
            hair_billow=1.1 - 0.4 * u,
            wing_flap=flap,
            lance_hand_offset=(15.5, 4.5),
            lance_angle=18.0 - u * 2.0,
        )

    # --------------------------------------------------------------------------
    # ROW 4: ULTIMATE & TRUE_ULTIMATE (`120..149`) — SOVEREIGN TWIN-WING RAGNAROK!
    #   `F00..F02` (`120..122`): Valhalla Awakening & Twin-Wing Unfold
    #   `F03..F11` (`123..131`): 360-deg Aerial Valkyrie Spin / Pirouette + Gungnir Throw
    #   `F12..F18` (`132..138`): Animated Overhead-to-Downward Aerial Spear-Throw Cycle
    #   `F19..F20` (`139..140`): High Apex Dive-Coil
    #   `F21..F24` (`141..144`): Steep Head-First (`54 deg`) Valkyrie Falcon Dive (Delta-V Wings + 52px Gungnir)
    #   `F25..F29` (`145..149`): Ragnarok Judgment Landing & Sovereign Wing Flare
    # --------------------------------------------------------------------------
    if row == 4:
        if f <= 2:
            u = f / 2.0
            return compose_keypose(
                keyposes,
                "K3_RISE",
                dx=0.0,
                dy=-3.0 * u,
                hair_phase=tau_f * 2.0,
                hair_billow=1.45,
                wing_flap=-4.0 + 18.0 * u,
                sovereign_wings=True,
                lance_hand_offset=(16.5, -2.0 - u * 4.0),
                lance_angle=-48.0 - u * 16.0,
                lance_fore=42.0,
                lance_back=12.0,
            )
        if f <= 11:
            # Dynamic 360-deg aerial Valkyrie spin/pirouette (9 frames, 40 deg/frame) with billowing twin wings & whipping spear arm
            u = (f - 3) / 9.0
            spin_deg = u * 360.0
            base_pose = compose_keypose(
                keyposes,
                "K4_LEAP" if (f % 2 == 0) else "K2_LUNGE",
                dx=2.0,
                dy=-6.0,
                hair_phase=tau_f * 3.0 + u * math.tau,
                hair_billow=1.40,
                wing_flap=16.0 + math.sin(u * math.tau) * 8.0,
                sovereign_wings=True,
                delta_dive_wings=False,
                lance_hand_offset=(13.5, -3.5 + math.sin(u * math.tau) * 5.0),
                lance_angle=-22.0 + math.sin(u * math.tau) * 42.0,
                lance_fore=29.0,
                lance_back=11.0,
            )
            im_spin = Image.fromarray(base_pose, mode="RGBA").rotate(
                -spin_deg, resample=Image.Resampling.NEAREST, center=(AX, 68)
            )
            centered_spin = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
            centered_spin.paste(im_spin, (6, -5))
            return np.array(centered_spin, dtype=np.uint8)
        if f <= 18:
            # Animated Aerial Spear-Throw Cycle (`132..138`):
            # `F12..F13`: High overhead windup -> `F14..F16`: explosive downward hurl -> `F17..F18`: follow-through & re-materialize
            if f <= 13:
                u = f - 12
                return compose_keypose(
                    keyposes,
                    "K3_RISE",
                    dx=1.0,
                    dy=-5.0 - u * 1.5,
                    rot_deg=-6.0,
                    hair_phase=tau_f * 3.0,
                    hair_billow=1.55,
                    wing_flap=20.0 + u * 3.0,
                    sovereign_wings=True,
                    lance_hand_offset=(-6.0, -12.0),
                    lance_angle=-138.0 + u * 4.0,
                    lance_fore=35.0,
                    lance_back=11.0,
                    lance_in_front=False,
                )
            if f <= 16:
                u = (f - 14) / 2.0
                return compose_keypose(
                    keyposes,
                    "K4_LEAP",
                    dx=6.0 + u * 4.0,
                    dy=-7.0 + u * 2.0,
                    rot_deg=6.0 + u * 6.0,
                    hair_phase=tau_f * 3.0,
                    hair_billow=1.6,
                    wing_flap=16.0 - u * 12.0,
                    sovereign_wings=True,
                    lance_hand_offset=(22.0, 10.0),
                    lance_angle=48.0,
                    lance_fore=45.0,
                    lance_back=12.0,
                    lance_in_front=True,
                )
            u = f - 17
            return compose_keypose(
                keyposes,
                "K4_LEAP",
                dx=6.0 - u * 3.0,
                dy=-7.5 - u * 1.5,
                rot_deg=4.0 * (1.0 - u),
                hair_phase=tau_f * 3.0,
                hair_billow=1.5,
                wing_flap=8.0 + u * 12.0,
                sovereign_wings=True,
                lance_hand_offset=(14.0 - u * 10.0, 4.0 - u * 10.0),
                lance_angle=18.0 - u * 92.0,
                lance_fore=32.0 + u * 6.0,
                lance_back=11.0,
                lance_in_front=(u < 0.5),
            )
        if f <= 20:
            # High Apex Dive-Coil (`139..140`)
            u = f - 19
            return compose_keypose(
                keyposes,
                "K4_LEAP",
                dx=4.0,
                dy=-9.0 - u * 1.5,
                rot_deg=12.0 + u * 10.0,
                hair_phase=tau_f * 3.0,
                hair_billow=1.6,
                wing_flap=22.0 - u * 6.0,
                sovereign_wings=True,
                delta_dive_wings=False,
                lance_hand_offset=(-4.0, -9.0),
                lance_angle=-136.0 + u * 16.0,
                lance_fore=35.0,
                lance_back=11.0,
                lance_in_front=False,
            )
        if f <= 24:
            # Steep Head-First Valkyrie Falcon Dive (`141..144`): `54 deg` nose-down aerodynamic pitch + Delta-V wings + 52px Gungnir!
            u = (f - 21) / 3.0
            dive_base = compose_keypose(
                keyposes,
                "K4_LEAP",
                dx=2.0,
                dy=-6.0 + math.sin(u * math.tau) * 1.0,
                rot_deg=6.0,
                hair_phase=tau_f * 3.0 + u * 0.8,
                hair_billow=1.65,
                wing_flap=-6.0 - u * 4.0,
                sovereign_wings=True,
                delta_dive_wings=True,
                lance_hand_offset=(18.0, 2.0),
                lance_angle=4.0 + u * 2.0,
                lance_fore=52.0,
                lance_back=12.0,
                lance_in_front=True,
            )
            im_dive = Image.fromarray(dive_base, mode="RGBA").rotate(
                -54.0, resample=Image.Resampling.NEAREST, center=(AX, 60)
            )
            shifted_dive = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
            shifted_dive.paste(im_dive, (6, -5))
            return np.array(shifted_dive, dtype=np.uint8)
        u = (f - 25) / 4.0
        return compose_keypose(
            keyposes,
            "K2_LUNGE" if f <= 27 else "K3_RISE",
            dx=11.0 * (1.0 - u * 0.7),
            dy=0.0,
            hair_phase=tau_f * 2.0,
            hair_billow=1.5 - 0.5 * u,
            wing_flap=18.0 - 8.0 * u,
            sovereign_wings=True,
            lance_hand_offset=(20.0 - u * 4.0, 7.5 - u * 1.5),
            lance_angle=22.0 - u * 6.0,
        )

    # --------------------------------------------------------------------------
    # ROW 5: DEATH & HURT (`F00..F05` upright HURT recoil; `F06..F29` collapse -> horizontal prone `F22..F29`)
    # --------------------------------------------------------------------------
    if row == 5:
        if f <= 5:
            u = math.sin((f / 5.0) * math.pi)
            return compose_stand_rig(
                stand_parts,
                stand_meta,
                body_dx=-5.5 * u,
                body_dy=-1.5 * u,
                torso_rot=-12.0 * u,
                head_rot=-16.0 * u,
                front_leg_rot=10.0 * u,
                back_leg_rot=-8.0 * u,
                hair_phase=f * 0.5,
                hair_billow=1.25,
                wing_flap=-14.0 * u,
                lance_hand_offset=(8.0 - 5.0 * u, 9.0 + 4.0 * u),
                lance_angle=48.0 + 20.0 * u,
            )
        if f <= 21:
            u = (f - 6) / 15.0
            rot = -14.0 - 74.0 * (u ** 1.35)
            slide_x = 4.0 + 16.0 * u
            kp_im = keyposes["K1_COIL"]["im"].rotate(
                -rot, resample=Image.Resampling.NEAREST, center=(AX, AY - 26)
            )
            rw, rh = kp_im.size
            v_drape = 1.0 - 0.20 * (u ** 1.2)
            kp_im = kp_im.resize((rw, max(8, int(round(rh * v_drape)))), Image.Resampling.NEAREST)
            layer = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
            layer.paste(kp_im, (int(round(slide_x)), 0))
            b_tmp = np.array(layer, dtype=np.uint8)
            ys_p, _ = np.where(b_tmp[:, :, 3] > 0)
            c = np.zeros((LH, LW, 4), dtype=np.uint8)
            if len(ys_p) > 0:
                dy_ground = (AY - 1) - int(ys_p.max())
                for yy in range(LH):
                    ny = yy + dy_ground
                    if 2 <= ny < LH - 2:
                        c[ny] = b_tmp[yy]
            draw_gungnir_war_lance(c, AX + 18.0 + u * 12.0, min(111.0, AY - 20.0 + u * 17.0), 6.0 * (1.0 - u), fore_len=36.0, back_len=14.0, blazing=(u < 0.7))
            c = seal_160_char_pinholes_and_leaks(
                c, max_pinhole_lpx=8, min_detached_lpx=4, max_orphan_lpx=22, orphan_dist_lpx=4.0, bridge_max_lpx=64, bridge_gap_lpx=3.0
            )
            c[AY:, :, :] = 0
            return c
        sub = f - 22
        kp_im = keyposes["K1_COIL"]["im"].rotate(
            88.0, resample=Image.Resampling.NEAREST, center=(AX, AY - 26)
        )
        rw, rh = kp_im.size
        kp_im = kp_im.resize((rw, max(8, int(round(rh * 0.80)))), Image.Resampling.NEAREST)
        layer = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
        layer.paste(kp_im, (20, 0))
        b_tmp = np.array(layer, dtype=np.uint8)
        ys_p, _ = np.where(b_tmp[:, :, 3] > 0)
        c = np.zeros((LH, LW, 4), dtype=np.uint8)
        if len(ys_p) > 0:
            dy_ground = (AY - 1) - int(ys_p.max())
            for yy in range(LH):
                ny = yy + dy_ground
                if 2 <= ny < LH - 2:
                    c[ny] = b_tmp[yy]
        draw_gungnir_war_lance(c, AX + 26.0, 108.0, 1.5, fore_len=36.0, back_len=14.0, blazing=False)
        c = seal_160_char_pinholes_and_leaks(
            c, max_pinhole_lpx=8, min_detached_lpx=4, max_orphan_lpx=22, orphan_dist_lpx=4.0, bridge_max_lpx=64, bridge_gap_lpx=3.0
        )
        c[AY:, :, :] = 0
        col_sp = GOLD_SPEC if sub % 2 == 0 else CRIMSON_ROSE
        gx_p, gy_p = AX + 16 + (sub % 4) * 2, 96 - (sub % 2)
        for ox, oy in ((0, 0), (1, 0), (0, -1), (1, -1)):
            put_px(c, gx_p + ox, gy_p + oy, col_sp)
        return c

    # --------------------------------------------------------------------------
    # ROW 6: DASH — Winged Valkyrie Crimson-Jet Glide
    # --------------------------------------------------------------------------
    if row == 6:
        pulse = math.sin(tau_f * 2.0)
        c = compose_keypose(
            keyposes,
            "K4_LEAP" if 4 <= f <= 23 else "K2_LUNGE",
            dx=8.0 + pulse * 1.5,
            dy=-4.0 if 4 <= f <= 23 else 0.0,
            hair_phase=tau_f * 3.0,
            hair_billow=1.65,
            wing_flap=16.0 + pulse * 4.0,
            lance_hand_offset=(21.0, 1.0 + pulse * 0.6),
            lance_angle=4.0,
            lance_fore=47.0,
        )
        for s_idx in range(3):
            sx0 = 10 + ((f * 7 + s_idx * 13) % 18)
            sy0 = 56 + s_idx * 16 + (f % 3)
            draw_thick_line(c, sx0, sy0, sx0 + 16, sy0, 0.5, GOLD_SPEC if s_idx == 1 else CRIMSON_ROSE)
        return c

    # --------------------------------------------------------------------------
    # ROW 7: CROUCH — ARTICULATED `-360 DEG` VALKYRIE AERIAL BACKFLIP (`210..239`)
    #   `F00..F02`: Spring crouch & Gungnir parry flash
    #   `F03..F22`: Full `-360 deg` backward Valkyrie somersault (`K1_COIL` tucked spin + crimson-gold feather arc)
    #   `F23..F29`: Crisp athletic Valkyrie landing settle
    # --------------------------------------------------------------------------
    if row == 7:
        if f <= 2:
            u = f / 2.0
            return compose_keypose(
                keyposes,
                "K1_COIL",
                dx=-2.0,
                dy=2.0 + u * 2.0,
                hair_phase=tau_f,
                hair_billow=1.1,
                wing_flap=-10.0,
                lance_hand_offset=(14.0, -4.0),
                lance_angle=-46.0,
                lance_fore=42.0,
            )
        if f <= 22:
            u = (f - 3) / 19.0
            spin_deg = -360.0 * u  # Genuine backward `-360 deg` flip baked into sprite cells!
            arc_y = -18.0 * math.sin(u * math.pi)
            c = np.zeros((LH, LW, 4), dtype=np.uint8)
            # Compose tucked Valkyrie frame at center then spin cleanly around mid-torso `(AX, 70)`
            base_tuck = compose_keypose(
                keyposes,
                "K1_COIL",
                dx=0.0,
                dy=-6.0,
                hair_phase=tau_f * 2.0,
                hair_billow=1.4,
                wing_flap=14.0,
                lance_hand_offset=(10.0, 2.0),
                lance_angle=24.0,
                lance_fore=34.0,
                lance_back=12.0,
            )
            rot_im = Image.fromarray(base_tuck, mode="RGBA").rotate(
                -spin_deg, resample=Image.Resampling.NEAREST, center=(AX, 68)
            )
            layer = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
            layer.paste(rot_im, (0, int(round(arc_y * 0.45))))
            c = np.array(layer, dtype=np.uint8)
            # Subtle crimson-gold backflip ribbon spark
            ang_sp = math.radians(spin_deg - 90.0)
            put_px(c, int(round(AX + math.cos(ang_sp) * 24)), int(round(66 + math.sin(ang_sp) * 20)), GOLD_SPEC)
            put_px(c, int(round(AX + math.cos(ang_sp - 0.3) * 23)), int(round(66 + math.sin(ang_sp - 0.3) * 19)), CRIMSON_ROSE)
            return c
        u = (f - 23) / 6.0
        return compose_stand_rig(
            stand_parts,
            stand_meta,
            body_dx=2.0 * (1.0 - u),
            body_dy=2.5 * (1.0 - u),
            hair_phase=tau_f,
            hair_billow=0.9,
            wing_flap=flap,
            lance_hand_offset=(15.5, 4.5),
            lance_angle=16.0,
        )

    # --------------------------------------------------------------------------
    # ROW 8: JUMP — Winged Valkyrie Vault & Plunging Spear Slash
    # --------------------------------------------------------------------------
    if row == 8:
        if f <= 3:
            u = f / 3.0
            return compose_keypose(
                keyposes,
                "K1_COIL",
                dx=0.0,
                dy=2.5 * u,
                hair_phase=tau_f,
                hair_billow=1.0,
                wing_flap=-12.0,
                lance_hand_offset=(-6.0, 4.0),
                lance_angle=145.0,
                lance_fore=41.0,
            )
        if f <= 17:
            u = (f - 4) / 13.0
            arc_y = -11.0 * math.sin(u * math.pi)
            return compose_keypose(
                keyposes,
                "K4_LEAP",
                dx=4.0,
                dy=arc_y,
                hair_phase=tau_f * 2.0,
                hair_billow=1.5,
                wing_flap=16.0 * math.sin(u * math.pi),
                sovereign_wings=(7 <= f <= 14),
                lance_hand_offset=(16.5, 1.5 + u * 5.0),
                lance_angle=-28.0 + u * 42.0,
                lance_fore=44.0,
                lance_back=12.0,
            )
        if f <= 24:
            u = (f - 18) / 6.0
            return compose_keypose(
                keyposes,
                "K4_LEAP" if f <= 21 else "K2_LUNGE",
                dx=8.0,
                dy=-6.0 * (1.0 - u),
                hair_phase=tau_f * 2.0,
                hair_billow=1.5,
                wing_flap=14.0,
                lance_hand_offset=(19.0, 6.0),
                lance_angle=28.0,
                lance_fore=47.0,
            )
        u = (f - 25) / 4.0
        return compose_stand_rig(
            stand_parts,
            stand_meta,
            body_dy=2.0 * (1.0 - u),
            hair_phase=tau_f,
            hair_billow=0.8,
            wing_flap=flap,
            lance_hand_offset=(15.5, 4.5),
            lance_angle=16.0,
        )

    # --------------------------------------------------------------------------
    # ROW 9: VICTORY — Sovereign Wing Spread & Gungnir Stone Plant
    # --------------------------------------------------------------------------
    if f <= 10:
        u = f / 10.0
        return compose_keypose(
            keyposes,
            "K3_RISE",
            dx=0.0,
            dy=-2.0 * math.sin(u * math.pi),
            hair_phase=tau_f,
            hair_billow=1.3,
            wing_flap=16.0 * math.sin(u * math.pi),
            sovereign_wings=True,
            lance_hand_offset=(17.0, -2.0),
            lance_angle=-46.0 + u * 20.0,
            lance_fore=43.0,
            lance_back=12.0,
        )
    u = (f - 11) / 18.0
    return compose_stand_rig(
        stand_parts,
        stand_meta,
        body_dy=math.sin(u * math.tau) * 0.8,
        torso_rot=2.0,
        hair_phase=tau_f,
        hair_billow=1.0,
        wing_flap=14.0 + math.sin(u * math.tau) * 4.0,
        sovereign_wings=True,
        # Gungnir War-Lance planted vertically with butt on ground (`-90 deg` spearhead UP!) cleanly beside her!
        lance_hand_offset=(21.0, -4.0),
        lance_angle=-90.0,
        lance_fore=44.0,
        lance_back=24.0,
    )


# ==============================================================================
# 6. Margin Safety, 2x Nearest Upscale, Portrait Builder & QA Contact Sheets
# ==============================================================================
def enforce_logical_margin_and_binary_alpha(frame_160x120: np.ndarray) -> np.ndarray:
    out = frame_160x120.copy()
    bayer4 = (
        (0.0625, 0.5625, 0.1875, 0.6875),
        (0.8125, 0.3125, 0.9375, 0.4375),
        (0.2500, 0.7500, 0.1250, 0.6250),
        (1.0000, 0.5000, 0.8750, 0.3750),
    )
    for y in range(2, 8):
        u = (y - 2) / 6.0
        for x in range(LW):
            if out[y, x, 3] > 0 and u <= bayer4[y & 3][x & 3]:
                out[y, x] = 0
    out[:2, :, :] = 0
    out[-2:, :, :] = 0
    out[:, :2, :] = 0
    out[:, -2:, :] = 0
    out[:, :, 3] = np.where(out[:, :, 3] >= 120, 255, 0)
    mask0 = out[:, :, 3] == 0
    out[mask0] = 0
    return out


def build_portrait_128():
    raw = Image.open(PORTRAIT_RAW_JPG).convert("RGB")
    # Crop inside (76, 88, 956, 968) -> 880x880 frameless square excluding outer rune border & top "FREYJA EX" header!
    bust = raw.crop((76, 88, 956, 968))
    p64 = bust.resize((64, 64), Image.Resampling.LANCZOS)
    arr = np.array(p64, dtype=np.uint8)
    arr = ((arr.astype(np.uint16) + 3) // 6 * 6).clip(0, 255).astype(np.uint8)
    p128 = Image.fromarray(arr, mode="RGB").resize((128, 128), Image.Resampling.NEAREST)
    p128.save(OUT_PORTRAIT)
    return p128


def main():
    SCRATCH_DIR.mkdir(parents=True, exist_ok=True)
    stand_parts, stand_meta, keyposes = load_stand_and_keyposes()

    kp_dbg = Image.new("RGBA", (CELL_W * 5, CELL_H), (14, 10, 20, 255))
    kp_list = [
        compose_stand_rig(stand_parts, stand_meta),
        compose_keypose(keyposes, "K1_COIL"),
        compose_keypose(keyposes, "K2_LUNGE"),
        compose_keypose(keyposes, "K3_RISE", sovereign_wings=True),
        compose_keypose(keyposes, "K4_LEAP", sovereign_wings=True),
    ]
    for idx, arr in enumerate(kp_list):
        up = Image.fromarray(enforce_logical_margin_and_binary_alpha(arr), mode="RGBA").resize((CELL_W, CELL_H), Image.Resampling.NEAREST)
        kp_dbg.alpha_composite(up, (idx * CELL_W, 0))
    kp_dbg.save(SCRATCH_DIR / "debug_valkyrie_ex_rig_5poses.png")

    sheet = Image.new("RGBA", (CELL_W * COLS, CELL_H * ROWS), (0, 0, 0, 0))
    border_clips = 0
    row_transitions = []
    row0_frames_320 = []
    row1_frames_320 = []
    row2_frames_320 = []
    row3_frames_320 = []
    row4_frames_320 = []
    row5_frames_320 = []
    row8_frames_320 = []
    row9_frames_320 = []

    sample_cols = [0, 3, 9, 17, 24, 25]
    ten_rows_dbg = Image.new("RGBA", (len(sample_cols) * CELL_W, ROWS * CELL_H), (16, 10, 22, 255))

    for r in range(ROWS):
        prev_320 = None
        trans = 0
        for c in range(COLS):
            raw_logical = render_frame(r, c, stand_parts, stand_meta, keyposes)
            clean_logical = enforce_logical_margin_and_binary_alpha(raw_logical)
            im_320 = Image.fromarray(clean_logical, mode="RGBA").resize((CELL_W, CELL_H), Image.Resampling.NEAREST)
            arr_320 = np.array(im_320, dtype=np.uint8)

            if (
                arr_320[:4, :, 3].any()
                or arr_320[-4:, :, 3].any()
                or arr_320[:, :4, 3].any()
                or arr_320[:, -4:, 3].any()
            ):
                border_clips += 1

            if prev_320 is not None and not np.array_equal(prev_320, arr_320):
                trans += 1
            prev_320 = arr_320

            sheet.paste(im_320, (c * CELL_W, r * CELL_H))
            if r == 0:
                row0_frames_320.append(im_320)
            elif r == 1:
                row1_frames_320.append(im_320)
            elif r == 2:
                row2_frames_320.append(im_320)
            elif r == 3:
                row3_frames_320.append(im_320)
            elif r == 4:
                row4_frames_320.append(im_320)
            elif r == 5:
                row5_frames_320.append(im_320)
            elif r == 8:
                row8_frames_320.append(im_320)
            elif r == 9:
                row9_frames_320.append(im_320)
            if c in sample_cols:
                s_idx = sample_cols.index(c)
                ten_rows_dbg.alpha_composite(im_320, (s_idx * CELL_W, r * CELL_H))

        row_transitions.append(trans)

    import struct
    import zlib
    arr_rgba = np.asarray(sheet, dtype=np.uint8)
    raw_scan = np.hstack([np.zeros((SHEET_H, 1), dtype=np.uint8), arr_rgba.reshape(SHEET_H, SHEET_W * 4)]).tobytes()
    def _png_chunk(tag: bytes, payload: bytes) -> bytes:
        return struct.pack(">I", len(payload)) + tag + payload + struct.pack(">I", zlib.crc32(tag + payload) & 0xFFFFFFFF)
    OUT_SHEET.write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + _png_chunk(b"IHDR", struct.pack(">IIBBBBB", SHEET_W, SHEET_H, 8, 6, 0, 0, 0))
        + _png_chunk(b"IDAT", zlib.compress(raw_scan, level=3))
        + _png_chunk(b"IEND", b"")
    )
    ten_rows_dbg.save(SCRATCH_DIR / "debug_valkyrie_ex_10rows.png")

    def _save_row_grid(frames_320, tag_prefix: str, out_name: str):
        dbg = Image.new("RGBA", (6 * CELL_W, 5 * CELL_H), (18, 10, 24, 255))
        dr_ = ImageDraw.Draw(dbg)
        for idx, im_320 in enumerate(frames_320):
            gx = (idx % 6) * CELL_W
            gy = (idx // 6) * CELL_H
            dbg.alpha_composite(im_320, (gx, gy))
            dr_.rectangle([gx, gy, gx + CELL_W - 1, gy + CELL_H - 1], outline=(95, 45, 65, 255), width=1)
            dr_.line([(gx, gy + 230), (gx + CELL_W - 1, gy + 230)], fill=(250, 204, 21, 90), width=1)
            dr_.line([(gx + 112, gy), (gx + 112, gy + CELL_H - 1)], fill=(251, 113, 133, 90), width=1)
            dr_.text((gx + 8, gy + 6), f"{tag_prefix} F{idx:02d}", fill=(250, 204, 21, 255))
        dbg.save(SCRATCH_DIR / out_name)

    _save_row_grid(row1_frames_320, "R1", "debug_valkyrie_ex_row1_walk.png")
    _save_row_grid(row2_frames_320, "R2", "debug_valkyrie_ex_row2.png")
    _save_row_grid(row3_frames_320, "R3", "debug_valkyrie_ex_row3.png")
    _save_row_grid(row4_frames_320, "R4", "debug_valkyrie_ex_row4.png")
    _save_row_grid(row8_frames_320, "R8", "debug_valkyrie_ex_row8.png")
    _save_row_grid(row9_frames_320, "R9", "debug_valkyrie_ex_row9.png")

    if "--rebuild-portrait" in sys.argv or not OUT_PORTRAIT.exists():
        p128 = build_portrait_128()
    else:
        p128 = Image.open(OUT_PORTRAIT)
    p128.save(SCRATCH_DIR / "debug_valkyrie_ex_portrait.png")

    snap_reach = {}
    snap_front_px = {}
    for sf in (3, 9, 17, 25):
        a = np.array(row2_frames_320[sf])[:, :, 3] > 0
        xs = np.where(a)[1]
        snap_reach[f"F{sf:02d}"] = int(xs.max()) if len(xs) else 0
        snap_front_px[f"F{sf:02d}"] = int(np.sum(a[:, 201:]))

    # Symmetrical Twin Upper-Wing Check (`y in [56..118]` has pixels at both `x < 96` and `x > 132` across all 30 frames of Row 0 & Row 1)
    for r_idx, frames_320 in ((0, row0_frames_320), (1, row1_frames_320)):
        min_r_max_x = 320
        for f_idx, im_f in enumerate(frames_320):
            band = np.array(im_f)[56:119, :, 3] > 0
            left_wing_ok = bool(band[:, :96].any())
            right_wing_ok = bool(band[:, 133:].any())
            right_xs = np.where(band)[1]
            r_max_x = int(right_xs.max()) if len(right_xs) else 0
            min_r_max_x = min(min_r_max_x, r_max_x)
            assert left_wing_ok and right_wing_ok, (
                f"Row {r_idx} F{f_idx:02d} missing symmetrical upper wing in y[56..118]: left={left_wing_ok}, right={right_wing_ok}"
            )
            assert r_max_x > 136, f"Row {r_idx} F{f_idx:02d} right wing maxX={r_max_x} <= 136"
        print(f"[valkyrie_ex] Row {r_idx} symmetrical twin upper wings OK across all 30 frames (minRightWingMaxX={min_r_max_x} > 136)")

    # Quantitative Row 1 Walk Crossover Gate (#124 + Suite 36.2 boot_band)
    foot_spans = []
    boot_spans = []
    top_ys = []
    for f_idx, im_w in enumerate(row1_frames_320):
        a_w = np.array(im_w)[:, :, 3] > 0
        ys_w, _ = np.where(a_w)
        top_ys.append(int(ys_w.min()))
        _, xs_b = np.where(a_w[206:233, :])
        foot_spans.append(int(xs_b.max() - xs_b.min()) if len(xs_b) else 0)
        _, xs_boot = np.where(a_w[218:234, :])
        boot_spans.append(int(xs_boot.max() - xs_boot.min() + 1) if len(xs_boot) else 0)
    max_fspan = max(foot_spans)
    min_fspan = min(foot_spans)
    max_bspan = max(boot_spans)
    min_bspan = min(boot_spans)
    max_adj_top = max(abs(top_ys[i] - top_ys[(i + 1) % 30]) for i in range(30))
    print(f"[valkyrie_ex] Row 1 footSpan320: F00={foot_spans[0]} F07={foot_spans[7]} F15={foot_spans[15]} F22={foot_spans[22]} | min={min_fspan} max={max_fspan} ratio={min_fspan/max(1,max_fspan):.2f} | maxAdjTopDelta={max_adj_top}")
    print(f"[valkyrie_ex] Row 1 bootBand218..233: min={min_bspan} max={max_bspan} ratio={min_bspan/max(1,max_bspan):.3f}")
    assert foot_spans[0] >= 34 and foot_spans[15] >= 34, f"Walk stride too narrow: F00={foot_spans[0]}, F15={foot_spans[15]}"
    assert foot_spans[7] <= max_fspan * 0.55 and foot_spans[22] <= max_fspan * 0.55, (
        f"Walk crossover failed: F07={foot_spans[7]}, F22={foot_spans[22]}, max={max_fspan}"
    )
    assert max_bspan >= 56 and min_bspan <= max_bspan * 0.55, (
        f"Suite 36.2 boot_band failed: min={min_bspan}, max={max_bspan}"
    )
    assert max_adj_top <= 4, f"Walk head bob > 4px: {max_adj_top}"

    # Row 5 DEATH & Row 9 VICTORY bounds (Suite 36.3)
    max_death_h = 0
    min_death_x = 320
    max_death_x = 0
    min_vic_h = 999
    for c in range(26, 30):
        ad = np.array(row5_frames_320[c])[:, :, 3] > 0
        yd, xd = np.where(ad)
        max_death_h = max(max_death_h, int(yd.max() - yd.min() + 1))
        min_death_x = min(min_death_x, int(xd.min()))
        max_death_x = max(max_death_x, int(xd.max()))
        av = np.array(row9_frames_320[c])[:, :, 3] > 0
        yv, _ = np.where(av)
        min_vic_h = min(min_vic_h, int(yv.max() - yv.min() + 1))
    print(f"[valkyrie_ex] Row 5 DEATH F26..29: maxH={max_death_h} x=[{min_death_x}..{max_death_x}] | Row 9 VICTORY minH={min_vic_h}")
    assert max_death_h <= 104 and min_death_x >= 18 and max_death_x <= 302 and min_vic_h >= 150

    print(f"[valkyrie_ex] Wrote {OUT_SHEET} ({sheet.size[0]}x{sheet.size[1]}) | portrait={OUT_PORTRAIT} ({p128.size[0]}x{p128.size[1]})")
    print(f"[valkyrie_ex] border_clips={border_clips}/300 | row_transitions={row_transitions}")
    print(f"[valkyrie_ex] Row 2 snap x_max (out of 320, anchorX=112): {snap_reach} | frontPx(>200): {snap_front_px}")
    if border_clips > 0 or any(t < 29 for t in row_transitions) or any(rx > 262 for rx in snap_reach.values()):
        raise SystemExit("FAILED QA invariants on valkyrie_ex_sheet.png!")


if __name__ == "__main__":
    main()
