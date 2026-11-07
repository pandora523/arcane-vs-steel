// Studio-Mastered Acoustic Foley & Spatial Audio Engine
// Plays 31 physically modeled 44.1kHz 16-bit stereo WAV assets (Karplus-Strong bowstrings,
// 10-mode forged steel resonators, aerodynamic whip formants, and orchestral brass/chime chords)
// with spatial stereo panning, voice-stealing/ducking, and a clean 52Hz–11kHz studio master bus.

export class AudioManager {
  constructor() {
    this.enabled = true;
    this.ctx = null;
    this.master = null;
    this.pinkNoiseBuffer = null;
    this.buffers = {};
    this.lastPlayed = {};
    this.activeVoices = [];
    this.lastImpactTime = 0;

    this.volumes = {
      slash: 0.62,
      heavy_cleave: 0.74,
      blade_wave: 0.68,
      storm_leap: 0.70,
      thunder_slam: 0.82,
      clang: 0.68,
      hit_crit: 0.82,
      hurt_hit: 0.45,
      whirlwind: 0.66,
      fireball: 0.66,
      flame_pillar: 0.76,
      solar_beam: 0.84,
      eclipse_charge: 0.72,
      supernova_detonate: 0.88,
      earthshatter: 0.86,
      meteor: 0.68,
      meteor_impact: 0.86,
      blink: 0.64,
      zephyr_flip: 0.64,
      reflect: 0.70,
      skill_cast: 0.56,
      ult_cast: 0.80,
      death_warrior: 0.82,
      death_mage: 0.80,
      death_archer: 0.80,
      victory_fanfare: 0.82,
      footstep_steel: 0.22,
      arrow_shoot: 0.64,
      arrow_hit: 0.66,
      arrow_rain: 0.72,
      archer_ult: 0.84
    };

    this.wavKeys = Object.keys(this.volumes);

    this.initContext();
    this.preloadWavFiles();

    const unlock = () => {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
  }

  initContext() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx({ latencyHint: 'interactive' });

    // 1. Clean 52Hz High-Pass Filter (eliminates sub-bass rumble on phone/laptop speakers)
    const hpf = this.ctx.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.value = 52;
    hpf.Q.value = 0.707;

    // 2. Warm 10.5kHz Silk Low-Pass Filter (prevents any digital fizz or harshness)
    const lpf = this.ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 10500;
    lpf.Q.value = 0.707;

    // 3. Transparent Studio Peak Limiter (gentle ratio, no pumping)
    const limiter = this.ctx.createDynamicsCompressor();
    limiter.threshold.value = -4.5;
    limiter.knee.value = 6;
    limiter.ratio.value = 4.0;
    limiter.attack.value = 0.004;
    limiter.release.value = 0.12;

    // 4. Master Output Gain
    const masterGain = this.ctx.createGain();
    masterGain.gain.value = 0.86;

    hpf.connect(lpf);
    lpf.connect(limiter);
    limiter.connect(masterGain);
    masterGain.connect(this.ctx.destination);
    this.master = hpf;

    this.createPinkNoiseBuffer();
  }

  createPinkNoiseBuffer() {
    if (!this.ctx) return;
    const rate = this.ctx.sampleRate;
    const len = rate * 2;
    this.pinkNoiseBuffer = this.ctx.createBuffer(1, len, rate);
    const pink = this.pinkNoiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520;
      b3 = 0.86650 * b3 + w * 0.3104856;
      b4 = 0.55000 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.0168980;
      pink[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  }

  async preloadWavFiles() {
    if (!this.ctx) return;
    await Promise.all(
      this.wavKeys.map(async (key) => {
        try {
          const res = await fetch(`assets/sfx/${key}.wav`);
          if (!res.ok) return;
          const arr = await res.arrayBuffer();
          this.buffers[key] = await this.ctx.decodeAudioData(arr);
        } catch (_) {}
      })
    );
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  play(name, worldX = null) {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});

    const now = performance.now();

    // Prevent same-frame impact collisions: if a weapon/spell impact just played,
    // skip redundant hurt_hit thuds so low frequencies never stack or clip.
    const isImpact =
      name === 'clang' ||
      name === 'heavy_cleave' ||
      name === 'arrow_hit' ||
      name === 'hit_crit' ||
      name === 'thunder_slam' ||
      name === 'meteor_impact' ||
      name === 'earthshatter' ||
      name === 'supernova_detonate' ||
      name === 'solar_beam' ||
      name === 'archer_ult';

    if (isImpact) {
      this.lastImpactTime = now;
    } else if (name === 'hurt_hit' && now - this.lastImpactTime < 110) {
      return;
    }

    // Per-sound cooldowns to prevent rapid machine-gun overlapping
    const minGap =
      name === 'footstep_steel'
        ? 220
        : name === 'hurt_hit'
          ? 140
          : name === 'meteor' || name === 'meteor_impact'
            ? 110
            : 58;
    if (this.lastPlayed[name] && now - this.lastPlayed[name] < minGap) return;
    this.lastPlayed[name] = now;

    const isBigCinematic =
      name === 'earthshatter' ||
      name === 'meteor_impact' ||
      name === 'supernova_detonate' ||
      name === 'solar_beam' ||
      name === 'archer_ult' ||
      name === 'ult_cast' ||
      name === 'thunder_slam';

    // Duck older voices slightly when a major cinematic sound arrives
    this.pruneAndDuckVoices(now, isBigCinematic);

    const baseVol = this.volumes[name] || 0.65;
    const voiceGain = this.ctx.createGain();
    voiceGain.gain.setValueAtTime(baseVol, this.ctx.currentTime);

    // Subtle per-voice warm lowpass filter for organic distance & timbre variation
    const warmthFilter = this.ctx.createBiquadFilter();
    warmthFilter.type = 'lowpass';
    warmthFilter.frequency.value = isBigCinematic ? 9200 : 7600 + Math.random() * 1600;
    warmthFilter.Q.value = 0.65;

    voiceGain.connect(warmthFilter);

    if (worldX !== null && typeof this.ctx.createStereoPanner === 'function') {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = Math.max(-0.55, Math.min(0.55, (worldX - 800) / 700));
      warmthFilter.connect(panner);
      panner.connect(this.master);
    } else {
      warmthFilter.connect(this.master);
    }

    // Play the studio-mastered 44.1kHz stereo acoustic WAV buffer
    const buf = this.buffers[name];
    if (buf) {
      try {
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const rateSpread = isBigCinematic ? 0.03 : 0.07;
        src.playbackRate.value = 1.0 - rateSpread * 0.5 + Math.random() * rateSpread;
        src.connect(voiceGain);
        src.start(0);

        const voiceEntry = { gainNode: voiceGain, startTime: now, isBig: isBigCinematic };
        this.activeVoices.push(voiceEntry);
        src.onended = () => {
          const idx = this.activeVoices.indexOf(voiceEntry);
          if (idx !== -1) this.activeVoices.splice(idx, 1);
        };
        return;
      } catch (_) {}
    }

    // Warm, non-harsh fallback only if triggered in the first ~50ms before WAVs finish decoding
    this.playWarmFallback(name, voiceGain);
  }

  pruneAndDuckVoices(now, incomingIsBig) {
    // Clean up finished voices older than 2.2s
    for (let i = this.activeVoices.length - 1; i >= 0; i--) {
      if (now - this.activeVoices[i].startTime > 2200) {
        this.activeVoices.splice(i, 1);
      }
    }

    // If too many voices are active simultaneously, smoothly fade the oldest non-big voice
    while (this.activeVoices.length > 7) {
      const oldest = this.activeVoices.shift();
      if (oldest && oldest.gainNode) {
        try {
          const t = this.ctx.currentTime;
          oldest.gainNode.gain.setTargetAtTime(0.0001, t, 0.035);
        } catch (_) {}
      }
    }

    // Duck background combat hits slightly when an Ultimate or Big Impact fires
    if (incomingIsBig && this.ctx) {
      const t = this.ctx.currentTime;
      for (const v of this.activeVoices) {
        if (!v.isBig && v.gainNode) {
          try {
            v.gainNode.gain.setTargetAtTime(v.gainNode.gain.value * 0.55, t, 0.025);
          } catch (_) {}
        }
      }
    }
  }

  playWarmFallback(name, dest) {
    if (!this.ctx || !this.pinkNoiseBuffer) return;
    const t0 = this.ctx.currentTime;

    // Gentle filtered pink-noise air whoosh + soft sine fundamental (zero sawtooth/square buzz)
    const src = this.ctx.createBufferSource();
    src.buffer = this.pinkNoiseBuffer;
    const flt = this.ctx.createBiquadFilter();
    flt.type = 'bandpass';
    flt.Q.value = 1.4;
    flt.frequency.setValueAtTime(900, t0);
    flt.frequency.exponentialRampToValueAtTime(320, t0 + 0.22);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, t0);
    g.gain.linearRampToValueAtTime(0.32, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);

    src.connect(flt);
    flt.connect(g);
    g.connect(dest);
    src.start(t0, Math.random() * 0.8, 0.24);
  }
}
