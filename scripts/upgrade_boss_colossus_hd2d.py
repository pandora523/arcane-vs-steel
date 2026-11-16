#!/usr/bin/env python3
"""
Neo-Vision EX HD-2D Makeover Builder for Adventure Final Boss `BEHEMOTH MALPHAS`:
  - `assets/sprites/boss_colossus_sheet.png` (`4096x2048`, `8x4` cells @ `512x512`, `100.0%` `4x4` block uniformity, `0` border clips, `0` semi-alpha)
  - `assets/sprites/boss_archfiend_portrait.png` (`128x128`, crisp binary-alpha pixel art, `0` emojis)

Preserves 100% of positional invariants required by `Monster.js` (`ArchfiendBoss`):
  1. Exact `4096x2048` dimensions & `0.0px` joint registration on `Row 0` (`(0..7, 0)`), keeping every populated cell intact
     (including `(1536,0)` `TORSO_DYING`, `(3072,512)` `JAW_HELLFIRE`, and `(3584,512)` `CLAW_SLASH`).
  2. Exact shoulder socket pins `(484, 320)` on `(0..2, 2)` and `(28, 320)` on `(3, 2)`.
  3. High-contrast Neo-Vision EX dark-obsidian + violet-indigo abyssal armor shading, gilded royal-gold filigree trim,
     horn/crown/armor specular rim catchlights, incandescent crimson-gold-white ribcage furnace (`(1,0)` & `(2,0)`),
     and glowing violet-magenta arcane sigil runes on the Siege Claw, Fist, Vambrace & Throne Parapet.
"""

import argparse
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

REPO_ROOT = Path(__file__).resolve().parent.parent
SHEET_PATH = REPO_ROOT / "assets/sprites/boss_colossus_sheet.png"
PORTRAIT_PATH = REPO_ROOT / "assets/sprites/boss_archfiend_portrait.png"

SELOUT_RGB = np.array([13, 15, 28], dtype=np.uint8)  # #0d0f1c

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

# Curated 28-Color Neo-Vision EX Malphas Master Palette (index 0 = #0d0f1c Selout)
EX_PALETTE = np.array(
    [
        [13, 15, 28],     # 0: #0d0f1c Selout
        # Obsidian + Violet-Indigo Abyssal Armor (1..5)
        [20, 16, 40],     # 1: Abyssal obsidian deep crevice
        [36, 28, 72],     # 2: Dark obsidian-indigo armor plate
        [60, 48, 114],    # 3: Rich violet-indigo slate midtone
        [96, 80, 168],    # 4: Lit royal-indigo armor bevel
        [162, 152, 228],  # 5: Crisp lavender-silver specular rim catchlight
        # Gilded Royal-Gold Filigree Trim (6..9)
        [108, 62, 16],    # 6: Deep forged bronze shadow
        [186, 124, 24],   # 7: Rich royal gold trim
        [244, 188, 46],   # 8: Luminous gilded sun-gold
        [255, 240, 144],  # 9: Specular molten-gold glint
        # Horn & Fang Carapace (10..13)
        [48, 34, 60],     # 10: Dark horn ridge
        [98, 74, 108],    # 11: Horn bone-violet midtone
        [162, 132, 156],  # 12: Lit horn ivory-lavender bevel
        [230, 214, 232],  # 13: Horn / fang specular rim catchlight
        # Abyssal Wing Membrane (14..17)
        [48, 12, 34],     # 14: Deep abyssal plum-crimson shadow
        [106, 22, 44],    # 15: Rich crimson-garnet wing membrane
        [168, 34, 48],    # 16: Lit scarlet-ruby wing membrane
        [222, 68, 44],    # 17: Ember-veined wing highlight
        # Incandescent Crimson-Gold-White Furnace & Hellfire (18..22)
        [210, 42, 28],    # 18: Scarlet hellfire outer
        [246, 102, 24],   # 19: Blazing magma orange
        [254, 174, 40],   # 20: Solar amber flame
        [255, 226, 98],   # 21: Incandescent molten gold
        [255, 252, 224],  # 22: White-hot furnace core
        # Glowing Arcane Sigil Runes (23..25)
        [108, 36, 186],   # 23: Deep arcane violet glow
        [178, 82, 254],   # 24: Vivid arcane magenta-violet rune
        [240, 184, 255],  # 25: Radiant white-violet sigil core
        # Volcanic Basalt Char (26..27)
        [46, 36, 54],     # 26: Dark volcanic basalt
        [88, 68, 88],     # 27: Lit volcanic basalt bevel
    ],
    dtype=np.uint8,
)


def classify_material_grid(rgb: np.ndarray, alpha: np.ndarray, mode: str = "armor") -> np.ndarray:
    """
    Classifies logical pixels into semantic material roles deterministically & idempotently
    for both legacy 18-color and Neo-Vision EX 28-color pixels:
      0 = transparent, 1 = selout, 2 = armor, 3 = gold, 4 = fire/ember,
      5 = wing_membrane, 6 = horn/bone, 7 = arcane_rune
    """
    h, w = alpha.shape
    mat = np.zeros((h, w), dtype=np.uint8)
    op = alpha
    r = rgb[:, :, 0].astype(np.int32)
    g = rgb[:, :, 1].astype(np.int32)
    b = rgb[:, :, 2].astype(np.int32)

    is_sel = op & (r <= 18) & (g <= 20) & (b <= 34)
    is_rune = op & (b >= 150) & (r >= 95) & (b > g + 42)
    is_fire = op & (
        ((r >= 198) & (g >= 86) & (b <= 125) & (r - b >= 85))
        | ((r >= 242) & (g >= 232) & (b >= 185))
        | ((r >= 188) & (g <= 78) & (b <= 58))
    )
    # Strict genuine saturated gold only (never absorbs muted brown/taupe rock/armor!)
    is_gold = op & (~is_fire) & (
        ((r >= 150) & (g >= 110) & (b <= 115) & (r - b >= 72) & (g - b >= 45))
        | ((r >= 210) & (g >= 170) & (b <= 155) & (r - b >= 65))
    )
    is_wing_mem = op & (~is_fire) & (~is_gold) & (r >= 46) & (r > b + 14) & (r > g + 18)
    is_horn = op & (~is_fire) & (~is_gold) & (~is_wing_mem) & (
        ((r >= 135) & (g >= 105) & (b >= 120) & (abs(r - b) <= 36))
    )

    mat[op] = 2  # default obsidian-indigo armor
    if mode == "wing":
        # Rich crimson-garnet wing webbing vs dark obsidian bone struts (zero blue speckling on webbing!)
        is_strut = (r <= 42) & (g <= 42) & (b <= 78)
        mat[op & (~is_strut)] = 5
        mat[is_gold] = 3
        mat[is_fire] = 4
    elif mode == "armor_clean":
        # Pure obsidian-indigo armor plate (strips old muddy red/brown splotches; deliberate gold/runes added cleanly!)
        mat[is_rune] = 7
    elif mode == "skull":
        mat[is_horn] = 6
        mat[is_fire] = 4
        mat[is_gold] = 3
        mat[is_rune] = 7
    elif mode == "vfx":
        mat[is_fire] = 4
        mat[is_wing_mem] = 5
        mat[is_gold] = 3
        mat[is_rune] = 7
    elif mode == "rock":
        mat[op] = 2
        mat[is_fire] = 4
    else:
        mat[is_gold] = 3
        mat[is_fire] = 4
        mat[is_wing_mem] = 5
        mat[is_rune] = 7

    mat[is_sel] = 1
    return mat


def compute_bevel_maps(interior: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Computes directional top-left lighting field, edge-distance depth, and 1px upper-left rim mask
    for crisp Neo-Vision EX cel shading.
    """
    h, w = interior.shape
    depth = np.zeros((h, w), dtype=np.float32)
    cur = interior.copy()
    for step in range(1, 7):
        up = np.zeros_like(cur); up[1:, :] = cur[:-1, :]
        dn = np.zeros_like(cur); dn[:-1, :] = cur[1:, :]
        lt = np.zeros_like(cur); lt[:, 1:] = cur[:, :-1]
        rt = np.zeros_like(cur); rt[:, :-1] = cur[:, 1:]
        nxt = cur & up & dn & lt & rt
        depth[cur & (~nxt)] = float(step)
        cur = nxt
    depth[cur] = 7.0

    no_up = np.zeros_like(interior); no_up[1:, :] = ~interior[:-1, :]; no_up[0, :] = True
    no_lt = np.zeros_like(interior); no_lt[:, 1:] = ~interior[:, :-1]; no_lt[:, 0] = True
    no_dn = np.zeros_like(interior); no_dn[:-1, :] = ~interior[1:, :]; no_dn[-1, :] = True
    no_rt = np.zeros_like(interior); no_rt[:, :-1] = ~interior[:, 1:]; no_rt[:, -1] = True

    top_left_rim = interior & (no_up | (no_lt & (~no_dn)))
    bot_right_crevice = interior & no_dn & no_rt
    return depth, top_left_rim, bot_right_crevice


def apply_ex_palette_and_bevel(
    cell_grid: np.ndarray,
    mode: str = "armor",
    rim_armor: bool = True,
    gold_boost: float = 0.0,
) -> np.ndarray:
    """
    Re-shades a logical grid `(G, G, 4)` into the high-contrast Neo-Vision EX palette
    while preserving 100% of silhouette, interior holes, and Selout integrity.
    """
    G = cell_grid.shape[0]
    rgb = cell_grid[:, :, :3].copy()
    alpha = cell_grid[:, :, 3] > 128
    mat = classify_material_grid(rgb, alpha, mode=mode)

    interior = alpha & (mat != 1)
    if not np.any(interior):
        return cell_grid.copy()

    luma = (
        0.299 * rgb[:, :, 0].astype(np.float32)
        + 0.587 * rgb[:, :, 1].astype(np.float32)
        + 0.114 * rgb[:, :, 2].astype(np.float32)
    ) / 255.0

    depth, tl_rim, br_crev = compute_bevel_maps(interior)
    yy, xx = np.mgrid[0:G, 0:G]
    dir_bias = ((G - yy) / float(G) - 0.5) * 0.14 + ((G - xx) / float(G) - 0.5) * 0.07
    bayer = (BAYER_4X4[yy & 3, xx & 3] - 0.5) * 0.05

    out = np.zeros((G, G, 4), dtype=np.uint8)
    out[alpha, 3] = 255
    out[mat == 1, :3] = EX_PALETTE[0]

    # 1. Armor Plates -> High-Contrast Obsidian + Violet-Indigo Shading
    m_arm = interior & (mat == 2)
    if np.any(m_arm):
        val = luma + dir_bias + np.where(depth >= 3.0, 0.07, -0.02) + bayer
        out[m_arm & (val < 0.15), :3] = EX_PALETTE[1]
        out[m_arm & (val >= 0.15) & (val < 0.25), :3] = EX_PALETTE[2]
        out[m_arm & (val >= 0.25) & (val < 0.36), :3] = EX_PALETTE[3]
        out[m_arm & (val >= 0.36), :3] = EX_PALETTE[4]
        out[m_arm & br_crev, :3] = EX_PALETTE[1]
        if rim_armor:
            lit_rim = m_arm & tl_rim & ((val >= 0.22) | (yy < int(G * 0.50)))
            out[lit_rim, :3] = EX_PALETTE[5]

    # 2. Gilded Royal-Gold Filigree Trim
    m_gold = interior & (mat == 3)
    if np.any(m_gold):
        val = luma + dir_bias * 0.8 + gold_boost
        out[m_gold & (val < 0.32), :3] = EX_PALETTE[6]
        out[m_gold & (val >= 0.32) & (val < 0.52), :3] = EX_PALETTE[7]
        out[m_gold & (val >= 0.52) & (val < 0.74), :3] = EX_PALETTE[8]
        out[m_gold & ((val >= 0.74) | tl_rim), :3] = EX_PALETTE[9]

    # 3. Horn / Bone Carapace
    m_horn = interior & (mat == 6)
    if np.any(m_horn):
        val = luma + dir_bias * 0.9
        out[m_horn & (val < 0.24), :3] = EX_PALETTE[10]
        out[m_horn & (val >= 0.24) & (val < 0.42), :3] = EX_PALETTE[11]
        out[m_horn & (val >= 0.42) & (val < 0.62), :3] = EX_PALETTE[12]
        out[m_horn & ((val >= 0.62) | tl_rim), :3] = EX_PALETTE[13]

    # 4. Abyssal Wing Membrane (clean flat cel crimson-garnet bands, zero noisy speckling)
    m_wing = interior & (mat == 5)
    if np.any(m_wing):
        val = luma + dir_bias * 0.45
        out[m_wing & (val < 0.19), :3] = EX_PALETTE[14]
        out[m_wing & (val >= 0.19) & (val < 0.31), :3] = EX_PALETTE[15]
        out[m_wing & (val >= 0.31) & (val < 0.46), :3] = EX_PALETTE[16]
        out[m_wing & (val >= 0.46), :3] = EX_PALETTE[17]

    # 5. Incandescent Crimson-Gold-White Fire / Magma
    m_fire = interior & (mat == 4)
    if np.any(m_fire):
        r_f = rgb[:, :, 0].astype(np.float32) / 255.0
        g_f = rgb[:, :, 1].astype(np.float32) / 255.0
        b_f = rgb[:, :, 2].astype(np.float32) / 255.0
        heat = r_f * 0.34 + g_f * 0.46 + b_f * 0.20
        out[m_fire & (heat < 0.40), :3] = EX_PALETTE[18]
        out[m_fire & (heat >= 0.40) & (heat < 0.56), :3] = EX_PALETTE[19]
        out[m_fire & (heat >= 0.56) & (heat < 0.72), :3] = EX_PALETTE[20]
        out[m_fire & (heat >= 0.72) & (heat < 0.87), :3] = EX_PALETTE[21]
        out[m_fire & (heat >= 0.87), :3] = EX_PALETTE[22]

    # 6. Existing Arcane Runes
    m_rune = interior & (mat == 7)
    if np.any(m_rune):
        out[m_rune & (luma < 0.42), :3] = EX_PALETTE[23]
        out[m_rune & (luma >= 0.42) & (luma < 0.68), :3] = EX_PALETTE[24]
        out[m_rune & (luma >= 0.68), :3] = EX_PALETTE[25]

    return out


def seal_selout_border(grid: np.ndarray, margin: int = 2) -> np.ndarray:
    """Enforces safe border margin and seals clean 1px #0d0f1c Selout around interior pixels."""
    g = grid.copy()
    a = g[:, :, 3] > 128
    a[:margin, :] = False
    a[-margin:, :] = False
    a[:, :margin] = False
    a[:, -margin:] = False
    g[~a] = 0

    interior = a & (
        (g[:, :, 0] != SELOUT_RGB[0]) | (g[:, :, 1] != SELOUT_RGB[1]) | (g[:, :, 2] != SELOUT_RGB[2])
    )
    if not np.any(interior):
        return g

    up = np.zeros_like(interior); up[1:, :] = interior[:-1, :]
    dn = np.zeros_like(interior); dn[:-1, :] = interior[1:, :]
    lt = np.zeros_like(interior); lt[:, 1:] = interior[:, :-1]
    rt = np.zeros_like(interior); rt[:, :-1] = interior[:, 1:]
    ring = (~a) & (up | dn | lt | rt)
    ring[: max(1, margin - 1), :] = False
    ring[-max(1, margin - 1) :, :] = False
    ring[:, : max(1, margin - 1)] = False
    ring[:, -max(1, margin - 1) :] = False

    g[ring, :3] = SELOUT_RGB
    g[ring, 3] = 255
    return g


def grid_to_cell512(grid: np.ndarray) -> Image.Image:
    G = grid.shape[0]
    assert 512 % G == 0
    scale = 512 // G
    up = np.repeat(np.repeat(grid, scale, axis=0), scale, axis=1)
    return Image.fromarray(up, mode="RGBA")


def is_solid_interior(grid: np.ndarray, x: int, y: int) -> bool:
    G = grid.shape[0]
    if not (2 <= x < G - 2 and 2 <= y < G - 2):
        return False
    return bool(grid[y, x, 3] > 128 and not np.array_equal(grid[y, x, :3], SELOUT_RGB))


def stamp_arcane_sigil(
    grid: np.ndarray,
    cx: int,
    cy: int,
    kind: str = "diamond",
    require_opaque: bool = True,
) -> None:
    """Carves crisp glowing Neo-Vision EX arcane sigil runes onto solid armor plates."""
    G = grid.shape[0]
    if kind == "diamond":
        pts = [
            (0, -3, 23), (0, -2, 24), (-1, -1, 24), (0, -1, 25), (1, -1, 24),
            (-2, 0, 23), (-1, 0, 25), (0, 0, 25), (1, 0, 25), (2, 0, 23),
            (-1, 1, 24), (0, 1, 25), (1, 1, 24), (0, 2, 24), (0, 3, 23),
        ]
    elif kind == "pillar":
        pts = [
            (0, -4, 24), (-1, -3, 23), (0, -3, 25), (1, -3, 23),
            (0, -2, 24), (0, -1, 25), (-2, 0, 23), (-1, 0, 24), (0, 0, 25),
            (1, 0, 24), (2, 0, 23), (0, 1, 25), (0, 2, 24),
            (-1, 3, 23), (0, 3, 25), (1, 3, 23), (0, 4, 24),
        ]
    elif kind == "chevron":
        pts = [
            (-3, 0, 23), (-2, -1, 24), (-2, 0, 25), (-2, 1, 24),
            (-1, -2, 23), (-1, 0, 24), (-1, 2, 23),
            (0, -1, 24), (0, 0, 25), (0, 1, 24),
            (1, 0, 25), (2, 0, 24), (3, 0, 23),
        ]
    elif kind == "ward":
        pts = [
            (0, -5, 23), (-1, -4, 24), (0, -4, 25), (1, -4, 24),
            (-2, -3, 23), (0, -3, 25), (2, -3, 23),
            (-3, -2, 24), (-1, -2, 24), (0, -2, 25), (1, -2, 24), (3, -2, 24),
            (-2, -1, 24), (0, -1, 25), (2, -1, 24),
            (-4, 0, 23), (-2, 0, 25), (-1, 0, 25), (0, 0, 25), (1, 0, 25), (2, 0, 25), (4, 0, 23),
            (-2, 1, 24), (0, 1, 25), (2, 1, 24),
            (-3, 2, 24), (-1, 2, 24), (0, 2, 25), (1, 2, 24), (3, 2, 24),
            (-2, 3, 23), (0, 3, 25), (2, 3, 23),
            (-1, 4, 24), (0, 4, 25), (1, 4, 24), (0, 5, 23),
        ]
    else:  # cross
        pts = [
            (0, -2, 24), (-1, -1, 23), (0, -1, 25), (1, -1, 23),
            (-2, 0, 24), (-1, 0, 25), (0, 0, 25), (1, 0, 25), (2, 0, 24),
            (-1, 1, 23), (0, 1, 25), (1, 1, 23), (0, 2, 24),
        ]

    for dx, dy, pal_idx in pts:
        x, y = cx + dx, cy + dy
        if 2 <= x < G - 2 and 2 <= y < G - 2:
            if require_opaque and not is_solid_interior(grid, x, y):
                continue
            grid[y, x, :3] = EX_PALETTE[pal_idx]
            grid[y, x, 3] = 255


def upscale_64_to_128(cell512: Image.Image) -> np.ndarray:
    """Safely promotes a 64x64 cell to 128x128 (4x NEAREST) while preserving 100% alignment."""
    arr = np.array(cell512.convert("RGBA"), dtype=np.uint8)
    g64 = arr[::8, ::8].copy()
    return np.repeat(np.repeat(g64, 2, axis=0), 2, axis=1)


def sculpt_ribcage_furnace_ex(grid128: np.ndarray, is_beat_b: bool) -> None:
    """
    Sculpts the Neo-Vision EX incandescent crimson-gold-white ribcage furnace on `(1,0)` / `(2,0)`
    clasped by 3 pairs of beveled dark-obsidian + indigo-trimmed skeletal ribs with royal-gold tips.
    """
    a_mask = grid128[:, :, 3] > 128
    rgb = grid128[:, :, :3].astype(np.int32)
    hot = a_mask & (rgb[:, :, 0] >= 180) & (rgb[:, :, 1] >= 75)
    hy, hx = np.where(hot)
    cx = float(np.median(hx)) if len(hx) > 12 else 55.0
    cy = float(np.median(hy)) if len(hy) > 12 else 68.0

    rx = 16.5 if is_beat_b else 14.5
    ry = 19.8 if is_beat_b else 17.8

    interior = np.zeros_like(a_mask)
    interior[2:-2, 2:-2] = (
        a_mask[2:-2, 2:-2]
        & a_mask[1:-3, 2:-2]
        & a_mask[3:-1, 2:-2]
        & a_mask[2:-2, 1:-3]
        & a_mask[2:-2, 3:-1]
    )

    # Royal-gold pectoral collar filigree above the furnace (`y = 40..52`)
    for y in range(40, 53):
        for x in range(36, 86):
            if not interior[y, x]:
                continue
            arch = abs((y - 46) - ((x - 56) ** 2) * 0.015)
            if arch <= 1.20 and abs(x - 56) <= 21:
                grid128[y, x, :3] = EX_PALETTE[8] if arch <= 0.65 else EX_PALETTE[7]
                if y > 41 and interior[y - 1, x]:
                    grid128[y - 1, x, :3] = EX_PALETTE[9] if abs(x - 56) <= 9 else EX_PALETTE[8]

    # Glowing central collar gem above ribcage
    stamp_arcane_sigil(grid128, 56, 47, kind="cross", require_opaque=True)

    # Roaring 5-tier Bayer-stippled incandescent crimson-gold-white furnace fire
    y0, y1 = max(4, int(cy - ry - 4)), min(124, int(cy + ry + 4))
    x0, x1 = max(4, int(cx - rx - 4)), min(124, int(cx + rx + 4))
    phase = 1.65 if is_beat_b else 0.0

    for y in range(y0, y1):
        for x in range(x0, x1):
            if not interior[y, x]:
                continue
            nx = (x - cx) / rx
            ny = (y - cy) / ry
            tongue = 0.17 * np.sin(nx * 9.5 + phase) * max(0.0, -ny + 0.32) + 0.09 * np.cos(ny * 8.0 - phase)
            d = np.hypot(nx, ny) - tongue
            if d > 1.04:
                continue
            bayer = (BAYER_4X4[y & 3, x & 3] - 0.5) * 0.16
            heat = (1.0 - d) + bayer + (0.09 if is_beat_b else 0.0)
            if heat >= 0.74:
                c = EX_PALETTE[22]  # White-hot core
            elif heat >= 0.54:
                c = EX_PALETTE[21]  # Incandescent molten gold
            elif heat >= 0.36:
                c = EX_PALETTE[20]  # Solar amber
            elif heat >= 0.20:
                c = EX_PALETTE[19]  # Magma orange
            else:
                c = EX_PALETTE[18]  # Crimson scarlet rim
            grid128[y, x, :3] = c

    # 3 pairs of dark-obsidian + violet-indigo + royal-gold-tipped skeletal ribs
    rib_offsets_y = [-9, -1, 7]
    for r_idx, dy_rib in enumerate(rib_offsets_y):
        span_x = int(rx * (0.96 - r_idx * 0.07))
        cleft = 3 if r_idx == 1 else 2
        for side in (-1, 1):
            for dx_abs in range(cleft, span_x + 2):
                px = int(round(cx + side * dx_abs))
                u = dx_abs / float(max(1, span_x))
                arch_y = int(round(cy + dy_rib + (u * u) * 3.5))
                if not (4 <= px < 124 and 4 <= arch_y < 123):
                    continue
                if interior[arch_y, px]:
                    grid128[arch_y, px, :3] = EX_PALETTE[2]
                if interior[arch_y - 1, px]:
                    if dx_abs <= cleft + 2:
                        grid128[arch_y - 1, px, :3] = EX_PALETTE[9] if is_beat_b else EX_PALETTE[8]
                    else:
                        grid128[arch_y - 1, px, :3] = EX_PALETTE[4]
                if interior[arch_y + 1, px]:
                    grid128[arch_y + 1, px, :3] = SELOUT_RGB


def upgrade_row0_cells(raw_sheet: Image.Image) -> list[Image.Image]:
    """Upgrades all 8 Row 0 cells at exact 128x128 (`0.0px` shift)."""
    arr = np.array(raw_sheet, dtype=np.uint8)
    cells = []

    for col in range(8):
        raw_cell = arr[0:512, col * 512 : (col + 1) * 512]
        g128 = raw_cell[::4, ::4].copy()

        if col == 0:
            # CALDERA_RIM: dark obsidian-indigo parapet + subtle gilded trim + 5 glowing arcane sigil runes
            ex = apply_ex_palette_and_bevel(g128, mode="armor", rim_armor=True, gold_boost=0.05)
            # Clean gilded royal-gold upper parapet frieze border & specular rock ridge catchlights
            for x in range(14, 114):
                # Find highest interior parapet pixel in the main wall (`y >= 76`)
                for y in range(76, 92):
                    if is_solid_interior(ex, x, y) and not is_solid_interior(ex, x, y - 1):
                        if is_solid_interior(ex, x, y + 3):
                            ex[y, x, :3] = EX_PALETTE[8] if (x % 4 != 0) else EX_PALETTE[9]
                            if is_solid_interior(ex, x, y + 1):
                                ex[y + 1, x, :3] = EX_PALETTE[7]
                        break
            # 5 glowing arcane sigil runes inlaid along the throne parapet frieze!
            for rx, ry, kind in (
                (23, 94, "diamond"),
                (44, 94, "pillar"),
                (64, 93, "ward"),
                (85, 94, "pillar"),
                (105, 94, "diamond"),
            ):
                stamp_arcane_sigil(ex, rx, ry, kind=kind, require_opaque=True)
            ex = seal_selout_border(ex, margin=2)

        elif col in (1, 2):
            # TORSO_HEART_A / B: dark-obsidian + violet-indigo armor + royal gold trim + crimson-gold-white furnace
            ex = apply_ex_palette_and_bevel(g128, mode="armor", rim_armor=True, gold_boost=0.06)
            sculpt_ribcage_furnace_ex(ex, is_beat_b=(col == 2))
            ex = seal_selout_border(ex, margin=2)

        elif col == 3:
            # TORSO_DYING (1536,0): shattered obsidian-indigo armor, cracked rib stubs, jagged ember fissures!
            ex = apply_ex_palette_and_bevel(g128, mode="armor", rim_armor=True, gold_boost=-0.04)
            # Tarnished royal-gold collar
            for y in range(42, 51):
                for x in range(42, 80):
                    if is_solid_interior(ex, x, y):
                        if abs((y - 46) - ((x - 56) ** 2) * 0.015) <= 0.9:
                            ex[y, x, :3] = EX_PALETTE[7] if (x + y) % 3 else EX_PALETTE[6]
            # Hollow charred furnace cavity + jagged glowing fracture fissures (no round dot!)
            cx, cy = 56, 68
            for y in range(53, 89):
                for x in range(38, 76):
                    if not is_solid_interior(ex, x, y):
                        continue
                    nx = (x - cx) / 14.0
                    ny = (y - cy) / 16.0
                    jag = 0.22 * np.sin(nx * 7.0 + ny * 5.0)
                    d = np.hypot(nx, ny) + jag
                    if d <= 0.76:
                        # Charred hollow ribs & fading crimson embers
                        if y in (59, 67, 75) and abs(x - cx) >= 4:
                            ex[y, x, :3] = EX_PALETTE[3] if y == 67 else EX_PALETTE[2]
                        elif d <= 0.28:
                            ex[y, x, :3] = EX_PALETTE[18] if ((x + y) & 1 == 0) else EX_PALETTE[14]
                        else:
                            ex[y, x, :3] = EX_PALETTE[1]
            # Jagged arcane-crimson shatter fissures radiating across dead breastplate
            fissures = [
                (52, 56), (50, 54), (47, 52), (44, 51), (42, 49),
                (61, 56), (64, 54), (68, 52), (72, 51), (75, 49),
                (48, 76), (44, 79), (41, 82), (39, 86),
                (64, 76), (68, 80), (72, 83), (75, 87),
                (56, 81), (55, 86), (57, 91), (56, 95),
            ]
            for px, py in fissures:
                if is_solid_interior(ex, px, py):
                    ex[py, px, :3] = EX_PALETTE[24] if (px + py) % 2 == 0 else EX_PALETTE[18]
            ex = seal_selout_border(ex, margin=2)

        elif col == 4:
            # REAR_PAULDRON: obsidian-indigo layered armor + gold arch band + glowing arcane cross
            ex = apply_ex_palette_and_bevel(g128, mode="armor_clean", rim_armor=True, gold_boost=0.06)
            for y in range(58, 63):
                for x in range(25, 42):
                    if is_solid_interior(ex, x, y) and y in (59, 60):
                        ex[y, x, :3] = EX_PALETTE[8] if y == 59 else EX_PALETTE[7]
            stamp_arcane_sigil(ex, 33, 52, kind="cross", require_opaque=True)
            ex = seal_selout_border(ex, margin=2)

        elif col == 5:
            # FRONT_PAULDRON: obsidian-indigo spiked armor + razor-clean royal-gold filigree arches + arcane diamond
            ex = apply_ex_palette_and_bevel(g128, mode="armor_clean", rim_armor=True, gold_boost=0.08)
            for y in range(38, 68):
                for x in range(72, 106):
                    if not is_solid_interior(ex, x, y):
                        continue
                    arch1 = abs((y - 45) - ((x - 89) ** 2) * 0.036)
                    arch2 = abs((y - 59) - ((x - 89) ** 2) * 0.024)
                    if arch1 <= 0.72 or arch2 <= 0.78:
                        ex[y, x, :3] = EX_PALETTE[9] if x <= 86 else EX_PALETTE[8]
                    elif arch1 <= 1.35 or arch2 <= 1.35:
                        ex[y, x, :3] = EX_PALETTE[7]
            # Crisp horn/spike specular rim catchlights along top crest (`x=86..94, y=26..38`)
            for y in range(26, 39):
                for x in range(86, 94):
                    if is_solid_interior(ex, x, y) and not is_solid_interior(ex, x - 1, y):
                        ex[y, x, :3] = EX_PALETTE[13] if y < 33 else EX_PALETTE[5]
            stamp_arcane_sigil(ex, 89, 52, kind="diamond", require_opaque=True)
            ex = seal_selout_border(ex, margin=2)

        elif col == 6:
            # SKULL_UPPER: obsidian-indigo cranium, sleek bone-ivory rimmed horns, narrow gold brow crown, fiery eyes
            ex = apply_ex_palette_and_bevel(g128, mode="skull", rim_armor=True, gold_boost=0.05)
            # Carve clean narrow royal-gold brow crown strictly across skull forehead (`x=49..63, y=22..24`)
            for x in range(49, 64):
                if is_solid_interior(ex, x, 23):
                    ex[23, x, :3] = EX_PALETTE[8] if abs(x - 56) > 2 else EX_PALETTE[9]
                if is_solid_interior(ex, x, 24):
                    ex[24, x, :3] = EX_PALETTE[7]
            # Royal-gold horn-root collars at `x=45..47` and `x=65..67` (`y=20..26`)
            for y in range(20, 27):
                for x in (45, 46, 65, 66):
                    if is_solid_interior(ex, x, y):
                        ex[y, x, :3] = EX_PALETTE[8] if y <= 23 else EX_PALETTE[7]
            # Sharp specular rim catchlight along upper horn edges (`x < 46` or `x > 66`)
            for y in range(8, 28):
                for x in range(30, 87):
                    if (x < 45 or x > 67) and is_solid_interior(ex, x, y):
                        if not is_solid_interior(ex, x, y - 1):
                            ex[y, x, :3] = EX_PALETTE[13]
                        elif not is_solid_interior(ex, x, y - 2):
                            ex[y, x, :3] = EX_PALETTE[12]
            # Glowing arcane forehead sigil gem (`(55, 22)`)
            stamp_arcane_sigil(ex, 55, 21, kind="cross", require_opaque=True)
            # Piercing glowing crimson-gold-white demonic eyes at EXACT socket coordinates `(50..51, 31)` & `(57..58, 30)`!
            for ex_c, ey_c in ((50, 31), (57, 30)):
                for dx_e, dy_e, pal_idx in ((0, 0, 22), (1, 0, 21), (-1, 0, 18), (0, -1, 19)):
                    px, py = ex_c + dx_e, ey_c + dy_e
                    if is_solid_interior(ex, px, py):
                        ex[py, px, :3] = EX_PALETTE[pal_idx]
            ex = seal_selout_border(ex, margin=2)

        else:
            # JAW_MANDIBLE (7,0): obsidian-indigo chin plate, royal-gold trim & crisp ivory fangs
            ex = apply_ex_palette_and_bevel(g128, mode="skull", rim_armor=True, gold_boost=0.05)
            for x in range(51, 63):
                if is_solid_interior(ex, x, 41) and (x % 3 == 0):
                    ex[41, x, :3] = EX_PALETTE[13]
                if is_solid_interior(ex, x, 46):
                    ex[46, x, :3] = EX_PALETTE[8]
            ex = seal_selout_border(ex, margin=2)

        cells.append(grid_to_cell512(ex))

    return cells


def upgrade_row1_cells(raw_sheet: Image.Image) -> list[Image.Image]:
    """
    Upgrades all 8 Row 1 cells:
      - (0,1)/(1,1) CLAW_OPEN/FLEX & (2,1)/(3,1) FIST_IDLE/METEOR -> 128x128 (`4x NEAREST`) w/ royal-gold filigree & arcane runes!
      - (4,1)/(5,1) GEYSER_A/B, (6,1) JAW_HELLFIRE (3072,512), (7,1) CLAW_SLASH (3584,512) -> 128x128 (`4x NEAREST`) EX fire!
    """
    arr = np.array(raw_sheet, dtype=np.uint8)
    cells = []

    for col in range(8):
        raw_cell = Image.fromarray(arr[512:1024, col * 512 : (col + 1) * 512], mode="RGBA")
        if col in (0, 1):
            # CLAW_OPEN / CLAW_FLEX @ 128x128
            g128 = upscale_64_to_128(raw_cell)
            ex = apply_ex_palette_and_bevel(g128, mode="armor", rim_armor=True, gold_boost=0.08)
            # Clean gilded wrist collar & dorsal knuckle rim + razor-sharp talon catchlights
            for y in range(44, 84):
                for x in range(18, 120):
                    if not is_solid_interior(ex, x, y):
                        continue
                    if x in (66, 67, 98, 99) and 50 <= y <= 76:
                        ex[y, x, :3] = EX_PALETTE[9] if y <= 58 else EX_PALETTE[8]
                    elif x in (68, 100) and 50 <= y <= 76:
                        ex[y, x, :3] = EX_PALETTE[7]
                    # Specular talon tips pointing left (`-X`)
                    if x <= 32 and not is_solid_interior(ex, x - 1, y) and not is_solid_interior(ex, x - 2, y):
                        ex[y, x, :3] = EX_PALETTE[13] if y <= 62 else EX_PALETTE[17]
            # Glowing arcane sigil runes inlaid cleanly on the dorsal Siege Claw plate & wrist shield!
            stamp_arcane_sigil(ex, 83, 64, kind="diamond", require_opaque=True)
            stamp_arcane_sigil(ex, 110, 64, kind="chevron", require_opaque=True)
            ex = seal_selout_border(ex, margin=2)
            cells.append(grid_to_cell512(ex))

        elif col in (2, 3):
            # FIST_IDLE / FIST_METEOR @ 128x128
            g128 = upscale_64_to_128(raw_cell)
            ex = apply_ex_palette_and_bevel(g128, mode="armor", rim_armor=True, gold_boost=0.08)
            # Clean royal-gold cuff & forearm armor rings ONLY across solid upper gauntlet (`y <= 74`), never over knuckles/flame gaps!
            for y in (26, 27, 49, 50, 70, 71):
                for x in range(38, 92):
                    if (
                        is_solid_interior(ex, x, y)
                        and is_solid_interior(ex, x, y - 2)
                        and is_solid_interior(ex, x, y + 2)
                        and (int(ex[y, x, 0]) < 190)  # never paint gold over active meteor fire!
                    ):
                        ex[y, x, :3] = EX_PALETTE[9] if x <= 58 else EX_PALETTE[8]
            # Glowing arcane sigils inlaid on the colossal armored fist gauntlet!
            stamp_arcane_sigil(ex, 64, 38, kind="chevron", require_opaque=True)
            stamp_arcane_sigil(ex, 64, 60, kind="ward", require_opaque=True)
            stamp_arcane_sigil(ex, 64, 82, kind="diamond", require_opaque=True)
            ex = seal_selout_border(ex, margin=2)
            cells.append(grid_to_cell512(ex))

        else:
            # GEYSER_A/B (4,1)/(5,1), JAW_HELLFIRE (6,1), CLAW_SLASH (7,1) @ 128x128
            g128 = np.array(raw_cell, dtype=np.uint8)[::4, ::4].copy()
            ex = apply_ex_palette_and_bevel(g128, mode="vfx", rim_armor=False, gold_boost=0.08)
            if col in (6, 7):
                r_c = ex[:, :, 0].astype(np.int32)
                g_c = ex[:, :, 1].astype(np.int32)
                soot = (ex[:, :, 3] > 128) & (r_c <= 70) & (g_c <= 60) & (~np.all(ex[:, :, :3] == SELOUT_RGB, axis=2))
                ex[soot, :3] = EX_PALETTE[2]
            ex = seal_selout_border(ex, margin=2)
            cells.append(grid_to_cell512(ex))

    return cells


def upgrade_row2_cells(raw_sheet: Image.Image) -> list[Image.Image]:
    """
    Upgrades all 8 Row 2 cells:
      - (0..3, 2) Wings @ 128x128 -> PRESERVES exact shoulder sockets (484, 320) & (28, 320)!
      - (4, 2) VAMBRACE_HORIZ -> 128x128 (`4x NEAREST`) w/ clean royal-gold arches + 3 glowing arcane sigil runes!
      - (5, 2) FIST_RIFT_PORTAL -> 128x128 (`4x NEAREST`) w/ abyssal violet arcane portal rim!
      - (6, 2) & (7, 2) HELLFIRE_B/C -> 128x128 (`4x NEAREST`) matching (6, 1)!
    """
    arr = np.array(raw_sheet, dtype=np.uint8)
    cells = []

    for col in range(8):
        raw_cell = Image.fromarray(arr[1024:1536, col * 512 : (col + 1) * 512], mode="RGBA")
        if col <= 3:
            # Great-Wings @ 128x128: MUST preserve exact shoulder socket pins `(121, 80)` & `(7, 80)`!
            g128 = np.array(raw_cell, dtype=np.uint8)[::4, ::4].copy()
            ex = apply_ex_palette_and_bevel(g128, mode="wing", rim_armor=True, gold_boost=0.08)
            sx128 = 121 if col < 3 else 7
            sy128 = 80
            for dy in range(-2, 3):
                for dx in range(-2, 3):
                    py, px = sy128 + dy, sx128 + dx
                    if is_solid_interior(ex, px, py):
                        ex[py, px, :3] = EX_PALETTE[8] if abs(dx) + abs(dy) <= 1 else EX_PALETTE[7]
            for y in range(20, 96):
                for x in range(8, 120):
                    if is_solid_interior(ex, x, y) and not is_solid_interior(ex, x, y - 2):
                        if np.array_equal(ex[y, x, :3], EX_PALETTE[1]):
                            ex[y, x, :3] = EX_PALETTE[4]
            ex = seal_selout_border(ex, margin=2)
            assert ex[sy128, sx128, 3] == 255, f"Wing ({col},2) socket ({sx128},{sy128}) became transparent!"
            cells.append(grid_to_cell512(ex))

        elif col == 4:
            # VAMBRACE_HORIZ @ 128x128: sleek obsidian-indigo armor, 3 razor-crisp royal-gold arch bands & 4 arcane runes!
            g128 = upscale_64_to_128(raw_cell)
            ex = apply_ex_palette_and_bevel(g128, mode="armor_clean", rim_armor=True, gold_boost=0.08)
            for y in range(42, 88):
                for x in range(14, 114):
                    if not is_solid_interior(ex, x, y):
                        continue
                    curve = ((y - 64) ** 2) * 0.011
                    if (
                        abs((x - 45) - curve) <= 0.95
                        or abs((x - 71) - curve) <= 0.95
                        or abs((x - 95) - curve) <= 0.95
                    ):
                        ex[y, x, :3] = EX_PALETTE[9] if y <= 56 else EX_PALETTE[8]
                    elif (
                        abs((x - 46) - curve) <= 1.5
                        or abs((x - 72) - curve) <= 1.5
                        or abs((x - 96) - curve) <= 1.5
                    ):
                        ex[y, x, :3] = EX_PALETTE[7]
            stamp_arcane_sigil(ex, 29, 64, kind="chevron", require_opaque=True)
            stamp_arcane_sigil(ex, 59, 64, kind="ward", require_opaque=True)
            stamp_arcane_sigil(ex, 84, 64, kind="diamond", require_opaque=True)
            stamp_arcane_sigil(ex, 105, 64, kind="cross", require_opaque=True)
            ex = seal_selout_border(ex, margin=2)
            cells.append(grid_to_cell512(ex))

        elif col == 5:
            # FIST_RIFT_PORTAL @ 128x128
            g128 = upscale_64_to_128(raw_cell)
            ex = apply_ex_palette_and_bevel(g128, mode="vfx", rim_armor=True, gold_boost=0.08)
            r_c = ex[:, :, 0].astype(np.int32)
            is_dark = (ex[:, :, 3] > 128) & (r_c <= 65) & (~np.all(ex[:, :, :3] == SELOUT_RGB, axis=2))
            yy, xx = np.mgrid[0:128, 0:128]
            dist_c = np.hypot((xx - 64.0) / 48.0, (yy - 64.0) / 22.0)
            violet_band = is_dark & (dist_c >= 0.62) & (dist_c <= 0.92) & ((xx + yy) % 2 == 0)
            ex[violet_band, :3] = EX_PALETTE[23]
            stamp_arcane_sigil(ex, 22, 58, kind="cross", require_opaque=True)
            stamp_arcane_sigil(ex, 106, 58, kind="cross", require_opaque=True)
            ex = seal_selout_border(ex, margin=2)
            cells.append(grid_to_cell512(ex))

        else:
            # HELLFIRE_B (6,2) & HELLFIRE_C (7,2) @ 128x128
            g128 = np.array(raw_cell, dtype=np.uint8)[::4, ::4].copy()
            ex = apply_ex_palette_and_bevel(g128, mode="vfx", rim_armor=False, gold_boost=0.08)
            soot = (ex[:, :, 3] > 128) & (ex[:, :, 0] <= 70) & (ex[:, :, 1] <= 60) & (~np.all(ex[:, :, :3] == SELOUT_RGB, axis=2))
            ex[soot, :3] = EX_PALETTE[2]
            ex = seal_selout_border(ex, margin=2)
            cells.append(grid_to_cell512(ex))

    return cells


def upgrade_row3_cells(raw_sheet: Image.Image) -> list[Image.Image]:
    """
    Upgrades all 8 Row 3 cells:
      - (0,3)/(1,3) CLAW_SLASH_B/C @ 128x128
      - (2,3)/(3,3) MAGMA_SPIRE_A/B @ 128x128
      - (4,3)/(5,3) BOULDER_A/B @ 32x32 (`16x NEAREST`)
      - (6,3) ECLIPSE_CREST @ 128x128
      - (7,3) HEART_CORE @ 128x128
    """
    arr = np.array(raw_sheet, dtype=np.uint8)
    cells = []

    for col in range(8):
        raw_cell = Image.fromarray(arr[1536:2048, col * 512 : (col + 1) * 512], mode="RGBA")
        if col in (0, 1):
            g128 = np.array(raw_cell, dtype=np.uint8)[::4, ::4].copy()
            ex = apply_ex_palette_and_bevel(g128, mode="vfx", rim_armor=False, gold_boost=0.08)
            soot = (ex[:, :, 3] > 128) & (ex[:, :, 0] <= 70) & (ex[:, :, 1] <= 60) & (~np.all(ex[:, :, :3] == SELOUT_RGB, axis=2))
            ex[soot, :3] = EX_PALETTE[2]
            ex = seal_selout_border(ex, margin=2)
            cells.append(grid_to_cell512(ex))

        elif col in (2, 3):
            g128 = upscale_64_to_128(raw_cell)
            ex = apply_ex_palette_and_bevel(g128, mode="armor", rim_armor=True, gold_boost=0.06)
            for y in range(60, 118):
                for x in range(36, 92):
                    if is_solid_interior(ex, x, y) and abs(x - 64) <= 2 and y >= 76:
                        ex[y, x, :3] = EX_PALETTE[21] if y >= 94 else EX_PALETTE[19]
            stamp_arcane_sigil(ex, 64, 72, kind="pillar", require_opaque=True)
            ex = seal_selout_border(ex, margin=2)
            cells.append(grid_to_cell512(ex))

        elif col in (4, 5):
            # Volcanic Obsidian Boulders @ 32x32 (`16x NEAREST`)
            g32 = np.array(raw_cell, dtype=np.uint8)[::16, ::16].copy()
            ex = apply_ex_palette_and_bevel(g32, mode="rock", rim_armor=True, gold_boost=0.0)
            ex = seal_selout_border(ex, margin=1)
            cells.append(grid_to_cell512(ex))

        elif col == 6:
            # ECLIPSE_CREST @ 128x128: Royal-gold diadem, obsidian-indigo spires, specular catchlights, arcane jewel
            g128 = upscale_64_to_128(raw_cell)
            ex = apply_ex_palette_and_bevel(g128, mode="armor", rim_armor=True, gold_boost=0.10)
            for y in range(20, 74):
                for x in range(18, 110):
                    if not is_solid_interior(ex, x, y):
                        continue
                    nx = (x - 64.0) / 43.0
                    arch_y = 57.0 + (nx * nx) * 13.0
                    if abs(y - arch_y) <= 2.2:
                        ex[y, x, :3] = EX_PALETTE[9] if abs(y - arch_y) <= 0.9 else EX_PALETTE[8]
                    elif y < 56 and not is_solid_interior(ex, x - 2, y):
                        ex[y, x, :3] = EX_PALETTE[9]
            stamp_arcane_sigil(ex, 64, 56, kind="diamond", require_opaque=True)
            ex = seal_selout_border(ex, margin=2)
            cells.append(grid_to_cell512(ex))

        else:
            # HEART_CORE (7,3) @ 128x128
            g128 = np.zeros((128, 128, 4), dtype=np.uint8)
            cx, cy = 63.5, 63.5
            for y in range(22, 106):
                for x in range(22, 106):
                    nx = (x - cx) / 34.0
                    ny = (y - cy) / 34.0
                    r = np.hypot(nx, ny)
                    ang = np.arctan2(ny, nx)
                    facet = 0.80 + 0.14 * np.cos(ang * 4.0) + 0.08 * np.sin(ang * 7.0 + 0.6)
                    if r <= facet:
                        g128[y, x, 3] = 255
                        bayer = (BAYER_4X4[y & 3, x & 3] - 0.5) * 0.16
                        heat = (1.0 - r / max(0.2, facet)) + bayer
                        if r <= 0.24 or heat >= 0.78:
                            c = EX_PALETTE[22]
                        elif heat >= 0.58:
                            c = EX_PALETTE[21]
                        elif heat >= 0.40:
                            c = EX_PALETTE[20]
                        elif heat >= 0.25:
                            c = EX_PALETTE[18]
                        elif heat >= 0.12:
                            c = EX_PALETTE[24] if ((x + y) & 1 == 0) else EX_PALETTE[23]
                        else:
                            c = EX_PALETTE[2]
                        g128[y, x, :3] = c
            ex = seal_selout_border(g128, margin=2)
            cells.append(grid_to_cell512(ex))

    return cells


def build_boss_portrait_128(sheet: Image.Image) -> Image.Image:
    """
    Renders a crisp native `128x128` Neo-Vision EX pixel-art portrait for `assets/sprites/boss_archfiend_portrait.png`
    with crisp 2px Selout contours, fierce glowing eyes, sculpted horned skull & Sovereign Crown,
    gilded obsidian-indigo pauldrons, incandescent ribcage furnace, glowing arcane runes & abyssal aura (`0` emojis!).
    """
    W = 128
    canvas = np.zeros((W, W, 4), dtype=np.uint8)
    yy, xx = np.mgrid[0:W, 0:W]
    bayer = BAYER_4X4[(yy >> 1) & 3, (xx >> 1) & 3]

    # 1. Stepped Abyssal Violet-Indigo & Caldera Aura Backdrop
    dx = (xx - 63.5) / 58.0
    dy = (yy - 50.0) / 54.0
    rad = np.hypot(dx, dy)
    aura = (1.0 - np.clip(rad, 0.0, 1.0)) + (bayer - 0.5) * 0.14
    bg_rgb = np.zeros((W, W, 3), dtype=np.uint8)
    bg_rgb[:] = np.array([9, 7, 20], dtype=np.uint8)
    bg_rgb[aura >= 0.26] = np.array([22, 13, 46], dtype=np.uint8)
    bg_rgb[aura >= 0.48] = np.array([42, 17, 74], dtype=np.uint8)
    bg_rgb[aura >= 0.68] = np.array([72, 22, 102], dtype=np.uint8)

    heat_band = (yy >= 86) & ((yy - 86) / 42.0 + (bayer - 0.5) * 0.22 > 0.36)
    bg_rgb[heat_band] = np.array([56, 13, 32], dtype=np.uint8)
    hot_band = (yy >= 104) & ((yy - 104) / 24.0 + (bayer - 0.5) * 0.24 > 0.52)
    bg_rgb[hot_band] = np.array([108, 22, 30], dtype=np.uint8)

    canvas[:, :, :3] = bg_rgb
    canvas[:, :, 3] = 255

    # 2. Composite Malphas Bust tightly at exact 2:1 integer scale (`256x256 -> 128x128`, 0 fractional skips!)
    stage = Image.new("RGBA", (256, 256), (0, 0, 0, 0))

    def crop_cell(c: int, r: int, sz: int) -> Image.Image:
        cell = sheet.crop((c * 512, r * 512, (c + 1) * 512, (r + 1) * 512))
        return cell.resize((sz, sz), Image.Resampling.NEAREST)

    # At tsz=368 (or 384 -> 3*128 exact!), skull & crown & pauldrons & furnace fill 256x256 cleanly!
    tx, ty, tsz = -52, 0, 384
    stage.alpha_composite(crop_cell(3, 2, 310), (tx + 251, ty - 29))              # Right Wing arch
    stage.alpha_composite(crop_cell(1, 2, 326), (tx - 195, ty - 33))              # Left Wing arch
    stage.alpha_composite(crop_cell(6, 3, 192), (tx + 178 - 96, ty + 44 - 100))   # Sovereign Eclipse Crown Crest
    stage.alpha_composite(crop_cell(4, 0, tsz), (tx, ty))                         # Rear Pauldron
    stage.alpha_composite(crop_cell(2, 0, tsz), (tx, ty))                         # Torso Furnace Beat B
    stage.alpha_composite(crop_cell(6, 0, tsz), (tx, ty))                         # Horned Demon Skull
    stage.alpha_composite(crop_cell(7, 0, tsz), (tx, ty + 8))                     # Lower Jaw
    stage.alpha_composite(crop_cell(5, 0, tsz), (tx, ty))                         # Front Pauldron

    # Exact 2:1 integer shrink `256x256 -> 128x128` (zero jagged row skips!)
    bust128 = np.array(stage.resize((W, W), Image.Resampling.NEAREST), dtype=np.uint8)
    fg = bust128[:, :, 3] > 128

    # Clean 1px + thicker Selout separation against aura backdrop
    up = np.zeros_like(fg); up[1:, :] = fg[:-1, :]
    dn = np.zeros_like(fg); dn[:-1, :] = fg[1:, :]
    lt = np.zeros_like(fg); lt[:, 1:] = fg[:, :-1]
    rt = np.zeros_like(fg); rt[:, :-1] = fg[:, 1:]
    fg_selout = (~fg) & (up | dn | lt | rt)

    canvas[fg_selout, :3] = SELOUT_RGB
    canvas[fg, :3] = bust128[fg, :3]

    # 3. Hand-tuned 128x128 Portrait Signature Glow: crisp symmetrical eyes + forehead gem + floating embers
    # At tx=-52, ty=0, tsz=384 -> stage/2 (128x128): scale = 1.5x of 128-grid, offset (-26, 0)!
    # Skull eye centers in 128-grid: (50.5, 31) & (57.5, 30) -> in 128-portrait: x = -26 + 50.5*1.5 = 50, y = 46!
    for ex_c, ey_c in ((50, 46), (60, 45)):
        for dy_e in range(-1, 2):
            for dx_e in range(-2, 3):
                px, py = ex_c + dx_e, ey_c + dy_e
                if 2 <= px < W - 2 and 2 <= py < W - 2 and fg[py, px]:
                    if abs(dx_e) <= 1 and dy_e == 0:
                        canvas[py, px, :3] = EX_PALETTE[22] if dx_e == 0 else EX_PALETTE[21]
                    elif abs(dx_e) <= 1:
                        canvas[py, px, :3] = EX_PALETTE[19]
                    else:
                        canvas[py, px, :3] = EX_PALETTE[18]

    for ex_p, ey_p, sz_p, pal_idx in (
        (14, 24, 2, 24), (18, 22, 1, 25),
        (110, 26, 2, 20), (112, 24, 1, 21),
        (10, 74, 2, 19), (116, 72, 2, 24),
        (20, 114, 2, 21), (106, 112, 2, 19),
        (34, 12, 2, 23), (94, 14, 2, 21),
    ):
        for dy_e in range(sz_p):
            for dx_e in range(sz_p):
                py, px = ey_p + dy_e, ex_p + dx_e
                if 2 <= py < W - 2 and 2 <= px < W - 2 and not fg[py, px] and not fg_selout[py, px]:
                    canvas[py, px, :3] = EX_PALETTE[pal_idx]

    # Crisp 2px obsidian + subtle 1px gilded corner accents on portrait frame?
    # Keep edge clean dark obsidian Selout 1px so HTML portrait border never clashes!
    canvas[0, :, :3] = SELOUT_RGB
    canvas[-1, :, :3] = SELOUT_RGB
    canvas[:, 0, :3] = SELOUT_RGB
    canvas[:, -1, :3] = SELOUT_RGB

    return Image.fromarray(canvas, mode="RGBA")


def audit_sheet(sheet: Image.Image) -> tuple[int, int, float]:
    full_np = np.array(sheet, dtype=np.uint8)
    border_clips = 0
    empty_cells = 0
    for row in range(4):
        for col in range(8):
            cell_a = full_np[row * 512 : (row + 1) * 512, col * 512 : (col + 1) * 512, 3]
            if not np.any(cell_a > 0):
                empty_cells += 1
                print(f"[WARN] Empty cell ({col}, {row})!")
            if (
                np.any(cell_a[:4, :] > 0)
                or np.any(cell_a[-4:, :] > 0)
                or np.any(cell_a[:, :4] > 0)
                or np.any(cell_a[:, -4:] > 0)
            ):
                border_clips += 1
                print(f"[WARN] Border clip in cell ({col}, {row})!")

    assert empty_cells == 0, f"Empty cells detected: {empty_cells}"
    assert border_clips == 0, f"Border clips detected: {border_clips}"

    semi_alpha = int(np.sum((full_np[:, :, 3] > 0) & (full_np[:, :, 3] < 255)))
    assert semi_alpha == 0, f"Semi-transparent pixels detected: {semi_alpha}"

    bh, bw = 2048 // 4, 4096 // 4
    reshaped = full_np.reshape(bh, 4, bw, 4, 4)
    ref = reshaped[:, 0:1, :, 0:1, :]
    active = np.any(reshaped[:, :, :, :, 3] > 0, axis=(1, 3))
    exact = np.all(reshaped == ref, axis=(1, 3, 4))
    block4x4 = float(np.sum(exact & active)) / float(max(1, np.sum(active)))
    assert block4x4 == 1.0, f"Expected 100.0% 4x4 block uniformity on boss_colossus_sheet, got {block4x4:.4f}"

    return border_clips, semi_alpha, block4x4


def write_contact_sheet(sheet: Image.Image, portrait: Image.Image, out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    dbg = Image.new("RGBA", (2048, 1180), (14, 16, 26, 255))
    dr = ImageDraw.Draw(dbg)
    half_sheet = sheet.resize((2048, 1024), Image.Resampling.NEAREST)
    for r in range(4):
        for c in range(8):
            bx, by = c * 256, r * 256
            bg = (22, 26, 40, 255) if (r + c) % 2 == 0 else (15, 18, 28, 255)
            dr.rectangle([bx, by, bx + 255, by + 255], fill=bg, outline=(52, 62, 94, 255))
    dbg.alpha_composite(half_sheet, (0, 0))
    for r in range(4):
        for c in range(8):
            dr.text((c * 256 + 6, r * 256 + 6), f"({c},{r})", fill=(253, 224, 71, 255))

    dr.rectangle([0, 1024, 2047, 1179], fill=(10, 12, 22, 255))
    dbg.alpha_composite(portrait, (24, 1038))
    dr.text((24, 1026), "PORTRAIT 128x128", fill=(253, 224, 71, 255))
    dbg.alpha_composite(portrait.resize((44, 44), Image.Resampling.NEAREST), (184, 1080))
    dr.text((178, 1064), "44x44 HUD", fill=(186, 230, 253, 255))

    comp = Image.new("RGBA", (220, 150), (12, 14, 24, 255))
    def cblit(col, row, dx, dy, sz):
        im = sheet.crop((col * 512, row * 512, (col + 1) * 512, (row + 1) * 512)).resize((sz, sz), Image.Resampling.NEAREST)
        comp.alpha_composite(im, (dx, dy))
    tx, ty, ts = 42, -4, 136
    cblit(3, 2, tx + 89, ty - 10, 110)
    cblit(1, 2, tx - 69, ty - 12, 116)
    cblit(6, 3, tx + 63 - 32, ty + 16 - 33, 64)
    cblit(4, 0, tx, ty, ts)
    cblit(2, 0, tx, ty, ts)
    cblit(6, 0, tx, ty, ts)
    cblit(7, 0, tx, ty + 3, ts)
    cblit(5, 0, tx, ty, ts)
    cblit(0, 0, tx, ty, ts)
    cblit(4, 2, tx - 2, ty + 62, 70)
    cblit(0, 1, tx - 40, ty + 60, 75)
    dbg.alpha_composite(comp, (320, 1028))
    dr.text((320, 1026), "ASSEMBLED NEO-VISION EX MALPHAS", fill=(253, 224, 71, 255))

    dbg.convert("RGB").save(out_path, optimize=True)
    print(f"[OK] Saved contact sheet: {out_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Neo-Vision EX HD-2D Makeover for BEHEMOTH MALPHAS")
    parser.add_argument("--source-sheet", type=Path, default=SHEET_PATH, help="Input lossless boss_colossus_sheet.png")
    parser.add_argument("--contact-sheet", type=Path, default=None, help="Optional temporary contact sheet output path")
    args = parser.parse_args()

    assert args.source_sheet.exists(), f"Missing source boss sheet: {args.source_sheet}"
    raw_sheet = Image.open(args.source_sheet).convert("RGBA")
    assert raw_sheet.size == (4096, 2048), f"Expected 4096x2048 source sheet, got {raw_sheet.size}"

    out_sheet = Image.new("RGBA", (4096, 2048), (0, 0, 0, 0))
    row_builders = [
        upgrade_row0_cells,
        upgrade_row1_cells,
        upgrade_row2_cells,
        upgrade_row3_cells,
    ]
    for r_idx, builder in enumerate(row_builders):
        row_cells = builder(raw_sheet)
        for c_idx, cell_im in enumerate(row_cells):
            out_sheet.paste(cell_im, (c_idx * 512, r_idx * 512))

    border_clips, semi_alpha, block4x4 = audit_sheet(out_sheet)
    out_sheet.save(SHEET_PATH, format="PNG", optimize=True, compress_level=9)

    portrait = build_boss_portrait_128(out_sheet)
    p_np = np.array(portrait, dtype=np.uint8)
    assert portrait.size == (128, 128), f"Expected 128x128 portrait, got {portrait.size}"
    assert int(np.sum((p_np[:, :, 3] > 0) & (p_np[:, :, 3] < 255))) == 0, "Portrait has semi-transparent pixels"
    portrait.save(PORTRAIT_PATH, format="PNG", optimize=True, compress_level=9)

    sz_kb = SHEET_PATH.stat().st_size / 1024.0
    psz_kb = PORTRAIT_PATH.stat().st_size / 1024.0
    print(
        f"[OK] Saved {SHEET_PATH}: 4096x2048 RGBA ({sz_kb:.1f} KB), "
        f"border_clips={border_clips}, semi_alpha={semi_alpha}, 4x4={block4x4*100:.1f}%"
    )
    print(f"[OK] Saved {PORTRAIT_PATH}: 128x128 RGBA ({psz_kb:.1f} KB)")

    if args.contact_sheet is not None:
        write_contact_sheet(out_sheet, portrait, args.contact_sheet)


if __name__ == "__main__":
    main()
