#!/usr/bin/env python3
"""
Builds the Unified Theme-Related Multi-Plane Seamless HD-2D Adventure Panoramas (v4)
from newly generated bespoke "Abyssal Eclipse Pilgrimage" panoramic artworks:
  - Far Vista (`adv_vista_west` + `adv_vista_east`):
      Continuous dark-fantasy canyon & sky panorama under one Abyssal Solar Eclipse:
      Ruined Eclipse Viaducts -> Bioluminescent Cursed Starwood Waterfalls ->
      Sunken Violet Necropolis Bone-Viaduct -> Smoldering Black Pit Magma Peaks.
  - Midground Colonnade & Walkable Causeway (`adv_zone1..4`):
      Continuous ancient Gothic stone causeway across 4 realms:
      Zone I   (`0..1200`):    Eclipse Outskirts (Broken Gothic Corbels, Chains, Cyan/Amber Braziers)
      Zone II  (`1200..2400`): Cursed Starwood (Overgrown Spirit-Trees, Vines, Crystal Lanterns)
      Zone III (`2400..3600`): Abyssal Bone-Gate (Ossuary Gargoyles, Shattered Portcullis, Soul Braziers)
      Zone IV  (`3600..4800`): Throne of the Black Pit (Scorched Obsidian Arch, Chains, Magma Cracks)

Outputs (`SCALE = 2.625` world px per art px, `ORIGIN_WORLD_X = -840.0`):
  1. `assets/sprites/adv_vista_pano.png` (`1680 x 272` RGB, `p = 0.42` Far Canyon & Eclipse Vista)
  2. `assets/sprites/adv_arch_pano.png`  (`2358 x 272` RGBA, `p = 0.86` Organic Sky-Keyed Colonnade)
  3. `assets/sprites/adv_floor_pano.png` (`2742 x 96`  RGB, `p = 1.00` Seamless Perspective Causeway)
  4. `assets/sprites/adv_inferno_pano.png` (`800 x 360` RGB, Seamless Black Pit Inferno Override)
"""

import os
from collections import deque
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPRITES_DIR = os.path.join(ROOT, "assets", "sprites")
ARTIFACT_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/b9d8130e-8764-4ace-8d4e-40f97049d6f1"

SRC_FILES = {
    "vista_west": os.path.join(ARTIFACT_DIR, "adv_vista_west_1794560461975.jpg"),
    "vista_east": os.path.join(ARTIFACT_DIR, "adv_vista_east_1794560515545.jpg"),
    "zone1": os.path.join(ARTIFACT_DIR, "adv_zone1_eclipse_1794560462826.jpg"),
    "zone2": os.path.join(ARTIFACT_DIR, "adv_zone2_starwood_1794560517782.jpg"),
    "zone3": os.path.join(ARTIFACT_DIR, "adv_zone3_bonegate_v2_1794560585766.jpg"),
    "zone4": os.path.join(ARTIFACT_DIR, "adv_zone4_blackpit_1794560519072.jpg"),
}

BAYER_4X4 = (
    np.array(
        [
            [0, 8, 2, 10],
            [12, 4, 14, 6],
            [3, 11, 1, 9],
            [15, 7, 13, 5],
        ],
        dtype=np.float32,
    )
    / 16.0
)


def gblur_rgb(arr: np.ndarray, radius: float) -> np.ndarray:
    if radius <= 0.05:
        return arr.copy()
    im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), mode="RGB")
    return np.array(im.filter(ImageFilter.GaussianBlur(radius=radius)), dtype=np.float32)


def gblur_gray(arr: np.ndarray, radius: float) -> np.ndarray:
    if radius <= 0.05:
        return arr.copy()
    im = Image.fromarray(np.clip(arr * 255.0, 0, 255).astype(np.uint8), mode="L")
    return np.array(im.filter(ImageFilter.GaussianBlur(radius=radius)), dtype=np.float32) / 255.0


def smoothstep_np(t: np.ndarray) -> np.ndarray:
    c = np.clip(t, 0.0, 1.0)
    return c * c * (3.0 - 2.0 * c)


def compute_dp_seam(harm_A: np.ndarray, harm_B: np.ndarray, overlap: int) -> np.ndarray:
    H = harm_A.shape[0]
    x_min = max(4, int(overlap * 0.24))
    x_max = min(overlap - 4, int(overlap * 0.76))
    sub_w = x_max - x_min

    diff_sq = np.sum((harm_A[:, x_min:x_max, :] - harm_B[:, x_min:x_max, :]) ** 2, axis=2)
    mid_rgb = 0.5 * (harm_A[:, x_min:x_max, :] + harm_B[:, x_min:x_max, :])
    luma = 0.299 * mid_rgb[:, :, 0] + 0.587 * mid_rgb[:, :, 1] + 0.114 * mid_rgb[:, :, 2]
    cx_norm = np.linspace(-1.0, 1.0, sub_w, dtype=np.float32)[None, :]
    cost = diff_sq * (0.35 + 0.65 * (luma / 255.0)) + (cx_norm ** 2) * 360.0

    dp = np.zeros((H, sub_w), dtype=np.float32)
    back = np.zeros((H, sub_w), dtype=np.int32)
    dp[0] = cost[0]
    for y in range(1, H):
        prev = dp[y - 1]
        for x in range(sub_w):
            x0 = max(0, x - 1)
            x1 = min(sub_w - 1, x + 1)
            best = x0 + int(np.argmin(prev[x0 : x1 + 1]))
            dp[y, x] = cost[y, x] + prev[best]
            back[y, x] = best

    seam = np.zeros(H, dtype=np.float32)
    cur = int(np.argmin(dp[H - 1]))
    seam[H - 1] = cur + x_min
    for y in range(H - 2, -1, -1):
        cur = back[y + 1, cur]
        seam[y] = cur + x_min

    seam = np.convolve(np.pad(seam, (4, 4), mode="edge"), np.ones(9) / 9.0, mode="valid")
    return seam


def multiband_quilt_rgb(left_strip: np.ndarray, right_strip: np.ndarray, overlap: int) -> np.ndarray:
    """
    5-Band Burt-Adelson Laplacian Pyramid + Minimum-Error DP Seam Quilter.
    """
    H, W1, _ = left_strip.shape
    H2, W2, _ = right_strip.shape
    assert H == H2 and overlap >= 24 and W1 >= overlap and W2 >= overlap

    pad_l = min(72, W1 - overlap)
    pad_r = min(72, W2 - overlap)
    ext_w = pad_l + overlap + pad_r

    A_ext = np.zeros((H, ext_w, 3), dtype=np.float32)
    B_ext = np.zeros((H, ext_w, 3), dtype=np.float32)

    A_src = left_strip[:, W1 - overlap - pad_l :, :]
    A_ext[:, : pad_l + overlap, :] = A_src
    A_ext[:, pad_l + overlap :, :] = A_src[:, -1:, :]

    B_src = right_strip[:, : overlap + pad_r, :]
    B_ext[:, pad_l:, :] = B_src
    B_ext[:, :pad_l, :] = B_src[:, :1, :]

    lowA = gblur_rgb(A_ext[:, pad_l : pad_l + overlap, :], 26.0)
    lowB = gblur_rgb(B_ext[:, pad_l : pad_l + overlap, :], 26.0)
    u_ov = smoothstep_np(np.linspace(0.0, 1.0, overlap, dtype=np.float32))[None, :, None]
    shared_low = lowA * (1.0 - u_ov) + lowB * u_ov
    harmA = (A_ext[:, pad_l : pad_l + overlap, :] - lowA) + shared_low
    harmB = (B_ext[:, pad_l : pad_l + overlap, :] - lowB) + shared_low
    seam_ov = compute_dp_seam(harmA, harmB, overlap)
    seam_ext = seam_ov + pad_l

    radii = [1.5, 4.2, 11.0, 28.0]
    gA = [A_ext]
    gB = [B_ext]
    for r in radii:
        gA.append(gblur_rgb(A_ext, r))
        gB.append(gblur_rgb(B_ext, r))

    lapA = [gA[i] - gA[i + 1] for i in range(len(radii))] + [gA[-1]]
    lapB = [gB[i] - gB[i + 1] for i in range(len(radii))] + [gB[-1]]

    xs = np.arange(ext_w, dtype=np.float32)[None, :]
    ys = np.arange(H, dtype=np.int32)[:, None]
    bayer = BAYER_4X4[ys % 4, np.arange(ext_w, dtype=np.int32)[None, :] % 4]

    d0 = (xs - seam_ext[:, None]) / 4.0 + 0.5
    m0 = np.where(
        xs < seam_ext[:, None] - 2.4,
        0.0,
        np.where(xs > seam_ext[:, None] + 2.4, 1.0, (d0 > bayer).astype(np.float32)),
    )

    half_widths = [9.0, 24.0, 54.0]
    masks = [m0[:, :, None]]
    for hw in half_widths:
        m = smoothstep_np((xs - (seam_ext[:, None] - hw)) / (2.0 * hw))
        masks.append(m[:, :, None])

    m_base = smoothstep_np((xs - pad_l) / float(overlap))[:, :, None]
    masks.append(m_base)

    comp_ext = np.zeros_like(A_ext)
    for lA, lB, m in zip(lapA, lapB, masks):
        comp_ext += lA * (1.0 - m) + lB * m

    comp_ext = np.clip(comp_ext, 0.0, 255.0)

    out_w = W1 + W2 - overlap
    out = np.zeros((H, out_w, 3), dtype=np.float32)
    out[:, : W1 - overlap - pad_l, :] = left_strip[:, : W1 - overlap - pad_l, :]
    out[:, W1 - overlap - pad_l : W1 + pad_r, :] = comp_ext
    out[:, W1 + pad_r :, :] = right_strip[:, overlap + pad_r :, :]
    return out


def multiband_quilt_rgba(left_rgba: np.ndarray, right_rgba: np.ndarray, overlap: int) -> np.ndarray:
    """
    Quilts two RGBA colonnade panels across their OPAQUE outer stone columns (`alpha == 255`
    throughout the outer 160..200px column regions!), preserving crisp alpha inside each panel's open arch!
    """
    rgb_out = multiband_quilt_rgb(left_rgba[:, :, :3], right_rgba[:, :, :3], overlap=overlap)
    H, W1, _ = left_rgba.shape
    W2 = right_rgba.shape[1]
    out_w = W1 + W2 - overlap
    alpha_out = np.zeros((H, out_w), dtype=np.float32)

    alpha_out[:, : W1 - overlap] = left_rgba[:, : W1 - overlap, 3]
    u = smoothstep_np(np.linspace(0.0, 1.0, overlap, dtype=np.float32))[None, :]
    alpha_out[:, W1 - overlap : W1] = (
        left_rgba[:, W1 - overlap :, 3] * (1.0 - u) + right_rgba[:, :overlap, 3] * u
    )
    alpha_out[:, W1:] = right_rgba[:, overlap:, 3]

    out = np.zeros((H, out_w, 4), dtype=np.uint8)
    out[:, :, :3] = np.clip(rgb_out, 0, 255).astype(np.uint8)
    out[:, :, 3] = np.clip(np.round(alpha_out), 0, 255).astype(np.uint8)
    return out


def load_aligned_zone_panel(path: str, curb_src_y: int) -> tuple[np.ndarray, np.ndarray]:
    """
    Loads a `1376x768` generated Zone panel and resamples:
      - Upper Colonnade (`0 .. curb_src_y + 16`) -> `640 x 272` RGB (curb aligned at `y = 264.0`!)
      - Lower Walkable Causeway (`curb_src_y .. 768`) -> `640 x 96` RGB (`y = 264 .. 360`!)
    Guarantees `0.0px` vertical horizon step across all 4 realms!
    """
    im = Image.open(path).convert("RGB")
    W_src, H_src = im.size
    # Exact scale factor so `curb_src_y` lands at `y = 264` in `272px` arch strip:
    arch_bot_src = min(H_src, int(round(curb_src_y * (272.0 / 264.0))))
    upper_im = im.crop((0, 0, W_src, arch_bot_src)).resize((640, 272), resample=Image.Resampling.LANCZOS)
    lower_im = im.crop((0, curb_src_y, W_src, H_src)).resize((640, 96), resample=Image.Resampling.LANCZOS)
    return np.array(upper_im, dtype=np.float32), np.array(lower_im, dtype=np.float32)


def extract_organic_arch_rgba(upper_rgb: np.ndarray) -> np.ndarray:
    """
    Extracts pixel-accurate organic sky transparency inside the central Gothic/Starwood/Ossuary/Obsidian
    archway using connected-component flood-fill seeded from the dark `#080c16` sky center (`320, 145`),
    PLUS smooth air-glow translucency for warm brazier halos in open air (eliminating dark glow rings!)
    while keeping every hanging iron chain link, broken stone corbel, gnarled branch, vine, and
    portcullis tooth 100% razor-sharp!
    """
    H, W, _ = upper_rgb.shape  # 272 x 640
    sky_patch = upper_rgb[125:175, 290:350, :]
    sky_ref = np.median(sky_patch.reshape(-1, 3), axis=0)  # ~(8.2, 11.8, 22.0)

    diff = np.sqrt(np.sum((upper_rgb - sky_ref[None, None, :]) ** 2, axis=2))
    luma = 0.299 * upper_rgb[:, :, 0] + 0.587 * upper_rgb[:, :, 1] + 0.114 * upper_rgb[:, :, 2]

    gx = np.zeros((H, W), dtype=np.float32)
    gy = np.zeros((H, W), dtype=np.float32)
    gx[:, 1:-1] = np.abs(luma[:, 2:] - luma[:, :-2]) * 0.5
    gy[1:-1, :] = np.abs(luma[2:, :] - luma[:-2, :]) * 0.5
    grad = np.hypot(gx, gy)
    grad_avg = gblur_gray(np.clip(grad / 40.0, 0.0, 1.0), 2.2) * 40.0

    # Smooth warm/cool brazier air-glow in the open arch (`low texture gradient`, `luma < 62`, above brazier bowl `y < 252`)
    is_air_glow = (grad_avg < 4.8) & (luma < 64.0) & (diff < 72.0)
    is_air_glow[254:, :] = False
    is_air_glow[:, :152] = False
    is_air_glow[:, 488:] = False

    is_sky_cand = ((diff < 17.5) & (luma < 25.5)) | is_air_glow
    is_sky_cand[261:, :] = False
    is_sky_cand[:, :108] = False
    is_sky_cand[:, 532:] = False

    visited = np.zeros((H, W), dtype=bool)
    q = deque()
    for sy in range(110, 190, 8):
        for sx in range(280, 361, 8):
            if is_sky_cand[sy, sx] and not visited[sy, sx]:
                visited[sy, sx] = True
                q.append((sy, sx))

    while q:
        cy, cx = q.popleft()
        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
            if 0 <= ny < 261 and 108 <= nx < 532 and not visited[ny, nx] and is_sky_cand[ny, nx]:
                visited[ny, nx] = True
                q.append((ny, nx))

    sky_float = visited.astype(np.float32)
    glow_keep = np.clip((diff - 16.0) / 80.0, 0.0, 0.35) * sky_float
    open_core = np.clip(sky_float - glow_keep, 0.0, 1.0)

    dilated = gblur_gray(sky_float, 1.2) > 0.16
    edge_sky = dilated & (~visited) & (diff < 28.0) & (luma < 34.0)
    edge_sky[262:, :] = False

    open_mask = np.clip(open_core + edge_sky.astype(np.float32) * np.clip((28.0 - diff) / 15.0, 0.0, 1.0), 0.0, 1.0)
    open_smooth = np.clip(gblur_gray(open_mask, 0.8), 0.0, 1.0)
    open_smooth[263:, :] = 0.0
    open_smooth[:, :105] = 0.0
    open_smooth[:, 535:] = 0.0

    alpha_f = 1.0 - open_smooth

    rgb_clean = upper_rgb.copy()
    semi = (alpha_f > 0.03) & (alpha_f < 0.96)
    rgb_clean[semi] = np.clip(
        (upper_rgb[semi] - sky_ref[None, :] * (1.0 - alpha_f[semi, None])) / np.maximum(alpha_f[semi, None], 0.14),
        0.0,
        255.0,
    )

    rgba = np.zeros((H, W, 4), dtype=np.uint8)
    rgba[:, :, :3] = np.clip(np.round(rgb_clean), 0, 255).astype(np.uint8)
    rgba[:, :, 3] = np.clip(np.round(alpha_f * 255.0), 0, 255).astype(np.uint8)
    return rgba


def build_vista_panorama() -> np.ndarray:
    """
    Builds `adv_vista_pano.png` (`1620 x 272` RGB, `p = 0.52` Far Abyssal Canyon & Eclipse Vista)
    at exact 2:1 integer downscale (`1376x768` -> `688x384`, cropped `y = 22..294` -> `656x272`) so the
    Abyssal Solar Eclipse is a 100% PERFECT ROUND CIRCLE and all 4 distant canyon landmarks align
    cleanly to all 4 campaign zones (`camX = 0..4800`) at `p = 0.52` with zero Eclipse wrap-in:
      - Zone I   (`camX = 520`,  `px = 423`): Colossal Round Abyssal Solar Eclipse & Gothic Viaducts
      - Zone II  (`camX = 1800`, `px = 677`): Bioluminescent Cyan-Emerald Pines & Cliff Waterfalls
      - Zone III (`camX = 3000`, `px = 915`): Sunken Violet Necropolis Citadel & Shattered Bone-Viaduct
      - Zone IV  (`camX = 4250`, `px = 1162`): Jagged Black Pit Volcanoes & Molten Magma Rivers
    """
    im_w = Image.open(SRC_FILES["vista_west"]).convert("RGB").resize((688, 384), resample=Image.Resampling.LANCZOS)
    im_e = Image.open(SRC_FILES["vista_east"]).convert("RGB").resize((688, 384), resample=Image.Resampling.LANCZOS)

    w_arr = np.array(im_w, dtype=np.float32)[22:294, 16:672, :]  # (272, 656, 3)
    e_arr = np.array(im_e, dtype=np.float32)[22:294, 16:672, :]  # (272, 656, 3)

    # 3rd pure-volcano-to-night-viaduct wrap panel (`656px`):
    # `e_arr[:, 380:656]` (`276px` pure Black Pit volcanoes) + `w_arr[:, :156]` (`156px` pure starry viaduct mountains)
    volc_a = e_arr[:, 380:656, :].copy()  # 276px pure volcanoes & magma
    volc_b = e_arr[:, 388:656, :].copy()  # 268px pure volcanoes & magma
    volc_wide = multiband_quilt_rgb(volc_a, volc_b, overlap=84)  # 460px
    night_pure = multiband_quilt_rgb(w_arr[:, :152, :].copy(), w_arr[:, 16:156, :].copy(), overlap=52)  # 240px
    wrap_arr = multiband_quilt_rgb(volc_wide, night_pure, overlap=44)  # 460 + 240 - 44 = 656px!

    ov = 116  # step = 656 - 116 = 540px -> 3 * 540 = 1620px periodic ring!
    s12 = multiband_quilt_rgb(w_arr, e_arr, overlap=ov)
    s123 = multiband_quilt_rgb(s12, wrap_arr, overlap=ov)
    s1231 = multiband_quilt_rgb(s123, w_arr, overlap=ov)

    periodic_W = 3 * (656 - ov)  # 1620px!
    sliced = s1231[:, 540 : 540 + periodic_W, :].copy()
    # In `s1231`, the 2nd `w_arr` starts at `3 * 540 = 1620`, so its Eclipse center (`+275`) is at `1620 + 275 = 1895`,
    # which in `sliced` (`1895 - 540 = 1355`) rolls cleanly to `px = 355`!
    roll_px = (355 - 1355) % periodic_W
    return np.roll(sliced, shift=roll_px, axis=1)


def build_arch_and_floor_panoramas() -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Builds:
      - `adv_arch_pano.png` (`2358 x 272` RGBA, `p = 0.86`, `6 * 393px` periodic)
      - `adv_floor_pano.png` (`4570 x 96` RGB, `p = 1.00`, `10 * 457px` periodic)

    Check `p = 0.86` 2400px-per-Realm bay centers (`px = (0.86 * camX + 840) / 2.625`):
      - Zone I   (`camX = 600, 1800`):  `px = 516.6, 909.7`
      - Zone II  (`camX = 3000, 4200`): `px = 1302.9, 1696.0`
      - Zone III (`camX = 5400, 6600`): `px = 2089.1, 2482.3`
      - Zone IV  (`camX = 7800, 9000`): `px = 2875.4, 3268.6`
    Each `640px` panel cropped to `585px` (`x = 28..613`) and quilted across `192px` of solid outer
    Gothic masonry gives `585 - 192 = 393px` per 1200px half-zone (`786px` per 2400px Realm)!
    """
    u1, f1 = load_aligned_zone_panel(SRC_FILES["zone1"], curb_src_y=610)
    u2, f2 = load_aligned_zone_panel(SRC_FILES["zone2"], curb_src_y=563)
    u3, f3 = load_aligned_zone_panel(SRC_FILES["zone3"], curb_src_y=563)
    u4, f4 = load_aligned_zone_panel(SRC_FILES["zone4"], curb_src_y=610)

    a1 = extract_organic_arch_rgba(u1)
    a2 = extract_organic_arch_rgba(u2)
    a3 = extract_organic_arch_rgba(u3)
    a4 = extract_organic_arch_rgba(u4)

    # 10 bays (`[a1_bleed, a1, a1, a2, a2, a3, a3, a4, a4, a4_bleed]`), each `585px`, `ov = 192` -> step `393px`!
    ax0, ax1 = 28, 613  # 585px; open sky is strictly within `108..532`, so outer `80px` on BOTH sides is 100% solid stone!
    arch_strips = [
        a1[:, ax0:ax1, :].copy(),  # 0: Left bleed (`px = 124`, `camX = -600`)
        a1[:, ax0:ax1, :].copy(),  # 1: Zone I A   (`px = 517`, `camX = 600`)
        a1[:, ax0:ax1, :].copy(),  # 2: Zone I B   (`px = 910`, `camX = 1800`)
        a2[:, ax0:ax1, :].copy(),  # 3: Zone II A  (`px = 1303`, `camX = 3000`)
        a2[:, ax0:ax1, :].copy(),  # 4: Zone II B  (`px = 1696`, `camX = 4200`)
        a3[:, ax0:ax1, :].copy(),  # 5: Zone III A (`px = 2089`, `camX = 5400`)
        a3[:, ax0:ax1, :].copy(),  # 6: Zone III B (`px = 2482`, `camX = 6600`)
        a4[:, ax0:ax1, :].copy(),  # 7: Zone IV A  (`px = 2875`, `camX = 7800`)
        a4[:, ax0:ax1, :].copy(),  # 8: Zone IV B  (`px = 3268`, `camX = 9000`, Boss Arena)
        a4[:, ax0:ax1, :].copy(),  # 9: Right bleed (`px = 3661`, `camX = 10200`)
    ]

    ov_a = 585 - 393  # 192px!
    ring_a = arch_strips[0]
    for s in arch_strips[1:]:
        ring_a = multiband_quilt_rgba(ring_a, s, overlap=ov_a)
    ring_a_plus = multiband_quilt_rgba(ring_a, arch_strips[0], overlap=ov_a)

    periodic_arch_W = 10 * 393  # 3930px
    sliced_a = ring_a_plus[:, 393 : 393 + periodic_arch_W, :].copy()
    roll_a = (517 - (585 // 2)) % periodic_arch_W
    seamless_arch = np.roll(sliced_a, shift=roll_a, axis=1)

    # Now build `adv_floor_pano.png` (`4570 x 96` RGB, `p = 1.00`, `10 * 457px` periodic):
    # Crop `617px` (`x = 12..629`), `ov = 160px` -> `617 - 160 = 457px` per 1200px half-zone!
    fx0, fx1 = 12, 629
    floor_strips = [
        f1[:, fx0:fx1, :].copy(),
        f1[:, fx0:fx1, :].copy(),
        f1[:, fx0:fx1, :].copy(),
        f2[:, fx0:fx1, :].copy(),
        f2[:, fx0:fx1, :].copy(),
        f3[:, fx0:fx1, :].copy(),
        f3[:, fx0:fx1, :].copy(),
        f4[:, fx0:fx1, :].copy(),
        f4[:, fx0:fx1, :].copy(),
        f4[:, fx0:fx1, :].copy(),
    ]
    ov_f = 617 - 457  # 160px
    ring_f = floor_strips[0]
    for sf in floor_strips[1:]:
        ring_f = multiband_quilt_rgb(ring_f, sf, overlap=ov_f)
    ring_f_plus = multiband_quilt_rgb(ring_f, floor_strips[0], overlap=ov_f)

    periodic_floor_W = 10 * 457  # 4570px
    sliced_f = ring_f_plus[:, 457 : 457 + periodic_floor_W, :].copy()
    roll_f = (549 - (617 // 2)) % periodic_floor_W
    seamless_floor = np.roll(sliced_f, shift=roll_f, axis=1)

    return seamless_arch, seamless_floor, a4, f4


def build_inferno_override_panorama(a4_rgba: np.ndarray, f4_rgb: np.ndarray) -> np.ndarray:
    """
    Builds `adv_inferno_pano.png` (`960 x 360` RGB, periodic wrap-seamless) from our bespoke
    Zone IV Black Pit Obsidian Arch (`a4_rgba`) + Smoldering Magma Volcano Vista (`vista_east`) +
    Molten Obsidian Causeway (`f4_rgb`) for Ignis Sol's `LAYWASTE OF INFERNO` stage transformation!
    """
    im_e = Image.open(SRC_FILES["vista_east"]).convert("RGB").resize((980, 272), resample=Image.Resampling.LANCZOS)
    volcano_vista = np.array(im_e, dtype=np.float32)[:, 340:980, :]  # 640x272 volcanic caldera half!

    comp = np.zeros((360, 640, 3), dtype=np.float32)
    alpha = a4_rgba[:, :, 3:4].astype(np.float32) / 255.0
    comp[:272, :, :] = volcano_vista * (1.0 - alpha) + a4_rgba[:, :, :3].astype(np.float32) * alpha
    comp[264:360, :, :] = f4_rgb

    s_a = comp[:, 24:616, :]  # 592px
    ov = 192                  # step = 400px -> 2 bays = 800px periodic!
    ab = multiband_quilt_rgb(s_a, s_a, overlap=ov)
    abc = multiband_quilt_rgb(ab, s_a, overlap=ov)
    return abc[:, 400 : 400 + 800, :].copy()


def main():
    vista = build_vista_panorama()
    arch, floor, a4, f4 = build_arch_and_floor_panoramas()
    inferno = build_inferno_override_panorama(a4, f4)

    vista_path = os.path.join(SPRITES_DIR, "adv_vista_pano.png")
    arch_path = os.path.join(SPRITES_DIR, "adv_arch_pano.png")
    floor_path = os.path.join(SPRITES_DIR, "adv_floor_pano.png")
    inf_path = os.path.join(SPRITES_DIR, "adv_inferno_pano.png")

    Image.fromarray(np.clip(vista, 0, 255).astype(np.uint8), mode="RGB").save(vista_path, optimize=True)
    Image.fromarray(arch, mode="RGBA").save(arch_path, optimize=True)
    Image.fromarray(np.clip(floor, 0, 255).astype(np.uint8), mode="RGB").save(floor_path, optimize=True)
    Image.fromarray(np.clip(inferno, 0, 255).astype(np.uint8), mode="RGB").save(inf_path, optimize=True)

    for p in [vista_path, arch_path, floor_path, inf_path]:
        sz_kb = os.path.getsize(p) / 1024.0
        im = Image.open(p)
        print(f"Saved {os.path.basename(p):22s}: {im.size[0]}x{im.size[1]} {im.mode:4s} ({sz_kb:6.1f} KB)")


if __name__ == "__main__":
    main()
