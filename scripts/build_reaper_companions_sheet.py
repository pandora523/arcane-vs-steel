#!/usr/bin/env python3
"""
Builds Malakor's Summoned Death Companions 30fps HD-2D Sprite Sheet:
  - Output: assets/sprites/reaper_companions.png (6240 x 832, 4 rows x 30 cols @ 208x208)
  - Row 0: Abyssal Death-Mage (Vexis) — 30fps Levitating Lich Idle & Cloak Wave
  - Row 1: Abyssal Death-Mage (Vexis) — 30fps Dark-Magic Void Orb Invocation & Cast
  - Row 2: Ossuary Soul-Healer (Seraphel) — 30fps Ethereal Cleric Hover & Halo Shimmer
  - Row 3: Ossuary Soul-Healer (Seraphel) — 30fps Soul-Mend Channel & Prayer Pulse

Follows arcane-vs-steel-pipeline strictly:
  - Extracted from generate_image 16-bit HD-2D base sprites (reaper_mage_companion_base.jpg & reaper_healer_companion_base.jpg)
  - Multi-zone MedianFilter cel-flattening + clean part segmentation + robe under-hand infill (zero ghost hands!)
  - Curated 20-color Master Palettes + 2-pass orphan despeckling + crisp 1px dark Selout outline
  - Zero canvas shearing, zero border clipping across all 120 frames
"""

import os
import sys
import math
import numpy as np
from PIL import Image, ImageDraw

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, SCRIPT_DIR)

from hd2d_rig_core import (
    CELL,
    LOGICAL,
    COLS,
    poly_mask,
    clean_base_512,
    assign_remaining_geodesic,
    extract_parts_512,
    downsample_clean_104,
    quantize_and_cluster_104,
    rot_pt,
    paste_rotated_part,
    put_px,
    draw_line_104,
    draw_slash_arc_104,
)

ART_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/3a4b2cf8-05c2-45a3-bb65-af6f5b5a1088"
MAGE_BASE = os.path.join(ROOT_DIR, "assets", "sprites", "reaper_mage_companion_base.jpg")
HEALER_BASE = os.path.join(ROOT_DIR, "assets", "sprites", "reaper_healer_companion_base.jpg")
OUT_SHEET = os.path.join(ROOT_DIR, "assets", "sprites", "reaper_companions.png")

# Curated 20-Color Master Palette: Abyssal Death-Mage (Obsidian, Royal Violet, Bone-Ivory, Silver, Crimson-Magenta Glow)
MAGE_PALETTE = np.array(
    [
        [8, 5, 16],       # 0: Deep shadow Selout
        [18, 12, 32],     # 1: Lit Selout / deepest obsidian
        [30, 22, 48],     # 2: Dark obsidian cloth
        [48, 36, 72],     # 3: Mid obsidian-slate cloth
        [42, 20, 74],     # 4: Deep royal violet robe shadow
        [68, 32, 114],    # 5: Mid royal violet robe
        [98, 48, 156],    # 6: Lit violet robe
        [136, 68, 198],   # 7: Bright amethyst trim / magic mid
        [92, 22, 54],     # 8: Dark crimson robe trim
        [152, 34, 78],    # 9: Mid crimson-rose trim
        [214, 54, 112],   # 10: Bright crimson-magenta rune/eye
        [82, 76, 86],     # 11: Dark bone / tarnished iron
        [124, 118, 128],  # 12: Mid bone / silver shadow
        [168, 162, 166],  # 13: Lit bone / silver pauldron mid
        [212, 206, 196],  # 14: Bright skull ivory / pauldron highlight
        [242, 238, 232],  # 15: Specular bone/silver glint
        [186, 96, 246],   # 16: Luminous violet dark-magic core
        [236, 128, 252],  # 17: Hot orchid void spark
        [252, 196, 255],  # 18: Incandescent void core
        [255, 255, 255],  # 19: Pure white star-glint
    ],
    dtype=np.int32,
)

# Curated 20-Color Master Palette: Ossuary Soul-Healer (Obsidian, Parchment-Ivory, Silver Halo, Soul-Emerald & Amethyst)
HEALER_PALETTE = np.array(
    [
        [7, 9, 16],       # 0: Deep shadow Selout
        [18, 22, 34],     # 1: Lit Selout / deepest obsidian veil
        [32, 38, 54],     # 2: Dark obsidian vestment
        [54, 62, 82],     # 3: Mid slate-obsidian vestment
        [108, 100, 88],   # 4: Deep parchment-ivory shadow
        [154, 144, 126],  # 5: Mid warm bone-ivory robe
        [196, 186, 164],  # 6: Lit cream-ivory robe
        [228, 220, 202],  # 7: Bright ivory highlight
        [92, 98, 112],    # 8: Silver halo shadow
        [142, 150, 166],  # 9: Silver halo mid
        [196, 204, 218],  # 10: Silver halo bright
        [12, 92, 68],     # 11: Deep emerald stole shadow
        [20, 148, 104],   # 12: Rich soul-emerald stole mid
        [44, 206, 146],   # 13: Bright soul-emerald stole / eye glow
        [116, 244, 192],  # 14: Luminous mint-emerald heal aura
        [112, 84, 148],   # 15: Muted amethyst trim shadow
        [164, 132, 204],  # 16: Pale lavender-amethyst trim
        [208, 184, 242],  # 17: Soft lilac highlight
        [214, 254, 236],  # 18: Incandescent soul-mend core
        [255, 255, 255],  # 19: Pure white star-glint
    ],
    dtype=np.int32,
)


def infill_skirt_under_hand(arr512, hand_poly, sample_dx=22):
    """Replaces resting foreground hand/sleeve pixels on the skirt copy with adjacent lower robe shading so lifting the arm leaves zero hole or ghost hand."""
    out = arr512.copy()
    H, W = out.shape[:2]
    m = poly_mask(H, W, hand_poly) & (out[:, :, 3] > 0)
    ys, xs = np.where(m)
    for y, x in zip(ys, xs):
        found = None
        # Sample downward first (into smooth vertical robe pleats below belt cords), then inward
        for dy in (44, 56, 32, 68, 0):
            sy = min(H - 1, y + dy)
            for dx in (8, 16, 24, 0, 32):
                sx = min(W - 1, x + dx)
                if not m[sy, sx] and out[sy, sx, 3] > 180:
                    found = out[sy, sx]
                    break
            if found is not None:
                break
        if found is not None:
            out[y, x] = found
        else:
            out[y, x] = [0, 0, 0, 0]
    # Trim protruding left-hip sleeve cuff outside the natural A-line skirt silhouette
    for y in range(248, 325):
        max_left = int(round(202 - (y - 248) * 0.28))
        out[y, :max_left, :] = 0
    return out


def segment_mage():
    arr = clean_base_512(MAGE_BASE, preserve_pale_thighs=False, head_y_split=160)
    H, W = arr.shape[:2]
    alpha = arr[:, :, 3] > 0

    m_head = poly_mask(H, W, [(196, 36), (318, 36), (316, 144), (242, 152), (196, 122)])
    m_cape = poly_mask(H, W, [(106, 164), (186, 164), (184, 266), (176, 355), (144, 424), (106, 424)])
    m_r_arm = poly_mask(H, W, [(182, 166), (232, 174), (230, 342), (180, 342)])
    m_l_arm = poly_mask(H, W, [(304, 168), (366, 168), (366, 338), (308, 338)])
    m_torso = poly_mask(H, W, [(172, 118), (336, 118), (322, 274), (192, 274)]) & (~m_head) & (~m_r_arm) & (~m_l_arm)
    m_skirt = poly_mask(H, W, [(112, 266), (358, 266), (362, 502), (112, 502)]) & (~m_cape) & (~m_l_arm)

    # For skirt, allow full lower robe area INCLUDING behind r_arm hand (infilled!)
    skirt_infilled = infill_skirt_under_hand(
        arr,
        [(178, 248), (235, 248), (235, 345), (178, 345)],
        sample_dx=24,
    )
    m_skirt_full = poly_mask(H, W, [(112, 262), (358, 262), (362, 502), (112, 502)]) & (skirt_infilled[:, :, 3] > 0) & (~m_l_arm) & (~m_cape)

    assigned = assign_remaining_geodesic(
        alpha,
        [
            ("head", m_head),
            ("r_arm", m_r_arm),
            ("l_arm", m_l_arm),
            ("cape", m_cape),
            ("torso", m_torso),
            ("skirt", m_skirt),
        ],
    )
    mask_dict = dict(assigned)
    mask_dict["skirt"] = mask_dict["skirt"] | m_skirt_full

    parts = extract_parts_512(
        arr,
        [(k, mask_dict[k]) for k in ("cape", "l_arm", "skirt", "torso", "head", "r_arm")],
        custom_part_arrays={"skirt": skirt_infilled},
    )
    pivots = {
        "pelvis": (262.0, 268.0),
        "neck": (264.0, 140.0),
        "cape": (196.0, 174.0),
        "r_sh": (206.0, 174.0),
        "l_sh": (314.0, 176.0),
    }
    return parts, pivots


def segment_healer():
    arr = clean_base_512(HEALER_BASE, preserve_pale_thighs=True, head_y_split=162)
    H, W = arr.shape[:2]
    alpha = arr[:, :, 3] > 0

    m_head = poly_mask(H, W, [(192, 14), (318, 14), (316, 146), (200, 146)])
    m_cape = poly_mask(H, W, [(158, 250), (196, 250), (196, 362), (158, 362)])
    m_r_arm = poly_mask(H, W, [(184, 174), (235, 178), (236, 314), (184, 314)])
    m_l_arm = poly_mask(H, W, [(296, 176), (346, 176), (346, 308), (298, 308)])
    m_torso = poly_mask(H, W, [(184, 126), (316, 126), (308, 264), (196, 264)]) & (~m_head) & (~m_r_arm) & (~m_l_arm)
    m_skirt = poly_mask(H, W, [(164, 256), (332, 256), (332, 488), (164, 488)]) & (~m_cape) & (~m_l_arm)

    skirt_infilled = infill_skirt_under_hand(
        arr,
        [(184, 240), (237, 240), (237, 316), (184, 316)],
        sample_dx=20,
    )
    m_skirt_full = poly_mask(H, W, [(164, 254), (332, 254), (332, 488), (164, 488)]) & (skirt_infilled[:, :, 3] > 0) & (~m_l_arm) & (~m_cape)

    assigned = assign_remaining_geodesic(
        alpha,
        [
            ("head", m_head),
            ("r_arm", m_r_arm),
            ("l_arm", m_l_arm),
            ("cape", m_cape),
            ("torso", m_torso),
            ("skirt", m_skirt),
        ],
    )
    mask_dict = dict(assigned)
    mask_dict["skirt"] = mask_dict["skirt"] | m_skirt_full

    parts = extract_parts_512(
        arr,
        [(k, mask_dict[k]) for k in ("cape", "l_arm", "skirt", "torso", "head", "r_arm")],
        custom_part_arrays={"skirt": skirt_infilled},
    )
    pivots = {
        "pelvis": (256.0, 260.0),
        "neck": (256.0, 142.0),
        "cape": (196.0, 256.0),
        "r_sh": (210.0, 180.0),
        "l_sh": (302.0, 182.0),
    }
    return parts, pivots


def render_companion_cell(
    parts,
    pivots,
    palette,
    protect_indices,
    cfg,
    y_bot_base=496.0,
    window_S=576,
    draw_fx_104=None,
):
    canvas = Image.new("RGBA", (680, 620), (0, 0, 0, 0))
    OX, OY = 84, 46

    pelvis_src = pivots["pelvis"]
    pelvis_dst = (
        pelvis_src[0] + OX + cfg.get("pelvis_dx", 0.0),
        pelvis_src[1] + OY + cfg.get("pelvis_dy", 0.0),
    )
    torso_deg = cfg.get("torso_deg", 0.0)
    head_deg = torso_deg + cfg.get("head_rel_deg", 0.0)
    skirt_deg = cfg.get("skirt_deg", torso_deg * 0.35)

    def torso_joint(pt):
        r = rot_pt(pt, pelvis_src, torso_deg)
        return (pelvis_dst[0] + (r[0] - pelvis_src[0]), pelvis_dst[1] + (r[1] - pelvis_src[1]))

    neck_dst = torso_joint(pivots["neck"])
    cape_dst = torso_joint(pivots["cape"])
    r_sh_dst = torso_joint(pivots["r_sh"])
    l_sh_dst = torso_joint(pivots["l_sh"])

    # 1. Back Cloak / Ribbon with billowing wave
    paste_rotated_part(
        canvas,
        parts["cape"],
        pivots["cape"],
        cape_dst,
        torso_deg + cfg.get("cape_rel_deg", 0.0),
        wave_phase=cfg.get("wave_phase", 0.0),
        wave_amp=cfg.get("cape_wave_amp", 6.0),
    )

    # 2. Far Arm (l_arm)
    paste_rotated_part(
        canvas,
        parts["l_arm"],
        pivots["l_sh"],
        (l_sh_dst[0] + cfg.get("l_arm_dx", 0.0), l_sh_dst[1] + cfg.get("l_arm_dy", 0.0)),
        torso_deg + cfg.get("l_arm_deg", 0.0),
    )

    # 3. Flowing Lower Robes / Skirt
    paste_rotated_part(
        canvas,
        parts["skirt"],
        pelvis_src,
        pelvis_dst,
        skirt_deg,
        wave_phase=cfg.get("wave_phase", 0.0) + 0.9,
        wave_amp=cfg.get("skirt_wave_amp", 3.2),
    )

    # 4. Upper Torso & Pauldrons
    paste_rotated_part(canvas, parts["torso"], pelvis_src, pelvis_dst, torso_deg)

    # 5. Hooded Skull / Haloed Cleric Head
    paste_rotated_part(canvas, parts["head"], pivots["neck"], neck_dst, head_deg)

    # 6. Foreground Casting Arm (r_arm)
    paste_rotated_part(
        canvas,
        parts["r_arm"],
        pivots["r_sh"],
        (r_sh_dst[0] + cfg.get("r_arm_dx", 0.0), r_sh_dst[1] + cfg.get("r_arm_dy", 0.0)),
        torso_deg + cfg.get("r_arm_deg", 0.0),
    )

    # Crop fixed camera window centered on companion so feet/hem sit cleanly above bottom margin
    cx_win = int(round(pelvis_src[0] + OX + 8))
    y_ground = int(round(y_bot_base + OY))
    S = window_S
    x0 = cx_win - S // 2
    y0 = y_ground - int(round(S * (98.0 / 104.0)))
    win = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    win.paste(canvas, (-x0, -y0))

    arr104 = downsample_clean_104(win)
    q104 = quantize_and_cluster_104(
        arr104,
        palette,
        protect_indices=protect_indices,
        lit_selout=1,
        shad_selout=0,
    )

    if draw_fx_104 is not None:
        draw_fx_104(q104)

    # Enforce strict 3px transparent safety border on 104x104 -> 6px on 208x208 (0 border clips!)
    q104[:3, :, :] = 0
    q104[-3:, :, :] = 0
    q104[:, :3, :] = 0
    q104[:, -3:, :] = 0

    cell208 = Image.fromarray(q104, "RGBA").resize((CELL, CELL), Image.Resampling.NEAREST)
    return cell208


def draw_dark_magic_orb_104(arr, cx, cy, radius, phase, intensity=1.0):
    """Draws a crisp pixel-clustered Pitch-Black & Royal-Violet Dark-Matter Orb with orbiting runes."""
    if radius <= 0.8 or intensity <= 0.05:
        return
    C_DARK = [8, 5, 16, 255]
    C_DEEP = [42, 20, 74, 255]
    C_MID = [136, 68, 198, 255]
    C_CRIM = [214, 54, 112, 255]
    C_HOT = [236, 128, 252, 255]
    C_WHITE = [255, 255, 255, 255]

    ir = int(math.ceil(radius + 2))
    for dy in range(-ir, ir + 1):
        for dx in range(-ir, ir + 1):
            d = math.hypot(dx, dy)
            if d > radius + 1.0:
                continue
            if d > radius - 0.15:
                put_px(arr, cx + dx, cy + dy, C_MID if (dx + dy) % 2 == 0 else C_DARK)
            elif d > radius * 0.62:
                put_px(arr, cx + dx, cy + dy, C_DARK)
            elif d > radius * 0.34:
                put_px(arr, cx + dx, cy + dy, C_CRIM if (dx * dy >= 0) else C_DEEP)
            else:
                put_px(arr, cx + dx, cy + dy, C_WHITE if d < radius * 0.18 else C_HOT)

    # 3 orbiting dark-magic shards
    for k in range(3):
        ang = phase * 2.0 + k * (2.0 * math.pi / 3.0)
        ox = cx + math.cos(ang) * (radius + 2.8)
        oy = cy + math.sin(ang) * (radius + 1.8)
        put_px(arr, ox, oy, C_HOT if k == 0 else C_CRIM)
        put_px(arr, ox + 1, oy, C_DARK)


def draw_soul_mend_prayer_104(arr, cx, cy, radius, phase, intensity=1.0):
    """Draws a luminous Soul-Emerald & Pale-Amethyst Necro-Healing Cross/Halo Seal at the Healer's hands."""
    if radius <= 0.8 or intensity <= 0.05:
        return
    C_DARK = [7, 9, 16, 255]
    C_DEEP = [20, 148, 104, 255]
    C_EMER = [44, 206, 146, 255]
    C_MINT = [116, 244, 192, 255]
    C_LILAC = [208, 184, 242, 255]
    C_WHITE = [255, 255, 255, 255]

    span = int(round(radius))
    # Crisp sacred soul-cross flare
    draw_line_104(arr, cx - span, cy, cx + span, cy, C_EMER, thickness=1)
    draw_line_104(arr, cx, cy - span, cx, cy + span, C_EMER, thickness=1)
    draw_line_104(arr, cx - max(1, span - 2), cy, cx + max(1, span - 2), cy, C_MINT, thickness=1)
    draw_line_104(arr, cx, cy - max(1, span - 2), cx, cy + max(1, span - 2), C_MINT, thickness=1)
    put_px(arr, cx, cy, C_WHITE)
    put_px(arr, cx - 1, cy, C_WHITE)
    put_px(arr, cx + 1, cy, C_WHITE)
    put_px(arr, cx, cy - 1, C_WHITE)
    put_px(arr, cx, cy + 1, C_WHITE)

    # Rising emerald & lilac soul motes
    for k in range(4):
        ang = phase + k * (math.pi * 0.5)
        ox = cx + math.cos(ang) * (radius + 2.2)
        oy = cy + math.sin(ang) * (radius * 0.72) - 1.5
        put_px(arr, ox, oy, C_MINT if k % 2 == 0 else C_LILAC)
        put_px(arr, ox, oy + 1, C_DARK)


def build_sheet():
    mage_parts, mage_pivots = segment_mage()
    healer_parts, healer_pivots = segment_healer()

    # Save segmented parts debug preview
    dbg_parts = Image.new("RGBA", (1200, 420), (22, 20, 32, 255))
    d_p = ImageDraw.Draw(dbg_parts)
    for r_idx, (label, prts) in enumerate([("MAGE", mage_parts), ("HEALER", healer_parts)]):
        x_cur = 16
        y_cur = r_idx * 210 + 18
        for pname in ("cape", "l_arm", "skirt", "torso", "head", "r_arm"):
            pim, _, _ = prts[pname]
            scale = min(1.0, 175.0 / max(1, max(pim.size)))
            nw, nh = max(1, int(pim.width * scale)), max(1, int(pim.height * scale))
            sub = pim.resize((nw, nh), Image.Resampling.NEAREST)
            dbg_parts.alpha_composite(sub, (x_cur, y_cur + 16))
            d_p.text((x_cur, y_cur), f"{label}:{pname}", fill=(235, 230, 255, 255))
            x_cur += max(95, nw + 24)
    dbg_parts.save(os.path.join(ART_DIR, "debug_reaper_companions_parts.png"))

    sheet = Image.new("RGBA", (COLS * CELL, 4 * CELL), (0, 0, 0, 0))

    # Row 0: Death-Mage Idle / Hover (30 frames seamless loop)
    for f in range(COLS):
        u = f / float(COLS)
        ph = u * math.pi * 2.0
        bob_y = math.sin(ph) * 8.5
        cfg = {
            "pelvis_dx": math.sin(ph) * 2.0,
            "pelvis_dy": -10.0 + bob_y,
            "torso_deg": math.sin(ph - 0.4) * 2.4,
            "head_rel_deg": math.cos(ph) * 2.2,
            "cape_rel_deg": 3.0 + math.sin(ph) * 3.5,
            "r_arm_deg": -10.0 + math.sin(ph + 0.6) * 8.0,
            "l_arm_deg": -12.0 + math.cos(ph + 0.4) * 8.0,
            "wave_phase": ph,
            "cape_wave_amp": 7.5,
            "skirt_wave_amp": 3.8,
        }

        def fx_idle(q104, ph_local=ph):
            # Subtle hovering dark-magic spark near front skeletal hand
            hx = 63 + math.cos(ph_local) * 2.0
            hy = 56 + math.sin(ph_local) * 2.5
            draw_dark_magic_orb_104(q104, hx, hy, 2.3, ph_local, 0.85)

        cell = render_companion_cell(
            mage_parts,
            mage_pivots,
            MAGE_PALETTE,
            protect_indices=(10, 14, 15, 16, 17, 18, 19),
            cfg=cfg,
            y_bot_base=502.0,
            window_S=584,
            draw_fx_104=fx_idle,
        )
        sheet.paste(cell, (f * CELL, 0 * CELL))

    # Row 1: Death-Mage Dark-Magic Cast (F00..F09 gather void orb, F10..F18 hurl dark magic, F19..F29 recover)
    for f in range(COLS):
        u = f / float(COLS)
        ph = u * math.pi * 2.0
        if f < 10:
            p = f / 9.0
            ease = p * p * (3.0 - 2.0 * p)
            torso_deg = -7.0 * ease
            r_deg = -10.0 - 58.0 * ease
            l_deg = -12.0 - 52.0 * ease
            bob_y = -10.0 - 12.0 * ease
            orb_r = 2.4 + 4.4 * ease
            slash_i = 0.0
        elif f < 19:
            p = (f - 10) / 8.0
            ease = 1.0 - (1.0 - p) ** 2
            torso_deg = -7.0 + 18.5 * ease
            r_deg = -68.0 + 16.0 * ease
            l_deg = -64.0 + 22.0 * ease
            bob_y = -22.0 + 6.0 * ease
            orb_r = 6.8 * (1.0 - p * 0.55)
            slash_i = math.sin(p * math.pi)
        else:
            p = (f - 19) / 10.0
            ease = p * p * (3.0 - 2.0 * p)
            torso_deg = 11.5 * (1.0 - ease)
            r_deg = -52.0 + 42.0 * ease
            l_deg = -42.0 + 30.0 * ease
            bob_y = -16.0 + 6.0 * ease
            orb_r = 2.2 * (1.0 - ease * 0.3)
            slash_i = 0.0

        cfg = {
            "pelvis_dx": 4.0 if 10 <= f < 19 else 0.0,
            "pelvis_dy": bob_y,
            "torso_deg": torso_deg,
            "head_rel_deg": -torso_deg * 0.35,
            "cape_rel_deg": 8.0 if 10 <= f < 19 else 4.0,
            "r_arm_deg": r_deg,
            "r_arm_dx": 4.0 if f < 22 else 0.0,
            "r_arm_dy": -4.0 if f < 22 else 0.0,
            "l_arm_deg": l_deg,
            "l_arm_dx": 4.0 if f < 22 else 0.0,
            "wave_phase": ph * 2.0,
            "cape_wave_amp": 9.5,
            "skirt_wave_amp": 4.4,
        }

        def fx_cast(q104, orb_r_l=orb_r, slash_l=slash_i, ph_l=ph, frame_l=f):
            ox = 72 if 10 <= frame_l < 19 else 67
            oy = 44 if frame_l < 19 else 50
            draw_dark_magic_orb_104(q104, ox, oy, orb_r_l, ph_l * 2.0, 1.0)
            if slash_l > 0.08:
                draw_slash_arc_104(
                    q104,
                    66,
                    45,
                    20.0,
                    -52.0,
                    50.0,
                    [255, 255, 255, 255],
                    [214, 54, 112, 255],
                    [98, 48, 156, 255],
                    intensity=slash_l * 0.85,
                )

        cell = render_companion_cell(
            mage_parts,
            mage_pivots,
            MAGE_PALETTE,
            protect_indices=(10, 14, 15, 16, 17, 18, 19),
            cfg=cfg,
            y_bot_base=502.0,
            window_S=584,
            draw_fx_104=fx_cast,
        )
        sheet.paste(cell, (f * CELL, 1 * CELL))

    # Row 2: Soul-Healer Ethereal Hover & Halo Shimmer (30 frames seamless loop)
    for f in range(COLS):
        u = f / float(COLS)
        ph = u * math.pi * 2.0
        bob_y = math.sin(ph) * 9.0
        cfg = {
            "pelvis_dx": math.cos(ph) * 1.8,
            "pelvis_dy": -12.0 + bob_y,
            "torso_deg": math.sin(ph) * 2.0,
            "head_rel_deg": math.cos(ph) * 2.0,
            "cape_rel_deg": 2.5 + math.sin(ph) * 3.5,
            "r_arm_deg": -14.0 + math.sin(ph + 0.5) * 7.5,
            "l_arm_deg": -14.0 + math.cos(ph + 0.5) * 7.5,
            "wave_phase": ph,
            "cape_wave_amp": 5.5,
            "skirt_wave_amp": 3.4,
        }

        def fx_healer_idle(q104, ph_local=ph):
            hx = 62 + math.cos(ph_local) * 1.5
            hy = 54 + math.sin(ph_local) * 2.0
            draw_soul_mend_prayer_104(q104, hx, hy, 2.8, ph_local, 0.85)

        cell = render_companion_cell(
            healer_parts,
            healer_pivots,
            HEALER_PALETTE,
            protect_indices=(7, 10, 13, 14, 16, 17, 18, 19),
            cfg=cfg,
            y_bot_base=494.0,
            window_S=584,
            draw_fx_104=fx_healer_idle,
        )
        sheet.paste(cell, (f * CELL, 2 * CELL))

    # Row 3: Soul-Healer Luminous Soul-Mend Channel (F00..F09 clasp/raise prayer, F10..F20 channel heal stream, F21..F29 lower)
    for f in range(COLS):
        u = f / float(COLS)
        ph = u * math.pi * 2.0
        if f < 10:
            p = f / 9.0
            ease = p * p * (3.0 - 2.0 * p)
            torso_deg = -4.0 * ease
            r_deg = -14.0 - 52.0 * ease
            l_deg = -14.0 - 48.0 * ease
            bob_y = -12.0 - 12.0 * ease
            seal_r = 2.8 + 4.5 * ease
        elif f < 21:
            p = (f - 10) / 10.0
            torso_deg = -4.0 + 9.0 * math.sin(p * math.pi)
            r_deg = -66.0 + math.sin(p * math.pi * 2.0) * 5.0
            l_deg = -62.0 + math.cos(p * math.pi * 2.0) * 5.0
            bob_y = -24.0 + math.sin(p * math.pi) * 3.0
            seal_r = 7.2 + math.sin(p * math.pi) * 1.8
        else:
            p = (f - 21) / 8.0
            ease = p * p * (3.0 - 2.0 * p)
            torso_deg = -2.0 * (1.0 - ease)
            r_deg = -66.0 + 52.0 * ease
            l_deg = -62.0 + 48.0 * ease
            bob_y = -24.0 + 12.0 * ease
            seal_r = 7.2 * (1.0 - ease * 0.6)

        cfg = {
            "pelvis_dx": 2.5 if 10 <= f < 21 else 0.0,
            "pelvis_dy": bob_y,
            "torso_deg": torso_deg,
            "head_rel_deg": -3.0 if 8 <= f < 22 else 0.0,
            "cape_rel_deg": 5.5,
            "r_arm_deg": r_deg,
            "r_arm_dx": 3.5 if f < 23 else 0.0,
            "r_arm_dy": -3.5 if f < 23 else 0.0,
            "l_arm_deg": l_deg,
            "l_arm_dx": 3.5 if f < 23 else 0.0,
            "wave_phase": ph * 2.0,
            "cape_wave_amp": 7.5,
            "skirt_wave_amp": 4.2,
        }

        def fx_healer_cast(q104, sr=seal_r, ph_l=ph, frame_l=f):
            cx = 69 if 10 <= frame_l < 21 else 65
            cy = 44 if frame_l < 21 else 49
            draw_soul_mend_prayer_104(q104, cx, cy, sr, ph_l * 2.0, 1.0)
            if 9 <= frame_l <= 21:
                draw_slash_arc_104(
                    q104,
                    52,
                    22,
                    15.0,
                    -155.0,
                    -25.0,
                    [255, 255, 255, 255],
                    [116, 244, 192, 255],
                    [44, 206, 146, 255],
                    intensity=0.65,
                )

        cell = render_companion_cell(
            healer_parts,
            healer_pivots,
            HEALER_PALETTE,
            protect_indices=(7, 10, 13, 14, 16, 17, 18, 19),
            cfg=cfg,
            y_bot_base=494.0,
            window_S=584,
            draw_fx_104=fx_healer_cast,
        )
        sheet.paste(cell, (f * CELL, 3 * CELL))

    sheet.save(OUT_SHEET)

    # Verify 0 border clips across all 120 cells and build a crisp contact sheet for visual inspection
    sh_arr = np.array(sheet)
    border_clips = 0
    for r in range(4):
        for c in range(COLS):
            sub = sh_arr[r * CELL : (r + 1) * CELL, c * CELL : (c + 1) * CELL, 3]
            if (
                np.any(sub[:4, :] > 0)
                or np.any(sub[-4:, :] > 0)
                or np.any(sub[:, :4] > 0)
                or np.any(sub[:, -4:] > 0)
            ):
                border_clips += 1

    # Build a dark-slate labeled contact sheet showing 10 representative frames per row at 1:1 crispness
    sample_cols = [0, 3, 6, 9, 12, 15, 18, 21, 24, 27]
    thumb = 156
    contact = Image.new("RGBA", (len(sample_cols) * thumb + 24, 4 * (thumb + 26) + 20), (18, 16, 28, 255))
    dc = ImageDraw.Draw(contact)
    row_titles = [
        "ROW 0: ABYSSAL DEATH-MAGE (IDLE / FLOAT)",
        "ROW 1: ABYSSAL DEATH-MAGE (DARK MAGIC VOID CAST)",
        "ROW 2: OSSUARY SOUL-HEALER (ETHEREAL HOVER)",
        "ROW 3: OSSUARY SOUL-HEALER (SOUL-MEND CHANNEL)",
    ]
    for r in range(4):
        y_top = 12 + r * (thumb + 26)
        dc.text((14, y_top), row_titles[r], fill=(232, 210, 255, 255))
        for idx, c in enumerate(sample_cols):
            x_left = 12 + idx * thumb
            y_box = y_top + 16
            dc.rectangle([x_left + 2, y_box, x_left + thumb - 2, y_box + thumb - 2], outline=(58, 48, 86, 255))
            crop = sheet.crop((c * CELL, r * CELL, (c + 1) * CELL, (r + 1) * CELL)).resize(
                (thumb - 4, thumb - 4), Image.Resampling.NEAREST
            )
            contact.alpha_composite(crop, (x_left + 2, y_box + 2))
            dc.text((x_left + 6, y_box + 4), f"F{c:02d}", fill=(170, 240, 210, 255))

    dbg_sheet_path = os.path.join(ART_DIR, "debug_reaper_companions_30fps.png")
    contact.save(dbg_sheet_path)
    print(f"[OK] Saved {OUT_SHEET} ({sheet.width}x{sheet.height}) | border_clips={border_clips}/120")
    print(f"[OK] Saved {dbg_sheet_path}")


if __name__ == "__main__":
    build_sheet()
