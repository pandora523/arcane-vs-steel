#!/opt/homebrew/bin/python3.11
"""
Builds the Fourth-Wall Supreme Ultimate Stages (`cob_monitor`, `cob_monitor_inferno`, `cob_monitor_glacial`)
and the 4-row 8-frame animated Cob Creator sprite strip (`cob_creator_anim.png`):
  - `assets/sprites/arena_cob_monitor.png`          (640x360 RGB PNG, 56-color quantized HD-2D stage)
  - `assets/sprites/arena_cob_monitor_inferno.png`  (640x360 RGB PNG, flaming Ignis Sol fusion stage)
  - `assets/sprites/arena_cob_monitor_glacial.png`  (640x360 RGB PNG, frozen Lyra Borealis fusion stage)
  - `assets/sprites/cob_creator_anim.png`           (1920x720 RGBA PNG = 8 cols x 4 rows of 240x180 animated Cob)
      * Row 0: Default Cyber-Nebula Cob (idle breathing, glance, hair/wing shimmer, eye blink & flare)
      * Row 1: Active Command Attack Cob (surging cyber-mint/crimson wings + blazing crimson-gold eye)
      * Row 2: Flaming Inferno Cob (molten amber/crimson rim lighting & fiery spread-wing embers)
      * Row 3: Frozen Glacial Cob (cryo-cyan/orchid frost rim lighting & borealis wing shimmer)
  - Compact visual QA composite in `scratch/cob_monitor_stage_qa.png`.
"""

from __future__ import annotations

from collections import Counter
from pathlib import Path
import math
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ex_sprite_clean_utils import _fill_enclosed_holes_rgba

REPO_ROOT = Path(__file__).resolve().parents[1]
RAW_SRC = REPO_ROOT / "assets" / "sprites" / "arena_cob_monitor_raw.jpg"
OUT_STAGE = REPO_ROOT / "assets" / "sprites" / "arena_cob_monitor.png"
OUT_STAGE_INFERNO = REPO_ROOT / "assets" / "sprites" / "arena_cob_monitor_inferno.png"
OUT_STAGE_GLACIAL = REPO_ROOT / "assets" / "sprites" / "arena_cob_monitor_glacial.png"
OUT_ANIM = REPO_ROOT / "assets" / "sprites" / "cob_creator_anim.png"
OUT_DRONE_ANIM = REPO_ROOT / "assets" / "sprites" / "cob_drone_anim.png"
SCRATCH_DIR = Path(
    "/Users/rei/.gemini/antigravity/brain/239311b7-74c9-4bb0-b057-16821639c080/scratch"
)

DRONE_LOG = 48
DRONE_CELL = 96
DRONE_COLS = 8
DRONE_ROWS = 4

# Uniform 0.56x centered framing so Cob's full cap crown, crimson eye, spread-wings,
# BOTH COB-OS windows, and BOTH neon side pillars stay 100% below top HUD even at 1.12x zoom!
CENTER_W, CENTER_H = 358, 140  # 640x254 raw upper room scaled ~0.56x
CENTER_X0, CENTER_Y0 = 141, 140  # Glass sits at x=141..499, y=140..280 (sill at y=276..280)
COB_X0, COB_Y0 = 200, 102         # 240x180 overlay norm = (0.3125, 0.2833, 0.3750, 0.5000)
COB_W, COB_H = 240, 180
NUM_FRAMES = 8
NUM_ROWS = 4

# Exact global pixel coordinates of Cob's crimson eye after 0.56x framing (`0.4750, 0.5083`)
EYE_GX = 304
EYE_GY = 183


def despeckle_rgb(arr: np.ndarray, passes: int = 1) -> np.ndarray:
    """Replaces isolated 1px noise speckles where 0 cardinal neighbors match and >=3 agree."""
    out = arr.copy()
    for _ in range(passes):
        nxt = out.copy()
        up = out[:-2, 1:-1]
        dn = out[2:, 1:-1]
        lf = out[1:-1, :-2]
        rt = out[1:-1, 2:]
        cur = out[1:-1, 1:-1]
        same_up = np.all(cur == up, axis=-1)
        same_dn = np.all(cur == dn, axis=-1)
        same_lf = np.all(cur == lf, axis=-1)
        same_rt = np.all(cur == rt, axis=-1)
        isolated = ~(same_up | same_dn | same_lf | same_rt)
        ys, xs = np.where(isolated)
        for y0, x0 in zip(ys, xs):
            y = int(y0) + 1
            x = int(x0) + 1
            nbrs = [
                tuple(int(v) for v in out[y - 1, x]),
                tuple(int(v) for v in out[y + 1, x]),
                tuple(int(v) for v in out[y, x - 1]),
                tuple(int(v) for v in out[y, x + 1]),
            ]
            top_col, cnt = Counter(nbrs).most_common(1)[0]
            if cnt >= 3:
                nxt[y, x] = top_col
        out = nxt
    return out


def quantize_and_save(canvas_rgb: np.ndarray, out_path: Path, colors: int = 56) -> np.ndarray:
    im_q = (
        Image.fromarray(canvas_rgb, "RGB")
        .quantize(colors=colors, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
        .convert("RGB")
    )
    arr = despeckle_rgb(np.array(im_q, dtype=np.uint8), passes=1)
    Image.fromarray(arr, "RGB").save(out_path, optimize=True)
    uniq = len(np.unique(arr.reshape(-1, 3), axis=0))
    print(f"Saved {out_path}: 640x360 RGB, unique_colors={uniq}")
    return arr


def build_reframed_base_canvas() -> np.ndarray:
    """Composes the re-framed 640x360 Cyber Terminal room prior to palette quantization."""
    im = Image.open(RAW_SRC).convert("RGB")
    im_mid = im.resize((1280, 720), Image.Resampling.BILINEAR).filter(
        ImageFilter.MedianFilter(size=3)
    )
    # Full 640x360 pixel-downsampled source for borrowing floor & side-pillar architecture
    raw_640 = np.array(im_mid.resize((640, 360), Image.Resampling.NEAREST), dtype=np.uint8)
    raw_upper = raw_640[0:254, 0:640]
    upper_scaled = np.array(
        Image.fromarray(raw_upper, "RGB").resize((CENTER_W, CENTER_H), Image.Resampling.BILINEAR),
        dtype=np.uint8,
    )

    canvas = np.zeros((360, 640, 3), dtype=np.uint8)
    # Base obsidian room void (`#070a14`)
    canvas[:, :] = [7, 10, 20]

    # 1. Architectural Upper Tech Vault Ceiling (`y = 0..CENTER_Y0`) for aerial jumps / zoom-out
    for y in range(CENTER_Y0):
        t = y / float(max(1, CENTER_Y0 - 1))
        # Subtle stepped tech ribs and sky gradient matching top bezel
        base_r = int(round(6 + 10 * t))
        base_g = int(round(9 + 16 * t))
        base_b = int(round(18 + 26 * t))
        canvas[y, :] = [base_r, base_g, base_b]
    for y_beam in (46, 90, 130):
        canvas[y_beam : y_beam + 4, :] = [18, 26, 44]
        canvas[y_beam + 4 : y_beam + 6, :] = [28, 42, 68]
    for x_rib in (141, 224, 320, 416, 499):
        canvas[0:CENTER_Y0, x_rib - 3 : x_rib + 3] = [14, 21, 36]
        canvas[12:CENTER_Y0, x_rib : x_rib + 2] = [26, 46, 72]

    # 2. Architectural Side Tech Observatory Flanks (`x = 0..141` & `x = 499..640`)
    for side_slice_dst, x_flip in ((slice(0, CENTER_X0), True), (slice(CENTER_X0 + CENTER_W, 640), False)):
        w_out = CENTER_X0
        tiled = np.zeros((CENTER_H, w_out, 3), dtype=np.uint8)
        for x in range(w_out):
            if x < 64:
                tiled[:, x] = [13, 19, 32] if (x // 6) % 2 == 0 else [9, 14, 26]
            else:
                idx = min(45, (w_out - 1 - x))
                col_src = upper_scaled[:, idx] if x_flip else upper_scaled[:, -1 - idx]
                tiled[:, x] = col_src
        for x_col in (24, 62, 108):
            x_loc = x_col if x_flip else w_out - 1 - x_col
            tiled[:, max(0, x_loc - 2) : min(w_out, x_loc + 2)] = [22, 33, 52]
        x_strip = 86 if x_flip else w_out - 88
        tiled[32:108, x_strip : x_strip + 2] = [24, 96, 126]
        canvas[CENTER_Y0 : CENTER_Y0 + CENTER_H, side_slice_dst] = tiled

    # 3. Paste crisp 0.56x re-framed center Fourth-Wall Monitor + Cob + COB-OS windows + side pillars
    canvas[CENTER_Y0 : CENTER_Y0 + CENTER_H, CENTER_X0 : CENTER_X0 + CENTER_W] = upper_scaled

    # Crisp dark metal top monitor header frame (`y = 136..142`) & recessed sill (`y = 276..281`)
    canvas[136:141, CENTER_X0 - 4 : CENTER_X0 + CENTER_W + 4] = [26, 38, 58]
    canvas[141:143, CENTER_X0 : CENTER_X0 + CENTER_W] = [44, 98, 128]
    canvas[276:281, CENTER_X0 - 4 : CENTER_X0 + CENTER_W + 4] = [32, 48, 72]
    canvas[275:277, CENTER_X0 : CENTER_X0 + CENTER_W] = [56, 128, 162]

    # 4. Sleek Obsidian Cyber-Terminal Floor (`y = 281..360`) with Perspective Neon Grid Lines
    floor_src = raw_640[252:360, :]
    floor_scaled = np.array(
        Image.fromarray(floor_src, "RGB").resize((640, 79), Image.Resampling.BILINEAR),
        dtype=np.uint8,
    )
    canvas[281:360, :] = floor_scaled

    # Sharpen perspective cyber grid & horizon reflection line
    canvas[280:282, :] = [34, 108, 138]
    for ray_i in range(-5, 6):
        top_rx = 320 + ray_i * 40
        bot_rx = 320 + ray_i * 98
        for dy in range(2, 79):
            u = dy / 78.0
            gx = int(round(top_rx + (bot_rx - top_rx) * u))
            if 0 <= gx < 640:
                is_cyan = ray_i % 2 == 0
                canvas[281 + dy, gx] = [28, 92, 128] if is_cyan else [94, 34, 118]
    for hy in (292, 308, 328, 350):
        canvas[hy, :] = np.clip(canvas[hy, :].astype(np.int32) + np.array([10, 22, 34]), 0, 255).astype(
            np.uint8
        )

    return canvas


def _cob_silhouette_mask(base_rgb: np.ndarray) -> np.ndarray:
    """Returns a boolean mask of Cob's silhouette inside the 640x360 canvas (excluding glass sky & bezels)."""
    r = base_rgb[:, :, 0].astype(np.int32)
    g = base_rgb[:, :, 1].astype(np.int32)
    b = base_rgb[:, :, 2].astype(np.int32)
    lum = (r * 30 + g * 59 + b * 11) // 100
    yy, xx = np.mgrid[0:360, 0:640]
    in_glass = (xx >= 256) & (xx <= 394) & (yy >= 149) & (yy <= 271)
    # In the center monitor glass, the sky behind Cob is dark bluish-navy `(b - r >= 6, lum < 55)` whereas
    # Cob has dark black hoodie/cap `(max(r,g,b) < 38 and b - r <= 7)`, skin/hair/wings `(lum >= 58)`, or cyan/crimson rim!
    is_glass_sky = (b - r >= 7) & (lum < 56) & ~((r > 110) & (g < 85))
    raw_fg = in_glass & (~is_glass_sky)
    # Morphologically close + keep only near main figure using distance/neighbor dilation via numpy
    padded = np.pad(raw_fg, 2, mode="constant", constant_values=False)
    closed = (
        padded[:-4, 2:-2]
        | padded[4:, 2:-2]
        | padded[2:-2, :-4]
        | padded[2:-2, 4:]
        | raw_fg
    )
    # Fill core torso & head interiors robustly (`y>=192, x=268..384` is dark charcoal hoodie interior!)
    hoodie_box = (yy >= 192) & (yy <= 271) & (xx >= 268) & (xx <= 384) & ((r + g + b) < 88) & ((b - r) <= 8)
    cap_box = (yy >= 148) & (yy <= 185) & (xx >= 292) & (xx <= 358) & ((r + g + b) < 92) & ((b - r) <= 9)
    cap_apex = (yy == 148) & (xx >= 313) & (xx <= 325)
    # Hard clamp out static top monitor bars/mullion (`yy <= 147`) and bottom sill (`yy >= 273`)
    return (closed | hoodie_box | cap_box | cap_apex) & (yy >= 148) & (yy <= 272)


def build_inferno_variant_canvas(base_rgb: np.ndarray) -> np.ndarray:
    """Transforms the base terminal canvas into an Overheated Volcanic Inferno Monitor Terminal."""
    arr = base_rgb.copy().astype(np.int32)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    lum = (r * 30 + g * 59 + b * 11) // 100
    cob_fg = _cob_silhouette_mask(base_rgb)
    bg_all = ~cob_fg

    nr = r.copy()
    ng = g.copy()
    nb = b.copy()

    # Map ALL terminal background (walls, glass sky, monitor bezels, floor) to dark basalt + magma/amber glow
    nr[bg_all] = np.clip(lum[bg_all] * 1.48 + b[bg_all] * 0.52 + 16, 12, 255).astype(np.int32)
    ng[bg_all] = np.clip(lum[bg_all] * 0.64 + g[bg_all] * 0.22 + 4, 4, 205).astype(np.int32)
    nb[bg_all] = np.clip(lum[bg_all] * 0.18 + 2, 2, 76).astype(np.int32)

    # Inside Cob's actual silhouette: warm orange/crimson rim bounce while preserving dark hoodie & wings!
    cyan_rim_cob = cob_fg & (b - r > 18) & (g > 75)
    nr[cyan_rim_cob] = np.clip(r[cyan_rim_cob] + 150, 0, 255)
    ng[cyan_rim_cob] = np.clip(g[cyan_rim_cob] * 0.65 + 42, 0, 255)
    nb[cyan_rim_cob] = np.clip(b[cyan_rim_cob] * 0.20, 0, 255)

    neutral_cob = cob_fg & (~cyan_rim_cob) & (lum > 70)
    nr[neutral_cob] = np.clip(r[neutral_cob] + 18, 0, 255)
    ng[neutral_cob] = np.clip(g[neutral_cob] + 2, 0, 255)
    nb[neutral_cob] = np.clip(b[neutral_cob] - 18, 0, 255)

    neon_slots = bg_all & (b > 125) & (g > 105)
    nr[neon_slots] = 252
    ng[neon_slots] = np.clip(g[neon_slots] * 0.85, 64, 185).astype(np.int32)
    nb[neon_slots] = 28

    out = np.stack([nr, ng, nb], axis=-1).clip(0, 255).astype(np.uint8)

    # Molten obsidian floor horizon & glowing magma fault seams (avoiding Cob silhouette)
    out[276:279, :] = [235, 92, 24]
    for k in range(20):
        fx = 124 + ((k * 47 + 11) % 386)
        fy = 284 + ((k * 17) % 64)
        w = 14 + (k % 3) * 8
        out[fy : fy + 2, max(0, fx) : min(640, fx + w)] = [248, 128, 32] if k % 2 == 0 else [220, 48, 28]
        out[fy, max(0, fx + 2) : min(640, fx + w - 2)] = [254, 212, 110]

    # Ambient rising embers inside glass flanks (skipping Cob's body)
    for i in range(30):
        sx = 136 + ((i * 37) % 368)
        sy = 134 + ((i * 23) % 132)
        if not cob_fg[sy, sx]:
            out[sy : sy + 2, sx : sx + 2] = [252, 188, 64] if i % 2 == 0 else [239, 68, 44]

    return out


def build_glacial_variant_canvas(base_rgb: np.ndarray) -> np.ndarray:
    """Transforms the base terminal canvas into a Cryo-Locked Borealis Glacial Monitor Terminal."""
    arr = base_rgb.copy().astype(np.int32)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    lum = (r * 30 + g * 59 + b * 11) // 100
    cob_fg = _cob_silhouette_mask(base_rgb)
    bg_area = ~cob_fg

    nr = r.copy()
    ng = g.copy()
    nb = b.copy()

    # Frost-tint background walls, glass sky & floor into deep sapphire/glacier-cyan + borealis mist
    nr[bg_area] = np.clip(lum[bg_area] * 0.36 + 6, 4, 180).astype(np.int32)
    ng[bg_area] = np.clip(lum[bg_area] * 0.90 + g[bg_area] * 0.36 + 16, 16, 242).astype(np.int32)
    nb[bg_area] = np.clip(lum[bg_area] * 1.18 + b[bg_area] * 0.46 + 34, 34, 255).astype(np.int32)

    neutral_cob = cob_fg & (lum > 70)
    nr[neutral_cob] = np.clip(r[neutral_cob] - 14, 0, 255)
    ng[neutral_cob] = np.clip(g[neutral_cob] + 12, 0, 255)
    nb[neutral_cob] = np.clip(b[neutral_cob] + 28, 0, 255)

    cyan_rim_cob = cob_fg & (b - r > 18) & (g > 75)
    nr[cyan_rim_cob] = np.clip(r[cyan_rim_cob] + 45, 0, 255)
    ng[cyan_rim_cob] = np.clip(g[cyan_rim_cob] + 68, 0, 255)
    nb[cyan_rim_cob] = np.clip(b[cyan_rim_cob] + 85, 0, 255)

    out = np.stack([nr, ng, nb], axis=-1).clip(0, 255).astype(np.uint8)

    # Hanging tapered crystal pixel icicles along top bezel (`y = 141..151`) & organic frost rime sill (`y = 277..280`)
    for x in range(146, 494, 13):
        ic_len = 4 + ((x * 7) % 6)
        for dy in range(ic_len):
            w = 2 if dy < 2 else 1
            col = [186, 238, 255] if dy == 0 else ([103, 232, 249] if dy < ic_len - 1 else [56, 189, 248])
            out[141 + dy, x : x + w] = col

    out[278:280, 140:500] = [56, 168, 224]
    out[277, 142:498] = [103, 224, 248]
    for idx_f, x in enumerate(range(144, 496, 5)):
        h_rim = (x * 7 + idx_f * 3) % 3
        if h_rim > 0:
            out[277 - h_rim : 277, x : x + 2] = [125, 226, 252]
        if idx_f % 4 == 0:
            out[276, x] = [224, 248, 255]

    # Soft horizontal Borealis sky bands behind monitor glass (`y = 152..182`, skipping Cob!)
    for y in range(152, 184, 2):
        band_u = 1.0 - abs(y - 168) / 18.0
        if band_u <= 0:
            continue
        add_g = int(round(18 * band_u))
        add_b = int(round(32 * band_u))
        mask_row = (~cob_fg[y, 146:494])
        xs = np.where(mask_row)[0] + 146
        out[y, xs, 1] = np.clip(out[y, xs, 1].astype(np.int32) + add_g, 0, 255).astype(np.uint8)
        out[y, xs, 2] = np.clip(out[y, xs, 2].astype(np.int32) + add_b, 0, 255).astype(np.uint8)

    return out


def _render_cob_row_into_strip(
    strip: np.ndarray,
    row_idx: int,
    stage_arr: np.ndarray,
    cob_fg_crop: np.ndarray,
    mode: str,
) -> None:
    """
    Renders 8 frames of 240x180 animated Cob into row `row_idx` of `strip` (`1920x720`).
      mode: 'normal' | 'attack' | 'inferno' | 'glacial'
    """
    base_crop = stage_arr[COB_Y0 : COB_Y0 + COB_H, COB_X0 : COB_X0 + COB_W].copy()
    r0 = base_crop[:, :, 0].astype(np.int32)
    g0 = base_crop[:, :, 1].astype(np.int32)
    b0 = base_crop[:, :, 2].astype(np.int32)

    lx_eye = EYE_GX - COB_X0
    ly_eye = EYE_GY - COB_Y0

    yy, xx = np.mgrid[0:COB_H, 0:COB_W]

    # Clean row-matched glass sky background plate for vacated edges when Cob shifts inside monitor glass
    sky_cols = (~cob_fg_crop) & (((xx >= 46) & (xx <= 88)) | ((xx >= 162) & (xx <= 198)))
    sky_plate = np.zeros_like(base_crop)
    for y in range(COB_H):
        y0_band = max(46, y - 2)
        y1_band = min(173, y + 3)
        band_mask = sky_cols[y0_band:y1_band]
        if band_mask.any():
            sky_cols_px = base_crop[y0_band:y1_band][band_mask]
            sky_plate[y, :] = np.median(sky_cols_px, axis=0).astype(np.uint8)
        else:
            sky_plate[y, :] = base_crop[min(170, max(46, y)), 52]

    # Mask alpha strictly around Cob's figure inside glass (`ly = 46..172`; `0` alpha on all bezels/mullion/sill!)
    pad = np.pad(cob_fg_crop, 4, mode="constant", constant_values=False)
    dil = np.zeros_like(cob_fg_crop)
    for dy_s in range(-3, 4):
        for dx_s in range(-3, 4):
            if abs(dy_s) + abs(dx_s) <= 4:
                dil |= pad[4 + dy_s : 4 + dy_s + COB_H, 4 + dx_s : 4 + dx_s + COB_W]
    dil &= (yy >= 46) & (yy <= 172)
    ay_bot = np.clip((173 - yy) / 6.0, 0.0, 1.0)
    feather_alpha = np.where(
        (yy <= 45) | (yy >= 173),
        0,
        np.round(np.where(dil, 1.0, 0.0) * ay_bot * 255.0),
    ).astype(np.uint8)

    skin_patch = base_crop[ly_eye + 3 : ly_eye + 8, lx_eye + 1 : lx_eye + 6]
    skin_col = tuple(int(v) for v in np.median(skin_patch.reshape(-1, 3), axis=0))

    y_dst0 = row_idx * COB_H
    for f in range(NUM_FRAMES):
        u = f / float(NUM_FRAMES)
        if mode == "attack":
            # Command surge posture: assertive over-shoulder lean + command lift
            head_dy = -2 if f in (2, 3, 4) else (-1 if f in (1, 5) else 0)
            shoulder_dy = -1 if f in (1, 2, 3, 4, 5) else 0
            head_dx = 2 if f in (3, 4) else (1 if f in (2, 5) else 0)
        else:
            head_dy = -1 if f in (2, 3, 4, 5) else 0
            shoulder_dy = -1 if f in (2, 3, 4, 5) else 0
            head_dx = 1 if f in (4, 5) else (-1 if f in (1, 2) else 0)

        frame_rgb = base_crop.copy()
        fg_frame = cob_fg_crop.copy()

        # Shift ONLY verified Cob silhouette pixels (`cob_fg_crop`), filling vacated pixels with clean `sky_plate`
        if head_dy != 0 or head_dx != 0 or shoulder_dy != 0:
            shift_region = (yy >= 46) & (yy < 164) & cob_fg_crop
            frame_rgb[shift_region] = sky_plate[shift_region]
            fg_frame[46:164, :] = False

            # 1. Upper-body / shoulder breathing shift (`ly = 104..164`, tapered dx across collar to avoid seams)
            for y in range(104, 164):
                sy = y - shoulder_dy
                row_dx = (round(head_dx * 0.5) if y < 112 else 0) if abs(head_dx) >= 1 else 0
                if 46 <= sy < 171:
                    for x in range(44, 198):
                        sx = x - row_dx
                        if 0 <= sx < COB_W and cob_fg_crop[sy, sx]:
                            frame_rgb[y, x] = base_crop[sy, sx]
                            fg_frame[y, x] = True

            # 2. Head & cap motion shift (`ly = 46..105`, strictly masked by `cob_fg_crop`, never touching bezel!)
            for y in range(46, 106):
                sy = y - head_dy
                if 46 <= sy < 171:
                    for x in range(62, 178):
                        sx = x - head_dx
                        if 0 <= sx < COB_W and cob_fg_crop[sy, sx]:
                            frame_rgb[y, x] = base_crop[sy, sx]
                            fg_frame[y, x] = True

        r_f = frame_rgb[:, :, 0].astype(np.int32)
        g_f = frame_rgb[:, :, 1].astype(np.int32)
        b_f = frame_rgb[:, :, 2].astype(np.int32)
        not_face_profile = ~((xx < 118) & (yy > 64))
        hair_roi = (
            fg_frame
            & not_face_profile
            & (r_f >= 92)
            & (g_f >= 92)
            & (b_f >= 92)
            & (np.abs(r_f - b_f) < 38)
            & (yy >= 48)
            & (yy <= 92)
            & (xx >= 88)
            & (xx <= 156)
        )
        wing_roi = (
            fg_frame
            & (r_f >= 135)
            & (g_f >= 135)
            & (b_f >= 135)
            & (np.abs(r_f - b_f) < 48)
            & (yy >= 106)
            & (yy <= 172)
            & (xx >= 92)
            & (xx <= 190)
        )
        rim_roi = (
            (fg_frame & (b_f - r_f > 24) & (g_f > 80))
            if mode in ("normal", "attack", "glacial")
            else (fg_frame & (r_f - b_f > 55) & (g_f > 60))
        )

        ex = lx_eye + head_dx
        ey = ly_eye + head_dy

        # 3. Animated hair shimmer (hair-only, subtle diagonal sheen — never bands across face skin!)
        shimmer_band_y = 54.0 + ((f * 7) % 30)
        hair_shimmer = hair_roi & (np.abs((yy + (xx - 120) * 0.25) - shimmer_band_y) <= 4.5)
        hair_delta = (
            np.array([22, 10, -4])
            if mode == "inferno"
            else np.array([8, 20, 30])
            if mode == "glacial"
            else np.array([12, 24, 30])
        )
        frame_rgb[hair_shimmer] = np.clip(
            frame_rgb[hair_shimmer].astype(np.int32) + hair_delta, 0, 255
        ).astype(np.uint8)

        pulse = 0.5 + 0.5 * math.sin(u * math.tau)
        rim_delta = (
            np.array([int(44 * pulse + 16), int(22 * pulse + 6), 0])
            if mode == "inferno"
            else np.array([6, int(34 * pulse + 12), int(48 * pulse + 18)])
            if mode == "glacial"
            else np.array([int(46 * pulse), int(38 * pulse + 10), int(28 * pulse + 12)])
            if mode == "attack"
            else np.array([6, int(24 * pulse + 8), int(42 * pulse + 16)])
        )
        frame_rgb[rim_roi] = np.clip(
            frame_rgb[rim_roi].astype(np.int32) + rim_delta, 0, 255
        ).astype(np.uint8)

        # 4. Sweeping energy wave across Cob's white spread-wings emblem!
        wave_y = 170.0 - f * 8.5
        wing_wave = wing_roi & (np.abs(yy - wave_y) <= 8.0)
        if mode == "attack":
            wing_col = np.array([48, 72, 24]) if f % 2 == 0 else np.array([72, 16, 46])
        elif mode == "inferno":
            wing_col = np.array([64, 28, -12])
        elif mode == "glacial":
            wing_col = np.array([-8, 46, 68])
        else:
            wing_col = np.array([14, 44, 58])
        frame_rgb[wing_wave] = np.clip(
            frame_rgb[wing_wave].astype(np.int32) + wing_col, 0, 255
        ).astype(np.uint8)

        diag = (xx * 0.7 + yy) - (f * 28.0 + 135.0)
        wing_sheen = wing_roi & (np.abs(diag) <= 8.0)
        frame_rgb[wing_sheen] = np.clip(
            frame_rgb[wing_sheen].astype(np.int32) + (wing_col // 2), 0, 255
        ).astype(np.uint8)

        # 5. Live Eye Blink / Crimson Command Glare at `(ex, ey)`
        if mode != "attack" and f == 5:
            frame_rgb[max(0, ey - 2) : ey + 1, max(0, ex - 2) : min(COB_W, ex + 3)] = skin_col
            frame_rgb[ey, max(0, ex - 2) : min(COB_W, ex + 2)] = [20, 14, 22]
            frame_rgb[ey + 1, max(0, ex - 2) : min(COB_W, ex + 2)] = (
                [56, 220, 255] if mode == "glacial" else [248, 60, 76]
            )
        elif mode != "attack" and f == 6:
            frame_rgb[max(0, ey - 2) : min(COB_H, ey + 2), max(0, ex - 2) : min(COB_W, ex + 3)] = skin_col
            frame_rgb[ey + 1, max(0, ex - 2) : min(COB_W, ex + 3)] = [18, 14, 24]
        else:
            if 2 <= ey < COB_H - 3 and 2 <= ex < COB_W - 3:
                if mode == "attack":
                    # Intense Crimson-Neon Command Eye Glare + Gold Core
                    frame_rgb[ey - 1 : ey + 2, ex - 1 : ex + 2] = [255, 42, 109]
                    frame_rgb[ey, ex - 3 : ex + 4] = [255, 86, 132]
                    frame_rgb[ey, ex] = [253, 224, 71]
                elif mode == "inferno":
                    frame_rgb[ey - 1 : ey + 2, ex - 1 : ex + 2] = [255, 92, 24]
                    if f in (0, 3, 7):
                        frame_rgb[ey, ex] = [254, 240, 138]
                elif mode == "glacial":
                    frame_rgb[ey - 1 : ey + 2, ex - 1 : ex + 2] = [244, 52, 92]
                    frame_rgb[ey - 1, ex + 1] = [103, 232, 249]
                    if f in (0, 3, 7):
                        frame_rgb[ey, ex] = [255, 255, 255]
                else:
                    frame_rgb[ey - 1 : ey + 2, ex - 1 : ex + 2] = [242, 34, 54]
                    if f in (3, 7):
                        frame_rgb[ey - 1, ex + 1] = [255, 232, 210] if f == 7 else [255, 224, 224]
                        frame_rgb[ey, ex] = [255, 84, 98]

        rgba = np.zeros((COB_H, COB_W, 4), dtype=np.uint8)
        rgba[:, :, :3] = frame_rgb
        rgba[:, :, 3] = feather_alpha
        strip[y_dst0 : y_dst0 + COB_H, f * COB_W : (f + 1) * COB_W] = rgba


def build_cob_drone_cell_48(row_idx: int, frame_idx: int) -> np.ndarray:
    """
    Sculpts a crisp 48x48 logical (+X facing) Flying Cob Command Drone pixel-by-pixel:
      - Faceted obsidian-titanium stealth hull with top uplink spire (tip at (24, 8) -> offset (0, -32) in 96x96)
      - Articulated 4-feather silver-white spread-wings echoing Cob's hoodie crest with 8-frame flap kinematics
      - Glowing Crimson Cob Command Eye optic + side intakes + twin plasma thrusters
      - Under-slung twin-prong prism railgun muzzle converging cleanly at (32, 35) -> offset (+16, +22) in 96x96
      Row 0: Idle Patrol | Row 1: Active Strike Lock | Row 2: Inferno Fusion | Row 3: Glacial Fusion
    """
    cell = np.zeros((DRONE_LOG, DRONE_LOG, 4), dtype=np.uint8)
    u = frame_idx / float(DRONE_COLS)
    ang = u * math.tau
    is_strike = row_idx == 1
    is_inf = row_idx == 2
    is_glac = row_idx == 3

    C_SELOUT = (7, 10, 20, 255)
    C_HULL_DARK = (15, 22, 42, 255)
    C_HULL_MID = (30, 41, 59, 255)
    C_HULL_TOP = (58, 74, 98, 255)
    C_HULL_SPEC = (108, 128, 152, 255)
    C_VISOR_BG = (5, 7, 15, 255)
    C_WHITE = (255, 255, 255, 255)

    C_EYE_DARK = (159, 18, 57, 255)
    C_EYE_MID = (255, 42, 109, 255) if not is_inf else (255, 42, 85, 255)
    C_EYE_HOT = (253, 224, 71, 255) if (is_strike or is_inf) else (255, 240, 245, 255)

    if is_inf:
        C_TRIM_PRI = (251, 146, 60, 255)
        C_TRIM_SEC = (253, 224, 71, 255)
        C_TRIM_DIM = (180, 83, 9, 255)
        W_SHAD = (120, 113, 128, 255)
        W_MID = (214, 204, 212, 255)
        W_BRIGHT = (248, 232, 216, 255)
        W_TIP = C_TRIM_SEC
    elif is_glac:
        C_TRIM_PRI = (103, 232, 249, 255)
        C_TRIM_SEC = (232, 121, 249, 255)
        C_TRIM_DIM = (14, 116, 144, 255)
        W_SHAD = (100, 146, 188, 255)
        W_MID = (186, 224, 248, 255)
        W_BRIGHT = (236, 250, 255, 255)
        W_TIP = C_TRIM_PRI
    else:
        C_TRIM_PRI = (5, 255, 161, 255) if (frame_idx % 2 == 0 or is_strike) else (34, 211, 238, 255)
        C_TRIM_SEC = (34, 211, 238, 255)
        C_TRIM_DIM = (14, 116, 144, 255)
        W_SHAD = (116, 134, 160, 255)
        W_MID = (198, 212, 228, 255)
        W_BRIGHT = (241, 245, 249, 255)
        W_TIP = C_TRIM_PRI if is_strike else C_WHITE

    def put(px: int, py: int, col: tuple[int, int, int, int]):
        if 3 <= px < DRONE_LOG - 3 and 3 <= py < DRONE_LOG - 3:
            cell[py, px] = col

    def blend_px(px: int, py: int, col: tuple[int, int, int, int]):
        if 3 <= px < DRONE_LOG - 3 and 3 <= py < DRONE_LOG - 3:
            if col[3] >= 250 or cell[py, px, 3] == 0:
                cell[py, px] = col
            else:
                a = col[3] / 255.0
                dst = cell[py, px]
                da = dst[3] / 255.0
                out_a = a + da * (1.0 - a)
                if out_a > 1e-4:
                    cell[py, px, 0] = int(round((col[0] * a + dst[0] * da * (1 - a)) / out_a))
                    cell[py, px, 1] = int(round((col[1] * a + dst[1] * da * (1 - a)) / out_a))
                    cell[py, px, 2] = int(round((col[2] * a + dst[2] * da * (1 - a)) / out_a))
                    cell[py, px, 3] = min(255, int(round(out_a * 255)))

    pitch = 1 if is_strike else 0
    bob_y = int(round(math.sin(ang) * (1.0 if is_strike else 1.5)))
    wing_phase = math.sin(ang * (2.0 if is_strike else 1.0))
    tip_phase = math.sin(ang * (2.0 if is_strike else 1.0) - 0.85)
    flap_root = int(round(wing_phase * (1.8 if is_strike else 2.2)))
    flap_tip = int(round(tip_phase * (2.5 if is_strike else 3.0)))

    # 1. Rear Back-Wing (`x = 5..18`, darker cool-slate value for 3D depth separation!)
    def draw_feather_wing(is_front: bool):
        side = 1 if is_front else -1
        # Shoulder joint arm anchored to hull `(20 or 28, 22 + bob_y)`
        root_x = 29 if is_front else 19
        root_y = 21 + bob_y + (pitch if is_front else 0)
        c_hi = W_BRIGHT if is_front else W_MID
        c_md = W_MID if is_front else W_SHAD
        c_lo = W_SHAD

        # Articulated titanium wing pylon
        for s in range(5):
            wx = root_x + side * s
            wy = root_y - (s // 2) + int(round((s / 4.0) * flap_root))
            put(wx, wy, C_HULL_TOP if is_front else C_HULL_MID)
            put(wx, wy + 1, C_HULL_MID)
        # Shoulder servo node
        put(root_x + side * 2, root_y, C_TRIM_PRI)

        # 4 stepped diagonal mecha feathers sweeping outward from the wrist spar!
        sheen_u = ((frame_idx * 1.3 + (0 if is_front else 2.5)) % 8.0) / 8.0
        for f_idx, (f_len, f_rise, f_drop, f_thick) in enumerate(
            (
                (11, -5, 1, 2),   # Primary outer pin-feather (longest crest)
                (9, -2, 2, 2),    # Upper secondary feather
                (7, 1, 3, 2),     # Mid trailing feather
                (5, 4, 3, 1),     # Lower tertiary feather
            )
        ):
            sx0 = root_x + side * (3 - f_idx // 2)
            sy0 = root_y + f_rise + int(round(flap_root * (0.65 - f_idx * 0.1)))
            prev_fy = None
            for step in range(f_len):
                frac = step / float(max(1, f_len - 1))
                fx = sx0 + side * step
                # Crisp upward arch at wrist, graceful downward taper toward feather tip (strictly connected)
                arch = -int(round(math.sin(frac * math.pi) * (2.2 if f_idx == 0 else 1.2)))
                fy = sy0 + arch + int(round(frac * f_drop + frac * flap_tip))
                if prev_fy is not None and abs(fy - prev_fy) > 1:
                    fy = prev_fy + (1 if fy > prev_fy else -1)
                prev_fy = fy
                shimmer = abs(frac - sheen_u) < 0.16
                main_c = (
                    (C_WHITE if is_front else W_BRIGHT)
                    if shimmer
                    else (W_TIP if (step >= f_len - 2 and f_idx == 0) else (c_hi if step < f_len - 3 else c_md))
                )
                put(fx, fy, main_c)
                if f_thick >= 2 and step < f_len - 1:
                    put(fx, fy + 1, c_md if step < f_len - 3 else c_lo)
                if f_idx == 0 and step == f_len - 1:
                    put(fx, fy, W_TIP if (is_strike or frame_idx % 2 == 0) else C_WHITE)

    draw_feather_wing(is_front=False)

    # 2. Twin Angled Hover Thruster Pods & Animated Plasma Exhaust (`y = 29..39`)
    thr_pulse = (frame_idx + (1 if is_strike else 0)) % 4
    plume_len = (5 if is_strike else 4) + (thr_pulse % 2)
    for pod_idx, tx0 in enumerate((19, 26)):
        ty0 = 28 + bob_y + (pitch if pod_idx == 1 else 0)
        for dy in range(3):
            for dx in range(-1, 2):
                put(tx0 + dx, ty0 + dy, C_HULL_MID if dy < 2 else C_HULL_TOP)
        put(tx0, ty0 + 2, C_TRIM_DIM)
        # Animated tapered thruster flame (`alpha < 200` on tip so selout skips the flame!)
        for k in range(1, plume_len + 1):
            py = ty0 + 2 + k
            a_fl = int(215 - (k / float(plume_len + 1)) * 110)
            fl_col = C_WHITE if k == 1 else (C_TRIM_PRI[0], C_TRIM_PRI[1], C_TRIM_PRI[2], a_fl)
            blend_px(tx0, py, fl_col)
            if k <= 2:
                blend_px(tx0 - 1, py, (C_TRIM_SEC[0], C_TRIM_SEC[1], C_TRIM_SEC[2], min(185, a_fl)))

    # 3. Top Command Uplink Spire Mast + Beacon Gem (`(24, 8)` -> upscaled `(0, -32)` in `96x96`!)
    # Keep anchor tip crisp at `(24, 8)` with bright beacon pixel!
    for my in range(9, 17):
        put(23, my + (bob_y // 2 if my > 12 else 0), C_HULL_MID)
        put(24, my + (bob_y // 2 if my > 12 else 0), C_HULL_TOP)
    put(23, 15, C_HULL_SPEC)
    # Spire tip cluster centered cleanly on `(24, 8)`
    beacon_col = C_EYE_MID if (is_strike or frame_idx % 2 == 0) else C_TRIM_PRI
    put(24, 8, C_WHITE if (is_strike or frame_idx in (0, 3, 6)) else beacon_col)
    put(23, 8, beacon_col)
    put(25, 8, beacon_col)
    put(24, 7, beacon_col)
    put(24, 9, C_EYE_HOT if is_strike else C_TRIM_SEC)

    # 4. Sculpted Faceted Stealth Armor Chassis Pod (`x = 17..31, y = 16..29`)
    hull_spans = {
        -7: (-4, 5),
        -6: (-6, 6),
        -5: (-7, 7),
        -4: (-7, 7),
        -3: (-8, 8),
        -2: (-8, 8),
        -1: (-7, 8),
        0: (-7, 8),
        1: (-7, 7),
        2: (-6, 7),
        3: (-5, 6),
        4: (-4, 5),
        5: (-3, 4),
    }
    cx_hull, cy_hull = 24, 23 + bob_y
    for rdy, (lx0, lx1) in hull_spans.items():
        py = cy_hull + rdy
        for rdx in range(lx0, lx1 + 1):
            px = cx_hull + rdx
            if rdy <= -5:
                col = C_HULL_SPEC if -2 <= rdx <= 3 else C_HULL_TOP
            elif rdy <= -2:
                col = C_HULL_TOP if rdx >= -3 else C_HULL_MID
            elif rdy <= 2:
                col = C_HULL_MID
            else:
                col = C_HULL_DARK
            put(px, py, col)

    # Side cyber-trim air intakes & dorsal crest ridge
    put(18, cy_hull - 1, C_TRIM_PRI)
    put(18, cy_hull, C_TRIM_SEC)
    put(20, cy_hull - 6, C_HULL_SPEC)
    put(21, cy_hull - 6, C_HULL_SPEC)
    put(27, cy_hull - 4, C_TRIM_PRI)
    put(28, cy_hull - 3, C_TRIM_SEC)

    # Front Armor Visor Channel (`x = 22..30, y = cy_hull-2 .. cy_hull+2`) & Crimson Command Optic!
    for vy in range(cy_hull - 2 + pitch, cy_hull + 2 + pitch):
        for vx in range(22, 31):
            put(vx, vy, C_VISOR_BG)
    # Sleek eyebrow armor highlight over visor
    for vx in range(22, 30):
        put(vx, cy_hull - 3 + pitch, C_HULL_SPEC)

    # Cob Signature Crimson Optic Iris (glowing scan glint shifts cleanly across frames)
    eye_cx = 26 + (1 if (is_strike or (frame_idx in (2, 3, 4))) else 0)
    eye_cy = cy_hull - 1 + pitch
    for ey in range(eye_cy, eye_cy + 3):
        for ex in range(eye_cx - 2, eye_cx + 3):
            if 22 <= ex <= 30:
                put(ex, ey, C_EYE_DARK if abs(ex - eye_cx) == 2 else C_EYE_MID)
    put(eye_cx, eye_cy + 1, C_EYE_HOT)
    put(eye_cx + 1, eye_cy, C_WHITE)

    # 5. Under-Slung Twin-Prong Prism Rail-Emitter -> Exact Nozzle Core at `(32, 35)`!
    # Connects cleanly under chin `(25..33, 29..36)` so beam originates seamlessly from prism mouth `(32, 35)`!
    mount_x, mount_y = 25, 29 + bob_y
    for step in range(7):
        rx = mount_x + step
        ry = mount_y + int(round(step * 0.72))
        put(rx, ry, C_HULL_TOP)
        put(rx + 1, ry, C_HULL_SPEC if step >= 4 else C_HULL_MID)
        # Upper & lower accelerator fork tines flare open by 1px on Strike Row
        spread = 2 if is_strike else 1
        put(rx + 1, ry - spread, C_HULL_TOP)
        put(rx, ry + 1, C_HULL_DARK)
    # Charged prism crystal muzzle at exact `(32, 35)` (`+16, +22` upscaled in `96x96`)
    muzzle_col = C_TRIM_SEC if (is_strike or frame_idx % 2 == 0) else C_TRIM_PRI
    put(31, 34, C_HULL_SPEC)
    put(30, 35, muzzle_col)
    put(31, 35, muzzle_col)
    put(32, 34, muzzle_col)
    put(32, 36, muzzle_col)
    put(33, 35, muzzle_col)
    put(32, 35, C_WHITE if (is_strike or frame_idx % 2 == 0) else C_EYE_HOT)

    # 6. Fore Wing drawn cleanly OVER dorsal shoulder mount for true layered mecha depth!
    draw_feather_wing(is_front=True)

    # 7. Seal tiny enclosed interior chassis pinholes & apply crisp 1px dark exterior Selout (`alpha >= 200`)
    cell = _fill_enclosed_holes_rgba(cell, max_hole_area=6, safe_border=4)
    solid = cell[:, :, 3] >= 200
    selout_pts: list[tuple[int, int]] = []
    sy_idx, sx_idx = np.where(solid)
    for py_i, px_i in zip(sy_idx, sx_idx):
        py, px = int(py_i), int(px_i)
        for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = px + ox, py + oy
            if 2 <= nx < DRONE_LOG - 2 and 2 <= ny < DRONE_LOG - 2 and cell[ny, nx, 3] == 0:
                selout_pts.append((nx, ny))
    for nx, ny in selout_pts:
        cell[ny, nx] = C_SELOUT

    # Enforce strict >= 2px logical (>= 4px upscaled `96x96`) transparent margin on every cell
    cell[:2, :] = 0
    cell[DRONE_LOG - 2 :, :] = 0
    cell[:, :2] = 0
    cell[:, DRONE_LOG - 2 :] = 0
    return cell


def build_cob_drone_sheet() -> np.ndarray:
    sheet = np.zeros(
        (DRONE_ROWS * DRONE_CELL, DRONE_COLS * DRONE_CELL, 4), dtype=np.uint8
    )
    for r in range(DRONE_ROWS):
        trans = 0
        prev_up = None
        for c in range(DRONE_COLS):
            c48 = build_cob_drone_cell_48(r, c)
            up = np.array(
                Image.fromarray(c48, "RGBA").resize(
                    (DRONE_CELL, DRONE_CELL), Image.Resampling.NEAREST
                ),
                dtype=np.uint8,
            )
            va = up[:, :, 3] > 0
            assert not (
                np.any(va[:4, :])
                or np.any(va[-4:, :])
                or np.any(va[:, :4])
                or np.any(va[:, -4:])
            ), f"Cob drone Row {r} F{c} 4px border clip!"
            if prev_up is not None and not np.array_equal(up, prev_up):
                trans += 1
            prev_up = up
            sheet[
                r * DRONE_CELL : (r + 1) * DRONE_CELL,
                c * DRONE_CELL : (c + 1) * DRONE_CELL,
            ] = up
        assert trans == DRONE_COLS - 1, f"Cob drone Row {r} transitions={trans} != {DRONE_COLS - 1}"

    Image.fromarray(sheet, "RGBA").save(OUT_DRONE_ANIM, optimize=True)
    print(
        f"Saved {OUT_DRONE_ANIM}: {DRONE_COLS * DRONE_CELL}x{DRONE_ROWS * DRONE_CELL} RGBA "
        f"({DRONE_COLS}x{DRONE_ROWS} of {DRONE_CELL}x{DRONE_CELL}, 0 4px clips, 7/7 transitions)"
    )

    SCRATCH_DIR.mkdir(parents=True, exist_ok=True)
    qa_w = 4 * DRONE_CELL * 2
    qa_h = (2 * DRONE_CELL + 24) * 2
    qa = Image.new("RGBA", (qa_w, qa_h), (12, 16, 32, 255))
    dr = ImageDraw.Draw(qa)
    labels = [
        ("R0 IDLE F0", 0, 0),
        ("R0 IDLE F3", 0, 3),
        ("R1 STRIKE F2", 1, 2),
        ("R1 STRIKE F6", 1, 6),
        ("R2 INFERNO F1", 2, 1),
        ("R2 INFERNO F5", 2, 5),
        ("R3 GLACIAL F1", 3, 1),
        ("R3 GLACIAL F5", 3, 5),
    ]
    for idx, (lbl, rr, cc) in enumerate(labels):
        gx = (idx % 4) * DRONE_CELL * 2
        gy = (idx // 4) * (DRONE_CELL * 2 + 48)
        tile = Image.fromarray(
            sheet[
                rr * DRONE_CELL : (rr + 1) * DRONE_CELL,
                cc * DRONE_CELL : (cc + 1) * DRONE_CELL,
            ],
            "RGBA",
        ).resize((DRONE_CELL * 2, DRONE_CELL * 2), Image.Resampling.NEAREST)
        qa.alpha_composite(tile, (gx, gy + 24))
        dr.rectangle(
            [gx, gy, gx + DRONE_CELL * 2 - 1, gy + DRONE_CELL * 2 + 23],
            outline=(71, 85, 105, 255),
        )
        dr.text((gx + 8, gy + 6), lbl, fill=(34, 211, 238, 255))
    qa.save(SCRATCH_DIR / "cob_drone_anim_qa.png")
    return sheet


def main():
    build_cob_drone_sheet()
    if "--drones-only" in sys.argv[1:]:
        return

    base_rgb = build_reframed_base_canvas()
    inferno_rgb = build_inferno_variant_canvas(base_rgb)
    glacial_rgb = build_glacial_variant_canvas(base_rgb)

    stage_norm = quantize_and_save(base_rgb, OUT_STAGE, colors=56)
    stage_inf = quantize_and_save(inferno_rgb, OUT_STAGE_INFERNO, colors=56)
    stage_glac = quantize_and_save(glacial_rgb, OUT_STAGE_GLACIAL, colors=56)

    cob_fg_crop = _cob_silhouette_mask(base_rgb)[COB_Y0 : COB_Y0 + COB_H, COB_X0 : COB_X0 + COB_W]
    strip = np.zeros((COB_H * NUM_ROWS, COB_W * NUM_FRAMES, 4), dtype=np.uint8)
    _render_cob_row_into_strip(strip, 0, stage_norm, cob_fg_crop, "normal")
    _render_cob_row_into_strip(strip, 1, stage_norm, cob_fg_crop, "attack")
    _render_cob_row_into_strip(strip, 2, stage_inf, cob_fg_crop, "inferno")
    _render_cob_row_into_strip(strip, 3, stage_glac, cob_fg_crop, "glacial")
    Image.fromarray(strip, "RGBA").save(OUT_ANIM, optimize=True)
    print(
        f"Saved {OUT_ANIM}: {COB_W * NUM_FRAMES}x{COB_H * NUM_ROWS} RGBA "
        f"({NUM_FRAMES}x{NUM_ROWS} of {COB_W}x{COB_H}), "
        f"norm=({COB_X0/640:.4f}, {COB_Y0/360:.4f}, {COB_W/640:.4f}, {COB_H/360:.4f}), "
        f"eye=({EYE_GX/640:.4f}, {EYE_GY/360:.4f})"
    )

    # Save 3-panel QA preview (Normal + Visible Viewport Box, Inferno, Glacial) in scratch/
    SCRATCH_DIR.mkdir(parents=True, exist_ok=True)
    qa = Image.new("RGBA", (640 * 3, 360), (10, 10, 24, 255))
    for i, (st_arr, row_i) in enumerate(((stage_norm, 1), (stage_inf, 2), (stage_glac, 3))):
        comp = Image.fromarray(st_arr, "RGB").convert("RGBA")
        f_ov = Image.fromarray(strip[row_i * COB_H : (row_i + 1) * COB_H, 3 * COB_W : 4 * COB_W], "RGBA")
        comp.alpha_composite(f_ov, (COB_X0, COB_Y0))
        qa.paste(comp, (i * 640, 0))
    qa.save(SCRATCH_DIR / "cob_monitor_stage_qa.png")


if __name__ == "__main__":
    main()
