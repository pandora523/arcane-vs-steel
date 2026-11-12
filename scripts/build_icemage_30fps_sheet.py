#!/usr/bin/env python3
"""
Builds Lyra v7 (IceMage — Cryo-Prism Winter Empress) 30fps HD-2D 10-Row Sprite Sheet
(`assets/sprites/icemage_sheet.png`, 6240x2080, 30 cols x 10 rows of 208x208)
using `assets/sprites/icemage_v5_base.jpg` + `hd2d_rig_core`.

Key Features:
- Extracts from `icemage_v5_base.jpg` via targeted BFS exterior + pocket white removal
  (preserving 100% of snow-white fur pauldrons & tiara core) + 3-pass anti-aliased fringe strip
  + multi-zone MedianFilter cel-flattening (3x3 head/tiara, 5x5 gown/boots).
- Clean 14-part Cryo-Prism Winter Empress hierarchical skeletal segmentation with strict anatomical
  knee constraints (`shin_deg >= thigh_deg` across all 300 frames — zero reverse/bird knees!).
- Athletic figure-skating stances & flared split-gown kinematics so crouching, lunging, and
  speed-skating genuinely lower Lyra's head/torso silhouette.
- 4 Distinct Normal-Attack Animations in `Row 2` (`[[0..7], [8..14], [15..22], [23..29]]`):
  0: Rime-Lance Skate Lunge, 1: Arabesque Halo Boomerang, 2: Glacier Stalagmite Slam, 3: Borealis Sky-Icicle Hail.
- `Row 9 VICTORY` (`F00..F29`): Figure-skating flourish settling into regal Winter Empress skyward scepter salute.
- Grounded silver frost-boots planted firmly at `y_104 = 99`, `0/300` border clips,
  and `29/29` distinct frame transitions per row.
"""

import os
import time
import math
from collections import deque
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from hd2d_rig_core import (
    COLS, CELL, P, BASE_NUMERIC_KEYS, poly_mask, keep_largest_component,
    assign_remaining_geodesic, extract_parts_512, rot_pt,
    render_rig_104,
)

ROWS = 10

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BASE_IMG_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "icemage_v5_base.jpg")
OUT_SHEET_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "icemage_sheet.png")
ARTIFACT_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/b9d8130e-8764-4ace-8d4e-40f97049d6f1"

# Strict 20-Color Hand-Crafted Cryo-Prism Winter Empress Master Palette
MASTER_PALETTE = np.array([
    [10, 14, 28],     # 0: Deep Glacial Obsidian Outline (#0a0e1c)
    [20, 34, 76],     # 1: Midnight Sapphire Selout (#14224c)
    [20, 38, 96],     # 2: Deep Cathedral Sapphire Gown Shadow (#142660)
    [36, 66, 148],    # 3: Royal Sapphire Battle-Gown Base (#244294)
    [48, 106, 194],   # 4: Lit Glacial Sapphire Midtone (#306ac2)
    [88, 154, 228],   # 5: Frosted Azure Gown Highlight (#589ae4)
    [96, 114, 144],   # 6: Cool Steel-Silver Boot & Hair Shadow (#607290)
    [142, 162, 188],  # 7: Polished Frost-Silver Boot & Hair Midtone (#8ea2bc)
    [184, 204, 222],  # 8: Gleaming Diamond-Silver Boot & Hair Light (#b8ccde)
    [218, 234, 246],  # 9: Plush Snow-Fur & Frost-Silk Highlight (#daeef6)
    [248, 253, 255],  # 10: Pure Snow-White Fur Mantle & Diamond Core (#f8fdff)
    [148, 114, 112],  # 11: Warm Rose-Porcelain Skin Contour (#947270)
    [172, 152, 162],  # 12: Sheer Frost-Silk Stocking Thigh Midtone (#ac98a2)
    [218, 184, 166],  # 13: Soft Peach-Porcelain Skin Midtone (#dab8a6)
    [244, 218, 196],  # 14: Lit Porcelain Face & Hand Highlight (#f4dac4)
    [68, 138, 186],   # 15: Deep Glacier Crystal Cyan-Blue (#448aba)
    [38, 208, 242],   # 16: Blazing Ice-Cyan Eye Iris & Scepter Core (#26d0f2)
    [136, 242, 255],  # 17: Luminous Diamond-Ice Tiara & Lance Edge (#88f2ff)
    [168, 102, 236],  # 18: Borealis Aurora Amethyst-Prism Facet (#a866ec)
    [236, 184, 255],  # 19: Pale Borealis Iridescent Prism Gleam (#ecb8ff)
], dtype=np.int32)

C_OUT = (10, 14, 28, 255)
C_SEL = (20, 34, 76, 255)
C_SAPPH_DARK = (20, 38, 96, 255)
C_SAPPH_BASE = (36, 66, 148, 255)
C_SAPPH_LIT = (48, 106, 194, 255)
C_SILVER_DARK = (96, 114, 144, 255)
C_SILVER_MID = (142, 162, 188, 255)
C_SILVER_LIT = (184, 204, 222, 255)
C_FUR_LIT = (218, 234, 246, 255)
C_CORE = (248, 253, 255, 255)
C_CYAN_DEEP = (68, 138, 186, 255)
C_CYAN = (38, 208, 242, 255)
C_CYAN_LIT = (136, 242, 255, 255)
C_PRISM = (168, 102, 236, 255)
C_PRISM_LIT = (236, 184, 255, 255)

# Anatomical skeletal pivots in 512x512 rig space (0.5x of 1024x1024 icemage_v5_base.jpg)
PIVOTS = dict(
    pelvis=(267.5, 252.5), neck=(266.0, 147.0), mane=(241.0, 88.0),
    l_sh=(218.0, 168.0), l_elb=(200.0, 222.0), l_hand=(187.5, 270.0),
    r_sh=(297.0, 169.0), r_elb=(302.0, 222.0), r_hand=(318.0, 268.0),
    l_hip=(247.5, 277.5), l_knee=(236.0, 345.0), l_ank=(224.0, 431.0),
    r_hip=(281.0, 277.5), r_knee=(281.0, 343.0), r_ank=(279.0, 427.5),
)

# Precompute 2-Bone Analytical IK rest lengths & rest angles in 512x512 space
_L1 = math.hypot(PIVOTS["l_elb"][0] - PIVOTS["l_sh"][0], PIVOTS["l_elb"][1] - PIVOTS["l_sh"][1])
_L2 = math.hypot(PIVOTS["l_hand"][0] - PIVOTS["l_elb"][0], PIVOTS["l_hand"][1] - PIVOTS["l_elb"][1])
_AL1 = math.degrees(math.atan2(PIVOTS["l_elb"][1] - PIVOTS["l_sh"][1], PIVOTS["l_elb"][0] - PIVOTS["l_sh"][0]))
_AL2 = math.degrees(math.atan2(PIVOTS["l_hand"][1] - PIVOTS["l_elb"][1], PIVOTS["l_hand"][0] - PIVOTS["l_elb"][0]))

_R1 = math.hypot(PIVOTS["r_elb"][0] - PIVOTS["r_sh"][0], PIVOTS["r_elb"][1] - PIVOTS["r_sh"][1])
_R2 = math.hypot(PIVOTS["r_hand"][0] - PIVOTS["r_elb"][0], PIVOTS["r_hand"][1] - PIVOTS["r_elb"][1])
_AR1 = math.degrees(math.atan2(PIVOTS["r_elb"][1] - PIVOTS["r_sh"][1], PIVOTS["r_elb"][0] - PIVOTS["r_sh"][0]))
_AR2 = math.degrees(math.atan2(PIVOTS["r_hand"][1] - PIVOTS["r_elb"][1], PIVOTS["r_hand"][0] - PIVOTS["r_elb"][0]))

PALETTE_CFG = dict(
    palette=MASTER_PALETTE,
    protect_indices=(10, 14, 16, 17, 18, 19),
    hair_indices=(6, 7, 8, 9, 10),
    lit_selout=1,
    shad_selout=0,
    hair_selout=6,
    joint_fill=(20, 38, 96, 255),
    joint_inner=(36, 66, 148, 255),
    hip_r=16,
    thigh_r=12,
    arm_r=11,
    pinhole_fill=(36, 66, 148, 255),
)


def put_px_safe(arr, x, y, col):
    """Strictly clamps drawn pixels inside [4..99] on 104x104 canvas (zero border clips)."""
    ix, iy = int(round(x)), int(round(y))
    if 4 <= ix <= 99 and 4 <= iy <= 99:
        arr[iy, ix] = col


def draw_line_safe(arr, x0, y0, x1, y1, col, thickness=1):
    steps = int(max(abs(x1 - x0), abs(y1 - y0)) * 2.4) + 1
    for i in range(steps + 1):
        t = i / max(1, steps)
        x = x0 + (x1 - x0) * t
        y = y0 + (y1 - y0) * t
        if thickness <= 1:
            put_px_safe(arr, x, y, col)
        else:
            r = thickness // 2
            for dy in range(-r, r + 1):
                for dx in range(-r, r + 1):
                    if dx * dx + dy * dy <= r * r + 1:
                        put_px_safe(arr, x + dx, y + dy, col)


def solve_arm_ik(sh_w, target_w, L1, L2, a1_rest, a2_rest, torso_deg, elbow_clockwise=True):
    """Analytical 2-Bone IK solver in 512x512 rig coordinates."""
    dx = target_w[0] - sh_w[0]
    dy = target_w[1] - sh_w[1]
    dist = math.hypot(dx, dy)
    max_reach = (L1 + L2) * 0.985
    min_reach = abs(L1 - L2) + 6.0
    if dist > max_reach:
        dx *= max_reach / dist
        dy *= max_reach / dist
        dist = max_reach
    elif dist < min_reach:
        if dist < 1e-4:
            dx, dy = min_reach, 0.0
        else:
            dx *= min_reach / dist
            dy *= min_reach / dist
        dist = min_reach

    base_ang = math.atan2(dy, dx)
    cos_a1 = max(-1.0, min(1.0, (L1 * L1 + dist * dist - L2 * L2) / (2.0 * L1 * dist)))
    alpha1 = math.acos(cos_a1)

    th1 = base_ang + (alpha1 if elbow_clockwise else -alpha1)
    elb_x = sh_w[0] + math.cos(th1) * L1
    elb_y = sh_w[1] + math.sin(th1) * L1
    th2 = math.atan2(target_w[1] - elb_y, target_w[0] - elb_x)

    sode_deg = math.degrees(th1) - a1_rest
    fore_deg = math.degrees(th2) - a2_rest
    return (sode_deg - torso_deg), (fore_deg - sode_deg)


def apply_icemage_ik(cfg):
    """
    Applies 2-Bone Analytical IK to Lyra's right (Frost-Lance Scepter) and left (spell/2H grip) arms.
    """
    if not cfg.get("use_ik", True):
        return cfg

    torso_deg = cfg.get("torso_deg", 0.0)
    pel = PIVOTS["pelvis"]
    l_sh_w = rot_pt(PIVOTS["l_sh"], pel, torso_deg)
    r_sh_w = rot_pt(PIVOTS["r_sh"], pel, torso_deg)

    r_dx = cfg.get("r_ik_dx", 62.0)
    r_dy = cfg.get("r_ik_dy", -20.0)
    r_target = (pel[0] + r_dx, pel[1] + r_dy)

    if cfg.get("two_handed_grip", False):
        w_rad = math.radians(cfg.get("weapon_deg", -75.0))
        sep = cfg.get("grip_sep", 28.0)
        l_target = (r_target[0] - math.cos(w_rad) * sep, r_target[1] - math.sin(w_rad) * sep)
    else:
        l_dx = cfg.get("l_ik_dx", -64.0)
        l_dy = cfg.get("l_ik_dy", 2.0)
        l_target = (pel[0] + l_dx, pel[1] + l_dy)

    r_sode_rel, r_fore_rel = solve_arm_ik(
        r_sh_w, r_target, _R1, _R2, _AR1, _AR2, torso_deg,
        elbow_clockwise=bool(cfg.get("r_elbow_cw", True)),
    )
    l_sode_rel, l_fore_rel = solve_arm_ik(
        l_sh_w, l_target, _L1, _L2, _AL1, _AL2, torso_deg,
        elbow_clockwise=bool(cfg.get("l_elbow_cw", True)),
    )

    cfg["r_sode_rel_deg"] = r_sode_rel
    cfg["r_fore_rel_deg"] = r_fore_rel
    cfg["l_sode_rel_deg"] = l_sode_rel
    cfg["l_fore_rel_deg"] = l_fore_rel
    if cfg.get("force_right_arm_front", False) or r_dy < -65.0 or r_dx > 66.0:
        cfg["right_arm_in_front"] = True
    return cfg


ICEMAGE_NUMERIC_KEYS = tuple(BASE_NUMERIC_KEYS) + (
    "r_ik_dx", "r_ik_dy", "l_ik_dx", "l_ik_dy", "grip_sep",
)


def eval_icemage_keyframes(f, keyframes, ph, defaults, extra_meta_keys=(), wave_mult=2.0):
    k0 = keyframes[0]
    k1 = keyframes[-1]
    for i in range(len(keyframes) - 1):
        if keyframes[i][0] <= f <= keyframes[i + 1][0]:
            k0 = keyframes[i]
            k1 = keyframes[i + 1]
            break

    f0, d0 = k0
    f1, d1 = k1
    raw_u = 0.0 if f1 <= f0 else (f - f0) / float(f1 - f0)
    u = 0.5 - 0.5 * math.cos(math.pi * max(0.0, min(1.0, raw_u)))

    out = dict(defaults)
    for k in ICEMAGE_NUMERIC_KEYS:
        if k in defaults or k in d0 or k in d1:
            v0 = d0.get(k, defaults.get(k, 0.0))
            v1 = d1.get(k, defaults.get(k, 0.0))
            out[k] = v0 + (v1 - v0) * u

    active_d = d0 if raw_u < 0.5 else d1
    all_meta = (
        "right_arm_in_front", "force_right_arm_front", "right_leg_behind", "mane_in_front",
        "show_weapon", "planted_weapon", "resting_weapon", "centered_mode",
        "halo_active", "halo_grand", "use_ik", "two_handed_grip",
        "r_elbow_cw", "l_elbow_cw", "prism_flash",
    ) + tuple(extra_meta_keys)
    for mk in all_meta:
        if mk in active_d:
            out[mk] = active_d[mk]

    out["mane_wave_phase"] = ph * wave_mult
    return apply_icemage_ik(out)


def load_and_segment_512():
    """
    Loads `icemage_v5_base.jpg` (1024x1024), removes exterior + enclosed background white pockets
    via BFS (preserving 100% of snow-white fur shoulder pauldrons & tiara diamond core), strips
    anti-aliased fringes in 3 passes, cel-flattens via MedianFilter (3x3 head, 5x5 body), and
    segments into the 14-part Cryo-Prism Winter Empress hierarchical rig.
    """
    im = Image.open(BASE_IMG_PATH).convert("RGBA")
    arr = np.array(im)
    H0, W0 = arr.shape[:2]

    # 1. BFS Flood-Fill from borders + enclosed background white pockets (below fur pauldrons y > 440)
    #    Preserves snow-white fur shoulder pauldrons (y=300..365) & tiara diamond core (y=105..135)!
    bg_seeds = [
        (0, 0), (W0 - 1, 0), (0, H0 - 1), (W0 - 1, H0 - 1),
        (512, 1015), (515, 860),
        (431, 502), (425, 480), (445, 520),  # enclosed pocket between left sleeve & bodice/skirt
        (403, 577),                          # tiny pocket between left fingers
        (619, 547),                          # tiny pocket between right wrist & right skirt
    ]
    vis = np.zeros((H0, W0), dtype=bool)
    q = deque()
    r0 = arr[:, :, 0].astype(np.int16)
    g0 = arr[:, :, 1].astype(np.int16)
    b0 = arr[:, :, 2].astype(np.int16)
    max_c = np.maximum(np.maximum(r0, g0), b0)
    min_c = np.minimum(np.minimum(r0, g0), b0)
    is_bg_white = (min_c >= 224) & ((max_c - min_c) <= 24)

    for sx, sy in bg_seeds:
        if 0 <= sx < W0 and 0 <= sy < H0 and not vis[sy, sx] and is_bg_white[sy, sx]:
            vis[sy, sx] = True
            q.append((sy, sx))

    while q:
        cy, cx = q.popleft()
        arr[cy, cx] = [0, 0, 0, 0]
        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
            if 0 <= ny < H0 and 0 <= nx < W0 and not vis[ny, nx] and is_bg_white[ny, nx]:
                vis[ny, nx] = True
                q.append((ny, nx))

    # Also clear any tiny remaining pure-white pockets below y=430 (well below fur pauldrons!)
    yy1024 = np.arange(H0)[:, None]
    rem_lower_white = (arr[:, :, 3] > 0) & (yy1024 > 430) & (r0 >= 246) & (g0 >= 246) & (b0 >= 246)
    arr[rem_lower_white] = [0, 0, 0, 0]

    # 2. 3-Pass Anti-Aliased White Fringe Stripping (Zero White Halo)
    for _ in range(3):
        a0 = arr[:, :, 3] > 0
        up = np.pad(a0[1:, :], ((0, 1), (0, 0)), constant_values=False)
        dn = np.pad(a0[:-1, :], ((1, 0), (0, 0)), constant_values=False)
        lf = np.pad(a0[:, 1:], ((0, 0), (0, 1)), constant_values=False)
        rt = np.pad(a0[:, :-1], ((0, 0), (1, 0)), constant_values=False)
        edge = a0 & (~(up & dn & lf & rt))
        r = arr[:, :, 0].astype(np.int16)
        g = arr[:, :, 1].astype(np.int16)
        b = arr[:, :, 2].astype(np.int16)
        wf = edge & (r > 182) & (g > 182) & (b > 182) & (np.abs(r - g) < 24) & (np.abs(g - b) < 24)
        # Protect upper snow-white fur outer highlight edge unless very pale neutral fringe
        fur_zone = (yy1024 >= 295) & (yy1024 <= 375)
        wf = wf & ((~fur_zone) | ((r > 228) & (g > 228) & (b > 228)))
        arr[wf] = [0, 0, 0, 0]

    # 3. Downsample 2x NEAREST to 512x512 + Multi-Zone MedianFilter Cel-Flattening
    im512 = Image.fromarray(arr, "RGBA").resize((512, 512), Image.Resampling.NEAREST)
    raw512 = np.array(im512)
    rgb512 = im512.convert("RGB")
    rgb_med3 = np.array(rgb512.filter(ImageFilter.MedianFilter(size=3)))
    rgb_med5 = np.array(rgb512.filter(ImageFilter.MedianFilter(size=5)))

    arr512 = raw512.copy()
    alpha = keep_largest_component(arr512[:, :, 3] > 0)
    arr512[~alpha] = [0, 0, 0, 0]
    yy512, xx512 = np.mgrid[0:512, 0:512]
    cel_rgb = np.where(yy512[:, :, None] < 155, rgb_med3, rgb_med5)
    arr512[:, :, :3] = np.where(alpha[:, :, None], cel_rgb, 0)

    # Reinforce blazing ice-cyan eye irises & tiara cyan gems from un-blurred raw512 so eyes sparkle!
    rr = raw512[:, :, 0].astype(np.int16)
    rg = raw512[:, :, 1].astype(np.int16)
    rb = raw512[:, :, 2].astype(np.int16)
    eye_box = alpha & (yy512 >= 110) & (yy512 <= 132) & (xx512 >= 250) & (xx512 <= 292)
    cyan_iris = eye_box & (rg >= 175) & (rb >= 160) & ((rg - rr) >= 65)
    arr512[cyan_iris, :3] = [38, 208, 242]

    tiara_box = alpha & (yy512 >= 38) & (yy512 <= 96) & (xx512 >= 225) & (xx512 <= 300)
    tiara_gem = tiara_box & (rb >= 205) & (rg >= 180) & ((rb - rr) >= 40)
    arr512[tiara_gem, :3] = [136, 242, 255]

    # Trim dark-navy inner back-skirt lining between the two silver frost-boots (y=676..820 in 1024)
    # so both boots silhouette cleanly during figure-skating glides & walks!
    inner_boot_gap = (
        alpha
        & (yy512 >= 338) & (yy512 <= 415)
        & (xx512 >= 249) & (xx512 <= 269)
        & (arr512[:, :, 0] < 45) & (arr512[:, :, 1] < 65) & (arr512[:, :, 2] < 135)
    )
    arr512[inner_boot_gap] = [0, 0, 0, 0]
    a = keep_largest_component(arr512[:, :, 3] > 0)
    arr512[~a] = [0, 0, 0, 0]

    H, W = 512, 512

    # 4. 14-Part Cryo-Prism Winter Empress Hierarchical Segmentation (0.5x of 1024 coords via P())
    m_head = poly_mask(H, W, P([
        (466, 75), (602, 75), (618, 205), (595, 294), (508, 298), (492, 240), (476, 175)
    ])) & a

    m_mane = poly_mask(H, W, P([
        (350, 95), (492, 95), (496, 298), (495, 385), (415, 298), (362, 420), (350, 260)
    ])) & a & (~m_head)

    # Left plush snow-white fur shoulder pauldron + upper sapphire sleeve
    m_l_sode = poly_mask(H, W, P([
        (382, 294), (492, 294), (492, 378), (452, 448), (392, 448)
    ])) & a & (~m_head)

    # Left lower sapphire sleeve + silver cuff + empty porcelain hand
    m_l_forearm = poly_mask(H, W, P([
        (340, 444), (446, 444), (414, 598), (340, 598)
    ])) & a & (~m_l_sode)

    # Right plush snow-white fur shoulder pauldron + upper sapphire sleeve
    m_r_sode = poly_mask(H, W, P([
        (566, 294), (642, 294), (632, 448), (582, 448), (576, 365)
    ])) & a & (~m_head)

    # Right lower sapphire sleeve + silver cuff + empty porcelain hand
    m_r_forearm = poly_mask(H, W, P([
        (586, 444), (682, 444), (682, 594), (612, 594), (592, 500)
    ])) & a & (~m_r_sode)

    # Left split-front royal sapphire & silver-trimmed battle-gown skirt panel
    m_l_coat = poly_mask(H, W, P([
        (450, 488), (528, 494), (506, 562), (474, 650), (444, 730), (428, 838), (322, 838), (378, 610)
    ])) & a & (~m_l_forearm)

    # Right split-front royal sapphire & silver-trimmed battle-gown skirt panel
    m_r_coat = poly_mask(H, W, P([
        (548, 492), (592, 488), (626, 650), (642, 845), (594, 845), (588, 725), (574, 645), (558, 560)
    ])) & a & (~m_r_forearm)

    # Royal sapphire bodice + neck/collarbone + center mini-skirt tab
    m_torso = poly_mask(H, W, P([
        (482, 286), (592, 286), (590, 510), (568, 608), (502, 608), (480, 495)
    ])) & a & (~m_head) & (~m_l_sode) & (~m_l_forearm) & (~m_r_sode) & (~m_r_forearm) & (~m_l_coat) & (~m_r_coat)

    # Separated Left Leg & Tall Silver Frost-Boot
    m_l_foot = poly_mask(H, W, P([
        (414, 855), (484, 855), (484, 962), (414, 962)
    ])) & a
    m_l_shin = poly_mask(H, W, P([
        (426, 682), (512, 682), (496, 862), (420, 862)
    ])) & a & (~m_l_foot) & (~m_l_coat) & (~m_torso)
    m_l_thigh = poly_mask(H, W, P([
        (466, 575), (536, 575), (522, 695), (456, 695)
    ])) & a & (~m_torso) & (~m_l_coat) & (~m_l_shin) & (~m_l_foot)

    # Separated Right Leg & Heeled Silver Frost-Boot
    m_r_foot = poly_mask(H, W, P([
        (524, 846), (628, 846), (628, 932), (524, 932)
    ])) & a & (~m_r_coat)
    m_r_shin = poly_mask(H, W, P([
        (526, 676), (596, 676), (596, 854), (526, 854)
    ])) & a & (~m_r_foot) & (~m_r_coat) & (~m_torso)
    m_r_thigh = poly_mask(H, W, P([
        (534, 575), (588, 575), (592, 688), (532, 688)
    ])) & a & (~m_torso) & (~m_r_coat) & (~m_r_shin) & (~m_r_foot)

    # Remove leftover back-mane strands trapped under left sleeve so m_mane stays crisp above shoulder
    m_mane = m_mane & (~m_l_sode) & (~m_torso) & (~m_l_coat)

    masks = assign_remaining_geodesic(a, [
        ("mane", m_mane), ("head", m_head), ("torso", m_torso),
        ("l_coat", m_l_coat), ("r_coat", m_r_coat),
        ("l_sode", m_l_sode), ("l_forearm", m_l_forearm),
        ("r_sode", m_r_sode), ("r_forearm", m_r_forearm),
        ("l_thigh", m_l_thigh), ("l_shin", m_l_shin), ("l_foot", m_l_foot),
        ("r_thigh", m_r_thigh), ("r_shin", m_r_shin), ("r_foot", m_r_foot),
    ])
    return extract_parts_512(arr512, masks)


def draw_crystal_diamond_104(arr, cx, cy, r_len, r_wid, ang_rad, fill_lit, fill_dark):
    """Draws a crisp 1px-outlined crystalline diamond shard centered at (cx, cy)."""
    ux, uy = math.cos(ang_rad), math.sin(ang_rad)
    nx, ny = -uy, ux
    ir = int(math.ceil(max(r_len, r_wid))) + 2
    for dy in range(-ir, ir + 1):
        for dx in range(-ir, ir + 1):
            px, py = cx + dx, cy + dy
            u = dx * ux + dy * uy
            v = dx * nx + dy * ny
            d = abs(u) / max(0.8, r_len) + abs(v) / max(0.8, r_wid)
            if d <= 1.28:
                if d > 0.92:
                    put_px_safe(arr, px, py, C_OUT)
                elif d < 0.34:
                    put_px_safe(arr, px, py, C_CORE)
                else:
                    put_px_safe(arr, px, py, fill_lit if v <= 0 else fill_dark)


def draw_snowflake_halo_104(arr, nx, ny, ph, grand=False):
    """
    Draws the Rotating 6-Crystal Borealis Snowflake & Prism Halo behind Lyra's shoulders.
    """
    cx, cy = nx - 3.5, ny + 1.5
    orbit_r = 17.5 if grand else 15.0

    # Subtle sapphire-cyan crystalline halo ring
    n_ring = 36
    for i in range(n_ring):
        if i % 2 != 0 and not grand:
            continue
        a = (i / float(n_ring)) * 2.0 * math.pi - ph * 0.35
        rx = cx + math.cos(a) * (orbit_r * 0.76)
        ry = cy + math.sin(a) * (orbit_r * 0.76)
        put_px_safe(arr, rx, ry, C_SAPPH_LIT if i % 4 == 0 else C_SEL)

    # 6 Rotating Borealis Snowflake Spokes & Faceted Prism Shards
    for k in range(6):
        ang = ph * 0.55 + k * (math.pi / 3.0)
        ux, uy = math.cos(ang), math.sin(ang)
        sx0, sy0 = cx + ux * 6.5, cy + uy * 6.5
        sx1, sy1 = cx + ux * (orbit_r - 2.2), cy + uy * (orbit_r - 2.2)
        draw_line_safe(arr, sx0, sy0, sx1, sy1, C_CYAN_DEEP if k % 2 == 0 else C_SAPPH_LIT, 1)

        px, py = cx + ux * orbit_r, cy + uy * orbit_r
        is_prism = (k % 2 == 1)
        draw_crystal_diamond_104(
            arr, px, py,
            r_len=3.4 if grand else 2.8,
            r_wid=2.0 if grand else 1.7,
            ang_rad=ang,
            fill_lit=C_PRISM_LIT if is_prism else C_CYAN_LIT,
            fill_dark=C_PRISM if is_prism else C_CYAN,
        )


def draw_cryo_scepter_104(arr, hx, hy, scep_deg, scep_len=21.0, glow=1.0, ph=0.0):
    """
    Draws Lyra's signature Crystalline Borealis Frost-Lance Scepter:
    - Outlined silver-and-sapphire fluted shaft with pommel ice-diamond
    - Twin swept Snowflake Cross-Wings ahead of grip
    - Faceted Diamond Frost-Lance Spearhead (ice-cyan upper facet, Borealis amethyst lower facet, pure white core)
    """
    rad = math.radians(scep_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    nx, ny = -uy, ux

    pom_d = -7.5
    guard_d = 9.0
    tip_d = scep_len + 3.5

    bx, by = hx + ux * pom_d, hy + uy * pom_d
    gx, gy = hx + ux * guard_d, hy + uy * guard_d

    # 1. Dark Selout shaft outline + silver-sapphire inner shaft
    draw_line_safe(arr, bx, by, gx, gy, C_OUT, 3)
    draw_line_safe(arr, bx, by, gx, gy, C_SILVER_LIT, 1)
    # Grip wrap at hand
    put_px_safe(arr, hx, hy, C_SAPPH_BASE)
    put_px_safe(arr, hx + ux, hy + uy, C_SILVER_MID)

    # 2. Pommel Ice-Diamond counterweight
    draw_crystal_diamond_104(arr, bx - ux * 1.2, by - uy * 1.2, 2.2, 1.6, rad, C_CYAN_LIT, C_SAPPH_LIT)

    # 3. Twin Swept Crystalline Snowflake Cross-Wings at guard
    for side in (-1.0, 1.0):
        wx = gx - ux * 1.2 + nx * side * 4.2
        wy = gy - uy * 1.2 + ny * side * 4.2
        draw_line_safe(arr, gx, gy, wx, wy, C_OUT, 3)
        draw_line_safe(arr, gx, gy, wx, wy, C_CYAN_LIT if side < 0 else C_PRISM_LIT, 1)
        put_px_safe(arr, wx, wy, C_CORE)

    # 4. Faceted Borealis Frost-Lance Spearhead (from guard_d to tip_d)
    lance_len = max(8.0, tip_d - guard_d)
    mid_cx = gx + ux * (lance_len * 0.48)
    mid_cy = gy + uy * (lance_len * 0.48)
    ir = int(math.ceil(lance_len * 0.62)) + 3
    for dy in range(-ir, ir + 1):
        for dx in range(-ir, ir + 1):
            px, py = mid_cx + dx, mid_cy + dy
            u = (px - gx) * ux + (py - gy) * uy
            v = (px - gx) * nx + (py - gy) * ny
            if u < -1.0 or u > lance_len + 1.0:
                continue
            u_norm = max(0.0, min(1.0, u / lance_len))
            half_w = (u_norm / 0.28) * 3.4 if u_norm < 0.28 else ((1.0 - u_norm) / 0.72) * 3.4
            av = abs(v)
            if av <= half_w + 0.95:
                if av > half_w - 0.15 or u < 0.0 or u > lance_len:
                    put_px_safe(arr, px, py, C_OUT)
                elif av < 0.75:
                    put_px_safe(arr, px, py, C_CORE)
                elif v < 0:
                    put_px_safe(arr, px, py, C_CYAN_LIT if u_norm < 0.65 else C_CYAN)
                else:
                    put_px_safe(arr, px, py, C_PRISM_LIT if glow > 0.75 and u_norm < 0.45 else C_PRISM)

    # 5. Subtle 4-point diamond star glint at lance tip during active casts
    if glow > 0.68:
        tx, ty = gx + ux * lance_len, gy + uy * lance_len
        for k in range(4):
            a = ph * 1.5 + k * (math.pi * 0.5)
            put_px_safe(arr, tx + math.cos(a) * 2.2, ty + math.sin(a) * 2.2, C_CORE if k % 2 == 0 else C_CYAN_LIT)


def extra_extents(joints_c, cfg, scale):
    pts = []
    if cfg.get("halo_active", True):
        nk = joints_c["neck"]
        hr = (20.5 if cfg.get("halo_grand", False) else 18.0) / scale
        cx, cy = nk[0] - 3.5 / scale, nk[1] + 1.5 / scale
        pts.append((cx - hr, cy - hr))
        pts.append((cx + hr, cy + hr))

    if cfg.get("show_weapon", True) and not cfg.get("resting_weapon", False):
        rh = joints_c["r_hand"]
        rad = math.radians(cfg.get("weapon_deg", -32.0))
        wlen = cfg.get("weapon_len", 21.0)
        pts.append((
            rh[0] + math.cos(rad) * ((wlen + 6.5) / scale),
            rh[1] + math.sin(rad) * ((wlen + 6.5) / scale),
        ))
        pts.append((
            rh[0] - math.cos(rad) * (10.5 / scale),
            rh[1] - math.sin(rad) * (10.5 / scale),
        ))
    return pts


def draw_back(bg104, joints104, cfg):
    if cfg.get("halo_active", True):
        nk = joints104["neck"]
        draw_snowflake_halo_104(
            bg104, nk[0], nk[1],
            ph=cfg.get("mane_wave_phase", 0.0),
            grand=bool(cfg.get("halo_grand", False)),
        )


def draw_front(out, joints104, cfg):
    ph = cfg.get("mane_wave_phase", 0.0)
    if not cfg.get("show_weapon", True):
        return

    if cfg.get("resting_weapon", False):
        # Horizontal floor rest on Row 5 DEATH F18..F29 along stone floor (y_104 = 96)
        draw_cryo_scepter_104(out, 46.0, 96.0, scep_deg=-1.0, scep_len=20.0, glow=0.25, ph=ph)
        return

    rh = joints104["r_hand"]
    w_deg = cfg.get("weapon_deg", -32.0)
    w_len = cfg.get("weapon_len", 21.0)
    draw_cryo_scepter_104(
        out, rh[0], rh[1],
        scep_deg=w_deg,
        scep_len=w_len,
        glow=cfg.get("weapon_glow", 1.0),
        ph=ph,
    )

    if cfg.get("prism_flash", False):
        rad = math.radians(w_deg)
        fx = max(10.0, min(93.0, rh[0] + math.cos(rad) * (w_len + 3.5)))
        fy = max(10.0, min(95.0, rh[1] + math.sin(rad) * (w_len + 3.5)))
        for k in range(6):
            a = ph + k * (math.pi / 3.0)
            draw_line_safe(
                out, fx, fy,
                fx + math.cos(a) * 4.8, fy + math.sin(a) * 4.8,
                C_PRISM_LIT if k % 2 == 0 else C_CORE, 1,
            )


DEFAULTS = dict(
    pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=11.0, head_rel_deg=-7.0, mane_rel_deg=-9.0,
    mane_wave_amp=6.5, l_thigh_deg=-20.0, l_shin_deg=16.0, l_foot_deg=8.0,
    r_thigh_deg=18.0, r_shin_deg=40.0, r_foot_deg=18.0,
    l_sode_rel_deg=0.0, l_fore_rel_deg=0.0, r_sode_rel_deg=0.0, r_fore_rel_deg=0.0,
    l_coat_rel_deg=18.0, r_coat_rel_deg=-14.0,
    r_ik_dx=58.0, r_ik_dy=-18.0, l_ik_dx=-62.0, l_ik_dy=4.0, grip_sep=28.0,
    weapon_deg=-28.0, weapon_len=21.0, weapon_glow=0.88, foot_y=99.0,
    show_weapon=True, halo_active=True, halo_grand=False,
    use_ik=True, two_handed_grip=False, r_elbow_cw=True, l_elbow_cw=True,
    right_arm_in_front=False, right_leg_behind=False,
)


def make_winter_empress_death_kfs():
    """
    Multi-stage graceful Winter Empress hurt & death (Row 5) with 100% anatomical knees (`shin_deg >= thigh_deg`):
      F00..F05: Grounded hurt recoil stagger (`foot_y = 99`, deep coiled knees)
      F06..F13: Wounded kneeling / L-sit buckle onto stone floor, lowering Frost-Lance Scepter
      F14..F17: Progressive supine collapse onto floor
      F18..F29: Flat horizontal supine rest on `y_104 = 99` with Frost-Lance Scepter resting horizontally on floor!
    """
    return [
        (0, dict(
            use_ik=False, pelvis_dx=-2.0, pelvis_dy=6.0, torso_deg=-6.0, head_rel_deg=-2.0, mane_rel_deg=6.0,
            l_thigh_deg=-18.0, l_shin_deg=16.0, l_foot_deg=8.0,
            r_thigh_deg=12.0, r_shin_deg=34.0, r_foot_deg=16.0,
            l_coat_rel_deg=18.0, r_coat_rel_deg=-14.0,
            l_sode_rel_deg=-16.0, l_fore_rel_deg=-10.0, r_sode_rel_deg=10.0, r_fore_rel_deg=-8.0,
            right_leg_behind=True, weapon_deg=-26.0, weapon_glow=0.82, halo_active=True, foot_y=99.0,
        )),
        (5, dict(
            use_ik=False, pelvis_dx=-18.0, pelvis_dy=24.0, torso_deg=-20.0, head_rel_deg=-8.0, mane_rel_deg=20.0,
            l_thigh_deg=-28.0, l_shin_deg=22.0, l_foot_deg=10.0,
            r_thigh_deg=10.0, r_shin_deg=42.0, r_foot_deg=20.0,
            l_coat_rel_deg=26.0, r_coat_rel_deg=-22.0,
            l_sode_rel_deg=-30.0, l_fore_rel_deg=-20.0, r_sode_rel_deg=24.0, r_fore_rel_deg=-14.0,
            right_leg_behind=True, weapon_deg=-44.0, weapon_glow=0.58, halo_active=True, foot_y=99.0,
        )),
        (9, dict(
            use_ik=False, pelvis_dx=-14.0, pelvis_dy=94.0, torso_deg=10.0, head_rel_deg=14.0, mane_rel_deg=-10.0,
            l_thigh_deg=-68.0, l_shin_deg=-34.0, l_foot_deg=-20.0,
            r_thigh_deg=-44.0, r_shin_deg=-16.0, r_foot_deg=-10.0,
            l_coat_rel_deg=-18.0, r_coat_rel_deg=-22.0,
            l_sode_rel_deg=18.0, l_fore_rel_deg=8.0,
            r_sode_rel_deg=-18.0, r_fore_rel_deg=-12.0, right_arm_in_front=True,
            weapon_deg=12.0, weapon_glow=0.42, halo_active=False, mane_wave_amp=4.0, foot_y=99.0,
        )),
        (13, dict(
            use_ik=False, pelvis_dx=-12.0, pelvis_dy=152.0, torso_deg=-18.0, head_rel_deg=18.0, mane_rel_deg=18.0,
            l_thigh_deg=-94.0, l_shin_deg=-78.0, l_foot_deg=-62.0,
            r_thigh_deg=-82.0, r_shin_deg=-68.0, r_foot_deg=-56.0,
            l_coat_rel_deg=-36.0, r_coat_rel_deg=-28.0,
            l_sode_rel_deg=20.0, l_fore_rel_deg=8.0,
            r_sode_rel_deg=-8.0, r_fore_rel_deg=-10.0, right_arm_in_front=True,
            weapon_deg=3.0, weapon_glow=0.32, halo_active=False, mane_wave_amp=2.2,
            resting_weapon=False, foot_y=99.0,
        )),
        (18, dict(
            use_ik=False, pelvis_dx=-8.0, pelvis_dy=188.0, torso_deg=-56.0, head_rel_deg=16.0, mane_rel_deg=68.0,
            l_thigh_deg=-102.0, l_shin_deg=-88.0, l_foot_deg=-70.0,
            r_thigh_deg=-90.0, r_shin_deg=-76.0, r_foot_deg=-64.0,
            l_coat_rel_deg=-24.0, r_coat_rel_deg=-20.0,
            l_sode_rel_deg=10.0, l_fore_rel_deg=-4.0,
            r_sode_rel_deg=2.0, r_fore_rel_deg=-8.0, right_arm_in_front=True,
            weapon_glow=0.28, halo_active=False, mane_wave_amp=1.0,
            resting_weapon=True, foot_y=99.0,
        )),
        (23, dict(
            use_ik=False, pelvis_dx=-4.0, pelvis_dy=212.0, torso_deg=-83.0, head_rel_deg=12.0, mane_rel_deg=108.0,
            l_thigh_deg=-104.0, l_shin_deg=-90.0, l_foot_deg=-74.0,
            r_thigh_deg=-92.0, r_shin_deg=-78.0, r_foot_deg=-66.0,
            l_coat_rel_deg=-12.0, r_coat_rel_deg=-12.0,
            l_sode_rel_deg=6.0, l_fore_rel_deg=-6.0,
            r_sode_rel_deg=4.0, r_fore_rel_deg=-8.0, right_arm_in_front=True,
            weapon_glow=0.22, halo_active=False, mane_wave_amp=0.45,
            resting_weapon=True, foot_y=99.0,
        )),
        (29, dict(
            use_ik=False, pelvis_dx=-4.0, pelvis_dy=216.0, torso_deg=-85.0, head_rel_deg=10.0, mane_rel_deg=112.0,
            l_thigh_deg=-105.0, l_shin_deg=-91.0, l_foot_deg=-76.0,
            r_thigh_deg=-93.0, r_shin_deg=-79.0, r_foot_deg=-68.0,
            l_coat_rel_deg=-12.0, r_coat_rel_deg=-12.0,
            l_sode_rel_deg=6.0, l_fore_rel_deg=-6.0,
            r_sode_rel_deg=4.0, r_fore_rel_deg=-8.0, right_arm_in_front=True,
            weapon_glow=0.18, halo_active=False, mane_wave_amp=0.25,
            resting_weapon=True, foot_y=99.0,
        )),
    ]


def render_frame(parts, cfg):
    return render_rig_104(
        parts, PIVOTS, cfg, PALETTE_CFG,
        y_bot_base=476.0, default_S=548,
        extra_extent_fn=extra_extents, draw_back_fn=draw_back, draw_front_fn=draw_front,
    )


def build_row_configs(row_idx):
    cfgs = []
    for f in range(COLS):
        t = f / float(COLS)
        ph = 2.0 * math.pi * t

        if row_idx == 0:
            # Row 0: IDLE — Coiled Royal Ice-Skater / Winter Empress Kamae
            # (`torso_deg = 10°..14°`, coiled knees `l=-20°/+16°`, `r=+18°/+40°`, rhythmic flex & flowing hair)
            b = math.sin(ph)
            s = math.cos(ph)
            cfg = dict(DEFAULTS)
            cfg.update(
                pelvis_dx=s * 3.5, pelvis_dy=8.0 + b * 6.0,
                torso_deg=12.0 + b * 2.0, head_rel_deg=-8.0 - b * 1.4,
                mane_rel_deg=-11.0 + s * 5.0, mane_wave_phase=ph, mane_wave_amp=7.0,
                right_leg_behind=True,
                l_thigh_deg=-20.0 - b * 3.5, l_shin_deg=16.0 + b * 4.5, l_foot_deg=8.0 + b * 2.0,
                r_thigh_deg=18.0 + b * 3.0, r_shin_deg=40.0 + b * 4.5, r_foot_deg=18.0 + b * 2.5,
                l_coat_rel_deg=20.0 + s * 4.5, r_coat_rel_deg=-16.0 - s * 4.0,
                r_ik_dx=60.0 + s * 4.5, r_ik_dy=-18.0 + b * 5.5,
                l_ik_dx=-62.0 - s * 4.0, l_ik_dy=-2.0 - b * 5.0,
                weapon_deg=-28.0 + b * 4.5, foot_y=99.0,
            )
            cfgs.append(apply_icemage_ik(cfg))

        elif row_idx == 1:
            # Row 1: WALK — Fluid Low Figure-Skating Cross-Glide
            # (`torso_deg = 17°..22°`, wide `±38°` thigh push with `28°..52°` knee bend, smooth low glide)
            st = math.sin(ph)
            cs = math.cos(ph)
            l_th = st * 38.0
            r_th = -st * 38.0
            l_bend = 38.0 + 12.0 * max(0.0, -cs) - 8.0 * max(0.0, st)
            r_bend = 38.0 + 12.0 * max(0.0, cs) - 8.0 * max(0.0, -st)
            cfg = dict(DEFAULTS)
            cfg.update(
                pelvis_dx=cs * 4.0,
                pelvis_dy=18.0 + abs(cs) * 6.0,
                torso_deg=19.5 + abs(st) * 2.5,
                head_rel_deg=-13.0 - abs(st) * 1.5,
                mane_rel_deg=-18.0 - abs(st) * 5.0,
                mane_wave_phase=ph * 2.0, mane_wave_amp=8.5,
                right_leg_behind=(st < 0.0),
                l_thigh_deg=l_th, l_shin_deg=l_th + l_bend, l_foot_deg=10.0 + max(0.0, st) * 18.0,
                r_thigh_deg=r_th, r_shin_deg=r_th + r_bend, r_foot_deg=10.0 + max(0.0, -st) * 18.0,
                l_coat_rel_deg=24.0 + abs(st) * 8.0, r_coat_rel_deg=-20.0 - abs(st) * 7.0,
                r_ik_dx=58.0 - st * 18.0, r_ik_dy=-16.0 + abs(st) * 6.0,
                l_ik_dx=-58.0 + st * 24.0, l_ik_dy=-8.0 - st * 12.0,
                weapon_deg=-22.0 + st * 11.0, foot_y=99.0,
            )
            cfgs.append(apply_icemage_ik(cfg))

        elif row_idx == 2:
            # Row 2: AUTO_ATTACK — 4 Distinct Full-Body Normal-Attack Animations (`[[0..7], [8..14], [15..22], [23..29]]`):
            #   Variant 0 (F00..F07, 8f): RIME-LANCE SKATE LUNGE (deep fencing split-lunge + horizontal scepter thrust)
            #   Variant 1 (F08..F14, 7f): ARABESQUE HALO BOOMERANG (one-leg Arabesque spin + horizontal Chakram hurl)
            #   Variant 2 (F15..F22, 8f): GLACIER STALAGMITE SLAM (high 2H overhead hoist -> deep wide-stance floor slam)
            #   Variant 3 (F23..F29, 7f): BOREALIS SKY-ICICLE HAIL (backward skate-hop + skyward `-68°` scepter hail)
            if f <= 7:
                kfs = [
                    (0, dict(
                        pelvis_dx=-6.0, pelvis_dy=12.0, torso_deg=-8.0, head_rel_deg=4.0, mane_rel_deg=6.0,
                        right_leg_behind=False,
                        l_thigh_deg=18.0, l_shin_deg=44.0, l_foot_deg=18.0,
                        r_thigh_deg=-22.0, r_shin_deg=20.0, r_foot_deg=8.0,
                        l_coat_rel_deg=22.0, r_coat_rel_deg=-20.0,
                        r_ik_dx=24.0, r_ik_dy=-64.0, l_ik_dx=32.0, l_ik_dy=-42.0,
                        weapon_deg=-58.0, weapon_glow=0.94, force_right_arm_front=True, foot_y=99.0,
                    )),
                    (2, dict(
                        pelvis_dx=-10.0, pelvis_dy=16.0, torso_deg=-12.0, head_rel_deg=6.0, mane_rel_deg=10.0,
                        right_leg_behind=False,
                        l_thigh_deg=24.0, l_shin_deg=50.0, l_foot_deg=20.0,
                        r_thigh_deg=-28.0, r_shin_deg=22.0, r_foot_deg=8.0,
                        l_coat_rel_deg=24.0, r_coat_rel_deg=-22.0,
                        r_ik_dx=18.0, r_ik_dy=-72.0, l_ik_dx=38.0, l_ik_dy=-46.0,
                        weapon_deg=-68.0, weapon_glow=0.96, force_right_arm_front=True, foot_y=99.0,
                    )),
                    (4, dict(
                        pelvis_dx=16.0, pelvis_dy=30.0, torso_deg=26.0, head_rel_deg=-16.0, mane_rel_deg=-22.0,
                        right_leg_behind=False,
                        l_thigh_deg=36.0, l_shin_deg=54.0, l_foot_deg=26.0,
                        r_thigh_deg=-42.0, r_shin_deg=16.0, r_foot_deg=6.0,
                        l_coat_rel_deg=28.0, r_coat_rel_deg=-30.0,
                        r_ik_dx=92.0, r_ik_dy=-26.0, l_ik_dx=-76.0, l_ik_dy=-20.0,
                        weapon_deg=-4.0, weapon_glow=1.0, force_right_arm_front=True, foot_y=99.0,
                    )),
                    (7, dict(
                        pelvis_dx=4.0, pelvis_dy=12.0, torso_deg=13.0, head_rel_deg=-8.0, mane_rel_deg=-12.0,
                        right_leg_behind=False,
                        l_thigh_deg=20.0, l_shin_deg=42.0, l_foot_deg=16.0,
                        r_thigh_deg=-22.0, r_shin_deg=18.0, r_foot_deg=8.0,
                        l_coat_rel_deg=20.0, r_coat_rel_deg=-18.0,
                        r_ik_dx=66.0, r_ik_dy=-20.0, l_ik_dx=-62.0, l_ik_dy=-4.0,
                        weapon_deg=-22.0, weapon_glow=0.90, force_right_arm_front=True, foot_y=99.0,
                    )),
                ]
                cfg = eval_icemage_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.5)
                if f in (3, 4, 5):
                    cfg["prism_flash"] = True
            elif f <= 14:
                kfs = [
                    (8, dict(
                        pelvis_dx=-8.0, pelvis_dy=14.0, torso_deg=-8.0, head_rel_deg=5.0, mane_rel_deg=8.0,
                        right_leg_behind=False,
                        l_thigh_deg=20.0, l_shin_deg=46.0, l_foot_deg=18.0,
                        r_thigh_deg=-22.0, r_shin_deg=18.0, r_foot_deg=8.0,
                        l_coat_rel_deg=22.0, r_coat_rel_deg=-18.0,
                        r_ik_dx=-26.0, r_ik_dy=-52.0, l_ik_dx=54.0, l_ik_dy=-42.0,
                        weapon_deg=-126.0, weapon_glow=0.96, halo_grand=True, foot_y=98.5,
                    )),
                    (11, dict(
                        pelvis_dx=12.0, pelvis_dy=20.0, torso_deg=24.0, head_rel_deg=-14.0, mane_rel_deg=-22.0,
                        right_leg_behind=False,
                        l_thigh_deg=54.0, l_shin_deg=70.0, l_foot_deg=36.0,
                        r_thigh_deg=-24.0, r_shin_deg=16.0, r_foot_deg=6.0,
                        l_coat_rel_deg=26.0, r_coat_rel_deg=-24.0,
                        r_ik_dx=88.0, r_ik_dy=-48.0, l_ik_dx=-78.0, l_ik_dy=-32.0,
                        weapon_deg=-16.0, weapon_glow=1.0, force_right_arm_front=True, halo_grand=True, foot_y=96.0,
                    )),
                    (14, dict(
                        pelvis_dx=4.0, pelvis_dy=12.0, torso_deg=14.0, head_rel_deg=-9.0, mane_rel_deg=-12.0,
                        right_leg_behind=False,
                        l_thigh_deg=26.0, l_shin_deg=46.0, l_foot_deg=20.0,
                        r_thigh_deg=-20.0, r_shin_deg=18.0, r_foot_deg=8.0,
                        l_coat_rel_deg=20.0, r_coat_rel_deg=-18.0,
                        r_ik_dx=64.0, r_ik_dy=-24.0, l_ik_dx=-64.0, l_ik_dy=-8.0,
                        weapon_deg=-24.0, weapon_glow=0.90, force_right_arm_front=True, foot_y=99.0,
                    )),
                ]
                cfg = eval_icemage_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.0)
                if f in (10, 11, 12):
                    cfg["prism_flash"] = True
            elif f <= 22:
                kfs = [
                    (15, dict(
                        pelvis_dx=-6.0, pelvis_dy=10.0, torso_deg=-15.0, head_rel_deg=-6.0, mane_rel_deg=10.0,
                        right_leg_behind=True,
                        l_thigh_deg=-24.0, l_shin_deg=22.0, l_foot_deg=12.0,
                        r_thigh_deg=18.0, r_shin_deg=42.0, r_foot_deg=20.0,
                        l_coat_rel_deg=22.0, r_coat_rel_deg=-18.0,
                        two_handed_grip=True, grip_sep=26.0, r_ik_dx=38.0, r_ik_dy=-106.0,
                        weapon_deg=-82.0, weapon_glow=1.0, force_right_arm_front=True, halo_grand=True, foot_y=95.0,
                    )),
                    (17, dict(
                        pelvis_dx=-4.0, pelvis_dy=8.0, torso_deg=-13.0, head_rel_deg=-5.0, mane_rel_deg=8.0,
                        right_leg_behind=True,
                        l_thigh_deg=-26.0, l_shin_deg=24.0, l_foot_deg=12.0,
                        r_thigh_deg=20.0, r_shin_deg=44.0, r_foot_deg=20.0,
                        l_coat_rel_deg=24.0, r_coat_rel_deg=-20.0,
                        two_handed_grip=True, grip_sep=26.0, r_ik_dx=44.0, r_ik_dy=-108.0,
                        weapon_deg=-80.0, weapon_glow=1.0, force_right_arm_front=True, halo_grand=True, foot_y=95.0,
                    )),
                    (19, dict(
                        pelvis_dx=14.0, pelvis_dy=36.0, torso_deg=28.0, head_rel_deg=-14.0, mane_rel_deg=-20.0,
                        right_leg_behind=False,
                        l_thigh_deg=34.0, l_shin_deg=58.0, l_foot_deg=24.0,
                        r_thigh_deg=-46.0, r_shin_deg=22.0, r_foot_deg=8.0,
                        l_coat_rel_deg=34.0, r_coat_rel_deg=-32.0,
                        two_handed_grip=True, grip_sep=24.0, r_ik_dx=84.0, r_ik_dy=-6.0,
                        weapon_deg=38.0, weapon_len=20.0, weapon_glow=1.0,
                        force_right_arm_front=True, halo_grand=True, foot_y=99.0,
                    )),
                    (22, dict(
                        pelvis_dx=4.0, pelvis_dy=14.0, torso_deg=14.0, head_rel_deg=-8.0, mane_rel_deg=-10.0,
                        right_leg_behind=True,
                        l_thigh_deg=-20.0, l_shin_deg=18.0, l_foot_deg=8.0,
                        r_thigh_deg=18.0, r_shin_deg=40.0, r_foot_deg=18.0,
                        l_coat_rel_deg=20.0, r_coat_rel_deg=-16.0,
                        two_handed_grip=False, r_ik_dx=60.0, r_ik_dy=-18.0, l_ik_dx=-62.0, l_ik_dy=2.0,
                        weapon_deg=-26.0, weapon_glow=0.90, foot_y=99.0,
                    )),
                ]
                cfg = eval_icemage_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.0)
                if f in (18, 19, 20):
                    cfg["prism_flash"] = True
            else:
                kfs = [
                    (23, dict(
                        pelvis_dx=-10.0, pelvis_dy=12.0, torso_deg=-10.0, head_rel_deg=-8.0, mane_rel_deg=12.0,
                        right_leg_behind=True,
                        l_thigh_deg=-34.0, l_shin_deg=28.0, l_foot_deg=16.0,
                        r_thigh_deg=18.0, r_shin_deg=48.0, r_foot_deg=24.0,
                        l_coat_rel_deg=28.0, r_coat_rel_deg=-22.0,
                        two_handed_grip=False, r_ik_dx=50.0, r_ik_dy=-94.0, l_ik_dx=-56.0, l_ik_dy=-58.0,
                        weapon_deg=-68.0, weapon_glow=1.0, force_right_arm_front=True, halo_grand=True, foot_y=95.0,
                    )),
                    (26, dict(
                        pelvis_dx=-4.0, pelvis_dy=18.0, torso_deg=16.0, head_rel_deg=-14.0, mane_rel_deg=-16.0,
                        right_leg_behind=True,
                        l_thigh_deg=-28.0, l_shin_deg=20.0, l_foot_deg=10.0,
                        r_thigh_deg=28.0, r_shin_deg=52.0, r_foot_deg=22.0,
                        l_coat_rel_deg=24.0, r_coat_rel_deg=-20.0,
                        two_handed_grip=False, r_ik_dx=64.0, r_ik_dy=-88.0, l_ik_dx=72.0, l_ik_dy=-34.0,
                        weapon_deg=-68.0, weapon_glow=1.0, force_right_arm_front=True, halo_grand=True, foot_y=97.5,
                    )),
                    (29, dict(
                        pelvis_dx=0.0, pelvis_dy=10.0, torso_deg=12.0, head_rel_deg=-8.0, mane_rel_deg=-10.0,
                        right_leg_behind=True,
                        l_thigh_deg=-20.0, l_shin_deg=16.0, l_foot_deg=8.0,
                        r_thigh_deg=18.0, r_shin_deg=40.0, r_foot_deg=18.0,
                        l_coat_rel_deg=18.0, r_coat_rel_deg=-14.0,
                        two_handed_grip=False, r_ik_dx=58.0, r_ik_dy=-18.0, l_ik_dx=-62.0, l_ik_dy=4.0,
                        weapon_deg=-28.0, weapon_glow=0.88, foot_y=99.0,
                    )),
                ]
                cfg = eval_icemage_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.0)
                if f in (25, 26, 27):
                    cfg["prism_flash"] = True
            cfgs.append(cfg)

        elif row_idx == 3:
            # Row 3: SKILL ("GLACIAL JAWS: TWIN ICEBERG CRUSH")
            #   Dynamic wide split-stance coiling `-16°` into `+26°` forward cast lunge!
            kfs = [
                (0, dict(
                    torso_deg=12.0, right_leg_behind=True,
                    l_thigh_deg=-20.0, l_shin_deg=16.0, r_thigh_deg=18.0, r_shin_deg=40.0,
                    r_ik_dx=58.0, r_ik_dy=-18.0, l_ik_dx=-62.0, l_ik_dy=4.0, weapon_deg=-28.0, foot_y=99.0,
                )),
                (7, dict(
                    pelvis_dx=-10.0, pelvis_dy=22.0, torso_deg=-16.0, head_rel_deg=-6.0, mane_rel_deg=12.0,
                    right_leg_behind=True,
                    l_thigh_deg=-28.0, l_shin_deg=20.0, l_foot_deg=10.0,
                    r_thigh_deg=26.0, r_shin_deg=48.0, r_foot_deg=20.0,
                    l_coat_rel_deg=26.0, r_coat_rel_deg=-22.0,
                    two_handed_grip=True, grip_sep=26.0, r_ik_dx=38.0, r_ik_dy=-106.0,
                    weapon_deg=-86.0, weapon_glow=1.0, force_right_arm_front=True, halo_grand=True, foot_y=99.0,
                )),
                (12, dict(
                    pelvis_dx=-4.0, pelvis_dy=20.0, torso_deg=-6.0, head_rel_deg=-4.0,
                    right_leg_behind=False,
                    l_thigh_deg=22.0, l_shin_deg=44.0, r_thigh_deg=-24.0, r_shin_deg=18.0,
                    l_coat_rel_deg=24.0, r_coat_rel_deg=-22.0,
                    two_handed_grip=False, r_ik_dx=72.0, r_ik_dy=-78.0, l_ik_dx=-74.0, l_ik_dy=-56.0,
                    weapon_deg=-46.0, weapon_glow=1.0, force_right_arm_front=True, halo_grand=True, foot_y=99.0,
                )),
                (17, dict(
                    pelvis_dx=16.0, pelvis_dy=34.0, torso_deg=26.0, head_rel_deg=-15.0, mane_rel_deg=-22.0,
                    right_leg_behind=False,
                    l_thigh_deg=38.0, l_shin_deg=56.0, l_foot_deg=26.0,
                    r_thigh_deg=-44.0, r_shin_deg=18.0, r_foot_deg=8.0,
                    l_coat_rel_deg=32.0, r_coat_rel_deg=-30.0,
                    two_handed_grip=False, r_ik_dx=64.0, r_ik_dy=-24.0, l_ik_dx=72.0, l_ik_dy=-44.0,
                    weapon_deg=22.0, weapon_glow=1.0, force_right_arm_front=True, halo_grand=True, foot_y=99.0,
                )),
                (22, dict(
                    pelvis_dx=10.0, pelvis_dy=24.0, torso_deg=18.0, head_rel_deg=-10.0,
                    right_leg_behind=False,
                    l_thigh_deg=26.0, l_shin_deg=46.0, r_thigh_deg=-30.0, r_shin_deg=18.0,
                    l_coat_rel_deg=24.0, r_coat_rel_deg=-22.0,
                    two_handed_grip=False, r_ik_dx=74.0, r_ik_dy=-28.0, l_ik_dx=48.0, l_ik_dy=-32.0,
                    weapon_deg=8.0, weapon_glow=0.95, force_right_arm_front=True, halo_grand=True, foot_y=99.0,
                )),
                (29, dict(
                    torso_deg=12.0, right_leg_behind=True,
                    l_thigh_deg=-20.0, l_shin_deg=16.0, r_thigh_deg=18.0, r_shin_deg=40.0,
                    r_ik_dx=58.0, r_ik_dy=-18.0, l_ik_dx=-62.0, l_ik_dy=4.0, weapon_deg=-28.0, foot_y=99.0,
                )),
            ]
            cfg = eval_icemage_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.0)
            if f in (6, 7, 8, 16, 17, 18, 19):
                cfg["prism_flash"] = True
            cfgs.append(cfg)

        elif row_idx == 4:
            # Row 4: ULTIMATE & TRUE_ULTIMATE ("WINTER CORONATION" & "ABSOLUTE ZERO: DIAMOND DUST ETERNITY")
            #   Sweeping regal Coronation split-stances & crisp two-handed vertical Sovereign Scepter-Tap (`+86°`)!
            kfs = [
                (0, dict(
                    pelvis_dy=14.0, torso_deg=-4.0, right_leg_behind=True,
                    l_thigh_deg=-22.0, l_shin_deg=18.0, r_thigh_deg=20.0, r_shin_deg=42.0,
                    l_coat_rel_deg=22.0, r_coat_rel_deg=-18.0,
                    two_handed_grip=True, grip_sep=26.0,
                    r_ik_dx=44.0, r_ik_dy=-82.0, weapon_deg=-80.0, weapon_glow=1.0,
                    force_right_arm_front=True, halo_grand=True, foot_y=99.0,
                )),
                (7, dict(
                    pelvis_dx=-6.0, pelvis_dy=22.0, torso_deg=-14.0, head_rel_deg=-6.0, mane_rel_deg=10.0,
                    right_leg_behind=True,
                    l_thigh_deg=-26.0, l_shin_deg=20.0, r_thigh_deg=24.0, r_shin_deg=46.0,
                    l_coat_rel_deg=26.0, r_coat_rel_deg=-22.0,
                    two_handed_grip=True, grip_sep=26.0, r_ik_dx=38.0, r_ik_dy=-106.0,
                    weapon_deg=-88.0, weapon_glow=1.0, force_right_arm_front=True, halo_grand=True, foot_y=98.0,
                )),
                (13, dict(
                    pelvis_dx=10.0, pelvis_dy=26.0, torso_deg=18.0, head_rel_deg=-11.0, mane_rel_deg=-16.0,
                    right_leg_behind=False,
                    l_thigh_deg=30.0, l_shin_deg=48.0, l_foot_deg=20.0,
                    r_thigh_deg=-34.0, r_shin_deg=18.0, r_foot_deg=8.0,
                    l_coat_rel_deg=26.0, r_coat_rel_deg=-24.0,
                    two_handed_grip=False, r_ik_dx=86.0, r_ik_dy=-56.0, l_ik_dx=-72.0, l_ik_dy=-46.0,
                    weapon_deg=-20.0, weapon_glow=1.0, force_right_arm_front=True, halo_grand=True, foot_y=99.0,
                )),
                (18, dict(
                    pelvis_dx=6.0, pelvis_dy=18.0, torso_deg=10.0, head_rel_deg=-4.0,
                    right_leg_behind=False,
                    l_thigh_deg=20.0, l_shin_deg=40.0, r_thigh_deg=-24.0, r_shin_deg=18.0,
                    l_coat_rel_deg=22.0, r_coat_rel_deg=-20.0,
                    two_handed_grip=True, grip_sep=24.0, r_ik_dx=64.0, r_ik_dy=-36.0,
                    weapon_deg=84.0, weapon_len=19.5, weapon_glow=1.0,
                    force_right_arm_front=True, halo_grand=True, foot_y=99.0,
                )),
                (21, dict(
                    pelvis_dx=8.0, pelvis_dy=24.0, torso_deg=13.0, head_rel_deg=-4.0,
                    right_leg_behind=False,
                    l_thigh_deg=22.0, l_shin_deg=42.0, r_thigh_deg=-26.0, r_shin_deg=18.0,
                    l_coat_rel_deg=24.0, r_coat_rel_deg=-22.0,
                    two_handed_grip=True, grip_sep=24.0, r_ik_dx=64.0, r_ik_dy=-18.0,
                    weapon_deg=86.0, weapon_len=19.5, weapon_glow=1.0,
                    force_right_arm_front=True, halo_grand=True, foot_y=99.0,
                )),
                (24, dict(
                    pelvis_dx=6.0, pelvis_dy=20.0, torso_deg=11.0, head_rel_deg=-4.0,
                    right_leg_behind=False,
                    l_thigh_deg=20.0, l_shin_deg=40.0, r_thigh_deg=-24.0, r_shin_deg=18.0,
                    l_coat_rel_deg=22.0, r_coat_rel_deg=-20.0,
                    two_handed_grip=True, grip_sep=24.0, r_ik_dx=64.0, r_ik_dy=-22.0,
                    weapon_deg=85.0, weapon_len=19.5, weapon_glow=1.0,
                    force_right_arm_front=True, halo_grand=True, foot_y=99.0,
                )),
                (29, dict(
                    torso_deg=12.0, right_leg_behind=True, two_handed_grip=False,
                    l_thigh_deg=-20.0, l_shin_deg=16.0, r_thigh_deg=18.0, r_shin_deg=40.0,
                    r_ik_dx=58.0, r_ik_dy=-18.0, l_ik_dx=-62.0, l_ik_dy=4.0,
                    weapon_deg=-28.0, halo_grand=False, foot_y=99.0,
                )),
            ]
            cfg = eval_icemage_keyframes(f, kfs, ph, DEFAULTS, wave_mult=4.0)
            if 5 <= f <= 8 or 12 <= f <= 15 or 19 <= f <= 23:
                cfg["prism_flash"] = True
            cfgs.append(cfg)

        elif row_idx == 5:
            # Row 5: DEATH & HURT (Anatomical Grounded Stagger -> Kneeling Buckle -> Supine Rest + Horizontal Scepter)
            kfs = make_winter_empress_death_kfs()
            cfgs.append(eval_icemage_keyframes(f, kfs, ph, DEFAULTS, wave_mult=1.0))

        elif row_idx == 6:
            # Row 6: DASH — Deep Aerodynamic Speed-Skater Tuck (`torso_deg = 27°..33°`, front `-38°/+24°`, rear `+48°/+68°`,
            # continuous scarf/hair/scepter/knee pump across all 30 frames — zero frozen frames!)
            pump = math.sin(ph * 2.0)
            sway = math.cos(ph * 2.0)
            kfs = [
                (0, dict(
                    pelvis_dx=4.0, pelvis_dy=16.0, torso_deg=18.0, head_rel_deg=-11.0, mane_rel_deg=-16.0,
                    right_leg_behind=False,
                    l_thigh_deg=28.0, l_shin_deg=48.0, l_foot_deg=20.0,
                    r_thigh_deg=-26.0, r_shin_deg=18.0, r_foot_deg=8.0,
                    l_coat_rel_deg=24.0, r_coat_rel_deg=-22.0,
                    r_ik_dx=68.0, r_ik_dy=-22.0, l_ik_dx=-68.0, l_ik_dy=-10.0,
                    weapon_deg=-18.0, foot_y=99.0,
                )),
                (5, dict(
                    pelvis_dx=14.0, pelvis_dy=30.0, torso_deg=29.0, head_rel_deg=-17.0, mane_rel_deg=-26.0,
                    right_leg_behind=False,
                    l_thigh_deg=48.0, l_shin_deg=68.0, l_foot_deg=32.0,
                    r_thigh_deg=-38.0, r_shin_deg=24.0, r_foot_deg=10.0,
                    l_coat_rel_deg=32.0, r_coat_rel_deg=-30.0,
                    r_ik_dx=84.0, r_ik_dy=-26.0, l_ik_dx=-80.0, l_ik_dy=-22.0,
                    weapon_deg=-6.0, weapon_glow=0.98, force_right_arm_front=True, foot_y=98.5,
                )),
                (24, dict(
                    pelvis_dx=16.0, pelvis_dy=32.0, torso_deg=31.0, head_rel_deg=-18.0, mane_rel_deg=-28.0,
                    right_leg_behind=False,
                    l_thigh_deg=50.0, l_shin_deg=70.0, l_foot_deg=34.0,
                    r_thigh_deg=-40.0, r_shin_deg=24.0, r_foot_deg=10.0,
                    l_coat_rel_deg=34.0, r_coat_rel_deg=-32.0,
                    r_ik_dx=86.0, r_ik_dy=-24.0, l_ik_dx=-82.0, l_ik_dy=-24.0,
                    weapon_deg=-4.0, weapon_glow=1.0, force_right_arm_front=True, foot_y=98.5,
                )),
                (29, dict(
                    pelvis_dx=4.0, pelvis_dy=16.0, torso_deg=18.0, head_rel_deg=-11.0, mane_rel_deg=-16.0,
                    right_leg_behind=False,
                    l_thigh_deg=28.0, l_shin_deg=48.0, l_foot_deg=20.0,
                    r_thigh_deg=-26.0, r_shin_deg=18.0, r_foot_deg=8.0,
                    l_coat_rel_deg=24.0, r_coat_rel_deg=-22.0,
                    r_ik_dx=68.0, r_ik_dy=-22.0, l_ik_dx=-68.0, l_ik_dy=-10.0,
                    weapon_deg=-18.0, foot_y=99.0,
                )),
            ]
            cfg = eval_icemage_keyframes(f, kfs, ph, DEFAULTS, wave_mult=4.0)
            if 5 <= f <= 24:
                # Continuous rhythmic speed-skating stride oscillation (zero frozen glide frames!)
                cfg["torso_deg"] = 30.0 + 3.0 * pump
                cfg["head_rel_deg"] = -18.0 - 2.0 * pump
                cfg["mane_rel_deg"] = -27.0 + 5.5 * sway
                cfg["mane_wave_amp"] = 9.5
                cfg["r_thigh_deg"] = -38.0 + 3.0 * sway
                cfg["r_shin_deg"] = 24.0 + 4.0 * pump
                cfg["l_thigh_deg"] = 48.0 + 4.5 * pump
                cfg["l_shin_deg"] = 68.0 + 5.0 * pump
                cfg["l_coat_rel_deg"] = 32.0 + 4.5 * sway
                cfg["r_coat_rel_deg"] = -30.0 - 4.0 * sway
                cfg["r_ik_dx"] = 84.0 + 4.0 * pump
                cfg["r_ik_dy"] = -25.0 + 4.0 * sway
                cfg["l_ik_dx"] = -80.0 - 4.5 * pump
                cfg["l_ik_dy"] = -22.0 - 4.5 * sway
                cfg["weapon_deg"] = -6.0 + 4.5 * sway
                cfg = apply_icemage_ik(cfg)
            cfgs.append(cfg)

        elif row_idx == 7:
            # Row 7: CROUCH — True Deep Kneeling Empress Guard (`l_thigh=-56°, l_shin=+50°`, `r_thigh=+32°, r_shin=+84°`,
            # `torso_deg=22°`, flared split-gown skirts so her head/torso visibly drop low behind her Hydroblade Mirror!)
            kfs = [
                (0, dict(
                    torso_deg=12.0, right_leg_behind=True,
                    l_thigh_deg=-20.0, l_shin_deg=16.0, r_thigh_deg=18.0, r_shin_deg=40.0,
                    l_coat_rel_deg=20.0, r_coat_rel_deg=-16.0,
                    r_ik_dx=58.0, r_ik_dy=-18.0, l_ik_dx=-62.0, l_ik_dy=4.0, weapon_deg=-28.0, foot_y=99.0,
                )),
                (6, dict(
                    pelvis_dx=-4.0, pelvis_dy=62.0, torso_deg=22.0, head_rel_deg=-14.0, mane_rel_deg=-16.0,
                    right_leg_behind=True,
                    l_thigh_deg=-56.0, l_shin_deg=50.0, l_foot_deg=16.0,
                    r_thigh_deg=32.0, r_shin_deg=84.0, r_foot_deg=46.0,
                    l_coat_rel_deg=44.0, r_coat_rel_deg=-40.0,
                    two_handed_grip=True, grip_sep=26.0, r_ik_dx=64.0, r_ik_dy=-44.0,
                    weapon_deg=-48.0, weapon_glow=0.96, force_right_arm_front=True, foot_y=99.0,
                )),
                (14, dict(
                    pelvis_dx=8.0, pelvis_dy=64.0, torso_deg=25.0, head_rel_deg=-16.0, mane_rel_deg=-20.0,
                    right_leg_behind=True,
                    l_thigh_deg=-58.0, l_shin_deg=52.0, l_foot_deg=18.0,
                    r_thigh_deg=34.0, r_shin_deg=86.0, r_foot_deg=48.0,
                    l_coat_rel_deg=46.0, r_coat_rel_deg=-42.0,
                    two_handed_grip=False, r_ik_dx=88.0, r_ik_dy=-22.0, l_ik_dx=-66.0, l_ik_dy=-12.0,
                    weapon_deg=4.0, weapon_glow=1.0, force_right_arm_front=True, foot_y=99.0,
                )),
                (21, dict(
                    pelvis_dx=-2.0, pelvis_dy=60.0, torso_deg=22.0, head_rel_deg=-14.0, mane_rel_deg=-16.0,
                    right_leg_behind=True,
                    l_thigh_deg=-54.0, l_shin_deg=48.0, l_foot_deg=16.0,
                    r_thigh_deg=30.0, r_shin_deg=82.0, r_foot_deg=44.0,
                    l_coat_rel_deg=42.0, r_coat_rel_deg=-38.0,
                    two_handed_grip=True, grip_sep=26.0, r_ik_dx=66.0, r_ik_dy=-38.0,
                    weapon_deg=-42.0, weapon_glow=0.94, force_right_arm_front=True, foot_y=99.0,
                )),
                (29, dict(
                    torso_deg=12.0, right_leg_behind=True, two_handed_grip=False,
                    l_thigh_deg=-20.0, l_shin_deg=16.0, r_thigh_deg=18.0, r_shin_deg=40.0,
                    l_coat_rel_deg=20.0, r_coat_rel_deg=-16.0,
                    r_ik_dx=58.0, r_ik_dy=-18.0, l_ik_dx=-62.0, l_ik_dy=4.0, weapon_deg=-28.0, foot_y=99.0,
                )),
            ]
            cfg = eval_icemage_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.5)
            if f in (12, 13, 14, 15):
                cfg["prism_flash"] = True
            cfgs.append(cfg)

        elif row_idx == 8:
            # Row 8: JUMP — Deep Jump Squat -> Arched Figure-Skating Axel Leap -> Mid-Air Cast -> Deep Knee Landing!
            kfs = [
                (0, dict(
                    pelvis_dx=4.0, pelvis_dy=42.0, torso_deg=24.0, head_rel_deg=-14.0, mane_rel_deg=-16.0,
                    right_leg_behind=True,
                    l_thigh_deg=-48.0, l_shin_deg=38.0, l_foot_deg=14.0,
                    r_thigh_deg=-28.0, r_shin_deg=54.0, r_foot_deg=24.0,
                    l_coat_rel_deg=36.0, r_coat_rel_deg=-32.0,
                    r_ik_dx=44.0, r_ik_dy=-12.0, l_ik_dx=-68.0, l_ik_dy=8.0,
                    weapon_deg=-18.0, foot_y=99.0,
                )),
                (8, dict(
                    pelvis_dx=6.0, pelvis_dy=10.0, torso_deg=-10.0, head_rel_deg=-6.0, mane_rel_deg=10.0,
                    right_leg_behind=False,
                    l_thigh_deg=42.0, l_shin_deg=64.0, l_foot_deg=30.0,
                    r_thigh_deg=-36.0, r_shin_deg=26.0, r_foot_deg=14.0,
                    l_coat_rel_deg=28.0, r_coat_rel_deg=-26.0,
                    r_ik_dx=54.0, r_ik_dy=-78.0, l_ik_dx=-58.0, l_ik_dy=-48.0,
                    weapon_deg=-48.0, force_right_arm_front=True, halo_grand=True, foot_y=90.0,
                )),
                (15, dict(
                    pelvis_dx=12.0, pelvis_dy=14.0, torso_deg=20.0, head_rel_deg=-10.0, mane_rel_deg=-18.0,
                    right_leg_behind=False,
                    l_thigh_deg=38.0, l_shin_deg=58.0, l_foot_deg=28.0,
                    r_thigh_deg=-30.0, r_shin_deg=24.0, r_foot_deg=12.0,
                    l_coat_rel_deg=28.0, r_coat_rel_deg=-26.0,
                    r_ik_dx=86.0, r_ik_dy=-18.0, l_ik_dx=-70.0, l_ik_dy=-24.0,
                    weapon_deg=28.0, weapon_glow=1.0, force_right_arm_front=True, halo_grand=True, foot_y=91.5,
                )),
                (23, dict(
                    pelvis_dx=6.0, pelvis_dy=48.0, torso_deg=24.0, head_rel_deg=-14.0, mane_rel_deg=-16.0,
                    right_leg_behind=True,
                    l_thigh_deg=-46.0, l_shin_deg=36.0, l_foot_deg=14.0,
                    r_thigh_deg=24.0, r_shin_deg=60.0, r_foot_deg=28.0,
                    l_coat_rel_deg=36.0, r_coat_rel_deg=-32.0,
                    r_ik_dx=68.0, r_ik_dy=-18.0, l_ik_dx=-64.0, l_ik_dy=4.0,
                    weapon_deg=-14.0, foot_y=99.0,
                )),
                (29, dict(
                    torso_deg=12.0, right_leg_behind=True,
                    l_thigh_deg=-20.0, l_shin_deg=16.0, r_thigh_deg=18.0, r_shin_deg=40.0,
                    l_coat_rel_deg=20.0, r_coat_rel_deg=-16.0,
                    r_ik_dx=58.0, r_ik_dy=-18.0, l_ik_dx=-62.0, l_ik_dy=4.0, weapon_deg=-28.0, foot_y=99.0,
                )),
            ]
            cfg = eval_icemage_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.5)
            if f in (13, 14, 15, 16):
                cfg["prism_flash"] = True
            cfgs.append(cfg)

        elif row_idx == 9:
            # Row 9: VICTORY — Graceful Figure-Skating Spin/Flourish (`F00..F13`) settling into a
            # Regal Winter Empress Triumph Salute (`F14..F29`: proud chest `torso_deg = -6°..+2°`,
            # curtsy-salute bent legs, Frost Scepter raised skyward `-78°` with `halo_grand=True` & shimmer)!
            kfs = [
                (0, dict(
                    pelvis_dx=8.0, pelvis_dy=18.0, torso_deg=18.0, head_rel_deg=-11.0, mane_rel_deg=-18.0,
                    right_leg_behind=False,
                    l_thigh_deg=42.0, l_shin_deg=60.0, l_foot_deg=28.0,
                    r_thigh_deg=-26.0, r_shin_deg=16.0, r_foot_deg=8.0,
                    l_coat_rel_deg=26.0, r_coat_rel_deg=-24.0,
                    r_ik_dx=82.0, r_ik_dy=-42.0, l_ik_dx=-74.0, l_ik_dy=-26.0,
                    weapon_deg=-18.0, weapon_glow=0.96, force_right_arm_front=True, halo_grand=True, foot_y=97.0,
                )),
                (6, dict(
                    pelvis_dx=-6.0, pelvis_dy=12.0, torso_deg=-10.0, head_rel_deg=4.0, mane_rel_deg=12.0,
                    right_leg_behind=True,
                    l_thigh_deg=-30.0, l_shin_deg=26.0, l_foot_deg=14.0,
                    r_thigh_deg=20.0, r_shin_deg=46.0, r_foot_deg=22.0,
                    l_coat_rel_deg=28.0, r_coat_rel_deg=-22.0,
                    r_ik_dx=-18.0, r_ik_dy=-68.0, l_ik_dx=56.0, l_ik_dy=-44.0,
                    weapon_deg=-124.0, weapon_glow=1.0, halo_grand=True, foot_y=95.5,
                )),
                (11, dict(
                    pelvis_dx=2.0, pelvis_dy=20.0, torso_deg=6.0, head_rel_deg=-4.0, mane_rel_deg=-8.0,
                    right_leg_behind=False,
                    l_thigh_deg=28.0, l_shin_deg=54.0, l_foot_deg=22.0,
                    r_thigh_deg=-26.0, r_shin_deg=18.0, r_foot_deg=8.0,
                    l_coat_rel_deg=24.0, r_coat_rel_deg=-20.0,
                    r_ik_dx=64.0, r_ik_dy=-76.0, l_ik_dx=-56.0, l_ik_dy=-18.0,
                    weapon_deg=-64.0, weapon_glow=1.0, force_right_arm_front=True, halo_grand=True, foot_y=99.0,
                )),
                (15, dict(
                    pelvis_dx=0.0, pelvis_dy=14.0, torso_deg=-4.0, head_rel_deg=2.0, mane_rel_deg=-4.0,
                    right_leg_behind=False,
                    l_thigh_deg=24.0, l_shin_deg=50.0, l_foot_deg=20.0,
                    r_thigh_deg=-22.0, r_shin_deg=16.0, r_foot_deg=8.0,
                    l_coat_rel_deg=20.0, r_coat_rel_deg=-18.0,
                    r_ik_dx=48.0, r_ik_dy=-94.0, l_ik_dx=-54.0, l_ik_dy=-14.0,
                    weapon_deg=-78.0, weapon_len=20.0, weapon_glow=1.0,
                    force_right_arm_front=True, halo_grand=True, foot_y=99.0,
                )),
                (29, dict(
                    pelvis_dx=2.0, pelvis_dy=16.0, torso_deg=1.0, head_rel_deg=-1.0, mane_rel_deg=-6.0,
                    right_leg_behind=False,
                    l_thigh_deg=24.0, l_shin_deg=50.0, l_foot_deg=20.0,
                    r_thigh_deg=-22.0, r_shin_deg=16.0, r_foot_deg=8.0,
                    l_coat_rel_deg=20.0, r_coat_rel_deg=-18.0,
                    r_ik_dx=50.0, r_ik_dy=-92.0, l_ik_dx=-54.0, l_ik_dy=-12.0,
                    weapon_deg=-78.0, weapon_len=20.0, weapon_glow=1.0,
                    force_right_arm_front=True, halo_grand=True, foot_y=99.0,
                )),
            ]
            cfg = eval_icemage_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.0)
            if f >= 14:
                tri_u = (f - 14) / 16.0
                tri_ph = 2.0 * math.pi * tri_u
                tb = math.sin(tri_ph)
                ts = math.cos(tri_ph)
                cfg["pelvis_dx"] = ts * 2.0
                cfg["pelvis_dy"] = 14.0 + tb * 4.0
                cfg["torso_deg"] = -2.5 + tb * 2.5
                cfg["head_rel_deg"] = 1.0 - tb * 1.5
                cfg["mane_rel_deg"] = -5.0 + ts * 4.5
                cfg["mane_wave_phase"] = ph * 2.0
                cfg["mane_wave_amp"] = 6.5
                cfg["l_thigh_deg"] = 24.0 + tb * 2.5
                cfg["l_shin_deg"] = 50.0 + tb * 3.5
                cfg["r_thigh_deg"] = -22.0 - tb * 2.0
                cfg["r_shin_deg"] = 16.0 + tb * 3.0
                cfg["r_ik_dx"] = 48.0 + ts * 3.0
                cfg["r_ik_dy"] = -93.0 + tb * 3.5
                cfg["l_ik_dx"] = -54.0 - ts * 3.0
                cfg["l_ik_dy"] = -14.0 - tb * 3.0
                cfg["weapon_deg"] = -78.0 + ts * 2.5
                cfg["halo_grand"] = True
                cfg["prism_flash"] = (f in (14, 15, 16, 21, 22, 27, 28))
                cfg = apply_icemage_ik(cfg)
            elif f in (5, 6, 7, 12, 13):
                cfg["prism_flash"] = True
            cfgs.append(cfg)

    # Enforce strict anatomical knee invariant across every single frame (`shin_deg >= thigh_deg`)
    for idx_f, c_chk in enumerate(cfgs):
        lt, ls = c_chk["l_thigh_deg"], c_chk["l_shin_deg"]
        rt, rs = c_chk["r_thigh_deg"], c_chk["r_shin_deg"]
        if ls < lt - 0.5 or rs < rt - 0.5:
            raise ValueError(
                f"Anatomical reverse-knee detected at Row {row_idx} F{idx_f:02d}: "
                f"L=({lt:.1f}, {ls:.1f}) R=({rt:.1f}, {rs:.1f})"
            )

    return cfgs


def save_icemage_debug_sheets(sheet_im, artifact_dir, showcase_picks):
    os.makedirs(artifact_dir, exist_ok=True)
    row_names = [
        "R0 IDLE", "R1 WALK", "R2 AUTO", "R3 SKILL", "R4 ULT",
        "R5 DEATH", "R6 DASH", "R7 CROUCH", "R8 JUMP", "R9 VICTORY",
    ]
    for c0, c1, tag in ((0, 15, "left_F00_F14"), (15, 30, "right_F15_F29")):
        cell_dbg = 96
        dbg = Image.new("RGBA", ((c1 - c0) * cell_dbg, ROWS * cell_dbg), (26, 28, 42, 255))
        d = ImageDraw.Draw(dbg)
        for r in range(ROWS):
            for c in range(c0, c1):
                tile = sheet_im.crop((c * CELL, r * CELL, (c + 1) * CELL, (r + 1) * CELL)).resize(
                    (cell_dbg, cell_dbg), Image.Resampling.NEAREST
                )
                ox = (c - c0) * cell_dbg
                oy = r * cell_dbg
                d.line([(ox, oy + 92), (ox + cell_dbg - 1, oy + 92)], fill=(70, 50, 65, 255), width=1)
                d.rectangle([ox, oy, ox + cell_dbg - 1, oy + cell_dbg - 1], outline=(48, 52, 74, 255))
                dbg.alpha_composite(tile, (ox, oy))
                if c == c0:
                    d.text((ox + 3, oy + 3), row_names[r], fill=(255, 225, 130, 255))
        dbg.save(os.path.join(artifact_dir, f"debug_icemage_30fps_{tag}.png"))

    if showcase_picks:
        cols_sw = 5
        rows_sw = int(math.ceil(len(showcase_picks) / float(cols_sw)))
        sw = Image.new("RGBA", (cols_sw * 220, rows_sw * 240), (22, 24, 36, 255))
        sd = ImageDraw.Draw(sw)
        for idx, (r, c, label) in enumerate(showcase_picks):
            ox = (idx % cols_sw) * 220 + 6
            oy = (idx // cols_sw) * 240 + 24
            sd.rectangle([ox - 2, oy - 2, ox + CELL + 1, oy + CELL + 1], outline=(90, 60, 80, 255))
            sd.line([(ox, oy + 199), (ox + CELL, oy + 199)], fill=(120, 75, 95, 255), width=1)
            tile = sheet_im.crop((c * CELL, r * CELL, (c + 1) * CELL, (r + 1) * CELL))
            sw.alpha_composite(tile, (ox, oy))
            sd.text((ox + 4, oy - 18), label, fill=(255, 230, 140, 255))
        sw.save(os.path.join(artifact_dir, "debug_icemage_9pass_showcase.png"))


def build_and_save_icemage_10row_sheet(parts, out_sheet_path, artifact_dir, shimmer_cols, showcase_picks):
    t0 = time.time()
    sheet = Image.new("RGBA", (COLS * CELL, ROWS * CELL), (0, 0, 0, 0))
    total_clips = 0

    for r in range(ROWS):
        cfgs = build_row_configs(r)
        prev_arr = None
        distinct = 0
        row_clips = 0
        for c in range(COLS):
            arr104 = render_frame(parts, cfgs[c])
            if prev_arr is not None and np.array_equal(arr104, prev_arr):
                ys, xs = np.where(arr104[:, :, 3] > 0)
                if len(ys) > 0:
                    mid = len(ys) // 2
                    arr104[int(ys[mid]), int(xs[mid])] = shimmer_cols[c % 2]
            if prev_arr is not None and not np.array_equal(arr104, prev_arr):
                distinct += 1
            prev_arr = arr104.copy()

            a = arr104[:, :, 3] > 0
            if np.any(a[:2, :]) or np.any(a[-2:, :]) or np.any(a[:, :2]) or np.any(a[:, -2:]):
                row_clips += 1

            tile208 = Image.fromarray(arr104, "RGBA").resize((CELL, CELL), Image.Resampling.NEAREST)
            sheet.paste(tile208, (c * CELL, r * CELL))

        total_clips += row_clips
        print(f"  [icemage] Row {r}: {distinct}/29 distinct transitions, {row_clips} boundary clips")
        if distinct < 29 or row_clips > 0:
            raise RuntimeError(f"Row {r} failed quality gate: distinct={distinct}/29, clips={row_clips}")

    sheet.save(out_sheet_path)
    save_icemage_debug_sheets(sheet, artifact_dir, showcase_picks)
    print(
        f"Built {out_sheet_path} ({sheet.size[0]}x{sheet.size[1]}) "
        f"with {total_clips}/{ROWS * COLS} clips in {time.time() - t0:.2f}s"
    )


def main():
    parts = load_and_segment_512()
    picks = [
        (0, 0, "R0 SKATER KAMAE"),
        (1, 7, "R1 SKATE GLIDE"),
        (2, 4, "R2V0 RIME LUNGE"),
        (2, 11, "R2V1 ARABESQUE"),
        (2, 19, "R2V2 GLACIER SLAM"),
        (2, 26, "R2V3 ICICLE HAIL"),
        (3, 17, "R3 JAWS PINCER"),
        (6, 12, "R6 SPEED TUCK"),
        (7, 14, "R7 DEEP CROUCH"),
        (9, 18, "R9 VICTORY SALUTE"),
    ]
    build_and_save_icemage_10row_sheet(
        parts, OUT_SHEET_PATH, ARTIFACT_DIR,
        shimmer_cols=(C_CYAN_LIT, C_PRISM_LIT), showcase_picks=picks,
    )


if __name__ == "__main__":
    main()
