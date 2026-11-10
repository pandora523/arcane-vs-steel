// Studio Physical-Foley & Anime Combat VFX Audio Engine
// Plays 69 dedicated 44.1kHz 16-bit stereo physical-foley WAV assets (zero musical chords/synths):
// - TEMPERED STEEL & RONIN IAIDO: Aerodynamic blade air-cuts, friction-excited steel edge slices,
//   steel-on-steel parry sparks, high-voltage Raijin arcs, and visceral counter-hit sub-drops.
// - BOW & TEMPEST WIND: Dry recurve bowstring snaps, bodkin penetration thwacks, arrow-rain salvos,
//   and supersonic wind-vortex sonic booms.
// - PYROMANCY, CRYOMANCY & RADIANT LIGHT: Pressurized napalm roars, seismic meteor impacts,
//   sub-zero glacier crystal shatters, and Lux-style prismatic laser cannon discharges.
// - ABYSSAL, HOROLOGY, WORLD-FORGE & CYBER: Iron chain whip-cracks, warped 'Eternal Zero'
//   time-stop tape plunges, stained-glass clockface shatters, anvil slams, and plasma railguns.

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
      // Tempered Steel & Paladin
      slash: 0.70,
      heavy_cleave: 0.80,
      blade_wave: 0.74,
      clang: 0.78,
      parry_clang: 0.82,
      reflect: 0.76,
      hit_crit: 0.88,
      hurt_hit: 0.44,
      footstep_steel: 0.22,

      // Storm Ronin & Mobility
      raijin_slash: 0.78,
      dash_whoosh: 0.68,
      storm_leap: 0.72,
      blink: 0.70,

      // Bow & Tempest Wind
      arrow_shoot: 0.72,
      arrow_hit: 0.80,
      arrow_rain: 0.76,
      zephyr_flip: 0.68,
      archer_ult: 0.86,

      // Pyromancy & Astral Meteor
      fireball: 0.75,
      fire_hit: 0.80,
      flame_pillar: 0.80,
      eclipse_charge: 0.74,
      solar_beam: 0.86,
      meteor: 0.74,
      meteor_impact: 0.88,
      supernova_detonate: 0.90,

      // Radiant Light / Seraphina
      holy_bolt: 0.70,
      holy_hit: 0.76,
      holy_heal: 0.76,
      holy_smite: 0.80,
      final_grace_charge: 0.76,
      final_grace_beam: 0.88,
      priestess_ult: 0.88,

      // Valkyrie Sky-Lance
      holy_spear: 0.76,
      dragon_dive: 0.88,

      // Cryomancy / Lyra
      frost_cast: 0.72,
      ice_shatter: 0.82,
      prism_beam: 0.84,

      // Abyssal Reaper
      scythe_reap: 0.78,
      chain_hook: 0.80,
      soul_drain: 0.76,
      reaper_ult: 0.88,

      // Chronos / Horology
      clock_gear: 0.74,
      chrono_hit: 0.78,
      hourglass_trap: 0.80,
      time_rewind: 0.78,
      chrono_ult: 0.88,
      time_stop: 0.88,
      time_shatter: 0.90,

      // Titan World-Forge
      thunder_slam: 0.84,
      earthshatter: 0.88,
      whirlwind: 0.74,

      // Cyber Android VEX-09
      cyber_slash: 0.76,
      emp_blast: 0.84,
      cyber_beam: 0.88,

      // Universal Cast, Victory & Champion Deaths
      skill_cast: 0.58,
      ult_cast: 0.82,
      victory_fanfare: 0.84,
      death_warrior: 0.82,
      death_titan: 0.84,
      death_ronin: 0.80,
      death_mage: 0.80,
      death_archer: 0.80,
      death_priestess: 0.80,
      death_valkyrie: 0.82,
      death_icemage: 0.80,
      death_reaper: 0.82,
      death_chrono: 0.82,
      death_android: 0.82
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

    // 1. Clean 36Hz High-Pass Filter (preserves 38-55Hz cinematic sub-drops while blocking DC/rumble)
    const hpf = this.ctx.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.value = 36;
    hpf.Q.value = 0.707;

    // 2. Wide 16.5kHz Studio Low-Pass Filter (preserves crisp katana shing, crystal shatter & electric arcs)
    const lpf = this.ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 16500;
    lpf.Q.value = 0.707;

    // 3. Transparent Studio Peak Limiter (gentle ratio, fast transient catch, zero pumping)
    const limiter = this.ctx.createDynamicsCompressor();
    limiter.threshold.value = -3.5;
    limiter.knee.value = 6;
    limiter.ratio.value = 4.0;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.11;

    // 4. Master Output Gain
    const masterGain = this.ctx.createGain();
    masterGain.gain.value = 0.90;

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
          const res = await fetch(`assets/sfx/${key}.wav?v=sfx3`);
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
      death_knight: 'death_warrior'
    };
    const name = aliasMap[rawName] || rawName;

    const now = performance.now();

    // Prevent same-frame impact collisions: if a weapon/elemental impact just played,
    // skip redundant hurt_hit thuds so each element's impact foley stays 100% distinct.
    const isImpact =
      name === 'clang' ||
      name === 'parry_clang' ||
      name === 'heavy_cleave' ||
      name === 'raijin_slash' ||
      name === 'holy_spear' ||
      name === 'dragon_dive' ||
      name === 'scythe_reap' ||
      name === 'chain_hook' ||
      name === 'chrono_hit' ||
      name === 'hourglass_trap' ||
      name === 'time_shatter' ||
      name === 'ice_shatter' ||
      name === 'cyber_slash' ||
      name === 'emp_blast' ||
      name === 'cyber_beam' ||
      name === 'arrow_hit' ||
      name === 'fire_hit' ||
      name === 'holy_hit' ||
      name === 'holy_smite' ||
      name === 'hit_crit' ||
      name === 'thunder_slam' ||
      name === 'meteor_impact' ||
      name === 'earthshatter' ||
      name === 'supernova_detonate' ||
      name === 'solar_beam' ||
      name === 'prism_beam' ||
      name === 'final_grace_beam' ||
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
            : 48;
    if (this.lastPlayed[name] && now - this.lastPlayed[name] < minGap) return;
    this.lastPlayed[name] = now;

    const isBigCinematic =
      name === 'earthshatter' ||
      name === 'meteor_impact' ||
      name === 'supernova_detonate' ||
      name === 'solar_beam' ||
      name === 'prism_beam' ||
      name === 'dragon_dive' ||
      name === 'emp_blast' ||
      name === 'cyber_beam' ||
      name === 'final_grace_beam' ||
      name === 'archer_ult' ||
      name === 'priestess_ult' ||
      name === 'reaper_ult' ||
      name === 'chrono_ult' ||
      name === 'time_stop' ||
      name === 'time_shatter' ||
      name === 'ult_cast' ||
      name === 'thunder_slam';

    const isMatchEndSound = name === 'victory_fanfare' || name.startsWith('death_');

    // Duck older voices when a major cinematic sound arrives, or fade out combat voices on match end
    this.pruneAndDuckVoices(now, isBigCinematic, isMatchEndSound);

    const baseVol = this.volumes[name] || 0.70;
    const voiceGain = this.ctx.createGain();
    voiceGain.gain.setValueAtTime(baseVol, this.ctx.currentTime);

    // Full-bandwidth natural studio air filter
    const warmthFilter = this.ctx.createBiquadFilter();
    warmthFilter.type = 'lowpass';
    warmthFilter.frequency.value = isBigCinematic || isMatchEndSound ? 16400 : 14600 + Math.random() * 1800;
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

    // Play the studio-mastered 44.1kHz stereo physical-foley WAV buffer
    const buf = this.buffers[name];
    if (buf) {
      try {
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        // Subtle organic foley variation on repeatable attacks; exact 1.0x timing on ultimates & match end
        const rateSpread = isBigCinematic || isMatchEndSound ? 0.0 : 0.045;
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

    // Punchy physical transient + swept turbulence fallback if triggered in the first ~30ms before WAV decode
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

    while (this.activeVoices.length > 8) {
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

    // 1. Swept aerodynamic / elemental noise burst (zero stationary tone)
    const src = this.ctx.createBufferSource();
    src.buffer = this.pinkNoiseBuffer;
    src.playbackRate.value = 0.92 + Math.random() * 0.22;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    const isSharp =
      name.includes('slash') ||
      name.includes('clang') ||
      name.includes('ice') ||
      name.includes('frost') ||
      name.includes('cyber') ||
      name.includes('holy') ||
      name.includes('arrow');
    const fStart = isSharp ? 3400 : name.includes('fire') || name.includes('meteor') ? 1350 : 2200;
    const fEnd = isSharp ? 720 : 280;
    bp.frequency.setValueAtTime(fStart, t);
    bp.frequency.exponentialRampToValueAtTime(fEnd, t + 0.16);
    bp.Q.value = isSharp ? 1.8 : 1.1;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.42, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    src.connect(bp);
    bp.connect(g);
    g.connect(dest);
    src.start(t);
    src.stop(t + 0.19);

    // 2. Crisp 18ms physical transient snap + fast sub-punch drop (125Hz -> 42Hz)
    const punchOsc = this.ctx.createOscillator();
    const punchGain = this.ctx.createGain();
    punchOsc.type = 'triangle';
    punchOsc.frequency.setValueAtTime(125, t);
    punchOsc.frequency.exponentialRampToValueAtTime(42, t + 0.075);
    punchGain.gain.setValueAtTime(0.28, t);
    punchGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    punchOsc.connect(punchGain);
    punchGain.connect(dest);
    punchOsc.start(t);
    punchOsc.stop(t + 0.085);
  }
}
