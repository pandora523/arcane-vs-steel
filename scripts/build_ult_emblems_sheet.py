#!/usr/bin/env python3
"""
Builds the lossless, 8-frame animated HD-2D Ultimate Crest Emblem Sprite Sheet:
  `assets/sprites/ult_emblems_sheet.png` (`1024 x 1536` RGBA = 8 cols x 12 rows of `128x128`)

Row Order (canonical `PixelForge.ULT_EMBLEM_ORDER`):
  0: warrior      (Aethelgard — Winged Sovereign Crown + 3 Swords + Cyan Diamond)
  1: mage         (Ignis Sol  — Solar Eclipse + Swirling Curling Flames)
  2: priestess    (Seraphina  — Archangel Wings + Radiant Sun-Cross + Halo)
  3: chronomancer (Chronos    — Astral Pocket-Watch + Roman Dial + Gears)
  4: valkyrie     (Freyja     — Winged Valkyrie Helm + Phoenix Wings + Flaming Spears)
  5: ronin        (Kaze-Maru  — Samurai Kabuto + Blood Moon + Lightning + Sakura)
  6: archer       (Sylvara    — Elven Crescent Star-Bow + Emerald Arrow + Vines + Stars)
  7: reaper       (Malakor    — Horned Abyssal Skull + Soul-Gem + Scythes + Crimson Eclipse)
  8: titan        (Vulkan     — Runic Norse Mjolnir War-Hammer + Forge Sparks)
  9: icemage      (Lyra       — 5-Spire Glacial Diamond Crown + Floating Ice Shards)
 10: android      (Unit-07    — Cyber-Valkyrie Mecha Helmet + 2 Floating Funnel Pods)
 11: nyx          (Nyx        — Cyber-Neko CRT Mascot "Cob" + Wing-Bits + Pixel Hearts)

Design Guarantees:
  - Exact 1:1 native pixel-grid recovery (`100x100` art grid per `512x512` quadrant -> centered
    losslessly inside `128x128` with >= 12px margin, zero mixels, zero JPEG edge ringing).
  - Strict chroma-key flood-fill + interior pure-neon-green hole punch + edge green-despill
    preserving all deliberate emerald/teal interior colors (`archer`, `chronomancer`, `titan`).
  - Zero cut-like seams & zero uncanny morphing: connected art animates strictly via classic
    16-bit palette-cycling, specular metallic sweeps, glowing rune/gem/eye surges, CRT visor
    scanlines, and Cob's adorable eye blink; only naturally detached connected components
    (halo, funnel pods, wing-bits, hearts, ice shards, forge sparks, stars) levitate +-1px.
"""

import math
import os
from collections import deque
import numpy as np
from PIL import Image

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTIFACT_DIR = "/Users/rei/.gemini/antigravity/brain/2eb56890-606c-4bfb-a092-e50544d80e30"

PLATES = [
    (
        os.path.join(ARTIFACT_DIR, "ult_emblems_plate1_1795088313401.jpg"),
        ["warrior", "mage", "priestess", "chronomancer"],
    ),
    (
        os.path.join(ARTIFACT_DIR, "ult_emblems_plate2_1795088314842.jpg"),
        ["valkyrie", "ronin", "archer", "reaper"],
    ),
    (
        os.path.join(ARTIFACT_DIR, "ult_emblems_plate3_1795088315341.jpg"),
        ["titan", "icemage", "android", "nyx"],
    ),
]

CELL = 128
NUM_FRAMES = 8
GRID_N = 100
PITCH = 512.0 / GRID_N  # Exact 5.12px native pixel pitch verified by FFT


def find_best_grid_offset(q_rgb):
    """Finds sub-pixel phase offset (ox, oy) in [0, PITCH) aligning to native art pixel centers."""
    qf = q_rgb.astype(np.float32)
    best_ox, best_sx = PITCH * 0.5, 1e18
    for step in range(25):
        ox = step * (PITCH / 25.0)
        xs = np.clip(np.round(ox + np.arange(GRID_N) * PITCH).astype(int), 1, 510)
        # Minimize intra-cell variance around sampled centers (x-1, x, x+1)
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
    """Recovers crisp 100x100 native pixel art using 3x3 median at exact detected pixel centers."""
    ox, oy = find_best_grid_offset(q_rgb)
    xs = np.clip(np.round(ox + np.arange(GRID_N) * PITCH).astype(int), 1, 510)
    ys = np.clip(np.round(oy + np.arange(GRID_N) * PITCH).astype(int), 1, 510)
    samples = []
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            samples.append(q_rgb[np.ix_(ys + dy, xs + dx)])
    stack = np.stack(samples, axis=0)  # (9, 100, 100, 3)
    return np.median(stack, axis=0).astype(np.uint8)


def extract_clean_rgba(rgb100, name):
    """
    Chroma-keys #00FF00 background + enclosed pure-green holes + 1px edge despill
    while 100% preserving intentional interior emerald/teal pixels (archer/chronomancer/titan).
    """
    H, W, _ = rgb100.shape
    r = rgb100[:, :, 0].astype(np.int32)
    g = rgb100[:, :, 1].astype(np.int32)
    b = rgb100[:, :, 2].astype(np.int32)

    # Exterior flood-fill (catches pure neon green + bright yellow-green bleed at border)
    ext_green = (g >= 130) & ((g - r) >= 42) & ((g - b) >= 48)
    # Slightly stricter enclosed hole seed so interior emerald bow/leaves stay 100% intact:
    # Pure chroma-screen green has g >= 180 and VERY low blue (b <= 95) and (g - r >= 65) and (g - b >= 95).
    # Notice: archer's emerald bow/leaves are dark/teal green (g <= 185, higher blue or lower g-b),
    # whereas enclosed #00FF00 holes (priestess cross rays, archer bowstring gaps, chronomancer gears)
    # have vivid neon green g >= 175, g - b >= 85, g - r >= 55!
    hole_seed = (g >= 175) & ((g - r) >= 52) & ((g - b) >= 88)
    if name == "archer":
        # Archer's bright vine highlights can have g~175, r~130, b~80 (yellow-green leaf tip),
        # whereas real #00FF00 holes have r <= 95, b <= 95, g >= 185!
        hole_seed = (g >= 180) & (r <= 105) & (b <= 95) & ((g - r) >= 75) & ((g - b) >= 95)
    elif name == "priestess":
        # Priestess has a warm golden cross glow adjacent to tiny #00FF00 holes between rays
        hole_seed = (g >= 165) & ((g - r) >= 36) & ((g - b) >= 85)

    bg = np.zeros((H, W), dtype=bool)
    q = deque()

    # Seed from all 4 edges
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

    # Flood enclosed pure-neon-green holes
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

    # Remove single isolated neon-green border fringe pixels that survived 3x3 median
    # (e.g. a 1px bright green corner sitting on the outside edge of a dark outline)
    bg_dil = bg.copy()
    bg_dil[:-1, :] |= bg[1:, :]
    bg_dil[1:, :] |= bg[:-1, :]
    bg_dil[:, :-1] |= bg[:, 1:]
    bg_dil[:, 1:] |= bg[:, :-1]

    fringe_kill = (~bg) & bg_dil & (g >= 120) & ((g - r) >= 40) & ((g - b) >= 50)
    bg |= fringe_kill

    # Recompute boundary mask for subtle green despill on pixels directly touching transparency
    bg_dil = bg.copy()
    bg_dil[:-1, :] |= bg[1:, :]
    bg_dil[1:, :] |= bg[:-1, :]
    bg_dil[:, :-1] |= bg[:, 1:]
    bg_dil[:, 1:] |= bg[:, :-1]

    out = np.zeros((H, W, 4), dtype=np.uint8)
    out[:, :, :3] = rgb100
    out[:, :, 3] = np.where(bg, 0, 255).astype(np.uint8)

    # Edge despill: clamp any residual green tint on 1px outer boundary pixels touching bg
    edge = (~bg) & bg_dil
    ey, ex = np.where(edge)
    for y, x in zip(ey, ex):
        rv, gv, bv = int(out[y, x, 0]), int(out[y, x, 1]), int(out[y, x, 2])
        # If this is a dark outline pixel contaminated by green spill (e.g. #0c4810 -> #080b14)
        if rv < 70 and bv < 70 and gv > max(rv, bv) + 14:
            if name == "archer" and gv < 115 and bv >= 25:
                # Preserve dark emerald leaf edge if clearly blue-green
                out[y, x, 1] = min(gv, max(rv, bv) + 32)
            else:
                out[y, x, 0] = min(rv, 16)
                out[y, x, 1] = min(gv, 18)
                out[y, x, 2] = min(bv, 28)
        elif gv > max(rv, bv) + 18 and bv < 130:
            # Warm gold/orange/white edge that picked up slight yellow-green tint from #00FF00
            if name != "archer":
                out[y, x, 1] = min(gv, max(rv, bv) + 8)

    # Priestess sunburst warmth fix: eliminate any slight yellow-green chroma bleed behind golden cross rays
    if name == "priestess":
        fg_p = out[:, :, 3] > 0
        pr = out[:, :, 0].astype(np.int32)
        pg = out[:, :, 1].astype(np.int32)
        pb = out[:, :, 2].astype(np.int32)
        grn_sun = fg_p & (pg > pr + 2) & (pg > pb + 20)
        if np.any(grn_sun):
            out[grn_sun, 0] = np.clip(np.maximum(pr[grn_sun], pg[grn_sun] + 8), 0, 255).astype(np.uint8)
            out[grn_sun, 1] = np.clip(pg[grn_sun] - 10, 0, 255).astype(np.uint8)

    # Clean tiny 1-2px detached green-ish stray specks far from main body
    fg = out[:, :, 3] > 0
    comps = find_components(fg)
    for pts in comps:
        if len(pts) <= 2:
            # Only drop if greenish or dimly anti-aliased noise; keep bright intentional star dots!
            avg_r = np.mean([out[y, x, 0] for y, x in pts])
            avg_g = np.mean([out[y, x, 1] for y, x in pts])
            avg_b = np.mean([out[y, x, 2] for y, x in pts])
            if avg_g > max(avg_r, avg_b) + 15 or max(avg_r, avg_g, avg_b) < 90:
                for y, x in pts:
                    out[y, x] = (0, 0, 0, 0)

    # Center tight bbox cleanly inside 128x128 (zero resizing — 1:1 native pixel purity!)
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


def find_components(mask):
    """Returns list of 8-connected components (sorted largest-first), each as list of (y, x)."""
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


def blend_rgb(dst, mask, target_rgb, amount):
    """Linearly blends masked RGBA pixels toward target_rgb by scalar or per-pixel amount (0..1)."""
    if not np.any(mask):
        return
    arr = dst[mask, :3].astype(np.float32)
    t = np.array(target_rgb, dtype=np.float32)
    if np.ndim(amount) > 0:
        a = np.clip(amount[mask], 0.0, 1.0)[:, None]
    else:
        a = float(np.clip(amount, 0.0, 1.0))
    res = arr * (1.0 - a) + t * a
    dst[mask, :3] = np.clip(np.round(res), 0, 255).astype(np.uint8)


def shift_component(base, dst, pts, dx, dy, glow_rgb=None, glow_amt=0.0):
    """Moves a naturally detached connected component cleanly by integer (dx, dy) without cutting."""
    # Clear old pixels in dst first (caller clears all moving comps before pasting)
    for y, x in pts:
        ny, nx = y + dy, x + dx
        if 0 <= ny < CELL and 0 <= nx < CELL:
            px = base[y, x].copy()
            if glow_rgb is not None and glow_amt > 0.0:
                lum = (int(px[0]) + int(px[1]) + int(px[2])) / 3.0
                if lum > 45:  # Keep dark #020617 pixel outlines crisp!
                    for c in range(3):
                        px[c] = int(
                            np.clip(round(px[c] * (1.0 - glow_amt) + glow_rgb[c] * glow_amt), 0, 255)
                        )
            dst[ny, nx] = px


def draw_pixel_star(dst, cx, cy, arm, core_rgb, ray_rgb):
    """Draws a tiny crisp 1px pixel-art 4-point sparkle ONLY over opaque or nearby pixels."""
    pts = [(cx, cy, core_rgb)]
    for d in range(1, arm + 1):
        col = core_rgb if d == 1 else ray_rgb
        pts.extend([(cx - d, cy, col), (cx + d, cy, col), (cx, cy - d, col), (cx, cy + d, col)])
    for x, y, col in pts:
        if 0 <= x < CELL and 0 <= y < CELL:
            dst[y, x, :3] = col
            dst[y, x, 3] = 255


def build_8_frames(base, name):
    """
    Generates 8 seamless looping 16-bit HD-2D animation frames for `name`.
    ZERO cut-like seams, ZERO uncanny morphing:
      - Connected body stays 100% pixel-solid & faithful.
      - Naturally detached floating components hover smoothly +-1px.
      - Authentic 16-bit palette cycling, metallic specular sweeps, glowing rune/gem/eye surges,
        HUD scanlines, lightning crackles, and Nyx Cob's adorable eye blink!
    """
    H, W = CELL, CELL
    yy, xx = np.mgrid[0:H, 0:W]
    fg = base[:, :, 3] > 0
    r = base[:, :, 0].astype(np.float32)
    g = base[:, :, 1].astype(np.float32)
    b = base[:, :, 2].astype(np.float32)
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    not_outline = fg & (lum > 46)

    ys, xs = np.where(fg)
    cx = float(xs.mean())
    cy = float(ys.mean())
    dx_c = xx - cx
    dy_c = yy - cy
    dist = np.hypot(dx_c, dy_c)
    ang = np.arctan2(dy_c, dx_c)

    comps = find_components(fg)
    frames = []

    for f in range(NUM_FRAMES):
        phase = 2.0 * math.pi * f / NUM_FRAMES
        pulse01 = 0.5 + 0.5 * math.sin(phase)
        out = base.copy()

        if name == "warrior":
            # 1. Center cyan diamond gem pulses bright aqua -> white-cyan + crisp sparkle peak!
            cyan_gem = not_outline & (b > 135) & (g > 135) & ((b + g) * 0.5 - r > 35)
            gem_boost = 0.12 + 0.45 * (0.5 + 0.5 * math.sin(phase - 0.6))
            blend_rgb(out, cyan_gem, (235, 255, 255), gem_boost)

            # 2. Diagonal Dawn-Breaker metallic sheen sweeping across gold crown & silver sword blades
            metal = not_outline & (~cyan_gem) & (lum > 110)
            sweep_pos = -52.0 + (f / float(NUM_FRAMES)) * 124.0
            band = np.exp(-(((dx_c + dy_c * 0.65) - sweep_pos) ** 2) / (2.0 * 5.2**2))
            blend_rgb(out, metal, (255, 254, 240), band * 0.48)

            # 3. Subtle warm golden shimmer cascading up the outer wing feathers
            wings = not_outline & (np.abs(dx_c) > 22) & (lum > 135)
            wing_wave = 0.5 + 0.5 * np.sin(phase + dy_c * 0.18)
            blend_rgb(out, wings, (255, 248, 210), wing_wave * 0.18)

            # Crisp 4-point diamond gleam on peak frames
            if f in (2, 3):
                cys, cxs = np.where(cyan_gem & (np.abs(dx_c) < 12))
                if len(cxs) > 0:
                    gx, gy = int(np.median(cxs)), int(np.median(cys)) - 2
                    draw_pixel_star(out, gx, gy, 3 if f == 2 else 2, (255, 255, 255), (125, 249, 255))

        elif name == "mage":
            # 1. TRUE 16-bit radial fire palette-cycling along the swirling solar flame tongues!
            # Exclude the jet-black solar eclipse core (dist < 17 & lum < 45)
            flame = not_outline & (r > 110) & (r - b > 45) & (dist > 17.5)
            # Traveling radial + spiral heat wave moving OUTWARD from eclipse rim to flame tips!
            # Using angle swirl + radial distance creates unmistakable flowing solar fire with ZERO morphing!
            wave = np.sin(dist * 0.34 - phase - ang * 2.0)
            hot = np.clip(wave, 0.0, 1.0)
            cool = np.clip(-wave, 0.0, 1.0)
            # Inner tongues flash blazing golden-white; crests deepen to rich ruby crimson!
            blend_rgb(out, flame, (255, 248, 165), hot * 0.64)
            blend_rgb(out, flame, (135, 14, 10), cool * 0.40)

            # 2. Orbiting golden solar corona glint around the ornate eclipse filigree ring
            ring = not_outline & (dist >= 16.0) & (dist <= 24.5) & (r > 130) & (g > 90)
            corona = np.clip(np.cos(ang - phase), 0.0, 1.0) ** 3
            blend_rgb(out, ring, (255, 255, 232), corona * 0.72)

        elif name == "priestess":
            # 1. Naturally detached golden Halo levitates cleanly +-1px + glows softly!
            if len(comps) >= 2:
                halo_pts = comps[1]
                for y, x in halo_pts:
                    out[y, x] = (0, 0, 0, 0)
                halo_dy = [-1, -1, 0, 0, 1, 1, 0, 0][f]
                shift_component(
                    base, out, halo_pts, 0, halo_dy, glow_rgb=(255, 255, 225), glow_amt=0.14 + 0.32 * pulse01
                )

            # 2. Radiant Golden Sun-Cross & sunburst rays pulse outward from cross center!
            gold_cross = not_outline & (np.abs(dx_c) < 22) & (dy_c > -20) & (r > 160) & (g > 120)
            cross_wave = 0.5 + 0.5 * np.sin(dist * 0.25 - phase)
            blend_rgb(out, gold_cross, (255, 255, 242), cross_wave * 0.36)

            # 3. Gentle pearlescent cascade down the sweeping archangel wings
            wings = not_outline & (np.abs(dx_c) >= 18) & (lum > 140)
            feather_shimmer = np.clip(np.sin(dy_c * 0.14 - phase), 0.0, 1.0) ** 2
            blend_rgb(out, wings, (255, 253, 235), feather_shimmer * 0.26)

        elif name == "chronomancer":
            # Find exact center of the cyan-teal clockface dial
            cyan_dial = not_outline & (b > 110) & (g > 115) & (r < 120)
            dys, dxs = np.where(cyan_dial)
            dcx = float(dxs.mean()) if len(dxs) > 0 else cx
            dcy = float(dys.mean()) if len(dys) > 0 else cy + 5.0
            ddist = np.hypot(xx - dcx, yy - dcy)
            dang = np.arctan2(yy - dcy, xx - dcx)

            # 1. Clockwise astral radar/tick sweep illuminating the cyan clockface & Roman runes!
            sweep_ang = phase - math.pi * 0.5
            ang_diff = np.arctan2(np.sin(dang - sweep_ang), np.cos(dang - sweep_ang))
            radar = np.exp(-(ang_diff**2) / (2.0 * 0.42**2))
            radial_ring = 0.5 + 0.5 * np.sin(ddist * 0.36 - phase)
            blend_rgb(out, cyan_dial, (225, 255, 255), np.clip(radar * 0.58 + radial_ring * 0.18, 0.0, 0.68))

            # 2. Gleaming antique-gold shimmer across clock bezel, hands & interlocking gears!
            gold_gears = not_outline & (~cyan_dial) & (r > 125) & (g > 90)
            gear_wave = np.clip(np.cos(dang + phase), 0.0, 1.0) ** 2
            blend_rgb(out, gold_gears, (255, 248, 195), gear_wave * 0.36)

        elif name == "valkyrie":
            # 1. TRUE 16-bit phoenix-fire palette-cycling flowing across blazing wings & 4 spearheads!
            fire_wings = not_outline & (r > 125) & (r - b > 55) & ((np.abs(dx_c) > 14) | (np.abs(dy_c) > 22))
            wing_fire = np.sin(dist * 0.28 - phase)
            blend_rgb(out, fire_wings, (255, 248, 155), np.clip(wing_fire, 0.0, 1.0) * 0.58)
            blend_rgb(out, fire_wings, (150, 14, 24), np.clip(-wing_fire, 0.0, 1.0) * 0.34)

            # 2. Razor-crisp vertical golden metallic sweep down the sculpted Valkyrie war-helm!
            helm_gold = not_outline & (np.abs(dx_c) <= 18) & (r > 140) & (g > 100)
            sweep_y = -28.0 + (f / float(NUM_FRAMES)) * 64.0
            helm_band = np.exp(-((dy_c - sweep_y) ** 2) / (2.0 * 4.2**2))
            blend_rgb(out, helm_gold, (255, 254, 232), helm_band * 0.64)

        elif name == "ronin":
            # 1. Electric cyan lightning bolts crackle & strobe cleanly (bright arc surge on beats!)
            cyan_fx = not_outline & (b > 135) & (g > 135) & ((b + g) * 0.5 - r > 32)
            # Separate eyes (central mask) vs outer lightning arcs
            eyes = cyan_fx & (np.abs(dx_c) < 16) & (dy_c > -8) & (dy_c < 14)
            bolts = cyan_fx & (~eyes)

            bolt_strobe = [0.55, 0.15, 0.72, 0.05, 0.48, 0.80, 0.12, 0.30][f]
            if bolt_strobe > 0.40:
                blend_rgb(out, bolts, (245, 255, 255), bolt_strobe * 0.82)
                blend_rgb(out, eyes, (245, 255, 255), 0.72)
            else:
                blend_rgb(out, bolts, (38, 150, 245), 0.42)
                blend_rgb(out, eyes, (110, 235, 255), 0.22)

            # 2. Golden crescent-moon horn crest catches a crisp katana-steel glint sweep!
            gold_crest = not_outline & (r > 155) & (g > 125) & (b < 145) & (dy_c < 5)
            sweep_x = -38.0 + (f / float(NUM_FRAMES)) * 84.0
            crest_band = np.exp(-((dx_c - sweep_x) ** 2) / (2.0 * 5.0**2))
            blend_rgb(out, gold_crest, (255, 255, 240), crest_band * 0.65)

            # 3. Crimson Blood-Moon subtly breathes deeper crimson-scarlet
            moon = not_outline & (r > 140) & (g < 80) & (b < 85)
            blend_rgb(out, moon, (255, 72, 92), pulse01 * 0.18)

            # 4. Pink sakura petals glint softly
            sakura = not_outline & (r > 180) & (b > 130) & (g < 175)
            blend_rgb(out, sakura, (255, 240, 248), (0.5 + 0.5 * math.cos(phase)) * 0.35)

        elif name == "archer":
            # 1. Naturally detached golden 4-point stars twinkle cleanly on staggered phases!
            star_comps = comps[1:]
            for idx, pts in enumerate(star_comps):
                for y, x in pts:
                    out[y, x] = (0, 0, 0, 0)
            for idx, pts in enumerate(star_comps):
                tw = 0.5 + 0.5 * math.sin(phase + idx * 1.45)
                sdy = -1 if tw > 0.82 else (1 if tw < 0.18 else 0)
                shift_component(base, out, pts, 0, sdy, glow_rgb=(255, 255, 235), glow_amt=tw * 0.65)

            # 2. Radiant emerald starlight energy flows diagonally UP the arrow shaft into the crystal tip!
            emerald = not_outline & (g > 95) & (g >= r - 10) & (g > b - 20)
            diag = (dx_c - dy_c) * 0.707  # bottom-left (-45) -> top-right arrowhead (+45)
            arrow_wave = np.exp(-(((diag - (-38.0 + (f / float(NUM_FRAMES)) * 84.0))) ** 2) / (2.0 * 8.0**2))
            blend_rgb(out, emerald, (215, 255, 232), np.clip(arrow_wave * 0.68 + pulse01 * 0.12, 0.0, 0.75))

            # 3. Golden crescent bow filigree catches subtle sunlit shimmer
            gold_bow = not_outline & (~emerald) & (r > 155) & (g > 115) & (b < 110)
            blend_rgb(out, gold_bow, (255, 252, 205), arrow_wave * 0.42)

        elif name == "reaper":
            # 1. Violet soul-flames on crossed scythes flow via 16-bit abyssal palette-cycling!
            purple_scythe = not_outline & (b > 105) & (r > 70) & (b - g > 20) & (dist > 18.0)
            soul_wave = np.sin(dist * 0.32 - phase + ang * 2.0)
            blend_rgb(out, purple_scythe, (252, 215, 255), np.clip(soul_wave, 0.0, 1.0) * 0.64)
            blend_rgb(out, purple_scythe, (54, 10, 96), np.clip(-soul_wave, 0.0, 1.0) * 0.42)

            # 2. Forehead purple soul-gem & glowing magenta skull eyes pulse with eerie heartbeat!
            gem_eyes = not_outline & (r > 135) & (b > 130) & (g < 105) & (dist <= 22.0)
            eye_pulse = 0.5 + 0.5 * math.sin(phase * 1.0 + 0.4)
            blend_rgb(out, gem_eyes, (255, 240, 255), 0.18 + eye_pulse * 0.72)

            # 3. Crimson eclipse rim pulses ominously on opposite beat
            eclipse_red = not_outline & (r > 130) & (g < 55) & (b < 65)
            blend_rgb(out, eclipse_red, (255, 68, 102), (1.0 - eye_pulse) * 0.52)

        elif name == "titan":
            # 1. Naturally detached golden forge sparks float & twinkle warmly out of phase!
            spark_comps = comps[1:]
            for pts in spark_comps:
                for y, x in pts:
                    out[y, x] = (0, 0, 0, 0)
            for idx, pts in enumerate(spark_comps):
                tw = 0.5 + 0.5 * math.sin(phase + idx * 1.15)
                sdy = -1 if tw > 0.65 else (1 if tw < 0.25 else 0)
                shift_component(base, out, pts, 0, sdy, glow_rgb=(255, 252, 200), glow_amt=tw * 0.64)

            # 2. Glowing cyan-teal Norse runes surge sequentially across the forged hammer head!
            runes = not_outline & (b > 115) & (g > 130) & (g - r > 35)
            rys, rxs = np.where(runes)
            if len(rxs) > 0:
                diag_r = (xx - rxs.min()) * 0.72 - (yy - rys.max()) * 0.68
                dmin, dmax = float(diag_r[runes].min()), float(diag_r[runes].max())
                sweep_r = dmin - 6.0 + (f / float(NUM_FRAMES)) * (dmax - dmin + 14.0)
                rune_surge = np.exp(-((diag_r - sweep_r) ** 2) / (2.0 * 6.5**2))
                blend_rgb(out, runes, (242, 255, 255), np.clip(rune_surge * 0.90 + 0.14 * pulse01, 0.0, 0.92))

            # 3. Forged golden hammer end-caps catch a warm anvil glint!
            gold_caps = not_outline & (r > 150) & (g > 110) & (b < 95)
            cap_wave = np.exp(-(((dx_c + dy_c) - (-38.0 + (f / float(NUM_FRAMES)) * 84.0)) ** 2) / (2.0 * 6.0**2))
            blend_rgb(out, gold_caps, (255, 254, 222), cap_wave * 0.58)

        elif name == "icemage":
            # 1. Naturally detached floating ice shards gently levitate +-1px & sparkle!
            shard_comps = comps[1:]
            for pts in shard_comps:
                for y, x in pts:
                    out[y, x] = (0, 0, 0, 0)
            for idx, pts in enumerate(shard_comps):
                tw = 0.5 + 0.5 * math.sin(phase + idx * 1.05)
                sdy = -1 if tw > 0.72 else (1 if tw < 0.28 else 0)
                shift_component(base, out, pts, 0, sdy, glow_rgb=(240, 252, 255), glow_amt=tw * 0.62)

            # 2. Crystalline diamond prism sheen sweeps across the 5 ice spires & central snowflake!
            ice_crown = not_outline & (b > 120)
            sweep_x = -42.0 + (f / float(NUM_FRAMES)) * 92.0
            prism = np.exp(-(((dx_c + dy_c * 0.45) - sweep_x) ** 2) / (2.0 * 5.8**2))
            blend_rgb(out, ice_crown, (252, 255, 255), prism * 0.66)

            # 3. Sapphire gems pulse cold glacial azure-white
            sapphire = not_outline & (b > 165) & (r < 95) & (g < 145)
            blend_rgb(out, sapphire, (205, 246, 255), pulse01 * 0.55)

            # Crisp staggered diamond glints on crown spires across frames
            top_y = int(ys.min()) + 7
            if f in (3, 4):
                draw_pixel_star(out, int(round(cx)), top_y, 2, (255, 255, 255), (165, 243, 252))
            elif f == 1:
                draw_pixel_star(out, int(round(cx)) - 17, top_y + 10, 2, (255, 255, 255), (165, 243, 252))
            elif f == 6:
                draw_pixel_star(out, int(round(cx)) + 17, top_y + 10, 2, (255, 255, 255), (165, 243, 252))

        elif name == "android":
            # 1. Two naturally detached floating cyber funnel pods hover cleanly +-1px out of phase!
            pod_comps = comps[1:]
            for pts in pod_comps:
                for y, x in pts:
                    out[y, x] = (0, 0, 0, 0)
            for idx, pts in enumerate(pod_comps):
                p_wave = math.sin(phase + idx * math.pi)
                pdy = -1 if p_wave > 0.35 else (1 if p_wave < -0.35 else 0)
                shift_component(
                    base, out, pts, 0, pdy, glow_rgb=(175, 252, 255), glow_amt=0.12 + 0.30 * (0.5 + 0.5 * p_wave)
                )

            # 2. Crisp holographic cyan HUD scan-line sweeps top-to-bottom across the translucent visor!
            visor = not_outline & (np.abs(dx_c) < 20) & (dy_c > -10) & (dy_c < 22) & (b > 130) & (g > 130) & (g - r > 22)
            vys, _ = np.where(visor)
            if len(vys) > 0:
                vmin, vmax = float(vys.min()), float(vys.max())
                scan_y = vmin + (f / float(NUM_FRAMES)) * (vmax - vmin + 2.0)
                scan_band = np.exp(-((yy - scan_y) ** 2) / (2.0 * 1.45**2))
                blend_rgb(out, visor, (248, 255, 255), scan_band * 0.90)

            # 3. Hot-pink neon V-fin cyber accents pulse crisply!
            neon_pink = not_outline & (r > 175) & (b > 105) & (r - g > 65)
            blend_rgb(out, neon_pink, (255, 224, 248), pulse01 * 0.52)

        elif name == "nyx":
            # 1. Naturally detached neon wing-bits & 4 floating pixel hearts flutter/hover +-1px!
            float_comps = comps[1:]
            for pts in float_comps:
                for y, x in pts:
                    out[y, x] = (0, 0, 0, 0)
            for idx, pts in enumerate(float_comps):
                is_wing = len(pts) > 70
                if is_wing:
                    w_dy = [-1, -1, 0, 1, 1, 0, -1, 0][f]
                    shift_component(base, out, pts, 0, w_dy, glow_rgb=(215, 252, 255), glow_amt=0.10 + 0.18 * pulse01)
                else:
                    hw = 0.5 + 0.5 * math.sin(phase + idx * 1.55)
                    h_dy = -1 if hw > 0.66 else (1 if hw < 0.34 else 0)
                    shift_component(base, out, pts, 0, h_dy, glow_rgb=(255, 232, 248), glow_amt=hw * 0.45)

            # 2. Identify Cob's dark CRT glass screen area inside the cyan monitor bezel
            crt_dark = fg & (np.abs(dx_c) < 22) & (dy_c > -12) & (dy_c < 22) & (lum >= 26) & (lum <= 72) & (b >= r)
            dys, _ = np.where(crt_dark)
            if len(dys) > 0:
                smin, smax = float(dys.min()), float(dys.max())
                scan_y = smin + (f / float(NUM_FRAMES)) * (smax - smin)
                scan_glow = np.exp(-((yy - scan_y) ** 2) / (2.0 * 1.3**2))
                blend_rgb(out, crt_dark, (70, 138, 178), scan_glow * 0.45)

            # 3. Cob BLINKS ADORABLY on frames 5 & 6 — strictly isolating the TWO eye blobs (never the `w` mouth!)
            eyes_roi = fg & (np.abs(dx_c) < 16) & (dy_c > -10) & (dy_c < 10) & (b > 135) & (g > 145) & (g - r > 32)
            eye_blobs = [pts for pts in find_components(eyes_roi) if len(pts) >= 24][:2]
            if len(dys) > 0:
                screen_rgb = np.median(base[crt_dark, :3], axis=0).astype(np.uint8)
            else:
                screen_rgb = np.array([34, 41, 62], dtype=np.uint8)

            if f in (5, 6) and len(eye_blobs) == 2:
                # Clear ONLY the two tall glowing eyes (+1px outer eye-glow halo) cleanly back to flat CRT glass!
                for pts in eye_blobs:
                    exs = [px for _, px in pts]
                    eys = [py for py, _ in pts]
                    ex0, ex1 = min(exs), max(exs)
                    ey0, ey1 = min(eys), max(eys)
                    out[max(0, ey0 - 1) : min(H, ey1 + 2), max(0, ex0 - 1) : min(W, ex1 + 2), :3] = screen_rgb
                    ey_mid = int(round(np.mean(eys)))
                    # Cute kawaii pixel-art happy curved blink `^` (exact Cob cyan + ice-white highlight!)
                    for x in range(ex0 - 1, ex1 + 2):
                        is_edge = x == ex0 - 1 or x == ex1 + 1
                        ay = ey_mid + 1 if is_edge else ey_mid
                        if 0 <= ay < H and 0 <= x < W:
                            out[ay, x, :3] = (180, 253, 255) if not is_edge else (34, 211, 238)
                            out[ay, x, 3] = 255
                        if not is_edge and 0 <= ay + 1 < H:
                            out[ay + 1, x, :3] = (34, 211, 238)
                            out[ay + 1, x, 3] = 255
            else:
                eye_mask = np.zeros((H, W), dtype=bool)
                for pts in eye_blobs:
                    for py, px in pts:
                        eye_mask[py, px] = True
                blend_rgb(out, eye_mask, (225, 255, 255), pulse01 * 0.30)

            # 4. Cute pink blush + inner cat ears glow warmly when blinking / pulsing
            pink_blush = not_outline & (np.abs(dx_c) < 22) & (r > 165) & (r - g > 50)
            blush_amt = 0.45 if f in (5, 6) else 0.15 * pulse01
            blend_rgb(out, pink_blush, (255, 200, 232), blush_amt)

        frames.append(out)
    return frames


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
    bases = []
    all_names = []

    row = 0
    for plate_path, names in PLATES:
        im = Image.open(plate_path).convert("RGB")
        arr = np.array(im)
        quads = [(0, 512, 0, 512), (0, 512, 512, 1024), (512, 1024, 0, 512), (512, 1024, 512, 1024)]
        for name, (y0, y1, x0, x1) in zip(names, quads):
            q = arr[y0:y1, x0:x1]
            rgb100 = sample_native_100(q)
            base = extract_clean_rgba(rgb100, name)
            frames = build_8_frames(base, name)
            for f_idx, fr in enumerate(frames):
                sheet[row * CELL : (row + 1) * CELL, f_idx * CELL : (f_idx + 1) * CELL] = fr
            bases.append(base)
            all_names.append(name)

            # Audit metrics per champion
            fg = base[:, :, 3] > 0
            ys, xs = np.where(fg)
            r, g, b = base[:, :, 0].astype(int), base[:, :, 1].astype(int), base[:, :, 2].astype(int)
            rem_green = int(np.sum(fg & (g >= 180) & (g - r >= 65) & (g - b >= 85)))
            margin = min(int(xs.min()), int(ys.min()), CELL - 1 - int(xs.max()), CELL - 1 - int(ys.max()))
            ncomp = len(find_components(fg))
            # Measure frame-to-frame pixel delta to verify EVERY hero visibly animates!
            diffs = [int(np.sum(np.any(frames[i] != frames[(i + 1) % NUM_FRAMES], axis=2))) for i in range(NUM_FRAMES)]
            print(
                f"[{row:2d}] {name:13s} | size={xs.max()-xs.min()+1:2d}x{ys.max()-ys.min()+1:2d} "
                f"| margin={margin:2d}px | comps={ncomp:2d} | rem_neon={rem_green} | anim_px_delta={min(diffs)}..{max(diffs)}"
            )
            row += 1

    out_path = os.path.join(REPO_ROOT, "assets/sprites/ult_emblems_sheet.png")
    Image.fromarray(sheet, "RGBA").save(out_path, optimize=True)
    fsize_kb = os.path.getsize(out_path) / 1024.0
    print(f"\nSaved {out_path} ({sheet.shape[1]}x{sheet.shape[0]} RGBA, {fsize_kb:.1f} KB)")

    # Write QA Visual Sheets to scratch/
    scratch_dir = os.path.join(ARTIFACT_DIR, "scratch")
    os.makedirs(scratch_dir, exist_ok=True)

    # QA 1: All 12 Base Frames on BOTH Dark Gothic Navy AND Bright Magenta Checkerboard (2x zoom = 256px/cell)
    qa_cols, qa_rows = 4, 6  # rows 0..2 dark navy, rows 3..5 bright magenta
    qa1 = np.zeros((qa_rows * 256, qa_cols * 256, 3), dtype=np.uint8)
    chk_dark = make_checker(256, 256, (14, 18, 34), (24, 30, 52), tile=16)
    chk_mag = make_checker(256, 256, (215, 35, 195), (245, 75, 220), tile=16)
    for idx, base in enumerate(bases):
        up = np.array(Image.fromarray(base, "RGBA").resize((256, 256), Image.NEAREST))
        r_i, c_i = idx // 4, idx % 4
        qa1[r_i * 256 : (r_i + 1) * 256, c_i * 256 : (c_i + 1) * 256] = alpha_comp(chk_dark, up)
        qa1[(r_i + 3) * 256 : (r_i + 4) * 256, c_i * 256 : (c_i + 1) * 256] = alpha_comp(chk_mag, up)
    qa1_path = os.path.join(scratch_dir, "qa_ult_emblems_base_checker.png")
    Image.fromarray(qa1, "RGB").save(qa1_path)
    print(f"Saved QA Base Checker: {qa1_path}")

    # QA 2 & 3: Full 8-frame strips (heroes 0..5 & 6..11) on dark navy to inspect EVERY SINGLE ANIMATION FRAME!
    chk_strip = make_checker(CELL * NUM_FRAMES, CELL * 6, (10, 14, 28), (18, 24, 42), tile=16)
    for part, r_start in ((1, 0), (2, 6)):
        sub = sheet[r_start * CELL : (r_start + 6) * CELL, :, :]
        comp = alpha_comp(chk_strip, sub)
        p_out = os.path.join(scratch_dir, f"qa_ult_emblems_anim_p{part}.png")
        Image.fromarray(comp, "RGB").save(p_out)
        print(f"Saved QA Anim Strip {part}: {p_out}")


if __name__ == "__main__":
    main()
