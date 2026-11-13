#!/usr/bin/env python3
"""
Builds Aethelgard v4 (Warrior — Sovereign Paladin of Celestial Frost & Runic Steel)
30fps HD-2D Sprite Sheet (`assets/sprites/warrior_sheet.png`, 6240x1872, 30 cols x 9 rows of 208x208)
and HD-2D Portrait (`assets/portraits/warrior.png`, 128x128) using `warrior_v4_base.jpg` + `hd2d_rig_core`.

Key Features:
- High-contrast Regal Silver-Platinum, Sovereign Gold, & Royal-Sapphire Paladin Plate Armor
  with Winged Greathelm, Blazing Ice-Cyan T-Visor, & Flowing White-Ice Horsehair Plume (`warrior_v4_base.jpg`)
- Clean 14-part skeletal segmentation with 0 background white halos and 0 unassigned foreground pixels
- Colossal Two-Handed Winged Celestial Claymore (`draw_2h_runeblade_104`) with per-frame 2-Bone Analytical IK
  locking BOTH silver-and-gold gauntlets onto the hilt across all 9 animation rows
- Zero cheesy stick-lines / speedlines baked into sprite cells:
  * Row 0 (IDLE): Sovereign Two-Handed High-Guard with breathing, flowing white plume, & rune shimmer
  * Row 1 (WALK): Heavy Paladin Vanguard two-step armored march
  * Row 2 (AUTO_ATTACK): Coiled 2H back-shoulder windup -> explosive lunging 2H Runic Claymore cleave
  * Row 3 (SKILL — TEMPEST VANGUARD): 2.5-rev 360-deg 2H Whirlwind Spin-Slash (with silver-gold dorsal backplate)
    into Leaping 2H Thunder-Breaker Overhead Slam
  * Row 4 (ULTIMATE — SACRED VOW & HEAVENLY EARTHSHATTER):
    - F00..F05: Solemn 2H Sacred Vow Sword-Aloft Consecration Stance (vertical Claymore before visor)
    - F06..F16: Multi-angle 2H Omnislash cleaves
    - F17..F21: High-sky 2H Overhead Judgment Charge
    - F22..F29: Meteoric Top-Down 2H Plunge Slash & Earthshatter Impact
  * Row 5 (DEATH & HURT): 2H stagger -> double-knee 2H Claymore ground plant -> noble prone collapse
  * Row 6 (DASH): Pure aerodynamic forward Paladin Drag-Rush trailing the 2H Claymore
  * Row 7 (CROUCH): Braced 2H Cross-Guard Spell Parry -> low sweeping Frost-Counter
  * Row 8 (JUMP & ARCHANGEL JUSTICE AIM):
    - F00..F10: Crouch coil & airborne vault
    - F11..F19: Dedicated Archangel Sky-Hover Pose with BOTH hands thrusting the 2H Claymore
      diagonally downward (+38..+44 deg) pointing straight at the grounded enemy!
    - F20..F29: Supersonic downward diving cleave & grounded shockwave absorption
"""

import os
import math
import shutil
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from hd2d_rig_core import (
    COLS, P, BASE_NUMERIC_KEYS, poly_mask, keep_largest_component,
    assign_remaining_geodesic, extract_parts_512, rot_pt,
    put_px, draw_line_104, draw_slash_arc_104, render_rig_104,
    make_prone_knight_death_kfs, eval_pose_keyframes, build_and_save_30fps_sheet,
    compute_bipedal_walk_pose,
)

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ARTIFACT_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/3a4b2cf8-05c2-45a3-bb65-af6f5b5a1088"

V4_BASE_ARTIFACT = os.path.join(ARTIFACT_DIR, "warrior_v4_base_1794329386108.jpg")
V4_PORTRAIT_ARTIFACT = os.path.join(ARTIFACT_DIR, "portrait_hd2d_warrior_v4_1794329420234.jpg")
BASE_IMG_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "warrior_v4_base.jpg")
OUT_SHEET_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "warrior_sheet.png")
OUT_PORTRAIT_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "warrior_portrait.png")
OUT_PORTRAIT_LEGACY_PATH = os.path.join(ROOT_DIR, "assets", "portraits", "warrior.png")
VFX_SHEET_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "warrior_vfx.png")

# Strict 20-Color Hand-Crafted Silver-Platinum, Sovereign Gold & Celestial Frost-Sapphire Master Palette
MASTER_PALETTE = np.array([
    [10, 14, 28],     # 0: Abyssal Obsidian Outline (#0a0e1c)
    [20, 28, 52],     # 1: Deep Midnight-Sapphire Selout (#141c34)
    [44, 38, 48],     # 2: Dark Leather Strap & Under-Armor Joint Shadow (#2c2630)
    [64, 78, 108],    # 3: Deep Slate-Steel Plate Shadow (#404e6c)
    [102, 120, 154],  # 4: Cool Moon-Steel Plate Base (#66789a)
    [148, 166, 198],  # 5: Polished Silver-Steel Midtone (#94a6c6)
    [198, 214, 236],  # 6: Gleaming Platinum Plate Highlight (#c6d6ec)
    [242, 248, 255],  # 7: Pure Specular White-Silver Plume & Razor Edge (#f2f8ff)
    [152, 196, 224],  # 8: Soft Ice-Silver Plume Shadow (#98c4e0)
    [206, 236, 250],  # 9: Luminous Pale-Ice Plume Midtone (#ceecfa)
    [20, 44, 96],     # 10: Deep Royal-Sapphire Tabard Shadow (#142c60)
    [32, 72, 148],    # 11: Sovereign Sapphire Tabard & Cuisse Base (#204894)
    [54, 110, 196],   # 12: Lit Royal-Azure Tabard Fold (#366ec4)
    [96, 62, 18],     # 13: Antique Bronze-Gold Shadow (#603e12)
    [156, 106, 28],   # 14: Burnished Royal-Gold Trim Base (#9c6a1c)
    [218, 164, 48],   # 15: Radiant Sovereign Gold Highlight (#daa430)
    [252, 222, 98],   # 16: Specular Sun-Gold Gleam (#fcde62)
    [14, 132, 212],   # 17: Deep Carved Sapphire-Rune Glow (#0e84d4)
    [56, 208, 252],   # 18: Blazing Ice-Cyan T-Visor & Runic Fuller (#38d0fc)
    [224, 252, 255],  # 19: White-Hot Celestial Ice Core (#e0fcff)
], dtype=np.int32)

C_OUT = (10, 14, 28, 255)
C_SEL = (20, 28, 52, 255)
C_STEEL_DARK = (64, 78, 108, 255)
C_STEEL_BASE = (102, 120, 154, 255)
C_STEEL_MID = (148, 166, 198, 255)
C_STEEL_LIT = (198, 214, 236, 255)
C_STEEL_SPEC = (242, 248, 255, 255)
C_SAPPH_DARK = (20, 44, 96, 255)
C_SAPPH_MID = (32, 72, 148, 255)
C_GOLD_DARK = (96, 62, 18, 255)
C_GOLD_MID = (156, 106, 28, 255)
C_GOLD_LIT = (218, 164, 48, 255)
C_GOLD_SPEC = (252, 222, 98, 255)
C_CYAN_DEEP = (14, 132, 212, 255)
C_CYAN_LIT = (56, 208, 252, 255)
C_ICE_CORE = (224, 252, 255, 255)

# Skeletal pivots in 512x512 rig space (0.5x of 1024x1024 warrior_v4_base.jpg)
PIVOTS = dict(
    pelvis=(264.0, 260.0), neck=(263.0, 136.0), mane=(247.5, 46.0),
    l_sh=(204.0, 152.0), l_elb=(178.0, 222.0), l_hand=(188.0, 304.0),
    r_sh=(308.0, 158.0), r_elb=(322.0, 223.0), r_hand=(346.0, 301.0),
    l_hip=(226.0, 290.0), l_knee=(222.0, 368.0), l_ank=(209.0, 454.0),
    r_hip=(298.0, 290.0), r_knee=(303.0, 368.0), r_ank=(296.0, 449.0),
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
    protect_indices=(6, 7, 15, 16, 17, 18, 19),
    hair_indices=(7, 8, 9),
    lit_selout=1,
    shad_selout=0,
    hair_selout=3,
    joint_fill=(20, 44, 96, 255),
    joint_inner=(32, 72, 148, 255),
    hip_r=22,
    thigh_r=17,
    arm_r=15,
    pinhole_fill=(64, 78, 108, 255),
)


def put_px_safe(arr, x, y, col):
    """Strictly clamps drawn pixels inside x in [4..99], y in [4..99] on the 104x104 canvas."""
    ix, iy = int(round(x)), int(round(y))
    if 4 <= ix <= 99 and 4 <= iy <= 99:
        arr[iy, ix] = col


def build_portrait():
    """
    Builds `assets/sprites/warrior_portrait.png` (128x128) from `portrait_hd2d_warrior_v4`
    using MedianFilter(size=5) cel-flattening + 20-color FASTOCTREE quantization (zero dithering).
    """
    if os.path.exists(V4_BASE_ARTIFACT) and not os.path.exists(BASE_IMG_PATH):
        os.makedirs(os.path.dirname(BASE_IMG_PATH), exist_ok=True)
        shutil.copyfile(V4_BASE_ARTIFACT, BASE_IMG_PATH)
    elif os.path.exists(V4_BASE_ARTIFACT):
        shutil.copyfile(V4_BASE_ARTIFACT, BASE_IMG_PATH)

    if not os.path.exists(V4_PORTRAIT_ARTIFACT):
        print(f"Skipping portrait build (artifact not found at {V4_PORTRAIT_ARTIFACT})")
        return

    im = Image.open(V4_PORTRAIT_ARTIFACT).convert("RGB")
    im_flat = im.filter(ImageFilter.MedianFilter(size=5))
    im_128 = im_flat.resize((128, 128), Image.Resampling.NEAREST)
    raw_128 = np.array(Image.open(V4_PORTRAIT_ARTIFACT).convert("RGB").resize((128, 128), Image.Resampling.BILINEAR))
    im_q = im_128.quantize(colors=20, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).convert("RGBA")
    q_arr = np.array(im_q)
    rr = raw_128[:, :, 0].astype(np.int16)
    rg = raw_128[:, :, 1].astype(np.int16)
    rb = raw_128[:, :, 2].astype(np.int16)
    # Restore crisp 3-step cel-shaded glow on T-visor, brow gem, chest core, & crossguard gem
    gem_core = (rb >= 235) & (rg >= 215) & ((rb - rr) >= 75)
    gem_lit = (~gem_core) & (rb >= 205) & (rg >= 150) & ((rb - rr) >= 95)
    gem_mid = (~gem_core) & (~gem_lit) & (rb >= 165) & (rg >= 105) & ((rb - rr) >= 90)
    q_arr[gem_mid] = [14, 132, 212, 255]
    q_arr[gem_lit] = [56, 208, 252, 255]
    q_arr[gem_core] = [214, 250, 255, 255]
    im_final = Image.fromarray(q_arr, "RGBA")
    os.makedirs(os.path.dirname(OUT_PORTRAIT_PATH), exist_ok=True)
    im_final.save(OUT_PORTRAIT_PATH)
    os.makedirs(os.path.dirname(OUT_PORTRAIT_LEGACY_PATH), exist_ok=True)
    im_final.save(OUT_PORTRAIT_LEGACY_PATH)

    # Save 3x zoomed QA preview in ARTIFACT_DIR
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    im_final.resize((384, 384), Image.Resampling.NEAREST).save(
        os.path.join(ARTIFACT_DIR, "debug_warrior_v4_portrait.png")
    )
    print(f"Built {OUT_PORTRAIT_PATH} (128x128, 20-color FASTOCTREE + glowing cyan visor/gems)")


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


def apply_2h_sword_ik(cfg):
    """
    Solves per-frame 2-Bone IK so BOTH of Aethelgard's silver-and-gold gauntlets lock onto the
    Two-Handed Celestial Claymore hilt (`r_hand` on upper grip near winged crossguard,
    `l_hand` on lower grip above pommel) with zero mid-swing drift!
    """
    if not cfg.get("two_handed_ik", True):
        return cfg

    torso_deg = cfg.get("torso_deg", 0.0)
    grip_x = cfg.get("grip_x", 56.0)
    grip_y = cfg.get("grip_y", -14.0)
    blade_deg = cfg.get("weapon_deg", -40.0)
    grip_sep = cfg.get("grip_sep", 33.0)

    pel = PIVOTS["pelvis"]
    l_sh_w = rot_pt(PIVOTS["l_sh"], pel, torso_deg)
    r_sh_w = rot_pt(PIVOTS["r_sh"], pel, torso_deg)

    rad = math.radians(blade_deg)
    ux, uy = math.cos(rad), math.sin(rad)

    r_target = (pel[0] + grip_x, pel[1] + grip_y)
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
    cfg["right_arm_in_front"] = bool(cfg.get("force_right_arm_front", False)) or (grip_y < -88.0) or (grip_x > 64.0)
    return cfg


TWO_HAND_NUMERIC_KEYS = tuple(BASE_NUMERIC_KEYS) + ("grip_x", "grip_y", "grip_sep", "weapon_len")


def eval_2h_keyframes(f, keyframes, ph, defaults, extra_meta_keys=(), wave_mult=2.0):
    """
    Cosine-eased keyframe evaluator that interpolates (grip_x, grip_y, grip_sep, weapon_deg)
    alongside body joints and then applies exact 2-bone two-handed IK on every frame!
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
        "right_arm_in_front", "force_right_arm_front", "right_leg_behind", "mane_in_front",
        "show_weapon", "planted_weapon", "resting_weapon", "centered_mode",
        "halo_active", "halo_grand", "two_handed_ik",
    ) + tuple(extra_meta_keys)
    for mk in all_meta:
        if mk in active_d:
            out[mk] = active_d[mk]

    out["mane_wave_phase"] = ph * wave_mult
    return apply_2h_sword_ik(out)


def load_and_segment_512():
    if os.path.exists(V4_BASE_ARTIFACT) and not os.path.exists(BASE_IMG_PATH):
        os.makedirs(os.path.dirname(BASE_IMG_PATH), exist_ok=True)
        shutil.copyfile(V4_BASE_ARTIFACT, BASE_IMG_PATH)

    im = Image.open(BASE_IMG_PATH).convert("RGBA")
    # Floodfill exterior + enclosed background white pockets while preserving 100% of the white horsehair plume!
    bg_seeds = (
        (0, 0), (1023, 0), (0, 1023), (1023, 1023), (512, 995),
        (395, 215), (425, 212), (416, 480), (642, 550), (652, 585), (656, 602),
    )
    for sx, sy in bg_seeds:
        px = im.getpixel((sx, sy))
        if px[3] > 0 and px[0] > 220 and px[1] > 220 and px[2] > 220:
            ImageDraw.floodfill(im, (sx, sy), (0, 0, 0, 0), thresh=42)

    arr = np.array(im)
    # Also strip any remaining enclosed pure-white background pockets below y=175 (plume highlight is y < 165)
    r0 = arr[:, :, 0].astype(np.int16)
    g0 = arr[:, :, 1].astype(np.int16)
    b0 = arr[:, :, 2].astype(np.int16)
    a0 = arr[:, :, 3] > 0
    yy1024 = np.arange(1024)[:, None]
    lower_pure_white = a0 & (yy1024 > 175) & (r0 >= 246) & (g0 >= 246) & (b0 >= 246)
    arr[lower_pure_white] = [0, 0, 0, 0]

    # 3-Pass Anti-Aliased White Fringe Stripping
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
        wf = edge & (r > 180) & (g > 180) & (b > 180) & (np.abs(r - g) < 24) & (np.abs(g - b) < 24)
        arr[wf] = [0, 0, 0, 0]

    im512 = Image.fromarray(arr, "RGBA").resize((512, 512), Image.Resampling.NEAREST)
    rgb512 = im512.convert("RGB")
    rgb_med3 = np.array(rgb512.filter(ImageFilter.MedianFilter(size=3)))
    rgb_med5 = np.array(rgb512.filter(ImageFilter.MedianFilter(size=5)))
    arr512 = np.array(im512)
    alpha = keep_largest_component(arr512[:, :, 3] > 0)
    arr512[~alpha] = [0, 0, 0, 0]
    yy = np.arange(512)[:, None]
    cel_rgb = np.where(yy[:, :, None] < 155, rgb_med3, rgb_med5)
    arr512[:, :, :3] = np.where(alpha[:, :, None], cel_rgb, 0)

    H, W = 512, 512
    a = arr512[:, :, 3] > 0

    m_head = poly_mask(H, W, P([
        (394, 44), (458, 128), (495, 108), (556, 106), (584, 44),
        (608, 152), (602, 260), (565, 304), (482, 295), (452, 250), (448, 210), (394, 150)
    ])) & a
    m_mane = poly_mask(H, W, P([
        (244, 24), (562, 24), (558, 115), (492, 115), (458, 134), (448, 215), (382, 275), (340, 332), (244, 332)
    ])) & a & (~m_head)

    m_l_sode = poly_mask(H, W, P([
        (310, 222), (485, 222), (492, 355), (438, 455), (318, 455)
    ])) & a & (~m_head) & (~m_mane)
    m_l_forearm = poly_mask(H, W, P([
        (274, 374), (342, 424), (416, 452), (412, 565), (420, 608), (406, 654), (326, 654), (274, 510)
    ])) & a & (~m_l_sode)

    m_r_sode = poly_mask(H, W, P([
        (594, 232), (684, 250), (684, 448), (604, 458), (594, 345)
    ])) & a & (~m_head)
    m_r_forearm = poly_mask(H, W, P([
        (632, 448), (684, 418), (740, 560), (740, 660), (658, 660), (650, 545)
    ])) & a & (~m_r_sode)

    m_l_coat = poly_mask(H, W, P([
        (392, 495), (500, 505), (486, 588), (452, 642), (402, 674), (384, 652)
    ])) & a & (~m_l_forearm)
    m_r_coat = poly_mask(H, W, P([
        (602, 495), (644, 505), (664, 678), (636, 678), (618, 590)
    ])) & a & (~m_r_forearm)

    m_torso = poly_mask(H, W, P([
        (418, 238), (616, 238), (612, 520), (604, 816), (500, 816), (498, 540), (435, 510)
    ])) & a & (~m_head) & (~m_l_sode) & (~m_l_forearm) & (~m_r_sode) & (~m_r_forearm) & (~m_l_coat) & (~m_r_coat)

    m_l_foot = poly_mask(H, W, P([
        (332, 845), (378, 845), (384, 884), (478, 884), (478, 1008), (332, 1008)
    ])) & a
    m_l_shin = poly_mask(H, W, P([
        (350, 694), (496, 694), (482, 886), (350, 886)
    ])) & a & (~m_l_foot) & (~m_torso) & (~m_l_coat)
    m_l_thigh = poly_mask(H, W, P([
        (388, 555), (504, 555), (502, 712), (388, 712)
    ])) & a & (~m_torso) & (~m_l_coat) & (~m_l_shin) & (~m_l_foot)

    m_r_foot = poly_mask(H, W, P([
        (496, 838), (546, 845), (554, 882), (698, 882), (698, 992), (496, 992)
    ])) & a
    m_r_shin = poly_mask(H, W, P([
        (522, 694), (656, 694), (650, 884), (522, 884)
    ])) & a & (~m_r_foot) & (~m_torso)
    m_r_thigh = poly_mask(H, W, P([
        (535, 555), (650, 555), (650, 712), (535, 712)
    ])) & a & (~m_torso) & (~m_r_coat) & (~m_r_shin) & (~m_r_foot)

    masks = assign_remaining_geodesic(a, [
        ("mane", m_mane), ("head", m_head), ("torso", m_torso),
        ("l_coat", m_l_coat), ("r_coat", m_r_coat),
        ("l_sode", m_l_sode), ("l_forearm", m_l_forearm),
        ("r_sode", m_r_sode), ("r_forearm", m_r_forearm),
        ("l_thigh", m_l_thigh), ("l_shin", m_l_shin), ("l_foot", m_l_foot),
        ("r_thigh", m_r_thigh), ("r_shin", m_r_shin), ("r_foot", m_r_foot),
    ])
    return extract_parts_512(arr512, masks)


def draw_rune_halo_104(arr, nk_x, nk_y, radius=15.5, phase=0.0, grand=False):
    cx = nk_x - 3.0
    cy = nk_y + 3.0
    n_pts = 48 if grand else 36
    for i in range(n_pts):
        ang = (i / float(n_pts)) * 2.0 * math.pi + phase * 0.5
        px = cx + math.cos(ang) * radius
        py = cy + math.sin(ang) * (radius * 0.88)
        if grand or i % 2 == 0:
            col = C_GOLD_SPEC if (grand and i % 6 == 0) else (C_CYAN_LIT if (i % 4 == 0) else C_CYAN_DEEP)
            put_px_safe(arr, px, py, col)

    n_nodes = 8 if grand else 6
    for k in range(n_nodes):
        ang = (k / float(n_nodes)) * 2.0 * math.pi - phase * 0.65
        gx = cx + math.cos(ang) * radius
        gy = cy + math.sin(ang) * (radius * 0.88)
        put_px_safe(arr, gx, gy, C_ICE_CORE if k % 2 == 0 else C_GOLD_SPEC)
        put_px_safe(arr, gx + 1, gy, C_CYAN_LIT)
        put_px_safe(arr, gx - 1, gy, C_CYAN_LIT)
        put_px_safe(arr, gx, gy - 1, C_GOLD_LIT)
        put_px_safe(arr, gx, gy + 1, C_GOLD_LIT)


def draw_2h_runeblade_104(arr, hx, hy, blade_deg, blade_len=35.5, glow=1.0, phase=0.0, show_gauntlets=True):
    """
    Draws Aethelgard v4's Colossal Two-Handed Winged Celestial Claymore (`Excalibur of Frost-Justice`):
    - Royal-sapphire & gold wire-wrapped two-handed grip (-9.4..+3.2 px)
    - Faceted sovereign-gold & sapphire-crystal pommel
    - Sweeping Seraphim-Winged Gold & Silver Crossguard with blazing Ice-Sapphire center gem
    - Broad gleaming Silver-Platinum greatsword blade (`half_w = 3.1`) with engraved Ice-Cyan Elder Runes
    - Crisp Silver-Platinum & Gold armored gauntlet clasps for BOTH hands locked on the hilt!
    """
    rad = math.radians(blade_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    nx, ny = -uy, ux

    pom_x, pom_y = hx - ux * 9.2, hy - uy * 9.2
    grd_x, grd_y = hx + ux * 3.2, hy + uy * 3.2

    # 1. Extended Two-Handed Royal-Sapphire & Gold Ribbed Hilt
    draw_line_104(arr, pom_x, pom_y, grd_x, grd_y, C_OUT, 2)
    for d in np.linspace(-8.4, 2.4, 14):
        rx, ry = hx + ux * d, hy + uy * d
        put_px_safe(arr, rx, ry, C_GOLD_LIT if int(round(d)) % 2 == 0 else C_SAPPH_MID)

    # 2. Faceted Sovereign-Gold & Ice-Sapphire Pommel
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if abs(dx) + abs(dy) <= 1:
                put_px_safe(arr, pom_x + dx, pom_y + dy, C_ICE_CORE if (dx == 0 and dy == 0) else C_GOLD_SPEC)
    put_px_safe(arr, pom_x - ux * 1.2, pom_y - uy * 1.2, C_GOLD_LIT)

    # 3. Broad Sweeping Seraphim-Winged Gold & Platinum Crossguard
    for d in np.linspace(-6.6, 6.6, 23):
        ad = abs(d)
        wing = (ad ** 1.15) * 0.34
        gx = grd_x + nx * d + ux * wing
        gy = grd_y + ny * d + uy * wing
        top_col = C_STEEL_SPEC if ad > 4.6 else (C_GOLD_SPEC if ad < 2.2 else C_GOLD_LIT)
        put_px_safe(arr, gx, gy, top_col)
        put_px_safe(arr, gx - ux * 1.0, gy - uy * 1.0, C_GOLD_MID if ad < 4.6 else C_STEEL_MID)
        put_px_safe(arr, gx - ux * 1.9, gy - uy * 1.9, C_OUT)
    # Crossguard Ricasso Jewel
    for r_off in (0.0, 1.1, 2.1):
        put_px_safe(arr, grd_x + ux * r_off, grd_y + uy * r_off, C_ICE_CORE if r_off < 0.5 else C_CYAN_LIT)

    # 4. Broad Gleaming Silver-Platinum & Ice-Rune Claymore Blade
    steps = int(blade_len * 2.8)
    for i in range(steps + 1):
        t = i / max(1, steps)
        dist = 3.8 + t * blade_len
        # Slight ricasso flare near base, broad parallel paladin blade, crisp diamond point taper
        if t < 0.12:
            half_w = 2.9 + (0.12 - t) * 3.5
        else:
            half_w = 3.05 * (1.0 - 0.78 * (max(0.0, (t - 0.12) / 0.88) ** 2.35))
        bx = hx + ux * dist
        by = hy + uy * dist

        put_px_safe(arr, bx - nx * half_w, by - ny * half_w, C_OUT)
        put_px_safe(arr, bx + nx * half_w, by + ny * half_w, C_OUT)
        if half_w >= 1.2:
            put_px_safe(arr, bx - nx * (half_w - 0.85), by - ny * (half_w - 0.85), C_STEEL_BASE)
            put_px_safe(arr, bx + nx * (half_w - 0.85), by + ny * (half_w - 0.85), C_STEEL_SPEC)
        if half_w >= 2.0:
            put_px_safe(arr, bx - nx * (half_w * 0.42), by - ny * (half_w * 0.42), C_STEEL_MID)
            put_px_safe(arr, bx + nx * (half_w * 0.42), by + ny * (half_w * 0.42), C_STEEL_LIT)

        if t < 0.84:
            glyph = (i + int(phase * 3)) % 5
            if glow > 0.45 and glyph in (0, 1, 3):
                r_col = C_ICE_CORE if (glow > 0.85 and glyph == 0) else C_CYAN_LIT
                put_px_safe(arr, bx, by, r_col)
                if glyph == 1 and half_w > 1.7:
                    put_px_safe(arr, bx + nx * 0.75, by + ny * 0.75, C_CYAN_DEEP)
            else:
                put_px_safe(arr, bx, by, C_CYAN_DEEP if glow > 0.6 else C_STEEL_DARK)
        else:
            put_px_safe(arr, bx, by, C_ICE_CORE if glow > 0.5 else C_STEEL_SPEC)

    # 5. Two Silver-Platinum & Sovereign-Gold Armored Gauntlet Clasps (Upper r_hand + Lower l_hand)
    if show_gauntlets:
        for proj, is_near in ((0.3, False), (-5.4, True)):
            cx = hx + ux * proj
            cy = hy + uy * proj
            for u_off in (-0.9, 0.0, 0.9):
                for n_off in (-1.5, -0.5, 0.5, 1.5):
                    px = cx + ux * u_off + nx * n_off
                    py = cy + uy * u_off + ny * n_off
                    if abs(n_off) > 1.2:
                        col = C_OUT
                    elif abs(u_off) > 0.6 and n_off > 0:
                        col = C_GOLD_SPEC
                    elif n_off > 0.0:
                        col = C_STEEL_SPEC if (is_near and abs(u_off) < 0.3) else C_STEEL_LIT
                    else:
                        col = C_STEEL_BASE
                    put_px_safe(arr, px, py, col)


def draw_cyclone_ring_half_104(arr, cx, cy, rx, ry, spin_ang, is_front):
    steps = 260
    for i in range(steps):
        a = (i / float(steps)) * 2.0 * math.pi
        sa = math.sin(a)
        if is_front and sa < -0.02:
            continue
        if (not is_front) and sa >= 0.02:
            continue

        rel = (spin_ang - a) % (2.0 * math.pi)
        if rel > 5.0:
            continue
        wake = 1.0 - (rel / 5.0)
        ca = math.cos(a)

        thick = 3.5 * (wake ** 0.75)
        n_dr = max(3, int(thick * 3.2) + 2)
        for dr in np.linspace(-thick, thick, n_dr):
            px = cx + ca * (rx + dr * 1.55)
            py = cy + sa * (ry + dr * 0.68)
            if px < 6.0 or px > 97.0:
                continue
            nd = abs(dr) / max(0.45, thick)
            if wake > 0.58:
                col = C_ICE_CORE if nd < 0.34 else (C_CYAN_LIT if nd < 0.72 else C_CYAN_DEEP)
            elif wake > 0.26:
                col = C_CYAN_LIT if nd < 0.40 else C_CYAN_DEEP
            else:
                if i % 3 != 0 or nd > 0.55:
                    continue
                col = C_GOLD_SPEC if (i % 9 == 0) else C_CYAN_DEEP
            put_px_safe(arr, px, py, col)

        if wake > 0.35 and i % 2 == 0:
            ux = cx + math.cos(a + 0.55) * (rx * 0.74)
            uy = cy - 9.5 + math.sin(a + 0.55) * (ry * 0.72)
            if 7.0 <= ux <= 96.0:
                put_px_safe(arr, ux, uy, C_ICE_CORE if wake > 0.72 else C_GOLD_SPEC)


def extra_extents(joints_c, cfg, scale):
    pts = []
    if cfg.get("full_ext_swing", False):
        return pts
    if cfg.get("spin_slash", False):
        p = joints_c["pelvis"]
        pts.append((p[0] - 42.0 / scale, p[1]))
        pts.append((p[0] + 42.0 / scale, p[1]))
        return pts
    if cfg.get("show_weapon", True):
        if cfg.get("planted_weapon", False):
            return pts
        h = joints_c["r_hand"]
        rad = math.radians(cfg.get("weapon_deg", -40.0))
        wlen = cfg.get("weapon_len", 35.5)
        pts.append((h[0] + math.cos(rad) * ((wlen + 5.8) / scale), h[1] + math.sin(rad) * ((wlen + 5.8) / scale)))
        pts.append((h[0] - math.cos(rad) * (11.8 / scale), h[1] - math.sin(rad) * (11.8 / scale)))
    return pts


def draw_back(bg, joints104, cfg):
    ph = cfg.get("mane_wave_phase", 0.0)
    if cfg.get("halo_active", False):
        nk = joints104["neck"]
        draw_rune_halo_104(
            bg, nk[0], nk[1],
            radius=cfg.get("halo_r", 15.5),
            phase=ph,
            grand=cfg.get("halo_grand", False),
        )
    if cfg.get("spin_slash", False):
        pel = joints104["pelvis"]
        spin_ang = cfg.get("spin_ang", 0.0)
        draw_cyclone_ring_half_104(bg, 52.0, pel[1] - 4.0, 38.0, 10.5, spin_ang, is_front=False)
        if math.sin(spin_ang) < 0.0:
            bx = 52.0 + math.cos(spin_ang) * 11.0
            by = pel[1] - 4.0 + math.sin(spin_ang) * 3.5
            b_deg = math.degrees(math.atan2(math.sin(spin_ang) * 10.5, math.cos(spin_ang) * 38.0))
            draw_2h_runeblade_104(bg, bx, by, blade_deg=b_deg, blade_len=29.5, glow=1.0, phase=ph, show_gauntlets=True)


def draw_front(out, joints104, cfg):
    ph = cfg.get("mane_wave_phase", 0.0)

    if cfg.get("spin_slash", False):
        pel = joints104["pelvis"]
        spin_ang = cfg.get("spin_ang", 0.0)
        if math.sin(spin_ang) >= 0.0:
            bx = 52.0 + math.cos(spin_ang) * 10.5
            by = pel[1] - 4.0 + math.sin(spin_ang) * 3.5
            b_deg = math.degrees(math.atan2(math.sin(spin_ang) * 10.5, math.cos(spin_ang) * 38.0))
            draw_2h_runeblade_104(out, bx, by, blade_deg=b_deg, blade_len=29.5, glow=1.0, phase=ph, show_gauntlets=True)
        draw_cyclone_ring_half_104(out, 52.0, pel[1] - 4.0, 38.0, 10.5, spin_ang, is_front=True)
        return

    if cfg.get("show_weapon", True):
        if cfg.get("planted_weapon", False):
            draw_2h_runeblade_104(
                out, cfg.get("plant_x", 80.0), cfg.get("plant_y", 64.5),
                blade_deg=89.0, blade_len=28.5, glow=cfg.get("weapon_glow", 0.55),
                phase=ph, show_gauntlets=False,
            )
        else:
            rh = joints104["r_hand"]
            draw_2h_runeblade_104(
                out, rh[0], rh[1],
                blade_deg=cfg.get("weapon_deg", -40.0),
                blade_len=cfg.get("weapon_len", 35.5),
                glow=cfg.get("weapon_glow", 1.0),
                phase=ph,
                show_gauntlets=True,
            )

    # Clean cel-shaded blade-motion arc ONLY on peak auto/slam cleaves (zero cheesy stick-lines!)
    if cfg.get("slash_arc") is not None:
        sa = cfg["slash_arc"]
        nk = joints104["neck"]
        draw_slash_arc_104(
            out, nk[0] + sa.get("dx", 2.0), nk[1] + sa.get("dy", 10.0),
            sa.get("r", 28.0), sa["a0"], sa["a1"],
            C_ICE_CORE, C_CYAN_LIT, C_CYAN_DEEP, intensity=sa.get("intensity", 1.0),
        )


def apply_back_turn_armor_104(body_arr104, mirror_x=False):
    """
    Converts front T-visor/chest-gem pixels into Aethelgard v4's Silver-Platinum & Sovereign-Gold
    Dorsal Back-Plate during the dorsal frames of his 360-deg Whirlwind Spin-Slash!
    """
    out = body_arr104.copy()
    if mirror_x:
        ys, xs = np.where(out[:, :, 3] > 0)
        if len(xs) > 0:
            cx2 = int(round(xs.min() + xs.max()))
            flipped = np.zeros_like(out)
            for y, x in zip(ys, xs):
                nx = cx2 - x
                if 3 <= nx <= 100:
                    flipped[y, nx] = out[y, x]
            out = flipped

    a = out[:, :, 3] > 0
    ys, xs = np.where(a)
    if len(ys) == 0:
        return out
    y_top = int(ys.min())
    cx = int(round(np.mean(xs)))

    # Replace cyan front visor/gem with sculpted silver-platinum back-helm & dorsal cuirass
    for y in range(max(4, y_top + 10), min(98, y_top + 48)):
        row_xs = np.where(a[y])[0]
        if len(row_xs) < 4:
            continue
        x0, x1 = int(row_xs.min()) + 1, int(row_xs.max()) - 1
        for x in range(x0, x1 + 1):
            r, g, b, _ = out[y, x]
            if b > 210 and r < 90:
                out[y, x] = C_STEEL_MID if ((x + y) % 2 == 0) else C_STEEL_BASE

    spine_y0 = max(8, y_top + 22)
    spine_y1 = min(92, y_top + 44)
    for y in range(spine_y0, spine_y1):
        if a[y, cx]:
            out[y, cx] = C_GOLD_SPEC if (y % 3 != 0) else C_GOLD_MID
        if y in (spine_y0 + 5, spine_y0 + 6, spine_y0 + 9) and 4 <= cx - 2 and cx + 2 <= 99:
            if a[y, cx - 1]:
                out[y, cx - 1] = C_STEEL_LIT
            if a[y, cx + 1]:
                out[y, cx + 1] = C_STEEL_LIT
    if spine_y0 + 7 < 98 and a[spine_y0 + 7, cx]:
        out[spine_y0 + 7, cx] = C_ICE_CORE
    return out


DEFAULTS = dict(
    pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=4.5, head_rel_deg=-2.0, mane_rel_deg=-4.0,
    mane_wave_amp=6.5, l_thigh_deg=-2.0, l_shin_deg=2.0, l_foot_deg=0.0,
    r_thigh_deg=2.0, r_shin_deg=-2.0, r_foot_deg=0.0,
    l_sode_rel_deg=-6.0, l_fore_rel_deg=-14.0, r_sode_rel_deg=-16.0, r_fore_rel_deg=-18.0,
    l_coat_rel_deg=0.0, r_coat_rel_deg=0.0,
    grip_x=56.0, grip_y=-14.0, grip_sep=33.0,
    weapon_deg=-38.0, weapon_len=35.5, weapon_glow=1.0, foot_y=99.0,
    show_weapon=True, two_handed_ik=True, right_arm_in_front=False, right_leg_behind=False,
    halo_active=False, halo_grand=False,
)


def render_frame(parts, cfg):
    if cfg.get("spin_slash", False):
        body_cfg = dict(cfg)
        body_cfg["show_weapon"] = False
        body_cfg["spin_slash"] = True
        captured = {}

        def cap_back(bg, joints104, _c):
            captured["joints104"] = joints104

        body_only = render_rig_104(
            parts, PIVOTS, body_cfg, PALETTE_CFG,
            y_bot_base=501.0, default_S=600,
            extra_extent_fn=extra_extents, draw_back_fn=cap_back, draw_front_fn=None,
        )
        if cfg.get("back_turn", False):
            body_only = apply_back_turn_armor_104(body_only, mirror_x=cfg.get("mirror_yaw", False))

        joints104 = captured["joints104"]
        bg = np.zeros_like(body_only)
        draw_back(bg, joints104, cfg)
        out = bg.copy()
        m = body_only[:, :, 3] > 0
        out[m] = body_only[m]
        draw_front(out, joints104, cfg)
        out[:3, :, :] = 0
        out[101:, :, :] = 0
        out[:, :3, :] = 0
        out[:, 101:, :] = 0
        return out

    return render_rig_104(
        parts, PIVOTS, cfg, PALETTE_CFG,
        y_bot_base=501.0, default_S=600,
        extra_extent_fn=extra_extents, draw_back_fn=draw_back, draw_front_fn=draw_front,
    )


def build_row_configs(row_idx):
    cfgs = []
    for f in range(COLS):
        t = f / float(COLS)
        ph = 2.0 * math.pi * t

        if row_idx == 0:
            # Row 0: IDLE (Commanding Sovereign Paladin Two-Handed Greatsword High-Guard!)
            b = math.sin(ph)
            s = math.cos(ph)
            cfg = dict(DEFAULTS)
            cfg.update(
                pelvis_dx=s * 2.5, pelvis_dy=b * 7.5, torso_deg=4.5 + b * 1.6,
                head_rel_deg=-2.0 - b * 1.1, mane_rel_deg=-4.0 + s * 4.0,
                mane_wave_phase=ph, mane_wave_amp=7.0,
                grip_x=56.0 + s * 2.0, grip_y=-14.0 + b * 3.5,
                weapon_deg=-38.0 + b * 3.0, weapon_glow=0.84 + 0.16 * b,
            )
            cfgs.append(apply_2h_sword_ik(cfg))

        elif row_idx == 1:
            # Row 1: WALK (Authentic Bipedal Crossover Paladin Vanguard Two-Handed Greatsword March!)
            c_step = math.cos(ph)
            gait = compute_bipedal_walk_pose(PIVOTS, f, cols=COLS, stride_scale=0.80)
            gait["l_hip_dy"] -= 2.4
            gait["r_hip_dy"] += 2.4
            cfg = dict(DEFAULTS)
            cfg.update(gait)
            cfg.update(
                pelvis_dx=0.0, pelvis_dy=0.0,
                torso_deg=5.5 + 1.8 * abs(c_step), head_rel_deg=-3.0,
                mane_rel_deg=-6.0 - 3.5 * abs(c_step), mane_wave_phase=ph * 2.0, mane_wave_amp=8.0,
                grip_x=56.0 - c_step * 8.5, grip_y=-12.0 + abs(c_step) * 4.0,
                weapon_deg=-35.0 - c_step * 9.5, weapon_glow=0.88 + 0.12 * math.sin(ph),
                foot_y=99.0,
            )
            cfg = apply_2h_sword_ik(cfg)
            cfg["right_arm_in_front"] = False
            cfgs.append(cfg)

        elif row_idx == 2:
            # Row 2: AUTO_ATTACK (Coiled Back-Shoulder 2H Windup -> Full-Extension Lunging 2H Cleave -> Weighty Recovery!)
            kfs = [
                (0, dict(pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=4.5, head_rel_deg=-2.0, mane_rel_deg=-4.0,
                         l_thigh_deg=-2.0, l_shin_deg=2.0, l_foot_deg=0.0,
                         r_thigh_deg=2.0, r_shin_deg=-2.0, r_foot_deg=0.0,
                         grip_x=56.0, grip_y=-14.0, weapon_deg=-38.0, grip_sep=33.0, halo_active=False)),
                (3, dict(pelvis_dx=-110.0, pelvis_dy=18.0, torso_deg=-5.0, head_rel_deg=5.0, mane_rel_deg=-6.0,
                         l_thigh_deg=-8.0, l_shin_deg=12.0, l_foot_deg=-3.0,
                         r_thigh_deg=12.0, r_shin_deg=4.0, r_foot_deg=4.0,
                         grip_x=22.0, grip_y=-88.0, weapon_deg=-92.0, grip_sep=30.0, halo_active=True)),
                (7, dict(pelvis_dx=-182.0, pelvis_dy=34.0, torso_deg=-13.0, head_rel_deg=12.0, mane_rel_deg=-10.0,
                         l_thigh_deg=-14.0, l_shin_deg=18.0, l_foot_deg=-4.0,
                         r_thigh_deg=18.0, r_shin_deg=8.0, r_foot_deg=6.0,
                         grip_x=-8.0, grip_y=-122.0, weapon_deg=-136.0, grip_sep=28.0, halo_active=True)),
                (9, dict(pelvis_dx=-198.0, pelvis_dy=40.0, torso_deg=14.0, head_rel_deg=-8.0, mane_rel_deg=-14.0,
                         l_thigh_deg=16.0, l_shin_deg=14.0, l_foot_deg=6.0,
                         r_thigh_deg=-22.0, r_shin_deg=12.0, r_foot_deg=-6.0,
                         grip_x=136.0, grip_y=-96.0, weapon_deg=-52.0, grip_sep=31.0, halo_active=True)),
                (11, dict(pelvis_dx=-196.0, pelvis_dy=48.0, torso_deg=22.0, head_rel_deg=-14.0, mane_rel_deg=-20.0,
                          l_thigh_deg=22.0, l_shin_deg=16.0, l_foot_deg=10.0,
                          r_thigh_deg=-30.0, r_shin_deg=14.0, r_foot_deg=-8.0,
                          grip_x=142.0, grip_y=-62.0, weapon_deg=5.0, grip_sep=31.5, halo_active=True)),
                (13, dict(pelvis_dx=-184.0, pelvis_dy=54.0, torso_deg=24.0, head_rel_deg=-16.0, mane_rel_deg=-22.0,
                          l_thigh_deg=24.0, l_shin_deg=18.0, l_foot_deg=12.0,
                          r_thigh_deg=-32.0, r_shin_deg=16.0, r_foot_deg=-8.0,
                          grip_x=146.0, grip_y=-38.0, weapon_deg=21.0, grip_sep=32.0, halo_active=True)),
                (16, dict(pelvis_dx=-152.0, pelvis_dy=58.0, torso_deg=25.0, head_rel_deg=-16.0, mane_rel_deg=-18.0,
                          l_thigh_deg=26.0, l_shin_deg=18.0, l_foot_deg=12.0,
                          r_thigh_deg=-33.0, r_shin_deg=18.0, r_foot_deg=-8.0,
                          grip_x=154.0, grip_y=-20.0, weapon_deg=38.0, grip_sep=32.0, halo_active=True)),
                (19, dict(pelvis_dx=-144.0, pelvis_dy=54.0, torso_deg=22.0, head_rel_deg=-14.0, mane_rel_deg=-14.0,
                          l_thigh_deg=23.0, l_shin_deg=16.0, l_foot_deg=10.0,
                          r_thigh_deg=-30.0, r_shin_deg=16.0, r_foot_deg=-6.0,
                          grip_x=146.0, grip_y=-18.0, weapon_deg=34.0, grip_sep=32.0, halo_active=True)),
                (24, dict(pelvis_dx=-80.0, pelvis_dy=24.0, torso_deg=12.0, head_rel_deg=-7.0, mane_rel_deg=-8.0,
                          l_thigh_deg=10.0, l_shin_deg=8.0, l_foot_deg=4.0,
                          r_thigh_deg=-12.0, r_shin_deg=6.0, r_foot_deg=-2.0,
                          grip_x=80.0, grip_y=-16.0, weapon_deg=-8.0, grip_sep=32.5, halo_active=False)),
                (29, dict(pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=4.5, head_rel_deg=-2.0, mane_rel_deg=-4.0,
                          l_thigh_deg=-2.0, l_shin_deg=2.0, r_thigh_deg=2.0, r_shin_deg=-2.0,
                          grip_x=56.0, grip_y=-14.0, weapon_deg=-38.0, grip_sep=33.0, halo_active=False)),
            ]
            cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.0)
            cfg["full_ext_swing"] = True
            cfg["right_arm_in_front"] = False
            if 9 <= f <= 14:
                a0_tab = (-88.0, -68.0, -50.0, -32.0, -14.0, 4.0)
                a1_tab = (-18.0, 10.0, 26.0, 38.0, 44.0, 47.0)
                dx_tab = (18.0, 18.0, 17.5, 17.0, 17.0, 16.5)
                r_tab = (31.5, 31.5, 31.0, 31.0, 30.5, 30.5)
                int_tab = (0.95, 1.20, 1.28, 1.20, 1.00, 0.72)
                idx = f - 9
                cfg["slash_arc"] = dict(
                    dx=dx_tab[idx], dy=11.5, r=r_tab[idx],
                    a0=a0_tab[idx], a1=a1_tab[idx], intensity=int_tab[idx],
                )
            cfgs.append(cfg)

        elif row_idx == 3:
            # Row 3: SKILL (TEMPEST VANGUARD — Two-Handed 360° Whirlwind Spin-Slash -> Two-Handed Thunder Slam!)
            if f <= 2:
                kfs_coil = [
                    (0, dict(torso_deg=4.5, grip_x=56.0, grip_y=-14.0, weapon_deg=-38.0, grip_sep=33.0, foot_y=99.0)),
                    (2, dict(pelvis_dx=-10.0, pelvis_dy=48.0, torso_deg=-12.0,
                             l_thigh_deg=-22.0, l_shin_deg=22.0, r_thigh_deg=20.0, r_shin_deg=-16.0,
                             grip_x=14.0, grip_y=-10.0, weapon_deg=-152.0, grip_sep=28.0,
                             halo_active=True, foot_y=99.0)),
                ]
                cfgs.append(eval_2h_keyframes(f, kfs_coil, ph, DEFAULTS, wave_mult=3.0))
            elif 3 <= f <= 17:
                step6 = (f - 3) % 6
                spin_ang = ((f - 3) / 6.0) * 2.0 * math.pi + 0.35
                b_deg = math.degrees(math.atan2(math.sin(spin_ang) * 10.5, math.cos(spin_ang) * 38.0))
                gx_orb = math.cos(spin_ang) * 58.0
                gy_orb = -22.0 + math.sin(spin_ang) * 18.0

                yaw_poses = [
                    dict(pelvis_dx=4.0, pelvis_dy=38.0, torso_deg=14.0, l_thigh_deg=-20.0, l_shin_deg=20.0,
                         r_thigh_deg=22.0, r_shin_deg=-14.0, back_turn=False, mirror_yaw=False),
                    dict(pelvis_dx=0.0, pelvis_dy=34.0, torso_deg=6.0, l_thigh_deg=-10.0, l_shin_deg=16.0,
                         r_thigh_deg=12.0, r_shin_deg=-10.0, back_turn=False, mirror_yaw=False),
                    dict(pelvis_dx=-2.0, pelvis_dy=36.0, torso_deg=10.0, l_thigh_deg=18.0, l_shin_deg=18.0,
                         r_thigh_deg=-18.0, r_shin_deg=14.0, mane_in_front=True, right_leg_behind=True,
                         back_turn=True, mirror_yaw=False),
                    dict(pelvis_dx=2.0, pelvis_dy=36.0, torso_deg=12.0, l_thigh_deg=18.0, l_shin_deg=18.0,
                         r_thigh_deg=-18.0, r_shin_deg=14.0, mane_in_front=True, right_leg_behind=True,
                         back_turn=True, mirror_yaw=True),
                    dict(pelvis_dx=-4.0, pelvis_dy=40.0, torso_deg=-8.0, l_thigh_deg=-14.0, l_shin_deg=18.0,
                         r_thigh_deg=14.0, r_shin_deg=-12.0, back_turn=False, mirror_yaw=False),
                    dict(pelvis_dx=6.0, pelvis_dy=42.0, torso_deg=18.0, l_thigh_deg=20.0, l_shin_deg=18.0,
                         r_thigh_deg=-22.0, r_shin_deg=16.0, back_turn=False, mirror_yaw=False),
                ]
                cfg = dict(DEFAULTS)
                cfg.update(yaw_poses[step6])
                cfg.update(
                    grip_x=gx_orb, grip_y=gy_orb, weapon_deg=b_deg, grip_sep=27.0,
                    spin_slash=True, spin_ang=spin_ang, halo_active=True, halo_r=16.5,
                    mane_wave_phase=spin_ang, mane_wave_amp=9.5, foot_y=98.0,
                )
                cfgs.append(apply_2h_sword_ik(cfg))
            else:
                slam_kfs = [
                    (18, dict(pelvis_dx=4.0, pelvis_dy=18.0, torso_deg=-16.0, head_rel_deg=10.0,
                              l_thigh_deg=22.0, l_shin_deg=32.0, r_thigh_deg=-16.0, r_shin_deg=24.0,
                              grip_x=18.0, grip_y=-190.0, weapon_deg=-134.0, grip_sep=27.0, weapon_len=33.0,
                              foot_y=93.0, halo_active=True)),
                    (21, dict(pelvis_dx=18.0, pelvis_dy=64.0, torso_deg=28.0, head_rel_deg=-14.0,
                              l_thigh_deg=-28.0, l_shin_deg=30.0, r_thigh_deg=28.0, r_shin_deg=-22.0,
                              grip_x=66.0, grip_y=-12.0, weapon_deg=32.0, grip_sep=32.0, weapon_len=34.0,
                              foot_y=99.0, halo_active=True)),
                    (24, dict(pelvis_dx=16.0, pelvis_dy=60.0, torso_deg=25.0, head_rel_deg=-10.0,
                              l_thigh_deg=-24.0, l_shin_deg=26.0, r_thigh_deg=24.0, r_shin_deg=-18.0,
                              grip_x=62.0, grip_y=-14.0, weapon_deg=26.0, grip_sep=32.0, weapon_len=34.5,
                              foot_y=99.0, halo_active=True)),
                    (29, dict(torso_deg=4.5, grip_x=56.0, grip_y=-14.0, weapon_deg=-38.0,
                              grip_sep=33.0, weapon_len=35.5, foot_y=99.0, halo_active=False)),
                ]
                cfg = eval_2h_keyframes(f, slam_kfs, ph, DEFAULTS, wave_mult=3.0)
                if 20 <= f <= 23:
                    u = (f - 20) / 3.0
                    cfg["slash_arc"] = dict(dx=0.5, dy=11.0, r=28.0, a0=-102.0 + 22.0 * u, a1=48.0 + 12.0 * u, intensity=1.22)
                cfgs.append(cfg)

        elif row_idx == 4:
            # Row 4: ULTIMATE (F00..F05: Solemn 2H Sacred Vow Consecration Pose -> F06..F16: 2H Omnislash -> F17..F29: Sky Charge & Earthshatter!)
            kfs = [
                # F00..F05: Noble Paladin Two-Handed Sacred Vow (Claymore held vertically upright before his T-Visor!)
                (0, dict(pelvis_dx=-2.0, pelvis_dy=12.0, torso_deg=1.5, head_rel_deg=8.0, mane_rel_deg=-3.0,
                         l_thigh_deg=-6.0, l_shin_deg=8.0, r_thigh_deg=8.0, r_shin_deg=-6.0,
                         grip_x=48.0, grip_y=-54.0, weapon_deg=-89.0, grip_sep=30.0, weapon_len=33.5,
                         force_right_arm_front=True, foot_y=99.0, halo_active=True, halo_grand=True)),
                (2, dict(pelvis_dx=-2.0, pelvis_dy=18.0, torso_deg=0.0, head_rel_deg=10.0, mane_rel_deg=-5.0,
                         l_thigh_deg=-8.0, l_shin_deg=10.0, r_thigh_deg=10.0, r_shin_deg=-8.0,
                         grip_x=46.0, grip_y=-68.0, weapon_deg=-90.0, grip_sep=30.0, weapon_len=33.5,
                         force_right_arm_front=True, foot_y=99.0, halo_active=True, halo_grand=True)),
                (5, dict(pelvis_dx=0.0, pelvis_dy=8.0, torso_deg=-5.0, head_rel_deg=-10.0, mane_rel_deg=-9.0,
                         l_thigh_deg=-6.0, l_shin_deg=8.0, r_thigh_deg=8.0, r_shin_deg=-6.0,
                         grip_x=44.0, grip_y=-92.0, weapon_deg=-90.0, grip_sep=30.0, weapon_len=33.0,
                         force_right_arm_front=True, foot_y=99.0, halo_active=True, halo_grand=True)),
                # F06..F08: Teleport 1 (LEFT): Explosive Two-Handed Horizontal Cleave!
                (6, dict(pelvis_dx=16.0, pelvis_dy=46.0, torso_deg=24.0, head_rel_deg=-12.0,
                         l_thigh_deg=24.0, l_shin_deg=20.0, r_thigh_deg=-26.0, r_shin_deg=20.0,
                         grip_x=66.0, grip_y=-20.0, weapon_deg=18.0, grip_sep=32.0, weapon_len=34.5,
                         foot_y=99.0, halo_active=True)),
                (8, dict(pelvis_dx=-6.0, pelvis_dy=52.0, torso_deg=18.0,
                         grip_x=52.0, grip_y=-6.0, weapon_deg=42.0, grip_sep=30.0, weapon_len=34.0,
                         foot_y=99.0, halo_active=True)),
                # F09..F12: Teleport 2 (RIGHT): Rising Cross-Slash!
                (10, dict(pelvis_dx=10.0, pelvis_dy=34.0, torso_deg=-10.0, head_rel_deg=8.0,
                          l_thigh_deg=-20.0, l_shin_deg=20.0, r_thigh_deg=22.0, r_shin_deg=-16.0,
                          grip_x=48.0, grip_y=-128.0, weapon_deg=-84.0, grip_sep=28.0, weapon_len=33.5,
                          foot_y=99.0, halo_active=True)),
                (13, dict(pelvis_dx=-8.0, pelvis_dy=46.0, torso_deg=-8.0,
                          grip_x=34.0, grip_y=-104.0, weapon_deg=-92.0, grip_sep=28.0, weapon_len=33.5,
                          foot_y=99.0, halo_active=True)),
                # F14..F16: Teleport 3 (FLANK): Heavy Launching Cross-Cleave!
                (15, dict(pelvis_dx=18.0, pelvis_dy=50.0, torso_deg=25.0, head_rel_deg=-12.0,
                          l_thigh_deg=26.0, l_shin_deg=22.0, r_thigh_deg=-26.0, r_shin_deg=20.0,
                          grip_x=66.0, grip_y=-22.0, weapon_deg=8.0, grip_sep=32.0, weapon_len=34.5,
                          foot_y=99.0, halo_active=True)),
                # F17..F21: Teleport 4 (TOP): Hovering Two-Handed Overhead Sky Charge!
                (17, dict(pelvis_dx=0.0, pelvis_dy=10.0, torso_deg=-16.0, head_rel_deg=14.0,
                          l_thigh_deg=28.0, l_shin_deg=42.0, r_thigh_deg=-16.0, r_shin_deg=34.0,
                          grip_x=18.0, grip_y=-190.0, weapon_deg=-130.0, grip_sep=26.0, weapon_len=33.0,
                          foot_y=91.0, halo_active=True, halo_grand=True)),
                (21, dict(pelvis_dx=2.0, pelvis_dy=6.0, torso_deg=-20.0, head_rel_deg=18.0,
                          l_thigh_deg=32.0, l_shin_deg=44.0, r_thigh_deg=-18.0, r_shin_deg=36.0,
                          grip_x=16.0, grip_y=-196.0, weapon_deg=-136.0, grip_sep=26.0, weapon_len=33.0,
                          foot_y=90.0, halo_active=True, halo_grand=True)),
                # F22..F29: Meteoric Top-Down Two-Handed Plunge Slash & Earthshatter!
                (23, dict(pelvis_dx=14.0, pelvis_dy=24.0, torso_deg=28.0, head_rel_deg=-8.0,
                          l_thigh_deg=24.0, l_shin_deg=30.0, r_thigh_deg=-22.0, r_shin_deg=26.0,
                          grip_x=62.0, grip_y=-18.0, weapon_deg=56.0, grip_sep=28.0, weapon_len=33.5,
                          foot_y=94.0, halo_active=True, halo_grand=True)),
                (25, dict(pelvis_dx=18.0, pelvis_dy=66.0, torso_deg=28.0, head_rel_deg=-16.0,
                          l_thigh_deg=-30.0, l_shin_deg=32.0, r_thigh_deg=28.0, r_shin_deg=-22.0,
                          grip_x=66.0, grip_y=-12.0, weapon_deg=36.0, grip_sep=32.0, weapon_len=34.0,
                          foot_y=99.0, halo_active=True, halo_grand=True)),
                (29, dict(torso_deg=4.5, grip_x=56.0, grip_y=-14.0, weapon_deg=-38.0,
                          grip_sep=33.0, weapon_len=35.5, foot_y=99.0, halo_active=False)),
            ]
            cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.0)
            cfgs.append(cfg)

        elif row_idx == 5:
            # Row 5: DEATH (2H Stagger -> Double-Knee Two-Handed Claymore Ground Plant -> Noble Prone Collapse!)
            kfs = make_prone_knight_death_kfs(idle_weapon_deg=-38.0, plant_x=80.0, plant_y=64.5, use_planted_weapon=True)
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, extra_meta_keys=("plant_x", "plant_y"), wave_mult=1.0)
            cfg["halo_active"] = False
            if f <= 7:
                u = f / 7.0
                cfg["two_handed_ik"] = True
                cfg["grip_x"] = 56.0 - 8.0 * u
                cfg["grip_y"] = -14.0 + 14.0 * u
                cfg["grip_sep"] = 30.0
                apply_2h_sword_ik(cfg)
            else:
                cfg["two_handed_ik"] = False
                if f <= 15:
                    cfg["l_sode_rel_deg"] = -58.0
                    cfg["l_fore_rel_deg"] = -24.0
            cfgs.append(cfg)

        elif row_idx == 6:
            # Row 6: DASH (Pure Aerodynamic Paladin Vanguard Drag-Rush — ZERO baked horizontal stick-lines!)
            kfs = [
                (0, dict(torso_deg=4.5, grip_x=56.0, grip_y=-14.0, weapon_deg=-38.0, grip_sep=33.0, foot_y=99.0)),
                (7, dict(pelvis_dx=14.0, pelvis_dy=40.0, torso_deg=27.0, head_rel_deg=-14.0, mane_rel_deg=-26.0,
                         l_thigh_deg=30.0, l_shin_deg=34.0, r_thigh_deg=-26.0, r_shin_deg=24.0,
                         grip_x=20.0, grip_y=10.0, weapon_deg=160.0, grip_sep=30.0, weapon_len=33.5,
                         halo_active=True, foot_y=99.0)),
                (22, dict(pelvis_dx=14.0, pelvis_dy=38.0, torso_deg=27.0, head_rel_deg=-14.0, mane_rel_deg=-26.0,
                          l_thigh_deg=28.0, l_shin_deg=32.0, r_thigh_deg=-28.0, r_shin_deg=26.0,
                          grip_x=22.0, grip_y=8.0, weapon_deg=158.0, grip_sep=30.0, weapon_len=33.5,
                          halo_active=True, foot_y=99.0)),
                (29, dict(torso_deg=4.5, grip_x=56.0, grip_y=-14.0, weapon_deg=-38.0, grip_sep=33.0, weapon_len=35.5, foot_y=99.0)),
            ]
            cfgs.append(eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.0))

        elif row_idx == 7:
            # Row 7: CROUCH (Ironclad 2H Cross-Guard Spell Parry -> Low Sweeping 2H Frost-Counter!)
            kfs = [
                (0, dict(torso_deg=4.5, grip_x=56.0, grip_y=-14.0, weapon_deg=-38.0, grip_sep=33.0)),
                (5, dict(pelvis_dx=-6.0, pelvis_dy=62.0, torso_deg=10.0, head_rel_deg=-6.0,
                         l_thigh_deg=-28.0, l_shin_deg=30.0, r_thigh_deg=26.0, r_shin_deg=-22.0,
                         grip_x=54.0, grip_y=-62.0, weapon_deg=-74.0, grip_sep=32.0, weapon_len=33.5,
                         force_right_arm_front=True, halo_active=True)),
                (12, dict(pelvis_dx=-6.0, pelvis_dy=64.0, torso_deg=10.0, head_rel_deg=-6.0,
                          l_thigh_deg=-28.0, l_shin_deg=30.0, r_thigh_deg=26.0, r_shin_deg=-22.0,
                          grip_x=52.0, grip_y=-66.0, weapon_deg=-78.0, grip_sep=32.0, weapon_len=33.5,
                          force_right_arm_front=True, halo_active=True)),
                (17, dict(pelvis_dx=16.0, pelvis_dy=60.0, torso_deg=23.0, head_rel_deg=-12.0,
                          l_thigh_deg=-24.0, l_shin_deg=26.0, r_thigh_deg=24.0, r_shin_deg=-20.0,
                          grip_x=66.0, grip_y=-16.0, weapon_deg=14.0, grip_sep=32.0, weapon_len=34.5,
                          halo_active=True)),
                (29, dict(torso_deg=4.5, grip_x=56.0, grip_y=-14.0, weapon_deg=-38.0, grip_sep=33.0, weapon_len=35.5)),
            ]
            cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.0)
            if 15 <= f <= 18:
                cfg["slash_arc"] = dict(dx=1.5, r=27.0, a0=-42.0, a1=36.0, intensity=1.08, dy=16.0)
            cfgs.append(cfg)

        elif row_idx == 8:
            # Row 8: JUMP & ARCHANGEL SKY JUSTICE AIM + PLUNGE!
            # F00..F10: Crouch coil & airborne ascent raising the 2H Claymore
            # F11..F19: Dedicated Archangel Sky-Hover Pose with BOTH hands thrusting the 2H Claymore
            #           diagonally downward (+38..+44 deg) pointing straight toward the grounded enemy!
            # F20..F29: Supersonic downward diving cleave & grounded shockwave absorption!
            kfs = [
                (0, dict(torso_deg=4.5, grip_x=56.0, grip_y=-14.0, weapon_deg=-38.0, grip_sep=33.0, foot_y=99.0)),
                (3, dict(pelvis_dy=54.0, torso_deg=14.0, l_thigh_deg=-26.0, l_shin_deg=28.0,
                         r_thigh_deg=24.0, r_shin_deg=-22.0,
                         grip_x=48.0, grip_y=-10.0, weapon_deg=-52.0, grip_sep=32.0, foot_y=99.0)),
                (9, dict(pelvis_dx=4.0, pelvis_dy=12.0, torso_deg=-12.0, head_rel_deg=8.0,
                         l_thigh_deg=24.0, l_shin_deg=38.0, r_thigh_deg=-14.0, r_shin_deg=30.0,
                         grip_x=20.0, grip_y=-186.0, weapon_deg=-126.0, grip_sep=26.0, weapon_len=33.0,
                         foot_y=93.0, halo_active=True)),
                # F12..F19: Regal Levitating Archangel Sword-Pointing-At-Enemy Justice Stance!
                (12, dict(pelvis_dx=6.0, pelvis_dy=10.0, torso_deg=17.0, head_rel_deg=-6.0, mane_rel_deg=-16.0,
                          l_thigh_deg=-26.0, l_shin_deg=42.0, l_foot_deg=16.0,
                          r_thigh_deg=20.0, r_shin_deg=24.0, r_foot_deg=18.0,
                          grip_x=66.0, grip_y=-34.0, weapon_deg=36.0, grip_sep=31.0, weapon_len=34.0,
                          force_right_arm_front=True, foot_y=91.0, halo_active=True, halo_grand=True)),
                (16, dict(pelvis_dx=8.0, pelvis_dy=8.0, torso_deg=19.0, head_rel_deg=-5.0, mane_rel_deg=-18.0,
                          l_thigh_deg=-28.0, l_shin_deg=44.0, l_foot_deg=18.0,
                          r_thigh_deg=22.0, r_shin_deg=26.0, r_foot_deg=20.0,
                          grip_x=68.0, grip_y=-28.0, weapon_deg=42.0, grip_sep=31.0, weapon_len=34.0,
                          force_right_arm_front=True, foot_y=90.0, halo_active=True, halo_grand=True)),
                (19, dict(pelvis_dx=10.0, pelvis_dy=10.0, torso_deg=21.0, head_rel_deg=-4.0, mane_rel_deg=-20.0,
                          l_thigh_deg=-24.0, l_shin_deg=40.0, l_foot_deg=16.0,
                          r_thigh_deg=24.0, r_shin_deg=28.0, r_foot_deg=20.0,
                          grip_x=68.0, grip_y=-24.0, weapon_deg=45.0, grip_sep=31.0, weapon_len=34.0,
                          force_right_arm_front=True, foot_y=91.0, halo_active=True, halo_grand=True)),
                # F21..F25: Supersonic Downward Diving Cleave -> F26..F29: Landing Absorption!
                (22, dict(pelvis_dx=14.0, pelvis_dy=22.0, torso_deg=26.0, head_rel_deg=-10.0, mane_rel_deg=-22.0,
                          l_thigh_deg=22.0, l_shin_deg=32.0, r_thigh_deg=-18.0, r_shin_deg=26.0,
                          grip_x=66.0, grip_y=-16.0, weapon_deg=48.0, grip_sep=30.0, weapon_len=33.5,
                          foot_y=94.0, halo_active=True, halo_grand=True)),
                (25, dict(pelvis_dx=12.0, pelvis_dy=56.0, torso_deg=20.0, head_rel_deg=-10.0,
                          l_thigh_deg=-24.0, l_shin_deg=26.0, r_thigh_deg=22.0, r_shin_deg=-20.0,
                          grip_x=62.0, grip_y=-12.0, weapon_deg=22.0, grip_sep=32.0, weapon_len=34.5, foot_y=99.0)),
                (29, dict(torso_deg=4.5, grip_x=56.0, grip_y=-14.0, weapon_deg=-38.0, grip_sep=33.0, weapon_len=35.5, foot_y=99.0)),
            ]
            cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.5)
            cfgs.append(cfg)

    return cfgs


def main():
    build_portrait()
    parts = load_and_segment_512()
    picks = [
        (0, 0, "R0 SOVEREIGN GUARD"),
        (1, 4, "R1 PALADIN STRIDE"),
        (2, 11, "R2 2H CLAYMORE CLEAVE"),
        (3, 5, "R3 360 WHIRLWIND"),
        (4, 2, "R4 SACRED VOW"),
        (8, 16, "R8 SKY JUSTICE AIM"),
        (6, 12, "R6 PALADIN RUSH"),
        (7, 8, "R7 AEGIS PARRY"),
    ]
    build_and_save_30fps_sheet(
        "warrior", parts, build_row_configs, render_frame,
        OUT_SHEET_PATH, VFX_SHEET_PATH, ARTIFACT_DIR,
        shimmer_cols=(C_CYAN_LIT, C_GOLD_SPEC), showcase_picks=picks,
    )


if __name__ == "__main__":
    main()
