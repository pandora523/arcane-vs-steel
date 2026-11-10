#!/usr/bin/env python3
"""
Deterministic Studio Physical-Foley & Anime Combat VFX Synthesizer
Generates all 69 44.1kHz 16-bit stereo WAV assets in `assets/sfx/*.wav`.

Design Philosophy:
- ZERO musical chords, arpeggios, xylophone notes, harp plucks, or synth melodies.
- Multi-layered fighting-game / anime VFX physical foley architecture:
  1. Sharp 0-20ms physical transient snap (leather slap, steel spark, bowstring snap,
     capacitor arc, crystal fracture, or pressurized gas ignition).
  2. Time-varying STFT swept aerodynamic / elemental turbulence body (air-cutting blade
     swishes, roaring combustion jets, howling blizzards, plasma shear, vacuum suction).
  3. Authentic inharmonic physical modal resonators convolved with noisy friction/impact
     excitations (tempered steel, heavy anvil iron, brass escapement gears, crystal/ice
     shards, wooden bow shafts, clanking chains) + saturated sub-bass shockwave drops.
"""

from __future__ import annotations

import math
import os
import wave
import zlib
from pathlib import Path
from typing import Callable, Dict, List, Sequence, Tuple

import numpy as np

SR = 44100
TWO_PI = 2.0 * math.pi


# ==============================================================================
# 1. DETERMINISTIC RNG & BASIC ENVELOPES
# ==============================================================================

def make_rng(key: str) -> np.random.Generator:
    seed = zlib.crc32(f"arcane_vs_steel_sfx_v3::{key}".encode("utf-8")) & 0xFFFFFFFF
    return np.random.default_rng(seed)


def time_axis(dur: float) -> np.ndarray:
    n = max(64, int(round(dur * SR)))
    return np.arange(n, dtype=np.float64) / SR


def ad_env(
    n: int,
    attack_s: float = 0.004,
    decay_s: float = 0.25,
    hold_s: float = 0.0,
    power: float = 1.0,
) -> np.ndarray:
    t = np.arange(n, dtype=np.float64) / SR
    env = np.empty(n, dtype=np.float64)
    a = max(attack_s, 1.0 / SR)
    up = t < a
    env[up] = (t[up] / a) ** 0.75
    hold_mask = (~up) & (t < a + hold_s)
    env[hold_mask] = 1.0
    down = t >= (a + hold_s)
    d = max(decay_s, 0.003)
    env[down] = np.exp(-((t[down] - (a + hold_s)) / d) ** power)
    return env


def swell_env(n: int, peak_pos: float = 0.35, sharpness: float = 2.4) -> np.ndarray:
    u = np.linspace(0.0, 1.0, n, dtype=np.float64)
    p = float(np.clip(peak_pos, 0.03, 0.95))
    up_u = np.clip(u / p, 0.0, 1.0)
    dn_u = np.clip((u - p) / (1.0 - p), 0.0, 1.0)
    return np.where(
        u <= p,
        np.sin(0.5 * math.pi * up_u) ** 1.3,
        np.exp(-sharpness * (dn_u ** 1.35)),
    )


def place(dst: np.ndarray, src: np.ndarray, offset_s: float, gain: float = 1.0) -> None:
    """Mix mono or stereo `src` into `dst` at `offset_s` seconds."""
    idx = int(round(offset_s * SR))
    if idx >= dst.shape[0] or src.shape[0] == 0:
        return
    if idx < 0:
        src = src[-idx:]
        idx = 0
    end = min(dst.shape[0], idx + src.shape[0])
    length = end - idx
    if length <= 0:
        return
    if dst.ndim == 2 and src.ndim == 1:
        dst[idx:end, 0] += src[:length] * gain
        dst[idx:end, 1] += src[:length] * gain
    elif dst.ndim == 2 and src.ndim == 2:
        dst[idx:end] += src[:length] * gain
    else:
        dst[idx:end] += src[:length] * gain


def pan_mono(sig: np.ndarray, pan: float | np.ndarray, haas_ms: float = 0.0) -> np.ndarray:
    """Equal-power stereo panner (-1.0 left .. +1.0 right) with optional Haas micro-delay."""
    p = np.clip(pan, -1.0, 1.0)
    angle = (p + 1.0) * (0.25 * math.pi)
    l = sig * np.cos(angle)
    r = sig * np.sin(angle)
    if abs(haas_ms) > 0.02:
        d = int(round(abs(haas_ms) * 0.001 * SR))
        if 0 < d < len(sig):
            if haas_ms > 0:
                r = np.concatenate([np.zeros(d), r[:-d]])
            else:
                l = np.concatenate([np.zeros(d), l[:-d]])
    return np.column_stack([l, r])


# ==============================================================================
# 2. COLORED TURBULENCE, VELVET CRACKLE & FFT FILTERING
# ==============================================================================

def white_noise(n: int, rng: np.random.Generator) -> np.ndarray:
    return rng.standard_normal(n)


def colored_noise(n: int, rng: np.random.Generator, alpha: float = 1.0) -> np.ndarray:
    """Spectral power-law noise: alpha=1.0 -> pink (1/f), alpha=1.8 -> brown rumble."""
    w = rng.standard_normal(n)
    spec = np.fft.rfft(w)
    freqs = np.fft.rfftfreq(n, d=1.0 / SR)
    scale = 1.0 / np.maximum(freqs, 28.0) ** (0.5 * alpha)
    scale[0] = 0.0
    out = np.fft.irfft(spec * scale, n=n)
    std = np.std(out)
    return out / (std + 1e-9)


def velvet_crackle(
    n: int,
    rng: np.random.Generator,
    density_hz: float | np.ndarray = 180.0,
    amp_jitter: float = 1.6,
) -> np.ndarray:
    """Sparse stochastic bipolar crackle impulses (embers, electric micro-arcs, ice snaps)."""
    prob = np.clip(density_hz / SR, 0.0, 0.65)
    triggers = rng.random(n) < prob
    signs = rng.choice([-1.0, 1.0], size=n)
    amps = rng.random(n) ** amp_jitter
    imp = np.where(triggers, signs * amps, 0.0)
    # Give impulses 0.15ms-0.6ms physical body via short asymmetric kernel
    kern = np.array([1.0, 0.62, -0.28, 0.14, -0.06], dtype=np.float64)
    return np.convolve(imp, kern, mode="same")


def fft_band_filter(
    sig: np.ndarray,
    low_hz: float = 30.0,
    high_hz: float = 16000.0,
    slope: float = 2.0,
) -> np.ndarray:
    n = sig.shape[0]
    spec = np.fft.rfft(sig, axis=0)
    freqs = np.fft.rfftfreq(n, d=1.0 / SR)
    f_safe = np.maximum(freqs, 1e-3)
    hp = 1.0 / np.sqrt(1.0 + (low_hz / f_safe) ** (2.0 * slope))
    lp = 1.0 / np.sqrt(1.0 + (f_safe / high_hz) ** (2.0 * slope))
    mask = hp * lp
    mask[0] = 0.0
    if spec.ndim == 2:
        mask = mask[:, None]
    return np.fft.irfft(spec * mask, n=n, axis=0)


def fft_convolve(a: np.ndarray, b: np.ndarray, out_len: int | None = None) -> np.ndarray:
    n_total = len(a) + len(b) - 1
    n_fft = 1 << (n_total - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(a, n=n_fft) * np.fft.rfft(b, n=n_fft), n=n_fft)
    return y[: (out_len if out_len is not None else len(a))]


def swept_filter(
    sig: np.ndarray,
    f_curve: np.ndarray | Tuple[float, float],
    bw_oct: float | Tuple[float, float] = 0.9,
    mode: str = "bandpass",
    resonance: float = 1.8,
    comb_depth: float = 0.0,
    comb_rate: float = 3.0,
) -> np.ndarray:
    """
    Time-varying COLA STFT dynamic filter (hop=128 = 2.9ms frame resolution).
    Sculpts sharp aerodynamic blade whooshes, combustion roars, plasma sweeps, and suctions.
    """
    n = len(sig)
    win_len = 512
    hop = 128
    n_fft = 1024
    pad = win_len
    padded = np.pad(sig, (pad, pad), mode="constant")
    total_len = len(padded)
    n_frames = 1 + max(0, (total_len - win_len) // hop)

    # Build strided frames (n_frames, win_len)
    idx = np.arange(win_len)[None, :] + (np.arange(n_frames) * hop)[:, None]
    idx = np.clip(idx, 0, total_len - 1)
    win = np.hanning(win_len)
    frames = padded[idx] * win[None, :]
    spec = np.fft.rfft(frames, n=n_fft, axis=1)
    freqs = np.maximum(np.fft.rfftfreq(n_fft, d=1.0 / SR)[None, :], 12.0)

    # Frame center normalized positions [0, 1] mapped to original signal timeline
    frame_centers = (np.arange(n_frames) * hop + win_len * 0.5 - pad) / max(n - 1, 1)
    u = np.clip(frame_centers, 0.0, 1.0)[:, None]

    if isinstance(f_curve, tuple):
        f0, f1 = f_curve
        fc = f0 * ((f1 / max(f0, 1.0)) ** u)
    else:
        sample_idx = np.clip((u[:, 0] * (len(f_curve) - 1)).astype(int), 0, len(f_curve) - 1)
        fc = np.maximum(f_curve[sample_idx], 20.0)[:, None]

    if isinstance(bw_oct, tuple):
        bw = (bw_oct[0] + (bw_oct[1] - bw_oct[0]) * u)
    else:
        bw = float(bw_oct)

    log_dist = np.log2(freqs / fc) / np.maximum(bw * 0.5, 0.08)

    if mode == "bandpass":
        gain = np.exp(-0.5 * (log_dist ** 2)) * resonance + 0.12 / (1.0 + log_dist ** 4)
    elif mode == "lowpass":
        lp = 1.0 / np.sqrt(1.0 + (freqs / fc) ** 5.0)
        peak = (resonance - 1.0) * np.exp(-0.5 * (log_dist * 1.8) ** 2)
        gain = lp + np.maximum(peak, 0.0)
    elif mode == "highpass":
        hp = 1.0 / np.sqrt(1.0 + (fc / freqs) ** 5.0)
        peak = (resonance - 1.0) * np.exp(-0.5 * (log_dist * 1.8) ** 2)
        gain = hp + np.maximum(peak, 0.0)
    else:
        gain = np.ones_like(log_dist)

    if comb_depth > 0.0:
        # Moving phaser/flanger notches for plasma beams, supersonic wind & sanctuary shimmer
        phase_shift = comb_rate * TWO_PI * (np.log2(freqs / 180.0) - u * 2.2)
        gain *= 1.0 - comb_depth * (0.5 + 0.5 * np.cos(phase_shift))

    gain[:, 0] = 0.0
    y_frames = np.fft.irfft(spec * gain, n=n_fft, axis=1)[:, :win_len] * win[None, :]

    out = np.zeros(total_len + win_len, dtype=np.float64)
    norm = np.zeros(total_len + win_len, dtype=np.float64)
    win_sq = win * win
    for m in range(n_frames):
        s = m * hop
        out[s : s + win_len] += y_frames[m]
        norm[s : s + win_len] += win_sq

    out /= np.maximum(norm, 1e-6)
    return out[pad : pad + n]


# ==============================================================================
# 3. PHYSICAL FOLEY & MATERIAL SYNTHESIS PRIMITIVES (ZERO MUSICAL CHORDS!)
# ==============================================================================

# Strictly INHARMONIC physical material mode ratios (bars, anisotropic plates, shells, crystals)
MATERIAL_MODES: Dict[str, Tuple[List[float], float]] = {
    # (irrational mode ratios, high-mode damping multiplier)
    "steel_blade": ([1.0, 1.473, 2.129, 2.758, 3.584, 4.417, 5.429, 6.812, 8.391], 0.48),
    "katana_edge": ([1.0, 1.531, 2.287, 3.042, 3.918, 4.883, 6.115, 7.641], 0.42),
    "heavy_anvil": ([1.0, 1.384, 1.927, 2.671, 3.439, 4.518, 5.887, 7.319], 0.62),
    "bronze_bell": ([1.0, 1.414, 1.879, 2.381, 2.917, 3.663, 4.541, 5.712, 7.084], 0.38),
    "brass_gear":  ([1.0, 1.589, 2.341, 3.197, 4.263, 5.612], 0.75),
    "crystal_ice": ([1.0, 1.618, 2.414, 3.303, 4.472, 5.831, 7.416], 0.52),
    "wood_limb":   ([1.0, 1.712, 2.638, 3.891], 1.15),
    "iron_chain":  ([1.0, 1.447, 2.083, 2.891, 3.774, 4.929, 6.341], 0.58),
}


def modal_ir(
    dur: float,
    f_base: float,
    material: str,
    decay_s: float,
    rng: np.random.Generator,
    pitch_bend_pct: float = 0.048,
) -> np.ndarray:
    """
    Physical inharmonic modal impulse response with nonlinear tension pitch-drop
    and micro-detuned doublet modes (eliminates synthetic stationary tone quality).
    """
    t = time_axis(dur)
    ratios, hi_damp = MATERIAL_MODES[material]
    ir = np.zeros_like(t)
    # Nonlinear impact tension drop + subtle plate mode-coupling shimmer
    bend = 1.0 + pitch_bend_pct * np.exp(-t / 0.024) + 0.008 * np.sin(TWO_PI * 37.0 * t) * np.exp(-t / 0.09)

    for i, r in enumerate(ratios):
        # Split each mode into a micro-beating anisotropic doublet
        for det in (1.0 - 0.0055 * (i + 1), 1.0 + 0.0068 * (i + 1)):
            f_mode = f_base * r * det * rng.uniform(0.982, 1.018)
            if f_mode >= SR * 0.43:
                continue
            d_i = max(decay_s / (1.0 + hi_damp * i), 0.004)
            amp = (1.0 / (1.0 + 0.34 * i)) * rng.uniform(0.7, 1.15)
            phase = np.cumsum(TWO_PI * (f_mode * bend) / SR) + rng.uniform(0, TWO_PI)
            ir += amp * np.exp(-t / d_i) * np.sin(phase)

    peak = np.max(np.abs(ir)) + 1e-9
    return ir / peak


def physical_strike(
    dur: float,
    f_base: float,
    material: str,
    decay_s: float,
    rng: np.random.Generator,
    hardness: float = 0.75,
    scrape_ms: float = 6.0,
) -> np.ndarray:
    """Excites an inharmonic material body with a gritty physical contact impulse."""
    n = max(64, int(round(dur * SR)))
    exc_len = max(24, int(round(scrape_ms * 0.001 * SR)))
    exc_t = np.linspace(0.0, 1.0, exc_len)
    exc = (
        rng.standard_normal(exc_len) * np.exp(-exc_t * 3.8)
        + velvet_crackle(exc_len, rng, density_hz=2800.0) * 0.9
    )
    cutoff = 1800.0 + hardness * 11000.0
    exc = fft_band_filter(exc, low_hz=180.0, high_hz=min(cutoff, 16500.0), slope=1.5)
    ir = modal_ir(dur, f_base, material, decay_s, rng)
    body = fft_convolve(exc, ir, out_len=n)
    # Blend raw crisp contact transient at the front
    out = body * 0.78
    place(out, exc * (0.45 / (np.max(np.abs(exc)) + 1e-9)), 0.0)
    return out / (np.max(np.abs(out)) + 1e-9)


def blade_friction_shing(
    dur: float,
    f_base: float,
    rng: np.random.Generator,
    sweep_ratio: float = 1.28,
    material: str = "steel_blade",
) -> np.ndarray:
    """
    Continuous friction-excited sword edge slice ('SHING!'):
    swept gritty steel contact noise convolved with short high-carbon blade modes.
    """
    n = max(64, int(round(dur * SR)))
    noise = 0.65 * white_noise(n, rng) + 0.55 * velvet_crackle(n, rng, density_hz=2200.0)
    # Dynamic friction sweep along the blade fuller
    exc = swept_filter(noise, (f_base * 0.85, f_base * sweep_ratio), bw_oct=0.55, mode="bandpass", resonance=2.8)
    exc *= ad_env(n, attack_s=0.005, decay_s=dur * 0.52, power=1.15)
    ir = modal_ir(min(dur * 0.65, 0.16), f_base, material, decay_s=0.045, rng=rng, pitch_bend_pct=0.04)
    out = fft_convolve(exc, ir, out_len=n)
    return out / (np.max(np.abs(out)) + 1e-9)


def air_whoosh(
    dur: float,
    f_start: float,
    f_end: float,
    rng: np.random.Generator,
    peak_pos: float = 0.22,
    bw_oct: float = 0.95,
    sharpness: float = 2.6,
    pan_start: float = -0.3,
    pan_end: float = 0.3,
) -> np.ndarray:
    """Stereo Doppler aerodynamic air-cut or wind rush."""
    n = max(64, int(round(dur * SR)))
    turb_l = 0.72 * colored_noise(n, rng, alpha=0.85) + 0.28 * white_noise(n, rng)
    turb_r = 0.72 * colored_noise(n, rng, alpha=0.85) + 0.28 * white_noise(n, rng)
    env = swell_env(n, peak_pos=peak_pos, sharpness=sharpness)
    wl = swept_filter(turb_l, (f_start, f_end), bw_oct=bw_oct, mode="bandpass", resonance=2.2) * env
    wr = swept_filter(turb_r, (f_start * 1.04, f_end * 0.97), bw_oct=bw_oct, mode="bandpass", resonance=2.2) * env
    pan_curve = np.linspace(pan_start, pan_end, n)
    ang = (pan_curve + 1.0) * (0.25 * math.pi)
    stereo = np.column_stack([wl * np.cos(ang) * 1.35, wr * np.sin(ang) * 1.35])
    return stereo / (np.max(np.abs(stereo)) + 1e-9)


def sub_punch_drop(
    dur: float,
    f_start: float,
    f_end: float,
    rng: np.random.Generator,
    drive: float = 2.4,
    decay_s: float | None = None,
) -> np.ndarray:
    """
    Visceral fighting-game sub-bass impact drop with tanh harmonic saturation
    so chest punch translates powerfully across both headphones and small speakers.
    """
    t = time_axis(dur)
    n = len(t)
    d = decay_s if decay_s is not None else dur * 0.52
    u = np.linspace(0.0, 1.0, n)
    freq = f_end + (f_start - f_end) * np.exp(-u * 5.8)
    # Add subtle turbulent phase grit so it feels physical rather than pure test-oscillator
    jitter = colored_noise(n, rng, alpha=1.6) * 0.08
    phase = np.cumsum(TWO_PI * freq / SR) + jitter
    raw = np.sin(phase) + 0.38 * np.sin(2.0 * phase + 0.4)
    env = ad_env(n, attack_s=0.002, decay_s=d, power=1.08)
    punched = np.tanh(raw * drive) * env
    # Add crisp 0-12ms physical knock transient
    knock = fft_band_filter(rng.standard_normal(n), 90.0, 2600.0) * ad_env(n, 0.001, 0.011, power=1.3)
    out = punched * 0.85 + knock * 0.45
    return out / (np.max(np.abs(out)) + 1e-9)


def electric_arc_burst(
    dur: float,
    rng: np.random.Generator,
    density: float = 650.0,
    f_sweep: Tuple[float, float] = (4800.0, 1400.0),
) -> np.ndarray:
    """High-voltage chaotic arc snaps + FM plasma buzz."""
    t = time_axis(dur)
    n = len(t)
    crackle = velvet_crackle(n, rng, density_hz=density, amp_jitter=1.2)
    crackle_bp = swept_filter(crackle, f_sweep, bw_oct=1.25, mode="bandpass", resonance=2.5, comb_depth=0.45, comb_rate=4.5)
    # Chaotic non-stationary plasma carrier modulated by fast noise
    mod = colored_noise(n, rng, alpha=0.5) * 1400.0
    fc = np.linspace(f_sweep[0] * 0.45, f_sweep[1] * 0.55, n) + mod
    buzz = np.tanh(np.sin(np.cumsum(TWO_PI * np.abs(fc) / SR)) * 2.6)
    buzz *= (rng.random(n) > 0.18).astype(np.float64)
    buzz = fft_band_filter(buzz, 450.0, 14500.0)
    env = ad_env(n, attack_s=0.002, decay_s=dur * 0.58, power=1.1)
    out = (0.68 * crackle_bp + 0.42 * buzz) * env
    return out / (np.max(np.abs(out)) + 1e-9)


def crystal_shard_cascade(
    dur: float,
    rng: np.random.Generator,
    count: int = 28,
    f_min: float = 2900.0,
    f_max: float = 13800.0,
    spread_power: float = 1.6,
) -> np.ndarray:
    """
    Cascade of randomized high-frequency inharmonic crystal/glass/ice micro-fractures
    panned across the stereo field (zero musical notes).
    """
    n = max(64, int(round(dur * SR)))
    out = np.zeros((n, 2), dtype=np.float64)
    for i in range(count):
        offset = (rng.random() ** spread_power) * (dur * 0.78)
        shard_dur = rng.uniform(0.018, 0.068)
        f0 = f_min * ((f_max / f_min) ** rng.random())
        shard = physical_strike(
            shard_dur,
            f_base=f0,
            material="crystal_ice",
            decay_s=shard_dur * 0.36,
            rng=rng,
            hardness=0.95,
            scrape_ms=2.2,
        )
        gain = rng.uniform(0.28, 0.95) * math.exp(-1.5 * (offset / max(dur, 0.1)))
        pan = rng.uniform(-0.78, 0.78)
        place(out, pan_mono(shard, pan, haas_ms=rng.uniform(-1.1, 1.1)), offset, gain=gain)
    peak = np.max(np.abs(out)) + 1e-9
    return out / peak


def combustion_roar(
    dur: float,
    rng: np.random.Generator,
    f_start: float = 980.0,
    f_end: float = 260.0,
    ember_density: float = 340.0,
) -> np.ndarray:
    """Turbulent pressurized fire jet + roaring low-mid flame + ember crackle pops."""
    n = max(64, int(round(dur * SR)))
    stereo = np.zeros((n, 2), dtype=np.float64)
    for ch in range(2):
        brown = colored_noise(n, rng, alpha=1.55)
        pink = colored_noise(n, rng, alpha=0.95)
        # Amplitude flutter from turbulent flame vortices (18-45Hz)
        flutter = 0.72 + 0.28 * fft_band_filter(rng.standard_normal(n), 14.0, 48.0)
        roar = swept_filter(brown * flutter, (f_start * 0.55, f_end * 0.75), bw_oct=1.45, mode="lowpass", resonance=1.9)
        jet = swept_filter(pink, (f_start * 1.45, f_end * 1.35), bw_oct=1.1, mode="bandpass", resonance=2.1, comb_depth=0.25)
        embers = fft_band_filter(velvet_crackle(n, rng, density_hz=ember_density), 1600.0, 14500.0)
        stereo[:, ch] = 0.58 * roar + 0.44 * jet + 0.34 * embers
    env = swell_env(n, peak_pos=0.14, sharpness=2.3)
    stereo *= env[:, None]
    return stereo / (np.max(np.abs(stereo)) + 1e-9)


def arena_early_reflections(stereo: np.ndarray, mix: float = 0.18) -> np.ndarray:
    """Short, tight stone-arena early reflections (11ms, 19ms, 31ms, 47ms) without muddy wash."""
    if mix <= 0.0:
        return stereo
    n = stereo.shape[0]
    wet = np.zeros_like(stereo)
    taps = [
        (0.011, 0.48, True),
        (0.019, -0.36, False),
        (0.031, 0.24, True),
        (0.047, -0.15, False),
    ]
    for delay_s, g, swap in taps:
        d = int(round(delay_s * SR))
        if d < n:
            src = stereo[:-d, ::-1] if swap else stereo[:-d]
            wet[d:] += src * g
    wet = fft_band_filter(wet, low_hz=140.0, high_hz=9500.0, slope=1.5)
    return stereo * (1.0 - mix * 0.35) + wet * mix


def master_sfx(
    sig: np.ndarray,
    peak_target: float = 0.88,
    drive: float = 1.25,
    fade_in_ms: float = 1.4,
    fade_out_ms: float = 22.0,
    room_mix: float = 0.12,
) -> np.ndarray:
    """Studio mastering chain: stereo check, room reflections, DC removal, bandwidth polish, soft limit."""
    if sig.ndim == 1:
        sig = np.column_stack([sig, sig])
    out = sig.astype(np.float64, copy=True)

    # Remove DC before saturation
    out -= np.mean(out, axis=0, keepdims=True)
    out = fft_band_filter(out, low_hz=28.0, high_hz=16600.0, slope=2.0)

    if room_mix > 0.0:
        out = arena_early_reflections(out, mix=room_mix)

    # Pre-normalize into soft-clipper so drive behaves predictably
    raw_peak = np.max(np.abs(out)) + 1e-9
    out = out / raw_peak
    if drive > 1.0:
        out = np.tanh(out * drive) / math.tanh(drive)

    # Ensure crisp stereo decorrelation if channels ended up nearly identical
    corr_diff = np.mean(np.abs(out[:, 0] - out[:, 1]))
    if corr_diff < 0.015 and len(out) > 64:
        d = 19  # ~0.43ms subtle Haas offset + high-shelf tilt
        shifted = np.concatenate([np.zeros(d), out[:-d, 1]])
        out[:, 1] = 0.72 * out[:, 1] + 0.28 * shifted

    # Clean click-free fades
    n = len(out)
    fi = min(max(4, int(round(fade_in_ms * 0.001 * SR))), n // 4)
    fo = min(max(16, int(round(fade_out_ms * 0.001 * SR))), n // 2)
    out[:fi] *= np.linspace(0.0, 1.0, fi)[:, None]
    out[-fo:] *= (np.cos(np.linspace(0.0, 0.5 * math.pi, fo)) ** 1.4)[:, None]

    # Final DC zeroing + exact peak target
    out -= np.mean(out, axis=0, keepdims=True)
    out[-fo:] *= np.linspace(1.0, 0.0, fo)[:, None]
    final_peak = np.max(np.abs(out)) + 1e-9
    out = out * (peak_target / final_peak)
    return np.clip(out, -0.98, 0.98)


# ==============================================================================
# 4. ALL 69 CHAMPION & ELEMENTAL FOLEY GENERATORS
# ==============================================================================

# ---------- FAMILY 1: TEMPERED STEEL & PALADIN ----------

def gen_slash(rng: np.random.Generator) -> np.ndarray:
    dur = 0.28
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # 1. Grip/leather whip snap (0-14ms)
    snap = fft_band_filter(white_noise(int(0.018 * SR), rng), 900.0, 9500.0) * ad_env(int(0.018 * SR), 0.001, 0.009)
    place(out, pan_mono(snap, -0.18), 0.0, 0.55)
    # 2. High-velocity aerodynamic air-cut (2900Hz -> 500Hz)
    place(out, air_whoosh(0.24, 2900.0, 500.0, rng, peak_pos=0.18, bw_oct=0.78, sharpness=2.9, pan_start=-0.35, pan_end=0.35), 0.005, 0.95)
    # 3. Friction-excited inharmonic steel edge slice
    shing = blade_friction_shing(0.21, 3150.0, rng, sweep_ratio=1.35, material="steel_blade")
    place(out, pan_mono(shing, 0.14, haas_ms=0.7), 0.008, 0.58)
    # 4. Tight low-end punch
    place(out, sub_punch_drop(0.13, 118.0, 48.0, rng, drive=1.9), 0.004, 0.48)
    return master_sfx(out, peak_target=0.86, drive=1.35, room_mix=0.10)


def gen_heavy_cleave(rng: np.random.Generator) -> np.ndarray:
    dur = 0.42
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Deep 2H greatsword air-rip
    place(out, air_whoosh(0.36, 2100.0, 250.0, rng, peak_pos=0.22, bw_oct=1.05, sharpness=2.4, pan_start=-0.42, pan_end=0.42), 0.0, 0.92)
    # Meaty armor-crushing impact transient at 0.045s
    crunch = physical_strike(0.34, 920.0, "heavy_anvil", decay_s=0.13, rng=rng, hardness=0.85, scrape_ms=10.0)
    edge = blade_friction_shing(0.28, 2350.0, rng, sweep_ratio=0.72, material="steel_blade")
    place(out, pan_mono(crunch, 0.08, haas_ms=0.9), 0.032, 0.78)
    place(out, pan_mono(edge, -0.15, haas_ms=-0.8), 0.018, 0.52)
    place(out, sub_punch_drop(0.24, 142.0, 38.0, rng, drive=2.6), 0.030, 0.85)
    return master_sfx(out, peak_target=0.89, drive=1.45, room_mix=0.16)


def gen_blade_wave(rng: np.random.Generator) -> np.ndarray:
    dur = 0.42
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Supersonic razor wind-crescent launch ('SHING-FWOOSH!')
    shing = blade_friction_shing(0.26, 3600.0, rng, sweep_ratio=1.48, material="katana_edge")
    place(out, pan_mono(shing, -0.2, haas_ms=0.8), 0.0, 0.72)
    # Phaser-sheared compressed razor air crescent
    for ch, p in enumerate([-0.38, 0.38]):
        turb = 0.65 * colored_noise(n, rng, alpha=0.75) + 0.35 * white_noise(n, rng)
        wave_air = swept_filter(turb, (3800.0, 580.0), bw_oct=0.68, mode="bandpass", resonance=2.7, comb_depth=0.42, comb_rate=3.8)
        wave_air *= swell_env(n, peak_pos=0.16, sharpness=2.5)
        out[:, ch] += wave_air * (0.95 if p > 0 else 0.88)
    place(out, sub_punch_drop(0.18, 130.0, 44.0, rng, drive=2.1), 0.008, 0.52)
    return master_sfx(out, peak_target=0.87, drive=1.35, room_mix=0.15)


def gen_clang(rng: np.random.Generator) -> np.ndarray:
    dur = 0.35
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Steel-on-steel parry spark ('KSHING!')
    s1 = physical_strike(0.32, 1680.0, "steel_blade", decay_s=0.14, rng=rng, hardness=0.95, scrape_ms=5.5)
    s2 = physical_strike(0.28, 1140.0, "heavy_anvil", decay_s=0.11, rng=rng, hardness=0.90, scrape_ms=7.0)
    sparks = fft_band_filter(velvet_crackle(n, rng, density_hz=520.0), 3200.0, 15000.0) * ad_env(n, 0.001, 0.085)
    place(out, pan_mono(s1, -0.22, haas_ms=0.8), 0.0, 0.85)
    place(out, pan_mono(s2, 0.24, haas_ms=-0.9), 0.003, 0.72)
    place(out, pan_mono(sparks, 0.1), 0.002, 0.45)
    place(out, air_whoosh(0.18, 2400.0, 620.0, rng, peak_pos=0.12, sharpness=3.2), 0.004, 0.42)
    place(out, sub_punch_drop(0.15, 135.0, 46.0, rng, drive=2.2), 0.0, 0.55)
    return master_sfx(out, peak_target=0.88, drive=1.38, room_mix=0.16)


def gen_parry_clang(rng: np.random.Generator) -> np.ndarray:
    dur = 0.38
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Heavy counter-parry: crisp double steel clash + upward deflecting blade scrape + shockwave
    s1 = physical_strike(0.34, 1920.0, "katana_edge", decay_s=0.15, rng=rng, hardness=0.98, scrape_ms=4.5)
    s2 = blade_friction_shing(0.26, 2850.0, rng, sweep_ratio=1.62, material="steel_blade")
    place(out, pan_mono(s1, -0.25, haas_ms=0.9), 0.0, 0.88)
    place(out, pan_mono(s2, 0.28, haas_ms=-0.7), 0.016, 0.68)
    place(out, air_whoosh(0.24, 1800.0, 3600.0, rng, peak_pos=0.20, bw_oct=0.75, sharpness=2.8), 0.012, 0.52)
    place(out, sub_punch_drop(0.18, 150.0, 42.0, rng, drive=2.4), 0.0, 0.65)
    return master_sfx(out, peak_target=0.89, drive=1.4, room_mix=0.16)


def gen_reflect(rng: np.random.Generator) -> np.ndarray:
    dur = 0.36
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Crisp shield/blade deflection impact + upward phase-deflect ricochet zip
    ward = physical_strike(0.28, 2150.0, "steel_blade", decay_s=0.10, rng=rng, hardness=0.92, scrape_ms=4.0)
    place(out, pan_mono(ward, -0.15, haas_ms=0.7), 0.0, 0.78)
    # Upward ricochet plasma/air zip (650Hz -> 5400Hz)
    t = time_axis(0.24)
    f_ric = 650.0 * ((5400.0 / 650.0) ** (np.linspace(0.0, 1.0, len(t)) ** 0.65))
    ric_noise = swept_filter(white_noise(len(t), rng), f_ric, bw_oct=0.45, mode="bandpass", resonance=3.2, comb_depth=0.5)
    ric_fm = np.sin(np.cumsum(TWO_PI * f_ric / SR) + colored_noise(len(t), rng, 0.5) * 1.4) * ad_env(len(t), 0.003, 0.095)
    place(out, pan_mono(0.65 * ric_noise * ad_env(len(t), 0.004, 0.11) + 0.35 * ric_fm, 0.32, haas_ms=-0.9), 0.012, 0.72)
    place(out, sub_punch_drop(0.14, 130.0, 48.0, rng, drive=2.0), 0.0, 0.52)
    return master_sfx(out, peak_target=0.87, drive=1.35, room_mix=0.14)


def gen_hit_crit(rng: np.random.Generator) -> np.ndarray:
    dur = 0.46
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Bone-shaking anime counter-hit ('CRACK-BOOM!')
    crack = fft_band_filter(white_noise(int(0.025 * SR), rng) + velvet_crackle(int(0.025 * SR), rng, 3500.0), 1200.0, 15500.0)
    crack *= ad_env(len(crack), 0.0008, 0.012)
    place(out, pan_mono(crack, 0.0, haas_ms=0.6), 0.0, 0.95)
    # Armor/steel fracture crunch
    crunch = physical_strike(0.32, 1280.0, "heavy_anvil", decay_s=0.095, rng=rng, hardness=0.96, scrape_ms=8.5)
    place(out, pan_mono(crunch, -0.2, haas_ms=1.0), 0.005, 0.72)
    # Compressed shockwave air burst
    place(out, air_whoosh(0.38, 3200.0, 220.0, rng, peak_pos=0.08, bw_oct=1.35, sharpness=2.3, pan_start=-0.45, pan_end=0.45), 0.006, 0.82)
    # Massive sub-drop (150Hz -> 34Hz)
    place(out, sub_punch_drop(0.36, 152.0, 34.0, rng, drive=3.1), 0.002, 1.05)
    return master_sfx(out, peak_target=0.91, drive=1.55, room_mix=0.18)


def gen_hurt_hit(rng: np.random.Generator) -> np.ndarray:
    dur = 0.17
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Tight punchy leather/body impact thud ('THUD-SNAP', zero musical tone)
    slap = swept_filter(white_noise(n, rng), (2600.0, 520.0), bw_oct=1.1, mode="bandpass", resonance=2.0)
    slap *= ad_env(n, 0.001, 0.038, power=1.2)
    cloth = fft_band_filter(colored_noise(n, rng, 0.9), 400.0, 6500.0) * ad_env(n, 0.003, 0.065)
    thud = sub_punch_drop(dur, 112.0, 46.0, rng, drive=2.2, decay_s=0.068)
    place(out, pan_mono(slap, -0.14, haas_ms=0.5), 0.0, 0.72)
    place(out, pan_mono(cloth, 0.16), 0.004, 0.42)
    place(out, thud, 0.0, 0.85)
    return master_sfx(out, peak_target=0.84, drive=1.35, fade_out_ms=16.0, room_mix=0.06)


def gen_footstep_steel(rng: np.random.Generator) -> np.ndarray:
    dur = 0.13
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Armored boot heel stone tap + subtle greave plate chink
    stone = swept_filter(white_noise(n, rng), (1400.0, 380.0), bw_oct=1.2, mode="bandpass", resonance=1.8) * ad_env(n, 0.001, 0.032)
    heel = sub_punch_drop(0.09, 98.0, 50.0, rng, drive=1.7, decay_s=0.035)
    chink = physical_strike(0.10, 2950.0, "iron_chain", decay_s=0.024, rng=rng, hardness=0.75, scrape_ms=3.0)
    place(out, pan_mono(stone, -0.08), 0.0, 0.78)
    place(out, heel, 0.0, 0.65)
    place(out, pan_mono(chink, 0.15, haas_ms=0.4), 0.014, 0.36)
    return master_sfx(out, peak_target=0.80, drive=1.2, fade_out_ms=14.0, room_mix=0.05)


# ---------- FAMILY 2: STORM RONIN IAIDO & MOBILITY ----------

def gen_raijin_slash(rng: np.random.Generator) -> np.ndarray:
    dur = 0.40
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Lightning-fast katana iaido draw + crackling high-voltage arcs + crisp tsuba click
    iaido = blade_friction_shing(0.24, 3850.0, rng, sweep_ratio=1.55, material="katana_edge")
    place(out, pan_mono(iaido, -0.25, haas_ms=0.7), 0.0, 0.78)
    place(out, air_whoosh(0.28, 3600.0, 480.0, rng, peak_pos=0.14, bw_oct=0.72, sharpness=2.9, pan_start=-0.42, pan_end=0.42), 0.004, 0.88)
    arcs = electric_arc_burst(0.32, rng, density=820.0, f_sweep=(6200.0, 1500.0))
    place(out, pan_mono(arcs, 0.22, haas_ms=-0.8), 0.008, 0.74)
    # Signature katana tsuba guard click at tail (0.24s)
    tsuba = physical_strike(0.11, 3400.0, "brass_gear", decay_s=0.028, rng=rng, hardness=0.95, scrape_ms=2.0)
    place(out, pan_mono(tsuba, 0.12), 0.235, 0.42)
    place(out, sub_punch_drop(0.16, 132.0, 45.0, rng, drive=2.2), 0.003, 0.56)
    return master_sfx(out, peak_target=0.88, drive=1.38, room_mix=0.13)


def gen_dash_whoosh(rng: np.random.Generator) -> np.ndarray:
    dur = 0.30
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Compressed supersonic air-step burst ('FWHIP-WHOOSH!')
    whip = swept_filter(white_noise(int(0.09 * SR), rng), (4200.0, 950.0), bw_oct=0.65, mode="bandpass", resonance=2.6)
    whip *= ad_env(len(whip), 0.002, 0.042)
    place(out, pan_mono(whip, -0.32), 0.0, 0.72)
    place(out, air_whoosh(0.28, 2500.0, 340.0, rng, peak_pos=0.18, bw_oct=0.92, sharpness=2.8, pan_start=-0.45, pan_end=0.45), 0.006, 0.95)
    place(out, sub_punch_drop(0.12, 108.0, 46.0, rng, drive=1.8), 0.0, 0.44)
    return master_sfx(out, peak_target=0.85, drive=1.28, room_mix=0.10)


def gen_storm_leap(rng: np.random.Generator) -> np.ndarray:
    dur = 0.44
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Ground push-off shock + rising storm wind + static crackle
    place(out, sub_punch_drop(0.18, 128.0, 42.0, rng, drive=2.3), 0.0, 0.68)
    place(out, air_whoosh(0.42, 480.0, 2800.0, rng, peak_pos=0.28, bw_oct=0.95, sharpness=2.3, pan_start=-0.38, pan_end=0.38), 0.01, 0.92)
    arcs = electric_arc_burst(0.30, rng, density=480.0, f_sweep=(5200.0, 1800.0))
    place(out, pan_mono(arcs, 0.18, haas_ms=0.8), 0.025, 0.48)
    return master_sfx(out, peak_target=0.86, drive=1.32, room_mix=0.14)


def gen_blink(rng: np.random.Generator) -> np.ndarray:
    dur = 0.32
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Rapid vacuum inward suction (0.0-0.085s) -> sharp spatial displacement pop -> dissipating static
    suck_n = int(0.09 * SR)
    suck = swept_filter(colored_noise(suck_n, rng, 0.7), (420.0, 4800.0), bw_oct=0.6, mode="bandpass", resonance=3.0, comb_depth=0.5)
    suck *= np.linspace(0.02, 1.0, suck_n) ** 1.8
    place(out, pan_mono(suck, -0.35), 0.0, 0.78)
    # Vacuum pop at 0.082s
    pop = sub_punch_drop(0.14, 195.0, 44.0, rng, drive=2.5, decay_s=0.048)
    tail = air_whoosh(0.21, 3800.0, 520.0, rng, peak_pos=0.08, bw_oct=0.8, sharpness=3.1, pan_start=0.0, pan_end=0.42)
    place(out, pop, 0.080, 0.85)
    place(out, tail, 0.082, 0.75)
    return master_sfx(out, peak_target=0.86, drive=1.32, room_mix=0.12)


# ---------- FAMILY 3: BOW & TEMPEST WIND ----------

def gen_arrow_shoot(rng: np.random.Generator) -> np.ndarray:
    dur = 0.26
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # 1. Taut dry bowstring snap + damped yew limb impulse
    string_snap = fft_band_filter(white_noise(int(0.022 * SR), rng), 1400.0, 12500.0) * ad_env(int(0.022 * SR), 0.0008, 0.008)
    limb = physical_strike(0.11, 310.0, "wood_limb", decay_s=0.028, rng=rng, hardness=0.65, scrape_ms=4.0)
    place(out, pan_mono(string_snap, -0.18), 0.0, 0.82)
    place(out, pan_mono(limb, -0.12, haas_ms=0.5), 0.002, 0.68)
    # 2. Wooden shaft arrow-rest scrape + high-velocity fletching whistle ('TWIP-ZING!')
    fletch = swept_filter(white_noise(int(0.22 * SR), rng), (4200.0, 1050.0), bw_oct=0.42, mode="bandpass", resonance=3.2)
    fletch *= swell_env(len(fletch), peak_pos=0.14, sharpness=2.9)
    place(out, pan_mono(fletch, 0.28, haas_ms=-0.7), 0.010, 0.88)
    return master_sfx(out, peak_target=0.85, drive=1.3, room_mix=0.09)


def gen_arrow_hit(rng: np.random.Generator) -> np.ndarray:
    dur = 0.23
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Visceral bodkin penetration 'THWACK!' (sharp 2.2kHz leather/wood transient + 95Hz thud + shaft shudder)
    split = swept_filter(white_noise(int(0.05 * SR), rng) + velvet_crackle(int(0.05 * SR), rng, 2800.0), (2600.0, 900.0), bw_oct=0.9, mode="bandpass", resonance=2.4)
    split *= ad_env(len(split), 0.0008, 0.018)
    shudder = physical_strike(0.16, 390.0, "wood_limb", decay_s=0.042, rng=rng, hardness=0.8, scrape_ms=3.5)
    thud = sub_punch_drop(0.14, 118.0, 48.0, rng, drive=2.3, decay_s=0.048)
    place(out, pan_mono(split, 0.12, haas_ms=0.6), 0.0, 0.92)
    place(out, pan_mono(shudder, -0.16, haas_ms=-0.5), 0.006, 0.64)
    place(out, thud, 0.0, 0.82)
    return master_sfx(out, peak_target=0.87, drive=1.38, room_mix=0.08)


def gen_arrow_rain(rng: np.random.Generator) -> np.ndarray:
    dur = 0.80
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Rapid staggered salvo of 6 supersonic arrow whistles + bodkin impact thwacks
    times = [0.00, 0.085, 0.165, 0.255, 0.340, 0.435]
    pans = [-0.62, 0.48, -0.25, 0.66, -0.44, 0.22]
    for i, (t0, p) in enumerate(zip(times, pans)):
        wh = swept_filter(white_noise(int(0.16 * SR), rng), (4800.0 - i * 160, 1150.0), bw_oct=0.40, mode="bandpass", resonance=3.3)
        wh *= swell_env(len(wh), peak_pos=0.35, sharpness=2.8)
        place(out, pan_mono(wh, p * 0.8), t0, 0.62)
        # Impact 95ms after whistle
        hit_t = t0 + 0.095
        thw = physical_strike(0.14, 420.0 + i * 35.0, "wood_limb", decay_s=0.036, rng=rng, hardness=0.85, scrape_ms=3.0)
        punch = sub_punch_drop(0.14, 120.0, 50.0, rng, drive=2.0, decay_s=0.04)
        place(out, pan_mono(thw + punch * 0.65, p, haas_ms=0.6 * np.sign(p)), hit_t, 0.72)
    # Underlying wind gust
    place(out, air_whoosh(0.75, 1900.0, 420.0, rng, peak_pos=0.30, bw_oct=1.1, sharpness=2.1), 0.0, 0.42)
    return master_sfx(out, peak_target=0.86, drive=1.35, room_mix=0.14)


def gen_zephyr_flip(rng: np.random.Generator) -> np.ndarray:
    dur = 0.36
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Whipping twin-gust acrobatics whoosh + cloak snap
    place(out, air_whoosh(0.20, 2600.0, 680.0, rng, peak_pos=0.22, bw_oct=0.80, sharpness=2.8, pan_start=-0.45, pan_end=0.15), 0.0, 0.85)
    place(out, air_whoosh(0.22, 3100.0, 520.0, rng, peak_pos=0.24, bw_oct=0.75, sharpness=2.7, pan_start=0.10, pan_end=0.48), 0.12, 0.88)
    cloak = fft_band_filter(white_noise(int(0.035 * SR), rng), 800.0, 7500.0) * ad_env(int(0.035 * SR), 0.002, 0.016)
    place(out, pan_mono(cloak, -0.2), 0.005, 0.52)
    return master_sfx(out, peak_target=0.84, drive=1.25, room_mix=0.11)


def gen_archer_ult(rng: np.random.Generator) -> np.ndarray:
    dur = 1.06
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # 0.0-0.42s: Accelerating hurricane wind-vortex tunnel + giant warbow tension creak
    vortex = air_whoosh(0.48, 380.0, 3400.0, rng, peak_pos=0.78, bw_oct=0.72, sharpness=3.2, pan_start=-0.5, pan_end=0.0)
    creak = physical_strike(0.32, 260.0, "wood_limb", decay_s=0.12, rng=rng, hardness=0.55, scrape_ms=18.0)
    place(out, vortex, 0.0, 0.78)
    place(out, pan_mono(creak, -0.15), 0.08, 0.45)
    # 0.40s: Supersonic Wind-Dragon Lance Sonic Boom!
    crack = fft_band_filter(white_noise(int(0.04 * SR), rng) + velvet_crackle(int(0.04 * SR), rng, 3200.0), 1100.0, 15500.0) * ad_env(int(0.04 * SR), 0.001, 0.018)
    place(out, pan_mono(crack, 0.0, haas_ms=0.8), 0.395, 0.98)
    place(out, sub_punch_drop(0.48, 155.0, 32.0, rng, drive=3.0), 0.398, 0.95)
    # Roaring cyclonic gale wake (0.40s -> 1.06s)
    for ch, sgn in enumerate([-1.0, 1.0]):
        gale_n = int(0.66 * SR)
        turb = 0.6 * colored_noise(gale_n, rng, 0.85) + 0.4 * white_noise(gale_n, rng)
        gale = swept_filter(turb, (4200.0, 380.0), bw_oct=0.95, mode="bandpass", resonance=2.5, comb_depth=0.45, comb_rate=4.2)
        gale *= swell_env(gale_n, peak_pos=0.10, sharpness=2.2)
        out[int(0.40 * SR) : int(0.40 * SR) + gale_n, ch] += gale * (0.92 if sgn > 0 else 0.88)
    return master_sfx(out, peak_target=0.90, drive=1.45, room_mix=0.18)


# ---------- FAMILY 4: PYROMANCY & ASTRAL METEOR ----------

def gen_fireball(rng: np.random.Generator) -> np.ndarray:
    dur = 0.44
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Pressurized gas/napalm ignition 'FWOOSH!' + roaring flame wake + ember pops
    pop = swept_filter(white_noise(int(0.055 * SR), rng), (1800.0, 380.0), bw_oct=1.25, mode="bandpass", resonance=2.2) * ad_env(int(0.055 * SR), 0.002, 0.026)
    place(out, pan_mono(pop, -0.15), 0.0, 0.82)
    place(out, combustion_roar(0.42, rng, f_start=1150.0, f_end=280.0, ember_density=380.0), 0.012, 0.95)
    place(out, sub_punch_drop(0.18, 118.0, 42.0, rng, drive=2.1), 0.005, 0.55)
    return master_sfx(out, peak_target=0.87, drive=1.35, room_mix=0.12)


def gen_fire_hit(rng: np.random.Generator) -> np.ndarray:
    dur = 0.40
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Explosive thermal detonation 'KRA-FOOM!' + searing ember hiss
    blast = fft_band_filter(white_noise(int(0.035 * SR), rng) + velvet_crackle(int(0.035 * SR), rng, 3000.0), 800.0, 14500.0) * ad_env(int(0.035 * SR), 0.0008, 0.016)
    place(out, pan_mono(blast, 0.08, haas_ms=0.7), 0.0, 0.92)
    place(out, sub_punch_drop(0.28, 138.0, 36.0, rng, drive=2.8), 0.0, 0.92)
    place(out, combustion_roar(0.38, rng, f_start=1450.0, f_end=240.0, ember_density=540.0), 0.008, 0.88)
    return master_sfx(out, peak_target=0.89, drive=1.45, room_mix=0.15)


def gen_flame_pillar(rng: np.random.Generator) -> np.ndarray:
    dur = 0.84
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Rising geothermal magma geyser roar ('WHOOOOM-CRACKLE!')
    place(out, sub_punch_drop(0.38, 130.0, 34.0, rng, drive=2.7), 0.0, 0.85)
    f_geyser = 240.0 + 1350.0 * swell_env(n, peak_pos=0.28, sharpness=1.9)
    for ch in range(2):
        jet = swept_filter(colored_noise(n, rng, 1.15), f_geyser * (1.0 if ch == 0 else 1.06), bw_oct=1.2, mode="bandpass", resonance=2.3, comb_depth=0.3)
        embers = fft_band_filter(velvet_crackle(n, rng, density_hz=520.0), 1400.0, 15000.0)
        out[:, ch] += (0.72 * jet + 0.38 * embers) * swell_env(n, peak_pos=0.20, sharpness=2.1)
    return master_sfx(out, peak_target=0.88, drive=1.42, room_mix=0.16)


def gen_eclipse_charge(rng: np.random.Generator) -> np.ndarray:
    dur = 0.70
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Gravitational dark-plasma implosion suction + low sub-reactor rumble + corona arcs
    u = np.linspace(0.0, 1.0, n)
    grow_env = (u ** 1.45) * np.exp(-3.5 * np.maximum(u - 0.82, 0.0) / 0.18)
    for ch, sgn in enumerate([-1.0, 1.0]):
        turb = colored_noise(n, rng, alpha=1.25)
        suction = swept_filter(turb, (2200.0, 260.0), bw_oct=0.85, mode="bandpass", resonance=2.8, comb_depth=0.52, comb_rate=3.4)
        out[:, ch] += suction * grow_env * 0.82
    # Non-musical chaotic reactor pulse (throbbing 38Hz->72Hz turbulence)
    sub_phase = np.cumsum(TWO_PI * (38.0 + 36.0 * u + colored_noise(n, rng, 1.8) * 9.0) / SR)
    reactor = np.tanh(np.sin(sub_phase) * 2.2) * grow_env
    place(out, reactor, 0.0, 0.55)
    arcs = electric_arc_burst(0.62, rng, density=420.0, f_sweep=(1800.0, 5400.0))
    place(out, pan_mono(arcs * u[: len(arcs)], 0.2, haas_ms=1.1), 0.05, 0.58)
    return master_sfx(out, peak_target=0.86, drive=1.35, room_mix=0.16)


def gen_solar_beam(rng: np.random.Generator) -> np.ndarray:
    dur = 0.86
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Blinding ignition discharge + roaring concentrated plasma-torch shear
    arcs = electric_arc_burst(0.18, rng, density=950.0, f_sweep=(7200.0, 1800.0))
    place(out, pan_mono(arcs, 0.0, haas_ms=0.8), 0.0, 0.88)
    place(out, sub_punch_drop(0.42, 148.0, 32.0, rng, drive=2.9), 0.005, 0.88)
    for ch in range(2):
        beam_noise = 0.55 * colored_noise(n, rng, 0.8) + 0.45 * white_noise(n, rng)
        beam = swept_filter(beam_noise, (2900.0, 720.0), bw_oct=1.05, mode="bandpass", resonance=2.6, comb_depth=0.55, comb_rate=5.2)
        roar = swept_filter(colored_noise(n, rng, 1.5), (650.0, 220.0), bw_oct=1.4, mode="lowpass", resonance=2.0)
        out[:, ch] += (0.68 * beam + 0.52 * roar) * swell_env(n, peak_pos=0.11, sharpness=2.0)
    return master_sfx(out, peak_target=0.90, drive=1.48, room_mix=0.17)


def gen_meteor(rng: np.random.Generator) -> np.ndarray:
    dur = 0.66
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Screaming atmospheric re-entry fireball roar (downward Doppler turbine tear + roaring fire + plasma hiss)
    place(out, air_whoosh(dur, 4400.0, 280.0, rng, peak_pos=0.62, bw_oct=0.95, sharpness=2.6, pan_start=-0.48, pan_end=0.28), 0.0, 0.90)
    fire = combustion_roar(dur, rng, f_start=1800.0, f_end=340.0, ember_density=560.0)
    u = np.linspace(0.22, 1.0, n)
    place(out, fire * u[:, None], 0.0, 0.84)
    hiss = fft_band_filter(white_noise(n, rng), 2400.0, 14500.0) * swell_env(n, peak_pos=0.58, sharpness=2.2)
    place(out, pan_mono(hiss / (np.max(np.abs(hiss)) + 1e-9), 0.15, haas_ms=0.8), 0.0, 0.36)
    return master_sfx(out, peak_target=0.86, drive=1.35, room_mix=0.14)


def gen_meteor_impact(rng: np.random.Generator) -> np.ndarray:
    dur = 0.94
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Cataclysmic explosion: sub-seismic boom + shattering rock/boulder transients + roaring inferno
    crack = fft_band_filter(white_noise(int(0.05 * SR), rng) + velvet_crackle(int(0.05 * SR), rng, 3800.0), 700.0, 15500.0) * ad_env(int(0.05 * SR), 0.001, 0.022)
    place(out, pan_mono(crack, 0.0, haas_ms=0.9), 0.0, 1.0)
    place(out, sub_punch_drop(0.68, 140.0, 25.0, rng, drive=3.4), 0.002, 1.08)
    place(out, combustion_roar(0.88, rng, f_start=1350.0, f_end=190.0, ember_density=620.0), 0.012, 0.92)
    # Cascading rock debris impacts
    for i in range(9):
        dt = 0.03 + (rng.random() ** 1.4) * 0.48
        rock = physical_strike(0.16, rng.uniform(220.0, 680.0), "heavy_anvil", decay_s=0.042, rng=rng, hardness=0.7, scrape_ms=9.0)
        place(out, pan_mono(rock, rng.uniform(-0.7, 0.7)), dt, rng.uniform(0.25, 0.55))
    return master_sfx(out, peak_target=0.91, drive=1.55, room_mix=0.20)


def gen_supernova_detonate(rng: np.random.Generator) -> np.ndarray:
    dur = 1.06
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # 0.0-0.055s brief vacuum implosion -> stellar core rupture shockwave!
    imp_n = int(0.055 * SR)
    imp = swept_filter(white_noise(imp_n, rng), (500.0, 5200.0), bw_oct=0.7, mode="bandpass", resonance=2.8) * (np.linspace(0.05, 1.0, imp_n) ** 2.0)
    place(out, pan_mono(imp, 0.0), 0.0, 0.72)
    # Detonation at 0.058s
    place(out, sub_punch_drop(0.82, 158.0, 23.0, rng, drive=3.6), 0.058, 1.12)
    arcs = electric_arc_burst(0.45, rng, density=1100.0, f_sweep=(8500.0, 1200.0))
    place(out, pan_mono(arcs, 0.0, haas_ms=1.1), 0.058, 0.85)
    blast = combustion_roar(0.96, rng, f_start=2200.0, f_end=180.0, ember_density=700.0)
    place(out, blast, 0.060, 0.95)
    return master_sfx(out, peak_target=0.92, drive=1.60, room_mix=0.22)


# ---------- FAMILY 5: RADIANT LIGHT / SERAPHINA (ZERO HARP / BELL / PIANO CHORDS!) ----------

def gen_holy_bolt(rng: np.random.Generator) -> np.ndarray:
    dur = 0.32
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Focused photonic laser-pulse launch ('PZSHW-TING!'): swept plasma-air zip + micro-crystal dust
    t = time_axis(0.18)
    f_zip = 5200.0 * ((620.0 / 5200.0) ** (np.linspace(0.0, 1.0, len(t)) ** 0.52))
    zip_noise = swept_filter(white_noise(len(t), rng), f_zip, bw_oct=0.52, mode="bandpass", resonance=3.1, comb_depth=0.48, comb_rate=4.6)
    zip_chirp = np.tanh(np.sin(np.cumsum(TWO_PI * f_zip / SR) + white_noise(len(t), rng) * 0.35) * 1.8) * ad_env(len(t), 0.0015, 0.055)
    place(out, pan_mono(0.72 * zip_noise * ad_env(len(t), 0.002, 0.085) + 0.32 * zip_chirp, -0.16, haas_ms=0.7), 0.0, 0.90)
    # Feathered air snap + non-musical crystal refraction dust
    place(out, air_whoosh(0.24, 3400.0, 780.0, rng, peak_pos=0.14, bw_oct=0.8, sharpness=2.9), 0.004, 0.62)
    place(out, crystal_shard_cascade(0.28, rng, count=14, f_min=4800.0, f_max=14200.0, spread_power=1.9), 0.006, 0.52)
    place(out, sub_punch_drop(0.11, 128.0, 52.0, rng, drive=1.9), 0.0, 0.42)
    return master_sfx(out, peak_target=0.85, drive=1.30, room_mix=0.12)


def gen_holy_hit(rng: np.random.Generator) -> np.ndarray:
    dur = 0.30
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Punchy radiant light-burst impact ('KRACK-SHHH!': photonic flash crack + shattering light-prism dust)
    flash = electric_arc_burst(0.14, rng, density=780.0, f_sweep=(7500.0, 2100.0))
    place(out, pan_mono(flash, 0.0, haas_ms=0.6), 0.0, 0.82)
    place(out, crystal_shard_cascade(0.28, rng, count=20, f_min=3800.0, f_max=14500.0, spread_power=1.8), 0.002, 0.72)
    place(out, air_whoosh(0.24, 3800.0, 620.0, rng, peak_pos=0.10, bw_oct=1.0, sharpness=2.8), 0.004, 0.65)
    place(out, sub_punch_drop(0.16, 134.0, 46.0, rng, drive=2.3), 0.0, 0.68)
    return master_sfx(out, peak_target=0.87, drive=1.35, room_mix=0.13)


def gen_holy_heal(rng: np.random.Generator) -> np.ndarray:
    dur = 0.68
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Warm rushing sanctuary wind-breath + feathered wing gust + 45 high-freq crystal dust grains (ZERO chords!)
    place(out, air_whoosh(0.32, 1600.0, 480.0, rng, peak_pos=0.22, bw_oct=0.95, sharpness=2.6, pan_start=-0.35, pan_end=0.1), 0.0, 0.58)
    f_breath = 480.0 + 1650.0 * swell_env(n, peak_pos=0.38, sharpness=1.8)
    for ch, mul in enumerate([1.0, 1.05]):
        airy = swept_filter(colored_noise(n, rng, 0.75), f_breath * mul, bw_oct=0.95, mode="bandpass", resonance=2.2, comb_depth=0.45, comb_rate=3.6)
        out[:, ch] += airy * swell_env(n, peak_pos=0.32, sharpness=2.0) * 0.78
    dust = crystal_shard_cascade(0.65, rng, count=46, f_min=4600.0, f_max=14600.0, spread_power=1.15)
    place(out, dust, 0.02, 0.68)
    return master_sfx(out, peak_target=0.84, drive=1.22, room_mix=0.18)


def gen_holy_smite(rng: np.random.Generator) -> np.ndarray:
    dur = 0.70
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Skyward photonic lance strike ('KRA-ZAP-WHOOSH!'): lightning-sharp photonic crack + sanctuary rush
    lance_crack = electric_arc_burst(0.28, rng, density=920.0, f_sweep=(8200.0, 1600.0))
    place(out, pan_mono(lance_crack, 0.0, haas_ms=0.9), 0.0, 0.92)
    place(out, sub_punch_drop(0.38, 150.0, 34.0, rng, drive=2.8), 0.003, 0.88)
    place(out, air_whoosh(0.64, 4200.0, 380.0, rng, peak_pos=0.12, bw_oct=1.05, sharpness=2.2, pan_start=-0.45, pan_end=0.45), 0.008, 0.82)
    place(out, crystal_shard_cascade(0.62, rng, count=28, f_min=3600.0, f_max=14200.0, spread_power=1.5), 0.015, 0.64)
    return master_sfx(out, peak_target=0.89, drive=1.42, room_mix=0.18)


def gen_final_grace_charge(rng: np.random.Generator) -> np.ndarray:
    dur = 0.72
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Rising photonic turbine spin-up + feathered wing gust + focusing crystal refraction shimmer
    u = np.linspace(0.0, 1.0, n)
    env = (u ** 1.35) * np.exp(-3.2 * np.maximum(u - 0.85, 0.0) / 0.15)
    f_spin = 320.0 * ((4400.0 / 320.0) ** (u ** 1.15))
    for ch, mul in enumerate([1.0, 1.04]):
        turb = swept_filter(white_noise(n, rng), f_spin * mul, bw_oct=0.58, mode="bandpass", resonance=3.1, comb_depth=0.55, comb_rate=4.8)
        out[:, ch] += turb * env * 0.82
    # Wing gust at 0.04s + accelerating crystal focus sparks
    place(out, air_whoosh(0.38, 1900.0, 520.0, rng, peak_pos=0.22, bw_oct=1.0, sharpness=2.5), 0.02, 0.62)
    sparks = crystal_shard_cascade(0.66, rng, count=34, f_min=4200.0, f_max=14500.0, spread_power=0.85)
    place(out, sparks * env[: len(sparks), None], 0.04, 0.68)
    return master_sfx(out, peak_target=0.86, drive=1.30, room_mix=0.16)


def _lux_prismatic_cannon(dur: float, rng: np.random.Generator, with_wing_pre: bool = False) -> np.ndarray:
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    t0 = 0.045 if with_wing_pre else 0.0
    if with_wing_pre:
        # Rapid 45ms photonic capacitor snap-in
        pre_n = int(0.05 * SR)
        pre = swept_filter(white_noise(pre_n, rng), (600.0, 6200.0), bw_oct=0.65, mode="bandpass", resonance=3.0) * (np.linspace(0.05, 1.0, pre_n) ** 1.8)
        place(out, pan_mono(pre, 0.0), 0.0, 0.72)
    # 1. Blinding photonic capacitor discharge crack
    cap_crack = electric_arc_burst(0.26, rng, density=1150.0, f_sweep=(9200.0, 1800.0))
    place(out, pan_mono(cap_crack, 0.0, haas_ms=0.9), t0, 0.96)
    # 2. Massive sub-bass shockwave punch
    place(out, sub_punch_drop(0.58, 155.0, 28.0, rng, drive=3.2), t0 + 0.002, 0.98)
    # 3. Roaring multi-band phase-modulated light/plasma beam shear
    beam_len = n - int(t0 * SR)
    for ch, mul in enumerate([1.0, 1.035]):
        src = 0.52 * white_noise(beam_len, rng) + 0.48 * colored_noise(beam_len, rng, 0.85)
        hi_beam = swept_filter(src, (4800.0 * mul, 920.0), bw_oct=0.88, mode="bandpass", resonance=2.8, comb_depth=0.62, comb_rate=5.8)
        lo_roar = swept_filter(colored_noise(beam_len, rng, 1.4), (780.0, 210.0), bw_oct=1.35, mode="lowpass", resonance=2.1)
        b_env = swell_env(beam_len, peak_pos=0.09, sharpness=2.05)
        out[int(t0 * SR) :, ch] += (0.72 * hi_beam + 0.48 * lo_roar) * b_env
    # 4. Shattering prism refraction cascade in the wake
    place(out, crystal_shard_cascade(dur - t0 - 0.02, rng, count=36, f_min=4200.0, f_max=14800.0, spread_power=1.4), t0 + 0.015, 0.56)
    return master_sfx(out, peak_target=0.91, drive=1.52, room_mix=0.20)


def gen_final_grace_beam(rng: np.random.Generator) -> np.ndarray:
    return _lux_prismatic_cannon(1.04, rng, with_wing_pre=False)


def gen_priestess_ult(rng: np.random.Generator) -> np.ndarray:
    return _lux_prismatic_cannon(1.08, rng, with_wing_pre=True)


# ---------- FAMILY 6: VALKYRIE ----------

def gen_holy_spear(rng: np.random.Generator) -> np.ndarray:
    dur = 0.38
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Supersonic heavy war-lance whip-thrust ('CRACK-SHING-WHOOSH!')
    whip = fft_band_filter(white_noise(int(0.024 * SR), rng), 1200.0, 14000.0) * ad_env(int(0.024 * SR), 0.0008, 0.010)
    spear_steel = blade_friction_shing(0.25, 2950.0, rng, sweep_ratio=1.42, material="steel_blade")
    sonic = air_whoosh(0.34, 3500.0, 420.0, rng, peak_pos=0.15, bw_oct=0.72, sharpness=2.8, pan_start=-0.38, pan_end=0.42)
    place(out, pan_mono(whip, -0.2), 0.0, 0.85)
    place(out, pan_mono(spear_steel, 0.16, haas_ms=0.8), 0.006, 0.72)
    place(out, sonic, 0.004, 0.92)
    place(out, sub_punch_drop(0.18, 138.0, 42.0, rng, drive=2.3), 0.003, 0.64)
    return master_sfx(out, peak_target=0.88, drive=1.38, room_mix=0.13)


def gen_dragon_dive(rng: np.random.Generator) -> np.ndarray:
    dur = 0.92
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # 0.0-0.27s: Screaming aerial sonic dive whistle -> 0.27s explosive ground-cracking lance slam!
    dive = air_whoosh(0.30, 3600.0, 480.0, rng, peak_pos=0.82, bw_oct=0.58, sharpness=3.4, pan_start=-0.42, pan_end=0.0)
    place(out, dive, 0.0, 0.82)
    # Impact at 0.265s
    t_imp = 0.265
    lance_clang = physical_strike(0.45, 1350.0, "steel_blade", decay_s=0.16, rng=rng, hardness=0.96, scrape_ms=7.0)
    stone_crack = fft_band_filter(white_noise(int(0.05 * SR), rng) + velvet_crackle(int(0.05 * SR), rng, 3500.0), 800.0, 15000.0) * ad_env(int(0.05 * SR), 0.001, 0.022)
    place(out, pan_mono(stone_crack, 0.0, haas_ms=0.8), t_imp, 0.98)
    place(out, pan_mono(lance_clang, 0.18, haas_ms=-0.9), t_imp + 0.004, 0.74)
    place(out, sub_punch_drop(0.58, 152.0, 28.0, rng, drive=3.3), t_imp, 1.05)
    place(out, combustion_roar(0.62, rng, f_start=1100.0, f_end=210.0, ember_density=420.0), t_imp + 0.01, 0.76)
    return master_sfx(out, peak_target=0.91, drive=1.52, room_mix=0.19)


# ---------- FAMILY 7: CRYOMANCY / LYRA ----------

def gen_frost_cast(rng: np.random.Generator) -> np.ndarray:
    dur = 0.42
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Sub-zero freezing wind-gust + rapid crystalline ice-formation creaks & snaps ('SHHHH-KRK-KRK!')
    blizzard = air_whoosh(0.40, 3800.0, 920.0, rng, peak_pos=0.22, bw_oct=0.85, sharpness=2.5, pan_start=-0.38, pan_end=0.38)
    place(out, blizzard, 0.0, 0.86)
    # Low-mid glacier ice-stress creaks (inharmonic strained crystal pops)
    for dt in [0.015, 0.055, 0.105, 0.165]:
        creak = physical_strike(0.09, rng.uniform(680.0, 1450.0), "wood_limb", decay_s=0.025, rng=rng, hardness=0.9, scrape_ms=5.0)
        place(out, pan_mono(creak, rng.uniform(-0.5, 0.5)), dt, 0.52)
    place(out, crystal_shard_cascade(0.38, rng, count=22, f_min=3200.0, f_max=13800.0, spread_power=1.4), 0.008, 0.74)
    return master_sfx(out, peak_target=0.86, drive=1.30, room_mix=0.14)


def gen_ice_shatter(rng: np.random.Generator) -> np.ndarray:
    dur = 0.48
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Explosive glacier/glass crystal shatter! Razor initial fracture crack + 34 ice-shard bursts!
    fracture = fft_band_filter(white_noise(int(0.03 * SR), rng) + velvet_crackle(int(0.03 * SR), rng, 4200.0), 1600.0, 16000.0) * ad_env(int(0.03 * SR), 0.0007, 0.014)
    place(out, pan_mono(fracture, 0.0, haas_ms=0.7), 0.0, 0.96)
    place(out, sub_punch_drop(0.22, 136.0, 42.0, rng, drive=2.4), 0.0, 0.76)
    place(out, crystal_shard_cascade(0.46, rng, count=36, f_min=2800.0, f_max=14500.0, spread_power=1.55), 0.003, 0.95)
    place(out, air_whoosh(0.34, 4200.0, 750.0, rng, peak_pos=0.12, bw_oct=1.0, sharpness=2.7), 0.006, 0.55)
    return master_sfx(out, peak_target=0.89, drive=1.38, room_mix=0.16)


def gen_prism_beam(rng: np.random.Generator) -> np.ndarray:
    dur = 0.84
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Searing sub-zero cryo-refraction beam roar + howling blizzard shear + ice-hail spray
    snap = electric_arc_burst(0.16, rng, density=820.0, f_sweep=(7800.0, 2200.0))
    place(out, pan_mono(snap, 0.0, haas_ms=0.8), 0.0, 0.84)
    place(out, sub_punch_drop(0.36, 140.0, 36.0, rng, drive=2.6), 0.004, 0.78)
    for ch, mul in enumerate([1.0, 1.05]):
        gale = swept_filter(white_noise(n, rng), (4600.0 * mul, 1100.0), bw_oct=0.82, mode="bandpass", resonance=2.9, comb_depth=0.58, comb_rate=5.0)
        out[:, ch] += gale * swell_env(n, peak_pos=0.12, sharpness=2.0) * 0.84
    place(out, crystal_shard_cascade(0.80, rng, count=42, f_min=3500.0, f_max=14800.0, spread_power=1.1), 0.01, 0.72)
    return master_sfx(out, peak_target=0.89, drive=1.42, room_mix=0.18)


# ---------- FAMILY 8: ABYSSAL REAPER ----------

def gen_scythe_reap(rng: np.random.Generator) -> np.ndarray:
    dur = 0.46
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Huge curved iron scythe guillotine air-reap + flesh/armor rending slice ('GWHOOSH-SHLACK!')
    place(out, air_whoosh(0.40, 1750.0, 230.0, rng, peak_pos=0.22, bw_oct=1.05, sharpness=2.5, pan_start=-0.46, pan_end=0.46), 0.0, 0.94)
    reap_steel = blade_friction_shing(0.34, 1980.0, rng, sweep_ratio=0.68, material="heavy_anvil")
    rend = swept_filter(velvet_crackle(int(0.18 * SR), rng, 1900.0) + white_noise(int(0.18 * SR), rng) * 0.6, (2800.0, 620.0), bw_oct=0.95, mode="bandpass", resonance=2.5) * ad_env(int(0.18 * SR), 0.003, 0.085)
    place(out, pan_mono(reap_steel, 0.18, haas_ms=0.9), 0.025, 0.78)
    place(out, pan_mono(rend, -0.14), 0.042, 0.72)
    place(out, sub_punch_drop(0.24, 132.0, 38.0, rng, drive=2.5), 0.038, 0.76)
    return master_sfx(out, peak_target=0.88, drive=1.42, room_mix=0.15)


def gen_chain_hook(rng: np.random.Generator) -> np.ndarray:
    dur = 0.55
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Heavy iron chain links whipping & rattling -> brutal taut snap-crack at 0.30s!
    link_times = [0.00, 0.045, 0.088, 0.128, 0.165, 0.200, 0.232, 0.262]
    for i, lt in enumerate(link_times):
        link = physical_strike(0.11, 1650.0 + i * 140.0, "iron_chain", decay_s=0.035, rng=rng, hardness=0.88, scrape_ms=3.5)
        pan = -0.45 + 0.12 * i
        place(out, pan_mono(link, pan, haas_ms=0.6), lt, 0.52 + 0.04 * i)
    place(out, air_whoosh(0.34, 2400.0, 650.0, rng, peak_pos=0.65, bw_oct=0.85, sharpness=2.8), 0.0, 0.65)
    # Taut iron hook whip-crack at 0.295s
    taut = physical_strike(0.24, 1380.0, "steel_blade", decay_s=0.085, rng=rng, hardness=0.96, scrape_ms=5.0)
    crack = fft_band_filter(white_noise(int(0.028 * SR), rng), 1500.0, 15000.0) * ad_env(int(0.028 * SR), 0.0008, 0.011)
    place(out, pan_mono(taut, 0.25, haas_ms=-0.8), 0.295, 0.88)
    place(out, pan_mono(crack, 0.25), 0.295, 0.85)
    place(out, sub_punch_drop(0.20, 136.0, 42.0, rng, drive=2.4), 0.295, 0.72)
    return master_sfx(out, peak_target=0.88, drive=1.38, room_mix=0.14)


def gen_soul_drain(rng: np.random.Generator) -> np.ndarray:
    dur = 0.68
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Dark abyssal vacuum wind-suction vortex + eerie formant-swept granular whisper-hiss (ZERO synth chord!)
    rip = swept_filter(white_noise(int(0.08 * SR), rng) + velvet_crackle(int(0.08 * SR), rng, 2400.0), (4200.0, 900.0), bw_oct=0.9, mode="bandpass", resonance=2.5)
    rip *= ad_env(len(rip), 0.002, 0.038)
    place(out, pan_mono(rip / (np.max(np.abs(rip)) + 1e-9), -0.22, haas_ms=0.7), 0.0, 0.68)
    place(out, sub_punch_drop(0.22, 118.0, 38.0, rng, drive=2.1), 0.0, 0.56)

    env = swell_env(n, peak_pos=0.42, sharpness=2.0)
    f1 = 1450.0 * ((320.0 / 1450.0) ** np.linspace(0.0, 1.0, n))
    f2 = 5800.0 * ((1150.0 / 5800.0) ** np.linspace(0.0, 1.0, n))
    for ch, mul in enumerate([1.0, 0.93]):
        src = 0.55 * colored_noise(n, rng, 0.75) + 0.45 * velvet_crackle(n, rng, density_hz=1400.0)
        vortex = swept_filter(src, f1 * mul, bw_oct=0.85, mode="bandpass", resonance=2.8, comb_depth=0.48)
        vortex /= np.max(np.abs(vortex)) + 1e-9
        whisper = swept_filter(white_noise(n, rng), f2 * mul, bw_oct=0.75, mode="bandpass", resonance=3.1, comb_depth=0.58, comb_rate=4.4)
        whisper /= np.max(np.abs(whisper)) + 1e-9
        cavern = swept_filter(colored_noise(n, rng, 1.3), (240.0, 85.0), bw_oct=1.1, mode="lowpass", resonance=1.7)
        cavern /= np.max(np.abs(cavern)) + 1e-9
        out[:, ch] += (0.64 * vortex + 0.58 * whisper + 0.32 * cavern) * env
    return master_sfx(out, peak_target=0.85, drive=1.32, room_mix=0.20)


def gen_reaper_ult(rng: np.random.Generator) -> np.ndarray:
    dur = 1.38
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # 5 terrifying ultra-fast guillotine scythe blitz slashes -> massive final abyssal shockwave rip!
    blitz = [(0.02, -0.58), (0.155, 0.56), (0.285, -0.45), (0.410, 0.52), (0.530, -0.35)]
    for i, (bt, pan) in enumerate(blitz):
        sh = blade_friction_shing(0.19, 2100.0 + i * 240.0, rng, sweep_ratio=1.35, material="katana_edge")
        wh = air_whoosh(0.18, 2800.0, 420.0, rng, peak_pos=0.16, bw_oct=0.8, sharpness=3.0, pan_start=pan, pan_end=-pan * 0.5)
        place(out, pan_mono(sh, pan, haas_ms=0.7), bt, 0.68)
        place(out, wh, bt, 0.64)
        place(out, sub_punch_drop(0.11, 125.0, 48.0, rng, drive=2.0), bt + 0.01, 0.42)
    # Final execution rift detonation at 0.69s
    t_fin = 0.69
    reap_fin = physical_strike(0.52, 980.0, "heavy_anvil", decay_s=0.18, rng=rng, hardness=0.98, scrape_ms=9.0)
    place(out, pan_mono(reap_fin, 0.0, haas_ms=1.0), t_fin, 0.92)
    place(out, sub_punch_drop(0.62, 155.0, 26.0, rng, drive=3.4), t_fin, 1.05)
    place(out, combustion_roar(0.66, rng, f_start=1600.0, f_end=180.0, ember_density=520.0), t_fin + 0.01, 0.85)
    return master_sfx(out, peak_target=0.91, drive=1.52, room_mix=0.20)


# ---------- FAMILY 9: CHRONOS / HOROLOGY (ZERO XYLOPHONE / TOY CHIMES!) ----------

def _watch_tick(rng: np.random.Generator, heavy: bool = False) -> np.ndarray:
    dur = 0.075 if heavy else 0.045
    click = physical_strike(dur, 2650.0 if not heavy else 1950.0, "brass_gear", decay_s=0.014 if not heavy else 0.022, rng=rng, hardness=0.95, scrape_ms=1.6)
    latch = physical_strike(dur, 4400.0, "brass_gear", decay_s=0.008, rng=rng, hardness=0.98, scrape_ms=1.2)
    out = click * 0.78
    place(out, latch, 0.006 if not heavy else 0.010, 0.55)
    if heavy:
        place(out, sub_punch_drop(0.06, 130.0, 52.0, rng, drive=2.0, decay_s=0.024), 0.0, 0.55)
    return out / (np.max(np.abs(out)) + 1e-9)


def gen_clock_gear(rng: np.random.Generator) -> np.ndarray:
    dur = 0.42
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Precision brass escapement ratchet clicks ('TICK-CLACK!') + razor Clock-Blade air-whip ('SHING-WHOOSH!')
    for dt, p in [(0.00, -0.30), (0.042, 0.22), (0.078, -0.15), (0.285, 0.28)]:
        place(out, pan_mono(_watch_tick(rng, heavy=(dt == 0.0)), p, haas_ms=0.5), dt, 0.78)
    blade = blade_friction_shing(0.28, 3300.0, rng, sweep_ratio=1.38, material="steel_blade")
    place(out, pan_mono(blade, 0.15, haas_ms=0.8), 0.035, 0.74)
    place(out, air_whoosh(0.32, 3100.0, 520.0, rng, peak_pos=0.20, bw_oct=0.78, sharpness=2.8, pan_start=-0.38, pan_end=0.38), 0.032, 0.85)
    return master_sfx(out, peak_target=0.86, drive=1.34, room_mix=0.12)


def gen_chrono_hit(rng: np.random.Generator) -> np.ndarray:
    dur = 0.38
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Sharp Clock-Blade slice + mechanical brass gear-tooth crunch + micro watch-glass crack!
    crunch = physical_strike(0.26, 2050.0, "brass_gear", decay_s=0.065, rng=rng, hardness=0.96, scrape_ms=5.0)
    slice_s = blade_friction_shing(0.20, 3400.0, rng, sweep_ratio=0.75, material="katana_edge")
    glass = crystal_shard_cascade(0.28, rng, count=14, f_min=3600.0, f_max=13800.0, spread_power=1.9)
    place(out, pan_mono(crunch, -0.18, haas_ms=0.7), 0.0, 0.88)
    place(out, pan_mono(slice_s, 0.22, haas_ms=-0.6), 0.004, 0.65)
    place(out, glass, 0.008, 0.62)
    place(out, sub_punch_drop(0.18, 138.0, 44.0, rng, drive=2.4), 0.0, 0.74)
    return master_sfx(out, peak_target=0.88, drive=1.38, room_mix=0.13)


def gen_hourglass_trap(rng: np.random.Generator) -> np.ndarray:
    dur = 0.68
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Heavy mechanical brass lock latch ('CLUNK-CLICK!') + pressurized temporal sand-rush ('SHHHHH!')
    clunk = physical_strike(0.24, 880.0, "heavy_anvil", decay_s=0.075, rng=rng, hardness=0.90, scrape_ms=6.5)
    place(out, pan_mono(clunk, -0.2, haas_ms=0.8), 0.0, 0.86)
    place(out, pan_mono(_watch_tick(rng, heavy=True), 0.24), 0.055, 0.82)
    place(out, sub_punch_drop(0.22, 132.0, 42.0, rng, drive=2.3), 0.0, 0.72)
    # Granular pressurized sand rush (2.2kHz-11kHz dense fine grain turbulence)
    sand_n = int(0.60 * SR)
    for ch, mul in enumerate([1.0, 1.06]):
        grains = 0.55 * white_noise(sand_n, rng) + 0.45 * velvet_crackle(sand_n, rng, density_hz=2600.0)
        sand = swept_filter(grains, (3800.0 * mul, 1350.0), bw_oct=0.95, mode="bandpass", resonance=2.3, comb_depth=0.35)
        out[int(0.05 * SR) : int(0.05 * SR) + sand_n, ch] += sand * swell_env(sand_n, peak_pos=0.20, sharpness=2.2) * 0.78
    return master_sfx(out, peak_target=0.87, drive=1.35, room_mix=0.15)


def gen_time_rewind(rng: np.random.Generator) -> np.ndarray:
    dur = 0.58
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Reversed-envelope vacuum suction whoosh + rapid spinning watch-gear escapement rewind ('WHIRRR-ZIP!')
    rev_env = (np.linspace(0.03, 1.0, int(0.46 * SR)) ** 2.1)
    for ch, mul in enumerate([1.0, 1.05]):
        suck = swept_filter(colored_noise(len(rev_env), rng, 0.75), (360.0, 4600.0 * mul), bw_oct=0.68, mode="bandpass", resonance=2.9, comb_depth=0.52, comb_rate=4.5)
        out[: len(rev_env), ch] += suck * rev_env * 0.82
    # Accelerating watch-gear ratchet whir (14 clicks accelerating into a zip!)
    t_cur = 0.02
    gap = 0.058
    while t_cur < 0.44:
        tick = _watch_tick(rng, heavy=False)
        gain = 0.35 + 0.55 * (t_cur / 0.44)
        place(out, pan_mono(tick, math.sin(t_cur * 28.0) * 0.45), t_cur, gain)
        t_cur += gap
        gap = max(0.014, gap * 0.84)
    # Sharp snap-lock at 0.455s
    place(out, pan_mono(_watch_tick(rng, heavy=True), 0.0, haas_ms=0.6), 0.455, 0.95)
    place(out, sub_punch_drop(0.11, 160.0, 48.0, rng, drive=2.2), 0.455, 0.68)
    return master_sfx(out, peak_target=0.86, drive=1.32, room_mix=0.14)


def _za_warudo_time_stop(dur: float, rng: np.random.Generator, include_bell: bool = True) -> np.ndarray:
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # 1. Heavy inharmonic bronze Twelfth-Bell / anvil strike transient (0.0s)
    if include_bell:
        bell = physical_strike(0.55, 540.0, "bronze_bell", decay_s=0.22, rng=rng, hardness=0.92, scrape_ms=6.0)
        place(out, pan_mono(bell, 0.0, haas_ms=1.1), 0.0, 0.72)
    else:
        place(out, pan_mono(_watch_tick(rng, heavy=True), 0.0, haas_ms=0.6), 0.0, 0.92)

    # 2. Iconic Anime 'ZA WARUDO' Warped Tape-Stop Sub-Bass Plunge (275Hz -> 26Hz with phase-flutter growl!)
    plunge_dur = min(0.78, dur * 0.62)
    t_p = time_axis(plunge_dur)
    u = np.linspace(0.0, 1.0, len(t_p))
    # Exponential downward pitch-warp + decelerating flutter wobble (28Hz -> 4Hz wobble)
    wobble_phase = np.cumsum(TWO_PI * (30.0 * (1.0 - 0.85 * u)) / SR)
    f_warp = (26.0 + 250.0 * np.exp(-u * 4.2)) * (1.0 + 0.14 * np.sin(wobble_phase))
    phase = np.cumsum(TWO_PI * f_warp / SR)
    # Rich odd+even phase-distorted wavefold so it growls across 40Hz-1800Hz!
    raw_warp = np.tanh((np.sin(phase) + 0.55 * np.sin(2.0 * phase + 0.7) + 0.35 * np.sin(3.1 * phase)) * 2.8)
    warp_env = ad_env(len(t_p), attack_s=0.004, decay_s=plunge_dur * 0.58, power=1.15)
    # Add simultaneous downward-collapsing air vacuum shear (4800Hz -> 140Hz)
    vac = air_whoosh(plunge_dur, 4800.0, 140.0, rng, peak_pos=0.08, bw_oct=1.15, sharpness=2.4, pan_start=-0.55, pan_end=0.55)
    place(out, pan_mono(raw_warp * warp_env, 0.0, haas_ms=1.3), 0.012, 0.95)
    place(out, vac, 0.008, 0.78)

    # 3. Decelerating heavy pocket-watch escapement ticks echoing into frozen silence!
    tick_times = [0.46, 0.68, 0.94, 1.24] if dur > 1.3 else [0.42, 0.64, 0.90, 1.12]
    for i, tt in enumerate(tick_times):
        if tt + 0.08 < dur:
            tk = _watch_tick(rng, heavy=True)
            pan = (-0.32 if i % 2 == 0 else 0.32) * (1.0 - 0.15 * i)
            place(out, pan_mono(tk, pan, haas_ms=0.8), tt, 0.82 * (0.82 ** i))
    return master_sfx(out, peak_target=0.91, drive=1.48, room_mix=0.18)


def gen_chrono_ult(rng: np.random.Generator) -> np.ndarray:
    return _za_warudo_time_stop(1.45, rng, include_bell=True)


def gen_time_stop(rng: np.random.Generator) -> np.ndarray:
    return _za_warudo_time_stop(1.25, rng, include_bell=False)


def gen_time_shatter(rng: np.random.Generator) -> np.ndarray:
    dur = 0.92
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Crisp pocket-watch click (0.0s) -> brief tension pause -> 0.085s EXPLOSIVE stained-glass clockface shatter!
    place(out, pan_mono(_watch_tick(rng, heavy=True), 0.0), 0.0, 0.88)
    t_sh = 0.085
    crack = fft_band_filter(white_noise(int(0.04 * SR), rng) + velvet_crackle(int(0.04 * SR), rng, 4500.0), 1200.0, 16000.0) * ad_env(int(0.04 * SR), 0.0007, 0.016)
    spring = physical_strike(0.36, 1480.0, "brass_gear", decay_s=0.12, rng=rng, hardness=0.96, scrape_ms=5.0)
    place(out, pan_mono(crack, 0.0, haas_ms=0.8), t_sh, 1.0)
    place(out, pan_mono(spring, -0.22, haas_ms=-0.9), t_sh + 0.006, 0.72)
    place(out, crystal_shard_cascade(0.80, rng, count=44, f_min=2600.0, f_max=14800.0, spread_power=1.45), t_sh + 0.003, 0.92)
    place(out, sub_punch_drop(0.62, 152.0, 26.0, rng, drive=3.3), t_sh, 1.04)
    place(out, air_whoosh(0.65, 4200.0, 260.0, rng, peak_pos=0.09, bw_oct=1.2, sharpness=2.3), t_sh + 0.005, 0.74)
    return master_sfx(out, peak_target=0.91, drive=1.52, room_mix=0.20)


# ---------- FAMILY 10: TITAN WORLD-FORGE ----------

def gen_thunder_slam(rng: np.random.Generator) -> np.ndarray:
    dur = 0.72
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Colossal forged iron war-maul anvil slam ('CLANG-KRAKOOM!') + rolling thunder-crack!
    anvil = physical_strike(0.52, 740.0, "heavy_anvil", decay_s=0.18, rng=rng, hardness=0.95, scrape_ms=8.5)
    thunder = electric_arc_burst(0.56, rng, density=760.0, f_sweep=(6800.0, 900.0))
    place(out, pan_mono(anvil, -0.15, haas_ms=1.0), 0.0, 0.88)
    place(out, pan_mono(thunder, 0.18, haas_ms=-1.1), 0.006, 0.78)
    place(out, sub_punch_drop(0.52, 148.0, 28.0, rng, drive=3.2), 0.0, 1.02)
    place(out, combustion_roar(0.65, rng, f_start=900.0, f_end=180.0, ember_density=340.0), 0.015, 0.68)
    return master_sfx(out, peak_target=0.90, drive=1.50, room_mix=0.19)


def gen_earthshatter(rng: np.random.Generator) -> np.ndarray:
    dur = 1.06
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Seismic tectonic fault-line rupture + crushing rock boulders + deep volcanic rumble!
    maul = physical_strike(0.45, 620.0, "heavy_anvil", decay_s=0.15, rng=rng, hardness=0.92, scrape_ms=10.0)
    place(out, pan_mono(maul, 0.0, haas_ms=1.0), 0.0, 0.86)
    place(out, sub_punch_drop(0.78, 145.0, 24.0, rng, drive=3.5), 0.0, 1.08)
    # Tectonic fault cracks at 0.0s, 0.14s, 0.29s + boulder cascade
    for ft, p in [(0.01, -0.35), (0.14, 0.42), (0.28, -0.28)]:
        rupt = fft_band_filter(white_noise(int(0.08 * SR), rng) + velvet_crackle(int(0.08 * SR), rng, 2800.0), 400.0, 12000.0) * ad_env(int(0.08 * SR), 0.002, 0.038)
        place(out, pan_mono(rupt, p), ft, 0.75)
    for _ in range(12):
        dt = 0.04 + (rng.random() ** 1.3) * 0.68
        boulder = physical_strike(0.18, rng.uniform(180.0, 540.0), "wood_limb", decay_s=0.055, rng=rng, hardness=0.75, scrape_ms=11.0)
        place(out, pan_mono(boulder, rng.uniform(-0.75, 0.75)), dt, rng.uniform(0.32, 0.62))
    place(out, combustion_roar(0.98, rng, f_start=720.0, f_end=150.0, ember_density=480.0), 0.02, 0.82)
    return master_sfx(out, peak_target=0.91, drive=1.55, room_mix=0.20)


def gen_whirlwind(rng: np.random.Generator) -> np.ndarray:
    dur = 0.70
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # 4 rapidly whipping cyclical heavy blade/air vortex rotations ('WHOOSH-WHOOSH-WHOOSH-WHOOSH!')
    cycles = [0.00, 0.155, 0.310, 0.465]
    for i, ct in enumerate(cycles):
        p0 = -0.58 if i % 2 == 0 else 0.58
        wh = air_whoosh(0.22, 3900.0, 460.0, rng, peak_pos=0.26, bw_oct=1.05, sharpness=2.7, pan_start=p0, pan_end=-p0)
        sh = blade_friction_shing(0.16, 2650.0 + (i % 2) * 340.0, rng, sweep_ratio=1.35, material="steel_blade")
        place(out, wh, ct, 0.88)
        place(out, pan_mono(sh, p0 * 0.65, haas_ms=0.6), ct + 0.015, 0.58)
        place(out, sub_punch_drop(0.10, 115.0, 48.0, rng, drive=1.9), ct + 0.02, 0.38)
    return master_sfx(out, peak_target=0.86, drive=1.34, room_mix=0.14)


# ---------- FAMILY 11: CYBER ANDROID VEX-09 ----------

def gen_cyber_slash(rng: np.random.Generator) -> np.ndarray:
    dur = 0.36
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # High-frequency Muramasa plasma-blade slice ('ZHWING-SNAP!': FM plasma buzz + razor katana air-whip)
    t = time_axis(0.26)
    f_pl = 3400.0 * ((520.0 / 3400.0) ** (np.linspace(0.0, 1.0, len(t)) ** 0.58))
    mod = np.sin(np.cumsum(TWO_PI * (f_pl * 1.414) / SR)) * 2.2
    plasma = np.tanh(np.sin(np.cumsum(TWO_PI * f_pl / SR) + mod + white_noise(len(t), rng) * 0.28) * 2.0)
    plasma = fft_band_filter(plasma, 320.0, 14500.0) * ad_env(len(t), 0.002, 0.11)
    edge = blade_friction_shing(0.22, 4100.0, rng, sweep_ratio=1.45, material="katana_edge")
    place(out, pan_mono(plasma, -0.22, haas_ms=0.7), 0.004, 0.72)
    place(out, pan_mono(edge, 0.24, haas_ms=-0.6), 0.0, 0.65)
    place(out, air_whoosh(0.30, 3800.0, 480.0, rng, peak_pos=0.15, bw_oct=0.72, sharpness=2.9, pan_start=-0.42, pan_end=0.42), 0.003, 0.85)
    place(out, sub_punch_drop(0.15, 142.0, 44.0, rng, drive=2.2), 0.0, 0.58)
    return master_sfx(out, peak_target=0.88, drive=1.38, room_mix=0.12)


def gen_emp_blast(rng: np.random.Generator) -> np.ndarray:
    dur = 0.68
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Heavy electromagnetic sub-drop + high-voltage transformer arc discharge ('BZZT-KRA-BWOOOM!')
    arcs = electric_arc_burst(0.54, rng, density=1050.0, f_sweep=(7600.0, 850.0))
    place(out, pan_mono(arcs, 0.0, haas_ms=1.0), 0.0, 0.92)
    place(out, sub_punch_drop(0.56, 195.0, 29.0, rng, drive=3.2), 0.006, 1.02)
    # Magnetic phaser shockwave sweep
    for ch, mul in enumerate([1.0, 1.06]):
        mag = swept_filter(colored_noise(n, rng, 0.85), (3600.0 * mul, 220.0), bw_oct=0.8, mode="bandpass", resonance=3.0, comb_depth=0.65, comb_rate=5.5)
        out[:, ch] += mag * swell_env(n, peak_pos=0.09, sharpness=2.3) * 0.76
    return master_sfx(out, peak_target=0.90, drive=1.48, room_mix=0.17)


def gen_cyber_beam(rng: np.random.Generator) -> np.ndarray:
    dur = 0.88
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # 0.0-0.075s rapid railgun capacitor spin-up -> 0.075s supersonic railgun crack + roaring plasma tear!
    chg_n = int(0.078 * SR)
    f_chg = 420.0 * ((6800.0 / 420.0) ** (np.linspace(0.0, 1.0, chg_n) ** 1.4))
    chg = np.tanh(np.sin(np.cumsum(TWO_PI * f_chg / SR)) * 1.8 + white_noise(chg_n, rng) * 0.5) * (np.linspace(0.05, 1.0, chg_n) ** 1.6)
    place(out, pan_mono(fft_band_filter(chg, 300.0, 14000.0), 0.0), 0.0, 0.72)
    t_fire = 0.075
    place(out, pan_mono(electric_arc_burst(0.28, rng, density=1200.0, f_sweep=(9000.0, 1400.0)), 0.0, haas_ms=0.9), t_fire, 0.96)
    place(out, sub_punch_drop(0.55, 165.0, 28.0, rng, drive=3.3), t_fire, 1.02)
    rem = n - int(t_fire * SR)
    for ch, mul in enumerate([1.0, 1.04]):
        src = 0.55 * white_noise(rem, rng) + 0.45 * colored_noise(rem, rng, 0.9)
        rail = swept_filter(src, (4400.0 * mul, 620.0), bw_oct=0.85, mode="bandpass", resonance=2.9, comb_depth=0.62, comb_rate=6.0)
        out[int(t_fire * SR) :, ch] += rail * swell_env(rem, peak_pos=0.08, sharpness=2.1) * 0.88
    return master_sfx(out, peak_target=0.91, drive=1.52, room_mix=0.18)


# ---------- FAMILY 12: SKILL/ULT CAST, VICTORY & 11 CHAMPION DEATHS ----------

def gen_skill_cast(rng: np.random.Generator) -> np.ndarray:
    dur = 0.25
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Crisp energetic air-pressure burst + taut stance/steel focus snap ('WHOOMP-SHHH!', zero chime!)
    snap = fft_band_filter(white_noise(int(0.025 * SR), rng), 900.0, 11000.0) * ad_env(int(0.025 * SR), 0.001, 0.011)
    place(out, pan_mono(snap, 0.0, haas_ms=0.5), 0.0, 0.68)
    place(out, air_whoosh(0.23, 720.0, 2900.0, rng, peak_pos=0.24, bw_oct=0.88, sharpness=2.8, pan_start=-0.32, pan_end=0.32), 0.005, 0.88)
    place(out, sub_punch_drop(0.14, 122.0, 48.0, rng, drive=2.0), 0.0, 0.62)
    return master_sfx(out, peak_target=0.83, drive=1.28, room_mix=0.10)


def gen_ult_cast(rng: np.random.Generator) -> np.ndarray:
    dur = 0.52
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Dramatic anime Overdrive awakening shockwave (deep sub-impact + rushing wind-vortex + aura crackle!)
    place(out, sub_punch_drop(0.38, 150.0, 32.0, rng, drive=3.0), 0.0, 0.96)
    place(out, pan_mono(electric_arc_burst(0.36, rng, density=780.0, f_sweep=(7200.0, 1600.0)), 0.0, haas_ms=0.9), 0.004, 0.78)
    place(out, air_whoosh(0.48, 480.0, 3800.0, rng, peak_pos=0.26, bw_oct=0.95, sharpness=2.3, pan_start=-0.5, pan_end=0.5), 0.008, 0.88)
    return master_sfx(out, peak_target=0.89, drive=1.45, room_mix=0.18)


def gen_victory_fanfare(rng: np.random.Generator) -> np.ndarray:
    dur = 2.10
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Cinematic arena victory impact (ZERO 8-bit beep melody!):
    # Dual colossal taiko war-drum impacts (0.0s, 0.24s) + forged bronze gong/cymbal wash + silk war-banner flourish!
    place(out, sub_punch_drop(0.45, 132.0, 34.0, rng, drive=2.8), 0.0, 0.90)
    place(out, sub_punch_drop(0.85, 146.0, 28.0, rng, drive=3.2), 0.24, 1.02)
    # Forged bronze arena gong + shimmering cymbal wash at 0.24s (strictly inharmonic physical bronze!)
    gong1 = physical_strike(1.75, 420.0, "bronze_bell", decay_s=0.72, rng=rng, hardness=0.85, scrape_ms=12.0)
    gong2 = physical_strike(1.55, 1680.0, "steel_blade", decay_s=0.55, rng=rng, hardness=0.92, scrape_ms=8.0)
    place(out, pan_mono(gong1, -0.22, haas_ms=1.4), 0.24, 0.62)
    place(out, pan_mono(gong2, 0.24, haas_ms=-1.2), 0.245, 0.48)
    # Shimmering cymbal/banner air flourish across stereo
    cym_n = int(1.78 * SR)
    for ch, mul in enumerate([1.0, 1.04]):
        shimmer = swept_filter(white_noise(cym_n, rng), (6800.0 * mul, 2200.0), bw_oct=1.25, mode="bandpass", resonance=2.1, comb_depth=0.35, comb_rate=3.2)
        out[int(0.24 * SR) : int(0.24 * SR) + cym_n, ch] += shimmer * ad_env(cym_n, 0.012, 0.68, power=0.92) * 0.58
    place(out, air_whoosh(0.85, 2400.0, 420.0, rng, peak_pos=0.18, bw_oct=1.1, sharpness=2.0, pan_start=-0.48, pan_end=0.48), 0.01, 0.65)
    return master_sfx(out, peak_target=0.88, drive=1.38, fade_out_ms=65.0, room_mix=0.24)


def _body_collapse_base(dur: float, rng: np.random.Generator, armor_weight: float = 0.7) -> np.ndarray:
    n = int(round(dur * SR))
    out = np.zeros((n, 2), dtype=np.float64)
    # Initial stagger air/cloth rush -> primary body stone thud -> secondary knee/shoulder settle
    place(out, air_whoosh(0.28, 1600.0, 320.0, rng, peak_pos=0.35, bw_oct=1.0, sharpness=2.6), 0.0, 0.48)
    t1 = 0.13
    thud1 = sub_punch_drop(0.24, 96.0 + 35.0 * armor_weight, 38.0, rng, drive=2.2 + 0.7 * armor_weight)
    cloth1 = swept_filter(white_noise(int(0.14 * SR), rng), (1800.0, 360.0), bw_oct=1.2, mode="bandpass", resonance=1.8) * ad_env(int(0.14 * SR), 0.002, 0.055)
    place(out, thud1, t1, 0.75 + 0.2 * armor_weight)
    place(out, pan_mono(cloth1, -0.14), t1, 0.58)
    # Secondary settle at 0.36s
    thud2 = sub_punch_drop(0.16, 85.0, 42.0, rng, drive=1.8)
    place(out, pan_mono(thud2, 0.16), 0.36, 0.44)
    return out


def gen_death_warrior(rng: np.random.Generator) -> np.ndarray:
    out = _body_collapse_base(1.02, rng, armor_weight=0.85)
    # Heavy plate armor crash + greatsword clatter on stone
    plate = physical_strike(0.32, 860.0, "heavy_anvil", decay_s=0.09, rng=rng, hardness=0.82, scrape_ms=9.0)
    sword1 = physical_strike(0.35, 1780.0, "steel_blade", decay_s=0.11, rng=rng, hardness=0.92, scrape_ms=5.0)
    sword2 = physical_strike(0.24, 2120.0, "steel_blade", decay_s=0.065, rng=rng, hardness=0.85, scrape_ms=3.5)
    place(out, pan_mono(plate, -0.15, haas_ms=0.8), 0.135, 0.78)
    place(out, pan_mono(sword1, 0.28, haas_ms=-0.9), 0.46, 0.74)
    place(out, pan_mono(sword2, 0.34), 0.61, 0.46)
    return master_sfx(out, peak_target=0.85, drive=1.35, room_mix=0.16)


def gen_death_titan(rng: np.random.Generator) -> np.ndarray:
    out = _body_collapse_base(1.10, rng, armor_weight=1.0)
    # Colossal juggernaut plate & stone crash + war-maul anvil drop + gravel settle
    crash = physical_strike(0.45, 580.0, "heavy_anvil", decay_s=0.14, rng=rng, hardness=0.88, scrape_ms=12.0)
    maul = physical_strike(0.48, 720.0, "heavy_anvil", decay_s=0.16, rng=rng, hardness=0.94, scrape_ms=8.0)
    gravel = fft_band_filter(velvet_crackle(int(0.55 * SR), rng, 950.0), 900.0, 11000.0) * ad_env(int(0.55 * SR), 0.01, 0.24)
    place(out, pan_mono(crash, -0.12, haas_ms=1.1), 0.13, 0.88)
    place(out, pan_mono(maul, 0.26, haas_ms=-1.0), 0.44, 0.85)
    place(out, sub_punch_drop(0.36, 135.0, 28.0, rng, drive=2.9), 0.44, 0.82)
    place(out, pan_mono(gravel, 0.1), 0.18, 0.48)
    return master_sfx(out, peak_target=0.87, drive=1.42, room_mix=0.18)


def gen_death_ronin(rng: np.random.Generator) -> np.ndarray:
    out = _body_collapse_base(0.98, rng, armor_weight=0.45)
    # Swift cloth fall + katana blade & tsuba clattering across stone + fading wind sigh
    k1 = physical_strike(0.28, 2650.0, "katana_edge", decay_s=0.095, rng=rng, hardness=0.95, scrape_ms=4.0)
    k2 = physical_strike(0.20, 3150.0, "brass_gear", decay_s=0.055, rng=rng, hardness=0.92, scrape_ms=2.5)
    k3 = physical_strike(0.14, 2850.0, "katana_edge", decay_s=0.038, rng=rng, hardness=0.88, scrape_ms=2.0)
    place(out, pan_mono(k1, 0.25, haas_ms=0.7), 0.34, 0.76)
    place(out, pan_mono(k2, 0.32), 0.49, 0.52)
    place(out, pan_mono(k3, 0.36), 0.60, 0.32)
    return master_sfx(out, peak_target=0.84, drive=1.30, room_mix=0.15)


def gen_death_mage(rng: np.random.Generator) -> np.ndarray:
    out = _body_collapse_base(1.02, rng, armor_weight=0.35)
    # Pressurized combustion flame-out rush + cloth thud + wooden/iron staff drop
    place(out, combustion_roar(0.55, rng, f_start=1400.0, f_end=220.0, ember_density=460.0), 0.0, 0.82)
    staff1 = physical_strike(0.22, 460.0, "wood_limb", decay_s=0.055, rng=rng, hardness=0.8, scrape_ms=4.5)
    staff2 = physical_strike(0.18, 1850.0, "iron_chain", decay_s=0.05, rng=rng, hardness=0.85, scrape_ms=3.0)
    place(out, pan_mono(staff1, 0.24), 0.45, 0.68)
    place(out, pan_mono(staff2, 0.28, haas_ms=0.6), 0.46, 0.48)
    return master_sfx(out, peak_target=0.84, drive=1.32, room_mix=0.15)


def gen_death_archer(rng: np.random.Generator) -> np.ndarray:
    out = _body_collapse_base(0.96, rng, armor_weight=0.35)
    # Leather/cloak fall + wooden recurve bow & quiver arrows rattling on stone
    bow = physical_strike(0.22, 380.0, "wood_limb", decay_s=0.055, rng=rng, hardness=0.78, scrape_ms=4.0)
    place(out, pan_mono(bow, -0.24), 0.34, 0.72)
    for dt, f0 in [(0.42, 540.0), (0.48, 620.0), (0.55, 490.0), (0.63, 580.0)]:
        arr = physical_strike(0.12, f0, "wood_limb", decay_s=0.028, rng=rng, hardness=0.82, scrape_ms=2.5)
        place(out, pan_mono(arr, rng.uniform(0.1, 0.42)), dt, 0.46)
    return master_sfx(out, peak_target=0.83, drive=1.28, room_mix=0.14)


def gen_death_priestess(rng: np.random.Generator) -> np.ndarray:
    out = _body_collapse_base(1.02, rng, armor_weight=0.32)
    # Silk vestments collapse + ornate metal scepter clatter + dissipating crystal dust breath (ZERO piano!)
    scepter1 = physical_strike(0.28, 2250.0, "brass_gear", decay_s=0.085, rng=rng, hardness=0.9, scrape_ms=3.5)
    scepter2 = physical_strike(0.18, 2550.0, "brass_gear", decay_s=0.05, rng=rng, hardness=0.85, scrape_ms=2.5)
    place(out, pan_mono(scepter1, 0.26, haas_ms=0.7), 0.40, 0.68)
    place(out, pan_mono(scepter2, 0.32), 0.54, 0.42)
    place(out, crystal_shard_cascade(0.75, rng, count=24, f_min=4200.0, f_max=13800.0, spread_power=1.3), 0.05, 0.56)
    place(out, air_whoosh(0.68, 2200.0, 420.0, rng, peak_pos=0.18, bw_oct=1.0, sharpness=2.1), 0.04, 0.52)
    return master_sfx(out, peak_target=0.83, drive=1.28, room_mix=0.16)


def gen_death_valkyrie(rng: np.random.Generator) -> np.ndarray:
    out = _body_collapse_base(1.04, rng, armor_weight=0.75)
    # Winged plate armor impact + heavy war-lance steel clatter + feathered wing gust settle
    plate = physical_strike(0.28, 1120.0, "heavy_anvil", decay_s=0.085, rng=rng, hardness=0.86, scrape_ms=7.0)
    lance = physical_strike(0.36, 1920.0, "steel_blade", decay_s=0.12, rng=rng, hardness=0.94, scrape_ms=4.5)
    place(out, pan_mono(plate, -0.18, haas_ms=0.8), 0.135, 0.72)
    place(out, pan_mono(lance, 0.30, haas_ms=-0.8), 0.42, 0.78)
    place(out, air_whoosh(0.45, 2400.0, 380.0, rng, peak_pos=0.20, bw_oct=0.95, sharpness=2.4), 0.02, 0.58)
    return master_sfx(out, peak_target=0.85, drive=1.34, room_mix=0.16)


def gen_death_icemage(rng: np.random.Generator) -> np.ndarray:
    out = _body_collapse_base(1.02, rng, armor_weight=0.34)
    # Frost-robe fall + shattering ice-crown/staff crystal shards + freezing wind exhale
    place(out, crystal_shard_cascade(0.78, rng, count=32, f_min=2900.0, f_max=14200.0, spread_power=1.4), 0.16, 0.82)
    place(out, air_whoosh(0.72, 3400.0, 520.0, rng, peak_pos=0.16, bw_oct=0.95, sharpness=2.2), 0.02, 0.65)
    return master_sfx(out, peak_target=0.84, drive=1.30, room_mix=0.16)


def gen_death_reaper(rng: np.random.Generator) -> np.ndarray:
    out = _body_collapse_base(1.05, rng, armor_weight=0.62)
    # Collapsing bone/plate rattle + heavy iron scythe clang + dark mist exhale
    for dt in [0.14, 0.22, 0.31, 0.39]:
        rattle = physical_strike(0.14, rng.uniform(520.0, 1450.0), "iron_chain", decay_s=0.038, rng=rng, hardness=0.85, scrape_ms=3.5)
        place(out, pan_mono(rattle, rng.uniform(-0.35, 0.35)), dt, 0.55)
    scythe = physical_strike(0.42, 1320.0, "steel_blade", decay_s=0.14, rng=rng, hardness=0.94, scrape_ms=6.0)
    place(out, pan_mono(scythe, 0.28, haas_ms=-0.9), 0.45, 0.82)
    place(out, air_whoosh(0.78, 1400.0, 220.0, rng, peak_pos=0.22, bw_oct=1.1, sharpness=2.0), 0.05, 0.58)
    return master_sfx(out, peak_target=0.85, drive=1.34, room_mix=0.17)


def gen_death_chrono(rng: np.random.Generator) -> np.ndarray:
    out = _body_collapse_base(1.05, rng, armor_weight=0.42)
    # Heavy clockwork spring unwind ('WHIRRR-SPANG!') + shattering monocle/watch glass + 2 dying ticks!
    sp = physical_strike(0.34, 1620.0, "brass_gear", decay_s=0.11, rng=rng, hardness=0.95, scrape_ms=6.0)
    place(out, pan_mono(sp, -0.22, haas_ms=0.7), 0.04, 0.78)
    for i in range(7):
        place(out, pan_mono(_watch_tick(rng, heavy=False), -0.3 + 0.08 * i), 0.06 + i * 0.028, 0.52)
    place(out, crystal_shard_cascade(0.48, rng, count=22, f_min=3200.0, f_max=14200.0, spread_power=1.6), 0.25, 0.76)
    place(out, pan_mono(_watch_tick(rng, heavy=True), 0.18), 0.62, 0.56)
    place(out, pan_mono(_watch_tick(rng, heavy=True), 0.22), 0.86, 0.34)
    return master_sfx(out, peak_target=0.84, drive=1.32, room_mix=0.16)


def gen_death_android(rng: np.random.Generator) -> np.ndarray:
    out = _body_collapse_base(1.05, rng, armor_weight=0.82)
    # Cybernetic servo power-down pitch-drop (920Hz -> 42Hz) + electric spark pops + alloy chassis thud!
    t = time_axis(0.72)
    f_srv = 42.0 + 880.0 * np.exp(-np.linspace(0.0, 1.0, len(t)) * 3.8)
    servo = np.tanh(np.sin(np.cumsum(TWO_PI * f_srv / SR)) * 1.9 + 0.4 * np.sin(np.cumsum(TWO_PI * f_srv * 2.41 / SR)))
    servo = fft_band_filter(servo, 45.0, 8500.0) * ad_env(len(t), 0.008, 0.36)
    chassis = physical_strike(0.32, 1080.0, "heavy_anvil", decay_s=0.095, rng=rng, hardness=0.90, scrape_ms=7.0)
    sparks1 = electric_arc_burst(0.18, rng, density=850.0, f_sweep=(6800.0, 1800.0))
    sparks2 = electric_arc_burst(0.14, rng, density=650.0, f_sweep=(5400.0, 1400.0))
    place(out, pan_mono(servo, -0.15, haas_ms=0.8), 0.02, 0.68)
    place(out, pan_mono(sparks1, 0.26), 0.08, 0.74)
    place(out, pan_mono(chassis, -0.12, haas_ms=0.9), 0.14, 0.78)
    place(out, pan_mono(sparks2, -0.28), 0.46, 0.54)
    return master_sfx(out, peak_target=0.86, drive=1.36, room_mix=0.16)


# ==============================================================================
# 5. REGISTRY, WAV WRITER & SPECTRAL QA SUITE
# ==============================================================================

SFX_GENERATORS: Dict[str, Callable[[np.random.Generator], np.ndarray]] = {
    # Tempered Steel & Paladin (9)
    "slash": gen_slash,
    "heavy_cleave": gen_heavy_cleave,
    "blade_wave": gen_blade_wave,
    "clang": gen_clang,
    "parry_clang": gen_parry_clang,
    "reflect": gen_reflect,
    "hit_crit": gen_hit_crit,
    "hurt_hit": gen_hurt_hit,
    "footstep_steel": gen_footstep_steel,
    # Storm Ronin & Mobility (4)
    "raijin_slash": gen_raijin_slash,
    "dash_whoosh": gen_dash_whoosh,
    "storm_leap": gen_storm_leap,
    "blink": gen_blink,
    # Bow & Tempest Wind (5)
    "arrow_shoot": gen_arrow_shoot,
    "arrow_hit": gen_arrow_hit,
    "arrow_rain": gen_arrow_rain,
    "zephyr_flip": gen_zephyr_flip,
    "archer_ult": gen_archer_ult,
    # Pyromancy & Astral Meteor (8)
    "fireball": gen_fireball,
    "fire_hit": gen_fire_hit,
    "flame_pillar": gen_flame_pillar,
    "eclipse_charge": gen_eclipse_charge,
    "solar_beam": gen_solar_beam,
    "meteor": gen_meteor,
    "meteor_impact": gen_meteor_impact,
    "supernova_detonate": gen_supernova_detonate,
    # Radiant Light / Seraphina (7)
    "holy_bolt": gen_holy_bolt,
    "holy_hit": gen_holy_hit,
    "holy_heal": gen_holy_heal,
    "holy_smite": gen_holy_smite,
    "final_grace_charge": gen_final_grace_charge,
    "final_grace_beam": gen_final_grace_beam,
    "priestess_ult": gen_priestess_ult,
    # Valkyrie (2)
    "holy_spear": gen_holy_spear,
    "dragon_dive": gen_dragon_dive,
    # Cryomancy / Lyra (3)
    "frost_cast": gen_frost_cast,
    "ice_shatter": gen_ice_shatter,
    "prism_beam": gen_prism_beam,
    # Abyssal Reaper (4)
    "scythe_reap": gen_scythe_reap,
    "chain_hook": gen_chain_hook,
    "soul_drain": gen_soul_drain,
    "reaper_ult": gen_reaper_ult,
    # Chronos / Horology (7)
    "clock_gear": gen_clock_gear,
    "chrono_hit": gen_chrono_hit,
    "hourglass_trap": gen_hourglass_trap,
    "time_rewind": gen_time_rewind,
    "chrono_ult": gen_chrono_ult,
    "time_stop": gen_time_stop,
    "time_shatter": gen_time_shatter,
    # Titan World-Forge (3)
    "thunder_slam": gen_thunder_slam,
    "earthshatter": gen_earthshatter,
    "whirlwind": gen_whirlwind,
    # Cyber Android VEX-09 (3)
    "cyber_slash": gen_cyber_slash,
    "emp_blast": gen_emp_blast,
    "cyber_beam": gen_cyber_beam,
    # Universal Cast, Victory & Champion Deaths (14)
    "skill_cast": gen_skill_cast,
    "ult_cast": gen_ult_cast,
    "victory_fanfare": gen_victory_fanfare,
    "death_warrior": gen_death_warrior,
    "death_titan": gen_death_titan,
    "death_ronin": gen_death_ronin,
    "death_mage": gen_death_mage,
    "death_archer": gen_death_archer,
    "death_priestess": gen_death_priestess,
    "death_valkyrie": gen_death_valkyrie,
    "death_icemage": gen_death_icemage,
    "death_reaper": gen_death_reaper,
    "death_chrono": gen_death_chrono,
    "death_android": gen_death_android,
}


def write_stereo_wav(path: Path, stereo: np.ndarray) -> None:
    assert stereo.ndim == 2 and stereo.shape[1] == 2, f"Expected stereo array for {path}"
    assert np.all(np.isfinite(stereo)), f"Non-finite samples in {path}"
    pcm = np.clip(np.round(stereo * 32767.0), -32767, 32767).astype("<i2")
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(pcm.tobytes())


def analyze_wav(stereo: np.ndarray) -> Dict[str, float]:
    mono = 0.5 * (stereo[:, 0] + stereo[:, 1])
    mag = np.abs(np.fft.rfft(mono)) + 1e-12
    freqs = np.fft.rfftfreq(len(mono), d=1.0 / SR)
    band = (freqs >= 80.0) & (freqs <= 14000.0)
    flat_full = float(np.exp(np.mean(np.log(mag))) / np.mean(mag))
    flat_band = float(np.exp(np.mean(np.log(mag[band]))) / np.mean(mag[band]))
    peak = float(np.max(np.abs(stereo)))
    dc = float(np.max(np.abs(np.mean(stereo, axis=0))))
    stereo_width = float(np.std(stereo[:, 0] - stereo[:, 1]) / (np.std(mono) + 1e-9))
    clipped = int(np.sum(np.abs(stereo) >= 0.995))
    return {
        "dur": len(stereo) / SR,
        "peak": peak,
        "dc": dc,
        "flat_full": flat_full,
        "flat_band": flat_band,
        "stereo_w": stereo_width,
        "clipped": clipped,
    }


def main() -> None:
    repo_root = Path(__file__).resolve().parent.parent
    out_dir = repo_root / "assets" / "sfx"
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"Synthesizing {len(SFX_GENERATORS)} studio physical-foley WAVs -> {out_dir}")
    min_flat = 1.0
    min_flat_key = ""

    for key, gen_fn in sorted(SFX_GENERATORS.items()):
        rng = make_rng(key)
        stereo = gen_fn(rng)
        wav_path = out_dir / f"{key}.wav"
        write_stereo_wav(wav_path, stereo)
        m = analyze_wav(stereo)
        if m["flat_band"] < min_flat:
            min_flat = m["flat_band"]
            min_flat_key = key
        assert m["clipped"] == 0, f"Clipping detected in {key}"
        assert m["flat_full"] > 0.015 and m["flat_band"] > 0.04, (
            f"Low spectral flatness in {key}: full={m['flat_full']:.5f}, band={m['flat_band']:.5f}"
        )
        print(
            f"  [OK] {key:22s} | {m['dur']:4.2f}s | peak={m['peak']:.3f} | "
            f"flat(80-14k)={m['flat_band']:.4f} | flat(full)={m['flat_full']:.4f} | width={m['stereo_w']:.2f}"
        )

    print(
        f"\nCompleted {len(SFX_GENERATORS)} WAVs successfully! "
        f"Minimum 80Hz-14kHz spectral flatness: {min_flat:.4f} ({min_flat_key})."
    )


if __name__ == "__main__":
    main()
