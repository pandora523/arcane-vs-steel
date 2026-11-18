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
    this.uiBootWavKeys = ['clock_gear', 'reflect', 'ult_cast', 'slash'];
    this._loadingWavKeys = new Set();
    this._combatWavsEnsured = false;
    this._bgSuspended = false;
    this._unlockedByGesture = false;
    this._wasRunningBeforeBg = false;
    this._needsPostWakePrime = true;
    this._stalledCheckTimer = null;
    this._inStateChangeResume = false;
    this._rebuildCount = 0;
    this._pendingPlays = [];

    // Champion Studio Voice Pack Subsystem (24kHz->44.1kHz 96kbps MP3s in `assets/voices/`)
    this.voiceEnabled = true;
    this.heroVoiceMap = {
      priestess_ex: 'seraphina',
      priestess: 'seraphina'
    };
    this.voiceVolumes = {
      seraphina_select: 0.94,
      seraphina_intro: 0.94,
      seraphina_attack_1: 0.84,
      seraphina_attack_2: 0.84,
      seraphina_skill_std: 0.92,
      seraphina_skill_crimson: 0.92,
      seraphina_ult_std: 0.96,
      seraphina_ult_crimson: 0.96,
      seraphina_true_ult_charge: 0.96,
      seraphina_true_ult_fire: 1.0,
      seraphina_hurt: 0.86,
      seraphina_death: 0.96,
      seraphina_victory: 0.96
    };
    this.voiceBuffers = {};
    this._voiceLoadPromises = new Map();
    this._preloadedVoicePacks = new Set();
    this.activeHeroVoices = new Map();
    this.lastVoicePlayed = {};
    this._attackVoiceAlt = 0;
    this._pendingVoicePlays = [];

    this.initContext();
    this.preloadWavFiles();

    this._boundUnlockFromGesture = () => this.unlockFromGesture();
    if (typeof window !== 'undefined') {
      if (typeof window.addEventListener === 'function') {
        const gestureOpts = { passive: true, capture: true };
        window.addEventListener('pointerdown', this._boundUnlockFromGesture, gestureOpts);
        window.addEventListener('touchstart', this._boundUnlockFromGesture, gestureOpts);
        window.addEventListener('touchend', this._boundUnlockFromGesture, gestureOpts);
        window.addEventListener('click', this._boundUnlockFromGesture, gestureOpts);
        window.addEventListener('keydown', this._boundUnlockFromGesture, gestureOpts);
      }
      window.__avsAudio = this;
      window.__avsResumeAudio = (forceRebuild = false) => {
        if (forceRebuild) {
          this._bgSuspended = false;
          this._needsPostWakePrime = true;
          if (this.enabled) {
            this.rebuildContext();
          }
          return;
        }
        this.resumeFromBackground(false);
      };
    }
  }

  isContextPaused() {
    return Boolean(this.ctx && (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted'));
  }

  _playSilentUnlockTick() {
    if (!this.ctx || this.ctx.state === 'closed') return;
    try {
      if (
        typeof this.ctx.createBuffer !== 'function' ||
        typeof this.ctx.createBufferSource !== 'function' ||
        !this.ctx.destination
      ) {
        return;
      }
      const silentBuf = this.ctx.createBuffer(1, 1, 22050);
      const src = this.ctx.createBufferSource();
      src.buffer = silentBuf;
      src.connect(this.ctx.destination);
      src.onended = () => {
        src.onended = null;
        try {
          src.disconnect();
        } catch (_) {}
      };
      src.start(0);
    } catch (_) {}
  }

  _scheduleStalledClockCheck(delayMs = 250) {
    if (!this.ctx) return;
    if (this._stalledCheckTimer) {
      clearTimeout(this._stalledCheckTimer);
      this._stalledCheckTimer = null;
    }
    const refCtx = this.ctx;
    const t0 = typeof refCtx.currentTime === 'number' ? refCtx.currentTime : 0;
    this._stalledCheckTimer = setTimeout(() => {
      this._stalledCheckTimer = null;
      if (!refCtx || this.ctx !== refCtx || !this.enabled || this._bgSuspended) return;
      const stateWedged =
        refCtx.state === 'closed' || (this._unlockedByGesture && refCtx.state !== 'running');
      const clockFrozen =
        refCtx.state === 'running' &&
        typeof refCtx.currentTime === 'number' &&
        refCtx.currentTime <= t0;
      if (stateWedged || clockFrozen) {
        this.rebuildContext();
      }
    }, delayMs);
    if (this._stalledCheckTimer && typeof this._stalledCheckTimer.unref === 'function') {
      this._stalledCheckTimer.unref();
    }
  }

  _enqueuePendingPlay(rawName, worldX) {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    // Prune stale queued sounds (> 600ms old) and cap queue to 4 entries
    this._pendingPlays = this._pendingPlays.filter((item) => now - item.queuedAt <= 600);
    if (this._pendingPlays.length >= 4) {
      this._pendingPlays.shift();
    }
    this._pendingPlays.push({ rawName, worldX, queuedAt: now });
  }

  _flushPendingPlays() {
    if ((!this._pendingPlays.length && !this._pendingVoicePlays.length) || !this.enabled || this._bgSuspended) {
      return;
    }
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const pending = this._pendingPlays.splice(0, this._pendingPlays.length);
    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];
      if (now - item.queuedAt <= 600) {
        this._playNow(item.rawName, item.worldX);
      }
    }
    const pendingVoices = this._pendingVoicePlays.splice(0, this._pendingVoicePlays.length);
    for (let i = 0; i < pendingVoices.length; i++) {
      const vItem = pendingVoices[i];
      if (now - vItem.queuedAt <= (vItem.opts?.maxAsyncDelayMs || 900)) {
        this._playHeroVoiceNow(vItem.heroId, vItem.cue, vItem.opts);
      }
    }
  }

  unlockFromGesture() {
    this._unlockedByGesture = true;
    if (!this.enabled || this._bgSuspended) return;

    if (!this.ctx || this.ctx.state === 'closed') {
      this._needsPostWakePrime = false;
      this.rebuildContext();
      return;
    }

    if (this.ctx.state !== 'running') {
      const ctxRef = this.ctx;
      this._needsPostWakePrime = false;
      this._playSilentUnlockTick();
      try {
        Promise.resolve(ctxRef.resume())
          .then(() => {
            if (this.ctx === ctxRef) {
              this._playSilentUnlockTick();
              this._flushPendingPlays();
            }
          })
          .catch(() => {
            if (this.ctx === ctxRef && this.enabled && !this._bgSuspended) {
              this.rebuildContext();
            }
          });
      } catch (_) {
        this.rebuildContext();
        return;
      }
      if (this.ctx === ctxRef && this.ctx.state === 'running') {
        this._flushPendingPlays();
      }
      this._scheduleStalledClockCheck(250);
      return;
    }

    if (this._needsPostWakePrime) {
      this._needsPostWakePrime = false;
      this._playSilentUnlockTick();
      this._scheduleStalledClockCheck(250);
    }
  }

  rebuildContext() {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    if (this._stalledCheckTimer) {
      clearTimeout(this._stalledCheckTimer);
      this._stalledCheckTimer = null;
    }

    while (this.activeVoices.length > 0) {
      const v = this.activeVoices.pop();
      try {
        v?.cleanup?.();
      } catch (_) {}
    }
    this.stopAllHeroVoices(0);
    this.pinkNoiseBuffer = null;

    const deadCtx = this.ctx;
    this.ctx = null;
    this.master = null;
    if (deadCtx) {
      try {
        deadCtx.onstatechange = null;
      } catch (_) {}
      if (deadCtx.state !== 'closed' && typeof deadCtx.close === 'function') {
        try {
          Promise.resolve(deadCtx.close()).catch(() => {});
        } catch (_) {}
      }
    }

    this._rebuildCount = (this._rebuildCount || 0) + 1;
    this.initContext();
    if (!this.ctx) return null;

    if (Object.keys(this.buffers).length === 0) {
      this.preloadWavFiles();
    }

    if (this.enabled && !this._bgSuspended) {
      const rebuiltCtx = this.ctx;
      try {
        if (rebuiltCtx.state !== 'running' && typeof rebuiltCtx.resume === 'function') {
          Promise.resolve(rebuiltCtx.resume())
            .then(() => {
              if (this.ctx === rebuiltCtx) {
                this._playSilentUnlockTick();
                this._flushPendingPlays();
              }
            })
            .catch(() => {});
        }
      } catch (_) {}
      this._playSilentUnlockTick();
      if (this.ctx === rebuiltCtx && this.ctx.state === 'running') {
        this._flushPendingPlays();
      }
    }

    return this.ctx;
  }

  initContext() {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    let ctx = null;
    try {
      ctx = new AudioCtx({ latencyHint: 'interactive' });
    } catch (_) {
      try {
        ctx = new AudioCtx();
      } catch (_2) {
        return;
      }
    }
    this.ctx = ctx;

    ctx.onstatechange = () => {
      if (this.ctx !== ctx) return;
      if (ctx.state === 'suspended' || ctx.state === 'interrupted') {
        this._needsPostWakePrime = true;
        if (this.enabled && !this._bgSuspended && !this._inStateChangeResume) {
          this._inStateChangeResume = true;
          try {
            Promise.resolve(ctx.resume())
              .then(() => {
                if (this.ctx === ctx && ctx.state === 'running') {
                  this._playSilentUnlockTick();
                  this._flushPendingPlays();
                }
              })
              .catch(() => {})
              .finally(() => {
                this._inStateChangeResume = false;
              });
          } catch (_) {
            this._inStateChangeResume = false;
          }
        }
      } else if (ctx.state === 'running') {
        this._flushPendingPlays();
      }
    };

    if (
      typeof ctx.createBiquadFilter === 'function' &&
      typeof ctx.createDynamicsCompressor === 'function' &&
      typeof ctx.createGain === 'function'
    ) {
      // 1. Clean 36Hz High-Pass Filter (preserves 38-55Hz cinematic sub-drops while blocking DC/rumble)
      const hpf = ctx.createBiquadFilter();
      hpf.type = 'highpass';
      hpf.frequency.value = 36;
      hpf.Q.value = 0.707;

      // 2. Wide 16.5kHz Studio Low-Pass Filter (preserves crisp katana shing, crystal shatter & electric arcs)
      const lpf = ctx.createBiquadFilter();
      lpf.type = 'lowpass';
      lpf.frequency.value = 16500;
      lpf.Q.value = 0.707;

      // 3. Transparent Studio Peak Limiter (gentle ratio, fast transient catch, zero pumping)
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -3.5;
      limiter.knee.value = 6;
      limiter.ratio.value = 4.0;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.11;

      // 4. Master Output Gain
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.90;

      hpf.connect(lpf);
      lpf.connect(limiter);
      limiter.connect(masterGain);
      masterGain.connect(ctx.destination);
      this.master = hpf;
    } else if (typeof ctx.createGain === 'function') {
      const masterGain = ctx.createGain();
      if (masterGain.gain) masterGain.gain.value = 0.90;
      if (ctx.destination && typeof masterGain.connect === 'function') {
        masterGain.connect(ctx.destination);
      }
      this.master = masterGain;
    } else {
      this.master = ctx.destination || null;
    }
  }

  createPinkNoiseBuffer() {
    if (!this.ctx || this.pinkNoiseBuffer || typeof this.ctx.createBuffer !== 'function') return;
    try {
      const rate = this.ctx.sampleRate || 44100;
      const len = Math.max(4096, Math.floor(rate * 0.25));
      this.pinkNoiseBuffer = this.ctx.createBuffer(1, len, rate);
      if (typeof this.pinkNoiseBuffer.getChannelData !== 'function') return;
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
    } catch (_) {
      this.pinkNoiseBuffer = null;
    }
  }

  async loadWavKey(key) {
    if (!this.ctx || !key || this.buffers[key] || this._loadingWavKeys.has(key)) return;
    this._loadingWavKeys.add(key);
    try {
      const res = await fetch(`assets/sfx/${key}.wav?v=sfx3`);
      if (!res.ok) return;
      const arr = await res.arrayBuffer();
      this.buffers[key] = await this.ctx.decodeAudioData(arr);
    } catch (_) {
    } finally {
      this._loadingWavKeys.delete(key);
    }
  }

  async preloadWavFiles() {
    if (!this.ctx) return;
    await Promise.all(this.uiBootWavKeys.map((key) => this.loadWavKey(key)));
  }

  ensureCombatWavFiles() {
    if (!this.ctx || this._combatWavsEnsured) return;
    this._combatWavsEnsured = true;
    const queue = this.wavKeys.filter((k) => !this.buffers[k] && !this._loadingWavKeys.has(k));
    const CONCURRENCY = 3;
    let cursor = 0;
    const worker = async () => {
      while (cursor < queue.length) {
        const key = queue[cursor++];
        await this.loadWavKey(key);
      }
    };
    const workers = [];
    for (let i = 0; i < Math.min(CONCURRENCY, queue.length); i++) {
      workers.push(worker());
    }
    Promise.all(workers).catch(() => {});
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this._pendingPlays.length = 0;
      this._pendingVoicePlays.length = 0;
      this.stopAllHeroVoices(0.02);
      if (this.ctx && this.ctx.state === 'running' && typeof this.ctx.suspend === 'function') {
        try {
          Promise.resolve(this.ctx.suspend()).catch(() => {});
        } catch (_) {}
      }
    } else if (!this._bgSuspended) {
      if (!this.ctx || this.ctx.state === 'closed') {
        this.rebuildContext();
      } else if (this.isContextPaused() || this.ctx.state !== 'running') {
        const ctxRef = this.ctx;
        this._playSilentUnlockTick();
        try {
          Promise.resolve(ctxRef.resume())
            .then(() => {
              if (this.ctx === ctxRef) {
                this._playSilentUnlockTick();
                this._flushPendingPlays();
              }
            })
            .catch(() => {});
        } catch (_) {}
        this._scheduleStalledClockCheck(250);
      }
    }
    return this.enabled;
  }

  suspendForBackground() {
    this._bgSuspended = true;
    this._needsPostWakePrime = true;
    this._pendingPlays.length = 0;
    this._pendingVoicePlays.length = 0;
    this.stopAllHeroVoices(0.02);
    if (this._stalledCheckTimer) {
      clearTimeout(this._stalledCheckTimer);
      this._stalledCheckTimer = null;
    }
    if (this.ctx) {
      if (this.ctx.state === 'running' || this.ctx.state === 'interrupted') {
        this._wasRunningBeforeBg = true;
      }
      if (this.ctx.state === 'running' && typeof this.ctx.suspend === 'function') {
        try {
          Promise.resolve(this.ctx.suspend()).catch(() => {});
        } catch (_) {}
      }
    }
  }

  resumeFromBackground(forceRebuild = false) {
    this._bgSuspended = false;
    this._needsPostWakePrime = true;
    if (!this.enabled) return;

    if (forceRebuild) {
      this.rebuildContext();
      return;
    }

    if (!this.ctx || this.ctx.state === 'closed') {
      this.rebuildContext();
      return;
    }

    if (this.isContextPaused() || this.ctx.state !== 'running') {
      this._wasRunningBeforeBg = false;
      const ctxRef = this.ctx;
      try {
        if (typeof ctxRef.resume === 'function') {
          Promise.resolve(ctxRef.resume())
            .then(() => {
              if (this.ctx === ctxRef) {
                this._playSilentUnlockTick();
                this._flushPendingPlays();
              }
            })
            .catch(() => {
              if (this.ctx === ctxRef && ctxRef.state === 'closed') {
                this.rebuildContext();
              }
            });
        }
      } catch (_) {
        if (ctxRef.state === 'closed') {
          this.rebuildContext();
          return;
        }
      }
      if (this.ctx === ctxRef && this.ctx.state === 'running') {
        this._playSilentUnlockTick();
        this._flushPendingPlays();
      }
      this._scheduleStalledClockCheck(250);
    } else {
      this._scheduleStalledClockCheck(250);
    }
  }

  _disconnectChain(...nodes) {
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (!n) continue;
      try {
        n.disconnect();
      } catch (_) {}
    }
  }

  play(rawName, worldX = null) {
    if (!this.enabled || this._bgSuspended) return;

    if (!this.ctx || this.ctx.state === 'closed') {
      this.rebuildContext();
    }
    if (!this.ctx) return;

    if (this.ctx.state !== 'running') {
      const ctxBefore = this.ctx;
      try {
        if (typeof ctxBefore.resume === 'function') {
          Promise.resolve(ctxBefore.resume())
            .then(() => {
              if (this.ctx === ctxBefore && ctxBefore.state === 'running') {
                this._playSilentUnlockTick();
                this._flushPendingPlays();
              }
            })
            .catch(() => {
              if (
                this.ctx === ctxBefore &&
                this.enabled &&
                !this._bgSuspended &&
                ctxBefore.state === 'closed'
              ) {
                this.rebuildContext();
              }
            });
        }
      } catch (_) {
        this.rebuildContext();
      }

      if (!this.ctx || this.ctx.state !== 'running') {
        this._enqueuePendingPlay(rawName, worldX);
        return;
      }
    }

    this._playNow(rawName, worldX);
  }

  _playNow(rawName, worldX = null) {
    if (!this.enabled || this._bgSuspended || !this.ctx) return;

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
    if (voiceGain.gain) {
      if (typeof voiceGain.gain.setValueAtTime === 'function') {
        voiceGain.gain.setValueAtTime(baseVol, this.ctx.currentTime || 0);
      } else {
        voiceGain.gain.value = baseVol;
      }
    }

    // Full-bandwidth natural studio air filter
    let warmthFilter = null;
    let chainTail = voiceGain;
    if (typeof this.ctx.createBiquadFilter === 'function') {
      warmthFilter = this.ctx.createBiquadFilter();
      warmthFilter.type = 'lowpass';
      warmthFilter.frequency.value = isBigCinematic || isMatchEndSound ? 16400 : 14600 + Math.random() * 1800;
      warmthFilter.Q.value = 0.65;
      voiceGain.connect(warmthFilter);
      chainTail = warmthFilter;
    }

    let panner = null;
    if (worldX !== null && name !== 'victory_fanfare' && typeof this.ctx.createStereoPanner === 'function') {
      panner = this.ctx.createStereoPanner();
      panner.pan.value = Math.max(-0.48, Math.min(0.48, (worldX - 600) / 650));
      chainTail.connect(panner);
      if (this.master) panner.connect(this.master);
    } else if (this.master && typeof chainTail.connect === 'function') {
      chainTail.connect(this.master);
    }

    // Play the studio-mastered 44.1kHz stereo physical-foley WAV buffer
    const buf = this.buffers[name];
    if (buf) {
      let bufferAssigned = false;
      try {
        const src = this.ctx.createBufferSource();
        try {
          src.buffer = buf;
          bufferAssigned = true;
        } catch (_) {
          // Self-heal if a decoded AudioBuffer ever needs re-decoding after a media daemon reset
          delete this.buffers[name];
          if (this.volumes[name] !== undefined) {
            this.loadWavKey(name);
          }
        }
        if (bufferAssigned) {
          // Subtle organic foley variation on repeatable attacks; exact 1.0x timing on ultimates & match end
          const rateSpread = isBigCinematic || isMatchEndSound ? 0.0 : 0.045;
          if (src.playbackRate) {
            src.playbackRate.value =
              rateSpread > 0 ? 1.0 - rateSpread * 0.5 + Math.random() * rateSpread : 1.0;
          }
          src.connect(voiceGain);

          let cleaned = false;
          const voiceEntry = {
            src,
            gainNode: voiceGain,
            startTime: now,
            isBig: isBigCinematic,
            name,
            cleanup: () => {
              if (cleaned) return;
              cleaned = true;
              src.onended = null;
              const idx = this.activeVoices.indexOf(voiceEntry);
              if (idx !== -1) this.activeVoices.splice(idx, 1);
              this._disconnectChain(src, voiceGain, warmthFilter, panner);
            }
          };
          this.activeVoices.push(voiceEntry);
          src.onended = voiceEntry.cleanup;
          src.start(0);
          return;
        }
      } catch (_) {
        this._disconnectChain(voiceGain, warmthFilter, panner);
        return;
      }
    }

    // Trigger background WAV fetch/decode if this combat sound hasn't finished preloading yet
    if (this.volumes[name] !== undefined) {
      this.loadWavKey(name);
    }

    // Punchy physical transient + swept turbulence fallback if triggered in the first ~30ms before WAV decode
    this.playWarmFallback(name, voiceGain, warmthFilter, panner);
  }

  pruneAndDuckVoices(now, incomingIsBig, isMatchEndSound = false) {
    for (let i = this.activeVoices.length - 1; i >= 0; i--) {
      if (now - this.activeVoices[i].startTime > 2200) {
        const expired = this.activeVoices[i];
        this.activeVoices.splice(i, 1);
        expired?.cleanup?.();
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
            if (v.src) v.src.stop(t + 0.065);
          } catch (_) {
            v.cleanup?.();
          }
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
          if (oldest.src) oldest.src.stop(t + 0.055);
        } catch (_) {
          oldest.cleanup?.();
        }
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

  playWarmFallback(name, dest, warmthFilter = null, panner = null) {
    if (!this.ctx || typeof this.ctx.createBufferSource !== 'function' || typeof this.ctx.createBiquadFilter !== 'function') {
      this._disconnectChain(dest, warmthFilter, panner);
      return;
    }
    if (!this.pinkNoiseBuffer) this.createPinkNoiseBuffer();
    if (!this.pinkNoiseBuffer) {
      this._disconnectChain(dest, warmthFilter, panner);
      return;
    }
    let src = null;
    let bp = null;
    let g = null;
    let punchOsc = null;
    let punchGain = null;
    try {
      const t = this.ctx.currentTime || 0;

      // 1. Swept aerodynamic / elemental noise burst (zero stationary tone)
      src = this.ctx.createBufferSource();
      src.buffer = this.pinkNoiseBuffer;
      if (src.playbackRate) {
        src.playbackRate.value = 0.92 + Math.random() * 0.22;
      }

      bp = this.ctx.createBiquadFilter();
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

      g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.42, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      src.connect(bp);
      bp.connect(g);
      g.connect(dest);
      src.start(t);
      if (typeof src.stop === 'function') src.stop(t + 0.19);

      // 2. Crisp 18ms physical transient snap + fast sub-punch drop (125Hz -> 42Hz)
      if (typeof this.ctx.createOscillator === 'function') {
        punchOsc = this.ctx.createOscillator();
        punchGain = this.ctx.createGain();
        punchOsc.type = 'triangle';
        punchOsc.frequency.setValueAtTime(125, t);
        punchOsc.frequency.exponentialRampToValueAtTime(42, t + 0.075);
        punchGain.gain.setValueAtTime(0.28, t);
        punchGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        punchOsc.connect(punchGain);
        punchGain.connect(dest);
        punchOsc.start(t);
        if (typeof punchOsc.stop === 'function') punchOsc.stop(t + 0.085);

        punchOsc.onended = () => {
          punchOsc.onended = null;
          this._disconnectChain(punchOsc, punchGain);
        };
      }
      src.onended = () => {
        src.onended = null;
        this._disconnectChain(src, bp, g, punchOsc, punchGain, dest, warmthFilter, panner);
      };
    } catch (_) {
      this._disconnectChain(src, bp, g, punchOsc, punchGain, dest, warmthFilter, panner);
    }
  }

  hasVoicePack(heroId) {
    return Boolean(heroId && this.heroVoiceMap[heroId]);
  }

  getVoicePackPrefix(heroId) {
    return (heroId && this.heroVoiceMap[heroId]) || null;
  }

  async loadVoiceKey(voiceKey) {
    if (!this.ctx || !voiceKey || !(voiceKey in this.voiceVolumes)) return null;
    if (this.voiceBuffers[voiceKey]) return this.voiceBuffers[voiceKey];
    if (this._voiceLoadPromises.has(voiceKey)) {
      return this._voiceLoadPromises.get(voiceKey);
    }
    if (typeof fetch !== 'function' || typeof this.ctx.decodeAudioData !== 'function') {
      return null;
    }
    const loadPromise = (async () => {
      try {
        const res = await fetch(`assets/voices/${voiceKey}.mp3?v=30fps139`);
        if (!res.ok) return null;
        const arr = await res.arrayBuffer();
        const decoded = await this.ctx.decodeAudioData(arr);
        if (decoded) {
          this.voiceBuffers[voiceKey] = decoded;
        }
        return decoded || null;
      } catch (_) {
        return null;
      } finally {
        this._voiceLoadPromises.delete(voiceKey);
      }
    })();
    this._voiceLoadPromises.set(voiceKey, loadPromise);
    return loadPromise;
  }

  preloadHeroVoicePack(heroId) {
    if (!this.ctx) return;
    const prefix = this.getVoicePackPrefix(heroId);
    if (!prefix || this._preloadedVoicePacks.has(prefix)) return;
    this._preloadedVoicePacks.add(prefix);

    const matchingKeys = Object.keys(this.voiceVolumes).filter((k) => k.startsWith(`${prefix}_`));
    if (!matchingKeys.length) return;

    // Prioritize UI/opening clips first so Roster Select & Duel Intro fire with 0ms wait
    const priorityOrder = [`${prefix}_select`, `${prefix}_intro`];
    const queue = [
      ...priorityOrder.filter((k) => matchingKeys.includes(k)),
      ...matchingKeys.filter((k) => !priorityOrder.includes(k))
    ].filter((k) => !this.voiceBuffers[k] && !this._voiceLoadPromises.has(k));

    const VOICE_LOAD_CONCURRENCY = 2;
    let cursor = 0;
    const worker = async () => {
      while (cursor < queue.length) {
        const key = queue[cursor++];
        await this.loadVoiceKey(key);
      }
    };
    const workers = [];
    for (let i = 0; i < Math.min(VOICE_LOAD_CONCURRENCY, queue.length); i++) {
      workers.push(worker());
    }
    Promise.all(workers).catch(() => {});
  }

  stopSpeakerVoice(speakerKey, fadeSec = 0.035) {
    if (!speakerKey || !this.activeHeroVoices.has(speakerKey)) return;
    const active = this.activeHeroVoices.get(speakerKey);
    this.activeHeroVoices.delete(speakerKey);
    if (!active) return;
    if (fadeSec > 0 && this.ctx && active.gainNode?.gain && active.src) {
      try {
        const t = this.ctx.currentTime || 0;
        active.gainNode.gain.setValueAtTime(active.gainNode.gain.value, t);
        active.gainNode.gain.exponentialRampToValueAtTime(0.0008, t + fadeSec);
        if (typeof active.src.stop === 'function') {
          active.src.stop(t + fadeSec + 0.008);
        }
        return;
      } catch (_) {}
    }
    try {
      active.cleanup?.();
    } catch (_) {}
  }

  stopAllHeroVoices(fadeSec = 0.03) {
    for (const speakerKey of Array.from(this.activeHeroVoices.keys())) {
      this.stopSpeakerVoice(speakerKey, fadeSec);
    }
  }

  playHeroVoice(heroId, cue, opts = {}) {
    if (!this.enabled || !this.voiceEnabled || this._bgSuspended) return false;
    const prefix = this.getVoicePackPrefix(heroId);
    if (!prefix || !cue) return false;

    if (!this.ctx || this.ctx.state === 'closed') {
      this.rebuildContext();
    }
    if (!this.ctx) return false;

    if (this.ctx.state !== 'running') {
      const ctxBefore = this.ctx;
      try {
        if (typeof ctxBefore.resume === 'function') {
          Promise.resolve(ctxBefore.resume())
            .then(() => {
              if (this.ctx === ctxBefore && ctxBefore.state === 'running') {
                this._playSilentUnlockTick();
                this._flushPendingPlays();
              }
            })
            .catch(() => {});
        }
      } catch (_) {}

      if (!this.ctx || this.ctx.state !== 'running') {
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        this._pendingVoicePlays = this._pendingVoicePlays.filter(
          (item) => now - item.queuedAt <= (item.opts?.maxAsyncDelayMs || 900)
        );
        if (this._pendingVoicePlays.length >= 3) this._pendingVoicePlays.shift();
        this._pendingVoicePlays.push({ heroId, cue, opts, queuedAt: now });
        return true;
      }
    }

    return this._playHeroVoiceNow(heroId, cue, opts);
  }

  _playHeroVoiceNow(heroId, cue, opts = {}) {
    if (!this.enabled || !this.voiceEnabled || this._bgSuspended || !this.ctx) return false;
    const prefix = this.getVoicePackPrefix(heroId);
    if (!prefix) return false;

    let resolvedCue = cue;
    if (cue === 'attack') {
      this._attackVoiceAlt = (this._attackVoiceAlt + 1) % 2;
      resolvedCue = this._attackVoiceAlt === 0 ? 'attack_1' : 'attack_2';
    }
    const voiceKey = `${prefix}_${resolvedCue}`;
    if (!(voiceKey in this.voiceVolumes)) return false;

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const speakerKey = opts.speakerKey || heroId;
    const priority = opts.priority ?? 1;
    const cooldownMs = opts.cooldownMs ?? 120;
    const worldX = opts.worldX ?? null;
    const duckSfx = Boolean(opts.duckSfx);
    const maxAsyncDelayMs = opts.maxAsyncDelayMs ?? 320;

    // Never let a low-priority bark (attack/hurt) interrupt an active Skill/Ultimate/Victory/KO line
    const currentVoice = this.activeHeroVoices.get(speakerKey);
    if (currentVoice && now < currentVoice.endTimeMs && currentVoice.priority > priority) {
      return false;
    }

    const cdOwner =
      typeof speakerKey === 'string' ? speakerKey : `${heroId}_t${speakerKey?.team || 0}`;
    const cdId = `${cdOwner}:${cue}`;
    if (this.lastVoicePlayed[cdId] && now - this.lastVoicePlayed[cdId] < cooldownMs) {
      return false;
    }

    const startBufferPlayback = (buf) => {
      if (!buf || !this.enabled || !this.voiceEnabled || this._bgSuspended || !this.ctx) return false;
      const playNow = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const curAfterLoad = this.activeHeroVoices.get(speakerKey);
      if (curAfterLoad && playNow < curAfterLoad.endTimeMs && curAfterLoad.priority > priority) {
        return false;
      }

      // Cleanly fade out previous vocal line from the same speaker (0 self-overlap!)
      this.stopSpeakerVoice(speakerKey, 0.03);
      this.lastVoicePlayed[cdId] = playNow;

      if (duckSfx && this.ctx) {
        const t = this.ctx.currentTime || 0;
        const duckFactor = priority >= 3 ? 0.56 : 0.74;
        for (const v of this.activeVoices) {
          if (v?.gainNode?.gain) {
            try {
              const cur = v.gainNode.gain.value;
              v.gainNode.gain.setValueAtTime(cur, t);
              v.gainNode.gain.linearRampToValueAtTime(cur * duckFactor, t + 0.035);
            } catch (_) {}
          }
        }
      }

      const voiceGain = this.ctx.createGain();
      const baseVol = this.voiceVolumes[voiceKey] ?? 0.92;
      if (voiceGain.gain) {
        if (typeof voiceGain.gain.setValueAtTime === 'function') {
          voiceGain.gain.setValueAtTime(baseVol, this.ctx.currentTime || 0);
        } else {
          voiceGain.gain.value = baseVol;
        }
      }

      let panner = null;
      if (worldX !== null && typeof this.ctx.createStereoPanner === 'function') {
        panner = this.ctx.createStereoPanner();
        panner.pan.value = Math.max(-0.30, Math.min(0.30, (worldX - 600) / 800));
        voiceGain.connect(panner);
        if (this.master) panner.connect(this.master);
      } else if (this.master && typeof voiceGain.connect === 'function') {
        voiceGain.connect(this.master);
      }

      try {
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        if (src.playbackRate) {
          src.playbackRate.value = 1.0;
        }
        src.connect(voiceGain);

        const durMs = Math.max(200, ((buf.duration || 1.2) * 1000) | 0);
        let cleaned = false;
        const entry = {
          src,
          gainNode: voiceGain,
          priority,
          voiceKey,
          startTimeMs: playNow,
          endTimeMs: playNow + durMs - 40,
          cleanup: () => {
            if (cleaned) return;
            cleaned = true;
            src.onended = null;
            if (this.activeHeroVoices.get(speakerKey) === entry) {
              this.activeHeroVoices.delete(speakerKey);
            }
            try {
              src.stop?.();
            } catch (_) {}
            this._disconnectChain(src, voiceGain, panner);
          }
        };
        this.activeHeroVoices.set(speakerKey, entry);
        src.onended = entry.cleanup;
        src.start(0);
        return true;
      } catch (_) {
        this._disconnectChain(voiceGain, panner);
        return false;
      }
    };

    const cachedBuf = this.voiceBuffers[voiceKey];
    if (cachedBuf) {
      return startBufferPlayback(cachedBuf);
    }

    const reqStart = now;
    this.loadVoiceKey(voiceKey)
      .then((decoded) => {
        if (!decoded) return;
        const doneAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
        if (doneAt - reqStart <= maxAsyncDelayMs) {
          startBufferPlayback(decoded);
        }
      })
      .catch(() => {});
    this.preloadHeroVoicePack(heroId);
    return true;
  }
}
