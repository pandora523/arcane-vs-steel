#!/usr/bin/env python3
"""
Builds Malakor v5 (Reaper — Gothic Arch-Reaper & Sovereign of Severed Souls)
30fps HD-2D Sprite Sheet (`assets/sprites/reaper_sheet.png`, 6240x1872, 30 cols x 9 rows of 208x208)
using `assets/sprites/reaper_v5_base.jpg` + `hd2d_rig_core`.

Key Features:
- Extracts from `assets/sprites/reaper_v5_base.jpg` (`1024x1024`) via BFS exterior + protected interior
  pocket white removal (preserving 100% of the stark white skull visage & silver-bone crown), 3-pass
  anti-aliased fringe stripping, and multi-zone `MedianFilter` cel-flattening.
- Clean 14-part Gothic Arch-Reaper Sovereign skeletal rig (`0` unassigned foreground pixels):
  * `head`: crimson-rimmed obsidian hood, sweeping silver-bone crown horns & stark white skull visage
  * `torso`: sculpted pale-ivory ribcage cuirass, blazing magenta-crimson sternum soul-core & silver belt
  * `l_coat` / `r_coat`: twin crimson-lined obsidian waist tassets pivoting naturally with hips
  * `l_sode`, `l_forearm` / `r_sode`, `r_forearm`: spiked silver gothic pauldrons, vambraces & gauntlets
  * `l_thigh`, `l_shin`, `l_foot` / `r_thigh`, `r_shin`, `r_foot`: articulated silver-steel greaves & boots
- Curated 20-color High-Contrast Ivory-Bone / Silver-Steel / Obsidian / Crimson-Magenta `MASTER_PALETTE`
  + 2-pass cardinal orphan despeckle + interior pinhole fill + 1px dark directional Selout outline.
- Back attachment: Streaming **Tattered Wraith Ribbons**, **Twin Bone-Scythe Halo**, & **Ferryman's Soul-Lantern**.
- Articulated 2H weapon: **Cursed Eclipse Great-Scythe ("Thanatos")** with per-frame 2-Bone Analytical IK
  locking both gauntlets cleanly onto the snath across figure-8 reaps, soul-sever chain yanks, overhead
  guillotines, wraith rushes, rising uppercuts, aerial vaults, and prone floor rest (`0` baked floor rings!).
- Grounded boots planted at `y_104 = 99`, `0/270` border clips, `29/29` distinct frame transitions per row.
"""

import os
import math
from collections import deque
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from hd2d_rig_core import (
    COLS, P, BASE_NUMERIC_KEYS, poly_mask, keep_largest_component,
    assign_remaining_geodesic, extract_parts_512, rot_pt,
    draw_line_104, draw_slash_arc_104, render_rig_104,
    make_prone_knight_death_kfs, eval_pose_keyframes, build_and_save_30fps_sheet,
)

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ARTIFACT_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/3a4b2cf8-05c2-45a3-bb65-af6f5b5a1088"

BASE_IMG_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "reaper_v5_base.jpg")
OUT_SHEET_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "reaper_sheet.png")
VFX_SHEET_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "reaper_vfx.png")

# Strict 20-Color High-Contrast Ivory-Bone / Silver-Steel / Obsidian / Crimson-Magenta Master Palette
MASTER_PALETTE = np.array([
    [7, 5, 13],       # 0: Deep Abyssal Void Outline (#07050d)
    [23, 18, 36],     # 1: Dark Obsidian-Slate Selout (#171224)
    [36, 31, 51],     # 2: Deep Obsidian Hood & Tasset Shadow (#241f33)
    [55, 49, 74],     # 3: Lit Obsidian Wraith Cloth (#37314a)
    [76, 72, 99],     # 4: Forged Steel Plate Shadow (#4c4863)
    [115, 112, 140],  # 5: Gothic Silver-Steel Midtone (#73708c)
    [164, 163, 189],  # 6: Lit Polished Silver Plate (#a4a3bd)
    [214, 216, 235],  # 7: Specular Silver Armor Rim (#d6d8eb)
    [110, 98, 89],    # 8: Deep Skull Suture & Horn Shadow (#6e6259)
    [163, 147, 132],  # 9: Aged Ivory Ribcage & Antler Midtone (#a39384)
    [212, 197, 180],  # 10: Lit Sculpted Bone & Rib Highlight (#d4c5b4)
    [245, 239, 230],  # 11: Stark White Skull Brow & Fang Specular (#f5efe6)
    [94, 20, 40],     # 12: Deep Crimson Hood/Tasset Trim Shadow (#5e1428)
    [158, 34, 64],    # 13: Sovereign Blood-Crimson Trim Midtone (#9e2240)
    [223, 58, 98],    # 14: Blazing Crimson Hood/Tasset Edge (#df3a62)
    [88, 28, 135],    # 15: Deep Abyssal Violet Soul-Channel (#581c87)
    [147, 51, 234],   # 16: Luminous Amethyst Lantern & Scythe Rune (#9333ea)
    [217, 70, 239],   # 17: Radiant Magenta Soul-Core & Eye Socket (#d946ef)
    [251, 113, 133],  # 18: Hot Rose-Crimson Execution Spark (#fb7185)
    [255, 241, 251],  # 19: White-Hot Soul-Core & Razor Cutting Edge (#fff1fb)
], dtype=np.int32)

C_OUT = (7, 5, 13, 255)
C_SEL = (23, 18, 36, 255)
C_OBS_DARK = (36, 31, 51, 255)
C_OBS_LIT = (55, 49, 74, 255)
C_STEEL_DARK = (76, 72, 99, 255)
C_STEEL_MID = (115, 112, 140, 255)
C_STEEL_LIT = (164, 163, 189, 255)
C_STEEL_SPEC = (214, 216, 235, 255)
C_BONE_DARK = (110, 98, 89, 255)
C_BONE_MID = (163, 147, 132, 255)
C_BONE_LIT = (212, 197, 180, 255)
C_BONE_SPEC = (245, 239, 230, 255)
C_CRIM_DARK = (94, 20, 40, 255)
C_CRIM_MID = (158, 34, 64, 255)
C_CRIM_LIT = (223, 58, 98, 255)
C_VIO_DARK = (88, 28, 135, 255)
C_VIO_MID = (147, 51, 234, 255)
C_MAG_LIT = (217, 70, 239, 255)
C_ROSE = (251, 113, 133, 255)
C_CORE = (255, 241, 251, 255)

# Skeletal pivots in 512x512 rig space (0.5x of 1024x1024 reaper_v5_base.jpg)
PIVOTS = dict(
    pelvis=(268.0, 252.0), neck=(262.0, 128.0),
    l_sh=(206.0, 147.0), l_elb=(190.0, 208.0), l_hand=(196.0, 292.0),
    r_sh=(304.0, 152.0), r_elb=(312.0, 212.0), r_hand=(333.0, 291.0),
    l_hip=(232.0, 286.0), l_knee=(222.0, 355.0), l_ank=(208.0, 460.0),
    r_hip=(286.0, 286.0), r_knee=(295.0, 355.0), r_ank=(284.0, 450.0),
)

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
    protect_indices=(7, 10, 11, 14, 16, 17, 18, 19),
    hair_indices=(12, 13),
    lit_selout=1,
    shad_selout=0,
    hair_selout=0,
    joint_fill=(23, 18, 36, 255),
    joint_inner=(36, 31, 51, 255),
    hip_r=19,
    thigh_r=15,
    arm_r=13,
    pinhole_fill=(36, 31, 51, 255),
)


def put_px_safe(arr, x, y, col):
    """Strictly clamps drawn pixels inside x in [4..99], y in [4..99] on the 104x104 canvas."""
    ix, iy = int(round(x)), int(round(y))
    if 4 <= ix <= 99 and 4 <= iy <= 99:
        arr[iy, ix] = col


def solve_arm_ik(sh_w, target_w, L1, L2, a1_rest, a2_rest, torso_deg, elbow_clockwise=True):
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
    if not cfg.get("two_handed_ik", True):
        return cfg

    torso_deg = cfg.get("torso_deg", 0.0)
    grip_x = cfg.get("grip_x", 48.0)
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
            pel[0] + cfg.get("chain_lx", 92.0),
            pel[1] + cfg.get("chain_ly", -44.0),
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
        cfg["right_arm_in_front"] = (grip_y < -60.0) or (grip_x > 54.0)
    return cfg


TWO_HAND_NUMERIC_KEYS = tuple(BASE_NUMERIC_KEYS) + (
    "grip_x", "grip_y", "grip_sep", "chain_lx", "chain_ly", "chain_reach",
)


def eval_2h_keyframes(f, keyframes, ph, defaults, extra_meta_keys=(), wave_mult=2.0):
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
        "halo_active", "halo_grand", "two_handed_ik", "chain_cast_mode",
        "chain_active", "hook_sign", "resting_scythe_floor",
    ) + tuple(extra_meta_keys)
    for mk in all_meta:
        if mk in active_d:
            out[mk] = active_d[mk]

    out["mane_wave_phase"] = ph * wave_mult
    return apply_2h_scythe_ik(out)


def save_debug_parts_sheet(parts, out_path):
    names = [
        "head", "torso", "l_coat", "r_coat", "l_sode",
        "l_forearm", "r_sode", "r_forearm", "l_thigh", "l_shin",
        "l_foot", "r_thigh", "r_shin", "r_foot",
    ]
    cw, ch = 220, 220
    pad = 16
    im = Image.new("RGBA", (5 * (cw + pad) + pad, 3 * (ch + pad + 20) + pad), (18, 14, 28, 255))
    d = ImageDraw.Draw(im)
    for idx, nm in enumerate(names):
        c = idx % 5
        r = idx // 5
        ox = pad + c * (cw + pad)
        oy = pad + 20 + r * (ch + pad + 20)
        d.rectangle([ox, oy, ox + cw, oy + ch], fill=(34, 26, 52, 255), outline=(112, 84, 158, 255), width=1)
        if nm in parts:
            pim, _, _ = parts[nm]
            pw, ph = pim.size
            d.text((ox + 2, oy - 16), f"{nm} ({pw}x{ph})", fill=(248, 232, 255, 255))
            scale = min(1.0, (cw - 16) / max(1, pw), (ch - 16) / max(1, ph))
            if scale < 1.0:
                pim = pim.resize((max(1, int(pw * scale)), max(1, int(ph * scale))), Image.Resampling.NEAREST)
            px = ox + (cw - pim.size[0]) // 2
            py = oy + (ch - pim.size[1]) // 2
            im.alpha_composite(pim, (px, py))
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    im.save(out_path)


def extract_clean_v5_base_512(img_path):
    """
    Loads `assets/sprites/reaper_v5_base.jpg` (`1024x1024` on `#FFFFFF`), strips all exterior
    and enclosed interior white background pockets via BFS while protecting Malakor's stark white
    skull visage & horns, applies 3-pass fringe stripping, downsamples 2x NEAREST to `512x512`,
    and applies multi-zone `MedianFilter` cel-flattening.
    """
    if not os.path.exists(img_path):
        raise FileNotFoundError(f"Missing reference base sprite: {img_path}")

    im = Image.open(img_path).convert("RGBA")
    arr = np.array(im)
    H0, W0 = arr.shape[:2]

    r0 = arr[:, :, 0].astype(np.int16)
    g0 = arr[:, :, 1].astype(np.int16)
    b0 = arr[:, :, 2].astype(np.int16)
    max_rgb = np.maximum(np.maximum(r0, g0), b0)
    min_rgb = np.minimum(np.minimum(r0, g0), b0)

    # Protect the white skull face & crown diadem (x in [455..598], y in [125..285]) from background BFS
    yy0 = np.arange(H0)[:, None]
    xx0 = np.arange(W0)[None, :]
    in_skull_box = (xx0 >= 455) & (xx0 <= 598) & (yy0 >= 125) & (yy0 <= 285)

    is_white_bg = (
        (((r0 >= 235) & (g0 >= 235) & (b0 >= 235)) | ((min_rgb >= 212) & ((max_rgb - min_rgb) < 24)))
        & (~in_skull_box)
    )
    # Seed interior pure-white gaps only below the hood/collar (`y >= 295`) so arm/waist/leg pockets vanish cleanly
    seed_mask = (r0 >= 245) & (g0 >= 245) & (b0 >= 245) & (yy0 >= 295)

    visited = np.zeros((H0, W0), dtype=bool)
    q = deque()

    for x in range(W0):
        for y in (0, H0 - 1):
            if is_white_bg[y, x] and not visited[y, x]:
                visited[y, x] = True
                q.append((y, x))
    for y in range(H0):
        for x in (0, W0 - 1):
            if is_white_bg[y, x] and not visited[y, x]:
                visited[y, x] = True
                q.append((y, x))

    sys_y, sys_x = np.where(seed_mask & (~visited))
    for sy, sx in zip(sys_y, sys_x):
        visited[sy, sx] = True
        q.append((int(sy), int(sx)))

    while q:
        cy, cx = q.popleft()
        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
            if 0 <= ny < H0 and 0 <= nx < W0 and not visited[ny, nx] and is_white_bg[ny, nx]:
                visited[ny, nx] = True
                q.append((ny, nx))

    arr[visited] = [0, 0, 0, 0]

    # 3-Pass Anti-Aliased Fringe Strip (zero white/gray halo)
    for _ in range(3):
        a0 = arr[:, :, 3] > 0
        up = np.pad(a0[1:, :], ((0, 1), (0, 0)), constant_values=False)
        dn = np.pad(a0[:-1, :], ((1, 0), (0, 0)), constant_values=False)
        lf = np.pad(a0[:, 1:], ((0, 0), (0, 1)), constant_values=False)
        rt = np.pad(a0[:, :-1], ((0, 0), (1, 0)), constant_values=False)
        edge = a0 & (~(up & dn & lf & rt)) & (~in_skull_box)
        r = arr[:, :, 0].astype(np.int16)
        g = arr[:, :, 1].astype(np.int16)
        b = arr[:, :, 2].astype(np.int16)
        mx = np.maximum(np.maximum(r, g), b)
        mn = np.minimum(np.minimum(r, g), b)
        fringe = edge & (mn > 168) & ((mx - mn) < 32)
        arr[fringe] = [0, 0, 0, 0]

    im512 = Image.fromarray(arr, "RGBA").resize((512, 512), Image.Resampling.NEAREST)
    rgb512 = im512.convert("RGB")
    rgb_med3 = np.array(rgb512.filter(ImageFilter.MedianFilter(size=3)))
    rgb_med5 = np.array(rgb512.filter(ImageFilter.MedianFilter(size=5)))

    arr512 = np.array(im512)
    alpha = keep_largest_component(arr512[:, :, 3] > 0)
    arr512[~alpha] = [0, 0, 0, 0]

    # Preserve crisp 3x3 cel detail on skull visage, crown horns, ivory ribcage, and crimson/magenta soul-core!
    raw_r = arr512[:, :, 0].astype(np.int16)
    raw_g = arr512[:, :, 1].astype(np.int16)
    raw_b = arr512[:, :, 2].astype(np.int16)
    is_gem_or_rib = ((raw_r > 145) & ((raw_r - raw_g) > 45)) | ((raw_r > 185) & (raw_g > 170))
    yy = np.arange(512)[:, None]
    use_med3 = (yy < 225) | is_gem_or_rib
    cel_rgb = np.where(use_med3[:, :, None], rgb_med3, rgb_med5)
    arr512[:, :, :3] = np.where(alpha[:, :, None], cel_rgb, 0)
    return arr512


def load_and_segment_512():
    arr = extract_clean_v5_base_512(BASE_IMG_PATH)
    H, W = 512, 512
    a = keep_largest_component(arr[:, :, 3] > 0)
    arr[~a] = [0, 0, 0, 0]

    # Boost luminous magenta-crimson eye sockets & sternum soul-core gem so they gleam crisply at 104x104
    r_ch = arr[:, :, 0].astype(np.int16)
    g_ch = arr[:, :, 1].astype(np.int16)
    b_ch = arr[:, :, 2].astype(np.int16)

    eye_zone = poly_mask(H, W, P([(490, 170), (582, 170), (582, 215), (490, 215)]))
    eye_glow = eye_zone & a & (r_ch > 150) & ((r_ch - g_ch) > 65)
    eye_core = eye_glow & (r_ch > 215)
    arr[eye_glow] = [217, 70, 239, 255]
    arr[eye_core] = [255, 241, 251, 255]

    gem_zone = poly_mask(H, W, P([(518, 292), (576, 292), (576, 396), (518, 396)]))
    gem_glow = gem_zone & a & (r_ch > 145) & ((r_ch - g_ch) > 55)
    gem_core = gem_glow & (r_ch > 218)
    arr[gem_glow] = [217, 70, 239, 255]
    arr[gem_core] = [255, 241, 251, 255]

    # 1. Head: Sweeping Silver-Bone Crown Horns, Crimson-Lined Obsidian Hood & Stark White Skull Visage
    m_head = poly_mask(H, W, P([
        (350, 14), (625, 14), (625, 185), (598, 254),
        (542, 292), (470, 255), (420, 232), (410, 180), (350, 165)
    ])) & a

    # 2. Left Spiked Silver Pauldron (`l_sode`) & Elbow-Spike Vambrace/Gauntlet (`l_forearm`)
    m_l_sode = poly_mask(H, W, P([
        (320, 216), (432, 232), (475, 285), (470, 344), (424, 360), (418, 402), (342, 392), (320, 335)
    ])) & a & (~m_head)
    m_l_forearm = poly_mask(H, W, P([
        (296, 384), (420, 398), (416, 480), (436, 576), (434, 632), (344, 632), (340, 540), (296, 445)
    ])) & a & (~m_l_sode) & (~m_head)

    # 3. Right Spiked Silver Pauldron (`r_sode`) & Vambrace/Gauntlet (`r_forearm`)
    m_r_sode = poly_mask(H, W, P([
        (588, 232), (654, 232), (654, 412), (596, 422), (598, 345), (588, 290)
    ])) & a & (~m_head)
    m_r_forearm = poly_mask(H, W, P([
        (596, 410), (658, 404), (694, 525), (714, 572), (710, 630), (634, 630), (630, 555), (608, 485)
    ])) & a & (~m_r_sode) & (~m_head)

    # 4. Left & Right Crimson-Lined Obsidian Waist Tassets (`l_coat` & `r_coat`)
    m_l_coat = poly_mask(H, W, P([
        (364, 478), (516, 492), (512, 595), (496, 635), (370, 686), (364, 640)
    ])) & a & (~m_l_forearm) & (~m_l_sode)
    m_r_coat = poly_mask(H, W, P([
        (576, 488), (656, 488), (656, 676), (628, 676), (592, 610), (576, 570)
    ])) & a & (~m_r_forearm) & (~m_r_sode)

    # 5. Torso: Sculpted Ivory Ribcage Cuirass, Sternum Soul-Core Gem, Abdominal Silver Plates & Belt
    m_torso = poly_mask(H, W, P([
        (426, 235), (600, 235), (598, 495), (582, 608), (512, 608), (496, 495), (426, 455)
    ])) & a & (~m_head) & (~m_l_sode) & (~m_l_forearm) & (~m_r_sode) & (~m_r_forearm) & (~m_l_coat) & (~m_r_coat)

    # 6. Separated Silver-Steel Greave Legs (`l_thigh`, `l_shin`, `l_foot`, `r_thigh`, `r_shin`, `r_foot`)
    m_l_foot = poly_mask(H, W, P([(366, 908), (464, 908), (464, 996), (366, 996)])) & a
    m_l_shin = poly_mask(H, W, P([(374, 728), (492, 728), (482, 912), (374, 912)])) & a & (~m_l_foot)
    m_l_thigh = poly_mask(H, W, P([(382, 588), (516, 588), (514, 736), (382, 736)])) & a & (~m_torso) & (~m_l_coat) & (~m_l_forearm) & (~m_l_shin) & (~m_l_foot)

    m_r_foot = poly_mask(H, W, P([(522, 892), (688, 892), (688, 962), (522, 962)])) & a
    m_r_shin = poly_mask(H, W, P([(514, 728), (628, 728), (628, 898), (514, 898)])) & a & (~m_r_foot)
    m_r_thigh = poly_mask(H, W, P([(516, 584), (636, 584), (636, 736), (516, 736)])) & a & (~m_torso) & (~m_r_coat) & (~m_r_forearm) & (~m_r_shin) & (~m_r_foot)

    masks = assign_remaining_geodesic(a, [
        ("head", m_head), ("torso", m_torso),
        ("l_coat", m_l_coat), ("r_coat", m_r_coat),
        ("l_sode", m_l_sode), ("l_forearm", m_l_forearm),
        ("r_sode", m_r_sode), ("r_forearm", m_r_forearm),
        ("l_thigh", m_l_thigh), ("l_shin", m_l_shin), ("l_foot", m_l_foot),
        ("r_thigh", m_r_thigh), ("r_shin", m_r_shin), ("r_foot", m_r_foot),
    ])

    parts = extract_parts_512(arr, masks)
    save_debug_parts_sheet(parts, os.path.join(ARTIFACT_DIR, "debug_reaper_v5_parts.png"))
    return parts


def draw_wraith_shroud_and_lantern_104(arr, nx, ny, ph, grand=False):
    """
    Draws Malakor v5's Dynamic Back Attachment behind his shoulders:
    1. Streaming **Tattered Obsidian-Crimson Wraith Ribbons** billowing dynamically at 30fps.
    2. Revolving **Twin Bone-Scythe Halo** framing his horned skull crown.
    3. Hovering **Ferryman's Gothic Soul-Lantern** housing a blazing magenta-white soul-flame!
    """
    # 1. Streaming Tattered Wraith Ribbons behind left/rear shoulder & waist
    for r_idx, (ox, oy, length, spread) in enumerate(((-8.0, 5.0, 21.0, -9.5), (-5.0, 9.0, 17.0, -6.5))):
        x0 = max(12.0, min(84.0, nx + ox))
        y0 = max(18.0, min(82.0, ny + oy))
        n_seg = 18
        for s in range(n_seg + 1):
            u = s / float(n_seg)
            wave = math.sin(ph + u * 3.8 + r_idx * 1.4) * (2.6 * u)
            px = x0 + spread * u + wave * 0.65
            py = y0 + length * u + wave * 0.35
            w = max(0, int(round((1.0 - u * 0.72) * 2.2)))
            for dy in range(-w, w + 1):
                col = C_CRIM_LIT if (dy == -w and u > 0.25) else (C_OBS_LIT if dy < 0 else C_OBS_DARK)
                put_px_safe(arr, px, py + dy, col)
            put_px_safe(arr, px, py + w + 1, C_OUT)

    # 2. Revolving Twin Bone-Scythe Halo behind horned crown
    cx = max(18.0, min(84.0, nx - 1.5))
    cy = max(16.0, min(82.0, ny - 4.0))
    rx = 15.6 if grand else 13.6
    ry = 11.4 if grand else 9.8
    n_pts = 40 if grand else 32
    for k in range(n_pts):
        ang = (k / float(n_pts)) * 2.0 * math.pi + ph * 0.5
        px = cx + math.cos(ang) * rx
        py = cy + math.sin(ang) * ry
        col = C_MAG_LIT if k % 4 == 0 else (C_BONE_LIT if k % 3 == 0 else C_OBS_DARK)
        put_px_safe(arr, px, py, col)

    for k in range(6):
        ang = ph + k * (math.pi / 3.0)
        sx = cx + math.cos(ang) * (rx + 1.8)
        sy = cy + math.sin(ang) * (ry + 1.5)
        put_px_safe(arr, sx + 1, sy, C_OUT)
        put_px_safe(arr, sx - 1, sy, C_OUT)
        put_px_safe(arr, sx, sy - 1, C_OUT)
        put_px_safe(arr, sx, sy + 1, C_OUT)
        put_px_safe(arr, sx, sy, C_CORE if (grand and k % 2 == 0) else (C_CRIM_LIT if k % 2 == 0 else C_MAG_LIT))

    # 3. Hovering Ferryman's Gothic Soul-Lantern behind rear shoulder
    bob = math.sin(ph) * 1.5
    sway = math.cos(ph) * 0.9
    lx = max(11.0, min(86.0, nx - 15.0 + sway))
    ly = max(15.0, min(82.0, ny + 3.0 + bob))

    put_px_safe(arr, lx + 2, ly - 7, C_OUT)
    put_px_safe(arr, lx + 1, ly - 7, C_STEEL_LIT)
    put_px_safe(arr, lx, ly - 6, C_STEEL_MID)
    put_px_safe(arr, lx, ly - 5, C_BONE_SPEC)
    put_px_safe(arr, lx, ly - 4, C_OUT)

    for dx in range(-2, 3):
        put_px_safe(arr, lx + dx, ly - 3, C_OUT if abs(dx) == 2 else C_CRIM_LIT)
    for dx in range(-3, 4):
        put_px_safe(arr, lx + dx, ly - 2, C_OUT if abs(dx) == 3 else (C_STEEL_SPEC if dx == 0 else C_STEEL_MID))

    for dy in range(-1, 4):
        for dx in range(-3, 4):
            adx = abs(dx)
            if adx == 3:
                col = C_OUT
            elif adx == 2:
                col = C_STEEL_MID if dy % 2 == 0 else C_OBS_DARK
            elif dy == 1 and dx == 0:
                col = C_CORE
            elif adx <= 1 and dy <= 2:
                col = C_CORE if (dy == 0 and dx == 0) else (C_MAG_LIT if adx == 0 else C_ROSE)
            else:
                col = C_VIO_MID if adx <= 1 else C_OBS_DARK
            put_px_safe(arr, lx + dx, ly + dy, col)

    for dx in range(-3, 4):
        put_px_safe(arr, lx + dx, ly + 4, C_OUT if abs(dx) == 3 else C_CRIM_MID)
    for dx in range(-1, 2):
        put_px_safe(arr, lx + dx, ly + 5, C_OUT if abs(dx) == 1 else C_BONE_SPEC)
    put_px_safe(arr, lx, ly + 6, C_OUT)


def draw_2h_eclipse_greatscythe_104(
    arr, hx, hy, scythe_deg, hook_sign=1.0, glow=1.0, phase=0.0, show_gauntlets=True, scale_len=1.0, blade_flat=1.0
):
    """
    Draws Malakor v5's Articulated 2H **Cursed Eclipse Great-Scythe ("Thanatos")**:
    - Forged Silver-Steel & Sculpted Ivory-Vertebra Snath (`da` from `-16` to `+34`)
    - Horned Ivory Skull Collar with Blazing Crimson-Magenta Soul-Core Gem
    - Sweeping Crescent Execution Blade with Ivory Dorsal Rib-Spine, Obsidian Fuller,
      Blazing Crimson-Magenta Soul-Runes, and Razor White-Hot Inner Edge!
    """
    rad = math.radians(scythe_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    nx, ny = -uy * hook_sign, ux * hook_sign

    hx = max(18.0, min(72.0, hx))
    hy = max(18.0, min(95.0, hy))

    # 1. Curved Forged Silver-Steel & Vertebrated Ivory Snath
    for da_raw in np.linspace(-16.0, 34.0, 102):
        da = da_raw * scale_len
        dp_center = math.sin((da_raw + 4.0) * 0.11) * 1.35 * blade_flat
        if da_raw < -12.5:
            u_pom = (da_raw + 16.0) / 3.5
            half_w = 0.55 + 1.85 * max(0.0, min(1.0, u_pom))
        elif da_raw > 27.5:
            u_neck = (da_raw - 27.5) / 6.5
            half_w = 1.65 + 1.15 * max(0.0, min(1.0, u_neck))
        else:
            is_bone_ring = abs((da_raw + 10.5) % 4.8) < 0.72
            half_w = 2.05 if is_bone_ring else 1.48

        is_bone_ring = abs((da_raw + 10.5) % 4.8) < 0.72
        for dp_rel in np.linspace(-half_w, half_w, 9):
            dp = dp_center + dp_rel * scale_len
            px = hx + ux * da + nx * dp
            py = hy + uy * da + ny * dp
            adp = abs(dp_rel)

            if da_raw < -14.8:
                col = C_OUT if adp > 0.45 else C_BONE_SPEC
            elif -14.2 <= da_raw <= -12.6 and adp < 0.95:
                col = C_CORE if adp < 0.42 else C_CRIM_LIT
            elif adp >= half_w - 0.48:
                col = C_OUT
            elif adp <= 0.44:
                col = C_BONE_SPEC if is_bone_ring else (C_MAG_LIT if (glow > 0.5 and int(abs(da_raw)) % 4 == 0) else C_STEEL_LIT)
            elif dp_rel < 0.0:
                col = C_BONE_LIT if is_bone_ring else C_STEEL_MID
            else:
                col = C_BONE_MID if is_bone_ring else C_OBS_DARK
            put_px_safe(arr, px, py, col)

    # 2. Sweeping Crescent Execution Blade
    for dp_raw in np.linspace(-4.0, 39.0, 98):
        dp = dp_raw * scale_len * blade_flat
        if dp_raw < 0.0:
            u_back = abs(dp_raw) / 4.0
            da_mid = 31.2 - 1.4 * u_back
            half_da = 2.6 * (1.0 - 0.75 * u_back)
            for da_raw in np.linspace(da_mid - half_da, da_mid + half_da, 9):
                da = da_raw * scale_len
                px = hx + ux * da + nx * dp
                py = hy + uy * da + ny * dp
                on_edge = (u_back > 0.82) or (abs(da_raw - da_mid) >= half_da - 0.55)
                col = C_OUT if on_edge else (C_CRIM_LIT if abs(da_raw - da_mid) < 0.6 else C_STEEL_LIT)
                put_px_safe(arr, px, py, col)
            continue

        u = dp_raw / 39.0
        da_outer_raw = 35.0 + 1.9 * math.sin(u * math.pi * 0.58) - 23.2 * (u ** 1.68)
        if 0.14 < u < 0.76 and abs((u * 100.0) % 14.0 - 7.0) < 2.2:
            da_outer_raw += 1.2

        chord_raw = (9.0 * (1.0 - 0.66 * (u ** 1.12)) + 1.7 * math.sin(u * math.pi)) * (
            1.0 - max(0.0, (u - 0.85) / 0.15) ** 1.5
        )
        chord_raw = max(1.1, chord_raw)
        da_inner_raw = da_outer_raw - chord_raw

        n_da = max(7, int(chord_raw * 2.4) + 3)
        for da_raw in np.linspace(da_inner_raw, da_outer_raw, n_da):
            da = da_raw * scale_len
            px = max(5.0, min(98.0, hx + ux * da + nx * dp))
            py = max(5.0, min(98.0, hy + uy * da + ny * dp))

            v = (da_raw - da_inner_raw) / max(0.6, chord_raw)
            is_rune = (0.38 <= v <= 0.66) and (0.08 <= u <= 0.84) and (abs((dp_raw - 2.0) % 4.6 - 2.3) < 0.85)

            if u >= 0.96 or v >= 0.89:
                col = C_OUT
            elif v < 0.15:
                col = C_CORE if glow > 0.35 else C_STEEL_SPEC
            elif v < 0.28:
                col = C_CRIM_LIT if glow > 0.3 else C_ROSE
            elif v < 0.44:
                col = C_MAG_LIT if (u < 0.58 and v < 0.35) else C_VIO_MID
            elif is_rune and glow > 0.3:
                col = C_CORE if abs(v - 0.52) < 0.08 else C_ROSE
            elif v < 0.68:
                col = C_OBS_LIT if u < 0.65 else C_OBS_DARK
            else:
                col = C_BONE_SPEC if v < 0.78 else C_BONE_LIT

            put_px_safe(arr, px, py, col)

    # 3. Horned Ivory Skull Collar at Blade Junction
    for da_raw in np.linspace(28.0, 35.0, 19):
        for dp_raw in np.linspace(-3.4, 3.8, 19):
            da = da_raw * scale_len
            dp = dp_raw * scale_len * max(0.55, blade_flat)
            u_sk = (da_raw - 28.0) / 7.0
            max_dp = 3.2 - 0.8 * abs(u_sk - 0.45)
            is_horn = (da_raw >= 32.0) and (-3.4 <= dp_raw <= -1.2)
            if abs(dp_raw) > max_dp and not is_horn:
                continue

            px = max(5.0, min(98.0, hx + ux * da + nx * dp))
            py = max(5.0, min(98.0, hy + uy * da + ny * dp))

            d_gem = math.hypot((da_raw - 31.3) * 0.95, (dp_raw - 0.2) * 1.05)
            on_edge = da_raw <= 28.5 or da_raw >= 34.4 or (abs(dp_raw) >= max_dp - 0.55 and not is_horn)
            if on_edge:
                col = C_OUT
            elif d_gem <= 0.85:
                col = C_CORE
            elif d_gem <= 1.65:
                col = C_CRIM_LIT
            elif d_gem <= 2.25:
                col = C_MAG_LIT
            elif is_horn:
                col = C_BONE_SPEC if da_raw > 33.4 else C_BONE_MID
            else:
                col = C_BONE_SPEC if dp_raw < 0.0 else C_BONE_LIT
            put_px_safe(arr, px, py, col)

    # 4. Two Polished Silver-Steel Gauntlet Clasps Locked onto the Snath
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
                        col = C_STEEL_SPEC if n_off <= 0 else C_STEEL_MID
                    elif abs(n_off) <= 0.5:
                        col = C_CRIM_LIT if is_lower else C_MAG_LIT
                    else:
                        col = C_STEEL_LIT if n_off < 0 else C_STEEL_DARK
                    put_px_safe(arr, px, py, col)


def draw_soul_sever_chain_104(arr, lh_x, lh_y, reach_px, phase=0.0):
    """
    Draws Malakor v5's Articulated Crimson-Bone Ferryman Chain & Soul-Sever Claw
    launched from `l_hand` during Row 3 (`SOUL SEVER`), with continuous connected links!
    """
    x0 = max(8.0, min(86.0, lh_x))
    y0 = max(14.0, min(86.0, lh_y))
    x1 = max(x0 + 8.0, min(93.0, x0 + reach_px))
    y1 = y0 - 3.0

    steps = int(max(12, abs(x1 - x0) * 1.8))
    for i in range(steps + 1):
        u = i / float(steps)
        cx = x0 + (x1 - x0) * u
        cy = y0 + (y1 - y0) * u + math.sin(u * math.pi * 1.5 + phase) * 2.4 * math.sin(u * math.pi)
        is_bone_node = (i % 3 == 0)
        put_px_safe(arr, cx, cy - 1, C_OUT)
        put_px_safe(arr, cx, cy + 1, C_OUT)
        put_px_safe(arr, cx, cy, C_BONE_SPEC if is_bone_node else C_CRIM_LIT)

    # Articulated 3-Pronged Soul-Sever Hook & Captive Soul Spark at tip
    for dy_c in (-1, 0, 1):
        for dx_c in (-1, 0, 1):
            put_px_safe(arr, x1 + dx_c, y1 + dy_c, C_CORE if (dx_c == 0 and dy_c == 0) else C_CRIM_LIT)
    for fang_dy, fang_tip_dy in ((-3.0, -1.2), (0.0, 0.0), (3.0, 1.2)):
        jx = min(95.0, x1 + 2.6)
        jy = y1 + fang_dy
        tx = min(97.0, x1 + 4.8)
        ty = y1 + fang_tip_dy
        draw_line_104(arr, x1, y1, jx, jy, C_BONE_SPEC, 1)
        draw_line_104(arr, jx, jy, tx, ty, C_MAG_LIT, 1)
        put_px_safe(arr, tx, ty, C_CORE)


def extra_extents(joints_c, cfg, scale):
    pts = []
    if cfg.get("halo_active", True):
        nk = joints_c["neck"]
        pts.append((nk[0] - 21.0 / scale, nk[1] - 18.0 / scale))
        pts.append((nk[0] + 16.0 / scale, nk[1] - 18.0 / scale))

    if cfg.get("show_weapon", True) and not cfg.get("planted_weapon", False) and not cfg.get("resting_scythe_floor", False):
        rh = joints_c["r_hand"]
        rad = math.radians(cfg.get("weapon_deg", -40.0))
        ux, uy = math.cos(rad), math.sin(rad)
        hs = cfg.get("hook_sign", 1.0)
        nx, ny = -uy * hs, ux * hs
        sl = cfg.get("weapon_scale", 0.90)

        pts.append((rh[0] - ux * (16.5 * sl / scale), rh[1] - uy * (16.5 * sl / scale)))
        pts.append((
            rh[0] + ux * (35.5 * sl / scale) - nx * (4.2 * sl / scale),
            rh[1] + uy * (35.5 * sl / scale) - ny * (4.2 * sl / scale),
        ))
        pts.append((
            rh[0] + ux * (32.0 * sl / scale) + nx * (20.5 * sl / scale),
            rh[1] + uy * (32.0 * sl / scale) + ny * (20.5 * sl / scale),
        ))
        pts.append((
            rh[0] + ux * (12.0 * sl / scale) + nx * (39.0 * sl / scale),
            rh[1] + uy * (12.0 * sl / scale) + ny * (39.0 * sl / scale),
        ))
    return pts


def draw_back(bg104, joints104, cfg):
    ph = cfg.get("mane_wave_phase", 0.0)
    if cfg.get("halo_active", True):
        nk = joints104["neck"]
        draw_wraith_shroud_and_lantern_104(bg104, nk[0], nk[1], ph, grand=cfg.get("halo_grand", False))


def draw_front(out, joints104, cfg):
    ph = cfg.get("mane_wave_phase", 0.0)

    if cfg.get("slash_arc") is not None:
        sa = cfg["slash_arc"]
        nk = joints104["neck"]
        draw_slash_arc_104(
            out,
            max(24.0, min(72.0, nk[0] + sa.get("dx", 6.0))),
            max(24.0, min(74.0, nk[1] + sa.get("dy", 10.0))),
            min(26.5, sa.get("r", 26.0)),
            sa["a0"], sa["a1"],
            C_CORE, C_CRIM_LIT, C_MAG_LIT, intensity=sa.get("intensity", 1.0),
        )

    if cfg.get("resting_scythe_floor", False):
        draw_2h_eclipse_greatscythe_104(
            out, 38.0, 94.0,
            scythe_deg=1.5, hook_sign=-1.0, glow=cfg.get("weapon_glow", 0.25),
            phase=ph, show_gauntlets=False, scale_len=0.76, blade_flat=0.30,
        )
    elif cfg.get("planted_weapon", False):
        rh = joints104["r_hand"]
        px_plant = max(34.0, min(52.0, rh[0] - 4.0))
        py_plant = max(84.0, min(93.0, rh[1] + 2.0))
        draw_2h_eclipse_greatscythe_104(
            out, px_plant, py_plant,
            scythe_deg=8.0, hook_sign=-1.0, glow=cfg.get("weapon_glow", 0.45),
            phase=ph, show_gauntlets=True, scale_len=0.78, blade_flat=0.65,
        )
    elif cfg.get("show_weapon", True):
        rh = joints104["r_hand"]
        draw_2h_eclipse_greatscythe_104(
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
        draw_soul_sever_chain_104(
            out, lh[0], lh[1],
            reach_px=cfg.get("chain_reach", 26.0),
            phase=ph,
        )


DEFAULTS = dict(
    pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=3.0, head_rel_deg=-1.5, mane_rel_deg=-2.0,
    mane_wave_amp=5.0, mane_in_front=False,
    l_thigh_deg=-2.0, l_shin_deg=2.0, l_foot_deg=0.0,
    r_thigh_deg=2.0, r_shin_deg=-2.0, r_foot_deg=0.0,
    l_sode_rel_deg=12.0, l_fore_rel_deg=8.0, r_sode_rel_deg=10.0, r_fore_rel_deg=-8.0,
    l_coat_rel_deg=0.0, r_coat_rel_deg=0.0,
    grip_x=48.0, grip_y=-12.0, grip_sep=36.0,
    chain_lx=88.0, chain_ly=-42.0, chain_reach=26.0,
    weapon_deg=-42.0, weapon_len=24.0, weapon_scale=0.90, weapon_glow=1.0, foot_y=99.0,
    show_weapon=True, two_handed_ik=True, chain_cast_mode=False, chain_active=False,
    halo_active=True, halo_grand=False, right_arm_in_front=False, right_leg_behind=False,
    hook_sign=1.0, resting_scythe_floor=False,
)


def render_frame(parts, cfg):
    out = render_rig_104(
        parts, PIVOTS, cfg, PALETTE_CFG,
        y_bot_base=494.0, default_S=572,
        extra_extent_fn=extra_extents, draw_back_fn=draw_back, draw_front_fn=draw_front,
    )
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
            # Row 0: IDLE — Poised Arch-Reaper 2H Great-Scythe Guard
            b = math.sin(ph)
            s = math.cos(ph)
            cfg = dict(DEFAULTS)
            cfg.update(
                pelvis_dx=s * 2.4, pelvis_dy=b * 6.5, torso_deg=3.0 + b * 2.0,
                head_rel_deg=-1.5 - b * 1.2,
                l_coat_rel_deg=s * 3.0, r_coat_rel_deg=-s * 3.0,
                mane_wave_phase=ph,
                grip_x=48.0 + s * 2.5, grip_y=-12.0 + b * 4.0,
                weapon_deg=-42.0 + b * 3.5, weapon_glow=0.85 + 0.15 * b,
                foot_y=99.0,
            )
            cfgs.append(apply_2h_scythe_ik(cfg))

        elif row_idx == 1:
            # Row 1: WALK — Relentless Death-March Armored Stride (scythe carried low & poised)
            st = math.sin(ph)
            kl = math.cos(ph)
            cfg = dict(DEFAULTS)
            cfg.update(
                pelvis_dy=abs(st) * 15.5, torso_deg=8.5 + abs(st) * 2.5, head_rel_deg=-4.0,
                mane_wave_phase=ph * 2.0,
                right_leg_behind=(f >= 15),
                l_thigh_deg=st * 25.0, l_shin_deg=max(0.0, st * 26.0) + max(0.0, kl * 13.0), l_foot_deg=st * 11.0,
                r_thigh_deg=-st * 25.0, r_shin_deg=max(0.0, -st * 26.0) + max(0.0, -kl * 13.0), r_foot_deg=-st * 11.0,
                l_coat_rel_deg=st * 6.0, r_coat_rel_deg=-st * 6.0,
                grip_x=44.0 + st * 5.0, grip_y=-4.0 + abs(st) * 4.5,
                weapon_deg=-26.0 + st * 9.0, foot_y=99.0,
            )
            cfgs.append(apply_2h_scythe_ik(cfg))

        elif row_idx == 2:
            # Row 2: AUTO_ATTACK — Trinity of the Scythe (Coiled Back-Cock -> Wide Crescent Reap -> Reverse Hook Rend)
            kfs = [
                (0, dict(pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=3.0, head_rel_deg=-1.5,
                         l_thigh_deg=-2.0, l_shin_deg=2.0, r_thigh_deg=2.0, r_shin_deg=-2.0,
                         grip_x=48.0, grip_y=-12.0, weapon_deg=-42.0, grip_sep=36.0, hook_sign=1.0)),
                (6, dict(pelvis_dx=-16.0, pelvis_dy=24.0, torso_deg=-16.0, head_rel_deg=10.0,
                         l_thigh_deg=-20.0, l_shin_deg=20.0, r_thigh_deg=20.0, r_shin_deg=-12.0,
                         grip_x=10.0, grip_y=-54.0, weapon_deg=-114.0, grip_sep=32.0,
                         halo_grand=True, hook_sign=1.0)),
                (13, dict(pelvis_dx=16.0, pelvis_dy=44.0, torso_deg=24.0, head_rel_deg=-12.0,
                          l_thigh_deg=24.0, l_shin_deg=20.0, r_thigh_deg=-26.0, r_shin_deg=20.0,
                          grip_x=64.0, grip_y=-6.0, weapon_deg=16.0, grip_sep=36.0,
                          halo_grand=True, hook_sign=1.0)),
                (20, dict(pelvis_dx=12.0, pelvis_dy=20.0, torso_deg=-8.0, head_rel_deg=6.0,
                          l_thigh_deg=-12.0, l_shin_deg=14.0, r_thigh_deg=16.0, r_shin_deg=-10.0,
                          grip_x=56.0, grip_y=-64.0, weapon_deg=-68.0, grip_sep=34.0,
                          halo_grand=True, hook_sign=-1.0)),
                (25, dict(pelvis_dx=4.0, pelvis_dy=10.0, torso_deg=2.0, head_rel_deg=-1.0,
                          grip_x=50.0, grip_y=-24.0, weapon_deg=-48.0, grip_sep=36.0, hook_sign=1.0)),
                (29, dict(pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=3.0, head_rel_deg=-1.5,
                          grip_x=48.0, grip_y=-12.0, weapon_deg=-42.0, grip_sep=36.0, hook_sign=1.0)),
            ]
            cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.2)
            if 8 <= f <= 14:
                u = (f - 8) / 6.0
                cfg["slash_arc"] = dict(dx=4.0, dy=10.0, r=25.5, a0=-76.0 + 22.0 * u, a1=44.0 + 14.0 * u, intensity=1.22)
            elif 16 <= f <= 22:
                u = (f - 16) / 6.0
                cfg["slash_arc"] = dict(dx=4.0, dy=8.0, r=25.0, a0=40.0 - 44.0 * u, a1=-28.0 - 46.0 * u, intensity=1.20)
            cfgs.append(cfg)

        elif row_idx == 3:
            # Row 3: SKILL (SOUL SEVER) — Ferryman Chain Impale, Soul-Yank & X-Scissor Guillotine
            kfs = [
                (0, dict(torso_deg=3.0, grip_x=48.0, grip_y=-12.0, weapon_deg=-42.0,
                         chain_cast_mode=False, chain_active=False)),
                (5, dict(pelvis_dx=12.0, pelvis_dy=28.0, torso_deg=15.0, head_rel_deg=-8.0,
                         l_thigh_deg=18.0, l_shin_deg=16.0, r_thigh_deg=-18.0, r_shin_deg=16.0,
                         grip_x=-16.0, grip_y=-42.0, weapon_deg=-120.0,
                         chain_cast_mode=True, chain_active=True,
                         chain_lx=98.0, chain_ly=-44.0, chain_reach=28.0, halo_grand=True)),
                (9, dict(pelvis_dx=14.0, pelvis_dy=30.0, torso_deg=16.0, head_rel_deg=-8.0,
                         l_thigh_deg=20.0, l_shin_deg=18.0, r_thigh_deg=-20.0, r_shin_deg=16.0,
                         grip_x=-20.0, grip_y=-46.0, weapon_deg=-126.0,
                         chain_cast_mode=True, chain_active=True,
                         chain_lx=104.0, chain_ly=-42.0, chain_reach=32.0, halo_grand=True)),
                (14, dict(pelvis_dx=-14.0, pelvis_dy=36.0, torso_deg=-14.0, head_rel_deg=10.0,
                          l_thigh_deg=-22.0, l_shin_deg=22.0, r_thigh_deg=22.0, r_shin_deg=-14.0,
                          grip_x=16.0, grip_y=-52.0, weapon_deg=-102.0,
                          chain_cast_mode=True, chain_active=True,
                          chain_lx=44.0, chain_ly=-28.0, chain_reach=16.0, halo_grand=True)),
                (19, dict(pelvis_dx=18.0, pelvis_dy=48.0, torso_deg=25.0, head_rel_deg=-12.0,
                          l_thigh_deg=-24.0, l_shin_deg=24.0, r_thigh_deg=24.0, r_shin_deg=-18.0,
                          grip_x=64.0, grip_y=-4.0, weapon_deg=20.0, grip_sep=36.0,
                          chain_cast_mode=False, chain_active=False, halo_grand=True)),
                (24, dict(pelvis_dx=10.0, pelvis_dy=26.0, torso_deg=12.0, head_rel_deg=-6.0,
                          grip_x=54.0, grip_y=-22.0, weapon_deg=-22.0, grip_sep=36.0,
                          chain_cast_mode=False, chain_active=False, halo_grand=True)),
                (29, dict(torso_deg=3.0, grip_x=48.0, grip_y=-12.0, weapon_deg=-42.0,
                          chain_cast_mode=False, chain_active=False)),
            ]
            cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.5)
            if 16 <= f <= 23:
                u = (f - 16) / 7.0
                cfg["slash_arc"] = dict(dx=4.0, dy=10.0, r=26.0, a0=-84.0 + 18.0 * u, a1=48.0 + 12.0 * u, intensity=1.25)
            cfgs.append(cfg)

        elif row_idx == 4:
            # Row 4: ULTIMATE / TRUE_ULTIMATE — Altar Invocation -> High Executioner Cock -> Memento Mori Guillotine!
            # ZERO baked floor rings!
            kfs = [
                (0, dict(pelvis_dx=0.0, pelvis_dy=10.0, torso_deg=-4.0, head_rel_deg=4.0,
                         grip_x=42.0, grip_y=-54.0, weapon_deg=-86.0, grip_sep=34.0,
                         foot_y=99.0, halo_grand=True)),
                (6, dict(pelvis_dx=-4.0, pelvis_dy=6.0, torso_deg=-12.0, head_rel_deg=10.0,
                         l_thigh_deg=-8.0, l_shin_deg=10.0, r_thigh_deg=8.0, r_shin_deg=-6.0,
                         grip_x=34.0, grip_y=-86.0, weapon_deg=-98.0, grip_sep=32.0,
                         foot_y=99.0, halo_grand=True)),
                (12, dict(pelvis_dx=14.0, pelvis_dy=30.0, torso_deg=20.0, head_rel_deg=-10.0,
                          l_thigh_deg=22.0, l_shin_deg=20.0, r_thigh_deg=-22.0, r_shin_deg=18.0,
                          grip_x=60.0, grip_y=-12.0, weapon_deg=10.0, grip_sep=36.0,
                          foot_y=99.0, halo_grand=True)),
                (16, dict(pelvis_dx=-8.0, pelvis_dy=14.0, torso_deg=-18.0, head_rel_deg=12.0,
                          l_thigh_deg=18.0, l_shin_deg=24.0, r_thigh_deg=-14.0, r_shin_deg=20.0,
                          grip_x=22.0, grip_y=-96.0, weapon_deg=-108.0, grip_sep=32.0,
                          foot_y=94.0, halo_grand=True)),
                (22, dict(pelvis_dx=16.0, pelvis_dy=50.0, torso_deg=26.0, head_rel_deg=-12.0,
                          l_thigh_deg=-24.0, l_shin_deg=26.0, r_thigh_deg=24.0, r_shin_deg=-18.0,
                          grip_x=62.0, grip_y=-2.0, weapon_deg=18.0, grip_sep=36.0,
                          foot_y=99.0, halo_grand=True)),
                (26, dict(pelvis_dx=10.0, pelvis_dy=34.0, torso_deg=14.0, head_rel_deg=-6.0,
                          grip_x=54.0, grip_y=-8.0, weapon_deg=4.0, grip_sep=36.0,
                          foot_y=99.0, halo_grand=True)),
                (29, dict(torso_deg=3.0, grip_x=48.0, grip_y=-12.0, weapon_deg=-42.0,
                          grip_sep=36.0, foot_y=99.0, halo_grand=False)),
            ]
            cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.2)
            if 9 <= f <= 14 or 19 <= f <= 25:
                cfg["slash_arc"] = dict(dx=3.0, dy=10.0, r=25.5, a0=-88.0, a1=48.0, intensity=1.28)
            cfgs.append(cfg)

        elif row_idx == 5:
            # Row 5: DEATH — Grounded stagger (F00..F06), knee buckle (F07..F17), prone floor rest (F18..F29)
            kfs = make_prone_knight_death_kfs(
                idle_weapon_deg=-42.0, plant_x=52.0, plant_y=90.0, use_planted_weapon=True, mane_front=False
            )
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, extra_meta_keys=("plant_x", "plant_y"), wave_mult=1.0)
            cfg["halo_active"] = (f <= 6)
            if f <= 7:
                u = f / 7.0
                cfg["two_handed_ik"] = True
                cfg["grip_x"] = 48.0 - 8.0 * u
                cfg["grip_y"] = -12.0 + 14.0 * u
                cfg["grip_sep"] = 34.0
                apply_2h_scythe_ik(cfg)
            else:
                cfg["two_handed_ik"] = False
            if f >= 18:
                cfg["resting_scythe_floor"] = True
                cfg["planted_weapon"] = False
            cfgs.append(cfg)

        elif row_idx == 6:
            # Row 6: DASH — Aerodynamic Wraith Shadow-Rush (low forward lean, scythe swept back sleekly)
            kfs = [
                (0, dict(torso_deg=5.0, grip_x=48.0, grip_y=-12.0, weapon_deg=-42.0, foot_y=99.0)),
                (6, dict(pelvis_dx=14.0, pelvis_dy=28.0, torso_deg=26.0, head_rel_deg=-14.0,
                         l_thigh_deg=28.0, l_shin_deg=34.0, r_thigh_deg=-20.0, r_shin_deg=24.0,
                         grip_x=58.0, grip_y=-14.0, weapon_deg=-14.0, grip_sep=36.0,
                         halo_grand=True, foot_y=96.0)),
                (23, dict(pelvis_dx=14.0, pelvis_dy=28.0, torso_deg=26.0, head_rel_deg=-14.0,
                          l_thigh_deg=28.0, l_shin_deg=34.0, r_thigh_deg=-20.0, r_shin_deg=24.0,
                          grip_x=58.0, grip_y=-14.0, weapon_deg=-14.0, grip_sep=36.0,
                          halo_grand=True, foot_y=96.0)),
                (29, dict(torso_deg=5.0, grip_x=48.0, grip_y=-12.0, weapon_deg=-42.0, foot_y=99.0)),
            ]
            cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.0)
            if 6 <= f <= 23:
                cfg["pelvis_dy"] += math.sin(ph * 2.0) * 6.0
                cfg["grip_y"] += math.sin(ph * 2.0) * 3.0
                apply_2h_scythe_ik(cfg)
            cfgs.append(cfg)

        elif row_idx == 7:
            # Row 7: CROUCH — Predatory Wraith Crouch & Rising 2H Great-Scythe Uppercut (ZERO baked floor ring!)
            kfs = [
                (0, dict(torso_deg=3.0, grip_x=48.0, grip_y=-12.0, weapon_deg=-42.0)),
                (7, dict(pelvis_dx=-6.0, pelvis_dy=76.0, torso_deg=20.0, head_rel_deg=-10.0,
                         l_thigh_deg=-34.0, l_shin_deg=36.0, r_thigh_deg=32.0, r_shin_deg=-26.0,
                         grip_x=54.0, grip_y=-4.0, weapon_deg=22.0, grip_sep=34.0, halo_grand=True)),
                (11, dict(pelvis_dx=-4.0, pelvis_dy=70.0, torso_deg=16.0, head_rel_deg=-8.0,
                          l_thigh_deg=-32.0, l_shin_deg=34.0, r_thigh_deg=30.0, r_shin_deg=-24.0,
                          grip_x=56.0, grip_y=-8.0, weapon_deg=24.0, grip_sep=34.0, halo_grand=True)),
                (18, dict(pelvis_dx=14.0, pelvis_dy=14.0, torso_deg=-12.0, head_rel_deg=-6.0,
                          l_thigh_deg=18.0, l_shin_deg=16.0, r_thigh_deg=-20.0, r_shin_deg=16.0,
                          grip_x=56.0, grip_y=-68.0, weapon_deg=-70.0, grip_sep=34.0,
                          hook_sign=-1.0, halo_grand=True)),
                (29, dict(torso_deg=3.0, grip_x=48.0, grip_y=-12.0, weapon_deg=-42.0, hook_sign=1.0)),
            ]
            cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.5)
            if 12 <= f <= 20:
                cfg["slash_arc"] = dict(dx=4.0, dy=10.0, r=25.5, a0=62.0, a1=-72.0, intensity=1.25)
            cfgs.append(cfg)

        elif row_idx == 8:
            # Row 8: JUMP — Reaper's Aerial Vault & Falling Guillotine Cleave
            kfs = [
                (0, dict(torso_deg=3.0, grip_x=48.0, grip_y=-12.0, weapon_deg=-42.0, foot_y=99.0)),
                (11, dict(pelvis_dx=4.0, pelvis_dy=10.0, torso_deg=-14.0, head_rel_deg=8.0,
                          l_thigh_deg=26.0, l_shin_deg=36.0, r_thigh_deg=-16.0, r_shin_deg=28.0,
                          grip_x=26.0, grip_y=-92.0, weapon_deg=-100.0, grip_sep=32.0,
                          foot_y=91.0, halo_grand=True)),
                (19, dict(pelvis_dx=16.0, pelvis_dy=46.0, torso_deg=24.0, head_rel_deg=-10.0,
                          l_thigh_deg=-22.0, l_shin_deg=24.0, r_thigh_deg=22.0, r_shin_deg=-18.0,
                          grip_x=60.0, grip_y=-4.0, weapon_deg=18.0, grip_sep=36.0,
                          foot_y=99.0, halo_grand=True)),
                (29, dict(torso_deg=3.0, grip_x=48.0, grip_y=-12.0, weapon_deg=-42.0, foot_y=99.0)),
            ]
            cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.0)
            if 15 <= f <= 21:
                cfg["slash_arc"] = dict(dx=4.0, dy=10.0, r=25.5, a0=-86.0, a1=46.0, intensity=1.25)
            cfgs.append(cfg)

    return cfgs


def main():
    parts = load_and_segment_512()
    picks = [
        (0, 0, "R0 ARCH-REAPER GUARD"),
        (1, 4, "R1 DEATH-MARCH STRIDE"),
        (2, 13, "R2 CRESCENT REAP"),
        (3, 6, "R3 SOUL SEVER CHAIN"),
        (4, 6, "R4 OBLIVION INVOCATION"),
        (4, 22, "R4 MEMENTO GUILLOTINE"),
        (5, 25, "R5 PRONE FLOOR REST"),
        (7, 17, "R7 GRAVE UPPERCUT"),
    ]
    build_and_save_30fps_sheet(
        "reaper", parts, build_row_configs, render_frame,
        OUT_SHEET_PATH, VFX_SHEET_PATH, ARTIFACT_DIR,
        shimmer_cols=(C_CRIM_LIT, C_MAG_LIT), showcase_picks=picks,
    )


if __name__ == "__main__":
    main()
