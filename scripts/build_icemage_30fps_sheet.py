#!/usr/bin/env python3
"""
Builds Glacia (IceMage — Cryo-Prism Figure-Skating Sovereign) 30fps HD-2D Sprite Sheet
(6240x1872, 30 cols x 9 rows of 208x208) using icemage_v4_base.jpg + hd2d_rig_core.
"""

import os
import math
import numpy as np
from hd2d_rig_core import (
    COLS, P, poly_mask, keep_largest_component, clean_base_512, assign_remaining_geodesic,
    extract_parts_512, put_px, draw_line_104, render_rig_104, eval_pose_keyframes,
    make_supine_caster_death_kfs, build_and_save_30fps_sheet,
)

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BASE_IMG_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "icemage_v4_base.jpg")
OUT_SHEET_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "icemage_sheet.png")
VFX_SHEET_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "icemage_vfx.png")
ARTIFACT_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/3a4b2cf8-05c2-45a3-bb65-af6f5b5a1088"

# Strict 20-Color Hand-Crafted Cryo-Prism Figure-Skating Sovereign Master Palette
MASTER_PALETTE = np.array([
    [10, 16, 30],     # 0: Deep Glacial Outline
    [20, 32, 56],     # 1: Sapphire-Ice Selout
    [26, 54, 84],     # 2: Borealis Corset & Skirt Deep Shadow
    [42, 86, 126],    # 3: Royal Cryo-Sapphire Corset Base
    [66, 128, 172],   # 4: Lit Glacial Teal-Sapphire Midtone
    [106, 176, 216],  # 5: Frosted Satin Highlight
    [164, 218, 246],  # 6: Pale Ice-Silk Specular
    [128, 114, 128],  # 7: Platinum Hair & Fur Stole Shadow
    [176, 158, 168],  # 8: Frosted Rose-Silver Hair Midtone
    [218, 202, 208],  # 9: Sunlit Platinum-Silk Hair
    [246, 238, 244],  # 10: Pure Snow-White Hair & Fur Gleam
    [142, 174, 206],  # 11: Glacial Tights Shadow
    [192, 222, 246],  # 12: Cool Frost-Silk Tights Base
    [228, 242, 254],  # 13: Porcelain Frost-Skin & Skate Boot
    [104, 48, 142],   # 14: Deep Aurora Amethyst Shadow
    [168, 84, 214],   # 15: Borealis Prism Magenta-Violet
    [232, 136, 252],  # 16: Luminous Prism Pink-Magenta
    [48, 206, 246],   # 17: Cryo-Crystal Deep Cyan
    [136, 244, 255],  # 18: Diamond Tiara & Skate-Blade Cyan
    [246, 254, 255],  # 19: Pure Diamond Prism Core
], dtype=np.int32)

C_SAPPHIRE = (42, 86, 126, 255)
C_PRISM = (232, 136, 252, 255)
C_CYAN = (48, 206, 246, 255)
C_CYAN_LIT = (136, 244, 255, 255)
C_CORE = (246, 254, 255, 255)

PIVOTS = dict(
    pelvis=(258.0, 248.0), neck=(268.0, 108.0), mane=(228.0, 74.0),
    l_sh=(222.0, 122.0), l_elb=(190.0, 184.0), l_hand=(136.0, 232.0),
    r_sh=(302.0, 126.0), r_elb=(322.0, 180.0), r_hand=(374.0, 226.0),
    l_hip=(224.0, 266.0), l_knee=(186.0, 352.0), l_ank=(136.0, 444.0),
    r_hip=(294.0, 266.0), r_knee=(334.0, 350.0), r_ank=(368.0, 444.0),
)

PALETTE_CFG = dict(
    palette=MASTER_PALETTE,
    protect_indices=(13, 15, 16, 17, 18, 19),
    hair_indices=(7, 8, 9, 10),
    lit_selout=1,
    shad_selout=0,
    hair_selout=7,
    joint_fill=(42, 86, 126, 255),
    joint_inner=(66, 128, 172, 255),
    hip_r=17,
    thigh_r=13,
    arm_r=11,
    pinhole_fill=(42, 86, 126, 255),
)


def load_and_segment_512():
    arr = clean_base_512(BASE_IMG_PATH, preserve_pale_thighs=True)
    H, W = 512, 512
    trim_sash = poly_mask(H, W, P([(432, 608), (586, 608), (586, 745), (432, 745)]))
    arr[trim_sash] = [0, 0, 0, 0]
    a = keep_largest_component(arr[:, :, 3] > 0)
    arr[~a] = [0, 0, 0, 0]

    yy, _ = np.mgrid[0:H, 0:W]
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    thigh_zone = a & (yy >= 235) & (yy <= 310) & (r > 232) & (g > 228) & (b > 228)
    arr[thigh_zone, :3] = [196, 226, 248]

    m_head = poly_mask(H, W, P([
        (472, 20), (615, 20), (615, 222), (545, 232), (482, 198), (472, 95)
    ])) & a
    m_mane = poly_mask(H, W, P([
        (220, 58), (495, 58), (485, 202), (370, 222), (355, 320), (220, 320)
    ])) & a & (~m_head)
    m_l_sode = poly_mask(H, W, P([
        (340, 200), (495, 200), (492, 285), (445, 365), (350, 385), (340, 290)
    ])) & a & (~m_head) & (~m_mane)
    m_l_forearm = poly_mask(H, W, P([
        (205, 325), (395, 365), (355, 520), (205, 520)
    ])) & a & (~m_l_sode)
    m_r_sode = poly_mask(H, W, P([
        (565, 208), (660, 208), (660, 365), (595, 385)
    ])) & a & (~m_head)
    m_r_forearm = poly_mask(H, W, P([
        (605, 330), (815, 330), (815, 502), (695, 502), (605, 395)
    ])) & a & (~m_r_sode)
    m_torso = poly_mask(H, W, P([
        (435, 195), (620, 195), (615, 455), (586, 610), (455, 610), (440, 435)
    ])) & a & (~m_head) & (~m_l_sode) & (~m_l_forearm) & (~m_r_sode) & (~m_r_forearm)
    m_l_coat = poly_mask(H, W, P([
        (195, 410), (495, 415), (495, 485), (375, 595), (285, 720), (195, 720)
    ])) & a & (~m_torso) & (~m_l_forearm)
    m_r_coat = poly_mask(H, W, P([
        (580, 420), (682, 420), (682, 602), (645, 575), (580, 495)
    ])) & a & (~m_torso) & (~m_r_forearm)
    m_l_foot = poly_mask(H, W, P([(220, 865), (315, 865), (315, 1018), (220, 1018)])) & a
    m_l_shin = poly_mask(H, W, P([(245, 665), (438, 665), (355, 880), (240, 880)])) & a & (~m_l_foot) & (~m_l_coat)
    m_l_thigh = poly_mask(H, W, P([(335, 480), (498, 480), (470, 695), (335, 695)])) & a & (~m_torso) & (~m_l_coat) & (~m_l_shin) & (~m_l_foot)
    m_r_foot = poly_mask(H, W, P([(680, 865), (840, 865), (840, 1018), (680, 1018)])) & a
    m_r_shin = poly_mask(H, W, P([(625, 665), (768, 665), (772, 880), (685, 880)])) & a & (~m_r_foot)
    m_r_thigh = poly_mask(H, W, P([(560, 475), (702, 475), (715, 685), (565, 685)])) & a & (~m_torso) & (~m_r_coat) & (~m_r_shin) & (~m_r_foot)
    masks = assign_remaining_geodesic(a, [
        ("mane", m_mane), ("head", m_head), ("torso", m_torso), ("l_coat", m_l_coat), ("r_coat", m_r_coat),
        ("l_sode", m_l_sode), ("l_forearm", m_l_forearm),
        ("r_sode", m_r_sode), ("r_forearm", m_r_forearm),
        ("l_thigh", m_l_thigh), ("l_shin", m_l_shin), ("l_foot", m_l_foot),
        ("r_thigh", m_r_thigh), ("r_shin", m_r_shin), ("r_foot", m_r_foot),
    ])
    return extract_parts_512(arr, masks)


def draw_snowflake_halo_104(arr, nx, ny, ph):
    cx, cy = nx - 3.0, ny - 2.0
    for k in range(6):
        ang = ph * 0.6 + k * (math.pi / 3.0)
        x1 = cx + math.cos(ang) * 14.5
        y1 = cy + math.sin(ang) * 14.5
        draw_line_104(arr, cx + math.cos(ang) * 6.0, cy + math.sin(ang) * 6.0, x1, y1, C_CYAN, 1)
        put_px(arr, x1, y1, C_PRISM if k % 2 == 0 else C_CORE)


def draw_cryo_scepter_104(arr, hx, hy, scep_deg, scep_len=19.0, glow=1.0, ph=0.0):
    rad = math.radians(scep_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    nx, ny = -uy, ux

    bx, by = hx - ux * 6.0, hy - uy * 6.0
    tx, ty = hx + ux * scep_len, hy + uy * scep_len
    draw_line_104(arr, bx, by, tx, ty, C_SAPPHIRE, 2)
    draw_line_104(arr, bx, by, tx, ty, C_CYAN_LIT, 1)

    # Faceted Borealis Crystal Star at tip
    cx, cy = tx + ux * 3.0, ty + uy * 3.0
    for d in (-3.0, -2.0, -1.0, 0.0, 1.0, 2.0, 3.0):
        put_px(arr, cx + nx * d, cy + ny * d, C_PRISM if abs(d) >= 2.0 else C_CYAN_LIT)
        put_px(arr, cx + ux * d, cy + uy * d, C_CORE if abs(d) <= 1.0 else C_CYAN_LIT)
    if glow > 0.6:
        for k in range(4):
            a = ph * 2.0 + k * (math.pi * 0.5)
            put_px(arr, cx + math.cos(a) * 4.5, cy + math.sin(a) * 4.5, C_CORE)


def extra_extents(joints_c, cfg, scale):
    pts = []
    if cfg.get("show_weapon", True) and not cfg.get("resting_weapon", False):
        rh = joints_c["r_hand"]
        rad = math.radians(cfg.get("weapon_deg", -28.0))
        wlen = cfg.get("weapon_len", 19.0)
        pts.append((rh[0] + math.cos(rad) * ((wlen + 8.0) / scale), rh[1] + math.sin(rad) * ((wlen + 8.0) / scale)))
    return pts


def draw_back(bg104, joints104, cfg):
    if cfg.get("halo_active", True):
        nk = joints104["neck"]
        draw_snowflake_halo_104(bg104, nk[0], nk[1], cfg.get("mane_wave_phase", 0.0))


def draw_front(out, joints104, cfg):
    ph = cfg.get("mane_wave_phase", 0.0)
    if cfg.get("resting_weapon", False):
        draw_cryo_scepter_104(out, 52.0, 95.0, scep_deg=2.0, scep_len=18.0, glow=0.3, ph=ph)
        return

    rh = joints104["r_hand"]
    draw_cryo_scepter_104(
        out, rh[0], rh[1],
        scep_deg=cfg.get("weapon_deg", -28.0),
        scep_len=cfg.get("weapon_len", 19.0),
        glow=cfg.get("weapon_glow", 1.0),
        ph=ph,
    )

    if cfg.get("prism_flash", False):
        rad = math.radians(cfg.get("weapon_deg", -10.0))
        fx = min(94.0, rh[0] + math.cos(rad) * 24.0)
        fy = max(10.0, min(92.0, rh[1] + math.sin(rad) * 24.0))
        for k in range(6):
            a = ph + k * (math.pi / 3.0)
            draw_line_104(out, fx, fy, fx + math.cos(a) * 5.0, fy + math.sin(a) * 5.0,
                          C_PRISM if k % 2 == 0 else C_CORE, 1)


DEFAULTS = dict(
    pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=3.0, head_rel_deg=-2.0, mane_rel_deg=-4.0,
    mane_wave_amp=6.5, l_thigh_deg=-2.0, l_shin_deg=2.0, l_foot_deg=0.0,
    r_thigh_deg=2.0, r_shin_deg=-2.0, r_foot_deg=0.0,
    l_sode_rel_deg=-6.0, l_fore_rel_deg=-10.0, r_sode_rel_deg=-12.0, r_fore_rel_deg=-10.0,
    l_coat_rel_deg=0.0, r_coat_rel_deg=0.0,
    weapon_deg=-28.0, weapon_len=19.0, weapon_glow=1.0, foot_y=99.0,
    show_weapon=True, halo_active=True, right_arm_in_front=False, right_leg_behind=False,
)


def render_frame(parts, cfg):
    return render_rig_104(
        parts, PIVOTS, cfg, PALETTE_CFG,
        y_bot_base=494.0, default_S=592,
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
                pelvis_dx=s * 3.0, pelvis_dy=b * 7.0, torso_deg=3.0 + b * 1.8,
                head_rel_deg=-2.0 - b * 1.2, mane_rel_deg=-4.0 + s * 4.0,
                mane_wave_phase=ph, l_coat_rel_deg=s * 4.0, weapon_deg=-28.0 + b * 3.5,
            )
            cfgs.append(cfg)

        elif row_idx == 1:
            # Row 1: WALK (Graceful Figure-Skating Ice Glide & Crossover Stride!)
            st = math.sin(ph)
            kl = math.cos(ph)
            cfg = dict(DEFAULTS)
            cfg.update(
                pelvis_dy=abs(st) * 16.0, torso_deg=10.0 + abs(st) * 2.5, head_rel_deg=-6.0,
                mane_rel_deg=-10.0 - abs(st) * 5.0, mane_wave_phase=ph * 2.0, mane_wave_amp=8.5,
                right_leg_behind=(f >= 15),
                l_thigh_deg=st * 28.0, l_shin_deg=max(0.0, st * 28.0) + max(0.0, kl * 14.0), l_foot_deg=st * 14.0,
                r_thigh_deg=-st * 28.0, r_shin_deg=max(0.0, -st * 28.0) + max(0.0, -kl * 14.0), r_foot_deg=-st * 14.0,
                l_sode_rel_deg=12.0 - st * 22.0, r_sode_rel_deg=-14.0 + st * 18.0,
                l_coat_rel_deg=-10.0 - abs(st) * 6.0, weapon_deg=-22.0 + st * 8.0,
            )
            cfgs.append(cfg)

        elif row_idx == 2:
            # Row 2: AUTO_ATTACK (Figure-Skater Pirouette Prep -> Refracted Cryo-Laser Scepter Cast!)
            kfs = [
                (0, dict(torso_deg=3.0, weapon_deg=-28.0)),
                (6, dict(pelvis_dx=-8.0, pelvis_dy=24.0, torso_deg=-8.0, head_rel_deg=6.0,
                         l_thigh_deg=-18.0, l_shin_deg=16.0, r_thigh_deg=18.0, r_shin_deg=-12.0,
                         l_sode_rel_deg=24.0, r_sode_rel_deg=-68.0, weapon_deg=-72.0, right_arm_in_front=True)),
                (12, dict(pelvis_dx=12.0, pelvis_dy=36.0, torso_deg=18.0, head_rel_deg=-10.0,
                          l_thigh_deg=26.0, l_shin_deg=20.0, r_thigh_deg=-22.0, r_shin_deg=16.0,
                          l_sode_rel_deg=32.0, r_sode_rel_deg=-18.0, r_fore_rel_deg=-4.0,
                          weapon_deg=-2.0, right_arm_in_front=True)),
                (19, dict(pelvis_dx=8.0, pelvis_dy=28.0, torso_deg=10.0,
                          r_sode_rel_deg=-24.0, weapon_deg=-16.0, right_arm_in_front=True)),
                (29, dict(torso_deg=3.0, weapon_deg=-28.0)),
            ]
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.5)
            if 10 <= f <= 15:
                cfg["prism_flash"] = True
            cfgs.append(cfg)

        elif row_idx == 3:
            # Row 3: SKILL (Tri-Beam Prism Matrix — Grounded Skater Arabesque Invocation -> Prism Detonation!)
            kfs = [
                (0, dict(torso_deg=3.0, weapon_deg=-28.0)),
                (7, dict(pelvis_dx=-6.0, pelvis_dy=30.0, torso_deg=-10.0, head_rel_deg=-8.0,
                         l_sode_rel_deg=-54.0, r_sode_rel_deg=-82.0, weapon_deg=-78.0, right_arm_in_front=True)),
                (16, dict(pelvis_dx=14.0, pelvis_dy=42.0, torso_deg=20.0, head_rel_deg=-12.0,
                          l_thigh_deg=32.0, l_shin_deg=28.0, r_thigh_deg=-22.0, r_shin_deg=18.0,
                          l_sode_rel_deg=36.0, r_sode_rel_deg=-14.0, weapon_deg=0.0, right_arm_in_front=True)),
                (29, dict(torso_deg=3.0, weapon_deg=-28.0)),
            ]
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.0)
            if f in (6, 7, 8, 15, 16, 17, 18):
                cfg["prism_flash"] = True
            cfgs.append(cfg)

        elif row_idx == 4:
            # Row 4: ULTIMATE (Borealis Cathedral — Grounded Sovereign Invocation -> Grand Shatter Sweep!)
            kfs = [
                (0, dict(pelvis_dy=36.0, torso_deg=-6.0, weapon_deg=-54.0, foot_y=99.0)),
                (7, dict(pelvis_dx=-4.0, pelvis_dy=42.0, torso_deg=-12.0, head_rel_deg=-10.0,
                         l_thigh_deg=-20.0, l_shin_deg=20.0, r_thigh_deg=20.0, r_shin_deg=-16.0,
                         l_sode_rel_deg=-68.0, r_sode_rel_deg=-92.0, weapon_deg=-86.0,
                         foot_y=99.0, right_arm_in_front=True)),
                (16, dict(pelvis_dx=16.0, pelvis_dy=48.0, torso_deg=22.0, head_rel_deg=-12.0,
                          l_thigh_deg=28.0, l_shin_deg=24.0, r_thigh_deg=-24.0, r_shin_deg=20.0,
                          l_sode_rel_deg=38.0, r_sode_rel_deg=-10.0, weapon_deg=4.0,
                          foot_y=99.0, right_arm_in_front=True)),
                (29, dict(torso_deg=3.0, weapon_deg=-28.0, foot_y=99.0)),
            ]
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=4.0)
            if 6 <= f <= 9 or 14 <= f <= 20:
                cfg["prism_flash"] = True
            cfgs.append(cfg)

        elif row_idx == 5:
            kfs = make_supine_caster_death_kfs(idle_weapon_deg=-28.0)
            cfgs.append(eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=1.0))

        elif row_idx == 6:
            # Row 6: DASH (Arabesque Figure-Skating Ice-Glide!)
            kfs = [
                (0, dict(torso_deg=6.0, weapon_deg=-24.0)),
                (7, dict(pelvis_dx=12.0, pelvis_dy=28.0, torso_deg=24.0, head_rel_deg=-14.0, mane_rel_deg=-24.0,
                         l_thigh_deg=42.0, l_shin_deg=44.0, l_foot_deg=28.0,
                         r_thigh_deg=-16.0, r_shin_deg=18.0,
                         l_coat_rel_deg=-22.0, l_sode_rel_deg=36.0, r_sode_rel_deg=-22.0, weapon_deg=-8.0)),
                (22, dict(pelvis_dx=12.0, pelvis_dy=28.0, torso_deg=24.0, head_rel_deg=-14.0, mane_rel_deg=-24.0,
                          l_thigh_deg=42.0, l_shin_deg=44.0, l_foot_deg=28.0,
                          r_thigh_deg=-16.0, r_shin_deg=18.0,
                          l_coat_rel_deg=-22.0, l_sode_rel_deg=36.0, r_sode_rel_deg=-22.0, weapon_deg=-8.0)),
                (29, dict(torso_deg=6.0, weapon_deg=-24.0)),
            ]
            cfgs.append(eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.5))

        elif row_idx == 7:
            # Row 7: CROUCH (Low Hydroblade / Kneeling Ice-Wall Cast & Frost-Lance!)
            kfs = [
                (0, dict(torso_deg=3.0, weapon_deg=-28.0)),
                (8, dict(pelvis_dx=-8.0, pelvis_dy=68.0, torso_deg=12.0,
                         l_thigh_deg=-30.0, l_shin_deg=32.0, r_thigh_deg=28.0, r_shin_deg=-24.0,
                         l_sode_rel_deg=24.0, r_sode_rel_deg=-48.0, weapon_deg=-42.0, right_arm_in_front=True)),
                (13, dict(pelvis_dx=10.0, pelvis_dy=64.0, torso_deg=18.0,
                          l_thigh_deg=-26.0, l_shin_deg=28.0, r_thigh_deg=24.0, r_shin_deg=-20.0,
                          r_sode_rel_deg=-10.0, weapon_deg=2.0, right_arm_in_front=True)),
                (29, dict(torso_deg=3.0, weapon_deg=-28.0)),
            ]
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.5)
            if f in (11, 12, 13, 14):
                cfg["prism_flash"] = True
            cfgs.append(cfg)

        elif row_idx == 8:
            # Row 8: JUMP (Airborne Axel Figure-Skating Vault + Apex Prism Cast at F14!)
            kfs = [
                (0, dict(torso_deg=3.0, weapon_deg=-28.0, foot_y=99.0)),
                (9, dict(pelvis_dx=6.0, pelvis_dy=12.0, torso_deg=10.0,
                         l_thigh_deg=28.0, l_shin_deg=42.0, r_thigh_deg=-14.0, r_shin_deg=32.0,
                         l_sode_rel_deg=-42.0, r_sode_rel_deg=-58.0, weapon_deg=-36.0,
                         foot_y=93.0, right_arm_in_front=True)),
                (15, dict(pelvis_dx=10.0, pelvis_dy=16.0, torso_deg=18.0,
                          l_thigh_deg=30.0, l_shin_deg=38.0, r_thigh_deg=-12.0, r_shin_deg=28.0,
                          l_sode_rel_deg=30.0, r_sode_rel_deg=-4.0, weapon_deg=20.0,
                          foot_y=94.0, right_arm_in_front=True)),
                (24, dict(pelvis_dy=44.0, torso_deg=10.0, weapon_deg=-18.0, foot_y=99.0)),
                (29, dict(torso_deg=3.0, weapon_deg=-28.0, foot_y=99.0)),
            ]
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.5)
            if f in (13, 14, 15, 16):
                cfg["prism_flash"] = True
            cfgs.append(cfg)

    return cfgs


def main():
    parts = load_and_segment_512()
    picks = [
        (0, 0, "R0 CRYO SOVEREIGN"),
        (1, 4, "R1 SKATING GLIDE"),
        (2, 12, "R2 PRISM LASER CAST"),
        (3, 16, "R3 TRI-BEAM MATRIX"),
        (4, 16, "R4 BOREALIS CATHEDRAL"),
        (5, 11, "R5 GRACEFUL SIT"),
        (5, 25, "R5 SUPINE SCEPTER REST"),
        (8, 14, "R8 AXEL PRISM VAULT"),
    ]
    build_and_save_30fps_sheet(
        "icemage", parts, build_row_configs, render_frame,
        OUT_SHEET_PATH, VFX_SHEET_PATH, ARTIFACT_DIR,
        shimmer_cols=(C_CYAN_LIT, C_PRISM), showcase_picks=picks,
    )


if __name__ == "__main__":
    main()
