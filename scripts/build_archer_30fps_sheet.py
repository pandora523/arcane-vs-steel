#!/usr/bin/env python3
"""
Builds Sylvara (Archer — Sylvan Emerald & Gold Elven Star-Ranger) 30fps HD-2D Sprite Sheet
(6240x1872, 30 cols x 9 rows of 208x208) using archer_v2_base.jpg + hd2d_rig_core.
"""

import os
import math
import numpy as np
from hd2d_rig_core import (
    COLS, P, poly_mask, clean_base_512, assign_remaining_geodesic, extract_parts_512,
    put_px, draw_line_104, render_rig_104, eval_pose_keyframes,
    make_supine_caster_death_kfs, build_and_save_30fps_sheet,
)

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BASE_IMG_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "archer_v2_base.jpg")
OUT_SHEET_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "archer_sheet.png")
VFX_SHEET_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "archer_vfx.png")
ARTIFACT_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/3a4b2cf8-05c2-45a3-bb65-af6f5b5a1088"

# Strict 20-Color Hand-Crafted Sylvan Elven Star-Ranger Master Palette
MASTER_PALETTE = np.array([
    [10, 18, 16],     # 0: Deep Forest Outline
    [18, 34, 26],     # 1: Dark Pine Selout
    [24, 58, 40],     # 2: Sylvan Tunic Deep Shadow
    [38, 94, 60],     # 3: Emerald Ranger Tunic Base
    [58, 138, 82],    # 4: Lit Leaf-Emerald Midtone
    [92, 184, 108],   # 5: Sunlit Sylvan Tunic Highlight
    [152, 226, 154],  # 6: Bright Jade Rim Highlight
    [118, 68, 56],    # 7: Rose-Blonde Ponytail Shadow
    [168, 104, 82],   # 8: Warm Strawberry-Blonde Midtone
    [218, 152, 118],  # 9: Sunlit Elven Ponytail Highlight
    [248, 204, 168],  # 10: Pale Gold-Blonde Hair Gleam
    [58, 40, 38],     # 11: Dark Bark-Leather Breeches/Boots Shadow
    [98, 68, 58],     # 12: Woodland Leather Breeches Midtone
    [226, 194, 174],  # 13: Fair Elven Skin Tone
    [132, 92, 32],    # 14: Antique Elven Gold Shadow
    [198, 148, 46],   # 15: Royal Leaf-Gold Trim
    [248, 214, 92],   # 16: Sunlit Gold Filigree Gleam
    [46, 214, 158],   # 17: Starlight Jade Glow
    [128, 250, 204],  # 18: Luminous Star-Arrow Mint-Emerald
    [238, 255, 244],  # 19: Pure Astral Starlight Core
], dtype=np.int32)

C_OUT = (10, 18, 16, 255)
C_EM_DARK = (24, 58, 40, 255)
C_EM_MID = (58, 138, 82, 255)
C_EM_LIT = (92, 184, 108, 255)
C_BARK = (98, 68, 58, 255)
C_GOLD_MID = (198, 148, 46, 255)
C_GOLD_SPEC = (248, 214, 92, 255)
C_JADE = (46, 214, 158, 255)
C_STAR = (128, 250, 204, 255)
C_WHITE = (238, 255, 244, 255)

PIVOTS = dict(
    pelvis=(258.0, 260.0), neck=(264.0, 126.0), mane=(224.0, 64.0),
    l_sh=(218.0, 140.0), l_elb=(184.0, 206.0), l_hand=(160.0, 282.0),
    r_sh=(298.0, 144.0), r_elb=(314.0, 204.0), r_hand=(358.0, 272.0),
    l_hip=(226.0, 272.0), l_knee=(190.0, 360.0), l_ank=(154.0, 444.0),
    r_hip=(286.0, 272.0), r_knee=(324.0, 358.0), r_ank=(342.0, 442.0),
)

PALETTE_CFG = dict(
    palette=MASTER_PALETTE,
    protect_indices=(13, 15, 16, 17, 18, 19),
    hair_indices=(7, 8, 9, 10),
    lit_selout=1,
    shad_selout=0,
    hair_selout=7,
    joint_fill=(38, 32, 34, 255),
    joint_inner=(58, 44, 42, 255),
    hip_r=18,
    thigh_r=14,
    arm_r=11,
    pinhole_fill=(38, 94, 60, 255),
)


def load_and_segment_512():
    arr = clean_base_512(BASE_IMG_PATH)
    H, W = 512, 512
    a = arr[:, :, 3] > 0
    m_mane = poly_mask(H, W, P([
        (205, 20), (504, 20), (492, 112), (445, 165), (455, 242), (355, 280), (305, 365), (205, 365)
    ])) & a
    m_head = poly_mask(H, W, P([
        (440, 75), (625, 75), (625, 260), (555, 275), (480, 242), (442, 165)
    ])) & a & (~m_mane)
    m_l_sode = poly_mask(H, W, P([
        (345, 240), (482, 240), (476, 352), (402, 438), (330, 395)
    ])) & a & (~m_head) & (~m_mane)
    m_l_forearm = poly_mask(H, W, P([
        (268, 375), (408, 420), (378, 622), (268, 622)
    ])) & a & (~m_l_sode)
    m_r_sode = poly_mask(H, W, P([
        (565, 248), (655, 248), (650, 415), (585, 432)
    ])) & a & (~m_head)
    m_r_forearm = poly_mask(H, W, P([
        (595, 380), (668, 380), (768, 515), (768, 592), (665, 592), (598, 445)
    ])) & a & (~m_r_sode)
    m_torso = poly_mask(H, W, P([
        (372, 228), (605, 228), (605, 445), (645, 568), (542, 615),
        (485, 575), (372, 575), (435, 435)
    ])) & a & (~m_head) & (~m_l_sode) & (~m_l_forearm) & (~m_r_sode) & (~m_r_forearm)
    m_l_foot = poly_mask(H, W, P([(232, 875), (350, 875), (350, 1018), (232, 1018)])) & a
    m_l_shin = poly_mask(H, W, P([(260, 695), (432, 725), (352, 895), (255, 895)])) & a & (~m_l_foot)
    m_l_thigh = poly_mask(H, W, P([(330, 520), (518, 520), (505, 745), (330, 745)])) & a & (~m_torso) & (~m_l_shin) & (~m_l_foot)
    m_r_foot = poly_mask(H, W, P([(630, 870), (798, 870), (798, 1018), (630, 1018)])) & a
    m_r_shin = poly_mask(H, W, P([(585, 710), (718, 710), (722, 888), (632, 888)])) & a & (~m_r_foot)
    m_r_thigh = poly_mask(H, W, P([(515, 515), (690, 515), (690, 735), (530, 735)])) & a & (~m_torso) & (~m_r_shin) & (~m_r_foot)
    masks = assign_remaining_geodesic(a, [
        ("mane", m_mane), ("head", m_head), ("torso", m_torso),
        ("l_sode", m_l_sode), ("l_forearm", m_l_forearm),
        ("r_sode", m_r_sode), ("r_forearm", m_r_forearm),
        ("l_thigh", m_l_thigh), ("l_shin", m_l_shin), ("l_foot", m_l_foot),
        ("r_thigh", m_r_thigh), ("r_shin", m_r_shin), ("r_foot", m_r_foot),
    ])
    return extract_parts_512(arr, masks)


def draw_quiver_104(arr, nx, ny, torso_deg):
    rad = math.radians(torso_deg - 125.0)
    ux, uy = math.cos(rad), math.sin(rad)
    bx, by = nx - 5.0, ny + 8.0
    tx, ty = bx + ux * 14.0, by + uy * 14.0
    draw_line_104(arr, bx, by, tx, ty, C_BARK, 3)
    put_px(arr, tx, ty, C_GOLD_SPEC)
    for k in (-1.6, 0.0, 1.6):
        fx = tx + ux * 4.2 + (-uy) * k
        fy = ty + uy * 4.2 + ux * k
        draw_line_104(arr, tx, ty, fx, fy, C_STAR if k == 0.0 else C_GOLD_SPEC, 1)


def draw_astral_wings_104(arr, nx, ny, ph):
    flap = math.sin(ph) * 8.0
    for idx, base_deg in enumerate((148.0, 166.0, 186.0, 206.0)):
        ang = math.radians(base_deg + flap * (1.0 - idx * 0.18))
        wlen = 24.0 - idx * 3.2
        x1 = nx - 4.0 + math.cos(ang) * wlen
        y1 = ny + 4.0 + math.sin(ang) * wlen
        draw_line_104(arr, nx - 3.0, ny + 4.0, x1, y1, C_STAR if idx % 2 == 0 else C_JADE, 2)
        put_px(arr, x1, y1, C_WHITE)


def draw_recurve_bow_104(arr, hx, hy, aim_deg, pull=0.0, fan_arrows=0, dragon_arrow=False, glow=1.0):
    rad = math.radians(aim_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    nx, ny = -uy, ux

    half_span = 15.5 - pull * 1.8
    bend = 5.5 + pull * 4.5
    top_x = hx - ux * bend - nx * half_span
    top_y = hy - uy * bend - ny * half_span
    bot_x = hx - ux * bend + nx * half_span
    bot_y = hy - uy * bend + ny * half_span

    # Pulled bowstring from top tip -> nock point -> bottom tip
    nock_x = hx - ux * (4.5 + pull * 12.5)
    nock_y = hy - uy * (4.5 + pull * 12.5)
    str_col = C_STAR if pull > 0.25 else (170, 205, 185, 255)
    draw_line_104(arr, top_x, top_y, nock_x, nock_y, str_col, 1)
    draw_line_104(arr, bot_x, bot_y, nock_x, nock_y, str_col, 1)

    # Ornate curved Elven Recurve Bow limbs
    for s in np.linspace(-1.0, 1.0, 45):
        # Recurve S-arc
        arch = (s * s) * bend - (abs(s) ** 4) * 1.8
        bx = hx + ux * (2.2 - arch) + nx * (s * half_span)
        by = hy + uy * (2.2 - arch) + ny * (s * half_span)
        col = C_GOLD_SPEC if abs(s) < 0.22 or abs(s) > 0.86 else (C_EM_LIT if glow > 0.4 else C_EM_MID)
        put_px(arr, bx, by, col)
        put_px(arr, bx - ux * 0.9, by - uy * 0.9, C_OUT if abs(s) >= 0.22 else C_GOLD_MID)

    # Nocked Star-Arrow(s) when drawing!
    if pull > 0.12:
        angles = [0.0]
        if fan_arrows >= 3:
            angles = [-12.0, 0.0, 12.0]
        for da in angles:
            ar = math.radians(aim_deg + da)
            aux, auy = math.cos(ar), math.sin(ar)
            tip_len = 13.0 if dragon_arrow else 9.5
            tx = hx + aux * tip_len
            ty = hy + auy * tip_len
            draw_line_104(arr, nock_x, nock_y, tx, ty, C_WHITE if dragon_arrow else C_STAR, 2 if dragon_arrow else 1)
            # Broadhead star-tip
            put_px(arr, tx, ty, C_WHITE)
            put_px(arr, tx - aux * 1.4 - auy * 1.2, ty - auy * 1.4 + aux * 1.2, C_GOLD_SPEC if dragon_arrow else C_JADE)
            put_px(arr, tx - aux * 1.4 + auy * 1.2, ty - auy * 1.4 - aux * 1.2, C_GOLD_SPEC if dragon_arrow else C_JADE)


def extra_extents(joints_c, cfg, scale):
    pts = []
    if cfg.get("show_weapon", True) and not cfg.get("resting_weapon", False):
        rh = joints_c["r_hand"]
        rad = math.radians(cfg.get("weapon_deg", -4.0))
        nx, ny = -math.sin(rad), math.cos(rad)
        pts.append((rh[0] + math.cos(rad) * (15.0 / scale), rh[1] + math.sin(rad) * (15.0 / scale)))
        pts.append((rh[0] + nx * (18.0 / scale), rh[1] + ny * (18.0 / scale)))
        pts.append((rh[0] - nx * (18.0 / scale), rh[1] - ny * (18.0 / scale)))
    if cfg.get("halo_active", False):
        nk = joints_c["neck"]
        pts.append((nk[0] - 28.0 / scale, nk[1] - 18.0 / scale))
    return pts


def draw_back(bg104, joints104, cfg):
    nk = joints104["neck"]
    if not cfg.get("resting_weapon", False):
        draw_quiver_104(bg104, nk[0], nk[1], cfg.get("torso_deg", 0.0))
    if cfg.get("halo_active", False):
        draw_astral_wings_104(bg104, nk[0], nk[1], cfg.get("mane_wave_phase", 0.0))


def draw_front(out, joints104, cfg):
    if cfg.get("resting_weapon", False):
        draw_recurve_bow_104(out, 52.0, 94.0, aim_deg=-82.0, pull=0.0, glow=0.35)
        return

    rh = joints104["r_hand"]
    draw_recurve_bow_104(
        out, rh[0], rh[1],
        aim_deg=cfg.get("weapon_deg", -4.0),
        pull=cfg.get("bow_pull", 0.0),
        fan_arrows=cfg.get("fan_arrows", 0),
        dragon_arrow=cfg.get("dragon_arrow", False),
        glow=cfg.get("weapon_glow", 1.0),
    )

    if cfg.get("release_flash", False):
        rad = math.radians(cfg.get("weapon_deg", 0.0))
        fx = rh[0] + math.cos(rad) * 6.0
        fy = rh[1] + math.sin(rad) * 6.0
        for k in range(4):
            a = k * (math.pi * 0.5) + 0.4
            draw_line_104(out, fx - math.cos(a) * 4.5, fy - math.sin(a) * 4.5,
                          fx + math.cos(a) * 4.5, fy + math.sin(a) * 4.5, C_WHITE if k % 2 == 0 else C_STAR, 1)


DEFAULTS = dict(
    pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=3.0, head_rel_deg=-2.0, mane_rel_deg=-5.0,
    mane_wave_amp=6.5, l_thigh_deg=-2.0, l_shin_deg=2.0, l_foot_deg=0.0,
    r_thigh_deg=2.0, r_shin_deg=-2.0, r_foot_deg=0.0,
    l_sode_rel_deg=-6.0, l_fore_rel_deg=-14.0, r_sode_rel_deg=-18.0, r_fore_rel_deg=-16.0,
    weapon_deg=-6.0, bow_pull=0.0, weapon_glow=1.0, foot_y=99.0,
    show_weapon=True, right_arm_in_front=False, right_leg_behind=False, halo_active=False,
)


def render_frame(parts, cfg):
    return render_rig_104(
        parts, PIVOTS, cfg, PALETTE_CFG,
        y_bot_base=486.0, default_S=588,
        extra_extent_fn=extra_extents, draw_back_fn=draw_back, draw_front_fn=draw_front,
    )


def build_row_configs(row_idx):
    cfgs = []
    for f in range(COLS):
        t = f / float(COLS)
        ph = 2.0 * math.pi * t

        if row_idx == 0:
            b = math.sin(ph)
            s = math.cos(ph)
            cfg = dict(DEFAULTS)
            cfg.update(
                pelvis_dx=s * 2.5, pelvis_dy=b * 7.0, torso_deg=3.0 + b * 1.6,
                head_rel_deg=-2.0 - b * 1.2, mane_rel_deg=-5.0 + s * 4.0,
                mane_wave_phase=ph, weapon_deg=-8.0 + b * 2.5,
            )
            cfgs.append(cfg)

        elif row_idx == 1:
            st = math.sin(ph)
            kl = math.cos(ph)
            cfg = dict(DEFAULTS)
            cfg.update(
                pelvis_dy=abs(st) * 18.0, torso_deg=7.5 + abs(st) * 2.0, head_rel_deg=-4.0,
                mane_rel_deg=-9.0 - abs(st) * 4.5, mane_wave_phase=ph * 2.0, mane_wave_amp=8.5,
                right_leg_behind=(f >= 15),
                l_thigh_deg=st * 26.0, l_shin_deg=max(0.0, st * 26.0) + max(0.0, kl * 14.0), l_foot_deg=st * 12.0,
                r_thigh_deg=-st * 26.0, r_shin_deg=max(0.0, -st * 26.0) + max(0.0, -kl * 14.0), r_foot_deg=-st * 12.0,
                l_sode_rel_deg=-st * 18.0, l_fore_rel_deg=-16.0 - abs(st) * 6.0,
                r_sode_rel_deg=st * 14.0 - 12.0, r_fore_rel_deg=-14.0 + st * 5.0,
                weapon_deg=-6.0 + st * 5.0,
            )
            cfgs.append(cfg)

        elif row_idx == 2:
            # Row 2: AUTO_ATTACK (Quiver Reach F00..F04 -> Progressive 14f Star-Bow Draw F05..F18 -> Release F19 -> Recovery)
            kfs = [
                (0, dict(torso_deg=3.0, weapon_deg=-8.0, bow_pull=0.0)),
                (4, dict(pelvis_dx=-4.0, pelvis_dy=16.0, torso_deg=2.0,
                         l_sode_rel_deg=-72.0, l_fore_rel_deg=-48.0, r_sode_rel_deg=-44.0, r_fore_rel_deg=-18.0,
                         weapon_deg=-2.0, bow_pull=0.15, right_arm_in_front=True)),
                (18, dict(pelvis_dx=-10.0, pelvis_dy=28.0, torso_deg=-6.0, head_rel_deg=6.0,
                          l_thigh_deg=-16.0, l_shin_deg=14.0, r_thigh_deg=16.0, r_shin_deg=-10.0,
                          l_sode_rel_deg=-38.0, l_fore_rel_deg=-68.0, r_sode_rel_deg=-52.0, r_fore_rel_deg=-8.0,
                          weapon_deg=0.0, bow_pull=1.0, right_arm_in_front=True)),
                (19, dict(pelvis_dx=-12.0, pelvis_dy=24.0, torso_deg=-8.0, head_rel_deg=8.0,
                          l_thigh_deg=-16.0, l_shin_deg=14.0, r_thigh_deg=16.0, r_shin_deg=-10.0,
                          l_sode_rel_deg=18.0, l_fore_rel_deg=-24.0, r_sode_rel_deg=-54.0, r_fore_rel_deg=-6.0,
                          weapon_deg=-2.0, bow_pull=0.0, right_arm_in_front=True)),
                (29, dict(torso_deg=3.0, weapon_deg=-8.0, bow_pull=0.0)),
            ]
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.0)
            if f in (19, 20):
                cfg["release_flash"] = True
            cfgs.append(cfg)

        elif row_idx == 3:
            # Row 3: SKILL (Starfall Volley — 3-Arrow Horizontal Fan Draw/Release F11 -> -32 deg Skyward Starfall Shot F22!)
            kfs = [
                (0, dict(torso_deg=3.0, weapon_deg=-6.0, bow_pull=0.0)),
                (10, dict(pelvis_dx=-8.0, pelvis_dy=32.0, torso_deg=-4.0, l_thigh_deg=-18.0, l_shin_deg=16.0,
                          r_thigh_deg=18.0, r_shin_deg=-12.0, l_sode_rel_deg=-38.0, l_fore_rel_deg=-66.0,
                          r_sode_rel_deg=-52.0, r_fore_rel_deg=-8.0, weapon_deg=0.0, bow_pull=1.0, right_arm_in_front=True)),
                (12, dict(pelvis_dx=-10.0, pelvis_dy=28.0, torso_deg=-6.0, l_sode_rel_deg=16.0,
                          r_sode_rel_deg=-54.0, weapon_deg=-2.0, bow_pull=0.0, right_arm_in_front=True)),
                (21, dict(pelvis_dx=-8.0, pelvis_dy=36.0, torso_deg=-14.0, head_rel_deg=-12.0,
                          l_thigh_deg=-20.0, l_shin_deg=18.0, r_thigh_deg=20.0, r_shin_deg=-14.0,
                          l_sode_rel_deg=-56.0, l_fore_rel_deg=-64.0, r_sode_rel_deg=-78.0, r_fore_rel_deg=-10.0,
                          weapon_deg=-32.0, bow_pull=1.0, right_arm_in_front=True)),
                (23, dict(pelvis_dx=-10.0, pelvis_dy=32.0, torso_deg=-16.0, head_rel_deg=-12.0,
                          l_sode_rel_deg=14.0, r_sode_rel_deg=-80.0, weapon_deg=-34.0, bow_pull=0.0, right_arm_in_front=True)),
                (29, dict(torso_deg=3.0, weapon_deg=-6.0, bow_pull=0.0)),
            ]
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.5)
            if 4 <= f <= 10:
                cfg["fan_arrows"] = 3
            if f in (11, 22):
                cfg["release_flash"] = True
            cfgs.append(cfg)

        elif row_idx == 4:
            # Row 4: ULTIMATE (Astral Hurricane — Grounded Wind Gather -> Astral Light-Wing Dragon-Arrow Draw & Release F18!)
            kfs = [
                (0, dict(pelvis_dy=48.0, torso_deg=10.0, weapon_deg=-12.0, bow_pull=0.0, foot_y=99.0)),
                (5, dict(pelvis_dy=56.0, torso_deg=8.0, l_thigh_deg=-22.0, l_shin_deg=22.0,
                         r_thigh_deg=22.0, r_shin_deg=-18.0, weapon_deg=-8.0, bow_pull=0.25, foot_y=99.0, halo_active=True)),
                (17, dict(pelvis_dx=-6.0, pelvis_dy=16.0, torso_deg=-6.0, head_rel_deg=4.0,
                          l_thigh_deg=18.0, l_shin_deg=28.0, r_thigh_deg=-10.0, r_shin_deg=22.0,
                          l_sode_rel_deg=-40.0, l_fore_rel_deg=-68.0, r_sode_rel_deg=-52.0, r_fore_rel_deg=-8.0,
                          weapon_deg=0.0, bow_pull=1.0, foot_y=94.0, halo_active=True, right_arm_in_front=True)),
                (19, dict(pelvis_dx=-14.0, pelvis_dy=18.0, torso_deg=-12.0,
                          l_sode_rel_deg=22.0, r_sode_rel_deg=-54.0, weapon_deg=-2.0, bow_pull=0.0,
                          foot_y=94.0, halo_active=True, right_arm_in_front=True)),
                (25, dict(pelvis_dy=42.0, torso_deg=8.0, weapon_deg=-8.0, bow_pull=0.0, foot_y=99.0, halo_active=False)),
                (29, dict(torso_deg=3.0, weapon_deg=-8.0, bow_pull=0.0, foot_y=99.0)),
            ]
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.5)
            if 7 <= f <= 17:
                cfg["dragon_arrow"] = True
            if f in (18, 19, 20):
                cfg["release_flash"] = True
            cfgs.append(cfg)

        elif row_idx == 5:
            kfs = make_supine_caster_death_kfs(idle_weapon_deg=-8.0)
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=1.0)
            cfg["halo_active"] = False
            cfgs.append(cfg)

        elif row_idx == 6:
            # Row 6: DASH (Agile Sylvan Wind-Dash!)
            kfs = [
                (0, dict(torso_deg=6.0, weapon_deg=-8.0)),
                (7, dict(pelvis_dx=10.0, pelvis_dy=32.0, torso_deg=24.0, head_rel_deg=-14.0, mane_rel_deg=-24.0,
                         l_thigh_deg=28.0, l_shin_deg=32.0, r_thigh_deg=-22.0, r_shin_deg=20.0,
                         l_sode_rel_deg=24.0, r_sode_rel_deg=-26.0, weapon_deg=18.0)),
                (22, dict(pelvis_dx=10.0, pelvis_dy=32.0, torso_deg=24.0, head_rel_deg=-14.0, mane_rel_deg=-24.0,
                          l_thigh_deg=28.0, l_shin_deg=32.0, r_thigh_deg=-22.0, r_shin_deg=20.0,
                          l_sode_rel_deg=24.0, r_sode_rel_deg=-26.0, weapon_deg=18.0)),
                (29, dict(torso_deg=6.0, weapon_deg=-8.0)),
            ]
            cfgs.append(eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.0))

        elif row_idx == 7:
            # Row 7: CROUCH (Knee-Braced Sniper Draw F04..F17 -> Piercer Shot F18!)
            kfs = [
                (0, dict(torso_deg=3.0, weapon_deg=-8.0, bow_pull=0.0)),
                (17, dict(pelvis_dx=-8.0, pelvis_dy=72.0, torso_deg=6.0, head_rel_deg=-4.0,
                          l_thigh_deg=-30.0, l_shin_deg=34.0, r_thigh_deg=28.0, r_shin_deg=-24.0,
                          l_sode_rel_deg=-36.0, l_fore_rel_deg=-66.0, r_sode_rel_deg=-56.0, r_fore_rel_deg=-8.0,
                          weapon_deg=0.0, bow_pull=1.0, right_arm_in_front=True)),
                (19, dict(pelvis_dx=-12.0, pelvis_dy=70.0, torso_deg=2.0,
                          l_thigh_deg=-30.0, l_shin_deg=34.0, r_thigh_deg=28.0, r_shin_deg=-24.0,
                          l_sode_rel_deg=18.0, r_sode_rel_deg=-56.0, weapon_deg=-2.0, bow_pull=0.0, right_arm_in_front=True)),
                (29, dict(torso_deg=3.0, weapon_deg=-8.0, bow_pull=0.0)),
            ]
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.0)
            if f in (18, 19):
                cfg["release_flash"] = True
            cfgs.append(cfg)

        elif row_idx == 8:
            # Row 8: JUMP (Zephyr Leap + Mid-Air +22 deg Downward Shot at F18!)
            kfs = [
                (0, dict(torso_deg=3.0, weapon_deg=-8.0, bow_pull=0.0, foot_y=99.0)),
                (4, dict(pelvis_dy=52.0, torso_deg=12.0, l_thigh_deg=-24.0, l_shin_deg=26.0,
                         r_thigh_deg=22.0, r_shin_deg=-20.0, bow_pull=0.2, foot_y=99.0)),
                (17, dict(pelvis_dx=4.0, pelvis_dy=14.0, torso_deg=10.0, head_rel_deg=6.0,
                          l_thigh_deg=24.0, l_shin_deg=38.0, r_thigh_deg=-12.0, r_shin_deg=30.0,
                          l_sode_rel_deg=-24.0, l_fore_rel_deg=-64.0, r_sode_rel_deg=-34.0, r_fore_rel_deg=-8.0,
                          weapon_deg=22.0, bow_pull=1.0, foot_y=94.0, right_arm_in_front=True)),
                (19, dict(pelvis_dx=0.0, pelvis_dy=16.0, torso_deg=6.0,
                          l_thigh_deg=22.0, l_shin_deg=34.0, r_thigh_deg=-10.0, r_shin_deg=28.0,
                          l_sode_rel_deg=18.0, r_sode_rel_deg=-36.0, weapon_deg=20.0, bow_pull=0.0,
                          foot_y=95.0, right_arm_in_front=True)),
                (25, dict(pelvis_dy=48.0, torso_deg=10.0, bow_pull=0.0, foot_y=99.0)),
                (29, dict(torso_deg=3.0, weapon_deg=-8.0, bow_pull=0.0, foot_y=99.0)),
            ]
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.5)
            if f in (18, 19):
                cfg["release_flash"] = True
            cfgs.append(cfg)

    return cfgs


def main():
    parts = load_and_segment_512()
    picks = [
        (0, 0, "R0 RANGER POISED"),
        (1, 4, "R1 SYLVAN STRIDE"),
        (2, 17, "R2 FULL BOW DRAW"),
        (3, 9, "R3 3-ARROW VOLLEY"),
        (3, 21, "R3 SKYWARD STARFALL"),
        (4, 16, "R4 ASTRAL DRAGON DRAW"),
        (5, 25, "R5 SUPINE BOW REST"),
        (7, 16, "R7 KNEELING SNIPER"),
    ]
    build_and_save_30fps_sheet(
        "archer", parts, build_row_configs, render_frame,
        OUT_SHEET_PATH, VFX_SHEET_PATH, ARTIFACT_DIR,
        shimmer_cols=(C_STAR, C_GOLD_SPEC), showcase_picks=picks,
    )


if __name__ == "__main__":
    main()
