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

const AUDIO_MIX_STORAGE_KEY = 'avs_audio_mix_v1';
const DEFAULT_SFX_VOLUME = 0.55;
const DEFAULT_VOICE_VOLUME = 1.0;
const DEFAULT_BGM_VOLUME = 0.38;
const VOICE_PRESENCE_TRIM = 1.42;
const BGM_CROSSFADE_SEC = 0.65;
const AUDIO_ASSET_CACHE_BUST = 'v=30fps152';
const MAX_CACHED_BGM_BUFFERS = 4;

export class AudioManager {
  constructor() {
    this.enabled = true;
    this.sfxEnabled = true;
    this.voiceEnabled = true;
    this.bgmEnabled = true;
    this.sfxVolume = DEFAULT_SFX_VOLUME;
    this.voiceVolume = DEFAULT_VOICE_VOLUME;
    this.bgmVolume = DEFAULT_BGM_VOLUME;
    this.voiceLang = 'en';
    this.voicePace = 'snappy';
    this._speakerObjIds = new WeakMap();
    this._nextSpeakerObjId = 1;
    this.ctx = null;
    this.master = null;
    this.limiter = null;
    this.masterGain = null;
    this.sfxBus = null;
    this.sfxDuckGain = null;
    this.voiceBus = null;
    this.voiceAnalyser = null;
    this._voiceAnalyserBuf = null;
    this.bgmBus = null;
    this.bgmDuckGain = null;
    this._preDuckUntilMs = 0;
    this._preDuckTarget = 1.0;
    this._preDuckBgmTarget = 1.0;
    this._duckRecoverTimer = null;
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

    // Champion Studio Voice Pack Subsystem (24kHz->44.1kHz 96kbps EN + JP MP3s in `assets/voices/`)
    this.heroVoiceMap = {
      priestess_ex: 'seraphina',
      priestess: 'seraphina',
      warrior_ex: 'aethelgard',
      warrior: 'aethelgard',
      ronin_ex: 'kazemaru',
      ronin: 'kazemaru',
      mage_ex: 'ignissol',
      mage: 'ignissol',
      valkyrie_ex: 'freyja',
      valkyrie: 'freyja',
      reaper_ex: 'malakor',
      reaper: 'malakor',
      nyx_ex: 'nyx',
      icemage_ex: 'lyra',
      icemage: 'lyra',
      archer_ex: 'sylvara',
      archer: 'sylvara',
      android_ex: 'vex09',
      android: 'vex09',
      chronomancer_ex: 'chronos',
      chronomancer: 'chronos',
      titan_ex: 'torgar',
      titan: 'torgar'
    };
    this.voiceVolumes = {
      seraphina_select: 0.94,
      seraphina_intro: 0.96,
      seraphina_attack_1: 0.86,
      seraphina_attack_2: 0.86,
      seraphina_skill_std: 0.94,
      seraphina_skill_crimson: 0.94,
      seraphina_ult_std: 0.98,
      seraphina_ult_crimson: 0.98,
      seraphina_true_ult_charge: 0.98,
      seraphina_true_ult_fire: 1.0,
      seraphina_hurt: 0.88,
      seraphina_hurt_short: 0.88,
      seraphina_skill_short: 0.94,
      seraphina_skill_alt_short: 0.94,
      seraphina_ult_short: 0.98,
      seraphina_death: 0.98,
      seraphina_victory: 0.98
    };
    for (const prefix of [
      'aethelgard',
      'kazemaru',
      'ignissol',
      'freyja',
      'malakor',
      'nyx',
      'lyra',
      'sylvara',
      'vex09',
      'chronos',
      'torgar'
    ]) {
      Object.assign(this.voiceVolumes, {
        [`${prefix}_select`]: 0.94,
        [`${prefix}_intro`]: 0.96,
        [`${prefix}_attack_1`]: 0.86,
        [`${prefix}_attack_2`]: 0.86,
        [`${prefix}_skill_std`]: 0.94,
        [`${prefix}_skill_alt`]: 0.94,
        [`${prefix}_ult_std`]: 0.98,
        [`${prefix}_ult_alt`]: 0.98,
        [`${prefix}_true_ult_charge`]: 0.98,
        [`${prefix}_true_ult_fire`]: 1.0,
        [`${prefix}_hurt`]: 0.88,
        [`${prefix}_hurt_short`]: 0.88,
        [`${prefix}_skill_short`]: 0.94,
        [`${prefix}_skill_alt_short`]: 0.94,
        [`${prefix}_ult_short`]: 0.98,
        [`${prefix}_death`]: 0.98,
        [`${prefix}_victory`]: 0.98
      });
    }
    this.voiceBuffers = {};
    this._voiceLoadPromises = new Map();
    this._preloadedVoicePacks = new Set();
    this.activeHeroVoices = new Map();
    this.lastVoicePlayed = {};
    this._attackVoiceAlt = 0;
    this._pendingVoicePlays = [];
    this._pendingDeathVoiceTimer = null;
    this._pendingDeathVoiceUntilMs = 0;
    this._deathVoiceLoadingUntilMs = 0;

    // Original Soundtrack BGM Subsystem (11 Mastered Loopable MP3s in `assets/bgm/`, loaded strictly on demand)
    this.bgmTracks = {
      bgm_title_select: 'assets/bgm/bgm_title_select.mp3',
      bgm_cathedral: 'assets/bgm/bgm_cathedral.mp3',
      bgm_sanctuary: 'assets/bgm/bgm_sanctuary.mp3',
      bgm_sylvan: 'assets/bgm/bgm_sylvan.mp3',
      bgm_boneyard: 'assets/bgm/bgm_boneyard.mp3',
      bgm_clocktower: 'assets/bgm/bgm_clocktower.mp3',
      bgm_inferno: 'assets/bgm/bgm_inferno.mp3',
      bgm_shogunate: 'assets/bgm/bgm_shogunate.mp3',
      bgm_cob_monitor: 'assets/bgm/bgm_cob_monitor.mp3',
      bgm_adventure_pilgrimage: 'assets/bgm/bgm_adventure_pilgrimage.mp3',
      bgm_boss_malphas: 'assets/bgm/bgm_boss_malphas.mp3'
    };
    this.bgmBuffers = {};
    this._bgmBufferOrder = [];
    this._bgmLoadPromises = new Map();
    this.desiredBgmKey = null;
    this.currentBgmKey = null;
    this._activeBgmEntry = null;
    this._fadingBgmEntries = new Set();
    this._bgmPlaySeq = 0;

    this._loadAudioMixSettings();
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
    if (!this.enabled || this._bgSuspended) {
      return;
    }
    if (!this.ctx || this.ctx.state !== 'running') return;
    this._syncPendingBgmPlayback();
    if (!this._pendingPlays.length && !this._pendingVoicePlays.length) {
      return;
    }
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
    this._syncPendingBgmPlayback();
  }

  rebuildContext() {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    if (this._stalledCheckTimer) {
      clearTimeout(this._stalledCheckTimer);
      this._stalledCheckTimer = null;
    }
    if (this._duckRecoverTimer) {
      clearTimeout(this._duckRecoverTimer);
      this._duckRecoverTimer = null;
    }

    while (this.activeVoices.length > 0) {
      const v = this.activeVoices.pop();
      try {
        v?.cleanup?.();
      } catch (_) {}
    }
    this.stopAllHeroVoices(0);
    this._stopAllBgmSources(0);
    this.pinkNoiseBuffer = null;

    const deadCtx = this.ctx;
    this.ctx = null;
    this.master = null;
    this.limiter = null;
    this.masterGain = null;
    this.sfxBus = null;
    this.sfxDuckGain = null;
    this.voiceBus = null;
    this.voiceAnalyser = null;
    this.bgmBus = null;
    this.bgmDuckGain = null;
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
      // Dedicated SFX User Bus + Continuous Sidechain Ducking Node (ducks ALL active & newly-spawned SFX while voices speak)
      const sfxBus = ctx.createGain();
      sfxBus.gain.value = this._getEffectiveSfxBusGain();

      const sfxDuckGain = ctx.createGain();
      sfxDuckGain.gain.value = 1.0;

      // Dedicated Champion Voice Bus (connects straight into studio limiter above SFX sidechain ducking)
      const voiceBus = ctx.createGain();
      voiceBus.gain.value = this._getEffectiveVoiceBusGain();

      // Dedicated Original Soundtrack BGM Bus + Sidechain Ducking Node
      const bgmBus = ctx.createGain();
      bgmBus.gain.value = this._getEffectiveBgmBusGain();

      const bgmDuckGain = ctx.createGain();
      bgmDuckGain.gain.value = 1.0;

      // 1. Clean 36Hz High-Pass Filter on SFX (preserves 38-55Hz cinematic sub-drops while blocking DC/rumble)
      const hpf = ctx.createBiquadFilter();
      hpf.type = 'highpass';
      hpf.frequency.value = 36;
      hpf.Q.value = 0.707;

      // 2. Wide 16.5kHz Studio Low-Pass Filter on SFX (preserves crisp katana shing, crystal shatter & electric arcs)
      const lpf = ctx.createBiquadFilter();
      lpf.type = 'lowpass';
      lpf.frequency.value = 16500;
      lpf.Q.value = 0.707;

      // 3. Transparent Studio Peak Limiter (gentle ratio, fast transient catch, zero pumping)
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -3.0;
      limiter.knee.value = 6;
      limiter.ratio.value = 4.0;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.10;

      // 4. Master Output Gain
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.92;

      sfxBus.connect(sfxDuckGain);
      sfxDuckGain.connect(hpf);
      hpf.connect(lpf);
      lpf.connect(limiter);
      bgmBus.connect(bgmDuckGain);
      bgmDuckGain.connect(masterGain);
      voiceBus.connect(limiter);
      limiter.connect(masterGain);
      masterGain.connect(ctx.destination);

      this.limiter = limiter;
      this.masterGain = masterGain;
      this.sfxBus = sfxBus;
      this.sfxDuckGain = sfxDuckGain;
      this.voiceBus = voiceBus;
      this.bgmBus = bgmBus;
      this.bgmDuckGain = bgmDuckGain;
      this.master = sfxBus;
    } else if (typeof ctx.createGain === 'function') {
      const sfxBus = ctx.createGain();
      if (sfxBus.gain) sfxBus.gain.value = this._getEffectiveSfxBusGain();
      const sfxDuckGain = ctx.createGain();
      if (sfxDuckGain.gain) sfxDuckGain.gain.value = 1.0;
      const voiceBus = ctx.createGain();
      if (voiceBus.gain) voiceBus.gain.value = this._getEffectiveVoiceBusGain();
      const bgmBus = ctx.createGain();
      if (bgmBus.gain) bgmBus.gain.value = this._getEffectiveBgmBusGain();
      const bgmDuckGain = ctx.createGain();
      if (bgmDuckGain.gain) bgmDuckGain.gain.value = 1.0;
      const masterGain = ctx.createGain();
      if (masterGain.gain) masterGain.gain.value = 0.92;

      if (typeof sfxBus.connect === 'function') sfxBus.connect(sfxDuckGain);
      if (typeof sfxDuckGain.connect === 'function') sfxDuckGain.connect(masterGain);
      if (typeof bgmBus.connect === 'function') bgmBus.connect(bgmDuckGain);
      if (typeof bgmDuckGain.connect === 'function') bgmDuckGain.connect(masterGain);
      if (typeof voiceBus.connect === 'function') voiceBus.connect(masterGain);
      if (ctx.destination && typeof masterGain.connect === 'function') {
        masterGain.connect(ctx.destination);
      }
      this.limiter = null;
      this.masterGain = masterGain;
      this.sfxBus = sfxBus;
      this.sfxDuckGain = sfxDuckGain;
      this.voiceBus = voiceBus;
      this.bgmBus = bgmBus;
      this.bgmDuckGain = bgmDuckGain;
      this.master = sfxBus;
    } else {
      this.limiter = null;
      this.masterGain = null;
      this.sfxBus = null;
      this.sfxDuckGain = null;
      this.voiceBus = null;
      this.bgmBus = null;
      this.bgmDuckGain = null;
      this.master = ctx.destination || null;
    }

    this.voiceAnalyser = null;
    if (this.voiceBus && typeof ctx.createAnalyser === 'function') {
      try {
        const analyser = ctx.createAnalyser();
        if (analyser) {
          try {
            analyser.fftSize = 128;
            analyser.smoothingTimeConstant = 0.65;
          } catch (_) {}
          if (typeof this.voiceBus.connect === 'function') {
            this.voiceBus.connect(analyser);
          }
          const binLen = Number(analyser.frequencyBinCount) || 64;
          this._voiceAnalyserBuf = new Uint8Array(binLen);
          this.voiceAnalyser = analyser;
        }
      } catch (_) {
        this.voiceAnalyser = null;
      }
    }
  }

  _getStorageHandle() {
    const resolveStore = (target) => {
      if (!target) return null;
      const desc = Object.getOwnPropertyDescriptor(target, 'localStorage');
      if (desc && 'value' in desc) {
        return desc.value && typeof desc.value.getItem === 'function' ? desc.value : null;
      }
      if (typeof process !== 'undefined' && process.versions?.node) {
        return null;
      }
      const ls = target.localStorage;
      return ls && typeof ls.getItem === 'function' ? ls : null;
    };
    try {
      if (typeof window !== 'undefined') {
        const ws = resolveStore(window);
        if (ws) return ws;
      }
      if (typeof globalThis !== 'undefined') {
        return resolveStore(globalThis);
      }
    } catch (_) {}
    return null;
  }

  _loadAudioMixSettings() {
    try {
      const store = this._getStorageHandle();
      if (!store) return;
      const raw = store.getItem(AUDIO_MIX_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      if (Number.isFinite(parsed.sfxVolume)) {
        this.sfxVolume = Math.max(0, Math.min(1, Number(parsed.sfxVolume)));
      }
      if (Number.isFinite(parsed.voiceVolume)) {
        this.voiceVolume = Math.max(0, Math.min(1, Number(parsed.voiceVolume)));
      }
      if (Number.isFinite(parsed.bgmVolume)) {
        this.bgmVolume = Math.max(0, Math.min(1, Number(parsed.bgmVolume)));
      }
      if (typeof parsed.sfxEnabled === 'boolean') {
        this.sfxEnabled = parsed.sfxEnabled;
      }
      if (typeof parsed.voiceEnabled === 'boolean') {
        this.voiceEnabled = parsed.voiceEnabled;
      }
      if (typeof parsed.bgmEnabled === 'boolean') {
        this.bgmEnabled = parsed.bgmEnabled;
      }
      if (parsed.voiceLang === 'ja' || parsed.voiceLang === 'en') {
        this.voiceLang = parsed.voiceLang;
      }
      if (parsed.voicePace === 'full' || parsed.voicePace === 'snappy') {
        this.voicePace = parsed.voicePace;
      }
      this.enabled = Boolean(this.sfxEnabled || this.voiceEnabled || this.bgmEnabled);
    } catch (_) {}
  }

  _saveAudioMixSettings() {
    try {
      const store = this._getStorageHandle();
      if (!store || typeof store.setItem !== 'function') return;
      store.setItem(
        AUDIO_MIX_STORAGE_KEY,
        JSON.stringify({
          sfxVolume: Math.round(this.sfxVolume * 100) / 100,
          voiceVolume: Math.round(this.voiceVolume * 100) / 100,
          bgmVolume: Math.round(this.bgmVolume * 100) / 100,
          sfxEnabled: Boolean(this.sfxEnabled),
          voiceEnabled: Boolean(this.voiceEnabled),
          bgmEnabled: Boolean(this.bgmEnabled),
          voiceLang: this.voiceLang === 'ja' ? 'ja' : 'en',
          voicePace: this.voicePace === 'full' ? 'full' : 'snappy'
        })
      );
    } catch (_) {}
  }

  _getEffectiveSfxBusGain() {
    return this.enabled && this.sfxEnabled ? this.sfxVolume : 0;
  }

  _getEffectiveVoiceBusGain() {
    return this.enabled && this.voiceEnabled ? this.voiceVolume * VOICE_PRESENCE_TRIM : 0;
  }

  _getEffectiveBgmBusGain() {
    return this.enabled && this.bgmEnabled ? this.bgmVolume : 0;
  }

  _applyGainParam(gainNode, targetVal, rampSec = 0) {
    if (!gainNode || !gainNode.gain) return;
    const g = gainNode.gain;
    const clamped = Math.max(0, Number.isFinite(targetVal) ? targetVal : 0);
    if (this.ctx && rampSec > 0 && typeof g.setValueAtTime === 'function' && typeof g.linearRampToValueAtTime === 'function') {
      try {
        const t = this.ctx.currentTime || 0;
        if (typeof g.cancelScheduledValues === 'function') {
          g.cancelScheduledValues(t);
        }
        g.setValueAtTime(g.value, t);
        g.linearRampToValueAtTime(clamped, t + rampSec);
        return;
      } catch (_) {}
    }
    try {
      if (this.ctx && typeof g.cancelScheduledValues === 'function') {
        g.cancelScheduledValues(this.ctx.currentTime || 0);
      }
      if (this.ctx && typeof g.setValueAtTime === 'function') {
        g.setValueAtTime(clamped, this.ctx.currentTime || 0);
      } else {
        g.value = clamped;
      }
    } catch (_) {
      g.value = clamped;
    }
  }

  _ensureContextRunningForMix() {
    if (!this.enabled || this._bgSuspended) return;
    if (!this.ctx || this.ctx.state === 'closed') {
      this.rebuildContext();
      return;
    }
    if (this.isContextPaused() || this.ctx.state !== 'running') {
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
    }
  }

  _syncBusVolumes(rampSec = 0.02) {
    this._applyGainParam(this.sfxBus, this._getEffectiveSfxBusGain(), rampSec);
    this._applyGainParam(this.voiceBus, this._getEffectiveVoiceBusGain(), rampSec);
    this._applyGainParam(this.bgmBus, this._getEffectiveBgmBusGain(), rampSec);
  }

  getSfxVolume() {
    return this.sfxVolume;
  }

  getVoiceVolume() {
    return this.voiceVolume;
  }

  getBgmVolume() {
    return this.bgmVolume;
  }

  getVoiceLang() {
    return this.voiceLang === 'ja' ? 'ja' : 'en';
  }

  setVoiceLang(lang, persist = true) {
    const nextLang = lang === 'ja' ? 'ja' : 'en';
    if (this.voiceLang !== nextLang) {
      this._pendingVoicePlays.length = 0;
      this.stopAllHeroVoices(0.02);
      this.voiceLang = nextLang;
    }
    if (persist) this._saveAudioMixSettings();
    return this.voiceLang;
  }

  toggleVoiceLang(persist = true) {
    return this.setVoiceLang(this.getVoiceLang() === 'ja' ? 'en' : 'ja', persist);
  }

  getVoicePace() {
    return this.voicePace === 'full' ? 'full' : 'snappy';
  }

  setVoicePace(pace, persist = true) {
    const nextPace = pace === 'full' ? 'full' : 'snappy';
    this.voicePace = nextPace;
    if (persist) this._saveAudioMixSettings();
    return this.voicePace;
  }

  toggleVoicePace(persist = true) {
    return this.setVoicePace(this.getVoicePace() === 'full' ? 'snappy' : 'full', persist);
  }

  setSfxVolume(vol, persist = true) {
    const next = Math.max(0, Math.min(1, Number(vol) || 0));
    this.sfxVolume = next;
    if (next > 0) {
      this.sfxEnabled = true;
      this.enabled = true;
      this._ensureContextRunningForMix();
    }
    this._syncBusVolumes(0.02);
    if (persist) this._saveAudioMixSettings();
    return this.sfxVolume;
  }

  setVoiceVolume(vol, persist = true) {
    const next = Math.max(0, Math.min(1, Number(vol) || 0));
    this.voiceVolume = next;
    if (next > 0) {
      this.voiceEnabled = true;
      this.enabled = true;
      this._ensureContextRunningForMix();
    }
    this._syncBusVolumes(0.02);
    this._syncSfxSidechainDuck();
    if (persist) this._saveAudioMixSettings();
    return this.voiceVolume;
  }

  setBgmVolume(vol, persist = true) {
    const next = Math.max(0, Math.min(1, Number(vol) || 0));
    this.bgmVolume = next;
    if (next > 0) {
      this.bgmEnabled = true;
      this.enabled = true;
      this._ensureContextRunningForMix();
    } else {
      this.stopBgm(0.08, false);
    }
    this._syncBusVolumes(0.02);
    if (next > 0 && this.desiredBgmKey && !this._activeBgmEntry) {
      this._syncPendingBgmPlayback();
    }
    if (persist) this._saveAudioMixSettings();
    return this.bgmVolume;
  }

  toggleSfx(persist = true) {
    this.sfxEnabled = !this.sfxEnabled;
    if (!this.sfxEnabled) {
      this._pendingPlays.length = 0;
    } else {
      if (this.sfxVolume <= 0.01) this.sfxVolume = DEFAULT_SFX_VOLUME;
      this.enabled = true;
      this._ensureContextRunningForMix();
    }
    this._syncBusVolumes(0.02);
    if (persist) this._saveAudioMixSettings();
    return Boolean(this.enabled && this.sfxEnabled);
  }

  toggleVoice(persist = true) {
    this.voiceEnabled = !this.voiceEnabled;
    if (!this.voiceEnabled) {
      this._pendingVoicePlays.length = 0;
      this.stopAllHeroVoices(0.02);
    } else {
      if (this.voiceVolume <= 0.01) this.voiceVolume = DEFAULT_VOICE_VOLUME;
      this.enabled = true;
      this._ensureContextRunningForMix();
    }
    this._syncBusVolumes(0.02);
    this._syncSfxSidechainDuck();
    if (persist) this._saveAudioMixSettings();
    return Boolean(this.enabled && this.voiceEnabled);
  }

  toggleBgm(persist = true) {
    this.bgmEnabled = !this.bgmEnabled;
    if (!this.bgmEnabled) {
      this.stopBgm(0.08, false);
    } else {
      if (this.bgmVolume <= 0.01) this.bgmVolume = DEFAULT_BGM_VOLUME;
      this.enabled = true;
      this._ensureContextRunningForMix();
    }
    this._syncBusVolumes(0.02);
    if (this.bgmEnabled && this.desiredBgmKey && !this._activeBgmEntry) {
      this._syncPendingBgmPlayback();
    }
    if (persist) this._saveAudioMixSettings();
    return Boolean(this.enabled && this.bgmEnabled);
  }

  preDuckSfxForVoice(priority = 3, holdMs = 360) {
    if (!this.enabled || !this.voiceEnabled || this.voiceVolume <= 0.01) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this._preDuckUntilMs = Math.max(this._preDuckUntilMs || 0, now + holdMs);
    this._preDuckTarget = priority >= 3 ? 0.26 : priority >= 2 ? 0.34 : 0.55;
    this._preDuckBgmTarget = 1.0;
    this._syncSfxSidechainDuck(null, 0.015);
    if (this._duckRecoverTimer) clearTimeout(this._duckRecoverTimer);
    this._duckRecoverTimer = setTimeout(() => {
      this._duckRecoverTimer = null;
      this._syncSfxSidechainDuck();
    }, holdMs + 30);
    if (this._duckRecoverTimer && typeof this._duckRecoverTimer.unref === 'function') {
      this._duckRecoverTimer.unref();
    }
  }

  _syncSfxSidechainDuck(overrideTarget = null, rampSec = null) {
    if ((!this.sfxDuckGain || !this.sfxDuckGain.gain) && (!this.bgmDuckGain || !this.bgmDuckGain.gain)) {
      return 1.0;
    }
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    let maxPrio = 0;
    if (this.enabled && this.voiceEnabled && this.voiceVolume > 0.01) {
      for (const [speakerKey, entry] of this.activeHeroVoices.entries()) {
        if (!entry || now >= entry.endTimeMs + 120) {
          this.activeHeroVoices.delete(speakerKey);
          continue;
        }
        if (entry.duckSfx !== false && (entry.priority || 1) > maxPrio) {
          maxPrio = entry.priority || 1;
        }
      }
    }

    let target = 1.0;
    const bgmTarget = 1.0;
    this._preDuckBgmTarget = 1.0;
    if (overrideTarget !== null) {
      target = overrideTarget;
    } else {
      if (maxPrio >= 3) {
        target = 0.26;
      } else if (maxPrio >= 2) {
        target = 0.34;
      } else if (maxPrio >= 1) {
        target = 0.55;
      }
      if (now < (this._preDuckUntilMs || 0)) {
        target = Math.min(target, this._preDuckTarget || 0.34);
      }
    }

    if (this.sfxDuckGain && this.sfxDuckGain.gain) {
      const cur = Number.isFinite(this.sfxDuckGain.gain.value) ? this.sfxDuckGain.gain.value : 1.0;
      const effectiveRamp =
        rampSec !== null ? rampSec : target < cur - 0.01 ? 0.025 : 0.22;
      this._applyGainParam(this.sfxDuckGain, target, effectiveRamp);
    }
    if (this.bgmDuckGain && this.bgmDuckGain.gain) {
      const bgmRamp = rampSec !== null ? rampSec : 0.04;
      this._applyGainParam(this.bgmDuckGain, bgmTarget, bgmRamp);
    }
    return target;
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
      this._stopAllBgmSources(0.02);
      this._syncBusVolumes(0.01);
      if (this.ctx && this.ctx.state === 'running' && typeof this.ctx.suspend === 'function') {
        try {
          Promise.resolve(this.ctx.suspend()).catch(() => {});
        } catch (_) {}
      }
    } else if (!this._bgSuspended) {
      if (!this.sfxEnabled && !this.voiceEnabled && !this.bgmEnabled) {
        this.sfxEnabled = true;
        this.voiceEnabled = true;
        this.bgmEnabled = true;
      }
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
      } else {
        this._syncPendingBgmPlayback();
      }
      this._syncBusVolumes(0.02);
    }
    this._saveAudioMixSettings();
    return this.enabled;
  }

  suspendForBackground() {
    this._bgSuspended = true;
    this._needsPostWakePrime = true;
    this._pendingPlays.length = 0;
    this._pendingVoicePlays.length = 0;
    this.stopAllHeroVoices(0.02);
    this._stopAllBgmSources(0.02);
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
      this._syncPendingBgmPlayback();
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
    if (!this.enabled || !this.sfxEnabled || this.sfxVolume <= 0.001 || this._bgSuspended) return;

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
    if (!this.enabled || !this.sfxEnabled || this.sfxVolume <= 0.001 || this._bgSuspended || !this.ctx) {
      return;
    }
    if (this.activeHeroVoices.size > 0 || (this._preDuckUntilMs || 0) > 0) {
      this._syncSfxSidechainDuck();
    }

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

  _getVoiceCacheKey(voiceKey, lang = this.voiceLang) {
    const normLang = lang === 'ja' ? 'ja' : 'en';
    return `${normLang}:${voiceKey}`;
  }

  _getCachedVoiceBuffer(voiceKey, lang = this.voiceLang) {
    const normLang = lang === 'ja' ? 'ja' : 'en';
    const scoped = this.voiceBuffers[this._getVoiceCacheKey(voiceKey, normLang)];
    if (scoped) return scoped;
    if (normLang === 'en' && this.voiceBuffers[voiceKey]) {
      return this.voiceBuffers[voiceKey];
    }
    return null;
  }

  _resolveVoiceKey(prefix, cue) {
    let resolvedCue = cue;
    if (cue === 'attack') {
      this._attackVoiceAlt = (this._attackVoiceAlt + 1) % 2;
      resolvedCue = this._attackVoiceAlt === 0 ? 'attack_1' : 'attack_2';
    }
    const candidate = `${prefix}_${resolvedCue}`;
    if (candidate in this.voiceVolumes) return candidate;
    if (resolvedCue === 'skill_alt' && `${prefix}_skill_crimson` in this.voiceVolumes) {
      return `${prefix}_skill_crimson`;
    }
    if (resolvedCue === 'skill_crimson' && `${prefix}_skill_alt` in this.voiceVolumes) {
      return `${prefix}_skill_alt`;
    }
    if (resolvedCue === 'ult_alt' && `${prefix}_ult_crimson` in this.voiceVolumes) {
      return `${prefix}_ult_crimson`;
    }
    if (resolvedCue === 'ult_crimson' && `${prefix}_ult_alt` in this.voiceVolumes) {
      return `${prefix}_ult_alt`;
    }
    return null;
  }

  async loadVoiceKey(voiceKey, langOverride = null) {
    const lang = (langOverride || this.voiceLang) === 'ja' ? 'ja' : 'en';
    if (!this.ctx || !voiceKey || !(voiceKey in this.voiceVolumes)) return null;
    const existing = this._getCachedVoiceBuffer(voiceKey, lang);
    if (existing) return existing;
    const cacheKey = this._getVoiceCacheKey(voiceKey, lang);
    if (this._voiceLoadPromises.has(cacheKey)) {
      return this._voiceLoadPromises.get(cacheKey);
    }
    if (typeof fetch !== 'function' || typeof this.ctx.decodeAudioData !== 'function') {
      return null;
    }
    const loadPromise = (async () => {
      try {
        const urls =
          lang === 'ja'
            ? [
                `assets/voices/ja/${voiceKey}.mp3?${AUDIO_ASSET_CACHE_BUST}`,
                `assets/voices/${voiceKey}.mp3?${AUDIO_ASSET_CACHE_BUST}`
              ]
            : [`assets/voices/${voiceKey}.mp3?${AUDIO_ASSET_CACHE_BUST}`];
        for (const url of urls) {
          try {
            const res = await fetch(url);
            if (!res || !res.ok) continue;
            const arr = await res.arrayBuffer();
            const decoded = await this.ctx.decodeAudioData(arr);
            if (decoded) {
              this.voiceBuffers[cacheKey] = decoded;
              return decoded;
            }
          } catch (_) {}
        }
        return null;
      } finally {
        this._voiceLoadPromises.delete(cacheKey);
      }
    })();
    this._voiceLoadPromises.set(cacheKey, loadPromise);
    return loadPromise;
  }

  preloadHeroVoicePack(heroId, langOverride = null) {
    if (!this.ctx) return;
    const prefix = this.getVoicePackPrefix(heroId);
    const lang = (langOverride || this.voiceLang) === 'ja' ? 'ja' : 'en';
    const packKey = `${lang}:${prefix}`;
    if (!prefix || this._preloadedVoicePacks.has(packKey)) return;
    this._preloadedVoicePacks.add(packKey);

    const matchingKeys = Object.keys(this.voiceVolumes).filter((k) => k.startsWith(`${prefix}_`));
    if (!matchingKeys.length) return;

    // Prioritize UI/opening & snappy arcade combat barks first so Select, Intro, and fast barks fire with 0ms wait
    const priorityOrder = [
      `${prefix}_select`,
      `${prefix}_intro`,
      `${prefix}_hurt_short`,
      `${prefix}_skill_short`,
      `${prefix}_skill_alt_short`,
      `${prefix}_ult_short`
    ];
    const queue = [
      ...priorityOrder.filter((k) => matchingKeys.includes(k)),
      ...matchingKeys.filter((k) => !priorityOrder.includes(k))
    ].filter(
      (k) =>
        !this._getCachedVoiceBuffer(k, lang) &&
        !this._voiceLoadPromises.has(this._getVoiceCacheKey(k, lang))
    );

    const VOICE_LOAD_CONCURRENCY = 2;
    let cursor = 0;
    const worker = async () => {
      while (cursor < queue.length) {
        const key = queue[cursor++];
        await this.loadVoiceKey(key, lang);
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
    this._syncSfxSidechainDuck();
    if (!active) return;
    if (active.recoverTimer) {
      clearTimeout(active.recoverTimer);
      active.recoverTimer = null;
    }
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

  clearPendingDeathVoice() {
    if (this._pendingDeathVoiceTimer) {
      clearTimeout(this._pendingDeathVoiceTimer);
      this._pendingDeathVoiceTimer = null;
    }
    this._pendingDeathVoiceUntilMs = 0;
    this._deathVoiceLoadingUntilMs = 0;
  }

  stopLowPriorityHeroVoices(maxPriority = 1, fadeSec = 0.03) {
    for (const [speakerKey, entry] of Array.from(this.activeHeroVoices.entries())) {
      if ((entry?.priority || 1) <= maxPriority) {
        this.stopSpeakerVoice(speakerKey, fadeSec);
      }
    }
  }

  stopAllHeroVoices(fadeSec = 0.03) {
    this.clearPendingDeathVoice();
    this._preDuckUntilMs = 0;
    this._smoothedVoiceAmp = 0;
    for (const speakerKey of Array.from(this.activeHeroVoices.keys())) {
      this.stopSpeakerVoice(speakerKey, fadeSec);
    }
    this._syncSfxSidechainDuck();
  }

  getOtherSpeakerActiveVoice(excludeSpeakerKey, nowOverrideMs = null) {
    const now = Number.isFinite(nowOverrideMs)
      ? nowOverrideMs
      : typeof performance !== 'undefined'
        ? performance.now()
        : Date.now();
    let best = null;
    for (const [spkKey, entry] of this.activeHeroVoices.entries()) {
      if (!entry || spkKey === excludeSpeakerKey) continue;
      const endMs = Number.isFinite(entry.endTimeMs)
        ? entry.endTimeMs
        : (entry.startedAtMs || entry.startTimeMs || 0) + (entry.durationSec || 0) * 1000;
      if (now >= endMs) continue;
      const remainingSec = Math.max(0, (endMs - now) / 1000);
      const prio = entry.priority || 1;
      if (
        !best ||
        prio > best.priority ||
        (prio === best.priority && remainingSec > best.remainingSec)
      ) {
        best = {
          speakerKey: spkKey,
          entry,
          priority: prio,
          cue: entry.cue || null,
          voiceKey: entry.voiceKey || null,
          startedAtMs: entry.startedAtMs ?? entry.startTimeMs ?? 0,
          durationSec: entry.durationSec ?? 0,
          remainingSec
        };
      }
    }
    return best;
  }

  getActiveVoiceRemainingMs(speakerFilter = null, nowOverrideMs = null) {
    const now = Number.isFinite(nowOverrideMs)
      ? nowOverrideMs
      : typeof performance !== 'undefined'
        ? performance.now()
        : Date.now();
    let maxRem = 0;
    for (const [speakerKey, entry] of this.activeHeroVoices.entries()) {
      if (!entry) continue;
      const endMs = Number.isFinite(entry.endTimeMs)
        ? entry.endTimeMs
        : (entry.startedAtMs || entry.startTimeMs || 0) + (entry.durationSec || 0) * 1000;
      if (now >= endMs) continue;
      if (speakerFilter && !speakerFilter(speakerKey, entry)) continue;
      const rem = Math.max(0, Math.round(endMs - now));
      if (rem > maxRem) maxRem = rem;
    }
    return maxRem;
  }

  isHeroVoiceBusy(nowOverrideMs = null) {
    if (!this.enabled || !this.voiceEnabled || this.voiceVolume <= 0.001 || this._bgSuspended) {
      return false;
    }
    return this.getActiveVoiceRemainingMs(null, nowOverrideMs) > 0;
  }

  getVoiceAmplitude(nowOverrideMs = null) {
    if (!this.isHeroVoiceBusy(nowOverrideMs)) {
      this._smoothedVoiceAmp = 0;
      return 0;
    }
    if (
      this.voiceAnalyser &&
      typeof this.voiceAnalyser.getByteTimeDomainData === 'function'
    ) {
      try {
        const binLen = Number(this.voiceAnalyser.frequencyBinCount) || 64;
        if (!this._voiceAnalyserBuf || this._voiceAnalyserBuf.length !== binLen) {
          this._voiceAnalyserBuf = new Uint8Array(binLen);
        }
        this.voiceAnalyser.getByteTimeDomainData(this._voiceAnalyserBuf);
        let sumSq = 0;
        let peak = 0;
        const buf = this._voiceAnalyserBuf;
        for (let i = 0; i < buf.length; i++) {
          const d = (buf[i] - 128) / 128;
          const absD = d < 0 ? -d : d;
          sumSq += d * d;
          if (absD > peak) peak = absD;
        }
        const rms = buf.length > 0 ? Math.sqrt(sumSq / buf.length) : 0;
        // Noise-gate ambient reverb/breath tail so inter-word pauses return TRUE 0 (closed mouth)!
        const gatedRms = Math.max(0, rms - 0.026);
        const gatedPeak = Math.max(0, peak - 0.052);
        const rawEnergy = Math.min(1, Math.max(gatedRms * 3.2, gatedPeak * 1.48));
        const prev = Number(this._smoothedVoiceAmp) || 0;
        const smoothing = rawEnergy >= prev ? 0.65 : 0.42;
        const nextAmp = prev + (rawEnergy - prev) * smoothing;
        this._smoothedVoiceAmp = nextAmp < 0.028 ? 0 : Math.min(1, nextAmp);
        return this._smoothedVoiceAmp;
      } catch (_) {}
    }
    // Headless/mock fallback ONLY when no WebAudio AnalyserNode exists
    const fb = 0.38 + 0.42 * Math.abs(Math.sin(Date.now() * 0.016));
    return Math.max(0, Math.min(1, fb));
  }

  isDeathOrMatchEndVoiceBusy(nowOverrideMs = null) {
    const now = Number.isFinite(nowOverrideMs)
      ? nowOverrideMs
      : typeof performance !== 'undefined'
        ? performance.now()
        : Date.now();
    if (
      this._pendingDeathVoiceTimer !== null ||
      now < (this._pendingDeathVoiceUntilMs || 0) ||
      now < (this._deathVoiceLoadingUntilMs || 0)
    ) {
      return true;
    }
    for (const entry of this.activeHeroVoices.values()) {
      if (!entry) continue;
      const endMs = Number.isFinite(entry.endTimeMs)
        ? entry.endTimeMs
        : (entry.startedAtMs || entry.startTimeMs || 0) + (entry.durationSec || 0) * 1000;
      if (now >= endMs) continue;
      if (entry.cue === 'death' || String(entry.voiceKey || '').endsWith('_death')) {
        return true;
      }
    }
    return false;
  }

  playHeroVoice(heroId, cue, opts = {}) {
    if (!this.enabled || !this.voiceEnabled || this.voiceVolume <= 0.001 || this._bgSuspended) {
      return false;
    }
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

  _getSpeakerCooldownOwner(heroId, speakerKey) {
    if (typeof speakerKey === 'string') return speakerKey;
    if (speakerKey && typeof speakerKey === 'object') {
      let id = this._speakerObjIds.get(speakerKey);
      if (!id) {
        id = this._nextSpeakerObjId++;
        this._speakerObjIds.set(speakerKey, id);
      }
      return `${heroId}_obj${id}`;
    }
    return `${heroId}_default`;
  }

  _resolveContextualVoiceKey(prefix, cue, opts = {}, now = null, cdOwner = null) {
    const effNow = Number.isFinite(now)
      ? now
      : Number.isFinite(opts.nowMs)
        ? opts.nowMs
        : typeof performance !== 'undefined'
          ? performance.now()
          : Date.now();
    const effOwner =
      cdOwner || this._getSpeakerCooldownOwner(opts.heroId || prefix, opts.speakerKey || prefix);
    const otherVoice =
      opts.otherVoice !== undefined
        ? opts.otherVoice
        : this.getOtherSpeakerActiveVoice(opts.speakerKey, effNow);
    const plan = this._selectContextualVoicePlan(prefix, cue, opts, effNow, effOwner, otherVoice);
    return plan ? plan.primaryKey : null;
  }

  _selectContextualVoicePlan(prefix, cue, opts, now, cdOwner, otherVoice = null) {
    const fullKey = this._resolveVoiceKey(prefix, cue);
    if (!fullKey) return null;

    const forceShortByOtherSpeaker = Boolean(
      otherVoice && (otherVoice.priority >= 2 || otherVoice.remainingSec > 0.75)
    );
    if (forceShortByOtherSpeaker) {
      if (cue === 'hurt') {
        const shortKey = this._resolveVoiceKey(prefix, 'hurt_short');
        return { primaryKey: shortKey || fullKey, fallbackKey: fullKey, gateStampKey: null };
      }
      if (cue === 'skill_std' || cue === 'skill_alt' || cue === 'skill_crimson') {
        const shortCue = cue === 'skill_std' ? 'skill_short' : 'skill_alt_short';
        const shortKey = this._resolveVoiceKey(prefix, shortCue);
        return { primaryKey: shortKey || fullKey, fallbackKey: fullKey, gateStampKey: null };
      }
      if (cue === 'ult_std' || cue === 'ult_alt' || cue === 'ult_crimson') {
        const shortKey = this._resolveVoiceKey(prefix, 'ult_short');
        return { primaryKey: shortKey || fullKey, fallbackKey: fullKey, gateStampKey: null };
      }
    }

    const pace = (opts.pace || this.voicePace) === 'full' ? 'full' : 'snappy';
    if (pace === 'full') {
      return { primaryKey: fullKey, fallbackKey: null, gateStampKey: null };
    }

    const rng = typeof opts.rng === 'function' ? opts.rng : Math.random;

    if (cue === 'hurt') {
      const heavyGateKey = `${cdOwner}:hurt_heavy_full`;
      const lastHeavy = this.lastVoicePlayed[heavyGateKey];
      if (opts.heavyHurt && (lastHeavy === undefined || now - lastHeavy >= 7500)) {
        return { primaryKey: fullKey, fallbackKey: null, gateStampKey: heavyGateKey };
      }
      const shortKey = this._resolveVoiceKey(prefix, 'hurt_short');
      return { primaryKey: shortKey || fullKey, fallbackKey: fullKey, gateStampKey: null };
    }

    if (cue === 'skill_std' || cue === 'skill_alt' || cue === 'skill_crimson') {
      const shortCue = cue === 'skill_std' ? 'skill_short' : 'skill_alt_short';
      const shortKey = this._resolveVoiceKey(prefix, shortCue);
      const skillGateKey = `${cdOwner}:skill_full_chant`;
      const lastSkillFull = this.lastVoicePlayed[skillGateKey];
      const fullReady = lastSkillFull === undefined || now - lastSkillFull >= 14000;
      if (fullReady && rng() < 0.20) {
        return { primaryKey: fullKey, fallbackKey: null, gateStampKey: skillGateKey };
      }
      return { primaryKey: shortKey || fullKey, fallbackKey: fullKey, gateStampKey: null };
    }

    if (cue === 'ult_std' || cue === 'ult_alt' || cue === 'ult_crimson') {
      const shortKey = this._resolveVoiceKey(prefix, 'ult_short');
      const spk = opts.speakerKey;
      const hpFrac = Number.isFinite(opts.hpFrac)
        ? opts.hpFrac
        : spk && typeof spk === 'object' && Number.isFinite(spk.hp) && Number.isFinite(spk.maxHp) && spk.maxHp > 0
          ? spk.hp / spk.maxHp
          : 1.0;
      const isLowHp = hpFrac > 0 && hpFrac <= 0.35;
      if (isLowHp || rng() < 0.35) {
        return { primaryKey: fullKey, fallbackKey: null, gateStampKey: null };
      }
      return { primaryKey: shortKey || fullKey, fallbackKey: fullKey, gateStampKey: null };
    }

    return { primaryKey: fullKey, fallbackKey: null, gateStampKey: null };
  }

  _playHeroVoiceNow(heroId, cue, opts = {}) {
    if (
      !this.enabled ||
      !this.voiceEnabled ||
      this.voiceVolume <= 0.001 ||
      this._bgSuspended ||
      !this.ctx
    ) {
      return false;
    }
    const prefix = this.getVoicePackPrefix(heroId);
    if (!prefix) return false;

    const lang = (opts.lang || this.voiceLang) === 'ja' ? 'ja' : 'en';
    const getNowMs = () =>
      Number.isFinite(opts.nowMs)
        ? opts.nowMs
        : typeof performance !== 'undefined'
          ? performance.now()
          : Date.now();
    const now = getNowMs();
    const speakerKey = opts.speakerKey || heroId;
    const priority = opts.priority ?? 1;
    const cooldownMs = opts.cooldownMs ?? 120;
    const worldX = opts.worldX ?? null;
    const duckSfx = opts.duckSfx !== false;
    const maxAsyncDelayMs = opts.maxAsyncDelayMs ?? 450;

    // Never let a low-priority bark (attack/hurt) interrupt an active Skill/Ultimate/Victory/KO line
    const currentVoice = this.activeHeroVoices.get(speakerKey);
    if (currentVoice && now < currentVoice.endTimeMs && currentVoice.priority > priority) {
      return false;
    }

    const otherVoice = this.getOtherSpeakerActiveVoice(speakerKey, now);
    if (
      otherVoice &&
      otherVoice.priority >= 3 &&
      priority === 1 &&
      (cue === 'attack' || cue === 'attack_1' || cue === 'attack_2')
    ) {
      return false;
    }

    const cdOwner = this._getSpeakerCooldownOwner(heroId, speakerKey);
    const cdId = `${cdOwner}:${cue}`;
    if (this.lastVoicePlayed[cdId] !== undefined && now - this.lastVoicePlayed[cdId] < cooldownMs) {
      return false;
    }

    const plan = this._selectContextualVoicePlan(prefix, cue, opts, now, cdOwner, otherVoice);
    if (!plan) return false;

    const startBufferPlayback = (buf, activeKey) => {
      if (cue === 'death') {
        this._deathVoiceLoadingUntilMs = 0;
      }
      if (
        !buf ||
        !this.enabled ||
        !this.voiceEnabled ||
        this.voiceVolume <= 0.001 ||
        this._bgSuspended ||
        !this.ctx
      ) {
        return false;
      }
      const playNow = getNowMs();
      const curAfterLoad = this.activeHeroVoices.get(speakerKey);
      if (curAfterLoad && playNow < curAfterLoad.endTimeMs && curAfterLoad.priority > priority) {
        return false;
      }

      // Cleanly fade out previous vocal line from the same speaker (0 self-overlap!)
      this.stopSpeakerVoice(speakerKey, 0.03);
      this.lastVoicePlayed[cdId] = playNow;
      if (plan.gateStampKey && activeKey === plan.primaryKey) {
        this.lastVoicePlayed[plan.gateStampKey] = playNow;
      }

      const voiceGain = this.ctx.createGain();
      const baseVol = this.voiceVolumes[activeKey] ?? 0.94;
      if (voiceGain.gain) {
        if (typeof voiceGain.gain.setValueAtTime === 'function') {
          voiceGain.gain.setValueAtTime(baseVol, this.ctx.currentTime || 0);
        } else {
          voiceGain.gain.value = baseVol;
        }
      }

      const voiceDest = this.voiceBus || this.master;
      let panner = null;
      if (worldX !== null && typeof this.ctx.createStereoPanner === 'function') {
        panner = this.ctx.createStereoPanner();
        panner.pan.value = Math.max(-0.28, Math.min(0.28, (worldX - 600) / 850));
        voiceGain.connect(panner);
        if (voiceDest) panner.connect(voiceDest);
      } else if (voiceDest && typeof voiceGain.connect === 'function') {
        voiceGain.connect(voiceDest);
      }

      try {
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        if (src.playbackRate) {
          src.playbackRate.value = 1.0;
        }
        src.connect(voiceGain);

        const durationSec = Math.max(0.2, Number(buf.duration) || 1.2);
        const durMs = Math.max(200, Math.round(durationSec * 1000));
        let cleaned = false;
        const entry = {
          src,
          gainNode: voiceGain,
          priority,
          cue,
          duckSfx,
          voiceKey: activeKey,
          startedAtMs: playNow,
          startTimeMs: playNow,
          durationSec,
          endTimeMs: playNow + durMs - 40,
          recoverTimer: null,
          cleanup: () => {
            if (cleaned) return;
            cleaned = true;
            src.onended = null;
            if (entry.recoverTimer) {
              clearTimeout(entry.recoverTimer);
              entry.recoverTimer = null;
            }
            if (this.activeHeroVoices.get(speakerKey) === entry) {
              this.activeHeroVoices.delete(speakerKey);
            }
            this._syncSfxSidechainDuck();
            try {
              src.stop?.();
            } catch (_) {}
            this._disconnectChain(src, voiceGain, panner);
          }
        };
        entry.recoverTimer = setTimeout(() => {
          entry.recoverTimer = null;
          if (this.activeHeroVoices.get(speakerKey) === entry) {
            this.activeHeroVoices.delete(speakerKey);
            this._syncSfxSidechainDuck();
          }
        }, durMs + 60);
        if (entry.recoverTimer && typeof entry.recoverTimer.unref === 'function') {
          entry.recoverTimer.unref();
        }
        this.activeHeroVoices.set(speakerKey, entry);
        this._syncSfxSidechainDuck();
        src.onended = entry.cleanup;
        src.start(0);
        return true;
      } catch (_) {
        this._disconnectChain(voiceGain, panner);
        return false;
      }
    };

    const cachedPrimary = this._getCachedVoiceBuffer(plan.primaryKey, lang);
    if (cachedPrimary) {
      return startBufferPlayback(cachedPrimary, plan.primaryKey);
    }
    const cachedFallback =
      plan.fallbackKey && plan.fallbackKey !== plan.primaryKey
        ? this._getCachedVoiceBuffer(plan.fallbackKey, lang)
        : null;
    if (cachedFallback) {
      this.loadVoiceKey(plan.primaryKey, lang).catch(() => {});
      return startBufferPlayback(cachedFallback, plan.fallbackKey);
    }

    if (cue === 'death') {
      this._deathVoiceLoadingUntilMs = now + maxAsyncDelayMs;
    }
    if (duckSfx) {
      this.preDuckSfxForVoice(priority, maxAsyncDelayMs + 80);
    }
    const reqStart = now;
    (async () => {
      try {
        let decoded = await this.loadVoiceKey(plan.primaryKey, lang);
        let activeKey = plan.primaryKey;
        if (!decoded && plan.fallbackKey && plan.fallbackKey !== plan.primaryKey) {
          decoded = await this.loadVoiceKey(plan.fallbackKey, lang);
          activeKey = plan.fallbackKey;
        }
        if (!decoded) return;
        if (!opts.lang && this.voiceLang !== lang) return;
        const doneAt = getNowMs();
        if (doneAt - reqStart <= maxAsyncDelayMs) {
          startBufferPlayback(decoded, activeKey);
        }
      } finally {
        if (cue === 'death') {
          this._deathVoiceLoadingUntilMs = 0;
        }
      }
    })().catch(() => {});
    this.preloadHeroVoicePack(heroId, lang);
    return true;
  }

  normalizeBgmKey(rawKey) {
    if (!rawKey || typeof rawKey !== 'string') return null;
    const key = rawKey.trim().toLowerCase();
    if (!key) return null;
    if (key in this.bgmTracks) return key;
    const aliasMap = {
      title: 'bgm_title_select',
      roster: 'bgm_title_select',
      title_select: 'bgm_title_select',
      cathedral: 'bgm_cathedral',
      sanctuary: 'bgm_sanctuary',
      glacial: 'bgm_sanctuary',
      sylvan: 'bgm_sylvan',
      boneyard: 'bgm_boneyard',
      clocktower: 'bgm_clocktower',
      inferno: 'bgm_inferno',
      shogunate: 'bgm_shogunate',
      shogunate_inferno: 'bgm_shogunate',
      shogunate_glacial: 'bgm_shogunate',
      cob_monitor: 'bgm_cob_monitor',
      cob_monitor_inferno: 'bgm_cob_monitor',
      cob_monitor_glacial: 'bgm_cob_monitor',
      adventure: 'bgm_adventure_pilgrimage',
      adventure_pilgrimage: 'bgm_adventure_pilgrimage',
      boss_malphas: 'bgm_boss_malphas',
      malphas: 'bgm_boss_malphas'
    };
    return aliasMap[key] || null;
  }

  async loadBgmTrack(trackKey) {
    const normKey = this.normalizeBgmKey(trackKey);
    if (!this.ctx || !normKey) return null;
    if (this.bgmBuffers[normKey]) {
      const idx = this._bgmBufferOrder.indexOf(normKey);
      if (idx !== -1) this._bgmBufferOrder.splice(idx, 1);
      this._bgmBufferOrder.push(normKey);
      return this.bgmBuffers[normKey];
    }
    if (this._bgmLoadPromises.has(normKey)) {
      return this._bgmLoadPromises.get(normKey);
    }
    if (typeof fetch !== 'function' || typeof this.ctx.decodeAudioData !== 'function') {
      return null;
    }
    const baseRel = this.bgmTracks[normKey];
    const url = `${baseRel}?${AUDIO_ASSET_CACHE_BUST}`;
    const loadPromise = (async () => {
      try {
        const res = await fetch(url);
        if (!res || !res.ok) return null;
        const arr = await res.arrayBuffer();
        if (!this.ctx || typeof this.ctx.decodeAudioData !== 'function') return null;
        const decoded = await this.ctx.decodeAudioData(arr);
        if (decoded) {
          this.bgmBuffers[normKey] = decoded;
          const idx = this._bgmBufferOrder.indexOf(normKey);
          if (idx !== -1) this._bgmBufferOrder.splice(idx, 1);
          this._bgmBufferOrder.push(normKey);
          while (this._bgmBufferOrder.length > MAX_CACHED_BGM_BUFFERS) {
            const victim = this._bgmBufferOrder[0];
            if (victim === this.currentBgmKey || victim === this.desiredBgmKey) break;
            this._bgmBufferOrder.shift();
            delete this.bgmBuffers[victim];
          }
          return decoded;
        }
        return null;
      } catch (_) {
        return null;
      } finally {
        this._bgmLoadPromises.delete(normKey);
      }
    })();
    this._bgmLoadPromises.set(normKey, loadPromise);
    return loadPromise;
  }

  _stopBgmEntry(entry, fadeSec = 0.2) {
    if (!entry || entry.stopped) return;
    entry.stopped = true;
    if (this._activeBgmEntry === entry) {
      this._activeBgmEntry = null;
      this.currentBgmKey = null;
    }
    if (entry.fadeTimer) {
      clearTimeout(entry.fadeTimer);
      entry.fadeTimer = null;
    }
    if (fadeSec > 0 && this.ctx && entry.gainNode?.gain && entry.src) {
      this._fadingBgmEntries.add(entry);
      this._applyGainParam(entry.gainNode, 0.0001, fadeSec);
      try {
        const t = this.ctx.currentTime || 0;
        if (typeof entry.src.stop === 'function') {
          entry.src.stop(t + fadeSec + 0.02);
        }
      } catch (_) {}
      entry.fadeTimer = setTimeout(() => {
        entry.fadeTimer = null;
        entry.cleanup?.();
      }, Math.round((fadeSec + 0.04) * 1000));
      if (entry.fadeTimer && typeof entry.fadeTimer.unref === 'function') {
        entry.fadeTimer.unref();
      }
      return;
    }
    entry.cleanup?.();
  }

  _stopAllBgmSources(fadeSec = 0) {
    if (this._activeBgmEntry) {
      this._stopBgmEntry(this._activeBgmEntry, fadeSec);
    }
    for (const oldEntry of Array.from(this._fadingBgmEntries)) {
      if (fadeSec <= 0) {
        oldEntry.cleanup?.();
      } else {
        this._stopBgmEntry(oldEntry, fadeSec);
      }
    }
    this.currentBgmKey = null;
  }

  _startBgmCrossfade(normKey, buf, fadeSec = BGM_CROSSFADE_SEC) {
    if (
      !buf ||
      !this.ctx ||
      !this.enabled ||
      !this.bgmEnabled ||
      this.bgmVolume <= 0.001 ||
      this._bgSuspended
    ) {
      return false;
    }
    if (this._activeBgmEntry && this._activeBgmEntry.trackKey === normKey && !this._activeBgmEntry.stopped) {
      return true;
    }

    const prevEntry = this._activeBgmEntry;
    if (prevEntry) {
      this._stopBgmEntry(prevEntry, fadeSec);
    }

    const bgmDest = this.bgmBus || this.master;
    const trackGain = typeof this.ctx.createGain === 'function' ? this.ctx.createGain() : null;
    if (trackGain?.gain) {
      const startGain = fadeSec > 0 ? 0.0001 : 1.0;
      if (typeof trackGain.gain.setValueAtTime === 'function') {
        trackGain.gain.setValueAtTime(startGain, this.ctx.currentTime || 0);
      } else {
        trackGain.gain.value = startGain;
      }
    }
    if (trackGain && bgmDest && typeof trackGain.connect === 'function') {
      trackGain.connect(bgmDest);
    }

    try {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      if (Number.isFinite(buf.duration) && buf.duration > 4.0) {
        src.loopStart = 0.026;
        src.loopEnd = Math.max(1.0, buf.duration - 0.026);
      }
      if (src.playbackRate) {
        src.playbackRate.value = 1.0;
      }
      if (trackGain && typeof src.connect === 'function') {
        src.connect(trackGain);
      } else if (bgmDest && typeof src.connect === 'function') {
        src.connect(bgmDest);
      }

      let cleaned = false;
      const entry = {
        trackKey: normKey,
        src,
        gainNode: trackGain,
        stopped: false,
        fadeTimer: null,
        cleanup: () => {
          if (cleaned) return;
          cleaned = true;
          entry.stopped = true;
          src.onended = null;
          if (entry.fadeTimer) {
            clearTimeout(entry.fadeTimer);
            entry.fadeTimer = null;
          }
          this._fadingBgmEntries.delete(entry);
          if (this._activeBgmEntry === entry) {
            this._activeBgmEntry = null;
            this.currentBgmKey = null;
          }
          try {
            src.stop?.();
          } catch (_) {}
          this._disconnectChain(src, trackGain);
        }
      };

      this._activeBgmEntry = entry;
      this.currentBgmKey = normKey;
      src.onended = entry.cleanup;
      src.start(0);
      if (trackGain && fadeSec > 0) {
        this._applyGainParam(trackGain, 1.0, fadeSec);
      }
      return true;
    } catch (_) {
      this._disconnectChain(trackGain);
      return false;
    }
  }

  _syncPendingBgmPlayback() {
    if (
      !this.desiredBgmKey ||
      !this.enabled ||
      !this.bgmEnabled ||
      this.bgmVolume <= 0.001 ||
      this._bgSuspended ||
      !this.ctx ||
      this.ctx.state !== 'running'
    ) {
      return false;
    }
    if (this._activeBgmEntry && this._activeBgmEntry.trackKey === this.desiredBgmKey && !this._activeBgmEntry.stopped) {
      return true;
    }
    return this.playBgm(this.desiredBgmKey, { crossfadeSec: BGM_CROSSFADE_SEC });
  }

  stopBgm(fadeSec = 0.25, clearDesired = false) {
    if (clearDesired) {
      this.desiredBgmKey = null;
    }
    this._bgmPlaySeq++;
    this._stopAllBgmSources(fadeSec);
  }

  playBgm(rawTrackKey, opts = {}) {
    const normKey = this.normalizeBgmKey(rawTrackKey);
    if (!normKey) return false;
    this.desiredBgmKey = normKey;

    if (opts.deferUntilGesture && !this._unlockedByGesture) {
      return false;
    }
    if (!this.enabled || !this.bgmEnabled || this.bgmVolume <= 0.001 || this._bgSuspended) {
      return false;
    }
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
      return true;
    }

    if (
      this._activeBgmEntry &&
      this._activeBgmEntry.trackKey === normKey &&
      !this._activeBgmEntry.stopped &&
      !opts.restart
    ) {
      return true;
    }

    const fadeSec = Number.isFinite(opts.crossfadeSec)
      ? Math.max(0, opts.crossfadeSec)
      : BGM_CROSSFADE_SEC;
    if (opts.restart && this._activeBgmEntry?.trackKey === normKey) {
      this._stopBgmEntry(this._activeBgmEntry, Math.min(0.15, fadeSec));
    }

    const seq = ++this._bgmPlaySeq;
    const cachedBuf = this.bgmBuffers[normKey];
    if (cachedBuf) {
      return this._startBgmCrossfade(normKey, cachedBuf, fadeSec);
    }

    this.loadBgmTrack(normKey)
      .then((decoded) => {
        if (!decoded) return;
        if (seq !== this._bgmPlaySeq || this.desiredBgmKey !== normKey) return;
        if (
          !this.enabled ||
          !this.bgmEnabled ||
          this.bgmVolume <= 0.001 ||
          this._bgSuspended ||
          !this.ctx ||
          this.ctx.state !== 'running'
        ) {
          return;
        }
        this._startBgmCrossfade(normKey, decoded, fadeSec);
      })
      .catch(() => {});
    return true;
  }
}
