// Studio-Grade Hybrid WebAudio Sound & SFX Engine
// Combines Real-Time Multi-Oscillator/FM/Noise Procedural Synthesis, Pre-Decoded WAV Transients,
// Gothic Cathedral Impulse Convolution Reverb, Stereo Spatial Panning, and Master Dynamics Processing.

export class AudioManager {
  constructor() {
    this.enabled = true;
    this.ctx = null;
    this.master = null;
    this.dryBus = null;
    this.reverbBus = null;
    this.noiseBuffer = null;
    this.pinkNoiseBuffer = null;
    this.buffers = {};
    this.lastPlayed = {};

    this.volumes = {
      slash: 0.72,
      heavy_cleave: 0.82,
      blade_wave: 0.78,
      storm_leap: 0.80,
      thunder_slam: 0.88,
      clang: 0.75,
      hit_crit: 0.88,
      hurt_hit: 0.68,
      whirlwind: 0.74,
      fireball: 0.74,
      flame_pillar: 0.84,
      solar_beam: 0.92,
      eclipse_charge: 0.84,
      supernova_detonate: 0.96,
      earthshatter: 0.94,
      meteor: 0.86,
      meteor_impact: 0.95,
      blink: 0.76,
      zephyr_flip: 0.74,
      reflect: 0.82,
      skill_cast: 0.76,
      ult_cast: 0.90,
      death_warrior: 0.92,
      death_mage: 0.92,
      death_archer: 0.92,
      victory_fanfare: 0.88,
      footstep_steel: 0.36,
      arrow_shoot: 0.74,
      arrow_hit: 0.76,
      arrow_rain: 0.84,
      archer_ult: 0.92
    };

    this.wavKeys = [
      'slash',
      'clang',
      'hit_crit',
      'whirlwind',
      'fireball',
      'flame_pillar',
      'earthshatter',
      'meteor',
      'meteor_impact',
      'blink',
      'reflect',
      'ult_cast',
      'death_warrior',
      'death_mage',
      'death_archer',
      'victory_fanfare',
      'footstep_steel',
      'arrow_shoot',
      'arrow_hit',
      'arrow_rain',
      'archer_ult'
    ];

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

    // Master Limiter / Dynamics Compressor
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -11;
    comp.knee.value = 10;
    comp.ratio.value = 6;
    comp.attack.value = 0.002;
    comp.release.value = 0.16;

    // Warm Sub-Bass Shelf + Presence EQ
    const lowShelf = this.ctx.createBiquadFilter();
    lowShelf.type = 'lowshelf';
    lowShelf.frequency.value = 110;
    lowShelf.gain.value = 3.5;

    const highShelf = this.ctx.createBiquadFilter();
    highShelf.type = 'highshelf';
    highShelf.frequency.value = 4200;
    highShelf.gain.value = 2.0;

    lowShelf.connect(highShelf);
    highShelf.connect(comp);
    comp.connect(this.ctx.destination);
    this.master = lowShelf;

    // Dry Bus + Gothic Cathedral Convolution Reverb Bus
    this.dryBus = this.ctx.createGain();
    this.dryBus.gain.value = 0.88;
    this.dryBus.connect(this.master);

    this.reverbBus = this.ctx.createGain();
    this.reverbBus.gain.value = 0.24;

    try {
      const convolver = this.ctx.createConvolver();
      convolver.buffer = this.createCathedralImpulse(1.35, 2.8);
      this.reverbBus.connect(convolver);
      convolver.connect(this.master);
    } catch (_) {
      this.reverbBus.connect(this.master);
    }

    this.createNoiseBuffers();
  }

  createCathedralImpulse(durationSec = 1.35, decay = 2.8) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * durationSec);
    const impulse = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const env = Math.pow(1 - t, decay);
        // Early cathedral stone reflections + dark diffused tail
        const early = i < rate * 0.06 && i % Math.floor(rate * 0.011) < 18 ? 0.55 : 0;
        const raw = (Math.random() * 2 - 1) * env + early * (Math.random() * 2 - 1);
        lp = lp * 0.74 + raw * 0.26;
        data[i] = lp * 0.65;
      }
    }
    return impulse;
  }

  createNoiseBuffers() {
    if (!this.ctx) return;
    const rate = this.ctx.sampleRate;
    const len = rate * 2;
    this.noiseBuffer = this.ctx.createBuffer(1, len, rate);
    this.pinkNoiseBuffer = this.ctx.createBuffer(1, len, rate);

    const white = this.noiseBuffer.getChannelData(0);
    const pink = this.pinkNoiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      white[i] = w;
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
    for (const key of this.wavKeys) {
      try {
        const res = await fetch(`assets/sfx/${key}.wav`);
        if (!res.ok) continue;
        const arr = await res.arrayBuffer();
        this.buffers[key] = await this.ctx.decodeAudioData(arr);
      } catch (_) {}
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  createSpatialBus(worldX = null, volume = 0.75, reverbSend = 0.25) {
    const out = this.ctx.createGain();
    out.gain.value = volume;

    if (worldX !== null && typeof this.ctx.createStereoPanner === 'function') {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = Math.max(-0.68, Math.min(0.68, (worldX - 600) / 520));
      out.connect(panner);
      panner.connect(this.dryBus);
      if (reverbSend > 0 && this.reverbBus) {
        const send = this.ctx.createGain();
        send.gain.value = reverbSend;
        panner.connect(send);
        send.connect(this.reverbBus);
      }
    } else {
      out.connect(this.dryBus);
      if (reverbSend > 0 && this.reverbBus) {
        const send = this.ctx.createGain();
        send.gain.value = reverbSend;
        out.connect(send);
        send.connect(this.reverbBus);
      }
    }
    return out;
  }

  // Helper: Pitch-swept oscillator layer
  triggerTone(dest, {
    type = 'sawtooth',
    fStart = 220,
    fEnd = 55,
    duration = 0.25,
    delay = 0,
    gain = 0.35,
    attack = 0.005,
    filterFreq = null,
    filterType = 'lowpass',
    q = 1.0
  }) {
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(16, fStart), t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(16, fEnd), t0 + duration);

    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    if (filterFreq) {
      const flt = this.ctx.createBiquadFilter();
      flt.type = filterType;
      flt.frequency.setValueAtTime(filterFreq, t0);
      flt.Q.value = q;
      osc.connect(flt);
      flt.connect(g);
    } else {
      osc.connect(g);
    }

    g.connect(dest);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  // Helper: Filtered noise burst (whoosh, explosion, fire roar, shatter)
  triggerNoise(dest, {
    pink = false,
    duration = 0.28,
    delay = 0,
    gain = 0.4,
    attack = 0.008,
    fStart = 1800,
    fEnd = 320,
    filterType = 'bandpass',
    q = 1.8
  }) {
    const buf = pink ? this.pinkNoiseBuffer : this.noiseBuffer;
    if (!buf) return;
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    // Random offset into 2s noise buffer so no two bursts are identical
    const startOffset = Math.random() * 1.1;

    const flt = this.ctx.createBiquadFilter();
    flt.type = filterType;
    flt.Q.value = q;
    flt.frequency.setValueAtTime(Math.max(40, fStart), t0);
    flt.frequency.exponentialRampToValueAtTime(Math.max(40, fEnd), t0 + duration);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    src.connect(flt);
    flt.connect(g);
    g.connect(dest);
    src.start(t0, startOffset, duration + 0.03);
  }

  // Helper: Metallic FM Clang / Chime / Bell partial
  triggerMetallicFM(dest, {
    carrierFreq = 580,
    modFreq = 830,
    modIndex = 320,
    duration = 0.26,
    delay = 0,
    gain = 0.28
  }) {
    const t0 = this.ctx.currentTime + delay;
    const car = this.ctx.createOscillator();
    const mod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const outGain = this.ctx.createGain();

    car.type = 'triangle';
    mod.type = 'sine';
    car.frequency.setValueAtTime(carrierFreq, t0);
    car.frequency.exponentialRampToValueAtTime(carrierFreq * 0.82, t0 + duration);
    mod.frequency.setValueAtTime(modFreq, t0);

    modGain.gain.setValueAtTime(modIndex, t0);
    modGain.gain.exponentialRampToValueAtTime(1, t0 + duration * 0.85);

    outGain.gain.setValueAtTime(0.0001, t0);
    outGain.gain.linearRampToValueAtTime(gain, t0 + 0.003);
    outGain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    mod.connect(modGain);
    modGain.connect(car.frequency);
    car.connect(outGain);
    outGain.connect(dest);

    mod.start(t0);
    car.start(t0);
    mod.stop(t0 + duration + 0.02);
    car.stop(t0 + duration + 0.02);
  }

  play(name, worldX = null) {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});

    const now = performance.now();
    const minGap = name === 'footstep_steel' ? 140 : name === 'hurt_hit' ? 75 : 38;
    if (this.lastPlayed[name] && now - this.lastPlayed[name] < minGap) return;
    this.lastPlayed[name] = now;

    const baseVol = this.volumes[name] || 0.72;
    const isBigCinematic =
      name === 'earthshatter' ||
      name === 'meteor_impact' ||
      name === 'supernova_detonate' ||
      name === 'solar_beam' ||
      name === 'archer_ult' ||
      name === 'ult_cast' ||
      name === 'thunder_slam';
    const bus = this.createSpatialBus(worldX, baseVol, isBigCinematic ? 0.45 : 0.22);

    // 1. Trigger Procedural Multi-Layered Synth Patch for Crisp, Dynamic Audio
    try {
      this.synthesizeProceduralLayer(name, bus);
    } catch (_) {}

    // 2. Blend Pre-Decoded WAV Transient Layer (if mapped) for Additional Texture
    const wavFallbackMap = {
      heavy_cleave: 'slash',
      blade_wave: 'slash',
      storm_leap: 'whirlwind',
      thunder_slam: 'earthshatter',
      solar_beam: 'flame_pillar',
      eclipse_charge: 'ult_cast',
      supernova_detonate: 'meteor_impact',
      zephyr_flip: 'blink',
      skill_cast: 'reflect',
      hurt_hit: 'clang'
    };
    const wavKey = this.buffers[name] ? name : wavFallbackMap[name];
    if (wavKey && this.buffers[wavKey]) {
      try {
        const src = this.ctx.createBufferSource();
        src.buffer = this.buffers[wavKey];
        const jitter = isBigCinematic ? 0.04 : 0.1;
        src.playbackRate.value = 1.0 - jitter * 0.5 + Math.random() * jitter;
        const wavGain = this.ctx.createGain();
        wavGain.gain.value = this.buffers[name] ? 0.52 : 0.34;
        src.connect(wavGain);
        wavGain.connect(bus);
        src.start(0);
      } catch (_) {}
    }
  }

  synthesizeProceduralLayer(name, bus) {
    const p = 0.94 + Math.random() * 0.12; // Natural organic pitch variation

    switch (name) {
      case 'slash': {
        // Crisp steel blade air-rip + high metallic edge shimmer
        this.triggerNoise(bus, {
          duration: 0.19,
          gain: 0.48,
          attack: 0.012,
          fStart: 3200 * p,
          fEnd: 420,
          filterType: 'bandpass',
          q: 2.2
        });
        this.triggerTone(bus, {
          type: 'sawtooth',
          fStart: 540 * p,
          fEnd: 110,
          duration: 0.16,
          gain: 0.26,
          filterFreq: 1800
        });
        this.triggerMetallicFM(bus, {
          carrierFreq: 1120 * p,
          modFreq: 1680,
          modIndex: 240,
          duration: 0.14,
          gain: 0.18
        });
        break;
      }

      case 'heavy_cleave': {
        // Heavy greatsword cleave with sub-bass punch and frost-steel ring
        this.triggerTone(bus, {
          type: 'sine',
          fStart: 155 * p,
          fEnd: 36,
          duration: 0.28,
          gain: 0.55
        });
        this.triggerNoise(bus, {
          pink: true,
          duration: 0.26,
          gain: 0.52,
          attack: 0.008,
          fStart: 2400 * p,
          fEnd: 280,
          filterType: 'bandpass',
          q: 1.6
        });
        this.triggerMetallicFM(bus, {
          carrierFreq: 840 * p,
          modFreq: 1290,
          modIndex: 420,
          duration: 0.25,
          gain: 0.28
        });
        break;
      }

      case 'blade_wave': {
        // Supersonic Glacial Crescent Sword-Beam launch
        this.triggerNoise(bus, {
          duration: 0.32,
          gain: 0.46,
          attack: 0.01,
          fStart: 4200 * p,
          fEnd: 680,
          filterType: 'bandpass',
          q: 3.0
        });
        this.triggerTone(bus, {
          type: 'sawtooth',
          fStart: 880 * p,
          fEnd: 240,
          duration: 0.28,
          gain: 0.3,
          filterFreq: 2600
        });
        this.triggerMetallicFM(bus, {
          carrierFreq: 1480 * p,
          modFreq: 2220,
          modIndex: 380,
          duration: 0.26,
          gain: 0.24
        });
        break;
      }

      case 'storm_leap': {
        // Armored tempest rush + runic wind vortex
        this.triggerNoise(bus, {
          pink: true,
          duration: 0.36,
          gain: 0.48,
          attack: 0.02,
          fStart: 620,
          fEnd: 2200 * p,
          filterType: 'bandpass',
          q: 2.0
        });
        this.triggerTone(bus, {
          type: 'triangle',
          fStart: 120,
          fEnd: 380 * p,
          duration: 0.3,
          gain: 0.35
        });
        break;
      }

      case 'thunder_slam': {
        // Devastating lightning-infused runeblade ground impact
        this.triggerTone(bus, {
          type: 'sine',
          fStart: 140,
          fEnd: 28,
          duration: 0.48,
          gain: 0.72
        });
        this.triggerNoise(bus, {
          pink: true,
          duration: 0.45,
          gain: 0.62,
          attack: 0.004,
          fStart: 3200,
          fEnd: 140,
          filterType: 'lowpass',
          q: 1.4
        });
        this.triggerMetallicFM(bus, {
          carrierFreq: 660 * p,
          modFreq: 990,
          modIndex: 540,
          duration: 0.36,
          gain: 0.32
        });
        break;
      }

      case 'clang': {
        // Heavy armor / weapon impact + low punch
        this.triggerTone(bus, {
          type: 'sine',
          fStart: 165 * p,
          fEnd: 42,
          duration: 0.18,
          gain: 0.52
        });
        this.triggerMetallicFM(bus, {
          carrierFreq: 740 * p,
          modFreq: 1140 * p,
          modIndex: 480,
          duration: 0.22,
          gain: 0.38
        });
        this.triggerNoise(bus, {
          duration: 0.12,
          gain: 0.36,
          attack: 0.002,
          fStart: 2800,
          fEnd: 450
        });
        break;
      }

      case 'hit_crit': {
        // Massive critical strike: sub-drop + twin harmonic anvil ring + lightning crack
        this.triggerTone(bus, {
          type: 'sine',
          fStart: 190,
          fEnd: 32,
          duration: 0.34,
          gain: 0.68
        });
        this.triggerMetallicFM(bus, {
          carrierFreq: 980 * p,
          modFreq: 1470 * p,
          modIndex: 620,
          duration: 0.32,
          gain: 0.42
        });
        this.triggerMetallicFM(bus, {
          carrierFreq: 1320 * p,
          modFreq: 1980 * p,
          modIndex: 480,
          duration: 0.28,
          delay: 0.025,
          gain: 0.3
        });
        this.triggerNoise(bus, {
          duration: 0.24,
          gain: 0.5,
          attack: 0.002,
          fStart: 4800,
          fEnd: 320,
          filterType: 'bandpass',
          q: 1.5
        });
        break;
      }

      case 'hurt_hit': {
        // Visceral body/armor stagger thud
        this.triggerTone(bus, {
          type: 'triangle',
          fStart: 135 * p,
          fEnd: 44,
          duration: 0.15,
          gain: 0.46
        });
        this.triggerNoise(bus, {
          pink: true,
          duration: 0.11,
          gain: 0.32,
          attack: 0.002,
          fStart: 1400,
          fEnd: 260
        });
        break;
      }

      case 'whirlwind': {
        // Cyclonic blade-storm pulses
        for (let i = 0; i < 4; i++) {
          this.triggerNoise(bus, {
            duration: 0.18,
            delay: i * 0.12,
            gain: 0.38,
            attack: 0.015,
            fStart: 2600 * p,
            fEnd: 520,
            filterType: 'bandpass',
            q: 2.4
          });
          this.triggerMetallicFM(bus, {
            carrierFreq: (780 + i * 90) * p,
            modFreq: 1170,
            modIndex: 280,
            duration: 0.15,
            delay: i * 0.12,
            gain: 0.2
          });
        }
        break;
      }

      case 'reflect': {
        // Crystalline Aegis spell/arrow parry chime
        this.triggerMetallicFM(bus, {
          carrierFreq: 1560 * p,
          modFreq: 2340 * p,
          modIndex: 520,
          duration: 0.3,
          gain: 0.42
        });
        this.triggerTone(bus, {
          type: 'sine',
          fStart: 880 * p,
          fEnd: 1760 * p,
          duration: 0.22,
          gain: 0.28
        });
        break;
      }

      case 'fireball': {
        // Roaring solar comet ignition + low flame combustion
        this.triggerNoise(bus, {
          pink: true,
          duration: 0.32,
          gain: 0.56,
          attack: 0.015,
          fStart: 1500 * p,
          fEnd: 220,
          filterType: 'lowpass',
          q: 2.2
        });
        this.triggerTone(bus, {
          type: 'sawtooth',
          fStart: 240 * p,
          fEnd: 62,
          duration: 0.28,
          gain: 0.36,
          filterFreq: 900
        });
        break;
      }

      case 'flame_pillar': {
        // Deep volcanic magma eruption + twin harmonic solar choir roar
        this.triggerTone(bus, {
          type: 'sine',
          fStart: 115,
          fEnd: 32,
          duration: 0.52,
          gain: 0.65
        });
        this.triggerNoise(bus, {
          pink: true,
          duration: 0.58,
          gain: 0.62,
          attack: 0.02,
          fStart: 2200,
          fEnd: 180,
          filterType: 'bandpass',
          q: 1.4
        });
        this.triggerTone(bus, {
          type: 'sawtooth',
          fStart: 196 * p,
          fEnd: 98 * p,
          duration: 0.45,
          gain: 0.28,
          filterFreq: 1200
        });
        break;
      }

      case 'solar_beam': {
        // Colossal Heaven-to-Earth Solar Plasma Beam laser roar + harmonic resonance
        this.triggerTone(bus, {
          type: 'sine',
          fStart: 150,
          fEnd: 30,
          duration: 0.72,
          gain: 0.72
        });
        this.triggerTone(bus, {
          type: 'sawtooth',
          fStart: 440 * p,
          fEnd: 110,
          duration: 0.68,
          gain: 0.38,
          filterFreq: 2400
        });
        this.triggerTone(bus, {
          type: 'square',
          fStart: 660 * p,
          fEnd: 165,
          duration: 0.62,
          gain: 0.24,
          filterFreq: 1800
        });
        this.triggerNoise(bus, {
          pink: true,
          duration: 0.7,
          gain: 0.58,
          attack: 0.01,
          fStart: 3600,
          fEnd: 240,
          filterType: 'lowpass',
          q: 1.8
        });
        break;
      }

      case 'supernova_detonate':
      case 'meteor_impact':
      case 'earthshatter': {
        // Cataclysmic Cathedral-Shaking Detonation: Sub-drop + thunder crack + debris rumble
        this.triggerTone(bus, {
          type: 'sine',
          fStart: 135,
          fEnd: 22,
          duration: 0.78,
          gain: 0.82
        });
        this.triggerTone(bus, {
          type: 'triangle',
          fStart: 95,
          fEnd: 26,
          duration: 0.65,
          delay: 0.03,
          gain: 0.54
        });
        this.triggerNoise(bus, {
          pink: true,
          duration: 0.75,
          gain: 0.7,
          attack: 0.004,
          fStart: 3800,
          fEnd: 95,
          filterType: 'lowpass',
          q: 1.5
        });
        if (name === 'earthshatter') {
          // Glacial crystal shatter chimes
          [1240, 1680, 2120].forEach((freq, idx) => {
            this.triggerMetallicFM(bus, {
              carrierFreq: freq * p,
              modFreq: freq * 1.48,
              modIndex: 420,
              duration: 0.32,
              delay: idx * 0.045,
              gain: 0.25
            });
          });
        }
        break;
      }

      case 'meteor':
      case 'eclipse_charge': {
        // Descending orbital scream / cosmic gravity convergence
        this.triggerTone(bus, {
          type: 'sawtooth',
          fStart: name === 'meteor' ? 920 * p : 180,
          fEnd: name === 'meteor' ? 140 : 720 * p,
          duration: 0.52,
          gain: 0.38,
          filterFreq: 2100
        });
        this.triggerNoise(bus, {
          pink: true,
          duration: 0.5,
          gain: 0.45,
          attack: 0.03,
          fStart: 1800,
          fEnd: 320
        });
        break;
      }

      case 'blink':
      case 'zephyr_flip': {
        // Arcane spatial rift warp / acrobatic wind vault
        const f1 = name === 'blink' ? 320 : 480;
        const f2 = name === 'blink' ? 1280 : 1420;
        this.triggerTone(bus, {
          type: 'sine',
          fStart: f1 * p,
          fEnd: f2 * p,
          duration: 0.22,
          gain: 0.38
        });
        this.triggerNoise(bus, {
          duration: 0.24,
          gain: 0.38,
          attack: 0.01,
          fStart: 2800,
          fEnd: 720,
          filterType: 'bandpass',
          q: 2.5
        });
        break;
      }

      case 'arrow_shoot': {
        // Taut recurve bowstring snap + supersonic wind whistle
        this.triggerTone(bus, {
          type: 'triangle',
          fStart: 290 * p,
          fEnd: 78,
          duration: 0.11,
          gain: 0.42
        });
        this.triggerNoise(bus, {
          duration: 0.18,
          gain: 0.44,
          attack: 0.004,
          fStart: 4600 * p,
          fEnd: 1100,
          filterType: 'bandpass',
          q: 3.2
        });
        break;
      }

      case 'arrow_hit': {
        // Crisp bodkin point armor pierce + emerald spark
        this.triggerTone(bus, {
          type: 'sine',
          fStart: 220 * p,
          fEnd: 58,
          duration: 0.13,
          gain: 0.46
        });
        this.triggerMetallicFM(bus, {
          carrierFreq: 1380 * p,
          modFreq: 2070,
          modIndex: 310,
          duration: 0.14,
          gain: 0.26
        });
        break;
      }

      case 'arrow_rain': {
        // Rapid multi-arrow starfall volley cascade
        for (let i = 0; i < 5; i++) {
          this.triggerNoise(bus, {
            duration: 0.14,
            delay: i * 0.055,
            gain: 0.34,
            attack: 0.004,
            fStart: (4200 - i * 250) * p,
            fEnd: 950,
            filterType: 'bandpass',
            q: 2.8
          });
        }
        break;
      }

      case 'archer_ult': {
        // Piercing Astral Dragon-Arrow sonic boom + tempest gale
        this.triggerTone(bus, {
          type: 'sine',
          fStart: 160,
          fEnd: 34,
          duration: 0.58,
          gain: 0.68
        });
        this.triggerTone(bus, {
          type: 'sawtooth',
          fStart: 1240 * p,
          fEnd: 220,
          duration: 0.52,
          gain: 0.36,
          filterFreq: 3200
        });
        this.triggerNoise(bus, {
          duration: 0.6,
          gain: 0.58,
          attack: 0.005,
          fStart: 5200,
          fEnd: 380,
          filterType: 'bandpass',
          q: 1.8
        });
        break;
      }

      case 'skill_cast': {
        // Crisp arcane/runic power activation chord
        [440, 660].forEach((freq, idx) => {
          this.triggerTone(bus, {
            type: 'triangle',
            fStart: freq * p,
            fEnd: freq * 1.25 * p,
            duration: 0.22,
            delay: idx * 0.03,
            gain: 0.24
          });
        });
        break;
      }

      case 'ult_cast': {
        // Dramatic Sanctuary Ultimate Awakening Chord + Sub-Bass Drop
        this.triggerTone(bus, {
          type: 'sine',
          fStart: 110,
          fEnd: 36,
          duration: 0.55,
          gain: 0.62
        });
        [293.66, 440.0, 587.33, 880.0].forEach((freq, idx) => {
          this.triggerTone(bus, {
            type: 'sawtooth',
            fStart: freq,
            fEnd: freq * 1.02,
            duration: 0.46,
            delay: idx * 0.035,
            gain: 0.18,
            filterFreq: 2400
          });
        });
        break;
      }

      case 'footstep_steel': {
        // Soft armored boot clink on cathedral stone
        this.triggerTone(bus, {
          type: 'sine',
          fStart: 95 * p,
          fEnd: 38,
          duration: 0.07,
          gain: 0.34
        });
        this.triggerMetallicFM(bus, {
          carrierFreq: 620 * p,
          modFreq: 940,
          modIndex: 120,
          duration: 0.06,
          gain: 0.12
        });
        break;
      }

      case 'victory_fanfare': {
        // Triumphant Dark-Fantasy Brass/Chime Arpeggio
        const notes = [293.66, 369.99, 440.0, 587.33];
        notes.forEach((freq, idx) => {
          this.triggerTone(bus, {
            type: 'sawtooth',
            fStart: freq,
            fEnd: freq,
            duration: idx === 3 ? 0.75 : 0.28,
            delay: idx * 0.12,
            gain: 0.26,
            filterFreq: 2200
          });
        });
        break;
      }

      default:
        break;
    }
  }
}
