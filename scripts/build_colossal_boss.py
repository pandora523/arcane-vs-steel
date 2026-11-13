#!/usr/bin/env python3
"""
Builds the Giant Left-Side Colossal Boss HD-2D Atlas & Portrait for Adventure Mode Zone IV:
  - `assets/sprites/boss_colossus_sheet.png` (2048x512 = 4 cells x 512x512, authored at 256x256 -> 2x NEAREST)
      Cell 0: Colossal Sovereign Torso, Horned Skull, Cathedral Pauldrons & Molten Heart Core (facing +X RIGHT)
      Cell 1: Overcharged / Roaring / Exposed Blazing Core Sovereign Torso (facing +X RIGHT)
      Cell 2: Colossal Horizontal Open Raking Siege-Claw Gauntlet (pointing +X RIGHT)
      Cell 3: Colossal Vertical Downward-Slamming Runic Siege-Fist
  - `assets/sprites/boss_archfiend_portrait.png` (128x128 NEAREST, MedianFilter(5) + 20-color FASTOCTREE)
  - `debug_colossal_boss_showcase.png` (mandatory visual audit sheet)

Strictly follows `arcane-vs-steel-pipeline` Rules 1-4:
  - BFS border + enclosed white-pocket flood-fill + 3-pass anti-aliased fringe stripping (zero white halo)
  - Pre-downsample MedianFilter(size=5) cel-flattening
  - Hand-crafted 20-color Obsidian / Bronze / Crimson / Molten-Gold Master Palette quantization (zero dithering)
  - 2-pass cardinal orphan despeckling + interior pinhole fill
  - Crisp 1px `#0d0f1c` selective outline (Selout)
  - Zero boundary clipping (strict >= 6px transparent safety margin in 256x256, >= 12px in 512x512)
"""

import os
from collections import Counter, deque
from PIL import Image, ImageDraw, ImageFilter

ARTIFACT_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/b9d8130e-8764-4ace-8d4e-40f97049d6f1"
REPO_DIR = "/home/antigravity/pandora523/arcane-vs-steel"

SRC_TORSO = os.path.join(ARTIFACT_DIR, "boss_colossus_torso_1794526244460.jpg")
SRC_CLAW = os.path.join(ARTIFACT_DIR, "boss_colossus_claw_1794526243762.jpg")
SRC_FIST = os.path.join(ARTIFACT_DIR, "boss_colossus_fist_v2_1794526470907.jpg")
SRC_PORTRAIT = os.path.join(ARTIFACT_DIR, "boss_colossus_portrait_1794526377107.jpg")

OUT_SHEET = os.path.join(REPO_DIR, "assets/sprites/boss_colossus_sheet.png")
OUT_PORTRAIT = os.path.join(REPO_DIR, "assets/sprites/boss_archfiend_portrait.png")
DEBUG_OUT = os.path.join(ARTIFACT_DIR, "debug_colossal_boss_showcase.png")

SELOUT_RGB = (13, 15, 28)  # #0d0f1c

# Curated 20-Color Colossal Obsidian / Forged-Bronze / Hellfire-Magma Master Palette
MASTER_PALETTE = [
    SELOUT_RGB,        # 0: Deep Indigo-Black Selout
    (22, 20, 28),      # 1: Abyssal Obsidian Shadow
    (38, 35, 46),      # 2: Charred Basalt Dark
    (60, 55, 68),      # 3: Volcanic Iron Mid
    (88, 80, 94),      # 4: Horn / Skull Slate Light
    (122, 110, 122),   # 5: Bone / Rim Highlight
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
            # Reserve Selout index 0 for ultra-dark outline/crevice tones or explicit Selout pass
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

    # Seed from all 4 image borders
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

    # Also seed enclosed pure-white pockets (e.g. gaps between horns, claws, or crags)
    for y in range(2, h - 2, 2):
        for x in range(2, w - 2, 2):
            if bg[y][x]:
                continue
            r, g, b, _ = px[x, y]
            if r > 247 and g > 247 and b > 247:
                # Verify it's not a tiny warm flame highlight by checking local 3x3 average is neutral white
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

    # Apply alpha = 0 to background
    for y in range(h):
        for x in range(w):
            if bg[y][x]:
                px[x, y] = (0, 0, 0, 0)

    # 3-Pass Morphological Anti-Aliased Fringe Stripping (eliminates gray/white halo pixels)
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

    # Pre-downsample Cel-Flattening on RGB channels while preserving clean alpha mask
    rgb = Image.new("RGB", (w, h), (22, 20, 28))
    rgb.paste(im.convert("RGB"), mask=im.split()[3])
    rgb_flat = rgb.filter(ImageFilter.MedianFilter(size=5))
    alpha_flat = im.split()[3].filter(ImageFilter.MedianFilter(size=3))

    out = rgb_flat.convert("RGBA")
    out.putalpha(alpha_flat)
    return out


def build_quantized_cell_512(
    fg_rgba: Image.Image,
    logical_size: int = 256,
    pad: int = 8,
    enrage_boost: bool = False,
) -> Image.Image:
    """Crops tight bounds, fits into (logical_size - 2*pad), quantizes to MASTER_PALETTE, despeckles, Selouts, upscales 2x -> 512x512."""
    bbox = fg_rgba.getbbox()
    if not bbox:
        raise RuntimeError("Empty foreground image!")
    cropped = fg_rgba.crop(bbox)
    cw, ch = cropped.size

    avail = logical_size - pad * 2
    scale = min(avail / cw, avail / ch)
    tw = max(1, int(round(cw * scale)))
    th = max(1, int(round(ch * scale)))

    # Smooth intermediate downsample + crisp NEAREST snap onto 256x256 logical grid
    rgb_crop = cropped.convert("RGB").resize((tw, th), Image.Resampling.BILINEAR)
    a_crop = cropped.split()[3].resize((tw, th), Image.Resampling.NEAREST)

    ox = (logical_size - tw) // 2
    # Anchor torso near bottom margin so crags plant cleanly; center gauntlets/fists
    oy = logical_size - pad - th if th >= tw * 0.92 else (logical_size - th) // 2

    grid = [[-1] * logical_size for _ in range(logical_size)]
    rpx = rgb_crop.load()
    apx = a_crop.load()

    for y in range(th):
        for x in range(tw):
            if apx[x, y] < 128:
                continue
            r, g, b = rpx[x, y]
            if enrage_boost:
                # Surge molten veins, eyes, jaw, and exposed heart-core during Roar / Phase 2-3 / Vulnerable Core!
                if r > 135 and r > b + 35:
                    r = min(255, int(r * 1.18 + 18))
                    g = min(255, int(g * 1.24 + 16))
                    b = min(255, int(b * 1.08 + 6))
            grid[oy + y][ox + x] = nearest_palette_idx(r, g, b)

    # Interior 1px pinhole fill
    for y in range(1, logical_size - 1):
        for x in range(1, logical_size - 1):
            if grid[y][x] == -1:
                card = [grid[y - 1][x], grid[y + 1][x], grid[y][x - 1], grid[y][x + 1]]
                opaque = [c for c in card if c >= 0]
                if len(opaque) == 4:
                    grid[y][x] = Counter(opaque).most_common(1)[0][0]

    # 2-Pass Cardinal Orphan Despeckling (Rule 2)
    for _ in range(2):
        nxt = [row[:] for row in grid]
        for y in range(1, logical_size - 1):
            for x in range(1, logical_size - 1):
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
    for y in range(1, logical_size - 1):
        for x in range(1, logical_size - 1):
            if grid[y][x] >= 0:
                if (
                    grid[y - 1][x] < 0
                    or grid[y + 1][x] < 0
                    or grid[y][x - 1] < 0
                    or grid[y][x + 1] < 0
                ):
                    outlined[y][x] = 0

    logical_img = Image.new("RGBA", (logical_size, logical_size), (0, 0, 0, 0))
    lpx = logical_img.load()
    clip_violations = 0
    for y in range(logical_size):
        for x in range(logical_size):
            idx = outlined[y][x]
            if idx >= 0:
                if x < 4 or x >= logical_size - 4 or y < 4 or y >= logical_size - 4:
                    clip_violations += 1
                r, g, b = MASTER_PALETTE[idx]
                lpx[x, y] = (r, g, b, 255)

    assert clip_violations == 0, f"Cell had {clip_violations} margin clip pixels!"
    return logical_img.resize((512, 512), Image.Resampling.NEAREST)


def build_portrait_128(src_path: str) -> Image.Image:
    """Rule 2 HUD Portrait pipeline: MedianFilter(size=5) + 20-color FASTOCTREE (dither=NONE) -> 128x128 NEAREST."""
    im = Image.open(src_path).convert("RGB")
    w, h = im.size
    # Frame upper bust & horned skull + glowing chest heart tightly for 128x128 HUD portrait
    crop_box = (int(w * 0.08), int(h * 0.02), int(w * 0.92), int(h * 0.86))
    im = im.crop(crop_box).filter(ImageFilter.MedianFilter(size=5))
    im_128 = im.resize((128, 128), Image.Resampling.NEAREST)
    quant = im_128.quantize(colors=20, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    return quant.convert("RGBA")


def main():
    torso_fg = extract_clean_foreground(SRC_TORSO)
    claw_fg = extract_clean_foreground(SRC_CLAW)
    fist_fg = extract_clean_foreground(SRC_FIST)

    cell0_torso = build_quantized_cell_512(torso_fg, logical_size=256, pad=8, enrage_boost=False)
    cell1_roar = build_quantized_cell_512(torso_fg, logical_size=256, pad=8, enrage_boost=True)
    cell2_claw = build_quantized_cell_512(claw_fg, logical_size=256, pad=10, enrage_boost=False)
    cell3_fist = build_quantized_cell_512(fist_fg, logical_size=256, pad=10, enrage_boost=False)

    sheet = Image.new("RGBA", (2048, 512), (0, 0, 0, 0))
    cells = [
        ("CELL 0: SOVEREIGN TORSO (+X)", cell0_torso),
        ("CELL 1: OVERCHARGED CORE (+X)", cell1_roar),
        ("CELL 2: RAKING SIEGE-CLAW (+X)", cell2_claw),
        ("CELL 3: SLAMMING SIEGE-FIST", cell3_fist),
    ]
    for i, (_, cimg) in enumerate(cells):
        sheet.paste(cimg, (i * 512, 0))

    os.makedirs(os.path.dirname(OUT_SHEET), exist_ok=True)
    sheet.save(OUT_SHEET, optimize=True)
    print(f"[OK] Wrote {OUT_SHEET} ({sheet.width}x{sheet.height}, 20-color Master Palette, 0 clips)")

    portrait = build_portrait_128(SRC_PORTRAIT)
    portrait.save(OUT_PORTRAIT, optimize=True)
    print(f"[OK] Wrote {OUT_PORTRAIT} ({portrait.width}x{portrait.height})")

    # Build Mandatory Debug Showcase Sheet (`debug_colossal_boss_showcase.png`)
    dbg = Image.new("RGBA", (1520, 920), (10, 12, 22, 255))
    draw = ImageDraw.Draw(dbg)

    # Top Row: All 4 512x512 cells displayed at 340x340 over checkerboard to prove ZERO white halos
    for i, (title, cimg) in enumerate(cells):
        x0 = 24 + i * 372
        y0 = 38
        # Checkerboard transparency verification backdrop
        for cy in range(0, 340, 20):
            for cx in range(0, 340, 20):
                col = (24, 28, 42, 255) if ((cx // 20 + cy // 20) % 2 == 0) else (16, 19, 30, 255)
                draw.rectangle([x0 + cx, y0 + cy, x0 + cx + 19, y0 + cy + 19], fill=col)
        prev = cimg.resize((340, 340), Image.Resampling.NEAREST)
        dbg.alpha_composite(prev, (x0, y0))
        draw.rectangle([x0 - 1, y0 - 1, x0 + 340, y0 + 340], outline=(212, 175, 55, 255), width=2)
        draw.text((x0 + 6, y0 - 20), title, fill=(254, 240, 138, 255))

    # Bottom Left: Live Left-Side Arena Scale Mockup (Colossal Boss on LEFT facing RIGHT vs Sol 208x208 scale!)
    arena_x, arena_y, arena_w, arena_h = 24, 418, 1080, 476
    draw.rectangle([arena_x, arena_y, arena_x + arena_w, arena_y + arena_h], fill=(18, 10, 16, 255), outline=(239, 68, 68, 255), width=2)
    # 2.5D Road band
    draw.rectangle([arena_x + 2, arena_y + 235, arena_x + arena_w - 2, arena_y + 445], fill=(34, 24, 32, 255))
    draw.text((arena_x + 14, arena_y + 10), "ZONE IV SCALE AUDIT: HUGE COLOSSAL BOSS ON LEFT SIDE FACING RIGHT (+X) VS PLAYER SCALE", fill=(254, 240, 138, 255))

    # Composite Giant Boss on LEFT side
    rear_claw = cell2_claw.resize((230, 230), Image.Resampling.NEAREST)
    torso_big = cell0_torso.resize((440, 440), Image.Resampling.NEAREST)
    front_claw = cell2_claw.resize((256, 256), Image.Resampling.NEAREST)
    slam_fist = cell3_fist.resize((236, 236), Image.Resampling.NEAREST)

    dbg.alpha_composite(rear_claw, (arena_x + 210, arena_y + 135))
    dbg.alpha_composite(torso_big, (arena_x + 8, arena_y + 26))
    dbg.alpha_composite(front_claw, (arena_x + 230, arena_y + 235))
    # Show slamming fist over right-center road lane
    draw.ellipse([arena_x + 640, arena_y + 340, arena_x + 830, arena_y + 392], outline=(250, 204, 21, 255), width=3)
    dbg.alpha_composite(slam_fist, (arena_x + 618, arena_y + 92))

    # Load Ignis Sol's Idle Frame 0 at real 1x (208x208) on the right side for exact scale comparison!
    sol_sheet_path = os.path.join(REPO_DIR, "assets/sprites/mage_sheet.png")
    if os.path.exists(sol_sheet_path):
        sol_sheet = Image.open(sol_sheet_path).convert("RGBA")
        sol_f0 = sol_sheet.crop((0, 0, 208, 208)).transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        dbg.alpha_composite(sol_f0, (arena_x + 820, arena_y + 205))
        draw.text((arena_x + 862, arena_y + 420), "IGNIS SOL (1x)", fill=(56, 189, 248, 255))

    # Bottom Right: 128x128 HUD Portrait at 2x (256x256) + 1x (128x128)
    px0, py0 = 1144, 442
    p2x = portrait.resize((256, 256), Image.Resampling.NEAREST)
    dbg.alpha_composite(p2x, (px0, py0))
    draw.rectangle([px0 - 2, py0 - 2, px0 + 257, py0 + 257], outline=(239, 68, 68, 255), width=2)
    draw.text((px0, py0 - 20), "HUD PORTRAIT (2x & 1x 128x128)", fill=(254, 240, 138, 255))
    dbg.alpha_composite(portrait, (px0 + 64, py0 + 280))
    draw.rectangle([px0 + 63, py0 + 279, px0 + 192, py0 + 408], outline=(212, 175, 55, 255), width=2)

    dbg.save(DEBUG_OUT)
    print(f"[OK] Wrote {DEBUG_OUT} ({dbg.width}x{dbg.height})")


if __name__ == "__main__":
    main()
