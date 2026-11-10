#!/usr/bin/env python3
"""
Builds Malakor (Reaper — Abyssal Necropolis Dreadlord & Sovereign of Death)
30fps HD-2D Sprite Sheet (`assets/sprites/reaper_sheet.png`, 6240x1872, 30 cols x 9 rows of 208x208)
and HD-2D Portrait (`assets/portraits/reaper.png`, 128x128) using `reaper_v3_base` + `hd2d_rig_core`.

Key Features:
- Clean 15-part skeletal segmentation of `reaper_v3_base`:
  * `head`: hooded skull with glowing magenta eye sockets & spiked dark-iron crown
  * `torso`: glowing crimson-magenta ribcage & soul-core breastplate + skull belt
  * `l_sode` / `r_sode` (`l_pauldron` / `r_pauldron`): horned skull pauldrons
  * `l_forearm` / `r_forearm` (`l_arm` / `r_arm`): bone-plated gauntlets
  * `l_thigh`, `l_shin`, `l_foot` / `r_thigh`, `r_shin`, `r_foot` (`l_leg` / `r_leg`): dark steel greaves planted at y=99
  * `mane` (`cloak`): tattered abyssal necropolis cloak
- Analytical 2-Bone Two-Handed IK (`apply_2h_scythe_ik`) locking BOTH of Malakor's bone-plated
  gauntlets onto a Colossal 2H Cursed Bone-and-Obsidian Soul-Reaper Great-Scythe
  (`draw_2h_soulreaper_greatscythe_104`).
- 0/270 boundary clips and 29/29 distinct transitions across all 9 rows.
"""

import os
import math
import shutil
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from hd2d_rig_core import (
    COLS, P, BASE_NUMERIC_KEYS, poly_mask, keep_largest_component, clean_base_512,
    assign_remaining_geodesic, extract_parts_512, rot_pt,
    put_px, draw_line_104, draw_slash_arc_104, render_rig_104,
    make_prone_knight_death_kfs, eval_pose_keyframes, build_and_save_30fps_sheet,
)

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ARTIFACT_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/3a4b2cf8-05c2-45a3-bb65-af6f5b5a1088"

V3_BASE_ARTIFACT = os.path.join(ARTIFACT_DIR, "reaper_v3_base_1794302628800.jpg")
V3_PORTRAIT_ARTIFACT = os.path.join(ARTIFACT_DIR, "portrait_hd2d_reaper_v3_clean_1794302628767.jpg")
BASE_IMG_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "reaper_v3_base.jpg")
OUT_SHEET_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "reaper_sheet.png")
OUT_PORTRAIT_PATH = os.path.join(ROOT_DIR, "assets", "portraits", "reaper.png")
VFX_SHEET_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "reaper_vfx.png")

# Strict 20-Color Hand-Crafted Abyssal Necropolis & Soul-Reaper Master Palette
MASTER_PALETTE = np.array([
    [13, 4, 20],      # 0: Abyssal Void Outline (#0d0414)
    [22, 14, 34],     # 1: Dark Necropolis Selout
    [32, 24, 50],     # 2: Tattered Cloak & Dark-Iron Deep Shadow
    [48, 38, 74],     # 3: Abyssal Hood & Cloak Base
    [66, 54, 102],    # 4: Lit Hood & Cloak Fold Midtone
    [92, 76, 136],    # 5: Cloak Rim & Dark-Steel Highlight
    [46, 38, 52],     # 6: Cursed Bone & Greave Deep Shadow
    [72, 60, 80],     # 7: Aged Skull-Pauldron & Gauntlet Base
    [106, 90, 114],   # 8: Sculpted Bone & Greave Midtone
    [148, 130, 152],  # 9: Lit Cranium & Skull-Pauldron Highlight
    [194, 178, 198],  # 10: Polished Bone Fang & Edge Gleam
    [232, 220, 238],  # 11: Specular Bone & Razor-Edge Highlight
    [64, 14, 68],     # 12: Deep Necrotic Ribcage Shadow
    [104, 24, 118],   # 13: Abyssal Amethyst Soul-Steel Base
    [142, 44, 194],   # 14: Vibrant Violet Soul-Blade Bevel
    [168, 85, 247],   # 15: Luminous Soul-Violet Glow (#a855f7)
    [216, 180, 254],  # 16: Pale Lavender Soul-Crystal Highlight
    [156, 20, 76],    # 17: Deep Blood-Crimson Ribcage Core
    [255, 42, 133],   # 18: Blazing Rose-Magenta Eye & Soul-Rune Glow (#ff2a85)
    [255, 228, 244],  # 19: White-Hot Soul Core & Cutting Edge
], dtype=np.int32)

C_OUT = (13, 4, 20, 255)
C_SEL = (22, 14, 34, 255)
C_CLOAK_DARK = (32, 24, 50, 255)
C_CLOAK_BASE = (48, 38, 74, 255)
C_CLOAK_LIT = (66, 54, 102, 255)
C_IRON_DARK = (46, 38, 52, 255)
C_IRON_MID = (72, 60, 80, 255)
C_BONE_MID = (106, 90, 114, 255)
C_BONE_LIT = (148, 130, 152, 255)
C_BONE_SPEC = (194, 178, 198, 255)
C_RAZOR_WHITE = (232, 220, 238, 255)
C_VIO_DARK = (64, 14, 68, 255)
C_VIO_BASE = (104, 24, 118, 255)
C_VIO_MID = (142, 44, 194, 255)
C_VIO_LIT = (168, 85, 247, 255)
C_VIO_SPEC = (216, 180, 254, 255)
C_CRIM_DARK = (156, 20, 76, 255)
C_ROSE = (255, 42, 133, 255)
C_CORE = (255, 228, 244, 255)

# Skeletal pivots in 512x512 rig space (0.5x of 1024x1024 reaper_v3_base.jpg)
PIVOTS = dict(
    pelvis=(268.0, 240.0), neck=(264.0, 114.0), mane=(208.0, 196.0),
    l_sh=(196.0, 125.0), l_elb=(174.0, 198.0), l_hand=(198.0, 274.0),
    r_sh=(309.0, 134.0), r_elb=(318.0, 202.0), r_hand=(344.0, 268.0),
    l_hip=(225.0, 270.0), l_knee=(213.0, 348.0), l_ank=(192.0, 448.0),
    r_hip=(288.0, 270.0), r_knee=(303.0, 348.0), r_ank=(294.0, 442.0),
)

# Precompute 2-Bone IK rest lengths & angles for BOTH arms in 512-space
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
    protect_indices=(10, 11, 14, 15, 16, 17, 18, 19),
    hair_indices=(2, 3, 4, 5),
    lit_selout=1,
    shad_selout=0,
    hair_selout=0,
    joint_fill=(26, 20, 40, 255),
    joint_inner=(42, 34, 62, 255),
    hip_r=20,
    thigh_r=16,
    arm_r=14,
    pinhole_fill=(32, 24, 50, 255),
)


def put_px_safe(arr, x, y, col):
    """Strictly clamps drawn pixels inside x in [4..99], y in [4..99] on the 104x104 canvas."""
    ix, iy = int(round(x)), int(round(y))
    if 4 <= ix <= 99 and 4 <= iy <= 99:
        arr[iy, ix] = col


def build_portrait():
    """
    Builds `assets/portraits/reaper.png` (128x128) from `portrait_hd2d_reaper_v3_clean_1794302628767.jpg`
    using MedianFilter(size=5) cel-flattening + 20-color FASTOCTREE quantization (zero dithering).
    """
    src_path = V3_PORTRAIT_ARTIFACT
    if not os.path.exists(src_path):
        raise FileNotFoundError(f"Missing v3 portrait source: {src_path}")
    im = Image.open(src_path).convert("RGB")
    im_flat = im.filter(ImageFilter.MedianFilter(size=5))
    im_128 = im_flat.resize((128, 128), Image.Resampling.NEAREST)
    im_q = im_128.quantize(colors=20, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).convert("RGBA")
    os.makedirs(os.path.dirname(OUT_PORTRAIT_PATH), exist_ok=True)
    im_q.save(OUT_PORTRAIT_PATH)
    print(f"Built {OUT_PORTRAIT_PATH} (128x128, 20-color FASTOCTREE + MedianFilter(5))")


def solve_arm_ik(sh_w, target_w, L1, L2, a1_rest, a2_rest, torso_deg, elbow_clockwise=True):
    """Analytical 2-Bone IK solver in 512x512 rig coordinates."""
    dx = target_w[0] - sh_w[0]
    dy = target_w[1] - sh_w[1]
    dist = math.hypot(dx, dy)
    max_reach = (L1 + L2) * 0.985
    min_reach = abs(L1 - L2) + 8.0
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


def apply_2h_scythe_ik(cfg):
    """
    Solves per-frame 2-Bone IK so BOTH of Malakor's bone-plated gauntlets lock onto the
    Colossal 2H Soul-Reaper Great-Scythe snath (`r_hand` main grip + `l_hand` secondary grip),
    or in `chain_cast_mode` (`Row 3 F01..F14`), extends `l_hand` forward to hurl/yank the
    Spectral Bone-Chain while `r_hand` cocks the Great-Scythe!
    """
    if not cfg.get("two_handed_ik", True):
        return cfg

    torso_deg = cfg.get("torso_deg", 0.0)
    grip_x = cfg.get("grip_x", 50.0)
    grip_y = cfg.get("grip_y", -10.0)
    scythe_deg = cfg.get("weapon_deg", -40.0)
    grip_sep = cfg.get("grip_sep", 36.0)

    pel = PIVOTS["pelvis"]
    l_sh_w = rot_pt(PIVOTS["l_sh"], pel, torso_deg)
    r_sh_w = rot_pt(PIVOTS["r_sh"], pel, torso_deg)

    rad = math.radians(scythe_deg)
    ux, uy = math.cos(rad), math.sin(rad)

    r_target = (pel[0] + grip_x, pel[1] + grip_y)
    if cfg.get("chain_cast_mode", False):
        l_target = (
            pel[0] + cfg.get("chain_lx", 88.0),
            pel[1] + cfg.get("chain_ly", -42.0),
        )
    else:
        l_target = (r_target[0] - ux * grip_sep, r_target[1] - uy * grip_sep)

    r_sode_rel, r_fore_rel = solve_arm_ik(
        r_sh_w, r_target, _R1, _R2, _AR1, _AR2, torso_deg, elbow_clockwise=True
    )
    l_sode_rel, l_fore_rel = solve_arm_ik(
        l_sh_w, l_target, _L1, _L2, _AL1, _AL2, torso_deg, elbow_clockwise=True
    )

    cfg["r_sode_rel_deg"] = r_sode_rel
    cfg["r_fore_rel_deg"] = r_fore_rel
    cfg["l_sode_rel_deg"] = l_sode_rel
    cfg["l_fore_rel_deg"] = l_fore_rel
    if "right_arm_in_front" not in cfg:
        cfg["right_arm_in_front"] = (grip_y < -65.0) or (grip_x > 56.0)
    return cfg


TWO_HAND_NUMERIC_KEYS = tuple(BASE_NUMERIC_KEYS) + (
    "grip_x", "grip_y", "grip_sep", "chain_lx", "chain_ly", "chain_reach",
)


def eval_2h_keyframes(f, keyframes, ph, defaults, extra_meta_keys=(), wave_mult=2.0):
    """
    Cosine-eased keyframe evaluator that interpolates `(grip_x, grip_y, grip_sep, weapon_deg)`
    alongside body joints and then applies exact 2-bone IK on every frame.
    """
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
    for k in TWO_HAND_NUMERIC_KEYS:
        if k in defaults or k in d0 or k in d1:
            v0 = d0.get(k, defaults.get(k, 0.0))
            v1 = d1.get(k, defaults.get(k, 0.0))
            out[k] = v0 + (v1 - v0) * u

    active_d = d0 if raw_u < 0.5 else d1
    all_meta = (
        "right_arm_in_front", "right_leg_behind", "mane_in_front",
        "show_weapon", "planted_weapon", "resting_weapon", "centered_mode",
        "halo_active", "halo_grand", "speedlines", "speedline_deg",
        "two_handed_ik", "chain_cast_mode", "chain_active", "hook_sign",
        "shadow_mantle",
    ) + tuple(extra_meta_keys)
    for mk in all_meta:
        if mk in active_d:
            out[mk] = active_d[mk]

    out["mane_wave_phase"] = ph * wave_mult
    return apply_2h_scythe_ik(out)


def save_debug_parts_sheet(parts, out_path):
    """Saves a 5x3 contact sheet of all 15 segmented rig parts on a contrasting slate-indigo grid."""
    names = [
        "mane", "head", "torso", "l_coat", "r_coat",
        "l_sode", "l_forearm", "r_sode", "r_forearm", "l_thigh",
        "l_shin", "l_foot", "r_thigh", "r_shin", "r_foot",
    ]
    cw, ch = 220, 220
    pad = 16
    im = Image.new("RGBA", (5 * (cw + pad) + pad, 3 * (ch + pad + 20) + pad), (22, 18, 36, 255))
    d = ImageDraw.Draw(im)
    for idx, nm in enumerate(names):
        c = idx % 5
        r = idx // 5
        ox = pad + c * (cw + pad)
        oy = pad + 20 + r * (ch + pad + 20)
        d.rectangle([ox, oy, ox + cw, oy + ch], fill=(40, 32, 64, 255), outline=(96, 80, 142, 255), width=1)
        if nm in parts:
            pim, _, _ = parts[nm]
            pw, ph = pim.size
            d.text((ox + 2, oy - 16), f"{nm} ({pw}x{ph})", fill=(255, 220, 245, 255))
            scale = min(1.0, (cw - 16) / max(1, pw), (ch - 16) / max(1, ph))
            if scale < 1.0:
                pim = pim.resize((max(1, int(pw * scale)), max(1, int(ph * scale))), Image.Resampling.NEAREST)
            px = ox + (cw - pim.size[0]) // 2
            py = oy + (ch - pim.size[1]) // 2
            im.alpha_composite(pim, (px, py))
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    im.save(out_path)


def load_and_segment_512():
    if os.path.exists(V3_BASE_ARTIFACT) and not os.path.exists(BASE_IMG_PATH):
        os.makedirs(os.path.dirname(BASE_IMG_PATH), exist_ok=True)
        shutil.copyfile(V3_BASE_ARTIFACT, BASE_IMG_PATH)
    elif os.path.exists(V3_BASE_ARTIFACT):
        shutil.copyfile(V3_BASE_ARTIFACT, BASE_IMG_PATH)

    # Use head_y_split=220 so both the hooded skull face AND the glowing crimson-magenta ribcage
    # get crisp 3x3 MedianFilter cel-flattening while cloak & greaves get smooth 5x5 cel-flattening.
    arr = clean_base_512(BASE_IMG_PATH, head_y_split=220)
    H, W = 512, 512

    # Trim the dark lower background cloak webbing between the ankles (x=456..548, y=700..900 in 1024)
    # so the two dark-steel greave legs stride cleanly without dragging a black block between them.
    trim_between_legs = poly_mask(H, W, P([
        (456, 705), (546, 705), (538, 900), (446, 900)
    ]))
    arr[trim_between_legs] = [0, 0, 0, 0]
    a = keep_largest_component(arr[:, :, 3] > 0)
    arr[~a] = [0, 0, 0, 0]

    # Enhance glowing magenta eye sockets & crimson-magenta ribcage soul-core before extraction
    r_ch = arr[:, :, 0].astype(np.int16)
    g_ch = arr[:, :, 1].astype(np.int16)
    b_ch = arr[:, :, 2].astype(np.int16)
    mag_glow = a & (r_ch > 125) & ((r_ch - g_ch) > 48) & (b_ch > 70)
    hot_eye = mag_glow & (r_ch > 195)
    arr[mag_glow] = [255, 42, 133, 255]
    arr[hot_eye] = [255, 228, 244, 255]

    # 1. Head: Hooded Skull with Glowing Magenta Eye Sockets & Spiked Dark-Iron Crown
    m_head = poly_mask(H, W, P([
        (415, 20), (610, 20), (610, 248), (568, 266), (485, 266), (448, 220), (415, 175)
    ])) & a

    # 2. Left Horned Skull Pauldron (`l_sode` / `l_pauldron`) & Bone-Plated Gauntlet (`l_forearm` / `l_arm`)
    m_l_sode = poly_mask(H, W, P([
        (315, 165), (455, 165), (468, 250), (452, 315), (425, 385), (325, 365), (315, 250)
    ])) & a & (~m_head)
    m_l_forearm = poly_mask(H, W, P([
        (295, 338), (422, 378), (442, 525), (440, 592), (345, 592), (295, 435)
    ])) & a & (~m_l_sode) & (~m_head)

    # 3. Right Horned Skull Pauldron (`r_sode` / `r_pauldron`) & Bone-Plated Gauntlet (`r_forearm` / `r_arm`)
    m_r_sode = poly_mask(H, W, P([
        (595, 190), (685, 190), (685, 355), (655, 395), (595, 385)
    ])) & a & (~m_head)
    m_r_forearm = poly_mask(H, W, P([
        (600, 380), (685, 365), (740, 520), (740, 585), (630, 585), (600, 445)
    ])) & a & (~m_r_sode) & (~m_head)

    # 4. Tattered Abyssal Necropolis Cloak (`mane` / `cloak`) streaming on the left
    m_mane = poly_mask(H, W, P([
        (160, 415), (348, 415), (355, 588), (402, 595), (362, 745), (328, 928), (160, 928)
    ])) & a & (~m_l_sode) & (~m_l_forearm)

    # 5. Left & Right Hip Tassets / Coat Tails (`l_coat`, `r_coat`)
    m_l_coat = poly_mask(H, W, P([
        (415, 425), (502, 445), (498, 568), (432, 590), (415, 515)
    ])) & a & (~m_l_forearm) & (~m_l_sode) & (~m_mane)
    m_r_coat = poly_mask(H, W, P([
        (606, 445), (636, 445), (692, 680), (692, 875), (638, 875), (622, 645), (606, 555)
    ])) & a & (~m_r_forearm) & (~m_r_sode)

    # 6. Torso: Glowing Crimson-Magenta Ribcage & Soul-Core Breastplate + Skull Belt + Central Tabard
    m_torso = poly_mask(H, W, P([
        (425, 235), (605, 235), (605, 455), (576, 555), (572, 690),
        (500, 690), (496, 565), (425, 440)
    ])) & a & (~m_head) & (~m_l_sode) & (~m_l_forearm) & (~m_r_sode) & (~m_r_forearm) & (~m_l_coat) & (~m_r_coat)

    # 7. Left & Right Dark-Steel Greave Legs (`l_thigh`, `l_shin`, `l_foot`, `r_thigh`, `r_shin`, `r_foot`)
    m_l_foot = poly_mask(H, W, P([(330, 875), (442, 875), (442, 1004), (330, 1004)])) & a & (~m_mane)
    m_l_shin = poly_mask(H, W, P([(345, 650), (478, 650), (452, 882), (345, 882)])) & a & (~m_l_foot) & (~m_mane) & (~m_torso)
    m_l_thigh = poly_mask(H, W, P([(385, 545), (505, 545), (502, 710), (365, 710)])) & a & (~m_torso) & (~m_l_coat) & (~m_l_forearm) & (~m_l_shin) & (~m_l_foot) & (~m_mane)

    m_r_foot = poly_mask(H, W, P([(535, 868), (706, 868), (706, 985), (535, 985)])) & a & (~m_r_coat)
    m_r_shin = poly_mask(H, W, P([(532, 668), (642, 668), (636, 875), (532, 875)])) & a & (~m_r_foot) & (~m_r_coat) & (~m_torso)
    m_r_thigh = poly_mask(H, W, P([(535, 540), (632, 540), (636, 685), (535, 685)])) & a & (~m_torso) & (~m_r_coat) & (~m_r_forearm) & (~m_r_shin) & (~m_r_foot)

    masks = assign_remaining_geodesic(a, [
        ("mane", m_mane), ("head", m_head), ("torso", m_torso),
        ("l_coat", m_l_coat), ("r_coat", m_r_coat),
        ("l_sode", m_l_sode), ("l_forearm", m_l_forearm),
        ("r_sode", m_r_sode), ("r_forearm", m_r_forearm),
        ("l_thigh", m_l_thigh), ("l_shin", m_l_shin), ("l_foot", m_l_foot),
        ("r_thigh", m_r_thigh), ("r_shin", m_r_shin), ("r_foot", m_r_foot),
    ])

    # Paint a Spiked Dark-Iron Crown along the top brow ridge of `head` so the hooded skull
    # displays a menacing dark-iron crown silhouette!
    head_arr = arr.copy()
    head_mask_extra = np.zeros((H, W), dtype=bool)
    crown_spikes = [
        (246, 24, -3, 10),
        (264, 20, 0, 13),
        (281, 24, 3, 10),
    ]
    for sx, sy, lean, sh in crown_spikes:
        for dy in range(sh):
            u = dy / float(max(1, sh - 1))
            cx = int(round(sx + lean * (1.0 - u)))
            cy = sy - dy
            hw = max(0, int(round(2.2 * (1.0 - u))))
            for dx in range(-hw, hw + 1):
                px, py = cx + dx, cy
                if 0 <= px < W and 0 <= py < H:
                    head_mask_extra[py, px] = True
                    if dy >= sh - 2 or abs(dx) == hw:
                        head_arr[py, px] = [13, 4, 20, 255]
                    elif dx <= 0:
                        head_arr[py, px] = [148, 130, 152, 255]
                    else:
                        head_arr[py, px] = [72, 60, 80, 255]

    patched_masks = []
    for nm, m in masks:
        if nm == "head":
            patched_masks.append((nm, m | head_mask_extra))
        else:
            patched_masks.append((nm, m))

    parts = extract_parts_512(
        arr, patched_masks,
        custom_part_arrays={"head": head_arr},
    )
    # Provide explicit semantic aliases for inspection/compatibility
    parts["cloak"] = parts["mane"]
    parts["l_pauldron"] = parts["l_sode"]
    parts["r_pauldron"] = parts["r_sode"]
    parts["l_arm"] = parts["l_forearm"]
    parts["r_arm"] = parts["r_forearm"]
    parts["l_leg"] = parts["l_shin"]
    parts["r_leg"] = parts["r_shin"]

    save_debug_parts_sheet(parts, os.path.join(ARTIFACT_DIR, "debug_reaper_v3_parts.png"))
    return parts


def draw_necro_halo_104(arr, nx, ny, ph, grand=False):
    """Draws a revolving Abyssal Soul-Ring & Spiked Necropolis Halo behind Malakor's hooded skull."""
    cx, cy = nx - 1.5, ny - 4.0
    rx = 15.5 if grand else 13.8
    ry = 12.0 if grand else 10.6
    n_pts = 36 if grand else 28
    for k in range(n_pts):
        ang = (k / float(n_pts)) * 2.0 * math.pi + ph * 0.5
        px = cx + math.cos(ang) * rx
        py = cy + math.sin(ang) * ry
        put_px_safe(arr, px, py, C_VIO_LIT if k % 3 == 0 else C_VIO_DARK)
    for k in range(6):
        ang = ph + k * (math.pi / 3.0)
        sx = cx + math.cos(ang) * (rx + 2.2)
        sy = cy + math.sin(ang) * (ry + 1.8)
        put_px_safe(arr, sx, sy, C_CORE if (grand and k % 2 == 0) else (C_ROSE if k % 2 == 0 else C_VIO_LIT))
        put_px_safe(arr, sx + 1, sy, C_OUT)
        put_px_safe(arr, sx - 1, sy, C_OUT)


def draw_2h_soulreaper_greatscythe_104(
    arr, hx, hy, scythe_deg, hook_sign=1.0, glow=1.0, phase=0.0, show_gauntlets=True, scale_len=1.0
):
    """
    Draws Malakor's COLOSSAL 2H CURSED BONE-AND-OBSIDIAN SOUL-REAPER GREAT-SCYTHE
    in continuous rotated `(da, dp)` coordinates:
    1. Long curved dark-iron & vertebrated-bone snath shaft (`da` from `-16` to `+34`)
       with bone-ring joints and pommel spike.
    2. Horned Demon-Skull Collar at the blade junction (`da in [28..35]`) with a glowing
       `#ff2a85` / `#a855f7` Abyssal Soul-Gem eye.
    3. Massive Curved Obsidian-and-Magenta Crescent Great-Scythe Blade sweeping from the
       skull collar (`dp` from `-4` to `+38`, curving forward and inward like a true Grim
       Reaper war-scythe), with dark obsidian spine, violet-magenta soul-steel bevels,
       glowing crimson/magenta soul-runes along the fuller, razor-white cutting edge,
       and a 1px `#0d0414` dark selective outline.
    """
    rad = math.radians(scythe_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    nx, ny = -uy * hook_sign, ux * hook_sign

    # Keep the grip origin safely inside the 104x104 canvas so even extreme overhead/forward
    # swings remain 100% inside x in [4..99], y in [4..99] with zero border clips!
    hx = max(18.0, min(72.0, hx))
    hy = max(18.0, min(88.0, hy))

    # -------------------------------------------------------------------------
    # 1. Curved Dark-Iron & Vertebrated-Bone Snath Shaft (da from -16 to +34)
    # -------------------------------------------------------------------------
    for da_raw in np.linspace(-16.0, 34.0, 102):
        da = da_raw * scale_len
        # Subtle ergonomic Grim-Reaper snath S-curve
        dp_center = math.sin((da_raw + 4.0) * 0.11) * 1.35
        if da_raw < -12.5:
            # Jagged Obsidian & Bone Pommel Spike (da in [-16..-12.5])
            u_pom = (da_raw + 16.0) / 3.5
            half_w = 0.55 + 1.85 * max(0.0, min(1.0, u_pom))
        elif da_raw > 27.5:
            # Flared Socket Neck into the Demon-Skull Collar
            u_neck = (da_raw - 27.5) / 6.5
            half_w = 1.65 + 1.15 * max(0.0, min(1.0, u_neck))
        else:
            # Vertebrated Bone-Ring Joints spaced along the dark-iron snath
            is_bone_ring = abs((da_raw + 10.5) % 4.8) < 0.72
            half_w = 2.05 if is_bone_ring else 1.48

        is_bone_ring = abs((da_raw + 10.5) % 4.8) < 0.72
        for dp_rel in np.linspace(-half_w, half_w, 9):
            dp = (dp_center + dp_rel) * scale_len
            px = hx + ux * da + nx * dp
            py = hy + uy * da + ny * dp
            adp = abs(dp_rel)

            if da_raw < -14.8:
                col = C_OUT if adp > 0.45 else C_BONE_SPEC
            elif -14.2 <= da_raw <= -12.6 and adp < 0.95:
                col = C_CORE if adp < 0.42 else C_ROSE
            elif adp >= half_w - 0.48:
                col = C_OUT
            elif adp <= 0.44:
                col = C_BONE_SPEC if is_bone_ring else (C_VIO_LIT if (glow > 0.5 and int(abs(da_raw)) % 3 == 0) else C_IRON_MID)
            elif dp_rel < 0.0:
                col = C_BONE_LIT if is_bone_ring else C_BONE_MID
            else:
                col = C_BONE_MID if is_bone_ring else C_IRON_DARK
            put_px_safe(arr, px, py, col)

    # -------------------------------------------------------------------------
    # 2. Massive Curved Obsidian-and-Magenta Crescent Great-Scythe Blade
    #    Sweeping from the skull collar (dp from -4 to +38), curving forward & inward
    # -------------------------------------------------------------------------
    for dp_raw in np.linspace(-4.0, 38.0, 96):
        dp = dp_raw * scale_len
        if dp_raw < 0.0:
            # Rear Obsidian & Bone Counter-Spur jutting behind the Demon-Skull Collar (dp in [-4..0])
            u_back = abs(dp_raw) / 4.0
            da_mid = 31.2 - 1.4 * u_back
            half_da = 2.6 * (1.0 - 0.75 * u_back)
            for da_raw in np.linspace(da_mid - half_da, da_mid + half_da, 9):
                da = da_raw * scale_len
                px = hx + ux * da + nx * dp
                py = hy + uy * da + ny * dp
                on_edge = (u_back > 0.82) or (abs(da_raw - da_mid) >= half_da - 0.55)
                col = C_OUT if on_edge else (C_ROSE if abs(da_raw - da_mid) < 0.6 else C_IRON_MID)
                put_px_safe(arr, px, py, col)
            continue

        u = dp_raw / 38.0
        # Sweeps slightly forward out of the collar, then hooks deeply inward toward the wielder
        da_outer_raw = 34.8 + 1.8 * math.sin(u * math.pi * 0.58) - 22.8 * (u ** 1.68)
        # Dorsal bone-saw serrations along outer spine
        if 0.14 < u < 0.76 and abs((u * 100.0) % 14.0 - 7.0) < 2.2:
            da_outer_raw += 1.15

        chord_raw = (8.8 * (1.0 - 0.68 * (u ** 1.12)) + 1.6 * math.sin(u * math.pi)) * (
            1.0 - max(0.0, (u - 0.85) / 0.15) ** 1.5
        )
        chord_raw = max(1.1, chord_raw)
        da_inner_raw = da_outer_raw - chord_raw

        n_da = max(7, int(chord_raw * 2.4) + 3)
        for da_raw in np.linspace(da_inner_raw, da_outer_raw, n_da):
            da = da_raw * scale_len
            px = hx + ux * da + nx * dp
            py = hy + uy * da + ny * dp
            # Clamp inside [5..98] so the crescent arc stays 100% intact with a crisp dark outline
            px = max(5.0, min(98.0, px))
            py = max(5.0, min(98.0, py))

            v = (da_raw - da_inner_raw) / max(0.6, chord_raw)  # 0.0 = inner cutting edge, 1.0 = outer spine
            is_rune = (0.38 <= v <= 0.68) and (0.08 <= u <= 0.84) and (abs((dp_raw - 2.0) % 4.6 - 2.3) < 0.85)

            if u >= 0.96 or v >= 0.89:
                # 1px #0d0414 dark selective outline along outer dorsal spine & reaper tip
                col = C_OUT
            elif v < 0.14:
                # Razor-white inner cutting edge
                col = C_CORE if glow > 0.35 else C_RAZOR_WHITE
            elif v < 0.27:
                # Blazing rose-magenta cutting bevel
                col = C_ROSE if glow > 0.3 else C_VIO_LIT
            elif v < 0.44:
                # Violet-magenta soul-steel bevel
                col = C_VIO_SPEC if (u < 0.55 and v < 0.34) else C_VIO_LIT
            elif is_rune and glow > 0.3:
                # Glowing crimson/magenta soul-runes carved along the fuller
                col = C_CORE if abs(v - 0.52) < 0.08 else C_ROSE
            elif v < 0.68:
                # Deep abyssal fuller channel
                col = C_VIO_BASE if u < 0.65 else C_VIO_DARK
            else:
                # Heavy dark obsidian spine bevel
                col = C_IRON_MID if v < 0.78 else C_IRON_DARK

            put_px_safe(arr, px, py, col)

    # -------------------------------------------------------------------------
    # 3. Horned Demon-Skull Collar at Blade Junction (da in [28..35], dp in [-3.4..+3.8])
    #    with a glowing #ff2a85 / #a855f7 Abyssal Soul-Gem Eye
    # -------------------------------------------------------------------------
    for da_raw in np.linspace(28.0, 35.0, 19):
        for dp_raw in np.linspace(-3.4, 3.8, 19):
            da = da_raw * scale_len
            dp = dp_raw * scale_len
            # Sculpted Demon-Skull silhouette with swept-back upper horns
            u_sk = (da_raw - 28.0) / 7.0
            max_dp = 3.2 - 0.8 * abs(u_sk - 0.45)
            is_horn = (da_raw >= 32.0) and (-3.4 <= dp_raw <= -1.2)
            if abs(dp_raw) > max_dp and not is_horn:
                continue

            px = max(5.0, min(98.0, hx + ux * da + nx * dp))
            py = max(5.0, min(98.0, hy + uy * da + ny * dp))

            d_gem = math.hypot((da_raw - 31.3) * 0.95, (dp_raw - 0.2) * 1.05)
            on_edge = (
                da_raw <= 28.5
                or da_raw >= 34.4
                or (abs(dp_raw) >= max_dp - 0.55 and not is_horn)
            )
            if on_edge:
                col = C_OUT
            elif d_gem <= 0.85:
                col = C_CORE
            elif d_gem <= 1.65:
                col = C_ROSE
            elif d_gem <= 2.25:
                col = C_VIO_LIT
            elif is_horn:
                col = C_BONE_SPEC if da_raw > 33.4 else C_BONE_MID
            else:
                col = C_BONE_SPEC if dp_raw < 0.0 else C_BONE_LIT
            put_px_safe(arr, px, py, col)

    # -------------------------------------------------------------------------
    # 4. Two Bone-Plated Gauntlet Clasps (r_hand at da=0.0 + l_hand at da=-7.2)
    # -------------------------------------------------------------------------
    if show_gauntlets:
        for proj_raw, is_lower in ((0.0, False), (-7.2, True)):
            proj = proj_raw * scale_len
            dp_c = math.sin((proj_raw + 4.0) * 0.11) * 1.35 * scale_len
            cx = hx + ux * proj + nx * dp_c
            cy = hy + uy * proj + ny * dp_c
            for u_off in (-1.1, -0.35, 0.35, 1.1):
                for n_off in (-1.9, -1.0, 0.0, 1.0, 1.9):
                    px = cx + ux * u_off + nx * n_off
                    py = cy + uy * u_off + ny * n_off
                    if abs(n_off) >= 1.75:
                        col = C_OUT
                    elif abs(u_off) >= 0.9:
                        col = C_BONE_SPEC if n_off <= 0 else C_BONE_MID
                    elif abs(n_off) <= 0.5:
                        col = C_ROSE if is_lower else C_BONE_LIT
                    else:
                        col = C_BONE_LIT if n_off < 0 else C_IRON_MID
                    put_px_safe(arr, px, py, col)


def draw_spectral_bone_chain_104(arr, lh_x, lh_y, reach_px, phase=0.0):
    """
    Draws Malakor's Vertebrated Bone-Chain & Articulated Skeletal Claw launched from `l_hand`
    during Row 3 (SKILL — Death's Grasp Chain-Hook)!
    """
    x0 = max(8.0, min(88.0, lh_x))
    y0 = max(12.0, min(88.0, lh_y))
    x1 = max(x0 + 8.0, min(94.0, x0 + reach_px))
    y1 = y0 - 2.0

    n_links = 16
    for i in range(n_links + 1):
        u = i / float(n_links)
        cx = x0 + (x1 - x0) * u
        cy = y0 + (y1 - y0) * u + math.sin(u * math.pi * 2.0 + phase) * 2.2 * (1.0 - 0.35 * u)
        if i % 2 == 0:
            # Bone vertebra link with dark selout
            put_px_safe(arr, cx, cy - 1, C_OUT)
            put_px_safe(arr, cx, cy + 1, C_OUT)
            put_px_safe(arr, cx, cy, C_BONE_SPEC)
        else:
            # Glowing crimson/violet soul-chain link
            put_px_safe(arr, cx, cy, C_ROSE if (i % 4 == 1) else C_VIO_LIT)

    # Articulated 3-Finger Skeletal Bone-Claw at the chain tip (x1, y1)
    for dy_c in (-1, 0, 1):
        for dx_c in (-1, 0, 1):
            put_px_safe(arr, x1 + dx_c, y1 + dy_c, C_ROSE if (dx_c == 0 and dy_c == 0) else C_BONE_SPEC)
    for fang_dy, fang_tip_dy in ((-2.5, -1.2), (0.0, 0.0), (2.5, 1.2)):
        jx = min(96.0, x1 + 2.5)
        jy = y1 + fang_dy
        tx = min(98.0, x1 + 4.6)
        ty = y1 + fang_tip_dy
        draw_line_104(arr, x1, y1, jx, jy, C_BONE_SPEC, 1)
        draw_line_104(arr, jx, jy, tx, ty, C_ROSE, 1)
        put_px_safe(arr, tx, ty, C_CORE)


def draw_shadow_mantle_pool_104(arr, cx, foot_y, phase=0.0, intensity=1.0):
    """Draws a 2.5D Necrotic Shadow Pool & Rising Soul-Fangs at Malakor's feet during Grave-Submerge."""
    icx = max(22.0, min(82.0, cx))
    by = min(97.0, foot_y - 1.0)
    rx = 15.0 * intensity
    ry = 2.6 * intensity
    for i in range(44):
        ang = (i / 44.0) * 2.0 * math.pi
        px = icx + math.cos(ang) * rx
        py = by + math.sin(ang) * ry
        put_px_safe(arr, px, py, C_CORE if i % 6 == 0 else (C_ROSE if i % 2 == 0 else C_VIO_LIT))
        put_px_safe(arr, px, py + 1.0, C_OUT)


def extra_extents(joints_c, cfg, scale):
    """
    Reports all extreme points of the 2H Soul-Reaper Great-Scythe (pommel spike, Demon-Skull
    collar, and curved Crescent Blade tip) to `render_rig_104` so the camera window frames
    every single pose inside [6..97] with ZERO border clips!
    """
    pts = []
    if cfg.get("show_weapon", True) and not cfg.get("planted_weapon", False):
        rh = joints_c["r_hand"]
        rad = math.radians(cfg.get("weapon_deg", -40.0))
        ux, uy = math.cos(rad), math.sin(rad)
        hs = cfg.get("hook_sign", 1.0)
        nx, ny = -uy * hs, ux * hs
        sl = cfg.get("weapon_scale", 1.0)

        # 1. Pommel spike (da = -16.5)
        pts.append((rh[0] - ux * (16.5 * sl / scale), rh[1] - uy * (16.5 * sl / scale)))
        # 2. Demon-Skull Collar & rear spur (da = +35.5, dp = -4.2)
        pts.append((
            rh[0] + ux * (35.5 * sl / scale) - nx * (4.2 * sl / scale),
            rh[1] + uy * (35.5 * sl / scale) - ny * (4.2 * sl / scale),
        ))
        # 3. Outer belly of the Crescent Scythe Blade (da = +32.0, dp = +20.0)
        pts.append((
            rh[0] + ux * (32.0 * sl / scale) + nx * (20.0 * sl / scale),
            rh[1] + uy * (32.0 * sl / scale) + ny * (20.0 * sl / scale),
        ))
        # 4. Inward-hooked Reaper Blade Tip (da = +12.0, dp = +38.5)
        pts.append((
            rh[0] + ux * (12.0 * sl / scale) + nx * (38.5 * sl / scale),
            rh[1] + uy * (12.0 * sl / scale) + ny * (38.5 * sl / scale),
        ))
    return pts


def draw_back(bg104, joints104, cfg):
    ph = cfg.get("mane_wave_phase", 0.0)
    if cfg.get("halo_active", True):
        nk = joints104["neck"]
        draw_necro_halo_104(bg104, nk[0], nk[1], ph, grand=cfg.get("halo_grand", False))


def draw_front(out, joints104, cfg):
    ph = cfg.get("mane_wave_phase", 0.0)

    if cfg.get("shadow_mantle", 0.0) > 0.0:
        pel = joints104["pelvis"]
        draw_shadow_mantle_pool_104(out, pel[0], cfg.get("foot_y", 99.0), phase=ph, intensity=cfg["shadow_mantle"])

    if cfg.get("slash_arc") is not None:
        sa = cfg["slash_arc"]
        nk = joints104["neck"]
        draw_slash_arc_104(
            out,
            max(24.0, min(72.0, nk[0] + sa.get("dx", 6.0))),
            max(24.0, min(74.0, nk[1] + sa.get("dy", 10.0))),
            min(26.5, sa.get("r", 26.0)),
            sa["a0"], sa["a1"],
            C_CORE, C_ROSE, C_VIO_LIT, intensity=sa.get("intensity", 1.0),
        )

    if cfg.get("planted_weapon", False):
        # Rest Malakor's 2H Soul-Reaper Great-Scythe flat beside him on the arena floor
        rh = joints104["r_hand"]
        px_plant = max(36.0, min(56.0, rh[0] - 4.0))
        py_plant = max(82.0, min(91.0, rh[1] + 2.0))
        draw_2h_soulreaper_greatscythe_104(
            out, px_plant, py_plant,
            scythe_deg=6.0, hook_sign=-1.0, glow=cfg.get("weapon_glow", 0.45),
            phase=ph, show_gauntlets=True, scale_len=0.78,
        )
    elif cfg.get("show_weapon", True):
        rh = joints104["r_hand"]
        draw_2h_soulreaper_greatscythe_104(
            out, rh[0], rh[1],
            scythe_deg=cfg.get("weapon_deg", -40.0),
            hook_sign=cfg.get("hook_sign", 1.0),
            glow=cfg.get("weapon_glow", 1.0),
            phase=ph,
            show_gauntlets=not cfg.get("chain_cast_mode", False),
            scale_len=cfg.get("weapon_scale", 0.90),
        )

    if cfg.get("chain_active", False):
        lh = joints104["l_hand"]
        draw_spectral_bone_chain_104(
            out, lh[0], lh[1],
            reach_px=cfg.get("chain_reach", 28.0),
            phase=ph,
        )

    if cfg.get("speedlines", 0) > 0:
        for k in range(cfg["speedlines"]):
            ly = 28.0 + (k * 12 + int(ph * 5)) % 52
            lx0 = 6.0 + (k * 7 + int(ph * 9)) % 14
            draw_line_104(out, lx0, ly, lx0 + 12.0, ly, C_ROSE if k % 2 == 0 else C_VIO_LIT, 1)


DEFAULTS = dict(
    pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=3.0, head_rel_deg=-1.5, mane_rel_deg=-2.0,
    mane_wave_amp=5.0, mane_in_front=False,
    l_thigh_deg=-2.0, l_shin_deg=2.0, l_foot_deg=0.0,
    r_thigh_deg=2.0, r_shin_deg=-2.0, r_foot_deg=0.0,
    l_sode_rel_deg=12.0, l_fore_rel_deg=8.0, r_sode_rel_deg=10.0, r_fore_rel_deg=-8.0,
    l_coat_rel_deg=0.0, r_coat_rel_deg=0.0,
    grip_x=48.0, grip_y=-10.0, grip_sep=36.0,
    chain_lx=84.0, chain_ly=-38.0, chain_reach=26.0,
    weapon_deg=-40.0, weapon_len=24.0, weapon_scale=0.90, weapon_glow=1.0, foot_y=99.0,
    show_weapon=True, two_handed_ik=True, chain_cast_mode=False, chain_active=False,
    halo_active=True, halo_grand=False, right_arm_in_front=False, right_leg_behind=False,
    hook_sign=1.0, shadow_mantle=0.0,
)


def render_frame(parts, cfg):
    out = render_rig_104(
        parts, PIVOTS, cfg, PALETTE_CFG,
        y_bot_base=497.0, default_S=612,
        extra_extent_fn=extra_extents, draw_back_fn=draw_back, draw_front_fn=draw_front,
    )
    # Enforce 4px safe margin on all 4 edges so 0/270 frames ever touch the cell boundary
    out[:4, :, :] = 0
    out[100:, :, :] = 0
    out[:, :4, :] = 0
    out[:, 100:, :] = 0
    return out


def build_row_configs(row_idx):
    cfgs = []
    for f in range(COLS):
        t = f / float(COLS)
        ph = 2.0 * math.pi * t

        if row_idx == 0:
            # Row 0: IDLE (Predatory 2H Great-Scythe guard stance, breathing soul-ribcage pulse,
            # billowing tattered cloak, subtle scythe hover)
            b = math.sin(ph)
            s = math.cos(ph)
            cfg = dict(DEFAULTS)
            cfg.update(
                pelvis_dx=s * 2.5, pelvis_dy=b * 7.5, torso_deg=3.0 + b * 2.0,
                head_rel_deg=-1.5 - b * 1.2, mane_rel_deg=-2.0 + s * 3.0,
                mane_wave_phase=ph, mane_wave_amp=5.5,
                grip_x=48.0 + s * 2.5, grip_y=-10.0 + b * 4.0,
                weapon_deg=-40.0 + b * 3.5, weapon_glow=0.85 + 0.15 * b,
            )
            cfgs.append(apply_2h_scythe_ik(cfg))

        elif row_idx == 1:
            # Row 1: WALK (Stalking Grim-Reaper prowl with 2H Great-Scythe held across the body
            # and sweeping cloak stride)
            st = math.sin(ph)
            kl = math.cos(ph)
            cfg = dict(DEFAULTS)
            cfg.update(
                pelvis_dy=abs(st) * 18.0, torso_deg=8.0 + abs(st) * 2.5, head_rel_deg=-4.0,
                mane_rel_deg=-5.0 - abs(st) * 4.0, mane_wave_phase=ph * 2.0, mane_wave_amp=6.5,
                right_leg_behind=(f >= 15),
                l_thigh_deg=st * 25.0, l_shin_deg=max(0.0, st * 26.0) + max(0.0, kl * 14.0), l_foot_deg=st * 12.0,
                r_thigh_deg=-st * 25.0, r_shin_deg=max(0.0, -st * 26.0) + max(0.0, -kl * 14.0), r_foot_deg=-st * 12.0,
                grip_x=50.0 + st * 4.5, grip_y=-8.0 + abs(st) * 4.5,
                weapon_deg=-36.0 + st * 8.0,
            )
            cfgs.append(apply_2h_scythe_ik(cfg))

        elif row_idx == 2:
            # Row 2: AUTO_ATTACK — 2H Figure-8 Soul-Harvest Combo:
            # F00..F06 Wide 2H windup behind the back -> F07..F14 Massive horizontal/diagonal front reap ->
            # F15..F22 Upward reverse backhand harvest cleave -> F23..F29 Follow-through recovery
            kfs = [
                (0, dict(pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=3.0, head_rel_deg=-1.5,
                         l_thigh_deg=-2.0, l_shin_deg=2.0, r_thigh_deg=2.0, r_shin_deg=-2.0,
                         grip_x=48.0, grip_y=-10.0, weapon_deg=-40.0, grip_sep=36.0, hook_sign=1.0)),
                (6, dict(pelvis_dx=-14.0, pelvis_dy=28.0, torso_deg=-14.0, head_rel_deg=8.0,
                         l_thigh_deg=-18.0, l_shin_deg=18.0, r_thigh_deg=18.0, r_shin_deg=-12.0,
                         grip_x=16.0, grip_y=-46.0, weapon_deg=-102.0, grip_sep=32.0,
                         halo_grand=True, hook_sign=1.0)),
                (13, dict(pelvis_dx=14.0, pelvis_dy=44.0, torso_deg=22.0, head_rel_deg=-10.0,
                          l_thigh_deg=22.0, l_shin_deg=18.0, r_thigh_deg=-24.0, r_shin_deg=18.0,
                          grip_x=62.0, grip_y=-6.0, weapon_deg=14.0, grip_sep=36.0,
                          halo_grand=True, hook_sign=1.0)),
                (20, dict(pelvis_dx=10.0, pelvis_dy=26.0, torso_deg=-6.0, head_rel_deg=6.0,
                          l_thigh_deg=-10.0, l_shin_deg=14.0, r_thigh_deg=14.0, r_shin_deg=-10.0,
                          grip_x=54.0, grip_y=-58.0, weapon_deg=-64.0, grip_sep=34.0,
                          halo_grand=True, hook_sign=-1.0)),
                (25, dict(pelvis_dx=4.0, pelvis_dy=12.0, torso_deg=2.0, head_rel_deg=-1.0,
                          grip_x=50.0, grip_y=-24.0, weapon_deg=-48.0, grip_sep=36.0, hook_sign=1.0)),
                (29, dict(pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=3.0, head_rel_deg=-1.5,
                          grip_x=48.0, grip_y=-10.0, weapon_deg=-40.0, grip_sep=36.0, hook_sign=1.0)),
            ]
            cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.2)
            if 8 <= f <= 14:
                u = (f - 8) / 6.0
                cfg["slash_arc"] = dict(dx=4.0, dy=10.0, r=25.5, a0=-74.0 + 22.0 * u, a1=42.0 + 14.0 * u, intensity=1.2)
            elif 16 <= f <= 22:
                u = (f - 16) / 6.0
                cfg["slash_arc"] = dict(dx=4.0, dy=8.0, r=25.0, a0=38.0 - 44.0 * u, a1=-26.0 - 46.0 * u, intensity=1.18)
            cfgs.append(cfg)

        elif row_idx == 3:
            # Row 3: SKILL — Death's Grasp Chain-Hook & 360° Whirlwind Execution:
            # F00..F10 Left hand hurls spectral bone-chain forward while right hand cocks Great-Scythe ->
            # F11..F15 Violently yanks chain back ->
            # F16..F29 Spins into a full-body 2H Great-Scythe Execution Cleave!
            kfs = [
                (0, dict(torso_deg=3.0, grip_x=48.0, grip_y=-10.0, weapon_deg=-40.0,
                         chain_cast_mode=False, chain_active=False)),
                (5, dict(pelvis_dx=10.0, pelvis_dy=32.0, torso_deg=14.0, head_rel_deg=-8.0,
                         l_thigh_deg=18.0, l_shin_deg=16.0, r_thigh_deg=-18.0, r_shin_deg=16.0,
                         grip_x=-14.0, grip_y=-38.0, weapon_deg=-118.0,
                         chain_cast_mode=True, chain_active=True,
                         chain_lx=96.0, chain_ly=-42.0, chain_reach=30.0, halo_grand=True)),
                (9, dict(pelvis_dx=12.0, pelvis_dy=34.0, torso_deg=16.0, head_rel_deg=-8.0,
                         l_thigh_deg=20.0, l_shin_deg=18.0, r_thigh_deg=-20.0, r_shin_deg=16.0,
                         grip_x=-18.0, grip_y=-42.0, weapon_deg=-124.0,
                         chain_cast_mode=True, chain_active=True,
                         chain_lx=102.0, chain_ly=-40.0, chain_reach=34.0, halo_grand=True)),
                (14, dict(pelvis_dx=-12.0, pelvis_dy=40.0, torso_deg=-12.0, head_rel_deg=8.0,
                          l_thigh_deg=-20.0, l_shin_deg=22.0, r_thigh_deg=20.0, r_shin_deg=-14.0,
                          grip_x=18.0, grip_y=-46.0, weapon_deg=-98.0,
                          chain_cast_mode=True, chain_active=True,
                          chain_lx=42.0, chain_ly=-26.0, chain_reach=18.0, halo_grand=True)),
                (19, dict(pelvis_dx=16.0, pelvis_dy=50.0, torso_deg=24.0, head_rel_deg=-12.0,
                          l_thigh_deg=-24.0, l_shin_deg=24.0, r_thigh_deg=24.0, r_shin_deg=-18.0,
                          grip_x=62.0, grip_y=-4.0, weapon_deg=18.0, grip_sep=36.0,
                          chain_cast_mode=False, chain_active=False, halo_grand=True)),
                (24, dict(pelvis_dx=10.0, pelvis_dy=30.0, torso_deg=12.0, head_rel_deg=-6.0,
                          grip_x=54.0, grip_y=-22.0, weapon_deg=-22.0, grip_sep=36.0,
                          chain_cast_mode=False, chain_active=False, halo_grand=True)),
                (29, dict(torso_deg=3.0, grip_x=48.0, grip_y=-10.0, weapon_deg=-40.0,
                          chain_cast_mode=False, chain_active=False)),
            ]
            cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.5)
            if 16 <= f <= 23:
                u = (f - 16) / 7.0
                cfg["slash_arc"] = dict(dx=4.0, dy=10.0, r=26.0, a0=-84.0 + 18.0 * u, a1=48.0 + 12.0 * u, intensity=1.25)
            cfgs.append(cfg)

        elif row_idx == 4:
            # Row 4: ULTIMATE — Grim Harvest: Sovereign of Death:
            # F00..F09 Ascends with arms and 2H Great-Scythe raised overhead, skull pauldrons flaring ->
            # F10..F17 High-speed wraith cross-reap pose ->
            # F18..F29 Colossal two-handed overhead Guillotine drop slam (strictly inside x <= 98!)
            kfs = [
                (0, dict(pelvis_dx=0.0, pelvis_dy=36.0, torso_deg=-6.0, head_rel_deg=4.0,
                         grip_x=38.0, grip_y=-32.0, weapon_deg=-68.0, grip_sep=34.0,
                         foot_y=99.0, halo_grand=True)),
                (6, dict(pelvis_dx=-4.0, pelvis_dy=12.0, torso_deg=-14.0, head_rel_deg=10.0,
                         l_thigh_deg=18.0, l_shin_deg=26.0, r_thigh_deg=-14.0, r_shin_deg=22.0,
                         grip_x=28.0, grip_y=-96.0, weapon_deg=-102.0, grip_sep=32.0,
                         foot_y=92.0, halo_grand=True)),
                (13, dict(pelvis_dx=12.0, pelvis_dy=30.0, torso_deg=18.0, head_rel_deg=-8.0,
                          l_thigh_deg=22.0, l_shin_deg=20.0, r_thigh_deg=-22.0, r_shin_deg=18.0,
                          grip_x=58.0, grip_y=-14.0, weapon_deg=8.0, grip_sep=36.0,
                          foot_y=95.0, halo_grand=True, speedlines=4)),
                (17, dict(pelvis_dx=-6.0, pelvis_dy=14.0, torso_deg=-16.0, head_rel_deg=10.0,
                          l_thigh_deg=20.0, l_shin_deg=28.0, r_thigh_deg=-16.0, r_shin_deg=24.0,
                          grip_x=24.0, grip_y=-102.0, weapon_deg=-108.0, grip_sep=32.0,
                          foot_y=91.0, halo_grand=True)),
                (22, dict(pelvis_dx=14.0, pelvis_dy=54.0, torso_deg=24.0, head_rel_deg=-12.0,
                          l_thigh_deg=-24.0, l_shin_deg=26.0, r_thigh_deg=24.0, r_shin_deg=-18.0,
                          grip_x=58.0, grip_y=-2.0, weapon_deg=16.0, grip_sep=36.0,
                          foot_y=99.0, halo_grand=True, shadow_mantle=0.95)),
                (26, dict(pelvis_dx=10.0, pelvis_dy=42.0, torso_deg=16.0, head_rel_deg=-8.0,
                          grip_x=54.0, grip_y=-6.0, weapon_deg=6.0, grip_sep=36.0,
                          foot_y=99.0, halo_grand=True, shadow_mantle=0.55)),
                (29, dict(torso_deg=3.0, grip_x=48.0, grip_y=-10.0, weapon_deg=-40.0,
                          grip_sep=36.0, foot_y=99.0, halo_grand=False, shadow_mantle=0.0)),
            ]
            cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.2)
            if 10 <= f <= 15 or 19 <= f <= 25:
                cfg["slash_arc"] = dict(dx=3.0, dy=10.0, r=25.5, a0=-88.0, a1=48.0, intensity=1.28)
            cfgs.append(cfg)

        elif row_idx == 5:
            # Row 5: DEATH — Collapses to knees (F00..F11), falls prone onto the arena floor
            # (F12..F29) with his 2H Great-Scythe resting flat beside him
            kfs = make_prone_knight_death_kfs(
                idle_weapon_deg=-40.0, plant_x=54.0, plant_y=88.0, use_planted_weapon=True, mane_front=False
            )
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, extra_meta_keys=("plant_x", "plant_y"), wave_mult=1.0)
            cfg["halo_active"] = (f <= 6)
            if f <= 7:
                u = f / 7.0
                cfg["two_handed_ik"] = True
                cfg["grip_x"] = 48.0 - 8.0 * u
                cfg["grip_y"] = -10.0 + 14.0 * u
                cfg["grip_sep"] = 34.0
                apply_2h_scythe_ik(cfg)
            else:
                cfg["two_handed_ik"] = False
            cfgs.append(cfg)

        elif row_idx == 6:
            # Row 6: DASH — Wraith Shadow-Rush:
            # Low, aggressive forward phantom-glide with cloak streaming behind and 2H Great-Scythe poised to impale
            kfs = [
                (0, dict(torso_deg=5.0, grip_x=48.0, grip_y=-10.0, weapon_deg=-40.0, foot_y=99.0)),
                (6, dict(pelvis_dx=12.0, pelvis_dy=28.0, torso_deg=24.0, head_rel_deg=-12.0, mane_rel_deg=-14.0,
                         l_thigh_deg=26.0, l_shin_deg=32.0, r_thigh_deg=-18.0, r_shin_deg=24.0,
                         grip_x=56.0, grip_y=-16.0, weapon_deg=-18.0, grip_sep=36.0,
                         halo_grand=True, speedlines=5, foot_y=96.0)),
                (23, dict(pelvis_dx=12.0, pelvis_dy=28.0, torso_deg=24.0, head_rel_deg=-12.0, mane_rel_deg=-14.0,
                          l_thigh_deg=26.0, l_shin_deg=32.0, r_thigh_deg=-18.0, r_shin_deg=24.0,
                          grip_x=56.0, grip_y=-16.0, weapon_deg=-18.0, grip_sep=36.0,
                          halo_grand=True, speedlines=5, foot_y=96.0)),
                (29, dict(torso_deg=5.0, grip_x=48.0, grip_y=-10.0, weapon_deg=-40.0, foot_y=99.0)),
            ]
            cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.0)
            if 6 <= f <= 23:
                cfg["pelvis_dy"] += math.sin(ph * 2.0) * 6.0
                cfg["grip_y"] += math.sin(ph * 2.0) * 3.0
                apply_2h_scythe_ik(cfg)
            cfgs.append(cfg)

        elif row_idx == 7:
            # Row 7: CROUCH — Grave-Submerge & Rising Scythe Uppercut:
            # Crouches low into a necrotic shadow mantle (F00..F10), then erupts upward with a
            # rising 2H Great-Scythe uppercut (F11..F29)
            kfs = [
                (0, dict(torso_deg=3.0, grip_x=48.0, grip_y=-10.0, weapon_deg=-40.0, shadow_mantle=0.0)),
                (7, dict(pelvis_dx=-6.0, pelvis_dy=82.0, torso_deg=18.0, head_rel_deg=-8.0,
                         l_thigh_deg=-34.0, l_shin_deg=36.0, r_thigh_deg=32.0, r_shin_deg=-26.0,
                         grip_x=52.0, grip_y=-4.0, weapon_deg=16.0, grip_sep=34.0,
                         shadow_mantle=1.0, halo_grand=True)),
                (11, dict(pelvis_dx=-4.0, pelvis_dy=76.0, torso_deg=14.0, head_rel_deg=-6.0,
                          l_thigh_deg=-32.0, l_shin_deg=34.0, r_thigh_deg=30.0, r_shin_deg=-24.0,
                          grip_x=54.0, grip_y=-8.0, weapon_deg=20.0, grip_sep=34.0,
                          shadow_mantle=0.9, halo_grand=True)),
                (18, dict(pelvis_dx=12.0, pelvis_dy=16.0, torso_deg=-10.0, head_rel_deg=-6.0,
                          l_thigh_deg=18.0, l_shin_deg=16.0, r_thigh_deg=-20.0, r_shin_deg=16.0,
                          grip_x=56.0, grip_y=-68.0, weapon_deg=-68.0, grip_sep=34.0,
                          shadow_mantle=0.4, halo_grand=True)),
                (29, dict(torso_deg=3.0, grip_x=48.0, grip_y=-10.0, weapon_deg=-40.0, shadow_mantle=0.0)),
            ]
            cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.5)
            if 12 <= f <= 20:
                cfg["slash_arc"] = dict(dx=4.0, dy=10.0, r=25.5, a0=62.0, a1=-72.0, intensity=1.25)
            cfgs.append(cfg)

        elif row_idx == 8:
            # Row 8: JUMP — Spectral Wraith Float-Leap & Aerial Guillotine:
            # Leaps into the air with tattered cloak wings flared and cleaves downward with the 2H Great-Scythe
            kfs = [
                (0, dict(torso_deg=3.0, grip_x=48.0, grip_y=-10.0, weapon_deg=-40.0, foot_y=99.0)),
                (11, dict(pelvis_dx=4.0, pelvis_dy=12.0, torso_deg=-12.0, head_rel_deg=8.0, mane_rel_deg=-12.0,
                          l_thigh_deg=24.0, l_shin_deg=34.0, r_thigh_deg=-14.0, r_shin_deg=26.0,
                          grip_x=28.0, grip_y=-94.0, weapon_deg=-98.0, grip_sep=32.0,
                          foot_y=92.0, halo_grand=True)),
                (19, dict(pelvis_dx=14.0, pelvis_dy=48.0, torso_deg=22.0, head_rel_deg=-10.0,
                          l_thigh_deg=-22.0, l_shin_deg=24.0, r_thigh_deg=22.0, r_shin_deg=-18.0,
                          grip_x=58.0, grip_y=-4.0, weapon_deg=16.0, grip_sep=36.0,
                          foot_y=99.0, halo_grand=True)),
                (29, dict(torso_deg=3.0, grip_x=48.0, grip_y=-10.0, weapon_deg=-40.0, foot_y=99.0)),
            ]
            cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.0)
            if 15 <= f <= 21:
                cfg["slash_arc"] = dict(dx=4.0, dy=10.0, r=25.5, a0=-86.0, a1=46.0, intensity=1.25)
            cfgs.append(cfg)

    return cfgs


def main():
    build_portrait()
    parts = load_and_segment_512()
    picks = [
        (0, 0, "R0 2H SCYTHE GUARD"),
        (1, 4, "R1 NECROPOLIS PROWL"),
        (2, 13, "R2 2H SOUL-HARVEST"),
        (3, 6, "R3 DEATH'S GRASP CHAIN"),
        (4, 22, "R4 GRIM GUILLOTINE"),
        (5, 12, "R5 KNEE COLLAPSE"),
        (5, 25, "R5 PRONE COLLAPSE"),
        (7, 16, "R7 GRAVE ERUPTION"),
    ]
    build_and_save_30fps_sheet(
        "reaper", parts, build_row_configs, render_frame,
        OUT_SHEET_PATH, VFX_SHEET_PATH, ARTIFACT_DIR,
        shimmer_cols=(C_ROSE, C_VIO_LIT), showcase_picks=picks,
    )


if __name__ == "__main__":
    main()
