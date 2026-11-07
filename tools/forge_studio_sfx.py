#!/usr/bin/env python3
"""
Realistic Elemental & Weapon Foley Synthesizer for Arcane vs. Steel.
Generates 38 studio-mastered 44.1kHz 16-bit stereo WAV files with:
  1. SWORD & STEEL FOLEY: High-velocity aerodynamic blade air-whips ("SWISH"),
     friction-excited high-frequency tempered steel scrapes ("SHING" at 2.4kHz-9.5kHz),
     and visceral plate-armor impact transients + heavy body thuds (zero xylophone/bell tones).
  2. ARROW & BOW FOLEY: Taut yew-limb & bowstring snap, wooden arrow-rest click,
     supersonic fletching air-zip ("FFFT-ZIP"), and realistic bodkin "THWACK / THUNK"
     leather/wood penetration + damped wooden shaft shudder (zero metallic tuning-fork ring).
  3. FIRE & PYROMANCY FOLEY: Explosive gas/torch ignition ("FWOOSH"), turbulent
     non-linear combustion roar (90Hz-1.8kHz), searing thermal hiss, and hundreds of
     crisp crackling charcoal/ember snaps (1.8kHz-10kHz) for both cast and hit (`fire_hit`).
  4. HOLY LIGHT & HEALING FOLEY (Priestess): Crystalline quartz shimmer, angelic
     harp plucks, and warm consecrated sanctuary resonance.
"""

import os
import wave
import numpy as np

SR = 44100


def biquad_filter(x, ftype, freq, q=0.707, sr=SR):
    f = float(np.clip(freq, 25.0, sr * 0.46))
    w0 = 2.0 * np.pi * f / sr
    cos_w0 = np.cos(w0)
    sin_w0 = np.sin(w0)
    alpha = sin_w0 / (2.0 * max(0.15, q))

    if ftype == "lowpass":
        b0 = (1.0 - cos_w0) * 0.5
        b1 = 1.0 - cos_w0
        b2 = (1.0 - cos_w0) * 0.5
    elif ftype == "highpass":
        b0 = (1.0 + cos_w0) * 0.5
        b1 = -(1.0 + cos_w0)
        b2 = (1.0 + cos_w0) * 0.5
    elif ftype == "bandpass":
        b0 = alpha
        b1 = 0.0
        b2 = -alpha
    else:
        raise ValueError(f"Unknown filter type: {ftype}")

    a0 = 1.0 + alpha
    a1 = -2.0 * cos_w0
    a2 = 1.0 - alpha

    b0 /= a0
    b1 /= a0
    b2 /= a0
    a1 /= a0
    a2 /= a0

    y = np.zeros_like(x, dtype=np.float64)
    x1 = 0.0
    x2 = 0.0
    y1 = 0.0
    y2 = 0.0
    for i in range(len(x)):
        xi = float(x[i])
        yi = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        x2 = x1
        x1 = xi
        y2 = y1
        y1 = yi
        y[i] = yi
    return y


def swept_bandpass(x, f_arr, q=1.5, sr=SR):
    y = np.zeros_like(x, dtype=np.float64)
    x1 = 0.0
    x2 = 0.0
    y1 = 0.0
    y2 = 0.0
    q_val = max(0.2, float(q))
    for i in range(len(x)):
        f = float(np.clip(f_arr[i], 35.0, sr * 0.45))
        w0 = 2.0 * np.pi * f / sr
        sin_w0 = np.sin(w0)
        cos_w0 = np.cos(w0)
        alpha = sin_w0 / (2.0 * q_val)
        a0 = 1.0 + alpha
        b0 = alpha / a0
        b2 = -alpha / a0
        a1 = (-2.0 * cos_w0) / a0
        a2 = (1.0 - alpha) / a0
        xi = float(x[i])
        yi = b0 * xi + b2 * x2 - a1 * y1 - a2 * y2
        x2 = x1
        x1 = xi
        y2 = y1
        y1 = yi
        y[i] = yi
    return y


def swept_lowpass(x, f_arr, q=0.9, sr=SR):
    y = np.zeros_like(x, dtype=np.float64)
    x1 = 0.0
    x2 = 0.0
    y1 = 0.0
    y2 = 0.0
    q_val = max(0.2, float(q))
    for i in range(len(x)):
        f = float(np.clip(f_arr[i], 40.0, sr * 0.45))
        w0 = 2.0 * np.pi * f / sr
        sin_w0 = np.sin(w0)
        cos_w0 = np.cos(w0)
        alpha = sin_w0 / (2.0 * q_val)
        a0 = 1.0 + alpha
        b1 = (1.0 - cos_w0) / a0
        b0 = b1 * 0.5
        b2 = b0
        a1 = (-2.0 * cos_w0) / a0
        a2 = (1.0 - alpha) / a0
        xi = float(x[i])
        yi = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        x2 = x1
        x1 = xi
        y2 = y1
        y1 = yi
        y[i] = yi
    return y


def pink_noise(n, rng):
    white = rng.standard_normal(n)
    freqs = np.fft.rfftfreq(n, d=1.0 / SR)
    scale = 1.0 / np.where(freqs == 0, 1.0, np.sqrt(freqs))
    scale[0] = 0.0
    spec = np.fft.rfft(white) * scale
    pink = np.fft.irfft(spec, n=n)
    mx = np.max(np.abs(pink)) + 1e-9
    return pink / mx


def env_ad(n, attack_s, decay_s, sr=SR, curve=1.0):
    t = np.arange(n) / sr
    att = np.minimum(1.0, t / max(0.0004, attack_s)) ** curve
    dec = np.exp(-np.maximum(0.0, t - attack_s) / max(0.002, decay_s))
    return att * dec


def karplus_strong_pluck(n, freq_hz, decay=0.990, brightness=0.55, rng=None):
    if rng is None:
        rng = np.random.default_rng(42)
    period = max(4, int(round(SR / max(45.0, freq_hz))))
    burst = rng.uniform(-1.0, 1.0, period)
    burst = biquad_filter(burst, "lowpass", min(7500.0, freq_hz * 10.0), q=0.707)
    out = np.zeros(n, dtype=np.float64)
    buf = burst.copy()
    for i in range(n):
        idx = i % period
        nxt = (idx + 1) % period
        out[i] = buf[idx]
        avg = brightness * buf[idx] + (1.0 - brightness) * buf[nxt]
        buf[idx] = avg * decay
    return out


def sword_steel_shing(n, base_freq, dur_s, rng, scrape_intensity=0.65):
    """
    Realistic tempered steel blade edge 'SHING' & metallic clash resonance.
    Uses high-frequency inharmonic steel plate/blade modes (1.8kHz - 9.6kHz)
    plus a friction-excited metallic scrape (zero low xylophone/bell tones!).
    """
    t = np.arange(n) / SR
    # Inharmonic high-frequency tempered steel modes
    ratios = [1.0, 1.473, 2.118, 2.892, 3.765, 4.812]
    amps = [0.28, 0.24, 0.19, 0.14, 0.09, 0.06]
    decays = [dur_s * 0.85, dur_s * 0.72, dur_s * 0.58, dur_s * 0.45, dur_s * 0.35, dur_s * 0.26]

    out_l = np.zeros(n, dtype=np.float64)
    out_r = np.zeros(n, dtype=np.float64)

    # Fast upward pitch-glide on the first 18ms (simulates blade edge sliding along metal)
    glide = 1.0 - 0.14 * np.exp(-t / 0.016)

    for r_val, a_val, d_val in zip(ratios, amps, decays):
        f = base_freq * r_val
        if f > SR * 0.44:
            continue
        env = env_ad(n, 0.0008, d_val)
        # Subtle high-rate metallic shimmer from blade vibration
        vib = 1.0 + 0.0035 * np.sin(2.0 * np.pi * 48.0 * t)
        phase = np.cumsum(2.0 * np.pi * f * glide * vib / SR)
        ph_l = rng.uniform(0, 2.0 * np.pi)
        ph_r = ph_l + rng.uniform(-0.35, 0.35)
        out_l += np.sin(phase + ph_l) * a_val * env
        out_r += np.sin(phase + ph_r) * a_val * env

    # Friction-excited high-frequency metallic scrape ("ksssshh-shing")
    if scrape_intensity > 0:
        scrape_env = env_ad(n, 0.001, dur_s * 0.32)
        white = rng.standard_normal(n)
        sc_l = biquad_filter(white, "bandpass", min(7800.0, base_freq * 2.4), q=3.8) * scrape_env * scrape_intensity
        sc_r = biquad_filter(rng.standard_normal(n), "bandpass", min(8200.0, base_freq * 2.55), q=3.8) * scrape_env * scrape_intensity
        out_l += sc_l
        out_r += sc_r

    return out_l, out_r


def fire_combustion_layer(n, attack_s, decay_s, intensity, rng, crackle_count=28):
    """
    Hyper-realistic Fire Foley:
      1. Deep turbulent gas/torch ignition roar (95Hz - 540Hz with chaotic flame-lick modulation)
      2. Mid-range roaring blowtorch body (400Hz - 1850Hz)
      3. Searing high-frequency flame hiss (1800Hz - 6800Hz)
      4. Sharp crackling embers & popping sparks (2.2kHz - 9.8kHz micro-transients)
    """
    t = np.arange(n) / SR
    main_env = env_ad(n, attack_s, decay_s, curve=1.2)

    # Chaotic flame turbulence modulator (multiple incommensurate flame-lick rates)
    turb_l = (
        1.0
        + 0.34 * np.sin(2.0 * np.pi * 14.5 * t + rng.uniform(0, 6.28))
        + 0.26 * np.sin(2.0 * np.pi * 23.8 * t + rng.uniform(0, 6.28))
        + 0.18 * np.sin(2.0 * np.pi * 39.2 * t + rng.uniform(0, 6.28))
    )
    turb_r = (
        1.0
        + 0.34 * np.sin(2.0 * np.pi * 15.2 * t + rng.uniform(0, 6.28))
        + 0.26 * np.sin(2.0 * np.pi * 24.6 * t + rng.uniform(0, 6.28))
        + 0.18 * np.sin(2.0 * np.pi * 37.9 * t + rng.uniform(0, 6.28))
    )

    p_l = pink_noise(n, rng)
    p_r = pink_noise(n, rng)

    # 1. Deep combustion "FWOOSH / WHOOMP" core (110Hz - 460Hz)
    f_low = 140.0 + 340.0 * main_env
    low_l = swept_bandpass(p_l, f_low * np.clip(turb_l, 0.5, 1.6), q=1.1) * main_env * 0.95
    low_r = swept_bandpass(p_r, f_low * np.clip(turb_r, 0.5, 1.6), q=1.1) * main_env * 0.95

    # 2. Roaring flame body (480Hz - 1750Hz)
    f_mid = 480.0 + 1150.0 * main_env
    mid_l = swept_bandpass(p_l, f_mid * np.clip(turb_l, 0.6, 1.5), q=1.3) * main_env * 0.72
    mid_r = swept_bandpass(p_r, f_mid * np.clip(turb_r, 0.6, 1.5), q=1.3) * main_env * 0.72

    # 3. Searing thermal sizzle/hiss (2.2kHz - 6.5kHz)
    hiss_env = env_ad(n, attack_s * 0.6, decay_s * 0.85)
    hiss_l = biquad_filter(rng.standard_normal(n), "bandpass", 3400.0, q=1.1) * hiss_env * 0.28 * turb_l
    hiss_r = biquad_filter(rng.standard_normal(n), "bandpass", 3650.0, q=1.1) * hiss_env * 0.28 * turb_r

    # 4. Crisp crackling charcoal/ember snaps & pops (2.0kHz - 9.5kHz)
    crk_l = np.zeros(n, dtype=np.float64)
    crk_r = np.zeros(n, dtype=np.float64)
    dur_total = n / SR
    for _ in range(crackle_count):
        t0 = rng.uniform(0.004, max(0.02, dur_total * 0.82))
        i0 = int(t0 * SR)
        seg = min(int(rng.uniform(0.004, 0.014) * SR), n - i0)
        if seg <= 8:
            continue
        fc = rng.uniform(2200.0, 8800.0)
        snap = biquad_filter(rng.standard_normal(seg), "bandpass", fc, q=2.6) * env_ad(seg, 0.0004, 0.0035)
        amp = rng.uniform(0.22, 0.58) * (1.0 - 0.5 * (t0 / dur_total))
        pan = rng.uniform(0.2, 0.8)
        crk_l[i0 : i0 + seg] += snap * amp * (1.0 - pan * 0.5)
        crk_r[i0 : i0 + seg] += snap * amp * (0.5 + pan * 0.5)

    l = np.tanh((low_l + mid_l + hiss_l + crk_l) * intensity * 1.25)
    r = np.tanh((low_r + mid_r + hiss_r + crk_r) * intensity * 1.25)
    return l, r


def warm_chord_note(n, freq_hz, attack_s, decay_s, brightness=1.0):
    """Phase-pure harmonic voice at exact 64-bit concert pitch (zero vibrato wobble, zero detuning)."""
    t = np.arange(n) / SR
    env = env_ad(n, attack_s, decay_s, curve=1.1)
    # Dynamic harmonic bloom on attack that settles cleanly
    bloom = np.exp(-t / max(0.04, decay_s * 0.45))
    phase = 2.0 * np.pi * freq_hz * t
    harmonics = [
        (1, 1.00, 1.0),
        (2, 0.38 * brightness, 0.7 + 0.3 * bloom),
        (3, 0.16 * brightness, 0.5 + 0.5 * bloom),
        (4, 0.07 * brightness, bloom),
    ]
    out = np.zeros(n, dtype=np.float64)
    for h_mult, amp, h_env in harmonics:
        if freq_hz * h_mult < SR * 0.44:
            out += np.sin(phase * h_mult) * amp * h_env
    return out * env


def crystal_bell_chime(n, freq_hz, decay_s, brightness=1.0):
    """
    Phase-accurate crystalline quartz bell/celesta chime at exact concert pitch.
    Replaces out-of-tune karplus_strong_pluck on tonal sounds.
    """
    t = np.arange(n) / SR
    out_l = np.zeros(n, dtype=np.float64)
    out_r = np.zeros(n, dtype=np.float64)
    partials = [
        (1.0, 1.00, decay_s, 0.0),
        (2.0, 0.42 * brightness, decay_s * 0.65, 0.25),
        (3.0, 0.18 * brightness, decay_s * 0.42, -0.25),
        (4.0, 0.09 * brightness, decay_s * 0.25, 0.4),
        (5.42, 0.06 * brightness, min(0.045, decay_s * 0.14), -0.4),
    ]
    for mult, amp, dec, ph_diff in partials:
        f = freq_hz * mult
        if f >= SR * 0.44:
            continue
        env = env_ad(n, 0.0008, dec)
        ph = 2.0 * np.pi * f * t
        out_l += np.sin(ph) * amp * env
        out_r += np.sin(ph + ph_diff) * amp * env
    return out_l, out_r


def cathedral_bronze_bell(n, fund_hz, decay_s, rng):
    """
    Physical modal model of a colossal cast-bronze Cathedral / Clocktower Bell:
      - Hum tone (0.5x), Prime (1.0x), Tierce (1.183x), Quint (1.506x),
        Nominal (2.0x), Superquint (2.514x), Octave Nominal (3.0x)
      - Plus heavy iron clapper strike transient.
    """
    t = np.arange(n) / SR
    out_l = np.zeros(n, dtype=np.float64)
    out_r = np.zeros(n, dtype=np.float64)
    modes = [
        (0.500, 0.42, decay_s * 1.25, 0.0),
        (1.000, 1.00, decay_s * 1.00, 0.12),
        (1.183, 0.52, decay_s * 0.72, -0.18),
        (1.506, 0.36, decay_s * 0.58, 0.24),
        (2.000, 0.64, decay_s * 0.46, -0.15),
        (2.514, 0.28, decay_s * 0.30, 0.30),
        (3.000, 0.22, decay_s * 0.22, -0.28),
        (4.120, 0.14, min(0.11, decay_s * 0.12), 0.35),
    ]
    for mult, amp, dec, st_ph in modes:
        f = fund_hz * mult
        if f >= SR * 0.44:
            continue
        env = env_ad(n, 0.0012, dec)
        ph = 2.0 * np.pi * f * t
        out_l += np.sin(ph) * amp * env
        out_r += np.sin(ph + st_ph) * amp * env

    # Heavy bronze clapper metallic strike transient
    strike_env = env_ad(n, 0.0005, 0.024)
    clapper = biquad_filter(rng.standard_normal(n), "bandpass", fund_hz * 5.2, q=2.4) * strike_env * 0.55
    thump = np.sin(2.0 * np.pi * (fund_hz * 0.85) * t) * env_ad(n, 0.0008, 0.055) * 0.48
    return out_l + clapper + thump, out_r + clapper * 0.92 + thump


def orchestral_brass_voice(n, freq_hz, attack_s, sustain_s, release_s):
    """
    Studio-grade, phase-pure orchestral French-horn / Trumpet brass voice.
    Zero vibrato wobble, exact concert pitch, warm brassy formant envelope.
    """
    t = np.arange(n) / SR
    att = np.minimum(1.0, t / max(0.003, attack_s))
    rel_start = attack_s + sustain_s
    rel = np.exp(-np.maximum(0.0, t - rel_start) / max(0.015, release_s))
    sustain_droop = 1.0 - 0.12 * np.clip((t - attack_s) / max(0.05, sustain_s), 0.0, 1.0)
    env = att * sustain_droop * rel

    # Brass brightness envelope: upper harmonics flare during initial lip-attack and warm up on sustain
    brass_flare = 0.55 + 0.45 * np.exp(-np.maximum(0.0, t - attack_s * 0.8) / 0.14)
    ph = 2.0 * np.pi * freq_hz * t
    harmonics = [
        (1, 1.00, 1.0),
        (2, 0.68, brass_flare),
        (3, 0.44, brass_flare),
        (4, 0.26, brass_flare ** 1.3),
        (5, 0.15, brass_flare ** 1.6),
        (6, 0.08, brass_flare ** 2.0),
    ]
    out = np.zeros(n, dtype=np.float64)
    for h_mult, amp, h_mod in harmonics:
        if freq_hz * h_mult < SR * 0.44:
            out += np.sin(ph * h_mult) * amp * h_mod
    return out * env


def timpani_strike(n, fund_hz, rng):
    """Realistic orchestral kettle-drum strike for triumphal fanfare downbeats."""
    t = np.arange(n) / SR
    pitch_env = fund_hz * (1.0 + 0.26 * np.exp(-t / 0.022))
    ph = np.cumsum(2.0 * np.pi * pitch_env / SR)
    body = (
        np.sin(ph) * env_ad(n, 0.001, 0.26) * 0.85
        + np.sin(ph * 1.504) * env_ad(n, 0.001, 0.16) * 0.35
        + np.sin(ph * 1.98) * env_ad(n, 0.001, 0.11) * 0.20
    )
    mallet = biquad_filter(rng.standard_normal(n), "bandpass", 920.0, q=1.5) * env_ad(n, 0.0005, 0.014) * 0.42
    return body + mallet


def ice_crystal_shatter(n, base_freq, rng):
    """Crisp glacial spire fracture & sparkling ice-crystal shards."""
    t = np.arange(n) / SR
    crack = biquad_filter(rng.standard_normal(n), "bandpass", 2450.0, q=1.6) * env_ad(n, 0.0006, 0.028) * 0.72
    out_l = crack.copy()
    out_r = crack * 0.95
    for idx, r_mult in enumerate([1.0, 1.36, 1.78, 2.24]):
        f = base_freq * r_mult
        if f < SR * 0.44:
            c_l, c_r = crystal_bell_chime(n, f, 0.095 - idx * 0.015, brightness=0.9)
            out_l += c_l * 0.28
            out_r += c_r * 0.28
    return out_l, out_r


def add_velvet_reverb(sig_l, sig_r, wet=0.14, rt60=0.32, rng=None):
    if wet <= 0.001:
        return sig_l, sig_r
    if rng is None:
        rng = np.random.default_rng(99)
    n = len(sig_l)
    out_l = sig_l.copy()
    out_r = sig_r.copy()
    num_taps = 20
    taps_s = np.linspace(0.012, min(0.38, rt60), num_taps) + rng.uniform(-0.002, 0.002, num_taps)
    for idx, dt_s in enumerate(taps_s):
        d = int(max(1, round(dt_s * SR)))
        if d >= n:
            continue
        gain = (10.0 ** (-3.0 * dt_s / max(0.08, rt60))) * (wet / np.sqrt(num_taps))
        sign = 1.0 if idx % 2 == 0 else -1.0
        if idx % 3 == 0:
            out_l[d:] += sig_r[:-d] * gain * sign
            out_r[d:] += sig_l[:-d] * gain * (-sign)
        else:
            out_l[d:] += sig_l[:-d] * gain * sign
            out_r[d:] += sig_r[:-d] * gain * sign
    out_l = biquad_filter(out_l, "lowpass", 12500.0, q=0.707)
    out_r = biquad_filter(out_r, "lowpass", 12500.0, q=0.707)
    return out_l, out_r


def master_and_save(filepath, sig_l, sig_r, target_peak=0.82, hpf_hz=62.0, lpf_hz=14800.0, soft_clip=False):
    n = len(sig_l)
    l = sig_l - np.mean(sig_l)
    r = sig_r - np.mean(sig_r)

    l = biquad_filter(l, "highpass", hpf_hz, q=0.707)
    r = biquad_filter(r, "highpass", hpf_hz, q=0.707)
    l = biquad_filter(l, "lowpass", lpf_hz, q=0.707)
    r = biquad_filter(r, "lowpass", lpf_hz, q=0.707)

    fade_in = min(int(0.0025 * SR), n // 8)
    fade_out = min(int(0.025 * SR), n // 4)
    if fade_in > 0:
        fi = np.linspace(0.0, 1.0, fade_in)
        l[:fade_in] *= fi
        r[:fade_in] *= fi
    if fade_out > 0:
        fo = np.linspace(1.0, 0.0, fade_out) ** 1.5
        l[-fade_out:] *= fo
        r[-fade_out:] *= fo

    peak = max(np.max(np.abs(l)), np.max(np.abs(r)), 1e-9)
    l = l / peak
    r = r / peak
    if soft_clip:
        l = np.tanh(l * 1.08)
        r = np.tanh(r * 1.08)
        peak2 = max(np.max(np.abs(l)), np.max(np.abs(r)), 1e-9)
        l = l * (target_peak / peak2)
        r = r * (target_peak / peak2)
    else:
        l = l * target_peak
        r = r * target_peak

    stereo = np.empty(n * 2, dtype=np.int16)
    stereo[0::2] = np.clip(l * 32767.0, -32767, 32767).astype(np.int16)
    stereo[1::2] = np.clip(r * 32767.0, -32767, 32767).astype(np.int16)

    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with wave.open(filepath, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(stereo.tobytes())


def generate_all_sfx():
    rng = np.random.default_rng(20261107)
    out_dir = "assets/sfx"

    # =========================================================================
    # I. REALISTIC SWORD & STEEL FOLEY (Warrior: Aethelgard)
    # =========================================================================

    # 1. SLASH: Fast steel greatsword air-slice ("SWISH!") + crisp blade-edge "SHING" scrape
    n = int(0.28 * SR)
    t = np.arange(n) / SR
    whip_env = ((t / 0.038) ** 1.6) * np.exp(-(t / 0.052))
    whip_env /= np.max(whip_env) + 1e-9
    # High-velocity air cut (320Hz -> 2450Hz -> 420Hz)
    f_air = 320.0 + 2100.0 * whip_env
    air_l = swept_bandpass(pink_noise(n, rng), f_air, q=1.5) * whip_env * 0.92
    air_r = swept_bandpass(pink_noise(n, rng), f_air * 1.06, q=1.5) * whip_env * 0.92
    # Deep sword-weight air displacement whoomp
    weight = np.sin(2.0 * np.pi * (175.0 * np.exp(-t / 0.055) + 72.0) * t) * env_ad(n, 0.004, 0.055) * 0.42
    # High-frequency tempered steel edge "SHING" (2.48kHz base — crisp metallic air-cut, zero xylophone!)
    sh_l, sh_r = sword_steel_shing(n, 2480.0, 0.095, rng, scrape_intensity=0.55)
    l, r = air_l + weight + sh_l * 0.55, air_r + weight + sh_r * 0.55
    l, r = add_velvet_reverb(l, r, wet=0.08, rt60=0.20, rng=rng)
    master_and_save(f"{out_dir}/slash.wav", l, r, target_peak=0.80, hpf_hz=72.0)

    # 2. HEAVY_CLEAVE: Two-handed broadsword heavy cleave + visceral armor/flesh impact + steel ring
    n = int(0.38 * SR)
    t = np.arange(n) / SR
    whip_env = ((t / 0.045) ** 1.5) * np.exp(-(t / 0.068))
    whip_env /= np.max(whip_env) + 1e-9
    air_l = swept_bandpass(pink_noise(n, rng), 260.0 + 1850.0 * whip_env, q=1.3) * whip_env * 0.85
    air_r = swept_bandpass(pink_noise(n, rng), 280.0 + 1950.0 * whip_env, q=1.3) * whip_env * 0.85
    # Heavy meat/armor impact thud at 25ms
    punch = np.sin(2.0 * np.pi * (165.0 * np.exp(-t / 0.065) + 64.0) * t) * env_ad(n, 0.002, 0.095) * 0.78
    # Sharp steel-on-plate bite transient + high steel ring
    bite = biquad_filter(rng.standard_normal(n), "bandpass", 2850.0, q=1.6) * env_ad(n, 0.0008, 0.018) * 0.75
    sh_l, sh_r = sword_steel_shing(n, 1960.0, 0.16, rng, scrape_intensity=0.75)
    l, r = air_l + punch + bite + sh_l * 0.72, air_r + punch + bite + sh_r * 0.72
    l, r = add_velvet_reverb(l, r, wet=0.11, rt60=0.26, rng=rng)
    master_and_save(f"{out_dir}/heavy_cleave.wav", l, r, target_peak=0.84, hpf_hz=62.0)

    # 3. CLANG: Authentic sword-on-armor / sword-on-flesh strike (sharp metallic clash + leather/plate thud)
    n = int(0.32 * SR)
    t = np.arange(n) / SR
    # 1. Visceral physical body/plate thud
    thud = np.sin(2.0 * np.pi * (170.0 * np.exp(-t / 0.042) + 68.0) * t) * env_ad(n, 0.001, 0.062) * 0.76
    # 2. Sharp 2ms metal-on-armor impact click/crack
    clash_click = biquad_filter(rng.standard_normal(n), "bandpass", 3200.0, q=1.4) * env_ad(n, 0.0005, 0.014) * 0.85
    # 3. High-frequency tempered steel blade ring & edge scrape (2.15kHz base)
    sh_l, sh_r = sword_steel_shing(n, 2150.0, 0.14, rng, scrape_intensity=0.80)
    l, r = thud + clash_click + sh_l * 0.78, thud + clash_click + sh_r * 0.78
    l, r = add_velvet_reverb(l, r, wet=0.10, rt60=0.24, rng=rng)
    master_and_save(f"{out_dir}/clang.wav", l, r, target_peak=0.82, hpf_hz=66.0)

    # 4. HIT_CRIT: Devastating armor-piercing critical sword strike (heavy gut-thud + twin steel blade shing)
    n = int(0.44 * SR)
    t = np.arange(n) / SR
    punch = np.sin(2.0 * np.pi * (185.0 * np.exp(-t / 0.055) + 60.0) * t) * env_ad(n, 0.001, 0.11) * 0.86
    crack = biquad_filter(rng.standard_normal(n), "bandpass", 3400.0, q=1.3) * env_ad(n, 0.0005, 0.022) * 0.88
    sh1_l, sh1_r = sword_steel_shing(n, 1880.0, 0.20, rng, scrape_intensity=0.85)
    sh2_l, sh2_r = sword_steel_shing(n, 2640.0, 0.16, rng, scrape_intensity=0.65)
    l, r = punch + crack + (sh1_l + sh2_l) * 0.58, punch + crack + (sh1_r + sh2_r) * 0.58
    l, r = add_velvet_reverb(l, r, wet=0.14, rt60=0.30, rng=rng)
    master_and_save(f"{out_dir}/hit_crit.wav", l, r, target_peak=0.86, hpf_hz=60.0)

    # 5. BLADE_WAVE: Sonic sword-wave slice (razor wind-shear + high singing steel edge)
    n = int(0.40 * SR)
    t = np.arange(n) / SR
    env_w = env_ad(n, 0.015, 0.16)
    f_curve = 620.0 + 2200.0 * np.exp(-t / 0.15)
    wind_l = swept_bandpass(pink_noise(n, rng), f_curve, q=1.8) * env_w * 0.85
    wind_r = swept_bandpass(pink_noise(n, rng), f_curve * 1.06, q=1.8) * env_w * 0.85
    sh_l, sh_r = sword_steel_shing(n, 2320.0, 0.18, rng, scrape_intensity=0.70)
    l, r = wind_l + sh_l * 0.65, wind_r + sh_r * 0.65
    l, r = add_velvet_reverb(l, r, wet=0.14, rt60=0.28, rng=rng)
    master_and_save(f"{out_dir}/blade_wave.wav", l, r, target_peak=0.80, hpf_hz=75.0)

    # 6. WHIRLWIND: Glacial Crescent Whirlwind (3 rapid spinning frost-greatsword cleaves + sparkling ice-shard trail)
    n = int(0.68 * SR)
    l = np.zeros(n, dtype=np.float64)
    r = np.zeros(n, dtype=np.float64)
    for idx, offset_s in enumerate([0.0, 0.16, 0.32]):
        i0 = int(offset_s * SR)
        seg_n = min(int(0.24 * SR), n - i0)
        ts = np.arange(seg_n) / SR
        w_env = ((ts / 0.036) ** 1.5) * np.exp(-(ts / 0.048))
        w_env /= np.max(w_env) + 1e-9
        fc = (420.0 + idx * 80.0) + 2100.0 * w_env
        sw_l = swept_bandpass(pink_noise(seg_n, rng), fc, q=1.6) * w_env * 0.78
        sw_r = swept_bandpass(pink_noise(seg_n, rng), fc * 1.06, q=1.6) * w_env * 0.78
        sh_l, sh_r = sword_steel_shing(seg_n, 2320.0 + idx * 160.0, 0.095, rng, scrape_intensity=0.55)
        ice_l, ice_r = ice_crystal_shatter(seg_n, 1567.98 + idx * 180.0, rng)
        l[i0 : i0 + seg_n] += sw_l + sh_l * 0.48 + ice_l * 0.36
        r[i0 : i0 + seg_n] += sw_r + sh_r * 0.48 + ice_r * 0.36
    l, r = add_velvet_reverb(l, r, wet=0.14, rt60=0.28, rng=rng)
    master_and_save(f"{out_dir}/whirlwind.wav", l, r, target_peak=0.80, hpf_hz=72.0)

    # 7. STORM_LEAP: Armored dash rush + sword unsheathe shing
    n = int(0.44 * SR)
    t = np.arange(n) / SR
    rush_env = env_ad(n, 0.03, 0.18)
    f_curve = 320.0 + 1650.0 * np.sin(np.minimum(1.0, t / 0.32) * np.pi)
    w_l = swept_bandpass(pink_noise(n, rng), f_curve, q=1.6) * rush_env * 0.85
    w_r = swept_bandpass(pink_noise(n, rng), f_curve * 1.06, q=1.6) * rush_env * 0.85
    sh_l, sh_r = sword_steel_shing(n, 2400.0, 0.14, rng, scrape_intensity=0.65)
    l, r = w_l + sh_l * 0.55, w_r + sh_r * 0.55
    l, r = add_velvet_reverb(l, r, wet=0.12, rt60=0.26, rng=rng)
    master_and_save(f"{out_dir}/storm_leap.wav", l, r, target_peak=0.78, hpf_hz=70.0)

    # 8. THUNDER_SLAM: High-voltage lightning crack + greatsword earth-slam + glacial frost-spire eruption
    n = int(0.68 * SR)
    t = np.arange(n) / SR
    sub = np.sin(2.0 * np.pi * (155.0 * np.exp(-t / 0.065) + 56.0) * t) * env_ad(n, 0.0012, 0.18) * 0.84
    lightning_snap = (
        biquad_filter(rng.standard_normal(n), "bandpass", 3200.0, q=1.5) * env_ad(n, 0.0004, 0.024) * 0.85
        + biquad_filter(rng.standard_normal(n), "bandpass", 1450.0, q=1.3) * env_ad(n, 0.001, 0.085) * 0.68
    )
    stone_crack = swept_lowpass(pink_noise(n, rng), 420.0 + 3400.0 * np.exp(-t / 0.11), q=1.2) * env_ad(n, 0.002, 0.22) * 0.75
    ice_l, ice_r = ice_crystal_shatter(n, 1318.51, rng)
    sh_l, sh_r = sword_steel_shing(n, 2120.0, 0.20, rng, scrape_intensity=0.72)
    l = sub + lightning_snap + stone_crack + sh_l * 0.55 + ice_l * 0.52
    r = sub + lightning_snap * 0.94 + stone_crack * 0.96 + sh_r * 0.55 + ice_r * 0.52
    l, r = add_velvet_reverb(l, r, wet=0.16, rt60=0.36, rng=rng)
    master_and_save(f"{out_dir}/thunder_slam.wav", l, r, target_peak=0.85, hpf_hz=58.0, soft_clip=True)

    # 9. EARTHSHATTER: Colossal Glacial Cataclysm finisher (tectonic ground-split + 5 erupting ice monolith spires)
    n = int(1.05 * SR)
    t = np.arange(n) / SR
    sub = np.sin(2.0 * np.pi * (145.0 * np.exp(-t / 0.09) + 52.0) * t) * env_ad(n, 0.0018, 0.30) * 0.88
    rumble = swept_lowpass(pink_noise(n, rng), 320.0 + 3000.0 * np.exp(-t / 0.18), q=1.15) * env_ad(n, 0.003, 0.38) * 0.78
    cryst_l = np.zeros(n, dtype=np.float64)
    cryst_r = np.zeros(n, dtype=np.float64)
    for idx, dt_s in enumerate([0.0, 0.075, 0.15, 0.225, 0.30]):
        i0 = int(dt_s * SR)
        seg = n - i0
        cl, cr = sword_steel_shing(seg, 1880.0 + idx * 210.0, 0.15, rng, scrape_intensity=0.62)
        il, ir = ice_crystal_shatter(seg, 1174.66 + idx * 165.0, rng)
        cryst_l[i0:] += cl * 0.45 + il * 0.55
        cryst_r[i0:] += cr * 0.45 + ir * 0.55
    l, r = sub + rumble + cryst_l, sub + rumble * 0.95 + cryst_r
    l, r = add_velvet_reverb(l, r, wet=0.18, rt60=0.44, rng=rng)
    master_and_save(f"{out_dir}/earthshatter.wav", l, r, target_peak=0.86, hpf_hz=54.0, soft_clip=True)

    # 10. REFLECT: Crisp steel shield/blade parry ("CLANG-SHING!")
    n = int(0.34 * SR)
    click = biquad_filter(rng.standard_normal(n), "bandpass", 3600.0, q=1.8) * env_ad(n, 0.0005, 0.015) * 0.75
    sh_l, sh_r = sword_steel_shing(n, 2580.0, 0.18, rng, scrape_intensity=0.80)
    l, r = click + sh_l * 0.85, click + sh_r * 0.85
    l, r = add_velvet_reverb(l, r, wet=0.14, rt60=0.28, rng=rng)
    master_and_save(f"{out_dir}/reflect.wav", l, r, target_peak=0.80, hpf_hz=85.0)

    # =========================================================================
    # II. REALISTIC ARROW & BOW FOLEY (Archer: Sylvara)
    # =========================================================================

    # 11. ARROW_SHOOT: Taut recurve bowstring snap + wooden riser click + supersonic fletching "FFFT-ZIP!"
    n = int(0.26 * SR)
    t = np.arange(n) / SR
    string_l = karplus_strong_pluck(n, 155.0, decay=0.976, brightness=0.48, rng=rng) * env_ad(n, 0.0008, 0.075) * 0.82
    string_r = karplus_strong_pluck(n, 158.0, decay=0.976, brightness=0.48, rng=rng) * env_ad(n, 0.0008, 0.075) * 0.82
    wood_limb = np.sin(2.0 * np.pi * (290.0 * np.exp(-t / 0.025) + 135.0) * t) * env_ad(n, 0.0008, 0.028) * 0.58
    shaft_click = biquad_filter(rng.standard_normal(n), "bandpass", 2150.0, q=2.2) * env_ad(n, 0.0005, 0.009) * 0.65
    zip_env = ((t / 0.022) ** 1.3) * np.exp(-(t / 0.036))
    zip_env /= np.max(zip_env) + 1e-9
    zip_l = swept_bandpass(rng.standard_normal(n), 950.0 + 2650.0 * zip_env, q=2.0) * zip_env * 0.72
    zip_r = swept_bandpass(rng.standard_normal(n), 1020.0 + 2750.0 * zip_env, q=2.0) * zip_env * 0.72
    l, r = string_l + wood_limb + shaft_click + zip_l, string_r + wood_limb + shaft_click + zip_r
    l, r = add_velvet_reverb(l, r, wet=0.07, rt60=0.16, rng=rng)
    master_and_save(f"{out_dir}/arrow_shoot.wav", l, r, target_peak=0.80, hpf_hz=78.0)

    # 12. ARROW_HIT: Authentic high-velocity bodkin arrow "THWACK / THUNK!" into leather/target/wood
    n = int(0.22 * SR)
    t = np.arange(n) / SR
    in_zip = biquad_filter(rng.standard_normal(n), "bandpass", 2400.0, q=1.8) * env_ad(n, 0.001, 0.012) * 0.45
    leather_snap = (
        biquad_filter(rng.standard_normal(n), "bandpass", 1750.0, q=1.4) * env_ad(n, 0.0004, 0.016) * 0.92
        + biquad_filter(rng.standard_normal(n), "bandpass", 3450.0, q=1.6) * env_ad(n, 0.0003, 0.009) * 0.78
    )
    thunk = np.sin(2.0 * np.pi * (195.0 * np.exp(-t / 0.022) + 78.0) * t) * env_ad(n, 0.0008, 0.042) * 0.88
    shaft_shudder = (
        np.sin(2.0 * np.pi * 325.0 * t) * env_ad(n, 0.002, 0.032) * 0.34
        + np.sin(2.0 * np.pi * 610.0 * t) * env_ad(n, 0.001, 0.022) * 0.24
    )
    l = in_zip * 0.9 + leather_snap + thunk + shaft_shudder
    r = in_zip * 1.1 + leather_snap * 0.96 + thunk + shaft_shudder * 0.94
    l, r = add_velvet_reverb(l, r, wet=0.06, rt60=0.14, rng=rng)
    master_and_save(f"{out_dir}/arrow_hit.wav", l, r, target_peak=0.84, hpf_hz=72.0)

    # 13. ARROW_RAIN: Emerald Gale Tornado & Sky Volley (swirling vortex gust + 6 crisp recurve bow releases)
    n = int(0.78 * SR)
    t = np.arange(n) / SR
    l = np.zeros(n, dtype=np.float64)
    r = np.zeros(n, dtype=np.float64)
    # Swirling emerald wind-vortex bed
    vortex_env = env_ad(n, 0.04, 0.32)
    vortex_mod = 650.0 + 950.0 * (0.5 + 0.5 * np.sin(2.0 * np.pi * 5.5 * t))
    l += swept_bandpass(pink_noise(n, rng), vortex_mod, q=2.0) * vortex_env * 0.52
    r += swept_bandpass(pink_noise(n, rng), vortex_mod * 1.08, q=2.0) * vortex_env * 0.52
    for idx in range(6):
        i0 = int(idx * 0.078 * SR)
        seg = min(int(0.20 * SR), n - i0)
        ts = np.arange(seg) / SR
        pl = karplus_strong_pluck(seg, 154.0 + idx * 10.0, decay=0.976, brightness=0.50, rng=rng) * env_ad(seg, 0.0008, 0.060) * 0.62
        w_env = ((ts / 0.018) ** 1.3) * np.exp(-(ts / 0.032))
        w_env /= np.max(w_env) + 1e-9
        wh = swept_bandpass(rng.standard_normal(seg), 1150.0 + idx * 100.0 + 2400.0 * w_env, q=2.2) * w_env * 0.60
        pan = 0.2 + 0.6 * (idx / 5.0)
        l[i0 : i0 + seg] += (pl + wh) * (1.0 - pan * 0.45)
        r[i0 : i0 + seg] += (pl + wh) * (0.55 + pan * 0.45)
    l, r = add_velvet_reverb(l, r, wet=0.11, rt60=0.24, rng=rng)
    master_and_save(f"{out_dir}/arrow_rain.wav", l, r, target_peak=0.80, hpf_hz=78.0)

    # 14. ZEPHYR_FLIP: Crisp wind-vault whoosh + light cloth/leather snap
    n = int(0.36 * SR)
    t = np.arange(n) / SR
    gust_env = env_ad(n, 0.022, 0.14)
    gust_l = swept_bandpass(pink_noise(n, rng), 420.0 + 1650.0 * np.sin(np.minimum(1.0, t / 0.26) * np.pi), q=1.6) * gust_env * 0.85
    gust_r = swept_bandpass(pink_noise(n, rng), 450.0 + 1720.0 * np.sin(np.minimum(1.0, t / 0.26) * np.pi), q=1.6) * gust_env * 0.85
    cloth = biquad_filter(rng.standard_normal(n), "bandpass", 1450.0, q=1.5) * env_ad(n, 0.002, 0.032) * 0.45
    l, r = gust_l + cloth, gust_r + cloth
    l, r = add_velvet_reverb(l, r, wet=0.10, rt60=0.22, rng=rng)
    master_and_save(f"{out_dir}/zephyr_flip.wav", l, r, target_peak=0.76, hpf_hz=80.0)

    # 15. ARCHER_ULT: Tempest Sovereign Volley (heavy warbow release + howling emerald wind-dragon + 8 rapid bodkin impacts)
    n = int(1.05 * SR)
    t = np.arange(n) / SR
    bow = karplus_strong_pluck(n, 122.0, decay=0.982, brightness=0.52, rng=rng) * env_ad(n, 0.001, 0.16) * 0.76
    sonic_boom = np.sin(2.0 * np.pi * (170.0 * np.exp(-t / 0.060) + 60.0) * t) * env_ad(n, 0.0015, 0.18) * 0.82
    gale_f = 520.0 + 2600.0 * np.exp(-t / 0.34) * (0.75 + 0.25 * np.sin(2.0 * np.pi * 7.5 * t))
    gale_l = swept_bandpass(pink_noise(n, rng), gale_f, q=1.7) * env_ad(n, 0.008, 0.40) * 0.84
    gale_r = swept_bandpass(pink_noise(n, rng), gale_f * 1.06, q=1.7) * env_ad(n, 0.008, 0.40) * 0.84
    l, r = bow + sonic_boom + gale_l, bow + sonic_boom + gale_r
    for idx in range(8):
        i0 = int((0.12 + idx * 0.068) * SR)
        seg = min(int(0.14 * SR), n - i0)
        ts = np.arange(seg) / SR
        zip_wh = biquad_filter(rng.standard_normal(seg), "bandpass", 2200.0 + idx * 140.0, q=2.0) * env_ad(seg, 0.001, 0.022) * 0.48
        thwk = np.sin(2.0 * np.pi * (185.0 * np.exp(-ts / 0.018) + 76.0) * ts) * env_ad(seg, 0.0008, 0.032) * 0.45
        l[i0 : i0 + seg] += zip_wh + thwk
        r[i0 : i0 + seg] += zip_wh * 0.94 + thwk
    l, r = add_velvet_reverb(l, r, wet=0.15, rt60=0.36, rng=rng)
    master_and_save(f"{out_dir}/archer_ult.wav", l, r, target_peak=0.86, hpf_hz=58.0)

    # =========================================================================
    # III. REALISTIC FIRE & PYROMANCY FOLEY (Fire Mage: Ignis Sol)
    # =========================================================================

    # 16. FIREBALL: Sudden torch/gas ignition "FWOOSH!" + turbulent flame roar + crackling embers
    n = int(0.42 * SR)
    t = np.arange(n) / SR
    ignite = np.sin(2.0 * np.pi * (145.0 * np.exp(-t / 0.045) + 65.0) * t) * env_ad(n, 0.002, 0.075) * 0.58
    fl_l, fl_r = fire_combustion_layer(n, attack_s=0.018, decay_s=0.15, intensity=0.95, rng=rng, crackle_count=26)
    l, r = ignite + fl_l, ignite + fl_r
    l, r = add_velvet_reverb(l, r, wet=0.10, rt60=0.22, rng=rng)
    master_and_save(f"{out_dir}/fireball.wav", l, r, target_peak=0.82, hpf_hz=64.0)

    # 17. FIRE_HIT: Explosive fireball impact burst ("BWOOM-KSSSS!") + searing ember sizzle & crackle
    n = int(0.38 * SR)
    t = np.arange(n) / SR
    puff = np.sin(2.0 * np.pi * (168.0 * np.exp(-t / 0.04) + 62.0) * t) * env_ad(n, 0.001, 0.075) * 0.78
    scorch_snap = biquad_filter(rng.standard_normal(n), "bandpass", 2400.0, q=1.3) * env_ad(n, 0.0006, 0.022) * 0.65
    fl_l, fl_r = fire_combustion_layer(n, attack_s=0.004, decay_s=0.14, intensity=1.05, rng=rng, crackle_count=34)
    l, r = puff + scorch_snap + fl_l, puff + scorch_snap + fl_r
    l, r = add_velvet_reverb(l, r, wet=0.10, rt60=0.22, rng=rng)
    master_and_save(f"{out_dir}/fire_hit.wav", l, r, target_peak=0.84, hpf_hz=62.0)

    # 18. FLAME_PILLAR: Triple Solar Pillar (3 escalating volcanic flame-geyser eruptions + roaring inferno column)
    n = int(0.84 * SR)
    l = np.zeros(n, dtype=np.float64)
    r = np.zeros(n, dtype=np.float64)
    for idx, dt_s in enumerate([0.0, 0.14, 0.28]):
        i0 = int(dt_s * SR)
        seg = n - i0
        ts = np.arange(seg) / SR
        erupt = np.sin(2.0 * np.pi * ((135.0 + idx * 18.0) * np.exp(-ts / 0.065) + 58.0) * ts) * env_ad(seg, 0.002, 0.14) * (0.52 + idx * 0.10)
        fl_l, fl_r = fire_combustion_layer(seg, attack_s=0.012, decay_s=0.22, intensity=0.75 + idx * 0.15, rng=rng, crackle_count=24)
        l[i0:] += erupt + fl_l
        r[i0:] += erupt + fl_r
    l, r = add_velvet_reverb(l, r, wet=0.14, rt60=0.32, rng=rng)
    master_and_save(f"{out_dir}/flame_pillar.wav", l, r, target_peak=0.84, hpf_hz=60.0)

    # 19. METEOR: Screaming atmospheric fireball descent + roaring combustion wake
    n = int(0.64 * SR)
    t = np.arange(n) / SR
    m_env = env_ad(n, 0.03, 0.25)
    f_whistle = 1650.0 * np.exp(-t / 0.36) + 240.0
    wh_l = swept_bandpass(pink_noise(n, rng), f_whistle, q=1.9) * m_env * 0.65
    wh_r = swept_bandpass(pink_noise(n, rng), f_whistle * 1.05, q=1.9) * m_env * 0.65
    fl_l, fl_r = fire_combustion_layer(n, attack_s=0.03, decay_s=0.24, intensity=0.85, rng=rng, crackle_count=32)
    l, r = wh_l + fl_l, wh_r + fl_r
    l, r = add_velvet_reverb(l, r, wet=0.12, rt60=0.28, rng=rng)
    master_and_save(f"{out_dir}/meteor.wav", l, r, target_peak=0.80, hpf_hz=62.0)

    # 20. METEOR_IMPACT: Cataclysmic fiery explosion + rock shatter + roaring napalm afterburn
    n = int(0.92 * SR)
    t = np.arange(n) / SR
    boom = np.sin(2.0 * np.pi * (152.0 * np.exp(-t / 0.08) + 56.0) * t) * env_ad(n, 0.0015, 0.22) * 0.85
    fl_l, fl_r = fire_combustion_layer(n, attack_s=0.004, decay_s=0.36, intensity=1.15, rng=rng, crackle_count=64)
    l, r = boom + fl_l, boom + fl_r
    l, r = add_velvet_reverb(l, r, wet=0.18, rt60=0.42, rng=rng)
    master_and_save(f"{out_dir}/meteor_impact.wav", l, r, target_peak=0.86, hpf_hz=58.0, soft_clip=True)

    # 21. ECLIPSE_CHARGE: Deep vacuum flame-indraft + crackling solar corona build-up
    n = int(0.68 * SR)
    t = np.arange(n) / SR
    swell = np.sin(np.minimum(1.0, t / 0.48) * np.pi * 0.5) * np.exp(-np.maximum(0.0, t - 0.48) / 0.10)
    fl_l, fl_r = fire_combustion_layer(n, attack_s=0.25, decay_s=0.20, intensity=0.95, rng=rng, crackle_count=42)
    sub_pull = np.sin(2.0 * np.pi * (68.0 + 75.0 * swell) * t) * swell * 0.55
    l, r = fl_l * swell + sub_pull, fl_r * swell + sub_pull
    l, r = add_velvet_reverb(l, r, wet=0.16, rt60=0.34, rng=rng)
    master_and_save(f"{out_dir}/eclipse_charge.wav", l, r, target_peak=0.80, hpf_hz=62.0)

    # 22. SOLAR_BEAM: Pressurized solar blowtorch torrent + searing plasma crackle
    n = int(0.84 * SR)
    t = np.arange(n) / SR
    punch = np.sin(2.0 * np.pi * (155.0 * np.exp(-t / 0.07) + 58.0) * t) * env_ad(n, 0.0015, 0.18) * 0.75
    fl_l, fl_r = fire_combustion_layer(n, attack_s=0.008, decay_s=0.36, intensity=1.18, rng=rng, crackle_count=68)
    l, r = punch + fl_l, punch + fl_r
    l, r = add_velvet_reverb(l, r, wet=0.16, rt60=0.38, rng=rng)
    master_and_save(f"{out_dir}/solar_beam.wav", l, r, target_peak=0.86, hpf_hz=58.0, soft_clip=True)

    # 23. SUPERNOVA_DETONATE: Massive fuel-air inferno detonation + roaring firestorm
    n = int(1.05 * SR)
    t = np.arange(n) / SR
    boom = np.sin(2.0 * np.pi * (158.0 * np.exp(-t / 0.09) + 52.0) * t) * env_ad(n, 0.0015, 0.28) * 0.88
    fl_l, fl_r = fire_combustion_layer(n, attack_s=0.003, decay_s=0.44, intensity=1.25, rng=rng, crackle_count=80)
    l, r = boom + fl_l, boom + fl_r
    l, r = add_velvet_reverb(l, r, wet=0.20, rt60=0.48, rng=rng)
    master_and_save(f"{out_dir}/supernova_detonate.wav", l, r, target_peak=0.88, hpf_hz=56.0, soft_clip=True)

    # 24. BLINK: Fiery vacuum displacement "POP-FWOOSH!"
    n = int(0.32 * SR)
    t = np.arange(n) / SR
    pop = np.sin(2.0 * np.pi * (240.0 * np.exp(-t / 0.022) + 75.0) * t) * env_ad(n, 0.0008, 0.038) * 0.68
    fl_l, fl_r = fire_combustion_layer(n, attack_s=0.006, decay_s=0.10, intensity=0.85, rng=rng, crackle_count=18)
    l, r = pop + fl_l, pop + fl_r
    l, r = add_velvet_reverb(l, r, wet=0.12, rt60=0.24, rng=rng)
    master_and_save(f"{out_dir}/blink.wav", l, r, target_peak=0.78, hpf_hz=72.0)

    # =========================================================================
    # IV. HOLY LIGHT & HEALING FOLEY (Priestess: Seraphina — PHASE-PURE TUNING)
    # =========================================================================

    # 25. HOLY_BOLT: Luminous crystalline light release + pure concert-pitch crystal chime (D5 + A5)
    n = int(0.34 * SR)
    t = np.arange(n) / SR
    whoosh_env = env_ad(n, 0.010, 0.11)
    air_l = swept_bandpass(pink_noise(n, rng), 820.0 + 1750.0 * whoosh_env, q=2.2) * whoosh_env * 0.45
    air_r = swept_bandpass(pink_noise(n, rng), 860.0 + 1850.0 * whoosh_env, q=2.2) * whoosh_env * 0.45
    c1_l, c1_r = crystal_bell_chime(n, 587.33, 0.16, brightness=0.95)
    c2_l, c2_r = crystal_bell_chime(n, 880.00, 0.14, brightness=0.90)
    l = air_l + c1_l * 0.52 + c2_l * 0.38
    r = air_r + c1_r * 0.52 + c2_r * 0.38
    l, r = add_velvet_reverb(l, r, wet=0.18, rt60=0.32, rng=rng)
    master_and_save(f"{out_dir}/holy_bolt.wav", l, r, target_peak=0.74, hpf_hz=85.0)

    # 26. HOLY_HIT: Radiant star-cross impact burst (warm light pulse + exact D6/F#6 crystal prism chime)
    n = int(0.30 * SR)
    t = np.arange(n) / SR
    pulse = np.sin(2.0 * np.pi * (165.0 * np.exp(-t / 0.032) + 78.0) * t) * env_ad(n, 0.001, 0.052) * 0.62
    prism = biquad_filter(rng.standard_normal(n), "bandpass", 2850.0, q=2.4) * env_ad(n, 0.0006, 0.022) * 0.48
    ch1_l, ch1_r = crystal_bell_chime(n, 1174.66, 0.12, brightness=0.90)
    ch2_l, ch2_r = crystal_bell_chime(n, 1479.98, 0.10, brightness=0.85)
    l = pulse + prism + ch1_l * 0.46 + ch2_l * 0.34
    r = pulse + prism * 0.95 + ch1_r * 0.46 + ch2_r * 0.34
    l, r = add_velvet_reverb(l, r, wet=0.16, rt60=0.28, rng=rng)
    master_and_save(f"{out_dir}/holy_hit.wav", l, r, target_peak=0.76, hpf_hz=80.0)

    # 27. HOLY_HEAL: Sacred Sanctuary Benediction (phase-pure D-major celestial bell arpeggio + warm choir pad)
    n = int(0.68 * SR)
    l = np.zeros(n, dtype=np.float64)
    r = np.zeros(n, dtype=np.float64)
    # Exact concert-pitch D major ascending arpeggio: D5 (587.33), F#5 (739.99), A5 (880.00), D6 (1174.66)
    for idx, f_note in enumerate([587.33, 739.99, 880.00, 1174.66]):
        i0 = int(idx * 0.060 * SR)
        seg = n - i0
        cl, cr = crystal_bell_chime(seg, f_note, 0.28, brightness=0.92)
        pad = warm_chord_note(seg, f_note * 0.5, 0.025, 0.36, brightness=0.80) * 0.24
        pan = 0.25 + 0.50 * (idx / 3.0)
        l[i0:] += cl * (0.42 * (1.0 - pan * 0.35)) + pad
        r[i0:] += cr * (0.42 * (0.65 + pan * 0.35)) + pad * 0.98
    l, r = add_velvet_reverb(l, r, wet=0.24, rt60=0.48, rng=rng)
    master_and_save(f"{out_dir}/holy_heal.wav", l, r, target_peak=0.76, hpf_hz=80.0)

    # 28. HOLY_SMITE: Valkyrie Spear of Light Judgment (golden sun-lance rush + pure A-major celestial chord)
    n = int(0.68 * SR)
    t = np.arange(n) / SR
    sub = np.sin(2.0 * np.pi * (148.0 * np.exp(-t / 0.060) + 64.0) * t) * env_ad(n, 0.0018, 0.16) * 0.65
    flare_l = swept_bandpass(pink_noise(n, rng), 540.0 + 2100.0 * np.exp(-t / 0.22), q=1.8) * env_ad(n, 0.006, 0.26) * 0.58
    flare_r = swept_bandpass(pink_noise(n, rng), 570.0 + 2200.0 * np.exp(-t / 0.22), q=1.8) * env_ad(n, 0.006, 0.26) * 0.58
    c1_l, c1_r = crystal_bell_chime(n, 880.00, 0.26, brightness=0.95)
    chord = (
        warm_chord_note(n, 440.00, 0.012, 0.38, brightness=0.90) * 0.28
        + warm_chord_note(n, 554.37, 0.016, 0.36, brightness=0.90) * 0.22
        + warm_chord_note(n, 659.25, 0.020, 0.34, brightness=0.92) * 0.24
    )
    l = sub + flare_l + chord + c1_l * 0.32
    r = sub + flare_r + chord * 0.98 + c1_r * 0.32
    l, r = add_velvet_reverb(l, r, wet=0.22, rt60=0.46, rng=rng)
    master_and_save(f"{out_dir}/holy_smite.wav", l, r, target_peak=0.80, hpf_hz=64.0)

    # 29. PRIESTESS_ULT: Seraphic Apotheosis Sunbeam (cathedral sun-torrent + pure D-major organ/choir & chime)
    n = int(1.08 * SR)
    t = np.arange(n) / SR
    boom = np.sin(2.0 * np.pi * (148.0 * np.exp(-t / 0.08) + 58.0) * t) * env_ad(n, 0.002, 0.24) * 0.72
    beam_l = swept_bandpass(pink_noise(n, rng), 620.0 + 2400.0 * np.exp(-t / 0.36), q=1.7) * env_ad(n, 0.008, 0.42) * 0.62
    beam_r = swept_bandpass(pink_noise(n, rng), 650.0 + 2500.0 * np.exp(-t / 0.36), q=1.7) * env_ad(n, 0.008, 0.42) * 0.62
    chord = (
        warm_chord_note(n, 293.66, 0.018, 0.62, brightness=0.92) * 0.28
        + warm_chord_note(n, 369.99, 0.022, 0.58, brightness=0.92) * 0.22
        + warm_chord_note(n, 440.00, 0.026, 0.56, brightness=0.95) * 0.24
        + warm_chord_note(n, 587.33, 0.030, 0.54, brightness=0.98) * 0.24
    )
    ch_l, ch_r = crystal_bell_chime(n, 1174.66, 0.42, brightness=0.95)
    l = boom + beam_l + chord + ch_l * 0.28
    r = boom + beam_r + chord * 0.98 + ch_r * 0.28
    l, r = add_velvet_reverb(l, r, wet=0.26, rt60=0.58, rng=rng)
    master_and_save(f"{out_dir}/priestess_ult.wav", l, r, target_peak=0.84, hpf_hz=60.0)

    # =========================================================================
    # V. SHARED FOLEY, DEATHS & STUDIO ORCHESTRAL VICTORY FANFARE
    # =========================================================================

    # 30. HURT_HIT: Subtle leather/cloth body stagger thud
    n = int(0.16 * SR)
    t = np.arange(n) / SR
    thud = np.sin(2.0 * np.pi * (135.0 * np.exp(-t / 0.035) + 65.0) * t) * env_ad(n, 0.0015, 0.045) * 0.68
    cloth = biquad_filter(pink_noise(n, rng), "bandpass", 580.0, q=1.2) * env_ad(n, 0.0015, 0.032) * 0.45
    l, r = thud + cloth * 0.95, thud + cloth * 1.05
    master_and_save(f"{out_dir}/hurt_hit.wav", l, r, target_peak=0.58, hpf_hz=68.0)

    # 31. FOOTSTEP_STEEL: Subtle armored greave stone step
    n = int(0.14 * SR)
    t = np.arange(n) / SR
    step = np.sin(2.0 * np.pi * (145.0 * np.exp(-t / 0.022) + 75.0) * t) * env_ad(n, 0.0015, 0.030) * 0.58
    grit = biquad_filter(pink_noise(n, rng), "bandpass", 1050.0, q=1.5) * env_ad(n, 0.0015, 0.024) * 0.48
    l, r = step + grit * 0.95, step + grit * 1.05
    master_and_save(f"{out_dir}/footstep_steel.wav", l, r, target_peak=0.45, hpf_hz=85.0)

    # 32. SKILL_CAST: Clean, pitch-neutral aerodynamic rush
    n = int(0.24 * SR)
    sw = env_ad(n, 0.016, 0.10)
    air_l = swept_bandpass(pink_noise(n, rng), 440.0 + 1350.0 * sw, q=1.8) * sw * 0.65
    air_r = swept_bandpass(pink_noise(n, rng), 470.0 + 1420.0 * sw, q=1.8) * sw * 0.65
    l, r = add_velvet_reverb(air_l, air_r, wet=0.12, rt60=0.22, rng=rng)
    master_and_save(f"{out_dir}/skill_cast.wav", l, r, target_peak=0.60, hpf_hz=85.0)

    # 33. ULT_CAST: Clean sub-bass cinematic time-stop pressure drop (pitch-neutral so it never clashes)
    n = int(0.48 * SR)
    t = np.arange(n) / SR
    sub = np.sin(2.0 * np.pi * (135.0 * np.exp(-t / 0.070) + 52.0) * t) * env_ad(n, 0.003, 0.22) * 0.72
    rush_l = swept_bandpass(pink_noise(n, rng), 360.0 + 1650.0 * env_ad(n, 0.025, 0.20), q=1.6) * env_ad(n, 0.02, 0.20) * 0.58
    rush_r = swept_bandpass(pink_noise(n, rng), 385.0 + 1750.0 * env_ad(n, 0.025, 0.20), q=1.6) * env_ad(n, 0.02, 0.20) * 0.58
    l, r = sub + rush_l, sub + rush_r
    l, r = add_velvet_reverb(l, r, wet=0.16, rt60=0.34, rng=rng)
    master_and_save(f"{out_dir}/ult_cast.wav", l, r, target_peak=0.74, hpf_hz=58.0)

    # 34. DEATH_WARRIOR: Heavy plate armor collapse + steel broadsword clatter on stone
    n = int(1.05 * SR)
    t = np.arange(n) / SR
    fall1 = np.sin(2.0 * np.pi * (140.0 * np.exp(-t / 0.055) + 58.0) * t) * env_ad(n, 0.002, 0.14) * 0.76
    sh1_l, sh1_r = sword_steel_shing(n, 1920.0, 0.18, rng, scrape_intensity=0.75)
    i2 = int(0.32 * SR)
    seg2 = n - i2
    t2 = np.arange(seg2) / SR
    fall2 = np.sin(2.0 * np.pi * (125.0 * np.exp(-t2 / 0.065) + 54.0) * t2) * env_ad(seg2, 0.002, 0.18) * 0.72
    sh2_l, sh2_r = sword_steel_shing(seg2, 2280.0, 0.22, rng, scrape_intensity=0.80)
    l = fall1 + sh1_l * 0.65
    r = fall1 + sh1_r * 0.65
    l[i2:] += fall2 + sh2_l * 0.70
    r[i2:] += fall2 + sh2_r * 0.70
    l, r = add_velvet_reverb(l, r, wet=0.18, rt60=0.42, rng=rng)
    master_and_save(f"{out_dir}/death_warrior.wav", l, r, target_peak=0.80, hpf_hz=58.0)

    # 35. DEATH_MAGE: Dying flame-out hiss + crumbling ember ash
    n = int(1.05 * SR)
    fl_l, fl_r = fire_combustion_layer(n, attack_s=0.015, decay_s=0.38, intensity=0.90, rng=rng, crackle_count=40)
    l, r = add_velvet_reverb(fl_l, fl_r, wet=0.20, rt60=0.45, rng=rng)
    master_and_save(f"{out_dir}/death_mage.wav", l, r, target_peak=0.78, hpf_hz=64.0)

    # 36. DEATH_ARCHER: Dropped wooden bow clatter + fading wind sigh
    n = int(1.00 * SR)
    t = np.arange(n) / SR
    bow_drop = karplus_strong_pluck(n, 138.0, decay=0.982, brightness=0.50, rng=rng) * env_ad(n, 0.002, 0.22) * 0.72
    wood_thud = np.sin(2.0 * np.pi * (165.0 * np.exp(-t / 0.035) + 70.0) * t) * env_ad(n, 0.001, 0.05) * 0.65
    sigh = swept_bandpass(pink_noise(n, rng), 820.0 * np.exp(-t / 0.38) + 220.0, q=1.8) * env_ad(n, 0.02, 0.38) * 0.58
    l, r = bow_drop + wood_thud + sigh, bow_drop + wood_thud + sigh * 0.95
    l, r = add_velvet_reverb(l, r, wet=0.18, rt60=0.42, rng=rng)
    master_and_save(f"{out_dir}/death_archer.wav", l, r, target_peak=0.78, hpf_hz=64.0)

    # 37. DEATH_PRIESTESS: Golden staff drop + fading sanctuary crystal bell sigh (phase-pure)
    n = int(1.05 * SR)
    t = np.arange(n) / SR
    staff_thud = np.sin(2.0 * np.pi * (150.0 * np.exp(-t / 0.04) + 66.0) * t) * env_ad(n, 0.0015, 0.06) * 0.62
    c1_l, c1_r = crystal_bell_chime(n, 587.33, 0.36, brightness=0.85)
    c2_l, c2_r = crystal_bell_chime(n, 440.00, 0.42, brightness=0.80)
    pad = warm_chord_note(n, 293.66, 0.03, 0.45, brightness=0.75) * 0.25
    l = staff_thud + c1_l * 0.38 + c2_l * 0.32 + pad
    r = staff_thud + c1_r * 0.38 + c2_r * 0.32 + pad * 0.96
    l, r = add_velvet_reverb(l, r, wet=0.24, rt60=0.52, rng=rng)
    master_and_save(f"{out_dir}/death_priestess.wav", l, r, target_peak=0.78, hpf_hz=64.0)

    # 38. VICTORY_FANFARE: Studio Orchestral Brass, Timpani & Celesta Triumphal Cadence (Exact Concert Pitch D-Major)
    # Zero detuned Karplus-Strong plucks, zero vibrato wobble, zero tanh intermodulation distortion!
    n = int(2.25 * SR)
    l = np.zeros(n, dtype=np.float64)
    r = np.zeros(n, dtype=np.float64)

    # Heralding Brass Arpeggio: D4 (0.00s) -> F#4 (0.14s) -> A4 (0.28s) -> Grand D-Major Resolution Chord (0.44s)
    brass_notes = [
        # (start_s, freq_hz, attack_s, sustain_s, release_s, amp, pan_l, pan_r)
        (0.00, 293.66, 0.012, 0.10, 0.14, 0.36, 0.90, 0.75),  # D4
        (0.14, 369.99, 0.012, 0.10, 0.14, 0.36, 0.75, 0.90),  # F#4
        (0.28, 440.00, 0.012, 0.11, 0.15, 0.38, 0.88, 0.82),  # A4
        # Grand Triumphal D-Major Resolution at 0.44s (D3 bass + D4 + A4 + F#5 + D5 lead trumpet)
        (0.44, 146.83, 0.018, 0.55, 0.65, 0.34, 0.85, 0.85),  # D3 Tuba/Trombone root
        (0.44, 293.66, 0.016, 0.55, 0.65, 0.32, 0.92, 0.78),  # D4 French Horn
        (0.44, 440.00, 0.016, 0.55, 0.65, 0.30, 0.78, 0.92),  # A4 French Horn fifth
        (0.44, 587.33, 0.015, 0.58, 0.68, 0.40, 0.88, 0.88),  # D5 Lead Trumpet octave
        (0.44, 739.99, 0.018, 0.52, 0.62, 0.24, 0.80, 0.95),  # F#5 Major tenth crown
    ]
    for dt_s, freq, att_s, sus_s, rel_s, amp, pl_g, pr_g in brass_notes:
        i0 = int(dt_s * SR)
        seg = n - i0
        v = orchestral_brass_voice(seg, freq, att_s, sus_s, rel_s) * amp
        l[i0:] += v * pl_g
        r[i0:] += v * pr_g

    # Crystalline Celesta Chime accents on each herald note + grand chord
    chime_notes = [
        (0.00, 587.33, 0.22, 0.22),
        (0.14, 739.99, 0.22, 0.22),
        (0.28, 880.00, 0.24, 0.24),
        (0.44, 1174.66, 0.65, 0.30),
        (0.44, 1760.00, 0.55, 0.18),
    ]
    for dt_s, freq, dec_s, amp in chime_notes:
        i0 = int(dt_s * SR)
        seg = n - i0
        cl, cr = crystal_bell_chime(seg, freq, dec_s, brightness=0.90)
        l[i0:] += cl * amp
        r[i0:] += cr * amp

    # Orchestral Timpani Strikes at t=0.00s (A2=110Hz pickup) and t=0.44s (D3=146.83Hz resolution downbeat)
    t_pick = timpani_strike(n, 110.00, rng) * 0.38
    l += t_pick
    r += t_pick
    i_down = int(0.44 * SR)
    t_down = timpani_strike(n - i_down, 146.83, rng) * 0.52
    l[i_down:] += t_down
    r[i_down:] += t_down

    l, r = add_velvet_reverb(l, r, wet=0.24, rt60=0.62, rng=rng)
    master_and_save(f"{out_dir}/victory_fanfare.wav", l, r, target_peak=0.82, hpf_hz=55.0, soft_clip=False)

    # 39. SCYTHE_REAP: Deep crescent scythe blade whoosh + resonant dark steel edge slice
    n = int(0.46 * SR)
    t = np.arange(n) / SR
    whoosh = swept_bandpass(pink_noise(n, rng), 920.0 * np.exp(-t / 0.14) + 180.0, q=2.2) * env_ad(n, 0.006, 0.14) * 0.85
    sh_l, sh_r = sword_steel_shing(n, 1680.0, 0.22, rng, scrape_intensity=0.88)
    sub_reap = np.sin(2.0 * np.pi * (145.0 * np.exp(-t / 0.09) + 56.0) * t) * env_ad(n, 0.002, 0.12) * 0.65
    l = whoosh + sh_l * 0.78 + sub_reap
    r = whoosh * 0.95 + sh_r * 0.78 + sub_reap
    l, r = add_velvet_reverb(l, r, wet=0.16, rt60=0.36, rng=rng)
    master_and_save(f"{out_dir}/scythe_reap.wav", l, r, target_peak=0.80, hpf_hz=56.0)

    # 40. CHAIN_HOOK: Metallic iron chain rattle + heavy spiked hook latch clank
    n = int(0.55 * SR)
    t = np.arange(n) / SR
    l = np.zeros(n, dtype=np.float64)
    r = np.zeros(n, dtype=np.float64)
    for link_t, f_base, amp in [(0.00, 2450.0, 0.55), (0.045, 2780.0, 0.62), (0.09, 2320.0, 0.58), (0.14, 1980.0, 0.85)]:
        i0 = int(link_t * SR)
        seg = n - i0
        cl_l, cl_r = sword_steel_shing(seg, f_base, 0.11, rng, scrape_intensity=0.92)
        l[i0:] += cl_l * amp
        r[i0:] += cl_r * amp
    hook_thud = np.sin(2.0 * np.pi * (180.0 * np.exp(-t / 0.045) + 64.0) * t) * env_ad(n, 0.002, 0.09) * 0.70
    l += hook_thud
    r += hook_thud
    l, r = add_velvet_reverb(l, r, wet=0.18, rt60=0.38, rng=rng)
    master_and_save(f"{out_dir}/chain_hook.wav", l, r, target_peak=0.80, hpf_hz=60.0)

    # 41. SOUL_DRAIN: Abyssal Soul Harvest (deep vacuum siphon indraft + sub-bass heart-pulse + dark D-minor resonance)
    n = int(0.66 * SR)
    t = np.arange(n) / SR
    siphon_env = np.sin(np.minimum(1.0, t / 0.45) * np.pi) * np.exp(-t / 0.42)
    siphon_l = swept_bandpass(pink_noise(n, rng), 320.0 + 980.0 * siphon_env, q=2.4) * siphon_env * 0.62
    siphon_r = swept_bandpass(pink_noise(n, rng), 345.0 + 1040.0 * siphon_env, q=2.4) * siphon_env * 0.62
    pulse = np.sin(2.0 * np.pi * (115.0 * np.exp(-t / 0.08) + 52.0) * t) * env_ad(n, 0.004, 0.22) * 0.58
    c1 = warm_chord_note(n, 146.83, 0.025, 0.44, brightness=0.75) * 0.36
    c2 = warm_chord_note(n, 174.61, 0.035, 0.42, brightness=0.72) * 0.28
    c3 = warm_chord_note(n, 220.00, 0.045, 0.44, brightness=0.78) * 0.30
    l = siphon_l + pulse + c1 + c2 * 0.9 + c3 * 1.05
    r = siphon_r + pulse + c1 * 0.96 + c2 * 1.08 + c3 * 0.92
    l, r = add_velvet_reverb(l, r, wet=0.24, rt60=0.50, rng=rng)
    master_and_save(f"{out_dir}/soul_drain.wav", l, r, target_peak=0.78, hpf_hz=54.0)

    # 42. REAPER_ULT: Abyssal Necropolis Funeral Bell Toll + stone mausoleum eruption + colossal scythe execution
    n = int(1.40 * SR)
    t = np.arange(n) / SR
    bell_l, bell_r = cathedral_bronze_bell(n, 146.83, 0.95, rng)  # Deep D3 Necropolis Bronze Bell
    stone_rumble = swept_lowpass(pink_noise(n, rng), 260.0 + 1800.0 * np.exp(-t / 0.26), q=1.2) * env_ad(n, 0.008, 0.42) * 0.58
    sh_l, sh_r = sword_steel_shing(n, 1540.0, 0.32, rng, scrape_intensity=0.88)
    sub_boom = np.sin(2.0 * np.pi * (128.0 * np.exp(-t / 0.14) + 46.0) * t) * env_ad(n, 0.003, 0.38) * 0.72
    l = bell_l * 0.58 + stone_rumble + sh_l * 0.52 + sub_boom
    r = bell_r * 0.58 + stone_rumble * 0.95 + sh_r * 0.52 + sub_boom
    l, r = add_velvet_reverb(l, r, wet=0.26, rt60=0.65, rng=rng)
    master_and_save(f"{out_dir}/reaper_ult.wav", l, r, target_peak=0.86, hpf_hz=50.0)

    # 43. DEATH_REAPER: Heavy scythe drop clatter + fading abyssal wraith sigh
    n = int(1.05 * SR)
    t = np.arange(n) / SR
    scythe_drop_l, scythe_drop_r = sword_steel_shing(n, 1420.0, 0.24, rng, scrape_intensity=0.75)
    wraith_sigh = swept_bandpass(pink_noise(n, rng), 640.0 * np.exp(-t / 0.42) + 160.0, q=2.2) * env_ad(n, 0.02, 0.42) * 0.62
    l = scythe_drop_l * 0.65 + wraith_sigh
    r = scythe_drop_r * 0.65 + wraith_sigh * 0.95
    l, r = add_velvet_reverb(l, r, wet=0.24, rt60=0.50, rng=rng)
    master_and_save(f"{out_dir}/death_reaper.wav", l, r, target_peak=0.78, hpf_hz=58.0)

    # =========================================================================
    # VI. CHRONOMANCER (ZEPHYROS) CLOCKWORK & TEMPORAL FOLEY
    # =========================================================================

    # 44. CLOCK_GEAR: Rapid brass escapement ratchet ticks + spinning bronze saw-gear launch
    n = int(0.42 * SR)
    t = np.arange(n) / SR
    l = np.zeros(n, dtype=np.float64)
    r = np.zeros(n, dtype=np.float64)
    for tick_t, f_tick, amp in [(0.00, 3120.0, 0.72), (0.035, 3480.0, 0.65), (0.070, 3840.0, 0.80), (0.115, 2960.0, 0.58)]:
        i0 = int(tick_t * SR)
        seg = n - i0
        tk_l, tk_r = sword_steel_shing(seg, f_tick, 0.065, rng, scrape_intensity=0.82)
        l[i0:] += tk_l * amp
        r[i0:] += tk_r * amp
    whir = swept_bandpass(pink_noise(n, rng), 980.0 + 720.0 * np.sin(2.0 * np.pi * 9.0 * t), q=3.2) * env_ad(n, 0.006, 0.16) * 0.54
    l += whir
    r += whir * 0.96
    l, r = add_velvet_reverb(l, r, wet=0.14, rt60=0.28, rng=rng)
    master_and_save(f"{out_dir}/clock_gear.wav", l, r, target_peak=0.76, hpf_hz=68.0)

    # 45. CHRONO_HIT: Brass cogwheel crunch + crystalline hourglass glass chime (phase-pure D6/A6)
    n = int(0.42 * SR)
    t = np.arange(n) / SR
    sh_l, sh_r = sword_steel_shing(n, 2640.0, 0.12, rng, scrape_intensity=0.82)
    c1_l, c1_r = crystal_bell_chime(n, 1174.66, 0.16, brightness=0.90)
    c2_l, c2_r = crystal_bell_chime(n, 1760.00, 0.14, brightness=0.85)
    punch = np.sin(2.0 * np.pi * (210.0 * np.exp(-t / 0.038) + 72.0) * t) * env_ad(n, 0.001, 0.07) * 0.68
    l = sh_l * 0.62 + c1_l * 0.42 + c2_l * 0.30 + punch
    r = sh_r * 0.62 + c1_r * 0.42 + c2_r * 0.30 + punch
    l, r = add_velvet_reverb(l, r, wet=0.16, rt60=0.30, rng=rng)
    master_and_save(f"{out_dir}/chrono_hit.wav", l, r, target_peak=0.80, hpf_hz=62.0)

    # 46. TIME_REWIND: Reverse-envelope celestial clockwork harmonic + rising temporal tape sweep
    n = int(0.58 * SR)
    t = np.arange(n) / SR
    rev_env = np.clip((t / 0.42) ** 1.8, 0.0, 1.0) * np.exp(-np.maximum(0.0, t - 0.42) / 0.05)
    sweep_f = 340.0 * np.exp(1.45 * (t / 0.58))
    phase = 2.0 * np.pi * np.cumsum(sweep_f) / SR
    rew_tone = (np.sin(phase) * 0.65 + np.sin(phase * 1.5) * 0.35 + np.sin(phase * 2.0) * 0.22) * rev_env * 0.58
    sand_rush = swept_bandpass(pink_noise(n, rng), 620.0 + 1850.0 * (t / 0.58), q=2.8) * rev_env * 0.46
    l = rew_tone + sand_rush
    r = rew_tone * 0.96 + sand_rush * 1.04
    l, r = add_velvet_reverb(l, r, wet=0.22, rt60=0.42, rng=rng)
    master_and_save(f"{out_dir}/time_rewind.wav", l, r, target_peak=0.76, hpf_hz=64.0)

    # 47. HOURGLASS_TRAP: Heavy brass astrolabe lock + temporal tape-stop deceleration + crystal stasis chime
    n = int(0.68 * SR)
    t = np.arange(n) / SR
    lock_l, lock_r = sword_steel_shing(n, 2180.0, 0.14, rng, scrape_intensity=0.85)
    # Authentic temporal tape-stop pitch deceleration (880Hz -> 146.83Hz)
    tape_f = 146.83 + 733.17 * np.exp(-t / 0.16)
    tape_ph = np.cumsum(2.0 * np.pi * tape_f / SR)
    tape_stop = np.sin(tape_ph) * env_ad(n, 0.004, 0.34) * 0.48
    sand_vortex = swept_bandpass(pink_noise(n, rng), 1480.0 * np.exp(-t / 0.32) + 380.0, q=3.0) * env_ad(n, 0.012, 0.26) * 0.48
    ch1_l, ch1_r = crystal_bell_chime(n, 880.00, 0.34, brightness=0.88)
    ch2_l, ch2_r = crystal_bell_chime(n, 1318.51, 0.30, brightness=0.85)
    l = lock_l * 0.55 + tape_stop + sand_vortex + ch1_l * 0.32 + ch2_l * 0.24
    r = lock_r * 0.55 + tape_stop * 0.96 + sand_vortex * 0.94 + ch1_r * 0.32 + ch2_r * 0.24
    l, r = add_velvet_reverb(l, r, wet=0.22, rt60=0.46, rng=rng)
    master_and_save(f"{out_dir}/hourglass_trap.wav", l, r, target_peak=0.80, hpf_hz=58.0)

    # 48. CHRONO_ULT: 4 crisp grandfather-clock escapement ticks culminating in a colossal Midnight XII Bronze Bell
    n = int(1.45 * SR)
    l = np.zeros(n, dtype=np.float64)
    r = np.zeros(n, dtype=np.float64)
    for idx, (tick_t, f_tick) in enumerate([(0.00, 2850.0), (0.085, 2420.0), (0.17, 2960.0), (0.255, 2540.0)]):
        i0 = int(tick_t * SR)
        seg = n - i0
        tk_l, tk_r = sword_steel_shing(seg, f_tick, 0.055, rng, scrape_intensity=0.82)
        cl, cr = crystal_bell_chime(seg, 1174.66 if idx % 2 == 0 else 880.00, 0.08, brightness=0.85)
        l[i0:] += tk_l * 0.55 + cl * 0.24
        r[i0:] += tk_r * 0.55 + cr * 0.24
    # Massive Midnight XII Clocktower Bronze Bell Strike at t=0.34s (G3 = 196.00 Hz + D4 = 293.66 Hz)
    i_gong = int(0.34 * SR)
    seg_g = n - i_gong
    tg = np.arange(seg_g) / SR
    bell1_l, bell1_r = cathedral_bronze_bell(seg_g, 196.00, 0.95, rng)
    bell2_l, bell2_r = cathedral_bronze_bell(seg_g, 293.66, 0.78, rng)
    sub_boom = np.sin(2.0 * np.pi * (145.0 * np.exp(-tg / 0.12) + 52.0) * tg) * env_ad(seg_g, 0.002, 0.36) * 0.68
    l[i_gong:] += bell1_l * 0.56 + bell2_l * 0.32 + sub_boom
    r[i_gong:] += bell1_r * 0.56 + bell2_r * 0.32 + sub_boom
    l, r = add_velvet_reverb(l, r, wet=0.26, rt60=0.65, rng=rng)
    master_and_save(f"{out_dir}/chrono_ult.wav", l, r, target_peak=0.86, hpf_hz=52.0)

    # 49. DEATH_CHRONO: Unwinding clockwork mainspring deceleration + cracked hourglass chime
    n = int(1.05 * SR)
    t = np.arange(n) / SR
    unwind_f = 920.0 * np.exp(-t / 0.38) + 140.0
    unwind_ph = 2.0 * np.pi * np.cumsum(unwind_f) / SR
    mainspring = np.sin(unwind_ph) * (0.5 + 0.5 * np.sin(2.0 * np.pi * 16.0 * np.exp(-t / 0.45) * t)) * env_ad(n, 0.01, 0.44) * 0.52
    glass_l, glass_r = crystal_bell_chime(n, 1174.66, 0.28, brightness=0.85)
    l = mainspring + glass_l * 0.45
    r = mainspring * 0.96 + glass_r * 0.45
    l, r = add_velvet_reverb(l, r, wet=0.24, rt60=0.50, rng=rng)
    master_and_save(f"{out_dir}/death_chrono.wav", l, r, target_peak=0.78, hpf_hz=58.0)

    print("Successfully forged all 49 studio-grade elemental & weapon foley WAV files in", out_dir)


if __name__ == "__main__":
    generate_all_sfx()

