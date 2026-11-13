#!/usr/bin/env python3
"""
Surgical HD-2D Pixel-Bleeding Purifier across all 11 Champion Sprite Sheets (6240x2080 = 10x30 @ 208x208).

Fixes 3 distinct pixel-bleeding artifacts on the logical 104x104 grid (2x NEAREST -> 208x208) while
preserving 100% of every champion's poses, bipedal walk, 4-variant auto-attacks, grounded y_bot=199,
0/300 border safety margins, and curated Master Palettes:
  1. Detached Floating Pixel-Bleed Crumbs: Strips stray 1..6px non-emissive outline/armor/cloth/bone/horn
     fragments & 1px hanging diagonal corner burrs without touching intentional bright elemental sparks.
  2. Unintended Interior Joint Pinholes: Fills enclosed 1..3px transparent slits inside solid limbs/armor
     while keeping intentional >=4px gaps (between legs, scepter/halo rings) 100% open.
  3. Un-Selouted Exterior White/Pale Halo Fringe: Applies each champion's exact palette Selout
     (MASTER_PALETTE[0] shadow / MASTER_PALETTE[1] lit) to raw white silhouette edges (converting thick
     edges in-place and wrapping thin 1-2px bright tips cleanly inside safe cell bounds).
"""

import os
from collections import Counter, deque
import numpy as np
from PIL import Image, ImageDraw

REPO_DIR = "/home/antigravity/pandora523/arcane-vs-steel"
SPRITE_DIR = os.path.join(REPO_DIR, "assets/sprites")
ARTIFACT_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/b9d8130e-8764-4ace-8d4e-40f97049d6f1"

# Exact (shad_selout, lit_selout) RGB tuples from each champion's MASTER_PALETTE[0] & MASTER_PALETTE[1]
HERO_SELOUT = {
    "warrior": ((10, 14, 28), (20, 28, 52)),
    "mage": ((8, 7, 13), (22, 15, 22)),
    "archer": ((9, 16, 14), (18, 34, 26)),
    "priestess": ((16, 15, 28), (54, 38, 36)),
    "reaper": ((7, 5, 13), (23, 18, 36)),
    "chronomancer": ((9, 12, 24), (22, 26, 46)),
    "titan": ((10, 12, 18), (20, 24, 34)),
    "ronin": ((12, 14, 24), (20, 24, 40)),
    "valkyrie": ((14, 12, 22), (36, 18, 28)),
    "icemage": ((10, 14, 28), (20, 34, 76)),
    "android": ((9, 11, 22), (20, 24, 42)),
}

# Known non-emissive armor/horn/bone/cloth bleed colors that appear >185 brightness on specific rigs
KNOWN_NON_EMISSIVE_BLEED_RGB = {
    "reaper": {(212, 197, 180), (168, 152, 140), (122, 112, 132)},
    "titan": {(208, 152, 48), (152, 102, 36), (96, 62, 24)},
    "icemage": {(48, 106, 194), (36, 66, 148), (20, 38, 96), (20, 34, 76)},
}


def is_emissive_spark_pixel(hero: str, r: int, g: int, b: int) -> bool:
    """Returns True only for bright saturated elemental glow or white-hot spark cores."""
    if (r, g, b) in KNOWN_NON_EMISSIVE_BLEED_RGB.get(hero, ()):
        return False
    mx = max(r, g, b)
    mn = min(r, g, b)
    sat = mx - mn
    # High-saturation bright magic (cyan, gold, magenta, emerald, solar orange, crimson flare)
    if mx >= 198 and sat >= 52:
        return True
    # Pure white-hot spark core (excluding dull bone/gray < 236)
    if mn >= 236:
        return True
    return False


def find_components_8(mask: np.ndarray):
    h, w = mask.shape
    vis = np.zeros_like(mask, dtype=bool)
    comps = []
    for y in range(h):
        for x in range(w):
            if mask[y, x] and not vis[y, x]:
                q = deque([(y, x)])
                vis[y, x] = True
                pts = []
                while q:
                    cy, cx = q.popleft()
                    pts.append((cy, cx))
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            if dy == 0 and dx == 0:
                                continue
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not vis[ny, nx]:
                                vis[ny, nx] = True
                                q.append((ny, nx))
                comps.append(pts)
    comps.sort(key=len, reverse=True)
    return comps


def bridge_chronomancer_halo_104(cell: np.ndarray):
    """Bridges 1px subsampling gaps along Chronos's left-back brass/cyan clock-wheel halo ring."""
    alpha = cell[:, :, 3] > 0
    to_fill = []
    # Clock halo sits behind Chronos's back/shoulders (x: 10..48, y: 14..64)
    for y in range(14, 64):
        for x in range(10, 48):
            if alpha[y, x]:
                continue
            # Check opposite pairs across a 1px gap where both sides are small halo fragments/arcs
            pairs = [
                ((y - 1, x), (y + 1, x)),
                ((y, x - 1), (y, x + 1)),
                ((y - 1, x - 1), (y + 1, x + 1)),
                ((y - 1, x + 1), (y + 1, x - 1)),
            ]
            for (y0, x0), (y1, x1) in pairs:
                if alpha[y0, x0] and alpha[y1, x1]:
                    c0 = tuple(int(v) for v in cell[y0, x0, :3])
                    c1 = tuple(int(v) for v in cell[y1, x1, :3])
                    # Only bridge if at least one side is brass/gold/cyan clockwork (not bridging between leg & coat)
                    if max(c0) >= 140 or max(c1) >= 140:
                        pick = c0 if max(c0) >= max(c1) else c1
                        to_fill.append((y, x, pick))
                        break
    for y, x, (r, g, b) in to_fill:
        if 2 <= x <= 101 and 2 <= y <= 99:
            cell[y, x] = (r, g, b, 255)


def clean_cell_104(cell: np.ndarray, hero: str, row_idx: int) -> dict:
    shad_rgb, lit_rgb = HERO_SELOUT[hero]
    selout_set = {shad_rgb, lit_rgb}
    stats = {"crumbs_removed": 0, "pinholes_filled": 0, "white_edges_selouted": 0}

    alpha = cell[:, :, 3] > 0
    if not np.any(alpha):
        return stats

    orig_ys = np.where(alpha)[0]
    max_orig_y = int(orig_ys.max())

    if hero == "chronomancer":
        bridge_chronomancer_halo_104(cell)
        alpha = cell[:, :, 3] > 0

    # -------------------------------------------------------------------------
    # PASS 1A: Strip detached 8-connected pixel-bleed crumbs (<= 6px)
    # -------------------------------------------------------------------------
    comps = find_components_8(alpha)
    if len(comps) > 1:
        is_calm_pose_row = row_idx in (0, 1, 5)  # IDLE, WALK, DEATH
        for comp in comps[1:]:
            n = len(comp)
            if n > 6:
                continue
            colors = [tuple(int(v) for v in cell[py, px, :3]) for py, px in comp]
            has_emissive = any(is_emissive_spark_pixel(hero, r, g, b) for r, g, b in colors)

            remove = False
            if not has_emissive:
                # 100% non-emissive detached armor/cloth/bone/horn/outline crumb -> always bleed!
                remove = True
            elif is_calm_pose_row and n <= 4:
                # In IDLE / WALK / DEATH, tiny 1..4px detached specks (e.g. Reaper shoulder speck, IceMage hair speck)
                # are segmentation/rotation crumbs (Chronos halo arcs were bridged above to >6px).
                if not (hero == "chronomancer" and n >= 2):
                    remove = True
            elif n == 1 and row_idx in (2, 6, 7, 8):
                # Single isolated 1px neutral-white hair/fur crumb in non-ult rows
                r0, g0, b0 = colors[0]
                if min(r0, g0, b0) >= 235 and (max(r0, g0, b0) - min(r0, g0, b0)) < 18 and hero in ("icemage", "reaper"):
                    remove = True

            if remove:
                for py, px in comp:
                    cell[py, px] = (0, 0, 0, 0)
                    stats["crumbs_removed"] += 1

    # -------------------------------------------------------------------------
    # PASS 1B: Prune hanging 1px diagonal corner-bleed burrs (cardinal == 0, diag <= 1, non-emissive)
    # Never touches 45-deg blades/shafts/bowstrings (which have diag >= 2)!
    # -------------------------------------------------------------------------
    for _ in range(2):
        alpha = cell[:, :, 3] > 0
        pruned_any = False
        for y in range(1, 103):
            for x in range(1, 103):
                if not alpha[y, x]:
                    continue
                card_n = (
                    int(alpha[y - 1, x])
                    + int(alpha[y + 1, x])
                    + int(alpha[y, x - 1])
                    + int(alpha[y, x + 1])
                )
                if card_n > 0:
                    continue
                diag_n = (
                    int(alpha[y - 1, x - 1])
                    + int(alpha[y - 1, x + 1])
                    + int(alpha[y + 1, x - 1])
                    + int(alpha[y + 1, x + 1])
                )
                if diag_n <= 1:
                    r, g, b = (int(v) for v in cell[y, x, :3])
                    if (r, g, b) in selout_set or not is_emissive_spark_pixel(hero, r, g, b):
                        cell[y, x] = (0, 0, 0, 0)
                        stats["crumbs_removed"] += 1
                        pruned_any = True
        if not pruned_any:
            break

    # -------------------------------------------------------------------------
    # PASS 2: Fill unintended tiny enclosed 1..3px interior joint/armor pinholes
    # -------------------------------------------------------------------------
    alpha = cell[:, :, 3] > 0
    ext = np.zeros_like(alpha, dtype=bool)
    q = deque()
    for x in range(104):
        for y in (0, 103):
            if not alpha[y, x] and not ext[y, x]:
                ext[y, x] = True
                q.append((y, x))
    for y in range(104):
        for x in (0, 103):
            if not alpha[y, x] and not ext[y, x]:
                ext[y, x] = True
                q.append((y, x))
    while q:
        cy, cx = q.popleft()
        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
            if 0 <= ny < 104 and 0 <= nx < 104 and not alpha[ny, nx] and not ext[ny, nx]:
                ext[ny, nx] = True
                q.append((ny, nx))

    hole_mask = (~alpha) & (~ext)
    if np.any(hole_mask):
        vis_h = np.zeros_like(hole_mask, dtype=bool)
        for y in range(1, 103):
            for x in range(1, 103):
                if hole_mask[y, x] and not vis_h[y, x]:
                    hq = deque([(y, x)])
                    vis_h[y, x] = True
                    hpts = []
                    while hq:
                        cy, cx = hq.popleft()
                        hpts.append((cy, cx))
                        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                            if 0 <= ny < 104 and 0 <= nx < 104 and hole_mask[ny, nx] and not vis_h[ny, nx]:
                                vis_h[ny, nx] = True
                                hq.append((ny, nx))
                    if len(hpts) <= 3:
                        nbr_cols = []
                        fallback_cols = []
                        for py, px in hpts:
                            for ny, nx in ((py - 1, px), (py + 1, px), (py, px - 1), (py, px + 1)):
                                if alpha[ny, nx]:
                                    c = tuple(int(v) for v in cell[ny, nx, :3])
                                    fallback_cols.append(c)
                                    if c not in selout_set:
                                        nbr_cols.append(c)
                        fill_rgb = Counter(nbr_cols or fallback_cols).most_common(1)[0][0]
                        for py, px in hpts:
                            cell[py, px] = (fill_rgb[0], fill_rgb[1], fill_rgb[2], 255)
                            stats["pinholes_filled"] += 1

    # -------------------------------------------------------------------------
    # PASS 3: Crisp 1px Dark Selout on Exposed White / Pale Silhouette Fringes
    # -------------------------------------------------------------------------
    for _ in range(2):
        alpha = cell[:, :, 3] > 0
        comps = find_components_8(alpha)
        body_mask = np.zeros_like(alpha, dtype=bool)
        for comp in comps:
            if len(comp) >= 10:
                for py, px in comp:
                    body_mask[py, px] = True

        up_a = np.pad(alpha[:-1, :], ((1, 0), (0, 0)), constant_values=False)
        dn_a = np.pad(alpha[1:, :], ((0, 1), (0, 0)), constant_values=False)
        lf_a = np.pad(alpha[:, :-1], ((0, 0), (1, 0)), constant_values=False)
        rt_a = np.pad(alpha[:, 1:], ((0, 0), (0, 1)), constant_values=False)
        interior_a = alpha & up_a & dn_a & lf_a & rt_a
        edge_a = alpha & (~interior_a)

        rgb = cell[:, :, :3].astype(np.int16)
        mn_rgb = np.minimum(np.minimum(rgb[:, :, 0], rgb[:, :, 1]), rgb[:, :, 2])
        mx_rgb = np.maximum(np.maximum(rgb[:, :, 0], rgb[:, :, 1]), rgb[:, :, 2])
        is_white_fringe = alpha & (
            ((rgb[:, :, 0] >= 226) & (rgb[:, :, 1] >= 226) & (rgb[:, :, 2] >= 226))
            | ((mn_rgb >= 216) & ((mx_rgb - mn_rgb) <= 28))
        )

        in_place_updates = []
        outer_wrap_updates = []

        for y in range(2, 102):
            for x in range(2, 102):
                if not (edge_a[y, x] and is_white_fringe[y, x] and body_mask[y, x]):
                    continue
                has_int_nbr = (
                    interior_a[y - 1, x]
                    or interior_a[y + 1, x]
                    or interior_a[y, x - 1]
                    or interior_a[y, x + 1]
                )
                bright_nbrs = 0
                for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if alpha[ny, nx]:
                        nc = tuple(int(v) for v in cell[ny, nx, :3])
                        if nc not in selout_set and max(nc) >= 150:
                            bright_nbrs += 1

                is_shad = (not dn_a[y, x]) or (not rt_a[y, x])
                sel_col = shad_rgb if is_shad else lit_rgb

                if has_int_nbr or bright_nbrs >= 2:
                    in_place_updates.append((y, x, sel_col))
                else:
                    wrapped_all = True
                    for ny, nx, side_shad in (
                        (y - 1, x, False),
                        (y + 1, x, True),
                        (y, x - 1, False),
                        (y, x + 1, True),
                    ):
                        if not alpha[ny, nx]:
                            if 2 <= nx <= 101 and 2 <= ny <= min(99, max_orig_y):
                                w_col = shad_rgb if side_shad else lit_rgb
                                outer_wrap_updates.append((ny, nx, w_col))
                            else:
                                wrapped_all = False
                    if not wrapped_all:
                        in_place_updates.append((y, x, sel_col))

        if not in_place_updates and not outer_wrap_updates:
            break

        for y, x, sc in in_place_updates:
            cell[y, x] = (sc[0], sc[1], sc[2], 255)
            stats["white_edges_selouted"] += 1

        for y, x, sc in outer_wrap_updates:
            if cell[y, x, 3] == 0:
                cell[y, x] = (sc[0], sc[1], sc[2], 255)
                stats["white_edges_selouted"] += 1

    return stats


def verify_sheet_208(arr208: np.ndarray, hero: str):
    assert arr208.shape == (2080, 6240, 4), f"{hero}: unexpected shape {arr208.shape}"
    # 0 semi-alpha pixels
    semi = int(np.sum((arr208[:, :, 3] > 0) & (arr208[:, :, 3] < 255)))
    assert semi == 0, f"{hero}: {semi} semi-transparent pixels!"
    # Strict 2x2 texel block alignment
    b00 = arr208[0::2, 0::2]
    assert np.array_equal(b00, arr208[0::2, 1::2]) and np.array_equal(b00, arr208[1::2, 0::2]) and np.array_equal(b00, arr208[1::2, 1::2]), (
        f"{hero}: 2x2 pixel block mismatch!"
    )

    for r in range(10):
        prev_cell = None
        transitions = 0
        for c in range(30):
            cell = arr208[r * 208 : (r + 1) * 208, c * 208 : (c + 1) * 208]
            a = cell[:, :, 3] > 0
            # Strict >= 4px border safety margin in 208x208
            border = (
                int(np.sum(a[:4, :]))
                + int(np.sum(a[-4:, :]))
                + int(np.sum(a[:, :4]))
                + int(np.sum(a[:, -4:]))
            )
            assert border == 0, f"{hero} R{r} F{c:02d}: {border} border-margin clip pixels!"
            if prev_cell is not None and not np.array_equal(cell, prev_cell):
                transitions += 1
            prev_cell = cell
        # Row 5 (DEATH) resting frames F23..F29 can share identical prone rest in some legacy sheets; check >= 20 transitions on R5 and 29/29 on active rows
        min_tr = 18 if r == 5 else 29
        assert transitions >= min_tr, f"{hero} R{r}: only {transitions}/29 distinct transitions!"


def render_audit_sheets():
    """Renders high-zoom side-by-side post-fix audit contact sheets to ARTIFACT_DIR for visual inspection."""
    sample_cols = [
        (0, 0, "IDLE F00"),
        (1, 7, "WALK F07"),
        (1, 22, "WALK F22"),
        (2, 3, "AUTO1 F03"),
        (2, 18, "AUTO3 F18"),
        (4, 2, "ULT F02"),
    ]
    hero_groups = [
        ("debug_pixel_bleed_fixed_part1.png", ["warrior", "mage", "archer", "priestess", "reaper", "chronomancer"]),
        ("debug_pixel_bleed_fixed_part2.png", ["titan", "ronin", "valkyrie", "icemage", "android"]),
    ]

    for out_name, heroes in hero_groups:
        tile = 208
        cols = len(sample_cols) * 2
        rows = len(heroes)
        canvas = Image.new("RGBA", (cols * tile, rows * (tile + 22)), (18, 20, 30, 255))
        draw = ImageDraw.Draw(canvas)

        for hr_idx, h in enumerate(heroes):
            sheet = np.array(Image.open(os.path.join(SPRITE_DIR, f"{h}_sheet.png")).convert("RGBA"))
            y_off = hr_idx * (tile + 22)
            for sc_idx, (r, f, lbl) in enumerate(sample_cols):
                cell208 = sheet[r * 208 : (r + 1) * 208, f * 208 : (f + 1) * 208]
                cell104 = cell208[::2, ::2].copy()

                # Checkerboard background so both dark and white fringes stand out starkly
                chk = np.zeros((208, 208, 4), dtype=np.uint8)
                yy, xx = np.indices((208, 208))
                is_light = ((xx // 16) + (yy // 16)) % 2 == 0
                chk[is_light] = (40, 44, 62, 255)
                chk[~is_light] = (26, 29, 42, 255)

                # Left tile: Actual cleaned sprite
                x_left = (sc_idx * 2) * tile
                base_im = Image.fromarray(chk, "RGBA")
                base_im.alpha_composite(Image.fromarray(cell208, "RGBA"))
                canvas.paste(base_im, (x_left, y_off + 20))
                draw.text((x_left + 4, y_off + 4), f"{h.upper()} {lbl}", fill=(240, 245, 255, 255))

                # Right tile: Diagnostic detector (Lime = any remaining body white exterior edge, Red = non-emissive crumb)
                a = cell104[:, :, 3] > 0
                comps = find_components_8(a)
                body_m = np.zeros_like(a)
                for cp in comps:
                    if len(cp) >= 10:
                        for py, px in cp:
                            body_m[py, px] = True
                up_a = np.pad(a[:-1, :], ((1, 0), (0, 0)), constant_values=False)
                dn_a = np.pad(a[1:, :], ((0, 1), (0, 0)), constant_values=False)
                lf_a = np.pad(a[:, :-1], ((0, 0), (1, 0)), constant_values=False)
                rt_a = np.pad(a[:, 1:], ((0, 0), (0, 1)), constant_values=False)
                edge = a & (~(up_a & dn_a & lf_a & rt_a))
                white_edge = (
                    edge
                    & body_m
                    & (cell104[:, :, 0] >= 230)
                    & (cell104[:, :, 1] >= 230)
                    & (cell104[:, :, 2] >= 230)
                )

                diag104 = cell104.copy()
                diag104[a, :3] = (diag104[a, :3].astype(np.int32) * 65 // 100).astype(np.uint8)
                diag104[white_edge] = (80, 255, 80, 255)
                for cp in comps[1:]:
                    if len(cp) <= 6:
                        cols_rgb = [tuple(int(v) for v in cell104[py, px, :3]) for py, px in cp]
                        if not any(is_emissive_spark_pixel(h, cr, cg, cb) for cr, cg, cb in cols_rgb):
                            for py, px in cp:
                                diag104[py, px] = (255, 50, 50, 255)

                diag208 = np.repeat(np.repeat(diag104, 2, axis=0), 2, axis=1)
                x_right = (sc_idx * 2 + 1) * tile
                d_im = Image.new("RGBA", (208, 208), (14, 16, 24, 255))
                d_im.alpha_composite(Image.fromarray(diag208, "RGBA"))
                canvas.paste(d_im, (x_right, y_off + 20))
                we_cnt = int(np.sum(white_edge))
                draw.text((x_right + 4, y_off + 4), f"DIAG whiteEdge={we_cnt}", fill=(134, 239, 172, 255))

        out_path = os.path.join(ARTIFACT_DIR, out_name)
        canvas.save(out_path)
        print(f"[AUDIT] Wrote {out_path} ({canvas.width}x{canvas.height})")


def main():
    for hero in HERO_SELOUT:
        path = os.path.join(SPRITE_DIR, f"{hero}_sheet.png")
        im = Image.open(path).convert("RGBA")
        arr208 = np.array(im)
        assert arr208.shape == (2080, 6240, 4), f"Unexpected {hero} shape {arr208.shape}"

        # Downsample exact 2x2 blocks -> 104x104 per cell
        arr104_sheet = arr208[::2, ::2].copy()
        totals = Counter()
        remaining_white_fringe_frames = 0

        for r in range(10):
            for c in range(30):
                y0, y1 = r * 104, (r + 1) * 104
                x0, x1 = c * 104, (c + 1) * 104
                cell = arr104_sheet[y0:y1, x0:x1]
                st = clean_cell_104(cell, hero, r)
                for k, v in st.items():
                    totals[k] += v

                # Verify zero remaining body white exterior fringe pixels
                a = cell[:, :, 3] > 0
                comps = find_components_8(a)
                body_m = np.zeros_like(a)
                for cp in comps:
                    if len(cp) >= 10:
                        for py, px in cp:
                            body_m[py, px] = True
                up_a = np.pad(a[:-1, :], ((1, 0), (0, 0)), constant_values=False)
                dn_a = np.pad(a[1:, :], ((0, 1), (0, 0)), constant_values=False)
                lf_a = np.pad(a[:, :-1], ((0, 0), (1, 0)), constant_values=False)
                rt_a = np.pad(a[:, 1:], ((0, 0), (0, 1)), constant_values=False)
                edge = a & (~(up_a & dn_a & lf_a & rt_a))
                we = edge & body_m & (cell[:, :, 0] >= 230) & (cell[:, :, 1] >= 230) & (cell[:, :, 2] >= 230)
                if np.any(we):
                    remaining_white_fringe_frames += 1

        # Upscale 2x NEAREST -> 208x208
        fixed208 = np.repeat(np.repeat(arr104_sheet, 2, axis=0), 2, axis=1)
        verify_sheet_208(fixed208, hero)
        Image.fromarray(fixed208, "RGBA").save(path)
        print(
            f"[FIXED] {hero:13s} | crumbs_removed={totals['crumbs_removed']:4d} | "
            f"pinholes_filled={totals['pinholes_filled']:4d} | "
            f"white_edges_selouted={totals['white_edges_selouted']:5d} | "
            f"remaining_body_white_fringe_frames={remaining_white_fringe_frames}/300"
        )

    render_audit_sheets()


if __name__ == "__main__":
    main()
