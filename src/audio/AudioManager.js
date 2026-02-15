export class AudioManager {
  constructor() {
    this.ctx = null;
    this.musicVolume = 0.5;
    this.sfxVolume = 0.7;
    this.musicPlaying = false;
    this.musicNode = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicVolume;
    this.musicGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxVolume;
    this.sfxGain.connect(this.masterGain);

    this.initialized = true;
  }

  setMusicVolume(v) {
    this.musicVolume = v;
    if (this.musicGain) this.musicGain.gain.value = v;
  }

  setSfxVolume(v) {
    this.sfxVolume = v;
    if (this.sfxGain) this.sfxGain.gain.value = v;
  }

  // Procedural synthwave music generator
  startMusic() {
    if (!this.ctx || this.musicPlaying) return;
    this.musicPlaying = true;
    this.playLoop();
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicNode) {
      try { this.musicNode.stop(); } catch (e) { /* ignore */ }
      this.musicNode = null;
    }
  }

  playLoop() {
    if (!this.musicPlaying || !this.ctx) return;

    const now = this.ctx.currentTime;
    const bpm = 110;
    const beatLen = 60 / bpm;
    const barLen = beatLen * 4;
    const loopLen = barLen * 4; // 4 bars

    // Synthwave bass line
    const bassNotes = [
      { note: 55, time: 0 },           // A1
      { note: 55, time: beatLen },
      { note: 73.42, time: beatLen * 2 }, // D2
      { note: 73.42, time: beatLen * 3 },
      { note: 65.41, time: barLen },     // C2
      { note: 65.41, time: barLen + beatLen },
      { note: 82.41, time: barLen + beatLen * 2 }, // E2
      { note: 82.41, time: barLen + beatLen * 3 },
      { note: 55, time: barLen * 2 },
      { note: 55, time: barLen * 2 + beatLen },
      { note: 73.42, time: barLen * 2 + beatLen * 2 },
      { note: 73.42, time: barLen * 2 + beatLen * 3 },
      { note: 65.41, time: barLen * 3 },
      { note: 82.41, time: barLen * 3 + beatLen },
      { note: 55, time: barLen * 3 + beatLen * 2 },
      { note: 55, time: barLen * 3 + beatLen * 3 },
    ];

    bassNotes.forEach(({ note, time }) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = note;

      // Low pass filter for warm bass
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      filter.Q.value = 2;

      gain.gain.setValueAtTime(0, now + time);
      gain.gain.linearRampToValueAtTime(0.15, now + time + 0.05);
      gain.gain.linearRampToValueAtTime(0.1, now + time + beatLen * 0.5);
      gain.gain.linearRampToValueAtTime(0, now + time + beatLen * 0.9);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      osc.start(now + time);
      osc.stop(now + time + beatLen);
    });

    // Pad chords (lush synth pad)
    const chords = [
      { freqs: [220, 277.18, 329.63], time: 0, dur: barLen * 2 },       // Am
      { freqs: [261.63, 329.63, 392], time: barLen * 2, dur: barLen },   // C
      { freqs: [246.94, 311.13, 369.99], time: barLen * 3, dur: barLen }, // B dim-ish
    ];

    chords.forEach(({ freqs, time, dur }) => {
      freqs.forEach(freq => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;

        // Detuned second oscillator for thickness
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.value = freq * 1.003; // Slight detune

        gain.gain.setValueAtTime(0, now + time);
        gain.gain.linearRampToValueAtTime(0.04, now + time + 0.3);
        gain.gain.linearRampToValueAtTime(0.03, now + time + dur - 0.3);
        gain.gain.linearRampToValueAtTime(0, now + time + dur);

        gain2.gain.setValueAtTime(0, now + time);
        gain2.gain.linearRampToValueAtTime(0.02, now + time + 0.3);
        gain2.gain.linearRampToValueAtTime(0, now + time + dur);

        osc.connect(gain);
        gain.connect(this.musicGain);
        osc2.connect(gain2);
        gain2.connect(this.musicGain);

        osc.start(now + time);
        osc.stop(now + time + dur + 0.1);
        osc2.start(now + time);
        osc2.stop(now + time + dur + 0.1);
      });
    });

    // Arpeggiated lead
    const arpNotes = [
      440, 523.25, 659.25, 523.25,
      440, 587.33, 659.25, 587.33,
      440, 523.25, 659.25, 783.99,
      659.25, 523.25, 440, 392,
    ];

    arpNotes.forEach((freq, i) => {
      const time = i * beatLen * 0.25 + barLen * 2; // Start at bar 3
      if (time >= loopLen) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2000;

      gain.gain.setValueAtTime(0, now + time);
      gain.gain.linearRampToValueAtTime(0.05, now + time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + time + beatLen * 0.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      osc.start(now + time);
      osc.stop(now + time + beatLen * 0.25);
    });

    // Kick drum pattern
    for (let i = 0; i < 16; i++) {
      const time = i * beatLen;
      if (i % 4 === 0 || i % 4 === 2) {
        this.scheduleKick(now + time);
      }
      // Hi-hat on off-beats
      if (i % 2 === 1) {
        this.scheduleHiHat(now + time);
      }
    }

    // Schedule next loop
    setTimeout(() => {
      if (this.musicPlaying) this.playLoop();
    }, loopLen * 1000 - 100);
  }

  scheduleKick(time) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(30, time + 0.15);
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.2);
  }

  scheduleHiHat(time) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 8000;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    source.start(time);
    source.stop(time + 0.05);
  }

  // Sound effects
  playSound(type) {
    if (!this.ctx) return;
    this.init();

    switch (type) {
      case 'card': this.playCardSound(); break;
      case 'chips': this.playChipSound(); break;
      case 'win': this.playWinSound(); break;
      case 'lose': this.playLoseSound(); break;
      case 'click': this.playClickSound(); break;
    }
  }

  playCardSound() {
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.08;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / this.ctx.sampleRate;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 40) * 0.3;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3000;
    filter.Q.value = 1;

    const gain = this.ctx.createGain();
    gain.gain.value = this.sfxVolume;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start(now);
  }

  playChipSound() {
    const now = this.ctx.currentTime;

    // Multiple short clicks for chip stacking
    for (let i = 0; i < 3; i++) {
      const time = now + i * 0.04;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 2000 + Math.random() * 2000;
      gain.gain.setValueAtTime(0.15, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(time);
      osc.stop(time + 0.03);
    }
  }

  playWinSound() {
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6

    notes.forEach((freq, i) => {
      const time = now + i * 0.15;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 3000;

      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.1, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(time);
      osc.stop(time + 0.3);
    });
  }

  playLoseSound() {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.5);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.5);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  playClickSound() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 1200;
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
}
