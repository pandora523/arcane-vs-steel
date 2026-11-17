#!/opt/homebrew/bin/python3.11
"""
Builds the Fourth-Wall Supreme Ultimate Stage (`cob_monitor` — "COB-OS: FOURTH WALL TERMINAL"):
  - `assets/sprites/arena_cob_monitor.png`  (640x360 RGB PNG, 56-color quantized HD-2D stage)
  - `assets/sprites/cob_creator_anim.png`   (1920x180 RGBA PNG = 8 frames of 240x180 animated Cob overlay)
  - Compact visual QA strip in scratch dir.
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
OUT_ANIM = REPO_ROOT / "assets" / "sprites" / "cob_creator_anim.png"
SCRATCH_DIR = Path(
    "/Users/rei/.gemini/antigravity/brain/239311b7-74c9-4bb0-b057-16821639c080/scratch"
)

# Exact 240x180 crop box covering Cob's cap, silver hair, crimson eye, shoulders & upper winged hoodie
COB_X0, COB_Y0 = 212, 8
COB_W, COB_H = 240, 180
NUM_FRAMES = 8


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


def build_stage() -> np.ndarray:
    im = Image.open(RAW_SRC).convert("RGB")
    im_mid = im.resize((1280, 720), Image.Resampling.BILINEAR).filter(
        ImageFilter.MedianFilter(size=3)
    )
    im_640 = im_mid.resize((640, 360), Image.Resampling.NEAREST)
    im_q = im_640.quantize(
        colors=56, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE
    ).convert("RGB")
    arr = despeckle_rgb(np.array(im_q, dtype=np.uint8), passes=1)
    Image.fromarray(arr, "RGB").save(OUT_STAGE, optimize=True)
    uniq = len(np.unique(arr.reshape(-1, 3), axis=0))
    print(f"Saved {OUT_STAGE}: 640x360 RGB, unique_colors={uniq}")
    return arr


def build_cob_anim_strip(stage_arr: np.ndarray) -> np.ndarray:
    """
    Creates 8-frame 240x180 RGBA animated overlay of Cob behind the glass monitor:
      - F0..F4: Subtle breathing/head sway, silver hair & cyan rim pulse, vibrant crimson eye glint
      - F5: Soft half-blink + cyan data reflection sweep across spread-wings emblem
      - F6: Eyelid closed blink + shoulder settle
      - F7: Crisp eye re-open with bright crimson-white flare
    Bottom 14px smoothly feather alpha to 0 and lock vertical offset = 0 for a 100% seamless composite.
    """
    base_crop = stage_arr[COB_Y0 : COB_Y0 + COB_H, COB_X0 : COB_X0 + COB_W].copy()
    strip = np.zeros((COB_H, COB_W * NUM_FRAMES, 4), dtype=np.uint8)

    r0 = base_crop[:, :, 0].astype(np.int32)
    g0 = base_crop[:, :, 1].astype(np.int32)
    b0 = base_crop[:, :, 2].astype(np.int32)

    # Local crop coordinates for eye (global ~(290.5, 78))
    lx_eye = 290 - COB_X0  # 78
    ly_eye = 78 - COB_Y0   # 70

    # Masks in 240x180 crop space
    yy, xx = np.mgrid[0:COB_H, 0:COB_W]
    head_mask = (yy >= 0) & (yy <= 122) & (xx >= 42) & (xx <= 185)
    upper_body_mask = (yy >= 85) & (yy <= 160) & (xx >= 16) & (xx <= 224)
    # Identify pale skin / white wing / silver hair / cyan rim features inside crop
    crimson_mask = (r0 > 120) & (g0 < 85) & (b0 < 85) & (r0 - b0 > 55) & (yy < 105)
    eye_roi = (np.abs(xx - lx_eye) <= 5) & (np.abs(yy - ly_eye) <= 4)
    hair_roi = (
        (r0 >= 120)
        & (g0 >= 120)
        & (b0 >= 120)
        & (np.abs(r0 - b0) < 28)
        & (yy >= 28)
        & (yy <= 95)
        & (xx >= 66)
        & (xx <= 165)
    )
    wing_roi = (
        (r0 >= 150)
        & (g0 >= 155)
        & (b0 >= 160)
        & (np.abs(r0 - b0) < 34)
        & (yy >= 128)
        & (yy <= 172)
        & (xx >= 80)
        & (xx <= 205)
    )
    cyan_rim_roi = (b0 - r0 > 32) & (g0 > 95)

    # Soft feathered alpha window so outer crop edges vanish cleanly into stage_arr
    ax = np.clip(np.minimum(xx, COB_W - 1 - xx) / 14.0, 0.0, 1.0)
    ay_top = np.clip(yy / 4.0, 0.0, 1.0)
    ay_bot = np.clip((COB_H - 1 - yy) / 16.0, 0.0, 1.0)
    feather_alpha = (np.minimum(ax, np.minimum(ay_top, ay_bot)) * 255.0).astype(np.uint8)

    # Detect skin color around eye for crisp eyelid blink frames
    skin_patch = base_crop[ly_eye + 4 : ly_eye + 10, lx_eye + 2 : lx_eye + 8]
    skin_col = tuple(int(v) for v in np.median(skin_patch.reshape(-1, 3), axis=0))

    for f in range(NUM_FRAMES):
        u = f / float(NUM_FRAMES)
        # Clearly visible breathing lift in 640x360 pixels (0..-2 head, 0..-1 upper shoulders; 0 at bottom!)
        head_dy = -2 if f in (3, 4) else (-1 if f in (2, 5) else 0)
        shoulder_dy = -1 if f in (2, 3, 4, 5) else 0
        head_dx = 1 if f in (4, 5) else (-1 if f in (1, 2) else 0)

        frame_rgb = base_crop.copy()

        # 1. Apply upper-body micro-breath (rows 85..158 shifted cleanly)
        if shoulder_dy != 0:
            y_src0, y_src1 = 88, 158
            frame_rgb[y_src0 + shoulder_dy : y_src1 + shoulder_dy] = base_crop[y_src0:y_src1]

        # 2. Apply head/cap breathing lift + subtle over-the-shoulder glance
        if head_dy != 0 or head_dx != 0:
            for y in range(4, 118):
                sy = y - head_dy
                if 0 <= sy < COB_H:
                    for x in range(44, 184):
                        sx = x - head_dx
                        if 0 <= sx < COB_W:
                            px_val = base_crop[sy, sx]
                            is_fg = (
                                int(px_val[0]) + int(px_val[1]) + int(px_val[2]) > 56
                                or (4 <= x <= 180 and int(px_val[2]) < 16)
                            )
                            if is_fg:
                                frame_rgb[y, x] = px_val

        # Shift eye coordinate along with head motion
        ex = lx_eye + head_dx
        ey = ly_eye + head_dy

        # 3. Animated silver hair highlight glint & strong cyan rim shimmer across monitor glass
        shimmer_band_y = int(round(36 + ((f * 19) % 130)))
        hair_shimmer = hair_roi & (np.abs(yy - shimmer_band_y) <= 10)
        frame_rgb[hair_shimmer] = np.clip(
            frame_rgb[hair_shimmer].astype(np.int32) + np.array([24, 30, 38]), 0, 255
        ).astype(np.uint8)

        rim_boost = int(round(38 * (0.5 + 0.5 * math.sin(u * math.tau))))
        frame_rgb[cyan_rim_roi] = np.clip(
            frame_rgb[cyan_rim_roi].astype(np.int32) + np.array([4, rim_boost // 2 + 12, rim_boost + 18]),
            0,
            255,
        ).astype(np.uint8)

        # 4. Vivid rising silver-cyan energy wave sweeping upward across Cob's white spread-wings emblem
        wave_y = 172.0 - f * 7.5
        wing_wave = wing_roi & (np.abs(yy - wave_y) <= 9.0)
        frame_rgb[wing_wave] = np.clip(
            frame_rgb[wing_wave].astype(np.int32) + np.array([16, 48, 60]), 0, 255
        ).astype(np.uint8)
        diag = (xx * 0.7 + yy) - (f * 36.0 + 90.0)
        wing_sheen = wing_roi & (np.abs(diag) <= 10.0)
        frame_rgb[wing_sheen] = np.clip(
            frame_rgb[wing_sheen].astype(np.int32) + np.array([12, 32, 44]), 0, 255
        ).astype(np.uint8)

        # 5. Live Crimson Eye Blink / Command Flare Animation at `(ex, ey)`
        if f == 5:
            # Half-blink upper eyelid down + glowing red slit
            frame_rgb[max(0, ey - 2) : ey + 1, max(0, ex - 3) : min(COB_W, ex + 4)] = skin_col
            frame_rgb[ey, max(0, ex - 2) : min(COB_W, ex + 3)] = [20, 14, 22]
            frame_rgb[ey + 1, max(0, ex - 2) : min(COB_W, ex + 3)] = [248, 60, 76]
        elif f == 6:
            # Closed eyelid blink (clears full red iris y=ey-2..ey+2) + crisp dark lash line
            frame_rgb[max(0, ey - 2) : min(COB_H, ey + 3), max(0, ex - 3) : min(COB_W, ex + 4)] = skin_col
            frame_rgb[ey + 1, max(0, ex - 3) : min(COB_W, ex + 4)] = [18, 14, 24]
        else:
            # Piercing open crimson eye with pulsing pupil glint & re-open golden-crimson flare at F7!
            flare = 1.0 if f in (0, 3, 7) else 0.80
            hot_r = min(255, int(238 * flare + 17))
            if 1 <= ey < COB_H - 2 and 1 <= ex < COB_W - 2:
                frame_rgb[ey - 1 : ey + 2, ex - 1 : ex + 2] = [hot_r, 32, 46]
                if f in (3, 7):
                    frame_rgb[ey - 1, ex + 1] = [255, 232, 210] if f == 7 else [255, 224, 224]
                    frame_rgb[ey, ex] = [255, 84, 98]
                    if f == 7:
                        frame_rgb[ey, ex - 2] = [245, 72, 86]

        rgba = np.zeros((COB_H, COB_W, 4), dtype=np.uint8)
        rgba[:, :, :3] = frame_rgb
        rgba[:, :, 3] = feather_alpha
        # Where alpha would be zero at bottom, stay clean transparent
        strip[:, f * COB_W : (f + 1) * COB_W] = rgba

    Image.fromarray(strip, "RGBA").save(OUT_ANIM, optimize=True)
    print(
        f"Saved {OUT_ANIM}: {COB_W * NUM_FRAMES}x{COB_H} RGBA ({NUM_FRAMES}x {COB_W}x{COB_H}), "
        f"norm=({COB_X0/640:.4f}, {COB_Y0/360:.4f}, {COB_W/640:.4f}, {COB_H/360:.4f})"
    )
    return strip


def main():
    stage_arr = build_stage()
    strip = build_cob_anim_strip(stage_arr)

    # Save compact QA check composite comparing F0, F3, F5, F6, F7
    SCRATCH_DIR.mkdir(parents=True, exist_ok=True)
    qa = Image.new("RGBA", (640, 360 * 2), (10, 10, 24, 255))
    qa.paste(Image.fromarray(stage_arr, "RGB").convert("RGBA"), (0, 0))
    # Show Frame 6 blink composited seamlessly onto stage + zoomed eye comparisons
    stage_comp = Image.fromarray(stage_arr, "RGB").convert("RGBA")
    f6 = Image.fromarray(strip[:, 6 * COB_W : 7 * COB_W], "RGBA")
    stage_comp.alpha_composite(f6, (COB_X0, COB_Y0))
    qa.paste(stage_comp, (0, 360))
    qa.save(SCRATCH_DIR / "cob_monitor_stage_qa.png")


if __name__ == "__main__":
    main()
