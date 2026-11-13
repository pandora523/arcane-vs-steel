#!/usr/bin/env python3
"""
Converts generated HD-2D 16:9 Japanese Samurai Stage (`arena_shogunate`) and
Burning Japanese Inferno Stage (`arena_shogunate_inferno`) reference paintings
into crisp 640x360 48-color cel-clustered pixel-art stage assets matching
`arena_bg.png`, `arena_inferno.png`, and `arena_sanctuary.png`.
"""

import os
from collections import Counter
import numpy as np
from PIL import Image, ImageFilter

REPO_DIR = "/home/antigravity/pandora523/arcane-vs-steel"
ARTIFACT_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/b9d8130e-8764-4ace-8d4e-40f97049d6f1"

SHOGUNATE_SRC = os.path.join(ARTIFACT_DIR, "arena_shogunate_hd2d_1794576557298.jpg")
SHOGUNATE_INFERNO_SRC = os.path.join(ARTIFACT_DIR, "arena_shogunate_inferno_hd2d_1794576598100.jpg")

OUT_SHOGUNATE = os.path.join(REPO_DIR, "assets/sprites/arena_shogunate.png")
OUT_SHOGUNATE_INFERNO = os.path.join(REPO_DIR, "assets/sprites/arena_shogunate_inferno.png")


def despeckle_rgb(arr: np.ndarray, passes: int = 1) -> np.ndarray:
    """Replaces isolated 1px JPEG/confetti speckles where 0 cardinal neighbors match and >=3 agree."""
    out = arr.copy()
    h, w, _ = out.shape
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
    # 1. Pre-downsample cel-flattening at 1280x720 to strip JPEG mosquito noise while preserving crisp eaves/petals
    im_mid = im.resize((1280, 720), Image.Resampling.BILINEAR).filter(ImageFilter.MedianFilter(size=3))
    # 2. Crisp nearest-neighbor downsample to canonical 640x360 HD-2D stage resolution
    im_640 = im_mid.resize((640, 360), Image.Resampling.NEAREST)
    # 3. Quantize to 48-color curated octree palette with zero dithering (matching arena_bg/arena_inferno)
    im_q = im_640.quantize(colors=num_colors, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).convert("RGB")
    arr = despeckle_rgb(np.array(im_q), passes=1)
    # Re-quantize strictly to <=48 colors if despeckle touched any edge
    final_im = Image.fromarray(arr, "RGB")
    uniq = len(np.unique(arr.reshape(-1, 3), axis=0))
    final_im.save(out_path, optimize=True)
    print(f"Saved {out_path}: {final_im.size} {final_im.mode}, unique_colors={uniq}")
    return arr


def main():
    arr_shog = build_stage_png(SHOGUNATE_SRC, OUT_SHOGUNATE, num_colors=48)
    arr_inf = build_stage_png(SHOGUNATE_INFERNO_SRC, OUT_SHOGUNATE_INFERNO, num_colors=48)

    # Measure bright moon & lantern centroids in 640x360 normalized [0..1] coords for Renderer.js!
    r, g, b = arr_shog[:, :, 0].astype(int), arr_shog[:, :, 1].astype(int), arr_shog[:, :, 2].astype(int)
    moon_mask = (b > 205) & (g > 195) & (np.arange(360)[:, None] < 150)
    if np.any(moon_mask):
        mys, mxs = np.where(moon_mask)
        print(f"Shogunate Moon center norm: cx={mxs.mean()/640:.3f}, cy={mys.mean()/360:.3f}")

    warm_mask = (r > 215) & (g > 140) & (r - b > 80) & (np.arange(360)[:, None] > 160) & (np.arange(360)[:, None] < 255)
    for name, x0, x1 in [("L_Outer_Toro", 0, 80), ("L_Inner_Toro", 130, 190), ("R_Inner_Toro", 450, 510), ("R_Outer_Toro", 560, 640)]:
        sub = warm_mask[:, x0:x1]
        if np.any(sub):
            lys, lxs = np.where(sub)
            print(f"  {name}: cx={(x0 + lxs.mean())/640:.3f}, cy={lys.mean()/360:.3f}")

    ri, gi, bi = arr_inf[:, :, 0].astype(int), arr_inf[:, :, 1].astype(int), arr_inf[:, :, 2].astype(int)
    eclipse_ring = (ri > 235) & (gi > 150) & (np.arange(360)[:, None] < 130) & (np.arange(640)[None, :] > 310) & (np.arange(640)[None, :] < 450)
    if np.any(eclipse_ring):
        eys, exs = np.where(eclipse_ring)
        print(f"Shogunate Inferno Eclipse center norm: cx={exs.mean()/640:.3f}, cy={eys.mean()/360:.3f}")


if __name__ == "__main__":
    main()
