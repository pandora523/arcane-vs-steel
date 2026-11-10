#!/usr/bin/env python3
"""
Builds Aethelgard (Warrior — Arcane Frost-Rune Knight) 30fps HD-2D Sprite Sheet
(6240x1872, 30 cols x 9 rows of 208x208) using warrior_v3_base.jpg + hd2d_rig_core.

Includes:
- 14-part dark midnight-cobalt & glowing cyan Elder-Rune Knight skeletal rig
- Winged Elder-Rune Greatsword + Floating Arcane Rune Sigil Halo + Runic Aegis Greatshield
- Row 3 (SKILL — TEMPEST VANGUARD): 2.5-revolution 360-degree Whirlwind Spin-Slash (with genuine
  front -> side -> back-plate -> side -> front body yaw rotation + 3D horizontal Runic Cyclone
  vortex ring) into a leaping two-handed Thunder-Breaker Overhead Slam!
- Row 4 (ULTIMATE — HEAVENLY EARTHSHATTER): Multi-directional Rune-Blink Omnislash (Left Cleave ->
  Right Cross-Slash -> Flank Launch -> Mid-Air TOP Overhead Rune Charge -> Meteoric Top-Down
  Vertical Plunge Slash & Earthshatter!)
"""

import os
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from hd2d_rig_core import (
    COLS, P, poly_mask, keep_largest_component, assign_remaining_geodesic, extract_parts_512,
    put_px, draw_line_104, draw_slash_arc_104, render_rig_104, eval_pose_keyframes,
    make_prone_knight_death_kfs, build_and_save_30fps_sheet,
)

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BASE_IMG_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "warrior_v3_base.jpg")
OUT_SHEET_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "warrior_sheet.png")
VFX_SHEET_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "warrior_vfx.png")
ARTIFACT_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/3a4b2cf8-05c2-45a3-bb65-af6f5b5a1088"

# Strict 20-Color Hand-Crafted Dark Cobalt & Glowing Cyan Elder-Rune Knight Master Palette
MASTER_PALETTE = np.array([
    [8, 11, 22],      # 0: Abyssal Obsidian Outline
    [15, 22, 40],     # 1: Deep Midnight-Cobalt Selout
    [24, 35, 60],     # 2: Dark Rune-Plate Shadow
    [38, 56, 92],     # 3: Midnight Cobalt Plate Base
    [60, 88, 136],    # 4: Lit Cobalt-Steel Midtone
    [98, 138, 192],   # 5: Polished Frost-Steel Highlight
    [164, 204, 240],  # 6: Specular Plume & Blade Rim
    [22, 46, 102],    # 7: Royal Rune-Tabard Deep Indigo
    [34, 74, 152],    # 8: Royal Rune-Tabard & Plume Midtone
    [64, 122, 206],   # 9: Lit Azure Plume & Tabard Crest
    [86, 58, 24],     # 10: Antique Rune-Gold Shadow
    [138, 96, 36],    # 11: Burnished Trim Gold Midtone
    [198, 148, 52],   # 12: Imperial Rune-Gold Highlight
    [246, 208, 92],   # 13: Specular Gold Gleam
    [32, 28, 36],     # 14: Dark Under-Armor Mail/Joint Shadow
    [54, 48, 62],     # 15: Charcoal Mail/Grip Midtone
    [88, 82, 98],     # 16: Steel Chain/Rivet Highlight
    [22, 132, 204],   # 17: Deep Carved Elder-Rune Cyan
    [56, 208, 252],   # 18: Luminous Elder-Rune & T-Visor Cyan
    [228, 252, 255],  # 19: Blazing White-Ice Rune Core
], dtype=np.int32)

C_OUT = (8, 11, 22, 255)
C_SEL = (15, 22, 40, 255)
C_STEEL_DARK = (24, 35, 60, 255)
C_STEEL_BASE = (38, 56, 92, 255)
C_STEEL_MID = (60, 88, 136, 255)
C_STEEL_LIT = (98, 138, 192, 255)
C_STEEL_SPEC = (164, 204, 240, 255)
C_PLUME_DARK = (22, 46, 102, 255)
C_PLUME_MID = (34, 74, 152, 255)
C_PLUME_LIT = (64, 122, 206, 255)
C_GOLD_DARK = (86, 58, 24, 255)
C_GOLD_MID = (138, 96, 36, 255)
C_GOLD_LIT = (198, 148, 52, 255)
C_GOLD_SPEC = (246, 208, 92, 255)
C_CYAN_DEEP = (22, 132, 204, 255)
C_CYAN_LIT = (56, 208, 252, 255)
C_ICE_CORE = (228, 252, 255, 255)

PIVOTS = dict(
    pelvis=(262.5, 280.0), neck=(256.0, 134.0), mane=(247.5, 51.0),
    l_sh=(194.0, 146.0), l_elb=(171.0, 215.0), l_hand=(176.0, 295.0),
    r_sh=(311.0, 152.5), r_elb=(322.5, 219.0), r_hand=(346.0, 294.0),
    l_hip=(222.5, 290.0), l_knee=(209.0, 362.5), l_ank=(187.5, 452.5),
    r_hip=(295.0, 290.0), r_knee=(304.0, 362.5), r_ank=(297.5, 447.5),
)

PALETTE_CFG = dict(
    palette=MASTER_PALETTE,
    # Protect gold gleams + all 3 cyan/ice Elder-Rune indices so armor runes stay crisp and bright!
    protect_indices=(12, 13, 17, 18, 19),
    hair_indices=(6, 8, 9),
    lit_selout=1,
    shad_selout=0,
    hair_selout=7,
    joint_fill=(18, 26, 46, 255),
    joint_inner=(28, 42, 72, 255),
    hip_r=22,
    thigh_r=17,
    arm_r=15,
    pinhole_fill=(24, 35, 60, 255),
)


def load_and_segment_512():
    """
    Cleans warrior_v3_base.jpg while preserving the bright white-ice center of the
    chest Elder-Rune crystal, strips enclosed arm/plume white background pockets,
    applies MedianFilter(size=3) cel-flattening so fine cyan armor runes stay sharp,
    and segments into 14 geodesic parts with 0 unassigned pixels.
    """
    im = Image.open(BASE_IMG_PATH).convert("RGBA")
    # Floodfill exterior + enclosed arm-to-tasset pocket + under-plume arch pocket
    for sx, sy in ((0, 0), (1023, 0), (0, 1023), (1023, 1023), (400, 500)):
        ImageDraw.floodfill(im, (sx, sy), (0, 0, 0, 0), thresh=38)
    arr = np.array(im)

    # Strip any remaining pure-white background pockets EXCEPT the chest rune crystal (520..590, 325..430)
    r = arr[:, :, 0].astype(np.int16)
    g = arr[:, :, 1].astype(np.int16)
    b = arr[:, :, 2].astype(np.int16)
    a0 = arr[:, :, 3] > 0
    pure_w = a0 & (r >= 246) & (g >= 246) & (b >= 246)
    pure_w[325:430, 520:590] = False
    arr[pure_w] = [0, 0, 0, 0]

    # 3-pass anti-aliased white fringe removal
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
        wf = edge & (r > 175) & (g > 175) & (b > 175) & (np.abs(r - g) < 28) & (np.abs(g - b) < 28)
        arr[wf] = [0, 0, 0, 0]

    im512 = Image.fromarray(arr, "RGBA").resize((512, 512), Image.Resampling.NEAREST)
    rgb_med3 = np.array(im512.convert("RGB").filter(ImageFilter.MedianFilter(size=3)))
    arr512 = np.array(im512)
    alpha = keep_largest_component(arr512[:, :, 3] > 0)
    arr512[~alpha] = [0, 0, 0, 0]
    arr512[:, :, :3] = np.where(alpha[:, :, None], rgb_med3, 0)

    H, W = 512, 512
    a = arr512[:, :, 3] > 0

    # Winged Rune-Knight Greathelm (leaves entire flowing azure-silver plume to m_mane)
    m_head = poly_mask(H, W, P([
        (386, 42), (445, 130), (482, 100), (548, 95), (568, 42),
        (592, 120), (595, 255), (548, 302), (475, 295), (435, 255), (432, 215), (385, 145)
    ])) & a
    m_mane = poly_mask(H, W, P([
        (188, 22), (552, 22), (548, 106), (482, 106), (445, 135), (430, 214), (188, 265)
    ])) & a & (~m_head)

    m_l_sode = poly_mask(H, W, P([
        (288, 216), (462, 216), (465, 345), (402, 435), (288, 425)
    ])) & a & (~m_head) & (~m_mane)
    m_l_forearm = poly_mask(H, W, P([
        (246, 388), (330, 418), (394, 438), (394, 640), (310, 640), (246, 520)
    ])) & a & (~m_l_sode)

    m_r_sode = poly_mask(H, W, P([
        (585, 232), (690, 232), (690, 445), (602, 455), (588, 355)
    ])) & a & (~m_head)
    m_r_forearm = poly_mask(H, W, P([
        (605, 445), (668, 392), (736, 392), (736, 635), (645, 635), (608, 495)
    ])) & a & (~m_r_sode)

    # Articulated Rune-Etched Hip Tassets
    m_l_coat = poly_mask(H, W, P([
        (365, 488), (488, 505), (486, 655), (365, 662)
    ])) & a & (~m_l_forearm)
    m_r_coat = poly_mask(H, W, P([
        (588, 492), (652, 492), (652, 662), (590, 655)
    ])) & a & (~m_r_forearm)

    # Rune Breastplate + Glowing Chest Core + Center Elder-Rune Tabard
    m_torso = poly_mask(H, W, P([
        (395, 235), (612, 235), (612, 520), (592, 768), (486, 768), (410, 505)
    ])) & a & (~m_head) & (~m_l_sode) & (~m_l_forearm) & (~m_r_sode) & (~m_r_forearm) & (~m_l_coat) & (~m_r_coat)

    m_l_foot = poly_mask(H, W, P([(312, 882), (425, 882), (425, 1008), (312, 1008)])) & a
    m_l_shin = poly_mask(H, W, P([(332, 680), (475, 680), (455, 892), (332, 892)])) & a & (~m_l_foot) & (~m_torso) & (~m_l_coat)
    m_l_thigh = poly_mask(H, W, P([(365, 555), (505, 555), (495, 705), (365, 705)])) & a & (~m_torso) & (~m_l_coat) & (~m_l_shin) & (~m_l_foot)

    m_r_foot = poly_mask(H, W, P([(550, 875), (712, 875), (712, 995), (550, 995)])) & a
    m_r_shin = poly_mask(H, W, P([(535, 682), (655, 682), (650, 885), (535, 885)])) & a & (~m_r_foot) & (~m_torso)
    m_r_thigh = poly_mask(H, W, P([(535, 560), (645, 560), (645, 705), (535, 705)])) & a & (~m_torso) & (~m_r_coat) & (~m_r_shin) & (~m_r_foot)

    masks = assign_remaining_geodesic(a, [
        ("mane", m_mane), ("head", m_head), ("torso", m_torso),
        ("l_coat", m_l_coat), ("r_coat", m_r_coat),
        ("l_sode", m_l_sode), ("l_forearm", m_l_forearm),
        ("r_sode", m_r_sode), ("r_forearm", m_r_forearm),
        ("l_thigh", m_l_thigh), ("l_shin", m_l_shin), ("l_foot", m_l_foot),
        ("r_thigh", m_r_thigh), ("r_shin", m_r_shin), ("r_foot", m_r_foot),
    ])
    return extract_parts_512(arr512, masks)


def draw_rune_halo_104(arr, nk_x, nk_y, radius=15.0, phase=0.0, grand=False):
    """
    Draws an Arcane Elder-Rune Sigil Halo floating behind Aethelgard's shoulders.
    """
    cx = nk_x - 3.0
    cy = nk_y + 3.0
    n_pts = 44 if grand else 32
    for i in range(n_pts):
        ang = (i / float(n_pts)) * 2.0 * math.pi + phase * 0.5
        px = cx + math.cos(ang) * radius
        py = cy + math.sin(ang) * (radius * 0.88)
        if grand or i % 2 == 0:
            col = C_CYAN_LIT if (i % 4 == 0) else C_CYAN_DEEP
            put_px(arr, px, py, col)

    # 6 orbiting Elder-Rune diamond nodes around the halo
    n_nodes = 8 if grand else 6
    for k in range(n_nodes):
        ang = (k / float(n_nodes)) * 2.0 * math.pi - phase * 0.65
        gx = cx + math.cos(ang) * radius
        gy = cy + math.sin(ang) * (radius * 0.88)
        put_px(arr, gx, gy, C_ICE_CORE if k % 2 == 0 else C_GOLD_SPEC)
        put_px(arr, gx + 1, gy, C_CYAN_LIT)
        put_px(arr, gx - 1, gy, C_CYAN_LIT)
        put_px(arr, gx, gy - 1, C_GOLD_LIT)
        put_px(arr, gx, gy + 1, C_GOLD_LIT)


def draw_runeblade_104(arr, hx, hy, blade_deg, blade_len=30.0, glow=1.0, phase=0.0):
    """
    Draws Aethelgard's Winged Frost-Runeblade Greatsword (matching portrait_hd2d_warrior_v3)
    with ornate winged gold crossguard, diamond rune core, dark cobalt fuller, and glowing
    cyan Elder Runes down the blade.
    """
    rad = math.radians(blade_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    nx, ny = -uy, ux

    pom_x, pom_y = hx - ux * 6.5, hy - uy * 6.5
    grd_x, grd_y = hx + ux * 2.8, hy + uy * 2.8
    draw_line_104(arr, pom_x, pom_y, grd_x, grd_y, C_STEEL_BASE, 2)
    # Diamond rune pommel
    put_px(arr, pom_x, pom_y, C_GOLD_SPEC)
    put_px(arr, pom_x - ux * 0.9, pom_y - uy * 0.9, C_CYAN_LIT)

    # Winged Gold & Rune-Crystal Crossguard
    for d in np.linspace(-5.0, 5.0, 15):
        wing = abs(d) * 0.34
        gx = grd_x + nx * d + ux * wing
        gy = grd_y + ny * d + uy * wing
        put_px(arr, gx, gy, C_GOLD_SPEC if abs(d) < 1.8 else C_GOLD_LIT)
        put_px(arr, gx - ux * 1.0, gy - uy * 1.0, C_GOLD_DARK)
    # Center guard Elder-Rune gem
    put_px(arr, grd_x, grd_y, C_ICE_CORE)
    put_px(arr, grd_x + ux * 1.0, grd_y + uy * 1.0, C_CYAN_LIT)

    # Broad Rune-Inscribed Greatsword Blade
    steps = int(blade_len * 2.5)
    for i in range(steps + 1):
        t = i / max(1, steps)
        dist = 3.2 + t * blade_len
        half_w = 2.35 * (1.0 - 0.74 * (t ** 2.3))
        bx = hx + ux * dist
        by = hy + uy * dist
        put_px(arr, bx - nx * half_w, by - ny * half_w, C_OUT)
        put_px(arr, bx + nx * half_w, by + ny * half_w, C_STEEL_SPEC)
        put_px(arr, bx - nx * (half_w * 0.52), by - ny * (half_w * 0.52), C_STEEL_BASE)
        put_px(arr, bx + nx * (half_w * 0.52), by + ny * (half_w * 0.52), C_STEEL_LIT)
        if t < 0.84:
            # Stepped glowing cyan Elder-Rune glyphs carved along the dark fuller!
            glyph = ((i + int(phase * 3)) % 5)
            if glow > 0.45 and glyph in (0, 1, 3):
                r_col = C_ICE_CORE if (glow > 0.85 and glyph == 0) else C_CYAN_LIT
                put_px(arr, bx, by, r_col)
                if glyph == 1 and half_w > 1.4:
                    put_px(arr, bx + nx * 0.7, by + ny * 0.7, C_CYAN_DEEP)
            else:
                put_px(arr, bx, by, C_STEEL_DARK)
        else:
            put_px(arr, bx, by, C_ICE_CORE if glow > 0.5 else C_STEEL_SPEC)


def draw_aegis_shield_104(arr, cx, cy):
    """
    Draws the Dark Cobalt & Gold Elder-Rune Aegis Greatshield for Row 6/7 guard frames.
    """
    for dy in range(-11, 13):
        t = (dy + 11) / 23.0
        hw = int(round(7.8 * (1.0 - max(0.0, t - 0.45) * 1.35)))
        for dx in range(-hw, hw + 1):
            px, py = cx + dx, cy + dy
            edge = (abs(dx) == hw) or (dy == -11) or (dy == 12)
            inner_rim = (abs(dx) == hw - 1) or (dy == -10)
            rune_cross = (abs(dx) <= 1 and abs(dy) <= 6) or (abs(dy) <= 1 and abs(dx) <= 4)
            rune_diag = (abs(abs(dx) - abs(dy)) <= 0 and 2 <= abs(dx) <= 4)
            if edge:
                col = C_OUT if dx < 0 or dy > 6 else C_GOLD_SPEC
            elif inner_rim:
                col = C_GOLD_LIT
            elif rune_cross or rune_diag:
                col = C_ICE_CORE if (abs(dx) <= 1 and abs(dy) <= 1) else C_CYAN_LIT
            else:
                col = C_STEEL_MID if dx > 0 else C_STEEL_DARK
            put_px(arr, px, py, col)


def draw_cyclone_ring_half_104(arr, cx, cy, rx, ry, spin_ang, is_front):
    """
    Draws either the rear half (sin(a) < 0) or front half (sin(a) >= 0) of a dense, solid
    3D-tilted 360-degree Horizontal Runic Whirlwind Crescent around Aethelgard during Row 3 Spin-Slash!
    """
    steps = 260
    for i in range(steps):
        a = (i / float(steps)) * 2.0 * math.pi
        sa = math.sin(a)
        if is_front and sa < -0.02:
            continue
        if (not is_front) and sa >= 0.02:
            continue

        # Angular distance behind the leading spinning blade tip at spin_ang
        rel = (spin_ang - a) % (2.0 * math.pi)
        if rel > 5.0:
            continue
        wake = 1.0 - (rel / 5.0)
        ca = math.cos(a)

        # Solid tapered horizontal crescent ribbon (thickest near leading blade tip, tapering around 300 deg)
        thick = 3.4 * (wake ** 0.75)
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
            put_px(arr, px, py, col)

        # Secondary upper runic vortex ring around chest height
        if wake > 0.35 and i % 2 == 0:
            ux = cx + math.cos(a + 0.55) * (rx * 0.74)
            uy = cy - 9.5 + math.sin(a + 0.55) * (ry * 0.72)
            if 7.0 <= ux <= 96.0:
                put_px(arr, ux, uy, C_ICE_CORE if wake > 0.72 else C_CYAN_LIT)


def extra_extents(joints_c, cfg, scale):
    pts = []
    if cfg.get("spin_slash", False):
        # Keep camera scale steady across the entire 360 spin-slash!
        p = joints_c["pelvis"]
        pts.append((p[0] - 42.0 / scale, p[1]))
        pts.append((p[0] + 42.0 / scale, p[1]))
        return pts
    if cfg.get("show_weapon", True):
        if cfg.get("planted_weapon", False):
            return pts
        h = joints_c["r_hand"]
        rad = math.radians(cfg.get("weapon_deg", -32.0))
        wlen = cfg.get("weapon_len", 30.0)
        pts.append((h[0] + math.cos(rad) * ((wlen + 5.0) / scale), h[1] + math.sin(rad) * ((wlen + 5.0) / scale)))
        pts.append((h[0] - math.cos(rad) * (8.5 / scale), h[1] - math.sin(rad) * (8.5 / scale)))
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
        # Rear half of 360 cyclone ring + Runeblade when orbiting behind torso!
        draw_cyclone_ring_half_104(bg, 52.0, pel[1] - 4.0, 38.0, 10.5, spin_ang, is_front=False)
        if math.sin(spin_ang) < 0.0:
            bx = 52.0 + math.cos(spin_ang) * 10.0
            by = pel[1] - 4.0 + math.sin(spin_ang) * 3.5
            b_deg = math.degrees(math.atan2(math.sin(spin_ang) * 10.5, math.cos(spin_ang) * 38.0))
            draw_runeblade_104(bg, bx, by, blade_deg=b_deg, blade_len=28.0, glow=1.0, phase=ph)


def draw_front(out, joints104, cfg):
    ph = cfg.get("mane_wave_phase", 0.0)

    if cfg.get("spin_slash", False):
        pel = joints104["pelvis"]
        spin_ang = cfg.get("spin_ang", 0.0)
        # If Runeblade is on the front half of the 360 orbit, draw it in front of the armor!
        if math.sin(spin_ang) >= 0.0:
            bx = 52.0 + math.cos(spin_ang) * 10.0
            by = pel[1] - 4.0 + math.sin(spin_ang) * 3.5
            b_deg = math.degrees(math.atan2(math.sin(spin_ang) * 10.5, math.cos(spin_ang) * 38.0))
            draw_runeblade_104(out, bx, by, blade_deg=b_deg, blade_len=28.0, glow=1.0, phase=ph)
        draw_cyclone_ring_half_104(out, 52.0, pel[1] - 4.0, 38.0, 10.5, spin_ang, is_front=True)
        return

    if cfg.get("show_weapon", True):
        if cfg.get("planted_weapon", False):
            draw_runeblade_104(
                out, cfg.get("plant_x", 81.0), cfg.get("plant_y", 66.5),
                blade_deg=89.0, blade_len=27.0, glow=cfg.get("weapon_glow", 0.5), phase=ph
            )
        else:
            rh = joints104["r_hand"]
            draw_runeblade_104(
                out, rh[0], rh[1],
                blade_deg=cfg.get("weapon_deg", -32.0),
                blade_len=cfg.get("weapon_len", 30.0),
                glow=cfg.get("weapon_glow", 1.0),
                phase=ph,
            )

    if cfg.get("shield_active", False):
        lh = joints104["l_hand"]
        draw_aegis_shield_104(out, lh[0] + 6.0, lh[1] - 2.0)

    if cfg.get("slash_arc") is not None:
        sa = cfg["slash_arc"]
        nk = joints104["neck"]
        draw_slash_arc_104(
            out, nk[0] + sa.get("dx", 6.0), nk[1] + sa.get("dy", 10.0),
            sa.get("r", 28.0), sa["a0"], sa["a1"],
            C_ICE_CORE, C_CYAN_LIT, C_CYAN_DEEP, intensity=sa.get("intensity", 1.0),
        )

    if cfg.get("x_slash", False):
        nk = joints104["neck"]
        cx, cy = min(78.0, nk[0] + 20.0), min(74.0, nk[1] + 12.0)
        for ang in (-34.0, 34.0):
            rad = math.radians(ang)
            for d in np.linspace(-20.0, 20.0, 48):
                put_px(out, cx + math.cos(rad) * d, cy + math.sin(rad) * d, C_ICE_CORE)
                put_px(out, cx + math.cos(rad) * d, cy + math.sin(rad) * d + 1.0, C_CYAN_LIT)

    if cfg.get("blink_pillars", False):
        # Vertical Elder-Rune teleportation light-threads framing Aethelgard on blink vanish/arrival!
        nk = joints104["neck"]
        for k, ox in enumerate((-16.0, -9.0, 10.0, 17.0)):
            lx = max(8.0, min(95.0, nk[0] + ox))
            y0 = 12.0 + (k * 7) % 14
            y1 = min(96.0, y0 + 58.0)
            draw_line_104(out, lx, y0, lx, y1, C_ICE_CORE if k % 2 == 0 else C_CYAN_LIT, 1)

    if cfg.get("speedlines", 0) > 0:
        for k in range(cfg["speedlines"]):
            ly = 28.0 + (k * 12 + int(ph * 5)) % 52
            lx0 = 6.0 + (k * 7 + int(ph * 9)) % 16
            draw_line_104(out, lx0, ly, lx0 + 13.0, ly, C_CYAN_LIT if k % 2 == 0 else C_GOLD_SPEC, 1)


def apply_back_turn_armor_104(body_arr104, mirror_x=False):
    """
    Transforms the posed 104x104 character body into a genuine back-facing Rune-Knight view
    during the rear half of the 360-degree Spin-Slash (converting front T-visor & chest crystal
    pixels into dark cobalt back-helm / back-plate armor with a gold dorsal spine & glowing back-rune).
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

    # Convert front-only bright visor & chest crystal (y = 14..58) into dorsal cobalt plate
    a = out[:, :, 3] > 0
    ys, xs = np.where(a)
    if len(ys) == 0:
        return out
    y_top = int(ys.min())
    cx = int(round(np.mean(xs)))

    for y in range(max(4, y_top + 6), min(98, y_top + 48)):
        row_xs = np.where(a[y])[0]
        if len(row_xs) < 4:
            continue
        x0, x1 = int(row_xs.min()) + 1, int(row_xs.max()) - 1
        for x in range(x0, x1 + 1):
            r, g, b, _ = out[y, x]
            # Bright cyan/white front visor or chest crystal -> back-plate cobalt steel
            if b > 195 and g > 175:
                out[y, x] = C_STEEL_BASE if ((x + y) % 3 != 0) else C_STEEL_DARK

    # Paint a crisp gold dorsal armor spine + glowing cyan back-plate Elder-Rune sigil!
    spine_y0 = max(8, y_top + 22)
    spine_y1 = min(92, y_top + 44)
    for y in range(spine_y0, spine_y1):
        if a[y, cx]:
            out[y, cx] = C_GOLD_LIT if (y % 3 != 0) else C_GOLD_DARK
        if y in (spine_y0 + 5, spine_y0 + 6, spine_y0 + 9) and 4 <= cx - 2 and cx + 2 <= 99:
            if a[y, cx - 1]:
                out[y, cx - 1] = C_CYAN_LIT
            if a[y, cx + 1]:
                out[y, cx + 1] = C_CYAN_LIT
    if spine_y0 + 7 < 98 and a[spine_y0 + 7, cx]:
        out[spine_y0 + 7, cx] = C_ICE_CORE
    return out


DEFAULTS = dict(
    pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=3.0, head_rel_deg=-1.5, mane_rel_deg=-4.0,
    mane_wave_amp=6.0, l_thigh_deg=-2.0, l_shin_deg=2.0, l_foot_deg=0.0,
    r_thigh_deg=2.0, r_shin_deg=-2.0, r_foot_deg=0.0,
    l_sode_rel_deg=-6.0, l_fore_rel_deg=-14.0, r_sode_rel_deg=-16.0, r_fore_rel_deg=-18.0,
    l_coat_rel_deg=0.0, r_coat_rel_deg=0.0,
    weapon_deg=-32.0, weapon_len=30.0, weapon_glow=1.0, foot_y=99.0,
    show_weapon=True, right_arm_in_front=False, right_leg_behind=False,
    halo_active=False,
)


def render_frame(parts, cfg):
    if cfg.get("spin_slash", False):
        # Render body first without front/back cyclone so back-turn yaw can transform the body cleanly!
        body_cfg = dict(cfg)
        body_cfg["show_weapon"] = False
        body_cfg["spin_slash"] = True
        # Step 1: get clean quantized body + joints via custom hook
        captured = {}

        def cap_back(bg, joints104, _c):
            captured["joints104"] = joints104

        body_only = render_rig_104(
            parts, PIVOTS, body_cfg, PALETTE_CFG,
            y_bot_base=500.0, default_S=604,
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
        y_bot_base=500.0, default_S=604,
        extra_extent_fn=extra_extents, draw_back_fn=draw_back, draw_front_fn=draw_front,
    )


def build_row_configs(row_idx):
    cfgs = []
    for f in range(COLS):
        t = f / float(COLS)
        ph = 2.0 * math.pi * t

        if row_idx == 0:
            # Row 0: IDLE (Rune Knight Poise, Breathing Plate, Flowing Plume, Pulsing Runeblade)
            b = math.sin(ph)
            s = math.cos(ph)
            cfg = dict(DEFAULTS)
            cfg.update(
                pelvis_dx=s * 3.0, pelvis_dy=b * 8.0, torso_deg=3.0 + b * 1.8,
                head_rel_deg=-1.5 - b * 1.2, mane_rel_deg=-4.0 + s * 3.5,
                mane_wave_phase=ph, weapon_deg=-32.0 + b * 3.0,
                weapon_glow=0.82 + 0.18 * b,
            )
            cfgs.append(cfg)

        elif row_idx == 1:
            # Row 1: WALK (Heavy Armored Rune-Knight Stride)
            st = math.sin(ph)
            kl = math.cos(ph)
            cfg = dict(DEFAULTS)
            cfg.update(
                pelvis_dy=abs(st) * 20.0, torso_deg=8.0 + abs(st) * 2.2, head_rel_deg=-4.0,
                mane_rel_deg=-8.0 - abs(st) * 4.0, mane_wave_phase=ph * 2.0, mane_wave_amp=8.0,
                right_leg_behind=(f >= 15),
                l_thigh_deg=st * 26.0, l_shin_deg=max(0.0, st * 28.0) + max(0.0, kl * 14.0), l_foot_deg=st * 12.0,
                r_thigh_deg=-st * 26.0, r_shin_deg=max(0.0, -st * 28.0) + max(0.0, -kl * 14.0), r_foot_deg=-st * 12.0,
                l_sode_rel_deg=-st * 20.0, l_fore_rel_deg=-18.0 - abs(st) * 7.0,
                r_sode_rel_deg=st * 16.0 - 10.0, r_fore_rel_deg=-16.0 + st * 5.0,
                weapon_deg=-26.0 + st * 8.0,
            )
            cfgs.append(cfg)

        elif row_idx == 2:
            # Row 2: AUTO_ATTACK (Overhead 2H Frost-Runeblade Coil -> Cleave 1 -> Cross-Cleave 2 -> Recovery)
            kfs = [
                (0, dict(torso_deg=3.0, weapon_deg=-32.0)),
                (7, dict(pelvis_dx=-12.0, pelvis_dy=38.0, torso_deg=-14.0, head_rel_deg=8.0,
                         l_thigh_deg=-20.0, l_shin_deg=18.0, r_thigh_deg=18.0, r_shin_deg=-14.0,
                         l_sode_rel_deg=-64.0, l_fore_rel_deg=-34.0, r_sode_rel_deg=-98.0, r_fore_rel_deg=-28.0,
                         weapon_deg=-124.0, right_arm_in_front=True, halo_active=True)),
                (13, dict(pelvis_dx=14.0, pelvis_dy=52.0, torso_deg=24.0, head_rel_deg=-12.0,
                          l_thigh_deg=24.0, l_shin_deg=16.0, r_thigh_deg=-26.0, r_shin_deg=18.0,
                          l_sode_rel_deg=20.0, l_fore_rel_deg=-20.0, r_sode_rel_deg=28.0, r_fore_rel_deg=-8.0,
                          weapon_deg=26.0, right_arm_in_front=True, halo_active=True)),
                (17, dict(pelvis_dx=4.0, pelvis_dy=40.0, torso_deg=8.0,
                          l_thigh_deg=14.0, l_shin_deg=12.0, r_thigh_deg=-16.0, r_shin_deg=14.0,
                          l_sode_rel_deg=-24.0, r_sode_rel_deg=-52.0, weapon_deg=-58.0, right_arm_in_front=True)),
                (22, dict(pelvis_dx=12.0, pelvis_dy=48.0, torso_deg=22.0, head_rel_deg=-10.0,
                          l_thigh_deg=22.0, l_shin_deg=16.0, r_thigh_deg=-24.0, r_shin_deg=16.0,
                          l_sode_rel_deg=18.0, r_sode_rel_deg=22.0, weapon_deg=16.0, right_arm_in_front=True)),
                (29, dict(torso_deg=3.0, weapon_deg=-32.0)),
            ]
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.0)
            if 9 <= f <= 14:
                u = (f - 9) / 5.0
                cfg["slash_arc"] = dict(r=29.0, a0=-85.0 + 25.0 * u, a1=42.0 + 18.0 * u, intensity=1.15)
            elif 19 <= f <= 23:
                u = (f - 19) / 4.0
                cfg["slash_arc"] = dict(r=27.0, a0=-52.0 + 15.0 * u, a1=38.0 + 14.0 * u, intensity=1.05)
            cfgs.append(cfg)

        elif row_idx == 3:
            # Row 3: SKILL (TEMPEST VANGUARD)
            # F00..F02: Grounded Runic Windup Coil
            # F03..F17: 2.5-Revolution 360-Degree Whirlwind Spin-Slash (6 frames per full 360 spin!)
            # F18..F25: Leaping Overhead Thunder-Breaker Greatsword Slam!
            # F26..F29: Recovery to Rune Knight Guard
            if f <= 2:
                u = f / 2.0
                cfg = dict(DEFAULTS)
                cfg.update(
                    pelvis_dx=-10.0 * u, pelvis_dy=48.0 * u, torso_deg=3.0 - 14.0 * u,
                    l_thigh_deg=-22.0 * u, l_shin_deg=22.0 * u,
                    r_thigh_deg=20.0 * u, r_shin_deg=-16.0 * u,
                    l_sode_rel_deg=-36.0 * u, r_sode_rel_deg=-58.0 * u,
                    weapon_deg=-32.0 - 118.0 * u, right_arm_in_front=True,
                    halo_active=(f >= 1), mane_wave_phase=ph * 3.0, foot_y=99.0,
                )
                cfgs.append(cfg)
            elif 3 <= f <= 17:
                # 15 frames = 2.5 full 360-degree revolutions (6 frames per 360 turn!)
                step6 = (f - 3) % 6
                spin_ang = ((f - 3) / 6.0) * 2.0 * math.pi + 0.35
                # Pose silhouette shifts across the 6 yaw octants of each 360 spin!
                yaw_poses = [
                    # 0: Front-right slash extension (+0 deg yaw)
                    dict(pelvis_dx=4.0, pelvis_dy=38.0, torso_deg=14.0, l_thigh_deg=-20.0, l_shin_deg=20.0,
                         r_thigh_deg=22.0, r_shin_deg=-14.0, l_sode_rel_deg=-38.0, r_sode_rel_deg=32.0,
                         r_fore_rel_deg=-6.0, right_arm_in_front=True, back_turn=False, mirror_yaw=False),
                    # 1: Turning away across front (+60 deg yaw)
                    dict(pelvis_dx=0.0, pelvis_dy=34.0, torso_deg=6.0, l_thigh_deg=-10.0, l_shin_deg=16.0,
                         r_thigh_deg=12.0, r_shin_deg=-10.0, l_sode_rel_deg=24.0, r_sode_rel_deg=10.0,
                         right_arm_in_front=True, back_turn=False, mirror_yaw=False),
                    # 2: Back-left 3/4 armor view (+120 deg yaw)
                    dict(pelvis_dx=-2.0, pelvis_dy=36.0, torso_deg=10.0, l_thigh_deg=18.0, l_shin_deg=18.0,
                         r_thigh_deg=-18.0, r_shin_deg=14.0, l_sode_rel_deg=30.0, r_sode_rel_deg=-28.0,
                         mane_in_front=True, right_leg_behind=True, back_turn=True, mirror_yaw=False),
                    # 3: Back-right mirrored armor view (+200 deg yaw)
                    dict(pelvis_dx=2.0, pelvis_dy=36.0, torso_deg=12.0, l_thigh_deg=18.0, l_shin_deg=18.0,
                         r_thigh_deg=-18.0, r_shin_deg=14.0, l_sode_rel_deg=34.0, r_sode_rel_deg=-24.0,
                         mane_in_front=True, right_leg_behind=True, back_turn=True, mirror_yaw=True),
                    # 4: Side profile whipping around (+270 deg yaw)
                    dict(pelvis_dx=-4.0, pelvis_dy=40.0, torso_deg=-8.0, l_thigh_deg=-14.0, l_shin_deg=18.0,
                         r_thigh_deg=14.0, r_shin_deg=-12.0, l_sode_rel_deg=-44.0, r_sode_rel_deg=-52.0,
                         right_arm_in_front=False, back_turn=False, mirror_yaw=False),
                    # 5: Whipping back to front-right cleave (+330 deg yaw)
                    dict(pelvis_dx=6.0, pelvis_dy=42.0, torso_deg=18.0, l_thigh_deg=20.0, l_shin_deg=18.0,
                         r_thigh_deg=-22.0, r_shin_deg=16.0, l_sode_rel_deg=18.0, r_sode_rel_deg=36.0,
                         right_arm_in_front=True, back_turn=False, mirror_yaw=False),
                ]
                cfg = dict(DEFAULTS)
                cfg.update(yaw_poses[step6])
                cfg.update(
                    spin_slash=True, spin_ang=spin_ang, halo_active=True, halo_r=16.5,
                    mane_wave_phase=spin_ang, mane_wave_amp=9.5, foot_y=98.0,
                )
                cfgs.append(cfg)
            else:
                # F18..F29: Leaping Thunder-Breaker Overhead Slam -> Recovery
                slam_kfs = [
                    (18, dict(pelvis_dx=4.0, pelvis_dy=18.0, torso_deg=-18.0, head_rel_deg=10.0,
                              l_thigh_deg=22.0, l_shin_deg=32.0, r_thigh_deg=-16.0, r_shin_deg=24.0,
                              l_sode_rel_deg=-80.0, r_sode_rel_deg=-116.0, r_fore_rel_deg=-24.0,
                              weapon_deg=-134.0, foot_y=93.0, right_arm_in_front=True, halo_active=True)),
                    (21, dict(pelvis_dx=18.0, pelvis_dy=66.0, torso_deg=30.0, head_rel_deg=-14.0,
                              l_thigh_deg=-28.0, l_shin_deg=30.0, r_thigh_deg=28.0, r_shin_deg=-22.0,
                              l_sode_rel_deg=28.0, r_sode_rel_deg=36.0, r_fore_rel_deg=-6.0,
                              weapon_deg=34.0, foot_y=99.0, right_arm_in_front=True, halo_active=True)),
                    (24, dict(pelvis_dx=16.0, pelvis_dy=62.0, torso_deg=26.0, head_rel_deg=-10.0,
                              l_thigh_deg=-24.0, l_shin_deg=26.0, r_thigh_deg=24.0, r_shin_deg=-18.0,
                              l_sode_rel_deg=24.0, r_sode_rel_deg=30.0, weapon_deg=28.0,
                              foot_y=99.0, right_arm_in_front=True, halo_active=True)),
                    (29, dict(torso_deg=3.0, weapon_deg=-32.0, foot_y=99.0, halo_active=False)),
                ]
                cfg = eval_pose_keyframes(f, slam_kfs, ph, DEFAULTS, wave_mult=3.0)
                if 20 <= f <= 24:
                    u = (f - 20) / 4.0
                    cfg["slash_arc"] = dict(dx=0.5, dy=11.0, r=29.0, a0=-104.0 + 22.0 * u, a1=50.0 + 12.0 * u, intensity=1.28)
                cfgs.append(cfg)

        elif row_idx == 4:
            # Row 4: ULTIMATE (HEAVENLY EARTHSHATTER — Left/Right Rune-Blink Omnislash -> TOP Sky Charge -> Top-Down Plunge Slash!)
            # F00..F02 (0.00..0.18s): Elder-Rune Awakening & Blink Vanish
            # F03..F07 (0.18..0.49s): Teleport LEFT -> Wide Horizontal Cleave
            # F08..F12 (0.49..0.80s): Teleport RIGHT -> Reverse Rising Cross-Cleave
            # F13..F16 (0.80..1.05s): Teleport FLANK -> Heavy Forward Launch Slash
            # F17..F21 (1.05..1.36s): Teleport TOP (Mid-Air Above Enemy!) -> Two-Handed Overhead Heavenly Rune Charge!
            # F22..F26 (1.36..1.67s): Meteoric Top-Down Vertical Plunge Slash & Earthshatter Impact!
            # F27..F29 (1.67..1.86s): Rune Knight Recovery
            kfs = [
                (0, dict(pelvis_dy=40.0, torso_deg=-8.0, head_rel_deg=6.0,
                         l_sode_rel_deg=-36.0, r_sode_rel_deg=-64.0, weapon_deg=-72.0,
                         foot_y=99.0, right_arm_in_front=True, halo_active=True)),
                (2, dict(pelvis_dy=52.0, torso_deg=-14.0, l_thigh_deg=-22.0, l_shin_deg=24.0,
                         r_thigh_deg=20.0, r_shin_deg=-18.0, r_sode_rel_deg=-88.0, weapon_deg=-118.0,
                         foot_y=99.0, right_arm_in_front=True, halo_active=True)),
                # Teleport 1 (LEFT): Horizontal Cleave
                (3, dict(pelvis_dx=-8.0, pelvis_dy=44.0, torso_deg=-10.0, r_sode_rel_deg=-78.0,
                         weapon_deg=-96.0, foot_y=99.0, right_arm_in_front=True, halo_active=True, speedlines=4)),
                (5, dict(pelvis_dx=16.0, pelvis_dy=48.0, torso_deg=24.0, head_rel_deg=-12.0,
                         l_thigh_deg=24.0, l_shin_deg=20.0, r_thigh_deg=-26.0, r_shin_deg=20.0,
                         l_sode_rel_deg=22.0, r_sode_rel_deg=32.0, r_fore_rel_deg=-6.0,
                         weapon_deg=18.0, foot_y=99.0, right_arm_in_front=True, halo_active=True, speedlines=5)),
                (7, dict(pelvis_dx=12.0, pelvis_dy=46.0, torso_deg=18.0, weapon_deg=10.0,
                         foot_y=99.0, right_arm_in_front=True, halo_active=True)),
                # Teleport 2 (RIGHT): Low Coil -> Reverse Rising Cross-Slash!
                (8, dict(pelvis_dx=-6.0, pelvis_dy=54.0, torso_deg=18.0, r_sode_rel_deg=26.0,
                         weapon_deg=44.0, foot_y=99.0, right_arm_in_front=True, halo_active=True, speedlines=4)),
                (10, dict(pelvis_dx=10.0, pelvis_dy=34.0, torso_deg=-12.0, head_rel_deg=8.0,
                          l_thigh_deg=-20.0, l_shin_deg=20.0, r_thigh_deg=22.0, r_shin_deg=-16.0,
                          l_sode_rel_deg=-58.0, r_sode_rel_deg=-92.0, r_fore_rel_deg=-18.0,
                          weapon_deg=-82.0, foot_y=99.0, right_arm_in_front=True, halo_active=True, speedlines=5)),
                (12, dict(pelvis_dx=6.0, pelvis_dy=36.0, torso_deg=-6.0, r_sode_rel_deg=-76.0,
                          weapon_deg=-68.0, foot_y=99.0, right_arm_in_front=True, halo_active=True)),
                # Teleport 3 (FLANK): Heavy Launching Cross-Thrust/Cleave!
                (13, dict(pelvis_dx=-8.0, pelvis_dy=46.0, torso_deg=-8.0, r_sode_rel_deg=-64.0,
                          weapon_deg=-88.0, foot_y=99.0, right_arm_in_front=True, halo_active=True)),
                (15, dict(pelvis_dx=18.0, pelvis_dy=50.0, torso_deg=26.0, head_rel_deg=-12.0,
                          l_thigh_deg=26.0, l_shin_deg=22.0, r_thigh_deg=-26.0, r_shin_deg=20.0,
                          l_sode_rel_deg=24.0, r_sode_rel_deg=34.0, r_fore_rel_deg=-4.0,
                          weapon_deg=6.0, foot_y=99.0, right_arm_in_front=True, halo_active=True, speedlines=5)),
                # Teleport 4 (TOP — Directly Above Enemy in Mid-Air!): Hovering Overhead Rune Charge!
                (17, dict(pelvis_dx=0.0, pelvis_dy=10.0, torso_deg=-16.0, head_rel_deg=14.0,
                          l_thigh_deg=28.0, l_shin_deg=42.0, r_thigh_deg=-16.0, r_shin_deg=34.0,
                          l_sode_rel_deg=-86.0, l_fore_rel_deg=-26.0, r_sode_rel_deg=-122.0, r_fore_rel_deg=-22.0,
                          weapon_deg=-128.0, weapon_len=31.0, foot_y=91.0,
                          right_arm_in_front=True, halo_active=True)),
                (21, dict(pelvis_dx=2.0, pelvis_dy=6.0, torso_deg=-22.0, head_rel_deg=18.0,
                          l_thigh_deg=32.0, l_shin_deg=44.0, r_thigh_deg=-18.0, r_shin_deg=36.0,
                          l_sode_rel_deg=-94.0, l_fore_rel_deg=-28.0, r_sode_rel_deg=-128.0, r_fore_rel_deg=-20.0,
                          weapon_deg=-134.0, weapon_len=31.0, foot_y=90.0,
                          right_arm_in_front=True, halo_active=True)),
                # Meteoric Top-Down Vertical Slash Plunge & Ground Impact!
                (23, dict(pelvis_dx=14.0, pelvis_dy=24.0, torso_deg=32.0, head_rel_deg=-8.0,
                          l_thigh_deg=24.0, l_shin_deg=30.0, r_thigh_deg=-22.0, r_shin_deg=26.0,
                          l_sode_rel_deg=34.0, r_sode_rel_deg=46.0, r_fore_rel_deg=-4.0,
                          weapon_deg=66.0, weapon_len=31.0, foot_y=94.0,
                          right_arm_in_front=True, halo_active=True)),
                (25, dict(pelvis_dx=18.0, pelvis_dy=68.0, torso_deg=30.0, head_rel_deg=-16.0,
                          l_thigh_deg=-30.0, l_shin_deg=32.0, r_thigh_deg=28.0, r_shin_deg=-22.0,
                          l_sode_rel_deg=28.0, r_sode_rel_deg=38.0, r_fore_rel_deg=-6.0,
                          weapon_deg=42.0, foot_y=99.0, right_arm_in_front=True, halo_active=True)),
                (29, dict(torso_deg=3.0, weapon_deg=-32.0, foot_y=99.0, halo_active=False)),
            ]
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.5)
            cfg["halo_grand"] = (17 <= f <= 25)
            if f in (2, 3, 8, 13, 17):
                cfg["blink_pillars"] = True
            if 4 <= f <= 6:
                cfg["slash_arc"] = dict(dx=2.0, r=28.0, a0=-65.0, a1=42.0, intensity=1.18)
            elif 9 <= f <= 11:
                cfg["slash_arc"] = dict(dx=2.0, r=28.0, a0=-98.0, a1=18.0, intensity=1.18)
                if f == 10:
                    cfg["x_slash"] = True
            elif 14 <= f <= 16:
                cfg["slash_arc"] = dict(dx=1.5, r=28.5, a0=-48.0, a1=48.0, intensity=1.22)
                if f == 15:
                    cfg["x_slash"] = True
            elif 22 <= f <= 26:
                cfg["slash_arc"] = dict(dx=0.0, dy=12.0, r=29.0, a0=-96.0, a1=76.0, intensity=1.32)
                if f in (23, 24):
                    cfg["x_slash"] = True
            cfgs.append(cfg)

        elif row_idx == 5:
            # Row 5: DEATH (Prone Knight Collapse with Planted Runeblade — halo strictly off!)
            kfs = make_prone_knight_death_kfs(idle_weapon_deg=-32.0, plant_x=81.0, plant_y=66.5, use_planted_weapon=True)
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, extra_meta_keys=("plant_x", "plant_y"), wave_mult=1.0)
            cfg["halo_active"] = False
            cfgs.append(cfg)

        elif row_idx == 6:
            # Row 6: DASH (Runic Vanguard Aegis Shoulder-Charge Rush!)
            kfs = [
                (0, dict(torso_deg=6.0, weapon_deg=-28.0, foot_y=99.0)),
                (7, dict(pelvis_dx=12.0, pelvis_dy=38.0, torso_deg=26.0, head_rel_deg=-14.0, mane_rel_deg=-24.0,
                         l_thigh_deg=28.0, l_shin_deg=32.0, r_thigh_deg=-24.0, r_shin_deg=22.0,
                         l_sode_rel_deg=22.0, r_sode_rel_deg=-36.0, weapon_deg=-152.0,
                         shield_active=True, halo_active=True, speedlines=5, foot_y=99.0)),
                (22, dict(pelvis_dx=12.0, pelvis_dy=38.0, torso_deg=26.0, head_rel_deg=-14.0, mane_rel_deg=-24.0,
                          l_thigh_deg=28.0, l_shin_deg=32.0, r_thigh_deg=-24.0, r_shin_deg=22.0,
                          l_sode_rel_deg=22.0, r_sode_rel_deg=-36.0, weapon_deg=-152.0,
                          shield_active=True, halo_active=True, speedlines=5, foot_y=99.0)),
                (29, dict(torso_deg=6.0, weapon_deg=-28.0, foot_y=99.0)),
            ]
            cfgs.append(eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.0))

        elif row_idx == 7:
            # Row 7: CROUCH (Elder-Rune Aegis Greatshield Brace -> Low Frost-Crescent Counter-Slash!)
            kfs = [
                (0, dict(torso_deg=3.0, weapon_deg=-32.0)),
                (5, dict(pelvis_dx=-8.0, pelvis_dy=68.0, torso_deg=12.0, head_rel_deg=-8.0,
                         l_thigh_deg=-30.0, l_shin_deg=32.0, r_thigh_deg=28.0, r_shin_deg=-24.0,
                         l_sode_rel_deg=26.0, l_fore_rel_deg=-28.0, r_sode_rel_deg=-48.0,
                         weapon_deg=-128.0, shield_active=True, halo_active=True)),
                (12, dict(pelvis_dx=-8.0, pelvis_dy=70.0, torso_deg=10.0,
                          l_thigh_deg=-30.0, l_shin_deg=32.0, r_thigh_deg=28.0, r_shin_deg=-24.0,
                          l_sode_rel_deg=28.0, l_fore_rel_deg=-26.0, r_sode_rel_deg=-58.0,
                          weapon_deg=-88.0, shield_active=True, halo_active=True, right_arm_in_front=True)),
                (17, dict(pelvis_dx=14.0, pelvis_dy=64.0, torso_deg=22.0, head_rel_deg=-12.0,
                          l_thigh_deg=-24.0, l_shin_deg=26.0, r_thigh_deg=24.0, r_shin_deg=-20.0,
                          l_sode_rel_deg=-18.0, r_sode_rel_deg=24.0, r_fore_rel_deg=-8.0,
                          weapon_deg=14.0, shield_active=False, halo_active=True, right_arm_in_front=True)),
                (29, dict(torso_deg=3.0, weapon_deg=-32.0)),
            ]
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.0)
            if 14 <= f <= 19:
                cfg["slash_arc"] = dict(r=27.0, a0=-45.0, a1=38.0, intensity=1.1, dy=16.0)
            cfgs.append(cfg)

        elif row_idx == 8:
            # Row 8: JUMP (Runic Vault + Apex Downward Frost-Greatsword Cleave!)
            kfs = [
                (0, dict(torso_deg=3.0, weapon_deg=-32.0, foot_y=99.0)),
                (4, dict(pelvis_dy=56.0, torso_deg=14.0, l_thigh_deg=-26.0, l_shin_deg=28.0,
                         r_thigh_deg=24.0, r_shin_deg=-22.0, weapon_deg=-48.0, foot_y=99.0)),
                (11, dict(pelvis_dx=6.0, pelvis_dy=14.0, torso_deg=-10.0,
                          l_thigh_deg=24.0, l_shin_deg=38.0, r_thigh_deg=-14.0, r_shin_deg=30.0,
                          r_sode_rel_deg=-96.0, weapon_deg=-118.0, foot_y=94.0,
                          right_arm_in_front=True, halo_active=True)),
                (16, dict(pelvis_dx=10.0, pelvis_dy=18.0, torso_deg=22.0,
                          l_thigh_deg=26.0, l_shin_deg=34.0, r_thigh_deg=-12.0, r_shin_deg=26.0,
                          r_sode_rel_deg=26.0, weapon_deg=28.0, foot_y=95.0,
                          right_arm_in_front=True, halo_active=True)),
                (24, dict(pelvis_dy=50.0, torso_deg=14.0, l_thigh_deg=-22.0, l_shin_deg=24.0,
                          r_thigh_deg=20.0, r_shin_deg=-18.0, weapon_deg=-18.0, foot_y=99.0)),
                (29, dict(torso_deg=3.0, weapon_deg=-32.0, foot_y=99.0)),
            ]
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.5)
            if 13 <= f <= 17:
                cfg["slash_arc"] = dict(r=29.0, a0=-78.0, a1=46.0, intensity=1.15)
            cfgs.append(cfg)

    return cfgs


def main():
    parts = load_and_segment_512()
    picks = [
        (0, 0, "R0 RUNE KNIGHT GUARD"),
        (1, 4, "R1 RUNIC STRIDE"),
        (2, 12, "R2 RUNEBLADE CLEAVE"),
        (3, 5, "R3 360 SPIN-SLASH"),
        (3, 21, "R3 THUNDER SLAM"),
        (4, 10, "R4 RUNE OMNISLASH"),
        (4, 19, "R4 SKY TOP CHARGE"),
        (4, 23, "R4 TOP-DOWN SLASH"),
    ]
    build_and_save_30fps_sheet(
        "warrior", parts, build_row_configs, render_frame,
        OUT_SHEET_PATH, VFX_SHEET_PATH, ARTIFACT_DIR,
        shimmer_cols=(C_CYAN_LIT, C_GOLD_SPEC), showcase_picks=picks,
    )


if __name__ == "__main__":
    main()
