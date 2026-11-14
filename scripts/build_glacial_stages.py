#!/usr/bin/env python3
"""
Converts generated HD-2D 16:9 Permafrost Aurora Sanctum (`arena_glacial`) and
Frozen Sakura Shogunate (`arena_shogunate_glacial`) reference paintings into
crisp 640x360 48-color cel-clustered pixel-art stage assets matching
`arena_bg.png`, `arena_inferno.png`, `arena_shogunate.png`, and `arena_shogunate_inferno.png`.
"""

import os
from collections import Counter
import numpy as np
from PIL import Image, ImageFilter

REPO_DIR = "/home/antigravity/pandora523/arcane-vs-steel"
ARTIFACT_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/7821d65d-384a-4e26-8167-f32a84e377d8"

GLACIAL_SRC = os.path.join(ARTIFACT_DIR, "arena_glacial_hd2d_1794621936749.jpg")
SHOGUNATE_GLACIAL_SRC = os.path.join(ARTIFACT_DIR, "arena_shogunate_glacial_hd2d_1794621939210.jpg")

OUT_GLACIAL = os.path.join(REPO_DIR, "assets/sprites/arena_glacial.png")
OUT_SHOGUNATE_GLACIAL = os.path.join(REPO_DIR, "assets/sprites/arena_shogunate_glacial.png")


def despeckle_rgb(arr: np.ndarray, passes: int = 1) -> np.ndarray:
    """Replaces isolated 1px JPEG/confetti speckles where 0 cardinal neighbors match and >=3 agree."""
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


def build_stage_png(src_path: str, out_path: str, num_colors: int = 48) -> np.ndarray:
    im = Image.open(src_path).convert("RGB")
    # 1. Pre-downsample cel-flattening at 1280x720 to strip JPEG mosquito noise while preserving crisp icicles/arches
    im_mid = im.resize((1280, 720), Image.Resampling.BILINEAR).filter(ImageFilter.MedianFilter(size=3))
    # 2. Crisp nearest-neighbor downsample to canonical 640x360 HD-2D stage resolution
    im_640 = im_mid.resize((640, 360), Image.Resampling.NEAREST)
    # 3. Quantize to 48-color curated octree palette with zero dithering (matching arena_shogunate/arena_inferno)
    im_q = im_640.quantize(colors=num_colors, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).convert("RGB")
    arr = despeckle_rgb(np.array(im_q), passes=1)
    final_im = Image.fromarray(arr, "RGB")
    uniq = len(np.unique(arr.reshape(-1, 3), axis=0))
    final_im.save(out_path, optimize=True)
    print(f"Saved {out_path}: {final_im.size} {final_im.mode}, unique_colors={uniq}")
    return arr


def main():
    arr_glac = build_stage_png(GLACIAL_SRC, OUT_GLACIAL, num_colors=48)
    arr_shog_glac = build_stage_png(SHOGUNATE_GLACIAL_SRC, OUT_SHOGUNATE_GLACIAL, num_colors=48)

    # Measure moon & cyan spirit-lantern centroids in 640x360 normalized [0..1] coords for Renderer.js!
    r, g, b = arr_glac[:, :, 0].astype(int), arr_glac[:, :, 1].astype(int), arr_glac[:, :, 2].astype(int)
    crescent_mask = (b > 220) & (g > 210) & (np.arange(360)[:, None] < 90) & (np.arange(640)[None, :] > 320) & (np.arange(640)[None, :] < 430)
    if np.any(crescent_mask):
        mys, mxs = np.where(crescent_mask)
        print(f"Glacial Crescent Moon center norm: cx={mxs.mean()/640:.3f}, cy={mys.mean()/360:.3f}")

    rs, gs, bs = arr_shog_glac[:, :, 0].astype(int), arr_shog_glac[:, :, 1].astype(int), arr_shog_glac[:, :, 2].astype(int)
    moon_mask = (bs > 215) & (gs > 205) & (np.arange(360)[:, None] < 130) & (np.arange(640)[None, :] > 320) & (np.arange(640)[None, :] < 440)
    if np.any(moon_mask):
        mys, mxs = np.where(moon_mask)
        print(f"Shogunate Glacial Moon center norm: cx={mxs.mean()/640:.3f}, cy={mys.mean()/360:.3f}")

    cyan_lantern = (bs > 210) & (gs > 190) & (bs - rs > 90) & (np.arange(360)[:, None] > 165) & (np.arange(360)[:, None] < 245)
    for name, x0, x1 in [("L_Outer_Toro", 0, 80), ("L_Inner_Toro", 130, 195), ("R_Inner_Toro", 445, 510), ("R_Outer_Toro", 560, 640)]:
        sub = cyan_lantern[:, x0:x1]
        if np.any(sub):
            lys, lxs = np.where(sub)
            print(f"  {name}: cx={(x0 + lxs.mean())/640:.3f}, cy={lys.mean()/360:.3f}")


if __name__ == "__main__":
    main()
