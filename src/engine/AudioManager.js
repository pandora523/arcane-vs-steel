// Zero-Latency Pre-Decoded Stereo WAV Sample Player with Spatial Cathedral Panning
export class AudioManager {
  constructor() {
    this.enabled = true;
    this.ctx = null;
    this.master = null;
    this.buffers = {};
    this.lastPlayed = {};
    this.volumes = {
      slash: 0.64,
      clang: 0.68,
      hit_crit: 0.80,
      whirlwind: 0.65,
      fireball: 0.65,
      flame_pillar: 0.78,
      earthshatter: 0.90,
      meteor: 0.85,
      meteor_impact: 0.94,
      blink: 0.68,
      reflect: 0.76,
      ult_cast: 0.84,
      death_warrior: 0.92,
      death_mage: 0.92,
      victory_fanfare: 0.85,
      footstep_steel: 0.34
    };

    this.initContext();
    this.preloadWavFiles();

    const unlock = () => {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
  }

  initContext() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx({ latencyHint: 'interactive' });
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.knee.value = 12;
    comp.ratio.value = 5;
    comp.attack.value = 0.003;
    comp.release.value = 0.18;
    comp.connect(this.ctx.destination);
    this.master = comp;
  }

  async preloadWavFiles() {
    if (!this.ctx) return;
    for (const key of Object.keys(this.volumes)) {
      try {
        const res = await fetch(`assets/sfx/${key}.wav`);
        const arr = await res.arrayBuffer();
        this.buffers[key] = await this.ctx.decodeAudioData(arr);
      } catch (_) {}
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  play(name, worldX = null) {
    if (!this.enabled || !this.ctx || !this.buffers[name]) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});

    const now = performance.now();
    const minGap = name === 'footstep_steel' ? 140 : 45;
    if (this.lastPlayed[name] && now - this.lastPlayed[name] < minGap) return;
    this.lastPlayed[name] = now;

    try {
      const src = this.ctx.createBufferSource();
      src.buffer = this.buffers[name];
      const pitchJitter = name === 'victory_fanfare' || name === 'ult_cast' ? 0.02 : 0.09;
      src.playbackRate.value = 1.0 - pitchJitter * 0.5 + Math.random() * pitchJitter;

      const gain = this.ctx.createGain();
      gain.gain.value = this.volumes[name] || 0.65;

      src.connect(gain);
      if (worldX !== null && typeof this.ctx.createStereoPanner === 'function') {
        const panner = this.ctx.createStereoPanner();
        panner.pan.value = Math.max(-0.65, Math.min(0.65, (worldX - 600) / 520));
        gain.connect(panner);
        panner.connect(this.master);
      } else {
        gain.connect(this.master);
      }
      src.start(0);
    } catch (_) {}
  }
}
