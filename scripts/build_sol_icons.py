#!/usr/bin/env python3
"""
Builds Ignis Sol's 7 HD-2D Pixel-Art Skill & Action Icons (`assets/sprites/mage_icons.png`, 448x64 = 7 x 64x64):
  Cell 0: attack    — Solar Fireball
  Cell 1: skill     — Triple Solar Pillar
  Cell 2: overdrive — Eclipse Supernova
  Cell 3: ultimate  — Heavensfall Astral Meteor
  Cell 4: dodge     — Arcane Flame-Blink
  Cell 5: jump      — Solar Phoenix Vault
  Cell 6: crouch    — Flame Ward Sun-Crest Shield

Pipeline (per arcane-vs-steel-pipeline Rule #2):
  1. Pre-downsample MedianFilter(size=5) cel-flattening on 1024x1024 reference art
  2. Crisp LANCZOS downsample to 64x64 icon cell (with subtle zoom/crop so emblem fills circular orb)
  3. Hand-crafted 28-color Solar/Astral HD-2D Master Palette quantization (zero dithering)
  4. 2-Pass Cardinal Orphan Despeckling (eliminates 1px confetti noise)
  5. Outputs `assets/sprites/mage_icons.png` (448x64) + `debug_sol_icons_showcase.png` audit sheet
"""

import math
import os
from collections import Counter
from PIL import Image, ImageDraw, ImageFilter

ARTIFACT_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/b9d8130e-8764-4ace-8d4e-40f97049d6f1"
OUT_SHEET = "/home/antigravity/pandora523/arcane-vs-steel/assets/sprites/mage_icons.png"
DEBUG_OUT = os.path.join(ARTIFACT_DIR, "debug_sol_icons_showcase.png")

ICON_SPECS = [
    ("attack", "FIRE", "sol_icon_attack_1794523466362.jpg", (251, 146, 60)),
    ("skill", "PILLAR", "sol_icon_skill_1794523467278.jpg", (232, 121, 249)),
    ("overdrive", "NOVA", "sol_icon_overdrive_1794523467508.jpg", (250, 204, 21)),
    ("ultimate", "METEOR", "sol_icon_ultimate_1794523470428.jpg", (103, 232, 249)),
    ("dodge", "BLINK", "sol_icon_dodge_1794523491999.jpg", (56, 189, 248)),
    ("jump", "VAULT", "sol_icon_jump_v2_1794523517726.jpg", (52, 211, 153)),
    ("crouch", "WARD", "sol_icon_crouch_1794523492507.jpg", (251, 191, 36)),
]

# Curated 28-color Solar / Magma / Forged-Gold / Astral-Rift HD-2D Master Palette
MASTER_PALETTE = [
    # Deep Void / Obsidian / Burgundy Backdrops (4)
    (6, 4, 12),
    (15, 7, 16),
    (28, 11, 20),
    (46, 15, 24),
    # Basalt / Meteor Rock / Shadowed Bronze (4)
    (26, 22, 30),
    (48, 34, 38),
    (78, 52, 46),
    (116, 76, 54),
    # Ruby / Crimson / Volcanic Magma Ramp (4)
    (88, 14, 20),
    (138, 20, 24),
    (194, 30, 26),
    (228, 52, 30),
    # Solar Flame Orange / Amber Ramp (4)
    (234, 88, 12),
    (249, 115, 22),
    (251, 146, 60),
    (253, 186, 92),
    # Forged Gold / Corona Yellow / White-Hot Core Ramp (5)
    (161, 98, 7),
    (212, 148, 22),
    (250, 204, 21),
    (254, 240, 138),
    (255, 253, 244),
    # Astral Rift Cyan & Cosmic Violet Accents for Blink & Heavensfall Meteor (7)
    (10, 38, 66),
    (14, 92, 142),
    (14, 165, 233),
    (56, 219, 248),
    (186, 246, 255),
    (58, 24, 108),
    (139, 62, 212),
]


def nearest_palette_color(r: int, g: int, b: int):
    best_c = MASTER_PALETTE[0]
    best_d = 10**12
    for pr, pg, pb in MASTER_PALETTE:
        # Perceptual redmean-weighted RGB distance for crisp warm/cool separation
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
                # Preserve intentional tiny white-hot star/sparkle cores if very bright
                if c == (255, 253, 244):
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


def process_icon(src_path: str, cell_size: int = 64) -> Image.Image:
    im = Image.open(src_path).convert("RGB")
    w, h = im.size
    # Gentle 4% inset crop so circular orb masking frames the subject generously
    pad = int(min(w, h) * 0.035)
    im = im.crop((pad, pad, w - pad, h - pad))

    # Step 1: Pre-downsample cel-flattening to merge micro-gradients & JPEG mosquito noise
    im = im.filter(ImageFilter.MedianFilter(size=5))
    im_mid = im.resize((256, 256), Image.Resampling.BILINEAR).filter(ImageFilter.MedianFilter(size=3))
    im_small = im_mid.resize((cell_size, cell_size), Image.Resampling.LANCZOS)

    px = im_small.load()
    cx = (cell_size - 1) * 0.5
    cy = (cell_size - 1) * 0.5
    max_r = cell_size * 0.5

    # Step 2: Quantize to Master Palette with subtle outer rim vignette for crisp button contrast
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
            grid[y][x] = nearest_palette_color(r, g, b)

    # Step 3: 2-Pass Cardinal Orphan Despeckle
    grid = despeckle_grid(grid, cell_size, cell_size, passes=2)

    # Step 4: Crisp 1px dark Selout bezel on cell perimeter to prevent adjacent-cell UV seam bleed
    rim_dark = MASTER_PALETTE[0]
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
    cell = 64
    sheet = Image.new("RGBA", (cell * len(ICON_SPECS), cell), (0, 0, 0, 0))
    cells = []

    for idx, (slot, label, fname, rim_col) in enumerate(ICON_SPECS):
        src = os.path.join(ARTIFACT_DIR, fname)
        icon_img = process_icon(src, cell)
        sheet.paste(icon_img, (idx * cell, 0))
        cells.append((slot, label, icon_img, rim_col))

    os.makedirs(os.path.dirname(OUT_SHEET), exist_ok=True)
    sheet.save(OUT_SHEET, optimize=True)
    print(f"[OK] Wrote {OUT_SHEET} ({sheet.width}x{sheet.height})")

    # Build Debug Contact Sheet showing 3x Square Profile Icons + Circular Mobile Action-RPG Orbs
    pad = 24
    col_w = 216
    dbg_w = pad * 2 + col_w * len(cells)
    dbg_h = 470
    dbg = Image.new("RGBA", (dbg_w, dbg_h), (8, 11, 20, 255))
    draw = ImageDraw.Draw(dbg)

    for idx, (slot, label, icon_img, rim_col) in enumerate(cells):
        x0 = pad + idx * col_w
        cx = x0 + col_w // 2

        # 1. 3x NEAREST Square Preview (192x192)
        sq = icon_img.resize((192, 192), Image.Resampling.NEAREST)
        sq_x = cx - 96
        sq_y = 36
        draw.rectangle([sq_x - 3, sq_y - 3, sq_x + 194, sq_y + 194], outline=rim_col, width=2)
        dbg.paste(sq, (sq_x, sq_y))
        draw.text((sq_x + 4, sq_y - 18), f"#{idx} {slot.upper()} ({label})", fill=(248, 250, 252, 255))

        # 2. Circular Orb Preview at 2x (128x128) + Actual 1x (64x64)
        orb_big_sz = 128
        orb_big = icon_img.resize((orb_big_sz, orb_big_sz), Image.Resampling.NEAREST)
        mask_big = Image.new("L", (orb_big_sz, orb_big_sz), 0)
        ImageDraw.Draw(mask_big).ellipse([0, 0, orb_big_sz - 1, orb_big_sz - 1], fill=255)
        bx = x0 + 12
        by = 262
        dbg.paste(orb_big, (bx, by), mask_big)
        draw.ellipse([bx - 2, by - 2, bx + orb_big_sz + 1, by + orb_big_sz + 1], outline=(0, 0, 0, 255), width=4)
        draw.ellipse([bx - 1, by - 1, bx + orb_big_sz, by + orb_big_sz], outline=rim_col + (255,), width=3)

        # Actual 1x 64x64 orb next to it
        mask_1x = Image.new("L", (64, 64), 0)
        ImageDraw.Draw(mask_1x).ellipse([0, 0, 63, 63], fill=255)
        sx = bx + orb_big_sz + 14
        sy = by + 32
        dbg.paste(icon_img, (sx, sy), mask_1x)
        draw.ellipse([sx - 1, sy - 1, sx + 64, sy + 64], outline=rim_col + (255,), width=2)

    dbg.save(DEBUG_OUT)
    print(f"[OK] Wrote {DEBUG_OUT} ({dbg.width}x{dbg.height})")


if __name__ == "__main__":
    main()
