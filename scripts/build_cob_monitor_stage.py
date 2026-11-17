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

import numpy as np
from PIL import Image, ImageFilter

REPO_ROOT = Path(__file__).resolve().parents[1]
RAW_SRC = REPO_ROOT / "assets" / "sprites" / "arena_cob_monitor_raw.jpg"
OUT_STAGE = REPO_ROOT / "assets" / "sprites" / "arena_cob_monitor.png"
OUT_STAGE_INFERNO = REPO_ROOT / "assets" / "sprites" / "arena_cob_monitor_inferno.png"
OUT_STAGE_GLACIAL = REPO_ROOT / "assets" / "sprites" / "arena_cob_monitor_glacial.png"
OUT_ANIM = REPO_ROOT / "assets" / "sprites" / "cob_creator_anim.png"
SCRATCH_DIR = Path(
    "/Users/rei/.gemini/antigravity/brain/239311b7-74c9-4bb0-b057-16821639c080/scratch"
)

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
    """Returns a boolean mask of Cob's silhouette inside the 640x360 canvas (excluding glass sky)."""
    r = base_rgb[:, :, 0].astype(np.int32)
    g = base_rgb[:, :, 1].astype(np.int32)
    b = base_rgb[:, :, 2].astype(np.int32)
    lum = (r * 30 + g * 59 + b * 11) // 100
    yy, xx = np.mgrid[0:360, 0:640]
    in_glass = (xx >= 246) & (xx <= 398) & (yy >= 142) & (yy <= 278)
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
    # Fill core torso & head interiors robustly (`y>=192, x=262..376` is dark charcoal hoodie interior!)
    hoodie_box = (yy >= 192) & (yy <= 276) & (xx >= 262) & (xx <= 376) & ((r + g + b) < 88) & ((b - r) <= 8)
    cap_box = (yy >= 145) & (yy <= 185) & (xx >= 274) & (xx <= 354) & ((r + g + b) < 92) & ((b - r) <= 9)
    return closed | hoodie_box | cap_box


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
    hair_roi = (
        cob_fg_crop
        & (r0 >= 105)
        & (g0 >= 105)
        & (b0 >= 105)
        & (np.abs(r0 - b0) < 38)
        & (yy >= 48)
        & (yy <= 102)
        & (xx >= 78)
        & (xx <= 154)
    )
    wing_roi = (
        cob_fg_crop
        & (r0 >= 135)
        & (g0 >= 135)
        & (b0 >= 135)
        & (np.abs(r0 - b0) < 48)
        & (yy >= 106)
        & (yy <= 174)
        & (xx >= 94)
        & (xx <= 188)
    )
    rim_roi = (
        (cob_fg_crop & (b0 - r0 > 24) & (g0 > 80))
        if mode in ("normal", "attack", "glacial")
        else (cob_fg_crop & (r0 - b0 > 55) & (g0 > 60))
    )

    # Mask alpha strictly around Cob's figure (dilated 5px for breathing lift, bottom sill feathered cleanly)
    pad = np.pad(cob_fg_crop, 5, mode="constant", constant_values=False)
    dil = np.zeros_like(cob_fg_crop)
    for dy_s in range(-4, 5):
        for dx_s in range(-4, 5):
            if abs(dy_s) + abs(dx_s) <= 5:
                dil |= pad[5 + dy_s : 5 + dy_s + COB_H, 5 + dx_s : 5 + dx_s + COB_W]
    ay_bot = np.clip((COB_H - 3 - yy) / 8.0, 0.0, 1.0)
    feather_alpha = (np.where(dil, 1.0, 0.0) * ay_bot * 255.0).astype(np.uint8)

    skin_patch = base_crop[ly_eye + 3 : ly_eye + 8, lx_eye + 1 : lx_eye + 6]
    skin_col = tuple(int(v) for v in np.median(skin_patch.reshape(-1, 3), axis=0))

    y_dst0 = row_idx * COB_H
    for f in range(NUM_FRAMES):
        u = f / float(NUM_FRAMES)
        if mode == "attack":
            # Command surge posture: sharper over-shoulder glare + assertive lift
            head_dy = -3 if f in (2, 3, 4) else (-2 if f in (1, 5) else -1)
            shoulder_dy = -2 if f in (2, 3, 4, 5) else -1
            head_dx = 2 if f in (3, 4, 5) else 1
        else:
            head_dy = -2 if f in (3, 4) else (-1 if f in (2, 5) else 0)
            shoulder_dy = -1 if f in (2, 3, 4, 5) else 0
            head_dx = 1 if f in (4, 5) else (-1 if f in (1, 2) else 0)

        frame_rgb = base_crop.copy()

        # 1. Upper-body / shoulder breathing shift (strictly anchored bottom rows >=162!)
        if shoulder_dy != 0:
            y_s0, y_s1 = 100, 162
            frame_rgb[y_s0 + shoulder_dy : y_s1 + shoulder_dy] = base_crop[y_s0:y_s1]

        # 2. Head & cap motion shift inside crop (`y = 36..116, x = 62..174`)
        if head_dy != 0 or head_dx != 0:
            for y in range(36, 116):
                sy = y - head_dy
                if 0 <= sy < COB_H:
                    for x in range(60, 176):
                        sx = x - head_dx
                        if 0 <= sx < COB_W:
                            px_val = base_crop[sy, sx]
                            is_fg = (
                                int(px_val[0]) + int(px_val[1]) + int(px_val[2]) > 54
                                or (74 <= x <= 158 and int(px_val[2]) < 18)
                            )
                            if is_fg:
                                frame_rgb[y, x] = px_val

        ex = lx_eye + head_dx
        ey = ly_eye + head_dy

        # 3. Animated hair shimmer & mode-specific glass rim pulse
        shimmer_band_y = int(round(46 + ((f * 13) % 48)))
        hair_shimmer = hair_roi & (np.abs(yy - shimmer_band_y) <= 8)
        hair_delta = (
            np.array([34, 16, -6])
            if mode == "inferno"
            else np.array([10, 32, 46])
            if mode == "glacial"
            else np.array([18, 36, 44])
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


def main():
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
