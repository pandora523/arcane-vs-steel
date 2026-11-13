#!/usr/bin/env python3
"""
Builds the Giant Right-Side Colossal Boss HD-2D Multi-Part & VFX Atlas + Portrait for Adventure Mode Zone IV:
  - `assets/sprites/boss_colossus_sheet.png` (4096x1024 = 8 cols x 2 rows = 16 cells x 512x512, authored at 256x256 -> 2x NEAREST)
      Row 0 (Registered 256x256 Multi-Part Sovereign Body Rig pre-oriented facing -X LEFT for Right-Side Zone IV Throne):
        Cell (0,0) [sx=0,    sy=0]:   CALDERA_RIM    — Stationary Foreground Jagged Obsidian & Chained Throne Parapet Rim
        Cell (1,0) [sx=512,  sy=0]:   TORSO_HEART_A  — Headless & Pauldron-Free Ribcage + Normal Glowing Heart-Core (-X)
        Cell (2,0) [sx=1024, sy=0]:   TORSO_HEART_B  — Headless Ribcage + Surging/Expanded White-Gold Heart-Core (-X)
        Cell (3,0) [sx=1536, sy=0]:   TORSO_DYING    — Cracked Charred Ashen Ribcage & Shattered Core (-X)
        Cell (4,0) [sx=2048, sy=0]:   PAULDRON_REAR  — Far-Side Spiked Bronze-Obsidian Pauldron (-X)
        Cell (5,0) [sx=2560, sy=0]:   PAULDRON_FRONT — Near-Side Gothic Cathedral Arch Pauldron (-X)
        Cell (6,0) [sx=3072, sy=0]:   SKULL_UPPER    — Horned Demon Skull, Blazing Eyes, Upper Fangs & Hellfire Throat (-X)
        Cell (7,0) [sx=3584, sy=0]:   JAW_LOWER      — Articulated Lower Demon Mandible, Lower Fangs & Chin Spike (-X)
      Row 1 (Articulated Siege-Claws, Siege-Fists & Generated HD-2D Pixel-Art Boss VFX facing -X LEFT):
        Cell (0,1) [sx=0,    sy=512]: CLAW_OPEN        — Poised Open Siege-Claw (-X)
        Cell (1,1) [sx=512,  sy=512]: CLAW_FLEX        — Tensed / Raking / Ledge-Gripping Siege-Claw (-X)
        Cell (2,1) [sx=1024, sy=512]: FIST_CRUSH       — Vertical Runic Siege-Fist (-X)
        Cell (3,1) [sx=1536, sy=512]: FIST_METEOR      — Overcharged Meteoric Siege-Fist w/ Hellfire Shock-Crown (-X)
        Cell (4,1) [sx=2048, sy=512]: VFX_GEYSER_A     — Generated Volcanic Magma Geyser & Basalt Crater Frame A
        Cell (5,1) [sx=2560, sy=512]: VFX_GEYSER_B     — Generated Volcanic Magma Geyser & Basalt Crater Frame B
        Cell (6,1) [sx=3072, sy=512]: VFX_JAW_HELLFIRE — Generated Horizontal Hellfire Breath Torrent Cone (-X)
        Cell (7,1) [sx=3584, sy=512]: VFX_CLAW_SLASH   — Generated Colossal 3-Talon Molten Slash Wave (-X)
  - `assets/sprites/boss_archfiend_portrait.png` (128x128 NEAREST, MedianFilter(5) + 20-color FASTOCTREE)
  - `debug_colossal_boss_showcase.png` (mandatory visual audit sheet: all 16 cells + 5 composite pose previews)

Strictly follows `arcane-vs-steel-pipeline` Rules 1-4:
  - BFS border + enclosed white-pocket flood-fill + 3-pass anti-aliased fringe stripping (zero white halo)
  - Pre-downsample MedianFilter cel-flattening
  - Hand-crafted 20-color Obsidian / Bronze / Crimson / Molten-Gold Master Palette quantization (zero dithering)
  - Connected-component stray-crumb removal + interior pinhole fill + 2-pass cardinal orphan despeckling
  - Crisp 1px `#0d0f1c` selective outline (Selout) on every segmented part & VFX cell
  - Strict >= 8px transparent border margin in every 512x512 cell (>= 4px in 256x256, 0 border clips)
"""

import math
import os
from collections import Counter, deque
from PIL import Image, ImageDraw, ImageFilter

ARTIFACT_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/b9d8130e-8764-4ace-8d4e-40f97049d6f1"
REPO_DIR = "/home/antigravity/pandora523/arcane-vs-steel"

SRC_TORSO = os.path.join(ARTIFACT_DIR, "boss_colossus_torso_1794526244460.jpg")
SRC_CLAW = os.path.join(ARTIFACT_DIR, "boss_colossus_claw_1794526243762.jpg")
SRC_FIST = os.path.join(ARTIFACT_DIR, "boss_colossus_fist_v2_1794526470907.jpg")
SRC_PORTRAIT = os.path.join(ARTIFACT_DIR, "boss_colossus_portrait_1794526377107.jpg")
SRC_VFX_PACK = os.path.join(ARTIFACT_DIR, "boss_vfx_hd2d_pack_1794565156396.jpg")

OUT_SHEET = os.path.join(REPO_DIR, "assets/sprites/boss_colossus_sheet.png")
OUT_PORTRAIT = os.path.join(REPO_DIR, "assets/sprites/boss_archfiend_portrait.png")
DEBUG_OUT = os.path.join(ARTIFACT_DIR, "debug_colossal_boss_showcase.png")

SELOUT_RGB = (13, 15, 28)  # #0d0f1c
LOGICAL = 256

# Curated 20-Color Colossal Obsidian / Forged-Bronze / Hellfire-Magma Master Palette
MASTER_PALETTE = [
    SELOUT_RGB,        # 0: Deep Indigo-Black Selout
    (22, 20, 28),      # 1: Abyssal Obsidian Shadow
    (38, 35, 46),      # 2: Charred Basalt Dark
    (60, 55, 68),      # 3: Volcanic Iron Mid
    (88, 80, 94),      # 4: Horn / Skull Slate Light
    (122, 110, 122),   # 5: Bone / Fang Highlight
    (54, 34, 24),      # 6: Tarnished Bronze Shadow
    (92, 58, 34),      # 7: Forged Bronze Dark
    (138, 92, 48),     # 8: Cathedral Brass Mid
    (186, 134, 68),    # 9: Gilded Trim Light
    (224, 178, 102),   # 10: Burnished Gold Highlight
    (76, 12, 18),      # 11: Dried Magma Crust
    (128, 18, 22),     # 12: Deep Hellfire Crimson
    (184, 30, 24),     # 13: Blood-Magma Red
    (228, 56, 22),     # 14: Searing Vermilion
    (246, 98, 18),     # 15: Molten Lava Orange
    (252, 146, 34),    # 16: Blazing Solar Amber
    (253, 194, 56),    # 17: Incandescent Core Gold
    (254, 234, 124),   # 18: White-Gold Heart Flare
    (255, 252, 232),   # 19: Pure Core Brilliance
]


def nearest_palette_idx(r: int, g: int, b: int) -> int:
    best_i = 1
    best_d = 10**12
    for idx, (pr, pg, pb) in enumerate(MASTER_PALETTE):
        if idx == 0:
            if max(r, g, b) > 20:
                continue
        rmean = (r + pr) >> 1
        dr = r - pr
        dg = g - pg
        db = b - pb
        d = (((512 + rmean) * dr * dr) >> 8) + 4 * dg * dg + (((767 - rmean) * db * db) >> 8)
        if d < best_d:
            best_d = d
            best_i = idx
    return best_i


def interp_curve(pts: list[tuple[float, float]], x: float) -> float:
    if x <= pts[0][0]:
        return pts[0][1]
    if x >= pts[-1][0]:
        return pts[-1][1]
    for i in range(len(pts) - 1):
        x0, y0 = pts[i]
        x1, y1 = pts[i + 1]
        if x0 <= x <= x1:
            if x1 == x0:
                return y0
            t = (x - x0) / (x1 - x0)
            return y0 + (y1 - y0) * t
    return pts[-1][1]


def extract_clean_foreground(src_path: str) -> Image.Image:
    """BFS exterior & enclosed pure-white removal + 3-pass anti-aliased fringe stripping + cel-flattening."""
    im = Image.open(src_path).convert("RGBA")
    w, h = im.size
    px = im.load()

    bg = [[False] * w for _ in range(h)]
    q = deque()

    def is_white_bg(r: int, g: int, b: int) -> bool:
        if r > 224 and g > 224 and b > 224:
            return True
        mn = min(r, g, b)
        mx = max(r, g, b)
        return mn > 208 and (mx - mn) < 26

    for x in range(w):
        for y in (0, h - 1):
            r, g, b, _ = px[x, y]
            if is_white_bg(r, g, b) and not bg[y][x]:
                bg[y][x] = True
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            r, g, b, _ = px[x, y]
            if is_white_bg(r, g, b) and not bg[y][x]:
                bg[y][x] = True
                q.append((x, y))

    for y in range(2, h - 2, 2):
        for x in range(2, w - 2, 2):
            if bg[y][x]:
                continue
            r, g, b, _ = px[x, y]
            if r > 247 and g > 247 and b > 247:
                r2, g2, b2, _ = px[x + 1, y]
                r3, g3, b3, _ = px[x - 1, y]
                if min(r2, g2, b2) > 244 and min(r3, g3, b3) > 244:
                    bg[y][x] = True
                    q.append((x, y))

    while q:
        cx, cy = q.popleft()
        for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
            if 0 <= nx < w and 0 <= ny < h and not bg[ny][nx]:
                r, g, b, _ = px[nx, ny]
                if is_white_bg(r, g, b):
                    bg[ny][nx] = True
                    q.append((nx, ny))

    for y in range(h):
        for x in range(w):
            if bg[y][x]:
                px[x, y] = (0, 0, 0, 0)

    for _ in range(3):
        to_clear = []
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if a == 0:
                    continue
                adj_trans = False
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if nx < 0 or nx >= w or ny < 0 or ny >= h or px[nx, ny][3] == 0:
                        adj_trans = True
                        break
                if adj_trans:
                    mn = min(r, g, b)
                    mx = max(r, g, b)
                    if mn > 164 and (mx - mn) < 44:
                        to_clear.append((x, y))
        for x, y in to_clear:
            px[x, y] = (0, 0, 0, 0)

    rgb = Image.new("RGB", (w, h), (22, 20, 28))
    rgb.paste(im.convert("RGB"), mask=im.split()[3])
    rgb_flat = rgb.filter(ImageFilter.MedianFilter(size=5))
    alpha_flat = im.split()[3].filter(ImageFilter.MedianFilter(size=3))

    out = rgb_flat.convert("RGBA")
    out.putalpha(alpha_flat)
    return out


def prune_small_components(grid: list[list[int]], min_size: int = 12, keep_only_largest: bool = False) -> list[list[int]]:
    """Removes floating stray pixel crumbs so every cell has 0 floating artifacts."""
    h = len(grid)
    w = len(grid[0])
    seen = [[False] * w for _ in range(h)]
    comps: list[list[tuple[int, int]]] = []

    for y in range(h):
        for x in range(w):
            if grid[y][x] >= 0 and not seen[y][x]:
                q = deque([(x, y)])
                seen[y][x] = True
                comp = []
                while q:
                    cx, cy = q.popleft()
                    comp.append((cx, cy))
                    for nx, ny in (
                        (cx - 1, cy),
                        (cx + 1, cy),
                        (cx, cy - 1),
                        (cx, cy + 1),
                        (cx - 1, cy - 1),
                        (cx + 1, cy - 1),
                        (cx - 1, cy + 1),
                        (cx + 1, cy + 1),
                    ):
                        if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and grid[ny][nx] >= 0:
                            seen[ny][nx] = True
                            q.append((nx, ny))
                comps.append(comp)

    out = [[-1] * w for _ in range(h)]
    if not comps:
        return out
    if keep_only_largest:
        largest = max(comps, key=len)
        for cx, cy in largest:
            out[cy][cx] = grid[cy][cx]
        return out

    for comp in comps:
        if len(comp) >= min_size:
            for cx, cy in comp:
                out[cy][cx] = grid[cy][cx]
    return out


def finalize_grid_to_512(
    grid: list[list[int]],
    cell_label: str,
    min_comp_size: int = 14,
    keep_only_largest: bool = False,
    despeckle_passes: int = 2,
) -> Image.Image:
    """Applies crumb pruning, pinhole fill, 2-pass despeckling, 1px #0d0f1c Selout, margin audit, and 2x NEAREST -> 512x512."""
    # Enforce >= 6px safety margin in 256x256 (>= 12px in 512x512) before Selout
    for y in range(LOGICAL):
        for x in range(LOGICAL):
            if x < 5 or x >= LOGICAL - 5 or y < 5 or y >= LOGICAL - 5:
                grid[y][x] = -1

    grid = prune_small_components(grid, min_size=min_comp_size, keep_only_largest=keep_only_largest)

    # Interior 1px pinhole fill
    for y in range(1, LOGICAL - 1):
        for x in range(1, LOGICAL - 1):
            if grid[y][x] == -1:
                card = [grid[y - 1][x], grid[y + 1][x], grid[y][x - 1], grid[y][x + 1]]
                opaque = [c for c in card if c >= 0]
                if len(opaque) == 4:
                    grid[y][x] = Counter(opaque).most_common(1)[0][0]

    # 2-Pass Cardinal Orphan Despeckling (Rule 2)
    for _ in range(despeckle_passes):
        nxt = [row[:] for row in grid]
        for y in range(1, LOGICAL - 1):
            for x in range(1, LOGICAL - 1):
                c = grid[y][x]
                if c < 0 or c == 19:
                    continue
                card = [grid[y - 1][x], grid[y + 1][x], grid[y][x - 1], grid[y][x + 1]]
                opaque = [nc for nc in card if nc >= 0]
                if len(opaque) < 3:
                    continue
                same = sum(1 for nc in opaque if nc == c)
                if same == 0:
                    nxt[y][x] = Counter(opaque).most_common(1)[0][0]
                elif same == 1:
                    top_col, top_n = Counter(opaque).most_common(1)[0]
                    if top_col != c and top_n >= 3:
                        nxt[y][x] = top_col
        grid = nxt

    # Crisp 1px Dark Selective Outline (`Selout`, `#0d0f1c`) on silhouette edge pixels
    outlined = [row[:] for row in grid]
    for y in range(1, LOGICAL - 1):
        for x in range(1, LOGICAL - 1):
            if grid[y][x] >= 0:
                if (
                    grid[y - 1][x] < 0
                    or grid[y + 1][x] < 0
                    or grid[y][x - 1] < 0
                    or grid[y][x + 1] < 0
                ):
                    outlined[y][x] = 0

    logical_img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    lpx = logical_img.load()
    clip_violations = 0
    opaque_px = 0
    for y in range(LOGICAL):
        for x in range(LOGICAL):
            idx = outlined[y][x]
            if idx >= 0:
                opaque_px += 1
                if x < 4 or x >= LOGICAL - 4 or y < 4 or y >= LOGICAL - 4:
                    clip_violations += 1
                r, g, b = MASTER_PALETTE[idx]
                lpx[x, y] = (r, g, b, 255)

    assert opaque_px > 40, f"{cell_label} is nearly empty ({opaque_px} px)!"
    assert clip_violations == 0, f"{cell_label} had {clip_violations} margin clip pixels (<8px in 512x512)!"
    return logical_img.resize((512, 512), Image.Resampling.NEAREST)


def build_row0_segmented_torso_cells(torso_fg: Image.Image) -> list[tuple[str, Image.Image]]:
    """
    Segments `SRC_TORSO` (1024x1024) in ONE shared registered 256x256 coordinate frame (-> 512x512)
    so all 8 Row-0 parts register cleanly at `(torsoX, torsoY)` + independent animation offsets!
    """
    bbox = torso_fg.getbbox()
    assert bbox is not None
    bx0, by0, bx1, by1 = bbox
    cw, ch = bx1 - bx0, by1 - by0

    pad = 8
    avail = LOGICAL - pad * 2
    scale = min(avail / cw, avail / ch)
    tw = max(1, int(round(cw * scale)))
    th = max(1, int(round(ch * scale)))
    ox = (LOGICAL - tw) // 2
    oy = pad  # Top horn anchored at y=8, bottom crags at y=248 -> strict >= 16px margin in 512x512!

    cropped = torso_fg.crop(bbox)
    rgb_256 = cropped.convert("RGB").resize((tw, th), Image.Resampling.BILINEAR)
    a_256 = cropped.split()[3].resize((tw, th), Image.Resampling.NEAREST)
    rpx = rgb_256.load()
    apx = a_256.load()

    def to_src(lx: int, ly: int) -> tuple[float, float]:
        sx = bx0 + (lx - ox + 0.5) / scale
        sy = by0 + (ly - oy + 0.5) / scale
        return sx, sy

    def to_log(sx: float, sy: float) -> tuple[int, int]:
        lx = int(round(ox + (sx - bx0) * scale))
        ly = int(round(oy + (sy - by0) * scale))
        return lx, ly

    base_idx = [[-1] * LOGICAL for _ in range(LOGICAL)]
    base_rgb = [[(0, 0, 0)] * LOGICAL for _ in range(LOGICAL)]
    for y in range(th):
        for x in range(tw):
            if apx[x, y] >= 128:
                r, g, b = rpx[x, y]
                lx, ly = ox + x, oy + y
                base_idx[ly][lx] = nearest_palette_idx(r, g, b)
                base_rgb[ly][lx] = (r, g, b)

    # 1. Anatomical Seam Curves in 1024x1024 Source Coordinates
    caldera_top_pts = [
        (60, 710),
        (92, 526),
        (152, 632),
        (196, 560),
        (268, 684),
        (312, 678),
        (354, 758),
        (382, 718),
        (424, 810),
        (458, 754),
        (504, 834),
        (534, 790),
        (576, 852),
        (618, 792),
        (668, 840),
        (728, 722),
        (786, 772),
        (850, 620),
        (884, 662),
        (918, 574),
        (965, 748),
    ]

    # Jaw lower mandible polygon/bounds (`x_src: 502..638`)
    jaw_top_pts = [
        (500, 306),
        (534, 308),
        (552, 326),
        (575, 334),
        (608, 334),
        (638, 330),
    ]
    jaw_bot_pts = [
        (500, 356),
        (526, 376),
        (554, 392),
        (574, 405),
        (592, 396),
        (616, 382),
        (638, 368),
    ]

    # Upper skull bottom split (`x_src: 310..795`)
    skull_bot_pts = [
        (310, 268),
        (428, 268),
        (468, 286),
        (504, 304),
        (542, 302),
        (585, 301),
        (638, 300),
        (660, 293),
        (795, 293),
    ]

    # Left Cathedral Pauldron (`PAULDRON_FRONT`) inner/bottom seam
    pfront_right_pts = [
        (274, 380),
        (305, 434),
        (355, 442),
        (415, 444),
        (444, 440),
        (498, 432),
    ]
    pfront_bot_pts = [
        (134, 392),
        (158, 515),
        (215, 560),
        (295, 556),
        (358, 526),
        (415, 496),
        (444, 482),
    ]

    # Right Spiked Pauldron (`PAULDRON_REAR`) inner/bottom seam (leaves high gorget collar `sx < 704` attached to Torso!)
    prear_left_pts = [
        (294, 734),
        (356, 705),
        (416, 690),
        (478, 694),
        (540, 700),
    ]

    g_caldera = [[-1] * LOGICAL for _ in range(LOGICAL)]
    g_skull = [[-1] * LOGICAL for _ in range(LOGICAL)]
    g_jaw = [[-1] * LOGICAL for _ in range(LOGICAL)]
    g_pfront = [[-1] * LOGICAL for _ in range(LOGICAL)]
    g_prear = [[-1] * LOGICAL for _ in range(LOGICAL)]
    g_torso_a = [[-1] * LOGICAL for _ in range(LOGICAL)]

    for ly in range(LOGICAL):
        for lx in range(LOGICAL):
            c = base_idx[ly][lx]
            if c < 0:
                continue
            sx, sy = to_src(lx, ly)
            r, g, b = base_rgb[ly][lx]

            # A. CALDERA_RIM (Cell 0,0)
            if sy >= interp_curve(caldera_top_pts, sx):
                g_caldera[ly][lx] = c

            # B. SKULL_UPPER (Cell 6,0)
            in_skull = False
            if 312 <= sx <= 795 and sy <= interp_curve(skull_bot_pts, sx):
                # Exclude left pauldron spike (sx < 312) and pauldron top arch
                if not (sx < 430 and sy > 269):
                    in_skull = True
            if in_skull:
                g_skull[ly][lx] = c

            # C. JAW_LOWER (Cell 7,0)
            in_jaw = False
            if 502 <= sx <= 638:
                jy0 = interp_curve(jaw_top_pts, sx)
                jy1 = interp_curve(jaw_bot_pts, sx)
                if jy0 <= sy <= jy1:
                    # Exclude bright mouth fire above y=344 so lower jaw has crisp upward fangs!
                    is_upper_mouth_fire = sy < 344 and sx > 544 and r > 185 and g > 68 and b < 70
                    if not is_upper_mouth_fire:
                        in_jaw = True
            if in_jaw:
                g_jaw[ly][lx] = c

            # D. PAULDRON_FRONT (Cell 5,0 — Left Gothic Cathedral Arch Pauldron)
            in_pfront = False
            if 132 <= sx <= 444 and sy <= interp_curve(pfront_bot_pts, sx):
                if sx < 264 and sy >= 182:
                    # Tall curved left pauldron horn & outer spikes
                    if not (sx < 168 and sy > 512):
                        in_pfront = True
                elif sx >= 264 and sy >= 273 and sx <= interp_curve(pfront_right_pts, sy):
                    in_pfront = True
            if in_pfront and not in_skull:
                g_pfront[ly][lx] = c

            # E. PAULDRON_REAR (Cell 4,0 — Right Spiked Pauldron)
            in_prear = False
            if 686 <= sx <= 855 and 294 <= sy <= 540:
                if sx >= interp_curve(prear_left_pts, sy):
                    in_prear = True
            if in_prear and not in_skull:
                g_prear[ly][lx] = c

            # F. TORSO_HEART_A (Cell 1,0 — Ribcage, Magma Abs, Upper Arms, High Gorget Collar)
            in_caldera_outer_wing = (sx < 185 and sy > 522) or (sx > 835 and sy > 570) or sy > 915
            if not (in_skull or in_jaw or in_pfront or in_prear or in_caldera_outer_wing):
                g_torso_a[ly][lx] = c

    # --- Sculpt & Seal Anatomical Overlap Zones (ZERO GAPS during animation!) ---

    # 1) Solidify CALDERA_RIM base (`y_256 = 212..249`) inside natural rock silhouette (`x_256 = 34..222`)
    #    using organic faceted volcanic basalt blocks (zero diagonal stripe patterns, zero rectangular corners)
    rock_seeds = [
        (52, 232, 1), (74, 226, 2), (96, 236, 1), (118, 228, 3), (140, 235, 1),
        (164, 227, 2), (186, 234, 1), (204, 230, 2), (64, 244, 1), (108, 245, 2),
        (152, 244, 1), (192, 243, 2),
    ]
    for ly in range(210, 250):
        t_row = (ly - 210) / 39.0
        corner_taper = int(round(max(0.0, t_row - 0.55) * 26.0))
        x_min = 34 + corner_taper + ((ly * 5) % 3)
        x_max = 222 - corner_taper - ((ly * 7) % 3)
        for lx in range(x_min, x_max + 1):
            jag = int(round(1.5 + 1.5 * math.sin(lx * 0.31)))
            if ly > 246 + jag:
                continue
            if g_caldera[ly][lx] < 0:
                d1, c1 = 10**9, 1
                d2 = 10**9
                for sx_r, sy_r, col_r in rock_seeds:
                    d = (lx - sx_r) ** 2 + ((ly - sy_r) * 1.4) ** 2
                    if d < d1:
                        d2 = d1
                        d1, c1 = d, col_r
                    elif d < d2:
                        d2 = d
                if abs(math.sqrt(d2) - math.sqrt(d1)) < 1.15:
                    g_caldera[ly][lx] = 11 if (lx + ly) % 11 == 0 and ly < 242 else 1
                else:
                    g_caldera[ly][lx] = c1

    # 2) Paint Blazing Hellfire Throat Cavity inside `SKULL_UPPER` (`Cell 6,0`) just below upper fangs (`~14px` deep in 256x256)
    #    so whenever `JAW_LOWER` drops 4..26px in world space, the roaring mouth reveals fiery throat instead of empty space!
    mx0, my_fang = to_log(538, 299)
    mx1, _ = to_log(628, 299)
    for dy in range(0, 15):
        ly = my_fang + dy
        t_d = dy / 14.0
        taper = int(round(t_d * 3.2))
        lx_start = mx0 + taper
        lx_end = mx1 - taper
        for lx in range(lx_start, lx_end + 1):
            existing = g_skull[ly][lx]
            if dy <= 4 and existing in (3, 4, 5, 8, 9, 10):
                continue
            u = abs((lx - 0.5 * (lx_start + lx_end)) / max(1.0, 0.5 * (lx_end - lx_start)))
            heat = (1.0 - u * 0.85) * (1.0 - t_d * 0.32)
            if heat > 0.76:
                g_skull[ly][lx] = 18
            elif heat > 0.58:
                g_skull[ly][lx] = 17
            elif heat > 0.42:
                g_skull[ly][lx] = 16
            elif heat > 0.26:
                g_skull[ly][lx] = 14
            elif heat > 0.14:
                g_skull[ly][lx] = 12
            else:
                g_skull[ly][lx] = 1

    # Sculpt crisp bone-white/slate lower fangs on the top rim of `JAW_LOWER` (`Cell 7,0`)
    for fang_sx in (560, 576, 594, 610, 624):
        fx, fy = to_log(fang_sx, 336)
        if 8 <= fx < LOGICAL - 8 and 8 <= fy < LOGICAL - 8:
            g_jaw[fy][fx] = 5
            g_jaw[fy + 1][fx] = 4
            if g_jaw[fy + 2][fx] < 0:
                g_jaw[fy + 2][fx] = 3

    # 3) Organic 8px Morphological Socket & Neck Cushion on `g_torso_a`:
    #    Grow `g_torso_a` smoothly by 8px (16px in 512x512) strictly inside the 4px-eroded interior of
    #    `(SKULL_UPPER | JAW_LOWER | PAULDRON_FRONT | PAULDRON_REAR)` — 100% curved, zero rectangular corners, zero gaps!
    moving_union = [
        [
            (g_torso_a[y][x] >= 0 or g_skull[y][x] >= 0 or g_jaw[y][x] >= 0 or g_pfront[y][x] >= 0 or g_prear[y][x] >= 0)
            for x in range(LOGICAL)
        ]
        for y in range(LOGICAL)
    ]
    for _ in range(4):
        nxt_u = [[False] * LOGICAL for _ in range(LOGICAL)]
        for y in range(1, LOGICAL - 1):
            for x in range(1, LOGICAL - 1):
                if (
                    moving_union[y][x]
                    and moving_union[y - 1][x]
                    and moving_union[y + 1][x]
                    and moving_union[y][x - 1]
                    and moving_union[y][x + 1]
                ):
                    nxt_u[y][x] = True
        moving_union = nxt_u

    for step in range(8):
        grown = [row[:] for row in g_torso_a]
        for y in range(6, LOGICAL - 6):
            for x in range(6, LOGICAL - 6):
                if g_torso_a[y][x] < 0 and moving_union[y][x]:
                    if (
                        g_torso_a[y - 1][x] >= 0
                        or g_torso_a[y + 1][x] >= 0
                        or g_torso_a[y][x - 1] >= 0
                        or g_torso_a[y][x + 1] >= 0
                    ):
                        # Add subtle glowing magma neck artery inside neck column (`124 <= x <= 148, y < 96`)
                        if 126 <= x <= 146 and y < 96 and abs(x - 136) <= 1 and (y % 3 != 0):
                            grown[y][x] = 14 if (y % 2 == 0) else 12
                        else:
                            grown[y][x] = 2 if ((x + y + step) % 4 == 0) else 1
        g_torso_a = grown

    # --- Derive `TORSO_HEART_B` (Cell 2,0 — Surging Expanded White-Gold Heart-Core) ---
    g_torso_b = [row[:] for row in g_torso_a]
    h_cx, h_cy = to_log(592, 558)  # Exact ribcage molten heart-core center!
    for ly in range(LOGICAL):
        for lx in range(LOGICAL):
            c = g_torso_b[ly][lx]
            if c < 0:
                continue
            dist_h = math.hypot((lx - h_cx) * 1.0, (ly - h_cy) * 0.92)
            # Surge ribcage magma veins (+1..+2 steps warmer)
            if 11 <= c <= 18:
                boost = 2 if dist_h < 34 else 1
                g_torso_b[ly][lx] = min(19, c + boost)
            # Expand blazing white-gold heart-core flare in center of ribcage!
            if dist_h <= 8.2:
                g_torso_b[ly][lx] = 19
            elif dist_h <= 12.8 and c >= 6:
                g_torso_b[ly][lx] = max(g_torso_b[ly][lx], 18)
            elif dist_h <= 17.5 and c >= 6:
                g_torso_b[ly][lx] = max(g_torso_b[ly][lx], 16)

    # --- Derive `TORSO_DYING` (Cell 3,0 — Cracked Charred Ashen Ribcage & Shattered Core) ---
    g_torso_dying = [[-1] * LOGICAL for _ in range(LOGICAL)]
    for ly in range(LOGICAL):
        for lx in range(LOGICAL):
            c = g_torso_a[ly][lx]
            if c < 0:
                continue
            # Cool bronze & bright lava into charred volcanic basalt & dying crimson embers
            if c in (6, 7):
                nc = 2
            elif c in (8, 9):
                nc = 3
            elif c == 10:
                nc = 4
            elif c in (11, 12):
                nc = 1
            elif c in (13, 14):
                nc = 11
            elif c in (15, 16):
                nc = 12
            elif c >= 17:
                nc = 13
            else:
                nc = c
            g_torso_dying[ly][lx] = nc

    # Carve jagged dark abyssal fracture cracks radiating from the shattered Heart-Core `(h_cx, h_cy)`
    crack_rays = [
        (-0.85, -0.52, 34),
        (0.82, -0.56, 30),
        (-0.92, 0.36, 32),
        (0.88, 0.42, 28),
        (0.06, -0.98, 28),
        (-0.14, 0.98, 38),
    ]
    for rdx, rdy, rlen in crack_rays:
        for step in range(rlen):
            jitter = math.sin(step * 0.75 + rdx * 5.0) * 1.6
            px_x = int(round(h_cx + rdx * step - rdy * jitter))
            px_y = int(round(h_cy + rdy * step + rdx * jitter))
            if 6 <= px_x < LOGICAL - 6 and 6 <= px_y < LOGICAL - 6:
                if g_torso_dying[px_y][px_x] >= 0:
                    g_torso_dying[px_y][px_x] = 0 if step > 4 else 1
                if step % 3 == 0 and g_torso_dying[px_y][px_x + 1] >= 0:
                    g_torso_dying[px_y][px_x + 1] = 13 if step < 12 else 11

    def flip_h(g: list[list[int]]) -> list[list[int]]:
        return [row[::-1] for row in g]

    g_caldera_hd2d = build_generated_throne_rim_grid()

    return [
        ("R0C0: CALDERA_RIM", finalize_grid_to_512(g_caldera_hd2d, "CALDERA_RIM", min_comp_size=18, keep_only_largest=True)),
        ("R0C1: TORSO_HEART_A", finalize_grid_to_512(flip_h(g_torso_a), "TORSO_HEART_A", min_comp_size=20, keep_only_largest=True)),
        ("R0C2: TORSO_HEART_B", finalize_grid_to_512(flip_h(g_torso_b), "TORSO_HEART_B", min_comp_size=20, keep_only_largest=True)),
        ("R0C3: TORSO_DYING", finalize_grid_to_512(flip_h(g_torso_dying), "TORSO_DYING", min_comp_size=20, keep_only_largest=True)),
        ("R0C4: PAULDRON_REAR", finalize_grid_to_512(flip_h(g_prear), "PAULDRON_REAR", min_comp_size=14, keep_only_largest=True)),
        ("R0C5: PAULDRON_FRONT", finalize_grid_to_512(flip_h(g_pfront), "PAULDRON_FRONT", min_comp_size=16, keep_only_largest=True)),
        ("R0C6: SKULL_UPPER", finalize_grid_to_512(flip_h(g_skull), "SKULL_UPPER", min_comp_size=16, keep_only_largest=True)),
        ("R0C7: JAW_LOWER", finalize_grid_to_512(flip_h(g_jaw), "JAW_LOWER", min_comp_size=10, keep_only_largest=True)),
    ]


def extract_vfx_quad_foreground(quad_img: Image.Image) -> Image.Image:
    """
    Extracts a generated VFX / Throne Rim quadrant on pure `#FFFFFF` white background while
    preserving 100% of interior incandescent white-yellow fire cores (`r=255, g=255, b=240+`)!
    Only exterior white connected to the quadrant's outer borders (+ low-chroma white fringe) is cleared.
    """
    im = quad_img.convert("RGBA")
    w, h = im.size
    px = im.load()

    bg = [[False] * w for _ in range(h)]
    q = deque()

    def is_exterior_white(r: int, g: int, b: int) -> bool:
        mn = min(r, g, b)
        mx = max(r, g, b)
        return (r > 232 and g > 232 and b > 232 and (mx - mn) <= 18) or (mn > 218 and (mx - mn) <= 14)

    for x in range(w):
        for y in (0, h - 1):
            r, g, b, _ = px[x, y]
            if is_exterior_white(r, g, b) and not bg[y][x]:
                bg[y][x] = True
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            r, g, b, _ = px[x, y]
            if is_exterior_white(r, g, b) and not bg[y][x]:
                bg[y][x] = True
                q.append((x, y))

    while q:
        cx, cy = q.popleft()
        for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
            if 0 <= nx < w and 0 <= ny < h and not bg[ny][nx]:
                r, g, b, _ = px[nx, ny]
                if is_exterior_white(r, g, b):
                    bg[ny][nx] = True
                    q.append((nx, ny))

    for y in range(h):
        for x in range(w):
            if bg[y][x]:
                px[x, y] = (0, 0, 0, 0)

    # 3-pass anti-aliased neutral-gray/white outer fringe strip (never strips saturated yellow/orange!)
    for _ in range(3):
        to_clear = []
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if a == 0:
                    continue
                adj_trans = False
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if nx < 0 or nx >= w or ny < 0 or ny >= h or px[nx, ny][3] == 0:
                        adj_trans = True
                        break
                if adj_trans:
                    mn = min(r, g, b)
                    mx = max(r, g, b)
                    if mn > 175 and (mx - mn) < 32:
                        to_clear.append((x, y))
        for x, y in to_clear:
            px[x, y] = (0, 0, 0, 0)

    rgb = Image.new("RGB", (w, h), (22, 20, 28))
    rgb.paste(im.convert("RGB"), mask=im.split()[3])
    rgb_flat = rgb.filter(ImageFilter.MedianFilter(size=3))
    alpha_flat = im.split()[3].filter(ImageFilter.MedianFilter(size=3))
    out = rgb_flat.convert("RGBA")
    out.putalpha(alpha_flat)
    return out


def _get_vfx_pack_quad(row: int, col: int) -> Image.Image:
    pack = Image.open(SRC_VFX_PACK).convert("RGB")
    w, h = pack.size
    mw, mh = w // 2, h // 2
    return pack.crop((col * mw, row * mh, (col + 1) * mw, (row + 1) * mh))


def build_generated_throne_rim_grid() -> list[list[int]]:
    """
    Converts Bottom-Right quadrant of `boss_vfx_hd2d_pack` (Jagged Dark-Obsidian Chained Fortress
    Pit Parapet Rim with glowing molten lava fissures) into `CALDERA_RIM` (`Cell 0,0`, `256x256` -> `512x512`).
    """
    fg = extract_vfx_quad_foreground(_get_vfx_pack_quad(1, 1))
    bbox = fg.getbbox()
    assert bbox is not None
    cropped = fg.crop(bbox)
    tw, th = 224, 122
    rgb_s = cropped.convert("RGB").resize((tw, th), Image.Resampling.BILINEAR)
    a_s = cropped.split()[3].resize((tw, th), Image.Resampling.NEAREST)

    ox = (LOGICAL - tw) // 2
    oy = 248 - th  # Bottom sits cleanly at `y = 248` (>= 16px margin in 512x512!)
    grid = [[-1] * LOGICAL for _ in range(LOGICAL)]
    rpx = rgb_s.load()
    apx = a_s.load()
    for y in range(th):
        for x in range(tw):
            if apx[x, y] >= 120:
                r, g, b = rpx[x, y]
                grid[oy + y][ox + x] = nearest_palette_idx(r, g, b)

    # Carve a dramatic recessed inner pit notch along the flat top plateau (`y_256 = 126..164, x_256 = 56..200`)
    # so the outer basalt spikes & iron chains frame Malphas's chest/waist without a flat tabletop behind him!
    for lx in range(54, 202):
        u = abs(lx - 128.0) / 74.0
        # Keep tall jagged crags on left/right (`u > 0.72`) and lower jagged parapet teeth across the center (`y ~ 166..178`)
        if u < 0.88:
            tooth = 7.0 * math.sin(lx * 0.24) + 4.5 * math.cos(lx * 0.53)
            dip = (1.0 - (u / 0.88) ** 2) * 34.0
            rim_lip_y = int(round(138.0 + dip + tooth))
            for ly in range(120, min(LOGICAL - 12, rim_lip_y)):
                grid[ly][lx] = -1
            # Highlight newly carved inner parapet teeth with molten rim ember / basalt highlight
            if 8 <= rim_lip_y < LOGICAL - 12 and grid[rim_lip_y][lx] >= 0:
                grid[rim_lip_y][lx] = 14 if (lx % 9 in (0, 1)) else 3

    # Ensure solid dark obsidian base along `y = 216..246` inside `[40..216]` so chasm clipping has zero leaks!
    for ly in range(216, 247):
        t_row = (ly - 216) / 30.0
        taper = int(round(t_row * 22.0))
        x0 = 42 + taper + ((ly * 3) % 3)
        x1 = 214 - taper - ((ly * 5) % 3)
        for lx in range(x0, x1 + 1):
            if grid[ly][lx] < 0:
                grid[ly][lx] = 1 if ((lx + ly) % 5 != 0) else 2

    return grid


def fg_to_logical_grid(fg_rgba: Image.Image, pad: int = 12) -> list[list[int]]:
    bbox = fg_rgba.getbbox()
    assert bbox is not None
    cropped = fg_rgba.crop(bbox)
    cw, ch = cropped.size
    avail = LOGICAL - pad * 2
    scale = min(avail / cw, avail / ch)
    tw = max(1, int(round(cw * scale)))
    th = max(1, int(round(ch * scale)))

    rgb_crop = cropped.convert("RGB").resize((tw, th), Image.Resampling.BILINEAR)
    a_crop = cropped.split()[3].resize((tw, th), Image.Resampling.NEAREST)
    ox = (LOGICAL - tw) // 2
    oy = (LOGICAL - th) // 2

    grid = [[-1] * LOGICAL for _ in range(LOGICAL)]
    rpx = rgb_crop.load()
    apx = a_crop.load()
    for y in range(th):
        for x in range(tw):
            if apx[x, y] >= 128:
                r, g, b = rpx[x, y]
                grid[oy + y][ox + x] = nearest_palette_idx(r, g, b)
    return grid


def build_claw_flex_grid(claw_open_grid: list[list[int]]) -> list[list[int]]:
    """Articulates the Siege-Claw fingers downward/inward for raking & parapet-gripping + molten knuckle/talon glow."""
    flex = [[-1] * LOGICAL for _ in range(LOGICAL)]
    knuckle_x = 132
    for y in range(LOGICAL):
        for x in range(LOGICAL):
            c = claw_open_grid[y][x]
            if c < 0:
                continue
            if x <= knuckle_x:
                nc = min(18, c + 1) if 12 <= c <= 16 else c
                flex[y][x] = nc
            else:
                u = (x - knuckle_x) / 110.0
                dy = int(round((u ** 1.38) * 18.0))
                dx = -int(round((u ** 1.65) * 8.0))
                nx = x + dx
                ny = y + dy
                if 6 <= nx < LOGICAL - 6 and 6 <= ny < LOGICAL - 6:
                    nc = c
                    if 11 <= c <= 17:
                        nc = min(18, c + 2)
                    elif u > 0.62 and c in (4, 5, 9, 10):
                        nc = 17 if u > 0.80 else 15
                    flex[ny][nx] = max(flex[ny][nx], nc)

    for _ in range(2):
        patched = [row[:] for row in flex]
        for y in range(6, LOGICAL - 6):
            for x in range(knuckle_x - 2, LOGICAL - 6):
                if flex[y][x] < 0:
                    nb = [flex[y - 1][x], flex[y + 1][x], flex[y][x - 1], flex[y][x + 1]]
                    op = [v for v in nb if v >= 0]
                    if len(op) >= 3:
                        patched[y][x] = Counter(op).most_common(1)[0][0]
        flex = patched
    return flex


def build_fist_meteor_grid(fist_base_grid: list[list[int]]) -> list[list[int]]:
    """Builds `FIST_METEOR` (`Cell 3,1`): Overcharged Siege-Fist w/ blazing pixel-art magma crown & white-gold runes."""
    met = [[-1] * LOGICAL for _ in range(LOGICAL)]
    min_x, max_x, max_y = LOGICAL, 0, 0
    for y in range(LOGICAL):
        for x in range(LOGICAL):
            c = fist_base_grid[y][x]
            if c < 0:
                continue
            ny = max(8, y - 6)
            nc = c
            if 11 <= c <= 17:
                nc = min(19, c + 3)
            elif c in (9, 10) and ny > 155:
                nc = 17
            met[ny][x] = nc
            min_x = min(min_x, x)
            max_x = max(max_x, x)
            max_y = max(max_y, ny)

    cx_mid = 0.5 * (min_x + max_x)
    half_w = max(24.0, 0.5 * (max_x - min_x))
    for y in range(72, min(LOGICAL - 8, max_y + 12)):
        v = (y - 72) / max(1.0, (max_y + 10 - 72))
        crown_w = half_w + 6 + v * 18 + math.sin(y * 0.34) * 4.5
        for x in range(max(8, int(cx_mid - crown_w - 6)), min(LOGICAL - 8, int(cx_mid + crown_w + 7))):
            if met[y][x] >= 0:
                if y > max_y - 16 and met[y][x] in (1, 2, 3, 6, 7, 8):
                    if (x + y) % 2 == 0 or y > max_y - 9:
                        met[y][x] = 16 if y < max_y - 7 else 18
                continue

            dx_norm = abs(x - cx_mid) / max(1.0, crown_w)
            tongue = 0.16 * math.sin(x * 0.42 + y * 0.18) + 0.11 * math.cos(x * 0.77 - y * 0.27)
            in_bottom_bow = y >= max_y - 18 and dx_norm + tongue * 0.55 < 1.02 - max(0.0, (y - max_y) * 0.045)
            in_side_plume = v > 0.18 and 0.64 < dx_norm < (1.02 - (1.0 - v) * 0.22 + tongue)
            if in_bottom_bow or in_side_plume:
                heat = v * (1.12 - dx_norm * 0.72) + tongue * 0.4
                if y >= max_y - 6 and dx_norm < 0.58:
                    met[y][x] = 19
                elif heat > 0.72:
                    met[y][x] = 18
                elif heat > 0.56:
                    met[y][x] = 17
                elif heat > 0.42:
                    met[y][x] = 16
                elif heat > 0.28:
                    met[y][x] = 15
                elif heat > 0.16:
                    met[y][x] = 14
                else:
                    met[y][x] = 12
    return met


def build_vfx_geyser_grid(variant: int) -> list[list[int]]:
    """
    Converts Bottom-Left quadrant of `boss_vfx_hd2d_pack` (Generated Towering Volcanic Magma Geyser
    Pillar & Shattered Black-Basalt Crater Rim) into `VFX_GEYSER_A` (`variant=0`) and animated surge
    `VFX_GEYSER_B` (`variant=1`), tapering the top edge into natural roaring flame tongues (`>= 16px` margin).
    """
    fg = extract_vfx_quad_foreground(_get_vfx_pack_quad(1, 0))
    if variant == 1:
        fg = fg.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    bbox = fg.getbbox()
    assert bbox is not None
    cropped = fg.crop(bbox)
    cw, ch = cropped.size
    pad_top = 10 if variant == 0 else 8
    pad_bot = 10
    th = LOGICAL - pad_top - pad_bot
    scale = min((LOGICAL - 24) / cw, th / ch)
    tw = max(16, int(round(cw * scale * (1.06 if variant == 1 else 1.0))))
    th_actual = max(16, int(round(ch * scale)))

    rgb_s = cropped.convert("RGB").resize((tw, th_actual), Image.Resampling.BILINEAR)
    a_s = cropped.split()[3].resize((tw, th_actual), Image.Resampling.NEAREST)
    ox = (LOGICAL - tw) // 2
    oy = LOGICAL - pad_bot - th_actual

    grid = [[-1] * LOGICAL for _ in range(LOGICAL)]
    rpx = rgb_s.load()
    apx = a_s.load()
    for y in range(th_actual):
        for x in range(tw):
            if apx[x, y] >= 116:
                r, g, b = rpx[x, y]
                idx = nearest_palette_idx(r, g, b)
                if variant == 1 and 13 <= idx <= 18:
                    idx = min(19, idx + 1)
                grid[oy + y][ox + x] = idx

    # Sculpt top `26px` (`oy .. oy + 26`) into natural pointed roaring flame crown tongues (zero flat crop bar!)
    phase = 0.0 if variant == 0 else 1.85
    for lx in range(ox, ox + tw):
        dx_center = abs(lx - 128.0) / max(1.0, tw * 0.34)
        crown_cut = int(round(dx_center * 18.0 + (0.5 + 0.5 * math.sin(lx * 0.36 + phase)) * 11.0))
        top_keep_y = oy + crown_cut
        for ly in range(0, min(LOGICAL, top_keep_y)):
            grid[ly][lx] = -1
        if 8 <= top_keep_y < LOGICAL - 8 and grid[top_keep_y][lx] >= 15:
            grid[top_keep_y][lx] = 14
            if top_keep_y + 1 < LOGICAL - 8 and grid[top_keep_y + 1][lx] >= 16:
                grid[top_keep_y + 1][lx] = 15

    return grid


def build_vfx_jaw_hellfire_grid() -> list[list[int]]:
    """
    Converts Top-Left quadrant of `boss_vfx_hd2d_pack` (Generated Roaring Horizontal Hellfire
    Dragon-Breath Torrent Cone: incandescent white-yellow mouth blast on the RIGHT flaring into
    orange-crimson flames & dark obsidian smoke toward the LEFT `-X`) into `VFX_JAW_HELLFIRE` (`Cell 6,1`).
    """
    fg = extract_vfx_quad_foreground(_get_vfx_pack_quad(0, 0))
    bbox = fg.getbbox()
    assert bbox is not None
    cropped = fg.crop(bbox)
    cw, ch = cropped.size
    avail = LOGICAL - 20
    scale = min(avail / cw, avail / ch)
    tw = max(16, int(round(cw * scale)))
    th = max(16, int(round(ch * scale)))

    rgb_s = cropped.convert("RGB").resize((tw, th), Image.Resampling.BILINEAR)
    a_s = cropped.split()[3].resize((tw, th), Image.Resampling.NEAREST)
    ox = LOGICAL - 10 - tw  # Right side (`x ~ 246`) sits right at Malphas's roaring jaws!
    oy = (LOGICAL - th) // 2

    grid = [[-1] * LOGICAL for _ in range(LOGICAL)]
    rpx = rgb_s.load()
    apx = a_s.load()
    for y in range(th):
        for x in range(tw):
            if apx[x, y] >= 116:
                r, g, b = rpx[x, y]
                grid[oy + y][ox + x] = nearest_palette_idx(r, g, b)

    # Sculpt the left smoke-billow edge (`ox .. ox + 26`, where raw art touched `x=0`) into organic rounded smoke/flame curls!
    cy_mid = oy + th * 0.5
    for ly in range(oy, oy + th):
        dy_norm = abs(ly - cy_mid) / max(1.0, th * 0.5)
        billow = int(round((dy_norm ** 1.35) * 20.0 + (0.5 + 0.5 * math.sin(ly * 0.29)) * 10.0))
        left_keep_x = ox + billow
        for lx in range(0, min(LOGICAL, left_keep_x)):
            grid[ly][lx] = -1

    return grid


def build_vfx_claw_slash_grid() -> list[list[int]]:
    """
    Converts Top-Right quadrant of `boss_vfx_hd2d_pack` (Generated Colossal Triple-Talon Molten
    Demon-Claw Slash Wave) and mirrors horizontally so all 3 blazing gold-crimson-orange talon
    crescents sweep LEFTWARD (`-X`) across the arena (`Cell 7,1`).
    """
    fg = extract_vfx_quad_foreground(_get_vfx_pack_quad(0, 1)).transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    return fg_to_logical_grid(fg, pad=10)


def build_portrait_128(src_path: str) -> Image.Image:
    """Rule 2 HUD Portrait pipeline: MedianFilter(size=5) + 20-color FASTOCTREE (dither=NONE) -> 128x128 NEAREST."""
    im = Image.open(src_path).convert("RGB").transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    w, h = im.size
    crop_box = (int(w * 0.08), int(h * 0.02), int(w * 0.92), int(h * 0.86))
    im = im.crop(crop_box).filter(ImageFilter.MedianFilter(size=5))
    im_128 = im.resize((128, 128), Image.Resampling.NEAREST)
    quant = im_128.quantize(colors=20, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    return quant.convert("RGBA")


def composite_boss_pose(
    row0: list[Image.Image],
    row1: list[Image.Image],
    mode: str,
) -> Image.Image:
    """Renders an authentic clipped multi-part RIGHT-SIDE (`-X` facing) boss composite preview (340x360) for visual audit."""
    canvas = Image.new("RGBA", (340, 360), (16, 10, 18, 255))
    draw = ImageDraw.Draw(canvas)
    rim_y_bot = 316
    draw.rectangle([0, 0, 339, rim_y_bot], fill=(20, 11, 18, 255))
    draw.rectangle([0, rim_y_bot + 1, 339, 359], fill=(38, 28, 36, 255))
    draw.line([(0, rim_y_bot), (339, rim_y_bot)], fill=(120, 38, 32, 255), width=2)

    caldera_rim, torso_a, torso_b, torso_dying, p_rear, p_front, skull, jaw = [
        im.resize((260, 260), Image.Resampling.NEAREST) for im in row0
    ]
    claw_open, claw_flex, _, _, geyser_a, geyser_b, vfx_hellfire, vfx_slash = row1

    base_x = 68  # Seated on the RIGHT side facing LEFT (`-X`)!
    base_y = rim_y_bot - 252  # 64

    rise_y = 0
    torso_img = torso_a
    jaw_drop = 2
    skull_dx, skull_dy = 0, 0
    pf_dy, pr_dy = 0, 0
    slump_x, slump_y = 0, 0

    if mode == "APPEAR":
        rise_y = 92
        torso_img = torso_b
        jaw_drop = 12
        skull_dy = -3
        pf_dy, pr_dy = -5, -4
    elif mode == "IDLE":
        torso_img = torso_a
        jaw_drop = 3
    elif mode == "ROAR":
        torso_img = torso_b
        jaw_drop = 16
        skull_dx, skull_dy = -8, -3
        pf_dy, pr_dy = -7, -6
    elif mode == "CORE":
        torso_img = torso_b
        slump_x, slump_y = -12, 16
        jaw_drop = 9
        pf_dy, pr_dy = 8, 8
    elif mode == "DEATH":
        rise_y = 112
        torso_img = torso_dying
        jaw_drop = 16
        skull_dx, skull_dy = 4, -6
        pf_dy, pr_dy = 12, 10

    body_layer = Image.new("RGBA", (340, 360), (0, 0, 0, 0))
    tx = base_x + slump_x
    ty = base_y + slump_y + rise_y

    if mode in ("APPEAR", "DEATH"):
        gey = (geyser_b if mode == "APPEAR" else geyser_a).resize((210, 210), Image.Resampling.NEAREST)
        body_layer.alpha_composite(gey, (base_x + 24, rim_y_bot - 196))

    # Rear claw reaching LEFT (`-X`)
    rc_src = claw_flex if mode in ("APPEAR", "ROAR", "DEATH") else claw_open
    rc = rc_src.resize((128, 128), Image.Resampling.NEAREST)
    rc_y = (rim_y_bot - 96) if mode == "APPEAR" else (ty + 78)
    body_layer.alpha_composite(rc, (tx - 8, rc_y))

    body_layer.alpha_composite(p_rear, (tx, ty + pr_dy))
    body_layer.alpha_composite(torso_img, (tx, ty))
    body_layer.alpha_composite(skull, (tx + skull_dx, ty + skull_dy))
    body_layer.alpha_composite(jaw, (tx + skull_dx, ty + skull_dy + jaw_drop))
    body_layer.alpha_composite(p_front, (tx, ty + pf_dy))

    clip_mask = Image.new("L", (340, 360), 0)
    ImageDraw.Draw(clip_mask).rectangle([0, 0, 339, rim_y_bot - 8], fill=255)
    clipped_body = Image.new("RGBA", (340, 360), (0, 0, 0, 0))
    clipped_body.paste(body_layer, (0, 0), mask=clip_mask)
    canvas.alpha_composite(clipped_body)

    # Stationary foreground Throne Parapet Rim (`CALDERA_RIM`)
    canvas.alpha_composite(caldera_rim, (base_x, base_y))

    if mode == "ROAR":
        hf = vfx_hellfire.resize((172, 172), Image.Resampling.NEAREST)
        canvas.alpha_composite(hf, (max(0, tx + skull_dx - 54), ty + skull_dy - 4))
        fc = claw_flex.resize((138, 138), Image.Resampling.NEAREST)
        canvas.alpha_composite(fc, (tx + 2, rim_y_bot - 92))
    elif mode == "APPEAR":
        fc = claw_flex.resize((142, 142), Image.Resampling.NEAREST)
        canvas.alpha_composite(fc, (base_x + 4, rim_y_bot - 96))
    elif mode == "DEATH":
        fc = claw_flex.resize((136, 136), Image.Resampling.NEAREST)
        fc_layer = Image.new("RGBA", (340, 360), (0, 0, 0, 0))
        fc_layer.alpha_composite(fc, (base_x + 12, rim_y_bot - 58))
        fc_clipped = Image.new("RGBA", (340, 360), (0, 0, 0, 0))
        fc_clipped.paste(fc_layer, (0, 0), mask=clip_mask)
        canvas.alpha_composite(fc_clipped)
    else:
        fc = claw_open.resize((140, 140), Image.Resampling.NEAREST)
        canvas.alpha_composite(fc, (tx + 2, rim_y_bot - 90))
        if mode == "IDLE":
            sl = vfx_slash.resize((124, 124), Image.Resampling.NEAREST)
            canvas.alpha_composite(sl, (4, rim_y_bot - 110))

    if mode == "CORE":
        cx, cy = tx + 119, ty + 142
        draw.rectangle([cx - 18, cy - 18, cx + 18, cy + 18], outline=(103, 232, 249, 255), width=2)
        draw.rectangle([cx - 13, cy - 13, cx + 13, cy + 13], outline=(254, 240, 138, 255), width=1)

    return canvas


def main():
    torso_fg = extract_clean_foreground(SRC_TORSO)
    claw_fg = extract_clean_foreground(SRC_CLAW)
    fist_fg = extract_clean_foreground(SRC_FIST)

    # Row 0: 8 Registered 512x512 Multi-Part Sovereign Body Cells (pre-oriented facing `-X` LEFT!)
    row0_cells = build_row0_segmented_torso_cells(torso_fg)

    # Row 1: 8 Articulated Claws, Fists & Generated HD-2D Boss VFX Cells (pre-oriented facing `-X` LEFT!)
    claw_open_r = fg_to_logical_grid(claw_fg, pad=12)
    claw_flex_r = build_claw_flex_grid(claw_open_r)
    fist_crush_r = fg_to_logical_grid(fist_fg, pad=12)
    fist_meteor_r = build_fist_meteor_grid(fist_crush_r)

    claw_open_grid = [row[::-1] for row in claw_open_r]
    claw_flex_grid = [row[::-1] for row in claw_flex_r]
    fist_crush_grid = [row[::-1] for row in fist_crush_r]
    fist_meteor_grid = [row[::-1] for row in fist_meteor_r]

    row1_cells = [
        ("R1C0: CLAW_OPEN", finalize_grid_to_512(claw_open_grid, "CLAW_OPEN", min_comp_size=18, keep_only_largest=True)),
        ("R1C1: CLAW_FLEX", finalize_grid_to_512(claw_flex_grid, "CLAW_FLEX", min_comp_size=18, keep_only_largest=True)),
        ("R1C2: FIST_CRUSH", finalize_grid_to_512(fist_crush_grid, "FIST_CRUSH", min_comp_size=18, keep_only_largest=True)),
        ("R1C3: FIST_METEOR", finalize_grid_to_512(fist_meteor_grid, "FIST_METEOR", min_comp_size=14, keep_only_largest=False)),
        ("R1C4: VFX_GEYSER_A", finalize_grid_to_512(build_vfx_geyser_grid(0), "VFX_GEYSER_A", min_comp_size=8)),
        ("R1C5: VFX_GEYSER_B", finalize_grid_to_512(build_vfx_geyser_grid(1), "VFX_GEYSER_B", min_comp_size=8)),
        ("R1C6: VFX_JAW_HELLFIRE", finalize_grid_to_512(build_vfx_jaw_hellfire_grid(), "VFX_JAW_HELLFIRE", min_comp_size=8)),
        ("R1C7: VFX_CLAW_SLASH", finalize_grid_to_512(build_vfx_claw_slash_grid(), "VFX_CLAW_SLASH", min_comp_size=6)),
    ]

    sheet = Image.new("RGBA", (4096, 1024), (0, 0, 0, 0))
    for col, (_, img) in enumerate(row0_cells):
        sheet.paste(img, (col * 512, 0))
    for col, (_, img) in enumerate(row1_cells):
        sheet.paste(img, (col * 512, 512))

    os.makedirs(os.path.dirname(OUT_SHEET), exist_ok=True)
    sheet.save(OUT_SHEET, optimize=True)
    print(f"[OK] Wrote {OUT_SHEET} ({sheet.width}x{sheet.height}, 16x 512x512 cells facing -X LEFT, 20-color Master Palette, 0 clips)")

    portrait = build_portrait_128(SRC_PORTRAIT)
    portrait.save(OUT_PORTRAIT, optimize=True)
    print(f"[OK] Wrote {OUT_PORTRAIT} ({portrait.width}x{portrait.height})")

    dbg = Image.new("RGBA", (1840, 1020), (10, 12, 22, 255))
    draw = ImageDraw.Draw(dbg)
    draw.text(
        (24, 10),
        "RIGHT-SIDE COLOSSAL BOSS 4096x1024 ATLAS AUDIT (FACING -X LEFT, GENERATED HD-2D VFX & THRONE RIM, 1px SELOUT, 0 CLIPS)",
        fill=(254, 240, 138, 255),
    )

    all_rows = [row0_cells, row1_cells]
    cell_box = 206
    for r_idx, r_list in enumerate(all_rows):
        for c_idx, (label, cimg) in enumerate(r_list):
            x0 = 20 + c_idx * 226
            y0 = 46 + r_idx * 246
            for cy in range(0, cell_box, 16):
                for cx in range(0, cell_box, 16):
                    col = (26, 30, 44, 255) if ((cx // 16 + cy // 16) % 2 == 0) else (16, 19, 30, 255)
                    draw.rectangle([x0 + cx, y0 + cy, min(x0 + cell_box - 1, x0 + cx + 15), min(y0 + cell_box - 1, y0 + cy + 15)], fill=col)
            prev = cimg.resize((cell_box, cell_box), Image.Resampling.NEAREST)
            dbg.alpha_composite(prev, (x0, y0))
            draw.rectangle([x0 - 1, y0 - 1, x0 + cell_box, y0 + cell_box], outline=(212, 175, 55, 255), width=1)
            draw.text((x0 + 2, y0 - 14), label, fill=(254, 240, 138, 255))

    poses = [
        ("1. RIGHT-SIDE APPEAR (CLIPPED)", "APPEAR"),
        ("2. IDLE BREATH + 3-TALON SLASH", "IDLE"),
        ("3. HELLFIRE DRAGON-BREATH ROAR", "ROAR"),
        ("4. EXPOSED HEART-CORE (+45%)", "CORE"),
        ("5. CRACKED DEATH COLLAPSE", "DEATH"),
    ]
    r0_imgs = [im for _, im in row0_cells]
    r1_imgs = [im for _, im in row1_cells]
    for i, (ptitle, pmode) in enumerate(poses):
        px0 = 20 + i * 362
        py0 = 560
        comp = composite_boss_pose(r0_imgs, r1_imgs, pmode)
        dbg.alpha_composite(comp, (px0, py0 + 20))
        draw.rectangle([px0 - 1, py0 + 19, px0 + 340, py0 + 380], outline=(239, 68, 68, 255), width=2)
        draw.text((px0 + 4, py0 + 3), ptitle, fill=(103, 232, 249, 255))

    dbg.save(DEBUG_OUT)
    print(f"[OK] Wrote {DEBUG_OUT} ({dbg.width}x{dbg.height})")


if __name__ == "__main__":
    main()

