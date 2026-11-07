#!/usr/bin/env python3
"""
Studio-Grade Physical & Acoustic Foley SFX Generator for Arcane vs. Steel.
Generates 31 stereo 44.1kHz 16-bit WAV files in assets/sfx/ using:
- Karplus-Strong physical plucked bowstring modeling
- 10-mode inharmonic forged steel & crystal resonator banks
- Multi-band aerodynamic whip/whoosh formant filtering
- Crackling furnace & plasma combustion turbulence
- Staggered stone/crystal shatter foley
- Warm orchestral brass/string/chime harmonic ensembles
- 58Hz Butterworth high-pass filter & 10.5kHz warm air roll-off (zero sub-bass mud or harsh aliasing)
"""

import os
import math
import wave
import numpy as np

SR = 44100


def biquad_filter(x, btype, freq, q=0.707, sr=SR):
    """Apply a 2nd-order digital biquad filter (lowpass, highpass, bandpass) to 1D numpy array."""
    freq = max(20.0, min(sr * 0.45, float(freq)))
    q = max(0.15, float(q))
    w0 = 2.0 * math.pi * freq / sr
    cos_w0 = math.cos(w0)
    sin_w0 = math.sin(w0)
    alpha = sin_w0 / (2.0 * q)

    if btype == "lowpass":
        b0 = (1.0 - cos_w0) * 0.5
        b1 = 1.0 - cos_w0
        b2 = (1.0 - cos_w0) * 0.5
        a0 = 1.0 + alpha
        a1 = -2.0 * cos_w0
        a2 = 1.0 - alpha
    elif btype == "highpass":
        b0 = (1.0 + cos_w0) * 0.5
        b1 = -(1.0 + cos_w0)
        b2 = (1.0 + cos_w0) * 0.5
        a0 = 1.0 + alpha
        a1 = -2.0 * cos_w0
        a2 = 1.0 - alpha
    elif btype == "bandpass":
        b0 = alpha
        b1 = 0.0
        b2 = -alpha
        a0 = 1.0 + alpha
        a1 = -2.0 * cos_w0
        a2 = 1.0 - alpha
    else:
        return x.copy()

    b0 /= a0
    b1 /= a0
    b2 /= a0
    a1 /= a0
    a2 /= a0

    y = np.zeros_like(x, dtype=np.float64)
    x1 = x2 = y1 = y2 = 0.0
    for i in range(len(x)):
        xi = float(x[i])
        yi = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        x2 = x1
        x1 = xi
        y2 = y1
        y1 = yi
        y[i] = yi
    return y


def swept_bandpass(x, f_curve, q=1.8, sr=SR):
    """Time-varying state-variable Chamberlin filter (bandpass + lowpass) for smooth aerodynamic whooshes."""
    y_bp = np.zeros_like(x, dtype=np.float64)
    low = 0.0
    band = 0.0
    damp = 1.0 / max(0.4, q)
    for i in range(len(x)):
        fc = max(35.0, min(sr * 0.38, float(f_curve[i])))
        f = 2.0 * math.sin(math.pi * fc / sr)
        low = low + f * band
        high = float(x[i]) - low - damp * band
        band = f * high + band
        y_bp[i] = band
    return y_bp


def swept_lowpass(x, f_curve, q=1.1, sr=SR):
    """Time-varying Chamberlin lowpass filter."""
    y_lp = np.zeros_like(x, dtype=np.float64)
    low = 0.0
    band = 0.0
    damp = 1.0 / max(0.4, q)
    for i in range(len(x)):
        fc = max(35.0, min(sr * 0.38, float(f_curve[i])))
        f = 2.0 * math.sin(math.pi * fc / sr)
        low = low + f * band
        high = float(x[i]) - low - damp * band
        band = f * high + band
        y_lp[i] = low
    return y_lp


def pink_noise(n, rng):
    """Generate smooth 1/f pink noise via spectral shaping."""
    freqs = np.fft.rfftfreq(n, 1.0 / SR)
    scale = 1.0 / np.maximum(freqs, 25.0) ** 0.55
    scale[0] = 0.0
    phases = rng.uniform(0, 2.0 * np.pi, len(freqs))
    mags = rng.rayleigh(1.0, len(freqs)) * scale
    spec = mags * (np.cos(phases) + 1j * np.sin(phases))
    y = np.fft.irfft(spec, n=n)
    mx = np.max(np.abs(y)) + 1e-9
    return y / mx


def env_ad(n, attack_s, decay_s, curve=1.8):
    """Smooth attack + exponential decay envelope."""
    t = np.arange(n, dtype=np.float64) / SR
    att = np.minimum(1.0, t / max(0.0005, attack_s))
    att = 0.5 - 0.5 * np.cos(np.pi * att)  # Half-cosine clickless attack
    dec = np.exp(-np.maximum(0.0, t - attack_s) / max(0.005, decay_s)) ** curve
    return att * dec


def modal_steel_bank(n, f0, ratios, amps, decays, rng, stereo_detune=0.003):
    """
    Physical modal synthesis of forged steel / crystal / bell resonance.
    Returns (left, right) stereo tuple with natural frequency-dependent damping.
    """
    t = np.arange(n, dtype=np.float64) / SR
    left = np.zeros(n, dtype=np.float64)
    right = np.zeros(n, dtype=np.float64)
    att = np.minimum(1.0, t / 0.0018)
    for r, a, d in zip(ratios, amps, decays):
        freq_l = f0 * r * (1.0 - stereo_detune * 0.5 + rng.uniform(-0.001, 0.001))
        freq_r = f0 * r * (1.0 + stereo_detune * 0.5 + rng.uniform(-0.001, 0.001))
        if freq_l > 11000:
            continue
        ph_l = rng.uniform(0, 2 * np.pi)
        ph_r = ph_l + rng.uniform(-0.35, 0.35)
        # Subtle initial pitch bend from strike tension
        bend = 1.0 + 0.012 * np.exp(-t / 0.015)
        env = att * np.exp(-t / max(0.008, d))
        left += a * env * np.sin(2.0 * np.pi * freq_l * bend * t + ph_l)
        right += a * env * np.sin(2.0 * np.pi * freq_r * bend * t + ph_r)
    return left, right


def karplus_strong_pluck(n, freq, decay=0.992, brightness=0.55, rng=None):
    """Physical Karplus-Strong plucked bowstring / harp string model."""
    if rng is None:
        rng = np.random.default_rng(42)
    period = max(4, int(round(SR / freq)))
    # Initial excitation: bandlimited pink/triangle pluck burst
    burst = rng.uniform(-1.0, 1.0, period)
    burst = np.convolve(burst, [0.25, 0.5, 0.25], mode="same")
    y = np.zeros(n, dtype=np.float64)
    y[: min(n, period)] = burst[: min(n, period)]
    for i in range(period, n):
        prev = y[i - period]
        prev2 = y[i - period - 1] if i - period - 1 >= 0 else prev
        y[i] = decay * (brightness * prev + (1.0 - brightness) * prev2)
    return y


def add_velvet_reverb(left, right, wet=0.16, rt60=0.55, rng=None):
    """
    Smooth, non-metallic stereo velvet-noise diffusion tail (zero comb filtering!).
    """
    if wet <= 0.001:
        return left, right
    if rng is None:
        rng = np.random.default_rng(99)
    n = len(left)
    tail_len = min(int(SR * rt60), n)
    # Sparse velvet taps with exponentially decaying warm envelope
    num_taps = 42
    tap_times = np.sort(rng.uniform(0.012, rt60, num_taps))
    rev_l = np.zeros(n, dtype=np.float64)
    rev_r = np.zeros(n, dtype=np.float64)
    mono_src = biquad_filter((left + right) * 0.5, "lowpass", 2400.0, q=0.7)
    for idx, dt_s in enumerate(tap_times):
        shift = int(dt_s * SR)
        if shift >= n:
            continue
        gain = (1.0 - dt_s / rt60) ** 2.2 * (1.0 if idx % 2 == 0 else -0.88) / math.sqrt(num_taps)
        pan_l = 0.5 + 0.45 * math.sin(idx * 1.7)
        pan_r = 1.0 - pan_l
        rev_l[shift:] += mono_src[: n - shift] * gain * pan_l
        rev_r[shift:] += mono_src[: n - shift] * gain * pan_r
    rev_l = biquad_filter(rev_l, "lowpass", 2800.0, q=0.7)
    rev_r = biquad_filter(rev_r, "lowpass", 2800.0, q=0.7)
    return left + rev_l * wet, right + rev_r * wet


def master_and_save(filepath, left, right, target_peak=0.82, hpf_hz=62.0, lpf_hz=9800.0, fade_out_s=0.045):
    """
    Studio mastering chain:
    1. 62Hz High-pass filter (removes all sub-bass rumble/DC offset)
    2. 9.8kHz Warm Low-pass filter (removes harsh digital fizz)
    3. Gentle tape soft-saturation
    4. Clickless fade-in (2ms) and fade-out
    5. Peak normalization to target_peak
    """
    n = len(left)
    left = biquad_filter(left, "highpass", hpf_hz, q=0.707)
    right = biquad_filter(right, "highpass", hpf_hz, q=0.707)
    left = biquad_filter(left, "lowpass", lpf_hz, q=0.707)
    right = biquad_filter(right, "lowpass", lpf_hz, q=0.707)

    # Normalize pre-saturation
    pk = max(np.max(np.abs(left)), np.max(np.abs(right)), 1e-8)
    left = left / pk
    right = right / pk

    # Warm analog soft-knee saturation
    left = np.tanh(left * 1.25) / math.tanh(1.25)
    right = np.tanh(right * 1.25) / math.tanh(1.25)

    # Fade-in and fade-out
    fi = min(int(0.0025 * SR), n // 4)
    fo = min(int(fade_out_s * SR), n // 3)
    if fi > 0:
        ramp_in = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, fi))
        left[:fi] *= ramp_in
        right[:fi] *= ramp_in
    if fo > 0:
        ramp_out = 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, fo))
        left[-fo:] *= ramp_out
        right[-fo:] *= ramp_out

    pk2 = max(np.max(np.abs(left)), np.max(np.abs(right)), 1e-8)
    left = (left / pk2) * target_peak
    right = (right / pk2) * target_peak

    stereo = np.empty((n, 2), dtype=np.int16)
    stereo[:, 0] = np.clip(left * 32767.0, -32767, 32767).astype(np.int16)
    stereo[:, 1] = np.clip(right * 32767.0, -32767, 32767).astype(np.int16)

    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with wave.open(filepath, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(stereo.tobytes())


def warm_chord_note(n, freq, attack_s, decay_s, brightness=1.0, vibrato_hz=5.0, vibrato_depth=0.003):
    """Warm acoustic horn/string/choir voice with natural harmonic roll-off (no harsh buzz)."""
    t = np.arange(n, dtype=np.float64) / SR
    env = env_ad(n, attack_s, decay_s, curve=1.35)
    vib = 1.0 + vibrato_depth * np.sin(2.0 * np.pi * vibrato_hz * t) * np.minimum(1.0, t / 0.18)
    phase = 2.0 * np.pi * freq * np.cumsum(vib) / SR
    sig = np.zeros(n, dtype=np.float64)
    # 7 natural harmonics with warm 1/k^1.75 acoustic rolloff
    for k in range(1, 8):
        if freq * k > 7500:
            break
        amp = (1.0 / (k ** (1.75 / max(0.5, brightness))))
        sig += amp * np.sin(k * phase + k * 0.4)
    return sig * env


def generate_all_sfx(out_dir="assets/sfx"):
    rng = np.random.default_rng(20261107)

    # 1. SLASH: Crisp aerodynamic greatsword air-whip + subtle singing steel edge
    n = int(0.32 * SR)
    t = np.arange(n) / SR
    whip_env = (t / 0.055) ** 1.6 * np.exp(-(t / 0.068))
    whip_env /= np.max(whip_env) + 1e-9
    f_curve = 340.0 + 1380.0 * whip_env
    air_l = swept_bandpass(pink_noise(n, rng), f_curve, q=1.5) * whip_env
    air_r = swept_bandpass(pink_noise(n, rng), f_curve * 1.04, q=1.5) * whip_env
    # Subtle low-mid cloth/leather movement body
    body = swept_lowpass(pink_noise(n, rng), 260.0 + 320.0 * whip_env, q=0.9) * whip_env * 0.45
    # Subtle steel blade singing edge
    st_l, st_r = modal_steel_bank(
        n, 920.0, [1.0, 1.58, 2.34, 3.18], [0.16, 0.11, 0.07, 0.04], [0.09, 0.07, 0.05, 0.04], rng
    )
    l, r = air_l + body + st_l, air_r + body + st_r
    l, r = add_velvet_reverb(l, r, wet=0.12, rt60=0.28, rng=rng)
    master_and_save(f"{out_dir}/slash.wav", l, r, target_peak=0.76, hpf_hz=75.0)

    # 2. HEAVY_CLEAVE: Deep weighty broadsword cleave + resonant frost-steel impact
    n = int(0.42 * SR)
    t = np.arange(n) / SR
    whip_env = (t / 0.065) ** 1.5 * np.exp(-(t / 0.085))
    whip_env /= np.max(whip_env) + 1e-9
    air_l = swept_bandpass(pink_noise(n, rng), 260.0 + 1150.0 * whip_env, q=1.3) * whip_env
    air_r = swept_bandpass(pink_noise(n, rng), 280.0 + 1180.0 * whip_env, q=1.3) * whip_env
    punch = np.sin(2.0 * np.pi * (145.0 * np.exp(-t / 0.09) + 62.0) * t) * env_ad(n, 0.003, 0.12) * 0.65
    st_l, st_r = modal_steel_bank(
        n, 640.0, [1.0, 1.46, 2.08, 2.82, 3.65], [0.28, 0.22, 0.15, 0.09, 0.05], [0.16, 0.13, 0.10, 0.08, 0.06], rng
    )
    l, r = air_l * 0.8 + punch + st_l, air_r * 0.8 + punch + st_r
    l, r = add_velvet_reverb(l, r, wet=0.16, rt60=0.36, rng=rng)
    master_and_save(f"{out_dir}/heavy_cleave.wav", l, r, target_peak=0.82, hpf_hz=62.0)

    # 3. BLADE_WAVE: Glacial crescent sword-wave (crystalline wind rush + harmonic ice chime)
    n = int(0.46 * SR)
    t = np.arange(n) / SR
    env_w = env_ad(n, 0.025, 0.18)
    f_curve = 520.0 + 1650.0 * np.exp(-t / 0.19)
    wind_l = swept_bandpass(pink_noise(n, rng), f_curve, q=2.1) * env_w
    wind_r = swept_bandpass(pink_noise(n, rng), f_curve * 1.05, q=2.1) * env_w
    ch_l, ch_r = modal_steel_bank(
        n, 1046.5, [1.0, 1.5, 2.0, 2.66, 3.5], [0.26, 0.20, 0.15, 0.10, 0.06], [0.22, 0.18, 0.15, 0.12, 0.09], rng
    )
    l, r = wind_l * 0.85 + ch_l, wind_r * 0.85 + ch_r
    l, r = add_velvet_reverb(l, r, wet=0.22, rt60=0.42, rng=rng)
    master_and_save(f"{out_dir}/blade_wave.wav", l, r, target_peak=0.78, hpf_hz=80.0)

    # 4. CLANG: Authentic forged steel-on-armor strike (leather/plate thud + 8-mode steel ring)
    n = int(0.38 * SR)
    t = np.arange(n) / SR
    thud = np.sin(2.0 * np.pi * (155.0 * np.exp(-t / 0.045) + 68.0) * t) * env_ad(n, 0.0015, 0.065) * 0.65
    snap = biquad_filter(pink_noise(n, rng), "bandpass", 1150.0, q=1.4) * env_ad(n, 0.001, 0.022) * 0.55
    st_l, st_r = modal_steel_bank(
        n,
        585.0,
        [1.0, 1.38, 1.87, 2.41, 3.05, 3.82, 4.65],
        [0.34, 0.28, 0.22, 0.16, 0.11, 0.07, 0.04],
        [0.18, 0.15, 0.12, 0.09, 0.07, 0.05, 0.04],
        rng,
    )
    l, r = thud + snap + st_l, thud + snap + st_r
    l, r = add_velvet_reverb(l, r, wet=0.15, rt60=0.32, rng=rng)
    master_and_save(f"{out_dir}/clang.wav", l, r, target_peak=0.80, hpf_hz=68.0)

    # 5. HIT_CRIT: Devastating critical armor-breaker (chest punch + twin harmonic anvil chord + crisp spark)
    n = int(0.52 * SR)
    t = np.arange(n) / SR
    punch = np.sin(2.0 * np.pi * (165.0 * np.exp(-t / 0.065) + 58.0) * t) * env_ad(n, 0.0015, 0.13) * 0.78
    crack = biquad_filter(pink_noise(n, rng), "bandpass", 1650.0, q=1.2) * env_ad(n, 0.001, 0.045) * 0.65
    st1_l, st1_r = modal_steel_bank(
        n,
        740.0,
        [1.0, 1.498, 2.0, 2.68, 3.42, 4.25],
        [0.36, 0.28, 0.24, 0.16, 0.10, 0.06],
        [0.26, 0.22, 0.18, 0.14, 0.10, 0.07],
        rng,
    )
    l, r = punch + crack + st1_l, punch + crack + st1_r
    l, r = add_velvet_reverb(l, r, wet=0.20, rt60=0.45, rng=rng)
    master_and_save(f"{out_dir}/hit_crit.wav", l, r, target_peak=0.85, hpf_hz=60.0)

    # 6. HURT_HIT: Subtle leather/cloth body stagger thud (non-intrusive, zero harshness)
    n = int(0.18 * SR)
    t = np.arange(n) / SR
    thud = np.sin(2.0 * np.pi * (128.0 * np.exp(-t / 0.04) + 64.0) * t) * env_ad(n, 0.002, 0.055) * 0.7
    cloth = biquad_filter(pink_noise(n, rng), "bandpass", 520.0, q=1.1) * env_ad(n, 0.002, 0.038) * 0.45
    l, r = thud + cloth * 0.95, thud + cloth * 1.05
    master_and_save(f"{out_dir}/hurt_hit.wav", l, r, target_peak=0.62, hpf_hz=68.0)

    # 7. FOOTSTEP_STEEL: Subtle armored greave stone step + light chainmail chink
    n = int(0.16 * SR)
    t = np.arange(n) / SR
    step = np.sin(2.0 * np.pi * (145.0 * np.exp(-t / 0.025) + 75.0) * t) * env_ad(n, 0.002, 0.035) * 0.6
    grit = biquad_filter(pink_noise(n, rng), "bandpass", 920.0, q=1.4) * env_ad(n, 0.002, 0.028) * 0.45
    ch_l, ch_r = modal_steel_bank(n, 1420.0, [1.0, 1.44, 2.1], [0.12, 0.08, 0.05], [0.035, 0.028, 0.02], rng)
    l, r = step + grit + ch_l, step + grit + ch_r
    master_and_save(f"{out_dir}/footstep_steel.wav", l, r, target_peak=0.48, hpf_hz=85.0)

    # 8. WHIRLWIND: 4 rhythmic cyclone greatsword air-cleaves
    n = int(0.76 * SR)
    l = np.zeros(n, dtype=np.float64)
    r = np.zeros(n, dtype=np.float64)
    for idx, offset_s in enumerate([0.0, 0.16, 0.32, 0.48]):
        i0 = int(offset_s * SR)
        seg_n = min(int(0.24 * SR), n - i0)
        ts = np.arange(seg_n) / SR
        w_env = (ts / 0.045) ** 1.5 * np.exp(-(ts / 0.058))
        w_env /= np.max(w_env) + 1e-9
        fc = (380.0 + idx * 55.0) + 1250.0 * w_env
        sw_l = swept_bandpass(pink_noise(seg_n, rng), fc, q=1.6) * w_env
        sw_r = swept_bandpass(pink_noise(seg_n, rng), fc * 1.05, q=1.6) * w_env
        ms_l, ms_r = modal_steel_bank(seg_n, 780.0 + idx * 60.0, [1.0, 1.52, 2.18], [0.14, 0.09, 0.05], [0.07, 0.05, 0.04], rng)
        l[i0 : i0 + seg_n] += sw_l + ms_l
        r[i0 : i0 + seg_n] += sw_r + ms_r
    l, r = add_velvet_reverb(l, r, wet=0.16, rt60=0.35, rng=rng)
    master_and_save(f"{out_dir}/whirlwind.wav", l, r, target_peak=0.76, hpf_hz=72.0)

    # 9. STORM_LEAP: Armored tempest rush + rising wind vortex + runic chime
    n = int(0.52 * SR)
    t = np.arange(n) / SR
    rush_env = env_ad(n, 0.05, 0.22)
    f_curve = 280.0 + 1350.0 * np.sin(np.minimum(1.0, t / 0.38) * np.pi)
    w_l = swept_bandpass(pink_noise(n, rng), f_curve, q=1.7) * rush_env
    w_r = swept_bandpass(pink_noise(n, rng), f_curve * 1.06, q=1.7) * rush_env
    ch_l, ch_r = modal_steel_bank(n, 587.33, [1.0, 1.5, 2.0, 3.0], [0.22, 0.16, 0.12, 0.07], [0.22, 0.18, 0.14, 0.10], rng)
    l, r = w_l + ch_l, w_r + ch_r
    l, r = add_velvet_reverb(l, r, wet=0.18, rt60=0.38, rng=rng)
    master_and_save(f"{out_dir}/storm_leap.wav", l, r, target_peak=0.78, hpf_hz=70.0)

    # 10. THUNDER_SLAM: Greatsword lightning slam + crystalline frost spire shatter
    n = int(0.75 * SR)
    t = np.arange(n) / SR
    sub = np.sin(2.0 * np.pi * (135.0 * np.exp(-t / 0.08) + 54.0) * t) * env_ad(n, 0.002, 0.22) * 0.82
    thunder = swept_lowpass(pink_noise(n, rng), 320.0 + 2800.0 * np.exp(-t / 0.14), q=1.2) * env_ad(n, 0.003, 0.28) * 0.75
    cryst_l, cryst_r = modal_steel_bank(
        n, 880.0, [1.0, 1.414, 1.88, 2.52, 3.31], [0.26, 0.20, 0.15, 0.11, 0.07], [0.28, 0.22, 0.18, 0.14, 0.10], rng
    )
    l, r = sub + thunder + cryst_l, sub + thunder * 0.96 + cryst_r
    l, r = add_velvet_reverb(l, r, wet=0.24, rt60=0.52, rng=rng)
    master_and_save(f"{out_dir}/thunder_slam.wav", l, r, target_peak=0.85, hpf_hz=58.0)

    # 11. EARTHSHATTER: Colossal ancestral runeblade judgment impact + glacial spire cascade
    n = int(1.15 * SR)
    t = np.arange(n) / SR
    sub = np.sin(2.0 * np.pi * (128.0 * np.exp(-t / 0.11) + 52.0) * t) * env_ad(n, 0.003, 0.35) * 0.85
    rumble = swept_lowpass(pink_noise(n, rng), 240.0 + 2400.0 * np.exp(-t / 0.22), q=1.1) * env_ad(n, 0.005, 0.48) * 0.75
    cryst_l = np.zeros(n, dtype=np.float64)
    cryst_r = np.zeros(n, dtype=np.float64)
    # 5 cascading glacial crystal spire chimes
    for idx, (dt_s, note_f) in enumerate([(0.0, 587.33), (0.09, 739.99), (0.18, 880.0), (0.27, 1174.66), (0.36, 1479.98)]):
        i0 = int(dt_s * SR)
        seg = n - i0
        cl, cr = modal_steel_bank(seg, note_f, [1.0, 1.5, 2.12, 2.88], [0.22, 0.15, 0.10, 0.06], [0.32, 0.24, 0.18, 0.12], rng)
        cryst_l[i0:] += cl
        cryst_r[i0:] += cr
    l, r = sub + rumble + cryst_l, sub + rumble * 0.95 + cryst_r
    l, r = add_velvet_reverb(l, r, wet=0.28, rt60=0.65, rng=rng)
    master_and_save(f"{out_dir}/earthshatter.wav", l, r, target_peak=0.86, hpf_hz=56.0)

    # 12. REFLECT: Crisp Aegis spell/arrow parry chime
    n = int(0.42 * SR)
    t = np.arange(n) / SR
    ping_l, ping_r = modal_steel_bank(
        n, 1174.66, [1.0, 1.498, 2.0, 2.667, 3.5], [0.35, 0.26, 0.18, 0.12, 0.07], [0.26, 0.22, 0.18, 0.14, 0.10], rng
    )
    snap = biquad_filter(pink_noise(n, rng), "bandpass", 2200.0, q=2.0) * env_ad(n, 0.001, 0.025) * 0.4
    l, r = ping_l + snap, ping_r + snap
    l, r = add_velvet_reverb(l, r, wet=0.22, rt60=0.38, rng=rng)
    master_and_save(f"{out_dir}/reflect.wav", l, r, target_peak=0.78, hpf_hz=90.0)

    # 13. ARROW_SHOOT: Physical Karplus-Strong recurve bowstring pluck + feathered arrow air-whisk
    n = int(0.32 * SR)
    t = np.arange(n) / SR
    string_l = karplus_strong_pluck(n, 142.0, decay=0.988, brightness=0.52, rng=rng) * env_ad(n, 0.001, 0.15) * 0.85
    string_r = karplus_strong_pluck(n, 144.0, decay=0.988, brightness=0.52, rng=rng) * env_ad(n, 0.001, 0.15) * 0.85
    # Wooden recurve bow limb resonance (245Hz + 460Hz warm yew body)
    wood = (
        np.sin(2.0 * np.pi * 245.0 * t) * env_ad(n, 0.001, 0.038) * 0.52
        + np.sin(2.0 * np.pi * 460.0 * t) * env_ad(n, 0.001, 0.026) * 0.35
    )
    # Feathered fletching aerodynamic zip (warm mid-air whoosh)
    whisk_env = (t / 0.032) ** 1.4 * np.exp(-(t / 0.048))
    whisk_env /= np.max(whisk_env) + 1e-9
    whisk_l = swept_bandpass(pink_noise(n, rng), 580.0 + 1150.0 * whisk_env, q=1.7) * whisk_env * 0.55
    whisk_r = swept_bandpass(pink_noise(n, rng), 610.0 + 1200.0 * whisk_env, q=1.7) * whisk_env * 0.55
    l, r = string_l + wood + whisk_l, string_r + wood + whisk_r
    l, r = add_velvet_reverb(l, r, wet=0.12, rt60=0.25, rng=rng)
    master_and_save(f"{out_dir}/arrow_shoot.wav", l, r, target_peak=0.76, hpf_hz=80.0)

    # 14. ARROW_HIT: Crisp bodkin arrow impact into armor/leather (wood shaft snap + tight thud)
    n = int(0.24 * SR)
    t = np.arange(n) / SR
    thump = np.sin(2.0 * np.pi * (175.0 * np.exp(-t / 0.03) + 78.0) * t) * env_ad(n, 0.001, 0.048) * 0.65
    wood_snap = biquad_filter(pink_noise(n, rng), "bandpass", 1180.0, q=1.5) * env_ad(n, 0.001, 0.028) * 0.72
    tip_l, tip_r = modal_steel_bank(n, 880.0, [1.0, 1.54, 2.25], [0.24, 0.16, 0.09], [0.075, 0.055, 0.04], rng)
    l, r = thump + wood_snap + tip_l, thump + wood_snap + tip_r
    l, r = add_velvet_reverb(l, r, wet=0.12, rt60=0.24, rng=rng)
    master_and_save(f"{out_dir}/arrow_hit.wav", l, r, target_peak=0.76, hpf_hz=75.0)

    # 15. ARROW_RAIN: Rapid cascade of plucked bowstrings & descending starfall arrows
    n = int(0.88 * SR)
    l = np.zeros(n, dtype=np.float64)
    r = np.zeros(n, dtype=np.float64)
    for idx in range(7):
        i0 = int(idx * 0.082 * SR)
        seg = min(int(0.24 * SR), n - i0)
        ts = np.arange(seg) / SR
        pl = karplus_strong_pluck(seg, 165.0 + idx * 18.0, decay=0.988, brightness=0.54, rng=rng) * env_ad(seg, 0.001, 0.13) * 0.62
        w_env = (ts / 0.028) ** 1.3 * np.exp(-(ts / 0.045))
        w_env /= np.max(w_env) + 1e-9
        wh = swept_bandpass(pink_noise(seg, rng), 680.0 + idx * 65.0 + 1100.0 * w_env, q=1.8) * w_env * 0.48
        pan = 0.25 + 0.5 * (idx / 6.0)
        l[i0 : i0 + seg] += (pl + wh) * (1.0 - pan * 0.5)
        r[i0 : i0 + seg] += (pl + wh) * (0.5 + pan * 0.5)
    l, r = add_velvet_reverb(l, r, wet=0.18, rt60=0.38, rng=rng)
    master_and_save(f"{out_dir}/arrow_rain.wav", l, r, target_peak=0.78, hpf_hz=80.0)

    # 16. ZEPHYR_FLIP: Acrobatic wind-vault gust + emerald sylph harp glissando
    n = int(0.42 * SR)
    t = np.arange(n) / SR
    gust_env = env_ad(n, 0.03, 0.16)
    gust_l = swept_bandpass(pink_noise(n, rng), 380.0 + 1150.0 * np.sin(np.minimum(1.0, t / 0.32) * np.pi), q=1.7) * gust_env * 0.72
    gust_r = swept_bandpass(pink_noise(n, rng), 410.0 + 1200.0 * np.sin(np.minimum(1.0, t / 0.32) * np.pi), q=1.7) * gust_env * 0.72
    harp_l = np.zeros(n, dtype=np.float64)
    harp_r = np.zeros(n, dtype=np.float64)
    for idx, f_note in enumerate([440.0, 587.33, 739.99, 880.0]):
        i0 = int(idx * 0.038 * SR)
        seg = n - i0
        pl = karplus_strong_pluck(seg, f_note, decay=0.992, brightness=0.58, rng=rng) * env_ad(seg, 0.001, 0.18) * 0.36
        harp_l[i0:] += pl * (0.7 if idx % 2 == 0 else 0.4)
        harp_r[i0:] += pl * (0.4 if idx % 2 == 0 else 0.7)
    l, r = gust_l + harp_l, gust_r + harp_r
    l, r = add_velvet_reverb(l, r, wet=0.20, rt60=0.38, rng=rng)
    master_and_save(f"{out_dir}/zephyr_flip.wav", l, r, target_peak=0.75, hpf_hz=85.0)

    # 17. ARCHER_ULT: Colossal Astral Hurricane bow release + sonic tempest roar + jade harmonic chord
    n = int(1.10 * SR)
    t = np.arange(n) / SR
    bow = karplus_strong_pluck(n, 110.0, decay=0.992, brightness=0.62, rng=rng) * env_ad(n, 0.002, 0.32) * 0.65
    punch = np.sin(2.0 * np.pi * (145.0 * np.exp(-t / 0.08) + 56.0) * t) * env_ad(n, 0.002, 0.24) * 0.75
    gale_l = swept_bandpass(pink_noise(n, rng), 380.0 + 2400.0 * np.exp(-t / 0.35), q=1.5) * env_ad(n, 0.01, 0.45) * 0.75
    gale_r = swept_bandpass(pink_noise(n, rng), 410.0 + 2500.0 * np.exp(-t / 0.35), q=1.5) * env_ad(n, 0.01, 0.45) * 0.75
    chord = (
        warm_chord_note(n, 293.66, 0.02, 0.55, brightness=0.9) * 0.25
        + warm_chord_note(n, 440.00, 0.025, 0.52, brightness=0.9) * 0.22
        + warm_chord_note(n, 587.33, 0.03, 0.48, brightness=1.0) * 0.20
        + warm_chord_note(n, 880.00, 0.035, 0.45, brightness=1.0) * 0.16
    )
    l, r = bow + punch + gale_l + chord, bow + punch + gale_r + chord * 0.98
    l, r = add_velvet_reverb(l, r, wet=0.26, rt60=0.60, rng=rng)
    master_and_save(f"{out_dir}/archer_ult.wav", l, r, target_peak=0.85, hpf_hz=58.0)

    # 18. FIREBALL: Roaring furnace ignition whoosh + crackling ember burst (zero sawtooth buzz!)
    n = int(0.42 * SR)
    t = np.arange(n) / SR
    f_env = (t / 0.045) ** 1.3 * np.exp(-(t / 0.095))
    f_env /= np.max(f_env) + 1e-9
    flutter = 1.0 + 0.28 * np.sin(2.0 * np.pi * 19.0 * t) + 0.18 * np.sin(2.0 * np.pi * 31.0 * t)
    roar_l = swept_bandpass(pink_noise(n, rng), (340.0 + 980.0 * f_env) * flutter, q=1.2) * f_env * 0.85
    roar_r = swept_bandpass(pink_noise(n, rng), (360.0 + 1020.0 * f_env) * flutter, q=1.2) * f_env * 0.85
    thump = np.sin(2.0 * np.pi * (128.0 * np.exp(-t / 0.05) + 66.0) * t) * env_ad(n, 0.003, 0.085) * 0.48
    l, r = roar_l + thump, roar_r + thump
    l, r = add_velvet_reverb(l, r, wet=0.14, rt60=0.30, rng=rng)
    master_and_save(f"{out_dir}/fireball.wav", l, r, target_peak=0.76, hpf_hz=68.0)

    # 19. FLAME_PILLAR: Deep volcanic magma geyser eruption + roaring furnace column + warm solar fifth
    n = int(0.78 * SR)
    t = np.arange(n) / SR
    f_env = env_ad(n, 0.025, 0.34, curve=1.4)
    flutter = 1.0 + 0.32 * np.sin(2.0 * np.pi * 16.0 * t) + 0.22 * np.sin(2.0 * np.pi * 27.0 * t)
    magma_l = swept_bandpass(pink_noise(n, rng), (360.0 + 1250.0 * f_env) * flutter, q=1.3) * f_env * 0.88
    magma_r = swept_bandpass(pink_noise(n, rng), (380.0 + 1300.0 * f_env) * flutter, q=1.3) * f_env * 0.88
    sub = np.sin(2.0 * np.pi * (122.0 * np.exp(-t / 0.08) + 64.0) * t) * env_ad(n, 0.004, 0.18) * 0.52
    horn = (
        warm_chord_note(n, 293.66, 0.02, 0.38, brightness=0.9) * 0.28
        + warm_chord_note(n, 440.00, 0.025, 0.35, brightness=0.95) * 0.22
    )
    l, r = magma_l + sub + horn, magma_r + sub + horn
    l, r = add_velvet_reverb(l, r, wet=0.22, rt60=0.48, rng=rng)
    master_and_save(f"{out_dir}/flame_pillar.wav", l, r, target_peak=0.82, hpf_hz=64.0)

    # 20. METEOR: Descending atmospheric fireball whistle-roar
    n = int(0.68 * SR)
    t = np.arange(n) / SR
    m_env = env_ad(n, 0.04, 0.28)
    f_curve = 1450.0 * np.exp(-t / 0.42) + 220.0
    roar_l = swept_bandpass(pink_noise(n, rng), f_curve, q=1.6) * m_env * 0.8
    roar_r = swept_bandpass(pink_noise(n, rng), f_curve * 1.05, q=1.6) * m_env * 0.8
    body = swept_lowpass(pink_noise(n, rng), 360.0 + 420.0 * m_env, q=1.0) * m_env * 0.55
    l, r = roar_l + body, roar_r + body
    l, r = add_velvet_reverb(l, r, wet=0.18, rt60=0.38, rng=rng)
    master_and_save(f"{out_dir}/meteor.wav", l, r, target_peak=0.78, hpf_hz=64.0)

    # 21. METEOR_IMPACT: Earth-shaking volcanic meteor detonation + crumbling stone debris
    n = int(0.96 * SR)
    t = np.arange(n) / SR
    boom = np.sin(2.0 * np.pi * (142.0 * np.exp(-t / 0.085) + 62.0) * t) * env_ad(n, 0.002, 0.22) * 0.68
    blast_l = swept_bandpass(pink_noise(n, rng), 320.0 + 1800.0 * np.exp(-t / 0.22), q=1.1) * env_ad(n, 0.003, 0.36) * 0.85
    blast_r = swept_bandpass(pink_noise(n, rng), 340.0 + 1850.0 * np.exp(-t / 0.22), q=1.1) * env_ad(n, 0.003, 0.36) * 0.85
    # Staggered rock debris cracks
    debris_l = np.zeros(n, dtype=np.float64)
    debris_r = np.zeros(n, dtype=np.float64)
    for _ in range(22):
        i0 = int(rng.uniform(0.015, 0.42) * SR)
        seg = min(int(0.045 * SR), n - i0)
        fc = rng.uniform(520.0, 1950.0)
        crk = biquad_filter(pink_noise(seg, rng), "bandpass", fc, q=1.6) * env_ad(seg, 0.001, 0.022) * rng.uniform(0.22, 0.45)
        debris_l[i0 : i0 + seg] += crk * rng.uniform(0.4, 1.0)
        debris_r[i0 : i0 + seg] += crk * rng.uniform(0.4, 1.0)
    l, r = boom + blast_l + debris_l, boom + blast_r + debris_r
    l, r = add_velvet_reverb(l, r, wet=0.25, rt60=0.58, rng=rng)
    master_and_save(f"{out_dir}/meteor_impact.wav", l, r, target_peak=0.86, hpf_hz=62.0)

    # 22. ECLIPSE_CHARGE: Deep celestial solar-eclipse singularity convergence + harmonic choir swell
    n = int(0.75 * SR)
    t = np.arange(n) / SR
    swell = np.sin(np.minimum(1.0, t / 0.52) * np.pi * 0.5) * np.exp(-np.maximum(0.0, t - 0.52) / 0.12)
    ch1 = warm_chord_note(n, 220.00, 0.08, 0.48, brightness=0.90) * 0.30
    ch2 = warm_chord_note(n, 293.66, 0.10, 0.45, brightness=0.95) * 0.30
    ch3 = warm_chord_note(n, 440.00, 0.12, 0.42, brightness=1.00) * 0.28
    ch4 = warm_chord_note(n, 587.33, 0.14, 0.40, brightness=1.00) * 0.24
    air_l = swept_bandpass(pink_noise(n, rng), 380.0 + 1150.0 * swell, q=1.8) * swell * 0.48
    air_r = swept_bandpass(pink_noise(n, rng), 400.0 + 1180.0 * swell, q=1.8) * swell * 0.48
    l, r = (ch1 + ch2 + ch3 + ch4) * swell + air_l, (ch1 + ch2 + ch3 + ch4) * swell + air_r
    l, r = add_velvet_reverb(l, r, wet=0.28, rt60=0.55, rng=rng)
    master_and_save(f"{out_dir}/eclipse_charge.wav", l, r, target_peak=0.78, hpf_hz=68.0)

    # 23. SOLAR_BEAM: Heaven-to-Earth solar plasma torrent (roaring solar combustion + majestic D-minor brass chord)
    n = int(0.88 * SR)
    t = np.arange(n) / SR
    punch = np.sin(2.0 * np.pi * (142.0 * np.exp(-t / 0.075) + 62.0) * t) * env_ad(n, 0.002, 0.20) * 0.58
    flutter = 1.0 + 0.25 * np.sin(2.0 * np.pi * 22.0 * t)
    plasma_l = swept_bandpass(pink_noise(n, rng), (450.0 + 1650.0 * np.exp(-t / 0.38)) * flutter, q=1.3) * env_ad(n, 0.008, 0.42) * 0.82
    plasma_r = swept_bandpass(pink_noise(n, rng), (475.0 + 1700.0 * np.exp(-t / 0.38)) * flutter, q=1.3) * env_ad(n, 0.008, 0.42) * 0.82
    brass = (
        warm_chord_note(n, 293.66, 0.015, 0.52, brightness=1.0) * 0.32
        + warm_chord_note(n, 440.00, 0.018, 0.50, brightness=1.0) * 0.28
        + warm_chord_note(n, 587.33, 0.022, 0.48, brightness=1.05) * 0.24
        + warm_chord_note(n, 880.00, 0.025, 0.45, brightness=1.05) * 0.18
    )
    l, r = punch + plasma_l + brass, punch + plasma_r + brass * 0.97
    l, r = add_velvet_reverb(l, r, wet=0.26, rt60=0.58, rng=rng)
    master_and_save(f"{out_dir}/solar_beam.wav", l, r, target_peak=0.85, hpf_hz=62.0)

    # 24. SUPERNOVA_DETONATE: Cataclysmic eclipse supernova explosion + cathedral bell & magma roar
    n = int(1.12 * SR)
    t = np.arange(n) / SR
    boom = np.sin(2.0 * np.pi * (142.0 * np.exp(-t / 0.10) + 52.0) * t) * env_ad(n, 0.002, 0.34) * 0.88
    roar_l = swept_lowpass(pink_noise(n, rng), 280.0 + 2900.0 * np.exp(-t / 0.24), q=1.3) * env_ad(n, 0.004, 0.46) * 0.82
    roar_r = swept_lowpass(pink_noise(n, rng), 295.0 + 3000.0 * np.exp(-t / 0.24), q=1.3) * env_ad(n, 0.004, 0.46) * 0.82
    bell_l, bell_r = modal_steel_bank(
        n, 440.0, [1.0, 1.2, 1.5, 2.0, 2.5, 3.0], [0.28, 0.22, 0.18, 0.14, 0.09, 0.06], [0.45, 0.38, 0.32, 0.26, 0.20, 0.15], rng
    )
    l, r = boom + roar_l + bell_l, boom + roar_r + bell_r
    l, r = add_velvet_reverb(l, r, wet=0.28, rt60=0.65, rng=rng)
    master_and_save(f"{out_dir}/supernova_detonate.wav", l, r, target_peak=0.86, hpf_hz=56.0)

    # 25. BLINK: Ethereal arcane warp (vacuum air-implosion + warm celestial harp chord)
    n = int(0.38 * SR)
    t = np.arange(n) / SR
    warp_env = env_ad(n, 0.015, 0.15)
    w_l = swept_bandpass(pink_noise(n, rng), 1800.0 * np.exp(-t / 0.12) + 320.0, q=2.2) * warp_env * 0.65
    w_r = swept_bandpass(pink_noise(n, rng), 1900.0 * np.exp(-t / 0.12) + 340.0, q=2.2) * warp_env * 0.65
    ch_l, ch_r = modal_steel_bank(
        n, 659.25, [1.0, 1.25, 1.5, 2.0], [0.24, 0.18, 0.14, 0.09], [0.18, 0.15, 0.12, 0.10], rng
    )
    l, r = w_l + ch_l, w_r + ch_r
    l, r = add_velvet_reverb(l, r, wet=0.20, rt60=0.34, rng=rng)
    master_and_save(f"{out_dir}/blink.wav", l, r, target_peak=0.74, hpf_hz=80.0)

    # 26. SKILL_CAST: Crisp arcane/runic activation chime
    n = int(0.34 * SR)
    ch_l, ch_r = modal_steel_bank(
        n, 587.33, [1.0, 1.333, 1.5, 2.0], [0.26, 0.20, 0.16, 0.10], [0.16, 0.14, 0.12, 0.09], rng
    )
    l, r = add_velvet_reverb(ch_l, ch_r, wet=0.20, rt60=0.32, rng=rng)
    master_and_save(f"{out_dir}/skill_cast.wav", l, r, target_peak=0.68, hpf_hz=90.0)

    # 27. ULT_CAST: Majestic cathedral horn & tubular bell resonance (D3 - A3 - D4 - F4 - A4)
    n = int(0.86 * SR)
    t = np.arange(n) / SR
    sub = np.sin(2.0 * np.pi * (115.0 * np.exp(-t / 0.08) + 58.0) * t) * env_ad(n, 0.005, 0.24) * 0.55
    chord = (
        warm_chord_note(n, 146.83, 0.02, 0.52, brightness=0.95) * 0.34
        + warm_chord_note(n, 220.00, 0.025, 0.50, brightness=0.95) * 0.28
        + warm_chord_note(n, 293.66, 0.03, 0.48, brightness=1.0) * 0.24
        + warm_chord_note(n, 349.23, 0.035, 0.46, brightness=1.0) * 0.20
        + warm_chord_note(n, 440.00, 0.04, 0.44, brightness=1.05) * 0.16
    )
    bell_l, bell_r = modal_steel_bank(n, 587.33, [1.0, 1.5, 2.0, 2.5], [0.22, 0.16, 0.12, 0.08], [0.38, 0.32, 0.26, 0.20], rng)
    l, r = sub + chord + bell_l, sub + chord * 0.98 + bell_r
    l, r = add_velvet_reverb(l, r, wet=0.28, rt60=0.58, rng=rng)
    master_and_save(f"{out_dir}/ult_cast.wav", l, r, target_peak=0.82, hpf_hz=60.0)

    # 28. DEATH_WARRIOR: Heavy plate armor collapse + greatsword ringing on cathedral stone
    n = int(1.15 * SR)
    t = np.arange(n) / SR
    fall1 = np.sin(2.0 * np.pi * (135.0 * np.exp(-t / 0.06) + 58.0) * t) * env_ad(n, 0.003, 0.18) * 0.72
    st_l, st_r = modal_steel_bank(n, 440.0, [1.0, 1.38, 1.85, 2.42, 3.1], [0.28, 0.22, 0.16, 0.11, 0.07], [0.35, 0.28, 0.22, 0.18, 0.14], rng)
    # Second knee/greatsword drop at 0.34s
    i2 = int(0.34 * SR)
    seg2 = n - i2
    t2 = np.arange(seg2) / SR
    fall2 = np.sin(2.0 * np.pi * (120.0 * np.exp(-t2 / 0.07) + 54.0) * t2) * env_ad(seg2, 0.003, 0.22) * 0.68
    st2_l, st2_r = modal_steel_bank(seg2, 523.25, [1.0, 1.45, 2.05, 2.75], [0.25, 0.18, 0.12, 0.08], [0.42, 0.34, 0.26, 0.20], rng)
    l = fall1 + st_l
    r = fall1 + st_r
    l[i2:] += fall2 + st2_l
    r[i2:] += fall2 + st2_r
    l, r = add_velvet_reverb(l, r, wet=0.26, rt60=0.58, rng=rng)
    master_and_save(f"{out_dir}/death_warrior.wav", l, r, target_peak=0.80, hpf_hz=58.0)

    # 29. DEATH_MAGE: Arcane ember dissipation + somber descending D-minor glass chord
    n = int(1.15 * SR)
    t = np.arange(n) / SR
    wind = swept_bandpass(pink_noise(n, rng), 980.0 * np.exp(-t / 0.45) + 220.0, q=1.8) * env_ad(n, 0.02, 0.45) * 0.55
    chord = (
        warm_chord_note(n, 293.66, 0.02, 0.58, brightness=0.85) * 0.30
        + warm_chord_note(n, 261.63, 0.12, 0.52, brightness=0.85) * 0.26
        + warm_chord_note(n, 220.00, 0.24, 0.48, brightness=0.80) * 0.24
        + warm_chord_note(n, 174.61, 0.36, 0.45, brightness=0.80) * 0.22
    )
    l, r = wind + chord, wind * 0.95 + chord * 0.98
    l, r = add_velvet_reverb(l, r, wet=0.28, rt60=0.60, rng=rng)
    master_and_save(f"{out_dir}/death_mage.wav", l, r, target_peak=0.78, hpf_hz=64.0)

    # 30. DEATH_ARCHER: Dropped yew bow acoustic resonance + fading emerald wind sigh
    n = int(1.10 * SR)
    t = np.arange(n) / SR
    bow_drop = karplus_strong_pluck(n, 130.81, decay=0.991, brightness=0.52, rng=rng) * env_ad(n, 0.003, 0.38) * 0.65
    sigh = swept_bandpass(pink_noise(n, rng), 780.0 * np.exp(-t / 0.42) + 240.0, q=1.9) * env_ad(n, 0.02, 0.42) * 0.52
    chord = (
        warm_chord_note(n, 329.63, 0.03, 0.52, brightness=0.85) * 0.26
        + warm_chord_note(n, 293.66, 0.18, 0.48, brightness=0.80) * 0.24
        + warm_chord_note(n, 220.00, 0.32, 0.45, brightness=0.80) * 0.22
    )
    l, r = bow_drop + sigh + chord, bow_drop + sigh * 0.95 + chord * 0.98
    l, r = add_velvet_reverb(l, r, wet=0.26, rt60=0.58, rng=rng)
    master_and_save(f"{out_dir}/death_archer.wav", l, r, target_peak=0.78, hpf_hz=64.0)

    # 31. VICTORY_FANFARE: Warm orchestral brass & harp triumphal cadence (D4 -> F#4 -> A4 -> D5)
    n = int(2.10 * SR)
    l = np.zeros(n, dtype=np.float64)
    r = np.zeros(n, dtype=np.float64)
    notes = [
        (0.00, 293.66, 0.28, 0.34),
        (0.18, 369.99, 0.28, 0.34),
        (0.36, 440.00, 0.28, 0.36),
        (0.56, 587.33, 1.15, 0.45),
        (0.56, 293.66, 1.15, 0.35),
        (0.56, 440.00, 1.15, 0.30),
        (0.56, 739.99, 1.10, 0.24),
    ]
    for dt_s, freq, dur_s, amp in notes:
        i0 = int(dt_s * SR)
        seg = n - i0
        voice = warm_chord_note(seg, freq, 0.018, dur_s, brightness=0.95) * amp
        pluck = karplus_strong_pluck(seg, freq, decay=0.994, brightness=0.65, rng=rng) * env_ad(seg, 0.002, dur_s * 0.7) * (amp * 0.45)
        l[i0:] += voice + pluck * 0.9
        r[i0:] += voice * 0.98 + pluck * 1.1
    l, r = add_velvet_reverb(l, r, wet=0.30, rt60=0.72, rng=rng)
    master_and_save(f"{out_dir}/victory_fanfare.wav", l, r, target_peak=0.82, hpf_hz=62.0)

    print("Successfully forged all 31 studio acoustic WAV files in", out_dir)


if __name__ == "__main__":
    generate_all_sfx()
