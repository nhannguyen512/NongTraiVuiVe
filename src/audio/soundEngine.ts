export interface AudioSettings {
  muted: boolean;
  musicEnabled: boolean;
  sfxEnabled: boolean;
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
}

const STORAGE_KEY = 'vqcc_audio_settings';

const DEFAULT_SETTINGS: AudioSettings = {
  muted: false,
  musicEnabled: true,
  sfxEnabled: true,
  musicVolume: 0.38,
  sfxVolume: 0.78,
};

// Cheerful cozy adventure pentatonic melody (C major / F / G / Am)
const MELODY_SEQ: (number | null)[] = [
  523.25, null, 659.25, 783.99, 659.25, null, 587.33, 523.25,
  440.0, null, 523.25, 659.25, 587.33, null, 493.88, null,
  523.25, null, 659.25, 880.0, 783.99, null, 659.25, 587.33,
  523.25, 587.33, 659.25, null, 523.25, null, null, null,
];

const BASS_SEQ: (number | null)[] = [
  130.81, null, null, null, 196.0, null, null, null,
  174.61, null, null, null, 146.83, null, 196.0, null,
  130.81, null, null, null, 220.0, null, null, null,
  174.61, null, 196.0, null, 130.81, null, null, null,
];

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private settings: AudioSettings = this.loadSettings();
  private musicTimer: number | null = null;
  private musicStep = 0;

  private loadSettings(): AudioSettings {
    if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(raw) as Partial<AudioSettings>;
      return {
        muted: Boolean(parsed.muted),
        musicEnabled: parsed.musicEnabled !== undefined ? Boolean(parsed.musicEnabled) : DEFAULT_SETTINGS.musicEnabled,
        sfxEnabled: parsed.sfxEnabled !== undefined ? Boolean(parsed.sfxEnabled) : DEFAULT_SETTINGS.sfxEnabled,
        musicVolume:
          typeof parsed.musicVolume === 'number'
            ? Math.max(0, Math.min(1, parsed.musicVolume))
            : DEFAULT_SETTINGS.musicVolume,
        sfxVolume:
          typeof parsed.sfxVolume === 'number'
            ? Math.max(0, Math.min(1, parsed.sfxVolume))
            : DEFAULT_SETTINGS.sfxVolume,
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  private saveSettings(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // ignore storage quota errors
    }
  }

  private ensureGraph(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      // Pre-build short white noise buffer for organic grass footsteps & water splashes
      const sr = this.ctx.sampleRate;
      const buf = this.ctx.createBuffer(1, Math.floor(sr * 0.2), sr);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buf;
      this.syncGains();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private syncGains(): void {
    if (!this.ctx || !this.masterGain || !this.musicGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const masterVal = this.settings.muted ? 0 : 1;
    const musicVal = this.settings.musicEnabled ? this.settings.musicVolume * 0.45 : 0;
    const sfxVal = this.settings.sfxEnabled ? this.settings.sfxVolume : 0;

    this.masterGain.gain.setTargetAtTime(masterVal, now, 0.02);
    this.musicGain.gain.setTargetAtTime(musicVal, now, 0.03);
    this.sfxGain.gain.setTargetAtTime(sfxVal, now, 0.02);
  }

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  public updateSettings(patch: Partial<AudioSettings>): AudioSettings {
    this.settings = {
      ...this.settings,
      ...patch,
      musicVolume:
        patch.musicVolume !== undefined
          ? Math.max(0, Math.min(1, patch.musicVolume))
          : this.settings.musicVolume,
      sfxVolume:
        patch.sfxVolume !== undefined
          ? Math.max(0, Math.min(1, patch.sfxVolume))
          : this.settings.sfxVolume,
    };
    this.saveSettings();
    this.syncGains();

    if (this.settings.musicEnabled && !this.settings.muted) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
    return this.getSettings();
  }

  public setMuted(muted: boolean): void {
    this.updateSettings({ muted });
  }

  public isMuted(): boolean {
    return this.settings.muted;
  }

  public unlock(): void {
    const ctx = this.ensureGraph();
    if (!ctx) return;
    if (this.settings.musicEnabled && !this.settings.muted && this.musicTimer === null) {
      this.startMusic();
    }
  }

  public startMusic(): void {
    if (typeof window === 'undefined' || this.musicTimer !== null) return;
    const ctx = this.ensureGraph();
    if (!ctx) return;

    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || this.ctx.state !== 'running') return;
      if (this.settings.muted || !this.settings.musicEnabled || this.settings.musicVolume <= 0.01) return;

      const idx = this.musicStep % MELODY_SEQ.length;
      this.musicStep += 1;

      const melFreq = MELODY_SEQ[idx];
      const bassFreq = BASS_SEQ[idx];
      const now = this.ctx.currentTime;

      if (melFreq) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(melFreq, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(now);
        osc.stop(now + 0.36);
      }

      if (bassFreq) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(bassFreq, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.28, now + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(now);
        osc.stop(now + 0.58);
      }
    }, 260);
  }

  public stopMusic(): void {
    if (this.musicTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.16,
    delay = 0,
    slideTo?: number
  ): void {
    if (this.settings.muted || !this.settings.sfxEnabled) return;
    const ctx = this.ensureGraph();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
    }

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private playFilteredNoise(duration: number, filterFreq: number, q: number, volume: number): void {
    if (this.settings.muted || !this.settings.sfxEnabled) return;
    const ctx = this.ensureGraph();
    if (!ctx || !this.sfxGain || !this.noiseBuffer) return;

    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFreq, now);
    filter.Q.setValueAtTime(q, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    src.start(now);
    src.stop(now + duration + 0.02);
  }

  public playFootstep(isWater = false, alternate = false): void {
    if (this.settings.muted || !this.settings.sfxEnabled) return;
    if (isWater) {
      this.playFilteredNoise(0.09, alternate ? 1400 : 1650, 2.2, 0.12);
      this.playTone(alternate ? 340 : 410, 0.07, 'sine', 0.07, 0, 580);
    } else {
      // Soft grass rustle + gentle cartoon tap
      this.playFilteredNoise(0.065, alternate ? 1100 : 1280, 1.4, 0.09);
      this.playTone(alternate ? 145 : 168, 0.05, 'triangle', 0.075, 0, 95);
    }
  }

  public playClick(): void {
    this.playTone(620, 0.06, 'sine', 0.12, 0, 840);
  }

  public playCelebrate(): void {
    this.playTone(523.25, 0.1, 'triangle', 0.14, 0, 783.99);
    this.playTone(1046.5, 0.16, 'sine', 0.12, 0.08);
  }

  public playPickup(): void {
    this.playTone(520, 0.12, 'triangle', 0.18, 0, 820);
    this.playTone(987.77, 0.14, 'sine', 0.13, 0.05);
  }

  public playCorrect(combo = 1): void {
    const pitchBoost = Math.min(combo, 8) * 28;
    this.playTone(523.25 + pitchBoost, 0.14, 'triangle', 0.18, 0);
    this.playTone(659.25 + pitchBoost, 0.14, 'triangle', 0.16, 0.07);
    this.playTone(783.99 + pitchBoost, 0.24, 'sine', 0.2, 0.14);
    if (combo >= 3) {
      this.playTone(1046.5 + pitchBoost, 0.22, 'sine', 0.14, 0.21);
    }
  }

  public playWrong(): void {
    this.playTone(280, 0.16, 'sawtooth', 0.08, 0, 185);
    this.playTone(190, 0.22, 'triangle', 0.11, 0.12, 135);
  }

  public playLevelUp(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.24, 'triangle', 0.18, idx * 0.08);
    });
  }

  public playSkillUnlock(): void {
    const notes = [587.33, 739.99, 880, 1174.66, 1479.98];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.22, 'sine', 0.16, idx * 0.07);
    });
  }

  public playFeed(): void {
    // Cute munch-munch + happy chime
    this.playTone(320, 0.06, 'triangle', 0.14, 0, 440);
    this.playTone(360, 0.06, 'triangle', 0.14, 0.09, 490);
    this.playTone(659.25, 0.12, 'sine', 0.15, 0.18, 880);
    this.playTone(1046.5, 0.18, 'triangle', 0.14, 0.26);
  }

  public playPlace(isWater = false): void {
    if (isWater) {
      this.playFilteredNoise(0.14, 1500, 1.8, 0.15);
      this.playTone(320, 0.15, 'sine', 0.16, 0, 620);
      this.playTone(740, 0.12, 'sine', 0.09, 0.07, 480);
    } else {
      this.playTone(210, 0.09, 'triangle', 0.19, 0, 125);
      this.playTone(460, 0.08, 'sine', 0.12, 0.04);
    }
  }

  public playGift(): void {
    const notes = [523.25, 659.25, 783.99, 987.77, 1318.51];
    notes.forEach((n, i) => {
      this.playTone(n, 0.26, 'triangle', 0.17, i * 0.08);
    });
  }
}

export const soundEngine = new SoundEngine();
