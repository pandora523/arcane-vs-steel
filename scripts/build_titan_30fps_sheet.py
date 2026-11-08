#!/usr/bin/env python3
"""
Builds Torgar's (Titan - Runic Titan-Forger) 30-Frame-Per-Animation HD-2D Sprite Sheet:
- 9 rows x 30 columns = 270 unique frames (6240 x 1872 at 208x208 per cell, 52x52 logical upscaled 4x NEAREST):
  * Row 0: IDLE (30 frames)
  * Row 1: WALK (30 frames)
  * Row 2: AUTO_ATTACK - TECTONIC HAMMER QUAKE (30 frames)
  * Row 3: SKILL - ANVIL OF THE MOUNTAIN KING (30 frames)
  * Row 4: ULTIMATE - RAGNAROK: WORLD-FORGE ERUPTION (30 frames)
  * Row 5: DEATH & HURT (30 frames)
  * Row 6: DASH - MOLTEN JUGGERNAUT STAMPEDE (30 frames)
  * Row 7: CROUCH - IRON-ANVIL BULWARK & MAGMA COUNTER (30 frames)
  * Row 8: JUMP - METEOR FORGE-LEAP & AERIAL HAMMER DUNK (30 frames)
- Un-inked clean pixel art: zero white background halo, strictly ONE Colossal World-Breaker Runic War-Hammer per frame,
  horizontal fallen body & flat horizontal hammer on Death F18..F29, and zero bouncy-ball frames in Jump.
"""

from collections import deque
import math
import numpy as np
from PIL import Image, ImageDraw

# Palette matching Torgar's HD-2D Runic Titan-Forger aesthetic
OBSIDIAN_DEEP = (15, 23, 42, 255)
OBSIDIAN_DARK = (30, 41, 59, 255)
IRON_DARK = (51, 65, 85, 255)
IRON_MID = (71, 85, 105, 255)
IRON_LIGHT = (148, 163, 184, 255)

BRONZE_DARK = (120, 53, 15, 255)
BRONZE_MID = (180, 83, 9, 255)
BRONZE_BRIGHT = (217, 119, 6, 255)
COPPER_BEARD_DARK = (154, 52, 18, 255)
COPPER_BEARD_MID = (194, 65, 12, 255)
COPPER_BEARD_HI = (234, 88, 12, 255)

GOLD_WHITE = (254, 240, 138, 255)   # #fef08a
GOLD_MOLTEN = (251, 191, 36, 255)   # #fbbf24
AMBER_FLAME = (245, 158, 11, 255)
MAGMA_ORANGE = (249, 115, 22, 255)
MAGMA_RED = (220, 38, 38, 255)

JADE_WHITE = (209, 250, 229, 255)
JADE_LIGHT = (110, 231, 183, 255)   # #6ee7b7
JADE_BRIGHT = (16, 185, 129, 255)   # #10b981
JADE_DEEP = (4, 120, 87, 255)

MANTLE_CHARCOAL = (39, 39, 42, 255)
MANTLE_FUR = (87, 83, 78, 255)
MANTLE_CRIMSON_DARK = (127, 29, 29, 255)
MANTLE_CRIMSON_HI = (185, 28, 28, 255)
SKIN_MID = (194, 120, 92, 255)


def set_px(buf, x, y, col):
    ix = int(round(x))
    iy = int(round(y))
    if 0 <= ix < 52 and 0 <= iy < 52:
        buf[iy, ix] = col


def draw_line_px(buf, x0, y0, x1, y1, col):
    steps = int(max(abs(x1 - x0), abs(y1 - y0), 1) * 2)
    for i in range(steps + 1):
        t = i / float(steps)
        set_px(buf, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, col)


def add_outline_to_layer(layer):
    """Un-inked clean pixel art pipeline: never dilates black outlines."""
    return layer.copy()


def composite_over(base, over):
    res = base.copy()
    mask = over[:, :, 3] > 0
    res[mask] = over[mask]
    return res


def extract_clean_base_sprite(
    path="/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/4f1fb80f-a88f-4496-9746-b4b9fe84f6d4/titan_v1_base_1794101258946.jpg",
):
    """
    Loads `titan_v1_base_1794101258946.jpg` (1024x1024), performs a BFS flood-fill from all 4 image borders
    to strip the white background + 1px anti-aliased fringe (ZERO white halo!), crops tight character bounds,
    and scales cleanly into the 52x52 logical cell with Torgar's boots planted firmly at y=45 (y=6..45).
    """
    im = Image.open(path).convert("RGBA")
    arr = np.array(im, dtype=np.uint8)
    h, w, _ = arr.shape

    visited = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        q.append((0, x))
        q.append((h - 1, x))
    for y in range(h):
        q.append((y, 0))
        q.append((y, w - 1))

    def is_exterior_white(r, g, b):
        if r > 210 and g > 210 and b > 210:
            return True
        mn, mx = min(r, g, b), max(r, g, b)
        if mn > 200 and (mx - mn) < 35:
            return True
        return False

    while q:
        cy, cx = q.popleft()
        if not (0 <= cy < h and 0 <= cx < w) or visited[cy, cx]:
            continue
        r, g, b = int(arr[cy, cx, 0]), int(arr[cy, cx, 1]), int(arr[cy, cx, 2])
        if is_exterior_white(r, g, b):
            visited[cy, cx] = True
            arr[cy, cx] = (0, 0, 0, 0)
            for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]:
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx]:
                    q.append((ny, nx))

    # Strip near-white anti-aliased fringe touching transparent exterior pixels (ZERO white halo!)
    for _ in range(3):
        trans = arr[:, :, 3] == 0
        fringe = np.zeros((h, w), dtype=bool)
        for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]:
            fringe |= np.roll(np.roll(trans, dy, axis=0), dx, axis=1)
        fringe &= ~trans
        for y in range(h):
            for x in range(w):
                if fringe[y, x]:
                    r, g, b = int(arr[y, x, 0]), int(arr[y, x, 1]), int(arr[y, x, 2])
                    if min(r, g, b) > 165 and (max(r, g, b) - min(r, g, b)) < 48:
                        arr[y, x] = (0, 0, 0, 0)

    ys, xs = np.where(arr[:, :, 3] > 0)
    crop = Image.fromarray(arr[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1], mode="RGBA")
    scaled = crop.resize((41, 40), Image.Resampling.NEAREST)
    s_arr = np.array(scaled, dtype=np.uint8)

    cell = np.zeros((52, 52, 4), dtype=np.uint8)
    cell[6:46, 4:45] = s_arr

    # Final 52x52 border fringe pass to ensure zero light-gray/white edge pixels survive downsampling
    trans52 = cell[:, :, 3] == 0
    for y in range(52):
        for x in range(52):
            if cell[y, x, 3] > 0:
                r, g, b = int(cell[y, x, 0]), int(cell[y, x, 1]), int(cell[y, x, 2])
                touches_empty = False
                for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                    ny, nx = y + dy, x + dx
                    if not (0 <= ny < 52 and 0 <= nx < 52) or trans52[ny, nx]:
                        touches_empty = True
                        break
                if touches_empty and min(r, g, b) > 180 and (max(r, g, b) - min(r, g, b)) < 40:
                    cell[y, x] = (0, 0, 0, 0)

    # Plant right boot (x=33..43, y=38..44) down +1px so BOTH boots plant firmly on y=45
    right_boot = cell[38:45, 33:44].copy()
    cell[38:45, 33:44] = 0
    cell[39:46, 33:44] = right_boot

    return cell


def make_clean_templates():
    """
    Constructs Torgar's modular anatomical templates from the clean 52x52 base sprite:
    - `stand`: full standing juggernaut with extended left fist trimmed to a clean guard
    - `stand_punch`: standing juggernaut with extended left arm intact
    - `stand_upper`: upper body (horns, head, beard, torso, pauldrons, cape, loinplate) without lower legs
    - `leg_back` (far leg) and `leg_front` (near leg) boot/greave patches
    - `lunge`: forward-leaning attack body
    - `kneel`: dropped to one knee (y+6px) for Death F07..F17 & Crouch
    - `fall`: 90-degree horizontally collapsed body on the ground (y=36..45) for Death F18..F29
    - `dash`: forward-tilted (+18 deg) Molten Juggernaut Stampede body
    """
    raw = extract_clean_base_sprite()
    stand_punch = raw.copy()

    # Trim extended far-right fist (x=39..44, y=24..29) for standard two-handed / shoulder-carry poses
    stand = raw.copy()
    stand[24:30, 39:45] = 0

    # Extract near leg (viewer left: x=16..24, y=38..46) and far leg (viewer right: x=33..43, y=38..46)
    leg_near_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_far_patch = np.zeros((52, 52, 4), dtype=np.uint8)
    leg_near_patch[38:46, 16:24] = stand[38:46, 16:24]
    leg_far_patch[38:46, 33:44] = stand[38:46, 33:44]

    stand_upper = stand.copy()
    stand_upper[37:, :, :] = 0
    # Keep cape tail and central runic tabard in stand_upper
    stand_upper[37:40, 23:33] = stand[37:40, 23:33]

    # Forward-leaning lunge body (+2px upper-body lean)
    lunge = np.zeros((52, 52, 4), dtype=np.uint8)
    lunge[36:46, :] = stand[36:46, :]
    for y in range(5, 37):
        dx = 2 if y <= 25 else 1
        for x in range(3, 49):
            if stand[y, x, 3] > 0 and x + dx < 51:
                lunge[y, x + dx] = stand[y, x]

    # Kneeling body (torso dropped +6px onto bent knees planted at y=45)
    kneel = np.zeros((52, 52, 4), dtype=np.uint8)
    # Bent lower legs anchored at y=40..45
    kneel[40:46, 15:43] = stand[40:46, 15:43]
    for y in range(6, 39):
        ny = y + 6
        if ny < 46:
            for x in range(4, 46):
                if stand[y, x, 3] > 0:
                    kneel[ny, x] = stand[y, x]

    # Horizontally collapsed body (90-degree rotated flat on the ground at y=36..45)
    body_no_cape = stand.copy()
    body_no_cape[20:39, 4:15] = 0
    pil_body = Image.fromarray(body_no_cape, mode="RGBA")
    rot_90 = np.array(
        pil_body.rotate(-88.0, resample=Image.Resampling.NEAREST, center=(28, 30)),
        dtype=np.uint8,
    )
    ys, xs = np.where(rot_90[:, :, 3] > 0)
    fall = np.zeros((52, 52, 4), dtype=np.uint8)
    if len(ys) > 0:
        dy_shift = 45 - int(ys.max())
        dx_shift = 25 - int((xs.min() + xs.max()) // 2)
        for y in range(52):
            for x in range(52):
                if rot_90[y, x, 3] > 0:
                    ny = max(32, min(45, y + dy_shift))
                    nx = max(4, min(48, x + dx_shift))
                    fall[ny, nx] = rot_90[y, x]

    # Dash body (+18 deg forward juggernaut bull-rush tilt with streaming fur mantle)
    pil_stand = Image.fromarray(stand, mode="RGBA")
    rot_dash = np.array(
        pil_stand.rotate(-16.0, resample=Image.Resampling.NEAREST, center=(28, 36)),
        dtype=np.uint8,
    )
    dash = np.zeros((52, 52, 4), dtype=np.uint8)
    dys, dxs = np.where(rot_dash[:, :, 3] > 0)
    if len(dys) > 0:
        d_shift = 45 - int(dys.max())
        for y in range(52):
            for x in range(52):
                if rot_dash[y, x, 3] > 0:
                    ny = max(4, min(45, y + d_shift))
                    dash[ny, x] = rot_dash[y, x]

    return {
        "stand": stand,
        "stand_punch": stand_punch,
        "stand_upper": stand_upper,
        "leg_near": leg_near_patch,
        "leg_far": leg_far_patch,
        "lunge": lunge,
        "kneel": kneel,
        "fall": fall,
        "dash": dash,
    }


def apply_mantle_and_beard_sway(frame, phase_rad, amplitude=1.5, vertical_flutter=0.6, is_dash=False, furnace_pulse=0.5):
    """
    Animates Torgar's fur-lined crimson-charcoal forge mantle (`x=4..21, y=14..38`),
    braided copper beard (`x=30..36, y=16..24`), and pulsing amber-gold eyes & chest furnace core!
    """
    out = frame.copy()

    # 1. Fur-lined crimson-charcoal forge mantle wave (left side x=3..20, y=15..38)
    cape_mask = np.zeros((52, 52), dtype=bool)
    for y in range(15, 39):
        max_x = 18 if y < 31 else 14
        for x in range(2, max_x + 1):
            if frame[y, x, 3] > 0:
                cape_mask[y, x] = True

    cape_src = frame.copy()
    out[cape_mask] = 0

    for y in range(15, 39):
        u = (y - 15) / 24.0
        if is_dash:
            wave_x = -1.5 * u + math.sin(phase_rad * 2.0 - u * 3.5) * (amplitude * u)
            wave_y = -2.2 * u + math.cos(phase_rad * 2.0 - u * 3.0) * (vertical_flutter * u)
        else:
            wave_x = math.sin(phase_rad - u * 3.2) * (amplitude * (0.2 + 0.8 * u))
            wave_y = math.cos(phase_rad - u * 2.6) * (vertical_flutter * u)
        dx = int(round(wave_x))
        dy = int(round(wave_y))
        max_x = 18 if y < 31 else 14
        for x in range(2, max_x + 1):
            if not cape_mask[y, x]:
                continue
            nx = max(1, min(21, x + dx))
            ny = max(12, min(42, y + dy))
            out[ny, nx] = cape_src[y, x]
            # Fill interior seam near shoulder/back so zero gap opens
            if dx < 0 and x >= max_x - 2 and out[y, x, 3] == 0:
                out[y, x] = cape_src[y, x]

    # 2. Subtle braided copper beard sway & ember highlights (x=31..35, y=17..23)
    beard_dx = 1 if math.sin(phase_rad) > 0.35 else (-1 if math.sin(phase_rad) < -0.55 else 0)
    if beard_dx != 0:
        for y in range(19, 24):
            for x in range(31, 36):
                if out[y, x, 3] > 0:
                    r, g, b, _ = out[y, x]
                    if r > 130 and g < 110 and b < 60:
                        set_px(out, x + beard_dx, y, COPPER_BEARD_HI if (y + x) % 2 == 0 else COPPER_BEARD_MID)

    # 3. Pulsing Amber-Gold Eyes (y=15, x=32..35) & Chest Furnace Core (y=24..26, x=31..34)
    for y in range(12, 31):
        for x in range(28, 38):
            if out[y, x, 3] == 0:
                continue
            r, g, b, _ = out[y, x]
            # Detect glowing orange/gold furnace/eye/rune pixels
            if r > 210 and g > 125 and b < 95:
                if furnace_pulse > 0.75:
                    out[y, x] = GOLD_WHITE if (x + y) % 2 == 0 else GOLD_MOLTEN
                elif furnace_pulse > 0.4:
                    out[y, x] = GOLD_MOLTEN if (x + y) % 2 == 0 else AMBER_FLAME

    return out


def draw_warhammer(
    canvas,
    hand_x,
    hand_y,
    angle_deg,
    glow_intensity=1.0,
    scale=1.0,
    haft_len=16.5,
    shoulder=(25, 19),
    two_handed=False,
    draw_arm=True,
    cleave_arc=None,
    phase=0.0,
):
    """
    Renders Torgar's Colossal World-Breaker Runic War-Hammer in his gauntlet:
    - Strictly ONE War-Hammer per frame!
    - Heavy dark-iron & bronze haft (`18..22px` total length from pommel to finial spike) gripped at `(hand_x, hand_y)`
    - Topped with a massive rectangular/beveled Obsidian & Bronze Runic Hammerhead (`11px x 7px` block at tip of haft)
      etched with glowing Molten Gold (`#fbbf24`, `#fef08a`) and Emerald-Jade (`#10b981`, `#6ee7b7`) Nordic runes,
      plus trailing forge embers when `glow_intensity > 1.0`.
    """
    hammer_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    fx_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    rad = math.radians(angle_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    px, py = -uy, ux  # perpendicular vector (striking axis of hammerhead)

    hx, hy = float(hand_x), float(hand_y)
    eff_len = haft_len * scale

    # 1. Articulated Armored Gauntlet & Arm from Shoulder to Hand
    if draw_arm and shoulder is not None:
        sx, sy = shoulder
        draw_line_px(hammer_layer, sx, sy, hx, hy, OBSIDIAN_DARK)
        draw_line_px(hammer_layer, sx, sy - 1, hx, hy - 1, IRON_MID)
        set_px(hammer_layer, (sx + hx) * 0.5, (sy + hy) * 0.5 - 1, BRONZE_BRIGHT)
        if two_handed:
            draw_line_px(hammer_layer, sx + 5, sy + 1, hx + ux * 2.2, hy + uy * 2.2, IRON_DARK)
            set_px(hammer_layer, hx + ux * 2.2, hy + uy * 2.2, BRONZE_MID)

    # 2. Heavy Dark-Iron & Bronze Haft (from pommel `-3.5px` behind hand to hammerhead neck `+eff_len`)
    pom_x = hx - ux * (3.5 * scale)
    pom_y = hy - uy * (3.5 * scale)
    neck_x = hx + ux * (eff_len - 2.5 * scale)
    neck_y = hy + uy * (eff_len - 2.5 * scale)

    haft_steps = int(round((eff_len + 3.5 * scale) * 2.5))
    for i in range(haft_steps + 1):
        u_s = i / float(max(1, haft_steps))
        sx_p = pom_x + (neck_x - pom_x) * u_s
        sy_p = pom_y + (neck_y - pom_y) * u_s
        ring_band = (i % 6 == 0)
        c_core = BRONZE_BRIGHT if ring_band else IRON_MID
        c_edge = BRONZE_MID if ring_band else OBSIDIAN_DARK
        set_px(hammer_layer, sx_p, sy_p, c_core)
        set_px(hammer_layer, sx_p + px * 0.65, sy_p + py * 0.65, c_edge)
        set_px(hammer_layer, sx_p - px * 0.65, sy_p - py * 0.65, OBSIDIAN_DEEP)

    # Runic Emerald/Gold Pommel Cap
    set_px(hammer_layer, pom_x, pom_y, GOLD_MOLTEN)
    set_px(hammer_layer, pom_x - ux * 0.9, pom_y - uy * 0.9, JADE_BRIGHT)

    # 3. Massive Rectangular/Beveled Obsidian & Bronze Runic Hammerhead (11px x 7px block at tip of haft)
    # Striking faces span perpendicular axis `p` (-5.0..+5.0 = 11px), thickness spans haft axis `u` (-3.0..+3.0 = 7px)
    head_cx = hx + ux * eff_len
    head_cy = hy + uy * eff_len
    half_strike = 5.0 * scale   # 11px across striking faces (-5..+5)
    half_thick = 3.0 * scale    # 7px along haft axis (-3..+3)

    # Dense sub-pixel sampling so rotated 11x7 rectangular block has zero pinhole gaps
    s_steps = int(round(half_strike * 4))
    t_steps = int(round(half_thick * 4))
    for si in range(-s_steps, s_steps + 1):
        sp = (si / float(max(1, s_steps))) * half_strike  # -5.0 .. +5.0
        for ti in range(-t_steps, t_steps + 1):
            ta = (ti / float(max(1, t_steps))) * half_thick  # -3.0 .. +3.0
            # Chamfered/beveled corners of the 11x7 rectangular war-hammer block
            if abs(sp) > half_strike - 0.7 and abs(ta) > half_thick - 0.7:
                continue

            wx = head_cx + px * sp + ux * ta
            wy = head_cy + py * sp + uy * ta

            asp = abs(sp) / max(0.1, half_strike)
            ata = abs(ta) / max(0.1, half_thick)

            # Striking faces at |sp| near 5.0 (forged bronze & molten gold impact rims)
            if asp > 0.80:
                col = GOLD_WHITE if (glow_intensity >= 1.1 and ata < 0.45) else (GOLD_MOLTEN if ata < 0.55 else BRONZE_BRIGHT)
            # Top/Bottom bronze bevel trim at |ta| near 3.0
            elif ata > 0.74:
                col = BRONZE_BRIGHT if ta > 0 else BRONZE_MID
            # Etched Nordic Runes inside the Obsidian-Iron core:
            # Central Emerald-Jade Forge Seal (`|sp| < 0.25`) + Flanking Molten-Gold Runic Chevrons (`0.38 < |sp| < 0.65`)
            elif asp < 0.22 and ata < 0.58:
                col = JADE_LIGHT if glow_intensity >= 0.85 else JADE_BRIGHT
            elif 0.36 <= asp <= 0.64 and (abs(ta - (abs(sp) - 2.2)) < 0.75 or abs(ta) < 0.35):
                col = GOLD_WHITE if glow_intensity >= 1.0 else GOLD_MOLTEN
            else:
                col = IRON_DARK if (si + ti) % 3 == 0 else OBSIDIAN_DARK

            set_px(hammer_layer, wx, wy, col)

    # Top Finial Spike protruding beyond the hammerhead (`+3.5..+5.0` along `u`)
    set_px(hammer_layer, head_cx + ux * (half_thick + 0.9), head_cy + uy * (half_thick + 0.9), BRONZE_BRIGHT)
    set_px(hammer_layer, head_cx + ux * (half_thick + 1.8), head_cy + uy * (half_thick + 1.8), GOLD_MOLTEN)

    # Armored Gauntlet Fist gripping the haft at (hx, hy)
    for dy_g in (-1, 0, 1):
        for dx_g in (-1, 0, 1):
            set_px(hammer_layer, hx + dx_g, hy + dy_g, BRONZE_BRIGHT if (dx_g == 0 and dy_g == -1) else IRON_MID)

    # 4. Trailing Molten-Gold & Emerald-Jade Embers when glow_intensity > 1.0
    if glow_intensity > 1.0:
        num_embers = 5 if glow_intensity >= 1.25 else 3
        for e_i in range(num_embers):
            e_ang = phase + e_i * 2.1
            ex = head_cx + math.cos(e_ang) * (4.5 + (e_i % 2) * 2.0)
            ey = head_cy + math.sin(e_ang) * (3.5 + (e_i % 2) * 1.5) - 1.0
            set_px(fx_layer, ex, ey, GOLD_WHITE if e_i % 2 == 0 else JADE_LIGHT)
            if glow_intensity >= 1.2:
                set_px(fx_layer, ex, ey - 1, MAGMA_ORANGE if e_i % 2 == 0 else JADE_BRIGHT)

    # 5. Optional Molten-Gold & Emerald-Jade Hammer Cleave Arc
    if cleave_arc is not None:
        a_start, a_end, arc_r, arc_int = cleave_arc
        arc_steps = 40
        piv_x = shoulder[0] if shoulder is not None else 26
        piv_y = shoulder[1] if shoulder is not None else 20
        for k in range(arc_steps + 1):
            u_a = k / float(arc_steps)
            ang = math.radians(a_start + (a_end - a_start) * u_a)
            ca, sa = math.cos(ang), math.sin(ang)
            env = math.sin(u_a * math.pi) * arc_int
            if env <= 0.1:
                continue
            ax = piv_x + ca * arc_r
            ay = piv_y + sa * arc_r
            set_px(fx_layer, ax, ay, GOLD_WHITE if u_a > 0.6 else GOLD_MOLTEN)
            set_px(fx_layer, ax - ca * 1.3, ay - sa * 1.3, JADE_LIGHT if (k % 3 == 0) else MAGMA_ORANGE)
            if env > 0.45:
                set_px(fx_layer, ax - ca * 2.5, ay - sa * 2.5, JADE_BRIGHT)
                set_px(fx_layer, ax - ca * 3.6, ay - sa * 3.6, BRONZE_MID)

    out = composite_over(canvas, hammer_layer)
    out = composite_over(out, fx_layer)
    return out


def render_walk_juggernaut(tpl, f):
    """
    Row 1 helper: Anatomical 2-step heavy juggernaut stride (F00..F14 Step 1, F15..F29 Step 2)
    rendered in strict back-to-front painter's order:
      Cape -> Back Leg (shaded 0.74x) -> Torso/Head/Tabard -> Front Leg (full highlight)
    with +-5px horizontal stride and 3px knee lift.
    """
    phase = (f / 30.0) * 2.0 * math.pi
    bob_y = int(round(math.cos(phase * 2.0) * 1.0))

    stand = tpl["stand"].copy()
    cape_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)

    # 1. Extract Fur-Lined Crimson-Charcoal Forge Mantle (Cape)
    for y in range(14, 39):
        ny = y + bob_y
        if not (0 <= ny < 52):
            continue
        u = (y - 14) / 25.0
        wave_dx = int(round(-u * 1.5 + math.sin(phase - u * 3.0) * (1.4 * u)))
        wave_dy = int(round(math.cos(phase - u * 2.5) * (0.6 * u)))
        max_x = 19 if y < 32 else 14
        for x in range(2, max_x + 1):
            if stand[y, x, 3] == 0:
                continue
            cx = max(1, min(21, x + wave_dx))
            cy = max(12, min(43, ny + wave_dy))
            cape_layer[cy, cx] = stand[y, x]
            if x >= max_x - 3:
                cape_layer[ny, x] = stand[y, x]

    # 2. Extract Upper Torso, Horned Helm, Braided Beard &Pauldrons (y=6..34, x>=16)
    for y in range(6, 35):
        ny = y + bob_y
        if not (0 <= ny < 52):
            continue
        for x in range(16, 42):
            if stand[y, x, 3] > 0:
                torso_layer[ny, x] = stand[y, x]
    torso_layer = apply_mantle_and_beard_sway(
        torso_layer, phase, amplitude=0.0, vertical_flutter=0.0, furnace_pulse=0.5 + 0.3 * math.sin(phase * 2.0)
    )

    hip_near_x = 21.5
    hip_far_x = 34.5
    hip_y = 33.0 + bob_y

    def build_juggernaut_leg(boot_patch, orig_cx, hip_x, swing_phase, is_far_leg=False):
        layer = np.zeros((52, 52, 4), dtype=np.uint8)
        s_val = math.sin(swing_phase)   # +1 = forward (+5px), -1 = backward (-5px)
        c_val = math.cos(swing_phase)   # +1 = passing 3px knee lift

        knee_lift = max(0.0, c_val)
        stride_dx = s_val * 5.0
        lift_dy = -int(round(knee_lift * 3.0))

        knee_x = hip_x + stride_dx * 0.65 + knee_lift * 1.5
        knee_y = hip_y + 4.5 - knee_lift * 2.5

        foot_target_x = orig_cx + stride_dx
        boot_rot_deg = s_val * 14.0 - knee_lift * 16.0

        pil_boot = Image.fromarray(boot_patch, mode="RGBA")
        rot_boot = np.array(
            pil_boot.rotate(boot_rot_deg, resample=Image.Resampling.NEAREST, center=(orig_cx, 42.0)),
            dtype=np.uint8,
        )

        dx_boot = int(round(foot_target_x - orig_cx))
        for y in range(36, 50):
            for x in range(4, 50):
                if rot_boot[y, x, 3] > 0:
                    ny = min(45, max(34, y + bob_y + lift_dy))
                    nx = min(49, max(4, x + dx_boot))
                    px_col = rot_boot[y, x].copy()
                    if is_far_leg:
                        px_col[0] = int(px_col[0] * 0.72)
                        px_col[1] = int(px_col[1] * 0.72)
                        px_col[2] = int(px_col[2] * 0.76)
                    layer[ny, nx] = px_col

        ank_x = foot_target_x
        ank_y = 41.0 + bob_y + lift_dy

        if is_far_leg:
            c_dark, c_mid, c_hi, c_trim = OBSIDIAN_DEEP, OBSIDIAN_DARK, IRON_DARK, BRONZE_DARK
        else:
            c_dark, c_mid, c_hi, c_trim = OBSIDIAN_DARK, IRON_DARK, IRON_MID, BRONZE_BRIGHT

        # Heavy Juggernaut Thigh Cuisse (Hip -> Knee)
        for off_x, col in [(-2.0, c_dark), (-1.0, c_mid), (0.0, c_hi), (1.0, c_mid), (2.0, c_dark)]:
            draw_line_px(layer, hip_x + off_x, hip_y, knee_x + off_x * 0.9, knee_y, col)

        # Heavy Armored Greave (Knee -> Boot)
        for off_x, col in [(-1.6, c_dark), (-0.6, c_mid), (0.4, c_hi), (1.4, c_dark)]:
            draw_line_px(layer, knee_x + off_x, knee_y, ank_x + off_x * 0.9, ank_y, col)

        # Bronze-Gold Knee-Guard Poleyn
        for dx_k in (-1, 0, 1):
            set_px(layer, knee_x + dx_k, knee_y, c_trim)
            set_px(layer, knee_x + dx_k, knee_y - 1, GOLD_MOLTEN if (not is_far_leg and dx_k == 0) else c_hi)

        return layer

    # F00..F14: near leg swings forward, far leg swings backward
    # F15..F29: far leg swings forward, near leg swings backward
    back_leg = build_juggernaut_leg(tpl["leg_far"], 37.5, hip_far_x, phase + math.pi, is_far_leg=True)
    front_leg = build_juggernaut_leg(tpl["leg_near"], 20.0, hip_near_x, phase, is_far_leg=False)

    # Central Runic Loinplate / Tabard swinging between legs (x=28..33, y=30..36)
    tabard_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    flap_dx = math.sin(phase) * 1.6
    for off_x, col in [(-2.0, BRONZE_DARK), (-1.0, OBSIDIAN_DARK), (0.0, GOLD_MOLTEN), (1.0, OBSIDIAN_DARK), (2.0, BRONZE_MID)]:
        draw_line_px(tabard_layer, 30.5 + off_x, hip_y - 2.0, 30.5 + off_x + flap_dx, hip_y + 4.5, col)

    # Strict Back-to-Front Painter's Order: Cape -> Back Leg -> Torso/Tabard -> Front Leg
    out = composite_over(cape_layer, back_leg)
    out = composite_over(out, tabard_layer)
    out = composite_over(out, torso_layer)
    out = composite_over(out, front_leg)
    return out


def make_crouch_juggernaut(tpl, crouch_depth):
    """
    Constructs Torgar's deep fortified crouch with `torso/head shifted down +crouch_depth` (up to +7px),
    knees bent, and boots planted firmly at `y=45`.
    """
    canvas = np.zeros((52, 52, 4), dtype=np.uint8)
    # Keep boots and bent lower greaves planted firmly at y=39..45
    canvas[39:46, 15:44] = tpl["stand"][39:46, 15:44]
    upper = tpl["stand_upper"]
    for y in range(6, 38):
        ny = y + crouch_depth
        if 0 <= ny < 45:
            for x in range(2, 48):
                if upper[y, x, 3] > 0:
                    canvas[ny, x] = upper[y, x]
    return canvas


def make_aerial_juggernaut(tpl, jump_dy, body_tilt_deg=0.0, leg_tuck=0.5, thruster_intensity=0.8, phase=0.0):
    """
    Row 8 helper: Constructs a full-body heroic aerial Torgar posture:
    - ZERO bouncy-ball or curled sphere frames!
    - Torgar's full horned head, braided beard, armored torso, fur mantle, articulated legs,
      and downward orange/gold furnace thruster flames under his boots are 100% distinct on every frame!
    """
    stand = tpl["stand"].copy()
    pil_upper = Image.fromarray(tpl["stand_upper"], mode="RGBA")
    rot_upper = np.array(
        pil_upper.rotate(-body_tilt_deg, resample=Image.Resampling.NEAREST, center=(28, 24)),
        dtype=np.uint8,
    )

    dy_i = int(round(jump_dy))
    torso_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    for y in range(52):
        ny = y + dy_i
        if 2 <= ny < 49:
            for x in range(52):
                if rot_upper[y, x, 3] > 0:
                    torso_layer[ny, x] = rot_upper[y, x]

    # Articulated back and front armored legs + boots in mid-air
    leg_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    t = max(0.0, min(1.0, leg_tuck))
    near_boot_y = max(30, min(45, 45 + dy_i - int(round(t * 3.0))))
    far_boot_y = max(29, min(45, 45 + dy_i - int(round(t * 4.0))))

    # Far leg (x=33..41)
    for y in range(34, 46):
        ny = max(24, min(46, y + dy_i - int(round(t * 3.0))))
        for x in range(33, 44):
            if stand[y, x, 3] > 0:
                leg_layer[ny, x] = stand[y, x]

    # Near leg (x=16..24)
    for y in range(34, 46):
        ny = max(24, min(46, y + dy_i - int(round(t * 2.0))))
        for x in range(16, 25):
            if stand[y, x, 3] > 0:
                leg_layer[ny, x] = stand[y, x]

    # Downward Orange/Gold Furnace Thruster Flames under both boots when airborne
    fx_layer = np.zeros((52, 52, 4), dtype=np.uint8)
    if thruster_intensity > 0.1:
        jet_len = int(round(5.0 * thruster_intensity))
        for boot_cx, boot_by in [(20, near_boot_y), (37, far_boot_y)]:
            for d in range(1, jet_len + 1):
                jy = boot_by + d
                if jy < 51:
                    col = GOLD_WHITE if d == 1 else (GOLD_MOLTEN if d <= 2 else (MAGMA_ORANGE if d <= 4 else MAGMA_RED))
                    set_px(fx_layer, boot_cx, jy, col)
                    if d <= 3:
                        set_px(fx_layer, boot_cx - 1, jy, MAGMA_ORANGE)
                        set_px(fx_layer, boot_cx + 1, jy, GOLD_MOLTEN)

    out = composite_over(fx_layer, leg_layer)
    out = composite_over(out, torso_layer)
    out = apply_mantle_and_beard_sway(out, phase, amplitude=1.8, vertical_flutter=0.8, furnace_pulse=0.9)
    return out


def draw_anvil_shield_bulwark(canvas, x_front=38, y_top=16, y_bot=45, glow=0.8, phase=0.0):
    """
    Row 7 helper: Projects a glowing Bronze & Emerald-Jade Runic Anvil-Shield Bulwark
    in front of Torgar (`x=32..44, y=16..45`) while crouched.
    """
    sh = np.zeros((52, 52, 4), dtype=np.uint8)
    ymid = (y_top + y_bot) * 0.5
    for y in range(y_top, y_bot + 1):
        u = abs(y - ymid) / max(1.0, (y_bot - y_top) * 0.5)
        # Anvil-horned shield profile: wider at top anvil horn & base, indented waist
        half_w = 5 if (u > 0.65 or u < 0.25) else 4
        for dx in range(-half_w, half_w + 1):
            px_x = x_front + dx
            if abs(dx) == half_w or y in (y_top, y_bot):
                col = GOLD_WHITE if (glow > 0.85 and dx > 0) else BRONZE_BRIGHT
            elif abs(dx) == half_w - 1:
                col = BRONZE_MID
            elif dx == 0 or abs(y - int(ymid)) <= 1:
                col = JADE_LIGHT if glow > 0.7 else JADE_BRIGHT
            elif (x_front + dx + y + int(round(phase * 2))) % 5 == 0:
                col = GOLD_MOLTEN
            else:
                col = OBSIDIAN_DARK
            set_px(sh, px_x, y, col)

    # Outer projected Emerald-Jade & Gold hexagonal energy barrier arc at x=43..45
    if glow > 0.5:
        for y in range(y_top - 1, y_bot + 1):
            curve_x = x_front + 6 - int(((y - ymid) / 9.0) ** 2)
            if (y + int(round(phase * 3))) % 2 == 0 or glow > 0.8:
                set_px(sh, curve_x, y, JADE_LIGHT if abs(y - ymid) < 6 else JADE_BRIGHT)
                set_px(sh, curve_x - 1, y, GOLD_MOLTEN if int(y) % 4 == 0 else JADE_DEEP)

    return composite_over(canvas, sh)


def draw_ragnarok_crown_and_jets(canvas, head_xy=(33, 9), shoulder_xy=(23, 17), intensity=1.0, phase=0.0):
    """
    Row 4 Ultimate helper: Blazing Molten-Gold & Emerald-Jade Runic Crown/Horns and Furnace Back-Jets!
    """
    fx = np.zeros((52, 52, 4), dtype=np.uint8)
    hx, hy = head_xy
    sx, sy = shoulder_xy

    # 1. Blazing Molten-Gold & Jade Runic Horn Aura & Nordic Crown Sigil above helm
    for side in (-1, 1):
        for d in range(1, 7):
            cx_h = hx + side * (3 + d * 0.7)
            cy_h = hy - d * 0.85 + math.sin(phase + d) * 0.4
            set_px(fx, cx_h, cy_h, GOLD_WHITE if d >= 5 else (GOLD_MOLTEN if d % 2 == 0 else JADE_LIGHT))
    # Floating Emerald-Gold Crown Rune at apex
    set_px(fx, hx, max(1, hy - 5), JADE_WHITE)
    set_px(fx, hx - 1, max(1, hy - 4), GOLD_MOLTEN)
    set_px(fx, hx + 1, max(1, hy - 4), GOLD_MOLTEN)
    set_px(fx, hx, max(1, hy - 3), JADE_BRIGHT)

    # 2. Twin Roaring Furnace Back-Jets behind pauldrons
    jet_spans = [-145.0, -130.0, -115.0, -100.0]
    for idx, deg in enumerate(jet_spans):
        ang = math.radians(deg + math.sin(phase * 2.0 + idx) * 4.0)
        max_d = int(round((11.0 - idx * 1.2) * intensity))
        for d in range(2, max_d + 1):
            jx = sx + math.cos(ang) * d
            jy = sy + math.sin(ang) * d
            col = GOLD_WHITE if d <= 3 else (GOLD_MOLTEN if d <= 6 else (MAGMA_ORANGE if idx % 2 == 0 else JADE_BRIGHT))
            set_px(fx, jx, jy, col)

    return composite_over(fx, canvas)


def build_row0_idle(tpl):
    """
    Row 0 (`IDLE`, 0..29):
    - Heavy furnace-core chest breathing (1px chest/shoulder rise & fall)
    - Braided copper beard & fur-lined crimson-charcoal forge mantle swaying (F00..F29)
    - Glowing amber-gold eyes & chest furnace core pulsing
    - Holding the World-Breaker War-Hammer resting diagonally over his right shoulder with pulsing gold/jade runes
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        base = tpl["stand"].copy()

        # 1px heavy furnace-core chest/shoulder breathing rise on F08..F20
        breath_dy = -1 if 8 <= f <= 20 else 0
        if breath_dy != 0:
            upper = base[6:31, 17:40].copy()
            base[6:31, 17:40] = 0
            base[6 + breath_dy : 31 + breath_dy, 17:40] = upper

        pulse = 0.55 + 0.45 * math.sin(phase)
        base = apply_mantle_and_beard_sway(
            base, phase, amplitude=1.6, vertical_flutter=0.6, furnace_pulse=pulse
        )

        # World-Breaker War-Hammer resting diagonally over his right shoulder (angle ~ -124 deg)
        hammer_ang = -124.0 + math.sin(phase) * 3.0
        hx = 27
        hy = 24 + breath_dy
        frame = draw_warhammer(
            base,
            hand_x=hx,
            hand_y=hy,
            angle_deg=hammer_ang,
            glow_intensity=0.85 + 0.35 * math.sin(phase),
            scale=1.0,
            haft_len=15.5,
            shoulder=(23, 18 + breath_dy),
            phase=phase,
        )

        # Travelling molten-gold & emerald-jade rune spark along the hammerhead & furnace core
        spark_x = 18 + (f % 5)
        spark_y = 10 + breath_dy + ((f // 5) % 3) - 1
        set_px(frame, spark_x, spark_y, JADE_LIGHT if f % 2 == 0 else GOLD_WHITE)

        frames.append(frame)
    return frames


def build_row1_walk(tpl):
    """
    Row 1 (`WALK`, 30..59):
    - Anatomical 2-step heavy juggernaut stride (F00..F14 Step 1, F15..F29 Step 2)
    - Strict back-to-front painter's order (Cape -> Back Leg -> Torso/Head -> Front Leg -> War-Hammer)
    - Distinct dark/mid/highlight armor shading on each leg, +-5px horizontal stride, 3px knee lift,
      and counter-swinging War-Hammer.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        body = render_walk_juggernaut(tpl, f)
        bob_y = int(round(math.cos(phase * 2.0) * 1.0))

        swing = math.sin(phase)
        hammer_ang = -118.0 + swing * 12.0
        hx = 27 - int(round(swing * 2.0))
        hy = 24 + bob_y + int(round(abs(swing) * 1.0))

        frame = draw_warhammer(
            body,
            hand_x=hx,
            hand_y=hy,
            angle_deg=hammer_ang,
            glow_intensity=0.9 + 0.2 * math.sin(phase * 2.0),
            scale=1.0,
            haft_len=15.5,
            shoulder=(23, 18 + bob_y),
            phase=phase,
        )
        frames.append(frame)
    return frames


def build_row2_auto_attack(tpl):
    """
    Row 2 (`AUTO_ATTACK` - Tectonic Hammer Quake, 60..89):
    - F00..F10: Two-handed overhead/back-shoulder windup (angle lifting from -45 deg to -135 deg behind head)
      as the hammerhead ignites with blazing molten-gold & jade runes.
    - F11..F19: Crushing downward earth-slam (angle snapping through 0 deg down to +35 deg into the ground y=44)
      with a wide multi-frame molten-gold & emerald-jade hammer cleave arc and ground-shatter magma sparks at impact (F12..F16).
    - F20..F29: Heavy follow-through recovery lifting the smoking War-Hammer back to stance.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 10:
            # F00..F10: Two-handed overhead/back-shoulder windup (-45 deg -> -135 deg)
            u = f / 10.0
            base = tpl["stand"].copy()
            coil_dx = -1 if f >= 5 else 0
            if coil_dx != 0:
                base = np.roll(base, coil_dx, axis=1)
                base[:, -1:] = 0
            base = apply_mantle_and_beard_sway(
                base, phase, amplitude=1.6 + u * 0.6, vertical_flutter=0.7, furnace_pulse=0.6 + u * 0.4
            )
            ang = -45.0 * (1.0 - u) + (-135.0) * u
            hx = int(round(29 * (1.0 - u) + 25 * u))
            hy = int(round(23 * (1.0 - u) + 14 * u))
            frame = draw_warhammer(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=0.85 + u * 0.45,
                scale=1.05,
                haft_len=16.0,
                shoulder=(24 + coil_dx, 18),
                two_handed=True,
                phase=phase,
            )
            frames.append(frame)

        elif f <= 19:
            # F11..F19: Crushing downward earth-slam snapping through 0 deg down to +35 deg into the ground y=44
            k = f - 11
            base = (tpl["lunge"] if k >= 1 else tpl["stand"]).copy()
            if k in (1, 2, 3, 4):
                base = np.roll(base, 1, axis=1)
                base[:, 0:1] = 0
            base = apply_mantle_and_beard_sway(
                base, phase * 2.0, amplitude=2.3, vertical_flutter=1.0, furnace_pulse=1.0
            )

            ang_seq = [-45.0, 0.0, 28.0, 35.0, 35.0, 34.0, 30.0, 24.0, 16.0]
            hx_seq = [30, 33, 34, 34, 34, 34, 33, 32, 31]
            hy_seq = [16, 21, 26, 28, 28, 28, 27, 26, 25]

            cleave_arc = None
            if k <= 5:
                arc_int = [0.85, 1.0, 1.0, 0.9, 0.7, 0.45][k]
                a0 = [-135.0, -100.0, -65.0, -30.0, -10.0, 5.0][k]
                cleave_arc = (a0, ang_seq[k] + 8.0, 19.5, arc_int)

            frame = draw_warhammer(
                base,
                hand_x=hx_seq[k],
                hand_y=hy_seq[k],
                angle_deg=ang_seq[k],
                glow_intensity=1.35 if k <= 5 else 1.0,
                scale=1.08,
                haft_len=15.5,
                shoulder=(27, 18),
                two_handed=True,
                cleave_arc=cleave_arc,
                phase=phase,
            )

            # Ground-shatter magma & emerald-jade sparks at impact (F12..F16 -> k=1..5)
            if 1 <= k <= 5:
                imp_x, imp_y = 45, 44
                for sp in range(5):
                    sx = imp_x - 5 + sp * 2 + (k % 2)
                    sy = imp_y - ((sp + k) % 4) * 2
                    set_px(frame, sx, sy, GOLD_WHITE if sp == 2 else (JADE_LIGHT if sp % 2 == 0 else MAGMA_ORANGE))
                    draw_line_px(frame, imp_x - 4, 45, imp_x + 4, 45, GOLD_MOLTEN if k <= 3 else MAGMA_ORANGE)

            frames.append(frame)

        else:
            # F20..F29: Heavy follow-through recovery lifting smoking War-Hammer back to shoulder stance
            u = (f - 20) / 9.0
            base = (tpl["lunge"] if f <= 22 else tpl["stand"]).copy()
            base = apply_mantle_and_beard_sway(
                base, phase, amplitude=1.6, vertical_flutter=0.6, furnace_pulse=0.8 - u * 0.25
            )
            ang = 12.0 * (1.0 - u) + (-124.0) * u
            hx = int(round(31 * (1.0 - u) + 27 * u))
            hy = int(round(25 * (1.0 - u) + 24 * u))
            frame = draw_warhammer(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.05 - u * 0.2,
                scale=1.0,
                haft_len=15.5,
                shoulder=(24, 18),
                phase=phase,
            )
            frames.append(frame)
    return frames


def build_row3_skill(tpl):
    """
    Row 3 (`SKILL` - Anvil of the Mountain King, 90..119):
    - F00..F12: Torgar raises his armored left fist skyward (emerald-jade & gold forge seal flaring above his gauntlet)
      to summon the falling Runic Anvil while bracing his War-Hammer back.
    - F13..F22: Full-body horizontal baseball-style War-Hammer power-smash (F14..F19 explosive horizontal
      amber-gold & jade shockwave arc) driving the summoned anvil/wave forward.
    - F23..F29: Recovery to fighting stance.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 12:
            # F00..F12: Raises armored left fist skyward with flaring emerald-jade & gold forge seal
            u = f / 12.0
            base = tpl["stand"].copy()
            base = apply_mantle_and_beard_sway(
                base, phase * 1.5, amplitude=1.8, vertical_flutter=0.7, furnace_pulse=0.75 + u * 0.25
            )

            # Braced War-Hammer held back over right shoulder (-132 deg -> -148 deg)
            hammer_ang = -126.0 - u * 22.0
            frame = draw_warhammer(
                base,
                hand_x=25,
                hand_y=23,
                angle_deg=hammer_ang,
                glow_intensity=1.0 + u * 0.3,
                scale=1.0,
                haft_len=15.0,
                shoulder=(22, 18),
                phase=phase,
            )

            # Raised left gauntlet skyward at (fx_x=39, fx_y=16 -> 10)
            fist_x = 39
            fist_y = int(round(20 * (1.0 - min(1.0, u * 1.4)) + 11 * min(1.0, u * 1.4)))
            draw_line_px(frame, 35, 20, fist_x, fist_y, IRON_MID)
            draw_line_px(frame, 36, 20, fist_x + 1, fist_y, BRONZE_BRIGHT)
            for dy_f in (-1, 0, 1):
                for dx_f in (-1, 0, 1):
                    set_px(frame, fist_x + dx_f, fist_y + dy_f, GOLD_MOLTEN if dy_f == -1 else IRON_LIGHT)

            # Flaring Emerald-Jade & Molten-Gold Forge Seal above raised left gauntlet
            seal_r = 2.5 + u * 3.0
            seal_cy = max(5, fist_y - 4)
            for s_i in range(16):
                sa = (s_i / 16.0) * 2.0 * math.pi + phase * 2.0
                sx = fist_x + math.cos(sa) * seal_r
                sy = seal_cy + math.sin(sa) * (seal_r * 0.6)
                set_px(frame, sx, sy, JADE_LIGHT if s_i % 2 == 0 else GOLD_MOLTEN)
            set_px(frame, fist_x, seal_cy, GOLD_WHITE)
            set_px(frame, fist_x - 1, seal_cy, JADE_BRIGHT)
            set_px(frame, fist_x + 1, seal_cy, JADE_BRIGHT)

            frames.append(frame)

        elif f <= 22:
            # F13..F22: Full-body horizontal baseball-style War-Hammer power-smash!
            k = f - 13
            u = k / 9.0
            base = tpl["lunge"].copy()
            if 1 <= k <= 6:
                base = np.roll(base, 2 if k <= 4 else 1, axis=1)
                base[:, 0:2] = 0
            base = apply_mantle_and_beard_sway(
                base, phase * 2.5, amplitude=2.5, vertical_flutter=1.0, furnace_pulse=1.0
            )

            ang_seq = [-110.0, -45.0, -12.0, 2.0, 6.0, 8.0, 6.0, 2.0, -6.0, -20.0]
            hx_seq = [27, 29, 30, 31, 31, 30, 30, 29, 29, 28]
            hy_seq = [22, 23, 24, 24, 24, 24, 24, 24, 24, 24]

            frame = draw_warhammer(
                base,
                hand_x=hx_seq[k],
                hand_y=hy_seq[k],
                angle_deg=ang_seq[k],
                glow_intensity=1.35 if 1 <= k <= 6 else 1.0,
                scale=1.0,
                haft_len=13.5,
                shoulder=(26, 19),
                two_handed=True,
                phase=phase,
            )

            # F14..F19 (k=1..6): Explosive horizontal amber-gold & emerald-jade 3D shockwave arc!
            if 1 <= k <= 6:
                for rx_i in range(18):
                    ua = rx_i / 17.0
                    arc_x = int(round(22 + ua * 26))
                    arc_y = 24 + int(round(math.sin((ua - 0.5) * math.pi) * 4.5))
                    set_px(frame, arc_x, arc_y, GOLD_WHITE if ua > 0.6 else GOLD_MOLTEN)
                    set_px(frame, arc_x, arc_y - 1, JADE_LIGHT if rx_i % 2 == 0 else MAGMA_ORANGE)
                    set_px(frame, arc_x, arc_y + 1, JADE_BRIGHT)

            frames.append(frame)

        else:
            # F23..F29: Recovery to fighting stance
            u = (f - 23) / 6.0
            base = (tpl["lunge"] if f <= 24 else tpl["stand"]).copy()
            base = apply_mantle_and_beard_sway(
                base, phase, amplitude=1.6, vertical_flutter=0.6, furnace_pulse=0.75 - u * 0.2
            )
            ang = -25.0 * (1.0 - u) + (-124.0) * u
            hx = int(round(30 * (1.0 - u) + 27 * u))
            hy = 24
            frame = draw_warhammer(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=0.95,
                scale=1.0,
                haft_len=15.5,
                shoulder=(24, 18),
                phase=phase,
            )
            frames.append(frame)
    return frames


def build_row4_ultimate(tpl):
    """
    Row 4 (`ULTIMATE` - Ragnarok: World-Forge Eruption, 120..149):
    - F00..F09: Torgar roars as a blazing Molten-Gold & Jade Runic Crown/Horns and furnace back-jets ignite around him,
      raising the enlarged superheated World-Breaker War-Hammer overhead.
    - F10..F20: Two consecutive seismic earth-slams (F11..F14 Slam 1, F16..F20 Slam 2) with volcanic cracks
      and magma plumes erupting under his boots.
    - F21..F29: Cataclysmic final overhead World-Breaker plunge (F22..F26 blinding golden-jade forge nova & shockwave rings)
      and triumphant recovery (F27..F29).
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 9:
            # F00..F09: Roaring ignition with Runic Crown/Horns, furnace back-jets & enlarged overhead War-Hammer
            u = f / 9.0
            base = tpl["stand"].copy()
            base = apply_mantle_and_beard_sway(
                base, phase * 2.5, amplitude=2.2, vertical_flutter=1.0, furnace_pulse=1.0
            )
            base = draw_ragnarok_crown_and_jets(base, head_xy=(33, 9), shoulder_xy=(23, 17), intensity=0.5 + 0.5 * u, phase=phase * 2.0)

            ang = -115.0 * (1.0 - u) + (-88.0) * u
            frame = draw_warhammer(
                base,
                hand_x=29,
                hand_y=int(round(22 * (1.0 - u) + 17 * u)),
                angle_deg=ang,
                glow_intensity=1.15 + u * 0.3,
                scale=1.05 + u * 0.10,
                haft_len=13.5,
                shoulder=(26, 17),
                two_handed=True,
                phase=phase * 2.0,
            )
            frames.append(frame)

        elif f <= 20:
            # F10..F20: Two consecutive seismic earth-slams (F11..F14 Slam 1, F16..F20 Slam 2) with volcanic cracks & magma plumes!
            k = f - 10
            is_slam1 = (1 <= k <= 4)
            is_slam2 = (6 <= k <= 10)
            crouch_d = 3 if (is_slam1 or is_slam2) else 0
            base = make_crouch_juggernaut(tpl, crouch_d) if crouch_d > 0 else tpl["lunge"].copy()
            base = apply_mantle_and_beard_sway(
                base, phase * 3.0, amplitude=2.4, vertical_flutter=1.1, furnace_pulse=1.0
            )
            base = draw_ragnarok_crown_and_jets(
                base, head_xy=(33, 9 + crouch_d), shoulder_xy=(23, 17 + crouch_d), intensity=1.0, phase=phase * 3.0
            )

            if k == 0 or k == 5:
                ang = -85.0
                hx, hy = 29, 17
                cleave = None
            elif is_slam1:
                ang = [12.0, 32.0, 36.0, 20.0][k - 1]
                hx, hy = 32, 25
                cleave = (-85.0, ang + 6.0, 19.5, 1.0 if k <= 2 else 0.7)
            else:
                ang = [16.0, 34.0, 38.0, 32.0, 10.0][k - 6]
                hx, hy = 32, 25
                cleave = (-85.0, ang + 6.0, 20.0, 1.0 if k <= 8 else 0.75)

            frame = draw_warhammer(
                base,
                hand_x=hx,
                hand_y=hy,
                angle_deg=ang,
                glow_intensity=1.4,
                scale=1.12,
                haft_len=14.0,
                shoulder=(27, 18 + crouch_d),
                two_handed=True,
                cleave_arc=cleave,
                phase=phase * 2.0,
            )

            # Volcanic cracks and magma/jade plumes erupting under boots during Slam 1 & Slam 2
            if is_slam1 or is_slam2:
                for cx_p in (16, 28, 42):
                    plume_h = 6 + ((k * 3 + cx_p) % 5)
                    draw_line_px(frame, cx_p, 45, cx_p, 45 - plume_h, GOLD_WHITE if cx_p == 42 else MAGMA_ORANGE)
                    set_px(frame, cx_p - 1, 45 - plume_h // 2, JADE_LIGHT)
                    set_px(frame, cx_p + 1, 45 - plume_h // 2, GOLD_MOLTEN)
                draw_line_px(frame, 10, 45, 48, 45, GOLD_MOLTEN if k % 2 == 0 else JADE_BRIGHT)

            frames.append(frame)

        elif f <= 26:
            # F21..F26: Cataclysmic final overhead World-Breaker plunge & blinding golden-jade forge nova!
            k = f - 21
            if k == 0:
                body = make_aerial_juggernaut(tpl, jump_dy=-3, body_tilt_deg=10.0, leg_tuck=0.7, thruster_intensity=1.0, phase=phase)
                body = draw_ragnarok_crown_and_jets(body, head_xy=(33, 6), shoulder_xy=(23, 14), intensity=1.1, phase=phase)
                frame = draw_warhammer(
                    body,
                    hand_x=30,
                    hand_y=16,
                    angle_deg=-95.0,
                    glow_intensity=1.5,
                    scale=1.12,
                    haft_len=12.5,
                    shoulder=(27, 15),
                    two_handed=True,
                    phase=phase,
                )
            else:
                crouch_d = [5, 6, 6, 5, 4][k - 1]
                body = make_crouch_juggernaut(tpl, crouch_d)
                body = apply_mantle_and_beard_sway(body, phase * 3.0, amplitude=2.5, vertical_flutter=1.2, furnace_pulse=1.0)
                body = draw_ragnarok_crown_and_jets(
                    body, head_xy=(33, 9 + crouch_d), shoulder_xy=(23, 17 + crouch_d), intensity=1.1, phase=phase
                )
                frame = draw_warhammer(
                    body,
                    hand_x=32,
                    hand_y=26,
                    angle_deg=34.0,
                    glow_intensity=1.5,
                    scale=1.14,
                    haft_len=14.0,
                    shoulder=(27, 19 + crouch_d),
                    two_handed=True,
                    cleave_arc=(-100.0, 40.0, 20.0, 1.0) if k <= 2 else None,
                    phase=phase,
                )
                # Blinding golden-jade forge nova & expanding shockwave rings at ground level (y=41..47)
                ring_rx = 8 + k * 4
                for s_i in range(32):
                    sa = (s_i / 32.0) * 2.0 * math.pi
                    rx = 32 + math.cos(sa) * ring_rx
                    ry = 44 + math.sin(sa) * 3.0
                    set_px(frame, rx, ry, GOLD_WHITE if s_i % 3 == 0 else (JADE_LIGHT if s_i % 2 == 0 else GOLD_MOLTEN))

            frames.append(frame)

        else:
            # F27..F29: Triumphant recovery
            k = f - 27
            u = (k + 1) / 3.0
            crouch_d = [2, 1, 0][k]
            body = make_crouch_juggernaut(tpl, crouch_d) if crouch_d > 0 else tpl["stand"].copy()
            body = apply_mantle_and_beard_sway(body, phase, amplitude=1.8, vertical_flutter=0.7, furnace_pulse=0.9)
            body = draw_ragnarok_crown_and_jets(
                body, head_xy=(33, 9 + crouch_d), shoulder_xy=(23, 17 + crouch_d), intensity=0.7 * (1.0 - u * 0.5), phase=phase
            )
            ang = 20.0 * (1.0 - u) + (-124.0) * u
            frame = draw_warhammer(
                body,
                hand_x=int(round(32 * (1.0 - u) + 27 * u)),
                hand_y=24 + crouch_d,
                angle_deg=ang,
                glow_intensity=1.1,
                scale=1.05,
                haft_len=15.5,
                shoulder=(24, 18 + crouch_d),
                phase=phase,
            )
            frames.append(frame)
    return frames


def build_row5_death(tpl):
    """
    Row 5 (`DEATH` & `HURT`, 150..179):
    - F00..F06: Hit-stagger recoil (`HURT` uses F00..F06) with sparks flying off his breastplate.
    - F07..F17: Drops heavy to one knee (y+6px), leaning on his War-Hammer shaft as his furnace core flickers.
    - F18..F29: Collapses horizontally (90 deg rotated body lying flat on the ground at y=37..46)
      with his War-Hammer lying flat (0 deg horizontal) on the ground beside him (y=43..46)
      — ZERO upright or floating hammer!
    """
    frames = []
    for f in range(30):
        if f <= 6:
            # F00..F06: Hit-stagger recoil with sparks flying off his breastplate
            u = f / 6.0
            dx = -int(round(math.sin(u * math.pi * 0.85) * 2.5))
            dy = int(round(u * 2.0))
            base = np.zeros((52, 52, 4), dtype=np.uint8)
            for y in range(52):
                for x in range(52):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < 52 and 0 <= nx < 52:
                        base[ny, nx] = tpl["stand"][y, x]
            base = apply_mantle_and_beard_sway(base, u * math.pi, amplitude=1.8, vertical_flutter=0.6, furnace_pulse=0.4)
            frame = draw_warhammer(
                base,
                hand_x=27 + dx,
                hand_y=24 + dy,
                angle_deg=-115.0 + u * 55.0,
                glow_intensity=0.6,
                scale=1.0,
                haft_len=15.0,
                shoulder=(23 + dx, 18 + dy),
            )
            # Breastplate hit sparks flying outward
            for sp in range(4):
                sx = 33 + sp * 2 + f
                sy = 21 - (sp % 2) * 3 + (f // 2)
                set_px(frame, sx, sy, GOLD_WHITE if sp == 0 else MAGMA_ORANGE)
            frames.append(frame)

        elif f <= 17:
            # F07..F17: Drops heavy to one knee (y+6px), leaning on his War-Hammer shaft as his furnace core flickers
            u = (f - 7) / 10.0
            base = tpl["kneel"].copy()
            if f >= 13:
                head_drop = 1 if f <= 15 else 2
                head_slice = base[12:24, 27:39].copy()
                base[12:24, 27:39] = 0
                base[12 + head_drop : 24 + head_drop, 27:39] = head_slice
            flicker = 0.65 if (f % 3 == 0) else 0.15
            base = apply_mantle_and_beard_sway(base, u * math.pi, amplitude=1.0, vertical_flutter=0.3, furnace_pulse=flicker)

            frame = draw_warhammer(
                base,
                hand_x=31,
                hand_y=30 + (1 if f >= 14 else 0),
                angle_deg=48.0 - u * 8.0,
                glow_intensity=max(0.2, 0.6 * (1.0 - u)),
                scale=0.95,
                haft_len=13.5,
                shoulder=(26, 24 + (1 if f >= 14 else 0)),
            )
            frames.append(frame)

        else:
            # F18..F29: Collapses horizontally (90 deg rotated body lying flat on the ground at y=37..46)
            # with his War-Hammer lying flat (0 deg horizontal) on the ground beside him (y=43..46)!
            k = f - 18
            frame = tpl["fall"].copy()
            if k == 0:
                frame = np.roll(frame, -1, axis=0)
                frame[-1, :] = 0

            # Draw the War-Hammer lying flat on its broad face horizontally at y=43..46, x=18..43
            # Haft (x=18..34, y=44..45)
            for hx_p in range(18, 35):
                set_px(frame, hx_p, 44, BRONZE_BRIGHT if hx_p % 3 == 0 else IRON_MID)
                set_px(frame, hx_p, 45, OBSIDIAN_DARK)
            set_px(frame, 17, 44, GOLD_MOLTEN)
            # Flat-lying Hammerhead block (x=34..43, y=42..46 — 10px wide along ground x 5px low profile on floor!)
            for hy_p in range(42, 47):
                for hx_p in range(34, 44):
                    if hy_p in (42, 46) or hx_p in (34, 43):
                        col = BRONZE_BRIGHT if hy_p == 42 else BRONZE_MID
                    elif hy_p == 44 and hx_p in (37, 38, 39):
                        col = JADE_LIGHT if k <= 4 else JADE_BRIGHT
                    elif hy_p in (43, 45) and hx_p in (36, 41):
                        col = GOLD_MOLTEN
                    else:
                        col = OBSIDIAN_DARK
                    set_px(frame, hx_p, hy_p, col)

            # Cooling forge ember drifting along the fallen hammer so every frame F18..F29 is unique
            ember_x = 24 + k
            set_px(frame, min(43, ember_x), 43 - (k % 2), GOLD_MOLTEN if k <= 5 else JADE_BRIGHT)
            frames.append(frame)

    return frames


def build_row6_dash(tpl):
    """
    Row 6 (`DASH` - Molten Juggernaut Stampede, 180..209):
    - F00..F04: Low explosive charge crouch.
    - F05..F23: Full-speed horizontal shoulder-and-hammer bull-rush (+18 deg forward torso tilt)
      with trailing molten-gold & jade speed-afterimages, flying coal embers, and billowing fur mantle.
    - F24..F29: Heavy skidding boot-stop with sparks.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 4:
            # F00..F04: Low explosive charge crouch
            u = f / 4.0
            crouch_d = [1, 2, 4, 4, 3][f]
            base = make_crouch_juggernaut(tpl, crouch_d)
            base = apply_mantle_and_beard_sway(
                base, phase * 2.0, amplitude=1.9, is_dash=(f >= 2), furnace_pulse=0.8 + u * 0.2
            )
            ang = -110.0 * (1.0 - u) + (-12.0) * u
            frame = draw_warhammer(
                base,
                hand_x=27 + int(round(u * 3)),
                hand_y=24 + crouch_d,
                angle_deg=ang,
                glow_intensity=0.9 + u * 0.3,
                scale=1.0,
                haft_len=13.5,
                shoulder=(24, 18 + crouch_d),
                two_handed=True,
                phase=phase,
            )
            frames.append(frame)

        elif f <= 23:
            # F05..F23: Full-speed horizontal shoulder-and-hammer bull-rush (+18 deg forward torso tilt)
            k = f - 5
            bob_dy = int(round(math.sin(k * 0.7) * 1.0))
            base = np.zeros((52, 52, 4), dtype=np.uint8)
            for y in range(52):
                ny = max(0, min(51, y + bob_dy))
                base[ny, :] = tpl["dash"][y, :]
            base = apply_mantle_and_beard_sway(
                base, k * 0.85, amplitude=2.3, vertical_flutter=1.0, is_dash=True, furnace_pulse=1.0
            )

            # Trailing Molten-Gold & Emerald-Jade speed-afterimages & flying coal embers behind cape
            for s_idx in range(5):
                sy = 14 + s_idx * 6 + ((k + s_idx) % 2)
                sx0 = 1 + ((k * 3 + s_idx * 4) % 10)
                col_s = GOLD_MOLTEN if s_idx % 2 == 0 else JADE_LIGHT
                draw_line_px(base, sx0, sy, sx0 + 5, sy, col_s)
                set_px(base, max(0, sx0 - 1), sy - 1, MAGMA_ORANGE)

            frame = draw_warhammer(
                base,
                hand_x=30 + (1 if k % 4 < 2 else 0),
                hand_y=23 + bob_dy,
                angle_deg=-4.0 + math.sin(k * 0.6) * 3.0,
                glow_intensity=1.25,
                scale=1.0,
                haft_len=13.0,
                shoulder=(27, 19 + bob_dy),
                two_handed=True,
                phase=phase,
            )
            frames.append(frame)

        else:
            # F24..F29: Heavy skidding boot-stop with sparks
            k = f - 24
            u = k / 5.0
            crouch_d = [3, 3, 2, 1, 1, 0][k]
            base = make_crouch_juggernaut(tpl, crouch_d) if crouch_d > 0 else tpl["stand"].copy()
            base = apply_mantle_and_beard_sway(
                base, phase, amplitude=1.7, vertical_flutter=0.6, furnace_pulse=0.85 - u * 0.2
            )
            ang = -8.0 * (1.0 - u) + (-124.0) * u
            frame = draw_warhammer(
                base,
                hand_x=int(round(30 * (1.0 - u) + 27 * u)),
                hand_y=24 + crouch_d,
                angle_deg=ang,
                glow_intensity=1.0 - u * 0.15,
                scale=1.0,
                haft_len=14.5,
                shoulder=(25, 18 + crouch_d),
                phase=phase,
            )
            # Boot-skid sparks at y=44..45
            if k <= 3:
                for bx in (22, 41):
                    set_px(frame, bx + 2 + k, 44, GOLD_WHITE)
                    set_px(frame, bx + 1 + k, 43, MAGMA_ORANGE)
            frames.append(frame)
    return frames


def build_row7_crouch(tpl):
    """
    Row 7 (`CROUCH` - Iron-Anvil Bulwark & Magma Counter, 210..239):
    - F00..F06: Drops into a deep fortified crouch (torso/head shifted down +7px, knees bent, boots planted at y=45),
      planting his War-Hammer and projecting a glowing Bronze & Jade Runic Anvil-Shield Bulwark in front of him (x=32..44, y=16..45).
    - F07..F18: Sweeps his War-Hammer low along the ground (F11..F16), unleashing a low-profile
      Molten Magma-Quake Wave along the floor while staying crouched under high projectiles.
    - F19..F29: Rises smoothly back to standing stance.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 6:
            # F00..F06: Drops into deep +7px fortified crouch & projects Runic Anvil-Shield Bulwark
            depths = [1, 2, 4, 5, 6, 7, 7]
            d = depths[f]
            u = f / 6.0
            base = make_crouch_juggernaut(tpl, d)
            base = apply_mantle_and_beard_sway(base, phase, amplitude=1.2, vertical_flutter=0.3, furnace_pulse=0.75 + u * 0.25)
            frame = draw_warhammer(
                base,
                hand_x=28,
                hand_y=23 + d,
                angle_deg=45.0 * u + (-40.0) * (1.0 - u),
                glow_intensity=0.9 + u * 0.2,
                scale=1.0,
                haft_len=13.5,
                shoulder=(24, 18 + d),
                phase=phase,
            )
            if f >= 1:
                frame = draw_anvil_shield_bulwark(frame, x_front=38, y_top=16 + (7 - d), y_bot=45, glow=0.5 + 0.5 * u, phase=phase)
            frames.append(frame)

        elif f <= 18:
            # F07..F18: Braces behind Anvil-Shield Bulwark (F07..F10), then sweeps War-Hammer low along the ground (F11..F16)
            # unleashing a low-profile Molten Magma-Quake Wave along the floor!
            d = 7
            k = f - 7
            base = make_crouch_juggernaut(tpl, d)
            base = apply_mantle_and_beard_sway(base, phase * 2.0, amplitude=1.5, vertical_flutter=0.5, furnace_pulse=1.0)

            if k <= 3:
                # F07..F10: Fortified behind full glowing Bronze & Jade Runic Anvil-Shield Bulwark while coiling hammer
                frame = draw_warhammer(
                    base,
                    hand_x=26 - k,
                    hand_y=24 + d,
                    angle_deg=-130.0 - k * 6.0,
                    glow_intensity=1.1,
                    scale=1.0,
                    haft_len=14.0,
                    shoulder=(23, 18 + d),
                    phase=phase,
                )
                frame = draw_anvil_shield_bulwark(frame, x_front=38, y_top=16, y_bot=45, glow=0.95, phase=phase + k)
            else:
                # F11..F18 (k=4..11): Low horizontal War-Hammer ground sweep & Molten Magma-Quake Wave!
                sk = k - 4  # 0..7
                ang_seq = [18.0, 26.0, 28.0, 26.0, 22.0, 16.0, 8.0, -10.0]
                frame = draw_anvil_shield_bulwark(base, x_front=35, y_top=18, y_bot=45, glow=max(0.3, 0.75 - sk * 0.08), phase=phase)
                frame = draw_warhammer(
                    frame,
                    hand_x=31 if sk <= 5 else 29,
                    hand_y=25 + d,
                    angle_deg=ang_seq[sk],
                    glow_intensity=1.3 if sk <= 4 else 1.0,
                    scale=1.0,
                    haft_len=13.5,
                    shoulder=(26, 19 + d),
                    two_handed=True,
                    cleave_arc=(-25.0, 32.0, 18.0, 0.95 - sk * 0.12) if sk <= 4 else None,
                    phase=phase,
                )
                # Low-profile Molten Magma-Quake Wave erupting along the floor (y=41..45, x=34..50)
                if sk <= 5:
                    wave_x = min(49, 36 + sk * 2)
                    for wx in range(32, wave_x + 1):
                        wy = 45 - ((wx + sk) % 3)
                        set_px(frame, wx, wy, GOLD_WHITE if wx >= wave_x - 1 else (JADE_LIGHT if wx % 3 == 0 else MAGMA_ORANGE))
                        set_px(frame, wx, 45, GOLD_MOLTEN)

            frames.append(frame)

        else:
            # F19..F29: Rises smoothly from +7px crouch back to standing stance
            depths = [7, 6, 6, 5, 4, 3, 2, 2, 1, 0, 0]
            k = f - 19
            d = depths[k]
            u = k / 10.0
            base = make_crouch_juggernaut(tpl, d) if d > 0 else tpl["stand"].copy()
            base = apply_mantle_and_beard_sway(base, phase, amplitude=1.4, vertical_flutter=0.5, furnace_pulse=0.75 - u * 0.2)
            ang = -15.0 * (1.0 - u) + (-124.0) * u
            frame = draw_warhammer(
                base,
                hand_x=int(round(30 * (1.0 - u) + 27 * u)),
                hand_y=24 + d,
                angle_deg=ang,
                glow_intensity=0.9,
                scale=1.0,
                haft_len=15.0,
                shoulder=(24, 18 + d),
                phase=phase,
            )
            frames.append(frame)
    return frames


def build_row8_jump(tpl):
    """
    Row 8 (`JUMP` - Meteor Forge-Leap & Aerial Hammer Dunk, 240..269):
    - CRITICAL: ZERO bouncy-ball or curled sphere frames! Torgar's full horned head, braided beard,
      armored torso, cape, legs, and War-Hammer remain 100% distinct on every single frame!
    - F00..F04: Deep squat windup with furnace back-jets igniting.
    - F05..F13: Powerful ascending Meteor Forge-Leap (+15 deg to -10 deg full-body heroic aerial posture
      with downward orange/gold furnace thruster flames under his boots and War-Hammer raised high overhead with two hands).
    - F14..F21: Apex Aerial World-Breaker Hammer Dunk — swings the blazing War-Hammer from -120 deg overhead
      down to +45 deg beneath him in a massive golden-jade crescent arc!
    - F22..F29: Heavy meteoric 3-point landing impact with volcanic sparks and rising recovery.
    """
    frames = []
    for f in range(30):
        phase = (f / 30.0) * 2.0 * math.pi
        if f <= 4:
            # F00..F04: Deep squat windup with furnace back-jets igniting
            crouch_seq = [1, 3, 5, 4, 2]
            d = crouch_seq[f]
            u = f / 4.0
            body = make_crouch_juggernaut(tpl, d)
            body = apply_mantle_and_beard_sway(body, phase * 2.0, amplitude=1.8, vertical_flutter=0.7, furnace_pulse=0.8 + u * 0.2)
            body = draw_ragnarok_crown_and_jets(body, head_xy=(33, 9 + d), shoulder_xy=(23, 17 + d), intensity=0.4 + u * 0.5, phase=phase)
            ang = -124.0 + u * 20.0
            frame = draw_warhammer(
                body,
                hand_x=27,
                hand_y=23 + d,
                angle_deg=ang,
                glow_intensity=0.95 + u * 0.25,
                scale=1.0,
                haft_len=15.0,
                shoulder=(24, 18 + d),
                two_handed=(f >= 2),
                phase=phase,
            )
            frames.append(frame)

        elif f <= 13:
            # F05..F13: Ascending Meteor Forge-Leap (+15 deg to -10 deg full-body heroic aerial posture)
            k = f - 5
            u = k / 8.0
            jump_dy = int(round(-1 - math.sin(u * math.pi * 0.85) * 3.0))
            tilt_deg = 15.0 * (1.0 - u) + (-10.0) * u
            body = make_aerial_juggernaut(
                tpl, jump_dy=jump_dy, body_tilt_deg=tilt_deg, leg_tuck=0.45 + 0.35 * u, thruster_intensity=1.0, phase=phase * 2.0
            )
            ang = -112.0 - u * 18.0
            frame = draw_warhammer(
                body,
                hand_x=27,
                hand_y=18 + jump_dy,
                angle_deg=ang,
                glow_intensity=1.25,
                scale=1.0,
                haft_len=13.5,
                shoulder=(25, 18 + jump_dy),
                two_handed=True,
                phase=phase * 2.0,
            )
            frames.append(frame)

        elif f <= 21:
            # F14..F21: Apex Aerial World-Breaker Hammer Dunk (-120 deg overhead down to +45 deg beneath him!)
            k = f - 14
            u = k / 7.0
            jump_dy = int(round(-3 + u * 3.0))
            tilt_deg = -8.0 * (1.0 - u) + 14.0 * u
            body = make_aerial_juggernaut(
                tpl, jump_dy=jump_dy, body_tilt_deg=tilt_deg, leg_tuck=0.75 - 0.35 * u, thruster_intensity=0.9 - 0.3 * u, phase=phase * 2.0
            )

            ang_seq = [-120.0, -55.0, -5.0, 28.0, 42.0, 45.0, 42.0, 35.0]
            hx_seq = [27, 30, 32, 32, 32, 32, 31, 31]
            hy_seq = [17, 18, 20, 23, 25, 25, 25, 24]
            cleave_arc = None
            if 1 <= k <= 5:
                arc_int = [0.9, 1.0, 1.0, 0.85, 0.6][k - 1]
                a0 = [-120.0, -85.0, -45.0, -10.0, 10.0][k - 1]
                cleave_arc = (a0, ang_seq[k] + 6.0, 19.0, arc_int)

            frame = draw_warhammer(
                body,
                hand_x=hx_seq[k],
                hand_y=hy_seq[k] + jump_dy,
                angle_deg=ang_seq[k],
                glow_intensity=1.4 if k <= 5 else 1.1,
                scale=1.04,
                haft_len=13.5,
                shoulder=(26, 18 + jump_dy),
                two_handed=True,
                cleave_arc=cleave_arc,
                phase=phase * 2.0,
            )
            frames.append(frame)

        else:
            # F22..F29: Heavy meteoric 3-point landing impact with volcanic sparks and rising recovery
            k = f - 22
            u = k / 7.0
            crouch_depths = [5, 6, 5, 4, 3, 2, 1, 0]
            d = crouch_depths[k]
            body = make_crouch_juggernaut(tpl, d) if d > 0 else tpl["stand"].copy()
            body = apply_mantle_and_beard_sway(
                body, phase, amplitude=1.8, vertical_flutter=0.7, furnace_pulse=1.0 - u * 0.35
            )
            ang = 32.0 * (1.0 - u) + (-124.0) * u
            frame = draw_warhammer(
                body,
                hand_x=int(round(33 * (1.0 - u) + 27 * u)),
                hand_y=24 + d,
                angle_deg=ang,
                glow_intensity=1.2 - u * 0.3,
                scale=1.0,
                haft_len=15.0,
                shoulder=(25, 18 + d),
                phase=phase,
            )
            # Volcanic impact sparks at landing (F22..F25)
            if k <= 3:
                for sx in range(14, 48, 4):
                    set_px(frame, sx + (k % 2), 45 - (sx % 3), GOLD_WHITE if sx % 8 == 0 else (JADE_LIGHT if sx % 4 == 0 else MAGMA_ORANGE))
            frames.append(frame)
    return frames


def main():
    tpl = make_clean_templates()

    rows = [
        ("ROW 0: IDLE (30 FRAMES)", build_row0_idle(tpl)),
        ("ROW 1: WALK - JUGGERNAUT STRIDE (30 FRAMES)", build_row1_walk(tpl)),
        ("ROW 2: AUTO_ATTACK - TECTONIC HAMMER QUAKE (30 FRAMES)", build_row2_auto_attack(tpl)),
        ("ROW 3: SKILL - ANVIL OF THE MOUNTAIN KING (30 FRAMES)", build_row3_skill(tpl)),
        ("ROW 4: ULTIMATE - RAGNAROK WORLD-FORGE ERUPTION (30 FRAMES)", build_row4_ultimate(tpl)),
        ("ROW 5: DEATH & HURT (30 FRAMES)", build_row5_death(tpl)),
        ("ROW 6: DASH - MOLTEN JUGGERNAUT STAMPEDE (30 FRAMES)", build_row6_dash(tpl)),
        ("ROW 7: CROUCH - IRON-ANVIL BULWARK & MAGMA COUNTER (30 FRAMES)", build_row7_crouch(tpl)),
        ("ROW 8: JUMP - METEOR FORGE-LEAP & HAMMER DUNK (30 FRAMES)", build_row8_jump(tpl)),
    ]

    num_rows = len(rows)
    cell_px = 208
    sheet = Image.new("RGBA", (30 * cell_px, num_rows * cell_px), (0, 0, 0, 0))

    for r_idx, (r_name, r_frames) in enumerate(rows):
        assert len(r_frames) == 30, f"{r_name} has {len(r_frames)} frames instead of 30"
        adj_diffs = sum(1 for i in range(29) if np.any(r_frames[i] != r_frames[i + 1]))
        print(f"{r_name:62s}: 30 frames generated, {adj_diffs}/29 adjacent transitions distinct")
        for c_idx, arr in enumerate(r_frames):
            cell_im = Image.fromarray(arr, mode="RGBA").resize((cell_px, cell_px), Image.Resampling.NEAREST)
            sheet.paste(cell_im, (c_idx * cell_px, r_idx * cell_px))

    out_path = "/home/antigravity/assets/sprites/titan_sheet.png"
    sheet.save(out_path)
    print("Saved:", out_path, sheet.size)

    # Render zoomed-in left (F00..F14) and right (F15..F29) contact sheets in artifact directory
    preview_cell = 96
    pad_top = 24
    dbg = Image.new("RGBA", (30 * preview_cell, num_rows * (preview_cell + pad_top)), (15, 20, 30, 255))
    draw = ImageDraw.Draw(dbg)
    for r_idx, (r_name, r_frames) in enumerate(rows):
        y0 = r_idx * (preview_cell + pad_top)
        draw.rectangle([0, y0, 30 * preview_cell, y0 + pad_top - 2], fill=(26, 34, 50, 255))
        draw.text((8, y0 + 5), r_name, fill=(110, 231, 183, 255))
        for c_idx, arr in enumerate(r_frames):
            x0 = c_idx * preview_cell
            draw.text((x0 + 4, y0 + 13), f"F{c_idx:02d}", fill=(251, 191, 36, 255))
            p_im = Image.fromarray(arr, mode="RGBA").resize((preview_cell, preview_cell), Image.Resampling.NEAREST)
            dbg.paste(p_im, (x0, y0 + pad_top), p_im)
            draw.rectangle(
                [x0, y0 + pad_top, x0 + preview_cell - 1, y0 + pad_top + preview_cell - 1],
                outline=(35, 45, 65, 255),
            )

    art_dir = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/4f1fb80f-a88f-4496-9746-b4b9fe84f6d4"
    dbg.crop((0, 0, 15 * preview_cell, dbg.height)).save(f"{art_dir}/debug_titan_30fps_left_F00_F14.png")
    dbg.crop((15 * preview_cell, 0, 30 * preview_cell, dbg.height)).save(f"{art_dir}/debug_titan_30fps_right_F15_F29.png")
    print("Saved debug contact sheets in:", art_dir)


if __name__ == "__main__":
    main()
