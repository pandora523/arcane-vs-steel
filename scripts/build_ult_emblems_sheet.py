#!/usr/bin/env python3
"""
Builds the lossless, 12-frame genuinely animated HD-2D Ultimate Crest Emblem Sprite Sheet:
  `assets/sprites/ult_emblems_sheet.png` (`1536 x 1536` RGBA = 12 cols x 12 rows of `128x128`)

Row Order (canonical `PixelForge.ULT_EMBLEM_ORDER`):
  0: warrior      (Aethelgard — Locked Sovereign Crown + Unfurling Golden Wings + Dawn-Breaker Blade-Flare & Starburst)
  1: mage         (Ignis Sol  — Locked Black-Sun Eclipse Ring + True 12-Frame Curling/Roaring Pixel Fire Tongues)
  2: priestess    (Seraphina  — Locked Sun-Cross + Opening/Beating Archangel Wings + Rising Halo & Sunburst Rays)
  3: chronomancer (Chronos    — Locked Watch Bezel/Roman Dial + Tooth-by-Tooth Rotating Brass Gears + Sweeping Clock Hands)
  4: valkyrie     (Freyja     — Locked Valkyrie Helm + Beating Phoenix Wings + Whipping Fire Plumes on All 4 Spears)
  5: ronin        (Kaze-Maru  — Locked Kabuto + Blood Moon + Multi-Frame Forked Cyan Lightning + Slash Glint + Flying Sakura)
  6: archer       (Sylvara    — Locked Elven Crescent Bow + Drawing Bowstring & Charging Arrow + Release Starlight Burst)
  7: reaper       (Malakor    — Locked Horned Skull + True Writhing Violet Soul-Flames on Crossed Scythes + Pulsing Eclipse/Eyes)
  8: titan        (Vulkan     — Locked Runic Mjolnir + Crackling Cyan Rune Lightning + Windup-to-Slam Impact & Forge-Spark Burst)
  9: icemage      (Lyra       — Locked 5-Spire Glacial Crown + Orbiting/Crystallizing Ice Shards + Bursting Snowflake Sparkles)
 10: android      (Unit-07    — Locked Cyber-Valkyrie Helm + Sweeping/Locking Funnel Pods + Twin Plasma Flares + HUD Scan-Bar)
 11: nyx          (Nyx "Cob"  — Locked CRT Monitor + Flapping Neon Wing-Bits + Open/^w^/Starry Face Expressions + Rising Hearts)

Strict Art & Engineering Guarantees:
  - 100% lossless nearest-neighbor pixel purity (`alpha in {0, 255}` — zero blurry bilinear edges).
  - ZERO uncanny morphing: every crown, helmet, face, skull, watch bezel, and CRT monitor stays 100% pixel-locked.
  - ZERO cut-seams: moving back-layers (wings, gears, flames) tuck solidly behind each locked core's `#020617` ink outline.
  - Exact 1:1 native pixel scale & master-plate palette fidelity across all 12 champions, `>= 3px` safe inner cell margin.
"""

import math
import os
from collections import deque
import numpy as np
from PIL import Image

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLATE_DIR = "/Users/rei/.gemini/antigravity/brain/2eb56890-606c-4bfb-a092-e50544d80e30"
QA_DIR = "/Users/rei/.gemini/antigravity/brain/2b47d78d-15f0-4618-8452-c0f067e97f08/scratch"

PLATES = [
    (
        os.path.join(PLATE_DIR, "ult_emblems_plate1_1795088313401.jpg"),
        ["warrior", "mage", "priestess", "chronomancer"],
    ),
    (
        os.path.join(PLATE_DIR, "ult_emblems_plate2_1795088314842.jpg"),
        ["valkyrie", "ronin", "archer", "reaper"],
    ),
    (
        os.path.join(PLATE_DIR, "ult_emblems_plate3_1795088315341.jpg"),
        ["titan", "icemage", "android", "nyx"],
    ),
]

CELL = 128
NUM_FRAMES = 12
GRID_N = 100
PITCH = 512.0 / GRID_N  # Exact 5.12px native pixel pitch verified by FFT
INK_DARK = (6, 9, 20)
INK_WARM = (18, 9, 12)


# ==============================================================================
# 1. NATIVE 1:1 MASTER PLATE RECOVERY & CHROMA-KEY EXTRACTION
# ==============================================================================

def find_best_grid_offset(q_rgb):
    qf = q_rgb.astype(np.float32)
    best_ox, best_sx = PITCH * 0.5, 1e18
    for step in range(25):
        ox = step * (PITCH / 25.0)
        xs = np.clip(np.round(ox + np.arange(GRID_N) * PITCH).astype(int), 1, 510)
        var_x = (
            np.abs(qf[:, xs, :] - qf[:, xs - 1, :]).mean()
            + np.abs(qf[:, xs, :] - qf[:, xs + 1, :]).mean()
        )
        if var_x < best_sx:
            best_sx, best_ox = var_x, ox

    best_oy, best_sy = PITCH * 0.5, 1e18
    for step in range(25):
        oy = step * (PITCH / 25.0)
        ys = np.clip(np.round(oy + np.arange(GRID_N) * PITCH).astype(int), 1, 510)
        var_y = (
            np.abs(qf[ys, :, :] - qf[ys - 1, :, :]).mean()
            + np.abs(qf[ys, :, :] - qf[ys + 1, :, :]).mean()
        )
        if var_y < best_sy:
            best_sy, best_oy = var_y, oy
    return best_ox, best_oy


def sample_native_100(q_rgb):
    ox, oy = find_best_grid_offset(q_rgb)
    xs = np.clip(np.round(ox + np.arange(GRID_N) * PITCH).astype(int), 1, 510)
    ys = np.clip(np.round(oy + np.arange(GRID_N) * PITCH).astype(int), 1, 510)
    samples = [q_rgb[np.ix_(ys + dy, xs + dx)] for dy in (-1, 0, 1) for dx in (-1, 0, 1)]
    return np.median(np.stack(samples, axis=0), axis=0).astype(np.uint8)


def find_components(mask):
    H, W = mask.shape
    vis = np.zeros((H, W), dtype=bool)
    comps = []
    for y in range(H):
        for x in range(W):
            if mask[y, x] and not vis[y, x]:
                st = [(y, x)]
                vis[y, x] = True
                pts = []
                while st:
                    cy, cx = st.pop()
                    pts.append((cy, cx))
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            if dy == 0 and dx == 0:
                                continue
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and not vis[ny, nx]:
                                vis[ny, nx] = True
                                st.append((ny, nx))
                comps.append(pts)
    comps.sort(key=len, reverse=True)
    return comps


def keep_largest_component(mask):
    comps = find_components(mask)
    out = np.zeros_like(mask, dtype=bool)
    if comps:
        for py, px in comps[0]:
            out[py, px] = True
    return out


def extract_clean_rgba(rgb100, name):
    H, W, _ = rgb100.shape
    r = rgb100[:, :, 0].astype(np.int32)
    g = rgb100[:, :, 1].astype(np.int32)
    b = rgb100[:, :, 2].astype(np.int32)

    ext_green = (g >= 130) & ((g - r) >= 42) & ((g - b) >= 48)
    hole_seed = (g >= 175) & ((g - r) >= 52) & ((g - b) >= 88)
    if name == "archer":
        hole_seed = (g >= 180) & (r <= 105) & (b <= 95) & ((g - r) >= 75) & ((g - b) >= 95)
    elif name == "priestess":
        hole_seed = (g >= 165) & ((g - r) >= 36) & ((g - b) >= 85)

    bg = np.zeros((H, W), dtype=bool)
    q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if ext_green[y, x] and not bg[y, x]:
                bg[y, x] = True
                q.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if ext_green[y, x] and not bg[y, x]:
                bg[y, x] = True
                q.append((y, x))

    while q:
        cy, cx = q.popleft()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < H and 0 <= nx < W and not bg[ny, nx] and ext_green[ny, nx]:
                bg[ny, nx] = True
                q.append((ny, nx))

    ys, xs = np.where((~bg) & hole_seed)
    for y, x in zip(ys, xs):
        if not bg[y, x]:
            bg[y, x] = True
            q.append((int(y), int(x)))
    hole_grow = (g >= 150) & ((g - r) >= 48) & ((g - b) >= 78)
    while q:
        cy, cx = q.popleft()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < H and 0 <= nx < W and not bg[ny, nx] and hole_grow[ny, nx]:
                bg[ny, nx] = True
                q.append((ny, nx))

    bg_dil = dilate4(bg)
    fringe_kill = (~bg) & bg_dil & (g >= 120) & ((g - r) >= 40) & ((g - b) >= 50)
    bg |= fringe_kill
    bg_dil = dilate4(bg)

    out = np.zeros((H, W, 4), dtype=np.uint8)
    out[:, :, :3] = rgb100
    out[:, :, 3] = np.where(bg, 0, 255).astype(np.uint8)

    edge = (~bg) & bg_dil
    ey, ex = np.where(edge)
    for y, x in zip(ey, ex):
        rv, gv, bv = int(out[y, x, 0]), int(out[y, x, 1]), int(out[y, x, 2])
        if rv < 70 and bv < 70 and gv > max(rv, bv) + 14:
            if name == "archer" and gv < 115 and bv >= 25:
                out[y, x, 1] = min(gv, max(rv, bv) + 32)
            else:
                out[y, x, 0] = min(rv, 14)
                out[y, x, 1] = min(gv, 16)
                out[y, x, 2] = min(bv, 26)
        elif gv > max(rv, bv) + 18 and bv < 130:
            if name != "archer":
                out[y, x, 1] = min(gv, max(rv, bv) + 8)

    if name == "priestess":
        fg_p = out[:, :, 3] > 0
        pr = out[:, :, 0].astype(np.int32)
        pg = out[:, :, 1].astype(np.int32)
        pb = out[:, :, 2].astype(np.int32)
        grn_sun = fg_p & (pg > pr + 2) & (pg > pb + 20)
        if np.any(grn_sun):
            out[grn_sun, 0] = np.clip(np.maximum(pr[grn_sun], pg[grn_sun] + 8), 0, 255).astype(np.uint8)
            out[grn_sun, 1] = np.clip(pg[grn_sun] - 10, 0, 255).astype(np.uint8)

    fg = out[:, :, 3] > 0
    for pts in find_components(fg):
        if len(pts) <= 2:
            avg_r = np.mean([out[y, x, 0] for y, x in pts])
            avg_g = np.mean([out[y, x, 1] for y, x in pts])
            avg_b = np.mean([out[y, x, 2] for y, x in pts])
            if avg_g > max(avg_r, avg_b) + 15 or max(avg_r, avg_g, avg_b) < 90:
                for y, x in pts:
                    out[y, x] = (0, 0, 0, 0)

    ys, xs = np.where(out[:, :, 3] > 0)
    y0, y1 = int(ys.min()), int(ys.max())
    x0, x1 = int(xs.min()), int(xs.max())
    crop = out[y0 : y1 + 1, x0 : x1 + 1]
    ch, cw = crop.shape[:2]
    cell = np.zeros((CELL, CELL, 4), dtype=np.uint8)
    ox = (CELL - cw) // 2
    oy = (CELL - ch) // 2
    cell[oy : oy + ch, ox : ox + cw] = crop
    return cell


# ==============================================================================
# 2. LOSSLESS 16-BIT PIXEL-ART ANIMATION PRIMITIVES (ZERO BLUR, ZERO SEAMS)
# ==============================================================================

def dilate4(mask):
    d = mask.copy()
    d[:-1, :] |= mask[1:, :]
    d[1:, :] |= mask[:-1, :]
    d[:, :-1] |= mask[:, 1:]
    d[:, 1:] |= mask[:, :-1]
    return d


def dilate8(mask):
    d = dilate4(mask)
    d2 = d.copy()
    d2[:-1, :] |= d[1:, :]
    d2[1:, :] |= d[:-1, :]
    return d2


def composite_over(dst, src):
    m = src[:, :, 3] > 0
    dst[m] = src[m]


def blend_rgb(dst, mask, target_rgb, amount):
    if not np.any(mask):
        return
    arr = dst[mask, :3].astype(np.float32)
    t = np.array(target_rgb, dtype=np.float32)
    if np.ndim(amount) > 0:
        a = np.clip(amount[mask], 0.0, 1.0)[:, None]
    else:
        a = float(np.clip(amount, 0.0, 1.0))
    dst[mask, :3] = np.clip(np.round(arr * (1.0 - a) + t * a), 0, 255).astype(np.uint8)


def set_px(dst, x, y, rgb):
    ix, iy = int(round(x)), int(round(y))
    if 3 <= ix < CELL - 3 and 3 <= iy < CELL - 3:
        dst[iy, ix, :3] = rgb
        dst[iy, ix, 3] = 255


def draw_pixel_disk(dst, cx, cy, r, rgb):
    ix0 = max(3, int(math.floor(cx - r)))
    ix1 = min(CELL - 4, int(math.ceil(cx + r)))
    iy0 = max(3, int(math.floor(cy - r)))
    iy1 = min(CELL - 4, int(math.ceil(cy + r)))
    rr = r * r
    for y in range(iy0, iy1 + 1):
        dy = y - cy
        for x in range(ix0, ix1 + 1):
            dx = x - cx
            if dx * dx + dy * dy <= rr:
                dst[y, x, :3] = rgb
                dst[y, x, 3] = 255


def draw_pixel_line(dst, x0, y0, x1, y1, rgb, width=1):
    x0i, y0i, x1i, y1i = int(round(x0)), int(round(y0)), int(round(x1)), int(round(y1))
    steps = max(abs(x1i - x0i), abs(y1i - y0i), 1)
    for i in range(steps + 1):
        t = i / float(steps)
        px = int(round(x0i + (x1i - x0i) * t))
        py = int(round(y0i + (y1i - y0i) * t))
        if width <= 1:
            set_px(dst, px, py, rgb)
        else:
            r = (width - 1) * 0.55
            draw_pixel_disk(dst, px, py, r, rgb)


def add_ink_outline_to_layer(layer, ink_rgb=INK_DARK, only_bright_edge=False, use_8conn=False):
    """Wraps opaque pixels of `layer` in a crisp 1px dark pixel-art outline."""
    fg = layer[:, :, 3] > 0
    if not np.any(fg):
        return layer
    if only_bright_edge:
        lum = (
            0.299 * layer[:, :, 0].astype(np.float32)
            + 0.587 * layer[:, :, 1].astype(np.float32)
            + 0.114 * layer[:, :, 2].astype(np.float32)
        )
        bright_fg = fg & (lum > 46)
        dil = dilate8(bright_fg) if use_8conn else dilate4(bright_fg)
    else:
        dil = dilate8(fg) if use_8conn else dilate4(fg)
    border = dil & (~fg)
    border[:3, :] = False
    border[-3:, :] = False
    border[:, :3] = False
    border[:, -3:] = False
    out = layer.copy()
    out[border, :3] = ink_rgb
    out[border, 3] = 255
    return out


def scale2x_rgba(img):
    """Exact AdvMAME Scale2x pixel-art upscaler — zero color blending, crisp diagonal preservation."""
    H, W, _ = img.shape
    pad = np.pad(img, ((1, 1), (1, 1), (0, 0)), mode="edge")
    P = pad[1:-1, 1:-1]
    A = pad[0:-2, 1:-1]
    B = pad[1:-1, 2:]
    C = pad[1:-1, 0:-2]
    D = pad[2:, 1:-1]

    def eq(u, v):
        return np.all(u == v, axis=2)

    eq_CA = eq(C, A)
    eq_AD = eq(A, D)
    eq_CB = eq(C, B)
    eq_AB = eq(A, B)
    eq_CD = eq(C, D)
    eq_BD = eq(B, D)
    ok = (~eq_CB) & (~eq_AD)

    out = np.empty((H * 2, W * 2, 4), dtype=np.uint8)
    out[0::2, 0::2] = np.where((eq_CA & ok)[:, :, None], A, P)
    out[0::2, 1::2] = np.where((eq_AB & ok)[:, :, None], B, P)
    out[1::2, 0::2] = np.where((eq_CD & ok)[:, :, None], C, P)
    out[1::2, 1::2] = np.where((eq_BD & ok)[:, :, None], D, P)
    return out


def rotsprite_pivot(src_rgba, pivot_xy, angle_deg, dx=0.0, dy=0.0, seal_outline=True, ink_rgb=INK_DARK):
    """
    True RotSprite lossless pixel-art rotation around `pivot_xy` by `angle_deg` + integer shift `(dx, dy)`.
    Uses 4x Scale2x (2 passes) -> inverse nearest-neighbor rotation -> center sampling -> crisp outline seal.
    """
    if abs(angle_deg) < 0.25 and abs(dx) < 0.25 and abs(dy) < 0.25:
        return src_rgba.copy()

    if not np.any(src_rgba[:, :, 3] > 0):
        return np.zeros_like(src_rgba)

    up4 = scale2x_rgba(scale2x_rgba(src_rgba))
    H, W = src_rgba.shape[:2]
    px, py = pivot_xy
    rad = math.radians(angle_deg)
    ca = math.cos(-rad)
    sa = math.sin(-rad)

    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    rx = xx - (px + dx)
    ry = yy - (py + dy)
    sx = (px + rx * ca - ry * sa) * 4.0 + 1.5
    sy = (py + rx * sa + ry * ca) * 4.0 + 1.5

    sxi = np.round(sx).astype(np.int32)
    syi = np.round(sy).astype(np.int32)
    valid = (sxi >= 0) & (sxi < W * 4) & (syi >= 0) & (syi < H * 4)

    out = np.zeros((H, W, 4), dtype=np.uint8)
    vy, vx = np.where(valid)
    out[vy, vx] = up4[syi[vy, vx], sxi[vy, vx]]

    fg_o = out[:, :, 3] > 0
    for pts in find_components(fg_o):
        if len(pts) <= 2:
            for y, x in pts:
                out[y, x] = (0, 0, 0, 0)

    out[:3, :, :] = 0
    out[-3:, :, :] = 0
    out[:, :3, :] = 0
    out[:, -3:, :] = 0

    if seal_outline:
        out = add_ink_outline_to_layer(out, ink_rgb=ink_rgb, only_bright_edge=True, use_8conn=False)
    return out


def shift_rgba_int(src_rgba, dx, dy):
    dx, dy = int(round(dx)), int(round(dy))
    out = np.zeros_like(src_rgba)
    H, W = src_rgba.shape[:2]
    x0_s = max(0, -dx)
    x1_s = min(W, W - dx)
    y0_s = max(0, -dy)
    y1_s = min(H, H - dy)
    if x1_s > x0_s and y1_s > y0_s:
        out[y0_s + dy : y1_s + dy, x0_s + dx : x1_s + dx] = src_rgba[y0_s:y1_s, x0_s:x1_s]
    out[:3, :, :] = 0
    out[-3:, :, :] = 0
    out[:, :3, :] = 0
    out[:, -3:, :] = 0
    return out


def draw_pixel_star(dst, cx, cy, arm, core_rgb, mid_rgb, tip_rgb=None, diag_arm=0, outline=False):
    layer = np.zeros((CELL, CELL, 4), dtype=np.uint8)
    cx, cy = int(round(cx)), int(round(cy))
    if tip_rgb is None:
        tip_rgb = mid_rgb
    set_px(layer, cx, cy, core_rgb)
    if arm >= 4:
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            set_px(layer, cx + dx, cy + dy, core_rgb)
    for d in range(1, arm + 1):
        col = core_rgb if d <= max(1, arm // 3) else (mid_rgb if d < arm else tip_rgb)
        set_px(layer, cx - d, cy, col)
        set_px(layer, cx + d, cy, col)
        set_px(layer, cx, cy - d, col)
        set_px(layer, cx, cy + d, col)
    if diag_arm > 0:
        for d in range(1, diag_arm + 1):
            col = core_rgb if d == 1 else (mid_rgb if d < diag_arm else tip_rgb)
            set_px(layer, cx - d, cy - d, col)
            set_px(layer, cx + d, cy - d, col)
            set_px(layer, cx - d, cy + d, col)
            set_px(layer, cx + d, cy + d, col)
    if outline:
        layer = add_ink_outline_to_layer(layer, ink_rgb=INK_DARK, only_bright_edge=False)
    composite_over(dst, layer)


def draw_lightning_chain(dst, points, core_rgb=(255, 255, 255), mid_rgb=(56, 238, 255), outer_rgb=(14, 152, 240), width=1, forks=None):
    layer = np.zeros((CELL, CELL, 4), dtype=np.uint8)
    for i in range(len(points) - 1):
        draw_pixel_line(layer, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], outer_rgb, width=max(2, width + 1))
    if forks:
        for fpts in forks:
            for i in range(len(fpts) - 1):
                draw_pixel_line(layer, fpts[i][0], fpts[i][1], fpts[i + 1][0], fpts[i + 1][1], outer_rgb, width=2)
    for i in range(len(points) - 1):
        draw_pixel_line(layer, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], mid_rgb, width=max(1, width))
    if forks:
        for fpts in forks:
            for i in range(len(fpts) - 1):
                draw_pixel_line(layer, fpts[i][0], fpts[i][1], fpts[i + 1][0], fpts[i + 1][1], mid_rgb, width=1)
    for i in range(len(points) - 1):
        draw_pixel_line(layer, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], core_rgb, width=1)
    if forks:
        for fpts in forks:
            if len(fpts) >= 2:
                draw_pixel_line(layer, fpts[0][0], fpts[0][1], fpts[1][0], fpts[1][1], core_rgb, width=1)
    composite_over(dst, layer)


def render_curling_flame_tongues(tongues_spec, palette, ink_rgb=INK_DARK):
    """
    Renders a unified, `#020617`-outlined 16-bit pixel fire silhouette from parametric curling spines.
    """
    min_dn = np.full((CELL, CELL), 99.0, dtype=np.float32)
    root_heat = np.zeros((CELL, CELL), dtype=np.float32)

    for pts in tongues_spec:
        n = len(pts)
        for i in range(n):
            px, py, hw = pts[i]
            if hw < 0.45:
                continue
            s = i / float(max(1, n - 1))
            rad_i = int(math.ceil(hw + 1.0))
            x0 = max(4, int(math.floor(px)) - rad_i)
            x1 = min(CELL - 5, int(math.ceil(px)) + rad_i)
            y0 = max(4, int(math.floor(py)) - rad_i)
            y1 = min(CELL - 5, int(math.ceil(py)) + rad_i)
            if x1 < x0 or y1 < y0:
                continue
            yy, xx = np.mgrid[y0 : y1 + 1, x0 : x1 + 1]
            d = np.hypot(xx - px, yy - py) / max(0.5, hw)
            sub = min_dn[y0 : y1 + 1, x0 : x1 + 1]
            better = d < sub
            sub[better] = d[better]
            rh = max(0.0, 1.0 - s * 1.15)
            sub_h = root_heat[y0 : y1 + 1, x0 : x1 + 1]
            sub_h[better] = np.maximum(sub_h[better], rh)

    fg = min_dn <= 1.0
    layer = np.zeros((CELL, CELL, 4), dtype=np.uint8)
    c0, c1, c2, c3, c4 = palette
    temp = np.clip((1.0 - min_dn) + root_heat * 0.28, 0.0, 1.35)
    layer[fg, :3] = c0
    layer[fg & (temp >= 0.24), :3] = c1
    layer[fg & (temp >= 0.50), :3] = c2
    layer[fg & (temp >= 0.76), :3] = c3
    layer[fg & (temp >= 1.02), :3] = c4
    layer[fg, 3] = 255
    layer = add_ink_outline_to_layer(layer, ink_rgb=ink_rgb, only_bright_edge=False, use_8conn=False)
    return layer


def draw_pixel_heart(dst, cx, cy, size, fill_rgb, hi_rgb, outline=True):
    cx, cy = int(round(cx)), int(round(cy))
    if size <= 0:
        pat = ["X.X", "XXX", ".X."]
    elif size == 1:
        pat = [".X.X.", "XHHXX", "XXXXX", ".XXX.", "..X.."]
    else:
        pat = [".XX.XX.", "XHHXXXX", "XHXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."]
    layer = np.zeros((CELL, CELL, 4), dtype=np.uint8)
    ph, pw = len(pat), len(pat[0])
    oy, ox = cy - ph // 2, cx - pw // 2
    for r_i, row_s in enumerate(pat):
        for c_i, ch in enumerate(row_s):
            if ch == ".":
                continue
            set_px(layer, ox + c_i, oy + r_i, hi_rgb if ch == "H" else fill_rgb)
    if outline:
        layer = add_ink_outline_to_layer(layer, ink_rgb=INK_DARK, only_bright_edge=False)
    composite_over(dst, layer)


def draw_pixel_sakura(dst, cx, cy, pose):
    pats = [
        [".PP.", "PHHP", ".PP."],
        [".PH.", "PHPP", ".PP."],
        ["PP.", "HHP", ".PP"],
        [".PP", "PHH", "PP."],
    ]
    pat = pats[pose % 4]
    layer = np.zeros((CELL, CELL, 4), dtype=np.uint8)
    cx, cy = int(round(cx)), int(round(cy))
    for ri, rs in enumerate(pat):
        for ci, ch in enumerate(rs):
            if ch == ".":
                continue
            col = (255, 224, 240) if ch == "H" else (244, 114, 182)
            set_px(layer, cx + ci - 1, cy + ri - 1, col)
    layer = add_ink_outline_to_layer(layer, ink_rgb=(98, 18, 56), only_bright_edge=False)
    composite_over(dst, layer)


def draw_pixel_gear(cx, cy, r_root, r_tip, n_teeth, r_hole, n_spokes, angle_rad):
    yy, xx = np.mgrid[0:CELL, 0:CELL].astype(np.float32)
    dx = xx - cx
    dy = yy - cy
    dist = np.hypot(dx, dy)
    ang = np.arctan2(dy, dx) - angle_rad

    tooth_phase = (ang * n_teeth / (2.0 * math.pi)) % 1.0
    in_tooth = (tooth_phase < 0.44) | (tooth_phase > 0.94)
    outer_r = np.where(in_tooth, r_tip, r_root)

    in_rim = (dist <= outer_r) & (dist >= r_root - 3.0)
    in_hub = dist <= max(2.8, r_hole * 0.52)
    spoke_phase = (ang * n_spokes / (2.0 * math.pi)) % 1.0
    in_spoke = (dist < r_root - 2.4) & (dist > r_hole * 0.40) & (np.minimum(spoke_phase, 1.0 - spoke_phase) < 0.11)
    solid = (in_rim | in_hub | in_spoke) & (dist >= 1.2)

    layer = np.zeros((CELL, CELL, 4), dtype=np.uint8)
    nx = dx / np.maximum(1.0, dist)
    ny = dy / np.maximum(1.0, dist)
    lit = -0.62 * nx - 0.78 * ny
    bevel = np.where((dist > r_root - 1.5) & (dist <= r_root + 0.5), 0.18, 0.0)
    val = lit + bevel

    layer[solid, :3] = (118, 78, 30)
    layer[solid & (val > -0.20), :3] = (168, 120, 46)
    layer[solid & (val > 0.22), :3] = (222, 174, 76)
    layer[solid & (val > 0.58), :3] = (252, 224, 128)
    layer[solid, 3] = 255
    layer = add_ink_outline_to_layer(layer, ink_rgb=(16, 12, 14), only_bright_edge=False, use_8conn=False)
    return layer


def draw_clock_hand(dst, cx, cy, length, angle_rad, width=1.6, tip_diamond=True):
    layer = np.zeros((CELL, CELL, 4), dtype=np.uint8)
    ux, uy = math.cos(angle_rad), math.sin(angle_rad)
    px, py = -uy, ux
    steps = int(math.ceil(length * 2.5))
    for i in range(steps + 1):
        s = i / float(max(1, steps))
        dist = s * length
        x = cx + ux * dist
        y = cy + uy * dist
        if tip_diamond and 0.62 <= s <= 0.84:
            w = width * 1.45
        elif s > 0.84:
            w = max(0.55, width * (1.0 - (s - 0.84) / 0.22))
        else:
            w = width * (0.95 - 0.25 * s)
        col = (255, 240, 168) if s > 0.55 else (232, 184, 78)
        draw_pixel_disk(layer, x, y, w * 0.68, col)
        if s < 0.9:
            set_px(layer, x - px * 0.3, y - py * 0.3, (255, 248, 198))
    layer = add_ink_outline_to_layer(layer, ink_rgb=(14, 10, 14), only_bright_edge=False)
    composite_over(dst, layer)


# ==============================================================================
# 3. ALL 12 HERO TRUE MULTI-FRAME ANIMATORS (12 FRAMES EACH, ZERO SEAMS!)
# ==============================================================================

def build_warrior_frames(base):
    """
    1. Aethelgard: Locked Sovereign Crown + cyan diamond + 3 swords;
       golden wings genuinely fan/unfurl cleanly behind the crown;
       central Dawn-Breaker sword gleams with a bold traveling pixel blade-flare + cross-starburst.
    """
    yy, xx = np.mgrid[0:CELL, 0:CELL]
    fg = base[:, :, 3] > 0
    r = base[:, :, 0].astype(np.float32)
    g = base[:, :, 1].astype(np.float32)
    b = base[:, :, 2].astype(np.float32)
    lum = 0.299 * r + 0.587 * g + 0.114 * b

    # Surgical core isolation: crown, central cyan diamond, vertical Dawn-Breaker sword, shield,
    # and the two diagonal crossed sword hilts & lower blades — ZERO stray wing feather tips!
    in_l_hilt = (xx >= 34) & (xx <= 55) & (yy >= 31) & (yy <= 54) & (np.abs((yy - xx) - (-2.0)) <= 4.3)
    in_r_hilt = (xx >= 72) & (xx <= 93) & (yy >= 31) & (yy <= 54) & (np.abs((yy + xx) - 125.0) <= 4.3)
    in_center_core = (
        ((xx >= 42) & (xx <= 85) & (yy >= 44) & (yy <= 86))     # crown + brown shield body
        | ((xx >= 50) & (xx <= 77) & (yy >= 20) & (yy <= 107))  # vertical central sword + crossguard
        | ((xx >= 34) & (xx <= 93) & (yy >= 80) & (yy <= 98))   # lower crossed sword blades
        | in_l_hilt
        | in_r_hilt
    )
    # Include the crown's left & right cyan outer side-gems cleanly
    side_gems = fg & (yy >= 55) & (yy <= 78) & (((xx >= 39) & (xx <= 45)) | ((xx >= 82) & (xx <= 88))) & (
        (b > 110) | (lum < 58)
    )
    core_mask = keep_largest_component(fg & (in_center_core | side_gems))
    core = np.zeros_like(base)
    core[core_mask] = base[core_mask]
    core = add_ink_outline_to_layer(core, ink_rgb=INK_DARK, only_bright_edge=True)

    # Extract Left & Right golden wings strictly outside locked core (largest connected wing each side)
    lw_mask = keep_largest_component(fg & (~core_mask) & (xx < 64) & (yy <= 80))
    rw_mask = keep_largest_component(fg & (~core_mask) & (xx >= 64) & (yy <= 80))
    lw_src = np.zeros_like(base)
    lw_src[lw_mask] = base[lw_mask]
    rw_src = np.zeros_like(base)
    rw_src[rw_mask] = base[rw_mask]

    # Tuck 5px warm golden-feather base strictly behind crown sides (`y = 55..75`) so unfurling has ZERO gap/peek!
    for y in range(55, 76):
        for x in range(39, 47):
            if lw_src[y, x, 3] == 0 and core[y, x, 3] > 0:
                col = (196, 152, 86) if y < 65 else (154, 114, 62)
                lw_src[y, x] = (*col, 255)
        for x in range(81, 89):
            if rw_src[y, x, 3] == 0 and core[y, x, 3] > 0:
                col = (196, 152, 86) if y < 65 else (154, 114, 62)
                rw_src[y, x] = (*col, 255)

    not_outline = core_mask & (lum > 46)
    cyan_gem = not_outline & (b > 130) & (g > 135) & ((b + g) * 0.5 - r > 32)
    central_sword = not_outline & (np.abs(xx - 63.5) <= 6.5) & (yy >= 20) & (yy <= 107)
    gold_crown = not_outline & (~cyan_gem) & (lum > 110)

    wing_angles = [8.0, 4.0, -2.0, -8.5, -13.0, -14.5, -12.5, -8.0, -2.0, 3.5, 7.5, 9.0]
    wing_spread = [-1.0, 0.0, 1.5, 3.0, 4.0, 4.5, 4.0, 3.0, 1.5, 0.0, -1.0, -1.5]
    wing_lift = [1.0, 0.0, -1.0, -2.0, -2.5, -3.0, -2.5, -1.5, -0.5, 0.5, 1.0, 1.5]

    frames = []
    for f in range(NUM_FRAMES):
        out = np.zeros((CELL, CELL, 4), dtype=np.uint8)

        # Layer 1: Left & right golden wings genuinely unfurling BEHIND the locked Sovereign Crown!
        ang = wing_angles[f]
        spr = wing_spread[f]
        lft = wing_lift[f]
        lw_rot = rotsprite_pivot(lw_src, (43.5, 65.0), ang, dx=-spr, dy=lft, seal_outline=True, ink_rgb=INK_DARK)
        rw_rot = rotsprite_pivot(rw_src, (83.5, 65.0), -ang, dx=spr, dy=lft, seal_outline=True, ink_rgb=INK_DARK)

        for wbuf in (lw_rot, rw_rot):
            wfg = wbuf[:, :, 3] > 0
            wlum = 0.299 * wbuf[:, :, 0] + 0.587 * wbuf[:, :, 1] + 0.114 * wbuf[:, :, 2]
            unfurl_glow = max(0.0, (-ang + 2.0) / 17.0)
            blend_rgb(wbuf, wfg & (wlum > 95), (255, 252, 224), 0.08 + unfurl_glow * 0.24)
            composite_over(out, wbuf)

        # Layer 2: 100% LOCKED Sovereign Crown, Cyan Diamond & 3 Swords
        core_f = core.copy()
        flare_y = 20.0 + ((f % 10) / 9.0) * 86.0
        sword_band = np.exp(-((yy - flare_y) ** 2) / (2.0 * 5.2**2))
        blend_rgb(core_f, central_sword, (245, 255, 255), sword_band * 0.88)

        sweep_pos = -44.0 + (f / float(NUM_FRAMES)) * 96.0
        crown_band = np.exp(-((((xx - 63.5) + (yy - 63.5) * 0.55) - sweep_pos) ** 2) / (2.0 * 5.0**2))
        blend_rgb(core_f, gold_crown, (255, 254, 232), crown_band * 0.45)

        gem_peak = [0.15, 0.22, 0.35, 0.58, 0.85, 0.95, 0.78, 0.50, 0.28, 0.18, 0.12, 0.12][f]
        blend_rgb(core_f, cyan_gem, (238, 255, 255), gem_peak)
        composite_over(out, core_f)

        # Layer 3: Traveling Blade-Flare Glint + Bold Dawn-Breaker Cross-Starburst!
        if f <= 9:
            fy = int(round(flare_y))
            arm_b = 4 if (42 <= fy <= 76) else 3
            draw_pixel_star(out, 64, fy, arm_b, (255, 255, 255), (125, 249, 255), (56, 189, 248))

        star_arms = {3: (5, 2), 4: (11, 5), 5: (16, 7), 6: (12, 5), 7: (6, 2)}
        if f in star_arms:
            am, ad = star_arms[f]
            draw_pixel_star(
                out, 64, 59, am,
                (255, 255, 255), (165, 243, 252), (254, 240, 138),
                diag_arm=ad, outline=False,
            )

        if f in (4, 5, 6):
            sp_arm = 4 if f == 5 else 2
            draw_pixel_star(out, 17, 29, sp_arm, (255, 255, 255), (254, 240, 138), (245, 158, 11))
            draw_pixel_star(out, 110, 29, sp_arm, (255, 255, 255), (254, 240, 138), (245, 158, 11))

        frames.append(out)
    return frames, core


def build_mage_frames(base):
    """
    2. Ignis Sol: Locked ornate golden Black-Sun Eclipse ring + jet-black void;
       static flames completely replaced with TRUE 12-frame animated curling/roaring
       `#020617`-outlined pixel fire tongues whose silhouettes genuinely lick, swirl, and curl outward!
    """
    yy, xx = np.mgrid[0:CELL, 0:CELL].astype(np.float32)
    cx, cy = 63.5, 63.5
    dist = np.hypot(xx - cx, yy - cy)
    ang = np.arctan2(yy - cy, xx - cx)
    fg = base[:, :, 3] > 0
    r = base[:, :, 0].astype(np.float32)
    g = base[:, :, 1].astype(np.float32)

    # Tight surgical extraction of ONLY the ornate golden Black-Sun Eclipse ring + 4 cardinal filigree medallions
    # + 4 ornate square corner bosses — ZERO stray static flame whiskers!
    in_ring = dist <= 21.6
    in_square_boss = (np.abs(xx - cx) <= 19.2) & (np.abs(yy - cy) <= 19.2)
    # 4 cardinal diamond medallions (tight Manhattan diamond centered at +-22.5px)
    in_cardinal = (
        (np.abs(xx - cx) + np.abs(yy - (cy - 22.5)) <= 5.0)
        | (np.abs(xx - cx) + np.abs(yy - (cy + 22.5)) <= 5.0)
        | (np.abs(xx - (cx - 22.5)) + np.abs(yy - cy) <= 5.0)
        | (np.abs(xx - (cx + 22.5)) + np.abs(yy - cy) <= 5.0)
    )
    core_clean = keep_largest_component(fg & (in_ring | in_square_boss | in_cardinal))
    core = np.zeros_like(base)
    core[core_clean] = base[core_clean]
    core = add_ink_outline_to_layer(core, ink_rgb=INK_WARM, only_bright_edge=True)

    flame_pal = (
        (132, 16, 18),   # deep crimson
        (206, 36, 20),   # fiery red
        (244, 118, 18),  # blazing orange
        (255, 214, 52),  # molten gold
        (255, 250, 206), # white-hot
    )
    ring_gold = core_clean & (dist >= 16.5) & (r > 115) & (g > 75)

    frames = []
    for f in range(NUM_FRAMES):
        phase = 2.0 * math.pi * f / NUM_FRAMES
        out = np.zeros((CELL, CELL, 4), dtype=np.uint8)

        # 16 interlocking S-curve solar flame tongues (8 major roaring tongues + 8 secondary licking tongues)
        tongues = []
        n_major = 8
        for idx in range(n_major):
            base_a = idx * (2.0 * math.pi / n_major) + phase * (1.0 / n_major)
            len_mod = 0.5 + 0.5 * math.sin(phase * 2.0 + idx * 1.57)
            tip_r = 45.5 + 7.5 * len_mod
            curl_dir = 1.0 if idx % 2 == 0 else -1.0
            pts = []
            steps = 22
            for si in range(steps):
                s = si / float(steps - 1)
                rad = 18.0 + s * (tip_r - 18.0)
                sway = (
                    0.34 * (s ** 1.15) * math.sin(s * 5.2 - phase * 2.0 + idx * 0.9)
                    + 0.16 * curl_dir * (s ** 1.5)
                )
                a = base_a + sway
                px = cx + math.cos(a) * rad
                py = cy + math.sin(a) * rad
                hw = 6.0 * ((1.0 - s) ** 0.72) + 0.75 * (1.0 - s)
                pts.append((px, py, hw))
            tongues.append(pts)

        for idx in range(n_major):
            base_a = (idx + 0.5) * (2.0 * math.pi / n_major) + phase * (1.0 / n_major)
            len_mod = 0.5 + 0.5 * math.cos(phase * 2.0 - idx * 1.3)
            tip_r = 35.5 + 6.5 * len_mod
            pts = []
            steps = 16
            for si in range(steps):
                s = si / float(steps - 1)
                rad = 18.0 + s * (tip_r - 18.0)
                sway = 0.28 * (s ** 1.1) * math.sin(s * 4.5 - phase * 2.0 + idx * 1.4 + 2.1)
                a = base_a + sway
                px = cx + math.cos(a) * rad
                py = cy + math.sin(a) * rad
                hw = 4.2 * ((1.0 - s) ** 0.75) + 0.55
                pts.append((px, py, hw))
            tongues.append(pts)

        flames_layer = render_curling_flame_tongues(tongues, flame_pal, ink_rgb=INK_WARM)
        composite_over(out, flames_layer)

        # Detached flickering pixel fire embers spinning outward off hottest tips
        ember_layer = np.zeros((CELL, CELL, 4), dtype=np.uint8)
        for ei in range(6):
            ep = ((f / float(NUM_FRAMES)) + ei / 6.0) % 1.0
            ea = ei * (2.0 * math.pi / 6.0) + ep * 0.95 + 0.35
            er = 43.0 + ep * 14.0
            ex = cx + math.cos(ea) * er
            ey = cy + math.sin(ea) * er
            col = (255, 245, 160) if ep < 0.45 else ((248, 128, 22) if ep < 0.78 else (196, 32, 20))
            if ep < 0.65:
                draw_pixel_disk(ember_layer, ex, ey, 1.15, col)
            else:
                set_px(ember_layer, ex, ey, col)
        ember_layer = add_ink_outline_to_layer(ember_layer, ink_rgb=INK_WARM, only_bright_edge=False)
        composite_over(out, ember_layer)

        # Layer 2: 100% LOCKED Ornate Golden Black-Sun Eclipse Ring + Void Core!
        core_f = core.copy()
        corona = np.clip(np.cos(2.0 * (ang - phase * 0.5)), 0.0, 1.0) ** 3
        blend_rgb(core_f, ring_gold, (255, 255, 232), corona * 0.75)
        composite_over(out, core_f)

        frames.append(out)
    return frames, core


def build_priestess_frames(base):
    """
    3. Seraphina: Locked radiant Sun-Cross;
       sweeping Archangel wings cleanly open & beat gently behind the cross;
       floating golden halo rises with expanding luminous pixel sunburst rays behind the cross.
    """
    yy, xx = np.mgrid[0:CELL, 0:CELL].astype(np.float32)
    fg = base[:, :, 3] > 0
    comps = find_components(fg)
    halo_mask = np.zeros((CELL, CELL), dtype=bool)
    if len(comps) >= 2:
        for py, px in comps[1]:
            halo_mask[py, px] = True
    halo_src = np.zeros_like(base)
    halo_src[halo_mask] = base[halo_mask]

    r = base[:, :, 0].astype(np.float32)
    g = base[:, :, 1].astype(np.float32)
    b = base[:, :, 2].astype(np.float32)

    # Exact surgical Sun-Cross mask (zero beige wing-feather pixels attached under cross arms!)
    strict_cross = (
        ((xx >= 58) & (xx <= 70) & (yy >= 41) & (yy <= 90))
        | ((xx >= 47) & (xx <= 81) & (yy >= 55) & (yy <= 67))
    )
    # Inner golden sunburst directly around cross intersection (r <= 14.5, warm golden saturation r-b > 55!)
    sun_inner = (np.hypot(xx - 64.0, yy - 61.0) <= 14.5) & (
        ((r > 155) & (g > 110) & ((r - b) > 55)) | ((r < 68) & (g < 60) & (b < 58))
    )
    core_mask = keep_largest_component(fg & (~halo_mask) & (strict_cross | sun_inner))
    core = np.zeros_like(base)
    core[core_mask] = base[core_mask]
    core = add_ink_outline_to_layer(core, ink_rgb=(42, 26, 14), only_bright_edge=True)

    # Extract Left & Right Archangel Wings behind the cross + clean feather shoulder tuck!
    lw_mask = keep_largest_component(fg & (~halo_mask) & (~core_mask) & (xx < 64))
    rw_mask = keep_largest_component(fg & (~halo_mask) & (~core_mask) & (xx >= 64))
    lw_src = np.zeros_like(base)
    lw_src[lw_mask] = base[lw_mask]
    rw_src = np.zeros_like(base)
    rw_src[rw_mask] = base[rw_mask]

    for y in range(52, 71):
        for x in range(47, 60):
            if lw_src[y, x, 3] == 0 and core[y, x, 3] > 0:
                col = (232, 214, 172) if y < 61 else (196, 174, 134)
                lw_src[y, x] = (*col, 255)
        for x in range(68, 81):
            if rw_src[y, x, 3] == 0 and core[y, x, 3] > 0:
                col = (232, 214, 172) if y < 61 else (196, 174, 134)
                rw_src[y, x] = (*col, 255)

    wing_ang = [6.0, 3.0, -1.5, -6.5, -10.5, -12.0, -10.5, -7.0, -2.5, 2.0, 5.5, 7.0]
    wing_dx = [-1.0, 0.0, 1.5, 2.5, 3.5, 4.0, 3.5, 2.5, 1.0, 0.0, -1.0, -1.0]
    wing_dy = [1.5, 0.5, -0.5, -1.5, -2.5, -3.0, -2.0, -1.0, 0.0, 1.0, 1.5, 2.0]
    halo_dys = [1, 0, -1, -2, -3, -4, -3, -2, -1, 0, 1, 1]

    frames = []
    for f in range(NUM_FRAMES):
        phase = 2.0 * math.pi * f / NUM_FRAMES
        pulse01 = 0.5 + 0.5 * math.sin(phase - 0.8)
        out = np.zeros((CELL, CELL, 4), dtype=np.uint8)

        # Layer 0: Expanding Tapered 16-Bit Golden Sunburst Beams (luminous tapered wedges, NOT muddy sticks!)
        rays = np.zeros((CELL, CELL, 4), dtype=np.uint8)
        rcx, rcy = 64.0, 61.0
        n_rays = 8
        for ri in range(n_rays):
            ra = ri * (2.0 * math.pi / n_rays) + math.pi / 8.0  # diagonal & cardinal golden cathedral rays!
            is_diag = ri % 2 == 0
            r_max = (24.0 if is_diag else 29.0) + 10.5 * (0.5 + 0.5 * math.sin(phase + ri * 0.8))
            ux, uy = math.cos(ra), math.sin(ra)
            px_v, py_v = -uy, ux
            steps = int(r_max * 1.5)
            for si in range(6, steps + 1):
                dist_r = si / 1.5
                s = (dist_r - 4.0) / max(1.0, r_max - 4.0)
                if s > 1.0:
                    continue
                half_w = max(0.4, (3.4 if not is_diag else 2.6) * ((1.0 - s) ** 0.85))
                bx = rcx + ux * dist_r
                by = rcy + uy * dist_r
                # Warm golden wedge rim -> bright lemon-gold body -> crisp white-gold core!
                draw_pixel_disk(rays, bx, by, half_w, (242, 180, 44))
                if half_w > 1.1:
                    draw_pixel_disk(rays, bx, by, half_w * 0.60, (254, 236, 132))
                if s < 0.55:
                    set_px(rays, bx, by, (255, 255, 238))
        # Subtle warm amber outer crisp edge (no dark muddy brown!)
        rays = add_ink_outline_to_layer(rays, ink_rgb=(176, 108, 22), only_bright_edge=False)
        composite_over(out, rays)

        # Layer 1: Archangel Wings cleanly opening & beating BEHIND the locked Sun-Cross!
        ang = wing_ang[f]
        dx = wing_dx[f]
        dy = wing_dy[f]
        lw_r = rotsprite_pivot(lw_src, (52.0, 56.0), ang, dx=-dx, dy=dy, seal_outline=True, ink_rgb=(18, 14, 22))
        rw_r = rotsprite_pivot(rw_src, (76.0, 56.0), -ang, dx=dx, dy=dy, seal_outline=True, ink_rgb=(18, 14, 22))
        for wb in (lw_r, rw_r):
            wfg = wb[:, :, 3] > 0
            wlum = 0.299 * wb[:, :, 0] + 0.587 * wb[:, :, 1] + 0.114 * wb[:, :, 2]
            blend_rgb(wb, wfg & (wlum > 135), (255, 254, 238), 0.08 + 0.22 * pulse01)
            composite_over(out, wb)

        # Layer 2: 100% LOCKED Radiant Golden Sun-Cross!
        core_f = core.copy()
        cf_fg = core_f[:, :, 3] > 0
        cf_lum = 0.299 * core_f[:, :, 0] + 0.587 * core_f[:, :, 1] + 0.114 * core_f[:, :, 2]
        cross_rad = np.hypot(xx - 64.0, yy - 61.0)
        wave = 0.5 + 0.5 * np.sin(cross_rad * 0.28 - phase)
        blend_rgb(core_f, cf_fg & (cf_lum > 90), (255, 255, 240), wave * 0.34 + 0.10 * pulse01)
        composite_over(out, core_f)

        # Layer 3: Rising & Gleaming Floating Golden Halo + Cross-Center Starlight Sparkle!
        halo_f = shift_rgba_int(halo_src, 0, halo_dys[f])
        blend_rgb(halo_f, halo_f[:, :, 3] > 0, (255, 255, 228), 0.15 + 0.40 * pulse01)
        composite_over(out, halo_f)

        if f in (4, 5, 6):
            arm = 7 if f == 5 else 4
            draw_pixel_star(out, 64, 61, arm, (255, 255, 255), (254, 240, 138), (245, 158, 11), diag_arm=2 if f == 5 else 0)
        if f in (3, 4, 5):
            draw_pixel_star(out, 64, 26 + halo_dys[f], 3 if f == 4 else 2, (255, 255, 255), (254, 240, 138))

        frames.append(out)
    return frames, core


def build_chronomancer_frames(base):
    """
    4. Chronos: Locked antique-gold watch bezel & Roman numeral dial;
       4 interlocking brass clockwork gears ACTUALLY ROTATE tooth-by-tooth (+ spokes!) behind the bezel;
       pixel-art golden clock hands ACTUALLY TICK & SWEEP cleanly around the spotless glowing teal dial!
    """
    yy, xx = np.mgrid[0:CELL, 0:CELL].astype(np.float32)
    dcx, dcy = 63.5, 70.8
    dist = np.hypot(xx - dcx, yy - dcy)
    ang = np.arctan2(yy - dcy, xx - dcx)
    fg = base[:, :, 3] > 0

    watch_mask = fg & ((dist <= 31.6) | ((xx >= 51) & (xx <= 76) & (yy <= 45)))
    watch_core = np.zeros_like(base)
    watch_core[watch_mask] = base[watch_mask]

    # Clean ONLY static original hands inside inner astral dial (`dist <= 15.2` + narrow tip along 2 o'clock ray up to `r=19.2`)
    r = watch_core[:, :, 0].astype(np.int32)
    g = watch_core[:, :, 1].astype(np.int32)
    b = watch_core[:, :, 2].astype(np.int32)
    ang_2oclock = np.abs(np.arctan2(np.sin(ang - (-0.64)), np.cos(ang - (-0.64)))) < 0.22
    inner_zone = watch_mask & ((dist <= 15.4) | ((dist <= 19.2) & ang_2oclock))
    is_static_hand = inner_zone & (((r > 92) & (r > b - 14)) | ((r < 72) & (g < 85) & (b < 85)))
    hand_erase = dilate4(is_static_hand) & inner_zone
    clean_dial_px = (dist <= 20.0) & watch_mask & (~hand_erase) & (g > 90) & (b > 90)

    rad_colors = {}
    for ri in range(0, 21):
        ring_m = clean_dial_px & (np.abs(dist - ri) <= 0.85)
        if np.any(ring_m):
            rad_colors[ri] = np.median(watch_core[ring_m, :3], axis=0).astype(np.uint8)
        else:
            rad_colors[ri] = np.array([28, 178, 172], dtype=np.uint8)

    hy, hx = np.where(hand_erase)
    for y, x in zip(hy, hx):
        mx = int(round(2 * dcx - x))
        my = int(round(2 * dcy - y))
        if 0 <= mx < CELL and 0 <= my < CELL and clean_dial_px[my, mx]:
            watch_core[y, x, :3] = watch_core[my, mx, :3]
        else:
            dx0, dy0 = x - dcx, y - dcy
            rx = int(round(dcx - dy0))
            ry = int(round(dcy + dx0))
            if 0 <= rx < CELL and 0 <= ry < CELL and clean_dial_px[ry, rx]:
                watch_core[y, x, :3] = watch_core[ry, rx, :3]
            else:
                ri = int(np.clip(round(dist[y, x]), 0, 20))
                watch_core[y, x, :3] = rad_colors[ri]

    watch_core = add_ink_outline_to_layer(watch_core, ink_rgb=(16, 12, 14), only_bright_edge=True)

    # 4 Interlocking Brass Gears with exact seamless tooth+spoke rotation (`tpl=2` -> 60°/90° visible turn per loop!)
    gears_spec = [
        (88.5, 53.5, 13.0, 16.5, 12, 5.5, 6,  1.0, 2),  # Top-right big gear (CW, 2 teeth = 1 full spoke pitch!)
        (96.5, 73.5,  8.5, 11.5,  8, 3.8, 4, -1.0, 2),  # Mid-right meshing small gear (CCW, 2 teeth = 1 full spoke pitch!)
        (33.5, 80.5, 12.2, 15.6, 12, 5.2, 6, -1.0, 2),  # Lower-left big gear (CCW)
        (46.5, 94.5,  7.8, 10.6,  8, 3.2, 4,  1.0, 2),  # Bottom-left meshing small gear (CW)
    ]

    cyan_dial_mask = watch_mask & (dist <= 24.5) & (watch_core[:, :, 1].astype(int) > 95) & (watch_core[:, :, 2].astype(int) > 95)
    gold_bezel_mask = watch_mask & (dist >= 24.5) & (watch_core[:, :, 0].astype(int) > 125)

    frames = []
    for f in range(NUM_FRAMES):
        phase = 2.0 * math.pi * f / NUM_FRAMES
        out = np.zeros((CELL, CELL, 4), dtype=np.uint8)

        # Layer 1: 4 Interlocking Brass Clockwork Gears ACTUALLY ROTATING tooth-by-tooth BEHIND the watch!
        for idx in (1, 3, 0, 2):
            gcx, gcy, rr, rt, nt, rh, ns, dsign, tpl = gears_spec[idx]
            g_ang = dsign * (2.0 * math.pi * tpl / nt) * (f / float(NUM_FRAMES))
            composite_over(out, draw_pixel_gear(gcx, gcy, rr, rt, nt, rh, ns, g_ang))

        # Layer 2: 100% LOCKED Antique-Gold Watch Bezel, Crown & Roman Numeral Dial!
        core_f = watch_core.copy()
        min_ang = -math.pi * 0.5 + phase * 2.0  # 2 full CW sweeps per 12 frames (60 deg/frame!)
        hr_ang = -math.pi * 0.5 + phase * 1.0   # 1 full CW tick sweep per 12 frames (30 deg/frame!)
        ang_diff = np.arctan2(np.sin(ang - min_ang), np.cos(ang - min_ang))
        trail = np.where((ang_diff <= 0.05) & (ang_diff >= -1.25), np.exp(-(ang_diff**2) / (2.0 * 0.45**2)), 0.0)
        blend_rgb(core_f, cyan_dial_mask, (232, 255, 255), trail * 0.65)
        bez_glint = np.clip(np.cos(ang - phase), 0.0, 1.0) ** 3
        blend_rgb(core_f, gold_bezel_mask, (255, 252, 212), bez_glint * 0.52)
        composite_over(out, core_f)

        # Layer 3: Crisp `#020617`-Outlined Golden Clock Hands ACTUALLY TICKING & SWEEPING!
        draw_clock_hand(out, dcx, dcy, 10.5, hr_ang, width=2.0, tip_diamond=True)
        draw_clock_hand(out, dcx, dcy, 15.8, min_ang, width=1.45, tip_diamond=True)

        draw_pixel_disk(out, dcx, dcy, 2.2, (18, 12, 14))
        draw_pixel_disk(out, dcx, dcy, 1.4, (255, 232, 128))
        set_px(out, dcx - 0.5, dcy - 0.5, (255, 255, 235))
        if f % 3 == 0:
            tx = dcx + math.cos(min_ang) * 16.5
            ty = dcy + math.sin(min_ang) * 16.5
            draw_pixel_star(out, tx, ty, 3, (255, 255, 255), (94, 234, 212))

        frames.append(out)
    return frames, watch_core


def build_valkyrie_frames(base):
    """
    5. Freyja: Locked golden Valkyrie war-helm;
       phoenix wings visibly beat & flare cleanly behind the helm (ZERO peeking shoulder seam!);
       all 4 connected Gungnir spears roar with whipping pixel fire plumes!
    """
    yy, xx = np.mgrid[0:CELL, 0:CELL].astype(np.float32)
    fg = base[:, :, 3] > 0
    r = base[:, :, 0].astype(np.float32)
    g = base[:, :, 1].astype(np.float32)
    b = base[:, :, 2].astype(np.float32)

    helm_mask = keep_largest_component(
        fg & (
            ((xx >= 51) & (xx <= 76) & (yy >= 30) & (yy <= 99))
            | ((xx >= 44) & (xx <= 83) & (yy >= 39) & (yy <= 86))
        )
    )
    core = np.zeros_like(base)
    core[helm_mask] = base[helm_mask]
    core = add_ink_outline_to_layer(core, ink_rgb=INK_WARM, only_bright_edge=True)

    spear_tl = (xx >= 24) & (xx <= 46) & (yy >= 22) & (yy <= 45) & ((xx + yy) < 77)
    spear_tr = (xx >= 81) & (xx <= 104) & (yy >= 22) & (yy <= 45) & (((127 - xx) + yy) < 77)
    spear_bl = (xx >= 23) & (xx <= 48) & (yy >= 80) & (yy <= 105)
    spear_br = (xx >= 79) & (xx <= 105) & (yy >= 80) & (yy <= 105)
    all_spear_zones = spear_tl | spear_tr | spear_bl | spear_br

    lw_mask = keep_largest_component(fg & (~helm_mask) & (~all_spear_zones) & (xx < 64))
    rw_mask = keep_largest_component(fg & (~helm_mask) & (~all_spear_zones) & (xx >= 64))
    lw_src = np.zeros_like(base)
    lw_src[lw_mask] = base[lw_mask]
    rw_src = np.zeros_like(base)
    rw_src[rw_mask] = base[rw_mask]

    # Tuck strictly inside the LOWER cheek-wing overlap (`y=61..77`) so ZERO orange box can EVER peek above cheek-wings!
    for y in range(61, 77):
        for x in range(47, 54):
            if lw_src[y, x, 3] == 0 and core[y, x, 3] > 0:
                col = (176, 36, 24) if y > 68 else (208, 62, 22)
                lw_src[y, x] = (*col, 255)
        for x in range(74, 81):
            if rw_src[y, x, 3] == 0 and core[y, x, 3] > 0:
                col = (176, 36, 24) if y > 68 else (208, 62, 22)
                rw_src[y, x] = (*col, 255)

    # All 4 Gungnir spears anchored solidly from center `(64, 64)` through the helm to all 4 corners!
    spears = [
        (64.0, 64.0, 27.0, 27.0, 0.0),   # Top-Left (NW)
        (64.0, 64.0, 100.0, 27.0, 1.5),  # Top-Right (NE)
        (64.0, 64.0, 27.0, 99.0, 3.1),   # Bottom-Left (SW)
        (64.0, 64.0, 100.0, 99.0, 4.6),  # Bottom-Right (SE)
    ]

    phoenix_pal = (
        (146, 18, 22),   # deep crimson
        (214, 48, 18),   # fiery scarlet
        (246, 128, 18),  # phoenix orange
        (255, 220, 58),  # blazing gold
        (255, 252, 214), # white-hot spear flare
    )

    wing_ang = [8.5, 4.5, -1.0, -6.5, -10.0, -11.0, -9.0, -4.5, 1.0, 5.5, 8.5, 9.5]
    wing_dx = [-1.0, 0.0, 1.0, 2.0, 3.0, 3.5, 2.5, 1.5, 0.5, -0.5, -1.0, -1.0]
    wing_dy = [-1.5, -0.5, 0.0, 1.0, 2.0, 2.5, 1.5, 0.5, -0.5, -1.0, -1.5, -2.0]

    helm_gold = helm_mask & (r > 135) & (g > 95) & (b < 115)

    frames = []
    for f in range(NUM_FRAMES):
        phase = 2.0 * math.pi * f / NUM_FRAMES
        out = np.zeros((CELL, CELL, 4), dtype=np.uint8)

        # Layer 0: 4 Fully Connected Gungnir Spear Shafts + Whipping/Roaring Pixel Fire Plumes!
        shaft_layer = np.zeros((CELL, CELL, 4), dtype=np.uint8)
        plume_tongues = []
        for rx, ry, tx, ty, sp_off in spears:
            dx_s, dy_s = tx - rx, ty - ry
            slen = math.hypot(dx_s, dy_s)
            ux, uy = dx_s / slen, dy_s / slen
            px, py = -uy, ux

            # Solid dark-wood & bronze spear shaft connecting ALL THE WAY from center to spearhead!
            draw_pixel_line(shaft_layer, rx, ry, rx + ux * (slen * 0.84), ry + uy * (slen * 0.84), (112, 58, 22), width=3)
            draw_pixel_line(shaft_layer, rx, ry, rx + ux * (slen * 0.82), ry + uy * (slen * 0.82), (188, 122, 46), width=1)
            # Crossbar spear collar right behind the flaming blade
            collar_x = rx + ux * (slen * 0.58)
            collar_y = ry + uy * (slen * 0.58)
            draw_pixel_line(shaft_layer, collar_x - px * 3.0, collar_y - py * 3.0, collar_x + px * 3.0, collar_y + py * 3.0, (244, 198, 72), width=2)

            # 3 roaring flame tongues hugging the forged Gungnir blade and whipping outward off the tip!
            base_x = rx + ux * (slen * 0.56)
            base_y = ry + uy * (slen * 0.56)
            for t_i, (side, l_scale, w_scale, freq) in enumerate([
                (0.0, 1.08, 1.05, 5.2),
                (-1.0, 0.82, 0.68, 6.4),
                (1.0, 0.82, 0.68, 5.8),
            ]):
                roar = 1.0 + 0.25 * math.sin(phase * 2.0 + sp_off + t_i * 1.4)
                plume_len = 25.0 * l_scale * roar
                pts = []
                steps = 16
                for k in range(steps):
                    s = k / float(steps - 1)
                    along = s * plume_len
                    whip = (
                        side * (2.6 * math.sin(s * math.pi * 0.85) + 2.0 * s)
                        + 3.4 * (s ** 1.15) * math.sin(s * freq - phase * 2.0 + sp_off + t_i * 2.0)
                    )
                    fx = base_x + ux * along + px * whip
                    fy = base_y + uy * along + py * whip
                    hw = (4.8 * w_scale) * ((1.0 - s) ** 0.65) + 0.55
                    pts.append((fx, fy, hw))
                plume_tongues.append(pts)

        shaft_layer = add_ink_outline_to_layer(shaft_layer, ink_rgb=INK_WARM, only_bright_edge=False)
        composite_over(out, shaft_layer)

        plumes_layer = render_curling_flame_tongues(plume_tongues, phoenix_pal, ink_rgb=INK_WARM)
        composite_over(out, plumes_layer)

        # Forged diamond-gold Gungnir spearhead blades gleaming inside the roaring flames!
        for rx, ry, tx, ty, _ in spears:
            slen = math.hypot(tx - rx, ty - ry)
            ux, uy = (tx - rx) / slen, (ty - ry) / slen
            draw_pixel_line(out, rx + ux * (slen * 0.60), ry + uy * (slen * 0.60), tx - ux * 1.0, ty - uy * 1.0, (255, 244, 178), width=2)
            draw_pixel_line(out, rx + ux * (slen * 0.66), ry + uy * (slen * 0.66), tx, ty, (255, 255, 255), width=1)

        # Layer 1: Beating & Flaring Phoenix Wings BEHIND the locked Valkyrie Helm!
        ang = wing_ang[f]
        dx = wing_dx[f]
        dy = wing_dy[f]
        lw_r = rotsprite_pivot(lw_src, (50.0, 66.0), ang, dx=-dx, dy=dy, seal_outline=True, ink_rgb=INK_WARM)
        rw_r = rotsprite_pivot(rw_src, (77.0, 66.0), -ang, dx=dx, dy=dy, seal_outline=True, ink_rgb=INK_WARM)
        flare_amt = max(0.0, (-ang + 1.0) / 13.0)
        for wb in (lw_r, rw_r):
            wfg = wb[:, :, 3] > 0
            wr = wb[:, :, 0].astype(np.float32)
            wg = wb[:, :, 1].astype(np.float32)
            tips = wfg & (wr > 175) & (wg > 75)
            blend_rgb(wb, tips, (255, 252, 185), 0.12 + flare_amt * 0.45)
            composite_over(out, wb)

        # Layer 2: 100% LOCKED Golden Valkyrie War-Helm!
        core_f = core.copy()
        sweep_y = 34.0 + (f / float(NUM_FRAMES)) * 62.0
        h_band = np.exp(-((yy - sweep_y) ** 2) / (2.0 * 4.0**2))
        blend_rgb(core_f, helm_gold, (255, 255, 232), h_band * 0.65)
        composite_over(out, core_f)

        # Layer 3: Snapping fiery embers leaping off all 4 spear tips!
        for s_idx, (rx, ry, tx, ty, sp_off) in enumerate(spears):
            ep = ((f / float(NUM_FRAMES)) + s_idx * 0.25) % 1.0
            slen = math.hypot(tx - rx, ty - ry)
            ux, uy = (tx - rx) / slen, (ty - ry) / slen
            ex = tx + ux * (2.0 + ep * 9.0) + math.sin(ep * 6.0 + sp_off) * 2.5
            ey = ty + uy * (2.0 + ep * 9.0) + math.cos(ep * 6.0 + sp_off) * 2.5
            if ep < 0.72:
                col = (255, 250, 175) if ep < 0.35 else (246, 128, 18)
                draw_pixel_disk(out, ex, ey, 1.0 if ep < 0.45 else 0.6, col)

        frames.append(out)
    return frames, core


def build_ronin_frames(base):
    """
    6. Kaze-Maru: Locked Samurai Kabuto + Blood Moon;
       multi-frame jagged electric-cyan pixel lightning bolts genuinely STRIKE, FORK, and SNAP with DIFFERENT bolt shapes each frame;
       diagonal iaijutsu slash glint across the crescent;
       sakura petals visibly flying across the Blood Moon!
    """
    yy, xx = np.mgrid[0:CELL, 0:CELL].astype(np.float32)
    mcx, mcy, mrad = 64.5, 62.5, 32.5
    mdist = np.hypot(xx - mcx, yy - mcy)
    fg = base[:, :, 3] > 0
    r = base[:, :, 0].astype(np.int32)
    g = base[:, :, 1].astype(np.int32)
    b = base[:, :, 2].astype(np.int32)

    core = base.copy()
    # Clean static outer cyan/white lightning bolts (including white core pixels at x=36..56, y=77..104!)
    # Strictly protect ONLY the central Oni mask face (`x in [53..76] & y in [60..85]`)!
    in_oni_face = (xx >= 53) & (xx <= 76) & (yy >= 60) & (yy <= 85)
    is_bolt_color = ((b > 110) & (g > 110) & ((b + g) * 0.5 - r > 18)) | ((r > 185) & (g > 205) & (b > 205))
    static_bolt = fg & (~in_oni_face) & is_bolt_color & (
        ((xx >= 66) & (yy <= 48)) | ((xx <= 56) & (yy >= 77))
    )
    static_sakura = fg & (~in_oni_face) & (r > 165) & (b > 115) & (g < 185) & (r - g > 30) & (
        (yy < 54) | (xx < 46) | (xx > 82) | (yy > 84)
    )
    erase_mask = dilate4(static_bolt | static_sakura) & (~in_oni_face)
    is_horn_or_kabuto = (
        ((r > 145) & (g > 110) & (b < 140))
        | ((b > 65) & (r < 85) & (g < 85) & (xx >= 42) & (xx <= 88) & (yy >= 44) & (yy <= 84))
    )
    erase_mask &= ~is_horn_or_kabuto

    ey, ex = np.where(erase_mask)
    for y, x in zip(ey, ex):
        d = mdist[y, x]
        if d <= mrad - 1.2:
            col = (206, 30, 44) if d < mrad - 4.0 else (182, 22, 36)
            core[y, x] = (*col, 255)
        elif d <= mrad + 0.4:
            core[y, x] = (*INK_DARK, 255)
        else:
            core[y, x] = (0, 0, 0, 0)

    oni_eyes = (core[:, :, 3] > 0) & (xx >= 52) & (xx <= 76) & (yy >= 65) & (yy <= 76) & (
        core[:, :, 2].astype(int) > 130
    ) & (core[:, :, 1].astype(int) > 130)
    gold_crest = (core[:, :, 3] > 0) & (core[:, :, 0].astype(int) > 155) & (
        core[:, :, 1].astype(int) > 120
    ) & (core[:, :, 2].astype(int) < 140) & (yy < 60)

    # 12 genuinely distinct, high-contrast electric-cyan jagged lightning strike shapes!
    lightning_choreo = [
        ([[(103, 18), (92, 26), (95, 31), (82, 39), (75, 45)],
          [(47, 84), (39, 89), (42, 95), (26, 106)]],
         [[(92, 26), (84, 24), (79, 28)], [(39, 89), (30, 88), (23, 93)]], 0.88),
        ([[(106, 24), (94, 30), (97, 36), (85, 42), (79, 49)],
          [(44, 82), (35, 86), (37, 92), (24, 100), (19, 108)]],
         [[(94, 30), (99, 39)], [(35, 86), (27, 83)]], 0.65),
        ([[(23, 18), (35, 28), (31, 34), (42, 42), (56, 48), (68, 46), (82, 42), (96, 28), (107, 20)],
          [(51, 86), (40, 94), (44, 99), (28, 109)]],
         [[(35, 28), (44, 26)], [(82, 42), (92, 44), (99, 50)], [(40, 94), (31, 93)]], 1.0),
        # f3: bold crackling double-fork storm arc on BOTH sides!
        ([[(99, 19), (89, 29), (94, 34), (83, 42)],
          [(35, 37), (26, 29), (29, 23), (19, 20)],
          [(47, 84), (37, 91), (31, 90), (20, 105)]],
         [[(89, 29), (81, 27)], [(37, 91), (42, 101)], [(26, 29), (20, 35)]], 0.85),
        ([[(89, 33), (96, 26), (103, 28)],
          [(42, 87), (34, 93), (26, 100)]],
         [[(34, 93), (27, 91)]], 0.55),
        ([[(19, 103), (32, 93), (29, 87), (41, 79), (47, 73)],
          [(86, 36), (95, 31), (104, 21)]],
         [[(32, 93), (40, 96)], [(41, 79), (34, 73)]], 0.82),
        ([[(108, 21), (96, 27), (99, 33), (86, 39), (77, 46)],
          [(49, 84), (42, 90), (45, 96), (33, 102), (23, 110)]],
         [[(96, 27), (89, 23)], [(86, 39), (93, 45)], [(42, 90), (33, 87)]], 0.96),
        ([[(98, 20), (92, 30), (96, 35), (87, 45), (92, 54), (86, 63)],
          [(44, 86), (34, 92), (25, 103)]],
         [[(87, 45), (79, 44)], [(92, 54), (100, 58)]], 0.72),
        ([[(107, 18), (94, 28), (98, 33), (83, 42), (74, 48)],
          [(52, 82), (41, 88), (45, 94), (31, 101), (19, 110)],
          [(35, 39), (26, 32), (29, 26), (19, 21)]],
         [[(94, 28), (85, 25)], [(41, 88), (32, 85), (25, 90)], [(26, 32), (20, 38)]], 1.0),
        ([[(37, 37), (47, 31), (55, 35), (64, 27), (74, 34), (83, 30), (92, 36)],
          [(45, 86), (36, 94), (27, 105)]],
         [[(64, 27), (66, 18)], [(36, 94), (28, 94)]], 0.94),
        ([[(94, 29), (102, 23), (106, 27)],
          [(47, 86), (38, 91), (32, 99), (24, 106)]],
         [[(38, 91), (43, 98)]], 0.62),
        ([[(105, 21), (95, 29), (88, 35)],
          [(43, 86), (35, 94), (28, 99)]],
         [[(95, 29), (99, 36)]], 0.56),
    ]

    sakura_seeds = [
        (0.05, 38, 28, 28, 36),
        (0.22, 92, 34, 42, 40),
        (0.38, 76, 26, 36, 44),
        (0.55, 98, 52, 34, 38),
        (0.72, 54, 58, 32, 34),
        (0.88, 86, 66, 30, 32),
    ]

    frames = []
    for f in range(NUM_FRAMES):
        out = core.copy()
        bolts, forks, eye_pow = lightning_choreo[f]

        if eye_pow >= 0.70:
            blend_rgb(out, oni_eyes, (248, 255, 255), eye_pow * 0.90)
        else:
            blend_rgb(out, oni_eyes, (96, 236, 255), 0.35)

        # Bold Diagonal Iaijutsu Slash Glint across the golden crescent & Blood Moon (f = 4..7)!
        if 4 <= f <= 7:
            sp = (f - 4) / 3.0
            sx = 34.0 + sp * 62.0
            crest_band = np.exp(-((xx - sx) ** 2) / (2.0 * 5.5**2))
            blend_rgb(out, gold_crest, (255, 255, 245), crest_band * 0.95)
            if f in (5, 6):
                sl_t = 0.0 if f == 5 else 1.0
                x_a = 28.0 + sl_t * 16.0
                y_a = 70.0 - sl_t * 12.0
                x_b = 84.0 + sl_t * 18.0
                y_b = 38.0 - sl_t * 12.0
                draw_pixel_line(out, x_a, y_a, x_b, y_b, (56, 226, 255), width=2)
                draw_pixel_line(out, x_a + 4, y_a - 2, x_b - 2, y_b + 1, (255, 255, 255), width=1)
                if f == 6:
                    draw_pixel_star(out, 92, 33, 7, (255, 255, 255), (254, 240, 138), (56, 189, 248), diag_arm=3)

        # Flying 2-tone pixel sakura petals visibly drifting diagonally across the Blood Moon!
        for off, x0, y0, dx_tr, dy_tr in sakura_seeds:
            t = (f / float(NUM_FRAMES) + off) % 1.0
            px = x0 - t * dx_tr + math.sin(t * 6.28 + off * 9.0) * 3.0
            py = y0 + t * dy_tr
            if 16 <= px <= 112 and 16 <= py <= 112:
                draw_pixel_sakura(out, px, py, (f + int(off * 12)) % 4)

        for b_idx, bpts in enumerate(bolts):
            sub_forks = forks if b_idx == 0 else None
            draw_lightning_chain(
                out, bpts,
                core_rgb=(255, 255, 255),
                mid_rgb=(56, 238, 255),
                outer_rgb=(14, 148, 238),
                width=2 if eye_pow >= 0.80 else 1,
                forks=sub_forks,
            )

        frames.append(out)
    return frames, core


def build_archer_frames(base):
    """
    7. Sylvara: Locked Elven Crescent Star-Bow;
       emerald bowstring visibly DRAWS BACK while charging a glowing crystal arrow,
       then RELEASES a bright emerald-gold starlight flare burst at the arrowhead!
       ZERO leftover static shaft outline ghost!
    """
    yy, xx = np.mgrid[0:CELL, 0:CELL].astype(np.float32)
    fg = base[:, :, 3] > 0
    comps = find_components(fg)
    main_mask = np.zeros((CELL, CELL), dtype=bool)
    for py, px in comps[0]:
        main_mask[py, px] = True
    star_comps = comps[1:]

    dist_arrow_axis = np.abs((xx + yy) - 125.0) * 0.7071
    along_arrow = ((xx - 41.0) - (yy - 84.0)) * 0.7071

    r = base[:, :, 0].astype(np.int32)
    g = base[:, :, 1].astype(np.int32)
    b = base[:, :, 2].astype(np.int32)
    is_gold_grip = (xx >= 66) & (xx <= 75) & (yy >= 51) & (yy <= 60) & (r > 130) & (g > 90) & (b < 110)

    is_arrowhead = main_mask & (along_arrow >= 47.0) & (along_arrow <= 78.0) & (dist_arrow_axis <= 7.5)
    # Use wider 3.6px band along shaft so ZERO 1px dark outline trace of the static shaft stays behind in bow_core!
    is_shaft_wide = main_mask & (along_arrow >= 9.0) & (along_arrow <= 49.0) & (dist_arrow_axis <= 3.7) & (~is_gold_grip)
    is_shaft_thin = main_mask & (along_arrow >= 6.0) & (along_arrow <= 50.0) & (dist_arrow_axis <= 2.3) & (~is_gold_grip)
    is_fletching = main_mask & (along_arrow >= -7.0) & (along_arrow <= 11.0) & (dist_arrow_axis <= 6.5) & (
        (g > r - 10) & (b > 55)
    )

    arrow_mask = is_arrowhead | is_shaft_thin | is_fletching
    arrow_src = np.zeros_like(base)
    arrow_src[arrow_mask] = base[arrow_mask]
    draw_pixel_line(arrow_src, 42, 83, 81, 44, (16, 86, 52), width=2)
    draw_pixel_line(arrow_src, 42, 83, 81, 44, (52, 211, 153), width=1)
    arrow_src[is_arrowhead] = base[is_arrowhead]
    arrow_src[is_fletching] = base[is_fletching]
    arrow_src = add_ink_outline_to_layer(arrow_src, ink_rgb=INK_DARK, only_bright_edge=True)

    def dist_to_seg(x0, y0, x1, y1):
        vx, vy = x1 - x0, y1 - y0
        l2 = max(1e-6, vx * vx + vy * vy)
        t = np.clip(((xx - x0) * vx + (yy - y0) * vy) / l2, 0.0, 1.0)
        return np.hypot(xx - (x0 + t * vx), yy - (y0 + t * vy))

    str_top_d = dist_to_seg(37.5, 38.0, 41.0, 77.0)
    str_bot_d = dist_to_seg(48.0, 86.0, 84.5, 93.5)
    is_gold_or_dark = ((r > 125) & (g > 90) & (b < 115)) | ((r < 48) & (g < 52) & (b < 48))
    static_str = main_mask & is_gold_or_dark & (
        ((str_top_d <= 2.5) & (yy >= 40) & (yy <= 75) & (xx >= 35) & (xx <= 44))
        | ((str_bot_d <= 2.4) & (xx >= 50) & (xx <= 84) & (yy >= 84) & (yy <= 96))
    )
    bow_erase = is_arrowhead | is_shaft_wide | is_fletching | static_str
    bow_core = np.zeros_like(base)
    keep_bow = main_mask & (~bow_erase)
    bow_core[keep_bow] = base[keep_bow]
    for pts in find_components(bow_core[:, :, 3] > 0):
        if len(pts) <= 14:
            for py, px in pts:
                bow_core[py, px] = (0, 0, 0, 0)
    bow_core = add_ink_outline_to_layer(bow_core, ink_rgb=INK_DARK, only_bright_edge=True)

    top_anchor = (37.0, 36.0)
    bot_anchor = (87.0, 94.0)

    # Clear 12-frame Draw -> Charge -> Release Starlight Burst -> Twang -> Nock cycle!
    arrow_shifts = [+4, +1, -3, -7, -10, -11, -11, -10, +7, +6, +3, +4]
    string_nocks = [
        (51, 74), (47, 78), (41, 84), (36, 89),
        (32, 93), (31, 94), (31, 94), (32, 93),
        (64, 61), (56, 69), (60, 65), (53, 72),
    ]

    frames = []
    for f in range(NUM_FRAMES):
        phase = 2.0 * math.pi * f / NUM_FRAMES
        out = np.zeros((CELL, CELL, 4), dtype=np.uint8)
        sh = arrow_shifts[f]
        nx, ny = string_nocks[f]

        # Layer 0: Taut `#020617`-outlined glowing emerald-gold bowstring!
        str_layer = np.zeros((CELL, CELL, 4), dtype=np.uint8)
        str_col = (195, 255, 232) if f in (5, 6, 7, 8) else (244, 212, 92)
        draw_pixel_line(str_layer, top_anchor[0], top_anchor[1], nx, ny, str_col, width=1)
        draw_pixel_line(str_layer, bot_anchor[0], bot_anchor[1], nx, ny, str_col, width=1)
        str_layer = add_ink_outline_to_layer(str_layer, ink_rgb=INK_DARK, only_bright_edge=False)
        composite_over(out, str_layer)

        # Layer 1: 100% LOCKED Elven Crescent Bow & Leafy Vines!
        composite_over(out, bow_core)

        # Layer 2: Moving Crystal Arrow sliding cleanly along the 45° axis (`dx = +sh, dy = -sh`)!
        arr_f = shift_rgba_int(arrow_src, sh, -sh)
        afg = arr_f[:, :, 3] > 0
        charge_lvl = [0.05, 0.12, 0.25, 0.45, 0.68, 0.85, 0.96, 0.88, 1.0, 0.72, 0.28, 0.08][f]
        if charge_lvl > 0.10:
            ar = arr_f[:, :, 0].astype(np.float32)
            ag = arr_f[:, :, 1].astype(np.float32)
            ab = arr_f[:, :, 2].astype(np.float32)
            em_mask = afg & (ag > 75) & ((ag + ab) > ar * 1.3)
            blend_rgb(arr_f, em_mask, (230, 255, 246), charge_lvl * 0.78)
        composite_over(out, arr_f)

        tip_x = 92 + sh
        tip_y = 33 - sh

        # Layer 3: Charge Orb (f=4..7) -> EXPLOSIVE Emerald-Gold Starlight Flare Burst on Release (f=8..10)!
        if f in (4, 5, 6, 7):
            c_arm = [0, 0, 0, 0, 4, 7, 10, 8][f]
            draw_pixel_star(out, tip_x, tip_y, c_arm, (255, 255, 255), (125, 255, 214), (254, 240, 138), diag_arm=c_arm // 2)
            for pi in range(4):
                pa = pi * (math.pi * 0.5) + f * 0.45
                pr = max(3.0, 13.0 - (f - 4) * 3.0)
                set_px(out, tip_x + math.cos(pa) * pr, tip_y + math.sin(pa) * pr, (175, 255, 232))
        elif f == 8:
            draw_pixel_disk(out, tip_x, tip_y, 5.2, (46, 208, 168))
            draw_pixel_disk(out, tip_x, tip_y, 3.2, (254, 240, 138))
            draw_pixel_star(out, tip_x, tip_y, 17, (255, 255, 255), (125, 255, 214), (254, 240, 138), diag_arm=10)
            draw_pixel_line(out, tip_x - 26, tip_y + 26, tip_x - 6, tip_y + 6, (175, 255, 232), width=1)
        elif f == 9:
            draw_pixel_disk(out, tip_x, tip_y, 3.2, (46, 208, 168))
            draw_pixel_star(out, tip_x, tip_y, 14, (255, 255, 255), (254, 240, 138), (46, 208, 168), diag_arm=7)
            for si in range(6):
                sa = si * (math.pi / 3.0) + 0.3
                draw_pixel_star(out, tip_x + math.cos(sa) * 12, tip_y + math.sin(sa) * 12, 2, (255, 255, 255), (125, 255, 214))
        elif f == 10:
            draw_pixel_star(out, tip_x, tip_y, 6, (255, 255, 255), (254, 240, 138), (46, 208, 168), diag_arm=2)

        # Layer 4: Detached Golden Stars twinkling & expanding crisply around the bow!
        for idx, pts in enumerate(star_comps):
            sxs = [p[1] for p in pts]
            sys_ = [p[0] for p in pts]
            scx = int(round(np.mean(sxs)))
            scy = int(round(np.mean(sys_)))
            tw = 0.5 + 0.5 * math.sin(phase + idx * 1.35)
            base_arm = 4 if len(pts) >= 24 else (3 if len(pts) >= 14 else 2)
            arm = max(1, int(round(base_arm * (0.45 + 0.85 * tw))))
            dy_s = -2 if tw > 0.72 else (1 if tw < 0.25 else 0)
            draw_pixel_star(out, scx, scy + dy_s, arm, (255, 255, 255), (254, 240, 138), (46, 208, 168))

        frames.append(out)
    return frames, bow_core


def build_reaper_frames(base):
    """
    8. Malakor: Locked horned Grim-Reaper skull + crimson eclipse + smooth crescent scythe blades;
       true 12-frame writhing violet-magenta pixel soul-flames genuinely blaze & whip along all 4 crossed scythes;
       pulsing crimson eclipse corona + flaring magenta skull eyes & soul-gem!
    """
    yy, xx = np.mgrid[0:CELL, 0:CELL].astype(np.float32)
    fg = base[:, :, 3] > 0
    r = base[:, :, 0].astype(np.float32)
    g = base[:, :, 1].astype(np.float32)
    b = base[:, :, 2].astype(np.float32)

    is_top_wisp = fg & (yy < 36) & ((xx < 47) | (xx > 81)) & (b > 90) & (r > 65)
    core = base.copy()
    core[is_top_wisp] = (0, 0, 0, 0)
    core = add_ink_outline_to_layer(core, ink_rgb=INK_DARK, only_bright_edge=True)

    core_fg = core[:, :, 3] > 0
    gem_eyes = core_fg & (r > 130) & (b > 125) & (g < 105) & (np.hypot(xx - 64.0, yy - 65.0) <= 20.0)
    eclipse_red = core_fg & (r > 130) & (g < 55) & (b < 65)

    soul_pal = (
        (68, 16, 118),
        (132, 34, 206),
        (196, 72, 246),
        (238, 146, 255),
        (255, 232, 255),
    )
    crimson_pal = (
        (118, 12, 28),
        (184, 20, 44),
        (236, 44, 72),
        (255, 112, 134),
        (255, 220, 228),
    )

    scythe_emitters = [
        (36, 35, -0.32, -0.95, 19.0, 0.0),
        (28, 42, -0.72, -0.70, 16.5, 1.1),
        (24, 52, -0.94, -0.34, 14.5, 2.2),
        (91, 35,  0.32, -0.95, 19.0, 3.1),
        (99, 42,  0.72, -0.70, 16.5, 4.2),
        (103, 52, 0.94, -0.34, 14.5, 5.3),
        (39, 86, -0.82, -0.57, 14.5, 1.7),
        (32, 95, -0.86,  0.50, 14.0, 2.9),
        (46, 100, -0.35, 0.94, 13.0, 4.1),
        (88, 86,  0.82, -0.57, 14.5, 4.8),
        (95, 95,  0.86,  0.50, 14.0, 0.5),
        (81, 100, 0.35,  0.94, 13.0, 2.4),
    ]

    frames = []
    for f in range(NUM_FRAMES):
        phase = 2.0 * math.pi * f / NUM_FRAMES
        eye_pulse = 0.5 + 0.5 * math.sin(phase - 0.5)
        out = np.zeros((CELL, CELL, 4), dtype=np.uint8)

        # Layer 0: Pulsing Crimson Eclipse Corona licking above the eclipse behind the skull!
        ecl_tongues = []
        for ei in range(5):
            ea = -math.pi * 0.5 + (ei - 2) * 0.42 + 0.08 * math.sin(phase + ei)
            elen = 9.5 + 6.0 * (0.5 + 0.5 * math.sin(phase * 2.0 + ei * 1.4))
            pts = []
            for k in range(10):
                s = k / 9.0
                sway = 2.5 * s * math.sin(s * 4.2 - phase * 2.0 + ei * 1.7)
                px = 64.0 + math.cos(ea) * (20.0 + s * elen) - math.sin(ea) * sway
                py = 56.0 + math.sin(ea) * (20.0 + s * elen) + math.cos(ea) * sway
                pts.append((px, py, 3.2 * (1.0 - s * 0.72)))
            ecl_tongues.append(pts)
        composite_over(out, render_curling_flame_tongues(ecl_tongues, crimson_pal, ink_rgb=INK_DARK))

        # Layer 1: TRUE 12-Frame Writhing Violet-Magenta Pixel Soul-Flames Blazing Along ALL 4 Scythes!
        soul_tongues = []
        for bx, by, ux, uy, blen, poff in scythe_emitters:
            px_v, py_v = -uy, ux
            roar = 1.0 + 0.34 * math.sin(phase * 2.0 + poff)
            tlen = blen * roar
            pts = []
            steps = 15
            for k in range(steps):
                s = k / float(steps - 1)
                along = s * tlen
                whip = 5.0 * (s ** 1.1) * math.sin(s * 5.0 - phase * 2.0 + poff)
                fx = bx + ux * along + px_v * whip
                fy = by + uy * along + py_v * whip
                hw = 4.3 * ((1.0 - s) ** 0.68) + 0.55
                pts.append((fx, fy, hw))
            soul_tongues.append(pts)
        composite_over(out, render_curling_flame_tongues(soul_tongues, soul_pal, ink_rgb=INK_DARK))

        # Layer 2: 100% LOCKED Horned Grim-Reaper Skull + Crimson Eclipse + Scythe Blades!
        core_f = core.copy()
        scythe_purp = core_fg & (b > 105) & (r > 70) & (b - g > 20) & (np.hypot(xx - 64.0, yy - 64.0) > 22.0)
        swave = np.sin(np.hypot(xx - 64.0, yy - 64.0) * 0.30 - phase * 2.0)
        blend_rgb(core_f, scythe_purp, (255, 224, 255), np.clip(swave, 0.0, 1.0) * 0.55)
        blend_rgb(core_f, eclipse_red, (255, 76, 108), (1.0 - eye_pulse) * 0.55)
        blend_rgb(core_f, gem_eyes, (255, 242, 255), 0.25 + eye_pulse * 0.72)
        composite_over(out, core_f)

        # Layer 3: Flaring Magenta Skull Eye Glints + Forehead Soul-Gem Cross-Flare!
        if f in (3, 4, 5, 6):
            e_arm = 5 if f in (4, 5) else 3
            draw_pixel_star(out, 55, 70, e_arm, (255, 255, 255), (244, 114, 255), (168, 85, 247))
            draw_pixel_star(out, 73, 70, e_arm, (255, 255, 255), (244, 114, 255), (168, 85, 247))
            draw_pixel_star(out, 64, 58, e_arm + 1, (255, 255, 255), (240, 171, 252), (168, 85, 247), diag_arm=2 if f in (4, 5) else 0)

        for wi, (sx0, sy0, dxw) in enumerate([(22, 34, -4), (105, 34, 4), (24, 92, -5), (103, 92, 5)]):
            wp = (f / float(NUM_FRAMES) + wi * 0.25) % 1.0
            wx = sx0 + dxw * wp + math.sin(wp * 6.28 + wi) * 2.0
            wy = sy0 - wp * 13.0
            if wp < 0.78:
                col = (255, 224, 255) if wp < 0.35 else (196, 72, 246)
                draw_pixel_disk(out, wx, wy, 1.0 if wp < 0.5 else 0.6, col)

        frames.append(out)
    return frames, core


def build_titan_frames(base):
    """
    9. Vulkan: Locked runic Mjolnir;
       crisp pixel-art cyan lightning arcs crackle & jump between the carved Norse runes;
       bold windup -> HEAVY IMPACT SLAM beat (peaking cleanly on f=5..6!) with an explosive radial golden forge-spark burst!
    """
    fg = base[:, :, 3] > 0
    comps = find_components(fg)
    hammer_mask = np.zeros((CELL, CELL), dtype=bool)
    for py, px in comps[0]:
        hammer_mask[py, px] = True
    hammer_src = np.zeros_like(base)
    hammer_src[hammer_mask] = base[hammer_mask]

    r = hammer_src[:, :, 0].astype(np.int32)
    g = hammer_src[:, :, 1].astype(np.int32)
    b = hammer_src[:, :, 2].astype(np.int32)
    runes_mask = hammer_mask & (b > 115) & (g > 130) & (g - r > 35)
    gold_caps = hammer_mask & (r > 150) & (g > 110) & (b < 95)

    # Bold rigid Windup (f1..4) -> HEAVY IMPACT SLAM (f5..6) -> Tremor Recoil (f7..8) -> Recovery (f9..11)!
    slam_offsets = [
        (0,  0),   # f0: poised
        (2, -3),   # f1: windup lift
        (5, -6),   # f2: high windup + rune surge
        (7, -8),   # f3: PEAK WINDUP HOLD!
        (5, -6),   # f4: accelerating strike
        (-5, +6),  # f5: HEAVY IMPACT STRIKE!
        (-7, +8),  # f6: PEAK IMPACT SLAM + MASSIVE RADIAL FORGE-SPARK & ANVIL BURST!
        (-4, +5),  # f7: heavy quake recoil + sparks flying outward
        (-5, +6),  # f8: secondary anvil tremor
        (-3, +3),  # f9: sparks scattering + lifting
        (-2, +2),  # f10: steady recovery
        (-1, +1),  # f11: returning smoothly to f0
    ]

    rune_nodes = [
        (45, 58), (51, 53), (57, 48), (64, 43), (70, 39),
        (53, 62), (61, 55), (69, 48),
    ]

    # 16 chunky ballistic forge sparks erupting radially on strike!
    sparks_spec = [
        (i * (2.0 * math.pi / 16.0) + (0.12 if i % 2 else -0.10),
         24.0 + (i % 3) * 10.0,
         2 if i % 2 == 0 else 1,
         i % 3)
        for i in range(16)
    ]

    frames = []
    for f in range(NUM_FRAMES):
        ox, oy = slam_offsets[f]
        out = np.zeros((CELL, CELL, 4), dtype=np.uint8)

        # Layer 0: Gathering embers during windup; Impact Anvil Flash behind hammer on strike!
        if 5 <= f <= 7:
            icx, icy = 42.0, 74.0
            if f in (5, 6):
                draw_pixel_star(
                    out, icx, icy, 20 if f == 6 else 14,
                    (255, 255, 255), (254, 240, 138), (249, 115, 22),
                    diag_arm=12 if f == 6 else 8,
                )
            elif f == 7:
                draw_pixel_star(out, icx, icy, 10, (255, 255, 255), (254, 240, 138), (249, 115, 22), diag_arm=5)
        elif f < 5 or f > 10:
            sp_layer = np.zeros((CELL, CELL, 4), dtype=np.uint8)
            for i in range(10):
                a = i * (2.0 * math.pi / 10.0) + f * 0.28
                rad_g = 38.0 - (f if f <= 4 else 0) * 2.5
                sx = 60.0 + ox + math.cos(a) * rad_g
                sy = 58.0 + oy + math.sin(a) * rad_g
                if 6 <= sx <= CELL - 7 and 6 <= sy <= CELL - 7:
                    draw_pixel_disk(sp_layer, sx, sy, 1.35 if i % 2 == 0 else 1.0, (251, 191, 36) if i % 2 == 0 else (255, 245, 165))
            sp_layer = add_ink_outline_to_layer(sp_layer, ink_rgb=INK_WARM, only_bright_edge=False)
            composite_over(out, sp_layer)

        # Layer 1: 100% LOCKED Rigid Mjolnir Hammer (shifted cleanly by integer (ox, oy))!
        ham_f = hammer_src.copy()
        rune_boost = [0.30, 0.55, 0.82, 0.96, 1.0, 1.0, 1.0, 0.80, 0.62, 0.45, 0.32, 0.26][f]
        blend_rgb(ham_f, runes_mask, (242, 255, 255), rune_boost)
        if f in (5, 6, 7):
            blend_rgb(ham_f, gold_caps, (255, 255, 232), 0.78 if f == 6 else 0.48)
        composite_over(out, shift_rgba_int(ham_f, ox, oy))

        # Layer 1.5: Explosive Radial Golden Forge-Spark Burst erupting boldly outward on Impact Frames (f = 5..10)!
        if 5 <= f <= 10:
            imp_t = (f - 5) / 5.0
            sp_layer = np.zeros((CELL, CELL, 4), dtype=np.uint8)
            for s_ang, s_spd, s_sz, s_kind in sparks_spec:
                dist_s = 23.0 + (imp_t ** 0.52) * (s_spd + 7.0)
                sx = 54.0 + math.cos(s_ang) * dist_s
                sy = 62.0 + math.sin(s_ang) * dist_s
                if 6 <= sx <= CELL - 7 and 6 <= sy <= CELL - 7:
                    col = (255, 252, 200) if (imp_t < 0.35 or s_kind == 0) else (
                        (251, 191, 36) if s_kind == 1 else (249, 115, 22)
                    )
                    if imp_t < 0.68 and s_sz == 2:
                        draw_pixel_disk(sp_layer, sx, sy, 1.85, col)
                        draw_pixel_line(
                            sp_layer, sx, sy,
                            sx - math.cos(s_ang) * 5.2, sy - math.sin(s_ang) * 5.2,
                            (249, 115, 22), width=1,
                        )
                    else:
                        draw_pixel_disk(sp_layer, sx, sy, 1.25, col)
            sp_layer = add_ink_outline_to_layer(sp_layer, ink_rgb=INK_WARM, only_bright_edge=False)
            composite_over(out, sp_layer)

        # Layer 2: Bold Crisp Pixel-Art Cyan Lightning Arcs Crackling & Jumping Across Carved Norse Runes!
        n0 = rune_nodes[(f * 2) % len(rune_nodes)]
        n1 = rune_nodes[(f * 2 + 2) % len(rune_nodes)]
        n2 = rune_nodes[(f * 2 + 4) % len(rune_nodes)]
        mid1 = ((n0[0] + n1[0]) * 0.5 + (((f % 3) - 1) * 5), (n0[1] + n1[1]) * 0.5 + (4 if f % 2 else -5))
        mid2 = ((n1[0] + n2[0]) * 0.5 + (5 if f % 2 else -4), (n1[1] + n2[1]) * 0.5 + (((f + 1) % 3) - 1) * 5)
        arc_pts = [
            (n0[0] + ox, n0[1] + oy),
            (mid1[0] + ox, mid1[1] + oy),
            (n1[0] + ox, n1[1] + oy),
            (mid2[0] + ox, mid2[1] + oy),
            (n2[0] + ox, n2[1] + oy),
        ]
        # Crackling corner bolts leaping off Mjolnir's forged head on ALL key frames!
        fx0, fy0 = n2[0] + ox, n2[1] + oy
        extra_forks = [
            [(fx0, fy0), (fx0 + (10 if f % 2 else -11), fy0 - 8), (fx0 + (16 if f % 2 else -18), fy0 - 15)],
        ]
        if f in (2, 3, 5, 6, 7):
            extra_forks.append(
                [(n0[0] + ox, n0[1] + oy), (n0[0] + ox - 10, n0[1] + oy + 8), (n0[0] + ox - 17, n0[1] + oy + 14)]
            )
        draw_lightning_chain(
            out, arc_pts,
            core_rgb=(255, 255, 255),
            mid_rgb=(94, 248, 255),
            outer_rgb=(14, 165, 233),
            width=2 if f in (3, 5, 6) else 1,
            forks=extra_forks,
        )

        if f == 6:
            draw_pixel_star(out, 36, 77, 10, (255, 255, 255), (103, 232, 249), (254, 240, 138), diag_arm=5)

        frames.append(out)
    return frames, hammer_src


def build_icemage_frames(base):
    """
    10. Lyra: Locked 5-spire diamond Glacial Crown;
        larger faceted floating ice shards genuinely orbit/rise & crystallize around the crown;
        multi-frame bursting diamond snowflake sparkles across all 5 spires!
    """
    yy, xx = np.mgrid[0:CELL, 0:CELL].astype(np.float32)
    fg = base[:, :, 3] > 0
    comps = find_components(fg)
    crown_mask = np.zeros((CELL, CELL), dtype=bool)
    for py, px in comps[0]:
        crown_mask[py, px] = True
    crown_src = np.zeros_like(base)
    crown_src[crown_mask] = base[crown_mask]

    r = crown_src[:, :, 0].astype(np.float32)
    g = crown_src[:, :, 1].astype(np.float32)
    b = crown_src[:, :, 2].astype(np.float32)
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    not_outline = crown_mask & (lum > 46)
    ice_facets = not_outline & (b > 120)
    sapphire = not_outline & (b > 160) & (r < 95) & (g < 145)

    def draw_crystal_shard(dst, cx, cy, stage):
        if stage <= 0:
            return
        layer = np.zeros((CELL, CELL, 4), dtype=np.uint8)
        cx, cy = int(round(cx)), int(round(cy))
        if stage == 1:
            set_px(layer, cx, cy, (255, 255, 255))
            set_px(layer, cx, cy - 1, (165, 243, 252))
            set_px(layer, cx, cy + 1, (56, 189, 248))
        elif stage == 2:
            for dy in range(-2, 3):
                w = 1 if abs(dy) <= 1 else 0
                for dx in range(-w, w + 1):
                    col = (255, 255, 255) if (dx <= 0 and dy <= 0) else ((125, 211, 252) if dy <= 0 else (56, 189, 248))
                    set_px(layer, cx + dx, cy + dy, col)
        else:
            # Bold crisp 7x9 faceted HD-2D diamond crystal matching Lyra's Glacial Crown scale!
            for dy in range(-4, 5):
                w = 3 if abs(dy) <= 1 else (2 if abs(dy) == 2 else (1 if abs(dy) == 3 else 0))
                for dx in range(-w, w + 1):
                    if dx < 0 and dy <= 0:
                        col = (255, 255, 255)
                    elif dx == 0 and dy <= 0:
                        col = (224, 248, 255)
                    elif dx > 0 and dy >= 0:
                        col = (34, 138, 220)
                    else:
                        col = (125, 211, 252)
                    set_px(layer, cx + dx, cy + dy, col)
        layer = add_ink_outline_to_layer(layer, ink_rgb=INK_DARK, only_bright_edge=False)
        composite_over(dst, layer)

    orbit_shards = [
        (0.00, 45.0, 17.0, 82.0, 3),
        (0.17, 43.0, 15.0, 66.0, 3),
        (0.33, 45.0, 17.0, 84.0, 3),
        (0.50, 42.0, 14.0, 56.0, 2),
        (0.67, 44.0, 16.0, 80.0, 3),
        (0.83, 42.0, 15.0, 64.0, 2),
    ]
    rise_shards = [
        (21.0, 92.0, 28.0, 0.00),
        (107.0, 92.0, 28.0, 0.50),
        (33.0, 99.0, 22.0, 0.25),
        (95.0, 99.0, 22.0, 0.75),
    ]
    spire_bursts = [
        (64, 30, 0),
        (48, 40, 2),
        (80, 40, 4),
        (31, 47, 6),
        (97, 47, 8),
        (64, 62, 10),
    ]

    frames = []
    for f in range(NUM_FRAMES):
        phase = 2.0 * math.pi * f / NUM_FRAMES
        pulse01 = 0.5 + 0.5 * math.sin(phase)
        out = np.zeros((CELL, CELL, 4), dtype=np.uint8)

        # Layer 0: Back-half of orbiting ice shards (tucking cleanly BEHIND the crown!)
        for off, rx_o, ry_o, cy_o, max_st in orbit_shards:
            a = phase + off * 2.0 * math.pi
            if math.sin(a) < 0.0:
                sx = 64.0 + math.cos(a) * rx_o
                sy = cy_o + math.sin(a) * ry_o
                draw_crystal_shard(out, sx, sy, max(2, max_st - 1))

        # Layer 1: 100% LOCKED 5-Spire Diamond Glacial Crown!
        crown_f = crown_src.copy()
        sweep_x = -46.0 + (f / float(NUM_FRAMES)) * 96.0
        prism = np.exp(-((((xx - 64.0) + (yy - 60.0) * 0.45) - sweep_x) ** 2) / (2.0 * 5.8**2))
        blend_rgb(crown_f, ice_facets, (254, 255, 255), prism * 0.72)
        blend_rgb(crown_f, sapphire, (205, 246, 255), 0.20 + pulse01 * 0.55)
        composite_over(out, crown_f)

        # Layer 2: Front-half of orbiting ice shards + Rising Crystallizing Shards!
        for off, rx_o, ry_o, cy_o, max_st in orbit_shards:
            a = phase + off * 2.0 * math.pi
            if math.sin(a) >= 0.0:
                sx = 64.0 + math.cos(a) * rx_o
                sy = cy_o + math.sin(a) * ry_o
                draw_crystal_shard(out, sx, sy, max_st)

        for rx0, ry0, rise_h, off in rise_shards:
            t = (f / float(NUM_FRAMES) + off) % 1.0
            sx = rx0 + math.sin(t * 6.28) * 2.5
            sy = ry0 - t * rise_h
            if t < 0.20:
                draw_crystal_shard(out, sx, sy, 1)
            elif t < 0.45:
                draw_crystal_shard(out, sx, sy, 2)
            elif t < 0.82:
                draw_crystal_shard(out, sx, sy, 3)
            else:
                draw_pixel_star(out, sx, sy, 4, (255, 255, 255), (165, 243, 252), (56, 189, 248))

        # Layer 3: Multi-Frame Bursting Diamond Snowflake Sparkles Across ALL 5 Spires + Center Snowflake!
        for sx, sy, start_f in spire_bursts:
            age = (f - start_f) % NUM_FRAMES
            if age == 0:
                draw_pixel_star(out, sx, sy, 3, (255, 255, 255), (165, 243, 252))
            elif age == 1:
                draw_pixel_star(out, sx, sy, 8, (255, 255, 255), (165, 243, 252), (56, 189, 248), diag_arm=4)
            elif age == 2:
                draw_pixel_star(out, sx, sy, 10, (255, 255, 255), (186, 230, 253), (56, 189, 248), diag_arm=6)
                for ddx, ddy in ((-4, -1), (4, -1), (-4, 1), (4, 1), (-1, -4), (1, -4), (-1, 4), (1, 4)):
                    set_px(out, sx + ddx, sy + ddy, (224, 248, 255))
            elif age == 3:
                draw_pixel_star(out, sx, sy, 5, (255, 255, 255), (125, 211, 252), diag_arm=2)
            elif age == 4:
                draw_pixel_star(out, sx, sy, 2, (255, 255, 255), (165, 243, 252))

        frames.append(out)
    return frames, crown_src


def build_android_frames(base):
    """
    11. Unit-07: Locked titanium Cyber-Valkyrie helmet;
        the 2 detached floating cyber funnel pods genuinely sweep wide -> aim/lock on -> pulse twin cyan/hot-pink plasma charge flares;
        crisp HUD visor scan-bar sweeps top-to-bottom across the glowing visor!
    """
    yy, xx = np.mgrid[0:CELL, 0:CELL].astype(np.float32)
    fg = base[:, :, 3] > 0
    comps = find_components(fg)

    helm_mask = np.zeros((CELL, CELL), dtype=bool)
    for py, px in comps[0]:
        helm_mask[py, px] = True
    helm_src = np.zeros_like(base)
    helm_src[helm_mask] = base[helm_mask]

    pod_l_src = np.zeros_like(base)
    pod_r_src = np.zeros_like(base)
    for pts in comps[1:]:
        mean_x = float(np.mean([p[1] for p in pts]))
        target = pod_l_src if mean_x < 64.0 else pod_r_src
        for py, px in pts:
            target[py, px] = base[py, px]

    r = helm_src[:, :, 0].astype(np.float32)
    g = helm_src[:, :, 1].astype(np.float32)
    b = helm_src[:, :, 2].astype(np.float32)
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    not_outline = helm_mask & (lum > 46)
    visor = not_outline & (np.abs(xx - 64.0) < 20) & (yy >= 53) & (yy <= 81) & (b > 130) & (g > 130) & (g - r > 20)
    neon_pink = not_outline & (r > 175) & (b > 105) & (r - g > 65)

    # Every frame has continuous smooth pod motion (zero frozen duplicate frames!)
    pod_choreo = [
        (0.0,   0.0,   0.0, 0),  # f0: hover ready
        (5.5,  -7.0, -10.0, 0),  # f1: sweeping wide
        (10.0, -14.0, -16.0, 0), # f2: FULL WIDE DEPLOY!
        (9.0,  -12.0, -8.0, 1),  # f3: aim lock begin
        (4.5,  -5.5,   6.0, 1),  # f4: target lock!
        (1.5,  -1.0,  12.0, 2),  # f5: LOCKED ON — charging!
        (2.5,   1.0,  12.0, 4),  # f6: PEAK TWIN PLASMA CHARGE FLARE!
        (3.5,   2.0,  10.0, 4),  # f7: SUSTAINED HOT-PINK/CYAN PLASMA BLAST!
        (2.5,   1.0,   7.0, 3),  # f8: recoil plasma ring!
        (1.0,   0.0,   3.0, 2),  # f9: flare fade
        (0.5,  -2.0,  -2.0, 0),  # f10: smooth glide
        (2.0,  -3.5,  -5.0, 0),  # f11: buoyant hover into f0
    ]

    frames = []
    for f in range(NUM_FRAMES):
        phase = 2.0 * math.pi * f / NUM_FRAMES
        pulse01 = 0.5 + 0.5 * math.sin(phase)
        out = np.zeros((CELL, CELL, 4), dtype=np.uint8)

        # Layer 1: 100% LOCKED Titanium Cyber-Valkyrie Helmet + Crisp Top-to-Bottom HUD Visor Scan-Bar!
        helm_f = helm_src.copy()
        scan_y = 54.0 + ((f % 10) / 9.0) * 26.0
        scan_core = visor & (np.abs(yy - scan_y) <= 1.05)
        scan_halo = visor & (np.abs(yy - scan_y) <= 2.4) & (~scan_core)
        blend_rgb(helm_f, scan_halo, (103, 232, 249), 0.58)
        blend_rgb(helm_f, scan_core, (248, 255, 255), 0.96)
        if f in (6, 7):
            blend_rgb(helm_f, visor, (224, 255, 255), 0.36 if f == 6 else 0.24)
        blend_rgb(helm_f, neon_pink, (255, 215, 245), 0.15 + 0.45 * pulse01)
        composite_over(out, helm_f)

        if f in (4, 5, 6, 7):
            tc = (255, 92, 168) if f in (5, 7) else (240, 255, 255)
            for bx in (52, 75):
                set_px(out, bx, 64, tc)
                set_px(out, bx, 65, tc)
                set_px(out, bx, 66, tc)
                set_px(out, bx + (1 if bx < 64 else -1), 65, (255, 255, 255))

        # Layer 2: 2 Detached Floating Cyber Funnel Pods Sweeping Wide -> Locking On -> Firing Twin Plasma Flares!
        dx_m, dy_p, tilt_l, chg = pod_choreo[f]
        pl = rotsprite_pivot(pod_l_src, (29.5, 82.0), tilt_l, dx=-dx_m, dy=dy_p, seal_outline=True, ink_rgb=INK_DARK)
        pr = rotsprite_pivot(pod_r_src, (97.5, 82.0), -tilt_l, dx=dx_m, dy=dy_p, seal_outline=True, ink_rgb=INK_DARK)
        if chg >= 2:
            for pb in (pl, pr):
                pfg = pb[:, :, 3] > 0
                pcyan = pfg & (pb[:, :, 2].astype(int) > 120) & (pb[:, :, 1].astype(int) > 120)
                blend_rgb(pb, pcyan, (245, 255, 255), 0.85)
        composite_over(out, pl)
        composite_over(out, pr)

        # Layer 3: Punchy Twin Cyan / Hot-Pink Plasma Charge Flares erupting from BOTH funnel pod emitters!
        lx, ly = 25.0 - dx_m, 80.0 + dy_p
        rx, ry = 102.0 + dx_m, 80.0 + dy_p
        if chg == 1:
            for px_c, py_c in ((lx, ly), (rx, ry)):
                for ox_b, oy_b in ((-8, -8), (8, -8), (-8, 8), (8, 8)):
                    set_px(out, px_c + ox_b, py_c + oy_b, (244, 63, 94))
                    set_px(out, px_c + ox_b - (1 if ox_b > 0 else -1), py_c + oy_b, (244, 63, 94))
        elif chg == 2:
            for px_c, py_c in ((lx, ly), (rx, ry)):
                draw_pixel_disk(out, px_c, py_c, 3.0, (34, 211, 238))
                draw_pixel_star(out, px_c, py_c, 6, (255, 255, 255), (34, 211, 238), (244, 63, 94))
        elif chg == 3:
            for px_c, py_c in ((lx, ly), (rx, ry)):
                draw_pixel_disk(out, px_c, py_c, 4.6, (244, 63, 94))
                draw_pixel_disk(out, px_c, py_c, 3.0, (34, 211, 238))
                draw_pixel_star(out, px_c, py_c, 10, (255, 255, 255), (34, 211, 238), (244, 63, 94), diag_arm=5)
        elif chg == 4:
            # PEAK TWIN PLASMA CHARGE FLARE BLAST!
            alt = f == 7
            ring_col = (34, 211, 238) if alt else (244, 63, 94)
            inner_col = (244, 63, 94) if alt else (34, 211, 238)
            for px_c, py_c in ((lx, ly), (rx, ry)):
                draw_pixel_disk(out, px_c, py_c, 6.0, ring_col)
                draw_pixel_disk(out, px_c, py_c, 4.0, inner_col)
                draw_pixel_disk(out, px_c, py_c, 2.2, (255, 255, 255))
                draw_pixel_star(out, px_c, py_c, 15, (255, 255, 255), (103, 232, 249), (244, 63, 94), diag_arm=7)

        frames.append(out)
    return frames, helm_src


def build_nyx_frames(base):
    """
    12. Nyx ("Cob"): Locked CRT monitor;
        Cob genuinely FLAPS her 2 neon wing-bits through real multi-frame wing angles (up/mid/down);
        animates distinct cute pixel face expressions (open eyes -> happy ^w^ blink -> starry sparkle eyes);
        pops & rises animated pixel hearts around her monitor!
    """
    yy, xx = np.mgrid[0:CELL, 0:CELL].astype(np.float32)
    fg = base[:, :, 3] > 0
    comps = find_components(fg)

    crt_mask = np.zeros((CELL, CELL), dtype=bool)
    for py, px in comps[0]:
        crt_mask[py, px] = True
    crt_src = np.zeros_like(base)
    crt_src[crt_mask] = base[crt_mask]

    wing_l_src = np.zeros_like(base)
    wing_r_src = np.zeros_like(base)
    for pts in comps[1:]:
        if len(pts) > 70:
            mean_x = float(np.mean([p[1] for p in pts]))
            target = wing_l_src if mean_x < 64.0 else wing_r_src
            for py, px in pts:
                target[py, px] = base[py, px]

    r = crt_src[:, :, 0].astype(np.float32)
    g = crt_src[:, :, 1].astype(np.float32)
    b = crt_src[:, :, 2].astype(np.float32)
    lum = 0.299 * r + 0.587 * g + 0.114 * b

    crt_dark = crt_mask & (xx >= 44) & (xx <= 83) & (yy >= 49) & (yy <= 82) & (lum >= 20) & (lum <= 72) & (b >= r)
    screen_rgb = np.median(crt_src[crt_dark, :3], axis=0).astype(np.uint8)
    pink_blush = crt_mask & (lum > 46) & (np.abs(xx - 64.0) < 22) & (r > 165) & (r - g > 50)

    eye_boxes = [(51, 57, 58, 69), (70, 76, 58, 69)]
    eye_centers = [(54, 63), (73, 63)]

    wing_flap_ang = [+24.0, +12.0, -4.0, -22.0, -10.0, +10.0, +26.0, +14.0, -2.0, -22.0, -8.0, +12.0]
    wing_flap_dy = [-3, -1, 1, 3, 1, -1, -3, -1, 1, 3, 1, -1]

    hearts_spec = [
        (98,  56, 18, 0.00, True),
        (29,  86, 17, 0.25, True),
        (29,  52, 15, 0.50, False),
        (97,  85, 16, 0.72, False),
        (64,  28, 12, 0.38, True),
    ]

    frames = []
    for f in range(NUM_FRAMES):
        phase = 2.0 * math.pi * f / NUM_FRAMES
        pulse01 = 0.5 + 0.5 * math.sin(phase)
        out = np.zeros((CELL, CELL, 4), dtype=np.uint8)

        # Layer 1: 100% LOCKED Cob CRT Monitor!
        crt_f = crt_src.copy()
        scan_y = 50.0 + (f / float(NUM_FRAMES)) * 31.0
        scan_glow = np.exp(-((yy - scan_y) ** 2) / (2.0 * 1.4**2))
        blend_rgb(crt_f, crt_dark, (66, 142, 184), scan_glow * 0.42)

        if f in (4, 5, 6):
            for x0, x1, y0, y1 in eye_boxes:
                crt_f[y0 : y1 + 1, x0 : x1 + 1, :3] = screen_rgb
            arc_y_off = -1 if f == 5 else 0
            for ecx, ecy in eye_centers:
                cy_a = ecy + arc_y_off
                for dx_a, dy_a, col in [
                    (-3, 2, (34, 211, 238)),
                    (-2, 1, (34, 211, 238)), (-2, 0, (165, 248, 255)),
                    (-1, 0, (165, 248, 255)), (-1, -1, (255, 255, 255)),
                    (0,  0, (165, 248, 255)), (0,  -1, (255, 255, 255)),
                    (1,  0, (165, 248, 255)), (1,  -1, (255, 255, 255)),
                    (2,  1, (34, 211, 238)), (2,  0, (165, 248, 255)),
                    (3,  2, (34, 211, 238)),
                ]:
                    set_px(crt_f, ecx + dx_a, cy_a + dy_a, col)
            blend_rgb(crt_f, pink_blush, (255, 185, 228), 0.55)
        elif f in (7, 8, 9, 10):
            for x0, x1, y0, y1 in eye_boxes:
                crt_f[y0 : y1 + 1, x0 : x1 + 1, :3] = screen_rgb
            big = f in (8, 9)
            arm_e = 5 if big else 4
            for ecx, ecy in eye_centers:
                draw_pixel_star(
                    crt_f, ecx, ecy, arm_e,
                    (255, 255, 255),
                    (254, 240, 138) if big else (165, 248, 255),
                    (34, 211, 238),
                    diag_arm=2 if big else 1,
                )
                if big:
                    set_px(crt_f, ecx - 3, ecy - 3, (254, 240, 138))
                    set_px(crt_f, ecx + 3, ecy + 3, (165, 248, 255))
            blend_rgb(crt_f, pink_blush, (255, 198, 236), 0.62)
        else:
            for ecx, ecy in eye_centers:
                set_px(crt_f, ecx - 1, ecy - 2, (255, 255, 255))
                set_px(crt_f, ecx, ecy - 2, (235, 255, 255))
                if f in (1, 2):
                    set_px(crt_f, ecx - 1, ecy - 1, (255, 255, 255))
            blend_rgb(crt_f, pink_blush, (255, 200, 232), 0.16 * pulse01)

        composite_over(out, crt_f)

        # Layer 2: Cob's 2 Neon Wing-Bits Genuinely FLAPPING Through Real Multi-Frame Wing Angles!
        ang_l = wing_flap_ang[f]
        wdy = wing_flap_dy[f]
        wl = rotsprite_pivot(wing_l_src, (34.5, 62.0), ang_l, dx=0, dy=wdy, seal_outline=True, ink_rgb=INK_DARK)
        wr = rotsprite_pivot(wing_r_src, (92.5, 62.0), -ang_l, dx=0, dy=wdy, seal_outline=True, ink_rgb=INK_DARK)
        composite_over(out, wl)
        composite_over(out, wr)

        # Layer 3: Popping & Rising Animated Pixel Hearts around Cob!
        for hx0, hy0, h_rise, h_off, is_pink in hearts_spec:
            t = (f / float(NUM_FRAMES) + h_off) % 1.0
            hx = hx0 + math.sin(t * 6.28 + h_off * 8.0) * 2.5
            hy = hy0 - t * h_rise
            fill = (244, 63, 158) if is_pink else (34, 211, 238)
            hi = (255, 192, 232) if is_pink else (205, 252, 255)
            if t < 0.16:
                draw_pixel_heart(out, hx, hy, 0, fill, hi, outline=True)
            elif t < 0.36:
                draw_pixel_heart(out, hx, hy, 1, fill, hi, outline=True)
            elif t < 0.78:
                draw_pixel_heart(out, hx, hy, 2 if is_pink else 1, fill, hi, outline=True)
            elif t < 0.92:
                draw_pixel_star(out, hx, hy, 3, (255, 255, 255), hi, fill)

        frames.append(out)
    return frames, crt_src


BUILDERS = {
    "warrior": build_warrior_frames,
    "mage": build_mage_frames,
    "priestess": build_priestess_frames,
    "chronomancer": build_chronomancer_frames,
    "valkyrie": build_valkyrie_frames,
    "ronin": build_ronin_frames,
    "archer": build_archer_frames,
    "reaper": build_reaper_frames,
    "titan": build_titan_frames,
    "icemage": build_icemage_frames,
    "android": build_android_frames,
    "nyx": build_nyx_frames,
}


# ==============================================================================
# 4. SHEET ASSEMBLY & MULTI-FRAME QA VERIFICATION SHEETS
# ==============================================================================

def make_checker(w, h, c1, c2, tile=8):
    yy, xx = np.mgrid[0:h, 0:w]
    pat = ((xx // tile) + (yy // tile)) % 2 == 0
    bg = np.zeros((h, w, 4), dtype=np.uint8)
    bg[pat] = (*c1, 255)
    bg[~pat] = (*c2, 255)
    return bg


def alpha_comp(bg_rgba, fg_rgba):
    a = fg_rgba[:, :, 3:4].astype(np.float32) / 255.0
    out = bg_rgba[:, :, :3].astype(np.float32) * (1.0 - a) + fg_rgba[:, :, :3].astype(np.float32) * a
    return np.clip(np.round(out), 0, 255).astype(np.uint8)


def main():
    sheet = np.zeros((CELL * 12, CELL * NUM_FRAMES, 4), dtype=np.uint8)
    all_frames = {}
    all_cores = {}
    all_names = []

    row = 0
    for plate_path, names in PLATES:
        arr = np.array(Image.open(plate_path).convert("RGB"))
        quads = [(0, 512, 0, 512), (0, 512, 512, 1024), (512, 1024, 0, 512), (512, 1024, 512, 1024)]
        for name, (y0, y1, x0, x1) in zip(names, quads):
            rgb100 = sample_native_100(arr[y0:y1, x0:x1])
            base = extract_clean_rgba(rgb100, name)
            frames, core = BUILDERS[name](base)
            assert len(frames) == NUM_FRAMES, f"{name} expected {NUM_FRAMES} frames"
            for f_idx, fr in enumerate(frames):
                sheet[row * CELL : (row + 1) * CELL, f_idx * CELL : (f_idx + 1) * CELL] = fr
            all_frames[name] = frames
            all_cores[name] = core
            all_names.append(name)

            min_margin = 999
            max_green = 0
            sil_deltas = []
            px_deltas = []
            for i in range(NUM_FRAMES):
                fr = frames[i]
                fg = fr[:, :, 3] > 0
                ys, xs = np.where(fg)
                m_i = min(int(xs.min()), int(ys.min()), CELL - 1 - int(xs.max()), CELL - 1 - int(ys.max()))
                min_margin = min(min_margin, m_i)
                r, g, b = fr[:, :, 0].astype(int), fr[:, :, 1].astype(int), fr[:, :, 2].astype(int)
                max_green = max(max_green, int(np.sum(fg & (g >= 185) & (r <= 60) & (b <= 75) & ((g - r) >= 120) & ((g - b) >= 115))))
                nxt = frames[(i + 1) % NUM_FRAMES]
                sil_deltas.append(int(np.sum((fr[:, :, 3] > 0) != (nxt[:, :, 3] > 0))))
                px_deltas.append(int(np.sum(np.any(fr != nxt, axis=2))))

            print(
                f"[{row:2d}] {name:13s} | min_margin={min_margin:2d}px | rem_neon={max_green} "
                f"| sil_delta={min(sil_deltas):3d}..{max(sil_deltas):4d}px | px_delta={min(px_deltas):3d}..{max(px_deltas):4d}px"
            )
            row += 1

    out_path = os.path.join(REPO_ROOT, "assets/sprites/ult_emblems_sheet.png")
    Image.fromarray(sheet, "RGBA").save(out_path, optimize=True)
    fsize_kb = os.path.getsize(out_path) / 1024.0
    print(f"\nSaved {out_path} ({sheet.shape[1]}x{sheet.shape[0]} RGBA, {fsize_kb:.1f} KB)")

    os.makedirs(QA_DIR, exist_ok=True)
    key_frames = [0, 3, 6, 9]
    cell_z = 256
    chk_dark = make_checker(cell_z * 4, cell_z * 6, (12, 16, 30), (20, 26, 46), tile=16)
    chk_mag = make_checker(cell_z * 4, cell_z * 6, (215, 35, 195), (245, 75, 220), tile=16)

    for part, r_start in ((1, 0), (2, 6)):
        strip = np.zeros((cell_z * 6, cell_z * 4, 4), dtype=np.uint8)
        for ri in range(6):
            name = all_names[r_start + ri]
            for ci, kf in enumerate(key_frames):
                up = np.array(Image.fromarray(all_frames[name][kf], "RGBA").resize((cell_z, cell_z), Image.NEAREST))
                strip[ri * cell_z : (ri + 1) * cell_z, ci * cell_z : (ci + 1) * cell_z] = up
        p_dark = os.path.join(QA_DIR, f"qa_4f_dark_p{part}.png")
        p_mag = os.path.join(QA_DIR, f"qa_4f_magenta_p{part}.png")
        Image.fromarray(alpha_comp(chk_dark, strip), "RGB").save(p_dark)
        Image.fromarray(alpha_comp(chk_mag, strip), "RGB").save(p_mag)
        print(f"Saved QA {p_dark} & {p_mag}")

    chk_core = make_checker(cell_z * 4, cell_z * 3, (215, 35, 195), (245, 75, 220), tile=16)
    core_grid = np.zeros((cell_z * 3, cell_z * 4, 4), dtype=np.uint8)
    for idx, name in enumerate(all_names):
        ri, ci = idx // 4, idx % 4
        up = np.array(Image.fromarray(all_cores[name], "RGBA").resize((cell_z, cell_z), Image.NEAREST))
        core_grid[ri * cell_z : (ri + 1) * cell_z, ci * cell_z : (ci + 1) * cell_z] = up
    p_core = os.path.join(QA_DIR, "qa_locked_cores_magenta.png")
    Image.fromarray(alpha_comp(chk_core, core_grid), "RGB").save(p_core)
    print(f"Saved QA {p_core}")


if __name__ == "__main__":
    main()
