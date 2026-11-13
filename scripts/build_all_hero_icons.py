#!/usr/bin/env python3
"""
Builds `assets/sprites/hero_icons_sheet.png` (`384x704` RGBA = `6 cols x 11 rows` of `64x64` cells)
upgrading ALL 10 remaining Champions (`warrior`, `archer`, `priestess`, `reaper`, `chronomancer`,
`titan`, `ronin`, `valkyrie`, `icemage`, `android`) + Colossal Boss `archfiend` Threat Icons
to match Ignis Sol's (`assets/sprites/mage_icons.png`, `448x64`) HD-2D 16-bit RPG icon standard!

Atlas Layout (`384 x 704`, `64x64` per cell):
  Rows `0..9` (`6` cells per champion):
    Col 0: `attack`    (Champion Select Slot 0 + Adventure Attack Orb)
    Col 1: `skill`     (Champion Select Slot 1 + Adventure Skill Orb)
    Col 2: `overdrive` (Champion Select Slot 2 + Adventure Overdrive Orb)
    Col 3: `ultimate`  (Champion Select Slot 3 Supreme `TRUE_ULTIMATE` + Adventure Ultimate Orb)
    Col 4: `dodge`     (Adventure 3D Evade Dash Orb)
    Col 5: `guard`     (Tactical Guard / Counter / Aerial Vault)

  Row Order (`HERO_ICON_ROWS`):
    0: `warrior`      (Aethelgard — Sovereign Rune Paladin)
    1: `archer`       (Sylvara — Sylvan Star-Huntress)
    2: `priestess`    (Seraphina — High Priestess)
    3: `reaper`       (Malakor — Arch-Reaper Sovereign)
    4: `chronomancer` (Chronos — Clock-Blade Sovereign)
    5: `titan`        (Torgar — Sovereign of the World-Forge)
    6: `ronin`        (Kaze-Maru — Stormblade Ronin)
    7: `valkyrie`     (Freyja — Dragon-Lance Valkyrie)
    8: `icemage`      (Lyra — Winter Empress)
    9: `android`      (VEX-09 — Cyber Valkyrie)
   10: `archfiend`    (Behemoth Malphas — Cols 0..3 Boss Threat Cards: Fist, Claw, Heart, Cataclysm)

Pipeline (per `arcane-vs-steel-pipeline` Rule #2 & Rule #4):
  1. Pre-downsample `MedianFilter(size=5)` -> `256x256` -> `MedianFilter(size=3)` cel-flattening
  2. Crisp `LANCZOS` downsample to `64x64` icon cell with centered square crop
  3. Per-champion curated 28-color stepped cel `MASTER_PALETTE` quantization (`zero dithering`)
  4. 2-pass cardinal orphan despeckling (eliminates 1px AI confetti speckles while preserving white-hot star cores)
  5. Crisp `1px` `MASTER_PALETTE[0]` dark perimeter bezel (`0` adjacent-cell UV seam bleed)
  6. Generates `debug_all_11_hero_icons_showcase.png` for mandatory `view_file` visual audit!
"""

import math
import os
from collections import Counter
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTIFACT_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/b9d8130e-8764-4ace-8d4e-40f97049d6f1"
OUT_SHEET = os.path.join(ROOT, "assets", "sprites", "hero_icons_sheet.png")
MAGE_SHEET = os.path.join(ROOT, "assets", "sprites", "mage_icons.png")
DEBUG_OUT = os.path.join(ARTIFACT_DIR, "debug_all_11_hero_icons_showcase.png")

CELL = 64


def hex_pal(hex_list):
    out = []
    for h in hex_list:
        s = h.lstrip("#")
        out.append((int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16)))
    return out


PALETTES = {
    "warrior": hex_pal([
        "#050814", "#091126", "#0f1e40", "#173163", "#1e448a",
        "#1f293d", "#374663", "#586d91", "#859bbd", "#bacce6", "#e6f0ff",
        "#074a7a", "#0c77b8", "#18a9e8", "#47d1ff", "#99ecff",
        "#4d3308", "#7d5510", "#b57e19", "#e0a829", "#fbd34d", "#fef3a6",
        "#ffffff", "#2563eb", "#3b82f6", "#7dd3fc", "#cbd5e1", "#94a3b8",
    ]),
    "archer": hex_pal([
        "#040f0b", "#071c15", "#0c2e22", "#124734", "#186649",
        "#2b1e10", "#4a3319", "#6e4c24", "#966932", "#bf8a43",
        "#543c0a", "#876312", "#bd8f1c", "#ebb92d", "#fde068", "#fff6b8",
        "#065f46", "#059669", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#d9fbe8",
        "#ffffff", "#14b8a6", "#5eead4", "#84cc16", "#bef264",
    ]),
    "priestess": hex_pal([
        "#0d0906", "#1a120b", "#2b1d10", "#422c16", "#5e3f1d",
        "#6e4711", "#996518", "#c78822", "#eba934", "#facc48", "#fde47e", "#fff7bf", "#ffffff",
        "#4a1525", "#7a223c", "#ad3457", "#db537a", "#f589a8", "#fbcfe8",
        "#064e3b", "#059669", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0",
        "#78716c", "#a8a29e", "#e7e5e4",
    ]),
    "reaper": hex_pal([
        "#07040d", "#11081f", "#1d0f36", "#2d1652", "#411f73",
        "#1a1b26", "#2f3245", "#4c516b", "#737a99", "#a3abc9", "#d5dcf2", "#ffffff",
        "#581c87", "#7e22ce", "#a855f7", "#c084fc", "#e879f9", "#f5d0fe",
        "#450a18", "#7a1128", "#b3193a", "#e11d48", "#fb3767", "#ff7aa2", "#ffd1df",
        "#9333ea", "#d946ef", "#fda4af",
    ]),
    "chronomancer": hex_pal([
        "#040d12", "#071921", "#0c2936", "#123d4f", "#19546b",
        "#2e1f0c", "#4d3514", "#73501e", "#9c6f2b", "#c7923c", "#ebb657", "#fcdb86", "#fff3bf",
        "#0b4f59", "#0e7480", "#149ca8", "#20c4cf", "#4be3eb", "#8ef5fa", "#ccfcff", "#ffffff",
        "#1e293b", "#334155", "#64748b", "#94a3b8", "#0284c7", "#38bdf8", "#bae6fd",
    ]),
    "titan": hex_pal([
        "#0d0705", "#1a0f0a", "#2b1910", "#402517", "#593420",
        "#171921", "#282c38", "#3d4354", "#596178", "#7d87a1", "#abb4cc",
        "#5c190c", "#942812", "#cc3d18", "#f25c1d", "#ff8426", "#ffad33", "#ffd45c", "#fff3a1", "#ffffff",
        "#064e3b", "#057a55", "#10b981", "#34d399", "#6ee7b7", "#b8fce0",
        "#784c12", "#b87a1c",
    ]),
    "ronin": hex_pal([
        "#050714", "#0a0f29", "#121a42", "#1b2861", "#263985",
        "#141624", "#262a40", "#404769", "#636d99", "#919cc9", "#c8d1f2",
        "#4a350a", "#785812", "#ab801d", "#dbb130", "#fae06b", "#fff5b8",
        "#094c8c", "#0e74cc", "#1ca3f7", "#52ccff", "#99e6ff", "#d9f7ff", "#ffffff",
        "#3730a3", "#4f46e5", "#818cf8", "#c7d2fe",
    ]),
    "valkyrie": hex_pal([
        "#0f0408", "#1f0810", "#360d1b", "#521428", "#731b37",
        "#8f1d38", "#bd2645", "#e63956", "#ff5c77", "#ff94a6",
        "#45210a", "#703810", "#9e5416", "#cf761d", "#f59e24", "#ffc642", "#ffe885", "#fff9c7", "#ffffff",
        "#291d24", "#4a3640", "#755966", "#a88796",
        "#b91c1c", "#ef4444", "#f97316", "#fb923c", "#fed7aa",
    ]),
    "icemage": hex_pal([
        "#040b1a", "#081733", "#0e2752", "#153b78", "#1e53a3",
        "#094a78", "#0e74ad", "#18a1db", "#3ec6f7", "#7ce2ff", "#baf2ff", "#e6fbff", "#ffffff",
        "#2e1452", "#4c2282", "#7035b5", "#9b54e6", "#c685ff", "#e8c2ff",
        "#6b21a8", "#a855f7", "#e879f9", "#f5d0fe",
        "#1e293b", "#475569", "#94a3b8", "#cbd5e1", "#e2e8f0",
    ]),
    "android": hex_pal([
        "#040612", "#080e26", "#0f1a42", "#172963", "#203b8a",
        "#1a2238", "#323f61", "#546691", "#8296c4", "#b8c9ed", "#e8f0ff", "#ffffff",
        "#004d66", "#007a99", "#00acc2", "#00dcfa", "#5ceeff", "#adffff",
        "#4d0830", "#800e4f", "#b81470", "#eb1e90", "#ff4da6", "#ff8cc6", "#ffcce6",
        "#2563eb", "#60a5fa", "#c084fc",
    ]),
    "archfiend": hex_pal([
        "#08040a", "#140914", "#24111f", "#361a2b",
        "#17141c", "#292430", "#40394a", "#5c5369", "#80758f", "#aba0ba",
        "#450a0f", "#731116", "#a6191c", "#d92b21", "#f74f25", "#ff7b29", "#ffab36", "#ffd95e", "#fff6a8", "#ffffff",
        "#2b160c", "#4d2713", "#753c1b", "#9e5424",
        "#581c87", "#9333ea", "#c084fc", "#fca5a5",
    ]),
}

HERO_SPECS = [
    ("warrior", "AETHELGARD", "icons_warrior_hd2d_1794569660763.jpg", (3, 2), (56, 189, 248)),
    ("archer", "SYLVARA", "icons_archer_hd2d_1794569663258.jpg", (3, 2), (52, 211, 153)),
    ("priestess", "SERAPHINA", "icons_priestess_hd2d_1794569667544.jpg", (3, 2), (253, 224, 71)),
    ("reaper", "MALAKOR", "icons_reaper_hd2d_1794569669420.jpg", (3, 2), (217, 70, 239)),
    ("chronomancer", "CHRONOS", "icons_chronomancer_hd2d_1794569671835.jpg", (3, 2), (45, 212, 191)),
    ("titan", "TORGAR", "icons_titan_hd2d_1794569672532.jpg", (3, 2), (245, 158, 11)),
    ("ronin", "KAZE-MARU", "icons_ronin_hd2d_1794569712499.jpg", (3, 2), (96, 165, 250)),
    ("valkyrie", "FREYJA", "icons_valkyrie_hd2d_1794569713324.jpg", (3, 2), (244, 63, 94)),
    ("icemage", "LYRA", "icons_icemage_hd2d_1794569721064.jpg", (3, 2), (103, 232, 249)),
    ("android", "VEX-09", "icons_android_hd2d_1794569725079.jpg", (3, 2), (0, 240, 255)),
    ("archfiend", "MALPHAS", "icons_boss_malphas_hd2d_1794569719240.jpg", (2, 2), (251, 146, 60)),
]

SLOT_LABELS = ["ATK", "SKILL", "DRIVE", "SUPREME", "DODGE", "GUARD"]


def nearest_palette_color(r: int, g: int, b: int, pal):
    best_c = pal[0]
    best_d = 10**12
    for pr, pg, pb in pal:
        rmean = (r + pr) >> 1
        dr = r - pr
        dg = g - pg
        db = b - pb
        d = (((512 + rmean) * dr * dr) >> 8) + 4 * dg * dg + (((767 - rmean) * db * db) >> 8)
        if d < best_d:
            best_d = d
            best_c = (pr, pg, pb)
    return best_c


def despeckle_grid(grid, w: int, h: int, passes: int = 2):
    cur = [row[:] for row in grid]
    for _ in range(passes):
        nxt = [row[:] for row in cur]
        for y in range(1, h - 1):
            for x in range(1, w - 1):
                c = cur[y][x]
                # Preserve intentional white-hot star/sparkle cores
                if c[0] >= 248 and c[1] >= 248 and c[2] >= 240:
                    continue
                card = [cur[y - 1][x], cur[y + 1][x], cur[y][x - 1], cur[y][x + 1]]
                same_card = sum(1 for nc in card if nc == c)
                if same_card == 0:
                    counts = Counter(card)
                    top_col, top_n = counts.most_common(1)[0]
                    if top_n >= 2:
                        nxt[y][x] = top_col
                elif same_card == 1:
                    counts = Counter(card)
                    top_col, top_n = counts.most_common(1)[0]
                    if top_col != c and top_n >= 3:
                        nxt[y][x] = top_col
        cur = nxt
    return cur


def process_tile_to_icon(tile_rgb: Image.Image, pal, cell_size: int = 64) -> Image.Image:
    tw, th = tile_rgb.size
    # Trim thin outer grid divider & center-crop exact square
    inset_x = int(tw * 0.042)
    inset_y = int(th * 0.042)
    cropped = tile_rgb.crop((inset_x, inset_y, tw - inset_x, th - inset_y))
    cw, ch = cropped.size
    side = min(cw, ch)
    sx0 = (cw - side) // 2
    sy0 = (ch - side) // 2
    sq = cropped.crop((sx0, sy0, sx0 + side, sy0 + side))

    # Step 1: Pre-downsample cel-flattening to eliminate micro-gradients & JPEG mosquito noise
    sq = sq.filter(ImageFilter.MedianFilter(size=5))
    mid = sq.resize((256, 256), Image.Resampling.BILINEAR).filter(ImageFilter.MedianFilter(size=3))
    small = mid.resize((cell_size, cell_size), Image.Resampling.LANCZOS)

    px = small.load()
    cx = (cell_size - 1) * 0.5
    cy = (cell_size - 1) * 0.5
    max_r = cell_size * 0.5

    # Step 2: Quantize to champion's hand-crafted 28-color Master Palette with subtle orb rim vignette
    grid = [[(0, 0, 0)] * cell_size for _ in range(cell_size)]
    for y in range(cell_size):
        for x in range(cell_size):
            r, g, b = px[x, y]
            dist = math.hypot(x - cx, y - cy) / max_r
            if dist > 0.82:
                vign = max(0.48, 1.0 - (dist - 0.82) * 1.45)
                r = int(r * vign)
                g = int(g * vign)
                b = int(b * vign)
            grid[y][x] = nearest_palette_color(r, g, b, pal)

    # Step 3: 2-Pass Cardinal Orphan Despeckle
    grid = despeckle_grid(grid, cell_size, cell_size, passes=2)

    # Step 4: Crisp 1px dark perimeter bezel to prevent adjacent-cell UV seam bleed
    rim_dark = pal[0]
    for i in range(cell_size):
        grid[0][i] = rim_dark
        grid[cell_size - 1][i] = rim_dark
        grid[i][0] = rim_dark
        grid[i][cell_size - 1] = rim_dark

    out = Image.new("RGBA", (cell_size, cell_size), (0, 0, 0, 255))
    opx = out.load()
    for y in range(cell_size):
        for x in range(cell_size):
            r, g, b = grid[y][x]
            opx[x, y] = (r, g, b, 255)
    return out


def main():
    cols_out = 6
    rows_out = len(HERO_SPECS)  # 11 rows (10 champions + row 10 Boss Malphas)
    atlas = Image.new("RGBA", (cols_out * CELL, rows_out * CELL), (0, 0, 0, 0))

    rendered_rows = []
    for r_idx, (hero_key, hero_name, fname, (g_cols, g_rows), rim_col) in enumerate(HERO_SPECS):
        src_path = os.path.join(ARTIFACT_DIR, fname)
        im = Image.open(src_path).convert("RGB")
        W, H = im.size
        pal = PALETTES[hero_key]

        row_icons = []
        total_tiles = g_cols * g_rows
        for idx in range(cols_out):
            src_idx = min(idx, total_tiles - 1)
            gc = src_idx % g_cols
            gr = src_idx // g_cols
            x0 = (W * gc) // g_cols
            x1 = (W * (gc + 1)) // g_cols
            y0 = (H * gr) // g_rows
            y1 = (H * (gr + 1)) // g_rows
            tile = im.crop((x0, y0, x1, y1))
            icon_img = process_tile_to_icon(tile, pal, CELL)
            atlas.paste(icon_img, (idx * CELL, r_idx * CELL))
            row_icons.append(icon_img)

        rendered_rows.append((hero_key, hero_name, row_icons, rim_col, total_tiles))

    os.makedirs(os.path.dirname(OUT_SHEET), exist_ok=True)
    atlas.save(OUT_SHEET, optimize=True)
    print(f"[OK] Wrote {OUT_SHEET} ({atlas.width}x{atlas.height}, {rows_out} rows x {cols_out} cols)")

    # Include Ignis Sol (`mage_icons.png`) in the visual showcase so all 11 champions + Boss are audited side-by-side!
    all_showcase_rows = []
    if os.path.exists(MAGE_SHEET):
        mage_im = Image.open(MAGE_SHEET).convert("RGBA")
        mage_icons = [mage_im.crop((i * 64, 0, (i + 1) * 64, 64)) for i in range(6)]
        all_showcase_rows.append(("mage", "IGNIS SOL", mage_icons, (251, 146, 60), 6))
    all_showcase_rows.extend(rendered_rows)

    # Render clean high-visibility contact sheet (`2x NEAREST` 128x128 Square + Circular Orb preview)
    left_label_w = 175
    col_step = 212
    row_step = 154
    pad = 24
    dbg_w = pad * 2 + left_label_w + cols_out * col_step
    dbg_h = pad * 2 + 34 + len(all_showcase_rows) * row_step
    dbg = Image.new("RGBA", (dbg_w, dbg_h), (8, 11, 20, 255))
    draw = ImageDraw.Draw(dbg)

    for c in range(cols_out):
        hx = pad + left_label_w + c * col_step + 16
        draw.text((hx, pad + 6), f"#{c} {SLOT_LABELS[c]}", fill=(226, 232, 240, 255))

    mask_orb = Image.new("L", (64, 64), 0)
    ImageDraw.Draw(mask_orb).ellipse([0, 0, 63, 63], fill=255)

    for r_idx, (h_key, h_name, icons, rim_col, valid_cnt) in enumerate(all_showcase_rows):
        ry = pad + 34 + r_idx * row_step
        draw.text((pad, ry + 42), f"{h_name}", fill=rim_col + (255,))
        draw.text((pad, ry + 62), f"({h_key})", fill=(148, 163, 184, 255))

        for c in range(cols_out):
            if c >= valid_cnt:
                continue
            cx = pad + left_label_w + c * col_step
            ic = icons[c]
            sq2 = ic.resize((112, 112), Image.Resampling.NEAREST)
            draw.rectangle([cx - 2, ry + 8, cx + 113, ry + 123], outline=rim_col + (255,), width=2)
            dbg.paste(sq2, (cx, ry + 10))

            # Circular 1x Adventure Orb preview right next to square card
            ox = cx + 124
            oy = ry + 34
            dbg.paste(ic, (ox, oy), mask_orb)
            draw.ellipse([ox - 1, oy - 1, ox + 64, oy + 64], outline=rim_col + (255,), width=2)

    dbg.save(DEBUG_OUT)
    print(f"[OK] Wrote {DEBUG_OUT} ({dbg.width}x{dbg.height})")


if __name__ == "__main__":
    main()
