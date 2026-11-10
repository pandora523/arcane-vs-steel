#!/usr/bin/env python3
"""
First-Party HD-2D 30fps Sprite Sheet & Portrait Builder for VEX-09 (`android`).
Follows the Arcane vs. Steel 7-Stage Reference-Driven HD-2D Pipeline:
  1. Quantizes & downsamples `portrait_hd2d_android` -> `assets/sprites/android_portrait.png` (128x128 NEAREST).
  2. Extracts `assets/sprites/android_v1_base.jpg` via exterior + enclosed white-pocket BFS + MedianFilter cel-flattening
     into clean hierarchical anatomical parts (`head`, `torso`, `l_thigh`, `l_shin`, `l_foot`, `r_thigh`, `r_shin`, `r_foot`)
     with static side-arms stripped cleanly and 0 interior pixel holes.
  3. Articulates all 9x30 = 270 frames at `104x104` logical resolution (`2x NEAREST` -> `208x208`, total `6240x1872`)
     using native 2-bone analytical IK arms, Muramasa-09 HF Plasma Katana, upper-back Cyber-Valkyrie wing-pylons,
     and tankless Mach shock-diamond thruster plumes (`android_thruster_strip.png`).
  4. Applies curated 20-color Cyber Master Palette quantization, 2-pass cardinal orphan despeckling, interior pinhole
     fill, crisp 1px `#090b18` Selout outline, and 2px border safety clamp (`0/270` boundary clips).
"""

import math
import os
from collections import Counter, deque
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

REPO_ROOT = "/home/antigravity/pandora523/arcane-vs-steel"
ARTIFACT_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/3a4b2cf8-05c2-45a3-bb65-af6f5b5a1088"
SCRATCH_DIR = os.path.join(ARTIFACT_DIR, "scratch")

BASE_SPRITE_PATH = os.path.join(REPO_ROOT, "assets", "sprites", "android_v1_base.jpg")
PORTRAIT_SRC_PATH = os.path.join(ARTIFACT_DIR, "portrait_hd2d_android_1794273403824.jpg")
PORTRAIT_OUT_PATH = os.path.join(REPO_ROOT, "assets", "sprites", "android_portrait.png")
SHEET_OUT_PATH = os.path.join(REPO_ROOT, "assets", "sprites", "android_sheet.png")
THRUSTER_STRIP_PATH = os.path.join(SCRATCH_DIR, "android_thruster_strip.png")

# Curated 20-Color Cyber-Valkyrie HD-2D Master Palette (stepped cel ramps, zero dithering)
CYBER_MASTER_PALETTE = np.array([
    [9, 11, 24],       # 0: Deep Obsidian Selout (#090b18)
    [21, 26, 46],      # 1: Gunmetal Abyss Shadow (#151a2e)
    [38, 46, 74],      # 2: Gunmetal Under-Suit Dark (#262e4a)
    [60, 72, 108],     # 3: Gunmetal Synth-Muscle Mid (#3c486c)
    [88, 103, 144],    # 4: Gunmetal Highlight / Steel Shadow (#586790)
    [120, 137, 178],   # 5: Titanium Cool Shadow (#7889b2)
    [158, 175, 212],   # 6: Titanium Mid-Plate (#9eafd4)
    [198, 212, 238],   # 7: Titanium Lit Plate (#c6d4ee)
    [232, 240, 252],   # 8: Titanium Bright Specular (#e8f0fc)
    [249, 252, 255],   # 9: Pure White Crest / Core (#f9fcff)
    [0, 78, 138],      # 10: Deep Cyber-Cyan Shadow (#004e8a)
    [0, 146, 214],     # 11: Cyber-Cyan Mid (#0092d6)
    [0, 224, 255],     # 12: Neon Visor Cyan (#00e0ff)
    [132, 248, 255],   # 13: Ice-Cyan Glow (#84f8ff)
    [92, 14, 72],      # 14: Deep Reactor Magenta Shadow (#5c0e48)
    [164, 22, 118],    # 15: Reactor Magenta Mid (#a41676)
    [255, 46, 147],    # 16: Neon Plasma Magenta (#ff2e93)
    [255, 138, 212],   # 17: Soft Pink-Magenta Core (#ff8ad4)
    [48, 32, 92],      # 18: Violet Energy Indigo (#30205c)
    [118, 76, 214],    # 19: Electric Cyber-Violet (#764cd6)
], dtype=np.int32)

SELOUT_RGB = (9, 11, 24, 255)


def build_portrait():
    if not os.path.exists(PORTRAIT_SRC_PATH):
        print(f"[android] Keeping existing HUD portrait -> {PORTRAIT_OUT_PATH}")
        return
    src = Image.open(PORTRAIT_SRC_PATH).convert("RGB")
    filtered = src.filter(ImageFilter.MedianFilter(size=5))
    quant = filtered.quantize(colors=20, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).convert("RGBA")
    out = quant.resize((128, 128), Image.Resampling.NEAREST)
    out.save(PORTRAIT_OUT_PATH)
    print(f"[android] Wrote crisp 20-color 128x128 HUD portrait -> {PORTRAIT_OUT_PATH}")


def extract_clean_104_base():
    raw = Image.open(BASE_SPRITE_PATH).convert("RGBA")
    raw_np = np.array(raw)
    H, W, _ = raw_np.shape

    # Cel-flatten RGB BEFORE downsampling (3x3 on head/visor, 5x5 on armor/legs) to eliminate AI micro-speckles
    rgb_img = Image.fromarray(raw_np[:, :, :3], "RGB")
    rgb_3 = np.array(rgb_img.filter(ImageFilter.MedianFilter(size=3)))
    rgb_5 = np.array(rgb_img.filter(ImageFilter.MedianFilter(size=5)))
    flat_rgb = np.where((np.arange(H)[:, None, None] < 315), rgb_3, rgb_5)

    def is_bg(r, g, b):
        return (r > 240 and g > 240 and b > 240) or (
            min(int(r), int(g), int(b)) > 228 and (max(int(r), int(g), int(b)) - min(int(r), int(g), int(b))) < 18
        )

    vis = np.zeros((H, W), dtype=bool)
    q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if not vis[y, x] and is_bg(*raw_np[y, x, :3]):
                vis[y, x] = True
                q.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if not vis[y, x] and is_bg(*raw_np[y, x, :3]):
                vis[y, x] = True
                q.append((y, x))

    while q:
        cy, cx = q.popleft()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < H and 0 <= nx < W and not vis[ny, nx] and is_bg(*raw_np[ny, nx, :3]):
                vis[ny, nx] = True
                q.append((ny, nx))

    # Strip enclosed pure-white arm-torso gap pockets while preserving bright white-titanium armor plates
    visited_pockets = np.zeros((H, W), dtype=bool)
    for y in range(120, H - 100, 4):
        for x in range(240, W - 240, 4):
            if not vis[y, x] and not visited_pockets[y, x]:
                r, g, b = raw_np[y, x, :3]
                if r > 249 and g > 249 and b > 249:
                    comp = []
                    cq = deque([(y, x)])
                    visited_pockets[y, x] = True
                    while cq:
                        cy, cx = cq.popleft()
                        comp.append((cy, cx))
                        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < H and 0 <= nx < W and not visited_pockets[ny, nx] and is_bg(*raw_np[ny, nx, :3]):
                                visited_pockets[ny, nx] = True
                                cq.append((ny, nx))
                    if len(comp) >= 1200:
                        for cy, cx in comp:
                            vis[cy, cx] = True

    out_np = np.zeros((H, W, 4), dtype=np.uint8)
    out_np[:, :, :3] = flat_rgb
    out_np[:, :, 3] = np.where(vis, 0, 255)

    # 2-pass anti-aliased white-fringe cleanup ONLY on light neutral gray/white edge pixels
    for _ in range(2):
        alpha = out_np[:, :, 3]
        trans = alpha == 0
        adj = np.zeros_like(trans)
        adj[1:, :] |= trans[:-1, :]
        adj[:-1, :] |= trans[1:, :]
        adj[:, 1:] |= trans[:, :-1]
        adj[:, :-1] |= trans[:, 1:]
        edge = (alpha > 0) & adj
        r = out_np[:, :, 0].astype(np.int32)
        g = out_np[:, :, 1].astype(np.int32)
        b = out_np[:, :, 2].astype(np.int32)
        fringe = (
            edge
            & (np.minimum(np.minimum(r, g), b) > 195)
            & ((np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)) < 26)
        )
        out_np[fringe, 3] = 0

    ys, xs = np.where(out_np[:, :, 3] > 0)
    crop = Image.fromarray(out_np).crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))

    # Fit cleanly into 104x104 with grounded cyber-boots planted at y = 99
    cw, ch = crop.size
    target_h = 86
    target_w = round(cw * target_h / ch)
    small = crop.resize((target_w, target_h), Image.Resampling.NEAREST)

    base104 = Image.new("RGBA", (104, 104), (0, 0, 0, 0))
    ox = 52 - target_w // 2
    oy = 99 - target_h + 1
    base104.alpha_composite(small, (ox, oy))
    return base104


def cut_part(src104, x0, y0, x1, y1, mask_fn=None):
    """Extracts an anatomical sub-sprite in 104-space, upscaled 4x NEAREST for crisp artifact-free rotation."""
    arr = np.array(src104)
    sub = np.zeros_like(arr)
    sub[y0:y1 + 1, x0:x1 + 1] = arr[y0:y1 + 1, x0:x1 + 1]
    if mask_fn is not None:
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if sub[y, x, 3] > 0 and not mask_fn(x, y, sub[y, x]):
                    sub[y, x, 3] = 0
    ys, xs = np.where(sub[:, :, 3] > 0)
    if len(xs) == 0:
        raise RuntimeError(f"Empty part in box {(x0, y0, x1, y1)}")
    bx0, by0 = max(0, int(xs.min()) - 1), max(0, int(ys.min()) - 1)
    bx1, by1 = min(103, int(xs.max()) + 1), min(103, int(ys.max()) + 1)
    part_img = Image.fromarray(sub[by0:by1 + 1, bx0:bx1 + 1])
    w, h = part_img.size
    part_hi = part_img.resize((w * 4, h * 4), Image.Resampling.NEAREST)
    return {
        "img104": part_img,
        "img_hi": part_hi,
        "ox": bx0,
        "oy": by0,
        "w": w,
        "h": h,
    }


def build_anatomical_parts(base104):
    parts = {}

    # 1. Head: swept Valkyrie ear-fins + circular ear-pod + white-titanium helm + glowing cyan visor
    parts["head"] = cut_part(
        base104, 38, 13, 62, 29,
        mask_fn=lambda x, y, px: not (y >= 28 and x < 46)
    )

    # 2. Torso & Pelvis: strip static side-arms cleanly while keeping chest reactor, synth-abs & hip tasset intact
    def torso_mask(x, y, px):
        if y <= 38 and x <= 44:
            return False
        if 39 <= y <= 46 and x <= 43:
            return False
        if 47 <= y <= 55 and x <= 41:
            return False
        if y >= 56 and x <= 45:
            return False
        if y <= 39 and x >= 60:
            return False
        if 40 <= y <= 55 and x >= 59:
            return False
        if y >= 56 and x >= 58:
            return False
        return True

    parts["torso"] = cut_part(base104, 42, 28, 60, 60, mask_fn=torso_mask)

    # Accentuate the Magenta-Cyan Chest Reactor Core on `torso`
    t_arr = np.array(parts["torso"]["img104"])
    for ly in range(t_arr.shape[0]):
        for lx in range(t_arr.shape[1]):
            gx = parts["torso"]["ox"] + lx
            gy = parts["torso"]["oy"] + ly
            dist = math.hypot(gx - 55.0, gy - 36.0)
            if dist <= 1.3:
                t_arr[ly, lx] = (140, 250, 255, 255)
            elif dist <= 2.4:
                t_arr[ly, lx] = (0, 224, 255, 255)
            elif dist <= 3.5 and t_arr[ly, lx, 3] > 0:
                t_arr[ly, lx] = (255, 46, 147, 255)
    parts["torso"]["img104"] = Image.fromarray(t_arr)
    parts["torso"]["img_hi"] = parts["torso"]["img104"].resize(
        (parts["torso"]["w"] * 4, parts["torso"]["h"] * 4), Image.Resampling.NEAREST
    )

    # 3. Left (Back/Viewer-Left) Leg: Thigh, Shin, Cyber-Boot
    parts["l_thigh"] = cut_part(base104, 42, 57, 51, 72, mask_fn=lambda x, y, px: not (y <= 59 and x <= 42))
    parts["l_shin"] = cut_part(base104, 40, 70, 50, 90)
    parts["l_foot"] = cut_part(base104, 39, 89, 47, 99)

    # 4. Right (Front/Viewer-Right) Leg: Thigh, Shin, Cyber-Boot
    parts["r_thigh"] = cut_part(base104, 52, 57, 60, 72, mask_fn=lambda x, y, px: not (y <= 63 and x >= 60))
    parts["r_shin"] = cut_part(base104, 52, 70, 61, 90)
    parts["r_foot"] = cut_part(base104, 52, 89, 66, 99)

    return parts


def paste_rotated_part(canvas_hi, part, src_pivot_104, dst_pivot_104, angle_deg):
    sp_x = (src_pivot_104[0] - part["ox"]) * 4.0
    sp_y = (src_pivot_104[1] - part["oy"]) * 4.0
    img = part["img_hi"]
    rad = int(math.ceil(max(sp_x, sp_y, img.width - sp_x, img.height - sp_y))) + 8
    size = rad * 2
    buf = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    buf.alpha_composite(img, (int(round(rad - sp_x)), int(round(rad - sp_y))))
    rot = buf.rotate(-angle_deg, resample=Image.Resampling.NEAREST, center=(rad, rad))
    dx = int(round(dst_pivot_104[0] * 4.0 - rad))
    dy = int(round(dst_pivot_104[1] * 4.0 - rad))
    canvas_hi.alpha_composite(rot, (dx, dy))


def rot2d(vx, vy, deg):
    r = math.radians(deg)
    c, s = math.cos(r), math.sin(r)
    return vx * c - vy * s, vx * s + vy * c


def solve_ik_2bone(sx, sy, hx, hy, L1, L2, bend_sign=1.0):
    dx, dy = hx - sx, hy - sy
    d = math.hypot(dx, dy)
    if d < 1e-4:
        return sx, sy + L1, hx, hy
    max_reach = (L1 + L2) * 0.985
    if d > max_reach:
        scale = max_reach / d
        dx *= scale
        dy *= scale
        hx = sx + dx
        hy = sy + dy
        d = max_reach
    d = max(abs(L1 - L2) + 0.05, d)
    cos_a = max(-1.0, min(1.0, (L1 * L1 + d * d - L2 * L2) / (2.0 * L1 * d)))
    ang_base = math.atan2(dy, dx)
    ang_off = math.acos(cos_a) * bend_sign
    ex = sx + math.cos(ang_base + ang_off) * L1
    ey = sy + math.sin(ang_base + ang_off) * L1
    return ex, ey, hx, hy


def draw_thick_seg_104(draw, x0, y0, x1, y1, width, col_main, col_hi=None, col_sh=None):
    dx, dy = x1 - x0, y1 - y0
    length = max(1.0, math.hypot(dx, dy))
    nx, ny = -dy / length, dx / length
    steps = int(math.ceil(length * 2.5))
    hw = width * 0.5
    for i in range(steps + 1):
        u = i / steps
        cx = x0 + dx * u
        cy = y0 + dy * u
        for w_off in np.linspace(-hw, hw, max(3, int(width * 2 + 1))):
            px = int(round(cx + nx * w_off))
            py = int(round(cy + ny * w_off))
            if 2 <= px <= 101 and 2 <= py <= 101:
                c = col_main
                if col_hi and w_off < -hw * 0.28:
                    c = col_hi
                elif col_sh and w_off > hw * 0.30:
                    c = col_sh
                draw.point((px, py), fill=c)


def draw_cyber_wing_pylons(draw104, chest_x, chest_y, torso_deg, flare=0.0, pulse=0.0):
    """Signature Cyber-Valkyrie Aero-Thruster Wing-Pylons mounted behind VEX-09's upper back."""
    bx, by = chest_x - 5.5, chest_y - 1.5
    upper_ang = math.radians(-148 + torso_deg - flare * 16.0)
    lower_ang = math.radians(166 + torso_deg + flare * 12.0)

    for idx, (ang, plen) in enumerate([(upper_ang, 14.5 + flare * 3.5), (lower_ang, 11.5 + flare * 2.5)]):
        tx = max(5.0, min(98.0, bx + math.cos(ang) * plen))
        ty = max(5.0, min(96.0, by + math.sin(ang) * plen))
        draw_thick_seg_104(
            draw104, bx, by + idx * 3.0, tx, ty,
            3.2 if idx == 0 else 2.6,
            (158, 175, 212, 255),
            col_hi=(232, 240, 252, 255),
            col_sh=(38, 46, 74, 255),
        )
        glow_col = (0, 224, 255, 255) if (idx == 0 or pulse < 0.5) else (255, 46, 147, 255)
        mx = bx + (tx - bx) * 0.62
        my = by + idx * 3.0 + (ty - (by + idx * 3.0)) * 0.62
        draw_thick_seg_104(
            draw104,
            bx + (tx - bx) * 0.25,
            by + idx * 3.0 + (ty - (by + idx * 3.0)) * 0.25,
            mx,
            my,
            1.2,
            glow_col,
        )


def draw_cyber_saya(draw104, hip_x, hip_y, torso_deg):
    """Waist-mounted gunmetal & magenta-trimmed high-frequency katana scabbard (`Saya`)."""
    ang = math.radians(152 + torso_deg * 0.7)
    x0, y0 = hip_x - 1.0, hip_y + 1.0
    x1 = max(5.0, min(98.0, x0 + math.cos(ang) * 18.0))
    y1 = max(5.0, min(97.0, y0 + math.sin(ang) * 18.0))
    draw_thick_seg_104(
        draw104, x0, y0, x1, y1, 2.2,
        (38, 46, 74, 255),
        col_hi=(88, 103, 144, 255),
        col_sh=(21, 26, 46, 255),
    )
    nx = int(round(x0 + (x1 - x0) * 0.35))
    ny = int(round(y0 + (y1 - y0) * 0.35))
    draw104.point((nx, ny), fill=(255, 46, 147, 255))
    draw104.point((nx - 1, ny), fill=(0, 224, 255, 255))


def draw_ik_cyber_arm(draw104, sx, sy, hx, hy, is_far=False, bend_sign=1.0):
    """2-Bone IK Cybernetic Arm: White-titanium pauldron -> dark synth-bicep -> white-titanium bracer -> dark gauntlet."""
    ex, ey, hx, hy = solve_ik_2bone(sx, sy, hx, hy, 8.2, 8.0, bend_sign=bend_sign)
    bicep_mid = (38, 46, 74, 255) if is_far else (60, 72, 108, 255)
    draw_thick_seg_104(
        draw104, sx, sy, ex, ey,
        3.4 if not is_far else 3.0,
        bicep_mid,
        col_hi=(88, 103, 144, 255),
        col_sh=(21, 26, 46, 255),
    )

    px, py = int(round(sx)), int(round(sy))
    pauldron_hi = (198, 212, 238, 255) if is_far else (232, 240, 252, 255)
    pauldron_mid = (120, 137, 178, 255) if is_far else (158, 175, 212, 255)
    for dy in range(-3, 3):
        for dx in range(-3, 4):
            if dx * dx + dy * dy <= 10:
                gx, gy = px + dx, py + dy
                if 3 <= gx <= 100 and 3 <= gy <= 100:
                    draw104.point((gx, gy), fill=pauldron_hi if dy < 0 else pauldron_mid)

    draw104.rectangle(
        [int(round(ex)) - 1, int(round(ey)) - 1, int(round(ex)) + 1, int(round(ey)) + 1],
        fill=(0, 146, 214, 255),
    )

    bracer_mid = (158, 175, 212, 255) if is_far else (198, 212, 238, 255)
    bracer_hi = (232, 240, 252, 255) if is_far else (249, 252, 255, 255)
    draw_thick_seg_104(
        draw104, ex, ey, hx, hy,
        3.3 if not is_far else 2.8,
        bracer_mid,
        col_hi=bracer_hi,
        col_sh=(88, 103, 144, 255),
    )

    gx, gy = int(round(hx)), int(round(hy))
    draw104.rectangle([gx - 1, gy - 1, gx + 2, gy + 2], fill=(38, 46, 74, 255))
    draw104.point((gx, gy), fill=(88, 103, 144, 255))
    return hx, hy


def draw_plasma_katana(draw104, hx, hy, angle_rad, blade_len=28.0, energized=1.0):
    """Renders VEX-09's Cyan-Magenta High-Frequency Plasma Katana (`Muramasa-09`) clamped inside `[5..98]`."""
    ux, uy = math.cos(angle_rad), math.sin(angle_rad)
    nx, ny = -uy, ux

    max_len = blade_len
    for test_l in np.linspace(blade_len, 8.0, 24):
        tx = hx + ux * test_l
        ty = hy + uy * test_l
        if 5.5 <= tx <= 98.0 and 5.5 <= ty <= 98.5:
            max_len = test_l
            break
    else:
        max_len = 8.0

    px = max(5.0, min(98.0, hx - ux * 4.5))
    py = max(5.0, min(98.5, hy - uy * 4.5))
    draw_thick_seg_104(
        draw104, px, py, hx + ux * 1.2, hy + uy * 1.2, 2.0,
        (38, 46, 74, 255), col_hi=(88, 103, 144, 255),
    )
    gx0, gy0 = hx + ux * 1.6 - nx * 2.6, hy + uy * 1.6 - ny * 2.6
    gx1, gy1 = hx + ux * 1.6 + nx * 2.6, hy + uy * 1.6 + ny * 2.6
    draw_thick_seg_104(draw104, gx0, gy0, gx1, gy1, 1.5, (158, 175, 212, 255))

    steps = int(math.ceil(max_len * 2.5))
    for i in range(4, steps + 1):
        u = i / steps
        bx = hx + ux * (max_len * u)
        by = hy + uy * (max_len * u)
        taper = 1.0 if u < 0.82 else (1.0 - (u - 0.82) / 0.18 * 0.65)
        mx, my = int(round(bx - nx * 1.0 * taper)), int(round(by - ny * 1.0 * taper))
        cx, cy = int(round(bx)), int(round(by))
        ex, ey = int(round(bx + nx * 1.0 * taper)), int(round(by + ny * 1.0 * taper))

        if 4 <= mx <= 99 and 4 <= my <= 99:
            draw104.point((mx, my), fill=(255, 46, 147, 255) if energized >= 0.4 else (164, 22, 118, 255))
        if 4 <= cx <= 99 and 4 <= cy <= 99:
            draw104.point((cx, cy), fill=(249, 252, 255, 255) if energized >= 0.6 else (132, 248, 255, 255))
        if 4 <= ex <= 99 and 4 <= ey <= 99:
            draw104.point((ex, ey), fill=(0, 224, 255, 255))


def draw_plasma_slash_arc(draw104, cx, cy, start_deg, end_deg, rx, ry, thickness=4.0, phase=0.5):
    """Draws a crisp pixel-art cyan-magenta plasma slash crescent during active strike frames."""
    steps = 44
    for i in range(steps + 1):
        u = i / steps
        ang = math.radians(start_deg + (end_deg - start_deg) * u)
        w = math.sin(u * math.pi) * thickness
        if w < 0.4:
            continue
        bx = cx + math.cos(ang) * rx
        by = cy + math.sin(ang) * ry
        nx, ny = math.cos(ang), math.sin(ang)
        for r_off in np.linspace(-w * 0.6, w * 0.5, max(3, int(w * 2 + 1))):
            px = int(round(bx + nx * r_off))
            py = int(round(by + ny * r_off))
            if 5 <= px <= 98 and 5 <= py <= 98:
                if r_off > w * 0.18:
                    col = (249, 252, 255, 255)
                elif r_off > -w * 0.15:
                    col = (0, 224, 255, 255)
                else:
                    col = (255, 46, 147, 255) if (i + int(phase * 10)) % 3 != 0 else (118, 76, 214, 255)
                draw104.point((px, py), fill=col)


def fill_pinholes_and_quantize_104(img104):
    arr = np.array(img104).astype(np.int32)
    H, W, _ = arr.shape

    # 1. Fill 1px interior transparent pinholes surrounded by >= 3 cardinal opaque pixels
    for _ in range(2):
        alpha = arr[:, :, 3]
        for y in range(2, H - 2):
            for x in range(2, W - 2):
                if alpha[y, x] == 0:
                    nbrs = []
                    for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                        if alpha[y + dy, x + dx] > 128:
                            nbrs.append(arr[y + dy, x + dx, :3])
                    if len(nbrs) >= 3:
                        mean_rgb = np.mean(nbrs, axis=0)
                        arr[y, x, :3] = mean_rgb.astype(np.int32)
                        arr[y, x, 3] = 255

    # 2. Snap every opaque pixel (alpha >= 96) to nearest CYBER_MASTER_PALETTE color
    out = np.zeros((H, W, 4), dtype=np.uint8)
    opaque_mask = arr[:, :, 3] >= 96
    ys, xs = np.where(opaque_mask)
    if len(xs) > 0:
        pts = arr[ys, xs, :3]
        diffs = pts[:, None, :] - CYBER_MASTER_PALETTE[None, :, :]
        dists = np.sum(diffs * diffs, axis=2)
        nearest_idx = np.argmin(dists, axis=1)
        out[ys, xs, :3] = CYBER_MASTER_PALETTE[nearest_idx].astype(np.uint8)
        out[ys, xs, 3] = 255

    # 3. 2-Pass Cardinal Orphan Despeckling (preserving luminous blade/visor accents)
    glow_colors = {tuple(CYBER_MASTER_PALETTE[i].tolist()) for i in (9, 12, 13, 16, 17)}
    for _ in range(2):
        cur = out.copy()
        for y in range(2, H - 2):
            for x in range(2, W - 2):
                if cur[y, x, 3] == 0:
                    continue
                c_tup = (int(cur[y, x, 0]), int(cur[y, x, 1]), int(cur[y, x, 2]))
                if c_tup in glow_colors:
                    continue
                card = []
                same = 0
                for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    if cur[y + dy, x + dx, 3] > 0:
                        nt = (int(cur[y + dy, x + dx, 0]), int(cur[y + dy, x + dx, 1]), int(cur[y + dy, x + dx, 2]))
                        card.append(nt)
                        if nt == c_tup:
                            same += 1
                if len(card) >= 3 and same == 0:
                    most_common, _ = Counter(card).most_common(1)[0]
                    out[y, x, :3] = most_common

    # 4. Crisp 1px Dark Selective Outline (`Selout`, #090b18) on exterior non-glow silhouette pixels
    alpha = out[:, :, 3] > 0
    trans = ~alpha
    adj_trans = np.zeros_like(alpha)
    adj_trans[1:, :] |= trans[:-1, :]
    adj_trans[:-1, :] |= trans[1:, :]
    adj_trans[:, 1:] |= trans[:, :-1]
    adj_trans[:, :-1] |= trans[:, 1:]
    edge = alpha & adj_trans
    for y in range(2, H - 2):
        for x in range(2, W - 2):
            if edge[y, x]:
                c_tup = (int(out[y, x, 0]), int(out[y, x, 1]), int(out[y, x, 2]))
                if c_tup not in glow_colors:
                    out[y, x] = SELOUT_RGB

    # 5. Enforce strict 2px transparent safety border on 104x104 (`4px` in `208x208`)
    out[:2, :, :] = 0
    out[-2:, :, :] = 0
    out[:, :2, :] = 0
    out[:, -2:, :] = 0

    return Image.fromarray(out)


def render_frame_104(parts, row, col, thruster_strip):
    """Renders a single 104x104 frame driven by native first-party 2-bone IK & multi-part skeletal kinematics."""
    u = col / 29.0

    hip_x = 51.5
    hip_y = 59.5
    bob_x = 0.0
    torso_deg = 2.5
    head_rel_deg = math.sin(u * math.pi * 2.0) * 1.8

    l_thigh_deg = 12.0
    l_shin_deg = 6.0
    l_foot_deg = 0.0

    r_thigh_deg = -12.0
    r_shin_deg = 6.0
    r_foot_deg = 0.0

    wing_flare = 0.18 + 0.15 * math.sin(u * math.pi * 2.0)
    use_thruster = False
    blade_energized = 1.0
    prone_blend = 0.0

    # 1. Body & Lower-Limb Choreography across all 9 Rows
    if row == 0:
        # IDLE: crisp 29/29 cybernetic breathing + visor/wing pulse + subtle katana poise
        breath = math.sin(u * math.pi * 2.0)
        hip_y = 59.0 + breath * 0.85
        torso_deg = 2.5 + breath * 1.8
        head_rel_deg = -torso_deg * 0.3 + breath * 1.6
        wing_flare = 0.22 + 0.20 * math.sin(u * math.pi * 2.0 + 0.6)
    elif row == 1:
        # WALK: full 2-step cybernetic tactical stride (Step A F00..F14, Step B F15..F29)
        stride = math.sin(u * math.pi * 2.0)
        lift_a = max(0.0, stride)
        lift_b = max(0.0, -stride)
        hip_y = 59.2 - abs(stride) * 1.1
        torso_deg = 6.5 + math.cos(u * math.pi * 4.0) * 1.8
        l_thigh_deg = stride * 24.0
        l_shin_deg = 8.0 + lift_b * 22.0
        r_thigh_deg = -stride * 24.0
        r_shin_deg = 8.0 + lift_a * 22.0
    elif row == 2:
        # AUTO_ATTACK: coiled plasma charge (F00..F07) -> deep forward lunge slash (F08..F18) -> recovery (F19..F29)
        if col <= 7:
            k = col / 7.0
            bob_x = -3.5 * k
            torso_deg = -10.0 * k
            l_thigh_deg = 12.0 - 18.0 * k
            l_shin_deg = 6.0 + 16.0 * k
            r_thigh_deg = -12.0 - 8.0 * k
            r_shin_deg = 6.0 + 14.0 * k
            wing_flare = 0.3 + 0.4 * k
        elif col <= 18:
            k = (col - 7) / 11.0
            lunge = math.sin(min(1.0, k * 1.35) * math.pi * 0.5)
            bob_x = -3.5 + 10.5 * lunge
            torso_deg = -10.0 + 28.0 * lunge
            hip_y = 60.5
            r_thigh_deg = -26.0 * lunge
            r_shin_deg = 22.0 * lunge
            l_thigh_deg = 22.0 * lunge
            l_shin_deg = 10.0 * lunge
            wing_flare = 0.85
        else:
            k = (col - 18) / 11.0
            bob_x = 7.0 * (1.0 - k)
            torso_deg = 18.0 * (1.0 - k) + 2.5 * k
            hip_y = 60.5 * (1.0 - k) + 59.0 * k
            r_thigh_deg = -26.0 * (1.0 - k) + (-12.0) * k
            r_shin_deg = 22.0 * (1.0 - k) + 6.0 * k
            l_thigh_deg = 22.0 * (1.0 - k) + 12.0 * k
            l_shin_deg = 10.0 * (1.0 - k) + 6.0 * k
            wing_flare = 0.85 * (1.0 - k) + 0.2
    elif row == 3:
        # SKILL: Holo-Scanner Lock (F00..F07) -> Thruster Blitz Thrust (F08..F18) -> EMP Dome Release (F19..F29)
        if col <= 7:
            k = col / 7.0
            torso_deg = -8.0 * k
            bob_x = -2.5 * k
            wing_flare = 0.5 * k
        elif col <= 18:
            k = (col - 7) / 11.0
            bob_x = -2.5 + 11.5 * math.sin(min(1.0, k * 1.3) * math.pi * 0.5)
            torso_deg = 22.0
            hip_y = 60.0
            r_thigh_deg = -28.0
            r_shin_deg = 24.0
            l_thigh_deg = 24.0
            l_shin_deg = 12.0
            wing_flare = 1.0
            use_thruster = True
        else:
            k = (col - 18) / 11.0
            bob_x = 9.0 * (1.0 - k)
            torso_deg = 22.0 * (1.0 - k) + 2.5 * k
            r_thigh_deg = -28.0 * (1.0 - k) + (-12.0) * k
            r_shin_deg = 24.0 * (1.0 - k) + 6.0 * k
            l_thigh_deg = 24.0 * (1.0 - k) + 12.0 * k
            wing_flare = 1.0 - 0.7 * k
    elif row == 4:
        # ULTIMATE: Singularity Hover Ascension -> Twin-Arm Orbital Beam Convergence -> Descent
        use_thruster = col <= 25
        asc = math.sin(min(1.0, u * 1.25) * math.pi) if u < 0.8 else max(0.0, (1.0 - u) / 0.2 * 0.45)
        hip_y = 59.0 - asc * 11.0
        torso_deg = -6.0 if col < 9 else (14.0 if col <= 23 else 4.0)
        l_thigh_deg = 12.0 * asc + 4.0
        l_shin_deg = 20.0 * asc + 6.0
        r_thigh_deg = -8.0 * asc - 4.0
        r_shin_deg = 24.0 * asc + 6.0
        wing_flare = 1.0
    elif row == 5:
        # DEATH & HURT: F00..F05 stagger -> F06..F14 servo knee-drop -> F15..F22 collapse -> F23..F29 prone shutdown
        if col <= 5:
            k = col / 5.0
            bob_x = -4.0 * math.sin(k * math.pi * 0.8)
            torso_deg = -16.0 * k
            head_rel_deg = -12.0 * k
            blade_energized = 0.85
        elif col <= 14:
            k = (col - 5) / 9.0
            bob_x = -3.0 + 3.0 * k
            hip_y = 59.0 + 13.0 * k
            torso_deg = -16.0 * (1.0 - k) + 24.0 * k
            l_thigh_deg = -35.0 * k
            l_shin_deg = 78.0 * k
            r_thigh_deg = 18.0 * k
            r_shin_deg = 72.0 * k
            blade_energized = max(0.25, 0.85 - 0.6 * k)
        else:
            k = min(1.0, (col - 14) / 8.0)
            prone_blend = k
            bob_x = 4.0 * k
            hip_y = 72.0 + 18.5 * k
            torso_deg = 24.0 + 64.0 * k
            head_rel_deg = -10.0 * (1.0 - k) + 4.0 * k
            l_thigh_deg = -35.0 * (1.0 - k) + 86.0 * k
            l_shin_deg = 78.0 * (1.0 - k) + 8.0 * k
            l_foot_deg = 70.0 * k
            r_thigh_deg = 18.0 * (1.0 - k) + 88.0 * k
            r_shin_deg = 72.0 * (1.0 - k) + 6.0 * k
            r_foot_deg = 75.0 * k
            blade_energized = 0.15 if col % 4 != 0 else 0.35
            wing_flare = 0.0
    elif row == 6:
        # DASH: Wing-Pylon Thruster Phase-Rush (articulated forward lean, zero canvas shear)
        rush = math.sin(u * math.pi)
        use_thruster = True
        bob_x = 4.5 * rush
        hip_y = 57.5 - 2.5 * rush
        torso_deg = 24.0 * rush + 6.0
        l_thigh_deg = 28.0 * rush
        l_shin_deg = 18.0 * rush + 4.0
        r_thigh_deg = -22.0 * rush
        r_shin_deg = 26.0 * rush + 4.0
        wing_flare = 1.0
    elif row == 7:
        # CROUCH: Tactical Low Stance + Aegis Hex Guard (F02..F13) + Low Counter-Slash (F14..F22)
        hip_y = 65.5
        torso_deg = 8.0 if col <= 13 else (22.0 if col <= 22 else 10.0)
        bob_x = 5.5 if 14 <= col <= 22 else 0.0
        l_thigh_deg = -26.0
        l_shin_deg = 48.0
        r_thigh_deg = -32.0
        r_shin_deg = 52.0
        wing_flare = 0.45
    elif row == 8:
        # JUMP: Coil (F00..F03) -> Thruster Vault (F04..F13) -> Apex Downward Plasma Cleave (F14..F21) -> Landing (F22..F29)
        if col <= 3:
            k = col / 3.0
            hip_y = 59.0 + 5.5 * k
            torso_deg = 10.0 * k
            l_thigh_deg = -22.0 * k
            l_shin_deg = 42.0 * k
            r_thigh_deg = -24.0 * k
            r_shin_deg = 44.0 * k
        elif col <= 22:
            k = (col - 3) / 19.0
            arc = math.sin(k * math.pi)
            use_thruster = col <= 18
            hip_y = 59.0 - 15.0 * arc
            torso_deg = -8.0 + 30.0 * k
            l_thigh_deg = -18.0 + 34.0 * k
            l_shin_deg = 36.0
            r_thigh_deg = -32.0 + 18.0 * k
            r_shin_deg = 40.0
            wing_flare = 0.95
        else:
            k = (col - 22) / 7.0
            hip_y = 63.0 * (1.0 - k) + 59.0 * k
            torso_deg = 14.0 * (1.0 - k) + 2.5 * k
            l_thigh_deg = -18.0 * (1.0 - k) + 12.0 * k
            l_shin_deg = 34.0 * (1.0 - k) + 6.0 * k
            r_thigh_deg = -20.0 * (1.0 - k) + (-12.0) * k
            r_shin_deg = 36.0 * (1.0 - k) + 6.0 * k

    is_airborne = (row == 4 and col <= 25) or (row == 6 and 3 <= col <= 26) or (row == 8 and 4 <= col <= 22)

    hip_pt = (hip_x + bob_x, hip_y)

    # Left leg chain
    l_hip = (hip_pt[0] - 4.0, hip_pt[1] + 0.5)
    lk_dx, lk_dy = rot2d(-1.0, 11.5, l_thigh_deg)
    l_knee = (l_hip[0] + lk_dx, l_hip[1] + lk_dy)
    la_dx, la_dy = rot2d(-2.0, 18.5, l_thigh_deg + l_shin_deg)
    l_ankle = (l_knee[0] + la_dx, l_knee[1] + la_dy)

    # Right leg chain
    r_hip = (hip_pt[0] + 4.5, hip_pt[1] + 0.5)
    rk_dx, rk_dy = rot2d(1.0, 11.5, r_thigh_deg)
    r_knee = (r_hip[0] + rk_dx, r_hip[1] + rk_dy)
    ra_dx, ra_dy = rot2d(-0.5, 18.5, r_thigh_deg + r_shin_deg)
    r_ankle = (r_knee[0] + ra_dx, r_knee[1] + ra_dy)

    # Exact Ground-Plant Calibration: lock lowest boot sole (`ankle_y + 8.5`) to `y = 99.0` on grounded frames
    if not is_airborne and row != 5:
        lowest_sole = max(l_ankle[1] + 8.5, r_ankle[1] + 8.5)
        dy_fix = 99.0 - lowest_sole
        hip_pt = (hip_pt[0], hip_pt[1] + dy_fix)
        l_hip = (l_hip[0], l_hip[1] + dy_fix)
        l_knee = (l_knee[0], l_knee[1] + dy_fix)
        l_ankle = (l_ankle[0], l_ankle[1] + dy_fix)
        r_hip = (r_hip[0], r_hip[1] + dy_fix)
        r_knee = (r_knee[0], r_knee[1] + dy_fix)
        r_ankle = (r_ankle[0], r_ankle[1] + dy_fix)
    elif row == 5:
        lowest_sole = max(
            l_ankle[1] + 8.0 * (1.0 - prone_blend) + 3.0 * prone_blend,
            r_ankle[1] + 8.0 * (1.0 - prone_blend) + 3.0 * prone_blend,
            hip_pt[1] + 5.0 * prone_blend,
        )
        dy_fix = 98.5 - lowest_sole
        hip_pt = (hip_pt[0], hip_pt[1] + dy_fix)
        l_hip = (l_hip[0], l_hip[1] + dy_fix)
        l_knee = (l_knee[0], l_knee[1] + dy_fix)
        l_ankle = (l_ankle[0], l_ankle[1] + dy_fix)
        r_hip = (r_hip[0], r_hip[1] + dy_fix)
        r_knee = (r_knee[0], r_knee[1] + dy_fix)
        r_ankle = (r_ankle[0], r_ankle[1] + dy_fix)

    # Neck, chest, and shoulder pivots rotated with `torso_deg` around `hip_pt`
    neck_dx, neck_dy = rot2d(0.5, -30.5, torso_deg)
    neck_pt = (hip_pt[0] + neck_dx, hip_pt[1] + neck_dy)

    chest_dx, chest_dy = rot2d(1.5, -22.5, torso_deg)
    chest_pt = (hip_pt[0] + chest_dx, hip_pt[1] + chest_dy)

    far_sh_dx, far_sh_dy = rot2d(6.5, -24.5, torso_deg)
    far_sh = (hip_pt[0] + far_sh_dx, hip_pt[1] + far_sh_dy)

    near_sh_dx, near_sh_dy = rot2d(-5.5, -24.5, torso_deg)
    near_sh = (hip_pt[0] + near_sh_dx, hip_pt[1] + near_sh_dy)

    # 2. Native First-Party 2-Bone IK Arm & Muramasa-09 Katana Trajectories across all 9 Rows
    hx_near = near_sh[0] + 9.5
    hy_near = near_sh[1] + 10.5
    hx_far = far_sh[0] + 4.5
    hy_far = far_sh[1] + 11.0
    sword_ang = -0.72

    if row == 0:
        sway = math.sin(u * math.pi * 2.0)
        hx_near = near_sh[0] + 9.5 + sway * 1.2
        hy_near = near_sh[1] + 10.5 + sway * 0.9
        hx_far = far_sh[0] + 4.5 - sway * 0.8
        hy_far = far_sh[1] + 11.0
        sword_ang = -0.72 + sway * 0.08
    elif row == 1:
        swing = math.sin(u * math.pi * 2.0)
        hx_near = near_sh[0] + 8.0 - swing * 4.5
        hy_near = near_sh[1] + 11.0 + abs(swing) * 1.2
        hx_far = far_sh[0] + 3.0 + swing * 5.0
        hy_far = far_sh[1] + 10.5
        sword_ang = 0.35 + swing * 0.22
    elif row == 2:
        if col <= 7:
            k = col / 7.0
            hx_near = near_sh[0] - 5.0 * k + 4.0 * (1.0 - k)
            hy_near = near_sh[1] - 9.0 * k + 8.0 * (1.0 - k)
            hx_far = far_sh[0] + 6.0
            hy_far = far_sh[1] + 5.0
            sword_ang = -0.72 * (1.0 - k) + (-2.45) * k
        elif col <= 15:
            k = (col - 7) / 8.0
            hx_near = near_sh[0] + 15.5
            hy_near = near_sh[1] - 2.0 + 9.0 * k
            hx_far = far_sh[0] - 4.0
            hy_far = far_sh[1] + 8.0
            sword_ang = -0.45 * (1.0 - k) + 0.42 * k
        else:
            k = (col - 15) / 14.0
            hx_near = near_sh[0] + 15.5 * (1.0 - k) + 9.5 * k
            hy_near = near_sh[1] + 7.0 * (1.0 - k) + 10.5 * k
            hx_far = far_sh[0] - 4.0 * (1.0 - k) + 4.5 * k
            hy_far = far_sh[1] + 8.0 * (1.0 - k) + 11.0 * k
            sword_ang = 0.42 * (1.0 - k) + (-0.72) * k
    elif row == 3:
        if col <= 7:
            k = col / 7.0
            # Far hand touches cyber-visor for target lock; katana coils behind shoulder
            hx_near = near_sh[0] + 6.0 * (1.0 - k) - 4.5 * k
            hy_near = near_sh[1] + 9.0 * (1.0 - k) + 5.5 * k
            hx_far = far_sh[0] + 4.5 * (1.0 - k) + 10.5 * k
            hy_far = far_sh[1] + 10.0 * (1.0 - k) - 4.5 * k
            sword_ang = -0.72 * (1.0 - k) + (-2.35) * k
        elif col <= 18:
            k = (col - 7) / 11.0
            hx_near = near_sh[0] + 15.8
            hy_near = near_sh[1] + 1.0 + 5.5 * k
            hx_far = far_sh[0] - 4.5 + 8.0 * k
            hy_far = far_sh[1] + 6.0
            sword_ang = -0.38 + 0.72 * k
        else:
            k = (col - 18) / 11.0
            # Open palm EMP discharge + return to guard
            hx_near = near_sh[0] + 15.8 * (1.0 - k) + 9.5 * k
            hy_near = near_sh[1] + 6.5 * (1.0 - k) + 10.5 * k
            hx_far = far_sh[0] + 13.5 * (1.0 - k) + 4.5 * k
            hy_far = far_sh[1] + 1.5 * (1.0 - k) + 11.0 * k
            sword_ang = 0.34 * (1.0 - k) + (-0.72) * k
    elif row == 4:
        if col < 9:
            k = col / 8.0
            hx_near = near_sh[0] + 9.5 * (1.0 - k) + 6.5 * k
            hy_near = near_sh[1] + 10.5 * (1.0 - k) + 2.5 * k
            hx_far = far_sh[0] + 4.5 * (1.0 - k) + 8.5 * k
            hy_far = far_sh[1] + 11.0 * (1.0 - k) + 1.5 * k
            sword_ang = -0.72 * (1.0 - k) + (-1.55) * k
        elif col <= 23:
            k = (col - 9) / 14.0
            pulse = math.sin(k * math.pi * 3.0)
            # Outstretched hand aligns with world-space `(this.x + facing * 56, this.y - 142)` orbital beam origin!
            hx_near = near_sh[0] + 14.8 + pulse * 0.8
            hy_near = near_sh[1] - 1.5 + pulse * 0.6
            hx_far = far_sh[0] + 13.2
            hy_far = far_sh[1] - 2.0 - pulse * 0.6
            sword_ang = -0.24 + pulse * 0.12
        else:
            k = (col - 23) / 6.0
            hx_near = near_sh[0] + 14.8 * (1.0 - k) + 9.5 * k
            hy_near = near_sh[1] - 1.5 * (1.0 - k) + 10.5 * k
            hx_far = far_sh[0] + 13.2 * (1.0 - k) + 4.5 * k
            hy_far = far_sh[1] - 2.0 * (1.0 - k) + 11.0 * k
            sword_ang = -0.24 * (1.0 - k) + (-0.72) * k
    elif row == 5:
        if col <= 5:
            k = col / 5.0
            hx_near = near_sh[0] + 8.0 - 5.5 * k
            hy_near = near_sh[1] + 9.0 - 4.5 * k
            hx_far = far_sh[0] + 5.5 + 3.0 * k
            hy_far = far_sh[1] + 8.0 - 3.5 * k
            sword_ang = -0.72 - 0.65 * k
        elif col <= 14:
            k = (col - 5) / 9.0
            hx_near = near_sh[0] + 2.5 * (1.0 - k) + 8.0 * k
            hy_near = near_sh[1] + 4.5 * (1.0 - k) + 12.5 * k
            hx_far = far_sh[0] + 8.5 * (1.0 - k) + 5.0 * k
            hy_far = far_sh[1] + 4.5 * (1.0 - k) + 12.0 * k
            sword_ang = -1.37 * (1.0 - k) + 0.68 * k
        else:
            hx_near = hip_pt[0] + 18.0 * prone_blend + 8.0 * (1.0 - prone_blend)
            hy_near = min(97.0, hip_pt[1] + 1.5)
            hx_far = hip_pt[0] + 14.0 * prone_blend + 5.0 * (1.0 - prone_blend)
            hy_far = min(97.0, hip_pt[1] + 0.5)
            sword_ang = 0.68 * (1.0 - prone_blend) + 0.03 * prone_blend
    elif row == 6:
        rush = math.sin(u * math.pi)
        hx_near = near_sh[0] + 9.5 * (1.0 - rush) - 5.5 * rush
        hy_near = near_sh[1] + 10.5 * (1.0 - rush) + 8.0 * rush
        hx_far = far_sh[0] + 4.5 * (1.0 - rush) + 12.5 * rush
        hy_far = far_sh[1] + 11.0 * (1.0 - rush) + 3.5 * rush
        sword_ang = -0.72 * (1.0 - rush) + 2.68 * rush
    elif row == 7:
        if col <= 13:
            guard_pulse = math.sin((col / 13.0) * math.pi)
            hx_near = near_sh[0] + 11.5 + guard_pulse * 1.0
            hy_near = near_sh[1] + 3.5
            hx_far = far_sh[0] + 9.5
            hy_far = far_sh[1] + 2.0
            sword_ang = -1.22 + guard_pulse * 0.08
        elif col <= 22:
            k = (col - 14) / 8.0
            hx_near = near_sh[0] + 15.5
            hy_near = near_sh[1] + 5.5
            hx_far = far_sh[0] - 3.0
            hy_far = far_sh[1] + 7.5
            sword_ang = -0.22 + 0.54 * k
        else:
            k = (col - 22) / 7.0
            hx_near = near_sh[0] + 15.5 * (1.0 - k) + 9.5 * k
            hy_near = near_sh[1] + 5.5 * (1.0 - k) + 10.0 * k
            hx_far = far_sh[0] - 3.0 * (1.0 - k) + 4.5 * k
            hy_far = far_sh[1] + 7.5 * (1.0 - k) + 10.5 * k
            sword_ang = 0.32 * (1.0 - k) + (-0.72) * k
    elif row == 8:
        if col <= 3:
            k = col / 3.0
            hx_near = near_sh[0] + 9.5 * (1.0 - k) + 4.0 * k
            hy_near = near_sh[1] + 10.5 * (1.0 - k) + 9.5 * k
            hx_far = far_sh[0] + 4.5
            hy_far = far_sh[1] + 9.5
            sword_ang = -0.72 * (1.0 - k) + (-1.75) * k
        elif col <= 12:
            k = (col - 4) / 8.0
            hx_near = near_sh[0] + 4.0 * (1.0 - k) - 2.5 * k
            hy_near = near_sh[1] + 9.5 * (1.0 - k) - 7.5 * k
            hx_far = far_sh[0] + 7.5
            hy_far = far_sh[1] + 3.5
            sword_ang = -1.75 * (1.0 - k) + (-2.38) * k
        elif col <= 21:
            k = (col - 13) / 8.0
            hx_near = near_sh[0] + 14.8
            hy_near = near_sh[1] - 3.0 + 11.0 * k
            hx_far = far_sh[0] - 3.5
            hy_far = far_sh[1] + 6.5
            sword_ang = -0.62 + 1.32 * k
        else:
            k = (col - 22) / 7.0
            hx_near = near_sh[0] + 14.8 * (1.0 - k) + 9.5 * k
            hy_near = near_sh[1] + 8.0 * (1.0 - k) + 10.5 * k
            hx_far = far_sh[0] - 3.5 * (1.0 - k) + 4.5 * k
            hy_far = far_sh[1] + 6.5 * (1.0 - k) + 11.0 * k
            sword_ang = 0.70 * (1.0 - k) + (-0.72) * k

    # 3. Render Underlay (Wing-Pylons, Thruster Plume, Far Arm, Saya) + Hi-Res Body + Foreground Arm/Katana
    under104 = Image.new("RGBA", (104, 104), (0, 0, 0, 0))
    u_draw = ImageDraw.Draw(under104)

    if use_thruster and thruster_strip is not None:
        jp_cell = thruster_strip.crop((col * 48, 0, (col + 1) * 48, 48))
        jx = int(round(chest_pt[0] - 42))
        jy = int(round(chest_pt[1] - 18))
        under104.alpha_composite(jp_cell, (jx, jy))

    if prone_blend < 0.75:
        draw_cyber_wing_pylons(u_draw, chest_pt[0], chest_pt[1], torso_deg, flare=wing_flare, pulse=u)
        draw_cyber_saya(u_draw, hip_pt[0], hip_pt[1], torso_deg)

    draw_ik_cyber_arm(u_draw, far_sh[0], far_sh[1], hx_far, hy_far, is_far=True, bend_sign=1.0)

    body_hi = Image.new("RGBA", (416, 416), (0, 0, 0, 0))
    b_draw_hi = ImageDraw.Draw(body_hi)

    for jx, jy, rad in [
        (l_hip[0], l_hip[1], 10),
        (r_hip[0], r_hip[1], 10),
        (l_knee[0], l_knee[1], 8),
        (r_knee[0], r_knee[1], 8),
        (neck_pt[0], neck_pt[1], 8),
    ]:
        cx4, cy4 = int(round(jx * 4)), int(round(jy * 4))
        b_draw_hi.ellipse([cx4 - rad, cy4 - rad, cx4 + rad, cy4 + rad], fill=(38, 46, 74, 255))

    paste_rotated_part(body_hi, parts["l_thigh"], (47.0, 60.0), l_hip, l_thigh_deg)
    paste_rotated_part(body_hi, parts["l_shin"], (46.0, 71.0), l_knee, l_thigh_deg + l_shin_deg)
    paste_rotated_part(body_hi, parts["l_foot"], (43.0, 91.0), l_ankle, l_foot_deg)

    paste_rotated_part(body_hi, parts["r_thigh"], (56.0, 60.0), r_hip, r_thigh_deg)
    paste_rotated_part(body_hi, parts["r_shin"], (57.0, 71.0), r_knee, r_thigh_deg + r_shin_deg)
    paste_rotated_part(body_hi, parts["r_foot"], (56.0, 91.0), r_ankle, r_foot_deg)

    paste_rotated_part(body_hi, parts["torso"], (51.5, 59.0), hip_pt, torso_deg)
    paste_rotated_part(body_hi, parts["head"], (52.0, 28.0), neck_pt, torso_deg + head_rel_deg)

    body104 = body_hi.resize((104, 104), Image.Resampling.NEAREST)

    over104 = Image.new("RGBA", (104, 104), (0, 0, 0, 0))
    o_draw = ImageDraw.Draw(over104)

    gx, gy = draw_ik_cyber_arm(o_draw, near_sh[0], near_sh[1], hx_near, hy_near, is_far=False, bend_sign=1.0)
    draw_plasma_katana(o_draw, gx, gy, sword_ang, blade_len=27.0, energized=blade_energized)

    if row == 2 and 8 <= col <= 16:
        k = (col - 8) / 8.0
        draw_plasma_slash_arc(
            o_draw, chest_pt[0] + 10.0, chest_pt[1] + 4.0,
            -78 + k * 35, 42 + k * 28,
            rx=28.0, ry=24.0, thickness=4.5 * (1.0 - 0.55 * k), phase=k,
        )
    elif row == 3 and 9 <= col <= 19:
        k = (col - 9) / 10.0
        draw_plasma_slash_arc(
            o_draw, chest_pt[0] + 12.0, chest_pt[1] + 2.0,
            -55, 55, rx=30.0, ry=20.0, thickness=4.0 * math.sin(k * math.pi), phase=k,
        )
    elif row == 4 and 9 <= col <= 23:
        ang0 = col * 22
        draw_plasma_slash_arc(
            o_draw, chest_pt[0] + 18.0, chest_pt[1] - 2.0,
            ang0, ang0 + 220, rx=11.0, ry=11.0, thickness=2.6, phase=u,
        )
    elif row == 5:
        n_sparks = 4 if col <= 12 else (2 if col <= 22 else 1)
        for s_i in range(n_sparks):
            ang = s_i * 1.62 + col * 0.83
            rad0 = 5.0 if col <= 14 else 3.0 + (col % 3)
            rad1 = (11.5 if col <= 14 else 6.5) + (col % 2) * 1.5
            sx0 = int(round(chest_pt[0] + math.cos(ang) * rad0))
            sy0 = int(round(min(96.0, chest_pt[1] + math.sin(ang) * rad0 * 0.7)))
            sx1 = int(round(chest_pt[0] + math.cos(ang + 0.35) * rad1))
            sy1 = int(round(min(97.0, chest_pt[1] + math.sin(ang + 0.35) * rad1 * 0.7 - (col % 4) * 0.6)))
            sp_col = (0, 224, 255, 255) if (s_i + col) % 2 == 0 else (255, 46, 147, 255)
            draw_thick_seg_104(o_draw, sx0, sy0, sx1, sy1, 1.0, sp_col)
    elif row == 7 and 2 <= col <= 13:
        k = (col - 2) / 11.0
        draw_plasma_slash_arc(
            o_draw, chest_pt[0] + 8.0, chest_pt[1] + 10.0,
            -68, 68, rx=20.0, ry=32.0, thickness=2.2 + 0.6 * math.sin(k * math.pi * 2.0), phase=k,
        )
    elif row == 7 and 14 <= col <= 21:
        k = (col - 14) / 7.0
        draw_plasma_slash_arc(
            o_draw, chest_pt[0] + 12.0, chest_pt[1] + 6.0,
            -25, 38, rx=29.0, ry=12.0, thickness=3.6 * (1.0 - 0.5 * k), phase=k,
        )
    elif row == 8 and 13 <= col <= 20:
        k = (col - 13) / 7.0
        draw_plasma_slash_arc(
            o_draw, chest_pt[0] + 9.0, chest_pt[1] + 5.0,
            -70, 68, rx=27.0, ry=26.0, thickness=4.2 * (1.0 - 0.5 * k), phase=k,
        )

    merged = Image.new("RGBA", (104, 104), (0, 0, 0, 0))
    merged.alpha_composite(under104)
    merged.alpha_composite(body104)
    merged.alpha_composite(over104)

    return fill_pinholes_and_quantize_104(merged)


def save_parts_debug(base104, parts):
    dbg = Image.new("RGBA", (560, 220), (16, 20, 34, 255))
    d = ImageDraw.Draw(dbg)
    dbg.alpha_composite(base104.resize((208, 208), Image.Resampling.NEAREST), (6, 6))
    d.text((10, 8), "CLEAN 104 BASE", fill=(0, 224, 255, 255))
    names = ["head", "torso", "l_thigh", "l_shin", "l_foot", "r_thigh", "r_shin", "r_foot"]
    for i, nm in enumerate(names):
        col = i % 4
        row = i // 4
        px = 224 + col * 82
        py = 14 + row * 104
        d.rectangle([px, py, px + 76, py + 94], outline=(60, 72, 108, 255))
        p_img = parts[nm]["img104"]
        dbg.alpha_composite(p_img.resize((p_img.width * 2, p_img.height * 2), Image.Resampling.NEAREST), (px + 14, py + 18))
        d.text((px + 4, py + 3), nm, fill=(255, 138, 212, 255))
    out_p = os.path.join(ARTIFACT_DIR, "debug_android_parts.png")
    dbg.save(out_p)
    print(f"[android] Saved anatomical parts verification sheet -> {out_p}")


def save_contact_sheets(grid_104):
    row_names = [
        "R0 IDLE", "R1 WALK", "R2 AUTO", "R3 SKILL", "R4 ULT",
        "R5 DEATH", "R6 DASH", "R7 CROUCH", "R8 JUMP"
    ]
    for side, c_start, c_end, fname in [
        ("LEFT F00..F14", 0, 15, "debug_android_30fps_left_F00_F14.png"),
        ("RIGHT F15..F29", 15, 30, "debug_android_30fps_right_F15_F29.png"),
    ]:
        cw, ch = 104, 104
        pad = 4
        left_label_w = 78
        top_h = 24
        W = left_label_w + 15 * (cw + pad) + pad
        H = top_h + 9 * (ch + pad) + pad
        sheet = Image.new("RGBA", (W, H), (14, 17, 30, 255))
        draw = ImageDraw.Draw(sheet)
        draw.text((8, 6), f"VEX-09 (CYBERNETIC VALKYRIE) 30FPS - {side}", fill=(0, 224, 255, 255))
        for c in range(c_start, c_end):
            x = left_label_w + (c - c_start) * (cw + pad)
            draw.text((x + 36, 6), f"F{c:02d}", fill=(255, 138, 212, 255))
        for r in range(9):
            y = top_h + r * (ch + pad)
            draw.text((6, y + 46), row_names[r], fill=(232, 240, 252, 255))
            for c in range(c_start, c_end):
                x = left_label_w + (c - c_start) * (cw + pad)
                draw.rectangle([x, y, x + cw - 1, y + ch - 1], fill=(22, 27, 46, 255), outline=(44, 54, 84, 255))
                draw.line([(x, y + 99), (x + cw - 1, y + 99)], fill=(65, 40, 80, 180))
                sheet.alpha_composite(grid_104[r][c], (x, y))
        out_path = os.path.join(ARTIFACT_DIR, fname)
        sheet.save(out_path)
        print(f"[android] Wrote contact sheet -> {out_path}")


def main():
    build_portrait()
    base104 = extract_clean_104_base()
    parts = build_anatomical_parts(base104)
    save_parts_debug(base104, parts)

    thruster_strip = Image.open(THRUSTER_STRIP_PATH).convert("RGBA") if os.path.exists(THRUSTER_STRIP_PATH) else None

    sheet_208 = Image.new("RGBA", (30 * 208, 9 * 208), (0, 0, 0, 0))
    grid_104 = []
    border_clips = 0

    for r in range(9):
        row_cells = []
        distinct_transitions = 0
        prev_bytes = None
        for c in range(30):
            cell104 = render_frame_104(parts, r, c, thruster_strip)
            arr = np.array(cell104)
            if (
                np.any(arr[:2, :, 3] > 0)
                or np.any(arr[-2:, :, 3] > 0)
                or np.any(arr[:, :2, 3] > 0)
                or np.any(arr[:, -2:, 3] > 0)
            ):
                border_clips += 1
            cur_bytes = arr.tobytes()
            if prev_bytes is not None and cur_bytes != prev_bytes:
                distinct_transitions += 1
            prev_bytes = cur_bytes

            row_cells.append(cell104)
            cell208 = cell104.resize((208, 208), Image.Resampling.NEAREST)
            sheet_208.paste(cell208, (c * 208, r * 208))
        grid_104.append(row_cells)
        print(f"[android] Row {r}: {distinct_transitions}/29 distinct frame transitions")

    sheet_208.save(SHEET_OUT_PATH)
    print(f"[android] Wrote {SHEET_OUT_PATH} ({sheet_208.width}x{sheet_208.height}), border_clips={border_clips}/270")
    save_contact_sheets(grid_104)


if __name__ == "__main__":
    main()
