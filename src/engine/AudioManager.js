// Sample-Based HTML5 Audio Manager (Uses real .wav files in assets/sfx/, zero Oscillator synth)
export class AudioManager {
  constructor() {
    this.enabled = true;
    this.unlocked = false;
    this.pools = {};
    this.volumes = {
      slash: 0.55,
      clang: 0.65,
      whirlwind: 0.6,
      fireball: 0.6,
      flame_pillar: 0.72,
      earthshatter: 0.85,
      meteor: 0.9
    };

    Object.keys(this.volumes).forEach((key) => {
      this.pools[key] = Array.from({ length: 3 }, () => {
        const a = new Audio(`assets/sfx/${key}.wav`);
        a.preload = 'auto';
        a.volume = this.volumes[key];
        return a;
      });
    });

    // Mobile browsers require a user touch gesture to unlock HTML5 Audio playback
    const unlock = () => {
      if (this.unlocked) return;
      this.unlocked = true;
      Object.values(this.pools).forEach((list) => {
        const a = list[0];
        a.muted = true;
        a.play()
          .then(() => {
            a.pause();
            a.currentTime = 0;
            a.muted = false;
          })
          .catch(() => {});
      });
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  play(name) {
    if (!this.enabled || !this.pools[name]) return;
    const pool = this.pools[name];
    const audio = pool.find((a) => a.paused || a.ended) || pool[0];
    try {
      audio.currentTime = 0;
      audio.volume = this.volumes[name] * (0.9 + Math.random() * 0.15);
      audio.playbackRate = 0.92 + Math.random() * 0.16;
      audio.play().catch(() => {});
    } catch (_) {}
  }
}
