// Realistic Elemental & Weapon Foley Audio Engine
// Plays 38 physically modeled 44.1kHz 16-bit stereo WAV assets:
// - SWORD & STEEL: High-velocity blade air-whips ("SWISH"), friction-excited tempered steel edge
//   scrapes ("SHING" at 2.4kHz-9.5kHz), and visceral armor/body impact thuds.
// - ARROW & BOW: Taut recurve bowstring snap, wooden shaft click, supersonic fletching air-zip,
//   and authentic bodkin "THWACK / THUNK" leather/wood penetration + damped wooden shaft shudder.
// - FIRE & PYROMANCY: Explosive gas/torch ignition ("FWOOSH"), turbulent combustion roar,
//   searing thermal hiss, and crackling charcoal/ember snaps for both cast and impact (`fire_hit`).
// - HOLY LIGHT & HEALING: Crystalline prism shimmer, angelic harp strings, and sanctuary resonance.

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
      slash: 0.68,
      heavy_cleave: 0.78,
      blade_wave: 0.72,
      storm_leap: 0.70,
      thunder_slam: 0.82,
      clang: 0.76,
      hit_crit: 0.84,
      hurt_hit: 0.42,
      whirlwind: 0.72,
      fireball: 0.74,
      fire_hit: 0.78,
      flame_pillar: 0.78,
      solar_beam: 0.84,
      eclipse_charge: 0.72,
      supernova_detonate: 0.88,
      earthshatter: 0.86,
      meteor: 0.72,
      meteor_impact: 0.86,
      blink: 0.68,
      zephyr_flip: 0.68,
      reflect: 0.74,
      skill_cast: 0.56,
      ult_cast: 0.80,
      death_warrior: 0.82,
      death_mage: 0.80,
      death_archer: 0.80,
      death_priestess: 0.80,
      victory_fanfare: 0.82,
      footstep_steel: 0.22,
      arrow_shoot: 0.72,
      arrow_hit: 0.80,
      arrow_rain: 0.74,
      archer_ult: 0.84,
      holy_bolt: 0.68,
      holy_hit: 0.74,
      holy_heal: 0.76,
      holy_smite: 0.78,
      priestess_ult: 0.84,
      scythe_reap: 0.78,
      chain_hook: 0.80,
      soul_drain: 0.74,
      reaper_ult: 0.86,
      death_reaper: 0.80,
      clock_gear: 0.74,
      chrono_hit: 0.78,
      time_rewind: 0.76,
      hourglass_trap: 0.80,
      chrono_ult: 0.86,
      death_chrono: 0.80
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

    // 2. Wide 15.5kHz Studio Low-Pass Filter (preserves crisp sword shing, arrow thwack & fire crackle)
    const lpf = this.ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 15500;
    lpf.Q.value = 0.707;

    // 3. Transparent Studio Peak Limiter (gentle ratio, no pumping)
    const limiter = this.ctx.createDynamicsCompressor();
    limiter.threshold.value = -4.0;
    limiter.knee.value = 6;
    limiter.ratio.value = 4.0;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.12;

    // 4. Master Output Gain
    const masterGain = this.ctx.createGain();
    masterGain.gain.value = 0.88;

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
          const res = await fetch(`assets/sfx/${key}.wav?v=2`);
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

  play(rawName, worldX = null) {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});

    const aliasMap = {
      holy_spear: 'holy_smite',
      dash_whoosh: 'storm_leap',
      parry_clang: 'reflect',
      raijin_slash: 'blade_wave',
      dragon_dive: 'earthshatter',
      death_knight: 'death_warrior',
      death_titan: 'death_warrior',
      death_ronin: 'death_warrior',
      death_valkyrie: 'death_priestess'
    };
    const name = aliasMap[rawName] || rawName;

    const now = performance.now();

    // Prevent same-frame impact collisions: if a weapon/elemental impact just played,
    // skip redundant hurt_hit thuds so each element's impact foley stays 100% distinct.
    const isImpact =
      name === 'clang' ||
      name === 'heavy_cleave' ||
      name === 'scythe_reap' ||
      name === 'chain_hook' ||
      name === 'chrono_hit' ||
      name === 'hourglass_trap' ||
      name === 'arrow_hit' ||
      name === 'fire_hit' ||
      name === 'holy_hit' ||
      name === 'hit_crit' ||
      name === 'thunder_slam' ||
      name === 'meteor_impact' ||
      name === 'earthshatter' ||
      name === 'supernova_detonate' ||
      name === 'solar_beam' ||
      name === 'archer_ult' ||
      name === 'priestess_ult' ||
      name === 'reaper_ult' ||
      name === 'chrono_ult';

    if (isImpact) {
      this.lastImpactTime = now;
    } else if (name === 'hurt_hit' && now - this.lastImpactTime < 120) {
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
            : 52;
    if (this.lastPlayed[name] && now - this.lastPlayed[name] < minGap) return;
    this.lastPlayed[name] = now;

    const isBigCinematic =
      name === 'earthshatter' ||
      name === 'meteor_impact' ||
      name === 'supernova_detonate' ||
      name === 'solar_beam' ||
      name === 'archer_ult' ||
      name === 'priestess_ult' ||
      name === 'reaper_ult' ||
      name === 'chrono_ult' ||
      name === 'ult_cast' ||
      name === 'thunder_slam';

    const isTonalOrCinematic =
      isBigCinematic ||
      name === 'victory_fanfare' ||
      name === 'holy_bolt' ||
      name === 'holy_hit' ||
      name === 'holy_heal' ||
      name === 'holy_smite' ||
      name === 'soul_drain' ||
      name === 'chrono_hit' ||
      name === 'time_rewind' ||
      name === 'hourglass_trap' ||
      name === 'skill_cast';

    const isMatchEndSound = name === 'victory_fanfare' || name.startsWith('death_');

    // Duck older voices when a major cinematic sound arrives, or fade out combat voices on match end
    this.pruneAndDuckVoices(now, isBigCinematic, isMatchEndSound);

    const baseVol = this.volumes[name] || 0.68;
    const voiceGain = this.ctx.createGain();
    voiceGain.gain.setValueAtTime(baseVol, this.ctx.currentTime);

    // Full-bandwidth natural air filter
    const warmthFilter = this.ctx.createBiquadFilter();
    warmthFilter.type = 'lowpass';
    warmthFilter.frequency.value = isTonalOrCinematic ? 15500 : 13500 + Math.random() * 1800;
    warmthFilter.Q.value = 0.65;

    voiceGain.connect(warmthFilter);

    if (worldX !== null && name !== 'victory_fanfare' && typeof this.ctx.createStereoPanner === 'function') {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = Math.max(-0.48, Math.min(0.48, (worldX - 600) / 650));
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
        // Never detune tonal, ultimate, or victory fanfare sounds!
        const rateSpread = isTonalOrCinematic || isMatchEndSound ? 0.0 : 0.035;
        src.playbackRate.value =
          rateSpread > 0 ? 1.0 - rateSpread * 0.5 + Math.random() * rateSpread : 1.0;
        src.connect(voiceGain);
        src.start(0);

        const voiceEntry = { gainNode: voiceGain, startTime: now, isBig: isBigCinematic, name };
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

  pruneAndDuckVoices(now, incomingIsBig, isMatchEndSound = false) {
    for (let i = this.activeVoices.length - 1; i >= 0; i--) {
      if (now - this.activeVoices[i].startTime > 2200) {
        this.activeVoices.splice(i, 1);
      }
    }

    if (isMatchEndSound) {
      const t = this.ctx.currentTime;
      while (this.activeVoices.length > 0) {
        const v = this.activeVoices.shift();
        if (v && v.gainNode) {
          try {
            v.gainNode.gain.setValueAtTime(v.gainNode.gain.value, t);
            v.gainNode.gain.exponentialRampToValueAtTime(0.0008, t + 0.06);
          } catch (_) {}
        }
      }
      return;
    }

    while (this.activeVoices.length > 7) {
      const oldest = this.activeVoices.shift();
      if (oldest && oldest.gainNode) {
        try {
          const t = this.ctx.currentTime;
          oldest.gainNode.gain.setValueAtTime(oldest.gainNode.gain.value, t);
          oldest.gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
        } catch (_) {}
      }
    }

    if (incomingIsBig) {
      const t = this.ctx.currentTime;
      for (const v of this.activeVoices) {
        if (!v.isBig && v.gainNode) {
          try {
            const cur = v.gainNode.gain.value;
            v.gainNode.gain.setValueAtTime(cur, t);
            v.gainNode.gain.linearRampToValueAtTime(cur * 0.45, t + 0.035);
          } catch (_) {}
        }
      }
    }
  }

  playWarmFallback(name, dest) {
    if (!this.ctx || !this.pinkNoiseBuffer) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.pinkNoiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(name.includes('arrow') ? 1600 : name.includes('fire') ? 680 : 1200, t);
    bp.Q.value = 1.4;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.28, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    src.connect(bp);
    bp.connect(g);
    g.connect(dest);
    src.start(t);
    src.stop(t + 0.17);
  }
}
