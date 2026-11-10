#!/usr/bin/env python3
"""
Builds Malakor v4 (Reaper — Horned Dread Necromancer Sovereign & Harvester of the Necropolis)
30fps HD-2D Sprite Sheet (`assets/sprites/reaper_sheet.png`, 6240x1872, 30 cols x 9 rows of 208x208)
using `assets/sprites/reaper_v4_base.jpg` + `hd2d_rig_core`.

Key Features:
- Extracts from `assets/sprites/reaper_v4_base.jpg` (`1024x1024`) via BFS exterior + interior pocket
  white removal, 3-pass anti-aliased fringe stripping, and multi-zone `MedianFilter` cel-flattening.
- Clean 14-part Dread Necromancer Sovereign skeletal rig (`0` unassigned foreground pixels):
  * `head`: horned obsidian-crimson skull-helm & spiked dread crown with glowing amethyst eye sockets
  * `torso`: obsidian-crimson ribbed breastplate with glowing amethyst rune, belt & jagged front tabard
  * `mane`: tattered crimson-obsidian necropolis cape streaming behind shoulders/waist
  * `l_coat`: left amethyst-rune hip tasset & crimson side-fauld
  * `l_sode`, `l_forearm` / `r_sode`, `r_forearm`: rune-etched obsidian pauldrons & gauntlets
  * `l_thigh`, `l_shin`, `l_foot` / `r_thigh`, `r_shin`, `r_foot`: separated rune-armored greaves & sabatons
- Curated 20-color Obsidian / Crimson / Amethyst-Violet / Bone `MASTER_PALETTE` + 2-pass cardinal orphan
  despeckle + interior pinhole fill + 1px dark directional Selout outline.
- Back attachment: Floating **Abyssal Soul-Lantern & Necrotic Halo** behind shoulders.
- Articulated 2H weapon: **Cursed Bone-and-Obsidian Crescent Great-Scythe** with per-frame 2-Bone Analytical IK
  locking both gauntlets cleanly onto the long shaft across sweeping reaps, overhead guillotines, chain-casts,
  and horizontal floor rest on `Row 5 DEATH F18..F29`.
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

BASE_IMG_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "reaper_v4_base.jpg")
OUT_SHEET_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "reaper_sheet.png")
VFX_SHEET_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "reaper_vfx.png")

# Strict 20-Color Curated Obsidian / Crimson / Amethyst-Violet / Bone Master Palette
MASTER_PALETTE = np.array([
    [8, 4, 14],       # 0: Abyssal Void Outline (#08040e)
    [22, 10, 26],     # 1: Dark Obsidian-Plum Selout (#160a1a)
    [37, 22, 42],     # 2: Deep Obsidian Dread-Plate Shadow (#25162a)
    [58, 38, 72],     # 3: Forged Obsidian-Steel Base (#3a2648)
    [84, 58, 98],     # 4: Lit Obsidian-Slate Midtone (#543a62)
    [122, 92, 138],   # 5: Specular Obsidian Rim Gleam (#7a5c8a)
    [62, 14, 32],     # 6: Deep Dried-Blood Mantle Shadow (#3e0e20)
    [96, 24, 48],     # 7: Sovereign Crimson Cape & Armor Trim Base (#601830)
    [142, 42, 66],    # 8: Lit Blood-Crimson Trim & Tabard Midtone (#8e2a42)
    [192, 64, 92],    # 9: Blazing Crimson Edge Highlight (#c0405c)
    [82, 68, 64],     # 10: Deep Cranium & Jaw Cavity Bone Shadow (#524440)
    [126, 108, 98],   # 11: Aged Necropolis Skull & Vertebra Base (#7e6c62)
    [174, 156, 138],  # 12: Lit Skull-Helm & Scythe-Bone Highlight (#ae9c8a)
    [222, 208, 192],  # 13: Polished Ivory-Bone Fang & Razor Spine (#ded0c0)
    [76, 24, 118],    # 14: Deep Amethyst Soul-Channel (#4c1876)
    [118, 46, 178],   # 15: Sovereign Amethyst Rune & Lantern Base (#762eb2)
    [164, 82, 232],   # 16: Luminous Amethyst-Violet Eye & Armor Rune (#a452e8)
    [212, 142, 252],  # 17: Radiant Lavender Soul-Blade Bevel (#d48efc)
    [244, 63, 128],   # 18: Crimson-Rose Execution Spark & Soul Gem (#f43f80)
    [250, 236, 255],  # 19: White-Hot Soul-Core & Razor Cutting Edge (#faecff)
], dtype=np.int32)

C_OUT = (8, 4, 14, 255)
C_SEL = (22, 10, 26, 255)
C_OBS_DARK = (37, 22, 42, 255)
C_OBS_BASE = (58, 38, 72, 255)
C_OBS_MID = (84, 58, 98, 255)
C_OBS_LIT = (122, 92, 138, 255)
C_CRIM_DARK = (62, 14, 32, 255)
C_CRIM_BASE = (96, 24, 48, 255)
C_CRIM_MID = (142, 42, 66, 255)
C_CRIM_LIT = (192, 64, 92, 255)
C_BONE_DARK = (82, 68, 64, 255)
C_BONE_MID = (126, 108, 98, 255)
C_BONE_LIT = (174, 156, 138, 255)
C_BONE_SPEC = (222, 208, 192, 255)
C_VIO_DARK = (76, 24, 118, 255)
C_VIO_BASE = (118, 46, 178, 255)
C_VIO_LIT = (164, 82, 232, 255)
C_VIO_SPEC = (212, 142, 252, 255)
C_ROSE = (244, 63, 128, 255)
C_CORE = (250, 236, 255, 255)

# Skeletal pivots in 512x512 rig space (0.5x of 1024x1024 reaper_v4_base.jpg)
PIVOTS = dict(
    pelvis=(265.0, 240.0), neck=(265.0, 122.0), mane=(206.0, 272.0),
    l_sh=(208.0, 128.0), l_elb=(176.0, 196.0), l_hand=(179.0, 274.0),
    r_sh=(299.0, 137.0), r_elb=(309.0, 202.0), r_hand=(336.0, 268.0),
    l_hip=(229.0, 270.0), l_knee=(211.0, 343.0), l_ank=(180.0, 438.0),
    r_hip=(294.0, 270.0), r_knee=(312.0, 338.0), r_ank=(307.0, 431.0),
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
    protect_indices=(9, 12, 13, 15, 16, 17, 18, 19),
    hair_indices=(6, 7, 8),
    lit_selout=1,
    shad_selout=0,
    hair_selout=0,
    joint_fill=(22, 10, 26, 255),
    joint_inner=(37, 22, 42, 255),
    hip_r=20,
    thigh_r=16,
    arm_r=14,
    pinhole_fill=(37, 22, 42, 255),
)


def put_px_safe(arr, x, y, col):
    """Strictly clamps drawn pixels inside x in [4..99], y in [4..99] on the 104x104 canvas."""
    ix, iy = int(round(x)), int(round(y))
    if 4 <= ix <= 99 and 4 <= iy <= 99:
        arr[iy, ix] = col


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
    Solves per-frame 2-Bone IK so BOTH of Malakor's rune-etched gauntlets lock cleanly onto the
    long shaft of his Cursed Bone-and-Obsidian Crescent Great-Scythe (`r_hand` main grip +
    `l_hand` secondary grip along `-u`), or in `chain_cast_mode` (`Row 3 F01..F14`), extends
    `l_hand` forward to fire/yank the serrated Grave-Chain while `r_hand` cocks the Great-Scythe!
    """
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
            pel[0] + cfg.get("chain_lx", 90.0),
            pel[1] + cfg.get("chain_ly", -40.0),
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
        cfg["right_arm_in_front"] = (grip_y < -62.0) or (grip_x > 54.0)
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
        "halo_active", "halo_grand", "two_handed_ik", "chain_cast_mode",
        "chain_active", "hook_sign", "shadow_mantle", "resting_scythe_floor",
    ) + tuple(extra_meta_keys)
    for mk in all_meta:
        if mk in active_d:
            out[mk] = active_d[mk]

    out["mane_wave_phase"] = ph * wave_mult
    return apply_2h_scythe_ik(out)


def save_debug_parts_sheet(parts, out_path):
    """Saves a 5x3 contact sheet of all 14 segmented rig parts on a contrasting slate-indigo grid."""
    names = [
        "mane", "head", "torso", "l_coat", "l_sode",
        "l_forearm", "r_sode", "r_forearm", "l_thigh", "l_shin",
        "l_foot", "r_thigh", "r_shin", "r_foot",
    ]
    cw, ch = 220, 220
    pad = 16
    im = Image.new("RGBA", (5 * (cw + pad) + pad, 3 * (ch + pad + 20) + pad), (20, 14, 30, 255))
    d = ImageDraw.Draw(im)
    for idx, nm in enumerate(names):
        c = idx % 5
        r = idx // 5
        ox = pad + c * (cw + pad)
        oy = pad + 20 + r * (ch + pad + 20)
        d.rectangle([ox, oy, ox + cw, oy + ch], fill=(38, 26, 56, 255), outline=(104, 72, 148, 255), width=1)
        if nm in parts:
            pim, _, _ = parts[nm]
            pw, ph = pim.size
            d.text((ox + 2, oy - 16), f"{nm} ({pw}x{ph})", fill=(248, 225, 255, 255))
            scale = min(1.0, (cw - 16) / max(1, pw), (ch - 16) / max(1, ph))
            if scale < 1.0:
                pim = pim.resize((max(1, int(pw * scale)), max(1, int(ph * scale))), Image.Resampling.NEAREST)
            px = ox + (cw - pim.size[0]) // 2
            py = oy + (ch - pim.size[1]) // 2
            im.alpha_composite(pim, (px, py))
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    im.save(out_path)


def extract_clean_v4_base_512(img_path):
    """
    Loads `assets/sprites/reaper_v4_base.jpg` (`1024x1024` on `#FFFFFF`), strips all exterior
    and enclosed interior white background pockets via BFS + 3-pass anti-aliased fringe stripping,
    downsamples 2x NEAREST to `512x512`, and applies multi-zone `MedianFilter` cel-flattening
    while keeping the skull-helm, dread crown, and glowing amethyst armor runes razor-sharp.
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

    is_white_bg = (
        ((r0 >= 232) & (g0 >= 232) & (b0 >= 232))
        | ((min_rgb >= 205) & ((max_rgb - min_rgb) < 28))
    )
    seed_mask = (r0 >= 242) & (g0 >= 242) & (b0 >= 242)

    visited = np.zeros((H0, W0), dtype=bool)
    q = deque()

    # Seed from all 4 image borders
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

    # Also seed from all enclosed pure-white pockets (between arms/torso, thumb gap, tattered skirt slits)
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
        edge = a0 & (~(up & dn & lf & rt))
        r = arr[:, :, 0].astype(np.int16)
        g = arr[:, :, 1].astype(np.int16)
        b = arr[:, :, 2].astype(np.int16)
        mx = np.maximum(np.maximum(r, g), b)
        mn = np.minimum(np.minimum(r, g), b)
        fringe = edge & (mn > 160) & ((mx - mn) < 34)
        arr[fringe] = [0, 0, 0, 0]

    im512 = Image.fromarray(arr, "RGBA").resize((512, 512), Image.Resampling.NEAREST)
    rgb512 = im512.convert("RGB")
    rgb_med3 = np.array(rgb512.filter(ImageFilter.MedianFilter(size=3)))
    rgb_med5 = np.array(rgb512.filter(ImageFilter.MedianFilter(size=5)))

    arr512 = np.array(im512)
    alpha = keep_largest_component(arr512[:, :, 3] > 0)
    arr512[~alpha] = [0, 0, 0, 0]

    # Preserve crisp 3x3 cel detail on horned skull-helm/chest AND glowing amethyst/crimson armor runes!
    raw_r = arr512[:, :, 0].astype(np.int16)
    raw_g = arr512[:, :, 1].astype(np.int16)
    raw_b = arr512[:, :, 2].astype(np.int16)
    is_rune_detail = ((raw_b > 135) & ((raw_b - raw_g) > 40)) | ((raw_r > 135) & ((raw_r - raw_g) > 55))
    yy = np.arange(512)[:, None]
    use_med3 = (yy < 185) | is_rune_detail
    cel_rgb = np.where(use_med3[:, :, None], rgb_med3, rgb_med5)
    arr512[:, :, :3] = np.where(alpha[:, :, None], cel_rgb, 0)
    return arr512


def load_and_segment_512():
    arr = extract_clean_v4_base_512(BASE_IMG_PATH)
    H, W = 512, 512

    # Trim only the low inner-cloak shadow pocket deep between the lower shins (y=748..875 in 1024)
    # while preserving 100% of the jagged crimson-violet front tabard and sweeping rear cape!
    trim_between_ankles = poly_mask(H, W, P([
        (444, 748), (572, 748), (572, 875), (432, 875)
    ]))
    arr[trim_between_ankles] = [0, 0, 0, 0]
    a = keep_largest_component(arr[:, :, 3] > 0)
    arr[~a] = [0, 0, 0, 0]

    # Boost luminous amethyst-violet eye sockets, crown gem, and armor runes so they read crisply at 104x104
    r_ch = arr[:, :, 0].astype(np.int16)
    g_ch = arr[:, :, 1].astype(np.int16)
    b_ch = arr[:, :, 2].astype(np.int16)
    vio_glow = a & (b_ch > 142) & ((b_ch - g_ch) > 45)
    vio_hot = vio_glow & (b_ch > 205)
    arr[vio_glow] = [164, 82, 232, 255]
    arr[vio_hot] = [212, 142, 252, 255]

    # Pinpoint white-lavender specular glint inside the skull-helm eye sockets & crown amethyst gem
    head_zone = poly_mask(H, W, P([(480, 125), (580, 125), (580, 205), (480, 205)]))
    eye_hot = head_zone & a & (b_ch > 168) & ((b_ch - g_ch) > 52)
    arr[eye_hot] = [250, 236, 255, 255]

    # 1. Head: Horned Obsidian-Crimson Skull-Helm & Spiked Dread Crown
    m_head = poly_mask(H, W, P([
        (444, 74), (610, 74), (610, 195), (582, 208),
        (576, 254), (512, 258), (482, 232), (474, 192), (444, 178)
    ])) & a

    # 2. Left Rune-Etched Pauldron (`l_sode`) & Spiked Vambrace/Gauntlet (`l_forearm`)
    m_l_sode = poly_mask(H, W, P([
        (334, 188), (480, 188), (486, 275), (455, 350), (408, 396), (334, 382)
    ])) & a & (~m_head)
    m_l_forearm = poly_mask(H, W, P([
        (296, 332), (408, 388), (404, 594), (322, 594), (296, 445)
    ])) & a & (~m_l_sode) & (~m_head)

    # 3. Right Rune-Etched Pauldron (`r_sode`) & Vambrace/Gauntlet (`r_forearm`)
    m_r_sode = poly_mask(H, W, P([
        (582, 200), (646, 200), (646, 402), (585, 406)
    ])) & a & (~m_head)
    m_r_forearm = poly_mask(H, W, P([
        (586, 396), (656, 392), (710, 515), (710, 588), (628, 588), (586, 462)
    ])) & a & (~m_r_sode) & (~m_head)

    # 4. Tattered Crimson-Obsidian Necropolis Cape (`mane`) streaming behind left hip/leg
    m_mane = poly_mask(H, W, P([
        (268, 575), (402, 575), (412, 650), (355, 760), (336, 845), (268, 845)
    ])) & a & (~m_l_sode) & (~m_l_forearm)

    # 5. Left Amethyst-Rune Hip Tasset & Crimson Side-Fauld (`l_coat`)
    m_l_coat = poly_mask(H, W, P([
        (386, 445), (498, 462), (494, 570), (435, 655), (382, 655)
    ])) & a & (~m_l_forearm) & (~m_l_sode) & (~m_mane)

    # 6. Torso: Obsidian-Crimson Ribbed Breastplate, Glowing Amethyst Chest Rune, Belt & Jagged Front Tabard
    m_torso = poly_mask(H, W, P([
        (432, 200), (596, 200), (592, 475), (586, 750),
        (490, 750), (492, 480), (432, 445)
    ])) & a & (~m_head) & (~m_l_sode) & (~m_l_forearm) & (~m_r_sode) & (~m_r_forearm) & (~m_l_coat)

    # 7. Separated Rune-Armored Greave Legs (`l_thigh`, `l_shin`, `l_foot`, `r_thigh`, `r_shin`, `r_foot`)
    m_l_foot = poly_mask(H, W, P([(304, 868), (412, 868), (412, 962), (304, 962)])) & a & (~m_mane)
    m_l_shin = poly_mask(H, W, P([(326, 652), (456, 652), (432, 872), (326, 872)])) & a & (~m_l_foot) & (~m_mane) & (~m_torso)
    m_l_thigh = poly_mask(H, W, P([(405, 535), (500, 535), (495, 682), (395, 682)])) & a & (~m_torso) & (~m_l_coat) & (~m_l_forearm) & (~m_l_shin) & (~m_l_foot) & (~m_mane)

    m_r_foot = poly_mask(H, W, P([(570, 852), (738, 852), (738, 936), (570, 936)])) & a
    m_r_shin = poly_mask(H, W, P([(572, 638), (678, 638), (676, 858), (572, 858)])) & a & (~m_r_foot) & (~m_torso)
    m_r_thigh = poly_mask(H, W, P([(574, 465), (655, 465), (664, 665), (574, 665)])) & a & (~m_torso) & (~m_r_forearm) & (~m_r_shin) & (~m_r_foot)

    # 14-Part Dread Necromancer Sovereign Rig (0 unassigned foreground pixels!)
    masks = assign_remaining_geodesic(a, [
        ("mane", m_mane), ("head", m_head), ("torso", m_torso),
        ("l_coat", m_l_coat),
        ("l_sode", m_l_sode), ("l_forearm", m_l_forearm),
        ("r_sode", m_r_sode), ("r_forearm", m_r_forearm),
        ("l_thigh", m_l_thigh), ("l_shin", m_l_shin), ("l_foot", m_l_foot),
        ("r_thigh", m_r_thigh), ("r_shin", m_r_shin), ("r_foot", m_r_foot),
    ])

    parts = extract_parts_512(arr, masks)
    save_debug_parts_sheet(parts, os.path.join(ARTIFACT_DIR, "debug_reaper_v4_parts.png"))
    return parts


def draw_abyssal_lantern_and_halo_104(arr, nx, ny, ph, grand=False):
    """
    Draws Malakor's Back Attachment behind his shoulders:
    1. Revolving Spiked **Necrotic Halo** framing his horned skull-helm.
    2. Floating **Abyssal Soul-Lantern** hovering behind his rear shoulder on a wrought-iron
       chain, housing a flickering amethyst-violet & white-hot soul-flame core!
    """
    # 1. Spiked Necrotic Halo behind head & shoulders
    cx = max(18.0, min(84.0, nx - 1.8))
    cy = max(16.0, min(82.0, ny - 3.5))
    rx = 15.2 if grand else 13.4
    ry = 11.6 if grand else 10.2
    n_pts = 40 if grand else 32
    for k in range(n_pts):
        ang = (k / float(n_pts)) * 2.0 * math.pi + ph * 0.5
        px = cx + math.cos(ang) * rx
        py = cy + math.sin(ang) * ry
        col = C_VIO_LIT if k % 3 == 0 else (C_CRIM_MID if k % 5 == 0 else C_OBS_DARK)
        put_px_safe(arr, px, py, col)

    for k in range(6):
        ang = ph + k * (math.pi / 3.0)
        sx = cx + math.cos(ang) * (rx + 2.0)
        sy = cy + math.sin(ang) * (ry + 1.6)
        put_px_safe(arr, sx + 1, sy, C_OUT)
        put_px_safe(arr, sx - 1, sy, C_OUT)
        put_px_safe(arr, sx, sy - 1, C_OUT)
        put_px_safe(arr, sx, sy + 1, C_OUT)
        put_px_safe(arr, sx, sy, C_CORE if (grand and k % 2 == 0) else (C_ROSE if k % 2 == 0 else C_VIO_LIT))

    # 2. Floating Abyssal Soul-Lantern hovering behind rear (left) shoulder
    bob = math.sin(ph) * 1.4
    sway = math.cos(ph) * 0.8
    lx = max(11.0, min(86.0, nx - 14.5 + sway))
    ly = max(15.0, min(82.0, ny + 3.5 + bob))

    # Curved obsidian-iron crook & hanging chain above lantern
    put_px_safe(arr, lx + 2, ly - 7, C_OUT)
    put_px_safe(arr, lx + 1, ly - 7, C_BONE_MID)
    put_px_safe(arr, lx, ly - 6, C_OBS_MID)
    put_px_safe(arr, lx, ly - 5, C_BONE_LIT)
    put_px_safe(arr, lx, ly - 4, C_OUT)

    # Pointed Gothic iron-and-bone lantern roof cap (y = ly-3 .. ly-2)
    for dx in range(-2, 3):
        put_px_safe(arr, lx + dx, ly - 3, C_OUT if abs(dx) == 2 else C_CRIM_MID)
    for dx in range(-3, 4):
        put_px_safe(arr, lx + dx, ly - 2, C_OUT if abs(dx) == 3 else (C_BONE_LIT if dx == 0 else C_OBS_BASE))

    # Wrought-iron barred lantern cage housing blazing Amethyst Soul-Flame (y = ly-1 .. ly+3)
    flicker = 1 if math.sin(ph * 2.0) >= 0.0 else 0
    for dy in range(-1, 4):
        for dx in range(-3, 4):
            adx = abs(dx)
            if adx == 3:
                col = C_OUT
            elif adx == 2:
                col = C_OBS_MID if dy % 2 == 0 else C_OBS_DARK
            elif dy == 1 and dx == 0:
                col = C_CORE
            elif adx <= 1 and (-1 + flicker * 0 <= dy <= 2):
                col = C_CORE if (dy == 0 and dx == 0 and grand) else (C_VIO_SPEC if adx == 0 else C_VIO_LIT)
            else:
                col = C_VIO_BASE if adx <= 1 else C_OBS_DARK
            put_px_safe(arr, lx + dx, ly + dy, col)

    # Lantern base plate & pointed bone finial spike (y = ly+4 .. ly+6)
    for dx in range(-3, 4):
        put_px_safe(arr, lx + dx, ly + 4, C_OUT if abs(dx) == 3 else C_CRIM_BASE)
    for dx in range(-1, 2):
        put_px_safe(arr, lx + dx, ly + 5, C_OUT if abs(dx) == 1 else C_BONE_LIT)
    put_px_safe(arr, lx, ly + 6, C_OUT)

    # Rising spectral wisp motes above the Soul-Lantern
    wisp_y = ly - 8 - (int(ph * 2.0) % 3)
    put_px_safe(arr, lx - 2, wisp_y, C_VIO_LIT)
    if grand:
        put_px_safe(arr, lx + 2, wisp_y - 1, C_ROSE)


def draw_2h_soulreaper_greatscythe_104(
    arr, hx, hy, scythe_deg, hook_sign=1.0, glow=1.0, phase=0.0, show_gauntlets=True, scale_len=1.0, blade_flat=1.0
):
    """
    Draws Malakor's articulated 2H **Cursed Bone-and-Obsidian Crescent Great-Scythe**:
    1. Long curved obsidian-iron & vertebrated-bone shaft (`da` from `-16` to `+34`) with bone
       vertebra rings and spiked soul-gem pommel.
    2. Horned Demon-Skull Collar at the blade junction (`da in [28..35]`) with blazing soul-gem eye.
    3. Massive Curved Bone-and-Obsidian Crescent Great-Scythe Blade (`dp` from `-4` to `+38`),
       with serrated bone dorsal spine, obsidian fuller, glowing crimson/amethyst soul-runes,
       razor-white inner cutting edge, and crisp 1px `#08040e` dark selective outline.
    4. Two rune-etched armored gauntlet clasps locked onto the shaft (`da = 0.0` and `da = -7.2`).
    """
    rad = math.radians(scythe_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    nx, ny = -uy * hook_sign, ux * hook_sign

    hx = max(18.0, min(72.0, hx))
    hy = max(18.0, min(95.0, hy))

    # -------------------------------------------------------------------------
    # 1. Curved Obsidian-Iron & Vertebrated-Bone Snath Shaft (da from -16 to +34)
    # -------------------------------------------------------------------------
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
                col = C_CORE if adp < 0.42 else C_ROSE
            elif adp >= half_w - 0.48:
                col = C_OUT
            elif adp <= 0.44:
                col = C_BONE_SPEC if is_bone_ring else (C_VIO_LIT if (glow > 0.5 and int(abs(da_raw)) % 3 == 0) else C_OBS_MID)
            elif dp_rel < 0.0:
                col = C_BONE_LIT if is_bone_ring else C_CRIM_MID
            else:
                col = C_BONE_MID if is_bone_ring else C_OBS_DARK
            put_px_safe(arr, px, py, col)

    # -------------------------------------------------------------------------
    # 2. Massive Curved Bone-and-Obsidian Crescent Great-Scythe Blade
    # -------------------------------------------------------------------------
    for dp_raw in np.linspace(-4.0, 38.0, 96):
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
                col = C_OUT if on_edge else (C_CRIM_LIT if abs(da_raw - da_mid) < 0.6 else C_OBS_MID)
                put_px_safe(arr, px, py, col)
            continue

        u = dp_raw / 38.0
        da_outer_raw = 34.8 + 1.8 * math.sin(u * math.pi * 0.58) - 22.8 * (u ** 1.68)
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
            px = max(5.0, min(98.0, hx + ux * da + nx * dp))
            py = max(5.0, min(98.0, hy + uy * da + ny * dp))

            v = (da_raw - da_inner_raw) / max(0.6, chord_raw)
            is_rune = (0.38 <= v <= 0.68) and (0.08 <= u <= 0.84) and (abs((dp_raw - 2.0) % 4.6 - 2.3) < 0.85)

            if u >= 0.96 or v >= 0.89:
                col = C_OUT
            elif v < 0.14:
                col = C_CORE if glow > 0.35 else C_BONE_SPEC
            elif v < 0.27:
                col = C_ROSE if glow > 0.3 else C_VIO_LIT
            elif v < 0.44:
                col = C_VIO_SPEC if (u < 0.55 and v < 0.34) else C_VIO_LIT
            elif is_rune and glow > 0.3:
                col = C_CORE if abs(v - 0.52) < 0.08 else C_CRIM_LIT
            elif v < 0.68:
                col = C_OBS_BASE if u < 0.65 else C_OBS_DARK
            else:
                col = C_BONE_LIT if v < 0.78 else C_BONE_MID

            put_px_safe(arr, px, py, col)

    # -------------------------------------------------------------------------
    # 3. Horned Demon-Skull Collar at Blade Junction (da in [28..35])
    # -------------------------------------------------------------------------
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
    # 4. Two Rune-Etched Obsidian-Crimson Gauntlet Clasps (da=0.0 + da=-7.2)
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
                        col = C_CRIM_LIT if n_off <= 0 else C_CRIM_BASE
                    elif abs(n_off) <= 0.5:
                        col = C_VIO_LIT if is_lower else C_ROSE
                    else:
                        col = C_OBS_LIT if n_off < 0 else C_OBS_BASE
                    put_px_safe(arr, px, py, col)


def draw_spectral_bone_chain_104(arr, lh_x, lh_y, reach_px, phase=0.0):
    """
    Draws Malakor's Serrated Spectral Grave-Chain & Articulated Skeletal Claw launched from
    `l_hand` during Row 3 (`DEATH'S GRASP: CHAIN-YANK & OSSUARY CAGE`)!
    """
    x0 = max(8.0, min(88.0, lh_x))
    y0 = max(12.0, min(88.0, lh_y))
    x1 = max(x0 + 8.0, min(94.0, x0 + reach_px))
    y1 = y0 - 2.0

    n_links = 16
    for i in range(n_links + 1):
        u = i / float(n_links)
        cx = x0 + (x1 - x0) * u
        cy = y0 + (y1 - y0) * u + math.sin(u * math.pi * 2.0 + phase) * 2.0 * (1.0 - 0.35 * u)
        if i % 2 == 0:
            put_px_safe(arr, cx, cy - 1, C_OUT)
            put_px_safe(arr, cx, cy + 1, C_OUT)
            put_px_safe(arr, cx, cy, C_BONE_SPEC)
        else:
            put_px_safe(arr, cx, cy, C_ROSE if (i % 4 == 1) else C_VIO_LIT)

    # Articulated 3-Finger Skeletal Bone-Claw at chain tip
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
    """Draws a 2.5D Necrotic Shadow Pool at Malakor's feet during Grave-Submerge."""
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
    Reports extreme points of both the Floating Abyssal Soul-Lantern / Necrotic Halo AND
    the 2H Cursed Bone-and-Obsidian Crescent Great-Scythe to `render_rig_104` so every single
    frame stays cleanly inside `[5..98]` with `0/270` border clips!
    """
    pts = []
    if cfg.get("halo_active", True):
        nk = joints_c["neck"]
        pts.append((nk[0] - 20.5 / scale, nk[1] - 17.5 / scale))
        pts.append((nk[0] + 15.5 / scale, nk[1] - 17.5 / scale))

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
            rh[0] + ux * (32.0 * sl / scale) + nx * (20.0 * sl / scale),
            rh[1] + uy * (32.0 * sl / scale) + ny * (20.0 * sl / scale),
        ))
        pts.append((
            rh[0] + ux * (12.0 * sl / scale) + nx * (38.5 * sl / scale),
            rh[1] + uy * (12.0 * sl / scale) + ny * (38.5 * sl / scale),
        ))
    return pts


def draw_back(bg104, joints104, cfg):
    ph = cfg.get("mane_wave_phase", 0.0)
    if cfg.get("halo_active", True):
        nk = joints104["neck"]
        draw_abyssal_lantern_and_halo_104(bg104, nk[0], nk[1], ph, grand=cfg.get("halo_grand", False))


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

    if cfg.get("resting_scythe_floor", False):
        # Row 5 DEATH F18..F29: Horizontal floor rest beside fallen Malakor (zero floating upright weapon!)
        draw_2h_soulreaper_greatscythe_104(
            out, 38.0, 94.0,
            scythe_deg=1.5, hook_sign=-1.0, glow=cfg.get("weapon_glow", 0.25),
            phase=ph, show_gauntlets=False, scale_len=0.76, blade_flat=0.30,
        )
    elif cfg.get("planted_weapon", False):
        # Row 5 DEATH F08..F17: Kneeling collapse lowering the Great-Scythe onto the stone floor
        rh = joints104["r_hand"]
        px_plant = max(34.0, min(52.0, rh[0] - 4.0))
        py_plant = max(84.0, min(93.0, rh[1] + 2.0))
        draw_2h_soulreaper_greatscythe_104(
            out, px_plant, py_plant,
            scythe_deg=8.0, hook_sign=-1.0, glow=cfg.get("weapon_glow", 0.45),
            phase=ph, show_gauntlets=True, scale_len=0.78, blade_flat=0.65,
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


DEFAULTS = dict(
    pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=3.0, head_rel_deg=-1.5, mane_rel_deg=-2.0,
    mane_wave_amp=5.0, mane_in_front=False,
    l_thigh_deg=-2.0, l_shin_deg=2.0, l_foot_deg=0.0,
    r_thigh_deg=2.0, r_shin_deg=-2.0, r_foot_deg=0.0,
    l_sode_rel_deg=12.0, l_fore_rel_deg=8.0, r_sode_rel_deg=10.0, r_fore_rel_deg=-8.0,
    l_coat_rel_deg=0.0, r_coat_rel_deg=0.0,
    grip_x=48.0, grip_y=-10.0, grip_sep=36.0,
    chain_lx=86.0, chain_ly=-38.0, chain_reach=26.0,
    weapon_deg=-40.0, weapon_len=24.0, weapon_scale=0.90, weapon_glow=1.0, foot_y=99.0,
    show_weapon=True, two_handed_ik=True, chain_cast_mode=False, chain_active=False,
    halo_active=True, halo_grand=False, right_arm_in_front=False, right_leg_behind=False,
    hook_sign=1.0, shadow_mantle=0.0, resting_scythe_floor=False,
)


def render_frame(parts, cfg):
    out = render_rig_104(
        parts, PIVOTS, cfg, PALETTE_CFG,
        y_bot_base=478.0, default_S=556,
        extra_extent_fn=extra_extents, draw_back_fn=draw_back, draw_front_fn=draw_front,
    )
    # Enforce 4px safe margin on all 4 edges in 104x104 (8px in 208x208) -> 0/270 boundary clips
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
            # Row 0: IDLE — Sovereign 2H Great-Scythe Guard, hovering Soul-Lantern & Necrotic Halo
            b = math.sin(ph)
            s = math.cos(ph)
            cfg = dict(DEFAULTS)
            cfg.update(
                pelvis_dx=s * 2.5, pelvis_dy=b * 7.0, torso_deg=3.0 + b * 2.0,
                head_rel_deg=-1.5 - b * 1.2, mane_rel_deg=-2.0 + s * 3.0,
                mane_wave_phase=ph, mane_wave_amp=5.5,
                grip_x=48.0 + s * 2.5, grip_y=-10.0 + b * 4.0,
                weapon_deg=-40.0 + b * 3.5, weapon_glow=0.85 + 0.15 * b,
                foot_y=99.0,
            )
            cfgs.append(apply_2h_scythe_ik(cfg))

        elif row_idx == 1:
            # Row 1: WALK — Relentless Dread-Sovereign Two-Step Armored Stride
            st = math.sin(ph)
            kl = math.cos(ph)
            cfg = dict(DEFAULTS)
            cfg.update(
                pelvis_dy=abs(st) * 16.0, torso_deg=7.5 + abs(st) * 2.5, head_rel_deg=-3.5,
                mane_rel_deg=-5.0 - abs(st) * 4.0, mane_wave_phase=ph * 2.0, mane_wave_amp=6.5,
                right_leg_behind=(f >= 15),
                l_thigh_deg=st * 24.0, l_shin_deg=max(0.0, st * 25.0) + max(0.0, kl * 13.0), l_foot_deg=st * 11.0,
                r_thigh_deg=-st * 24.0, r_shin_deg=max(0.0, -st * 25.0) + max(0.0, -kl * 13.0), r_foot_deg=-st * 11.0,
                grip_x=50.0 + st * 4.5, grip_y=-8.0 + abs(st) * 4.5,
                weapon_deg=-36.0 + st * 8.0, foot_y=99.0,
            )
            cfgs.append(apply_2h_scythe_ik(cfg))

        elif row_idx == 2:
            # Row 2: AUTO_ATTACK — 2H Soul-Harvester Scythe Combo (Wide Reap & Overhead Guillotine)
            kfs = [
                (0, dict(pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=3.0, head_rel_deg=-1.5,
                         l_thigh_deg=-2.0, l_shin_deg=2.0, r_thigh_deg=2.0, r_shin_deg=-2.0,
                         grip_x=48.0, grip_y=-10.0, weapon_deg=-40.0, grip_sep=36.0, hook_sign=1.0)),
                (6, dict(pelvis_dx=-14.0, pelvis_dy=26.0, torso_deg=-14.0, head_rel_deg=8.0,
                         l_thigh_deg=-18.0, l_shin_deg=18.0, r_thigh_deg=18.0, r_shin_deg=-12.0,
                         grip_x=16.0, grip_y=-46.0, weapon_deg=-102.0, grip_sep=32.0,
                         halo_grand=True, hook_sign=1.0)),
                (13, dict(pelvis_dx=14.0, pelvis_dy=42.0, torso_deg=22.0, head_rel_deg=-10.0,
                          l_thigh_deg=22.0, l_shin_deg=18.0, r_thigh_deg=-24.0, r_shin_deg=18.0,
                          grip_x=62.0, grip_y=-6.0, weapon_deg=14.0, grip_sep=36.0,
                          halo_grand=True, hook_sign=1.0)),
                (20, dict(pelvis_dx=10.0, pelvis_dy=24.0, torso_deg=-6.0, head_rel_deg=6.0,
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
            # Row 3: SKILL — Death's Grasp Chain-Yank & Execution Reap
            kfs = [
                (0, dict(torso_deg=3.0, grip_x=48.0, grip_y=-10.0, weapon_deg=-40.0,
                         chain_cast_mode=False, chain_active=False)),
                (5, dict(pelvis_dx=10.0, pelvis_dy=30.0, torso_deg=14.0, head_rel_deg=-8.0,
                         l_thigh_deg=18.0, l_shin_deg=16.0, r_thigh_deg=-18.0, r_shin_deg=16.0,
                         grip_x=-14.0, grip_y=-38.0, weapon_deg=-118.0,
                         chain_cast_mode=True, chain_active=True,
                         chain_lx=96.0, chain_ly=-40.0, chain_reach=30.0, halo_grand=True)),
                (9, dict(pelvis_dx=12.0, pelvis_dy=32.0, torso_deg=16.0, head_rel_deg=-8.0,
                         l_thigh_deg=20.0, l_shin_deg=18.0, r_thigh_deg=-20.0, r_shin_deg=16.0,
                         grip_x=-18.0, grip_y=-42.0, weapon_deg=-124.0,
                         chain_cast_mode=True, chain_active=True,
                         chain_lx=102.0, chain_ly=-38.0, chain_reach=34.0, halo_grand=True)),
                (14, dict(pelvis_dx=-12.0, pelvis_dy=38.0, torso_deg=-12.0, head_rel_deg=8.0,
                          l_thigh_deg=-20.0, l_shin_deg=22.0, r_thigh_deg=20.0, r_shin_deg=-14.0,
                          grip_x=18.0, grip_y=-46.0, weapon_deg=-98.0,
                          chain_cast_mode=True, chain_active=True,
                          chain_lx=42.0, chain_ly=-26.0, chain_reach=18.0, halo_grand=True)),
                (19, dict(pelvis_dx=16.0, pelvis_dy=48.0, torso_deg=24.0, head_rel_deg=-12.0,
                          l_thigh_deg=-24.0, l_shin_deg=24.0, r_thigh_deg=24.0, r_shin_deg=-18.0,
                          grip_x=62.0, grip_y=-4.0, weapon_deg=18.0, grip_sep=36.0,
                          chain_cast_mode=False, chain_active=False, halo_grand=True)),
                (24, dict(pelvis_dx=10.0, pelvis_dy=28.0, torso_deg=12.0, head_rel_deg=-6.0,
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
            # Row 4: ULTIMATE / TRUE_ULTIMATE — Sovereign Ascension & Overhead Memento Mori Guillotine
            kfs = [
                (0, dict(pelvis_dx=0.0, pelvis_dy=32.0, torso_deg=-6.0, head_rel_deg=4.0,
                         grip_x=38.0, grip_y=-32.0, weapon_deg=-68.0, grip_sep=34.0,
                         foot_y=99.0, halo_grand=True)),
                (6, dict(pelvis_dx=-4.0, pelvis_dy=12.0, torso_deg=-14.0, head_rel_deg=10.0,
                         l_thigh_deg=18.0, l_shin_deg=26.0, r_thigh_deg=-14.0, r_shin_deg=22.0,
                         grip_x=28.0, grip_y=-94.0, weapon_deg=-102.0, grip_sep=32.0,
                         foot_y=93.0, halo_grand=True)),
                (13, dict(pelvis_dx=12.0, pelvis_dy=28.0, torso_deg=18.0, head_rel_deg=-8.0,
                          l_thigh_deg=22.0, l_shin_deg=20.0, r_thigh_deg=-22.0, r_shin_deg=18.0,
                          grip_x=58.0, grip_y=-14.0, weapon_deg=8.0, grip_sep=36.0,
                          foot_y=95.0, halo_grand=True)),
                (17, dict(pelvis_dx=-6.0, pelvis_dy=14.0, torso_deg=-16.0, head_rel_deg=10.0,
                          l_thigh_deg=20.0, l_shin_deg=28.0, r_thigh_deg=-16.0, r_shin_deg=24.0,
                          grip_x=24.0, grip_y=-98.0, weapon_deg=-106.0, grip_sep=32.0,
                          foot_y=92.0, halo_grand=True)),
                (22, dict(pelvis_dx=14.0, pelvis_dy=52.0, torso_deg=24.0, head_rel_deg=-12.0,
                          l_thigh_deg=-24.0, l_shin_deg=26.0, r_thigh_deg=24.0, r_shin_deg=-18.0,
                          grip_x=58.0, grip_y=-2.0, weapon_deg=16.0, grip_sep=36.0,
                          foot_y=99.0, halo_grand=True, shadow_mantle=0.95)),
                (26, dict(pelvis_dx=10.0, pelvis_dy=40.0, torso_deg=16.0, head_rel_deg=-8.0,
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
            # Row 5: DEATH — Grounded stagger (F00..F06), knee buckle (F07..F17),
            # horizontal prone rest with Great-Scythe resting horizontally on floor (F18..F29)
            kfs = make_prone_knight_death_kfs(
                idle_weapon_deg=-40.0, plant_x=52.0, plant_y=90.0, use_planted_weapon=True, mane_front=False
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
            if f >= 18:
                cfg["resting_scythe_floor"] = True
                cfg["planted_weapon"] = False
            cfgs.append(cfg)

        elif row_idx == 6:
            # Row 6: DASH — Aerodynamic Wraith Shadow-Rush (zero baked stick-speedlines!)
            kfs = [
                (0, dict(torso_deg=5.0, grip_x=48.0, grip_y=-10.0, weapon_deg=-40.0, foot_y=99.0)),
                (6, dict(pelvis_dx=12.0, pelvis_dy=26.0, torso_deg=24.0, head_rel_deg=-12.0, mane_rel_deg=-14.0,
                         l_thigh_deg=26.0, l_shin_deg=32.0, r_thigh_deg=-18.0, r_shin_deg=24.0,
                         grip_x=56.0, grip_y=-16.0, weapon_deg=-18.0, grip_sep=36.0,
                         halo_grand=True, foot_y=96.0)),
                (23, dict(pelvis_dx=12.0, pelvis_dy=26.0, torso_deg=24.0, head_rel_deg=-12.0, mane_rel_deg=-14.0,
                          l_thigh_deg=26.0, l_shin_deg=32.0, r_thigh_deg=-18.0, r_shin_deg=24.0,
                          grip_x=56.0, grip_y=-16.0, weapon_deg=-18.0, grip_sep=36.0,
                          halo_grand=True, foot_y=96.0)),
                (29, dict(torso_deg=5.0, grip_x=48.0, grip_y=-10.0, weapon_deg=-40.0, foot_y=99.0)),
            ]
            cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.0)
            if 6 <= f <= 23:
                cfg["pelvis_dy"] += math.sin(ph * 2.0) * 6.0
                cfg["grip_y"] += math.sin(ph * 2.0) * 3.0
                apply_2h_scythe_ik(cfg)
            cfgs.append(cfg)

        elif row_idx == 7:
            # Row 7: CROUCH — Grave-Submerge & Rising 2H Great-Scythe Uppercut
            kfs = [
                (0, dict(torso_deg=3.0, grip_x=48.0, grip_y=-10.0, weapon_deg=-40.0, shadow_mantle=0.0)),
                (7, dict(pelvis_dx=-6.0, pelvis_dy=78.0, torso_deg=18.0, head_rel_deg=-8.0,
                         l_thigh_deg=-34.0, l_shin_deg=36.0, r_thigh_deg=32.0, r_shin_deg=-26.0,
                         grip_x=52.0, grip_y=-4.0, weapon_deg=16.0, grip_sep=34.0,
                         shadow_mantle=1.0, halo_grand=True)),
                (11, dict(pelvis_dx=-4.0, pelvis_dy=72.0, torso_deg=14.0, head_rel_deg=-6.0,
                          l_thigh_deg=-32.0, l_shin_deg=34.0, r_thigh_deg=30.0, r_shin_deg=-24.0,
                          grip_x=54.0, grip_y=-8.0, weapon_deg=20.0, grip_sep=34.0,
                          shadow_mantle=0.9, halo_grand=True)),
                (18, dict(pelvis_dx=12.0, pelvis_dy=16.0, torso_deg=-10.0, head_rel_deg=-6.0,
                          l_thigh_deg=18.0, l_shin_deg=16.0, r_thigh_deg=-20.0, r_shin_deg=16.0,
                          grip_x=56.0, grip_y=-66.0, weapon_deg=-68.0, grip_sep=34.0,
                          shadow_mantle=0.4, halo_grand=True)),
                (29, dict(torso_deg=3.0, grip_x=48.0, grip_y=-10.0, weapon_deg=-40.0, shadow_mantle=0.0)),
            ]
            cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.5)
            if 12 <= f <= 20:
                cfg["slash_arc"] = dict(dx=4.0, dy=10.0, r=25.5, a0=62.0, a1=-72.0, intensity=1.25)
            cfgs.append(cfg)

        elif row_idx == 8:
            # Row 8: JUMP — Spectral Wraith Float-Leap & Downward Aerial Guillotine
            kfs = [
                (0, dict(torso_deg=3.0, grip_x=48.0, grip_y=-10.0, weapon_deg=-40.0, foot_y=99.0)),
                (11, dict(pelvis_dx=4.0, pelvis_dy=12.0, torso_deg=-12.0, head_rel_deg=8.0, mane_rel_deg=-12.0,
                          l_thigh_deg=24.0, l_shin_deg=34.0, r_thigh_deg=-14.0, r_shin_deg=26.0,
                          grip_x=28.0, grip_y=-92.0, weapon_deg=-98.0, grip_sep=32.0,
                          foot_y=92.0, halo_grand=True)),
                (19, dict(pelvis_dx=14.0, pelvis_dy=46.0, torso_deg=22.0, head_rel_deg=-10.0,
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
    parts = load_and_segment_512()
    picks = [
        (0, 0, "R0 2H SCYTHE GUARD"),
        (1, 4, "R1 NECROPOLIS PROWL"),
        (2, 13, "R2 2H SOUL-HARVEST"),
        (3, 6, "R3 DEATH'S GRASP CHAIN"),
        (4, 22, "R4 MEMENTO GUILLOTINE"),
        (5, 12, "R5 KNEE COLLAPSE"),
        (5, 25, "R5 PRONE FLOOR REST"),
        (7, 16, "R7 GRAVE ERUPTION"),
    ]
    build_and_save_30fps_sheet(
        "reaper", parts, build_row_configs, render_frame,
        OUT_SHEET_PATH, VFX_SHEET_PATH, ARTIFACT_DIR,
        shimmer_cols=(C_ROSE, C_VIO_LIT), showcase_picks=picks,
    )


if __name__ == "__main__":
    main()
