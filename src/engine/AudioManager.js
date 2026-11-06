// Zero-Latency Pre-Decoded WAV Sample Player (No Oscillator synth, zero main-thread lag)
export class AudioManager {
  constructor() {
    this.enabled = true;
    this.ctx = null;
    this.master = null;
    this.buffers = {};
    this.lastPlayed = {};
    this.volumes = {
      slash: 0.55,
      clang: 0.65,
      whirlwind: 0.55,
      fireball: 0.6,
      flame_pillar: 0.72,
      earthshatter: 0.85,
      meteor: 0.88
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
    comp.threshold.value = -12;
    comp.ratio.value = 6;
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

  play(name) {
    if (!this.enabled || !this.ctx || !this.buffers[name]) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});

    const now = performance.now();
    if (this.lastPlayed[name] && now - this.lastPlayed[name] < 75) return;
    this.lastPlayed[name] = now;

    try {
      const src = this.ctx.createBufferSource();
      src.buffer = this.buffers[name];
      src.playbackRate.value = 0.94 + Math.random() * 0.12;

      const gain = this.ctx.createGain();
      gain.gain.value = this.volumes[name] || 0.6;

      src.connect(gain);
      gain.connect(this.master);
      src.start(0);
    } catch (_) {}
  }
}
