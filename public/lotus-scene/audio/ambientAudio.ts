/**
 * Procedural Web Audio API Soundscape for Moonlit Lotus Garden
 * 100% procedural sound synthesis - zero external audio files / zero 404s.
 */

class MoonlitAudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private masterGain: GainNode | null = null;
  private cricketNode: AudioNode | null = null;
  private musicIntervalId: number | null = null;
  private waterIntervalId: number | null = null;

  public init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
  }

  public setVolume(vol: number) {
    if (!this.ctx || !this.masterGain) return;
    const clamped = Math.max(0, Math.min(1, vol));
    this.masterGain.gain.setTargetAtTime(clamped * 0.4, this.ctx.currentTime, 0.05);
  }

  public async start() {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    if (this.isPlaying) return;
    this.isPlaying = true;

    // 1. Cricket / night garden ambiance (soft filtered noise pulses)
    this.startCricketAmbiance();

    // 2. Gentle oriental pentatonic melody (Gong, Shang, Jue, Zhi, Yu)
    this.startMeditativeMelody();

    // 3. Gentle water droplet / trickle sounds
    this.startWaterRipples();
  }

  public stop() {
    this.isPlaying = false;
    if (this.musicIntervalId) {
      window.clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }
    if (this.waterIntervalId) {
      window.clearInterval(this.waterIntervalId);
      this.waterIntervalId = null;
    }
    if (this.cricketNode) {
      try {
        (this.cricketNode as AudioBufferSourceNode).stop();
      } catch {
        // already stopped
      }
      this.cricketNode = null;
    }
  }

  private startCricketAmbiance() {
    if (!this.ctx || !this.masterGain) return;

    // Buffer of soft white noise modulated to sound like distant night crickets
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // High-pitched periodic chirps
      const t = i / this.ctx.sampleRate;
      const chirpMod = Math.sin(t * 16 * Math.PI) > 0.4 ? 1.0 : 0.05;
      data[i] = (Math.random() * 2 - 1) * chirpMod * 0.08;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    // Bandpass filter around 4500Hz for subtle night crickets
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(4500, this.ctx.currentTime);
    filter.Q.setValueAtTime(4.0, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.06, this.ctx.currentTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start();
    this.cricketNode = noise;
  }

  private startMeditativeMelody() {
    // Asian Pentatonic scale frequencies in D major / B minor: D4, E4, F#4, A4, B4, D5, E5, F#5
    const pentatonicNotes = [293.66, 329.63, 369.99, 440.00, 493.88, 587.33, 659.25, 739.99];

    const playHarmonicNote = () => {
      if (!this.isPlaying || !this.ctx || !this.masterGain) return;

      const freq = pentatonicNotes[Math.floor(Math.random() * pentatonicNotes.length)];
      const now = this.ctx.currentTime;

      // Primary tone: Guqin / bamboo flute warm sine
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      // Overtone for rich plucked string resonance
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2, now);

      const noteGain = this.ctx.createGain();
      const overtoneGain = this.ctx.createGain();

      // Pluck envelope: rapid rise, slow resonant decay (3.5s)
      noteGain.gain.setValueAtTime(0, now);
      noteGain.gain.linearRampToValueAtTime(0.18, now + 0.08);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.8);

      overtoneGain.gain.setValueAtTime(0, now);
      overtoneGain.gain.linearRampToValueAtTime(0.05, now + 0.05);
      overtoneGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);

      osc.connect(noteGain);
      osc2.connect(overtoneGain);
      noteGain.connect(filter);
      overtoneGain.connect(filter);
      filter.connect(this.masterGain);

      osc.start(now);
      osc2.start(now);
      osc.stop(now + 4.0);
      osc2.stop(now + 2.5);
    };

    // Play initial note
    playHarmonicNote();

    // Trigger notes periodically with gentle organic pauses
    this.musicIntervalId = window.setInterval(() => {
      if (Math.random() > 0.25) {
        playHarmonicNote();
      }
    }, 2800);
  }

  private startWaterRipples() {
    const playWaterDrop = () => {
      if (!this.isPlaying || !this.ctx || !this.masterGain) return;
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      const baseFreq = 800 + Math.random() * 600;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.12);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.3);
    };

    this.waterIntervalId = window.setInterval(() => {
      if (Math.random() > 0.4) {
        playWaterDrop();
      }
    }, 1800);
  }

  public playLotusChime() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Ethereal crystal chime
    const freqs = [1174.66, 1760.00, 2349.32]; // High D, A, D
    freqs.forEach((f, idx) => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);

      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12 / (idx + 1), now + 0.02 + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8 + idx * 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now);
      osc.stop(now + 2.5);
    });
  }
}

export const audioEngine = new MoonlitAudioEngine();
