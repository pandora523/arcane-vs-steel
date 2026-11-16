#!/usr/bin/env python3
"""
Next-Gen 30fps Wide-Canvas (320x240) Sprite Sheet & Portrait Builder for
CHRONOS EX (`chronomancer_ex` -> `ChronomancerEx`).

Architecture (FFBE / Last Cloudia Next-Gen Pipeline):
  1. Multi-Keypose Full-Body Base Switching (`STAND`, `K1_COIL`, `K2_LUNGE`, `K3_RISE`, `K4_LEAP`)
     from `assets/sprites/chronomancer_ex_base.jpg` + `assets/sprites/chronomancer_ex_keyposes_ref.jpg`,
     with quantitative enclosed-pocket removal and AI open-hand/arm stripping (`0` white halos, `0` extra hands).
  2. Bespoke Pixel-Art Attachments on `160x120` logical canvas (`2x NEAREST` -> `320x240`):
     - Rotating 12-Cog **XII Brass Escapement Clock-Wheel Back Halo**
     - Dynamic **Teal & Brass Gear-Tooth Coat Tails** (30fps secondary cloth waves)
     - 2-Bone IK **Twin Hands of Fate**:
       * Lead Right Hand: **Ornate Brass & Turquoise Minute-Glaive** (`46` logical px / `92px` world reach)
       * Off-Hand: **Crimson-Gold Hour Short-Blade** (`27` logical px / `54px` world reach)
  3. 1-Frame Pose Snap + 4-Band Serrated Horological & Twin-Blade Smears on `Row 2 AUTO_ATTACK`:
     - `V0 (F03)`: 1-frame snap Minute-Glaive diagonal cleave smear (`#ffffff -> #99f6e4 -> #2dd4bf -> #0f766e` + `#facc15` inner gear teeth)
     - `V1 (F09)`: 1-frame snap Twin-Blade X-Scissor rising smear (Turquoise Minute-Glaive x Crimson-Gold Hour-Blade)
     - `V2 (F17..F18)`: 2.5D foreshortened XII-dial vortex spin smear (`2-hit`)
     - `V3 (F23..F25)`: Airborne `K4_LEAP` -> Twelfth-Chime Twin-Blade guillotine slam smear + vertical XII Clock-Spire

Outputs:
  - `assets/sprites/chronomancer_ex_sheet.png` (`9600x2400`, `10x30 @ 320x240`, `anchorX=112, anchorY=230`)
  - `assets/sprites/chronomancer_ex_portrait.png` (`128x128`, frameless 16-bit HD-2D bust)
  - Untracked visual QA contact sheets in `<brain>/scratch/debug_chronomancer_ex_*.png`
"""

from collections import deque
import math
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

REPO_ROOT = Path(__file__).resolve().parent.parent
SPRITES_DIR = REPO_ROOT / "assets" / "sprites"
SCRATCH_DIR = Path("/Users/rei/.gemini/antigravity/brain/5416474b-0e5f-4471-85c8-b7a88055e218/scratch")

BASE_JPG = SPRITES_DIR / "chronomancer_ex_base.jpg"
KEYPOSES_JPG = SPRITES_DIR / "chronomancer_ex_keyposes_ref.jpg"
PORTRAIT_RAW_JPG = SPRITES_DIR / "chronomancer_ex_portrait_raw.jpg"

OUT_SHEET = SPRITES_DIR / "chronomancer_ex_sheet.png"
OUT_PORTRAIT = SPRITES_DIR / "chronomancer_ex_portrait.png"

LW, LH = 160, 120
CELL_W, CELL_H = 320, 240
AX, AY = 56, 115  # 2x -> anchorX = 112, anchorY = 230
COLS = 30
ROWS = 10

OUTLINE = (5, 8, 20, 255)

# Coat palette (deep horological teal + burnished brass gear-tooth trim)
COAT_DARK = (9, 34, 40, 255)
COAT_MID = (15, 62, 68, 255)
COAT_BRIGHT = (24, 96, 102, 255)
BRASS_DARK = (114, 62, 18, 255)
BRASS_MID = (196, 128, 30, 255)
BRASS_GOLD = (250, 204, 21, 255)
BRASS_SPEC = (254, 240, 138, 255)

# Twin Hands of Fate palettes
TEAL_DEEP = (15, 118, 110, 255)
TEAL_MID = (45, 212, 191, 255)
TEAL_BRIGHT = (153, 246, 228, 255)
CRIMSON_DEEP = (136, 19, 55, 255)
CRIMSON_MID = (190, 18, 60, 255)
CRIMSON_BRIGHT = (251, 113, 133, 255)
PURE_WHITE = (255, 255, 255, 255)


# ==============================================================================
# 1. Clean Background Removal, Enclosed Pocket Floodfill & Skin-Patch Cleanup
# ==============================================================================
def defringe_and_remove_bg_512(
    img_rgb: Image.Image,
    pocket_seeds=(),
    strip_polys=(),
    skin_cleanup_boxes=(),
    fill_rgba=(12, 48, 54, 255),
) -> np.ndarray:
    arr = np.array(img_rgb.convert("RGBA"), dtype=np.uint8)
    h, w, _ = arr.shape
    rgb = arr[:, :, :3].astype(np.int16)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    sat = mx - mn

    near_white = ((r >= 220) & (g >= 220) & (b >= 220) & (sat <= 26)) | (
        (r >= 238) & (g >= 238) & (b >= 238) & (sat <= 38)
    )

    bg = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if near_white[y, x] and not bg[y, x]:
                bg[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if near_white[y, x] and not bg[y, x]:
                bg[y, x] = True
                q.append((y, x))

    # Strict pure-white threshold for internal pockets so cyan/mint highlights never bleed
    pocket_white = (r >= 236) & (g >= 236) & (b >= 236) & (sat <= 16)
    for sx, sy in pocket_seeds:
        if 0 <= sx < w and 0 <= sy < h and not bg[sy, sx]:
            if pocket_white[sy, sx] or near_white[sy, sx]:
                bg[sy, sx] = True
                q.append((sy, sx))

    while q:
        cy, cx = q.popleft()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and not bg[ny, nx]:
                if near_white[ny, nx]:
                    bg[ny, nx] = True
                    q.append((ny, nx))

    # 2 passes of neutral bright halo stripping adjacent to background
    for _ in range(2):
        adj = np.zeros((h, w), dtype=bool)
        adj[1:, :] |= bg[:-1, :]
        adj[:-1, :] |= bg[1:, :]
        adj[:, 1:] |= bg[:, :-1]
        adj[:, :-1] |= bg[:, 1:]
        fringe = adj & (~bg) & (mn >= 190) & (sat <= 38)
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

    # Replace any residual peach fingers sitting directly over dark coat fabric
    for x0, y0, x1, y1 in skin_cleanup_boxes:
        sub = arr[y0:y1, x0:x1]
        sr = sub[:, :, 0].astype(np.int16)
        sg = sub[:, :, 1].astype(np.int16)
        sb = sub[:, :, 2].astype(np.int16)
        sa = sub[:, :, 3]
        is_peach = (sa > 0) & (sr >= 145) & ((sr - sb) >= 34) & (sr > sg)
        sub[is_peach, 0] = fill_rgba[0]
        sub[is_peach, 1] = fill_rgba[1]
        sub[is_peach, 2] = fill_rgba[2]
        sub[is_peach, 3] = fill_rgba[3]

    # Re-outline exposed interior edges in crisp dark ink
    alpha = arr[:, :, 3] > 0
    trans = ~alpha
    edge = alpha & (
        np.pad(trans[1:, :], ((0, 1), (0, 0)), constant_values=True)
        | np.pad(trans[:-1, :], ((1, 0), (0, 0)), constant_values=True)
        | np.pad(trans[:, 1:], ((0, 0), (0, 1)), constant_values=True)
        | np.pad(trans[:, :-1], ((0, 0), (1, 0)), constant_values=True)
    )
    bright_edge = edge & (mn >= 150) & (sat <= 46)
    arr[bright_edge, 0] = 9
    arr[bright_edge, 1] = 16
    arr[bright_edge, 2] = 28
    arr[bright_edge, 3] = 255
    return arr


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
    # 1. STAND Base (1024 -> 512)
    base_rgb = Image.open(BASE_JPG).convert("RGB").resize((512, 512), Image.Resampling.LANCZOS)
    stand_512 = defringe_and_remove_bg_512(
        base_rgb,
        pocket_seeds=[(206, 191)],
        # Strip extended right-side empty arm & outer left-side bent elbow so our 2-Bone IK gauntlets take over cleanly
        strip_polys=[
            [(306, 132), (425, 102), (425, 212), (308, 206)],
            [(142, 148), (196, 148), (202, 214), (142, 214)],
        ],
        # Repaint peach open fingers over left coat chest lapel into dark horological teal coat
        skin_cleanup_boxes=[(195, 165, 246, 210)],
        fill_rgba=(14, 52, 58, 255),
    )

    ys, xs = np.where(stand_512[:, :, 3] > 0)
    stand_top, stand_bot = int(ys.min()), int(ys.max())
    stand_h_512 = stand_bot - stand_top + 1  # ~500
    target_stand_h = 87.0
    scale = target_stand_h / stand_h_512
    stand_cx_512 = 262.0

    def to_logical_coords(x512, y512):
        lx = AX + (x512 - stand_cx_512) * scale
        ly = AY - (stand_bot - y512) * scale
        return lx, ly

    part_specs = {
        "back_hair": (
            [(176, 52), (242, 52), (242, 128), (176, 128)],
            (232, 92),
        ),
        "back_cape": (
            [(98, 224), (248, 218), (382, 232), (402, 434), (98, 434)],
            (258, 232),
        ),
        "walk_cape": (
            [(98, 224), (248, 218), (344, 232), (322, 342), (258, 354), (168, 354), (156, 434), (98, 434)],
            (254, 234),
        ),
        "back_leg": (
            [(264, 260), (336, 260), (350, 428), (286, 428)],
            (294, 274),
        ),
        "back_foot": (
            [(286, 418), (376, 418), (382, 506), (286, 506)],
            (312, 432),
        ),
        "w_thigh": (
            [(268, 274), (336, 274), (344, 386), (282, 386)],
            (296, 286),
        ),
        "w_shin": (
            [(284, 374), (344, 374), (342, 468), (296, 468)],
            (312, 384),
        ),
        "w_foot": (
            [(296, 458), (378, 458), (380, 498), (296, 498)],
            (318, 468),
        ),
        "pelvis": (
            [(222, 224), (306, 224), (316, 294), (216, 294)],
            (262, 248),
        ),
        "front_leg": (
            [(182, 262), (264, 262), (254, 428), (168, 428)],
            (236, 276),
        ),
        "front_foot": (
            [(146, 418), (236, 418), (232, 508), (144, 508)],
            (198, 432),
        ),
        "torso": (
            [(194, 118), (316, 118), (312, 246), (196, 246)],
            (262, 224),
        ),
        "head": (
            [(178, 4), (322, 4), (322, 134), (222, 136), (178, 96)],
            (264, 118),
        ),
        "front_pauldron": (
            [(180, 114), (242, 114), (242, 168), (180, 168)],
            (214, 138),
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

    def make_far_part(src_part: PartSprite, name_far: str, rgb_scale: float = 0.68) -> PartSprite:
        arr_f = src_part.rgba.copy()
        fg = arr_f[:, :, 3] > 0
        lum = (
            arr_f[:, :, 0].astype(np.int32) * 299
            + arr_f[:, :, 1].astype(np.int32) * 587
            + arr_f[:, :, 2].astype(np.int32) * 114
        ) // 1000
        tint = fg & (lum > 24)
        arr_f[tint, 0] = (arr_f[tint, 0].astype(np.float32) * rgb_scale).astype(np.uint8)
        arr_f[tint, 1] = (arr_f[tint, 1].astype(np.float32) * (rgb_scale + 0.03)).astype(np.uint8)
        arr_f[tint, 2] = np.minimum(255, (arr_f[tint, 2].astype(np.float32) * (rgb_scale + 0.06)).astype(np.int32)).astype(np.uint8)
        return PartSprite(name_far, arr_f, src_part.pivot_x, src_part.pivot_y)

    stand_parts["w_thigh_far"] = make_far_part(stand_parts["w_thigh"], "w_thigh_far")
    stand_parts["w_shin_far"] = make_far_part(stand_parts["w_shin"], "w_shin_far")
    stand_parts["w_foot_far"] = make_far_part(stand_parts["w_foot"], "w_foot_far")

    # 2. Load 4 Action Keyposes (`2x2` `1024x1024` -> `512x512` tiles)
    kp_sheet = Image.open(KEYPOSES_JPG).convert("RGB")
    kp_configs = {
        "K1_COIL": {
            "crop": (0, 0, 512, 512),
            "pockets": [],
            # Remove coiled empty fists on upper-left while keeping head/crown/coat 100% intact
            "strip": [
                [(136, 90), (235, 92), (242, 138), (244, 194), (146, 196)],
            ],
            "skin_boxes": [],
            "x_ref": 258.0,
            "y_bot": 506.0,
            "sh_front": (228, 148),
            "sh_back": (306, 158),
            "coat_anchor": (246, 252),
        },
        "K2_LUNGE": {
            "crop": (512, 0, 1024, 512),
            "pockets": [],
            # Remove vertical floor-touching forearm & peach fist cleanly below thigh line
            "strip": [
                [(270, 368), (324, 368), (330, 502), (270, 502)],
            ],
            "skin_boxes": [],
            "x_ref": 285.0,
            "y_bot": 501.0,
            "sh_front": (292, 258),
            "sh_back": (340, 262),
            "coat_anchor": (256, 304),
        },
        "K3_RISE": {
            "crop": (0, 512, 512, 1024),
            "pockets": [],
            # Strip both wide open-handed invocation arms right up to the golden shoulder pauldrons
            "strip": [
                [(88, 52), (202, 52), (204, 196), (88, 196)],
                [(316, 90), (464, 90), (464, 196), (316, 196)],
            ],
            "skin_boxes": [],
            "x_ref": 262.0,
            "y_bot": 501.0,
            "sh_front": (218, 144),
            "sh_back": (304, 146),
            "coat_anchor": (248, 258),
        },
        "K4_LEAP": {
            "crop": (512, 512, 1024, 1024),
            # Remove enclosed #FFFFFF triangle between raised thighs at (313, 298)
            "pockets": [(313, 298)],
            # Remove trailing left empty arm & fist in open air
            "strip": [
                [(108, 102), (255, 102), (255, 168), (196, 206), (108, 206)],
            ],
            "skin_boxes": [],
            "x_ref": 285.0,
            "y_bot": 470.0,
            "sh_front": (272, 134),
            "sh_back": (334, 146),
            "coat_anchor": (268, 232),
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

        sh_fx = AX + (cfg["sh_front"][0] - cfg["x_ref"]) * scale
        sh_fy = AY - (cfg["y_bot"] - cfg["sh_front"][1]) * scale
        sh_bx = AX + (cfg["sh_back"][0] - cfg["x_ref"]) * scale
        sh_by = AY - (cfg["y_bot"] - cfg["sh_back"][1]) * scale
        ca_x = AX + (cfg["coat_anchor"][0] - cfg["x_ref"]) * scale
        ca_y = AY - (cfg["y_bot"] - cfg["coat_anchor"][1]) * scale

        keyposes[kname] = {
            "im": Image.fromarray(canvas, mode="RGBA"),
            "rgba": canvas,
            "sh_front": (sh_fx, sh_fy),
            "sh_back": (sh_bx, sh_by),
            "coat_anchor": (ca_x, ca_y),
        }

    stand_meta = {
        "sh_front": to_logical_coords(214, 142),
        "sh_back": to_logical_coords(300, 144),
        "coat_anchor": to_logical_coords(256, 232),
        "scale": scale,
        "stand_cx_512": stand_cx_512,
        "stand_bot": stand_bot,
    }
    return stand_parts, stand_meta, keyposes


# ==============================================================================
# 3. Crisp Pixel-Art Primitives: XII Escapement Halo, Coat Tails, Twin Blades & Smears
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


def draw_escapement_halo(
    canvas: np.ndarray,
    cx: float,
    cy: float,
    radius: float,
    rot_deg: float,
    sovereign_flare: bool = False,
):
    """Draws the rotating 12-Cog XII Brass Escapement Clock-Wheel Back Halo behind Chronos EX."""
    layer = np.zeros((LH, LW, 4), dtype=np.uint8)
    rot = math.radians(rot_deg)
    r_in = max(5.0, radius - 4.5)

    # Outer brass ring + inner turquoise chapter ring
    steps = int(max(48, radius * 6))
    for i in range(steps):
        ang = (i / steps) * math.tau
        ox = int(round(cx + math.cos(ang) * radius))
        oy = int(round(cy + math.sin(ang) * radius))
        put_px(layer, ox, oy, BRASS_SPEC if sovereign_flare and (i % 4 == 0) else BRASS_GOLD)
        ox2 = int(round(cx + math.cos(ang) * (radius - 1.0)))
        oy2 = int(round(cy + math.sin(ang) * (radius - 1.0)))
        put_px(layer, ox2, oy2, BRASS_MID)

        ix = int(round(cx + math.cos(ang) * r_in))
        iy = int(round(cy + math.sin(ang) * r_in))
        put_px(layer, ix, iy, TEAL_BRIGHT if (i % 3 == 0) else TEAL_MID)

    # 12 Rotating Escapement Gear Teeth + 4 Cardinal Clock Spokes
    for cog in range(12):
        ang = rot + (cog / 12.0) * math.tau
        ux, uy = math.cos(ang), math.sin(ang)
        tooth_len = 3.2 if (cog % 3 == 0) else 2.1
        if sovereign_flare:
            tooth_len += 1.2
        draw_thick_line(
            layer,
            cx + ux * radius,
            cy + uy * radius,
            cx + ux * (radius + tooth_len),
            cy + uy * (radius + tooth_len),
            0.75 if cog % 3 == 0 else 0.45,
            BRASS_SPEC if cog == 0 else BRASS_GOLD,
        )
        if cog % 3 == 0:
            draw_thick_line(
                layer,
                cx + ux * 3.0,
                cy + uy * 3.0,
                cx + ux * r_in,
                cy + uy * r_in,
                0.45,
                TEAL_MID if cog % 6 != 0 else BRASS_GOLD,
            )

    if sovereign_flare:
        # Radiant XII Midnight top pointer spire
        draw_thick_line(layer, cx, cy - radius - 1.5, cx, cy - radius - 5.5, 0.9, PURE_WHITE)
        draw_thick_line(layer, cx, cy - radius - 1.5, cx, cy - radius - 4.0, 1.3, TEAL_BRIGHT)

    layer = outline_layer(layer, OUTLINE)
    composite_np(canvas, layer)


def draw_chrono_coat_tails(
    canvas: np.ndarray,
    ax: float,
    ay: float,
    phase: float,
    billow: float = 1.0,
    lift: float = 0.0,
):
    """Flowing dark-teal horological coat tail with brass gear-tooth trim behind legs."""
    layer = np.zeros((LH, LW, 4), dtype=np.uint8)
    pts_top = []
    pts_bot = []
    steps = 16
    length = 26.0 + 4.5 * billow
    for i in range(steps + 1):
        u = i / steps
        wave = math.sin(phase - u * 3.3) * (2.2 + 2.6 * billow) * u
        x = ax - u * length
        y_mid = ay + u * (17.0 - lift * 7.5) + wave
        half_w = 2.6 + u * (6.2 + 1.8 * billow)
        pts_top.append((x, y_mid - half_w * 0.48))
        pts_bot.append((x, y_mid + half_w * 0.62))

    poly = pts_top + pts_bot[::-1]
    im = Image.fromarray(layer, mode="RGBA")
    dr = ImageDraw.Draw(im)
    dr.polygon(poly, fill=COAT_DARK)

    mid_poly = [
        (p[0], p[1] + 1.4) for p in pts_top
    ] + [(p[0], p[1] - 1.4) for p in pts_bot[::-1]]
    dr.polygon(mid_poly, fill=COAT_MID)
    layer = np.array(im, dtype=np.uint8)

    # Brass gear-tooth hem along trailing bottom edge
    for i in range(2, len(pts_bot) - 1):
        bx, by = pts_bot[i]
        put_px(layer, int(round(bx)), int(round(by - 1)), BRASS_GOLD if i % 2 == 0 else BRASS_MID)
        if i % 3 == 0:
            put_px(layer, int(round(bx)), int(round(by)), BRASS_SPEC)

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


def draw_chrono_ik_arm(canvas: np.ndarray, sx, sy, tx, ty, bend_sign=1.0, is_back=False):
    (ex, ey), (hx, hy) = solve_2bone_ik(sx, sy, tx, ty, 8.8, 8.8, bend_sign=bend_sign)
    layer = np.zeros((LH, LW, 4), dtype=np.uint8)
    sleeve = COAT_DARK if is_back else COAT_MID
    cuff = BRASS_MID if is_back else BRASS_GOLD
    draw_thick_line(layer, sx, sy, ex, ey, 2.25, sleeve)
    draw_thick_line(layer, sx, sy, ex, ey, 1.0, COAT_BRIGHT if not is_back else COAT_MID)
    draw_thick_line(layer, ex, ey, hx, hy, 1.95, BRASS_DARK if is_back else sleeve)
    draw_thick_line(layer, ex + (hx - ex) * 0.45, ey + (hy - ey) * 0.45, hx, hy, 1.5, cuff)
    # Armored clockwork gauntlet fist
    for oy in range(-2, 3):
        for ox in range(-2, 3):
            if ox * ox + oy * oy <= 4:
                put_px(layer, int(round(hx + ox)), int(round(hy + oy)), cuff)
    put_px(layer, int(round(hx)), int(round(hy - 1)), BRASS_SPEC)
    layer = outline_layer(layer, OUTLINE)
    composite_np(canvas, layer)
    return hx, hy


def draw_minute_glaive(
    canvas: np.ndarray,
    hx: float,
    hy: float,
    angle_deg: float,
    blade_len: float = 46.0,
    chrono_glow: bool = True,
):
    """
    Ornate Brass-and-Turquoise Minute-Glaive (Long Hand of Fate):
      - Brass clockwork astrolabe crossguard + glowing turquoise escapement jewel
      - Single-edged long horological sword-glaive with brass spine, luminous turquoise fuller,
        clock-tooth serrations near the guard, and pure-white razor edge.
    """
    rad = math.radians(angle_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    nx, ny = -uy, ux

    layer = np.zeros((LH, LW, 4), dtype=np.uint8)

    # Pommel & grip
    px, py = hx - ux * 6.5, hy - uy * 6.5
    draw_thick_line(layer, px, py, hx + ux * 1.5, hy + uy * 1.5, 1.25, BRASS_DARK)
    put_px(layer, int(round(px)), int(round(py)), BRASS_GOLD)
    put_px(layer, int(round(px - ux)), int(round(py - uy)), TEAL_BRIGHT)

    # Astrolabe crossguard with clockwork teeth
    gx, gy = hx + ux * 2.2, hy + uy * 2.2
    draw_thick_line(layer, gx - nx * 5.2 - ux * 1.0, gy - ny * 5.2 - uy * 1.0, gx + nx * 5.2 - ux * 1.0, gy + ny * 5.2 - uy * 1.0, 1.35, BRASS_GOLD)
    draw_thick_line(layer, gx - nx * 3.4 + ux * 1.0, gy - ny * 3.4 + uy * 1.0, gx + nx * 3.4 + ux * 1.0, gy + ny * 3.4 + uy * 1.0, 1.0, BRASS_SPEC)

    # Long curved/tapered Minute-Glaive blade
    steps = int(max(24, blade_len * 2.2))
    for i in range(steps + 1):
        u = i / steps
        bx = gx + ux * (u * blade_len)
        by = gy + uy * (u * blade_len)
        # Broad flaring glaive profile peaking around u = 0.68 before tapering to needle tip
        flare = math.sin(min(1.0, u * 1.15) * math.pi * 0.72)
        w_edge = (2.1 + 1.55 * flare) * (1.0 - 0.78 * (u ** 2.6))
        w_spine = (1.35 + 0.4 * (1.0 - u)) * (1.0 - 0.72 * (u ** 2.4))

        # Brass horological spine + gear notches
        for s in np.linspace(-w_spine, 0.2, 4):
            put_px(layer, int(round(bx + nx * s)), int(round(by + ny * s)), BRASS_GOLD if u < 0.75 else TEAL_BRIGHT)
        if 0.12 < u < 0.48 and (i % 5 == 0):
            put_px(layer, int(round(bx - nx * (w_spine + 1.1))), int(round(by - ny * (w_spine + 1.1))), BRASS_SPEC)

        # Turquoise-cyan blade body & white razor cutting edge
        for s in np.linspace(0.0, w_edge, 6):
            frac = s / max(0.35, w_edge)
            col = PURE_WHITE if (frac > 0.72 or u > 0.88) else (TEAL_BRIGHT if frac > 0.36 else TEAL_MID)
            put_px(layer, int(round(bx + nx * s)), int(round(by + ny * s)), col)

        # Glowing central horological fuller
        if 0.06 < u < 0.84 and chrono_glow:
            put_px(layer, int(round(bx + nx * 0.4)), int(round(by + ny * 0.4)), PURE_WHITE if i % 3 == 0 else TEAL_BRIGHT)

    # Guard jewel core
    for oy in range(-1, 2):
        for ox in range(-1, 2):
            put_px(layer, int(round(gx + ox)), int(round(gy + oy)), TEAL_MID)
    put_px(layer, int(round(gx)), int(round(gy)), PURE_WHITE)

    layer = outline_layer(layer, OUTLINE)
    composite_np(canvas, layer)
    return gx + ux * blade_len, gy + uy * blade_len


def draw_hour_shortblade(
    canvas: np.ndarray,
    hx: float,
    hy: float,
    angle_deg: float,
    blade_len: float = 27.0,
):
    """
    Crimson-Gold Hour Short-Blade (Off-Hand of Fate):
      - Ornate gold clock-hand crossguard + deep crimson-ruby fuller + gold-white razor edge.
    """
    rad = math.radians(angle_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    nx, ny = -uy, ux

    layer = np.zeros((LH, LW, 4), dtype=np.uint8)
    px, py = hx - ux * 4.5, hy - uy * 4.5
    draw_thick_line(layer, px, py, hx + ux * 1.2, hy + uy * 1.2, 1.1, BRASS_DARK)
    put_px(layer, int(round(px)), int(round(py)), CRIMSON_BRIGHT)

    gx, gy = hx + ux * 1.8, hy + uy * 1.8
    draw_thick_line(layer, gx - nx * 3.8, gy - ny * 3.8, gx + nx * 3.8, gy + ny * 3.8, 1.15, BRASS_GOLD)

    steps = int(max(16, blade_len * 2.2))
    for i in range(steps + 1):
        u = i / steps
        bx = gx + ux * (u * blade_len)
        by = gy + uy * (u * blade_len)
        half_w = (2.15 * (1.0 - 0.68 * (u ** 1.9))) + (0.65 if 0.45 < u < 0.72 else 0.0)
        for s in np.linspace(-half_w, half_w, 6):
            ad = abs(s) / max(0.35, half_w)
            if ad > 0.72 or u > 0.86:
                col = PURE_WHITE if u > 0.82 else BRASS_SPEC
            elif ad > 0.36:
                col = CRIMSON_BRIGHT
            else:
                col = CRIMSON_MID
            put_px(layer, int(round(bx + nx * s)), int(round(by + ny * s)), col)

    put_px(layer, int(round(gx)), int(round(gy)), PURE_WHITE)
    layer = outline_layer(layer, OUTLINE)
    composite_np(canvas, layer)
    return gx + ux * blade_len, gy + uy * blade_len


_BAYER4_CHRONO = (
    (0.0625, 0.5625, 0.1875, 0.6875),
    (0.8125, 0.3125, 0.9375, 0.4375),
    (0.2500, 0.7500, 0.1250, 0.6250),
    (1.0000, 0.5000, 0.8750, 0.3750),
)


def put_smear_px(canvas: np.ndarray, x: int, y: int, rgba):
    """Places a smear pixel with organic Bayer taper inside x=5..154, y=5..114 (zero flat margin cuts)."""
    if x < 5 or x > LW - 6 or y < 5 or y > LH - 6:
        return
    fade = 1.0
    if x < 10:
        fade = min(fade, (x - 4) / 6.0)
    elif x > LW - 11:
        fade = min(fade, (LW - 5 - x) / 6.0)
    if y < 10:
        fade = min(fade, (y - 4) / 6.0)
    elif y > LH - 9:
        fade = min(fade, (LH - 5 - y) / 4.0)
    if fade < 1.0 and fade < _BAYER4_CHRONO[y & 3][x & 3]:
        return
    canvas[y, x] = rgba


def outline_smear_layer(layer: np.ndarray) -> np.ndarray:
    out = outline_layer(layer, OUTLINE)
    out[:4, :, :] = 0
    out[-4:, :, :] = 0
    out[:, :4, :] = 0
    out[:, -4:, :] = 0
    return out


def draw_chrono_serrated_smear(
    canvas: np.ndarray,
    cx: float,
    cy: float,
    r_outer: float,
    r_inner: float,
    deg_start: float,
    deg_end: float,
    serration_amp: float = 6.5,
    serration_freq: int = 11,
    palette_mode: str = "minute_teal",
):
    """
    4-Band Serrated FFBE / Last Cloudia Smear Arc:
      - `minute_teal`: `#ffffff -> #99f6e4 -> #2dd4bf -> #0f766e` + `#facc15` inner brass gear-teeth!
      - `hour_crimson`: `#ffffff -> #fef08a -> #fb7185 -> #be123c`
      - `fade_teal`: `#99f6e4 -> #2dd4bf -> #0f766e` thin afterglow arc
    """
    layer = np.zeros((LH, LW, 4), dtype=np.uint8)
    steps = 150
    for i in range(steps + 1):
        u = i / steps
        ang = math.radians(deg_start + (deg_end - deg_start) * u)
        ux, uy = math.cos(ang), math.sin(ang)

        envelope = math.sin(u * math.pi) ** 0.52
        saw = abs(((u * serration_freq) % 1.0) * 2.0 - 1.0)
        spike = (saw ** 1.55) * serration_amp * envelope

        ro = r_outer + spike
        ri = r_inner + (r_outer - r_inner) * (1.0 - envelope) * 0.62
        span = max(1.0, ro - ri)

        r_samples = int(max(4, span * 1.9))
        for j in range(r_samples + 1):
            ru = j / r_samples
            rr = ri + span * ru
            px = int(round(cx + ux * rr))
            py = int(round(cy + uy * rr))
            if palette_mode == "minute_teal":
                if ru > 0.80:
                    col = PURE_WHITE
                elif ru > 0.56:
                    col = TEAL_BRIGHT
                elif ru > 0.24:
                    col = TEAL_MID
                else:
                    # Inner horological gear-tooth brass notches!
                    col = BRASS_GOLD if ((i // 4) % 2 == 0 and ru < 0.14) else TEAL_DEEP
            elif palette_mode == "hour_crimson":
                if ru > 0.80:
                    col = PURE_WHITE
                elif ru > 0.55:
                    col = BRASS_SPEC
                elif ru > 0.25:
                    col = CRIMSON_BRIGHT
                else:
                    col = CRIMSON_MID
            else:
                col = TEAL_BRIGHT if ru > 0.66 else (TEAL_MID if ru > 0.30 else TEAL_DEEP)
            put_smear_px(layer, px, py, col)

        # Crisp detached clockwork & cyan sparks off the leading teeth
        if serration_amp > 3.0 and (i % 15 == 6) and 0.14 < u < 0.90:
            sx = int(round(cx + ux * (ro + 3.8)))
            sy = int(round(cy + uy * (ro + 3.8)))
            put_smear_px(layer, sx, sy, PURE_WHITE if (i % 30 == 6) else BRASS_GOLD)
            put_smear_px(layer, sx + 1, sy, TEAL_MID if palette_mode != "hour_crimson" else CRIMSON_BRIGHT)

    layer = outline_smear_layer(layer)
    composite_np(canvas, layer)


def draw_chrono_x_scissor_smear(
    canvas: np.ndarray,
    cx: float,
    cy: float,
    reach_x: float = 54.0,
    span_y: float = 34.0,
):
    """True intersecting Twin-Blade X-Scissor Slash (`+30 deg` Turquoise Minute-Glaive x `-30 deg` Crimson-Gold Hour-Blade)."""
    layer = np.zeros((LH, LW, 4), dtype=np.uint8)
    steps = 110
    for arm_idx in (0, 1):
        # arm 0: bottom-left -> top-right rising Turquoise Minute-Glaive slash
        # arm 1: top-left -> bottom-right descending Crimson-Gold Hour-Blade slash
        y0 = cy + span_y if arm_idx == 0 else cy - span_y
        y1 = cy - span_y if arm_idx == 0 else cy + span_y
        x0 = cx - reach_x * 0.42
        x1 = cx + reach_x
        for i in range(steps + 1):
            u = i / steps
            env = math.sin(u * math.pi) ** 0.58
            # Slight outward bow for dynamic katana/glaive curvature
            bow = math.sin(u * math.pi) * (8.5 if arm_idx == 0 else -7.5)
            bx = x0 + (x1 - x0) * u + abs(math.sin(u * math.pi)) * 5.0
            by = y0 + (y1 - y0) * u - bow
            saw = abs(((u * 10.0) % 1.0) * 2.0 - 1.0) * 4.5 * env
            half_w = (1.2 + 4.8 * env + saw * 0.65)
            for s in np.linspace(-half_w, half_w, 9):
                frac = (s + half_w) / max(0.4, 2.0 * half_w)
                px = int(round(bx + s * 0.35))
                py = int(round(by + s * 0.92))
                if arm_idx == 0:
                    col = PURE_WHITE if frac > 0.76 else (TEAL_BRIGHT if frac > 0.50 else (TEAL_MID if frac > 0.22 else BRASS_GOLD))
                else:
                    col = PURE_WHITE if frac < 0.24 else (BRASS_SPEC if frac < 0.48 else (CRIMSON_BRIGHT if frac < 0.78 else CRIMSON_MID))
                put_smear_px(layer, px, py, col)

    # Bright horological X-nexus cross-star at intersection `(cx + reach_x*0.28, cy)`
    nx = int(round(cx + reach_x * 0.30))
    ny = int(round(cy))
    for d in range(-7, 8):
        put_smear_px(layer, nx + d, ny, PURE_WHITE if abs(d) <= 3 else BRASS_SPEC)
        put_smear_px(layer, nx, ny + d, PURE_WHITE if abs(d) <= 3 else TEAL_BRIGHT)

    layer = outline_smear_layer(layer)
    composite_np(canvas, layer)


def draw_chrono_vortex_dial_smear(
    canvas: np.ndarray,
    cx: float,
    cy: float,
    rx: float,
    ry: float,
    reverse: bool = False,
):
    """2.5D Foreshortened XII-Dial Twin-Blade Vortex Smear (`V2` F17..F18)."""
    layer = np.zeros((LH, LW, 4), dtype=np.uint8)
    steps = 160
    a0, a1 = (155.0, -165.0) if reverse else (-165.0, 155.0)
    for i in range(steps + 1):
        u = i / steps
        ang = math.radians(a0 + (a1 - a0) * u)
        ca, sa = math.cos(ang), math.sin(ang)
        env = math.sin(u * math.pi) ** 0.55
        saw = abs(((u * 12.0) % 1.0) * 2.0 - 1.0) * 5.0 * env
        for band_idx, frac in enumerate(np.linspace(0.58, 1.0, 9)):
            rrx = (rx + saw) * frac
            rry = (ry + saw * 0.28) * frac
            px = int(round(cx + ca * rrx))
            py = int(round(cy + sa * rry))
            if reverse:
                col = PURE_WHITE if band_idx >= 7 else (BRASS_SPEC if band_idx >= 5 else (CRIMSON_BRIGHT if band_idx >= 2 else CRIMSON_MID))
            else:
                col = PURE_WHITE if band_idx >= 7 else (TEAL_BRIGHT if band_idx >= 5 else (TEAL_MID if band_idx >= 2 else BRASS_GOLD))
            put_smear_px(layer, px, py, col)

        # 12 Roman dial tick sparks around vortex perimeter
        if i % 13 == 4 and 0.1 < u < 0.9:
            sx = int(round(cx + ca * (rx + 5.0)))
            sy = int(round(cy + sa * (ry + 1.8)))
            put_smear_px(layer, sx, sy, BRASS_SPEC if i % 26 == 4 else TEAL_BRIGHT)

    layer = outline_smear_layer(layer)
    composite_np(canvas, layer)


def draw_clock_ground_spire(canvas: np.ndarray, gx: float, gy: float, height: float, intensity: float = 1.0):
    """Vertical XII Horological Clock-Spire & Shockwave on heavy guillotine slam (`Row 2 F25`, `Row 4`)."""
    layer = np.zeros((LH, LW, 4), dtype=np.uint8)
    h = int(round(height * intensity))
    w_base = max(2, int(round(6.5 * intensity)))
    for dy in range(h):
        u = dy / max(1, h)
        y = int(round(gy - dy))
        hw = max(1, int(round(w_base * (1.0 - 0.76 * (u ** 0.85)))))
        for dx in range(-hw, hw + 1):
            ad = abs(dx) / max(1.0, hw)
            col = PURE_WHITE if ad < 0.34 else (BRASS_SPEC if (dy % 5 == 0) else (TEAL_BRIGHT if ad < 0.68 else TEAL_MID))
            put_px(layer, int(round(gx + dx)), y, col)
    # Ground shock bar
    span = int(round(15 * intensity))
    for dx in range(-span, span + 1):
        put_px(layer, int(round(gx + dx)), int(round(gy)), PURE_WHITE if abs(dx) < 5 else BRASS_GOLD)
        put_px(layer, int(round(gx + dx)), int(round(gy + 1)), TEAL_MID)
    layer = outline_layer(layer, OUTLINE)
    composite_np(canvas, layer)


# ==============================================================================
# 4. Pose Composers (`compose_stand_rig` + `compose_keypose`)
# ==============================================================================
def compose_stand_rig(
    stand_parts,
    stand_meta,
    *,
    f: int,
    body_dx=0.0,
    body_dy=0.0,
    torso_rot=0.0,
    head_rot=0.0,
    front_leg_rot=0.0,
    front_foot_rot=0.0,
    back_leg_rot=0.0,
    back_foot_rot=0.0,
    front_leg_dx=0.0,
    front_leg_dy=0.0,
    back_leg_dx=0.0,
    back_leg_dy=0.0,
    coat_phase=0.0,
    coat_billow=0.7,
    coat_lift=0.0,
    halo_rot=0.0,
    halo_flare=False,
    mg_hand_offset=(16.0, 5.0),
    mg_angle=22.0,
    mg_len=46.0,
    hb_hand_offset=(14.0, -4.0),
    hb_angle=-36.0,
    hb_len=27.0,
    mg_behind=False,
    back_cape_rot=None,
    show_coat_tails=True,
    clamp_ground=False,
) -> np.ndarray:
    canvas = np.zeros((LH, LW, 4), dtype=np.uint8)
    sh_fx, sh_fy = stand_meta["sh_front"][0] + body_dx, stand_meta["sh_front"][1] + body_dy
    sh_bx, sh_by = stand_meta["sh_back"][0] + body_dx, stand_meta["sh_back"][1] + body_dy
    ca_x, ca_y = stand_meta["coat_anchor"][0] + body_dx, stand_meta["coat_anchor"][1] + body_dy

    # 1. Rotating XII Brass Escapement Halo behind shoulders
    draw_escapement_halo(canvas, (sh_fx + sh_bx) * 0.5 - 2.0, sh_fy - 4.0, 17.5 if halo_flare else 15.0, halo_rot, halo_flare)

    # 2. Flowing Coat Tails behind legs (omitted on Row 1 WALK so STAND back_cape stays unified without split double-tails)
    if show_coat_tails:
        draw_chrono_coat_tails(canvas, ca_x, ca_y, coat_phase, billow=coat_billow, lift=coat_lift)

    # 3. Off-hand IK Arm + Crimson-Gold Hour Short-Blade behind torso
    hbx, hby = draw_chrono_ik_arm(canvas, sh_bx, sh_by, sh_bx + hb_hand_offset[0], sh_by + hb_hand_offset[1], bend_sign=1.0, is_back=True)
    draw_hour_shortblade(canvas, hbx, hby, hb_angle, blade_len=hb_len)

    if mg_behind:
        mghx, mghy = draw_chrono_ik_arm(canvas, sh_fx, sh_fy, sh_fx + mg_hand_offset[0], sh_fy + mg_hand_offset[1], bend_sign=1.0, is_back=True)
        draw_minute_glaive(canvas, mghx, mghy, mg_angle, blade_len=mg_len)

    # 4. Segmented STAND parts in anatomical order
    im_layer = Image.fromarray(canvas, mode="RGBA")
    cape_r = (torso_rot * 0.5) if back_cape_rot is None else back_cape_rot
    order = [
        ("back_cape", body_dx, body_dy, cape_r),
        ("back_hair", body_dx, body_dy, head_rot),
        ("back_leg", body_dx + back_leg_dx, body_dy + back_leg_dy, back_leg_rot),
        ("back_foot", body_dx + back_leg_dx, body_dy + back_leg_dy, back_foot_rot),
        ("pelvis", body_dx, body_dy, torso_rot * 0.4),
        ("front_leg", body_dx + front_leg_dx, body_dy + front_leg_dy, front_leg_rot),
        ("front_foot", body_dx + front_leg_dx, body_dy + front_leg_dy, front_foot_rot),
        ("torso", body_dx, body_dy, torso_rot),
        ("head", body_dx, body_dy, head_rot),
    ]
    for pname, dx, dy, rot in order:
        part_im = transform_part(stand_parts[pname], dx=dx, dy=dy, rot_deg=rot)
        im_layer.alpha_composite(part_im)
    canvas = np.array(im_layer, dtype=np.uint8)

    # 5. Foreground Lead IK Arm + Minute-Glaive + Pauldron
    if not mg_behind:
        mghx, mghy = draw_chrono_ik_arm(canvas, sh_fx, sh_fy, sh_fx + mg_hand_offset[0], sh_fy + mg_hand_offset[1], bend_sign=1.0, is_back=False)
        draw_minute_glaive(canvas, mghx, mghy, mg_angle, blade_len=mg_len)

    im_layer = Image.fromarray(canvas, mode="RGBA")
    im_layer.alpha_composite(transform_part(stand_parts["front_pauldron"], dx=body_dx, dy=body_dy, rot_deg=torso_rot))
    out = np.array(im_layer, dtype=np.uint8)
    if clamp_ground and AY + 1 < LH:
        over = out[AY + 1, :, 3] >= 120
        out[AY + 1:, :, :] = 0
        for x_i in np.where(over)[0]:
            if out[AY, x_i, 3] >= 120:
                out[AY, x_i] = OUTLINE
    return out


def compose_keypose(
    keyposes,
    kname: str,
    *,
    dx=0.0,
    dy=0.0,
    rot_deg=0.0,
    coat_phase=0.0,
    coat_billow=1.0,
    coat_lift=0.2,
    halo_rot=0.0,
    halo_flare=False,
    mg_hand_offset=(18.0, 2.0),
    mg_angle=12.0,
    mg_len=46.0,
    hb_hand_offset=(14.0, -6.0),
    hb_angle=-28.0,
    hb_len=27.0,
    draw_weapons_in_front=True,
) -> np.ndarray:
    kp = keyposes[kname]
    canvas = np.zeros((LH, LW, 4), dtype=np.uint8)

    sh_fx, sh_fy = kp["sh_front"][0] + dx, kp["sh_front"][1] + dy
    sh_bx, sh_by = kp["sh_back"][0] + dx, kp["sh_back"][1] + dy
    ca_x, ca_y = kp["coat_anchor"][0] + dx, kp["coat_anchor"][1] + dy

    # 1. Rotating XII Brass Escapement Halo behind torso
    draw_escapement_halo(canvas, (sh_fx + sh_bx) * 0.5 - 2.0, min(sh_fy, sh_by) - 3.5, 18.0 if halo_flare else 15.2, halo_rot, halo_flare)

    # 2. Flowing Coat Tails behind body
    draw_chrono_coat_tails(canvas, ca_x, ca_y, coat_phase, billow=coat_billow, lift=coat_lift)

    # 3. Off-hand Hour Short-Blade behind torso (unless crossed in front)
    if not draw_weapons_in_front:
        mghx, mghy = draw_chrono_ik_arm(canvas, sh_fx, sh_fy, sh_fx + mg_hand_offset[0], sh_fy + mg_hand_offset[1], bend_sign=1.0, is_back=True)
        draw_minute_glaive(canvas, mghx, mghy, mg_angle, blade_len=mg_len)
    hbx, hby = draw_chrono_ik_arm(canvas, sh_bx, sh_by, sh_bx + hb_hand_offset[0], sh_by + hb_hand_offset[1], bend_sign=1.0, is_back=True)
    draw_hour_shortblade(canvas, hbx, hby, hb_angle, blade_len=hb_len)

    # 4. Keypose full-body sprite
    im_kp = kp["im"]
    if abs(rot_deg) > 0.05:
        im_kp = im_kp.rotate(-rot_deg, resample=Image.Resampling.NEAREST, center=(AX, AY - 35))
    im_layer = Image.fromarray(canvas, mode="RGBA")
    body_layer = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
    body_layer.paste(im_kp, (int(round(dx)), int(round(dy))))
    im_layer.alpha_composite(body_layer)
    canvas = np.array(im_layer, dtype=np.uint8)

    # 5. Foreground Minute-Glaive IK Arm
    if draw_weapons_in_front:
        mghx, mghy = draw_chrono_ik_arm(canvas, sh_fx, sh_fy, sh_fx + mg_hand_offset[0], sh_fy + mg_hand_offset[1], bend_sign=1.0, is_back=False)
        draw_minute_glaive(canvas, mghx, mghy, mg_angle, blade_len=mg_len)
    return canvas


# True 4-Phase Bipedal Crossover Gait Keyframes (matches `hd2d_rig_core.py:_BIPEDAL_GAIT_KFS`)
_CHRONO_WALK_GAIT_KFS = (
    (0.000, -25.0, -13.0,   7.0,  1.4,  0.0),  # Contact (front heel plant)
    (0.125, -16.0, -15.0,   1.0,  1.0,  0.4),  # Down (weight absorption)
    (0.250,  -2.0,   0.0,   0.0,  0.2,  0.0),  # Mid-stance (planted directly under AX!)
    (0.375,  14.0,  16.0,  -7.0, -0.8,  0.0),  # Push-off
    (0.500,  23.0,  31.0, -15.0, -1.4, -0.5),  # Back Contact / Toe-off
    (0.625,  11.0,  52.0, -17.0, -0.7, -2.5),  # Toe lift & knee fold
    (0.750,  -8.0,  34.0,   3.0,  0.2, -4.5),  # Passing Crossover directly over AX!
    (0.875, -24.0,   6.0,  11.0,  1.1, -2.0),  # Reach forward
    (1.000, -25.0, -13.0,   7.0,  1.4,  0.0),  # Wrap
)


def _sample_walk_gait_chrono(u: float) -> tuple[float, float, float, float, float]:
    u = u % 1.0
    for i in range(len(_CHRONO_WALK_GAIT_KFS) - 1):
        u0, t0, s0, f0, y0, k0 = _CHRONO_WALK_GAIT_KFS[i]
        u1, t1, s1, f1, y1, k1 = _CHRONO_WALK_GAIT_KFS[i + 1]
        if u <= u1 or i == len(_CHRONO_WALK_GAIT_KFS) - 2:
            span = max(1e-6, u1 - u0)
            t = max(0.0, min(1.0, (u - u0) / span))
            s = t * t * (3.0 - 2.0 * t)
            return (
                t0 + (t1 - t0) * s,
                s0 + (s1 - s0) * s,
                f0 + (f1 - f0) * s,
                y0 + (y1 - y0) * s,
                k0 + (k1 - k0) * s,
            )
    _, t0, s0, f0, y0, k0 = _CHRONO_WALK_GAIT_KFS[0]
    return t0, s0, f0, y0, k0


def _place_part_at_pivot(part: PartSprite, target_piv: tuple[float, float], rot_deg: float = 0.0) -> Image.Image:
    im = part.im
    if abs(rot_deg) > 0.05:
        im = im.rotate(-rot_deg, resample=Image.Resampling.NEAREST, center=(part.pivot_x, part.pivot_y))
    dx = int(round(target_piv[0] - part.pivot_x))
    dy = int(round(target_piv[1] - part.pivot_y))
    if dx != 0 or dy != 0:
        out = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
        out.paste(im, (dx, dy))
        return out
    return im


def compose_walk_rig(stand_parts, stand_meta, f: int) -> np.ndarray:
    """
    Row 1 WALK (`F00..F29`) — True 4-Phase Bipedal Passing-Crossover Gait (`compute_bipedal_walk_pose`):
      - Both hip sockets centered inward (`inward_frac = 0.94`) to central pelvis X (`AX`)
      - Standing straddle rest angles neutralized (`th0_thigh = -9.27 deg`, `th0_shin = -4.09 deg`)
      - `u_l = f / 30.0` and `u_r = (u_l + 0.5) % 1.0` driven 180 deg out of phase with far leg
        rendered strictly BEHIND near leg
      - Unified `walk_cape` gently swaying as one horological coat garment (`0` 4-tentacle tearing!)
      - Stance boot sole locked to `AY = 115` (`0px` vertical pop, `maxAdjTopDelta <= 4px`).
    """
    scale = stand_meta["scale"]
    u_l = (f / 30.0) % 1.0
    u_r = (u_l + 0.5) % 1.0
    tau_f = u_l * math.tau
    halo_rot = f * 12.0

    th0_thigh = math.degrees(math.atan2(-(312.0 - 296.0), 384.0 - 286.0))
    th0_shin = math.degrees(math.atan2(-(318.0 - 312.0), 468.0 - 384.0))
    len_thigh = math.hypot(312.0 - 296.0, 384.0 - 286.0) * scale
    len_shin = math.hypot(318.0 - 312.0, 468.0 - 384.0) * scale

    lx0 = AX + (236.0 - stand_meta["stand_cx_512"]) * scale
    rx0 = AX + (296.0 - stand_meta["stand_cx_512"]) * scale
    mid_hip_x = 0.5 * (lx0 + rx0) - 0.5
    rem_half = 0.5 * (rx0 - lx0) * (1.0 - 0.94)
    base_hip_y = AY - (stand_meta["stand_bot"] - 286.0) * scale

    lt_w, ls_w, lf_w, lyaw, l_klift = _sample_walk_gait_chrono(u_l)
    rt_w, rs_w, rf_w, ryaw, r_klift = _sample_walk_gait_chrono(u_r)

    stride_scale = 0.86
    lt_w *= stride_scale
    ls_w *= stride_scale
    lf_w *= stride_scale
    rt_w *= stride_scale
    rs_w *= stride_scale
    rf_w *= stride_scale

    bob = 0.75 * math.cos(2.0 * tau_f)
    torso_rot = 2.0 + 0.65 * math.sin(2.0 * tau_f)
    head_rot = 0.6 + 0.45 * math.sin(2.0 * tau_f)
    sway_c = math.cos(tau_f)

    def solve_leg(hx_p: float, hy_p: float, tw: float, sw: float, fw: float, klift: float):
        r_th = math.radians(tw)
        r_sh = math.radians(sw)
        kx = hx_p - math.sin(r_th) * len_thigh
        ky = hy_p + math.cos(r_th) * len_thigh + klift
        ax_p = kx - math.sin(r_sh) * len_shin
        ay_p = ky + math.cos(r_sh) * len_shin
        return (hx_p, hy_p), (kx, ky), (ax_p, ay_p), (tw - th0_thigh), (sw - th0_shin), fw

    r_hip_p, r_knee_p, r_ank_p, r_th_d, r_sh_d, r_ft_d = solve_leg(
        mid_hip_x + rem_half + ryaw, base_hip_y + bob * 0.5, rt_w, rs_w, rf_w, r_klift
    )
    l_hip_p, l_knee_p, l_ank_p, l_th_d, l_sh_d, l_ft_d = solve_leg(
        mid_hip_x - rem_half + lyaw, base_hip_y + bob * 0.5, lt_w, ls_w, lf_w, l_klift
    )

    legs_im = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
    # 1) Far leg strictly BEHIND near leg
    legs_im.alpha_composite(_place_part_at_pivot(stand_parts["w_thigh_far"], r_hip_p, r_th_d))
    legs_im.alpha_composite(_place_part_at_pivot(stand_parts["w_shin_far"], r_knee_p, r_sh_d))
    legs_im.alpha_composite(_place_part_at_pivot(stand_parts["w_foot_far"], r_ank_p, r_ft_d))
    # 2) Near leg in front
    legs_im.alpha_composite(_place_part_at_pivot(stand_parts["w_thigh"], l_hip_p, l_th_d))
    legs_im.alpha_composite(_place_part_at_pivot(stand_parts["w_shin"], l_knee_p, l_sh_d))
    legs_im.alpha_composite(_place_part_at_pivot(stand_parts["w_foot"], l_ank_p, l_ft_d))

    legs_arr = np.array(legs_im, dtype=np.uint8)
    lys, _ = np.where(legs_arr[:, :, 3] >= 120)
    leg_dy = (AY - int(lys.max())) if len(lys) > 0 else 0
    if leg_dy != 0:
        shifted = np.zeros_like(legs_arr)
        s_y0 = max(0, -leg_dy)
        s_y1 = min(LH, LH - leg_dy)
        d_y0 = max(0, leg_dy)
        d_y1 = min(LH, LH + leg_dy)
        if s_y1 > s_y0:
            shifted[d_y0:d_y1] = legs_arr[s_y0:s_y1]
        legs_im = Image.fromarray(shifted, mode="RGBA")

    canvas = np.zeros((LH, LW, 4), dtype=np.uint8)
    sh_fx, sh_fy = stand_meta["sh_front"][0], stand_meta["sh_front"][1] + bob
    sh_bx, sh_by = stand_meta["sh_back"][0], stand_meta["sh_back"][1] + bob

    # 1. Rotating XII Brass Escapement Halo behind shoulders
    draw_escapement_halo(canvas, (sh_fx + sh_bx) * 0.5 - 2.0, sh_fy - 4.0, 15.0, halo_rot, False)

    # 2. Off-hand IK Arm + Crimson-Gold Hour Short-Blade behind torso
    hbx, hby = draw_chrono_ik_arm(
        canvas, sh_bx, sh_by, sh_bx + 13.5 + sway_c * 1.2, sh_by - 4.8, bend_sign=1.0, is_back=True
    )
    draw_hour_shortblade(canvas, hbx, hby, -35.2 + sway_c * 3.8, blade_len=27.0)

    # 3. Unified swaying `walk_cape` behind legs (`0` 4-tentacle tearing!) + Crossover Legs + Upper Body
    im_layer = Image.fromarray(canvas, mode="RGBA")
    cape_rot = 1.6 + 2.4 * math.sin(tau_f - 0.45)
    im_layer.alpha_composite(transform_part(stand_parts["walk_cape"], dx=0.0, dy=bob - 1.5, rot_deg=cape_rot))
    im_layer.alpha_composite(transform_part(stand_parts["back_hair"], dx=0.0, dy=bob, rot_deg=head_rot))
    im_layer.alpha_composite(legs_im)
    im_layer.alpha_composite(transform_part(stand_parts["pelvis"], dx=0.0, dy=bob, rot_deg=torso_rot * 0.4, sx=0.86))
    im_layer.alpha_composite(transform_part(stand_parts["torso"], dx=0.0, dy=bob, rot_deg=torso_rot))
    im_layer.alpha_composite(transform_part(stand_parts["head"], dx=0.0, dy=bob, rot_deg=head_rot))
    canvas = np.array(im_layer, dtype=np.uint8)

    # 4. Foreground Lead IK Arm + Minute-Glaive + Pauldron
    mghx, mghy = draw_chrono_ik_arm(
        canvas, sh_fx, sh_fy, sh_fx + 15.2 - sway_c * 1.2, sh_fy + 5.4 + abs(sway_c) * 0.5, bend_sign=1.0, is_back=False
    )
    draw_minute_glaive(canvas, mghx, mghy, 20.5 - sway_c * 3.6, blade_len=46.0)

    im_layer = Image.fromarray(canvas, mode="RGBA")
    im_layer.alpha_composite(transform_part(stand_parts["front_pauldron"], dx=0.0, dy=bob, rot_deg=torso_rot))
    return np.array(im_layer, dtype=np.uint8)


# ==============================================================================
# 5. 10-Row x 30-Frame Next-Gen Choreography (`0..9`)
# ==============================================================================
def render_frame(row: int, f: int, stand_parts, stand_meta, keyposes) -> np.ndarray:
    tau_f = (f / 30.0) * math.tau
    halo_rot = f * 12.0  # Exact 360 deg per 30 frames -> seamless loop!

    # --------------------------------------------------------------------------
    # ROW 0: IDLE -- Twin Hands of Fate Sovereign Stance + Ticking XII Halo
    # --------------------------------------------------------------------------
    if row == 0:
        breath = math.sin(tau_f) * 1.15
        sway = math.cos(tau_f) * 0.75
        return compose_stand_rig(
            stand_parts,
            stand_meta,
            f=f,
            body_dx=sway,
            body_dy=breath * 0.6,
            torso_rot=math.sin(tau_f) * 1.4,
            head_rot=math.sin(tau_f + 0.4) * 1.1,
            coat_phase=tau_f,
            coat_billow=0.65,
            halo_rot=halo_rot,
            mg_hand_offset=(15.5, 5.5 + breath * 0.6),
            mg_angle=20.0 + math.sin(tau_f) * 3.5,
            hb_hand_offset=(13.5, -5.0 - breath * 0.5),
            hb_angle=-36.0 + math.cos(tau_f) * 4.0,
        )

    # --------------------------------------------------------------------------
    # ROW 1: WALK -- True Bipedal Passing-Crossover Gait + Unified Swaying Coat
    # --------------------------------------------------------------------------
    if row == 1:
        return compose_walk_rig(stand_parts, stand_meta, f)

    # --------------------------------------------------------------------------
    # ROW 2: AUTO_ATTACK -- 4-Beat FFBE/Cloudia Twin-Blade Chain
    #   V0 (`F00..F07`): Snap Minute-Glaive Diagonal Cleave Smear (`F03`)
    #   V1 (`F08..F14`): Snap Twin-Blade X-Scissor Rising Smear (`F09`)
    #   V2 (`F15..F22`): 2.5D Foreshortened XII-Dial Vortex Spin (`F17` + `F18`)
    #   V3 (`F23..F29`): Airborne Leap (`F24`) -> Twelfth-Chime Guillotine Slam (`F25`)
    # --------------------------------------------------------------------------
    if row == 2:
        # === V0: F00..F07 ===
        if f <= 2:
            # Coiled torsion windup (`K1_COIL`), Minute-Glaive cocked high-back inside safe margin
            u = f / 2.0
            return compose_keypose(
                keyposes,
                "K1_COIL",
                dx=-1.0 - u * 1.5,
                dy=1.0 + u * 1.0,
                coat_phase=f * 0.45,
                coat_billow=1.05,
                halo_rot=halo_rot,
                mg_hand_offset=(-4.0, -9.0),
                mg_angle=-130.0 - u * 6.0,
                mg_len=35.0,
                hb_hand_offset=(10.0, 2.0),
                hb_angle=32.0,
                draw_weapons_in_front=False,
            )
        if f == 3:
            # 1-FRAME SNAP into K2_LUNGE + 4-band serrated Minute-Glaive diagonal cleave smear!
            c = compose_keypose(
                keyposes,
                "K2_LUNGE",
                dx=12.0,
                dy=0.0,
                coat_phase=1.8,
                coat_billow=1.45,
                coat_lift=0.45,
                halo_rot=halo_rot,
                halo_flare=True,
                mg_hand_offset=(21.0, 4.0),
                mg_angle=18.0,
                mg_len=48.0,
                hb_hand_offset=(-8.0, -6.0),
                hb_angle=-145.0,
            )
            draw_chrono_serrated_smear(
                c,
                cx=86.0,
                cy=65.0,
                r_outer=58.0,
                r_inner=28.0,
                deg_start=-68.0,
                deg_end=42.0,
                serration_amp=7.5,
                serration_freq=11,
                palette_mode="minute_teal",
            )
            return c
        if f == 4:
            c = compose_keypose(
                keyposes,
                "K2_LUNGE",
                dx=11.0,
                dy=0.0,
                coat_phase=2.3,
                coat_billow=1.3,
                coat_lift=0.35,
                halo_rot=halo_rot,
                mg_hand_offset=(20.0, 6.0),
                mg_angle=26.0,
                mg_len=47.0,
                hb_hand_offset=(-6.0, -4.0),
                hb_angle=-135.0,
            )
            draw_chrono_serrated_smear(
                c,
                cx=86.0,
                cy=66.0,
                r_outer=55.0,
                r_inner=39.0,
                deg_start=-18.0,
                deg_end=42.0,
                serration_amp=3.5,
                serration_freq=9,
                palette_mode="fade_teal",
            )
            return c
        if f <= 7:
            u = (f - 4) / 3.0
            return compose_keypose(
                keyposes,
                "K2_LUNGE" if f <= 5 else "K3_RISE",
                dx=10.0 * (1.0 - u),
                dy=0.0,
                coat_phase=2.5 + u * 1.2,
                coat_billow=1.1 - 0.3 * u,
                halo_rot=halo_rot,
                mg_hand_offset=(18.0 - u * 4.0, 6.0 - u * 2.0),
                mg_angle=24.0 - u * 10.0,
                hb_hand_offset=(8.0 + u * 4.0, -4.0),
                hb_angle=-60.0 + u * 25.0,
            )

        # === V1: F08..F14 (Twin-Blade X-Scissor Rising Snap) ===
        if f == 8:
            return compose_keypose(
                keyposes,
                "K2_LUNGE",
                dx=3.0,
                dy=1.0,
                coat_phase=3.9,
                coat_billow=1.15,
                halo_rot=halo_rot,
                mg_hand_offset=(-6.0, 6.0),
                mg_angle=146.0,
                mg_len=42.0,
                hb_hand_offset=(6.0, 5.0),
                hb_angle=128.0,
            )
        if f == 9:
            # 1-FRAME SNAP into K3_RISE + True Intersecting Twin-Blade X-Scissor Smear!
            c = compose_keypose(
                keyposes,
                "K3_RISE",
                dx=10.0,
                dy=-1.0,
                coat_phase=4.4,
                coat_billow=1.5,
                coat_lift=0.5,
                halo_rot=halo_rot,
                halo_flare=True,
                mg_hand_offset=(19.0, -9.0),
                mg_angle=-30.0,
                mg_len=48.0,
                hb_hand_offset=(18.0, 4.0),
                hb_angle=26.0,
                hb_len=30.0,
            )
            draw_chrono_x_scissor_smear(c, cx=86.0, cy=66.0, reach_x=56.0, span_y=34.0)
            return c
        if f == 10:
            c = compose_keypose(
                keyposes,
                "K3_RISE",
                dx=9.0,
                dy=-1.0,
                coat_phase=4.9,
                coat_billow=1.3,
                halo_rot=halo_rot,
                mg_hand_offset=(18.0, -11.0),
                mg_angle=-36.0,
                hb_hand_offset=(17.0, 5.0),
                hb_angle=30.0,
            )
            draw_chrono_serrated_smear(
                c,
                cx=85.0,
                cy=68.0,
                r_outer=53.0,
                r_inner=38.0,
                deg_start=-8.0,
                deg_end=-56.0,
                serration_amp=3.2,
                serration_freq=8,
                palette_mode="fade_teal",
            )
            return c
        if f <= 14:
            u = (f - 10) / 4.0
            return compose_keypose(
                keyposes,
                "K3_RISE",
                dx=8.0 * (1.0 - u),
                dy=0.0,
                coat_phase=5.2 + u * 1.4,
                coat_billow=1.1 - 0.3 * u,
                halo_rot=halo_rot,
                mg_hand_offset=(17.0 - u * 4.0, -10.0 + u * 14.0),
                mg_angle=-42.0 + u * 60.0,
                hb_hand_offset=(16.0 - u * 3.0, 4.0 - u * 8.0),
                hb_angle=28.0 - u * 62.0,
            )

        # === V2: F15..F22 (2.5D Foreshortened XII-Dial Vortex Spin) ===
        if f <= 16:
            u = f - 15
            return compose_keypose(
                keyposes,
                "K1_COIL",
                dx=-0.5 - u * 1.5,
                dy=1.0,
                coat_phase=6.8 + u * 0.5,
                coat_billow=1.05,
                halo_rot=halo_rot,
                mg_hand_offset=(-6.0, 0.0),
                mg_angle=164.0,
                mg_len=33.0,
                hb_hand_offset=(-4.0, -7.0),
                hb_angle=-148.0,
                hb_len=23.0,
                draw_weapons_in_front=False,
            )
        if f == 17:
            # Hit 1 of Spin: K2_LUNGE + Wide 2.5D Turquoise-Brass Dial Vortex!
            c = compose_keypose(
                keyposes,
                "K2_LUNGE",
                dx=11.0,
                dy=0.0,
                coat_phase=7.8,
                coat_billow=1.6,
                coat_lift=0.55,
                halo_rot=halo_rot + 45.0,
                halo_flare=True,
                mg_hand_offset=(22.0, 0.0),
                mg_angle=4.0,
                mg_len=49.0,
                hb_hand_offset=(-14.0, 0.0),
                hb_angle=180.0,
            )
            draw_chrono_vortex_dial_smear(c, cx=86.0, cy=73.0, rx=58.0, ry=14.0, reverse=False)
            return c
        if f == 18:
            # Hit 2 of Spin: K3_RISE + Crimson-Gold Reverse Dial Vortex!
            c = compose_keypose(
                keyposes,
                "K3_RISE",
                dx=10.0,
                dy=0.0,
                coat_phase=8.5,
                coat_billow=1.5,
                coat_lift=0.5,
                halo_rot=halo_rot + 95.0,
                halo_flare=True,
                mg_hand_offset=(-6.0, -2.0),
                mg_angle=162.0,
                mg_len=34.0,
                hb_hand_offset=(20.0, -1.0),
                hb_angle=-4.0,
                hb_len=31.0,
            )
            draw_chrono_vortex_dial_smear(c, cx=84.0, cy=71.0, rx=55.0, ry=13.0, reverse=True)
            return c
        if f <= 22:
            u = (f - 18) / 4.0
            return compose_keypose(
                keyposes,
                "K3_RISE",
                dx=9.0 * (1.0 - u),
                dy=0.0,
                coat_phase=9.0 + u * 1.4,
                coat_billow=1.2 - 0.4 * u,
                halo_rot=halo_rot,
                mg_hand_offset=(14.0, 2.0 + u * 3.0),
                mg_angle=12.0 + u * 10.0,
                hb_hand_offset=(12.0, -4.0),
                hb_angle=-24.0 - u * 10.0,
            )

        # === V3: F23..F29 (Airborne Twelfth-Chime Guillotine Slam) ===
        if f == 23:
            return compose_keypose(
                keyposes,
                "K1_COIL",
                dx=0.0,
                dy=2.0,
                coat_phase=10.8,
                coat_billow=1.2,
                halo_rot=halo_rot,
                mg_hand_offset=(-6.0, -10.0),
                mg_angle=-128.0,
                mg_len=42.0,
                hb_hand_offset=(6.0, -10.0),
                hb_angle=-108.0,
            )
        if f == 24:
            # High airborne K4_LEAP with Twin Blades cocked high-back inside top margin!
            return compose_keypose(
                keyposes,
                "K4_LEAP",
                dx=7.0,
                dy=-10.0,
                coat_phase=11.4,
                coat_billow=1.55,
                coat_lift=0.75,
                halo_rot=halo_rot,
                halo_flare=True,
                mg_hand_offset=(-4.0, -10.0),
                mg_angle=-136.0,
                mg_len=43.0,
                hb_hand_offset=(6.0, -11.0),
                hb_angle=-115.0,
                hb_len=27.0,
            )
        if f == 25:
            # 1-FRAME SNAP into K2_LUNGE + Colossal Twelfth-Chime Twin-Blade Guillotine Smear + Clock-Spire!
            c = compose_keypose(
                keyposes,
                "K2_LUNGE",
                dx=14.0,
                dy=0.0,
                coat_phase=12.2,
                coat_billow=1.65,
                coat_lift=0.55,
                halo_rot=0.0,
                halo_flare=True,
                mg_hand_offset=(22.0, 8.0),
                mg_angle=22.0,
                mg_len=48.0,
                hb_hand_offset=(19.0, 5.0),
                hb_angle=14.0,
                hb_len=31.0,
            )
            draw_chrono_serrated_smear(
                c,
                cx=86.0,
                cy=67.0,
                r_outer=54.0,
                r_inner=26.0,
                deg_start=-92.0,
                deg_end=41.0,
                serration_amp=5.5,
                serration_freq=13,
                palette_mode="minute_teal",
            )
            draw_chrono_serrated_smear(
                c,
                cx=88.0,
                cy=66.0,
                r_outer=47.0,
                r_inner=24.0,
                deg_start=-84.0,
                deg_end=38.0,
                serration_amp=5.2,
                serration_freq=10,
                palette_mode="hour_crimson",
            )
            draw_clock_ground_spire(c, gx=136.0, gy=112.0, height=46.0, intensity=1.0)
            return c
        if f == 26:
            c = compose_keypose(
                keyposes,
                "K2_LUNGE",
                dx=13.0,
                dy=1.0,
                coat_phase=12.8,
                coat_billow=1.4,
                halo_rot=halo_rot,
                mg_hand_offset=(21.0, 10.0),
                mg_angle=30.0,
                hb_hand_offset=(18.0, 7.0),
                hb_angle=22.0,
            )
            draw_clock_ground_spire(c, gx=138.0, gy=113.0, height=28.0, intensity=0.65)
            return c
        u = (f - 26) / 3.0
        return compose_keypose(
            keyposes,
            "K2_LUNGE" if f == 27 else "K3_RISE",
            dx=11.0 * (1.0 - u),
            dy=0.0,
            coat_phase=13.2 + u * 1.2,
            coat_billow=1.1 - 0.35 * u,
            halo_rot=halo_rot,
            mg_hand_offset=(18.0 - u * 3.0, 8.0 - u * 3.0),
            mg_angle=26.0 - u * 6.0,
            hb_hand_offset=(15.0 - u * 2.0, 4.0 - u * 8.0),
            hb_angle=16.0 - u * 50.0,
        )

    # --------------------------------------------------------------------------
    # ROW 3: SKILL -- CHRONO-SCHISM REWIND (`F00..F07` Plant Anchor, `F08..F18` Warp X-Cut, `F19..F29` Rewind Snap)
    # --------------------------------------------------------------------------
    if row == 3:
        if f <= 7:
            # Plant Past-Timeline Anchor into stone
            u = f / 7.0
            c = compose_keypose(
                keyposes,
                "K1_COIL" if f < 3 else "K3_RISE",
                dx=-1.0 + u * 3.0,
                dy=0.0 if f < 3 else 1.0,
                coat_phase=tau_f * 2.0,
                coat_billow=1.15,
                halo_rot=halo_rot * 2.0,
                halo_flare=(f >= 3),
                mg_hand_offset=(10.0, -5.0 + u * 15.0),
                mg_angle=-38.0 + u * 123.0,
                mg_len=41.0,
                hb_hand_offset=(-6.0, -5.0),
                hb_angle=-135.0,
                hb_len=24.0,
            )
            if f in (3, 4, 5):
                draw_clock_ground_spire(c, gx=76.0, gy=113.0, height=26.0 * (1.0 - (f - 3) * 0.25), intensity=0.75)
            return c
        if f <= 18:
            # Warp arrival + Twin-Blade X-Scissor Cleave!
            u = (f - 8) / 10.0
            c = compose_keypose(
                keyposes,
                "K2_LUNGE" if f <= 13 else "K3_RISE",
                dx=12.0 - u * 5.0,
                dy=0.0,
                coat_phase=tau_f * 2.0,
                coat_billow=1.5 - u * 0.4,
                halo_rot=halo_rot * 2.0,
                halo_flare=(f <= 12),
                mg_hand_offset=(20.0 - u * 4.0, -6.0 + u * 10.0),
                mg_angle=-24.0 + u * 48.0,
                hb_hand_offset=(18.0 - u * 4.0, 5.0 - u * 8.0),
                hb_angle=28.0 - u * 56.0,
            )
            if f in (9, 10):
                draw_chrono_x_scissor_smear(c, cx=86.0, cy=66.0, reach_x=54.0 if f == 9 else 44.0, span_y=32.0 if f == 9 else 24.0)
            return c
        # F19..F29: Temporal Rewind Snap & Sovereign Reset
        u = (f - 19) / 10.0
        return compose_stand_rig(
            stand_parts,
            stand_meta,
            f=f,
            body_dx=-3.0 * (1.0 - u),
            body_dy=-4.0 * math.sin(u * math.pi),
            torso_rot=-4.0 * (1.0 - u),
            coat_phase=tau_f * 2.0,
            coat_billow=1.3 - 0.5 * u,
            halo_rot=-halo_rot * 2.0,
            halo_flare=(f <= 23),
            mg_hand_offset=(14.0, -8.0 + u * 13.0),
            mg_angle=-52.0 + u * 72.0,
            hb_hand_offset=(12.0, -10.0 + u * 5.0),
            hb_angle=-70.0 + u * 34.0,
        )

    # --------------------------------------------------------------------------
    # ROW 4: ULTIMATE & TRUE_ULTIMATE -- ETERNAL ZERO: TWELFTH BELL
    #   `F00..F11` (`120..131`): Levitating XII Bell Invocation
    #   `F12..F15` (`132..135`): Conductor Cross-Command
    #   `F16..F18` (`136..138`): Sovereign Zero-Hour Snap
    #   `F19..F29` (`139..149`): Twelfth-Bell Cataclysmic Judgment
    # --------------------------------------------------------------------------
    if row == 4:
        if f <= 11:
            u = f / 11.0
            lift = -2.5 - 4.0 * math.sin(u * math.pi * 0.5)
            return compose_keypose(
                keyposes,
                "K3_RISE",
                dx=0.0,
                dy=lift,
                coat_phase=tau_f * 2.0,
                coat_billow=1.45,
                coat_lift=0.70,
                halo_rot=halo_rot * 2.0,
                halo_flare=True,
                mg_hand_offset=(15.0, -7.0 - u * 1.5),
                mg_angle=-30.0 - u * 8.0,
                mg_len=41.0,
                hb_hand_offset=(-7.0, -6.0 - u * 1.0),
                hb_angle=-142.0 + u * 8.0,
                hb_len=24.0,
            )
        if f <= 15:
            u = (f - 12) / 3.0
            return compose_keypose(
                keyposes,
                "K4_LEAP",
                dx=4.0 + u * 3.0,
                dy=-8.0,
                coat_phase=tau_f * 2.0,
                coat_billow=1.5,
                coat_lift=0.75,
                halo_rot=0.0,
                halo_flare=True,
                mg_hand_offset=(20.0, -4.0),
                mg_angle=-8.0 + u * 12.0,
                hb_hand_offset=(16.0, 4.0),
                hb_angle=16.0 - u * 10.0,
            )
        if f <= 18:
            # Zero-Hour Sovereign Vantage Snap (`136..138`)
            u = (f - 16) / 2.0
            c = compose_keypose(
                keyposes,
                "K3_RISE",
                dx=2.0,
                dy=-5.0,
                coat_phase=tau_f * 2.0,
                coat_billow=1.45,
                coat_lift=0.7,
                halo_rot=0.0,
                halo_flare=True,
                mg_hand_offset=(16.0, -8.0 + u * 6.0),
                mg_angle=-38.0 + u * 26.0,
                mg_len=41.0,
                hb_hand_offset=(12.0, -8.0),
                hb_angle=-48.0,
                hb_len=24.0,
            )
            if f == 18:
                draw_chrono_serrated_smear(c, cx=82.0, cy=67.0, r_outer=50.0, r_inner=30.0, deg_start=-80.0, deg_end=35.0, serration_amp=5.0, palette_mode="minute_teal")
            return c
        # F19..F29 (`139..149`): Twelfth-Bell Judgment Slam & Settle
        u = (f - 19) / 10.0
        c = compose_keypose(
            keyposes,
            "K2_LUNGE" if f <= 24 else "K3_RISE",
            dx=10.0 * (1.0 - u * 0.7),
            dy=-6.0 * max(0.0, 1.0 - u * 2.0),
            coat_phase=tau_f * 2.0,
            coat_billow=1.5 - 0.6 * u,
            halo_rot=halo_rot,
            halo_flare=(f <= 24),
            mg_hand_offset=(20.0 - u * 5.0, 6.0 - u * 2.0),
            mg_angle=24.0 - u * 8.0,
            hb_hand_offset=(16.0 - u * 3.0, -2.0 - u * 4.0),
            hb_angle=-12.0 - u * 24.0,
        )
        if f in (19, 20):
            draw_clock_ground_spire(c, gx=134.0, gy=113.0, height=50.0 if f == 19 else 30.0, intensity=1.0 if f == 19 else 0.7)
        return c

    # --------------------------------------------------------------------------
    # ROW 5: DEATH & HURT (`F00..F05` strictly upright HURT recoil; `F06..F29` collapse -> prone `F22..F29`)
    # --------------------------------------------------------------------------
    if row == 5:
        if f <= 5:
            # Upright knockback recoil (`HURT`)
            u = math.sin((f / 5.0) * math.pi)
            return compose_stand_rig(
                stand_parts,
                stand_meta,
                f=f,
                body_dx=-5.5 * u,
                body_dy=-1.5 * u,
                torso_rot=-12.0 * u,
                head_rot=-16.0 * u,
                front_leg_rot=10.0 * u,
                back_leg_rot=-8.0 * u,
                coat_phase=f * 0.5,
                coat_billow=1.2,
                halo_rot=-f * 8.0,
                mg_hand_offset=(8.0 - 4.0 * u, 10.0 + 4.0 * u),
                mg_angle=52.0 + 20.0 * u,
                hb_hand_offset=(8.0, -6.0 - 2.0 * u),
                hb_angle=-52.0 - 12.0 * u,
                hb_len=24.0,
            )
        if f <= 21:
            # Dramatic stagger -> knee drop -> horizontal fall onto arena stone (shifted rightward so crown NEVER hits left border!)
            u = (f - 6) / 15.0
            rot = -10.0 - 80.0 * (u ** 1.28)
            drop_y = 2.0 + 11.0 * (u ** 1.15)
            slide_x = 4.0 + 22.0 * (u ** 1.15)
            c = np.zeros((LH, LW, 4), dtype=np.uint8)
            kp_im = keyposes["K1_COIL"]["im"].rotate(
                -rot, resample=Image.Resampling.NEAREST, center=(AX, AY - 26)
            )
            layer = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
            layer.paste(kp_im, (int(round(slide_x)), int(round(drop_y))))
            c = np.array(layer, dtype=np.uint8)
            # Dropped Twin Blades skittering onto the stone floor cleanly within safe cell bounds
            draw_minute_glaive(c, AX + 16.0 + u * 12.0, min(111.0, AY - 22.0 + u * 21.0), 8.0 * (1.0 - u), blade_len=36.0, chrono_glow=(u < 0.7))
            draw_hour_shortblade(c, AX + 8.0 - u * 4.0, min(111.0, AY - 18.0 + u * 18.0), 175.0, blade_len=20.0)
            return c
        # F22..F29: Grounded horizontal prone (`minX >= 24`, `maxX <= 298`, `height <= 96px` in 320x240, `0` cuts!)
        sub = f - 22
        c = np.zeros((LH, LW, 4), dtype=np.uint8)
        kp_im = keyposes["K1_COIL"]["im"].rotate(
            90.0, resample=Image.Resampling.NEAREST, center=(AX, AY - 26)
        )
        layer = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
        layer.paste(kp_im, (26, 13))
        c = np.array(layer, dtype=np.uint8)
        draw_minute_glaive(c, AX + 28.0, 111.0, 2.0, blade_len=36.0, chrono_glow=False)
        draw_hour_shortblade(c, AX + 4.0, 111.0, 178.0, blade_len=20.0)
        # Tiny flickering clockwork spark so every prone frame transitions cleanly (29/29)
        put_px(c, AX + 18 + (sub % 4) * 2, 99 - (sub % 2), TEAL_BRIGHT if sub % 2 == 0 else BRASS_GOLD)
        return c

    # --------------------------------------------------------------------------
    # ROW 6: DASH -- Temporal Phase-Jet Glide
    # --------------------------------------------------------------------------
    if row == 6:
        pulse = math.sin(tau_f * 2.0)
        c = compose_keypose(
            keyposes,
            "K4_LEAP" if 4 <= f <= 23 else "K2_LUNGE",
            dx=9.0 + pulse * 1.2,
            dy=-4.0 if 4 <= f <= 23 else 0.0,
            coat_phase=tau_f * 3.0,
            coat_billow=1.35,
            coat_lift=0.75,
            halo_rot=halo_rot * 3.0,
            halo_flare=True,
            mg_hand_offset=(-5.0, 4.0 + pulse),
            mg_angle=163.0,
            mg_len=34.0,
            hb_hand_offset=(18.0, 2.0),
            hb_angle=8.0,
            draw_weapons_in_front=False,
        )
        # Crisp horizontal temporal speedlines behind Chronos EX
        for s_idx in range(3):
            sx0 = 10 + ((f * 7 + s_idx * 13) % 18)
            sy0 = 56 + s_idx * 16 + (f % 3)
            draw_thick_line(c, sx0, sy0, sx0 + 16, sy0, 0.5, TEAL_BRIGHT if s_idx != 1 else BRASS_GOLD)
        return c

    # --------------------------------------------------------------------------
    # ROW 7: CROUCH -- ESCAPEMENT X-GUARD (`F00..F09`) & RIPOSTE SNAP (`F10..F20`)
    # --------------------------------------------------------------------------
    if row == 7:
        if f <= 9:
            u = math.sin((f / 9.0) * math.pi)
            return compose_keypose(
                keyposes,
                "K1_COIL",
                dx=-1.0,
                dy=2.0 + u * 1.5,
                coat_phase=tau_f,
                coat_billow=0.95,
                halo_rot=halo_rot,
                mg_hand_offset=(14.0, -2.0),
                mg_angle=-52.0 + u * 4.0,
                hb_hand_offset=(15.0, -8.0),
                hb_angle=52.0 - u * 4.0,
            )
        if f <= 20:
            u = (f - 10) / 10.0
            c = compose_keypose(
                keyposes,
                "K2_LUNGE" if f <= 15 else "K3_RISE",
                dx=11.0 * (1.0 - u * 0.6),
                dy=0.0,
                coat_phase=tau_f * 2.0,
                coat_billow=1.4 - 0.4 * u,
                halo_rot=halo_rot * 2.0,
                halo_flare=(f <= 13),
                mg_hand_offset=(20.0 - u * 5.0, 4.0),
                mg_angle=18.0 + u * 8.0,
                hb_hand_offset=(-8.0 + u * 16.0, -6.0),
                hb_angle=-135.0 + u * 95.0,
            )
            if f in (10, 11):
                draw_chrono_serrated_smear(c, cx=86.0, cy=74.0, r_outer=55.0, r_inner=29.0, deg_start=-62.0, deg_end=52.0, serration_amp=6.5 if f == 10 else 3.2, palette_mode="minute_teal")
            return c
        u = (f - 21) / 8.0
        return compose_stand_rig(
            stand_parts,
            stand_meta,
            f=f,
            body_dx=3.0 * (1.0 - u),
            coat_phase=tau_f,
            coat_billow=0.8,
            halo_rot=halo_rot,
            mg_hand_offset=(15.0, 5.0),
            mg_angle=22.0,
            hb_hand_offset=(13.0, -5.0),
            hb_angle=-36.0,
        )

    # --------------------------------------------------------------------------
    # ROW 8: JUMP -- Pendulum Leap, Apex Hover & Aerial Cleave
    # --------------------------------------------------------------------------
    if row == 8:
        if f <= 3:
            u = f / 3.0
            return compose_keypose(
                keyposes,
                "K1_COIL",
                dx=0.0,
                dy=3.0 * u,
                coat_phase=tau_f,
                coat_billow=1.0,
                halo_rot=halo_rot,
                mg_hand_offset=(-8.0, 4.0),
                mg_angle=145.0,
                hb_hand_offset=(10.0, 2.0),
                hb_angle=35.0,
            )
        if f <= 17:
            u = (f - 4) / 13.0
            arc_y = -8.5 * math.sin(u * math.pi)
            return compose_keypose(
                keyposes,
                "K4_LEAP",
                dx=4.0,
                dy=arc_y,
                coat_phase=tau_f * 2.0,
                coat_billow=1.40,
                coat_lift=0.72,
                halo_rot=halo_rot * 2.0,
                mg_hand_offset=(14.0, -5.0 + u * 6.0),
                mg_angle=-24.0 + u * 28.0,
                mg_len=41.0,
                hb_hand_offset=(-6.0, -6.0),
                hb_angle=-138.0,
                hb_len=24.0,
            )
        if f <= 24:
            u = (f - 18) / 6.0
            c = compose_keypose(
                keyposes,
                "K4_LEAP" if f <= 21 else "K2_LUNGE",
                dx=8.0,
                dy=-8.0 * (1.0 - u),
                coat_phase=tau_f * 2.0,
                coat_billow=1.5,
                halo_rot=halo_rot * 2.0,
                halo_flare=(f == 19),
                mg_hand_offset=(19.0, 6.0),
                mg_angle=32.0,
                hb_hand_offset=(14.0, -4.0),
                hb_angle=-18.0,
            )
            if f == 19:
                draw_chrono_serrated_smear(c, cx=84.0, cy=68.0, r_outer=54.0, r_inner=28.0, deg_start=-80.0, deg_end=48.0, serration_amp=6.5, palette_mode="minute_teal")
            return c
        u = (f - 25) / 4.0
        return compose_stand_rig(
            stand_parts,
            stand_meta,
            f=f,
            body_dy=2.0 * (1.0 - u),
            coat_phase=tau_f,
            coat_billow=0.8,
            halo_rot=halo_rot,
            mg_hand_offset=(15.5, 5.5),
            mg_angle=20.0,
            hb_hand_offset=(13.5, -5.0),
            hb_angle=-36.0,
        )

    # --------------------------------------------------------------------------
    # ROW 9: VICTORY -- Twelfth Bell Twin-Blade Salute & Minute-Glaive Stone Plant
    # --------------------------------------------------------------------------
    if f <= 10:
        u = f / 10.0
        return compose_keypose(
            keyposes,
            "K3_RISE",
            dx=0.0,
            dy=-1.5 * math.sin(u * math.pi),
            coat_phase=tau_f,
            coat_billow=1.20,
            halo_rot=halo_rot,
            halo_flare=True,
            mg_hand_offset=(15.0, -7.0),
            mg_angle=-30.0 + u * 12.0,
            mg_len=41.0,
            hb_hand_offset=(13.0, -6.0),
            hb_angle=-48.0 - u * 8.0,
            hb_len=24.0,
        )
    u = (f - 11) / 18.0
    c = compose_stand_rig(
        stand_parts,
        stand_meta,
        f=f,
        body_dy=math.sin(u * math.tau) * 0.8,
        torso_rot=2.0,
        coat_phase=tau_f,
        coat_billow=0.95,
        halo_rot=halo_rot,
        halo_flare=True,
        # Minute-Glaive planted vertically downward into the stone floor (`+90 deg`)!
        mg_hand_offset=(18.0, -16.0),
        mg_angle=90.0,
        mg_len=44.0,
        hb_hand_offset=(-6.0, 4.0),
        hb_angle=138.0 + math.sin(u * math.tau) * 3.0,
    )
    if f in (11, 12):
        draw_clock_ground_spire(c, gx=76.0, gy=113.0, height=22.0 if f == 11 else 14.0, intensity=0.65)
    return c


# ==============================================================================
# 6. Margin Safety, 2x Nearest Upscale, Portrait Builder & QA Contact Sheets
# ==============================================================================
def enforce_logical_margin_and_binary_alpha(frame_160x120: np.ndarray) -> np.ndarray:
    out = frame_160x120.copy()
    # Strict 2px logical transparent border -> 4px output border on 320x240 (`0/300` border clips)
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
    # Crop inside (116, 112, 964, 960) -> 848x848 frameless square with zero border strips & zero text!
    bust = raw.crop((116, 112, 964, 960))
    p64 = bust.resize((64, 64), Image.Resampling.LANCZOS)
    arr = np.array(p64, dtype=np.uint8)
    # Subtle 16-bit 32-level color step for crisp Neo-Vision pixel luster
    arr = ((arr.astype(np.uint16) + 3) // 6 * 6).clip(0, 255).astype(np.uint8)
    p128 = Image.fromarray(arr, mode="RGB").resize((128, 128), Image.Resampling.NEAREST)
    p128.save(OUT_PORTRAIT)
    return p128


def main():
    SCRATCH_DIR.mkdir(parents=True, exist_ok=True)
    stand_parts, stand_meta, keyposes = load_stand_and_keyposes()

    # Save keypose & rig inspection sheet first
    kp_dbg = Image.new("RGBA", (LW * 5 * 2, LH * 2), (10, 15, 26, 255))
    stand_preview = compose_stand_rig(stand_parts, stand_meta, f=0)
    kp_list = [
        stand_preview,
        compose_keypose(keyposes, "K1_COIL"),
        compose_keypose(keyposes, "K2_LUNGE"),
        compose_keypose(keyposes, "K3_RISE"),
        compose_keypose(keyposes, "K4_LEAP"),
    ]
    for idx, arr in enumerate(kp_list):
        up = Image.fromarray(enforce_logical_margin_and_binary_alpha(arr), mode="RGBA").resize((CELL_W, CELL_H), Image.Resampling.NEAREST)
        kp_dbg.alpha_composite(up, (idx * CELL_W, 0))
    kp_dbg.save(SCRATCH_DIR / "debug_chronomancer_ex_rig_5poses.png")

    sheet = Image.new("RGBA", (CELL_W * COLS, CELL_H * ROWS), (0, 0, 0, 0))
    border_clips = 0
    flat_edge_cuts = []
    row_transitions = []
    row1_frames_320 = []
    row2_frames_320 = []
    row5_frames_320 = []

    sample_cols = [0, 3, 9, 17, 24, 25]
    ten_rows_dbg = Image.new("RGBA", (len(sample_cols) * CELL_W, ROWS * CELL_H), (11, 16, 28, 255))

    for r in range(ROWS):
        prev_320 = None
        trans = 0
        for c in range(COLS):
            raw_logical = render_frame(r, c, stand_parts, stand_meta, keyposes)
            clean_logical = enforce_logical_margin_and_binary_alpha(raw_logical)
            im_320 = Image.fromarray(clean_logical, mode="RGBA").resize((CELL_W, CELL_H), Image.Resampling.NEAREST)
            arr_320 = np.array(im_320, dtype=np.uint8)

            # Verify 4px output margin + zero straight-line flat cuts at x=4, x=315, y=4
            if (
                arr_320[:4, :, 3].any()
                or arr_320[-4:, :, 3].any()
                or arr_320[:, :4, 3].any()
                or arr_320[:, -4:, 3].any()
            ):
                border_clips += 1
            l4 = int((arr_320[:, 4, 3] > 0).sum())
            r4 = int((arr_320[:, 315, 3] > 0).sum())
            t4 = int((arr_320[4, :, 3] > 0).sum())
            if l4 >= 8 or r4 >= 8 or t4 >= 8:
                flat_edge_cuts.append(f"R{r}F{c:02d}(L={l4},R={r4},T={t4})")

            if prev_320 is not None and not np.array_equal(prev_320, arr_320):
                trans += 1
            prev_320 = arr_320

            sheet.paste(im_320, (c * CELL_W, r * CELL_H))
            if r == 1:
                row1_frames_320.append(im_320)
            if r == 2:
                row2_frames_320.append(im_320)
            if r == 5:
                row5_frames_320.append(im_320)
            if c in sample_cols:
                s_idx = sample_cols.index(c)
                ten_rows_dbg.alpha_composite(im_320, (s_idx * CELL_W, r * CELL_H))

        row_transitions.append(trans)

    sheet.save(OUT_SHEET)
    ten_rows_dbg.save(SCRATCH_DIR / "debug_chronomancer_ex_10rows.png")

    # Save full 30-frame Row 1 WALK contact sheet (`6 cols x 5 rows` @ `320x240`)
    r1_dbg = Image.new("RGBA", (6 * CELL_W, 5 * CELL_H), (12, 18, 30, 255))
    dr1 = ImageDraw.Draw(r1_dbg)
    for idx, im_320 in enumerate(row1_frames_320):
        gx = (idx % 6) * CELL_W
        gy = (idx // 6) * CELL_H
        dr1.rectangle([gx, gy, gx + CELL_W - 1, gy + CELL_H - 1], outline=(45, 70, 95, 255), width=1)
        dr1.line([(gx + 8, gy + 230), (gx + CELL_W - 8, gy + 230)], fill=(90, 130, 150, 255), width=1)
        dr1.line([(gx + 112, gy), (gx + 112, gy + CELL_H - 1)], fill=(45, 212, 191, 90), width=1)
        r1_dbg.alpha_composite(im_320, (gx, gy))
        dr1.text((gx + 8, gy + 6), f"R1 F{idx:02d}", fill=(153, 246, 228, 255))
    r1_dbg.save(SCRATCH_DIR / "debug_chronomancer_ex_row1_walk.png")

    # Save full 30-frame Row 5 DEATH contact sheet (`6 cols x 5 rows` @ `320x240`)
    r5_dbg = Image.new("RGBA", (6 * CELL_W, 5 * CELL_H), (12, 18, 30, 255))
    dr5 = ImageDraw.Draw(r5_dbg)
    for idx, im_320 in enumerate(row5_frames_320):
        gx = (idx % 6) * CELL_W
        gy = (idx // 6) * CELL_H
        dr5.rectangle([gx, gy, gx + CELL_W - 1, gy + CELL_H - 1], outline=(45, 70, 95, 255), width=1)
        dr5.line([(gx + 8, gy + 230), (gx + CELL_W - 8, gy + 230)], fill=(90, 130, 150, 255), width=1)
        dr5.line([(gx + 24, gy), (gx + 24, gy + CELL_H - 1)], fill=(239, 68, 68, 95), width=1)
        dr5.line([(gx + 298, gy), (gx + 298, gy + CELL_H - 1)], fill=(239, 68, 68, 95), width=1)
        r5_dbg.alpha_composite(im_320, (gx, gy))
        dr5.text((gx + 8, gy + 6), f"R5 F{idx:02d}", fill=(252, 165, 165, 255))
    r5_dbg.save(SCRATCH_DIR / "debug_chronomancer_ex_row5_death.png")

    # Save full 30-frame Row 2 contact sheet (`6 cols x 5 rows` @ `320x240`)
    r2_dbg = Image.new("RGBA", (6 * CELL_W, 5 * CELL_H), (12, 18, 30, 255))
    dr = ImageDraw.Draw(r2_dbg)
    for idx, im_320 in enumerate(row2_frames_320):
        gx = (idx % 6) * CELL_W
        gy = (idx // 6) * CELL_H
        r2_dbg.alpha_composite(im_320, (gx, gy))
        dr.rectangle([gx, gy, gx + CELL_W - 1, gy + CELL_H - 1], outline=(45, 70, 95, 255), width=1)
        dr.line([(gx + 112, gy), (gx + 112, gy + CELL_H - 1)], fill=(45, 212, 191, 90), width=1)
        dr.text((gx + 8, gy + 6), f"R2 F{idx:02d}", fill=(250, 204, 21, 255))
    r2_dbg.save(SCRATCH_DIR / "debug_chronomancer_ex_row2.png")

    p128 = Image.open(OUT_PORTRAIT).convert("RGB") if OUT_PORTRAIT.exists() else build_portrait_128()
    p128.save(SCRATCH_DIR / "debug_chronomancer_ex_portrait.png")

    # Quantitative Row 1 WALK crossover & stability checks
    foot_spans = []
    tops_r1 = []
    bots_r1 = []
    for im_320 in row1_frames_320:
        a = np.array(im_320)[:, :, 3] > 0
        ys, _ = np.where(a)
        tops_r1.append(int(ys.min()))
        bots_r1.append(int(ys.max()))
        band = a[206:233, :]
        xs_b = np.where(band)[1]
        foot_spans.append(int(xs_b.max() - xs_b.min() + 1) if xs_b.size else 0)
    max_foot_span = max(foot_spans)
    min_foot_span = min(foot_spans)
    max_adj_top = max(abs(tops_r1[i] - tops_r1[(i + 1) % 30]) for i in range(30))
    bot_pop = max(bots_r1) - min(bots_r1)

    # Quantitative Row 5 DEATH prone checks (F22..F29)
    for df in range(22, 30):
        a = np.array(row5_frames_320[df])[:, :, 3] > 0
        dys, dxs = np.where(a)
        dh = int(dys.max() - dys.min() + 1)
        dminx, dmaxx = int(dxs.min()), int(dxs.max())
        assert dh <= 96 and dminx >= 24 and dmaxx <= 298, f"Row 5 F{df:02d} out of bounds: h={dh}, x=[{dminx}..{dmaxx}]"

    # Measure forward reach on Row 2 snap frames
    snap_reach = {}
    for sf in (3, 9, 17, 25):
        a = np.array(row2_frames_320[sf])[:, :, 3] > 0
        xs = np.where(a)[1]
        snap_reach[f"F{sf:02d}"] = int(xs.max()) if len(xs) else 0

    print(f"[chronomancer_ex] Wrote {OUT_SHEET} ({sheet.size[0]}x{sheet.size[1]}) & preserved {OUT_PORTRAIT}")
    print(f"[chronomancer_ex] border_clips={border_clips}/300 | flat_edge_cuts={flat_edge_cuts} | row_transitions={row_transitions}")
    print(f"[chronomancer_ex] Row 1 WALK: F00={foot_spans[0]}px F07={foot_spans[7]}px F15={foot_spans[15]}px F22={foot_spans[22]}px | max={max_foot_span}px min={min_foot_span}px ratio={min_foot_span/max_foot_span:.3f} | maxAdjTop={max_adj_top}px botPop={bot_pop}px")
    print(f"[chronomancer_ex] Row 2 snap x_max (out of 320, anchorX=112): {snap_reach}")
    if (
        border_clips > 0
        or flat_edge_cuts
        or any(t < 29 for t in row_transitions)
        or max_foot_span < 34
        or min_foot_span > max_foot_span * 0.55
        or max_adj_top > 4
        or bot_pop > 0
    ):
        raise SystemExit("FAILED QA invariants on chronomancer_ex_sheet.png!")


if __name__ == "__main__":
    main()
